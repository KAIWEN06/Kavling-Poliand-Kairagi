-- =====================================================================
-- Pembatalan pembelian, wanprestasi 90 hari, dan pengembalian 50%
-- Rencana dan keputusan: docs/RENCANA_WANPRESTASI.md
--
--   * Berhenti sukarela dan wanprestasi memakai hitungan yang sama:
--     persentase x (DP + cicilan Confirmed). Booking fee dan denda tidak ikut.
--   * Pembatalan yang dicatat Admin langsung berlaku. Pengajuan klien tetap
--     ditinjau Admin.
--   * Denda terbuka ditutup (Closed), tidak dipotong dari pengembalian.
--   * Batas transfer pengembalian 14 hari.
--   * Wanprestasi: peringatan H+30, H+60, H+75; tenggang 14 hari sejak SP3
--     diterima; paling cepat H+90. Keputusan selalu oleh Admin.
--   * Uang muka dibayar klien setelah PPJB ditandai siap diproses.
--
-- Perlu migrasi 202611300022. Aman dijalankan ulang.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 1. Kolom dan tabel
-- ---------------------------------------------------------------------
-- Persentase disimpan per transaksi: perubahan ketentuan tidak mengubah pembelian lama.
alter table public.lot_transactions
  add column if not exists cancellation_refund_percent smallint not null default 50
  check (cancellation_refund_percent between 0 and 100);

alter table public.purchase_cancellation_requests
  add column if not exists source text not null default 'Client',
  add column if not exists channel text,
  add column if not exists request_date date,
  add column if not exists evidence_path text,
  add column if not exists created_by uuid references public.profiles(id) on delete set null,
  add column if not exists recipient_bank text,
  add column if not exists recipient_account_number text,
  add column if not exists recipient_account_name text;

alter table public.purchase_cancellation_requests
  drop constraint if exists purchase_cancellation_requests_status_check;
alter table public.purchase_cancellation_requests
  add constraint purchase_cancellation_requests_status_check
  check (status in ('Pending', 'Approved', 'Rejected', 'Withdrawn'));
alter table public.purchase_cancellation_requests
  drop constraint if exists purchase_cancellation_requests_source_check;
alter table public.purchase_cancellation_requests
  add constraint purchase_cancellation_requests_source_check
  check (source in ('Client', 'Admin', 'Default'));

alter table public.purchase_refunds
  add column if not exists refund_percent smallint not null default 50,
  add column if not exists recipient_bank text,
  add column if not exists recipient_account_number text,
  add column if not exists recipient_account_name text;

alter table public.installment_penalties add column if not exists closed_at timestamptz;
alter table public.installment_penalties drop constraint if exists installment_penalties_status_check;
alter table public.installment_penalties
  add constraint installment_penalties_status_check
  check (status in ('Pending', 'Paid', 'Waived', 'Closed'));

create table if not exists public.default_notices (
  id bigint generated always as identity primary key,
  transaction_id bigint not null references public.lot_transactions(id) on delete restrict,
  installment_schedule_id bigint not null references public.installment_schedules(id) on delete restrict,
  level smallint not null check (level between 1 and 3),
  sent_date date not null,
  delivery_method text not null check (length(btrim(delivery_method)) between 2 and 100),
  received_date date check (received_date is null or received_date >= sent_date),
  note text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (installment_schedule_id, level)
);
create index if not exists default_notices_tx_idx on public.default_notices (transaction_id);

create table if not exists public.default_extensions (
  id bigint generated always as identity primary key,
  transaction_id bigint not null references public.lot_transactions(id) on delete restrict,
  until_date date not null,
  reason text not null check (length(btrim(reason)) between 3 and 1000),
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);
create index if not exists default_extensions_tx_idx on public.default_extensions (transaction_id);

alter table public.default_notices enable row level security;
alter table public.default_extensions enable row level security;
revoke all on public.default_notices, public.default_extensions from anon, authenticated;
grant select on public.default_notices, public.default_extensions to authenticated;
drop policy if exists default_notices_read on public.default_notices;
create policy default_notices_read on public.default_notices for select to authenticated
  using (public.is_finance_admin() or exists (
    select 1 from public.lot_transactions t join public.customers c on c.id = t.customer_id
    where t.id = default_notices.transaction_id and c.user_id = (select auth.uid())));
drop policy if exists default_extensions_read on public.default_extensions;
create policy default_extensions_read on public.default_extensions for select to authenticated
  using (public.is_finance_admin());

-- ---------------------------------------------------------------------
-- 2. Satu hitungan untuk layar klien, layar Admin, dan data pengembalian
-- ---------------------------------------------------------------------
create or replace function public._purchase_cancellation_quote(p_transaction_id bigint)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_tx public.lot_transactions%rowtype;
  v_dp bigint;
  v_installment bigint;
  v_booking bigint;
  v_cash bigint;
  v_pending integer;
  v_paid_off boolean;
  v_refund bigint;
  v_blockers text[] := '{}';
