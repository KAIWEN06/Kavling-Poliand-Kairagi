-- =====================================================================
-- Verifikasi RLS modul Marketing & Kepala Bagian Marketing
-- Jalankan SETELAH 202611230001 dan 202611230002 diterapkan.
--
-- Seluruh skrip berjalan dalam satu transaksi dan diakhiri ROLLBACK:
-- data uji (role sementara, client uji) TIDAK tersimpan.
-- Jalankan sebagai postgres (SQL editor Supabase), seluruh blok sekaligus.
--
-- Akun yang dipakai (sementara diubah role-nya di dalam transaksi):
--   764221bb-2004-4176-9e41-d6c2c07ee8d8  Asep Anjay  -> marketing A (role asli)
--   c6402f84-1d96-4725-ba50-3e3ab0c6d8ca  client02    -> marketing B (sementara)
--   96e4cbe2-9869-42d1-88e5-154e22f99277  owner123    -> marketing_head (sementara)
--   b6e79f60-6c99-452c-9a1f-f7cb3696c29c  client KEVIN (role asli client)
-- Setiap SELECT memberi kolom "lulus" = true jika hasil sesuai harapan.
-- =====================================================================

begin;

create table public.zz_hasil_uji (id bigint generated always as identity primary key, uji text, lulus boolean);
grant all on public.zz_hasil_uji to authenticated;

update public.profiles set role = 'marketing'      where id = 'c6402f84-1d96-4725-ba50-3e3ab0c6d8ca';
update public.profiles set role = 'marketing_head' where id = '96e4cbe2-9869-42d1-88e5-154e22f99277';

insert into public.customers (id, full_name, phone, marketing_id, registration_source)
overriding system value values
  (900001, 'UJI Client A', '081100000001', '764221bb-2004-4176-9e41-d6c2c07ee8d8', 'Marketing'),
  (900002, 'UJI Client B', '081100000002', 'c6402f84-1d96-4725-ba50-3e3ab0c6d8ca', 'Marketing');

-- ---------- Marketing A ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"764221bb-2004-4176-9e41-d6c2c07ee8d8","role":"authenticated"}', true);

insert into public.zz_hasil_uji (uji, lulus)
select 'A melihat client sendiri' as uji, count(*) = 1 as lulus from public.customers where id = 900001;
insert into public.zz_hasil_uji (uji, lulus)
select 'A TIDAK melihat client B' as uji, count(*) = 0 as lulus from public.customers where id = 900002;
insert into public.zz_hasil_uji (uji, lulus)
select 'A TIDAK melihat client self-registered tanpa marketing' as uji, count(*) = 0 as lulus from public.customers where marketing_id is null;
insert into public.zz_hasil_uji (uji, lulus)
select 'A TIDAK melihat activity_logs' as uji, count(*) = 0 as lulus from public.activity_logs;

-- Ambil alih client B harus gagal (0 baris terubah karena RLS).
with u as (update public.customers set full_name = 'DIAMBIL A' where id = 900002 returning 1)
insert into public.zz_hasil_uji (uji, lulus)
select 'A tidak dapat mengubah client B' as uji, count(*) = 0 as lulus from u;

-- Memindahkan client sendiri ke B harus ditolak trigger.
do $$ begin
  begin
    update public.customers set marketing_id = 'c6402f84-1d96-4725-ba50-3e3ab0c6d8ca' where id = 900001;
    insert into public.zz_hasil_uji (uji, lulus) values ('marketing_id berhasil diubah oleh Marketing', false);
  exception when others then
    insert into public.zz_hasil_uji (uji, lulus) values ('perubahan marketing_id ditolak', true);
  end;
end $$;

-- Insert dengan marketing_id orang lain dipaksa menjadi milik sendiri / ditolak RLS.
do $$ begin
  begin
    insert into public.customers (full_name, phone, marketing_id, registration_source)
    values ('UJI Spoof', '081100000099', 'c6402f84-1d96-4725-ba50-3e3ab0c6d8ca', 'Marketing');
    insert into public.zz_hasil_uji (uji, lulus) values ('Insert dengan marketing_id lain dipaksa menjadi milik A', (select marketing_id from public.customers where phone = '081100000099') = '764221bb-2004-4176-9e41-d6c2c07ee8d8');
  exception when others then
    insert into public.zz_hasil_uji (uji, lulus) values ('insert dengan marketing_id lain ditolak', true);
  end;
end $$;

-- Duplikasi nomor ditolak.
do $$ begin
  begin
    insert into public.customers (full_name, phone, registration_source) values ('UJI Duplikat', '+62 811-0000-0002', 'Marketing');
    insert into public.zz_hasil_uji (uji, lulus) values ('duplikasi nomor diterima', false);
  exception when others then
    insert into public.zz_hasil_uji (uji, lulus) values ('duplikasi nomor ditolak', true);
  end;
end $$;

-- Status CRM via RPC tercatat di riwayat dengan pelaku.
select public.update_customer_crm_status(900001, 'Follow-up', 'Uji perubahan status');
insert into public.zz_hasil_uji (uji, lulus)
select 'Riwayat CRM mencatat pelaku' as uji,
  exists (select 1 from public.customer_crm_status_history
          where customer_id = 900001 and new_status = 'Follow-up'
            and changed_by = '764221bb-2004-4176-9e41-d6c2c07ee8d8' and note = 'Uji perubahan status') as lulus;

