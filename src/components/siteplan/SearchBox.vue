<template>
  <div ref="wrapper" class="search-wrapper">
    <!-- SEARCH BAR -->
    <div
      ref="inputWrapper"
      class="search-input-wrapper"
      :class="{ expanded, collapsed: !expanded }"
      @pointerdown.stop
      @pointerup.stop
    >
      <!-- Collapsed -->
      <button
        v-if="!expanded"
        type="button"
        class="search-collapsed-button"
        aria-label="Buka pencarian"
        @click.stop="openBar"
      >
        <ion-icon :icon="searchOutline" class="search-icon" />
      </button>

      <!-- Expanded -->
      <template v-else>
        <ion-icon :icon="searchOutline" class="search-icon" />

        <input
          ref="inputEl"
          v-model="query"
          class="search-input"
          type="text"
          enterkeyhint="search"
          :placeholder="searchPlaceholder"
          @focus="handleFocus"
          @input="handleInput"
          @keydown="handleKeyDown"
        />

        <button
          v-if="query"
          type="button"
          class="search-clear"
          aria-label="Hapus pencarian"
          @mousedown.prevent="blurSearchInput"
          @click.stop="clearQueryOnly"
        >
          <ion-icon :icon="closeOutline" />
        </button>

        <button
          type="button"
          class="search-filter-button"
          :class="{ active: filterOpen }"
          aria-label="Filter pencarian"
          @mousedown.prevent="blurSearchInput"
          @click.stop="toggleFilter"
        >
          <ion-icon :icon="optionsOutline" />
        </button>
      </template>
    </div>

    <!-- FILTER PANEL: hanya untuk setting -->
    <Teleport to="body">
      <div
        v-if="filterOpen"
        class="search-filter-overlay"
        @click="closeFilter"
      >
        <section
          class="search-filter-panel"
          @pointerdown.stop
          @pointermove.stop
          @pointerup.stop
          @click.stop
        >
          <div class="filter-header">
            <div>
              <div class="filter-title">Cari Kavling</div>
              <div class="filter-subtitle">
                Atur kriteria pencarian terlebih dahulu
              </div>
            </div>

            <button
              type="button"
              class="filter-close"
              aria-label="Tutup filter"
              @click="closeFilter"
            >
              <ion-icon :icon="closeOutline" />
            </button>
          </div>

          <div class="filter-section">
            <div class="filter-label">CARI BERDASARKAN</div>

            <div class="filter-types">
              <button
                type="button"
                class="filter-type"
                :class="{ active: searchType === 'lot' }"
                @click="setSearchType('lot')"
              >
                <span class="filter-type-icon">#</span>
                <span>Nomor Kavling</span>
              </button>

              <button
                type="button"
                class="filter-type"
                :class="{ active: searchType === 'price' }"
                @click="setSearchType('price')"
              >
                <span class="filter-type-icon">Rp</span>
                <span>Harga</span>
              </button>

              <button
                type="button"
                class="filter-type"
                :class="{ active: searchType === 'dimension' }"
                @click="setSearchType('dimension')"
              >
                <span class="filter-type-icon">↔</span>
                <span>Ukuran Tanah</span>
              </button>

              <button
                type="button"
                class="filter-type"
                :class="{ active: searchType === 'area' }"
                @click="setSearchType('area')"
              >
                <span class="filter-type-icon">m²</span>
                <span>Luas Tanah</span>
              </button>
            </div>
          </div>

          <!-- NOMOR KAVLING -->
          <template v-if="searchType === 'lot'">
            <div class="filter-section">
              <div class="filter-label">NOMOR KAVLING</div>

              <div class="dimension-input-wrapper">
                <span>#</span>
                <input
                  v-model="lotQuery"
                  type="text"
                  inputmode="text"
                  class="filter-input"
                  placeholder="Contoh: 022 atau LOT_022"
                  @keydown.enter.prevent="executeFilterSearch"
                />
              </div>

              <small class="filter-help">
                Masukkan nomor kavling, misalnya 022 atau LOT_022.
              </small>
            </div>
          </template>

          <!-- PRICE -->
          <template v-if="searchType === 'price'">
            <div class="filter-section">
              <div class="filter-label">METODE PENCARIAN HARGA</div>

              <div class="price-modes">
                <button
                  type="button"
                  class="price-mode"
                  :class="{ active: priceMode === 'nearest' }"
                  @click="priceMode = 'nearest'"
                >
                  <strong>Harga terdekat</strong>
                  <small>Mencari harga yang paling mendekati</small>
                </button>

                <button
                  type="button"
                  class="price-mode"
                  :class="{ active: priceMode === 'range' }"
                  @click="priceMode = 'range'"
                >
                  <strong>Rentang harga</strong>
                  <small>Dari minimum sampai maksimum</small>
                </button>
              </div>
            </div>

            <div
              v-if="priceMode !== 'range'"
              class="filter-section"
            >
              <div class="filter-label">HARGA TARGET</div>

              <div class="price-input-wrapper">
                <span>Rp</span>
                <input
                  v-model.number="priceValue"
                  type="number"
                  inputmode="numeric"
                  class="filter-input price-input"
                  placeholder="150000000"
                  @keydown.enter.prevent="executeFilterSearch"
                />
              </div>

              <small class="filter-help">
                Setelah ditutup, ketik di kotak pencarian atau tekan Enter
                untuk menampilkan hasil.
              </small>
            </div>

            <div
              v-else
              class="filter-section"
            >
              <div class="range-inputs">
                <div>
                  <div class="filter-label">MINIMUM</div>
                  <div class="price-input-wrapper">
                    <span>Rp</span>
                    <input
                      v-model.number="minPrice"
                      type="number"
                      inputmode="numeric"
                      class="filter-input price-input"
                      placeholder="100000000"
                      @keydown.enter.prevent="executeFilterSearch"
                    />
                  </div>
                </div>

                <div>
                  <div class="filter-label">MAKSIMUM</div>
                  <div class="price-input-wrapper">
                    <span>Rp</span>
                    <input
                      v-model.number="maxPrice"
                      type="number"
                      inputmode="numeric"
                      class="filter-input price-input"
                      placeholder="150000000"
                    />
                  </div>
                </div>
              </div>

              <small class="filter-help">
                Filter hanya disimpan di sini. Hasil tidak akan muncul
                sebelum kamu melakukan pencarian dari search bar.
              </small>
            </div>
          </template>

          <!-- DIMENSION -->
          <template v-if="searchType === 'dimension'">
            <div class="filter-section">
              <div class="filter-label">UKURAN TANAH</div>

              <div class="dimension-input-wrapper">
                <span>↔</span>
                <input
                  v-model="dimensionQuery"
                  type="text"
                  inputmode="decimal"
                  class="filter-input"
                  placeholder="Contoh: 10x20"
                  @keydown.enter.prevent="executeFilterSearch"
                />
              </div>

              <small class="filter-help">
                Contoh 10x20, 10 x 20, atau 10×20. Urutan 10x20 dan 20x10
                dianggap sama.
              </small>
            </div>
          </template>

          <!-- AREA -->
          <template v-if="searchType === 'area'">
            <div class="filter-section">
              <div class="filter-label">LUAS TANAH</div>

              <div class="area-input-wrapper">
                <input
                  v-model.number="areaValue"
                  type="number"
                  inputmode="decimal"
                  class="filter-input"
                  placeholder="Contoh: 200"
                />
                <span>m²</span>
              </div>

              <small class="filter-help">
                Sistem mengurutkan hasil berdasarkan luas yang paling dekat.
              </small>
            </div>
          </template>

          <!-- CARI -->
          <div class="filter-action">
            <AppButton
              color="primary"
              fill="solid"
              expand="block"
              :disabled="!canExecuteFilterSearch"
              @click="executeFilterSearch"
            >
              Cari
            </AppButton>
          </div>

          <button
            type="button"
            class="filter-reset"
            @click="resetFilter"
          >
            Reset pencarian
          </button>
        </section>
      </div>
    </Teleport>

    <!-- RESULT: hanya muncul setelah user menjalankan pencarian -->
    <Teleport to="body">
      <div
        v-if="isOpen && !filterOpen && filteredLots.length"
        class="search-results"
        :style="resultsStyle"
      >
        <button
          v-for="(lot, index) in filteredLots"
          :key="getLotId(lot)"
          type="button"
          class="search-result"
          :class="{ active: index === selectedIndex }"
          @mousedown.prevent="blurSearchInput"
          @click.stop="selectLot(lot)"
        >
          <div class="result-main">
            <strong>
              {{ lot.lot_number || lot.polygon_id || 'Lot' }}
            </strong>

            <span
              v-if="getPrice(lot) !== null"
              class="result-price"
            >
              {{ formatPrice(getPrice(lot)) }}
            </span>
          </div>

          <small>
            {{ lot.dimension || '-' }}
            •
            {{ formatArea(lot.area) }}
            •
            {{ getStatusLabel(lot.status) }}
          </small>
        </button>
      </div>

      <div
        v-else-if="isOpen && !filterOpen && searchExecuted && hasSearchCriteria && !filteredLots.length"
        class="search-empty"
        :style="resultsStyle"
      >
        <img
          src="@/assets/mascot/Mascot_No_Data_Scene.png"
          alt="Tidak ada data kavling"
          class="search-empty-mascot"
        />

        <div class="search-empty-content">
          <strong>Tidak ada kavling yang sesuai</strong>
          <span>Coba ubah kata kunci atau filter pencarian.</span>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount,
  nextTick,
  watch
} from 'vue'

