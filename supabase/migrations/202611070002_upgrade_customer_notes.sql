-- Upgrade aman bila customer_notes sudah terlanjur dibuat dengan kolom `note`.
alter table public.customer_notes add column if not exists title text;
alter table public.customer_notes add column if not exists content text;
alter table public.customer_notes add column if not exists category text default 'Lainnya';
alter table public.customer_notes add column if not exists is_pinned boolean default false;
alter table public.customer_notes add column if not exists updated_at timestamptz default now();

do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'customer_notes' and column_name = 'note'
  ) then
    update public.customer_notes
    set title = coalesce(nullif(title, ''), 'Catatan'),
        content = coalesce(nullif(content, ''), nullif(note, ''), ''),
        category = coalesce(category, 'Lainnya'),
        is_pinned = coalesce(is_pinned, false),
        updated_at = coalesce(updated_at, created_at, now());
  else
    update public.customer_notes
    set title = coalesce(nullif(title, ''), 'Catatan'),
        content = coalesce(content, ''),
        category = coalesce(category, 'Lainnya'),
        is_pinned = coalesce(is_pinned, false),
        updated_at = coalesce(updated_at, created_at, now());
  end if;
end $$;

alter table public.customer_notes alter column title set not null;
alter table public.customer_notes alter column content set not null;
alter table public.customer_notes alter column category set not null;
alter table public.customer_notes alter column is_pinned set not null;
alter table public.customer_notes alter column updated_at set not null;
