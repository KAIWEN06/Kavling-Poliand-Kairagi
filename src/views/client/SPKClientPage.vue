<script setup lang="ts">
import AppNotice from '@/components/ui/AppNotice.vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import {
  IonContent,
  IonIcon,
  IonPage,
  useIonRouter,
} from '@ionic/vue'
import {
  cardOutline,
  cashOutline,
  callOutline,
  cloudUploadOutline,
  copyOutline,
  documentTextOutline,
  informationCircleOutline,
  locationOutline,
  mailOutline,
  mapOutline,
  peopleOutline,
  personOutline,
  walletOutline,
  checkmarkOutline,
} from 'ionicons/icons'
import { useRoute } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import PageBackButton from '@/components/ui/PageBackButton.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import { authService } from '@/services/auth/authService'
import {
  createClientSpk,
  getAvailableClientSpkBookingFees,
  getClientSpkErrorMessage,
  type AvailableBookingFeeReuse,
} from '@/services/clientSpkService'
import { lotService, type LotRecord } from '@/services/lotService'
import { supabase } from '@/services/config/supabase'
import { DEFAULT_SPK_BOOKING_FEE } from '@/services/Finance/paymentService'
import InstallmentDpChoice from '@/components/spk/InstallmentDpChoice.vue'
import SpkOrderTerms from '@/components/spk/SpkOrderTerms.vue'
import IdentityFields from '@/components/identity/IdentityFields.vue'
import { useMyIdentityForm } from '@/composables/useMyIdentityForm'

type DocumentKey = 'ktp' | 'kk' | 'npwp' | 'paymentProof'

const route = useRoute()
const ionRouter = useIonRouter()
const lot = ref<LotRecord | null>(null)
const lotLoading = ref(true)
const lotError = ref('')
const paymentPlans = ref<Awaited<ReturnType<typeof lotService.getLotInstallments>>>([])
const paymentPlansLoading = ref(false)
const paymentPlansError = ref('')
const paymentScheme = ref<'Cash' | 'Installment' | ''>('')
const paymentMethod = ref<'Transfer Bank'>('Transfer Bank')
const selectedPlanId = ref<number | null>(null)
const downPaymentInput = ref('')
/** false = langsung cicil tanpa DP (bawaan), true = pakai DP. */
const useDownPayment = ref(false)
const downPaymentManual = ref(false)
const downPaymentPreset = ref<number | null>(null)
const customDpPercent = ref(30)
const accountCopied = ref(false)
const documentError = ref('')
const saveError = ref('')
const saving = ref(false)
const submissionComplete = ref(false)
const termsAccepted = ref(false)
const identityForm = useMyIdentityForm()
const { identity, available: identityAvailable, loading: identityLoading, loadError: identityLoadError, problem: identityProblem } = identityForm
const availableBookingFees = ref<AvailableBookingFeeReuse[]>([])
const bookingFeesLoading = ref(false)
const bookingFeesError = ref('')
const selectedReusePaymentId = ref<number | null>(null)
const selectedReusePayment = computed(() =>
  availableBookingFees.value.find((item) => item.paymentId === selectedReusePaymentId.value) ?? null,
)

watch(selectedReusePaymentId, (paymentId) => {
  if (paymentId) documents.paymentProof = null
})

const form = reactive({
  fullName: '',
  phone: '',
  whatsappPhone: '',
  email: '',
  address: '',
})

const documents = reactive<Record<DocumentKey, File | null>>({
  ktp: null,
  kk: null,
  npwp: null,
  paymentProof: null,
})

const documentFields: Array<{
  key: DocumentKey
  label: string
  icon: typeof documentTextOutline
  required: boolean
}> = [
  { key: 'ktp', label: 'KTP', icon: cardOutline, required: true },
  { key: 'kk', label: 'KK', icon: peopleOutline, required: true },
  { key: 'npwp', label: 'NPWP', icon: documentTextOutline, required: false },
  {
    key: 'paymentProof',
    label: 'Bukti Pembayaran',
    icon: walletOutline,
    required: true,
  },
]

const availablePaymentPlans = computed(() =>
  paymentPlans.value
    .filter((plan) => plan.months > 0 && plan.months <= 24)
    .sort((left, right) => left.months - right.months),
)

const selectedPlan = computed(() =>
  availablePaymentPlans.value.find((plan) => plan.id === selectedPlanId.value) ?? null,
)

const downPaymentAmount = computed(() => {
  if (!useDownPayment.value) return 0
  const value = Number(downPaymentInput.value.replace(/\D/g, ''))
  return Number.isSafeInteger(value) ? value : 0
})

// Hanya berlaku saat memilih Pakai DP; langsung cicil selalu valid.
const downPaymentInvalid = computed(() =>
  useDownPayment.value
  && (downPaymentAmount.value <= 0 || (lotPrice.value !== null && downPaymentAmount.value >= lotPrice.value)),
)

const installmentEstimate = computed(() => {
  const price = lotPrice.value
  const plan = selectedPlan.value
  const downPayment = downPaymentAmount.value
  if (!price || !plan || downPaymentInvalid.value || downPayment >= price) return null

  const principal = price - downPayment
  const marginPercent = Math.max(0, Number(plan.margin_percent) || 0)
  const installmentTotal = Math.round(principal * (1 + marginPercent / 100))
  const monthlyPayment = Math.floor(installmentTotal / plan.months)

  return {
    principal,
    marginPercent,
    installmentTotal,
    monthlyPayment,
    lastPayment: installmentTotal - monthlyPayment * (plan.months - 1),
  }
})

// Pembayaran saat pengajuan selalu Booking Fee, bukan harga penuh atau DP.
const transferAmount = computed(() => DEFAULT_SPK_BOOKING_FEE)

const showTransferAccount = computed(() =>
  paymentScheme.value !== ''
  && paymentMethod.value === 'Transfer Bank'
  && !selectedReusePaymentId.value,
)

const lotPrice = computed(() => {
  if (!lot.value) return null

  const promoPrice = Number(lot.value.promo_price)
  const cashPrice = Number(lot.value.cash_price)
  const hasPromo = promoPrice > 0 && (cashPrice <= 0 || promoPrice < cashPrice)
  const price = hasPromo ? promoPrice : cashPrice

  return Number.isFinite(price) && price > 0 ? price : null
})

const lotName = computed(() =>
  lot.value ? `${getBlockLabel(lot.value)} - No. ${lot.value.lot_number}` : '',
)

const lotAvailable = computed(() => {
  const status = lot.value?.status?.trim().toLocaleLowerCase('id-ID')
  return status === 'available' || status === 'tersedia'
})

function getRouteLotId() {
  const queryValue = route.query.lot_id
  const id = Number(Array.isArray(queryValue) ? queryValue[0] : queryValue)
  return Number.isInteger(id) && id > 0 ? id : null
}

