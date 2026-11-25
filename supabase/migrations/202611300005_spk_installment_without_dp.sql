-- Cicilan tanpa DP ("langsung cicil") pada pengajuan SPK.
--
-- Sebelumnya create_client_spk_request dan create_marketing_spk_request menolak
-- skema Installment bila DP = 0, sehingga SPK tidak bisa dibuat sebelum DP diisi.
-- Alur pembayaran setelahnya (submit_client_payment, guard_poliland_payment,
-- admin_complete_spk_step, guard_installment_confirmation) sudah menangani
-- down_payment = 0 sebagai pure cicilan, jadi hanya syarat DP di dua RPC ini
-- yang dilonggarkan menjadi 0 <= DP < harga kavling. Isi fungsi lain tidak berubah.

CREATE OR REPLACE FUNCTION public.create_client_spk_request(p_customer_full_name text, p_customer_phone text, p_customer_whatsapp_phone text, p_customer_email text, p_customer_address text, p_lot_id bigint, p_lot_price_snapshot numeric, p_payment_method text, p_payment_plan_id bigint, p_down_payment_amount numeric, p_months integer, p_monthly_payment numeric, p_notes text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_user_id uuid := auth.uid();
  v_user_email text := lower(btrim(coalesce(auth.jwt() ->> 'email', '')));
  v_customer_id bigint;
  v_customer public.customers%ROWTYPE;
  v_request_id bigint;
  v_lot_price numeric;
  v_down_payment numeric := coalesce(p_down_payment_amount, 0);
  v_months integer;
  v_margin_percent numeric := 0;
  v_principal numeric;
  v_monthly_payment numeric;
BEGIN

  -- 1. VALIDASI AKUN CLIENT
  IF v_user_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = v_user_id
      AND role = 'client'
  ) THEN
    RAISE EXCEPTION 'Hanya akun klien yang dapat mengirim SPK.';
  END IF;


  -- 2. CARI CUSTOMER BERDASARKAN USER ID
  SELECT *
  INTO v_customer
  FROM public.customers
  WHERE user_id = v_user_id
    AND registration_source = 'Client'
  FOR UPDATE;


  -- 3. JIKA BELUM TERHUBUNG, CARI CUSTOMER BERDASARKAN EMAIL
  IF NOT FOUND THEN

    IF v_user_email = '' THEN
      RAISE EXCEPTION 'Email akun tidak tersedia. Lengkapi profil terlebih dahulu.';
    END IF;

    SELECT *
    INTO v_customer
    FROM public.customers
    WHERE lower(btrim(email)) = v_user_email
      AND user_id IS NULL
      AND registration_source = 'Client'
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Data customer tidak ditemukan. Silakan lengkapi data diri melalui halaman Akun.';
    END IF;

    UPDATE public.customers
    SET
      user_id = v_user_id,
      updated_at = now()
    WHERE id = v_customer.id
      AND user_id IS NULL
    RETURNING * INTO v_customer;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Data customer sedang digunakan. Silakan muat ulang halaman.';
    END IF;

  END IF;

  v_customer_id := v_customer.id;


  -- 4. VALIDASI DATA CUSTOMER
  IF coalesce(btrim(v_customer.full_name), '') = ''
    OR coalesce(btrim(v_customer.phone), '') = ''
    OR coalesce(btrim(v_customer.address), '') = ''
  THEN
    RAISE EXCEPTION
      'Data diri belum lengkap. Lengkapi nama, nomor HP, dan alamat melalui halaman Akun.';
  END IF;

  IF p_payment_method NOT IN ('Cash', 'Installment') THEN
    RAISE EXCEPTION 'Skema pembayaran tidak valid.';
  END IF;


  -- 5. VALIDASI KAVLING DAN AMBIL HARGA DARI DATABASE
  -- Kunci baris kavling selama proses pengajuan.

  SELECT
    CASE
      WHEN coalesce(promo_price, 0) > 0
        AND (
          coalesce(cash_price, 0) <= 0
          OR promo_price < cash_price
        )
      THEN promo_price
      ELSE cash_price
    END
  INTO v_lot_price
  FROM public.lots
  WHERE id = p_lot_id
    AND lower(btrim(status)) IN ('available', 'tersedia')
  FOR UPDATE;

  IF NOT FOUND OR v_lot_price IS NULL OR v_lot_price <= 0 THEN
    RAISE EXCEPTION
      'Kavling sudah tidak tersedia atau harganya belum tersedia.';
  END IF;


  -- 6. CEGAH PENGAJUAN AKTIF GANDA PADA KAVLING YANG SAMA

  IF EXISTS (
    SELECT 1
    FROM public.spk_requests
    WHERE lot_id = p_lot_id
      AND status IN ('Submitted', 'Under Review', 'Approved')
  ) THEN
    RAISE EXCEPTION
      'Kavling sedang memiliki pengajuan SPK aktif. Silakan pilih kavling lain.';
  END IF;


  -- 7. HITUNG SKEMA PEMBAYARAN
  IF p_payment_method = 'Installment' THEN

    -- DP opsional: 0 berarti langsung cicil (tanpa DP).
    IF v_down_payment < 0 OR v_down_payment >= v_lot_price THEN
      RAISE EXCEPTION
        'Nominal DP harus Rp 0 (langsung cicil) atau lebih kecil dari harga kavling.';
    END IF;

    IF p_payment_plan_id IS NULL THEN
      RAISE EXCEPTION
        'Pilih rencana tenor cicilan sebelum mengirim SPK.';
    END IF;

    SELECT
      plans.months,
      coalesce(plans.margin_percent, 0)
    INTO
      v_months,
      v_margin_percent
    FROM public.lot_installments li
    JOIN public.payment_plans plans
      ON plans.id = li.plan_id
    WHERE li.lot_id = p_lot_id
      AND li.plan_id = p_payment_plan_id
      AND plans.months BETWEEN 1 AND 24
    ORDER BY li.id
    LIMIT 1;

    IF NOT FOUND THEN
      RAISE EXCEPTION
        'Tenor cicilan tidak tersedia untuk kavling ini.';
    END IF;

    v_principal := v_lot_price - v_down_payment;

    v_monthly_payment := floor(
      (
        v_principal
        + round(v_principal * v_margin_percent / 100)
      ) / v_months
    );

  ELSE

    v_down_payment := 0;
    v_months := NULL;
    v_monthly_payment := NULL;
    p_payment_plan_id := NULL;

  END IF;


  -- 8. BUAT PENGAJUAN SPK
  INSERT INTO public.spk_requests (
    customer_id,
    customer_full_name,
    customer_phone,
    customer_email,
    customer_address,
    lot_id,
    lot_price_snapshot,
    payment_method,
    payment_plan_id,
    down_payment_snapshot,
    down_payment_amount,
    months,
    monthly_payment,
    notes,
    status,
    submission_source,
    submitted_by
  )
  VALUES (
    v_customer_id,
    v_customer.full_name,
    v_customer.phone,
    v_customer.email,
    v_customer.address,
    p_lot_id,
    v_lot_price,
    p_payment_method,
    p_payment_plan_id,
    v_down_payment,
    v_down_payment,
    v_months,
    v_monthly_payment,
    nullif(btrim(coalesce(p_notes, '')), ''),
    'Submitted',
    'Client',
    v_user_id
  )
  RETURNING id INTO v_request_id;


  -- 9. TIDAK MENGUBAH STATUS KAVLING DI SINI.
  -- Kavling baru menjadi Booking setelah Admin menyetujui SPK.

  RETURN v_request_id;

