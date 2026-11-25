# PoliLand Kairagi — Design System & Implementation Specification

Dokumen terpadu ini menggabungkan dua dokumen sumber:

1. **Design System** — prinsip desain, arah visual, token, ergonomi, komponen, dan standar UX.
2. **Implementation Specification** — kondisi implementasi yang tercatat, API komponen, aturan migrasi, temuan audit, dan persyaratan integritas data.

> **Catatan penggunaan:** Jika terdapat perbedaan antara rekomendasi desain dan kondisi implementasi aktual, keduanya dipertahankan sesuai konteksnya. Bagian Design System menjelaskan standar/pedoman desain, sedangkan bagian Implementation Specification menjelaskan kondisi dan kontrak implementasi yang tercatat. Jangan menganggap rekomendasi sebagai fitur yang sudah diterapkan.

> **Patokan tampilan:** `WelcomePage.vue` dan `AboutPage.vue`. Semua halaman publik harus terasa satu keluarga dengan keduanya. Aturannya ada di Bagian I §12 (bahasa visual dan gerak), §13 (aturan teks), dan §14 (kontras terverifikasi).

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

- **60% Warna Dominan (Netral/Permukaan)**: Latar belakang hangat (`#FAF9F6` di Light Mode; halaman publik memakai krem `#F9F5EC` / `--pl-paper`) dan permukaan kartu bersih (`#FFFFFF`) untuk kenyamanan baca jangka panjang.
- **30% Warna Sekunder (Permukaan Lembut & Struktur)**: Permukaan sekunder (`#F5F3EE`), garis batas halus (`#EAE7E0`), dan teks sekunder (`#5F5F66`) untuk membedakan hierarki kartu dan bento grid.
- **10% Warna Aksen Tegas (Brand & CTA)**: Hijau PoliLand (`#355A2C`) untuk tombol aksi utama dan indikator aktif, serta Emas PoliLand (`#CBA044`) sebagai aksen visual/lencana (_badge_).

### 3.2 Brand & Semantic Tokens (Light & Dark Mode)

| Kategori            | Token                  | Light Mode | Dark Mode (Rekomendasi) | Penggunaan Utama                        |
| :------------------ | :--------------------- | :--------- | :---------------------- | :-------------------------------------- |
| **Brand Primary**   | `--poliland-green`     | `#355A2C`  | `#5C8D4E`               | Tombol utama (CTA), ikon aktif, fokus   |
| **Brand Accent**    | `--poliland-gold`      | `#CBA044`  | `#DFB863`               | Aksen grafis, highlight promo, lencana  |
| **Gold Soft**       | `--poliland-gold-soft` | `#F4D69A`  | `#3D3118`               | Latar lembut sorotan/badge              |
| **Gold Text**       | `--poliland-gold-text` | `#805708`  | `#F4D69A`               | Teks aksen emas (5,9:1 di krem, lolos AA) |
| **Paper**           | `--pl-paper`           | `#F9F5EC`  | `#121412`               | Latar halaman publik (krem hangat)      |
| **Forest**          | `--green-800` / `--green-900` | `#2B4824` / `#1F3519` | sama        | Panel hero, statistik, dan CTA bergaya Welcome |
| **App Background**  | `--app-background`     | `#FAF9F6`  | `#121412`               | Latar belakang utama halaman            |
| **Surface Primary** | `--surface-primary`    | `#FFFFFF`  | `#1C1F1C`               | Kartu utama, modal, bottom sheet        |
| **Surface Muted**   | `--surface-muted`      | `#F5F3EE`  | `#262A26`               | Input field, kartu sekunder, bento tile |
| **Text Primary**    | `--text-primary`       | `#252525`  | `#F3F4F2`               | Judul dan teks utama                    |
| **Text Secondary**  | `--text-secondary`     | `#5F5F66`  | `#A3A6A0`               | Subjudul, metadata, placeholder (5,2:1 di krem gelap) |
| **Border Default**  | `--border-default`     | `#EAE7E0`  | `#323732`               | Garis pemisah dan tepi kartu            |
| **Status Success**  | `--status-success`     | `#355A2C`  | `#5C8D4E`               | Status tersedia, berhasil disimpan      |
| **Status Warning**  | `--status-warning`     | `#805708`  | `#E5B95C`               | Status _booking_ / menunggu konfirmasi  |
| **Status Danger**   | `--status-danger`      | `#D94B45`  | `#F06A65`               | Status terjual, error validasi, hapus   |

