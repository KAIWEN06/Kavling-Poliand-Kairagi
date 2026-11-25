<template>
  <MarketingPageLayout
    title="Ajukan SPK"
    subtitle="Lengkapi data, lalu kirim ke Admin."
    show-back
    back-route="/kavling"
    :refreshable="false"
  >
    <div class="spk">
      <!-- PROGRES -->
      <Reveal :order="0">
        <section class="spk-progress" aria-label="Kelengkapan pengajuan">
          <ol class="spk-steps">
            <li
              v-for="step in steps"
              :key="step.n"
              class="spk-step"
              :class="{ 'is-active': currentStep >= step.n }"
              :aria-current="currentStep === step.n ? 'step' : undefined"
            >
              <span class="spk-step-num t-num">{{ step.n }}</span>
              <span class="spk-step-label">{{ step.label }}</span>
            </li>
          </ol>
          <div class="spk-meter">
            <span class="spk-meter-track" aria-hidden="true">
              <span class="spk-meter-fill" :style="{ transform: `scaleX(${completionPercent / 100})` }" />
            </span>
            <span class="spk-meter-text t-num">{{ completionPercent }}% lengkap</span>
          </div>
        </section>
      </Reveal>

      <!-- 1. KLIEN -->
      <Reveal :order="1">
        <section class="spk-card" aria-labelledby="spk-client-title">
          <header class="spk-card-head">
            <span class="spk-card-num t-num" aria-hidden="true">1</span>
            <h2 id="spk-client-title">Klien</h2>
          </header>

          <label class="spk-field">
            <span>Pilih klien <b aria-hidden="true">*</b></span>
            <select
              v-model.number="form.customerId"
              class="spk-input"
              required
              @change="applySelectedCustomer"
            >
              <option :value="null" disabled>Klien milik Anda</option>
              <option v-for="c in myCustomers" :key="c.id" :value="c.id">
                {{ c.full_name }}{{ c.phone ? ' · ' + c.phone : '' }}
              </option>
            </select>
          </label>

          <div v-if="!myCustomers.length" class="spk-inline-note">
            <span>Belum ada klien yang bisa dipilih.</span>
            <button type="button" class="spk-link" @click="ionRouter.push('/marketing/clients/new')">
              Tambah klien
            </button>
          </div>

          <dl v-if="form.customerId" class="spk-client">
            <div>
              <dt>Nama</dt>
              <dd>{{ form.fullName || 'Belum ada' }}</dd>
            </div>
            <div>
              <dt>Kontak</dt>
              <dd class="t-num">{{ form.phone || 'Belum ada' }}</dd>
            </div>
            <div v-if="form.email">
              <dt>Email</dt>
              <dd>{{ form.email }}</dd>
            </div>
            <div class="spk-client-wide">
              <dt>Alamat</dt>
              <dd :class="{ 'is-missing': !form.address }">
                {{ form.address || 'Alamat belum diisi. Lengkapi di detail klien.' }}
              </dd>
            </div>
          </dl>
        </section>
      </Reveal>

      <!-- 2. KAVELING & PEMBAYARAN -->
      <Reveal :order="2">
        <section class="spk-card" aria-labelledby="spk-lot-title">
          <header class="spk-card-head">
            <span class="spk-card-num t-num" aria-hidden="true">2</span>
            <h2 id="spk-lot-title">Kaveling dan pembayaran</h2>
          </header>

          <div v-if="lotLoading" class="spk-state" role="status">
            <ion-spinner name="crescent" />
            <span>Memuat data kaveling…</span>
          </div>

          <div v-else-if="lotError" class="spk-state spk-state--error" role="alert">
            <ion-icon :icon="alertCircleOutline" aria-hidden="true" />
            <div>
              <strong>Data kaveling tidak tersedia</strong>
              <span>{{ lotError }}</span>
              <button type="button" class="spk-link" @click="ionRouter.push('/kavling')">
                Pilih kaveling
              </button>
            </div>
          </div>

          <div v-else class="spk-lot">
            <div class="spk-lot-main">
              <span class="spk-label">Kaveling</span>
              <strong class="spk-lot-number t-figure">
                {{ lot.lot_number ? formatLotNumber(lot.lot_number) : 'Belum dipilih' }}
              </strong>
              <span v-if="lot.block_id || lot.area || lot.dimension" class="spk-lot-meta">
                <span v-if="lot.block_id">Blok {{ lot.block_id }}</span>
                <span v-if="lot.area" class="t-num">{{ lot.area }} m²</span>
                <span v-if="lot.dimension" class="t-num">{{ lot.dimension }}</span>
              </span>
            </div>
            <div class="spk-lot-price">
              <span class="spk-label">
                {{ lot.promo_price && lot.cash_price && lot.promo_price < lot.cash_price ? 'Harga promo' : 'Harga' }}
              </span>
              <strong class="t-num">{{ formattedLotPrice }}</strong>
              <small>
                <ion-icon :icon="lockClosedOutline" aria-hidden="true" />
                Mengikuti data kaveling
              </small>
            </div>
          </div>

          <fieldset class="spk-fieldset">
            <legend>Metode pembayaran <b aria-hidden="true">*</b></legend>
            <div class="spk-choice-row">
              <button
                type="button"
                class="spk-choice"
                :aria-pressed="form.paymentMethod === 'Cash'"
                @click="selectPaymentMethod('Cash')"
              >
                <ion-icon :icon="cashOutline" aria-hidden="true" />
                <span class="spk-choice-copy">
                  <strong>Tunai</strong>
                  <small>Lunas sekali bayar</small>
                </span>
                <span class="spk-radio" aria-hidden="true" />
              </button>
              <button
                type="button"
                class="spk-choice"
                :aria-pressed="form.paymentMethod === 'Installment'"
                @click="selectPaymentMethod('Installment')"
              >
                <ion-icon :icon="cardOutline" aria-hidden="true" />
                <span class="spk-choice-copy">
                  <strong>Cicil</strong>
                  <small>Bayar per bulan</small>
                </span>
                <span class="spk-radio" aria-hidden="true" />
              </button>
            </div>
          </fieldset>

          <div v-if="form.paymentMethod === 'Installment'" class="spk-installment">
            <InstallmentDpChoice
              v-model="form.useDownPayment"
              name="marketing-dp-mode"
              @update:model-value="!$event && (form.downPayment = '')"
            />

            <label v-if="form.useDownPayment" class="spk-field">
              <span>Nominal uang muka (Rp) <b aria-hidden="true">*</b></span>
              <input
                v-model="form.downPayment"
                class="spk-input t-num"
                type="text"
                inputmode="numeric"
                autocomplete="off"
                enterkeyhint="done"
                placeholder="Contoh: 20000000"
                :aria-invalid="downPaymentInvalid || undefined"
                @input="form.downPayment = form.downPayment.replace(/\D/g, '')"
              />
              <small v-if="downPaymentInvalid" class="spk-error-text" role="alert">
                {{ Number(form.downPayment) > 0 ? 'Uang muka harus lebih kecil dari harga kaveling.' : 'Isi nominal uang muka, atau pilih Langsung cicil.' }}
              </small>
            </label>

            <fieldset class="spk-fieldset">
              <legend>
                Tenor <b aria-hidden="true">*</b>
                <span v-if="paymentPlans.length" class="spk-legend-count t-num">{{ paymentPlans.length }} pilihan</span>
              </legend>

              <div v-if="paymentPlansLoading" class="spk-state" role="status">
                <ion-spinner name="crescent" />
                <span>Memuat tenor…</span>
              </div>

              <div v-else-if="paymentPlansError" class="spk-state spk-state--error" role="alert">
                <ion-icon :icon="alertCircleOutline" aria-hidden="true" />
                <div>
                  <strong>Tenor belum bisa dimuat</strong>
                  <span>{{ paymentPlansError }}</span>
                  <button type="button" class="spk-link" @click="loadPaymentPlans">Coba lagi</button>
                </div>
              </div>

              <div v-else-if="paymentPlans.length" class="spk-tenors">
                <button
                  v-for="plan in paymentPlans"
                  :key="plan.id"
                  type="button"
                  class="spk-tenor"
                  :aria-pressed="form.paymentPlanId === plan.id"
                  @click="selectPlan(plan)"
                >
                  <span class="spk-radio" aria-hidden="true" />
                  <span class="spk-tenor-copy">
                    <strong>{{ formatMonths(plan.months) }}</strong>
                    <small>{{ formatPaymentPlanName(plan.plan_name, plan.months) }}</small>
                  </span>
                  <span class="spk-tenor-price t-num" :class="{ 'is-empty': !getInstallmentForPlan(plan.id) }">
                    <template v-if="getInstallmentForPlan(plan.id)">
                      {{ formatCurrency(getInstallmentForPlan(plan.id)?.monthly_payment) }}<small>/bln</small>
                    </template>
                    <template v-else>Belum dibuka</template>
                  </span>
                </button>
              </div>

              <div v-else class="spk-state">
                <ion-icon :icon="informationCircleOutline" aria-hidden="true" />
                <span>Belum ada tenor yang bisa dipilih.</span>
              </div>

              <AppNotice v-if="selectedPlan && !selectedInstallment" tone="warning">
                Tenor ini belum dibuka untuk kaveling ini. Pilih tenor lain.
              </AppNotice>
            </fieldset>
          </div>
        </section>
      </Reveal>

      <!-- 3. DOKUMEN -->
      <Reveal :order="3">
        <section class="spk-card" aria-labelledby="spk-doc-title">
          <header class="spk-card-head">
            <span class="spk-card-num t-num" aria-hidden="true">3</span>
            <div>
              <h2 id="spk-doc-title">Dokumen</h2>
              <p>JPG, PNG, atau PDF, maksimal 5 MB per file.</p>
            </div>
          </header>

          <div class="spk-docs">
            <DocumentUpload
              label="KTP"
              required
              accept=".jpg,.jpeg,.png,.pdf"
              :file="files.ktp"
              @change="files.ktp = $event"
            />
            <DocumentUpload
              label="KK"
              required
              accept=".jpg,.jpeg,.png,.pdf"
              :file="files.kk"
              @change="files.kk = $event"
            />
            <DocumentUpload
              label="NPWP"
              accept=".jpg,.jpeg,.png,.pdf"
              :file="files.npwp"
              @change="files.npwp = $event"
            />
            <DocumentUpload
              label="Bukti pembayaran"
              required
              accept=".jpg,.jpeg,.png,.pdf"
              :file="files.paymentProof"
              @change="files.paymentProof = $event"
            />
          </div>

          <label class="spk-field">
            <span class="spk-field-row">
              <span>Catatan untuk Admin <em>(opsional)</em></span>
              <small class="t-num">{{ form.notes.length }}/500</small>
            </span>
            <textarea
              v-model.trim="form.notes"
              class="spk-input spk-textarea"
              maxlength="500"
              rows="3"
              placeholder="Misalnya klien minta jadwal tanda tangan"
            ></textarea>
          </label>
        </section>
      </Reveal>

      <!-- RINGKASAN + KIRIM -->
      <Reveal :order="4">
        <section class="spk-review" aria-labelledby="spk-review-title">
          <h2 id="spk-review-title">Ringkasan</h2>
          <dl class="spk-review-list">
            <div>
              <dt>Klien</dt>
              <dd>{{ form.fullName || 'Belum dipilih' }}</dd>
            </div>
            <div>
              <dt>Kaveling</dt>
              <dd>{{ lot.lot_number ? formatLotNumber(lot.lot_number) : 'Belum dipilih' }}</dd>
            </div>
            <div>
              <dt>Pembayaran</dt>
              <dd>
                {{ form.paymentMethod === 'Installment'
                  ? (selectedPlan ? `Cicil ${selectedPlan.months} bulan` : 'Cicil, tenor belum dipilih')
                  : 'Tunai' }}
              </dd>
            </div>
            <div v-if="form.paymentMethod === 'Installment' && selectedInstallment && monthlyEstimate !== null">
              <dt>Per bulan</dt>
              <dd class="spk-review-figure t-num">{{ formatCurrency(monthlyEstimate) }}</dd>
            </div>
            <div>
              <dt>Dokumen wajib</dt>
              <dd class="t-num">{{ [files.ktp, files.kk, files.paymentProof].filter(Boolean).length }} dari 3</dd>
            </div>
          </dl>
          <p class="spk-review-note">Admin memeriksa data dan dokumen sebelum SPK diterbitkan.</p>
        </section>
      </Reveal>

      <SlideToConfirm
        v-if="!successMessage"
        class="spk-slide"
        label="Geser untuk ajukan SPK"
        :disabled="!canSubmit"
        :loading="submitting"
        @confirm="submitSPK"
      />

      <AppNotice v-if="submitError" tone="error">
        {{ submitError }}
      </AppNotice>

      <template v-if="successMessage">
        <p class="spk-success" role="status">
          <ion-icon :icon="checkmarkCircleOutline" aria-hidden="true" />
          {{ successMessage }}
        </p>
        <AppButton expand="block" @click="ionRouter.replace('/marketing/pengajuan')">
          Lihat status SPK
        </AppButton>
      </template>
    </div>
  </MarketingPageLayout>
