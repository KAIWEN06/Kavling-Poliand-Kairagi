# PoliLand Kairagi — Design System & Implementation Specification

Dokumen terpadu ini menggabungkan dua dokumen sumber:

1. **Design System** — prinsip desain, arah visual, token, ergonomi, komponen, dan standar UX.
2. **Implementation Specification** — kondisi implementasi yang tercatat, API komponen, aturan migrasi, temuan audit, dan persyaratan integritas data.

> **Catatan penggunaan:** Jika terdapat perbedaan antara rekomendasi desain dan kondisi implementasi aktual, keduanya dipertahankan sesuai konteksnya. Bagian Design System menjelaskan standar/pedoman desain, sedangkan bagian Implementation Specification menjelaskan kondisi dan kontrak implementasi yang tercatat. Jangan menganggap rekomendasi sebagai fitur yang sudah diterapkan.

---

# BAGIAN I — DESIGN SYSTEM

# PoliLand Kairagi Design System

## 1. Project Overview

**PoliLand Mobile** adalah aplikasi properti dan manajemen kavling berbasis Vue 3 dan Ionic Vue (TypeScript, Tailwind CSS 4, Supabase, Capacitor) untuk kawasan **PoliLand Kairagi**. Aplikasi ini melayani enam konteks peran pengguna (_role_):

| Role          | Tanggung jawab utama                              |
| ------------- | ------------------------------------------------- |
| Public        | Melihat informasi proyek                          |
| Client        | Memantau pembelian dan pembayaran                 |
| Marketing     | Mengelola prospek dan calon pembeli               |
| Admin         | Mengelola data operasional                        |
| Kepala Bagian | Mengawasi operasional dan tim                     |
| Owner         | Memantau bisnis dan mengambil keputusan strategis |

Fondasi desain ini memastikan antarmuka terasa **rapi, modern, hangat (Modern-Natural), ergonomis di layar ponsel, dan tidak monoton**, sekaligus menjaga konsistensi teknis di seluruh komponen.

---

## 2. Core Design Principles & Laws of UX

1. **Hirarki Visual & Whitespace Lega**: Gunakan kontras ukuran, ketebalan huruf, dan posisi untuk mengarahkan fokus mata ke aksi utama (CTA). Berikan ruang kosong (_whitespace_) yang cukup agar layar tidak terasa penuh.
2. **Progressive Disclosure (Keringkasan Informasi)**: Tampilkan hanya metrik atau informasi terpenting di layar utama. Sembunyikan detail teknis (spesifikasi luas, rincian harga, riwayat perubahan) di balik tab, _accordion_, atau `AppModal` (`bottom-sheet`) untuk menekan _cognitive load_.
3. **Variasi Layout Anti-Monoton**: Kombinasikan kartu ringkasan (_Bento Grid_ untuk statistik), _horizontal scroll_ (untuk kategori/galeri/filter cepat), dan daftar vertikal (_vertical list_) secara berirama agar halaman terasa dinamis namun tetap terstruktur.
4. **Laws of UX**:
   - **Hick’s Law**: Batasi maksimal 1 aksi primer (_Primary CTA_) per layar/kartu dan maksimal 5 item pada navigasi bawah (`MobileTabBar`) untuk mempercepat pengambilan keputusan.
   - **Miller’s Law (Chunking)**: Kelompokkan informasi panjang (seperti rincian harga tunai, promo, luas, dan status kavling) ke dalam blok-blok kecil berisi 3–4 item informasi per kelompok.
   - **Jakob’s Law**: Gunakan pola navigasi mobile standar iOS/Android (_bottom tab bar_, _pull-to-refresh_, _swipe_ galeri, _bottom sheet_) agar pengguna langsung paham tanpa kurva belajar baru.
5. **Single Source of Truth**: Gunakan token semantik sebelum nilai _hardcoded_, dan jaga sinkronisasi antara Ionic CSS variables, Tailwind CSS 4, dan CSS aplikasi.

### 2.1 Bahasa, Terminologi UI & Microcopy Humanis

- Gunakan **Bahasa Indonesia** yang konsisten, ramah, jelas, dan berorientasi solusi.
- Hindari istilah bahasa Inggris jika padanan Indonesia yang alami tersedia (kecuali nama field database, properti TypeScript, dan API internal).
- **Terminologi Baku**:
  - Gunakan **"Disematkan"** untuk status/filter catatan di bagian atas.
  - Gunakan **"Sematkan"** untuk memasang catatan dan **"Lepas sematan"** untuk membatalkannya.
- **Microcopy & Pencegahan Error**:
  - Label tombol harus spesifik menggambarkan aksi (misal: _"Simpan Perubahan"_, _"Jadwalkan Survei"_, bukan sekadar _"OK"_ atau _"Submit"_).
  - Pesan error wajib menjelaskan penyebab dan solusi perbaikan (misal: _"Nomor WhatsApp belum lengkap, masukkan minimal 10 digit angka"_).
  - Aksi destruktif (hapus kavling/data) wajib melewati dialog konfirmasi eksplisit.
- **Bebas Dark Patterns**: Semua informasi harga (tunai vs promo), status ketersediaan kavling, persetujuan syarat, dan opsi pembatalan ditampilkan secara jujur, transparan, dan mudah diakses tanpa trik manipulatif.

---

## 3. Visual Direction & Color System (Aturan 60-30-10)

Arah visual PoliLand adalah **Modern-Natural** yang memadukan ketenangan hijau alam dengan aksen emas hangat di atas permukaan netral.

### 3.1 Proporsi Warna 60-30-10

- **60% Warna Dominan (Netral/Permukaan)**: Latar belakang hangat (`#FAF9F6` di Light Mode) dan permukaan kartu bersih (`#FFFFFF`) untuk kenyamanan baca jangka panjang.
- **30% Warna Sekunder (Permukaan Lembut & Struktur)**: Permukaan sekunder (`#F5F3EE`), garis batas halus (`#EAE7E0`), dan teks sekunder (`#717178`) untuk membedakan hierarki kartu dan bento grid.
- **10% Warna Aksen Tegas (Brand & CTA)**: Hijau PoliLand (`#355A2C`) untuk tombol aksi utama dan indikator aktif, serta Emas PoliLand (`#CBA044`) sebagai aksen visual/lencana (_badge_).

### 3.2 Brand & Semantic Tokens (Light & Dark Mode)

| Kategori            | Token                  | Light Mode | Dark Mode (Rekomendasi) | Penggunaan Utama                        |
| :------------------ | :--------------------- | :--------- | :---------------------- | :-------------------------------------- |
| **Brand Primary**   | `--poliland-green`     | `#355A2C`  | `#5C8D4E`               | Tombol utama (CTA), ikon aktif, fokus   |
| **Brand Accent**    | `--poliland-gold`      | `#CBA044`  | `#DFB863`               | Aksen grafis, highlight promo, lencana  |
| **Gold Soft**       | `--poliland-gold-soft` | `#F4D69A`  | `#3D3118`               | Latar lembut sorotan/badge              |
| **Gold Text**       | `--poliland-gold-text` | `#966A12`  | `#F4D69A`               | Teks aksen emas (lolos kontras WCAG AA) |
| **App Background**  | `--app-background`     | `#FAF9F6`  | `#121412`               | Latar belakang utama halaman            |
| **Surface Primary** | `--surface-primary`    | `#FFFFFF`  | `#1C1F1C`               | Kartu utama, modal, bottom sheet        |
| **Surface Muted**   | `--surface-muted`      | `#F5F3EE`  | `#262A26`               | Input field, kartu sekunder, bento tile |
| **Text Primary**    | `--text-primary`       | `#252525`  | `#F3F4F2`               | Judul dan teks utama                    |
| **Text Secondary**  | `--text-secondary`     | `#63636A`  | `#A3A6A0`               | Subjudul, metadata, placeholder         |
| **Border Default**  | `--border-default`     | `#EAE7E0`  | `#323732`               | Garis pemisah dan tepi kartu            |
| **Status Success**  | `--status-success`     | `#355A2C`  | `#5C8D4E`               | Status tersedia, berhasil disimpan      |
| **Status Warning**  | `--status-warning`     | `#966A12`  | `#E5B95C`               | Status _booking_ / menunggu konfirmasi  |
| **Status Danger**   | `--status-danger`      | `#D94B45`  | `#F06A65`               | Status terjual, error validasi, hapus   |

