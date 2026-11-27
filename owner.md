# OWNER PANEL – SISTEM POLILAND

> **Keputusan terbaru (27 November 2026), menggantikan bagian yang bertentangan di bawah:**
> Owner hanya memantau perkembangan kaveling dan penjualan. Owner tidak setara Admin dan tidak terlibat dalam proses jual beli.
> - Data tenaga marketing, calon pembeli, tindak lanjut, dan komisi tidak ditampilkan (urusan Kepala Bagian). Ini menggantikan bagian 3C, 3G, dan butir serupa lainnya.
> - Menu bawah menjadi empat: Beranda, Kaveling, Penjualan (gabungan Statistik dan Laporan), Lainnya.
> - Satu-satunya halaman Admin yang boleh dibuka adalah Akses tim, untuk akun Pemilik dan Admin.

Dokumen ini menjadi acuan pengembangan **Role Owner PoliLand** di Codex. Isinya menggabungkan tugas dan tanggung jawab Owner, hak akses, struktur halaman, spesifikasi UI/UX, design system berdasarkan halaman Client, serta ketentuan integrasi database.

---

## 1. Pengertian Role Owner

Owner merupakan pemilik perusahaan atau pemilik proyek PoliLand yang memiliki hak akses untuk memantau, mengawasi, mengevaluasi, dan mengambil keputusan berdasarkan aktivitas operasional dan pemasaran perusahaan.

Owner memiliki akses terhadap informasi seluruh kavling, data calon konsumen dan pembeli, tenaga Marketing, laporan penjualan, laporan pembayaran, serta statistik perkembangan bisnis PoliLand.

Role Owner difokuskan pada pemantauan, evaluasi, pengawasan, dan pengambilan keputusan. Pengelolaan operasional sehari-hari tetap menjadi tanggung jawab Kepala Bagian dan Marketing sesuai pembagian kewenangan.

## 2. Tugas dan Tanggung Jawab Owner

1. Mengawasi aktivitas pemasaran dan penjualan kavling PoliLand.
2. Memantau kinerja seluruh tenaga Marketing.
3. Memantau perkembangan calon konsumen dari setiap Marketing.
4. Mengawasi ketersediaan dan status seluruh kavling.
5. Memantau perkembangan transaksi penjualan.
6. Melihat laporan dan statistik penjualan perusahaan.
7. Melihat laporan pembayaran konsumen.
8. Mengevaluasi pencapaian target pemasaran dan penjualan.
9. Membandingkan performa antar-Marketing.
10. Memantau aktivitas Kepala Bagian dan Marketing dalam sistem.
11. Mengawasi perubahan data penting yang terjadi di dalam sistem.
12. Mengambil keputusan berdasarkan laporan dan informasi yang tersedia.
13. Mengelola informasi profil perusahaan dan preferensi aplikasi sesuai kewenangan.

---

# 3. Fitur dan Hak Akses Owner

## A. Dashboard Owner

Dashboard merupakan halaman utama yang menyajikan ringkasan kondisi perusahaan dalam satu tampilan.

Informasi yang ditampilkan:

- Total seluruh kavling.
- Jumlah kavling tersedia (Available).
- Jumlah kavling Booking.
- Jumlah kavling terjual (Sold).
- Total tenaga Marketing yang terdaftar.
- Total calon konsumen.
- Jumlah pembeli.
- Ringkasan dan nilai penjualan.
- Grafik perkembangan penjualan.
- Asal daerah konsumen.
- Aktivitas terbaru.

Seluruh angka dan grafik harus berasal dari data aktual database, bukan angka statis atau dummy.

## B. Monitoring Kavling

Owner dapat:

- Melihat seluruh data kavling.
- Melihat siteplan atau denah kavling.
- Melihat detail setiap kavling.
- Melihat nomor dan blok kavling.
- Melihat luas dan harga kavling.
- Memantau status Available, Booking, dan Sold.
- Mencari kavling berdasarkan nomor, blok, atau nama.
- Memfilter kavling berdasarkan status.
- Melihat informasi pemesanan pada kavling yang sedang Booking.
- Memantau perubahan status kavling.

