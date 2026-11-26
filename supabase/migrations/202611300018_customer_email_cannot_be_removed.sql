-- Email pembeli yang sudah terisi tidak boleh dikosongkan, dari jalur mana pun.
-- Boleh diganti dengan email lain. Baris lama yang emailnya masih kosong tidak terdampak.

create or replace function public.prevent_customer_email_removal()
returns trigger language plpgsql set search_path = public as $$
begin
  if nullif(btrim(old.email), '') is not null and nullif(btrim(new.email), '') is null then
    raise exception 'Email pembeli tidak bisa dihapus.' using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

drop trigger if exists customers_keep_email on public.customers;
create trigger customers_keep_email
  before update of email on public.customers
  for each row execute function public.prevent_customer_email_removal();
