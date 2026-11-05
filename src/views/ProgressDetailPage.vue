<template>
  <ion-page>

    <ion-content class="detail-content">

      <main class="detail-page">

        <!-- =================================================
             TOP NAVIGATION
             ================================================= -->
        <header class="detail-header">

          <button
            type="button"
            class="back-button"
            @click="router.back()"
          >
            <ion-icon
              :icon="arrowBackOutline"
              aria-hidden="true"
            />
          </button>

          <div class="header-title">
            <span>
              PROGRESS
            </span>

            <strong>
              {{ project.name }}
            </strong>
          </div>

          <button
            type="button"
            class="share-button"
            @click="shareProgress"
          >
            <ion-icon
              :icon="shareSocialOutline"
              aria-hidden="true"
            />
          </button>

        </header>


        <!-- =================================================
             HERO PHOTO
             ================================================= -->
        <section class="hero-photo">

          <img
            :src="project.cover"
            :alt="project.name"
          />

          <div class="hero-photo-overlay"></div>

          <div class="hero-photo-content">

            <span class="category-badge">
              {{ project.category }}
            </span>

            <div class="hero-bottom">

              <div>
                <h1>
                  {{ project.name }}
                </h1>

                <p>
                  {{ project.description }}
                </p>
              </div>

              <div class="hero-percentage">
                {{ project.progress }}%
              </div>

            </div>

          </div>

        </section>


        <!-- =================================================
             PROGRESS SUMMARY
             ================================================= -->
        <section class="summary-card">

          <div class="summary-top">

            <div>
              <span class="summary-label">
                STATUS PEMBANGUNAN
              </span>

              <strong>
                {{ project.statusLabel }}
              </strong>
            </div>

            <div class="status-indicator">
              <span></span>
            </div>

          </div>


          <div class="main-progress">

            <div class="main-progress-track">

              <div
                class="main-progress-fill"
                :style="{
                  width: `${project.progress}%`
                }"
              ></div>

            </div>

            <div class="main-progress-label">

              <span>
                Progress keseluruhan
              </span>

              <strong>
                {{ project.progress }}%
              </strong>

            </div>

          </div>


          <div class="summary-stats">

            <div>
              <strong>
                {{ project.updateCount }}
              </strong>

              <span>
                Total update
              </span>
            </div>

            <div>
              <strong>
                {{ project.photoCount }}
              </strong>

              <span>
                Dokumentasi
              </span>
            </div>

            <div>
              <strong>
                {{ project.lastUpdate }}
              </strong>

              <span>
                Update terakhir
              </span>
            </div>

          </div>

        </section>


        <!-- =================================================
             LATEST UPDATE
             ================================================= -->
        <section class="latest-section">

          <div class="section-heading">

            <div>
              <span class="section-label">
                UPDATE TERBARU
              </span>

              <h2>
                Perkembangan terakhir
              </h2>
            </div>

          </div>


          <article class="latest-card">

            <div class="latest-top">

              <span class="latest-date">
                14 OKTOBER 2026
              </span>

              <span class="latest-badge">
                Terbaru
              </span>

            </div>

            <h3>
              Pengerjaan struktur mencapai {{ project.progress }}%
            </h3>

            <p>
              Pekerjaan di lapangan terus berjalan.
              Tim saat ini berfokus pada penyelesaian
              bagian utama pembangunan sebelum memasuki
              tahap berikutnya.
            </p>


            <!-- Photos -->
            <div class="photo-grid">

              <button
                v-for="(photo, index) in latestPhotos"
                :key="photo"
                type="button"
                class="photo-item"
                @click="openPhoto(index)"
              >

                <img
                  :src="photo"
                  :alt="`Dokumentasi ${index + 1}`"
                />

                <span
                  v-if="index === latestPhotos.length - 1"
                  class="photo-more"
                >
                  +{{ project.photoCount - latestPhotos.length }}
                </span>

              </button>

            </div>

          </article>

        </section>


        <!-- =================================================
             HISTORY
             ================================================= -->
        <section class="history-section">

          <div class="section-heading">

            <div>
              <span class="section-label">
                RIWAYAT
              </span>

              <h2>
                Perjalanan pembangunan
              </h2>
            </div>

            <span class="history-count">
              {{ history.length }} update
            </span>

          </div>


          <div class="history-list">

            <article
              v-for="(item, index) in history"
              :key="item.id"
              class="history-item"
            >

              <!-- Timeline -->
              <div class="history-timeline">

                <div
                  class="history-marker"
                  :class="{
                    current: index === 0
                  }"
                >
                  <span></span>
                </div>

                <div
                  v-if="index < history.length - 1"
                  class="history-line"
                ></div>

              </div>


              <!-- Content -->
              <div class="history-content">

                <div class="history-header">

                  <div>
                    <span class="history-date">
                      {{ item.date }}
                    </span>

                    <h3>
                      {{ item.title }}
                    </h3>
                  </div>

                  <strong>
                    {{ item.progress }}%
                  </strong>

                </div>


                <p>
                  {{ item.description }}
                </p>


                <!-- History photos -->
                <div class="history-photos">

                  <button
                    v-for="(photo, photoIndex) in item.photos"
                    :key="photo"
                    type="button"
                    @click="
                      openHistoryPhoto(
                        item.photos,
                        photoIndex
                      )
                    "
                  >

                    <img
                      :src="photo"
                      :alt="item.title"
                    />

                  </button>

                </div>

              </div>

            </article>

          </div>

        </section>

      </main>


      <!-- =================================================
           PHOTO VIEWER
           ================================================= -->
      <div
        v-if="viewer.open"
        class="photo-viewer"
        @click.self="closePhoto"
      >

        <button
          type="button"
          class="viewer-close"
          @click="closePhoto"
        >
          <ion-icon
            :icon="closeOutline"
            aria-hidden="true"
          />
        </button>

        <img
          :src="viewer.photos[viewer.index]"
          alt="Dokumentasi pembangunan"
          class="viewer-image"
        />

        <div class="viewer-controls">

          <button
            type="button"
            :disabled="viewer.index === 0"
            @click="previousPhoto"
          >
            <ion-icon :icon="chevronBackOutline" />
          </button>

          <span>
            {{ viewer.index + 1 }} /
            {{ viewer.photos.length }}
          </span>

          <button
            type="button"
            :disabled="
              viewer.index === viewer.photos.length - 1
            "
            @click="nextPhoto"
          >
            <ion-icon :icon="chevronForwardOutline" />
          </button>

        </div>

      </div>

      <Transition name="refresh-fade">
        <div v-if="isLoading" class="refresh-overlay">
          <ProgressDetailSkeleton />
        </div>
      </Transition>

    </ion-content>

  </ion-page>
