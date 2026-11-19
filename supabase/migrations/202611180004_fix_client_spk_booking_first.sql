-- Booking Fee is the only payment created during Client SPK submission.
-- This migration preserves historical payments and does not touch payment ID 18.

create or replace function public.create_client_spk_request(
  p_customer_full_name text,
  p_customer_phone text,
  p_customer_whatsapp_phone text,
  p_customer_email text,
  p_customer_address text,
  p_lot_id bigint,
  p_lot_price_snapshot numeric,
  p_payment_method text,
  p_payment_plan_id bigint,
  p_down_payment_amount numeric,
  p_months integer,
  p_monthly_payment numeric,
  p_notes text
)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_customer_id bigint;
  v_request_id bigint;
  v_lot_price numeric;
  v_down_payment numeric := coalesce(p_down_payment_amount, 0);
  v_months integer;
  v_margin_percent numeric := 0;
  v_principal numeric;
  v_monthly_payment numeric;
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles
    where id = v_user_id and role = 'client'
  ) then
    raise exception 'Hanya akun klien yang dapat mengirim SPK.';
  end if;

  if coalesce(btrim(p_customer_full_name), '') = ''
    or coalesce(btrim(p_customer_phone), '') = ''
    or coalesce(btrim(p_customer_address), '') = '' then
    raise exception 'Nama, nomor kontak, dan alamat wajib diisi.';
  end if;

  if p_payment_method not in ('Cash', 'Installment') then
    raise exception 'Skema pembayaran tidak valid.';
  end if;

  select case when coalesce(promo_price, 0) > 0
    and (coalesce(cash_price, 0) <= 0 or promo_price < cash_price)
    then promo_price else cash_price end
  into v_lot_price
  from public.lots
  where id = p_lot_id and lower(btrim(status)) in ('available', 'tersedia')
  for update;

  if not found or v_lot_price is null or v_lot_price <= 0 then
    raise exception 'Kavling sudah tidak tersedia atau harganya belum tersedia.';
  end if;

  if v_down_payment <= 0 or v_down_payment >= v_lot_price then
    raise exception 'Nominal DP harus lebih dari Rp 0 dan lebih kecil dari harga kavling.';
  end if;

  if p_payment_method = 'Installment' then
    if p_payment_plan_id is null then
      raise exception 'Pilih rencana tenor cicilan sebelum mengirim SPK.';
    end if;
    select plans.months, coalesce(plans.margin_percent, 0)
      into v_months, v_margin_percent
    from public.lot_installments li
    join public.payment_plans plans on plans.id = li.plan_id
    where li.lot_id = p_lot_id and li.plan_id = p_payment_plan_id
      and plans.months between 1 and 24
    order by li.id limit 1;
    if not found then raise exception 'Tenor cicilan tidak tersedia untuk kavling ini.'; end if;
    v_principal := v_lot_price - v_down_payment;
    v_monthly_payment := floor((v_principal + round(v_principal * v_margin_percent / 100)) / v_months);
  else
    v_months := null;
    v_monthly_payment := null;
    p_payment_plan_id := null;
  end if;

  insert into public.customers (full_name, phone, whatsapp_phone, email, address)
  values (btrim(p_customer_full_name), btrim(p_customer_phone),
    nullif(btrim(coalesce(p_customer_whatsapp_phone, '')), ''),
    nullif(btrim(coalesce(p_customer_email, '')), ''), btrim(p_customer_address))
  returning id into v_customer_id;

  insert into public.spk_requests (
    customer_id, customer_full_name, customer_phone, customer_email, customer_address,
    lot_id, lot_price_snapshot, payment_method, payment_plan_id,
    down_payment_snapshot, down_payment_amount, months, monthly_payment,
    notes, status, submission_source, submitted_by
  ) values (
    v_customer_id, btrim(p_customer_full_name), btrim(p_customer_phone),
    nullif(btrim(coalesce(p_customer_email, '')), ''), btrim(p_customer_address),
    p_lot_id, v_lot_price, p_payment_method, p_payment_plan_id,
    v_down_payment, v_down_payment, v_months, v_monthly_payment,
    p_notes, 'Submitted', 'Client', v_user_id
  ) returning id into v_request_id;
  return v_request_id;
end;
$$;

create or replace function public.create_client_spk_initial_payment(p_request_id bigint)
returns bigint
language plpgsql security definer set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.spk_requests%rowtype;
  v_proof_path text;
  v_payment_id bigint;
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles where id = v_user_id and role = 'client'
  ) then raise exception 'Hanya akun klien yang dapat mengirim pembayaran SPK.'; end if;

  select * into v_request from public.spk_requests
  where id = p_request_id and submitted_by = v_user_id
    and submission_source = 'Client' and status = 'Submitted' for update;
  if not found then raise exception 'SPK tidak ditemukan atau tidak dapat menerima pembayaran.'; end if;

  select file_path into v_proof_path from public.spk_request_documents
  where spk_request_id = p_request_id and uploaded_by = v_user_id
    and document_type = 'Payment Proof' order by id desc limit 1;
  if v_proof_path is null then raise exception 'Unggah bukti Booking Fee sebelum mengirim SPK.'; end if;

  select id into v_payment_id from public.payments
  where spk_request_id = p_request_id and payment_category = 'Booking'
  order by id limit 1;
  if found then return v_payment_id; end if;

  insert into public.payments (
    customer_id, lot_id, spk_request_id, amount, payment_method,
    payment_category, payment_date, proof_path, note, status
  ) values (
    v_request.customer_id, v_request.lot_id, v_request.id,
    v_request.booking_fee_snapshot, 'Transfer Bank', 'Booking', current_date,
    v_proof_path, 'Booking Fee dari pengajuan SPK', 'Pending'
  ) returning id into v_payment_id;
  return v_payment_id;
end;
$$;

revoke all on function public.create_client_spk_request(text,text,text,text,text,bigint,numeric,text,bigint,numeric,integer,numeric,text) from public, anon;
grant execute on function public.create_client_spk_request(text,text,text,text,text,bigint,numeric,text,bigint,numeric,integer,numeric,text) to authenticated;
revoke all on function public.create_client_spk_initial_payment(bigint) from public, anon;
grant execute on function public.create_client_spk_initial_payment(bigint) to authenticated;

notify pgrst, 'reload schema';
