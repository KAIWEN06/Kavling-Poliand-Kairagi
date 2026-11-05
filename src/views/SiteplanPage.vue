<template>
  <ion-page>
    <ion-content class="siteplan-content">
      <div
        class="siteplan-page"
        @touchstart.stop
        @touchmove.stop
        @touchend.stop
        @touchcancel.stop
      >
        <div class="siteplan-container">
          <SiteplanMap
            :lots="lots"
            :selected-lot="selectedLot ?? undefined"
            :pending-lot="pendingLot ?? undefined"
            :hovered-lot="hoveredLot ?? undefined"
            :background="backgroundImage"
            :svg-raw="svgRaw"
            :rotation="currentRotation"
            :scale="1"
            @select="handleLotSelection"
            @hover="hoverLot"
            @leave="clearHover"
            @rotate="handleRotate"
            @map-click="handleMapClick"
          />
        </div>

        <DetailPanel
          v-if="selectedLot"
          :lot="selectedLot"
          @close="selectedLot = null"
        />

        <Transition name="skeleton-fade">
          <div v-if="showLoading" class="siteplan-skeleton-overlay">
            <SiteplanSkeleton />
          </div>
        </Transition>

        <div v-if="error && !showLoading" class="siteplan-error">
          <p>Gagal memuat Siteplan.</p>
          <button class="retry-button" type="button" @click="handleRetry">
            Coba Lagi
          </button>
        </div>
      </div>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">

import {
  onBeforeUnmount,
  onMounted,
  ref
} from 'vue'

import {
  IonContent,
  IonPage
} from '@ionic/vue'


/* =========================================================
   COMPONENTS
   ========================================================= */

import DetailPanel
  from '../components/siteplan/DetailPanel.vue'

import SiteplanMap
  from '../components/siteplan/SiteplanMap.vue'

import SiteplanSkeleton
  from '../components/ui/skeletons/SiteplanSkeleton.vue'


/* =========================================================
   COMPOSABLE
   ========================================================= */

import {
  useSiteplan
} from '../composables/useSiteplant'

import type {
  SiteplanLot
} from '../services/siteplanService'


/* =========================================================
   LOCAL ASSETS
   ========================================================= */

import backgroundImage
  from '../assets/siteplan/Siteplan.png'

import svgRaw
  from '../assets/siteplan/LOTS_WITH_ID.svg?raw'


/* =========================================================
   SITEPLAN DATA
   ========================================================= */

const {
  lots,
  loading,
  error,
  selectedLot,
  hoveredLot,
  selectLot,
  hoverLot,
  clearHover,
  reload
} = useSiteplan()


/* =========================================================
   MAP STATE
   ========================================================= */

const currentRotation =
  ref(0)

const pendingLot =
  ref<SiteplanLot | null>(null)

let selectionTimer:
  ReturnType<typeof setTimeout> | undefined

const LOT_SELECTION_FEEDBACK_MS = 550

function handleLotSelection(
  lot: SiteplanLot | null
): void {
  if (
    !lot ||
    pendingLot.value ||
    loading.value
  ) {
    return
  }

  pendingLot.value = lot

  selectionTimer = setTimeout(() => {
    selectionTimer = undefined

    if (pendingLot.value !== lot) {
      return
    }

    pendingLot.value = null
    selectLot(lot)
  }, LOT_SELECTION_FEEDBACK_MS)
}


/* =========================================================
   LOADING STATE
   ========================================================= */

const showLoading =
  ref(true)

const loadingProgress =
  ref(0)

const MIN_LOADING_TIME =
  1800

const REFRESH_LOADING_TIME =
  1800

let refreshTimer:
  ReturnType<typeof setTimeout> | undefined

let progressTimer:
  ReturnType<typeof setInterval> | undefined

let progressTarget =
  0


/* =========================================================
   UPDATE PROGRESS
   ========================================================= */

function updateProgress(
  value: number
): void {

  progressTarget =
    Math.min(
      100,
      Math.max(
        0,
        Math.round(value)
      )
    )

  if (progressTimer) {
    return
  }

  progressTimer =
    setInterval(() => {

      if (
        loadingProgress.value <
        progressTarget
      ) {

        loadingProgress.value += 1

        return
      }

      if (
        progressTarget >=
        100
      ) {

        if (progressTimer) {

          clearInterval(
            progressTimer
          )

          progressTimer =
            undefined
        }
      }

    }, 18)
}


