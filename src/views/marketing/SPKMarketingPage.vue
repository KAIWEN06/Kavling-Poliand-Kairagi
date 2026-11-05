<template>
  <ion-page class="spk-page">

    <!-- =====================================================
         HEADER
         ===================================================== -->
    <AppHeader
      variant="marketing"
      :authenticated="true"
      title="Surat Pembelian Kavling"
      :has-notification="true"
    />

    <ion-content
      :fullscreen="false"
      class="spk-content"
    >
      <main class="spk-container">

        <!-- =================================================
             PAGE INTRO
             ================================================= -->
        <section class="page-intro">
          <div class="page-intro-copy">
            <span class="eyebrow">PENGAJUAN SPK</span>

            <h1>Surat Pembelian Kavling</h1>

            <p>
              Lengkapi data calon pembeli dan pilih rencana pembayaran
              sebelum pengajuan dikirim untuk validasi Admin.
            </p>
          </div>

          <div class="progress-chip">
            <ion-icon :icon="checkmarkCircleOutline" />
            <span>{{ completionPercent }}% lengkap</span>
          </div>
        </section>


        <!-- =================================================
             FORM PROGRESS
             ================================================= -->
        <nav class="form-progress" aria-label="Tahapan formulir SPK">

          <div
            class="progress-step"
            :class="{ active: currentStep >= 1 }"
          >
            <span class="step-number">1</span>
            <div>
              <strong>Pembeli</strong>
              <small>Data pribadi</small>
            </div>
          </div>

          <span class="progress-line" />

          <div
            class="progress-step"
            :class="{ active: currentStep >= 2 }"
          >
            <span class="step-number">2</span>
            <div>
              <strong>Kavling</strong>
              <small>Pembayaran</small>
            </div>
          </div>

          <span class="progress-line" />

          <div
            class="progress-step"
            :class="{ active: currentStep >= 3 }"
          >
            <span class="step-number">3</span>
            <div>
              <strong>Dokumen</strong>
              <small>Konfirmasi</small>
            </div>
          </div>

        </nav>


        <!-- =================================================
             INFORMASI PEMBELI
             ================================================= -->
        <section class="form-card">

          <div class="card-heading">
            <div class="heading-icon">
              <ion-icon :icon="personOutline" />
            </div>

            <div class="heading-copy">
              <span class="section-kicker">01</span>
              <h2>Informasi Pembeli</h2>
              <p>Data ini akan digunakan pada dokumen SPK.</p>
            </div>

            <span class="required-note">
              * Wajib
            </span>
          </div>

          <div class="card-body">

            <div class="form-grid">

              <div class="field-group">
                <label for="full-name">
                  Nama Lengkap <span>*</span>
                </label>

                <div
                  class="field-shell"
                  :class="{ filled: form.fullName }"
                >
                  <ion-icon :icon="personOutline" />

                  <input
                    id="full-name"
                    v-model.trim="form.fullName"
                    type="text"
                    placeholder="Masukkan nama lengkap"
                    autocomplete="name"
                  />
                </div>
              </div>


              <div class="field-group">
                <label for="phone">
                  Nomor Kontak <span>*</span>
                </label>

                <div
                  class="field-shell"
                  :class="{ filled: form.phone }"
                >
                  <ion-icon :icon="callOutline" />

                  <input
                    id="phone"
                    v-model.trim="form.phone"
                    type="tel"
                    inputmode="tel"
                    placeholder="Contoh: 0823 4735 8236"
                    autocomplete="tel"
                  />
                </div>
              </div>


              <div class="field-group">
                <label for="email">
                  Email <small>(Opsional)</small>
                </label>

                <div
                  class="field-shell"
                  :class="{ filled: form.email }"
                >
                  <ion-icon :icon="mailOutline" />

                  <input
                    id="email"
                    v-model.trim="form.email"
                    type="email"
                    placeholder="contoh@email.com"
                    autocomplete="email"
                  />
                </div>
              </div>


              <div class="field-group field-full">
                <div class="label-row">
                  <label for="address">
                    Alamat Lengkap <span>*</span>
                  </label>

                  <span class="counter">
                    {{ form.address.length }}/200
                  </span>
                </div>

                <div
                  class="field-shell textarea-shell"
                  :class="{ filled: form.address }"
                >
                  <ion-icon :icon="locationOutline" />

                  <textarea
                    id="address"
                    v-model.trim="form.address"
                    maxlength="200"
                    rows="3"
                    placeholder="Masukkan alamat lengkap calon pembeli"
                  ></textarea>
                </div>
              </div>

            </div>

          </div>
        </section>


        <!-- =================================================
             INFORMASI KAVLING
             ================================================= -->
        <section class="form-card">

          <div class="card-heading">
            <div class="heading-icon">
              <ion-icon :icon="mapOutline" />
            </div>

            <div class="heading-copy">
              <span class="section-kicker">02</span>
              <h2>Informasi Kavling</h2>
              <p>Pilih skema pembayaran yang akan diajukan.</p>
            </div>
          </div>

          <div class="card-body">

            <!-- LOT SUMMARY -->
            <div
              v-if="lotLoading"
              class="lot-state"
            >
              <ion-spinner name="crescent" />
              <span>Memuat data kavling...</span>
            </div>

            <div
              v-else-if="lotError"
              class="lot-state error"
            >
              <ion-icon :icon="alertCircleOutline" />

              <div>
                <strong>Data kavling tidak tersedia</strong>
                <span>{{ lotError }}</span>
              </div>
            </div>

            <div
              v-else
              class="lot-summary"
            >
              <div class="lot-main">
                <span class="summary-label">KAVLING DIPILIH</span>

                <strong>
                  {{ lot.lot_number ? formatLotNumber(lot.lot_number) : 'Belum dipilih' }}
                </strong>

                <div class="lot-tags">
                  <span v-if="lot.block_id">
                    Blok {{ lot.block_id }}
                  </span>

                  <span v-if="lot.area">
                    {{ lot.area }} m²
                  </span>

                  <span v-if="lot.dimension">
                    {{ lot.dimension }}
                  </span>
                </div>
              </div>

              <div class="lot-price">
                <span>Harga</span>

                <strong>
                  {{ formattedLotPrice }}
                </strong>

                <small
                  v-if="
                    lot.promo_price &&
                    lot.cash_price &&
                    lot.promo_price < lot.cash_price
                  "
                >
                  Harga promo
                </small>
              </div>
            </div>


            <div class="form-grid">

              <!-- PRICE -->
              <div class="field-group">
                <label>Harga Kavling</label>

                <div class="price-field">
                  <div class="price-icon">
                    <ion-icon :icon="cashOutline" />
                  </div>

                  <div class="price-copy">
                    <span>Harga yang digunakan</span>
                    <strong>{{ formattedLotPrice }}</strong>
                  </div>

                  <ion-icon
                    class="readonly-icon"
                    :icon="lockClosedOutline"
                  />
                </div>

                <p class="field-hint">
                  Harga diambil otomatis dari data kavling dan tidak
                  dapat diubah pada pengajuan SPK.
                </p>
              </div>


              <!-- PAYMENT METHOD -->
              <div class="field-group field-full">
                <label>
                  Metode Pembayaran <span>*</span>
                </label>

                <div class="payment-method-options">
                  <button
                    type="button"
                    class="payment-method-option"
                    :class="{ selected: form.paymentMethod === 'Cash' }"
                    :aria-pressed="form.paymentMethod === 'Cash'"
                    @click="selectPaymentMethod('Cash')"
                  >
                    <span class="payment-method-icon">
                      <ion-icon :icon="cashOutline" />
                    </span>

                    <span class="payment-method-copy">
                      <strong>Cash</strong>
                      <small>Pembayaran penuh</small>
                    </span>

                    <ion-icon
                      v-if="form.paymentMethod === 'Cash'"
                      :icon="checkmarkCircleOutline"
                      class="payment-method-check"
                    />
                  </button>

                  <button
                    type="button"
                    class="payment-method-option"
                    :class="{ selected: form.paymentMethod === 'Installment' }"
                    :aria-pressed="form.paymentMethod === 'Installment'"
                    @click="selectPaymentMethod('Installment')"
                  >
                    <span class="payment-method-icon">
                      <ion-icon :icon="cardOutline" />
                    </span>

                    <span class="payment-method-copy">
                      <strong>Cicil</strong>
                      <small>Bayar sesuai tenor</small>
                    </span>

                    <ion-icon
                      v-if="form.paymentMethod === 'Installment'"
                      :icon="checkmarkCircleOutline"
                      class="payment-method-check"
                    />
                  </button>
                </div>

                <p class="field-hint">
                  Pilih metode pembayaran yang disepakati dengan calon pembeli.
                </p>
              </div>

              <!-- PAYMENT SCHEME / MONTHLY PAYMENT -->
              <div
                v-if="form.paymentMethod === 'Cash'"
                class="field-group field-full"
              >
                <label>Skema Pembayaran</label>

                <div class="payment-summary cash-summary">
                  <div class="payment-summary-icon">
                    <ion-icon :icon="cashOutline" />
                  </div>

                  <div class="payment-summary-copy">
                    <span>Total pembayaran</span>
                    <strong>{{ formattedLotPrice }}</strong>
                    <small>Dibayar penuh / satu kali pembayaran</small>
                  </div>
                </div>
              </div>
            <!-- TENOR + MONTHLY PAYMENT -->
            <div
              v-if="form.paymentMethod === 'Installment'"
              class="tenor-section"
            >
              <div class="tenor-heading">
                <div>
                  <label>
                    Rencana Tenor <span>*</span>
                  </label>

                  <p>
                    Pilihan tenor mengikuti kolom
                    <code>payment_plans.months</code>.
                  </p>
                </div>

                <span
                  v-if="paymentPlans.length"
                  class="option-count"
                >
                  {{ paymentPlans.length }} pilihan
                </span>
              </div>

              <div
                v-if="paymentPlansLoading"
                class="tenor-loading"
              >
                <ion-spinner name="crescent" />
                <span>Memuat rencana tenor...</span>
              </div>

              <div
                v-else-if="paymentPlansError"
                class="tenor-error"
              >
                <ion-icon :icon="alertCircleOutline" />

                <div>
                  <strong>Tenor belum dapat dimuat</strong>
                  <span>{{ paymentPlansError }}</span>
                </div>

                <button
                  type="button"
                  @click="loadPaymentPlans"
                >
                  Coba lagi
                </button>
              </div>

              <div
                v-else-if="paymentPlans.length"
                class="tenor-options"
              >
                <button
                  v-for="plan in paymentPlans"
                  :key="plan.id"
                  type="button"
                  class="tenor-option"
                  :class="{ selected: form.paymentPlanId === plan.id }"
                  :aria-pressed="form.paymentPlanId === plan.id"
                  @click="selectPlan(plan)"
                >
                  <span class="tenor-radio">
                    <span></span>
                  </span>

                  <span class="tenor-copy">
                    <strong>{{ formatMonths(plan.months) }}</strong>
                    <small>{{ plan.plan_name }}</small>
                  </span>

                  <span class="tenor-price">
                    {{
                      getInstallmentForPlan(plan.id)
                        ? formatCurrency(
                            getInstallmentForPlan(plan.id)?.monthly_payment
                          )
                        : 'Belum tersedia'
                    }}
                    <small>/ bulan</small>
                  </span>

                  <ion-icon
                    v-if="form.paymentPlanId === plan.id"
                    :icon="checkmarkCircleOutline"
                    class="tenor-check"
                  />
                </button>
              </div>

              <div
                v-else
                class="empty-plans"
              >
                <ion-icon :icon="informationCircleOutline" />

                <span>
                  Belum ada rencana tenor pada tabel
                  <strong>payment_plans</strong>.
                </span>
              </div>

              <div
                v-if="selectedPlan"
                class="selected-plan"
              >
                <div class="selected-plan-icon">
                  <ion-icon :icon="checkmarkOutline" />
                </div>

                <div>
                  <span>Skema pembayaran</span>

                  <strong>
                    {{ formatMonths(selectedPlan.months) }}
                  </strong>

                  <small>
                    {{ selectedPlan.plan_name }}
                  </small>
                </div>

                <div class="selected-plan-monthly">
                  <span>Bayar per bulan</span>

                  <strong>
                    {{
                      selectedInstallment
                        ? formatCurrency(selectedInstallment.monthly_payment)
                        : 'Belum tersedia'
                    }}
                  </strong>
                </div>
              </div>

              <div
                v-if="selectedPlan && !selectedInstallment"
                class="installment-warning"
              >
                <ion-icon :icon="alertCircleOutline" />
                <span>
                  Skema cicilan untuk tenor ini belum tersedia pada
                  <strong>lot_installments</strong>.
                </span>
              </div>
            </div>
          </div>
          </div>
        </section>


        <!-- =================================================
             DOKUMEN
             ================================================= -->
        <section class="form-card">

          <div class="card-heading">
            <div class="heading-icon">
              <ion-icon :icon="documentTextOutline" />
            </div>

            <div class="heading-copy">
              <span class="section-kicker">03</span>
              <h2>Dokumen Pendukung</h2>
              <p>
                Lampirkan dokumen yang diperlukan untuk proses validasi.
              </p>
            </div>
          </div>

          <div class="card-body">

            <div class="upload-note">
              <ion-icon :icon="informationCircleOutline" />

              <span>
                Format JPG, PNG atau PDF. Ukuran maksimal 5 MB per file.
              </span>
            </div>


            <div class="document-body">

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
                label="Bukti Pembayaran"
                required
                wide
                accept=".jpg,.jpeg,.png,.pdf"
                :file="files.paymentProof"
                @change="files.paymentProof = $event"
              />

            </div>

          </div>
        </section>


        <!-- =================================================
             CATATAN
             ================================================= -->
        <section class="form-card">

          <div class="card-heading">
            <div class="heading-icon">
              <ion-icon :icon="createOutline" />
            </div>

            <div class="heading-copy">
              <span class="section-kicker">04</span>
              <h2>Catatan</h2>
              <p>Tambahkan informasi tambahan bila diperlukan.</p>
            </div>
          </div>

          <div class="card-body">

            <div class="label-row">
              <label for="notes">
                Catatan Tambahan
              </label>

              <span class="counter">
                {{ form.notes.length }}/500
              </span>
            </div>

            <textarea
              id="notes"
              v-model.trim="form.notes"
              class="notes-input"
              maxlength="500"
              rows="4"
              placeholder="Contoh: calon pembeli meminta jadwal tindak lanjut pada..."
            ></textarea>

          </div>
        </section>


        <!-- =================================================
             FINAL SUMMARY
             ================================================= -->
        <section class="confirmation-card">

          <div class="confirmation-heading">
            <div>
              <span class="eyebrow">SEBELUM DIKIRIM</span>
              <h2>Periksa kembali pengajuan</h2>
            </div>

            <ion-icon :icon="shieldCheckmarkOutline" />
          </div>

          <div class="confirmation-grid">

            <div>
              <span>Calon Pembeli</span>
              <strong>
                {{ form.fullName || 'Belum diisi' }}
              </strong>
            </div>

            <div>
              <span>Kavling</span>
              <strong>
                {{ lot.lot_number ? formatLotNumber(lot.lot_number) : 'Belum dipilih' }}
              </strong>
            </div>

            <div>
              <span>Skema</span>
              <strong>
                {{
                  form.paymentMethod === 'Installment'
                    ? 'Cicilan'
                    : 'Cash'
                }}
              </strong>
            </div>

            <div>
              <span>Tenor</span>
              <strong>
                {{
                  selectedPlan
                    ? `${selectedPlan.months} bulan`
                    : '—'
                }}
              </strong>
            </div>

          </div>

          <div class="confirmation-notice">
            <ion-icon :icon="informationCircleOutline" />

            <p>
              Setelah diajukan, data SPK akan masuk ke proses
              validasi Admin. Pastikan data pembeli dan dokumen
              sudah benar sebelum mengirim.
            </p>
          </div>

        </section>


        <!-- =================================================
             SUBMIT
             ================================================= -->
        <button
          type="button"
          class="submit-button"
          :disabled="submitting || !canSubmit"
          @click="submitSPK"
        >
          <ion-spinner
            v-if="submitting"
            name="crescent"
          />

          <template v-else>
            <span>Ajukan SPK</span>
            <ion-icon :icon="arrowForwardOutline" />
          </template>
        </button>


        <p
          v-if="successMessage"
          class="feedback-message success-message"
        >
          <ion-icon :icon="checkmarkCircleOutline" />
          {{ successMessage }}
        </p>


        <p
          v-if="submitError"
          class="feedback-message submit-error"
        >
          <ion-icon :icon="alertCircleOutline" />
          {{ submitError }}
        </p>

      </main>
    </ion-content>


    <!-- =====================================================
         MARKETING BOTTOM NAVIGATION
         ===================================================== -->
    <MobileTabBar
      variant="marketing"
      active="calon-pembeli"
    />

  </ion-page>
