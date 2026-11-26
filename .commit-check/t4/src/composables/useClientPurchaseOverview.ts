import { calculateFinanceBalance } from '@/composables/useFinanceCalculations'
import { computed, ref } from 'vue'
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

export function useClientPurchaseOverview() {
  const loading = ref(true)
  const error = ref('')
  const overview = ref<PurchaseOverview | null>(null)
  const otherLotCount = ref(0)

  const remaining = computed(() =>
    overview.value ? Math.max(0, overview.value.finalPrice - overview.value.paidTotal) : 0,
  )

  const progressPercent = computed(() => {
    const o = overview.value
    if (!o || o.finalPrice <= 0) return 0
    return Math.min(100, Math.round((o.paidTotal / o.finalPrice) * 100))
  })

  const paidInstallments = computed(() =>
    overview.value?.schedules.filter((s) => s.status === 'Paid').length ?? 0,
  )

  const nextSchedule = computed(() =>
    overview.value?.schedules.find((s) => s.status !== 'Paid') ?? null,
  )

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
        overview.value = null
        otherLotCount.value = 0
        return
      }

      const [transactionResult, paymentResult] = await Promise.all([
        supabase
          .from('lot_transactions')
          .select(`
            id, lot_id, status, payment_type, final_price, months, booking_date,
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

      error.value = ''
      const transactions = transactionResult.data ?? []
      otherLotCount.value = Math.max(0, transactions.length - 1)
      const tx: any = transactions[0]
      if (!tx) {
        overview.value = null
        return
      }

      let schedules: OverviewSchedule[] = []
      if (tx.payment_type === 'Installment') {
        const { data, error: scheduleError } = await supabase
          .from('installment_schedules')
          .select('id, installment_number, due_date, amount, status')
          .eq('transaction_id', tx.id)
          .order('installment_number', { ascending: true })
        if (scheduleError) throw scheduleError
        schedules = (data ?? []).map((row: any) => ({
          id: Number(row.id),
          installmentNumber: Number(row.installment_number),
          dueDate: row.due_date,
          amount: Number(row.amount ?? 0),
          status: row.status,
        }))
      }

      const payments: OverviewPayment[] = (paymentResult.data ?? [])
        .filter((row: any) => Number(row.transaction_id) === Number(tx.id))
        .map((row: any) => ({
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
      overview.value = {
        transactionId: Number(tx.id),
        lotId: Number(tx.lot_id),
        lotLabel: [blockName, lot?.lot_number].filter(Boolean).join(' - ') || lot?.lot_number || 'Kavling',
        area: lot?.area == null ? null : Number(lot.area),
        bookingDate: tx.booking_date ?? null,
        transactionStatus: tx.status,
        paymentType: tx.payment_type,
        months: tx.months == null ? null : Number(tx.months),
        finalPrice: Number(tx.final_price ?? 0),
        // Sama dengan Keuangan dan Pembeli: booking fee dilaporkan terpisah dan tidak mengurangi harga.
        paidTotal: calculateFinanceBalance(
          tx,
          (paymentResult.data ?? [])
            .filter((row: any) => Number(row.transaction_id) === Number(tx.id))
            .map((row: any) => ({ amount: Number(row.amount ?? 0), status: row.status, payment_category: row.payment_category })),
        ).principalPaid,
        pendingCount: payments.filter((p) => p.status === 'Pending' || p.status === 'Needs Reupload').length,
        schedules,
        payments,
      }
    } catch (cause: any) {
      console.error('[Beranda Klien] Gagal memuat ringkasan pembelian:', cause)
      if (silent) return
      error.value = cause?.message || 'Ringkasan pembelian belum dapat dimuat.'
      overview.value = null
    } finally {
      loading.value = false
    }
  }

  return { loading, error, overview, otherLotCount, remaining, progressPercent, paidInstallments, nextSchedule, load }
}
