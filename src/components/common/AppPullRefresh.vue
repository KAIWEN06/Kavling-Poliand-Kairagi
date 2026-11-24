<template>
  <span ref="anchor" class="pr-anchor" hidden></span>
  <Teleport to="body">
    <div
      class="pull-refresh"
      :class="{ visible: isVisible, ready: isReady, refreshing: isRefreshing }"
      :style="{ '--header-bottom': `${headerBottom}px`, height: `${pullDistance}px` }"
    >
      <!-- Loader berukuran tetap, turun dari garis bawah AppHeader mengikuti tarikan -->
      <div
        class="refresh-indicator"
        :style="{
          '--hold': `${REFRESH_HOLD}px`,
          transform: `translateY(${indicatorOffset}px)`
        }"
      >
        <AppPullRefreshLoader :progress="progress" :refreshing="isRefreshing" />
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts">
// Dipakai bersama oleh semua instance (MainLayout memasang satu yang global, halaman memasang yang scoped).
// Tanpa koordinasi ini, satu gestur ditangkap dua instance sehingga loader muncul ganda.
const scopedPageChecks = new Set<() => boolean>()
let gestureOwner: symbol | null = null
</script>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import AppPullRefreshLoader from '@/components/common/AppPullRefreshLoader.vue'

const props = withDefaults(
  defineProps<{
    /** Hanya aktif bila halaman pemilik komponen ini sedang tampil (untuk halaman yang di-cache Ionic) */
    scoped?: boolean
    /** Dipanggil saat refresh; loader tetap tampil sampai Promise selesai (minimal MIN_REFRESH_MS) */
    refreshHandler?: () => unknown
  }>(),
  { scoped: false, refreshHandler: undefined }
)

const anchor = ref<HTMLElement | null>(null)

const MAX_PULL_DISTANCE = 140
const REFRESH_THRESHOLD = 80
const REFRESH_HOLD = 76 // tinggi ruang loading saat refresh berlangsung
const PULL_RESISTANCE = 0.5
const MIN_REFRESH_MS = 1200
const MAX_WAIT_COMPLETE_MS = 5000 // batas aman bila halaman tidak mengirim 'poliland:refresh-complete'

const isVisible = ref(false)
const isReady = ref(false)
const isRefreshing = ref(false)
const pullDistance = ref(0)
const headerBottom = ref(0)

const progress = computed(() => Math.min(1, pullDistance.value / REFRESH_THRESHOLD))

// Halaman interaktif yang gesturnya tidak boleh diganggu pull-to-refresh
const route = useRoute()
const EXCLUDED_PATHS = ['/panorama', '/siteplan', '/admin/siteplan', '/kepala-marketing/siteplan', '/login', '/register', '/splash', '/welcome']
function isExcludedRoute() {
  const path = route.path
  return EXCLUDED_PATHS.some(p => path === p || path.startsWith(`${p}/`))
}

// Tarikan < HOLD : loader "turun" dari bawah header (terpotong di atas, makin terlihat)
// Tarikan > HOLD : loader tetap berada di tengah ruang kosong
const indicatorOffset = computed(() => {
  const pull = pullDistance.value
  return pull < REFRESH_HOLD ? pull - REFRESH_HOLD : (pull - REFRESH_HOLD) / 2
})

const instanceId = Symbol('pull-refresh')
let tracking = false
let pulling = false
let releasing = false
let animationToken = 0
let startY = 0
let startX = 0
let scrollElement: HTMLElement | null = null
let contentElement: HTMLElement | null = null

function claimGesture() {
  if (gestureOwner && gestureOwner !== instanceId) return false
  gestureOwner = instanceId
  return true
}

function freeGesture() {
  if (gestureOwner === instanceId) gestureOwner = null
}

function activePageElement() {
  return Array.from(document.querySelectorAll<HTMLElement>('.ion-page'))
    .filter(p => !p.classList.contains('ion-page-hidden') && !p.classList.contains('ion-page-invisible'))
    .pop() ?? null
}

function isOwnPageActive() {
  const own = anchor.value?.closest('.ion-page')
  return !!own && own === activePageElement()
}

