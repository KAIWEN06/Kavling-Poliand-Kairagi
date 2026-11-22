-- =====================================================================
-- Marketing & Kepala Bagian Marketing: RPC laporan, notifikasi, CRM
-- Bergantung pada 202611230001_marketing_scope_and_rls.sql
--
-- Semua RPC bersifat BACA-SAJA terhadap data keuangan. Tidak ada RPC
-- di sini yang mengubah SPK, pembayaran, jadwal cicilan, atau komisi.
-- Zona waktu pelaporan: Asia/Makassar (WITA, lokasi proyek Manado).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Anggota tim yang boleh dilaporkan untuk pemanggil.
--   marketing       -> hanya dirinya
--   marketing_head  -> seluruh marketing + marketing_head (opsional filter 1 orang)
--   admin / owner   -> sama seperti marketing_head (pemantauan operasional)
-- ---------------------------------------------------------------------
create or replace function public.marketing_report_members(p_marketing_id uuid default null)
returns table (member_id uuid, member_name text, member_role text)
language plpgsql stable security definer set search_path = '' as $$
declare
  v_role text := public.current_app_role();
begin
  if (select auth.uid()) is null or v_role is null
     or v_role not in ('marketing', 'marketing_head', 'admin', 'owner') then
    raise exception 'Akses laporan Marketing tidak diizinkan untuk akun ini.';
  end if;

  if v_role = 'marketing' then
    p_marketing_id := (select auth.uid());
  end if;

  if p_marketing_id is not null and not public.is_marketing_team_member(p_marketing_id) then
    raise exception 'Marketing yang dipilih bukan anggota tim Marketing.';
  end if;

  return query
    select p.id, coalesce(nullif(btrim(p.full_name), ''), 'Marketing'), p.role
    from public.profiles p
    where p.role in ('marketing', 'marketing_head')
      and (p_marketing_id is null or p.id = p_marketing_id);
end;
$$;