> **Aturan Kontras & Warna**:
>
> - Teks normal wajib memenuhi rasio kontras minimal **4.5:1** (WCAG AA), dan teks besar/ikon interaktif minimal **3:1**.
> - Jangan gunakan `--poliland-gold` (`#CBA044`) secara langsung untuk teks kecil di atas latar terang; gunakan `--poliland-gold-text` (`#805708`).
> - Jangan pernah menaruh teks putih di atas emas `#CBA044` (2,4:1, gagal). Di atas emas pakai `--ink` (`#1B1F1A`, 6,9:1).
> - Abu pucat seperti `#A7A7A7`, `#94a3b8`, dan `--text-tertiary` (`#8A8A90`) hanya untuk elemen dekoratif atau disabled, bukan teks yang harus dibaca.
> - Status (Tersedia, Booking, Terjual, Error) **tidak boleh hanya mengandalkan warna**—wajib disertai teks label atau ikon pendukung.

---

## 4. Typography

Dua keluarga huruf:

- **Plus Jakarta Sans** (`--font-primary`, `--font-ui`, `--font-sans`, `--ion-font-family`): semua teks antarmuka dan badan teks.
- **Fraunces Variable** (`--font-display`, serif editorial): judul halaman, judul section, dan angka besar. Weight `600–650`, `letter-spacing: -0.02em`. Jangan dipakai untuk teks badan, label, atau tombol.

### Skala Tipografi Mobile

| Peran Teks          | Ukuran        | Line-Height | Weight        | Penggunaan                                         |
| :------------------ | :------------ | :---------- | :------------ | :------------------------------------------------- |
| **Display (serif)** | `clamp(34px, 10vw, 52px)` | `1.06` | `650` | Judul hero halaman publik (Welcome, Tentang, Kontak, Galeri, Progress) |
| **Section (serif)** | `clamp(24px, 6.8vw, 30px)` | `1.12` | `650` | Judul section (`SectionHeader`, otomatis lewat `pl-surface`) |
| **Angka (serif)**   | `30px – 38px` | `1`         | `650`         | Statistik, persentase (`CountUp`)                  |
| **Display / Hero**  | `24px – 28px` | `1.25`      | `700` / `800` | Halaman internal (dashboard role): judul dan ringkasan harga/metrik |
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
   - **Transisi Halus**: Gunakan token gerak (lihat bagian 6.1): umumnya `160ms–240ms` dengan `--ease-out`, modal/bottom sheet `500ms` masuk dan `340ms` keluar, serta patuhi preferensi sistem `prefers-reduced-motion`.

---

## 6.1 Motion & Animasi

Gerak dipakai untuk memberi umpan balik, menunjukkan asal-usul elemen, atau menghindari perubahan yang terasa melompat. Bukan untuk dekorasi pada elemen yang sering dilihat.

### Token gerak (sumber tunggal: `src/theme/variables.css`)

| Token            | Nilai                          | Penggunaan                                         |
| :--------------- | :----------------------------- | :------------------------------------------------- |
| `--ease-out`     | `cubic-bezier(0.22, 1, 0.36, 1)` | Standar untuk masuk, keluar, dan hover             |
| `--ease-drawer`  | `cubic-bezier(0.32, 0.72, 0, 1)` | Modal dan sheet saat masuk                         |
| `--ease-spring`  | `cubic-bezier(0.34, 1.4, 0.64, 1)` | Momen playful: kartu masuk, lepas tekan tombol, blok `scale` saat discroll (lihat §12.3) |
| `--dur-instant`  | `90ms`                         | Umpan balik tekan (`:active`)                      |
| `--dur-fast`     | `160ms`                        | Hover, perubahan warna, chip, tooltip kecil        |
| `--dur-base`     | `240ms`                        | Dropdown, tab, transisi halaman, backdrop          |
| `--dur-slow`     | `380ms`                        | Gerak ilustratif yang jarang dilihat               |