import { IonIcon } from '@ionic/vue'
import AppButton from '@/components/ui/AppButton.vue'

import {
  searchOutline,
  closeOutline,
  optionsOutline
} from 'ionicons/icons'

import {
  getLotId,
  getStatusLabel
} from '../../utils/siteplan'

function blurSearchInput() {
  inputEl.value?.blur()

  const activeElement = document.activeElement

  if (activeElement instanceof HTMLElement) {
    activeElement.blur()
  }
}

const props = defineProps<{
  lots?: any[]
}>()

const emit = defineEmits<{
  (event: 'select', lot: any): void
}>()

/* =========================================================
   STATE
   ========================================================= */

const query = ref('')
const lotQuery = ref('')
const expanded = ref(false)
const isOpen = ref(false)
const filterOpen = ref(false)
const searchExecuted = ref(false)

const inputEl =
  ref<HTMLInputElement | null>(null)

const wrapper =
  ref<HTMLElement | null>(null)

const inputWrapper =
  ref<HTMLElement | null>(null)

const selectedIndex = ref(-1)

/* =========================================================
   SEARCH MODE GLOBAL EVENT
   ========================================================= */

function emitSearchMode(active: boolean) {
  window.dispatchEvent(
    new CustomEvent('poliland-search-mode', {
      detail: { active }
    })
  )
}

watch(
  expanded,
  (active) => {
    emitSearchMode(active)
  }
)

