-- Store the WhatsApp number entered in the client SPK form on the customer
-- record, and link that record to the SPK request created in the same call.
drop function if exists public.create_client_spk_request(
  text, text, text, text, bigint, numeric, text, bigint, integer, numeric, text
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

  if p_lot_id is null
    or p_lot_price_snapshot is null
    or p_lot_price_snapshot < 0 then
    raise exception 'Data kavling atau harga tidak valid.';
  end if;

  if p_payment_method not in ('Cash', 'Installment') then
    raise exception 'Skema pembayaran tidak valid.';
  end if;

  if p_payment_method = 'Installment'
    and (p_payment_plan_id is null or p_months is null or p_months <= 0) then
    raise exception 'Pilih rencana tenor cicilan sebelum mengirim SPK.';
  end if;

  if not exists (
    select 1
    from public.lots
    where lots.id = p_lot_id
      and lower(btrim(lots.status)) in ('available', 'tersedia')
  ) then
    raise exception 'Kavling sudah tidak tersedia untuk pengajuan.';
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
    p_lot_price_snapshot,
    p_payment_method,
    p_payment_plan_id,
    p_months,
    p_monthly_payment,
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
  text, text, text, text, text, bigint, numeric, text, bigint, integer, numeric, text
) from public, anon;
grant execute on function public.create_client_spk_request(
  text, text, text, text, text, bigint, numeric, text, bigint, integer, numeric, text
) to authenticated;

notify pgrst, 'reload schema';
