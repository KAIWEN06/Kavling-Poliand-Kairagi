-- =====================================================================
-- Alur proses SPK setelah disetujui (prosedur baru)
--
-- Prosedur
--   Setelah SPK disetujui (Booking Fee Rp1.000.000 sudah terverifikasi, di luar
--   harga kavling), status kavling = Booking dan proses berjalan per langkah.
--
--   Tunai    : TTD SPK & Booking Fee -> AJB -> Terbit SHM -> Serah terima sertifikat
--   Cicilan  : TTD SPK & Booking Fee -> PPJB -> Bayar cicilan -> AJB
--              -> Terbit SHM -> Serah terima sertifikat
--
--   Status kavling menjadi Terjual (Sold) HANYA setelah serah terima sertifikat.
--   Sebelumnya kavling otomatis Sold begitu pembayaran terpenuhi; itu dihapus.
--
-- Aturan yang dijaga server
--   * Langkah dikerjakan berurutan.
--   * Tunai   : harga kavling harus lunas sebelum AJB diselesaikan.
--   * Cicilan : DP (bila ada) harus lunas sebelum PPJB diselesaikan;
--               semua cicilan harus lunas sebelum AJB diselesaikan.
--   * Langkah "Bayar cicilan" selesai otomatis saat cicilan terakhir lunas.
--   * Admin menentukan estimasi tanggal dan memberi tahu client bila langkah
--     sudah siap diproses. Client, marketing pemilik, dan kepala marketing
--     hanya bisa melihat.
-- Aman dijalankan ulang.
-- =====================================================================

create table if not exists public.spk_process_steps (
  id bigint generated always as identity primary key,
  spk_request_id bigint not null references public.spk_requests(id) on delete cascade,
  step_key text not null check (step_key in
    ('ttd_spk','ppjb','cicilan','ajb','shm','serah_terima')),
  position integer not null,
  status text not null default 'pending'
    check (status in ('pending','scheduled','ready','done')),
  estimated_date date,
  estimate_note text,
  ready_at timestamptz,
  completed_at timestamptz,
  completed_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (spk_request_id, step_key)
);

create index if not exists spk_process_steps_spk_idx
  on public.spk_process_steps (spk_request_id, position);

alter table public.spk_process_steps enable row level security;

drop policy if exists spk_process_steps_select on public.spk_process_steps;
create policy spk_process_steps_select on public.spk_process_steps
  for select to authenticated
  using (
    exists (select 1 from public.profiles p
            where p.id = (select auth.uid()) and p.role in ('admin','owner','marketing_head'))
    or public.marketing_owner_of_spk(spk_request_id) = (select auth.uid())
    or exists (select 1 from public.spk_requests r
               join public.customers c on c.id = r.customer_id
               where r.id = spk_request_id and c.user_id = (select auth.uid()))
  );
-- Tidak ada policy insert/update/delete: perubahan hanya lewat fungsi di bawah.

revoke all on public.spk_process_steps from anon;
grant select on public.spk_process_steps to authenticated;

-- ---------------------------------------------------------------------
-- Pembuatan langkah saat SPK disetujui
-- ---------------------------------------------------------------------
create or replace function public._create_spk_process_steps(p_spk_id bigint)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_method text;
begin
  select payment_method into v_method from public.spk_requests where id = p_spk_id;
  if v_method is null then return; end if;

  if v_method = 'Cash' then
    insert into public.spk_process_steps (spk_request_id, step_key, position) values
      (p_spk_id, 'ttd_spk', 1), (p_spk_id, 'ajb', 2),
      (p_spk_id, 'shm', 3), (p_spk_id, 'serah_terima', 4)
    on conflict (spk_request_id, step_key) do nothing;
  else
    insert into public.spk_process_steps (spk_request_id, step_key, position) values
      (p_spk_id, 'ttd_spk', 1), (p_spk_id, 'ppjb', 2), (p_spk_id, 'cicilan', 3),
      (p_spk_id, 'ajb', 4), (p_spk_id, 'shm', 5), (p_spk_id, 'serah_terima', 6)
    on conflict (spk_request_id, step_key) do nothing;
  end if;
end;
$$;

create or replace function public.trg_spk_create_process_steps()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.status = 'Approved' and (tg_op = 'INSERT' or old.status is distinct from 'Approved') then
    perform public._create_spk_process_steps(new.id);
    update public.spk_requests set notary_status = 'Menunggu Diproses' where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_spk_create_process_steps on public.spk_requests;
create trigger trg_spk_create_process_steps
  after insert or update of status on public.spk_requests
  for each row execute function public.trg_spk_create_process_steps();