Kode JS memakai cermin nilai yang sama di `src/utils/motionTokens.ts` (`MOTION_EASE_OUT`, `MOTION_EASE_DRAWER`). Ubah token CSS dan file ini bersamaan.

### Aturan

1. **Jangan menulis durasi atau kurva manual** (`0.2s ease`, `cubic-bezier(...)`). Pakai token di atas.
2. **Dilarang `transition: all`.** Sebut properti satu per satu.
3. **Keluar memakai `--ease-out`**, bukan `ease-in`. `ease-in` membuat awal gerak terasa lambat.
4. **Gerak hover wajib dibungkus** `@media (hover: hover) and (pointer: fine)` agar tidak menempel di layar sentuh. `:active` tidak dibungkus.
5. **Utamakan `transform` dan `opacity`.** Hindari menganimasikan `width`/`height`/`margin`/`padding` pada elemen baru.
6. **Jangan mulai dari `scale(0)`.** Gunakan `scale(0.6–0.97)` dengan `opacity: 0`.
7. **Tidak ada animasi** pada aksi lewat keyboard atau aksi yang dilakukan ratusan kali sehari.
8. **Modal selalu naik dari bawah.** `AppModal.vue` dan `src/utils/modalAnimation.ts` harus memakai durasi yang sama: masuk `500ms` (`--ease-drawer`), keluar `340ms` (`--ease-out`).
9. **Transisi halaman** dikelola oleh `src/utils/pageTransition.ts` (Ionic `navAnimation`): `240ms`, keluar `160ms`. Jangan menambah sistem transisi halaman kedua.

### Entrance bertahap: `Reveal`

`src/components/ui/Reveal.vue` memberi fade dan naik `10px` (`0.38s`, jeda `0.07s` per `order`). Aturan pemakaian:

- Bungkus **1–3 blok teratas** halaman, bukan tiap baris daftar. Header halaman = `order` 0 (atau tidak dibungkus); blok berikutnya 1, 2, 3.
- **Jangan membungkus** kontrol interaktif (pencarian, tab, chip, filter), elemen `sticky`/`absolute`/`grid-area`, atau blok yang bagian dari rantai `v-if`/`v-else`.
- Terpasang di dashboard keempat role dan halaman utama Client, Marketing, Kepala Marketing, dan Admin. Halaman dengan struktur penuh kondisi (mis. Keuangan, Pembeli, Detail Pembeli, Akun Client) belum memakainya.

### Reduced motion

Aturan global di `src/styles/main.css`: animasi dipotong ke `0.01ms`; transisi yang tersisa hanya `opacity`, `visibility`, warna, `background-color`, `border-color`, `box-shadow`, `fill`, `stroke`. Gerak posisi dan scale menjadi instan. `Reveal` tidak dianimasikan, dan komponen JS memakai `useReducedMotion()`.

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
4. **Motion**: Tidak ada `transition: all`, durasi/kurva manual, `ease-in` pada UI, atau hover bergerak tanpa `@media (hover: hover) and (pointer: fine)` (lihat bagian 6.1).
5. **Halaman publik**: Lolos daftar periksa §12.5 (rasa Welcome), §13 (teks tidak redundan), dan §14 (kontras terverifikasi).

---

## 12. Bahasa Visual Welcome (Halaman Publik)

Halaman publik (Welcome, Beranda, Siteplan, Galeri, Progress dan detailnya, Tentang, Kontak) memakai satu bahasa visual. Pengguna yang masuk dari Welcome tidak boleh merasa pindah ke aplikasi lain.

### 12.1 Unsur tetap

