<template>
  <section class="maket-section">
    <div class="maket-card">
      <div class="maket-copy">
        <h2 class="pl-keep">{{ available > 0 ? `${available} kavling tersedia` : 'Gambaran kawasan' }}</h2>
        <p>Maket ilustrasi. Posisi dan ukuran asli ada di denah.</p>
      </div>

      <!-- Dekoratif: semua informasi ada di teks dan di denah di bawahnya. -->
      <div ref="stageEl" class="stage" aria-hidden="true">
        <div ref="boardEl" class="board">
          <div class="slab">
            <span class="face face-front"></span>
            <span class="face face-left"></span>
          </div>

          <!-- Teras bukit bertumpuk, seperti maket kontur karton. -->
          <svg
            v-for="(terrace, i) in terraces"
            :key="`terrace-${i}`"
            :ref="(node) => (terraceEls[i] = node as SVGSVGElement)"
            class="layer"
            viewBox="0 0 224 184"
          >
            <path :d="terrace.d" :fill="terrace.fill" />
          </svg>

          <!-- Jalan akses -->
          <svg ref="roadEl" class="layer" viewBox="0 0 224 184">
            <path class="road" d="M-4 118 C46 118 66 98 112 98 S182 118 228 110" />
            <path class="road" d="M112 98 C112 130 120 156 118 188" />
            <path class="road-mark" d="M-4 118 C46 118 66 98 112 98 S182 118 228 110" />
          </svg>

          <div
            v-for="(plot, i) in plots"
            :key="`plot-${i}`"
            :ref="(node) => (plotEls[i] = node as HTMLElement)"
            class="plot"
            :class="{ 'is-picked': plot.picked }"
            :style="{ left: `${plot.x}px`, top: `${plot.y}px` }"
          >
            <span class="face face-front"></span>
            <span class="face face-left"></span>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { followTarget, maketProgress, mix, segment } from '@/utils/maketMotion'

/**
 * Maket bukit dan petak kavling yang digerakkan gulir: denah datar miring
 * menjadi maket, teras bukit naik berlapis, lalu petak terangkat satu per satu.
 * Hanya transform dan opacity yang ditulis. rAF hidup selama nilainya masih
 * mengejar target, lalu berhenti. Induk memanggil `sync()` dari @ionScroll.
 */
defineProps<{ available: number }>()

const terraces = [
  { d: 'M0 0 H170 C176 30 138 34 118 52 C96 74 56 62 34 78 C20 88 8 84 0 90 Z', fill: '#7fa06c' },
  { d: 'M0 0 H122 C130 22 98 24 82 40 C66 56 38 44 22 56 C14 62 6 58 0 62 Z', fill: '#a3ba8b' },
  { d: 'M0 0 H74 C82 14 60 16 48 26 C34 38 18 28 0 38 Z', fill: '#d9c07a' },
]

/** Dua blok petak di sisi jalan. Posisi tetap; ini ilustrasi, bukan data denah. */
const plots = [
  ...[0, 1, 2].map((c) => ({ x: 14 + c * 31, y: 134, picked: false })),
  ...[0, 1, 2].map((c) => ({ x: 14 + c * 31, y: 158, picked: false })),
  ...[0, 1, 2].map((c) => ({ x: 130 + c * 31, y: 134, picked: false })),
  ...[0, 1, 2].map((c) => ({ x: 130 + c * 31, y: 158, picked: c === 0 })),
  ...[0, 1].map((c) => ({ x: 154 + c * 31, y: 58, picked: false })),
]

const reduced = useReducedMotion()
const stageEl = ref<HTMLElement | null>(null)
const boardEl = ref<HTMLElement | null>(null)
const roadEl = ref<SVGSVGElement | null>(null)
const terraceEls: SVGSVGElement[] = []
const plotEls: HTMLElement[] = []

let current = -1 // -1 = belum pernah digambar
let frame = 0
let lastTime = 0
let observer: IntersectionObserver | null = null

const render = (p: number) => {
  const board = boardEl.value
  if (!board) return

  const tilt = segment(p, 0, 0.75)
  board.style.transform =
    `translate3d(0, ${mix(0, 6, tilt).toFixed(2)}px, 0) ` +
    `rotateX(${mix(6, 56, tilt).toFixed(2)}deg) ` +
    `rotateZ(${mix(0, -32, tilt).toFixed(2)}deg) ` +
    `scale(${mix(0.94, 1.02, tilt).toFixed(3)})`

  terraceEls.forEach((el, i) => {
    const lift = segment(p, 0.2 + i * 0.1, 0.65 + i * 0.1)
    el.style.transform = `translate3d(0, 0, ${(1 + mix(i * 0.4, (i + 1) * 13, lift)).toFixed(2)}px)`
  })

  if (roadEl.value) {
    roadEl.value.style.transform = 'translate3d(0, 0, 1px)'
    roadEl.value.style.opacity = mix(0.45, 1, segment(p, 0.2, 0.55)).toFixed(3)
  }

  plotEls.forEach((el, i) => {
    const start = 0.35 + i * 0.025
    const lift = segment(p, start, start + 0.3)
    const height = plots[i].picked ? 26 : 9
    el.style.transform = `translate3d(0, 0, ${mix(1.5, height, lift).toFixed(2)}px)`
  })
}

