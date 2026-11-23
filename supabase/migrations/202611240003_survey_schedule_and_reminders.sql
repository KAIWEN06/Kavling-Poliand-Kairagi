-- =====================================================================
-- Jadwal survei lintas role + pengingat otomatis (H-1 dan hari-H)
--
-- 1. get_my_survey_schedule(): jadwal survei aktif (pending/confirmed)
--    sesuai cakupan pemanggil, tanpa membuka RLS tabel survey_requests:
--      client          -> miliknya sendiri
--      admin           -> semua
--      marketing       -> client yang ditangani dirinya
--      marketing_head  -> semua
-- 2. sync_my_survey_reminders(): pengingat idempoten (dedupe_key) untuk
--    survei esok hari dan survei hari ini (zona waktu WITA).
--      client          -> survei miliknya (confirmed)
--      admin           -> semua survei (confirmed; pending diberi tanda)
--      marketing       -> survei client miliknya (confirmed)
-- =====================================================================

create or replace function public.get_my_survey_schedule()
returns table (lot_id bigint, scheduled_at timestamptz, status text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_role text;
begin
  if v_uid is null then return; end if;
  select lower(trim(coalesce(p.role, ''))) into v_role from public.profiles p where p.id = v_uid;

  return query
  select s.lot_id, s.scheduled_at, s.status
  from public.survey_requests s
  where s.status in ('pending', 'confirmed')
    and (
      (v_role = 'client' and s.client_id = v_uid)
      or v_role in ('admin', 'marketing_head')
      or (v_role = 'marketing' and exists (
            select 1 from public.customers c
            where c.user_id = s.client_id and c.marketing_id = v_uid))
    )
  order by s.scheduled_at;
end;
$$;

revoke all on function public.get_my_survey_schedule() from public, anon;
grant execute on function public.get_my_survey_schedule() to authenticated;

create or replace function public.sync_my_survey_reminders()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_role text;
  v_today date := (now() at time zone 'Asia/Makassar')::date;
  v_before bigint;
  v_after bigint;
  s record;
  v_day text;
  v_time text;
  v_who text;
  v_body text;
  v_title text;
begin
  if v_uid is null then return 0; end if;
  select lower(trim(coalesce(p.role, ''))) into v_role from public.profiles p where p.id = v_uid;
  if v_role not in ('client', 'admin', 'marketing') then return 0; end if;

  select count(*) into v_before from public.notifications where recipient_id = v_uid;

  for s in
    select sr.id, sr.lot_id, sr.scheduled_at, sr.status, sr.client_id,
           l.lot_number, c.id as customer_id, c.full_name
    from public.survey_requests sr
    left join public.lots l on l.id = sr.lot_id
    left join public.customers c on c.user_id = sr.client_id
    where sr.status in ('pending', 'confirmed')
      and (sr.scheduled_at at time zone 'Asia/Makassar')::date between v_today and v_today + 1
      and sr.scheduled_at > now() - interval '1 hour'
      and (
        (v_role = 'client' and sr.client_id = v_uid and sr.status = 'confirmed')
        or (v_role = 'admin')
        or (v_role = 'marketing' and sr.status = 'confirmed' and c.marketing_id = v_uid)
      )
  loop
    v_day := case when (s.scheduled_at at time zone 'Asia/Makassar')::date = v_today then 'today' else 'tomorrow' end;
    v_time := to_char(s.scheduled_at at time zone 'Asia/Makassar', 'HH24:MI') || ' WITA';
    v_who := coalesce(nullif(btrim(s.full_name), ''), 'Client');

    if v_role = 'client' then
      v_title := case v_day when 'today' then 'Survei kavling hari ini' else 'Survei kavling besok' end;
      v_body := 'Kavling ' || coalesce(s.lot_number, '-') || ' · ' || v_time || ' · mohon hadir tepat waktu';
    elsif v_role = 'marketing' then
      v_title := case v_day when 'today' then 'Survei client hari ini' else 'Survei client besok' end;
      v_body := v_who || ' · Kavling ' || coalesce(s.lot_number, '-') || ' · ' || v_time;
    else
      v_title := case v_day when 'today' then 'Survei hari ini' else 'Survei besok' end;
      v_body := v_who || ' · Kavling ' || coalesce(s.lot_number, '-') || ' · ' || v_time
                || case when s.status = 'pending' then ' · belum dikonfirmasi' else '' end;
    end if;

    perform public._notify(
      v_uid, 'survey', 'survey_reminder_' || v_day,
      case when v_day = 'today' or (v_role = 'admin' and s.status = 'pending') then 'high' else 'normal' end,
      v_title, v_body,
      jsonb_build_object('survey_id', s.id, 'lot_id', s.lot_id, 'customer_id', s.customer_id, 'scheduled_at', s.scheduled_at),
      'survey-' || v_day || ':' || s.id || ':' || s.status, null);
  end loop;

  select count(*) into v_after from public.notifications where recipient_id = v_uid;
  return (v_after - v_before)::integer;
end;
$$;

revoke all on function public.sync_my_survey_reminders() from public, anon;
grant execute on function public.sync_my_survey_reminders() to authenticated;