</template>



<script setup lang="ts">
import AppNotice from '@/components/ui/AppNotice.vue'
import {
  computed,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'

import {
  IonIcon,
  IonSpinner,
  useIonRouter,
} from '@ionic/vue'

import {
  useRoute,
} from 'vue-router'

import {
  alertCircleOutline,
  cardOutline,
  cashOutline,
  checkmarkCircleOutline,
  informationCircleOutline,
  lockClosedOutline,
} from 'ionicons/icons'

import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import Reveal from '@/components/ui/Reveal.vue'
import AppButton from '@/components/ui/AppButton.vue'
import SlideToConfirm from '@/components/ui/SlideToConfirm.vue'
import InstallmentDpChoice from '@/components/spk/InstallmentDpChoice.vue'
import { useCelebration } from '@/composables/useCelebration'
import { formatPaymentPlanName } from '@/utils/paymentPlan'

import {
  formatLotNumber,
  getLotById,
  getLotByNumber,
  getLotInstallments,
  getMyCustomersForSpk,
  getPaymentPlans,
  submitSPKRequest,
  type Lot,
  type MarketingSpkCustomer,
  type LotInstallment,
  type PaymentPlan,
  type SPKDocumentFile,
} from '@/services/marketing/spkService'
import { getLotsHeldBySpkSafe } from '@/services/lotHoldService'



/* =========================================================
   ROUTE INPUT
   ========================================================= */

const route = useRoute()
const ionRouter = useIonRouter()
const { celebrate } = useCelebration()

function getRouteValue(key: string): string {
  const value = route.query[key]
  return Array.isArray(value)
    ? value[0] ?? ''
    : value ?? ''
}

const lotId = getRouteValue('lot_id')
const lotNumber = getRouteValue('lot_number')


/* =========================================================
   FORM
   ========================================================= */

const myCustomers = ref<MarketingSpkCustomer[]>([])

const form = reactive({
  customerId: (Number(getRouteValue('customer_id')) || null) as number | null,
  /** false = langsung cicil tanpa DP (bawaan), true = pakai DP. */
  useDownPayment: false,
  downPayment: '',
  fullName: getRouteValue('name'),
  phone: getRouteValue('phone'),
  email: getRouteValue('email'),
  address: getRouteValue('address'),

  paymentMethod: 'Cash' as 'Cash' | 'Installment',
  paymentPlanId: null as number | null,

  notes: '',
})


/* =========================================================
   LOT
   ========================================================= */

const lot = reactive<Partial<Lot>>({
  id: undefined,
  lot_number: '',
  block_id: null,
  dimension: null,
  area: null,
  cash_price: null,
  promo_price: null,
  payment_type: null,
})


const lotLoading = ref(false)
const lotError = ref('')


/* =========================================================
   PAYMENT PLANS
   ========================================================= */

const paymentPlans = ref<PaymentPlan[]>([])
const paymentPlansLoading = ref(false)
const paymentPlansError = ref('')

const lotInstallments = ref<LotInstallment[]>([])
const lotInstallmentsLoading = ref(false)
const lotInstallmentsError = ref('')



/* =========================================================
   FILES
   ========================================================= */

const files = reactive<{
  ktp: File | null
  kk: File | null
  npwp: File | null
  paymentProof: File | null
}>({
  ktp: null,
  kk: null,
  npwp: null,
  paymentProof: null,
})


/* =========================================================
   SUBMIT STATE
   ========================================================= */

const submitting = ref(false)
const successMessage = ref('')
const submitError = ref('')


/* =========================================================
   COMPUTED
   ========================================================= */

const selectedPlan = computed(() => {
  if (!form.paymentPlanId) {
    return null
  }

  return (
    paymentPlans.value.find(
      plan => plan.id === form.paymentPlanId,
    ) || null
  )
})

// Harga yang dipakai database saat membuat SPK (promo hanya bila lebih murah).
const effectiveLotPrice = computed(() => {
  const cash = Number(lot.cash_price ?? 0)
  const promo = Number(lot.promo_price ?? 0)
  return promo > 0 && (cash <= 0 || promo < cash) ? promo : cash
})

const downPaymentAmount = computed(() =>
  form.useDownPayment ? Number(form.downPayment) || 0 : 0,
)

const downPaymentInvalid = computed(() =>
  form.useDownPayment
  && (downPaymentAmount.value <= 0 || downPaymentAmount.value >= effectiveLotPrice.value),
)

// Rumus sama dengan create_marketing_spk_request: (harga - DP) + margin, dibagi tenor.
const monthlyEstimate = computed(() => {
  const plan = selectedPlan.value
  if (!plan || plan.months <= 0 || downPaymentInvalid.value || effectiveLotPrice.value <= 0) return null
  const principal = effectiveLotPrice.value - downPaymentAmount.value
  const margin = Number(plan.margin_percent ?? 0)
  return Math.floor((principal + Math.round(principal * margin / 100)) / plan.months)
})

const selectedInstallment = computed(() => {
  if (!form.paymentPlanId) {
    return null
  }

  return (
    lotInstallments.value.find(
      installment => installment.plan_id === form.paymentPlanId,
    ) || null
  )
})


const selectedPrice = computed(() => {
  return (
    lot.promo_price ??
    lot.cash_price ??
    null
  )
})


const formattedLotPrice = computed(() => {
  if (selectedPrice.value === null) {
    return 'Harga belum tersedia'
  }

  return new Intl.NumberFormat(
    'id-ID',
    {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    },
  ).format(selectedPrice.value)
})


const completionPercent = computed(() => {
  const checks = [
    Boolean(form.fullName),
    Boolean(form.phone),
    Boolean(form.address),
    Boolean(lot.id),
    Boolean(form.paymentMethod),
    form.paymentMethod === 'Cash'
      ? true
      : Boolean(form.paymentPlanId) &&
        Boolean(selectedInstallment.value),
    Boolean(files.ktp),
    Boolean(files.kk),
    Boolean(files.paymentProof),
  ]

  const completed = checks.filter(Boolean).length

  return Math.round(
    (completed / checks.length) * 100,
  )
})


const steps = [
  { n: 1, label: 'Klien' },
  { n: 2, label: 'Pembayaran' },
  { n: 3, label: 'Dokumen' },
] as const


const currentStep = computed(() => {
  const buyerComplete =
    Boolean(form.fullName) &&
    Boolean(form.phone) &&
    Boolean(form.address)

  const paymentComplete =
    Boolean(lot.id) &&
    Boolean(form.paymentMethod) &&
    (
      form.paymentMethod === 'Cash' ||
      (
        Boolean(form.paymentPlanId) &&
        Boolean(selectedInstallment.value)
      )
    )

  if (buyerComplete && paymentComplete) {
    return 3
  }

  if (buyerComplete) {
    return 2
  }

  return 1
})


const canSubmit = computed(() => {
  if (!form.customerId) return false
  if (form.paymentMethod === 'Installment' && downPaymentInvalid.value) return false

  const basicValid =
    Boolean(form.fullName) &&
    Boolean(form.phone) &&
    Boolean(form.address) &&
    Boolean(form.paymentMethod) &&
    Boolean(lot.id) &&
    Boolean(files.ktp) &&
    Boolean(files.kk) &&
    Boolean(files.paymentProof)

  if (!basicValid) {
    return false
  }

  if (
    form.paymentMethod === 'Installment' &&
    (
      !form.paymentPlanId ||
      !selectedInstallment.value
    )
  ) {
    return false
  }

  return true
})


/* =========================================================
   WATCHERS
   ========================================================= */

watch(
  () => form.paymentMethod,
  method => {
    if (method === 'Cash') {
      form.paymentPlanId = null
    }
  },
)

/* =========================================================
   FORMAT TENOR
   ========================================================= */

function formatMonths(
  months: number,
) {
  return `${months} Bulan`
}


/* =========================================================
   LOAD LOT
   ========================================================= */

async function loadLot() {
  lotLoading.value = true
  lotError.value = ''

  try {
    let data: Lot | null = null

    // SPK Marketing selalu untuk satu kaveling; tanpa kaveling, arahkan ke daftar kaveling.
    if (!lotId && !lotNumber) {
      lotError.value =
        'Pilih kaveling yang tersedia, lalu ketuk Ajukan SPK di kartunya.'
      return
    }

    if (lotId) {
      data = await getLotById(
        Number(lotId),
      )
    } else if (lotNumber) {
      data = await getLotByNumber(
        lotNumber,
      )
    }

    if (!data) {
      lotError.value =
        'Kaveling tidak ditemukan atau sudah tidak tersedia.'
      return
    }

    if (data.id && (await getLotsHeldBySpkSafe()).has(data.id)) {
      lotError.value =
        'Kaveling ini sedang diproses pengajuan SPK lain, jadi belum bisa diajukan. Silakan pilih kaveling lain atau coba lagi nanti.'
      return
    }

    Object.assign(
      lot,
      data,
    )

    /*
     * Nilai awal mengikuti payment_type pada lots.
     * Pengajuan tetap menunggu validasi Admin.
     */
    if (data.payment_type === 'Installment') {
      form.paymentMethod = 'Installment'
    } else {
      form.paymentMethod = 'Cash'
    }

    if (data.id) {
      await loadLotInstallments(data.id)
    }

  } catch (error) {
    console.error(error)

    lotError.value =
      'Gagal memuat data kaveling.'
  } finally {
    lotLoading.value = false
  }
}


/* =========================================================
   LOAD PAYMENT PLANS
   ========================================================= */

async function loadPaymentPlans() {
  paymentPlansLoading.value = true
  paymentPlansError.value = ''

  try {
    /*
     * Semua pilihan tenor berasal dari:
     *
     * public.payment_plans
     *
     * Kolom yang digunakan:
     * - id
     * - plan_name
     * - months
     * - margin_percent
     *
     * Tidak ada tenor hard-code di halaman.
     */
    paymentPlans.value =
      await getPaymentPlans()

  } catch (error) {
    console.error(error)

    paymentPlansError.value =
      'Gagal memuat rencana tenor.'
  } finally {
    paymentPlansLoading.value = false
  }
}


function formatCurrency(value: number | null | undefined) {
  if (value === null || value === undefined) {
    return 'Belum tersedia'
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

function getInstallmentForPlan(planId: number) {
  return (
    lotInstallments.value.find(
      installment => installment.plan_id === planId,
    ) || null
  )
}

function selectPaymentMethod(
  method: 'Cash' | 'Installment',
) {
  form.paymentMethod = method

  if (method === 'Cash') {
    form.paymentPlanId = null
    form.useDownPayment = false
    form.downPayment = ''
  }
}

async function loadLotInstallments(lotIdValue: number) {
  lotInstallmentsLoading.value = true
  lotInstallmentsError.value = ''

  try {
    lotInstallments.value =
      await getLotInstallments(lotIdValue)
  } catch (error) {
    console.error(error)
    lotInstallmentsError.value =
      'Gagal memuat skema cicilan kaveling.'
    lotInstallments.value = []
  } finally {
    lotInstallmentsLoading.value = false
  }
}


/* =========================================================
   SELECT PAYMENT PLAN
   ========================================================= */

function selectPlan(
  plan: PaymentPlan,
) {
  form.paymentPlanId = plan.id
}


/* =========================================================
   SUBMIT
   ========================================================= */


async function submitSPK() {
  successMessage.value = ''
  submitError.value = ''

  if (!canSubmit.value) {
    submitError.value =
      'Lengkapi data wajib yang masih belum terisi.'
    return
  }

  if (
    !lot.id ||
    selectedPrice.value === null ||
    selectedPrice.value === undefined
  ) {
    submitError.value = 'Data kaveling atau harga tidak valid.'
    return
  }

  if (
    form.paymentMethod === 'Installment' &&
    (!selectedPlan.value || !selectedInstallment.value)
  ) {
    submitError.value = 'Skema cicilan belum tersedia.'
    return
  }

  const documentFiles: SPKDocumentFile[] = [
    { type: 'KTP', file: files.ktp! },
    { type: 'KK', file: files.kk! },
    ...(files.npwp
      ? [{ type: 'NPWP' as const, file: files.npwp }]
      : []),
    { type: 'Payment Proof', file: files.paymentProof! },
  ]

  // Form saat ini menyatakan maksimal 5 MB per dokumen.
  const maxFileSize = 5 * 1024 * 1024

  const oversizedFile = documentFiles.find(
    document => document.file.size > maxFileSize,
  )

  if (oversizedFile) {
    submitError.value =
      `${oversizedFile.file.name} melebihi batas 5 MB.`
    return
  }

  submitting.value = true

  try {
    const result = await submitSPKRequest(
      {
        customer_id: Number(form.customerId),
        lot_id: Number(lot.id),
        payment_method: form.paymentMethod,
        down_payment_amount:
          form.paymentMethod === 'Installment'
            ? downPaymentAmount.value
            : 0,

        payment_plan_id:
          form.paymentMethod === 'Installment'
            ? form.paymentPlanId
            : null,

        notes: form.notes.trim() || null,
      },
      documentFiles,
    )

    successMessage.value =
      `Pengajuan ${result.spk_number} berhasil dikirim dan menunggu validasi Admin.`
    celebrate({
      title: 'SPK terkirim',
      message: `${result.spk_number} menunggu validasi Admin.`,
    })

    console.info('SPK berhasil disimpan:', result)

  } catch (error) {
    console.error(error)

    const message =
      error instanceof Error
        ? error.message
        : 'Terjadi kesalahan saat mengirim pengajuan SPK.'

    submitError.value = message

  } finally {
    submitting.value = false
  }
}



/* =========================================================
   INIT
   ========================================================= */

function applySelectedCustomer() {
  const customer = myCustomers.value.find(c => c.id === form.customerId)
  if (!customer) return
  form.fullName = customer.full_name ?? ''
  form.phone = customer.phone ?? ''
  form.email = customer.email ?? ''
  form.address = customer.address ?? ''
}

onMounted(async () => {
  await Promise.all([
    loadLot(),
    loadPaymentPlans(),
    getMyCustomersForSpk()
      .then(list => { myCustomers.value = list })
      .catch(error => { console.error(error); submitError.value = 'Gagal memuat daftar klien Anda.' }),
  ])
  applySelectedCustomer()
})
</script>


<!-- =========================================================
     DOCUMENT UPLOAD
     ========================================================= -->

<script lang="ts">
import {
  defineComponent,
  h,
  type PropType,
} from 'vue'

import {
  IonIcon as DocumentIonIcon,
} from '@ionic/vue'

import {
  cloudUploadOutline,
  documentAttachOutline,
  trashOutline,
} from 'ionicons/icons'


export default defineComponent({
  name: 'SPKMarketingPage',

  components: {
    DocumentUpload: defineComponent({
      name: 'DocumentUpload',

      props: {
        label: {
          type: String,
          required: true,
        },

        required: {
          type: Boolean,
          default: false,
        },

        wide: {
          type: Boolean,
          default: false,
        },

        accept: {
          type: String,
          default: '.jpg,.jpeg,.png,.pdf',
        },

        file: {
          type: Object as PropType<File | null>,
          default: null,
        },
      },

      emits: ['change'],

      setup(props, { emit }) {
        function handleChange(
          event: Event,
        ) {
          const input =
            event.target as HTMLInputElement

          emit(
            'change',
            input.files?.[0] ?? null,
          )
        }

        function removeFile() {
          emit('change', null)
        }

        return () =>
          h(
            'div',
            {
              class: [
                'document-upload',
                props.wide
                  ? 'document-upload-wide'
                  : '',
                props.file
                  ? 'has-file'
                  : '',
              ],
            },
            [
              h(
                'div',
                {
                  class:
                    'document-upload-header',
                },
                [
                  h(
                    'div',
                    {
                      class:
                        'document-upload-icon',
                    },
                    [
                      h(DocumentIonIcon, {
                        icon:
                          props.file
                            ? documentAttachOutline
                            : cloudUploadOutline,
                      }),
                    ],
                  ),

                  h(
                    'div',
                    {
                      class:
                        'document-upload-title',
                    },
                    [
                      h(
                        'strong',
                        null,
                        props.label,
                      ),

                      h(
                        'small',
                        null,
                        props.file
                          ? 'Siap dikirim'
                          : props.required
                            ? 'Wajib'
                            : 'Opsional',
                      ),
                    ],
                  ),
                ],
              ),

              props.file
                ? h(
                    'div',
                    {
                      class:
                        'selected-file',
                    },
                    [
                      h(
                        'div',
                        {
                          class:
                            'file-name',
                        },
                        [
                          h(
                            DocumentIonIcon,
                            {
                              icon:
                                documentAttachOutline,
                            },
                          ),

                          h(
                            'span',
                            null,
                            props.file.name,
                          ),
                        ],
                      ),

                      h(
                        'button',
                        {
                          type: 'button',
                          class:
                            'remove-file',
                          'aria-label':
                            `Hapus ${props.label}`,
                          onClick:
                            removeFile,
                        },
                        [
                          h(
                            DocumentIonIcon,
                            {
                              icon:
                                trashOutline,
                            },
                          ),
                        ],
                      ),
                    ],
                  )
                : h(
                    'label',
                    {
                      class:
                        'document-upload-button',
                    },
                    [
                      h('input', {
                        type: 'file',
                        accept: props.accept,
                        'aria-label': `Pilih file ${props.label}`,
                        onChange:
                          handleChange,
                      }),

                      h(
                        DocumentIonIcon,
                        {
                          icon:
                            cloudUploadOutline,
                          'aria-hidden': 'true',
                        },
                      ),

                      h(
                        'span',
                        null,
                        'Pilih file',
                      ),
                    ],
                  ),
            ],
          )
      },
    }),
  },
})
</script>


<style scoped>
/* Ajukan SPK. Bentuk mengikuti halaman marketing lain (MarketingPageLayout,
   kartu putih bergaris, isian 44px+). Satu panel hijau hutan untuk ringkasan
   sebagai titik fokus sebelum kirim. Hanya token dari theme/variables.css. */

.spk {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
  font-family: var(--font-primary);
  color: var(--text-primary);
}

.spk button,
.spk input,
.spk select,
.spk textarea {
  font: inherit;
}

.spk button {
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
}

.spk b {
  color: var(--danger-text);
  font-weight: 700;
}

/* ---------- progres ---------- */
.spk-progress {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  background: var(--surface-primary);
}

.spk-steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.spk-step {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 600;
}

.spk-step-num {
  flex: 0 0 28px;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--surface-muted);
  color: var(--text-secondary);
  font-size: var(--text-sm);
  font-weight: 700;
  transition: background var(--dur-base) var(--ease-out), color var(--dur-base) var(--ease-out);
}

.spk-step-label {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.spk-step.is-active { color: var(--text-primary); }
.spk-step.is-active .spk-step-num {
  background: var(--green-700);
  color: #fff;
}

.spk-meter {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.spk-meter-track {
  position: relative;
  flex: 1;
  height: 6px;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--surface-muted);
}

.spk-meter-fill {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--green-700);
  transform-origin: left center;
  transition: transform var(--dur-slow) var(--ease-out);
}

.spk-meter-text {
  flex: 0 0 auto;
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-weight: 600;
}

/* ---------- kartu bagian ---------- */
.spk-card {
  display: grid;
  gap: var(--space-4);
  min-width: 0;
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  background: var(--surface-primary);
}

.spk-card-head {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
}

.spk-card-num {
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--status-success-bg);
  color: var(--green-700);
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
}

.spk-card-head h2 {
  margin: 0;
  padding-top: 6px;
  font-size: var(--text-md);
  font-weight: 700;
  line-height: 1.3;
}

.spk-card-head p {
  margin: 2px 0 0;
  color: var(--text-secondary);
  font-size: var(--text-xs);
  line-height: 1.45;
}

/* ---------- isian ---------- */
.spk-field {
  display: grid;
  gap: 6px;
  min-width: 0;
}

.spk-field > span,
.spk-field-row > span {
  font-size: var(--text-sm);
  font-weight: 600;
}

.spk-field em {
  color: var(--text-secondary);
  font-style: normal;
  font-weight: 500;
}

.spk-field-row {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-2);
}

