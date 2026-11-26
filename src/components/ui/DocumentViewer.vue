<template>
  <section class="doc-viewer" aria-label="Penampil dokumen">
    <!-- Header: info dokumen -->
    <header class="doc-viewer__header">
      <div class="doc-viewer__title">
        <strong>{{ fileName || 'Dokumen' }}</strong>
        <span v-if="subtitle">{{ subtitle }}</span>
      </div>
      <button type="button" class="doc-viewer__icon-btn doc-viewer__icon-btn--on-dark" aria-label="Tutup dokumen" @click="emit('close')">
        <ion-icon :icon="closeOutline" aria-hidden="true" />
      </button>
    </header>

    <!-- Kanvas: tidak ada kontrol di atasnya -->
    <div
      ref="canvasRef"
      class="doc-viewer__canvas"
      :class="{ 'doc-viewer__canvas--interactive': mode === 'image' && imageReady }"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerUp"
      @pointercancel="onPointerUp"
      @contextmenu.prevent
    >
      <div v-if="loading || (mode === 'image' && !imageReady && !imageFailed && url)" class="doc-viewer__state" role="status">
        <ion-spinner name="crescent" />
        <span>Memuat dokumen</span>
      </div>

      <div v-else-if="error || imageFailed" class="doc-viewer__state" role="alert">
        <ion-icon :icon="alertCircleOutline" aria-hidden="true" />
        <strong>Dokumen tidak bisa dibuka</strong>
        <span>{{ error || 'Berkas rusak atau tautannya sudah kedaluwarsa.' }}</span>
        <button v-if="canRetry" type="button" class="doc-viewer__btn" @click="emit('retry')">
          <ion-icon :icon="refreshOutline" aria-hidden="true" />
          Coba lagi
        </button>
      </div>

      <div v-else-if="!url" class="doc-viewer__state">
        <ion-icon :icon="documentOutline" aria-hidden="true" />
        <strong>Belum ada berkas</strong>
        <span>Dokumen ini belum diunggah.</span>
      </div>

      <div v-else-if="mode === 'pdf'" class="doc-viewer__state">
        <ion-icon :icon="documentTextOutline" aria-hidden="true" />
        <strong>Berkas PDF</strong>
        <span>PDF dibuka di aplikasi pembaca bawaan perangkat agar teksnya jelas.</span>
        <a class="doc-viewer__btn" :href="url" target="_blank" rel="noopener noreferrer">
          <ion-icon :icon="openOutline" aria-hidden="true" />
          Buka PDF
        </a>
      </div>

      <div v-else-if="mode === 'other'" class="doc-viewer__state">
        <ion-icon :icon="documentOutline" aria-hidden="true" />
        <strong>Format tidak bisa dipratinjau</strong>
        <span>Unduh berkas untuk membukanya.</span>
      </div>

      <!-- Gambar -->
      <img
        v-if="mode === 'image' && url && !error && !imageFailed"
        ref="imgRef"
        class="doc-viewer__img"
        :class="{ 'doc-viewer__img--animate': animating }"
        :style="imgStyle"
        :src="url"
        :alt="fileName || 'Dokumen'"
        draggable="false"
        @load="onImageLoad"
        @error="onImageError"
      />
    </div>

    <!-- Toolbar: di luar kanvas -->
    <footer class="doc-viewer__toolbar">
      <div v-if="mode === 'image' && imageReady" class="doc-viewer__zoom" role="group" aria-label="Perbesar">
        <button type="button" class="doc-viewer__icon-btn" aria-label="Perkecil" :disabled="scale <= MIN_SCALE" @click="zoomBy(1 / ZOOM_STEP)">
          <ion-icon :icon="removeOutline" aria-hidden="true" />
        </button>
        <button type="button" class="doc-viewer__percent" aria-label="Kembalikan ke ukuran pas" @click="resetZoom">
          {{ percent }}%
        </button>
        <button type="button" class="doc-viewer__icon-btn" aria-label="Perbesar" :disabled="scale >= MAX_SCALE" @click="zoomBy(ZOOM_STEP)">
          <ion-icon :icon="addOutline" aria-hidden="true" />
        </button>
      </div>
      <span v-else class="doc-viewer__hint">{{ hintText }}</span>

      <button type="button" class="doc-viewer__btn doc-viewer__btn--primary" :disabled="!url || downloading" @click="download">
        <ion-spinner v-if="downloading" name="crescent" />
        <ion-icon v-else :icon="downloadOutline" aria-hidden="true" />
        Unduh
      </button>
    </footer>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { IonIcon, IonSpinner } from '@ionic/vue'
