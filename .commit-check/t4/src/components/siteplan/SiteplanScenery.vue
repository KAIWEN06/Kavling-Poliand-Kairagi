<template>
  <svg
    class="scenery"
    :class="{ 'is-paused': paused }"
    viewBox="0 0 1252 1257"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <defs>
      <radialGradient id="sc-pond" cx="40%" cy="35%" r="75%">
        <stop offset="0" stop-color="#8fd0e6" />
        <stop offset="0.6" stop-color="#4f9bbd" />
        <stop offset="1" stop-color="#3b82a6" />
      </radialGradient>

      <!-- Pohon: tajuk bergelombang dari atas -->
      <symbol id="sc-tree" viewBox="-30 -30 60 60" overflow="visible">
        <ellipse cx="6" cy="8" rx="23" ry="19" fill="rgba(30, 52, 26, 0.26)" />
        <g fill="currentColor" stroke="rgba(22, 52, 24, 0.38)" stroke-width="1">
          <circle cx="-10" cy="-6" r="13" />
          <circle cx="10" cy="-8" r="13" />
          <circle cx="12" cy="8" r="12" />
          <circle cx="-11" cy="9" r="12" />
          <circle cx="0" cy="0" r="16" stroke="none" />
        </g>
        <g fill="rgba(255, 255, 255, 0.22)">
          <circle cx="-8" cy="-10" r="7" />
          <circle cx="9" cy="-11" r="5" />
          <circle cx="-14" cy="5" r="4" />
        </g>
        <circle cx="5" cy="8" r="9" fill="rgba(14, 40, 18, 0.2)" />
      </symbol>

      <!-- Palem: selaras dengan pagar palem pada denah -->
      <symbol id="sc-palm" viewBox="-30 -30 60 60" overflow="visible">
        <ellipse cx="5" cy="7" rx="22" ry="18" fill="rgba(30, 52, 26, 0.24)" />
        <g fill="currentColor" stroke="rgba(22, 48, 20, 0.4)" stroke-width="0.8">
          <ellipse v-for="a in 8" :key="a" cx="0" cy="-13" rx="4.6" ry="14" :transform="`rotate(${(a - 1) * 45})`" />
        </g>
        <g fill="rgba(255, 255, 255, 0.2)">
          <ellipse v-for="a in 8" :key="a" cx="-1" cy="-15" rx="1.4" ry="8" :transform="`rotate(${(a - 1) * 45})`" />
        </g>
        <circle r="4.5" fill="#7a5a2a" stroke="rgba(0,0,0,0.25)" stroke-width="0.6" />
      </symbol>

      <symbol id="sc-bush" viewBox="-14 -14 28 28" overflow="visible">
        <ellipse cx="3" cy="4" rx="11" ry="9" fill="rgba(30, 52, 26, 0.22)" />
        <g fill="currentColor" stroke="rgba(22, 52, 24, 0.35)" stroke-width="0.8">
          <circle cx="-4" cy="-2" r="6.5" />
          <circle cx="4" cy="-3" r="6" />
          <circle cx="1" cy="4" r="6.5" />
        </g>
        <circle cx="-4" cy="-4" r="2.6" fill="rgba(255,255,255,0.25)" />
      </symbol>

      <!-- Rumah: atap pelana dari atas, halaman dengan pagar -->
      <symbol id="sc-house" viewBox="-44 -36 88 72" overflow="visible">
        <rect x="-42" y="-34" width="84" height="68" rx="9" fill="#b9cf8f" stroke="#9fb673" stroke-width="1.4" />
        <rect x="-26" y="-22" width="52" height="40" rx="3" fill="rgba(30, 52, 26, 0.26)" transform="translate(5 6)" />
        <rect x="-26" y="-22" width="52" height="20" rx="2" style="fill: var(--roof-a)" />
        <rect x="-26" y="-2" width="52" height="20" rx="2" style="fill: var(--roof-b)" />
        <line x1="-26" y1="-2" x2="26" y2="-2" stroke="rgba(60, 24, 10, 0.55)" stroke-width="1.6" />
        <g stroke="rgba(0, 0, 0, 0.14)" stroke-width="0.8">
          <line v-for="i in 5" :key="i" :x1="-26 + i * 8.6" y1="-22" :x2="-26 + i * 8.6" y2="18" />
        </g>
        <rect x="12" y="-18" width="7" height="7" rx="1" fill="#efe6d4" stroke="rgba(0,0,0,0.3)" stroke-width="0.8" />
        <rect x="-5" y="18" width="10" height="16" rx="2" fill="#e5d6b3" />
      </symbol>
    </defs>

    <!-- Jalan setapak antar rumah -->
    <path
      d="M906 906 C960 928 1020 936 1082 984"
      fill="none"
      stroke="#d8c9a2"
      stroke-width="9"
      stroke-linecap="round"
    />
    <path
      d="M906 906 C960 928 1020 936 1082 984"
      fill="none"
      stroke="rgba(255,255,255,0.45)"
      stroke-width="2"
      stroke-dasharray="1 9"
      stroke-linecap="round"
    />

    <!-- Kolam: ketuk untuk memercikkan air -->
    <g class="pond" @pointerdown="rustle">
      <ellipse cx="1000" cy="1138" rx="88" ry="54" fill="#d6cf9c" opacity="0.9" />
      <ellipse cx="1000" cy="1138" rx="78" ry="46" fill="url(#sc-pond)" stroke="#8fc3d9" stroke-width="2" />
      <g class="ripples">
        <ellipse class="ripple" style="--rd: 0s" cx="1010" cy="1130" rx="30" ry="18" />
        <ellipse class="ripple" style="--rd: 1.6s" cx="1010" cy="1130" rx="30" ry="18" />
        <ellipse class="ripple" style="--rd: 3.2s" cx="1010" cy="1130" rx="30" ry="18" />
      </g>
      <g fill="#5d9a45" stroke="rgba(20,60,20,0.35)" stroke-width="0.8">
        <circle cx="965" cy="1150" r="7" />
        <circle cx="976" cy="1160" r="5" />
        <circle cx="1048" cy="1118" r="6" />
      </g>
      <ellipse cx="978" cy="1118" rx="22" ry="7" fill="rgba(255,255,255,0.28)" transform="rotate(-14 978 1118)" />
    </g>

    <!-- Halaman rumah -->
    <g
      v-for="h in houses"
      :key="h.id"
      class="prop"
      :transform="`translate(${h.x} ${h.y}) rotate(${h.r})`"
      @pointerdown="rustle"
    >
      <g class="sway sway--house" :style="{ '--d': h.d + 's' }">
        <use href="#sc-house" x="-44" y="-36" width="88" height="72" :style="{ '--roof-a': h.a, '--roof-b': h.b }" />
      </g>
    </g>

    <!-- Semak -->
    <g
      v-for="b in bushes"
      :key="b.id"
      class="prop"
      :transform="`translate(${b.x} ${b.y}) scale(${b.s})`"
      :style="{ color: b.c }"
      @pointerdown="rustle"
    >
      <g class="sway" :style="{ '--d': b.d + 's', '--dur': b.dur + 's' }">
        <use href="#sc-bush" x="-14" y="-14" width="28" height="28" />
      </g>
    </g>

    <!-- Pohon -->
    <g
      v-for="t in trees"
      :key="t.id"
      class="prop"
      :transform="`translate(${t.x} ${t.y}) rotate(${t.r}) scale(${t.s})`"
      :style="{ color: t.c }"
      @pointerdown="rustle"
    >
      <g :class="['sway', { 'sway--off': !t.live }]" :style="{ '--d': t.d + 's', '--dur': t.dur + 's' }">
        <use :href="t.palm ? '#sc-palm' : '#sc-tree'" x="-30" y="-30" width="60" height="60" />
      </g>
    </g>

    <!-- Mobil kecil melintas di jalan -->
    <g
      v-for="c in cars"
      :key="c.id"
      class="car"
      :style="{ '--path': `path('${c.path}')`, '--dur': c.dur + 's', '--delay': c.delay + 's' }"
    >
      <rect x="-8" y="-4" width="16" height="8" rx="2.4" :fill="c.color" stroke="rgba(0,0,0,0.35)" stroke-width="0.6" />
      <rect x="-1.5" y="-3" width="5.5" height="6" rx="1.2" fill="rgba(20, 30, 40, 0.75)" />
      <rect x="-6.5" y="-3" width="3" height="6" rx="1" fill="rgba(20, 30, 40, 0.5)" />
    </g>
  </svg>