/* =========================================================
   WAIT
   ========================================================= */

function wait(
  milliseconds: number
): Promise<void> {

  return new Promise(
    (resolve) => {

      setTimeout(
        resolve,
        milliseconds
      )

    }
  )
}


/* =========================================================
   WAIT FOR DATA
   ========================================================= */

async function waitForSiteplanData(): Promise<void> {

  updateProgress(10)

  /*
   * Berikan waktu kepada
   * halaman untuk dirender.
   */

  await wait(50)

  updateProgress(30)

  /*
   * Tunggu data Siteplan.
   */

  while (
    loading.value
  ) {

    updateProgress(
      Math.min(
        loadingProgress.value + 1,
        85
      )
    )

    await wait(50)
  }

  /*
   * Data selesai.
   */

  if (
    error.value
  ) {

    updateProgress(100)

    return
  }

  updateProgress(90)
}


/* =========================================================
   START LOADING
   ========================================================= */

async function startSiteplanLoading(): Promise<void> {

  const startTime =
    Date.now()

  try {

    await waitForSiteplanData()

    /*
     * Pastikan loading tampil
     * minimal 1.8 detik.
     */

    const elapsed =
      Date.now() -
      startTime

    const remaining =
      Math.max(
        0,
        MIN_LOADING_TIME -
        elapsed
      )

    if (
      remaining > 0
    ) {

      await wait(
        remaining
      )
    }

    /*
     * Selesaikan progress.
     */

    updateProgress(100)

    while (
      loadingProgress.value <
      100
    ) {

      await wait(25)
    }

    /*
     * Berikan sedikit waktu
     * agar 100% terlihat.
     */

    await wait(200)

  } catch (loadingError) {

    console.error(
      '[Siteplan] Loading gagal:',
      loadingError
    )

    updateProgress(100)

    await wait(300)

  } finally {

    showLoading.value =
      false
  }
}


/* =========================================================
   PULL TO REFRESH
   ========================================================= */

function handleRefresh(): void {

  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = undefined
  }

  showLoading.value = true

  loadingProgress.value = 0
  progressTarget = 0

  /*
   * Refresh hanya mengikuti durasi visual.
   * Tidak menunggu service/data agar skeleton
   * tidak pernah stuck.
   */

  updateProgress(15)

  refreshTimer = setTimeout(() => {

    updateProgress(100)

    const finishTimer =
      setTimeout(() => {

        showLoading.value = false

        window.dispatchEvent(
          new CustomEvent(
            'poliland:refresh-complete'
          )
        )

        refreshTimer = undefined

      }, 200)

    /*
     * Simpan timer terakhir agar lifecycle
     * tetap bersih ketika halaman dilepas.
     */
    refreshTimer = finishTimer

  }, REFRESH_LOADING_TIME)
}


/* =========================================================
   ROTATE
   ========================================================= */

function handleRotate(
  nextRotation: number
): void {

  currentRotation.value =
    nextRotation
}


/* =========================================================
   MAP CLICK
   ========================================================= */

function handleMapClick(
  payload: any
): void {

  if (
    payload?.action ===
    'fullscreen'
  ) {

    console.log(
      'Fullscreen triggered'
    )
  }
}


/* =========================================================
   RETRY
   ========================================================= */

async function handleRetry(): Promise<void> {

  showLoading.value =
    true

  loadingProgress.value =
    0

  progressTarget =
    0

  try {

    await reload()

  } catch (reloadError) {

    console.error(
      '[Siteplan] Reload gagal:',
      reloadError
    )
  }

  await startSiteplanLoading()
}


/* =========================================================
   MOUNTED
   ========================================================= */

onMounted(() => {

  void startSiteplanLoading()

  window.addEventListener(
    'poliland:refresh',
    handleRefresh
  )
})


/* =========================================================
   CLEANUP
   ========================================================= */

