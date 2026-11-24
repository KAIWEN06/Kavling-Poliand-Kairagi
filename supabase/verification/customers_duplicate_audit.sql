-- Audit duplikat customers (read-only). Jalankan ulang kapan saja di SQL Editor.
-- Hasil 24-11-2026: 1 baris customers, 0 duplikat.

-- 1. Ringkasan
with n as (
  select id, registration_source, user_id, lower(btrim(email)) em,
         public.normalize_id_phone(phone) p1, public.normalize_id_phone(whatsapp_phone) p2,
         lower(regexp_replace(btrim(full_name), '\s+', ' ', 'g')) nm
  from public.customers
), keys as (
  select id, p1 k from n where p1 is not null
  union select id, p2 from n where p2 is not null
)
select
  (select count(*) from n) total_rows,
  (select count(*) from n where p1 is null and p2 is null) tanpa_nomor,
  (select count(*) from (select k from keys group by k having count(distinct id) > 1) x) kelompok_nomor_ganda,
  (select count(*) from (select em from n where em <> '' group by em having count(*) > 1) x) kelompok_email_ganda,
  (select count(*) from (select nm from n group by nm having count(*) > 1) x) kelompok_nama_sama,
  (select count(*) from n where registration_source = 'Marketing' and user_id is null) marketing_belum_tertaut,
  (select count(*) from n where registration_source = 'Client' and user_id is null) client_belum_tertaut;

-- 2. Pasangan kandidat duplikat dengan alasan kecocokannya
with n as (
  select id, registration_source, user_id, marketing_id, full_name,
         lower(btrim(email)) em,
         public.normalize_id_phone(phone) p1, public.normalize_id_phone(whatsapp_phone) p2,
         lower(regexp_replace(btrim(full_name), '\s+', ' ', 'g')) nm
  from public.customers
)
select a.id as id_a, b.id as id_b, a.registration_source as sumber_a, b.registration_source as sumber_b,
       concat_ws(', ',
         case when a.p1 in (b.p1, b.p2) or a.p2 in (b.p1, b.p2) then 'nomor sama' end,
         case when a.em <> '' and a.em = b.em then 'email sama' end,
         case when a.nm = b.nm then 'nama sama' end) as alasan
from n a join n b on a.id < b.id
where (a.p1 in (b.p1, b.p2) or a.p2 in (b.p1, b.p2))
   or (a.em <> '' and a.em = b.em)
   or a.nm = b.nm
order by a.id, b.id;
