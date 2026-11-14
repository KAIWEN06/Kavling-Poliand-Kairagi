export type FinancePaymentCategory = 'Booking' | 'Down Payment' | 'Installment' | 'Cash Purchase' | 'Other' | 'Unclassified'

export type FinancePaymentStatus = 'Pending' | 'Confirmed' | 'Rejected' | 'Needs Reupload'

export interface FinancePaymentRecord {
  id: number
  transaction_id: number | null
  lot_id: number | null
  customer_id: number | null
  amount: number | null
  payment_date: string | null
  payment_method: string | null
  payment_category: string | null
  status: FinancePaymentStatus
  note: string | null
  proof_path?: string | null
  created_at: string
}

export interface FinanceTransactionRecord {
  id: number
  lot_id: number
  customer_id?: number | null
  status: string
  payment_type: string
  price_at_booking: number | null
  final_price: number | null
  down_payment: number | null
  booking_fee: number | null
  principal_amount: number | null
  margin_amount: number | null
  installment_total: number | null
  monthly_payment: number | null
  months: number | null
  installment_start_date: string | null
  booking_date: string | null
  lots?: FinanceLotRecord | null
}

export interface FinanceLotRecord {
  id: number
  lot_number: string
  area?: number | null
  cash_price?: number | null
  payment_type?: string | null
  blocks?: { name: string } | null
}

export interface FinanceCustomerRecord {
  id: number
  full_name: string
  phone: string | null
  whatsapp_phone: string | null
  created_at: string
  payments: FinancePaymentRecord[]
  lot_transactions: FinanceTransactionRecord[]
  lots?: FinanceLotRecord[]
  marketing?: { full_name: string | null } | null
  marketing_profile?: { full_name: string | null } | null
}

export interface FinanceBalance {
  bookingFeePaid: number
  principalPaid: number
  totalPaid: number
  obligation: number
  remaining: number
  progress: number
}
