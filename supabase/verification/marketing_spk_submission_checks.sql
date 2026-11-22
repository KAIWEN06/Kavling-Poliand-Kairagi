-- Jalankan SETELAH 202611230003 diterapkan. Semua baris harus lulus = true.
(select 'RPC SPK Marketing tersedia' as uji,
  count(*) = 3 as lulus
from pg_proc where pronamespace = 'public'::regnamespace
  and proname in ('create_marketing_spk_request','create_marketing_spk_initial_payment','discard_marketing_spk_request'))
union all
(select 'INSERT langsung spk_requests oleh Marketing sudah ditutup' as uji,
  not exists (select 1 from pg_policies where tablename = 'spk_requests' and policyname = 'SPK marketing insert own') as lulus)
union all
(select 'anon tidak dapat menjalankan RPC SPK Marketing' as uji,
  not has_function_privilege('anon', 'public.create_marketing_spk_request(bigint,bigint,text,bigint,numeric,text)', 'execute') as lulus)
union all
(select 'Tabel riwayat penanggung jawab ber-RLS' as uji,
  (select relrowsecurity from pg_class where oid = 'public.customer_ownership_history'::regclass) as lulus)
union all
(select 'Tidak ada Booking Fee ganda per SPK' as uji,
  not exists (select 1 from public.payments where payment_category = 'Booking' and spk_request_id is not null
              group by spk_request_id having count(*) > 1) as lulus)
union all
(select 'Bucket dokumen SPK tetap private' as uji,
  (select not public from storage.buckets where id = 'spk-client-private-documents') as lulus);
