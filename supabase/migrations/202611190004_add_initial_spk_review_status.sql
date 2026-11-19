do $$
begin
  if to_regclass('public.spk_requests') is null then
    raise exception 'spk_requests is required';
  end if;

  alter table public.spk_requests
    drop constraint if exists spk_requests_notary_status_check;

  alter table public.spk_requests
    add constraint spk_requests_notary_status_check
    check (
      notary_status is null
      or notary_status in ('Menunggu Diproses', 'Diproses', 'Proses Notaris', 'Penandatanganan Notaris', 'Selesai')
    );

  alter table public.spk_requests
    alter column notary_status set default 'Menunggu Diproses';
end $$;
