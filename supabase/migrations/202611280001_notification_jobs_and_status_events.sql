-- =====================================================================
-- Notifikasi otomatis server-side (pengingat terjadwal) + kejadian status
--
-- Masalah yang diperbaiki
--   * Pengingat cicilan & survei hanya dibuat saat aplikasi dibuka
--     (sync_my_*_reminders), jadi tidak ada push bila aplikasi tertutup.
--   * Tidak ada pengingat Booking Fee, verifikasi pembayaran yang menggantung,
--     atau unggah ulang bukti.
--   * Tidak ada notifikasi saat kavling kembali tersedia, jadwal survei
--     diubah, atau refund (Booking Fee / pembelian) diproses.
--
-- Aturan penerima (tidak ada notifikasi lintas role)
--   Setiap notifikasi ditujukan ke SATU user (recipient_id):
--     client          -> customers.user_id
--     marketing       -> marketing_owner_of_* / customers.marketing_id
--     admin           -> profiles.role = 'admin'
--     marketing_head  -> profiles.role = 'marketing_head'
--   Role penerima dibaca server saat push dikirim, lalu divalidasi lagi di
--   perangkat (user + role harus sama dengan sesi aktif).
--
-- Pengingat dibuat oleh public.run_notification_jobs() setiap 10 menit
-- (pg_cron). Dedupe key menjamin tiap pengingat hanya muncul sekali per
-- penerima, dan sama dengan key RPC sync_my_* sehingga tidak dobel.
-- Jam tenang 21:00-06:00 WITA: pengingat ditahan sampai pagi.
-- Aman dijalankan ulang.
-- =====================================================================

