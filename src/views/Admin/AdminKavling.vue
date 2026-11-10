<template>
  <ion-page>
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />

    <ion-content :fullscreen="true">
      <ion-refresher slot="fixed" @ionRefresh="onRefresh">
        <ion-refresher-content />
      </ion-refresher>

      <div class="kv-page">
        
        <!-- SITEPLAN (komponen yang sama dengan beranda) -->
        <section class="kv-siteplan" aria-labelledby="siteplan-heading">
          <div class="kv-map-head">
            <h2 id="siteplan-heading">
              <ion-icon :icon="mapOutline" aria-hidden="true" />
              Siteplan PoliLand
            </h2>
          </div>

          <div class="kv-siteplan-card">
            <div class="kv-mini-siteplan">
              <img :src="siteplanImage" alt="Siteplan PoliLand Kairagi" class="kv-siteplan-image" />
              <div ref="siteplanLayer" class="kv-siteplan-layer" v-html="siteplanSvg" />
            </div>

            <div class="kv-siteplan-legend" aria-label="Legenda status kavling">
              <span><i class="available"></i>Tersedia</span>
              <span><i class="booking"></i>Dipesan</span>
              <span><i class="sold"></i>Terjual</span>
            </div>

            <AppButton variant="primary" expand="block" class="kv-siteplan-button" @click="openFullMap">
              Lihat Siteplan
              <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
            </AppButton>
          </div>
        </section>


        <!-- SEARCH -->
        <div class="kv-searchbox" @keydown.esc="panelOpen = false">
          <div class="kv-search">
            <ion-icon :icon="searchOutline" class="kv-search-icon" aria-hidden="true" />

            <span v-if="isRange" class="kv-bar-static">Rentang harga</span>
            <input
              v-else
              ref="searchInput"
              v-model="query"
              type="search"
              :inputmode="searchInputMode"
              enterkeyhint="search"
              autocomplete="off"
              :placeholder="searchPlaceholder"
              :aria-label="searchPlaceholder"
              @keydown.enter="blurInput"
            />

            <button
              v-if="hasSearchInput"
              type="button"
              class="kv-bar-btn"
              aria-label="Hapus pencarian"
              @click="clearSearch"
            >
              <ion-icon :icon="closeOutline" />
            </button>

            <button
              type="button"
              :class="['kv-bar-btn', 'kv-filter-btn', { open: panelOpen, tuned: searchType !== 'text' }]"
              aria-label="Pilih jenis pencarian"
              aria-controls="kv-search-panel"
              :aria-expanded="panelOpen"
              @click="panelOpen = !panelOpen"
            >
              <ion-icon :icon="optionsOutline" />
            </button>
          </div>

          <!-- PANEL JENIS PENCARIAN -->
          <div v-if="panelOpen" id="kv-search-panel" class="kv-panel">
            <p id="kv-type-label" class="kv-panel-label">Cari berdasarkan</p>
            <div class="kv-types" role="group" aria-labelledby="kv-type-label">
              <button
                v-for="t in searchTypes"
                :key="t.key"
                type="button"
                :class="['kv-type', { active: searchType === t.key }]"
                :aria-pressed="searchType === t.key"
                @click="setSearchType(t.key)"
              >
                <span class="kv-type-icon" aria-hidden="true">{{ t.icon }}</span>
                {{ t.label }}
              </button>
            </div>

            <template v-if="searchType === 'price'">
              <p id="kv-mode-label" class="kv-panel-label">Metode harga</p>
              <div class="kv-types" role="group" aria-labelledby="kv-mode-label">
                <button
                  type="button"
                  :class="['kv-type', { active: priceMode === 'nearest' }]"
                  :aria-pressed="priceMode === 'nearest'"
                  @click="setPriceMode('nearest')"
                >
                  Harga terdekat
                </button>
                <button
                  type="button"
                  :class="['kv-type', { active: priceMode === 'range' }]"
                  :aria-pressed="priceMode === 'range'"
                  @click="setPriceMode('range')"
                >
                  Rentang harga
                </button>
              </div>
            </template>

            <p class="kv-panel-help">{{ typeHelp }}</p>
          </div>

          <!-- RENTANG HARGA -->
          <div v-if="isRange" class="kv-range-row">
            <div class="kv-range-field">
              <label for="kv-min-price">Harga minimum</label>
              <div class="kv-range-input">
                <span aria-hidden="true">Rp</span>
                <input
                  id="kv-min-price"
                  ref="minInput"
                  v-model="minPriceText"
                  type="text"
                  inputmode="text"
                  autocomplete="off"
                  placeholder="300jt"
                />
              </div>
            </div>
            <div class="kv-range-field">
              <label for="kv-max-price">Harga maksimum</label>
              <div class="kv-range-input">
                <span aria-hidden="true">Rp</span>
                <input
                  id="kv-max-price"
                  v-model="maxPriceText"
                  type="text"
                  inputmode="text"
                  autocomplete="off"
                  placeholder="450jt"
                />
              </div>
            </div>
          </div>

          <p v-if="searchType !== 'text' && !panelOpen" class="kv-mode">
            Cari berdasarkan <strong>{{ modeLabel }}</strong>
          </p>
          <p v-if="searchHint" class="kv-hint" role="status">{{ searchHint }}</p>
        </div>

        <!-- FILTER STATUS -->
        <div class="kv-chips" role="group" aria-label="Filter status kavling">
          <button
            v-for="chip in chips"
            :key="chip.key"
            type="button"
            :class="['kv-chip', { active: statusFilter === chip.key }]"
            :aria-pressed="statusFilter === chip.key"
            @click="statusFilter = chip.key"
          >
            <span v-if="chip.key !== 'all'" :class="['kv-dot', chip.key]" aria-hidden="true"></span>
            {{ chip.label }} ({{ chip.count }})
          </button>
        </div>

        <!-- LOADING -->
        <div v-if="loading" class="kv-state" role="status" aria-live="polite">
          <img
            :src="loadingMascot"
            alt=""
            class="kv-state-mascot"
            aria-hidden="true"
          />
          <ion-spinner name="crescent" />
          <strong>Memuat data kavling…</strong>
        </div>

        <!-- ERROR -->
        <div v-else-if="loadError" class="kv-state" role="alert">
          <img
            :src="errorMascot"
            alt=""
            class="kv-state-mascot"
            aria-hidden="true"
          />
          <ion-icon :icon="alertCircleOutline" aria-hidden="true" />
          <strong>Data kavling gagal dimuat</strong>
          <p>Periksa koneksi internet, lalu coba lagi.</p>
          <button type="button" class="kv-detail kv-detail-inline" @click="load(true)">Coba lagi</button>
        </div>

        <template v-else>
          <!-- LIST HEAD -->
          <div id="kv-list-top" class="kv-list-head">
            <h2>
              Daftar Kavling
            </h2>

            <div class="kv-sort">
              <ion-icon :icon="swapVerticalOutline" class="kv-sort-lead" aria-hidden="true" />
              <select v-model="sortModel" aria-label="Urutkan daftar kavling" :disabled="proximityActive">
                <option v-if="proximityActive" value="nearest">Paling mendekati</option>
                <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
                  {{ opt.label }}
                </option>
              </select>
              <ion-icon :icon="chevronDownOutline" class="kv-sort-caret" aria-hidden="true" />
            </div>
          </div>

          <p v-if="proximityActive" class="kv-note">Diurutkan dari yang paling mendekati pencarian.</p>

          <!-- LIST -->
          <ul v-if="filtered.length" class="kv-list">
            <li v-for="lot in pagedLots" :key="lot.id">
              <article :id="`lot-${lot.id}`" class="kv-card kv-lot">
                <div class="kv-lot-top">

                  <div class="kv-lot-info">
                    <h3>{{ lot.code }}</h3>
                    <p>{{ lot.meta }}</p>
                  </div>

                  <span :class="['kv-badge', lot.status]">
                    <ion-icon :icon="statusIcon[lot.status]" aria-hidden="true" />
                    {{ statusLabel[lot.status] }}
                  </span>
                </div>

                <div class="kv-lot-bottom">
                  <!-- HARGA: baris sendiri, tidak berbagi ruang dengan tombol -->
                  <div class="kv-money">
                    <span class="kv-money-label">{{ lot.hasPromo ? 'Harga promo' : 'Harga' }}</span>
                    <div class="kv-money-row">
                      <strong v-if="lot.price !== null">{{ formatRupiah(lot.price) }}</strong>
                      <strong v-else class="kv-money-empty">Belum diatur</strong>
                      <s v-if="lot.originalPrice !== null" class="kv-money-old">{{ formatRupiah(lot.originalPrice) }}</s>
                    </div>
                  </div>

                  <p v-if="lot.personLine" class="kv-person">
                    <ion-icon :icon="personOutline" aria-hidden="true" />
                    <span>{{ lot.personLine }}</span>
                  </p>

                  <!-- AKSI: baris sendiri di bawah harga -->
                  <div class="kv-actions">
                    <button
                      v-if="lot.status === 'available'"
                      type="button"
                      class="kv-icon-btn"
                      :aria-label="`Bagikan ${lot.code}`"
                      @click="shareLot(lot)"
                    >
                      <ion-icon :icon="shareSocialOutline" />
                    </button>

                    <a
                      v-if="lot.status !== 'available' && lot.phone"
                      class="kv-icon-btn"
                      :href="`tel:${lot.phone}`"
                      :aria-label="`Hubungi ${lot.person ?? 'pelanggan'}`"
                    >
                      <ion-icon :icon="callOutline" />
                    </a>

                    <button type="button" class="kv-detail" @click="openDetail(lot.id)">
                      Detail
                      <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
                    </button>
                  </div>
                </div>
              </article>
            </li>
          </ul>

          <!-- PAGINATION -->
          <nav v-if="filtered.length > 0 && totalPages > 1" class="kv-pager" aria-label="Halaman daftar kavling">
            <div class="kv-pager-controls">
              <button
                type="button"
                class="kv-pager-btn"
                aria-label="Halaman sebelumnya"
                :disabled="currentPage === 1"
                @click="goToPage(currentPage - 1)"
              >
                <ion-icon :icon="chevronBackOutline" />
              </button>

              <button
                v-for="page in visiblePages"
                :key="page ?? `ellipsis-${currentPage}`"
                type="button"
                class="kv-pager-number"
                :class="{ active: page === currentPage }"
                :disabled="page === null"
                :aria-current="page === currentPage ? 'page' : undefined"
                :aria-label="page === null ? undefined : `Halaman ${page}`"
                @click="page !== null && goToPage(page)"
              >
                {{ page ?? '…' }}
              </button>

              <button
                type="button"
                class="kv-pager-btn"
                aria-label="Halaman berikutnya"
                :disabled="currentPage === totalPages"
                @click="goToPage(currentPage + 1)"
              >
                <ion-icon :icon="chevronForwardOutline" />
              </button>
            </div>
            <span class="kv-pager-position">Halaman {{ currentPage }} dari {{ totalPages }}</span>
          </nav>

          <div v-if="filtered.length === 0" class="kv-state" role="status">
            <img
              :src="emptyMascot"
              alt=""
              class="kv-state-mascot"
              aria-hidden="true"
            />
            <strong>{{ lots.length ? 'Tidak ada kavling yang sesuai' : 'Belum ada data kavling' }}</strong>
            <p v-if="lots.length">Coba ubah kata kunci, jenis pencarian, atau filter status.</p>
          </div>
        </template>
      </div>
    </ion-content>

    <MobileTabBar variant="admin" />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import {
  IonPage,
  IonContent,
  IonIcon,
  IonSpinner,
  IonRefresher,
  IonRefresherContent,
  onIonViewWillEnter,
  useIonRouter,
} from '@ionic/vue'
import {
  searchOutline,
  closeOutline,
  optionsOutline,
  mapOutline,
  expandOutline,
  swapVerticalOutline,
  chevronDownOutline,
  chevronBackOutline,
  shareSocialOutline,
  callOutline,
  personOutline,
  chevronForwardOutline,
  checkmarkCircleOutline,
  timeOutline,
  closeCircleOutline,
  alertCircleOutline,
} from 'ionicons/icons'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import siteplanImage from '@/assets/siteplan/Siteplan.png'
import siteplanSvg from '@/assets/siteplan/LOTS_WITH_ID.svg?raw'
import loadingMascot from '@/assets/mascot/Chibi_House_Mascot_Exploring.png'
import errorMascot from '@/assets/mascot/Worried_Bee_Mascot_Facing_Loading Error.png'
import emptyMascot from '@/assets/mascot/Mascot_No_Data_Scene.png'
import { useSiteplan } from '@/composables/useSiteplant'
import { lotService, type LotRecord } from '@/services/lotService'
import { dimensionDistance, parseDimension, parseNumber, parsePrice } from '@/services/Admin/LotsearchService'
import { getLotId, getLotStatusColor } from '@/utils/siteplan'

