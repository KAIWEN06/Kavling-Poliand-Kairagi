-- =====================================================================
-- Agenda survei untuk kartu di halaman Beranda tiap role
--
-- get_my_survey_agenda(): survei aktif (pending/confirmed) beserta nomor
-- kavling dan nama client, dengan cakupan yang sama seperti
-- get_my_survey_schedule():
--   client -> miliknya | admin, marketing_head -> semua |
--   marketing -> client yang ditangani dirinya
-- Nama client TIDAK dikembalikan untuk role client.
-- =====================================================================

create or replace function public.get_my_survey_agenda()
returns table (
  survey_id uuid,
  lot_id bigint,
  lot_number text,
  scheduled_at timestamptz,
  status text,
  customer_id bigint,
  customer_name text
)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_role text;
begin
  if v_uid is null then return; end if;
  select lower(trim(coalesce(p.role, ''))) into v_role from public.profiles p where p.id = v_uid;

  return query
  select s.id, s.lot_id, l.lot_number::text, s.scheduled_at, s.status,
         c.id::bigint,
         case when v_role = 'client' then null else nullif(btrim(c.full_name), '') end
  from public.survey_requests s
  left join public.lots l on l.id = s.lot_id
  left join public.customers c on c.user_id = s.client_id
  where s.status in ('pending', 'confirmed')
    and (
      (v_role = 'client' and s.client_id = v_uid)
      or v_role in ('admin', 'marketing_head')
      or (v_role = 'marketing' and c.marketing_id = v_uid)
    )
  order by s.scheduled_at;
end;
$$;

revoke all on function public.get_my_survey_agenda() from public, anon;
grant execute on function public.get_my_survey_agenda() to authenticated;
