do $$
begin
  if to_regclass('public.spk_requests') is null then raise exception 'spk_requests is required'; end if;
  if not exists (select 1 from information_schema.columns where table_schema='public' and table_name='spk_requests' and column_name='notary_status') then
    alter table public.spk_requests add column notary_status text not null default 'Diproses' check (notary_status in ('Diproses','Proses Notaris','Penandatanganan Notaris','Selesai'));
    alter table public.spk_requests add column notary_note text;
  end if;
end $$;

create table if not exists public.spk_review_activity (
  id bigint generated always as identity primary key,
  spk_request_id bigint not null references public.spk_requests(id),
  old_status text,
  new_status text not null,
  note text,
  changed_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);

create index if not exists spk_review_activity_request_idx on public.spk_review_activity(spk_request_id, created_at desc);
alter table public.spk_review_activity enable row level security;
drop policy if exists spk_review_activity_admin_select on public.spk_review_activity;
drop policy if exists spk_review_activity_admin_insert on public.spk_review_activity;
create policy spk_review_activity_admin_select on public.spk_review_activity for select to authenticated using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','owner')));
create policy spk_review_activity_admin_insert on public.spk_review_activity for insert to authenticated with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','owner')) and changed_by=auth.uid());

alter table public.spk_requests enable row level security;
drop policy if exists spk_requests_admin_update_review on public.spk_requests;
create policy spk_requests_admin_update_review on public.spk_requests for update to authenticated using (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','owner'))) with check (exists (select 1 from public.profiles p where p.id=auth.uid() and p.role in ('admin','owner')));
