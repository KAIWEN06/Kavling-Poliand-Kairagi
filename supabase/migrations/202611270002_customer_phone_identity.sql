-- =====================================================================
-- Satu identitas client lintas role: kunci nomor HP + verifikasi OTP
-- =====================================================================
-- Masalah: Marketing mengisi data client, lalu client mendaftar sendiri dan
-- mengisi data yang sama. Akibatnya ada dua baris customers tanpa hubungan.
--
-- Solusi:
--   1. Nomor HP/WhatsApp (dinormalisasi) unik di seluruh customers.
--   2. Client membuktikan kepemilikan nomor lewat OTP (WhatsApp atau SMS),
--      lalu baris prospek buatan Marketing ditautkan ke akunnya
--      (customers.user_id) alih-alih membuat baris baru.
--   3. Admin punya daftar kandidat duplikat dan fungsi gabung manual untuk
--      kasus nomor berbeda.
--
-- Pengiriman OTP dilakukan Edge Function (service_role). Kode OTP hanya
-- tersimpan sebagai hash. Migrasi ini tidak menyimpan rahasia penyedia pesan.
-- Aman dijalankan ulang (idempotent).
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Cek nomor ganda: client ikut boleh memeriksa
-- ---------------------------------------------------------------------
-- Client perlu tahu bahwa nomornya sudah ada agar UI menawarkan verifikasi.
-- Fungsi hanya mengembalikan boolean. Informasi yang sama terlihat dari
-- error unique index, jadi tidak ada kebocoran baru.
create or replace function public.customer_contact_exists(p_phone text, p_whatsapp text, p_exclude_id bigint default null)
returns boolean language sql stable security definer set search_path = '' as $$
  with k as (
    select public.normalize_id_phone(p_phone) a, public.normalize_id_phone(p_whatsapp) b
  )
  select public.current_app_role() in ('admin', 'owner', 'marketing', 'marketing_head', 'client') and exists (
    select 1 from public.customers c, k
    where (p_exclude_id is null or c.id <> p_exclude_id)
      and (k.a is not null or k.b is not null)
      and (public.normalize_id_phone(c.phone) in (k.a, k.b)
        or public.normalize_id_phone(c.whatsapp_phone) in (k.a, k.b)))
$$;
revoke all on function public.customer_contact_exists(text, text, bigint) from public, anon;
grant execute on function public.customer_contact_exists(text, text, bigint) to authenticated;

-- ---------------------------------------------------------------------
-- 2. Unique index pada nomor ternormalisasi
-- ---------------------------------------------------------------------
-- Gagal dibuat bila sudah ada data ganda. Jalankan
-- supabase/verification/customers_duplicate_audit.sql lebih dulu.
create unique index if not exists customers_phone_norm_uidx
  on public.customers (public.normalize_id_phone(phone))
  where public.normalize_id_phone(phone) is not null;
create unique index if not exists customers_whatsapp_norm_uidx
  on public.customers (public.normalize_id_phone(whatsapp_phone))
  where public.normalize_id_phone(whatsapp_phone) is not null;

-- ---------------------------------------------------------------------
-- 3. Guard trigger: cek nomor ganda untuk semua jalur, bukan hanya INSERT Marketing
-- ---------------------------------------------------------------------
create or replace function public.guard_customer_ownership()
returns trigger language plpgsql security invoker set search_path = '' as $$
declare
  v_role text;