</template>

<script setup lang="ts">
defineProps<{ paused?: boolean }>()

/* =========================================================
   Sebaran dekorasi: deterministik, dihitung sekali.
   Koordinat memakai ruang gambar denah (1252 x 1257).
   Zona dipilih di luar pagar palem, jalan, sungai, dan kavling.
   ========================================================= */

type Pt = [number, number]

function mulberry32(seed: number) {
  let a = seed
  return () => {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function inPolygon(p: Pt, poly: Pt[]): boolean {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    if (yi > p[1] !== yj > p[1] && p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi) {
      inside = !inside
    }
  }
  return inside
}

const ZONES: { poly: Pt[]; trees: number; bushes: number; gap: number }[] = [
  // kiri atas
  { poly: [[30, 40], [340, 40], [340, 250], [300, 320], [270, 400], [215, 520], [30, 520]], trees: 15, bushes: 8, gap: 44 },
  // sisi atas, di luar pagar palem
  { poly: [[400, 40], [790, 40], [650, 128], [520, 188], [430, 235], [390, 262]], trees: 9, bushes: 4, gap: 46 },
  // lahan kanan bawah
  { poly: [[810, 790], [1225, 790], [1225, 1215], [770, 1215]], trees: 24, bushes: 12, gap: 44 },
  // taman di dalam pagar palem kiri bawah
  { poly: [[65, 1005], [275, 1072], [265, 1175], [65, 1185]], trees: 7, bushes: 5, gap: 42 }
]

const HOUSES = [
  { id: 'h1', x: 900, y: 905, r: -26, a: '#c4673f', b: '#a9532f', d: 0.4 },
  { id: 'h2', x: 1088, y: 990, r: -22, a: '#b8744a', b: '#9a5c37', d: 1.1 },
  { id: 'h3', x: 130, y: 215, r: -28, a: '#c9824e', b: '#ac6a3a', d: 0.8 },
  { id: 'h4', x: 165, y: 1100, r: -14, a: '#c4673f', b: '#a9532f', d: 1.5 }
]

// Area yang tidak boleh ditumbuhi: halaman rumah, kolam, jalan setapak
const AVOID: { x: number; y: number; r: number }[] = [
  ...HOUSES.map((h) => ({ x: h.x, y: h.y, r: 66 })),
  { x: 1000, y: 1138, r: 100 },
  { x: 990, y: 950, r: 58 }
]

const TREE_TINTS = ['#4f8f36', '#3f7a2f', '#5c9a3d', '#68a043', '#3a7430']
const PALM_TINTS = ['#6b8a2e', '#7a9a35']
const BUSH_TINTS = ['#5f9a3f', '#6fa748', '#4e8a38', '#8aae4c']

function scatter(poly: Pt[], count: number, gap: number, rand: () => number, taken: Pt[]): Pt[] {
  const xs = poly.map((p) => p[0])
  const ys = poly.map((p) => p[1])
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const out: Pt[] = []
  for (let tries = 0; tries < 6000 && out.length < count; tries++) {
    const p: Pt = [minX + rand() * (maxX - minX), minY + rand() * (maxY - minY)]
    if (!inPolygon(p, poly)) continue
    if (AVOID.some((a) => Math.hypot(a.x - p[0], a.y - p[1]) < a.r)) continue
    if ([...taken, ...out].some((q) => Math.hypot(q[0] - p[0], q[1] - p[1]) < gap)) continue
    out.push(p)
  }
  return out
}

const rand = mulberry32(20260)
const placed: Pt[] = []

const trees: {
  id: string; x: number; y: number; r: number; s: number; c: string
  palm: boolean; live: boolean; d: number; dur: number
}[] = []
const bushes: { id: string; x: number; y: number; s: number; c: string; d: number; dur: number }[] = []

for (const [zi, zone] of ZONES.entries()) {
  const tp = scatter(zone.poly, zone.trees, zone.gap, rand, placed)
  placed.push(...tp)
  tp.forEach(([x, y], i) => {
    const palm = rand() < 0.16
    trees.push({
      id: `t${zi}-${i}`,
      x: Math.round(x),
      y: Math.round(y),
      r: Math.round(rand() * 360),
      s: +(0.85 + rand() * 0.5).toFixed(2),
      c: (palm ? PALM_TINTS : TREE_TINTS)[Math.floor(rand() * (palm ? PALM_TINTS : TREE_TINTS).length)],
      palm,
      // hanya sebagian yang bergoyang terus-menerus agar ringan di HP
      live: i % 2 === 0,
      d: +(rand() * -6).toFixed(2),
      dur: +(5 + rand() * 4).toFixed(2)
    })
  })

  const bp = scatter(zone.poly, zone.bushes, 26, rand, placed)
  placed.push(...bp)
  bp.forEach(([x, y], i) => {
    bushes.push({
      id: `b${zi}-${i}`,
      x: Math.round(x),
      y: Math.round(y),
      s: +(0.8 + rand() * 0.5).toFixed(2),
      c: BUSH_TINTS[Math.floor(rand() * BUSH_TINTS.length)],
      d: +(rand() * -5).toFixed(2),
      dur: +(4.5 + rand() * 3).toFixed(2)
    })
  })
}

// Pohon yang lebih besar digambar belakangan agar menutup yang di belakangnya.
trees.sort((a, b) => a.y - b.y)

const houses = HOUSES

// Jalan masuk dari kiri dan jalan selatan; dua arah dengan jalur terpisah.
const cars = [
  { id: 'c1', path: 'M0 608 L190 722', color: '#f2efe6', dur: 16, delay: 0 },
  { id: 'c2', path: 'M196 746 L0 630', color: '#d9a72c', dur: 19, delay: 6 },
  { id: 'c3', path: 'M378 1005 C352 1070 356 1140 382 1195 S408 1235 414 1250', color: '#3f7ab5', dur: 14, delay: 3 },
  { id: 'c4', path: 'M432 1250 C428 1235 402 1195 396 1140 S398 1070 398 1005', color: '#e7e1d2', dur: 17, delay: 10 }
]

/* =========================================================
   Interaksi: ketuk dekorasi, ia bergoyang sebentar.
   Tidak menghentikan peta (pointerdown tetap naik ke peta).
   ========================================================= */

function rustle(event: PointerEvent) {
  const el = event.currentTarget as SVGElement | null
  if (!el) return
  el.classList.remove('is-rustling')
  void el.getBoundingClientRect()
  el.classList.add('is-rustling')
  el.addEventListener('animationend', () => el.classList.remove('is-rustling'), { once: true })
}
</script>

<style scoped>
.scenery {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  overflow: hidden;
}

.prop,
.pond {
  pointer-events: auto;
  cursor: default;
  transform-box: fill-box;
  transform-origin: center;
}

.sway {
  transform-box: fill-box;
  transform-origin: 50% 55%;
  animation: sc-sway var(--dur, 6s) ease-in-out var(--d, 0s) infinite;
  will-change: transform;
}

.sway--off {
  animation: none;
  will-change: auto;
}

.sway--house {
  animation: none;
  will-change: auto;
}

.is-paused .sway,
.is-paused .car,
.is-paused .ripple {
  animation-play-state: paused;
}

@keyframes sc-sway {
  0%, 100% { transform: rotate(-1.8deg) scale(1); }
  50% { transform: rotate(2deg) scale(1.025); }
}

/* Ketuk: tajuk bergoyang dengan pegas pendek */
.prop.is-rustling {
  animation: sc-rustle 640ms var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
}

@keyframes sc-rustle {
  0% { rotate: 0deg; scale: 1; }
  22% { rotate: -7deg; scale: 1.09; }
  50% { rotate: 5deg; scale: 0.97; }
  78% { rotate: -2deg; scale: 1.02; }
  100% { rotate: 0deg; scale: 1; }
}

.pond.is-rustling .ripples {
  animation: sc-splash 700ms var(--ease-out, ease-out);
}

@keyframes sc-splash {
  0% { transform: scale(1); }
  35% { transform: scale(1.12); }
  100% { transform: scale(1); }
}

.ripples {
  transform-box: fill-box;
  transform-origin: center;
}

.ripple {
  fill: none;
  stroke: rgba(255, 255, 255, 0.7);
  stroke-width: 1.6;
  transform-box: fill-box;
  transform-origin: center;
  opacity: 0;
  animation: sc-ripple 4.8s ease-out var(--rd, 0s) infinite;
}

@keyframes sc-ripple {
  0% { transform: scale(0.25); opacity: 0.85; }
  70% { opacity: 0; }
  100% { transform: scale(1.5); opacity: 0; }
}

/* Mobil mengikuti garis jalan, muncul dan hilang halus di ujung */
.car {
  offset-path: var(--path);
  offset-rotate: auto;
  offset-distance: 0%;
  opacity: 0;
  animation: sc-drive var(--dur, 16s) linear var(--delay, 0s) infinite;
}

@keyframes sc-drive {
  0% { offset-distance: 0%; opacity: 0; }
  6% { opacity: 1; }
  94% { opacity: 1; }
  100% { offset-distance: 100%; opacity: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .sway,
  .ripple,
  .car {
    animation: none;
  }

  .car {
    display: none;
  }

  .prop.is-rustling,
  .pond.is-rustling .ripples {
    animation: none;
  }
}
</style>
