<template>
  <ion-page class="calon-page">

    <!-- =====================================================
         HEADER
         ===================================================== -->

    <AppHeader
      variant="marketing"
      :authenticated="true"
      title="Calon Pembeli"
      :has-notification="true"
      @logout="handleLogout"
    />


    <!-- =====================================================
         CONTENT
         ===================================================== -->

    <ion-content
      class="calon-content"
      :fullscreen="false"
    >

      <main class="page-container">

        <!-- =================================================
             SUMMARY CARDS
             ================================================= -->

        <section class="summary-grid">

          <!-- TOTAL CALON PEMBELI -->

          <div class="summary-card total-card">

            <div class="summary-icon">

              <ion-icon
                :icon="people"
              />

            </div>

            <div class="summary-content">

              <span class="summary-label">
                Total Calon Pembeli
              </span>

              <strong class="summary-value">
                {{ totalProspects }}
              </strong>

            </div>

          </div>


          <!-- PERLU TINDAK LANJUT -->

          <div
            class="summary-card followup-card"
            @click="selectedFilter = 'followup'"
          >

            <div class="summary-icon followup-icon">

              <ion-icon
                :icon="timeOutline"
              />

            </div>

            <div class="summary-content">

              <span class="summary-label">
                Perlu Tindak Lanjut
              </span>

              <strong class="summary-value">
                {{ followUpCount }}
              </strong>

            </div>

            <ion-icon
              :icon="chevronForward"
              class="summary-arrow"
            />

          </div>

        </section>


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
            placeholder="Cari nama atau nomor telepon..."
            autocomplete="off"
          />

          <button
            v-if="searchQuery"
            type="button"
            class="clear-search"
            @click="searchQuery = ''"
          >
            ×
          </button>

        </div>


        <!-- =================================================
             FILTER
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
             TITLE
             ================================================= -->

        <div class="section-title-row">

          <h2>
            Daftar Calon Pembeli
          </h2>

          <span
            v-if="filteredProspects.length"
            class="result-count"
          >
            {{ filteredProspects.length }}
          </span>

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
            Memuat calon pembeli...
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
            Gagal memuat data
          </strong>

          <p>
            {{ errorMessage }}
          </p>

          <button
            type="button"
            class="retry-button"
            @click="loadProspects"
          >
            Coba Lagi
          </button>

        </div>


        <!-- =================================================
             PROSPECT LIST
             ================================================= -->

        <section
          v-else
          class="prospect-list"
        >

          <article
            v-for="prospect in filteredProspects"
            :key="prospect.id"
            class="prospect-card"
            tabindex="0"
            @click="openProspect(prospect)"
            @keydown.enter="openProspect(prospect)"
          >

            <!-- =============================================
                 AVATAR
                 ============================================= -->

            <div class="prospect-avatar">

              {{ getInitials(prospect.name) }}

            </div>


            <!-- =============================================
                 MAIN INFORMATION
                 ============================================= -->

            <div class="prospect-information">

              <!-- NAME -->

              <div class="prospect-name">

                {{ prospect.name }}

              </div>


              <!-- PHONE -->

              <div class="prospect-phone">

                {{ prospect.phone }}

              </div>


              <!-- LOT -->

              <div class="prospect-lot">

                <ion-icon
                  :icon="locationOutline"
                />

                <div class="lot-text">

                  <strong>
                    {{ prospect.lotNumber || 'Belum memilih' }}
                  </strong>

                  <span>

                    <template
                      v-if="prospect.area"
                    >
                      Luas {{ formatArea(prospect.area) }}
                    </template>

                    <template
                      v-if="prospect.area && prospect.block"
                    >
                      ·
                    </template>

                    <template
                      v-if="prospect.block"
                    >
                      {{ prospect.block }}
                    </template>

                  </span>

                </div>

              </div>

            </div>


            <!-- =============================================
                 TIME + STATUS
                 ============================================= -->

            <div class="prospect-side">

              <span class="prospect-time">

                {{ formatRelativeTime(
                  prospect.createdAt
                ) }}

                >

              </span>


              <span
                class="prospect-status"
                :class="
                  getStatusClass(
                    prospect.status
                  )
                "
              >

                {{ getStatusLabel(
                  prospect.status
                ) }}

              </span>

            </div>

          </article>


          <!-- =============================================
               EMPTY
               ============================================= -->

          <div
            v-if="filteredProspects.length === 0"
            class="empty-state"
          >

            <div class="empty-icon">

              <ion-icon
                :icon="peopleOutline"
              />

            </div>

            <strong>
              Calon pembeli tidak ditemukan
            </strong>

            <span>
              Coba ubah pencarian atau filter.
            </span>

          </div>

        </section>

      </main>


      <!-- =================================================
           DECORATIVE LAND
           ================================================= -->

      <div class="land-decoration">

        <div class="land-back"></div>

        <div class="land-front"></div>

      </div>


    </ion-content>


    <!-- =====================================================
         FLOATING ADD BUTTON
         ===================================================== -->

    <button
      type="button"
      class="floating-add"
      aria-label="Tambah calon pembeli"
      @click="addProspect"
    >

      <ion-icon
        :icon="add"
      />

    </button>


    <!-- =====================================================
         BOTTOM NAVIGATION
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
  ref,
} from 'vue'

