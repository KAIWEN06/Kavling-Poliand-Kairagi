-- Total tagihan cicilan.
-- Aturan penjualan:
--   pokok         = harga kavling - DP
--   margin        = pokok x margin paket (2,5% per 3 bulan), dibulatkan
--   cicilan/bulan = floor((pokok + margin) / tenor); sisa pembulatan masuk cicilan terakhir
--   total tagihan = DP + pokok + margin
--   Booking Fee di luar DP dan cicilan.
-- Skema custom (cicilan/bulan berbeda dari rumus): total cicilan = cicilan x tenor.
-- Aman diulang. Satu transaksi: bila satu langkah gagal, tidak ada yang berubah.

begin;

-- ---------------------------------------------------------------------------
-- 1. Satu sumber hitungan total cicilan.
-- ---------------------------------------------------------------------------
create or replace function public.spk_installment_total(
  p_principal numeric,
  p_margin_percent numeric,
  p_months integer,
  p_monthly numeric
)
returns numeric
language sql
immutable
set search_path = public, pg_temp
as $$
  select case
    when p_monthly = floor(
           (p_principal + round(p_principal * p_margin_percent / 100)) / p_months)
      then p_principal + round(p_principal * p_margin_percent / 100)
    else p_monthly * p_months
  end;
$$;

-- ---------------------------------------------------------------------------
-- 2. Setiap SPK baru menyimpan margin dan total tagihan, dari jalur mana pun.
-- ---------------------------------------------------------------------------
create or replace function public.trg_spk_fill_totals()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if new.payment_method = 'Installment' then
    if new.margin_percent_snapshot is null then
      select coalesce(p.margin_percent, 0) into new.margin_percent_snapshot
        from public.payment_plans p where p.id = new.payment_plan_id;
    end if;
    new.total_payment_snapshot :=
      coalesce(new.down_payment_snapshot, 0)
      + public.spk_installment_total(
          new.lot_price_snapshot - coalesce(new.down_payment_snapshot, 0),
          new.margin_percent_snapshot, new.months, new.monthly_payment);
  else
    new.total_payment_snapshot := new.lot_price_snapshot;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_spk_fill_totals on public.spk_requests;
create trigger trg_spk_fill_totals
  before insert on public.spk_requests
  for each row execute function public.trg_spk_fill_totals();

-- ---------------------------------------------------------------------------
-- 3. Persetujuan SPK. Berdasarkan definisi aktif; yang berubah hanya
--    langkah 9 (hitungan), 10 (plan_id, margin, total) dan 13 (cicilan akhir).
-- ---------------------------------------------------------------------------
create or replace function public.admin_approve_spk_request(p_request_id bigint)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  caller_role text;
  request_row public.spk_requests%rowtype;
  lot_row public.lots%rowtype;
  booking_required numeric;
  booking_confirmed numeric;
  new_transaction_id bigint;
  schedule_number integer;
  has_other_active_spk boolean;
  v_is_installment boolean;
  v_down_payment numeric;
  v_principal numeric;
  v_margin_percent numeric := 0;
  v_installment_total numeric := 0;
  v_margin_amount numeric := 0;
