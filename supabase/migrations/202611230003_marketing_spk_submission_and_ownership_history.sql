-- =====================================================================
-- Marketing: pengajuan SPK aman (RPC), Booking Fee menunggu verifikasi,
-- dan riwayat perubahan penanggung jawab klien.
-- ---------------------------------------------------------------------
-- Catatan:
--  * Bucket TETAP `spk-client-private-documents` (policy Storage Marketing
--    sudah ada: folder <uid>/<spk_id>/..., hanya SPK milik sendiri).
--  * Tidak ada tabel kas/transaksi dibuat di sini. Pembayaran dibuat
--    berstatus 'Pending'; hanya Admin yang dapat memverifikasi.
--  * Tidak ada komisi dibuat/dihitung.
--  * Migration ini tidak menghapus data lama.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Pengajuan SPK oleh Marketing (hanya untuk klien miliknya)
-- ---------------------------------------------------------------------
create or replace function public.create_marketing_spk_request(
  p_customer_id bigint,
  p_lot_id bigint,
  p_payment_method text,
  p_payment_plan_id bigint,
  p_down_payment_amount numeric,
  p_notes text
) returns bigint
language plpgsql security definer set search_path = 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_customer public.customers%rowtype;
  v_lot_price numeric;
  v_down numeric := coalesce(p_down_payment_amount, 0);
  v_months integer;
  v_margin numeric := 0;
  v_principal numeric;
  v_monthly numeric;
  v_request_id bigint;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid and role = 'marketing') then
    raise exception 'Hanya akun Marketing yang dapat mengajukan SPK melalui jalur ini.';
  end if;

  -- Klien harus milik Marketing yang login (klien mandiri/NULL ditolak).
  select * into v_customer from public.customers
  where id = p_customer_id and marketing_id = v_uid
  for update;
  if not found then
    raise exception 'Klien tidak ditemukan atau bukan klien Anda.';
  end if;
  if coalesce(btrim(v_customer.full_name), '') = '' or coalesce(btrim(v_customer.phone), '') = ''
     or coalesce(btrim(v_customer.address), '') = '' then
    raise exception 'Data klien belum lengkap (nama, nomor HP, alamat). Lengkapi data klien terlebih dahulu.';
  end if;

  if p_payment_method not in ('Cash', 'Installment') then
    raise exception 'Skema pembayaran tidak valid.';
  end if;

  -- Harga selalu dari database.
  select case when coalesce(promo_price, 0) > 0 and (coalesce(cash_price, 0) <= 0 or promo_price < cash_price)
              then promo_price else cash_price end
  into v_lot_price
  from public.lots
  where id = p_lot_id and lower(btrim(status)) in ('available', 'tersedia')
  for update;
  if not found or v_lot_price is null or v_lot_price <= 0 then
    raise exception 'Kavling sudah tidak tersedia atau harganya belum tersedia.';
  end if;

  if exists (select 1 from public.spk_requests
             where lot_id = p_lot_id and status in ('Submitted', 'Under Review', 'Approved')) then
    raise exception 'Kavling sedang memiliki pengajuan SPK aktif. Silakan pilih kavling lain.';
  end if;

  if p_payment_method = 'Installment' then
    if v_down <= 0 or v_down >= v_lot_price then
      raise exception 'Nominal DP harus lebih dari Rp 0 dan lebih kecil dari harga kavling.';
    end if;
    if p_payment_plan_id is null then
      raise exception 'Pilih rencana tenor cicilan sebelum mengirim SPK.';
    end if;
    select plans.months, coalesce(plans.margin_percent, 0)
    into v_months, v_margin
    from public.lot_installments li
    join public.payment_plans plans on plans.id = li.plan_id
    where li.lot_id = p_lot_id and li.plan_id = p_payment_plan_id and plans.months between 1 and 24
    order by li.id limit 1;
    if not found then
      raise exception 'Tenor cicilan tidak tersedia untuk kavling ini.';
    end if;
    v_principal := v_lot_price - v_down;
    v_monthly := floor((v_principal + round(v_principal * v_margin / 100)) / v_months);
  else
    v_down := 0; v_months := null; v_monthly := null; p_payment_plan_id := null; v_margin := null;
  end if;

  insert into public.spk_requests (
    marketing_id, customer_id, customer_full_name, customer_phone, customer_email, customer_address,
    lot_id, lot_price_snapshot, payment_method, payment_plan_id, margin_percent_snapshot,
    down_payment_snapshot, down_payment_amount, months, monthly_payment, notes,
    status, submission_source, submitted_by
  ) values (
    v_uid, v_customer.id, v_customer.full_name, v_customer.phone, v_customer.email, v_customer.address,
    p_lot_id, v_lot_price, p_payment_method, p_payment_plan_id, v_margin,
    v_down, v_down, v_months, v_monthly, nullif(btrim(coalesce(p_notes, '')), ''),
    'Submitted', 'Marketing', v_uid
  ) returning id into v_request_id;

  -- Status kavling tidak diubah di sini; baru menjadi Booking setelah Admin menyetujui.
  return v_request_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Booking Fee awal: Pending (menunggu verifikasi Admin), idempoten