.spk-field-row small {
  color: var(--text-secondary);
  font-size: var(--text-xs);
}

.spk-input {
  width: 100%;
  min-width: 0;
  min-height: 48px;
  box-sizing: border-box;
  padding: 10px var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-primary);
  color: var(--text-primary);
  font-size: 16px; /* di bawah 16px, iOS memperbesar halaman */
  transition: border-color var(--dur-fast) var(--ease-out);
}

.spk-input::placeholder { color: var(--text-secondary); }
.spk-input:focus { border-color: var(--green-700); }
.spk-input:focus-visible { outline: none; box-shadow: var(--ring-focus); }
.spk-input[aria-invalid='true'] { border-color: var(--danger-text); }

select.spk-input {
  appearance: none;
  -webkit-appearance: none;
  padding-right: 40px;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='%235F5F66' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E");
  background-repeat: no-repeat;
  background-position: right 12px center;
  background-size: 18px;
  cursor: pointer;
}

.spk-textarea {
  min-height: 96px;
  resize: vertical;
  line-height: 1.45;
}

@media (hover: hover) and (pointer: fine) {
  .spk-input:hover:not(:focus) { border-color: var(--border-strong); }
}

.spk-error-text {
  color: var(--danger-text);
  font-size: var(--text-xs);
  font-weight: 600;
}