## C. Monitoring Marketing

Owner dapat:

- Melihat daftar seluruh tenaga Marketing.
- Melihat profil dan informasi setiap Marketing.
- Melihat jumlah calon konsumen yang ditangani setiap Marketing.
- Melihat jumlah konsumen yang berhasil melakukan transaksi atau closing.
- Memantau aktivitas pemasaran setiap Marketing.
- Membandingkan performa antar-Marketing.
- Melihat pencapaian target penjualan setiap Marketing.

## D. Monitoring Calon Konsumen dan Pembeli

Owner dapat:

- Melihat seluruh data calon konsumen.
- Melihat seluruh data pembeli.
- Melihat Marketing yang menangani setiap calon konsumen.
- Melihat status perkembangan calon konsumen.
- Memantau aktivitas tindak lanjut (follow-up).
- Melihat riwayat perkembangan calon konsumen.
- Mengetahui konsumen yang sudah dan belum melakukan transaksi.
- Melihat asal daerah konsumen.

## E. Laporan Penjualan

Owner dapat:

- Melihat laporan penjualan keseluruhan.
- Melihat jumlah kavling terjual dan booking.
- Melihat total nilai penjualan.
- Melihat laporan berdasarkan periode.
- Melihat statistik penjualan bulanan dan tahunan.
- Melihat daftar transaksi penjualan.
- Mencari transaksi berdasarkan nama pembeli atau kode kavling.
- Melihat penjualan berdasarkan blok.
- Melihat performa penjualan setiap Marketing.
- Melihat perbandingan penjualan berdasarkan periode.
- Mengekspor atau mengunduh laporan dalam format PDF sesuai kebutuhan.

## F. Laporan Pembayaran

Owner dapat:

- Melihat rekapitulasi pembayaran kavling.
- Memantau pembayaran uang muka (DP).
- Memantau pembayaran cicilan.
- Melihat pembayaran yang sudah diterima.
- Memantau pembayaran yang belum diselesaikan.
- Melihat riwayat pembayaran berdasarkan konsumen dan kavling.
- Melihat status pembayaran sesuai data transaksi.

## G. Laporan Pemasaran

Owner dapat:

- Melihat rekapitulasi data pemasaran.
- Melihat jumlah calon konsumen setiap Marketing.
- Melihat jumlah calon konsumen baru.
- Melihat perkembangan follow-up.
- Melihat jumlah konsumen yang masuk tahap Booking.
- Melihat jumlah transaksi penjualan.
- Membandingkan hasil pemasaran antar-Marketing.

## H. Statistik

Owner dapat melihat statistik dalam bentuk grafik dan visualisasi data:

1. **Penjualan Kavling:** perbandingan jumlah Booking dan Sold setiap bulan.
2. **Total Nilai Penjualan:** perkembangan nilai penjualan berdasarkan periode.
3. **Status Kavling:** perbandingan Available, Booking, dan Sold.
4. **Asal Daerah Konsumen:** statistik konsumen berdasarkan wilayah.
5. **Perkembangan Calon Konsumen:** pipeline calon konsumen dari tahap awal hingga transaksi.
6. **Penjualan Terbaru:** daftar transaksi dan pembayaran terbaru.

## I. Monitoring Aktivitas Sistem

Owner dapat:

- Melihat aktivitas terbaru dalam sistem.
- Melihat aktivitas yang dilakukan Kepala Bagian.
- Melihat aktivitas Marketing.
- Memantau perubahan status kavling.
- Melihat aktivitas pengelolaan data.
- Mengetahui waktu dan pengguna yang melakukan perubahan data penting.

## J. Notifikasi

Owner dapat menerima notifikasi mengenai:

