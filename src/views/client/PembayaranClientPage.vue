<script setup lang="ts">
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import AppNotice from '@/components/ui/AppNotice.vue'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import SkeletonDetailHeader from '@/components/ui/skeletons/SkeletonDetailHeader.vue'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { IonContent, IonIcon, IonPage, IonSpinner, useIonRouter } from '@ionic/vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import { usePagination } from '@/composables/usePagination'
import {
  chevronForward,
  searchOutline,
  cloudUploadOutline,
  gitCommitOutline,
} from 'ionicons/icons'

import AppHeader from '@/components/common/AppHeader.vue'
import { useOwnRouteQuery } from '@/composables/useOwnRouteQuery'
import { useRowFocus } from '@/composables/useRowFocus'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import DocumentViewerModal from '@/components/ui/DocumentViewerModal.vue'
import ReviewInvite from '@/components/reviews/ReviewInvite.vue'
import SlideToConfirm from '@/components/ui/SlideToConfirm.vue'
import { useCelebration } from '@/composables/useCelebration'
import { supabase } from '@/services/config/supabase'
import { paymentService } from '@/services/Finance/paymentService'
import { formatInstallmentRange, formatProgressLine, formatRupiah, summarizeInstallmentProgress } from '@/utils/installmentFormat'
import { currentStep, getSpkProcessSteps, spkPaymentPlan, spkStepInfo, stepIsDone, type SpkProcessStep } from '@/services/spkProcessService'
import { purchaseCancellationService } from '@/services/Finance/purchaseCancellationService'
import ClientCancellationModal from '@/components/finance/cancellation/ClientCancellationModal.vue'
import ClientRefundList from '@/components/finance/cancellation/ClientRefundList.vue'

/**
 * PENTING:
 * 1. Buat bucket Supabase Storage bernama payment-proofs (private).
 * 2. Buat RPC public.submit_client_payment sesuai SQL migration pendamping.
 * 3. RPC yang memvalidasi nominal, DP, urutan cicilan, kepemilikan transaksi,
 *    dan status SPK. Validasi di frontend hanya untuk UX, bukan keamanan.
 */
const PAYMENT_PROOF_BUCKET = 'payment-proofs'
const { celebrate } = useCelebration()
const MAX_PROOF_SIZE = 5 * 1024 * 1024
const ALLOWED_PROOF_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']

type PaymentStatus = 'verified' | 'pending' | 'rejected' | 'refunded'
type FilterStatus = 'all' | PaymentStatus
type PaymentCategory = 'Cash Purchase' | 'Down Payment' | 'Installment'

type Schedule = {
  id: number
  installmentNumber: number
  dueDate: string | null
  amount: number
  status: string
  hasPendingPayment: boolean
}

type ClientTransaction = {
  id: number
  lotId: number
  lot: string
  block: string
  area: number | null
  dimension: string | null
  paymentType: 'Cash' | 'Installment'
  finalPrice: number
  downPayment: number
  months: number | null
  monthlyPayment: number | null
  transactionStatus: string
  spkRequestId: number | null
  spkStatus: string | null
  notaryStatus: string | null
  schedules: Schedule[]
  payments: any[]
}

type PaymentHistoryItem = {
  transactionId: number | null
  id: number
  reference: string
  date: string | null
  installmentNumbers: number[]
  installmentTotal: number | null
  category: string
  amount: number
  lot: string
  method: string
  status: PaymentStatus
  rawStatus: string
  note: string | null
  reviewNote: string | null
  proofPath: string | null
}

const searchQuery = ref('')
const selectedFilter = ref<FilterStatus>('all')
const transactions = ref<ClientTransaction[]>([])
const paymentHistory = ref<PaymentHistoryItem[]>([])
const selectedTransactionId = ref<number | null>(null)
const selectedScheduleIds = ref<number[]>([])
const selectedProof = ref<File | null>(null)
const paymentNote = ref('')
const paymentMethod = ref('Transfer Bank')
const loading = ref(true)
const submitting = ref(false)
const loadError = ref('')
const submitError = ref('')
const reuploadPaymentId = ref<number | null>(null)
const reuploadProof = ref<File | null>(null)
const reuploadSubmitting = ref(false)
const reuploadError = ref('')
const cancellationModalOpen = ref(false)
const cancellationSubmitting = ref(false)
const refundRefreshKey = ref(0)
const toast = useToast()
const { alert: showDetail, confirm: askDetail } = useConfirm()
const latestCancellation = ref<any>(null)

const filters: Array<{ label: string; value: FilterStatus }> = [
  { label: 'Semua', value: 'all' },
  { label: 'Terverifikasi', value: 'verified' },
  { label: 'Menunggu Verifikasi', value: 'pending' },
  { label: 'Ditolak / Unggah Ulang', value: 'rejected' },
  { label: 'Dikembalikan Admin', value: 'refunded' },
]

const selectedTransaction = computed(() =>
  transactions.value.find(item => item.id === selectedTransactionId.value) ?? null,
)

// Panel atas mengikuti kaveling terpilih. Riwayat juga, kecuali diminta semua.
type HistoryScope = 'lot' | 'all'
const historyScope = ref<HistoryScope>('lot')
const historyScopes: Array<{ value: HistoryScope, label: string }> = [
  { value: 'lot', label: 'Kaveling ini' },
  { value: 'all', label: 'Semua kaveling' },
]
const selectedPayments = computed(() => {
  const id = selectedTransactionId.value
  return id == null ? [] : paymentHistory.value.filter(item => item.transactionId === id)
})
const verifiedTotal = computed(() =>
  selectedPayments.value.filter(item => item.status === 'verified').reduce((sum, item) => sum + item.amount, 0),
)
const pendingTotal = computed(() =>
  selectedPayments.value.filter(item => item.status === 'pending').reduce((sum, item) => sum + item.amount, 0),
)
const hasOtherLotPayments = computed(() => selectedPayments.value.length < paymentHistory.value.length)
const scopedPayments = computed(() =>
  historyScope.value === 'all' ? paymentHistory.value : selectedPayments.value)
const filteredTransactions = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('id-ID')
  return scopedPayments.value.filter(item => {
    const matchesFilter = selectedFilter.value === 'all' || item.status === selectedFilter.value
    const text = [
      item.reference, item.lot, item.method, item.category, item.note ?? '',
      item.installmentNumbers.join(' '), getStatusLabel(item.status, item.rawStatus),
    ].join(' ').toLocaleLowerCase('id-ID')
    return matchesFilter && (!query || text.includes(query))
  })
})

const isInstallment = computed(() => selectedTransaction.value?.paymentType === 'Installment')
const dpRequired = computed(() => Boolean(selectedTransaction.value && selectedTransaction.value.downPayment > 0))
const dpPayments = computed(() =>
  selectedTransaction.value?.payments.filter(item => item.payment_category === 'Down Payment') ?? [],
)
const dpConfirmed = computed(() => dpPayments.value.some(item => item.status === 'Confirmed'))

// Pembayaran mengikuti tahapan proses SPK, dan semuanya baru dibuka setelah SPK
// disetujui. Dengan uang muka: sampai PPJB hanya uang muka. Tanpa uang muka:
// cicilan pertama dibayar sebelum atau saat PPJB. Sisa cicilan setelah PPJB.
const processSteps = ref<SpkProcessStep[]>([])
const processLoaded = ref(false)
watch(
  () => selectedTransaction.value?.spkRequestId ?? null,
  async (spkId) => {
    processSteps.value = []
    processLoaded.value = false
    if (!spkId) return
    // Jawaban terlambat dari kaveling sebelumnya diabaikan.
    const isStale = () => selectedTransaction.value?.spkRequestId !== spkId
    try {
      const steps = await getSpkProcessSteps(Number(spkId))
      if (!isStale()) processSteps.value = steps
    } catch {
      if (!isStale()) processSteps.value = []
    } finally {
      if (!isStale()) processLoaded.value = true
    }
  },
  { immediate: true },
)
const ppjbDone = computed(() => stepIsDone(processSteps.value, 'ppjb'))
const ppjbReady = computed(() => ppjbDone.value
  || processSteps.value.some(step => step.key === 'ppjb' && step.status === 'ready'))
const waitingForPpjb = computed(() => dpRequired.value && !dpConfirmed.value)
const paymentsOpen = computed(() => {
  const tx = selectedTransaction.value
  if (!tx || tx.spkStatus !== 'Approved') return false
  if (tx.paymentType === 'Cash') return true
  if (dpRequired.value && !dpConfirmed.value) return ppjbReady.value
  if (!dpRequired.value) return true
  return ppjbDone.value
})
/** Tanpa uang muka dan PPJB belum selesai: hanya cicilan pertama yang terbuka. */
const onlyFirstInstallment = computed(() =>
  isInstallment.value && !dpRequired.value && !ppjbDone.value)
const closedTitle = computed(() => {
  if (selectedTransaction.value?.spkStatus !== 'Approved') return 'Pembayaran belum dibuka'
  return waitingForPpjb.value ? 'Uang muka dibayar saat PPJB' : 'Cicilan belum dibuka'
})
const closedReason = computed(() => {
  if (selectedTransaction.value?.spkStatus !== 'Approved') return 'Pembayaran dibuka setelah SPK disetujui.'
  return waitingForPpjb.value
    ? 'Pembayaran terbuka setelah Admin menandai jadwal PPJB siap diproses.'
    : 'Cicilan dibuka setelah PPJB di notaris selesai. Cicilan pertama jatuh di bulan berikutnya.'
})
const cancellationPending = computed(() => latestCancellation.value?.status === 'Pending')
const dpPending = computed(() => dpPayments.value.some(item =>
  item.status === 'Pending' || item.status === 'Needs Reupload'))
const cashPayments = computed(() =>
  selectedTransaction.value?.payments.filter(item => item.payment_category === 'Cash Purchase') ?? [],
)
const cashPaid = computed(() => cashPayments.value
  .filter(item => item.status === 'Confirmed')
  .reduce((sum, item) => sum + Number(item.amount || 0), 0))
