# PoliLand — Laporan Audit UI/UX (Fase 1)

Tanggal: 2026-11-23. Audit read-only: belum ada kode aplikasi yang diubah.

## 1. Stack aktual

| Aspek | Temuan |
| --- | --- |
| Framework | **Vue 3.5 + Ionic Vue 9** (bukan React), TypeScript, Vite 8 |
| Native | Capacitor 8 (Android + iOS) |
| Styling | Tailwind CSS 4 (`@theme` hanya berisi `--font-sans`), **scoped CSS** per komponen, token CSS di `src/theme/variables.css` |
| Ikon | `ionicons` + `lucide-vue-next` (dua library ikon) |
| Font | Plus Jakarta Sans 400–800 (lokal via `@fontsource`) |
| Data | Supabase (`src/services/*`) |
| Animasi | Tidak ada library. Hanya CSS `@keyframes` (18), `<Transition>` (5), transisi bawaan Ionic |
| Komponen shadcn/Radix | **Tidak kompatibel** (React-only). `ui-styling` dipakai sebagai referensi pola, bukan paket |

Implikasi: "Framer Motion" harus diganti **Motion for Vue (`motion-v`)** atau transisi Vue + CSS. Lihat rekomendasi §6.

## 2. Skala project

- 100+ file `.vue`, ±73.000 baris.
- Halaman terbesar: `SPKMarketingPage` (5.111 baris), `AdminKeuangan` (3.272), `KavlingMarketingPage` (2.437), `SearchBox` (2.445), `DetailPanel` (2.282), `KavlingClientDetailPage` (2.173).
- Halaman sebesar itu berarti styling, markup, dan logika bercampur dalam satu file. Redesign harus per modul dan menyentuh `<template>` serta `<style>` saja, bukan `<script>`.

## 3. Rute dan role

- **Publik** (tab bar umum + `AppHeader`): Home, Siteplan, Progress, Gallery, Contact.
- **Admin / Owner**: `/beranda-admin`, `/beranda-owner`, `/admin/*` (kavling, pembeli, keuangan, SPK, konten, akses tim, siteplan).
- **Marketing**: `/beranda-marketing`, `/kavling`, `/marketing/*`.
- **Kepala Marketing** (`marketing_head`): `/beranda-kepala-marketing`, `/kepala-marketing/*`.
- **Client**: `/beranda-client`, `/client/*`.
- `MainLayout` menyembunyikan header dan tab bar umum untuk path admin/client. Tiap role membangun navigasinya sendiri.

## 4. Temuan, urut prioritas

### P0 — Fondasi tidak dipakai (akar masalah "monoton dan tidak konsisten")

| # | Temuan | Bukti |
| --- | --- | --- |
| P0-1 | **Token ada, tapi tidak ditaati.** | 2.369 pemakaian `var(--…)`, tetapi ±2.200 hex literal tersebar: client 661, marketing 398, admin 396, home 279, siteplan 224, auth 159 |
| P0-2 | **Skala tipografi tidak ada.** Token `--font-size-*` hampir tidak dipakai. | `font-size` literal: 12px×269, 10px×254, 11px×244, 13px×186, 14px×107, 9px×103, lalu 8, 15, 17, 19, 21, 22px. Total >20 ukuran berbeda. Banyak teks 8–11px (di bawah batas baca) |
| P0-3 | **Radius tidak sistematis.** Token hanya 3 (12/16/20) | Literal: 10px×85, 9px×52, 11px×24, 13px×17, 7px×14 selain 8/12/14/16/18. Satu produk memakai ±15 radius |
| P0-4 | **Shadow ad-hoc** | 99 deklarasi `box-shadow` unik. Token `--shadow-*` di DESIGN.md **tidak ada** di `variables.css` |
| P0-5 | **Token spacing tidak ada di kode** (hanya di dokumen) | `--space-*` tidak didefinisikan; spacing seluruhnya literal px |
| P0-6 | **Dark mode di dokumen, tidak diimplementasikan** | `variables.css` hanya `:root` terang |

### P1 — Komponen duplikat dan UX feedback

| # | Temuan | Bukti |
| --- | --- | --- |
| P1-1 | Komponen bersama tidak menjadi standar | `AppButton` 22 file, `AppModal` 13, `AppInput` 5, `StatCard` 5, `StatusBadge` 6, sedangkan `ion-button` 16, `ion-input` 10, `ion-select` 6 tetap dipakai mentah |
| P1-2 | Empty state dibuat ulang per halaman | 6 definisi `.empty-state` + varian `report-empty-inline`, `client-notification-empty`, `spk-lot-empty`, `panorama-empty`, `empty-box`, `empty-mascot`. Semuanya teks/ikon kecil, bukan visual kontekstual |
| P1-3 | Dua komponen status/stat paralel | `components/marketing/shared/{StatCard,StatusBadge}` terpisah dari sistem lain; Admin dan Client membuat gaya sendiri |
| P1-4 | Feedback memakai dialog bawaan browser | `confirm()` ×11, `alert()` ×4, hanya 3 pemakaian `toastController`. Tidak ada komponen Toast/Confirm sendiri |
| P1-5 | Header halaman dibuat per halaman | Hanya `AppHeader` (publik, 845 baris) yang terstandar; tiap role dan halaman membuat header sendiri. Tidak ada `PageHeader` atau breadcrumb |
| P1-6 | Tiga implementasi bottom nav | `MobileTabBar` (820 baris), `layouts/BottomNavigation.vue` (`ion-tab-bar`, label Inggris "Home/Gallery/Contact"), serta tab bar buatan sendiri di `BerandaClientPage` dan `AkunClientPage` |
| P1-7 | Ikon campur | `ionicons` + `lucide` + 43 file berisi emoji sebagai ikon di UI |
| P1-8 | `marketing-module.css` global (345 baris) | Gaya modul marketing hidup di luar komponen, berpotensi bocor |

