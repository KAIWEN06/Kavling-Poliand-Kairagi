-- Pembaruan ukuran, luas, harga normal, dan keterangan 97 kavling.
-- Sumber: DATABASE.TXT (daftar harga UpdatePriceSept26).
--
-- Hanya UPDATE. Blok, polygon_id, status, promo_price, dan data pembeli tidak diubah.
-- Kavling tanpa harga di daftar (034-037) mempertahankan cash_price yang ada.
-- Perubahan cash_price membuat cicilan non-custom di lot_installments dihitung ulang
-- oleh trigger. Setiap perubahan tercatat di lot_activity_logs (nilai lama tersimpan).
-- Aman dijalankan ulang.

begin;

create temporary table price_update (
  lot_number text primary key,
  dimension text not null,
  area numeric not null,
  cash_price bigint,
  description text not null
) on commit drop;

insert into price_update (lot_number, dimension, area, cash_price, description)
values
  ('001', '11 X 13.45', 148.00, 138960000, 'Poliland Kairagi - BLOK A No. 1 (Update Jun-26)'),
  ('002', '10 X 12.7', 127.00, 116546250, 'Poliland Kairagi - BLOK A No. 2 (Update Jun-26)'),
  ('003', '10 X 17.9', 179.00, 164061250, 'Poliland Kairagi - BLOK A No. 3 (Update Jun-26)'),
  ('004', '8 X 13', 104.00, 93165000, 'Poliland Kairagi - BLOK B No. 4 (Update Jun-26)'),
  ('005', '8 X 13', 104.00, 89940000, 'Poliland Kairagi - BLOK B No. 5 (Update Jun-26)'),
  ('006', '8 X 13', 104.00, 89940000, 'Poliland Kairagi - BLOK B No. 6 (Update Jun-26)'),
  ('007', '8.2 X 13.2', 110.00, 95100000, 'Poliland Kairagi - BLOK B No. 7 (Update Jun-26)'),
  ('008', '8 X 13', 104.00, 93165000, 'Poliland Kairagi - BLOK B No. 8 (Update Jun-26)'),
  ('009', '8 X 13', 104.00, 89940000, 'Poliland Kairagi - BLOK B No. 9 (Update Jun-26)'),
  ('010', '8 X 13', 104.00, 89940000, 'Poliland Kairagi - BLOK B No. 10 (Update Jun-26)'),
  ('011', '9.5 X 13', 120.00, 103700000, 'Poliland Kairagi - BLOK B No. 11 (Update Jun-26)'),
  ('012', '8 X 12', 96.00, 81125000, 'Poliland Kairagi - BLOK C No. 12 (Update Sep-26)'),
  ('12A', '7 X 12', 84.00, 69075000, 'Poliland Kairagi - BLOK C No. 12A (Update Sep-26)'),
  ('014', '7 X 12', 84.00, 69075000, 'Poliland Kairagi - BLOK C No. 14 (Update Sep-26)'),
  ('015', '12.4 X 12', 148.00, 119825000, 'Poliland Kairagi - BLOK C No. 15 (Update Sep-26)'),
  ('016', '8 X 12', 96.00, 81375000, 'Poliland Kairagi - BLOK C No. 16 (Update Sep-26)'),
  ('017', '7 X 12', 84.00, 69075000, 'Poliland Kairagi - BLOK C No. 17 (Update Sep-26)'),
  ('018', '7 X 12', 84.00, 69075000, 'Poliland Kairagi - BLOK C No. 18 (Update Sep-26)'),
  ('019', '8.4 X 13.4', 112.00, 90800000, 'Poliland Kairagi - BLOK C No. 19 (Update Sep-26)'),
  ('020', '9 X 11', 99.00, 83681250, 'Poliland Kairagi - BLOK D No. 20 (Update Jun-26)'),
  ('021', '8 X 11', 88.00, 72150000, 'Poliland Kairagi - BLOK D No. 21 (Update Jun-26)'),
  ('022', '9 X 11.4', 103.00, 83681250, 'Poliland Kairagi - BLOK D No. 22 (Update Jun-26)'),
  ('023', '7 X 11', 77.00, 66768750, 'Poliland Kairagi - BLOK D No. 23 (Update Jun-26)'),
  ('024', '7 X 11', 77.00, 63693750, 'Poliland Kairagi - BLOK D No. 24 (Update Jun-26)'),
  ('025', '9.2 X 11', 101.00, 82143750, 'Poliland Kairagi - BLOK D No. 25 (Update Jun-26)'),
  ('026', '11 X 13.5', 148.00, 131005000, 'Poliland Kairagi - BLOK E No. 26 (Update Jun-26)'),
  ('027', '10 X 13.5', 135.00, 116600000, 'Poliland Kairagi - BLOK E No. 27 (Update Jun-26)'),
  ('028', '10 X 13.5', 135.00, 116600000, 'Poliland Kairagi - BLOK E No. 28 (Update Jun-26)'),
  ('029', '8 X 18.5', 149.00, 128640000, 'Poliland Kairagi - BLOK E No. 29 (Update Jun-26)'),
  ('030', '8 X 18.5', 149.00, 128640000, 'Poliland Kairagi - BLOK E No. 30 (Update Jun-26)'),
  ('031', '8 X 18.5', 149.00, 128640000, 'Poliland Kairagi - BLOK E No. 31 (Update Jun-26)'),
  ('032', '8 X 15.6', 125.00, 108000000, 'Poliland Kairagi - BLOK E No. 32 (Update Jun-26)'),
  ('033', '8 X 15.6', 126.00, 108860000, 'Poliland Kairagi - BLOK E No. 33 (Update Jun-26)'),
  ('034', '8.1 X 15', 122.00, null::bigint, 'Poliland Kairagi - BLOK E No. 34 (Update Jun-26)'),
  ('035', '7.8 X 15', 117.00, null::bigint, 'Poliland Kairagi - BLOK E No. 35 (Update Jun-26)'),
  ('036', '7.8 X 15', 117.00, null::bigint, 'Poliland Kairagi - BLOK E No. 36 (Update Jun-26)'),
  ('037', '8 X 19.5', 157.00, null::bigint, 'Poliland Kairagi - BLOK E No. 37 (Update Jun-26)'),
  ('038', '8.8 X 15.6', 138.00, 119180000, 'Poliland Kairagi - BLOK E No. 38 (Update Jun-26)'),
  ('039', '10 X 13.5', 135.00, 116600000, 'Poliland Kairagi - BLOK E No. 39 (Update Jun-26)'),
  ('040', '10 X 13.5', 135.00, 116600000, 'Poliland Kairagi - BLOK E No. 40 (Update Jun-26)'),
  ('041', '8.3 X 19.7', 163.00, 140680000, 'Poliland Kairagi - BLOK E No. 41 (Update Jun-26)'),
  ('042', '8.3 X 18', 150.00, 129500000, 'Poliland Kairagi - BLOK E No. 42 (Update Jun-26)'),
  ('043', '8.3 X 16.3', 136.00, 117460000, 'Poliland Kairagi - BLOK E No. 43 (Update Jun-26)'),
  ('044', '8.3 X 17.5', 145.00, 125200000, 'Poliland Kairagi - BLOK E No. 44 (Update Jun-26)'),
  ('045', '8.4 X 15.2', 128.00, 110580000, 'Poliland Kairagi - BLOK E No. 45 (Update Jun-26)'),
  ('046', '8.8 X 14.6', 130.00, 105312500, 'Poliland Kairagi - BLOK F No. 46 (Update Jun-26)'),
  ('047', '7 X 20.8', 145.00, 117406250, 'Poliland Kairagi - BLOK F No. 47 (Update Jun-26)'),
  ('048', '7 X 28.5', 199.00, 160943750, 'Poliland Kairagi - BLOK F No. 48 (Update Jun-26)'),
  ('049', '8 X 15.75', 126.00, 102087500, 'Poliland Kairagi - BLOK F No. 49 (Update Jun-26)'),
  ('050', '8 X 13.9', 111.00, 89993750, 'Poliland Kairagi - BLOK F No. 50 (Update Jun-26)'),
  ('051', '8 X 12.5', 100.00, 84450000, 'Poliland Kairagi - BLOK G No. 51 (Update Jun-26)'),
  ('052', '8 X 12.5', 100.00, 81375000, 'Poliland Kairagi - BLOK G No. 52 (Update Jun-26)'),
  ('053', '8 X 12.5', 100.00, 81375000, 'Poliland Kairagi - BLOK G No. 53 (Update Jun-26)'),
  ('054', '8 X 12.5', 100.00, 81375000, 'Poliland Kairagi - BLOK G No. 54 (Update Jun-26)'),
  ('055', '8 X 12.5', 100.00, 71125000, 'Poliland Kairagi - BLOK G No. 55 (Update Jun-26)'),
  ('056', '8 X 12.5', 100.00, 71125000, 'Poliland Kairagi - BLOK G No. 56 (Update Jun-26)'),
  ('057', '8 X 12.5', 100.00, 71125000, 'Poliland Kairagi - BLOK G No. 57 (Update Jun-26)'),
  ('058', '8 X 12.5', 100.00, 71125000, 'Poliland Kairagi - BLOK G No. 58 (Update Jun-26)'),
  ('059', '8 X 24.75', 198.00, 138852500, 'Poliland Kairagi - BLOK G No. 59 (Update Jun-26)'),
  ('060', '8 X 20.75', 166.00, 116492500, 'Poliland Kairagi - BLOK G No. 60 (Update Jun-26)'),
  ('061', '8 X 12.5', 100.00, 74200000, 'Poliland Kairagi - BLOK H No. 61 (Update Jun-26)'),
  ('062', '8 X 12.5', 100.00, 71125000, 'Poliland Kairagi - BLOK H No. 62 (Update Jun-26)'),
  ('063', '8 X 12.5', 100.00, 71125000, 'Poliland Kairagi - BLOK H No. 63 (Update Jun-26)'),
  ('064', '8 X 12.5', 100.00, 71125000, 'Poliland Kairagi - BLOK H No. 64 (Update Jun-26)'),
  ('065', '8 X 12.5', 100.00, 71125000, 'Poliland Kairagi - BLOK H No. 65 (Update Jun-26)'),
  ('066', '8 X 12.5', 100.00, 74200000, 'Poliland Kairagi - BLOK H No. 66 (Update Jun-26)'),
  ('067', '8 X 12.5', 100.00, 71125000, 'Poliland Kairagi - BLOK H No. 67 (Update Jun-26)'),
  ('068', '8 X 12.5', 100.00, 71125000, 'Poliland Kairagi - BLOK H No. 68 (Update Jun-26)'),
  ('069', '8 X 12.5', 100.00, 71125000, 'Poliland Kairagi - BLOK H No. 69 (Update Jun-26)'),
  ('070', '8 X 12.5', 100.00, 80606250, 'Poliland Kairagi - BLOK I No. 70 (Update Jun-26)'),
  ('071', '8 X 12.5', 100.00, 76250000, 'Poliland Kairagi - BLOK I No. 71 (Update Jun-26)'),
  ('072', '8 X 12.5', 100.00, 76250000, 'Poliland Kairagi - BLOK I No. 72 (Update Jun-26)'),
  ('073', '11.9 X 12', 148.00, 111870000, 'Poliland Kairagi - BLOK I No. 73 (Update Jun-26)'),
  ('074', '8 X 12.5', 100.00, 80350000, 'Poliland Kairagi - BLOK I No. 74 (Update Jun-26)'),
  ('075', '8 X 12.5', 100.00, 80350000, 'Poliland Kairagi - BLOK I No. 75 (Update Jun-26)'),
  ('076', '8 X 12.5', 100.00, 71125000, 'Poliland Kairagi - BLOK I No. 76 (Update Jun-26)'),
  ('077', '11.9 X 12', 148.00, 103915000, 'Poliland Kairagi - BLOK I No. 77 (Update Jun-26)'),
  ('078', '8 X 12.5', 100.00, 72662500, 'Poliland Kairagi - BLOK J No. 78 (Update Sep-26)'),
  ('079', '8 X 12.5', 100.00, 72662500, 'Poliland Kairagi - BLOK J No. 79 (Update Sep-26)'),
  ('080', '8 X 12.5', 100.00, 63437500, 'Poliland Kairagi - BLOK J No. 80 (Update Sep-26)'),
  ('081', '11.3 X 12', 133.00, 89703125, 'Poliland Kairagi - BLOK J No. 81 (Update Sep-26)'),
  ('082', '8 X 12.5', 100.00, 63437500, 'Poliland Kairagi - BLOK J No. 82 (Update Sep-26)'),
  ('083', '8 X 12.5', 100.00, 68562500, 'Poliland Kairagi - BLOK J No. 83 (Update Sep-26)'),
  ('084', '8 X 12.5', 100.00, 68562500, 'Poliland Kairagi - BLOK J No. 84 (Update Sep-26)'),
  ('085', '8.15 X 13.9', 114.00, 77531250, 'Poliland Kairagi - BLOK J No. 85 (Update Sep-26)'),
  ('086', '8 X 12.5', 100.00, 66512500, 'Poliland Kairagi - BLOK K No. 86 (Update Sep-26)'),
  ('087', '7 X 12.5', 88.00, 56365000, 'Poliland Kairagi - BLOK K No. 87 (Update Sep-26)'),
  ('088', '7 X 12.5', 88.00, 60875000, 'Poliland Kairagi - BLOK K No. 88 (Update Sep-26)'),
  ('089', '9 X 12', 108.00, 73687500, 'Poliland Kairagi - BLOK K No. 89 (Update Sep-26)'),
  ('090', '8 X 12.5', 100.00, 66512500, 'Poliland Kairagi - BLOK K No. 90 (Update Sep-26)'),
  ('091', '7 X 12.5', 88.00, 60875000, 'Poliland Kairagi - BLOK K No. 91 (Update Sep-26)'),
  ('092', '7 X 12.5', 88.00, 60875000, 'Poliland Kairagi - BLOK K No. 92 (Update Sep-26)'),
  ('093', '7 X 13.6', 95.00, 65359375, 'Poliland Kairagi - BLOK K No. 93 (Update Sep-26)'),
  ('094', '7 X 26.2', 161.00, 91364375, 'Poliland Kairagi - BLOK L No. 94 (Update Jun-26)'),
  ('095', '8 X 17.2', 149.00, 84680625, 'Poliland Kairagi - BLOK L No. 95 (Update Jun-26)'),
  ('096', '8 X 18.6', 149.00, 84680625, 'Poliland Kairagi - BLOK L No. 96 (Update Jun-26)'),
  ('097', '12.5 X 12.8', 184.00, 104345000, 'Poliland Kairagi - BLOK L No. 97 (Update Jun-26)');

-- Batalkan semuanya bila ada nomor kavling yang tidak ditemukan.
do $$
declare
  v_matched integer;
begin
  select count(*) into v_matched
  from price_update u
  join public.lots l on l.lot_number = u.lot_number;

  if v_matched <> 97 then
    raise exception 'Hanya % dari 97 kavling yang cocok. Tidak ada data yang diubah.', v_matched;
  end if;
end $$;

update public.lots l
set dimension = u.dimension,
    area = u.area,
    description = u.description
from price_update u
where l.lot_number = u.lot_number
  and (l.dimension, l.area, l.description) is distinct from (u.dimension, u.area, u.description);

-- Dipisah agar trigger harga hanya berjalan pada kavling yang harganya berubah.
update public.lots l
set cash_price = u.cash_price
from price_update u
where l.lot_number = u.lot_number
  and u.cash_price is not null
  and l.cash_price is distinct from u.cash_price;

commit;

-- Pemeriksaan setelah dijalankan:
--   select count(*) as total, count(cash_price) as berharga, count(promo_price) as promo
--   from public.lots;
--   Harapan: total 97, berharga 93 (bila 034-037 masih kosong), promo 0.