const cashPending = computed(() => cashPayments.value.some(item =>
  item.status === 'Pending' || item.status === 'Needs Reupload'))

// Harus sama dengan public.is_transaction_paid_off di database.
const isPaidOff = computed(() => {
  const tx = selectedTransaction.value
  if (!tx) return false
  if (tx.transactionStatus === 'Sold') return true
  if (tx.paymentType === 'Cash') return tx.finalPrice > 0 && cashPaid.value >= tx.finalPrice
  const dpPaid = dpPayments.value
    .filter(item => item.status === 'Confirmed')
    .reduce((sum, item) => sum + Number(item.amount || 0), 0)
  return tx.schedules.length > 0
    && tx.schedules.every(item => item.status === 'Paid')
    && dpPaid >= tx.downPayment
})
const canRequestCancellation = computed(() => {
  const tx = selectedTransaction.value
  return Boolean(tx) && tx?.transactionStatus !== 'Cancelled' && !isPaidOff.value
})

const nextInstallmentIndex = computed(() => {
  const schedules = selectedTransaction.value?.schedules ?? []
  return schedules.findIndex(item => item.status !== 'Paid')
})
const firstUnpaidSchedule = computed(() => {
  const index = nextInstallmentIndex.value
  return index >= 0 ? selectedTransaction.value?.schedules[index] ?? null : null
})
const installmentProgress = computed(() =>
  summarizeInstallmentProgress(selectedTransaction.value?.schedules ?? []))
const installmentProgressLine = computed(() => formatProgressLine(installmentProgress.value))
const selectedRangeLabel = computed(() => formatInstallmentRange(
  selectedSchedules.value.map(item => item.installmentNumber),
  selectedTransaction.value?.schedules.length,
))
const firstUnpaidHasPending = computed(() => Boolean(firstUnpaidSchedule.value?.hasPendingPayment))

/**
 * Hanya jadwal berurutan dari cicilan pertama yang belum lunas yang dapat
 * dipilih. Jika cicilan pertama yang belum lunas sedang menunggu verifikasi,
 * pilihan cicilan berikutnya dikunci.
 */
const selectableSchedules = computed(() => {
  const schedules = selectedTransaction.value?.schedules ?? []
  const start = nextInstallmentIndex.value
  if (start < 0 || firstUnpaidHasPending.value) return []
  const result: Schedule[] = []
  for (let i = start; i < schedules.length; i += 1) {
    const schedule = schedules[i]
    if (schedule.status === 'Paid' || schedule.hasPendingPayment) break
    if (onlyFirstInstallment.value && schedule.installmentNumber !== 1) break
    result.push(schedule)
  }
  return result
})
/** Cicilan aktif berikutnya otomatis terpilih saat form dibuka. */
watch(selectableSchedules, (list) => {
  if (selectedScheduleIds.value.length || !list.length) return
  if (dpRequired.value && !dpConfirmed.value) return
  selectedScheduleIds.value = [list[0].id]
})
const selectedSchedules = computed(() => {
  const ids = new Set(selectedScheduleIds.value)
  return selectableSchedules.value.filter(item => ids.has(item.id))
})
const installmentTotal = computed(() =>
  selectedSchedules.value.reduce((sum, item) => sum + item.amount, 0),
)
const cashOutstanding = computed(() =>
  Math.max(0, (selectedTransaction.value?.finalPrice ?? 0) - cashPaid.value),
)
const paymentAmount = computed(() => {
  if (!selectedTransaction.value) return 0
  if (selectedTransaction.value.paymentType === 'Cash') return cashOutstanding.value
  if (dpRequired.value && !dpConfirmed.value) return selectedTransaction.value.downPayment
  return installmentTotal.value
})
const paymentCategory = computed<PaymentCategory | null>(() => {
  if (!selectedTransaction.value) return null
  if (selectedTransaction.value.paymentType === 'Cash') return 'Cash Purchase'
  if (dpRequired.value && !dpConfirmed.value) return 'Down Payment'
  return 'Installment'
})
const paymentBlockedReason = computed(() => {
  const transaction = selectedTransaction.value
  if (!transaction) return 'Pilih transaksi terlebih dahulu.'
  if (cancellationPending.value) return 'Pengajuan pembatalan sedang diperiksa. Pembayaran baru ditahan sampai ada keputusan.'
  if (!paymentsOpen.value) return closedReason.value
  if (transaction.transactionStatus === 'Cancelled') return 'Transaksi ini sudah dibatalkan.'
  if (transaction.paymentType === 'Cash') {
    if (cashPaid.value >= transaction.finalPrice) return 'Pembayaran tunai sudah lunas.'
    if (cashPending.value) return 'Pembayaran tunai sedang menunggu verifikasi Admin.'
    return ''
  }
  if (dpRequired.value && !dpConfirmed.value) {
    if (dpConfirmed.value) return ''
    if (dpPending.value) return 'Pembayaran uang muka sedang menunggu verifikasi Admin. Cicilan belum dapat dibayar.'
    return ''
  }
  if (!transaction.schedules.length) return 'Jadwal cicilan final belum tersedia. Silakan hubungi Admin.'
  if (firstUnpaidSchedule.value === null) return 'Seluruh cicilan sudah lunas.'
  if (onlyFirstInstallment.value && firstUnpaidSchedule.value.installmentNumber > 1) {
    return 'Cicilan berikutnya dibuka setelah PPJB selesai.'
  }
  if (firstUnpaidHasPending.value) return 'Cicilan berikutnya sedang menunggu verifikasi. Tunggu konfirmasi Admin sebelum mengirim pembayaran baru.'
  if (selectedScheduleIds.value.length === 0) return 'Pilih cicilan yang ingin dibayar.'
  return ''
})
const canSubmitPayment = computed(() =>
  !loading.value &&
  !submitting.value &&
  Boolean(selectedTransaction.value) &&
  paymentsOpen.value &&
  paymentAmount.value > 0 &&
  Boolean(paymentCategory.value) &&
  Boolean(selectedProof.value) &&
  !paymentBlockedReason.value,
)

const detailMessage = (item: PaymentHistoryItem) => [
  `Referensi: ${item.reference}`,
  `Kaveling: ${item.lot}`,
  `Kategori: ${item.category}`,
  item.installmentNumbers.length ? `Cicilan: ${formatInstallmentRange(item.installmentNumbers, item.installmentTotal).replace(/^Cicilan /, '')}` : '',
  `Tanggal: ${item.date ? formatDate(item.date) : 'Belum dicatat'}`,
  `Jumlah: ${formatCurrency(item.amount)}`,
  `Metode: ${item.method || 'Tidak dicantumkan'}`,
  `Status: ${getStatusLabel(item.status, item.rawStatus)}`,
  item.note ? `Catatan: ${item.note}` : '',
  item.reviewNote ? `Catatan verifikasi: ${item.reviewNote}` : '',
].filter(Boolean).join('\n')

// Spasi tak terputus: "Rp" dan angkanya tidak boleh terpisah baris.
function formatCurrency(amount: number) {
  return formatRupiah(amount).replace(' ', '\u00a0')
}
// Tanpa uang muka, tanggal jadwal masih sementara selama PPJB belum selesai.
function scheduleDateLabel(schedule: Schedule) {
  if (onlyFirstInstallment.value && schedule.status !== 'Paid') {
    return schedule.installmentNumber === 1 ? 'Sebelum atau saat PPJB' : 'Tanggal ditetapkan saat PPJB'
  }
  return schedule.dueDate ? formatDate(schedule.dueDate) : 'Tanggal belum ditentukan'
}
function scheduleStateLabel(schedule: Schedule) {
  if (schedule.status === 'Paid') return 'Lunas'
  if (schedule.hasPendingPayment) return 'Diverifikasi'
  if (onlyFirstInstallment.value) return schedule.installmentNumber === 1 ? 'Belum dibayar' : 'Terkunci'
  return schedule.status === 'Overdue' ? 'Jatuh tempo' : 'Mendatang'
}
function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Tanggal tidak tersedia'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'long', year: 'numeric' }).format(date)
}
function formatDateParts(value: string | null) {
  if (!value) return { day: '--', month: '---', year: '' }
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return {
    day: new Intl.DateTimeFormat('id-ID', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date),
    year: new Intl.DateTimeFormat('id-ID', { year: 'numeric' }).format(date),
  }
}
function mapPaymentStatus(status: string): PaymentStatus {
  const normalized = String(status ?? '').trim().toLocaleLowerCase('id-ID')

  if (['confirmed', 'verified', 'approved', 'dik konfirmasi', 'dikonfirmasi'].includes(normalized)) {
    return 'verified'
  }
  if (['pending', 'waiting', 'menunggu'].includes(normalized)) return 'pending'
  if ([
    'refunded', 'returned', 'returned by admin', 'refunded by admin',
    'dikembalikan', 'sudah dikembalikan', 'dikembalikan admin',
  ].includes(normalized)) return 'refunded'
  return 'rejected'
}
function getStatusLabel(status: PaymentStatus, rawStatus?: string) {
  const normalized = String(rawStatus ?? '').trim().toLocaleLowerCase('id-ID')
  if (normalized === 'needs reupload') return 'Perlu Unggah Ulang'
  const labels: Record<PaymentStatus, string> = {
    verified: 'Dikonfirmasi Admin',
    pending: 'Menunggu Verifikasi',
    rejected: 'Ditolak Admin',
    refunded: 'Dikembalikan Admin',
  }
  return labels[status]
}
function getCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    Booking: 'Tanda Jadi',
    'Down Payment': 'Uang Muka',
    Installment: 'Cicilan',
    'Cash Purchase': 'Pembelian Tunai',
    Other: 'Lainnya',
    Unclassified: 'Belum Dikategorikan',
  }
  return labels[category] ?? category
}
function getLotLabel(lot: any) {
  if (!lot) return 'Kaveling tidak tersedia'
  const blockName = lot.blocks?.name ?? lot.blocks?.code
  return [blockName, lot.lot_number].filter(Boolean).join(' - ') || lot.lot_number || 'Kavling'
}
function getPaymentInstallmentNumbers(row: any): number[] {
  return (row.payment_allocations ?? [])
    .map((allocation: any) => allocation.installment_schedules?.installment_number)
    .filter((number: any) => number != null)
    .sort((a: number, b: number) => a - b)
}

