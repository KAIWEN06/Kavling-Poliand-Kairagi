create table if not exists public.home_hero (
  id uuid primary key default gen_random_uuid(),
  title text not null default '', subtitle text not null default '',
  description text not null default '', image_url text, cta_text text not null default 'Hubungi Kami',
  cta_url text not null default '/contact', is_active boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.home_features (
  id uuid primary key default gen_random_uuid(), icon text not null default 'leaf',
  title text not null, description text not null, sort_order integer not null default 0,
  is_active boolean not null default true, created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.faqs add column if not exists sort_order integer not null default 0;
alter table public.faqs add column if not exists is_active boolean not null default true;

insert into public.home_hero (title, subtitle, description, cta_text, cta_url)
select 'Hunian nyaman untuk masa depan', 'PoliLand Kairagi', 'Temukan kavling pilihan untuk keluarga Anda.', 'Hubungi Kami', '/contact'
where not exists (select 1 from public.home_hero);

alter table public.home_hero enable row level security;
alter table public.home_features enable row level security;
drop policy if exists "Publik membaca hero aktif" on public.home_hero;
drop policy if exists "Publik membaca keunggulan aktif" on public.home_features;
drop policy if exists "Admin mengelola hero" on public.home_hero;
drop policy if exists "Admin mengelola keunggulan" on public.home_features;

create policy "Publik membaca hero aktif" on public.home_hero for select using (is_active = true);
create policy "Publik membaca keunggulan aktif" on public.home_features for select using (is_active = true);
create policy "Admin mengelola hero" on public.home_hero for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'owner')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'owner')));
create policy "Admin mengelola keunggulan" on public.home_features for all to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'owner')))
  with check (exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('admin', 'owner')));
