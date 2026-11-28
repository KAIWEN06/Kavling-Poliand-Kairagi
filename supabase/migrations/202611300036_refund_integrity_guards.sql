-- Aturan agar uang tidak tercatat keluar dua kali, Booking Fee tidak
-- dinikmati dua kali, dan pembeli selalu bisa membuka bukti pengembalian.
--
-- Pembagian alur:
--   uang tidak pernah masuk / tercatat ganda  -> reversal buku kas
--   uang masuk lalu dikirim balik             -> pengembalian dengan bukti
-- Kavling dibuka lagi oleh alur yang sudah ada: pembatalan pembelian
-- (transaksi Cancelled) dan penolakan SPK. Skrip ini tidak mengubahnya.
-- Besaran pengembalian juga tidak diubah.
-- Bergantung pada 035. Aman diulang.

begin;

-- ---------------------------------------------------------------------------
-- 1. Reversal ditolak bila pembayarannya sudah masuk alur pengembalian.
-- ---------------------------------------------------------------------------
create or replace function public.guard_reversal_against_refund()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment_id bigint;
  v_tx_id bigint;
begin
  select p.id, p.transaction_id into v_payment_id, v_tx_id
    from public.financial_transactions f
    join public.payments p on p.id = f.source_id
   where f.id = new.reversal_of
     and f.source_table = 'payments';

  if v_payment_id is null then
    return new;
  end if;

  if exists (select 1 from public.booking_fee_refunds r where r.payment_id = v_payment_id) then
    raise exception 'Booking Fee ini sudah masuk alur pengembalian dana. Catat transfernya lewat pengembalian, bukan pembatalan pembayaran.';
  end if;

  if v_tx_id is not null and (
       exists (select 1 from public.lot_transactions t
                where t.id = v_tx_id and t.status = 'Cancelled')
    or exists (select 1 from public.purchase_refunds r where r.transaction_id = v_tx_id)
    or exists (select 1 from public.purchase_cancellation_requests q
                where q.transaction_id = v_tx_id and q.status in ('Pending', 'Approved'))
  ) then
    raise exception 'Pembelian ini sedang atau sudah dibatalkan. Pembayarannya tidak dapat dibalik; gunakan alur pengembalian dana.';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_reversal_against_refund()
  from public, anon, authenticated;

drop trigger if exists trg_guard_reversal_against_refund on public.financial_transactions;
create trigger trg_guard_reversal_against_refund
  before insert on public.financial_transactions
  for each row
  when (new.reversal_of is not null)
  execute function public.guard_reversal_against_refund();

-- ---------------------------------------------------------------------------
-- 2. Booking Fee baru boleh dikembalikan bila SPK-nya tidak lagi berjalan,
--    fee itu tidak dipakai SPK lain, dan buktinya bisa dibuka pembeli.
--    Tanpa syarat pertama, uang bisa keluar sementara kavling tetap ditahan.
-- ---------------------------------------------------------------------------
create or replace function public.guard_booking_fee_refund_payout()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'UPDATE' and old.status = 'Refunded' then
    if new.status is distinct from 'Refunded'
       or new.proof_path is distinct from old.proof_path
       or new.amount is distinct from old.amount then
      raise exception 'Pengembalian yang sudah ditransfer tidak dapat diubah.';
    end if;
    return new;
  end if;

  if new.status <> 'Refunded' then
    return new;
  end if;

  if not exists (
    select 1 from public.spk_requests s
     where s.id = new.spk_request_id
       and s.status = 'Rejected'
       and not exists (select 1 from public.lot_transactions t
                        where t.id = s.transaction_id and t.status <> 'Cancelled')
  ) then
    raise exception 'Booking Fee hanya dapat dikembalikan setelah SPK ditolak dan tidak ada pembelian yang masih berjalan.';
  end if;

  if exists (select 1 from public.spk_booking_fee_reuse u
              where u.payment_id = new.payment_id and u.reuse_status = 'Linked') then
    raise exception 'Booking Fee ini sudah dipakai pada SPK lain, jadi tidak dapat dikembalikan.';
  end if;

  -- Policy storage pembeli membaca folder refund/<id SPK>/.
  if new.proof_path is null
     or new.proof_path not like 'refund/' || new.spk_request_id || '/%'
     or not exists (select 1 from storage.objects o
                     where o.bucket_id = 'payment-proofs' and o.name = new.proof_path) then
    raise exception 'Bukti pengembalian tidak ditemukan. Unggah ulang agar pembeli dapat membukanya.';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_booking_fee_refund_payout()
  from public, anon, authenticated;

drop trigger if exists trg_guard_booking_fee_refund_payout on public.booking_fee_refunds;
create trigger trg_guard_booking_fee_refund_payout
  before insert or update on public.booking_fee_refunds
  for each row execute function public.guard_booking_fee_refund_payout();

-- ---------------------------------------------------------------------------
-- 3. Booking Fee yang sudah dikembalikan atau dibalik tidak dapat dipakai lagi.
-- ---------------------------------------------------------------------------
create or replace function public.guard_booking_fee_reuse_after_refund()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if new.reuse_status = 'Linked' and (
       exists (select 1 from public.booking_fee_refunds r
                where r.payment_id = new.payment_id and r.status = 'Refunded')
    or exists (select 1 from public.payments p
                where p.id = new.payment_id and p.status = 'Reversed')
  ) then
    raise exception 'Booking Fee ini sudah dikembalikan atau dibatalkan, jadi tidak dapat dipakai untuk SPK lain.';
  end if;
  return new;
end;
$$;

revoke execute on function public.guard_booking_fee_reuse_after_refund()
  from public, anon, authenticated;

drop trigger if exists trg_guard_booking_fee_reuse_after_refund on public.spk_booking_fee_reuse;
create trigger trg_guard_booking_fee_reuse_after_refund
  before insert or update on public.spk_booking_fee_reuse
  for each row execute function public.guard_booking_fee_reuse_after_refund();

-- ---------------------------------------------------------------------------
-- 4. Pengembalian pembelian baru tercatat lunas bila file buktinya ada,
--    dan setelah itu tidak dapat diubah.
-- ---------------------------------------------------------------------------
create or replace function public.guard_purchase_refund_proof()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if old.status = 'Paid' then
    if new.status is distinct from 'Paid'
       or new.proof_path is distinct from old.proof_path
       or new.amount is distinct from old.amount then
      raise exception 'Pengembalian yang sudah ditransfer tidak dapat diubah.';
    end if;
    return new;
  end if;

  if new.status = 'Paid' and not exists (
    select 1 from storage.objects o
     where o.bucket_id = 'payment-proofs' and o.name = new.proof_path
  ) then
    raise exception 'Bukti transfer pengembalian tidak ditemukan. Unggah ulang agar pembeli dapat membukanya.';
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_purchase_refund_proof()
  from public, anon, authenticated;

drop trigger if exists trg_guard_purchase_refund_proof on public.purchase_refunds;
create trigger trg_guard_purchase_refund_proof
  before update on public.purchase_refunds
  for each row execute function public.guard_purchase_refund_proof();

commit;

-- Pemeriksaan (hanya membaca, jalankan setelah commit). Harapan: 0 baris.
-- Pengembalian yang tercatat sekaligus dibalik, atau fee yang dikembalikan
-- sekaligus dipakai SPK lain.
-- select r.payment_id from public.booking_fee_refunds r
--   join public.payments p on p.id = r.payment_id
--  where p.status = 'Reversed'
--     or (r.status = 'Refunded' and exists (
--           select 1 from public.spk_booking_fee_reuse u
--            where u.payment_id = r.payment_id and u.reuse_status = 'Linked'));