function toggleSchedule(schedule: Schedule, checked: boolean) {
  const index = selectableSchedules.value.findIndex(item => item.id === schedule.id)
  if (index < 0) return
  if (checked) {
    // Hanya boleh menambahkan jadwal tepat setelah pilihan terakhir.
    if (index !== selectedScheduleIds.value.length) return
    selectedScheduleIds.value = [...selectedScheduleIds.value, schedule.id]
  } else {
    // Menghapus satu cicilan juga menghapus semua pilihan setelahnya.
    selectedScheduleIds.value = selectedScheduleIds.value.slice(0, index)
  }
}
function onProofChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0] ?? null
  submitError.value = ''
  if (!file) {
    selectedProof.value = null
    return
  }
  if (!ALLOWED_PROOF_TYPES.includes(file.type)) {
    selectedProof.value = null
    target.value = ''
    submitError.value = 'Format bukti pembayaran harus JPG, PNG, WEBP, atau PDF.'
    return
  }
  if (file.size > MAX_PROOF_SIZE) {
    selectedProof.value = null
    target.value = ''
    submitError.value = 'Ukuran bukti pembayaran maksimal 5 MB.'
    return
  }
  selectedProof.value = file
}

function resetPaymentForm() {
  selectedScheduleIds.value = []
  selectedProof.value = null
  paymentNote.value = ''
  submitError.value = ''
  const input = document.getElementById('payment-proof-file') as HTMLInputElement | null
  if (input) input.value = ''
}

async function loadPaymentData({ silent = false }: LoadOptions = {}) {
  if (!silent) {
    loading.value = true
    loadError.value = ''
  }
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    const user = authData.user
    if (!user) throw new Error('Sesi masuk tidak ditemukan. Silakan masuk kembali.')

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('id, full_name, user_id')
      .eq('user_id', user.id)
      .maybeSingle()
    if (customerError) throw customerError
    if (!customer) {
      transactions.value = []
      paymentHistory.value = []
      selectedTransactionId.value = null
      return
    }

    const [transactionResult, spkResult, paymentResult] = await Promise.all([
      supabase
        .from('lot_transactions')
        .select(`
          id, lot_id, customer_id, status, payment_type, final_price,
          down_payment, months, monthly_payment, booking_date,
          lots(id, lot_number, area, dimension, status, payment_type, blocks(name, code))
        `)
        .eq('customer_id', customer.id)
        .neq('status', 'Cancelled')
        .order('created_at', { ascending: false }),
      supabase
        .from('spk_requests')
        .select('*')
        .eq('customer_id', customer.id),
      supabase
        .from('payments')
        .select(`
          id, customer_id, lot_id, payment_date, amount, payment_method, note,
          created_at, transaction_id, spk_request_id, status, payment_category, proof_path,
          reference_number, review_note, verified_at,
          lots(lot_number, area, dimension, blocks(name, code)),
          payment_allocations(allocated_amount, installment_schedules(installment_number))
        `)
        .eq('customer_id', customer.id)
        .order('payment_date', { ascending: false, nullsFirst: false })
        .order('created_at', { ascending: false }),
    ])
    if (transactionResult.error) throw transactionResult.error
    if (spkResult.error) throw spkResult.error
    if (paymentResult.error) throw paymentResult.error

    const transactionRows = transactionResult.data ?? []
    const spkRows = spkResult.data ?? []
    const paymentRows = paymentResult.data ?? []

    const scheduleResults = await Promise.all(transactionRows.map(async (transaction: any) => {
      if (transaction.payment_type !== 'Installment') return { transactionId: transaction.id, schedules: [] }
      const { data, error } = await supabase
        .from('installment_schedules')
        .select(`
          id, transaction_id, installment_number, due_date, amount, status,
          payment_allocations(allocated_amount, payments(id, status))
        `)
        .eq('transaction_id', transaction.id)
        .order('installment_number', { ascending: true })
      if (error) throw error
      return { transactionId: transaction.id, schedules: data ?? [] }
    }))

    const scheduleMap = new Map<number, Schedule[]>()
    for (const result of scheduleResults) {
      scheduleMap.set(result.transactionId, result.schedules.map((row: any) => ({
        id: Number(row.id),
        installmentNumber: Number(row.installment_number),
        dueDate: row.due_date,
        amount: Number(row.amount ?? 0),
        status: row.status,
        hasPendingPayment: (row.payment_allocations ?? []).some((allocation: any) =>
          allocation.payments?.status === 'Pending'
            || allocation.payments?.status === 'Needs Reupload',
        ),
      })))
    }

    const paymentMap = new Map<number, any[]>()
    for (const row of paymentRows) {
      if (row.transaction_id == null) continue
      const current = paymentMap.get(Number(row.transaction_id)) ?? []
      current.push(row)
      paymentMap.set(Number(row.transaction_id), current)
    }

    transactions.value = transactionRows.map((row: any) => {
      const lot = row.lots
      const spk = spkRows
        .filter((item: any) => Number(item.transaction_id) === Number(row.id))
        .sort((a: any, b: any) => Number(b.id) - Number(a.id))[0]
      return {
        id: Number(row.id),
        lotId: Number(row.lot_id),
        lot: getLotLabel(lot),
        block: lot?.blocks?.name ?? lot?.blocks?.code ?? 'Blok tidak dicantumkan',
        area: lot?.area == null ? null : Number(lot.area),
        dimension: lot?.dimension ?? null,
        paymentType: row.payment_type,
        finalPrice: Number(row.final_price ?? 0),
        downPayment: Number(row.down_payment ?? 0),
        months: row.months == null ? null : Number(row.months),
        monthlyPayment: row.monthly_payment == null ? null : Number(row.monthly_payment),
        transactionStatus: row.status,
        spkRequestId: spk?.id ?? null,
        spkStatus: spk?.status ?? null,
        notaryStatus: spk?.notary_status ?? spk?.notaryStatus ?? null,
        schedules: scheduleMap.get(Number(row.id)) ?? [],
        payments: paymentMap.get(Number(row.id)) ?? [],
      } as ClientTransaction
    })

    // Booking fee bisa hanya terhubung lewat SPK, tanpa transaction_id.
    const spkTransactionMap = new Map<number, number>(spkRows
      .filter((item: any) => item.transaction_id != null)
      .map((item: any) => [Number(item.id), Number(item.transaction_id)]))

    paymentHistory.value = paymentRows.map((row: any) => ({
      id: Number(row.id),
      transactionId: row.transaction_id != null
        ? Number(row.transaction_id)
        : spkTransactionMap.get(Number(row.spk_request_id)) ?? null,
      reference: row.reference_number || `PAY-${String(row.id).padStart(5, '0')}`,
      date: row.payment_date,
      installmentNumbers: getPaymentInstallmentNumbers(row),
      installmentTotal: transactions.value.find(item => item.id === Number(row.transaction_id))?.months ?? null,
      category: getCategoryLabel(row.payment_category ?? 'Unclassified'),
      amount: Number(row.amount ?? 0),
      lot: getLotLabel(row.lots),
      method: row.payment_method || 'Tidak dicantumkan',
      status: mapPaymentStatus(row.status),
      rawStatus: row.status,
      note: row.note,
      reviewNote: row.review_note,
      proofPath: row.proof_path,
    }))

    if (!transactions.value.some(item => item.id === selectedTransactionId.value)) {
      selectedTransactionId.value = transactions.value[0]?.id ?? null
    }
    loadError.value = ''
    if (!silent) resetPaymentForm()
  } catch (error: any) {
    console.error('Gagal memuat data pembayaran klien:', error)
    // Pembaruan otomatis yang gagal mempertahankan data yang sudah tampil.
    if (silent) return
    loadError.value = error?.message || 'Terjadi kesalahan saat mengambil data pembayaran.'
    transactions.value = []
    paymentHistory.value = []
  } finally {
    loading.value = false
  }
}

async function loadCancellationStatus(transactionId: number) {
  try {
    const latest = await purchaseCancellationService.getLatest(transactionId)
    if (selectedTransactionId.value === transactionId) latestCancellation.value = latest
  } catch (error) {
    console.warn('[Pembayaran Klien] Status pembatalan belum dapat dimuat:', error)
  }
}

function openCancellationForm() {
  if (selectedTransaction.value && canRequestCancellation.value) cancellationModalOpen.value = true
}

async function withdrawCancellation() {
  const request = latestCancellation.value
  const transactionId = selectedTransactionId.value
  if (!request || !transactionId || cancellationSubmitting.value) return
  const confirmed = await askDetail({
    title: 'Tarik pengajuan pembatalan?',
    message: 'Pembelian berjalan lagi dan jadwal cicilan tetap berlaku.',
    confirmText: 'Tarik pengajuan',
    cancelText: 'Kembali',
    tone: 'warning',
  })
  if (!confirmed) return
  cancellationSubmitting.value = true
  try {
    await purchaseCancellationService.withdraw(Number(request.id))
    toast.success('Pengajuan pembatalan ditarik.')
  } catch (error: any) {
    toast.error(error?.message || 'Pengajuan belum bisa ditarik.')
  } finally {
    cancellationSubmitting.value = false
    await loadCancellationStatus(transactionId)
  }
}

