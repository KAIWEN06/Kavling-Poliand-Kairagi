-- =====================================================================
-- Kepala Pemasaran hanya memantau data klien (keputusan 28 November 2026).
--
-- Tidak boleh lagi menambah atau mengubah klien, minat kaveling,
-- identitas, tindak lanjut, dan status perkembangan. Trigger dipakai
-- karena tetap berjalan di dalam RPC SECURITY DEFINER
-- (update_customer_crm_status melewati RLS). Polanya sama dengan
-- 202611300026_owner_read_only.sql.
--
-- Yang TIDAK berubah:
--   * Hak baca Kepala Pemasaran.
--   * Arahan ke pemasar (customer_notes).
--   * Data akunnya sendiri, dan semua peran lain.
--
-- Aman dijalankan ulang.
-- =====================================================================
begin;

drop policy if exists "Marketing head insert team customers" on public.customers;

create or replace function public.block_marketing_head_writes()
returns trigger
language plpgsql
security definer
set search_path to ''
as $$
begin
  if public.is_marketing_head() then
    raise exception 'Akun Kepala Pemasaran hanya untuk memantau data klien. Perubahan dilakukan oleh pemasar atau Admin.'
      using errcode = '42501';
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke all on function public.block_marketing_head_writes() from public, anon, authenticated;

do $$
declare
  v_table text;
begin
  foreach v_table in array array[
    'customers', 'customer_interests', 'customer_identities',
    'customer_followups', 'customer_crm_status_history'
  ]
  loop
    execute format('drop trigger if exists aab_block_marketing_head_writes on public.%I', v_table);
    execute format(
      'create trigger aab_block_marketing_head_writes before insert or update or delete on public.%I
         for each row execute function public.block_marketing_head_writes()',
      v_table
    );
  end loop;
end;
$$;

commit;

-- ---------------------------------------------------------------------
-- Cara membatalkan (jalankan manual bila perlu):
--
--   drop function public.block_marketing_head_writes() cascade;
--   create policy "Marketing head insert team customers" on public.customers
--     for insert to authenticated with check (
--       public.is_marketing_head() and public.is_marketing_team_member(marketing_id)
--       and registration_source = 'Marketing' and user_id is null);
-- ---------------------------------------------------------------------