| Unsur | Aturan |
| :--- | :--- |
| Permukaan | Krem `--pl-paper` (`#F9F5EC`). Kartu putih `--surface-primary` di atasnya. Bukan putih atau abu dingin. |
| Panel gelap | Hero, statistik, dan CTA memakai gradasi hijau hutan (`--green-800` ke `--green-900`) dengan cahaya emas di pojok kanan atas (`radial-gradient` emas `rgba(244,214,154,.22)`). |
| Latar adegan | `SceneBackdrop`: matahari, tiga lapis bukit, garis petak kavling. Satu per hero, dan boleh di penutup halaman atau kartu CTA. Tidak di setiap kartu. |
| Peralihan | Pada hero berfoto atau hero yang diikuti halaman krem, bukit terdepan diisi warna latar (`solid-front="#F9F5EC"`) agar panel mengalir ke isi tanpa garis potong. |
| Judul | Serif Fraunces (§4). Judul hero naik per baris dari garis bawahnya (mask `overflow: hidden`, `y: 110%` ke `0`). |
| Garis judul | Garis emas 40px x 3px di bawah judul section (`SectionHeader`, atau `.heading-line` lewat `pl-surface`). |
| Aksen | Hijau = aksi dan teks penting. Emas = garis, angka di atas panel gelap, dan tombol utama di atas panel gelap (teks `--ink`). |
| Bayangan | Hanya `--shadow-sm/md/lg`. Dilarang `rgba(0,0,0,x)` abu generik. |
| Radius | `--radius-control` 12, `--radius-card` 16, `--radius-panel` 20; panel hero 24–28. |
| Ikon | SVG/ionicons. Dilarang emoji. |

### 12.2 Komponen bersama

| Kebutuhan | Komponen |
| :--- | :--- |
| Matahari, bukit, garis petak, titik cahaya | `ui/SceneBackdrop.vue` (`breathe`, `sparkle`, `sway`, `solid-front`) |
| Kepala section | `ui/SectionHeader.vue` (`title`, `eyebrow` opsional, slot aksi) |
| Muncul saat discroll | `ui/ScrollReveal.vue` (`variant` up, fade, scale; `delay`; `enabled`) |
| Angka naik dari 0 | `ui/CountUp.vue` (menerima teks CMS bebas seperti "120+", "1.200", "4,5 Ha") |
| Masuk berurutan saat halaman dibuka | `ui/Reveal.vue` (`order`) |
| Rasa global | Kelas `pl-surface` pada pembungkus halaman (`src/theme/poliland-look.css`) menyeragamkan judul `section h2`, garis emas, label, dan tombol "Lihat Semua". |

### 12.3 Gerak: bermain, tapi tidak mengganggu

Gerak boleh lebih hidup daripada dashboard, dengan batas berikut. Semua memakai token §6.1, hanya `transform`, `translate`, `scale`, dan `opacity`.

| Tingkat | Gerak | Nilai |
| :--- | :--- | :--- |
| Masuk halaman | Judul naik per baris, lalu paragraf dan tombol menyusul | `700ms` `--ease-out`, jeda `70–120ms`, total di bawah `1,3s` |
| Foto hero | Turun dari `scale(1.14)` ke `1` | `2,6s` `--ease-out` |
| Latar | Bukit naik berurutan, garis petak tergambar (`pathLength`) | `0,8s` dan `1,2s` |
| Ambient (hanya hero) | Matahari berdenyut (`breathe`), bukit belakang bergoyang 6px (`sway`), 7 titik cahaya naik (`sparkle`) | `7s`, `14–19s`, `9–12s`, berulang, `pointer-events: none` |
| Discroll | Blok muncul sekali: fade + naik 18px (`up`) atau membesar dengan pantulan (`scale`) | `480ms`; `scale` memakai `--ease-spring` untuk transform |
| Daftar kartu | Masuk berurutan, jeda `60–70ms` per kartu, indeks dibatasi 8 | `560ms` `--ease-spring` |
| Angka dan bar | `CountUp` dan bar progres tumbuh dari kiri | `0,9–1,4s`, mulai setelah judul masuk |
| Tekan | Turun ke `scale(0.97)`, lepas dengan sedikit pantulan | tekan `--dur-fast`, lepas `--dur-base` `--ease-spring` |

