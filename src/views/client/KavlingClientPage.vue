<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import {
  IonButton,
  IonButtons,
  IonContent,
  IonHeader,
  IonIcon,
  IonModal,
  IonPage,
  IonTitle,
  IonToolbar,
  useIonRouter,
} from '@ionic/vue'
import {
  arrowBackOutline,
  cartOutline,
  checkmarkCircleOutline,
  chevronForward,
  closeOutline,
  documentTextOutline,
  homeOutline,
  locationOutline,
  resizeOutline,
  searchOutline,
  walletOutline,
} from 'ionicons/icons'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import { lotService, type LotRecord } from '@/services/lotService'

type LotStatus = 'available' | 'booked' | 'sold' | 'unavailable'
type BlockFilter = { label: string; value: string }

const ionRouter = useIonRouter()
const lots = ref<LotRecord[]>([])
const selectedLot = ref<LotRecord | null>(null)
const searchQuery = ref('')
const selectedBlock = ref('all')
const loading = ref(true)
const errorMessage = ref('')
const showInstallmentModal = ref(false)
const loadingInstallments = ref(false)
const installmentError = ref('')
const installments = ref<
  Array<{
    id: number
    monthly_payment: number | null
    plan_name: string
    months: number
  }>
>([])
const showPurchaseModal = ref(false)

const statusDetails: Record<LotStatus, { label: string; className: string }> = {
  available: { label: 'Tersedia', className: 'status-available' },
  booked: { label: 'Dipesan', className: 'status-booked' },
  sold: { label: 'Terjual', className: 'status-sold' },
  unavailable: { label: 'Tidak tersedia', className: 'status-unavailable' },
}

const blockFilters = computed<BlockFilter[]>(() => {
  const blocks = new Map<string, string>()

  for (const lot of lots.value) {
    const label = getBlockLabel(lot)
    blocks.set(label.toLocaleLowerCase('id-ID'), label)
  }

  return [
    { label: 'Semua Blok', value: 'all' },
    ...[...blocks.entries()]
      .sort((left, right) => left[1].localeCompare(right[1], 'id-ID', { numeric: true }))
      .map(([value, label]) => ({ label, value })),
  ]
})

const visibleLots = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('id-ID')

  return lots.value.filter((lot) => {
    const blockLabel = getBlockLabel(lot)
    const matchesBlock =
      selectedBlock.value === 'all' ||
      blockLabel.toLocaleLowerCase('id-ID') === selectedBlock.value
    const searchableText = `${lot.lot_number} ${blockLabel}`
      .toLocaleLowerCase('id-ID')

    return matchesBlock && (!query || searchableText.includes(query))
  })
})

const hasUnavailableLots = computed(() =>
  lots.value.some((lot) => getLotStatus(lot.status) === 'unavailable'),
)

const selectedLotPrice = computed(() => {
  if (!selectedLot.value) return null

  const promoPrice = Number(selectedLot.value.promo_price)
  const cashPrice = Number(selectedLot.value.cash_price)
  const price = promoPrice > 0 ? promoPrice : cashPrice

  return Number.isFinite(price) && price > 0 ? price : null
})

const selectedLotHasPromo = computed(() => {
  if (!selectedLot.value) return false

  const promoPrice = Number(selectedLot.value.promo_price)
  const cashPrice = Number(selectedLot.value.cash_price)

  return promoPrice > 0 && cashPrice > promoPrice
})

const selectedLotName = computed(() =>
  selectedLot.value
    ? `${getBlockLabel(selectedLot.value)} - No. ${selectedLot.value.lot_number}`
    : '',
)

async function loadLots() {
  loading.value = true
  errorMessage.value = ''

  try {
    lots.value = await lotService.getLots()
  } catch (error) {
    console.error('[Kavling Client] Gagal memuat data kavling:', error)
    errorMessage.value =
      error instanceof Error ? error.message : 'Data kavling gagal dimuat.'
  } finally {
    loading.value = false
  }
}

function getLotStatus(status: string | null): LotStatus {
  const normalizedStatus = status?.trim().toLocaleLowerCase('id-ID')

  if (normalizedStatus === 'available' || normalizedStatus === 'tersedia') {
    return 'available'
  }

  if (
    normalizedStatus === 'booking' ||
    normalizedStatus === 'booked' ||
    normalizedStatus === 'reserved' ||
    normalizedStatus === 'dipesan'
  ) {
    return 'booked'
  }

  if (normalizedStatus === 'sold' || normalizedStatus === 'terjual') {
    return 'sold'
  }

  return 'unavailable'
}