-- SPK yang sudah disetujui sebelumnya: buat langkahnya.
-- Yang notary_status-nya 'Selesai' dianggap seluruh langkah sudah selesai.
do $$
declare r record;
begin
  for r in select id, notary_status from public.spk_requests where status = 'Approved' loop
    perform public._create_spk_process_steps(r.id);
    if r.notary_status = 'Selesai' then
      update public.spk_process_steps
         set status = 'done', completed_at = coalesce(completed_at, now())
       where spk_request_id = r.id and status <> 'done';
    end if;
  end loop;
end $$;

-- ---------------------------------------------------------------------
-- Nama langkah untuk teks notifikasi
-- ---------------------------------------------------------------------
create or replace function public._spk_step_title(p_key text)
returns text language sql immutable set search_path = '' as $$
  select case p_key
    when 'ttd_spk' then 'Tanda tangan SPK dan Booking Fee'
    when 'ppjb' then 'Tanda tangan PPJB di notaris'
    when 'cicilan' then 'Pembayaran cicilan'
    when 'ajb' then 'Tanda tangan AJB di notaris'
    when 'shm' then 'Penerbitan sertifikat (SHM)'
    when 'serah_terima' then 'Serah terima sertifikat'
    else p_key end;
$$;

-- Menjaga kolom lama notary_status tetap searah agar halaman lama tidak rusak.
create or replace function public._sync_spk_notary_status(p_spk_id bigint)
returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_total integer;
  v_done integer;
  v_active integer;
begin
  select count(*), count(*) filter (where status = 'done'),
         count(*) filter (where status in ('scheduled','ready'))
    into v_total, v_done, v_active
    from public.spk_process_steps where spk_request_id = p_spk_id;
  if v_total = 0 then return; end if;
  update public.spk_requests
     set notary_status = case
           when v_done = v_total then 'Selesai'
           when v_done > 0 or v_active > 0 then 'Proses Notaris'
           else 'Menunggu Diproses' end,
         updated_at = now()
   where id = p_spk_id;
end;
$$;