.spk-inline-note {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-control);
  background: var(--surface-muted);
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.spk-link {
  min-height: 44px;
  padding: 0 var(--space-1);
  border: 0;
  background: none;
  color: var(--green-700);
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
  justify-self: start;
}
.spk-link:active { opacity: 0.7; }
.spk-link:focus-visible {
  outline: 2px solid var(--green-700);
  outline-offset: 2px;
  border-radius: var(--radius-xs);
}
@media (hover: hover) and (pointer: fine) {
  .spk-link:hover { text-decoration: underline; }
}

/* ---------- data klien (hanya baca, diambil dari data klien) ---------- */
.spk-client {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3) var(--space-4);
  margin: 0;
  padding: var(--space-3) var(--space-4);
  border-radius: var(--radius-control);
  background: var(--surface-muted);
}

.spk-client > div { min-width: 0; }
.spk-client-wide { grid-column: 1 / -1; }

.spk-client dt,
.spk-label {
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-weight: 600;
}

.spk-client dd {
  margin: 2px 0 0;
  font-size: var(--text-sm);
  font-weight: 600;
  line-height: 1.45;
  overflow-wrap: anywhere;
}

.spk-client dd.is-missing { color: var(--danger-text); }

/* ---------- kaveling ---------- */
.spk-lot {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: end;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-control);
  background: var(--gold-50);
}

