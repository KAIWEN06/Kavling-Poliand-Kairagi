-- Nomor kavling tampil tanpa awalan "LOT_": LOT_001 menjadi 001.
-- polygon_id TIDAK diubah karena dipakai untuk mencocokkan bentuk di SVG siteplan.
-- Aman dijalankan ulang.

begin;

-- Pergantian nomor massal bukan perubahan yang perlu masuk riwayat kavling.
alter table public.lots disable trigger trigger_log_lot_changes;

update public.lots
set lot_number = regexp_replace(lot_number, '^LOT[_-]?(?=[0-9])', '', 'i')
where lot_number ~* '^LOT[_-]?[0-9]';

alter table public.lots enable trigger trigger_log_lot_changes;

-- Teks yang sudah tersimpan dan masih tampil di aplikasi.
update public.notifications
set body = regexp_replace(body, '\mLOT[_-]?(?=[0-9])', '', 'g')
where body ~ '\mLOT[_-]?[0-9]';

update public.lot_activity_logs
set description = regexp_replace(description, '\mLOT[_-]?(?=[0-9])', '', 'g')
where description ~ '\mLOT[_-]?[0-9]';

update public.lot_activity_logs
set metadata = jsonb_set(
  metadata,
  '{lot_number}',
  to_jsonb(regexp_replace(metadata ->> 'lot_number', '^LOT[_-]?(?=[0-9])', '', 'i'))
)
where metadata ->> 'lot_number' ~* '^LOT[_-]?[0-9]';

commit;
