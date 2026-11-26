<template>
  <div
    ref="trackRef"
    class="stc"
    :class="[
      `stc--${variant}`,
      {
        'stc--dragging': dragging,
        'stc--done': done,
        'stc--disabled': isUnavailable,
      },
    ]"
    :style="{ '--stc-progress': progress, '--stc-x': `${offset}px` }"
  >
    <span class="stc__fill" aria-hidden="true" />
    <span class="stc__label" :class="{ 'stc__label--hidden': done }">{{ label }}</span>

    <span
      ref="handleRef"
      class="stc__handle"
      role="slider"
      :tabindex="isUnavailable ? -1 : 0"
      :aria-label="label"
      aria-valuemin="0"
      aria-valuemax="100"
      :aria-valuenow="Math.round(progress * 100)"
      :aria-valuetext="done ? 'Terkonfirmasi' : 'Geser ke kanan atau tekan Enter untuk konfirmasi'"
      :aria-disabled="isUnavailable ? 'true' : undefined"
      @pointerdown="onPointerDown"
      @pointermove="onPointerMove"
      @pointerup="onPointerEnd"
      @pointercancel="onPointerEnd"
      @keydown="onKeydown"
    >
      <ion-spinner v-if="loading" class="stc__spinner" name="crescent" aria-hidden="true" />
      <ion-icon v-else :icon="done ? checkmarkOutline : chevronForwardOutline" aria-hidden="true" />
    </span>
    <span v-if="loading" class="stc__sr">Memproses</span>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { IonIcon, IonSpinner } from '@ionic/vue'
import { checkmarkOutline, chevronForwardOutline } from 'ionicons/icons'

type SlideVariant = 'primary' | 'success' | 'danger' | 'neutral'

const props = withDefaults(defineProps<{
  label?: string
  variant?: SlideVariant
  disabled?: boolean
  loading?: boolean
}>(), {
  label: 'Geser untuk konfirmasi',
  variant: 'primary',
  disabled: false,
  loading: false,
})

const emit = defineEmits<{ confirm: [] }>()

const HANDLE = 48
const GAP = 4
const THRESHOLD = 0.88

const trackRef = ref<HTMLElement | null>(null)
const handleRef = ref<HTMLElement | null>(null)
const offset = ref(0)
const maxOffset = ref(0)
const dragging = ref(false)
const done = ref(false)
let startX = 0
let startOffset = 0
let resetTimer: ReturnType<typeof setTimeout> | undefined

const isUnavailable = computed(() => props.disabled || props.loading || done.value)
const progress = computed(() => (maxOffset.value > 0 ? Math.min(1, offset.value / maxOffset.value) : 0))

function measure() {
  const width = trackRef.value?.clientWidth ?? 0
  maxOffset.value = Math.max(0, width - HANDLE - GAP * 2)
}

function complete() {
  if (done.value) return
  done.value = true
  offset.value = maxOffset.value
  try { navigator.vibrate?.(18) } catch { /* perangkat tanpa getar */ }
  emit('confirm')
  // Tanpa proses lanjutan (loading), geser kembali agar bisa dicoba lagi.
  resetTimer = setTimeout(() => {
    if (!props.loading) reset()
  }, 900)
}

function reset() {
  clearTimeout(resetTimer)
  done.value = false
  offset.value = 0
}

function onPointerDown(event: PointerEvent) {
  if (isUnavailable.value) return
  measure()
  dragging.value = true
  startX = event.clientX
  startOffset = offset.value
  handleRef.value?.setPointerCapture(event.pointerId)
}

function onPointerMove(event: PointerEvent) {
  if (!dragging.value) return
  offset.value = Math.min(maxOffset.value, Math.max(0, startOffset + event.clientX - startX))
}

function onPointerEnd() {
  if (!dragging.value) return
  dragging.value = false
  if (progress.value >= THRESHOLD) complete()
  else offset.value = 0
}

// Alternatif tanpa geser (WCAG 2.5.7): Enter atau Spasi mengonfirmasi, panah menggeser.
function onKeydown(event: KeyboardEvent) {
  if (isUnavailable.value) return
  if (event.key === 'Enter' || event.key === ' ') {
    event.preventDefault()
    measure()
    complete()
  } else if (event.key === 'ArrowRight') {
    event.preventDefault()
    measure()
    offset.value = Math.min(maxOffset.value, offset.value + maxOffset.value / 4)
    if (progress.value >= THRESHOLD) complete()
  } else if (event.key === 'ArrowLeft') {
    event.preventDefault()
    offset.value = Math.max(0, offset.value - maxOffset.value / 4)
  }
}

// Proses selesai (gagal atau berhasil), kembalikan handle ke awal.
watch(() => props.loading, (isLoading, wasLoading) => {
  if (wasLoading && !isLoading) reset()
})

watch(() => props.disabled, (isDisabled) => {
  if (isDisabled && !props.loading) reset()
})

onBeforeUnmount(() => clearTimeout(resetTimer))
</script>

<style scoped>
.stc {
  --stc-bg: var(--poliland-green);
  --stc-accent: var(--poliland-green);
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 56px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--stc-bg);
  color: #fff;
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.stc--success { --stc-bg: var(--status-success); --stc-accent: var(--status-success); }
.stc--danger { --stc-bg: var(--status-danger); --stc-accent: var(--status-danger); }
.stc--neutral { --stc-bg: var(--text-primary); --stc-accent: var(--text-primary); }

.stc__fill {
  position: absolute;
  inset: 0;
  background: rgb(255 255 255 / 22%);
  transform-origin: left center;
  transform: scaleX(var(--stc-progress, 0));
  transition: transform 260ms var(--ease-out);
  pointer-events: none;
}

.stc__label {
  position: relative;
  flex: 1;
  padding: 0 20px 0 64px;
  text-align: center;
  font-family: var(--font-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
  line-height: 1.2;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  opacity: calc(1 - var(--stc-progress, 0) * 1.4);
  transition: opacity 200ms var(--ease-out);
  pointer-events: none;
}

.stc__label--hidden { opacity: 0; }

.stc__handle {
  position: absolute;
  top: 4px;
  left: 4px;
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: #fff;
  color: var(--stc-accent);
  font-size: 24px;
  cursor: grab;
  touch-action: none;
  transform: translateX(var(--stc-x, 0px));
  transition: transform 320ms var(--ease-spring);
  box-shadow: 0 2px 8px rgb(0 0 0 / 22%);
  outline: none;
}

.stc--dragging .stc__handle,
.stc--dragging .stc__fill {
  transition: none;
  cursor: grabbing;
}

.stc__handle:focus-visible {
  outline: 3px solid var(--poliland-gold-soft);
  outline-offset: 2px;
}

.stc__spinner { width: 22px; height: 22px; }

.stc--disabled:not(.stc--done) { opacity: 0.55; }
.stc--disabled .stc__handle { cursor: not-allowed; }

.stc:not(.stc--dragging):not(.stc--done):not(.stc--disabled) .stc__handle ion-icon {
  animation: stc-nudge 1.8s var(--ease-out) infinite;
}

@keyframes stc-nudge {
  0%, 60%, 100% { transform: translateX(0); }
  80% { transform: translateX(4px); }
}

.stc__sr {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .stc__handle ion-icon { animation: none !important; }
  .stc__handle, .stc__fill, .stc__label { transition-duration: 1ms; }
}
</style>
