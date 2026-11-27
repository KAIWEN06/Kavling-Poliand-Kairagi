-- =====================================================================
-- Tanggal cicilan baru resmi setelah PPJB
--
-- Jadwal cicilan dibuat saat SPK disetujui, tetapi tanggalnya masih
-- sementara sampai PPJB selesai. Selama itu jadwal tidak boleh dianggap
-- jatuh tempo: tanpa pengingat, status Terlambat, denda, tinjauan
-- wanprestasi, atau hitungan terlambat di laporan marketing.
--
-- Pencatatan pembayaran oleh Admin juga mengikuti aturan pembayaran klien.
--
-- Jalankan setelah 202611300021. Aman dijalankan ulang. Terapkan sebelum
-- merilis aplikasi, karena aplikasi membaca kolom due_date_official.
-- =====================================================================

alter table public.installment_schedules
  add column if not exists due_date_official boolean not null default true;

comment on column public.installment_schedules.due_date_official is
  'false selama PPJB belum selesai: due_date masih sementara.';

create or replace function public._installment_dates_official(p_transaction_id bigint)
returns boolean
language sql stable security definer set search_path = '' as $$
  select not exists (
    select 1
      from public.spk_requests r
      join public.spk_process_steps s on s.spk_request_id = r.id
     where r.transaction_id = p_transaction_id
       and r.status = 'Approved'
       and s.step_key = 'ppjb'
       and s.status <> 'done'
  );
$$;
revoke all on function public._installment_dates_official(bigint) from public, anon, authenticated;

-- Langkah proses dibuat lebih dulu daripada jadwal saat SPK disetujui.
create or replace function public.trg_installment_schedule_date_official()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  new.due_date_official := public._installment_dates_official(new.transaction_id);
  return new;
end;
$$;
revoke all on function public.trg_installment_schedule_date_official() from public, anon, authenticated;

drop trigger if exists trg_installment_schedule_date_official on public.installment_schedules;
create trigger trg_installment_schedule_date_official
  before insert on public.installment_schedules
  for each row execute function public.trg_installment_schedule_date_official();

-- Jadwal yang sudah ada dan masih menunggu PPJB.
update public.installment_schedules
   set due_date_official = false,
       status = case when status = 'Overdue' then 'Pending' else status end,
       updated_at = now()
 where due_date_official and not public._installment_dates_official(transaction_id);

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

  -- Mulai saat ini seluruh tanggal jadwal resmi.
  update public.installment_schedules
     set due_date_official = true, updated_at = now()
   where transaction_id = v_tx_id and not due_date_official;

  update public.lot_transactions
     set installment_start_date = (v_base + make_interval(months => 1 - v_offset))::date, updated_at = now()
   where id = v_tx_id;

  return new;
end;
$$;

create or replace function public.sync_installment_schedule_status(p_schedule_id bigint)
returns void
language plpgsql security definer set search_path = 'public' as $function$
declare
  v_amount bigint;
  v_due_date date;
  v_official boolean;
  v_confirmed_total bigint;
  v_next_status text;
begin
  select amount, due_date, due_date_official
    into v_amount, v_due_date, v_official
  from public.installment_schedules
  where id = p_schedule_id;

  if not found then return; end if;

  select coalesce(sum(pa.allocated_amount), 0)
    into v_confirmed_total
  from public.payment_allocations pa
  join public.payments p on p.id = pa.payment_id
  where pa.installment_schedule_id = p_schedule_id
    and p.status = 'Confirmed';

  if v_confirmed_total >= v_amount then
    v_next_status := 'Paid';
  elsif v_official and v_due_date < current_date then
    v_next_status := 'Overdue';
  else
    v_next_status := 'Pending';
  end if;

  update public.installment_schedules
  set status = v_next_status, updated_at = now()
  where id = p_schedule_id;
end;
$function$;

create or replace function public.create_admin_payment_with_allocations(
  p_customer_id bigint,
  p_lot_id bigint,
  p_transaction_id bigint,
  p_payment_date date,
  p_amount bigint,
  p_payment_method text,
  p_payment_category text,
  p_reference_number text,
  p_proof_path text,
  p_note text,
  p_allocations jsonb default '[]'::jsonb
)
returns public.payments
language plpgsql
security definer
set search_path = public
as $$
declare
  v_admin_id uuid := auth.uid();
  v_transaction public.lot_transactions%rowtype;
  v_payment public.payments%rowtype;
  v_payment_category text;
  v_allocation jsonb;
  v_schedule public.installment_schedules%rowtype;
  v_expected_total bigint := 0;
  v_index integer := 0;
  v_before_ppjb boolean;
