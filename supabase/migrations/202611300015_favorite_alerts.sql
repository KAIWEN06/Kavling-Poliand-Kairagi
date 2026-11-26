-- Notifikasi perubahan status kavling favorit.
-- Butuh migration 202611300013 (client_favorite_lots).
--
-- Aturan:
--   * Mati secara bawaan; hanya untuk pembeli yang menyalakannya.
--   * Paling banyak satu notifikasi favorit per pembeli dalam 24 jam.
--   * Kejadian yang sama pada kavling yang sama tidak diulang selama 7 hari.
--   * Tidak menyebut siapa yang memesan.
--   * Pembeli kavling itu sendiri tidak dikirimi (sudah mendapat notifikasi SPK).

begin;

create table if not exists public.notification_preferences (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  favorite_alerts boolean not null default false,
  updated_at      timestamptz not null default now()
);

alter table public.notification_preferences enable row level security;
revoke all on public.notification_preferences from public, anon, authenticated;
grant select on public.notification_preferences to authenticated;

drop policy if exists "notification_preferences_select_own" on public.notification_preferences;
create policy "notification_preferences_select_own" on public.notification_preferences
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function public.set_favorite_alerts(p_enabled boolean)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  insert into public.notification_preferences (user_id, favorite_alerts, updated_at)
  values (v_uid, coalesce(p_enabled, false), now())
  on conflict (user_id) do update
    set favorite_alerts = excluded.favorite_alerts, updated_at = now();
end;
$$;

revoke all on function public.set_favorite_alerts(boolean) from public, anon;
grant execute on function public.set_favorite_alerts(boolean) to authenticated;

create or replace function public.trg_notify_favorite_lot_status()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_type text;
  v_title text;
  v_body text;
  r record;
begin
  if old.status = 'Available' and new.status in ('Booking', 'Sold') then
    v_type := 'favorite_unavailable';
    v_title := 'Kavling favorit Anda sudah dipesan';
    v_body := 'Kavling ' || coalesce(new.lot_number, '-') || ' tidak lagi tersedia.';
  elsif old.status in ('Booking', 'Sold') and new.status = 'Available' then
    v_type := 'favorite_available';
    v_title := 'Kavling favorit Anda tersedia lagi';
    v_body := 'Kavling ' || coalesce(new.lot_number, '-') || ' bisa diajukan kembali.';
  else
    return new;
  end if;

  -- Notifikasi tidak boleh menggagalkan perubahan status kavling.
  begin
    for r in
      select f.user_id
        from public.client_favorite_lots f
        join public.notification_preferences p on p.user_id = f.user_id and p.favorite_alerts
        join public.profiles pr on pr.id = f.user_id and pr.role = 'client'
       where f.lot_id = new.id
         and not exists (
           select 1 from public.customers c
            where c.user_id = f.user_id and (c.id = new.customer_id or c.id = old.customer_id))
         and not exists (
           select 1 from public.notifications n
            where n.recipient_id = f.user_id
              and n.type in ('favorite_unavailable', 'favorite_available')
              and (n.created_at > now() - interval '24 hours'
                   or (n.type = v_type and n.data ->> 'lot_id' = new.id::text
                       and n.created_at > now() - interval '7 days')))
    loop
      perform public._notify(r.user_id, 'system', v_type, 'low', v_title,
        v_body || ' Notifikasi ini bisa dimatikan di Kavling Impian.',
        jsonb_build_object('lot_id', new.id),
        v_type || ':' || new.id || ':' || floor(extract(epoch from now()))::bigint,
        null);
    end loop;
  exception when others then
    raise warning 'Notifikasi favorit gagal untuk kavling %: %', new.id, sqlerrm;
  end;

  return new;
end;
$$;

revoke all on function public.trg_notify_favorite_lot_status() from public, anon, authenticated;

drop trigger if exists trg_notify_favorite_lot_status on public.lots;
create trigger trg_notify_favorite_lot_status
  after update of status on public.lots
  for each row when (old.status is distinct from new.status)
  execute function public.trg_notify_favorite_lot_status();

commit;

-- Rollback:
--   drop trigger trg_notify_favorite_lot_status on public.lots;
--   drop function public.trg_notify_favorite_lot_status();
--   drop function public.set_favorite_alerts(boolean);
--   drop table public.notification_preferences;
