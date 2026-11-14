import { supabase } from '@/services/config/supabase'

export type InstallmentScheduleRecord = {
  id: number
  transaction_id: number
  installment_number: number
  due_date: string
  amount: number
  status: 'Pending' | 'Paid' | 'Overdue'
  pending_payment?: boolean
}

export type PaymentAllocationInput = {
  installment_schedule_id: number
  allocated_amount: number
}

export type PaymentRecord = {
  id: number
  customer_id: number | null
  lot_id: number | null
  transaction_id: number | null
  payment_date: string | null
  amount: number | null
  payment_method: string | null
  payment_category: string
  reference_number: string | null
  proof_path: string | null
  note: string | null
  review_note: string | null
  status: 'Pending' | 'Confirmed' | 'Rejected' | 'Needs Reupload'
  created_at: string
  verified_at: string | null
  verified_by: string | null
}

export type PaymentDetail = {
  payment: PaymentRecord
  customer: { id: number; full_name: string; phone: string | null; whatsapp_phone: string | null } | null
  lot: { id: number; lot_number: string; area: number | null; blocks?: { name: string } | null } | null
  transaction: {
    id: number
    payment_type: string
    final_price: number
    months: number | null
    monthly_payment: number | null
  } | null
  allocations: Array<{
    allocated_amount: number
    schedule: InstallmentScheduleRecord | null
  }>
}

const PAYMENTS = 'payments'
const SCHEDULES = 'installment_schedules'
const ALLOCATIONS = 'payment_allocations'
const PROOF_BUCKET = 'payment-proofs'

export const paymentService = {
  async getInstallmentSchedules(transactionId: number): Promise<InstallmentScheduleRecord[]> {
    const { data, error } = await supabase
      .from(SCHEDULES)
      .select('id, transaction_id, installment_number, due_date, amount, status, payment_allocations(allocated_amount, payments(status))')
      .eq('transaction_id', transactionId)
      .order('installment_number', { ascending: true })

    if (error) throw error
    return (data ?? []).map((row: any) => ({
      id: Number(row.id),
      transaction_id: Number(row.transaction_id),
      installment_number: Number(row.installment_number),
      due_date: row.due_date,
      amount: Number(row.amount),
      status: row.status,
      pending_payment: (row.payment_allocations ?? []).some((allocation: any) =>
        allocation.payments?.status === 'Pending' || allocation.payments?.status === 'Needs Reupload'
      ),
    })) as InstallmentScheduleRecord[]
  },

  async getPaymentDetail(paymentId: number): Promise<PaymentDetail> {
    const { data: paymentData, error: paymentError } = await supabase
      .from(PAYMENTS)
      .select('*')
      .eq('id', paymentId)
      .single()

    if (paymentError) throw paymentError
    const payment = paymentData as PaymentRecord

    const [customerResult, lotResult, transactionResult, allocationResult] = await Promise.all([
      payment.customer_id
        ? supabase.from('customers').select('id, full_name, phone, whatsapp_phone').eq('id', payment.customer_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      payment.lot_id
        ? supabase.from('lots').select('id, lot_number, area, blocks(name)').eq('id', payment.lot_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      payment.transaction_id
        ? supabase.from('lot_transactions').select('id, payment_type, final_price, months, monthly_payment').eq('id', payment.transaction_id).maybeSingle()
        : Promise.resolve({ data: null, error: null }),
      supabase.from(ALLOCATIONS).select('allocated_amount, installment_schedules(id, transaction_id, installment_number, due_date, amount, status)').eq('payment_id', paymentId),
    ])

    for (const result of [customerResult, lotResult, transactionResult, allocationResult]) {
      if (result.error) throw result.error
    }

    const allocations = (allocationResult.data ?? []).map((item: any) => ({
      allocated_amount: Number(item.allocated_amount),
      schedule: item.installment_schedules ? {
        ...item.installment_schedules,
        amount: Number(item.installment_schedules.amount),
      } as InstallmentScheduleRecord : null,
    }))

    return {
      payment,
      customer: customerResult.data as PaymentDetail['customer'],
      lot: lotResult.data as PaymentDetail['lot'],
      transaction: transactionResult.data as PaymentDetail['transaction'],
      allocations,
    }
  },

  async getMarketingName(customerId: number): Promise<string> {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('marketing_id')
      .eq('id', customerId)
      .maybeSingle()
    if (customerError) throw customerError
    if (!customer?.marketing_id) return ''

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', customer.marketing_id)
      .maybeSingle()
    if (profileError) throw profileError
    return profile?.full_name ?? ''
  },

  async getProofUrl(path: string): Promise<string> {
    const { data, error } = await supabase.storage.from(PROOF_BUCKET).createSignedUrl(path, 300)
    if (error) throw error
    return data.signedUrl
  },

  async uploadProof(file: File, transactionId: number): Promise<string> {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safeExtension = /^[a-z0-9]{2,5}$/.test(extension) ? extension : 'jpg'
    const path = `${transactionId}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`
    const { error } = await supabase.storage.from(PROOF_BUCKET).upload(path, file, {
      cacheControl: '3600',
      upsert: false,
      contentType: file.type || 'application/octet-stream',
    })
    if (error) throw error
    return path
  },

  async createPayment(input: {
    customer_id: number
    lot_id: number
    transaction_id: number
    payment_date: string
    amount: number
    payment_method: string
    payment_category: string
    reference_number: string | null
    proof_path: string
    note: string | null
    allocations: PaymentAllocationInput[]
  }): Promise<PaymentRecord> {
    const { allocations, ...paymentPayload } = input
    const { data, error } = await supabase
      .from(PAYMENTS)
      .insert({ ...paymentPayload, status: 'Pending' })
      .select('*')
      .single()

    if (error) {
      await supabase.storage.from(PROOF_BUCKET).remove([input.proof_path])
      throw error
    }

    if (allocations.length) {
      const rows = allocations.map((allocation) => ({ payment_id: data.id, ...allocation }))
      const { error: allocationError } = await supabase.from(ALLOCATIONS).insert(rows)
      if (allocationError) {
        await supabase.from(PAYMENTS).delete().eq('id', data.id)
        await supabase.storage.from(PROOF_BUCKET).remove([input.proof_path])
        throw allocationError
      }
    }

    return data as PaymentRecord
  },

  async reviewPayment(
    paymentId: number,
    status: 'Confirmed' | 'Rejected' | 'Needs Reupload',
    note: string | null,
  ): Promise<void> {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError

    const { data, error } = await supabase
      .from(PAYMENTS)
      .update({
        status,
        review_note: note,
        verified_by: status === 'Confirmed' ? authData.user?.id ?? null : null,
        verified_at: status === 'Confirmed' ? new Date().toISOString() : null,
      })
      .eq('id', paymentId)
      .eq('status', 'Pending')
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) throw new Error('Transaksi sudah ditinjau atau statusnya telah berubah. Muat ulang data sebelum melanjutkan.')
  },
}