type LotStatus = 'available' | 'booked' | 'sold'
type StatusFilter = 'all' | LotStatus
type SortMode =
  | 'number'
  | 'available-first'
  | 'booked-first'
  | 'sold-first'
  | 'price-asc'
  | 'price-desc'
type SearchType = 'text' | 'price' | 'dimension' | 'area'
type PriceMode = 'nearest' | 'range'

interface Lot {
  id: number
  /** lots.lot_number apa adanya, mis. "LOT_023" atau "23" */
  code: string
  /** angka pendek untuk chip */
  number: string
  blockName: string
  /** baris info: "Blok A · 120 m² · 8x15" */
  meta: string
  area: number | null
  dimension: string | null
  status: LotStatus
  price: number | null
  originalPrice: number | null
  hasPromo: boolean
  person: string | null
  phone: string | null
  /** "Pemesan: Hendra · 12 Okt 2026 · Cicilan" */
  personLine: string | null
}

/* ---------- state ---------- */

const ionRouter = useIonRouter()

/* siteplan: sumber data yang sama dengan halaman beranda */
const { lots: siteplanLots, reload: reloadSiteplan } = useSiteplan()
const siteplanLayer = ref<HTMLElement | null>(null)

function renderSiteplanLayers() {
  const svg = siteplanLayer.value?.querySelector('svg')
  if (!svg) return

  siteplanLots.value.forEach((lot) => {
    const id = getLotId(lot)
    const polygon = svg.querySelector(`#${CSS.escape(id)}`) as SVGElement | null
    if (!polygon) return
    polygon.style.setProperty('fill', getLotStatusColor(lot), 'important')
    polygon.style.setProperty('stroke', '#A7A7A7', 'important')
    polygon.style.setProperty('stroke-width', '1.2', 'important')
  })

  svg.querySelector('#admin-lot-label-layer')?.remove()
  const labelLayer = document.createElementNS('http://www.w3.org/2000/svg', 'g')
  labelLayer.setAttribute('id', 'admin-lot-label-layer')

  siteplanLots.value.forEach((lot) => {
    const polygon = svg.querySelector(`#${CSS.escape(getLotId(lot))}`) as SVGGraphicsElement | null
    if (!polygon || !lot.lot_number) return
    const box = polygon.getBBox()
    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text')
    label.setAttribute('x', String(box.x + box.width / 2))
    label.setAttribute('y', String(box.y + box.height / 2))
    label.setAttribute('text-anchor', 'middle')
    label.setAttribute('dominant-baseline', 'middle')
    label.setAttribute('font-size', '12')
    label.setAttribute('font-weight', '700')
    label.setAttribute('fill', '#1A1A1A')
    label.setAttribute('pointer-events', 'none')
    label.textContent = String(lot.lot_number).replace(/^LOT[_-]?/i, '')
    labelLayer.appendChild(label)
  })

  svg.appendChild(labelLayer)
}

