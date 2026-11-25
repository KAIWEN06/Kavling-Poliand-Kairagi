-- Deskripsi kavling yang hanya berisi frasa status ("Sudah terjual", "Dipesan", dst.)
-- sering tertinggal setelah status berubah dan bertentangan dengan kolom status.
-- Status adalah sumber kebenaran, jadi frasa seperti itu dikosongkan.
update public.lots
set description = null
where description is not null
  and btrim(description) ~* '^(sudah |telah |sedang )?(terjual|sold|dipesan|dibooking|booking|booked|reserved|tersedia|available)\.?$';
