-- =====================================================================
-- Cicilan pertama mengikuti ada tidaknya DP
--
--   Dengan DP : sebelum/saat PPJB hanya DP. Cicilan 1 jatuh di bulan
--               setelah PPJB.
--   Tanpa DP  : cicilan 1 dibayar sebelum/saat PPJB dan wajib lunas sebelum
--               PPJB ditandai selesai. Cicilan 2 jatuh di bulan setelah PPJB.
--
-- Tanda tangan SPK tetap harus selesai sebelum PPJB (cicilan) atau AJB (tunai);
-- urutan itu sudah dijaga admin_complete_spk_step.
--
-- Jadwal SPK yang PPJB-nya sudah selesai tidak digeser, supaya tidak ada
-- cicilan berjalan yang mendadak dianggap terlambat.
-- Jalankan setelah 202611290001-202611290003. Aman dijalankan ulang.
-- Hak akses fungsi tidak berubah (create or replace mempertahankannya).
-- =====================================================================

create or replace function public.submit_client_payment(
  p_transaction_id bigint, p_payment_category text, p_amount numeric,
  p_payment_method text, p_proof_path text, p_note text default null,
  p_installment_schedule_ids bigint[] default '{}'::bigint[]
) returns bigint
language plpgsql security definer set search_path to 'public' as $function$
declare
  v_customer_id bigint;
  v_spk_request_id bigint;
  v_tx public.lot_transactions%rowtype;
  v_payment_id bigint;
  v_category public.payments.payment_category%type;
  v_pending_status public.payments.status%type;
  v_first_unpaid_number integer;
  v_schedule_id bigint;
  v_schedule_amount numeric;
  v_schedule_status text;
  v_expected_total numeric := 0;
  v_index integer;
  v_count integer;
  v_ppjb_done boolean;
  v_has_dp boolean;