</template>


<script setup lang="ts">

import {
  computed,
  reactive,
  ref,
  onMounted,
  onUnmounted,
} from 'vue'

import {
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/vue'

import {
  arrowBackOutline,
  chevronBackOutline,
  chevronForwardOutline,
  closeOutline,
  informationCircleOutline,
  shareSocialOutline,
} from 'ionicons/icons'

import {
  useRoute,
  useRouter,
} from 'vue-router'

import ProgressDetailSkeleton from '@/components/ui/skeletons/ProgressDetailSkeleton.vue'


const router = useRouter()
const route = useRoute()

const isLoading = ref(true)
const isRefreshing = ref(false)

let refreshTimer: ReturnType<typeof setTimeout> | null = null

// Sama seperti HomePage: skeleton dikontrol oleh waktu,
// bukan menunggu data/service selesai.
const REFRESH_DURATION = 1800

const handleRefresh = () => {
  if (isRefreshing.value) return

  isRefreshing.value = true
  isLoading.value = true

  if (refreshTimer) {
    clearTimeout(refreshTimer)
  }

  refreshTimer = setTimeout(() => {
    isLoading.value = false
    isRefreshing.value = false

    window.dispatchEvent(
      new CustomEvent('poliland:refresh-complete')
    )
  }, REFRESH_DURATION)
}

const handleInitialLoad = () => {
  setTimeout(() => {
    isLoading.value = false
  }, 800)
}

onMounted(() => {
  window.addEventListener(
    'poliland:refresh',
    handleRefresh
  )

  handleInitialLoad()
})

onUnmounted(() => {
  window.removeEventListener(
    'poliland:refresh',
    handleRefresh
  )

  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
})


/* =========================================================
   PROJECT DATA
   ========================================================= */

const projects = [
  {
    id: 1,
    name: 'Jalan Utama',
    category: 'Jalan',

    description:
      'Pembangunan akses utama menuju kawasan PoliLand Kairagi.',

    progress: 72,

    statusLabel: 'Sedang dikerjakan',

    lastUpdate: '14 Okt 2026',

    updateCount: 6,

    photoCount: 12,

    cover:
      'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=80',
  },

  {
    id: 2,
    name: 'Sistem Drainase',
    category: 'Drainase',

    description:
      'Pembangunan sistem drainase untuk mendukung kawasan.',

    progress: 48,

    statusLabel: 'Sedang dikerjakan',

    lastUpdate: '12 Okt 2026',

    updateCount: 4,

    photoCount: 9,

    cover:
      'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1200&q=80',
  },

  {
    id: 3,
    name: 'Gerbang Kawasan',
    category: 'Fasilitas',

    description:
      'Pembangunan gerbang utama sebagai identitas kawasan.',

    progress: 100,

    statusLabel: 'Selesai',

    lastUpdate: '05 Okt 2026',

    updateCount: 5,

    photoCount: 15,

    cover:
      'https://images.unsplash.com/photo-1590725140246-20acddd6c9c3?auto=format&fit=crop&w=1200&q=80',
  },
]


const projectId = Number(route.params.id)


const project = computed(() => {

  return (
    projects.find(
      item => item.id === projectId
    ) ?? projects[0]
  )

})


/* =========================================================
   MOCK HISTORY
   ========================================================= */

const history = computed(() => {

  if (project.value.id === 1) {

    return [
      {
        id: 6,
        date: '14 Okt 2026',
        title: 'Struktur jalan mencapai 72%',
        progress: 72,

        description:
          'Pengerjaan struktur utama jalan terus dilakukan pada area akses utama kawasan.',

        photos: [
          'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1503387762-592deb58ef4e?auto=format&fit=crop&w=600&q=80',
        ],
      },

      {
        id: 5,
        date: '07 Okt 2026',
        title: 'Pengerjaan lapisan dasar',
        progress: 61,

        description:
          'Lapisan dasar pada bagian utama jalan telah selesai dikerjakan.',

        photos: [
          'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1590644365607-1c5a8f0f1c3d?auto=format&fit=crop&w=600&q=80',
        ],
      },

      {
        id: 4,
        date: '28 Sep 2026',
        title: 'Pekerjaan struktur dimulai',
        progress: 48,

        description:
          'Pekerjaan struktur jalan mulai dilakukan setelah tahap persiapan area selesai.',

        photos: [
          'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80',
        ],
      },

      {
        id: 3,
        date: '15 Sep 2026',
        title: 'Persiapan area',
        progress: 30,

        description:
          'Area pembangunan dibersihkan dan dipersiapkan untuk pekerjaan konstruksi.',

        photos: [
          'https://images.unsplash.com/photo-1590479773265-7464e5d48118?auto=format&fit=crop&w=600&q=80',
        ],
      },
    ]

  }


  if (project.value.id === 2) {

    return [
      {
        id: 21,
        date: '12 Okt 2026',
        title: 'Pengerjaan saluran utama',
        progress: 48,

        description:
          'Pekerjaan saluran drainase utama sedang dilanjutkan pada area blok pembangunan.',

        photos: [
          'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=600&q=80',
          'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=600&q=80',
        ],
      },

      {
        id: 20,
        date: '03 Okt 2026',
        title: 'Pekerjaan saluran dimulai',
        progress: 32,

        description:
          'Pengerjaan saluran drainase mulai dilakukan pada beberapa titik kawasan.',

        photos: [
          'https://images.unsplash.com/photo-1541888946425-d81bb19240f5?auto=format&fit=crop&w=600&q=80',
        ],
      },
    ]

  }


  return [
    {
      id: 31,
      date: '05 Okt 2026',
      title: 'Gerbang kawasan selesai',
      progress: 100,

      description:
        'Pekerjaan gerbang kawasan telah selesai dan memasuki tahap penggunaan.',

      photos: [
        'https://images.unsplash.com/photo-1590725140246-20acddd6c9c3?auto=format&fit=crop&w=600&q=80',
        'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=600&q=80',
      ],
    },

    {
      id: 30,
      date: '25 Sep 2026',
      title: 'Finishing gerbang',
      progress: 87,

      description:
        'Pekerjaan finishing dan penyelesaian detail gerbang dilakukan.',

      photos: [
        'https://images.unsplash.com/photo-1511818966892-d7d671e672a2?auto=format&fit=crop&w=600&q=80',
      ],
    },
  ]

})


/* =========================================================
   LATEST PHOTOS
   ========================================================= */

const latestPhotos = computed(() => {

  return history.value[0]?.photos ?? []

})


/* =========================================================
   PHOTO VIEWER
   ========================================================= */



const viewer = reactive<{
  open: boolean
  photos: string[]
  index: number
}>({
  open: false,
  photos: [],
  index: 0,
})


function openPhoto(index: number) {

  viewer.photos = latestPhotos.value
  viewer.index = index
  viewer.open = true
}


function openHistoryPhoto(
  photos: string[],
  index: number
) {

  viewer.photos = photos
  viewer.index = index
  viewer.open = true
}


function closePhoto() {

  viewer.open = false
}


function previousPhoto() {

  if (viewer.index > 0) {
    viewer.index--
  }
}


function nextPhoto() {

  if (
    viewer.index <
    viewer.photos.length - 1
  ) {
    viewer.index++
  }
}


/* =========================================================
   SHARE
   ========================================================= */

async function shareProgress() {

  const text =
    `${project.value.name} — Progress ${project.value.progress}% PoliLand Kairagi`

  if (
    navigator.share
  ) {

    try {

      await navigator.share({
        title: project.value.name,
        text,
      })

    } catch {
      // User cancelled share.
    }

    return
  }

  await navigator.clipboard?.writeText(text)

}

</script>


<style scoped>

/* =========================================================
   PAGE
   ========================================================= */

.detail-content {
  --background: var(--pl-background, #fafaf7);

  /*
   * Reserve space for the global floating TabBar.
   * The last content can be scrolled above the TabBar
   * instead of ending underneath it.
   */
  --padding-bottom: calc(110px + env(safe-area-inset-bottom));
}

.detail-page {
  width: 100%;
  max-width: 680px;

  margin: 0 auto;

  padding:
    18px 16px 0;
}

.bottom-space {
  height: 20px;
}


/* =========================================================
   HEADER
   ========================================================= */

.detail-header {
  position: relative;

  display: grid;

  grid-template-columns: 40px 1fr 40px;

  align-items: center;

  min-height: 62px;
}

.back-button,
.share-button {
  width: 36px;
  height: 36px;

  display: grid;
  place-items: center;

  border: 1px solid var(--pl-stone);
  border-radius: 11px;

  background: var(--pl-surface);

  color: var(--pl-slate);

  cursor: pointer;
}

.back-button:active,
.share-button:active {
  transform: scale(.96);
}

.back-button ion-icon,
.share-button ion-icon {
  font-size: 17px;
}

.header-title {
  display: flex;
  flex-direction: column;

  align-items: center;

  min-width: 0;
}

.header-title span {
  color: var(--pl-gray);

  font-size: 8px;
  font-weight: 800;

  letter-spacing: .13em;
}

.header-title strong {
  max-width: 190px;

  overflow: hidden;

  color: var(--pl-charcoal);

  font-size: 13px;

  white-space: nowrap;
  text-overflow: ellipsis;
}


/* =========================================================
   HERO PHOTO
   ========================================================= */

.hero-photo {
  position: relative;

  height: 260px;

  overflow: hidden;

  border-radius: 20px;

  background: var(--pl-sand);
}

.hero-photo img {
  width: 100%;
  height: 100%;

  display: block;

  object-fit: cover;
}

.hero-photo-overlay {
  position: absolute;

  inset: 0;

  background:
    linear-gradient(
      to bottom,
      rgb(0 0 0 / 5%) 20%,
      rgb(0 0 0 / 68%) 100%
    );
}

.hero-photo-content {
  position: absolute;

  inset: 0;

  display: flex;
  flex-direction: column;
  justify-content: space-between;

  padding: 15px;
}

.category-badge {
  align-self: flex-start;

  padding: 6px 8px;

  border-radius: 7px;

  background: rgb(0 0 0 / 45%);

  color: #fff;

  font-size: 8px;
  font-weight: 800;

  backdrop-filter: blur(5px);
}

.hero-bottom {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;

  gap: 15px;
}

.hero-bottom h1 {
  margin: 0;

  color: #fff;

  font-size: 24px;
  line-height: 1.1;

  font-weight: 850;

  letter-spacing: -.04em;
}

.hero-bottom p {
  max-width: 250px;

  margin: 6px 0 0;

  color: rgb(255 255 255 / 82%);

  font-size: 10px;
  line-height: 1.45;
}

.hero-percentage {
  flex: 0 0 auto;

  color: #fff;

  font-size: 28px;
  line-height: 1;

  font-weight: 850;

  letter-spacing: -.06em;
}


/* =========================================================
   SUMMARY
   ========================================================= */

.summary-card {
  position: relative;
  z-index: 2;

  margin: -18px 10px 28px;

  padding: 17px;

  border: 1px solid var(--pl-stone);
  border-radius: 17px;

  background: var(--pl-surface);

  box-shadow:
    0 8px 25px rgb(45 45 45 / 9%);
}

.summary-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.summary-label {
  display: block;

  color: var(--pl-gray);

  font-size: 8px;
  font-weight: 800;

  letter-spacing: .12em;
}

.summary-top strong {
  display: block;

  margin-top: 4px;

  color: var(--pl-charcoal);

  font-size: 13px;
}

.status-indicator {
  width: 28px;
  height: 28px;

  display: grid;
  place-items: center;

  border-radius: 50%;

  background: rgb(46 125 50 / 10%);
}

.status-indicator span {
  width: 8px;
  height: 8px;

  border-radius: 50%;

  background: var(--pl-success);
}

.main-progress {
  margin-top: 17px;
}

.main-progress-track {
  width: 100%;
  height: 8px;

  overflow: hidden;

  border-radius: 999px;

  background: var(--pl-sand);
}

.main-progress-fill {
  height: 100%;

  border-radius: inherit;

  background: var(--ion-color-primary);
}

.main-progress-label {
  display: flex;
  align-items: center;
  justify-content: space-between;

  margin-top: 6px;

  color: var(--pl-gray);

  font-size: 8px;
  font-weight: 650;
}

.main-progress-label strong {
  color: var(--ion-color-primary);

  font-size: 10px;
}

.summary-stats {
  display: grid;
  grid-template-columns: repeat(3, 1fr);

  margin-top: 16px;

  border-top: 1px solid var(--pl-stone);

  padding-top: 14px;
}

.summary-stats div {
  min-width: 0;

  text-align: center;
}

.summary-stats div + div {
  border-left: 1px solid var(--pl-stone);
}

.summary-stats strong {
  display: block;

  color: var(--pl-charcoal);

  font-size: 12px;
  line-height: 1.2;

  font-weight: 800;
}

.summary-stats span {
  display: block;

  margin-top: 3px;

  color: var(--pl-gray);

  font-size: 8px;
}


/* =========================================================
   SECTION
   ========================================================= */

.latest-section,
.history-section {
  margin-bottom: 28px;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;

  gap: 10px;

  margin-bottom: 13px;
}

.section-label {
  display: block;

  color: var(--pl-gray);

  font-size: 9px;
  font-weight: 800;

  letter-spacing: .14em;
}

.section-heading h2 {
  margin: 5px 0 0;

  color: var(--pl-charcoal);

  font-size: 18px;
  line-height: 1.2;

  font-weight: 800;

  letter-spacing: -.025em;
}

.history-count {
  color: var(--pl-warm-gray);

  font-size: 9px;
  font-weight: 700;
}


/* =========================================================
   LATEST CARD
   ========================================================= */

.latest-card {
  padding: 16px;

  border: 1px solid var(--pl-stone);
  border-radius: 17px;

  background: var(--pl-surface);
}

.latest-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.latest-date {
  color: var(--pl-warm-gray);

  font-size: 8px;
  font-weight: 800;

  letter-spacing: .1em;
}

.latest-badge {
  padding: 4px 7px;

  border-radius: 6px;

  background: rgb(46 125 50 / 9%);

  color: var(--pl-success);

  font-size: 8px;
  font-weight: 800;
}

.latest-card h3 {
  margin: 10px 0 5px;

  color: var(--pl-charcoal);

  font-size: 15px;
  line-height: 1.3;

  font-weight: 800;
}

.latest-card > p {
  margin: 0;

  color: var(--pl-gray);

  font-size: 10px;
  line-height: 1.55;
}


/* =========================================================
   PHOTO GRID
   ========================================================= */

.photo-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);

  gap: 6px;

  margin-top: 14px;
}

