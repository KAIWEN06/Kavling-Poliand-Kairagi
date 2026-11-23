-- Isi awal konten halaman publik (sebelum login).
-- Sebelumnya teks/foto contoh ini tertanam di kode aplikasi. Sekarang disimpan di database
-- supaya bisa diubah Admin lewat menu Kelola Konten atau tombol Edit di halaman publik.
--
-- Aman dijalankan berulang: setiap blok hanya mengisi tabel/kunci yang masih kosong.
-- Foto awal ada di folder `public/content/` aplikasi (alamat relatif `/content/...`).
-- Admin bisa menggantinya dengan foto sendiri kapan saja.
--
-- Nomor WhatsApp, telepon, dan email sengaja TIDAK diisi di sini (data resmi milik perusahaan).
-- Isi lewat Kelola Konten > Kontak.

begin;

-- 1. Hero Beranda
insert into public.home_hero (title, subtitle, description, image_url, cta_text, cta_url, is_active)
select
  'Investasi Tanah Masa Depan Anda',
  'Kavling siap bangun di Kairagi, Manado',
  'Miliki kavling strategis di kawasan berkembang dengan legalitas jelas, akses jalan yang baik, dan prospek investasi jangka panjang.',
  '/content/kawasan-5.jpg',
  'Hubungi Kami',
  'whatsapp',
  true
where not exists (select 1 from public.home_hero);

-- 2. Keunggulan
insert into public.home_features (icon, title, description, sort_order, is_active)
select v.icon, v.title, v.description, v.sort_order, true
from (values
  ('leaf',   'Lingkungan nyaman',  'Kawasan hijau yang dirancang untuk hunian keluarga.', 0),
  ('home',   'Lokasi strategis',   'Dekat kampus, bandara, dan pusat kota Manado.',       1),
  ('shield', 'Legalitas jelas',    'Informasi legalitas kavling transparan dan mudah dipahami.', 2),
  ('road',   'Akses jalan baik',   'Jalan lingkungan sudah dibuat di setiap blok kavling.', 3)
) as v(icon, title, description, sort_order)
where not exists (select 1 from public.home_features);

-- 3. Galeri
insert into public.gallery (title, description, category, image_url, sort_order, is_active)
select v.title, v.description, v.category, v.image_url, v.sort_order, true
from (values
  ('Pematangan lahan kavling', 'Pematangan lahan per blok dengan alat berat.',                   'Pembangunan', '/content/kawasan-1.jpg', 0),
  ('Jalan beton akses kawasan', 'Jalan beton yang membelah blok kavling.',                       'Fasilitas',   '/content/kawasan-2.jpg', 1),
  ('Kawasan dari udara',        'Lokasi kawasan dikelilingi permukiman dan area hijau.',         'Lingkungan',  '/content/kawasan-3.jpg', 2),
  ('Blok kavling dari atas',    'Pembagian blok kavling terlihat dari ketinggian.',              'Unit',        '/content/kawasan-4.jpg', 3)
) as v(title, description, category, image_url, sort_order)
where not exists (select 1 from public.gallery);

-- 4. Kemajuan pembangunan (isi awal, silakan sesuaikan persentase & tanggal dengan kondisi lapangan)
insert into public.progress (title, description, image_url, progress_date, percentage, status, sort_order, is_active)
select v.title, v.description, v.image_url, v.progress_date::date, v.percentage, v.status, v.sort_order, true
from (values
  ('Pematangan lahan',        'Perataan dan pembentukan teras kavling per blok.',        '/content/kawasan-1.jpg', '2026-10-01', 100, 'completed', 0),
  ('Pembuatan jalan kawasan', 'Pengerasan dan pembetonan jalan akses antar blok.',       '/content/kawasan-2.jpg', '2026-11-01', 60,  'ongoing',   1),
  ('Penataan blok kavling',   'Pembagian dan penandaan batas setiap kavling.',           '/content/kawasan-4.jpg', '2026-11-15', 40,  'ongoing',   2)
) as v(title, description, image_url, progress_date, percentage, status, sort_order)
where not exists (select 1 from public.progress);

-- 5. Pengaturan teks halaman (tabel contacts: kunci unik, nilai teks/JSON)
insert into public.contacts (key, label, value, icon)
select v.key, v.label, v.value, v.icon
from (values
  ('address',           'Alamat Lokasi',          'Kairagi, Kota Manado', null),
  ('operational_hours', 'Jam Operasional',        '08:00 - 17:00 WITA',   null),
  ('cta_title',         'Judul ajakan beranda',   'Siap memiliki kaveling impian?', null),
  ('cta_text',          'Teks ajakan beranda',    'Hubungi tim kami sekarang dan dapatkan informasi lengkap.', null),
  ('about_description', 'Deskripsi Tentang Kami', 'PoliLand Kairagi hadir untuk memberikan solusi investasi tanah yang aman, nyaman, dan menguntungkan. Kami berkomitmen menghadirkan kawasan hunian dan investasi terbaik di Manado.', null),
  ('about_points',      'Poin Tentang Kami',      '["Kawasan berkembang dan potensial","Infrastruktur lengkap dan akses mudah","Dikelola secara profesional dan terpercaya"]', null),
  ('home_highlights',   'Sorotan Beranda',        '[{"icon":"shield","value":"SHM","label":"Legalitas"},{"icon":"road","value":"100%","label":"Akses Jalan"}]', null),
  ('location_settings', 'Pengaturan Lokasi',      '{"lat":1.5107731,"lng":124.8848806,"zoom":17,"places":[{"icon":"school","name":"Politeknik Negeri Manado (Polimdo)","time":"± 5 menit"},{"icon":"airport","name":"Bandara Sam Ratulangi","time":"± 15 menit"},{"icon":"road","name":"Jl. Politeknik Permai & Akses Utama","time":"± 3 menit"},{"icon":"shop","name":"Pusat Perbelanjaan & Minimarket Lokal","time":"± 5 menit"},{"icon":"city","name":"Pusat Kota Manado","time":"± 20 menit"}]}', 'location')
) as v(key, label, value, icon)
where not exists (select 1 from public.contacts c where c.key = v.key);

commit;
