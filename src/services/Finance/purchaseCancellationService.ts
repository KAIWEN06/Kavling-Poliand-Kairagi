import { supabase } from '@/services/config/supabase'

/** Hasil public.get_purchase_cancellation_quote. Semua angka dihitung server. */
export type CancellationQuote = {
  transaction_id: number
  confirmed_down_payment: number
  confirmed_installments: number
  eligible_total: number
  refund_percent: number
  refund_amount: number
  withheld_amount: number
  booking_fee_paid: number
  pending_payments: number
  blockers: string[]
}

export type RefundRecipient = { bank: string; accountNumber: string; accountName: string }

export type DefaultNotice = {
  level: 1 | 2 | 3
  sent_date: string
  received_date: string | null
  delivery_method: string
}

export type ArrearsItem = {
  transaction_id: number
  schedule_id: number
  installment_number: number
  oldest_due_date: string
  days_overdue: number
  overdue_count: number
  overdue_amount: number
  notices: DefaultNotice[]
  extension_until: string | null
  hold_reason: string | null
  eligible: boolean
  customer_name: string | null
  customer_phone: string | null
  lot_number: string | null
}

export type PurchaseRefundRow = {
  id: number
  transaction_id: number
  amount: number
  status: 'Pending Transfer' | 'Paid' | 'Not Applicable'
  due_date: string
  transfer_date: string | null
  bank_reference: string | null
  proof_path: string | null
  recipient_bank: string | null
  recipient_account_number: string | null
  recipient_account_name: string | null
  customer_name: string
  lot_number: string
}

export type CancellableTransaction = { id: number; customer_name: string; lot_number: string }

export type PurchaseCancellationRequest = {
  id: number
  transaction_id: number
  customer_id: number
  reason: string
  created_at: string
  recipient_bank: string | null
  recipient_account_number: string | null
  recipient_account_name: string | null
  customer_name: string
  customer_phone: string | null
  lot_number: string
  block_name: string | null
}

const BUCKET = 'payment-proofs'
const MAX_FILE_SIZE = 5 * 1024 * 1024
const FILE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

const one = (value: any): any => (Array.isArray(value) ? value[0] : value)

async function uploadFile(folder: string, file: File): Promise<string> {
  if (!FILE_TYPES.includes(file.type)) throw new Error('Format berkas harus JPG, PNG, WEBP, atau PDF.')
  if (file.size > MAX_FILE_SIZE) throw new Error('Ukuran berkas maksimal 5 MB.')
  const path = `${folder}/${crypto.randomUUID()}.${file.name.split('.').pop()?.toLowerCase() || 'file'}`
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { contentType: file.type, upsert: false })
  if (error) throw new Error(`Berkas gagal diunggah. ${error.message}`)
  return path
}

async function removeUpload(path: string): Promise<void> {
  const { error } = await supabase.storage.from(BUCKET).remove([path])
  if (error) console.warn('[Pembatalan] Berkas yang batal dipakai belum terhapus:', error)
}