</template>


<script setup lang="ts">
import {
  computed,
  onMounted,
  reactive,
  ref,
  watch,
} from 'vue'

import {
  IonPage,
  IonContent,
  IonIcon,
  IonSpinner,
} from '@ionic/vue'

import {
  useRoute,
} from 'vue-router'

import {
  alertCircleOutline,
  arrowForwardOutline,
  callOutline,
  cardOutline,
  cashOutline,
  checkmarkCircleOutline,
  checkmarkOutline,
  createOutline,
  documentTextOutline,
  informationCircleOutline,
  locationOutline,
  lockClosedOutline,
  mailOutline,
  mapOutline,
  personOutline,
  shieldCheckmarkOutline,
} from 'ionicons/icons'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'

import {
  formatLotNumber,
  getLotById,
  getLotByNumber,
  getLotInstallments,
  getPaymentPlans,
  type Lot,
  type LotInstallment,
  type PaymentPlan,
} from '../../services/marketing/spkService'


/* =========================================================
   ROUTE INPUT
   ========================================================= */

const route = useRoute()

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

const form = reactive({
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
  if (months >= 12) {
    const years = months / 12

    if (Number.isInteger(years)) {
      return `${years} Tahun`
    }
  }

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
        'Kavling tidak ditemukan atau sudah tidak tersedia.'
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
      'Gagal memuat data kavling.'
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
      'Gagal memuat skema cicilan kavling.'
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

  submitting.value = true

  try {
    const payload = {
      lot_id: lot.id,

      customer: {
        full_name: form.fullName,
        phone: form.phone,
        email: form.email || null,
        address: form.address,
      },

      lot: {
        lot_number: lot.lot_number,
        price: selectedPrice.value,
      },

      payment: {
        method: form.paymentMethod,
        payment_plan_id:
          form.paymentMethod === 'Installment'
            ? form.paymentPlanId
            : null,

        months:
          form.paymentMethod === 'Installment'
            ? selectedPlan.value?.months ?? null
            : null,

        monthly_payment:
          form.paymentMethod === 'Installment'
            ? selectedInstallment.value?.monthly_payment ?? null
            : null,
      },

      notes:
        form.notes || null,

      documents: {
        ktp:
          files.ktp?.name ??
          null,

        kk:
          files.kk?.name ??
          null,

        npwp:
          files.npwp?.name ??
          null,

        payment_proof:
          files.paymentProof?.name ??
          null,
      },
    }

    /*
     * INSERT SPK belum dilakukan karena struktur tabel SPK
     * belum diberikan. Payload ini sudah siap untuk
     * dihubungkan ke service INSERT nantinya.
     */
    console.log(
      'SPK payload:',
      payload,
    )

    await new Promise(resolve =>
      setTimeout(resolve, 500),
    )

    successMessage.value =
      'Pengajuan SPK berhasil disiapkan dan menunggu validasi Admin.'

  } catch (error) {
    console.error(error)

    submitError.value =
      'Pengajuan SPK gagal diproses.'
  } finally {
    submitting.value = false
  }
}


/* =========================================================
   INIT
   ========================================================= */

onMounted(async () => {
  await Promise.all([
    loadLot(),
    loadPaymentPlans(),
  ])
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
                        [
                          props.label,
                          props.required
                            ? ' *'
                            : '',
                        ],
                      ),

                      h(
                        'small',
                        null,
                        props.file
                          ? 'Dokumen sudah dipilih'
                          : 'JPG, PNG atau PDF • Maks. 5 MB',
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
                        hidden: true,
                        onChange:
                          handleChange,
                      }),

                      h(
                        DocumentIonIcon,
                        {
                          icon:
                            cloudUploadOutline,
                        },
                      ),

                      h(
                        'span',
                        null,
                        'Pilih File',
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
/* =========================================================
   PAGE
   ========================================================= */

.spk-page {
  --background: #f7f7f5;

  background:
    #f7f7f5;

  color:
    #1f1f1f;
}


.spk-content {
  --background:
    #f7f7f5;

  background:
    #f7f7f5;
}


/* =========================================================
   MAIN CONTAINER
   ========================================================= */

.spk-container {
  width:
    100%;

  max-width:
    820px;

  margin:
    0 auto;

  padding:
    24px 20px 120px;

  box-sizing:
    border-box;
}


/* =========================================================
   PAGE INTRO
   ========================================================= */

.page-intro {
  display:
    flex;

  align-items:
    flex-end;

  justify-content:
    space-between;

  gap:
    20px;

  margin-bottom:
    18px;
}


.page-intro-copy {
  min-width:
    0;
}


.eyebrow {
  display:
    inline-block;

  margin-bottom:
    5px;

  color:
    #b08b43;

  font-size:
    10px;

  font-weight:
    800;

  letter-spacing:
    1.2px;
}


.page-intro h1 {
  margin:
    0;

  color:
    #222222;

  font-size:
    clamp(25px, 4vw, 34px);

  line-height:
    1.12;

  font-weight:
    850;

  letter-spacing:
    -0.8px;
}


.page-intro p {
  max-width:
    610px;

  margin:
    7px 0 0;

  color:
    #777777;

  font-size:
    14px;

  line-height:
    1.5;
}


.progress-chip {
  flex:
    0 0 auto;

  display:
    inline-flex;

  align-items:
    center;

  gap:
    6px;

  padding:
    8px 11px;

  border:
    1px solid
    #e8ddc8;

  border-radius:
    999px;

  background:
    #fffaf0;

  color:
    #9d7d40;

  font-size:
    12px;

  font-weight:
    700;

  white-space:
    nowrap;
}


.progress-chip ion-icon {
  font-size:
    16px;
}


/* =========================================================
   FORM PROGRESS
   ========================================================= */

.form-progress {
  display:
    flex;

  align-items:
    center;

  width:
    100%;

  margin-bottom:
    18px;

  padding:
    12px 14px;

  box-sizing:
    border-box;

  border:
    1px solid
    #ece7dc;

  border-radius:
    14px;

  background:
    rgba(255, 255, 255, 0.82);

  box-shadow:
    0 2px 7px
    rgba(0, 0, 0, 0.025);
}


.progress-step {
  display:
    flex;

  align-items:
    center;

  gap:
    8px;

  min-width:
    0;

  opacity:
    0.48;
}


.progress-step.active {
  opacity:
    1;
}


.step-number {
  flex:
    0 0 30px;

  width:
    30px;

  height:
    30px;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  border:
    1px solid
    #d9d9d9;

  border-radius:
    50%;

  background:
    #ffffff;

  color:
    #888888;

  font-size:
    12px;

  font-weight:
    800;
}


.progress-step.active .step-number {
  border-color:
    #c5a55a;

  background:
    #c5a55a;

  color:
    #ffffff;
}


.progress-step div {
  display:
    flex;

  flex-direction:
    column;

  min-width:
    0;
}


.progress-step strong {
  color:
    #333333;

  font-size:
    12px;

  line-height:
    1.2;
}


.progress-step small {
  margin-top:
    2px;

  color:
    #999999;

  font-size:
    10px;

  line-height:
    1.2;
}


.progress-line {
  flex:
    1;

  height:
    1px;

  min-width:
    15px;

  margin:
    0 10px;

  background:
    #dedbd3;
}


/* =========================================================
   FORM CARD
   ========================================================= */

.form-card {
  overflow:
    hidden;

  margin-bottom:
    18px;

  border:
    1px solid
    rgba(0, 0, 0, 0.035);

  border-radius:
    16px;

  background:
    #ffffff;

  box-shadow:
    0 3px 12px
    rgba(0, 0, 0, 0.035);
}


.card-heading {
  display:
    flex;

  align-items:
    center;

  gap:
    13px;

  min-height:
    78px;

  padding:
    13px 20px;

  box-sizing:
    border-box;

  background:
    #fcf9f2;

  border-bottom:
    1px solid
    #f2ecdf;
}


.heading-icon {
  flex:
    0 0 48px;

  width:
    48px;

  height:
    48px;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  border-radius:
    13px;

  background:
    #f5ead1;

  color:
    #a1813f;

  font-size:
    25px;
}


.heading-copy {
  flex:
    1;

  min-width:
    0;
}


.section-kicker {
  display:
    block;

  margin-bottom:
    2px;

  color:
    #b18d4a;

  font-size:
    9px;

  font-weight:
    800;

  letter-spacing:
    1px;
}


.card-heading h2 {
  margin:
    0;

  color:
    #9c7b3e;

  font-size:
    20px;

  line-height:
    1.2;

  font-weight:
    800;

  letter-spacing:
    -0.2px;
}


.card-heading p {
  margin:
    3px 0 0;

  color:
    #8d8d8d;

  font-size:
    12px;

  line-height:
    1.35;
}


.required-note {
  align-self:
    flex-start;

  margin-top:
    3px;

  color:
    #9c9c9c;

  font-size:
    10px;

  white-space:
    nowrap;
}


.card-body {
  padding:
    22px 24px 25px;

  box-sizing:
    border-box;
}


/* =========================================================
   FORM GRID
   ========================================================= */

.form-grid {
  display:
    grid;

  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap:
    20px 22px;
}


.field-full {
  grid-column:
    1 / -1;
}


.field-group {
  min-width:
    0;
}


.field-group > label,
.label-row label {
  display:
    block;

  margin:
    0 0 8px;

  color:
    #222222;

  font-size:
    14px;

  line-height:
    1.25;

  font-weight:
    750;
}


.field-group label span {
  color:
    #d53232;
}


.field-group label small {
  color:
    #858585;

  font-size:
    11px;

  font-weight:
    500;
}


.label-row {
  display:
    flex;

  align-items:
    center;

  justify-content:
    space-between;

  gap:
    10px;
}


.label-row label {
  margin-bottom:
    8px;
}


.counter {
  flex:
    0 0 auto;

  color:
    #9b9b9b;

  font-size:
    10px;
}


/* =========================================================
   INPUT
   ========================================================= */

.field-shell {
  display:
    flex;

  align-items:
    center;

  gap:
    11px;

  min-height:
    52px;

  padding:
    0 13px;

  box-sizing:
    border-box;

  border:
    1px solid
    #e0e0e0;

  border-radius:
    11px;

  background:
    #ffffff;

  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease,
    background 0.15s ease;
}


.field-shell:focus-within {
  border-color:
    #c5a55a;

  box-shadow:
    0 0 0 3px
    rgba(197, 165, 90, 0.10);
}


.field-shell.filled {
  background:
    #fffefa;
}


.field-shell > ion-icon {
  flex:
    0 0 21px;

  color:
    #c5a55a;

  font-size:
    21px;
}


.field-shell input,
.field-shell textarea {
  flex:
    1;

  width:
    100%;

  min-width:
    0;

  border:
    0;

  outline:
    0;

  background:
    transparent;

  color:
    #252525;

  font-family:
    inherit;

  font-size:
    14px;

  line-height:
    1.45;
}


.field-shell input::placeholder,
.field-shell textarea::placeholder {
  color:
    #a4a4a4;

  opacity:
    1;
}


.textarea-shell {
  align-items:
    flex-start;

  padding-top:
    12px;

  padding-bottom:
    12px;
}


.textarea-shell ion-icon {
  margin-top:
    1px;
}


.textarea-shell textarea {
  min-height:
    74px;

  resize:
    vertical;
}


/* =========================================================
   LOT SUMMARY
   ========================================================= */

.lot-summary {
  display:
    flex;

  align-items:
    center;

  justify-content:
    space-between;

  gap:
    20px;

  margin-bottom:
    22px;

  padding:
    17px 18px;

  box-sizing:
    border-box;

  border:
    1px solid
    #eadfca;

  border-radius:
    14px;

  background:
    linear-gradient(
      135deg,
      #fffaf0,
      #fffdf9
    );
}


.lot-main {
  min-width:
    0;
}


.summary-label {
  display:
    block;

  margin-bottom:
    4px;

  color:
    #ae8b4b;

  font-size:
    9px;

  font-weight:
    800;

  letter-spacing:
    1px;
}


.lot-main > strong {
  display:
    block;

  color:
    #9c7b3e;

  font-size:
    23px;

  line-height:
    1.15;

  font-weight:
    850;
}


.lot-tags {
  display:
    flex;

  flex-wrap:
    wrap;

  gap:
    5px;

  margin-top:
    7px;
}


.lot-tags span {
  padding:
    4px 7px;

  border-radius:
    6px;

  background:
    #f1e9d9;

  color:
    #756546;

  font-size:
    10px;

  line-height:
    1.2;
}


.lot-price {
  flex:
    0 0 auto;

  padding-left:
    15px;

  border-left:
    1px solid
    #eadfca;

  text-align:
    right;
}


.lot-price span {
  display:
    block;

  margin-bottom:
    4px;

  color:
    #999999;

  font-size:
    10px;
}


.lot-price strong {
  display:
    block;

  color:
    #222222;

  font-size:
    18px;

  line-height:
    1.2;

  font-weight:
    850;
}


.lot-price small {
  display:
    block;

  margin-top:
    3px;

  color:
    #b08b43;

  font-size:
    10px;
}


.lot-state {
  display:
    flex;

  align-items:
    center;

  gap:
    9px;

  margin-bottom:
    20px;

  padding:
    13px 14px;

  border-radius:
    11px;

  background:
    #f8f8f6;

  color:
    #777777;

  font-size:
    12px;
}


.lot-state.error {
  align-items:
    flex-start;

  background:
    #fff5f3;

  color:
    #9b5b50;
}


.lot-state.error ion-icon {
  flex:
    0 0 auto;

  font-size:
    19px;
}


.lot-state.error div {
  display:
    flex;

  flex-direction:
    column;

  gap:
    2px;
}


.lot-state.error strong {
  color:
    #8d4d42;

  font-size:
    12px;
}


/* =========================================================
   PRICE FIELD
   ========================================================= */

.price-field {
  display:
    flex;

  align-items:
    center;

  gap:
    11px;

  min-height:
    66px;

  padding:
    9px 12px;

  box-sizing:
    border-box;

  border:
    1px solid
    #ece8df;

  border-radius:
    11px;

  background:
    #faf9f6;
}


.price-icon {
  flex:
    0 0 38px;

  width:
    38px;

  height:
    38px;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  border-radius:
    9px;

  background:
    #f1e5ca;

  color:
    #ad8841;

  font-size:
    19px;
}


.price-copy {
  flex:
    1;

  min-width:
    0;

  display:
    flex;

  flex-direction:
    column;

  gap:
    2px;
}


.price-copy span {
  color:
    #929292;

  font-size:
    10px;
}


.price-copy strong {
  overflow:
    hidden;

  color:
    #333333;

  font-size:
    16px;

  line-height:
    1.2;

  font-weight:
    800;

  text-overflow:
    ellipsis;

  white-space:
    nowrap;
}


.readonly-icon {
  flex:
    0 0 auto;

  color:
    #aaaaaa;

  font-size:
    17px;
}


.field-hint {
  margin:
    6px 1px 0;

  color:
    #999999;

  font-size:
    10px;

  line-height:
    1.4;
}


/* =========================================================
   SELECT
   ========================================================= */

.select-shell {
  display:
    flex;

  align-items:
    center;

  gap:
    11px;

  min-height:
    52px;

  padding:
    0 10px 0 13px;

  box-sizing:
    border-box;

  border:
    1px solid
    #e0e0e0;

  border-radius:
    11px;

  background:
    #ffffff;
}


.select-shell:focus-within {
  border-color:
    #c5a55a;
}


.select-shell > ion-icon {
  flex:
    0 0 21px;

  color:
    #c5a55a;

  font-size:
    21px;
}


.select-shell ion-select {
  flex:
    1;

  min-width:
    0;

  --padding-start:
    0;

  --padding-end:
    0;

  --padding-top:
    0;

  --padding-bottom:
    0;

  color:
    #4c4c4c;

  font-size:
    14px;
}


/* =========================================================
   PAYMENT METHOD
   ========================================================= */

.payment-method-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.payment-method-option {
  min-width: 0;
  min-height: 76px;
  display: flex;
  align-items: center;
  gap: 11px;
  padding: 12px 14px;
  border: 1px solid #e1e1e1;
  border-radius: 12px;
  background: #ffffff;
  color: #444444;
  cursor: pointer;
  text-align: left;
  box-sizing: border-box;
  transition: border-color 0.15s ease, background 0.15s ease, transform 0.12s ease;
}

.payment-method-option:hover {
  border-color: #d4bd86;
}

.payment-method-option:active {
  transform: scale(0.985);
}

.payment-method-option.selected {
  border-color: #c5a55a;
  background: #fffaf0;
  box-shadow: inset 0 0 0 1px rgba(197, 165, 90, 0.12);
}

.payment-method-icon {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 10px;
  background: #f7f1e4;
  color: #b08b43;
  font-size: 21px;
}

.payment-method-copy {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.payment-method-copy strong {
  color: #333333;
  font-size: 14px;
  font-weight: 800;
}

.payment-method-copy small {
  color: #929292;
  font-size: 10px;
  line-height: 1.3;
}

.payment-method-check {
  flex: 0 0 auto;
  color: #c5a55a;
  font-size: 19px;
}

.payment-summary {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border: 1px solid #eadfca;
  border-radius: 12px;
  background: #fffaf0;
  box-sizing: border-box;
}

.payment-summary-icon {
  width: 42px;
  height: 42px;
  flex: 0 0 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 11px;
  background: #f1e4c8;
  color: #b08b43;
  font-size: 21px;
}

.payment-summary-copy {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.payment-summary-copy span {
  color: #8b806f;
  font-size: 10px;
  font-weight: 700;
}

.payment-summary-copy strong {
  overflow: hidden;
  color: #9c7b3e;
  font-size: clamp(18px, 3vw, 24px);
  font-weight: 850;
  line-height: 1.15;
  text-overflow: ellipsis;
}

.payment-summary-copy small {
  color: #8e8e8e;
  font-size: 10px;
}

.tenor-price {
  flex: 0 0 auto;
  max-width: 145px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  color: #9c7b3e;
  font-size: 11px;
  font-weight: 800;
  text-align: right;
  line-height: 1.2;
}

.tenor-price small {
  color: #9a9a9a;
  font-size: 9px;
  font-weight: 600;
}

.installment-warning {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-top: 10px;
  padding: 10px 12px;
  border: 1px solid #ead9b4;
  border-radius: 10px;
  background: #fff9eb;
  color: #806c47;
  font-size: 11px;
  line-height: 1.45;
}

.installment-warning ion-icon {
  flex: 0 0 auto;
  margin-top: 1px;
  color: #b08b43;
  font-size: 17px;
}

.installment-warning strong {
  font-weight: 800;
}

/* =========================================================
   TENOR
   ========================================================= */

.tenor-section {
  margin-top:
    23px;

  padding-top:
    20px;

  border-top:
    1px solid
    #efede8;
}


.tenor-heading {
  display:
    flex;

  align-items:
    flex-start;

  justify-content:
    space-between;

  gap:
    15px;

  margin-bottom:
    12px;
}


.tenor-heading label {
  display:
    block;

  margin-bottom:
    3px;

  color:
    #222222;

  font-size:
    14px;

  font-weight:
    750;
}


.tenor-heading label span {
  color:
    #d53232;
}


.tenor-heading p {
  margin:
    0;

  color:
    #999999;

  font-size:
    10px;

  line-height:
    1.4;
}


.tenor-heading code {
  padding:
    2px 4px;

  border-radius:
    4px;

  background:
    #f2efe8;

  color:
    #816c45;

  font-size:
    9px;
}


.option-count {
  flex:
    0 0 auto;

  padding:
    5px 8px;

  border-radius:
    7px;

  background:
    #f7f1e4;

  color:
    #9c7b3e;

  font-size:
    10px;

  font-weight:
    700;

  white-space:
    nowrap;
}


.tenor-options {
  display:
    grid;

  grid-template-columns:
    repeat(
      auto-fit,
      minmax(145px, 1fr)
    );

  gap:
    10px;
}


.tenor-option {
  position:
    relative;

  display:
    flex;

  align-items:
    center;

  gap:
    9px;

  min-width:
    0;

  min-height:
    68px;

  padding:
    10px 11px;

  box-sizing:
    border-box;

  border:
    1px solid
    #e1e1e1;

  border-radius:
    11px;

  background:
    #ffffff;

  color:
    #444444;

  cursor:
    pointer;

  text-align:
    left;

  transition:
    border-color 0.15s ease,
    background 0.15s ease,
    transform 0.12s ease;
}


.tenor-option:hover {
  border-color:
    #d4bd86;
}


.tenor-option:active {
  transform:
    scale(0.985);
}


.tenor-option.selected {
  border-color:
    #c5a55a;

  background:
    #fffaf0;

  box-shadow:
    inset 0 0 0 1px
    rgba(197, 165, 90, 0.12);
}


.tenor-radio {
  flex:
    0 0 19px;

  width:
    19px;

  height:
    19px;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  border:
    2px solid
    #bcbcbc;

  border-radius:
    50%;

  box-sizing:
    border-box;
}


.tenor-option.selected .tenor-radio {
  border-color:
    #c5a55a;
}


.tenor-radio span {
  width:
    9px;

  height:
    9px;

  border-radius:
    50%;

  background:
    transparent;
}


.tenor-option.selected .tenor-radio span {
  background:
    #c5a55a;
}


.tenor-copy {
  flex:
    1;

  min-width:
    0;

  display:
    flex;

  flex-direction:
    column;

  gap:
    2px;
}


.tenor-copy strong {
  color:
    #333333;

  font-size:
    14px;

  line-height:
    1.2;

  font-weight:
    800;
}


.tenor-copy small {
  overflow:
    hidden;

  color:
    #969696;

  font-size:
    10px;

  line-height:
    1.25;

  text-overflow:
    ellipsis;

  white-space:
    nowrap;
}


.tenor-option.selected .tenor-copy strong {
  color:
    #9c7b3e;
}


.tenor-check {
  flex:
    0 0 auto;

  color:
    #c5a55a;

  font-size:
    18px;
}


.tenor-loading,
.empty-plans,
.tenor-error {
  display:
    flex;

  align-items:
    center;

  gap:
    9px;

  min-height:
    48px;

  padding:
    10px 12px;

  box-sizing:
    border-box;

  border-radius:
    10px;

  background:
    #f8f8f6;

  color:
    #777777;

  font-size:
    11px;

  line-height:
    1.4;
}


.tenor-error {
  align-items:
    flex-start;

  background:
    #fff5f3;

  color:
    #9b5b50;
}


.tenor-error ion-icon {
  flex:
    0 0 auto;

  margin-top:
    1px;

  font-size:
    18px;
}


.tenor-error div {
  flex:
    1;

  min-width:
    0;

  display:
    flex;

  flex-direction:
    column;
}


.tenor-error strong {
  color:
    #8d4d42;

  font-size:
    11px;
}


.tenor-error button {
  flex:
    0 0 auto;

  padding:
    6px 9px;

  border:
    1px solid
    #dfb6ae;

  border-radius:
    7px;

  background:
    #ffffff;

  color:
    #9b5b50;

  font-family:
    inherit;

  font-size:
    10px;

  font-weight:
    700;

  cursor:
    pointer;
}


.empty-plans ion-icon {
  flex:
    0 0 auto;

  color:
    #b08b43;

  font-size:
    18px;
}


.selected-plan {
  display:
    flex;

  align-items:
    center;

  gap:
    10px;

  margin-top:
    10px;

  padding:
    10px 11px;

  border:
    1px solid
    #e7d9b9;

  border-radius:
    10px;

  background:
    #fffaf0;
}


.selected-plan-icon {
  flex:
    0 0 28px;

  width:
    28px;

  height:
    28px;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  border-radius:
    8px;

  background:
    #c5a55a;

  color:
    #ffffff;

  font-size:
    15px;
}


.selected-plan > div:nth-child(2) {
  flex:
    1;

  min-width:
    0;

  display:
    flex;

  flex-direction:
    column;

  gap:
    1px;
}


.selected-plan > div:nth-child(2) span {
  color:
    #9c9c9c;

  font-size:
    9px;
}


.selected-plan > div:nth-child(2) strong {
  overflow:
    hidden;

  color:
    #9c7b3e;

  font-size:
    12px;

  text-overflow:
    ellipsis;

  white-space:
    nowrap;
}


.selected-plan-monthly {
  flex:
    0 0 auto;

  color:
    #80683f;

  font-size:
    11px;

  font-weight:
    800;
}


/* =========================================================
   DOCUMENTS
   ========================================================= */

.upload-note {
  display:
    flex;

  align-items:
    center;

  gap:
    7px;

  margin-bottom:
    15px;

  padding:
    9px 11px;

  border-radius:
    9px;

  background:
    #f8f7f3;

  color:
    #858585;

  font-size:
    10px;

  line-height:
    1.35;
}


.upload-note ion-icon {
  flex:
    0 0 auto;

  color:
    #b08b43;

  font-size:
    17px;
}


.document-body {
  display:
    grid;

  grid-template-columns:
    repeat(3, minmax(0, 1fr));

  gap:
    12px;
}


.document-upload {
  min-width:
    0;

  padding:
    13px;

  box-sizing:
    border-box;

  border:
    1px dashed
    #d8d3c7;

  border-radius:
    12px;

  background:
    #fcfcfa;

  transition:
    border-color 0.15s ease,
    background 0.15s ease;
}


.document-upload.has-file {
  border-style:
    solid;

  border-color:
    #d7bd82;

  background:
    #fffaf0;
}


.document-upload-wide {
  grid-column:
    1 / -1;
}


.document-upload-header {
  display:
    flex;

  align-items:
    center;

  gap:
    9px;

  min-width:
    0;
}


.document-upload-icon {
  flex:
    0 0 34px;

  width:
    34px;

  height:
    34px;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  border-radius:
    9px;

  background:
    #f4ead5;

  color:
    #b08b43;

  font-size:
    18px;
}


.document-upload-title {
  flex:
    1;

  min-width:
    0;

  display:
    flex;

  flex-direction:
    column;

  gap:
    2px;
}


.document-upload-title strong {
  overflow:
    hidden;

  color:
    #333333;

  font-size:
    12px;

  line-height:
    1.2;

  text-overflow:
    ellipsis;

  white-space:
    nowrap;
}


.document-upload-title small {
  overflow:
    hidden;

  color:
    #999999;

  font-size:
    9px;

  line-height:
    1.25;

  text-overflow:
    ellipsis;

  white-space:
    nowrap;
}


.document-upload-button {
  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  gap:
    5px;

  min-height:
    34px;

  margin-top:
    10px;

  border:
    1px solid
    #e2d5b9;

  border-radius:
    8px;

  background:
    #ffffff;

  color:
    #ad8841;

  font-size:
    10px;

  font-weight:
    700;

  cursor:
    pointer;
}


.document-upload-button ion-icon {
  font-size:
    17px;
}


.selected-file {
  display:
    flex;

  align-items:
    center;

  gap:
    8px;

  margin-top:
    10px;
}


.file-name {
  flex:
    1;

  min-width:
    0;

  display:
    flex;

  align-items:
    center;

  gap:
    5px;

  color:
    #80683f;

  font-size:
    10px;
}


.file-name ion-icon {
  flex:
    0 0 auto;

  font-size:
    16px;
}


.file-name span {
  overflow:
    hidden;

  text-overflow:
    ellipsis;

  white-space:
    nowrap;
}


.remove-file {
  flex:
    0 0 29px;

  width:
    29px;

  height:
    29px;

  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  border:
    1px solid
    #e2caca;

  border-radius:
    7px;

  background:
    #fff7f7;

  color:
    #b26a6a;

  cursor:
    pointer;
}


.remove-file ion-icon {
  font-size:
    15px;
}


/* =========================================================
   NOTES
   ========================================================= */

.notes-input {
  display:
    block;

  width:
    100%;

  min-height:
    100px;

  padding:
    12px 13px;

  box-sizing:
    border-box;

  border:
    1px solid
    #e0e0e0;

  border-radius:
    11px;

  outline:
    none;

  resize:
    vertical;

  background:
    #ffffff;

  color:
    #252525;

  font-family:
    inherit;

  font-size:
    14px;

  line-height:
    1.5;
}


.notes-input:focus {
  border-color:
    #c5a55a;

  box-shadow:
    0 0 0 3px
    rgba(197, 165, 90, 0.10);
}


.notes-input::placeholder {
  color:
    #a4a4a4;
}


/* =========================================================
   CONFIRMATION
   ========================================================= */

.confirmation-card {
  margin:
    4px 0 14px;

  padding:
    18px;

  box-sizing:
    border-box;

  border:
    1px solid
    #e8ddc8;

  border-radius:
    16px;

  background:
    #fffaf0;
}


.confirmation-heading {
  display:
    flex;

  align-items:
    flex-start;

  justify-content:
    space-between;

  gap:
    15px;

  margin-bottom:
    15px;
}


.confirmation-heading .eyebrow {
  margin-bottom:
    3px;
}


.confirmation-heading h2 {
  margin:
    0;

  color:
    #8e703a;

  font-size:
    18px;

  line-height:
    1.2;

  font-weight:
    800;
}


.confirmation-heading > ion-icon {
  flex:
    0 0 auto;

  color:
    #c5a55a;

  font-size:
    27px;
}


.confirmation-grid {
  display:
    grid;

  grid-template-columns:
    repeat(4, minmax(0, 1fr));

  gap:
    8px;
}


.confirmation-grid > div {
  min-width:
    0;

  padding:
    10px;

  border:
    1px solid
    #eee2cb;

  border-radius:
    9px;

  background:
    rgba(255,255,255,0.58);
}


.confirmation-grid span {
  display:
    block;

  margin-bottom:
    4px;

  color:
    #9d957f;

  font-size:
    9px;
}


.confirmation-grid strong {
  display:
    block;

  overflow:
    hidden;

  color:
    #4d4433;

  font-size:
    11px;

  line-height:
    1.25;

  text-overflow:
    ellipsis;

  white-space:
    nowrap;
}


.confirmation-notice {
  display:
    flex;

  align-items:
    flex-start;

  gap:
    7px;

  margin-top:
    12px;

  padding-top:
    11px;

  border-top:
    1px solid
    #eadfca;
}


.confirmation-notice ion-icon {
  flex:
    0 0 auto;

  color:
    #b08b43;

  font-size:
    17px;
}


.confirmation-notice p {
  margin:
    0;

  color:
    #7e7768;

  font-size:
    10px;

  line-height:
    1.5;
}


/* =========================================================
   SUBMIT
   ========================================================= */

.submit-button {
  display:
    flex;

  align-items:
    center;

  justify-content:
    center;

  gap:
    8px;

  width:
    100%;

  min-height:
    54px;

  margin-top:
    4px;

  padding:
    10px 18px;

  border:
    0;

  border-radius:
    12px;

  background:
    #c5a55a;

  color:
    #ffffff;

  font-family:
    inherit;

  font-size:
    15px;

  font-weight:
    800;

  cursor:
    pointer;

  box-shadow:
    0 5px 13px
    rgba(197, 165, 90, 0.20);

  transition:
    transform 0.12s ease,
    opacity 0.15s ease;
}


.submit-button ion-icon {
  font-size:
    19px;
}


.submit-button:not(:disabled):active {
  transform:
    scale(0.985);
}


.submit-button:disabled {
  opacity:
    0.48;

  cursor:
    not-allowed;

  box-shadow:
    none;
}


.feedback-message {
  display:
    flex;

  align-items:
    flex-start;

  justify-content:
    center;

  gap:
    6px;

  margin:
    10px 4px 0;

  text-align:
    center;

  font-size:
    11px;

  line-height:
    1.4;
}


.feedback-message ion-icon {
  flex:
    0 0 auto;

  margin-top:
    1px;

  font-size:
    16px;
}


.success-message {
  color:
    #657858;
}


.submit-error {
  color:
    #b14d4d;
}


/* =========================================================
   TABLET / MOBILE
   ========================================================= */

@media (max-width: 650px) {
  .payment-method-options {
    grid-template-columns: 1fr;
  }

  .payment-method-option {
    min-height: 68px;
  }

  .payment-summary {
    align-items: flex-start;
  }

  .tenor-price {
    max-width: 105px;
    font-size: 10px;
  }

  .selected-plan-monthly {
    min-width: 0;
  }
}

@media (max-width: 650px) {

  .spk-container {
    max-width:
      500px;

    padding:
      16px 14px 112px;
  }


  .page-intro {
    align-items:
      flex-start;

    flex-direction:
      column;

    gap:
      10px;

    margin-bottom:
      14px;
  }


  .progress-chip {
    align-self:
      flex-start;
  }


  .form-progress {
    padding:
      10px;
  }


  .progress-step {
    gap:
      6px;
  }


  .progress-step div {
    display:
      none;
  }


  .step-number {
    flex-basis:
      28px;

    width:
      28px;

    height:
      28px;
  }


  .progress-line {
    margin:
      0 7px;
  }


  .card-heading {
    min-height:
      72px;

    padding:
      11px 14px;

    gap:
      10px;
  }


  .heading-icon {
    flex-basis:
      43px;

    width:
      43px;

    height:
      43px;

    border-radius:
      11px;

    font-size:
      22px;
  }


  .card-heading h2 {
    font-size:
      18px;
  }


  .card-heading p {
    font-size:
      10px;
  }


  .required-note {
    display:
      none;
  }


  .card-body {
    padding:
      17px 14px 20px;
  }


  .form-grid {
    grid-template-columns:
      1fr;

    gap:
      17px;
  }


  .field-full {
    grid-column:
      auto;
  }


  .lot-summary {
    align-items:
      flex-start;

    flex-direction:
      column;

    gap:
      13px;

    padding:
      14px;
  }


  .lot-price {
    width:
      100%;

    padding:
      10px 0 0;

    border-top:
      1px solid
      #eadfca;

    border-left:
      0;

    text-align:
      left;
  }


  .lot-price strong {
    font-size:
      17px;
  }


  .tenor-options {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));

    gap:
      8px;
  }


  .tenor-option {
    min-height:
      64px;

    padding:
      9px;
  }


  .document-body {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));

    gap:
      10px;
  }


  .document-upload-wide {
    grid-column:
      1 / -1;
  }


  .confirmation-grid {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }
}


