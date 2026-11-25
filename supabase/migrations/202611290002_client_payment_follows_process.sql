-- =====================================================================
-- Pembayaran client mengikuti langkah proses SPK
--
-- Sebelumnya pembayaran baru boleh dikirim setelah notary_status = 'Selesai'.
-- Prosedur baru membutuhkan pembayaran sebelum proses selesai:
--   Tunai    : boleh dibayar setelah SPK disetujui (lunas sebelum/saat AJB).
--   Cicilan  : DP boleh dibayar setelah SPK disetujui; cicilan baru boleh
--              dibayar setelah langkah PPJB selesai.
-- Selain syarat itu, isi fungsi sama dengan versi sebelumnya.
-- Jalankan setelah 202611290001_spk_process_timeline.sql.
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
      if not exists (select 1 from public.spk_process_steps s
                     where s.spk_request_id = v_spk_request_id and s.step_key = 'ppjb' and s.status = 'done') then
        raise exception 'Cicilan bisa dibayar setelah PPJB di notaris selesai. Admin akan memberi tahu Anda.';
      end if;
      if coalesce(v_tx.down_payment, 0) > 0 and not exists (
        select 1 from public.payments p where p.transaction_id = p_transaction_id
          and p.payment_category = 'Down Payment' and p.status = 'Confirmed') then
        raise exception 'DP harus terverifikasi terlebih dahulu sebelum membayar cicilan.';
      end if;

      v_count := coalesce(cardinality(p_installment_schedule_ids), 0);
      if v_count < 1 then raise exception 'Pilih minimal satu jadwal cicilan.'; end if;

      select min(s.installment_number) into v_first_unpaid_number
        from public.installment_schedules s where s.transaction_id = p_transaction_id and s.status <> 'Paid';
      if v_first_unpaid_number is null then raise exception 'Semua cicilan sudah lunas.'; end if;

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
