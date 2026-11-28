-- Pengerasan skema hasil audit DATABASE.TXT (lihat docs/AUDIT_DATABASE.md).
-- Jalankan di Supabase SQL Editor. Aman diulang (idempoten).
-- Seluruh skrip satu transaksi: bila satu langkah gagal, tidak ada yang berubah.
-- Tidak menghapus tabel, kolom, atau baris data.

begin;

-- ---------------------------------------------------------------------------
-- 1. Bukti bayar dan dokumen SPK yang masih dirujuk data tidak boleh dihapus.
--    Policy lama "Client delete own unsubmitted payment proofs" hanya memeriksa
--    folder pemilik, sehingga bukti yang sudah Confirmed pun bisa dihapus.
--    Policy RESTRICTIVE membatasi semua policy DELETE lain, termasuk Admin.
-- ---------------------------------------------------------------------------
create or replace function public.is_storage_object_referenced(p_name text)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.payments where proof_path = p_name)
      or exists (select 1 from public.payment_proof_history
                  where proof_path = p_name or previous_proof_path = p_name)
      or exists (select 1 from public.spk_request_documents where file_path = p_name)
      or exists (select 1 from public.booking_fee_refunds where proof_path = p_name)
      or exists (select 1 from public.purchase_refunds where proof_path = p_name)
      or exists (select 1 from public.purchase_cancellation_requests where evidence_path = p_name);
$$;

revoke all on function public.is_storage_object_referenced(text) from public, anon;
grant execute on function public.is_storage_object_referenced(text) to authenticated, service_role;

drop policy if exists "block_delete_referenced_private_files" on storage.objects;
create policy "block_delete_referenced_private_files"
  on storage.objects
  as restrictive
  for delete
  to authenticated
  using (
    bucket_id not in ('payment-proofs', 'spk-client-private-documents')
    or not public.is_storage_object_referenced(name)
  );

