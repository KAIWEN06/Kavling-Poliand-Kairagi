<template>
  <ion-page class="kavling-page">

    <!-- =================================================
         HEADER
         ================================================= -->

    <AppHeader
      variant="marketing"
      :authenticated="true"
      title="Kavling"
      :has-notification="true"
      back-route="/beranda-marketing"
      @logout="handleLogout"
    />


    <!-- =================================================
         CONTENT
         ================================================= -->

    <ion-content
      :fullscreen="false"
      class="kavling-content"
    >

      <main class="page-container">

        <!-- =================================================
             SEARCH
             ================================================= -->

        <div class="search-wrapper">

          <ion-icon
            :icon="searchOutline"
            class="search-icon"
          />

          <input
            v-model="searchQuery"
            type="search"
            class="search-input"
            placeholder="Cari nomor kavling, blok..."
            autocomplete="off"
          />

          <button
            v-if="searchQuery"
            type="button"
            class="clear-search"
            aria-label="Hapus pencarian"
            @click="searchQuery = ''"
          >
            ×
          </button>

        </div>


        <!-- =================================================
             FILTER STATUS
             ================================================= -->

        <div class="filter-wrapper">

          <button
            v-for="filter in filters"
            :key="filter.value"
            type="button"
            class="filter-button"
            :class="{
              active:
                selectedFilter === filter.value
            }"
            @click="selectedFilter = filter.value"
          >
            {{ filter.label }}
          </button>

        </div>


        <!-- =================================================
             LOADING
             ================================================= -->

        <div
          v-if="loading"
          class="state-container"
        >

          <div class="loading-spinner"></div>

          <p>
            Memuat data kavling...
          </p>

        </div>


        <!-- =================================================
             ERROR
             ================================================= -->

        <div
          v-else-if="errorMessage"
          class="state-container"
        >

          <div class="error-icon">
            !
          </div>

          <strong>
            Gagal memuat kavling
          </strong>

          <p>
            {{ errorMessage }}
          </p>

          <button
            type="button"
            class="retry-button"
            @click="loadLots"
          >
            Coba Lagi
          </button>

        </div>


        <!-- =================================================
             LOT LIST
             ================================================= -->

        <section
          v-else
          class="lot-list"
        >

          <article
            v-for="lot in paginatedLots"
            :key="lot.id"
            class="lot-card"
            role="button"
            tabindex="0"
            @click="openPanorama(lot)"
            @keydown.enter="openPanorama(lot)"
          >

            <!-- =============================================
                 PANORAMA 360 THUMBNAIL
                 ============================================= -->

            <div class="lot-image-wrapper">

              <img
                v-if="lot.panorama_url"
                :src="lot.panorama_url"
                :alt="`Panorama 360° ${lot.lot_number}`"
                class="lot-image"
                loading="lazy"
              />

              <!-- Tidak ada panorama -->

              <div
                v-else
                class="panorama-empty"
              >

                <ion-icon
                  :icon="imageOutline"
                />

                <span>
                  360 belum tersedia
                </span>

              </div>


              <!-- Label 360 -->

              <div
                v-if="lot.panorama_url"
                class="panorama-badge"
              >

                <ion-icon
                  :icon="cubeOutline"
                />

                <span>
                  360°
                </span>

              </div>

            </div>


            <!-- =============================================
                 INFORMATION
                 ============================================= -->

            <div class="lot-information">

              <!-- Nomor + Blok -->

              <div class="lot-title-row">

                <div class="lot-name">

                  {{ formatLotNumber(lot.lot_number) }}

                </div>

              </div>


              <div class="lot-block">

                {{ getBlockLabel(lot.block_id) }}

              </div>


              <!-- Area / Dimension -->

              <div class="lot-meta">

                <span
                  v-if="lot.area"
                >
                  {{ formatArea(lot.area) }}
                </span>

                <span
                  v-if="lot.area && lot.dimension"
                  class="meta-separator"
                >
                  •
                </span>

                <span
                  v-if="lot.dimension"
                >
                  {{ lot.dimension }}
                </span>

              </div>


              <!-- Divider -->

              <div class="lot-divider"></div>


              <!-- Price -->

              <div class="lot-price">

                {{ formatPrice(getDisplayPrice(lot)) }}

              </div>

            </div>


            <!-- =============================================
                 STATUS
                 ============================================= -->

            <div
              class="lot-status"
              :class="getStatusClass(lot.status)"
            >

              {{ getStatusLabelText(lot.status) }}

            </div>

          </article>


          <!-- =================================================
               EMPTY STATE
               ================================================= -->

          <div
            v-if="filteredLots.length === 0"
            class="empty-state"
          >

            <div class="empty-icon">

              <ion-icon
                :icon="searchOutline"
              />

            </div>

            <strong>
              Kavling tidak ditemukan
            </strong>

            <span>
              Tidak ada kavling yang sesuai dengan pencarian.
            </span>

          </div>

          <nav
            v-if="totalPages > 1"
            class="pagination"
            aria-label="Navigasi halaman kavling"
          >
            <button
              type="button"
              class="pagination-button"
              :disabled="currentPage === 1"
              @click="currentPage -= 1"
            >
              Sebelumnya
            </button>

            <span
              class="pagination-label"
              aria-live="polite"
            >
              Halaman {{ currentPage }} dari {{ totalPages }}
            </span>

            <button
              type="button"
              class="pagination-button"
              :disabled="currentPage === totalPages"
              @click="currentPage += 1"
            >
              Berikutnya
            </button>
          </nav>

        </section>

        <div
          class="land-decoration"
          aria-hidden="true"
        >

          <div class="land-light"></div>

          <div class="land-dark"></div>

        </div>

      </main>

    </ion-content>


    <!-- =================================================
         BOTTOM NAVIGATION
         ================================================= -->

    <MobileTabBar
      variant="marketing"
    />

  </ion-page>