export const purchaseCancellationService = {
  async getLatest(transactionId: number) {
    const { data, error } = await supabase
      .from('purchase_cancellation_requests')
      .select('id, status, reason, decision_note, created_at, purchase_refunds(amount, status, due_date, transfer_date, proof_path)')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    const refund = one(data.purchase_refunds)
    return { ...data, purchase_refunds: refund ? [refund] : [] }
  },

  async request(transactionId: number, reason: string, recipient: RefundRecipient): Promise<number> {
    const { data, error } = await supabase.rpc('request_purchase_cancellation', {
      p_transaction_id: transactionId,
      p_reason: reason,
      p_recipient_bank: recipient.bank || null,
      p_recipient_account_number: recipient.accountNumber || null,
      p_recipient_account_name: recipient.accountName || null,
    })
    if (error) throw new Error(`Pengajuan pembatalan gagal dikirim. ${error.message}`)
    if (!data) throw new Error('Server tidak mengembalikan nomor pengajuan pembatalan.')
    return Number(data)
  },

  async withdraw(requestId: number): Promise<void> {
    const { error } = await supabase.rpc('withdraw_purchase_cancellation', { p_request_id: requestId })
    if (error) throw new Error(`Pengajuan belum bisa ditarik. ${error.message}`)
  },

  async getQuote(transactionId: number): Promise<CancellationQuote> {
    const { data, error } = await supabase.rpc('get_purchase_cancellation_quote', {
      p_transaction_id: transactionId,
    })
    if (error) throw new Error(`Rincian pengembalian gagal dihitung. ${error.message}`)
    return data as CancellationQuote
  },

  async listPending(): Promise<PurchaseCancellationRequest[]> {
    const { data, error } = await supabase
      .from('purchase_cancellation_requests')
      .select(`
        id, transaction_id, customer_id, reason, created_at,
        recipient_bank, recipient_account_number, recipient_account_name,
        customers(full_name, phone),
        lot_transactions(id, lot_id, lots(lot_number, blocks(name)))
      `)
      .eq('status', 'Pending')
      .order('created_at', { ascending: true })

    if (error) throw new Error(`Daftar pembatalan gagal dimuat. Jalankan migrasi SQL lalu coba lagi. ${error.message}`)

    return (data ?? []).map((row: any) => {
      const lot = one(one(row.lot_transactions)?.lots)
      const customer = one(row.customers)
      return {
        id: Number(row.id),
        transaction_id: Number(row.transaction_id),
        customer_id: Number(row.customer_id),
        reason: row.reason,
        created_at: row.created_at,
        recipient_bank: row.recipient_bank,
        recipient_account_number: row.recipient_account_number,
        recipient_account_name: row.recipient_account_name,
        customer_name: customer?.full_name ?? 'Pembeli',
        customer_phone: customer?.phone ?? null,
        lot_number: lot?.lot_number ?? 'Kaveling tidak tersedia',
        block_name: one(lot?.blocks)?.name ?? null,
      }
    })
  },

  async review(
    requestId: number,
    decision: 'Approved' | 'Rejected',
    note: string,
    expectedRefund: number | null = null,
  ): Promise<number | null> {
    const { data, error } = await supabase.rpc('review_purchase_cancellation', {
      p_request_id: requestId,
      p_decision: decision,
      p_decision_note: note,
      p_expected_refund: expectedRefund,
    })
    if (error) throw new Error(`Keputusan pembatalan gagal disimpan. ${error.message}`)
    return data == null ? null : Number(data)
  },

  async listCancellable(): Promise<CancellableTransaction[]> {
    const { data, error } = await supabase
      .from('lot_transactions')
      .select('id, customers(full_name), lots(lot_number)')
      .eq('status', 'Booking')
      .order('id', { ascending: false })
    if (error) throw new Error(`Daftar transaksi gagal dimuat. ${error.message}`)
    return (data ?? []).map((row: any) => ({
      id: Number(row.id),
      customer_name: one(row.customers)?.full_name ?? 'Pembeli',
      lot_number: one(row.lots)?.lot_number ?? '-',
    }))
  },

  uploadEvidence(transactionId: number, file: File) {
    return uploadFile(`cancellation/${transactionId}`, file)
  },

  removeUpload,

  async cancelDirect(input: {
    transactionId: number
    source: 'Admin' | 'Default'
    channel: string
    requestDate: string
    reason: string
    evidencePath: string | null
    recipient: RefundRecipient
    expectedRefund: number
  }): Promise<void> {
    const { error } = await supabase.rpc('admin_cancel_purchase', {
      p_transaction_id: input.transactionId,
      p_source: input.source,
      p_channel: input.channel,
      p_request_date: input.requestDate,
      p_reason: input.reason,
      p_evidence_path: input.evidencePath,
      p_recipient_bank: input.recipient.bank,
      p_recipient_account_number: input.recipient.accountNumber,
      p_recipient_account_name: input.recipient.accountName,
      p_expected_refund: input.expectedRefund,
    })
    if (error) throw new Error(`Pembelian belum dibatalkan. ${error.message}`)
  },

  async listArrears(): Promise<ArrearsItem[]> {
    const { data, error } = await supabase.rpc('get_arrears_queue')
    if (error) throw new Error(`Daftar tunggakan gagal dimuat. ${error.message}`)
    return (data ?? []) as ArrearsItem[]
  },

  async recordNotice(input: {
    transactionId: number
    level: number
    sentDate: string
    method: string
    receivedDate: string | null
  }): Promise<void> {
    const { error } = await supabase.rpc('admin_record_default_notice', {
      p_transaction_id: input.transactionId,
      p_level: input.level,
      p_sent_date: input.sentDate,
      p_delivery_method: input.method,
      p_received_date: input.receivedDate,
    })
    if (error) throw new Error(`Surat peringatan belum tersimpan. ${error.message}`)
  },

  async grantExtension(transactionId: number, untilDate: string, reason: string): Promise<void> {
    const { error } = await supabase.rpc('admin_grant_default_extension', {
      p_transaction_id: transactionId,
      p_until_date: untilDate,
      p_reason: reason,
    })
    if (error) throw new Error(`Perpanjangan belum tersimpan. ${error.message}`)
  },

  /** Yang menunggu transfer tampil dulu, diurutkan menurut batas waktunya. */
  async listRefunds(): Promise<PurchaseRefundRow[]> {
    const { data, error } = await supabase
      .from('purchase_refunds')
      .select(`
        id, transaction_id, amount, status, due_date, transfer_date, bank_reference, proof_path,
        recipient_bank, recipient_account_number, recipient_account_name,
        customers(full_name), lot_transactions(lots(lot_number))
      `)
      .neq('status', 'Not Applicable')
      .order('due_date', { ascending: true })
    if (error) throw new Error(`Daftar pengembalian gagal dimuat. ${error.message}`)
    return (data ?? [])
      .map((row: any) => ({
        ...row,
        amount: Number(row.amount),
        customer_name: one(row.customers)?.full_name ?? 'Pembeli',
        lot_number: one(one(row.lot_transactions)?.lots)?.lot_number ?? '-',
      }) as PurchaseRefundRow)
      .sort((a, b) => Number(a.status === 'Paid') - Number(b.status === 'Paid'))
  },

  async recordRefundPayment(refundId: number, transferDate: string, reference: string, proof: File): Promise<void> {
    const path = await uploadFile(`purchase-refund/${refundId}`, proof)
    const { error } = await supabase.rpc('record_purchase_refund_payment', {
      p_refund_id: refundId,
      p_transfer_date: transferDate,
      p_bank_reference: reference,
      p_proof_path: path,
    })
    if (error) {
      await removeUpload(path)
      throw new Error(`Transfer belum tercatat. ${error.message}`)
    }
  },
}
