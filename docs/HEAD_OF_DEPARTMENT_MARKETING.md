# Kepala Bagian — Departemen Marketing

Role database: `marketing_head` (lihat `MARKETING_ROLE_ACCESS.md`). Semua halaman berada di
`src/views/marketing-head/` dan dilindungi `meta.role = 'marketing_head'`; pembatasan data
ditegakkan RLS.

Tab bawah: **Beranda · Client · Perkembangan · Laporan · Lainnya**.

## Halaman

| Halaman | Route | Isi |
|---|---|---|
| Dashboard | `/beranda-kepala-marketing` | Filter Hari ini/Minggu/Bulan/Tahun/Rentang + Marketing. Panel kas masuk (SPK terkonfirmasi, kavling terjual, komisi), **Perlu perhatian** (hanya yang berjumlah > 0: cicilan terlambat, tanpa follow-up > 7 hari, jatuh tempo ≤ 7 hari, SPK dan pembayaran menunggu Admin), Perjalanan klien per tahap, grafik nilai kontrak, 5 aktivitas terbaru. |
| Data client | `/kepala-marketing/clients` | Kolom: nama, WhatsApp, email, alamat, wilayah, Marketing, minat, metode & tenor, status perkembangan, SPK, pembayaran, terakhir follow-up. Search, filter Marketing/status/SPK/pembayaran/tanggal, pagination. |
| Detail client | `/kepala-marketing/clients/:id` | Baca saja, kecuali **Beri arahan** (hanya bila klien punya pemasar). Seksi A Informasi, B Minat kavling (+panorama), C Perkembangan (riwayat + pelaku), D SPK (riwayat pemeriksaan, alasan tolak), E Pembayaran, F Jadwal (tenor, cicilan, denda, sisa), G Catatan (Marketing vs arahan Kepala Bagian), H Komisi. |
| Monitoring perkembangan | `/kepala-marketing/perkembangan` | Client tanpa follow-up (3/7/14/30 hari) di atas, lalu client per status (status kosong disembunyikan), aktivitas per Marketing. Arahan diberikan dari detail client. |
| Pengajuan client (SPK) | `/kepala-marketing/spk` | Nama, Marketing, kavling, tanggal, nominal SPK, status (Menunggu/Ditolak/Terkonfirmasi), status pembayaran SPK, catatan/alasan Admin. |
| Pembayaran & cicilan | `/kepala-marketing/pembayaran` | Menunggu/terkonfirmasi/ditolak; jadwal jatuh tempo ≤ 7 hari, terlambat (hari & denda), belum jatuh tempo, lunas. |
| Laporan | `/kepala-marketing/laporan` | Tab *Statistik penjualan* (prospek, SPK, terjual, nilai kontrak, tunai vs cicilan, kas per kategori, komisi — **tiga blok terpisah**), *Asal konsumen* (client, pembeli, konversi per kab/kota), *Performa Marketing* (11 metrik + ranking). |
| Komisi tim | `/kepala-marketing/komisi` | Per Marketing: jumlah transaksi berkomisi, total, menunggu, disetujui, dibayarkan; riwayat. |
| Lainnya | `/kepala-marketing/lainnya` | Menu, batas kewenangan, siteplan (baca saja), keluar. |

## Definisi metrik (RPC `get_marketing_report`, zona waktu WITA)

| Metrik | Definisi |
|---|---|
| Total client | Semua `customers` dengan `marketing_id` anggota tim (tidak terpengaruh periode) |
| Client baru | `created_at` dalam periode |
| Status CRM | Jumlah client per `crm_status` saat ini |
| SPK terkonfirmasi | `status='Approved'` dan `approved_at` dalam periode |
| Kavling terjual | `lot_transactions` bukan `Cancelled` dengan `booking_date` dalam periode (Dipesan + Lunas) |
| Nilai penjualan | Σ `lot_transactions.final_price` transaksi di atas — **nilai kontrak, bukan kas** |
| Pembayaran terkonfirmasi | Σ `payments.amount` `status='Confirmed'`, tanggal verifikasi dalam periode — **penerimaan kas** |
| Menunggu verifikasi | Σ `payments` `Pending` — ditampilkan terpisah, bukan kas |
| Komisi | Σ `marketing_commissions.commission_amount` bukan `Cancelled`, dibuat dalam periode |
| Konversi | Client dengan transaksi aktif ÷ total client |

## Kriteria ranking performa

1. SPK terkonfirmasi pada periode (terbanyak)
2. Nilai penjualan (kontrak) pada periode
3. Persentase konversi

Jumlah client yang dimasukkan **tidak** dipakai sebagai dasar ranking.

## Yang tidak dapat dilakukan Kepala Bagian

Peran ini memantau. Sejak migrasi `202611300029`, database menolak Kepala Bagian menambah atau
mengubah klien, minat kavling, identitas, tindak lanjut, dan status perkembangan. Satu-satunya
isian yang tersisa adalah arahan ke pemasar (`customer_notes`).

Daftar klien menampilkan **semua** klien (policy `Marketing head read all`), termasuk yang
daftar sendiri dan yang didaftarkan Admin. Angka di Beranda tetap hanya klien tim pemasaran.

Konfirmasi/tolak SPK, verifikasi/tolak pembayaran, ubah nominal transaksi, ubah jadwal resmi,
refund, ubah status kavling, memindahkan client antar-Marketing. Semua ditolak di database
(policy & RPC Admin memeriksa role `admin`/`owner`).

## Asal konsumen

Mencakup **semua klien perusahaan** pada periode: lewat pemasar, lewat Admin, dan yang daftar
sendiri (migrasi `202611300028`). Bila satu pemasar dipilih di filter, hanya klien orang itu.
Periode bawaan tab ini 5 tahun terakhir. Tampilannya (`components/marketing/head/ConsumerOrigin.vue`)
berisi ringkasan per jalur dan daftar wilayah.
Tab lain (penjualan, performa) dan kartu "Total client" tetap hanya menghitung tim pemasaran.

Wilayah memakai `customers.province_name/city_name` yang diisi dari tabel `indonesia_regions`
(pemilih wilayah terstruktur). Data tanpa wilayah dikelompokkan "Belum diisi" tanpa menebak
dari teks alamat; lengkapi lewat *Ubah informasi* di detail client.

Kepala Bagian dapat membaca identitas (NIK, tempat dan tanggal lahir) klien milik timnya saja,
tanpa bisa mengubahnya.
