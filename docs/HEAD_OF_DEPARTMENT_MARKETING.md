# Kepala Bagian — Departemen Marketing

Role database: `marketing_head` (lihat `MARKETING_ROLE_ACCESS.md`). Semua halaman berada di
`src/views/marketing-head/` dan dilindungi `meta.role = 'marketing_head'`; pembatasan data
ditegakkan RLS.

Tab bawah: **Beranda · Client · Perkembangan · Laporan · Lainnya**.

## Halaman

| Halaman | Route | Isi |
|---|---|---|
| Dashboard | `/beranda-kepala-marketing` | Filter Hari ini/Minggu/Bulan/Tahun/Rentang + Marketing. Kartu (semua dapat diklik): total client, client baru, belum dihubungi, proses follow-up, berminat, pengajuan, tanpa follow-up > 7 hari, SPK terkonfirmasi, kavling terjual, nilai penjualan (kontrak), pembayaran terkonfirmasi (kas), menunggu verifikasi, cicilan terlambat, komisi tim. Grafik: perkembangan client, penjualan per periode, jumlah SPK, performa Marketing, perbandingan hasil penjualan. Aktivitas terbaru. |
| Data client | `/kepala-marketing/clients` | Kolom: nama, WhatsApp, email, alamat, wilayah, Marketing, minat, metode & tenor, status perkembangan, SPK, pembayaran, terakhir follow-up. Search, filter Marketing/status/SPK/pembayaran/tanggal, pagination. |
| Detail client | `/kepala-marketing/clients/:id` | Seksi A Informasi, B Minat kavling (+panorama), C Perkembangan (riwayat + pelaku), D SPK (riwayat pemeriksaan, alasan tolak), E Pembayaran, F Jadwal (tenor, cicilan, denda, sisa), G Catatan (Marketing vs arahan Kepala Bagian), H Komisi. |
| Tambah client | `/kepala-marketing/clients/new` | Form yang sama dengan Marketing + wajib memilih Marketing penanggung jawab. |
| Monitoring perkembangan | `/kepala-marketing/perkembangan` | Client per status, filter Marketing, client tanpa follow-up (3/7/14/30 hari), aktivitas per Marketing. Ubah status & arahan dari detail client. |
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

Konfirmasi/tolak SPK, verifikasi/tolak pembayaran, ubah nominal transaksi, ubah jadwal resmi,
refund, ubah status kavling, memindahkan client antar-Marketing. Semua ditolak di database
(policy & RPC Admin memeriksa role `admin`/`owner`).

## Asal konsumen

Memakai `customers.province_name/city_name` yang diisi dari tabel `indonesia_regions`
(pemilih wilayah terstruktur). Data tanpa wilayah dikelompokkan "Belum diisi" — tidak ada
penebakan dari teks alamat. Data lama Marketing belum memiliki wilayah sehingga persentase
"Belum diisi" akan tinggi sampai dilengkapi lewat *Ubah informasi* di detail client.