- Penjualan kavling baru.
- Booking kavling baru.
- Pembayaran DP diterima.
- Perubahan status kavling.
- Aktivitas penting Marketing.
- Aktivitas penting Kepala Bagian.
- Informasi penting lainnya yang berkaitan dengan operasional perusahaan.

## K. Pengaturan dan Informasi Perusahaan

Owner dapat:

- Melihat dan mengelola profil perusahaan sesuai kewenangan.
- Melihat nama dan informasi perusahaan.
- Mengatur preferensi aplikasi.
- Mengatur notifikasi yang diterima.
- Mengakses pusat bantuan.
- Melihat informasi dan versi aplikasi.
- Keluar dari akun.

---

# 4. Struktur Navigasi Owner

Navigasi utama menggunakan **Bottom Navigation** dengan lima menu:

1. **Beranda**
2. **Kavling**
3. **Statistik**
4. **Laporan**
5. **Lainnya**

### Menu Lainnya

Menu Lainnya dibagi ke dalam kelompok berikut.

**A. Manajemen Data**
- Data Kavling
- Data Pembeli
- Data Marketing

**B. Laporan**
- Laporan Penjualan
- Laporan Pembayaran
- Laporan Pemasaran

**C. Pengaturan**
- Profil Perusahaan
- Pengaturan Aplikasi
- Notifikasi

**D. Bantuan**
- Pusat Bantuan
- Tentang Aplikasi
- Keluar

---

# 5. Spesifikasi Halaman dan UI Owner

Gunakan lima screenshot desain Owner yang diberikan sebagai referensi struktur halaman, informasi, dan komposisi komponen. Gunakan screenshot Client terbaru sebagai referensi gaya visual dan design system.

## A. Dashboard Owner (Beranda)

Referensi struktur: **Dashboard Owner - PoliLand**.

### Komponen halaman

1. **Header**
   - Logo PoliLand.
   - Nama perusahaan dan lokasi Kairagi.
   - Ikon notifikasi.
   - Foto profil pengguna.

2. **Greeting**
   - Sapaan Selamat Datang.
   - Judul Owner.
   - Deskripsi singkat dashboard.
   - Label lokasi atau proyek PoliLand Kairagi.

3. **Summary Cards**
   - Total Kavling.
   - Tersedia.
   - Booking.
   - Terjual.

4. **Statistik Penjualan**
   - Filter tahun.
   - Jumlah penjualan.
   - Persentase perkembangan.
   - Grafik penjualan Januari–Desember.
   - Interaksi grafik untuk melihat detail per bulan.

5. **Asal Konsumen**
   - Diagram donat.
   - Total pembeli.
   - Daftar wilayah asal konsumen.
   - Jumlah dan persentase setiap wilayah.
   - Tombol Lihat Semua.

6. **Aktivitas Terbaru**
   - Kavling berhasil terjual.
   - Kavling dibooking.
   - Calon pembeli baru.
   - Pembayaran DP diterima.
   - Waktu aktivitas.
   - Tombol menuju daftar aktivitas lengkap.

## B. Halaman Kavling

Referensi struktur: **Kavling - Owner PoliLand**.

### Komponen halaman

1. Header dengan tombol kembali dan judul Kavling.
2. Kolom pencarian berdasarkan nomor kavling, blok, atau nama.
3. Filter status:
   - Semua.
   - Tersedia.
   - Booking.
   - Terjual.
4. Informasi proyek dan tahapan proyek.
5. Daftar kavling berbentuk card.
6. Gambar thumbnail setiap kavling jika tersedia.
7. Nomor kavling.
8. Informasi blok.
9. Luas kavling.
10. Badge status ketersediaan.
11. Informasi pemesan pada kavling Booking jika datanya tersedia dan boleh ditampilkan.
12. Tombol untuk membuka detail kavling.

Setiap card harus menampilkan informasi secara konsisten dan mengikuti desain referensi.

## C. Halaman Statistik

