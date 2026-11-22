-- =====================================================================
-- Marketing & Kepala Bagian Marketing: scope helpers, CRM status, RLS
-- ---------------------------------------------------------------------
-- Struktur role aktual: profiles.role IN (owner, admin, marketing_head,
-- marketing, client). "Kepala Bagian Departemen Marketing" = marketing_head.
-- Tidak ada role baru yang dibuat.
--
-- Kepemilikan data Marketing:
--   customer     -> customers.marketing_id
--   spk_request  -> customers.marketing_id (via customer_id), fallback
--                   spk_requests.marketing_id bila submission_source='Marketing'
--                   (SPK dari Client menyimpan uid client di marketing_id).
--   transaction  -> pemilik customer, fallback SPK Marketing yang terhubung.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. CRM status (terpisah dari status SPK & pembayaran)
-- ---------------------------------------------------------------------
alter table public.customers
  add column if not exists crm_status text not null default 'Baru',
  add column if not exists crm_status_updated_at timestamptz,
  add column if not exists crm_status_updated_by uuid references public.profiles(id),
  add column if not exists last_contacted_at timestamptz;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'customers_crm_status_check') then
    alter table public.customers add constraint customers_crm_status_check check (crm_status in (
      'Baru','Belum Dihubungi','Sudah Dihubungi','Follow-up','Berminat',
      'Survey Lokasi','Negosiasi','Pengajuan','Berhasil','Tidak Lanjut'));
  end if;
end $$;

create index if not exists customers_marketing_id_idx on public.customers (marketing_id);
create index if not exists customers_crm_status_idx on public.customers (crm_status);
create index if not exists customer_followups_customer_idx on public.customer_followups (customer_id, followup_date desc);
create index if not exists spk_requests_customer_idx on public.spk_requests (customer_id);
create index if not exists lot_transactions_customer_idx on public.lot_transactions (customer_id);

create table if not exists public.customer_crm_status_history (
  id bigint generated always as identity primary key,
  customer_id bigint not null references public.customers(id),
  old_status text,
  new_status text not null,
  note text,
  changed_by uuid references public.profiles(id) default auth.uid(),
  created_at timestamptz not null default now()
);
create index if not exists customer_crm_history_customer_idx on public.customer_crm_status_history (customer_id, created_at desc);
alter table public.customer_crm_status_history enable row level security;

-- Pencatat audit catatan selalu terisi walau klien tidak mengirim created_by.
alter table public.customer_notes alter column created_by set default auth.uid();
alter table public.customer_followups alter column user_id set default auth.uid();

-- ---------------------------------------------------------------------
-- 2. Helper scope (SECURITY DEFINER, tanpa rekursi RLS)
-- ---------------------------------------------------------------------
create or replace function public.is_marketing_head()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'marketing_head')
$$;

