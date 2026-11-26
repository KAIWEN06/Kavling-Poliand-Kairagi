import { supabase } from '@/services/config/supabase'
import { calculateFinanceBalance } from '@/composables/useFinanceCalculations'
import type { ReviewMilestone } from '@/utils/reviewPrompt'

/**
 * Momen yang sudah dilalui Client. Hanya pembayaran terverifikasi dan survei
 * yang ditandai selesai oleh Admin yang dihitung. Akses dibatasi RLS.
 */
export async function getReachedReviewMilestones(userId: string): Promise<ReviewMilestone[]> {
  const reached: ReviewMilestone[] = []

  const survey = await supabase
    .from('survey_requests')
    .select('id')
    .eq('client_id', userId)
    .eq('status', 'completed')
    .limit(1)
  if (survey.error) throw survey.error
  if (survey.data?.length) reached.push('survey_done')

  const customer = await supabase.from('customers').select('id').eq('user_id', userId).maybeSingle()
  if (customer.error) throw customer.error
  if (!customer.data) return reached

  const [transactions, payments] = await Promise.all([
    supabase
      .from('lot_transactions')
      .select('id, payment_type, final_price')
      .eq('customer_id', customer.data.id)
      .neq('status', 'Cancelled'),
    supabase
      .from('payments')
      .select('transaction_id, amount, status, payment_category')
      .eq('customer_id', customer.data.id)
      .eq('status', 'Confirmed'),
  ])
  if (transactions.error) throw transactions.error
  if (payments.error) throw payments.error

  for (const tx of (transactions.data ?? []) as any[]) {
    const own = ((payments.data ?? []) as any[]).filter((p) => Number(p.transaction_id) === Number(tx.id))
    if (own.some((p) => p.payment_category === 'Booking')) reached.push('booking_paid')
    const balance = calculateFinanceBalance(tx, own)
    if (balance.obligation > 0 && balance.remaining === 0) reached.push('paid_off')
  }

  return [...new Set(reached)]
}
