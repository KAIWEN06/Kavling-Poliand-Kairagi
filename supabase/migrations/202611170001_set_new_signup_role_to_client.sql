-- Public self-registration must create buyer/client profiles, never admin profiles.
-- Keep this default as a fallback for profile creation paths that omit `role`.
alter table public.profiles
  alter column role set default 'client';

-- Run after the existing auth-user profile trigger(s). This enforces the role for
-- self-registered accounts even if an older trigger supplied an unsafe default.
create or replace function public.assign_client_role_to_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.profiles
  set
    role = 'client',
    full_name = coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
      full_name
    )
  where id = new.id;

  return new;
end;
$$;

revoke all on function public.assign_client_role_to_new_auth_user() from public, anon, authenticated;

drop trigger if exists zzzzzzzz_assign_client_role_after_signup on auth.users;
create trigger zzzzzzzz_assign_client_role_after_signup
  after insert on auth.users
  for each row
  execute function public.assign_client_role_to_new_auth_user();
