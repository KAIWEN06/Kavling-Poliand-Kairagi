---
name: poliland-design
description: Bahasa desain PoliLand (pola Beranda publik dan Beranda Admin, ringkas ala marketplace) untuk semua halaman publik, panel Admin, dan komponen UI. Wajib dimuat sebelum membuat atau mengubah file .vue yang terlihat pengguna. Cukup sendiri untuk sebagian besar tugas.
---

# PoliLand Design

Satu lembar putih, ringkas, dipandu ikon, mudah dipindai di HP. Pembeli atau admin langsung tahu apa yang ada dan di mana mengetuk tanpa membaca paragraf.

**Urutan acuan:** kode patokan > berkas ini > `perintah.txt`. Bila berbeda, ikuti kode dan sebutkan ke pengguna. Dari `DESIGN.md` yang tetap berlaku: §6.1 token gerak, §12.6 notifikasi, §13 teks, §14 kontras. Aturan visual §12.1–12.5 (latar krem, rasa Welcome) tidak berlaku untuk Beranda dan Admin.

**Cakupan:** halaman publik dan semua role di panel (patokan Admin). `WelcomePage.vue` adalah layar pembuka dengan adegannya sendiri; ubah hanya bila diminta. Halaman lain yang masih bergaya lama diubah hanya bila masuk tugas.

## Hemat token

- Berkas ini sudah memuat aturannya. Jangan membaca ulang `perintah.txt`, `DESIGN.md`, atau halaman patokan secara utuh.
- Buka hanya komponen yang akan dipakai atau ditiru, cari dulu dengan `graphify query`.
- `DESIGN.md` besar: buka hanya section yang dibutuhkan (`graphify section "<judul>"`).

| Butuh contoh | Berkas |
| --- | --- |
| Susunan halaman publik | `src/views/HomePage.vue` |
| Banner / bar info / menu / ikon | `components/home/` `HeroSection`, `StatsSection`, `HomeMenu`, `MenuIllustration` |
| Beranda role (banner polos, bar status, menu, daftar tugas) | `src/views/Admin/AdminDashboard.vue` |
| Halaman Admin lain | `src/theme/admin-look.css` |

## Dilarang

1. Meniru merek Tokopedia (warna, logo, maskot, gambar). Pola jelajahnya saja.
2. Template SaaS (hero di tengah + 3 kartu + deret logo), gradien ungu/biru, neon, warna merek baru.
3. Pita, garis tebal, atau celah abu antar-section. Pisahkan dengan ruang kosong dan judul.
4. Kotak statistik besar atau tumpukan kartu berbayangan berat.
5. UI mati: tombol, pencarian, atau menu tanpa tujuan nyata. Rute yang butuh ID tidak boleh jadi pintasan.
6. Isi karangan (harga, diskon, rating, stok, testimoni, promo). Angka dari database atau CMS.
7. Emoji atau paket ilustrasi stok. Logo, avatar, foto, atau aset luar baru: tanya dulu.
8. Pintasan keyboard atau interaksi yang hanya jalan dengan hover.
9. Menghapus fitur, kolom CMS, tombol admin, atau rute. Ubah tampilan, bukan perilaku.

## Token (pakai variabel, jangan nilai baru)

| Peran | Token |
| --- | --- |
| Halaman, header, bar, tab bar | `--surface-primary` (putih) |
| Krem | `--pl-paper`, hanya footer dan latar ilustrasi; putih memudar ke krem |
| Aksi, tab aktif, angka kunci | `--poliland-green` |
| Aksen, garis judul, tombol utama di atas foto/panel gelap | `--poliland-gold`, teks `--ink` |
| Petak ikon | `--green-50`, `--gold-50` |
| Teks | `--text-primary`, `--text-secondary`; teks emas `--poliland-gold-text` |
| Panel hijau | `--surface-forest`, teks `--on-forest` atau `--poliland-gold-soft` |
| Garis, bayangan | 1px `--border-default`; `--shadow-sm`/`md` hanya bila perlu terangkat |

Kontras minimal 4,5:1 (teks besar dan ikon bermakna 3:1). Putih di atas emas dilarang; `#CBA044` dan `--text-tertiary` bukan warna teks. Teks di atas foto wajib lapisan gelap hijau. Pasangan baru: hitung, catat di §14.

## Tipografi

`--font-display` (Fraunces): judul banner `clamp(27px, …, 38px)`, judul section, angka besar. `--font-ui` (Plus Jakarta Sans): sisanya. Isi 13–15px, label menu 12px/600, tab 11px, minimum 11px. Sentence case, tombol tanpa huruf kapital semua. Angka yang berubah pakai `tabular-nums`. Tanpa monospace.

## Pola layar

