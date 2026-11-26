<template>
  <div class="panorama-viewer">
    <div ref="viewerContainer" class="viewer-container"></div>

    <!-- HUD: nama kavling di atas, kontrol di bawah; tengah bebas untuk pemandangan -->
    <div class="hud">
      <div class="hud-chip lot-chip">
        <button class="hud-back" type="button" aria-label="Kembali" @click="handleBack">
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <path d="M15 18L9 12L15 6" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <div class="lot-info">
          <span class="lot-number">Kavling {{ lotNumber }}</span>
          <span class="lot-status">
            <span class="status-dot" :style="{ backgroundColor: statusColor }"></span>
            {{ status }}
          </span>
        </div>
      </div>
    </div>

    <div class="dock">
      <!-- Petunjuk singkat, hilang sendiri -->
      <Transition name="hint">
        <p v-if="hint" class="hint" role="status">{{ hint }}</p>
      </Transition>

      <div v-if="!hasError" class="dock-actions">
        <button
          class="hud-chip dock-button"
          :class="{ active: gyroEnabled }"
          type="button"
          :aria-pressed="gyroEnabled"
          :disabled="gyroBusy || !isReady"
          @click="toggle"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <rect x="7" y="3" width="10" height="18" rx="2.5" stroke="currentColor" stroke-width="1.8" />
            <path d="M3.5 9a8 8 0 0 0 0 6M20.5 9a8 8 0 0 1 0 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          </svg>
          <span>{{ gyroBusy ? 'Memeriksa sensor' : gyroEnabled ? 'Giroskop aktif' : 'Giroskop' }}</span>
        </button>

        <button
          class="hud-chip dock-button"
          type="button"
          :disabled="gyroBusy || !isReady"
          @click="recenter"
        >
          <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="1.8" />
            <path d="M12 5V2M12 22V19M5 12H2M22 12H19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
            <circle cx="12" cy="12" r="2" fill="currentColor" />
          </svg>
          <span>{{ gyroEnabled ? 'Kalibrasi' : 'Reset arah' }}</span>
        </button>
      </div>
    </div>

    <!-- Penjelasan sebelum dialog izin sistem -->
    <Transition name="prompt">
      <div v-if="askingPermission" class="prompt-layer" @click.self="askingPermission = false">
        <div class="prompt" role="dialog" aria-modal="true" aria-labelledby="gyro-prompt-title">
          <h2 id="gyro-prompt-title">Lihat sekeliling dengan menggerakkan HP</h2>
          <p>HP akan meminta izin sensor gerak. Datanya hanya dipakai untuk memutar foto.</p>
          <button type="button" class="prompt-primary" @click="allow">Izinkan sensor</button>
          <button type="button" class="prompt-secondary" @click="askingPermission = false">Pakai geser saja</button>
        </div>
      </div>
    </Transition>

    <div v-if="hasError" class="viewer-error" role="alert">
      <span class="viewer-error-icon" aria-hidden="true">!</span>
      <span>Gagal memuat panorama</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { Viewer } from '@photo-sphere-viewer/core'
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin'
import '@photo-sphere-viewer/core/index.css'
import { useGyroscope } from '@/composables/useGyroscope'
import { registerBackHandler } from '@/composables/useBackStack'

interface Props {
  panoramaUrl: string
  lotNumber: string
  status: string
  statusColor: string
}

const props = defineProps<Props>()

const emit = defineEmits<{
  back: []
  ready: []
  progress: [percent: number]
}>()

const viewerContainer = ref<HTMLElement | null>(null)
let viewer: Viewer | null = null
let releaseDrag: (() => void) | undefined

const isReady = ref(false)
const hasError = ref(false)
const hint = ref('')

let hintTimer: number | undefined

function showHint(text: string, ms = 4000) {
  hint.value = text
  window.clearTimeout(hintTimer)
  hintTimer = window.setTimeout(() => { hint.value = '' }, ms)
}

const {
  enabled: gyroEnabled,
  busy: gyroBusy,
  askingPermission,
  bind,
  toggle,
  allow,
  stop: stopGyro,
  recenter,
  pauseOnDrag,
} = useGyroscope(() => viewer, showHint)

const INTRO_ZOOM = 35

function playIntro() {
  if (!viewer) return
  if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
    viewer.zoom(0)
    return
  }
  // Menyambung transisi masuk: pandangan mundur perlahan dari dekat.
  viewer.animate({ zoom: 0, speed: 1100, easing: 'outCubic' })
}

