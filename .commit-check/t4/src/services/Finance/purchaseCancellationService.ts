import { supabase } from '@/services/config/supabase'

export type PurchaseCancellationRequest = {
  id: number
  transaction_id: number
  customer_id: number
  reason: string
  created_at: string
  customer_name: string
  customer_phone: string | null
  lot_number: string
  block_name: string | null
}

export const purchaseCancellationService = {
  async getLatest(transactionId: number) {
    const { data, error } = await supabase
      .from('purchase_cancellation_requests')
      .select('id, status, reason, decision_note, created_at, purchase_refunds(amount, status, due_date)')
      .eq('transaction_id', transactionId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!data) return null
    const refund = Array.isArray(data.purchase_refunds) ? data.purchase_refunds[0] : data.purchase_refunds
    return { ...data, purchase_refunds: refund ? [refund] : [] }
  },

  async request(transactionId: number, reason: string): Promise<number> {
    const { data, error } = await supabase.rpc('request_purchase_cancellation', {
      p_transaction_id: transactionId,
      p_reason: reason,
    })
    if (error) throw new Error(`Pengajuan pembatalan gagal dikirim. Pastikan migrasi keuangan sudah diterapkan. ${error.message}`)
    if (!data) throw new Error('Server tidak mengembalikan nomor pengajuan pembatalan.')
    return Number(data)
  },

  async listPending(): Promise<PurchaseCancellationRequest[]> {
    const { data, error } = await supabase
      .from('purchase_cancellation_requests')
      .select(`
        id, transaction_id, customer_id, reason, created_at,
        customers(full_name, phone),
        lot_transactions(id, lot_id, lots(lot_number, blocks(name)))
      `)
      .eq('status', 'Pending')
      .order('created_at', { ascending: true })

    if (error) throw new Error(`Daftar pembatalan gagal dimuat. Jalankan migrasi SQL lalu coba lagi. ${error.message}`)

    return (data ?? []).map((row: any) => {
      const transaction = Array.isArray(row.lot_transactions) ? row.lot_transactions[0] : row.lot_transactions
      const lot = Array.isArray(transaction?.lots) ? transaction.lots[0] : transaction?.lots
      const customer = Array.isArray(row.customers) ? row.customers[0] : row.customers
      const block = Array.isArray(lot?.blocks) ? lot.blocks[0] : lot?.blocks
      return {
        id: Number(row.id),
        transaction_id: Number(row.transaction_id),
        customer_id: Number(row.customer_id),
        reason: row.reason,
        created_at: row.created_at,
        customer_name: customer?.full_name ?? 'Pembeli',
        customer_phone: customer?.phone ?? null,
        lot_number: lot?.lot_number ?? 'Kaveling tidak tersedia',
        block_name: block?.name ?? null,
      }
    })
  },

  async review(requestId: number, decision: 'Approved' | 'Rejected', note: string): Promise<number | null> {
    const { data, error } = await supabase.rpc('review_purchase_cancellation', {
      p_request_id: requestId,
      p_decision: decision,
      p_decision_note: note,
    })
    if (error) throw new Error(`Keputusan pembatalan gagal disimpan. ${error.message}`)
    return data == null ? null : Number(data)
  },
}