begin
  -- 1. Validasi hak akses Admin
  select role::text into caller_role
    from public.profiles where id = auth.uid();

  if auth.uid() is null or caller_role is distinct from 'admin' then
    raise exception 'Hanya Admin yang dapat menyetujui SPK';
  end if;

  -- 2. Ambil dan kunci pengajuan SPK
  select * into request_row
    from public.spk_requests where id = p_request_id for update;

  if not found then
    raise exception 'SPK tidak ditemukan';
  end if;

  if request_row.status not in ('Submitted', 'Under Review') then
    raise exception 'SPK sudah tidak dapat disetujui';
  end if;

  if request_row.transaction_id is not null then
    raise exception 'SPK sudah memiliki transaksi';
  end if;

  -- 3. Ambil dan kunci data kavling
  select * into lot_row
    from public.lots where id = request_row.lot_id for update;

  if not found then
    raise exception 'Data kavling tidak ditemukan';
  end if;

  -- 4. Validasi status kavling
  if lot_row.status not in ('Available', 'Booking') then
    raise exception 'Kavling sudah tidak tersedia. Status: %', lot_row.status;
  end if;

  -- 5. Pastikan tidak ada SPK lain yang menggunakan kavling ini
  select exists (
    select 1 from public.spk_requests other_spk
     where other_spk.lot_id = request_row.lot_id
       and other_spk.id <> request_row.id
       and other_spk.status in ('Submitted', 'Under Review', 'Approved')
  ) into has_other_active_spk;

  if has_other_active_spk then
    raise exception
      'Kavling ini sudah terikat dengan pengajuan SPK lain. Persetujuan dibatalkan.';
  end if;

  -- 6. Kunci data pembayaran Booking Fee
  perform 1 from public.payments
   where spk_request_id = request_row.id and payment_category = 'Booking'
     for update;

  -- 7. Booking Fee yang diwajibkan
  booking_required := coalesce(request_row.booking_fee_snapshot, 1000000);

  -- 8. Booking Fee yang sudah terverifikasi
  select coalesce(sum(amount), 0) into booking_confirmed
    from public.payments
   where spk_request_id = request_row.id
     and payment_category = 'Booking'
     and status = 'Confirmed';

  if booking_confirmed < booking_required then
    raise exception
      'Booking Fee terverifikasi belum mencukupi. Dibutuhkan: %, Terverifikasi: %',
      booking_required, booking_confirmed;
  end if;

  -- 9. Validasi dan hitung rincian cicilan
  v_is_installment := request_row.payment_method = 'Installment';
  v_down_payment := coalesce(request_row.down_payment_snapshot, 0);
  v_principal := greatest(request_row.lot_price_snapshot - v_down_payment, 0);

  if v_is_installment then
    if coalesce(request_row.months, 0) <= 0
       or coalesce(request_row.monthly_payment, 0) <= 0 then
      raise exception 'Rincian jadwal cicilan tidak valid';
    end if;

    v_margin_percent := request_row.margin_percent_snapshot;
    if v_margin_percent is null then
      select p.margin_percent into v_margin_percent
        from public.payment_plans p where p.id = request_row.payment_plan_id;
    end if;
    if v_margin_percent is null then
      raise exception 'Margin paket cicilan tidak ditemukan';
    end if;

    v_installment_total := public.spk_installment_total(
      v_principal, v_margin_percent,
      request_row.months, request_row.monthly_payment);
    v_margin_amount := v_installment_total - v_principal;

    if v_margin_amount < 0 then
      raise exception 'Total cicilan lebih kecil daripada pokok';
    end if;
  end if;

  -- 10. Buat transaksi kavling
  --     final_price = harga kavling (tanpa margin), dihitung ulang oleh trigger.
  insert into public.lot_transactions (
    lot_id, customer_id, status, payment_type, price_at_booking, final_price,
    down_payment, booking_fee, principal_amount, margin_amount, margin_percent,
    installment_total, plan_id, monthly_payment, months,
    installment_start_date, booking_date, created_at, updated_at
  )
  values (
    request_row.lot_id, request_row.customer_id, 'Booking',
    request_row.payment_method, request_row.lot_price_snapshot,
    request_row.lot_price_snapshot, v_down_payment, booking_required,
    v_principal, v_margin_amount, v_margin_percent, v_installment_total,
    request_row.payment_plan_id, request_row.monthly_payment, request_row.months,
    case when v_is_installment then current_date end,
    current_date, now(), now()
  )
  returning id into new_transaction_id;

  -- 11. Update status pengajuan SPK
  update public.spk_requests
     set transaction_id = new_transaction_id,
         status = 'Approved',
         approved_at = now(),
         reviewed_by = auth.uid(),
         reviewed_at = coalesce(reviewed_at, now()),
         margin_percent_snapshot =
           case when v_is_installment then v_margin_percent end,
         total_payment_snapshot =
           case when v_is_installment
                then v_down_payment + v_installment_total
                else request_row.lot_price_snapshot end,
         updated_at = now()
   where id = request_row.id;

  -- 12. Hubungkan pembayaran dengan transaksi
  update public.payments
     set transaction_id = new_transaction_id
   where spk_request_id = request_row.id and transaction_id is null;

  -- 13. Buat jadwal cicilan; cicilan terakhir menyerap sisa pembulatan
  if v_is_installment then
    for schedule_number in 1..request_row.months loop
      insert into public.installment_schedules (
        transaction_id, installment_number, due_date, amount,
        status, created_at, updated_at
      )
      values (
        new_transaction_id,
        schedule_number,
        (current_date + make_interval(months => schedule_number))::date,
        case when schedule_number = request_row.months
             then v_installment_total
                  - request_row.monthly_payment * (request_row.months - 1)
             else request_row.monthly_payment end,
        'Pending', now(), now()
      );
    end loop;
  end if;

  -- 14. Pertahankan status kavling sebagai Booking
  update public.lots
     set status = 'Booking',
         customer_id = request_row.customer_id,
         updated_at = now()
   where id = request_row.lot_id;