-- ---------------------------------------------------------------------
create or replace function public.create_marketing_spk_initial_payment(p_request_id bigint)
returns bigint
language plpgsql security definer set search_path = 'public' as $$
declare
  v_uid uuid := auth.uid();
  v_request public.spk_requests%rowtype;
  v_proof_path text;
  v_payment_id bigint;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid and role = 'marketing') then
    raise exception 'Hanya akun Marketing yang dapat mengirim pembayaran SPK.';
  end if;

  select * into v_request from public.spk_requests
  where id = p_request_id and marketing_id = v_uid and submitted_by = v_uid
    and submission_source = 'Marketing' and status = 'Submitted'
  for update;
  if not found then
    raise exception 'SPK tidak ditemukan atau tidak dapat menerima pembayaran.';
  end if;
  if v_request.customer_id is null then
    raise exception 'SPK belum terhubung dengan klien.';
  end if;

  select file_path into v_proof_path from public.spk_request_documents
  where spk_request_id = p_request_id and uploaded_by = v_uid and document_type = 'Payment Proof'
  order by id desc limit 1;
  if v_proof_path is null then
    raise exception 'Unggah bukti Booking Fee sebelum mengirim SPK.';
  end if;

  -- Cegah duplikasi pembayaran untuk SPK yang sama.
  select id into v_payment_id from public.payments
  where spk_request_id = p_request_id and payment_category = 'Booking'
  order by id limit 1;
  if found then return v_payment_id; end if;

  -- Hanya catatan pembayaran 'Pending'. Tidak ada transaksi kas sebelum Admin memverifikasi.
  insert into public.payments (
    customer_id, lot_id, spk_request_id, amount, payment_method,
    payment_category, payment_date, proof_path, note, status
  ) values (
    v_request.customer_id, v_request.lot_id, v_request.id, v_request.booking_fee_snapshot,
    'Transfer Bank', 'Booking', current_date, v_proof_path,
    'Booking Fee dari pengajuan SPK Marketing', 'Pending'
  ) returning id into v_payment_id;
  return v_payment_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Pembersihan pengajuan sementara bila unggah gagal
-- ---------------------------------------------------------------------
create or replace function public.discard_marketing_spk_request(p_request_id bigint)
returns void
language plpgsql security definer set search_path = 'public' as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'marketing') then
    raise exception 'Hanya akun Marketing yang dapat membatalkan pengajuan sementara.';
  end if;

  if exists (select 1 from public.payments where spk_request_id = p_request_id and status <> 'Pending') then
    return; -- jangan menyentuh pembayaran yang sudah diproses
  end if;

  delete from public.payments
  where spk_request_id = p_request_id and status = 'Pending'
    and exists (select 1 from public.spk_requests s where s.id = p_request_id and s.marketing_id = auth.uid());

  delete from public.spk_requests
  where id = p_request_id and submission_source = 'Marketing'
    and marketing_id = auth.uid() and submitted_by = auth.uid()
    and status = 'Submitted' and transaction_id is null;