function createViewer() {
  if (!viewerContainer.value) return

  if (!props.panoramaUrl) {
    hasError.value = true
    emit('ready')
    return
  }

  try {
    viewer = new Viewer({
      container: viewerContainer.value,
      panorama: props.panoramaUrl,
      navbar: false,
      loadingImg: undefined,
      loadingTxt: '',
      defaultZoomLvl: INTRO_ZOOM,
      moveInertia: true,
      plugins: [[GyroscopePlugin, { touchmove: false, moveMode: 'smooth' }]],
    })

    viewer.addEventListener('load-progress', (e) => emit('progress', Math.round(e.progress)))

    viewer.addEventListener('ready', () => {
      isReady.value = true
      emit('ready')
      playIntro()
      showHint('Geser untuk melihat sekeliling')
    }, { once: true })

    viewer.addEventListener('panorama-error', () => {
      hasError.value = true
      emit('ready')
    })

    bind()
    releaseDrag = pauseOnDrag(viewerContainer.value)
  } catch (error) {
    console.error('[PanoramaViewer] Failed:', error)
    hasError.value = true
    emit('ready')
  }
}

function handleBack() {
  stopGyro()
  emit('back')
}

// Sensor dimatikan saat app ke latar agar tidak menguras baterai dan tidak loncat saat kembali.
function onVisibility() {
  if (document.hidden && gyroEnabled.value) stopGyro()
}

// Back Android menutup kartu izin dulu, bukan langsung keluar dari 360°.
const releaseBack = registerBackHandler(() => {
  if (!askingPermission.value) return false
  askingPermission.value = false
  return true
})

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  createViewer()
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  window.clearTimeout(hintTimer)
  releaseDrag?.()
  releaseBack()
  stopGyro()
  // destroy() juga melepas tekstur WebGL panorama dari memori.
  try { viewer?.destroy() } catch { /* sudah dilepas */ }
  viewer = null
})
</script>

<style scoped>
.panorama-viewer {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #101510;
  touch-action: none;
  -webkit-user-select: none;
  user-select: none;
}

.viewer-container {
  position: absolute;
  inset: 0;
}

/* Satu-satunya loading ada di PanoramaPage. */
.viewer-container :deep(.psv-loader-container) {
  display: none;
}

/* HUD memakai inset aman di semua sisi, jadi tetap terbaca dan tidak tertutup notch saat HP diputar. */
.hud {
  position: absolute;
  z-index: 10;
  top: max(12px, env(safe-area-inset-top, 0px));
  right: max(12px, env(safe-area-inset-right, 0px));
  left: max(12px, env(safe-area-inset-left, 0px));
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  pointer-events: none;
}