.photo-item {
  position: relative;

  width: 100%;
  height: 85px;

  padding: 0;

  overflow: hidden;

  border: 0;
  border-radius: 9px;

  background: var(--pl-sand);

  cursor: pointer;
}

.photo-item img {
  width: 100%;
  height: 100%;

  display: block;

  object-fit: cover;
}

.photo-more {
  position: absolute;

  inset: 0;

  display: grid;
  place-items: center;

  background: rgb(0 0 0 / 48%);

  color: #fff;

  font-size: 13px;
  font-weight: 800;
}


/* =========================================================
   HISTORY
   ========================================================= */

.history-list {
  display: flex;
  flex-direction: column;
}

.history-item {
  display: grid;

  grid-template-columns: 27px minmax(0, 1fr);

  gap: 11px;

  position: relative;
}

.history-timeline {
  position: relative;

  display: flex;
  justify-content: center;
}

.history-marker {
  position: relative;
  z-index: 2;

  width: 15px;
  height: 15px;

  margin-top: 3px;

  display: grid;
  place-items: center;

  border: 2px solid var(--pl-stone);
  border-radius: 50%;

  background: var(--pl-background);
}

.history-marker.current {
  border-color: var(--ion-color-primary);

  background: var(--ion-color-primary);

  box-shadow:
    0 0 0 4px rgb(177 142 69 / 11%);
}

