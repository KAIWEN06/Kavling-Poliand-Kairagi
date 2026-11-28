-- Perbaikan 036 untuk Booking Fee yang dipakai ulang.
--
-- 1. Penolakan SPK membuat catatan "Pending Refund". Bila fee itu lalu dipakai
--    untuk SPK pengganti, catatannya harus gugur; bila tidak, pembeli melihat
--    pengembalian yang tidak akan ditransfer.
-- 2. 036 menolak pengembalian selama fee berstatus 'Linked', juga ketika SPK
--    penggantinya sudah ditolak. Yang harus ditolak hanya saat SPK itu berjalan.
--
-- Aman diulang.

begin;

create or replace function public.void_pending_refund_on_fee_reuse()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  -- Hanya catatan yang belum ditransfer; belum ada uang keluar.
  delete from public.booking_fee_refunds
   where payment_id = new.payment_id
     and status = 'Pending Refund';
  return new;
end;
$$;

revoke execute on function public.void_pending_refund_on_fee_reuse()
  from public, anon, authenticated;

drop trigger if exists trg_void_pending_refund_on_fee_reuse on public.spk_booking_fee_reuse;
create trigger trg_void_pending_refund_on_fee_reuse
  after insert or update of reuse_status on public.spk_booking_fee_reuse
  for each row
  when (new.reuse_status = 'Linked')
  execute function public.void_pending_refund_on_fee_reuse();

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

  if exists (
    select 1
      from public.spk_booking_fee_reuse u
      join public.spk_requests s on s.id = u.current_spk_request_id
     where u.payment_id = new.payment_id
       and u.reuse_status = 'Linked'
       and s.status in ('Submitted', 'Under Review', 'Approved')
  ) then
    raise exception 'Booking Fee ini sedang dipakai pada SPK lain, jadi tidak dapat dikembalikan.';
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

commit;