Batas agar tidak mengganggu:

- Gerak ambient hanya di hero dan tidak pernah di atas teks yang sedang dibaca; titik cahaya kecil (4px), redup, dan tidak menerima sentuhan.
- Satu hero, satu `breathe`. Tidak ada gerak berulang di daftar, kartu, atau formulir.
- Elemen yang dipakai ratusan kali sehari (tab bar, input, chip filter saat diganti) hanya memberi umpan balik tekan, bukan animasi masuk.
- `prefers-reduced-motion`: semua gerak ambient mati (`sparkle` disembunyikan), animasi masuk diganti fade pendek, konten tetap tampil.
- Di dalam animasi, jangan menyentuh `width`, `height`, `top`, atau `left`. Goyangan bukit memakai properti `translate` agar tidak bentrok dengan `transform` dari motion-v.

### 12.4 Sentuh (mobile native)

Target sentuh minimal 44x44px. `touch-action: manipulation` dan `-webkit-tap-highlight-color: transparent` pada kontrol. Hover hanya di `@media (hover: hover) and (pointer: fine)`. Semua yang bisa ditekan punya `:active`. Input 16px. Tinggi layar pakai `dvh`. Beri ruang bawah untuk tab bar dan `env(safe-area-inset-bottom)`.

### 12.5 Daftar periksa halaman publik

- [ ] Latar krem, bukan putih atau abu dingin.
- [ ] Hero memakai panel hijau hutan dan `SceneBackdrop`; judul serif naik per baris.
- [ ] Judul section serif dengan garis emas.
- [ ] Ada urutan masuk dan reveal saat scroll; reduced-motion ditangani.
- [ ] Setiap tombol dan kartu punya `:active`.
- [ ] Teks lolos §14; tidak ada putih di atas emas.
- [ ] Teks lolos §13: tidak ada kata atau ide yang muncul dua kali di layar yang sama.
- [ ] Tidak ada fitur, data CMS, atau rute yang hilang.
- [ ] Bila disandingkan dengan Welcome dan Tentang, layar terasa satu keluarga.

---

### 12.6 Notifikasi: satu pintu, satu gaya

| Kebutuhan | Pakai |
| --- | --- |
| Hasil aksi yang lewat sebentar (tersimpan, gagal kirim) | `useToast().success / error / warning / info(pesan, { title, duration })` |
| Pertanyaan ya/tidak sebelum aksi | `await useConfirm().confirm({ title, message, confirmText, tone })` |
| Pemberitahuan yang harus dibaca | `useConfirm().alert({ title, message })` |
| Pesan yang menetap di halaman atau formulir | `<AppNotice tone title message>`; tombol "Coba lagi" masuk ke slot |
| Aksi penting selesai (kirim SPK, kirim bukti bayar) | `useCelebration().celebrate({ title, message })` |

- Warna, radius, ukuran ikon, bayangan, jarak, dan urutan lapisan hanya diubah di `src/theme/notify.css`. Bentuk kartu ada di `AppNotice.vue`, ikon dan geraknya di `NotifyIcon.vue`.
- `tone="error"` pada dialog dipakai untuk aksi yang menghapus atau tidak bisa dibatalkan.
- Satu kejadian memakai satu saluran. Jangan menampilkan toast untuk pesan yang sudah tampil di formulir atau di layar selebrasi.
- Dilarang: `window.alert`, `window.confirm`, `alertController`, `<ion-toast>`, dan kotak pesan ber-CSS sendiri.
- Teks validasi kecil di bawah kolom input dan layar gagal muat satu halaman (`StatusIllustration`) berada di luar aturan ini.

## 13. Aturan Teks: Singkat, Tidak Redundan

Halaman dibangun dari banyak komponen, dan tiap komponen sering punya judul, label, dan deskripsi sendiri. Akibatnya kata yang sama bisa muncul dua kali di satu layar. Aturan ini mencegahnya.

