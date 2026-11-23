-- =====================================================================
-- Sistem Notifikasi Global + pengamanan profil/avatar
--
-- 1. public.notifications  : notifikasi per-penerima, dibuat OLEH TRIGGER
--                            dari kejadian nyata (bukan dari frontend).
-- 2. RLS                   : pengguna hanya membaca & menandai-baca miliknya.
-- 3. Trigger sumber        : SPK, pembayaran, calon klien, CRM, transaksi,
--                            pembatalan, komisi.
-- 4. RPC pengingat cicilan : sync_my_payment_reminders() (untuk akun sendiri).
-- 5. Keamanan profil       : role tidak dapat diubah lewat API pengguna.
-- 6. Storage avatar        : batas 2 MB, JPG/PNG/WEBP, hapus file milik sendiri.
--
-- Role Owner: TIDAK diberi penerima otomatis. Owner hanya membaca baris
-- yang recipient_id-nya dirinya. Aturan penerima Owner ditambahkan saat
-- branch Owner digabung.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Tabel
-- ---------------------------------------------------------------------
create table if not exists public.notifications (
  id           uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references auth.users (id) on delete cascade,
  category     text not null check (category in ('spk', 'payment', 'client', 'transaction', 'commission', 'reminder', 'system')),
  type         text not null,
  priority     text not null default 'normal' check (priority in ('low', 'normal', 'high')),
  title        text not null check (char_length(title) between 1 and 160),
  body         text check (body is null or char_length(body) <= 500),
  data         jsonb not null default '{}'::jsonb,
  dedupe_key   text,
  created_at   timestamptz not null default now(),
  read_at      timestamptz
);

create unique index if not exists notifications_dedupe_uq
  on public.notifications (recipient_id, dedupe_key) where dedupe_key is not null;
create index if not exists notifications_recipient_created_idx
  on public.notifications (recipient_id, created_at desc);
create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id) where read_at is null;

alter table public.notifications enable row level security;

drop policy if exists notifications_select_own on public.notifications;
create policy notifications_select_own on public.notifications
  for select to authenticated
  using (recipient_id = (select auth.uid()));

drop policy if exists notifications_update_own on public.notifications;
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (recipient_id = (select auth.uid()))
  with check (recipient_id = (select auth.uid()));

-- Tidak ada policy INSERT/DELETE: hanya trigger (security definer) yang menulis.
-- Pengguna hanya boleh mengubah kolom read_at.
revoke all on public.notifications from anon, authenticated, public;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;

-- ---------------------------------------------------------------------
-- 2. Helper internal (tidak di-grant ke pengguna)
-- ---------------------------------------------------------------------
create or replace function public._notify(
  p_recipient uuid,
  p_category text,
  p_type text,
  p_priority text,
  p_title text,
  p_body text,
  p_data jsonb,
  p_dedupe text,
  p_actor uuid default null
) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if p_recipient is null or p_recipient is not distinct from p_actor then
    return;
  end if;
  insert into public.notifications (recipient_id, category, type, priority, title, body, data, dedupe_key)
  values (p_recipient, p_category, p_type, p_priority, p_title, left(p_body, 500), coalesce(p_data, '{}'::jsonb),
          case when p_dedupe is null then null else p_dedupe end)
  on conflict (recipient_id, dedupe_key) where dedupe_key is not null do nothing;
exception when foreign_key_violation then
  null; -- penerima tidak punya akun auth: abaikan
end;
$$;

