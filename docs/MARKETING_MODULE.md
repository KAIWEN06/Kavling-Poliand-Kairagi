# Modul Marketing

Stack aktual: **Vue 3 + Ionic Vue + Tailwind 4 + Supabase** (bukan React).

## Hasil audit kode Marketing lama

| Bagian | Kondisi sebelum | Tindakan |
|---|---|---|
| `KavlingMarketingPage` | Membaca `lots` nyata, tidak mengubah status, panorama tersedia | **Dipertahankan** |
| `/siteplan` (SiteplanPage) | Sumber kavling sama dengan Admin/Client | **Dipertahankan** |
| `TambahCalonPembeli` | Tersambung DB, tetapi `createCustomer` mengirim kolom `nik` yang **tidak ada** → simpan selalu gagal; tidak ada WhatsApp, wilayah, cek duplikasi | **Diperbaiki** |
| `TindakLanjutPage` | Tersambung DB, tetapi metode `Kunjungan` & status `Terjual` **ditolak CHECK constraint**; membaca semua customer | **Diperbaiki** (konstanta = constraint DB; RLS membatasi baris) |
| `CalonPembeliMarketingPage` | **Data dummy** (`marketingProspectService`) | **Diganti** dengan `ClientListView` (data nyata) |
| `DetailCalonPembeliPage` | **Data dummy**, 4.100 baris | **Diganti** dengan `ClientDetailView` (seksi A–H) |
| `BerandaMarketingPage` | Komisi hardcoded Rp2.750.000, aktivitas contoh | **Diperbaiki**: komponen lama dipertahankan, data dari RPC |
| `AppHeader` (varian marketing) | Tombol notifikasi ke `/notifications` (404), titik merah selalu tampil | **Diperbaiki**: popover notifikasi nyata |
| `LainnyaPage` | Notifikasi ke `/marketing/notifikasi` (404) | **Diperbaiki** + menu baru |
| `SPKMarketingPage` (form pengajuan) | Upload ke bucket `spk-documents` yang **tidak ada**; tidak membuat pembayaran Booking Fee | **Tidak diubah** — butuh keputusan bisnis (lihat bawah) |
| `marketingService.ts`, `MarketingStats.vue` | File kosong | Dibiarkan |

## Fitur Marketing (setelah perbaikan)

| Fitur | Route | Sumber data |
|---|---|---|
| Dashboard (total client, per status CRM, komisi total/menunggu/dibayar, tenggat, aktivitas) | `/beranda-marketing` | `get_marketing_report`, `get_marketing_activity`, `get_marketing_notifications` |
| Pencarian kavling & siteplan & panorama | `/kavling`, `/siteplan`, `/panorama/:lotId` | `lots` (baca saja) |
| Client saya (search, filter status/SPK/pembayaran/tanggal, pagination, WhatsApp) | `/marketing/clients` | `customers` (+ relasi) |
| Tambah client (WhatsApp, wilayah asal, minat, metode, rencana tenor, cek duplikasi) | `/marketing/clients/new` | insert `customers`, `customer_interests` |
| Detail client A–H, ubah status, follow-up, catatan, edit info | `/marketing/clients/:id` | lihat `MARKETING_DATABASE_INTEGRATION.md` |
| Tindak lanjut (riwayat follow-up) | `/marketing/tindak-lanjut` | `customer_followups` |
| Status SPK + alasan penolakan + riwayat | `/marketing/pengajuan` | `spk_requests` |
| Pembayaran & jadwal cicilan resmi, denda | `/marketing/pembayaran` | `payments`, `installment_schedules`, `installment_penalties` |
| Komisi saya | `/marketing/komisi` | `marketing_commissions` |
| Notifikasi | ikon lonceng header | `get_marketing_notifications` |

Rencana tenor di form tambah client disimpan di `customer_interests.plan_id` sebagai **preferensi**,
tidak pernah dipakai untuk membuat jadwal. Jadwal hanya dibaca dari `installment_schedules` yang
dibuat `admin_approve_spk_request`.

Sisa kewajiban memakai `calculateFinanceBalance` yang sama dengan halaman Admin.

## Notifikasi

Tidak ada tabel notifikasi di database. Sistem yang sudah ada (popover Client di `AppHeader`)
menurunkan notifikasi dari data transaksi; pola yang sama dipakai untuk Marketing lewat RPC
`get_marketing_notifications`: SPK diajukan/ditinjau/terkonfirmasi/ditolak, pembayaran
diajukan/terkonfirmasi/ditolak/unggah ulang, cicilan ≤ 7 hari & terlambat, pembatalan diajukan/
diputuskan, transaksi lunas/batal (30 hari terakhir). Notifikasi tidak punya status "dibaca".

Catatan: popover Client yang ada ternyata tidak pernah meng-import `IonPopover`, sehingga tidak
tampil. Import ditambahkan — perbaikan ini juga berlaku untuk Client.

## WhatsApp

`WhatsAppButton` menormalkan nomor ke format internasional (`0812…` → `62812…`), menonaktifkan
tombol bila nomor kosong/tidak valid, membuka modal pesan awal yang dapat diubah, lalu membuka
`https://wa.me/<nomor>?text=…`. Pesan dikirim oleh Marketing dari aplikasi WhatsApp.

## Komponen reusable baru (`src/components/marketing/shared/`)

`MarketingPageLayout`, `ClientListView`, `ClientDetailView`, `SpkListView`,
`PaymentMonitorView`, `CommissionView`, `ActivityFeed`, `StatCard`, `StatusBadge`,
`PeriodFilter`, `BarChart` (dengan tooltip & tampilan tabel), `RegionSelect`, `WhatsAppButton`.
Gaya bersama: `src/styles/marketing-module.css` (token dari `theme/variables.css`).

## Keputusan bisnis yang dibutuhkan

1. **Form SPK oleh Marketing** (`/marketing/spk`): apakah Marketing boleh mengajukan SPK atas nama
   client? Jika ya, perlu bucket yang benar + pembuatan pembayaran Booking Fee mengikuti alur
   Client (`create_client_spk_request` + `create_client_spk_booking_payment`).
2. **Aturan komisi** belum terdokumentasi dan tidak ada fungsi yang mengisi `marketing_commissions`.
   Halaman hanya menampilkan data yang dicatat Admin; tidak ada persentase yang dikarang.
3. **Rollback client gagal**: jika insert minat kavling gagal setelah client tersimpan, service
   mencoba menghapus client, tetapi Marketing tidak punya izin DELETE customers. Client tetap
   tersimpan tanpa minat. Pertimbangkan RPC transaksional.