</template>


<script setup lang="ts">

import {
  computed,
  onMounted,
  ref,
  watch,
} from 'vue'

import {
  IonPage,
  IonContent,
  IonIcon,
  useIonRouter,
} from '@ionic/vue'

import {
  useRoute,
} from 'vue-router'

import {
  searchOutline,
  imageOutline,
  cubeOutline,
} from 'ionicons/icons'

import AppHeader
  from '@/components/common/AppHeader.vue'

import MobileTabBar
  from '@/components/common/MobileTabBar.vue'

import {
  supabase,
} from '@/services/config/supabase'

import {
  formatLotNumber,
} from '@/services/marketing/spkService'


/* =====================================================
   TYPES
   ===================================================== */

type LotStatus =
  | 'Available'
  | 'Booking'
  | 'Sold'

type FilterValue =
  | 'all'
  | 'available'
  | 'booking'
  | 'sold'


interface Lot {

  id: number

  polygon_id: string

  lot_number: string

  block_id: number | null

  dimension: string | null

  area: number | null

  cash_price: number | null

  promo_price: number | null

  status: LotStatus | null

  payment_type: 'Cash' | 'Installment' | null

  customer_id: number | null

  booking_date: string | null

  sold_date: string | null

  color: string | null

  description: string | null

  created_at: string | null

  updated_at: string | null

  panorama_url: string | null

}


/* =====================================================
   ROUTER
   ===================================================== */

const ionRouter = useIonRouter()
const route = useRoute()


/* =====================================================
   STATE
   ===================================================== */

const loading = ref(true)

const errorMessage = ref('')

const lots = ref<Lot[]>([])

const initialLotNumber = route.query.lot_number
const searchQuery = ref(
  Array.isArray(initialLotNumber)
    ? initialLotNumber[0] ?? ''
    : initialLotNumber ?? '',
)

const selectedFilter =
  ref<FilterValue>('all')

const currentPage = ref(1)
const pageSize = 10

watch(
  [searchQuery, selectedFilter],
  () => {
    currentPage.value = 1
  },
)

/* =====================================================
   LOAD LOTS FROM SUPABASE
   ===================================================== */

