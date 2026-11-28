# Audit Database PoliLand

Acuan aturan: `DATABASE.TXT`. Sumber data: katalog database aktif (hanya SELECT) pada 28 November 2026, hasil Security Advisor, dan pencarian terarah di `src/`. Isi fungsi hanya dibaca sebagian: dari 211 fungsi, yang diperiksa adalah yang terkait temuan. Advisor Performance tidak dijalankan.

Data saat audit masih sedikit (97 kavling, 4 transaksi, 5 SPK, 11 pembayaran, 2 pembeli). Pemeriksaan "data konsisten" di bawah belum membuktikan alurnya benar.

## 1. Temuan utama: total cicilan tidak tersimpan

Satu-satunya transaksi cicilan (`lot_transactions.id = 24`):

| Nilai | Rupiah |
|---|---|
| `final_price` | 83.681.250 |
| `down_payment` | 25.104.375 |
| Jumlah 12 jadwal cicilan | 64.434.552 |
| DP + jadwal tersimpan | 89.538.927 |
| Total tagihan menurut aturan (DP + pokok + margin 10%) | 89.538.938 |
| `margin_amount`, `margin_percent`, `installment_total` | 0 |
| `plan_id` | NULL (SPK-nya memakai paket 4) |

**Aturan penjualan (dikonfirmasi):** Booking Fee di luar DP dan cicilan. Pokok = harga − DP; margin = pokok × 2,5% per 3 bulan; cicilan bulanan = (pokok + margin) ÷ tenor, dibulatkan ke bawah; sisa pembulatan masuk cicilan terakhir.

`v_transaction_payment_summary` menghitung dibayar 42.213.013, termasuk Booking Fee 1.000.000, dan menyebut sisa 41.468.237. Menurut aturan, yang sudah dibayar 41.213.013 dan sisanya **48.325.925**. Selisih 6.857.688. (Versi awal laporan ini menulis sisa 47.325.914 karena masih ikut menghitung Booking Fee.)

Penyebab:

1. `total_payment_snapshot` kosong di kelima SPK. Jalur Admin di `spkAdminService.ts` mengisinya. Dari tiga fungsi yang membuat baris SPK, hanya `correct_spk_lot` yang menyebut kolom itu; `create_client_spk_request` dan `create_marketing_spk_request` tidak.
2. `admin_approve_spk_request` menghitung `GREATEST(total - harga, 0)`. Di PostgreSQL, `GREATEST` mengabaikan NULL, sehingga hasilnya 0 tanpa error.
3. INSERT di fungsi yang sama tidak menyertakan `plan_id`. Trigger `snapshot_and_calculate_transaction` jadi tidak mengambil margin paket.
4. View memakai `final_price`, yang belum memuat margin.

**Perbaikan:** `supabase/migrations/202611300033_installment_total_obligation.sql`. Isinya trigger pengisi total pada SPK baru, perbaikan `admin_approve_spk_request`, koreksi data lama, dan view baru. `SPKAdminPage.vue` kini membulatkan cicilan ke bawah, sama dengan RPC (sebelumnya `Math.ceil`).

Migrasi 032 dan 033 sudah diterapkan. Hasil 033 pada transaksi 24 sudah dicocokkan dengan angka di atas.

**Tindak lanjut:** `calculateFinanceBalance` kini memakai total tagihan yang sama dengan view (165 tes lolos). Migrasi `202611300034_sold_requires_settlement_and_commission_base.sql` (belum dijalankan) mengatur:

- `Sold` hanya boleh bila lunas. Transaksi 24 kembali ke `Booking`, dan langkah cicilan, AJB, SHM, serta serah terimanya dibuka lagi.
- Komisi cair pada 50% total tagihan, termasuk margin, tanpa Booking Fee. Besarannya tetap: Rp500.000 bila ada Marketing; tanpa Marketing, Booking Fee Rp1.000.000 seluruhnya milik perusahaan.
- 8 skema custom kavling 070 (angka uji lama) kembali ke hitungan otomatis.