begin
  if current_user not in ('authenticated', 'anon') then
    return new;
  end if;

  v_role := public.current_app_role();
  if v_role in ('admin', 'owner') then
    return new;
  end if;

  if tg_op = 'INSERT' then
    if v_role in ('marketing', 'marketing_head') then
      if v_role = 'marketing' then
        new.marketing_id := auth.uid();           -- tidak bisa diatribusikan ke Marketing lain
      elsif not public.is_marketing_team_member(new.marketing_id) then
        raise exception 'Pilih Marketing penanggung jawab dari tim Marketing.';
      end if;
      new.registration_source := 'Marketing';
      new.user_id := null;
      new.crm_status := coalesce(nullif(new.crm_status, ''), 'Baru');

      if public.customer_contact_exists(new.phone, new.whatsapp_phone, null) then
        raise exception 'Nomor kontak sudah terdaftar sebagai client lain. Hubungi Kepala Bagian Marketing atau Admin untuk penanganan.'
          using errcode = '23505', hint = 'phone_exists';
      end if;
    elsif v_role = 'client' then
      -- Client dengan nomor yang sudah ada harus memverifikasi nomor itu lebih dulu
      -- (claim_customer_by_verified_phone), bukan membuat baris baru.
      if public.customer_contact_exists(new.phone, new.whatsapp_phone, null) then
        raise exception 'Nomor ini sudah terdaftar. Verifikasi nomor Anda untuk menautkan data yang ada.'
          using errcode = '23505', hint = 'phone_needs_verification';
      end if;
    end if;
    return new;
  end if;

  -- UPDATE oleh non-admin
  if new.marketing_id is distinct from old.marketing_id then
    raise exception 'Marketing penanggung jawab hanya dapat diubah oleh Admin.';
  end if;
  if new.registration_source is distinct from old.registration_source then
    raise exception 'Sumber pendaftaran tidak dapat diubah.';
  end if;
  if new.user_id is distinct from old.user_id then
    -- Satu-satunya perubahan yang diizinkan: Client menautkan data lama ke akunnya sendiri.
    if not (v_role = 'client' and old.user_id is null and new.user_id = auth.uid()) then
      raise exception 'Tautan akun client tidak dapat diubah.';
    end if;
  end if;
  if new.crm_status is distinct from old.crm_status and v_role not in ('marketing', 'marketing_head') then
    raise exception 'Status perkembangan hanya dapat diubah tim Marketing atau Admin.';
  end if;

  -- Mengganti nomor ke nomor milik client lain ditolak (sebelumnya tidak dicek saat UPDATE).
  if (public.normalize_id_phone(new.phone) is distinct from public.normalize_id_phone(old.phone)
      or public.normalize_id_phone(new.whatsapp_phone) is distinct from public.normalize_id_phone(old.whatsapp_phone))
     and public.customer_contact_exists(new.phone, new.whatsapp_phone, new.id) then
    raise exception 'Nomor kontak sudah terdaftar sebagai client lain.'
      using errcode = '23505', hint = 'phone_exists';
  end if;
  return new;
end;
$$;

