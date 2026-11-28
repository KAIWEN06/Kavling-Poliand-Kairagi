<template>
  <ion-page class="pl-admin">
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />

    <AppPullRefresh scoped :refresh-handler="refreshAll" />

    <ion-content :fullscreen="true" :scroll-events="true" @ionScroll="syncMaket">

      <div class="kv-page">
        
        <!-- DENAH (maket yang sama dengan beranda) -->
        <Reveal :order="1">
          <section class="kv-siteplan" aria-label="Denah">
            <SectionHeader title="Denah" />
            <KavlingMaket ref="maketRef" :lots="siteplanLots" @goToSiteplan="openFullMap" />
          </section>
        </Reveal>

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

        <!-- FILTER STATUS: satu bar angka, tiap kolom bisa diketuk -->
        <div class="kv-chips" role="group" aria-label="Filter status kaveling">
          <button
            v-for="chip in chips"
            :key="chip.key"
            type="button"
            :class="['kv-chip', { active: statusFilter === chip.key }]"
            :aria-pressed="statusFilter === chip.key"
            @click="statusFilter = chip.key"
          >
            <strong class="kv-chip-count">{{ chip.count }}</strong>
            <span class="kv-chip-label">
              <span v-if="chip.key !== 'all'" :class="['kv-dot', chip.key]" aria-hidden="true"></span>
              {{ chip.label }}
            </span>
          </button>
        </div>

        <!-- LOADING -->
        <SkeletonLotList v-if="loading || refreshing" :count="4" />

        <!-- ERROR -->
        <StatusIllustration
          v-else-if="loadError"
          :variant="resolveErrorVariant()"
          title="Data kaveling gagal dimuat"
          fill
          :on-action="() => load(true)"
        />

        <template v-else>
          <!-- LIST HEAD -->
          <div id="kv-list-top" class="kv-list-head">
            <SectionHeader title="Daftar kaveling">
              <div class="kv-sort">
                <ion-icon :icon="swapVerticalOutline" class="kv-sort-lead" aria-hidden="true" />
                <select v-model="sortModel" aria-label="Urutkan daftar kaveling" :disabled="proximityActive">
                  <option v-if="proximityActive" value="nearest">Paling mendekati</option>
                  <option v-for="opt in sortOptions" :key="opt.value" :value="opt.value">
                    {{ opt.label }}
                  </option>
                </select>
                <ion-icon :icon="chevronDownOutline" class="kv-sort-caret" aria-hidden="true" />
              </div>
            </SectionHeader>
          </div>

          <p v-if="proximityActive" class="kv-note">Diurutkan dari yang paling mendekati pencarian.</p>

          <LotSurveyBanner :surveys="surveyByLot" />

          <!-- LIST -->
          <ul v-if="filtered.length" class="kv-list">
            <li v-for="lot in pager.items" :key="lot.id">
              <article :id="`lot-${lot.id}`" :class="['kv-card', 'kv-lot', { 'kv-lot--survey': surveyByLot.has(lot.id) }]">
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

                <LotSurveyMarker
                  v-if="surveyByLot.get(lot.id)"
                  :info="surveyByLot.get(lot.id)!"
                  :action-hint="surveyByLot.get(lot.id)!.status === 'pending' ? 'Ketuk untuk konfirmasi' : 'Ketuk untuk tandai selesai'"
                  @open="openSurveyRequests(surveyByLot.get(lot.id)!.status)"
                />

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
                      type="button"
                      class="kv-icon-btn"
                      :aria-label="`Bagikan ${lot.code}`"
                      @click="share(lotContent(lot))"
                    >
                      <ion-icon :icon="shareSocialOutline" aria-hidden="true" />
                    </button>

                    <button
                      type="button"
                      class="kv-icon-btn"
                      :aria-label="`Salin info ${lot.code}`"
                      @click="copy(lotContent(lot))"
                    >
                      <ion-icon :icon="copyOutline" aria-hidden="true" />
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

          <AppPagination v-model:page="pager.page" :total-pages="pager.totalPages" :total="pager.total" :page-size="pager.pageSize" scroll-to="#kv-list-top" label="Halaman daftar kaveling" />

          <StatusIllustration
            v-if="filtered.length === 0"
            :variant="lots.length ? 'no-result' : 'empty-data'"
            :title="lots.length ? 'Kavling tidak ditemukan' : 'Belum ada data kavling'"
            :description="lots.length ? 'Coba ubah kata kunci, jenis pencarian, atau filter status.' : 'Data kavling akan tampil di sini setelah tersedia.'"
            :on-action="lots.length ? resetFilters : undefined"
          />
        </template>
      </div>

      <!-- Penutup: bukit dan matahari seperti beranda -->
      <div class="kv-footer" aria-hidden="true">
        <SceneBackdrop class="kv-footer__scene" height="100%" :sway="false" />
      </div>
    </ion-content>

    <MobileTabBar variant="admin" />
  </ion-page>
</template>