Migrasi 034 sudah diterapkan.

**Reversal:** `reverse_financial_transaction` hanya membuat baris pembalik di buku kas, sehingga pembayaran tetap `Confirmed`. Migrasi `202611300035_reversal_cancels_payment_and_reopens_sale.sql` (sudah diterapkan) memberi pembayaran itu status `Reversed`. Transaksi yang menjadi belum lunas kembali ke `Booking`, dan langkah yang mensyaratkan pelunasan dibuka lagi. Tombol **Batalkan pembayaran** (alasan wajib) ada di detail pembayaran Keuangan Admin untuk pembayaran terkonfirmasi.

**Kavling tanpa pembayaran:** kavling milik developer atau pihak lain boleh `Sold` tanpa transaksi. Ini pengecualian yang disengaja: penjaga `Sold` hanya berlaku pada `lot_transactions`, dan `lots.status` sengaja tidak dibatasi. Saat diperiksa, database belum memiliki kavling seperti itu.

**Integritas pengembalian:** migrasi `202611300036_refund_integrity_guards.sql` (belum dijalankan) menolak reversal pada pembayaran yang sudah masuk alur pengembalian; membatasi pengembalian Booking Fee pada SPK `Rejected` tanpa pembelian berjalan; mencegah fee yang sudah dikembalikan dipakai SPK lain; dan mewajibkan file bukti yang bisa dibuka pembeli. Daftar "Pengembalian dana" di halaman Pembayaran kini memuat Booking Fee dan pembatalan pembelian.

**Revisi Pesanan:** migrasi `202611300038_spk_order_revision.sql` (sudah diterapkan, bersama 037; objek, hak akses, dan hitungan pratinjau sudah diperiksa, alur simpan belum diuji) dan tombol di halaman SPK Admin, yang disembunyikan bila PPJB atau tahap sesudahnya sudah selesai atau pembelian tidak lagi `Booking`. Aturan yang disetujui: hanya sebelum PPJB selesai; kavling tetap memakai harga saat pemesanan, kavling lain memakai harga saat revisi; uang masuk dipindahkan dan kelebihan dari DP mengurangi cicilan berikutnya; Booking Fee dipindahkan penuh; pembeli menandatangani ulang dokumen fisik SPK dan tanda jadi (tahap `ttd_spk` dibuat baru). Ditolak bila uang masuk lebih kecil dari DP baru atau lebih besar dari total tagihan baru. `correct_spk_lot` dicabut hak eksekusinya.

Masih terbuka:

- Pembalikan DP tidak membuka ulang langkah PPJB yang sudah selesai. Yang dibuka lagi: cicilan, AJB, SHM, serah terima.
- Komisi yang sudah `Paid` tidak ditarik kembali bila pembayaran dibatalkan.
- Setelah data terverifikasi, tambahkan CHECK: transaksi `Installment` wajib punya `plan_id` dan `installment_total > 0`.

## 2. Entitas, relasi, dan alur akses

| Domain | Entitas inti | Relasi |
|---|---|---|
| Identitas | `profiles`, `marketing_profiles`, `customers`, `customer_identities` | `auth.users` 1–1 `profiles`; akun 1–0..1 `customers`; pembeli 1–0..1 NIK; marketing 1–N pembeli |
| Katalog | `blocks`, `lots`, `payment_plans`, `lot_installments`, `lot_highlights` | blok 1–N kavling; kavling N–M paket lewat `lot_installments` |
| Penjualan | `spk_requests` dan tabel dokumen, histori, langkah, koreksi | SPK 1–0..1 `lot_transactions` |
| Pembayaran | `installment_schedules`, `payments`, `payment_allocations` | pembayaran N–M jadwal lewat alokasi |
| Pembukuan | `financial_transactions`, `financial_journals`, `financial_journal_lines`, `financial_accounts` | transaksi kas 1–1 jurnal 1–N baris |
| Pembatalan | `purchase_cancellation_requests`, `purchase_refunds`, `default_*`, `installment_penalties` | pengajuan 1–0..1 refund |
| CRM, ulasan, konten | `customer_*`, `survey_requests`, `customer_reviews`, `review_*`, `gallery`, `faqs` | pembeli 1–N catatan dan follow-up |