begin
  select * into v_tx from public.lot_transactions where id = p_transaction_id;
  if not found then raise exception 'Transaksi tidak ditemukan.'; end if;

  select
    coalesce(sum(amount) filter (where status = 'Confirmed' and payment_category = 'Down Payment'), 0),
    coalesce(sum(amount) filter (where status = 'Confirmed' and payment_category = 'Installment'), 0),
    coalesce(sum(amount) filter (where status = 'Confirmed' and payment_category = 'Booking'), 0),
    coalesce(sum(amount) filter (where status = 'Confirmed' and payment_category = 'Cash Purchase'), 0),
    count(*) filter (where status in ('Pending', 'Needs Reupload'))
  into v_dp, v_installment, v_booking, v_cash, v_pending
  from public.payments where transaction_id = p_transaction_id;

  v_paid_off := public.is_transaction_paid_off(p_transaction_id);
  v_refund := (v_dp + v_installment) * v_tx.cancellation_refund_percent / 100;

  if v_tx.status = 'Cancelled' then
    v_blockers := v_blockers || 'Transaksi ini sudah dibatalkan.'::text;
  end if;
  if v_paid_off then
    v_blockers := v_blockers || 'Pembelian sudah lunas sehingga tidak dapat dibatalkan lewat aplikasi.'::text;
  end if;
  if v_pending > 0 then
    v_blockers := v_blockers || (v_pending || ' pembayaran belum selesai diverifikasi.');
  end if;
  -- Aturan pengembalian belum mencakup pembayaran tunai sebagian.
  if v_tx.payment_type = 'Cash' and v_cash > 0 and not v_paid_off then
    v_blockers := v_blockers || 'Pembayaran tunai sebagian belum punya aturan pengembalian. Selesaikan secara manual.'::text;
  end if;

  return jsonb_build_object(
    'transaction_id', p_transaction_id,
    'confirmed_down_payment', v_dp,
    'confirmed_installments', v_installment,
    'eligible_total', v_dp + v_installment,
    'refund_percent', v_tx.cancellation_refund_percent,
    'refund_amount', v_refund,
    'withheld_amount', v_dp + v_installment - v_refund,
    'booking_fee_paid', v_booking,
    'pending_payments', v_pending,
    'blockers', to_jsonb(v_blockers)
  );
end;
$$;
revoke all on function public._purchase_cancellation_quote(bigint) from public, anon, authenticated;

create or replace function public.get_purchase_cancellation_quote(p_transaction_id bigint)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_finance_admin() and not exists (
    select 1 from public.lot_transactions t join public.customers c on c.id = t.customer_id
    where t.id = p_transaction_id and c.user_id = auth.uid()
  ) then raise exception 'Transaksi tidak ditemukan pada akun Anda.'; end if;
  return public._purchase_cancellation_quote(p_transaction_id);
end;
$$;
revoke all on function public.get_purchase_cancellation_quote(bigint) from public, anon;
grant execute on function public.get_purchase_cancellation_quote(bigint) to authenticated;

-- ---------------------------------------------------------------------
-- 3. Penyelesaian pembatalan (satu-satunya jalan transaksi menjadi Cancelled
--    dari alur pembatalan). Pemanggil wajib sudah memegang advisory lock.
-- ---------------------------------------------------------------------
create or replace function public._apply_purchase_cancellation(
  p_request_id bigint, p_actor uuid, p_note text, p_expected_refund bigint
) returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_request public.purchase_cancellation_requests%rowtype;
  v_transaction public.lot_transactions%rowtype;
  v_quote jsonb;
  v_amount bigint;
  v_refund_id bigint;
  v_now timestamptz := now();
  v_today date := (now() at time zone 'Asia/Makassar')::date;