begin
  if auth.uid() is null then raise exception 'Sesi login tidak valid.'; end if;
  if p_amount is null or p_amount <= 0 then raise exception 'Nominal pembayaran harus lebih dari nol.'; end if;
  if nullif(trim(coalesce(p_proof_path, '')), '') is null then raise exception 'Bukti pembayaran wajib diunggah.'; end if;

  select c.id into v_customer_id from public.customers c where c.user_id = auth.uid() limit 1;
  if v_customer_id is null then raise exception 'Data customer untuk akun ini tidak ditemukan.'; end if;

  perform pg_advisory_xact_lock(p_transaction_id);

  select * into v_tx from public.lot_transactions t
   where t.id = p_transaction_id and t.customer_id = v_customer_id and t.status <> 'Cancelled'
   for update;
  if not found then raise exception 'Transaksi tidak ditemukan atau bukan milik akun Anda.'; end if;

  select sr.id into v_spk_request_id from public.spk_requests sr
   where sr.transaction_id = p_transaction_id and sr.customer_id = v_customer_id and sr.status = 'Approved'
   order by sr.id desc limit 1 for update;
  if v_spk_request_id is null then
    raise exception 'Pembayaran hanya dapat dilakukan setelah SPK disetujui.';
  end if;

  v_pending_status := 'Pending';
  select (jsonb_populate_record(null::public.payments,
    jsonb_build_object('payment_category', p_payment_category))).payment_category
  into v_category;

  if v_tx.payment_type = 'Cash' then
    if v_category <> 'Cash Purchase' then raise exception 'Transaksi tunai hanya menerima pembayaran pelunasan.'; end if;
    if coalesce(cardinality(p_installment_schedule_ids), 0) <> 0 then raise exception 'Pembayaran tunai tidak menggunakan jadwal cicilan.'; end if;
    if exists (select 1 from public.payments p where p.transaction_id = p_transaction_id
               and p.payment_category = 'Cash Purchase' and p.status in ('Pending', 'Confirmed')) then
      raise exception 'Pembayaran tunai sudah dikirim atau sudah lunas.';
    end if;
    if p_amount <> coalesce(v_tx.final_price, 0) then raise exception 'Nominal pelunasan harus sama dengan harga final pada SPK.'; end if;

  elsif v_tx.payment_type = 'Installment' then
    if v_category = 'Down Payment' then
      if coalesce(v_tx.down_payment, 0) <= 0 then raise exception 'Transaksi ini menggunakan pure cicilan tanpa DP.'; end if;
      if coalesce(cardinality(p_installment_schedule_ids), 0) <> 0 then raise exception 'Pembayaran DP tidak boleh memiliki alokasi cicilan.'; end if;
      if exists (select 1 from public.payments p where p.transaction_id = p_transaction_id
                 and p.payment_category = 'Down Payment' and p.status = 'Confirmed') then
        raise exception 'DP transaksi ini sudah terverifikasi.';
      end if;
      if exists (select 1 from public.payments p where p.transaction_id = p_transaction_id
                 and p.payment_category = 'Down Payment' and p.status = 'Pending') then
        raise exception 'Pembayaran DP sedang menunggu verifikasi Admin.';
      end if;
      if p_amount <> v_tx.down_payment then raise exception 'Nominal DP harus sama dengan nominal DP pada SPK.'; end if;

    elsif v_category = 'Installment' then
      v_has_dp := coalesce(v_tx.down_payment, 0) > 0;
      v_ppjb_done := exists (select 1 from public.spk_process_steps s
                             where s.spk_request_id = v_spk_request_id and s.step_key = 'ppjb' and s.status = 'done');
      if v_has_dp and not v_ppjb_done then
        raise exception 'Sampai PPJB cukup bayar uang muka. Cicilan dibuka setelah PPJB di notaris selesai.';
      end if;
      if v_has_dp and not exists (
        select 1 from public.payments p where p.transaction_id = p_transaction_id
          and p.payment_category = 'Down Payment' and p.status = 'Confirmed') then
        raise exception 'DP harus terverifikasi terlebih dahulu sebelum membayar cicilan.';
      end if;

      v_count := coalesce(cardinality(p_installment_schedule_ids), 0);
      if v_count < 1 then raise exception 'Pilih minimal satu jadwal cicilan.'; end if;

      select min(s.installment_number) into v_first_unpaid_number
        from public.installment_schedules s where s.transaction_id = p_transaction_id and s.status <> 'Paid';
      if v_first_unpaid_number is null then raise exception 'Semua cicilan sudah lunas.'; end if;
      -- Tanpa DP: sebelum PPJB selesai hanya cicilan pertama.
      if not v_ppjb_done and (v_first_unpaid_number <> 1 or v_count > 1) then
        raise exception 'Sebelum PPJB selesai, hanya cicilan pertama yang bisa dibayar.';
      end if;

      for v_index in 1..v_count loop
        select s.id, s.amount, s.status into v_schedule_id, v_schedule_amount, v_schedule_status
          from public.installment_schedules s
         where s.transaction_id = p_transaction_id and s.installment_number = v_first_unpaid_number + v_index - 1
         for update;
        if not found then raise exception 'Jadwal cicilan tidak lengkap. Pembayaran harus berurutan.'; end if;
        if v_schedule_status = 'Paid' then raise exception 'Cicilan yang dipilih sudah lunas. Pilih urutan cicilan berikutnya.'; end if;
        if v_schedule_id <> p_installment_schedule_ids[v_index] then
          raise exception 'Pilihan cicilan harus berurutan dan tidak boleh melompati nomor cicilan.';
        end if;
        if exists (select 1 from public.payment_allocations pa join public.payments p on p.id = pa.payment_id
                   where pa.installment_schedule_id = v_schedule_id and p.status = 'Pending') then
          raise exception 'Salah satu cicilan sedang menunggu verifikasi pembayaran.';
        end if;
        v_expected_total := v_expected_total + coalesce(v_schedule_amount, 0);
      end loop;

      if p_amount <> v_expected_total then raise exception 'Total pembayaran tidak sesuai dengan jumlah cicilan yang dipilih.'; end if;
    else
      raise exception 'Kategori pembayaran tidak sesuai dengan skema cicilan.';
    end if;
  else
    raise exception 'Metode pembayaran transaksi tidak dikenali.';
  end if;

  insert into public.payments (customer_id, lot_id, transaction_id, spk_request_id, payment_date, amount,
    payment_method, note, status, payment_category, proof_path)
  values (v_customer_id, v_tx.lot_id, p_transaction_id, v_spk_request_id, current_date, p_amount,
    coalesce(nullif(trim(p_payment_method), ''), 'Transfer Bank'), nullif(trim(coalesce(p_note, '')), ''),
    v_pending_status, v_category, p_proof_path)
  returning id into v_payment_id;

  if v_category = 'Installment' then
    for v_index in 1..cardinality(p_installment_schedule_ids) loop
      select s.amount into v_schedule_amount from public.installment_schedules s
       where s.id = p_installment_schedule_ids[v_index] and s.transaction_id = p_transaction_id;
      insert into public.payment_allocations (payment_id, installment_schedule_id, allocated_amount)
      values (v_payment_id, p_installment_schedule_ids[v_index], v_schedule_amount);
    end loop;
  end if;

  return v_payment_id;
end;
$function$;

