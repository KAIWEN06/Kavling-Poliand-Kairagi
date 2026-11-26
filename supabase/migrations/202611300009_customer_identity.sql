-- =====================================================================
-- Identitas pembeli: NIK, tempat lahir, tanggal lahir
--
-- Dipakai untuk administrasi, yaitu mengisi data Pihak Kedua pada
-- dokumen SPK yang ditandatangani.
--
-- Disimpan di tabel terpisah dari customers karena aksesnya lebih sempit.
--   * Klien           : lihat dan ubah datanya sendiri.
--   * Admin / pemilik : lihat dan ubah semua.
--   * Pemasar         : lihat dan ubah milik klien yang ia pegang.
--   * Kepala pemasaran: tidak punya akses.
-- Aman dijalankan ulang.
-- =====================================================================

create table if not exists public.customer_identities (
  customer_id bigint primary key references public.customers(id) on delete cascade,
  nik text not null check (nik ~ '^[0-9]{16}$'),
  birth_place text not null check (char_length(btrim(birth_place)) between 2 and 100),
  birth_date date not null check (birth_date >= date '1900-01-01'),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null
);

alter table public.customer_identities enable row level security;

create or replace function public.can_access_customer_identity(p_customer_id bigint)
returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_finance_admin()
    or exists (
      select 1 from public.customers c
      where c.id = p_customer_id
        and (
          c.user_id = (select auth.uid())
          or (c.marketing_id = (select auth.uid()) and public.current_app_role() = 'marketing')
        )
    );
$$;

revoke all on function public.can_access_customer_identity(bigint) from public, anon;
grant execute on function public.can_access_customer_identity(bigint) to authenticated;

drop policy if exists customer_identities_select on public.customer_identities;
create policy customer_identities_select on public.customer_identities
  for select to authenticated
  using (public.can_access_customer_identity(customer_id));

drop policy if exists customer_identities_insert on public.customer_identities;
create policy customer_identities_insert on public.customer_identities
  for insert to authenticated
  with check (public.can_access_customer_identity(customer_id));

drop policy if exists customer_identities_update on public.customer_identities;
create policy customer_identities_update on public.customer_identities
  for update to authenticated
  using (public.can_access_customer_identity(customer_id))
  with check (public.can_access_customer_identity(customer_id));
-- Tidak ada policy delete: baris ikut terhapus bersama data pembelinya.

revoke all on public.customer_identities from anon, authenticated;
grant select, insert, update on public.customer_identities to authenticated;

create or replace function public.trg_customer_identity_guard()
returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- Gabung data pembeli memindahkan semua relasi ke baris tujuan. Bila tujuan
  -- sudah punya identitas, baris ini dibiarkan lalu ikut terhapus (cascade).
  if tg_op = 'UPDATE' and new.customer_id is distinct from old.customer_id
     and exists (select 1 from public.customer_identities i where i.customer_id = new.customer_id) then
    return null;
  end if;

  if new.birth_date > (now() at time zone 'Asia/Makassar')::date then
    raise exception 'Tanggal lahir tidak boleh setelah hari ini.';
  end if;

  new.birth_place := btrim(new.birth_place);
  new.updated_at := now();
  new.updated_by := coalesce(auth.uid(), new.updated_by);
  return new;
end;
$$;

drop trigger if exists trg_customer_identity_guard on public.customer_identities;
create trigger trg_customer_identity_guard
  before insert or update on public.customer_identities
  for each row execute function public.trg_customer_identity_guard();