async function submitPayment() {
  if (!canSubmitPayment.value || !selectedTransaction.value || !selectedProof.value || !paymentCategory.value) return
  submitting.value = true
  submitError.value = ''
  let uploadedPath: string | null = null

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    const user = authData.user
    if (!user) throw new Error('Sesi masuk tidak ditemukan. Silakan masuk kembali.')

    const transaction = selectedTransaction.value
    const file = selectedProof.value
    const extension = file.name.split('.').pop()?.toLowerCase() || 'file'
    const safeFileName = `${crypto.randomUUID()}.${extension}`
    uploadedPath = `${user.id}/${transaction.id}/${safeFileName}`

    const { error: uploadError } = await supabase.storage
      .from(PAYMENT_PROOF_BUCKET)
      .upload(uploadedPath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      })
    if (uploadError) {
      throw new Error(`Bukti pembayaran gagal diunggah. Pastikan bucket "${PAYMENT_PROOF_BUCKET}" tersedia dan izinnya benar. ${uploadError.message}`)
    }

    const { data: paymentId, error: rpcError } = await supabase.rpc('submit_client_payment', {
      p_transaction_id: transaction.id,
      p_payment_category: paymentCategory.value,
      p_amount: paymentAmount.value,
      p_payment_method: paymentMethod.value,
      p_proof_path: uploadedPath,
      p_note: paymentNote.value.trim() || null,
      p_installment_schedule_ids: paymentCategory.value === 'Installment' ? selectedScheduleIds.value : [],
    })
    if (rpcError) throw new Error(`Pembayaran belum tercatat. ${rpcError.message}`)
    if (!paymentId) throw new Error('Server tidak mengembalikan ID pembayaran.')

    celebrate({
      title: 'Bukti terkirim',
      message: 'Admin akan memeriksa pembayaran Anda.',
    })
    await loadPaymentData()
  } catch (error: any) {
    console.error('Gagal mengirim pembayaran:', error)
    submitError.value = error?.message || 'Pembayaran gagal dikirim. Silakan coba kembali.'
    if (uploadedPath) {
      const { error: removeError } = await supabase.storage.from(PAYMENT_PROOF_BUCKET).remove([uploadedPath])
      if (removeError) console.warn('Gagal membersihkan file bukti yang belum tercatat:', removeError)
    }
  } finally {
    submitting.value = false
  }
}

function selectTransaction(value: string | number) {
  selectedTransactionId.value = Number(value)
  resetPaymentForm()
}
const proofItem = ref<PaymentHistoryItem | null>(null)
const proofUrl = ref('')
const proofLoading = ref(false)
const proofError = ref('')
/** Jawaban untuk bukti yang sudah ditutup atau diganti diabaikan. */
let proofRequest = 0
const proofFileName = computed(() => {
  const item = proofItem.value
  if (!item?.proofPath) return ''
  const extension = item.proofPath.split('.').pop()?.toLowerCase() || 'jpg'
  return `Bukti-${item.reference}.${extension}`
})
const reuploadItem = computed(() =>
  paymentHistory.value.find(item => item.id === reuploadPaymentId.value) ?? null,
)

async function openProof(item: PaymentHistoryItem) {
  if (!item.proofPath) return
  const request = ++proofRequest
  proofItem.value = item
  proofUrl.value = ''
  proofError.value = ''
  proofLoading.value = true
  try {
    const url = await paymentService.getProofUrl(item.proofPath)
    if (request === proofRequest) proofUrl.value = url
  } catch (error) {
    console.error('Gagal membuka bukti pembayaran:', error)
    if (request === proofRequest) proofError.value = 'Periksa koneksi lalu coba lagi. Bila tetap gagal, hubungi Admin.'
  } finally {
    if (request === proofRequest) proofLoading.value = false
  }
}
function closeProof() {
  proofRequest += 1
  proofItem.value = null
  proofUrl.value = ''
  proofError.value = ''
  proofLoading.value = false
}

async function openTransaction(item: PaymentHistoryItem) {
  reuploadError.value = ''
  reuploadProof.value = null
  reuploadPaymentId.value = item.rawStatus === 'Needs Reupload' ? item.id : null
  if (item.rawStatus !== 'Needs Reupload') {
    const detail = { title: 'Detail pembayaran', tone: 'info' as const }
    if (!item.proofPath) {
      void showDetail({ ...detail, message: `${detailMessage(item)}\nBukti: belum dilampirkan`, confirmText: 'Tutup' })
      return
    }
    if (await askDetail({ ...detail, message: detailMessage(item), confirmText: 'Lihat bukti', cancelText: 'Tutup' })) {
      await openProof(item)
    }
    return
  }
  void nextTick(() => document.getElementById('reupload-panel')?.scrollIntoView({ block: 'nearest' }))
}

function onReuploadProofChange(event: Event) {
  const target = event.target as HTMLInputElement
  const file = target.files?.[0] ?? null
  reuploadError.value = ''

  if (!file) {
    reuploadProof.value = null
    return
  }
  if (!ALLOWED_PROOF_TYPES.includes(file.type)) {
    reuploadProof.value = null
    target.value = ''
    reuploadError.value = 'Format bukti pembayaran harus JPG, PNG, WEBP, atau PDF.'
    return
  }
  if (file.size > MAX_PROOF_SIZE) {
    reuploadProof.value = null
    target.value = ''
    reuploadError.value = 'Ukuran bukti pembayaran maksimal 5 MB.'
    return
  }
  reuploadProof.value = file
}

async function submitReupload() {
  if (!reuploadPaymentId.value || !reuploadProof.value || reuploadSubmitting.value) return
  reuploadSubmitting.value = true
  reuploadError.value = ''

  try {
    const paymentId = reuploadPaymentId.value
    await paymentService.replacePaymentProof(paymentId, reuploadProof.value)
    reuploadPaymentId.value = null
    reuploadProof.value = null
    toast.success('Pengajuan lama kembali menunggu verifikasi.', {
      title: 'Bukti pengganti terkirim',
      to: `/client/pembayaran?paymentId=${paymentId}`,
      actionLabel: 'Lihat bukti',
    })
    await loadPaymentData()
  } catch (error: any) {
    reuploadError.value = error?.message || 'Bukti pengganti gagal dikirim.'
  } finally {
    reuploadSubmitting.value = false
  }
}

const spkStatusLabel = computed(() => {
  const tx = selectedTransaction.value
  if (!tx?.spkRequestId) return 'SPK belum tersedia'
  if (tx.spkStatus === 'Approved') return 'SPK disetujui'
  return tx.spkStatus === 'Rejected' ? 'SPK ditolak' : 'SPK diproses'
})
const spkProgress = computed(() => {
  const steps = processSteps.value
  if (!steps.length) return null
  const current = currentStep(steps)
  const plan = spkPaymentPlan(steps, selectedTransaction.value?.downPayment)
  return {
    done: steps.filter(step => step.status === 'done').length,
    total: steps.length,
    label: current ? `Sekarang: ${spkStepInfo(current.key, plan).title}` : 'Semua tahap selesai',
  }
})
const lotSubtitle = computed(() => {
  const tx = selectedTransaction.value
  if (!tx) return ''
  const scheme = tx.paymentType === 'Cash'
    ? 'Tunai'
    : `Cicilan ${tx.months ? `${tx.months} bulan` : `${tx.schedules.length} jadwal`}`
  const size = tx.area != null ? `${tx.area.toLocaleString('id-ID')} m²` : tx.dimension
  return [scheme, size].filter(Boolean).join(', ')
})
const reuploadCountByLot = computed(() => {
  const counts = new Map<number, number>()
  for (const item of paymentHistory.value) {
    if (item.rawStatus !== 'Needs Reupload' || item.transactionId == null) continue
    counts.set(item.transactionId, (counts.get(item.transactionId) ?? 0) + 1)
  }
  return counts
})
/** Tagihan unggah ulang yang tersembunyi karena riwayat hanya menampilkan kaveling ini. */
const hiddenReuploadCount = computed(() => historyScope.value === 'all'
  ? 0
  : reuploadCount.value - selectedPayments.value.filter(item => item.rawStatus === 'Needs Reupload').length)
function chooseLot(id: number) {
  if (id === selectedTransactionId.value) return
  reuploadPaymentId.value = null
  reuploadProof.value = null
  reuploadError.value = ''
  historyScope.value = 'lot'
  selectTransaction(id)
}

const ionRouter = useIonRouter()
function openSpkDetail() {
  const spkId = selectedTransaction.value?.spkRequestId
  if (spkId) ionRouter.push(`/client/dokumen?spk_id=${spkId}`)
}
function openLotDetail() {
  const lotId = selectedTransaction.value?.lotId
  if (lotId) ionRouter.push(`/client/kavling/${lotId}`)
}

type ViewTab = 'pay' | 'history'
const viewTabs: { value: ViewTab, label: string }[] = [
  { value: 'pay', label: 'Bayar' },
  { value: 'history', label: 'Riwayat' },
]
const activeTab = ref<ViewTab>('pay')
/** Riwayat tersembunyi di tab lain, jadi tagihan unggah ulang harus tetap terlihat. */
const reuploadCount = computed(() => paymentHistory.value.filter(item => item.rawStatus === 'Needs Reupload').length)
function onTabKeydown(event: KeyboardEvent) {
  if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return
  event.preventDefault()
  activeTab.value = activeTab.value === 'pay' ? 'history' : 'pay'
  void nextTick(() => document.getElementById(`payment-tab-${activeTab.value}`)?.focus())
}

const HISTORY_PAGE_SIZE = 5
const historyPager = usePagination(filteredTransactions, {
  pageSize: HISTORY_PAGE_SIZE,
  resetOn: [selectedFilter, searchQuery, historyScope, selectedTransactionId],
})

const SCHEDULE_PAGE_SIZE = 6
const schedulePager = usePagination(computed(() => selectedTransaction.value?.schedules ?? []), {
  pageSize: SCHEDULE_PAGE_SIZE,
})
// Buka halaman yang memuat cicilan aktif; pembaruan otomatis tidak memindahkan halaman.
watch(
  () => `${selectedTransactionId.value}:${nextInstallmentIndex.value}`,
  () => schedulePager.setPage(Math.floor(Math.max(0, nextInstallmentIndex.value) / SCHEDULE_PAGE_SIZE) + 1),
  { immediate: true },
)

const routeQuery = useOwnRouteQuery()
const { focusedId, focusRow } = useRowFocus()