-- ---------------------------------------------------------------------
-- 1. Pengingat cicilan (semua client sekaligus, atau satu client)
--    p_client null  -> semua penerima (client, marketing pemilik, admin)
--    p_client diisi -> hanya notifikasi untuk client itu (dipakai RPC)
-- ---------------------------------------------------------------------
create or replace function public._generate_installment_reminders(p_client uuid default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Makassar')::date;
  s record;
  a record;
  v_days integer;
  v_body text;
  v_data jsonb;
  v_owner uuid;
begin
  for s in
    select sc.id, sc.installment_number, sc.due_date, sc.amount, l.lot_number,
           t.id as transaction_id, c.id as customer_id, c.user_id as client_uid, c.full_name
    from public.installment_schedules sc
    join public.lot_transactions t on t.id = sc.transaction_id
    join public.customers c on c.id = t.customer_id
    left join public.lots l on l.id = t.lot_id
    where t.status <> 'Cancelled'
      and sc.status in ('Pending', 'Overdue')
      and sc.due_date <= v_today + 7
      and (p_client is null or c.user_id = p_client)
  loop
    v_days := s.due_date - v_today;
    v_data := jsonb_build_object('schedule_id', s.id, 'transaction_id', s.transaction_id, 'customer_id', s.customer_id);
    v_body := 'Cicilan ke-' || s.installment_number || ' · Kavling ' || coalesce(s.lot_number, '-') || ' · ' || public._rupiah(s.amount);

    if v_days < 0 then
      -- Client: ulangi tiap 3 hari selama belum dibayar.
      perform public._notify(s.client_uid, 'reminder', 'installment_overdue', 'high', 'Cicilan terlambat',
        v_body || ' · terlambat ' || (-v_days) || ' hari', v_data,
        'installment-overdue:' || s.id || case when -v_days >= 3 then ':w' || ((-v_days) / 3) else '' end, null);
      if p_client is null then
        v_owner := public.marketing_owner_of_transaction(s.transaction_id);
        perform public._notify(v_owner, 'reminder', 'installment_overdue_client', 'normal', 'Cicilan client terlambat',
          coalesce(s.full_name, 'Client') || ' · ' || v_body || ' · terlambat ' || (-v_days) || ' hari', v_data,
          'installment-overdue:' || s.id, null);
        for a in select id from public.profiles where role = 'admin' loop
          perform public._notify(a.id, 'reminder', 'installment_overdue_client', 'normal', 'Cicilan client terlambat',
            coalesce(s.full_name, 'Client') || ' · ' || v_body || ' · terlambat ' || (-v_days) || ' hari', v_data,
            'installment-overdue:' || s.id, null);
        end loop;
      end if;
    elsif v_days = 0 then
      perform public._notify(s.client_uid, 'reminder', 'installment_due_today', 'high', 'Cicilan jatuh tempo hari ini',
        v_body, v_data, 'installment-today:' || s.id, null);
    elsif v_days = 1 then
      perform public._notify(s.client_uid, 'reminder', 'installment_due_tomorrow', 'high', 'Cicilan jatuh tempo besok',
        v_body, v_data, 'installment-h1:' || s.id, null);
      if p_client is null then
        perform public._notify(public.marketing_owner_of_transaction(s.transaction_id), 'reminder',
          'installment_due_tomorrow_client', 'normal', 'Cicilan client jatuh tempo besok',
          coalesce(s.full_name, 'Client') || ' · ' || v_body, v_data, 'installment-h1:' || s.id, null);
      end if;
    else
      perform public._notify(s.client_uid, 'reminder', 'installment_due_soon', 'high', 'Cicilan segera jatuh tempo',
        v_body || ' · jatuh tempo ' || to_char(s.due_date, 'DD-MM-YYYY'), v_data, 'installment-due:' || s.id, null);
    end if;
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Pengingat survei H-1 dan hari-H
--    Penerima: client (confirmed), marketing pemilik client (confirmed),
--    admin (pending & confirmed). p_user membatasi ke satu penerima.
--    Judul/isi/dedupe key identik dengan versi lama.
-- ---------------------------------------------------------------------
create or replace function public._generate_survey_reminders(p_user uuid default null)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_today date := (now() at time zone 'Asia/Makassar')::date;
  s record;
  a record;
  v_day text;
  v_time text;
  v_who text;
  v_lot text;
  v_data jsonb;
  v_key text;
  v_high_day boolean;
begin
  for s in
    select sr.id, sr.lot_id, sr.scheduled_at, sr.status, sr.client_id,
           l.lot_number, c.id as customer_id, c.full_name, c.marketing_id
    from public.survey_requests sr
    left join public.lots l on l.id = sr.lot_id
    left join lateral (
      select c2.id, c2.full_name, c2.marketing_id
      from public.customers c2 where c2.user_id = sr.client_id limit 1
    ) c on true
    where sr.status in ('pending', 'confirmed')
      and (sr.scheduled_at at time zone 'Asia/Makassar')::date between v_today and v_today + 1
      and sr.scheduled_at > now() - interval '1 hour'
  loop
    v_day := case when (s.scheduled_at at time zone 'Asia/Makassar')::date = v_today then 'today' else 'tomorrow' end;
    v_time := to_char(s.scheduled_at at time zone 'Asia/Makassar', 'HH24:MI') || ' WITA';
    v_who := coalesce(nullif(btrim(s.full_name), ''), 'Client');
    v_lot := coalesce(s.lot_number, '-');
    v_high_day := v_day = 'today';
    v_data := jsonb_build_object('survey_id', s.id, 'lot_id', s.lot_id, 'customer_id', s.customer_id, 'scheduled_at', s.scheduled_at);
    v_key := 'survey-' || v_day || ':' || s.id || ':' || s.status;

    if s.status = 'confirmed' and (p_user is null or p_user = s.client_id) then
      perform public._notify(s.client_id, 'survey', 'survey_reminder_' || v_day,
        case when v_high_day then 'high' else 'normal' end,
        case v_day when 'today' then 'Survei kavling hari ini' else 'Survei kavling besok' end,
        'Kavling ' || v_lot || ' · ' || v_time || ' · mohon hadir tepat waktu', v_data, v_key, null);
    end if;

    if s.status = 'confirmed' and s.marketing_id is not null and (p_user is null or p_user = s.marketing_id) then
      perform public._notify(s.marketing_id, 'survey', 'survey_reminder_' || v_day,
        case when v_high_day then 'high' else 'normal' end,
        case v_day when 'today' then 'Survei client hari ini' else 'Survei client besok' end,
        v_who || ' · Kavling ' || v_lot || ' · ' || v_time, v_data, v_key, null);
    end if;

    for a in select id from public.profiles where role = 'admin' and (p_user is null or id = p_user) loop
      perform public._notify(a.id, 'survey', 'survey_reminder_' || v_day,
        case when v_high_day or s.status = 'pending' then 'high' else 'normal' end,
        case v_day when 'today' then 'Survei hari ini' else 'Survei besok' end,
        v_who || ' · Kavling ' || v_lot || ' · ' || v_time
          || case when s.status = 'pending' then ' · belum dikonfirmasi' else '' end,
        v_data, v_key, null);
    end loop;
  end loop;
end;
$$;

-- RPC lama (dipanggil saat aplikasi dibuka) kini memakai logika yang sama,
-- hanya untuk akun pemanggil.
create or replace function public.sync_my_payment_reminders()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_before bigint;
  v_after bigint;
begin
  if v_uid is null then return 0; end if;
  select count(*) into v_before from public.notifications where recipient_id = v_uid;
  perform public._generate_installment_reminders(v_uid);
  select count(*) into v_after from public.notifications where recipient_id = v_uid;
  return (v_after - v_before)::integer;
end;
$$;

create or replace function public.sync_my_survey_reminders()
returns integer
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := (select auth.uid());
  v_before bigint;
  v_after bigint;
begin
  if v_uid is null then return 0; end if;
  select count(*) into v_before from public.notifications where recipient_id = v_uid;
  perform public._generate_survey_reminders(v_uid);
  select count(*) into v_after from public.notifications where recipient_id = v_uid;
  return (v_after - v_before)::integer;
end;
$$;

revoke all on function public.sync_my_payment_reminders() from public, anon;
revoke all on function public.sync_my_survey_reminders() from public, anon;
grant execute on function public.sync_my_payment_reminders() to authenticated;
grant execute on function public.sync_my_survey_reminders() to authenticated;

-- ---------------------------------------------------------------------
-- 3. Pengingat Booking Fee (batas 24 jam sejak SPK diajukan)
--    Client + Marketing pemilik: sisa ±12 jam dan ±4 jam.
-- ---------------------------------------------------------------------
create or replace function public._generate_booking_fee_reminders()
returns void
language plpgsql security definer set search_path = '' as $$
declare
  s record;
  v_client uuid;
  v_owner uuid;
  v_name text;
  v_lot text;
  v_deadline text;
  v_data jsonb;
  v_tag text;
  v_left text;
begin
  for s in
    select r.id, r.spk_number, r.customer_id, r.lot_id, r.marketing_id, r.submitted_at,
           extract(epoch from (now() - r.submitted_at)) / 3600.0 as age_h
    from public.spk_requests r
    where r.status = 'Submitted'
      and r.transaction_id is null
      and r.submitted_at < now() - interval '12 hours'
      and r.submitted_at > now() - interval '24 hours'
      and not exists (select 1 from public.payments p where p.spk_request_id = r.id and p.payment_category = 'Booking')
  loop
    select c.user_id, c.full_name into v_client, v_name from public.customers c where c.id = s.customer_id;
    select l.lot_number into v_lot from public.lots l where l.id = s.lot_id;
    v_owner := public.marketing_owner_of_spk(s.id);
    v_deadline := to_char((s.submitted_at + interval '24 hours') at time zone 'Asia/Makassar', 'DD-MM-YYYY HH24:MI') || ' WITA';
    v_data := jsonb_build_object('spk_id', s.id, 'spk_number', s.spk_number, 'customer_id', s.customer_id, 'lot_id', s.lot_id);
    v_tag := case when s.age_h >= 20 then '4h' else '12h' end;
    v_left := case v_tag when '4h' then 'sisa sekitar 4 jam' else 'sisa sekitar 12 jam' end;

    perform public._notify(v_client, 'payment', 'booking_fee_reminder', 'high',
      case v_tag when '4h' then 'Booking Fee segera berakhir' else 'Booking Fee belum dibayar' end,
      'Kavling ' || coalesce(v_lot, '-') || ' · ' || s.spk_number || ' · ' || v_left || ' (batas ' || v_deadline || ')',
      v_data, 'bookingfee-' || v_tag || ':' || s.id, null);
    perform public._notify(v_owner, 'payment', 'booking_fee_reminder_client', 'normal',
      case v_tag when '4h' then 'Booking Fee client segera berakhir' else 'Client belum bayar Booking Fee' end,
      coalesce(v_name, 'Client') || ' · Kavling ' || coalesce(v_lot, '-') || ' · ' || v_left || ' (batas ' || v_deadline || ')',
      v_data, 'bookingfee-' || v_tag || ':' || s.id, null);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- 4. Pembayaran yang menggantung
--    Admin: bukti Pending > 6 jam belum diverifikasi.
--    Client: bukti Needs Reupload > 24 jam belum diunggah ulang.
-- ---------------------------------------------------------------------
create or replace function public._generate_payment_followups()
returns void
language plpgsql security definer set search_path = '' as $$
declare
  p record;
  a record;
  v_name text;
  v_client uuid;
  v_body text;
  v_data jsonb;
begin
  for p in
    select pay.id, pay.customer_id, pay.spk_request_id, pay.amount, pay.payment_category
    from public.payments pay
    where pay.status = 'Pending'
      and coalesce(pay.submitted_at, pay.created_at) < now() - interval '6 hours'
      and coalesce(pay.submitted_at, pay.created_at) > now() - interval '14 days'
  loop
    select c.full_name into v_name from public.customers c where c.id = p.customer_id;
    v_body := coalesce(v_name, 'Client') || ' · ' || coalesce(p.payment_category, 'Pembayaran') || ' · ' || public._rupiah(p.amount) || ' · menunggu verifikasi';
    v_data := jsonb_build_object('payment_id', p.id, 'customer_id', p.customer_id, 'spk_id', p.spk_request_id);
    for a in select id from public.profiles where role = 'admin' loop
      perform public._notify(a.id, 'payment', 'payment_review_overdue', 'high', 'Pembayaran belum diverifikasi',
        v_body, v_data, 'payment-review:' || p.id, null);
    end loop;
  end loop;

  for p in
    select pay.id, pay.customer_id, pay.spk_request_id, pay.amount, pay.payment_category
    from public.payments pay
    where pay.status = 'Needs Reupload'
      and coalesce(pay.verified_at, pay.submitted_at, pay.created_at) < now() - interval '24 hours'
      and coalesce(pay.verified_at, pay.submitted_at, pay.created_at) > now() - interval '14 days'
  loop
    select c.user_id into v_client from public.customers c where c.id = p.customer_id;
    v_data := jsonb_build_object('payment_id', p.id, 'customer_id', p.customer_id, 'spk_id', p.spk_request_id);
    perform public._notify(v_client, 'payment', 'payment_reupload_reminder', 'high', 'Bukti pembayaran belum diunggah ulang',
      coalesce(p.payment_category, 'Pembayaran') || ' · ' || public._rupiah(p.amount) || ' · unggah ulang bukti yang jelas',
      v_data, 'payment-reupload-reminder:' || p.id, null);
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- 5. Runner terjadwal
-- ---------------------------------------------------------------------
create or replace function public.run_notification_jobs()
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_hour integer := extract(hour from (now() at time zone 'Asia/Makassar'))::integer;
begin
  -- Batalkan SPK tanpa Booking Fee > 24 jam (memicu notifikasi "SPK dibatalkan").
  begin
    perform public.expire_stale_spk_requests();
  exception when others then
    raise warning 'run_notification_jobs expire_stale_spk_requests: %', sqlerrm;
  end;

  -- Jam tenang: pengingat ditahan sampai 06:00 WITA.
  if v_hour >= 21 or v_hour < 6 then return; end if;

  begin perform public._generate_installment_reminders(null);
  exception when others then raise warning 'run_notification_jobs installment: %', sqlerrm; end;
  begin perform public._generate_survey_reminders(null);
  exception when others then raise warning 'run_notification_jobs survey: %', sqlerrm; end;
  begin perform public._generate_booking_fee_reminders();
  exception when others then raise warning 'run_notification_jobs booking_fee: %', sqlerrm; end;
  begin perform public._generate_payment_followups();
  exception when others then raise warning 'run_notification_jobs payment: %', sqlerrm; end;
end;
$$;

revoke all on function public._generate_installment_reminders(uuid) from public, anon, authenticated;
revoke all on function public._generate_survey_reminders(uuid) from public, anon, authenticated;
revoke all on function public._generate_booking_fee_reminders() from public, anon, authenticated;
revoke all on function public._generate_payment_followups() from public, anon, authenticated;
revoke all on function public.run_notification_jobs() from public, anon, authenticated;

-- Jadwalkan tiap 10 menit. pg_cron belum terpasang saat migrasi ini ditulis;
-- bila gagal (mis. izin), aktifkan di Dashboard > Database > Extensions > pg_cron
-- lalu jalankan ulang blok ini.
do $$
begin
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron tidak dapat diaktifkan otomatis: %', sqlerrm;
  end;

  if exists (select 1 from pg_extension where extname = 'pg_cron') then
    perform cron.unschedule(jobid) from cron.job where jobname = 'poliland-notification-jobs';
    perform cron.schedule('poliland-notification-jobs', '*/10 * * * *', 'select public.run_notification_jobs()');
  end if;
end $$;

-- ---------------------------------------------------------------------
-- 6. Kavling kembali tersedia (dilepas dari Booking/Sold)
--    Admin (normal), Kepala Marketing (low), Marketing pemilik client lama.
--    Booking & Sold sudah tercakup notifikasi SPK dan transaksi.
-- ---------------------------------------------------------------------
create or replace function public.trg_notify_lot_released()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_name text;
  v_data jsonb;
  v_actor uuid := (select auth.uid());
  v_key text := 'lot-released:' || new.id || ':' || floor(extract(epoch from now()))::bigint;
  v_body text := 'Kavling ' || coalesce(new.lot_number, '-') || ' kembali tersedia';
begin
  if new.status is not distinct from old.status or new.status <> 'Available' or old.status not in ('Booking', 'Sold') then
    return new;
  end if;
  if old.customer_id is not null then
    select c.marketing_id, c.full_name into v_owner, v_name from public.customers c where c.id = old.customer_id;
  end if;
  v_data := jsonb_build_object('lot_id', new.id, 'customer_id', old.customer_id);
  perform public._notify_role('admin', 'transaction', 'lot_released', 'normal', 'Kavling kembali tersedia',
    v_body || coalesce(' · sebelumnya ' || v_name, ''), v_data, v_key, v_actor);
  perform public._notify(v_owner, 'transaction', 'lot_released', 'normal', 'Kavling client kembali tersedia',
    v_body || coalesce(' · ' || v_name, ''), v_data, v_key, v_actor);
  perform public._notify_role('marketing_head', 'transaction', 'lot_released', 'low', 'Kavling kembali tersedia',
    v_body, v_data, v_key, v_actor);
  return new;
end;
$$;

drop trigger if exists trg_notify_lot_released on public.lots;
create trigger trg_notify_lot_released
  after update of status on public.lots
  for each row execute function public.trg_notify_lot_released();

-- ---------------------------------------------------------------------
-- 7. Jadwal survei diubah (waktu berganti, status tetap)
--    Perubahan status sudah ditangani trg_notify_survey_request.
-- ---------------------------------------------------------------------
create or replace function public.trg_notify_survey_rescheduled()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_lot text;
  v_name text;
  v_owner uuid;
  v_cid bigint;
  v_when text;
  v_body text;
  v_data jsonb;
  v_key text;
  v_actor uuid := (select auth.uid());
begin
  if new.scheduled_at is not distinct from old.scheduled_at or new.status is distinct from old.status
     or new.status not in ('pending', 'confirmed') then
    return new;
  end if;
  select l.lot_number into v_lot from public.lots l where l.id = new.lot_id;
  select c.id, c.full_name, c.marketing_id into v_cid, v_name, v_owner
    from public.customers c where c.user_id = new.client_id limit 1;
  v_when := to_char(new.scheduled_at at time zone 'Asia/Makassar', 'DD-MM-YYYY HH24:MI') || ' WITA';
  v_body := 'Kavling ' || coalesce(v_lot, '-') || ' · jadwal baru ' || v_when;
  v_data := jsonb_build_object('survey_id', new.id, 'lot_id', new.lot_id, 'scheduled_at', new.scheduled_at, 'customer_id', v_cid);
  v_key := 'survey-rescheduled:' || new.id || ':' || floor(extract(epoch from new.scheduled_at))::bigint;

  perform public._notify(new.client_id, 'survey', 'survey_rescheduled', 'high', 'Jadwal survei diubah', v_body, v_data, v_key, v_actor);
  perform public._notify(v_owner, 'survey', 'survey_rescheduled', 'normal', 'Jadwal survei client diubah',
    coalesce(v_name, 'Client') || ' · ' || v_body, v_data, v_key, v_actor);
  perform public._notify_role('admin', 'survey', 'survey_rescheduled', 'normal', 'Jadwal survei diubah',
    coalesce(v_name, 'Client') || ' · ' || v_body, v_data, v_key, v_actor);
  return new;
end;
$$;

drop trigger if exists trg_notify_survey_rescheduled on public.survey_requests;
create trigger trg_notify_survey_rescheduled
  after update of scheduled_at on public.survey_requests
  for each row execute function public.trg_notify_survey_rescheduled();

-- ---------------------------------------------------------------------
-- 8. Refund
--    Booking Fee : Pending Refund -> Admin; Refunded -> Client.
--    Pembelian   : Pending Transfer -> Admin; Paid -> Client.
-- ---------------------------------------------------------------------
create or replace function public.trg_notify_booking_fee_refund()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_client uuid;
  v_name text;
  v_data jsonb;
  v_actor uuid := (select auth.uid());
  v_body text;
begin
  select c.user_id, c.full_name into v_client, v_name from public.customers c where c.id = new.customer_id;
  v_data := jsonb_build_object('refund_id', new.id, 'payment_id', new.payment_id, 'spk_id', new.spk_request_id, 'customer_id', new.customer_id);
  v_body := public._rupiah(new.amount);

  if tg_op = 'INSERT' and new.status = 'Pending Refund' then
    perform public._notify_role('admin', 'payment', 'booking_fee_refund_pending', 'high', 'Refund Booking Fee perlu diproses',
      coalesce(v_name, 'Client') || ' · ' || v_body, v_data, 'bf-refund:' || new.id || ':Pending Refund', v_actor);
    perform public._notify(v_client, 'payment', 'booking_fee_refund_pending', 'normal', 'Refund Booking Fee sedang diproses',
      v_body || ' · akan ditransfer oleh Admin', v_data, 'bf-refund:' || new.id || ':Pending Refund', v_actor);
  elsif tg_op = 'UPDATE' and new.status = 'Refunded' and old.status is distinct from 'Refunded' then
    perform public._notify(v_client, 'payment', 'booking_fee_refunded', 'high', 'Refund Booking Fee telah ditransfer',
      v_body, v_data, 'bf-refund:' || new.id || ':Refunded', v_actor);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_booking_fee_refund on public.booking_fee_refunds;
create trigger trg_notify_booking_fee_refund
  after insert or update of status on public.booking_fee_refunds
  for each row execute function public.trg_notify_booking_fee_refund();

create or replace function public.trg_notify_purchase_refund()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_client uuid;
  v_name text;
  v_data jsonb;
  v_actor uuid := (select auth.uid());
  v_body text;
begin
  select c.user_id, c.full_name into v_client, v_name from public.customers c where c.id = new.customer_id;
  v_data := jsonb_build_object('refund_id', new.id, 'transaction_id', new.transaction_id, 'customer_id', new.customer_id);
  v_body := public._rupiah(new.amount);

  if tg_op = 'INSERT' and new.status = 'Pending Transfer' then
    perform public._notify_role('admin', 'payment', 'purchase_refund_pending', 'high', 'Refund pembelian perlu ditransfer',
      coalesce(v_name, 'Client') || ' · ' || v_body, v_data, 'purchase-refund:' || new.id || ':Pending Transfer', v_actor);
    perform public._notify(v_client, 'payment', 'purchase_refund_pending', 'normal', 'Refund pembelian sedang diproses',
      v_body || ' · akan ditransfer oleh Admin', v_data, 'purchase-refund:' || new.id || ':Pending Transfer', v_actor);
  elsif tg_op = 'UPDATE' and new.status = 'Paid' and old.status is distinct from 'Paid' then
    perform public._notify(v_client, 'payment', 'purchase_refund_paid', 'high', 'Refund pembelian telah ditransfer',
      v_body, v_data, 'purchase-refund:' || new.id || ':Paid', v_actor);
  end if;
  return new;
end;
$$;

drop trigger if exists trg_notify_purchase_refund on public.purchase_refunds;
create trigger trg_notify_purchase_refund
  after insert or update of status on public.purchase_refunds
  for each row execute function public.trg_notify_purchase_refund();

revoke all on function public.trg_notify_lot_released() from public, anon, authenticated;
revoke all on function public.trg_notify_survey_rescheduled() from public, anon, authenticated;
revoke all on function public.trg_notify_booking_fee_refund() from public, anon, authenticated;
revoke all on function public.trg_notify_purchase_refund() from public, anon, authenticated;
