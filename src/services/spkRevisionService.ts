import { supabase } from '@/services/config/supabase'

export type RevisionTerms = {
  spkRequestId: number
  lotId: number
  paymentMethod: 'Cash' | 'Installment'
  planId: number | null
  downPayment: number
}

export type RevisionQuote = {
  lot_number: string
  price: number
  down_payment: number
  months: number | null
  monthly_payment: number | null
  total_due: number
  carried_amount: number
  credit_to_installments: number
  remaining: number
  booking_fee_paid: number
  blockers: string[]
}

export type OrderRevision = {
  reason: string
  createdAt: string
  /** true selama pembeli belum menandatangani ulang SPK dan tanda jadi. */
  awaitingSignature: boolean
}

const termsParams = (terms: RevisionTerms) => ({
  p_spk_request_id: terms.spkRequestId,
  p_lot_id: terms.lotId,
  p_payment_method: terms.paymentMethod,
  p_plan_id: terms.paymentMethod === 'Installment' ? terms.planId : null,
  p_down_payment: terms.paymentMethod === 'Installment' ? terms.downPayment : 0,
})

/** Sama dengan _spk_revision_quote: setelah salah satu tahap ini selesai, revisi ditutup. */
const CLOSING_STEPS = ['ppjb', 'cicilan', 'ajb', 'shm', 'serah_terima']

export const spkRevisionService = {
  /**
   * Penghalang tetap saja (tahap sudah lewat atau pembelian tidak lagi Dipesan).
   * Penghalang sementara, misalnya pembayaran belum diverifikasi, dijelaskan
   * di dalam form revisi.
   */
  async isRevisable(spkRequestId: number, transactionId: number): Promise<boolean> {
    const [transaction, closed] = await Promise.all([
      supabase.from('lot_transactions').select('status').eq('id', transactionId).maybeSingle(),
      supabase
        .from('spk_process_steps')
        .select('id')
        .eq('spk_request_id', spkRequestId)
        .eq('status', 'done')
        .in('step_key', CLOSING_STEPS)
        .limit(1),
    ])
    if (transaction.error) throw transaction.error
    if (closed.error) throw closed.error
    return transaction.data?.status === 'Booking' && (closed.data ?? []).length === 0
  },

  /** Hitungan dari database, sama dengan yang dipakai saat revisi disimpan. */
  async quote(terms: RevisionTerms): Promise<RevisionQuote> {
    const { data, error } = await supabase.rpc('admin_quote_spk_revision', termsParams(terms))
    if (error) throw new Error(error.message)
    return data as RevisionQuote
  },

  async apply(terms: RevisionTerms, reason: string, expectedTotal: number): Promise<number> {
    const { data, error } = await supabase.rpc('admin_revise_spk_order', {
      ...termsParams(terms),
      p_reason: reason.trim(),
      p_expected_total: expectedTotal,
    })
    if (error) throw new Error(error.message)
    return Number(data)
  },

  /** Revisi terbaru sebuah pembelian; RLS membatasi ke pemilik dan Admin. */
  async getLatest(transactionId: number): Promise<OrderRevision | null> {
    const { data, error } = await supabase
      .from('spk_order_revisions')
      .select('reason, created_at, revised_spk_request_id')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    const { data: step } = await supabase
      .from('spk_process_steps')
      .select('status')
      .eq('spk_request_id', data.revised_spk_request_id)
      .eq('step_key', 'ttd_spk')
      .maybeSingle()
    return { reason: data.reason, createdAt: data.created_at, awaitingSignature: step?.status !== 'done' }
  },
}
