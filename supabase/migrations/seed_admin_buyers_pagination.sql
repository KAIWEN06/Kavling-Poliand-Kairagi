-- Seed 25 calon pembeli untuk menguji pagination AdminPembeli.vue.
-- Jalankan di Supabase SQL Editor pada database development/testing saja.

insert into public.customers (full_name, phone, email, address, notes)
select
  format('Uji Pagination %s', series),
  format('0812%07s', series),
  format('uji.pagination.%s@example.test', series),
  'Data dummy untuk pengujian pagination',
  'SEED_PAGINATION_ADMIN_PEMBELI'
from generate_series(1, 25) as series
where not exists (
  select 1
  from public.customers existing
  where existing.email = format('uji.pagination.%s@example.test', series)
);

-- Opsional: hapus hanya data seed ini setelah selesai testing.
-- delete from public.customers
-- where notes = 'SEED_PAGINATION_ADMIN_PEMBELI';
