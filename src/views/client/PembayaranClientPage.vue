<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/vue'
import {
  checkmarkCircleOutline,
  chevronForward,
  documentTextOutline,
  hourglassOutline,
  searchOutline,
  cloudUploadOutline,
  lockClosedOutline,
  walletOutline,
} from 'ionicons/icons'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { supabase } from '@/services/config/supabase'
import { paymentService } from '@/services/Finance/paymentService'
import { purchaseCancellationService } from '@/services/Finance/purchaseCancellationService'

/**
 * PENTING:
 * 1. Buat bucket Supabase Storage bernama payment-proofs (private).
 * 2. Buat RPC public.submit_client_payment sesuai SQL migration pendamping.
 * 3. RPC yang memvalidasi nominal, DP, urutan cicilan, kepemilikan transaksi,
 *    dan status SPK. Validasi di frontend hanya untuk UX, bukan keamanan.
 */
const PAYMENT_PROOF_BUCKET = 'payment-proofs'
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
  id: number
  reference: string
  date: string | null
  installmentNumbers: number[]
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
const submitSuccess = ref('')
const reuploadPaymentId = ref<number | null>(null)
const reuploadProof = ref<File | null>(null)
const reuploadSubmitting = ref(false)
const reuploadError = ref('')
const cancellationModalOpen = ref(false)
const cancellationReason = ref('')
const cancellationSubmitting = ref(false)
const cancellationError = ref('')
const cancellationSuccess = ref('')
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

const verifiedTotal = computed(() =>
  paymentHistory.value.filter(item => item.status === 'verified').reduce((sum, item) => sum + item.amount, 0),
)
const pendingTotal = computed(() =>
  paymentHistory.value.filter(item => item.status === 'pending').reduce((sum, item) => sum + item.amount, 0),
)
const filteredTransactions = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('id-ID')
  return paymentHistory.value.filter(item => {
    const matchesFilter = selectedFilter.value === 'all' || item.status === selectedFilter.value
    const text = [
      item.reference, item.lot, item.method, item.category, item.note ?? '',
      item.installmentNumbers.join(' '), getStatusLabel(item.status, item.rawStatus),
    ].join(' ').toLocaleLowerCase('id-ID')
    return matchesFilter && (!query || text.includes(query))
  })
})

const isSpkCompleted = computed(() =>
  selectedTransaction.value?.notaryStatus?.toLocaleLowerCase('id-ID') === 'selesai',
)
const isInstallment = computed(() => selectedTransaction.value?.paymentType === 'Installment')
const dpRequired = computed(() => Boolean(selectedTransaction.value && selectedTransaction.value.downPayment > 0))
const dpPayments = computed(() =>
  selectedTransaction.value?.payments.filter(item => item.payment_category === 'Down Payment') ?? [],
)
const dpConfirmed = computed(() => dpPayments.value.some(item => item.status === 'Confirmed'))
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

const nextInstallmentIndex = computed(() => {
  const schedules = selectedTransaction.value?.schedules ?? []
  return schedules.findIndex(item => item.status !== 'Paid')
})
const firstUnpaidSchedule = computed(() => {
  const index = nextInstallmentIndex.value
  return index >= 0 ? selectedTransaction.value?.schedules[index] ?? null : null
})
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
    result.push(schedule)
  }
  return result
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
  if (!isSpkCompleted.value) return 'Pembayaran baru dapat dilakukan setelah proses SPK dan notaris berstatus Selesai.'
  if (transaction.transactionStatus === 'Cancelled') return 'Transaksi ini sudah dibatalkan.'
  if (transaction.paymentType === 'Cash') {
    if (cashPaid.value >= transaction.finalPrice) return 'Pembayaran tunai sudah lunas.'
    if (cashPending.value) return 'Pembayaran tunai sedang menunggu verifikasi Admin.'
    return ''
  }
  if (dpRequired.value && !dpConfirmed.value) {
    if (dpConfirmed.value) return ''
    if (dpPending.value) return 'Pembayaran DP sedang menunggu verifikasi Admin. Cicilan belum dapat dibayar.'
    return ''
  }
  if (!transaction.schedules.length) return 'Jadwal cicilan final belum tersedia. Silakan hubungi Admin.'
  if (firstUnpaidSchedule.value === null) return 'Seluruh cicilan sudah lunas.'
  if (firstUnpaidHasPending.value) return 'Cicilan berikutnya sedang menunggu verifikasi. Tunggu konfirmasi Admin sebelum mengirim pembayaran baru.'
  if (selectedScheduleIds.value.length === 0) return 'Pilih cicilan yang ingin dibayar.'
  return ''
})
const canSubmitPayment = computed(() =>
  !loading.value &&
  !submitting.value &&
  Boolean(selectedTransaction.value) &&
  isSpkCompleted.value &&
  paymentAmount.value > 0 &&
  Boolean(paymentCategory.value) &&
  Boolean(selectedProof.value) &&
  !paymentBlockedReason.value,
)

