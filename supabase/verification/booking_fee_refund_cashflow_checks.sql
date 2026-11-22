-- Read-only post-migration checks. These queries never alter remote data.

-- Every completed Booking Fee refund must have one matching posted outflow and one balanced journal.
select
  r.id as refund_id,
  r.payment_id,
  r.amount as refund_amount,
  r.status as refund_status,
  count(distinct ft.id) filter (
    where ft.flow_direction = 'outflow'
      and ft.status = 'posted'
      and ft.amount = r.amount
      and ft.idempotency_key = 'booking-fee-refund:' || r.id::text
  ) as matching_outflow_count,
  count(distinct j.id) as journal_count,
  coalesce(sum(jl.debit), 0) as journal_debit,
  coalesce(sum(jl.credit), 0) as journal_credit,
  r.bank_reference,
  ft.bank_reference as ledger_bank_reference
from public.booking_fee_refunds r
left join public.financial_transactions ft
  on ft.source_table = 'booking_fee_refunds' and ft.source_id = r.id
left join public.financial_journals j on j.financial_transaction_id = ft.id
left join public.financial_journal_lines jl on jl.journal_id = j.id
where r.status = 'Refunded'
group by r.id, r.payment_id, r.amount, r.status, r.bank_reference, ft.bank_reference
order by r.id;

-- Must return no rows: one source may not have multiple cash ledger entries.
select source_table, source_id, count(*) as transaction_count
from public.financial_transactions
where source_table = 'booking_fee_refunds'
group by source_table, source_id
having count(*) <> 1;

-- Must return no rows: no outflow is allowed for a refund that has not been transferred.
select r.id as refund_id, r.status, ft.id as financial_transaction_id
from public.booking_fee_refunds r
join public.financial_transactions ft
  on ft.source_table = 'booking_fee_refunds' and ft.source_id = r.id
where r.status <> 'Refunded' and ft.status = 'posted';

-- The original verified receipt remains in gross inflows after refund.
select r.id as refund_id, p.id as payment_id, p.status as payment_status,
  ft.id as receipt_transaction_id, ft.flow_direction, ft.amount, ft.status as ledger_status
from public.booking_fee_refunds r
join public.payments p on p.id = r.payment_id
left join public.financial_transactions ft
  on ft.source_table = 'payments' and ft.source_id = p.id
where r.status = 'Refunded'
order by r.id;

-- NULL references are intentionally visible for bank reconciliation; never fill them with invented values.
select id as refund_id, refunded_at, amount
from public.booking_fee_refunds
where status = 'Refunded' and bank_reference is null
order by id;