function getBlockLabel(lot: LotRecord) {
  const blockValues = [lot.block?.code, lot.block?.name]

  for (const value of blockValues) {
    if (typeof value === 'string' && value.trim()) {
      const label = value.trim()
      return /^blok\b/i.test(label) ? label : `Blok ${label}`
    }
  }

  const lotPrefix = lot.lot_number.match(/^\s*([a-z]+)/i)?.[1]
  if (lotPrefix) return `Blok ${lotPrefix.toLocaleUpperCase('id-ID')}`

  return lot.block_id == null ? 'Blok lainnya' : `Blok ${lot.block_id}`
}

function getAreaLabel(lot: LotRecord) {
  if (lot.area !== null && lot.area !== undefined && String(lot.area).trim()) {
    const area = Number(lot.area)
    if (Number.isFinite(area) && area > 0) {
      return `${area.toLocaleString('id-ID')} m²`
    }
  }

  return 'Luas belum tersedia'
}

function getDimensionLabel(lot: LotRecord) {
  return lot.dimension?.trim() || 'Dimensi belum tersedia'
}

function getStatusLabel(lot: LotRecord) {
  return statusDetails[getLotStatus(lot.status)].label
}

function formatCurrency(value: number | string | null | undefined) {
  const amount = Number(value)

  if (!Number.isFinite(amount) || amount <= 0) {
    return 'Harga belum tersedia'
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(amount)
}

function selectLot(lot: LotRecord) {
  selectedLot.value = lot
}

function closeLotDetails() {
  selectedLot.value = null
}

function continueToSpkForm() {
  if (!selectedLot.value) return

  const lotId = selectedLot.value.id
  showPurchaseModal.value = false
  ionRouter.push(`/client/spk?lot_id=${encodeURIComponent(String(lotId))}`)
}

async function openInstallmentSimulation() {
  if (!selectedLot.value) return

  showInstallmentModal.value = true
  loadingInstallments.value = true
  installmentError.value = ''
  installments.value = []

  try {
    installments.value = await lotService.getLotInstallments(selectedLot.value.id)
  } catch (error) {
    console.error('[Kavling Client] Gagal memuat simulasi cicilan:', error)
    installmentError.value =
      error instanceof Error ? error.message : 'Skema cicilan gagal dimuat.'
  } finally {
    loadingInstallments.value = false
  }
}

function openPanorama(lot: LotRecord) {
  if (!lot.panorama_url) return

  ionRouter.push(`/panorama/${encodeURIComponent(lot.lot_number)}`)
}

onMounted(() => {
  void loadLots()
})
</script>

<template>
  <ion-page class="client-lots-page">
    <AppHeader
      variant="client"
      title="PoliLand Kairagi"
      :show-back="false"
    />

    <ion-content
      :key="selectedLot?.id ?? 'lot-list'"
      class="client-lots-content"
      :fullscreen="true"
    >
      <main v-if="!selectedLot" class="lots-shell">
        <label class="search-field">
          <ion-icon :icon="searchOutline" aria-hidden="true" />
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Cari nomor kavling atau blok..."
            aria-label="Cari nomor kavling atau blok"
            autocomplete="off"
          />
        </label>

        <nav class="block-filters" aria-label="Filter blok">
          <button
            v-for="filter in blockFilters"
            :key="filter.value"
            type="button"
            :class="['block-filter', { active: selectedBlock === filter.value }]"
            :aria-pressed="selectedBlock === filter.value"
            @click="selectedBlock = filter.value"
          >
            {{ filter.label }}
          </button>
        </nav>

        <section class="status-legend" aria-label="Keterangan status kavling">
          <span class="legend-item">
            <i class="status-dot status-dot-available" aria-hidden="true"></i>
            Tersedia
          </span>
          <span class="legend-item">
            <i class="status-dot status-dot-booked" aria-hidden="true"></i>
            Dipesan
          </span>
          <span class="legend-item">
            <i class="status-dot status-dot-sold" aria-hidden="true"></i>
            Terjual
          </span>
          <span v-if="hasUnavailableLots" class="legend-item">
            <i class="status-dot status-dot-unavailable" aria-hidden="true"></i>
            Lainnya
          </span>
        </section>

        <div v-if="loading" class="message-state" role="status">
          Memuat data kavling...
        </div>

        <section v-else-if="errorMessage" class="message-state error-state" role="alert">
          <strong>Data kavling belum dapat dimuat</strong>
          <p>{{ errorMessage }}</p>
          <button type="button" class="retry-button" @click="loadLots">
            Coba lagi
          </button>
        </section>

        <section v-else-if="visibleLots.length" class="lot-grid" aria-label="Daftar kavling">
          <article v-for="lot in visibleLots" :key="lot.id" class="lot-card">
            <button
              type="button"
              class="lot-card-trigger"
              :aria-label="`Lihat detail ${getBlockLabel(lot)} nomor ${lot.lot_number}`"
              @click="selectLot(lot)"
            >
              <div class="lot-image">
                <img
                  v-if="lot.panorama_url"
                  :src="lot.panorama_url"
                  :alt="`Panorama kavling ${lot.lot_number}`"
                  loading="lazy"
                />
                <span class="lot-number">{{ lot.lot_number }}</span>
                <span
                  :class="[
                    'lot-status',
                    statusDetails[getLotStatus(lot.status)].className,
                  ]"
                >
                  <i
                    class="status-dot"
                    :class="`status-dot-${getLotStatus(lot.status)}`"
                    aria-hidden="true"
                  ></i>
                  {{ statusDetails[getLotStatus(lot.status)].label }}
                </span>
              </div>

              <div class="lot-information">
                <h2>{{ getBlockLabel(lot) }} – No. {{ lot.lot_number }}</h2>
                <p class="lot-detail">
                  <ion-icon :icon="resizeOutline" aria-hidden="true" />
                  <span>{{ getAreaLabel(lot) }}</span>
                </p>
                <p class="lot-detail lot-location">
                  <ion-icon :icon="locationOutline" aria-hidden="true" />
                  <span>Kairagi, Manado</span>
                </p>
              </div>
            </button>

            <button
              v-if="lot.panorama_url"
              type="button"
              class="panorama-button"
              :aria-label="`Lihat panorama kavling ${lot.lot_number}`"
              @click.stop="openPanorama(lot)"
            >
              360°
            </button>
          </article>
        </section>

        <section v-else class="message-state empty-state">
          <strong>Kavling tidak ditemukan</strong>
          <p>Ubah kata pencarian atau pilih blok lainnya.</p>
        </section>
      </main>

      <main v-else class="lot-detail-shell">
        <button
          type="button"
          class="detail-back-button"
          @click="closeLotDetails"
        >
          <ion-icon :icon="arrowBackOutline" aria-hidden="true" />
          Kembali ke daftar kavling
        </button>

        <section class="detail-hero" :aria-label="`Foto ${selectedLotName}`">
          <img
            v-if="selectedLot.panorama_url"
            :src="selectedLot.panorama_url"
            :alt="`Foto kavling ${selectedLot.lot_number}`"
          />
          <div v-else class="detail-hero-placeholder">
            <ion-icon :icon="homeOutline" aria-hidden="true" />
            <span>Foto kavling belum tersedia</span>
          </div>

          <span
            :class="[
              'detail-status',
              statusDetails[getLotStatus(selectedLot.status)].className,
            ]"
          >
            <i
              class="status-dot"
              :class="`status-dot-${getLotStatus(selectedLot.status)}`"
              aria-hidden="true"
            ></i>
            {{ getStatusLabel(selectedLot) }}
          </span>
          <button
            v-if="selectedLot.panorama_url"
            type="button"
            class="detail-panorama-button"
            @click="openPanorama(selectedLot)"
          >
            Lihat panorama 360°
            <ion-icon :icon="chevronForward" aria-hidden="true" />
          </button>
        </section>

        <section class="detail-info-card" aria-labelledby="selected-lot-title">
          <h1 id="selected-lot-title">{{ selectedLotName }}</h1>
          <p class="detail-location">
            <ion-icon :icon="locationOutline" aria-hidden="true" />
            Kairagi, Manado
          </p>

          <div class="detail-attributes">
            <div class="detail-attribute">
              <ion-icon :icon="resizeOutline" aria-hidden="true" />
              <span>Luas Kavling</span>
              <strong>{{ getAreaLabel(selectedLot) }}</strong>
            </div>
            <div class="detail-attribute">
              <ion-icon :icon="homeOutline" aria-hidden="true" />
              <span>Dimensi</span>
              <strong>{{ getDimensionLabel(selectedLot) }}</strong>
            </div>
            <div v-if="selectedLot.payment_type" class="detail-attribute">
              <ion-icon :icon="documentTextOutline" aria-hidden="true" />
              <span>Skema Pembayaran</span>
              <strong>
                {{ selectedLot.payment_type === 'Installment' ? 'Cicilan' : selectedLot.payment_type }}
              </strong>
            </div>
          </div>
        </section>

        <section
          v-if="selectedLot.description"
          class="detail-description"
          aria-label="Deskripsi kavling"
        >
          <h2>Informasi Kavling</h2>
          <p>{{ selectedLot.description }}</p>
        </section>

        <section class="detail-price-card" aria-labelledby="lot-price-title">
          <div class="detail-price-copy">
            <span id="lot-price-title">Harga Kavling</span>
            <strong>{{ formatCurrency(selectedLotPrice) }}</strong>
            <del v-if="selectedLotHasPromo">
              {{ formatCurrency(selectedLot.cash_price) }}
            </del>
          </div>
          <button
            type="button"
            class="installment-button"
            :disabled="selectedLotPrice === null"
            @click="openInstallmentSimulation"
          >
            <ion-icon :icon="walletOutline" aria-hidden="true" />
            Simulasi Cicilan
            <ion-icon :icon="chevronForward" aria-hidden="true" />
          </button>
          <p>Harga dapat berubah sewaktu-waktu sesuai kebijakan pengembang.</p>
        </section>
      </main>
    </ion-content>

    <div v-if="selectedLot" class="detail-action-bar">
      <button
        type="button"
        class="buy-lot-button"
        :disabled="getLotStatus(selectedLot.status) !== 'available' || selectedLotPrice === null"
        @click="showPurchaseModal = true"
      >
        <ion-icon :icon="cartOutline" aria-hidden="true" />
        {{
          getLotStatus(selectedLot.status) === 'available'
            ? selectedLotPrice === null ? 'Harga Belum Tersedia' : 'Beli Kavling'
            : 'Kavling Tidak Tersedia'
        }}
      </button>
    </div>

    <ion-modal
      :is-open="showInstallmentModal"
      class="installment-modal"
      @did-dismiss="showInstallmentModal = false"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Simulasi Cicilan</ion-title>
          <ion-buttons slot="end">
            <ion-button
              aria-label="Tutup simulasi cicilan"
              @click="showInstallmentModal = false"
            >
              <ion-icon :icon="closeOutline" />
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>
      <ion-content class="installment-modal-content">
        <p class="installment-lot-name">{{ selectedLotName }}</p>
        <p class="installment-price">
          Harga: <strong>{{ formatCurrency(selectedLotPrice) }}</strong>
        </p>

        <div v-if="loadingInstallments" class="installment-message" role="status">
          Memuat skema cicilan...
        </div>
        <div v-else-if="installmentError" class="installment-message error-state" role="alert">
          <strong>Skema cicilan belum dapat dimuat</strong>
          <span>{{ installmentError }}</span>
          <button type="button" @click="openInstallmentSimulation">
            Coba lagi
          </button>
        </div>
        <div v-else-if="installments.length" class="installment-options">
          <article
            v-for="installment in installments"
            :key="installment.id"
            class="installment-option"
          >
            <span>
              <strong>{{ installment.plan_name }}</strong>
              <small>{{ installment.months }} bulan</small>
            </span>
            <strong>
              {{
                installment.monthly_payment
                  ? `${formatCurrency(installment.monthly_payment)} / bulan`
                  : 'Nominal belum ditentukan'
              }}
            </strong>
          </article>
        </div>
        <div v-else class="installment-message">
          Skema cicilan belum tersedia untuk kavling ini.
        </div>
      </ion-content>
    </ion-modal>

    <ion-modal
      :is-open="showPurchaseModal"
      class="purchase-confirmation-modal"
      @did-dismiss="showPurchaseModal = false"
    >
      <div class="purchase-confirmation">
        <span class="purchase-confirmation-icon">
          <ion-icon :icon="checkmarkCircleOutline" aria-hidden="true" />
        </span>
        <h2>Konfirmasi Minat Kavling</h2>
        <p>
          Anda akan mengajukan pemesanan untuk
          <strong>{{ selectedLotName }}</strong>
          seharga
          <strong class="purchase-price">{{ formatCurrency(selectedLotPrice) }}</strong>.
        </p>
        <button
          type="button"
          class="purchase-continue-button"
          @click="continueToSpkForm"
        >
          Lanjut ke Formulir Pembuatan SPK
        </button>
        <button
          type="button"
          class="purchase-cancel-button"
          @click="showPurchaseModal = false"
        >
          Batal
        </button>
      </div>
    </ion-modal>

    <MobileTabBar variant="client" />
  </ion-page>