.history-marker span {
  width: 4px;
  height: 4px;

  border-radius: 50%;

  background: var(--pl-stone);
}

.history-marker.current span {
  background: #fff;
}

.history-line {
  position: absolute;

  top: 18px;
  bottom: 0;

  width: 1px;

  background: var(--pl-stone);
}

.history-content {
  padding-bottom: 23px;
}

.history-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;

  gap: 10px;
}

.history-date {
  display: block;

  color: var(--pl-warm-gray);

  font-size: 8px;
  font-weight: 800;

  letter-spacing: .08em;
}

.history-header h3 {
  margin: 4px 0 0;

  color: var(--pl-charcoal);

  font-size: 13px;
  line-height: 1.3;

  font-weight: 800;
}

.history-header > strong {
  flex: 0 0 auto;

  color: var(--ion-color-primary);

  font-size: 12px;
}

.history-content > p {
  margin: 6px 0 0;

  color: var(--pl-gray);

  font-size: 9.5px;
  line-height: 1.5;
}

.history-photos {
  display: flex;

  gap: 6px;

  margin-top: 10px;

  overflow-x: auto;

  scrollbar-width: none;
}

.history-photos::-webkit-scrollbar {
  display: none;
}

.history-photos button {
  flex: 0 0 72px;

  width: 72px;
  height: 60px;

  padding: 0;

  overflow: hidden;

  border: 0;
  border-radius: 8px;

  background: var(--pl-sand);

  cursor: pointer;
}

