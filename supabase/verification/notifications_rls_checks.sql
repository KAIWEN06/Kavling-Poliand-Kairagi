-- Verifikasi manual setelah migration 202611240001 diterapkan.
-- Jalankan di SQL editor (hasil yang diharapkan tertulis di komentar).

-- 1. RLS aktif dan tidak ada policy INSERT/DELETE untuk pengguna:
select relrowsecurity as rls_aktif from pg_class where oid = 'public.notifications'::regclass;       -- true
select policyname, cmd from pg_policies where tablename = 'notifications';                           -- hanya SELECT & UPDATE

-- 2. Pengguna hanya boleh UPDATE kolom read_at:
select grantee, privilege_type, column_name
from information_schema.column_privileges
where table_name = 'notifications' and grantee = 'authenticated';                                    -- UPDATE hanya read_at

-- 3. Simulasi pengguna A tidak melihat notifikasi pengguna B (ganti UUID):
-- begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims', '{"sub":"<UUID_A>","role":"authenticated"}', true);
--   select count(*) from public.notifications where recipient_id = '<UUID_B>';                     -- 0
--   update public.notifications set title = 'x' where recipient_id = '<UUID_A>';                   -- ERROR permission denied
-- rollback;

-- 4. Role tidak dapat diubah lewat API pengguna:
-- begin;
--   set local role authenticated;
--   select set_config('request.jwt.claims', '{"sub":"<UUID_A>","role":"authenticated"}', true);
--   update public.profiles set role = 'admin' where id = '<UUID_A>';                               -- ERROR Role tidak dapat diubah
-- rollback;

-- 5. Tidak ada notifikasi ganda untuk satu kejadian:
select recipient_id, dedupe_key, count(*) from public.notifications
where dedupe_key is not null group by 1, 2 having count(*) > 1;                                      -- 0 baris