const detailMessage = (item: PaymentHistoryItem) => [
  `Referensi: ${item.reference}`,
  `Kavling: ${item.lot}`,
  `Kategori: ${item.category}`,
  item.installmentNumbers.length ? `Cicilan: ${item.installmentNumbers.join(', ')}` : '',
  `Tanggal: ${item.date ? formatDate(item.date) : 'Belum dicatat'}`,
  `Jumlah: ${formatCurrency(item.amount)}`,
  `Metode: ${item.method || 'Tidak dicantumkan'}`,
  `Status: ${getStatusLabel(item.status, item.rawStatus)}`,
  item.note ? `Catatan: ${item.note}` : '',
  item.reviewNote ? `Catatan verifikasi: ${item.reviewNote}` : '',
].filter(Boolean).join('\n')

function formatCurrency(amount: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(amount || 0)
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
    Booking: 'Booking Fee',
    'Down Payment': 'Uang Muka (DP)',
    Installment: 'Cicilan',
    'Cash Purchase': 'Pembelian Tunai',
    Other: 'Lainnya',
    Unclassified: 'Belum Dikategorikan',
  }
  return labels[category] ?? category
}
function getLotLabel(lot: any) {
  if (!lot) return 'Kavling tidak tersedia'
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
  submitSuccess.value = ''
  const input = document.getElementById('payment-proof-file') as HTMLInputElement | null
  if (input) input.value = ''
}

