-- Menghapus skema yang tidak dipakai (audit 27 November 2026).
-- Diperiksa terhadap: src, supabase/functions, ../poliland-web/src, serta
-- fungsi, trigger, view, policy, dan foreign key di database aktif.
--
--   public.media             : 0 baris, tidak pernah dibaca atau ditulis.
--   activity_logs.ip_address : tidak pernah diisi, tidak dirujuk.
--   bank_accounts.created_by : tidak pernah diisi, tidak dirujuk.
--
-- Migrasi berhenti tanpa mengubah apa pun jika salah satunya ternyata sudah
-- berisi data. Tidak memakai CASCADE: objek lain yang masih bergantung akan
-- membuat perintah gagal.

begin;

do $$
begin
  if exists (select 1 from public.media) then
    raise exception 'public.media sudah berisi data, penghapusan dibatalkan';
  end if;
  if exists (select 1 from public.activity_logs where ip_address is not null) then
    raise exception 'activity_logs.ip_address sudah berisi data, penghapusan dibatalkan';
  end if;
  if exists (select 1 from public.bank_accounts where created_by is not null) then
    raise exception 'bank_accounts.created_by sudah berisi data, penghapusan dibatalkan';
  end if;
end $$;

drop table public.media;
alter table public.activity_logs drop column ip_address;
alter table public.bank_accounts drop column created_by;

commit;
