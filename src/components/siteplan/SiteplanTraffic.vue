<template>
  <!--
    Mobil berada di luar SVG lanskap dan hanya menganimasikan transform serta
    opacity, sehingga digerakkan GPU tanpa menggambar ulang peta.
  -->
  <div
    v-if="!reduceMotion"
    class="traffic"
    :style="{ transform: `scale(${fit})` }"
    aria-hidden="true"
  >
    <div
      v-for="car in FLEET"
      :key="car.phase"
      ref="carElements"
      class="car"
      :style="{ '--paint': car.color }"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import {
  CAR_CYCLE,
  CAR_ROUTES,
  CAR_SPEED,
  roundCorners,
  type Pt
} from '../../utils/siteplanRoads'

const props = defineProps<{ width: number; height: number; paused?: boolean }>()

/* Ruang gambar denah, dipaskan ke viewport dengan cara yang sama seperti SVG-nya. */
const MAP_WIDTH = 1252
const MAP_HEIGHT = 1257
const fit = computed(() => Math.min(props.width / MAP_WIDTH, props.height / MAP_HEIGHT))

/* Mobil digambar 4x lebih besar lalu dikecilkan, agar tetap tajam saat di-zoom. */
const SHARPNESS = 4

/* Mobil berada di atas lapisan pudar, jadi ia memudar sendiri di tepi lanskap. */
const FADE_FROM = 1500
const FADE_TO = 2000

const TURN = 7

function keyframesFor(route: Pt[]): Keyframe[] {
  const points = roundCorners(route)
  const frames: Keyframe[] = []
  let travelled = 0
  let heading = 0

  const push = (x: number, y: number, distance: number) => {
    const radius = Math.hypot(x - MAP_WIDTH / 2, y - MAP_HEIGHT / 2)
    frames.push({
      offset: Math.min(1, distance / (CAR_SPEED * CAR_CYCLE)),
      transform: `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) rotate(${heading.toFixed(1)}deg) scale(${1 / SHARPNESS})`,
      opacity: Math.max(0, Math.min(1, (FADE_TO - radius) / (FADE_TO - FADE_FROM)))
    })
  }

  for (let i = 1; i < points.length; i++) {
    const [ax, ay] = points[i - 1]
    const [bx, by] = points[i]
    const length = Math.hypot(bx - ax, by - ay)
    if (length < 0.5) continue

    /* Selisih terpendek, agar mobil tidak berputar balik 360 derajat. */
    const angle = (Math.atan2(by - ay, bx - ax) * 180) / Math.PI
    heading += ((((angle - heading) % 360) + 540) % 360) - 180

    /* Arah tetap sepanjang ruas lurus; belokan hanya terjadi di sekitar sambungan. */
    const edge = Math.min(TURN, length / 2) / length
    for (const t of [edge, 1 - edge]) {
      push(ax + (bx - ax) * t, ay + (by - ay) * t, travelled + length * t)
    }
    travelled += length
  }

  /* Rute pendek menunggu di ujung yang tak terlihat sampai putaran selesai. */
  frames[0] = { ...frames[0], offset: 0 }
  frames.push({ ...frames[frames.length - 1], offset: 1 })
  return frames
}

/*
 * `phase` = detik yang sudah ditempuh saat peta dibuka. Nilainya dipilih agar
 * tidak ada dua mobil yang saling menembus, termasuk di persimpangan. Bila rute
 * atau kecepatan diubah, hitung ulang fasenya.
 */
const FLEET: { route: keyof typeof CAR_ROUTES; phase: number; color: string }[] = [
  { route: 'westToSouth', phase: 0, color: '#f2efe6' },
  { route: 'southToWest', phase: 36.6, color: '#d9a72c' },
  { route: 'northTour', phase: 1.8, color: '#3f7ab5' },
  { route: 'westToSouth', phase: 47.4, color: '#c2503a' },
  { route: 'southToWest', phase: 96.6, color: '#e7e1d2' },
  { route: 'northTour', phase: 81.6, color: '#f2efe6' },
  { route: 'westToSouth', phase: 25.8, color: '#3f7ab5' },
  { route: 'southToWest', phase: 73.8, color: '#9aa4a8' },
  { route: 'northTour', phase: 24, color: '#d9a72c' }
]

const reduceMotion =
  window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

const carElements = ref<HTMLElement[]>([])
let animations: Animation[] = []

function syncPlayback() {
  for (const animation of animations) {
    if (props.paused) animation.pause()
    else animation.play()
  }
}

onMounted(() => {
  const frames = new Map<string, Keyframe[]>()
  animations = FLEET.flatMap((car, i) => {
    const element = carElements.value[i]
    if (!element?.animate) return []
    if (!frames.has(car.route)) frames.set(car.route, keyframesFor(CAR_ROUTES[car.route]))
    return [
      element.animate(frames.get(car.route)!, {
        duration: CAR_CYCLE * 1000,
        iterations: Infinity,
        iterationStart: car.phase / CAR_CYCLE
      })
    ]
  })
  syncPlayback()
})

watch(() => props.paused, syncPlayback)

onBeforeUnmount(() => animations.forEach((animation) => animation.cancel()))
</script>

<style scoped>
/* Kotak seukuran gambar denah, dipusatkan di .map-world lalu diskalakan. */
.traffic {
  position: absolute;
  top: calc(50% - 628.5px);
  left: calc(50% - 626px);
  width: 1252px;
  height: 1257px;
  pointer-events: none;
}

/* 64 x 32 = badan 16 x 8 satuan denah. Titik (0, 0) berada di tengah badan. */
.car {
  position: absolute;
  top: -16px;
  left: -32px;
  width: 64px;
  height: 32px;
  border-radius: 10px;
  background:
    linear-gradient(rgba(20, 30, 40, 0.75), rgba(20, 30, 40, 0.75)) 34px 4px / 16px 24px no-repeat,
    linear-gradient(rgba(20, 30, 40, 0.5), rgba(20, 30, 40, 0.5)) 7px 4px / 11px 24px no-repeat,
    var(--paint);
  box-shadow: 3px 6px 0 rgba(0, 0, 0, 0.3), inset 0 0 0 2px rgba(0, 0, 0, 0.3);
  opacity: 0;
}
</style>