async function loadPaymentData() {
  loading.value = true
  loadError.value = ''
  try {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    const user = authData.user
    if (!user) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.')

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
          created_at, transaction_id, status, payment_category, proof_path,
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

    paymentHistory.value = paymentRows.map((row: any) => ({
      id: Number(row.id),
      reference: row.reference_number || `PAY-${String(row.id).padStart(5, '0')}`,
      date: row.payment_date,
      installmentNumbers: getPaymentInstallmentNumbers(row),
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
    resetPaymentForm()
  } catch (error: any) {
    console.error('Gagal memuat data pembayaran client:', error)
    loadError.value = error?.message || 'Terjadi kesalahan saat mengambil data pembayaran.'
    transactions.value = []
    paymentHistory.value = []
  } finally {
    loading.value = false
  }
}

async function openCancellationForm() {
  cancellationError.value = ''
  cancellationSuccess.value = ''
  cancellationReason.value = ''
  latestCancellation.value = null
  const transaction = selectedTransaction.value
  if (!transaction || transaction.transactionStatus === 'Cancelled') return
  try {
    latestCancellation.value = await purchaseCancellationService.getLatest(transaction.id)
  } catch (error) {
    console.warn('Riwayat pembatalan belum tersedia. Jalankan migrasi keuangan untuk mengaktifkan fitur ini.', error)
  }
  cancellationModalOpen.value = true
}

async function submitCancellationRequest() {
  const transaction = selectedTransaction.value
  const reason = cancellationReason.value.trim()
  if (!transaction || reason.length < 5 || cancellationSubmitting.value) return
  cancellationSubmitting.value = true
  cancellationError.value = ''
  try {
    const requestId = await purchaseCancellationService.request(transaction.id, reason)
    cancellationSuccess.value = `Pengajuan pembatalan #${requestId} sudah dikirim. Admin akan memeriksa permintaan dan riwayat pembayaran Anda.`
    latestCancellation.value = await purchaseCancellationService.getLatest(transaction.id).catch(() => null)
    cancellationModalOpen.value = false
  } catch (error: any) {
    cancellationError.value = error?.message || 'Pengajuan pembatalan belum dapat dikirim.'
  } finally {
    cancellationSubmitting.value = false
  }
}

async function submitPayment() {
  if (!canSubmitPayment.value || !selectedTransaction.value || !selectedProof.value || !paymentCategory.value) return
  submitting.value = true
  submitError.value = ''
  submitSuccess.value = ''
  let uploadedPath: string | null = null

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    const user = authData.user
    if (!user) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.')

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

    submitSuccess.value = 'Bukti pembayaran berhasil dikirim. Status pembayaran sekarang menunggu verifikasi Admin.'
    await loadPaymentData()
    submitSuccess.value = 'Bukti pembayaran berhasil dikirim. Status pembayaran menunggu verifikasi Admin.'
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
function openTransaction(item: PaymentHistoryItem) {
  reuploadError.value = ''
  reuploadProof.value = null
  reuploadPaymentId.value = item.rawStatus === 'Needs Reupload' ? item.id : null
  if (item.rawStatus !== 'Needs Reupload') {
    window.alert(detailMessage(item))
  }
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
    await paymentService.replacePaymentProof(reuploadPaymentId.value, reuploadProof.value)
    reuploadPaymentId.value = null
    reuploadProof.value = null
    submitSuccess.value = 'Bukti pengganti berhasil dikirim. Pengajuan lama kembali berstatus menunggu verifikasi.'
    await loadPaymentData()
  } catch (error: any) {
    reuploadError.value = error?.message || 'Bukti pengganti gagal dikirim.'
  } finally {
    reuploadSubmitting.value = false
  }
}

onMounted(loadPaymentData)
</script>

<template>
  <ion-page class="payment-page">
    <AppHeader variant="client" title="PoliLand Kairagi" :show-back="false" />

    <ion-content class="payment-content" :fullscreen="true">
      <main class="payment-shell">
        <section class="lot-card" aria-labelledby="lot-title">
          <div class="section-title">
            <span class="title-icon title-icon-gold"><ion-icon :icon="documentTextOutline" /></span>
            <h2 id="lot-title">Informasi Kavling</h2>
          </div>
          <div v-if="selectedTransaction" class="lot-summary">
            <span class="lot-thumbnail" aria-hidden="true"><ion-icon :icon="walletOutline" /></span>
            <span class="lot-copy">
              <strong>{{ selectedTransaction.lot }}</strong>
              <span>{{ selectedTransaction.area != null ? `${selectedTransaction.area.toLocaleString('id-ID')} m²` : 'Luas belum tersedia' }}</span>
              <span class="lot-location">{{ selectedTransaction.dimension || selectedTransaction.block }}</span>
              <span class="spk-status">
                <ion-icon :icon="checkmarkCircleOutline" />
                SPK: {{ selectedTransaction.notaryStatus || 'Belum selesai' }}
              </span>
            </span>
            <ion-icon class="lot-chevron" :icon="chevronForward" />
          </div>
          <div v-if="selectedTransaction" class="cancellation-action">
            <div v-if="cancellationSuccess" class="payment-notice" role="status">{{ cancellationSuccess }}</div>
            <div v-if="latestCancellation" class="payment-notice" :class="latestCancellation.status === 'Rejected' ? 'warning' : ''">
              <strong>Status pembatalan: {{ latestCancellation.status === 'Pending' ? 'Menunggu pemeriksaan' : latestCancellation.status === 'Approved' ? 'Disetujui' : 'Ditolak' }}</strong>
              <span v-if="latestCancellation.decision_note">{{ latestCancellation.decision_note }}</span>
              <span v-if="latestCancellation.purchase_refunds?.[0]">Nilai pengembalian {{ formatCurrency(Number(latestCancellation.purchase_refunds[0].amount)) }}. Batas transfer {{ formatDate(latestCancellation.purchase_refunds[0].due_date) }}.</span>
            </div>
            <button
              v-if="selectedTransaction.transactionStatus !== 'Cancelled'"
              class="cancellation-request-button"
              type="button"
              :disabled="latestCancellation?.status === 'Pending'"
              @click="openCancellationForm"
            >
              {{ latestCancellation?.status === 'Pending' ? 'Pengajuan menunggu Admin' : 'Ajukan Pembatalan Pembelian' }}
            </button>
          </div>
          <div v-else class="empty-inline">Belum ada transaksi kavling pada akun ini.</div>
        </section>

        <section class="summary-grid" aria-label="Ringkasan pembayaran">
          <article class="summary-card">
            <span class="summary-icon summary-icon-gold"><ion-icon :icon="documentTextOutline" /></span>
            <span class="summary-label">Total Pembayaran</span>
            <strong>{{ paymentHistory.length }} pembayaran</strong>
          </article>
          <article class="summary-card">
            <span class="summary-icon summary-icon-green"><ion-icon :icon="checkmarkCircleOutline" /></span>
            <span class="summary-label">Terverifikasi</span>
            <strong class="amount-green">{{ formatCurrency(verifiedTotal) }}</strong>
          </article>
          <article class="summary-card">
            <span class="summary-icon summary-icon-orange"><ion-icon :icon="hourglassOutline" /></span>
            <span class="summary-label">Menunggu Verifikasi</span>
            <strong class="amount-orange">{{ formatCurrency(pendingTotal) }}</strong>
          </article>
        </section>

        <div v-if="loading" class="empty-state" role="status">
          <ion-spinner name="crescent" />
          <strong>Memuat data pembayaran...</strong>
          <span>Data transaksi dan jadwal sedang diambil dari database.</span>
        </div>
        <div v-else-if="loadError" class="empty-state" role="alert">
          <strong>Data pembayaran belum dapat dimuat</strong>
          <span>{{ loadError }}</span>
          <button type="button" class="filter-chip filter-chip-active" @click="loadPaymentData">Coba lagi</button>
        </div>

        <template v-else-if="transactions.length">
          <section class="payment-action-card" aria-labelledby="payment-form-title">
            <div class="section-title">
              <span class="title-icon title-icon-gold"><ion-icon :icon="walletOutline" /></span>
              <div>
                <h2 id="payment-form-title">Lakukan Pembayaran</h2>
                <p>Nominal dan jadwal mengikuti kesepakatan final SPK.</p>
              </div>
            </div>

            <div class="transaction-picker">
              <label for="transaction-select">Pilih transaksi / kavling</label>
              <select id="transaction-select" :value="selectedTransactionId ?? ''" @change="selectTransaction(($event.target as HTMLSelectElement).value)">
                <option v-for="item in transactions" :key="item.id" :value="item.id">
                  {{ item.lot }} — {{ item.paymentType === 'Cash' ? 'Tunai' : 'Cicilan' }}
                </option>
              </select>
            </div>

            <template v-if="selectedTransaction">
              <div class="payment-info-grid">
                <div class="payment-info-item">
                  <span>Harga final SPK</span>
                  <strong>{{ formatCurrency(selectedTransaction.finalPrice) }}</strong>
                </div>
                <div class="payment-info-item">
                  <span>Skema pembayaran</span>
                  <strong>{{ selectedTransaction.paymentType === 'Cash' ? 'Tunai' : 'Cicilan' }}</strong>
                </div>
                <template v-if="isInstallment">
                  <div class="payment-info-item">
                    <span>Skema DP</span>
                    <strong>{{ dpRequired ? formatCurrency(selectedTransaction.downPayment) : 'Tanpa DP (Pure Cicilan)' }}</strong>
                  </div>
                  <div class="payment-info-item">
                    <span>Tenor SPK</span>
                    <strong>{{ selectedTransaction.months ? `${selectedTransaction.months} bulan` : `${selectedTransaction.schedules.length} jadwal` }}</strong>
                  </div>
                </template>
              </div>

              <div v-if="!isSpkCompleted" class="payment-notice warning">
                <strong><ion-icon :icon="lockClosedOutline" /> Pembayaran belum dibuka.</strong>
                <p>Pengiriman bukti pembayaran hanya tersedia setelah proses SPK dan notaris selesai.</p>
              </div>

              <template v-else-if="selectedTransaction.paymentType === 'Cash'">
                <div class="payment-notice">
                  Skema tunai hanya menyediakan pelunasan harga final kavling. Tidak ada pilihan cicilan atau DP.
                </div>
                <div class="payment-total">
                  <span>Sisa pelunasan</span>
                  <strong>{{ formatCurrency(cashOutstanding) }}</strong>
                </div>
                <div v-if="cashPending" class="payment-notice warning">
                  Pembayaran tunai sedang menunggu verifikasi Admin. Anda belum dapat mengirim pembayaran lain.
                </div>
                <div v-else-if="cashPaid >= selectedTransaction.finalPrice" class="payment-notice">
                  Pembayaran tunai sudah terverifikasi lunas.
                </div>
              </template>

              <template v-else>
                <template v-if="dpRequired && !dpConfirmed">
                  <div class="payment-notice warning">
                    <strong>DP wajib dibayar terlebih dahulu.</strong>
                    <p>Setelah DP dikonfirmasi Admin, jadwal cicilan akan terbuka. Untuk transaksi ini DP sebesar {{ formatCurrency(selectedTransaction.downPayment) }}.</p>
                  </div>
                  <div v-if="dpPending" class="payment-notice warning">
                    Bukti DP sedang menunggu verifikasi. Cicilan belum dapat dibayar sampai DP dikonfirmasi.
                  </div>
                  <div v-else class="payment-total">
                    <span>Nominal DP yang harus dibayar</span>
                    <strong>{{ formatCurrency(selectedTransaction.downPayment) }}</strong>
                  </div>
                </template>

                <template v-else>
                  <div class="payment-notice">
                    <strong>{{ dpRequired ? 'DP telah dikonfirmasi.' : 'Pure cicilan tanpa DP.' }}</strong>
                    <p>Pilih cicilan secara berurutan. Anda dapat membayar satu atau beberapa cicilan sekaligus, tetapi tidak boleh melewati nomor cicilan yang belum lunas.</p>
                  </div>

                  <div v-if="firstUnpaidHasPending" class="payment-notice warning">
                    Cicilan ke-{{ firstUnpaidSchedule?.installmentNumber }} sedang menunggu verifikasi. Cicilan berikutnya dikunci sampai Admin menyelesaikan verifikasi.
                  </div>
                  <div v-else-if="firstUnpaidSchedule" class="schedule-picker">
                    <div class="schedule-picker-header">
                      <h3>Jadwal Cicilan</h3>
                      <small>{{ selectedScheduleIds.length }} dipilih</small>
                    </div>
                    <label
                      v-for="schedule in selectedTransaction.schedules"
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
                          <strong>Cicilan #{{ schedule.installmentNumber }}</strong>
                          <small>{{ schedule.dueDate ? formatDate(schedule.dueDate) : 'Tanggal belum ditentukan' }}</small>
                          <small v-if="schedule.status === 'Paid'">Sudah lunas</small>
                          <small v-else-if="schedule.hasPendingPayment">Menunggu verifikasi</small>
                          <small v-else-if="schedule.status === 'Overdue'">Jatuh tempo terlewat</small>
                        </span>
                      </span>
                      <span class="schedule-row-amount">
                        <strong>{{ formatCurrency(schedule.amount) }}</strong>
                        <small>{{ schedule.status === 'Paid' ? 'Lunas' : schedule.hasPendingPayment ? 'Diproses' : schedule.status }}</small>
                      </span>
                    </label>
                  </div>
                  <div v-else class="payment-notice">
                    Semua jadwal cicilan telah lunas.
                  </div>

                  <div v-if="selectedScheduleIds.length" class="payment-total">
                    <span>Total {{ selectedScheduleIds.length }} cicilan dipilih</span>
                    <strong>{{ formatCurrency(installmentTotal) }}</strong>
                  </div>
                </template>
              </template>

              <template v-if="isSpkCompleted && !paymentBlockedReason">
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
                  <span>{{ paymentCategory === 'Cash Purchase' ? 'Pelunasan tunai' : paymentCategory === 'Down Payment' ? 'Pembayaran DP' : 'Total pembayaran cicilan' }}</span>
                  <strong>{{ formatCurrency(paymentAmount) }}</strong>
                </div>
                <button class="submit-payment-button" type="button" :disabled="!canSubmitPayment" @click="submitPayment">
                  <ion-spinner v-if="submitting" name="crescent" />
                  <ion-icon v-else :icon="cloudUploadOutline" />
                  {{ submitting ? 'Mengirim bukti...' : 'Kirim Bukti Pembayaran' }}
                </button>
              </template>

              <div v-if="paymentBlockedReason && isSpkCompleted" class="payment-notice warning">
                {{ paymentBlockedReason }}
              </div>
              <div v-if="submitError" class="payment-notice error" role="alert">{{ submitError }}</div>
              <div v-if="submitSuccess" class="payment-result" role="status">{{ submitSuccess }}</div>
            </template>
          </section>

          <section class="payment-action-card">
            <div class="section-title">
              <span class="title-icon title-icon-gold"><ion-icon :icon="documentTextOutline" /></span>
              <div>
                <h2>Riwayat Pembayaran</h2>
                <p>Semua pengiriman bukti dan status verifikasi.</p>
              </div>
            </div>

            <label class="search-box">
              <ion-icon :icon="searchOutline" aria-hidden="true" />
              <span class="visually-hidden">Cari transaksi atau nomor kavling</span>
              <input v-model="searchQuery" type="search" placeholder="Cari transaksi atau nomor kavling..." />
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

            <section class="transaction-list" aria-label="Daftar transaksi pembayaran">
              <button
                v-for="item in filteredTransactions"
                :key="item.id"
                class="transaction-card"
                type="button"
                @click="openTransaction(item)"
              >
                <span class="transaction-date">
                  <strong>{{ formatDateParts(item.date).day }}</strong>
                  <span>{{ formatDateParts(item.date).month }}</span>
                  <small>{{ formatDateParts(item.date).year }}</small>
                </span>
                <span class="transaction-info">
                  <strong>{{ item.installmentNumbers.length ? `Cicilan ${item.installmentNumbers.map(n => `#${n}`).join(', ')}` : item.category }}</strong>
                  <span>{{ item.lot }}</span>
                </span>
                <span class="transaction-payment">
                  <strong>{{ formatCurrency(item.amount) }}</strong>
                  <span class="payment-meta">
                    <span>{{ item.method }}</span>
                    <span class="status-badge" :class="`status-${item.status}`">
                      {{ getStatusLabel(item.status, item.rawStatus) }}
                    </span>
                  </span>
                </span>
                <ion-icon class="transaction-chevron" :icon="chevronForward" aria-hidden="true" />
              </button>

              <div v-if="filteredTransactions.length === 0" class="empty-state" role="status">
                <ion-icon :icon="searchOutline" />
                <strong>{{ paymentHistory.length === 0 ? 'Belum ada riwayat pembayaran' : 'Transaksi tidak ditemukan' }}</strong>
                <span>{{ paymentHistory.length === 0 ? 'Riwayat akan muncul setelah bukti pembayaran dikirim.' : 'Coba ubah kata pencarian atau filter status.' }}</span>
              </div>
            </section>

            <div v-if="reuploadPaymentId" class="payment-notice warning">
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
                class="submit-payment-button"
                type="button"
                :disabled="!reuploadProof || reuploadSubmitting"
                @click="submitReupload"
              >
                <ion-spinner v-if="reuploadSubmitting" name="crescent" />
                <ion-icon v-else :icon="cloudUploadOutline" />
                {{ reuploadSubmitting ? 'Mengirim bukti...' : 'Kirim Bukti Pengganti' }}
              </button>
              <button
                type="button"
                class="filter-chip"
                :disabled="reuploadSubmitting"
                @click="reuploadPaymentId = null"
              >
                Batal
              </button>
              <p v-if="reuploadError" class="payment-notice error" role="alert">{{ reuploadError }}</p>
            </div>
          </section>
        </template>

        <div v-else class="empty-state">
          <strong>Belum ada transaksi aktif</strong>
          <span>Informasi pembayaran akan muncul setelah transaksi kavling dibuat untuk akun Anda.</span>
        </div>
      </main>
    </ion-content>
    <MobileTabBar variant="client" />
    <AppModal
      v-model="cancellationModalOpen"
      title="Ajukan Pembatalan Pembelian"
      confirm-text="Kirim Pengajuan"
      :loading="cancellationSubmitting"
      :confirm-disabled="cancellationReason.trim().length < 5"
      @confirm="submitCancellationRequest"
    >
      <div class="cancellation-modal-copy">
        <p>Permintaan akan diperiksa Admin. Jika disetujui, kavling dilepaskan dan pengembalian dihitung sebesar 50% dari uang muka serta cicilan yang sudah dikonfirmasi. Booking Fee tidak dikembalikan.</p>
        <label for="purchase-cancellation-reason">Alasan pembatalan</label>
        <textarea id="purchase-cancellation-reason" v-model="cancellationReason" rows="4" maxlength="2000" placeholder="Jelaskan alasan pengajuan pembatalan (minimal 5 karakter)." />
        <small>{{ cancellationReason.trim().length }}/2000 karakter</small>
        <p v-if="cancellationError" class="payment-notice error" role="alert">{{ cancellationError }}</p>
      </div>
    </AppModal>
  </ion-page>
</template>

<style scoped>
.empty-inline { color:var(--text-secondary,#717178); font-size:13px; padding:8px 0; }
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
  padding: 20px 16px calc(104px + env(safe-area-inset-bottom, 0px));
}

.lot-card,
.summary-card,
.transaction-card {
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 2px 8px rgb(37 37 37 / 4%);
}

.lot-card {
  padding: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.section-title h2 {
  margin: 0;
  color: var(--text-primary, #252525);
  font-size: 18px;
  font-weight: var(--font-weight-semibold, 600);
}

.title-icon,
.summary-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: var(--radius-control, 12px);
}

.title-icon {
  width: 48px;
  height: 48px;
  font-size: 22px;
}

.title-icon-gold,
.summary-icon-gold {
  color: var(--poliland-gold-text, #966a12);
  background: var(--poliland-gold-soft, #f4d69a);
}

.lot-summary {
  display: grid;
  width: 100%;
  grid-template-columns: 120px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 14px;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  text-align: left;
}

.lot-thumbnail {
  display: grid;
  min-height: 88px;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-muted, #f5f3ee);
}

.lot-copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.lot-copy > strong {
  color: var(--text-primary, #252525);
  font-size: 17px;
  font-weight: var(--font-weight-semibold, 600);
}

.lot-copy > span:not(.spk-status) {
  color: var(--text-secondary, #717178);
  font-size: 14px;
}

.lot-copy .lot-location {
  color: var(--poliland-gold-text, #966a12);
}

.spk-status {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  padding: 6px 9px;
  border: 1px solid var(--poliland-gold-soft, #f4d69a);
  border-radius: var(--radius-control, 12px);
  color: var(--poliland-gold-text, #966a12);
  background: var(--surface-muted, #f5f3ee);
  font-size: 12px;
}

.lot-chevron,
.transaction-chevron {
  color: #aab3c0;
  font-size: 22px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  display: grid;
  min-width: 0;
  min-height: 150px;
  align-content: space-between;
  justify-items: start;
  gap: 10px;
  padding: 16px;
}

.summary-icon {
  width: 48px;
  height: 48px;
  font-size: 22px;
}

.summary-icon-green {
  color: var(--poliland-green, #355a2c);
  background: var(--status-success-bg, #eaf7ef);
}

.summary-icon-orange {
  color: #a85a13;
  background: #fff3e5;
}

.summary-label {
  min-height: 36px;
  color: var(--text-secondary, #717178);
  font-size: 13px;
  line-height: 1.35;
}

.summary-card > strong {
  overflow-wrap: anywhere;
  color: var(--text-primary, #252525);
  font-size: 16px;
  font-weight: var(--font-weight-semibold, 600);
}

.summary-card .amount-green {
  color: var(--poliland-green, #355a2c);
}

.summary-card .amount-orange {
  color: #a85a13;
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
  font-size: 15px;
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
  min-height: 132px;
  grid-template-columns: 64px minmax(0, 1fr) minmax(0, 1.2fr) 18px;
  align-items: center;
  gap: 14px;
  padding: 16px;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.transaction-date {
  display: grid;
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

.transaction-info,
.transaction-payment,
.payment-meta {
  display: grid;
  min-width: 0;
}

.transaction-info {
  gap: 5px;
}

.transaction-info strong,
.transaction-payment > strong {
  overflow: hidden;
  color: var(--text-primary, #252525);
  font-size: 15px;
  font-weight: var(--font-weight-semibold, 600);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transaction-info > span,
.payment-meta > span:first-child {
  overflow: hidden;
  color: var(--text-secondary, #717178);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transaction-payment {
  justify-items: end;
  gap: 5px;
}

.payment-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
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
  color: var(--status-danger, #d94b45);
  background: #fff1f1;
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

  .lot-card {
    padding: 16px;
  }

  .lot-summary {
    grid-template-columns: 96px minmax(0, 1fr) 16px;
    gap: 10px;
  }

  .lot-thumbnail {
    min-height: 82px;
  }

  .lot-copy > strong {
    font-size: 15px;
  }

  .lot-copy > span:not(.spk-status) {
    font-size: 12px;
  }

  .spk-status {
    font-size: 10px;
  }

  .summary-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 8px;
  }

  .summary-card {
    min-height: 148px;
    gap: 8px;
    padding: 10px;
  }

  .summary-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }

  .summary-label {
    min-height: 32px;
    font-size: 11px;
  }

  .summary-card > strong {
    font-size: 12px;
  }

  .transaction-card {
    grid-template-columns: 52px minmax(0, 1fr) auto 14px;
    gap: 10px;
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
    font-size: 13px;
  }

  .transaction-info > span,
  .payment-meta > span:first-child {
    font-size: 11px;
  }

  .status-badge {
    padding-inline: 8px;
    font-size: 10px;
  }
}

@media (max-width: 380px) {
  .summary-card {
    min-height: 150px;
    padding: 10px;
  }

  .summary-card > strong {
    font-size: 12px;
  }

  .transaction-card {
    grid-template-columns: 46px minmax(0, 1fr) 18px;
  }

  .transaction-payment {
    grid-column: 2;
    justify-items: start;
  }

  .transaction-chevron {
    grid-column: 3;
    grid-row: 1 / span 2;
  }

  .payment-meta {
    justify-content: flex-start;
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
.transaction-picker { display:grid; gap:8px; }
.transaction-picker label,
.form-field { display:grid; gap:7px; color:var(--text-primary,#252525); font-size:13px; font-weight:600; }
.transaction-picker select,
.form-field input,
.form-field textarea {
  width:100%; min-height:46px; padding:10px 12px; border:1px solid var(--border-default,#eae7e0);
  border-radius:12px; color:var(--text-primary,#252525); background:var(--surface-primary,#fff); font:inherit;
}
.form-field textarea { min-height:80px; resize:vertical; }
.payment-info-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:10px; }
.payment-info-item { display:grid; gap:4px; padding:12px; border-radius:12px; background:var(--surface-muted,#f5f3ee); }
.payment-info-item span { color:var(--text-secondary,#717178); font-size:11px; }
.payment-info-item strong { color:var(--text-primary,#252525); font-size:14px; overflow-wrap:anywhere; }
.payment-notice { padding:12px 14px; border-radius:12px; background:#f4f6f1; color:#41553b; font-size:12px; line-height:1.55; }
.payment-notice.warning { background:#fff6e8; color:#925713; }
.payment-notice.error { background:#fff0ef; color:#a63e38; }
.cancellation-action { display: grid; gap: 9px; margin-top: 14px; }
.cancellation-request-button { min-height: 44px; padding: 10px 14px; border: 1px solid var(--status-danger, #a63e38); border-radius: var(--radius-control, 12px); background: var(--surface-primary, #fff); color: var(--status-danger, #a63e38); font: inherit; font-size: 12px; font-weight: 600; cursor: pointer; }
.cancellation-request-button:focus-visible { outline: 3px solid var(--poliland-green, #355a2c); outline-offset: 2px; }
.cancellation-request-button:disabled { opacity: .65; cursor: not-allowed; }
.cancellation-modal-copy { display: grid; gap: 10px; color: var(--text-primary, #252525); font-size: 13px; line-height: 1.55; }
.cancellation-modal-copy p { margin: 0; }
.cancellation-modal-copy label { font-weight: 600; }
.cancellation-modal-copy textarea { width: 100%; min-height: 110px; padding: 11px; border: 1px solid var(--border-default, #eae7e0); border-radius: var(--radius-control, 12px); background: var(--surface-primary, #fff); color: var(--text-primary, #252525); font: inherit; resize: vertical; }
.cancellation-modal-copy textarea:focus-visible { outline: 3px solid var(--poliland-green, #355a2c); outline-offset: 2px; }
.cancellation-modal-copy small { color: var(--text-secondary, #63636a); text-align: right; }
.schedule-picker { display:grid; gap:8px; }
.schedule-picker-header { display:flex; justify-content:space-between; align-items:center; gap:10px; }
.schedule-row {
  display:flex; align-items:center; justify-content:space-between; gap:12px; padding:12px;
  border:1px solid var(--border-default,#eae7e0); border-radius:12px; background:var(--surface-primary,#fff);
}
.schedule-row.selected { border-color:var(--poliland-green,#55784b); background:var(--status-success-bg,#f1f6ee); }
.schedule-row.locked { opacity:.55; }
.schedule-row-main { display:flex; align-items:center; gap:10px; min-width:0; }
.schedule-row input { width:18px; height:18px; accent-color:var(--poliland-green,#355a2c); }
.schedule-row-copy { display:grid; gap:3px; min-width:0; }
.schedule-row-copy strong { color:var(--text-primary,#252525); font-size:13px; }
.schedule-row-copy small { color:var(--text-secondary,#717178); font-size:11px; }
.schedule-row-amount { text-align:right; white-space:nowrap; }
.schedule-row-amount strong { color:var(--text-primary,#252525); font-size:13px; }
.schedule-row-amount small { display:block; color:var(--text-secondary,#717178); font-size:10px; }
.payment-total {
  display:flex; align-items:center; justify-content:space-between; gap:12px; padding:14px;
  border-radius:12px; background:var(--surface-muted,#f5f3ee);
}
.payment-total span { color:var(--text-secondary,#717178); font-size:12px; }
.payment-total strong { color:var(--text-primary,#252525); font-size:18px; }
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
.payment-result { padding:12px 14px; border-radius:12px; color:#315d39; background:#edf7ef; font-size:12px; line-height:1.5; }
@media(max-width:560px) {
  .payment-action-card { padding:16px; }
  .payment-info-grid { grid-template-columns:1fr 1fr; }
}
</style>
+
