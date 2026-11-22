# Database Schema (Audit)

## Update implementasi 22 November 2026

Migrasi ledger, refund, koreksi SPK, denda, wanprestasi, dan rekonsiliasi sudah diterapkan melalui Supabase MCP. Database aktif sekarang mencakup `financial_transactions`, `financial_journals`, `financial_journal_lines`, `purchase_cancellation_requests`, `purchase_refunds`, `spk_corrections`, `installment_penalties`, `default_reviews`, serta `bank_reconciliations`.

- `spk_corrections` mempertahankan SPK asal, membuat SPK revisi, mengalihkan satu pembayaran Booking Fee, dan mencegah pemasukan buku kas tambahan.
- `installment_penalties` menyimpan tanggal transfer tervalidasi, hari terlambat, denda Rp20.000/hari, plafon Rp1.800.000, dan pembebasan denda yang diaudit.
- `default_reviews` menandai tagihan belum lunas pada hari ke-90 untuk pemeriksaan Admin, tanpa membatalkan transaksi otomatis.
- `bank_reconciliations` memiliki satu rekonsiliasi per transaksi cash-ledger dan nomor referensi bank unik.
- `payments.transfer_date` menyimpan tanggal transfer tervalidasi terpisah dari waktu submit/verifikasi.

RPC tambahan: `correct_spk_lot`, `review_payment_with_transfer_date`, `calculate_installment_penalty`, `detect_installment_defaults`, `waive_installment_penalties_for_transaction`, dan `reconcile_bank_transaction`.

Diinspeksi melalui Supabase MCP pada 21 November 2026. Daftar ini adalah objek yang relevan dengan SPK/pembayaran yang terlihat, bukan dump penuh seluruh schema.

## Tabel dan relasi

| Tabel | Fungsi/relasi utama |
|---|---|
| `profiles` | Profil Auth dan role: owner/admin/marketing/client |
| `customers` | Data pembeli, opsional `user_id`, marketing_id |
| `lots` | Kavling, harga, status, customer dan block |
| `spk_requests` | Pengajuan SPK, customer, lot, snapshot harga, transaksi opsional |
| `spk_request_documents` | Riwayat dokumen upload per SPK |
| `spk_request_status_history`, `spk_review_activity` | Histori status dan review SPK |
| `lot_transactions` | Transaksi pembelian lot/customer |
| `installment_schedules` | Tagihan cicilan per transaksi |
| `payments` | Pembayaran aktual yang diajukan/verifikasi |
| `payment_allocations` | Alokasi payment ke jadwal cicilan |
| `payment_status_history`, `payment_proof_history` | Audit status dan pergantian bukti |
| `spk_booking_fee_reuse`, `_history` | Pemindahan/reuse pembayaran Booking Fee SPK |
| `booking_fee_refunds` | Refund khusus Booking Fee yang saat ini ada |
| `payment_correction_audits` | Audit koreksi kategori pembayaran; RLS terlihat nonaktif |
| `bank_accounts`, `payment_instructions`, `payment_plans` | Rekening, instruksi dan paket cicilan |

## Constraint/index teramati

- Unique `spk_requests.spk_number` dan `transaction_id`.
- Unique partial index mencegah SPK aktif ganda untuk `lot_id` pada status aktif yang tercakup.
- Unique `payment_allocations(payment_id, installment_schedule_id)`.
- Unique `spk_booking_fee_reuse.payment_id`.
- Unique `booking_fee_refunds.payment_id`.
- `payment_plans` memiliki unique plan name dan pasangan months/margin.
- Nominal payment/harga/jadwal umumnya integer `bigint`; beberapa snapshot SPK bertipe `numeric`.

## Fungsi dan trigger penting

RPC yang terlihat: `submit_client_payment`, `review_payment_atomically`, `admin_approve_spk_request`, `admin_reject_spk_request`, `client_reuse_spk_booking_fee`, `replace_payment_proof_atomically`, `create_admin_payment_with_allocations`, `record_booking_fee_refund`, `correct_poliland_payment_category`.

Trigger yang terlihat membuat histori SPK, mengelola review pembayaran, menjaga alokasi/jadwal, dan membuat refund Booking Fee pada penolakan SPK. Sejumlah fungsi menggunakan `SECURITY DEFINER`; seluruh fungsi tersebut harus ditinjau untuk authorization, `search_path`, dan hak EXECUTE sebelum desain ledger.

## RLS dan Storage

RLS aktif pada tabel SPK/pembayaran inti dan `booking_fee_refunds`. Private buckets: `payment-proofs`, `spk-client-private-documents`. Public buckets: `client-avatars`, `gallery`, `lot-media`, `progress`.

Risiko: policy `customers` untuk authenticated read/update dengan predicate `true`, policy baca `profiles` luas, serta RLS nonaktif pada `payment_correction_audits`. Audit policy lengkap dan perbaikannya belum dapat dilakukan karena koneksi read-only.

Supabase Security Advisor juga melaporkan dua tabel RLS aktif tanpa policy (`spk_booking_fee_reuse` dan `spk_booking_fee_reuse_history`), view `v_transaction_payment_summary` dengan SECURITY DEFINER, 16 fungsi dengan mutable search_path, tiga tabel public tanpa RLS (`activity_logs`, `customer_followups`, `payment_correction_audits`), dan SECURITY DEFINER functions yang EXECUTE-nya terpapar ke anon/authenticated. Advisor Performance melaporkan dua pasang index duplikat di `indonesia_regions`. Temuan fungsi harus ditinjau per signature karena fungsi trigger internal tidak selalu dimaksudkan sebagai RPC publik; advisor bukan bukti eksploitasi aktual.

## Entitas target yang belum ada

Tidak ditemukan cash ledger/financial transactions, jurnal dan baris jurnal, refund pembelian umum, cancellation/wanprestasi history, penalty snapshots, bank statement imports/reconciliations, atau key idempotency khusus untuk pembukuan.

## Migrasi lokal yang disiapkan

`supabase/migrations/202611210001_financial_cash_ledger.sql` menambahkan `financial_accounts`, `financial_transactions`, `financial_journals`, `financial_journal_lines`, `purchase_cancellation_requests`, dan `purchase_refunds`; RLS admin/owner/client; trigger pembukuan payment `Confirmed`; backfill pembayaran Confirmed; reversal penerimaan beralasan; pembatalan dan refund atomik; jurnal debit/kredit; dan constraint trigger yang menolak jurnal tidak seimbang saat commit. Migrasi hanya dibuat di repo, belum diterapkan atau diverifikasi pada database.

Akun kredit `2190` bersifat sementara untuk penerimaan yang belum diklasifikasikan. Migrasi tidak mengasumsikan bahwa DP/cicilan adalah pendapatan, dan perusahaan perlu memetakan akun menurut kebijakan akuntansinya sebelum mengandalkan laporan laba rugi. Pemeriksaan MCP menemukan satu pembayaran Confirmed dan referensi banknya kosong; baris itu akan masuk backfill tanpa referensi dan perlu dilengkapi saat rekonsiliasi. Tidak ditemukan nomor referensi duplikat pada pembayaran Confirmed saat audit. RPC tersedia di migrasi: `request_purchase_cancellation`, `review_purchase_cancellation`, `record_purchase_refund_payment`, dan `reverse_financial_transaction`. Bukti payout refund disimpan sebagai path ke bucket privat `payment-proofs`; halaman payout/upload belum tersedia.