### P2 — Responsif dan aksesibilitas

| # | Temuan | Bukti |
| --- | --- | --- |
| P2-1 | **Hanya dirancang untuk ponsel.** Desktop dan tablet belum ada | Breakpoint terbanyak `max-width:360/380/390/480`. `min-width:1024` hanya 3 kemunculan, `min-width:768` hanya 4. Tidak ada sidebar desktop; konten melebar tanpa container |
| P2-2 | Tabel data belum ada pola | Tidak ada `DataTable`. Daftar keuangan dan SPK berupa kartu vertikal, sulit dipindai pada layar lebar |
| P2-3 | Teks sangat kecil | 8–10px muncul ±390 kali; di bawah rekomendasi 12px dan ambang keterbacaan |
| P2-4 | Reduced motion tidak merata | Hanya 9 file menghormati `prefers-reduced-motion` |
| P2-5 | Safe area cukup baik | 40 file memakai `env(safe-area-inset-*)`, perlu dikonsolidasi ke token |
| P2-6 | `!important` 52× dan `z-index` sampai 1.000.000 | Tanda perang specificity dan layering tanpa skala |

### P3 — Motion

| # | Temuan |
| --- | --- |
| P3-1 | Transisi halaman hanya bawaan Ionic (slide iOS/MD), tidak ada sistem sendiri |
| P3-2 | Entrance animation tidak ada; halaman muncul sekaligus |
| P3-3 | 18 `@keyframes` tersebar, durasi dan easing berbeda-beda |
| P3-4 | Modal (`AppModal`) punya animasi sendiri; sebagian halaman memakai overlay buatan sendiri (2 definisi backdrop) |
| P3-5 | Skeleton sudah baik secara jumlah (14 file, 5 skeleton khusus) tetapi tidak berbagi komponen shimmer dasar |

## 5. Yang sudah baik (dipertahankan)

- Identitas warna hijau `#355A2C` + emas `#CBA044` dengan latar hangat `#FAF9F6`. Arah ini cocok untuk properti, tinggal disusun hierarkinya.
- Plus Jakarta Sans terbaca baik dan sudah lokal. `font-variant-numeric: tabular-nums` sudah aktif di `body`. Bagus untuk angka keuangan.
- Skeleton, `AppModal` (bottom-sheet), dan `MobileTabBar` sudah matang secara fungsi.
- Safe area dan touch target sudah dipikirkan di banyak tempat.
- Guard role di router, dan seluruh service Supabase, tidak perlu disentuh.

## 6. Rekomendasi arah (untuk disetujui sebelum Fase 2)

1. **Motion**: pakai `motion-v` (Motion for Vue) untuk orkestrasi (stagger, layout, exit modal) dan composable `useReducedMotion`. Transisi halaman memakai `<Transition>` Vue yang sederhana, bukan menimpa Ionic di semua rute.
2. **Tipografi**: pertahankan Plus Jakarta Sans sebagai teks UI (sudah terpasang, terbaca). Tambah satu font display bersifat editorial untuk judul dan angka besar, misalnya serif atau grotesk berkarakter, agar hierarki tidak monoton. Angka keuangan memakai fitur tabular.
3. **Token**: perluas `variables.css` menjadi sistem 3 lapis (primitif → semantik → komponen): skala tipe, radius (4 nilai), shadow (3), spacing (8pt), durasi/easing motion, z-index. Lalu **petakan** hex literal ke token secara bertahap per modul, bukan sekaligus.
4. **Komponen**: jadikan `components/ui` satu-satunya sumber: tambah `PageHeader`, `StatCard`, `StatusBadge`, `EmptyState` (dengan ilustrasi SVG kontekstual), `Toast`/`ConfirmDialog`, `DataTable` (tabel di desktop, kartu di ponsel), `Drawer`, `Select`, `Textarea`. Hapus duplikat di `marketing/shared`.
5. **Responsif**: tambah lapisan desktop (sidebar ≥1024px, bottom nav <1024px) tanpa menghapus UI ponsel. Ini perubahan terbesar, dikerjakan per role.
6. **Dark mode**: tidak diminta di brief. Usulan: ditunda, tapi token disiapkan agar mudah ditambah.
7. `banner-design`: tidak relevan untuk redesign UI. Dipakai hanya jika Anda ingin banner promosi atau hero (mis. di `HeroSection`).

## 7. Rencana fase dan batas risiko

| Fase | Isi | Risiko |
| --- | --- | --- |
| 2 Design system | `variables.css` diperluas, font, komponen dasar di `components/ui` | Rendah (aditif, belum mengganti halaman) |
| 3 Layout global | `AppShell` (sidebar desktop + bottom nav), `PageHeader`, container, transisi halaman | Sedang (menyentuh `MainLayout`, `MobileTabBar`) |
| 4 Dashboard | Admin → Marketing → Kepala Marketing → Client | Sedang |
| 5 Halaman fitur | Per modul: Kavling, Client/pembeli, Keuangan, SPK, Siteplan | Tinggi (file 2–5 ribu baris) |
| 6 Motion | Entrance, micro-interaction, modal/drawer, loading | Rendah–sedang |
| 7 QA | `vue-tsc`, build, uji responsif 360/768/1280, cek console dan routing | — |

Aturan keselamatan tiap fase: hanya ubah `<template>` dan `<style>` (dan impor komponen). Tanpa perubahan pada `<script>` logika, service Supabase, router, guard, atau skema DB. Build `vue-tsc && vite build` dijalankan di akhir tiap fase, dan setiap fase dikomit terpisah.