<script setup lang="ts">
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import SkeletonLotList from '@/components/ui/skeletons/SkeletonLotList.vue'
import { withRefreshSkeleton } from '@/utils/refreshSkeleton'
import Reveal from '@/components/ui/Reveal.vue'
import { computed, nextTick, ref } from 'vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import { usePagination } from '@/composables/usePagination'
import {
  IonPage,
  IonContent,
  IonIcon,
  onIonViewWillEnter,
  useIonRouter,
} from '@ionic/vue'
import {
  searchOutline,
  closeOutline,
  optionsOutline,
  swapVerticalOutline,
  chevronDownOutline,
  shareSocialOutline,
  copyOutline,
  callOutline,
  personOutline,
  chevronForwardOutline,
  checkmarkCircleOutline,
  timeOutline,
  closeCircleOutline,
} from 'ionicons/icons'

import AppPullRefresh from '@/components/common/AppPullRefresh.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import KavlingMaket from '@/components/home/KavlingMaket.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import SceneBackdrop from '@/components/ui/SceneBackdrop.vue'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import { useSiteplan } from '@/composables/useSiteplant'
import { lotService, type LotRecord } from '@/services/lotService'
import LotSurveyMarker from '@/components/common/LotSurveyMarker.vue'
import LotSurveyBanner from '@/components/common/LotSurveyBanner.vue'
import { pinSurveyLots, surveyService, type LotSurveyInfo } from '@/services/surveyService'
import { dimensionDistance, parseDimension, parseNumber, parsePrice } from '@/services/Admin/LotsearchService'
import { lotShareContent } from '@/utils/shareLot'
import { useShareLot } from '@/composables/useShareLot'

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
const maketRef = ref<InstanceType<typeof KavlingMaket> | null>(null)
const syncMaket = () => maketRef.value?.sync()

const lots = ref<Lot[]>([])
const loading = ref(true)
const refreshing = ref(false)
const loadError = ref(false)

/* jadwal survei aktif, diambil terpisah supaya kegagalannya tidak memblokir daftar */
const surveyByLot = ref<Map<number, LotSurveyInfo>>(new Map())

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

function resetFilters() {
  statusFilter.value = 'all'
  query.value = ''
  minPriceText.value = ''
  maxPriceText.value = ''
}

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
  { value: 'number', label: 'Nomor kaveling' },
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
  const blockName = rawBlock ? (/^blok\b/i.test(rawBlock) ? rawBlock : `${rawBlock}`) : 'Tanpa blok'

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
  // 12A adalah nomor kaveling pengganti 13, jadi akhiran huruf ikut dianggap nomor.
  const digits = lotNumber.match(/(\d+[A-Z]?)$/i)?.[1]

  return {
    id: row.id,
    code: /^\d+[A-Z]?$/i.test(lotNumber) ? `Kaveling ${lotNumber}` : lotNumber,
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

async function load(showSpinner: boolean, { silent = false }: LoadOptions = {}) {
  if (showSpinner) loading.value = true
  if (!silent) loadError.value = false

  try {
    const [rows, surveys] = await Promise.all([
      lotService.getLots(),
      surveyService.getMySchedule().catch((error: unknown) => {
        console.error('Gagal memuat jadwal survei', error)
        return new Map<number, LotSurveyInfo>()
      }),
    ])
    lots.value = rows.map(mapLot)
    loadError.value = false
    surveyByLot.value = surveys
  } catch (error) {
    console.error('Gagal memuat kaveling', error)
    if (!silent || lots.value.length === 0) loadError.value = true
  } finally {
    loading.value = false
  }
}

/* muat saat halaman dibuka; kunjungan berikutnya memuat ulang tanpa spinner */
onIonViewWillEnter(() => load(lots.value.length === 0))

function refreshAll() {
  return withRefreshSkeleton(refreshing, () =>
    Promise.all([
      load(false),
      Promise.resolve(reloadSiteplan()).catch((error: unknown) => {
        console.error('Gagal refresh siteplan:', error)
      }),
    ]),
  )
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
      return 'Cari nomor kaveling atau nama pelanggan'
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
  (event.target as HTMLInputElement | null)?.blur()
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

/** kavling berjadwal survei selalu paling atas (terdekat dulu); sisanya mengikuti urutan pilihan */
const filtered = computed(() => pinSurveyLots(matched.value, surveyByLot.value))

const matched = computed(() => {
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

const pager = usePagination(filtered, {
  pageSize: 10,
  resetOn: [statusFilter, sortMode, searchType, priceMode, query, minPriceText, maxPriceText],
})

/* ---------- helpers ---------- */

const { share, copy } = useShareLot()

function formatRupiah(value: number) {
  return 'Rp ' + value.toLocaleString('id-ID')
}

/* ---------- actions ---------- */

function lotContent(lot: Lot) {
  return lotShareContent({
    id: lot.id,
    name: lot.code,
    details: lot.meta === 'Data ukuran belum diisi' ? '' : lot.meta,
    price: lot.status === 'available' && lot.price !== null ? formatRupiah(lot.price) : '',
    status: statusLabel[lot.status],
  })
}

function openFullMap() {
  ionRouter.push('/admin/siteplan')
}

function openSurveyRequests(status: 'pending' | 'confirmed') {
  ionRouter.push(`/admin/survei?status=${status}`)
}

function openDetail(id: number) {
  ionRouter.push(`/admin/kavling/${id}`)
}

useRealtimeRefresh(
  ['lots', 'blocks', 'lot_transactions', 'spk_requests', 'survey_requests'],
  () => Promise.all([load(false, { silent: true }), reloadSiteplan({ silent: true })]),
)

</script>

<style scoped src="../../theme/kavling-list.css"></style>
