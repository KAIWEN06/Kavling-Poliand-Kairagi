<template>
  <div class="maket-card">
    <div ref="stageEl" class="stage">
      <svg class="maket" :viewBox="viewBox" role="img" :aria-label="summary">
        <defs>
          <clipPath :id="clipId">
            <rect :x="GROUND.x" :y="GROUND.y" :width="GROUND.width" :height="GROUND.height" />
          </clipPath>
        </defs>

        <!-- Tebal tanah, lalu gambar denah asli sebagai permukaannya -->
        <path ref="slabFrontEl" class="slab-front" />
        <path ref="slabSideEl" class="slab-side" />
        <g ref="groundEl">
          <image :href="siteplanImage" width="1252" height="1257" :clip-path="`url(#${clipId})`" />
        </g>

        <!-- Atribut d diisi oleh render(), bukan oleh Vue, agar gerak tidak memicu render ulang. -->
        <g v-for="(shape, i) in shapes" :key="shape.id" class="lot" :data-lot="shape.id">
          <path :ref="(node) => (frontEls[i] = node as SVGPathElement)" class="lot-front" :style="{ '--lot': looks[i].color }" />
          <path :ref="(node) => (sideEls[i] = node as SVGPathElement)" class="lot-side" :style="{ '--lot': looks[i].color }" />
          <path :ref="(node) => (topEls[i] = node as SVGPathElement)" class="lot-top" :fill="looks[i].color" />
        </g>
      </svg>
    </div>

    <div class="maket-foot">
      <ul v-if="lots.length" class="legend" aria-label="Arti warna petak">
        <li v-for="item in legend" :key="item.status">
          <i :style="{ background: item.color }" aria-hidden="true"></i>{{ item.label }}
        </li>
      </ul>
      <p v-else class="legend-empty">Status petak belum dimuat.</p>

      <button class="open-btn" type="button" @click="$emit('goToSiteplan')">
        Lihat denah
        <ion-icon :icon="arrowForwardOutline" aria-hidden="true" />
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import { IonIcon } from '@ionic/vue'
import { arrowForwardOutline } from 'ionicons/icons'
import siteplanImage from '@/assets/siteplan/Siteplan.webp'
import svgRaw from '@/assets/siteplan/LOTS_WITH_ID.svg?raw'
import type { SiteplanLot } from '@/services/siteplanService'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { followTarget, maketProgress, mix, segment } from '@/utils/maketMotion'
import { getLotId, getLotStatusColor, getStatusLabel, normalizeLotStatus } from '@/utils/siteplan'
import {
  GROUND,
  SLAB_DEPTH,
  createProjector,
  groundCorners,
  mixView,
  parseLotShapes,
  sortByDepth,
  tiltedViewBox,
  topPath,
  wallPaths,
} from '@/utils/maketGeometry'

/**
 * Maket 3D dari denah asli. Bentuk dan ukuran petak dibaca dari LOTS_WITH_ID.svg,
 * status dicocokkan lewat ID petak dengan data database. Saat halaman digulir,
 * denah datar miring menjadi maket lalu petaknya terangkat. rAF hidup selama
 * nilainya masih mengejar target, lalu berhenti. Induk memanggil `sync()` dari @ionScroll.
 */
const props = withDefaults(defineProps<{ lots?: SiteplanLot[] }>(), { lots: () => [] })
defineEmits<{ goToSiteplan: [] }>()

/** Tinggi balok per status, dalam satuan gambar denah. Status juga terbaca tanpa warna. */
const HEIGHTS: Record<string, number> = { available: 44, booking: 26, sold: 12 }
const UNKNOWN_HEIGHT = 12
const UNKNOWN_COLOR = '#f9f5ec'

const shapes = sortByDepth(parseLotShapes(svgRaw))
const viewBox = tiltedViewBox(Math.max(...Object.values(HEIGHTS)))
const clipId = `maket-ground-${useId()}`

const lotById = computed(() => new Map(props.lots.map((lot) => [getLotId(lot), lot])))

const looks = computed(() =>
  shapes.map(({ id }) => {
    const lot = lotById.value.get(id)
    return {
      color: lot ? getLotStatusColor(lot) : UNKNOWN_COLOR,
      height: HEIGHTS[normalizeLotStatus(lot?.status)] ?? UNKNOWN_HEIGHT,
    }
  }),
)

const legend = ['available', 'booking', 'sold'].map((status) => ({
  status,
  label: getStatusLabel(status),
  color: getLotStatusColor({ status }),
}))

