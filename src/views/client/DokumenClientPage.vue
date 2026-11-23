<script setup lang="ts">
import { modalEnterAnimation, modalLeaveAnimation, sheetModalEnterAnimation, sheetModalLeaveAnimation } from '@/utils/modalAnimation'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import {
  IonContent, IonIcon, IonModal, IonPage, IonSpinner,
  onIonViewWillEnter, useIonRouter,
} from '@ionic/vue'
import { useRoute, useRouter } from 'vue-router'
import {
  addOutline, alertCircleOutline, chevronBackOutline, chevronForwardOutline,
  closeOutline, copyOutline, documentTextOutline, eyeOutline, mapOutline, peopleOutline,
  searchOutline,
} from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { authService } from '@/services/auth/authService'
import { supabase } from '@/services/config/supabase'
import { lotService, type LotRecord } from '@/services/lotService'
import { bankAccountService, type BankAccountRecord } from '@/services/Finance/bankAccountService'
import { paymentInstructionService, type PaymentInstructionRecord } from '@/services/Finance/paymentInstructionService'
import { DEFAULT_SPK_BOOKING_FEE, paymentService } from '@/services/Finance/paymentService'
import {
  createClientSpk,
  getClientSpkDocumentUrl,
  getClientSpkErrorMessage,
  getClientSpks,
  getAvailableClientSpkBookingFees,
  type AvailableBookingFeeReuse,
  type ClientSpkDocumentKey,
  type ClientSpkNotaryStatus,
  type ClientSpkRecord,
} from '@/services/clientSpkService'

const ionRouter = useIonRouter()
const route = useRoute()
const router = useRouter()

const spkRecords = ref<ClientSpkRecord[]>([])
const loading = ref(true)
const storageError = ref('')
const selectedRecord = ref<ClientSpkRecord | null>(null)
const detailOpen = ref(false)
const rejectionReasonTarget = ref<ClientSpkRecord | null>(null)
const showRejectionReason = ref(false)
const searchQuery = ref('')
type SpkListFilter = 'All' | ClientSpkRecord['status'] | 'In Progress' | 'Completed'
const selectedStatus = ref<SpkListFilter>('All')
const currentPage = ref(1)
const createOpen = ref(false)
const creating = ref(false)
const createError = ref('')
const availableLots = ref<LotRecord[]>([])
const lotLoading = ref(false)
const lotSearchQuery = ref('')
const selectedLotId = ref<number | null>(null)
const paymentScheme = ref<'Cash' | 'Installment'>('Cash')
const paymentMethod = ref<'Transfer Bank'>('Transfer Bank')
const paymentPlans = ref<Awaited<ReturnType<typeof lotService.getLotInstallments>>>([])
const paymentPlansLoading = ref(false)
const selectedPlanId = ref<number | null>(null)
const downPaymentInput = ref('')
const useDownPayment = ref(true)
const createBuyer = reactive({
  fullName: '',
  phone: '',
  whatsappPhone: '',
  email: '',
  address: '',
})
const availableBookingFees = ref<AvailableBookingFeeReuse[]>([])
const selectedReusePaymentId = ref<number | null>(null)
const reuseFeesLoading = ref(false)
const reuseFeesError = ref('')
const createDocuments = reactive<Record<'ktp' | 'kk' | 'npwp' | 'paymentProof', File | null>>({
  ktp: null,
  kk: null,
  npwp: null,
  paymentProof: null,
})
const activeBankAccounts = ref<BankAccountRecord[]>([])
const paymentInstruction = ref<PaymentInstructionRecord | null>(null)
const paymentInfoLoading = ref(false)
const copiedAccountId = ref<string | null>(null)
const documentPreviewOpen = ref(false)
const previewDocument = ref<{ file_name: string; file_path: string; mime_type: string | null } | null>(null)
const previewUrl = ref('')
const previewLoading = ref(false)
const previewError = ref('')
const reuploadProof = ref<File | null>(null)
const reuploadSubmitting = ref(false)
const reuploadError = ref('')
const refundProofSubmitting = ref(false)
const refundProofError = ref('')

const documentFields: Array<{ key: ClientSpkDocumentKey; label: string }> = [
  { key: 'ktp', label: 'KTP' },
  { key: 'kk', label: 'Kartu Keluarga (KK)' },
  { key: 'npwp', label: 'NPWP' },
  { key: 'paymentProof', label: 'Bukti Pembayaran' },
]

const statusFilters: Array<{ label: string; value: SpkListFilter }> = [
  { label: 'Semua', value: 'All' },
  { label: 'Menunggu', value: 'Submitted' },
  { label: 'Diproses', value: 'In Progress' },
  { label: 'Disetujui', value: 'Approved' },
  { label: 'Ditolak', value: 'Rejected' },
  { label: 'Selesai', value: 'Completed' },
]

const stats = computed(() => ({
  total: spkRecords.value.length,
  submitted: spkRecords.value.filter(row => row.status === 'Submitted' || row.status === 'Under Review').length,
  approved: spkRecords.value.filter(row => row.status === 'Approved').length,
  rejected: spkRecords.value.filter(row => row.status === 'Rejected').length,
}))

const statCards = computed(() => [
  { key: 'total' as const, label: 'Semua SPK', filter: 'All' as const },
  { key: 'submitted' as const, label: 'Dalam Proses', filter: 'Submitted' as const },
  { key: 'approved' as const, label: 'Disetujui', filter: 'Approved' as const },
  { key: 'rejected' as const, label: 'Ditolak', filter: 'Rejected' as const },
])

const filteredRecords = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('id-ID')
  return spkRecords.value.filter(record => {
    const matchesStatus = selectedStatus.value === 'All'
      || (selectedStatus.value === 'Submitted' && (record.status === 'Submitted' || record.status === 'Under Review'))
      || (selectedStatus.value === 'In Progress'
        && record.status !== 'Rejected'
        && record.notaryStatus !== 'Menunggu Diproses'
        && record.notaryStatus !== 'Selesai')
      || (selectedStatus.value === 'Completed'
        && record.status !== 'Rejected'
        && record.notaryStatus === 'Selesai')
      || (selectedStatus.value !== 'Submitted'
        && selectedStatus.value !== 'In Progress'
        && selectedStatus.value !== 'Completed'
        && record.status === selectedStatus.value)
    const haystack = [
      record.spkNumber, record.buyer.fullName, record.buyer.phone,
      record.lot.name, record.lot.id,
    ].join(' ').toLocaleLowerCase('id-ID')
    return matchesStatus && (!query || haystack.includes(query))
  })
})

const PAGE_SIZE = 8
const totalPages = computed(() => Math.max(1, Math.ceil(filteredRecords.value.length / PAGE_SIZE)))
const pagedRecords = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredRecords.value.slice(start, start + PAGE_SIZE)
})
const visiblePages = computed<(number | null)[]>(() => {
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1)
  const pages: (number | null)[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) pages.push(null)
  for (let page = start; page <= end; page += 1) pages.push(page)
  if (end < total - 1) pages.push(null)
  pages.push(total)
  return pages
})

watch([searchQuery, selectedStatus], () => { currentPage.value = 1 })
watch(totalPages, value => { if (currentPage.value > value) currentPage.value = value })

async function loadSpkRecords() {
  loading.value = true
  storageError.value = ''
  try {
    spkRecords.value = await getClientSpks()
  } catch (error) {
    console.error('[SPK Klien] Gagal memuat pengajuan:', error)
    storageError.value = getClientSpkErrorMessage(error, 'Data SPK gagal dimuat.')
  } finally {
    loading.value = false
  }
  await nextTick()
  openRejectedSpkFromNotification()
}

function formatCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value) || value <= 0) return 'Belum tersedia'
  return new Intl.NumberFormat('id-ID', {
    style: 'currency', currency: 'IDR', maximumFractionDigits: 0,
  }).format(value)
}

function formatArea(value: number | string | null) {
  if (value === null || value === '') return 'Belum tersedia'
  const area = Number(value)
  return Number.isFinite(area) && area > 0 ? `${area.toLocaleString('id-ID')} m²` : 'Belum tersedia'
}

function selectedCreateLotPriceForLot(lot: LotRecord) {
  const promoPrice = Number(lot.promo_price || 0)
  const cashPrice = Number(lot.cash_price || 0)
  const price = promoPrice > 0 && (cashPrice <= 0 || promoPrice < cashPrice) ? promoPrice : cashPrice
  return Number.isSafeInteger(price) && price > 0 ? price : null
}

function getCreateLotBlockName(lot: LotRecord) {
  const block = lot.block as { code?: string; name?: string } | null
  return block?.name || block?.code || 'Tanpa blok'
}

const filteredCreateLots = computed(() => {
  const query = lotSearchQuery.value.trim().toLocaleLowerCase('id-ID')
  return availableLots.value.filter(lot => {
    const block = lot.block as { code?: string; name?: string } | null
    return !query || `${lot.lot_number} ${block?.code || ''} ${block?.name || ''}`
      .toLocaleLowerCase('id-ID')
      .includes(query)
  })
})
const selectedCreateLot = computed(() =>
  availableLots.value.find(lot => lot.id === selectedLotId.value) || null,
)
const selectedCreateLotPrice = computed(() =>
  selectedCreateLot.value ? selectedCreateLotPriceForLot(selectedCreateLot.value) : null,
)
const selectedPlan = computed(() =>
  paymentPlans.value.find(plan => plan.plan_id === selectedPlanId.value) || null,
)
const downPaymentAmount = computed(() =>
  Number(downPaymentInput.value.replace(/\D/g, '')) || 0,
)
const installmentEstimate = computed(() => {
  const price = selectedCreateLotPrice.value
  const plan = selectedPlan.value
  if (!price || !plan) return null
  const dp = useDownPayment.value ? downPaymentAmount.value : 0
  if (dp < 0 || dp >= price) return null
  const principal = price - dp
  const margin = Math.max(0, Number(plan.margin_percent) || 0)
  const total = Math.round(principal * (1 + margin / 100))
  return { monthly: Math.floor(total / plan.months), total }
})
const canSubmitCreate = computed(() => Boolean(
  !reuseFeesLoading.value &&
  !reuseFeesError.value &&
  selectedCreateLot.value &&
  selectedCreateLotPrice.value &&
  createBuyer.fullName.trim() &&
  createBuyer.phone.trim() &&
  createBuyer.address.trim() &&
  createDocuments.ktp &&
  createDocuments.kk &&
  (selectedReusePaymentId.value !== null || createDocuments.paymentProof) &&
  (paymentScheme.value === 'Cash' || (
    selectedPlanId.value &&
    (!useDownPayment.value || (
      downPaymentAmount.value > 0 &&
      downPaymentAmount.value < (selectedCreateLotPrice.value || 0)
    )) &&
    installmentEstimate.value
  ))
))

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Tanggal tidak tersedia'
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(date)
}