</template>

<style scoped>
.client-lots-page,
.client-lots-content {
  --background: var(--app-background, #faf9f6);
  color: var(--text-primary, #252525);
  font-family: var(--font-primary, var(--ion-font-family, sans-serif));
}

.lots-shell {
  display: grid;
  width: min(100%, 1120px);
  gap: 16px;
  margin: 0 auto;
  padding: 14px 16px 32px;
}

.lot-detail-shell {
  display: grid;
  width: min(100%, 760px);
  gap: 18px;
  margin: 0 auto;
  padding: 14px 16px calc(180px + env(safe-area-inset-bottom, 0px));
}

.search-field {
  display: flex;
  min-width: 0;
  height: 48px;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 2px 6px rgb(37 37 37 / 4%);
}

.search-field > ion-icon {
  flex: 0 0 auto;
  color: var(--text-secondary, #717178);
  font-size: 20px;
}

.search-field input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--text-primary, #252525);
  background: transparent;
  font: inherit;
  font-size: 14px;
}

.search-field input::placeholder {
  color: var(--text-secondary, #717178);
  opacity: 0.8;
}

.search-field:focus-within {
  border-color: var(--poliland-green, #355a2c);
  box-shadow: 0 0 0 3px rgb(53 90 44 / 12%);
}

.block-filters {
  display: flex;
  gap: 8px;
  overflow-x: auto;
  margin: 0 -16px;
  padding: 0 16px 2px;
  scrollbar-width: none;
}

.block-filters::-webkit-scrollbar {
  display: none;
}

.block-filter {
  min-height: 40px;
  flex: 0 0 auto;
  padding: 0 15px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  color: var(--text-secondary, #717178);
  background: var(--surface-primary, #fff);
  font: inherit;
  font-size: 13px;
  font-weight: var(--font-weight-medium, 500);
  white-space: nowrap;
}

.block-filter.active {
  border-color: var(--poliland-gold-soft, #f4d69a);
  color: var(--poliland-gold-text-soft, #805708);
  background: var(--poliland-gold-soft, #f4d69a);
}

.block-filter:focus-visible,
.panorama-button:focus-visible,
.retry-button:focus-visible {
  outline: 3px solid rgb(53 90 44 / 35%);
  outline-offset: 2px;
}

.status-legend {
  display: flex;
  min-height: 46px;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 0 12px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 2px 6px rgb(37 37 37 / 4%);
}

.legend-item {
  display: inline-flex;
  min-width: 0;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary, #717178);
  font-size: 11px;
  white-space: nowrap;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 50%;
}

.status-dot-available {
  background: var(--status-success, #355a2c);
}

.status-dot-booked {
  background: var(--status-warning, #cba044);
}

.status-dot-sold {
  background: var(--status-danger, #d94b45);
}

.status-dot-unavailable {
  background: var(--text-secondary, #717178);
}

.lot-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.lot-card {
  position: relative;
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgb(37 37 37 / 4%);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 3px 12px rgb(37 37 37 / 5%);
}

.lot-card-trigger {
  display: block;
  width: 100%;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.lot-card:focus-within {
  outline: 3px solid rgb(53 90 44 / 35%);
  outline-offset: 2px;
}

.lot-image {
  position: relative;
  display: flex;
  min-height: 108px;
  align-items: flex-end;
  padding: 10px;
  overflow: hidden;
  background: var(--pl-silver, #e5e5e5);
}

.lot-image img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.lot-number,
.lot-status {
  position: relative;
  z-index: 1;
}

.lot-number {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  padding: 0 9px;
  border: 1px solid rgb(255 255 255 / 55%);
  border-radius: 7px;
  color: var(--text-primary, #252525);
  background: rgb(255 255 255 / 94%);
  font-size: 12px;
  font-weight: var(--font-weight-semibold, 600);
}

.lot-status {
  position: absolute;
  top: 10px;
  left: 10px;
  display: inline-flex;
  max-width: calc(100% - 20px);
  min-height: 24px;
  align-items: center;
  gap: 6px;
  padding: 0 9px;
  border-radius: 999px;
  font-size: 10px;
  font-weight: var(--font-weight-medium, 500);
  white-space: nowrap;
}

.lot-status .status-dot {
  width: 7px;
  height: 7px;
}

.status-available {
  color: var(--poliland-green, #355a2c);
  background: var(--status-success-bg, #e8eee4);
}

.status-booked {
  color: var(--poliland-gold-text-soft, #805708);
  background: var(--poliland-gold-soft, #f4d69a);
}

.status-sold {
  color: var(--status-danger, #d94b45);
  background: #fcebea;
}

.status-unavailable {
  color: var(--text-secondary, #717178);
  background: var(--surface-primary, #fff);
}

.panorama-button {
  position: absolute;
  z-index: 2;
  top: 10px;
  right: 9px;
  min-height: 26px;
  padding: 0 8px;
  border: 1px solid rgb(255 255 255 / 55%);
  border-radius: 7px;
  color: var(--text-primary, #252525);
  background: rgb(255 255 255 / 94%);
  font: inherit;
  font-size: 10px;
  font-weight: var(--font-weight-medium, 500);
  cursor: pointer;
}

.lot-information {
  display: grid;
  gap: 7px;
  padding: 11px 10px 12px;
}

.lot-information h2 {
  margin: 0;
  color: var(--text-primary, #252525);
  font-size: 12px;
  font-weight: var(--font-weight-semibold, 600);
  line-height: 1.4;
  overflow-wrap: anywhere;
}

.lot-detail {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
  margin: 0;
  color: var(--text-secondary, #717178);
  font-size: 11px;
  line-height: 1.35;
}

.lot-detail ion-icon {
  flex: 0 0 auto;
  color: var(--poliland-gold-text-soft, #805708);
  font-size: 14px;
}

.lot-detail span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.message-state {
  display: grid;
  min-height: 150px;
  align-content: center;
  justify-items: center;
  gap: 8px;
  padding: 22px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  color: var(--text-secondary, #717178);
  background: var(--surface-primary, #fff);
  text-align: center;
  font-size: 13px;
}

.message-state strong {
  color: var(--text-primary, #252525);
  font-size: 14px;
  font-weight: var(--font-weight-semibold, 600);
}

.message-state p {
  margin: 0;
  overflow-wrap: anywhere;
}

.retry-button {
  min-height: 38px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--radius-control, 12px);
  color: #fff;
  background: var(--poliland-green, #355a2c);
  font: inherit;
  font-size: 13px;
  font-weight: var(--font-weight-medium, 500);
}

.detail-back-button {
  display: inline-flex;
  width: fit-content;
  min-height: 40px;
  align-items: center;
  gap: 8px;
  padding: 0 4px;
  border: 0;
  color: var(--text-secondary, #717178);
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: var(--font-weight-medium, 500);
  cursor: pointer;
}

.detail-back-button ion-icon {
  color: var(--poliland-gold-text, #966a12);
  font-size: 20px;
}

.detail-hero {
  position: relative;
  min-height: 250px;
  height: clamp(250px, 60vw, 394px);
  overflow: hidden;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 24px);
  background: var(--surface-muted, #f1f1f3);
  box-shadow: 0 2px 8px rgb(37 37 37 / 4%);
}

.detail-hero > img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.detail-hero-placeholder {
  display: grid;
  width: 100%;
  height: 100%;
  align-content: center;
  justify-items: center;
  gap: 10px;
  color: var(--text-secondary, #717178);
  font-size: 13px;
}

.detail-hero-placeholder ion-icon {
  color: var(--poliland-gold-text-soft, #805708);
  font-size: 38px;
}

.detail-status {
  position: absolute;
  top: 20px;
  left: 20px;
  display: inline-flex;
  min-height: 42px;
  align-items: center;
  gap: 9px;
  padding: 0 16px;
  border: 1px solid rgb(255 255 255 / 75%);
  border-radius: 999px;
  font-size: 14px;
  font-weight: var(--font-weight-semibold, 600);
  box-shadow: 0 2px 8px rgb(37 37 37 / 7%);
}

.detail-status .status-dot {
  width: 10px;
  height: 10px;
}

.detail-panorama-button {
  position: absolute;
  right: 16px;
  bottom: 16px;
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  gap: 8px;
  padding: 0 13px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  color: var(--text-primary, #252525);
  background: var(--surface-primary, #fff);
  font: inherit;
  font-size: 12px;
  font-weight: var(--font-weight-semibold, 600);
  cursor: pointer;
}

.detail-panorama-button ion-icon {
  color: var(--poliland-gold-text, #966a12);
  font-size: 18px;
}

.detail-info-card,
.detail-description,
.detail-price-card {
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 2px 8px rgb(37 37 37 / 4%);
}

.detail-info-card {
  padding: 20px;
}

.detail-info-card h1 {
  margin: 0;
  color: var(--text-primary, #252525);
  font-size: clamp(20px, 5vw, 28px);
  font-weight: var(--font-weight-bold, 700);
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.detail-location {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 10px 0 0;
  color: var(--text-secondary, #717178);
  font-size: 14px;
}

.detail-location ion-icon {
  color: var(--poliland-gold-text, #966a12);
  font-size: 20px;
}

.detail-attributes {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
  margin-top: 20px;
  padding-top: 18px;
  border-top: 1px solid var(--border-default, #eae7e0);
}

.detail-attribute {
  display: grid;
  min-width: 0;
  justify-items: center;
  gap: 7px;
  padding: 0 8px;
  text-align: center;
}

.detail-attribute + .detail-attribute {
  border-left: 1px solid var(--border-default, #eae7e0);
}

.detail-attribute ion-icon {
  color: var(--poliland-gold-text, #966a12);
  font-size: 24px;
}

.detail-attribute span {
  color: var(--text-secondary, #717178);
  font-size: 12px;
  line-height: 1.35;
}

.detail-attribute strong {
  color: var(--text-primary, #252525);
  font-size: 14px;
  font-weight: var(--font-weight-semibold, 600);
  line-height: 1.35;
  overflow-wrap: anywhere;
}

.detail-description {
  padding: 18px 20px;
}

.detail-description h2 {
  margin: 0 0 8px;
  color: var(--text-primary, #252525);
  font-size: 16px;
  font-weight: var(--font-weight-semibold, 600);
}

.detail-description p {
  margin: 0;
  color: var(--text-secondary, #717178);
  font-size: 13px;
  line-height: 1.6;
  overflow-wrap: anywhere;
}

.detail-price-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 14px;
  padding: 20px;
  background: var(--surface-muted, #f7f4ec);
}

.detail-price-copy {
  display: grid;
  min-width: 0;
  gap: 6px;
}

.detail-price-copy > span {
  color: var(--poliland-gold-text-soft, #805708);
  font-size: 13px;
  font-weight: var(--font-weight-medium, 500);
  text-transform: uppercase;
}

.detail-price-copy > strong {
  color: var(--text-primary, #252525);
  font-size: clamp(20px, 5vw, 30px);
  font-weight: var(--font-weight-bold, 700);
  overflow-wrap: anywhere;
}

.detail-price-copy > del {
  color: var(--text-secondary, #717178);
  font-size: 13px;
}

.installment-button {
  display: inline-flex;
  min-height: 48px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 13px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  color: var(--text-primary, #252525);
  background: var(--surface-primary, #fff);
  font: inherit;
  font-size: 13px;
  font-weight: var(--font-weight-semibold, 600);
  white-space: nowrap;
  cursor: pointer;
}

.installment-button ion-icon {
  color: var(--poliland-gold-text, #966a12);
  font-size: 20px;
}

.installment-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.detail-price-card > p {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--text-secondary, #717178);
  font-size: 12px;
  line-height: 1.5;
}

.detail-action-bar {
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

.buy-lot-button {
  display: flex;
  width: min(100%, 760px);
  min-height: 64px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  margin: 0 auto;
  padding: 0 20px;
  border: 0;
  border-radius: var(--radius-control, 16px);
  color: #fff;
  background: var(--poliland-gold, #cba044);
  box-shadow: 0 6px 16px rgb(150 106 18 / 18%);
  font: inherit;
  font-size: 18px;
  font-weight: var(--font-weight-semibold, 600);
  cursor: pointer;
}

.buy-lot-button ion-icon {
  font-size: 24px;
}

.buy-lot-button:disabled {
  background: var(--text-secondary, #717178);
  box-shadow: none;
  cursor: not-allowed;
}

.purchase-confirmation-modal {
  --width: min(426px, calc(100% - 32px));
  --height: min(410px, calc(100% - 48px));
  --border-radius: 24px;
  --backdrop-opacity: 0.48;
}

.purchase-confirmation-modal::part(backdrop) {
  backdrop-filter: blur(3px);
}

.purchase-confirmation {
  display: grid;
  height: 100%;
  align-content: center;
  justify-items: center;
  gap: 16px;
  padding: 28px;
  color: var(--text-primary, #252525);
  background: var(--surface-primary, #fff);
  text-align: center;
}

.purchase-confirmation-icon {
  display: grid;
  width: 76px;
  height: 76px;
  place-items: center;
  border: 2px solid var(--poliland-gold-soft, #f4d69a);
  border-radius: 50%;
  color: var(--poliland-gold-text, #966a12);
  background: var(--surface-muted, #f7f4ec);
}

.purchase-confirmation-icon ion-icon {
  font-size: 40px;
}

.purchase-confirmation h2 {
  margin: 0;
  color: var(--text-primary, #172033);
  font-size: 21px;
  font-weight: var(--font-weight-bold, 700);
  line-height: 1.3;
}

.purchase-confirmation p {
  margin: 0 0 4px;
  color: var(--text-secondary, #566176);
  font-size: 14px;
  line-height: 1.6;
}

.purchase-confirmation p strong {
  color: var(--text-primary, #172033);
}

.purchase-confirmation p .purchase-price {
  color: var(--poliland-gold-text, #966a12);
  white-space: nowrap;
}

.purchase-continue-button {
  width: 100%;
  min-height: 58px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--radius-control, 12px);
  color: #fff;
  background: var(--poliland-gold, #cba044);
  box-shadow: 0 4px 10px rgb(150 106 18 / 16%);
  font: inherit;
  font-size: 14px;
  font-weight: var(--font-weight-semibold, 600);
  cursor: pointer;
}

.purchase-cancel-button {
  min-height: 32px;
  padding: 0 14px;
  border: 0;
  color: var(--text-secondary, #566176);
  background: transparent;
  font: inherit;
  font-size: 14px;
  font-weight: var(--font-weight-semibold, 600);
  cursor: pointer;
}

.installment-modal {
  --width: min(520px, calc(100% - 24px));
  --height: min(80%, 520px);
  --border-radius: var(--radius-panel, 20px);
}

.installment-modal ion-toolbar {
  --background: var(--surface-primary, #fff);
  --color: var(--text-primary, #252525);
}

.installment-modal-content {
  --background: var(--app-background, #faf9f6);
  --padding-start: 18px;
  --padding-end: 18px;
  --padding-top: 16px;
  --padding-bottom: 24px;
}

.installment-lot-name {
  margin: 0;
  color: var(--text-primary, #252525);
  font-size: 16px;
  font-weight: var(--font-weight-semibold, 600);
}

.installment-price {
  margin: 8px 0 18px;
  color: var(--text-secondary, #717178);
  font-size: 13px;
}

.installment-price strong {
  color: var(--text-primary, #252525);
}

.installment-options {
  display: grid;
  gap: 10px;
}

.installment-option {
  display: flex;
  min-width: 0;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-primary, #fff);
}

.installment-option > span {
  display: grid;
  gap: 4px;
}

.installment-option strong {
  color: var(--text-primary, #252525);
  font-size: 13px;
  overflow-wrap: anywhere;
}

.installment-option small,
.installment-message {
  color: var(--text-secondary, #717178);
  font-size: 12px;
}

.installment-message {
  display: grid;
  gap: 8px;
  padding: 18px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-primary, #fff);
  line-height: 1.5;
}

.installment-message strong {
  color: var(--text-primary, #252525);
}

.installment-message button {
  width: fit-content;
  min-height: 38px;
  padding: 0 13px;
  border: 0;
  border-radius: var(--radius-control, 12px);
  color: #fff;
  background: var(--poliland-green, #355a2c);
  font: inherit;
  font-weight: var(--font-weight-medium, 500);
}

.detail-back-button:focus-visible,
.detail-panorama-button:focus-visible,
.installment-button:focus-visible,
.buy-lot-button:focus-visible,
.purchase-continue-button:focus-visible,
.purchase-cancel-button:focus-visible,
.lot-card-trigger:focus-visible,
.panorama-button:focus-visible,
.installment-message button:focus-visible {
  outline: 3px solid rgb(53 90 44 / 35%);
  outline-offset: 2px;
}

@media (min-width: 640px) {
  .lots-shell {
    gap: 18px;
    padding: 20px 24px 36px;
  }

  .block-filters {
    margin: 0;
    padding: 0 0 2px;
  }

  .lot-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 16px;
  }

  .lot-image {
    min-height: 140px;
  }

  .lot-information {
    padding: 13px 14px 14px;
  }

  .lot-information h2 {
    font-size: 14px;
  }

  .lot-detail {
    font-size: 12px;
  }

  .lot-detail-shell {
    width: min(100%, 760px);
    gap: 20px;
    padding: 20px 24px calc(180px + env(safe-area-inset-bottom, 0px));
  }
}

@media (min-width: 960px) {
  .lot-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (max-width: 480px) {
  .lot-detail-shell {
    gap: 14px;
    padding: 12px 12px calc(172px + env(safe-area-inset-bottom, 0px));
  }

  .detail-hero {
    min-height: 220px;
  }

  .detail-info-card,
  .detail-price-card {
    padding: 16px;
  }

  .detail-attribute {
    padding-inline: 5px;
  }

  .detail-attribute span {
    font-size: 10px;
  }

  .detail-attribute strong {
    font-size: 12px;
  }

  .detail-price-card {
    grid-template-columns: 1fr;
  }

  .installment-button {
    justify-self: start;
  }

  .buy-lot-button {
    min-height: 58px;
  }
}
</style>