.spk-lot-main,
.spk-lot-price {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.spk-lot-number {
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 600;
  line-height: 1.1;
  overflow-wrap: anywhere;
}

.spk-lot-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 2px var(--space-3);
  margin-top: 4px;
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-weight: 600;
}

.spk-lot-price { text-align: right; }

.spk-lot-price strong {
  color: var(--gold-800);
  font-size: var(--text-lg);
  font-weight: 800;
  white-space: nowrap;
}

.spk-lot-price small {
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  gap: 4px;
  color: var(--text-secondary);
  font-size: var(--text-2xs);
}

/* ---------- pilihan (metode, tenor) ---------- */
.spk-fieldset {
  display: grid;
  gap: var(--space-2);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.spk-fieldset legend {
  display: flex;
  width: 100%;
  align-items: baseline;
  gap: 4px;
  margin-bottom: var(--space-2);
  padding: 0;
  font-size: var(--text-sm);
  font-weight: 600;
}

.spk-legend-count {
  margin-left: auto;
  color: var(--text-secondary);
  font-size: var(--text-xs);
}

.spk-choice-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

.spk-choice,
.spk-tenor {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 56px;
  padding: var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-primary);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition:
    transform var(--dur-instant) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out),
    background var(--dur-fast) var(--ease-out);
}