end;
$$;

revoke all on function public.create_marketing_spk_request(bigint, bigint, text, bigint, numeric, text) from public, anon;
revoke all on function public.create_marketing_spk_initial_payment(bigint) from public, anon;
revoke all on function public.discard_marketing_spk_request(bigint) from public, anon;
grant execute on function public.create_marketing_spk_request(bigint, bigint, text, bigint, numeric, text) to authenticated;
grant execute on function public.create_marketing_spk_initial_payment(bigint) to authenticated;
grant execute on function public.discard_marketing_spk_request(bigint) to authenticated;

-- INSERT langsung ke spk_requests oleh Marketing tidak lagi diizinkan:
-- policy lama hanya memeriksa marketing_id, sehingga customer_id/harga/kavling
-- bisa dimanipulasi dari request langsung. Semua pengajuan lewat RPC di atas.
drop policy if exists "SPK marketing insert own" on public.spk_requests;

-- ---------------------------------------------------------------------
-- 4. Riwayat perubahan penanggung jawab klien
-- ---------------------------------------------------------------------
create table if not exists public.customer_ownership_history (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.customers(id) on delete restrict,
  old_marketing_id uuid references public.profiles(id),
  new_marketing_id uuid references public.profiles(id),
  changed_by uuid default auth.uid(),
  reason text,
  created_at timestamptz not null default now()
);
create index if not exists customer_ownership_history_customer_idx
  on public.customer_ownership_history (customer_id, created_at desc);
alter table public.customer_ownership_history enable row level security;

drop policy if exists "Ownership history read admin or marketing scope" on public.customer_ownership_history;
create policy "Ownership history read admin or marketing scope" on public.customer_ownership_history
  for select to authenticated using (
    public.is_finance_admin()
    or public.marketing_scope_allows(public.marketing_owner_of_customer(customer_id)));
-- Tanpa policy INSERT/UPDATE/DELETE: hanya trigger SECURITY DEFINER yang menulis.

create or replace function public.log_customer_ownership_change()
returns trigger language plpgsql security definer set search_path = 'public' as $$
begin
  if new.marketing_id is distinct from old.marketing_id then
    insert into public.customer_ownership_history (customer_id, old_marketing_id, new_marketing_id, changed_by, reason)
    values (new.id, old.marketing_id, new.marketing_id, auth.uid(),
            nullif(current_setting('app.ownership_change_reason', true), ''));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_log_customer_ownership_change on public.customers;
create trigger trg_log_customer_ownership_change
after update of marketing_id on public.customers
for each row execute function public.log_customer_ownership_change();

-- Jalur resmi (Admin/Owner) dengan alasan wajib. Hanya mengubah customers.marketing_id;
-- SPK, pembayaran, transaksi, dan aktivitas lama tidak disentuh.
create or replace function public.reassign_customer_marketing(
  p_customer_id bigint, p_new_marketing_id uuid, p_reason text
) returns void
language plpgsql security definer set search_path = 'public' as $$
begin
  if public.current_app_role() not in ('admin', 'owner') then
    raise exception 'Hanya Admin yang dapat mengubah Marketing penanggung jawab.';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'Alasan perubahan wajib diisi.';
  end if;
  if p_new_marketing_id is not null and not exists (
    select 1 from public.profiles where id = p_new_marketing_id and role = 'marketing') then
    raise exception 'Penanggung jawab baru harus akun Marketing.';
  end if;

  perform set_config('app.ownership_change_reason', btrim(p_reason), true);
  update public.customers set marketing_id = p_new_marketing_id, updated_at = now()
  where id = p_customer_id;
  if not found then raise exception 'Klien tidak ditemukan.'; end if;
end;
$$;

revoke all on function public.reassign_customer_marketing(bigint, uuid, text) from public, anon;
grant execute on function public.reassign_customer_marketing(bigint, uuid, text) to authenticated;
