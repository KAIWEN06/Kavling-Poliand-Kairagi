-- Revisi Pesanan: Admin mengganti kavling, tenor, DP, atau metode bayar setelah
-- SPK disetujui. Aturan:
--   1. Hanya sebelum PPJB (dan tahap sesudahnya) selesai.
--   2. Kavling tetap: harga saat pemesanan. Kavling lain: harga saat revisi.
--   3. Uang harga yang sudah masuk dipindahkan; kelebihan dari DP baru
--      mengurangi cicilan berikutnya.
--   4. Booking Fee dipindahkan penuh tanpa biaya.
--   5. SPK revisi mulai dari tahap "Tanda tangan SPK dan Booking Fee", sehingga
--      pembeli menandatangani ulang dokumen fisik sebelum proses berlanjut.
--
-- Revisi DITOLAK (bukan ditebak) bila: uang yang sudah masuk lebih kecil dari DP
-- baru, atau lebih besar dari total tagihan baru.
-- Bergantung pada 033-037. Aman diulang.

begin;

-- ---------------------------------------------------------------------------
-- 1. Riwayat revisi.
-- ---------------------------------------------------------------------------
create table if not exists public.spk_order_revisions (
  id bigint generated always as identity primary key,
  transaction_id bigint not null references public.lot_transactions(id) on delete restrict,
  original_spk_request_id bigint not null references public.spk_requests(id) on delete restrict,
  revised_spk_request_id bigint not null unique references public.spk_requests(id) on delete restrict,
  reason text not null check (length(btrim(reason)) between 5 and 2000),
  old_terms jsonb not null,
  new_terms jsonb not null,
  carried_amount bigint not null check (carried_amount >= 0),
  carried_payment_ids bigint[] not null default '{}',
  revised_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now()
);
create index if not exists spk_order_revisions_tx_idx
  on public.spk_order_revisions (transaction_id, created_at desc);
create index if not exists spk_order_revisions_original_idx
  on public.spk_order_revisions (original_spk_request_id);
create index if not exists spk_order_revisions_actor_idx
  on public.spk_order_revisions (revised_by);

alter table public.spk_order_revisions enable row level security;
revoke all on public.spk_order_revisions from anon, authenticated;
grant select on public.spk_order_revisions to authenticated;