begin
  if v_admin_id is null or not exists (
    select 1 from public.profiles
    where id = v_admin_id and role in ('admin', 'owner')
  ) then
    raise exception 'Hanya Admin atau Owner yang dapat membuat pembayaran manual.';
  end if;

  select * into v_transaction
  from public.lot_transactions
  where id = p_transaction_id
    and customer_id = p_customer_id
    and lot_id = p_lot_id
  for update;

  if not found or v_transaction.status = 'Cancelled' then
    raise exception 'Transaksi tidak valid untuk pembayaran.';
  end if;

  if p_amount is null or p_amount <= 0 then
    raise exception 'Nominal pembayaran harus lebih dari nol.';
  end if;

  if nullif(btrim(coalesce(p_proof_path, '')), '') is null then
    raise exception 'Bukti pembayaran wajib tersedia.';
  end if;

  v_payment_category := p_payment_category;

  if v_transaction.payment_type = 'Cash' then
    if v_payment_category <> 'Cash Purchase' then
      raise exception 'Transaksi tunai hanya menerima pembayaran pelunasan.';
    end if;

    if coalesce(jsonb_array_length(p_allocations), 0) <> 0 then
      raise exception 'Pembayaran tunai tidak memiliki alokasi cicilan.';
    end if;

    if exists (
      select 1 from public.payments
      where transaction_id = p_transaction_id
        and payment_category = 'Cash Purchase'
        and status in ('Pending', 'Confirmed')
    ) then
      raise exception 'Pembayaran tunai sudah dikirim atau sudah lunas.';
    end if;

    if p_amount <> v_transaction.final_price then
      raise exception 'Nominal pelunasan harus sama dengan harga final SPK.';
    end if;
  elsif v_transaction.payment_type = 'Installment' then
    if v_payment_category <> 'Installment' then
      raise exception 'Pembayaran manual cicilan harus berkategori Installment.';
    end if;

    if coalesce(v_transaction.down_payment, 0) > 0 and not exists (
      select 1 from public.payments
      where transaction_id = p_transaction_id
        and payment_category = 'Down Payment'
        and status = 'Confirmed'
    ) then
      raise exception 'DP harus dikonfirmasi sebelum cicilan dapat dibayar.';
    end if;

    if coalesce(jsonb_array_length(p_allocations), 0) < 1 then
      raise exception 'Minimal satu jadwal cicilan harus dialokasikan.';
    end if;

    -- Sama dengan submit_client_payment: sebelum PPJB selesai, pembelian ber-DP
    -- belum menerima cicilan, dan tanpa DP hanya cicilan pertama.
    v_before_ppjb := not public._installment_dates_official(p_transaction_id);
    if v_before_ppjb and coalesce(v_transaction.down_payment, 0) > 0 then
      raise exception 'Sampai PPJB cukup uang muka. Cicilan dibuka setelah PPJB di notaris selesai.';
    end if;
    if v_before_ppjb and (
      jsonb_array_length(p_allocations) <> 1 or not exists (
        select 1 from public.installment_schedules s
        where s.id = (p_allocations->0->>'installment_schedule_id')::bigint
          and s.transaction_id = p_transaction_id
          and s.installment_number = 1)
    ) then
      raise exception 'Sebelum PPJB selesai, hanya cicilan pertama yang bisa dibayar.';
    end if;

    for v_allocation in select value from jsonb_array_elements(p_allocations)
    loop
      v_index := v_index + 1;

      select * into v_schedule
      from public.installment_schedules
      where id = (v_allocation->>'installment_schedule_id')::bigint
        and transaction_id = p_transaction_id
      for update;

      if not found then
        raise exception 'Jadwal cicilan tidak sesuai dengan transaksi.';
      end if;

      if v_schedule.status = 'Paid' then
        raise exception 'Cicilan yang dipilih sudah lunas.';
      end if;

      if v_schedule.installment_number <>
         (
           select min(s.installment_number)
           from public.installment_schedules s
           where s.transaction_id = p_transaction_id
             and s.status <> 'Paid'
         ) + v_index - 1
      then
        raise exception 'Jadwal cicilan harus dipilih secara berurutan.';
      end if;

      if exists (
        select 1
        from public.payment_allocations pa
        join public.payments p on p.id = pa.payment_id
        where pa.installment_schedule_id = v_schedule.id
          and p.status in ('Pending', 'Needs Reupload', 'Confirmed')
      ) then
        raise exception 'Cicilan sudah memiliki pengajuan aktif atau terkonfirmasi.';
      end if;

      v_expected_total := v_expected_total + v_schedule.amount;
    end loop;

    if p_amount <> v_expected_total then
      raise exception 'Nominal pembayaran tidak sama dengan total alokasi cicilan.';
    end if;
  else
    raise exception 'Metode pembayaran transaksi tidak dikenali.';
  end if;

  insert into public.payments (
    customer_id, lot_id, transaction_id, payment_date, amount,
    payment_method, payment_category, reference_number, proof_path,
    note, status, verified_at, verified_by
  ) values (
    p_customer_id, p_lot_id, p_transaction_id, coalesce(p_payment_date, current_date),
    p_amount, p_payment_method, v_payment_category, p_reference_number,
    p_proof_path, p_note, 'Pending', null, null
  )
  returning * into v_payment;

  if v_payment_category = 'Installment' then
    for v_allocation in select value from jsonb_array_elements(p_allocations)
    loop
      select * into v_schedule
      from public.installment_schedules
      where id = (v_allocation->>'installment_schedule_id')::bigint
        and transaction_id = p_transaction_id;

      insert into public.payment_allocations (
        payment_id, installment_schedule_id, allocated_amount
      ) values (
        v_payment.id, v_schedule.id, v_schedule.amount
      );
    end loop;
  end if;

  insert into public.payment_proof_history (
    payment_id, previous_proof_path, proof_path, file_name,
    mime_type, file_size_bytes, changed_by, change_type
  ) values (
    v_payment.id, null, p_proof_path, null, null, null, v_admin_id, 'Initial'
  );

  return v_payment;