const summary = computed(() => {
  if (!props.lots.length) return `Maket 3D denah dengan ${shapes.length} petak.`
  const count = (status: string) =>
    shapes.filter(({ id }) => normalizeLotStatus(lotById.value.get(id)?.status) === status).length
  return `Maket 3D denah. ${legend.map((item) => `${item.label} ${count(item.status)} petak`).join(', ')}.`
})

const reduced = useReducedMotion()
const stageEl = ref<HTMLElement | null>(null)
const groundEl = ref<SVGGElement | null>(null)
const slabFrontEl = ref<SVGPathElement | null>(null)
const slabSideEl = ref<SVGPathElement | null>(null)
const frontEls: SVGPathElement[] = []
const sideEls: SVGPathElement[] = []
const topEls: SVGPathElement[] = []

/* Urutan naik: dari kiri denah ke kanan, seperti gelombang. */
const order = shapes.map(({ points }) => (points[0][0] - GROUND.x) / GROUND.width)

let current = -1 // -1 = belum pernah digambar
let frame = 0
let lastTime = 0
let observer: IntersectionObserver | null = null

const render = (p: number) => {
  const projector = createProjector(mixView(segment(p, 0, 0.7)))

  groundEl.value?.setAttribute('transform', projector.matrix)
  const slab = wallPaths(groundCorners, projector, -SLAB_DEPTH, 0)
  slabFrontEl.value?.setAttribute('d', slab.front)
  slabSideEl.value?.setAttribute('d', slab.side)

  shapes.forEach((shape, i) => {
    const start = 0.4 + order[i] * 0.3
    const height = mix(0, looks.value[i].height, segment(p, start, start + 0.3))
    const walls = wallPaths(shape.points, projector, 0, height)
    frontEls[i]?.setAttribute('d', height > 0.5 ? walls.front : '')
    sideEls[i]?.setAttribute('d', height > 0.5 ? walls.side : '')
    topEls[i]?.setAttribute('d', topPath(shape.points, projector, height))
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
const showFinal = () => {
  stop()
  current = 1
  render(current)
}

watch(reduced, (value) => (value ? showFinal() : sync()))

/* Status datang belakangan atau berubah: tinggi balok digambar ulang pada posisi sekarang. */
watch(looks, () => render(Math.max(current, 0)))

onMounted(() => {
  if (reduced.value) showFinal()
  else render(0)
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
.maket-card {
  overflow: hidden;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #fff);
}

.stage {
  padding: 8px 4px;
  background:
    radial-gradient(80% 70% at 100% 0%, rgba(244, 214, 154, 0.55) 0%, rgba(244, 214, 154, 0) 70%),
    linear-gradient(180deg, var(--green-50, #eef3ea) 0%, var(--pl-paper, #f9f5ec) 100%);
}

.maket {
  display: block;
  width: 100%;
  max-width: 640px;
  height: auto;
  margin: 0 auto;
  pointer-events: none;
}

.slab-front { fill: #3f5a30; }
.slab-side { fill: #54743f; }

/* Sisi balok = warna status yang digelapkan. Deklarasi pertama untuk browser tanpa color-mix. */
.lot-front { fill: var(--lot); fill: color-mix(in srgb, var(--lot) 52%, #0f2409); }
.lot-side { fill: var(--lot); fill: color-mix(in srgb, var(--lot) 70%, #0f2409); }
.lot-top { stroke: #ffffff; stroke-width: 2; stroke-linejoin: round; }

.maket-foot { padding: 12px 14px 14px; }

.legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px 18px;
  margin: 0;
  padding: 0;
  list-style: none;
}
.legend li { display: flex; align-items: center; gap: 7px; color: var(--text-secondary, #5f5f66); font-size: 13px; font-weight: 600; }
.legend i { width: 12px; height: 12px; border: 1px solid rgba(0, 0, 0, 0.28); border-radius: 3px; }
.legend-empty { margin: 0; color: var(--text-secondary, #5f5f66); font-size: 13px; text-align: center; }

.open-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 48px;
  margin-top: 12px;
  border: 0;
  border-radius: 12px;
  background: var(--poliland-green, #355a2c);
  color: #fff;
  font: 800 15px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-base) var(--ease-spring);
}
.open-btn ion-icon { font-size: 20px; }
.open-btn:active { transform: scale(0.97); }
.open-btn:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 3px; }

@media (prefers-reduced-motion: reduce) {
  .open-btn:active { transform: none; }
}
</style>