import {
  addOutline,
  alertCircleOutline,
  closeOutline,
  documentOutline,
  documentTextOutline,
  downloadOutline,
  openOutline,
  refreshOutline,
  removeOutline,
} from 'ionicons/icons'

const props = withDefaults(
  defineProps<{
    /** URL file (signed URL atau publik). Kosong = state "belum ada berkas". */
    url?: string
    fileName?: string
    mimeType?: string | null
    subtitle?: string
    loading?: boolean
    error?: string
    canRetry?: boolean
  }>(),
  { url: '', fileName: '', mimeType: null, subtitle: '', loading: false, error: '', canRetry: true },
)

const emit = defineEmits<{ (e: 'close'): void; (e: 'retry'): void }>()

/* ---------- Konfigurasi gerak (satu tempat) ---------- */
const MIN_SCALE = 1 // 100% = pas di kanvas
const MAX_SCALE = 5
const ZOOM_STEP = 1.5
const DOUBLE_TAP_SCALE = 2.5
const DOUBLE_TAP_MS = 300
const DOUBLE_TAP_SLOP = 28 // px
const TAP_MOVE_SLOP = 8 // px, di bawah ini dianggap tap, bukan geser

type Pt = { x: number; y: number }

const canvasRef = ref<HTMLDivElement | null>(null)
const imgRef = ref<HTMLImageElement | null>(null)
const imageReady = ref(false)
const imageFailed = ref(false)
const downloading = ref(false)
const animating = ref(false)

// ukuran gambar saat pas (px) dan transformasi
const fitW = ref(0)
const fitH = ref(0)
const scale = ref(1)
const tx = ref(0)
const ty = ref(0)

const mode = computed<'image' | 'pdf' | 'other'>(() => {
  const name = (props.fileName || props.url.split('?')[0]).toLowerCase()
  const mime = (props.mimeType || '').toLowerCase()
  if (mime === 'application/pdf' || name.endsWith('.pdf')) return 'pdf'
  if (mime.startsWith('image/') || /\.(jpe?g|png|webp|gif|avif)$/.test(name)) return 'image'
  return props.url ? 'image' : 'other'
})

const percent = computed(() => Math.round(scale.value * 100))
const hintText = computed(() => (mode.value === 'pdf' ? 'PDF' : ''))

const imgStyle = computed(() => ({
  width: `${fitW.value}px`,
  height: `${fitH.value}px`,
  transform: `translate3d(${tx.value}px, ${ty.value}px, 0) scale(${scale.value})`,
}))

/* ---------- Geometri ---------- */
function canvasSize() {
  const el = canvasRef.value
  return { w: el?.clientWidth ?? 0, h: el?.clientHeight ?? 0 }
}

function clampPan() {
  const { w: cw, h: ch } = canvasSize()
  const sw = fitW.value * scale.value
  const sh = fitH.value * scale.value
  tx.value = sw <= cw ? (cw - sw) / 2 : Math.min(0, Math.max(cw - sw, tx.value))
  ty.value = sh <= ch ? (ch - sh) / 2 : Math.min(0, Math.max(ch - sh, ty.value))
}

function computeFit() {
  const img = imgRef.value
  const { w: cw, h: ch } = canvasSize()
  if (!img || !img.naturalWidth || !cw || !ch) return
  const r = Math.min(cw / img.naturalWidth, ch / img.naturalHeight)
  fitW.value = img.naturalWidth * r
  fitH.value = img.naturalHeight * r
  clampPan()
}

function zoomAt(next: number, px: number, py: number) {
  const target = Math.min(MAX_SCALE, Math.max(MIN_SCALE, next))
  const ratio = target / scale.value
  tx.value = px - (px - tx.value) * ratio
  ty.value = py - (py - ty.value) * ratio
  scale.value = target
  clampPan()
}

function animate(fn: () => void) {
  animating.value = !window.matchMedia('(prefers-reduced-motion: reduce)').matches
  fn()
  window.setTimeout(() => (animating.value = false), 220)
}

function zoomBy(factor: number) {
  const { w, h } = canvasSize()
  animate(() => zoomAt(scale.value * factor, w / 2, h / 2))
}

function resetZoom() {
  animate(() => {
    scale.value = MIN_SCALE
    clampPan()
  })
}

/* ---------- Gesture: 1 jari = geser, 2 jari = cubit, double-tap = zoom ---------- */
const pointers = new Map<number, Pt>()
let lastPan: Pt | null = null
let pinchDist = 0
let tapStart: Pt | null = null
let tapMoved = false
let lastTap: { t: number; p: Pt } | null = null

function local(e: PointerEvent): Pt {
  const r = canvasRef.value!.getBoundingClientRect()
  return { x: e.clientX - r.left, y: e.clientY - r.top }
}