watch(siteplanLots, async () => {
  await nextTick()
  renderSiteplanLayers()
}, { deep: true, immediate: true })

const lots = ref<Lot[]>([])
const loading = ref(true)
const loadError = ref(false)

const statusFilter = ref<StatusFilter>('all')
const sortMode = ref<SortMode>('number')

const searchType = ref<SearchType>('text')
const priceMode = ref<PriceMode>('nearest')
const query = ref('')
const minPriceText = ref('')
const maxPriceText = ref('')
const panelOpen = ref(false)

const searchInput = ref<HTMLInputElement | null>(null)
const minInput = ref<HTMLInputElement | null>(null)

const statusLabel: Record<LotStatus, string> = {
  available: 'Tersedia',
  booked: 'Dipesan',
  sold: 'Terjual',
}

const statusIcon: Record<LotStatus, string> = {
  available: checkmarkCircleOutline,
  booked: timeOutline,
  sold: closeCircleOutline,
}

const sortOptions: { value: SortMode; label: string }[] = [
  { value: 'number', label: 'Nomor kavling' },
  { value: 'available-first', label: 'Tersedia di atas' },
  { value: 'booked-first', label: 'Dipesan di atas' },
  { value: 'sold-first', label: 'Terjual di atas' },
  { value: 'price-asc', label: 'Harga terendah' },
  { value: 'price-desc', label: 'Harga tertinggi' },
]

const searchTypes: { key: SearchType; label: string; icon: string }[] = [
  { key: 'text', label: 'Nomor / nama', icon: '#' },
  { key: 'price', label: 'Harga', icon: 'Rp' },
  { key: 'dimension', label: 'Ukuran tanah', icon: '↔' },
  { key: 'area', label: 'Luas tanah', icon: 'm²' },
]

/* ---------- mapping tabel lots -> Lot ---------- */

