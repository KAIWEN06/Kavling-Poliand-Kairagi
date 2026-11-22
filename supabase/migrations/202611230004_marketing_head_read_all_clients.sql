-- =====================================================================
-- Kepala Bagian Marketing dapat MELIHAT semua client (mandiri maupun
-- dari Marketing) beserta data terkait. Hanya baca: tidak ada policy
-- INSERT/UPDATE/DELETE baru, jadi Kepala Bagian tetap tidak dapat
-- membagikan, mengambil alih, atau mengubah client mandiri milik Admin.
-- =====================================================================
do $$
declare
  t text;
begin
  foreach t in array array[
    'customers', 'customer_interests', 'customer_notes', 'customer_note_histories',
    'customer_followups', 'customer_crm_status_history', 'customer_ownership_history',
    'lot_transactions', 'spk_requests', 'spk_request_status_history',
    'payments', 'payment_status_history', 'installment_schedules',
    'installment_penalties', 'purchase_cancellation_requests', 'purchase_refunds'
  ] loop
    execute format('drop policy if exists "Marketing head read all" on public.%I', t);
    execute format(
      'create policy "Marketing head read all" on public.%I for select to authenticated using (public.is_marketing_head())', t);
  end loop;
end $$;

-- Dashboard Kepala Bagian: hitung semua client, bukan hanya milik tim.
create or replace function public.get_marketing_head_dashboard()
returns jsonb language plpgsql stable security definer set search_path = 'public' as $$
declare
  v_actor uuid := auth.uid();
begin
  if v_actor is null or not exists (
    select 1 from public.profiles p where p.id = v_actor and p.role = 'marketing_head'
  ) then
    raise exception 'Halaman ini hanya dapat diakses Kepala Bagian Marketing.';
  end if;

  return jsonb_build_object(
    'team_count', (select count(*) from public.profiles where role = 'marketing'),
    'prospect_count', (select count(*) from public.customers),
    'self_registered_count', (select count(*) from public.customers where marketing_id is null),
    'active_spk_count', (select count(*) from public.spk_requests where status in ('Submitted', 'Under Review')),
    'approved_spk_count', (select count(*) from public.spk_requests where status = 'Approved'),
    'team', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', p.id,
        'full_name', coalesce(p.full_name, 'Marketing'),
        'prospect_count', (select count(*) from public.customers c where c.marketing_id = p.id),
        'active_spk_count', (select count(*) from public.spk_requests sr
            where sr.status in ('Submitted', 'Under Review') and public.marketing_owner_of_spk(sr.id) = p.id),
        'approved_spk_count', (select count(*) from public.spk_requests sr
            where sr.status = 'Approved' and public.marketing_owner_of_spk(sr.id) = p.id)
      ) order by p.full_name)
      from public.profiles p where p.role = 'marketing'
    ), '[]'::jsonb)
  );
end;
$$;
