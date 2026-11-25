<template>
  <Teleport to="body">
    <Transition name="crop-fade">
      <div v-if="file" class="crop-backdrop" role="dialog" aria-modal="true" aria-labelledby="crop-title" @keydown.esc="emit('cancel')">
        <div class="crop-sheet">
          <h2 id="crop-title" class="crop-title">Sesuaikan foto</h2>

          <div
            ref="stage"
            class="crop-stage"
            @pointerdown="onPointerDown"
            @pointermove="onPointerMove"
            @pointerup="onPointerUp"
            @pointercancel="onPointerUp"
            @wheel.prevent="onWheel"
          >
            <img
              v-if="src"
              ref="img"
              :src="src"
              alt=""
              class="crop-img"
              draggable="false"
              :style="imgStyle"
              @load="onImageLoad"
            />
            <span class="crop-ring" aria-hidden="true" />
          </div>

          <div class="crop-zoom">
            <button type="button" class="zoom-btn" aria-label="Perkecil" :disabled="zoom <= 1" @click="setZoom(zoom - 0.25)">
              <ion-icon :icon="removeOutline" aria-hidden="true" />
            </button>
            <input
              class="zoom-range"
              type="range"
              min="1"
              max="4"
              step="0.01"
              :value="zoom"
              aria-label="Tingkat perbesaran"
              @input="setZoom(Number(($event.target as HTMLInputElement).value))"
            />
            <button type="button" class="zoom-btn" aria-label="Perbesar" :disabled="zoom >= 4" @click="setZoom(zoom + 0.25)">
              <ion-icon :icon="addOutline" aria-hidden="true" />
            </button>
          </div>

          <AppNotice v-if="error" tone="error">
            {{ error }}
          </AppNotice>

          <div class="crop-actions">
            <button type="button" class="crop-btn crop-btn--ghost" :disabled="busy" @click="emit('cancel')">Batal</button>
            <button type="button" class="crop-btn crop-btn--primary" :disabled="busy || !ready" @click="confirm">
              {{ busy ? 'Memproses...' : 'Terapkan' }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import AppNotice from '@/components/ui/AppNotice.vue'
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'
import { IonIcon } from '@ionic/vue'
import { addOutline, removeOutline } from 'ionicons/icons'

const props = defineProps<{ file: File | null }>()
const emit = defineEmits<{
  (e: 'confirm', file: File): void
  (e: 'cancel'): void
}>()

const OUTPUT_SIZE = 512
const MAX_ZOOM = 4

const stage = ref<HTMLElement | null>(null)
const img = ref<HTMLImageElement | null>(null)
const src = ref('')
const ready = ref(false)
const busy = ref(false)
const error = ref('')

const zoom = ref(1)
const tx = ref(0)
const ty = ref(0)
/* Ukuran harus reaktif: imgStyle dihitung sebelum foto dimuat, dan tanpa
   ref ia tetap memakai lebar 0 sampai zoom berubah (foto tampak hitam). */
const natW = ref(0)
const natH = ref(0)
const viewport = ref(0)
const pointers = new Map<number, { x: number; y: number }>()
let lastPinch = 0
let stageObserver: ResizeObserver | null = null

/** Skala dasar: sisi terpendek gambar pas memenuhi lingkaran. */
function baseScale() {
  return natW.value && natH.value && viewport.value ? viewport.value / Math.min(natW.value, natH.value) : 1
}
const scale = computed(() => baseScale() * zoom.value)

const imgStyle = computed(() => ({
  width: `${natW.value}px`,
  height: `${natH.value}px`,
  opacity: ready.value ? 1 : 0,
  transform: `translate(-50%, -50%) translate(${tx.value}px, ${ty.value}px) scale(${scale.value})`,
}))

function measureStage() {
  const w = stage.value?.clientWidth ?? 0
  if (w > 0) viewport.value = w
  clampOffset()
}

function clampOffset() {
  const s = baseScale() * zoom.value
  const maxX = Math.max(0, (natW.value * s - viewport.value) / 2)
  const maxY = Math.max(0, (natH.value * s - viewport.value) / 2)
  tx.value = Math.min(maxX, Math.max(-maxX, tx.value))
  ty.value = Math.min(maxY, Math.max(-maxY, ty.value))
}

function setZoom(next: number) {
  zoom.value = Math.min(MAX_ZOOM, Math.max(1, next))
  clampOffset()
}

function revoke() {
  if (src.value) URL.revokeObjectURL(src.value)
  src.value = ''
}

watch(
  () => props.file,
  (file) => {
    revoke()
    ready.value = false
    busy.value = false
    error.value = ''
    zoom.value = 1
    tx.value = 0
    ty.value = 0
    pointers.clear()
    document.documentElement.style.overflow = file ? 'hidden' : ''
    if (file) src.value = URL.createObjectURL(file)
  },
  { immediate: true },
)

async function onImageLoad() {
  await nextTick()
  const el = img.value
  if (!el || !stage.value) return
  natW.value = el.naturalWidth
  natH.value = el.naturalHeight
  measureStage()
  ready.value = natW.value > 0 && natH.value > 0
  if (!ready.value) error.value = 'Foto tidak dapat dibaca. Pilih foto lain.'
}

/* Lebar stage bisa berubah (rotasi layar, sheet baru masuk): ukur ulang. */
watch(stage, (el) => {
  stageObserver?.disconnect()
  stageObserver = null
  if (el && typeof ResizeObserver !== 'undefined') {
    stageObserver = new ResizeObserver(measureStage)
    stageObserver.observe(el)
  }
})

/* Gestur: satu jari menggeser, dua jari mencubit. */

function pinchDistance() {
  const [a, b] = [...pointers.values()]
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
}

function onPointerDown(e: PointerEvent) {
  ;(e.currentTarget as HTMLElement).setPointerCapture(e.pointerId)
  pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
  if (pointers.size === 2) lastPinch = pinchDistance()
}

function onPointerMove(e: PointerEvent) {
  const prev = pointers.get(e.pointerId)
  if (!prev || !ready.value) return
  const next = { x: e.clientX, y: e.clientY }
  pointers.set(e.pointerId, next)

  if (pointers.size === 1) {
    tx.value += next.x - prev.x
    ty.value += next.y - prev.y
    clampOffset()
  } else if (pointers.size === 2) {
    const dist = pinchDistance()
    if (lastPinch > 0 && dist > 0) setZoom(zoom.value * (dist / lastPinch))
    lastPinch = dist
  }
}

function onPointerUp(e: PointerEvent) {
  pointers.delete(e.pointerId)
  lastPinch = pinchDistance()
}

function onWheel(e: WheelEvent) {
  setZoom(zoom.value - e.deltaY * 0.0025)
}

function confirm() {
  const el = img.value
  const original = props.file
  if (!el || !original || !ready.value) return
  busy.value = true
  error.value = ''

  const s = scale.value
  const side = viewport.value / s
  const cx = natW.value / 2 - tx.value / s
  const cy = natH.value / 2 - ty.value / s

  const canvas = document.createElement('canvas')
  canvas.width = OUTPUT_SIZE
  canvas.height = OUTPUT_SIZE
  const ctx = canvas.getContext('2d')
  if (!ctx) {
    busy.value = false
    error.value = 'Peramban tidak mendukung pemotongan foto.'
    return
  }
  ctx.imageSmoothingQuality = 'high'
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE)
  ctx.drawImage(el, cx - side / 2, cy - side / 2, side, side, 0, 0, OUTPUT_SIZE, OUTPUT_SIZE)

  canvas.toBlob(
    (blob) => {
      busy.value = false
      if (!blob) {
        error.value = 'Foto gagal diproses. Coba lagi.'
        return
      }
      emit('confirm', new File([blob], 'avatar.jpg', { type: 'image/jpeg' }))
    },
    'image/jpeg',
    0.9,
  )
}

