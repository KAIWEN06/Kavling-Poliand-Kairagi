-- Denah: kesepakatan pembayaran kavling dipesan/terjual.
--
-- Memperluas get_siteplan_lots() (202611300001):
--   * Pihak berhak: admin/owner, client pemilik kavling, dan marketing yang terhubung
--     dengan client tersebut (customers.marketing_id, termasuk kepala marketing untuk timnya).
--   * Pihak berhak menerima objek "deal" berisi metode dan angka yang disepakati
--     dari lot_transactions aktif (Booking/Sold), sehingga denah tidak lagi menampilkan
--     simulasi Cash/Cicilan untuk kavling yang sudah punya kesepakatan.
--   * Pihak lain tetap tidak menerima data pembeli maupun deal.

create or replace function public.get_siteplan_lots()
returns setof jsonb
language sql
stable
security definer
set search_path = ''
as $$
  with me as (
    select
      (select auth.uid()) as uid,
      coalesce(public.is_finance_admin(), false) as is_admin
  )
  select
    jsonb_build_object(
      'id', l.id,
      'polygon_id', l.polygon_id,
      'lot_number', l.lot_number,
      'block_id', l.block_id,
      'dimension', l.dimension,
      'area', l.area,
      'cash_price', l.cash_price,
      'promo_price', l.promo_price,
      'status', l.status,
      'color', l.color,
      'description', l.description,
      'panorama_url', l.panorama_url,
      'panorama_boundary', l.panorama_boundary,
      'created_at', l.created_at,
      'updated_at', l.updated_at,
      'blocks', case
        when b.id is null then null
        else jsonb_build_object('id', b.id, 'name', b.name, 'code', b.code)
      end
    )
    || case
      when me.is_admin
        or (c.user_id is not null and c.user_id = me.uid)
        or (c.id is not null and public.marketing_scope_allows(c.marketing_id))
      then
        jsonb_build_object(
          'customer_id', l.customer_id,
          'payment_type', l.payment_type,
          'booking_date', l.booking_date,
          'sold_date', l.sold_date,
          'customers', case
            when c.id is null then null
            else jsonb_build_object('id', c.id, 'user_id', c.user_id, 'full_name', c.full_name)
          end,
          'deal', case
            when t.id is null then null
            else jsonb_build_object(
              'payment_type', t.payment_type,
              'final_price', t.final_price,
              'down_payment', t.down_payment,
              'months', t.months,
              'monthly_payment', t.monthly_payment,
              'booking_fee', t.booking_fee
            )
          end
        )
      else '{}'::jsonb
    end
  from public.lots l
  cross join me
  left join public.blocks b on b.id = l.block_id
  left join public.customers c on c.id = l.customer_id
  left join lateral (
    select x.*
    from public.lot_transactions x
    where x.lot_id = l.id
      and lower(x.status) in ('booking', 'sold')
    order by x.id desc
    limit 1
  ) t on true
  order by l.lot_number;
$$;

revoke all on function public.get_siteplan_lots() from public;
grant execute on function public.get_siteplan_lots() to anon, authenticated;
