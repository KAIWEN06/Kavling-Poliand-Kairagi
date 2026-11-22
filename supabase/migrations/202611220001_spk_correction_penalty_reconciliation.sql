begin;

-- The payment record has a separate verified transfer date. `payment_date` remains
-- available for legacy records and reports, while penalties use `transfer_date`.
alter table public.payments
  add column if not exists transfer_date date,
  add column if not exists submitted_at timestamptz not null default now();

create index if not exists payments_transfer_date_idx
  on public.payments (transfer_date)
  where status = 'Confirmed';

-- A correction creates a revised SPK instead of rewriting the original agreement.
create table if not exists public.spk_corrections (
  id bigint generated always as identity primary key,
  original_spk_request_id bigint not null references public.spk_requests(id) on delete restrict,
  revised_spk_request_id bigint not null unique references public.spk_requests(id) on delete restrict,
  original_lot_id bigint not null references public.lots(id) on delete restrict,
  revised_lot_id bigint not null references public.lots(id) on delete restrict,
  booking_payment_id bigint not null unique references public.payments(id) on delete restrict,
  reason text not null check (length(btrim(reason)) between 5 and 2000),
  corrected_by uuid not null references public.profiles(id) on delete restrict,
  corrected_at timestamptz not null default now(),
  check (original_spk_request_id <> revised_spk_request_id),
  check (original_lot_id <> revised_lot_id)
);
create index if not exists spk_corrections_original_idx
  on public.spk_corrections (original_spk_request_id, corrected_at desc);

create table if not exists public.installment_penalties (
  id bigint generated always as identity primary key,
  installment_schedule_id bigint not null unique references public.installment_schedules(id) on delete restrict,
  valid_transfer_date date,
  days_late integer not null default 0 check (days_late >= 0),
  daily_amount bigint not null default 20000 check (daily_amount = 20000),
  maximum_amount bigint not null default 1800000 check (maximum_amount = 1800000),
  amount bigint not null default 0 check (amount >= 0 and amount <= maximum_amount),
  status text not null default 'Pending' check (status in ('Pending', 'Paid', 'Waived')),
  calculated_at timestamptz not null default now(),
  waived_at timestamptz,
  waived_by uuid references public.profiles(id) on delete set null,
  waiver_reason text,
  check ((status <> 'Waived') or (waived_at is not null and waived_by is not null and waiver_reason is not null))
);
create index if not exists installment_penalties_pending_idx
  on public.installment_penalties (status, calculated_at desc)
  where status = 'Pending';

create table if not exists public.default_reviews (
  id bigint generated always as identity primary key,
  transaction_id bigint not null references public.lot_transactions(id) on delete restrict,
  installment_schedule_id bigint not null unique references public.installment_schedules(id) on delete restrict,
  status text not null default 'Under Review' check (status in ('Under Review', 'Confirmed', 'Dismissed', 'Cancelled')),
  detected_at timestamptz not null default now(),
  reviewed_at timestamptz,
  reviewed_by uuid references public.profiles(id) on delete set null,
  decision_note text,
  cancellation_request_id bigint references public.purchase_cancellation_requests(id) on delete set null
);
create index if not exists default_reviews_queue_idx
  on public.default_reviews (status, detected_at desc)
  where status = 'Under Review';

create table if not exists public.bank_reconciliations (
  id bigint generated always as identity primary key,
  financial_transaction_id bigint not null unique references public.financial_transactions(id) on delete restrict,
  bank_reference text not null,
  bank_transaction_date date not null,
  bank_amount bigint not null check (bank_amount > 0),
  status text not null default 'Matched' check (status in ('Matched', 'Mismatch', 'Needs Review')),
  resolution_note text,
  reconciled_by uuid not null references public.profiles(id) on delete restrict,
  reconciled_at timestamptz not null default now(),
  unique (bank_reference)
);
create index if not exists bank_reconciliations_status_idx
  on public.bank_reconciliations (status, bank_transaction_date desc);

alter table public.spk_corrections enable row level security;
alter table public.installment_penalties enable row level security;
alter table public.default_reviews enable row level security;
alter table public.bank_reconciliations enable row level security;
revoke all on public.spk_corrections, public.installment_penalties, public.default_reviews, public.bank_reconciliations from anon, authenticated;
grant select on public.spk_corrections, public.installment_penalties, public.default_reviews, public.bank_reconciliations to authenticated;

create or replace function public.is_finance_admin()
returns boolean language sql stable security definer set search_path = ''
as $$ select exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'owner')) $$;
revoke all on function public.is_finance_admin() from public, anon, authenticated;