> **Aturan Kontras & Warna**:
>
> - Teks normal wajib memenuhi rasio kontras minimal **4.5:1** (WCAG AA), dan teks besar/ikon interaktif minimal **3:1**.
> - Jangan gunakan `--poliland-gold` (`#CBA044`) secara langsung untuk teks kecil di atas latar terang; gunakan `--poliland-gold-text` (`#966A12`).
> - Status (Tersedia, Booking, Terjual, Error) **tidak boleh hanya mengandalkan warna**—wajib disertai teks label atau ikon pendukung.

---

## 4. Typography

Jenis huruf utama adalah **Plus Jakarta Sans** (`--font-primary`, `--font-sans`, `--ion-font-family`) yang dirancang untuk keterbacaan optimal di layar ponsel.

### Skala Tipografi Mobile

| Peran Teks          | Ukuran        | Line-Height | Weight        | Penggunaan                                         |
| :------------------ | :------------ | :---------- | :------------ | :------------------------------------------------- |
| **Display / Hero**  | `24px – 28px` | `1.25`      | `700` / `800` | Judul halaman utama, ringkasan harga/metrik utama  |
| **Section Title**   | `18px – 20px` | `1.35`      | `700`         | Judul bagian (_section_), judul modal/bottom-sheet |
| **Card Title**      | `16px`        | `1.4`       | `600`         | Nomor kavling, nama pelanggan, judul kartu         |
| **Body Primary**    | `14px – 16px` | `1.5`       | `400` / `500` | Paragraf deskripsi, isi formulir, catatan          |
| **Caption / Label** | `12px – 13px` | `1.4`       | `500` / `600` | Label navigasi bawah, _badge_ status, timestamp    |

---

## 5. Spatial System (8pt Grid), Radius & Elevation

### 5.1 Sistem Grid 8pt & Responsivitas

Seluruh jarak (_margin_, _padding_, dan _gap_) menggunakan kelipatan **8px** (dengan mikro-spasi `4px` hanya untuk elemen rapat seperti ikon-ke-teks):

| Token Spasi | Nilai  | Penggunaan Umum                                                |
| :---------- | :----- | :------------------------------------------------------------- |
| `--space-1` | `4px`  | Jarak ikon dengan label kecil, jarak elemen internal badge     |
| `--space-2` | `8px`  | Jarak antar-elemen rapat dalam satu baris/chip                 |
| `--space-3` | `12px` | Padding internal input, jarak antar-item daftar padat          |
| `--space-4` | `16px` | Padding standar kartu, margin horizontal layar mobile (`16px`) |
| `--space-6` | `24px` | Jarak antar-section utama di dalam halaman                     |
| `--space-8` | `32px` | Ruang kosong pemisah blok besar / header ke konten             |

- **Rentang Layar Responsif**: Tata letak diuji dan dijamin aman mulai dari layar kecil (**320px – 375px**, misal iPhone SE/Mini) hingga layar besar (**430px+**, misal Pro Max/Ultra).
- **Safe Area Insets**: Wajib memperhitungkan `env(safe-area-inset-top)` untuk _notch/status bar_ dan `env(safe-area-inset-bottom)` untuk _home indicator_ serta `MobileTabBar`.

### 5.2 Border Radius

| Token              | Nilai  | Penggunaan                                                  |
| :----------------- | :----- | :---------------------------------------------------------- |
| `--radius-control` | `12px` | Tombol (`AppButton`), kolom input (`AppInput`), chip filter |
| `--radius-card`    | `16px` | Kartu kavling, kartu statistik bento, kartu kontak          |
| `--radius-panel`   | `20px` | Sudut atas `bottom-sheet` dan panel modal utama             |

### 5.3 Elevation & Shadow System

Bayangan digunakan secara halus untuk membedakan lapisan permukaan tanpa membuat tampilan berat:

| Token         | Nilai                                | Penggunaan                                                 |
| :------------ | :----------------------------------- | :--------------------------------------------------------- |
| `--shadow-sm` | `0 2px 8px rgba(37, 37, 37, 0.04)`   | Kartu standar di atas `--app-background`                   |
| `--shadow-md` | `0 8px 24px rgba(37, 37, 37, 0.08)`  | Kartu interaktif aktif, _floating action_, header melayang |
| `--shadow-lg` | `0 -8px 32px rgba(37, 37, 37, 0.14)` | `AppModal` (`bottom-sheet`) dan dialog                     |

---

## 6. Mobile Ergonomics & Micro-Interactions

1. **Thumb-Friendly Zone**:
   - Navigasi utama (`MobileTabBar`) dan tombol aksi primer formulir ditempatkan di sepertiga bawah layar agar mudah dijangkau ibu jari satu tangan.
   - Area atas (`AppHeader`) difokuskan untuk judul halaman, tombol kembali, dan indikator notifikasi.
2. **Touch Target Minimal 44×44px**:
   - Seluruh elemen interaktif (tombol, ikon header, item tab bar, tombol tutup modal, chip filter) wajib memiliki area sentuh minimal **44 × 44px** dengan jarak aman minimal **8px** antar-elemen klik agar tidak terjadi salah tekan (_mis-tap_).
3. **Umpan Balik Instan & Skeleton Loading**:
   - **Tactile Feedback**: Setiap penekanan tombol memberikan umpan balik visual instan (perubahan skala halus `scale(0.98)` / efek _ripple_ dan perubahan warna state).
   - **Skeleton Screen**: Saat memuat data dari Supabase (daftar kavling, profil, riwayat), tampilkan kerangka _skeleton loading_ yang menyerupai bentuk kartu asli, **bukan** layar kosong atau sekadar _spinner_ di tengah layar.
   - **Transisi Halus**: Gunakan durasi animasi `150ms–250ms` (_ease-out_) untuk _bottom sheet_ dan transisi tab, serta patuhi preferensi sistem `prefers-reduced-motion`.

---

## 7. User Flow, Edge Cases & Peak-End Rule

### 7.1 Onboarding, Empty State & Permissions

- **Onboarding Singkat & Skippable**: Untuk pengguna baru (terutama peran _Public_ dan _Marketing_), tampilkan maksimal 3 layar pengenalan fitur utama dengan tombol **"Lewati"** yang selalu terlihat jelas.
- **Empty State yang Membantu**: Jika daftar kavling, pencarian, atau catatan masih kosong, tampilkan ilustrasi ramah, penjelasan singkat (misal: _"Belum ada kavling yang sesuai filter Anda"_), dan tombol aksi pertama (misal: _"Reset Filter"_ atau _"Tambah Kavling"_).
- **Izin Akses Bertahap (Contextual Permissions)**: Jangan meminta izin lokasi, kamera, atau penyimpanan sekaligus saat aplikasi pertama dibuka. Minta izin hanya saat pengguna menekan fitur terkait (misal: izin kamera/galeri saat Admin mengunggah foto panorama 360°).

