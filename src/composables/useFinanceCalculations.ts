import type { FinanceBalance, FinancePaymentRecord, FinanceTransactionRecord } from '@/types/finance'

export function isBookingFeePayment(payment: Pick<FinancePaymentRecord, 'payment_category'>): boolean {
  return payment.payment_category === 'Booking'
}

/**
 * Booking Fee is reported separately and never reduces principal automatically.
 * The database remains the source of truth for the obligation amount.
 */
export function calculateFinanceBalance(
  transaction: FinanceTransactionRecord,
  payments: Array<{ amount: number | null; status: string; payment_category?: string | null; category?: string }>,
): FinanceBalance {
  const confirmed = payments.filter((payment) => payment.status === 'Confirmed')
  const bookingFeePaid = confirmed
    .filter((payment) => payment.payment_category === 'Booking' || payment.category === 'Booking')
    .reduce((sum, payment) => sum + Math.max(0, Number(payment.amount ?? 0)), 0)
  const principalPaid = confirmed
    .filter((payment) => payment.payment_category !== 'Booking' && payment.category !== 'Booking')
    .reduce((sum, payment) => sum + Math.max(0, Number(payment.amount ?? 0)), 0)
  const obligation = Math.max(0, Number(
    transaction.payment_type === 'Installment'
      ? transaction.installment_total ?? transaction.final_price ?? transaction.principal_amount ?? 0
      : transaction.final_price ?? transaction.principal_amount ?? 0,
  ))
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
