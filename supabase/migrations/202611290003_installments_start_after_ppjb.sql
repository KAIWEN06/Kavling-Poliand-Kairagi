-- =====================================================================
-- Cicilan 1 jatuh di bulan berikutnya setelah PPJB
--
-- Saat SPK disetujui, jadwal cicilan dibuat dari tanggal persetujuan.
-- Prosedur: cicilan 1 dibayar di bulan setelah PPJB di notaris, tanggalnya
-- ditentukan saat PPJB. Saat langkah PPJB diselesaikan, tanggal jatuh tempo
-- cicilan yang belum lunas digeser: cicilan ke-n = tanggal PPJB + n bulan.
-- Admin tetap bisa mengubah tanggal per cicilan di halaman Tinjau SPK.
-- Jalankan setelah 202611290001_spk_process_timeline.sql.
-- =====================================================================

create or replace function public.trg_spk_ppjb_shift_schedules()
returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  v_tx_id bigint;
  v_base date := (now() at time zone 'Asia/Makassar')::date;
begin
  if new.step_key <> 'ppjb' or new.status <> 'done' or old.status = 'done' then
    return new;
  end if;

  select transaction_id into v_tx_id from public.spk_requests where id = new.spk_request_id;
  if v_tx_id is null then return new; end if;

  update public.installment_schedules
     set due_date = (v_base + make_interval(months => installment_number))::date,
         updated_at = now()
   where transaction_id = v_tx_id and status <> 'Paid';

  update public.lot_transactions
     set installment_start_date = (v_base + interval '1 month')::date, updated_at = now()
   where id = v_tx_id;

  return new;
end;
$$;

drop trigger if exists trg_spk_ppjb_shift_schedules on public.spk_process_steps;
create trigger trg_spk_ppjb_shift_schedules
  after update of status on public.spk_process_steps
  for each row execute function public.trg_spk_ppjb_shift_schedules();