/* =========================================================
   SMALL MOBILE
   ========================================================= */

@media (max-width: 390px) {
  .tenor-option {
    align-items: flex-start;
    flex-wrap: wrap;
  }

  .tenor-price {
    flex: 1 1 100%;
    max-width: none;
    padding-left: 28px;
    align-items: flex-start;
    text-align: left;
  }

  .tenor-check {
    margin-left: auto;
  }

  .selected-plan {
    flex-wrap: wrap;
  }

  .selected-plan-monthly {
    flex: 1 1 100%;
    padding-top: 8px;
    border-top: 1px solid #eee7da;
  }
}

@media (max-width: 390px) {

  .spk-container {
    padding:
      12px 10px 108px;
  }


  .page-intro h1 {
    font-size:
      25px;
  }


  .page-intro p {
    font-size:
      12px;
  }


  .form-progress {
    margin-bottom:
      13px;

    border-radius:
      11px;
  }


  .progress-line {
    margin:
      0 5px;
  }


  .form-card {
    margin-bottom:
      13px;

    border-radius:
      13px;
  }


  .card-heading {
    min-height:
      65px;

    padding:
      9px 11px;
  }


  .heading-icon {
    flex-basis:
      39px;

    width:
      39px;

    height:
      39px;

    font-size:
      20px;
  }


  .card-heading h2 {
    font-size:
      17px;
  }


  .card-heading p {
    display:
      none;
  }


  .card-body {
    padding:
      14px 11px 17px;
  }


  .field-group > label,
  .label-row label,
  .tenor-heading label {
    font-size:
      13px;
  }


  .field-shell,
  .select-shell {
    min-height:
      49px;
  }


  .field-shell input,
  .field-shell textarea,
  .select-shell ion-select {
    font-size:
      13px;
  }


  .lot-main > strong {
    font-size:
      21px;
  }


  .tenor-options {
    grid-template-columns:
      repeat(2, minmax(0, 1fr));
  }


  .tenor-option {
    gap:
      7px;

    min-height:
      59px;

    padding:
      7px;
  }


  .tenor-radio {
    flex-basis:
      17px;

    width:
      17px;

    height:
      17px;
  }


  .tenor-radio span {
    width:
      7px;

    height:
      7px;
  }


  .tenor-copy strong {
    font-size:
      12px;
  }


  .tenor-copy small {
    font-size:
      9px;
  }


  .tenor-check {
    font-size:
      16px;
  }


  .selected-plan {
    padding:
      9px;
  }


  .document-body {
    grid-template-columns:
      1fr;
  }


  .document-upload-wide {
    grid-column:
      auto;
  }


  .confirmation-card {
    padding:
      14px;
  }


  .confirmation-heading h2 {
    font-size:
      16px;
  }


  .confirmation-grid {
    grid-template-columns:
      1fr 1fr;

    gap:
      6px;
  }


  .confirmation-grid > div {
    padding:
      8px;
  }


  .confirmation-notice p {
    font-size:
      9px;
  }


  .submit-button {
    min-height:
      51px;

    font-size:
      14px;
  }
}


