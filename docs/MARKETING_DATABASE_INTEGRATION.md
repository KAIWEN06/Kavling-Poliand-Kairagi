# Integrasi Database Modul Marketing

> **Status:** migration ditulis tetapi **belum diterapkan** ke database. Penerapan via MCP
> ditolak; pemilik proyek memilih menerapkannya sendiri. Frontend baru bergantung pada
> migration ini — terapkan berurutan sebelum deploy.

| Urutan | File | Isi |
|---|---|---|
| 1 | `supabase/migrations/202611230001_marketing_scope_and_rls.sql` | Kolom CRM, tabel riwayat CRM, helper scope, trigger, pengetatan RLS |
| 2 | `supabase/migrations/202611230002_marketing_reports_notifications.sql` | RPC laporan, aktivitas, notifikasi, ubah status CRM |
| Verifikasi | `supabase/verification/marketing_rls_checks.sql` | Uji RLS per role dalam transaksi `ROLLBACK` |

## Tabel yang dipakai (tidak ada sistem transaksi terpisah)

| Kebutuhan | Tabel aktual |
|---|---|
| Client | `customers` (+ wilayah terstruktur `province_*`, `city_*` dari `indonesia_regions`) |
| Minat kavling, rencana metode & tenor | `customer_interests` (+ `lots`, `blocks`, `payment_plans`) |
| Follow-up | `customer_followups` |
| Catatan Marketing & arahan Kepala Bagian | `customer_notes` (pembeda: role `created_by`, kategori "Arahan Kepala Bagian") |
| SPK & riwayat pemeriksaan | `spk_requests`, `spk_request_status_history` |
| Transaksi resmi | `lot_transactions` |
| Pembayaran & riwayat verifikasi | `payments`, `payment_status_history` |
| Jadwal cicilan resmi & denda | `installment_schedules`, `installment_penalties` |
| Pembatalan & refund | `purchase_cancellation_requests`, `purchase_refunds` |
| Komisi | `marketing_commissions` |

## Perubahan skema (migration 1)

- `customers`: `crm_status` (default `Baru`, CHECK 10 status), `crm_status_updated_at`,
  `crm_status_updated_by`, `last_contacted_at`. Status CRM **terpisah** dari status SPK
  dan pembayaran.
- Tabel baru `customer_crm_status_history` (siapa, kapan, dari → ke, catatan). Tidak ada tabel
  lain yang menyimpan riwayat status perkembangan, jadi tidak duplikat.
- Default `customer_notes.created_by` dan `customer_followups.user_id` = `auth.uid()`
  (sebelumnya catatan Admin tersimpan tanpa penulis).
- Index pada `customers.marketing_id`, `crm_status`, `customer_followups`, `spk_requests.customer_id`,
  `lot_transactions.customer_id`.

Status follow-up lama (`customer_followups.status`: Follow Up, Tertarik, …) **dipertahankan**
sebagai "hasil komunikasi" per kontak, bukan status pipeline.

## Fungsi & trigger baru

| Nama | Jenis | Fungsi |
|---|---|---|
| `is_marketing_head()` | helper | Apakah pemanggil Kepala Bagian Marketing |
| `is_marketing_team_member(uuid)` | helper | Profil ber-role marketing/marketing_head |
| `marketing_scope_allows(uuid)` | helper | Inti RLS scope Marketing/Kepala |
| `marketing_owner_of_customer/spk/transaction/payment` | helper | Atribusi data ke Marketing |
| `normalize_id_phone(text)` | helper | Normalisasi nomor ke `62…` |
| `customer_contact_exists(...)` | RPC | Cek duplikasi nomor (hanya staf; tidak membocorkan data) |
| `guard_customer_ownership` | trigger | Kunci kolom kepemilikan & tolak duplikasi |
| `stamp_/log_customer_crm_status` | trigger | Cap waktu/pelaku + riwayat CRM |
| `touch_customer_last_contacted` | trigger | Follow-up memperbarui `last_contacted_at` |
| `update_customer_crm_status(id, status, note)` | RPC | Ubah status CRM dengan validasi scope |
| `marketing_report_members(uuid)` | RPC | Daftar anggota yang boleh dilaporkan untuk pemanggil |
| `get_marketing_report(from, to, marketing)` | RPC | Statistik, tren, performa, asal konsumen |
| `get_marketing_activity(marketing, limit)` | RPC | Aktivitas terbaru tim |
| `get_marketing_notifications(limit)` | RPC | Notifikasi turunan 30 hari |
| `get_marketing_head_dashboard()` | RPC (diperbaiki) | Kini hanya menghitung client tim (sebelumnya semua customer) |