const searchType =
  ref<
    'lot' |
    'price' |
    'dimension' |
    'area'
  >('lot')

const priceMode =
  ref<
    'nearest' |
    'range'
  >('nearest')

const priceValue =
  ref<number | null>(null)

const minPrice =
  ref<number | null>(null)

const maxPrice =
  ref<number | null>(null)

const dimensionQuery = ref('')
const areaValue = ref<number | null>(null)

/* =========================================================
   RESULT POSITION
   ========================================================= */

const resultsTop = ref(0)
const resultsLeft = ref(0)
const resultsWidth = ref(0)

const resultsStyle = computed(() => ({
  top: `${resultsTop.value}px`,
  left: `${resultsLeft.value}px`,
  width: `${resultsWidth.value}px`
}))

/* =========================================================
   PLACEHOLDER
   ========================================================= */

const searchPlaceholder = computed(() => {
  switch (searchType.value) {
    case 'price':
      if (priceMode.value === 'range') {
        return 'Cari dalam rentang harga...'
      }

      return 'Masukkan harga...'

    case 'dimension':
      return 'Cari ukuran, contoh 10x20...'

    case 'area':
      return 'Cari luas, contoh 200 m²...'

    default:
      return 'Cari nomor kavling...'
  }
})

const hasSearchCriteria = computed(() => {
  return (
    query.value.trim() !== '' ||
    lotQuery.value.trim() !== '' ||
    priceValue.value !== null ||
    minPrice.value !== null ||
    maxPrice.value !== null ||
    dimensionQuery.value.trim() !== '' ||
    areaValue.value !== null
  )
})

/* =========================================================
   NORMALIZE
   ========================================================= */

function normalizeNumber(value: any): number | null {
  if (
    value === null ||
    value === undefined ||
    value === ''
  ) {
    return null
  }

  if (typeof value === 'number') {
    return Number.isFinite(value)
      ? value
      : null
  }

  let text = String(value).trim()

  if (!text) {
    return null
  }

  /*
   * Support:
   * 150000000
   * Rp150.000.000
   * Rp 150.000.000
   * 150.000.000
   */
  text = text
    .replace(/rp/gi, '')
    .replace(/\s/g, '')

  /*
   * Untuk harga/angka Indonesia:
   * 150.000.000 -> 150000000
   *
   * Untuk desimal:
   * 200,5 -> 200.5
   */
  if (
    /^\d{1,3}(\.\d{3})+$/.test(text)
  ) {
    text = text.replace(/\./g, '')
  } else {
    text = text.replace(/,/g, '.')
    text = text.replace(/[^\d.-]/g, '')
  }

  const number = Number(text)

  return Number.isFinite(number)
    ? number
    : null
}

/* =========================================================
   PRICE
   ========================================================= */

function getPrice(lot: any): number | null {
  return (
    normalizeNumber(lot?.promo_price) ??
    normalizeNumber(lot?.cash_price)
  )
}

function formatPrice(
  value: number | null
) {
  if (value === null) {
    return '-'
  }

  return new Intl.NumberFormat(
    'id-ID',
    {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }
  ).format(value)
}

/* =========================================================
   AREA
   ========================================================= */

function formatArea(value: any) {
  const area = normalizeNumber(value)

  if (area === null) {
    return '-'
  }

  return `${area} m²`
}

/* =========================================================
   DIMENSION
   ========================================================= */

function parseDimension(value: any) {
  if (
    value === null ||
    value === undefined
  ) {
    return null
  }

  const text = String(value)
    .toLowerCase()
    .replace(/\s/g, '')
    .replace(/[×*]/g, 'x')

  /*
   * Support:
   * 10x20
   * 10×20
   * 10 x 20
   * 10.5x20
   */
  const match = text.match(
    /([\d.,]+)x([\d.,]+)/
  )

  if (!match) {
    return null
  }

  const width =
    normalizeDimensionNumber(match[1])

  const length =
    normalizeDimensionNumber(match[2])

  if (
    width === null ||
    length === null
  ) {
    return null
  }

  return {
    width,
    length
  }
}

function normalizeDimensionNumber(
  value: string
): number | null {
  let text = String(value)
    .trim()

  /*
   * 10.5 -> 10.5
   * 10,5 -> 10.5
   * 1.000 -> 1000
   */
  if (
    /^\d{1,3}(\.\d{3})+$/.test(text)
  ) {
    text = text.replace(/\./g, '')
  } else {
    text = text.replace(',', '.')
  }

  const number = Number(text)

  return Number.isFinite(number)
    ? number
    : null
}

function dimensionDistance(
  lotDimension: any,
  targetDimension: any
) {
  const lot =
    parseDimension(lotDimension)

  const target =
    parseDimension(targetDimension)

  if (!lot || !target) {
    return Infinity
  }

  const normal =
    Math.abs(
      lot.width -
      target.width
    ) +
    Math.abs(
      lot.length -
      target.length
    )

  const reversed =
    Math.abs(
      lot.width -
      target.length
    ) +
    Math.abs(
      lot.length -
      target.width
    )

  return Math.min(
    normal,
    reversed
  )
}

/* =========================================================
   DISTANCE
   ========================================================= */

function priceDistance(
  lot: any,
  target: number
) {
  const price = getPrice(lot)

  if (price === null) {
    return Infinity
  }

  return Math.abs(
    price - target
  )
}

function areaDistance(
  lot: any,
  target: number
) {
  const area =
    normalizeNumber(lot?.area)

  if (area === null) {
    return Infinity
  }

  return Math.abs(
    area - target
  )
}