.history-photos img {
  width: 100%;
  height: 100%;

  display: block;

  object-fit: cover;
}


/* =========================================================
   INFO
   ========================================================= */

.detail-info {
  display: flex;
  align-items: flex-start;

  gap: 8px;

  padding: 13px;

  border-radius: 13px;

  background: var(--pl-cream);

  color: var(--pl-gray);
}

.detail-info ion-icon {
  flex: 0 0 auto;

  margin-top: 1px;

  color: var(--pl-olive);

  font-size: 15px;
}

.detail-info p {
  margin: 0;

  font-size: 9px;
  line-height: 1.5;
}


/* =========================================================
   PHOTO VIEWER
   ========================================================= */

.photo-viewer {
  position: fixed;
  z-index: 9999;

  inset: 0;

  display: flex;
  align-items: center;
  justify-content: center;

  padding: 25px;

  background: rgb(0 0 0 / 94%);
}

.viewer-image {
  max-width: 100%;
  max-height: 78vh;

  object-fit: contain;

  border-radius: 8px;
}

.viewer-close {
  position: absolute;

  top: max(18px, env(safe-area-inset-top));
  right: 18px;

  width: 38px;
  height: 38px;

  display: grid;
  place-items: center;

  border: 1px solid rgb(255 255 255 / 25%);
  border-radius: 50%;

  background: rgb(0 0 0 / 35%);

  color: #fff;

  cursor: pointer;
}

