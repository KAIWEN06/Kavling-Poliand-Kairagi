-- Pembatalan pembelian ditutup setelah transaksi lunas.
-- Pengajuan baru dan persetujuan ditolak; Admin tetap bisa menolak
-- pengajuan lama yang masih Pending.
--
-- Lunas:
--   Sold      : sertifikat sudah diserahterimakan
--   Tunai     : Cash Purchase terverifikasi >= harga final
--   Cicilan   : semua jadwal Paid dan DP terverifikasi >= DP
-- Aturan ini harus sama dengan isPaidOff di PembayaranClientPage.vue.

create or replace function public.is_transaction_paid_off(p_transaction_id bigint)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce((
    select case
      when t.status = 'Sold' then true
      when t.payment_type = 'Cash' then
        coalesce(t.final_price, 0) > 0
        and (
          select coalesce(sum(p.amount), 0) from public.payments p
          where p.transaction_id = t.id and p.status = 'Confirmed'
            and p.payment_category = 'Cash Purchase'
        ) >= t.final_price
      else
        exists (
          select 1 from public.installment_schedules s where s.transaction_id = t.id
        )
        and not exists (
          select 1 from public.installment_schedules s
          where s.transaction_id = t.id and s.status is distinct from 'Paid'
        )
        and (
          select coalesce(sum(p.amount), 0) from public.payments p
          where p.transaction_id = t.id and p.status = 'Confirmed'
            and p.payment_category = 'Down Payment'
        ) >= coalesce(t.down_payment, 0)
    end
    from public.lot_transactions t
    where t.id = p_transaction_id
  ), false);
$$;

-- Hanya dipakai dari dalam fungsi security definer di bawah.
revoke all on function public.is_transaction_paid_off(bigint) from public, anon, authenticated;

create or replace function public.request_purchase_cancellation(
  p_transaction_id bigint,
  p_reason text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_customer_id bigint;
  v_status text;
  v_request_id bigint;
begin
  if v_user is null then raise exception 'Sesi login tidak ditemukan.'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 5 or length(btrim(p_reason)) > 2000 then
    raise exception 'Alasan pembatalan harus berisi 5 sampai 2000 karakter.';
  end if;

  select t.customer_id, t.status into v_customer_id, v_status
  from public.lot_transactions t
  join public.customers c on c.id = t.customer_id
  where t.id = p_transaction_id and c.user_id = v_user
  for update of t;

  if not found then raise exception 'Transaksi tidak ditemukan pada akun Anda.'; end if;
  if v_status = 'Cancelled' then raise exception 'Transaksi ini sudah dibatalkan.'; end if;
  if public.is_transaction_paid_off(p_transaction_id) then
    raise exception 'Pembelian yang sudah lunas tidak dapat dibatalkan lewat aplikasi. Silakan hubungi Admin.';
  end if;
  if exists (
    select 1 from public.purchase_cancellation_requests r
    where r.transaction_id = p_transaction_id and r.status = 'Pending'
  ) then raise exception 'Pengajuan pembatalan transaksi ini masih menunggu pemeriksaan Admin.'; end if;

  insert into public.purchase_cancellation_requests (transaction_id, customer_id, reason)
  values (p_transaction_id, v_customer_id, btrim(p_reason))
  returning id into v_request_id;
  return v_request_id;
end;
$$;

create or replace function public.review_purchase_cancellation(
  p_request_id bigint,
  p_decision text,
  p_decision_note text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_request public.purchase_cancellation_requests%rowtype;
  v_transaction public.lot_transactions%rowtype;
  v_eligible bigint;
  v_refund_amount bigint;
  v_refund_id bigint;
  v_approved_at timestamptz := now();
  v_due_date date := ((now() at time zone 'Asia/Makassar')::date + 14);
begin
  if v_actor is null or not exists (
    select 1 from public.profiles where id = v_actor and role in ('admin', 'owner')
  ) then raise exception 'Hanya Admin atau Owner yang dapat meninjau pembatalan.'; end if;
  if p_decision not in ('Approved', 'Rejected') then raise exception 'Keputusan pembatalan tidak valid.'; end if;
  if length(btrim(coalesce(p_decision_note, ''))) < 3 then raise exception 'Catatan keputusan wajib diisi.'; end if;

  select * into v_request from public.purchase_cancellation_requests
  where id = p_request_id for update;
  if not found then raise exception 'Pengajuan pembatalan tidak ditemukan.'; end if;
  if v_request.status <> 'Pending' then raise exception 'Pengajuan ini sudah ditinjau.'; end if;

  select * into v_transaction from public.lot_transactions
  where id = v_request.transaction_id for update;
  if not found or v_transaction.customer_id <> v_request.customer_id then
    raise exception 'Transaksi pembelian tidak cocok dengan pengajuan.';
  end if;
  if v_transaction.status = 'Cancelled' then raise exception 'Transaksi ini sudah dibatalkan.'; end if;
  if p_decision = 'Approved' and public.is_transaction_paid_off(v_transaction.id) then
    raise exception 'Transaksi ini sudah lunas sehingga pembatalan tidak dapat disetujui. Tolak pengajuan ini.';
  end if;

  update public.purchase_cancellation_requests
  set status = p_decision,
      decision_note = btrim(p_decision_note),
      reviewed_by = v_actor,
      reviewed_at = v_approved_at
  where id = p_request_id;

  if p_decision = 'Rejected' then return null; end if;

  update public.lot_transactions
  set status = 'Cancelled',
      cancelled_date = (v_approved_at at time zone 'Asia/Makassar')::date,
      cancellation_reason = v_request.reason,
      updated_at = v_approved_at
  where id = v_transaction.id;
  -- Existing sync_lot_status_from_transaction trigger releases the linked lot atomically.

  select coalesce(sum(p.amount), 0)::bigint into v_eligible
  from public.payments p
  where p.transaction_id = v_transaction.id
    and p.status = 'Confirmed'
    and p.payment_category in ('Down Payment', 'Installment');
  v_refund_amount := v_eligible / 2;

  insert into public.purchase_refunds (
    cancellation_request_id, transaction_id, customer_id,
    eligible_payment_total, amount, status, approved_at, due_date
  ) values (
    v_request.id, v_transaction.id, v_request.customer_id,
    v_eligible, v_refund_amount,
    case when v_refund_amount = 0 then 'Not Applicable' else 'Pending Transfer' end,
    v_approved_at, v_due_date
  ) returning id into v_refund_id;

  return v_refund_id;
end;
$$;

revoke all on function public.request_purchase_cancellation(bigint, text) from public, anon;
grant execute on function public.request_purchase_cancellation(bigint, text) to authenticated;
revoke all on function public.review_purchase_cancellation(bigint, text, text) from public, anon;
grant execute on function public.review_purchase_cancellation(bigint, text, text) to authenticated;