Referensi struktur: **Statistik - Owner PoliLand**.

### Komponen halaman

1. **Grafik Penjualan Kavling**
   - Perbandingan Booking dan Sold.
   - Data Januari–Desember.
   - Informasi bulan dengan penjualan tertinggi.

2. **Total Nilai Penjualan**
   - Total nilai penjualan.
   - Persentase kenaikan atau penurunan.
   - Grafik nilai penjualan berdasarkan bulan.

3. **Status Kavling**
   - Diagram donat.
   - Available.
   - Booking.
   - Sold.
   - Total seluruh kavling.

4. **Asal Daerah Konsumen**
   - Diagram donat.
   - Daftar wilayah, misalnya Manado, Bitung, Minahasa Selatan, Minahasa Utara, dan Lainnya, mengikuti data aktual.
   - Jumlah dan persentase konsumen.

5. **Perkembangan Calon Konsumen**
   - Calon Baru.
   - Tindak Lanjut.
   - Booking.
   - Terjual.
   - Grafik pipeline setiap bulan.

6. **Penjualan Terbaru**
   - Tanggal transaksi.
   - Nomor kavling.
   - Nama pembeli.
   - Status transaksi.
   - Tombol Lihat Semua.

## D. Halaman Laporan

Referensi struktur: **Laporan Penjualan - Owner PoliLand**.

Halaman laporan menggunakan sistem tab:

1. Laporan Penjualan.
2. Laporan Pembayaran.
3. Laporan Pemasaran.

### Laporan Penjualan

Komponen:

- Ringkasan penjualan.
- Filter tahun.
- Total kavling.
- Total tersedia.
- Total booking.
- Total terjual.
- Grafik penjualan berdasarkan periode.
- Daftar transaksi penjualan.
- Pencarian nama pembeli atau kode kavling.
- Pagination.
- Grafik penjualan berdasarkan blok.
- Grafik nilai penjualan berdasarkan periode.
- Fitur ekspor atau unduh laporan PDF.

### Laporan Pembayaran

Menampilkan rekapitulasi pembayaran konsumen, termasuk DP, cicilan, pembayaran yang sudah diterima, pembayaran yang belum diselesaikan, dan riwayat pembayaran.

### Laporan Pemasaran

Menampilkan rekapitulasi aktivitas pemasaran, perkembangan calon konsumen, dan hasil penjualan masing-masing Marketing.

## E. Halaman Lainnya

Referensi struktur: **Lainnya - Owner PoliLand**.

Halaman menggunakan kelompok menu berbentuk card.

1. **Manajemen Data**
   - Data Kavling.
   - Data Pembeli.
   - Data Marketing.

2. **Laporan**
   - Laporan Penjualan.
   - Laporan Pembayaran.
   - Laporan Pemasaran.

3. **Pengaturan**
   - Profil Perusahaan.
   - Pengaturan Aplikasi.
   - Notifikasi.

4. **Bantuan**
   - Pusat Bantuan.
   - Tentang Aplikasi.
   - Keluar.

Setiap menu memiliki ikon, judul, deskripsi singkat, dan navigasi menuju halaman terkait.

---

# 6. Design System – Mengikuti Halaman Client PoliLand

**PENTING:** Empat screenshot Client terbaru menjadi referensi utama untuk warna, font, ikon, tombol, badge, card, border, radius, dan gaya komponen. Lima screenshot Owner sebelumnya menjadi referensi struktur dan komposisi halaman Owner.

Owner dan Client boleh memiliki layout dan fitur berbeda, tetapi harus terlihat sebagai bagian dari aplikasi PoliLand yang sama.

## A. Warna

Ikuti karakter warna dari halaman Client:

- **Gold / Warm Beige:** warna utama dan aksen identitas PoliLand.
- **Dark Green:** status tersedia dan elemen positif.
- **White:** background card dan permukaan konten.
- **Off-white / Warm Cream:** background halaman.
- **Dark Charcoal:** teks utama.
- **Gray:** teks sekunder, border, dan ikon pendukung.
- **Soft Red:** status pembayaran atau peringatan.

