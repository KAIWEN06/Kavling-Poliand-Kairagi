-- is_finance_admin() dipakai di policy RLS, sehingga harus dapat dieksekusi
-- oleh role yang mengevaluasi policy (authenticated). Sebelumnya EXECUTE hanya
-- dimiliki postgres & service_role -> "permission denied for function is_finance_admin".
-- Fungsi SECURITY DEFINER ini hanya mengembalikan boolean untuk user yang sedang login;
-- anon tetap tidak diberi akses.
grant execute on function public.is_finance_admin() to authenticated;
