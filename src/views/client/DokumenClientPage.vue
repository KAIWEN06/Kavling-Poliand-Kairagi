<script setup lang="ts">
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import AppNotice from '@/components/ui/AppNotice.vue'
import SpkOrderTerms from '@/components/spk/SpkOrderTerms.vue'
import { askNotificationPermission } from '@/composables/useNotificationPrompt'
import { trackFunnel } from '@/services/funnelService'
import { NOTARY_FEE, estimateInstallment } from '@/services/payment/paymentCalculator'
import IdentityFields from '@/components/identity/IdentityFields.vue'
import { useMyIdentityForm } from '@/composables/useMyIdentityForm'
import IdentityInfo from '@/components/identity/IdentityInfo.vue'
import { useBookingAddressGate } from '@/composables/useBookingAddressGate'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import SkeletonCardList from '@/components/ui/skeletons/SkeletonCardList.vue'
import Reveal from '@/components/ui/Reveal.vue'
import { computed, nextTick, reactive, ref, watch } from 'vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import { usePagination } from '@/composables/usePagination'
import {
  IonContent, IonIcon, IonPage, onIonViewWillEnter, useIonRouter,
} from '@ionic/vue'
import { useRoute, useRouter } from 'vue-router'
import {
  addOutline, alertCircleOutline, chevronForwardOutline,
  closeOutline, copyOutline, documentTextOutline, eyeOutline, mapOutline, peopleOutline,
  searchOutline,
} from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import DocumentViewerModal from '@/components/ui/DocumentViewerModal.vue'
import SpkProcessTimeline from '@/components/spk/SpkProcessTimeline.vue'
import { stepIsDone, type SpkProcessStep } from '@/services/spkProcessService'
import { authService } from '@/services/auth/authService'
import { supabase } from '@/services/config/supabase'
import { lotService, type LotRecord } from '@/services/lotService'
import { bankAccountService, type BankAccountRecord } from '@/services/Finance/bankAccountService'
import { paymentInstructionService, type PaymentInstructionRecord } from '@/services/Finance/paymentInstructionService'
import { DEFAULT_SPK_BOOKING_FEE, paymentService } from '@/services/Finance/paymentService'
import InstallmentDpChoice from '@/components/spk/InstallmentDpChoice.vue'
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
import { sortByRunningStage, spkStage, SPK_STAGE_LABEL } from '@/utils/spkStage'
import { getLotsHeldBySpkSafe, lotHoldNote as buildLotHoldNote, type HeldLots } from '@/services/lotHoldService'

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
const createOpen = ref(false)
const creating = ref(false)
const createError = ref('')
const availableLots = ref<LotRecord[]>([])
const lotLoading = ref(false)
/** Kavling yang sedang ditahan SPK aktif: lot id -> batas penahanan (null bila menunggu keputusan Admin). */
const heldLots = ref<HeldLots>(new Map())
const lotSearchQuery = ref('')
const selectedLotId = ref<number | null>(null)
const paymentScheme = ref<'Cash' | 'Installment'>('Cash')
const paymentMethod = ref<'Transfer Bank'>('Transfer Bank')
const paymentPlans = ref<Awaited<ReturnType<typeof lotService.getLotInstallments>>>([])
const paymentPlansLoading = ref(false)
const selectedPlanId = ref<number | null>(null)
const downPaymentInput = ref('')
const useDownPayment = ref(false)
/** Email akun yang sedang masuk; kolom email dikunci ke nilai ini. */
const accountEmail = ref('')
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
const detailModalRef = ref<InstanceType<typeof AppModal> | null>(null)
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

// Dipakai kartu ringkasan dan daftar, supaya angka kartu selalu sama dengan isi daftarnya.
function matchesStatusFilter(record: ClientSpkRecord, filter: SpkListFilter) {
  switch (filter) {
    case 'All':
      return true
    case 'Submitted':
      return record.status === 'Submitted' || record.status === 'Under Review'
    case 'In Progress':
      return record.status !== 'Rejected'
        && record.status !== 'Cancelled'
        && record.notaryStatus !== 'Menunggu Diproses'
        && record.notaryStatus !== 'Selesai'
    case 'Completed':
      return record.status !== 'Rejected' && record.notaryStatus === 'Selesai'
    default:
      return record.status === filter
  }
}

function countByFilter(filter: SpkListFilter) {
  return spkRecords.value.filter(record => matchesStatusFilter(record, filter)).length
}

const stats = computed(() => ({
  total: countByFilter('All'),
  inProgress: countByFilter('In Progress'),
  approved: countByFilter('Approved'),
  rejected: countByFilter('Rejected'),
}))

const statCards = computed(() => [
  { key: 'total' as const, label: 'Semua SPK', filter: 'All' as const },
  { key: 'inProgress' as const, label: 'Dalam Proses', filter: 'In Progress' as const },
  { key: 'approved' as const, label: 'Disetujui', filter: 'Approved' as const },
  { key: 'rejected' as const, label: 'Ditolak', filter: 'Rejected' as const },
])