function pick(
  source: Record<string, unknown> | Record<string, unknown>[] | null | undefined,
  keys: string[],
): string | null {
  if (!source) return null

  // Supabase mengembalikan relasi many-to-one sebagai object, tetapi
  // beberapa konfigurasi schema/client dapat mengembalikannya sebagai array.
  const record = Array.isArray(source) ? source[0] : source
  if (!record) return null

  for (const key of keys) {
    const value = record[key]
    if (typeof value === 'string' && value.trim()) return value.trim()
  }
  return null
}

function toNumber(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

function formatDate(value: string | null): string | null {
  if (!value) return null
  const d = new Date(`${value}T00:00:00`)
  if (Number.isNaN(d.getTime())) return null
  return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function mapStatus(value: LotRecord['status']): LotStatus {
  const v = (value ?? '').trim().toLowerCase()
  if (['booking', 'booked', 'dipesan'].includes(v)) return 'booked'
  if (['sold', 'terjual'].includes(v)) return 'sold'
  return 'available'
}

function mapLot(row: LotRecord): Lot {
  const status = row.sold_date ? 'sold' : mapStatus(row.status)

  const rawBlock = pick(row.block, ['name', 'block_name', 'title', 'code', 'label'])
  const blockName = rawBlock ? (/^blok\b/i.test(rawBlock) ? rawBlock : `Blok ${rawBlock}`) : 'Tanpa blok'

  const area = toNumber(row.area)
  const cash = toNumber(row.cash_price)
  const promo = toNumber(row.promo_price)
  const hasPromo = promo !== null && (cash === null || promo < cash)
  const price = hasPromo ? promo : cash
  const dimension = row.dimension?.trim() || null

  const metaParts = [
    rawBlock ? blockName : null,
    area !== null ? `${area.toLocaleString('id-ID')} m²` : null,
    dimension,
  ].filter(Boolean)

  const person = pick(row.customer, ['name', 'full_name', 'customer_name', 'nama'])
  const phone = pick(row.customer, ['phone', 'phone_number', 'whatsapp', 'telepon', 'no_hp'])
    ?.replace(/[^\d+]/g, '') ?? null

  let personLine: string | null = null
  if (status !== 'available') {
    const role = status === 'booked' ? 'Pemesan' : 'Pembeli'
    const date = formatDate(status === 'booked' ? row.booking_date : row.sold_date)
    const payment = row.payment_type === 'Installment' ? 'Cicilan' : row.payment_type === 'Cash' ? 'Cash' : null
    personLine = [`${role}: ${person ?? 'belum tercatat'}`, date, payment].filter(Boolean).join(' · ')
  }

  const lotNumber = row.lot_number.trim()
  const digits = lotNumber.match(/(\d+)\s*$/)?.[1]

  return {
    id: row.id,
    code: /^\d+$/.test(lotNumber) ? `Kavling ${lotNumber}` : lotNumber,
    number: digits ?? lotNumber.slice(0, 4),
    blockName,
    meta: metaParts.join(' · ') || 'Data ukuran belum diisi',
    area,
    dimension,
    status,
    price,
    originalPrice: hasPromo && cash !== null ? cash : null,
    hasPromo,
    person,
    phone: phone || null,
    personLine,
  }
}

/* ---------- loading ---------- */

async function load(showSpinner: boolean) {
  if (showSpinner) loading.value = true
  loadError.value = false

  try {
    const rows = await lotService.getLots()
    lots.value = rows.map(mapLot)
  } catch (error) {
    console.error('Gagal memuat kavling', error)
    loadError.value = true
  } finally {
    loading.value = false
  }
}

/* muat saat halaman dibuka; kunjungan berikutnya memuat ulang tanpa spinner */
onIonViewWillEnter(() => load(lots.value.length === 0))

async function onRefresh(event: CustomEvent) {
  await Promise.all([
    load(false),
    Promise.resolve(reloadSiteplan()).catch((error: unknown) => {
      console.error('Gagal refresh siteplan:', error)
    }),
  ])
  ;(event.target as { complete?: () => void } | null)?.complete?.()
}

/* ---------- pencarian ---------- */

const isRange = computed(() => searchType.value === 'price' && priceMode.value === 'range')

const priceTarget = computed(() => parsePrice(query.value))
const dimensionTarget = computed(() => parseDimension(query.value))
const areaTarget = computed(() => parseNumber(query.value))
const minPrice = computed(() => parsePrice(minPriceText.value))
const maxPrice = computed(() => parsePrice(maxPriceText.value))

/** true bila hasil diurutkan menurut kedekatan (harga terdekat, ukuran, luas) */
const proximityActive = computed(
  () =>
    (searchType.value === 'price' && priceMode.value === 'nearest' && priceTarget.value !== null) ||
    (searchType.value === 'dimension' && dimensionTarget.value !== null) ||
    (searchType.value === 'area' && areaTarget.value !== null),
)

const hasSearchInput = computed(
  () => query.value.trim() !== '' || minPriceText.value.trim() !== '' || maxPriceText.value.trim() !== '',
)

const searchPlaceholder = computed(() => {
  switch (searchType.value) {
    case 'price':
      return 'Harga target, mis. 400jt atau 400.000.000'
    case 'dimension':
      return 'Ukuran tanah, mis. 10x20'
    case 'area':
      return 'Luas tanah dalam m², mis. 120'
    default:
      return 'Cari nomor kavling atau nama pelanggan'
  }
})

const searchInputMode = computed(() => (searchType.value === 'area' ? 'decimal' : 'search'))

const modeLabel = computed(() => {
  if (searchType.value === 'price') return priceMode.value === 'range' ? 'Harga · rentang' : 'Harga · terdekat'
  if (searchType.value === 'dimension') return 'Ukuran tanah'
  if (searchType.value === 'area') return 'Luas tanah'
  return 'Nomor / nama'
})

const typeHelp = computed(() => {
  switch (searchType.value) {
    case 'price':
      return priceMode.value === 'range'
        ? 'Isi harga minimum dan/atau maksimum. Contoh: 300jt atau 300.000.000.'
        : 'Hasil diurutkan dari harga yang paling mendekati. Contoh: 400jt atau 400.000.000.'
    case 'dimension':
      return 'Contoh 10x20. Urutan 10x20 dan 20x10 dianggap sama.'
    case 'area':
      return 'Hasil diurutkan dari luas yang paling mendekati.'
    default:
      return 'Ketik nomor kavling, blok, atau nama pemesan/pembeli.'
  }
})

const searchHint = computed(() => {
  const q = query.value.trim()

  if (isRange.value) {
    const minText = minPriceText.value.trim()
    const maxText = maxPriceText.value.trim()
    if ((minText && minPrice.value === null) || (maxText && maxPrice.value === null)) {
      return 'Isi rentang harga dengan angka, contoh 300jt.'
    }
    if (minPrice.value !== null && maxPrice.value !== null && minPrice.value > maxPrice.value) {
      return 'Harga minimum lebih besar dari harga maksimum.'
    }
    return ''
  }

  if (!q) return ''
  if (searchType.value === 'price' && priceTarget.value === null) {
    return 'Harga belum terbaca. Contoh: 400jt atau 400.000.000.'
  }
  if (searchType.value === 'dimension' && dimensionTarget.value === null) {
    return 'Gunakan format panjang x lebar, contoh 10x20.'
  }
  if (searchType.value === 'area' && areaTarget.value === null) {
    return 'Isi luas dengan angka, contoh 120.'
  }
  return ''
})

function setSearchType(type: SearchType) {
  searchType.value = type
  query.value = ''
  minPriceText.value = ''
  maxPriceText.value = ''

  // harga masih perlu memilih metode, jadi panel tetap terbuka
  if (type !== 'price') {
    panelOpen.value = false
    void focusSearch()
  }
}

function setPriceMode(mode: PriceMode) {
  priceMode.value = mode
  query.value = ''
  minPriceText.value = ''
  maxPriceText.value = ''
  panelOpen.value = false
  void focusSearch()
}

function clearSearch() {
  query.value = ''
  minPriceText.value = ''
  maxPriceText.value = ''
  void focusSearch()
}

async function focusSearch() {
  await nextTick()
  const el = isRange.value ? minInput.value : searchInput.value
  el?.focus({ preventScroll: true })
}

function blurInput(event: KeyboardEvent) {
  ;(event.target as HTMLInputElement | null)?.blur()
}

function resetFilters() {
  statusFilter.value = 'all'
  searchType.value = 'text'
  priceMode.value = 'nearest'
  query.value = ''
  minPriceText.value = ''
  maxPriceText.value = ''
  panelOpen.value = false
}

/* ---------- derived ---------- */

const chips = computed(() => [
  { key: 'all' as const, label: 'Semua', count: lots.value.length },
  { key: 'available' as const, label: 'Tersedia', count: countOf('available') },
  { key: 'booked' as const, label: 'Dipesan', count: countOf('booked') },
  { key: 'sold' as const, label: 'Terjual', count: countOf('sold') },
])

function countOf(status: LotStatus) {
  return lots.value.filter((l) => l.status === status).length
}

const byNumber = (a: Lot, b: Lot) => a.code.localeCompare(b.code, 'id', { numeric: true })

const STATUS_PRIORITY: Partial<Record<SortMode, LotStatus[]>> = {
  'available-first': ['available', 'booked', 'sold'],
  'booked-first': ['booked', 'available', 'sold'],
  'sold-first': ['sold', 'booked', 'available'],
}

function sortLots(list: Lot[], mode: SortMode): Lot[] {
  const priority = STATUS_PRIORITY[mode]

  return [...list].sort((a, b) => {
    if (priority) {
      const diff = priority.indexOf(a.status) - priority.indexOf(b.status)
      return diff || byNumber(a, b)
    }

    if (mode === 'price-asc' || mode === 'price-desc') {
      // kavling tanpa harga selalu di akhir
      if (a.price === null && b.price === null) return byNumber(a, b)
      if (a.price === null) return 1
      if (b.price === null) return -1
      const diff = mode === 'price-asc' ? a.price - b.price : b.price - a.price
      return diff || byNumber(a, b)
    }

    return byNumber(a, b)
  })
}

function proximityScore(lot: Lot): number {
  if (searchType.value === 'price') {
    return lot.price === null || priceTarget.value === null ? Infinity : Math.abs(lot.price - priceTarget.value)
  }
  if (searchType.value === 'dimension') {
    return dimensionTarget.value ? dimensionDistance(lot.dimension, dimensionTarget.value) : Infinity
  }
  if (searchType.value === 'area') {
    return lot.area === null || areaTarget.value === null ? Infinity : Math.abs(lot.area - areaTarget.value)
  }
  return Infinity
}

const filtered = computed(() => {
  let result = lots.value.filter((l) => statusFilter.value === 'all' || l.status === statusFilter.value)

  /* cari nomor / blok / nama pelanggan */
  if (searchType.value === 'text') {
    const q = query.value
      .trim()
      .toLowerCase()
      .replace(/^(lot|kavling)[\s_-]*/, '')

    if (q) {
      result = result.filter(
        (l) =>
          l.code.toLowerCase().includes(q) ||
          l.number.includes(q) ||
          l.blockName.toLowerCase().includes(q) ||
          (l.person?.toLowerCase().includes(q) ?? false),
      )
    }
    return sortLots(result, sortMode.value)
  }

  /* rentang harga */
  if (isRange.value) {
    const min = minPrice.value ?? 0
    const max = maxPrice.value ?? Infinity

    if (minPrice.value !== null || maxPrice.value !== null) {
      result = result.filter((l) => l.price !== null && l.price >= min && l.price <= max)
    }
    return sortLots(result, sortMode.value)
  }

  /* harga terdekat, ukuran, luas: urut menurut kedekatan */
  if (proximityActive.value) {
    return result
      .map((lot) => ({ lot, distance: proximityScore(lot) }))
      .filter((item) => Number.isFinite(item.distance))
      .sort((a, b) => a.distance - b.distance || byNumber(a.lot, b.lot))
      .map((item) => item.lot)
  }

  /* kriteria belum diisi / belum terbaca: tampilkan semua */
  return sortLots(result, sortMode.value)
})

const sortModel = computed<string>({
  get: () => (proximityActive.value ? 'nearest' : sortMode.value),
  set: (value) => {
    if (value !== 'nearest') sortMode.value = value as SortMode
  },
})

/* ---------- pagination ---------- */

const PAGE_SIZE = 10
const currentPage = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const pagedLots = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filtered.value.slice(start, start + PAGE_SIZE)
})
const pageStart = computed(() => (filtered.value.length === 0 ? 0 : (currentPage.value - 1) * PAGE_SIZE + 1))
const pageEnd = computed(() => Math.min(currentPage.value * PAGE_SIZE, filtered.value.length))
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