create or replace function public.is_marketing_team_member(p_user uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select p_user is not null and exists (
    select 1 from public.profiles p where p.id = p_user and p.role in ('marketing','marketing_head'))
$$;

-- TRUE bila user login (Marketing/Kepala Bagian Marketing) boleh melihat data milik p_owner.
-- Admin/Owner TIDAK dicakup di sini; mereka punya policy masing-masing.
create or replace function public.marketing_scope_allows(p_owner uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select case
    when p_owner is null or (select auth.uid()) is null then false
    else exists (
      select 1 from public.profiles me
      where me.id = (select auth.uid())
        and (
          (me.role = 'marketing' and p_owner = me.id)
          or (me.role = 'marketing_head' and public.is_marketing_team_member(p_owner))
        ))
  end
$$;

create or replace function public.marketing_owner_of_customer(p_customer_id bigint)
returns uuid language sql stable security definer set search_path = '' as $$
  select c.marketing_id from public.customers c where c.id = p_customer_id
$$;

create or replace function public.marketing_owner_of_spk(p_spk_id bigint)
returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce(c.marketing_id, case when sr.submission_source = 'Marketing' then sr.marketing_id end)
  from public.spk_requests sr
  left join public.customers c on c.id = sr.customer_id
  where sr.id = p_spk_id
$$;

create or replace function public.marketing_owner_of_transaction(p_transaction_id bigint)
returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce(
    (select c.marketing_id from public.lot_transactions t join public.customers c on c.id = t.customer_id where t.id = p_transaction_id),
    (select sr.marketing_id from public.spk_requests sr
      where sr.transaction_id = p_transaction_id and sr.submission_source = 'Marketing'
      order by sr.id desc limit 1))
$$;

create or replace function public.marketing_owner_of_payment(p_payment_id bigint)
returns uuid language sql stable security definer set search_path = '' as $$
  select coalesce(
    public.marketing_owner_of_transaction(p.transaction_id),
    public.marketing_owner_of_spk(p.spk_request_id),
    public.marketing_owner_of_customer(p.customer_id))
  from public.payments p where p.id = p_payment_id
$$;

create or replace function public.normalize_id_phone(p_phone text)
returns text language sql immutable set search_path = '' as $$
  select case
    when d = '' then null
    when d like '62%' then d
    when d like '0%' then '62' || substr(d, 2)
    when d like '8%' then '62' || d
    else d end
  from (select regexp_replace(coalesce(p_phone, ''), '\D', '', 'g') as d) s
$$;

revoke all on function public.marketing_scope_allows(uuid) from public, anon;
revoke all on function public.marketing_owner_of_customer(bigint) from public, anon;
revoke all on function public.marketing_owner_of_spk(bigint) from public, anon;
revoke all on function public.marketing_owner_of_transaction(bigint) from public, anon;
revoke all on function public.marketing_owner_of_payment(bigint) from public, anon;
grant execute on function public.marketing_scope_allows(uuid), public.marketing_owner_of_customer(bigint),
  public.marketing_owner_of_spk(bigint), public.marketing_owner_of_transaction(bigint),
  public.marketing_owner_of_payment(bigint), public.is_marketing_head(), public.is_marketing_team_member(uuid)
  to authenticated;

-- ---------------------------------------------------------------------
-- 3. Guard trigger customers: kolom kepemilikan & validasi duplikasi
-- ---------------------------------------------------------------------
-- Cek duplikasi lintas seluruh client (melewati RLS) tanpa membocorkan datanya.
create or replace function public.customer_contact_exists(p_phone text, p_whatsapp text, p_exclude_id bigint default null)
returns boolean language sql stable security definer set search_path = '' as $$
  with k as (
    select public.normalize_id_phone(p_phone) a, public.normalize_id_phone(p_whatsapp) b
  )
  -- Hanya staf internal yang boleh memeriksa, agar nomor tidak bisa ditebak oleh Client.
  select public.current_app_role() in ('admin', 'owner', 'marketing', 'marketing_head') and exists (
    select 1 from public.customers c, k
    where (p_exclude_id is null or c.id <> p_exclude_id)
      and (k.a is not null or k.b is not null)
      and (public.normalize_id_phone(c.phone) in (k.a, k.b)
        or public.normalize_id_phone(c.whatsapp_phone) in (k.a, k.b)))
$$;
revoke all on function public.customer_contact_exists(text, text, bigint) from public, anon;
grant execute on function public.customer_contact_exists(text, text, bigint) to authenticated;

-- SECURITY INVOKER: current_user = 'authenticated' untuk akses API langsung,
-- dan = owner fungsi saat dipanggil dari RPC SECURITY DEFINER (dikecualikan).
create or replace function public.guard_customer_ownership()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  v_role text;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  v_role := public.current_app_role();
  if v_role in ('admin', 'owner') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if v_role in ('marketing', 'marketing_head') then
      if v_role = 'marketing' then
        new.marketing_id := auth.uid();           -- tidak bisa diatribusikan ke Marketing lain
      elsif not public.is_marketing_team_member(new.marketing_id) then
        raise exception 'Pilih Marketing penanggung jawab dari tim Marketing.';
      end if;
      new.registration_source := 'Marketing';
      new.user_id := null;
      new.crm_status := coalesce(nullif(new.crm_status, ''), 'Baru');

      if public.customer_contact_exists(new.phone, new.whatsapp_phone, null) then
        raise exception 'Nomor kontak sudah terdaftar sebagai client lain. Hubungi Kepala Bagian Marketing atau Admin untuk penanganan.'
          using errcode = '23505';
      end if;
    end if;
    return new;
  end if;

  -- UPDATE oleh non-admin
  if new.marketing_id is distinct from old.marketing_id then
    raise exception 'Marketing penanggung jawab hanya dapat diubah oleh Admin.';
  end if;
  if new.registration_source is distinct from old.registration_source then
    raise exception 'Sumber pendaftaran tidak dapat diubah.';
  end if;
  if new.user_id is distinct from old.user_id then
    -- Satu-satunya perubahan yang diizinkan: Client menautkan data lama ke akunnya sendiri.
    if not (v_role = 'client' and old.user_id is null and new.user_id = auth.uid()) then
      raise exception 'Tautan akun client tidak dapat diubah.';
    end if;
  end if;
  if new.crm_status is distinct from old.crm_status and v_role not in ('marketing', 'marketing_head') then
    raise exception 'Status perkembangan hanya dapat diubah tim Marketing atau Admin.';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_customer_ownership on public.customers;
create trigger trg_guard_customer_ownership
  before insert or update on public.customers
  for each row execute function public.guard_customer_ownership();

-- Riwayat status CRM otomatis (siapa & kapan) untuk setiap perubahan.
create or replace function public.log_customer_crm_status()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.crm_status is not distinct from old.crm_status then
    return new;
  end if;
  insert into public.customer_crm_status_history (customer_id, old_status, new_status, note, changed_by)
  values (new.id, case when tg_op = 'UPDATE' then old.crm_status end, new.crm_status,
          nullif(current_setting('poliland.crm_note', true), ''), auth.uid());
  return new;
end;
$$;

create or replace function public.stamp_customer_crm_status()
returns trigger language plpgsql set search_path = '' as $$
begin
  if tg_op = 'INSERT' or new.crm_status is distinct from old.crm_status then
    new.crm_status_updated_at := now();
    new.crm_status_updated_by := auth.uid();
  end if;
  return new;
end;
$$;

drop trigger if exists trg_stamp_customer_crm_status on public.customers;
create trigger trg_stamp_customer_crm_status
  before insert or update of crm_status on public.customers
  for each row execute function public.stamp_customer_crm_status();

drop trigger if exists trg_log_customer_crm_status on public.customers;
create trigger trg_log_customer_crm_status
  after insert or update of crm_status on public.customers
  for each row execute function public.log_customer_crm_status();

-- Follow-up memperbarui tanggal terakhir dihubungi.
create or replace function public.touch_customer_last_contacted()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.customers
     set last_contacted_at = greatest(coalesce(last_contacted_at, '-infinity'::timestamptz), new.followup_date::timestamptz),
         updated_at = now()
   where id = new.customer_id;
  return new;
end;
$$;

drop trigger if exists trg_touch_customer_last_contacted on public.customer_followups;
create trigger trg_touch_customer_last_contacted
  after insert on public.customer_followups
  for each row execute function public.touch_customer_last_contacted();

-- ---------------------------------------------------------------------
-- 4. RLS: customers
-- ---------------------------------------------------------------------
drop policy if exists "authenticated can read customers" on public.customers;
drop policy if exists "authenticated can update customers" on public.customers;
drop policy if exists "Admin and Marketing can insert customers" on public.customers;

create policy "Finance admin read customers" on public.customers
  for select to authenticated using (public.is_finance_admin());
create policy "Marketing scope read customers" on public.customers
  for select to authenticated using (public.marketing_scope_allows(marketing_id));
-- Klien lama yang belum tertaut: hanya baris dengan email akun sendiri.
create policy "Client read unlinked own email customer" on public.customers
  for select to authenticated using (
    user_id is null and registration_source = 'Client'
    and lower(btrim(email)) = lower(btrim(coalesce((select auth.jwt()) ->> 'email', '')))
    and public.current_app_role() = 'client');

create policy "Admin insert customers" on public.customers
  for insert to authenticated with check (exists (
    select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'admin'));
create policy "Marketing insert own customers" on public.customers
  for insert to authenticated with check (
    public.current_app_role() = 'marketing' and marketing_id = (select auth.uid())
    and registration_source = 'Marketing' and user_id is null);
create policy "Marketing head insert team customers" on public.customers
  for insert to authenticated with check (
    public.is_marketing_head() and public.is_marketing_team_member(marketing_id)
    and registration_source = 'Marketing' and user_id is null);

create policy "Finance admin update customers" on public.customers
  for update to authenticated using (public.is_finance_admin()) with check (public.is_finance_admin());
create policy "Marketing scope update customers" on public.customers
  for update to authenticated using (public.marketing_scope_allows(marketing_id))
  with check (public.marketing_scope_allows(marketing_id));
create policy "Client claim unlinked own email customer" on public.customers
  for update to authenticated using (
    user_id is null and registration_source = 'Client'
    and lower(btrim(email)) = lower(btrim(coalesce((select auth.jwt()) ->> 'email', '')))
    and public.current_app_role() = 'client')
  with check (user_id = (select auth.uid()) and registration_source = 'Client');

-- ---------------------------------------------------------------------
-- 5. RLS: customer_interests
-- ---------------------------------------------------------------------
drop policy if exists "Admin can read customer interests" on public.customer_interests;
drop policy if exists "Authenticated users can read customer interests" on public.customer_interests;
drop policy if exists "authenticated can read customer interests" on public.customer_interests;
drop policy if exists "Admin and Marketing can insert customer interests" on public.customer_interests;

create policy "Finance admin read customer interests" on public.customer_interests
  for select to authenticated using (public.is_finance_admin());
create policy "Client read own customer interests" on public.customer_interests
  for select to authenticated using (exists (
    select 1 from public.customers c where c.id = customer_interests.customer_id and c.user_id = (select auth.uid())));
create policy "Marketing scope read customer interests" on public.customer_interests
  for select to authenticated using (public.marketing_scope_allows(public.marketing_owner_of_customer(customer_id)));
create policy "Marketing scope insert customer interests" on public.customer_interests
  for insert to authenticated with check (public.marketing_scope_allows(public.marketing_owner_of_customer(customer_id)));
create policy "Marketing scope update customer interests" on public.customer_interests
  for update to authenticated using (public.marketing_scope_allows(public.marketing_owner_of_customer(customer_id)))
  with check (public.marketing_scope_allows(public.marketing_owner_of_customer(customer_id)));
create policy "Marketing scope delete customer interests" on public.customer_interests
  for delete to authenticated using (public.marketing_scope_allows(public.marketing_owner_of_customer(customer_id)));

-- ---------------------------------------------------------------------
-- 6. RLS: customer_notes & histories
-- ---------------------------------------------------------------------
drop policy if exists "authenticated can add customer notes" on public.customer_notes;
drop policy if exists "authenticated can create customer notes" on public.customer_notes;
drop policy if exists "authenticated can delete customer notes" on public.customer_notes;
drop policy if exists "authenticated can read customer notes" on public.customer_notes;
drop policy if exists "authenticated can update customer notes" on public.customer_notes;

create policy "Notes read admin or marketing scope" on public.customer_notes
  for select to authenticated using (
    public.is_finance_admin() or public.marketing_scope_allows(public.marketing_owner_of_customer(customer_id)));
create policy "Notes insert admin or marketing scope" on public.customer_notes
  for insert to authenticated with check (
    created_by = (select auth.uid())
    and (public.is_finance_admin() or public.marketing_scope_allows(public.marketing_owner_of_customer(customer_id))));
create policy "Notes update by admin or author" on public.customer_notes
  for update to authenticated using (
    public.is_finance_admin()
    or (created_by = (select auth.uid()) and public.marketing_scope_allows(public.marketing_owner_of_customer(customer_id))))
  with check (
    public.is_finance_admin()
    or (created_by = (select auth.uid()) and public.marketing_scope_allows(public.marketing_owner_of_customer(customer_id))));
create policy "Notes delete by admin or author" on public.customer_notes
  for delete to authenticated using (
    public.is_finance_admin()
    or (created_by = (select auth.uid()) and public.marketing_scope_allows(public.marketing_owner_of_customer(customer_id))));

drop policy if exists "Authenticated users can read customer note history" on public.customer_note_histories;
drop policy if exists "authenticated can read customer note histories" on public.customer_note_histories;
create policy "Note history read admin or marketing scope" on public.customer_note_histories
  for select to authenticated using (
    public.is_finance_admin() or public.marketing_scope_allows(public.marketing_owner_of_customer(customer_id)));

-- ---------------------------------------------------------------------
-- 7. RLS: customer_followups (sebelumnya RLS NONAKTIF)
-- ---------------------------------------------------------------------
alter table public.customer_followups enable row level security;
create policy "Followups read admin or marketing scope" on public.customer_followups
  for select to authenticated using (
    public.is_finance_admin() or public.marketing_scope_allows(public.marketing_owner_of_customer(customer_id)));
create policy "Followups insert marketing scope" on public.customer_followups
  for insert to authenticated with check (
    user_id = (select auth.uid())
    and (public.is_finance_admin() or public.marketing_scope_allows(public.marketing_owner_of_customer(customer_id))));
create policy "Followups update by admin or author" on public.customer_followups
  for update to authenticated using (public.is_finance_admin() or user_id = (select auth.uid()))
  with check (public.is_finance_admin() or user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 8. RLS: CRM history
-- ---------------------------------------------------------------------
create policy "CRM history read admin or marketing scope" on public.customer_crm_status_history
  for select to authenticated using (
    public.is_finance_admin() or public.marketing_scope_allows(public.marketing_owner_of_customer(customer_id)));

-- ---------------------------------------------------------------------
-- 9. RLS: tabel sebelumnya terbuka (activity_logs, payment_correction_audits)
--    Writer-nya SECURITY DEFINER, jadi tidak terpengaruh.
-- ---------------------------------------------------------------------
alter table public.activity_logs enable row level security;
create policy "Finance admin read activity logs" on public.activity_logs
  for select to authenticated using (public.is_finance_admin());

alter table public.payment_correction_audits enable row level security;
create policy "Finance admin read payment correction audits" on public.payment_correction_audits
  for select to authenticated using (public.is_finance_admin());

-- payment_plans: sebelumnya semua user login dapat INSERT (with check true).
drop policy if exists "admin can insert payment plans" on public.payment_plans;
create policy "admin can insert payment plans" on public.payment_plans
  for insert to authenticated with check (public.is_finance_admin());

-- ---------------------------------------------------------------------
-- 10. RLS baca-saja transaksi untuk tim Marketing (tanpa hak tulis)
-- ---------------------------------------------------------------------
-- lot_transactions: sebelumnya SEMUA Marketing dapat membaca SEMUA transaksi.
drop policy if exists "Client and Admin read lot transactions" on public.lot_transactions;
create policy "Client and Admin read lot transactions" on public.lot_transactions
  for select to authenticated using (
    customer_id in (select c.id from public.customers c where c.user_id = (select auth.uid()))
    or public.is_finance_admin());
create policy "Marketing scope read lot transactions" on public.lot_transactions
  for select to authenticated using (public.marketing_scope_allows(public.marketing_owner_of_transaction(id)));

create policy "Marketing scope read spk requests" on public.spk_requests
  for select to authenticated using (public.marketing_scope_allows(
    coalesce(public.marketing_owner_of_customer(customer_id),
             case when submission_source = 'Marketing' then marketing_id end)));

create policy "Marketing scope read spk history" on public.spk_request_status_history
  for select to authenticated using (public.marketing_scope_allows(public.marketing_owner_of_spk(spk_request_id)));

create policy "Marketing scope read payments" on public.payments
  for select to authenticated using (public.marketing_scope_allows(public.marketing_owner_of_payment(id)));

create policy "Marketing scope read payment status history" on public.payment_status_history
  for select to authenticated using (public.marketing_scope_allows(public.marketing_owner_of_payment(payment_id)));

create policy "Marketing scope read installment schedules" on public.installment_schedules
  for select to authenticated using (public.marketing_scope_allows(public.marketing_owner_of_transaction(transaction_id)));

create policy "Marketing scope read installment penalties" on public.installment_penalties
  for select to authenticated using (exists (
    select 1 from public.installment_schedules s
    where s.id = installment_penalties.installment_schedule_id
      and public.marketing_scope_allows(public.marketing_owner_of_transaction(s.transaction_id))));

create policy "Marketing scope read purchase cancellations" on public.purchase_cancellation_requests
  for select to authenticated using (public.marketing_scope_allows(public.marketing_owner_of_transaction(transaction_id)));

create policy "Marketing scope read purchase refunds" on public.purchase_refunds
  for select to authenticated using (public.marketing_scope_allows(public.marketing_owner_of_transaction(transaction_id)));

-- Komisi: Marketing membaca miliknya (policy lama), Kepala Bagian membaca tim.
create policy "Marketing head read team commissions" on public.marketing_commissions
  for select to authenticated using (public.is_marketing_head() and public.is_marketing_team_member(marketing_id));

create policy "Marketing head read team profiles" on public.marketing_profiles
  for select to authenticated using (public.is_marketing_head() and public.is_marketing_team_member(user_id));