### 7.2 Penanganan Edge Cases Mobile

- **Kondisi Offline / Koneksi Lambat**: Tampilkan banner informasi non-intrusif di bagian atas saat perangkat kehilangan koneksi internet, pertahankan data terakhir yang tersimpan di cache lokal bila tersedia, dan nonaktifkan tombol mutasi data dengan keterangan jelas.
- **Teks & Nama Panjang**: Nama pelanggan, catatan alamat, atau nomor kavling yang panjang wajib ditangani dengan `text-overflow: ellipsis` (1 baris) atau `line-clamp: 2` pada kartu, tanpa merusak tata letak atau mendorong tombol keluar layar.
- **Keyboard Virtual Mobile**: Saat kolom input di dalam `AppModal` aktif, pastikan kontainer dapat digulir (_scrollable_) sehingga tombol simpan tidak tertutup keyboard ponsel.

### 7.3 Peak-End Rule (Momen Apresiasi)

Berikan umpan balik visual yang menyenangkan dan meyakinkan saat pengguna menyelesaikan alur utama yang bernilai tinggi:

- Saat pengguna publik berhasil mengirim permintaan survei/konsultasi atau Admin menyelesaikan transaksi penjualan kavling, tampilkan kartu/modal konfirmasi sukses dengan animasi centang halus, ringkasan langkah berikutnya, dan opsi aksi lanjutan yang jelas.

---

## 8. Shared Components Architecture

Komponen bersama terletak di `src/components/ui/` dan wajib digunakan di seluruh halaman agar konsisten.

### 8.1 `AppButton`

Membungkus `ion-button` dengan dukungan prop semantik `variant` (`primary | secondary | success | danger | neutral`), `fill` (`solid | outline | clear`), `size` (`small | medium | large`), `expand`, dan `loading`.

- Tinggi minimal: `small` = `44px`, `medium` = `44px`, `large` = `48px` (menjamin _touch target_ ergonomis).
- Saat `loading="true"`, tampilkan spinner, pertahankan teks tombol, kunci klik ganda, dan atur `aria-busy="true"`.

### 8.2 `AppInput`

Komponen input standar untuk teks, email, telepon, dan kata sandi.

- Menggunakan `--radius-control` (`12px`), tinggi area sentuh minimal `44px`, dan label eksplisit yang terhubung melalui `inputId`.
- Mendukung `errorMessage` yang otomatis menampilkan pesan merah (`--status-danger`) dengan `role="alert"` dan `aria-invalid="true"`.

### 8.3 `AppHeader` & `MobileTabBar`

- **`AppHeader`**: Mendukung varian `default`, `marketing`, dan `admin`. Tombol aksi (kembali, notifikasi) wajib berukuran minimal `44 × 44px`.
- **`MobileTabBar`**:
  - **Public**: Beranda, Siteplan, Progres, Galeri, Kontak.
  - **Marketing**: Beranda, Kavling, Prospek, Follow-up, Lainnya.
  - **Admin**: Beranda, Kavling, Pembeli, Keuangan, Lainnya.
  - Indikator tab aktif memadukan warna `--poliland-green`, latar ikon lembut, dan ketebalan teks `600` (tidak hanya mengandalkan animasi).

### 8.4 `AppModal` & `AppFormSheet`

`src/components/ui/AppModal.vue` adalah fondasi modal bersama (menggunakan Vue fixed overlay, bukan `ion-modal`):

- **`bottom-sheet`**: Standar untuk formulir tambah/edit/ubah data (_AppFormSheet_) dan filter lanjutan. Di mobile menempel di bawah layar dengan sudut atas `--radius-panel` (`20px`) dan area aman `env(safe-area-inset-bottom)`. Di desktop tampil terpusat dengan `max-width: 560px`.
- **`dialog`**: Untuk konfirmasi singkat dan pencegahan error sebelum aksi berisiko (misal: konfirmasi hapus data).
- **`fullscreen`**: Untuk tampilan imersif seperti penampil Siteplan interaktif atau Panorama 360°.
- **Aksesibilitas Modal**: Mengunci _scroll_ latar belakang, memindahkan dan menjebak fokus (_focus trap_) di dalam dialog, mendukung tombol `Escape`, serta mencegah penutupan tidak sengaja saat `loading="true"`.

---

## 9. Role-Specific UI & Page Implementation Rules

- Keenam peran (_Public, Client, Marketing, Admin, Kepala Bagian, Owner_) berbagi tipografi, token warna, sistem grid 8pt, standar aksesibilitas, dan API komponen bersama.
- Struktur menu, kepadatan informasi (_information density_), dan alur kerja tetap dibedakan sesuai tanggung jawab masing-masing peran.
- **Owner** berfokus pada pemantauan tingkat perusahaan: ringkasan penjualan, pendapatan, pembayaran, komisi, performa marketing, perkembangan proyek, dan laporan. Akses utamanya bersifat pemantauan dan pengambilan keputusan strategis; hak mutasi data operasional diberikan hanya jika memang dibutuhkan dan disetujui.
- **Kepala Bagian** berfokus pada pengawasan operasional harian: memantau pekerjaan Admin dan Marketing, meninjau calon client, memantau transaksi dan pembayaran, mengevaluasi performa tim, serta melakukan persetujuan operasional sesuai kewenangannya.
- **Admin** berfokus pada pelaksanaan dan pengelolaan data operasional sesuai hak akses yang diberikan.
- **ContactPage (`ContactPage.vue`)**: Mengambil data terverifikasi dari tabel `contacts` di Supabase (`whatsapp`, `phone`, `email`, `address`, `maps_url`, dan tautan media sosial HTTP/HTTPS). Jangan menampilkan nilai placeholder atau tombol lokasi mati jika data belum tersedia di database.
- **Legacy Tokens**: Pertahankan alias lama (`--pl-charcoal`, `--pl-gray`, `--pl-background`, `--pl-surface`, `--pl-success`) hingga seluruh referensi selesai dimigrasi.

---

## 10. Data Integrity & Activity Audit Rules

Setiap mutasi data yang berhasil pada entitas yang diaudit wajib tercatat secara akurat dan transparan.

### 10.1 Lot Activity Audit (`public.lot_activity_logs`)

- Setiap operasi **INSERT**, **UPDATE**, dan **DELETE** pada tabel `public.lots` wajib dicatat secara otomatis melalui **PostgreSQL Triggers** dalam transaksi database yang sama (_atomic_).
- **INSERT**: Mencatat aksi `INSERT`, `auth.uid()`, `lot_id`, `lot_number`, dan seluruh data baru di `new_value`.
- **UPDATE**: Mendeteksi perubahan aktual per kolom menggunakan `IS DISTINCT FROM` untuk kolom yang dipantau (`lot_number`, `polygon_id`, `block_id`, `dimension`, `area`, `cash_price`, `promo_price`, `status`, `payment_type`, `customer_id`, `booking_date`, `sold_date`, `color`, `description`, `panorama_url`, `panorama_boundary`). Abaikan kolom yang nilainya tidak berubah.
- **DELETE**: Menyimpan seluruh data terakhir di `old_value` dan informasi kavling di `metadata`. Gunakan `ON DELETE SET NULL` pada `lot_id` agar riwayat audit tetap utuh meskipun kavling dihapus.

