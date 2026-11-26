-- Verifikasi manual setelah migration 202611300012 diterapkan.
-- Jalankan di SQL editor. Semua query hanya membaca.

-- 1. Hak akses dari API sudah dicabut. Semua kolom "terbuka" harus false.
select p.proname,
       has_function_privilege('anon', p.oid, 'execute')          as anon_terbuka,
       has_function_privilege('authenticated', p.oid, 'execute') as login_terbuka
from pg_proc p
where p.pronamespace = 'public'::regnamespace
  and p.proname in ('_notify_spk_parties', '_create_spk_process_steps',
                    '_sync_spk_notary_status', 'sync_poliland_transaction_status');

select has_table_privilege('anon', 'public.v_transaction_payment_summary', 'select')          as anon_terbuka,
       has_table_privilege('authenticated', 'public.v_transaction_payment_summary', 'select') as login_terbuka;

-- 2. Policy baca profiles hanya dua: "Staff read profiles" dan "Users can view own profile".
select policyname, roles, qual from pg_policies
where schemaname = 'public' and tablename = 'profiles' and cmd = 'SELECT';

-- 3. Simulasi pembeli (ganti UUID dengan id akun berperan client). Harus 1 baris.
-- begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims', '{"sub":"<UUID_CLIENT>","role":"authenticated"}', true);
--   select count(*) from public.profiles;
-- rollback;

-- 4. Simulasi admin (ganti UUID). Harus sama dengan jumlah seluruh profil.
-- begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims', '{"sub":"<UUID_ADMIN>","role":"authenticated"}', true);
--   select count(*) from public.profiles;
-- rollback;

-- Uji alur di aplikasi (akun uji):
--   a. Admin menjadwalkan lalu menyelesaikan satu tahap proses SPK: notifikasi tetap sampai ke pembeli.
--   b. Admin mengonfirmasi pembayaran booking fee: status kavling berubah menjadi Booking.
--   c. Admin membuka SPK dan Keuangan: nama pemasar tetap tampil.
--   d. Pembeli membuka Beranda, Akun, Dokumen, dan Pembayaran tanpa error.