revoke all on function public.marketing_report_members(uuid) from public, anon;
grant execute on function public.marketing_report_members(uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Ubah status perkembangan (CRM) + catatan. Riwayat dicatat trigger.
-- ---------------------------------------------------------------------
create or replace function public.update_customer_crm_status(
  p_customer_id bigint,
  p_status text,
  p_note text default null
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_owner uuid;
  v_old text;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if (select auth.uid()) is null then
    raise exception 'Sesi login tidak ditemukan.';
  end if;

  if p_status is null or p_status not in (
    'Baru','Belum Dihubungi','Sudah Dihubungi','Follow-up','Berminat',
    'Survey Lokasi','Negosiasi','Pengajuan','Berhasil','Tidak Lanjut') then
    raise exception 'Status perkembangan tidak valid.';
  end if;

  if v_note is not null and length(v_note) > 2000 then
    raise exception 'Catatan maksimal 2000 karakter.';
  end if;

  select c.marketing_id, c.crm_status into v_owner, v_old
  from public.customers c where c.id = p_customer_id for update;

  if not found then
    raise exception 'Client tidak ditemukan.';
  end if;

  if not (public.is_finance_admin() or public.marketing_scope_allows(v_owner)) then
    raise exception 'Anda tidak memiliki akses untuk mengubah perkembangan client ini.';
  end if;

  if v_old = p_status then
    -- Status sama: catatan tetap disimpan sebagai riwayat tindak lanjut.
    if v_note is not null then
      insert into public.customer_crm_status_history (customer_id, old_status, new_status, note, changed_by)
      values (p_customer_id, v_old, p_status, v_note, (select auth.uid()));
    end if;
    return;
  end if;

  perform set_config('poliland.crm_note', coalesce(v_note, ''), true);
  update public.customers
     set crm_status = p_status,
         updated_at = now()
   where id = p_customer_id;
  perform set_config('poliland.crm_note', '', true);
end;
$$;

revoke all on function public.update_customer_crm_status(bigint, text, text) from public, anon;
grant execute on function public.update_customer_crm_status(bigint, text, text) to authenticated;

-- ---------------------------------------------------------------------
-- Laporan Marketing (dashboard, statistik, performa, asal konsumen)
-- Nilai kontrak, penerimaan kas, dan komisi dipisahkan.
-- ---------------------------------------------------------------------
create or replace function public.get_marketing_report(
  p_from date default null,
  p_to date default null,
  p_marketing_id uuid default null
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_tz constant text := 'Asia/Makassar';
  v_today date := (now() at time zone 'Asia/Makassar')::date;
  v_from date := coalesce(p_from, date_trunc('month', now() at time zone 'Asia/Makassar')::date);
  v_to date := coalesce(p_to, (now() at time zone 'Asia/Makassar')::date);
  v_bucket text;
  v_result jsonb;
begin
  if v_to < v_from then
    raise exception 'Tanggal akhir tidak boleh sebelum tanggal awal.';
  end if;
  if v_to - v_from > 1830 then
    raise exception 'Rentang laporan maksimal 5 tahun.';
  end if;

  v_bucket := case
    when v_to - v_from <= 14 then 'day'
    when v_to - v_from <= 92 then 'week'
    else 'month' end;

  with
  members as (
    select * from public.marketing_report_members(p_marketing_id)
  ),
  cust as (
    select c.*, (c.created_at at time zone v_tz)::date as created_day
    from public.customers c
    where c.marketing_id in (select member_id from members)
  ),
  spk as (
    select sr.*,
      coalesce(c.marketing_id, case when sr.submission_source = 'Marketing' then sr.marketing_id end) as owner_id
    from public.spk_requests sr
    left join public.customers c on c.id = sr.customer_id
    where coalesce(c.marketing_id, case when sr.submission_source = 'Marketing' then sr.marketing_id end)
          in (select member_id from members)
  ),
  tx as (
    select t.*, public.marketing_owner_of_transaction(t.id) as owner_id
    from public.lot_transactions t
    where public.marketing_owner_of_transaction(t.id) in (select member_id from members)
  ),
  tx_period as (
    select * from tx
    where status <> 'Cancelled'
      and booking_date between v_from and v_to
  ),
  pay as (
    select p.*, public.marketing_owner_of_payment(p.id) as owner_id
    from public.payments p
    where public.marketing_owner_of_payment(p.id) in (select member_id from members)
  ),
  comm as (
    select mc.* from public.marketing_commissions mc
    where mc.marketing_id in (select member_id from members)
      and mc.status <> 'Cancelled'
      and (mc.created_at at time zone v_tz)::date between v_from and v_to
  ),
  sched as (
    select s.*, tx.owner_id
    from public.installment_schedules s
    join tx on tx.id = s.transaction_id
    where tx.status <> 'Cancelled'
  ),
  buckets as (
    select gs::date as bucket_start
    from generate_series(date_trunc(v_bucket, v_from::timestamp), v_to::timestamp, ('1 ' || v_bucket)::interval) gs
  )
  select jsonb_build_object(
    'period', jsonb_build_object('from', v_from, 'to', v_to, 'bucket', v_bucket, 'timezone', v_tz),
    'summary', jsonb_build_object(
      'total_clients', (select count(*) from cust),
      'new_clients', (select count(*) from cust where created_day between v_from and v_to),
      'crm', coalesce((select jsonb_object_agg(crm_status, n) from (select crm_status, count(*) n from cust group by crm_status) x), '{}'::jsonb),
      'no_followup_7d', (select count(*) from cust
        where crm_status not in ('Berhasil', 'Tidak Lanjut')
          and coalesce(last_contacted_at, created_at) < now() - interval '7 days'),
      'spk_submitted', (select count(*) from spk where (submitted_at at time zone v_tz)::date between v_from and v_to),
      'spk_pending', (select count(*) from spk where status in ('Submitted', 'Under Review')),
      'spk_approved', (select count(*) from spk where status = 'Approved' and (approved_at at time zone v_tz)::date between v_from and v_to),
      'spk_rejected', (select count(*) from spk where status = 'Rejected' and (coalesce(reviewed_at, updated_at) at time zone v_tz)::date between v_from and v_to),
      'units_sold', (select count(*) from tx_period),
      'units_booked', (select count(*) from tx_period where status = 'Booking'),
      'units_paid_off', (select count(*) from tx_period where status = 'Sold'),
      'contract_value', (select coalesce(sum(final_price), 0) from tx_period),
      'cash_units', (select count(*) from tx_period where payment_type = 'Cash'),
      'cash_contract_value', (select coalesce(sum(final_price), 0) from tx_period where payment_type = 'Cash'),
      'installment_units', (select count(*) from tx_period where payment_type = 'Installment'),
      'installment_contract_value', (select coalesce(sum(final_price), 0) from tx_period where payment_type = 'Installment'),
      'cash_in', (select coalesce(sum(amount), 0) from pay where status = 'Confirmed' and (coalesce(verified_at, submitted_at) at time zone v_tz)::date between v_from and v_to),
      'cash_in_by_category', coalesce((select jsonb_object_agg(payment_category, total) from (
          select payment_category, sum(amount) total from pay
          where status = 'Confirmed' and (coalesce(verified_at, submitted_at) at time zone v_tz)::date between v_from and v_to
          group by payment_category) x), '{}'::jsonb),
      'payments_pending_count', (select count(*) from pay where status = 'Pending'),
      'payments_pending_amount', (select coalesce(sum(amount), 0) from pay where status = 'Pending'),
      'payments_rejected_count', (select count(*) from pay where status in ('Rejected', 'Needs Reupload') and (submitted_at at time zone v_tz)::date between v_from and v_to),
      'installments_due_soon', (select count(*) from sched where status = 'Pending' and due_date between v_today and v_today + 7),
      'installments_overdue', (select count(*) from sched where status = 'Overdue' or (status = 'Pending' and due_date < v_today)),
      'installments_overdue_amount', (select coalesce(sum(amount), 0) from sched where status = 'Overdue' or (status = 'Pending' and due_date < v_today)),
      'commission_total', (select coalesce(sum(commission_amount), 0) from comm),
      'commission_pending', (select coalesce(sum(commission_amount), 0) from comm where status in ('Pending', 'Eligible', 'Processing')),
      'commission_paid', (select coalesce(sum(commission_amount), 0) from comm where status = 'Paid'),
      'commission_count', (select count(*) from comm),
      'team_size', (select count(*) from members where member_role = 'marketing')
    ),
    'trend', coalesce((select jsonb_agg(jsonb_build_object(
        'bucket', b.bucket_start,
        'new_clients', (select count(*) from cust where date_trunc(v_bucket, created_day::timestamp)::date = b.bucket_start and created_day between v_from and v_to),
        'spk_approved', (select count(*) from spk where status = 'Approved'
            and date_trunc(v_bucket, (approved_at at time zone v_tz))::date = b.bucket_start
            and (approved_at at time zone v_tz)::date between v_from and v_to),
        'units_sold', (select count(*) from tx_period where date_trunc(v_bucket, booking_date::timestamp)::date = b.bucket_start),
        'contract_value', (select coalesce(sum(final_price), 0) from tx_period where date_trunc(v_bucket, booking_date::timestamp)::date = b.bucket_start),
        'cash_in', (select coalesce(sum(amount), 0) from pay where status = 'Confirmed'
            and date_trunc(v_bucket, (coalesce(verified_at, submitted_at) at time zone v_tz))::date = b.bucket_start
            and (coalesce(verified_at, submitted_at) at time zone v_tz)::date between v_from and v_to)
      ) order by b.bucket_start) from buckets b), '[]'::jsonb),
    'team', coalesce((select jsonb_agg(row_to_json(t)::jsonb order by t.spk_approved desc, t.contract_value desc, t.conversion_rate desc, t.full_name)
      from (
        select
          m.member_id as id,
          m.member_name as full_name,
          m.member_role as role,
          (select count(*) from cust where marketing_id = m.member_id) as total_clients,
          (select count(*) from cust where marketing_id = m.member_id and created_day between v_from and v_to) as new_clients,
          (select count(*) from cust where marketing_id = m.member_id and crm_status = 'Sudah Dihubungi') as contacted,
          (select count(*) from cust where marketing_id = m.member_id and crm_status = 'Follow-up') as followup,
          (select count(*) from cust where marketing_id = m.member_id and crm_status in ('Berminat', 'Survey Lokasi')) as interested,
          (select count(*) from cust where marketing_id = m.member_id and crm_status = 'Negosiasi') as negotiation,
          (select count(*) from cust where marketing_id = m.member_id and crm_status = 'Pengajuan') as submission,
          (select count(*) from cust where marketing_id = m.member_id and crm_status = 'Berhasil') as won,
          (select count(*) from cust where marketing_id = m.member_id and crm_status = 'Tidak Lanjut') as lost,
          (select count(*) from spk where owner_id = m.member_id and status = 'Approved'
              and (approved_at at time zone v_tz)::date between v_from and v_to) as spk_approved,
          (select count(*) from tx_period where owner_id = m.member_id) as units_sold,
          (select coalesce(sum(final_price), 0) from tx_period where owner_id = m.member_id) as contract_value,
          (select coalesce(sum(commission_amount), 0) from comm where marketing_id = m.member_id) as commission_total,
          case when (select count(*) from cust where marketing_id = m.member_id) = 0 then 0
               else round(100.0 * (select count(distinct customer_id) from tx where owner_id = m.member_id and status <> 'Cancelled')
                    / (select count(*) from cust where marketing_id = m.member_id), 1) end as conversion_rate,
          greatest(
            (select max(f.created_at) from public.customer_followups f where f.user_id = m.member_id),
            (select max(h.created_at) from public.customer_crm_status_history h where h.changed_by = m.member_id)
          ) as last_activity_at
        from members m
      ) t), '[]'::jsonb),
    'regions', coalesce((select jsonb_agg(row_to_json(r)::jsonb order by r.clients desc, r.province, r.city)
      from (
        select
          coalesce(nullif(btrim(c.province_name), ''), 'Belum diisi') as province,
          coalesce(nullif(btrim(c.city_name), ''), 'Belum diisi') as city,
          count(*) as clients,
          count(*) filter (where exists (select 1 from tx where tx.customer_id = c.id and tx.status <> 'Cancelled')) as buyers,
          round(100.0 * count(*) filter (where exists (select 1 from tx where tx.customer_id = c.id and tx.status <> 'Cancelled'))
                / nullif(count(*), 0), 1) as conversion_rate
        from cust c
        where c.created_day between v_from and v_to
        group by 1, 2
      ) r), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

revoke all on function public.get_marketing_report(date, date, uuid) from public, anon;
grant execute on function public.get_marketing_report(date, date, uuid) to authenticated;

-- ---------------------------------------------------------------------
-- Aktivitas terbaru tim (perubahan status, follow-up, catatan, SPK)
-- ---------------------------------------------------------------------
create or replace function public.get_marketing_activity(
  p_marketing_id uuid default null,
  p_limit integer default 20
) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 20), 1), 100);
  v_result jsonb;
begin
  with members as (
    select * from public.marketing_report_members(p_marketing_id)
  ),
  cust as (
    select c.id, c.full_name, c.marketing_id from public.customers c
    where c.marketing_id in (select member_id from members)
  ),
  events as (
    select 'crm' as kind, h.created_at as occurred_at, h.customer_id, cust.full_name as customer_name,
           h.changed_by as actor_id,
           case when h.old_status is null then 'Client baru ditambahkan'
                when h.old_status = h.new_status then 'Catatan perkembangan ditambahkan'
                else 'Status: ' || h.old_status || ' → ' || h.new_status end as title,
           h.note as body
    from public.customer_crm_status_history h join cust on cust.id = h.customer_id
    union all
    select 'followup', f.created_at, f.customer_id, cust.full_name, f.user_id,
           'Follow-up via ' || f.method || ' (' || f.status || ')', f.notes
    from public.customer_followups f join cust on cust.id = f.customer_id
    union all
    select 'note', n.created_at, n.customer_id, cust.full_name, n.created_by,
           'Catatan: ' || coalesce(nullif(n.title, ''), n.category), left(coalesce(n.content, n.note), 280)
    from public.customer_notes n join cust on cust.id = n.customer_id
    union all
    select 'spk', sh.created_at, sr.customer_id, coalesce(cust.full_name, sr.customer_full_name), sh.changed_by,
           'SPK ' || sr.spk_number || ': ' || coalesce(sh.old_status || ' → ', '') || sh.new_status, sh.note
    from public.spk_request_status_history sh
    join public.spk_requests sr on sr.id = sh.spk_request_id
    left join cust on cust.id = sr.customer_id
    where public.marketing_owner_of_spk(sr.id) in (select member_id from members)
  )
  select coalesce(jsonb_agg(jsonb_build_object(
      'kind', e.kind, 'occurred_at', e.occurred_at, 'customer_id', e.customer_id,
      'customer_name', e.customer_name, 'actor_id', e.actor_id,
      'actor_name', coalesce(p.full_name, 'Sistem'), 'actor_role', p.role,
      'title', e.title, 'body', e.body
    ) order by e.occurred_at desc), '[]'::jsonb)
  into v_result
  from (select * from events order by occurred_at desc limit v_limit) e
  left join public.profiles p on p.id = e.actor_id;

  return v_result;
end;
$$;

revoke all on function public.get_marketing_activity(uuid, integer) from public, anon;
grant execute on function public.get_marketing_activity(uuid, integer) to authenticated;

-- ---------------------------------------------------------------------
-- Notifikasi turunan (tanpa tabel baru), mengikuti pola notifikasi
-- Client di AppHeader yang menurunkan notifikasi dari data transaksi.
-- ---------------------------------------------------------------------
create or replace function public.get_marketing_notifications(p_limit integer default 40)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 40), 1), 100);
  v_today date := (now() at time zone 'Asia/Makassar')::date;
  v_since timestamptz := now() - interval '30 days';
  v_result jsonb;
