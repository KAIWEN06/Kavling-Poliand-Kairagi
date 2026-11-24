-- =============================================================================
-- Penahanan kavling oleh SPK aktif: guard konsisten untuk semua jalur + batas 24 jam
--
-- Latar belakang
--   * create_client_spk_request dan create_marketing_spk_request sudah menolak
--     SPK baru bila kavling punya SPK aktif.
--   * Jalur Admin (createAdminSPKRequest) meng-INSERT langsung ke spk_requests
--     tanpa pengecekan itu. Satu-satunya pelindung adalah unique index parsial
--     idx_spk_active_lot_unique, yang (a) memberi pesan galat mentah dan
--     (b) tidak menutup kavling yang SPK-nya sudah Approved + punya transaksi
--     (status kavling 'Booking'), sehingga Admin bisa membuat SPK baru di sana.
--   * SPK yang tidak pernah dibayar menahan kavling tanpa batas waktu.
--
-- Isi migrasi
--   1. expire_stale_spk_requests(): batalkan SPK 'Submitted' tanpa pembayaran
--      Booking Fee setelah 24 jam. pg_cron tidak terpasang, jadi pembatalan
--      dilakukan "lazy" saat ada yang membuat SPK atau membaca daftar kavling
--      yang ditahan.
--   2. Trigger BEFORE INSERT pada spk_requests: satu guard untuk semua role
--      (Client, Marketing, Admin).
--   3. get_lots_held_by_spk(): daftar kavling yang sedang ditahan SPK lain,
--      untuk peringatan di UI klien. Hanya lot_id dan batas waktu penahanan.
--
-- Tidak mengubah admin_approve_spk_request maupun RPC pembuatan SPK yang ada.
-- Aman dijalankan ulang.
-- =============================================================================

-- ---------------------------------------------------------------------------
-- 1. Pembatalan otomatis SPK yang tidak dibayar dalam 24 jam
-- ---------------------------------------------------------------------------
create or replace function public.expire_stale_spk_requests()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  with expired as (
    update public.spk_requests s
    set status = 'Cancelled',
        admin_note = coalesce(nullif(btrim(s.admin_note), '') || E'\n', '')
          || 'Dibatalkan otomatis: Booking Fee belum dibayar dalam 24 jam.',
        updated_at = now()
    where s.status = 'Submitted'
      and s.transaction_id is null
      and s.submitted_at < now() - interval '24 hours'
      -- Hanya SPK yang belum punya pembayaran Booking Fee sama sekali.
      -- Bukti yang sudah diunggah (Pending / Needs Reupload / Confirmed)
      -- tidak boleh dibatalkan sistem; itu urusan verifikasi Admin Keuangan.
      and not exists (
        select 1
        from public.payments p
        where p.spk_request_id = s.id
          and p.payment_category = 'Booking'
      )
    returning s.id
  )
  select count(*) into v_count from expired;

  return v_count;
end;
$$;

revoke all on function public.expire_stale_spk_requests() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. Guard INSERT untuk semua jalur pembuatan SPK
-- ---------------------------------------------------------------------------
create or replace function public.guard_spk_lot_availability()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_lot_status text;
begin
  -- Hanya pengajuan baru yang menahan kavling.
  if new.status not in ('Submitted', 'Under Review') then
    return new;
  end if;

  -- Lepaskan kavling dari SPK lama yang tidak pernah dibayar.
  perform public.expire_stale_spk_requests();

  -- Kunci baris kavling agar dua pengajuan bersamaan diurutkan.
  select lower(btrim(l.status))
  into v_lot_status
  from public.lots l
  where l.id = new.lot_id
  for update;

  if not found then
    raise exception 'Kavling tidak ditemukan.';
  end if;

  if v_lot_status not in ('available', 'tersedia') then
    raise exception 'Kavling sudah tidak tersedia.';
  end if;

  if exists (
    select 1
    from public.spk_requests s
    where s.lot_id = new.lot_id
      and s.status in ('Submitted', 'Under Review', 'Approved')
  ) then
    raise exception 'Kavling sedang memiliki pengajuan SPK aktif. Silakan pilih kavling lain.';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_spk_lot_availability() from public, anon, authenticated;

drop trigger if exists trg_guard_spk_lot_availability on public.spk_requests;
create trigger trg_guard_spk_lot_availability
before insert on public.spk_requests
for each row execute function public.guard_spk_lot_availability();

-- ---------------------------------------------------------------------------
-- 3. Daftar kavling yang sedang ditahan SPK lain (untuk peringatan di UI)
-- ---------------------------------------------------------------------------
-- SECURITY DEFINER karena klien tidak boleh membaca spk_requests milik orang
-- lain. Fungsi ini sengaja hanya membuka lot_id dan batas waktu penahanan.
-- holds_until terisi selama SPK belum punya pembayaran Booking Fee; setelah
-- bukti bayar diunggah, penahanan berlangsung sampai Admin memutuskan (NULL).
create or replace function public.get_lots_held_by_spk()
returns table (lot_id bigint, holds_until timestamptz)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null then
    raise exception 'Silakan login terlebih dahulu.';
  end if;

  perform public.expire_stale_spk_requests();

  return query
  select distinct on (s.lot_id)
    s.lot_id,
    case
      when s.status = 'Submitted'
        and not exists (
          select 1
          from public.payments p
          where p.spk_request_id = s.id
            and p.payment_category = 'Booking'
        )
      then s.submitted_at + interval '24 hours'
      else null
    end
  from public.spk_requests s
  where s.status in ('Submitted', 'Under Review')
  order by s.lot_id, s.submitted_at desc;
end;
$$;

revoke all on function public.get_lots_held_by_spk() from public, anon;
grant execute on function public.get_lots_held_by_spk() to authenticated;