watch([filtered, () => filtered.value.length], () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
}, { flush: 'post' })

async function goToPage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), totalPages.value)
  if (nextPage === currentPage.value) return

  currentPage.value = nextPage
  await nextTick()
  document.querySelector('#kv-list-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

/* ---------- helpers ---------- */

function formatRupiah(value: number) {
  return 'Rp ' + value.toLocaleString('id-ID')
}

/* ---------- actions ---------- */

async function shareLot(lot: Lot) {
  const text = [lot.code, lot.meta, lot.price !== null ? formatRupiah(lot.price) : null]
    .filter(Boolean)
    .join(' · ')
  try {
    if (navigator.share) {
      await navigator.share({ title: `PoliLand Kairagi ${lot.code}`, text })
    } else {
      await navigator.clipboard.writeText(text)
    }
  } catch {
    /* dibatalkan pengguna */
  }
}

function openFullMap() {
  ionRouter.push('/siteplan')
}

function openDetail(id: number) {
  ionRouter.push(`/admin/kavling/${id}`)
}
</script>

<style scoped>
.kv-page {
  padding: 16px 16px calc(112px + env(safe-area-inset-bottom));
  background: var(--app-background);
  font-family: var(--font-primary);
  color: var(--text-primary);
}

.kv-title {
  margin: 0 0 14px;
  font-size: 22px;
  line-height: 1.2;
  font-weight: var(--font-weight-extrabold);
  letter-spacing: -0.3px;
}

h2 {
  margin: 0;
}

/* ---------- search ---------- */
.kv-search {
  display: flex;
  align-items: center;
  gap: 4px;
  min-height: 52px;
  padding: 0 4px 0 14px;
  background: var(--surface-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
}

.kv-search:focus-within {
  border-color: var(--poliland-green);
  outline: 2px solid var(--poliland-green);
  outline-offset: 1px;
}

.kv-search-icon {
  flex-shrink: 0;
  margin-right: 6px;
  font-size: 20px;
  color: var(--text-secondary);
}

.kv-search input {
  flex: 1;
  min-width: 0;
  height: 48px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 15px;
}

.kv-search input::placeholder {
  color: var(--text-secondary);
}

.kv-bar-static {
  flex: 1;
  min-width: 0;
  font-size: 15px;
  font-weight: var(--font-weight-semibold);
  color: var(--text-primary);
}

.kv-bar-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  border-radius: calc(var(--radius-control) - 2px);
  background: transparent;
  color: var(--text-secondary);
  font-size: 20px;
  cursor: pointer;
}

.kv-filter-btn {
  color: var(--text-primary);
  background: var(--surface-muted);
}

.kv-filter-btn.tuned {
  background: var(--status-success-bg);
  color: var(--poliland-green);
}

.kv-filter-btn.open {
  background: var(--poliland-green);
  color: #fff;
}

.kv-bar-btn:focus-visible,
.kv-type:focus-visible,
.kv-chip:focus-visible,
.kv-link:focus-visible,
.kv-icon-btn:focus-visible,
.kv-detail:focus-visible,
.kv-sort:focus-within {
  outline: 3px solid var(--poliland-green);
  outline-offset: 2px;
}

/* panel jenis pencarian */
.kv-panel {
  margin-top: 8px;
  padding: 14px;
  background: var(--surface-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
}

.kv-panel-label {
  margin: 0 0 8px;
  font-size: 11px;
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.4px;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.kv-types {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
  margin-bottom: 14px;
}

.kv-type {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 6px 10px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-primary);
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
  text-align: left;
  cursor: pointer;
}

.kv-type.active {
  border-color: var(--poliland-green);
  background: var(--status-success-bg);
  color: var(--poliland-green);
}

.kv-type-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 28px;
  height: 28px;
  border-radius: 8px;
  background: var(--surface-muted);
  font-size: 11px;
  font-weight: var(--font-weight-bold);
}

.kv-panel-help {
  margin: 0;
  font-size: 12.5px;
  line-height: 1.45;
  color: var(--text-secondary);
}

/* rentang harga */
.kv-range-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-top: 10px;
}