function formatDueDate(value: string) {
  // due_date bertipe DATE (YYYY-MM-DD); gunakan UTC agar tidak bergeser hari.
  const date = new Date(`${value.slice(0, 10)}T00:00:00Z`)
  if (Number.isNaN(date.getTime())) return 'Tanggal tidak tersedia'
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function statusLabel(status: ClientSpkRecord['status']) {
  const labels: Record<ClientSpkRecord['status'], string> = {
    Submitted: 'Menunggu Verifikasi',
    'Under Review': 'Sedang Ditinjau',
    Approved: 'Disetujui',
    Rejected: 'Ditolak',
    Cancelled: 'Dibatalkan',
  }
  return labels[status]
}

function rejectionCategoryLabel(category: NonNullable<ClientSpkRecord['rejectionCategory']>) {
  const labels = {
    'Administrative Error': 'Kesalahan administratif / salah kavling',
    'Buyer Cancellation': 'Pembatalan oleh pembeli',
    Other: 'Alasan lainnya',
  }
  return labels[category]
}

function statusClass(status: ClientSpkRecord['status']) {
  return `status-${status.toLowerCase().replaceAll(' ', '-')}`
}

function notaryStatusClass(status: ClientSpkNotaryStatus) {
  return `notary-status-${status.toLowerCase().replaceAll(' ', '-')}`
}

async function loadBookingFeesWithTimeout() {
  let timeoutId: number | undefined
  try {
    return await Promise.race([
      getAvailableClientSpkBookingFees(),
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(
          () => reject(new Error('Pemeriksaan Booking Fee melewati batas waktu. Periksa koneksi lalu coba lagi.')),
          15000,
        )
      }),
    ])
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId)
  }
}

async function openCreateForm(preferredLotId: number | null = null) {
  createOpen.value = true
  createError.value = ''
  selectedReusePaymentId.value = null
  availableBookingFees.value = []
  reuseFeesLoading.value = true
  reuseFeesError.value = ''
  paymentInfoLoading.value = true
  lotLoading.value = true
  lotSearchQuery.value = ''
  selectedLotId.value = null
  paymentScheme.value = 'Cash'
  paymentMethod.value = 'Transfer Bank'
  selectedPlanId.value = null
  downPaymentInput.value = ''
  useDownPayment.value = true
  paymentPlans.value = []
  Object.assign(createBuyer, { fullName: '', phone: '', whatsappPhone: '', email: '', address: '' })
  Object.keys(createDocuments).forEach(key => {
    createDocuments[key as keyof typeof createDocuments] = null
  })

  // Pemeriksaan Booking Fee berdiri sendiri agar kegagalannya tidak menghentikan
  // pemuatan profil, kavling, dan instruksi pembayaran.
  try {
    availableBookingFees.value = await loadBookingFeesWithTimeout()
  } catch (error) {
    console.error('[SPK Klien] Gagal memeriksa Booking Fee yang tersedia:', error)
    availableBookingFees.value = []
    reuseFeesError.value = getClientSpkErrorMessage(
      error,
      'Booking Fee sebelumnya belum dapat diperiksa.',
    )
  } finally {
    reuseFeesLoading.value = false
  }

  try {
    const user = await authService.getCurrentUser()
    if (user) {
      const metadata = user.user_metadata ?? {}
      const firstText = (...values: unknown[]) =>
        values.find((value): value is string =>
          typeof value === 'string' && value.trim().length > 0,
        )?.trim() || ''
      createBuyer.fullName = firstText(metadata.full_name, metadata.name)
      createBuyer.phone = firstText(metadata.phone, metadata.whatsapp_phone, metadata.phone_number, user.phone)
      createBuyer.whatsappPhone = firstText(metadata.whatsapp_phone, metadata.whatsapp)
      createBuyer.email = firstText(user.email)
      createBuyer.address = firstText(metadata.address)

      const { data: customer, error: customerError } = await supabase
        .from('customers')
        .select('full_name, phone, whatsapp_phone, email, address')
        .eq('user_id', user.id)
        .maybeSingle()
      if (customerError) throw customerError
      if (customer) {
        createBuyer.fullName = customer.full_name || createBuyer.fullName
        createBuyer.phone = customer.phone || customer.whatsapp_phone || createBuyer.phone
        createBuyer.whatsappPhone = customer.whatsapp_phone || customer.phone || ''
        createBuyer.email = customer.email || user.email || ''
        createBuyer.address = customer.address || ''
      }
    }
  } catch (error) {
    console.warn('[SPK Klien] Data profil pembeli gagal dimuat:', error)
  }

  try {
    const lots = await lotService.getLots()
    availableLots.value = lots.filter(lot => {
      const status = (lot.status || '').toLocaleLowerCase('id-ID')
      return status === 'available' || status === 'tersedia'
    })
    const preferredLot = preferredLotId === null
      ? null
      : availableLots.value.find(lot => lot.id === preferredLotId)
    if (preferredLot) await selectCreateLot(preferredLot)
  } catch (error) {
    availableLots.value = []
    createError.value = getClientSpkErrorMessage(error, 'Daftar kaveling gagal dimuat.')
  } finally {
    lotLoading.value = false
  }

  const [banksResult, instructionResult] = await Promise.allSettled([
    bankAccountService.getActiveBankAccounts(),
    paymentInstructionService.getActiveInstruction(),
  ])
  activeBankAccounts.value = banksResult.status === 'fulfilled' ? banksResult.value : []
  paymentInstruction.value = instructionResult.status === 'fulfilled' ? instructionResult.value : null
  paymentInfoLoading.value = false
}

function closeCreateForm() {
  if (creating.value) return
  createOpen.value = false
  createError.value = ''
}

async function selectCreateLot(lot: LotRecord) {
  selectedLotId.value = lot.id
  selectedPlanId.value = null
  downPaymentInput.value = ''
  useDownPayment.value = true
  paymentPlans.value = []
  if (paymentScheme.value === 'Installment') await loadCreatePaymentPlans(lot.id)
}

async function loadCreatePaymentPlans(lotId: number) {
  paymentPlansLoading.value = true
  try {
    paymentPlans.value = await lotService.getLotInstallments(lotId)
  } catch (error) {
    paymentPlans.value = []
    createError.value = getClientSpkErrorMessage(error, 'Skema cicilan gagal dimuat.')
  } finally {
    paymentPlansLoading.value = false
  }
}

async function changePaymentScheme(scheme: 'Cash' | 'Installment') {
  paymentScheme.value = scheme
  selectedPlanId.value = null
  downPaymentInput.value = ''
  useDownPayment.value = true
  if (scheme === 'Installment' && selectedLotId.value) {
    await loadCreatePaymentPlans(selectedLotId.value)
  }
}

function setDownPaymentPercent(percent: number) {
  if (!selectedCreateLotPrice.value) return
  useDownPayment.value = true
  downPaymentInput.value = String(Math.round(selectedCreateLotPrice.value * percent / 100))
}

function formatBankAccountNumber(value: string) {
  return value.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()
}

async function copyBankAccount(account: BankAccountRecord) {
  try {
    await navigator.clipboard.writeText(account.account_number.replace(/\s+/g, ''))
    copiedAccountId.value = account.id
    window.setTimeout(() => {
      if (copiedAccountId.value === account.id) copiedAccountId.value = null
    }, 1800)
  } catch {
    createError.value = 'Nomor rekening belum dapat disalin. Salin nomor rekening yang tertera secara manual.'
  }
}

function instructionSteps(record: PaymentInstructionRecord | null) {
  if (!record) return []
  return record.steps
    .map(step => typeof step === 'string' ? step : String((step as { text?: unknown }).text || '').trim())
    .filter(Boolean)
}

async function openDocumentPreview(
  document: ClientSpkRecord['documents'][ClientSpkDocumentKey] | undefined,
) {
  if (!document) return
  previewDocument.value = document
  documentPreviewOpen.value = true
  previewLoading.value = true
  previewError.value = ''
  previewUrl.value = ''
  try {
    previewUrl.value = await getClientSpkDocumentUrl(document.file_path)
  } catch (error) {
    previewError.value = getClientSpkErrorMessage(error, 'Dokumen gagal dibuka.')
  } finally {
    previewLoading.value = false
  }
}

function closeDocumentPreview() {
  documentPreviewOpen.value = false
  previewDocument.value = null
  previewUrl.value = ''
  previewError.value = ''
}

async function openRefundProof() {
  const proofPath = selectedRecord.value?.bookingFeeRefund?.proofPath
  if (!proofPath) return

  previewDocument.value = {
    file_name: proofPath.split('/').pop() || 'Bukti pengembalian',
    file_path: proofPath,
    mime_type: null,
  }
  documentPreviewOpen.value = true
  previewLoading.value = true
  previewError.value = ''
  previewUrl.value = ''

  try {
    const { data, error } = await supabase.storage
      .from('payment-proofs')
      .createSignedUrl(proofPath, 300)
    if (error) throw error
    if (!data?.signedUrl) throw new Error('Tautan bukti pengembalian tidak tersedia.')
    previewUrl.value = data.signedUrl
  } catch (error) {
    previewError.value = getClientSpkErrorMessage(
      error,
      'Bukti pengembalian gagal dibuka.',
    )
  } finally {
    previewLoading.value = false
  }
}

