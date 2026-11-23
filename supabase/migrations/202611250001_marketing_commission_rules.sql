begin;

-- Aturan komisi Marketing
--  1. Saat SPK disetujui Admin, komisi 'Booking Fee' dicatat otomatis (status Pending):
--     50% x Booking Fee (Rp1.000.000) = Rp500.000 untuk Marketing pemilik SPK.
--  2. Komisi menjadi 'Eligible' (dapat dicairkan) setelah pembayaran kavling yang
--     terkonfirmasi, TANPA Booking Fee (DP + cicilan / pelunasan), mencapai >= 50% harga akhir.
--     Bila total turun di bawah 50% (mis. pembayaran ditolak ulang), status kembali Pending
--     selama belum dibayar.
--  3. Pencairan hanya lewat admin_pay_marketing_commission(): status Paid + jurnal buku kas
--     (Dr 5110 Beban Komisi Marketing / Cr 1010 Kas dan Bank) sebagai arus keluar
--     'Komisi Marketing', sehingga tampil di Buku Kas Admin & Owner.

insert into public.financial_accounts (code, name, account_type) values
  ('5110', 'Beban Komisi Marketing', 'expense')
on conflict (code) do nothing;

-- 1. Komisi dibuat saat SPK disetujui ------------------------------------------------
create or replace function public.trg_create_marketing_commission()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base bigint;
begin
  if new.status <> 'Approved' or new.transaction_id is null or new.marketing_id is null then
    return new;
  end if;
  if tg_op = 'UPDATE' and old.status = 'Approved' and old.transaction_id is not distinct from new.transaction_id then
    return new;
  end if;

  v_base := coalesce(new.booking_fee_snapshot, 1000000);

  insert into public.marketing_commissions (
    transaction_id, marketing_id, commission_type, base_amount,
    commission_rate, commission_amount, release_threshold_percent, status, notes
  ) values (
    new.transaction_id, new.marketing_id, 'Booking Fee', v_base,
    50, round(v_base * 50 / 100.0), 50, 'Pending',
    'Komisi SPK ' || new.spk_number || ': 50% dari Booking Fee, cair saat pembayaran kavling (di luar Booking Fee) mencapai 50%.'
  )
  on conflict (transaction_id, commission_type) do nothing;

  return new;
end;
$$;
revoke all on function public.trg_create_marketing_commission() from public, anon, authenticated;

drop trigger if exists trg_create_marketing_commission on public.spk_requests;
create trigger trg_create_marketing_commission
after insert or update of status, transaction_id on public.spk_requests
for each row execute function public.trg_create_marketing_commission();

-- 2. Hitung ulang kelayakan pencairan ----------------------------------------------
create or replace function public.refresh_marketing_commission_eligibility(p_transaction_id bigint)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_tx public.lot_transactions%rowtype;
  v_paid bigint;
  v_percent numeric;
begin
  if p_transaction_id is null then return; end if;

  select * into v_tx from public.lot_transactions where id = p_transaction_id;
  if not found then return; end if;

  if v_tx.status = 'Cancelled' then
    update public.marketing_commissions
    set status = 'Cancelled', updated_at = now()
    where transaction_id = p_transaction_id
      and status in ('Pending', 'Eligible', 'Processing');
    return;
  end if;

  select coalesce(sum(amount), 0) into v_paid
  from public.payments
  where transaction_id = p_transaction_id
    and status = 'Confirmed'
    and payment_category is distinct from 'Booking';

  v_percent := case when coalesce(v_tx.final_price, 0) > 0
                    then v_paid * 100.0 / v_tx.final_price else 0 end;

  update public.marketing_commissions
  set status = 'Eligible', updated_at = now()
  where transaction_id = p_transaction_id
    and status = 'Pending'
    and v_percent >= coalesce(release_threshold_percent, 50);

  update public.marketing_commissions
  set status = 'Pending', updated_at = now()
  where transaction_id = p_transaction_id
    and status = 'Eligible'
    and v_percent < coalesce(release_threshold_percent, 50);
end;
$$;
revoke all on function public.refresh_marketing_commission_eligibility(bigint) from public, anon, authenticated;

create or replace function public.trg_refresh_commission_after_payment()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' then
    perform public.refresh_marketing_commission_eligibility(old.transaction_id);
    return old;
  end if;
  perform public.refresh_marketing_commission_eligibility(new.transaction_id);
  if tg_op = 'UPDATE' and old.transaction_id is distinct from new.transaction_id then
    perform public.refresh_marketing_commission_eligibility(old.transaction_id);
  end if;
  return new;
end;
$$;
revoke all on function public.trg_refresh_commission_after_payment() from public, anon, authenticated;

drop trigger if exists trg_refresh_commission_after_payment on public.payments;
create trigger trg_refresh_commission_after_payment
after insert or delete or update of status, amount, transaction_id, payment_category on public.payments
for each row execute function public.trg_refresh_commission_after_payment();

create or replace function public.trg_refresh_commission_after_transaction()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform public.refresh_marketing_commission_eligibility(new.id);
  return new;