.kv-range-field label {
  display: block;
  margin-bottom: 4px;
  font-size: 11px;
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.kv-range-input {
  display: flex;
  align-items: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 12px;
  background: var(--surface-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
}

.kv-range-input:focus-within {
  border-color: var(--poliland-green);
  outline: 2px solid var(--poliland-green);
  outline-offset: 1px;
}

.kv-range-input span {
  flex-shrink: 0;
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
  color: var(--text-secondary);
}

.kv-range-input input {
  flex: 1;
  min-width: 0;
  height: 44px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font: inherit;
  font-size: 15px;
}

.kv-range-input input::placeholder {
  color: var(--text-secondary);
}

.kv-mode,
.kv-hint,
.kv-note {
  margin: 8px 2px 0;
  font-size: 12.5px;
  line-height: 1.4;
}

.kv-mode,
.kv-note {
  color: var(--text-secondary);
}

.kv-mode strong {
  color: var(--text-primary);
}

.kv-hint {
  color: color-mix(in srgb, var(--status-danger) 70%, black);
}

.kv-note {
  margin: 0 2px 10px;
}

/* ---------- chips ---------- */
.kv-chips {
  display: flex;
  gap: 8px;
  margin: 12px -16px 16px;
  padding: 0 16px 2px;
  overflow-x: auto;
  scrollbar-width: none;
}

.kv-chips::-webkit-scrollbar {
  display: none;
}

.kv-chip {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  flex-shrink: 0;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--border-default);
  border-radius: 999px;
  background: var(--surface-primary);
  color: var(--text-primary);
  font: inherit;
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.kv-chip.active {
  background: var(--poliland-green);
  border-color: var(--poliland-green);
  color: #fff;
}

.kv-chip.active:focus-visible {
  outline-color: var(--text-primary);
}

/* ---------- dots ---------- */
.kv-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
}

.kv-dot.available { background: var(--poliland-green); }
.kv-dot.booked { background: var(--poliland-gold); }
.kv-dot.sold { background: var(--status-danger); }

.kv-chip.active .kv-dot {
  box-shadow: 0 0 0 2px #fff;
}

/* ---------- card base ---------- */
.kv-card {
  background: var(--surface-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
}

/* ---------- siteplan ---------- */
.kv-siteplan {
  margin-bottom: 22px;
}

.kv-siteplan-card {
  margin-top: 14px;
  padding: 16px;
  background: var(--surface-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  overflow: hidden;
}

.kv-siteplan-card-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 15px;
}

.kv-siteplan-eyebrow {
  display: block;
  margin-bottom: 6px;
  color: var(--poliland-gold-text);
  font-size: 9px;
  font-weight: var(--font-weight-extrabold);
  letter-spacing: 1px;
}

.kv-siteplan-card-head h3 {
  margin: 2px 0 0;
  color: var(--text-primary);
  font-size: 15px;
  font-weight: var(--font-weight-extrabold);
}

.kv-siteplan-card-head > ion-icon {
  color: var(--poliland-green);
  font-size: 22px;
}

.kv-mini-siteplan {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  aspect-ratio: 1252 / 1257;
  padding: 10px;
  border-radius: var(--radius-control);
  background: var(--surface-muted);
  overflow: hidden;
}

.kv-siteplan-image,
.kv-siteplan-layer {
  position: absolute;
  inset: 10px;
  width: calc(100% - 20px);
  height: calc(100% - 20px);
  border-radius: 8px;
}

.kv-siteplan-image { display: block; object-fit: contain; }
.kv-siteplan-layer { pointer-events: none; }
.kv-siteplan-layer :deep(svg) { display: block; width: 100%; height: 100%; overflow: visible; }
.kv-siteplan-layer :deep(path) { vector-effect: non-scaling-stroke; }

.kv-siteplan-legend {
  display: flex;
  flex-wrap: wrap;
  gap: 13px;
  margin-top: 13px;
}

.kv-siteplan-legend span {
  display: flex;
  align-items: center;
  gap: 5px;
  color: var(--text-secondary);
  font-size: 9px;
}

.kv-siteplan-legend i {
  width: 7px;
  height: 7px;
  border-radius: 50%;
}

.kv-siteplan-legend .available { background: var(--poliland-green); }
.kv-siteplan-legend .booking { background: var(--poliland-gold); }
.kv-siteplan-legend .sold { background: var(--status-danger); }

.kv-siteplan-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  min-height: 44px;
  margin-top: 14px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--poliland-gold);
  color: #fff;
  font: inherit;
  font-size: 12px;
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}