-- old_terms berisi salinan jadwal lama; pembeli hanya membaca miliknya.
drop policy if exists "spk_order_revisions_select" on public.spk_order_revisions;
create policy "spk_order_revisions_select"
  on public.spk_order_revisions for select to authenticated
  using (
    public.is_finance_admin()
    or exists (
      select 1 from public.lot_transactions t
        join public.customers c on c.id = t.customer_id
       where t.id = spk_order_revisions.transaction_id
         and c.user_id = (select auth.uid())
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Pelunasan tunai = harga dikurangi uang tunai yang sudah terkonfirmasi.
--    Tanpa uang pindahan, hasilnya sama dengan harga penuh seperti sebelumnya.
-- ---------------------------------------------------------------------------
create or replace function public.cash_amount_due(p_transaction_id bigint)
returns bigint
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select greatest(
    coalesce(t.final_price, 0) - coalesce((
      select sum(p.amount) from public.payments p
       where p.transaction_id = t.id and p.status = 'Confirmed'
         and p.payment_category = 'Cash Purchase'), 0), 0)::bigint
    from public.lot_transactions t
   where t.id = p_transaction_id;
$$;
revoke all on function public.cash_amount_due(bigint) from public, anon, authenticated;

create or replace function public.cash_payment_blocked(p_transaction_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.payments p
                  where p.transaction_id = p_transaction_id
                    and p.payment_category = 'Cash Purchase' and p.status = 'Pending')
      or public.cash_amount_due(p_transaction_id) <= 0;
$$;
revoke all on function public.cash_payment_blocked(bigint) from public, anon, authenticated;

-- Sisipkan ke dua RPC pembayaran tanpa menulis ulang aturan lain.
do $patch$
declare
  v_name text;
  v_def text;
  v_new text;
begin
  foreach v_name in array array['submit_client_payment', 'create_admin_payment_with_allocations']
  loop
    for v_def in
      select pg_get_functiondef(p.oid) from pg_proc p
       where p.pronamespace = 'public'::regnamespace and p.proname = v_name
    loop
      if position('cash_payment_blocked' in v_def) > 0 then
        continue;
      end if;

      -- a. "sudah dikirim atau sudah lunas"
      v_new := regexp_replace(v_def,
        'if\s+exists\s*\(\s*select\s+1\s+from\s+public\.payments(\s+p)?\s+where\s+(p\.)?transaction_id\s*=\s*p_transaction_id\s+and\s+(p\.)?payment_category\s*=\s*''Cash Purchase''\s+and\s+(p\.)?status\s+in\s*\(\s*''Pending''\s*,\s*''Confirmed''\s*\)\s*\)\s*then',
        'if public.cash_payment_blocked(p_transaction_id) then');
      if v_new = v_def then
        raise exception 'Pemeriksaan pelunasan ganda pada % tidak ditemukan.', v_name;
      end if;
      v_def := v_new;

      -- b. nominal pelunasan
      v_new := regexp_replace(v_def,
        'p_amount\s*<>\s*(coalesce\s*\(\s*v_tx\.final_price\s*,\s*0\s*\)|v_transaction\.final_price)',
        'p_amount <> public.cash_amount_due(p_transaction_id)');
      if v_new = v_def then
        raise exception 'Pemeriksaan nominal pelunasan pada % tidak ditemukan.', v_name;
      end if;

      execute v_new;
    end loop;
  end loop;
end;
$patch$;

-- ---------------------------------------------------------------------------
-- 3. Selama revisi, satu cicilan boleh ditutup oleh lebih dari satu pembayaran.
--    Penanda hanya berlaku di dalam transaksi database fungsi revisi, dan
--    pengguna aplikasi tidak punya hak menulis langsung ke tabel alokasi
--    selain Admin lewat policy yang sudah ada.
-- ---------------------------------------------------------------------------
create or replace function public.guard_active_payment_allocations()
returns trigger
language plpgsql
set search_path = public, extensions, pg_temp
as $$
begin
  if coalesce(current_setting('app.order_revision', true), '') = 'on' then
    return new;
  end if;
  if exists (
    select 1
      from public.payment_allocations existing
      join public.payments existing_payment on existing_payment.id = existing.payment_id
     where existing.installment_schedule_id = new.installment_schedule_id
       and existing_payment.status in ('Pending', 'Needs Reupload', 'Confirmed')
       and existing.payment_id <> coalesce(new.payment_id, -1)
  ) then
    raise exception 'Cicilan sudah memiliki pengajuan aktif atau terkonfirmasi.';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Pembayaran yang uangnya sudah dipindahkan lewat revisi tidak boleh
--    dibalik: sebagian nilainya sudah mengurangi nominal cicilan.
-- ---------------------------------------------------------------------------
create or replace function public.guard_reversal_after_revision()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if exists (
    select 1
      from public.financial_transactions f
      join public.spk_order_revisions r on f.source_id = any (r.carried_payment_ids)
     where f.id = new.reversal_of and f.source_table = 'payments'
  ) then
    raise exception 'Pembayaran ini sudah dipindahkan lewat Revisi Pesanan, jadi tidak dapat dibalik.';
  end if;
  return new;
end;
$$;
revoke execute on function public.guard_reversal_after_revision()
  from public, anon, authenticated;

drop trigger if exists trg_guard_reversal_after_revision on public.financial_transactions;
create trigger trg_guard_reversal_after_revision
  before insert on public.financial_transactions
  for each row
  when (new.reversal_of is not null)
  execute function public.guard_reversal_after_revision();

-- ---------------------------------------------------------------------------
-- 5. Hitungan revisi: satu sumber untuk pratinjau dan penerapan.
-- ---------------------------------------------------------------------------
create or replace function public._spk_revision_quote(
  p_spk_request_id bigint,
  p_lot_id bigint,
  p_payment_method text,
  p_plan_id bigint,
  p_down_payment bigint
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  s public.spk_requests%rowtype;
  t public.lot_transactions%rowtype;
  l public.lots%rowtype;
  v_blockers text[] := '{}';
  v_price numeric;
  v_dp numeric := 0;
  v_months integer;
  v_margin numeric := 0;
  v_monthly numeric;
  v_custom numeric;
  v_principal numeric;
  v_installments numeric := 0;
  v_total numeric;
  v_carried numeric;
  v_booking numeric;
begin
  select * into s from public.spk_requests where id = p_spk_request_id;
  if not found or s.status <> 'Approved' or s.transaction_id is null then
    raise exception 'Hanya SPK yang sudah disetujui yang dapat direvisi.';
  end if;
  select * into t from public.lot_transactions where id = s.transaction_id;
  if t.status <> 'Booking' then
    v_blockers := v_blockers || 'Hanya pembelian berstatus Dipesan yang dapat direvisi.'::text;
  end if;

  if exists (select 1 from public.spk_process_steps x
              where x.spk_request_id = s.id and x.status = 'done'
                and x.step_key in ('ppjb', 'cicilan', 'ajb', 'shm', 'serah_terima')) then
    v_blockers := v_blockers || 'PPJB sudah selesai, jadi pesanan tidak dapat direvisi.'::text;
  end if;
  if exists (select 1 from public.payments p
              where p.transaction_id = t.id and p.status in ('Pending', 'Needs Reupload')) then
    v_blockers := v_blockers || 'Masih ada pembayaran yang belum selesai diverifikasi.'::text;
  end if;
  if exists (select 1 from public.purchase_cancellation_requests q
              where q.transaction_id = t.id and q.status = 'Pending') then
    v_blockers := v_blockers || 'Ada pengajuan pembatalan yang belum diputuskan.'::text;
  end if;
  if exists (select 1 from public.default_notices d where d.transaction_id = t.id)
     or exists (select 1 from public.default_reviews d where d.transaction_id = t.id)
     or exists (select 1 from public.installment_penalties ip
                  join public.installment_schedules i on i.id = ip.installment_schedule_id
                 where i.transaction_id = t.id) then
    v_blockers := v_blockers || 'Pembelian ini punya catatan tunggakan atau denda.'::text;
  end if;

  select * into l from public.lots where id = p_lot_id;
  if not found then
    raise exception 'Kavling tidak ditemukan.';
  end if;

  if p_lot_id = s.lot_id then
    v_price := s.lot_price_snapshot;
  else
    v_price := case when coalesce(l.promo_price, 0) > 0
                     and (coalesce(l.cash_price, 0) <= 0 or l.promo_price < l.cash_price)
                    then l.promo_price else l.cash_price end;
    if l.status <> 'Available' or exists (
         select 1 from public.spk_requests o
          where o.lot_id = p_lot_id and o.id <> s.id
            and o.status in ('Submitted', 'Under Review', 'Approved')) then
      v_blockers := v_blockers || 'Kavling pengganti tidak tersedia.'::text;
    end if;
  end if;
  if coalesce(v_price, 0) <= 0 then
    raise exception 'Harga kavling belum tersedia.';
  end if;

  if p_payment_method = 'Installment' then
    v_dp := coalesce(p_down_payment, 0);
    if v_dp < 0 or v_dp >= v_price then
      raise exception 'DP harus Rp0 atau lebih kecil dari harga kavling.';
    end if;
    select pp.months, coalesce(pp.margin_percent, 0),
           case when li.is_custom then li.monthly_payment end
      into v_months, v_margin, v_custom
      from public.lot_installments li
      join public.payment_plans pp on pp.id = li.plan_id
     where li.lot_id = p_lot_id and li.plan_id = p_plan_id and pp.months between 1 and 24
     limit 1;
    if v_months is null then
      raise exception 'Tenor cicilan tidak tersedia untuk kavling ini.';
    end if;
    v_principal := v_price - v_dp;
    v_monthly := coalesce(v_custom,
      floor((v_principal + round(v_principal * v_margin / 100)) / v_months));
    v_installments := public.spk_installment_total(v_principal, v_margin, v_months, v_monthly);
    v_total := v_dp + v_installments;
  elsif p_payment_method = 'Cash' then
    v_total := v_price;
  else
    raise exception 'Metode pembayaran tidak valid.';
  end if;

  select coalesce(sum(amount) filter (
           where payment_category in ('Down Payment', 'Installment', 'Cash Purchase')), 0),
         coalesce(sum(amount) filter (where payment_category = 'Booking'), 0)
    into v_carried, v_booking
    from public.payments
   where transaction_id = t.id and status = 'Confirmed';

  if v_carried > v_total then
    v_blockers := v_blockers || 'Uang yang sudah masuk melebihi total tagihan baru. Selisihnya belum bisa dikembalikan lewat aplikasi.'::text;
  elsif p_payment_method = 'Installment' and v_carried > 0 and v_carried < v_dp then
    v_blockers := v_blockers || 'DP baru lebih besar dari uang yang sudah masuk. Pilih DP paling besar sejumlah uang yang sudah masuk.'::text;
  end if;

  if p_lot_id = s.lot_id and p_payment_method = s.payment_method
     and (p_payment_method = 'Cash'
          or (p_plan_id = s.payment_plan_id and v_dp = s.down_payment_snapshot)) then
    v_blockers := v_blockers || 'Belum ada yang berubah.'::text;
  end if;

  return jsonb_build_object(
    'lot_id', p_lot_id,
    'lot_number', l.lot_number,
    'payment_method', p_payment_method,
    'plan_id', case when p_payment_method = 'Installment' then p_plan_id end,
    'price', v_price,
    'down_payment', v_dp,
    'months', v_months,
    'margin_percent', v_margin,
    'monthly_payment', v_monthly,
    'installment_total', v_installments,
    'total_due', v_total,
    'carried_amount', v_carried,
    'credit_to_installments',
      case when p_payment_method = 'Installment' then greatest(v_carried - v_dp, 0) else 0 end,
    'remaining', greatest(v_total - v_carried, 0),
    'booking_fee_paid', v_booking,
    'blockers', to_jsonb(v_blockers)
  );
end;
$$;
revoke all on function public._spk_revision_quote(bigint, bigint, text, bigint, bigint)
  from public, anon, authenticated;

create or replace function public.admin_quote_spk_revision(
  p_spk_request_id bigint, p_lot_id bigint, p_payment_method text,
  p_plan_id bigint default null, p_down_payment bigint default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Hanya Admin yang dapat merevisi pesanan.';
  end if;
  return public._spk_revision_quote(
    p_spk_request_id, p_lot_id, p_payment_method, p_plan_id, p_down_payment);
end;
$$;
revoke all on function public.admin_quote_spk_revision(bigint, bigint, text, bigint, bigint)
  from public, anon;
grant execute on function public.admin_quote_spk_revision(bigint, bigint, text, bigint, bigint)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 6. Penerapan revisi.
-- ---------------------------------------------------------------------------
create or replace function public.admin_revise_spk_order(
  p_spk_request_id bigint,
  p_lot_id bigint,
  p_payment_method text,
  p_plan_id bigint,
  p_down_payment bigint,
  p_reason text,
  p_expected_total bigint
)
returns bigint
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  s public.spk_requests%rowtype;
  t public.lot_transactions%rowtype;
  q jsonb;
  v_old_terms jsonb;
  v_new_spk bigint;
  v_installment boolean;
  v_price numeric;
  v_dp numeric;
  v_months integer;
  v_monthly numeric;
  v_inst_total numeric;
  v_category text;
  v_pay record;
  v_sched record;
  v_ids bigint[] := '{}';
  v_left bigint[] := '{}';
  v_credit numeric;
  v_skip numeric;
  v_take numeric;
  v_need numeric;
  v_amount numeric;
  v_schedule_id bigint;
  i integer;
  n integer;
begin
  if v_actor is null or not exists (
    select 1 from public.profiles where id = v_actor and role = 'admin') then
    raise exception 'Hanya Admin yang dapat merevisi pesanan.';
  end if;
  if length(btrim(coalesce(p_reason, ''))) not between 5 and 2000 then
    raise exception 'Alasan revisi wajib diisi, minimal 5 karakter.';
  end if;

  select * into s from public.spk_requests where id = p_spk_request_id for update;
  if not found or s.transaction_id is null then
    raise exception 'SPK tidak ditemukan atau belum disetujui.';
  end if;
  perform pg_advisory_xact_lock(s.transaction_id);
  select * into t from public.lot_transactions where id = s.transaction_id for update;
  perform 1 from public.lots where id in (s.lot_id, p_lot_id) order by id for update;
  perform 1 from public.payments where transaction_id = t.id order by id for update;

  q := public._spk_revision_quote(s.id, p_lot_id, p_payment_method, p_plan_id, p_down_payment);
  if jsonb_array_length(q -> 'blockers') > 0 then
    raise exception '%', q -> 'blockers' ->> 0;
  end if;
  if p_expected_total is distinct from (q ->> 'total_due')::numeric::bigint then
    raise exception 'Rincian berubah. Muat ulang lalu periksa kembali.';
  end if;

  v_installment := p_payment_method = 'Installment';
  v_price := (q ->> 'price')::numeric;
  v_dp := (q ->> 'down_payment')::numeric;
  v_months := (q ->> 'months')::integer;
  v_monthly := (q ->> 'monthly_payment')::numeric;
  v_inst_total := (q ->> 'installment_total')::numeric;

  v_old_terms := jsonb_build_object(
    'spk_number', s.spk_number, 'lot_id', s.lot_id,
    'payment_method', s.payment_method, 'plan_id', s.payment_plan_id,
    'price', t.final_price, 'down_payment', t.down_payment, 'months', t.months,
    'monthly_payment', t.monthly_payment, 'installment_total', t.installment_total,
    'schedules', coalesce((select jsonb_agg(to_jsonb(x) order by x.installment_number)
                             from public.installment_schedules x
                            where x.transaction_id = t.id), '[]'::jsonb),
    'allocations', coalesce((select jsonb_agg(to_jsonb(a))
                               from public.payment_allocations a
                               join public.installment_schedules x
                                 on x.id = a.installment_schedule_id
                              where x.transaction_id = t.id), '[]'::jsonb));

  -- Jadwal lama dilepas (salinannya tersimpan di old_terms).
  delete from public.payment_allocations a
   using public.installment_schedules x
   where x.id = a.installment_schedule_id and x.transaction_id = t.id;
  delete from public.installment_schedules where transaction_id = t.id;

  -- SPK lama ditutup lebih dulu karena satu transaksi hanya boleh punya satu SPK.
  update public.spk_requests
     set status = 'Cancelled', transaction_id = null,
         admin_note = coalesce(nullif(btrim(admin_note), '') || E'\n', '')
                      || 'Direvisi: ' || btrim(p_reason),
         updated_at = now()
   where id = s.id;

  -- Transaksi tetap satu agar pembayaran dan buku kas tidak terputus.
  -- payments.lot_id ikut berubah lewat composite FK.
  update public.lot_transactions
     set lot_id = p_lot_id,
         payment_type = p_payment_method,
         price_at_booking = v_price,
         discount_amount = 0,
         final_price = v_price,
         down_payment = v_dp,
         principal_amount = v_price - v_dp,
         plan_id = case when v_installment then p_plan_id end,
         months = v_months,
         monthly_payment = v_monthly,
         margin_percent = (q ->> 'margin_percent')::numeric,
         margin_amount = case when v_installment then v_inst_total - (v_price - v_dp) else 0 end,
         installment_total = v_inst_total,
         installment_start_date = case when v_installment then current_date end,
         updated_at = now()
   where id = t.id;

  -- SPK revisi. Asal pengajuan dipertahankan agar pembeli tetap bisa melihatnya.
  -- Tahapan proses dibuat baru: tanda tangan SPK dan Booking Fee diulang.
  insert into public.spk_requests (
    marketing_id, customer_id, customer_full_name, customer_phone, customer_email,
    customer_address, lot_id, lot_price_snapshot, payment_method, payment_plan_id,
    months, monthly_payment, margin_percent_snapshot, notes, status,
    reviewed_by, reviewed_at, approved_at, admin_note, transaction_id,
    submitted_at, submission_source, submitted_by, down_payment_snapshot,
    down_payment_amount, booking_fee_snapshot)
  values (
    s.marketing_id, s.customer_id, s.customer_full_name, s.customer_phone, s.customer_email,
    s.customer_address, p_lot_id, v_price, p_payment_method,
    case when v_installment then p_plan_id end,
    v_months, v_monthly,
    case when v_installment then (q ->> 'margin_percent')::numeric end,
    s.notes, 'Approved', v_actor, now(), now(),
    'Revisi dari ' || s.spk_number || ': ' || btrim(p_reason), t.id,
    now(), s.submission_source, s.submitted_by, v_dp, v_dp, s.booking_fee_snapshot)
  returning id into v_new_spk;

  update public.spk_request_documents set spk_request_id = v_new_spk
   where spk_request_id = s.id;
  update public.payments set spk_request_id = v_new_spk
   where spk_request_id = s.id;
  update public.spk_booking_fee_reuse set current_spk_request_id = v_new_spk, updated_at = now()
   where current_spk_request_id = s.id;

  if p_lot_id <> s.lot_id then
    update public.lots
       set status = 'Available', customer_id = null, booking_date = null,
           sold_date = null, updated_at = now()
     where id = s.lot_id;
  end if;
  update public.lots
     set status = 'Booking', customer_id = t.customer_id, payment_type = p_payment_method,
         booking_date = coalesce(booking_date, t.booking_date, current_date), updated_at = now()
   where id = p_lot_id;

  -- Jadwal baru; cicilan terakhir menyerap sisa pembulatan.
  if v_installment then
    for n in 1..v_months loop
      insert into public.installment_schedules (
        transaction_id, installment_number, due_date, amount, status, created_at, updated_at)
      values (
        t.id, n, (current_date + make_interval(months => n))::date,
        case when n = v_months then v_inst_total - v_monthly * (v_months - 1) else v_monthly end,
        'Pending', now(), now());
    end loop;
  end if;

  -- Kategori uang yang dipindahkan disesuaikan dengan skema baru.
  v_category := case when not v_installment then 'Cash Purchase'
                     when v_dp > 0 then 'Down Payment'
                     else 'Installment' end;
  for v_pay in
    select id, amount, payment_category from public.payments
     where transaction_id = t.id and status = 'Confirmed'
       and payment_category in ('Down Payment', 'Installment', 'Cash Purchase')
     order by id
  loop
    v_ids := v_ids || v_pay.id;
    v_left := v_left || v_pay.amount;
    if v_pay.payment_category <> v_category then
      perform public.correct_poliland_payment_category(
        v_pay.id, v_category, 'Revisi Pesanan: ' || btrim(p_reason));
    end if;
  end loop;

  -- Uang di atas DP baru mengurangi cicilan berurutan.
  if v_installment then
    v_credit := (q ->> 'credit_to_installments')::numeric;
    if v_credit > 0 then
      perform set_config('app.order_revision', 'on', true);

      -- Bagian sebesar DP tidak boleh dialokasikan ke cicilan.
      v_skip := v_dp;
      for i in 1..coalesce(array_length(v_ids, 1), 0) loop
        v_take := least(v_skip, v_left[i]);
        v_left[i] := v_left[i] - v_take;
        v_skip := v_skip - v_take;
      end loop;

      for v_sched in
        select id, amount from public.installment_schedules
         where transaction_id = t.id order by installment_number
      loop
        exit when v_credit <= 0;
        v_schedule_id := v_sched.id;
        v_amount := v_sched.amount;
        if v_credit >= v_amount then
          -- Tertutup penuh: dialokasikan sehingga tercatat lunas.
          v_need := v_amount;
          for i in 1..array_length(v_ids, 1) loop
            exit when v_need <= 0;
            v_take := least(v_need, v_left[i]);
            if v_take > 0 then
              insert into public.payment_allocations (
                payment_id, installment_schedule_id, allocated_amount)
              values (v_ids[i], v_schedule_id, v_take);
              v_left[i] := v_left[i] - v_take;
              v_need := v_need - v_take;
            end if;
          end loop;
          v_credit := v_credit - v_amount;
        else
          -- Tertutup sebagian: nominal tagihannya dikurangi.
          update public.installment_schedules
             set amount = v_amount - v_credit, updated_at = now()
           where id = v_schedule_id;
          v_credit := 0;
        end if;
      end loop;

      perform set_config('app.order_revision', 'off', true);
    end if;
  end if;

  insert into public.spk_order_revisions (
    transaction_id, original_spk_request_id, revised_spk_request_id, reason,
    old_terms, new_terms, carried_amount, carried_payment_ids, revised_by)
  values (
    t.id, s.id, v_new_spk, btrim(p_reason), v_old_terms, q - 'blockers',
    (q ->> 'carried_amount')::numeric::bigint, v_ids, v_actor);

  perform public.refresh_marketing_commission_eligibility(t.id);

  return v_new_spk;
end;
$$;
revoke all on function public.admin_revise_spk_order(bigint, bigint, text, bigint, bigint, text, bigint)
  from public, anon;
grant execute on function public.admin_revise_spk_order(bigint, bigint, text, bigint, bigint, text, bigint)
  to authenticated;

-- Fungsi koreksi kavling lama menyalin harga kavling sebelumnya dan tidak
-- menghitung ulang tagihan. Digantikan Revisi Pesanan.
do $$
begin
  if to_regprocedure('public.correct_spk_lot(bigint,bigint,text)') is not null then
    revoke execute on function public.correct_spk_lot(bigint, bigint, text)
      from public, anon, authenticated;
  end if;
end $$;

commit;