1. **Header:** putih rata, garis bawah 1px, tanpa bayangan. Publik: logo kiri, satu tombol "Masuk" kanan.
2. **Banner:** kartu membulat berjarak 12px, radius 16. Publik: foto CMS + lapisan hijau, tinggi minimal ±280px, maksimal dua tombol. Role: `--surface-forest` + cahaya emas pojok kanan atas, tanggal, sapaan, satu tombol emas.
3. **Bar angka:** satu bar berbingkai radius 12, kolom sama lebar dipisah 1px, nilai di atas label (`dl`, `column-reverse`). Bisa digeser bila item bertambah. Data belum ada: `…` atau skeleton, bukan 0. Status berwarna selalu disertai label.
4. **Menu pintasan:** `HomeMenu` (4×2, petak 56px radius 18, label satu kata bila bisa). Untuk role, kirim `items` dan `label`.
5. **Section:** lebar penuh, jarak samping 20px, `SectionHeader` (garis emas, slot "Lihat semua"). Koleksi foto/fitur digeser menyamping dengan kartu berikutnya mengintip.
6. **Beranda publik saja:** maket denah 3D (`KavlingMaket`, tanpa `ScrollReveal`), legenda, satu tombol "Lihat denah"; footer matahari dan bukit.
7. **Tab bar:** menempel rata di tepi, garis atas 1px, maksimal lima. Aktif = ikon terisi + label hijau. Tanpa pil melayang, lingkaran, atau titik memantul.

Satu gagasan tidak muncul dua kali dalam satu blok (menu pintasan boleh mengulang tujuan tab bar).

**Halaman Admin:** `ion-page` diberi `pl-admin`. Halaman daftar atau formulir satu lembar ditambah `pl-sheet` (judul serif bergaris emas 22px, bar angka, filter 44px). Pakai itu sebelum menulis CSS sendiri. Pemilih baru yang berulang ditambahkan di `admin-look.css`. Modal Ionic tidak terkena. Banner, menu, dan ilustrasi tidak wajib di halaman kerja; cukup header, judul, lalu isi.

## Komponen (pakai ulang dulu)

- `ui/`: `SectionHeader`, `ScrollReveal`, `Reveal`, `CountUp`, `SceneBackdrop`, `AppButton`, `AppInput`, `AppModal`, `AppPagination`, `PageHeader`, `StatusBadge`, `EmptyState`, `Skeleton` (`skeletons/`), `AppNotice`.
- `common/`: `AppHeader`, `MobileTabBar`. Admin CMS: `Admin/AdminEditButton`, `CmsPanelModal`.
- Notifikasi: `useToast`, `useConfirm`, `useCelebration`; jangan `window.alert/confirm` atau `ion-toast`.
- `pl-surface` pada pembungkus halaman publik.

**Ilustrasi:** SVG inline di `MenuIllustration.vue`, viewBox 48×48, datar, 2–3 nada hijau dan emas + krem dan putih (WhatsApp boleh hijau lebih tua). Objek dari bisnis ini, satu gaya dan bobot, `aria-hidden`, selalu berlabel.

## Sentuh dan keadaan

- Rancang di 360–390px dulu, tanpa gulir samping halaman.
- Target ≥44×44px, `touch-action: manipulation`, tap highlight transparan, `:focus-visible` terlihat.
- Semua yang ditekan punya `:active` (scale 0.93–0.97). Hover hanya di `@media (hover: hover) and (pointer: fine)`.
- Input 16px, `dvh`, safe area ditangani sekali, tidak ada yang tertutup tab bar.
- Loading: skeleton seukuran tata letak akhir. Kosong/gagal: apa yang terjadi + langkah berikutnya. Section tanpa data tidak menyisakan ruang. Pembaruan diam-diam mempertahankan data lama.

## Gerak

Sedikit dan bertujuan: menu masuk sekali (jeda 35ms), `ScrollReveal` per section, maket naik mengikuti gulir. Kontrol yang sering dipakai (tab, filter, input) hanya umpan balik tekan. Loop hanya pada latar adegan. Token `--ease-out`, `--ease-spring`, `--dur-*`; animasikan `transform`/`scale`/`opacity`. Dilarang `transition: all` dan `scale(0)`. `prefers-reduced-motion`: keadaan akhir atau fade pendek.

## Teks

Bahasa Indonesia, singkat, khas kavling ("Lihat denah", "Tersedia", "Dipesan", "Terjual"). Tombol berisi aksi. Tanpa slogan, pola tulisan mesin, atau tanda pisah. Judul tidak diulang oleh label atau paragraf di dekatnya. Teks dari CMS tidak diubah kode.

## Proses

1. Sebelum menulis kode, sebut singkat arah visual (warna, tipografi, tata letak) dan halaman yang dicakup. Cakupan tidak jelas: tanya.
2. Pakai ulang komponen dan token.
3. Jalankan `npx vue-tsc --noEmit` dan `npx vitest run`, cek di lebar HP, ketuk setiap kontrol baru.
4. Laporkan yang sudah diverifikasi dan yang masih perlu HP asli.
