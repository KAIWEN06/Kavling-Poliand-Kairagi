-- Jalankan SETELAH migrasi 202611300026 di SQL Editor Supabase.
-- Semua perubahan uji dibatalkan oleh ROLLBACK di akhir.
-- Lulus: hasil akhirnya satu baris "LULUS". Gagal: muncul error berawalan "GAGAL".
begin;

do $$
declare
  v_owner uuid;
  v_admin uuid;
  v_lot bigint;
  v_rows bigint;
  v_triggers integer;
begin
  select id into v_owner from public.profiles where role = 'owner' limit 1;
  select id into v_admin from public.profiles where role = 'admin' limit 1;
  select min(id) into v_lot from public.lots;
  if v_owner is null or v_admin is null or v_lot is null then
    raise exception 'GAGAL: butuh minimal satu akun owner, satu admin, dan satu kaveling.';
  end if;

  -- 1. Penjaga terpasang di semua tabel yang terdaftar.
  select count(*) into v_triggers from pg_trigger where tgname = 'aaa_block_owner_writes';
  if v_triggers <> 60 then
    raise exception 'GAGAL: penjaga terpasang di % tabel, seharusnya 60.', v_triggers;
  end if;

  -- 2. Jalur RPC SECURITY DEFINER: peran database postgres, pemanggil Owner.
  perform set_config('request.jwt.claims', json_build_object('sub', v_owner, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_owner::text, true);
  begin
    update public.lots set description = description where id = v_lot;
    raise exception 'GAGAL: Owner masih bisa mengubah kaveling lewat jalur RPC.';
  exception when insufficient_privilege then
    null;
  end;

  -- 3. Owner tetap bisa membaca.
  execute 'set local role authenticated';
  select count(*) into v_rows from public.lots;
  if v_rows = 0 then
    raise exception 'GAGAL: Owner tidak bisa membaca kaveling.';
  end if;

  -- 4. Owner tetap bisa mengubah profilnya sendiri.
  update public.profiles set full_name = full_name where id = v_owner;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'GAGAL: Owner tidak bisa mengubah profil sendiri.';
  end if;
  execute 'reset role';

  -- 5. Admin tidak terpengaruh.
  perform set_config('request.jwt.claims', json_build_object('sub', v_admin, 'role', 'authenticated')::text, true);
  perform set_config('request.jwt.claim.sub', v_admin::text, true);
  update public.lots set description = description where id = v_lot;
  get diagnostics v_rows = row_count;
  if v_rows <> 1 then
    raise exception 'GAGAL: perubahan oleh Admin tidak tersimpan.';
  end if;

  -- 6. Pendaftar baru tidak lagi mendapat role admin.
  if position('''admin''' in pg_get_functiondef('public.handle_new_user()'::regprocedure)) > 0 then
    raise exception 'GAGAL: handle_new_user masih menyebut role admin.';
  end if;
end;
$$;

rollback;

select 'LULUS: Owner hanya baca, profil sendiri tetap bisa diubah, Admin tidak terpengaruh.' as hasil;