1. **Satu gagasan, satu tempat.** Jika judul sudah menyebut "Kemajuan Pembangunan", jangan tambah label "Pembangunan PoliLand" di atasnya atau kalimat "Pantau perkembangan pembangunan" di bawahnya.
2. **Label kecil (eyebrow) harus menambah informasi.** Boleh bila memberi konteks yang tidak ada di judul (mis. "Dokumentasi kawasan" di atas "Galeri & Fasilitas"). Dilarang bila hanya sinonim judul ("Siapa kami" di atas "Profil Kami", "Lihat langsung" di atas "Video Profil").
3. **Paragraf pembuka hero: satu kalimat, maksimal 12 kata**, dan hanya berisi yang belum dikatakan judul. Tanpa "Kami siap membantu", "Temukan", "Nikmati", "Hadir untuk Anda".
4. **Jangan menyebut nama halaman di dalam isinya.** Tab bar dan judul sudah memberi tahu pengguna ada di mana.
5. **Satu angka, satu tempat.** Jangan tampilkan jumlah yang sama dua kali (mis. jumlah proyek di dua judul section).
6. **Tombol berisi aksi**, bukan kalimat: "Hubungi via WhatsApp", "Buka Peta", "Coba Lagi".
7. **Pesan kosong dan error: apa yang terjadi + apa yang bisa dilakukan**, satu kalimat. Contoh: "Denah belum bisa dimuat. Periksa koneksi, lalu coba lagi."
8. **Pola tulisan mesin yang dihindari** (aturan skill `humanizer`): "bukan X melainkan Y", kalimat penutup yang mengulang paragraf, tiga hal berurutan hanya agar terdengar lengkap, "terdepan", "inovatif", "solusi terbaik", tanda pisah (—) sebagai penyambung, tebal di setiap label.
9. **Cek sebelum selesai:** baca seluruh layar dari atas ke bawah. Jika dua teks berbeda bisa digabung atau satu bisa dihapus tanpa kehilangan informasi, hapus.

Teks dari CMS (isi dari Admin) tidak diedit oleh kode. Aturan ini berlaku untuk teks yang ditulis di kode, yaitu judul tetap, label, tombol, dan pesan status.

---

## 14. Kontras Terverifikasi

Rasio dihitung dengan rumus WCAG 2.x. Teks normal minimal 4,5:1, teks besar (24px, atau 19px tebal) dan ikon bermakna minimal 3:1.

