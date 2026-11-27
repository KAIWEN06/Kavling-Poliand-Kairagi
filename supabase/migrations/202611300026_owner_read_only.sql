-- =====================================================================
-- Owner hanya memantau (keputusan 27 November 2026, lihat owner.md).
--
-- Sebelumnya Owner bisa menulis lewat dua jalur: kebijakan RLS yang
-- menyamakannya dengan Admin, dan RPC SECURITY DEFINER yang melewati RLS.
-- Satu trigger penjaga di tabel bisnis menutup keduanya, karena trigger
-- tetap berjalan di dalam RPC dan auth.uid() tetap milik pemanggil.
--
-- Yang TIDAK berubah:
--   * Hak baca Owner. is_finance_admin() dan kawan-kawan tetap sama.
--   * Data milik sendiri: profiles, foto profil, notifikasi, preferensi,
--     token perangkat.
--   * Akses tim: Edge Function manage-team-user memakai service_role
--     (auth.uid() kosong), jadi tidak terkena penjaga ini.
--   * Peran lain, job terjadwal, dan SQL Editor.
--
-- Juga memperbaiki handle_new_user yang memberi role bawaan 'admin'.
-- Saat ini trigger kedua menimpanya menjadi 'client'; bila trigger itu
-- hilang atau dimatikan, setiap pendaftar baru menjadi Admin.
--
-- Aman dijalankan ulang.
-- =====================================================================
begin;

-- ---------------------------------------------------------------------
-- 1. Penjaga tulis
-- ---------------------------------------------------------------------
create or replace function public.block_owner_writes()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if public.is_owner() then
    raise exception 'Akun pemilik hanya untuk memantau. Perubahan data dilakukan oleh Admin.'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.block_owner_writes() from public, anon, authenticated;

-- Per baris, agar pernyataan yang tidak mengubah baris apa pun tidak ikut ditolak.
-- Awalan "aaa_" membuatnya berjalan sebelum trigger BEFORE lain.
-- Tabel bisnis BARU harus ditambahkan ke daftar ini lewat migrasi berikutnya.
do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    -- Kaveling
    'blocks', 'lots', 'lot_highlights', 'lot_installments', 'lot_news', 'lot_transactions',
    -- Pembayaran dan keuangan
    'bank_accounts', 'bank_reconciliations', 'booking_fee_refunds',
    'default_extensions', 'default_notices', 'default_reviews',
    'financial_accounts', 'financial_journal_lines', 'financial_journals', 'financial_transactions',
    'installment_penalties', 'installment_schedules',
    'payment_allocations', 'payment_correction_audits', 'payment_instructions', 'payment_plans',
    'payment_proof_history', 'payment_status_history', 'payments',
    'purchase_cancellation_requests', 'purchase_refunds',
    -- Klien dan pemasaran
    'customer_crm_status_history', 'customer_followups', 'customer_identities', 'customer_interests',
    'customer_merge_log', 'customer_note_histories', 'customer_notes', 'customer_ownership_history',
    'customers', 'marketing_commissions', 'marketing_profiles',
    -- SPK dan survei
    'spk_booking_fee_reuse', 'spk_booking_fee_reuse_history', 'spk_corrections', 'spk_process_steps',
    'spk_request_documents', 'spk_request_status_history', 'spk_requests', 'spk_review_activity',
    'survey_requests',
    -- Ulasan dan konten situs
    'customer_reviews', 'review_blocked_terms', 'review_moderation_logs', 'review_reports',
    'contacts', 'faqs', 'gallery', 'home_features', 'home_hero', 'indonesia_regions',
    'media', 'progress', 'videos'
  ]
  loop
    execute format('drop trigger if exists aaa_block_owner_writes on public.%I', v_table);
    execute format(
      'create trigger aaa_block_owner_writes before insert or update or delete on public.%I
         for each row execute function public.block_owner_writes()',
      v_table
    );
  end loop;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Storage (trigger di atas tidak menjangkau berkas)
-- ---------------------------------------------------------------------
-- Bukti pengembalian booking fee hanya diunggah Admin.
alter policy "Admin upload booking fee refund proof" on storage.objects
  with check (
    bucket_id = 'payment-proofs'
    and exists (
      select 1 from public.profiles p
      where p.id = (select auth.uid()) and p.role = 'admin'
    )
  );

-- Foto ulasan dihapus oleh pengunggahnya atau Admin.
alter policy "review_photos_owner_or_admin_delete" on storage.objects
  using (
    bucket_id = 'review-photos'
    and (
      (storage.foldername(name))[1] = ((select auth.uid()))::text
      or (select public._is_admin_user())
    )
  );

-- ---------------------------------------------------------------------
-- 3. Role bawaan pendaftar baru
-- ---------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url',
    'client' -- role staf hanya diberikan lewat Edge Function manage-team-user
  );
  return new;
end;
$$;

commit;

-- ---------------------------------------------------------------------
-- Cara membatalkan bagian 1 (jalankan manual bila perlu):
--
--   do $$ declare r record; begin
--     for r in select c.relname from pg_trigger t join pg_class c on c.oid = t.tgrelid
--       where t.tgname = 'aaa_block_owner_writes'
--     loop execute format('drop trigger aaa_block_owner_writes on public.%I', r.relname); end loop;
--   end $$;
--   drop function public.block_owner_writes();
-- ---------------------------------------------------------------------
