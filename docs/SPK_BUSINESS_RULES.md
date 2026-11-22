# Aturan Bisnis SPK

Dokumen ini mencatat kondisi aplikasi yang teramati dan target aturan dari `perintah.txt`; bagian yang belum ada tidak dianggap selesai.

## Tersedia saat audit

- Pengajuan SPK menyimpan nomor, pemohon, customer, kavling, snapshot harga, metode/skema, status, catatan, dan waktu review.
- Berkas SPK disimpan sebagai baris `spk_request_documents`; histori status tercatat terpisah.
- Admin memiliki halaman daftar/detail, review, penolakan dengan alasan/kategori, dan persetujuan.
- Pengajuan client dapat mengunggah dokumen dan dapat menggunakan ulang Booking Fee terdahulu melalui RPC khusus.
- Ada unique nomor SPK dan unique partial index untuk pemesanan aktif per kavling.

## Belum terimplementasi atau belum diverifikasi

- Koreksi kavling SPK terkonfirmasi dengan riwayat nomor lama/baru, alasan, aktor, waktu, dan pemindahan referensi pembayaran secara atomik.
- Pembatalan SPK sebelum menjadi transaksi pembelian serta koreksi kavling SPK belum terimplementasi. Alur pembatalan transaksi pembelian tersedia pada frontend dan migrasi lokal terpisah.
- Workflow status SPK dan status lot yang dipisahkan menyeluruh pada seluruh transisi.
- Penguncian transaksi yang membuktikan kondisi kavling tetap tersedia ketika dua admin mengoreksi secara bersamaan.

## Pembatalan pembelian pada migrasi lokal

Client dapat mengirim alasan pembatalan dari halaman Pembayaran. Admin dapat menyetujui atau menolak di halaman Keuangan. Persetujuan transaksi pembelian menghasilkan status Cancelled; trigger lot yang sudah ada mengembalikan lot menjadi Available. Migrasi membuat refund berdasarkan hanya pembayaran `Down Payment` dan `Installment` yang berstatus `Confirmed`; booking fee dikecualikan.

## Ketentuan target

Booking Fee adalah Rp1.000.000 per SPK, harus diverifikasi sebelum persetujuan. Persetujuan mengunci kavling sebagai dipesan dan membukukan penerimaan satu kali. Penolakan wajib mencatat alasan dan dokumen/bukti baru harus memiliki histori, bukan menimpa histori lama. Koreksi kavling tidak menarik pembayaran baru atau membuat penerimaan baru. Pembatalan tidak menghapus penerimaan Booking Fee dan hanya melepaskan lot setelah pembatalan efektif.

## Catatan ketidaksesuaian

Database saat ini memiliki `booking_fee_refunds` dan trigger refund otomatis terkait penolakan SPK; halaman Admin dapat mengunggah bukti pengembalian Booking Fee. Ini bertentangan dengan kebijakan tugas bahwa SPK tidak termasuk dasar refund dan tidak dikembalikan. Migrasi keuangan baru tidak mengubah perilaku lama ini; perubahan butuh migrasi transisi tersendiri.
