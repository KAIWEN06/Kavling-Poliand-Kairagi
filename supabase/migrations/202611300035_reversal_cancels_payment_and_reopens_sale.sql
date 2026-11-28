-- Pembatalan pembayaran (reversal buku kas) membatalkan pembayarannya, dan
-- transaksi yang menjadi belum lunas kembali ke Booking (dipesan).
--
-- Sebelumnya reverse_financial_transaction hanya membuat baris pembalik di buku
-- kas; pembayarannya tetap Confirmed sehingga masih dihitung sebagai terbayar.
--
-- Status baru payments: 'Reversed' (dibatalkan). Bukan 'Rejected', karena
-- 'Rejected' pada Booking Fee otomatis menolak SPK.
--
-- Kavling Sold tanpa transaksi (milik developer atau pihak lain) tidak
-- tersentuh: aturan di sini hanya berjalan lewat perubahan pembayaran.
--
-- Bergantung pada 033 dan 034. Aman diulang.

begin;

-- ---------------------------------------------------------------------------
-- 1. Status 'Reversed'.
-- ---------------------------------------------------------------------------
alter table public.payments drop constraint if exists payments_status_check;
alter table public.payments
  add constraint payments_status_check
  check (status in ('Pending', 'Confirmed', 'Rejected', 'Needs Reupload', 'Reversed'));

-- ---------------------------------------------------------------------------
-- 2. Penjaga pembayaran: 'Reversed' hanya sah bila baris pembaliknya ada di
--    buku kas, dan setelah itu tidak dapat diubah atau dihapus.
--    Aturan disisipkan ke definisi aktif tanpa menulis ulang aturan lain.
-- ---------------------------------------------------------------------------
do $patch$
declare
  v_def text;
  v_anchor constant text := '-- 1. VALIDASI PERUBAHAN PEMBAYARAN CONFIRMED';
  v_rule constant text := $rule$-- 0. PEMBAYARAN DIBATALKAN (REVERSED)
    IF TG_OP = 'DELETE' THEN
        IF OLD.status = 'Reversed' THEN
            RAISE EXCEPTION 'Pembayaran yang dibatalkan tidak boleh dihapus.';
        END IF;
    ELSIF TG_OP = 'INSERT' THEN
        IF NEW.status = 'Reversed' THEN
            RAISE EXCEPTION 'Pembayaran baru tidak boleh langsung berstatus dibatalkan.';
        END IF;
    ELSIF OLD.status = 'Reversed' THEN
        RAISE EXCEPTION 'Pembayaran yang dibatalkan tidak dapat diubah.';
    ELSIF NEW.status = 'Reversed' THEN
        IF OLD.status = 'Confirmed'
           AND NEW.amount IS NOT DISTINCT FROM OLD.amount
           AND NEW.payment_category IS NOT DISTINCT FROM OLD.payment_category
           AND NEW.transaction_id IS NOT DISTINCT FROM OLD.transaction_id
           AND EXISTS (
               SELECT 1
               FROM public.financial_transactions f
               JOIN public.financial_transactions r ON r.reversal_of = f.id
               WHERE f.source_table = 'payments' AND f.source_id = OLD.id
           )
        THEN
            RETURN NEW;
        END IF;
        RAISE EXCEPTION 'Pembayaran hanya dapat dibatalkan lewat reversal buku kas.';
    END IF;

    $rule$;
begin
  select pg_get_functiondef('public.guard_poliland_payment()'::regprocedure)
    into v_def;

  if position('PEMBAYARAN DIBATALKAN (REVERSED)' in v_def) > 0 then
    return;
  end if;
  if position(v_anchor in v_def) = 0 then
    raise exception 'Penanda pada guard_poliland_payment tidak ditemukan.';
  end if;

  execute replace(v_def, v_anchor, v_rule || v_anchor);
end;
$patch$;

-- ---------------------------------------------------------------------------
-- 3. Reversal buku kas membatalkan pembayaran sumbernya.
--    Status cicilan, komisi, dan ringkasan tagihan ikut lewat trigger yang ada.
-- ---------------------------------------------------------------------------
create or replace function public.apply_payment_reversal()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_payment_id bigint;
begin
  select p.id into v_payment_id
    from public.financial_transactions f
    join public.payments p on p.id = f.source_id
   where f.id = new.reversal_of
     and f.source_table = 'payments'
     and p.status = 'Confirmed'
     for update of p;

  if v_payment_id is null then
    return new;
  end if;

  update public.payments set status = 'Reversed' where id = v_payment_id;

  insert into public.payment_status_history
    (payment_id, old_status, new_status, review_note, changed_by)
  values
    (v_payment_id, 'Confirmed', 'Reversed',
     'Dibatalkan lewat reversal buku kas.', auth.uid());

  return new;