begin
  with members as (
    select * from public.marketing_report_members(null)
  ),
  spk as (
    select sr.id, sr.spk_number, sr.customer_id, sr.customer_full_name, sr.rejection_reason
    from public.spk_requests sr
    where public.marketing_owner_of_spk(sr.id) in (select member_id from members)
  ),
  tx as (
    select t.id, t.customer_id, t.status, t.sold_date, t.cancelled_date, l.lot_number
    from public.lot_transactions t
    left join public.lots l on l.id = t.lot_id
    where public.marketing_owner_of_transaction(t.id) in (select member_id from members)
  ),
  pay as (
    select p.id, p.customer_id, p.amount, p.payment_category, p.submitted_at, p.review_note
    from public.payments p
    where public.marketing_owner_of_payment(p.id) in (select member_id from members)
  ),
  events as (
    -- SPK
    select 'spk_' || lower(replace(sh.new_status, ' ', '_')) as kind,
           case sh.new_status
             when 'Submitted' then 'SPK diajukan'
             when 'Under Review' then 'SPK sedang ditinjau Admin'
             when 'Approved' then 'SPK terkonfirmasi'
             when 'Rejected' then 'SPK ditolak'
             when 'Cancelled' then 'SPK dibatalkan'
             else 'Status SPK berubah' end as title,
           spk.spk_number || case when sh.new_status = 'Rejected' and spk.rejection_reason is not null
                                  then ' · Alasan: ' || spk.rejection_reason else '' end as body,
           case when sh.new_status = 'Rejected' then 'danger'
                when sh.new_status = 'Approved' then 'success' else 'info' end as severity,
           spk.customer_id, spk.customer_full_name as customer_name, sh.created_at as occurred_at
    from public.spk_request_status_history sh
    join spk on spk.id = sh.spk_request_id
    where sh.created_at >= v_since
    union all
    -- Pembayaran diajukan
    select 'payment_submitted', 'Pembayaran diajukan',
           pay.payment_category || ' · Rp' || to_char(coalesce(pay.amount, 0), 'FM999G999G999G999'),
           'info', pay.customer_id, c.full_name, pay.submitted_at
    from pay left join public.customers c on c.id = pay.customer_id
    where pay.submitted_at >= v_since
    union all
    -- Hasil verifikasi pembayaran
    select 'payment_' || lower(replace(h.new_status, ' ', '_')),
           case h.new_status
             when 'Confirmed' then 'Pembayaran terkonfirmasi'
             when 'Rejected' then 'Pembayaran ditolak'
             when 'Needs Reupload' then 'Bukti pembayaran perlu diunggah ulang'
             else 'Status pembayaran berubah' end,
           pay.payment_category || ' · Rp' || to_char(coalesce(pay.amount, 0), 'FM999G999G999G999')
             || coalesce(' · ' || nullif(h.review_note, ''), ''),
           case when h.new_status = 'Confirmed' then 'success'
                when h.new_status in ('Rejected', 'Needs Reupload') then 'danger' else 'info' end,
           pay.customer_id, c.full_name, h.created_at
    from public.payment_status_history h
    join pay on pay.id = h.payment_id
    left join public.customers c on c.id = pay.customer_id
    where h.created_at >= v_since and h.old_status is distinct from h.new_status
    union all
    -- Cicilan mendekati jatuh tempo (7 hari)
    select 'installment_due_soon', 'Cicilan mendekati jatuh tempo',
           'Cicilan ke-' || s.installment_number || ' · ' || coalesce(tx.lot_number, '-') || ' · jatuh tempo '
             || to_char(s.due_date, 'DD-MM-YYYY'),
           'warning', tx.customer_id, c.full_name, (s.due_date - 7)::timestamptz
    from public.installment_schedules s
    join tx on tx.id = s.transaction_id
    left join public.customers c on c.id = tx.customer_id
    where s.status = 'Pending' and s.due_date between v_today and v_today + 7 and tx.status <> 'Cancelled'
    union all
    -- Cicilan terlambat
    select 'installment_overdue', 'Cicilan terlambat',
           'Cicilan ke-' || s.installment_number || ' · ' || coalesce(tx.lot_number, '-') || ' · terlambat '
             || (v_today - s.due_date) || ' hari',
           'danger', tx.customer_id, c.full_name, s.due_date::timestamptz
    from public.installment_schedules s
    join tx on tx.id = s.transaction_id
    left join public.customers c on c.id = tx.customer_id
    where (s.status = 'Overdue' or (s.status = 'Pending' and s.due_date < v_today)) and tx.status <> 'Cancelled'
    union all
    -- Pembatalan transaksi
    select 'cancellation_' || lower(pcr.status),
           case pcr.status when 'Pending' then 'Pembatalan transaksi diajukan'
                           when 'Approved' then 'Pembatalan transaksi disetujui'
                           else 'Pembatalan transaksi ditolak' end,
           coalesce(tx.lot_number, '-') || ' · ' || left(pcr.reason, 160),
           case when pcr.status = 'Pending' then 'warning' else 'info' end,
           pcr.customer_id, c.full_name, coalesce(pcr.reviewed_at, pcr.created_at)
    from public.purchase_cancellation_requests pcr
    join tx on tx.id = pcr.transaction_id
    left join public.customers c on c.id = pcr.customer_id
    where coalesce(pcr.reviewed_at, pcr.created_at) >= v_since
    union all
    -- Perubahan status transaksi (lunas / batal)
    select 'transaction_' || lower(tx.status),
           case tx.status when 'Sold' then 'Transaksi lunas' else 'Transaksi dibatalkan' end,
           coalesce(tx.lot_number, '-'),
           case tx.status when 'Sold' then 'success' else 'danger' end,
           tx.customer_id, c.full_name,
           coalesce(case tx.status when 'Sold' then tx.sold_date else tx.cancelled_date end, v_today)::timestamptz
    from tx left join public.customers c on c.id = tx.customer_id
    where tx.status in ('Sold', 'Cancelled')
      and coalesce(case tx.status when 'Sold' then tx.sold_date else tx.cancelled_date end, v_today) >= (v_since at time zone 'Asia/Makassar')::date
  )
  select coalesce(jsonb_agg(to_jsonb(e) order by e.occurred_at desc), '[]'::jsonb)
  into v_result
  from (select * from events order by occurred_at desc limit v_limit) e;

  return v_result;