function handleCreateFile(type: 'ktp' | 'kk' | 'npwp' | 'paymentProof', event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  if (file && file.size > 5 * 1024 * 1024) {
    createError.value = `Ukuran ${file.name} melebihi batas 5 MB.`
    input.value = ''
    createDocuments[type] = null
    return
  }
  createDocuments[type] = file
  createError.value = ''
}

async function submitCreateSPK() {
  if (!canSubmitCreate.value || !selectedCreateLot.value || !selectedCreateLotPrice.value) {
    createError.value = 'Lengkapi data pembeli, pilih kaveling, isi rencana pembayaran, serta unggah KTP, KK, dan bukti transfer Booking Fee.'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    await createClientSpk({
      lot: { id: selectedCreateLot.value.id, price: selectedCreateLotPrice.value },
      buyer: {
        fullName: createBuyer.fullName.trim(),
        phone: createBuyer.phone.trim(),
        whatsappPhone: createBuyer.whatsappPhone.trim(),
        email: createBuyer.email.trim(),
        address: createBuyer.address.trim(),
      },
      payment: {
        scheme: paymentScheme.value,
        method: paymentMethod.value,
        planId: paymentScheme.value === 'Installment' ? (selectedPlan.value?.plan_id || null) : null,
        tenorMonths: paymentScheme.value === 'Installment' ? (selectedPlan.value?.months || null) : null,
        monthlyPayment: paymentScheme.value === 'Installment' ? (installmentEstimate.value?.monthly || null) : null,
        downPaymentAmount: paymentScheme.value === 'Installment' && useDownPayment.value ? downPaymentAmount.value : 0,
      },
      documents: createDocuments,
      reuseBookingPaymentId: selectedReusePaymentId.value,
    })
    createOpen.value = false
    await loadSpkRecords()
  } catch (error) {
    createError.value = getClientSpkErrorMessage(error, 'SPK gagal disimpan. Silakan coba kembali.')
  } finally {
    creating.value = false
  }
}

function documentCount(record: ClientSpkRecord) {
  return documentFields.filter(item => Boolean(record.documents[item.key])).length
}

function openDetail(record: ClientSpkRecord) {
  selectedRecord.value = record
  reuploadProof.value = null
  reuploadError.value = ''
  detailOpen.value = true
}

function closeDetail() {
  detailOpen.value = false
  selectedRecord.value = null
  reuploadProof.value = null
  reuploadError.value = ''
}

function onReuploadProofChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  reuploadError.value = ''

  if (!file) {
    reuploadProof.value = null
    return
  }
  if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
    reuploadProof.value = null
    input.value = ''
    reuploadError.value = 'Format bukti harus JPG, PNG, WEBP, atau PDF.'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    reuploadProof.value = null
    input.value = ''
    reuploadError.value = 'Ukuran bukti maksimal 5 MB.'
    return
  }
  reuploadProof.value = file
}

async function submitBookingFeeReupload() {
  if (!selectedRecord.value || reuploadSubmitting.value) return

  const paymentId = selectedRecord.value.payment.bookingPaymentId
  if (!paymentId || selectedRecord.value.payment.bookingPaymentStatus !== 'Needs Reupload') {
    reuploadError.value = 'Pengajuan pembayaran ini tidak sedang meminta upload ulang.'
    return
  }
  if (!reuploadProof.value) {
    reuploadError.value = 'Pilih bukti pembayaran pengganti terlebih dahulu.'
    return
  }

  reuploadSubmitting.value = true
  reuploadError.value = ''

  try {
    await paymentService.replacePaymentProof(paymentId, reuploadProof.value)
    reuploadProof.value = null
    await loadSpkRecords()
    selectedRecord.value = spkRecords.value.find(
      (record) => record.id === selectedRecord.value?.id,
    ) ?? null
  } catch (error) {
    reuploadError.value = getClientSpkErrorMessage(
      error,
      'Bukti pengganti gagal dikirim.',
    )
  } finally {
    reuploadSubmitting.value = false
  }
}

function openRejectionReason(record: ClientSpkRecord) {
  rejectionReasonTarget.value = record
  showRejectionReason.value = true
}

function closeRejectionReason() {
  showRejectionReason.value = false
  rejectionReasonTarget.value = null
}

function openRejectedSpkFromNotification() {
  const queryValue = route.query.spk_id
  const requestedId = Number(Array.isArray(queryValue) ? queryValue[0] : queryValue)
  if (!Number.isInteger(requestedId) || requestedId <= 0) return

  const record = spkRecords.value.find(item => item.id === requestedId)
  if (record?.status === 'Rejected' && record.rejectionReason) {
    openRejectionReason(record)
  }
  void router.replace({ path: route.path, query: { ...route.query, spk_id: undefined } })
}