### 10.2 Atribusi Pengguna & Pemisahan Riwayat Transaksi

- Gunakan `auth.uid()` dari Supabase Auth sebagai sumber kebenaran aktor (`user_id`), jangan pernah menerima ID aktor dari payload frontend.
- Peristiwa transaksi (pembuatan/pembatalan booking, pembayaran cicilan, pelunasan) dicatat pada riwayat transaksi masing-masing dan tidak boleh diduplikasi sebagai perubahan data administratif biasa di `Riwayat Perubahan`.

### 10.3 Audit Panorama 360° & Storage

- Operasi unggah, penggantian, penghapusan, dan perubahan batas (_boundary_) panorama 360° wajib menggunakan path unik di Supabase Storage, memperbarui `lots.panorama_url` secara konsisten, dan mencatat referensi lama serta baru. Jangan menghapus file lama sebelum pembaruan database berhasil.

### 10.4 Tampilan Riwayat Perubahan & Perlindungan Data

- Halaman detail kavling Admin menampilkan tab **`Riwayat Perubahan`** yang diurutkan dari terbaru (`created_at DESC`) dengan bahasa manusiawi (contoh: _"Harga tunai diubah dari Rp250.000.000 menjadi Rp275.000.000"_), tanpa menampilkan JSON mentah atau nama kolom internal.
- Tabel audit bersifat _append-only_ (tidak dapat diubah atau dihapus melalui aplikasi) dan dilindungi oleh Supabase Row Level Security (RLS).

---

## 11. Verification Checklist Before Release

Sebelum menyelesaikan pembaruan UI/UX maupun fitur data:

1. **Responsivitas & Ergonomi**: Uji tampilan pada lebar **375px** dan **430px**, pastikan tidak ada _horizontal overflow_, tombol minimal **44×44px**, dan _safe area_ bawah tidak menutupi aksi.
2. **Kontras & Aksesibilitas**: Pastikan rasio kontras teks minimal **4.5:1**, `:focus-visible` terlihat jelas, dan state _loading/empty/error_ informatif.
3. **Integritas Audit & Build**: Pastikan trigger audit berjalan akurat tanpa duplikasi, lalu jalankan validasi TypeScript (`vue-tsc`), _production build_, dan `git diff --check`.

---

# BAGIAN II — IMPLEMENTATION SPECIFICATION & AUDIT

# PoliLand Kairagi Design System

## 1. Project Overview

PoliLand Mobile is a Vue 3 and Ionic Vue application built with TypeScript, Tailwind CSS 4, Supabase, and Capacitor. The application serves six role contexts:

| Role          | Main responsibility                               |
| ------------- | ------------------------------------------------- |
| Public        | Melihat informasi proyek                          |
| Client        | Memantau pembelian dan pembayaran                 |
| Marketing     | Mengelola prospek dan calon pembeli               |
| Admin         | Mengelola data operasional                        |
| Kepala Bagian | Mengawasi operasional dan tim                     |
| Owner         | Memantau bisnis dan mengambil keputusan strategis |

The shared foundation provides consistent typography, colors, and interaction patterns. It does not require each role to use the same layout or navigation structure.

## 2. Design Principles

- Preserve role-specific workflows and navigation.
- Use semantic tokens before hardcoded values.
- Keep Ionic, Tailwind, and application CSS connected to the same source of truth.
- Preserve existing legacy aliases until every reference has been mapped.
- Prefer native controls and visible interaction states.
- Meet WCAG AA contrast requirements.
- Keep the interface usable at mobile widths and with safe-area insets.

## 2.1 Bahasa dan Terminologi UI

- Gunakan Bahasa Indonesia yang konsisten untuk teks antarmuka pengguna.
- Hindari istilah bahasa Inggris jika padanan Indonesia yang jelas tersedia.
- Gunakan “Disematkan” untuk status/filter catatan yang dipasang di bagian atas.
- Gunakan “Sematkan” untuk aksi memasang catatan dan “Lepas sematan” untuk aksi membatalkannya.
- Nama field database, properti TypeScript, dan API internal boleh tetap menggunakan istilah teknis aslinya.

## 3. Visual Direction

The PoliLand visual direction is Modern-Natural, combining brand green and gold with warm neutral surfaces. Brand green is the primary operational color. Gold is an accent and may be used as a surface or icon accent. Gold used for small text must use an accessible gold text token.

The visual foundation is currently implemented in `src/theme/variables.css` and `src/styles/main.css`.

## 4. Typography

The primary typeface is Plus Jakarta Sans, loaded through Fontsource in `src/main.ts`.

Available weights:

| Weight | Token                     |
| ------ | ------------------------- |
| 400    | `--font-weight-regular`   |
| 500    | `--font-weight-medium`    |
| 600    | `--font-weight-semibold`  |
| 700    | `--font-weight-bold`      |
| 800    | `--font-weight-extrabold` |

Font tokens:

- `--font-primary`
- `--font-sans` in Tailwind
- `--ion-font-family`

`--font-primary`, `--font-sans`, and `--ion-font-family` must resolve to Plus Jakarta Sans. Ionic Shadow DOM components inherit the application font through the Ionic font variable.

## 5. Brand Colors

| Token                       | Value     | Intended usage                                |
| --------------------------- | --------- | --------------------------------------------- |
| `--poliland-green`          | `#355A2C` | Primary brand and action color                |
| `--poliland-gold`           | `#CBA044` | Brand accent and graphic accent               |
| `--poliland-gold-soft`      | `#F4D69A` | Soft gold surface accent                      |
| `--poliland-gold-text`      | `#966A12` | Accessible gold text on light surfaces        |
| `--poliland-gold-text-soft` | `#805708` | Accessible deeper gold text on cream surfaces |

Brand gold must not be used as text by default. Gold used as text should use a gold text token and be contrast-tested.

## 6. Semantic Colors

| Function               | Token               | Current value               |
| ---------------------- | ------------------- | --------------------------- |
| Application background | `--app-background`  | `#FAF9F6`                   |
| Primary surface        | `--surface-primary` | `#FFFFFF`                   |
| Muted surface          | `--surface-muted`   | `#F5F3EE`                   |
| Primary text           | `--text-primary`    | `#252525`                   |
| Secondary text         | `--text-secondary`  | `#717178`                   |
| Default border         | `--border-default`  | `#EAE7E0`                   |
| Success                | `--status-success`  | Alias to `--poliland-green` |
| Warning                | `--status-warning`  | Alias to `--poliland-gold`  |
| Danger                 | `--status-danger`   | `#D94B45`                   |

Additional status surfaces include `--status-success-bg`. Ionic mappings are defined in `src/theme/variables.css` for primary, secondary, success, warning, danger, medium, card, item, and toolbar.

## 7. Color Usage Rules

- Use semantic tokens for component behavior and visual states.
- Use brand tokens only where the design intentionally communicates brand identity.
- Never use status meaning as decoration.
- Pair status colors with text or an accessible icon where users must interpret the state.
- Preserve legacy aliases. Do not remove them while references still exist.
- Do not introduce a new token when an existing semantic token has the same function.

## 8. Contrast Accessibility

Normal text must meet 4.5:1 contrast against its actual background. Large text must meet 3:1. Interactive boundaries and focus indicators should meet 3:1 against adjacent colors.