end;
$function$;

-- ---------------------------------------------------------------------------
-- 4. Koreksi data lama.
-- ---------------------------------------------------------------------------
-- 4a. SPK tanpa total tagihan.
update public.spk_requests s
   set margin_percent_snapshot = case when s.payment_method = 'Installment'
         then coalesce(s.margin_percent_snapshot, p.margin_percent) end,
       total_payment_snapshot = case when s.payment_method = 'Installment'
         then s.down_payment_snapshot + public.spk_installment_total(
                s.lot_price_snapshot - s.down_payment_snapshot,
                coalesce(s.margin_percent_snapshot, p.margin_percent),
                s.months, s.monthly_payment)
         else s.lot_price_snapshot end
  from public.spk_requests s2
  left join public.payment_plans p on p.id = s2.payment_plan_id
 where s2.id = s.id
   and s.total_payment_snapshot is null;

-- 4b. Transaksi cicilan yang total cicilannya masih 0.
update public.lot_transactions t
   set plan_id = s.payment_plan_id,
       margin_percent = s.margin_percent_snapshot,
       installment_total = s.total_payment_snapshot - s.down_payment_snapshot,
       margin_amount =
         s.total_payment_snapshot - s.down_payment_snapshot - t.principal_amount
  from public.spk_requests s
 where s.transaction_id = t.id
   and t.payment_type = 'Installment'
   and t.installment_total = 0
   and s.total_payment_snapshot - s.down_payment_snapshot >= t.principal_amount;

-- 4c. Tambahkan sisa pembulatan ke cicilan terakhir, hanya bila tagihan itu
--     belum dibayar, belum punya alokasi, dan jadwalnya masih rata.
update public.installment_schedules last_s
   set amount = t.installment_total - t.monthly_payment * (t.months - 1)
  from public.lot_transactions t
 where last_s.transaction_id = t.id
   and t.payment_type = 'Installment'
   and last_s.installment_number = t.months
   and last_s.status <> 'Paid'
   and not exists (select 1 from public.payment_allocations a
                    where a.installment_schedule_id = last_s.id)
   and (select count(*) = t.months
           and sum(x.amount) = t.monthly_payment * t.months
          from public.installment_schedules x
         where x.transaction_id = t.id)
   and t.installment_total > t.monthly_payment * t.months;

-- ---------------------------------------------------------------------------
-- 5. View ringkasan.
--    Tagihan : cicilan = DP + total cicilan; cash = harga final.
--    Dibayar : cicilan = Down Payment + Installment; cash = Cash Purchase.
--    Booking Fee tidak dihitung. Sama dengan summarizeTransactionPayments().
--    Kolom lama tetap pada urutannya; total_due ditambahkan di akhir.
-- ---------------------------------------------------------------------------
create or replace view public.v_transaction_payment_summary
with (security_invoker = true)
as
with x as (
  select t.id, t.lot_id, t.customer_id, t.status, t.final_price,
         (case when t.payment_type = 'Installment'
               then coalesce(t.down_payment, 0) + t.installment_total
               else t.final_price end)::numeric as total_due,
         coalesce(sum(p.amount) filter (
           where p.status = 'Confirmed'
             and case when t.payment_type = 'Installment'
                      then p.payment_category in ('Down Payment', 'Installment')
                      else p.payment_category = 'Cash Purchase' end
         ), 0)::numeric as total_paid
    from public.lot_transactions t
    left join public.payments p on p.transaction_id = t.id
   group by t.id
)
select id as transaction_id,
       lot_id,
       customer_id,
       status as transaction_status,
       final_price,
       total_paid,
       greatest(total_due - total_paid, 0) as remaining_balance,
       case when total_paid = 0 then 'Unpaid'
            when total_paid < total_due then 'Partial'
            else 'Paid' end as payment_status,
       total_due
  from x;

commit;

-- Verifikasi (jalankan setelah commit):
-- select t.id, t.down_payment, t.margin_amount, t.installment_total,
--        (select sum(amount) from public.installment_schedules s
--          where s.transaction_id = t.id) as jumlah_jadwal,
--        v.total_due, v.total_paid, v.remaining_balance
--   from public.lot_transactions t
--   join public.v_transaction_payment_summary v on v.transaction_id = t.id
--  where t.payment_type = 'Installment';
--
-- Harapan untuk transaksi 24:
--   margin_amount 5857688, installment_total 64434563,
--   total_due 89538938, total_paid 41213013, remaining_balance 48325925.
-- jumlah_jadwal = 64434563 bila cicilan ke-12 masih belum dibayar.