-- Penerima notifikasi: client, marketing pemilik.
create or replace function public._notify_spk_parties(
  p_spk_id bigint, p_type text, p_priority text, p_title text, p_body text, p_dedupe text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_client uuid;
  v_lot text;
  v_name text;
  v_data jsonb;
begin
  select c.user_id, l.lot_number, r.customer_full_name,
         jsonb_build_object('spk_id', r.id, 'spk_number', r.spk_number, 'lot_id', r.lot_id)
    into v_client, v_lot, v_name, v_data
    from public.spk_requests r
    join public.customers c on c.id = r.customer_id
    left join public.lots l on l.id = r.lot_id
   where r.id = p_spk_id;

  perform public._notify(v_client, 'spk', p_type, p_priority, p_title,
    'Kavling ' || coalesce(v_lot, '-') || ' · ' || p_body, v_data, p_dedupe || ':c', auth.uid());
  perform public._notify(public.marketing_owner_of_spk(p_spk_id), 'spk', p_type || '_client', 'normal',
    p_title, coalesce(v_name, 'Client') || ' · Kavling ' || coalesce(v_lot, '-') || ' · ' || p_body,
    v_data, p_dedupe || ':m', auth.uid());
end;
$$;

-- ---------------------------------------------------------------------
-- Admin: atur estimasi tanggal
-- ---------------------------------------------------------------------
create or replace function public.admin_set_spk_step_schedule(
  p_step_id bigint, p_estimated_date date, p_note text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_step public.spk_process_steps%rowtype;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Hanya Admin yang dapat mengatur jadwal proses';
  end if;
  select * into v_step from public.spk_process_steps where id = p_step_id for update;
  if not found then raise exception 'Langkah proses tidak ditemukan'; end if;
  if v_step.status = 'done' then raise exception 'Langkah ini sudah selesai'; end if;
  if p_estimated_date is null then raise exception 'Tanggal estimasi wajib diisi'; end if;
  if p_estimated_date < (now() at time zone 'Asia/Makassar')::date then
    raise exception 'Tanggal estimasi tidak boleh sebelum hari ini';
  end if;

  update public.spk_process_steps
     set estimated_date = p_estimated_date,
         estimate_note = nullif(btrim(p_note), ''),
         status = case when status = 'pending' then 'scheduled' else status end,
         updated_at = now()
   where id = p_step_id;

  perform public._sync_spk_notary_status(v_step.spk_request_id);
  perform public._notify_spk_parties(v_step.spk_request_id, 'spk_step_scheduled', 'normal',
    'Jadwal proses diperbarui',
    public._spk_step_title(v_step.step_key) || ' · estimasi ' || to_char(p_estimated_date, 'DD-MM-YYYY'),
    'spkstep-sched:' || p_step_id || ':' || to_char(p_estimated_date, 'YYYYMMDD'));
end;
$$;

-- ---------------------------------------------------------------------
-- Admin: tandai siap diproses dan beri tahu client
-- ---------------------------------------------------------------------
create or replace function public.admin_mark_spk_step_ready(
  p_step_id bigint, p_note text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_step public.spk_process_steps%rowtype;
  v_prev_open integer;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Hanya Admin yang dapat memberi tahu client';
  end if;
  select * into v_step from public.spk_process_steps where id = p_step_id for update;
  if not found then raise exception 'Langkah proses tidak ditemukan'; end if;
  if v_step.status = 'done' then raise exception 'Langkah ini sudah selesai'; end if;
  if v_step.step_key = 'cicilan' then
    raise exception 'Langkah cicilan berjalan otomatis mengikuti jadwal cicilan';
  end if;

  select count(*) into v_prev_open from public.spk_process_steps
   where spk_request_id = v_step.spk_request_id and position < v_step.position and status <> 'done';
  if v_prev_open > 0 then
    raise exception 'Selesaikan langkah sebelumnya terlebih dahulu';
  end if;

  update public.spk_process_steps
     set status = 'ready', ready_at = now(),
         note = coalesce(nullif(btrim(p_note), ''), note), updated_at = now()
   where id = p_step_id;

  perform public._sync_spk_notary_status(v_step.spk_request_id);
  perform public._notify_spk_parties(v_step.spk_request_id, 'spk_step_ready', 'high',
    'Langkah berikutnya sudah bisa diproses',
    public._spk_step_title(v_step.step_key)
      || coalesce(' · jadwal ' || to_char(v_step.estimated_date, 'DD-MM-YYYY'), ''),
    'spkstep-ready:' || p_step_id);
end;
$$;

-- ---------------------------------------------------------------------
-- Admin: selesaikan langkah (dengan syarat pembayaran)
-- ---------------------------------------------------------------------
create or replace function public.admin_complete_spk_step(
  p_step_id bigint, p_note text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_step public.spk_process_steps%rowtype;
  v_spk public.spk_requests%rowtype;
  v_tx public.lot_transactions%rowtype;
  v_prev_open integer;
  v_paid bigint;
  v_unpaid integer;
  v_remaining integer;
begin
  if not exists (select 1 from public.profiles where id = auth.uid() and role = 'admin') then
    raise exception 'Hanya Admin yang dapat menyelesaikan langkah proses';
  end if;
  select * into v_step from public.spk_process_steps where id = p_step_id for update;
  if not found then raise exception 'Langkah proses tidak ditemukan'; end if;
  if v_step.status = 'done' then raise exception 'Langkah ini sudah selesai'; end if;
  if v_step.step_key = 'cicilan' then
    raise exception 'Langkah cicilan selesai otomatis saat cicilan terakhir lunas';
  end if;

  select * into v_spk from public.spk_requests where id = v_step.spk_request_id;
  select * into v_tx from public.lot_transactions where id = v_spk.transaction_id for update;
  if v_tx.id is null or v_tx.status = 'Cancelled' then
    raise exception 'Transaksi SPK tidak aktif';
  end if;

  select count(*) into v_prev_open from public.spk_process_steps
   where spk_request_id = v_step.spk_request_id and position < v_step.position and status <> 'done';
  if v_prev_open > 0 then
    raise exception 'Selesaikan langkah sebelumnya terlebih dahulu';
  end if;

  -- Syarat pembayaran
  if v_step.step_key = 'ajb' and v_spk.payment_method = 'Cash' then
    select coalesce(sum(amount), 0) into v_paid from public.payments
     where transaction_id = v_tx.id and status = 'Confirmed' and payment_category = 'Cash Purchase';
    if v_paid < v_tx.final_price then
      raise exception 'Harga kavling belum lunas. Terverifikasi %, dibutuhkan %',
        public._rupiah(v_paid), public._rupiah(v_tx.final_price);
    end if;
  elsif v_step.step_key = 'ppjb' and coalesce(v_tx.down_payment, 0) > 0 then
    select coalesce(sum(amount), 0) into v_paid from public.payments
     where transaction_id = v_tx.id and status = 'Confirmed' and payment_category = 'Down Payment';
    if v_paid < v_tx.down_payment then
      raise exception 'DP belum lunas. Terverifikasi %, dibutuhkan %',
        public._rupiah(v_paid), public._rupiah(v_tx.down_payment);
    end if;
  elsif v_step.step_key = 'ajb' and v_spk.payment_method = 'Installment' then
    select count(*) into v_unpaid from public.installment_schedules
     where transaction_id = v_tx.id and status <> 'Paid';
    if v_unpaid > 0 then
      raise exception 'Masih ada % cicilan yang belum lunas', v_unpaid;
    end if;
  end if;

  update public.spk_process_steps
     set status = 'done', completed_at = now(), completed_by = auth.uid(),
         note = coalesce(nullif(btrim(p_note), ''), note), updated_at = now()
   where id = p_step_id;

  -- Setelah serah terima sertifikat, kavling resmi Terjual.
  if v_step.step_key = 'serah_terima' then
    update public.lot_transactions
       set status = 'Sold', sold_date = coalesce(sold_date, current_date), updated_at = now()
     where id = v_tx.id and status <> 'Sold';
    update public.lots
       set status = 'Sold', customer_id = v_tx.customer_id, sold_date = coalesce(sold_date, current_date),
           updated_at = now()
     where id = v_tx.lot_id;
  end if;

  perform public._sync_spk_notary_status(v_step.spk_request_id);

  select count(*) into v_remaining from public.spk_process_steps
   where spk_request_id = v_step.spk_request_id and status <> 'done';

  perform public._notify_spk_parties(v_step.spk_request_id,
    case when v_remaining = 0 then 'spk_process_done' else 'spk_step_done' end,
    case when v_remaining = 0 then 'high' else 'normal' end,
    case when v_remaining = 0 then 'Proses selesai, kavling terjual' else 'Satu langkah sudah selesai' end,
    case when v_remaining = 0 then 'Sertifikat sudah diserahterimakan'
         else public._spk_step_title(v_step.step_key) end,
    'spkstep-done:' || p_step_id);
end;
$$;

-- ---------------------------------------------------------------------
-- Langkah "Bayar cicilan" selesai otomatis saat cicilan terakhir lunas
-- ---------------------------------------------------------------------
create or replace function public.trg_spk_installments_complete_step()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_spk_id bigint;
  v_unpaid integer;
begin
  if new.status is distinct from 'Paid' or old.status is not distinct from new.status then
    return new;
  end if;
  select r.id into v_spk_id from public.spk_requests r where r.transaction_id = new.transaction_id limit 1;
  if v_spk_id is null then return new; end if;

  select count(*) into v_unpaid from public.installment_schedules
   where transaction_id = new.transaction_id and status <> 'Paid';
  if v_unpaid = 0 then
    update public.spk_process_steps
       set status = 'done', completed_at = now(), updated_at = now()
     where spk_request_id = v_spk_id and step_key = 'cicilan' and status <> 'done';
    if found then
      perform public._sync_spk_notary_status(v_spk_id);
      perform public._notify_spk_parties(v_spk_id, 'spk_step_done', 'normal',
        'Semua cicilan lunas', 'Berikutnya penandatanganan AJB. Admin akan memberi tahu jadwalnya.',
        'spkstep-cicilan-done:' || v_spk_id);
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_spk_installments_complete_step on public.installment_schedules;
create trigger trg_spk_installments_complete_step
  after update of status on public.installment_schedules
  for each row execute function public.trg_spk_installments_complete_step();

-- ---------------------------------------------------------------------
-- Kavling tidak lagi otomatis Terjual saat pembayaran terpenuhi.
-- Terjual hanya lewat serah terima sertifikat (admin_complete_spk_step).
-- Selain itu fungsi ini tetap menjaga status Booking.
-- ---------------------------------------------------------------------
create or replace function public.sync_poliland_transaction_status(p_transaction_id bigint)
returns void
language plpgsql security definer set search_path = 'public' as $$
declare
  v_tx public.lot_transactions%rowtype;
  v_booking_paid bigint := 0;
  v_booking_complete boolean := false;
begin
  select * into v_tx from public.lot_transactions where id = p_transaction_id for update;
  if not found or v_tx.status in ('Cancelled', 'Sold') then
    return;
  end if;

  select coalesce(sum(amount), 0) into v_booking_paid
    from public.payments
   where transaction_id = p_transaction_id and status = 'Confirmed' and payment_category = 'Booking';

  v_booking_complete := coalesce(v_tx.booking_fee, 0) = 0
    or v_booking_paid >= coalesce(v_tx.booking_fee, 0);

  if v_booking_complete and coalesce(v_tx.booking_fee, 0) > 0 then
    update public.lot_transactions set updated_at = now()
     where id = p_transaction_id and status = 'Booking';

    update public.lots
       set status = 'Booking', customer_id = v_tx.customer_id, payment_type = v_tx.payment_type,
           booking_date = coalesce(booking_date, v_tx.booking_date, current_date),
           sold_date = null, updated_at = now()
     where id = v_tx.lot_id and status <> 'Sold';
  end if;
end;
$$;

revoke all on function public.admin_set_spk_step_schedule(bigint, date, text) from public, anon;
revoke all on function public.admin_mark_spk_step_ready(bigint, text) from public, anon;
revoke all on function public.admin_complete_spk_step(bigint, text) from public, anon;
grant execute on function public.admin_set_spk_step_schedule(bigint, date, text) to authenticated;
grant execute on function public.admin_mark_spk_step_ready(bigint, text) to authenticated;
grant execute on function public.admin_complete_spk_step(bigint, text) to authenticated;
