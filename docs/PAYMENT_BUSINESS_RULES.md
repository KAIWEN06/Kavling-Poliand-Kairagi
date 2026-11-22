# Aturan Bisnis Pembayaran

## Kondisi aplikasi saat audit

- `payments` menyimpan nominal integer rupiah, kategori, tanggal, referensi, bukti, status, pemeriksa, dan kaitan customer/lot/transaksi/SPK.
- `payment_allocations` menghubungkan satu payment ke satu atau lebih jadwal cicilan. Terdapat unique index per pasangan payment+j jadwal.
- Histori perubahan status dan bukti disimpan pada `payment_status_history` dan `payment_proof_history`.
- Client mengajukan pembayaran melalui RPC `submit_client_payment`; Admin meninjau melalui `review_payment_atomically`. Ada histori unggah ulang bukti.
- Kebijakan status di aplikasi menggunakan `Pending`, `Rejected`, `Confirmed`, dan `Needs Reupload`.

## Aturan target

Booking Fee Rp1.000.000 dicatat terpisah. DP diselesaikan sebelum cicilan. Cicilan gabungan harus terdiri dari jadwal berurutan yang belum lunas; jumlah pembayaran sama dengan total alokasi; satu transfer memiliki satu bukti. Pembayaran hanya menjadi penerimaan aktual setelah verifikasi dan pembukuan idempotent. Transfer date yang sudah divalidasi bank, bukan waktu review admin, menjadi dasar denda. Denda Rp20.000 per hari mulai H+1, maksimum Rp1.800.000 per tagihan.

`src/services/payment/paymentCalculator.ts` kini menyediakan `calculateLatePenalty(dueDate, validatedTransferDate)` yang menghitung hari kalender dari tanggal ISO, mengembalikan denda maksimal, dan menandai pemeriksaan wanprestasi mulai 90 hari. Fungsi menerima tanggal transfer yang sudah divalidasi; ia tidak memvalidasi mutasi bank atau menyimpan snapshot denda. Karena backend belum menyimpan tanggal transfer tervalidasi, fungsi ini belum disambungkan ke angka tagihan client.

## Celah

- Belum ada bukti teramati bahwa referensi bank unik global dan telah direkonsiliasi.
- Belum ada tabel/layanan denda yang menyimpan snapshot kalkulasi dan tanggal transfer tervalidasi.
- Belum ada ledger sebagai satu-satunya sumber penerimaan aktual; status `Confirmed` masih menjadi dasar ringkasan di beberapa kalkulator frontend.
- Kebijakan margin cicilan yang berjalan berbeda dengan rumus sederhana dalam permintaan; jangan mengubah transaksi historis tanpa kebijakan migrasi.