function isInsideExcludedOverlay(target: EventTarget | null) {
  if (!(target instanceof Element)) return false

  // Pull-to-refresh hanya boleh bekerja pada halaman utama.
  // DetailPanel memiliki scroll container sendiri, jadi gesture di dalamnya
  // tidak boleh dianggap sebagai pull-to-refresh halaman.
  if (target.closest('.detail-panel')) return true
  if (target.closest('ion-modal')) return true
  if (
    target.closest(
      '.search-wrapper, .search-results, .search-empty, .search-filter-overlay'
    )
  ) return true

  return false
}

function findContext() {
  const pages = Array.from(document.querySelectorAll<HTMLElement>('.ion-page'))
  const activePage = pages
    .filter(p => !p.classList.contains('ion-page-hidden') && !p.classList.contains('ion-page-invisible'))
    .pop()

  const content = (activePage?.querySelector('ion-content') as HTMLElement | null) ?? null
  contentElement = content
  scrollElement = content
    ? ((content.shadowRoot?.querySelector('.inner-scroll') as HTMLElement | null) ?? content)
    : null

  // Batas bawah AppHeader: ruang loading dimulai tepat dari garis ini ke bawah.
  // AppHeader ada di MainLayout (bukan di dalam halaman aktif), jadi dicari secara global.
  const header =
    (activePage?.querySelector('ion-header') as HTMLElement | null) ??
    (document.querySelector('ion-header.app-header') as HTMLElement | null) ??
    (document.querySelector('.main-layout > ion-header') as HTMLElement | null)

  if (header) {
    headerBottom.value = Math.max(0, header.getBoundingClientRect().bottom)
  } else {
    // Cadangan: awal area konten di MainLayout
    const container = document.querySelector('.content-container') as HTMLElement | null
    headerBottom.value = container ? Math.max(0, container.getBoundingClientRect().top) : 68
  }
}

function isAtTop() {
  if (scrollElement) return scrollElement.scrollTop <= 1
  return window.scrollY <= 1
}

// Konten halaman didorong ke bawah sejauh jarak tarikan
function applyContentShift(distance: number) {
  if (!contentElement) return
  contentElement.style.transform = distance > 0 ? `translate3d(0, ${distance}px, 0)` : ''
  contentElement.style.willChange = distance > 0 ? 'transform' : ''
}

function updatePull(distance: number) {
  pullDistance.value = Math.max(0, Math.min(distance, MAX_PULL_DISTANCE))
  isVisible.value = pullDistance.value > 0
  if (!isRefreshing.value) isReady.value = pullDistance.value >= REFRESH_THRESHOLD
  applyContentShift(pullDistance.value)
}

function handleTouchStart(event: TouchEvent) {
  if (isRefreshing.value || releasing || tracking || event.touches.length !== 1) return
  if (gestureOwner && gestureOwner !== instanceId) return
  if (isExcludedRoute()) return
  if (props.scoped && !isOwnPageActive()) return
  // Instance global mengalah bila halaman aktif punya instance scoped sendiri
  if (!props.scoped && Array.from(scopedPageChecks).some(check => check())) return

  // Jangan mengambil alih gesture dari overlay/modal yang memiliki
  // scroll container sendiri.
  if (isInsideExcludedOverlay(event.target)) return

  findContext()
  if (!isAtTop()) return

  const touch = event.touches[0]
  if (!touch) return
  if (!claimGesture()) return

  startY = touch.clientY
  startX = touch.clientX
  tracking = true
}

function handleTouchMove(event: TouchEvent) {
  if (!tracking || isRefreshing.value) return

  // Safety guard: bila gesture berpindah ke overlay, batalkan tracking.
  if (isInsideExcludedOverlay(event.target)) {
    tracking = false
    pulling = false
    freeGesture()
    return
  }

  const touch = event.touches[0]
  if (!touch) return

  const deltaY = touch.clientY - startY
  const deltaX = touch.clientX - startX

  if (!pulling) {
    if (deltaY <= 5 || Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaY < -5) {
        tracking = false
        freeGesture()
      }
      return
    }
    if (!isAtTop()) {
      tracking = false
      freeGesture()
      return
    }
    pulling = true
    startY = touch.clientY
    startX = touch.clientX
  }

  updatePull(Math.max(0, (touch.clientY - startY) * PULL_RESISTANCE))

  if (event.cancelable) event.preventDefault()
}

async function handleTouchEnd() {
  tracking = false
  if (!pulling) {
    freeGesture()
    return
  }
  pulling = false

  if (pullDistance.value >= REFRESH_THRESHOLD) await startRefresh()
  else await release()
}

