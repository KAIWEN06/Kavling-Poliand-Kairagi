-- Perbaikan bucket Storage untuk fitur unggah. Aman dijalankan berulang.

-- 1. Video profil: bucket `videos` belum pernah dibuat. Sampul video disimpan di folder `thumbnails/`.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'videos', 'videos', true, 52428800,
  array['video/mp4', 'video/webm', 'video/ogg', 'video/quicktime', 'image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "videos_admin_select" on storage.objects;
create policy "videos_admin_select" on storage.objects for select to authenticated
  using (bucket_id = 'videos' and public._is_admin_user());

drop policy if exists "videos_admin_insert" on storage.objects;
create policy "videos_admin_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'videos' and public._is_admin_user());

drop policy if exists "videos_admin_update" on storage.objects;
create policy "videos_admin_update" on storage.objects for update to authenticated
  using (bucket_id = 'videos' and public._is_admin_user())
  with check (bucket_id = 'videos' and public._is_admin_user());

drop policy if exists "videos_admin_delete" on storage.objects;
create policy "videos_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'videos' and public._is_admin_user());

-- 2. Galeri: tanpa policy SELECT, perintah hapus tidak menghapus file dan tidak melapor error.
drop policy if exists "gallery_admin_select" on storage.objects;
create policy "gallery_admin_select" on storage.objects for select to authenticated
  using (bucket_id = 'gallery' and public._is_admin_user());

update storage.buckets
   set file_size_limit = 5242880,
       allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
 where id = 'gallery';

-- 3. Dokumen SPK: formulir menerima WEBP, tetapi bucket menolaknya.
update storage.buckets
   set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
 where id = 'spk-client-private-documents';