.kv-siteplan-button:focus-visible {
  outline: 3px solid var(--poliland-green);
  outline-offset: 2px;
}

.kv-map-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.kv-map-head h2,
.kv-list-head h2 {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  font-size: 15px;
  font-weight: var(--font-weight-bold);
}

.kv-map-head h2 ion-icon {
  font-size: 18px;
  color: var(--poliland-green);
}

.kv-link {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  min-height: 44px;
  padding: 0 6px;
  border: 0;
  background: transparent;
  color: var(--poliland-green);
  font: inherit;
  font-size: 13px;
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}

.kv-link ion-icon {
  font-size: 16px;
}

/* ---------- list head + urutan ---------- */
.kv-list-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 2px 12px;
  margin-bottom: 8px;
}

.kv-count {
  padding: 3px 9px;
  border-radius: 999px;
  background: var(--surface-muted);
  color: var(--text-secondary);
  font-size: 12px;
  font-weight: var(--font-weight-semibold);
}

.kv-sort {
  position: relative;
  display: inline-flex;
  align-items: center;
  min-height: 44px;
  border-radius: var(--radius-control);
  color: var(--poliland-green);
}

.kv-sort select {
  appearance: none;
  -webkit-appearance: none;
  min-height: 44px;
  padding: 0 22px 0 24px;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 13px;
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}

.kv-sort select:disabled {
  color: var(--text-secondary);
  opacity: 1;
  cursor: default;
}

.kv-sort select:focus {
  outline: 0;
}

.kv-sort select option {
  color: var(--text-primary);
  font-weight: var(--font-weight-medium);
}

.kv-sort-lead,
.kv-sort-caret {
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
  font-size: 15px;
  pointer-events: none;
}

.kv-sort-lead { left: 4px; }
.kv-sort-caret { right: 4px; font-size: 13px; }

.kv-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

/* ---------- lot card ---------- */
.kv-lot {
  padding: 14px;
}

.kv-lot-top {
  display: flex;
  align-items: center;
  gap: 12px;
}

.kv-num {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  border-radius: var(--radius-control);
  border: 1px solid;
  font-size: 14px;
  font-weight: var(--font-weight-bold);
}

.kv-num.available { background: var(--status-success-bg); border-color: var(--poliland-green); color: var(--poliland-green); }
.kv-num.booked { background: color-mix(in srgb, var(--poliland-gold) 18%, white); border-color: var(--poliland-gold); color: var(--poliland-gold-text-soft); }
.kv-num.sold { background: color-mix(in srgb, var(--status-danger) 10%, white); border-color: var(--status-danger); color: color-mix(in srgb, var(--status-danger) 70%, black); }