function dist(a: Pt, b: Pt) {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

function onPointerDown(e: PointerEvent) {
  if (mode.value !== 'image' || !imageReady.value) return
  canvasRef.value?.setPointerCapture(e.pointerId)
  const p = local(e)
  pointers.set(e.pointerId, p)
  animating.value = false
  if (pointers.size === 1) {
    lastPan = p
    tapStart = p
    tapMoved = false
  } else if (pointers.size === 2) {
    const [a, b] = [...pointers.values()]
    pinchDist = dist(a, b)
    tapMoved = true
    lastTap = null
  }
}

function onPointerMove(e: PointerEvent) {
  if (!pointers.has(e.pointerId)) return
  const p = local(e)
  pointers.set(e.pointerId, p)

  if (pointers.size >= 2) {
    const [a, b] = [...pointers.values()]
    const d = dist(a, b)
    if (pinchDist > 0) zoomAt(scale.value * (d / pinchDist), (a.x + b.x) / 2, (a.y + b.y) / 2)
    pinchDist = d
    return
  }

  if (tapStart && dist(tapStart, p) > TAP_MOVE_SLOP) tapMoved = true
  if (lastPan) {
    tx.value += p.x - lastPan.x
    ty.value += p.y - lastPan.y
    clampPan()
  }
  lastPan = p
}

function onPointerUp(e: PointerEvent) {
  if (!pointers.has(e.pointerId)) return
  const p = local(e)
  pointers.delete(e.pointerId)

  if (pointers.size === 1) {
    // dari cubit kembali ke geser tanpa lompat
    lastPan = [...pointers.values()][0]
    pinchDist = 0
    return
  }
  if (pointers.size > 0) return

  lastPan = null
  pinchDist = 0
  if (e.type === 'pointercancel' || tapMoved) return

  const now = performance.now()
  if (lastTap && now - lastTap.t < DOUBLE_TAP_MS && dist(lastTap.p, p) < DOUBLE_TAP_SLOP) {
    lastTap = null
    animate(() => (scale.value > MIN_SCALE * 1.05 ? ((scale.value = MIN_SCALE), clampPan()) : zoomAt(DOUBLE_TAP_SCALE, p.x, p.y)))
  } else {
    lastTap = { t: now, p }
  }
}

/* ---------- Gambar ---------- */
function onImageLoad() {
  imageReady.value = true
  scale.value = MIN_SCALE
  computeFit()
}

function onImageError() {
  imageFailed.value = true
  imageReady.value = false
}

/* ---------- Unduh berkas asli ---------- */
async function download() {
  if (!props.url) return
  downloading.value = true
  try {
    const res = await fetch(props.url)
    if (!res.ok) throw new Error(String(res.status))
    const blob = await res.blob()
    const href = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = href
    a.download = props.fileName || 'dokumen'
    document.body.appendChild(a)
    a.click()
    a.remove()
    window.setTimeout(() => URL.revokeObjectURL(href), 4000)
  } catch {
    // Server tanpa CORS atau jaringan putus: buka berkas asli di tab baru.
    window.open(props.url, '_blank', 'noopener')
  } finally {
    downloading.value = false
  }
}

/* ---------- Siklus hidup ---------- */
let observer: ResizeObserver | null = null

onMounted(() => {
  if (canvasRef.value && 'ResizeObserver' in window) {
    observer = new ResizeObserver(() => {
      if (imageReady.value) computeFit()
    })
    observer.observe(canvasRef.value)
  }
})

onBeforeUnmount(() => observer?.disconnect())

watch(
  () => props.url,
  () => {
    imageReady.value = false
    imageFailed.value = false
    scale.value = MIN_SCALE
    tx.value = 0
    ty.value = 0
    pointers.clear()
  },
)
</script>

<style scoped>
/* Semua nilai desain viewer ada di blok ini. */
.doc-viewer {
  --dv-header-bg: var(--poliland-green, #355A2C);
  --dv-header-fg: var(--on-forest, #F4F1E8);
  --dv-canvas-bg: #14170f;
  --dv-canvas-fg: #F4F1E8; /* 15:1 di atas kanvas */
  --dv-toolbar-bg: var(--pl-paper, #F9F5EC);
  --dv-toolbar-fg: var(--ink, #1B1F1A);
  --dv-accent: var(--poliland-gold, #CBA044);
  --dv-accent-fg: var(--ink, #1B1F1A);
  --dv-line: var(--border-default, #EAE7E0);
  --dv-tap: 44px;
  --dv-gap: 12px;
  --dv-radius: var(--radius-control, 12px);
  --dv-ease: var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1));

  display: flex;
  flex-direction: column;
  height: 100dvh;
  min-height: 100vh; /* cadangan browser lama */
  min-height: 100dvh;
  background: var(--dv-canvas-bg);
  overscroll-behavior: none;
  -webkit-tap-highlight-color: transparent;
}

.doc-viewer__header {
  flex: none;
  display: flex;
  align-items: center;
  gap: var(--dv-gap);
  padding: calc(var(--safe-top) + 8px) calc(var(--dv-gap) + var(--safe-right)) 8px calc(16px + var(--safe-left));
  background: var(--dv-header-bg);
  color: var(--dv-header-fg);
}

.doc-viewer__title {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.doc-viewer__title strong {
  font-size: 15px;
  font-weight: 700;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.doc-viewer__title span {
  font-size: 12px;
  opacity: 0.88;
}

.doc-viewer__canvas {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow: hidden;
  color: var(--dv-canvas-fg);
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.doc-viewer__canvas--interactive {
  touch-action: none; /* jari milik kanvas: tanpa scroll halaman atau pull-to-refresh */
  cursor: grab;
}

.doc-viewer__img {
  position: absolute;
  top: 0;
  left: 0;
  max-width: none;
  transform-origin: 0 0;
  will-change: transform;
  pointer-events: none;
  -webkit-user-drag: none;
}

.doc-viewer__img--animate {
  transition: transform 200ms var(--dv-ease);
}

.doc-viewer__state {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 24px;
  text-align: center;
  font-size: 14px;
}

.doc-viewer__state ion-icon {
  font-size: 44px;
  color: var(--poliland-gold-soft, #F4D69A);
}

.doc-viewer__state strong {
  font-size: 16px;
}

.doc-viewer__state span {
  max-width: 28ch;
  opacity: 0.88;
}

.doc-viewer__state ion-spinner {
  color: var(--poliland-gold-soft, #F4D69A);
}

.doc-viewer__toolbar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--dv-gap);
  padding: 8px calc(var(--dv-gap) + var(--safe-right)) calc(8px + var(--safe-bottom)) calc(var(--dv-gap) + var(--safe-left));
  background: var(--dv-toolbar-bg);
  border-top: 1px solid var(--dv-line);
  color: var(--dv-toolbar-fg);
}

.doc-viewer__zoom {
  display: flex;
  align-items: center;
  gap: 4px;
}

.doc-viewer__hint {
  font-size: 13px;
  font-weight: 600;
  color: var(--text-secondary, #5F5F66);
}

.doc-viewer__icon-btn,
.doc-viewer__percent,
.doc-viewer__btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-width: var(--dv-tap);
  min-height: var(--dv-tap);
  border: 0;
  border-radius: var(--dv-radius);
  background: transparent;
  color: var(--poliland-green, #355A2C);
  font: inherit;
  font-weight: 700;
  text-decoration: none;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  transition: transform 120ms var(--dv-ease), background-color 120ms var(--dv-ease);
}

.doc-viewer__icon-btn ion-icon {
  font-size: 24px;
}

.doc-viewer__icon-btn--on-dark {
  color: var(--dv-header-fg);
}

.doc-viewer__percent {
  min-width: 64px;
  font-size: 15px;
  font-variant-numeric: tabular-nums;
  color: var(--dv-toolbar-fg);
}

.doc-viewer__btn {
  padding: 0 18px;
  font-size: 15px;
  background: var(--dv-line);
}

.doc-viewer__state .doc-viewer__btn {
  margin-top: 6px;
  background: var(--dv-accent);
  color: var(--dv-accent-fg);
}

.doc-viewer__btn--primary {
  background: var(--dv-accent);
  color: var(--dv-accent-fg);
}

.doc-viewer__btn ion-icon {
  font-size: 20px;
}

.doc-viewer__btn ion-spinner {
  width: 20px;
  height: 20px;
}

.doc-viewer button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.doc-viewer button:active:not(:disabled),
.doc-viewer a:active {
  transform: scale(0.97);
}

.doc-viewer button:focus-visible,
.doc-viewer a:focus-visible {
  outline: 3px solid var(--poliland-gold, #CBA044);
  outline-offset: 2px;
}

@media (hover: hover) and (pointer: fine) {
  .doc-viewer__icon-btn:hover:not(:disabled),
  .doc-viewer__percent:hover {
    background: rgba(53, 90, 44, 0.1);
  }
}

@media (prefers-reduced-motion: reduce) {
  .doc-viewer__img--animate,
  .doc-viewer button,
  .doc-viewer a {
    transition: none;
  }
}
</style>