-- ---------------------------------------------------------------------------
-- 2. Client membaca jadwal cicilan miliknya, siapa pun yang mengajukan SPK-nya.
--    Policy lama hanya mencakup SPK yang diajukan Client sendiri, sedangkan
--    lot_transactions dan payments sudah memakai customers.user_id.
-- ---------------------------------------------------------------------------
drop policy if exists "installment_schedules_select_own_customer" on public.installment_schedules;
create policy "installment_schedules_select_own_customer"
  on public.installment_schedules
  for select
  to authenticated
  using (
    exists (
      select 1
        from public.lot_transactions t
        join public.customers c on c.id = t.customer_id
       where t.id = installment_schedules.transaction_id
         and c.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Aturan ON DELETE yang berisiko menghapus riwayat.
-- ---------------------------------------------------------------------------
-- Menghapus kavling tidak boleh ikut menghapus pembayaran.
alter table public.payments drop constraint if exists payments_lot_id_fkey;
alter table public.payments
  add constraint payments_lot_id_fkey
  foreign key (lot_id) references public.lots(id) on delete restrict;

-- Menghapus akun login hanya memutus tautan; data pembeli tetap ada.
-- Catatan: data pribadi pembeli tidak ikut terhapus bersama akunnya.
alter table public.customers drop constraint if exists customers_user_id_fkey;
alter table public.customers
  add constraint customers_user_id_fkey
  foreign key (user_id) references auth.users(id) on delete set null;

-- ---------------------------------------------------------------------------
-- 4. Index untuk foreign key satu kolom yang belum punya index pendamping.
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select c.relname as tbl, a.attname as col
      from pg_constraint k
      join pg_class c on c.oid = k.conrelid
      join pg_namespace n on n.oid = c.relnamespace
      join pg_attribute a on a.attrelid = k.conrelid and a.attnum = k.conkey[1]
     where k.contype = 'f'
       and n.nspname = 'public'
       and cardinality(k.conkey) = 1
       and not exists (
         select 1 from pg_index i
          where i.indrelid = k.conrelid
            and i.indkey[0] = k.conkey[1]
            and i.indpred is null
       )
  loop
    execute format('create index if not exists %I on public.%I (%I)',
                   left('fk_' || r.tbl || '_' || r.col || '_idx', 63), r.tbl, r.col);
  end loop;
end $$;

-- Index ganda (definisinya sama dengan index lain yang dipertahankan).
drop index if exists public.idx_installment_schedules_transaction;
drop index if exists public.spk_requests_customer_idx;
drop index if exists public.indonesia_regions_level_idx;
drop index if exists public.indonesia_regions_parent_id_idx;
drop index if exists public.lot_transactions_customer_idx;
drop index if exists public.idx_customers_user_id;

-- ---------------------------------------------------------------------------
-- 5. Kolom salinan dijaga konsisten dengan induknya (composite FK).
--    DEFERRABLE agar RPC yang memperbarui beberapa tabel sekaligus tetap bisa;
--    pemeriksaan terjadi saat COMMIT. MATCH SIMPLE: dilewati bila ada NULL.
-- ---------------------------------------------------------------------------
create unique index if not exists installment_schedules_id_tx_key
  on public.installment_schedules (id, transaction_id);
create unique index if not exists lot_transactions_id_customer_lot_key
  on public.lot_transactions (id, customer_id, lot_id);
create unique index if not exists pcr_id_tx_customer_key
  on public.purchase_cancellation_requests (id, transaction_id, customer_id);

alter table public.default_notices drop constraint if exists default_notices_schedule_tx_fkey;
alter table public.default_notices
  add constraint default_notices_schedule_tx_fkey
  foreign key (installment_schedule_id, transaction_id)
  references public.installment_schedules (id, transaction_id)
  on update cascade on delete no action deferrable initially deferred;

alter table public.default_reviews drop constraint if exists default_reviews_schedule_tx_fkey;
alter table public.default_reviews
  add constraint default_reviews_schedule_tx_fkey
  foreign key (installment_schedule_id, transaction_id)
  references public.installment_schedules (id, transaction_id)
  on update cascade on delete no action deferrable initially deferred;

alter table public.payments drop constraint if exists payments_tx_customer_lot_fkey;
alter table public.payments
  add constraint payments_tx_customer_lot_fkey
  foreign key (transaction_id, customer_id, lot_id)
  references public.lot_transactions (id, customer_id, lot_id)
  on update cascade on delete no action deferrable initially deferred;

alter table public.purchase_refunds drop constraint if exists purchase_refunds_request_consistency_fkey;
alter table public.purchase_refunds
  add constraint purchase_refunds_request_consistency_fkey
  foreign key (cancellation_request_id, transaction_id, customer_id)
  references public.purchase_cancellation_requests (id, transaction_id, customer_id)
  on update cascade on delete no action deferrable initially deferred;

-- ---------------------------------------------------------------------------
-- 6. NOT NULL untuk kolom penentu akses dan status.
-- ---------------------------------------------------------------------------
alter table public.profiles alter column role set default 'client';
alter table public.profiles alter column role set not null;
alter table public.lots alter column status set default 'Available';
alter table public.lots alter column status set not null;

-- ---------------------------------------------------------------------------
-- 7. updated_at otomatis untuk tabel yang belum punya trigger.
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array[
    'booking_fee_refunds', 'customer_notes', 'contacts', 'lot_transactions',
    'installment_schedules', 'home_features', 'home_hero', 'spk_booking_fee_reuse',
    'indonesia_regions', 'profiles', 'device_tokens', 'spk_process_steps', 'faqs',
    'gallery', 'progress', 'videos', 'review_prompt_states', 'notification_preferences'
  ]
  loop
    execute format('drop trigger if exists trg_set_updated_at on public.%I', t);
    execute format('create trigger trg_set_updated_at before update on public.%I '
                   'for each row execute function public.set_updated_at()', t);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 8. Fungsi: kunci search_path dan persempit hak EXECUTE.
-- ---------------------------------------------------------------------------
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prokind = 'f'
       and coalesce(array_to_string(p.proconfig, ','), '') not like '%search_path%'
       and not exists (select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e')
  loop
    execute format('alter function %s set search_path = public, extensions, pg_temp', r.sig);
  end loop;

  -- Fungsi trigger tetap berjalan tanpa hak EXECUTE milik pemanggil.
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.prosecdef
       and p.prorettype = 'trigger'::regtype
  loop
    execute format('revoke execute on function %s from public, anon, authenticated', r.sig);
  end loop;

  -- RPC yang hanya bermakna setelah login. Helper yang dipakai policy publik
  -- (current_app_role, is_owner, dst.) sengaja tidak disentuh.
  for r in
    select p.oid::regprocedure as sig
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'
       and p.proname in (
         'admin_approve_spk_request', 'admin_reject_spk_request',
         'submit_client_payment', 'create_client_spk_booking_payment',
         'request_lot_survey', 'is_marketing_team_member'
       )
  loop
    execute format('revoke execute on function %s from public, anon', r.sig);
    execute format('grant execute on function %s to authenticated, service_role', r.sig);
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 9. Policy SELECT yang isinya sama persis (USING true). Satu tetap dipakai.
--    Pembatasan kolom lots untuk anon diatur oleh GRANT dan tidak berubah.
-- ---------------------------------------------------------------------------
-- lots: dipertahankan "Public lots view policy"
drop policy if exists "Authenticated users can read lots" on public.lots;
drop policy if exists "authenticated can read lots" on public.lots;
drop policy if exists "public read lots" on public.lots;
drop policy if exists "Public Read Lots" on public.lots;
-- blocks: dipertahankan "blocks_select_all"
drop policy if exists "Authenticated users can read blocks" on public.blocks;
drop policy if exists "authenticated can read blocks" on public.blocks;
drop policy if exists "Public Read Blocks" on public.blocks;
-- payment_plans: dipertahankan "Public Read Payment Plans"
drop policy if exists "authenticated can read payment plans" on public.payment_plans;
drop policy if exists "Authenticated users can read payment plans" on public.payment_plans;

commit;