Jangan menggunakan palet biru sebagai warna dominan seperti pada referensi desain Owner awal. Pertahankan identitas visual emas dan hijau PoliLand.

Gunakan warna secara konsisten dan periksa kode warna aktual dari halaman Client sebelum membuat token baru. Jika proyek sudah memiliki design token, gunakan token tersebut.

## B. Typography / Font

- Gunakan jenis font yang sama dengan halaman Client.
- Periksa konfigurasi font dan stylesheet proyek sebelum menentukan font.
- Pertahankan ukuran, ketebalan, dan hierarki font yang konsisten.
- Gunakan font weight sesuai kebutuhan heading, subheading, label, dan informasi statistik.
- Jangan menambahkan font baru jika proyek sudah memiliki font utama.

## C. Card dan Container

Ikuti desain card dari halaman Client:

- Background putih.
- Rounded corner cukup besar.
- Border tipis berwarna warm gray.
- Shadow sangat lembut.
- Padding proporsional.
- Jarak antar-card konsisten.
- Hindari border yang terlalu tebal.
- Gunakan hierarki informasi yang jelas.

## D. Button dan Badge

- Tombol utama menggunakan warna gold / warm beige.
- Teks tombol menggunakan warna cokelat gelap.
- Tombol sekunder menggunakan putih atau warm cream.
- Badge Available menggunakan hijau.
- Badge Booking menggunakan gold.
- Badge Sold menggunakan merah lembut.
- Badge informasi pembayaran mengikuti warna status aktual.
- Gunakan ukuran, radius, dan padding tombol yang konsisten dengan Client.

## E. Icon – Wajib Mengikuti Sumber yang Sudah Ada

Sumber ikon Owner harus mengikuti library/package dan pola penggunaan ikon yang sudah digunakan pada halaman Client serta halaman lain di dalam proyek.

Sebelum implementasi:

1. Periksa `package.json`.
2. Periksa library ikon yang sudah terpasang.
3. Periksa komponen ikon pada halaman Client.
4. Periksa cara halaman lain mengimpor dan menggunakan ikon.
5. Gunakan package dan sumber ikon yang sama.
6. Gunakan ikon yang konsisten dalam bentuk, ukuran, dan ketebalan garis.
7. Jangan memasang library ikon baru.
8. Jangan menggunakan emoji sebagai ikon UI.
9. Jangan membuat SVG manual jika ikon yang sesuai sudah tersedia pada library proyek.

Jangan mengasumsikan proyek menggunakan Lucide atau library tertentu sebelum memeriksa kode aktual.

## F. Konsistensi Antar-Role

Walaupun Owner, Kepala Bagian, Marketing, dan Client memiliki dashboard serta navigasi berbeda, semuanya harus menggunakan satu identitas visual PoliLand.

Komponen yang harus konsisten:

- Font.
- Warna utama.
- Border radius.
- Shadow.
- Input.
- Button.
- Badge.
- Icon.
- Card.
- Spacing.
- Header.
- Navigasi.

Jangan mengubah desain halaman Client yang sudah berjalan hanya untuk menyesuaikan Owner. Gunakan kembali design token dan komponen yang sudah tersedia jika memungkinkan.

## G. Responsivitas

Desain utama mengikuti tampilan mobile Android sesuai screenshot.

Pastikan:

- Tidak terjadi horizontal overflow pada halaman.
- Card menyesuaikan lebar layar.
- Grafik dapat dibaca pada layar kecil.
- Navigasi bawah mudah dijangkau.
- Tabel dapat digulir horizontal jika diperlukan.
- Layout tetap rapi pada berbagai ukuran perangkat.
- Area klik tombol dan menu nyaman digunakan.

## H. Aturan Penggunaan Referensi

