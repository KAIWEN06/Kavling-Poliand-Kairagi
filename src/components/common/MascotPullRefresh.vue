<template>
  <Teleport to="body">
    <div
      class="pull-refresh"
      :class="{ visible: isVisible, ready: isReady, refreshing: isRefreshing }"
      :style="{ top: `${headerBottom}px`, height: `${pullDistance}px` }"
    >
      <!-- Loader berukuran tetap, turun dari garis bawah AppHeader mengikuti tarikan -->
      <div
        class="refresh-indicator"
        :style="{
          '--spread': `${spread}px`,
          '--hold': `${REFRESH_HOLD}px`,
          transform: `translateY(${indicatorOffset}px)`
        }"
      >
        <div class="loader-stack">
          <div class="window-loader">
            <span class="window w1"></span>
            <span class="window w2"></span>
            <span class="window w3"></span>
            <span class="window w4"></span>
          </div>
          <div class="loader-label">{{ isRefreshing ? 'MEMUAT' : isReady ? 'LEPASKAN' : '' }}</div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'

const MAX_PULL_DISTANCE = 140
const REFRESH_THRESHOLD = 80
const REFRESH_HOLD = 76 // tinggi ruang loading saat refresh berlangsung
const PULL_RESISTANCE = 0.5
const SPREAD_FACTOR = 0.32 // seberapa jauh kotak menjauh per px tarikan
const MIN_REFRESH_MS = 1200

const isVisible = ref(false)
const isReady = ref(false)
const isRefreshing = ref(false)
const pullDistance = ref(0)
const headerBottom = ref(0)

// Saat refreshing, kotak kembali ke posisi awal (spread 0) lalu berputar
const spread = computed(() => (isRefreshing.value ? 0 : pullDistance.value * SPREAD_FACTOR))

// Tarikan < HOLD : loader "turun" dari bawah header (terpotong di atas, makin terlihat)
// Tarikan > HOLD : loader tetap berada di tengah ruang kosong
const indicatorOffset = computed(() => {
  const pull = pullDistance.value
  return pull < REFRESH_HOLD ? pull - REFRESH_HOLD : (pull - REFRESH_HOLD) / 2
})

let tracking = false
let pulling = false
let startY = 0
let startX = 0
let scrollElement: HTMLElement | null = null
let contentElement: HTMLElement | null = null

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
    (document.querySelector('ion-header.app-header') as HTMLElement | null) ??
    (document.querySelector('.main-layout > ion-header') as HTMLElement | null) ??
    (activePage?.querySelector('ion-header') as HTMLElement | null)

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
  if (isRefreshing.value || tracking || event.touches.length !== 1) return

  // Jangan mengambil alih gesture dari overlay/modal yang memiliki
  // scroll container sendiri.
  if (isInsideExcludedOverlay(event.target)) return

  findContext()
  if (!isAtTop()) return

  const touch = event.touches[0]
  if (!touch) return

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
    return
  }

  const touch = event.touches[0]
  if (!touch) return

  const deltaY = touch.clientY - startY
  const deltaX = touch.clientX - startX

  if (!pulling) {
    if (deltaY <= 5 || Math.abs(deltaX) > Math.abs(deltaY)) {
      if (deltaY < -5) tracking = false
      return
    }
    if (!isAtTop()) {
      tracking = false
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
  if (!pulling) return
  pulling = false

  if (pullDistance.value >= REFRESH_THRESHOLD) await startRefresh()
  else await release()
}

async function handleTouchCancel() {
  tracking = false
  if (!pulling) return
  pulling = false
  await release()
}

async function startRefresh() {
  isRefreshing.value = true
  isReady.value = true

  const settle = animateTo(REFRESH_HOLD, 300)
  window.dispatchEvent(new CustomEvent('poliland:refresh'))
  await Promise.all([settle, wait(MIN_REFRESH_MS)])

  isRefreshing.value = false
  isReady.value = false
  await release()
}

function animateTo(target: number, duration: number) {
  return new Promise<void>(resolve => {
    const start = pullDistance.value
    const startTime = performance.now()

    function frame(now: number) {
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
  await animateTo(0, 380)
  pullDistance.value = 0
  isVisible.value = false
  isReady.value = false
  applyContentShift(0)
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

onMounted(() => {
  document.documentElement.style.overscrollBehaviorY = 'contain'
  document.body.style.overscrollBehaviorY = 'contain'

  document.addEventListener('touchstart', handleTouchStart, { passive: true })
  document.addEventListener('touchmove', handleTouchMove, { passive: false })
  document.addEventListener('touchend', handleTouchEnd, { passive: true })
  document.addEventListener('touchcancel', handleTouchCancel, { passive: true })
})

onUnmounted(() => {
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

.loader-stack {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
}

.window-loader {
  position: relative;
  width: 44px;
  height: 44px;
}

.window {
  position: absolute;
  width: 18px;
  height: 18px;
  border-radius: 5px;
  background: linear-gradient(145deg, #f8d76c, #d3a139);
  border: 2px solid #c18c28;
  box-shadow: inset 2px 2px 3px rgba(255, 255, 255, 0.4), 0 3px 7px rgba(130, 90, 20, 0.18);
  box-sizing: border-box;
  /* Saat ditarik: mengikuti jari dengan sedikit lag halus */
  transition: transform 0.12s linear;
}

.w1 { top: 4px;    left: 4px;  transform: translate(calc(var(--spread) * -1), calc(var(--spread) * -1)); }
.w2 { top: 4px;    right: 4px; transform: translate(var(--spread), calc(var(--spread) * -1)); }
.w3 { bottom: 4px; left: 4px;  transform: translate(calc(var(--spread) * -1), var(--spread)); }
.w4 { bottom: 4px; right: 4px; transform: translate(var(--spread), var(--spread)); }

.loader-label {
  height: 10px;
  font-size: 8px;
  line-height: 10px;
  font-weight: 800;
  letter-spacing: 1.8px;
  color: #9d762a;
  white-space: nowrap;
  opacity: 0;
  transition: opacity 0.2s ease;
}
.pull-refresh.ready .loader-label { opacity: 0.75; }

/* Saat refresh: kotak menyatu kembali dengan halus, lalu berputar */
.pull-refresh.refreshing .window {
  transition: transform 0.55s cubic-bezier(0.22, 1, 0.36, 1);
}
.pull-refresh.refreshing .window-loader {
  animation: loader-spin 1.2s cubic-bezier(0.65, 0, 0.35, 1) infinite;
}
.pull-refresh.refreshing .loader-label { opacity: 1; }
.pull-refresh.refreshing .loader-label::after {
  content: '...';
  animation: dots 1.2s steps(4, end) infinite;
}

@keyframes loader-spin {
  0%   { transform: rotate(0deg) scale(1); }
  50%  { transform: rotate(180deg) scale(0.9); }
  100% { transform: rotate(360deg) scale(1); }
}

@keyframes dots {
  0%   { content: ''; }
  25%  { content: '.'; }
  50%  { content: '..'; }
  75%, 100% { content: '...'; }
}

@media (prefers-reduced-motion: reduce) {
  .pull-refresh * {
    animation: none !important;
    transition: none !important;
  }
}
</style>