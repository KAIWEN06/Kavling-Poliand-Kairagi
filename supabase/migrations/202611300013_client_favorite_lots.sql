-- Kavling favorit milik pembeli.
--
-- Sengaja tidak memakai customer_interests: tabel itu bagian dari CRM Marketing.
-- Tiap pengguna hanya bisa melihat, menambah, dan menghapus favoritnya sendiri.

begin;

create table if not exists public.client_favorite_lots (
  user_id    uuid not null default auth.uid() references auth.users (id) on delete cascade,
  lot_id     bigint not null references public.lots (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, lot_id)
);

create index if not exists client_favorite_lots_lot_idx on public.client_favorite_lots (lot_id);

alter table public.client_favorite_lots enable row level security;

revoke all on public.client_favorite_lots from public, anon, authenticated;
grant select, delete on public.client_favorite_lots to authenticated;
-- user_id selalu dari default auth.uid(), tidak bisa diisi dari aplikasi.
grant insert (lot_id) on public.client_favorite_lots to authenticated;

drop policy if exists "favorites_select_own" on public.client_favorite_lots;
create policy "favorites_select_own" on public.client_favorite_lots
  for select to authenticated using (user_id = (select auth.uid()));

drop policy if exists "favorites_insert_own" on public.client_favorite_lots;
create policy "favorites_insert_own" on public.client_favorite_lots
  for insert to authenticated with check (user_id = (select auth.uid()));

drop policy if exists "favorites_delete_own" on public.client_favorite_lots;
create policy "favorites_delete_own" on public.client_favorite_lots
  for delete to authenticated using (user_id = (select auth.uid()));

commit;

-- Rollback:
--   drop table public.client_favorite_lots;
