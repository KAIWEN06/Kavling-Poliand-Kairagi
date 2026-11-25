-- Privasi data pembeli pada denah.
--
-- Masalah: tabel lots terbaca oleh anon dan semua user login (policy "Public Read Lots" dkk),
-- termasuk kolom customer_id, payment_type, booking_date, dan sold_date. Siapa pun bisa
-- mengetahui siapa pembeli kavling dan metode bayarnya lewat API.
--
-- Aturan:
--   * Denah publik: tidak ada data pembeli.
--   * Admin/owner: melihat semuanya.
--   * Client: hanya data kavling miliknya sendiri (customers.user_id = auth.uid()).
--
-- Langkah:
--   1. get_siteplan_lots(): RPC untuk denah, mengosongkan kolom pembeli sesuai peran.
--   2. anon tidak lagi boleh membaca kolom pembeli di tabel lots (hanya kolom aman).
--
-- Catatan: user login (authenticated) masih bisa membaca kolom pembeli lewat query langsung
-- ke tabel lots, karena banyak layar internal (admin, marketing, SPK) memakainya. Menutup itu
-- butuh pemindahan semua query tersebut ke RPC, dikerjakan terpisah.

-- 1. RPC denah ---------------------------------------------------------------------------

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
      when me.is_admin or (c.user_id is not null and c.user_id = me.uid) then
        jsonb_build_object(
          'customer_id', l.customer_id,
          'payment_type', l.payment_type,
          'booking_date', l.booking_date,
          'sold_date', l.sold_date,
          'customers', case
            when c.id is null then null
            else jsonb_build_object('id', c.id, 'user_id', c.user_id, 'full_name', c.full_name)
          end
        )
      else '{}'::jsonb
    end
  from public.lots l
  cross join me
  left join public.blocks b on b.id = l.block_id
  left join public.customers c on c.id = l.customer_id
  order by l.lot_number;
$$;

revoke all on function public.get_siteplan_lots() from public;
grant execute on function public.get_siteplan_lots() to anon, authenticated;

-- 2. anon hanya boleh membaca kolom aman ------------------------------------------------

revoke select on public.lots from anon;

grant select (
  id, polygon_id, lot_number, block_id, dimension, area,
  cash_price, promo_price, status, color, description,
  panorama_url, panorama_boundary, created_at, updated_at
) on public.lots to anon;

-- Rollback:
--   grant select on public.lots to anon;
--   drop function public.get_siteplan_lots();