begin
  select * into v_request from public.purchase_cancellation_requests where id = p_request_id for update;
  if not found then raise exception 'Pengajuan pembatalan tidak ditemukan.'; end if;
  if v_request.status <> 'Pending' then raise exception 'Pengajuan ini sudah diproses.'; end if;

  select * into v_transaction from public.lot_transactions where id = v_request.transaction_id for update;
  if not found or v_transaction.customer_id <> v_request.customer_id then
    raise exception 'Transaksi pembelian tidak cocok dengan pengajuan.';
  end if;

  v_quote := public._purchase_cancellation_quote(v_transaction.id);
  if jsonb_array_length(v_quote -> 'blockers') > 0 then
    raise exception '%', v_quote -> 'blockers' ->> 0;
  end if;
  v_amount := (v_quote ->> 'refund_amount')::bigint;
  if p_expected_refund is not null and p_expected_refund <> v_amount then
    raise exception 'Nilai pengembalian berubah. Muat ulang rincian lalu periksa kembali.';
  end if;

  update public.purchase_cancellation_requests
     set status = 'Approved', decision_note = p_note, reviewed_by = p_actor, reviewed_at = v_now
   where id = p_request_id;

  -- Trigger yang sudah ada melepas kavling, membatalkan komisi yang belum cair, dan mengirim notifikasi.
  update public.lot_transactions
     set status = 'Cancelled', cancelled_date = v_today,
         cancellation_reason = v_request.reason, updated_at = v_now
   where id = v_transaction.id;

  -- Tanpa ini kavling yang dilepas tidak bisa diajukan lagi (guard_spk_lot_availability).
  update public.spk_requests
     set status = 'Cancelled',
         admin_note = coalesce(nullif(btrim(admin_note), '') || E'\n', '')
           || 'Dibatalkan bersama pembelian (pengajuan #' || p_request_id || ').',
         updated_at = v_now
   where transaction_id = v_transaction.id and status in ('Submitted', 'Under Review', 'Approved');

  update public.installment_penalties ip
     set status = 'Closed', closed_at = v_now
    from public.installment_schedules s
   where s.id = ip.installment_schedule_id and s.transaction_id = v_transaction.id and ip.status = 'Pending';

  update public.default_reviews
     set status = case when v_request.source = 'Default' then 'Confirmed' else 'Cancelled' end,
         cancellation_request_id = p_request_id, reviewed_by = p_actor, reviewed_at = v_now
   where transaction_id = v_transaction.id and status = 'Under Review';

  insert into public.purchase_refunds (
    cancellation_request_id, transaction_id, customer_id, eligible_payment_total, amount,
    refund_percent, status, approved_at, due_date,
    recipient_bank, recipient_account_number, recipient_account_name
  ) values (
    v_request.id, v_transaction.id, v_request.customer_id,
    (v_quote ->> 'eligible_total')::bigint, v_amount, v_transaction.cancellation_refund_percent,
    case when v_amount = 0 then 'Not Applicable' else 'Pending Transfer' end,
    v_now, v_today + 14,
    v_request.recipient_bank, v_request.recipient_account_number, v_request.recipient_account_name
  ) returning id into v_refund_id;

  return v_refund_id;
end;
$$;
revoke all on function public._apply_purchase_cancellation(bigint, uuid, text, bigint) from public, anon, authenticated;

-- Klien mengajukan. Parameter rekening berdefault null agar aplikasi versi lama tetap jalan.
drop function if exists public.request_purchase_cancellation(bigint, text);
create or replace function public.request_purchase_cancellation(
  p_transaction_id bigint, p_reason text,
  p_recipient_bank text default null, p_recipient_account_number text default null,
  p_recipient_account_name text default null
) returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_customer_id bigint;
  v_status text;
  v_request_id bigint;
begin
  if auth.uid() is null then raise exception 'Sesi login tidak ditemukan.'; end if;
  if length(btrim(coalesce(p_reason, ''))) not between 5 and 2000 then
    raise exception 'Alasan pembatalan harus berisi 5 sampai 2000 karakter.';
  end if;

  perform pg_advisory_xact_lock(p_transaction_id);
  select t.customer_id, t.status into v_customer_id, v_status
    from public.lot_transactions t join public.customers c on c.id = t.customer_id
   where t.id = p_transaction_id and c.user_id = auth.uid()
   for update of t;
  if not found then raise exception 'Transaksi tidak ditemukan pada akun Anda.'; end if;
  if v_status = 'Cancelled' then raise exception 'Transaksi ini sudah dibatalkan.'; end if;
  if public.is_transaction_paid_off(p_transaction_id) then
    raise exception 'Pembelian yang sudah lunas tidak dapat dibatalkan lewat aplikasi. Silakan hubungi Admin.';
  end if;
  if exists (select 1 from public.purchase_cancellation_requests
              where transaction_id = p_transaction_id and status = 'Pending') then
    raise exception 'Pengajuan pembatalan transaksi ini masih menunggu pemeriksaan Admin.';
  end if;

  insert into public.purchase_cancellation_requests (
    transaction_id, customer_id, reason, source, request_date, created_by,
    recipient_bank, recipient_account_number, recipient_account_name
  ) values (
    p_transaction_id, v_customer_id, btrim(p_reason), 'Client', (now() at time zone 'Asia/Makassar')::date,
    (select id from public.profiles where id = auth.uid()),
    nullif(btrim(p_recipient_bank), ''), nullif(btrim(p_recipient_account_number), ''),
    nullif(btrim(p_recipient_account_name), '')
  ) returning id into v_request_id;
  return v_request_id;
end;
$$;
revoke all on function public.request_purchase_cancellation(bigint, text, text, text, text) from public, anon;
grant execute on function public.request_purchase_cancellation(bigint, text, text, text, text) to authenticated;

