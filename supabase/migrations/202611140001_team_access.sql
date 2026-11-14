-- Team access schema and policies.
-- The migration stops when legacy editor rows exist: it never guesses that
-- every editor is an Owner.
create table if not exists public.marketing_profiles (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  employee_code text unique, phone text, address text, photo_url text,
  join_date date, is_active boolean not null default true, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);

do $$
declare editor_count bigint; c record;
begin
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='profiles' and column_name='role') then
    raise exception 'public.profiles.role is required before applying team access migration';
  end if;
  select count(*) into editor_count from public.profiles where role::text = 'editor';
  if editor_count > 0 then
    raise exception 'Found % editor profile(s). Map verified Owner accounts explicitly before rerunning; no roles were changed.', editor_count;
  end if;
  for c in select con.conname from pg_constraint con join pg_class rel on rel.oid=con.conrelid join pg_namespace ns on ns.oid=rel.relnamespace where ns.nspname='public' and rel.relname='profiles' and con.contype='c' and pg_get_constraintdef(con.oid) ilike '%role%' loop
    execute format('alter table public.profiles drop constraint %I', c.conname);
  end loop;
  alter table public.profiles drop constraint if exists profiles_role_check;
  alter table public.profiles add constraint profiles_role_check check (role in ('owner','admin','marketing','client'));
end $$;

alter table public.marketing_profiles enable row level security;
create or replace function public.team_role() returns text language sql stable security definer set search_path=public as $$ select role::text from public.profiles where id=auth.uid() $$;
revoke all on function public.team_role() from public;
grant execute on function public.team_role() to authenticated;

do $$
declare p record;
begin
  for p in select policyname from pg_policies where schemaname='public' and tablename='marketing_profiles' loop
    execute format('drop policy if exists %I on public.marketing_profiles', p.policyname);
  end loop;
end $$;

create policy marketing_profiles_select on public.marketing_profiles for select to authenticated using (
  (user_id=auth.uid() and public.team_role()='marketing') or
  (public.team_role() in ('owner','admin') and exists (select 1 from public.profiles t where t.id=user_id and t.role::text in ('owner','admin','marketing') and (public.team_role()='owner' or t.role::text in ('owner','marketing'))))
);
create policy marketing_profiles_insert on public.marketing_profiles for insert to authenticated with check (
  public.team_role() in ('owner','admin') and exists (select 1 from public.profiles t where t.id=user_id and t.role::text='marketing')
);
create policy marketing_profiles_update on public.marketing_profiles for update to authenticated using (
  (public.team_role()='marketing' and user_id=auth.uid()) or
  (public.team_role()='owner' and exists (select 1 from public.profiles t where t.id=user_id and t.role::text in ('admin','marketing'))) or
  (public.team_role()='admin' and exists (select 1 from public.profiles t where t.id=user_id and t.role::text='marketing'))
) with check (
  (public.team_role()='marketing' and user_id=auth.uid()) or
  (public.team_role()='owner' and exists (select 1 from public.profiles t where t.id=user_id and t.role::text in ('admin','marketing'))) or
  (public.team_role()='admin' and exists (select 1 from public.profiles t where t.id=user_id and t.role::text='marketing'))
);

create or replace function public.enforce_marketing_profile_changes() returns trigger language plpgsql security invoker set search_path=public as $$
declare caller_role text:=public.team_role(); target_role text;
begin
  if auth.uid() is null then return new; end if;
  select role::text into target_role from public.profiles where id=new.user_id;
  if caller_role='marketing' and (new.user_id<>auth.uid() or new.employee_code is distinct from old.employee_code or new.is_active is distinct from old.is_active or new.notes is distinct from old.notes) then
    raise exception 'Marketing hanya dapat mengubah field profil yang diizinkan';
  elsif caller_role='admin' and target_role<>'marketing' then raise exception 'Admin hanya dapat mengelola profil Marketing';
  elsif caller_role='owner' and target_role not in ('admin','marketing') then raise exception 'Owner hanya dapat mengelola profil Admin dan Marketing';
  end if;
  return new;
end $$;
drop trigger if exists marketing_profiles_changes_guard on public.marketing_profiles;
create trigger marketing_profiles_changes_guard before update on public.marketing_profiles for each row execute function public.enforce_marketing_profile_changes();
create or replace function public.set_marketing_profile_updated_at() returns trigger language plpgsql security invoker set search_path=public as $$ begin new.updated_at=now(); return new; end $$;
drop trigger if exists marketing_profiles_updated_at on public.marketing_profiles;
create trigger marketing_profiles_updated_at before update on public.marketing_profiles for each row execute function public.set_marketing_profile_updated_at();