function getBlockLabel(record: LotRecord) {
  const blockValues = [record.block?.code, record.block?.name]

  for (const value of blockValues) {
    if (typeof value === 'string' && value.trim()) {
      const label = value.trim()
      return /^blok\b/i.test(label) ? label : `Blok ${label}`
    }
  }

  const lotPrefix = record.lot_number.match(/^\s*([a-z]+)/i)?.[1]
  if (lotPrefix) return `Blok ${lotPrefix.toLocaleUpperCase('id-ID')}`

  return record.block_id == null ? 'Blok lainnya' : `Blok ${record.block_id}`
}

function formatCurrency(value: number | string | null | undefined) {
  const amount = Number(value)
  if (!Number.isFinite(amount) || amount <= 0) return 'Harga belum tersedia'

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function getTenorLabel(months: number) {
  if (months > 0 && months % 12 === 0) {
    return `(${months / 12} Tahun)`
  }

  return `(${months} Bulan)`
}

async function loadPaymentPlans(lotId: number) {
  paymentPlansLoading.value = true
  paymentPlansError.value = ''

  try {
    paymentPlans.value = await lotService.getLotInstallments(lotId)
  } catch (error) {
    console.error('[SPK Klien] Gagal memuat skema pembayaran:', error)
    paymentPlansError.value =
      error instanceof Error ? error.message : 'Skema pembayaran gagal dimuat.'
  } finally {
    paymentPlansLoading.value = false
  }
}

async function loadLot() {
  const lotId = getRouteLotId()
  if (!lotId) {
    lotError.value = 'Nomor kaveling tidak valid. Silakan pilih kaveling kembali.'
    lotLoading.value = false
    return
  }

  try {
    lot.value = await lotService.getLotById(lotId)
    if (!lotAvailable.value) {
      lotError.value = 'Kaveling ini sudah tidak tersedia untuk pengajuan.'
      return
    }

    await loadPaymentPlans(lotId)
  } catch (error) {
    console.error('[SPK Klien] Gagal memuat data kaveling:', error)
    lotError.value =
      error instanceof Error ? error.message : 'Data kaveling gagal dimuat.'
  } finally {
    lotLoading.value = false
  }
}

async function loadBuyerProfile() {
  try {
    const user = await authService.getCurrentUser()
    if (!user) return

    const metadata = user.user_metadata ?? {}
    const firstText = (...values: unknown[]) =>
      values.find((value): value is string => typeof value === 'string' && value.trim().length > 0)?.trim() ?? ''

    // Registration stores name and phone in Supabase Auth user metadata.
    // Fill only empty controls so a user's edits are never overwritten.
    form.fullName ||= firstText(metadata.full_name, metadata.name)
    form.phone ||= firstText(metadata.phone, metadata.whatsapp_phone, metadata.phone_number, user.phone)
    form.whatsappPhone ||= firstText(metadata.whatsapp_phone, metadata.whatsapp)
    form.email ||= firstText(user.email)
    form.address ||= firstText(metadata.address)

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .select('full_name, phone, whatsapp_phone, email, address')
      .eq('user_id', user.id)
      .maybeSingle()
    if (customerError) throw customerError
    if (customer) {
      form.fullName = customer.full_name || form.fullName
      form.phone = customer.phone || customer.whatsapp_phone || form.phone
      form.whatsappPhone = customer.whatsapp_phone || customer.phone || ''
      form.email = customer.email || user.email || ''
      form.address = customer.address || ''
    }
  } catch (error) {
    // Profile prefill is optional; missing metadata should leave fields editable and blank.
    console.warn('[SPK Klien] Data profil pembeli tidak dapat dimuat untuk pengisian otomatis.', error)
  }
}

function selectPaymentScheme(value: 'Cash' | 'Installment') {
  paymentScheme.value = value
  if (value === 'Cash') {
    selectedPlanId.value = null
    setUseDownPayment(false)
  }
}

function setUseDownPayment(value: boolean) {
  useDownPayment.value = value
  if (!value) {
    downPaymentInput.value = ''
    downPaymentManual.value = false
    downPaymentPreset.value = null
  }
}

function setDownPaymentPreset(percent: 10 | 20 | 30) {
  const price = lotPrice.value
  if (!price) return

  if (percent === 30 && downPaymentManual.value) {
    downPaymentPreset.value = 30
    return
  }

  downPaymentManual.value = false
  downPaymentPreset.value = percent
  if (percent === 30) customDpPercent.value = 30
  downPaymentInput.value = String(Math.round(price * percent / 100))
}

function handleDownPaymentInput(event: Event) {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return

  const digitsOnly = input.value.replace(/\D/g, '')
  downPaymentInput.value = digitsOnly
  input.value = digitsOnly
  downPaymentManual.value = true
  downPaymentPreset.value = 30

  const price = lotPrice.value
  const amount = Number(digitsOnly)
  if (price && Number.isSafeInteger(amount) && amount > 0) {
    customDpPercent.value = Math.round(amount / price * 100)
  } else {
    customDpPercent.value = 30
  }
}

async function copyBankAccount() {
  const accountNumber = '021-8899-234'
  try {
    await navigator.clipboard.writeText(accountNumber)
    accountCopied.value = true
    window.setTimeout(() => {
      accountCopied.value = false
    }, 1800)
  } catch (error) {
    console.error('[SPK Klien] Gagal menyalin nomor rekening:', error)
    saveError.value = 'Nomor rekening belum dapat disalin. Silakan salin secara manual.'
  }
}

async function loadBookingFeesWithTimeout() {
  let timeoutId: number | undefined
  try {
    return await Promise.race([
      getAvailableClientSpkBookingFees(),
      new Promise<never>((_, reject) => {
        timeoutId = window.setTimeout(
          () => reject(new Error('Pemeriksaan Booking Fee melewati batas waktu. Periksa koneksi lalu muat ulang halaman.')),
          15000,
        )
      }),
    ])
  } finally {
    if (timeoutId !== undefined) window.clearTimeout(timeoutId)
  }
}

async function loadAvailableBookingFees() {
  bookingFeesLoading.value = true
  bookingFeesError.value = ''
  try {
    availableBookingFees.value = await getAvailableClientSpkBookingFees()
  } catch (error) {
    console.error('[SPK Klien] Gagal memuat Booking Fee reusable:', error)
    bookingFeesError.value = getClientSpkErrorMessage(
      error,
      'Tanda jadi sebelumnya gagal dimuat.',
    )
  } finally {
    bookingFeesLoading.value = false
  }
}

function goToLots() {
  ionRouter.replace('/client/kavling')
}

function updateDocument(key: DocumentKey, event: Event) {
  const input = event.target
  if (!(input instanceof HTMLInputElement)) return

  const file = input.files?.[0] ?? null
  if (file && file.size > 5 * 1024 * 1024) {
    documentError.value = `${file.name} melebihi batas ukuran 5 MB.`
    input.value = ''
    documents[key] = null
    return
  }

  documents[key] = file
  documentError.value = ''
}

async function saveSpk() {
  if (saving.value) return
  saveError.value = ''

  if (!lot.value) {
    saveError.value = 'Data kaveling belum tersedia. Silakan pilih kaveling kembali.'
    return
  }

  const scheme = paymentScheme.value
  const method = paymentMethod.value
  if (!form.fullName || !form.phone || !form.address || !scheme
    || !documents.ktp || !documents.kk
    || (!selectedReusePaymentId.value && !documents.paymentProof)) {
    saveError.value =
      'Lengkapi nama, nomor kontak, alamat, pembayaran, KTP, KK, serta bukti pembayaran jika tidak menggunakan tanda jadi sebelumnya.'
    return
  }

  if (method !== 'Transfer Bank') {
    saveError.value = 'Tanda jadi saat ini hanya dapat dibayar melalui Transfer Bank.'
    return
  }

  if (identityProblem.value) {
    saveError.value = identityProblem.value
    return
  }

  if (!termsAccepted.value) {
    saveError.value = 'Baca ketentuan pemesanan, lalu centang pernyataannya sebelum menyimpan SPK.'
    return
  }

  if (lotPrice.value === null) {
    saveError.value = 'Harga kaveling belum tersedia untuk menghitung pembayaran.'
    return
  }

  if (scheme === 'Installment') {
    if (downPaymentInvalid.value) {
      saveError.value = 'Isi nominal uang muka yang lebih kecil dari harga kaveling, atau pilih Langsung cicil.'
      return
    }
    if (!selectedPlan.value || !installmentEstimate.value) {
      saveError.value = 'Pilih tenor cicilan yang tersedia sebelum menyimpan SPK.'
      return
    }
  }

  saving.value = true
  try {
    await identityForm.save()
    await createClientSpk({
      lot: {
        id: lot.value.id,
        price: lotPrice.value,
      },
      buyer: {
        fullName: form.fullName,
        phone: form.phone,
        whatsappPhone: form.whatsappPhone,
        email: form.email,
        address: form.address,
      },
      payment: {
        scheme,
        method,
        planId: selectedPlan.value?.plan_id ?? null,
        tenorMonths: selectedPlan.value?.months ?? null,
        monthlyPayment: installmentEstimate.value?.monthlyPayment ?? null,
        downPaymentAmount: scheme === 'Installment' ? downPaymentAmount.value : 0,
      },
      documents,
      reuseBookingPaymentId: selectedReusePaymentId.value,
    })
    submissionComplete.value = true
  } catch (error) {
    console.error('[SPK Klien] Gagal menyimpan SPK ke Supabase:', error)
    saveError.value = getClientSpkErrorMessage(
      error,
      'SPK gagal disimpan ke Supabase. Silakan coba kembali.',
    )
  } finally {
    saving.value = false
  }
}

onMounted(() => {
  void loadLot()
  void loadBuyerProfile()
  void identityForm.load()
  void loadAvailableBookingFees()
})
</script>

<template>
  <ion-page class="client-spk-page">
    <AppHeader variant="client" />

    <ion-content class="client-spk-content" :fullscreen="true">
      <main class="spk-shell">
        <PageBackButton fallback="/client/kavling" label="Kaveling" />
        <header class="spk-page-heading">
          <div>
            <span class="spk-eyebrow">PENGAJUAN PEMBELIAN</span>
            <h1>{{ submissionComplete ? 'SPK Berhasil Dikirim' : 'Formulir Pembuatan SPK' }}</h1>
            <p>
              {{ submissionComplete
                ? 'Pengajuan Anda tersimpan dan menunggu pemeriksaan admin.'
                : 'Lengkapi data pembeli, pembayaran, dan dokumen pendukung.' }}
            </p>
          </div>
        </header>

        <div v-if="lotLoading" class="spk-state" role="status">
          Memuat data kaveling...
        </div>

        <section v-else-if="lotError" class="spk-state spk-error" role="alert">
          <strong>Formulir belum dapat dibuka</strong>
          <p>{{ lotError }}</p>
          <button type="button" @click="goToLots">
            Kembali
          </button>
        </section>

        <section v-else-if="submissionComplete" class="spk-state spk-success" role="status">
          <span class="spk-success-icon">
            <ion-icon :icon="documentTextOutline" aria-hidden="true" />
          </span>
          <strong>Pengajuan SPK sudah dikirim ke admin.</strong>
          <p>Admin akan memeriksa data dan dokumen yang Anda kirim.</p>
          <button type="button" @click="goToLots">Kembali</button>
        </section>

        <template v-else-if="lot">
          <section class="spk-card" aria-labelledby="buyer-title">
            <div class="spk-card-heading">
              <span class="spk-heading-icon">
                <ion-icon :icon="personOutline" aria-hidden="true" />
              </span>
              <h2 id="buyer-title">Informasi Pembeli</h2>
            </div>

            <div class="spk-card-body buyer-fields">
              <div class="spk-field">
                <label for="spk-full-name">Nama Lengkap <span>*</span></label>
                <div class="spk-input-wrap">
                  <ion-icon :icon="personOutline" aria-hidden="true" />
                  <input
                    id="spk-full-name"
                    v-model.trim="form.fullName" data-input="name"
                    type="text"
                    autocomplete="name"
                    placeholder="Masukkan nama lengkap"
                  />
                </div>
              </div>

              <div class="spk-field">
                <label for="spk-phone">Nomor Kontak <span>*</span></label>
                <div class="spk-input-wrap">
                  <ion-icon :icon="callOutline" aria-hidden="true" />
                  <input
                    id="spk-phone"
                    v-model.trim="form.phone"
                    type="tel"
                    inputmode="tel"
                    autocomplete="tel"
                    placeholder="Contoh: 0823 4735 8236"
                  />
                </div>
              </div>

              <div class="spk-field">
                <label for="spk-whatsapp">Nomor WhatsApp <small>(Opsional)</small></label>
                <div class="spk-input-wrap">
                  <ion-icon :icon="callOutline" aria-hidden="true" />
                  <input
                    id="spk-whatsapp"
                    v-model.trim="form.whatsappPhone"
                    type="tel"
                    inputmode="tel"
                    autocomplete="tel-national"
                    placeholder="Contoh: 0812 3456 7890"
                  />
                </div>
              </div>

              <div class="spk-field">
                <label for="spk-email">Email <small>(Opsional)</small></label>
                <div class="spk-input-wrap">
                  <ion-icon :icon="mailOutline" aria-hidden="true" />
                  <input
                    id="spk-email"
                    v-model.trim="form.email"
                    type="email"
                    autocomplete="email"
                    placeholder="contoh@email.com"
                  />
                </div>
              </div>

              <div class="spk-field">
                <div class="spk-label-row">
                  <label for="spk-address">Alamat Lengkap <span>*</span></label>
                  <small>{{ form.address.length }}/200</small>
                </div>
                <div class="spk-input-wrap spk-textarea-wrap">
                  <ion-icon :icon="locationOutline" aria-hidden="true" />
                  <textarea
                    id="spk-address"
                    v-model.trim="form.address"
                    maxlength="200"
                    rows="3"
                    autocomplete="street-address"
                    placeholder="Masukkan alamat lengkap"
                  ></textarea>
                </div>
              </div>

              <template v-if="identityAvailable">
                <p v-if="identityLoading" role="status">Memuat data identitas...</p>
                <AppNotice v-else-if="identityLoadError" tone="error">
                  {{ identityLoadError }}
                </AppNotice>
                <IdentityFields v-else v-model="identity" />
              </template>
            </div>
          </section>

          <section class="spk-card" aria-labelledby="lot-title">
            <div class="spk-card-heading">
              <span class="spk-heading-icon">
                <ion-icon :icon="mapOutline" aria-hidden="true" />
              </span>
              <h2 id="lot-title">Informasi Kaveling</h2>
            </div>

            <div class="spk-card-body lot-form-body">
              <div class="spk-field">
                <label for="spk-lot-price">Harga Kaveling <span>*</span></label>
                <div class="spk-input-wrap spk-readonly-field">
                  <ion-icon :icon="cashOutline" aria-hidden="true" />
                  <input
                    id="spk-lot-price"
                    :value="formatCurrency(lotPrice)"
                    readonly
                    aria-readonly="true"
                  />
                </div>
              </div>

              <div class="spk-lot-summary">
                <span class="spk-lot-summary-icon">
                  <ion-icon :icon="locationOutline" aria-hidden="true" />
                </span>
                <div>
                  <strong>{{ lotName }}</strong>
                  <span>
                    {{ lot.area ? `${Number(lot.area).toLocaleString('id-ID')} m²` : 'Luas belum tersedia' }}
                    <template v-if="lot.dimension"> · {{ lot.dimension }}</template>
                  </span>
                </div>
                <span class="spk-lot-status">Tersedia</span>
              </div>

            </div>
          </section>

          <section class="spk-card" aria-labelledby="payment-confirmation-title">
            <div class="spk-card-heading spk-payment-heading">
              <span class="spk-heading-icon">
                <ion-icon :icon="walletOutline" aria-hidden="true" />
              </span>
              <div>
                <h2 id="payment-confirmation-title">Konfirmasi Pembayaran</h2>
                <p>Pilih skema pembelian. Pembayaran saat pengajuan adalah tanda jadi.</p>
              </div>
            </div>

            <div class="spk-card-body spk-payment-body">
              <div class="spk-scheme-options" role="group" aria-label="Pilih cara pembayaran">
                <button
                  type="button"
                  :class="{ selected: paymentScheme === 'Cash' }"
                  :aria-pressed="paymentScheme === 'Cash'"
                  @click="selectPaymentScheme('Cash')"
                >
                  <span class="scheme-radio" aria-hidden="true"></span>
                  Bayar Penuh
                </button>
                <button
                  type="button"
                  :class="{ selected: paymentScheme === 'Installment' }"
                  :aria-pressed="paymentScheme === 'Installment'"
                  @click="selectPaymentScheme('Installment')"
                >
                  <span class="scheme-radio" aria-hidden="true"></span>
                  Cicilan
                </button>
              </div>

              <div class="spk-field spk-payment-method-field">
                <label>Metode Pembayaran</label>
                <div class="spk-input-wrap">
                  <ion-icon :icon="walletOutline" aria-hidden="true" />
                  <span>Transfer Bank</span>
                </div>
              </div>

              <p class="spk-payment-note">
                Perhitungan dilakukan untuk kaveling {{ lot?.lot_number || 'ini' }}.
              </p>

              <div v-if="paymentScheme === 'Cash'" class="spk-payment-lot-card">
                <div class="spk-payment-lot-title">
                  <strong>{{ lot?.lot_number }} · {{ formatCurrency(lotPrice) }}</strong>
                  <span>Pelunasan setelah SPK disetujui</span>
                </div>
                <div class="spk-payment-summary-line">
                  <span>Total harga kaveling</span>
                  <strong>{{ formatCurrency(lotPrice) }}</strong>
                </div>
              </div>

              <div v-if="paymentScheme === 'Installment'" class="spk-payment-lot-card">
                <div class="spk-payment-lot-title">
                  <strong>{{ lot?.lot_number }} · {{ formatCurrency(lotPrice) }}</strong>
                  <span>Cicilan</span>
                </div>

                <InstallmentDpChoice
                  :model-value="useDownPayment"
                  name="client-dp-mode"
                  @update:model-value="setUseDownPayment"
                />

                <template v-if="useDownPayment">
                <label class="spk-dp-label" for="spk-down-payment">Nominal uang muka</label>
                <div class="spk-dp-input-wrap">
                  <span>Rp</span>
                  <input
                    id="spk-down-payment"
                    :value="downPaymentInput"
                    type="text"
                    inputmode="numeric"
                    autocomplete="off"
                    placeholder="Masukkan nominal uang muka"
                    aria-describedby="spk-dp-help"
                    @input="handleDownPaymentInput"
                  />
                </div>
                <small id="spk-dp-help" class="spk-dp-help">
                  Anda dapat memilih persentase atau memasukkan nominal sendiri.
                </small>

                <div class="spk-dp-presets" role="group" aria-label="Persentase uang muka">
                  <button
                    type="button"
                    :class="{ selected: downPaymentPreset === 10 && !downPaymentManual }"
                    :aria-pressed="downPaymentPreset === 10 && !downPaymentManual"
                    @click="setDownPaymentPreset(10)"
                  >10%</button>
                  <button
                    type="button"
                    :class="{ selected: downPaymentPreset === 20 && !downPaymentManual }"
                    :aria-pressed="downPaymentPreset === 20 && !downPaymentManual"
                    @click="setDownPaymentPreset(20)"
                  >20%</button>
                  <button
                    type="button"
                    :class="{ selected: downPaymentPreset === 30 }"
                    :aria-pressed="downPaymentPreset === 30"
                    @click="setDownPaymentPreset(30)"
                  >{{ downPaymentManual && downPaymentAmount > 0 ? customDpPercent : 30 }}%</button>
                </div>

                <p
                  v-if="lotPrice !== null && downPaymentAmount >= lotPrice && downPaymentAmount > 0"
                  class="spk-inline-error spk-dp-error"
                  role="alert"
                >
                  Uang muka harus lebih kecil dari harga kaveling agar masih ada sisa cicilan.
                </p>
                <p v-else-if="downPaymentAmount <= 0" class="spk-dp-help">
                  Isi nominal uang muka untuk melihat tenor, atau pilih Langsung cicil.
                </p>
                </template>

                <div
                  v-if="lotPrice !== null && !downPaymentInvalid"
                  class="spk-tenor-field"
                >
                  <label>Tenor cicilan <span>*</span></label>
                  <div v-if="paymentPlansLoading" class="spk-plan-message" role="status">
                    Memuat pilihan tenor...
                  </div>
                  <AppNotice v-else-if="paymentPlansError" tone="error">
                    {{ paymentPlansError }}
                    <button type="button" @click="lot && loadPaymentPlans(lot.id)">
                      Coba lagi
                    </button>
                  </AppNotice>
                  <div v-else-if="availablePaymentPlans.length" class="spk-tenor-options">
                    <button
                      v-for="plan in availablePaymentPlans"
                      :key="plan.id"
                      type="button"
                      :class="{ selected: selectedPlanId === plan.id }"
                      :aria-pressed="selectedPlanId === plan.id"
                      @click="selectedPlanId = plan.id"
                    >
                      <span class="tenor-radio" aria-hidden="true"></span>
                      <span>
                        <strong>{{ plan.months }} Bulan</strong>
                        <small>{{ getTenorLabel(plan.months) }}</small>
                      </span>
                    </button>
                  </div>
                  <p v-else class="spk-plan-message">
                    Skema cicilan hingga 2 tahun belum tersedia untuk kaveling ini.
                  </p>
                </div>

                <div v-if="installmentEstimate && selectedPlan" class="spk-installment-estimate">
                  <span>Uang muka</span>
                  <strong>{{ downPaymentAmount > 0 ? formatCurrency(downPaymentAmount) : 'Tanpa uang muka' }}</strong>
                  <span>{{ downPaymentAmount > 0 ? 'Sisa harga setelah uang muka' : 'Harga yang dicicil' }}</span>
                  <strong>{{ formatCurrency(installmentEstimate.principal) }}</strong>
                  <span>Estimasi cicilan {{ selectedPlan.months }} bulan</span>
                  <strong>{{ formatCurrency(installmentEstimate.monthlyPayment) }} / bulan</strong>
                  <small>Angsuran terakhir {{ formatCurrency(installmentEstimate.lastPayment) }}</small>
                </div>
              </div>

              <section v-if="showTransferAccount" class="spk-transfer-card" aria-labelledby="transfer-account-title">
                <div class="spk-transfer-heading">
                  <h3 id="transfer-account-title">Rekening Tujuan Transfer</h3>
                  <span>Resmi Pengembang</span>
                </div>

                <div class="spk-bank-card">
                  <div class="spk-bank-name-row">
                    <span class="spk-bank-mark">BCA</span>
                    <div>
                      <strong>Bank BCA (Rekening Utama)</strong>
                      <span>a/n PT PoliLand Kairagi</span>
                    </div>
                  </div>
                  <div class="spk-account-number-row">
                    <strong>021-8899-234</strong>
                    <button type="button" @click="copyBankAccount">
                      <ion-icon :icon="accountCopied ? checkmarkOutline : copyOutline" aria-hidden="true" />
                      {{ accountCopied ? 'Tersalin' : 'Salin' }}
                    </button>
                  </div>
                </div>

                <div class="spk-transfer-breakdown">
                  <div>
                    <span>Tanda jadi (wajib saat pengajuan SPK)</span>
                    <strong>{{ formatCurrency(transferAmount) }}</strong>
                  </div>
                  <div class="spk-transfer-total">
                    <span>Total Wajib Ditransfer Sekarang</span>
                    <strong>{{ formatCurrency(transferAmount) }}</strong>
                  </div>
                  <small>Tanda jadi terpisah dari uang muka. Uang muka atau pelunasan dilakukan setelah SPK disetujui.</small>
                </div>
              </section>
            </div>
          </section>

          <section
            v-if="availableBookingFees.length || bookingFeesLoading || bookingFeesError"
            class="spk-card"
            aria-labelledby="reuse-title"
          >
            <div class="spk-card-heading">
              <span class="spk-heading-icon">
                <ion-icon :icon="walletOutline" aria-hidden="true" />
              </span>
              <div>
                <h2 id="reuse-title">Tanda jadi sebelumnya</h2>
                <p>Gunakan pembayaran yang sudah dikonfirmasi bagian Keuangan tanpa transfer atau verifikasi ulang.</p>
              </div>
            </div>

            <div class="spk-card-body">
              <p v-if="bookingFeesLoading" class="spk-upload-note" role="status">
                Memeriksa pembayaran yang tersedia...
              </p>
              <AppNotice v-if="bookingFeesError" tone="error">
                {{ bookingFeesError }}
              </AppNotice>

              <div
                v-for="fee in availableBookingFees"
                :key="fee.paymentId"
                class="spk-reuse-option"
              >
                <label class="spk-reuse-label">
                  <input
                    v-model="selectedReusePaymentId"
                    type="radio"
                    name="reuseBookingFee"
                    :value="fee.paymentId"
                  />
                  <span>
                    <strong>{{ formatCurrency(fee.amount) }}</strong>
                    <small>SPK {{ fee.sourceSpkNumber }} · Kaveling {{ fee.sourceLotNumber }}</small>
                    <small v-if="fee.verifiedAt">
                      Dikonfirmasi {{ new Date(fee.verifiedAt).toLocaleDateString('id-ID') }}
                    </small>
                  </span>
                </label>
              </div>

              <button
                v-if="selectedReusePaymentId"
                type="button"
                class="spk-reuse-clear"
                @click="selectedReusePaymentId = null"
              >
                Batalkan tanda jadi
              </button>

              <p v-if="selectedReusePayment" class="spk-upload-note">
                Pembayaran ini akan ditautkan ke SPK baru. Status tetap terkonfirmasi dan tidak dibuat sebagai pembayaran baru.
              </p>
            </div>
          </section>

          <section class="spk-card" aria-labelledby="documents-title">
            <div class="spk-card-heading spk-documents-heading">
              <span class="spk-heading-icon">
                <ion-icon :icon="documentTextOutline" aria-hidden="true" />
              </span>
              <div>
                <h2 id="documents-title">Dokumen Pendukung</h2>
                <p>KTP dan KK wajib. NPWP opsional. Bukti transfer tanda jadi wajib kecuali menggunakan tanda jadi sebelumnya.</p>
              </div>
            </div>

            <div class="spk-card-body">
              <p class="spk-upload-note">
                Format JPG, PNG, atau PDF. Ukuran maksimal 5 MB per file.
                Berkas asli akan diunggah ke penyimpanan privat Supabase.
              </p>
              <div class="spk-document-grid">
                <article
                  v-for="field in documentFields.filter((item) => !(item.key === 'paymentProof' && selectedReusePaymentId))"
                  :key="field.key"
                  class="spk-document-field"
                  :class="{ 'spk-document-wide': field.key === 'paymentProof' }"
                >
                  <div class="spk-document-heading">
                    <span class="spk-document-icon">
                      <ion-icon :icon="field.icon" aria-hidden="true" />
                    </span>
                    <span>
                      <strong>{{ field.label }}<em v-if="field.required">*</em></strong>
                      <small>{{ field.required ? 'Wajib' : 'Opsional' }} · Maks. 5 MB</small>
                    </span>
                  </div>
                  <label class="spk-file-picker">
                    <input
                      type="file"
                      accept=".jpg,.jpeg,.png,.pdf"
                      :required="field.key === 'paymentProof' ? !selectedReusePaymentId : field.required"
                      :aria-label="`Unggah ${field.label}`"
                      @change="updateDocument(field.key, $event)"
                    />
                    <ion-icon :icon="cloudUploadOutline" aria-hidden="true" />
                    {{ documents[field.key] ? 'Ganti File' : 'Pilih File' }}
                  </label>
                  <span v-if="documents[field.key]" class="spk-file-name">
                    {{ documents[field.key]?.name }}
                  </span>
                </article>
              </div>
              <AppNotice v-if="documentError" tone="error">
                {{ documentError }}
              </AppNotice>
            </div>
          </section>

          <SpkOrderTerms
            v-if="lot && lotAvailable && !lotLoading && !lotError && !submissionComplete"
            v-model="termsAccepted"
          />

          <AppNotice v-if="saveError" tone="error">
            {{ saveError }}
          </AppNotice>

          <div
            v-if="lot && lotAvailable && !lotLoading && !lotError && !submissionComplete"
            class="spk-action-bar"
          >
            <button
              type="button"
              class="spk-save-button"
              :disabled="saving"
              @click="saveSpk"
            >
              <ion-icon :icon="documentTextOutline" aria-hidden="true" />
              {{ saving ? 'Menyimpan SPK...' : 'Simpan SPK' }}
            </button>
          </div>
        </template>
      </main>
    </ion-content>

    <MobileTabBar variant="client" />
  </ion-page>
</template>

<style scoped>
.client-spk-page,
.client-spk-content {
  --background: var(--app-background, #faf9f6);
  color: var(--text-primary, #252525);
  font-family: var(--font-primary, var(--ion-font-family, sans-serif));
}

.spk-shell {
  display: grid;
  width: min(100%, 760px);
  gap: 16px;
  margin: 0 auto;
  padding: 18px 16px calc(106px + env(safe-area-inset-bottom, 0px));
}

.spk-page-heading {
  padding: 2px 2px 4px;
}

.spk-eyebrow {
  color: var(--poliland-gold-text-soft, #805708);
  font-size: 11px;
  font-weight: var(--font-weight-semibold, 600);
  letter-spacing: 0.08em;
}

.spk-page-heading h1 {
  margin: 5px 0 6px;
  color: var(--text-primary, #252525);
  font-size: clamp(21px, 3.8vw, 26px);
  font-weight: var(--font-weight-bold, 700);
  line-height: 1.25;
}

.spk-page-heading p {
  margin: 0;
  color: var(--text-secondary, #717178);
  font-size: 13px;
  line-height: 1.5;
}

.spk-card {
  overflow: hidden;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 14px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 3px 10px rgb(37 37 37 / 7%);
}

.spk-card-heading {
  display: flex;
  min-height: 68px;
  align-items: center;
  gap: 14px;
  padding: 12px 16px;
  background: var(--surface-muted, #fbf8f2);
}

.spk-heading-icon,
.spk-document-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  color: var(--poliland-gold-text-soft, #805708);
  background: var(--poliland-gold-soft, #f7edd5);
}

.spk-heading-icon {
  width: 48px;
  height: 48px;
}

.spk-heading-icon ion-icon {
  font-size: 24px;
}

.spk-card-heading h2 {
  margin: 0;
  color: var(--poliland-gold-text-soft, #805708);
  font-size: 17px;
  font-weight: var(--font-weight-semibold, 600);
}

.spk-documents-heading {
  align-items: flex-start;
}

.spk-documents-heading .spk-heading-icon {
  margin-top: 2px;
}

.spk-documents-heading p {
  margin: 5px 0 0;
  color: var(--text-secondary, #717178);
  font-size: 12px;
  line-height: 1.45;
}

.spk-card-body {
  display: grid;
  gap: 14px;
  padding: 16px;
}

.buyer-fields {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.spk-field {
  display: grid;
  min-width: 0;
  gap: 7px;
}

.spk-field > label,
.spk-label-row label {
  color: var(--text-primary, #252525);
  font-size: 13px;
  font-weight: var(--font-weight-semibold, 600);
}

.spk-field > label span,
.spk-label-row label span,
.spk-document-heading em {
  color: var(--status-danger, #d94b45);
  font-style: normal;
}

.spk-field > label small {
  color: var(--text-secondary, #717178);
  font-size: 12px;
  font-weight: var(--font-weight-regular, 400);
}

.spk-input-wrap {
  display: flex;
  min-width: 0;
  min-height: 48px;
  align-items: center;
  gap: 12px;
  padding: 0 13px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 2px 4px rgb(37 37 37 / 7%);
}

.spk-input-wrap:focus-within {
  border-color: var(--poliland-gold, #cba044);
  outline: 3px solid rgb(203 160 68 / 16%);
}

.spk-input-wrap > ion-icon {
  flex: 0 0 auto;
  color: var(--poliland-gold-text-soft, #a27c35);
  font-size: 21px;
}

.spk-input-wrap input,
.spk-input-wrap textarea,
.spk-input-wrap select {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--text-primary, #252525);
  background: transparent;
  font: inherit;
  font-size: 14px;
}

.spk-input-wrap input::placeholder,
.spk-input-wrap textarea::placeholder,
.spk-input-wrap select:invalid {
  color: var(--text-secondary, #8b8b8b);
  opacity: 0.8;
}

.spk-textarea-wrap {
  min-height: 92px;
  align-items: flex-start;
  padding-top: 13px;
}

.spk-textarea-wrap textarea {
  min-height: 58px;
  resize: vertical;
}

.spk-lot-summary {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 12px;
  padding: 13px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-muted, #faf9f6);
}

.spk-lot-summary-icon {
  display: grid;
  width: 40px;
  height: 40px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  color: var(--poliland-gold-text-soft, #805708);
  background: var(--poliland-gold-soft, #f7edd5);
}

.spk-lot-summary-icon ion-icon {
  font-size: 21px;
}

.spk-lot-summary > div {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.spk-lot-summary strong {
  color: var(--text-primary, #252525);
  font-size: 14px;
}

.spk-lot-summary > div > span {
  color: var(--text-secondary, #717178);
  font-size: 12px;
}

.spk-lot-status {
  flex: 0 0 auto;
  margin-left: auto;
  padding: 7px 10px;
  border-radius: 999px;
  color: var(--poliland-green, #355a2c);
  background: var(--status-success-bg, #eaf7ef);
  font-size: 11px;
  font-weight: var(--font-weight-medium, 500);
}

.spk-select-wrap select {
  min-height: 46px;
  appearance: none;
  cursor: pointer;
}

.spk-select-wrap {
  position: relative;
}

.spk-select-wrap::after {
  position: absolute;
  right: 14px;
  width: 9px;
  height: 9px;
  border-right: 2px solid var(--text-primary, #252525);
  border-bottom: 2px solid var(--text-primary, #252525);
  content: "";
  pointer-events: none;
  transform: translateY(-2px) rotate(45deg);
}

.spk-payment-body {
  gap: 16px;
}

.spk-scheme-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.spk-scheme-options button {
  display: flex;
  min-width: 0;
  min-height: 54px;
  align-items: center;
  gap: 10px;
  padding: 10px 14px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  color: var(--text-primary, #252525);
  background: var(--surface-primary, #fff);
  font: inherit;
  font-size: 14px;
  font-weight: var(--font-weight-semibold, 600);
  cursor: pointer;
}

.spk-scheme-options button.selected {
  border-color: var(--poliland-green, #355a2c);
  background: var(--status-success-bg, #eaf7ef);
}

.scheme-radio {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  border: 2px solid #a0a0a0;
  border-radius: 50%;
}

.spk-scheme-options button.selected .scheme-radio {
  border: 5px solid var(--poliland-green, #355a2c);
}

.spk-payment-note {
  margin: -4px 0 0;
  color: var(--text-secondary, #717178);
  font-size: 12px;
  line-height: 1.45;
}

.spk-payment-lot-card {
  display: grid;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: #fbfaf7;
}

.spk-payment-lot-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 12px;
  border-bottom: 1px solid var(--border-default, #eae7e0);
}

.spk-payment-lot-title strong {
  color: var(--poliland-green, #355a2c);
  font-size: 14px;
}

.spk-payment-lot-title span {
  color: var(--text-secondary, #717178);
  font-size: 12px;
  text-align: right;
}

.spk-payment-summary-line {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  color: var(--text-secondary, #717178);
  font-size: 13px;
}

.spk-payment-summary-line strong {
  color: var(--text-primary, #252525);
  text-align: right;
}

.spk-dp-label,
.spk-tenor-field > label {
  color: var(--text-primary, #252525);
  font-size: 13px;
  font-weight: var(--font-weight-semibold, 600);
}

.spk-dp-input-wrap {
  display: flex;
  min-height: 52px;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: #fff;
}

.spk-dp-input-wrap:focus-within {
  border-color: var(--poliland-green, #355a2c);
  outline: 2px solid rgb(53 90 44 / 15%);
}

.spk-dp-input-wrap > span {
  color: var(--text-secondary, #717178);
  font-size: 14px;
  font-weight: var(--font-weight-semibold, 600);
}

.spk-dp-input-wrap input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--text-primary, #252525);
  background: transparent;
  font: inherit;
  font-size: 15px;
}

.spk-dp-input-wrap input::placeholder {
  color: var(--text-secondary, #8b8b8b);
}

.spk-dp-help {
  margin-top: -8px;
  color: var(--text-secondary, #717178);
  font-size: 11px;
  line-height: 1.4;
}

.spk-dp-presets {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.spk-dp-presets button {
  min-width: 0;
  min-height: 42px;
  padding: 6px 8px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: 11px;
  color: var(--poliland-green, #355a2c);
  background: #fff;
  font: inherit;
  font-size: 13px;
  font-weight: var(--font-weight-bold, 700);
  cursor: pointer;
}

.spk-dp-presets button.selected {
  border-color: var(--poliland-green, #355a2c);
  color: #fff;
  background: var(--poliland-green, #355a2c);
}

.spk-dp-error {
  margin: -4px 0 0;
}

.spk-tenor-field {
  display: grid;
  gap: 9px;
}

.spk-installment-estimate {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 7px 12px;
  padding: 12px;
  border-radius: 10px;
  color: var(--text-secondary, #717178);
  background: #f3f5ef;
  font-size: 12px;
}

.spk-installment-estimate strong {
  color: var(--text-primary, #252525);
  text-align: right;
}

.spk-installment-estimate small {
  grid-column: 1 / -1;
  color: var(--text-secondary, #717178);
  font-size: 11px;
}

.spk-transfer-card {
  display: grid;
  gap: 16px;
  padding: 16px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 18px);
  background: #fff;
}

.spk-transfer-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}

.spk-transfer-heading h3 {
  margin: 0;
  color: var(--text-primary, #30332e);
  font-size: 17px;
  font-weight: var(--font-weight-semibold, 600);
}

.spk-transfer-heading > span {
  flex: 0 0 auto;
  padding: 6px 10px;
  border-radius: 999px;
  color: #fff;
  background: #c9a753;
  font-size: 10px;
  font-weight: var(--font-weight-semibold, 600);
}

.spk-bank-card {
  display: grid;
  gap: 14px;
  padding: 16px;
  border-radius: 18px;
  background: #f0ede5;
}

.spk-bank-name-row {
  display: flex;
  align-items: center;
  gap: 12px;
}

.spk-bank-mark {
  display: grid;
  width: 48px;
  height: 48px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  color: #c6a45d;
  background: #fff;
  font-size: 14px;
  font-weight: var(--font-weight-bold, 700);
}

.spk-bank-name-row > div {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.spk-bank-name-row strong {
  color: #30332e;
  font-size: 13px;
}

.spk-bank-name-row div > span {
  color: #656760;
  font-size: 12px;
}

.spk-account-number-row {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 12px;
  border-radius: 14px;
  background: #fff;
}

.spk-account-number-row > strong {
  color: #30332e;
  font-size: clamp(15px, 4.4vw, 19px);
  letter-spacing: 0.04em;
}

.spk-account-number-row button {
  display: inline-flex;
  min-height: 38px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 11px;
  border: 0;
  border-radius: 999px;
  color: #5e584f;
  background: #f0e8dc;
  font: inherit;
  font-size: 12px;
  font-weight: var(--font-weight-semibold, 600);
  cursor: pointer;
}

.spk-account-number-row button ion-icon {
  font-size: 16px;
}

.spk-transfer-breakdown {
  display: grid;
  gap: 12px;
  color: #5d605b;
  font-size: 12px;
}

.spk-transfer-breakdown > div {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
}

.spk-transfer-breakdown strong {
  color: #30332e;
  text-align: right;
}

.spk-transfer-total {
  align-items: center !important;
  margin-top: 2px;
  padding-top: 10px;
  border-top: 1px solid var(--border-default, #eae7e0);
  font-size: 14px;
  font-weight: var(--font-weight-semibold, 600);
}

.spk-transfer-total strong {
  color: #c6a45d;
  font-size: 20px;
  font-weight: var(--font-weight-bold, 700);
}

.spk-tenor-options {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.spk-tenor-options button {
  display: inline-flex;
  min-height: 54px;
  align-items: center;
  gap: 8px;
  padding: 7px 10px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  color: var(--text-secondary, #717178);
  background: var(--surface-primary, #fff);
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.spk-tenor-options button.selected {
  border-color: var(--poliland-gold, #cba044);
  color: var(--poliland-gold-text-soft, #805708);
  background: var(--surface-muted, #fbf8f2);
}

.tenor-radio {
  width: 17px;
  height: 17px;
  flex: 0 0 auto;
  border: 2px solid currentColor;
  border-radius: 50%;
}

.spk-tenor-options button.selected .tenor-radio {
  border: 5px solid var(--poliland-gold, #cba044);
}

.spk-tenor-options button > span:last-child {
  display: grid;
  gap: 3px;
}

.spk-tenor-options strong {
  color: var(--text-primary, #252525);
  font-size: 12px;
}

.spk-tenor-options small {
  color: var(--text-secondary, #717178);
  font-size: 10px;
}

.spk-plan-message,
.spk-monthly-estimate {
  margin: 0;
  color: var(--text-secondary, #717178);
  font-size: 12px;
  line-height: 1.45;
}

.spk-plan-message button {
  display: block;
  margin-top: 8px;
  padding: 6px 0;
  border: 0;
  color: var(--poliland-green, #355a2c);
  background: transparent;
  font: inherit;
  font-weight: var(--font-weight-semibold, 600);
}

.spk-monthly-estimate {
  color: var(--poliland-green, #355a2c);
  font-weight: var(--font-weight-medium, 500);
}

.spk-upload-note {
  margin: 0;
  color: var(--text-secondary, #717178);
  font-size: 12px;
}

.spk-document-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 10px;
}

.spk-document-field {
  display: grid;
  min-width: 0;
  gap: 10px;
  padding: 10px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-primary, #fff);
}

.spk-document-wide {
  grid-column: 1 / -1;
}

.spk-document-heading {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.spk-document-icon {
  width: 36px;
  height: 36px;
}

.spk-document-icon ion-icon {
  font-size: 18px;
}

.spk-document-heading > span:last-child {
  display: grid;
  min-width: 0;
  gap: 2px;
}

.spk-document-heading strong {
  color: var(--text-primary, #252525);
  font-size: 12px;
}

.spk-document-heading small {
  color: var(--text-secondary, #717178);
  font-size: 10px;
}

.spk-file-picker {
  position: relative;
  display: flex;
  min-height: 38px;
  align-items: center;
  justify-content: center;
  gap: 7px;
  padding: 0 8px;
  overflow: hidden;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: 9px;
  color: var(--poliland-gold-text-soft, #805708);
  background: var(--surface-primary, #fff);
  font-size: 11px;
  font-weight: var(--font-weight-medium, 500);
  cursor: pointer;
}

.spk-file-picker ion-icon {
  font-size: 17px;
}

.spk-file-picker input {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  clip-path: inset(50%);
  white-space: nowrap;
}

.spk-file-picker:focus-within {
  outline: 3px solid rgb(203 160 68 / 28%);
  outline-offset: 2px;
}

.spk-file-name {
  overflow: hidden;
  color: var(--text-secondary, #717178);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.spk-inline-error,
.spk-error-text {
  color: var(--status-danger, #d94b45);
}

.spk-state {
  display: grid;
  min-height: 180px;
  align-content: center;
  justify-items: center;
  gap: 10px;
  padding: 24px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 14px);
  color: var(--text-secondary, #717178);
  background: var(--surface-primary, #fff);
  text-align: center;
  font-size: 13px;
}

.spk-success {
  padding: 28px 20px;
}

.spk-success-icon {
  display: grid;
  width: 54px;
  height: 54px;
  place-items: center;
  border-radius: 50%;
  color: var(--poliland-green, #355a2c);
  background: var(--status-success-bg, #eaf7ef);
}

.spk-success-icon ion-icon {
  font-size: 27px;
}

.spk-state strong {
  color: var(--text-primary, #252525);
  font-size: 15px;
}

.spk-state p {
  margin: 0;
  line-height: 1.5;
}

.spk-state button {
  min-height: 40px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--radius-control, 12px);
  color: #fff;
  background: var(--poliland-green, #355a2c);
  font: inherit;
  font-weight: var(--font-weight-medium, 500);
}

.spk-action-bar {
  width: 100%;
  margin-top: 2px;
}

.spk-save-button {
  display: flex;
  width: min(100%, 760px);
  min-height: 56px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0 auto;
  border: 0;
  border-radius: var(--radius-control, 12px);
  color: #fff;
  background: var(--poliland-gold, #cba044);
  box-shadow: 0 4px 10px rgb(150 106 18 / 15%);
  font: inherit;
  font-size: 16px;
  font-weight: var(--font-weight-semibold, 600);
  cursor: pointer;
}

.spk-save-button ion-icon {
  font-size: 21px;
}

.spk-field input:focus-visible,
.spk-field textarea:focus-visible,
.spk-field select:focus-visible,
.spk-tenor-options button:focus-visible,
.spk-file-picker:focus-within,
.spk-state button:focus-visible,
.spk-save-button:focus-visible {
  outline: 3px solid rgb(53 90 44 / 30%);
  outline-offset: 2px;
}

@media (max-width: 560px) {
  .spk-shell {
    gap: 14px;
    padding: 14px 12px calc(106px + env(safe-area-inset-bottom, 0px));
  }

  .spk-card-body {
    padding: 14px;
  }

  .spk-payment-lot-card,
  .spk-transfer-card {
    padding: 13px;
  }

  .spk-bank-card {
    gap: 12px;
    padding: 12px;
  }

  .spk-transfer-heading h3 {
    font-size: 15px;
  }

  .spk-account-number-row {
    padding: 10px;
  }

  .spk-account-number-row button {
    gap: 4px;
    padding: 0 9px;
  }

  .spk-transfer-total strong {
    font-size: 17px;
  }

  .spk-document-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .spk-document-wide {
    grid-column: 1 / -1;
  }

  .spk-lot-status {
    padding: 6px 8px;
    font-size: 10px;
  }
}

@media (max-width: 720px) {
  .buyer-fields {
    grid-template-columns: 1fr;
  }
}

.spk-payment-method-field {
  margin-top: 14px;
}

.spk-reuse-option {
  margin-top: 10px;
  padding: 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-primary);
}

.spk-reuse-label {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  cursor: pointer;
}

.spk-reuse-label input {
  margin-top: 4px;
  accent-color: var(--poliland-green);
}

.spk-reuse-label span {
  display: grid;
  gap: 4px;
}

.spk-reuse-label strong {
  color: var(--text-primary);
}

.spk-reuse-label small {
  color: var(--text-secondary);
  font-size: 12px;
}

.spk-reuse-clear {
  margin-top: 12px;
  border: 0;
  background: transparent;
  color: var(--poliland-green);
  font: inherit;
  font-size: 13px;
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}
</style>