create or replace function public.withdraw_purchase_cancellation(p_request_id bigint)
returns void language plpgsql security definer set search_path = '' as $$
declare v_tx_id bigint;
begin
  select r.transaction_id into v_tx_id
    from public.purchase_cancellation_requests r join public.customers c on c.id = r.customer_id
   where r.id = p_request_id and c.user_id = auth.uid();
  if not found then raise exception 'Pengajuan tidak ditemukan pada akun Anda.'; end if;
  perform pg_advisory_xact_lock(v_tx_id);
  update public.purchase_cancellation_requests set status = 'Withdrawn'
   where id = p_request_id and status = 'Pending';
  if not found then raise exception 'Pengajuan ini sudah diproses Admin.'; end if;
end;
$$;
revoke all on function public.withdraw_purchase_cancellation(bigint) from public, anon;
grant execute on function public.withdraw_purchase_cancellation(bigint) to authenticated;

drop function if exists public.review_purchase_cancellation(bigint, text, text);
create or replace function public.review_purchase_cancellation(
  p_request_id bigint, p_decision text, p_decision_note text, p_expected_refund bigint default null
) returns bigint language plpgsql security definer set search_path = '' as $$
declare v_tx_id bigint;
begin
  if not public.is_finance_admin() then raise exception 'Hanya Admin atau Owner yang dapat meninjau pembatalan.'; end if;
  if p_decision not in ('Approved', 'Rejected') then raise exception 'Keputusan pembatalan tidak valid.'; end if;
  if length(btrim(coalesce(p_decision_note, ''))) < 3 then raise exception 'Catatan keputusan wajib diisi.'; end if;

  select transaction_id into v_tx_id from public.purchase_cancellation_requests where id = p_request_id;
  if not found then raise exception 'Pengajuan pembatalan tidak ditemukan.'; end if;
  perform pg_advisory_xact_lock(v_tx_id);

  if p_decision = 'Rejected' then
    update public.purchase_cancellation_requests
       set status = 'Rejected', decision_note = btrim(p_decision_note), reviewed_by = auth.uid(), reviewed_at = now()
     where id = p_request_id and status = 'Pending';
    if not found then raise exception 'Pengajuan ini sudah diproses.'; end if;
    return null;
  end if;

  return public._apply_purchase_cancellation(p_request_id, auth.uid(), btrim(p_decision_note), p_expected_refund);
end;
$$;
revoke all on function public.review_purchase_cancellation(bigint, text, text, bigint) from public, anon;
grant execute on function public.review_purchase_cancellation(bigint, text, text, bigint) to authenticated;

-- ---------------------------------------------------------------------
-- 4. Wanprestasi: keadaan tunggakan dihitung langsung dari jadwal
-- ---------------------------------------------------------------------
create or replace function public._arrears_state(p_transaction_id bigint)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Makassar')::date;
  v_anchor record;
  v_count integer;
  v_amount bigint;
  v_pending_proof boolean;
  v_extension date;
  v_notices jsonb;
  v_sp3_received date;
  v_levels integer;
  v_earliest date;
  v_hold text;
begin
  select s.id, s.installment_number, s.due_date into v_anchor
    from public.installment_schedules s join public.lot_transactions t on t.id = s.transaction_id
   where s.transaction_id = p_transaction_id and t.status = 'Booking'
     and s.status <> 'Paid' and s.due_date_official and s.due_date < v_today
   order by s.due_date, s.installment_number limit 1;
  if not found then return null; end if;

  select count(*), coalesce(sum(amount), 0) into v_count, v_amount
    from public.installment_schedules
   where transaction_id = p_transaction_id and status <> 'Paid' and due_date_official and due_date < v_today;

  v_pending_proof := exists (
    select 1 from public.payment_allocations pa
    join public.payments p on p.id = pa.payment_id
    join public.installment_schedules s on s.id = pa.installment_schedule_id
    where s.transaction_id = p_transaction_id and s.status <> 'Paid' and s.due_date < v_today
      and p.status in ('Pending', 'Needs Reupload'));

  select max(until_date) into v_extension from public.default_extensions
   where transaction_id = p_transaction_id and until_date >= v_today;

  -- Surat hanya berlaku untuk tunggakan sekarang bila dikirim pada atau setelah H+30/60/75 jadwal tertua.
  with valid as (
    select distinct on (n.level) n.level, n.sent_date, n.received_date, n.delivery_method
      from public.default_notices n
     where n.transaction_id = p_transaction_id
       and n.sent_date >= v_anchor.due_date + (case n.level when 1 then 30 when 2 then 60 else 75 end)
     order by n.level, n.sent_date desc
  )
  select coalesce(jsonb_agg(to_jsonb(valid) order by level), '[]'::jsonb),
         count(*), max(received_date) filter (where level = 3)
    into v_notices, v_levels, v_sp3_received from valid;

  if v_levels = 3 and v_sp3_received is not null then
    v_earliest := greatest(v_anchor.due_date + 90, v_sp3_received + 14);
  end if;

  v_hold := case
    when v_pending_proof then 'Bukti bayar tunggakan menunggu verifikasi.'
    when v_extension is not null then 'Perpanjangan berlaku sampai ' || to_char(v_extension, 'DD-MM-YYYY') || '.'
    when v_today - v_anchor.due_date < 90 then 'Tunggakan belum 90 hari.'
    when v_levels < 3 then 'Surat peringatan belum lengkap.'
    when v_sp3_received is null then 'Tanggal terima surat peringatan 3 belum dicatat.'
    when v_today < v_earliest then 'Tenggang surat peringatan 3 sampai ' || to_char(v_earliest, 'DD-MM-YYYY') || '.'
  end;

  return jsonb_build_object(
    'transaction_id', p_transaction_id,
    'schedule_id', v_anchor.id,
    'installment_number', v_anchor.installment_number,
    'oldest_due_date', v_anchor.due_date,
    'days_overdue', v_today - v_anchor.due_date,
    'overdue_count', v_count,
    'overdue_amount', v_amount,
    'notices', v_notices,
    'extension_until', v_extension,
    'hold_reason', v_hold,
    'eligible', v_hold is null
  );