.hud-chip {
  pointer-events: auto;
  display: flex;
  align-items: center;
  min-height: 44px;
  border: 1px solid rgba(244, 241, 232, 0.14);
  border-radius: 999px;
  background: rgba(27, 31, 26, 0.72);
  color: var(--on-forest, #F4F1E8);
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  box-shadow: 0 6px 18px rgba(0, 0, 0, 0.22);
}

.lot-chip {
  min-width: 0;
  padding-right: 16px;
}

.hud-back {
  flex: none;
  width: 44px;
  height: 44px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: inherit;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform 140ms var(--ease-out, ease-out);
}
.hud-back svg { width: 22px; height: 22px; }
.hud-back:active { transform: scale(0.92); }

.lot-info {
  display: flex;
  flex-direction: column;
  min-width: 0;
  line-height: 1.2;
}
.lot-number {
  font-size: 14px;
  font-weight: 700;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.lot-status {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 12px;
  color: var(--on-forest-muted, #B9C9B1);
  white-space: nowrap;
}
.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex: none;
  box-shadow: 0 0 0 2px rgba(244, 241, 232, 0.25);
}

.dock {
  position: absolute;
  z-index: 10;
  right: max(12px, env(safe-area-inset-right, 0px));
  bottom: max(16px, env(safe-area-inset-bottom, 0px));
  left: max(12px, env(safe-area-inset-left, 0px));
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  pointer-events: none;
}

.dock-actions {
  display: flex;
  justify-content: center;
  gap: 10px;
  width: 100%;
}

.dock-button {
  justify-content: center;
  gap: 8px;
  min-height: 48px;
  padding: 0 18px;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background 200ms var(--ease-out, ease-out), color 200ms var(--ease-out, ease-out), transform 140ms var(--ease-out, ease-out);
}
.dock-button svg { width: 20px; height: 20px; flex: none; }
.dock-button:active { transform: scale(0.97); }
.dock-button:disabled { opacity: 0.7; }
.dock-button.active {
  background: var(--poliland-gold, #CBA044);
  border-color: transparent;
  color: var(--ink, #1B1F1A);
}
.dock-button:focus-visible,
.hud-back:focus-visible,
.prompt button:focus-visible {
  outline: 3px solid var(--poliland-gold, #CBA044);
  outline-offset: 2px;
}

.hint {
  max-width: 100%;
  margin: 0;
  padding: 10px 16px;
  border-radius: 18px;
  background: rgba(27, 31, 26, 0.82);
  color: var(--on-forest, #F4F1E8);
  font-size: 13px;
  line-height: 1.4;
  text-align: center;
}
.hint-enter-active, .hint-leave-active {
  transition: opacity 240ms var(--ease-out, ease-out), translate 240ms var(--ease-out, ease-out);
}
.hint-enter-from, .hint-leave-to { opacity: 0; translate: 0 8px; }

.prompt-layer {
  position: absolute;
  z-index: 30;
  inset: 0;
  display: flex;
  align-items: flex-end;
  justify-content: center;
  padding: 16px 16px max(16px, env(safe-area-inset-bottom, 0px));
  background: rgba(16, 21, 16, 0.55);
}

.prompt {
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 100%;
  max-width: 400px;
  max-height: 100%;
  overflow-y: auto;
  padding: 22px 20px 14px;
  border-radius: 24px;
  background: var(--pl-paper, #F9F5EC);
  text-align: center;
}

.prompt h2 {
  margin: 0;
  color: var(--text-primary, #252525);
  font: 650 22px/1.2 var(--font-display, 'Fraunces Variable', Georgia, serif);
}

.prompt p {
  margin: 0 0 8px;
  color: var(--text-secondary, #5F5F66);
  font-size: 14px;
  line-height: 1.5;
}

.prompt button {
  min-height: 48px;
  border: 0;
  border-radius: 14px;
  font: 700 15px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.prompt button:active { transform: scale(0.97); }
.prompt-primary { background: var(--poliland-green, #355A2C); color: #fff; }
.prompt-secondary { background: transparent; color: var(--poliland-gold-text, #805708); }

.prompt-enter-active, .prompt-leave-active { transition: opacity 240ms var(--ease-out, ease-out); }
.prompt-enter-active .prompt, .prompt-leave-active .prompt { transition: transform 320ms var(--ease-drawer, ease-out); }
.prompt-enter-from, .prompt-leave-to { opacity: 0; }
.prompt-enter-from .prompt, .prompt-leave-to .prompt { transform: translateY(40px); }

.viewer-error {
  position: absolute;
  inset: 0;
  z-index: 20;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  background: rgba(16, 21, 16, 0.9);
  color: var(--on-forest, #F4F1E8);
  font-size: 15px;
}
.viewer-error-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: rgba(244, 241, 232, 0.12);
  font-weight: 800;
  font-size: 20px;
}

/* Layar sempit: dua tombol berbagi lebar. */
@media (max-width: 360px) {
  .dock-button { flex: 1; padding: 0 10px; }
}

/* Landscape: layar pendek, HUD dan petunjuk dipadatkan supaya pemandangan tetap luas. */
@media (orientation: landscape) and (max-height: 520px) {
  .hud { top: max(8px, env(safe-area-inset-top, 0px)); }
  .hud-back { width: 40px; height: 40px; }
  .dock { bottom: max(8px, env(safe-area-inset-bottom, 0px)); gap: 6px; }
  .dock-button { min-height: 44px; }
  .hint { padding: 8px 14px; }
}

@media (prefers-reduced-motion: reduce) {
  .hint-enter-active, .hint-leave-active,
  .prompt-enter-active, .prompt-leave-active { transition: opacity 120ms linear; }
  .prompt-enter-active .prompt, .prompt-leave-active .prompt { transition: none; }
  .hint-enter-from, .hint-leave-to { translate: 0 0; }
  .prompt-enter-from .prompt, .prompt-leave-to .prompt { transform: none; }
}
</style>
