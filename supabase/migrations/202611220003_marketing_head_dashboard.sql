begin;

alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('owner', 'admin', 'marketing_head', 'marketing', 'client'));

create or replace function public.get_marketing_head_dashboard()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not exists (
    select 1 from public.profiles p where p.id = v_actor and p.role = 'marketing_head'
  ) then
    raise exception 'Halaman ini hanya dapat diakses Kepala Bagian Marketing.';
  end if;

  return jsonb_build_object(
    'team_count', (select count(*) from public.profiles where role = 'marketing'),
    'prospect_count', (select count(*) from public.customers),
    'active_spk_count', (select count(*) from public.spk_requests where status in ('Submitted', 'Under Review')),
    'approved_spk_count', (select count(*) from public.spk_requests where status = 'Approved'),
    'team', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'full_name', coalesce(p.full_name, 'Marketing'),
        'prospect_count', coalesce(metrics.prospect_count, 0),
        'active_spk_count', coalesce(metrics.active_spk_count, 0),
        'approved_spk_count', coalesce(metrics.approved_spk_count, 0)
      ) order by coalesce(metrics.approved_spk_count, 0) desc, coalesce(metrics.prospect_count, 0) desc, p.full_name)
      from public.profiles p
      left join lateral (
        select count(c.id) as prospect_count,
          count(sr.id) filter (where sr.status in ('Submitted', 'Under Review')) as active_spk_count,
          count(sr.id) filter (where sr.status = 'Approved') as approved_spk_count
        from public.customers c
        left join public.spk_requests sr on sr.customer_id = c.id
        where c.marketing_id = p.id
      ) metrics on true
      where p.role = 'marketing'
    ), '[]'::jsonb)
  );
end;
$$;

revoke all on function public.get_marketing_head_dashboard() from public, anon;
grant execute on function public.get_marketing_head_dashboard() to authenticated;

commit;