end;
$$;
revoke all on function public._arrears_state(bigint) from public, anon, authenticated;

create or replace function public.get_arrears_queue()
returns setof jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_finance_admin() then raise exception 'Hanya Admin atau Owner yang dapat melihat tunggakan.'; end if;
  return query
    select a.state || jsonb_build_object(
             'customer_name', c.full_name, 'customer_phone', c.phone, 'lot_number', l.lot_number)
      from public.lot_transactions t
      join public.customers c on c.id = t.customer_id
      left join public.lots l on l.id = t.lot_id
      cross join lateral (select public._arrears_state(t.id) as state) a
     where t.status = 'Booking' and a.state is not null
     order by (a.state ->> 'days_overdue')::integer desc;
end;
$$;
revoke all on function public.get_arrears_queue() from public, anon;
grant execute on function public.get_arrears_queue() to authenticated;

create or replace function public.admin_record_default_notice(
  p_transaction_id bigint, p_level integer, p_sent_date date, p_delivery_method text,
  p_received_date date default null, p_note text default null
) returns void language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Makassar')::date;
  v_state jsonb;
  v_min date;
  v_client uuid;
begin
  if not public.is_finance_admin() then raise exception 'Hanya Admin atau Owner yang dapat mencatat surat peringatan.'; end if;
  if p_level not between 1 and 3 then raise exception 'Tingkat surat peringatan tidak valid.'; end if;
  perform pg_advisory_xact_lock(p_transaction_id);
  v_state := public._arrears_state(p_transaction_id);
  if v_state is null then raise exception 'Transaksi ini tidak sedang menunggak.'; end if;

  v_min := (v_state ->> 'oldest_due_date')::date + (case p_level when 1 then 30 when 2 then 60 else 75 end);
  if p_sent_date is null or p_sent_date > v_today or p_sent_date < v_min then
    raise exception 'Tanggal kirim SP% harus antara % dan hari ini.', p_level, to_char(v_min, 'DD-MM-YYYY');
  end if;
  if p_received_date is not null and (p_received_date < p_sent_date or p_received_date > v_today) then
    raise exception 'Tanggal terima tidak valid.';
  end if;
  if p_level > 1 and not exists (
    select 1 from jsonb_array_elements(v_state -> 'notices') n where (n ->> 'level')::integer = p_level - 1
  ) then raise exception 'Catat surat peringatan % terlebih dahulu.', p_level - 1; end if;

  insert into public.default_notices (
    transaction_id, installment_schedule_id, level, sent_date, delivery_method, received_date, note, created_by
  ) values (
    p_transaction_id, (v_state ->> 'schedule_id')::bigint, p_level, p_sent_date,
    btrim(p_delivery_method), p_received_date, nullif(btrim(p_note), ''), auth.uid()
  )
  on conflict (installment_schedule_id, level) do update
    set sent_date = excluded.sent_date, delivery_method = excluded.delivery_method,
        received_date = excluded.received_date, note = excluded.note, created_by = excluded.created_by;

  select c.user_id into v_client from public.lot_transactions t
    join public.customers c on c.id = t.customer_id where t.id = p_transaction_id;
  perform public._notify(v_client, 'reminder', 'default_notice', 'high', 'Surat peringatan ' || p_level,
    'Cicilan Anda menunggak. Buka halaman Pembayaran atau hubungi Admin.',
    jsonb_build_object('transaction_id', p_transaction_id),
    'default-notice:' || (v_state ->> 'schedule_id') || ':' || p_level, auth.uid());
end;
$$;
revoke all on function public.admin_record_default_notice(bigint, integer, date, text, date, text) from public, anon;
grant execute on function public.admin_record_default_notice(bigint, integer, date, text, date, text) to authenticated;