end;
$$;

revoke all on function public.get_marketing_notifications(integer) from public, anon;
grant execute on function public.get_marketing_notifications(integer) to authenticated;

-- ---------------------------------------------------------------------
-- RPC lama get_marketing_head_dashboard menghitung SELURUH customers
-- (termasuk client yang mendaftar sendiri). Diperbaiki agar konsisten
-- dengan scope tim; bentuk JSON lama dipertahankan.
-- ---------------------------------------------------------------------
create or replace function public.get_marketing_head_dashboard()
returns jsonb
language plpgsql security definer set search_path = '' as $$
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
    'prospect_count', (select count(*) from public.customers c where public.is_marketing_team_member(c.marketing_id)),
    'active_spk_count', (select count(*) from public.spk_requests sr
        where sr.status in ('Submitted', 'Under Review')
          and public.is_marketing_team_member(public.marketing_owner_of_spk(sr.id))),
    'approved_spk_count', (select count(*) from public.spk_requests sr
        where sr.status = 'Approved'
          and public.is_marketing_team_member(public.marketing_owner_of_spk(sr.id))),
    'team', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'full_name', coalesce(p.full_name, 'Marketing'),
        'prospect_count', (select count(*) from public.customers c where c.marketing_id = p.id),
        'active_spk_count', (select count(*) from public.spk_requests sr
            where sr.status in ('Submitted', 'Under Review') and public.marketing_owner_of_spk(sr.id) = p.id),
        'approved_spk_count', (select count(*) from public.spk_requests sr
            where sr.status = 'Approved' and public.marketing_owner_of_spk(sr.id) = p.id)
      ) order by p.full_name)
      from public.profiles p where p.role = 'marketing'
    ), '[]'::jsonb)
  );
end;
$$;
