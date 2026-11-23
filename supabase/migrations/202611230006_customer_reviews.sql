-- =====================================================================
-- Customer Reviews (Ulasan Client) - PoliLand Kairagi
--
-- Alur: client kirim ulasan (pending) -> Admin moderasi -> approved
-- tampil di Home untuk semua pengunjung (tanpa login).
--
-- Prinsip keamanan:
--  * Publik TIDAK membaca tabel langsung. Data publik hanya lewat RPC
--    yang mengembalikan kolom aman (tanpa email/telepon/client_id).
--  * Client hanya boleh menulis kolom konten (column-level GRANT),
--    sehingga status/approved_by/helpful_count tidak bisa dimanipulasi.
--  * Semua moderasi lewat RPC SECURITY DEFINER yang memeriksa role Admin.
--  * Pemeriksaan konten (kata terlarang, link, kontak pribadi, spam)
--    berjalan di trigger database, bukan hanya di frontend.
--
-- Migration ini aditif: tidak mengubah tabel yang sudah dipakai.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 0. Helper role Admin
-- ---------------------------------------------------------------------
create or replace function public.is_review_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'owner')
  );
$$;

revoke all on function public.is_review_admin() from public, anon;
grant execute on function public.is_review_admin() to authenticated;

-- ---------------------------------------------------------------------
-- 1. Daftar kata terlarang (dapat dikembangkan Admin lewat tabel)
-- ---------------------------------------------------------------------
create table if not exists public.review_blocked_terms (
  id         bigint generated always as identity primary key,
  term       text not null check (char_length(btrim(term)) between 2 and 60),
  category   text not null check (category in ('profanity', 'hate', 'spam', 'scam')),
  is_active  boolean not null default true,
  created_at timestamptz not null default now()
);
create unique index if not exists review_blocked_terms_term_uniq
  on public.review_blocked_terms (lower(term));

alter table public.review_blocked_terms enable row level security;

revoke all on public.review_blocked_terms from anon, authenticated;
grant select, insert, update, delete on public.review_blocked_terms to authenticated;

create policy review_blocked_terms_admin_all on public.review_blocked_terms
  for all to authenticated
  using ((select public.is_review_admin()))
  with check ((select public.is_review_admin()));

-- Daftar awal (konfigurasi, bukan data dummy). Hanya menandai untuk
-- diperiksa Admin; tidak pernah menolak/memublikasikan otomatis.
insert into public.review_blocked_terms (term, category) values
  ('anjing', 'profanity'), ('bangsat', 'profanity'), ('bajingan', 'profanity'),
  ('brengsek', 'profanity'), ('sialan', 'profanity'), ('tolol', 'profanity'),
  ('goblok', 'profanity'), ('kontol', 'profanity'), ('memek', 'profanity'),
  ('ngentot', 'profanity'), ('kampret', 'profanity'), ('babi', 'profanity'),
  ('kafir', 'hate'),
  ('slot gacor', 'spam'), ('judi online', 'spam'), ('togel', 'spam'),
  ('pinjol', 'spam'), ('bonus deposit', 'spam'), ('jual followers', 'spam'),
  ('klik link', 'spam'),
  ('investasi bodong', 'scam'), ('hubungi wa', 'scam'), ('chat wa', 'scam'),
  ('dm saya', 'scam')
on conflict do nothing;

-- ---------------------------------------------------------------------
-- 2. Pemeriksaan konten awal -> daftar alasan (kosong = bersih)
--    Bukan keputusan akhir: hanya menandai "perlu pemeriksaan Admin".
-- ---------------------------------------------------------------------
create or replace function public.review_content_flags(p_text text)
returns text[]
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_text   text := coalesce(p_text, '');
  v_lower  text := lower(coalesce(p_text, ''));
  v_flags  text[] := '{}';
  v_letters integer;
  v_upper   integer;
  r record;