-- Prospek buatan Marketing yang sudah ditautkan ke akun client harus bisa diedit
-- client. Syarat registration_source = 'Client' dihapus karena trigger di atas
-- sudah melarang perubahan sumber pendaftaran oleh non-admin.
drop policy if exists "Client can update own customer data" on public.customers;
create policy "Client can update own customer data" on public.customers
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- 4. Tabel OTP, bukti verifikasi, dan log penggabungan
-- ---------------------------------------------------------------------
create table if not exists public.phone_otp_challenges (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_normalized text not null,
  channel text not null check (channel in ('whatsapp', 'sms')),
  code_hash text not null,
  attempts int not null default 0,
  max_attempts int not null default 5,
  expires_at timestamptz not null,
  consumed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists phone_otp_user_idx on public.phone_otp_challenges (user_id, created_at desc);
create index if not exists phone_otp_phone_idx on public.phone_otp_challenges (phone_normalized, created_at desc);

create table if not exists public.verified_phones (
  user_id uuid not null references auth.users(id) on delete cascade,
  phone_normalized text not null,
  verified_at timestamptz not null default now(),
  primary key (user_id, phone_normalized)
);

create table if not exists public.customer_merge_log (
  id bigint generated always as identity primary key,
  kept_customer_id bigint not null,
  dropped_customer_id bigint not null,
  dropped_snapshot jsonb not null,
  reason text,
  merged_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists customer_merge_log_kept_idx on public.customer_merge_log (kept_customer_id);

-- Tanpa policy: hanya fungsi SECURITY DEFINER dan service_role yang menyentuh tabel ini.
alter table public.phone_otp_challenges enable row level security;
alter table public.verified_phones enable row level security;
alter table public.customer_merge_log enable row level security;
revoke all on public.phone_otp_challenges, public.verified_phones, public.customer_merge_log from anon, authenticated;

drop policy if exists "Admin read merge log" on public.customer_merge_log;
create policy "Admin read merge log" on public.customer_merge_log
  for select to authenticated using (public.current_app_role() in ('admin', 'owner'));
grant select on public.customer_merge_log to authenticated;

-- ---------------------------------------------------------------------
-- 5. Membuat OTP (hanya Edge Function / service_role)
-- ---------------------------------------------------------------------
-- Mengembalikan kode polos satu kali agar Edge Function bisa mengirimnya.
-- Tidak boleh dapat dipanggil client, kalau tidak client bisa membaca kodenya sendiri.
create or replace function public.issue_phone_otp(p_user_id uuid, p_phone text, p_channel text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_norm text := public.normalize_id_phone(p_phone);
  v_id uuid := gen_random_uuid();
  v_bytes bytea := gen_random_bytes(4);
  v_code text;
  v_expires timestamptz := now() + interval '5 minutes';
begin
  if p_channel not in ('whatsapp', 'sms') then
    raise exception 'Saluran tidak dikenal.' using hint = 'otp_bad_channel';
  end if;
  if v_norm is null or v_norm !~ '^628[0-9]{7,11}$' then
    raise exception 'Nomor harus nomor seluler Indonesia.' using hint = 'otp_bad_phone';
  end if;
  if not exists (select 1 from public.profiles where id = p_user_id and role = 'client') then
    raise exception 'Hanya akun client yang dapat meminta OTP.' using hint = 'otp_forbidden';
  end if;

  -- Jeda kirim ulang 60 detik.
  if exists (select 1 from public.phone_otp_challenges
             where user_id = p_user_id and created_at > now() - interval '60 seconds') then
    raise exception 'Tunggu 60 detik sebelum meminta kode lagi.' using hint = 'otp_cooldown';
  end if;
  -- Batas per akun dan per nomor, agar nomor orang lain tidak bisa dibanjiri pesan.
  if (select count(*) from public.phone_otp_challenges
      where user_id = p_user_id and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Terlalu banyak permintaan kode. Coba lagi dalam satu jam.' using hint = 'otp_user_limit';
  end if;
  if (select count(*) from public.phone_otp_challenges
      where phone_normalized = v_norm and created_at > now() - interval '1 hour') >= 5 then
    raise exception 'Terlalu banyak permintaan untuk nomor ini. Coba lagi dalam satu jam.' using hint = 'otp_phone_limit';
  end if;

  -- Kode lama tidak berlaku lagi.
  update public.phone_otp_challenges set consumed_at = now()
  where user_id = p_user_id and consumed_at is null;

  v_code := lpad((((get_byte(v_bytes, 0)::bigint * 16777216) + (get_byte(v_bytes, 1) * 65536)
                   + (get_byte(v_bytes, 2) * 256) + get_byte(v_bytes, 3)) % 1000000)::text, 6, '0');

  insert into public.phone_otp_challenges (id, user_id, phone_normalized, channel, code_hash, expires_at)
  values (v_id, p_user_id, v_norm, p_channel,
          encode(digest(v_id::text || ':' || v_code, 'sha256'), 'hex'), v_expires);

  return jsonb_build_object('challenge_id', v_id, 'code', v_code, 'phone', v_norm,
                            'channel', p_channel, 'expires_at', v_expires);
end;
$$;
revoke all on function public.issue_phone_otp(uuid, text, text) from public, anon, authenticated;
grant execute on function public.issue_phone_otp(uuid, text, text) to service_role;

-- ---------------------------------------------------------------------
-- 6. Memeriksa OTP (dipanggil client)
-- ---------------------------------------------------------------------
-- Selalu mengembalikan jsonb (tidak raise) supaya hitungan percobaan tersimpan.
create or replace function public.verify_phone_otp(p_phone text, p_code text)
returns jsonb language plpgsql security definer set search_path = public, extensions as $$
declare
  v_uid uuid := auth.uid();
  v_norm text := public.normalize_id_phone(p_phone);
  v_ch public.phone_otp_challenges%rowtype;
begin
  if v_uid is null or public.current_app_role() <> 'client' then
    raise exception 'Tidak diizinkan.';
  end if;

  select * into v_ch from public.phone_otp_challenges
  where user_id = v_uid and phone_normalized = v_norm and consumed_at is null
  order by created_at desc limit 1
  for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'none');
  end if;
  if v_ch.expires_at < now() then
    update public.phone_otp_challenges set consumed_at = now() where id = v_ch.id;
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  update public.phone_otp_challenges set attempts = attempts + 1 where id = v_ch.id;
  if v_ch.attempts + 1 > v_ch.max_attempts then
    update public.phone_otp_challenges set consumed_at = now() where id = v_ch.id;
    return jsonb_build_object('ok', false, 'reason', 'locked');
  end if;

  if encode(digest(v_ch.id::text || ':' || coalesce(p_code, ''), 'sha256'), 'hex') <> v_ch.code_hash then
    return jsonb_build_object('ok', false, 'reason', 'wrong',
                              'attempts_left', greatest(v_ch.max_attempts - (v_ch.attempts + 1), 0));
  end if;

  update public.phone_otp_challenges set consumed_at = now() where id = v_ch.id;
  insert into public.verified_phones (user_id, phone_normalized, verified_at)
  values (v_uid, v_norm, now())
  on conflict (user_id, phone_normalized) do update set verified_at = excluded.verified_at;
  return jsonb_build_object('ok', true);
end;
$$;
revoke all on function public.verify_phone_otp(text, text) from public, anon;
grant execute on function public.verify_phone_otp(text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 7. Penggabungan baris customers (inti, tanpa grant ke siapa pun)
-- ---------------------------------------------------------------------
-- Memindahkan semua relasi yang menunjuk ke customers(id) secara dinamis,
-- jadi tabel baru yang ditambahkan nanti ikut terpindah.
create or replace function public.merge_customers_core(p_keep bigint, p_drop bigint, p_reason text, p_actor uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  k public.customers%rowtype;
  d public.customers%rowtype;
  fk record;
  v_drop_user uuid;
begin
  if p_keep = p_drop then raise exception 'Baris yang digabung harus berbeda.'; end if;
  select * into k from public.customers where id = p_keep for update;
  if not found then raise exception 'Data tujuan tidak ditemukan.'; end if;
  select * into d from public.customers where id = p_drop for update;
  if not found then raise exception 'Data yang digabung tidak ditemukan.'; end if;
  if k.user_id is not null and d.user_id is not null then
    raise exception 'Kedua data sudah tertaut ke akun berbeda dan tidak dapat digabung.';
  end if;

  insert into public.customer_merge_log (kept_customer_id, dropped_customer_id, dropped_snapshot, reason, merged_by)
  values (p_keep, p_drop, to_jsonb(d), p_reason, p_actor);

  -- Pindahkan semua relasi.
  for fk in
    select c.conrelid::regclass::text as tbl, a.attname as col
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = c.conkey[1]
    where c.contype = 'f' and c.confrelid = 'public.customers'::regclass
      and c.conrelid <> 'public.customer_merge_log'::regclass
  loop
    execute format('update %s set %I = $1 where %I = $2', fk.tbl, fk.col, fk.col) using p_keep, p_drop;
  end loop;

  -- Lepas tautan akun dari baris yang dibuang agar unique index user_id tidak bentrok.
  v_drop_user := d.user_id;

  -- Hapus baris sumber lebih dulu (semua relasi sudah dipindah). Bila tidak, mengisi
  -- nomor kosong pada baris tujuan akan bentrok dengan unique index nomor.
  delete from public.customers where id = p_drop;

  -- Lengkapi kolom kosong pada baris tujuan dari baris yang dibuang.
  update public.customers set
    user_id = coalesce(k.user_id, v_drop_user),
    marketing_id = coalesce(k.marketing_id, d.marketing_id),
    phone = coalesce(nullif(btrim(k.phone), ''), d.phone),
    whatsapp_phone = coalesce(nullif(btrim(k.whatsapp_phone), ''), d.whatsapp_phone),
    email = coalesce(nullif(btrim(k.email), ''), d.email),
    address = coalesce(nullif(btrim(k.address), ''), d.address),
    street_address = coalesce(nullif(btrim(k.street_address), ''), d.street_address),
    country_code = coalesce(k.country_code, d.country_code),
    country_name = coalesce(k.country_name, d.country_name),
    province_code = coalesce(k.province_code, d.province_code),
    province_name = coalesce(k.province_name, d.province_name),
    city_code = coalesce(k.city_code, d.city_code),
    city_name = coalesce(k.city_name, d.city_name),
    district_code = coalesce(k.district_code, d.district_code),
    district_name = coalesce(k.district_name, d.district_name),
    village_code = coalesce(k.village_code, d.village_code),
    village_name = coalesce(k.village_name, d.village_name),
    crm_status = case when k.crm_status = 'Baru' then d.crm_status else k.crm_status end,
    last_contacted_at = greatest(k.last_contacted_at, d.last_contacted_at),
    notes = nullif(concat_ws(E'\n', nullif(btrim(k.notes), ''), nullif(btrim(d.notes), '')), ''),
    updated_at = now()
  where id = p_keep;
end;
$$;
revoke all on function public.merge_customers_core(bigint, bigint, text, uuid) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 8. Client menautkan data lama ke akunnya setelah nomor terverifikasi
-- ---------------------------------------------------------------------
-- Mengembalikan id customer akhir, atau NULL bila tidak ada data lama
-- (client lalu membuat datanya seperti biasa).
create or replace function public.claim_customer_by_verified_phone(p_phone text)
returns bigint language plpgsql security definer set search_path = public as $$
declare
  v_uid uuid := auth.uid();
  v_norm text := public.normalize_id_phone(p_phone);
  v_mine bigint;
  v_target bigint;
  r record;
begin
  if v_uid is null or public.current_app_role() <> 'client' then
    raise exception 'Tidak diizinkan.';
  end if;
  if v_norm is null or not exists (
    select 1 from public.verified_phones
    where user_id = v_uid and phone_normalized = v_norm and verified_at > now() - interval '1 day'
  ) then
    raise exception 'Nomor belum diverifikasi.' using hint = 'phone_not_verified';
  end if;

  if exists (
    select 1 from public.customers
    where user_id is not null and user_id <> v_uid
      and (public.normalize_id_phone(phone) = v_norm or public.normalize_id_phone(whatsapp_phone) = v_norm)
  ) then
    raise exception 'Nomor ini sudah dipakai akun lain. Hubungi Admin.' using hint = 'phone_linked_other_account';
  end if;

  select id into v_mine from public.customers where user_id = v_uid;
  v_target := v_mine;

  for r in
    select id from public.customers
    where user_id is null and id is distinct from v_mine
      and (public.normalize_id_phone(phone) = v_norm or public.normalize_id_phone(whatsapp_phone) = v_norm)
    order by created_at, id
  loop
    if v_target is null then
      update public.customers set user_id = v_uid, updated_at = now() where id = r.id;
      v_target := r.id;
    else
      perform public.merge_customers_core(v_target, r.id, 'Verifikasi nomor oleh client', v_uid);
    end if;
  end loop;

  return v_target;
end;
$$;
revoke all on function public.claim_customer_by_verified_phone(text) from public, anon;
grant execute on function public.claim_customer_by_verified_phone(text) to authenticated;

-- ---------------------------------------------------------------------
-- 9. Admin: kandidat duplikat dan gabung manual (untuk nomor berbeda)
-- ---------------------------------------------------------------------
create or replace function public.list_duplicate_customer_candidates()
returns table (id_a bigint, id_b bigint, name_a text, name_b text, source_a text, source_b text, reasons text)
language plpgsql stable security definer set search_path = public as $$
begin
  if public.current_app_role() not in ('admin', 'owner') then
    raise exception 'Hanya Admin.';
  end if;
  return query
  with n as (
    select c.id, c.full_name, c.registration_source, c.user_id,
           lower(btrim(c.email)) em,
           public.normalize_id_phone(c.phone) p1, public.normalize_id_phone(c.whatsapp_phone) p2,
           lower(regexp_replace(btrim(c.full_name), '\s+', ' ', 'g')) nm
    from public.customers c
  )
  select a.id, b.id, a.full_name, b.full_name, a.registration_source, b.registration_source,
         concat_ws(', ',
           case when a.p1 in (b.p1, b.p2) or a.p2 in (b.p1, b.p2) then 'nomor sama' end,
           case when a.em <> '' and a.em = b.em then 'email sama' end,
           case when a.nm = b.nm then 'nama sama' end)
  from n a join n b on a.id < b.id
  where not (a.user_id is not null and b.user_id is not null)
    and ((a.p1 in (b.p1, b.p2) or a.p2 in (b.p1, b.p2))
      or (a.em <> '' and a.em = b.em)
      or a.nm = b.nm)
  order by a.id, b.id;
end;
$$;
revoke all on function public.list_duplicate_customer_candidates() from public, anon;
grant execute on function public.list_duplicate_customer_candidates() to authenticated;

create or replace function public.admin_merge_customers(p_keep bigint, p_drop bigint, p_reason text)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.current_app_role() not in ('admin', 'owner') then
    raise exception 'Hanya Admin yang dapat menggabungkan data client.';
  end if;
  if coalesce(btrim(p_reason), '') = '' then
    raise exception 'Alasan penggabungan wajib diisi.';
  end if;
  perform set_config('app.ownership_change_reason', 'Penggabungan data client: ' || btrim(p_reason), true);
  perform public.merge_customers_core(p_keep, p_drop, btrim(p_reason), auth.uid());
end;
$$;
revoke all on function public.admin_merge_customers(bigint, bigint, text) from public, anon;
grant execute on function public.admin_merge_customers(bigint, bigint, text) to authenticated;

-- ---------------------------------------------------------------------
-- 10. Pembersihan OTP lama
-- ---------------------------------------------------------------------
-- Dipanggil Edge Function setiap kali mengirim kode (pg_cron tidak aktif di proyek ini).
create or replace function public.purge_old_phone_otps()
returns void language sql security definer set search_path = public as $$
  delete from public.phone_otp_challenges where created_at < now() - interval '1 day';
  delete from public.verified_phones where verified_at < now() - interval '30 days';
$$;
revoke all on function public.purge_old_phone_otps() from public, anon, authenticated;
grant execute on function public.purge_old_phone_otps() to service_role;
