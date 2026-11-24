-- =====================================================================
-- Pesan "nomor sudah terdaftar" yang berguna untuk Marketing
-- =====================================================================
-- Saat nomor sudah ada, Marketing perlu tahu langkah berikutnya:
--   mine            -> sudah ada di daftarnya sendiri (bisa dibuka)
--   other_marketing -> ditangani Marketing lain
--   unassigned      -> terdaftar tanpa Marketing penanggung jawab
-- RLS menyembunyikan data milik orang lain, jadi fungsi ini hanya membuka
-- id dan nama bila pemanggil memang berhak membacanya (pemilik, Kepala
-- Marketing, Admin, Owner). Marketing biasa hanya menerima status.
-- Aman dijalankan ulang (idempotent).
-- =====================================================================

create or replace function public.lookup_contact_owner(p_phone text, p_whatsapp text, p_exclude_id bigint default null)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
declare
  v_role text := public.current_app_role();
  v_uid uuid := (select auth.uid());
  v_a text := public.normalize_id_phone(p_phone);
  v_b text := public.normalize_id_phone(p_whatsapp);
  c public.customers%rowtype;
  v_status text;
  v_visible boolean;
begin
  if v_role is null or v_role not in ('admin', 'owner', 'marketing', 'marketing_head') then
    raise exception 'Tidak diizinkan.';
  end if;
  if v_a is null and v_b is null then
    return jsonb_build_object('status', 'free');
  end if;

  select x.* into c
  from public.customers x
  where (p_exclude_id is null or x.id <> p_exclude_id)
    and (public.normalize_id_phone(x.phone) in (v_a, v_b)
      or public.normalize_id_phone(x.whatsapp_phone) in (v_a, v_b))
  order by x.id
  limit 1;

  if not found then
    return jsonb_build_object('status', 'free');
  end if;

  v_status := case
    when c.marketing_id is null then 'unassigned'
    when c.marketing_id = v_uid then 'mine'
    else 'other_marketing'
  end;
  -- Kepala Marketing membaca semua client (policy "Marketing head read all").
  v_visible := v_role in ('admin', 'owner', 'marketing_head') or c.marketing_id = v_uid;

  return jsonb_build_object(
    'status', v_status,
    'customer_id', case when v_visible then c.id end,
    'customer_name', case when v_visible then c.full_name end
  );
end;
$$;

revoke all on function public.lookup_contact_owner(text, text, bigint) from public, anon;
grant execute on function public.lookup_contact_owner(text, text, bigint) to authenticated;
