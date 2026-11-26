-- Menutup akses yang terbuka untuk pengguna tanpa login dan antar pembeli.
--
-- Masalah:
--   1. v_transaction_payment_summary tidak memakai security_invoker dan bisa dibaca anon,
--      sehingga RLS terlewati: harga akhir dan total bayar semua transaksi terbuka.
--   2. _notify_spk_parties bisa dipanggil anon lewat API dengan judul dan isi bebas,
--      sehingga siapa pun bisa mengirim notifikasi palsu ke pembeli.
--   3. _create_spk_process_steps, _sync_spk_notary_status, dan
--      sync_poliland_transaction_status bisa dipanggil anon dan mengubah data.
--   4. Semua akun login bisa membaca seluruh tabel profiles (nama dan peran semua pengguna).
--
-- Pemeriksaan sebelum perubahan:
--   * View (1) tidak dipakai aplikasi, fungsi, maupun view lain.
--   * Semua pemanggil fungsi (2) dan (3) adalah SECURITY DEFINER milik postgres,
--     jadi tetap berjalan setelah akses dari API dicabut.
--   * Layar pembeli hanya membaca profil miliknya sendiri.

begin;

-- 1. View ringkasan pembayaran -------------------------------------------------------------

alter view public.v_transaction_payment_summary set (security_invoker = true);
revoke all on public.v_transaction_payment_summary from public, anon, authenticated;

-- 2 dan 3. Fungsi internal -----------------------------------------------------------------

revoke execute on function public._notify_spk_parties(bigint, text, text, text, text, text)
  from public, anon, authenticated;
revoke execute on function public._create_spk_process_steps(bigint)
  from public, anon, authenticated;
revoke execute on function public._sync_spk_notary_status(bigint)
  from public, anon, authenticated;
revoke execute on function public.sync_poliland_transaction_status(bigint)
  from public, anon, authenticated;

-- 4. Profil --------------------------------------------------------------------------------
-- Pengguna tetap membaca profilnya sendiri lewat policy "Users can view own profile".
-- Akun internal membaca semua profil (nama pemasar, pengubah status, daftar tim).
-- current_app_role() adalah SECURITY DEFINER, jadi policy ini tidak rekursif.
-- Peran tidak bisa dinaikkan sendiri: dijaga trigger guard_profile_self_write.

drop policy if exists "Authenticated can read profiles" on public.profiles;
drop policy if exists "authenticated can read profiles" on public.profiles;
drop policy if exists "Authenticated users can read marketing profiles" on public.profiles;

drop policy if exists "Staff read profiles" on public.profiles;
create policy "Staff read profiles" on public.profiles
  for select to authenticated
  using ((select public.current_app_role()) in ('admin', 'owner', 'marketing_head', 'marketing'));

commit;

-- Rollback:
--   alter view public.v_transaction_payment_summary reset (security_invoker);
--   grant select on public.v_transaction_payment_summary to anon, authenticated;
--   grant execute on function public._notify_spk_parties(bigint, text, text, text, text, text) to anon, authenticated;
--   grant execute on function public._create_spk_process_steps(bigint) to anon, authenticated;
--   grant execute on function public._sync_spk_notary_status(bigint) to anon, authenticated;
--   grant execute on function public.sync_poliland_transaction_status(bigint) to anon, authenticated;
--   drop policy "Staff read profiles" on public.profiles;
--   create policy "Authenticated can read profiles" on public.profiles for select to authenticated using (true);
