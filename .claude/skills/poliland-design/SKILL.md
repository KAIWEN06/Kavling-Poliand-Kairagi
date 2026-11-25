---
name: poliland-design
description: Bahasa desain PoliLand (rasa WelcomePage dan AboutPage) untuk SEMUA halaman publik dan komponen UI proyek ini. Wajib dimuat sebelum membuat atau mengubah file .vue yang terlihat pengguna. Ringkasan aturan dengan sumber lengkap di DESIGN.md.
---

# PoliLand Design

Sumber lengkap dan yang berlaku: [DESIGN.md](../../../DESIGN.md), Bagian I §12 (bahasa visual dan gerak), §13 (aturan teks), §14 (kontras). Berkas ini hanya ringkasan kerja. Bila berbeda dengan DESIGN.md, DESIGN.md yang benar; perbaiki berkas ini.

Patokan tampilan: [WelcomePage.vue](../../../src/views/WelcomePage.vue) dan [AboutPage.vue](../../../src/views/AboutPage.vue). Baca keduanya sebelum mendesain, jangan menebak dari ingatan. Layar yang terasa lebih biasa daripada keduanya belum selesai.

## Proses

1. Muat skill ini lebih dulu, lalu `ui-ux-pro-max` dan `mobile-native`. Untuk menulis atau memeriksa teks, muat `humanizer`.
2. Baca Welcome dan About. Pakai komponen bersama di bawah, jangan menulis ulang.
3. Jangan menghapus fitur, data CMS, atau rute. Ubah tampilan, bukan perilaku.
4. Hitung kontras setiap pasangan warna baru (rumus di DESIGN.md §14). Catat pasangan baru ke tabel di sana.
5. Jalankan `npx vue-tsc --noEmit`. Sebut dengan jujur apa yang belum diuji di HP asli.

## Inti visual

- Latar krem `--pl-paper`; kartu putih; panel hero, statistik, dan CTA hijau hutan dengan cahaya emas di pojok kanan atas.
- Judul serif Fraunces, naik per baris. Garis emas di bawah judul section.
- `SceneBackdrop` (matahari, bukit, garis petak) di hero, satu per layar. `solid-front="#F9F5EC"` bila hero diikuti halaman krem.
- Hijau = aksi. Emas = aksen dan tombol utama di atas panel gelap, teks `--ink`. Putih di atas emas dilarang (2,4:1).
- Bayangan dan radius hanya dari token. Tidak ada emoji.

## Gerak: bermain, tidak mengganggu

Token: `--ease-out`, `--ease-spring`, `--dur-*`. Hanya `transform`/`translate`/`opacity`.

- Masuk: judul naik per baris, paragraf dan tombol menyusul, total di bawah 1,3 detik.
- Hero saja yang boleh punya gerak ambient: `breathe` (matahari), `sway` (bukit, bawaan), `sparkle` (titik cahaya). Satu hero, satu `breathe`.
- Discroll: `ScrollReveal`. Daftar kartu: masuk berurutan 60 ms, indeks dibatasi 8, `--ease-spring`.
- Angka: `CountUp`. Bar: `scaleX` dari kiri.
- Tekan: `scale(0.97)`, lepas dengan `--ease-spring`.
- `prefers-reduced-motion`: ambient mati, masuk jadi fade pendek, konten tetap tampil.
- Dilarang: gerak berulang di daftar atau formulir, animasi pada aksi yang diulang ratusan kali, `transition: all`, `scale(0)`, animasi `width`/`height`/`top`/`left`.

## Teks

- Satu gagasan, satu tempat. Judul sudah menyebut sesuatu, jangan diulang oleh label atau paragraf di dekatnya.
- Label kecil hanya bila menambah informasi yang tidak ada di judul.
- Paragraf pembuka hero: satu kalimat, maksimal 12 kata.
- Jangan menyebut nama halaman di dalam isinya. Jangan tampilkan angka yang sama dua kali.
- Hindari pola tulisan mesin: "bukan X melainkan Y", penutup yang mengulang, tiga hal berurutan, "terdepan", "inovatif", tanda pisah (—).
- Sebelum selesai, baca layar dari atas ke bawah. Hapus teks yang bisa digabung atau dibuang tanpa kehilangan informasi.

## Kontras

- Teks biasa minimal 4,5:1; teks besar dan ikon bermakna minimal 3:1.
- Teks kecil memakai `--text-secondary` (`#5F5F66`) atau `--poliland-gold-text` (`#805708`). Jangan `#A7A7A7`, `#94a3b8`, `--text-tertiary`, atau emas `#CBA044` untuk teks.
- Di atas foto: lapisan gelap hijau, uji dengan foto paling terang. Di atas panel hijau: hanya `#FFFFFF`, `--on-forest`, atau `--poliland-gold-soft`, opasitas minimal 85%.

## Sentuh

Target 44x44px, `touch-action: manipulation`, tap highlight transparan, hover hanya di `@media (hover: hover) and (pointer: fine)`, `:active` di semua yang bisa ditekan, input 16px, `dvh`, safe area.

## Komponen bersama (`src/components/ui/`)

| Kebutuhan | Komponen |
| --- | --- |
| Matahari, bukit, garis petak, titik cahaya | `SceneBackdrop` (`breathe`, `sparkle`, `sway`, `solid-front`) |
| Kepala section | `SectionHeader` (`title`, `eyebrow` opsional, slot aksi) |
| Muncul saat discroll | `ScrollReveal` (`variant`, `delay`, `enabled`) |
| Angka naik dari 0 | `CountUp` (teks CMS bebas) |
| Masuk berurutan saat halaman dibuka | `Reveal` (`order`) |
| Rasa global | Kelas `pl-surface` pada pembungkus halaman (`src/theme/poliland-look.css`) |
| Notifikasi (DESIGN.md §12.6) | `useToast`, `useConfirm`, `AppNotice`, `useCelebration`; gaya di `src/theme/notify.css` |

## Daftar periksa

Gunakan DESIGN.md §12.5, §13, dan §14 sebagai daftar periksa akhir.