.viewer-close ion-icon {
  font-size: 20px;
}

.viewer-controls {
  position: absolute;

  left: 50%;
  bottom: max(22px, env(safe-area-inset-bottom));

  transform: translateX(-50%);

  display: flex;
  align-items: center;

  gap: 20px;

  color: #fff;

  font-size: 10px;
  font-weight: 700;
}

.viewer-controls button {
  width: 38px;
  height: 38px;

  display: grid;
  place-items: center;

  border: 1px solid rgb(255 255 255 / 25%);
  border-radius: 50%;

  background: rgb(0 0 0 / 35%);

  color: #fff;
}

.viewer-controls button:disabled {
  opacity: .3;
}

.viewer-controls ion-icon {
  font-size: 18px;
}


/* =========================================================
   REFRESH SKELETON
   ========================================================= */

.refresh-overlay {
  position: absolute;
  inset: 0;
  z-index: 9999;

  overflow-y: auto;

  background: var(--pl-background, #FAFAF7);
}

.refresh-fade-enter-active,
.refresh-fade-leave-active {
  transition: opacity .25s ease;
}

.refresh-fade-enter-from,
.refresh-fade-leave-to {
  opacity: 0;
}


/* =========================================================
   SMALL MOBILE
   ========================================================= */

@media (max-width: 380px) {

  .detail-page {
    padding-inline: 14px;
  }

  .hero-photo {
    height: 235px;
  }

  .hero-bottom h1 {
    font-size: 21px;
  }

  .hero-percentage {
    font-size: 24px;
  }

  .summary-card {
    margin-inline: 7px;
  }

  .photo-item {
    height: 72px;
  }

}

</style>