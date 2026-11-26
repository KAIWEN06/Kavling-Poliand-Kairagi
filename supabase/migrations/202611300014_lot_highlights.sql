-- Fasilitas di dekat kavling beserta jaraknya, diisi Admin dari pengukuran nyata.
-- Dipakai untuk label "Dekat fasilitas" di sisi pembeli.

begin;

create table if not exists public.lot_highlights (
  id         bigint generated always as identity primary key,
  lot_id     bigint not null references public.lots (id) on delete cascade,
  facility   text not null check (char_length(btrim(facility)) between 2 and 60),
  distance_m integer not null check (distance_m between 1 and 50000),
  created_at timestamptz not null default now()
);

create unique index if not exists lot_highlights_lot_facility_uq
  on public.lot_highlights (lot_id, lower(btrim(facility)));

alter table public.lot_highlights enable row level security;

revoke all on public.lot_highlights from public, anon, authenticated;
grant select on public.lot_highlights to anon, authenticated;
grant insert (lot_id, facility, distance_m), delete on public.lot_highlights to authenticated;

-- Informasi lokasi bersifat publik, sama seperti denah.
drop policy if exists "lot_highlights_read" on public.lot_highlights;
create policy "lot_highlights_read" on public.lot_highlights
  for select to anon, authenticated using (true);

drop policy if exists "lot_highlights_admin_insert" on public.lot_highlights;
create policy "lot_highlights_admin_insert" on public.lot_highlights
  for insert to authenticated with check (public.is_finance_admin());

drop policy if exists "lot_highlights_admin_delete" on public.lot_highlights;
create policy "lot_highlights_admin_delete" on public.lot_highlights
  for delete to authenticated using (public.is_finance_admin());

commit;

-- Rollback:
--   drop table public.lot_highlights;
