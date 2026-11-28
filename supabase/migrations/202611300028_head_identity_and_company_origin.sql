-- =====================================================================
-- 1. Asal konsumen di laporan Kepala Pemasaran mencakup semua klien.
--    Sebelumnya hanya klien milik tim pemasaran, sehingga klien yang
--    didaftarkan Admin dan yang daftar sendiri tidak terhitung.
--    Angka penjualan, tim, dan performa tidak berubah.
--
-- 2. Kepala Pemasaran boleh mengisi dan membaca identitas (NIK, tempat dan
--    tanggal lahir) klien milik timnya, karena formulir Tambah klien miliknya
--    mewajibkan data itu untuk dokumen SPK. Klien tanpa pemasar tetap tertutup.
--
-- Aman dijalankan ulang.
-- =====================================================================
begin;

create or replace function public.can_access_customer_identity(p_customer_id bigint)
returns boolean
language sql
stable security definer
set search_path to ''
as $$
  select public.is_finance_admin()
    or exists (
      select 1 from public.customers c
      where c.id = p_customer_id
        and (
          c.user_id = (select auth.uid())
          -- Marketing: klien sendiri. Kepala Pemasaran: klien anggota tim.
          or public.marketing_scope_allows(c.marketing_id)
        )
    );
$$;

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
  -- Asal konsumen mencakup seluruh perusahaan, kecuali untuk Marketing atau saat satu orang dipilih.
  v_company boolean := p_marketing_id is null
    and coalesce(public.current_app_role() in ('marketing_head', 'admin', 'owner'), false);
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
  -- Juga memuat klien yang didaftarkan Admin dan yang daftar sendiri (marketing_id kosong).
  origin as (
    select
      c.registration_source as source,
      coalesce(nullif(btrim(c.province_name), ''), 'Belum diisi') as province,
      coalesce(nullif(btrim(c.city_name), ''), 'Belum diisi') as city,
      exists (select 1 from public.lot_transactions t
              where t.customer_id = c.id and t.status <> 'Cancelled') as is_buyer
    from public.customers c
    where (v_company or c.marketing_id in (select member_id from members))
      and (c.created_at at time zone v_tz)::date between v_from and v_to
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
      'installments_due_soon', (select count(*) from sched where due_date_official and status = 'Pending' and due_date between v_today and v_today + 7),
      'installments_overdue', (select count(*) from sched where due_date_official and (status = 'Overdue' or (status = 'Pending' and due_date < v_today))),
      'installments_overdue_amount', (select coalesce(sum(amount), 0) from sched where due_date_official and (status = 'Overdue' or (status = 'Pending' and due_date < v_today))),
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
          province,
          city,
          count(*) as clients,
          count(*) filter (where is_buyer) as buyers,
          round(100.0 * count(*) filter (where is_buyer) / nullif(count(*), 0), 1) as conversion_rate,
          count(*) filter (where source = 'Marketing') as via_marketing,
          count(*) filter (where source = 'Admin') as via_admin,
          count(*) filter (where source = 'Client') as via_client
        from origin
        group by 1, 2
      ) r), '[]'::jsonb),
    'region_sources', coalesce((select jsonb_agg(row_to_json(x)::jsonb order by x.clients desc, x.source)
      from (
        select source, count(*) as clients, count(*) filter (where is_buyer) as buyers
        from origin
        group by 1
      ) x), '[]'::jsonb)
  ) into v_result;

  return v_result;
end;
$$;

commit;