create or replace function public.admin_grant_default_extension(
  p_transaction_id bigint, p_until_date date, p_reason text
) returns void language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_finance_admin() then raise exception 'Hanya Admin atau Owner yang dapat memberi perpanjangan.'; end if;
  if p_until_date is null or p_until_date <= (now() at time zone 'Asia/Makassar')::date then
    raise exception 'Batas perpanjangan harus setelah hari ini.';
  end if;
  if length(btrim(coalesce(p_reason, ''))) < 3 then raise exception 'Alasan perpanjangan wajib diisi.'; end if;
  if public._arrears_state(p_transaction_id) is null then raise exception 'Transaksi ini tidak sedang menunggak.'; end if;
  insert into public.default_extensions (transaction_id, until_date, reason, created_by)
  values (p_transaction_id, p_until_date, btrim(p_reason), auth.uid());
end;
$$;
revoke all on function public.admin_grant_default_extension(bigint, date, text) from public, anon;
grant execute on function public.admin_grant_default_extension(bigint, date, text) to authenticated;

-- ---------------------------------------------------------------------
-- 5. Pembatalan langsung oleh Admin (klien menyampaikan di luar aplikasi,
--    atau penetapan wanprestasi). Tidak menunggu persetujuan kedua.
-- ---------------------------------------------------------------------
create or replace function public.admin_cancel_purchase(
  p_transaction_id bigint, p_source text, p_channel text, p_request_date date, p_reason text,
  p_evidence_path text, p_recipient_bank text, p_recipient_account_number text,
  p_recipient_account_name text, p_expected_refund bigint
) returns bigint language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Makassar')::date;
  v_tx public.lot_transactions%rowtype;
  v_state jsonb;
  v_request_id bigint;
begin
  if not public.is_finance_admin() then raise exception 'Hanya Admin atau Owner yang dapat membatalkan pembelian.'; end if;
  if p_source not in ('Admin', 'Default') then raise exception 'Jenis pembatalan tidak valid.'; end if;
  if length(btrim(coalesce(p_reason, ''))) not between 5 and 2000 then
    raise exception 'Alasan pembatalan harus berisi 5 sampai 2000 karakter.';
  end if;
  if p_request_date is null or p_request_date > v_today then raise exception 'Tanggal penyampaian tidak valid.'; end if;
  if p_expected_refund is null then raise exception 'Periksa rincian pengembalian terlebih dahulu.'; end if;
  if p_expected_refund > 0 and (nullif(btrim(p_recipient_bank), '') is null
     or nullif(btrim(p_recipient_account_number), '') is null
     or nullif(btrim(p_recipient_account_name), '') is null) then
    raise exception 'Rekening tujuan pengembalian wajib diisi lengkap.';
  end if;
  -- Tanpa persetujuan kedua, surat pernyataan klien adalah satu-satunya bukti.
  if p_source = 'Admin' and nullif(btrim(p_evidence_path), '') is null then
    raise exception 'Surat pernyataan bertanda tangan wajib diunggah.';
  end if;
  if nullif(btrim(p_evidence_path), '') is not null and not exists (
    select 1 from storage.objects o where o.bucket_id = 'payment-proofs' and o.name = p_evidence_path
      and p_evidence_path like 'cancellation/' || p_transaction_id || '/%'
  ) then raise exception 'Berkas bukti tidak ditemukan. Unggah ulang.'; end if;

  perform pg_advisory_xact_lock(p_transaction_id);
  select * into v_tx from public.lot_transactions where id = p_transaction_id for update;
  if not found then raise exception 'Transaksi tidak ditemukan.'; end if;
  if exists (select 1 from public.purchase_cancellation_requests
              where transaction_id = p_transaction_id and status = 'Pending') then
    raise exception 'Klien sudah mengajukan pembatalan. Proses pengajuan tersebut.';
  end if;

  if p_source = 'Default' then
    v_state := public._arrears_state(p_transaction_id);
    if v_state is null then raise exception 'Transaksi ini tidak sedang menunggak.'; end if;
    if not (v_state ->> 'eligible')::boolean then raise exception '%', v_state ->> 'hold_reason'; end if;
    insert into public.default_reviews (transaction_id, installment_schedule_id)
    values (p_transaction_id, (v_state ->> 'schedule_id')::bigint)
    on conflict (installment_schedule_id) do update set status = 'Under Review';
  end if;

  insert into public.purchase_cancellation_requests (
    transaction_id, customer_id, reason, source, channel, request_date, evidence_path, created_by,
    recipient_bank, recipient_account_number, recipient_account_name
  ) values (
    p_transaction_id, v_tx.customer_id, btrim(p_reason), p_source, nullif(btrim(p_channel), ''),
    p_request_date, nullif(btrim(p_evidence_path), ''), auth.uid(),
    nullif(btrim(p_recipient_bank), ''), nullif(btrim(p_recipient_account_number), ''),
    nullif(btrim(p_recipient_account_name), '')
  ) returning id into v_request_id;

  return public._apply_purchase_cancellation(
    v_request_id, auth.uid(),
    case p_source when 'Default' then 'Penetapan wanprestasi.' else 'Dicatat langsung oleh Admin.' end,
    p_expected_refund);