drop policy if exists "Finance admins read SPK corrections" on public.spk_corrections;
create policy "Finance admins read SPK corrections" on public.spk_corrections for select to authenticated using (public.is_finance_admin());
drop policy if exists "Finance admins read penalties" on public.installment_penalties;
create policy "Finance admins read penalties" on public.installment_penalties for select to authenticated using (public.is_finance_admin());
drop policy if exists "Clients read own penalties" on public.installment_penalties;
create policy "Clients read own penalties" on public.installment_penalties for select to authenticated using (exists (
  select 1 from public.installment_schedules s join public.lot_transactions t on t.id = s.transaction_id join public.customers c on c.id = t.customer_id
  where s.id = installment_penalties.installment_schedule_id and c.user_id = (select auth.uid())
));
drop policy if exists "Finance admins read default reviews" on public.default_reviews;
create policy "Finance admins read default reviews" on public.default_reviews for select to authenticated using (public.is_finance_admin());
drop policy if exists "Finance admins read reconciliations" on public.bank_reconciliations;
create policy "Finance admins read reconciliations" on public.bank_reconciliations for select to authenticated using (public.is_finance_admin());

create or replace function public.correct_spk_lot(
  p_spk_request_id bigint,
  p_new_lot_id bigint,
  p_reason text
) returns bigint
language plpgsql security definer set search_path = '' as $$
declare
  v_actor uuid := auth.uid();
  v_original public.spk_requests%rowtype;
  v_transaction public.lot_transactions%rowtype;
  v_old_lot public.lots%rowtype;
  v_new_lot public.lots%rowtype;
  v_booking_payment public.payments%rowtype;
  v_revised_id bigint;
begin
  if not public.is_finance_admin() then raise exception 'Hanya Admin atau Owner yang dapat mengoreksi SPK.'; end if;
  if p_new_lot_id is null then raise exception 'Kavling pengganti tidak valid.'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 5 then raise exception 'Alasan koreksi wajib diisi (minimal 5 karakter).'; end if;
  select * into v_original from public.spk_requests where id = p_spk_request_id for update;
  if not found or v_original.status <> 'Approved' or v_original.transaction_id is null then raise exception 'Hanya SPK terkonfirmasi yang dapat dikoreksi.'; end if;
  if p_new_lot_id = v_original.lot_id then raise exception 'Kavling pengganti harus berbeda dari kavling sebelumnya.'; end if;
  select * into v_transaction from public.lot_transactions where id = v_original.transaction_id for update;
  if v_transaction.status = 'Cancelled' then raise exception 'Transaksi yang dibatalkan tidak dapat dikoreksi.'; end if;
  -- Deterministic locking order avoids deadlocks when two admins swap lots concurrently.
  if v_original.lot_id < p_new_lot_id then
    select * into v_old_lot from public.lots where id = v_original.lot_id for update;
    select * into v_new_lot from public.lots where id = p_new_lot_id for update;
  else
    select * into v_new_lot from public.lots where id = p_new_lot_id for update;
    select * into v_old_lot from public.lots where id = v_original.lot_id for update;
  end if;
  if not found or v_new_lot.status <> 'Available' then raise exception 'Kavling pengganti tidak tersedia.'; end if;
  if exists (select 1 from public.spk_requests s where s.lot_id = p_new_lot_id and s.status in ('Submitted','Under Review','Approved')) then raise exception 'Kavling pengganti masih terikat SPK aktif.'; end if;
  select * into v_booking_payment from public.payments
   where spk_request_id = v_original.id and payment_category = 'Booking' and status = 'Confirmed'
   order by id limit 1 for update;
  if not found or v_booking_payment.amount <> 1000000 then raise exception 'Pembayaran Booking Fee terkonfirmasi Rp1.000.000 tidak ditemukan.'; end if;
  insert into public.spk_requests (marketing_id, customer_id, customer_full_name, customer_phone, customer_email, customer_address, lot_id, lot_price_snapshot, payment_method, payment_plan_id, months, monthly_payment, margin_percent_snapshot, notes, status, reviewed_by, reviewed_at, approved_at, admin_note, transaction_id, submitted_at, submission_source, submitted_by, down_payment_snapshot, total_payment_snapshot, booking_fee_snapshot, notary_status, notary_note, down_payment_amount)
  values (v_original.marketing_id, v_original.customer_id, v_original.customer_full_name, v_original.customer_phone, v_original.customer_email, v_original.customer_address, p_new_lot_id, v_original.lot_price_snapshot, v_original.payment_method, v_original.payment_plan_id, v_original.months, v_original.monthly_payment, v_original.margin_percent_snapshot, coalesce(v_original.notes || E'\n', '') || 'Revisi dari ' || v_original.spk_number, 'Approved', v_actor, now(), now(), 'Koreksi kavling: ' || btrim(p_reason), v_original.transaction_id, now(), 'Admin', v_actor, v_original.down_payment_snapshot, v_original.total_payment_snapshot, 1000000, v_original.notary_status, v_original.notary_note, v_original.down_payment_amount)
  returning id into v_revised_id;
  update public.spk_requests set status = 'Cancelled', transaction_id = null, admin_note = coalesce(admin_note || E'\n', '') || 'Digantikan SPK revisi #' || v_revised_id, updated_at = now() where id = v_original.id;
  update public.payments set spk_request_id = v_revised_id where id = v_booking_payment.id;
  update public.lot_transactions set lot_id = p_new_lot_id, updated_at = now() where id = v_transaction.id;
  update public.lots set status = 'Available', customer_id = null, booking_date = null, sold_date = null, updated_at = now() where id = v_old_lot.id;
  update public.lots set status = 'Booking', customer_id = v_original.customer_id, booking_date = current_date, updated_at = now() where id = v_new_lot.id;
  insert into public.spk_corrections (original_spk_request_id, revised_spk_request_id, original_lot_id, revised_lot_id, booking_payment_id, reason, corrected_by)
  values (v_original.id, v_revised_id, v_old_lot.id, v_new_lot.id, v_booking_payment.id, btrim(p_reason), v_actor);
  return v_revised_id;