| Peran | Alur akses |
|---|---|
| anon | Konten publik, kavling (kolom `customer_id` dan `booking_date` tertutup lewat GRANT), RPC publik |
| client | Baris miliknya lewat `customers.user_id`, `submitted_by`, atau `auth.uid()` |
| marketing | Pembeli dalam lingkupnya lewat `marketing_scope_allows()` |
| marketing_head | Baca luas; tulis ke data CRM diblokir trigger `block_marketing_head_writes` |
| owner | Baca; tulis ditolak trigger `block_owner_writes` (beberapa policy `ALL` masih menyebut owner) |
| admin | Kelola data; mutasi keuangan lewat RPC `SECURITY DEFINER` |

Perubahan `profiles.role` dari aplikasi ditolak trigger `guard_profile_self_write`. Perubahan `marketing_id`, `user_id`, dan `crm_status` pembeli dijaga `guard_customer_ownership`.

## 3. Kepatuhan terhadap aturan desain

| Aturan | Status | Catatan |
|---|---|---|
| Normalisasi | Sebagian | Lihat bagian 4 |
| Primary key | Sesuai pada pola umum | Identity bigint atau UUID; sebagian tabel memakai natural atau composite key |
| Uang `NUMERIC` | Menyimpang, disarankan dipertahankan | Mayoritas rupiah utuh `bigint`, eksak tanpa pecahan. Campuran dengan `numeric` ada di snapshot SPK dan `lot_news.old_price`. Seragamkan ke `bigint` saat menyentuh kolom itu |
| `TIMESTAMPTZ` | Sesuai | Tidak ada `timestamp` tanpa zona pada tabel `public` |
| FK dengan `ON DELETE`/`ON UPDATE` | Sebagian | FK tanpa klausa berperilaku `NO ACTION`. Dua aturan berisiko diperbaiki di 032. Kunci identity tidak diubah, jadi `ON UPDATE` bawaan cukup |
| RLS | Aktif di semua tabel | 10 tabel tanpa policy, artinya akses langsung ditolak |
| `updated_at` | Diperbaiki di 032 | 18 tabel belum punya trigger |
| Index FK | Diperbaiki di 032 | Banyak FK tanpa index; 6 index ganda dihapus |
| `NOT NULL` | Sebagian | 032 menutup `profiles.role` dan `lots.status`; beberapa `created_at` masih nullable |

Soft delete dan audit log: pertahankan `deleted_at` pada `customer_reviews` karena ada moderasi. Data keuangan tidak dihapus; koreksi memakai reversal (`financial_*` sudah immutable lewat trigger). Pembeli dengan riwayat dicegah terhapus oleh trigger. Konten CMS cukup `is_active`. Tabel histori dipakai untuk status SPK, pembayaran, CRM, dan kepemilikan pembeli.

## 4. Audit kepemilikan kolom dan normalisasi

**2NF.** Tidak ditemukan pelanggaran. Tabel ber-composite key (`client_favorite_lots`, `client_lot_views`, `review_helpful_votes`, `verified_phones`) hanya menyimpan atribut milik pasangan kuncinya. Hal yang sama berlaku pada composite unique di `payment_allocations`, `installment_schedules`, dan `lot_installments`.

**3NF dan BCNF.** Skema **belum** 3NF penuh:

| Kolom | Ketergantungan | Saran | Di 032 |
|---|---|---|---|
| `default_notices`, `default_reviews`: `transaction_id` | `installment_schedule_id → transaction_id` | Kunci dengan composite FK | Ya |
| `payments`: `customer_id`, `lot_id` | `transaction_id → customer_id, lot_id` (dan lewat SPK sebelum transaksi ada) | Pertahankan karena transaksi bisa NULL; kunci dengan composite FK | Ya, jalur transaksi |
| `purchase_refunds`: `transaction_id`, `customer_id` | `cancellation_request_id →` keduanya | Sama | Ya |
| `booking_fee_refunds`: `customer_id`, `spk_request_id` | `payment_id →` keduanya, perlu dipastikan untuk kasus pemakaian ulang booking fee | Periksa aturan bisnis dulu | Belum |
| `customers`: nama provinsi, kota, kecamatan, desa | `kode → nama`; kode induk bisa diturunkan dari `village_code` | Wilayah Indonesia: FK `village_code` ke `indonesia_regions(code)`. Alamat luar negeri perlu aturan sendiri | Belum |
| `lots`: `customer_id`, `booking_date`, `sold_date` | Turunan transaksi aktif | Cache yang dijaga trigger. Tidak ada selisih saat audit. Jangka panjang ganti dengan view | Belum |
| `customers`: `last_contacted_at`, `crm_status_updated_at`, `crm_status_updated_by` | Turunan follow-up dan histori CRM | Boleh sebagai cache, hanya ditulis trigger | Belum |
| `customer_reviews`: `helpful_count`, `report_count` | Hitungan tabel anak | Cache; tidak ada selisih | Belum |

**Relasi dan duplikasi tabel**

- `spk_review_activity` dan `spk_request_status_history` berbentuk sama (masing-masing 10 baris; isinya tidak dibandingkan). Bandingkan, lalu pilih satu.
- `financial_transactions.source_table` + `source_id` adalah relasi polimorfik tanpa FK. Wajar untuk ledger, tetapi integritasnya bergantung pada fungsi penulis.
- `payment_correction_audits.actor_id` tidak punya FK. `customer_note_histories` dan `customer_merge_log` juga menyimpan ID tanpa FK; ini masuk akal agar jejak bertahan setelah data asal hilang.
- Satu kavling punya paling banyak satu transaksi aktif saat audit, tetapi tidak ditemukan unique index yang menjaminnya. Pertimbangkan `unique (lot_id) where status <> 'Cancelled'` setelah memastikan alur koreksi SPK.

**Snapshot yang wajib dipertahankan:** data pembeli dan harga di `spk_requests`; `price_at_booking`, `final_price`, `months`, `margin_percent`, `monthly_payment` di `lot_transactions`; `commission_rate` dan `commission_amount`; tarif denda; rekening tujuan refund; `dropped_snapshot` pada log merge.

**Harus merujuk master:** nama wilayah pembeli, serta `customer_id` dan `lot_id` salinan di tabel turunan.

**Kandidat redundan (jangan dihapus sebelum kode dan fungsi diperiksa)**

- `spk_requests.down_payment_amount` sama dengan `down_payment_snapshot` di semua baris, tetapi masih dipakai `clientSpkService.ts` dan `ClientDetailView.vue`.
- `customer_notes.note` dan `content` (tabel masih kosong).
- `customers.address` dan `street_address`; `phone` dan `whatsapp_phone` (isinya sama saat audit, tetapi maknanya bisa berbeda).
- `installment_schedules.status = 'Overdue'` dapat dihitung dari tanggal jatuh tempo.

**Tabel gemuk dan NULL berlebih**

- `lot_transactions` mencampur Cash dan Installment. Cukup tambahkan CHECK bersyarat; tidak perlu tabel subtipe.
- `spk_process_steps` membawa empat kolom bukti yang, dari nama trigger, tampaknya terutama untuk serah terima. Pindahkan ke tabel dokumen bila langkah lain tidak memakainya.
- `payments` memuat kolom submit sekaligus review. Masih wajar karena histori sudah terpisah.

## 5. Keamanan