/* =========================================================
   QUERY PARSERS
   ========================================================= */

function getQueryNumber(): number | null {
  return normalizeNumber(query.value)
}

function getQueryDimension(): string {
  return query.value
    .trim()
    .replace(/[×*]/g, 'x')
}

/*
 * Jika user mengetik angka pada search box
 * ketika mode area, angka tersebut dipakai
 * sebagai target luas.
 */
function getAreaTarget(): number | null {
  return (
    areaValue.value ??
    getQueryNumber()
  )
}

/*
 * Jika user mengetik angka/harga pada search box
 * ketika mode price, query menjadi target harga.
 *
 * Untuk range, range tetap berasal dari
 * minPrice/maxPrice yang disetting di filter.
 */
function getPriceTarget(): number | null {
  return (
    priceValue.value ??
    getQueryNumber()
  )
}

/* =========================================================
   FILTER SEARCH ACTION
   ========================================================= */

const canExecuteFilterSearch = computed(() => {
  if (searchType.value === 'lot') {
    return lotQuery.value.trim() !== ''
  }

  if (searchType.value === 'price') {
    if (priceMode.value === 'range') {
      return (
        minPrice.value !== null ||
        maxPrice.value !== null
      )
    }

    return priceValue.value !== null
  }

  if (searchType.value === 'dimension') {
    return parseDimension(dimensionQuery.value) !== null
  }

  if (searchType.value === 'area') {
    return areaValue.value !== null
  }

  return false
})

function getFilterKeyword(): string {
  if (searchType.value === 'lot') {
    return lotQuery.value.trim()
  }

  if (searchType.value === 'price') {
    if (priceMode.value === 'range') {
      const min = minPrice.value
      const max = maxPrice.value

      if (min !== null && max !== null) {
        return `${formatPrice(min)} - ${formatPrice(max)}`
      }

      if (min !== null) {
        return `Mulai ${formatPrice(min)}`
      }

      if (max !== null) {
        return `Sampai ${formatPrice(max)}`
      }

      return ''
    }

    return priceValue.value !== null
      ? formatPrice(priceValue.value)
      : ''
  }

  if (searchType.value === 'dimension') {
    return dimensionQuery.value.trim()
  }

  if (searchType.value === 'area') {
    return areaValue.value !== null
      ? `${areaValue.value} m²`
      : ''
  }

  return ''
}

async function executeFilterSearch() {
  if (!canExecuteFilterSearch.value) {
    return
  }

  /*
   * Keyword dari filter dipindahkan ke search box.
   * Untuk harga dan luas, nilai filter tetap menjadi
   * sumber data pencarian; query hanya menjadi tampilan.
   */
  query.value = getFilterKeyword()

  filterOpen.value = false
  searchExecuted.value = true
  selectedIndex.value = -1

  /*
   * Tetap tampilkan result card walaupun kosong,
   * supaya user mendapatkan feedback pencarian.
   */
  isOpen.value = true

  await nextTick()
  updateResultsPosition()

  inputEl.value?.focus({
    preventScroll: true
  })
}

/* =========================================================
   FILTERED LOTS
   ========================================================= */

const filteredLots = computed(() => {
  const lots = props.lots || []

  /*
   * FILTER PANEL TIDAK BOLEH MENAMPILKAN HASIL.
   */
  if (filterOpen.value) {
    return []
  }

  /* ============================
     LOT NUMBER
     ============================ */

  if (
    searchType.value === 'lot'
  ) {
    const searchValue =
      (
        query.value.trim() ||
        lotQuery.value.trim()
      ).toLowerCase()

    if (!searchValue) {
      return []
    }

    return lots
      .filter((lot: any) => {
        const lotNumber =
          String(
            lot?.lot_number ?? ''
          ).toLowerCase()

        const polygonId =
          String(
            lot?.polygon_id ?? ''
          ).toLowerCase()

        const blockId =
          String(
            lot?.block_id ?? ''
          ).toLowerCase()

        /*
         * Support input:
         * 22
         * 022
         * LOT_022
         */
        const numericQuery =
          searchValue.replace(
            /^lot[_-\s]*/i,
            ''
          )

        const numericLot =
          lotNumber.replace(
            /^lot[_-\s]*/i,
            ''
          )

        return (
          lotNumber.includes(searchValue) ||
          polygonId.includes(searchValue) ||
          blockId.includes(searchValue) ||
          numericLot === numericQuery ||
          numericLot.includes(numericQuery)
        )
      })
      .slice(0, 6)
  }

  /* ============================
     PRICE
     ============================ */

  if (
    searchType.value === 'price'
  ) {
    /*
     * RANGE
     */
    if (
      priceMode.value === 'range'
    ) {
      const minimum =
        minPrice.value

      const maximum =
        maxPrice.value

      if (
        minimum === null &&
        maximum === null
      ) {
        return []
      }

      if (
        minimum !== null &&
        maximum !== null &&
        minimum > maximum
      ) {
        return []
      }

      return lots
        .filter((lot: any) => {
          const price =
            getPrice(lot)

          if (price === null) {
            return false
          }

          const min =
            minimum ?? 0

          const max =
            maximum ?? Infinity

          return (
            price >= min &&
            price <= max
          )
        })
        .sort(
          (a: any, b: any) =>
            (getPrice(a) ?? Infinity) -
            (getPrice(b) ?? Infinity)
        )
        .slice(0, 6)
    }

    /*
     * NEAREST
     */
    const target =
      getPriceTarget()

    if (target === null) {
      return []
    }

    const results =
      lots
        .filter(
          (lot: any) =>
            getPrice(lot) !== null
        )
        .map(
          (lot: any) => ({
            lot,
            distance:
              priceDistance(
                lot,
                target
              )
          })
        )

    return results
      .sort(
        (a, b) =>
          a.distance -
          b.distance
      )
      .map(
        item => item.lot
      )
      .slice(0, 6)
  }

  /* ============================
     DIMENSION
     ============================ */

  if (
    searchType.value === 'dimension'
  ) {
    const target =
      dimensionQuery.value.trim() ||
      query.value.trim()

    if (!target) {
      return []
    }

    const parsedTarget =
      parseDimension(target)

    if (!parsedTarget) {
      return []
    }

    return lots
      .map(
        (lot: any) => ({
          lot,
          distance:
            dimensionDistance(
              lot?.dimension,
              target
            )
        })
      )
      .filter(
        item =>
          item.distance !== Infinity
      )
      .sort(
        (a, b) =>
          a.distance -
          b.distance
      )
      .map(
        item => item.lot
      )
      .slice(0, 6)
  }

  /* ============================
     AREA
     ============================ */

  if (
    searchType.value === 'area'
  ) {
    const target =
      getAreaTarget()

    if (target === null) {
      return []
    }

    return lots
      .map(
        (lot: any) => ({
          lot,
          distance:
            areaDistance(
              lot,
              target
            )
        })
      )
      .filter(
        item =>
          item.distance !== Infinity
      )
      .sort(
        (a, b) =>
          a.distance -
          b.distance
      )
      .map(
        item => item.lot
      )
      .slice(0, 6)
  }

  return []
})

