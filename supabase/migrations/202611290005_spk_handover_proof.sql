-- =====================================================================
-- Bukti serah terima sertifikat
--
-- * Admin mengunggah bukti (JPG/PNG/WEBP/PDF, maks 5 MB) ke bucket privat
--   'spk-process-proofs', path: <spk_id>/<nama-file>.
-- * Langkah 'serah_terima' tidak bisa ditandai selesai sebelum bukti terlampir
--   (dijaga trigger, berlaku juga untuk pembaruan langsung ke tabel).
-- * Admin, owner, kepala marketing, marketing pemilik, dan client pemilik SPK
--   dapat membuka bukti lewat URL bertanda tangan (storage RLS).
-- Aman dijalankan ulang.
-- =====================================================================

alter table public.spk_process_steps
  add column if not exists proof_path text,
  add column if not exists proof_name text,
  add column if not exists proof_uploaded_at timestamptz,
  add column if not exists proof_uploaded_by uuid references auth.users(id) on delete set null;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('spk-process-proofs', 'spk-process-proofs', false, 5242880,
        array['image/jpeg', 'image/png', 'image/webp', 'application/pdf'])
on conflict (id) do update
set public = false,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Siapa yang boleh melihat proses satu SPK (sama dengan policy spk_process_steps_select).
create or replace function public._can_view_spk_process(p_spk_id bigint)
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles p
                 where p.id = (select auth.uid()) and p.role in ('admin', 'owner', 'marketing_head'))
      or public.marketing_owner_of_spk(p_spk_id) = (select auth.uid())
      or exists (select 1 from public.spk_requests r
                 join public.customers c on c.id = r.customer_id
                 where r.id = p_spk_id and c.user_id = (select auth.uid()));
$$;

-- Folder pertama objek = id SPK. CASE mencegah cast gagal pada nama yang bukan angka.
create or replace function public._can_view_spk_process_folder(p_folder text)
returns boolean
language sql stable security definer set search_path = '' as $$
  select case when p_folder ~ '^[0-9]{1,18}$'
              then public._can_view_spk_process(p_folder::bigint)
              else false end;
$$;

create or replace function public._is_admin_user()
returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = (select auth.uid()) and role = 'admin');
$$;

revoke all on function public._can_view_spk_process(bigint) from public, anon;
revoke all on function public._can_view_spk_process_folder(text) from public, anon;
revoke all on function public._is_admin_user() from public, anon;
grant execute on function public._can_view_spk_process(bigint) to authenticated;
grant execute on function public._can_view_spk_process_folder(text) to authenticated;
grant execute on function public._is_admin_user() to authenticated;

drop policy if exists spk_process_proofs_read on storage.objects;
create policy spk_process_proofs_read on storage.objects
  for select to authenticated
  using (
    bucket_id = 'spk-process-proofs'
    and public._can_view_spk_process_folder((storage.foldername(name))[1])
  );

drop policy if exists spk_process_proofs_admin_insert on storage.objects;
create policy spk_process_proofs_admin_insert on storage.objects
  for insert to authenticated
  with check (bucket_id = 'spk-process-proofs' and public._is_admin_user());

drop policy if exists spk_process_proofs_admin_delete on storage.objects;
create policy spk_process_proofs_admin_delete on storage.objects
  for delete to authenticated
  using (bucket_id = 'spk-process-proofs' and public._is_admin_user());

-- Admin: lampirkan bukti ke langkah serah terima.
create or replace function public.admin_attach_spk_step_proof(
  p_step_id bigint, p_path text, p_name text
) returns void
language plpgsql security definer set search_path = '' as $$
declare
  v_step public.spk_process_steps%rowtype;
begin
  if not public._is_admin_user() then
    raise exception 'Hanya Admin yang dapat mengunggah bukti serah terima';
  end if;
  select * into v_step from public.spk_process_steps where id = p_step_id for update;
  if not found then raise exception 'Langkah proses tidak ditemukan'; end if;
  if v_step.step_key <> 'serah_terima' then
    raise exception 'Bukti hanya untuk langkah serah terima sertifikat';
  end if;
  if p_path is null or p_path !~ ('^' || v_step.spk_request_id || '/[A-Za-z0-9._-]+$') then
    raise exception 'Lokasi file bukti tidak valid';
  end if;
  if not exists (select 1 from storage.objects where bucket_id = 'spk-process-proofs' and name = p_path) then
    raise exception 'File bukti belum terunggah';
  end if;

  update public.spk_process_steps
     set proof_path = p_path,
         proof_name = nullif(left(btrim(coalesce(p_name, '')), 160), ''),
         proof_uploaded_at = now(),
         proof_uploaded_by = auth.uid(),
         updated_at = now()
   where id = p_step_id;
end;
$$;

revoke all on function public.admin_attach_spk_step_proof(bigint, text, text) from public, anon;
grant execute on function public.admin_attach_spk_step_proof(bigint, text, text) to authenticated;

-- Serah terima tidak bisa selesai tanpa bukti.
create or replace function public.trg_spk_step_require_handover_proof()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.step_key = 'serah_terima'
     and new.status = 'done'
     and old.status is distinct from 'done'
     and new.proof_path is null then
    raise exception 'Unggah bukti serah terima sebelum menandai selesai';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_spk_step_require_handover_proof on public.spk_process_steps;
create trigger trg_spk_step_require_handover_proof
  before update on public.spk_process_steps
  for each row execute function public.trg_spk_step_require_handover_proof();
