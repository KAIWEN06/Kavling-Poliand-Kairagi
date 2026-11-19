import { supabase } from '@/services/config/supabase'

export type NotaryStatus =
  | 'Menunggu Diproses'
  | 'Diproses'
  | 'Proses Notaris'
  | 'Penandatanganan Notaris'
  | 'Selesai'

export interface SPKReviewData {
  request: any
  transaction: any
  schedules: any[]
  commission: any | null
  history: any[]
}

const fail = (error: { message: string } | null) => {
  if (error) throw new Error(error.message)
}

export async function getSPKReview(
  spkId: number,
  transactionId: number,
): Promise<SPKReviewData> {
  const [request, transaction, schedules, commission, history] =
    await Promise.all([
      supabase
        .from('spk_requests')
        .select('*, customers(full_name, phone), lots(lot_number, blocks(name)), profiles:marketing_id(full_name)')
        .eq('id', spkId)
        .single(),

      supabase
        .from('lot_transactions')
        .select('*')
        .eq('id', transactionId)
        .single(),

      supabase
        .from('installment_schedules')
        .select('*')
        .eq('transaction_id', transactionId)
        .order('installment_number'),

      supabase
        .from('marketing_commissions')
        .select('*, profiles:marketing_id(full_name)')
        .eq('transaction_id', transactionId)
        .maybeSingle(),

      supabase
        .from('spk_review_activity')
        .select('*, profiles:changed_by(full_name)')
        .eq('spk_request_id', spkId)
        .order('created_at', { ascending: false }),
    ])

  ;[request, transaction, schedules, commission, history].forEach(result =>
    fail(result.error),
  )

  if (!request.data || !transaction.data) {
    throw new Error('Data SPK atau transaksi tidak ditemukan.')
  }

  return {
    request: request.data,
    transaction: transaction.data,
    schedules: schedules.data || [],
    commission: commission.data,
    history: history.data || [],
  }
}

/**
 * Memperbarui satu tanggal jatuh tempo cicilan.
 * Jadwal yang sudah Paid dikunci agar riwayat pembayaran tidak berubah.
 */
export async function updateInstallmentSchedule(
  id: number,
  dueDate: string,
): Promise<void> {
  if (!Number.isInteger(id) || id <= 0) {
    throw new Error('ID jadwal cicilan tidak valid.')
  }

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dueDate)) {
    throw new Error('Format tanggal jatuh tempo tidak valid.')
  }

  const { data: row, error: readError } = await supabase
    .from('installment_schedules')
    .select('id, status')
    .eq('id', id)
    .single()

  fail(readError)

  if (!row) throw new Error('Jadwal cicilan tidak ditemukan.')
  if (row.status === 'Paid') {
    throw new Error('Pembayaran yang sudah lunas tidak dapat diubah.')
  }

  const { error } = await supabase
    .from('installment_schedules')
    .update({
      due_date: dueDate,
      updated_at: new Date().toISOString(),
    })
    .eq('id', id)
    .neq('status', 'Paid')

  fail(error)
}

export async function updateNotaryProgress(
  spkId: number,
  status: NotaryStatus,
  note: string,
): Promise<void> {
  const { data: actor, error: actorError } = await supabase.auth.getUser()
  fail(actorError)

  const { data: current, error: readError } = await supabase
    .from('spk_requests')
    .select('notary_status, payment_method, transaction_id')
    .eq('id', spkId)
    .single()

  fail(readError)

  if (!current) throw new Error('Data SPK tidak ditemukan.')

  // Pastikan seluruh jadwal cicilan memiliki tanggal sebelum proses notaris selesai.
  if (status === 'Selesai' && current.payment_method === 'Installment') {
    if (!current.transaction_id) {
      throw new Error('Transaksi SPK belum tersedia.')
    }

    const { data: schedules, error: scheduleError } = await supabase
      .from('installment_schedules')
      .select('id, installment_number, due_date')
      .eq('transaction_id', current.transaction_id)

    fail(scheduleError)

    if (!schedules?.length) {
      throw new Error('Jadwal cicilan belum tersedia.')
    }

    const missing = schedules.find(item => !item.due_date)
    if (missing) {
      throw new Error(
        `Tanggal jatuh tempo Cicilan #${missing.installment_number} belum diisi.`,
      )
    }
  }

  const { error } = await supabase
    .from('spk_requests')
    .update({
      notary_status: status,
      notary_note: note.trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', spkId)

  fail(error)

  const { error: historyError } = await supabase
    .from('spk_review_activity')
    .insert({
      spk_request_id: spkId,
      old_status: current.notary_status || null,
      new_status: status,
      note: note.trim() || null,
      changed_by: actor.user?.id || null,
    })

  fail(historyError)
}