.spk-choice:active,
.spk-tenor:active { transform: scale(0.98); }

.spk-choice:focus-visible,
.spk-tenor:focus-visible {
  outline: 2px solid var(--green-700);
  outline-offset: 2px;
}

.spk-choice[aria-pressed='true'],
.spk-tenor[aria-pressed='true'] {
  border-color: var(--green-700);
  background: var(--green-50);
}

@media (hover: hover) and (pointer: fine) {
  .spk-choice:hover,
  .spk-tenor:hover { border-color: var(--green-500); }
}

.spk-choice > ion-icon {
  flex: 0 0 22px;
  font-size: 22px;
  color: var(--green-700);
}

.spk-choice-copy,
.spk-tenor-copy {
  display: grid;
  gap: 1px;
  flex: 1;
  min-width: 0;
}

.spk-choice-copy strong,
.spk-tenor-copy strong {
  font-size: var(--text-sm);
  font-weight: 700;
}

.spk-choice-copy small,
.spk-tenor-copy small {
  color: var(--text-secondary);
  font-size: var(--text-xs);
  overflow-wrap: anywhere;
}

.spk-radio {
  position: relative;
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  box-sizing: border-box;
  border: 2px solid var(--text-secondary);
  border-radius: 50%;
  transition: border-color var(--dur-fast) var(--ease-out);
}

