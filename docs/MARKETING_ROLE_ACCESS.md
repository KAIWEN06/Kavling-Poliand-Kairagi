# Hak Akses Role Marketing & Kepala Bagian Marketing

## Struktur role aktual

Database tidak memiliki kolom `department` maupun role `kepala_bagian`. Constraint
`profiles_role_check` hanya mengizinkan:

| `profiles.role` | Arti di aplikasi | Halaman awal |
|---|---|---|
| `owner` | Pemilik | `/beranda-owner` (halaman Admin) |
| `admin` | Admin operasional & keuangan | `/beranda-admin` |
| `marketing_head` | **Kepala Bagian — Departemen Marketing** | `/beranda-kepala-marketing` |
| `marketing` | Marketing | `/beranda-marketing` |
| `client` | Pembeli | `/beranda-client` |

Sesuai instruksi "sesuaikan dengan struktur aktual", Kepala Bagian Marketing memakai role
`marketing_head` yang sudah ada. **Tidak ada role baru yang dibuat.** Bila nanti perusahaan
memerlukan Kepala Bagian untuk departemen lain, lihat *Keputusan bisnis* di bawah.

## Matriks akses

| Kemampuan | Marketing | Kepala Bagian Marketing | Admin/Owner |
|---|---|---|---|
| Lihat client | Hanya miliknya (`marketing_id = uid`) | Semua client yang `marketing_id`-nya anggota tim (marketing/marketing_head) | Semua |
| Client daftar sendiri tanpa Marketing | Tidak | Tidak | Ya |
| Tambah client | Ya, otomatis atas namanya | Ya, wajib memilih anggota tim | Ya |
| Ubah data client (nama, kontak, alamat, wilayah) | Client sendiri | Client tim | Semua |
| Ubah `marketing_id` (pindah kepemilikan) | **Tidak** (trigger) | **Tidak** (trigger) | Ya |
| Ubah status perkembangan (CRM) | Client sendiri | Client tim | Ya |
| Follow-up & catatan | Client sendiri | Client tim (catatan = arahan) | Ya |
| Lihat SPK, pembayaran, jadwal cicilan, denda, pembatalan, refund | Client sendiri, baca saja | Tim, baca saja | Ya |
| Konfirmasi/tolak SPK, verifikasi pembayaran, ubah nominal/jadwal, refund | **Tidak** | **Tidak** | Ya |
| Komisi | Miliknya | Seluruh tim | Ya |
| Dokumen SPK (KTP/KK) | SPK yang ia ajukan (policy lama) | **Tidak** (data sensitif) | Ya |
| Jurnal keuangan, activity log, audit koreksi | Tidak | Tidak | Ya |

## Lapisan pengamanan

1. **RLS Supabase** — sumber kebenaran. Semua policy baru memakai helper
   `marketing_scope_allows(owner uuid)` (SECURITY DEFINER, tanpa rekursi RLS).
2. **Trigger `guard_customer_ownership`** (SECURITY INVOKER) — memaksa `marketing_id = auth.uid()`
   saat Marketing menambah client, menolak perubahan `marketing_id`, `user_id`,
   `registration_source` oleh non-admin, dan menolak nomor kontak duplikat.
3. **RPC SECURITY DEFINER** memvalidasi role pemanggil sebelum membaca data
   (`marketing_report_members`) atau menulis (`update_customer_crm_status`).
4. **Route guard** frontend (`meta.role`) hanya kenyamanan navigasi, bukan pengaman.

## Kepemilikan data (atribusi)

- Client → `customers.marketing_id`.
- SPK → `customers.marketing_id` via `spk_requests.customer_id`; bila SPK diajukan Marketing
  tanpa `customer_id`, dipakai `spk_requests.marketing_id`. SPK yang diajukan **Client**
  menyimpan uid client di `marketing_id` (default `auth.uid()`), sehingga kolom itu **tidak**
  dipakai untuk SPK Client.
- Transaksi/pembayaran/jadwal → pemilik client transaksi, fallback SPK Marketing terkait.

## Keputusan bisnis yang masih terbuka

1. **Departemen lain.** Jika kelak ada Kepala Bagian non-Marketing, perlu kolom
   `profiles.department` (atau tabel departemen) dan migrasi `marketing_head` → `kepala_bagian` +
   `department='marketing'`. Tidak dilakukan sekarang karena belum ada kebutuhan dan akan mengubah
   role produksi.
2. **Pemindahan client antar-Marketing** saat ini hanya Admin. Apakah Kepala Bagian boleh?
3. **Client self-registered** (tanpa Marketing) tidak terlihat oleh Kepala Bagian. Apakah perlu
   mekanisme penugasan lead ke Marketing?