## Perubahan RLS

**Ditutup (sebelumnya terlalu longgar):**

| Tabel | Sebelum | Sesudah |
|---|---|---|
| `customers` | SELECT & UPDATE `true` untuk semua user login | Admin/Owner; scope Marketing; client sendiri (+ klaim baris lama via email JWT) |
| `customer_interests` | SELECT `true` (3 policy duplikat) | Admin; client sendiri; scope Marketing (CRUD) |
| `customer_notes` | INSERT/UPDATE/DELETE/SELECT `true` | Admin; scope Marketing; ubah/hapus hanya penulis |
| `customer_note_histories` | SELECT `true` | Admin; scope Marketing |
| `customer_followups` | **RLS nonaktif** | RLS aktif; Admin; scope Marketing |
| `activity_logs` | **RLS nonaktif** | RLS aktif; hanya Admin/Owner baca |
| `payment_correction_audits` | **RLS nonaktif** | RLS aktif; hanya Admin/Owner baca |
| `payment_plans` | INSERT `with check true` | Hanya Admin/Owner |
| `lot_transactions` | Semua Marketing baca semua transaksi | Client sendiri; Admin/Owner; scope Marketing |

**Ditambahkan (baca-saja untuk scope Marketing):** `spk_requests`, `spk_request_status_history`,
`payments`, `payment_status_history`, `installment_schedules`, `installment_penalties`,
`purchase_cancellation_requests`, `purchase_refunds`; Kepala Bagian: `marketing_commissions`,
`marketing_profiles` tim.

Writer pada tabel yang RLS-nya baru diaktifkan (`log_lot_changes`, `guard_poliland_payment`,
`correct_poliland_payment_category`, dll.) sudah diperiksa: semuanya SECURITY DEFINER sehingga
tidak terpengaruh.

## Dampak ke Admin & Client yang sudah diperiksa

- Admin/Owner tetap membaca & mengubah semua client (`is_finance_admin()`); insert tetap Admin.
- `AkunClientPage` mencocokkan baris lama via email bila `user_id` masih NULL — dipertahankan
  dengan policy khusus berbasis email JWT, dan trigger mengizinkan client menautkan `user_id`
  ke dirinya sendiri sekali.
- RPC client (`create_client_spk_request`, dll.) SECURITY DEFINER → tidak terpengaruh.

## Temuan lain (tidak diubah)

- `handle_new_user()` memberi role default **`admin`** pada user baru; ditimpa trigger
  `zzzzzzzz_assign_client_role_after_signup` menjadi `client`. Aman selama urutan trigger tidak
  berubah, tetapi berisiko. Rekomendasi: ubah default ke `client`.
- Bucket `spk-documents` yang dipakai form SPK Marketing (`spkService.submitSPKRequest`) **tidak
  ada**; bucket yang ada `spk-client-private-documents`. Form SPK Marketing juga tidak membuat
  pembayaran Booking Fee, sehingga Admin tidak bisa menyetujuinya. Lihat laporan pengujian.
- Policy `lots` "Authorized role update panorama_boundary" menyebut role `manager` yang tidak ada.
- Policy `survey_requests` menyebut `kepala_bagian` (tidak ada di constraint role).
