-- Lengkapi blok kavling sesuai denah (Blok A sampai L).
--
-- Tabel blocks sudah berisi A-L, tetapi baru 8 dari 97 kavling yang terhubung.
-- LOT_004 sebelumnya tercatat di Blok A; di denah ia termasuk Blok B.
-- Pembagian ini sama dengan src/utils/siteplanBlocks.ts. Aman dijalankan ulang.

begin;

-- Pengisian data massal bukan perubahan yang perlu masuk riwayat kavling.
alter table public.lots disable trigger trigger_log_lot_changes;

with mapping (code, polygon_id) as (
  values
    ('A', 'LOT_001'), ('A', 'LOT_002'), ('A', 'LOT_003'),
    ('B', 'LOT_004'), ('B', 'LOT_005'), ('B', 'LOT_006'), ('B', 'LOT_007'),
    ('B', 'LOT_008'), ('B', 'LOT_009'), ('B', 'LOT_010'), ('B', 'LOT_011'),
    ('C', 'LOT_012'), ('C', 'LOT_12A'), ('C', 'LOT_014'), ('C', 'LOT_015'),
    ('C', 'LOT_016'), ('C', 'LOT_017'), ('C', 'LOT_018'), ('C', 'LOT_019'),
    ('D', 'LOT_020'), ('D', 'LOT_021'), ('D', 'LOT_022'), ('D', 'LOT_023'),
    ('D', 'LOT_024'), ('D', 'LOT_025'),
    ('E', 'LOT_026'), ('E', 'LOT_027'), ('E', 'LOT_028'), ('E', 'LOT_029'),
    ('E', 'LOT_030'), ('E', 'LOT_031'), ('E', 'LOT_032'), ('E', 'LOT_033'),
    ('E', 'LOT_034'), ('E', 'LOT_035'), ('E', 'LOT_036'), ('E', 'LOT_037'),
    ('E', 'LOT_038'), ('E', 'LOT_039'), ('E', 'LOT_040'), ('E', 'LOT_041'),
    ('E', 'LOT_042'), ('E', 'LOT_043'), ('E', 'LOT_044'), ('E', 'LOT_045'),
    ('F', 'LOT_046'), ('F', 'LOT_047'), ('F', 'LOT_048'), ('F', 'LOT_049'),
    ('F', 'LOT_050'),
    ('G', 'LOT_051'), ('G', 'LOT_052'), ('G', 'LOT_053'), ('G', 'LOT_054'),
    ('G', 'LOT_055'), ('G', 'LOT_056'), ('G', 'LOT_057'), ('G', 'LOT_058'),
    ('G', 'LOT_059'), ('G', 'LOT_060'),
    ('H', 'LOT_061'), ('H', 'LOT_062'), ('H', 'LOT_063'), ('H', 'LOT_064'),
    ('H', 'LOT_065'), ('H', 'LOT_066'), ('H', 'LOT_067'), ('H', 'LOT_068'),
    ('H', 'LOT_069'),
    ('I', 'LOT_070'), ('I', 'LOT_071'), ('I', 'LOT_072'), ('I', 'LOT_073'),
    ('I', 'LOT_074'), ('I', 'LOT_075'), ('I', 'LOT_076'), ('I', 'LOT_077'),
    ('J', 'LOT_078'), ('J', 'LOT_079'), ('J', 'LOT_080'), ('J', 'LOT_081'),
    ('J', 'LOT_082'), ('J', 'LOT_083'), ('J', 'LOT_084'), ('J', 'LOT_085'),
    ('K', 'LOT_086'), ('K', 'LOT_087'), ('K', 'LOT_088'), ('K', 'LOT_089'),
    ('K', 'LOT_090'), ('K', 'LOT_091'), ('K', 'LOT_092'), ('K', 'LOT_093'),
    ('L', 'LOT_094'), ('L', 'LOT_095'), ('L', 'LOT_096'), ('L', 'LOT_097')
)
update public.lots l
set block_id = b.id
from mapping m
join public.blocks b on b.code = m.code
where l.polygon_id = m.polygon_id
  and l.block_id is distinct from b.id;

alter table public.lots enable trigger trigger_log_lot_changes;

-- Nama blok diseragamkan ke bahasa Indonesia ("Block A" menjadi "Blok A").
update public.blocks
set name = 'Blok ' || code
where code in ('A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L')
  and name is distinct from 'Blok ' || code;

commit;

-- Pemeriksaan: harus menghasilkan 12 baris (A-L), total 97 kavling, tanpa baris NULL.
--   select b.code, count(*) from public.lots l
--   left join public.blocks b on b.id = l.block_id
--   group by b.code order by b.code;
--
-- Rollback ke keadaan sebelumnya:
--   update public.lots set block_id = null
--     where polygon_id not in ('LOT_001','LOT_002','LOT_003','LOT_004','LOT_022','LOT_070','LOT_071','LOT_072');
--   update public.lots set block_id = (select id from public.blocks where code = 'A') where polygon_id = 'LOT_004';