end; $$;

create or replace function public.calculate_installment_penalty(p_schedule_id bigint, p_valid_transfer_date date)
returns public.installment_penalties
language plpgsql security definer set search_path = '' as $$
declare v_schedule public.installment_schedules%rowtype; v_penalty public.installment_penalties%rowtype; v_days integer; v_amount bigint;
begin
  if not public.is_finance_admin() then raise exception 'Hanya Admin atau Owner yang dapat menghitung denda.'; end if;
  if p_valid_transfer_date is null then raise exception 'Tanggal transfer tervalidasi wajib diisi.'; end if;
  select * into v_schedule from public.installment_schedules where id = p_schedule_id for update;
  if not found then raise exception 'Jadwal cicilan tidak ditemukan.'; end if;
  v_days := greatest(p_valid_transfer_date - v_schedule.due_date, 0);
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
  where s.status <> 'Paid' and p_as_of > s.due_date + 90 and t.status <> 'Cancelled'
  on conflict (installment_schedule_id) do nothing;
  get diagnostics v_count = row_count; return v_count;
end; $$;

create or replace function public.waive_installment_penalties_for_transaction(p_transaction_id bigint, p_reason text)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if not public.is_finance_admin() then raise exception 'Hanya Admin atau Owner yang dapat membebaskan denda.'; end if;
  if length(btrim(coalesce(p_reason,''))) < 3 then raise exception 'Alasan pembebasan denda wajib diisi.'; end if;
  update public.installment_penalties ip set status='Waived', waived_at=now(), waived_by=auth.uid(), waiver_reason=btrim(p_reason)
  from public.installment_schedules s where s.id=ip.installment_schedule_id and s.transaction_id=p_transaction_id and ip.status='Pending';
  get diagnostics v_count = row_count; return v_count;
end; $$;

create or replace function public.reconcile_bank_transaction(p_financial_transaction_id bigint, p_bank_reference text, p_bank_transaction_date date, p_bank_amount bigint, p_resolution_note text default null)
returns public.bank_reconciliations
language plpgsql security definer set search_path = '' as $$
declare v_financial public.financial_transactions%rowtype; v_row public.bank_reconciliations%rowtype; v_status text;
begin
  if not public.is_finance_admin() then raise exception 'Hanya Admin atau Owner yang dapat melakukan rekonsiliasi.'; end if;
  if nullif(btrim(coalesce(p_bank_reference,'')), '') is null or p_bank_transaction_date is null or p_bank_amount is null or p_bank_amount <= 0 then raise exception 'Data mutasi bank belum lengkap.'; end if;
  select * into v_financial from public.financial_transactions where id=p_financial_transaction_id for update;
  if not found then raise exception 'Transaksi kas tidak ditemukan.'; end if;
  v_status := case when v_financial.amount = p_bank_amount then 'Matched' else 'Mismatch' end;
  insert into public.bank_reconciliations(financial_transaction_id,bank_reference,bank_transaction_date,bank_amount,status,resolution_note,reconciled_by)
  values(p_financial_transaction_id,btrim(p_bank_reference),p_bank_transaction_date,p_bank_amount,v_status,nullif(btrim(coalesce(p_resolution_note,'')),''),auth.uid())
  returning * into v_row; return v_row;
end; $$;

revoke all on function public.correct_spk_lot(bigint,bigint,text), public.calculate_installment_penalty(bigint,date), public.detect_installment_defaults(date), public.waive_installment_penalties_for_transaction(bigint,text), public.reconcile_bank_transaction(bigint,text,date,bigint,text) from public, anon;
grant execute on function public.correct_spk_lot(bigint,bigint,text), public.calculate_installment_penalty(bigint,date), public.detect_installment_defaults(date), public.waive_installment_penalties_for_transaction(bigint,text), public.reconcile_bank_transaction(bigint,text,date,bigint,text) to authenticated;

commit;
