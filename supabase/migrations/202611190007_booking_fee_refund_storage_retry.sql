begin;

drop policy if exists "Admin update booking fee refund proof" on storage.objects;
create policy "Admin update booking fee refund proof"
on storage.objects for update to authenticated
using (
  bucket_id = 'payment-proofs'
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'owner')
  )
)
with check (
  bucket_id = 'payment-proofs'
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'owner')
  )
);

drop policy if exists "Admin delete booking fee refund proof" on storage.objects;
create policy "Admin delete booking fee refund proof"
on storage.objects for delete to authenticated
using (
  bucket_id = 'payment-proofs'
  and exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and role in ('admin', 'owner')
  )
);

create or replace function public.record_booking_fee_refund(
  p_payment_id bigint,
  p_proof_path text,
  p_refund_method text,
  p_refund_note text
)
returns public.booking_fee_refunds
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_payment public.payments%rowtype;
  v_refund public.booking_fee_refunds%rowtype;
begin
  if v_actor is null or not exists (
    select 1
    from public.profiles
    where id = v_actor
      and role in ('admin', 'owner')
  ) then
    raise exception 'Hanya Admin atau Owner yang dapat mencatat pengembalian.';
  end if;

  if nullif(btrim(coalesce(p_proof_path, '')), '') is null then
    raise exception 'Bukti pengembalian wajib diunggah.';
  end if;

  select *
  into v_payment
  from public.payments
  where id = p_payment_id
    and payment_category = 'Booking'
  for update;

  if not found then
    raise exception 'Pembayaran Booking Fee tidak ditemukan.';
  end if;

  if v_payment.status not in ('Pending', 'Needs Reupload', 'Confirmed', 'Rejected') then
    raise exception 'Status pembayaran tidak mendukung pencatatan pengembalian.';
  end if;

  if v_payment.spk_request_id is null
    or v_payment.customer_id is null
    or coalesce(v_payment.amount, 0) <= 0
  then
    raise exception 'Data pembayaran Booking Fee tidak lengkap.';
  end if;

  insert into public.booking_fee_refunds (
    payment_id,
    spk_request_id,
    customer_id,
    amount,
    status,
    proof_path,
    refund_method,
    refund_note,
    refunded_at,
    refunded_by,
    updated_at
  ) values (
    v_payment.id,
    v_payment.spk_request_id,
    v_payment.customer_id,
    v_payment.amount,
    'Refunded',
    p_proof_path,
    nullif(btrim(coalesce(p_refund_method, '')), ''),
    nullif(btrim(coalesce(p_refund_note, '')), ''),
    now(),
    v_actor,
    now()
  )
  on conflict (payment_id) do update
  set
    spk_request_id = excluded.spk_request_id,
    customer_id = excluded.customer_id,
    amount = excluded.amount,
    status = 'Refunded',
    proof_path = excluded.proof_path,
    refund_method = excluded.refund_method,
    refund_note = excluded.refund_note,
    refunded_at = now(),
    refunded_by = v_actor,
    updated_at = now()
  returning * into v_refund;

  return v_refund;
end;
$$;

revoke all on function public.record_booking_fee_refund(bigint,text,text,text) from public, anon;
grant execute on function public.record_booking_fee_refund(bigint,text,text,text) to authenticated;

commit;
