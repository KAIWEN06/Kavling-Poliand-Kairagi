begin;

-- A BEFORE trigger must return the candidate row. This keeps the existing
-- allocation guard effective while preserving its concurrency protection.
create or replace function public.guard_active_payment_allocations()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
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

create or replace function public.detect_installment_defaults(p_as_of date default (now() at time zone 'Asia/Makassar')::date)
returns integer language plpgsql security definer set search_path = '' as $$
declare v_count integer;
begin
  if not public.is_finance_admin() then raise exception 'Hanya Admin atau Owner yang dapat menjalankan pemeriksaan wanprestasi.'; end if;
  insert into public.default_reviews (transaction_id, installment_schedule_id)
  select s.transaction_id, s.id from public.installment_schedules s join public.lot_transactions t on t.id = s.transaction_id
  where s.status <> 'Paid' and p_as_of >= s.due_date + 90 and t.status <> 'Cancelled'
  on conflict (installment_schedule_id) do nothing;
  get diagnostics v_count = row_count; return v_count;
end;
$$;

create or replace function public.review_payment_with_transfer_date(
  p_payment_id bigint,
  p_status text,
  p_review_note text,
  p_transfer_date date
) returns public.payments
language plpgsql security definer set search_path = '' as $$
declare v_payment public.payments%rowtype; v_schedule_id bigint;
begin
  if not public.is_finance_admin() then raise exception 'Hanya Admin atau Owner yang dapat memverifikasi pembayaran.'; end if;
  if p_status = 'Confirmed' and (p_transfer_date is null or p_transfer_date > (now() at time zone 'Asia/Makassar')::date) then
    raise exception 'Tanggal transfer tervalidasi wajib diisi dan tidak boleh di masa depan.';
  end if;
  v_payment := public.review_payment_atomically(p_payment_id, p_status, p_review_note, auth.uid());
  if p_status = 'Confirmed' then
    update public.payments set transfer_date = p_transfer_date where id = p_payment_id returning * into v_payment;
    for v_schedule_id in select installment_schedule_id from public.payment_allocations where payment_id = p_payment_id loop
      perform public.calculate_installment_penalty(v_schedule_id, p_transfer_date);
    end loop;
  end if;
  return v_payment;
end;
$$;

revoke all on function public.review_payment_with_transfer_date(bigint,text,text,date) from public, anon;
grant execute on function public.review_payment_with_transfer_date(bigint,text,text,date) to authenticated;

commit;
