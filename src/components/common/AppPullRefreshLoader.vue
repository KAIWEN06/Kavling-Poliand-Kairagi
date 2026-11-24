<template>
  <div
    class="kv-loader"
    :class="{ 'is-ready': isReady, 'is-refreshing': refreshing }"
    role="status"
    aria-live="polite"
    :aria-busy="refreshing"
  >
    <svg
      class="kv-svg"
      viewBox="0 0 64 48"
      width="56"
      height="42"
      aria-hidden="true"
      focusable="false"
    >
      <!-- Batas lahan -->
      <rect
        class="kv-boundary"
        x="1.5"
        y="1.5"
        width="61"
        height="45"
        rx="6"
        pathLength="100"
        :style="{ strokeDashoffset: boundaryOffset }"
      />

      <!-- Jalur kavling: jalan utama (horizontal) + lorong antar petak -->
      <path
        class="kv-road"
        d="M5 24 H59 M22 5 V19 M42 5 V19 M22 29 V43 M42 29 V43"
        pathLength="100"
        :style="{ strokeDashoffset: roadOffset }"
      />

      <!-- Petak kavling -->
      <g v-for="(plot, i) in plots" :key="i">
        <rect
          class="kv-plot"
          :class="{ 'is-accent': i === ACCENT_INDEX }"
          :x="plot.x"
          :y="plot.y"
          :width="PLOT_W"
          :height="PLOT_H"
          rx="2.5"
          :style="plotStyle(i)"
        />
        <!-- Sorotan halus: satu petak saat siap, bergilir saat memuat -->
        <rect
          class="kv-glow"
          :class="refreshing ? `kv-glow-run kv-d${i}` : ''"
          :x="plot.x"
          :y="plot.y"
          :width="PLOT_W"
          :height="PLOT_H"
          rx="2.5"
          :style="glowStyle(i)"
        />
      </g>

      <!-- Pin: jatuh ke petak saat tarikan cukup, lalu melompat dari petak ke petak saat memuat -->
      <g class="kv-pin" :class="{ 'is-hop': refreshing }" :style="pinStyle">
        <ellipse class="kv-pin-shadow" cx="0" cy="0.6" rx="4.5" ry="1.5" />
        <g class="kv-pin-body">
          <path class="kv-pin-shape" d="M0 0 C-2.2 -4 -5.4 -6.6 -5.4 -10.4 A5.4 5.4 0 1 1 5.4 -10.4 C5.4 -6.6 2.2 -4 0 0 Z" />
          <circle class="kv-pin-dot" cx="0" cy="-10.4" r="1.9" />
        </g>
      </g>
    </svg>

    <span class="kv-label" aria-hidden="true" :class="{ 'is-on': !!statusText }">{{ statusText }}</span>
    <!-- Pembaca layar hanya diberi tahu saat status berubah, bukan sepanjang tarikan -->
    <span class="kv-sr">{{ statusText }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    /** Progres tarikan, 0 sampai 1 */
    progress?: number
    /** True saat data sedang dimuat ulang */
    refreshing?: boolean
  }>(),
  { progress: 0, refreshing: false }
)

const PLOT_W = 16
const PLOT_H = 14
const ACCENT_INDEX = 4
// Titik mendarat pin (tengah petak) pada petak accent
const PIN_X = 32
const PIN_Y = 36

// 3 kolom x 2 baris, dipisah jalan utama di tengah
const plots = [
  { x: 5, y: 5 }, { x: 24, y: 5 }, { x: 43, y: 5 },
  { x: 5, y: 29 }, { x: 24, y: 29 }, { x: 43, y: 29 }
]

const p = computed(() => Math.min(1, Math.max(0, Number.isFinite(props.progress) ? props.progress : 0)))
const isReady = computed(() => !props.refreshing && p.value >= 1)

