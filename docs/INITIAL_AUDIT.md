# Audit Awal PoliLand Kairagi

Tanggal audit: 21 November 2026. Sumber database: Supabase MCP untuk project `ewiundofcsxghkkhremp`; hanya inspeksi baca. MCP URL project disetel `read_only=true`.

## Ringkasan

Project sebenarnya menggunakan Vue 3, TypeScript, Ionic Vue, Vue Router, Vite, dan Supabase JS. Struktur SPK dan pembayaran sudah cukup matang untuk pengajuan, verifikasi, unggah ulang bukti, alokasi cicilan, histori, dan penggunaan ulang Booking Fee. Modul keuangan yang ada berpusat pada tinjauan bukti pembayaran serta laporan dari tabel pembayaran. Audit tidak menemukan sistem cash ledger, jurnal double-entry, rekonsiliasi mutasi bank, pembatalan pembelian dan refund umum 50%, atau proses wanprestasi 90 hari.

## Source code

- Routes memakai `src/router/index.ts`; akses role diatur di router guards. Halaman Admin tersedia untuk SPK, detail/review SPK, pembayaran dan keuangan. Halaman Client tersedia untuk SPK serta pembayaran.
- Integrasi Supabase berada di `src/services/config/supabase.ts`. Alur SPK memakai `clientSpkService.ts` dan `Admin/spkAdminService.ts`; pembayaran memakai `Finance/paymentService.ts` dan RPC; halaman utama berada di `src/views/Admin/AdminKeuangan.vue`, `src/views/Admin/SPKAdminPage.vue`, `src/views/client/SPKClientPage.vue`, dan `src/views/client/PembayaranClientPage.vue`.
- UI menggunakan komponen Ionic serta komponen bersama seperti `AppModal`, `AppButton`, `AppHeader`, dan `MobileTabBar`. Halaman yang diperiksa memiliki status loading/error/empty pada alur utama.
- Tipe uang pada service adalah integer rupiah, meski sejumlah snapshot SPK disimpan sebagai `numeric`.
- Kalkulator cicilan lokal memasukkan margin berdasarkan tenor (2,5% per 3 bulan) dan menyesuaikan cicilan terakhir. Ini tidak identik dengan aturan tugas yang menyebut sisa harga dibagi tenor tanpa margin; sumber kebijakan harga/margin perlu dipastikan sebelum diseragamkan.

## Skema database teramati

Tabel inti: `profiles`, `customers`, `lots`, `spk_requests`, `spk_request_documents`, `spk_request_status_history`, `spk_review_activity`, `lot_transactions`, `installment_schedules`, `payments`, `payment_allocations`, `payment_status_history`, `payment_proof_history`, `payment_plans`, `spk_booking_fee_reuse`, `spk_booking_fee_reuse_history`, `booking_fee_refunds`, `bank_accounts`, dan `payment_correction_audits`.

Relasi penting: SPK mengacu ke customer, lot, dan opsional transaksi; transaksi mengacu ke lot/customer; pembayaran mengacu ke customer/lot/transaksi dan dapat mengacu ke SPK; alokasi pembayaran menghubungkan pembayaran ke jadwal cicilan; riwayat status/bukti mengacu ke pembayaran. `spk_requests.spk_number`, hubungan `transaction_id`, reusable booking fee per payment, payment allocation per payment+j jadwal, dan booking fee refund per payment memiliki unique index. Terdapat unique partial index untuk mencegah lebih dari satu SPK aktif pada kavling tertentu.

Nilai uang utama seperti `payments.amount`, `lots.cash_price`, `spk_requests.lot_price_snapshot`, serta jadwal cicilan menggunakan `bigint`; beberapa nilai snapshot SPK menggunakan `numeric`.

Storage buckets relevan: `payment-proofs` dan `spk-client-private-documents` bersifat private. Bucket profil, galeri, media kavling, dan progres bersifat public.

## RPC, trigger, dan RLS teramati

RPC tersedia antara lain `admin_approve_spk_request`, `admin_reject_spk_request`, `client_reuse_spk_booking_fee`, `submit_client_payment`, `review_payment_atomically`, `replace_payment_proof_atomically`, `create_admin_payment_with_allocations`, `record_booking_fee_refund`, dan fungsi koreksi kategori pembayaran. Beberapa fungsi berstatus `SECURITY DEFINER`; fungsi tersebut perlu review authorization dan grant secara individual.

Trigger mencatat histori perubahan status SPK dan pembayaran, mengelola reuse fee/refund Booking, mengawal pembayaran dan alokasi, serta menyinkronkan jadwal cicilan.

RLS aktif pada tabel inti SPK, pembayaran, alokasi, refund booking, customer, lot, dan profile. Namun policy yang terbaca mencakup `authenticated can read customers` dan `authenticated can update customers` dengan predicate `true`; policy tersebut secara efektif memberi semua user terautentikasi akses luas atas customer dan bertentangan dengan batas akses per-owner. `profiles` juga memiliki policy baca authenticated `true`. `payment_correction_audits` teramati tanpa RLS aktif. Ini perlu ditinjau dan diperbaiki melalui migrasi setelah akses tulis tersedia.

## Risiko dan selisih terhadap permintaan

1. Alur refund saat ini khusus Booking Fee yang ditolak, bukan refund 50% dari DP+cicilan setelah pembatalan. Ini bertentangan dengan aturan bahwa Booking Fee tidak dikembalikan.
2. Tabel ledger, jurnal double-entry, rekonsiliasi bank, pembatalan transaksi, refund umum, dan histori wanprestasi tidak ditemukan.
3. `payment_correction_audits` tidak memiliki RLS aktif menurut katalog saat audit.
4. Policy customer/profile yang terlalu luas perlu dikunci sebelum mengklaim isolasi data antar-client.
5. Frontend menampilkan data finansial berdasarkan payments/status; belum terbukti ada sumber cash flow tunggal yang mencegah penghitungan ganda.
6. Perhitungan cicilan lokal memasukkan margin; aturan tugas mencontohkan perhitungan pokok tanpa margin. Kebijakan harga harus disepakati/dikonfirmasi di backend sebelum mengubah angka historis.
7. RPC `SECURITY DEFINER` dan trigger finansial telah ada, namun audit ini belum menjalankan skenario concurrency/rollback dan belum mengaudit semua isi function secara line-by-line.

## Perubahan yang diperlukan

Sebelum implementasi database: review dan ketatkan RLS, tentukan kebijakan margin dan klasifikasi akuntansi, lalu desain ledger/journal/refund/cancellation/reconciliation yang idempotent dengan migration kompatibel. Tambahkan RPC atomik koreksi SPK, pembatalan, persetujuan refund, dan pembukuan satu kali. Implementasi UI baru sesudah kontrak database tersebut diverifikasi.

Tidak ada perubahan database dibuat karena endpoint MCP project secara eksplisit read-only. Audit tidak mengklaim migrasi atau verifikasi tulis telah dilakukan.
