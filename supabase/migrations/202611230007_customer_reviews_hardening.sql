-- =====================================================================
-- Customer Reviews - penguatan keamanan (lanjutan 202611230006)
--
-- 1. Helpful wajib login (kunci perangkat anonim mudah dimanipulasi).
-- 2. Laporan anonim diberi batas anti-banjir tambahan di server.
-- 3. Bucket foto menjadi PRIVAT: foto ulasan pending/rejected/hidden
--    tidak bisa dibuka lewat URL. Publik hanya dapat membaca foto milik
--    ulasan berstatus approved (melalui signed URL).
-- Aman dijalankan berulang.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Helpful: hanya akun yang login
-- ---------------------------------------------------------------------
drop function if exists public.toggle_review_helpful(uuid, text);

create or replace function public.toggle_review_helpful(p_review_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid   uuid := (select auth.uid());
  v_key   text;
  v_voted boolean;
  v_count integer;
begin
  if v_uid is null then
    raise exception 'REVIEW_LOGIN_REQUIRED' using errcode = '28000';
  end if;
  v_key := 'u:' || v_uid::text;

  perform 1 from public.customer_reviews r
  where r.id = p_review_id and r.status = 'approved' and r.deleted_at is null
  for update;
  if not found then
    raise exception 'REVIEW_NOT_FOUND' using errcode = 'P0002';
  end if;

  if exists (select 1 from public.review_helpful_votes where review_id = p_review_id and voter_key = v_key) then
    delete from public.review_helpful_votes where review_id = p_review_id and voter_key = v_key;
    v_voted := false;
  else
    insert into public.review_helpful_votes (review_id, voter_key) values (p_review_id, v_key);
    v_voted := true;
  end if;

  select count(*) into v_count from public.review_helpful_votes where review_id = p_review_id;
  update public.customer_reviews set helpful_count = v_count where id = p_review_id;

  return jsonb_build_object('helpful_count', v_count, 'voted', v_voted);
end;
$$;

revoke all on function public.toggle_review_helpful(uuid) from public, anon;
grant execute on function public.toggle_review_helpful(uuid) to authenticated;

-- Bersihkan suara berbasis perangkat (jika ada) lalu hitung ulang.
delete from public.review_helpful_votes where voter_key like 'd:%';
update public.customer_reviews r
set helpful_count = (select count(*) from public.review_helpful_votes v where v.review_id = r.id);

-- ---------------------------------------------------------------------
-- 2. Laporan: batas anti-banjir untuk pelapor anonim
-- ---------------------------------------------------------------------
create or replace function public.report_review(
  p_review_id  uuid,
  p_reason     text,
  p_details    text default null,
  p_device_key text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_key text := case
    when (select auth.uid()) is not null then 'u:' || (select auth.uid())::text
    when p_device_key is not null and char_length(p_device_key) between 16 and 64 then 'd:' || p_device_key
    else null end;
begin
  if v_key is null then
    raise exception 'REVIEW_REPORTER_REQUIRED' using errcode = '22023';
  end if;
  if p_reason not in ('abusive', 'hate', 'spam', 'personal_info', 'irrelevant', 'scam', 'other') then
    raise exception 'REVIEW_INVALID_REASON' using errcode = '22023';
  end if;

  if not exists (
    select 1 from public.customer_reviews r
    where r.id = p_review_id and r.status = 'approved' and r.deleted_at is null
  ) then
    raise exception 'REVIEW_NOT_FOUND' using errcode = 'P0002';
  end if;

  -- Per kunci: maksimal 10 laporan per jam.
  if (
    select count(*) from public.review_reports rr
    where rr.reporter_key = v_key and rr.created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'REVIEW_RATE_LIMIT' using errcode = '53400';
  end if;

  if v_uid is null then
    -- Pelapor anonim tidak bisa diverifikasi: batasi total secara global
    -- dan per ulasan agar kunci perangkat palsu tidak membanjiri Admin.
    if (
      select count(*) from public.review_reports rr
      where rr.reporter_id is null and rr.created_at > now() - interval '1 hour'
    ) >= 30 then
      raise exception 'REVIEW_RATE_LIMIT' using errcode = '53400';
    end if;

    if (
      select count(*) from public.review_reports rr
      where rr.review_id = p_review_id and rr.reporter_id is null and rr.status = 'open'
    ) >= 5 then
      raise exception 'REVIEW_RATE_LIMIT' using errcode = '53400';
    end if;
  end if;

  insert into public.review_reports (review_id, reporter_id, reporter_key, reason, details)
  values (p_review_id, v_uid, v_key, p_reason, nullif(left(btrim(coalesce(p_details, '')), 500), ''))
  on conflict (review_id, reporter_key) do nothing;

  update public.customer_reviews r
  set report_count = (
    select count(*) from public.review_reports rr
    where rr.review_id = r.id and rr.status = 'open'
  )
  where r.id = p_review_id;
end;
$$;

-- ---------------------------------------------------------------------
-- 3. Bucket privat + akses baca foto hanya untuk ulasan approved
-- ---------------------------------------------------------------------
create or replace function public.review_photo_is_public(p_name text)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.customer_reviews r
    where r.status = 'approved'
      and r.deleted_at is null
      and p_name = any (r.photo_urls)
  );
$$;

revoke all on function public.review_photo_is_public(text) from public;
grant execute on function public.review_photo_is_public(text) to anon, authenticated;

update storage.buckets set public = false where id = 'review-photos';

drop policy if exists review_photos_public_approved_read on storage.objects;
create policy review_photos_public_approved_read on storage.objects
  for select to anon, authenticated
  using (
    bucket_id = 'review-photos'
    and (select public.review_photo_is_public(name))
  );
-- Policy lain (pemilik/admin baca, upload, hapus) dari migration 006 tetap berlaku.
