import { supabase } from '@/services/config/supabase'

export type NotaryStatus = 'Diproses' | 'Proses Notaris' | 'Penandatanganan Notaris' | 'Selesai'
export interface SPKReviewData { request: any; transaction: any; schedules: any[]; commission: any | null; history: any[] }
const fail = (error: { message: string } | null) => { if (error) throw new Error(error.message) }

export async function getSPKReview(spkId: number, transactionId: number): Promise<SPKReviewData> {
  const [request, transaction, schedules, commission, history] = await Promise.all([
    supabase.from('spk_requests').select('*, customers(full_name, phone), lots(lot_number, blocks(name)), profiles:marketing_id(full_name)').eq('id', spkId).single(),
    supabase.from('lot_transactions').select('*').eq('id', transactionId).single(),
    supabase.from('installment_schedules').select('*').eq('transaction_id', transactionId).order('installment_number'),
    supabase.from('marketing_commissions').select('*, profiles:marketing_id(full_name)').eq('transaction_id', transactionId).maybeSingle(),
    supabase.from('spk_review_activity').select('*, profiles:changed_by(full_name)').eq('spk_request_id', spkId).order('created_at', { ascending: false }),
  ])
  ;[request, transaction, schedules, commission, history].forEach(result => fail(result.error))
  if (!request.data || !transaction.data) throw new Error('Data SPK atau transaksi tidak ditemukan.')
  return { request: request.data, transaction: transaction.data, schedules: schedules.data || [], commission: commission.data, history: history.data || [] }
}

export async function updateInstallmentSchedule(id: number, dueDate: string): Promise<void> {
  const { data: row, error: readError } = await supabase.from('installment_schedules').select('status').eq('id', id).single(); fail(readError)
  if (!row || row.status === 'Paid') throw new Error('Pembayaran yang sudah Confirmed tidak dapat diubah.')
  const result = await supabase.from('installment_schedules').update({ due_date: dueDate, updated_at: new Date().toISOString() }).eq('id', id); fail(result.error)
}

export async function updateNotaryProgress(spkId: number, status: NotaryStatus, note: string): Promise<void> {
  const { data: actor } = await supabase.auth.getUser()
  const { data: current, error: readError } = await supabase.from('spk_requests').select('notary_status').eq('id', spkId).single(); fail(readError)
  const { error } = await supabase.from('spk_requests').update({ notary_status: status, notary_note: note.trim() || null, updated_at: new Date().toISOString() }).eq('id', spkId); fail(error)
  const history = await supabase.from('spk_review_activity').insert({ spk_request_id: spkId, old_status: current?.notary_status || null, new_status: status, note: note.trim() || null, changed_by: actor.user?.id || null })
  fail(history.error)
}

