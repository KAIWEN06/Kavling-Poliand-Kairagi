# Alur Keuangan

## Alur saat ini yang teramati

1. Client membuat SPK dan mengunggah dokumen/bukti; RPC membuat pembayaran Booking Fee atau memindahkan Booking Fee lama.
2. Admin menyetujui/menolak SPK dan pembayaran melalui RPC.
3. Client mengajukan pembayaran DP/cicilan; `submit_client_payment` membuat payment dan alokasi jadwal.
4. `review_payment_atomically` memverifikasi atau menolak pembayaran dan histori menyimpan review.
5. Ringkasan laporan kas memakai `financial_transactions` sebagai sumber angka; pembayaran dan alokasi tetap dipakai untuk rincian kewajiban, bukan dijumlahkan lagi sebagai arus kas.
6. Refund Booking Fee hanya dibukukan setelah transfer: RPC memperbarui status refund, menyimpan waktu transfer WITA, referensi opsional, dan bukti, lalu membuat satu outflow serta jurnal debit 2190/kredit 1010 dalam transaksi yang sama.

## Fitur lanjutan yang belum tersedia

Rekonsiliasi bank harus mencocokkan mutasi aktual dan ledger tanpa menulis ulang nominal. Belum ada alur pembebasan denda/wanprestasi, administrasi payout refund di UI, atau pencatatan pengeluaran operasional.

## Buku kas dan jurnal

Migrasi `202611210001_financial_cash_ledger.sql` menyiapkan buku kas append-only untuk pembayaran terkonfirmasi, jurnal berpasangan, validasi keseimbangan saat commit, idempotency per pembayaran, backfill pembayaran lama, serta RPC reversal Admin dengan alasan. Halaman Admin Keuangan menampilkan 200 entri terbaru pada tampilan buku kas.

Migration lanjutan `20261121144615_booking_fee_refund_ledger.sql` menambahkan referensi bank opsional dan mengganti `record_booking_fee_refund` agar transfer Booking Fee tercatat atomik ke status refund, buku kas, dan jurnal. Idempotency key `booking-fee-refund:<id>` serta unique source key mencegah pencatatan kedua. Backfill hanya mengambil refund `Refunded`, memeriksa pembayaran masuk, bukti Storage, dan nominal, lalu membuat transaksi/jurnal yang belum ada tanpa mengisi referensi bank yang tidak tersedia.

Laporan ringkasan memfilter tanggal `occurred_on` pada ledger, termasuk tanggal transfer refund yang disimpan dalam zona Asia/Makassar. Metrik memisahkan pemasukan bruto, pengeluaran refund, total pengeluaran, dan arus kas bersih. Tren dan PDF menggunakan sumber, periode, serta definisi yang sama. Pengembalian pembelian akibat pembatalan tetap memakai alur `purchase_refunds` tersendiri.

Migration di atas hanya disiapkan secara lokal dan belum dijalankan pada database remote. Audit MCP read-only pada 21 November 2026 menemukan satu refund Booking Fee Rp1.000.000 berstatus `Refunded`, dengan objek bukti tersedia dan pemasukan awal Rp1.000.000 tetap `Confirmed`/posted. Outflow dan jurnal refund belum ada saat audit. Referensi bank refund tidak tersedia, jadi tetap `NULL` dan transaksi ini memerlukan rekonsiliasi terhadap mutasi bank. `refunded_at` historis adalah waktu yang tercatat sistem; audit ini tidak dapat memastikan waktu transfer aktual dari mutasi bank.

## Prinsip konsistensi

- `payments` = klaim/transfer client; `payment_allocations` = penggunaan transfer; cash ledger = arus kas aktual. Ketiganya tidak boleh dijumlahkan sebagai tiga pemasukan.
- Booking Fee tidak masuk dasar refund pembelian, tetapi pengembalian Booking Fee akibat SPK ditolak tetap dicatat sebagai pengeluaran tersendiri.
- Refund yang disetujui tetapi belum dibayar adalah kewajiban, bukan arus kas keluar.
- Koreksi menggunakan reversal yang tertaut ke entri asli.
- Lock row dan unique constraints dibutuhkan untuk race condition; validasi frontend tidak cukup.