- Screenshot Owner: acuan struktur halaman, urutan informasi, dan fitur.
- Screenshot Client: acuan design system, warna, font, ikon, card, tombol, badge, dan gaya komponen.
- Jangan menyalin seluruh layout Client ke Owner.
- Jangan mengganti identitas visual PoliLand dengan desain generik.
- Hasil akhir harus terasa sebagai bagian dari aplikasi PoliLand yang sama.

---

# 7. Aturan Hak Akses dan Batasan Owner

Owner memiliki hak akses untuk memantau seluruh data perusahaan. Pengelolaan operasional diberikan sesuai kewenangan yang ditetapkan.

### Hak akses utama

- Dashboard: melihat ringkasan seluruh perusahaan.
- Kavling: melihat seluruh kavling dan detailnya.
- Statistik: melihat statistik seluruh perusahaan.
- Laporan: melihat dan mengekspor laporan.
- Data Pembeli: melihat data pembeli sesuai kewenangan.
- Data Marketing: melihat data dan performa seluruh Marketing.
- Aktivitas Sistem: melihat riwayat aktivitas pengguna.
- Pengaturan: mengatur preferensi dan informasi perusahaan sesuai kewenangan.

### Batasan default

Secara default, Owner tidak melakukan operasional harian seperti:

- Melakukan follow-up calon konsumen.
- Mengelola komunikasi harian dengan konsumen.
- Mengubah data operasional tanpa kewenangan.
- Mengubah status kavling secara langsung tanpa hak akses.
- Menghapus transaksi atau data penting tanpa otorisasi.

Pengelolaan operasional menjadi tanggung jawab Kepala Bagian atau Marketing sesuai hak akses masing-masing.

### Pengelolaan data melalui menu Manajemen Data

Karena desain Owner menyediakan menu Manajemen Data, menu tersebut harus dapat menampilkan halaman Data Kavling, Data Pembeli, dan Data Marketing. Aksi tambah, ubah, dan hapus harus mengikuti aturan izin yang ditetapkan untuk Owner. Jangan otomatis memberikan seluruh hak CRUD hanya karena menu tersedia.

Tindakan sensitif seperti penghapusan data, perubahan harga, perubahan status kavling, dan pengelolaan akun harus dibatasi berdasarkan kewenangan serta dicatat dalam riwayat aktivitas.

### Prinsip pembagian role

| Role | Fokus utama |
|---|---|
| Owner | Pengawasan, evaluasi, dan pengambilan keputusan |
| Kepala Bagian | Pengelolaan operasional dan administrasi |
| Marketing | Pemasaran dan pengelolaan calon konsumen |
| Calon Konsumen / Client | Melihat informasi, katalog, dan proses pembelian miliknya |

Owner dapat melihat data lintas pengguna sesuai kebijakan akses. Client hanya boleh mengakses data pembelian dan dokumennya sendiri.

---

# 8. Aturan Data dan Integrasi Database

Seluruh informasi yang ditampilkan harus terhubung dengan database Supabase dan mengikuti struktur proyek yang sudah ada.

Ketentuan:

1. Jangan menggunakan angka dummy atau hardcoded sebagai data produksi.
2. Total kavling harus dihitung dari data kavling yang tersimpan.
3. Status Available, Booking, dan Sold harus mengikuti data aktual.
4. Statistik penjualan harus dihitung dari transaksi yang valid.
5. Laporan pembayaran harus menggunakan riwayat pembayaran aktual.
6. Statistik Marketing harus berdasarkan data calon konsumen dan transaksi.
7. Asal daerah konsumen harus berdasarkan data alamat konsumen.
8. Aktivitas terbaru harus mengambil data dari riwayat aktivitas sistem jika tersedia.
9. Filter tahun harus mengubah data grafik dan laporan sesuai periode.
10. Perubahan data harus tercermin pada dashboard dan halaman terkait.
11. Gunakan relasi database yang benar untuk menghindari data ganda.
12. Terapkan Row Level Security (RLS) sesuai role pengguna.
13. Jangan membuat tabel baru jika struktur tabel yang sudah ada dapat digunakan.
14. Jangan mengubah atau menghapus data produksi untuk keperluan tampilan.
15. Jika data belum tersedia, tampilkan empty state yang informatif, bukan angka palsu.

