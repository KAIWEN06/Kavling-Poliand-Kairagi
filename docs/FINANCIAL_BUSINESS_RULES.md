# Aturan Bisnis Keuangan

## Implementasi yang ditemukan

Halaman `AdminKeuangan.vue` mengelola review bukti pembayaran, laporan, rekening pembayaran, skema cicilan, serta refund khusus Booking Fee SPK yang ditolak. `payments` dan `payment_allocations` menjadi sumber data utama yang dibaca frontend. `booking_fee_refunds` merekam status/bukti pengembalian Booking Fee dengan unique payment ID.

## Migrasi lokal yang disiapkan

Migrasi `202611210001_financial_cash_ledger.sql` menyiapkan ledger immutable dan jurnal debit/kredit seimbang untuk pembayaran terkonfirmasi, termasuk idempotency, backfill, serta reversal beralasan. Migrasi juga menyediakan pengajuan pembatalan client, review Admin, pelepasan lot, dan kewajiban refund 50% dari DP serta cicilan terkonfirmasi. Booking Fee dan denda tidak masuk perhitungan refund. Migrasi belum dijalankan pada database.

Frontend sudah menyediakan daftar ledger dan alur pengajuan/review pembatalan. RPC pencatatan payout refund tersedia di SQL, tetapi halaman payout, upload/preview bukti, dan reversal UI belum dibuat. Import/matching mutasi bank dan laporan tanpa batas 200 transaksi juga belum tersedia.

## Kebijakan target untuk implementasi lanjutan

- Pembukuan harus satu kali per sumber transaksi dan idempotent.
- Penerimaan aktual baru dicatat setelah verifikasi; refund menjadi pengeluaran hanya setelah transfer benar-benar dilakukan.
- Refund = 50% pembayaran DP dan cicilan yang terkonfirmasi; Booking Fee dan denda dikecualikan.
- Koreksi transaksi yang sudah tercatat memakai reversal yang tertaut, bukan edit/hapus histori.
- Jurnal harus seimbang sebelum commit. Rekonsiliasi menandai selisih, tidak mengubah nominal otomatis.
- Cash flow bersih bukan laba; klasifikasi akuntansi DP/penerimaan penjualan perlu keputusan perusahaan.

Fitur di atas baru aktif setelah migrasi dijalankan pada database.