create or replace function public._notify_role(
  p_role text,
  p_category text,
  p_type text,
  p_priority text,
  p_title text,
  p_body text,
  p_data jsonb,
  p_dedupe text,
  p_actor uuid default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  r record;
begin
  for r in select id from public.profiles where role = p_role loop
    perform public._notify(r.id, p_category, p_type, p_priority, p_title, p_body, p_data, p_dedupe, p_actor);
  end loop;
end;
$$;

create or replace function public._rupiah(p_amount numeric)
returns text language sql immutable set search_path = '' as $$
  select 'Rp' || replace(to_char(coalesce(p_amount, 0), 'FM999,999,999,999,999'), ',', '.');
$$;

revoke all on function public._notify(uuid, text, text, text, text, text, jsonb, text, uuid) from public, anon, authenticated;
revoke all on function public._notify_role(text, text, text, text, text, text, jsonb, text, uuid) from public, anon, authenticated;
revoke all on function public._rupiah(numeric) from public, anon;
grant execute on function public._rupiah(numeric) to authenticated;

-- ---------------------------------------------------------------------
-- 3a. SPK
-- ---------------------------------------------------------------------
create or replace function public.trg_notify_spk_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_spk public.spk_requests%rowtype;
  v_owner uuid;
  v_client uuid;
  v_name text;
  v_data jsonb;
  v_key text;
  v_body text;
begin
  select * into v_spk from public.spk_requests where id = new.spk_request_id;
  if not found then return new; end if;

  v_owner := public.marketing_owner_of_spk(v_spk.id);
  select c.user_id into v_client from public.customers c where c.id = v_spk.customer_id;
  v_name := coalesce(nullif(btrim(v_spk.customer_full_name), ''), 'Client');
  v_data := jsonb_build_object('spk_id', v_spk.id, 'spk_number', v_spk.spk_number, 'customer_id', v_spk.customer_id);
  v_key := 'spk:' || v_spk.id || ':' || new.new_status || ':' || new.id;
  v_body := v_spk.spk_number || ' · ' || v_name;

  if new.new_status = 'Submitted' then
    perform public._notify_role('admin', 'spk', 'spk_submitted', 'high', 'Pengajuan SPK baru', v_body, v_data, v_key, new.changed_by);
    perform public._notify(v_owner, 'spk', 'spk_submitted', 'normal', 'SPK berhasil diajukan', v_body, v_data, v_key, new.changed_by);
    perform public._notify_role('marketing_head', 'spk', 'spk_submitted', 'normal', 'Pengajuan SPK dari tim', v_body, v_data, v_key, new.changed_by);
    perform public._notify(v_client, 'spk', 'spk_submitted', 'normal', 'Pengajuan SPK diterima', v_body || ' · menunggu peninjauan Admin', v_data, v_key, new.changed_by);
  elsif new.new_status = 'Under Review' then
    perform public._notify(v_owner, 'spk', 'spk_under_review', 'normal', 'SPK sedang ditinjau Admin', v_body, v_data, v_key, new.changed_by);
    perform public._notify(v_client, 'spk', 'spk_under_review', 'normal', 'SPK sedang ditinjau', v_body, v_data, v_key, new.changed_by);
  elsif new.new_status = 'Approved' then
    perform public._notify(v_owner, 'spk', 'spk_approved', 'high', 'SPK terkonfirmasi', v_body, v_data, v_key, new.changed_by);
    perform public._notify_role('marketing_head', 'spk', 'spk_approved', 'normal', 'SPK anggota tim terkonfirmasi', v_body, v_data, v_key, new.changed_by);
    perform public._notify(v_client, 'spk', 'spk_approved', 'high', 'SPK Anda disetujui', v_body || ' · lanjutkan pembayaran sesuai jadwal', v_data, v_key, new.changed_by);
  elsif new.new_status = 'Rejected' then
    v_body := v_body || coalesce(' · Alasan: ' || nullif(v_spk.rejection_reason, ''), '');
    perform public._notify(v_owner, 'spk', 'spk_rejected', 'high', 'SPK ditolak', v_body, v_data, v_key, new.changed_by);
    perform public._notify_role('marketing_head', 'spk', 'spk_rejected', 'normal', 'SPK anggota tim ditolak', v_body, v_data, v_key, new.changed_by);
    perform public._notify(v_client, 'spk', 'spk_rejected', 'high', 'SPK Anda ditolak', v_body, v_data, v_key, new.changed_by);
  elsif new.new_status = 'Cancelled' then
    perform public._notify_role('admin', 'spk', 'spk_cancelled', 'normal', 'SPK dibatalkan', v_body, v_data, v_key, new.changed_by);
    perform public._notify(v_owner, 'spk', 'spk_cancelled', 'normal', 'SPK dibatalkan', v_body, v_data, v_key, new.changed_by);
    perform public._notify(v_client, 'spk', 'spk_cancelled', 'normal', 'SPK dibatalkan', v_body, v_data, v_key, new.changed_by);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_spk_status on public.spk_request_status_history;
create trigger trg_notify_spk_status
  after insert on public.spk_request_status_history
  for each row execute function public.trg_notify_spk_status();

-- ---------------------------------------------------------------------
-- 3b. Pembayaran
-- ---------------------------------------------------------------------
create or replace function public.trg_notify_payment_submitted()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_name text;
begin
  if new.status is distinct from 'Pending' then return new; end if;
  select c.full_name into v_name from public.customers c where c.id = new.customer_id;
  perform public._notify_role('admin', 'payment', 'payment_submitted', 'high',
    'Pembayaran perlu verifikasi',
    coalesce(v_name, 'Client') || ' · ' || coalesce(new.payment_category, 'Pembayaran') || ' · ' || public._rupiah(new.amount),
    jsonb_build_object('payment_id', new.id, 'customer_id', new.customer_id, 'spk_id', new.spk_request_id),
    'payment:' || new.id || ':Pending', null);
  return new;
end;
$$;

drop trigger if exists trg_notify_payment_submitted on public.payments;
create trigger trg_notify_payment_submitted
  after insert on public.payments
  for each row execute function public.trg_notify_payment_submitted();

create or replace function public.trg_notify_payment_reviewed()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_pay public.payments%rowtype;
  v_name text;
  v_client uuid;
  v_owner uuid;
  v_body text;
  v_data jsonb;
  v_key text;
begin
  if new.old_status is not distinct from new.new_status
     or new.new_status not in ('Confirmed', 'Rejected', 'Needs Reupload') then
    return new;
  end if;

  select * into v_pay from public.payments where id = new.payment_id;
  if not found then return new; end if;

  select c.full_name, c.user_id into v_name, v_client from public.customers c where c.id = v_pay.customer_id;
  v_owner := public.marketing_owner_of_payment(v_pay.id);
  v_body := coalesce(v_name, 'Client') || ' · ' || coalesce(v_pay.payment_category, 'Pembayaran') || ' · ' || public._rupiah(v_pay.amount);
  v_data := jsonb_build_object('payment_id', v_pay.id, 'customer_id', v_pay.customer_id, 'spk_id', v_pay.spk_request_id);
  v_key := 'payment:' || v_pay.id || ':' || new.new_status || ':' || new.id;

  if new.new_status = 'Confirmed' then
    perform public._notify_role('admin', 'payment', 'payment_confirmed', 'normal', 'Pembayaran terverifikasi', v_body, v_data, v_key, new.changed_by);
    perform public._notify(v_owner, 'payment', 'payment_confirmed', 'high', 'Pembayaran client terkonfirmasi', v_body, v_data, v_key, new.changed_by);
    perform public._notify_role('marketing_head', 'payment', 'payment_confirmed', 'normal', 'Pembayaran tim terkonfirmasi', v_body, v_data, v_key, new.changed_by);
    perform public._notify(v_client, 'payment', 'payment_confirmed', 'high', 'Pembayaran Anda terkonfirmasi', coalesce(v_pay.payment_category, 'Pembayaran') || ' · ' || public._rupiah(v_pay.amount), v_data, v_key, new.changed_by);
  elsif new.new_status = 'Rejected' then
    v_body := v_body || coalesce(' · ' || nullif(new.review_note, ''), '');
    perform public._notify_role('admin', 'payment', 'payment_rejected', 'normal', 'Pembayaran ditolak', v_body, v_data, v_key, new.changed_by);
    perform public._notify(v_owner, 'payment', 'payment_rejected', 'normal', 'Pembayaran client ditolak', v_body, v_data, v_key, new.changed_by);
    perform public._notify(v_client, 'payment', 'payment_rejected', 'high', 'Pembayaran Anda ditolak', coalesce(nullif(new.review_note, ''), 'Periksa kembali bukti pembayaran Anda.'), v_data, v_key, new.changed_by);
  else
    perform public._notify(v_client, 'payment', 'payment_reupload', 'high', 'Bukti pembayaran perlu diunggah ulang', coalesce(nullif(new.review_note, ''), 'Unggah ulang bukti pembayaran yang jelas.'), v_data, v_key, new.changed_by);
    perform public._notify(v_owner, 'payment', 'payment_reupload', 'normal', 'Bukti pembayaran client perlu diunggah ulang', v_body, v_data, v_key, new.changed_by);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_payment_reviewed on public.payment_status_history;
create trigger trg_notify_payment_reviewed
  after insert on public.payment_status_history
  for each row execute function public.trg_notify_payment_reviewed();

-- ---------------------------------------------------------------------
-- 3c. Calon klien baru & penugasan
-- ---------------------------------------------------------------------
create or replace function public.trg_notify_customer_created()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_data jsonb := jsonb_build_object('customer_id', new.id);
  v_actor uuid := (select auth.uid());
begin
  perform public._notify_role('admin', 'client', 'customer_created', 'normal', 'Calon klien baru',
    coalesce(nullif(btrim(new.full_name), ''), 'Calon klien'), v_data, 'customer:' || new.id || ':created', v_actor);
  if new.marketing_id is not null then
    perform public._notify(new.marketing_id, 'client', 'customer_assigned', 'normal', 'Calon klien baru untuk Anda',
      coalesce(nullif(btrim(new.full_name), ''), 'Calon klien'), v_data, 'customer:' || new.id || ':assigned:' || new.marketing_id, v_actor);
    perform public._notify_role('marketing_head', 'client', 'customer_created', 'low', 'Calon klien baru di tim',
      coalesce(nullif(btrim(new.full_name), ''), 'Calon klien'), v_data, 'customer:' || new.id || ':created', coalesce(v_actor, new.marketing_id));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_customer_created on public.customers;
create trigger trg_notify_customer_created
  after insert on public.customers
  for each row execute function public.trg_notify_customer_created();

create or replace function public.trg_notify_customer_reassigned()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.marketing_id is not null and new.marketing_id is distinct from old.marketing_id then
    perform public._notify(new.marketing_id, 'client', 'customer_assigned', 'normal', 'Calon klien ditugaskan kepada Anda',
      coalesce(nullif(btrim(new.full_name), ''), 'Calon klien'),
      jsonb_build_object('customer_id', new.id),
      'customer:' || new.id || ':assigned:' || new.marketing_id || ':' || floor(extract(epoch from now()))::bigint,
      (select auth.uid()));
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_customer_reassigned on public.customers;
create trigger trg_notify_customer_reassigned
  after update of marketing_id on public.customers
  for each row execute function public.trg_notify_customer_reassigned();

-- Perkembangan (CRM): hanya perubahan status nyata, bukan catatan biasa.
create or replace function public.trg_notify_crm_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_c record;
  v_data jsonb;
  v_key text;
begin
  if new.old_status is null or new.old_status is not distinct from new.new_status then
    return new;
  end if;
  select c.id, c.full_name, c.marketing_id into v_c from public.customers c where c.id = new.customer_id;
  if not found or v_c.marketing_id is null then return new; end if;

  v_data := jsonb_build_object('customer_id', v_c.id);
  v_key := 'crm:' || new.id;
  perform public._notify(v_c.marketing_id, 'client', 'crm_status', 'normal', 'Perkembangan client diperbarui',
    coalesce(v_c.full_name, 'Client') || ' · ' || new.old_status || ' → ' || new.new_status, v_data, v_key, new.changed_by);
  if new.new_status in ('Pengajuan', 'Berhasil', 'Tidak Lanjut') then
    perform public._notify_role('marketing_head', 'client', 'crm_status', 'normal', 'Perkembangan client tim',
      coalesce(v_c.full_name, 'Client') || ' · ' || new.old_status || ' → ' || new.new_status, v_data, v_key, new.changed_by);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_crm_status on public.customer_crm_status_history;
create trigger trg_notify_crm_status
  after insert on public.customer_crm_status_history
  for each row execute function public.trg_notify_crm_status();

-- ---------------------------------------------------------------------
-- 3d. Transaksi (lunas / batal) — perubahan status kavling yang penting
-- ---------------------------------------------------------------------
create or replace function public.trg_notify_transaction_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_lot text;
  v_name text;
  v_client uuid;
  v_owner uuid;
  v_data jsonb;
  v_key text;
  v_actor uuid := (select auth.uid());
begin
  if new.status is not distinct from old.status or new.status not in ('Sold', 'Cancelled') then
    return new;
  end if;
  select l.lot_number into v_lot from public.lots l where l.id = new.lot_id;
  select c.full_name, c.user_id into v_name, v_client from public.customers c where c.id = new.customer_id;
  v_owner := public.marketing_owner_of_transaction(new.id);
  v_data := jsonb_build_object('transaction_id', new.id, 'lot_id', new.lot_id, 'customer_id', new.customer_id);
  v_key := 'transaction:' || new.id || ':' || new.status;

  if new.status = 'Sold' then
    perform public._notify_role('admin', 'transaction', 'transaction_paid_off', 'normal', 'Kavling lunas',
      'Kavling ' || coalesce(v_lot, '-') || ' · ' || coalesce(v_name, 'Client'), v_data, v_key, v_actor);
    perform public._notify(v_owner, 'transaction', 'transaction_paid_off', 'high', 'Transaksi client lunas',
      'Kavling ' || coalesce(v_lot, '-') || ' · ' || coalesce(v_name, 'Client'), v_data, v_key, v_actor);
    perform public._notify_role('marketing_head', 'transaction', 'transaction_paid_off', 'normal', 'Transaksi tim lunas',
      'Kavling ' || coalesce(v_lot, '-') || ' · ' || coalesce(v_name, 'Client'), v_data, v_key, v_actor);
    perform public._notify(v_client, 'transaction', 'transaction_paid_off', 'high', 'Pembelian kavling lunas',
      'Kavling ' || coalesce(v_lot, '-') || ' telah lunas. Terima kasih.', v_data, v_key, v_actor);
  else
    perform public._notify_role('admin', 'transaction', 'transaction_cancelled', 'high', 'Transaksi dibatalkan',
      'Kavling ' || coalesce(v_lot, '-') || ' · ' || coalesce(v_name, 'Client'), v_data, v_key, v_actor);
    perform public._notify(v_owner, 'transaction', 'transaction_cancelled', 'high', 'Transaksi client dibatalkan',
      'Kavling ' || coalesce(v_lot, '-') || ' · ' || coalesce(v_name, 'Client'), v_data, v_key, v_actor);
    perform public._notify_role('marketing_head', 'transaction', 'transaction_cancelled', 'normal', 'Transaksi tim dibatalkan',
      'Kavling ' || coalesce(v_lot, '-') || ' · ' || coalesce(v_name, 'Client'), v_data, v_key, v_actor);
    perform public._notify(v_client, 'transaction', 'transaction_cancelled', 'high', 'Transaksi dibatalkan',
      'Transaksi kavling ' || coalesce(v_lot, '-') || ' telah dibatalkan.', v_data, v_key, v_actor);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_transaction_status on public.lot_transactions;
create trigger trg_notify_transaction_status
  after update of status on public.lot_transactions
  for each row execute function public.trg_notify_transaction_status();

-- Pengajuan & keputusan pembatalan
create or replace function public.trg_notify_cancellation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_lot text;
  v_name text;
  v_client uuid;
  v_owner uuid;
  v_data jsonb;
  v_actor uuid := (select auth.uid());
  v_label text;
begin
  select l.lot_number into v_lot
  from public.lot_transactions t left join public.lots l on l.id = t.lot_id where t.id = new.transaction_id;
  select c.full_name, c.user_id into v_name, v_client from public.customers c where c.id = new.customer_id;
  v_owner := public.marketing_owner_of_transaction(new.transaction_id);
  v_data := jsonb_build_object('transaction_id', new.transaction_id, 'customer_id', new.customer_id);

  if tg_op = 'INSERT' then
    perform public._notify_role('admin', 'transaction', 'cancellation_requested', 'high', 'Pengajuan pembatalan transaksi',
      'Kavling ' || coalesce(v_lot, '-') || ' · ' || coalesce(v_name, 'Client'), v_data, 'cancel:' || new.id || ':Pending', v_actor);
    perform public._notify(v_owner, 'transaction', 'cancellation_requested', 'normal', 'Client mengajukan pembatalan',
      'Kavling ' || coalesce(v_lot, '-') || ' · ' || coalesce(v_name, 'Client'), v_data, 'cancel:' || new.id || ':Pending', v_actor);
  elsif new.status is distinct from old.status and new.status in ('Approved', 'Rejected') then
    v_label := case new.status when 'Approved' then 'disetujui' else 'ditolak' end;
    perform public._notify(v_client, 'transaction', 'cancellation_' || lower(new.status), 'high', 'Pembatalan transaksi ' || v_label,
      'Kavling ' || coalesce(v_lot, '-') || coalesce(' · ' || nullif(new.decision_note, ''), ''), v_data, 'cancel:' || new.id || ':' || new.status, v_actor);
    perform public._notify(v_owner, 'transaction', 'cancellation_' || lower(new.status), 'normal', 'Pembatalan transaksi ' || v_label,
      'Kavling ' || coalesce(v_lot, '-') || ' · ' || coalesce(v_name, 'Client'), v_data, 'cancel:' || new.id || ':' || new.status, v_actor);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_cancellation on public.purchase_cancellation_requests;
create trigger trg_notify_cancellation
  after insert or update of status on public.purchase_cancellation_requests
  for each row execute function public.trg_notify_cancellation();

-- ---------------------------------------------------------------------
-- 3e. Komisi Marketing
-- ---------------------------------------------------------------------
create or replace function public.trg_notify_commission()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status
     and new.commission_amount is not distinct from old.commission_amount then
    return new;
  end if;
  perform public._notify(new.marketing_id, 'commission', 'commission_' || lower(replace(new.status, ' ', '_')),
    case when new.status = 'Paid' then 'high' else 'normal' end,
    case new.status when 'Paid' then 'Komisi telah dibayarkan'
                    when 'Eligible' then 'Komisi dapat dicairkan'
                    when 'Cancelled' then 'Komisi dibatalkan'
                    else case when tg_op = 'INSERT' then 'Komisi baru tercatat' else 'Status komisi berubah' end end,
    public._rupiah(new.commission_amount) || ' · ' || new.status,
    jsonb_build_object('commission_id', new.id, 'transaction_id', new.transaction_id),
    'commission:' || new.id || ':' || new.status || ':' || coalesce(new.commission_amount, 0),
    (select auth.uid()));
  return new;
end;
$$;

drop trigger if exists trg_notify_commission on public.marketing_commissions;
create trigger trg_notify_commission
  after insert or update of status, commission_amount on public.marketing_commissions
  for each row execute function public.trg_notify_commission();

-- ---------------------------------------------------------------------
-- 4. Pengingat cicilan untuk akun Client yang sedang login.
--    Idempoten (dedupe_key), hanya menyentuh data milik pemanggil.
-- ---------------------------------------------------------------------
create or replace function public.sync_my_payment_reminders()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_today date := (now() at time zone 'Asia/Makassar')::date;
  v_before bigint;
  v_after bigint;
  s record;
begin
  if v_uid is null then return 0; end if;
  select count(*) into v_before from public.notifications where recipient_id = v_uid;

  for s in
    select sc.id, sc.installment_number, sc.due_date, sc.amount, sc.status, l.lot_number, t.id as transaction_id
    from public.installment_schedules sc
    join public.lot_transactions t on t.id = sc.transaction_id
    join public.customers c on c.id = t.customer_id
    left join public.lots l on l.id = t.lot_id
    where c.user_id = v_uid
      and t.status <> 'Cancelled'
      and sc.status in ('Pending', 'Overdue')
      and sc.due_date <= v_today + 7
  loop
    if s.due_date < v_today then
      perform public._notify(v_uid, 'reminder', 'installment_overdue', 'high', 'Cicilan terlambat',
        'Cicilan ke-' || s.installment_number || ' · Kavling ' || coalesce(s.lot_number, '-') || ' · ' || public._rupiah(s.amount)
          || ' · terlambat ' || (v_today - s.due_date) || ' hari',
        jsonb_build_object('schedule_id', s.id, 'transaction_id', s.transaction_id),
        'installment-overdue:' || s.id, null);
    else
      perform public._notify(v_uid, 'reminder', 'installment_due_soon', 'high', 'Cicilan segera jatuh tempo',
        'Cicilan ke-' || s.installment_number || ' · Kavling ' || coalesce(s.lot_number, '-') || ' · ' || public._rupiah(s.amount)
          || ' · jatuh tempo ' || to_char(s.due_date, 'DD-MM-YYYY'),
        jsonb_build_object('schedule_id', s.id, 'transaction_id', s.transaction_id),
        'installment-due:' || s.id, null);
    end if;
  end loop;

  select count(*) into v_after from public.notifications where recipient_id = v_uid;
  return (v_after - v_before)::integer;
end;
$$;

revoke all on function public.sync_my_payment_reminders() from public, anon;
grant execute on function public.sync_my_payment_reminders() to authenticated;

-- ---------------------------------------------------------------------
-- 5. Keamanan profil: role & id tidak dapat diubah oleh pengguna.
--    Policy "Users can update own profile" tidak membatasi kolom,
--    sehingga pengguna dapat menaikkan role sendiri tanpa guard ini.
--    Jalur tepercaya (service role / fungsi security definer) tetap bisa.
-- ---------------------------------------------------------------------
create or replace function public.guard_profile_self_write()
returns trigger language plpgsql set search_path = '' as $$
begin
  if current_user in ('authenticated', 'anon') then
    if tg_op = 'UPDATE' then
      if new.id is distinct from old.id then
        raise exception 'ID profil tidak dapat diubah.';
      end if;
      if new.role is distinct from old.role then
        raise exception 'Role tidak dapat diubah dari aplikasi.';
      end if;
    elsif tg_op = 'INSERT' then
      -- Profil yang dibuat sendiri oleh pengguna selalu berperan client.
      new.role := 'client';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_guard_profile_self_write on public.profiles;
create trigger trg_guard_profile_self_write
  before insert or update on public.profiles
  for each row execute function public.guard_profile_self_write();

-- ---------------------------------------------------------------------
-- 6. Storage avatar: bucket client-avatars dipakai semua role.
--    Folder pertama = auth.uid() (policy upload/update sudah ada).
-- ---------------------------------------------------------------------
update storage.buckets
   set file_size_limit = 2097152,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'client-avatars';

drop policy if exists "User can delete own avatar" on storage.objects;
create policy "User can delete own avatar" on storage.objects
  for delete to authenticated
  using (bucket_id = 'client-avatars' and (storage.foldername(name))[1] = (select auth.uid())::text);