The application should not rely on color alone to communicate active, success, warning, danger, disabled, or loading states.

Every shared component must have a visible `:focus-visible` treatment. Native buttons should be used for actions and native links for navigation.

## 9. Spacing System

The project does not currently define a complete named spacing scale in CSS. Existing spacing is primarily expressed with component-specific pixel or Tailwind values.

Current recommended development rule:

- Use the existing component layout before introducing a new spacing scale.
- Reuse values consistently within a component.
- Preserve current page layout and page padding.
- Propose any named spacing tokens before implementation.

This spacing section records the current state; it does not claim tokens that do not exist.

## 10. Border Radius

| Token              | Value  |
| ------------------ | ------ |
| `--radius-control` | `12px` |
| `--radius-card`    | `16px` |
| `--radius-panel`   | `20px` |

Radius should communicate component hierarchy. It should not make every control a pill.

Existing shared components still contain literal radius values. Their standardization is a planned recommendation, not an already implemented state.

## 11. Shadow System

Shadows should communicate elevation, not act as decoration on every surface.

The project currently uses component-local shadows. A named shared elevation scale is not yet defined, so it should not be documented as implemented.

## 12. Ionic Theme Integration

Ionic theme variables in `src/theme/variables.css` are connected to PoliLand semantic and brand variables. The public application inherits global typography and background through Ionic variables and `src/styles/main.css`.

Legacy `--pl-*` variables remain aliases for compatibility. Components may continue to reference them until they are intentionally migrated.

## 13. Tailwind Integration

Tailwind's `--font-sans` token resolves to Plus Jakarta Sans. The Tailwind theme and global Ionic typography are therefore expected to use the same font family.

Semantic application colors may be used through CSS custom properties. Tailwind utility styles that duplicate a component should not bypass the component API without a documented need.

## 14. Shared Components

### AppButton

Current implementation:

- Wraps Ionic `ion-button`.
- Supports `color`, `fill`, `expand`, and `disabled`.
- Uses `@click="$emit('click')"` and a slot.
- The component is currently used for auth actions, siteplan actions, gallery calls to action, and headers.

Implemented API:

| Prop       | Type                                                   | Default                                                |
| ---------- | ------------------------------------------------------ | ------------------------------------------------------ |
| `variant`  | `primary \| secondary \| success \| danger \| neutral` | Inferred: `primary` when no legacy `color` is provided |
| `fill`     | `solid \| outline \| clear`                            | `solid`                                                |
| `size`     | `small \| medium \| large`                             | `medium`                                               |
| `expand`   | `block \| full`                                        | None                                                   |
| `loading`  | `boolean`                                              | `false`                                                |
| `disabled` | `boolean`                                              | `false`                                                |
| `type`     | `button \| submit \| reset`                            | `button`                                               |
| `color`    | Ionic-compatible color                                 | None                                                   |

The `variant` API takes priority over legacy `color`. Legacy `color` and Ionic fill values remain supported. `fill="default"` is normalized to `solid`.

#### Variants

| Variant     | Solid visual direction               |
| ----------- | ------------------------------------ |
| `primary`   | PoliLand green                       |
| `secondary` | PoliLand gold with dark primary text |
| `success`   | Semantic success green               |
| `danger`    | Semantic danger red                  |
| `neutral`   | Muted surface with primary text      |

Outline and clear fills preserve the same variant meaning while using transparent surfaces or borders.

#### States

- Default, hover, active, and focus-visible states use semantic tokens.
- Small, medium, and large buttons use 44px, 44px, and 48px minimum heights respectively.
- Loading and disabled states prevent interaction.
- Loading displays a spinner, retains slot text, and sets `aria-busy="true"` with a screen-reader processing label.

### AppInput

Shared Ionic input component for text, email, telephone, and password fields.

#### Props

Existing props:

- `modelValue`
- `label`
- `placeholder`
- `type`
- `autocomplete`
- `icon`
- `inputId`
- `required`
- `disabled`
- `showPasswordToggle`

Additional props:

- `errorMessage?: string`
- `readonly?: boolean`

#### Events

- `update:modelValue`
- `focus`
- `blur`
- `visibility-change`

#### Semantic mapping

| Element                                | Token                                  |
| -------------------------------------- | -------------------------------------- |
| Label and input text                   | `--text-primary`                       |
| Placeholder and icon                   | `--text-secondary`                     |
| Control and password button background | `--surface-primary`, `--surface-muted` |
| Border                                 | `--border-default`                     |
| Focus                                  | `--poliland-green`                     |
| Error                                  | `--status-danger`                      |
| Radius                                 | `--radius-control`                     |

#### States

- Default, hover, focus, focus-visible, disabled, read-only, and error states use semantic tokens.
- Password visibility preserves the existing hidden and visible states with an accessible toggle label and `aria-pressed`.
- Error text is also exposed through `role="alert"`.

#### Accessibility and attributes

- A supplied `inputId` is preserved.
- An omitted `inputId` receives a unique generated ID.
- Labels use the resolved input ID.
- Native attributes are forwarded to `IonInput`, including `name`, `form`, `inputmode`, length limits, pattern, and data attributes.
- `aria-invalid="true"` is set only when `errorMessage` is present.
- `errorMessage` supplies an automatically generated error ID through `aria-describedby`.
- Caller-provided `aria-describedby` IDs are combined with the generated error ID.

#### Example

```vue
<AppInput
  v-model="email"
  input-id="checkout-email"
  label="Email"
  name="email"
  type="email"
  autocomplete="email"
  required
  :error-message="emailError"
/>
```

### AppHeader

The shared header supports:

- Default, marketing, and admin variants.
- Back behavior.
- Notification navigation.
- Authentication-dependent login action.

The role appearance remains differentiated. Shared implementation uses semantic surfaces, borders, primary text, secondary text, status color, and control radius. Role-specific structure and navigation are unchanged. Interactive icon controls use a 44px minimum target, and the title uses the configured Plus Jakarta Sans weight.

### MobileTabBar

An existing shared tab bar supports public, marketing, and admin variants. Navigation structure, menu count, labels, route targets, and role access must remain distinct. Shared typography, active and inactive state, icon sizing, spacing, radius, safe area, and accessibility can be standardized.

### AppModal — Shared Modal Component

`src/components/ui/AppModal.vue` is the shared modal foundation for the application. It uses a Vue-rendered fixed overlay rather than `ion-modal`, following the visual and interaction pattern already used by the Edit Data Customer panel in `AdminPembeliDetail.vue`.

Use this component for form sheets, compact dialogs, and full-screen modal flows. Pages provide their own form content and business logic through slots; the shared component owns the overlay, panel, header, footer, transitions, focus behavior, and page scroll lock.

#### Variants

| Variant        | Intended use                            | Mobile behavior                                 | Desktop behavior                    |
| -------------- | --------------------------------------- | ----------------------------------------------- | ----------------------------------- |
| `bottom-sheet` | Add, edit, and update forms             | Anchored to the bottom with rounded top corners | Centered panel, maximum width 560px |
| `dialog`       | Short confirmations and focused actions | Centered panel                                  | Centered panel                      |
| `fullscreen`   | Complex or space-intensive flows        | Fills the viewport                              | Fills the viewport                  |

#### Props