end;
$$;
revoke all on function public.admin_cancel_purchase(bigint, text, text, date, text, text, text, text, text, bigint) from public, anon;
grant execute on function public.admin_cancel_purchase(bigint, text, text, date, text, text, text, text, text, bigint) to authenticated;

-- Notifikasi "klien mengajukan" hanya untuk pengajuan klien.
create or replace function public.trg_notify_cancellation()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_lot text;
  v_name text;
  v_client uuid;
  v_owner uuid;
  v_data jsonb;
  v_actor uuid := (select auth.uid());
  v_title text;
begin
  select l.lot_number into v_lot
  from public.lot_transactions t left join public.lots l on l.id = t.lot_id where t.id = new.transaction_id;
  select c.full_name, c.user_id into v_name, v_client from public.customers c where c.id = new.customer_id;
  v_owner := public.marketing_owner_of_transaction(new.transaction_id);
  v_data := jsonb_build_object('transaction_id', new.transaction_id, 'customer_id', new.customer_id);

  if tg_op = 'INSERT' then
    if new.source = 'Client' then
      perform public._notify_role('admin', 'transaction', 'cancellation_requested', 'high', 'Pengajuan pembatalan transaksi',
        'Kavling ' || coalesce(v_lot, '-') || ' · ' || coalesce(v_name, 'Client'), v_data, 'cancel:' || new.id || ':Pending', v_actor);
      perform public._notify(v_owner, 'transaction', 'cancellation_requested', 'normal', 'Client mengajukan pembatalan',
        'Kavling ' || coalesce(v_lot, '-') || ' · ' || coalesce(v_name, 'Client'), v_data, 'cancel:' || new.id || ':Pending', v_actor);
    end if;
  elsif new.status is distinct from old.status and new.status in ('Approved', 'Rejected') then
    v_title := case
      when new.source = 'Default' then 'Pembelian dibatalkan karena wanprestasi'
      when new.source = 'Admin' then 'Pembelian dibatalkan'
      when new.status = 'Approved' then 'Pembatalan transaksi disetujui'
      else 'Pembatalan transaksi ditolak' end;
    perform public._notify(v_client, 'transaction', 'cancellation_' || lower(new.status), 'high', v_title,
      'Kavling ' || coalesce(v_lot, '-') || coalesce(' · ' || nullif(new.decision_note, ''), ''), v_data, 'cancel:' || new.id || ':' || new.status, v_actor);
    perform public._notify(v_owner, 'transaction', 'cancellation_' || lower(new.status), 'normal', v_title,
      'Kavling ' || coalesce(v_lot, '-') || ' · ' || coalesce(v_name, 'Client'), v_data, 'cancel:' || new.id || ':' || new.status, v_actor);
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 6. Penjaga pembayaran
-- ---------------------------------------------------------------------
create or replace function public.trg_guard_payment_against_cancellation()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  if new.transaction_id is null then return new; end if;
  -- OLD hanya ada saat UPDATE, jadi diperiksa terpisah.
  if tg_op = 'UPDATE' then
    if old.status is not distinct from new.status then return new; end if;
  end if;

  -- Uang tidak boleh masuk hitungan setelah pengembalian ditetapkan.
  if new.status in ('Pending', 'Confirmed') and exists (
    select 1 from public.lot_transactions where id = new.transaction_id and status = 'Cancelled'
  ) then
    raise exception 'Transaksi sudah dibatalkan. Pembayaran tidak dapat dikirim atau dikonfirmasi.';
  end if;

  if tg_op = 'INSERT' then
    if exists (select 1 from public.purchase_cancellation_requests
                where transaction_id = new.transaction_id and status = 'Pending') then
      raise exception 'Pengajuan pembatalan sedang diperiksa. Pembayaran baru ditahan sampai ada keputusan.';
    end if;
    -- Uang muka dibayar pada acara PPJB. Admin tetap bisa mencatatnya.
    if new.payment_category = 'Down Payment' and auth.uid() is not null and not public.is_finance_admin()
       and not exists (
         select 1 from public.spk_requests r join public.spk_process_steps s on s.spk_request_id = r.id
          where r.transaction_id = new.transaction_id and s.step_key = 'ppjb' and s.status in ('ready', 'done'))
    then
      raise exception 'Uang muka dibayar saat PPJB. Pembayaran terbuka setelah Admin menandai PPJB siap diproses.';
    end if;
  end if;
  return new;
end;
$$;
revoke all on function public.trg_guard_payment_against_cancellation() from public, anon, authenticated;
drop trigger if exists trg_guard_payment_against_cancellation on public.payments;
create trigger trg_guard_payment_against_cancellation
  before insert or update of status on public.payments
  for each row execute function public.trg_guard_payment_against_cancellation();

