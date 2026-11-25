<template>
  <ion-page>
    <ion-content class="siteplan-content">
      <div
        class="siteplan-page"
        :class="{
          'siteplan-page--admin': variant === 'admin',
          'siteplan-page--standalone': isStandalone,
          'is-ready': !showLoading,
        }"
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
            :scale="1.25"
            @select="handleLotSelection"
            @hover="hoverLot"
            @leave="clearHover"
            @rotate="handleRotate"
            @map-click="handleMapClick"
          />
        </div>

        <button
          v-if="isStandalone && !showLoading"
          class="siteplan-back"
          type="button"
          aria-label="Kembali"
          @click="goBack"
        >
          <IonIcon :icon="chevronBackOutline" aria-hidden="true" />
        </button>

        <DetailPanel
          v-if="selectedLot"
          :lot="selectedLot"
          :variant="variant"
          :client-mode="isClientRoute"
          @close="selectedLot = null"
          @purchase="startPurchase"
        />

        <!-- Layar muat bergaya Welcome: matahari, bukit, judul naik per kata, progres emas -->
        <Transition name="skeleton-fade">
          <div v-if="showLoading" class="siteplan-loading" role="status" aria-live="polite">
            <SceneBackdrop height="44%" />
            <div class="loading-copy">
              <h1 class="loading-title" aria-label="Denah Kavling">
                <span v-for="(word, i) in loadingWords" :key="word" class="loading-word" aria-hidden="true">
                  <motion.span
                    class="loading-word-inner"
                    :initial="reduced ? false : { y: '110%' }"
                    :animate="{ y: '0%' }"
                    :transition="{ duration: 0.7, delay: 0.2 + i * 0.1, ease: MOTION_EASE_OUT }"
                  >{{ word }}</motion.span>
                </span>
              </h1>
              <motion.p
                class="loading-hint"
                :initial="reduced ? false : { opacity: 0, y: 8 }"
                :animate="{ opacity: 1, y: 0 }"
                :transition="{ duration: 0.6, delay: 0.5, ease: MOTION_EASE_OUT }"
              >Menyiapkan denah dan status kavling…</motion.p>
              <div
                class="loading-bar"
                role="progressbar"
                aria-valuemin="0"
                aria-valuemax="100"
                :aria-valuenow="loadingProgress"
              >
                <span class="loading-bar__fill" :style="{ transform: `scaleX(${loadingProgress / 100})` }"></span>
              </div>
              <span class="loading-pct">{{ loadingProgress }}%</span>
            </div>
          </div>
        </Transition>

        <div v-if="error && !showLoading" class="siteplan-error">
          <SceneBackdrop height="40%" :lines="false" />
          <div class="siteplan-error__body">
            <h2>Denah belum bisa dimuat</h2>
            <p>Periksa koneksi Anda, lalu coba lagi.</p>
            <button class="retry-button" type="button" @click="handleRetry">
              Coba Lagi
            </button>
          </div>
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
import { useRoute } from 'vue-router'

import {
  IonContent,
  IonIcon,
  IonPage,
  useIonRouter
} from '@ionic/vue'

import { chevronBackOutline } from 'ionicons/icons'


/* =========================================================
   COMPONENTS
   ========================================================= */

import DetailPanel
  from '../components/siteplan/DetailPanel.vue'

import SiteplanMap
  from '../components/siteplan/SiteplanMap.vue'

import SceneBackdrop
  from '../components/ui/SceneBackdrop.vue'

import { motion } from 'motion-v'
import { useReducedMotion } from '../composables/useReducedMotion'
import { MOTION_EASE_OUT } from '../utils/motionTokens'


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
  from '../assets/siteplan/Siteplan.webp'

import svgRaw
  from '../assets/siteplan/LOTS_WITH_ID.svg?raw'