/* =========================================================
   VERY SMALL MOBILE
   ========================================================= */

@media (max-width: 320px) {

  .spk-container {
    padding-left:
      8px;

    padding-right:
      8px;
  }


  .page-intro h1 {
    font-size:
      22px;
  }


  .progress-chip {
    font-size:
      10px;

    padding:
      7px 9px;
  }


  .progress-step {
    flex:
      1;
  }


  .progress-line {
    min-width:
      9px;

    margin:
      0 3px;
  }


  .step-number {
    flex-basis:
      26px;

    width:
      26px;

    height:
      26px;
  }


  .card-heading {
    padding:
      8px 9px;
  }


  .heading-icon {
    flex-basis:
      36px;

    width:
      36px;

    height:
      36px;

    font-size:
      18px;
  }


  .card-heading h2 {
    font-size:
      16px;
  }


  .card-body {
    padding:
      12px 9px 15px;
  }


  .tenor-options {
    gap:
      6px;
  }


  .tenor-option {
    min-height:
      56px;

    padding:
      6px;
  }


  .tenor-copy strong {
    font-size:
      11px;
  }


  .tenor-copy small {
    font-size:
      8px;
  }


  .option-count {
    font-size:
      9px;
  }


  .upload-note {
    font-size:
      9px;
  }


  .confirmation-grid strong {
    font-size:
      10px;
  }
}
</style>