end;
$$;

create or replace function public.calculate_installment_penalty(p_schedule_id bigint, p_valid_transfer_date date)
returns public.installment_penalties
language plpgsql security definer set search_path = '' as $$
declare v_schedule public.installment_schedules%rowtype; v_penalty public.installment_penalties%rowtype; v_days integer; v_amount bigint;
begin
  if not public.is_finance_admin() then raise exception 'Hanya Admin atau Owner yang dapat menghitung denda.'; end if;
  if p_valid_transfer_date is null then raise exception 'Tanggal transfer tervalidasi wajib diisi.'; end if;
  select * into v_schedule from public.installment_schedules where id = p_schedule_id for update;
  if not found then raise exception 'Jadwal cicilan tidak ditemukan.'; end if;
  v_days := case when v_schedule.due_date_official
    then greatest(p_valid_transfer_date - v_schedule.due_date, 0) else 0 end;
  v_amount := least(v_days::bigint * 20000, 1800000);
  insert into public.installment_penalties (installment_schedule_id, valid_transfer_date, days_late, amount, calculated_at)
  values (p_schedule_id, p_valid_transfer_date, v_days, v_amount, now())
  on conflict (installment_schedule_id) do update set valid_transfer_date = excluded.valid_transfer_date, days_late = excluded.days_late, amount = excluded.amount, calculated_at = excluded.calculated_at
  where installment_penalties.status = 'Pending'
  returning * into v_penalty;
  if not found then select * into v_penalty from public.installment_penalties where installment_schedule_id = p_schedule_id; end if;
  return v_penalty;
end; $$;

create or replace function public.detect_installment_defaults(p_as_of date default (now() at time zone 'Asia/Makassar')::date)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if not public.is_finance_admin() then raise exception 'Hanya Admin atau Owner yang dapat menjalankan pemeriksaan wanprestasi.'; end if;
  insert into public.default_reviews (transaction_id, installment_schedule_id)
  select s.transaction_id, s.id from public.installment_schedules s join public.lot_transactions t on t.id = s.transaction_id
  where s.status <> 'Paid' and s.due_date_official and p_as_of >= s.due_date + 90 and t.status <> 'Cancelled'
  on conflict (installment_schedule_id) do nothing;
  get diagnostics v_count = row_count; return v_count;