/* =========================================================
   SEARCH EXECUTION
   ========================================================= */

async function runSearch() {
  /*
   * Jangan pernah menampilkan hasil ketika
   * filter panel sedang dibuka.
   */
  if (filterOpen.value) {
    isOpen.value = false
    return
  }

  searchExecuted.value = true
  selectedIndex.value = -1

  isOpen.value =
    filteredLots.value.length > 0 ||
    !!query.value.trim()

  await nextTick()
  updateResultsPosition()
}

async function openSearch() {
  /*
   * Focus/input tidak otomatis membuka hasil.
   * Hasil hanya muncul setelah user mengetik
   * atau menekan Enter.
   */
  isOpen.value = false
  searchExecuted.value = false
  selectedIndex.value = -1
}

/* =========================================================
   EXPAND / COLLAPSE
   ========================================================= */

async function openBar() {
  if (expanded.value) {
    inputEl.value?.focus({
      preventScroll: true
    })
    return
  }

  expanded.value = true

  await nextTick()

  inputEl.value?.focus({
    preventScroll: true
  })
}

function hasActiveFilter() {
  return (
    priceValue.value !== null ||
    minPrice.value !== null ||
    maxPrice.value !== null ||
    dimensionQuery.value.trim() !== '' ||
    areaValue.value !== null
  )
}

function hasActiveQuery() {
  return (
    query.value.trim() !== '' ||
    hasActiveFilter()
  )
}

function closeBar() {
  inputEl.value?.blur()

  isOpen.value = false
  searchExecuted.value = false
  selectedIndex.value = -1
  expanded.value = false
}

/* =========================================================
   QUERY CLEAR
   ========================================================= */

/*
 * Tombol X di search box hanya menghapus
 * teks query utama.
 *
 * Setting filter tetap dipertahankan.
 */
function clearQueryOnly() {
  query.value = ''

  isOpen.value = false
  searchExecuted.value = false
  selectedIndex.value = -1

  nextTick(() => {
    inputEl.value?.focus({
      preventScroll: true
    })
  })
}

/* =========================================================
   SEARCH TYPE
   ========================================================= */

function setSearchType(
  type:
    | 'lot'
    | 'price'
    | 'dimension'
    | 'area'
) {
  searchType.value = type

  /*
   * Query utama dibersihkan karena format
   * pencarian setiap tipe berbeda.
   */
  query.value = ''
  lotQuery.value = ''

  priceValue.value = null
  minPrice.value = null
  maxPrice.value = null
  dimensionQuery.value = ''
  areaValue.value = null

  isOpen.value = false
  searchExecuted.value = false
  selectedIndex.value = -1
}

/* =========================================================
   FILTER
   ========================================================= */

function toggleFilter() {
  if (filterOpen.value) {
    closeFilter()
    return
  }

  /*
   * Buka setting.
   * Hasil harus hilang.
   */
  filterOpen.value = true
  isOpen.value = false
  searchExecuted.value = false
  selectedIndex.value = -1
}

function closeFilter() {
  /*
   * HANYA menutup card setting.
   *
   * Search bar tetap expanded.
   * Nilai filter TIDAK dihapus.
   * Result TIDAK langsung muncul.
   */
  filterOpen.value = false
  isOpen.value = false
  searchExecuted.value = false
  selectedIndex.value = -1

  nextTick(() => {
    if (expanded.value) {
      inputEl.value?.focus({
        preventScroll: true
      })
    }
  })
}

/* =========================================================
   FOCUS / INPUT
   ========================================================= */

function handleFocus() {
  /*
   * Jangan otomatis mencari hanya karena
   * input mendapatkan focus.
   */
}

function handleInput() {
  /*
   * Ketik di search box = jalankan pencarian.
   *
   * Ini yang membedakan search box dengan
   * filter setting.
   */
  void runSearch()
}