END;
$function$;

CREATE OR REPLACE FUNCTION public.create_marketing_spk_request(p_customer_id bigint, p_lot_id bigint, p_payment_method text, p_payment_plan_id bigint, p_down_payment_amount numeric, p_notes text)
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
declare
  v_uid uuid := auth.uid();
  v_customer public.customers%rowtype;
  v_lot_price numeric;
  v_down numeric := coalesce(p_down_payment_amount, 0);
  v_months integer;
  v_margin numeric := 0;
  v_principal numeric;
  v_monthly numeric;
  v_request_id bigint;
begin
  if v_uid is null or not exists (select 1 from public.profiles where id = v_uid and role = 'marketing') then
    raise exception 'Hanya akun Marketing yang dapat mengajukan SPK melalui jalur ini.';
  end if;

  -- Klien harus milik Marketing yang login (klien mandiri/NULL ditolak).
  select * into v_customer from public.customers
  where id = p_customer_id and marketing_id = v_uid
  for update;
  if not found then
    raise exception 'Klien tidak ditemukan atau bukan klien Anda.';
  end if;
  if coalesce(btrim(v_customer.full_name), '') = '' or coalesce(btrim(v_customer.phone), '') = ''
     or coalesce(btrim(v_customer.address), '') = '' then
    raise exception 'Data klien belum lengkap (nama, nomor HP, alamat). Lengkapi data klien terlebih dahulu.';
  end if;

  if p_payment_method not in ('Cash', 'Installment') then
    raise exception 'Skema pembayaran tidak valid.';
  end if;

  -- Harga selalu dari database.
  select case when coalesce(promo_price, 0) > 0 and (coalesce(cash_price, 0) <= 0 or promo_price < cash_price)
              then promo_price else cash_price end
  into v_lot_price
  from public.lots
  where id = p_lot_id and lower(btrim(status)) in ('available', 'tersedia')
  for update;
  if not found or v_lot_price is null or v_lot_price <= 0 then
    raise exception 'Kavling sudah tidak tersedia atau harganya belum tersedia.';
  end if;

  if exists (select 1 from public.spk_requests
             where lot_id = p_lot_id and status in ('Submitted', 'Under Review', 'Approved')) then
    raise exception 'Kavling sedang memiliki pengajuan SPK aktif. Silakan pilih kavling lain.';
  end if;

  if p_payment_method = 'Installment' then
    -- DP opsional: 0 berarti langsung cicil (tanpa DP).
    if v_down < 0 or v_down >= v_lot_price then
      raise exception 'Nominal DP harus Rp 0 (langsung cicil) atau lebih kecil dari harga kavling.';
    end if;
    if p_payment_plan_id is null then
      raise exception 'Pilih rencana tenor cicilan sebelum mengirim SPK.';
    end if;
    select plans.months, coalesce(plans.margin_percent, 0)
    into v_months, v_margin
    from public.lot_installments li
    join public.payment_plans plans on plans.id = li.plan_id
    where li.lot_id = p_lot_id and li.plan_id = p_payment_plan_id and plans.months between 1 and 24
    order by li.id limit 1;
    if not found then
      raise exception 'Tenor cicilan tidak tersedia untuk kavling ini.';
    end if;
    v_principal := v_lot_price - v_down;
    v_monthly := floor((v_principal + round(v_principal * v_margin / 100)) / v_months);
  else
    v_down := 0; v_months := null; v_monthly := null; p_payment_plan_id := null; v_margin := null;
  end if;

  insert into public.spk_requests (
    marketing_id, customer_id, customer_full_name, customer_phone, customer_email, customer_address,
    lot_id, lot_price_snapshot, payment_method, payment_plan_id, margin_percent_snapshot,
    down_payment_snapshot, down_payment_amount, months, monthly_payment, notes,
    status, submission_source, submitted_by
  ) values (
    v_uid, v_customer.id, v_customer.full_name, v_customer.phone, v_customer.email, v_customer.address,
    p_lot_id, v_lot_price, p_payment_method, p_payment_plan_id, v_margin,
    v_down, v_down, v_months, v_monthly, nullif(btrim(coalesce(p_notes, '')), ''),
    'Submitted', 'Marketing', v_uid
  ) returning id into v_request_id;

  -- Status kavling tidak diubah di sini; baru menjadi Booking setelah Admin menyetujui.
  return v_request_id;
end;
$function$;
