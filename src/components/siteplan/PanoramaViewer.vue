<template>
  <div class="panorama-viewer">
    <div ref="viewerContainer" class="viewer-container"></div>

    <!-- HUD: dua sudut atas saja, bagian tengah dibiarkan bebas untuk pemandangan -->
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

      <button
        class="hud-chip gyro-button"
        :class="{ active: gyroEnabled }"
        type="button"
        :aria-pressed="gyroEnabled"
        :aria-label="gyroEnabled ? 'Matikan giroskop' : 'Aktifkan giroskop'"
        :disabled="gyroBusy"
        @click="toggleGyro"
      >
        <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <circle cx="12" cy="12" r="7" stroke="currentColor" stroke-width="1.8" />
          <path d="M12 5V2M12 22V19M5 12H2M22 12H19" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          <circle cx="12" cy="12" r="2" fill="currentColor" />
        </svg>
        <span class="gyro-label">{{ gyroEnabled ? 'Giroskop aktif' : 'Giroskop' }}</span>
      </button>
    </div>

    <!-- Petunjuk singkat di bawah, hilang sendiri -->
    <Transition name="hint">
      <p v-if="hint" class="hint" role="status">{{ hint }}</p>
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
  gyroChange: [enabled: boolean]
}>()

const viewerContainer = ref<HTMLElement | null>(null)
let viewer: Viewer | null = null

const gyroEnabled = ref(false)
const gyroBusy = ref(false)
const hasError = ref(false)
const hint = ref('')

let hintTimer: number | undefined

function showHint(text: string, ms = 4000) {
  hint.value = text
  window.clearTimeout(hintTimer)
  hintTimer = window.setTimeout(() => { hint.value = '' }, ms)
}

function getGyro(): GyroscopePlugin | null {
  return viewer ? viewer.getPlugin<GyroscopePlugin>(GyroscopePlugin) : null
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
      defaultZoomLvl: 0,
      moveInertia: true,
      plugins: [[GyroscopePlugin, { touchmove: true, moveMode: 'smooth' }]],
    })

    viewer.addEventListener('ready', () => {
      emit('ready')
      showHint('Geser untuk melihat sekeliling')
    }, { once: true })

    viewer.addEventListener('panorama-error', () => {
      hasError.value = true
      emit('ready')
    })

    // Sumber kebenaran status giroskop adalah plugin, bukan tombol.
    getGyro()?.addEventListener('gyroscope-updated', (e) => {
      gyroEnabled.value = e.gyroscopeEnabled
      emit('gyroChange', e.gyroscopeEnabled)
    })
  } catch (error) {
    console.error('[PanoramaViewer] Failed:', error)
    hasError.value = true
    emit('ready')
  }
}

async function toggleGyro() {
  const gyro = getGyro()
  if (!gyro || gyroBusy.value) return

  if (gyro.isEnabled()) {
    gyro.stop()
    showHint('Giroskop dimatikan', 2200)
    return
  }

  gyroBusy.value = true
  try {
    if (!(await gyro.isSupported())) {
      showHint('Perangkat ini tidak punya sensor giroskop', 4500)
      return
    }
    await gyro.start('smooth')
    showHint('Gerakkan HP untuk melihat sekeliling', 3500)
  } catch (error) {
    console.error('[PanoramaViewer] Gyroscope error:', error)
    showHint('Izin sensor ditolak. Aktifkan lewat pengaturan perangkat', 5000)
  } finally {
    gyroBusy.value = false
  }
}

function stopGyro() {
  try { getGyro()?.stop() } catch { /* sudah berhenti */ }
}

function handleBack() {
  stopGyro()
  emit('back')
}

// Sensor dimatikan saat app ke latar agar tidak menguras baterai dan tidak loncat saat kembali.
function onVisibility() {
  if (document.hidden && gyroEnabled.value) stopGyro()
}

onMounted(() => {
  document.addEventListener('visibilitychange', onVisibility)
  createViewer()
})

onBeforeUnmount(() => {
  document.removeEventListener('visibilitychange', onVisibility)
  window.clearTimeout(hintTimer)
  stopGyro()
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

.gyro-button {
  flex: none;
  gap: 8px;
  padding: 0 14px;
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background 200ms var(--ease-out, ease-out), color 200ms var(--ease-out, ease-out), transform 140ms var(--ease-out, ease-out);
}
.gyro-button svg { width: 20px; height: 20px; flex: none; }
.gyro-button:active { transform: scale(0.95); }
.gyro-button:disabled { opacity: 0.7; }
.gyro-button.active {
  background: var(--poliland-gold, #CBA044);
  border-color: transparent;
  color: var(--ink, #1B1F1A);
}

.hint {
  position: absolute;
  z-index: 10;
  left: 50%;
  bottom: max(20px, env(safe-area-inset-bottom, 0px));
  max-width: calc(100% - 32px);
  margin: 0;
  padding: 10px 16px;
  transform: translateX(-50%);
  border-radius: 999px;
  background: rgba(27, 31, 26, 0.72);
  color: var(--on-forest, #F4F1E8);
  font-size: 13px;
  text-align: center;
  -webkit-backdrop-filter: blur(10px);
  backdrop-filter: blur(10px);
  pointer-events: none;
}
.hint-enter-active, .hint-leave-active {
  transition: opacity 240ms var(--ease-out, ease-out), translate 240ms var(--ease-out, ease-out);
}
.hint-enter-from, .hint-leave-to { opacity: 0; translate: 0 8px; }

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

/* Layar sempit: giroskop jadi ikon saja agar nama kavling tidak terpotong. */
@media (max-width: 380px) {
  .gyro-label { display: none; }
  .gyro-button { width: 44px; padding: 0; justify-content: center; }
}

/* Landscape: layar pendek, HUD dan petunjuk dipadatkan supaya pemandangan tetap luas. */
@media (orientation: landscape) and (max-height: 520px) {
  .hud { top: max(8px, env(safe-area-inset-top, 0px)); }
  .hud-chip { min-height: 40px; }
  .hud-back { width: 40px; height: 40px; }
  .hint { bottom: max(10px, env(safe-area-inset-bottom, 0px)); padding: 8px 14px; }
}

@media (prefers-reduced-motion: reduce) {
  .hint-enter-active, .hint-leave-active { transition: opacity 120ms linear; }
  .hint-enter-from, .hint-leave-to { translate: 0 0; }
}
</style>
