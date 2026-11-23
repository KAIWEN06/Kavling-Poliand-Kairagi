-- =====================================================================
-- Notifikasi jadwal survei kavling
--
-- Kategori baru 'survey' + trigger pada public.survey_requests:
--   INSERT (pending)        -> Admin (high), Marketing pemilik client, Kepala Marketing (low),
--                              Client (konfirmasi pengajuan terkirim)
--   UPDATE status           -> Client (dikonfirmasi / ditolak / dibatalkan / selesai),
--                              Marketing pemilik client, Admin (bila dibatalkan)
-- Pelaku perubahan tidak ikut diberi notifikasi (ditangani _notify).
-- =====================================================================

alter table public.notifications drop constraint if exists notifications_category_check;
alter table public.notifications
  add constraint notifications_category_check
  check (category in ('spk', 'payment', 'client', 'transaction', 'commission', 'reminder', 'survey', 'system'));

create or replace function public.trg_notify_survey_request()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_lot text;
  v_name text;
  v_owner uuid;
  v_when text;
  v_body text;
  v_data jsonb;
  v_key text;
  v_actor uuid := (select auth.uid());
begin
  if tg_op = 'UPDATE' and new.status is not distinct from old.status then
    return new;
  end if;

  select l.lot_number into v_lot from public.lots l where l.id = new.lot_id;
  select c.full_name, c.marketing_id into v_name, v_owner
    from public.customers c where c.user_id = new.client_id limit 1;

  v_when := to_char(new.scheduled_at at time zone 'Asia/Makassar', 'DD-MM-YYYY HH24:MI') || ' WITA';
  v_body := 'Kavling ' || coalesce(v_lot, '-') || ' · ' || v_when;
  v_data := jsonb_build_object(
    'survey_id', new.id, 'lot_id', new.lot_id, 'scheduled_at', new.scheduled_at,
    'customer_id', (select c.id from public.customers c where c.user_id = new.client_id limit 1)
  );
  v_key := 'survey:' || new.id || ':' || new.status;

  if tg_op = 'INSERT' then
    perform public._notify_role('admin', 'survey', 'survey_requested', 'high', 'Jadwal survei baru',
      coalesce(v_name, 'Client') || ' · ' || v_body, v_data, v_key, v_actor);
    perform public._notify(v_owner, 'survey', 'survey_requested', 'normal', 'Client menjadwalkan survei',
      coalesce(v_name, 'Client') || ' · ' || v_body, v_data, v_key, v_actor);
    perform public._notify_role('marketing_head', 'survey', 'survey_requested', 'low', 'Survei baru di tim',
      coalesce(v_name, 'Client') || ' · ' || v_body, v_data, v_key, v_actor);
    perform public._notify(new.client_id, 'survey', 'survey_requested', 'normal', 'Pengajuan survei terkirim',
      v_body || ' · menunggu konfirmasi Admin', v_data, v_key, v_actor);
  elsif new.status = 'confirmed' then
    perform public._notify(new.client_id, 'survey', 'survey_confirmed', 'high', 'Jadwal survei dikonfirmasi',
      v_body, v_data, v_key, v_actor);
    perform public._notify(v_owner, 'survey', 'survey_confirmed', 'normal', 'Survei client dikonfirmasi',
      coalesce(v_name, 'Client') || ' · ' || v_body, v_data, v_key, v_actor);
  elsif new.status = 'rejected' then
    perform public._notify(new.client_id, 'survey', 'survey_rejected', 'high', 'Jadwal survei ditolak',
      v_body || coalesce(' · Alasan: ' || nullif(new.rejection_reason, ''), ''), v_data, v_key, v_actor);
    perform public._notify(v_owner, 'survey', 'survey_rejected', 'normal', 'Survei client ditolak',
      coalesce(v_name, 'Client') || ' · ' || v_body, v_data, v_key, v_actor);
  elsif new.status = 'cancelled' then
    perform public._notify_role('admin', 'survey', 'survey_cancelled', 'normal', 'Jadwal survei dibatalkan',
      coalesce(v_name, 'Client') || ' · ' || v_body, v_data, v_key, v_actor);
    perform public._notify(new.client_id, 'survey', 'survey_cancelled', 'normal', 'Jadwal survei dibatalkan',
      v_body, v_data, v_key, v_actor);
    perform public._notify(v_owner, 'survey', 'survey_cancelled', 'normal', 'Survei client dibatalkan',
      coalesce(v_name, 'Client') || ' · ' || v_body, v_data, v_key, v_actor);
  elsif new.status = 'completed' then
    perform public._notify(new.client_id, 'survey', 'survey_completed', 'normal', 'Survei selesai',
      v_body || ' · hubungi kami bila Anda tertarik melanjutkan', v_data, v_key, v_actor);
    perform public._notify(v_owner, 'survey', 'survey_completed', 'normal', 'Survei client selesai',
      coalesce(v_name, 'Client') || ' · ' || v_body, v_data, v_key, v_actor);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_survey_request on public.survey_requests;
create trigger trg_notify_survey_request
  after insert or update of status on public.survey_requests
  for each row execute function public.trg_notify_survey_request();