Sebelum membuat query atau mengubah database, periksa terlebih dahulu tabel, kolom, relasi, view, function, policy RLS, dan service yang sudah digunakan proyek.

---

# 9. Ketentuan Teknis Pengembangan

Sebelum implementasi:

1. Periksa struktur folder dan arsitektur proyek.
2. Periksa framework dan versi package yang digunakan.
3. Periksa sistem autentikasi dan cara aplikasi menentukan role pengguna.
4. Periksa routing dan navigasi yang sudah ada.
5. Periksa komponen layout dan design system.
6. Periksa halaman Client untuk mengetahui sumber font, ikon, warna, dan komponen.
7. Periksa integrasi Supabase dan struktur database.
8. Periksa halaman role lain agar tidak terjadi duplikasi atau konflik.

Saat implementasi:

- Pertahankan desain dan identitas visual PoliLand.
- Jangan mengubah fitur role lain yang sudah berjalan tanpa kebutuhan.
- Pisahkan hak akses Owner, Kepala Bagian, Marketing, dan Client.
- Gunakan komponen yang dapat digunakan kembali.
- Pastikan seluruh tombol dan menu memiliki fungsi.
- Pastikan navigasi antarhalaman berjalan dengan benar.
- Integrasikan halaman dengan Supabase.
- Pastikan loading, error, dan empty state tersedia.
- Jangan hanya membuat tampilan statis.
- Gunakan data aktual untuk statistik dan laporan.
- Hindari duplikasi komponen, service, dan query.
- Ikuti pola penamaan dan struktur kode yang sudah digunakan proyek.

---

# 10. Hasil Akhir yang Diharapkan

Owner memiliki panel khusus dengan lima menu utama:

1. **Beranda:** ringkasan kondisi perusahaan, statistik penjualan, asal konsumen, dan aktivitas terbaru.
2. **Kavling:** pemantauan seluruh kavling, pencarian, filter status, dan detail kavling.
3. **Statistik:** visualisasi penjualan, nilai penjualan, status kavling, asal konsumen, dan pipeline calon konsumen.
4. **Laporan:** laporan penjualan, pembayaran, dan pemasaran.
5. **Lainnya:** manajemen data, pengaturan, notifikasi, dan bantuan.

Sistem harus memberikan pengalaman penggunaan yang modern, konsisten, responsif, dan terintegrasi dengan Supabase.

**Tujuan utama:** Owner dapat memantau seluruh perkembangan bisnis PoliLand Kairagi melalui satu dashboard tanpa harus membuka dan memeriksa setiap bagian secara manual.

---

# 11. Instruksi Utama untuk Codex

Gunakan dokumen ini sebagai acuan implementasi Owner Panel PoliLand.

Sebelum mengubah kode, lakukan pemeriksaan terhadap struktur proyek, autentikasi, routing, komponen yang sudah ada, sumber ikon dan font, serta database Supabase.

Implementasikan fitur Owner dengan mengikuti layout dari referensi desain Owner dan design system dari referensi halaman Client.

Jangan membuat asumsi terhadap library, tabel, kolom, route, atau komponen yang belum diperiksa. Gunakan struktur dan pola yang sudah ada di proyek. Jika ada kebutuhan yang belum didukung database, jelaskan terlebih dahulu bagian yang kurang dan usulkan perubahan yang paling minimal.

Jangan merusak halaman atau alur role lain yang sudah berjalan. Pastikan seluruh fitur Owner berfungsi, hak akses diterapkan dengan benar, dan data yang ditampilkan berasal dari sumber aktual.