const reduced = useReducedMotion()
const loadingWords = ['Denah', 'Kavling']
const props = defineProps<{ variant?: 'public' | 'admin' }>()
const route = useRoute()
const variant = props.variant
  ?? (route.meta.role === 'admin' || route.path.startsWith('/admin/') ? 'admin' : 'public')

/* Siteplan penuh tanpa AppHeader dan tab bar (admin, marketing) butuh tombol kembali sendiri. */
const isStandalone = route.path !== '/siteplan'
const isClientRoute = route.path.startsWith('/client/')

/* Client mengajukan pemesanan lewat formulir SPK, bukan lewat halaman login. */
function startPurchase(lotId: number): void {
  ionRouter.push(`/client/dokumen?create=1&lot_id=${lotId}`)
}
const ionRouter = useIonRouter()

function goBack(): void {
  if (ionRouter.canGoBack()) {
    ionRouter.back()
    return
  }
  const fallback = route.path.startsWith('/admin')
    ? '/beranda-admin'
    : route.path.startsWith('/client')
      ? '/client/kavling'
      : route.path.startsWith('/marketing')
        ? '/beranda-marketing'
        : '/beranda-kepala-marketing'
  ionRouter.navigate(fallback, 'root', 'replace')
}


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
      '[denah] Loading gagal:',
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
      '[denah] Reload gagal:',
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
   TOMBOL KEMBALI (halaman penuh tanpa header/tab bar)
   Sebaris dengan kotak pencarian, ukuran dan gaya sama.
   ========================================================= */

.siteplan-back {
  position: absolute;
  top: calc(env(safe-area-inset-top, 12px) + 12px);
  left: max(12px, env(safe-area-inset-left, 0px));
  z-index: 101;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  padding: 0;
  border: 0;
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.96);
  color: var(--green-800, #2b4824);
  font-size: 24px;
  box-shadow: 0 6px 18px -8px rgba(37, 37, 37, 0.35), 0 0 0 1px rgba(53, 90, 44, 0.08);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
  transition: transform var(--dur-base) var(--ease-spring);
  animation: ctrl-in-top 560ms var(--ease-out) 300ms backwards;
}

.siteplan-back:active {
  transform: scale(0.94);
}