.kv-lot-info {
  flex: 1;
  min-width: 0;
}

.kv-lot-info h3 {
  margin: 0;
  font-size: 16px;
  font-weight: var(--font-weight-bold);
}

.kv-lot-info p {
  margin: 3px 0 0;
  font-size: 12.5px;
  line-height: 1.35;
  color: var(--text-secondary);
}

.kv-badge {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  flex-shrink: 0;
  padding: 5px 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: var(--font-weight-bold);
}

.kv-badge ion-icon {
  font-size: 14px;
}

.kv-badge.available { background: var(--status-success-bg); color: var(--poliland-green); }
.kv-badge.booked { background: color-mix(in srgb, var(--poliland-gold) 20%, white); color: var(--poliland-gold-text-soft); }
.kv-badge.sold { background: color-mix(in srgb, var(--status-danger) 11%, white); color: color-mix(in srgb, var(--status-danger) 70%, black); }

/* ---------- harga + aksi: dua baris terpisah ---------- */
.kv-lot-bottom {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-default);
}

.kv-money {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.kv-money-label {
  font-size: 11px;
  font-weight: var(--font-weight-semibold);
  letter-spacing: 0.3px;
  text-transform: uppercase;
  color: var(--text-secondary);
}

.kv-money-row {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 4px 10px;
}

.kv-money-row strong {
  font-size: 18px;
  font-weight: var(--font-weight-extrabold);
  letter-spacing: -0.2px;
}

.kv-money-empty {
  color: var(--text-secondary);
  font-weight: var(--font-weight-semibold) !important;
}

.kv-money-old {
  font-size: 12.5px;
  color: var(--text-secondary);
}

.kv-person {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  font-size: 12.5px;
  line-height: 1.4;
  color: var(--text-secondary);
}

.kv-person ion-icon {
  flex-shrink: 0;
  margin-top: 1px;
  font-size: 15px;
}

.kv-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.kv-icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-primary);
  color: var(--text-primary);
  font-size: 20px;
  text-decoration: none;
  cursor: pointer;
}

.kv-icon-btn:active,
.kv-detail:active {
  background: var(--surface-muted);
}

.kv-detail {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 1;
  gap: 2px;
  min-height: 44px;
  padding: 0 14px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--surface-muted);
  color: var(--text-primary);
  font: inherit;
  font-size: 14px;
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}

.kv-detail-inline {
  flex: 0 0 auto;
}

.kv-detail ion-icon {
  font-size: 16px;
}

/* ---------- pagination ---------- */
.kv-pager {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(90px, 1fr);
  align-items: center;
  gap: 14px;
  margin-top: 18px;
  padding: 16px 0 4px;
  border-top: 1px solid var(--border-default);
}

.kv-pager-summary { min-width: 0; }

.kv-pager-kicker {
  display: block;
  margin-bottom: 3px;
  color: var(--poliland-gold-text);
  font-size: 11px;
  font-weight: var(--font-weight-bold);
  letter-spacing: 0.45px;
  text-transform: uppercase;
}

.kv-pager-info {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
  line-height: 1.35;
}

.kv-pager-info strong {
  color: var(--text-primary);
  font-weight: var(--font-weight-bold);
}

.kv-pager-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 6px;
  flex-wrap: nowrap;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 3px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-panel);
  background: var(--surface-muted);
}

.kv-pager-controls::-webkit-scrollbar { display: none; }

.kv-pager-position {
  color: var(--text-secondary);
  font-size: 12px;
  text-align: center;
  white-space: nowrap;
}

.kv-pager-btn,
.kv-pager-number {
  min-width: 44px;
  height: 44px;
  padding: 0 10px;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  background: var(--surface-primary);
  color: var(--text-primary);
  font: inherit;
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}

.kv-pager-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.kv-pager-number.active {
  border-color: var(--poliland-green);
  background: var(--poliland-green);
  color: #fff;
}

.kv-pager-btn:not(:disabled):hover,
.kv-pager-number:not(:disabled):not(.active):hover {
  border-color: var(--poliland-green);
  background: var(--status-success-bg);
}

.kv-pager-btn:disabled,
.kv-pager-number:disabled {
  cursor: default;
  opacity: 1;
  border-color: transparent;
  background: transparent;
}

.kv-pager-btn:focus-visible,
.kv-pager-number:focus-visible {
  outline: 3px solid var(--poliland-green);
  outline-offset: 2px;
}

@media (max-width: 560px) {
  .kv-pager {
    grid-template-columns: 1fr auto;
    gap: 10px;
  }

  .kv-pager-controls {
    grid-column: 1 / -1;
    grid-row: 2;
    justify-self: stretch;
    justify-content: flex-start;
  }

  .kv-pager-position {
    grid-column: 1 / -1;
    grid-row: 3;
    align-self: center;
    justify-self: center;
  }
}

/* ---------- loading / empty / error ---------- */
.kv-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 32px 16px;
  text-align: center;
  background: var(--surface-primary);
  border: 1px dashed var(--border-default);
  border-radius: var(--radius-card);
}

.kv-state ion-icon {
  font-size: 28px;
  color: var(--text-secondary);
}

.kv-state ion-spinner {
  color: var(--poliland-green);
}

.kv-state-mascot {
  display: block;
  width: min(132px, 42vw);
  height: auto;
  margin-bottom: 2px;
  object-fit: contain;
}

.kv-state p {
  margin: 0 0 8px;
  font-size: 13px;
  color: var(--text-secondary);
}

/* ---------- 320px ---------- */
@media (max-width: 360px) {
  .kv-lot-top { flex-wrap: wrap; }
  .kv-badge { margin-left: 56px; }
  .kv-types { grid-template-columns: 1fr; }
  .kv-range-row { grid-template-columns: 1fr; }
}
</style>