/* =========================================================
   SELECT
   ========================================================= */

function selectLot(lot: any) {
  /*
   * Lepaskan focus dari search input SEBELUM
   * emit('select'), karena parent akan melakukan
   * navigasi ke halaman detail.
   *
   * Blur ini penting di mobile agar keyboard tidak
   * ikut terbawa ketika halaman detail dibuka.
   */
  inputEl.value?.blur()

  const activeElement = document.activeElement

  if (
    activeElement instanceof HTMLElement
  ) {
    activeElement.blur()
  }

  /*
   * Tutup state search terlebih dahulu sebelum
   * navigasi supaya tidak ada lagi posisi typing/
   * cursor yang tertinggal.
   */
  isOpen.value = false
  searchExecuted.value = false
  selectedIndex.value = -1
  expanded.value = false

  /*
   * Untuk nomor kavling, tetap simpan nomor yang
   * dipilih sebelum berpindah ke halaman detail.
   */
  if (
    searchType.value === 'lot'
  ) {
    query.value =
      lot?.lot_number ||
      lot?.polygon_id ||
      ''
  }

  /*
   * Navigasi dilakukan setelah keyboard/focus
   * dilepas.
   */
  emit('select', lot)
}

/* =========================================================
   RESET
   ========================================================= */

function resetFilter() {
  searchType.value = 'lot'
  priceMode.value = 'nearest'

  query.value = ''
  lotQuery.value = ''
  priceValue.value = null
  minPrice.value = null
  maxPrice.value = null
  dimensionQuery.value = ''
  areaValue.value = null

  isOpen.value = false
  searchExecuted.value = false
  selectedIndex.value = -1

  /*
   * Reset hanya setting.
   * Search bar tetap terbuka jika sedang terbuka.
   */
}

/* =========================================================
   KEYBOARD
   ========================================================= */

function handleKeyDown(
  event: KeyboardEvent
) {
  /*
   * ENTER = JALANKAN PENCARIAN
   *
   * Ini sengaja diletakkan sebelum pengecekan
   * isOpen karena Enter harus bisa menjalankan
   * pencarian walaupun result belum terbuka.
   */
  if (
    event.key === 'Enter'
  ) {
    event.preventDefault()

    /*
     * Jika filter sedang terbuka,
     * Enter tidak menjalankan result.
     */
    if (filterOpen.value) {
      return
    }

    void runSearch()
    return
  }

  /*
   * ESC
   */
  if (
    event.key === 'Escape'
  ) {
    event.preventDefault()

    if (filterOpen.value) {
      closeFilter()
      return
    }

    if (
      isOpen.value
    ) {
      isOpen.value = false
      searchExecuted.value = false
      selectedIndex.value = -1
      return
    }

    if (
      expanded.value
    ) {
      closeBar()
    }

    return
  }

  /*
   * Arrow navigation hanya jika
   * hasil sedang terbuka.
   */
  if (
    !isOpen.value ||
    !filteredLots.value.length
  ) {
    return
  }

  if (
    event.key === 'ArrowDown'
  ) {
    event.preventDefault()

    selectedIndex.value =
      Math.min(
        selectedIndex.value + 1,
        filteredLots.value.length - 1
      )

    return
  }

  if (
    event.key === 'ArrowUp'
  ) {
    event.preventDefault()

    selectedIndex.value =
      Math.max(
        selectedIndex.value - 1,
        0
      )

    return
  }
}

/* =========================================================
   OUTSIDE CLICK
   ========================================================= */

function handleOutsideClick(
  event: MouseEvent
) {
  const target =
    event.target as Node

  /*
   * Filter overlay memiliki handler sendiri.
   */
  if (
    filterOpen.value
  ) {
    return
  }

  /*
   * Result card berada di body karena Teleport.
   */
  const resultElement =
    target instanceof Element
      ? target.closest('.search-results')
      : null

  if (resultElement) {
    return
  }

  if (
    wrapper.value &&
    !wrapper.value.contains(target)
  ) {
    isOpen.value = false
    searchExecuted.value = false

    /*
     * Jangan langsung collapse jika
     * masih ada filter aktif.
     */
    if (
      expanded.value &&
      !hasActiveQuery()
    ) {
      closeBar()
    }
  }
}

/* =========================================================
   RESULT POSITION
   ========================================================= */

function updateResultsPosition() {
  if (!inputWrapper.value) {
    return
  }

  const rect =
    inputWrapper.value
      .getBoundingClientRect()

  resultsTop.value =
    rect.bottom + 6

  resultsLeft.value =
    rect.left

  resultsWidth.value =
    rect.width
}

function handleViewportChange() {
  if (!isOpen.value) {
    return
  }

  updateResultsPosition()
}

/* =========================================================
   MOUNT
   ========================================================= */

onMounted(() => {
  document.addEventListener(
    'click',
    handleOutsideClick
  )

  window.addEventListener(
    'resize',
    handleViewportChange
  )

  window.addEventListener(
    'scroll',
    handleViewportChange,
    true
  )

  if (window.visualViewport) {
    window.visualViewport.addEventListener(
      'resize',
      handleViewportChange
    )

    window.visualViewport.addEventListener(
      'scroll',
      handleViewportChange
    )
  }
})

/* =========================================================
   CLEANUP
   ========================================================= */

