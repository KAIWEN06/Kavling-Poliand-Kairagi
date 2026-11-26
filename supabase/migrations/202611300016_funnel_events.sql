-- Catatan tahap pembelian untuk melihat di mana pembeli berhenti.
--
-- Tanpa data pribadi: tidak ada user_id, nama, atau isi formulir. session_key
-- dibuat acak oleh aplikasi dan berganti setiap aplikasi dibuka ulang.
-- Tabel tidak bisa diakses langsung; tulis dan baca hanya lewat RPC.

begin;

create table if not exists public.funnel_events (
  id          bigint generated always as identity primary key,
  session_key uuid not null,
  stage       text not null check (stage in
                ('lot_view', 'simulation_used', 'survey_submitted', 'spk_form_open', 'spk_submitted')),
  lot_id      bigint references public.lots (id) on delete set null,
  event_date  date not null default ((now() at time zone 'Asia/Makassar')::date)
);

-- Satu sesi dihitung sekali per tahap, kavling, dan hari.
create unique index if not exists funnel_events_once_uq
  on public.funnel_events (session_key, stage, coalesce(lot_id, 0), event_date);
create index if not exists funnel_events_date_idx on public.funnel_events (event_date);

alter table public.funnel_events enable row level security;
revoke all on public.funnel_events from public, anon, authenticated;

create or replace function public.log_funnel_event(p_stage text, p_session uuid, p_lot_id bigint default null)
returns void
language plpgsql security definer set search_path = '' as $$
begin
  -- Hanya aktivitas pembeli yang dihitung; peran dipakai untuk menyaring, tidak disimpan.
  if public.current_app_role() is distinct from 'client' or p_session is null then
    return;
  end if;
  if (select count(*) from public.funnel_events
       where session_key = p_session
         and event_date = (now() at time zone 'Asia/Makassar')::date) >= 200 then
    return;
  end if;
  insert into public.funnel_events (session_key, stage, lot_id)
  values (p_session, p_stage, p_lot_id)
  on conflict do nothing;
exception
  when check_violation or foreign_key_violation then null;
end;
$$;

revoke all on function public.log_funnel_event(text, uuid, bigint) from public, anon;
grant execute on function public.log_funnel_event(text, uuid, bigint) to authenticated;

create or replace function public.get_funnel_summary(p_days integer default 30)
returns table (stage text, sessions bigint)
language plpgsql security definer set search_path = '' as $$
#variable_conflict use_column
declare
  v_today date := (now() at time zone 'Asia/Makassar')::date;
begin
  if not coalesce(public.is_finance_admin(), false) then
    raise exception 'ADMIN_ROLE_REQUIRED' using errcode = '42501';
  end if;
  delete from public.funnel_events where event_date < v_today - 180;
  return query
    select f.stage, count(distinct f.session_key)
      from public.funnel_events f
     where f.event_date > v_today - least(greatest(coalesce(p_days, 30), 1), 180)
     group by f.stage;
end;
$$;

revoke all on function public.get_funnel_summary(integer) from public, anon;
grant execute on function public.get_funnel_summary(integer) to authenticated;

commit;

-- Rollback:
--   drop function public.get_funnel_summary(integer);
--   drop function public.log_funnel_event(text, uuid, bigint);
--   drop table public.funnel_events;