end;
$$;

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

create or replace function public.get_marketing_notifications(p_limit integer default 40)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 40), 1), 100);
  v_today date := (now() at time zone 'Asia/Makassar')::date;
  v_since timestamptz := now() - interval '30 days';
  v_result jsonb;
begin
  with members as (
    select * from public.marketing_report_members(null)
  ),
  spk as (
    select sr.id, sr.spk_number, sr.customer_id, sr.customer_full_name, sr.rejection_reason
    from public.spk_requests sr
    where public.marketing_owner_of_spk(sr.id) in (select member_id from members)
  ),
  tx as (
    select t.id, t.customer_id, t.status, t.sold_date, t.cancelled_date, l.lot_number
    from public.lot_transactions t
    left join public.lots l on l.id = t.lot_id
    where public.marketing_owner_of_transaction(t.id) in (select member_id from members)
  ),
  pay as (
    select p.id, p.customer_id, p.amount, p.payment_category, p.submitted_at, p.review_note
    from public.payments p
    where public.marketing_owner_of_payment(p.id) in (select member_id from members)
  ),
  events as (
    -- SPK
    select 'spk_' || lower(replace(sh.new_status, ' ', '_')) as kind,
           case sh.new_status
             when 'Submitted' then 'SPK diajukan'
             when 'Under Review' then 'SPK sedang ditinjau Admin'
             when 'Approved' then 'SPK terkonfirmasi'
             when 'Rejected' then 'SPK ditolak'
             when 'Cancelled' then 'SPK dibatalkan'
             else 'Status SPK berubah' end as title,
           spk.spk_number || case when sh.new_status = 'Rejected' and spk.rejection_reason is not null
                                  then ' · Alasan: ' || spk.rejection_reason else '' end as body,
           case when sh.new_status = 'Rejected' then 'danger'
                when sh.new_status = 'Approved' then 'success' else 'info' end as severity,
           spk.customer_id, spk.customer_full_name as customer_name, sh.created_at as occurred_at
    from public.spk_request_status_history sh
    join spk on spk.id = sh.spk_request_id
    where sh.created_at >= v_since
    union all
    -- Pembayaran diajukan
    select 'payment_submitted', 'Pembayaran diajukan',
           pay.payment_category || ' · Rp' || to_char(coalesce(pay.amount, 0), 'FM999G999G999G999'),
           'info', pay.customer_id, c.full_name, pay.submitted_at
    from pay left join public.customers c on c.id = pay.customer_id
    where pay.submitted_at >= v_since
    union all
    -- Hasil verifikasi pembayaran
    select 'payment_' || lower(replace(h.new_status, ' ', '_')),
           case h.new_status
             when 'Confirmed' then 'Pembayaran terkonfirmasi'
             when 'Rejected' then 'Pembayaran ditolak'
             when 'Needs Reupload' then 'Bukti pembayaran perlu diunggah ulang'
             else 'Status pembayaran berubah' end,
           pay.payment_category || ' · Rp' || to_char(coalesce(pay.amount, 0), 'FM999G999G999G999')
             || coalesce(' · ' || nullif(h.review_note, ''), ''),
           case when h.new_status = 'Confirmed' then 'success'
                when h.new_status in ('Rejected', 'Needs Reupload') then 'danger' else 'info' end,
           pay.customer_id, c.full_name, h.created_at
    from public.payment_status_history h
    join pay on pay.id = h.payment_id
    left join public.customers c on c.id = pay.customer_id
    where h.created_at >= v_since and h.old_status is distinct from h.new_status
    union all
    -- Cicilan mendekati jatuh tempo (7 hari)
    select 'installment_due_soon', 'Cicilan mendekati jatuh tempo',
           'Cicilan ke-' || s.installment_number || ' · ' || coalesce(tx.lot_number, '-') || ' · jatuh tempo '
             || to_char(s.due_date, 'DD-MM-YYYY'),
           'warning', tx.customer_id, c.full_name, (s.due_date - 7)::timestamptz
    from public.installment_schedules s
    join tx on tx.id = s.transaction_id
    left join public.customers c on c.id = tx.customer_id
    where s.due_date_official and s.status = 'Pending' and s.due_date between v_today and v_today + 7 and tx.status <> 'Cancelled'
    union all
    -- Cicilan terlambat
    select 'installment_overdue', 'Cicilan terlambat',
           'Cicilan ke-' || s.installment_number || ' · ' || coalesce(tx.lot_number, '-') || ' · terlambat '
             || (v_today - s.due_date) || ' hari',
           'danger', tx.customer_id, c.full_name, s.due_date::timestamptz
    from public.installment_schedules s
    join tx on tx.id = s.transaction_id
    left join public.customers c on c.id = tx.customer_id
    where s.due_date_official and (s.status = 'Overdue' or (s.status = 'Pending' and s.due_date < v_today)) and tx.status <> 'Cancelled'
    union all
    -- Pembatalan transaksi
    select 'cancellation_' || lower(pcr.status),
           case pcr.status when 'Pending' then 'Pembatalan transaksi diajukan'
                           when 'Approved' then 'Pembatalan transaksi disetujui'
                           else 'Pembatalan transaksi ditolak' end,
           coalesce(tx.lot_number, '-') || ' · ' || left(pcr.reason, 160),
           case when pcr.status = 'Pending' then 'warning' else 'info' end,
           pcr.customer_id, c.full_name, coalesce(pcr.reviewed_at, pcr.created_at)
    from public.purchase_cancellation_requests pcr
    join tx on tx.id = pcr.transaction_id
    left join public.customers c on c.id = pcr.customer_id
    where coalesce(pcr.reviewed_at, pcr.created_at) >= v_since
    union all
    -- Perubahan status transaksi (lunas / batal)
    select 'transaction_' || lower(tx.status),
           case tx.status when 'Sold' then 'Transaksi lunas' else 'Transaksi dibatalkan' end,
           coalesce(tx.lot_number, '-'),
           case tx.status when 'Sold' then 'success' else 'danger' end,
           tx.customer_id, c.full_name,
           coalesce(case tx.status when 'Sold' then tx.sold_date else tx.cancelled_date end, v_today)::timestamptz
    from tx left join public.customers c on c.id = tx.customer_id
    where tx.status in ('Sold', 'Cancelled')
      and coalesce(case tx.status when 'Sold' then tx.sold_date else tx.cancelled_date end, v_today) >= (v_since at time zone 'Asia/Makassar')::date
  )
  select coalesce(jsonb_agg(to_jsonb(e) order by e.occurred_at desc), '[]'::jsonb)
  into v_result
  from (select * from events order by occurred_at desc limit v_limit) e;

  return v_result;
