import { supabase } from '@/services/config/supabase'

type ReconciliationStatus = 'Matched' | 'Mismatch' | 'Needs Review'

export const financialGovernanceService = {
  async correctSpkLot(spkRequestId: number, newLotId: number, reason: string) {
    const { data, error } = await supabase.rpc('correct_spk_lot', {
      p_spk_request_id: spkRequestId,
      p_new_lot_id: newLotId,
      p_reason: reason,
    })
    if (error) throw error
    return Number(data)
  },

  async reviewPayment(paymentId: number, status: 'Confirmed' | 'Rejected' | 'Needs Reupload', note: string, transferDate?: string) {
    const { data, error } = await supabase.rpc('review_payment_with_transfer_date', {
      p_payment_id: paymentId,
      p_status: status,
      p_review_note: note,
      p_transfer_date: status === 'Confirmed' ? transferDate ?? null : null,
    })
    if (error) throw error
    return data
  },

  async calculatePenalty(scheduleId: number, transferDate: string) {
    const { data, error } = await supabase.rpc('calculate_installment_penalty', {
      p_schedule_id: scheduleId,
      p_valid_transfer_date: transferDate,
    })
    if (error) throw error
    return data
  },

  async detectDefaults(asOfDate?: string) {
    const { data, error } = await supabase.rpc('detect_installment_defaults', {
      p_as_of: asOfDate ?? null,
    })
    if (error) throw error
    return Number(data ?? 0)
  },

  async waivePenalties(transactionId: number, reason: string) {
    const { data, error } = await supabase.rpc('waive_installment_penalties_for_transaction', {
      p_transaction_id: transactionId,
      p_reason: reason,
    })
    if (error) throw error
    return Number(data ?? 0)
  },

  async reconcile(transactionId: number, reference: string, transactionDate: string, amount: number, note?: string) {
    const { data, error } = await supabase.rpc('reconcile_bank_transaction', {
      p_financial_transaction_id: transactionId,
      p_bank_reference: reference,
      p_bank_transaction_date: transactionDate,
      p_bank_amount: amount,
      p_resolution_note: note ?? null,
    })
    if (error) throw error
    return data as { status: ReconciliationStatus }
  },
}