import {
  IonPage,
  IonContent,
  IonIcon,
  useIonRouter,
} from '@ionic/vue'

import {
  add,
  chevronForward,
  locationOutline,
  people,
  peopleOutline,
  searchOutline,
  timeOutline,
} from 'ionicons/icons'


import AppHeader
  from '@/components/common/AppHeader.vue'

import MobileTabBar
  from '@/components/common/MobileTabBar.vue'

import {
  supabase,
} from '@/services/config/supabase'

import {
  marketingProspects,
} from '@/services/marketingProspectService'

import type {
  Prospect,
  ProspectStatus,
} from '@/services/marketingProspectService'


/* =========================================================
   TYPE
   ========================================================= */

type FilterValue =
  | 'all'
  | 'prospek'
  | 'followup'
  | 'booking'
  | 'sold'

/* =========================================================
   ROUTER
   ========================================================= */

const ionRouter = useIonRouter()


/* =========================================================
   STATE
   ========================================================= */

const loading = ref(true)

const errorMessage = ref('')

const prospects =
  ref<Prospect[]>([])

const searchQuery =
  ref('')

const selectedFilter =
  ref<FilterValue>('all')


/* =========================================================
   LOAD DATA
   ========================================================= */

async function loadProspects() {

  loading.value = true

  errorMessage.value = ''

  try {

    prospects.value = marketingProspects

  } catch (error: any) {

    console.error(
      '[Calon Pembeli]',
      error,
    )

    errorMessage.value =
      error?.message ||
      'Data calon pembeli gagal dimuat.'

  } finally {

    loading.value = false

  }

}


/* =========================================================
   SUMMARY
   ========================================================= */

const totalProspects =
  computed(() => {

    return prospects.value.length

  })


const followUpCount =
  computed(() => {

    return prospects.value.filter(
      prospect =>
        prospect.status ===
        'Tindak Lanjut',
    ).length

  })


/* =========================================================
   FILTER
   ========================================================= */

const filters = computed(() => {

  return [

    {
      value:
        'all' as FilterValue,

      label:
        'Semua',

    },

    {
      value:
        'prospek' as FilterValue,

      label:
        'Prospek',

    },

    {
      value:
        'followup' as FilterValue,

      label:
        'Tindak Lanjut',

    },

    {
      value:
        'booking' as FilterValue,

      label:
        'Dipesan',

    },

    {
      value:
        'sold' as FilterValue,

      label:
        'Terjual',

    },

  ]

})


/* =========================================================
   FILTERED DATA
   ========================================================= */