| Teks | Latar | Rasio | Hasil |
| :--- | :--- | ---: | :--- |
| `--text-primary` `#252525` | krem `#F9F5EC` | 14,1 | Lolos |
| `--text-secondary` `#5F5F66` | krem gelap `#F1E8D4` | 5,2 | Lolos (nilai lama `#717178` hanya 3,98 dan 4,45) |
| `--poliland-gold-text` `#805708` | krem `#F9F5EC` | 5,9 | Lolos (nilai lama `#966A12` hanya 4,42) |
| `--poliland-gold-text` `#805708` | putih | 6,4 | Lolos |
| `--poliland-green` `#355A2C` | krem | 7,3 | Lolos |
| `--green-800` `#2B4824` | krem gelap `#F1E8D4` | 8,4 | Lolos |
| Putih `#FFFFFF` | hijau `#355A2C` | 7,9 | Lolos |
| `--poliland-gold-soft` `#F4D69A` | `--green-800` | 7,3 | Lolos |
| `--poliland-gold-soft` `#F4D69A` | `--green-900` | 9,4 | Lolos |
| `--on-forest` `#F4F1E8` | `--green-800` | 9,1 | Lolos |
| `#F4F1E8` pada 88% | `--green-800` | 7,4 | Lolos |
| `--ink` `#1B1F1A` | emas `#CBA044` | 6,9 | Lolos |
| Putih `#FFFFFF` | emas `#CBA044` | 2,4 | **Gagal. Dilarang.** |
| `#A7A7A7` / `--pl-warm-gray` | krem | sekitar 2,2 | **Gagal.** Hanya dekoratif. |
| `--text-tertiary` `#8A8A90` | putih | 3,4 | **Gagal untuk teks.** Hanya disabled. |
| Merah `#A8322D` (chip "Terjual") | `#FDF0EF` | 6,0 | Lolos (`--status-danger` `#D94B45` di latar ini hanya 4,0) |
| `--poliland-gold-text` `#805708` (chip "Dipesan") | `#FBF4E5` | 5,9 | Lolos |
| `--poliland-green` `#355A2C` (pilihan DP aktif) | `--status-success-bg` `#E8EEE4` | 6,7 | Lolos |
| `--text-secondary` `#5F5F66` | `--status-success-bg` `#E8EEE4` | 5,4 | Lolos |
| Merah `#A12C22` (peringatan DP) | putih | 7,2 | Lolos |
| `--on-forest` `#F4F1E8` (ringkasan Ajukan SPK) | `--surface-forest` `#243D1E` | 10,6 | Lolos |
| `--poliland-gold-soft` `#F4D69A` (cicilan per bulan) | `--surface-forest` `#243D1E` | 8,5 | Lolos |
| `--poliland-gold-text` `#805708` (harga kaveling) | `--gold-50` `#FBF4E4` | 5,8 | Lolos |
| `--text-secondary` `#5F5F66` | `--gold-50` `#FBF4E4` | 5,8 | Lolos |
| `--danger-text` `#A8322D` (galat, alamat kosong) | `--danger-bg` `#FBE7E6` | 5,6 | Lolos |
| `--danger-text` `#A8322D` | `--surface-muted` `#F5F3EE` | 6,0 | Lolos |
| `--poliland-green` `#355A2C` (pilihan aktif) | `--green-50` `#EEF3EA` | 7,0 | Lolos |

Aturan tambahan:

- **Teks di atas foto** harus melewati lapisan gelap bernuansa hijau (`rgba(27,40,22,.5–.9)`) dan boleh diberi `text-shadow` tipis. Uji dengan foto asli yang paling terang.
- **Teks di atas panel hijau** hanya memakai `#FFFFFF`, `--on-forest`, atau `--poliland-gold-soft`. Teks sekunder di panel gelap memakai `#F4F1E8` dengan opasitas minimal 85%.
- **Label kecil (11–12px)** memakai `--poliland-gold-text` atau `--text-secondary`, bukan emas `#CBA044`.
- **Jangan menurunkan opasitas teks** di bawah 85% di atas panel gelap; gunakan warna token, bukan `opacity: .5`.
- Tulis rasio baru ke tabel ini saat menambah pasangan warna.

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
| `--poliland-gold-text`      | `#805708` | Accessible gold text on light surfaces (5.9:1 on cream) |
| `--poliland-gold-text-soft` | `#805708` | Accessible deeper gold text on cream surfaces |

Brand gold must not be used as text by default. Gold used as text should use a gold text token and be contrast-tested.

## 6. Semantic Colors

| Function               | Token               | Current value               |
| ---------------------- | ------------------- | --------------------------- |
| Application background | `--app-background`  | `#FAF9F6`                   |
| Primary surface        | `--surface-primary` | `#FFFFFF`                   |
| Muted surface          | `--surface-muted`   | `#F5F3EE`                   |
| Primary text           | `--text-primary`    | `#252525`                   |
| Secondary text         | `--text-secondary`  | `#5F5F66`                   |
| Public page surface    | `--pl-paper`        | `#F9F5EC`                   |
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

`src/theme/variables.css` defines `--space-1` to `--space-16` (4, 8, 12, 16, 20, 24, 32, 40, 48, 64px). New code uses these tokens. Older components still contain literal pixel values; migrate them when a component is otherwise being edited, not in a separate sweep.

- Preserve current page layout and page padding when standardizing a component.
- Public pages use 16px (mobile) and 24px (from 768px) horizontal page padding.

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

