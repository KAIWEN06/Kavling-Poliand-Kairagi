<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { IonContent, IonIcon, IonPage, useIonRouter } from '@ionic/vue'
import {
  locationOutline,
  resizeOutline,
  searchOutline,
} from 'ionicons/icons'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import { lotService, type LotRecord } from '@/services/lotService'

type LotStatus = 'available' | 'booked' | 'sold' | 'unavailable'
type BlockFilter = { label: string; value: string }

const ionRouter = useIonRouter()
const lots = ref<LotRecord[]>([])
const searchQuery = ref('')
const selectedBlock = ref('all')
const loading = ref(true)
const errorMessage = ref('')

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

  return lot.dimension?.trim() || 'Luas belum tersedia'
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

    <ion-content class="client-lots-content" :fullscreen="true">
      <main class="lots-shell">
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
              <button
                v-if="lot.panorama_url"
                type="button"
                class="panorama-button"
                :aria-label="`Lihat panorama kavling ${lot.lot_number}`"
                @click="openPanorama(lot)"
              >
                360°
              </button>
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
          </article>
        </section>

        <section v-else class="message-state empty-state">
          <strong>Kavling tidak ditemukan</strong>
          <p>Ubah kata pencarian atau pilih blok lainnya.</p>
        </section>
      </main>
    </ion-content>

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
  min-width: 0;
  overflow: hidden;
  border: 1px solid rgb(37 37 37 / 4%);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 3px 12px rgb(37 37 37 / 5%);
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
.lot-status,
.panorama-button {
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
  right: 9px;
  bottom: 10px;
  min-height: 26px;
  padding: 0 8px;
  border: 1px solid rgb(255 255 255 / 55%);
  border-radius: 7px;
  color: var(--text-primary, #252525);
  background: rgb(255 255 255 / 94%);
  font: inherit;
  font-size: 10px;
  font-weight: var(--font-weight-medium, 500);
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
}

@media (min-width: 960px) {
  .lot-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}
</style>
