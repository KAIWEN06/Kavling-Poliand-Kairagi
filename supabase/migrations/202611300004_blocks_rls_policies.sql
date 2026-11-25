-- =====================================================================
-- RLS untuk tabel public.blocks
-- - Semua orang (anon + authenticated) boleh membaca daftar blok.
--   Data blok hanya kode/nama, dipakai siteplan publik dan form Admin.
-- - Hanya Admin/Owner yang boleh menambah, mengubah, dan menghapus blok.
-- Penetapan blok ke kavling tetap lewat kolom lots.block_id (policy lots).
-- =====================================================================

create or replace function public.is_lot_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = (select auth.uid())
      and p.role in ('admin', 'owner')
  );
$$;

revoke all on function public.is_lot_admin() from public, anon;
grant execute on function public.is_lot_admin() to authenticated;

alter table public.blocks enable row level security;

grant select on table public.blocks to anon, authenticated;
grant insert, update, delete on table public.blocks to authenticated;

drop policy if exists "blocks_select_all" on public.blocks;
create policy "blocks_select_all"
  on public.blocks
  for select
  to anon, authenticated
  using (true);

drop policy if exists "blocks_insert_admin" on public.blocks;
create policy "blocks_insert_admin"
  on public.blocks
  for insert
  to authenticated
  with check ((select public.is_lot_admin()));

drop policy if exists "blocks_update_admin" on public.blocks;
create policy "blocks_update_admin"
  on public.blocks
  for update
  to authenticated
  using ((select public.is_lot_admin()))
  with check ((select public.is_lot_admin()));

drop policy if exists "blocks_delete_admin" on public.blocks;
create policy "blocks_delete_admin"
  on public.blocks
  for delete
  to authenticated
  using ((select public.is_lot_admin()));
