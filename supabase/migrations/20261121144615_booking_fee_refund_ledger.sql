begin;

-- A Booking Fee refund becomes a cash outflow only after the transfer succeeds.
-- Historical refunds retain NULL bank_reference when no reference was captured.
alter table public.booking_fee_refunds
  add column if not exists bank_reference text;

revoke all on public.booking_fee_refunds from anon;
revoke insert, update, delete on public.booking_fee_refunds from authenticated;
grant select on public.booking_fee_refunds to authenticated;

-- This helper is only used by the trusted trigger/RPC paths below.
revoke all on function public.ensure_booking_fee_refund(bigint) from public, anon, authenticated;

-- Remove the previous RPC shape so PostgREST cannot resolve ambiguous overloads.
revoke all on function public.record_booking_fee_refund(bigint, text, text, text) from public, anon, authenticated;
drop function if exists public.record_booking_fee_refund(bigint, text, text, text);

create function public.record_booking_fee_refund(
  p_payment_id bigint,
  p_proof_path text,
  p_refund_method text,
  p_refund_note text,
  p_bank_reference text,
  p_refunded_at timestamptz
)
returns public.booking_fee_refunds
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_payment public.payments%rowtype;
  v_refund public.booking_fee_refunds%rowtype;
  v_financial_id bigint;
  v_journal_id bigint;
  v_bank_reference text := nullif(btrim(coalesce(p_bank_reference, '')), '');
  v_proof_path text := nullif(btrim(coalesce(p_proof_path, '')), '');
begin
  if v_actor is null or not exists (
    select 1 from public.profiles p
    where p.id = v_actor and p.role in ('admin', 'owner')
  ) then
    raise exception 'Hanya Admin atau Owner yang dapat mencatat pengembalian.';
  end if;

  if v_proof_path is null then raise exception 'Bukti pengembalian wajib diunggah.'; end if;
  if p_refunded_at is null or p_refunded_at > now() then
    raise exception 'Tanggal dan waktu transfer pengembalian tidak valid.';
  end if;
  if not exists (
    select 1 from storage.objects o
    where o.bucket_id = 'payment-proofs' and o.name = v_proof_path
  ) then
    raise exception 'File bukti pengembalian tidak ditemukan di penyimpanan privat.';
  end if;

  select * into v_payment
  from public.payments p
  where p.id = p_payment_id
  for update;
  if not found or v_payment.payment_category <> 'Booking' then
    raise exception 'Pembayaran Booking Fee tidak ditemukan.';
  end if;
  if v_payment.status <> 'Confirmed' or v_payment.amount is null or v_payment.amount <= 0 then
    raise exception 'Refund hanya dapat dicatat setelah Booking Fee diterima dan diverifikasi.';
  end if;
  if v_payment.verified_at is not null and p_refunded_at < v_payment.verified_at then
    raise exception 'Waktu transfer refund tidak boleh mendahului verifikasi pembayaran.';
  end if;
  if not exists (
    select 1 from public.financial_transactions ft
    where ft.source_table = 'payments'
      and ft.source_id = v_payment.id
      and ft.flow_direction = 'inflow'
      and ft.status = 'posted'
      and ft.amount = v_payment.amount
  ) then
    raise exception 'Penerimaan Booking Fee belum tercatat di buku kas.';
  end if;

  v_refund := public.ensure_booking_fee_refund(v_payment.id);
  select * into v_refund
  from public.booking_fee_refunds r
  where r.id = v_refund.id
  for update;
  if v_refund.status <> 'Pending Refund' then
    raise exception 'Refund ini sudah pernah dibayarkan atau tidak lagi menunggu transfer.';
  end if;
  if v_refund.amount <> v_payment.amount then
    raise exception 'Nominal refund harus sama dengan Booking Fee yang diterima.';
  end if;
  if exists (
    select 1 from public.financial_transactions ft
    where ft.source_table = 'booking_fee_refunds' and ft.source_id = v_refund.id
  ) then
    raise exception 'Refund ini sudah memiliki transaksi buku kas.';
  end if;

  insert into public.financial_transactions (
    flow_direction, category, amount, source_table, source_id,
    idempotency_key, bank_reference, occurred_on, posted_at
  ) values (
    'outflow', 'Booking Fee Refund', v_refund.amount, 'booking_fee_refunds', v_refund.id,
    'booking-fee-refund:' || v_refund.id::text, v_bank_reference,
    (p_refunded_at at time zone 'Asia/Makassar')::date, p_refunded_at
  ) returning id into v_financial_id;

  insert into public.financial_journals (
    financial_transaction_id, journal_date, description, created_by
  ) values (
    v_financial_id,
    (p_refunded_at at time zone 'Asia/Makassar')::date,
    'Pengembalian Booking Fee #' || v_refund.id::text,
    v_actor
  ) returning id into v_journal_id;

  -- Clear the customer receipt liability and credit the cash/bank account.
  insert into public.financial_journal_lines (journal_id, account_code, debit, credit)
  values
    (v_journal_id, '2190', v_refund.amount, 0),
    (v_journal_id, '1010', 0, v_refund.amount);

  update public.booking_fee_refunds
  set status = 'Refunded',
      proof_path = v_proof_path,
      refund_method = nullif(btrim(coalesce(p_refund_method, '')), ''),
      refund_note = nullif(btrim(coalesce(p_refund_note, '')), ''),
      bank_reference = v_bank_reference,
      refunded_at = p_refunded_at,
      refunded_by = v_actor,
      updated_at = now()
  where id = v_refund.id
  returning * into v_refund;

  return v_refund;
