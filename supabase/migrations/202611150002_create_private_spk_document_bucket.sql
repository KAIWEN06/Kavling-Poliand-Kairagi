insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'spk-client-private-documents',
  'spk-client-private-documents',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'application/pdf']
)
on conflict (id) do nothing;

do $$
begin
  if exists (
    select 1
    from storage.buckets
    where id = 'spk-client-private-documents'
      and public
  ) then
    raise exception 'The spk-client-private-documents bucket must remain private.';
  end if;
end
$$;

create policy "client SPK owners can read their files"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'spk-client-private-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('admin', 'superadmin')
      )
    )
  );

create policy "client SPK owners can upload their files"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'spk-client-private-documents'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "client SPK owners can delete their files"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'spk-client-private-documents'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.profiles
        where profiles.id = auth.uid()
          and profiles.role in ('admin', 'superadmin')
      )
    )
  );
