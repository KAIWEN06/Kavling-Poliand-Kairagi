<template>
  <div class="scene-backdrop" :class="{ 'is-top': placement === 'top' }" aria-hidden="true">
    <div v-if="sun" class="sun" :class="{ 'is-breathing': breathe }"></div>
    <template v-if="sparkle">
      <span
        v-for="(s, i) in sparks"
        :key="i"
        class="spark"
        :style="{ left: s.x, bottom: s.y, '--dx': s.dx, '--dur': s.dur, '--delay': s.delay }"
      ></span>
    </template>
    <svg class="hills" viewBox="0 0 390 220" preserveAspectRatio="none" :style="{ height }">
      <motion.path
        v-for="(hill, i) in layers"
        :key="i"
        :class="['hill', `hill-${i}`, { 'is-swaying': sway }]"
        :d="hill.d"
        :fill="hill.fill"
        :initial="reduced ? false : { y: 46, opacity: 0 }"
        :animate="{ y: 0, opacity: 1 }"
        :transition="{ duration: 0.8, delay: 0.05 + i * 0.1, ease: MOTION_EASE_OUT }"
      />
      <motion.path
        v-for="(d, i) in lines ? parcelLines : []"
        :key="'p' + i"
        class="parcel-line"
        :d="d"
        :initial="reduced ? false : { pathLength: 0, opacity: 0 }"
        :animate="{ pathLength: 1, opacity: 1 }"
        :transition="{ duration: 1.2, delay: 0.7 + i * 0.18, ease: MOTION_EASE_OUT }"
      />
    </svg>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { motion } from 'motion-v'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { MOTION_EASE_OUT } from '@/utils/motionTokens'

/**
 * Latar khas PoliLand: matahari terbit + tiga lapis bukit + garis petak kavling.
 * Sumbernya WelcomePage; semua halaman memakai komponen ini agar rasanya sama.
 * `solidFront` mengisi bukit terdepan dengan warna latar halaman, sehingga
 * bagian atas (mis. foto hero) mengalir mulus ke permukaan krem di bawahnya.
 */
const props = withDefaults(
  defineProps<{
    height?: string
    sun?: boolean
    lines?: boolean
    placement?: 'top' | 'bottom'
    solidFront?: string
    /** Matahari berdenyut pelan (7 detik). Pakai hanya di hero, satu per layar. */
    breathe?: boolean
    /** Titik cahaya emas naik pelan (7 titik). Hanya untuk hero di atas latar hijau tua. */
    sparkle?: boolean
    /** Bukit belakang bergoyang 6px selama 14-19 detik. Aktif secara bawaan. */
    sway?: boolean
  }>(),
  { height: '46%', sun: true, lines: true, placement: 'bottom', solidFront: '', breathe: false, sparkle: false, sway: true },
)

const reduced = useReducedMotion()

/** Posisi tetap (bukan acak) agar render konsisten dan tidak melompat saat re-render. */
const sparks = [
  { x: '12%', y: '34%', dx: '10px', dur: '9s', delay: '0s' },
  { x: '27%', y: '48%', dx: '-8px', dur: '11s', delay: '2.4s' },
  { x: '41%', y: '30%', dx: '12px', dur: '10s', delay: '5s' },
  { x: '58%', y: '52%', dx: '-10px', dur: '12s', delay: '1.2s' },
  { x: '72%', y: '36%', dx: '8px', dur: '9.5s', delay: '3.8s' },
  { x: '86%', y: '46%', dx: '-12px', dur: '10.5s', delay: '6.5s' },
  { x: '93%', y: '28%', dx: '6px', dur: '11.5s', delay: '4.2s' },
]

const layers = computed(() => [
  { d: 'M0 120 C70 96 150 112 230 98 S350 84 390 96 L390 220 L0 220 Z', fill: 'rgba(203,160,68,0.16)' },
  { d: 'M0 150 C80 126 160 142 240 128 S350 118 390 128 L390 220 L0 220 Z', fill: 'rgba(92,141,78,0.16)' },
  {
    d: 'M0 174 C90 156 170 166 250 154 S350 146 390 152 L390 220 L0 220 Z',
    fill: props.solidFront || 'rgba(53,90,44,0.14)',
  },
])

const parcelLines = [
  'M0 176 C90 160 170 168 250 156 S350 150 390 154',
  'M0 196 C100 182 180 190 260 178 S350 172 390 176',
  'M120 163 L96 220 M200 160 L190 220 M278 154 L296 220',
]
</script>

<style scoped>
.scene-backdrop {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.sun {
  position: absolute;
  top: -120px;
  right: -140px;
  width: 420px;
  height: 420px;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(244, 214, 154, 0.75) 0%, rgba(244, 214, 154, 0) 68%);
}

.sun.is-breathing {
  animation: sun-breathe 7s ease-in-out infinite;
}

@keyframes sun-breathe {
  0%, 100% { opacity: 0.85; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.07); }
}

/* `translate` terpisah dari `transform`, jadi tidak bentrok dengan animasi naik dari motion-v. */
.hill.is-swaying.hill-0 { animation: hill-sway 19s ease-in-out infinite alternate; }
.hill.is-swaying.hill-1 { animation: hill-sway 14s ease-in-out infinite alternate-reverse; }

@keyframes hill-sway {
  from { translate: -6px 0; }
  to { translate: 6px 0; }
}

.spark {
  position: absolute;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--poliland-gold-soft, #f4d69a);
  box-shadow: 0 0 10px 2px rgba(244, 214, 154, 0.55);
  opacity: 0;
  animation: spark-rise var(--dur, 10s) ease-in-out var(--delay, 0s) infinite;
}

@keyframes spark-rise {
  0% { opacity: 0; translate: 0 0; }
  18% { opacity: 0.8; }
  100% { opacity: 0; translate: var(--dx, 8px) -110px; }
}

@media (prefers-reduced-motion: reduce) {
  .sun.is-breathing,
  .hill.is-swaying,
  .spark { animation: none; }
  .spark { display: none; }
}

/* Lebih lebar 12px per sisi agar goyangan bukit tidak membuka celah di tepi. */
.hills {
  position: absolute;
  left: -12px;
  right: -12px;
  bottom: 0;
  width: calc(100% + 24px);
}

.is-top .hills {
  top: 0;
  bottom: auto;
  transform: scaleY(-1);
}

.parcel-line {
  fill: none;
  stroke: rgba(53, 90, 44, 0.24);
  stroke-width: 0.8;
}
</style>