const processSteps = ref<SpkProcessStep[]>([])
const ppjbDone = computed(() => stepIsDone(processSteps.value, 'ppjb'))
function onProcessLoaded(steps: SpkProcessStep[]) {
  processSteps.value = steps
}

const filteredRecords = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('id-ID')
  const matches = spkRecords.value.filter(record => {
    const matchesStatus = matchesStatusFilter(record, selectedStatus.value)
    const haystack = [
      record.spkNumber, record.buyer.fullName, record.buyer.phone,
      record.lot.name, record.lot.id,
    ].join(' ').toLocaleLowerCase('id-ID')
    return matchesStatus && (!query || haystack.includes(query))
  })
  return selectedStatus.value === 'All'
    ? sortByRunningStage(matches, record => [record.status, record.notaryStatus])
    : matches
})

const pager = usePagination(filteredRecords, {
  pageSize: 8,
  resetOn: [searchQuery, selectedStatus],
})

async function loadSpkRecords({ silent = false }: LoadOptions = {}) {
  if (!silent) {
    loading.value = true
    storageError.value = ''
  }
  try {
    spkRecords.value = await getClientSpks()
    storageError.value = ''
    const openId = selectedRecord.value?.id
    if (openId != null) {
      selectedRecord.value = spkRecords.value.find((record) => record.id === openId) ?? selectedRecord.value
    }
  } catch (error) {
    console.error('[SPK Klien] Gagal memuat pengajuan:', error)
    if (!silent) storageError.value = getClientSpkErrorMessage(error, 'Data SPK gagal dimuat.')
  } finally {
    loading.value = false
  }
  if (silent) return
  await nextTick()
  openSpkFromNotification()
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
  availableLots.value.find(lot => lot.id === selectedLotId.value && !heldLots.value.has(lot.id)) || null,
)