end;
$$;
revoke all on function public.trg_refresh_commission_after_transaction() from public, anon, authenticated;

drop trigger if exists trg_refresh_commission_after_transaction on public.lot_transactions;
create trigger trg_refresh_commission_after_transaction
after update of status, final_price on public.lot_transactions
for each row execute function public.trg_refresh_commission_after_transaction();

-- 3. Pencairan hanya lewat RPC (menjaga buku kas konsisten) ---------------------------
create or replace function public.guard_marketing_commission_payout()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'Paid' and old.status is distinct from 'Paid'
     and coalesce(current_setting('app.commission_payout', true), '') <> 'on' then
    raise exception 'Komisi hanya dapat dicairkan lewat pencatatan pencairan komisi.';
  end if;
  if old.status = 'Paid' and new.status is distinct from 'Paid' then
    raise exception 'Komisi yang sudah dibayarkan tidak dapat diubah.';
  end if;
  return new;
end;
$$;
revoke all on function public.guard_marketing_commission_payout() from public, anon, authenticated;

drop trigger if exists trg_guard_marketing_commission_payout on public.marketing_commissions;
create trigger trg_guard_marketing_commission_payout
before update on public.marketing_commissions
for each row execute function public.guard_marketing_commission_payout();

create or replace function public.admin_pay_marketing_commission(
  p_commission_id bigint,
  p_bank_reference text default null,
  p_paid_at timestamptz default now()
)
returns public.marketing_commissions
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
  v_commission public.marketing_commissions%rowtype;
  v_financial_id bigint;
  v_journal_id bigint;
  v_date date;
  v_reference text := nullif(btrim(coalesce(p_bank_reference, '')), '');
begin
  if v_actor is null or not exists (
    select 1 from public.profiles p where p.id = v_actor and p.role in ('admin', 'owner')
  ) then
    raise exception 'Hanya Admin atau Owner yang dapat mencatat pencairan komisi.';
  end if;

  if p_paid_at is null or p_paid_at > now() then
    raise exception 'Tanggal pencairan tidak valid.';
  end if;

  select * into v_commission
  from public.marketing_commissions where id = p_commission_id for update;
  if not found then raise exception 'Komisi tidak ditemukan.'; end if;
  if v_commission.status not in ('Eligible', 'Processing') then
    raise exception 'Komisi belum dapat dicairkan. Pembayaran kavling harus mencapai % persen terlebih dahulu.',
      coalesce(v_commission.release_threshold_percent, 50);
  end if;
  if v_commission.commission_amount <= 0 then
    raise exception 'Nominal komisi tidak valid.';
  end if;

  v_date := (p_paid_at at time zone 'Asia/Makassar')::date;

  insert into public.financial_transactions (
    flow_direction, category, amount, source_table, source_id,
    idempotency_key, bank_reference, occurred_on, posted_at
  ) values (
    'outflow', 'Komisi Marketing', v_commission.commission_amount, 'marketing_commissions', v_commission.id,
    'marketing-commission:' || v_commission.id::text, v_reference, v_date, p_paid_at
  ) returning id into v_financial_id;

  insert into public.financial_journals (financial_transaction_id, journal_date, description, created_by)
  values (v_financial_id, v_date, 'Pencairan komisi Marketing #' || v_commission.id::text, v_actor)
  returning id into v_journal_id;

  insert into public.financial_journal_lines (journal_id, account_code, debit, credit)
  values
    (v_journal_id, '5110', v_commission.commission_amount, 0),
    (v_journal_id, '1010', 0, v_commission.commission_amount);

  perform set_config('app.commission_payout', 'on', true);
  update public.marketing_commissions
  set status = 'Paid', paid_at = p_paid_at, paid_by = v_actor, updated_at = now()
  where id = v_commission.id
  returning * into v_commission;

  return v_commission;
end;
$$;
revoke all on function public.admin_pay_marketing_commission(bigint, text, timestamptz) from public, anon, authenticated;
grant execute on function public.admin_pay_marketing_commission(bigint, text, timestamptz) to authenticated;

-- 4. Backfill SPK yang sudah disetujui sebelum aturan ini --------------------------------
insert into public.marketing_commissions (
  transaction_id, marketing_id, commission_type, base_amount,
  commission_rate, commission_amount, release_threshold_percent, status, notes
)
select s.transaction_id, s.marketing_id, 'Booking Fee', coalesce(s.booking_fee_snapshot, 1000000),
       50, round(coalesce(s.booking_fee_snapshot, 1000000) * 50 / 100.0), 50, 'Pending',
       'Komisi SPK ' || s.spk_number || ': 50% dari Booking Fee, cair saat pembayaran kavling (di luar Booking Fee) mencapai 50%.'
from public.spk_requests s
where s.status = 'Approved' and s.transaction_id is not null and s.marketing_id is not null
on conflict (transaction_id, commission_type) do nothing;

select public.refresh_marketing_commission_eligibility(t.id)
from public.lot_transactions t
where exists (select 1 from public.marketing_commissions c where c.transaction_id = t.id);

commit;