async function loadLots() {

  loading.value = true

  errorMessage.value = ''

  try {

    const {
      data,
      error,
    } = await supabase
      .from('lots')
      .select(`
        id,
        polygon_id,
        lot_number,
        block_id,
        dimension,
        area,
        cash_price,
        promo_price,
        status,
        payment_type,
        customer_id,
        booking_date,
        sold_date,
        color,
        description,
        created_at,
        updated_at,
        panorama_url
      `)
      .order(
        'lot_number',
        {
          ascending: true,
        },
      )


    if (error) {

      throw error

    }


    lots.value =
      (data || []) as Lot[]


  } catch (error: any) {

    console.error(
      '[Kavling Marketing] Error:',
      error,
    )

    errorMessage.value =
      error?.message ||
      'Data kavling gagal dimuat.'

  } finally {

    loading.value = false

  }

}


/* =====================================================
   FILTER OPTIONS
   ===================================================== */

const filters = computed(() => {

  const total =
    lots.value.length

  const available =
    lots.value.filter(
      lot =>
        lot.status === 'Available',
    ).length

  const booking =
    lots.value.filter(
      lot =>
        lot.status === 'Booking',
    ).length

  const sold =
    lots.value.filter(
      lot =>
        lot.status === 'Sold',
    ).length


  return [

    {
      value: 'all' as FilterValue,
      label: `Semua (${total})`,
    },

    {
      value: 'available' as FilterValue,
      label: `Tersedia (${available})`,
    },

    {
      value: 'booking' as FilterValue,
      label: `Dipesan (${booking})`,
    },

    {
      value: 'sold' as FilterValue,
      label: `Terjual (${sold})`,
    },

  ]

})


/* =====================================================
   FILTERED LOTS
   ===================================================== */

const filteredLots = computed(() => {

  let result =
    [...lots.value]


  /* -------------------------------------------------
     STATUS
     ------------------------------------------------- */

  if (
    selectedFilter.value ===
    'available'
  ) {

    result =
      result.filter(
        lot =>
          lot.status === 'Available',
      )

  }


  if (
    selectedFilter.value ===
    'booking'
  ) {

    result =
      result.filter(
        lot =>
          lot.status === 'Booking',
      )

  }


  if (
    selectedFilter.value ===
    'sold'
  ) {

    result =
      result.filter(
        lot =>
          lot.status === 'Sold',
      )

  }


  /* -------------------------------------------------
     SEARCH
     ------------------------------------------------- */

  const query =
    searchQuery.value
      .trim()
      .toLowerCase()


  if (query) {

    result =
      result.filter(lot => {

        const lotNumber =
          formatLotNumber(lot.lot_number)
            .toLowerCase()

        const normalizedQuery =
          query.replace(/-/g, '_')

        const polygonId =
          lot.polygon_id
            ?.toLowerCase() || ''

        const block =
          String(
            lot.block_id ?? '',
          ).toLowerCase()

        const dimension =
          lot.dimension
            ?.toLowerCase() || ''


        return (
          lotNumber.includes(normalizedQuery) ||
          polygonId.includes(query) ||
          block.includes(query) ||
          dimension.includes(query)
        )

        })

  }


  return result

})

const totalPages = computed(() =>
  Math.ceil(filteredLots.value.length / pageSize),
)

const paginatedLots = computed(() => {
  const start = (currentPage.value - 1) * pageSize
  return filteredLots.value.slice(start, start + pageSize)
})

watch(totalPages, pageCount => {
  if (pageCount > 0 && currentPage.value > pageCount) {
    currentPage.value = pageCount
  }
})


/* =====================================================
   PRICE
   ===================================================== */

/**
 * Kalau promo_price tersedia,
 * tampilkan harga promo.
 *
 * Kalau tidak ada,
 * gunakan cash_price.
 */

function getDisplayPrice(
  lot: Lot,
) {

  return (
    lot.promo_price ??
    lot.cash_price ??
    0
  )

}


/* =====================================================
   FORMAT PRICE
   ===================================================== */

function formatPrice(
  price: number,
) {

  if (!price) {

    return 'Harga belum tersedia'

  }


  return new Intl.NumberFormat(
    'id-ID',
    {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    },
  ).format(price)

}


/* =====================================================
   FORMAT AREA
   ===================================================== */

function formatArea(
  area: number,
) {

  return `${area} m²`

}


/* =====================================================
   BLOCK
   ===================================================== */