-- ---------------------------------------------------------------------
-- 7. Pengingat tagihan berhenti selama pengajuan pembatalan diperiksa
--    (salinan 202611300022 dengan satu syarat tambahan)
-- ---------------------------------------------------------------------
create or replace function public._generate_installment_reminders(p_client uuid default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Makassar')::date;
  s record;
  a record;
  v_days integer;
  v_body text;
  v_data jsonb;
  v_owner uuid;
begin
  for s in
    select sc.id, sc.installment_number, sc.due_date, sc.amount, l.lot_number,
           t.id as transaction_id, c.id as customer_id, c.user_id as client_uid, c.full_name
    from public.installment_schedules sc
    join public.lot_transactions t on t.id = sc.transaction_id
    join public.customers c on c.id = t.customer_id
    left join public.lots l on l.id = t.lot_id
    where t.status <> 'Cancelled'
      and not exists (select 1 from public.purchase_cancellation_requests pc
                       where pc.transaction_id = t.id and pc.status = 'Pending')
      and sc.status in ('Pending', 'Overdue')
      and sc.due_date_official
      and sc.due_date <= v_today + 7
      and (p_client is null or c.user_id = p_client)
  loop
    v_days := s.due_date - v_today;
    v_data := jsonb_build_object('schedule_id', s.id, 'transaction_id', s.transaction_id, 'customer_id', s.customer_id);
    v_body := 'Cicilan ke-' || s.installment_number || ' · Kavling ' || coalesce(s.lot_number, '-') || ' · ' || public._rupiah(s.amount);

    if v_days < 0 then
      -- Client: ulangi tiap 3 hari selama belum dibayar.
      perform public._notify(s.client_uid, 'reminder', 'installment_overdue', 'high', 'Cicilan terlambat',
        v_body || ' · terlambat ' || (-v_days) || ' hari', v_data,
        'installment-overdue:' || s.id || case when -v_days >= 3 then ':w' || ((-v_days) / 3) else '' end, null);
      if p_client is null then
        v_owner := public.marketing_owner_of_transaction(s.transaction_id);
        perform public._notify(v_owner, 'reminder', 'installment_overdue_client', 'normal', 'Cicilan client terlambat',
          coalesce(s.full_name, 'Client') || ' · ' || v_body || ' · terlambat ' || (-v_days) || ' hari', v_data,
          'installment-overdue:' || s.id, null);
        for a in select id from public.profiles where role = 'admin' loop
          perform public._notify(a.id, 'reminder', 'installment_overdue_client', 'normal', 'Cicilan client terlambat',
            coalesce(s.full_name, 'Client') || ' · ' || v_body || ' · terlambat ' || (-v_days) || ' hari', v_data,
            'installment-overdue:' || s.id, null);
        end loop;
        -- Jadwal surat peringatan: Admin diingatkan sekali per tahap.
        if -v_days in (30, 60, 75, 90) then
          perform public._notify_role('admin', 'reminder', 'default_stage', 'high',
            case when -v_days = 90 then 'Tunggakan 90 hari' else 'Waktunya surat peringatan' end,
            coalesce(s.full_name, 'Client') || ' · ' || v_body || ' · hari ke-' || (-v_days), v_data,
            'default-stage:' || s.id || ':' || (-v_days), null);
        end if;
      end if;
    elsif v_days = 0 then
      perform public._notify(s.client_uid, 'reminder', 'installment_due_today', 'high', 'Cicilan jatuh tempo hari ini',
        v_body, v_data, 'installment-today:' || s.id, null);
    elsif v_days = 1 then
      perform public._notify(s.client_uid, 'reminder', 'installment_due_tomorrow', 'high', 'Cicilan jatuh tempo besok',
        v_body, v_data, 'installment-h1:' || s.id, null);
      if p_client is null then
        perform public._notify(public.marketing_owner_of_transaction(s.transaction_id), 'reminder',
          'installment_due_tomorrow_client', 'normal', 'Cicilan client jatuh tempo besok',
          coalesce(s.full_name, 'Client') || ' · ' || v_body, v_data, 'installment-h1:' || s.id, null);
      end if;
    else
      perform public._notify(s.client_uid, 'reminder', 'installment_due_soon', 'high', 'Cicilan segera jatuh tempo',
        v_body || ' · jatuh tempo ' || to_char(s.due_date, 'DD-MM-YYYY'), v_data, 'installment-due:' || s.id, null);
    end if;
  end loop;
end;
$$;
revoke all on function public._generate_installment_reminders(uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 8. Klien boleh membuka bukti transfer pengembaliannya sendiri
-- ---------------------------------------------------------------------
drop policy if exists "Client read own purchase refund proof" on storage.objects;
create policy "Client read own purchase refund proof" on storage.objects for select to authenticated
  using (bucket_id = 'payment-proofs' and exists (
    select 1 from public.purchase_refunds r join public.customers c on c.id = r.customer_id
     where c.user_id = (select auth.uid()) and r.proof_path = storage.objects.name));

commit;