/** Dari notifikasi: pilih transaksinya, lalu sorot pembayaran yang dimaksud bila ada. */
async function applyNotificationTarget() {
  const { paymentId, transactionId, spkId, bagian } = routeQuery.value
  const payment = paymentHistory.value.find(item => item.id === Number(paymentId))
  const transaction = transactions.value.find(item =>
    item.payments.some(row => Number(row.id) === payment?.id)
    || item.id === Number(transactionId)
    || (spkId && Number(item.spkRequestId) === Number(spkId)))
  if (transaction && transaction.id !== selectedTransactionId.value) selectTransaction(transaction.id)
  if (!payment) {
    if (transaction) activeTab.value = 'pay'
    if (transaction && bagian === 'pembatalan') await showCancellationStatus(transaction.id)
    return
  }
  activeTab.value = 'history'
  historyScope.value = payment.transactionId === selectedTransactionId.value ? 'lot' : 'all'
  searchQuery.value = ''
  selectedFilter.value = 'all'
  // Tunggu reset halaman akibat filter selesai sebelum memilih halaman tujuan.
  await nextTick()
  const position = filteredTransactions.value.findIndex(item => item.id === payment.id)
  historyPager.setPage(Math.floor(Math.max(0, position) / HISTORY_PAGE_SIZE) + 1)
  if (payment.rawStatus === 'Needs Reupload') reuploadPaymentId.value = payment.id
  await focusRow(payment.id, `notif-payment-${payment.id}`)
}

async function showCancellationStatus(transactionId: number) {
  try {
    latestCancellation.value = await purchaseCancellationService.getLatest(transactionId)
  } catch (error) {
    console.warn('[Pembayaran Klien] Status pembatalan belum dapat dimuat:', error)
    return
  }
  await nextTick()
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  document.getElementById('cancellation-status')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
}

// Status pengajuan ikut menentukan boleh tidaknya membayar, jadi dimuat tiap ganti transaksi.
watch(selectedTransactionId, (id) => {
  latestCancellation.value = null
  if (id) void loadCancellationStatus(id)
})

onMounted(() => loadPaymentData().then(applyNotificationTarget))
watch(() => routeQuery.value.nt, (stamp) => {
  if (stamp) void loadPaymentData().then(applyNotificationTarget)
})

async function refreshPaymentData() {
  await loadPaymentData({ silent: true })
  refundRefreshKey.value += 1
  if (selectedTransactionId.value) await loadCancellationStatus(selectedTransactionId.value)

  // Cicilan yang sudah dibayar dari tempat lain tidak boleh tetap terpilih.
  const available = new Set(selectableSchedules.value.map((item) => item.id))
  const stillValid = selectedScheduleIds.value.filter((id) => available.has(id))
  if (stillValid.length !== selectedScheduleIds.value.length) selectedScheduleIds.value = stillValid

  const spkId = selectedTransaction.value?.spkRequestId
  if (!spkId) return
  try {
    processSteps.value = await getSpkProcessSteps(Number(spkId))
  } catch (error) {
    console.warn('[Pembayaran Klien] Tahapan SPK belum diperbarui:', error)
  }
}

useRealtimeRefresh(
  [
    'payments', 'payment_allocations', 'installment_schedules', 'installment_penalties', 'lot_transactions',
    'spk_requests', 'spk_process_steps', 'purchase_cancellation_requests', 'purchase_refunds',
    'booking_fee_refunds', 'bank_accounts', 'payment_instructions',
  ],
  refreshPaymentData,
  {
    pauseWhen: () =>
      loading.value || submitting.value || selectedProof.value || reuploadPaymentId.value !== null ||
      reuploadSubmitting.value || cancellationModalOpen.value || cancellationSubmitting.value,
  },
)

</script>

