begin;

-- Cash ledger for verified receipts. Amounts are whole IDR (bigint).
-- The clearing account avoids assuming the company's revenue recognition policy.
create table if not exists public.financial_accounts (
  code text primary key,
  name text not null,
  account_type text not null check (account_type in ('asset', 'liability', 'equity', 'revenue', 'expense')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.financial_accounts (code, name, account_type) values
  ('1010', 'Kas dan Bank', 'asset'),
  ('2190', 'Penerimaan Pelanggan Belum Diklasifikasikan', 'liability')
on conflict (code) do nothing;

create table if not exists public.financial_transactions (
  id bigint generated always as identity primary key,
  flow_direction text not null check (flow_direction in ('inflow', 'outflow')),
  category text not null,
  amount bigint not null check (amount > 0),
  currency text not null default 'IDR' check (currency = 'IDR'),
  source_table text not null,
  source_id bigint not null,
  idempotency_key text not null unique,
  bank_reference text,
  occurred_on date not null,
  status text not null default 'posted' check (status in ('posted', 'reversed')),
  reversal_of bigint unique references public.financial_transactions(id) on delete restrict,
  posted_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (source_table, source_id)
);

create index if not exists financial_transactions_posted_date_idx
  on public.financial_transactions (occurred_on desc, id desc)
  where status = 'posted';

create unique index if not exists financial_transactions_bank_reference_key
  on public.financial_transactions (lower(btrim(bank_reference)))
  where bank_reference is not null;

create table if not exists public.financial_journals (
  id bigint generated always as identity primary key,
  financial_transaction_id bigint not null unique
    references public.financial_transactions(id) on delete restrict,
  journal_date date not null,
  description text not null,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create table if not exists public.financial_journal_lines (
  id bigint generated always as identity primary key,
  journal_id bigint not null references public.financial_journals(id) on delete restrict,
  account_code text not null references public.financial_accounts(code) on delete restrict,
  debit bigint not null default 0 check (debit >= 0),
  credit bigint not null default 0 check (credit >= 0),
  created_at timestamptz not null default now(),
  check ((debit > 0 and credit = 0) or (credit > 0 and debit = 0))
);

create index if not exists financial_journal_lines_journal_idx
  on public.financial_journal_lines (journal_id, id);

alter table public.financial_accounts enable row level security;
alter table public.financial_transactions enable row level security;
alter table public.financial_journals enable row level security;
alter table public.financial_journal_lines enable row level security;

drop policy if exists "Finance admins read chart of accounts" on public.financial_accounts;
create policy "Finance admins read chart of accounts"
on public.financial_accounts for select to authenticated
using (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role in ('admin', 'owner')
));

drop policy if exists "Finance admins read cash ledger" on public.financial_transactions;
create policy "Finance admins read cash ledger"
on public.financial_transactions for select to authenticated
using (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role in ('admin', 'owner')
));

drop policy if exists "Finance admins read journals" on public.financial_journals;
create policy "Finance admins read journals"
on public.financial_journals for select to authenticated
using (exists (
  select 1 from public.profiles p
  where p.id = (select auth.uid()) and p.role in ('admin', 'owner')
));

drop policy if exists "Finance admins read journal lines" on public.financial_journal_lines;
create policy "Finance admins read journal lines"
on public.financial_journal_lines for select to authenticated
using (exists (
  select 1 from public.profiles p
  join public.financial_journals j on j.id = financial_journal_lines.journal_id
  where p.id = (select auth.uid()) and p.role in ('admin', 'owner')
));

revoke all on public.financial_accounts, public.financial_transactions,
  public.financial_journals, public.financial_journal_lines from anon, authenticated;
grant select on public.financial_accounts, public.financial_transactions,
  public.financial_journals, public.financial_journal_lines to authenticated;

create or replace function public.prevent_financial_record_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Catatan keuangan bersifat tetap; koreksi harus dibuat sebagai transaksi reversal.';
end;
$$;

drop trigger if exists financial_transactions_immutable on public.financial_transactions;
create trigger financial_transactions_immutable
before update or delete on public.financial_transactions
for each row execute function public.prevent_financial_record_mutation();

drop trigger if exists financial_journals_immutable on public.financial_journals;
create trigger financial_journals_immutable
before update or delete on public.financial_journals
for each row execute function public.prevent_financial_record_mutation();

drop trigger if exists financial_journal_lines_immutable on public.financial_journal_lines;
create trigger financial_journal_lines_immutable
before update or delete on public.financial_journal_lines
for each row execute function public.prevent_financial_record_mutation();
revoke all on function public.prevent_financial_record_mutation() from public, anon, authenticated;

create or replace function public.assert_financial_journal_balanced()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_journal_id bigint := coalesce(new.journal_id, old.journal_id);
  v_debit bigint;
  v_credit bigint;
begin
  select coalesce(sum(debit), 0), coalesce(sum(credit), 0)
    into v_debit, v_credit
  from public.financial_journal_lines
  where journal_id = v_journal_id;

  if v_debit = 0 or v_debit <> v_credit then
    raise exception 'Jurnal % tidak seimbang (debit %, kredit %).', v_journal_id, v_debit, v_credit;
  end if;
  return null;
end;
$$;

drop trigger if exists financial_journal_balance_check on public.financial_journal_lines;
create constraint trigger financial_journal_balance_check
after insert or update or delete on public.financial_journal_lines
deferrable initially deferred
for each row execute function public.assert_financial_journal_balanced();
revoke all on function public.assert_financial_journal_balanced() from public, anon, authenticated;

create or replace function public.post_confirmed_payment_to_ledger(p_payment_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_payment public.payments%rowtype;
  v_financial_id bigint;
  v_journal_id bigint;
  v_category text;
  v_date date;
begin
  select * into v_payment
  from public.payments
  where id = p_payment_id and status = 'Confirmed';

  if not found then return; end if;
  if v_payment.amount is null or v_payment.amount <= 0 then
    raise exception 'Pembayaran terkonfirmasi harus memiliki nominal positif.';
  end if;

  v_category := coalesce(nullif(btrim(v_payment.payment_category), ''), 'Unclassified');
  v_date := coalesce(v_payment.payment_date, (v_payment.verified_at at time zone 'Asia/Makassar')::date, current_date);

  insert into public.financial_transactions (
    flow_direction, category, amount, source_table, source_id,
    idempotency_key, bank_reference, occurred_on, posted_at
  ) values (
    'inflow', v_category, v_payment.amount, 'payments', v_payment.id,
    'payment:' || v_payment.id::text, nullif(btrim(v_payment.reference_number), ''),
    v_date, coalesce(v_payment.verified_at, now())
  )
  on conflict (source_table, source_id) do nothing
  returning id into v_financial_id;

  if v_financial_id is null then return; end if;

  insert into public.financial_journals (
    financial_transaction_id, journal_date, description, created_by
  ) values (
    v_financial_id, v_date,
    'Penerimaan pembayaran ' || v_category || ' #' || v_payment.id::text,
    v_payment.verified_by
  ) returning id into v_journal_id;

  insert into public.financial_journal_lines (journal_id, account_code, debit, credit)
  values
    (v_journal_id, '1010', v_payment.amount, 0),
    (v_journal_id, '2190', 0, v_payment.amount);
end;
$$;

revoke all on function public.post_confirmed_payment_to_ledger(bigint) from public, anon, authenticated;

create or replace function public.capture_confirmed_payment_cashflow()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status = 'Confirmed'
    and (tg_op = 'INSERT' or old.status is distinct from new.status)
  then
    perform public.post_confirmed_payment_to_ledger(new.id);
  end if;
  return new;
end;
$$;

revoke all on function public.capture_confirmed_payment_cashflow() from public, anon, authenticated;

drop trigger if exists capture_confirmed_payment_cashflow on public.payments;
create trigger capture_confirmed_payment_cashflow
after insert or update of status on public.payments
for each row execute function public.capture_confirmed_payment_cashflow();

create or replace function public.reverse_financial_transaction(
  p_transaction_id bigint,
  p_reason text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_original public.financial_transactions%rowtype;
  v_reversal_id bigint;
  v_journal_id bigint;
begin
  if v_actor is null or not exists (
    select 1 from public.profiles
    where id = v_actor and role in ('admin', 'owner')
  ) then
    raise exception 'Hanya Admin atau Owner yang dapat membalik transaksi.';
  end if;
  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'Alasan reversal wajib diisi.';
  end if;

  select * into v_original
  from public.financial_transactions
  where id = p_transaction_id
  for update;
  if not found then raise exception 'Transaksi buku kas tidak ditemukan.'; end if;
  if v_original.reversal_of is not null then
    raise exception 'Reversal tidak dapat dibalik kembali.';
  end if;
  if v_original.source_table <> 'payments' then
    raise exception 'Reversal saat ini hanya mendukung penerimaan pembayaran client.';
  end if;
  if exists (select 1 from public.financial_transactions where reversal_of = p_transaction_id) then
    raise exception 'Transaksi ini sudah memiliki reversal.';
  end if;

  insert into public.financial_transactions (
    flow_direction, category, amount, source_table, source_id,
    idempotency_key, bank_reference, occurred_on, reversal_of
  ) values (
    case when v_original.flow_direction = 'inflow' then 'outflow' else 'inflow' end,
    v_original.category, v_original.amount, 'financial_reversal', v_original.id,
    'reversal:' || v_original.id::text, null,
    current_date, v_original.id
  ) returning id into v_reversal_id;

  insert into public.financial_journals (
    financial_transaction_id, journal_date, description, created_by
  ) values (
    v_reversal_id, current_date,
    'Reversal transaksi #' || v_original.id::text || ': ' || btrim(p_reason),
    v_actor
  ) returning id into v_journal_id;

  insert into public.financial_journal_lines (journal_id, account_code, debit, credit)
  select v_journal_id, account_code, credit, debit
  from public.financial_journal_lines
  where journal_id = (
    select id from public.financial_journals
    where financial_transaction_id = v_original.id
  );

  if not found then raise exception 'Jurnal transaksi sumber tidak ditemukan.'; end if;
  return v_reversal_id;
end;
$$;

revoke all on function public.reverse_financial_transaction(bigint, text) from public, anon;
grant execute on function public.reverse_financial_transaction(bigint, text) to authenticated;

create table if not exists public.purchase_cancellation_requests (
  id bigint generated always as identity primary key,
  transaction_id bigint not null references public.lot_transactions(id) on delete restrict,
  customer_id bigint not null references public.customers(id) on delete restrict,
  reason text not null check (length(btrim(reason)) between 5 and 2000),
  status text not null default 'Pending' check (status in ('Pending', 'Approved', 'Rejected')),
  decision_note text,
  reviewed_by uuid references public.profiles(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create unique index if not exists purchase_cancellation_one_pending_per_transaction
  on public.purchase_cancellation_requests (transaction_id)
  where status = 'Pending';
create index if not exists purchase_cancellation_customer_history_idx
  on public.purchase_cancellation_requests (customer_id, created_at desc);

create table if not exists public.purchase_refunds (
  id bigint generated always as identity primary key,
  cancellation_request_id bigint not null unique
    references public.purchase_cancellation_requests(id) on delete restrict,
  transaction_id bigint not null unique references public.lot_transactions(id) on delete restrict,
  customer_id bigint not null references public.customers(id) on delete restrict,
  eligible_payment_total bigint not null check (eligible_payment_total >= 0),
  amount bigint not null check (amount >= 0),
  status text not null check (status in ('Pending Transfer', 'Paid', 'Not Applicable')),
  approved_at timestamptz not null,
  due_date date not null,
  bank_reference text,
  proof_path text,
  transfer_date date,
  paid_at timestamptz,
  paid_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  check ((status = 'Paid' and bank_reference is not null and proof_path is not null and transfer_date is not null and paid_at is not null)
    or (status <> 'Paid' and paid_at is null))
);

create index if not exists purchase_refunds_due_idx
  on public.purchase_refunds (due_date, id)
  where status = 'Pending Transfer';

alter table public.purchase_cancellation_requests enable row level security;
alter table public.purchase_refunds enable row level security;
revoke all on public.purchase_cancellation_requests, public.purchase_refunds from anon, authenticated;
grant select on public.purchase_cancellation_requests, public.purchase_refunds to authenticated;

drop policy if exists "Clients and admins read purchase cancellations" on public.purchase_cancellation_requests;
create policy "Clients and admins read purchase cancellations"
on public.purchase_cancellation_requests for select to authenticated
using (
  customer_id in (select c.id from public.customers c where c.user_id = (select auth.uid()))
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'owner'))
);

drop policy if exists "Clients and admins read purchase refunds" on public.purchase_refunds;
create policy "Clients and admins read purchase refunds"
on public.purchase_refunds for select to authenticated
using (
  customer_id in (select c.id from public.customers c where c.user_id = (select auth.uid()))
  or exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role in ('admin', 'owner'))
);

create or replace function public.request_purchase_cancellation(
  p_transaction_id bigint,
  p_reason text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_user uuid := auth.uid();
  v_customer_id bigint;
  v_status text;
  v_request_id bigint;
begin
  if v_user is null then raise exception 'Sesi login tidak ditemukan.'; end if;
  if length(btrim(coalesce(p_reason, ''))) < 5 or length(btrim(p_reason)) > 2000 then
    raise exception 'Alasan pembatalan harus berisi 5 sampai 2000 karakter.';
  end if;

  select t.customer_id, t.status into v_customer_id, v_status
  from public.lot_transactions t
  join public.customers c on c.id = t.customer_id
  where t.id = p_transaction_id and c.user_id = v_user
  for update of t;

  if not found then raise exception 'Transaksi tidak ditemukan pada akun Anda.'; end if;
  if v_status = 'Cancelled' then raise exception 'Transaksi ini sudah dibatalkan.'; end if;
  if exists (
    select 1 from public.purchase_cancellation_requests r
    where r.transaction_id = p_transaction_id and r.status = 'Pending'
  ) then raise exception 'Pengajuan pembatalan transaksi ini masih menunggu pemeriksaan Admin.'; end if;

  insert into public.purchase_cancellation_requests (transaction_id, customer_id, reason)
  values (p_transaction_id, v_customer_id, btrim(p_reason))
  returning id into v_request_id;
  return v_request_id;
end;
$$;

create or replace function public.review_purchase_cancellation(
  p_request_id bigint,
  p_decision text,
  p_decision_note text
)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_request public.purchase_cancellation_requests%rowtype;
  v_transaction public.lot_transactions%rowtype;
  v_eligible bigint;
  v_refund_amount bigint;
  v_refund_id bigint;
  v_approved_at timestamptz := now();
  v_due_date date := ((now() at time zone 'Asia/Makassar')::date + 14);
begin
  if v_actor is null or not exists (
    select 1 from public.profiles where id = v_actor and role in ('admin', 'owner')
  ) then raise exception 'Hanya Admin atau Owner yang dapat meninjau pembatalan.'; end if;
  if p_decision not in ('Approved', 'Rejected') then raise exception 'Keputusan pembatalan tidak valid.'; end if;
  if length(btrim(coalesce(p_decision_note, ''))) < 3 then raise exception 'Catatan keputusan wajib diisi.'; end if;

  select * into v_request from public.purchase_cancellation_requests
  where id = p_request_id for update;
  if not found then raise exception 'Pengajuan pembatalan tidak ditemukan.'; end if;
  if v_request.status <> 'Pending' then raise exception 'Pengajuan ini sudah ditinjau.'; end if;

  select * into v_transaction from public.lot_transactions
  where id = v_request.transaction_id for update;
  if not found or v_transaction.customer_id <> v_request.customer_id then
    raise exception 'Transaksi pembelian tidak cocok dengan pengajuan.';
  end if;
  if v_transaction.status = 'Cancelled' then raise exception 'Transaksi ini sudah dibatalkan.'; end if;

  update public.purchase_cancellation_requests
  set status = p_decision,
      decision_note = btrim(p_decision_note),
      reviewed_by = v_actor,
      reviewed_at = v_approved_at
  where id = p_request_id;

  if p_decision = 'Rejected' then return null; end if;

  update public.lot_transactions
  set status = 'Cancelled',
      cancelled_date = (v_approved_at at time zone 'Asia/Makassar')::date,
      cancellation_reason = v_request.reason,
      updated_at = v_approved_at
  where id = v_transaction.id;
  -- Existing sync_lot_status_from_transaction trigger releases the linked lot atomically.

  select coalesce(sum(p.amount), 0)::bigint into v_eligible
  from public.payments p
  where p.transaction_id = v_transaction.id
    and p.status = 'Confirmed'
    and p.payment_category in ('Down Payment', 'Installment');
  v_refund_amount := v_eligible / 2;

  insert into public.purchase_refunds (
    cancellation_request_id, transaction_id, customer_id,
    eligible_payment_total, amount, status, approved_at, due_date
  ) values (
    v_request.id, v_transaction.id, v_request.customer_id,
    v_eligible, v_refund_amount,
    case when v_refund_amount = 0 then 'Not Applicable' else 'Pending Transfer' end,
    v_approved_at, v_due_date
  ) returning id into v_refund_id;

  return v_refund_id;
end;
$$;

create or replace function public.record_purchase_refund_payment(
  p_refund_id bigint,
  p_transfer_date date,
  p_bank_reference text,
  p_proof_path text
)
returns public.purchase_refunds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_refund public.purchase_refunds%rowtype;
  v_financial_id bigint;
  v_journal_id bigint;
begin
  if v_actor is null or not exists (
    select 1 from public.profiles where id = v_actor and role in ('admin', 'owner')
  ) then raise exception 'Hanya Admin atau Owner yang dapat mencatat transfer refund.'; end if;
  if nullif(btrim(coalesce(p_bank_reference, '')), '') is null then raise exception 'Referensi transfer refund wajib diisi.'; end if;
  if nullif(btrim(coalesce(p_proof_path, '')), '') is null then raise exception 'Bukti transfer refund wajib diunggah.'; end if;
  if p_transfer_date is null or p_transfer_date > (now() at time zone 'Asia/Makassar')::date then
    raise exception 'Tanggal transfer refund tidak valid.';
  end if;

  select * into v_refund from public.purchase_refunds where id = p_refund_id for update;
  if not found then raise exception 'Data refund tidak ditemukan.'; end if;
  if v_refund.status <> 'Pending Transfer' or v_refund.amount <= 0 then
    raise exception 'Refund ini tidak menunggu transfer.';
  end if;

  insert into public.financial_transactions (
    flow_direction, category, amount, source_table, source_id,
    idempotency_key, bank_reference, occurred_on
  ) values (
    'outflow', 'Refund Pembelian', v_refund.amount, 'purchase_refunds', v_refund.id,
    'purchase-refund:' || v_refund.id::text, btrim(p_bank_reference), p_transfer_date
  ) returning id into v_financial_id;

  insert into public.financial_journals (financial_transaction_id, journal_date, description, created_by)
  values (v_financial_id, p_transfer_date, 'Refund pembelian #' || v_refund.id::text, v_actor)
  returning id into v_journal_id;

  insert into public.financial_journal_lines (journal_id, account_code, debit, credit)
  values (v_journal_id, '2190', v_refund.amount, 0), (v_journal_id, '1010', 0, v_refund.amount);

  update public.purchase_refunds
  set status = 'Paid', bank_reference = btrim(p_bank_reference),
      proof_path = btrim(p_proof_path), transfer_date = p_transfer_date,
      paid_at = now(), paid_by = v_actor
  where id = p_refund_id
  returning * into v_refund;
  return v_refund;
end;
$$;

revoke all on function public.request_purchase_cancellation(bigint, text) from public, anon;
grant execute on function public.request_purchase_cancellation(bigint, text) to authenticated;
revoke all on function public.review_purchase_cancellation(bigint, text, text) from public, anon;
grant execute on function public.review_purchase_cancellation(bigint, text, text) to authenticated;
revoke all on function public.record_purchase_refund_payment(bigint, date, text, text) from public, anon;
grant execute on function public.record_purchase_refund_payment(bigint, date, text, text) to authenticated;

-- Deterministic one-time import. Source uniqueness and idempotency prevent duplicates.
do $$
declare
  v_payment_id bigint;
begin
  for v_payment_id in
    select id from public.payments where status = 'Confirmed' order by id
  loop
    perform public.post_confirmed_payment_to_ledger(v_payment_id);
  end loop;
end;
$$;

commit;