function getBlockLabel(
  blockId: number | null,
) {

  if (
    blockId === null ||
    blockId === undefined
  ) {

    return 'Blok -'

  }


  return `Blok ${blockId}`

}


/* =====================================================
   STATUS LABEL
   ===================================================== */

function getStatusLabelText(
  status: LotStatus | null,
) {

  switch (status) {

    case 'Available':
      return 'Tersedia'

    case 'Booking':
      return 'Dipesan'

    case 'Sold':
      return 'Terjual'

    default:
      return 'Tidak diketahui'

  }

}


/* =====================================================
   STATUS CLASS
   ===================================================== */

function getStatusClass(
  status: LotStatus | null,
) {

  switch (status) {

    case 'Available':
      return 'status-available'

    case 'Booking':
      return 'status-booking'

    case 'Sold':
      return 'status-sold'

    default:
      return 'status-unknown'

  }

}


/* =====================================================
   OPEN PANORAMA
   ===================================================== */

/**
 * PanoramaPage.vue milikmu menerima:
 *
 * /panorama/:lotId
 *
 * dan mencari:
 *
 * lot_number
 * atau
 * polygon_id
 *
 * Karena itu kita kirim lot_number.
 */

function openPanorama(
  lot: Lot,
) {

  if (!lot.panorama_url) {

    console.log(
      `Kavling ${lot.lot_number} belum memiliki panorama 360°`,
    )

    return

  }


  ionRouter.push(
    `/panorama/${encodeURIComponent(
      lot.lot_number,
    )}`,
  )

}


/* =====================================================
   LOGOUT
   ===================================================== */

async function handleLogout() {

  try {

    const {
      error,
    } = await supabase.auth.signOut()


    if (error) {

      throw error

    }


    ionRouter.replace('/login')

  } catch (error) {

    console.error(
      '[Logout] Error:',
      error,
    )

  }

}


/* =====================================================
   INITIAL LOAD
   ===================================================== */

onMounted(() => {

  loadLots()

})

</script>


<style scoped>

/* =====================================================
   PAGE
   ===================================================== */

.kavling-page {

  --page-background: #f7f7f5;

  background:
    var(--page-background);

}


/* =====================================================
   CONTENT
   ===================================================== */

.kavling-content {

  --background:
    #f7f7f5;

}

.kavling-content::part(scroll) {

  display: flex;

  flex-direction: column;

}


/* =====================================================
   CONTAINER
   ===================================================== */

.page-container {

  position: relative;

  display: flex;

  flex: 1 0 auto;

  flex-direction: column;

  z-index: 2;

  width: 100%;

  max-width: 430px;

  min-height: 100%;

  margin: 0 auto;

  padding:
    18px
    clamp(10px, 4.5vw, 20px)
    115px;

  box-sizing: border-box;

}


/* =====================================================
   SEARCH
   ===================================================== */

.search-wrapper {

  position: relative;

  width: 100%;

  height: 42px;

  display: flex;

  align-items: center;

  background: #ffffff;

  border-radius: 10px;

  border:
    1px solid
    rgba(0, 0, 0, 0.04);

  box-shadow:
    0 2px 7px
    rgba(0, 0, 0, 0.05);

}


.search-icon {

  flex-shrink: 0;

  margin-left:
    clamp(10px, 3vw, 13px);

  color: #9c9c9c;

  font-size: 16px;

}


.search-input {

  width: 100%;

  min-width: 0;

  height: 100%;

  border: 0;

  outline: none;

  background: transparent;

  padding:
    0 32px 0 8px;

  color: #333333;

  font-family: inherit;

  font-size:
    clamp(11px, 3.2vw, 13px);

}


.search-input::placeholder {

  color: #a4a4a4;

}


.clear-search {

  position: absolute;

  top: 50%;

  right: 8px;

  width: 25px;

  height: 25px;

  display: flex;

  align-items: center;

  justify-content: center;

  transform:
    translateY(-50%);

  border: 0;

  background: transparent;

  color: #888888;

  font-size: 20px;

  line-height: 1;

}


/* =====================================================
   FILTER
   ===================================================== */

.filter-wrapper {

  width: 100%;

  display: flex;

  align-items: center;

  gap: 6px;

  overflow-x: auto;

  padding:
    12px 0;

  scrollbar-width: none;

  -webkit-overflow-scrolling:
    touch;

}