onBeforeUnmount(() => {

  if (selectionTimer) {
    clearTimeout(selectionTimer)
    selectionTimer = undefined
  }

  window.removeEventListener(
    'poliland:refresh',
    handleRefresh
  )

  if (progressTimer) {

    clearInterval(
      progressTimer
    )

    progressTimer =
      undefined
  }

  if (refreshTimer) {

    clearTimeout(
      refreshTimer
    )

    refreshTimer =
      undefined
  }
})

</script>


<style scoped>

/* =========================================================
   IONIC CONTENT
   ========================================================= */

.siteplan-content {

  /*
   * Background mengikuti warna
   * area Siteplan.
   */

  --background:
    #C5D2A5;

  /*
   * Hilangkan padding default.
   */

  --padding-top: 0;
  --padding-bottom: 0;
  --padding-start: 0;
  --padding-end: 0;

  /*
   * Pastikan content memenuhi
   * area yang diberikan Ionic.
   */

  width: 100%;
  height: 100%;

  overflow: hidden;
}


/* =========================================================
   SITEPLAN PAGE
   ========================================================= */

.siteplan-page {

  position: relative;

  width: 100%;
  height: 100%;

  min-width: 0;
  min-height: 0;

  overflow: hidden;

  /*
   * Siteplan adalah area gesture sendiri.
   * Jangan biarkan overscroll diteruskan ke
   * halaman utama / Pull-to-Refresh.
   */
  overscroll-behavior: none;
  -webkit-overflow-scrolling: auto;

  background:
    #C5D2A5;
}


/* =========================================================
   SITEPLAN CONTAINER
   ========================================================= */

.siteplan-container {

  position: absolute;

  top: 0;
  right: 0;
  bottom: 0;
  left: 0;

  width: auto;
  height: auto;

  min-width: 0;
  min-height: 0;

  overflow: hidden;

  /*
   * Isolasi gesture map dari overscroll Ionic.
   * Tidak memakai touch-action:none di sini karena
   * DetailPanel tetap membutuhkan gesture scroll.
   */
  overscroll-behavior: none;

  background:
    #C5D2A5;
}


/* =========================================================
   LOADING PAGE OVERRIDE
   ========================================================= */

.siteplan-container
:deep(.loading-page) {

  position: absolute;

  inset: 0;

  width: 100%;
  height: 100%;

  min-width: 0;
  min-height: 0;

  background:
    #ffffff;

  padding:
    20px;
}


/* =========================================================
   SKELETON OVERLAY
   ========================================================= */

.siteplan-skeleton-overlay {

  position: absolute;

  inset: 0;

  z-index: 9999;

  width: 100%;
  height: 100%;

  overflow: hidden;

  background:
    #C5D2A5;
}


.skeleton-fade-enter-active,
.skeleton-fade-leave-active {

  transition:
    opacity 0.25s ease;
}


.skeleton-fade-enter-from,
.skeleton-fade-leave-to {

  opacity: 0;
}


/* =========================================================
   ERROR
   ========================================================= */

.siteplan-error {

  position: absolute;

  inset: 0;

  width: 100%;
  height: 100%;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  text-align: center;

  background:
    #ffffff;
}


.siteplan-error p {

  margin:
    0 0 16px;

  color:
    #555;

  font-size:
    14px;
}


/* =========================================================
   RETRY BUTTON
   ========================================================= */

.retry-button {

  min-width:
    140px;

  padding:
    11px 20px;

  border:
    none;

  border-radius:
    10px;

  background:
    #d4af37;

  color:
    #ffffff;

  font-size:
    14px;

  font-weight:
    700;

  cursor:
    pointer;
}


.retry-button:active {

  transform:
    scale(0.98);
}


/* =========================================================
   MOBILE
   ========================================================= */

@media (max-width: 480px) {

  .siteplan-content {

    --padding-top: 0;
    --padding-bottom: 0;
    --padding-start: 0;
    --padding-end: 0;
  }

}


/* =========================================================
   SAFE AREA
   ========================================================= */

@supports (
  padding-bottom: env(safe-area-inset-bottom)
) {

  .siteplan-content {

    --padding-bottom:
      0px;
  }

}

</style>