const statusText = computed(() => {
  if (props.refreshing) return 'Memuat data'
  if (isReady.value) return 'Lepas untuk muat ulang'
  return ''
})

// Batas dan jalur tergambar seiring tarikan; saat refresh sudah penuh
const boundaryOffset = computed(() => (props.refreshing ? 0 : 100 - Math.min(1, p.value / 0.5) * 100))
const roadOffset = computed(() => (props.refreshing ? 0 : 100 - Math.min(1, Math.max(0, (p.value - 0.2) / 0.5)) * 100))

// Tiap petak muncul bergantian sesuai progres
function plotAmount(i: number) {
  if (props.refreshing) return 1
  return Math.min(1, Math.max(0, (p.value - 0.25 - i * 0.09) / 0.3))
}

// Petak "membal" masuk: melewati ukuran penuh sedikit sebelum mengendap
function plotStyle(i: number) {
  const a = plotAmount(i)
  const scale = 0.5 + a * 0.5 + Math.sin(a * Math.PI) * 0.22
  const tilt = (1 - a) * (i % 2 === 0 ? -14 : 14)
  return { opacity: Math.min(1, a * 1.6), transform: `scale(${scale}) rotate(${tilt}deg)` }
}

// Pin jatuh dari atas saat tarikan melewati ambang; saat memuat animasi CSS mengambil alih
const pinStyle = computed(() => {
  if (props.refreshing) return undefined
  const drop = isReady.value ? 0 : -16
  return {
    opacity: isReady.value ? 1 : 0,
    transform: `translate(${PIN_X}px, ${PIN_Y + drop}px)`
  }
})

function glowStyle(i: number) {
  if (props.refreshing) return undefined
  return { opacity: i === ACCENT_INDEX && isReady.value ? 1 : 0 }
}
</script>

<style scoped>
.kv-loader {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  background: transparent;
  font-family: var(--font-primary, 'Plus Jakarta Sans', system-ui, sans-serif);
}

.kv-svg {
  display: block;
  overflow: visible;
}

