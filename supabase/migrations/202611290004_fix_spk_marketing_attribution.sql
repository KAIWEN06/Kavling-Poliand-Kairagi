-- Perbaikan atribusi Marketing pada SPK.
-- Masalah: spk_requests.marketing_id punya default auth.uid(). SPK yang diajukan
-- klien mandiri (RPC create_client_spk_request tidak mengisi kolom ini) jadi
-- tercatat dengan marketing_id = akun klien itu sendiri, lalu trigger komisi
-- membuat "Komisi Marketing" untuk klien tersebut.

-- 1. Normalisasi saat INSERT ---------------------------------------------------------
create or replace function public.trg_normalize_spk_marketing()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- SPK dari klien: Marketing = penanggung jawab klien (kosong bila klien mandiri).
  if new.submission_source = 'Client' then
    select c.marketing_id into new.marketing_id
    from public.customers c where c.id = new.customer_id;
  end if;

  -- Hanya akun tim Marketing yang boleh menjadi marketing_id.
  if new.marketing_id is not null and not exists (
    select 1 from public.profiles p
    where p.id = new.marketing_id and p.role in ('marketing', 'marketing_head')
  ) then
    new.marketing_id := null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_normalize_spk_marketing on public.spk_requests;
create trigger trg_normalize_spk_marketing
before insert on public.spk_requests
for each row execute function public.trg_normalize_spk_marketing();

-- 2. Pembersihan data lama ------------------------------------------------------------
-- Komisi yang belum dicairkan milik akun non-Marketing dihapus.
delete from public.marketing_commissions mc
where mc.status in ('Pending', 'Eligible')
  and not exists (
    select 1 from public.profiles p
    where p.id = mc.marketing_id and p.role in ('marketing', 'marketing_head')
  );

-- SPK klien: samakan dengan penanggung jawab klien (NULL bila mandiri).
update public.spk_requests s
set marketing_id = (select c.marketing_id from public.customers c where c.id = s.customer_id)
where s.submission_source = 'Client'
  and s.marketing_id is distinct from (select c.marketing_id from public.customers c where c.id = s.customer_id)
  and not exists (
    select 1 from public.profiles p
    where p.id = s.marketing_id and p.role in ('marketing', 'marketing_head')
  );
