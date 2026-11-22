# Laporan Pengujian Modul Marketing & Kepala Bagian Marketing

Tanggal: 2026-11-23

## Ringkasan jujur

| Area | Status |
|---|---|
| Type-check (`vue-tsc --noEmit`) | **Lulus**, 0 error |
| Build produksi (`vite build`) | **Lulus** (hanya peringatan ukuran chunk yang sudah ada) |
| Unit test baru (`tests/unit/marketingModule.spec.ts`) | **Lulus** — WhatsApp, pemetaan status, periode, filter client |
| Unit test keseluruhan | 24 lulus, 1 gagal: `tests/unit/example.spec.ts` (test template lama, `document is not defined`; tidak terkait modul ini) |
| Migration database | **Belum diterapkan** — `apply_migration` ditolak; pemilik proyek menerapkan sendiri |
| Uji RLS / akses API langsung | **Belum dijalankan** — bergantung pada migration. Skrip siap: `supabase/verification/marketing_rls_checks.sql` |
| Uji UI di perangkat/browser | **Belum dijalankan** — halaman memanggil kolom & RPC yang belum ada di DB |
| SQL migration | Ditulis tanpa dieksekusi (tidak ada Postgres lokal/Docker). Mungkin ada kesalahan sintaks yang baru terlihat saat diterapkan |

Tidak ada fitur yang dinyatakan berhasil hanya karena halaman dapat dibuka.

## Langkah verifikasi setelah migration diterapkan

1. Terapkan `202611230001_...` lalu `202611230002_...`.
2. Jalankan `supabase/verification/marketing_rls_checks.sql` di SQL editor (berakhir `ROLLBACK`).
   Semua baris `lulus` harus `true`, semua NOTICE harus diawali `LULUS`.
3. Jalankan advisor keamanan Supabase; tiga peringatan "RLS disabled" seharusnya hilang.
4. Buat satu akun `marketing_head` (ubah `profiles.role` akun uji) dan lakukan uji manual di bawah.

## Skenario yang dicakup skrip verifikasi

### Role & hak akses
- Marketing A melihat client sendiri, tidak melihat client B maupun client tanpa Marketing.
- Marketing A tidak dapat mengubah client B, tidak dapat memindahkan `marketing_id`,
  insert dengan `marketing_id` orang lain dipaksa menjadi miliknya.
- Nomor kontak duplikat (format berbeda: `+62 811-…` vs `0811…`) ditolak.
- Marketing & Kepala Bagian tidak dapat mengonfirmasi pembayaran, mengonfirmasi/menolak SPK,
  mengubah jadwal cicilan, atau memanggil `admin_approve_spk_request`.
- Kepala Bagian melihat client A dan B, tidak melihat client tanpa Marketing, jurnal keuangan,
  atau activity log.
- Client hanya melihat baris customer sendiri; tidak melihat catatan internal/follow-up;
  tidak dapat membuka laporan Marketing; tidak dapat memakai cek duplikasi untuk menebak nomor.

### Sinkronisasi (perlu uji manual)
| Skenario | Cara uji |
|---|---|
| Client baru Marketing muncul di Kepala Bagian | Tambah client sebagai Marketing → buka `/kepala-marketing/clients` |
| Perubahan perkembangan terlihat di kedua halaman | Ubah status sebagai Marketing → cek riwayat di detail Kepala Bagian (pelaku & waktu tercatat) |
| Perubahan SPK oleh Admin terlihat | Admin setujui/tolak SPK client milik Marketing → cek `/marketing/pengajuan` & `/kepala-marketing/spk`, dan notifikasi |
| Pembayaran dikonfirmasi Admin | Admin verifikasi → status & "Pembayaran terkonfirmasi" di dashboard berubah |
| Jadwal cicilan konsisten | Bandingkan tab Jadwal detail client dengan `PembayaranClientPage` & Admin (sumber sama `installment_schedules`) |
| Komisi konsisten | Admin mencatat `marketing_commissions` → tampil di Komisi Saya & Komisi Tim |

### Fungsionalitas (perlu uji manual)
Pencarian, filter, pagination daftar client; tambah client (termasuk wilayah & duplikasi);
edit client; ubah status; follow-up; catatan/arahan; tombol WhatsApp (nomor kosong → nonaktif);
notifikasi lonceng; statistik & grafik (tooltip, "Lihat tabel"); komisi.

## Masalah yang belum terselesaikan

1. Migration & RLS belum diterapkan/diuji (lihat atas).
2. Form SPK Marketing (`/marketing/spk`) memakai bucket `spk-documents` yang tidak ada dan tidak
   membuat pembayaran Booking Fee → pengajuan dari Marketing tidak dapat disetujui Admin.
   Tidak diubah karena menyangkut alur keuangan; butuh keputusan bisnis.
3. Aturan komisi belum ada; tabel `marketing_commissions` kosong dan tidak ada pengisi otomatis.
4. Route Client (`/beranda-client`, `/client/*`) tidak memiliki `meta.requiresAuth`/role
   (sudah begitu sebelumnya). Data tetap dilindungi RLS, tetapi halaman dapat dibuka tanpa login.
5. Notifikasi tidak memiliki status "sudah dibaca" (tidak ada tabel notifikasi).
6. `graphify update .` (CLAUDE.md) tidak dapat dijalankan: CLI `graphify` tidak terpasang.
7. Filter & pagination daftar client dilakukan di klien setelah RLS membatasi baris; untuk ribuan
   client sebaiknya dipindah ke query server.