<template>
  <ion-page class="payment-page">
    <AppHeader variant="client" title="PoliLand Kairagi" :show-back="false" />

    <ion-content class="payment-content" :fullscreen="true">
      <main class="payment-shell">
        <section v-if="!loading && !loadError && selectedTransaction" class="lot-hero" aria-labelledby="lot-title">
          <fieldset v-if="transactions.length > 1" class="lot-picker" :disabled="submitting || cancellationSubmitting">
            <legend>Pilih kaveling</legend>
            <div class="lot-options">
              <label v-for="item in transactions" :key="item.id" class="lot-option">
                <input
                  type="radio"
                  name="payment-lot"
                  class="visually-hidden"
                  :value="item.id"
                  :checked="item.id === selectedTransactionId"
                  @change="chooseLot(item.id)"
                />
                <span class="lot-option-name">{{ item.lot }}</span>
                <span v-if="reuploadCountByLot.get(item.id)" class="view-tab-badge">
                  {{ reuploadCountByLot.get(item.id) }}<span class="visually-hidden"> bukti perlu diunggah ulang</span>
                </span>
              </label>
            </div>
          </fieldset>

          <div :key="selectedTransaction.id" class="lot-detail">
            <div class="lot-heading">
              <h2 id="lot-title">{{ selectedTransaction.lot }}</h2>
              <p>{{ lotSubtitle }}</p>
            </div>

            <dl class="lot-facts">
              <div class="lot-fact">
                <dt>Harga final SPK</dt>
                <dd>{{ formatCurrency(selectedTransaction.finalPrice) }}</dd>
              </div>
              <div v-if="isInstallment" class="lot-fact">
                <dt>Uang muka</dt>
                <dd>{{ dpRequired ? formatCurrency(selectedTransaction.downPayment) : 'Tanpa uang muka' }}</dd>
              </div>
              <div class="lot-fact">
                <dt>Terverifikasi</dt>
                <dd>{{ formatCurrency(verifiedTotal) }}</dd>
              </div>
              <div class="lot-fact">
                <dt>Menunggu verifikasi</dt>
                <dd :class="{ 'lot-fact-waiting': pendingTotal > 0 }">{{ formatCurrency(pendingTotal) }}</dd>
              </div>
            </dl>

            <div class="spk-progress">
              <p class="spk-progress-status">
                <strong>{{ spkStatusLabel }}</strong>
                <span v-if="spkProgress">{{ spkProgress.done }} dari {{ spkProgress.total }} tahap selesai</span>
              </p>
              <template v-if="spkProgress">
                <span class="spk-progress-track" aria-hidden="true">
                  <span :style="{ transform: `scaleX(${spkProgress.done / spkProgress.total})` }" />
                </span>
                <p class="spk-progress-step">{{ spkProgress.label }}</p>
              </template>
            </div>
          </div>

          <div class="lot-actions">
            <button v-if="selectedTransaction.spkRequestId" type="button" class="hero-button hero-button-primary" @click="openSpkDetail">
              <ion-icon :icon="gitCommitOutline" aria-hidden="true" />
              Lihat proses SPK
            </button>
            <button type="button" class="hero-button hero-button-ghost" @click="openLotDetail">
              Detail kaveling
              <ion-icon :icon="chevronForward" aria-hidden="true" />
            </button>
          </div>
        </section>

        <SkeletonDetailHeader v-if="loading" :sections="2" :rows="4" label="Memuat data pembayaran" />
        <StatusIllustration
          v-else-if="loadError"
          :variant="resolveErrorVariant(loadError)"
          title="Data pembayaran belum dapat dimuat"
          fill
          :on-action="() => loadPaymentData()"
        />

        <template v-else-if="transactions.length">
          <div class="view-tabs" :class="{ 'view-tabs-history': activeTab === 'history' }" role="tablist" aria-label="Bayar atau lihat riwayat" @keydown="onTabKeydown">
            <button
              v-for="tab in viewTabs"
              :id="`payment-tab-${tab.value}`"
              :key="tab.value"
              type="button"
              role="tab"
              class="view-tab"
              :aria-selected="activeTab === tab.value"
              :aria-controls="`payment-panel-${tab.value}`"
              :tabindex="activeTab === tab.value ? 0 : -1"
              @click="activeTab = tab.value"
            >
              {{ tab.label }}
              <span v-if="tab.value === 'history' && reuploadCount" class="view-tab-badge">
                {{ reuploadCount }}<span class="visually-hidden"> bukti perlu diunggah ulang</span>
              </span>
            </button>
          </div>

          <section v-show="activeTab === 'pay'" id="payment-panel-pay" class="payment-action-card view-panel" role="tabpanel" aria-labelledby="payment-tab-pay">
            <p>Nominal dan jadwal mengikuti kesepakatan final SPK.</p>

            <template v-if="selectedTransaction">
              <AppNotice v-if="!paymentsOpen" tone="warning" :title="closedTitle">
                {{ closedReason }}
              </AppNotice>

              <template v-else-if="selectedTransaction.paymentType === 'Cash'">
                <AppNotice tone="info">
                  Skema tunai hanya menyediakan pelunasan harga final kaveling. Tidak ada pilihan cicilan atau uang muka.
                </AppNotice>
                <div class="payment-total">
                  <span>Sisa pelunasan</span>
                  <strong>{{ formatCurrency(cashOutstanding) }}</strong>
                </div>
                <AppNotice v-if="cashPending" tone="warning">
                  Pembayaran tunai sedang menunggu verifikasi Admin. Anda belum dapat mengirim pembayaran lain.
                </AppNotice>
                <AppNotice v-else-if="cashPaid >= selectedTransaction.finalPrice" tone="success">
                  Pembayaran tunai sudah terverifikasi lunas.
                </AppNotice>
              </template>

              <template v-else>
                <template v-if="dpRequired && !dpConfirmed">
                  <AppNotice tone="warning" title="Bayar uang muka">
                    Bayar pada hari tanda tangan PPJB. Cicilan pertama jatuh di bulan setelah PPJB.
                  </AppNotice>
                  <AppNotice v-if="dpPending" tone="warning">
                    Bukti uang muka sedang menunggu verifikasi Admin.
                  </AppNotice>
                  <div v-else class="payment-total">
                    <span>Nominal uang muka yang harus dibayar</span>
                    <strong>{{ formatCurrency(selectedTransaction.downPayment) }}</strong>
                  </div>
                </template>

                <template v-else>
                  <AppNotice v-if="onlyFirstInstallment" tone="info" :title="firstUnpaidSchedule?.installmentNumber === 1 ? 'Bayar cicilan pertama' : 'Cicilan pertama sudah lunas'">
                    {{ firstUnpaidSchedule?.installmentNumber === 1 ? 'Tanpa uang muka, cicilan ini dilunasi sebelum atau saat tanda tangan PPJB.' : 'Cicilan berikutnya dibuka setelah PPJB selesai.' }}
                  </AppNotice>
                  <AppNotice v-else tone="info" :title="dpRequired ? 'Uang muka telah dikonfirmasi' : 'Cicilan tanpa uang muka'">
                    Bayar satu atau beberapa cicilan sekaligus, mulai dari cicilan aktif berikutnya.
                  </AppNotice>

                  <AppNotice v-if="firstUnpaidHasPending" tone="warning">
                    {{ formatInstallmentRange([firstUnpaidSchedule?.installmentNumber], selectedTransaction.schedules.length) }} sedang menunggu verifikasi. Cicilan berikutnya terbuka setelah {{ onlyFirstInstallment ? 'PPJB selesai' : 'Admin selesai memeriksa' }}.
                  </AppNotice>
                  <div v-else-if="firstUnpaidSchedule" id="schedule-top" class="schedule-picker">
                    <div class="schedule-picker-header">
                      <h3>Jadwal Cicilan</h3>
                      <small>{{ installmentProgressLine }}</small>
                    </div>
                    <label
                      v-for="schedule in schedulePager.items"
                      :key="schedule.id"
                      class="schedule-row"
                      :class="{
                        selected: selectedScheduleIds.includes(schedule.id),
                        locked: schedule.status === 'Paid' || schedule.hasPendingPayment || !selectableSchedules.some(item => item.id === schedule.id)
                      }"
                    >
                      <span class="schedule-row-main">
                        <input
                          type="checkbox"
                          :checked="selectedScheduleIds.includes(schedule.id)"
                          :disabled="schedule.status === 'Paid' || schedule.hasPendingPayment || !selectableSchedules.some(item => item.id === schedule.id) || submitting"
                          @change="toggleSchedule(schedule, ($event.target as HTMLInputElement).checked)"
                        />
                        <span class="schedule-row-copy">
                          <strong>Ke-{{ schedule.installmentNumber }}</strong>
                          <small>{{ scheduleDateLabel(schedule) }}</small>
                        </span>
                      </span>
                      <span class="schedule-row-amount">
                        <strong>{{ formatCurrency(schedule.amount) }}</strong>
                        <small>{{ scheduleStateLabel(schedule) }}</small>
                      </span>
                    </label>
                    <AppPagination
                      v-model:page="schedulePager.page"
                      :total-pages="schedulePager.totalPages"
                      :total="schedulePager.total"
                      :page-size="schedulePager.pageSize"
                      :show-summary="false"
                      scroll-to="#schedule-top"
                      label="Halaman jadwal cicilan"
                    />
                  </div>
                  <AppNotice v-else tone="success">
                    Semua jadwal cicilan telah lunas.
                  </AppNotice>

                  <div v-if="selectedScheduleIds.length" class="payment-total">
                    <span>{{ selectedRangeLabel }}</span>
                    <strong>{{ formatCurrency(installmentTotal) }}</strong>
                  </div>
                </template>
              </template>

              <template v-if="paymentsOpen && !paymentBlockedReason">
                <label class="form-field">
                  Metode pembayaran
                  <input v-model="paymentMethod" type="text" readonly />
                </label>
                <label class="form-field">
                  Catatan (opsional)
                  <textarea v-model="paymentNote" rows="2" placeholder="Tambahkan catatan jika diperlukan..." />
                </label>
                <div class="proof-input">
                  <label for="payment-proof-file"><strong>Bukti pembayaran</strong></label>
                  <input
                    id="payment-proof-file"
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    :disabled="submitting"
                    @change="onProofChange"
                  />
                  <span class="proof-name">{{ selectedProof ? selectedProof.name : 'JPG, PNG, WEBP, atau PDF. Maksimal 5 MB.' }}</span>
                </div>
                <div class="payment-total">
                  <span>{{ paymentCategory === 'Cash Purchase' ? 'Pelunasan tunai' : paymentCategory === 'Down Payment' ? 'Pembayaran uang muka' : 'Total pembayaran cicilan' }}</span>
                  <strong>{{ formatCurrency(paymentAmount) }}</strong>
                </div>
                <SlideToConfirm
                  class="submit-payment-slide"
                  label="Geser untuk kirim bukti"
                  :disabled="!canSubmitPayment"
                  :loading="submitting"
                  @confirm="submitPayment"
                />
              </template>

              <AppNotice v-if="paymentBlockedReason && paymentsOpen" tone="warning">
                {{ paymentBlockedReason }}
              </AppNotice>
              <AppNotice v-if="submitError" tone="error">
                {{ submitError }}
              </AppNotice>
            </template>
          </section>

          <section v-show="activeTab === 'history'" id="payment-panel-history" class="payment-action-card view-panel" role="tabpanel" aria-labelledby="payment-tab-history">
            <div v-if="hasOtherLotPayments" class="scope-switch" role="group" aria-label="Cakupan riwayat">
              <button
                v-for="scope in historyScopes"
                :key="scope.value"
                type="button"
                class="scope-option"
                :aria-pressed="historyScope === scope.value"
                @click="historyScope = scope.value"
              >
                {{ scope.label }}
              </button>
            </div>
            <button v-if="hiddenReuploadCount > 0" type="button" class="reupload-elsewhere" @click="historyScope = 'all'">
              <span>{{ hiddenReuploadCount }} bukti di kaveling lain perlu diunggah ulang</span>
              <ion-icon :icon="chevronForward" aria-hidden="true" />
            </button>
            <p v-if="scopedPayments.length">{{ scopedPayments.length }} pembayaran tercatat.</p>

            <label class="search-box">
              <ion-icon :icon="searchOutline" aria-hidden="true" />
              <span class="visually-hidden">Cari transaksi atau nomor kaveling</span>
              <input v-model="searchQuery" type="search" placeholder="Cari transaksi atau nomor kaveling..." />
            </label>

            <div class="filter-list" aria-label="Filter transaksi">
              <button
                v-for="filter in filters"
                :key="filter.value"
                type="button"
                class="filter-chip"
                :class="{ 'filter-chip-active': selectedFilter === filter.value }"
                :aria-pressed="selectedFilter === filter.value"
                @click="selectedFilter = filter.value"
              >
                {{ filter.label }}
              </button>
            </div>

            <section id="history-list-top" class="transaction-list" aria-label="Daftar transaksi pembayaran">
              <button
                v-for="item in historyPager.items"
                :id="`notif-payment-${item.id}`"
                :key="item.id"
                class="transaction-card"
                :class="{ 'notif-target': focusedId === item.id }"
                type="button"
                @click="openTransaction(item)"
              >
                <span class="transaction-date">
                  <strong>{{ formatDateParts(item.date).day }}</strong>
                  <span>{{ formatDateParts(item.date).month }}</span>
                  <small>{{ formatDateParts(item.date).year }}</small>
                </span>
                <span class="transaction-info">
                  <strong>{{ item.installmentNumbers.length ? formatInstallmentRange(item.installmentNumbers, item.installmentTotal) : item.category }}</strong>
                  <span>{{ item.lot }}</span>
                </span>
                <span class="transaction-payment">
                  <strong>{{ formatCurrency(item.amount) }}</strong>
                  <span class="status-badge" :class="`status-${item.status}`">
                    {{ getStatusLabel(item.status, item.rawStatus) }}
                  </span>
                </span>
                <ion-icon class="transaction-chevron" :icon="chevronForward" aria-hidden="true" />
              </button>

              <StatusIllustration
                v-if="filteredTransactions.length === 0"
                :variant="scopedPayments.length === 0 ? 'empty-data' : 'no-result'"
                size="sm"
                :title="scopedPayments.length === 0 ? 'Belum ada riwayat pembayaran' : 'Transaksi tidak ditemukan'"
                :description="scopedPayments.length === 0 ? 'Riwayat akan muncul setelah bukti pembayaran dikirim.' : 'Coba ubah kata pencarian atau filter status.'"
              />
            </section>

            <div v-if="reuploadPaymentId" id="reupload-panel" class="reupload-panel">
              <strong>Unggah bukti pengganti</strong>
              <p>Pengajuan pembayaran lama akan dipertahankan. Bukti baru mengembalikan status ke Menunggu Verifikasi.</p>
              <label class="proof-input">
                <strong>Pilih bukti pengganti</strong>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  :disabled="reuploadSubmitting"
                  @change="onReuploadProofChange"
                />
                <span class="proof-name">{{ reuploadProof ? reuploadProof.name : 'JPG, PNG, WEBP, atau PDF. Maksimal 5 MB.' }}</span>
              </label>
              <button
                v-if="reuploadItem?.proofPath"
                type="button"
                class="filter-chip"
                @click="openProof(reuploadItem)"
              >
                Lihat bukti sebelumnya
              </button>
              <button
                class="submit-payment-button"
                type="button"
                :disabled="!reuploadProof || reuploadSubmitting"
                @click="submitReupload"
              >
                <ion-spinner v-if="reuploadSubmitting" name="crescent" />
                <ion-icon v-else :icon="cloudUploadOutline" />
                {{ reuploadSubmitting ? 'Mengirim...' : 'Kirim bukti' }}
              </button>
              <button
                type="button"
                class="filter-chip"
                :disabled="reuploadSubmitting"
                @click="reuploadPaymentId = null"
              >
                Batal
              </button>
              <AppNotice v-if="reuploadError" tone="error" :message="reuploadError" />
            </div>

            <AppPagination
              v-model:page="historyPager.page"
              :total-pages="historyPager.totalPages"
              :total="historyPager.total"
              :page-size="historyPager.pageSize"
              scroll-to="#history-list-top"
              label="Halaman riwayat pembayaran"
            />
          </section>

          <div v-if="selectedTransaction && (latestCancellation || canRequestCancellation)" id="cancellation-status" class="cancellation-action">
            <AppNotice v-if="latestCancellation && latestCancellation.status !== 'Withdrawn'" :tone="latestCancellation.status === 'Rejected' ? 'warning' : latestCancellation.status === 'Approved' ? 'success' : 'info'" :title="`Status pembatalan: ${latestCancellation.status === 'Pending' ? 'Menunggu pemeriksaan' : latestCancellation.status === 'Approved' ? 'Disetujui' : 'Ditolak'}`">
              <p v-if="latestCancellation.decision_note">{{ latestCancellation.decision_note }}</p>
              <p v-if="latestCancellation.purchase_refunds?.[0]">Nilai pengembalian {{ formatCurrency(Number(latestCancellation.purchase_refunds[0].amount)) }}. Batas transfer {{ formatDate(latestCancellation.purchase_refunds[0].due_date) }}.</p>
            </AppNotice>
            <button
              v-if="canRequestCancellation"
              class="cancellation-request-button"
              type="button"
              :disabled="latestCancellation?.status === 'Pending'"
              @click="openCancellationForm"
            >
              {{ cancellationPending ? 'Menunggu Admin' : 'Batalkan pembelian' }}
            </button>
            <button
              v-if="cancellationPending"
              class="cancellation-withdraw-button"
              type="button"
              :disabled="cancellationSubmitting"
              @click="withdrawCancellation"
            >
              Tarik pengajuan
            </button>
          </div>
        </template>

        <StatusIllustration
          v-else
          variant="empty-data"
          title="Belum ada transaksi aktif"
          description="Informasi pembayaran akan muncul setelah transaksi kaveling dibuat untuk akun Anda."
          fill
        />

        <ClientRefundList :refresh-key="refundRefreshKey" />
        <ReviewInvite />
      </main>
    </ion-content>
    <MobileTabBar variant="client" />
    <DocumentViewerModal
      :open="proofItem !== null"
      :url="proofUrl"
      :file-name="proofFileName"
      :subtitle="proofItem ? `${proofItem.lot}, ${formatCurrency(proofItem.amount)}` : ''"
      :loading="proofLoading"
      :error="proofError"
      can-retry
      @close="closeProof"
      @retry="proofItem && openProof(proofItem)"
    />
    <ClientCancellationModal
      v-model="cancellationModalOpen"
      :transaction-id="selectedTransactionId"
      @update:saving="cancellationSubmitting = $event"
      @submitted="loadCancellationStatus"
    />
  </ion-page>