function lotHoldNote(lotId: number) {
  return buildLotHoldNote(heldLots.value, lotId)
}
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
  const { monthly, total } = estimateInstallment(price, dp, plan.months, Number(plan.margin_percent))
  return { monthly, total }
})
const termsAccepted = ref(false)
const identityForm = useMyIdentityForm()
const addressGate = useBookingAddressGate()
const { gaps: addressGaps } = addressGate
const { identity, available: identityAvailable, loading: identityLoading, loadError: identityLoadError, problem: identityProblem } = identityForm
const canSubmitCreate = computed(() => Boolean(
  createBuyer.email.trim() &&
  termsAccepted.value &&
  !identityProblem.value &&
  !addressGaps.value.length &&
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
          () => reject(new Error('Pemeriksaan tanda jadi melewati batas waktu. Periksa koneksi lalu coba lagi.')),
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
  trackFunnel('spk_form_open', preferredLotId)
  createError.value = ''
  termsAccepted.value = false
  void identityForm.load()
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
  useDownPayment.value = false
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
      'Tanda jadi sebelumnya belum dapat diperiksa.',
    )
  } finally {
    reuseFeesLoading.value = false
  }

  await addressGate.refresh()

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
      accountEmail.value = firstText(user.email)
      createBuyer.email = accountEmail.value
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
        createBuyer.email = user.email || customer.email || ''
        createBuyer.address = customer.address || ''
      }
    }
  } catch (error) {
    console.warn('[SPK Klien] Data profil pembeli gagal dimuat:', error)
  }

  try {
    const [lots, held] = await Promise.all([
      lotService.getLots(),
      getLotsHeldBySpkSafe(),
    ])
    heldLots.value = held
    availableLots.value = lots.filter(lot => {
      const status = (lot.status || '').toLocaleLowerCase('id-ID')
      return status === 'available' || status === 'tersedia'
    })
    const preferredLot = preferredLotId === null
      ? null
      : availableLots.value.find(lot => lot.id === preferredLotId)
    if (preferredLot && held.has(preferredLot.id)) {
      createError.value = `Kaveling ${preferredLot.lot_number} sedang diproses pengajuan SPK lain. Silakan pilih kaveling lain.`
    } else if (preferredLot) {
      await selectCreateLot(preferredLot)
    }
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
  if (heldLots.value.has(lot.id)) return
  selectedLotId.value = lot.id
  selectedPlanId.value = null
  downPaymentInput.value = ''
  useDownPayment.value = false
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
  useDownPayment.value = false
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

function openAddressCompletion() {
  createOpen.value = false
  ionRouter.push('/akun?lengkapi=1')
}

async function submitCreateSPK() {
  if (addressGaps.value.length) {
    createError.value = `Lengkapi alamat di halaman Akun sebelum memesan: ${addressGaps.value.join(', ')}.`
    return
  }
  if (!canSubmitCreate.value || !selectedCreateLot.value || !selectedCreateLotPrice.value) {
    createError.value = 'Lengkapi data pembeli termasuk email, pilih kaveling, isi rencana pembayaran, serta unggah KTP, KK, dan bukti transfer tanda jadi. Centang juga bahwa Anda sudah membaca ketentuan pemesanan.'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    await identityForm.save()
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
    trackFunnel('spk_submitted', selectedCreateLot.value?.id)
    createOpen.value = false
    await loadSpkRecords()
    void askNotificationPermission('Supaya Anda tahu hasil pemeriksaan pengajuan SPK.')
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
    reuploadError.value = 'Pengajuan pembayaran ini tidak sedang meminta unggah ulang.'
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

function openSpkFromNotification() {
  const queryValue = route.query.spk_id
  const requestedId = Number(Array.isArray(queryValue) ? queryValue[0] : queryValue)
  if (!Number.isInteger(requestedId) || requestedId <= 0) return

  const record = spkRecords.value.find(item => item.id === requestedId)
  if (record?.status === 'Rejected' && record.rejectionReason) {
    openRejectionReason(record)
  } else if (record) {
    openDetail(record)
  }
  void router.replace({ path: route.path, query: { ...route.query, spk_id: undefined } })
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
// Tap notifikasi saat halaman ini sudah terbuka: view-enter tidak terpanggil lagi.
watch(() => route.query.nt, (stamp) => {
  if (stamp && route.path === '/client/dokumen' && route.query.spk_id) void loadSpkRecords()
})

useRealtimeRefresh(
  ['spk_requests', 'spk_request_documents', 'spk_corrections', 'payments', 'booking_fee_refunds', 'lot_transactions'],
  () => loadSpkRecords({ silent: true }),
  {
    pauseWhen: () =>
      loading.value || createOpen.value || creating.value || reuploadProof.value ||
      reuploadSubmitting.value || refundProofSubmitting.value,
  },
)

</script>
<template>
  <ion-page class="pl-client pl-sheet client-spk-page">
    <AppHeader variant="client" title="PoliLand Kairagi" :show-back="false" />
    <ion-content :fullscreen="true">
      <main class="spk-shell">
        <Reveal :order="1">
          <section class="spk-stats" aria-label="Ringkasan pengajuan SPK">
            <button v-for="item in statCards" :key="item.key" type="button"
              :class="['spk-stat', { 'spk-stat-active': selectedStatus === item.filter }]"
              @click="selectedStatus = item.filter">
              <span>{{ item.label }}</span>
              <strong>{{ stats[item.key] }}</strong>
            </button>
          </section>
        </Reveal>

        <Reveal :order="2">
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
        </Reveal>

        <SkeletonCardList v-if="loading" :count="3" :lines="3" label="Memuat pengajuan SPK" />
        <div v-else-if="storageError" class="spk-state spk-error" role="alert">
          <ion-icon :icon="alertCircleOutline" />
          <strong>Data SPK gagal dimuat</strong>
          <p>{{ storageError }}</p>
          <button type="button" class="spk-retry-btn" @click="loadSpkRecords()">Coba lagi</button>
        </div>
        <template v-else>
          <div id="client-spk-list-top" class="spk-list-head">
            <h2>Daftar pengajuan</h2>
            <span>{{ filteredRecords.length }} pengajuan</span>
          </div>

          <section v-if="filteredRecords.length" class="spk-list">
            <article v-for="record in pager.items" :key="record.id" :id="`spk-entry-${record.id}`" class="spk-card">
              <div class="spk-card-top">
                <div>
                  <span class="spk-number">{{ record.spkNumber }}</span>
                  <time>{{ formatDate(record.createdAt) }}</time>
                </div>
                <span :class="['spk-status', statusClass(record.status)]">{{ statusLabel(record.status) }}</span>
              </div>
              <div v-if="record.status === 'Approved'" class="spk-notary-progress">
                <span>Tahapan proses</span>
                <strong :class="['spk-notary-status', notaryStatusClass(record.notaryStatus)]">
                  {{ SPK_STAGE_LABEL[spkStage(record.status, record.notaryStatus) ?? 'not-started'] }}
                </strong>
                <p class="spk-notary-note">Buka detail untuk melihat tahapan dan jadwalnya.</p>
              </div>

              <div
                v-if="record.payment.bookingPaymentStatus === 'Needs Reupload'"
                class="spk-reupload-alert"
                role="alert"
              >
                <strong>Bukti pembayaran SPK perlu diunggah ulang</strong>
                <p>{{ record.payment.bookingPaymentReviewNote || 'Admin meminta bukti pembayaran yang lebih jelas.' }}</p>
                <button type="button" @click.stop="openDetail(record)">Unggah bukti</button>
              </div>

              <div class="spk-person">
                <div class="spk-avatar"><ion-icon :icon="peopleOutline" /></div>
                <div class="spk-person-info">
                  <strong>{{ record.buyer.fullName }}</strong>
                  <span>{{ record.buyer.phone }}</span>
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
                    Tanda jadi Rp{{ record.bookingFeeRefund.amount.toLocaleString('id-ID') }} akan dikembalikan kepada Anda. Pengembalian sedang diproses.
                  </p>
                  <p v-else class="spk-refund-status spk-refund-status--done">
                    Tanda jadi Rp{{ record.bookingFeeRefund.amount.toLocaleString('id-ID') }} telah dicatat sebagai sudah dikembalikan.
                  </p>
                </template>
                <p v-if="record.rejectionCategory === 'Administrative Error' && record.bookingFeeReuse" class="spk-reuse-success">
                  Tanda jadi {{ formatCurrency(record.bookingFeeReuse.amount) }} tersedia untuk SPK pengganti.
                </p>
                <p v-else-if="record.rejectionCategory === 'Administrative Error'" class="spk-reuse-muted">
                  Tanda jadi belum tersedia untuk digunakan ulang. Pastikan bagian Keuangan sudah mengonfirmasi pembayaran.
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

          <AppPagination v-model:page="pager.page" :total-pages="pager.totalPages" :total="pager.total" :page-size="pager.pageSize" scroll-to="#client-spk-list-top" label="Halaman daftar SPK" />

          <StatusIllustration
            v-if="!filteredRecords.length"
            :variant="spkRecords.length ? 'no-result' : 'empty-data'"
            :title="spkRecords.length ? 'Pengajuan SPK tidak ditemukan' : 'Belum ada pengajuan SPK'"
            :description="spkRecords.length ? 'Tidak ada data yang sesuai dengan pencarian atau filter.' : 'Pilih kavling yang tersedia untuk mulai membuat pengajuan SPK.'"
          />
        </template>
      </main>
      <button class="spk-create-btn spk-create-fab" type="button" aria-label="Buat SPK" title="Buat SPK" @click="() => openCreateForm()">
        <ion-icon :icon="addOutline" />
      </button>
    </ion-content>
    <MobileTabBar variant="client" />

    <AppModal
      guard-unsaved
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
          <label>Nama lengkap <b>*</b><input v-model.trim="createBuyer.fullName" data-input="name" required placeholder="Nama sesuai KTP" /></label>
          <label>Nomor kontak <b>*</b><input v-model.trim="createBuyer.phone" inputmode="tel" required placeholder="Nomor telepon" /></label>
          <label>Nomor WhatsApp<input v-model.trim="createBuyer.whatsappPhone" inputmode="tel" placeholder="Nomor WhatsApp" /></label>
          <label>Email<input v-model.trim="createBuyer.email" type="email" placeholder="email@contoh.com" :readonly="Boolean(accountEmail)" required /></label>
          <label>Alamat <b>*</b><textarea v-model.trim="createBuyer.address" rows="2" required placeholder="Alamat lengkap" /></label>
          <AppNotice
            v-if="addressGaps.length"
            tone="warning"
            title="Lengkapi alamat untuk memesan"
            :message="`Belum diisi: ${addressGaps.join(', ')}.`"
            action-label="Lengkapi di Akun"
            @action="openAddressCompletion"
          />
          <template v-if="identityAvailable">
            <p v-if="identityLoading" class="spk-lot-empty" role="status">Memuat data identitas...</p>
            <div v-else-if="identityLoadError" class="spk-reuse-error" role="alert">
              {{ identityLoadError }} Tutup lalu buka kembali formulir ini.
            </div>
            <IdentityFields v-else v-model="identity" />
          </template>
        </section>

        <section class="spk-form-section">
          <h3>2. Pilih Kaveling</h3>
          <label class="spk-lot-search">Cari kaveling
            <input data-discard-ignore v-model.trim="lotSearchQuery" type="search" placeholder="Cari nomor kaveling atau blok" />
          </label>
          <p v-if="lotLoading" class="spk-lot-empty">Memuat kaveling tersedia...</p>
          <div v-else class="spk-lot-list" role="group" aria-label="Pilih kaveling">
            <button v-for="lot in filteredCreateLots" :key="lot.id" type="button"
              class="spk-lot-option" :class="{ selected: selectedLotId === lot.id, held: heldLots.has(lot.id) }"
              :disabled="heldLots.has(lot.id)"
              :aria-pressed="selectedLotId === lot.id" data-discard-change @click="selectCreateLot(lot)">
              <span class="spk-lot-check" aria-hidden="true">{{ selectedLotId === lot.id ? '✓' : '' }}</span>
              <span>
                <strong>{{ lot.lot_number }}</strong>
                <small>{{ getCreateLotBlockName(lot) }}</small>
                <small v-if="heldLots.has(lot.id)" class="spk-lot-hold" role="note">{{ lotHoldNote(lot.id) }}</small>
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
            <InstallmentDpChoice v-model="useDownPayment" name="dokumen-dp-mode" @update:model-value="downPaymentInput = ''" />
            <template v-if="useDownPayment">
              <label>Nominal uang muka
                <input :value="downPaymentInput" inputmode="numeric" placeholder="Nominal uang muka"
                  @input="downPaymentInput = ($event.target as HTMLInputElement).value.replace(/\D/g, '')" />
              </label>
              <div class="spk-dp-shortcuts">
                <button v-for="percent in [10,20,30]" :key="percent" type="button" data-discard-change @click="setDownPaymentPercent(percent)">{{ percent }}%</button>
              </div>
            </template>
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
              <span>Tanda jadi wajib saat pengajuan SPK</span>
              <strong>{{ formatCurrency(DEFAULT_SPK_BOOKING_FEE) }}</strong>
            </div>
            <div>
              <span>Biaya notaris (ditanggung pembeli)</span>
              <strong>{{ formatCurrency(NOTARY_FEE) }}</strong>
            </div>
            <small>Tanda jadi terpisah dari uang muka. Uang muka atau pelunasan dilakukan setelah SPK disetujui. Biaya notaris tidak ikut dalam transfer tanda jadi.</small>
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
          <div v-if="reuseFeesLoading" class="spk-reuse-info" role="status">Memeriksa tanda jadi yang tersedia...</div>
          <div v-else-if="reuseFeesError" class="spk-reuse-error" role="alert">
            {{ reuseFeesError }} Tutup lalu buka kembali formulir untuk mencoba lagi. Jangan kirim tanda jadi baru sebelum status pembayaran sebelumnya dipastikan.
          </div>
          <div v-else-if="availableBookingFees.length" class="spk-reuse-picker">
            <strong>Tanda jadi tersedia untuk digunakan ulang</strong>
            <label>
              <span>Pilih tanda jadi</span>
              <select v-model.number="selectedReusePaymentId">
                <option :value="null">Bayar tanda jadi baru</option>
                <option v-for="fee in availableBookingFees" :key="fee.paymentId" :value="fee.paymentId">
                  {{ fee.sourceSpkNumber }} · {{ formatCurrency(fee.amount) }} · Kaveling {{ fee.sourceLotNumber }}
                </option>
              </select>
            </label>
            <p v-if="selectedReusePaymentId">Tanda jadi lama akan dipindahkan ke SPK pengganti. Bukti pembayaran lama tetap tersimpan.</p>
          </div>
          <label v-if="selectedReusePaymentId === null" class="spk-upload-field">Bukti transfer tanda jadi <b>*</b><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required @change="handleCreateFile('paymentProof', $event)" /><small>{{ createDocuments.paymentProof?.name || 'Belum ada file dipilih' }}</small></label>
          <div v-else class="spk-reuse-info">Bukti tanda jadi tidak perlu diunggah ulang karena menggunakan pembayaran terverifikasi sebelumnya.</div>
          <label class="spk-upload-field">NPWP <span>(opsional)</span><input type="file" accept="image/*,.pdf" @change="handleCreateFile('npwp', $event)" /><small>{{ createDocuments.npwp?.name || 'Belum ada file dipilih' }}</small></label>
        </section>

        <SpkOrderTerms v-model="termsAccepted" title="5. Ketentuan Pemesanan" />

        <AppNotice v-if="createError" tone="error">
          {{ createError }}
        </AppNotice>
      </form>
    </AppModal>

    <AppModal ref="detailModalRef"
      :unsaved="Boolean(reuploadProof)"
      :model-value="detailOpen"
      title="Detail SPK"
      variant="bottom-sheet"
      :show-confirm="false"
      @update:model-value="(open: boolean) => { if (!open) closeDetail() }"
    >
      <div v-if="selectedRecord" class="spk-detail">
        <header class="spk-detail-header">
          <div>
            <span>Nomor SPK</span>
            <strong>{{ selectedRecord.spkNumber }}</strong>
            <small>{{ formatDate(selectedRecord.createdAt) }}</small>
          </div>
          <span :class="['spk-status', statusClass(selectedRecord.status)]">{{ statusLabel(selectedRecord.status) }}</span>
        </header>
        <section v-if="selectedRecord.status === 'Approved'" class="spk-detail-section spk-progress-section">
          <h3><ion-icon :icon="documentTextOutline" /> Tahapan proses</h3>
          <SpkProcessTimeline :key="selectedRecord.id" :spk-id="selectedRecord.id" :down-payment="selectedRecord.payment.downPaymentAmount" mode="view" @loaded="onProcessLoaded" />
        </section>

        <section class="spk-detail-section">
          <h3><ion-icon :icon="peopleOutline" /> Informasi Pembeli</h3>
          <dl>
            <div><dt>Nama lengkap</dt><dd>{{ selectedRecord.buyer.fullName }}</dd></div>
            <div><dt>Nomor telepon</dt><dd>{{ selectedRecord.buyer.phone }}</dd></div>
            <div><dt>Email</dt><dd>{{ selectedRecord.buyer.email || '-' }}</dd></div>
            <div><dt>Alamat</dt><dd>{{ selectedRecord.buyer.address || '-' }}</dd></div>
          </dl>
          <IdentityInfo self />
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
              <dt>Status bukti tanda jadi</dt>
              <dd>{{ selectedRecord.payment.bookingPaymentStatus === 'Needs Reupload'
                ? 'Perlu unggah ulang'
                : selectedRecord.payment.bookingPaymentStatus === 'Confirmed'
                  ? 'Terverifikasi'
                  : selectedRecord.payment.bookingPaymentStatus === 'Rejected'
                    ? 'Ditolak'
                    : 'Menunggu verifikasi' }}</dd>
            </div>
            <div v-if="selectedRecord.payment.scheme === 'Installment'"><dt>Skema uang muka</dt><dd>{{ (selectedRecord.payment.downPaymentAmount ?? 0) > 0 ? formatCurrency(selectedRecord.payment.downPaymentAmount ?? 0) : 'Tanpa uang muka (cicilan penuh)' }}</dd></div>
            <div v-if="selectedRecord.payment.tenorMonths"><dt>Tenor</dt><dd>{{ selectedRecord.payment.tenorMonths }} bulan</dd></div>
            <div v-if="selectedRecord.payment.monthlyPayment"><dt>Cicilan per bulan</dt><dd>{{ formatCurrency(selectedRecord.payment.monthlyPayment) }}</dd></div>
          </dl>
        </section>

        <section
          v-if="selectedRecord.status === 'Rejected' && selectedRecord.bookingFeeRefund"
          class="spk-detail-section spk-refund-detail"
        >
          <h3>Pengembalian tanda jadi</h3>
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
            Lihat bukti
          </button>
        </section>

        <section
          v-if="selectedRecord.payment.bookingPaymentStatus === 'Needs Reupload'"
          class="spk-detail-section spk-reupload-section"
          role="alert"
        >
          <h3>Unggah ulang bukti tanda jadi</h3>
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
            {{ reuploadSubmitting ? 'Mengirim...' : 'Kirim bukti' }}
          </button>
          <AppNotice v-if="reuploadError" tone="error">
            {{ reuploadError }}
          </AppNotice>
        </section>

        <section
          v-if="ppjbDone && selectedRecord.payment.scheme === 'Installment'"
          class="spk-detail-section spk-final-schedule"
        >
          <h3><ion-icon :icon="documentTextOutline" /> Jadwal Pembayaran Disepakati</h3>
          <p class="spk-schedule-description">
            Tanggal ini ditetapkan saat PPJB di notaris. {{ (selectedRecord.payment.downPaymentAmount ?? 0) > 0 ? 'Cicilan pertama' : 'Cicilan kedua' }} jatuh di bulan setelah PPJB.
          </p>

          <div v-if="selectedRecord.schedules.length" class="spk-client-schedule-list">
            <article
              v-for="schedule in selectedRecord.schedules"
              :key="schedule.id"
              class="spk-client-schedule-item"
            >
              <div>
                <strong>Ke-{{ schedule.installmentNumber }} dari {{ selectedRecord.schedules.length }}</strong>
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
            Tanda jadi {{ formatCurrency(selectedRecord.bookingFeeReuse.amount) }} telah tersedia untuk digunakan pada pengajuan SPK pengganti.
          </div>
          <div v-else-if="selectedRecord.rejectionCategory === 'Administrative Error'" class="spk-reuse-muted">
            Tanda jadi belum tersedia untuk digunakan ulang. Pembayaran harus dikonfirmasi bagian Keuangan terlebih dahulu.
          </div>
        </section>
      </div>
      <template #footer>
        <AppButton type="button" variant="neutral" fill="outline" class="spk-detail-close" @click="detailModalRef?.close()">Tutup</AppButton>
      </template>
    </AppModal>

    <DocumentViewerModal
      :open="documentPreviewOpen"
      :url="previewUrl"
      :file-name="previewDocument?.file_name || 'Pratinjau dokumen'"
      :mime-type="previewDocument?.mime_type"
      subtitle="Dokumen SPK"
      :loading="previewLoading"
      :error="previewError"
      @close="closeDocumentPreview"
    />

    <AppModal
      :model-value="showRejectionReason"
      title="Alasan Penolakan SPK"
      variant="dialog"
      :show-confirm="false"
      cancel-text="Mengerti"
      max-width="390px"
      @close="closeRejectionReason"
    >
      <section class="spk-reason-dialog">
        <span class="spk-reason-icon"><ion-icon :icon="alertCircleOutline" /></span>
        <p class="spk-reason-number">{{ rejectionReasonTarget?.spkNumber }}</p>
        <p v-if="rejectionReasonTarget?.rejectionCategory" class="spk-reason-text">{{ rejectionCategoryLabel(rejectionReasonTarget.rejectionCategory) }}</p>
        <p class="spk-reason-text">{{ rejectionReasonTarget?.rejectionReason }}</p>
        <p v-if="rejectionReasonTarget?.rejectionCategory === 'Administrative Error' && rejectionReasonTarget.bookingFeeReuse" class="spk-reuse-success">
          Tanda jadi tersedia untuk digunakan kembali pada SPK pengganti.
        </p>
      </section>
    </AppModal>
  </ion-page>
</template>
<style scoped>
input[type='email']:read-only { border-style: dashed; }
.client-spk-page { --background: var(--surface-primary); }
.spk-shell { width:min(100%,900px); margin:0 auto; color:var(--text-primary); }
.spk-create-btn { display:flex; align-items:center; gap:6px; border:1px solid #355a2c; background:#355a2c; color:#fff; border-radius:12px; padding:10px 12px; font-size:11px; font-weight:800; white-space:nowrap; }
.spk-create-fab { position:fixed; z-index:20; right:calc(18px + var(--safe-right)); bottom:calc(88px + var(--safe-bottom)); display:grid; place-items:center; width:56px; height:56px; padding:0; border:0; border-radius:50%; box-shadow:0 5px 16px #24312640; cursor:pointer; }
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
.spk-lot-list { display:grid; grid-auto-rows:max-content; gap:8px; max-height:260px; overflow:auto; padding:2px; }
.spk-lot-option { display:grid; grid-template-columns:22px minmax(0,1fr) auto; align-items:center; gap:9px; min-height:58px; border:1px solid var(--border-default,#e1e7de); border-radius:10px; background:var(--surface-primary,#fff); padding:9px 10px; color:var(--text-primary,#263329); text-align:left; cursor:pointer; }
.spk-lot-option.held { cursor:not-allowed; background:var(--surface-secondary,#f3f4f1); opacity:.8; }
.spk-lot-option.held>b { color:var(--text-secondary,#7b8679); }
.spk-lot-option .spk-lot-hold { color:var(--status-warning-text,#7a5410); font-size:10px; font-weight:700; }
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
.spk-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:9px; margin-bottom:20px; }
.spk-stat { text-align:left; min-width:0; border:1px solid var(--border-default,#e8ebe5); background:var(--surface-primary,#fff); border-radius:15px; padding:13px 12px; color:var(--text-secondary,#69736a); cursor:pointer; }
.spk-stat span { display:block; font-size:10px; line-height:1.3; }
.spk-stat strong { display:block; margin-top:8px; color:var(--text-primary,#243126); font-size:23px; font-weight:800; }
.spk-stat-active { border-color:var(--poliland-green,#78936d); box-shadow:0 0 0 2px color-mix(in srgb,var(--poliland-green,#355a2c) 8%,transparent); }
.spk-toolbar { display:grid; gap:12px; margin-bottom:19px; }
.spk-search { display:flex; align-items:center; gap:9px; min-height:52px; border:1px solid var(--border-default); border-radius:var(--radius-control); background:var(--surface-primary); padding:0 4px 0 14px; color:var(--text-secondary); }
.spk-search input { flex:1; min-width:0; height:48px; border:0; outline:0; background:transparent; color:var(--text-primary); font:inherit; font-size:15px; }
.spk-search:focus-within { outline:2px solid var(--poliland-green); outline-offset:1px; }
.spk-search button { display:grid; place-items:center; width:44px; height:44px; border:0; background:transparent; color:var(--text-secondary); font-size:20px; }
.spk-filters { display:flex; gap:7px; overflow-x:auto; padding-bottom:3px; scrollbar-width:none; }
.spk-filters button { flex:0 0 auto; border:1px solid var(--border-default,#e5e9e2); border-radius:999px; background:var(--surface-primary,#fff); color:var(--text-secondary,#6e786e); padding:8px 12px; font-size:10px; font-weight:700; cursor:pointer; }
.spk-filters button.active { border-color:var(--poliland-green,#355a2c); background:var(--poliland-green,#355a2c); color:#fff; }
.spk-list-head { display:flex; flex-wrap:wrap; align-items:flex-end; justify-content:space-between; gap:4px 12px; margin:0 0 14px; }
.spk-list-head h2 { margin:0; font-size:14px; font-weight:800; }
.spk-list-head span { color:var(--text-secondary); font-size:12px; }
.spk-list { display:grid; gap:12px; }
.spk-card { border:1px solid var(--border-default); border-radius:var(--radius-card); background:var(--surface-primary); padding:14px; box-shadow:var(--shadow-sm); }
.spk-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
.spk-card-top>div { display:grid; gap:4px; }
.spk-number { color:var(--text-primary); font-size:16px; font-weight:700; overflow-wrap:anywhere; }
.spk-card time { color:var(--text-secondary); font-size:12px; }
.spk-status { display:inline-flex; align-items:center; border-radius:999px; padding:5px 10px; font-size:12px; font-weight:700; white-space:nowrap; }
.status-submitted,.status-under-review { background:var(--status-warning-bg,#fff4d9); color:var(--status-warning-text,#91630d); }
.status-approved { background:var(--status-success-bg,#e8f4e7); color:var(--status-success-text,#2e6b36); }
.status-rejected { background:var(--status-danger-bg,#fcebea); color:var(--status-danger-text,#a63e38); }
.status-cancelled { background:var(--surface-muted,#eef0ed); color:var(--text-secondary,#687168); }
.spk-notary-progress { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:center; gap:6px 10px; margin-top:12px; padding:10px 12px; border:1px solid var(--border-default); border-radius:var(--radius-control); color:var(--text-secondary); font-size:12px; }
.spk-notary-status { display:inline-flex; align-items:center; border-radius:8px; padding:5px 8px; font-size:11px; font-weight:700; }
.spk-notary-note { grid-column:1 / -1; margin:0; color:var(--text-secondary); font-size:12px; line-height:1.45; }
.notary-status-menunggu-diproses,.notary-status-diproses,.notary-status-proses-notaris { background:var(--status-warning-bg,#fff4d9); color:var(--status-warning-text,#91630d); }
.notary-status-penandatanganan-notaris { background:var(--surface-muted,#eef0ed); color:var(--text-primary,#445044); }
.notary-status-selesai { background:var(--status-success-bg,#e8f4e7); color:var(--status-success-text,#2e6b36); }
.spk-person { display:flex; align-items:center; gap:10px; margin:14px 0; }
.spk-avatar { display:grid; place-items:center; width:40px; height:40px; flex:0 0 40px; border-radius:var(--radius-control); background:var(--green-50); color:var(--poliland-green); font-size:18px; }
.spk-person-info { display:grid; gap:3px; min-width:0; }
.spk-person-info strong { font-size:14px; overflow-wrap:anywhere; }
.spk-person-info span { color:var(--text-secondary); font-size:12px; }
.spk-card-meta { display:grid; border-top:1px solid var(--border-default); }
.spk-card-meta div { display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:baseline; gap:2px 12px; min-width:0; padding:10px 0; }
.spk-card-meta div + div { border-top:1px solid var(--border-default); }
.spk-card-meta span { grid-column:1; grid-row:1; color:var(--text-secondary); font-size:12px; }
.spk-card-meta strong { grid-column:2; grid-row:1; text-align:right; overflow-wrap:anywhere; font-size:13px; }
.spk-card-meta div:last-child strong { color:var(--poliland-green); font-family:var(--font-display); font-size:18px; font-weight:650; font-variant-numeric:tabular-nums; }
.spk-card-meta small { grid-column:2; grid-row:2; text-align:right; color:var(--text-secondary); font-size:12px; }
.spk-reuse-picker,.spk-reuse-info { display:grid; gap:8px; border:1px solid #dce8d7; border-radius:11px; background:#f1f7ee; color:#355a2c; padding:11px; font-size:11px; line-height:1.5; }
.spk-reuse-picker select { width:100%; border:1px solid #d9e2d5; border-radius:9px; background:#fff; padding:10px; color:#263329; }
.spk-reuse-picker p,.spk-reuse-success,.spk-reuse-muted { margin:0; font-size:11px; line-height:1.5; }
.spk-reuse-success { color:#355a2c; font-weight:700; }
.spk-reuse-muted { color:#80621e; }
.spk-rejection-preview { border-radius:var(--radius-control); background:var(--danger-bg); color:var(--danger-text); padding:10px; font-size:12px; line-height:1.5; }
.spk-card-actions { display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin-top:4px; padding-top:12px; border-top:1px solid var(--border-default); }
.spk-card-actions button { display:inline-flex; min-height:44px; align-items:center; justify-content:center; gap:4px; border-radius:var(--radius-control); padding:0 14px; font-family:inherit; font-size:13px; font-weight:700; cursor:pointer; }
.spk-detail-btn { flex:1; border:0; background:var(--green-50); color:var(--poliland-green); }
.spk-reason-btn { border:1px solid var(--border-default); background:var(--surface-primary); color:var(--text-primary); }
.spk-state { display:grid; justify-items:center; gap:9px; padding:48px 18px; text-align:center; color:var(--text-secondary); font-size:13px; }
.spk-state>ion-icon { font-size:27px; }
.spk-state strong { color:var(--text-primary,#374338); font-size:13px; }
.spk-state p { max-width:320px; margin:0; line-height:1.5; }
.spk-error { color:var(--status-danger-text,#a63e38); }
.spk-retry-btn { min-height:44px; border:0; border-radius:var(--radius-control); background:var(--poliland-green); color:#fff; padding:0 16px; font:inherit; font-weight:700; }
.spk-detail { display:grid; gap:16px; color:var(--text-primary,#263329); }
.spk-detail-close { grid-column:1 / -1; }
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
.spk-reupload-alert p, .spk-reupload-section p { margin:0; line-height:1.5; font-size:12px; }
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

.spk-reason-dialog { display:grid; justify-items:center; gap:12px; padding:4px 0; text-align:center; color:var(--text-primary,#263329); }
.spk-reason-icon { display:grid; place-items:center; width:48px; height:48px; border-radius:15px; background:var(--status-danger-bg,#fcebea); color:var(--status-danger-text,#a63e38); font-size:22px; }
.spk-reason-text { margin:0; color:var(--text-secondary,#737d72); font-size:11px; line-height:1.55; }
.spk-reason-number { margin:0; color:var(--poliland-green); font-size:11px; font-weight:800; }
@media (min-width:700px) { .spk-shell { padding:32px 28px 60px; } .spk-stats { gap:13px; } .spk-stat { padding:17px; } .spk-card { padding:19px; }}
@media (max-width:390px) { .spk-stats { gap:6px; } .spk-stat { padding:10px 8px; } .spk-stat strong { font-size:20px; } .spk-create-fab { right:calc(14px + var(--safe-right)); bottom:calc(84px + var(--safe-bottom)); }}

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
}</style>