| Prop              | Type                                                   | Default        | Purpose                                             |
| ----------------- | ------------------------------------------------------ | -------------- | --------------------------------------------------- |
| `modelValue`      | `boolean`                                              | Required       | Controls visibility with `v-model`                  |
| `title`           | `string`                                               | `''`           | Visible heading and accessible dialog label         |
| `ariaLabel`       | `string`                                               | `'Dialog'`     | Accessible name when no title is supplied           |
| `variant`         | `bottom-sheet \| dialog \| fullscreen`                 | `bottom-sheet` | Modal layout                                        |
| `showHeader`      | `boolean`                                              | `true`         | Shows the header region                             |
| `showClose`       | `boolean`                                              | `true`         | Shows the close control in the default header       |
| `showDivider`     | `boolean`                                              | `true`         | Shows the divider below the header                  |
| `showFooter`      | `boolean`                                              | `true`         | Shows the footer region                             |
| `showCancel`      | `boolean`                                              | `true`         | Shows the default cancel button                     |
| `showConfirm`     | `boolean`                                              | `true`         | Shows the default confirmation button               |
| `cancelText`      | `string`                                               | `'Batal'`      | Default cancel label                                |
| `confirmText`     | `string`                                               | `'Simpan'`     | Default confirmation label                          |
| `confirmVariant`  | `primary \| secondary \| success \| danger \| neutral` | `primary`      | AppButton variant for confirmation                  |
| `loading`         | `boolean`                                              | `false`        | Disables closing and displays confirm loading state |
| `confirmDisabled` | `boolean`                                              | `false`        | Disables the confirmation button                    |
| `closeOnBackdrop` | `boolean`                                              | `true`         | Allows backdrop click to request close              |
| `closeOnEscape`   | `boolean`                                              | `true`         | Allows Escape to request close                      |
| `maxWidth`        | `string`                                               | `560px`        | Maximum panel width                                 |
| `maxHeight`       | `string`                                               | `90dvh`        | Maximum panel height                                |

#### Slots

- Default slot: modal body content.
- `header`: replaces the default title and close-control layout.
- `footer`: replaces the default cancel and confirm buttons.

When a custom footer is supplied, the page is responsible for its button actions and loading/disabled presentation.

#### Events

| Event               | Payload                                        | Behavior                                                |
| ------------------- | ---------------------------------------------- | ------------------------------------------------------- |
| `update:modelValue` | `boolean`                                      | Supports `v-model` visibility                           |
| `confirm`           | none                                           | Emitted when the default confirmation button is clicked |
| `cancel`            | none                                           | Emitted when the default cancel button is clicked       |
| `close`             | `close-button \| cancel \| backdrop \| escape` | Reports why a close was requested                       |

The component does not own form submission or data persistence. The parent page handles validation, API/Supabase operations, success notifications, and error messages. Keep the modal open when saving fails.

#### Usage example

```vue
<AppModal
  v-model="editModalOpen"
  title="Edit data customer"
  variant="bottom-sheet"
  :loading="saving"
  confirm-text="Simpa"
  @confirm="saveCustomer"
>
  <form class="customer-form" @submit.prevent="saveCustomer">
    <!-- Page-specific fields -->
  </form>
</AppModal>
```

For forms that use native form submission, prefer a custom footer slot and a submit button associated with the form, or keep the submit action in the body. Do not nest a `<form>` inside another `<form>`.

A confirmation dialog can use:

```vue
<AppModal
  v-model="deleteModalOpen"
  title="Hapus data?"
  variant="dialog"
  confirm-text="Hapus"
  confirm-variant="danger"
  @confirm="deleteRecord"
>
  Yakin ingin menghapus data ini?
</AppModal>
```

#### Visual rules

- Use the existing semantic tokens: `--surface-primary`, `--surface-muted`, `--text-primary`, `--border-default`, `--radius-panel`, `--radius-control`, and `--poliland-green`.
- Bottom sheet mobile layout is full width, anchored to the viewport bottom, with top corners using `--radius-panel`.
- Header title uses Plus Jakarta Sans, 18–20px, semibold or bold.
- Close control has a minimum 44 × 44px touch target.
- Body is the only scrollable region when content exceeds available height.
- Default footer uses two equal-width actions with a minimum 44px touch target.
- Footer accounts for `env(safe-area-inset-bottom)`.
- Desktop bottom sheets become centered panels with a maximum width of 560px.
- Reduced-motion preferences must be respected.
- Avoid page-specific copies of overlay, panel, header, footer, transition, or backdrop CSS.

#### Behavior and accessibility

- The component locks background page scrolling while open and restores the previous body styles on close.
- Focus moves into the dialog when opened, remains trapped while navigating with Tab, and returns to the previously focused element when closed.
- Escape and backdrop interactions request closing according to their respective props.
- Closing is blocked while `loading` is true.
- Every modal must have an accessible name through `title` or `ariaLabel`.
- Form labels, field validation, and error descriptions remain the responsibility of the page and its form controls.
- The parent page must handle unsaved-change confirmation when necessary; do not silently discard a dirty form.
- Do not put business logic, Supabase queries, routing, or page-specific field definitions inside `AppModal.vue`.

#### Migration rule

Use `AppModal` for new modal work. Migrate existing modals incrementally after checking their current behavior. Do not migrate all pages in one change, and do not remove an existing implementation until the replacement has been tested on mobile and desktop.

## 15. Role-specific UI Rules

### Daftar Role Resmi

| Role          | Tanggung jawab utama                              |
| ------------- | ------------------------------------------------- |
| Public        | Melihat informasi proyek                          |
| Client        | Memantau pembelian dan pembayaran                 |
| Marketing     | Mengelola prospek dan calon pembeli               |
| Admin         | Mengelola data operasional                        |
| Kepala Bagian | Mengawasi operasional dan tim                     |
| Owner         | Memantau bisnis dan mengambil keputusan strategis |

The six roles share:

- Typography.
- Semantic tokens.
- Component APIs.
- Accessibility requirements.
- Responsive rules.

The roles do not share:

- All navigation menus.
- All page layouts.
- All role-specific workflows.
- All action density or administrative data views.

Public, client, marketing, admin, kepala bagian, and owner differences must remain intentional and content-driven.

### Role Responsibilities and Access Boundaries

| Role          | Fokus utama                                                                                   | Batas akses yang perlu dijaga                                                                                             |
| ------------- | --------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Public        | Melihat informasi proyek, siteplan, galeri, progres, dan kontak                               | Tidak memiliki akses ke data internal, transaksi, atau dashboard operasional                                              |
| Client        | Memantau kavling yang dibeli, transaksi, jadwal/riwayat pembayaran, dan notifikasi            | Hanya dapat melihat data pembelian miliknya; tidak dapat mengubah transaksi atau pembayaran                               |
| Marketing     | Mengelola prospek, mencatat calon client, melakukan tindak lanjut, dan melihat komisi sendiri | Tidak dapat mengubah harga final, pembayaran, komisi yang telah ditetapkan, atau data milik Marketing lain                |
| Admin         | Menjalankan pengelolaan data operasional sesuai penugasan                                     | Hak tambah, ubah, hapus, dan persetujuan dibatasi berdasarkan kebijakan perusahaan                                        |
| Kepala Bagian | Mengawasi operasional, tim Admin dan Marketing, serta meninjau proses penjualan               | Memiliki akses pengawasan dan persetujuan operasional sesuai kewenangan; tidak otomatis memiliki seluruh hak Owner        |
| Owner         | Memantau kinerja dan kondisi perusahaan secara menyeluruh serta mengambil keputusan strategis | Secara default berfokus pada laporan dan pemantauan; perubahan data operasional harus mengikuti kebijakan dan jejak audit |