do $$ begin
  begin
    perform public.update_customer_crm_status(900002, 'Berhasil', null);
    insert into public.zz_hasil_uji (uji, lulus) values ('A mengubah status client B', false);
  exception when others then
    insert into public.zz_hasil_uji (uji, lulus) values ('A tidak dapat mengubah status client B', true);
  end;
end $$;

-- Marketing tidak dapat menulis data keuangan.
with u as (update public.payments set status = 'Confirmed' where true returning 1)
insert into public.zz_hasil_uji (uji, lulus)
select 'A tidak dapat mengonfirmasi pembayaran' as uji, count(*) = 0 as lulus from u;
with u as (update public.spk_requests set status = 'Approved' where true returning 1)
insert into public.zz_hasil_uji (uji, lulus)
select 'A tidak dapat mengonfirmasi SPK' as uji, count(*) = 0 as lulus from u;
with u as (update public.installment_schedules set amount = 1 where true returning 1)
insert into public.zz_hasil_uji (uji, lulus)
select 'A tidak dapat mengubah jadwal cicilan' as uji, count(*) = 0 as lulus from u;

insert into public.zz_hasil_uji (uji, lulus)
select 'Laporan A hanya berisi dirinya' as uji,
  jsonb_array_length(public.get_marketing_report(current_date - 30, current_date, null) -> 'team') = 1 as lulus;

reset role;

-- ---------- Kepala Bagian Marketing ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"96e4cbe2-9869-42d1-88e5-154e22f99277","role":"authenticated"}', true);

insert into public.zz_hasil_uji (uji, lulus)
select 'Kepala melihat client A dan B' as uji, count(*) = 2 as lulus from public.customers where id in (900001, 900002);
insert into public.zz_hasil_uji (uji, lulus)
select 'Kepala MELIHAT client mandiri (tanpa marketing)' as uji, count(*) = (select count(*) from public.customers where marketing_id is null) as lulus from public.customers where marketing_id is null;
insert into public.zz_hasil_uji (uji, lulus)
select 'Kepala TIDAK melihat jurnal keuangan' as uji, count(*) = 0 as lulus from public.financial_journals;
insert into public.zz_hasil_uji (uji, lulus)
select 'Kepala TIDAK melihat activity_logs' as uji, count(*) = 0 as lulus from public.activity_logs;
with u as (update public.payments set status = 'Confirmed' where true returning 1)
insert into public.zz_hasil_uji (uji, lulus)
select 'Kepala tidak dapat mengonfirmasi pembayaran' as uji, count(*) = 0 as lulus from u;
with u as (update public.spk_requests set status = 'Rejected', rejection_reason = 'x' where true returning 1)
insert into public.zz_hasil_uji (uji, lulus)
select 'Kepala tidak dapat menolak SPK' as uji, count(*) = 0 as lulus from u;

do $$ begin
  begin
    perform public.admin_approve_spk_request(46);
    insert into public.zz_hasil_uji (uji, lulus) values ('Kepala dapat menyetujui SPK', false);
  exception when others then
    insert into public.zz_hasil_uji (uji, lulus) values ('Kepala tidak dapat menyetujui SPK', true);
  end;
end $$;

select public.update_customer_crm_status(900002, 'Negosiasi', 'Arahan kepala: tawarkan survey');
insert into public.zz_hasil_uji (uji, lulus)
select 'Kepala dapat mengubah perkembangan client tim' as uji,
  (select crm_status from public.customers where id = 900002) = 'Negosiasi' as lulus;

insert into public.zz_hasil_uji (uji, lulus)
select 'Laporan kepala mencakup tim' as uji,
  jsonb_array_length(public.get_marketing_report(current_date - 30, current_date, null) -> 'team') >= 3 as lulus;

reset role;

-- ---------- Client ----------
set local role authenticated;
select set_config('request.jwt.claims', '{"sub":"b6e79f60-6c99-452c-9a1f-f7cb3696c29c","role":"authenticated","email":"x@example.invalid"}', true);

insert into public.zz_hasil_uji (uji, lulus)
select 'Client hanya melihat data customer sendiri' as uji,
  count(*) = count(*) filter (where user_id = 'b6e79f60-6c99-452c-9a1f-f7cb3696c29c') as lulus from public.customers;
insert into public.zz_hasil_uji (uji, lulus)
select 'Client TIDAK melihat client uji Marketing' as uji, count(*) = 0 as lulus from public.customers where id in (900001, 900002);
insert into public.zz_hasil_uji (uji, lulus)
select 'Client TIDAK melihat catatan internal' as uji, count(*) = 0 as lulus from public.customer_notes;
insert into public.zz_hasil_uji (uji, lulus)
select 'Client TIDAK melihat follow-up' as uji, count(*) = 0 as lulus from public.customer_followups;

do $$ begin
  begin
    perform public.get_marketing_report(current_date - 30, current_date, null);
    insert into public.zz_hasil_uji (uji, lulus) values ('Client dapat membuka laporan Marketing', false);
  exception when others then
    insert into public.zz_hasil_uji (uji, lulus) values ('Client tidak dapat membuka laporan Marketing', true);
  end;
end $$;

insert into public.zz_hasil_uji (uji, lulus)
select 'Client tidak dapat menebak nomor terdaftar' as uji,
  public.customer_contact_exists('081100000001', null, null) = false as lulus;

reset role;

reset role;
do $$
declare r text;
begin
  select string_agg(case when lulus then 'LULUS  ' else 'GAGAL  ' end || uji, E'
' order by id) into r from public.zz_hasil_uji;
  raise exception E'HASIL UJI (transaksi dibatalkan, tidak ada data tersimpan):
%', r;
end $$;
rollback;
