-- Run after 202611210001_financial_cash_ledger.sql in the target database.
-- Read-only invariant checks; this script creates no fixtures and changes no rows.
do $$
begin
  if exists (
    select 1
    from public.payments p
    left join public.financial_transactions f
      on f.source_table = 'payments' and f.source_id = p.id
    where p.status = 'Confirmed' and f.id is null
  ) then
    raise exception 'FAIL: confirmed payment missing from cash ledger';
  end if;

  if exists (
    select j.id
    from public.financial_journals j
    left join public.financial_journal_lines l on l.journal_id = j.id
    group by j.id
    having coalesce(sum(l.debit), 0) = 0
      or coalesce(sum(l.debit), 0) <> coalesce(sum(l.credit), 0)
  ) then
    raise exception 'FAIL: unbalanced or empty financial journal';
  end if;

  if exists (
    select 1 from public.purchase_cancellation_requests c
    left join public.purchase_refunds r on r.cancellation_request_id = c.id
    where c.status = 'Approved' and r.id is null
  ) then
    raise exception 'FAIL: approved cancellation has no refund decision record';
  end if;

  if exists (
    select 1 from public.purchase_refunds r
    where r.amount <> floor(r.eligible_payment_total::numeric / 2)::bigint
  ) then
    raise exception 'FAIL: refund amount differs from 50 percent eligible amount';
  end if;

  if exists (
    select 1
    from public.purchase_refunds r
    left join public.financial_transactions f
      on f.source_table = 'purchase_refunds' and f.source_id = r.id
    where r.status = 'Paid' and f.id is null
  ) then
    raise exception 'FAIL: paid refund missing from cash ledger';
  end if;

  raise notice 'PASS: cash ledger, balanced journals, cancellation refund, and refund payout invariants';
end;
$$;
