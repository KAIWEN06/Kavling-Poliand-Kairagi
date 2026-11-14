-- Seed transaksi keuangan untuk menguji tab Menunggu dan Terlambat.
-- Jalankan hanya pada database development/testing.
-- Script ini memakai customer dan lot yang sudah terdaftar.

begin;

-- 1) Inspeksi data yang akan dipakai.
select id, full_name, email
from public.customers
order by created_at desc nulls last
limit 10;

select id, lot_number, status
from public.lots
order by id
limit 10;

-- 2) Rapikan hanya customer dummy pagination yang dibuat sebelumnya.
update public.customers
set full_name = case email
  when 'uji.pagination.1@example.test' then 'Andi Pratama'
  when 'uji.pagination.2@example.test' then 'Budi Santoso'
  when 'uji.pagination.3@example.test' then 'Citra Lestari'
  when 'uji.pagination.4@example.test' then 'Dimas Wijaya'
  when 'uji.pagination.5@example.test' then 'Eka Putri'
  when 'uji.pagination.16@example.test' then 'Fajar Hidayat'
  else full_name
end
where email in (
  'uji.pagination.1@example.test',
  'uji.pagination.2@example.test',
  'uji.pagination.3@example.test',
  'uji.pagination.4@example.test',
  'uji.pagination.5@example.test',
  'uji.pagination.16@example.test'
)
or full_name = 'Uji Pagination 16';

update public.customers
set full_name = 'Fajar Hidayat'
where full_name = 'Uji Pagination 16';

-- 3) Pilih dua customer dan dua lot yang sudah ada.
-- Lot dipilih hanya jika belum berstatus Sold agar aplikasi dapat menampilkan
-- pembayaran lama sebagai Terlambat.
do $$
declare
  pending_customer_id bigint;
  overdue_customer_id bigint;
  pending_lot_id bigint;
  overdue_lot_id bigint;
begin
  select id into pending_customer_id
  from public.customers
  where email like 'uji.pagination.%@example.test'
     or full_name like 'Uji Pagination %'
  order by created_at desc nulls last, id
  offset 0 limit 1;

  if pending_customer_id is null then
    select id into pending_customer_id
    from public.customers
    order by created_at desc nulls last, id
    offset 0 limit 1;
  end if;

  select id into overdue_customer_id
  from public.customers
  where id <> pending_customer_id
    and (email like 'uji.pagination.%@example.test' or full_name like 'Uji Pagination %')
  order by created_at desc nulls last, id
  offset 0 limit 1;

  if overdue_customer_id is null then
    select id into overdue_customer_id
    from public.customers
    where id <> pending_customer_id
    order by created_at desc nulls last, id
    offset 0 limit 1;
  end if;

  select l.id into pending_lot_id
  from public.lots l
  where not exists (
    select 1 from public.lot_transactions t
    where t.lot_id = l.id and t.status = 'Sold'
  )
  order by l.id
  offset 0 limit 1;

  select l.id into overdue_lot_id
  from public.lots l
  where l.id <> pending_lot_id
    and not exists (
      select 1 from public.lot_transactions t
      where t.lot_id = l.id and t.status = 'Sold'
    )
  order by l.id
  offset 0 limit 1;

  if pending_customer_id is null or overdue_customer_id is null
     or pending_lot_id is null or overdue_lot_id is null then
    raise exception 'Minimal 2 customer dan 2 lot non-Sold diperlukan untuk seed finance.';
  end if;

  -- Menunggu: pembayaran baru dengan lot yang belum Sold.
  insert into public.payments (customer_id, lot_id, amount, payment_date, payment_method)
  select pending_customer_id, pending_lot_id, 10000000, now() - interval '1 day', 'Transfer Bank'
  where not exists (
    select 1 from public.payments p
    where p.customer_id = pending_customer_id
      and p.lot_id = pending_lot_id
      and p.amount = 10000000
      and p.payment_method = 'Transfer Bank'
      and p.payment_date > now() - interval '7 days'
  );

  -- Terlambat: pembayaran lebih dari 30 hari pada lot yang belum Sold.
  insert into public.payments (customer_id, lot_id, amount, payment_date, payment_method)
  select overdue_customer_id, overdue_lot_id, 7500000, now() - interval '45 days', 'Transfer Bank'
  where not exists (
    select 1 from public.payments p
    where p.customer_id = overdue_customer_id
      and p.lot_id = overdue_lot_id
      and p.amount = 7500000
      and p.payment_method = 'Transfer Bank'
      and p.payment_date < now() - interval '30 days'
  );
end $$;

-- 4) Verifikasi hasil seed.
select p.id, c.full_name, p.lot_id, p.amount, p.payment_date, p.payment_method
from public.payments p
join public.customers c on c.id = p.customer_id
where p.payment_method = 'Transfer Bank'
order by p.payment_date desc;

commit;

-- Pembersihan opsional berdasarkan customer dan nominal seed:
-- delete from public.payments
-- where payment_method = 'Transfer Bank'
--   and amount in (10000000, 7500000)
--   and payment_date between now() - interval '60 days' and now();