`src/theme/variables.css` defines `--shadow-sm`, `--shadow-md`, and `--shadow-lg` in a dark-green tint (`rgba(31, 53, 25, ...)`), not neutral gray. New code uses these tokens. Component-local shadows remain in older components and are migrated when those components are edited.

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
  confirm-text="Simpan"
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

## 22. Motion Implementation

This section records the implemented motion system. The rules and values match Bagian I, section 6.1.

### Tokens

Defined in `src/theme/variables.css`: `--ease-out`, `--ease-in`, `--ease-drawer`, `--ease-spring`, `--dur-instant` (90ms), `--dur-fast` (160ms), `--dur-base` (240ms), `--dur-slow` (380ms). JavaScript mirrors `--ease-out` and `--ease-drawer` in `src/utils/motionTokens.ts`; both must be updated together. `--ease-in` exists but is not used for UI exits.

### Where motion lives

| Concern                | File                                                       |
| ---------------------- | ---------------------------------------------------------- |
| Page transition        | `src/utils/pageTransition.ts` (registered in `src/main.ts`) |
| Shared modal (Vue)     | `src/components/ui/AppModal.vue`                           |
| Ionic modal and sheet  | `src/utils/modalAnimation.ts` (must match `AppModal.vue`)  |
| Staggered entrance     | `src/components/ui/Reveal.vue`                             |
| Scroll reveal          | `src/components/ui/ScrollReveal.vue`                       |
| Section heading reveal | `src/components/ui/SectionHeader.vue`                      |
| Count-up numbers       | `src/components/ui/CountUp.vue`                            |
| Scene (sun, hills, sparkle) | `src/components/ui/SceneBackdrop.vue`                 |
| Reduced-motion global  | `src/styles/main.css`                                      |
| JS reduced-motion      | `src/composables/useReducedMotion.ts`                      |
| Toast                  | `src/components/ui/ToastHost.vue`                          |

### Implemented conventions

- No `transition: all`; hand-typed durations and easings on UI transitions were replaced with tokens. Loading spinners and skeleton shimmers keep their own `linear` and `ease-in-out` loops.
- Hover motion across the app is wrapped in `@media (hover: hover) and (pointer: fine)`. Mixed selectors such as `:active, :hover` are split so `:active` still applies on touch.
- Exits (toast, page leave, modal leave) use `--ease-out`.
- Modal enter is 500ms with `--ease-drawer`; leave is 340ms with `--ease-out`.
- The active tab indicator animates from `scale(0.6)`, not `scale(0)`.
- `Reveal` is used on the dashboards and on the top blocks of the main Client, Marketing, Kepala Marketing, and Admin pages (`order` starts at 1 when the page header is not wrapped).

### Known gaps

- Public pages (Home, Siteplan, Gallery, Progress and detail, About, Contact) follow Bagian I §12. The bars on the Progress list and detail pages grow with `scaleX` from the left; the bar in the Home `ProgressPreview` still animates `width` (listed below).
- Progress and chart bars still animate layout properties: `ProgressPreview.vue` (`width`), `AdminKeuangan.vue` `.chart-bar` (`height`), `BerandaClientPage.vue` `.hero__fill` (`width`), `AdminDashboard.vue` `.inv__seg` (`width`), `BerandaMarketingPage.vue` `.funnel__seg` (`flex-grow`). Converting them to `scaleX`/`scaleY` distorts rounded corners, so they are left as is.
- `SearchBox.vue` and `MobileTabBar.vue` (`.icon-wrap`) animate `width`, `height`, or `padding`.
- `Reveal` is not applied to pages whose top level is a `v-if`/`v-else` chain: SPK Client, Akun Client, Detail Kaveling, Keuangan, Pembeli, Detail Pembeli, Reviews, Akses Tim, Tinjau SPK, Profile, Settings, Tambah Calon Pembeli, Tindak Lanjut.
- Motion feel has not been checked on a physical device.

### Review tooling

Motion audits use the project skills in `.claude/skills/`: `find-animation-opportunities`, `improve-animations`, and `review-animations`. Run `review-animations` on any change that touches motion.