.spk-radio::after {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 50%;
  background: var(--green-700);
  transform: scale(0.4);
  opacity: 0;
  transition: transform var(--dur-fast) var(--ease-spring), opacity var(--dur-fast) var(--ease-out);
}

[aria-pressed='true'] > .spk-radio { border-color: var(--green-700); }
[aria-pressed='true'] > .spk-radio::after { transform: scale(1); opacity: 1; }

.spk-installment {
  display: grid;
  gap: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-default);
}

.spk-tenors {
  display: grid;
  gap: var(--space-2);
}

.spk-tenor-price {
  flex: 0 0 auto;
  font-size: var(--text-sm);
  font-weight: 700;
  text-align: right;
  white-space: nowrap;
}

.spk-tenor-price small {
  margin-left: 2px;
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-weight: 500;
}

.spk-tenor-price.is-empty {
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-weight: 600;
}

/* ---------- status muat / galat ---------- */
.spk-state {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-control);
  background: var(--surface-muted);
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.spk-state ion-spinner {
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  color: var(--green-700);
}

.spk-state > ion-icon {
  flex: 0 0 20px;
  font-size: 20px;
}

.spk-state > div {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.spk-state strong { color: var(--text-primary); }

.spk-state--error {
  background: var(--danger-bg);
  color: var(--danger-text);
}
.spk-state--error strong { color: var(--danger-text); }

/* ---------- dokumen (komponen render function: perlu :deep) ---------- */
.spk-docs {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2);
}