onBeforeUnmount(() => {
  emitSearchMode(false)

  document.removeEventListener(
    'click',
    handleOutsideClick
  )

  window.removeEventListener(
    'resize',
    handleViewportChange
  )

  window.removeEventListener(
    'scroll',
    handleViewportChange,
    true
  )

  if (window.visualViewport) {
    window.visualViewport.removeEventListener(
      'resize',
      handleViewportChange
    )

    window.visualViewport.removeEventListener(
      'scroll',
      handleViewportChange
    )
  }
})
</script>

<style scoped>
/* =========================================================
   SEARCH WRAPPER
   ========================================================= */

.search-wrapper {
  position: relative;
  width: 100%;
  pointer-events: none;
}

.search-input-wrapper {
  position: relative;

  display: flex;
  align-items: center;
  gap: 8px;

  min-height: 48px;

  box-sizing: border-box;
  overflow: hidden;

  background: rgba(255, 255, 255, 0.96);

  border: 1px solid
    rgba(148, 163, 184, 0.5);

  border-radius: 14px;

  box-shadow:
    0 12px 24px
    rgba(15, 23, 42, 0.08);

  pointer-events: auto;

  transition:
    width 300ms cubic-bezier(0.22, 1, 0.36, 1),
    padding 300ms cubic-bezier(0.22, 1, 0.36, 1),
    box-shadow 300ms ease-out;

  will-change: width;
}

.search-input-wrapper.collapsed {
  width: 48px;
  padding: 0;
  gap: 0;
}

.search-input-wrapper.expanded {
  width: 100%;
  padding: 0 8px 0 14px;
}

.search-collapsed-button {
  display: flex;
  align-items: center;
  justify-content: center;

  width: 48px;
  height: 48px;

  flex: 0 0 48px;

  margin: 0;
  padding: 0;

  border: none;
  border-radius: 14px;

  background: transparent;
  color: #6b7280;

  cursor: pointer;

  -webkit-tap-highlight-color: transparent;
}

.search-collapsed-button:active {
  transform: scale(0.94);
}

.search-icon {
  flex: 0 0 auto;
  font-size: 20px;
  color: #6b7280;
}

.search-input {
  flex: 1;
  min-width: 0;

  height: 44px;

  border: none;
  outline: none;

  background: transparent;

  font-size: 16px;
  color: #111827;
}

.search-input::placeholder {
  color: #9ca3af;
}

/* =========================================================
   CLEAR
   ========================================================= */

.search-clear {
  display: flex;
  align-items: center;
  justify-content: center;

  flex: 0 0 28px;

  width: 28px;
  height: 28px;

  padding: 0;

  border: none;
  border-radius: 50%;

  background: transparent;
  color: #4b5563;
}

.search-clear ion-icon {
  font-size: 18px;
}

/* =========================================================
   FILTER BUTTON
   ========================================================= */

.search-filter-button {
  display: flex;
  align-items: center;
  justify-content: center;

  flex: 0 0 36px;

  width: 36px;
  height: 36px;

  padding: 0;

  border: none;
  border-radius: 10px;

  background: #f3f4f6;
  color: #374151;

  transition:
    160ms ease;
}

.search-filter-button.active {
  background: #e7c56a;
  color: #ffffff;
}

.search-filter-button ion-icon {
  font-size: 18px;
}

/* =========================================================
   FILTER OVERLAY
   ========================================================= */

.search-filter-overlay {
  position: fixed;
  inset: 0;

  z-index: 999998;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 16px;

  background:
    rgba(15, 23, 42, 0.20);

  backdrop-filter: blur(2px);
}

/* =========================================================
   FILTER PANEL
   ========================================================= */

.search-filter-panel {
  width: min(420px, 100%);

  max-height:
    calc(100dvh - 32px);

  overflow-y: auto;

  padding: 20px;

  box-sizing: border-box;

  background: #ffffff;

  border-radius: 20px;

  box-shadow:
    0 24px 60px
    rgba(15, 23, 42, 0.25);
}

.filter-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;

  gap: 12px;

  margin-bottom: 20px;
}

.filter-title {
  font-size: 17px;
  font-weight: 700;
  color: #111827;
}

.filter-subtitle {
  margin-top: 3px;
  font-size: 11px;
  color: #9ca3af;
}

.filter-close {
  display: flex;
  align-items: center;
  justify-content: center;

  flex: 0 0 32px;

  width: 32px;
  height: 32px;

  padding: 0;

  border: none;
  border-radius: 9px;

  background: #f3f4f6;
  color: #6b7280;
}

/* =========================================================
   FILTER SECTION
   ========================================================= */

.filter-section {
  margin-bottom: 18px;
}

.filter-label {
  margin-bottom: 8px;

  font-size: 9px;
  font-weight: 700;

  letter-spacing: 0.1em;

  color: #9ca3af;
}

/* =========================================================
   FILTER TYPES
   ========================================================= */

.filter-types {
  display: grid;

  grid-template-columns:
    repeat(2, 1fr);

  gap: 8px;
}

.filter-type {
  display: flex;
  align-items: center;

  gap: 8px;

  padding: 10px;

  border: 1px solid #e5e7eb;
  border-radius: 11px;

  background: #ffffff;
  color: #374151;

  font-size: 11px;
  font-weight: 600;

  text-align: left;
}

.filter-type.active {
  border-color: #d4af52;
  background: #fff8e5;
  color: #8a6a20;
}

.filter-type-icon {
  display: flex;
  align-items: center;
  justify-content: center;

  width: 28px;
  height: 28px;

  flex: 0 0 28px;

  border-radius: 8px;

  background: #f3f4f6;

  font-size: 10px;
  font-weight: 700;
}

/* =========================================================
   INPUT
   ========================================================= */