| Risiko | Dampak | Penanganan |
|---|---|---|
| Policy hapus bukti bayar hanya cek folder pemilik; dokumen SPK serupa | Client bisa menghapus bukti pembayaran yang sudah dikonfirmasi | 032 bagian 1 |
| Jadwal cicilan Client hanya terbaca bila SPK diajukan Client | Pembeli dari jalur Marketing atau Admin tidak bisa membaca jadwalnya langsung | 032 bagian 2 |
| `payments.lot_id` `ON DELETE CASCADE` | Hapus kavling bisa menghapus pembayaran bila tidak tertahan FK lain | 032 bagian 3 |
| `customers.user_id` `ON DELETE CASCADE` | Hapus akun mencoba menghapus data pembeli | 032 bagian 3 (`SET NULL`) |
| 16 fungsi tanpa `search_path` | Resolusi nama objek bisa dibajak | 032 bagian 8 |
| Advisor: 47 fungsi `SECURITY DEFINER` bisa dieksekusi anon, 127 oleh pengguna login | Permukaan RPC lebih luas dari perlu | 032 hanya menutup fungsi trigger dan 6 RPC. Sisanya perlu ditinjau satu per satu; angka advisor tidak membuktikan bisa dieksploitasi |
| `marketing_owner_of_*` tidak memeriksa pemanggil | Pengguna login bisa menebak ID dan melihat UUID marketing pemiliknya | Belum. Dipakai policy, jadi jangan cabut `EXECUTE`; pindahkan ke schema yang tidak diekspos |
| Klaim data pembeli berdasarkan email JWT | Aman hanya bila konfirmasi email wajib | Pastikan "Confirm email" aktif di Auth |
| Proteksi password bocor nonaktif | Password yang pernah bocor diterima | Aktifkan di Dashboard Auth ([panduan](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection)) |
| Policy menyebut role `editor`, `superadmin`, `manager` | Tidak berefek karena CHECK `profiles.role` menolaknya | Bersihkan saat policy itu disentuh |

Rujukan advisor: [RLS tanpa policy](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy), [fungsi untuk anon](https://supabase.com/docs/guides/database/database-linter?lint=0028_anon_security_definer_function_executable), [fungsi untuk pengguna login](https://supabase.com/docs/guides/database/database-linter?lint=0029_authenticated_security_definer_function_executable), [search_path](https://supabase.com/docs/guides/database/database-linter?lint=0011_function_search_path_mutable).

`docs/DATABASE_SCHEMA.md` sudah usang di bagian RLS: `payment_correction_audits`, `activity_logs`, dan `customer_followups` kini mengaktifkan RLS, dan view ringkasan memakai `security_invoker`.

## 6. Menjalankan migrasi 032

File: `supabase/migrations/202611300032_database_audit_hardening.sql`. Sudah diterapkan; daftar uji di bawah tetap berlaku. Database sudah berisi data, jadi skrip hanya mengubah yang perlu dan tidak membuat ulang tabel.

Jalankan di branch atau staging dulu bila ada, lalu uji:

1. Client mengunggah ulang bukti bayar, dan membatalkan draf SPK.
2. Client tidak bisa menghapus file bukti yang sudah tersimpan.
3. Client dari SPK jalur Marketing melihat jadwal cicilannya.
4. Admin menyetujui SPK, mengonfirmasi pembayaran, dan menggabungkan data pembeli.
5. Pengunjung tanpa login membuka siteplan, harga, dan ulasan.
6. Daftar akun baru.
7. Admin mengoreksi kavling pada SPK (`correct_spk_lot`). Alur ini dan penggabungan pembeli paling mungkin terdampak composite FK.

Pemeriksaan sebelum migrasi: tidak ada baris yang melanggar composite FK pada `payments`, `purchase_refunds`, `default_notices`, dan `default_reviews`.

Bila composite FK gagal dibuat, ada data lama yang tidak konsisten dan seluruh skrip dibatalkan.