begin
  if v_lower ~ '(https?://|www\.|\m[a-z0-9-]+\.(com|net|org|id|xyz|info|biz|top|site|online)\M|wa\.me|bit\.ly|t\.me)' then
    v_flags := v_flags || 'tautan';
  end if;

  if v_text ~ '(\+62|\m0)8[0-9][0-9 .-]{7,12}' then
    v_flags := v_flags || 'nomor_telepon';
  end if;

  if v_lower ~ '[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}' then
    v_flags := v_flags || 'email';
  end if;

  if v_text ~ '(.)\1{7,}' then
    v_flags := v_flags || 'karakter_berulang';
  end if;

  v_letters := char_length(regexp_replace(v_text, '[^A-Za-z]', '', 'g'));
  v_upper   := char_length(regexp_replace(v_text, '[^A-Z]', '', 'g'));
  if v_letters >= 30 and v_upper::numeric / v_letters > 0.7 then
    v_flags := v_flags || 'huruf_kapital_berlebihan';
  end if;

  for r in
    select distinct t.category
    from public.review_blocked_terms t
    where t.is_active
      and v_lower ~ (
        '(^|[^[:alnum:]])'
        || regexp_replace(lower(t.term), '([.^$*+?()\[\]{}|\\])', '\\\1', 'g')
        || '($|[^[:alnum:]])'
      )
  loop
    v_flags := v_flags || ('kata_' || r.category);
  end loop;

  return v_flags;
end;
$$;

revoke all on function public.review_content_flags(text) from public, anon, authenticated;