const filteredProspects =
  computed(() => {

    let result =
      [...prospects.value]


    /* -----------------------------------------------------
       STATUS
       ----------------------------------------------------- */

    switch (
      selectedFilter.value
    ) {

      case 'prospek':

        result =
          result.filter(
            prospect =>
              prospect.status ===
              'Prospek',
          )

        break


      case 'followup':

        result =
          result.filter(
            prospect =>
              prospect.status ===
              'Tindak Lanjut',
          )

        break


      case 'booking':

        result =
          result.filter(
            prospect =>
              prospect.status ===
              'Booking',
          )

        break


      case 'sold':

        result =
          result.filter(
            prospect =>
              prospect.status ===
              'Terjual',
          )

        break

    }


    /* -----------------------------------------------------
       SEARCH
       ----------------------------------------------------- */

    const query =
      searchQuery.value
        .trim()
        .toLowerCase()


    if (query) {

      result =
        result.filter(
          prospect => {

            return (

              prospect.name
                .toLowerCase()
                .includes(query)

              ||

              prospect.phone
                .toLowerCase()
                .includes(query)

              ||

              (
                prospect.lotNumber
                  ?.toLowerCase()
                  .includes(query)
              )

            )

          },
        )

    }


    return result

  })


/* =========================================================
   INITIALS
   ========================================================= */

function getInitials(
  name: string,
) {

  if (!name) {

    return '?'

  }


  const words =
    name
      .trim()
      .split(/\s+/)


  if (words.length === 1) {

    return words[0]
      .slice(0, 2)
      .toUpperCase()

  }


  return (
    words[0][0] +
    words[1][0]
  ).toUpperCase()

}


/* =========================================================
   AREA
   ========================================================= */

function formatArea(
  area: number,
) {

  return `${area}m²`

}


/* =========================================================
   STATUS
   ========================================================= */

function getStatusLabel(
  status: ProspectStatus,
) {

  if (status === 'Booking') {
    return 'Dipesan'
  }

  return status

}


function getStatusClass(
  status: ProspectStatus,
) {

  switch (status) {

    case 'Prospek':

      return 'status-prospek'


    case 'Tindak Lanjut':

      return 'status-followup'


    case 'Booking':

      return 'status-booking'


    case 'Terjual':

      return 'status-sold'


    default:

      return ''

  }

}


/* =========================================================
   RELATIVE TIME
   ========================================================= */

function formatRelativeTime(
  dateString: string,
) {

  const date =
    new Date(dateString)

  const now =
    new Date()

  const diff =
    now.getTime() -
    date.getTime()

  const minutes =
    Math.floor(
      diff /
      (1000 * 60),
    )


  if (minutes < 1) {

    return 'Baru saja'

  }


  if (minutes < 60) {

    return `${minutes} m`

  }


  const hours =
    Math.floor(
      minutes / 60,
    )


  if (hours < 24) {

    return `${hours} jam`

  }


  const days =
    Math.floor(
      hours / 24,
    )


  return `${days} hari`

}


/* =========================================================
   OPEN PROSPECT
   ========================================================= */

function openProspect(
  prospect: Prospect,
) {
  ionRouter.push(
    `/marketing/clients/${prospect.id}`,
  )
}


/* =========================================================
   ADD PROSPECT
   ========================================================= */

function addProspect() {

  ionRouter.push(
    '/marketing/clients/new',
  )

}


/* =========================================================
   LOGOUT
   ========================================================= */

async function handleLogout() {

  try {

    const {
      error,
    } =
      await supabase.auth.signOut()


    if (error) {

      throw error

    }


    ionRouter.replace(
      '/login',
    )

  } catch (error) {

    console.error(
      '[Logout]',
      error,
    )

  }

}


/* =========================================================
   INITIAL LOAD
   ========================================================= */

onMounted(() => {

  loadProspects()

})

</script>


<style scoped>

/* =========================================================
   PAGE
   ========================================================= */

.calon-page {

  --page-background:
    #f7f7f5;

  background:
    var(--page-background);

}


/* =========================================================
   CONTENT
   ========================================================= */

.calon-content {

  --background:
    #f7f7f5;

}


/* =========================================================
   MAIN CONTAINER
   ========================================================= */

.page-container {

  position: relative;

  z-index: 3;

  width: 100%;

  max-width: 390px;

  min-height: 100%;

  margin: 0 auto;

  padding:
    12px
    clamp(12px, 5.1vw, 20px)
    145px;

  box-sizing: border-box;

}


/* =========================================================
   SUMMARY
   ========================================================= */

.summary-grid {

  width: 100%;

  display: grid;

  grid-template-columns:
    minmax(0, 1fr)
    minmax(0, 1fr);

  gap: 10px;

  margin-bottom: 10px;

}