.filter-wrapper::-webkit-scrollbar {

  display: none;

}


.filter-button {

  flex: 0 0 auto;

  height: 29px;

  padding:
    0 clamp(9px, 2.8vw, 13px);

  border: 0;

  border-radius: 8px;

  background: #e9e9e9;

  color: #777777;

  font-family: inherit;

  font-size:
    clamp(9px, 2.7vw, 11px);

  font-weight: 600;

  white-space: nowrap;

  cursor: pointer;

  transition:
    all 150ms ease;

}


.filter-button.active {

  background: #c9a754;

  color: #ffffff;

}


.filter-button:active {

  transform:
    scale(0.96);

}


/* =====================================================
   LOT LIST
   ===================================================== */

.lot-list {

  width: 100%;

  display: flex;

  flex-direction: column;

  gap: 12px;

}


/* =====================================================
   LOT CARD
   ===================================================== */

.lot-card {

  position: relative;

  width: 100%;

  min-width: 0;

  min-height: 92px;

  display: flex;

  align-items: center;

  gap:
    clamp(8px, 2.5vw, 12px);

  padding:
    8px;

  box-sizing: border-box;

  border-radius: 12px;

  background: #ffffff;

  box-shadow:
    0 2px 8px
    rgba(0, 0, 0, 0.045);

  cursor: pointer;

  overflow: hidden;

  -webkit-tap-highlight-color:
    transparent;

  transition:
    transform 150ms ease,
    box-shadow 150ms ease;

}


.lot-card:active {

  transform:
    scale(0.985);

}


.lot-card:focus-visible {

  outline:
    2px solid
    #c9a754;

  outline-offset: 2px;

}


/* =====================================================
   PANORAMA IMAGE
   ===================================================== */

.lot-image-wrapper {

  position: relative;

  width:
    clamp(72px, 20vw, 84px);

  height:
    clamp(72px, 20vw, 76px);

  flex:
    0 0
    clamp(72px, 20vw, 84px);

  overflow: hidden;

  border-radius: 9px;

  background: #e5e5e5;

}


/*
 * Panorama equirectangular biasanya sangat lebar.
 *
 * Kita gunakan object-fit: cover supaya ketika
 * dipakai sebagai thumbnail tidak merusak layout card.
 */

.lot-image {

  width: 100%;

  height: 100%;

  display: block;

  object-fit: cover;

}


/* =====================================================
   PANORAMA EMPTY
   ===================================================== */

.panorama-empty {

  width: 100%;

  height: 100%;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  gap: 4px;

  color: #999999;

  text-align: center;

}


.panorama-empty ion-icon {

  font-size: 22px;

}


.panorama-empty span {

  max-width: 60px;

  font-size: 7px;

  line-height: 1.2;

}


/* =====================================================
   360 BADGE
   ===================================================== */

.panorama-badge {

  position: absolute;

  left: 5px;

  bottom: 5px;

  height: 20px;

  display: flex;

  align-items: center;

  gap: 3px;

  padding:
    0 6px;

  border-radius: 6px;

  background:
    rgba(30, 30, 30, 0.78);

  color: #ffffff;

  font-size: 8px;

  font-weight: 700;

  backdrop-filter:
    blur(3px);

}


.panorama-badge ion-icon {

  font-size: 10px;

}


/* =====================================================
   INFORMATION
   ===================================================== */

.lot-information {

  min-width: 0;

  flex: 1;

  height: 76px;

  display: flex;

  flex-direction: column;

  justify-content: flex-start;

  padding-top: 2px;

}


/* =====================================================
   LOT TITLE
   ===================================================== */

.lot-title-row {

  width: 100%;

  min-width: 0;

}


.lot-name {

  min-width: 0;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  color: #444444;

  font-size:
    clamp(11px, 3.5vw, 13px);

  line-height: 1.2;

  font-weight: 800;

}


/* =====================================================
   BLOCK
   ===================================================== */

.lot-block {

  margin-top: 2px;

  color: #777777;

  font-size:
    clamp(8px, 2.7vw, 10px);

  line-height: 1.2;

}


/* =====================================================
   META
   ===================================================== */