.spk-docs :deep(.document-upload) {
  position: relative;
  display: grid;
  gap: var(--space-2);
  min-width: 0;
  padding: var(--space-3);
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-control);
  background: var(--surface-primary);
  transition: border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
}

.spk-docs :deep(.document-upload.has-file) {
  border-style: solid;
  border-color: var(--green-200);
  background: var(--green-50);
}

.spk-docs :deep(.document-upload-header) {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.spk-docs :deep(.document-upload-icon) {
  flex: 0 0 32px;
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--surface-muted);
  color: var(--text-secondary);
  font-size: 18px;
}

.spk-docs :deep(.has-file .document-upload-icon) {
  background: var(--green-700);
  color: #fff;
}

.spk-docs :deep(.document-upload-title) {
  display: grid;
  min-width: 0;
}

.spk-docs :deep(.document-upload-title strong) {
  font-size: var(--text-sm);
  font-weight: 700;
  overflow-wrap: anywhere;
}

.spk-docs :deep(.document-upload-title small) {
  color: var(--text-secondary);
  font-size: var(--text-xs);
}

.spk-docs :deep(.document-upload-button) {
  position: relative;
  min-height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border-radius: var(--radius-sm);
  background: var(--surface-muted);
  color: var(--green-700);
  font-size: var(--text-sm);
  font-weight: 700;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  transition: transform var(--dur-instant) var(--ease-out), background var(--dur-fast) var(--ease-out);
}

.spk-docs :deep(.document-upload-button:active) { transform: scale(0.97); }
.spk-docs :deep(.document-upload-button:focus-within) {
  outline: 2px solid var(--green-700);
  outline-offset: 2px;
}
@media (hover: hover) and (pointer: fine) {
  .spk-docs :deep(.document-upload-button:hover) { background: var(--surface-sunken); }
}

/* input file tetap bisa difokus keyboard, tapi tidak terlihat */
.spk-docs :deep(.document-upload-button input) {
  position: absolute;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.spk-docs :deep(.selected-file) {
  display: flex;
  align-items: center;
  gap: var(--space-1);
  min-width: 0;
}

.spk-docs :deep(.file-name) {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  min-width: 0;
  font-size: var(--text-xs);
  font-weight: 600;
}

.spk-docs :deep(.file-name ion-icon) {
  flex: 0 0 16px;
  font-size: 16px;
  color: var(--green-700);
}

.spk-docs :deep(.file-name span) {
  min-width: 0;
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.spk-docs :deep(.remove-file) {
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--danger-text);
  font-size: 18px;
  cursor: pointer;
}
.spk-docs :deep(.remove-file:active) { background: var(--danger-bg); }
.spk-docs :deep(.remove-file:focus-visible) {
  outline: 2px solid var(--danger-text);
  outline-offset: -2px;
}

/* ---------- ringkasan (panel hijau hutan) ---------- */
.spk-review {
  position: relative;
  display: grid;
  gap: var(--space-3);
  overflow: hidden;
  padding: var(--space-5);
  border-radius: var(--radius-panel);
  background: var(--surface-forest);
  color: var(--on-forest);
}

/* cahaya emas di pojok kanan atas, seperti panel di Welcome */
.spk-review::before {
  content: '';
  position: absolute;
  top: -60px;
  right: -60px;
  width: 180px;
  height: 180px;
  border-radius: 50%;
  background: radial-gradient(circle, rgb(244 214 154 / 22%), transparent 70%);
  pointer-events: none;
}

.spk-review h2 {
  position: relative;
  margin: 0;
  font-family: var(--font-display);
  font-size: var(--text-xl);
  font-weight: 600;
}

.spk-review-list {
  position: relative;
  display: grid;
  gap: var(--space-2);
  margin: 0;
}

.spk-review-list > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding-bottom: var(--space-2);
  border-bottom: 1px solid rgb(244 241 232 / 14%);
}

.spk-review-list dt {
  flex: 0 0 auto;
  color: rgb(244 241 232 / 88%); /* --on-forest 88%, DESIGN.md §14 */
  font-size: var(--text-sm);
}

.spk-review-list dd {
  min-width: 0;
  margin: 0;
  font-size: var(--text-sm);
  font-weight: 700;
  text-align: right;
  overflow-wrap: anywhere;
}

.spk-review-list dd.spk-review-figure {
  color: var(--gold-100);
  font-size: var(--text-md);
}

.spk-review-note {
  position: relative;
  margin: 0;
  color: rgb(244 241 232 / 88%); /* --on-forest 88%, DESIGN.md §14 */
  font-size: var(--text-xs);
  line-height: 1.5;
}

.spk-slide { margin-top: var(--space-1); }

.spk-success {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-control);
  background: var(--status-success-bg);
  color: var(--green-700);
  font-size: var(--text-sm);
  font-weight: 600;
}

.spk-success ion-icon {
  flex: 0 0 18px;
  margin-top: 1px;
  font-size: 18px;
}

/* ---------- layar sempit ---------- */
@media (max-width: 380px) {
  .spk-step-label { font-size: var(--text-xs); }
  .spk-client { grid-template-columns: minmax(0, 1fr); }
  .spk-lot { grid-template-columns: minmax(0, 1fr); }
  .spk-lot-price { text-align: left; }
  .spk-lot-price small { justify-content: flex-start; }
  .spk-docs { grid-template-columns: minmax(0, 1fr); }
}

@media (max-width: 340px) {
  .spk-choice-row { grid-template-columns: minmax(0, 1fr); }
}

@media (prefers-reduced-motion: reduce) {
  .spk-meter-fill,
  .spk-radio::after,
  .spk-step-num { transition: none; }
}
</style>
