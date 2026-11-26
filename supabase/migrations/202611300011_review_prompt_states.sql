-- =====================================================================
-- Catatan ajakan ulasan per Client
--
-- Menyimpan kapan ajakan menulis ulasan sudah ditawarkan atau dilewati,
-- supaya pilihan "Lewati" berlaku di semua perangkat.
--
--  * Satu baris per akun.
--  * Client hanya dapat membaca, menambah, dan mengubah barisnya sendiri.
--  * Tidak ada akses untuk pengunjung, dan tidak ada hak hapus.
--  * Isinya hanya mengatur tampilan ajakan, bukan izin mengirim ulasan.
-- Aman dijalankan ulang. Tidak mengubah tabel yang sudah dipakai.
-- =====================================================================

create table if not exists public.review_prompt_states (
  user_id       uuid primary key references public.profiles(id) on delete cascade,
  seen          text[] not null default '{}'
                  check (seen <@ array['booking_paid', 'survey_done', 'paid_off']),
  dismissals    smallint not null default 0 check (dismissals between 0 and 100),
  snoozed_until timestamptz,
  view_days     date[] not null default '{}' check (cardinality(view_days) <= 10),
  done          boolean not null default false,
  updated_at    timestamptz not null default now()
);

alter table public.review_prompt_states enable row level security;

revoke all on public.review_prompt_states from anon, authenticated;
grant select on public.review_prompt_states to authenticated;
grant insert (user_id, seen, dismissals, snoozed_until, view_days, done, updated_at)
  on public.review_prompt_states to authenticated;
-- user_id ikut diberi hak ubah karena upsert menuliskannya kembali;
-- policy di bawah menahan baris agar tetap milik akun yang sama.
grant update (user_id, seen, dismissals, snoozed_until, view_days, done, updated_at)
  on public.review_prompt_states to authenticated;

drop policy if exists review_prompt_states_select_own on public.review_prompt_states;
create policy review_prompt_states_select_own on public.review_prompt_states
  for select to authenticated
  using (user_id = (select auth.uid()));

drop policy if exists review_prompt_states_insert_own on public.review_prompt_states;
create policy review_prompt_states_insert_own on public.review_prompt_states
  for insert to authenticated
  with check (
    user_id = (select auth.uid())
    and (select public.current_app_role()) = 'client'
  );

drop policy if exists review_prompt_states_update_own on public.review_prompt_states;
create policy review_prompt_states_update_own on public.review_prompt_states
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
