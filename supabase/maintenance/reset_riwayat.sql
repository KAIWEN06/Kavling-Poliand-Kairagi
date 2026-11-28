-- =====================================================================
-- RESET RIWAYAT POLILAND
-- =====================================================================
-- PERINGATAN: menghapus data secara permanen. Buat backup database dulu.
-- Ini BUKAN migrasi. Jalankan manual di Supabase SQL Editor.
-- Menjalankannya lagi akan menghapus semua riwayat baru.
--
-- Dihapus : SPK, transaksi, pembayaran, cicilan berjalan, denda, refund,
--           pembatalan, komisi, buku kas dan jurnal, survei, notifikasi,
--           log aktivitas, riwayat CRM, catatan, follow-up, minat,
--           favorit, kavling dilihat, ulasan, statistik funnel.
-- Direset : status kavling (jadi Available) dan status CRM client.
-- Tetap   : akun, profil, data diri client dan marketing, nomor
--           terverifikasi, nomor/blok/ukuran/luas/harga kavling, panorama,
--           skema cicilan (payment_plans, lot_installments), konten web,
--           rekening bank, instruksi pembayaran, data wilayah.
--
-- Seluruh reset ada di dalam satu blok DO, yaitu satu perintah. Kalau ada
-- yang gagal, tidak ada data yang berubah, walaupun editor menjalankan
-- perintah satu per satu.
-- =====================================================================

do $reset$
declare
  -- Sidik jari data yang tidak boleh berubah.
  q_jaga constant text := $q$
    select jsonb_build_object(
      'kavling', (select md5(coalesce(string_agg(
         row(id, polygon_id, lot_number, block_id, dimension, area, cash_price,
             promo_price, description, panorama_url, panorama_boundary)::text,
         '|' order by id), '')) from public.lots),
      'cicilan_kavling', (select md5(coalesce(string_agg(t::text, '|' order by t.id), ''))
         from public.lot_installments t),
      'skema_cicilan', (select md5(coalesce(string_agg(t::text, '|' order by t.id), ''))
         from public.payment_plans t),
      'profil', (select md5(coalesce(string_agg(t::text, '|' order by t.id), ''))
         from public.profiles t),
      'data_diri', (select md5(coalesce(string_agg(
         row(id, full_name, phone, whatsapp_phone, email, address, notes,
             marketing_id, user_id, registration_source, country_code,
             province_code, city_code, district_code, village_code,
             street_address)::text,
         '|' order by id), '')) from public.customers))
  $q$;
  sebelum jsonb;
  sesudah jsonb;
begin
  execute q_jaga into sebelum;

  -- 1. Kembalikan kavling ke keadaan belum terjual.
  --    Trigger dimatikan sementara supaya tidak muncul log, kabar kavling,
  --    atau notifikasi push baru, dan cicilan tidak dihitung ulang.
  alter table public.lots disable trigger user;

  update public.lots
  set status       = 'Available',
      payment_type = 'Cash',
      customer_id  = null,
      booking_date = null,
      sold_date    = null,
      color        = '#22c55e';

  alter table public.lots enable trigger user;

  -- 2. Kembalikan status CRM client. Data dirinya tidak disentuh.
  alter table public.customers disable trigger user;

  update public.customers
  set crm_status            = 'Baru',
      crm_status_updated_at = null,
      crm_status_updated_by = null,
      last_contacted_at     = null;

  alter table public.customers enable trigger user;

  -- 3. Hapus riwayat. TRUNCATE melewati trigger per baris, termasuk pengunci
  --    buku kas. Sengaja TANPA CASCADE: kalau ada tabel lain yang masih
  --    merujuk ke daftar ini, perintah gagal dan tidak ada yang terhapus.
  --    RESTART IDENTITY mengulang nomor ID dari 1.
  truncate table
    -- SPK
    public.spk_requests,
    public.spk_request_documents,
    public.spk_request_status_history,
    public.spk_review_activity,
    public.spk_process_steps,
    public.spk_corrections,
    public.spk_order_revisions,
    public.spk_booking_fee_reuse,
    public.spk_booking_fee_reuse_history,
    -- Transaksi, cicilan berjalan, pembayaran
    public.lot_transactions,
    public.installment_schedules,
    public.installment_penalties,
    public.payments,
    public.payment_allocations,
    public.payment_status_history,
    public.payment_proof_history,
    public.payment_correction_audits,
    -- Pembatalan, wanprestasi, refund, komisi
    public.purchase_cancellation_requests,
    public.purchase_refunds,
    public.booking_fee_refunds,
    public.default_reviews,
    public.default_notices,
    public.default_extensions,
    public.marketing_commissions,
    -- Keuangan (daftar akun financial_accounts tetap)
    public.financial_transactions,
    public.financial_journals,
    public.financial_journal_lines,
    public.bank_reconciliations,
    -- CRM
    public.customer_crm_status_history,
    public.customer_ownership_history,
    public.customer_merge_log,
    public.customer_followups,
    public.customer_notes,
    public.customer_note_histories,
    public.customer_interests,
    -- Aktivitas pengguna
    public.survey_requests,
    public.client_favorite_lots,
    public.client_lot_views,
    public.lot_news,
    public.funnel_events,
    public.notifications,
    public.activity_logs,
    public.lot_activity_logs,
    public.phone_otp_challenges,
    -- Ulasan (daftar kata terlarang review_blocked_terms tetap)
    public.customer_reviews,
    public.review_helpful_votes,
    public.review_reports,
    public.review_moderation_logs,
    public.review_prompt_states
  restart identity;

  -- 4. Nomor urut SPK mulai dari awal.
  alter sequence public.spk_request_number_seq restart;

  -- 5. Batalkan seluruh reset kalau data yang dipertahankan berubah.
  execute q_jaga into sesudah;
  if sebelum is distinct from sesudah then
    raise exception 'Data yang dipertahankan berubah. Reset dibatalkan.';
  end if;
end
$reset$;

-- Ringkasan hasil.
select
  (select count(*) from public.lots)                                  as kavling,
  (select count(*) from public.lots where status = 'Available')        as kavling_tersedia,
  (select count(*) from public.lot_installments)                      as cicilan_kavling,
  (select count(*) from public.payment_plans)                         as skema_cicilan,
  (select count(*) from public.profiles)                              as profil,
  (select count(*) from public.customers)                             as client,
  (select count(*) from public.spk_requests)                          as spk,
  (select count(*) from public.lot_transactions)                      as transaksi,
  (select count(*) from public.payments)                              as pembayaran;
