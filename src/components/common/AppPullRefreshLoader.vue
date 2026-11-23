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

// 3 kolom x 2 baris, dipisah jalan utama di tengah
const plots = [
  { x: 5, y: 5 }, { x: 24, y: 5 }, { x: 43, y: 5 },
  { x: 5, y: 29 }, { x: 24, y: 29 }, { x: 43, y: 29 }
]

const p = computed(() => Math.min(1, Math.max(0, Number.isFinite(props.progress) ? props.progress : 0)))
const isReady = computed(() => !props.refreshing && p.value >= 1)

const statusText = computed(() => {
  if (props.refreshing) return 'Memuat ulang data'
  if (isReady.value) return 'Lepaskan untuk memuat ulang'
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

function plotStyle(i: number) {
  const a = plotAmount(i)
  return { opacity: a, transform: `scale(${0.82 + a * 0.18})` }
}

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
  transition: opacity var(--dur-fast) var(--ease-out);
  pointer-events: none;
}

/* Saat memuat: sorotan berpindah dari petak ke petak (satu aktif dalam satu waktu) */
.kv-glow-run {
  animation: kv-sweep 1.8s ease-in-out infinite;
  animation-delay: calc(var(--i, 0) * 0.3s);
}
.kv-d0 { --i: 0; } .kv-d1 { --i: 1; } .kv-d2 { --i: 2; }
.kv-d5 { --i: 3; } .kv-d4 { --i: 4; } .kv-d3 { --i: 5; }

@keyframes kv-sweep {
  0%, 16.6%, 100% { opacity: 0; }
  4%, 12% { opacity: 1; }
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
  .kv-label {
    animation: none !important;
    transition: none !important;
  }
  /* Tanpa gerak: satu petak disorot statis selama memuat */
  .kv-loader.is-refreshing .kv-glow.kv-d4 { opacity: 1; }
}
</style>