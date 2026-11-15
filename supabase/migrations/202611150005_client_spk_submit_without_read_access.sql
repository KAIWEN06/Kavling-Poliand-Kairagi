-- Clients submit through this narrowly scoped function. They do not receive
-- SELECT access to spk_requests; the function returns only the new row id so
-- the app can attach the uploaded files.
create or replace function public.create_client_spk_request(
  p_customer_full_name text,
  p_customer_phone text,
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
    null,
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
  text, text, text, text, bigint, numeric, text, bigint, integer, numeric, text
) from public, anon;
grant execute on function public.create_client_spk_request(
  text, text, text, text, bigint, numeric, text, bigint, integer, numeric, text
) to authenticated;

-- Do not allow client inserts through the table API. Client submission goes
-- through the validation above, while existing admin/marketing policies stay.
drop policy if exists "client users can submit their own SPK requests"
  on public.spk_requests;
drop policy if exists "client users can read their own SPK requests"
  on public.spk_requests;
drop policy if exists "client users can delete eligible own SPK requests"
  on public.spk_requests;

-- A failed attachment upload can roll back only the caller's pending request,
-- without granting table-wide SELECT or DELETE access to client accounts.
create or replace function public.discard_client_spk_request(p_request_id bigint)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'client'
  ) then
    raise exception 'Hanya akun klien yang dapat membatalkan pengajuan sementara.';
  end if;

  delete from public.spk_requests
  where id = p_request_id
    and submission_source = 'Client'
    and submitted_by = auth.uid()
    and status = 'Submitted'
    and transaction_id is null;
end;
$$;

revoke all on function public.discard_client_spk_request(bigint)
  from public, anon;
grant execute on function public.discard_client_spk_request(bigint)
  to authenticated;

-- Document metadata can be inserted for the authenticated client's own new
-- request without granting that client SELECT access to spk_requests.
create or replace function public.client_owns_pending_spk_request(p_request_id bigint)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.spk_requests
    where spk_requests.id = p_request_id
      and spk_requests.submission_source = 'Client'
      and spk_requests.submitted_by = auth.uid()
      and spk_requests.status = 'Submitted'
  )
  and exists (
    select 1
    from public.profiles
    where profiles.id = auth.uid()
      and profiles.role = 'client'
  );
$$;

revoke all on function public.client_owns_pending_spk_request(bigint)
  from public, anon;
grant execute on function public.client_owns_pending_spk_request(bigint)
  to authenticated;

drop policy if exists "client users can add documents to their own SPK"
  on public.spk_request_documents;

create policy "client users can add documents to their own SPK"
  on public.spk_request_documents
  for insert
  to authenticated
  with check (
    uploaded_by = auth.uid()
    and public.client_owns_pending_spk_request(spk_request_id)
  );