.siteplan-back:focus-visible {
  outline: 3px solid var(--poliland-gold, #cba044);
  outline-offset: 2px;
}

/* Geser kotak pencarian agar tidak tertutup tombol kembali */
.siteplan-page--standalone .siteplan-container :deep(.control-search) {
  left: calc(max(12px, env(safe-area-inset-left, 0px)) + 56px);
}

@media (max-height: 520px) and (orientation: landscape) {
  .siteplan-back {
    top: calc(env(safe-area-inset-top, 0px) + 8px);
  }
}

@media (prefers-reduced-motion: reduce) {
  .siteplan-back {
    animation: none;
  }
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
   LAYAR MUAT (rasa Welcome)
   ========================================================= */

.siteplan-loading {
  position: absolute;
  inset: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: calc(env(safe-area-inset-top, 0px) + 24px) 28px calc(env(safe-area-inset-bottom, 0px) + 24px);
  overflow: hidden;
  background: linear-gradient(180deg, #fbf5e6 0%, var(--pl-paper, #f9f5ec) 55%, var(--pl-paper-deep, #f1e8d4) 100%);
}

.loading-copy {
  position: relative;
  z-index: 2;
  width: 100%;
  max-width: 420px;
  margin: 0 auto;
  padding-bottom: 12dvh; /* sedikit di atas tengah agar bukit tidak menutupi */
}

.loading-eyebrow {
  display: block;
  margin-bottom: 10px;
  color: var(--poliland-gold-text, #966a12);
  font: 800 11px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.loading-title {
  margin: 0;
  color: var(--text-primary, #252525);
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: clamp(38px, 11vw, 50px);
  line-height: 1.06;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.loading-word {
  display: block;
  overflow: hidden;
  padding-bottom: 0.08em;
}

.loading-word-inner {
  display: block;
  will-change: transform;
}

.loading-hint {
  margin: 14px 0 22px;
  color: var(--text-secondary, #63636a);
  font-size: 15px;
  line-height: 1.5;
}

.loading-bar {
  height: 4px;
  overflow: hidden;
  border-radius: 999px;
  background: rgba(53, 90, 44, 0.14);
}

.loading-bar__fill {
  display: block;
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: var(--poliland-gold, #cba044);
  transform-origin: left;
  transform: scaleX(0);
}

.loading-pct {
  display: block;
  margin-top: 10px;
  color: var(--green-800, #2b4824);
  font: 700 12px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.04em;
}

.skeleton-fade-enter-active {
  transition: opacity var(--dur-base) var(--ease-out);
}

.skeleton-fade-leave-active {
  transition: opacity var(--dur-slow) var(--ease-out);
}

.skeleton-fade-enter-from,
.skeleton-fade-leave-to {
  opacity: 0;
}


/* =========================================================
   MASUK SETELAH MUAT: peta turun halus, kontrol menyusul
   ========================================================= */

.siteplan-page.is-ready .siteplan-container {
  animation: map-in 800ms var(--ease-out) backwards;
}

.siteplan-page.is-ready .siteplan-container :deep(.control-search) {
  animation: ctrl-in-top 560ms var(--ease-out) 300ms backwards;
}

.siteplan-page.is-ready .siteplan-container :deep(.right-controls-stack) {
  animation: ctrl-in-right 560ms var(--ease-out) 400ms backwards;
}

.siteplan-page.is-ready .siteplan-container :deep(.control-minimap) {
  animation: ctrl-in-bottom 560ms var(--ease-out) 500ms backwards;
}

@keyframes map-in {
  from { opacity: 0; transform: scale(1.05); }
}

/* Properti `translate` terpisah dari `transform` agar tidak menimpa posisi bawaan kontrol. */
@keyframes ctrl-in-top {
  from { opacity: 0; translate: 0 -14px; }
}

@keyframes ctrl-in-right {
  from { opacity: 0; translate: 16px 0; }
}

@keyframes ctrl-in-bottom {
  from { opacity: 0; translate: 0 14px; }
}

@media (prefers-reduced-motion: reduce) {
  .siteplan-page.is-ready .siteplan-container,
  .siteplan-page.is-ready .siteplan-container :deep(.control-search),
  .siteplan-page.is-ready .siteplan-container :deep(.right-controls-stack),
  .siteplan-page.is-ready .siteplan-container :deep(.control-minimap) {
    animation: none;
  }
}


/* =========================================================
   ERROR
   ========================================================= */

.siteplan-error {
  position: absolute;
  inset: 0;
  z-index: 5;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  overflow: hidden;
  background: linear-gradient(180deg, #fbf5e6 0%, var(--pl-paper, #f9f5ec) 100%);
}

.siteplan-error__body {
  position: relative;
  z-index: 2;
  max-width: 320px;
  padding-bottom: 10dvh;
  text-align: center;
}

.siteplan-error h2 {
  margin: 0;
  color: var(--text-primary, #252525);
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: 28px;
  line-height: 1.12;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.siteplan-error p {
  margin: 10px 0 22px;
  color: var(--text-secondary, #63636a);
  font-size: 15px;
  line-height: 1.5;
}


/* =========================================================
   RETRY BUTTON
   ========================================================= */

.retry-button {
  min-width: 160px;
  min-height: 48px;
  padding: 0 24px;
  border: none;
  border-radius: 14px;
  background: var(--poliland-green, #355a2c);
  color: #fff;
  font: 700 15px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  box-shadow: 0 10px 24px -10px rgba(53, 90, 44, 0.7);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-base) var(--ease-spring);
}

.retry-button:active {
  transform: scale(0.97);
}

.retry-button:focus-visible {
  outline: 3px solid var(--poliland-gold, #cba044);
  outline-offset: 3px;
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