.summary-card {

  position: relative;

  min-width: 0;

  height: 63px;

  display: flex;

  align-items: center;

  gap: 9px;

  padding:
    9px;

  box-sizing: border-box;

  border-radius: 8px;

  background:
    #ffffff;

  box-shadow:
    0 2px 7px
    rgba(0, 0, 0, 0.045);

}


.followup-card {

  background:
    #c5a55a;

  cursor: pointer;

}


.summary-icon {

  flex:
    0 0 38px;

  width: 38px;

  height: 38px;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 50%;

  background:
    #f3ead5;

  color:
    #c5a55a;

}


.summary-icon ion-icon {

  font-size: 21px;

}


.followup-icon {

  background:
    rgba(255, 255, 255, 0.18);

  color:
    #ffffff;

}


.summary-content {

  min-width: 0;

  display: flex;

  flex-direction: column;

  justify-content: center;

}


.summary-label {

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  color:
    #222222;

  font-size:
    clamp(7px, 2.3vw, 9px);

  line-height: 1.2;

  font-weight: 600;

}


.followup-card
.summary-label {

  color:
    #ffffff;

}


.summary-value {

  margin-top: 3px;

  color:
    #222222;

  font-size:
    clamp(16px, 5vw, 19px);

  line-height: 1;

  font-weight: 800;

}


.followup-card
.summary-value {

  color:
    #ffffff;

}


.summary-arrow {

  flex-shrink: 0;

  margin-left: auto;

  color:
    #ffffff;

  font-size: 17px;

}


/* =========================================================
   SEARCH
   ========================================================= */

.search-wrapper {

  position: relative;

  width: 100%;

  height: 40px;

  display: flex;

  align-items: center;

  margin-bottom: 7px;

  border-radius: 9px;

  background:
    #ffffff;

  box-shadow:
    0 2px 7px
    rgba(0, 0, 0, 0.045);

}


.search-icon {

  flex-shrink: 0;

  margin-left: 10px;

  color:
    #b1b1b1;

  font-size: 13px;

}


.search-input {

  width: 100%;

  min-width: 0;

  height: 100%;

  border: 0;

  outline: none;

  background:
    transparent;

  padding:
    0 30px 0 7px;

  color:
    #333333;

  font-family:
    inherit;

  font-size:
    clamp(9px, 2.8vw, 10px);

}


.search-input::placeholder {

  color:
    #a7a7a7;

}


.clear-search {

  position: absolute;

  top: 50%;

  right: 7px;

  width: 24px;

  height: 24px;

  display: flex;

  align-items: center;

  justify-content: center;

  transform:
    translateY(-50%);

  border: 0;

  background:
    transparent;

  color:
    #999999;

  font-size: 17px;

}


/* =========================================================
   FILTER
   ========================================================= */

.filter-wrapper {

  width: 100%;

  display: flex;

  align-items: center;

  gap: 8px;

  overflow-x: auto;

  padding:
    1px 0 8px;

  scrollbar-width:
    none;

  -webkit-overflow-scrolling:
    touch;

}


.filter-wrapper::-webkit-scrollbar {

  display: none;

}


.filter-button {

  flex:
    0 0 auto;

  height: 28px;

  padding:
    0 12px;

  border: 0;

  border-radius: 7px;

  background:
    #eeeeee;

  color:
    #777777;

  font-family:
    inherit;

  font-size:
    clamp(8px, 2.5vw, 10px);

  font-weight: 500;

  white-space:
    nowrap;

  cursor: pointer;

  transition:
    150ms ease;

}


.filter-button.active {

  background:
    #c5a55a;

  color:
    #ffffff;

  font-weight: 700;

}


.filter-button:active {

  transform:
    scale(0.96);

}


/* =========================================================
   SECTION TITLE
   ========================================================= */

.section-title-row {

  display: flex;

  align-items: center;

  gap: 7px;

  margin-bottom: 11px;

}


.section-title-row h2 {

  margin: 0;

  color:
    #202020;

  font-size:
    clamp(15px, 4.6vw, 17px);

  line-height: 1.1;

  font-weight: 800;

}


.result-count {

  min-width: 18px;

  height: 18px;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 50%;

  background:
    #e9dfc7;

  color:
    #a88943;

  font-size: 8px;

  font-weight: 700;

}