/** Posisi dibaca sekali di awal frame, sebelum menulis, jadi tidak memicu layout berulang. */
const step = (now: number) => {
  frame = 0
  const rect = stageEl.value?.getBoundingClientRect()
  // Tinggi 0 = halaman sedang disembunyikan Ionic.
  if (!rect || rect.height === 0) return

  const target = maketProgress(rect.top, window.innerHeight)
  const next = current < 0 ? target : followTarget(current, target, lastTime ? now - lastTime : 16)
  lastTime = now

  if (next !== current) {
    current = next
    render(current)
  }

  if (current !== target) frame = requestAnimationFrame(step)
  else lastTime = 0
}

const sync = () => {
  if (reduced.value || frame) return
  frame = requestAnimationFrame(step)
}

const stop = () => {
  cancelAnimationFrame(frame)
  frame = 0
  lastTime = 0
}

/** Reduced motion: maket langsung dalam bentuk jadinya, tanpa mengikuti gulir. */
watch(reduced, (value) => {
  if (!value) return sync()
  stop()
  current = 1
  render(current)
})

onMounted(() => {
  render(0)
  window.addEventListener('resize', sync)
  if (typeof IntersectionObserver !== 'undefined' && stageEl.value) {
    observer = new IntersectionObserver(sync)
    observer.observe(stageEl.value)
  }
  sync()
})

onBeforeUnmount(() => {
  stop()
  observer?.disconnect()
  window.removeEventListener('resize', sync)
})

defineExpose({ sync })
</script>

<style scoped>
.maket-section { padding: 32px 16px 0; }

.maket-card {
  overflow: hidden;
  border-radius: 24px;
  background:
    radial-gradient(90% 70% at 100% 0%, rgba(244, 214, 154, 0.22) 0%, rgba(244, 214, 154, 0) 60%),
    linear-gradient(165deg, var(--green-800, #2b4824) 0%, var(--green-900, #1f3519) 100%);
  box-shadow: var(--shadow-md);
}

.maket-copy { padding: 22px 20px 0; }
.maket-copy h2 {
  margin: 0;
  color: #fff;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: clamp(24px, 6.8vw, 30px);
  line-height: 1.12;
  font-weight: 650;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.maket-copy p { margin: 8px 0 0; color: var(--on-forest, #f4f1e8); font-size: 13px; line-height: 1.5; }

.stage {
  display: grid;
  place-items: center;
  height: 248px;
  overflow: hidden;
  perspective: 900px;
  pointer-events: none;
}

/* Jangan beri overflow, opacity, atau filter pada elemen preserve-3d: 3D-nya jadi datar. */
.board {
  position: relative;
  width: 224px;
  height: 184px;
  transform-style: preserve-3d;
  will-change: transform;
}

.slab,
.plot {
  position: absolute;
  transform-style: preserve-3d;
}

.slab { inset: 0; background: #4f7a40; --depth: 14px; --front: #2f4d27; --side: #3b5f30; }

.layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.road { fill: none; stroke: #eadfc4; stroke-width: 11; }
.road-mark { fill: none; stroke: #b39a62; stroke-width: 1; stroke-dasharray: 5 6; }

.plot {
  width: 26px;
  height: 19px;
  background: #f9f5ec;
  --depth: 9px;
  --front: #c9bf9f;
  --side: #ddd4b8;
}
.plot.is-picked { background: var(--poliland-gold-soft, #f4d69a); --depth: 26px; --front: #8f6c1f; --side: var(--poliland-gold, #cba044); }

/* Sisi tebal yang menggantung di bawah permukaan atas. */
.face { position: absolute; display: block; }
.face-front {
  top: 100%;
  left: 0;
  width: 100%;
  height: var(--depth);
  background: var(--front);
  transform-origin: top;
  transform: rotateX(-90deg);
}
.face-left {
  top: 0;
  left: 0;
  width: var(--depth);
  height: 100%;
  background: var(--side);
  transform-origin: left;
  transform: rotateY(90deg);
}
</style>