.lot-meta {

  display: flex;

  align-items: center;

  gap: 4px;

  margin-top: 3px;

  color: #898989;

  font-size:
    clamp(8px, 2.5vw, 9px);

  line-height: 1.1;

  white-space: nowrap;

}


.meta-separator {

  color: #c4c4c4;

}


/* =====================================================
   DIVIDER
   ===================================================== */

.lot-divider {

  width: 100%;

  height: 1px;

  margin-top: 5px;

  background: #dddddd;

}


/* =====================================================
   PRICE
   ===================================================== */

.lot-price {

  min-width: 0;

  margin-top: 4px;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  color: #3f3f3f;

  font-size:
    clamp(12px, 3.8vw, 15px);

  line-height: 1.1;

  font-weight: 800;

}


/* =====================================================
   STATUS
   ===================================================== */

.lot-status {

  flex:
    0 0
    clamp(60px, 17vw, 74px);

  width:
    clamp(60px, 17vw, 74px);

  min-width:
    clamp(60px, 17vw, 74px);

  height: 27px;

  display: flex;

  align-items: center;

  justify-content: center;

  align-self: center;

  border-radius: 7px;

  font-size:
    clamp(7px, 2.4vw, 9px);

  line-height: 1;

  font-weight: 700;

  white-space: nowrap;

}


/* =====================================================
   AVAILABLE
   ===================================================== */

.status-available {

  background: #d9f1df;

  color: #2c914b;

}


/* =====================================================
   BOOKING
   ===================================================== */

.status-booking {

  background: #ffe7a7;

  color: #ad7800;

}


/* =====================================================
   SOLD
   ===================================================== */

.status-sold {

  background: #f3d5d1;

  color: #a14b43;

}


/* =====================================================
   UNKNOWN
   ===================================================== */

.status-unknown {

  background: #eeeeee;

  color: #777777;

}


/* =====================================================
   LOADING
   ===================================================== */

.state-container {

  min-height: 240px;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  gap: 8px;

  text-align: center;

  color: #777777;

}


.state-container p {

  margin: 0;

  font-size: 11px;

}


.loading-spinner {

  width: 28px;

  height: 28px;

  border:
    3px solid
    rgba(201, 167, 84, 0.2);

  border-top-color:
    #c9a754;

  border-radius: 50%;

  animation:
    spin 0.8s linear infinite;

}


@keyframes spin {

  to {

    transform:
      rotate(360deg);

  }

}


/* =====================================================
   ERROR
   ===================================================== */

.error-icon {

  width: 40px;

  height: 40px;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 50%;

  background: #f5d5d0;

  color: #a14b43;

  font-size: 20px;

  font-weight: 800;

}


.state-container strong {

  color: #444444;

  font-size: 13px;

}


.retry-button {

  margin-top: 5px;

  padding:
    8px 15px;

  border: 0;

  border-radius: 8px;

  background: #c9a754;

  color: #ffffff;

  font-family: inherit;

  font-size: 10px;

  font-weight: 700;

}


/* =====================================================
   EMPTY
   ===================================================== */

.empty-state {

  min-height: 190px;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  gap: 5px;

  color: #888888;

  text-align: center;

}


.empty-icon {

  width: 42px;

  height: 42px;

  display: flex;

  align-items: center;

  justify-content: center;

  margin-bottom: 4px;

  border-radius: 50%;

  background: #ffffff;

}


.empty-icon ion-icon {

  font-size: 20px;

}


.empty-state strong {

  color: #555555;

  font-size: 12px;

}


.empty-state span {

  font-size: 9px;

}

/* =====================================================
   PAGINATION
   ===================================================== */

.pagination {

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 8px;

  margin-top: 4px;

}


.pagination-button {

  min-height: 34px;

  padding: 0 10px;

  border: 0;

  border-radius: 8px;

  background: #c9a754;

  color: #ffffff;

  font-family: inherit;

  font-size: 10px;

  font-weight: 600;

  white-space: nowrap;

}


.pagination-button:disabled {

  opacity: 0.45;

  cursor: not-allowed;

}


.pagination-label {

  color: #666666;

  font-size: 10px;

  font-weight: 600;

  white-space: nowrap;

}