async function handleTouchCancel() {
  tracking = false
  if (!pulling) {
    freeGesture()
    return
  }
  pulling = false
  await release()
}

async function startRefresh() {
  isRefreshing.value = true
  isReady.value = true

  const settle = animateTo(REFRESH_HOLD, 300)
  let task: Promise<unknown> = Promise.resolve()
  if (props.refreshHandler) {
    task = Promise.resolve()
      .then(() => props.refreshHandler?.())
      .catch(error => console.error('Gagal memuat ulang data:', error))
  } else {
    // Halaman yang mendengarkan 'poliland:refresh' wajib mengirim 'poliland:refresh-complete'
    // saat selesai. Dengan menunggu sinyal itu, loader tarik-segarkan berakhir BERSAMAAN dengan
    // skeleton halaman (tidak ada skeleton yang muncul setelah loader hilang = tanpa flicker).
    task = new Promise<void>(resolve => {
      const done = () => {
        window.removeEventListener('poliland:refresh-complete', done)
        window.clearTimeout(timer)
        resolve()
      }
      const timer = window.setTimeout(done, MAX_WAIT_COMPLETE_MS)
      window.addEventListener('poliland:refresh-complete', done, { once: true })
    })
    window.dispatchEvent(new CustomEvent('poliland:refresh'))
  }
  await Promise.all([settle, wait(MIN_REFRESH_MS), task])

  isRefreshing.value = false
  isReady.value = false
  await release()
}

function animateTo(target: number, duration: number) {
  const token = ++animationToken
  return new Promise<void>(resolve => {
    const start = pullDistance.value
    const startTime = performance.now()

    function frame(now: number) {
      if (token !== animationToken) {
        resolve()
        return
      }
      const progress = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      updatePull(start + (target - start) * eased)

      if (progress < 1) requestAnimationFrame(frame)
      else resolve()
    }

    requestAnimationFrame(frame)
  })
}

async function release() {
  releasing = true
  try {
    await animateTo(0, 380)
  } finally {
    pullDistance.value = 0
    isVisible.value = false
    isReady.value = false
    applyContentShift(0)
    releasing = false
    freeGesture()
  }
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

onMounted(() => {
  if (props.scoped) scopedPageChecks.add(isOwnPageActive)
  document.documentElement.style.overscrollBehaviorY = 'contain'
  document.body.style.overscrollBehaviorY = 'contain'

  document.addEventListener('touchstart', handleTouchStart, { passive: true })
  document.addEventListener('touchmove', handleTouchMove, { passive: false })
  document.addEventListener('touchend', handleTouchEnd, { passive: true })
  document.addEventListener('touchcancel', handleTouchCancel, { passive: true })
})

onUnmounted(() => {
  scopedPageChecks.delete(isOwnPageActive)
  freeGesture()
  document.removeEventListener('touchstart', handleTouchStart)
  document.removeEventListener('touchmove', handleTouchMove)
  document.removeEventListener('touchend', handleTouchEnd)
  document.removeEventListener('touchcancel', handleTouchCancel)

  document.documentElement.style.overscrollBehaviorY = ''
  document.body.style.overscrollBehaviorY = ''

  applyContentShift(0)
})
</script>

<style scoped>
/* Menempel tepat di bawah AppHeader. Tingginya = jarak tarikan, sehingga
   ruang kosong yang terbuka langsung terisi (tidak ada layar putih). */
.pull-refresh {
  position: fixed;
  top: max(var(--header-bottom, 0px), env(safe-area-inset-top, 0px));
  left: 0;
  width: 100vw;
  z-index: 10;
  pointer-events: none;
  overflow: hidden;
  opacity: 0;
  visibility: hidden;
  /* Warna sama dengan AppHeader supaya terasa menyatu */
  background: linear-gradient(180deg, #ffffff 0%, #ffffff 100%);
  box-sizing: border-box;
}
.pull-refresh.visible {
  opacity: 1;
  visibility: visible;
}

/* Ukuran tetap; bergeser turun dari bawah header lewat translateY */
.refresh-indicator {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: var(--hold);
  display: flex;
  align-items: center;
  justify-content: center;
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .pull-refresh,
  .refresh-indicator {
    transition: none !important;
  }
}
</style>