.filter-input {
  width: 100%;
  height: 44px;

  box-sizing: border-box;

  padding: 0 12px;

  border: 1px solid #d1d5db;
  border-radius: 10px;

  outline: none;

  background: #ffffff;
  color: #111827;

  font-size: 13px;
}

.filter-input:focus {
  border-color: #d4af52;

  box-shadow:
    0 0 0 3px
    rgba(212, 175, 82, 0.12);
}

.filter-help {
  display: block;

  margin-top: 6px;

  font-size: 10px;
  line-height: 1.5;

  color: #9ca3af;
}

/* =========================================================
   PRICE MODE
   ========================================================= */

.price-modes {
  display: flex;
  flex-direction: column;

  gap: 7px;
}

.price-mode {
  display: flex;
  flex-direction: column;

  align-items: flex-start;

  gap: 2px;

  padding: 10px 12px;

  border: 1px solid #e5e7eb;
  border-radius: 10px;

  background: #ffffff;

  text-align: left;
}

.price-mode strong {
  font-size: 12px;
  color: #374151;
}

.price-mode small {
  font-size: 10px;
  color: #9ca3af;
}

.price-mode.active {
  border-color: #d4af52;
  background: #fff8e5;
}

.price-mode.active strong {
  color: #8a6a20;
}

/* =========================================================
   PRICE
   ========================================================= */

.price-input-wrapper,
.dimension-input-wrapper,
.area-input-wrapper {
  display: flex;
  align-items: center;

  gap: 8px;

  padding: 0 12px;

  border: 1px solid #d1d5db;
  border-radius: 10px;

  background: #ffffff;
}

.price-input-wrapper:focus-within,
.dimension-input-wrapper:focus-within,
.area-input-wrapper:focus-within {
  border-color: #d4af52;

  box-shadow:
    0 0 0 3px
    rgba(212, 175, 82, 0.12);
}

.price-input-wrapper > span,
.dimension-input-wrapper > span,
.area-input-wrapper > span {
  flex-shrink: 0;

  font-size: 12px;
  font-weight: 600;

  color: #6b7280;
}

.price-input-wrapper .filter-input,
.dimension-input-wrapper .filter-input,
.area-input-wrapper .filter-input {
  border: none;
  padding: 0;

  box-shadow: none;
}

.range-inputs {
  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 10px;
}

/* =========================================================
   FILTER ACTION
   ========================================================= */

.filter-action {
  margin-top: 4px;
  margin-bottom: 10px;
}

.filter-action :deep(ion-button) {
  --border-radius: 11px;
  --box-shadow: none;
  min-height: 44px;
  margin: 0;
  font-size: 13px;
  font-weight: 700;
}

.filter-action :deep(ion-button[disabled]) {
  opacity: 0.45;
}

/* =========================================================
   RESET
   ========================================================= */

.filter-reset {
  width: 100%;
  height: 42px;

  border: 1px solid #e5e7eb;
  border-radius: 10px;

  background: #f9fafb;
  color: #6b7280;

  font-size: 12px;
  font-weight: 600;
}

/* =========================================================
   SEARCH RESULTS
   ========================================================= */

.search-results,
.search-empty {
  position: fixed;

  z-index: 999999;

  box-sizing: border-box;

  max-height:
    min(
      280px,
      calc(100dvh - 190px)
    );

  overflow-y: auto;

  overscroll-behavior: contain;

  -webkit-overflow-scrolling: touch;

  background: #ffffff;

  border-radius: 14px;

  box-shadow:
    0 10px 35px
    rgba(0, 0, 0, 0.20);

  border: 1px solid
    rgba(148, 163, 184, 0.25);
}

.search-empty {
  min-height: 170px;

  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  gap: 6px;

  padding: 18px 16px;

  text-align: center;

  color: #6b7280;
}

.search-empty-mascot {
  display: block;

  width: 110px;
  height: 110px;

  object-fit: contain;

  flex: 0 0 auto;
}

.search-empty-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 2px;
}

.search-empty-content strong {
  font-size: 12px;
  font-weight: 700;
  color: #374151;
}

.search-empty-content span {
  font-size: 10px;
  line-height: 1.4;
  color: #9ca3af;
}

/* =========================================================
   RESULT
   ========================================================= */

.search-result {
  width: 100%;

  display: flex;
  flex-direction: column;

  align-items: flex-start;

  gap: 3px;

  padding: 11px 14px;

  background: transparent;

  border: none;
  border-bottom: 1px solid #f3f4f6;

  color: #111827;

  text-align: left;
}

.search-result:last-child {
  border-bottom: none;
}

.search-result.active,
.search-result:hover {
  background: #eff6ff;
}

.result-main {
  width: 100%;

  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 10px;
}

.search-result strong {
  font-size: 13px;
  font-weight: 700;
}

.result-price {
  font-size: 11px;
  font-weight: 600;
  color: #9a7625;
}

.search-result small {
  font-size: 10px;
  color: #6b7280;
}

/* =========================================================
   MOBILE
   ========================================================= */

@media (max-width: 480px) {
  .search-filter-panel {
    width: 100%;

    max-height:
      calc(100dvh - 24px);

    padding: 18px;

    border-radius: 18px;
  }

  .filter-types {
    grid-template-columns:
      repeat(2, 1fr);
  }
}

/* =========================================================
   REDUCED MOTION
   ========================================================= */

@media (prefers-reduced-motion: reduce) {
  .search-input-wrapper,
  .search-input-wrapper * {
    transition-duration: 1ms !important;
  }
}
</style>