**Aturan implementasi role:**

- Owner dan Kepala Bagian harus menjadi role tersendiri, bukan sekadar label tampilan dari Admin.
- Terapkan pemeriksaan hak akses di routing, komponen/aksi UI, service, dan terutama kebijakan Supabase Row Level Security (RLS). Menyembunyikan tombol saja tidak cukup untuk mengamankan data.
- Pisahkan izin berdasarkan tindakan, misalnya `view_reports`, `manage_lots`, `review_leads`, `approve_transactions`, `manage_payments`, `manage_commissions`, dan `manage_users`. Nama izin ini merupakan usulan konseptual; sesuaikan dengan skema otorisasi proyek yang sebenarnya.
- Setiap tindakan perubahan atau persetujuan penting harus mencatat aktor, waktu, dan perubahan melalui mekanisme audit yang sesuai.
- Jangan memberikan akses Owner atau Kepala Bagian secara otomatis kepada akun Admin lama. Penetapan role harus dilakukan secara eksplisit oleh pihak yang berwenang.

## 16. Responsive Rules

- Preserve the minimum 320px application width.
- Use `env(safe-area-inset-bottom)` for fixed bottom navigation.
- Interactive controls should have at least a 44px touch target.
- Navigation labels must not clip or escape their grid cell.
- Fixed components must avoid covering page actions.
- Test narrow widths before claiming a responsive improvement.

## 17. Accessibility Guidelines

- Every action uses a native button or equivalent accessible element.
- Every navigation item has a real destination.
- Every icon-only control has an accessible name.
- Every input has a visible label associated with its control.
- Dialogs support Escape and keyboard focus handling.
- Formulir tambah/edit/ubah data mengikuti standar `AppFormSheet`; jangan membuat pola modal formulir yang berbeda per halaman atau role.
- Loading, empty, and error states provide visible and accessible context.
- Status must use text or an icon in addition to color.
- Reduced motion must be respected where transitions are added.

## 18. Legacy Token Rules

Legacy PoliLand tokens remain aliases while existing code still references them.

Examples:

- `--pl-charcoal` aliases `--text-primary`.
- `--pl-gray` aliases `--text-secondary`.
- `--pl-background` aliases `--app-background`.
- `--pl-surface` aliases `--surface-primary`.
- `--pl-success` aliases `--status-success`.

Do not remove a legacy token until its references have been mapped and migrated. Do not create a new alias with the same function as an existing semantic token.

## 19. Component Implementation Guidelines

- Complete an audit before creating a shared component.
- Preserve existing props, native attributes, events, navigation, and form behavior.
- Do not change routes, Supabase queries, database access, or business logic.
- Do not change page layout when standardizing a component.
- Semua alur tambah/edit/ubah data yang menggunakan formulir harus memakai `AppFormSheet` sesuai bagian Shared Components.
- Keep role variants separate when users need different workflows.
- Add or change a token only when the existing tokens cannot represent the state.
- Run production build, TypeScript validation, and `git diff --check`.

## 20. Phase 2 Audit Findings and Recommendations

### AppButton

Recommendations:

- Finalize a single visual API with explicit priority rules.
- Keep backward-compatible Ionic properties.
- Add a semantic `variant` only after existing callers are classified.
- Add size, loading, and native attribute forwarding deliberately.

Existing use that needs review includes `DetailPanel.vue`, where `variant="secondary"` is currently forwarded as an undeclared attribute and no wrapper variant is implemented.

### ContactPage

The location card button has no event handler at [ContactPage.vue](/C:/Users/Kevin/Desktop/Kavling-PoliLand-Kairagi-v2/poliland-mobile/src/views/ContactPage.vue:103). The page already defines real link cards for WhatsApp and telephone, but the stored values are placeholders at [ContactPage.vue](/C:/Users/Kevin/Desktop/Kavling-PoliLand-Kairagi-v2/poliland-mobile/src/views/ContactPage.vue:188).

The recommended action cannot be selected until the owner provides the real contact source and destination. The location button should either navigate to or trigger an approved existing WhatsApp or telephone contact flow.

### AppInput

This component is implemented with the semantic mapping documented above. Remaining AppHeader and MobileTabBar work is outside the current implementation scope.

### AppHeader

Recommended token mapping:

| Existing style          | Recommended token                                                                  |
| ----------------------- | ---------------------------------------------------------------------------------- |
| Toolbar background      | `--surface-muted` or existing cream background rule if role appearance requires it |
| Toolbar border          | `--border-default`                                                                 |
| Primary text and icons  | `--text-primary`                                                                   |
| Secondary label text    | `--text-secondary`                                                                 |
| Notification dot        | `--status-danger`                                                                  |
| Notification dot border | Surface and toolbar background                                                     |

### MobileTabBar

The existing implemented variants remain separate. Role-specific navigation for Kepala Bagian and Owner must follow their distinct responsibilities:

| Variant       | Current menu purpose                             |
| ------------- | ------------------------------------------------ |
| Public        | Home, siteplan, progress, gallery, contact       |
| Marketing     | Home, kavling, potential buyers, follow-up, more |
| Admin         | Home, kavling, buyers, finance, more             |
| Kepala Bagian | Ringkasan operasional, persetujuan, tim, laporan |
| Owner         | Ringkasan bisnis, penjualan, keuangan, laporan   |

Shared recommendations are semantic colors, identical icon sizing, consistent labels, 44px minimum interaction targets, visible active state, visible focus, safe-area handling, and Plus Jakarta Sans.

Role structure, route targets, labels, and menu count should not be merged.

Phase 2.3 standardizes the shared foundation while preserving these role menus:

- Semantic primary surfaces and border colors replace the previous opaque glass and gradient treatment.
- Active items use the brand green and a stable icon surface instead of elevation and decorative vertical movement.
- Labels use Plus Jakarta Sans and the shared extra-small size.
- `:focus-visible` has an explicit 3px brand-green focus indicator.
- Active state is not communicated by motion alone. It combines color, icon background, label weight, and an active indicator.
- Safe-area inset, fixed positioning, route behavior, detail/search hiding, and role menu configuration remain unchanged.

### ContactPage

`ContactPage.vue` loads verified availability from `contactService.getContacts()`, which reads the `contacts` table in Supabase. It does not generate placeholder contact values.

Supported source keys include:

- WhatsApp: `whatsapp`, `whatsapp_number`
- Telephone: `phone`, `telephone`, `telepon`
- Email: `email`
- Address: `address`, `alamat`
- Map link: `maps_url`, `map_url`, `location_url`
- Social profiles: `instagram`, `instagram_url`, `facebook`, `facebook_url`, `tiktok`, `tiktok_url`

The page renders loading, unavailable, and loading-error states. Contact and social cards are rendered only when their stored values are usable. A telephone link is created only for a stored telephone value. A WhatsApp link is created only when a stored number can be normalized. Email is shown only when a stored email value is available.

Social profile values must be complete HTTP or HTTPS URLs. Addresses become a Google Maps search only when a `maps_url` is not stored. If neither a valid map URL nor address is available, the location card does not render a dead action.

## 21. Data Integrity & Activity Audit Rules

### 21.1 General Audit Requirements

Every successful data mutation performed through the application must be recorded when the entity is covered by an activity audit system.

The application must maintain reliable audit records for:

- INSERT: New records created.
- UPDATE: Existing records modified.
- DELETE: Records permanently deleted.
- Relevant file operations, including upload, replacement, and deletion.