.kv-boundary {
  fill: none;
  stroke: var(--poliland-green, #355a2c);
  stroke-opacity: 0.35;
  stroke-width: 1.5;
  stroke-dasharray: 100;
}

.kv-road {
  fill: none;
  stroke: var(--poliland-gold, #cba044);
  stroke-opacity: 0.8;
  stroke-width: 1.5;
  stroke-linecap: round;
  stroke-dasharray: 100;
}

.kv-plot {
  fill: var(--surface-muted, #f5f3ee);
  stroke: var(--poliland-green, #355a2c);
  stroke-opacity: 0.6;
  stroke-width: 1.2;
  transform-box: fill-box;
  transform-origin: center;
}
.kv-plot.is-accent {
  fill: var(--poliland-green, #355a2c);
  fill-opacity: 0.14;
}

.kv-glow {
  fill: var(--poliland-gold-soft, #f4d69a);
  stroke: var(--poliland-gold, #cba044);
  stroke-width: 1.4;
  opacity: 0;
  transform-box: fill-box;
  transform-origin: center;
  transition: opacity var(--dur-fast) var(--ease-out);
  pointer-events: none;
}

/* Satu putaran 1,8 dtk = 6 lompatan @ 0,3 dtk. Urutan petak: 0,1,2,5,4,3 (searah jarum jam).
   Pin mulai dari petak accent (indeks urutan 4) supaya tidak ada loncatan posisi saat tarikan dilepas. */
.kv-glow-run {
  animation: kv-land 1.8s linear infinite;
  animation-delay: calc((var(--i, 0) - 4) * 0.3s);
}
.kv-d0 { --i: 0; } .kv-d1 { --i: 1; } .kv-d2 { --i: 2; }
.kv-d5 { --i: 3; } .kv-d4 { --i: 4; } .kv-d3 { --i: 5; }

/* Petak menyala dan mengembang sesaat ketika pin mendarat di atasnya */
@keyframes kv-land {
  0%   { opacity: 1; transform: scale(1.14); }
  7%   { opacity: 1; transform: scale(0.97); }
  14%  { opacity: 1; transform: scale(1); }
  16.6%, 100% { opacity: 0; transform: scale(1); }
}

.kv-pin {
  pointer-events: none;
  transition:
    transform 420ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)),
    opacity var(--dur-fast, 150ms) var(--ease-out, ease-out);
}
.kv-pin-shadow { fill: var(--poliland-green, #355a2c); opacity: 0.28; transform-box: fill-box; transform-origin: center; }
.kv-pin-body { transform-origin: 0 0; }
.kv-pin-shape {
  fill: var(--poliland-gold, #cba044);
  stroke: var(--poliland-green, #355a2c);
  stroke-width: 1.4;
  stroke-linejoin: round;
}
.kv-pin-dot { fill: var(--poliland-green, #355a2c); }

/* Saat memuat: pin melompat dari petak ke petak. Transisi dimatikan agar animasi tidak bentrok. */
.kv-pin.is-hop {
  transition: none;
  opacity: 1;
  animation: kv-travel 1.8s linear infinite;
  animation-delay: -1.2s;
}
.kv-pin.is-hop .kv-pin-body {
  animation: kv-hop 0.3s infinite;
  animation-delay: 0s;
}
.kv-pin.is-hop .kv-pin-shadow {
  animation: kv-shadow 0.3s infinite;
}

/* Posisi tiap petak (tengah). Gerak antar petak memakai ease agar terasa melompat, bukan meluncur. */
@keyframes kv-travel {
  0%      { transform: translate(13px, 12px); animation-timing-function: cubic-bezier(0.45, 0, 0.35, 1); }
  16.66%  { transform: translate(32px, 12px); animation-timing-function: cubic-bezier(0.45, 0, 0.35, 1); }
  33.33%  { transform: translate(51px, 12px); animation-timing-function: cubic-bezier(0.45, 0, 0.35, 1); }
  50%     { transform: translate(51px, 36px); animation-timing-function: cubic-bezier(0.45, 0, 0.35, 1); }
  66.66%  { transform: translate(32px, 36px); animation-timing-function: cubic-bezier(0.45, 0, 0.35, 1); }
  83.33%  { transform: translate(13px, 36px); animation-timing-function: cubic-bezier(0.45, 0, 0.35, 1); }
  100%    { transform: translate(13px, 12px); }
}

/* Mendarat gepeng, melenting, mendarat lagi */
@keyframes kv-hop {
  0%, 100% { transform: translateY(0) scale(1.16, 0.8); animation-timing-function: cubic-bezier(0.2, 0.8, 0.3, 1); }
  45%      { transform: translateY(-9px) scale(0.9, 1.12); animation-timing-function: cubic-bezier(0.6, 0, 0.9, 0.4); }
}
@keyframes kv-shadow {
  0%, 100% { transform: scale(1.1); opacity: 0.3; }
  45%      { transform: scale(0.55); opacity: 0.1; }
}

.kv-label {
  height: 11px;
  font-size: 9px;
  line-height: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  color: var(--poliland-gold-text, #966a12);
  white-space: nowrap;
  opacity: 0;
  transition: opacity var(--dur-fast) var(--ease-out);
}
.kv-label.is-on { opacity: 1; }

.kv-sr {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

@media (prefers-reduced-motion: reduce) {
  .kv-glow-run,
  .kv-glow,
  .kv-pin,
  .kv-pin-body,
  .kv-pin-shadow,
  .kv-label {
    animation: none !important;
    transition: none !important;
  }
  /* Tanpa gerak: pin diam di petak accent, petak itu disorot */
  .kv-pin.is-hop { transform: translate(32px, 36px); }
  .kv-loader.is-refreshing .kv-glow.kv-d4 { opacity: 1; }
}
</style>