end;
$$;

create or replace function public.get_marketing_report(
  p_from date default null,
  p_to date default null,
  p_marketing_id uuid default null
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_tz constant text := 'Asia/Makassar';
  v_today date := (now() at time zone 'Asia/Makassar')::date;
  v_from date := coalesce(p_from, date_trunc('month', now() at time zone 'Asia/Makassar')::date);
  v_to date := coalesce(p_to, (now() at time zone 'Asia/Makassar')::date);
  v_bucket text;
  v_result jsonb;
begin
  if v_to < v_from then
    raise exception 'Tanggal akhir tidak boleh sebelum tanggal awal.';
  end if;
  if v_to - v_from > 1830 then
    raise exception 'Rentang laporan maksimal 5 tahun.';
  end if;

  v_bucket := case
    when v_to - v_from <= 14 then 'day'
    when v_to - v_from <= 92 then 'week'
    else 'month' end;

  with
  members as (
    select * from public.marketing_report_members(p_marketing_id)
  ),
  cust as (
    select c.*, (c.created_at at time zone v_tz)::date as created_day
    from public.customers c
    where c.marketing_id in (select member_id from members)
  ),
  spk as (
    select sr.*,
      coalesce(c.marketing_id, case when sr.submission_source = 'Marketing' then sr.marketing_id end) as owner_id
    from public.spk_requests sr
    left join public.customers c on c.id = sr.customer_id
    where coalesce(c.marketing_id, case when sr.submission_source = 'Marketing' then sr.marketing_id end)
          in (select member_id from members)
  ),
  tx as (
    select t.*, public.marketing_owner_of_transaction(t.id) as owner_id
    from public.lot_transactions t
    where public.marketing_owner_of_transaction(t.id) in (select member_id from members)
  ),
  tx_period as (
    select * from tx
    where status <> 'Cancelled'
      and booking_date between v_from and v_to
  ),
  pay as (
    select p.*, public.marketing_owner_of_payment(p.id) as owner_id
    from public.payments p
    where public.marketing_owner_of_payment(p.id) in (select member_id from members)
  ),
  comm as (
    select mc.* from public.marketing_commissions mc
    where mc.marketing_id in (select member_id from members)
      and mc.status <> 'Cancelled'
      and (mc.created_at at time zone v_tz)::date between v_from and v_to
  ),
  sched as (
    select s.*, tx.owner_id
    from public.installment_schedules s
    join tx on tx.id = s.transaction_id
    where tx.status <> 'Cancelled'
  ),
  buckets as (
    select gs::date as bucket_start
    from generate_series(date_trunc(v_bucket, v_from::timestamp), v_to::timestamp, ('1 ' || v_bucket)::interval) gs
  )
  select jsonb_build_object(
    'period', jsonb_build_object('from', v_from, 'to', v_to, 'bucket', v_bucket, 'timezone', v_tz),
    'summary', jsonb_build_object(
      'total_clients', (select count(*) from cust),
      'new_clients', (select count(*) from cust where created_day between v_from and v_to),
      'crm', coalesce((select jsonb_object_agg(crm_status, n) from (select crm_status, count(*) n from cust group by crm_status) x), '{}'::jsonb),
      'no_followup_7d', (select count(*) from cust
        where crm_status not in ('Berhasil', 'Tidak Lanjut')
          and coalesce(last_contacted_at, created_at) < now() - interval '7 days'),
      'spk_submitted', (select count(*) from spk where (submitted_at at time zone v_tz)::date between v_from and v_to),
      'spk_pending', (select count(*) from spk where status in ('Submitted', 'Under Review')),
      'spk_approved', (select count(*) from spk where status = 'Approved' and (approved_at at time zone v_tz)::date between v_from and v_to),
      'spk_rejected', (select count(*) from spk where status = 'Rejected' and (coalesce(reviewed_at, updated_at) at time zone v_tz)::date between v_from and v_to),
      'units_sold', (select count(*) from tx_period),
      'units_booked', (select count(*) from tx_period where status = 'Booking'),
      'units_paid_off', (select count(*) from tx_period where status = 'Sold'),
      'contract_value', (select coalesce(sum(final_price), 0) from tx_period),
      'cash_units', (select count(*) from tx_period where payment_type = 'Cash'),
      'cash_contract_value', (select coalesce(sum(final_price), 0) from tx_period where payment_type = 'Cash'),
      'installment_units', (select count(*) from tx_period where payment_type = 'Installment'),
      'installment_contract_value', (select coalesce(sum(final_price), 0) from tx_period where payment_type = 'Installment'),
      'cash_in', (select coalesce(sum(amount), 0) from pay where status = 'Confirmed' and (coalesce(verified_at, submitted_at) at time zone v_tz)::date between v_from and v_to),
      'cash_in_by_category', coalesce((select jsonb_object_agg(payment_category, total) from (
          select payment_category, sum(amount) total from pay
          where status = 'Confirmed' and (coalesce(verified_at, submitted_at) at time zone v_tz)::date between v_from and v_to
          group by payment_category) x), '{}'::jsonb),
      'payments_pending_count', (select count(*) from pay where status = 'Pending'),
      'payments_pending_amount', (select coalesce(sum(amount), 0) from pay where status = 'Pending'),
      'payments_rejected_count', (select count(*) from pay where status in ('Rejected', 'Needs Reupload') and (submitted_at at time zone v_tz)::date between v_from and v_to),
      'installments_due_soon', (select count(*) from sched where due_date_official and status = 'Pending' and due_date between v_today and v_today + 7),
      'installments_overdue', (select count(*) from sched where due_date_official and (status = 'Overdue' or (status = 'Pending' and due_date < v_today))),
      'installments_overdue_amount', (select coalesce(sum(amount), 0) from sched where due_date_official and (status = 'Overdue' or (status = 'Pending' and due_date < v_today))),
      'commission_total', (select coalesce(sum(commission_amount), 0) from comm),
      'commission_pending', (select coalesce(sum(commission_amount), 0) from comm where status in ('Pending', 'Eligible', 'Processing')),
      'commission_paid', (select coalesce(sum(commission_amount), 0) from comm where status = 'Paid'),
      'commission_count', (select count(*) from comm),
      'team_size', (select count(*) from members where member_role = 'marketing')
    ),
    'trend', coalesce((select jsonb_agg(jsonb_build_object(
        'bucket', b.bucket_start,
        'new_clients', (select count(*) from cust where date_trunc(v_bucket, created_day::timestamp)::date = b.bucket_start and created_day between v_from and v_to),
        'spk_approved', (select count(*) from spk where status = 'Approved'
            and date_trunc(v_bucket, (approved_at at time zone v_tz))::date = b.bucket_start
            and (approved_at at time zone v_tz)::date between v_from and v_to),
        'units_sold', (select count(*) from tx_period where date_trunc(v_bucket, booking_date::timestamp)::date = b.bucket_start),
        'contract_value', (select coalesce(sum(final_price), 0) from tx_period where date_trunc(v_bucket, booking_date::timestamp)::date = b.bucket_start),
        'cash_in', (select coalesce(sum(amount), 0) from pay where status = 'Confirmed'
            and date_trunc(v_bucket, (coalesce(verified_at, submitted_at) at time zone v_tz))::date = b.bucket_start
            and (coalesce(verified_at, submitted_at) at time zone v_tz)::date between v_from and v_to)
      ) order by b.bucket_start) from buckets b), '[]'::jsonb),
    'team', coalesce((select jsonb_agg(row_to_json(t)::jsonb order by t.spk_approved desc, t.contract_value desc, t.conversion_rate desc, t.full_name)
      from (
        select
          m.member_id as id,
          m.member_name as full_name,
          m.member_role as role,
          (select count(*) from cust where marketing_id = m.member_id) as total_clients,
          (select count(*) from cust where marketing_id = m.member_id and created_day between v_from and v_to) as new_clients,
          (select count(*) from cust where marketing_id = m.member_id and crm_status = 'Sudah Dihubungi') as contacted,
          (select count(*) from cust where marketing_id = m.member_id and crm_status = 'Follow-up') as followup,
          (select count(*) from cust where marketing_id = m.member_id and crm_status in ('Berminat', 'Survey Lokasi')) as interested,
          (select count(*) from cust where marketing_id = m.member_id and crm_status = 'Negosiasi') as negotiation,
          (select count(*) from cust where marketing_id = m.member_id and crm_status = 'Pengajuan') as submission,
          (select count(*) from cust where marketing_id = m.member_id and crm_status = 'Berhasil') as won,
          (select count(*) from cust where marketing_id = m.member_id and crm_status = 'Tidak Lanjut') as lost,
          (select count(*) from spk where owner_id = m.member_id and status = 'Approved'
              and (approved_at at time zone v_tz)::date between v_from and v_to) as spk_approved,
          (select count(*) from tx_period where owner_id = m.member_id) as units_sold,
          (select coalesce(sum(final_price), 0) from tx_period where owner_id = m.member_id) as contract_value,
          (select coalesce(sum(commission_amount), 0) from comm where marketing_id = m.member_id) as commission_total,
          case when (select count(*) from cust where marketing_id = m.member_id) = 0 then 0
               else round(100.0 * (select count(distinct customer_id) from tx where owner_id = m.member_id and status <> 'Cancelled')
                    / (select count(*) from cust where marketing_id = m.member_id), 1) end as conversion_rate,
          greatest(
            (select max(f.created_at) from public.customer_followups f where f.user_id = m.member_id),
            (select max(h.created_at) from public.customer_crm_status_history h where h.changed_by = m.member_id)
          ) as last_activity_at
        from members m
      ) t), '[]'::jsonb),
    'regions', coalesce((select jsonb_agg(row_to_json(r)::jsonb order by r.clients desc, r.province, r.city)
      from (
        select
          coalesce(nullif(btrim(c.province_name), ''), 'Belum diisi') as province,
          coalesce(nullif(btrim(c.city_name), ''), 'Belum diisi') as city,
          count(*) as clients,
          count(*) filter (where exists (select 1 from tx where tx.customer_id = c.id and tx.status <> 'Cancelled')) as buyers,
          round(100.0 * count(*) filter (where exists (select 1 from tx where tx.customer_id = c.id and tx.status <> 'Cancelled'))
                / nullif(count(*), 0), 1) as conversion_rate
        from cust c
        where c.created_day between v_from and v_to
        group by 1, 2
      ) r), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;
