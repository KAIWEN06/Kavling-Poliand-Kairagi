-- Let a client see only their own SPK submissions so the document page can
-- show the current verification status without exposing other buyers' data.
drop policy if exists "client users can read their own SPK requests"
  on public.spk_requests;
drop policy if exists "clients can read their own client SPK requests"
  on public.spk_requests;

create policy "clients can read their own client SPK requests"
  on public.spk_requests
  for select
  to authenticated
  using (
    submission_source = 'Client'
    and submitted_by = auth.uid()
    and exists (
      select 1
      from public.profiles
      where profiles.id = auth.uid()
        and profiles.role = 'client'
    )
  );

drop policy if exists "clients can read documents attached to their own SPK"
  on public.spk_request_documents;

create policy "clients can read documents attached to their own SPK"
  on public.spk_request_documents
  for select
  to authenticated
  using (
    uploaded_by = auth.uid()
    and exists (
      select 1
      from public.spk_requests
      where spk_requests.id = spk_request_documents.spk_request_id
        and spk_requests.submission_source = 'Client'
        and spk_requests.submitted_by = auth.uid()
    )
  );

notify pgrst, 'reload schema';