/* =====================================================
   LAND DECORATION
   ===================================================== */

.land-decoration {

  position: relative;

  flex: 0 0 160px;

  z-index: 0;

  left: 50%;

  width: 100vw;

  max-width: 430px;

  height: 160px;

  margin-top: auto;

  transform: translateX(-50%);

  pointer-events: none;

  overflow: hidden;

}


.land-light {

  position: absolute;

  left: -10%;

  bottom: 45px;

  width: 120%;

  height: 95px;

  background: #eee6d0;

  border-radius:
    50% 50% 0 0 /
    35% 35% 0 0;

  transform:
    rotate(1deg);

}


.land-dark {

  position: absolute;

  left: -10%;

  bottom: -55px;

  width: 120%;

  height: 135px;

  background: #9ca890;

  border-radius:
    50% 50% 0 0 /
    35% 35% 0 0;

  transform:
    rotate(2deg);

}


/* =====================================================
   SMALL MOBILE
   <= 360px
   ===================================================== */

@media (max-width: 360px) {

  .page-container {

    padding:
      14px
      9px
      105px;

  }


  .lot-list {

    gap: 9px;

  }


  .lot-card {

    min-height: 84px;

    gap: 7px;

    padding: 7px;

    border-radius: 10px;

  }


  .lot-image-wrapper {

    width: 65px;

    height: 68px;

    flex-basis: 65px;

  }


  .lot-information {

    height: 68px;

  }


  .lot-name {

    font-size: 10px;

  }


  .lot-block {

    font-size: 8px;

  }


  .lot-meta {

    font-size: 7.5px;

  }


  .lot-price {

    font-size: 11px;

  }


  .lot-status {

    width: 56px;

    min-width: 56px;

    flex-basis: 56px;

    height: 25px;

    font-size: 7px;

  }


  .panorama-badge {

    height: 18px;

    padding:
      0 5px;

    font-size: 7px;

  }

}


/* =====================================================
   VERY SMALL
   <= 320px
   ===================================================== */

@media (max-width: 320px) {

  .page-container {

    padding:
      12px
      7px
      100px;

  }


  .search-wrapper {

    height: 38px;

  }


  .filter-wrapper {

    gap: 4px;

    padding:
      9px 0;

  }


  .filter-button {

    height: 26px;

    padding:
      0 7px;

    font-size: 8px;

  }


  .lot-list {

    gap: 8px;

  }


  .lot-card {

    min-height: 76px;

    gap: 6px;

    padding: 6px;

    border-radius: 9px;

  }


  .lot-image-wrapper {

    width: 58px;

    height: 60px;

    flex-basis: 58px;

  }


  .lot-information {

    height: 60px;

  }


  .lot-name {

    font-size: 9px;

  }


  .lot-block {

    font-size: 7px;

  }


  .lot-meta {

    font-size: 7px;

  }


  .lot-divider {

    margin-top: 3px;

  }


  .lot-price {

    margin-top: 3px;

    font-size: 10px;

  }


  .lot-status {

    width: 51px;

    min-width: 51px;

    flex-basis: 51px;

    height: 23px;

    font-size: 6.5px;

  }


  .panorama-badge {

    left: 3px;

    bottom: 3px;

    height: 16px;

    padding:
      0 4px;

    font-size: 6px;

  }


  .panorama-badge ion-icon {

    font-size: 8px;

  }

}


/* =====================================================
   EXTREMELY SMALL
   <= 280px
   ===================================================== */

@media (max-width: 280px) {

  .page-container {

    padding-left: 5px;

    padding-right: 5px;

  }


  .lot-card {

    gap: 5px;

    padding: 5px;

  }


  .lot-image-wrapper {

    width: 51px;

    height: 54px;

    flex-basis: 51px;

  }


  .lot-information {

    height: 54px;

  }


  .lot-name {

    font-size: 8px;

  }


  .lot-block {

    font-size: 6.5px;

  }


  .lot-meta {

    font-size: 6.5px;

  }


  .lot-price {

    font-size: 9px;

  }


  .lot-status {

    width: 45px;

    min-width: 45px;

    flex-basis: 45px;

    height: 21px;

    font-size: 6px;

  }

}

</style>