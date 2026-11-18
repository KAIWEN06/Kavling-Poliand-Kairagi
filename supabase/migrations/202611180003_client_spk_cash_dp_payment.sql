-- Store a client-selected down payment on the SPK and record the actual
-- initial transfer (cash price or installment DP) instead of a fixed booking fee.
alter table public.spk_requests
  add column if not exists down_payment_amount numeric not null default 0;

drop function if exists public.create_client_spk_request(
  text, text, text, text, bigint, numeric, text, bigint, integer, numeric, text
);
drop function if exists public.create_client_spk_request(
  text, text, text, text, text, bigint, numeric, text, bigint, integer, numeric, text
);

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
  v_down_payment numeric := 0;
  v_months integer;
  v_margin_percent numeric := 0;
  v_principal numeric;
  v_monthly_payment numeric;
begin
  if v_user_id is null then
    raise exception 'Silakan masuk kembali untuk mengirim SPK.';
  end if;

  if not exists (
    select 1
    from public.profiles
    where profiles.id = v_user_id
      and profiles.role = 'client'
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

  select case
    when coalesce(lots.promo_price, 0) > 0
      and (coalesce(lots.cash_price, 0) <= 0 or lots.promo_price < lots.cash_price)
      then lots.promo_price
    else lots.cash_price
  end
  into v_lot_price
  from public.lots
  where lots.id = p_lot_id
    and lower(btrim(lots.status)) in ('available', 'tersedia');

  if not found then
    raise exception 'Kavling sudah tidak tersedia untuk pengajuan.';
  end if;
  if v_lot_price is null or v_lot_price <= 0 then
    raise exception 'Harga kavling belum tersedia.';
  end if;

  if p_payment_method = 'Installment' then
    if p_payment_plan_id is null then
      raise exception 'Pilih rencana tenor cicilan sebelum mengirim SPK.';
    end if;

    if p_down_payment_amount is null
      or p_down_payment_amount <= 0
      or p_down_payment_amount >= v_lot_price then
      raise exception 'Nominal DP harus lebih dari Rp 0 dan lebih kecil dari harga kavling.';
    end if;

    select plans.months, coalesce(plans.margin_percent, 0)
      into v_months, v_margin_percent
    from public.lot_installments as lot_plans
    join public.payment_plans as plans on plans.id = lot_plans.plan_id
    where lot_plans.lot_id = p_lot_id
      and lot_plans.plan_id = p_payment_plan_id
      and plans.months between 1 and 24
    order by lot_plans.id
    limit 1;

    if not found then
      raise exception 'Tenor cicilan yang dipilih tidak tersedia untuk kavling ini.';
    end if;

    v_down_payment := p_down_payment_amount;
    v_principal := v_lot_price - v_down_payment;
    v_monthly_payment := floor(
      (v_principal + round(v_principal * v_margin_percent / 100)) / v_months
    );
  else
    v_months := null;
    v_monthly_payment := null;
  end if;

  insert into public.customers (
    full_name,
    phone,
    whatsapp_phone,
    email,
    address
  ) values (
    btrim(p_customer_full_name),
    btrim(p_customer_phone),
    nullif(btrim(coalesce(p_customer_whatsapp_phone, '')), ''),
    nullif(btrim(coalesce(p_customer_email, '')), ''),
    btrim(p_customer_address)
  )
  returning id into v_customer_id;

  insert into public.spk_requests (
    marketing_id,
    customer_id,
    customer_full_name,
    customer_phone,
    customer_email,
    customer_address,
    lot_id,
    lot_price_snapshot,
    payment_method,
    payment_plan_id,
    down_payment_amount,
    months,
    monthly_payment,
    notes,
    status,
    reviewed_by,
    reviewed_at,
    approved_at,
    admin_note,
    rejection_reason,
    transaction_id,
    submission_source,
    submitted_by
  ) values (
    null,
    v_customer_id,
    btrim(p_customer_full_name),
    btrim(p_customer_phone),
    nullif(btrim(coalesce(p_customer_email, '')), ''),
    btrim(p_customer_address),
    p_lot_id,
    v_lot_price,
    p_payment_method,
    case when p_payment_method = 'Installment' then p_payment_plan_id else null end,
    v_down_payment,
    v_months,
    v_monthly_payment,
    p_notes,
    'Submitted',
    null,
    null,
    null,
    null,
    null,
    null,
    'Client',
    v_user_id
  )
  returning id into v_request_id;

  return v_request_id;
end;
$$;

revoke all on function public.create_client_spk_request(
  text, text, text, text, text, bigint, numeric, text, bigint, numeric, integer, numeric, text
) from public, anon;
grant execute on function public.create_client_spk_request(
  text, text, text, text, text, bigint, numeric, text, bigint, numeric, integer, numeric, text
) to authenticated;

create or replace function public.create_client_spk_initial_payment(p_request_id bigint)
returns bigint
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_request public.spk_requests%rowtype;
  v_payment_amount numeric;
  v_payment_category text;
  v_payment_id bigint;
  v_existing_amount numeric;
  v_existing_category text;
begin
  if v_user_id is null or not exists (
    select 1 from public.profiles
    where profiles.id = v_user_id and profiles.role = 'client'
  ) then
    raise exception 'Hanya akun klien yang dapat mengirim pembayaran SPK.';
  end if;

  select * into v_request
  from public.spk_requests
  where id = p_request_id
    and submitted_by = v_user_id
    and submission_source = 'Client'
    and status = 'Submitted'
  for update;

  if not found then
    raise exception 'SPK tidak ditemukan atau tidak dapat menerima pembayaran.';
  end if;

  if not exists (
    select 1 from public.spk_request_documents
    where spk_request_id = v_request.id
      and uploaded_by = v_user_id
      and document_type = 'Payment Proof'
  ) then
    raise exception 'Unggah bukti transfer sebelum mengirim SPK.';
  end if;

  if v_request.payment_method = 'Cash' then
    v_payment_amount := v_request.lot_price_snapshot;
    v_payment_category := 'Cash Purchase';
  elsif v_request.payment_method = 'Installment' then
    v_payment_amount := v_request.down_payment_amount;
    v_payment_category := 'Down Payment';
  else
    raise exception 'Skema pembayaran SPK tidak valid.';
  end if;

  if v_payment_amount is null or v_payment_amount <= 0 then
    raise exception 'Nominal pembayaran awal SPK tidak valid.';
  end if;

  select id, amount, payment_category
    into v_payment_id, v_existing_amount, v_existing_category
  from public.payments
  where spk_request_id = v_request.id
  order by id
  limit 1;

  if found then
    if v_existing_category = v_payment_category
      and v_existing_amount = v_payment_amount then
      return v_payment_id;
    end if;
    raise exception 'Pembayaran lain sudah tercatat untuk SPK ini.';
  end if;

  insert into public.payments (
    transaction_id,
    customer_id,
    lot_id,
    spk_request_id,
    amount,
    payment_method,
    payment_category,
    payment_date,
    note,
    status
  ) values (
    null,
    v_request.customer_id,
    v_request.lot_id,
    v_request.id,
    v_payment_amount,
    'Transfer Bank',
    v_payment_category,
    current_date,
    case
      when v_request.payment_method = 'Cash' then 'Pembayaran penuh dari pengajuan SPK'
      else 'Pembayaran DP dari pengajuan SPK'
    end,
    'Pending'
  )
  returning id into v_payment_id;

  return v_payment_id;
end;
$$;

revoke all on function public.create_client_spk_initial_payment(bigint)
  from public, anon;
grant execute on function public.create_client_spk_initial_payment(bigint)
  to authenticated;

notify pgrst, 'reload schema';