end;
$$;

revoke all on function public.record_booking_fee_refund(bigint, text, text, text, text, timestamptz)
  from public, anon, authenticated;
grant execute on function public.record_booking_fee_refund(bigint, text, text, text, text, timestamptz)
  to authenticated;

-- Idempotent recovery for refunds already transferred before this migration.
do $$
declare
  v_refund public.booking_fee_refunds%rowtype;
  v_payment public.payments%rowtype;
  v_cash_transaction public.financial_transactions%rowtype;
  v_transaction_id bigint;
  v_journal_id bigint;
  v_line_count integer;
  v_debit_2190 bigint;
  v_credit_1010 bigint;
begin
  for v_refund in
    select * from public.booking_fee_refunds r
    where r.status = 'Refunded'
    order by r.id
    for update
  loop
    if v_refund.refunded_at is null or v_refund.amount <= 0 then
      raise exception 'Refund Refunded #% memiliki waktu atau nominal yang tidak valid.', v_refund.id;
    end if;
    if v_refund.proof_path is null or not exists (
      select 1 from storage.objects o
      where o.bucket_id = 'payment-proofs' and o.name = v_refund.proof_path
    ) then
      raise exception 'Refund Refunded #% tidak memiliki bukti transfer tersimpan.', v_refund.id;
    end if;

    select * into v_payment
    from public.payments p
    where p.id = v_refund.payment_id
    for update;
    if not found or v_payment.status <> 'Confirmed' or v_payment.payment_category <> 'Booking'
      or v_payment.amount <> v_refund.amount then
      raise exception 'Refund Refunded #% tidak cocok dengan pembayaran Booking Fee terkonfirmasi.', v_refund.id;
    end if;
    if not exists (
      select 1 from public.financial_transactions ft
      where ft.source_table = 'payments' and ft.source_id = v_payment.id
        and ft.flow_direction = 'inflow' and ft.status = 'posted' and ft.amount = v_payment.amount
    ) then
      raise exception 'Refund Refunded #% tidak memiliki pemasukan awal yang dibukukan.', v_refund.id;
    end if;

    select * into v_cash_transaction
    from public.financial_transactions ft
    where ft.source_table = 'booking_fee_refunds' and ft.source_id = v_refund.id
    for update;
    if found then
      if v_cash_transaction.flow_direction <> 'outflow'
        or v_cash_transaction.amount <> v_refund.amount
        or v_cash_transaction.status <> 'posted'
        or v_cash_transaction.idempotency_key <> 'booking-fee-refund:' || v_refund.id::text then
        raise exception 'Transaksi buku kas refund #% sudah ada tetapi nilainya tidak sesuai.', v_refund.id;
      end if;
      v_transaction_id := v_cash_transaction.id;
    else
      insert into public.financial_transactions (
        flow_direction, category, amount, source_table, source_id,
        idempotency_key, bank_reference, occurred_on, posted_at
      ) values (
        'outflow', 'Booking Fee Refund', v_refund.amount, 'booking_fee_refunds', v_refund.id,
        'booking-fee-refund:' || v_refund.id::text, v_refund.bank_reference,
        (v_refund.refunded_at at time zone 'Asia/Makassar')::date, v_refund.refunded_at
      ) returning id into v_transaction_id;
    end if;

    select j.id into v_journal_id
    from public.financial_journals j
    where j.financial_transaction_id = v_transaction_id
    for update;
    if not found then
      insert into public.financial_journals (
        financial_transaction_id, journal_date, description, created_by
      ) values (
        v_transaction_id,
        (v_refund.refunded_at at time zone 'Asia/Makassar')::date,
        'Pengembalian Booking Fee #' || v_refund.id::text,
        v_refund.refunded_by
      ) returning id into v_journal_id;

      insert into public.financial_journal_lines (journal_id, account_code, debit, credit)
      values
        (v_journal_id, '2190', v_refund.amount, 0),
        (v_journal_id, '1010', 0, v_refund.amount);
    else
      select count(*)::integer,
        coalesce(sum(debit) filter (where account_code = '2190'), 0),
        coalesce(sum(credit) filter (where account_code = '1010'), 0)
      into v_line_count, v_debit_2190, v_credit_1010
      from public.financial_journal_lines jl
      where jl.journal_id = v_journal_id;
      if v_line_count <> 2 or v_debit_2190 <> v_refund.amount or v_credit_1010 <> v_refund.amount then
        raise exception 'Jurnal refund #% sudah ada tetapi tidak sesuai atau tidak seimbang.', v_refund.id;
      end if;
    end if;
  end loop;
end;
$$;

commit;
