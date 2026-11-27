import { calculateFinanceBalance } from '@/composables/useFinanceCalculations'
import { ref } from 'vue'
import { supabase } from '@/services/config/supabase'
import type { LoadOptions } from '@/composables/useRealtimeRefresh'

/**
 * Ringkasan pembelian untuk dashboard Client (hanya baca).
 * Memakai tabel dan kolom yang sama dengan halaman Pembayaran Client;
 * akses data dibatasi RLS ke akun yang login.
 */

export interface OverviewSchedule {
  id: number
  installmentNumber: number
  dueDate: string | null
  amount: number
  status: string
}

export interface OverviewPayment {
  id: number
  date: string | null
  amount: number
  method: string
  category: string
  status: string
  installmentNumbers: number[]
}

export interface PurchaseOverview {
  transactionId: number
  lotId: number
  lotLabel: string
  area: number | null
  bookingDate: string | null
  createdAt: string
  transactionStatus: string
  paymentType: 'Cash' | 'Installment'
  months: number | null
  finalPrice: number
  paidTotal: number
  pendingCount: number
  schedules: OverviewSchedule[]
  payments: OverviewPayment[]
}

const CATEGORY_LABEL: Record<string, string> = {
  Booking: 'Tanda Jadi',
  'Down Payment': 'Uang Muka',
  Installment: 'Cicilan',
  'Cash Purchase': 'Pembelian Tunai',
  Other: 'Lainnya',
}

function toOverview(tx: any, paymentRows: any[], scheduleRows: any[]): PurchaseOverview {
  const ownPayments = paymentRows.filter((row) => Number(row.transaction_id) === Number(tx.id))

  const schedules: OverviewSchedule[] = scheduleRows
    .filter((row) => Number(row.transaction_id) === Number(tx.id))
    .map((row) => ({
      id: Number(row.id),
      installmentNumber: Number(row.installment_number),
      // Sebelum PPJB tanggalnya masih sementara, jadi tidak dipakai.
      dueDate: row.due_date_official === false ? null : row.due_date,
      amount: Number(row.amount ?? 0),
      status: row.status,
    }))

  const payments: OverviewPayment[] = ownPayments.map((row) => ({
    id: Number(row.id),
    date: row.payment_date,
    amount: Number(row.amount ?? 0),
    method: row.payment_method || 'Tidak dicantumkan',
    category: CATEGORY_LABEL[row.payment_category] ?? row.payment_category ?? 'Pembayaran',
    status: row.status,
    installmentNumbers: (row.payment_allocations ?? [])
      .map((a: any) => a.installment_schedules?.installment_number)
      .filter((n: any) => n != null)
      .sort((a: number, b: number) => a - b),
  }))

  const lot = tx.lots
  const blockName = lot?.blocks?.name ?? lot?.blocks?.code

  return {
    transactionId: Number(tx.id),
    lotId: Number(tx.lot_id),
    lotLabel: [blockName, lot?.lot_number].filter(Boolean).join(' - ') || lot?.lot_number || 'Kavling',
    area: lot?.area == null ? null : Number(lot.area),
    bookingDate: tx.booking_date ?? null,
    createdAt: tx.created_at,
    transactionStatus: tx.status,
    paymentType: tx.payment_type,
    months: tx.months == null ? null : Number(tx.months),
    finalPrice: Number(tx.final_price ?? 0),
    // Sama dengan Keuangan dan Pembeli: booking fee dilaporkan terpisah dan tidak mengurangi harga.
    paidTotal: calculateFinanceBalance(
      tx,
      ownPayments.map((row) => ({ amount: Number(row.amount ?? 0), status: row.status, payment_category: row.payment_category })),
    ).principalPaid,
    pendingCount: payments.filter((p) => p.status === 'Pending' || p.status === 'Needs Reupload').length,
    schedules,
    payments,
  }
}

export function useClientPurchaseOverview() {
  const loading = ref(true)
  const error = ref('')
  const purchases = ref<PurchaseOverview[]>([])

  async function load({ silent = false }: LoadOptions = {}) {
    if (!silent) {
      loading.value = true
      error.value = ''
    }
    try {
      const { data: authData, error: authError } = await supabase.auth.getUser()
      if (authError) throw authError
      const user = authData.user
      if (!user) throw new Error('Sesi masuk tidak ditemukan. Silakan masuk kembali.')

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle()
      if (customerError) throw customerError
      if (!customer) {
        error.value = ''
        purchases.value = []
        return
      }

      const [transactionResult, paymentResult] = await Promise.all([
        supabase
          .from('lot_transactions')
          .select(`
            id, lot_id, status, payment_type, final_price, months, booking_date, created_at,
            lots(lot_number, area, blocks(name, code))
          `)
          .eq('customer_id', customer.id)
          .neq('status', 'Cancelled')
          .order('created_at', { ascending: false }),
        supabase
          .from('payments')
          .select(`
            id, transaction_id, payment_date, amount, payment_method, payment_category, status,
            payment_allocations(installment_schedules(installment_number))
          `)
          .eq('customer_id', customer.id)
          .order('payment_date', { ascending: false, nullsFirst: false })
          .order('created_at', { ascending: false }),
      ])
      if (transactionResult.error) throw transactionResult.error
      if (paymentResult.error) throw paymentResult.error

      const transactions: any[] = transactionResult.data ?? []
      const installmentIds = transactions
        .filter((tx) => tx.payment_type === 'Installment')
        .map((tx) => tx.id)

      let scheduleRows: any[] = []
      if (installmentIds.length) {
        const { data, error: scheduleError } = await supabase
          .from('installment_schedules')
          .select('id, transaction_id, installment_number, due_date, due_date_official, amount, status')
          .in('transaction_id', installmentIds)
          .order('installment_number', { ascending: true })
        if (scheduleError) throw scheduleError
        scheduleRows = data ?? []
      }

      error.value = ''
      purchases.value = transactions.map((tx) => toOverview(tx, paymentResult.data ?? [], scheduleRows))
    } catch (cause: any) {
      console.error('[Beranda Klien] Gagal memuat ringkasan pembelian:', cause)
      if (silent) return
      error.value = cause?.message || 'Ringkasan pembelian belum dapat dimuat.'
      purchases.value = []
    } finally {
      loading.value = false
    }
  }

  return { loading, error, purchases, load }
}