/* =========================================================
   PROSPECT LIST
   ========================================================= */

.prospect-list {

  width: 100%;

  display: flex;

  flex-direction: column;

  gap: 13px;

}


/* =========================================================
   PROSPECT CARD
   ========================================================= */

.prospect-card {

  position: relative;

  width: 100%;

  min-width: 0;

  min-height: 113px;

  display: flex;

  align-items: flex-start;

  gap: 10px;

  padding:
    11px 10px;

  box-sizing: border-box;

  border-radius: 10px;

  background:
    #ffffff;

  box-shadow:
    0 2px 7px
    rgba(0, 0, 0, 0.04);

  cursor: pointer;

  -webkit-tap-highlight-color:
    transparent;

}


.prospect-card:active {

  transform:
    scale(0.99);

}


.prospect-card:focus-visible {

  outline:
    2px solid
    #c5a55a;

  outline-offset: 2px;

}


/* =========================================================
   AVATAR
   ========================================================= */

.prospect-avatar {

  flex:
    0 0 38px;

  width: 38px;

  height: 38px;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 50%;

  background:
    #f2e7cc;

  color:
    #202020;

  font-size:
    clamp(11px, 3.4vw, 13px);

  font-weight: 700;

}


/* =========================================================
   INFORMATION
   ========================================================= */

.prospect-information {

  min-width: 0;

  flex: 1;

  padding-top: 1px;

}


.prospect-name {

  width: 100%;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  color:
    #242424;

  font-size:
    clamp(11px, 3.4vw, 13px);

  line-height: 1.2;

  font-weight: 800;

}


.prospect-phone {

  margin-top: 2px;

  color:
    #9b8e8e;

  font-size:
    clamp(8px, 2.7vw, 10px);

  line-height: 1.2;

}


/* =========================================================
   LOT
   ========================================================= */

.prospect-lot {

  display: flex;

  align-items: center;

  gap: 6px;

  margin-top: 15px;

}


.prospect-lot > ion-icon {

  flex-shrink: 0;

  color:
    #c5a55a;

  font-size: 17px;

}


.lot-text {

  min-width: 0;

  display: flex;

  flex-direction: column;

  gap: 1px;

}


.lot-text strong {

  color:
    #343434;

  font-size:
    clamp(9px, 2.9vw, 11px);

  line-height: 1.1;

  font-weight: 700;

}


.lot-text span {

  color:
    #aaa0a0;

  font-size:
    clamp(7px, 2.3vw, 8px);

  line-height: 1.1;

}


/* =========================================================
   RIGHT SIDE
   ========================================================= */

.prospect-side {

  flex:
    0 0
    clamp(64px, 19vw, 75px);

  min-width:
    clamp(64px, 19vw, 75px);

  height: 100%;

  display: flex;

  flex-direction: column;

  align-items: flex-end;

}


.prospect-time {

  color:
    #9b8e8e;

  font-size:
    clamp(8px, 2.5vw, 9px);

  line-height: 1.2;

  white-space: nowrap;

}


/* =========================================================
   STATUS
   ========================================================= */

.prospect-status {

  min-width:
    clamp(64px, 19vw, 75px);

  height: 28px;

  display: flex;

  align-items: center;

  justify-content: center;

  margin-top: 34px;

  padding:
    0 7px;

  box-sizing: border-box;

  border-radius: 7px;

  font-size:
    clamp(7px, 2.3vw, 8px);

  line-height: 1;

  font-weight: 600;

  white-space: nowrap;

}


/* PROSPEK */

.status-prospek {

  background:
    #e5e8e5;

  color:
    #6d726d;

}


/* TINDAK LANJUT */

.status-followup {

  background:
    #f2d1cc;

  color:
    #7f4d47;

}


/* BOOKING */

.status-booking {

  background:
    #ffedc5;

  color:
    #9d7629;

}


/* SOLD */

.status-sold {

  background:
    #e8f4e8;

  color:
    #427346;

}


/* =========================================================
   LOADING / ERROR
   ========================================================= */

.state-container {

  min-height: 210px;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  gap: 7px;

  text-align: center;

  color:
    #888888;

}


.state-container p {

  margin: 0;

  font-size: 10px;

}


.state-container strong {

  color:
    #444444;

  font-size: 12px;

}


