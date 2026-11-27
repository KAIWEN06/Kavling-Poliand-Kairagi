-- Bucket `lot-media` (panorama kavling): hanya Admin yang boleh mengunggah, mengubah, dan menghapus.
-- Aman dijalankan berulang.
-- Policy bersifat permisif (digabung dengan OR), jadi policy lama wajib dibuang.
-- Policy baca publik tidak diubah: panorama tetap tampil bagi pengunjung.

begin;

drop policy if exists "Authenticated Upload lot-media" on storage.objects;
drop policy if exists "Authenticated Update lot-media" on storage.objects;
drop policy if exists "Authenticated Delete lot-media" on storage.objects;

drop policy if exists "lot_media_admin_insert" on storage.objects;
create policy "lot_media_admin_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'lot-media' and public._is_admin_user());

drop policy if exists "lot_media_admin_update" on storage.objects;
create policy "lot_media_admin_update" on storage.objects for update to authenticated
  using (bucket_id = 'lot-media' and public._is_admin_user())
  with check (bucket_id = 'lot-media' and public._is_admin_user());

drop policy if exists "lot_media_admin_delete" on storage.objects;
create policy "lot_media_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'lot-media' and public._is_admin_user());

commit;
