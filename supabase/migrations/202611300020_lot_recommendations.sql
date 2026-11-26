-- Rekomendasi kavling menurut minat pembeli, dan notifikasi yang hemat.
-- Butuh migration 202611300013, 202611300014, dan 202611300015.
--
-- Sumber minat (milik pembeli itu sendiri):
--   favorit (bobot 3), kavling yang dipesan/dibeli (2), riwayat lihat (1 s.d. 2).
-- Kemiripan dua kavling:
--   harga 45%, luas 30%, blok sama 15%, fasilitas dekat yang sama 10%.
--
-- Privasi: riwayat lihat hanya bisa dibaca pemiliknya (staf tidak bisa), bisa
-- dimatikan dan dihapus, dan dibuang otomatis setelah 180 hari. Tabel
-- funnel_events tetap anonim dan tidak dipakai di sini.
--
-- Notifikasi:
--   * Mati secara bawaan.
--   * Hanya bila ada kabar baru: harga turun, atau kavling yang cocok tersedia lagi.
--   * Paling banyak satu per 3 hari, dikirim pukul 10.00 WITA.
--   * Tidak dikirim bila ada notifikasi status favorit dalam 24 jam terakhir.
--   * Kavling yang sama tidak diulang selama 30 hari.
--   * Bila 3 notifikasi terakhir tidak dibaca, berhenti dulu sampai 30 hari.

begin;

-- 1. Pengaturan ------------------------------------------------------------------------------

alter table public.notification_preferences
  add column if not exists view_history boolean not null default true,
  add column if not exists match_alerts boolean not null default false;

