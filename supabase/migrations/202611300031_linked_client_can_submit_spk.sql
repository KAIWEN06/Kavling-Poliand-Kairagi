-- Klien yang dicatat Marketing atau Admin bisa mengajukan SPK sendiri.
--
-- Masalah: sesudah verifikasi nomor (claim_customer_by_verified_phone), baris
-- customers tertaut ke akun tetapi registration_source tetap 'Marketing' atau
-- 'Admin' (trigger melarang sumber diubah). create_client_spk_request mencari
-- baris berdasarkan user_id DAN registration_source = 'Client', sehingga gagal
-- dengan "Data customer tidak ditemukan". user_id unik, jadi klien juga tidak
-- bisa membuat baris kedua.
--
-- Perbaikan: baris yang sudah tertaut ke akun dipakai apa pun sumbernya.
-- Pencarian cadangan lewat email (baris yang BELUM tertaut) sengaja tetap hanya
-- 'Client': email yang diketik Marketing bukan bukti kepemilikan, jadi baris
-- buatan Marketing hanya bisa ditautkan lewat verifikasi nomor.
--
-- Definisi fungsi diubah di tempat agar bagian lain, hak akses, dan aturan
-- harga tetap sama persis dengan yang sedang berjalan. Aman dijalankan ulang.

do $migration$
declare
  v_oid regprocedure :=
    'public.create_client_spk_request(text,text,text,text,text,bigint,numeric,text,bigint,numeric,integer,numeric,text)'::regprocedure;
  v_old constant text := '(WHERE user_id = v_user_id)\s+AND registration_source = ''Client''';
  v_def text := pg_get_functiondef(v_oid);
  v_matches integer;
begin
  select count(*) into v_matches from regexp_matches(v_def, v_old, 'g');

  if v_matches = 0 and v_def ~ 'WHERE user_id = v_user_id\s+FOR UPDATE' then
    raise notice 'create_client_spk_request sudah diperbaiki, tidak ada yang diubah.';
    return;
  end if;

  if v_matches <> 1 then
    raise exception 'Isi create_client_spk_request berbeda dari perkiraan (% kecocokan). Migrasi dibatalkan.', v_matches;
  end if;

  execute regexp_replace(v_def, v_old, '\1');
end
$migration$;
