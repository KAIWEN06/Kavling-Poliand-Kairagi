-- Aturan:
--   1. Sold berarti terjual dan lunas. Sebelum lunas, status tetap Booking.
--   2. Komisi Marketing cair setelah pembayaran mencapai 50% total tagihan
--      (cicilan sudah termasuk margin; Booking Fee tidak dihitung).
--   3. Skema custom lama kavling 070 (data uji) kembali ke hitungan otomatis.
-- Besaran komisi tidak berubah: Rp500.000 dari Booking Fee bila ada Marketing.
-- Bergantung pada 033 (view dengan kolom total_due). Aman diulang.

begin;

-- ---------------------------------------------------------------------------
-- 1. Sold hanya boleh bila lunas.
-- ---------------------------------------------------------------------------
create or replace function public.guard_sold_requires_settlement()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_due numeric;
  v_paid numeric;
begin
  if new.status <> 'Sold' then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'Sold' then
    return new;
  end if;

  select total_due, total_paid into v_due, v_paid
    from public.v_transaction_payment_summary
   where transaction_id = new.id;

  if coalesce(v_due, 0) <= 0 or v_paid < v_due then
    raise exception
      'Pembayaran belum lunas, status tetap Dipesan. Terverifikasi %, total tagihan %.',
      public._rupiah(coalesce(v_paid, 0)::bigint),
      public._rupiah(coalesce(v_due, 0)::bigint);
  end if;

  return new;
end;
$$;

revoke execute on function public.guard_sold_requires_settlement()
  from public, anon, authenticated;

drop trigger if exists trg_guard_sold_requires_settlement on public.lot_transactions;
create trigger trg_guard_sold_requires_settlement
  before insert or update of status on public.lot_transactions
  for each row execute function public.guard_sold_requires_settlement();

-- ---------------------------------------------------------------------------
-- 2. Dasar 50% komisi memakai total tagihan.
-- ---------------------------------------------------------------------------
create or replace function public.refresh_marketing_commission_eligibility(p_transaction_id bigint)
returns void
language plpgsql
security definer
set search_path to ''
as $function$
declare
  v_status text;
  v_percent numeric;
begin
  if p_transaction_id is null then return; end if;

  select transaction_status,
         case when total_due > 0 then total_paid * 100.0 / total_due else 0 end
    into v_status, v_percent
    from public.v_transaction_payment_summary
   where transaction_id = p_transaction_id;
  if not found then return; end if;

  if v_status = 'Cancelled' then
    update public.marketing_commissions
       set status = 'Cancelled', updated_at = now()
     where transaction_id = p_transaction_id
       and status in ('Pending', 'Eligible', 'Processing');
    return;
  end if;

  update public.marketing_commissions
     set status = 'Eligible', updated_at = now()
   where transaction_id = p_transaction_id
     and status = 'Pending'
     and v_percent >= coalesce(release_threshold_percent, 50);

  update public.marketing_commissions
     set status = 'Pending', updated_at = now()
   where transaction_id = p_transaction_id
     and status = 'Eligible'
     and v_percent < coalesce(release_threshold_percent, 50);
end;
$function$;

select public.refresh_marketing_commission_eligibility(transaction_id)
  from public.marketing_commissions
 where status in ('Pending', 'Eligible');

-- ---------------------------------------------------------------------------
-- 3. Koreksi data: transaksi Sold yang belum lunas kembali ke Booking.
--    Langkah proses yang mensyaratkan pelunasan dibuka lagi agar bisa
--    diselesaikan ulang setelah lunas. File bukti tidak dihapus.
-- ---------------------------------------------------------------------------
create temporary table unsettled_sold on commit drop as
  select t.id as transaction_id, t.lot_id
    from public.lot_transactions t
    join public.v_transaction_payment_summary v on v.transaction_id = t.id
   where t.status = 'Sold'
     and (v.total_due <= 0 or v.total_paid < v.total_due);

update public.lot_transactions t
   set status = 'Booking', sold_date = null
  from unsettled_sold u
 where t.id = u.transaction_id;

-- Trigger sync_lot_status_from_transaction tidak menangani Sold -> Booking.
update public.lots l
   set status = 'Booking', sold_date = null, updated_at = now()
  from unsettled_sold u
 where l.id = u.lot_id;

update public.spk_process_steps s
   set status = 'pending', completed_at = null, completed_by = null, updated_at = now()
  from public.spk_requests r
  join unsettled_sold u on u.transaction_id = r.transaction_id
 where s.spk_request_id = r.id
   and s.status = 'done'
   and (
     s.step_key in ('ajb', 'shm', 'serah_terima')
     or (s.step_key = 'cicilan' and exists (
           select 1 from public.installment_schedules i
            where i.transaction_id = r.transaction_id and i.status <> 'Paid'))
   );

select public._sync_spk_notary_status(r.id)
  from public.spk_requests r
  join unsettled_sold u on u.transaction_id = r.transaction_id;

-- ---------------------------------------------------------------------------
-- 4. Kavling 070: angka custom dari harga lama (data uji).
--    Hanya delapan nilai lama; skema custom yang dibuat kemudian tidak disentuh.
-- ---------------------------------------------------------------------------
update public.lot_installments li
   set is_custom = false, monthly_payment = null
  from public.lots l
 where l.id = li.lot_id
   and l.lot_number = '070'
   and li.is_custom
   and li.monthly_payment in (25368750, 12993750, 8868750, 6806250,
                              6045469, 5149844, 4510112, 4030313);

commit;

-- Verifikasi (jalankan setelah commit):
-- select t.id, t.status, v.total_due, v.total_paid
--   from public.lot_transactions t
--   join public.v_transaction_payment_summary v on v.transaction_id = t.id
--  order by t.id;
-- Harapan: transaksi 24 berstatus Booking; 22 dan 23 tetap Sold.
--
-- select count(*) from public.lot_installments where is_custom;  -- harapan: 0
