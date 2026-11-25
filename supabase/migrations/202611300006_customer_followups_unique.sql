-- ---------------------------------------------------------------------
-- Cegah follow-up kembar.
-- Tombol "Simpan follow-up" dulu menyimpan baris baru setiap diklik walau
-- isinya sama. Aplikasi sudah mengecek sebelum insert, tapi dua perangkat
-- yang menyimpan bersamaan masih bisa lolos. Unique index ini menguncinya
-- di database.
--
-- Kunci duplikat (harus sama dengan assertFollowupNotDuplicate di
-- src/services/marketing/customerFollowupService.ts):
--   customer_id, user_id, followup_date, method, status, notes,
--   next_followup_date
-- notes di-hash (md5) agar catatan panjang tidak melampaui batas ukuran
-- entri btree. NULL dan string kosong dianggap sama.
-- ---------------------------------------------------------------------

begin;

-- 1. Hapus duplikat yang sudah ada. Baris paling awal (id terkecil) dipertahankan.
--    Tidak ada tabel lain yang mereferensikan customer_followups.id.
delete from public.customer_followups f
using public.customer_followups keep
where keep.id < f.id
  and keep.customer_id = f.customer_id
  and keep.user_id is not distinct from f.user_id
  and keep.followup_date = f.followup_date
  and keep.method = f.method
  and keep.status = f.status
  and md5(coalesce(keep.notes, '')) = md5(coalesce(f.notes, ''))
  and coalesce(keep.next_followup_date, 'infinity'::date) = coalesce(f.next_followup_date, 'infinity'::date);

-- 2. Unique index.
create unique index if not exists customer_followups_no_duplicate_uidx
  on public.customer_followups (
    customer_id,
    user_id,
    followup_date,
    method,
    status,
    md5(coalesce(notes, '')),
    coalesce(next_followup_date, 'infinity'::date)
  );

commit;
