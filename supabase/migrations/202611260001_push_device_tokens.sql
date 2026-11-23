-- Token perangkat untuk push notification (FCM) agar notifikasi tetap muncul saat aplikasi ditutup.
-- Satu token FCM = satu perangkat; saat akun lain login di perangkat yang sama, token berpindah pemilik.

create table if not exists public.device_tokens (
  token       text primary key check (char_length(token) between 20 and 4096),
  user_id     uuid not null references auth.users (id) on delete cascade,
  platform    text not null default 'android' check (platform in ('android', 'ios')),
  updated_at  timestamptz not null default now()
);

create index if not exists device_tokens_user_idx on public.device_tokens (user_id);

alter table public.device_tokens enable row level security;

-- Tidak ada policy langsung: semua akses lewat RPC di bawah (security definer)
-- dan service role (Edge Function send-push).
revoke all on public.device_tokens from anon, authenticated, public;

create or replace function public.register_device_token(p_token text, p_platform text default 'android')
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  insert into public.device_tokens (token, user_id, platform, updated_at)
  values (p_token, v_uid, coalesce(nullif(p_platform, ''), 'android'), now())
  on conflict (token) do update
    set user_id = excluded.user_id,
        platform = excluded.platform,
        updated_at = now();
end;
$$;

create or replace function public.unregister_device_token(p_token text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.device_tokens
  where token = p_token and user_id = auth.uid();
end;
$$;

revoke all on function public.register_device_token(text, text) from public, anon;
revoke all on function public.unregister_device_token(text) from public, anon;
grant execute on function public.register_device_token(text, text) to authenticated;
grant execute on function public.unregister_device_token(text) to authenticated;

-- LANGKAH MANUAL setelah migrasi ini diterapkan (Dashboard Supabase):
-- Database > Webhooks > Create: tabel public.notifications, event INSERT,
-- tipe "Supabase Edge Functions" -> fungsi send-push,
-- tambahkan HTTP header  x-webhook-secret: <nilai PUSH_WEBHOOK_SECRET>.
