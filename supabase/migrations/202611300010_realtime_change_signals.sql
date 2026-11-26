-- Sinyal perubahan data (Supabase Realtime: Broadcast from Database).
--
-- Trigger hanya mengirim nama tabel, tanpa isi baris. Klien yang menerima sinyal
-- mengambil ulang datanya lewat query biasa, sehingga RLS tetap menjadi satu-satunya
-- penentu data apa yang boleh dilihat.
--
-- Topik:
--   poliland:public   konten publik dan ketersediaan kaveling (anon + authenticated)
--   poliland:private  data operasional (authenticated saja)
--
-- Klien hanya diberi izin menerima. Tidak ada policy INSERT pada realtime.messages,
-- jadi klien tidak bisa mengirim sinyal palsu ke kedua topik ini.
--
-- Aman dijalankan ulang. Tabel yang tidak ada dilewati.

create or replace function public.broadcast_table_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  has_rows boolean;
  flag text := 'poliland.signal_' || tg_table_name;
begin
  -- Pernyataan yang tidak mengubah baris (mis. job terjadwal) tidak perlu sinyal.
  if tg_op = 'DELETE' then
    select exists (select 1 from old_rows) into has_rows;
  else
    select exists (select 1 from new_rows) into has_rows;
  end if;
  if not has_rows then
    return null;
  end if;

  -- Satu sinyal per tabel per transaksi, walau RPC menulis tabel yang sama berkali-kali.
  if current_setting(flag, true) = '1' then
    return null;
  end if;
  perform set_config(flag, '1', true);

  -- Kegagalan mengirim sinyal tidak boleh menggagalkan penyimpanan data.
  begin
    perform realtime.send(
      jsonb_build_object('table', tg_table_name),
      'change',
      tg_argv[0],
      true
    );
  exception when others then
    raise warning 'Sinyal realtime % gagal dikirim: %', tg_table_name, sqlerrm;
  end;

  return null;
end;
$$;

revoke all on function public.broadcast_table_change() from public, anon, authenticated;

do $$
declare
  item record;
begin
  for item in
    select t.name, 'poliland:public' as topic
    from unnest(array[
      'blocks', 'contacts', 'customer_reviews', 'faqs', 'gallery', 'home_features',
      'home_hero', 'lots', 'media', 'payment_plans', 'progress', 'review_helpful_votes',
      'videos'
    ]) as t(name)
    union all
    select t.name, 'poliland:private'
    from unnest(array[
      'bank_accounts', 'booking_fee_refunds', 'customer_crm_status_history',
      'customer_followups', 'customer_identities', 'customer_interests',
      'customer_merge_log', 'customer_notes', 'customers', 'financial_journals',
      'financial_transactions', 'installment_penalties', 'installment_schedules',
      'lot_activity_logs', 'lot_installments', 'lot_transactions',
      'marketing_commissions', 'marketing_profiles', 'payment_allocations',
      'payment_instructions', 'payments', 'profiles', 'purchase_cancellation_requests',
      'purchase_refunds', 'review_blocked_terms', 'review_reports',
      'spk_booking_fee_reuse', 'spk_corrections', 'spk_process_steps',
      'spk_request_documents', 'spk_requests', 'survey_requests'
    ]) as t(name)
  loop
    if to_regclass('public.' || quote_ident(item.name)) is null then
      continue;
    end if;

    -- Transition table hanya boleh satu event per trigger, jadi dibuat tiga.
    execute format('drop trigger if exists realtime_signal_insert on public.%I', item.name);
    execute format('drop trigger if exists realtime_signal_update on public.%I', item.name);
    execute format('drop trigger if exists realtime_signal_delete on public.%I', item.name);

    execute format(
      'create trigger realtime_signal_insert after insert on public.%I
         referencing new table as new_rows
         for each statement execute function public.broadcast_table_change(%L)',
      item.name, item.topic);
    execute format(
      'create trigger realtime_signal_update after update on public.%I
         referencing new table as new_rows
         for each statement execute function public.broadcast_table_change(%L)',
      item.name, item.topic);
    execute format(
      'create trigger realtime_signal_delete after delete on public.%I
         referencing old table as old_rows
         for each statement execute function public.broadcast_table_change(%L)',
      item.name, item.topic);
  end loop;
end;
$$;

drop policy if exists "poliland public signals" on realtime.messages;
create policy "poliland public signals"
  on realtime.messages
  for select
  to anon, authenticated
  using (extension = 'broadcast' and (select realtime.topic()) = 'poliland:public');

drop policy if exists "poliland private signals" on realtime.messages;
create policy "poliland private signals"
  on realtime.messages
  for select
  to authenticated
  using (extension = 'broadcast' and (select realtime.topic()) = 'poliland:private');