create or replace function public.set_recommendation_settings(
  p_view_history boolean default null,
  p_match_alerts boolean default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  insert into public.notification_preferences as p (user_id, view_history, match_alerts, updated_at)
  values (v_uid, coalesce(p_view_history, true), coalesce(p_match_alerts, false), now())
  on conflict (user_id) do update
    set view_history = coalesce(p_view_history, p.view_history),
        match_alerts = coalesce(p_match_alerts, p.match_alerts),
        updated_at = now();
end;
$$;

revoke all on function public.set_recommendation_settings(boolean, boolean) from public, anon;
grant execute on function public.set_recommendation_settings(boolean, boolean) to authenticated;

-- 2. Riwayat lihat ----------------------------------------------------------------------------

create table if not exists public.client_lot_views (
  user_id        uuid not null references auth.users (id) on delete cascade,
  lot_id         bigint not null references public.lots (id) on delete cascade,
  view_count     integer not null default 1,
  last_viewed_at timestamptz not null default now(),
  primary key (user_id, lot_id)
);

alter table public.client_lot_views enable row level security;
revoke all on public.client_lot_views from public, anon, authenticated;
grant select on public.client_lot_views to authenticated;

drop policy if exists "lot_views_select_own" on public.client_lot_views;
create policy "lot_views_select_own" on public.client_lot_views
  for select to authenticated using (user_id = (select auth.uid()));

-- Kunjungan ke kavling yang sama dalam 30 menit dihitung sekali.
create or replace function public.log_lot_view(p_lot_id bigint)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null or public.current_app_role() is distinct from 'client' then
    return;
  end if;
  if exists (select 1 from public.notification_preferences p
              where p.user_id = v_uid and not p.view_history) then
    return;
  end if;
  insert into public.client_lot_views as v (user_id, lot_id)
  values (v_uid, p_lot_id)
  on conflict (user_id, lot_id) do update
    set view_count = v.view_count + 1, last_viewed_at = now()
    where v.last_viewed_at < now() - interval '30 minutes';
exception
  when foreign_key_violation or not_null_violation then null;
end;
$$;

revoke all on function public.log_lot_view(bigint) from public, anon;
grant execute on function public.log_lot_view(bigint) to authenticated;

create or replace function public.clear_my_lot_views()
returns void
language plpgsql security definer set search_path = '' as $$
begin
  delete from public.client_lot_views where user_id = (select auth.uid());
end;
$$;

revoke all on function public.clear_my_lot_views() from public, anon;
grant execute on function public.clear_my_lot_views() to authenticated;

-- 3. Perhitungan kemiripan (internal) ----------------------------------------------------------

create or replace function public._lot_price(p_cash numeric, p_promo numeric)
returns numeric language sql immutable set search_path = '' as $$
  select case
    when coalesce(p_promo, 0) > 0 and (coalesce(p_cash, 0) <= 0 or p_promo < p_cash) then p_promo
    when coalesce(p_cash, 0) > 0 then p_cash
  end;
$$;

-- 1 bila sama persis, turun ke 0 saat selisihnya 35% atau lebih. Data kosong = 0.
create or replace function public._closeness(p_value numeric, p_reference numeric)
returns numeric language sql immutable set search_path = '' as $$
  select case
    when p_value is null or coalesce(p_reference, 0) <= 0 then 0
    else greatest(0, 1 - abs(p_value - p_reference) / p_reference / 0.35)
  end;
$$;

-- Minat satu pembeli: satu baris per kavling, memakai sinyal terkuatnya.
create or replace function public._user_lot_signals(p_user uuid)
returns table (lot_id bigint, weight numeric, kind text)
language sql stable security definer set search_path = '' as $$
  with signals as (
    select f.lot_id::bigint as lot_id, 3::numeric as weight, 'favorite'::text as kind
      from public.client_favorite_lots f
     where f.user_id = p_user
    union all
    select t.lot_id::bigint, 2, 'owned'
      from public.lot_transactions t
      join public.customers c on c.id = t.customer_id
     where c.user_id = p_user and t.status in ('Booking', 'Sold')
    union all
    select s.lot_id::bigint, 2, 'owned'
      from public.spk_requests s
      left join public.customers c on c.id = s.customer_id
     where (c.user_id = p_user or (s.submission_source = 'Client' and s.submitted_by = p_user))
       and s.status in ('Submitted', 'Under Review', 'Approved')
    union all
    select v.lot_id,
           (1 + least(v.view_count - 1, 4) * 0.25)
             * case when v.last_viewed_at < now() - interval '30 days' then 0.5 else 1 end,
           'viewed'
      from (
        select h.lot_id, h.view_count, h.last_viewed_at
          from public.client_lot_views h
         where h.user_id = p_user
           and h.last_viewed_at > now() - interval '90 days'
           and not exists (select 1 from public.notification_preferences p
                            where p.user_id = p_user and not p.view_history)
         order by h.last_viewed_at desc
         limit 30
      ) v
  )
  select distinct on (s.lot_id) s.lot_id, s.weight, s.kind
    from signals s
   where s.lot_id is not null
   order by s.lot_id, s.weight desc;
$$;

-- Nilai setiap kavling tersedia terhadap sekumpulan kavling acuan.
-- Skor = 60% rata-rata berbobot + 40% kemiripan tertinggi, supaya pembeli
-- dengan dua selera berbeda tidak hanya mendapat kavling "tengah-tengah".
create or replace function public._score_lots(p_seed_ids bigint[], p_weights numeric[], p_kinds text[])
returns table (lot_id bigint, score numeric, seed_lot_id bigint, seed_kind text, traits text[])
language sql stable security definer set search_path = '' as $$
  with seeds as (
    select u.seed_id, u.weight, u.kind, l.block_id, l.area::numeric as area,
           public._lot_price(l.cash_price::numeric, l.promo_price::numeric) as price
      from unnest(p_seed_ids, p_weights, p_kinds) as u(seed_id, weight, kind)
      join public.lots l on l.id = u.seed_id
  ),
  candidates as (
    select l.id::bigint as id, l.block_id, l.area::numeric as area,
           public._lot_price(l.cash_price::numeric, l.promo_price::numeric) as price
      from public.lots l
     where l.status = 'Available'
       and not exists (select 1 from public.spk_requests s
                        where s.lot_id = l.id and s.status in ('Submitted', 'Under Review', 'Approved'))
  ),
  parts as (
    select c.id, s.seed_id, s.weight, s.kind,
           public._closeness(c.price, s.price) as price_fit,
           public._closeness(c.area, s.area) as area_fit,
           coalesce(c.block_id = s.block_id, false) as same_block,
           exists (
             select 1
               from public.lot_highlights a
               join public.lot_highlights b on lower(btrim(a.facility)) = lower(btrim(b.facility))
              where a.lot_id = c.id and b.lot_id = s.seed_id
                and a.distance_m <= 1000 and b.distance_m <= 1000
           ) as same_facility
      from candidates c
      join seeds s on s.seed_id <> c.id
  ),
  pairs as (
    select p.*,
           0.45 * p.price_fit + 0.30 * p.area_fit
             + case when p.same_block then 0.15 else 0 end
             + case when p.same_facility then 0.10 else 0 end as sim
      from parts p
  ),
  totals as (
    select id, 0.6 * sum(weight * sim) / nullif(sum(weight), 0) + 0.4 * max(sim) as total
      from pairs group by id
  ),
  -- Alasan yang ditampilkan diambil dari acuan yang paling berpengaruh.
  best as (
    select distinct on (id) * from pairs order by id, weight * sim desc, seed_id
  )
  select t.id, round(t.total, 4), b.seed_id, b.kind,
         array_remove(array[
           case when b.price_fit >= 0.6 then 'price' end,
           case when b.area_fit >= 0.6 then 'area' end,
           case when b.same_facility then 'facility' end,
           case when b.same_block then 'block' end
         ], null)
    from totals t
    join best b on b.id = t.id;
$$;

revoke all on function public._lot_price(numeric, numeric) from public, anon, authenticated;
revoke all on function public._closeness(numeric, numeric) from public, anon, authenticated;
revoke all on function public._user_lot_signals(uuid) from public, anon, authenticated;
revoke all on function public._score_lots(bigint[], numeric[], text[]) from public, anon, authenticated;

-- Rekomendasi untuk satu pembeli: tanpa kavling yang sudah difavoritkan atau dimilikinya.
create or replace function public._recommend_for(p_user uuid)
returns table (lot_id bigint, score numeric, seed_lot_id bigint, seed_kind text, traits text[])
language sql stable security definer set search_path = '' as $$
  with signals as (select * from public._user_lot_signals(p_user))
  select r.*
    from (select array_agg(s.lot_id) as ids, array_agg(s.weight) as weights, array_agg(s.kind) as kinds
            from signals s) a
   cross join lateral public._score_lots(a.ids, a.weights, a.kinds) r
   where not exists (select 1 from signals s
                      where s.lot_id = r.lot_id and s.kind in ('favorite', 'owned'));
$$;

revoke all on function public._recommend_for(uuid) from public, anon, authenticated;

-- 4. RPC untuk aplikasi ------------------------------------------------------------------------

create or replace function public.get_my_recommendations(p_limit integer default 6)
returns table (lot_id bigint, seed_lot_number text, seed_kind text, traits text[])
language sql stable security definer set search_path = '' as $$
  select r.lot_id, l.lot_number::text, r.seed_kind, r.traits
    from public._recommend_for((select auth.uid())) r
    join public.lots l on l.id = r.seed_lot_id
   where public.current_app_role() = 'client'
     and r.score >= 0.35 and cardinality(r.traits) > 0
   order by r.score desc, r.lot_id
   limit least(greatest(coalesce(p_limit, 6), 1), 12);
$$;

revoke all on function public.get_my_recommendations(integer) from public, anon;
grant execute on function public.get_my_recommendations(integer) to authenticated;

create or replace function public.get_similar_lots(p_lot_id bigint, p_limit integer default 4)
returns table (lot_id bigint, seed_lot_number text, seed_kind text, traits text[])
language sql stable security definer set search_path = '' as $$
  select r.lot_id, l.lot_number::text, r.seed_kind, r.traits
    from public._score_lots(array[p_lot_id], array[1::numeric], array['similar']) r
    join public.lots l on l.id = r.seed_lot_id
   where (select auth.uid()) is not null
     and r.score >= 0.35 and cardinality(r.traits) > 0
   order by r.score desc, r.lot_id
   limit least(greatest(coalesce(p_limit, 4), 1), 12);
$$;

revoke all on function public.get_similar_lots(bigint, integer) from public, anon;
grant execute on function public.get_similar_lots(bigint, integer) to authenticated;

-- 5. Kabar kavling -----------------------------------------------------------------------------

create table if not exists public.lot_news (
  id         bigint generated always as identity primary key,
  lot_id     bigint not null references public.lots (id) on delete cascade,
  kind       text not null check (kind in ('price_drop', 'available')),
  old_price  numeric,
  created_at timestamptz not null default now()
);

create index if not exists lot_news_created_idx on public.lot_news (created_at);
alter table public.lot_news enable row level security;
revoke all on public.lot_news from public, anon, authenticated;

create or replace function public.trg_record_lot_news()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_old numeric := public._lot_price(old.cash_price::numeric, old.promo_price::numeric);
  v_new numeric := public._lot_price(new.cash_price::numeric, new.promo_price::numeric);
begin
  -- Pencatatan kabar tidak boleh menggagalkan perubahan kavling.
  begin
    if new.status = 'Available' then
      if old.status is distinct from 'Available' then
        insert into public.lot_news (lot_id, kind) values (new.id, 'available');
      elsif v_new < v_old then
        insert into public.lot_news (lot_id, kind, old_price) values (new.id, 'price_drop', v_old);
      end if;
    end if;
  exception when others then
    raise warning 'Kabar kavling % gagal dicatat: %', new.id, sqlerrm;
  end;
  return new;
end;
$$;

revoke all on function public.trg_record_lot_news() from public, anon, authenticated;

drop trigger if exists trg_record_lot_news on public.lots;
create trigger trg_record_lot_news
  after update of status, cash_price, promo_price on public.lots
  for each row execute function public.trg_record_lot_news();

-- 6. Pengiriman harian --------------------------------------------------------------------------

create or replace function public.send_recommendation_alerts()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  u record;
  n record;
  v_type text;
  v_title text;
  v_body text;
  v_sent integer := 0;
begin
  delete from public.client_lot_views where last_viewed_at < now() - interval '180 days';
  delete from public.lot_news where created_at < now() - interval '30 days';

  for u in
    select p.user_id
      from public.notification_preferences p
      join public.profiles pr on pr.id = p.user_id and pr.role = 'client'
     where p.match_alerts
  loop
    begin
      continue when exists (
        select 1 from public.notifications x
         where x.recipient_id = u.user_id
           and ((x.type in ('favorite_unavailable', 'favorite_available')
                 and x.created_at > now() - interval '24 hours')
             or (x.type in ('favorite_price_drop', 'match_price_drop', 'match_available')
                 and x.created_at > now() - interval '3 days')));

      -- Tiga terakhir diabaikan: jangan terus mendesak.
      continue when (
        select count(*) = 3 and bool_and(last3.read_at is null)
               and max(last3.created_at) > now() - interval '30 days'
          from (select x.read_at, x.created_at from public.notifications x
                 where x.recipient_id = u.user_id
                   and x.type in ('favorite_price_drop', 'match_price_drop', 'match_available')
                 order by x.created_at desc limit 3) last3);

      select c.* into n
        from (
          select w.id as news_id, w.kind, l.id as lot_id, l.lot_number,
                 public._lot_price(l.cash_price::numeric, l.promo_price::numeric) as price,
                 fav.lot_id is not null as is_favorite,
                 coalesce(r.score, 0) as score
            from public.lot_news w
            join public.lots l on l.id = w.lot_id and l.status = 'Available'
            left join public.client_favorite_lots fav on fav.user_id = u.user_id and fav.lot_id = l.id
            left join public._recommend_for(u.user_id) r on r.lot_id = l.id
           where w.created_at > now() - interval '7 days'
             -- Harga yang sudah dinaikkan lagi bukan kabar turun.
             and (w.kind <> 'price_drop'
                  or public._lot_price(l.cash_price::numeric, l.promo_price::numeric) < w.old_price)
             and not exists (select 1 from public.spk_requests s
                              where s.lot_id = l.id and s.status in ('Submitted', 'Under Review', 'Approved'))
             and ((fav.lot_id is not null and w.kind = 'price_drop')
                  -- Favorit yang tersedia lagi sudah dikabarkan oleh trigger favorit.
                  or (fav.lot_id is null and r.score >= 0.55))
             and not exists (
               select 1 from public.notifications x
                where x.recipient_id = u.user_id
                  and x.type in ('favorite_price_drop', 'match_price_drop', 'match_available')
                  and x.data ->> 'lot_id' = l.id::text
                  and x.created_at > now() - interval '30 days')
        ) c
       order by c.is_favorite desc, (c.kind = 'price_drop') desc, c.score desc, c.news_id desc
       limit 1;

      continue when not found;

      if n.is_favorite then
        v_type := 'favorite_price_drop';
        v_title := 'Harga kavling favorit Anda turun';
      elsif n.kind = 'price_drop' then
        v_type := 'match_price_drop';
        v_title := 'Ada harga turun yang cocok untuk Anda';
      else
        v_type := 'match_available';
        v_title := 'Ada kavling yang cocok untuk Anda';
      end if;

      v_body := 'Kavling ' || coalesce(n.lot_number::text, '-')
        || case
             when n.kind = 'price_drop' then ' sekarang ' || public._rupiah(n.price) || '.'
             else ' bisa diajukan sekarang.'
           end
        || ' Notifikasi ini bisa dimatikan di Kavling Impian.';

      perform public._notify(u.user_id, 'system', v_type, 'low', v_title, v_body,
        jsonb_build_object('lot_id', n.lot_id), v_type || ':' || n.lot_id || ':' || n.news_id, null);
      v_sent := v_sent + 1;
    exception when others then
      raise warning 'Rekomendasi untuk % gagal: %', u.user_id, sqlerrm;
    end;
  end loop;

  return v_sent;
end;
$$;

revoke all on function public.send_recommendation_alerts() from public, anon, authenticated;

-- pg_cron memakai UTC: 02.00 UTC = 10.00 WITA. Bila blok ini gagal, aktifkan
-- pg_cron di Dashboard > Database > Extensions lalu jalankan ulang blok ini.
do $$
begin
  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'poliland-recommendation-alerts';
    perform cron.schedule('poliland-recommendation-alerts', '0 2 * * *',
      'select public.send_recommendation_alerts()');
  else
    raise notice 'pg_cron belum aktif: notifikasi rekomendasi belum terjadwal.';
  end if;
end $$;

commit;

-- Rollback:
--   select cron.unschedule(jobid) from cron.job where jobname = 'poliland-recommendation-alerts';
--   drop trigger trg_record_lot_news on public.lots;
--   drop function public.trg_record_lot_news(), public.send_recommendation_alerts(),
--     public.get_my_recommendations(integer), public.get_similar_lots(bigint, integer),
--     public._recommend_for(uuid), public._score_lots(bigint[], numeric[], text[]),
--     public._user_lot_signals(uuid), public._closeness(numeric, numeric),
--     public._lot_price(numeric, numeric), public.log_lot_view(bigint),
--     public.clear_my_lot_views(), public.set_recommendation_settings(boolean, boolean);
--   drop table public.lot_news, public.client_lot_views;
--   alter table public.notification_preferences drop column view_history, drop column match_alerts;