async function goToPage(page: number) {
  currentPage.value = Math.min(Math.max(page, 1), totalPages.value)
  await nextTick()
  document.querySelector('#client-spk-list-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function handleRouteIntent() {
  await loadSpkRecords()
  const createRequested = String(route.query.create || '') === '1'
  if (!createRequested) return

  const rawLotId = Array.isArray(route.query.lot_id) ? route.query.lot_id[0] : route.query.lot_id
  const lotId = Number(rawLotId)
  await openCreateForm(Number.isInteger(lotId) && lotId > 0 ? lotId : null)
  await router.replace({
    path: route.path,
    query: { ...route.query, create: undefined, lot_id: undefined },
  })
}

onIonViewWillEnter(handleRouteIntent)
</script>
<template>
  <ion-page class="client-spk-page">
    <AppHeader variant="client" title="PoliLand Kairagi" :show-back="false" />
    <ion-content :fullscreen="true">
      <main class="spk-shell">
        <section class="spk-stats" aria-label="Ringkasan pengajuan SPK">
          <button v-for="item in statCards" :key="item.key" type="button"
            :class="['spk-stat', { 'spk-stat-active': selectedStatus === item.filter }]"
            @click="selectedStatus = item.filter">
            <span>{{ item.label }}</span>
            <strong>{{ stats[item.key] }}</strong>
          </button>
        </section>

        <section class="spk-toolbar">
          <label class="spk-search">
            <ion-icon :icon="searchOutline" />
            <input v-model="searchQuery" type="search" placeholder="Cari nomor SPK, nama, atau kaveling..." />
            <button v-if="searchQuery" type="button" aria-label="Hapus pencarian" @click="searchQuery = ''">
              <ion-icon :icon="closeOutline" />
            </button>
          </label>
          <div class="spk-filters" aria-label="Filter status SPK">
            <button v-for="filter in statusFilters" :key="filter.value" type="button"
              :class="{ active: selectedStatus === filter.value }"
              @click="selectedStatus = filter.value">
              {{ filter.label }}
            </button>
          </div>
        </section>

        <div v-if="loading" class="spk-state">
          <ion-spinner name="crescent" />
          <p>Memuat pengajuan SPK...</p>
        </div>
        <div v-else-if="storageError" class="spk-state spk-error" role="alert">
          <ion-icon :icon="alertCircleOutline" />
          <strong>Data SPK gagal dimuat</strong>
          <p>{{ storageError }}</p>
          <button type="button" class="spk-retry-btn" @click="loadSpkRecords">Coba lagi</button>
        </div>
        <template v-else>
          <div id="client-spk-list-top" class="spk-list-head">
            <h2>Daftar Pengajuan</h2>
            <span>{{ filteredRecords.length }} pengajuan</span>
          </div>

          <section v-if="filteredRecords.length" class="spk-list">
            <article v-for="record in pagedRecords" :key="record.id" :id="`spk-entry-${record.id}`" class="spk-card">
              <div class="spk-card-top">
                <div>
                  <span class="spk-number">{{ record.spkNumber }}</span>
                  <time>{{ formatDate(record.createdAt) }}</time>
                </div>
                <span :class="['spk-status', statusClass(record.status)]">{{ statusLabel(record.status) }}</span>
              </div>
              <div v-if="record.status !== 'Rejected'" class="spk-notary-progress">
                <span>Kemajuan SPK</span>
                <strong :class="['spk-notary-status', notaryStatusClass(record.notaryStatus)]">
                  {{ record.notaryStatus }}
                </strong>
                <p v-if="record.notaryNote" class="spk-notary-note">{{ record.notaryNote }}</p>
              </div>

              <div
                v-if="record.payment.bookingPaymentStatus === 'Needs Reupload'"
                class="spk-reupload-alert"
                role="alert"
              >
                <strong>Bukti pembayaran SPK perlu diunggah ulang</strong>
                <p>{{ record.payment.bookingPaymentReviewNote || 'Admin meminta bukti pembayaran yang lebih jelas.' }}</p>
                <button type="button" @click.stop="openDetail(record)">Unggah bukti sekarang</button>
              </div>

              <div class="spk-person">
                <div class="spk-avatar"><ion-icon :icon="peopleOutline" /></div>
                <div class="spk-person-info">
                  <strong>{{ record.buyer.fullName }}</strong>
                  <span>{{ record.buyer.phone }}</span>
                  <small>Data pembeli</small>
                </div>
              </div>

              <div class="spk-card-meta">
                <div>
                  <span>Kaveling</span>
                  <strong>{{ record.lot.name }}</strong>
                  <small>{{ formatArea(record.lot.area) }}</small>
                </div>
                <div>
                  <span>Skema pembayaran</span>
                  <strong>{{ record.payment.scheme === 'Cash' ? 'Tunai' : 'Cicilan' }}</strong>
                  <small>{{ record.payment.tenorMonths ? `${record.payment.tenorMonths} bulan` : 'Sekali bayar' }}</small>
                </div>
                <div>
                  <span>Harga pengajuan</span>
                  <strong>{{ formatCurrency(record.lot.price) }}</strong>
                  <small>{{ documentCount(record) }} dari 4 dokumen</small>
                </div>
              </div>

              <div v-if="record.status === 'Rejected'" class="spk-rejection-preview">
                <template v-if="record.bookingFeeRefund">
                  <p v-if="record.bookingFeeRefund.status === 'Pending Refund'" class="spk-refund-status">
                    Booking Fee Rp{{ record.bookingFeeRefund.amount.toLocaleString('id-ID') }} akan dikembalikan kepada Anda. Pengembalian sedang diproses.
                  </p>
                  <p v-else class="spk-refund-status spk-refund-status--done">
                    Booking Fee Rp{{ record.bookingFeeRefund.amount.toLocaleString('id-ID') }} telah dicatat sebagai sudah dikembalikan.
                  </p>
                </template>
                <p v-if="record.rejectionCategory === 'Administrative Error' && record.bookingFeeReuse" class="spk-reuse-success">
                  Booking Fee {{ formatCurrency(record.bookingFeeReuse.amount) }} tersedia untuk SPK pengganti.
                </p>
                <p v-else-if="record.rejectionCategory === 'Administrative Error'" class="spk-reuse-muted">
                  Booking Fee belum tersedia untuk digunakan ulang. Pastikan Finance sudah mengonfirmasi pembayaran.
                </p>
              </div>

              <div class="spk-card-actions">
                <button type="button" class="spk-detail-btn" @click="openDetail(record)">
                  Lihat detail <ion-icon :icon="chevronForwardOutline" />
                </button>
                <button v-if="record.status === 'Rejected' && record.rejectionReason" type="button"
                  class="spk-reason-btn" @click="openRejectionReason(record)">
                  Alasan penolakan
                </button>
              </div>
            </article>
          </section>

          <nav v-if="filteredRecords.length && totalPages > 1" class="spk-pager" aria-label="Halaman daftar SPK">
            <div class="spk-pager-controls">
              <button type="button" class="spk-pager-btn" aria-label="Halaman sebelumnya"
                :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">
                <ion-icon :icon="chevronBackOutline" />
              </button>
              <button v-for="page in visiblePages" :key="page ?? `ellipsis-${currentPage}`"
                type="button" class="spk-pager-number" :class="{ active: page === currentPage }"
                :disabled="page === null" @click="page !== null && goToPage(page)">
                {{ page ?? '…' }}
              </button>
              <button type="button" class="spk-pager-btn" aria-label="Halaman berikutnya"
                :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">
                <ion-icon :icon="chevronForwardOutline" />
              </button>
            </div>
            <span class="spk-pager-position">Halaman {{ currentPage }} dari {{ totalPages }}</span>
          </nav>

          <div v-if="!filteredRecords.length" class="spk-state spk-empty-state">
            <ion-icon :icon="documentTextOutline" />
            <strong>{{ spkRecords.length ? 'Tidak ada pengajuan SPK' : 'Belum ada pengajuan SPK' }}</strong>
            <p>{{ spkRecords.length ? 'Tidak ada data yang sesuai dengan pencarian atau filter.' : 'Pilih kavling yang tersedia untuk mulai membuat pengajuan SPK.' }}</p>
          </div>
        </template>
      </main>
      <button class="spk-create-btn spk-create-fab" type="button" aria-label="Buat SPK" title="Buat SPK" @click="() => openCreateForm()">
        <ion-icon :icon="addOutline" />
      </button>
    </ion-content>
    <MobileTabBar variant="client" />

    <AppModal
      v-model="createOpen"
      title="Buat SPK"
      variant="bottom-sheet"
      :loading="creating"
      :confirm-disabled="!canSubmitCreate"
      confirm-text="Simpan Pengajuan"
      cancel-text="Batal"
      max-height="92dvh"
      @confirm="submitCreateSPK"
      @cancel="closeCreateForm"
    >
      <form class="spk-create-form" @submit.prevent="submitCreateSPK">
        <section class="spk-form-section">
          <h3>1. Informasi Pembeli</h3>
          <label>Nama lengkap <b>*</b><input v-model.trim="createBuyer.fullName" required placeholder="Nama sesuai KTP" /></label>
          <label>Nomor kontak <b>*</b><input v-model.trim="createBuyer.phone" inputmode="tel" required placeholder="Nomor telepon" /></label>
          <label>Nomor WhatsApp<input v-model.trim="createBuyer.whatsappPhone" inputmode="tel" placeholder="Nomor WhatsApp" /></label>
          <label>Email<input v-model.trim="createBuyer.email" type="email" placeholder="email@contoh.com" /></label>
          <label>Alamat <b>*</b><textarea v-model.trim="createBuyer.address" rows="2" required placeholder="Alamat lengkap" /></label>
        </section>

        <section class="spk-form-section">
          <h3>2. Pilih Kaveling</h3>
          <label class="spk-lot-search">Cari kaveling
            <input v-model.trim="lotSearchQuery" type="search" placeholder="Cari nomor kaveling atau blok" />
          </label>
          <p v-if="lotLoading" class="spk-lot-empty">Memuat kaveling tersedia...</p>
          <div v-else class="spk-lot-list" role="group" aria-label="Pilih kaveling">
            <button v-for="lot in filteredCreateLots" :key="lot.id" type="button"
              class="spk-lot-option" :class="{ selected: selectedLotId === lot.id }"
              :aria-pressed="selectedLotId === lot.id" @click="selectCreateLot(lot)">
              <span class="spk-lot-check" aria-hidden="true">{{ selectedLotId === lot.id ? '✓' : '' }}</span>
              <span>
                <strong>{{ lot.lot_number }}</strong>
                <small>{{ getCreateLotBlockName(lot) }}</small>
              </span>
              <b>{{ formatCurrency(selectedCreateLotPriceForLot(lot)) }}</b>
            </button>
            <p v-if="!filteredCreateLots.length" class="spk-lot-empty">Kaveling tersedia tidak ditemukan.</p>
          </div>
        </section>

        <section class="spk-form-section">
          <h3>3. Pembayaran</h3>
          <div class="spk-payment-options">
            <label :class="{ chosen: paymentScheme === 'Cash' }"><input v-model="paymentScheme" type="radio" value="Cash" @change="changePaymentScheme('Cash')" /> Tunai</label>
            <label :class="{ chosen: paymentScheme === 'Installment' }"><input v-model="paymentScheme" type="radio" value="Installment" @change="changePaymentScheme('Installment')" /> Cicilan</label>
          </div>
          <template v-if="paymentScheme === 'Installment' && selectedCreateLot">
            <div class="spk-payment-options" aria-label="Jenis cicilan">
              <label :class="{ chosen: useDownPayment }">
                <input v-model="useDownPayment" type="radio" :value="true" @change="downPaymentInput = ''" />
                Cicilan dengan DP
              </label>
              <label :class="{ chosen: !useDownPayment }">
                <input v-model="useDownPayment" type="radio" :value="false" @change="downPaymentInput = ''" />
                Pure cicilan (tanpa DP)
              </label>
            </div>
            <template v-if="useDownPayment">
              <label>DP kaveling
                <input :value="downPaymentInput" inputmode="numeric" placeholder="Nominal DP"
                  @input="downPaymentInput = ($event.target as HTMLInputElement).value.replace(/\D/g, '')" />
              </label>
              <div class="spk-dp-shortcuts">
                <button v-for="percent in [10,20,30]" :key="percent" type="button" @click="setDownPaymentPercent(percent)">{{ percent }}%</button>
              </div>
            </template>
            <p v-else class="spk-pure-installment-note">
              Skema ini tidak menggunakan DP. Perhitungan cicilan menggunakan seluruh harga kaveling sesuai skema tenor yang dipilih. Booking Fee pengajuan SPK tetap terpisah.
            </p>
            <label>Tenor cicilan
              <select v-model="selectedPlanId" :disabled="paymentPlansLoading">
                <option :value="null">{{ paymentPlansLoading ? 'Memuat skema...' : 'Pilih tenor' }}</option>
                <option v-for="plan in paymentPlans" :key="plan.plan_id" :value="plan.plan_id">{{ plan.plan_name }} · {{ plan.months }} bulan</option>
              </select>
            </label>
            <div v-if="installmentEstimate" class="spk-payment-result">
              <div><span>Cicilan per bulan</span><strong>{{ formatCurrency(installmentEstimate.monthly) }}</strong></div>
              <div><span>Total cicilan</span><strong>{{ formatCurrency(installmentEstimate.total) }}</strong></div>
            </div>
          </template>
          <div v-else-if="selectedCreateLot && selectedCreateLotPrice" class="spk-payment-result">
            <div class="spk-total-row"><span>Harga kaveling (pelunasan setelah SPK disetujui)</span><strong>{{ formatCurrency(selectedCreateLotPrice) }}</strong></div>
          </div>

          <div class="spk-payment-result spk-booking-fee-summary">
            <div class="spk-total-row">
              <span>Booking Fee wajib saat pengajuan SPK</span>
              <strong>{{ formatCurrency(DEFAULT_SPK_BOOKING_FEE) }}</strong>
            </div>
            <small>Booking Fee terpisah dari DP. DP atau pelunasan dilakukan setelah SPK disetujui.</small>
          </div>

          <div v-if="paymentMethod === 'Transfer Bank'" class="spk-payment-guidance">
            <p v-if="paymentInfoLoading" class="spk-lot-empty">Memuat instruksi pembayaran...</p>
            <template v-else>
              <section v-if="activeBankAccounts.length" class="spk-bank-list" aria-label="Rekening tujuan transfer">
                <h4>Rekening Tujuan Transfer</h4>
                <article v-for="account in activeBankAccounts" :key="account.id" class="spk-bank-account">
                  <div class="spk-bank-main">
                    <strong>{{ account.bank_name }}</strong>
                    <span>{{ account.account_holder }}</span>
                    <b>{{ formatBankAccountNumber(account.account_number) }}</b>
                    <small v-if="account.description">{{ account.description }}</small>
                  </div>
                  <button type="button" :aria-label="`Salin nomor rekening ${account.bank_name}`" @click="copyBankAccount(account)">
                    <ion-icon :icon="copyOutline" aria-hidden="true" />
                    {{ copiedAccountId === account.id ? 'Tersalin' : 'Salin' }}
                  </button>
                </article>
              </section>
              <section v-if="paymentInstruction" class="spk-instruction-list" aria-label="Instruksi pembayaran">
                <h4>{{ paymentInstruction.title }}</h4>
                <p>{{ paymentInstruction.intro }}</p>
                <ol>
                  <li v-for="(step, index) in instructionSteps(paymentInstruction)" :key="index">{{ step }}</li>
                </ol>
                <ul v-if="paymentInstruction.important_notes.length">
                  <li v-for="note in paymentInstruction.important_notes" :key="note">{{ note }}</li>
                </ul>
              </section>
            </template>
          </div>
        </section>

        <section class="spk-form-section">
          <h3>4. Dokumen Wajib</h3>
          <label class="spk-upload-field">KTP <b>*</b><input type="file" accept="image/*,.pdf" required @change="handleCreateFile('ktp', $event)" /><small>{{ createDocuments.ktp?.name || 'Belum ada file dipilih' }}</small></label>
          <label class="spk-upload-field">Kartu Keluarga (KK) <b>*</b><input type="file" accept="image/*,.pdf" required @change="handleCreateFile('kk', $event)" /><small>{{ createDocuments.kk?.name || 'Belum ada file dipilih' }}</small></label>
          <div v-if="reuseFeesLoading" class="spk-reuse-info" role="status">Memeriksa Booking Fee yang tersedia...</div>
          <div v-else-if="reuseFeesError" class="spk-reuse-error" role="alert">
            {{ reuseFeesError }} Tutup lalu buka kembali formulir untuk mencoba lagi. Jangan kirim Booking Fee baru sebelum status pembayaran sebelumnya dipastikan.
          </div>
          <div v-else-if="availableBookingFees.length" class="spk-reuse-picker">
            <strong>Booking Fee tersedia untuk digunakan ulang</strong>
            <label>
              <span>Pilih Booking Fee</span>
              <select v-model.number="selectedReusePaymentId">
                <option :value="null">Bayar Booking Fee baru</option>
                <option v-for="fee in availableBookingFees" :key="fee.paymentId" :value="fee.paymentId">
                  {{ fee.sourceSpkNumber }} · {{ formatCurrency(fee.amount) }} · Kaveling {{ fee.sourceLotNumber }}
                </option>
              </select>
            </label>
            <p v-if="selectedReusePaymentId">Booking Fee lama akan dipindahkan ke SPK pengganti. Bukti pembayaran lama tetap tersimpan.</p>
          </div>
          <label v-if="selectedReusePaymentId === null" class="spk-upload-field">Bukti Transfer Booking Fee <b>*</b><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required @change="handleCreateFile('paymentProof', $event)" /><small>{{ createDocuments.paymentProof?.name || 'Belum ada file dipilih' }}</small></label>
          <div v-else class="spk-reuse-info">Bukti Booking Fee tidak perlu diunggah ulang karena menggunakan pembayaran terverifikasi sebelumnya.</div>
          <label class="spk-upload-field">NPWP <span>(opsional)</span><input type="file" accept="image/*,.pdf" @change="handleCreateFile('npwp', $event)" /><small>{{ createDocuments.npwp?.name || 'Belum ada file dipilih' }}</small></label>
        </section>

        <p v-if="createError" class="spk-create-error" role="alert">{{ createError }}</p>
      </form>
    </AppModal>

    <IonModal :enter-animation="sheetModalEnterAnimation" :leave-animation="sheetModalLeaveAnimation" :is-open="detailOpen" class="client-spk-detail-modal" :breakpoints="[0, 0.75, 0.96]" :initial-breakpoint="0.96" @didDismiss="closeDetail">
      <div v-if="selectedRecord" class="spk-detail">
        <header class="spk-detail-header">
          <div>
            <span>Nomor SPK</span>
            <strong>{{ selectedRecord.spkNumber }}</strong>
            <small>{{ formatDate(selectedRecord.createdAt) }}</small>
          </div>
          <span :class="['spk-status', statusClass(selectedRecord.status)]">{{ statusLabel(selectedRecord.status) }}</span>
        </header>
        <section v-if="selectedRecord.status !== 'Rejected'" class="spk-detail-section spk-progress-section">
          <h3><ion-icon :icon="documentTextOutline" /> Proses pengurusan SPK</h3>
          <div class="spk-progress-card">
            <strong :class="['spk-notary-status', notaryStatusClass(selectedRecord.notaryStatus)]">
              {{ selectedRecord.notaryStatus }}
            </strong>
            <p v-if="selectedRecord.notaryNote">{{ selectedRecord.notaryNote }}</p>
          </div>
        </section>

        <section class="spk-detail-section">
          <h3><ion-icon :icon="peopleOutline" /> Informasi Pembeli</h3>
          <dl>
            <div><dt>Nama lengkap</dt><dd>{{ selectedRecord.buyer.fullName }}</dd></div>
            <div><dt>Nomor telepon</dt><dd>{{ selectedRecord.buyer.phone }}</dd></div>
            <div><dt>Email</dt><dd>{{ selectedRecord.buyer.email || '-' }}</dd></div>
            <div><dt>Alamat</dt><dd>{{ selectedRecord.buyer.address || '-' }}</dd></div>
          </dl>
        </section>

        <section class="spk-detail-section">
          <h3><ion-icon :icon="mapOutline" /> Informasi Kaveling</h3>
          <dl>
            <div><dt>Nomor kaveling</dt><dd>{{ selectedRecord.lot.name }}</dd></div>
            <div><dt>Luas tanah</dt><dd>{{ formatArea(selectedRecord.lot.area) }}</dd></div>
            <div><dt>Dimensi</dt><dd>{{ selectedRecord.lot.dimension || '-' }}</dd></div>
            <div><dt>Harga pengajuan</dt><dd>{{ formatCurrency(selectedRecord.lot.price) }}</dd></div>
          </dl>
        </section>

        <section class="spk-detail-section">
          <h3><ion-icon :icon="documentTextOutline" /> Informasi Pembayaran</h3>
          <dl>
            <div><dt>Skema</dt><dd>{{ selectedRecord.payment.scheme === 'Cash' ? 'Tunai' : 'Cicilan' }}</dd></div>
            <div><dt>Metode pembayaran</dt><dd>{{ selectedRecord.payment.method || '-' }}</dd></div>
            <div v-if="selectedRecord.payment.bookingPaymentStatus">
              <dt>Status bukti Booking Fee</dt>
              <dd>{{ selectedRecord.payment.bookingPaymentStatus === 'Needs Reupload'
                ? 'Perlu unggah ulang'
                : selectedRecord.payment.bookingPaymentStatus === 'Confirmed'
                  ? 'Terverifikasi'
                  : selectedRecord.payment.bookingPaymentStatus === 'Rejected'
                    ? 'Ditolak'
                    : 'Menunggu verifikasi' }}</dd>
            </div>
            <div v-if="selectedRecord.payment.scheme === 'Installment'"><dt>Skema DP</dt><dd>{{ (selectedRecord.payment.downPaymentAmount ?? 0) > 0 ? formatCurrency(selectedRecord.payment.downPaymentAmount ?? 0) : 'Tanpa DP (Pure Cicilan)' }}</dd></div>
            <div v-if="selectedRecord.payment.tenorMonths"><dt>Tenor</dt><dd>{{ selectedRecord.payment.tenorMonths }} bulan</dd></div>
            <div v-if="selectedRecord.payment.monthlyPayment"><dt>Cicilan per bulan</dt><dd>{{ formatCurrency(selectedRecord.payment.monthlyPayment) }}</dd></div>
          </dl>
        </section>

        <section
          v-if="selectedRecord.status === 'Rejected' && selectedRecord.bookingFeeRefund"
          class="spk-detail-section spk-refund-detail"
        >
          <h3>Pengembalian Booking Fee</h3>
          <dl>
            <div><dt>Nominal</dt><dd>{{ formatCurrency(selectedRecord.bookingFeeRefund.amount) }}</dd></div>
            <div><dt>Status</dt><dd>{{ selectedRecord.bookingFeeRefund.status === 'Refunded' ? 'Sudah dikembalikan' : 'Pengembalian sedang diproses' }}</dd></div>
            <div v-if="selectedRecord.bookingFeeRefund.refundMethod"><dt>Metode</dt><dd>{{ selectedRecord.bookingFeeRefund.refundMethod }}</dd></div>
            <div v-if="selectedRecord.bookingFeeRefund.refundNote"><dt>Catatan</dt><dd>{{ selectedRecord.bookingFeeRefund.refundNote }}</dd></div>
          </dl>
          <button
            v-if="selectedRecord.bookingFeeRefund.status === 'Refunded' && selectedRecord.bookingFeeRefund.proofPath"
            type="button"
            class="spk-refund-proof-button"
            @click="openRefundProof"
          >
            Lihat bukti pengembalian
          </button>
        </section>

        <section
          v-if="selectedRecord.payment.bookingPaymentStatus === 'Needs Reupload'"
          class="spk-detail-section spk-reupload-section"
          role="alert"
        >
          <h3>Unggah ulang bukti Booking Fee</h3>
          <p>{{ selectedRecord.payment.bookingPaymentReviewNote || 'Admin meminta bukti pembayaran yang lebih jelas.' }}</p>
          <label class="spk-upload-field">
            Bukti pengganti
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              :disabled="reuploadSubmitting"
              @change="onReuploadProofChange"
            />
            <small>{{ reuploadProof?.name || 'JPG, PNG, WEBP, atau PDF. Maksimal 5 MB.' }}</small>
          </label>
          <button
            type="button"
            class="spk-reupload-submit"
            :disabled="reuploadSubmitting || !reuploadProof"
            @click="submitBookingFeeReupload"
          >
            <ion-spinner v-if="reuploadSubmitting" name="crescent" />
            {{ reuploadSubmitting ? 'Mengirim bukti...' : 'Kirim bukti pengganti' }}
          </button>
          <p v-if="reuploadError" class="spk-reupload-error" role="alert">{{ reuploadError }}</p>
        </section>

        <section
          v-if="selectedRecord.notaryStatus === 'Selesai' && selectedRecord.payment.scheme === 'Installment'"
          class="spk-detail-section spk-final-schedule"
        >
          <h3><ion-icon :icon="documentTextOutline" /> Jadwal Pembayaran Disepakati</h3>
          <p class="spk-schedule-description">
            Berikut jadwal pembayaran final berdasarkan kesepakatan dengan pihak notaris.
          </p>

          <div v-if="selectedRecord.schedules.length" class="spk-client-schedule-list">
            <article
              v-for="schedule in selectedRecord.schedules"
              :key="schedule.id"
              class="spk-client-schedule-item"
            >
              <div>
                <strong>Cicilan #{{ schedule.installmentNumber }}</strong>
                <small>{{ schedule.dueDate ? formatDueDate(schedule.dueDate) : 'Tanggal belum ditentukan' }}</small>
              </div>
              <div class="spk-client-schedule-meta">
                <strong>{{ formatCurrency(schedule.amount) }}</strong>
                <span :class="['spk-client-schedule-status', schedule.status === 'Paid' ? 'is-paid' : '']">
                  {{ schedule.status === 'Paid' ? 'Lunas' : schedule.status }}
                </span>
              </div>
            </article>
          </div>
          <p v-else class="spk-schedule-empty">
            Jadwal pembayaran belum tersedia. Silakan hubungi Admin.
          </p>
        </section>

        <section class="spk-detail-section">
          <h3><ion-icon :icon="documentTextOutline" /> Dokumen Persyaratan</h3>
          <div v-if="!documentCount(selectedRecord)" class="spk-no-docs">Belum ada dokumen terlampir.</div>
          <div v-for="document in documentFields" :key="document.key" class="spk-document">
            <span class="spk-doc-icon"><ion-icon :icon="documentTextOutline" /></span>
            <div class="spk-doc-info">
              <strong>{{ document.label }}</strong>
              <span>{{ selectedRecord.documents[document.key]?.file_name || 'Belum dilampirkan' }}</span>
            </div>
            <button
              v-if="selectedRecord.documents[document.key]"
              type="button"
              class="spk-doc-view"
              :disabled="previewLoading"
              @click="openDocumentPreview(selectedRecord.documents[document.key])"
            >
              <ion-icon :icon="eyeOutline" aria-hidden="true" />
              Lihat
            </button>
            <span v-else class="spk-doc-state is-missing">
              {{ selectedRecord.documents[document.key] ? 'Tersimpan' : 'Belum ada' }}
            </span>
          </div>
        </section>

        <section v-if="selectedRecord.status === 'Rejected'" class="spk-rejection-full">
          <strong>Pengajuan SPK ditolak</strong>
          <p v-if="selectedRecord.rejectionCategory">Kategori: {{ rejectionCategoryLabel(selectedRecord.rejectionCategory) }}</p>
          <p v-if="selectedRecord.rejectionReason">{{ selectedRecord.rejectionReason }}</p>
          <div v-if="selectedRecord.rejectionCategory === 'Administrative Error' && selectedRecord.bookingFeeReuse" class="spk-reuse-success">
            Booking Fee {{ formatCurrency(selectedRecord.bookingFeeReuse.amount) }} telah tersedia untuk digunakan pada pengajuan SPK pengganti.
          </div>
          <div v-else-if="selectedRecord.rejectionCategory === 'Administrative Error'" class="spk-reuse-muted">
            Booking Fee belum tersedia untuk digunakan ulang. Pembayaran harus dikonfirmasi Finance terlebih dahulu.
          </div>
        </section>
        <div class="spk-detail-footer">
          <button type="button" class="spk-modal-close" @click="closeDetail">Tutup</button>
        </div>
      </div>
    </IonModal>

    <IonModal :enter-animation="modalEnterAnimation" :leave-animation="modalLeaveAnimation" :is-open="documentPreviewOpen" class="client-spk-document-preview-modal" @didDismiss="closeDocumentPreview">
      <section class="spk-document-preview">
        <header>
          <div>
            <strong>{{ previewDocument?.file_name || 'Pratinjau dokumen' }}</strong>
            <span>Dokumen SPK</span>
          </div>
          <button type="button" aria-label="Tutup preview" @click="closeDocumentPreview">
            <ion-icon :icon="closeOutline" aria-hidden="true" />
          </button>
        </header>
        <main>
          <div v-if="previewLoading" class="spk-preview-state"><ion-spinner name="crescent" /><span>Memuat dokumen...</span></div>
          <p v-else-if="previewError" class="spk-preview-error" role="alert">{{ previewError }}</p>
          <img v-else-if="previewUrl && previewDocument && (previewDocument.mime_type?.startsWith('image/') || /\.(jpg|jpeg|png|webp|gif)$/i.test(previewDocument.file_name))"
            :src="previewUrl" :alt="previewDocument.file_name" />
          <iframe v-else-if="previewUrl" :src="previewUrl" :title="previewDocument?.file_name || 'Dokumen SPK'" />
        </main>
      </section>
    </IonModal>

    <IonModal :enter-animation="modalEnterAnimation" :leave-animation="modalLeaveAnimation" :is-open="showRejectionReason" class="spk-reason-modal" @didDismiss="closeRejectionReason">
      <section class="spk-reason-dialog" role="dialog" aria-modal="true">
        <span class="spk-reason-icon"><ion-icon :icon="alertCircleOutline" /></span>
        <h2>Alasan Penolakan SPK</h2>
        <p class="spk-reason-number">{{ rejectionReasonTarget?.spkNumber }}</p>
        <p v-if="rejectionReasonTarget?.rejectionCategory" class="spk-reason-text">{{ rejectionCategoryLabel(rejectionReasonTarget.rejectionCategory) }}</p>
        <p class="spk-reason-text">{{ rejectionReasonTarget?.rejectionReason }}</p>
        <p v-if="rejectionReasonTarget?.rejectionCategory === 'Administrative Error' && rejectionReasonTarget.bookingFeeReuse" class="spk-reuse-success">
          Booking Fee tersedia untuk digunakan kembali pada SPK pengganti.
        </p>
        <button type="button" class="spk-reason-close" @click="closeRejectionReason">Mengerti</button>
      </section>
    </IonModal>
  </ion-page>
</template>
<style scoped>
.client-spk-page { --background: var(--ion-background-color, #f7f8f5); }
.spk-shell { width:min(100%,900px); margin:0 auto; padding:24px 18px calc(110px + env(safe-area-inset-bottom)); color:var(--ion-text-color,#243126); }
.spk-create-btn { display:flex; align-items:center; gap:6px; border:1px solid #355a2c; background:#355a2c; color:#fff; border-radius:12px; padding:10px 12px; font-size:11px; font-weight:800; white-space:nowrap; }
.spk-create-fab { position:fixed; z-index:20; right:calc(18px + env(safe-area-inset-right)); bottom:calc(88px + env(safe-area-inset-bottom)); display:grid; place-items:center; width:56px; height:56px; padding:0; border:0; border-radius:50%; box-shadow:0 5px 16px #24312640; cursor:pointer; }
.spk-create-fab ion-icon { font-size:27px; }
.spk-create-form { display:grid; gap:18px; padding:2px 2px 8px; }
.spk-form-section { display:grid; gap:10px; }
.spk-form-section h3 { margin:0; font-size:13px; font-weight:800; color:var(--text-primary,#263329); }
.spk-form-section label { display:grid; gap:6px; color:var(--text-primary,#485448); font-size:11px; font-weight:700; }
.spk-form-section label b { color:var(--status-danger-text,#b13d36); }
.spk-form-section label span { color:var(--text-secondary,#929a91); font-weight:400; }
.spk-form-section input:not([type=file]):not([type=radio]),.spk-form-section select,.spk-form-section textarea { width:100%; min-width:0; min-height:44px; border:1px solid var(--border-default,#dfe5dc); border-radius:10px; padding:11px; background:var(--surface-primary,#fff); color:var(--text-primary,#263329); font:inherit; font-weight:400; outline:none; }
.spk-form-section input:focus-visible,.spk-form-section select:focus-visible,.spk-form-section textarea:focus-visible { border-color:var(--poliland-green,#55784b); box-shadow:0 0 0 3px color-mix(in srgb,var(--poliland-green,#355a2c) 22%,transparent); }
.spk-lot-search { display:grid; gap:6px; }
.spk-lot-list { display:grid; gap:8px; max-height:260px; overflow:auto; padding:2px; }
.spk-lot-option { display:grid; grid-template-columns:22px minmax(0,1fr) auto; align-items:center; gap:9px; min-height:58px; border:1px solid var(--border-default,#e1e7de); border-radius:10px; background:var(--surface-primary,#fff); padding:9px 10px; color:var(--text-primary,#263329); text-align:left; cursor:pointer; }
.spk-lot-option.selected { border-color:var(--poliland-green,#55784b); background:var(--status-success-bg,#f1f6ee); }
.spk-lot-check { display:grid; place-items:center; width:20px; height:20px; border:1px solid var(--border-default,#d9e0d6); border-radius:6px; color:#fff; font-size:12px; }
.spk-lot-option.selected .spk-lot-check { border-color:var(--poliland-green,#355a2c); background:var(--poliland-green,#355a2c); }
.spk-lot-option>span:nth-child(2) { display:grid; gap:3px; min-width:0; }
.spk-lot-option small { color:var(--text-secondary,#7b8679); font-size:9px; }
.spk-lot-option>b { font-size:10px; }
.spk-lot-empty { margin:0; color:var(--text-secondary,#7b8679); font-size:11px; }
.spk-payment-options { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.spk-payment-options label { display:flex; align-items:center; gap:8px; min-height:44px; border:1px solid var(--border-default,#e2e8de); border-radius:10px; padding:11px; cursor:pointer; }
.spk-payment-options label.chosen { border-color:var(--poliland-green,#55784b); background:var(--status-success-bg,#f1f6ee); color:var(--poliland-green,#355a2c); }
.spk-dp-shortcuts { display:flex; gap:7px; }
.spk-dp-shortcuts button { min-width:44px; min-height:44px; border:1px solid var(--border-default,#dfe5dc); border-radius:9px; background:var(--surface-primary,#fff); color:var(--text-primary,#263329); font:inherit; font-size:11px; font-weight:800; cursor:pointer; }
.spk-payment-result { display:grid; gap:7px; border:1px solid var(--border-default,#e7ece4); border-radius:10px; background:var(--surface-muted,#f7f9f5); padding:10px; }
.spk-payment-result div { display:flex; justify-content:space-between; gap:10px; font-size:10px; }
.spk-payment-result strong { color:var(--poliland-green,#355a2c); }
.spk-upload-field { border:1px dashed var(--border-default,#cfd8ca); border-radius:11px; padding:11px; }
.spk-upload-field input { width:100%; min-height:44px; font-size:10px; }
.spk-upload-field small { color:var(--text-secondary,#8a9488); font-weight:400; }
.spk-create-error { margin:0; border-radius:10px; background:var(--status-danger-bg,#fff1f0); color:var(--status-danger-text,#a63e38); padding:10px; font-size:11px; line-height:1.5; }
.spk-payment-guidance { display:grid; gap:10px; }
.spk-bank-list,.spk-instruction-list { display:grid; gap:8px; border:1px solid var(--border-default,#e5eade); border-radius:11px; background:var(--surface-primary,#fff); padding:11px; }
.spk-bank-list h4,.spk-instruction-list h4 { margin:0; font-size:12px; }
.spk-bank-account { display:flex; align-items:center; justify-content:space-between; gap:10px; border-top:1px solid var(--border-default,#edf0e9); padding-top:9px; }
.spk-bank-account:first-of-type { border-top:0; padding-top:0; }
.spk-bank-main { display:grid; gap:3px; min-width:0; }
.spk-bank-main strong { font-size:11px; }
.spk-bank-main span,.spk-bank-main small { color:var(--text-secondary,#7c867b); font-size:9px; }
.spk-bank-main b { color:var(--poliland-green,#355a2c); font-size:14px; letter-spacing:.04em; }
.spk-bank-account button { display:inline-flex; align-items:center; gap:5px; min-width:68px; min-height:44px; border:1px solid var(--border-default,#dfe5dc); border-radius:9px; background:var(--surface-primary,#fff); color:var(--poliland-green,#355a2c); font:inherit; font-size:10px; font-weight:800; cursor:pointer; }
.spk-instruction-list p,.spk-instruction-list li { color:var(--text-secondary,#687365); font-size:10px; line-height:1.55; }
.spk-instruction-list p { margin:0; }
.spk-instruction-list ol,.spk-instruction-list ul { margin:0; padding-left:18px; }
.spk-doc-view { display:inline-flex; align-items:center; justify-content:center; gap:5px; min-height:44px; flex:0 0 auto; border:1px solid var(--border-default,#dfe5dc); border-radius:9px; background:var(--surface-primary,#fff); color:var(--poliland-green,#355a2c); padding:0 10px; font:inherit; font-size:10px; font-weight:800; cursor:pointer; }
.spk-doc-view:disabled { cursor:not-allowed; opacity:.55; }
.client-spk-document-preview-modal { --width:min(96vw,760px); --height:min(92dvh,820px); --border-radius:18px; }
.spk-document-preview { display:grid; grid-template-rows:auto minmax(0,1fr); height:100%; background:var(--surface-primary,#fff); color:var(--text-primary,#263329); }
.spk-document-preview header { display:flex; align-items:center; justify-content:space-between; gap:10px; min-height:64px; border-bottom:1px solid var(--border-default,#edf0e9); padding:10px 12px 10px 16px; }
.spk-document-preview header>div { display:grid; gap:3px; min-width:0; }
.spk-document-preview header strong { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:12px; }
.spk-document-preview header span { color:var(--text-secondary,#7c867b); font-size:9px; }
.spk-document-preview header button { display:grid; place-items:center; width:44px; height:44px; border:0; border-radius:10px; background:var(--surface-muted,#f2f5ef); color:var(--text-primary,#263329); cursor:pointer; }
.spk-document-preview main { min-height:0; display:grid; place-items:center; padding:10px; background:var(--surface-muted,#f2f5ef); }
.spk-document-preview img { max-width:100%; max-height:100%; object-fit:contain; }
.spk-document-preview iframe { width:100%; height:100%; border:0; background:#fff; }
.spk-preview-state { display:flex; align-items:center; gap:8px; color:var(--text-secondary,#687365); font-size:11px; }
.spk-preview-error { margin:0; color:var(--status-danger-text,#a63e38); font-size:11px; text-align:center; }
.spk-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:9px; margin-bottom:20px; }
.spk-stat { text-align:left; min-width:0; border:1px solid var(--border-default,#e8ebe5); background:var(--surface-primary,#fff); border-radius:15px; padding:13px 12px; color:var(--text-secondary,#69736a); cursor:pointer; }
.spk-stat span { display:block; font-size:10px; line-height:1.3; }
.spk-stat strong { display:block; margin-top:8px; color:var(--text-primary,#243126); font-size:23px; font-weight:800; }
.spk-stat-active { border-color:var(--poliland-green,#78936d); box-shadow:0 0 0 2px color-mix(in srgb,var(--poliland-green,#355a2c) 8%,transparent); }
.spk-toolbar { display:grid; gap:12px; margin-bottom:19px; }
.spk-search { display:flex; align-items:center; gap:9px; min-height:46px; border:1px solid var(--border-default,#e5e9e2); border-radius:13px; background:var(--surface-primary,#fff); padding:0 13px; color:var(--text-secondary,#8b948a); }
.spk-search input { flex:1; min-width:0; border:0; outline:0; background:transparent; color:var(--text-primary,#263329); font:inherit; font-size:12px; }
.spk-search button { border:0; background:transparent; color:var(--text-secondary,#788078); font-size:18px; }
.spk-filters { display:flex; gap:7px; overflow-x:auto; padding-bottom:3px; scrollbar-width:none; }
.spk-filters button { flex:0 0 auto; border:1px solid var(--border-default,#e5e9e2); border-radius:999px; background:var(--surface-primary,#fff); color:var(--text-secondary,#6e786e); padding:8px 12px; font-size:10px; font-weight:700; cursor:pointer; }
.spk-filters button.active { border-color:var(--poliland-green,#355a2c); background:var(--poliland-green,#355a2c); color:#fff; }
.spk-list-head { display:flex; align-items:center; justify-content:space-between; margin:0 2px 11px; }
.spk-list-head h2 { margin:0; font-size:14px; font-weight:800; }
.spk-list-head span { color:var(--text-secondary,#899188); font-size:10px; }
.spk-list { display:grid; gap:11px; }
.spk-card { border:1px solid var(--border-default,#e9ece6); border-radius:17px; background:var(--surface-primary,#fff); padding:15px; box-shadow:0 4px 16px #24312608; }
.spk-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
.spk-card-top>div { display:grid; gap:4px; }
.spk-number { color:var(--poliland-green,#355a2c); font-size:12px; font-weight:800; }
.spk-card time { color:var(--text-secondary,#929a91); font-size:10px; }
.spk-status { display:inline-flex; align-items:center; border-radius:999px; padding:6px 9px; font-size:9px; font-weight:800; white-space:nowrap; }
.status-submitted,.status-under-review { background:var(--status-warning-bg,#fff4d9); color:var(--status-warning-text,#91630d); }
.status-approved { background:var(--status-success-bg,#e8f4e7); color:var(--status-success-text,#2e6b36); }
.status-rejected { background:var(--status-danger-bg,#fcebea); color:var(--status-danger-text,#a63e38); }
.status-cancelled { background:var(--surface-muted,#eef0ed); color:var(--text-secondary,#687168); }
.spk-notary-progress { display:grid; grid-template-columns:1fr auto; align-items:center; gap:6px 10px; margin-top:11px; padding:9px 10px; border-radius:9px; background:var(--surface-muted,#f3f6f0); color:var(--text-secondary,#687168); font-size:10px; }
.spk-notary-status { display:inline-flex; align-items:center; border-radius:8px; padding:5px 8px; font-size:9px; font-weight:800; }
.spk-notary-note { grid-column:1 / -1; margin:0; color:var(--text-secondary,#737d72); font-size:10px; line-height:1.45; }
.notary-status-menunggu-diproses,.notary-status-diproses,.notary-status-proses-notaris { background:var(--status-warning-bg,#fff4d9); color:var(--status-warning-text,#91630d); }
.notary-status-penandatanganan-notaris { background:var(--surface-muted,#eef0ed); color:var(--text-primary,#445044); }
.notary-status-selesai { background:var(--status-success-bg,#e8f4e7); color:var(--status-success-text,#2e6b36); }
.spk-person { display:flex; align-items:center; gap:10px; margin:15px 0; }
.spk-avatar { display:grid; place-items:center; width:40px; height:40px; flex:0 0 40px; border-radius:13px; background:var(--status-success-bg,#edf3e9); color:var(--poliland-green,#355a2c); font-size:18px; }
.spk-person-info { display:grid; gap:3px; min-width:0; }
.spk-person-info strong { font-size:13px; }
.spk-person-info span,.spk-person-info small { color:var(--text-secondary,#778176); font-size:10px; }
.spk-card-meta { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; border-top:1px solid var(--border-default,#eff1ed); padding-top:12px; }
.spk-card-meta div { display:grid; gap:4px; min-width:0; }
.spk-card-meta span { color:var(--text-secondary,#929a91); font-size:9px; }
.spk-card-meta strong { overflow-wrap:anywhere; font-size:10px; }
.spk-card-meta small { color:var(--text-secondary,#818a80); font-size:9px; }
.spk-reuse-picker,.spk-reuse-info { display:grid; gap:8px; border:1px solid #dce8d7; border-radius:11px; background:#f1f7ee; color:#355a2c; padding:11px; font-size:11px; line-height:1.5; }
.spk-reuse-picker select { width:100%; border:1px solid #d9e2d5; border-radius:9px; background:#fff; padding:10px; color:#263329; }
.spk-reuse-picker p,.spk-reuse-success,.spk-reuse-muted { margin:0; font-size:11px; line-height:1.5; }
.spk-reuse-success { color:#355a2c; font-weight:700; }
.spk-reuse-muted { color:#80621e; }
.spk-rejection-preview { border-radius:9px; background:var(--status-danger-bg,#fff4f3); color:var(--status-danger-text,#8c3c37); padding:9px; font-size:10px; line-height:1.5; }
.spk-card-actions { display:flex; align-items:center; flex-wrap:wrap; gap:7px; margin-top:14px; padding-top:11px; border-top:1px solid var(--border-default,#eff1ed); }
.spk-card-actions button { display:inline-flex; align-items:center; justify-content:center; gap:5px; border-radius:9px; padding:9px 11px; font-size:10px; font-weight:800; cursor:pointer; }
.spk-detail-btn { margin-right:auto; border:0; background:transparent; color:var(--poliland-green,#355a2c); padding-left:0!important; }
.spk-reason-btn { border:1px solid var(--border-default,#e5e9e2); background:var(--surface-primary,#fff); color:var(--text-primary,#445044); }
.spk-state { display:grid; justify-items:center; gap:9px; padding:48px 18px; text-align:center; color:var(--text-secondary,#899188); font-size:12px; }
.spk-state>ion-icon { font-size:27px; }
.spk-state strong { color:var(--text-primary,#374338); font-size:13px; }
.spk-state p { max-width:320px; margin:0; line-height:1.5; }
.spk-error { color:var(--status-danger-text,#a63e38); }
.spk-retry-btn { border:0; border-radius:9px; background:var(--poliland-green,#355a2c); color:#fff; padding:9px 14px; font:inherit; font-weight:700; }
.spk-pager { display:grid; grid-template-columns:minmax(0,1fr) auto minmax(90px,1fr); align-items:center; gap:14px; margin-top:18px; padding:16px 0 4px; border-top:1px solid var(--border-default); }
.spk-pager-controls { display:flex; justify-content:center; align-items:center; gap:6px; flex-wrap:nowrap; min-width:0; max-width:100%; overflow-x:auto; scrollbar-width:none; padding:3px; border:1px solid var(--border-default); border-radius:var(--radius-panel); background:var(--surface-muted); }
.spk-pager-controls::-webkit-scrollbar { display:none; }
.spk-pager-position { color:var(--text-secondary); font-size:12px; text-align:center; white-space:nowrap; }
.spk-pager-btn,.spk-pager-number { min-width:38px; height:38px; padding:0 9px; border:1px solid var(--border-default); border-radius:9px; background:var(--surface-primary); color:var(--text-primary); font:inherit; font-weight:var(--font-weight-bold); cursor:pointer; }
.spk-pager-btn { display:inline-flex; align-items:center; justify-content:center; font-size:18px; }
.spk-pager-number.active { border-color:var(--poliland-green); background:var(--poliland-green); color:#fff; }
.spk-pager-btn:disabled,.spk-pager-number:disabled { cursor:default; opacity:.45; }
.spk-detail { display:grid; gap:16px; height:100%; overflow:auto; padding:22px 16px calc(24px + env(safe-area-inset-bottom)); background:var(--surface-primary,#fff); color:var(--text-primary,#263329); }
.spk-detail-header { display:flex; justify-content:space-between; align-items:center; gap:10px; border-radius:13px; background:var(--surface-muted,#f3f6f0); padding:13px; }
.spk-detail-header>div { display:grid; gap:4px; min-width:0; }
.spk-detail-header span:not(.spk-status) { color:var(--text-secondary,#788276); font-size:10px; }
.spk-detail-header strong { color:var(--poliland-green,#355a2c); font-size:14px; overflow-wrap:anywhere; }
.spk-detail-header small { color:var(--text-secondary,#788276); font-size:10px; }
.spk-detail-section { display:grid; gap:10px; }
.spk-detail-section h3 { display:flex; align-items:center; gap:7px; margin:0; font-size:13px; font-weight:800; }
.spk-detail-section h3 ion-icon { color:var(--poliland-green,#355a2c); font-size:17px; }
.spk-detail-section dl { display:grid; gap:0; margin:0; border:1px solid var(--border-default,#edf0eb); border-radius:12px; padding:0 12px; }
.spk-detail-section dl div { display:grid; grid-template-columns:minmax(105px,.8fr) 1.2fr; gap:12px; padding:10px 0; border-bottom:1px solid var(--border-default,#f0f2ee); }
.spk-detail-section dl div:last-child { border:0; }
.spk-detail-section dt { color:var(--text-secondary,#899188); font-size:10px; }
.spk-detail-section dd { margin:0; color:var(--text-primary,#303b31); font-size:11px; font-weight:650; overflow-wrap:anywhere; text-align:right; }
.spk-no-docs { color:var(--text-secondary); font-size:11px; }
.spk-document { display:flex; align-items:center; gap:10px; border:1px solid var(--border-default,#edf0eb); border-radius:12px; padding:10px; }
.spk-doc-icon { display:grid; place-items:center; width:35px; height:35px; flex:0 0 35px; border-radius:10px; background:var(--surface-muted,#f1f5ed); color:var(--poliland-green,#355a2c); font-size:18px; }
.spk-doc-info { display:grid; gap:3px; min-width:0; flex:1; }
.spk-doc-info strong { font-size:11px; }
.spk-doc-info span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:var(--text-secondary,#899188); font-size:9px; }
.spk-doc-state { flex:0 0 auto; font-size:9px; font-weight:800; }
.spk-doc-state.is-uploaded { color:var(--status-success-text,#2e6b36); }
.spk-doc-state.is-missing { color:var(--text-secondary,#899188); }
.spk-rejection-full { border-radius:12px; background:var(--status-danger-bg,#fff3f2); padding:12px; color:var(--status-danger-text,#8d3d37); font-size:11px; }
.spk-rejection-full p { margin:6px 0 0; line-height:1.5; }
.spk-refund-detail,
.spk-refund-status {
  border:1px solid #d9ae62;
  border-radius:11px;
  background:#fff8e9;
  color:#5f4a20;
  padding:12px;
}
.spk-refund-status--done { color:#355a2c; background:#eef6ea; }
.spk-refund-proof-button {
  min-height:44px;
  width:100%;
  border:1px solid #355a2c;
  border-radius:9px;
  background:#fff;
  color:#355a2c;
  font-weight:800;
  cursor:pointer;
}
.spk-progress-card { display:grid; gap:8px; border:1px solid var(--border-default,#edf0eb); border-radius:12px; padding:12px; }
.spk-progress-card p { margin:0; color:var(--text-secondary,#737d72); font-size:11px; line-height:1.5; }
.spk-reupload-alert,
.spk-reupload-section {
  display:grid;
  gap:8px;
  border:1px solid #d9ae62;
  border-radius:11px;
  background:#fff8e9;
  color:#5f4a20;
  padding:12px;
}
.spk-reupload-alert p,
.spk-reupload-section p { margin:0; line-height:1.5; font-size:11px; }
.spk-reupload-alert button,
.spk-reupload-submit {
  min-height:44px;
  border:0;
  border-radius:9px;
  background:#355a2c;
  color:#fff;
  font-weight:800;
  cursor:pointer;
}
.spk-reupload-alert button { width:100%; }
.spk-reupload-submit:disabled { cursor:not-allowed; opacity:.55; }
.spk-reupload-error { color:#8d3d37; }
.spk-detail-footer { display:flex; justify-content:flex-end; gap:8px; padding-top:5px; }
.spk-modal-close { border:1px solid var(--border-default); border-radius:9px; background:var(--surface-primary); color:var(--text-primary); padding:10px 15px; font-size:11px; font-weight:800; }
.spk-reason-modal { --width:min(92vw,390px); --height:auto; --border-radius:18px; --backdrop-opacity:.42; }
.spk-reason-dialog { display:grid; justify-items:center; gap:12px; padding:25px 22px 20px; text-align:center; background:var(--surface-primary,#fff); color:var(--text-primary,#263329); }
.spk-reason-icon { display:grid; place-items:center; width:48px; height:48px; border-radius:15px; background:var(--status-danger-bg,#fcebea); color:var(--status-danger-text,#a63e38); font-size:22px; }
.spk-reason-dialog h2 { margin:0; font-size:17px; font-weight:800; }
.spk-reason-text { margin:0; color:var(--text-secondary,#737d72); font-size:11px; line-height:1.55; }
.spk-reason-close { min-height:42px; border-radius:10px; font-size:11px; font-weight:800; border:1px solid var(--poliland-green); background:var(--poliland-green); color:#fff; }
.spk-reason-number { margin:0; color:var(--poliland-green); font-size:11px; font-weight:800; }
.spk-reason-close { width:100%; margin-top:5px; }
@media (min-width:700px) { .spk-shell { padding:32px 28px 60px; } .spk-stats { gap:13px; } .spk-stat { padding:17px; } .spk-card { padding:19px; } }
@media (max-width:560px) { .spk-pager { grid-template-columns:1fr; gap:10px; } .spk-pager-controls { justify-content:flex-start; } .spk-pager-position { text-align:center; } }
@media (max-width:390px) { .spk-shell { padding-inline:13px; } .spk-stats { gap:6px; } .spk-stat { padding:10px 8px; } .spk-stat strong { font-size:20px; } .spk-card-meta { gap:5px; } .spk-card-meta strong { font-size:9px; } .spk-card-actions { gap:5px; } .spk-card-actions button { padding:8px; } .spk-create-fab { right:calc(14px + env(safe-area-inset-right)); bottom:calc(84px + env(safe-area-inset-bottom)); } }

.spk-schedule-description {
  margin: 0 0 12px;
  color: var(--ion-color-medium, #737373);
  font-size: 0.875rem;
  line-height: 1.5;
}
.spk-client-schedule-list {
  display: grid;
  gap: 10px;
}
.spk-client-schedule-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 13px 14px;
  border: 1px solid var(--ion-color-light-shade, #e5e7eb);
  border-radius: 12px;
  background: var(--ion-color-light, #fff);
}
.spk-client-schedule-item > div:first-child,
.spk-client-schedule-meta {
  display: grid;
  gap: 5px;
}
.spk-client-schedule-item small {
  color: var(--ion-color-medium, #737373);
  font-size: 0.8rem;
}
.spk-client-schedule-meta {
  text-align: right;
  justify-items: end;
}
.spk-client-schedule-status {
  font-size: 0.75rem;
  color: var(--ion-color-medium, #737373);
}
.spk-client-schedule-status.is-paid {
  color: var(--ion-color-success, #16a34a);
  font-weight: 600;
}
.spk-schedule-empty {
  margin: 0;
  color: var(--ion-color-medium, #737373);
  font-size: 0.875rem;
}
</style>