.loading-spinner {

  width: 27px;

  height: 27px;

  border:
    3px solid
    rgba(197, 165, 90, 0.2);

  border-top-color:
    #c5a55a;

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


.error-icon {

  width: 38px;

  height: 38px;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 50%;

  background:
    #f2d1cc;

  color:
    #9b4f47;

  font-size: 18px;

  font-weight: 800;

}


.retry-button {

  margin-top: 4px;

  padding:
    7px 14px;

  border: 0;

  border-radius: 7px;

  background:
    #c5a55a;

  color:
    #ffffff;

  font-family:
    inherit;

  font-size: 9px;

  font-weight: 700;

}


/* =========================================================
   EMPTY
   ========================================================= */

.empty-state {

  min-height: 180px;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  gap: 5px;

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

  background:
    #ffffff;

  color:
    #c5a55a;

}


.empty-icon ion-icon {

  font-size: 21px;

}


.empty-state strong {

  color:
    #555555;

  font-size: 12px;

}


.empty-state span {

  color:
    #999999;

  font-size: 9px;

}


/* =========================================================
   LAND
   ========================================================= */

.land-decoration {

  position: absolute;

  z-index: 1;

  left: 0;

  right: 0;

  bottom: 0;

  height: 180px;

  overflow: hidden;

  pointer-events: none;

}


/* BACK LAND */

.land-back {

  position: absolute;

  left: -15%;

  bottom: 46px;

  width: 130%;

  height: 100px;

  background:
    #e9e0c8;

  border-radius:
    50% 50% 0 0 /
    45% 45% 0 0;

  transform:
    rotate(1deg);

}


/* FRONT LAND */

.land-front {

  position: absolute;

  left: -15%;

  bottom: -63px;

  width: 130%;

  height: 150px;

  background:
    #9ba68f;

  border-radius:
    50% 50% 0 0 /
    40% 40% 0 0;

  transform:
    rotate(1deg);

}


/* =========================================================
   FLOATING ADD
   ========================================================= */

/*
 * Tombol sengaja berada di luar <ion-content>.
 *
 * Dengan begitu posisi tombol mengikuti viewport,
 * bukan mengikuti tinggi/scroll area ion-content.
 *
 * Keep the button above the fixed MobileTabBar, including
 * its device safe-area padding.
 */

.floating-add {

  position: fixed;

  z-index: 10000;

  right:
    clamp(14px, 5vw, 22px);

  bottom:
    calc(
      98px
      + env(safe-area-inset-bottom, 0px)
      + 12px
    );

  width:
    clamp(48px, 14vw, 54px);

  height:
    clamp(48px, 14vw, 54px);

  display: flex;

  align-items: center;

  justify-content: center;

  padding: 0;

  border: 0;

  border-radius: 50%;

  background:
    #c5a55a;

  color:
    #ffffff;

  box-shadow:
    0 4px 12px
    rgba(0, 0, 0, 0.18);

  cursor: pointer;

  -webkit-tap-highlight-color:
    transparent;

  touch-action: manipulation;

  transition:
    transform 120ms ease,
    box-shadow 120ms ease;

}


.floating-add ion-icon {

  font-size:
    clamp(27px, 7.5vw, 31px);

}


.floating-add:hover {

  box-shadow:
    0 5px 14px
    rgba(0, 0, 0, 0.20);

}


.floating-add:active {

  transform:
    scale(0.92);

}


.floating-add:focus-visible {

  outline:
    2px solid
    #ffffff;

  outline-offset:
    3px;

}


/* =========================================================
   SMALL MOBILE
   ========================================================= */

@media (max-width: 360px) {

  .page-container {

    padding:
      10px
      10px
      135px;

  }


  .summary-grid {

    gap: 7px;

  }


  .summary-card {

    height: 59px;

    gap: 6px;

    padding: 7px;

  }


  .summary-icon {

    flex-basis: 34px;

    width: 34px;

    height: 34px;

  }


  .summary-icon ion-icon {

    font-size: 18px;

  }


  .summary-label {

    font-size: 7px;

  }


  .summary-value {

    font-size: 16px;

  }


  .prospect-card {

    min-height: 108px;

    gap: 7px;

    padding:
      10px 8px;

  }


  .prospect-avatar {

    flex-basis: 35px;

    width: 35px;

    height: 35px;

    font-size: 10px;

  }


  .prospect-lot {

    margin-top: 13px;

  }


  .prospect-status {

    margin-top: 31px;

  }

}


/* =========================================================
   VERY SMALL MOBILE
   ========================================================= */

@media (max-width: 320px) {

  .page-container {

    padding:
      9px
      7px
      125px;

  }


  .summary-grid {

    gap: 6px;

  }


  .summary-card {

    height: 56px;

    padding: 6px;

  }


  .summary-icon {

    flex-basis: 31px;

    width: 31px;

    height: 31px;

  }


  .summary-icon ion-icon {

    font-size: 16px;

  }


  .summary-label {

    font-size: 6.5px;

  }


  .summary-value {

    font-size: 15px;

  }


  .search-wrapper {

    height: 38px;

  }


  .filter-wrapper {

    gap: 5px;

  }


  .filter-button {

    height: 26px;

    padding:
      0 9px;

    font-size: 7.5px;

  }


  .section-title-row h2 {

    font-size: 14px;

  }


  .prospect-list {

    gap: 9px;

  }


  .prospect-card {

    min-height: 100px;

    gap: 6px;

    padding:
      8px 7px;

  }


  .prospect-avatar {

    flex-basis: 32px;

    width: 32px;

    height: 32px;

    font-size: 9px;

  }


  .prospect-name {

    font-size: 10px;

  }


  .prospect-phone {

    font-size: 7.5px;

  }


  .prospect-lot {

    margin-top: 11px;

    gap: 4px;

  }


  .prospect-lot > ion-icon {

    font-size: 14px;

  }


  .lot-text strong {

    font-size: 8px;

  }


  .lot-text span {

    font-size: 6.5px;

  }


  .prospect-side {

    flex-basis: 58px;

    min-width: 58px;

  }


  .prospect-time {

    font-size: 7px;

  }


  .prospect-status {

    min-width: 58px;

    height: 25px;

    margin-top: 29px;

    padding:
      0 5px;

    font-size: 6.5px;

  }


}


/* =========================================================
   EXTREMELY SMALL
   ========================================================= */

@media (max-width: 280px) {

  .page-container {

    padding-left: 5px;

    padding-right: 5px;

  }


  .summary-card {

    gap: 4px;

  }


  .summary-icon {

    flex-basis: 27px;

    width: 27px;

    height: 27px;

  }


  .summary-icon ion-icon {

    font-size: 14px;

  }


  .summary-label {

    font-size: 5.8px;

  }


  .summary-value {

    font-size: 13px;

  }


  .prospect-card {

    gap: 5px;

    padding:
      7px 5px;

  }


  .prospect-avatar {

    flex-basis: 29px;

    width: 29px;

    height: 29px;

    font-size: 8px;

  }


  .prospect-name {

    font-size: 8.5px;

  }


  .prospect-phone {

    font-size: 6.5px;

  }


  .prospect-side {

    flex-basis: 50px;

    min-width: 50px;

  }


  .prospect-status {

    min-width: 50px;

    height: 22px;

    margin-top: 27px;

    font-size: 5.8px;

  }

}


/* =========================================================
   FLOATING BUTTON — VERY SMALL DEVICES
   ========================================================= */

@media (max-width: 360px) {

  .floating-add {

    right:
      max(12px, 4vw);

    width:
      48px;

    height:
      48px;

  }

  .floating-add ion-icon {

    font-size:
      26px;

  }

}


@media (max-width: 320px) {

  .floating-add {

    right:
      12px;

    width:
      46px;

    height:
      46px;

  }

  .floating-add ion-icon {

    font-size:
      24px;

  }

}


@media (max-width: 280px) {

  .floating-add {

    right:
      10px;

    width:
      44px;

    height:
      44px;

  }

  .floating-add ion-icon {

    font-size:
      23px;

  }

}


/* =========================================================
   LAND DECORATION
   ========================================================= */

/*
 * Land tetap menjadi dekorasi di belakang.
 * Tombol floating tidak lagi berada di dalam stacking
 * context land/scroll content.
 */

.land-decoration {

  pointer-events:
    none;

}

</style>