onBeforeUnmount(() => {
  stageObserver?.disconnect()
  revoke()
  document.documentElement.style.overflow = ''
})
</script>

<style scoped>
.crop-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30000;
  display: grid;
  place-items: end center;
  padding: 0 0 env(safe-area-inset-bottom, 0px);
  background: rgba(20, 32, 17, 0.72);
  overscroll-behavior: contain;
}

.crop-sheet {
  display: flex;
  width: min(100%, 440px);
  max-height: 100dvh;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px 20px calc(20px + env(safe-area-inset-bottom, 0px));
  border-radius: 24px 24px 0 0;
  background: var(--surface-forest, #243d1e);
  color: var(--on-forest, #f4f1e8);
  box-shadow: 0 -12px 40px rgba(0, 0, 0, 0.35);
}

.crop-title {
  margin: 0;
  font-family: var(--font-display, Georgia, serif);
  font-size: 22px;
  font-weight: 600;
  line-height: 1.2;
}

.crop-stage {
  position: relative;
  width: min(78vw, 320px);
  aspect-ratio: 1;
  overflow: hidden;
  border-radius: 20px;
  background: #101a0e;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  cursor: grab;
}

.crop-stage:active {
  cursor: grabbing;
}

.crop-img {
  position: absolute;
  top: 50%;
  left: 50%;
  max-width: none;
  transform-origin: center;
  pointer-events: none;
  will-change: transform;
}

/* Lingkaran penuntun; area di luarnya digelapkan. */
.crop-ring {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  box-shadow: 0 0 0 999px rgba(16, 26, 14, 0.62);
  outline: 2px solid var(--poliland-gold-soft, #f4d69a);
  outline-offset: -2px;
  pointer-events: none;
}

.crop-zoom {
  display: flex;
  width: min(78vw, 320px);
  align-items: center;
  gap: 8px;
}

.zoom-btn {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: rgba(244, 241, 232, 0.12);
  color: var(--on-forest, #f4f1e8);
  font-size: 20px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-fast, 160ms) var(--ease-spring, ease-out);
}

.zoom-btn:active:not(:disabled) {
  transform: scale(0.94);
}

.zoom-btn:disabled {
  opacity: 0.4;
}

.zoom-range {
  min-width: 0;
  flex: 1;
  height: 44px;
  accent-color: var(--poliland-gold, #cba044);
  touch-action: pan-y;
}

.crop-actions {
  display: grid;
  width: min(78vw, 320px);
  grid-template-columns: 1fr 1.4fr;
  gap: 10px;
}

.crop-btn {
  min-height: 48px;
  border: 0;
  border-radius: var(--radius-control, 12px);
  font-family: inherit;
  font-size: 15px;
  font-weight: 700;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
  transition: transform var(--dur-fast, 160ms) var(--ease-spring, ease-out);
}

.crop-btn:active:not(:disabled) {
  transform: scale(0.97);
}

.crop-btn:disabled {
  opacity: 0.55;
}

.crop-btn--primary {
  background: var(--poliland-gold, #cba044);
  color: var(--ink, #1b1f1a);
}

.crop-btn--ghost {
  background: rgba(244, 241, 232, 0.12);
  color: var(--on-forest, #f4f1e8);
}

.crop-btn:focus-visible,
.zoom-btn:focus-visible,
.zoom-range:focus-visible {
  outline: 3px solid var(--poliland-gold-soft, #f4d69a);
  outline-offset: 2px;
}

.crop-fade-enter-active,
.crop-fade-leave-active {
  transition: opacity var(--dur-base, 240ms) var(--ease-out, ease-out);
}

.crop-fade-enter-active .crop-sheet {
  transition: transform var(--dur-slow, 380ms) var(--ease-out, ease-out);
}

.crop-fade-enter-from,
.crop-fade-leave-to {
  opacity: 0;
}

.crop-fade-enter-from .crop-sheet {
  transform: translateY(32px);
}

@media (prefers-reduced-motion: reduce) {
  .crop-fade-enter-active .crop-sheet,
  .zoom-btn,
  .crop-btn {
    transition: none;
  }

  .crop-fade-enter-from .crop-sheet {
    transform: none;
  }
}
</style>