Audit records must reflect successful database operations only. Failed, rejected, cancelled, or rolled-back operations must not produce successful activity records.

### 21.2 Lot Activity Audit — PoliLand

The `lots` table must use `public.lot_activity_logs` as its audit history source.

Every successful INSERT, UPDATE, and DELETE operation on `public.lots` must be recorded automatically through PostgreSQL triggers.

Do not rely exclusively on frontend code to create audit records. Database-level triggers must be the primary source of truth for lot data changes.

#### INSERT Rules

When a new lot is created:

- Record the action as `INSERT`.
- Record the authenticated user's ID.
- Record the new lot ID and lot number.
- Preserve the complete new record in `new_value`.
- Record the creation timestamp.
- Do not create a log if the transaction fails or rolls back.

#### UPDATE Rules

When an existing lot is updated:

- Record the action as `UPDATE`.
- Detect actual field-level changes using `IS DISTINCT FROM`.
- Ignore fields whose values have not changed.
- Store the previous value in `old_value`.
- Store the updated value in `new_value`.
- Store the affected column in `field_name`.
- Record the authenticated user's ID.
- Record the lot ID, lot number, and timestamp.
- Multiple changed fields may produce multiple audit entries for one update operation.

The following lot fields must be monitored:

- `lot_number`
- `polygon_id`
- `block_id`
- `dimension`
- `area`
- `cash_price`
- `promo_price`
- `status`
- `payment_type`
- `customer_id`
- `booking_date`
- `sold_date`
- `color`
- `description`
- `panorama_url`
- `panorama_boundary`

All new business-related fields added to `lots` must be evaluated and included in the audit configuration when relevant.

#### DELETE Rules

When a lot is permanently deleted:

- Record the action as `DELETE`.
- Preserve the complete deleted record in `old_value`.
- Store the deleted lot ID and lot number in `metadata`.
- Record the authenticated user's ID.
- Preserve the audit record after the original lot is deleted.
- Use `ON DELETE SET NULL` for the `lot_id` foreign key so deleting a lot does not delete its audit history.

Never cascade-delete lot audit records when deleting a lot.

### 21.3 Authenticated User Attribution

Every audit entry must identify the user responsible for the operation whenever an authenticated user context is available.

Use Supabase Auth `auth.uid()` as the authoritative source of the acting user's ID.

Rules:

- Never accept the acting user's ID directly from an untrusted frontend payload.
- Do not use a hardcoded user ID.
- Do not infer the actor from the lot owner, customer, or marketing assignment.
- Store the actor in `lot_activity_logs.user_id`.
- Resolve the actor's display name from `public.profiles` when displaying the history.
- Handle missing or deleted profiles without breaking the history display.

Operations executed through service-role credentials or background processes without a user authentication context must not be falsely attributed to an Admin. Their actor may be NULL or identified through a separately documented system-actor mechanism.

### 21.4 Excluded Transaction Events

The lot activity history must not duplicate the dedicated transaction history.

The following transaction-related events must remain in their respective transaction records and must not be presented as ordinary lot data changes:

- Booking creation and cancellation.
- Payment creation and confirmation.
- Installment payment updates.
- Sale completion.
- Transaction cancellation.
- Customer payment status changes.

If these processes update fields in `lots`, the audit implementation must distinguish transaction-driven changes from ordinary administrative edits.

Do not silently exclude all `status` changes. Preserve legitimate administrative status changes and document how transaction-driven changes are identified.

### 21.5 Panorama and Storage Audit

Each lot has one 360-degree panorama referenced by `lots.panorama_url`.

Panorama operations must be audited:

- First panorama upload.
- Panorama replacement.
- Panorama deletion.
- Panorama boundary changes.

Rules:

- A successful upload must be followed by a successful database update of `panorama_url`.
- Use a unique Storage object path when replacing a panorama so that the new file can be distinguished from the previous file.
- Record the old and new panorama references.
- Clear `panorama_url` when a panorama is removed.
- Do not delete the previous file until the database update succeeds.
- If the database update fails after uploading a new file, perform appropriate cleanup or retain the file for recovery.
- If Storage deletion fails, do not report the entire deletion workflow as successful.
- Do not assume PostgreSQL triggers on `lots` automatically detect file changes in Supabase Storage.

Storage operations must be coordinated through an application service or another explicitly implemented audit mechanism.

### 21.6 Audit Reliability and Atomicity

Audit logging must be reliable and consistent.

Rules:

- Use PostgreSQL triggers for database-level lot auditing.
- Audit insertion must occur in the same database transaction as the original lot operation.
- If audit insertion fails, the corresponding lot mutation must fail rather than silently losing the audit record.
- Do not catch and suppress audit insertion errors.
- Do not create duplicate audit entries through simultaneous frontend and database-trigger logging.
- Do not allow ordinary authenticated users to directly INSERT, UPDATE, or DELETE audit records.
- Restrict audit table access through appropriate Supabase grants and Row Level Security policies.
- Ensure trigger functions use a controlled `search_path` and appropriately restricted ownership and privileges.
- Review foreign key behavior so audit records survive lot deletion.

### 21.7 Audit History Display

The Admin lot detail page must display audit records in the `Riwayat Perubahan` tab.

The history interface must:

- Display the acting user's name.
- Display the action type.
- Display the affected field when applicable.
- Display old and new values in a human-readable format.
- Display the date and time.
- Support INSERT, UPDATE, and DELETE records.
- Display deleted lot information even when `lot_id` is NULL.
- Handle empty, loading, and error states.
- Sort records by `created_at` descending by default.

Use Indonesian labels for user-facing descriptions.

Examples:

- `Kavling LOT-001 ditambahkan`
- `Harga tunai diubah dari Rp250.000.000 menjadi Rp275.000.000`
- `Luas kavling diubah dari 120 m² menjadi 130 m²`
- `Panorama 360° diperbarui`
- `Kavling LOT-001 dihapus`

Do not display raw JSON, internal database column names, or Storage object paths directly to users.

### 21.8 Audit Data Protection

Activity audit records are historical evidence and must be treated as append-only data.

Rules:

- No ordinary application workflow may edit or delete existing audit records.
- Do not expose audit mutation operations in the frontend.
- Restrict audit history access to authorized roles.
- Do not expose sensitive customer information unnecessarily in old or new JSON values.
- Review retention and backup policies before introducing any audit cleanup mechanism.

### 21.9 Development and Verification Requirements

Before completing any feature that modifies lots, verify:

1. INSERT creates exactly one creation audit entry.
2. UPDATE records only fields that actually changed.
3. UPDATE with no actual changes creates no audit entry.
4. Multiple changed fields produce the expected field-level entries.
5. DELETE preserves the complete deleted record in audit history.
6. Audit records remain available after the original lot is deleted.
7. The correct authenticated Admin is recorded.
8. Failed database operations do not create successful audit entries.
9. Transaction-related changes are not incorrectly duplicated in `Riwayat Perubahan`.
10. Panorama upload, replacement, and deletion are handled consistently.
11. Unauthorized users cannot manipulate audit records.
12. Existing lot creation, editing, deletion, transaction, and panorama workflows continue to work.

Before modifying existing implementation:

- Inspect the existing database schema, triggers, services, and page workflows.
- Preserve existing functionality and business rules.
- Avoid duplicate triggers and duplicate audit services.
- Do not assume a field or database relationship exists without checking the actual schema.
- Run production build, TypeScript validation, and `git diff --check` after implementation.