create or replace function public.admin_complete_spk_step(
  p_step_id bigint, p_note text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_step public.spk_process_steps%rowtype;
  v_spk public.spk_requests%rowtype;
  v_tx public.lot_transactions%rowtype;
  v_prev_open integer;
  v_paid bigint;
  v_unpaid integer;
  v_remaining integer;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Hanya Admin yang dapat menyelesaikan langkah proses';
  end if;
  select * into v_step from public.spk_process_steps where id = p_step_id for update;
  if not found then raise exception 'Langkah proses tidak ditemukan'; end if;
  if v_step.status = 'done' then raise exception 'Langkah ini sudah selesai'; end if;
  if v_step.step_key = 'cicilan' then
    raise exception 'Langkah cicilan selesai otomatis saat cicilan terakhir lunas';
  end if;

  select * into v_spk from public.spk_requests where id = v_step.spk_request_id;
  select * into v_tx from public.lot_transactions where id = v_spk.transaction_id for update;
  if v_tx.id is null or v_tx.status = 'Cancelled' then
    raise exception 'Transaksi SPK tidak aktif';
  end if;

  select count(*) into v_prev_open from public.spk_process_steps
   where spk_request_id = v_step.spk_request_id and position < v_step.position and status <> 'done';
  if v_prev_open > 0 then
    raise exception 'Selesaikan langkah sebelumnya terlebih dahulu';
  end if;

  -- Syarat pembayaran
  if v_step.step_key = 'ajb' and v_spk.payment_method = 'Cash' then
    select coalesce(sum(amount), 0) into v_paid from public.payments
     where transaction_id = v_tx.id and status = 'Confirmed' and payment_category = 'Cash Purchase';
    if v_paid < v_tx.final_price then
      raise exception 'Harga kavling belum lunas. Terverifikasi %, dibutuhkan %',
        public._rupiah(v_paid), public._rupiah(v_tx.final_price);
    end if;
  elsif v_step.step_key = 'ppjb' and coalesce(v_tx.down_payment, 0) > 0 then
    select coalesce(sum(amount), 0) into v_paid from public.payments
     where transaction_id = v_tx.id and status = 'Confirmed' and payment_category = 'Down Payment';
    if v_paid < v_tx.down_payment then
      raise exception 'DP belum lunas. Terverifikasi %, dibutuhkan %',
        public._rupiah(v_paid), public._rupiah(v_tx.down_payment);
    end if;
  elsif v_step.step_key = 'ppjb' then
    -- Tanpa DP: cicilan pertama harus lunas sebelum atau saat PPJB.
    if not exists (select 1 from public.installment_schedules
                    where transaction_id = v_tx.id and installment_number = 1 and status = 'Paid') then
      raise exception 'Cicilan pertama belum lunas. Verifikasi pembayarannya sebelum menandai PPJB selesai.';
    end if;
  elsif v_step.step_key = 'ajb' and v_spk.payment_method = 'Installment' then
    select count(*) into v_unpaid from public.installment_schedules
     where transaction_id = v_tx.id and status <> 'Paid';
    if v_unpaid > 0 then
      raise exception 'Masih ada % cicilan yang belum lunas', v_unpaid;
    end if;
  end if;

  update public.spk_process_steps
     set status = 'done', completed_at = now(), completed_by = auth.uid(),
         note = coalesce(nullif(btrim(p_note), ''), note), updated_at = now()
   where id = p_step_id;

  -- Setelah serah terima sertifikat, kavling resmi Terjual.
  if v_step.step_key = 'serah_terima' then
    update public.lot_transactions
       set status = 'Sold', sold_date = coalesce(sold_date, current_date), updated_at = now()
     where id = v_tx.id and status <> 'Sold';
    update public.lots
       set status = 'Sold', customer_id = v_tx.customer_id, sold_date = coalesce(sold_date, current_date),
           updated_at = now()
     where id = v_tx.lot_id;
  end if;

  perform public._sync_spk_notary_status(v_step.spk_request_id);

  select count(*) into v_remaining from public.spk_process_steps
   where spk_request_id = v_step.spk_request_id and status <> 'done';

  perform public._notify_spk_parties(v_step.spk_request_id,
    case when v_remaining = 0 then 'spk_process_done' else 'spk_step_done' end,
    case when v_remaining = 0 then 'high' else 'normal' end,
    case when v_remaining = 0 then 'Proses selesai, kavling terjual' else 'Satu langkah sudah selesai' end,
    case when v_remaining = 0 then 'Sertifikat sudah diserahterimakan'
         else public._spk_step_title(v_step.step_key) end,
    'spkstep-done:' || p_step_id);
end;
$$;

create or replace function public.trg_spk_ppjb_shift_schedules()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_tx_id bigint;
  v_base date := (now() at time zone 'Asia/Makassar')::date;
  v_offset integer;
begin
  if new.step_key <> 'ppjb' or new.status <> 'done' or old.status = 'done' then
    return new;
  end if;

  select transaction_id into v_tx_id from public.spk_requests where id = new.spk_request_id;
  if v_tx_id is null then return new; end if;

  -- Dengan DP, cicilan ke-n = PPJB + n bulan.
  -- Tanpa DP, cicilan pertama milik hari PPJB: cicilan ke-n = PPJB + (n - 1) bulan.
  select case when coalesce(down_payment, 0) > 0 then 0 else 1 end
    into v_offset from public.lot_transactions where id = v_tx_id;
  if v_offset is null then return new; end if;

  -- Cicilan pertama tanpa DP sudah lunas saat ini, tetapi tanggalnya ikut disamakan
  -- agar tidak berada di tanggal yang sama atau sesudah cicilan kedua.
  update public.installment_schedules
     set due_date = (v_base + make_interval(months => installment_number - v_offset))::date,
         updated_at = now()
   where transaction_id = v_tx_id
     and (status <> 'Paid' or (v_offset = 1 and installment_number = 1));

  update public.lot_transactions
     set installment_start_date = (v_base + make_interval(months => 1 - v_offset))::date, updated_at = now()
   where id = v_tx_id;

  return new;
end;
$$;