end;
$$;

revoke execute on function public.apply_payment_reversal()
  from public, anon, authenticated;

drop trigger if exists trg_apply_payment_reversal on public.financial_transactions;
create trigger trg_apply_payment_reversal
  after insert on public.financial_transactions
  for each row
  when (new.reversal_of is not null)
  execute function public.apply_payment_reversal();

-- ---------------------------------------------------------------------------
-- 4. Setelah pembayaran Confirmed ditarik, transaksi yang menjadi belum lunas
--    kembali dipesan dan langkah yang mensyaratkan pelunasan dibuka lagi.
--    Nama diawali trg_z agar berjalan sesudah status jadwal diperbarui.
-- ---------------------------------------------------------------------------
create or replace function public.reopen_unsettled_transaction()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_lot_id bigint;
  v_status text;
begin
  select t.lot_id, t.status into v_lot_id, v_status
    from public.lot_transactions t
    join public.v_transaction_payment_summary v on v.transaction_id = t.id
   where t.id = old.transaction_id
     and t.status in ('Booking', 'Sold')
     and (v.total_due <= 0 or v.total_paid < v.total_due);

  if not found then
    return new;
  end if;

  if v_status = 'Sold' then
    update public.lot_transactions
       set status = 'Booking', sold_date = null
     where id = old.transaction_id;

    update public.lots
       set status = 'Booking', sold_date = null, updated_at = now()
     where id = v_lot_id;
  end if;

  update public.spk_process_steps s
     set status = 'pending', completed_at = null, completed_by = null, updated_at = now()
    from public.spk_requests r
   where r.transaction_id = old.transaction_id
     and s.spk_request_id = r.id
     and s.status = 'done'
     and (
       s.step_key in ('ajb', 'shm', 'serah_terima')
       or (s.step_key = 'cicilan' and exists (
             select 1 from public.installment_schedules i
              where i.transaction_id = old.transaction_id and i.status <> 'Paid'))
     );

  if found then
    perform public._sync_spk_notary_status(r.id)
       from public.spk_requests r
      where r.transaction_id = old.transaction_id;
  end if;

  return new;
end;
$$;

revoke execute on function public.reopen_unsettled_transaction()
  from public, anon, authenticated;

drop trigger if exists trg_z_reopen_unsettled_transaction on public.payments;
create trigger trg_z_reopen_unsettled_transaction
  after update of status, amount, payment_category, transaction_id on public.payments
  for each row
  when (
    old.status = 'Confirmed'
    and old.transaction_id is not null
    and (new.status, new.amount, new.payment_category, new.transaction_id)
        is distinct from
        (old.status, old.amount, old.payment_category, old.transaction_id)
  )
  execute function public.reopen_unsettled_transaction();

-- ---------------------------------------------------------------------------
-- 5. Reversal yang sudah terlanjur dibuat sebelum migrasi ini (saat ditulis: 0).
-- ---------------------------------------------------------------------------
update public.payments p
   set status = 'Reversed'
  from public.financial_transactions f
  join public.financial_transactions r on r.reversal_of = f.id
 where f.source_table = 'payments'
   and f.source_id = p.id
   and p.status = 'Confirmed';

commit;

-- Uji tanpa menyimpan perubahan (jalankan terpisah setelah commit).
-- Reversal memerlukan login Admin, jadi identitasnya ditiru di dalam
-- transaksi yang dibatalkan.
--
-- begin;
-- select set_config('request.jwt.claims',
--   json_build_object('sub', (select id from public.profiles
--                              where role = 'admin' limit 1),
--                     'role', 'authenticated')::text, true);
-- select public.reverse_financial_transaction(
--   (select f.id from public.financial_transactions f
--      join public.payments p on p.id = f.source_id
--     where f.source_table = 'payments' and p.transaction_id = 22
--       and p.payment_category = 'Cash Purchase' and p.status = 'Confirmed'),
--   'uji reversal');
-- select t.status as transaksi, l.status as kavling, v.total_paid, v.total_due
--   from public.lot_transactions t
--   join public.lots l on l.id = t.lot_id
--   join public.v_transaction_payment_summary v on v.transaction_id = t.id
--  where t.id = 22;   -- harapan: Booking, Booking, 0
-- rollback;
