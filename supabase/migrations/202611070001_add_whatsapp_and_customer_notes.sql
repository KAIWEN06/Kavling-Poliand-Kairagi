alter table public.customers add column if not exists whatsapp_phone text;

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id bigint not null references public.customers(id) on delete cascade,
  title text not null,
  content text not null,
  category text not null default 'Lainnya',
  is_pinned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customer_note_histories (
  id uuid primary key default gen_random_uuid(),
  note_id uuid not null references public.customer_notes(id) on delete cascade,
  customer_id bigint not null references public.customers(id) on delete cascade,
  action text not null,
  old_content jsonb,
  new_content jsonb,
  created_at timestamptz not null default now()
);

create index if not exists customer_notes_customer_id_idx on public.customer_notes(customer_id);
create index if not exists customer_note_histories_note_id_idx on public.customer_note_histories(note_id);

create or replace function public.set_customer_note_updated_at()
returns trigger language plpgsql security invoker as $$ begin new.updated_at = now(); return new; end; $$;
drop trigger if exists customer_notes_updated_at on public.customer_notes;
create trigger customer_notes_updated_at before update on public.customer_notes for each row execute function public.set_customer_note_updated_at();

create or replace function public.log_customer_note_history()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then insert into public.customer_note_histories(note_id, customer_id, action, new_content) values (new.id, new.customer_id, 'created', to_jsonb(new)); return new;
  elsif tg_op = 'UPDATE' then insert into public.customer_note_histories(note_id, customer_id, action, old_content, new_content) values (new.id, new.customer_id, 'updated', to_jsonb(old), to_jsonb(new)); return new;
  elsif tg_op = 'DELETE' then insert into public.customer_note_histories(note_id, customer_id, action, old_content) values (old.id, old.customer_id, 'deleted', to_jsonb(old)); return old;
  end if;
end; $$;
drop trigger if exists customer_notes_history on public.customer_notes;
create trigger customer_notes_history after insert or update or delete on public.customer_notes for each row execute function public.log_customer_note_history();

alter table public.customer_notes enable row level security;
alter table public.customer_note_histories enable row level security;
create policy "authenticated can read customer notes" on public.customer_notes for select to authenticated using (true);
create policy "authenticated can create customer notes" on public.customer_notes for insert to authenticated with check (true);
create policy "authenticated can update customer notes" on public.customer_notes for update to authenticated using (true) with check (true);
create policy "authenticated can delete customer notes" on public.customer_notes for delete to authenticated using (true);
create policy "authenticated can read note histories" on public.customer_note_histories for select to authenticated using (true);
