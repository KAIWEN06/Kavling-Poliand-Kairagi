import type { FinanceBalance, FinancePaymentRecord, FinanceTransactionRecord } from '@/types/finance'

export function isBookingFeePayment(payment: Pick<FinancePaymentRecord, 'payment_category'>): boolean {
  return payment.payment_category === 'Booking'
}

/**
 * Sama dengan v_transaction_payment_summary dan summarizeTransactionPayments():
 *   tagihan : cicilan = DP + total cicilan (sudah termasuk margin); cash = harga final.
 *   dibayar : cicilan = Down Payment + Installment; cash = Cash Purchase.
 * Booking Fee di luar tagihan dan dilaporkan terpisah.
 */
export function calculateFinanceBalance(
  transaction: FinanceTransactionRecord,
  payments: Array<{ amount: number | null; status: string; payment_category?: string | null; category?: string }>,
): FinanceBalance {
  const isInstallment = transaction.payment_type === 'Installment'
  const countedCategories = isInstallment ? ['Down Payment', 'Installment'] : ['Cash Purchase']
  const confirmed = payments.filter((payment) => payment.status === 'Confirmed')
  const sumOf = (categories: string[]) => confirmed
    .filter((payment) => categories.includes(payment.payment_category ?? payment.category ?? ''))
    .reduce((sum, payment) => sum + Math.max(0, Number(payment.amount ?? 0)), 0)

  const bookingFeePaid = sumOf(['Booking'])
  const principalPaid = sumOf(countedCategories)
  const installmentTotal = Number(transaction.installment_total ?? 0)
  const obligation = Math.max(0, isInstallment && installmentTotal > 0
    ? Number(transaction.down_payment ?? 0) + installmentTotal
    : Number(transaction.final_price ?? transaction.principal_amount ?? 0))
  const remaining = Math.max(0, obligation - principalPaid)

  return {
    bookingFeePaid,
    principalPaid,
    totalPaid: bookingFeePaid + principalPaid,
    obligation,
    remaining,
    progress: obligation > 0 ? Math.min(100, (principalPaid / obligation) * 100) : 0,
  }
}
