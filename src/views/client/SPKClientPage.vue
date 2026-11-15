<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
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
  documentTextOutline,
  informationCircleOutline,
  locationOutline,
  mailOutline,
  mapOutline,
  peopleOutline,
  personOutline,
  walletOutline,
} from 'ionicons/icons'
import { useRoute } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import {
  createClientSpk,
  getClientSpkErrorMessage,
} from '@/services/clientSpkService'
import { lotService, type LotRecord } from '@/services/lotService'

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
const paymentMethod = ref('')
const selectedPlanId = ref<number | null>(null)
const documentError = ref('')
const saveError = ref('')
const saving = ref(false)
const submissionComplete = ref(false)

const form = reactive({
  fullName: '',
  phone: '',
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

const selectedPlan = computed(() =>
  paymentPlans.value.find((plan) => plan.id === selectedPlanId.value) ?? null,
)

const lotPrice = computed(() => {
  if (!lot.value) return null

  const promoPrice = Number(lot.value.promo_price)
  const cashPrice = Number(lot.value.cash_price)
  const price = promoPrice > 0 ? promoPrice : cashPrice

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
    console.error('[SPK Client] Gagal memuat skema pembayaran:', error)
    paymentPlansError.value =
      error instanceof Error ? error.message : 'Skema pembayaran gagal dimuat.'
  } finally {
    paymentPlansLoading.value = false
  }
}

async function loadLot() {
  const lotId = getRouteLotId()
  if (!lotId) {
    lotError.value = 'Nomor kavling tidak valid. Silakan pilih kavling kembali.'
    lotLoading.value = false
    return
  }

  try {
    lot.value = await lotService.getLotById(lotId)
    if (!lotAvailable.value) {
      lotError.value = 'Kavling ini sudah tidak tersedia untuk pengajuan.'
      return
    }

    await loadPaymentPlans(lotId)
  } catch (error) {
    console.error('[SPK Client] Gagal memuat data kavling:', error)
    lotError.value =
      error instanceof Error ? error.message : 'Data kavling gagal dimuat.'
  } finally {
    lotLoading.value = false
  }
}

function selectPaymentScheme(value: 'Cash' | 'Installment') {
  paymentScheme.value = value
  if (value === 'Cash') selectedPlanId.value = null
}

function handlePaymentSchemeChange(event: Event) {
  const target = event.target
  if (!(target instanceof HTMLSelectElement)) return
  selectPaymentScheme(target.value as 'Cash' | 'Installment')
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
    saveError.value = 'Data kavling belum tersedia. Silakan pilih kavling kembali.'
    return
  }

  const scheme = paymentScheme.value
  const method = paymentMethod.value
  if (!form.fullName || !form.phone || !form.address || !scheme
    || !documents.ktp || !documents.kk || !documents.paymentProof) {
    saveError.value =
      'Lengkapi nama, nomor kontak, alamat, pembayaran, serta unggah KTP, KK, dan bukti pembayaran.'
    return
  }

  if (method !== 'Transfer Bank' && method !== 'Tunai') {
    saveError.value = 'Pilih metode pembayaran yang valid.'
    return
  }

  if (scheme === 'Installment' && !selectedPlan.value) {
    saveError.value = 'Pilih rencana tenor cicilan sebelum menyimpan SPK.'
    return
  }

  saving.value = true
  try {
    await createClientSpk({
      lot: {
        id: lot.value.id,
        price: lotPrice.value,
      },
      buyer: {
        fullName: form.fullName,
        phone: form.phone,
        email: form.email,
        address: form.address,
      },
      payment: {
        scheme,
        method,
        planId: selectedPlan.value?.plan_id ?? null,
        tenorMonths: selectedPlan.value?.months ?? null,
        monthlyPayment: selectedPlan.value?.monthly_payment ?? null,
      },
      documents,
    })
    submissionComplete.value = true
  } catch (error) {
    console.error('[SPK Client] Gagal menyimpan SPK ke Supabase:', error)
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
})
</script>

<template>
  <ion-page class="client-spk-page">
    <AppHeader
      variant="client"
      title="PoliLand Kairagi"
      :show-back="true"
      back-route="/client/kavling"
    />

    <ion-content class="client-spk-content" :fullscreen="true">
      <main class="spk-shell">
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
          Memuat data kavling...
        </div>

        <section v-else-if="lotError" class="spk-state spk-error" role="alert">
          <strong>Formulir belum dapat dibuka</strong>
          <p>{{ lotError }}</p>
          <button type="button" @click="goToLots">
            Kembali ke daftar kavling
          </button>
        </section>

        <section v-else-if="submissionComplete" class="spk-state spk-success" role="status">
          <span class="spk-success-icon">
            <ion-icon :icon="documentTextOutline" aria-hidden="true" />
          </span>
          <strong>Pengajuan SPK sudah dikirim ke admin.</strong>
          <p>Admin akan memeriksa data dan dokumen yang Anda kirim.</p>
          <button type="button" @click="goToLots">Kembali ke daftar kavling</button>
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
                    v-model.trim="form.fullName"
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
            </div>
          </section>

          <section class="spk-card" aria-labelledby="lot-title">
            <div class="spk-card-heading">
              <span class="spk-heading-icon">
                <ion-icon :icon="mapOutline" aria-hidden="true" />
              </span>
              <h2 id="lot-title">Informasi Kavling</h2>
            </div>

            <div class="spk-card-body lot-form-body">
              <div class="spk-field">
                <label for="spk-lot-price">Harga Kavling <span>*</span></label>
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

              <div class="spk-field">
                <label for="spk-scheme">Skema Pembayaran <span>*</span></label>
                <div class="spk-input-wrap spk-select-wrap">
                  <ion-icon :icon="cardOutline" aria-hidden="true" />
                  <select
                    id="spk-scheme"
                    :value="paymentScheme"
                    @change="handlePaymentSchemeChange"
                  >
                    <option disabled value="">Pilih skema pembayaran</option>
                    <option value="Cash">Cash</option>
                    <option value="Installment">Cicilan</option>
                  </select>
                </div>
              </div>

              <div class="spk-field">
                <label for="spk-method">Metode Pembayaran <span>*</span></label>
                <div class="spk-input-wrap spk-select-wrap">
                  <ion-icon :icon="walletOutline" aria-hidden="true" />
                  <select id="spk-method" v-model="paymentMethod">
                    <option disabled value="">Pilih metode pembayaran</option>
                    <option value="Transfer Bank">Transfer Bank</option>
                    <option value="Tunai">Tunai</option>
                  </select>
                </div>
              </div>

              <div v-if="paymentScheme === 'Installment'" class="spk-field">
                <label>Rencana Tenor <span>*</span></label>
                <div v-if="paymentPlansLoading" class="spk-plan-message" role="status">
                  Memuat pilihan tenor...
                </div>
                <div v-else-if="paymentPlansError" class="spk-plan-message spk-error-text" role="alert">
                  {{ paymentPlansError }}
                  <button type="button" @click="loadPaymentPlans(lot.id)">
                    Coba lagi
                  </button>
                </div>
                <div v-else-if="paymentPlans.length" class="spk-tenor-options">
                  <button
                    v-for="plan in paymentPlans"
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
                  Skema cicilan belum tersedia untuk kavling ini.
                </p>
                <p v-if="selectedPlan?.monthly_payment" class="spk-monthly-estimate">
                  Estimasi cicilan {{ formatCurrency(selectedPlan.monthly_payment) }} / bulan.
                </p>
              </div>
            </div>
          </section>

          <section class="spk-card" aria-labelledby="documents-title">
            <div class="spk-card-heading spk-documents-heading">
              <span class="spk-heading-icon">
                <ion-icon :icon="documentTextOutline" aria-hidden="true" />
              </span>
              <div>
                <h2 id="documents-title">Dokumen Pendukung</h2>
                <p>Unggah dokumen pembeli dan bukti pembayaran sebagai lampiran SPK.</p>
              </div>
            </div>

            <div class="spk-card-body">
              <p class="spk-upload-note">
                Format JPG, PNG, atau PDF. Ukuran maksimal 5 MB per file.
                Berkas asli akan diunggah ke penyimpanan privat Supabase.
              </p>
              <div class="spk-document-grid">
                <article
                  v-for="field in documentFields"
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
                      :required="field.required"
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
              <p v-if="documentError" class="spk-inline-error" role="alert">
                {{ documentError }}
              </p>
            </div>
          </section>

          <p v-if="saveError" class="spk-inline-error" role="alert">
            <ion-icon :icon="informationCircleOutline" aria-hidden="true" />
            {{ saveError }}
          </p>
        </template>
      </main>
    </ion-content>

    <div v-if="lot && lotAvailable && !lotLoading && !lotError && !submissionComplete" class="spk-action-bar">
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
  padding: 18px 16px calc(180px + env(safe-area-inset-bottom, 0px));
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
  position: fixed;
  z-index: 10;
  right: 0;
  bottom: calc(82px + env(safe-area-inset-bottom, 0px));
  left: 0;
  padding: 12px 16px;
  border-top: 1px solid var(--border-default, #eae7e0);
  background: var(--surface-primary, #fff);
  box-shadow: 0 -3px 14px rgb(37 37 37 / 5%);
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
    padding: 14px 12px calc(170px + env(safe-area-inset-bottom, 0px));
  }

  .spk-card-body {
    padding: 14px;
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
</style>