-- ---------------------------------------------------------------------
-- 3. Tabel utama ulasan
-- ---------------------------------------------------------------------
create table if not exists public.customer_reviews (
  id               uuid primary key default gen_random_uuid(),
  client_id        uuid not null references public.profiles(id) on delete cascade,
  rating           smallint not null check (rating between 1 and 5),
  title            text not null check (char_length(btrim(title)) between 3 and 100),
  content          text not null check (char_length(btrim(content)) between 10 and 2000),
  photo_urls       text[] not null default '{}' check (cardinality(photo_urls) <= 3),
  recommend        boolean not null,
  status           text not null default 'pending'
                     check (status in ('pending', 'approved', 'rejected', 'hidden')),
  rejection_reason text,
  needs_attention  boolean not null default false,
  flag_reasons     text[] not null default '{}',
  approved_by      uuid references public.profiles(id) on delete set null,
  approved_at      timestamptz,
  moderated_by     uuid references public.profiles(id) on delete set null,
  moderated_at     timestamptz,
  helpful_count    integer not null default 0 check (helpful_count >= 0),
  report_count     integer not null default 0 check (report_count >= 0),
  deleted_at       timestamptz,
  deleted_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index if not exists customer_reviews_public_idx
  on public.customer_reviews (created_at desc)
  where status = 'approved' and deleted_at is null;
create index if not exists customer_reviews_client_idx
  on public.customer_reviews (client_id, created_at desc);
create index if not exists customer_reviews_status_idx
  on public.customer_reviews (status, created_at desc)
  where deleted_at is null;

-- ---------------------------------------------------------------------
-- 4. Laporan, vote helpful, riwayat moderasi
-- ---------------------------------------------------------------------
create table if not exists public.review_reports (
  id           bigint generated always as identity primary key,
  review_id    uuid not null references public.customer_reviews(id) on delete cascade,
  reporter_id  uuid references public.profiles(id) on delete set null,
  reporter_key text not null,
  reason       text not null
                 check (reason in ('abusive', 'hate', 'spam', 'personal_info', 'irrelevant', 'scam', 'other')),
  details      text check (details is null or char_length(details) <= 500),
  status       text not null default 'open' check (status in ('open', 'dismissed', 'actioned')),
  reviewed_by  uuid references public.profiles(id) on delete set null,
  reviewed_at  timestamptz,
  created_at   timestamptz not null default now(),
  unique (review_id, reporter_key)
);
create index if not exists review_reports_review_idx on public.review_reports (review_id, status);

create table if not exists public.review_helpful_votes (
  review_id  uuid not null references public.customer_reviews(id) on delete cascade,
  voter_key  text not null,
  created_at timestamptz not null default now(),
  primary key (review_id, voter_key)
);

create table if not exists public.review_moderation_logs (
  id         bigint generated always as identity primary key,
  review_id  uuid not null references public.customer_reviews(id) on delete cascade,
  admin_id   uuid references public.profiles(id) on delete set null,
  action     text not null,
  note       text,
  created_at timestamptz not null default now()
);
create index if not exists review_moderation_logs_review_idx
  on public.review_moderation_logs (review_id, created_at desc);

-- ---------------------------------------------------------------------
-- 5. Trigger penjaga: anti-spam, validasi foto, pemeriksaan konten
-- ---------------------------------------------------------------------
create or replace function public.customer_reviews_guard()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_path text;
begin
  new.title   := btrim(new.title);
  new.content := btrim(new.content);

  if tg_op = 'INSERT' then
    -- Status moderasi tidak pernah ditentukan pengguna.
    new.status := 'pending';
    new.rejection_reason := null;
    new.approved_by := null;
    new.approved_at := null;
    new.moderated_by := null;
    new.moderated_at := null;
    new.helpful_count := 0;
    new.report_count := 0;
    new.deleted_at := null;
    new.deleted_by := null;

    if exists (
      select 1 from public.customer_reviews r
      where r.client_id = new.client_id and r.status = 'pending' and r.deleted_at is null
    ) then
      raise exception 'REVIEW_ALREADY_PENDING' using errcode = '23505';
    end if;

    if (
      select count(*) from public.customer_reviews r
      where r.client_id = new.client_id and r.created_at > now() - interval '24 hours'
    ) >= 3 then
      raise exception 'REVIEW_RATE_LIMIT' using errcode = '53400';
    end if;

    if exists (
      select 1 from public.customer_reviews r
      where r.client_id = new.client_id
        and lower(btrim(r.content)) = lower(new.content)
        and r.deleted_at is null
    ) then
      raise exception 'REVIEW_DUPLICATE' using errcode = '23505';
    end if;
  else
    new.client_id := old.client_id;
  end if;

  -- Foto harus berada di folder milik penulis.
  foreach v_path in array new.photo_urls loop
    if v_path is null
       or char_length(v_path) > 200
       or v_path not like (new.client_id::text || '/%')
       or v_path like '%..%' then
      raise exception 'REVIEW_INVALID_PHOTO' using errcode = '22023';
    end if;
  end loop;

  if tg_op = 'INSERT'
     or new.title is distinct from old.title
     or new.content is distinct from old.content then
    new.flag_reasons := public.review_content_flags(new.title || E'\n' || new.content);
    new.needs_attention := cardinality(new.flag_reasons) > 0;
  end if;

  new.updated_at := now();
  return new;
end;
$$;

revoke all on function public.customer_reviews_guard() from public, anon, authenticated;

drop trigger if exists customer_reviews_guard_trg on public.customer_reviews;
create trigger customer_reviews_guard_trg
  before insert or update on public.customer_reviews
  for each row execute function public.customer_reviews_guard();

-- ---------------------------------------------------------------------
-- 6. RLS + column-level privilege
-- ---------------------------------------------------------------------
alter table public.customer_reviews     enable row level security;
alter table public.review_reports       enable row level security;
alter table public.review_helpful_votes enable row level security;
alter table public.review_moderation_logs enable row level security;

-- Tidak ada akses langsung untuk publik/anon pada semua tabel ulasan.
revoke all on public.customer_reviews       from anon, authenticated;
revoke all on public.review_reports         from anon, authenticated;
revoke all on public.review_helpful_votes   from anon, authenticated;
revoke all on public.review_moderation_logs from anon, authenticated;

-- Client: baca ulasan sendiri (tanpa kolom internal moderasi).
grant select (
  id, client_id, rating, title, content, photo_urls, recommend, status,
  rejection_reason, helpful_count, created_at, updated_at, approved_at
) on public.customer_reviews to authenticated;

-- Client: hanya kolom konten yang boleh ditulis.
grant insert (client_id, rating, title, content, photo_urls, recommend)
  on public.customer_reviews to authenticated;
grant update (rating, title, content, photo_urls, recommend)
  on public.customer_reviews to authenticated;
grant delete on public.customer_reviews to authenticated;

create policy customer_reviews_select_own on public.customer_reviews
  for select to authenticated
  using (client_id = (select auth.uid()));

create policy customer_reviews_insert_own on public.customer_reviews
  for insert to authenticated
  with check (
    client_id = (select auth.uid())
    and (select public.current_app_role()) = 'client'
  );

create policy customer_reviews_update_own_pending on public.customer_reviews
  for update to authenticated
  using (client_id = (select auth.uid()) and status = 'pending' and deleted_at is null)
  with check (client_id = (select auth.uid()) and status = 'pending');

create policy customer_reviews_delete_own on public.customer_reviews
  for delete to authenticated
  using (client_id = (select auth.uid()) and status in ('pending', 'rejected'));

-- review_reports / votes / logs: tanpa policy untuk anon & client
-- (RLS aktif = tertutup). Admin membaca lewat RPC SECURITY DEFINER.

-- ---------------------------------------------------------------------
-- 7. RPC publik (kolom aman saja)
-- ---------------------------------------------------------------------
create or replace function public.get_public_reviews(
  p_rating     integer default null,
  p_sort       text    default 'newest',
  p_limit      integer default 5,
  p_offset     integer default 0,
  p_device_key text    default null
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit  integer := least(greatest(coalesce(p_limit, 5), 1), 20);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_key    text := case
    when (select auth.uid()) is not null then 'u:' || (select auth.uid())::text
    when p_device_key is not null and char_length(p_device_key) between 16 and 64 then 'd:' || p_device_key
    else null end;
  v_total  integer;
  v_items  jsonb;
begin
  if p_rating is not null and p_rating not between 1 and 5 then
    p_rating := null;
  end if;

  select count(*) into v_total
  from public.customer_reviews r
  where r.status = 'approved' and r.deleted_at is null
    and (p_rating is null or r.rating = p_rating);

  select coalesce(jsonb_agg(x.item order by x.ord), '[]'::jsonb) into v_items
  from (
    select
      row_number() over (
        order by
          case when p_sort = 'highest' then r.rating end desc,
          case when p_sort = 'lowest'  then r.rating end asc,
          case when p_sort = 'oldest'  then r.created_at end asc,
          r.created_at desc
      ) as ord,
      jsonb_build_object(
        'id', r.id,
        'rating', r.rating,
        'title', r.title,
        'content', r.content,
        'photo_urls', r.photo_urls,
        'recommend', r.recommend,
        'helpful_count', r.helpful_count,
        'created_at', r.created_at,
        'author_name', coalesce(nullif(btrim(p.full_name), ''), 'Client PoliLand'),
        'author_avatar_url', p.avatar_url,
        'viewer_voted', exists (
          select 1 from public.review_helpful_votes v
          where v.review_id = r.id and v.voter_key = v_key
        )
      ) as item
    from public.customer_reviews r
    left join public.profiles p on p.id = r.client_id
    where r.status = 'approved' and r.deleted_at is null
      and (p_rating is null or r.rating = p_rating)
    order by
      case when p_sort = 'highest' then r.rating end desc,
      case when p_sort = 'lowest'  then r.rating end asc,
      case when p_sort = 'oldest'  then r.created_at end asc,
      r.created_at desc
    limit v_limit offset v_offset
  ) x;

  return jsonb_build_object('total', v_total, 'items', v_items);
end;
$$;

create or replace function public.get_public_review_stats()
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'total', count(*),
    'average', case when count(*) = 0 then null else round(avg(r.rating)::numeric, 1) end,
    'recommend_yes', count(*) filter (where r.recommend),
    'distribution', jsonb_build_object(
      '1', count(*) filter (where r.rating = 1),
      '2', count(*) filter (where r.rating = 2),
      '3', count(*) filter (where r.rating = 3),
      '4', count(*) filter (where r.rating = 4),
      '5', count(*) filter (where r.rating = 5)
    )
  )
  from public.customer_reviews r
  where r.status = 'approved' and r.deleted_at is null;
$$;

-- Helpful: satu suara per akun/perangkat, toggle.
create or replace function public.toggle_review_helpful(
  p_review_id  uuid,
  p_device_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_key   text := case
    when (select auth.uid()) is not null then 'u:' || (select auth.uid())::text
    when p_device_key is not null and char_length(p_device_key) between 16 and 64 then 'd:' || p_device_key
    else null end;
  v_voted boolean;
  v_count integer;
begin
  if v_key is null then
    raise exception 'REVIEW_VOTER_REQUIRED' using errcode = '22023';
  end if;

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

-- Laporan: pengunjung (tanpa login) boleh melapor, dibatasi per kunci.
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

  if (
    select count(*) from public.review_reports rr
    where rr.reporter_key = v_key and rr.created_at > now() - interval '1 hour'
  ) >= 10 then
    raise exception 'REVIEW_RATE_LIMIT' using errcode = '53400';
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
-- 8. RPC Admin
-- ---------------------------------------------------------------------
create or replace function public.admin_list_reviews(
  p_tab    text    default 'all',
  p_limit  integer default 20,
  p_offset integer default 0
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_limit  integer := least(greatest(coalesce(p_limit, 20), 1), 50);
  v_offset integer := greatest(coalesce(p_offset, 0), 0);
  v_total  integer;
  v_items  jsonb;
  v_counts jsonb;
begin
  if not public.is_review_admin() then
    raise exception 'ADMIN_ROLE_REQUIRED' using errcode = '42501';
  end if;

  select jsonb_build_object(
    'all',       count(*),
    'pending',   count(*) filter (where status = 'pending'),
    'published', count(*) filter (where status = 'approved'),
    'rejected',  count(*) filter (where status = 'rejected'),
    'reported',  count(*) filter (where report_count > 0)
  ) into v_counts
  from public.customer_reviews where deleted_at is null;

  select count(*) into v_total
  from public.customer_reviews r
  where r.deleted_at is null and (
    p_tab = 'all'
    or (p_tab = 'pending'   and r.status = 'pending')
    or (p_tab = 'published' and r.status = 'approved')
    or (p_tab = 'rejected'  and r.status = 'rejected')
    or (p_tab = 'reported'  and r.report_count > 0)
  );

  select coalesce(jsonb_agg(x.item order by x.ord), '[]'::jsonb) into v_items
  from (
    select
      row_number() over (
        order by (r.status = 'pending') desc, r.needs_attention desc, r.created_at desc
      ) as ord,
      jsonb_build_object(
        'id', r.id,
        'client_name', coalesce(nullif(btrim(p.full_name), ''), 'Client PoliLand'),
        'client_avatar_url', p.avatar_url,
        'rating', r.rating,
        'title', r.title,
        'content', r.content,
        'photo_urls', r.photo_urls,
        'recommend', r.recommend,
        'status', r.status,
        'rejection_reason', r.rejection_reason,
        'needs_attention', r.needs_attention,
        'flag_reasons', r.flag_reasons,
        'approved_at', r.approved_at,
        'approved_by_name', ap.full_name,
        'helpful_count', r.helpful_count,
        'report_count', r.report_count,
        'created_at', r.created_at,
        'reports', coalesce((
          select jsonb_agg(jsonb_build_object(
            'id', rr.id,
            'reason', rr.reason,
            'details', rr.details,
            'status', rr.status,
            'reporter_name', coalesce(rp.full_name, 'Pengunjung'),
            'created_at', rr.created_at
          ) order by rr.created_at desc)
          from public.review_reports rr
          left join public.profiles rp on rp.id = rr.reporter_id
          where rr.review_id = r.id
        ), '[]'::jsonb),
        'history', coalesce((
          select jsonb_agg(jsonb_build_object(
            'action', l.action,
            'note', l.note,
            'admin_name', coalesce(lp.full_name, 'Admin'),
            'created_at', l.created_at
          ) order by l.created_at desc)
          from public.review_moderation_logs l
          left join public.profiles lp on lp.id = l.admin_id
          where l.review_id = r.id
        ), '[]'::jsonb)
      ) as item
    from public.customer_reviews r
    left join public.profiles p  on p.id  = r.client_id
    left join public.profiles ap on ap.id = r.approved_by
    where r.deleted_at is null and (
      p_tab = 'all'
      or (p_tab = 'pending'   and r.status = 'pending')
      or (p_tab = 'published' and r.status = 'approved')
      or (p_tab = 'rejected'  and r.status = 'rejected')
      or (p_tab = 'reported'  and r.report_count > 0)
    )
    order by (r.status = 'pending') desc, r.needs_attention desc, r.created_at desc
    limit v_limit offset v_offset
  ) x;

  return jsonb_build_object('total', v_total, 'counts', v_counts, 'items', v_items);
end;
$$;

create or replace function public.admin_moderate_review(
  p_review_id uuid,
  p_action    text,
  p_note      text default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_admin  uuid := (select auth.uid());
  v_note   text := nullif(left(btrim(coalesce(p_note, '')), 500), '');
  v_review public.customer_reviews%rowtype;
begin
  if not public.is_review_admin() then
    raise exception 'ADMIN_ROLE_REQUIRED' using errcode = '42501';
  end if;
  if p_action not in ('approve', 'reject', 'hide', 'restore', 'delete', 'dismiss_reports') then
    raise exception 'REVIEW_INVALID_ACTION' using errcode = '22023';
  end if;

  select * into v_review from public.customer_reviews
  where id = p_review_id for update;
  if not found or v_review.deleted_at is not null then
    raise exception 'REVIEW_NOT_FOUND' using errcode = 'P0002';
  end if;

  if p_action = 'approve' then
    if v_review.status not in ('pending', 'rejected') then
      raise exception 'REVIEW_INVALID_TRANSITION' using errcode = '22023';
    end if;
    update public.customer_reviews
    set status = 'approved', rejection_reason = null,
        approved_by = v_admin, approved_at = now(),
        moderated_by = v_admin, moderated_at = now()
    where id = p_review_id;

  elsif p_action = 'reject' then
    if v_note is null then
      raise exception 'REVIEW_REASON_REQUIRED' using errcode = '22023';
    end if;
    if v_review.status = 'rejected' then
      raise exception 'REVIEW_INVALID_TRANSITION' using errcode = '22023';
    end if;
    update public.customer_reviews
    set status = 'rejected', rejection_reason = v_note,
        approved_by = null, approved_at = null,
        moderated_by = v_admin, moderated_at = now()
    where id = p_review_id;

  elsif p_action = 'hide' then
    if v_review.status <> 'approved' then
      raise exception 'REVIEW_INVALID_TRANSITION' using errcode = '22023';
    end if;
    update public.customer_reviews
    set status = 'hidden', moderated_by = v_admin, moderated_at = now()
    where id = p_review_id;

  elsif p_action = 'restore' then
    if v_review.status <> 'hidden' then
      raise exception 'REVIEW_INVALID_TRANSITION' using errcode = '22023';
    end if;
    update public.customer_reviews
    set status = 'approved', moderated_by = v_admin, moderated_at = now()
    where id = p_review_id;

  elsif p_action = 'delete' then
    update public.customer_reviews
    set deleted_at = now(), deleted_by = v_admin,
        moderated_by = v_admin, moderated_at = now()
    where id = p_review_id;
  end if;

  -- Laporan terbuka ikut ditutup: ditindaklanjuti atau diabaikan.
  if p_action in ('reject', 'hide', 'delete') then
    update public.review_reports
    set status = 'actioned', reviewed_by = v_admin, reviewed_at = now()
    where review_id = p_review_id and status = 'open';
  elsif p_action = 'dismiss_reports' then
    update public.review_reports
    set status = 'dismissed', reviewed_by = v_admin, reviewed_at = now()
    where review_id = p_review_id and status = 'open';
  end if;

  update public.customer_reviews r
  set report_count = (
    select count(*) from public.review_reports rr
    where rr.review_id = r.id and rr.status = 'open'
  )
  where r.id = p_review_id;

  insert into public.review_moderation_logs (review_id, admin_id, action, note)
  values (p_review_id, v_admin, p_action, v_note);

  insert into public.activity_logs (user_id, action, module, description)
  values (v_admin, 'review_' || p_action, 'reviews',
          'Moderasi ulasan ' || p_review_id::text || ': ' || p_action
          || coalesce(' - ' || v_note, ''));
end;
$$;

-- ---------------------------------------------------------------------
-- 9. Grants fungsi
-- ---------------------------------------------------------------------
revoke all on function public.get_public_reviews(integer, text, integer, integer, text) from public;
revoke all on function public.get_public_review_stats() from public;
revoke all on function public.toggle_review_helpful(uuid, text) from public;
revoke all on function public.report_review(uuid, text, text, text) from public;
revoke all on function public.admin_list_reviews(text, integer, integer) from public, anon;
revoke all on function public.admin_moderate_review(uuid, text, text) from public, anon;

grant execute on function public.get_public_reviews(integer, text, integer, integer, text) to anon, authenticated;
grant execute on function public.get_public_review_stats() to anon, authenticated;
grant execute on function public.toggle_review_helpful(uuid, text) to anon, authenticated;
grant execute on function public.report_review(uuid, text, text, text) to anon, authenticated;
grant execute on function public.admin_list_reviews(text, integer, integer) to authenticated;
grant execute on function public.admin_moderate_review(uuid, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- 10. Storage: bucket foto ulasan
--     Folder pertama = auth.uid() (pola sama dengan client-avatars).
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('review-photos', 'review-photos', true, 3145728,
        array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do update
set file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists review_photos_client_upload on storage.objects;
create policy review_photos_client_upload on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = (select auth.uid())::text
    and (select public.current_app_role()) = 'client'
  );

drop policy if exists review_photos_owner_or_admin_read on storage.objects;
create policy review_photos_owner_or_admin_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'review-photos'
    and ((storage.foldername(name))[1] = (select auth.uid())::text
         or (select public.is_review_admin()))
  );

drop policy if exists review_photos_owner_or_admin_delete on storage.objects;
create policy review_photos_owner_or_admin_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'review-photos'
    and ((storage.foldername(name))[1] = (select auth.uid())::text
         or (select public.is_review_admin()))
  );
-- Bucket publik: URL objek dapat dibuka tanpa policy SELECT, sehingga
-- publik tidak bisa melakukan listing isi bucket.