</template>

<style scoped>
.payment-page {
  --background: var(--app-background, #faf9f6);
  color: var(--text-primary, #252525);
  font-family: var(--font-primary, var(--ion-font-family, sans-serif));
}

.payment-content {
  --background: var(--app-background, #faf9f6);
}

.payment-shell {
  display: grid;
  gap: 20px;
  width: min(100%, 760px);
  margin: 0 auto;
  padding: 20px 16px calc(104px + var(--safe-bottom));
}

.transaction-card {
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 2px 8px rgb(37 37 37 / 4%);
}

/* Panel kaveling: pilihan di atas, semua data di bawahnya milik kaveling itu. */
.lot-hero {
  display: grid;
  gap: 16px;
  min-width: 0;
  padding: 20px;
  border-radius: var(--radius-panel, 20px);
  color: var(--on-forest, #f4f1e8);
  background:
    radial-gradient(90% 60% at 100% 0%, rgb(244 214 154 / 22%) 0%, rgb(244 214 154 / 0%) 60%),
    linear-gradient(155deg, var(--green-700, #355a2c) 0%, var(--green-900, #1f3519) 100%);
  box-shadow: var(--shadow-sm);
}

.lot-picker { min-width: 0; margin: 0; padding: 0; border: 0; }
.lot-picker legend { margin-bottom: 8px; padding: 0; font-size: 13px; font-weight: 600; }
.lot-options { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(128px, 100%), 1fr)); gap: 8px; }

.lot-option {
  display: flex;
  min-width: 0;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 8px 10px;
  border: 1px solid rgb(244 241 232 / 45%);
  border-radius: var(--radius-control, 12px);
  font-size: 13px;
  font-weight: 600;
  line-height: 1.3;
  text-align: center;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
  transition: transform var(--dur-fast, 160ms) var(--ease-spring, ease), background-color var(--dur-fast, 160ms) var(--ease-out, ease), color var(--dur-fast, 160ms) var(--ease-out, ease);
}

.lot-option-name { min-width: 0; overflow-wrap: break-word; text-wrap: balance; }
.lot-option:has(input:checked) { border-color: var(--poliland-gold-soft, #f4d69a); color: var(--ink, #1b1f1a); background: var(--poliland-gold-soft, #f4d69a); }
.lot-option:has(input:focus-visible) { outline: 3px solid #fff; outline-offset: 2px; }
.lot-option:active { transform: scale(0.97); }
.lot-picker:disabled .lot-option { cursor: not-allowed; opacity: 0.6; }

/* Dipasang ulang (:key) saat kaveling diganti agar terlihat datanya berubah. */
.lot-detail { display: grid; gap: 16px; min-width: 0; animation: view-panel-in var(--dur-base, 240ms) var(--ease-out, ease) both; }

.lot-hero .lot-heading h2 {
  margin: 0;
  color: #fff;
  font-family: var(--font-display, Georgia, serif);
  font-size: clamp(22px, 6.8vw, 28px);
  font-weight: 650;
  line-height: 1.15;
  overflow-wrap: break-word;
}
.lot-heading p { margin: 4px 0 0; font-size: 13px; line-height: 1.5; }

.lot-facts { display: grid; margin: 0; }
/* Bila label dan nilai tidak muat sebaris, nilai turun utuh ke baris berikutnya. */
.lot-fact {
  display: flex;
  flex-wrap: wrap;
  align-items: baseline;
  justify-content: space-between;
  gap: 2px 12px;
  padding: 10px 0;
  border-top: 1px solid rgb(244 241 232 / 18%);
}
.lot-fact dt { font-size: 13px; }
.lot-fact dd {
  margin: 0 0 0 auto;
  color: #fff;
  font-size: 15px;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.lot-fact .lot-fact-waiting { color: var(--poliland-gold-soft, #f4d69a); }

.spk-progress { display: grid; gap: 8px; padding: 12px; border-radius: var(--radius-control, 12px); background: rgb(0 0 0 / 22%); }
.spk-progress p { margin: 0; font-size: 13px; line-height: 1.45; }
.spk-progress-status { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 2px 12px; }
.spk-progress-status strong { color: var(--poliland-gold-soft, #f4d69a); }
.spk-progress-track { display: block; height: 6px; overflow: hidden; border-radius: 999px; background: rgb(244 241 232 / 22%); }
.spk-progress-track span { display: block; height: 100%; background: var(--poliland-gold-soft, #f4d69a); transform-origin: left center; transition: transform var(--dur-slow, 380ms) var(--ease-out, ease); }
.spk-progress .spk-progress-step { color: #fff; font-weight: 600; }

.lot-actions { display: grid; gap: 8px; }
.hero-button {
  display: flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 10px 16px;
  border: 1px solid transparent;
  border-radius: var(--radius-control, 12px);
  font: inherit;
  font-size: 14px;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
  transition: transform var(--dur-fast, 160ms) var(--ease-spring, ease), background-color var(--dur-fast, 160ms) var(--ease-out, ease);
}
.hero-button ion-icon { flex: 0 0 auto; font-size: 18px; }
.hero-button:active { transform: scale(0.97); }
.hero-button-primary { color: var(--ink, #1b1f1a); background: var(--poliland-gold, #cba044); }
.hero-button-ghost { border-color: rgb(244 241 232 / 45%); color: var(--on-forest, #f4f1e8); background: transparent; }
.payment-page .lot-hero button:focus-visible { outline-color: #fff; }

@media (hover: hover) and (pointer: fine) {
  .view-tab[aria-selected="false"]:hover { color: var(--text-primary, #252525); }
  .lot-option:not(:has(input:checked)):hover,
  .hero-button-ghost:hover { background: rgb(255 255 255 / 10%); }
}

.scope-switch { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 16px; background: var(--surface-muted, #f5f3ee); }
.scope-option,
.reupload-elsewhere { min-height: 44px; border: 0; border-radius: var(--radius-control, 12px); font: inherit; font-size: 13px; font-weight: 600; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; transition: transform var(--dur-fast, 160ms) var(--ease-spring, ease); }
.scope-option { padding: 8px; color: var(--text-secondary, #5f5f66); background: transparent; }
.scope-option[aria-pressed="true"] { color: #fff; background: var(--poliland-green, #355a2c); }
.scope-option:active,
.reupload-elsewhere:active { transform: scale(0.97); }
.reupload-elsewhere { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px 14px; color: var(--warning-text, #805708); background: var(--warning-bg, #fbf0d8); text-align: left; }

/* Tab Bayar / Riwayat: pil hijau bergeser di belakang label. */
.view-tabs {
  position: relative;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  padding: 4px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
}

.view-tabs::before {
  content: '';
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 4px;
  width: calc(50% - 4px);
  border-radius: 16px;
  background: var(--poliland-green, #355a2c);
  transition: transform var(--dur-base, 240ms) var(--ease-out, ease);
}

.view-tabs-history::before { transform: translateX(100%); }

.view-tab {
  position: relative;
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  border: 0;
  border-radius: 16px;
  color: var(--text-secondary, #5f5f66);
  background: transparent;
  font: inherit;
  font-size: 14px;
  font-weight: var(--font-weight-semibold, 600);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
  transition: color var(--dur-fast, 160ms) var(--ease-out, ease), transform var(--dur-fast, 160ms) var(--ease-spring, ease);
}

.view-tab[aria-selected="true"] { color: #fff; }
.view-tab:active { transform: scale(0.97); }

.view-tab-badge {
  display: inline-grid;
  min-width: 22px;
  height: 22px;
  place-items: center;
  padding: 0 6px;
  border-radius: 999px;
  color: #fff;
  background: #a85a13;
  font-size: 12px;
}

/* Berjalan ulang setiap panel ditampilkan lagi oleh v-show. */
.view-panel { animation: view-panel-in var(--dur-base, 240ms) var(--ease-out, ease) both; }

@keyframes view-panel-in {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: none; }
}

.transaction-chevron {
  color: #aab3c0;
  font-size: 22px;
}

.search-box {
  display: flex;
  min-height: 56px;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 2px 5px rgb(37 37 37 / 4%);
}

.search-box ion-icon {
  flex: 0 0 auto;
  color: var(--text-secondary, #717178);
  font-size: 23px;
}

.search-box input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--text-primary, #252525);
  background: transparent;
  font: inherit;
  font-size: 16px;
  text-overflow: ellipsis;
}

.search-box input::placeholder {
  color: var(--text-secondary, #717178);
  opacity: 0.8;
}

.search-box:focus-within {
  outline: 3px solid var(--poliland-green, #355a2c);
  outline-offset: 2px;
}

.filter-list {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 2px 0 6px;
  scrollbar-width: thin;
}

.filter-chip {
  min-height: 44px;
  flex: 0 0 auto;
  padding: 0 18px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  color: var(--text-secondary, #717178);
  background: var(--surface-primary, #fff);
  font: inherit;
  font-size: 14px;
  font-weight: var(--font-weight-medium, 500);
  cursor: pointer;
}

.filter-chip-active {
  border-color: var(--poliland-gold-soft, #f4d69a);
  color: var(--poliland-gold-text-soft, #805708);
  background: var(--poliland-gold-soft, #f4d69a);
}

.transaction-list {
  display: grid;
  gap: 14px;
}

.transaction-card {
  display: grid;
  grid-template-columns: 64px minmax(0, 1fr) 18px;
  align-items: center;
  gap: 8px 14px;
  padding: 16px;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.transaction-date {
  display: grid;
  grid-column: 1;
  grid-row: 1 / span 2;
  justify-items: center;
  gap: 2px;
  padding-right: 12px;
  border-right: 1px solid var(--border-default, #eae7e0);
  color: var(--text-secondary, #717178);
}

.transaction-date strong {
  color: var(--text-primary, #252525);
  font-size: 24px;
  font-weight: var(--font-weight-bold, 700);
  line-height: 1.1;
}

.transaction-date span {
  font-size: 14px;
}

.transaction-date small {
  font-size: 12px;
}

.transaction-info {
  display: grid;
  grid-column: 2;
  min-width: 0;
  gap: 3px;
}

.transaction-info strong,
.transaction-payment > strong {
  color: var(--text-primary, #252525);
  font-size: 15px;
  font-weight: var(--font-weight-semibold, 600);
}

.transaction-info strong,
.transaction-info > span {
  overflow-wrap: break-word;
}

.transaction-payment > strong {
  white-space: nowrap;
}

.transaction-info > span {
  color: var(--text-secondary, #5f5f66);
  font-size: 13px;
}

.transaction-payment {
  display: flex;
  grid-column: 2;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 6px 10px;
}

.transaction-card .transaction-chevron {
  grid-column: 3;
  grid-row: 1 / span 2;
}

.status-badge {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1.2;
  white-space: nowrap;
}

.status-verified {
  border-color: #b9f2dc;
  color: var(--poliland-green, #355a2c);
  background: var(--status-success-bg, #eaf7ef);
}

.status-pending {
  border-color: #f4d69a;
  color: #a85a13;
  background: #fff9e9;
}

.status-rejected {
  border-color: #ffd1d1;
  color: var(--danger-text, #a8322d);
  background: #fff1f1;
}

.status-refunded {
  border-color: var(--border-strong, #d5d0c4);
  color: var(--text-primary, #252525);
  background: var(--surface-muted, #f5f3ee);
}

.empty-state {
  display: grid;
  min-height: 180px;
  align-content: center;
  justify-items: center;
  gap: 8px;
  padding: 20px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  color: var(--text-secondary, #717178);
  background: var(--surface-primary, #fff);
  text-align: center;
}

.empty-state ion-icon {
  font-size: 28px;
}

.empty-state strong {
  color: var(--text-primary, #252525);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

.payment-page button:focus-visible {
  outline: 3px solid var(--poliland-green, #355a2c);
  outline-offset: 3px;
}

@media (max-width: 560px) {
  .payment-shell {
    gap: 16px;
    padding-inline: 12px;
    padding-top: 16px;
  }

  .lot-hero {
    padding: 16px;
  }

  .transaction-card {
    grid-template-columns: 52px minmax(0, 1fr) 14px;
    gap: 8px 10px;
    padding: 14px 12px;
  }

  .transaction-date {
    padding-right: 8px;
  }

  .transaction-date strong {
    font-size: 22px;
  }

  .transaction-info strong,
  .transaction-payment > strong {
    font-size: 14px;
  }

  .transaction-info > span {
    font-size: 12px;
  }

  .status-badge {
    padding-inline: 8px;
    font-size: 11px;
  }
}

@media (max-width: 380px) {
  .transaction-card {
    grid-template-columns: 46px minmax(0, 1fr) 14px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }

  .lot-option:active,
  .hero-button:active,
  .scope-option:active,
  .reupload-elsewhere:active { transform: none; }
}

/* Form pembayaran */
.payment-action-card {
  display: grid;
  gap: 16px;
  padding: 20px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 2px 8px rgb(37 37 37 / 4%);
}
.payment-action-card h2,
.payment-action-card h3 { margin: 0; color: var(--text-primary, #252525); }
.payment-action-card p { margin: 0; color: var(--text-secondary, #717178); font-size: 13px; line-height: 1.55; }
.form-field { display:grid; gap:7px; color:var(--text-primary,#252525); font-size:13px; font-weight:600; }
.form-field input,
.form-field textarea {
  width:100%; min-height:46px; padding:10px 12px; border:1px solid var(--border-default,#eae7e0);
  border-radius:12px; color:var(--text-primary,#252525); background:var(--surface-primary,#fff); font:inherit; font-size:16px;
}
.form-field textarea { min-height:80px; resize:vertical; }
.reupload-panel { display:grid; gap:10px; padding:14px;border:1px solid var(--border-default); border-radius:var(--nt-radius-inline); background:var(--surface-muted); color:var(--text-primary); font-size:13px; line-height:1.55; }
.cancellation-action { display: grid; gap: 9px; margin-top: 14px; }
.cancellation-request-button { min-height: 44px; padding: 10px 14px; border: 1px solid var(--status-danger, #a63e38); border-radius: var(--radius-control, 12px); background: var(--surface-primary, #fff); color: var(--status-danger, #a63e38); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.cancellation-request-button:focus-visible { outline: 3px solid var(--poliland-green, #355a2c); outline-offset: 2px; }
.cancellation-request-button:disabled { opacity: .65; cursor: not-allowed; }
.cancellation-withdraw-button { min-height: 44px; padding: 10px 14px; border: 1px solid var(--border-default, #eae7e0); border-radius: var(--radius-control, 12px); background: var(--surface-primary, #fff); color: var(--text-primary, #252525); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; touch-action: manipulation; }
.cancellation-withdraw-button:focus-visible { outline: 3px solid var(--poliland-green, #355a2c); outline-offset: 2px; }
.cancellation-withdraw-button:disabled { opacity: .65; cursor: not-allowed; }
.schedule-picker { display:grid; gap:8px; }
.schedule-picker-header { display:flex; justify-content:space-between; align-items:center; gap:10px; }
.schedule-row {
  display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px;
  border:1px solid var(--border-default,#eae7e0); border-radius:12px; background:var(--surface-primary,#fff);
}
.schedule-row.selected { border-color:var(--poliland-green,#55784b); background:var(--status-success-bg,#f1f6ee); }
.schedule-row.locked { background:var(--surface-muted,#f5f3ee); }
.schedule-row-main { display:flex; flex:1; align-items:center; gap:10px; min-width:0; }
.schedule-row input { flex:0 0 auto; width:18px; height:18px; accent-color:var(--poliland-green,#355a2c); }
.schedule-row-copy { display:grid; gap:3px; min-width:0; }
.schedule-row-copy strong { color:var(--text-primary,#252525); font-size:13px; }
.schedule-row-copy small { color:var(--text-secondary,#717178); font-size:11px; }
.schedule-row-amount { flex:0 0 auto; text-align:right; white-space:nowrap; }
.schedule-row-amount strong { color:var(--text-primary,#252525); font-size:13px; }
.schedule-row-amount small { display:block; color:var(--text-secondary,#717178); font-size:10px; }
.payment-total {
  display:flex; flex-wrap:wrap; align-items:center; justify-content:space-between; gap:4px 12px; padding:14px;
  border-radius:12px; background:var(--surface-muted,#f5f3ee);
}
.payment-total span { color:var(--text-secondary,#717178); font-size:12px; }
.payment-total strong { margin-left:auto; white-space:nowrap; color:var(--text-primary,#252525); font-size:18px; }
.proof-input { display:grid; gap:8px; padding:14px; border:1px dashed var(--border-default,#c9c9c9); border-radius:12px; }
.proof-input input { width:100%; font-size:12px; }
.proof-name { color:var(--poliland-green,#355a2c); font-size:12px; overflow-wrap:anywhere; }
.submit-payment-button {
  display:flex; min-height:50px; align-items:center; justify-content:center; gap:8px; width:100%;
  border:0; border-radius:13px; color:#fff; background:var(--poliland-green,#355a2c);
  font:inherit; font-size:14px; font-weight:700; cursor:pointer;
}
.submit-payment-button:disabled { opacity:.55; cursor:not-allowed; }
.transaction-card { width:100%; border:1px solid var(--border-default,#eae7e0); text-align:left; }
@media(max-width:560px) {
  .payment-action-card { padding:16px; }
}
</style>
