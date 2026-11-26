/**
 * Lanskap di sekeliling denah, dirakit menjadi satu dokumen SVG.
 *
 * Ditampilkan sebagai satu gambar: ratusan pohon sebagai elemen halaman harus
 * disusun ulang browser di setiap frame zoom, dan itu membuat HP tersendat.
 * Karena dimuat sebagai gambar, semua teksturnya harus tertanam (?inline) dan
 * gayanya ditulis sebagai atribut.
 */
import asphaltTile from '../assets/siteplan/asphalt_tile.webp?inline'
import fencePalm from '../assets/siteplan/fence_palm.webp?inline'
import {
  SOUTH_RIVER,
  SOUTH_ROAD,
  WEST_RIVER,
  WEST_ROAD,
  toLeftLane,
  type Pt
} from './siteplanRoads'
import { inPolygon, mulberry32 } from './siteplanScatter'

/* Kotak gambar dalam ruang denah (1252 x 1257), berpusat di tengah denah. */
const RADIUS = 2300
export const SCENERY_BOX = {
  x: 626 - RADIUS,
  y: 628 - RADIUS,
  size: RADIUS * 2
}

/* =========================================================
   Taman di dalam kotak denah. Sebaran deterministik.
   Zona dipilih di luar pagar palem, jalan, sungai, dan kavling.
   ========================================================= */

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

const YARDS = [
  { id: 'h1', x: 900, y: 905, r: -26, a: '#c4673f', b: '#a9532f' },
  { id: 'h2', x: 1088, y: 990, r: -22, a: '#b8744a', b: '#9a5c37' },
  { id: 'h3', x: 130, y: 215, r: -28, a: '#c9824e', b: '#ac6a3a' },
  { id: 'h4', x: 165, y: 1100, r: -14, a: '#c4673f', b: '#a9532f' }
]

// Area yang tidak boleh ditumbuhi: halaman rumah, kolam, jalan setapak
const AVOID: { x: number; y: number; r: number }[] = [
  ...YARDS.map((h) => ({ x: h.x, y: h.y, r: 66 })),
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
  id: string; x: number; y: number; r: number; s: number; c: string; palm: boolean
}[] = []
const bushes: { id: string; x: number; y: number; s: number; c: string }[] = []

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
      palm
    })
    /* Dua angka dibuang agar sebaran tetap sama seperti sebelumnya. */
    rand()
    rand()
  })

  const bp = scatter(zone.poly, zone.bushes, 26, rand, placed)
  placed.push(...bp)
  bp.forEach(([x, y], i) => {
    bushes.push({
      id: `b${zi}-${i}`,
      x: Math.round(x),
      y: Math.round(y),
      s: +(0.8 + rand() * 0.5).toFixed(2),
      c: BUSH_TINTS[Math.floor(rand() * BUSH_TINTS.length)]
    })
    rand()
    rand()
  })
}

// Pohon yang lebih besar digambar belakangan agar menutup yang di belakangnya.
trees.sort((a, b) => a.y - b.y)

const houses = YARDS

/* =========================================================
   Lanskap di luar gambar denah
   ========================================================= */

/* Area di dalam pagar denah (beserta taman di tepinya) sudah punya isi. */
const SITE: Pt[] = [
  [-6, 535], [175, 625], [335, 318], [670, 165], [1010, 12], [1215, 205], [1160, 510],
  [1085, 735], [1035, 755], [755, 625], [760, 850], [625, 1100], [745, 1275],
  [-6, 1275]
]

/* Taman di dalam kotak denah yang berada di luar SITE: jangan ditumpuk. */
const FILLED: Pt[][] = ZONES.map((zone) => zone.poly).slice(0, 3)

const HOUSES = [
  { id: 'o1', x: -210, y: 372, r: 18, a: '#c4673f', b: '#a9532f' },
  { id: 'o2', x: -318, y: 340, r: 8, a: '#c9824e', b: '#ac6a3a' },
  { id: 'o3', x: -560, y: 468, r: -6, a: '#b8744a', b: '#9a5c37' },
  { id: 'o4', x: 505, y: 1520, r: 64, a: '#c9824e', b: '#ac6a3a' },
  { id: 'o5', x: 668, y: 1545, r: 78, a: '#c4673f', b: '#a9532f' },
  { id: 'o6', x: 690, y: 1830, r: -80, a: '#b8744a', b: '#9a5c37' },
  { id: 'o7', x: 1420, y: 330, r: -32, a: '#c4673f', b: '#a9532f' },
  { id: 'o8', x: 330, y: -270, r: 12, a: '#c9824e', b: '#ac6a3a' }
]

const GROVE_TINTS = ['#548f38', '#467f31', '#619b3f', '#6fa246']
const WILD_BUSH_TINTS = ['#5f9a3f', '#6fa748', '#4e8a38', '#8aae4c']

const wildRand = mulberry32(81126)
const pick = <T>(list: T[]) => list[Math.floor(wildRand() * list.length)]

/* Garis jalan dan sungai yang harus bersih dari tanaman. */
const corridors = [WEST_ROAD, SOUTH_ROAD, WEST_RIVER, SOUTH_RIVER].flatMap((c) => c.points)

function isClear(x: number, y: number, margin: number): boolean {
  return (
    !corridors.some(([cx, cy]) => Math.abs(cx - x) < margin && Math.abs(cy - y) < margin) &&
    !HOUSES.some((h) => Math.hypot(h.x - x, h.y - y) < margin + 20)
  )
}

/* Jarak ke tepi SITE, agar tajuk besar tidak menutupi pagar atau kavling. */
function touchesSite(x: number, y: number, radius: number): boolean {
  return [[0, 0], [radius, 0], [-radius, 0], [0, radius], [0, -radius]].some(([dx, dy]) =>
    [SITE, ...FILLED].some((poly) => inPolygon([x + dx, y + dy], poly))
  )
}

/* Kisi bergeser acak: merata tanpa terlihat berbaris. */
function jitterGrid(step: number, visit: (x: number, y: number) => void) {
  for (let gy = -1500; gy <= 2800; gy += step) {
    for (let gx = -1500; gx <= 2800; gx += step) {
      visit(
        Math.round(gx + (wildRand() - 0.5) * step * 0.85),
        Math.round(gy + (wildRand() - 0.5) * step * 0.85)
      )
    }
  }
}

/* Bercak digambar di atas gambar denah, jadi tidak boleh menyentuh SITE. */
function distanceToSite(x: number, y: number): number {
  if (inPolygon([x, y], SITE)) return 0
  return Math.min(
    ...SITE.map(([ax, ay], i) => {
      const [bx, by] = SITE[(i + 1) % SITE.length]
      const t = Math.max(
        0,
        Math.min(1, ((x - ax) * (bx - ax) + (y - ay) * (by - ay)) / ((bx - ax) ** 2 + (by - ay) ** 2))
      )
      return Math.hypot(x - ax - (bx - ax) * t, y - ay - (by - ay) * t)
    })
  )
}

const patches: { id: string; x: number; y: number; rx: number; ry: number; r: number; fill: string }[] = []
jitterGrid(430, (x, y) => {
  /* Dekat denah, bercak mengecil mengikuti ruang yang tersisa. */
  const rx = Math.min(190 + wildRand() * 170, distanceToSite(x, y))
  if (rx < 70) return
  patches.push({
    id: `p${patches.length}`,
    x,
    y,
    rx: Math.round(rx),
    ry: Math.round(rx * (0.45 + wildRand() * 0.3)),
    r: Math.round(wildRand() * 180),
    fill: wildRand() < 0.55 ? 'url(#sr-meadow)' : 'url(#sr-field)'
  })
})

type Plant = {
  id: string; href: string; x: number; y: number; w: number; h: number
  r: number; s: number; c: string
}
const vegetation: Plant[] = []

function plant(href: string, x: number, y: number, w: number, h: number, s: number, c: string) {
  vegetation.push({ id: `v${vegetation.length}`, href, x, y, w, h, s: +s.toFixed(2), c, r: Math.round(wildRand() * 360) })
}

jitterGrid(175, (x, y) => {
  const roll = wildRand()
  const s = 0.75 + wildRand() * 0.5
  if (roll < 0.52) {
    if (!touchesSite(x, y, 55 * s) && isClear(x, y, 70)) {
      plant('#sr-grove', x, y, 120, 100, s, pick(GROVE_TINTS))
    }
  }
})

/* Pohon tunggal dan semak mengisi sela antar rumpun. */
jitterGrid(118, (x, y) => {
  const roll = wildRand()
  const s = 0.8 + wildRand() * 0.5
  if (roll > 0.5 || touchesSite(x, y, 26 * s) || !isClear(x, y, 46)) return
  if (roll < 0.3) plant('#sc-tree', x, y, 60, 60, s, pick(GROVE_TINTS))
  else plant('#sc-bush', x, y, 28, 28, s, pick(WILD_BUSH_TINTS))
})

/* Yang lebih bawah digambar belakangan agar tumpukannya wajar. */
vegetation.sort((a, b) => a.y - b.y)

/* Dua baris palem mengapit jalan keluar, makin renggang menjauhi denah. */
function fenceAlong(points: Pt[], offset: number, from: number, prefix: string) {
  const line = toLeftLane(points, offset)
  const out: { id: string; x: number; y: number; r: number }[] = []
  let travelled = 0
  let next = from
  let gap = 36
  for (let i = 1; i < line.length && travelled < 900; i++) {
    const [ax, ay] = line[i - 1]
    const [bx, by] = line[i]
    const segment = Math.hypot(bx - ax, by - ay)
    while (segment && next <= travelled + segment) {
      const t = (next - travelled) / segment
      const x = ax + (bx - ax) * t
      const y = ay + (by - ay) * t
      if (!inPolygon([x, y], SITE)) {
        out.push({ id: `${prefix}${out.length}`, x: Math.round(x), y: Math.round(y), r: Math.round(wildRand() * 360) })
      }
      next += gap
      gap *= 1.035
    }
    travelled += segment
  }
  return out
}

const fence = [
  ...fenceAlong(WEST_ROAD.points, 52, 14, 'fw-a'),
  ...fenceAlong(WEST_ROAD.points, -50, 20, 'fw-b'),
  ...fenceAlong(SOUTH_ROAD.points, 50, 24, 'fs-a'),
  ...fenceAlong(SOUTH_ROAD.points, -50, 18, 'fs-b')
]


/* =========================================================
   Perakitan SVG
   ========================================================= */

const fronds = (cx: number, cy: number, rx: number, ry: number) =>
  Array.from(
    { length: 8 },
    (_, i) => `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" transform="rotate(${i * 45})"/>`
  ).join('')

const roofSeams = Array.from({ length: 5 }, (_, i) => {
  const x = (-26 + (i + 1) * 8.6).toFixed(1)
  return `<line x1="${x}" y1="-22" x2="${x}" y2="18"/>`
}).join('')

const use = (href: string, width: number, height: number, transform: string, style: string) =>
  `<use href="${href}" x="${-width / 2}" y="${-height / 2}" width="${width}" height="${height}" transform="${transform}" style="${style}"/>`

const house = (h: { x: number; y: number; r: number; a: string; b: string }) =>
  use('#sc-house', 88, 72, `translate(${h.x} ${h.y}) rotate(${h.r})`, `--roof-a:${h.a};--roof-b:${h.b}`)

const POND = `<g>
      <ellipse cx="1000" cy="1138" rx="88" ry="54" fill="#d6cf9c" opacity="0.9" />
      <ellipse cx="1000" cy="1138" rx="78" ry="46" fill="url(#sc-pond)" stroke="#8fc3d9" stroke-width="2" />
      <ellipse cx="1010" cy="1130" rx="30" ry="18" fill="none" stroke="rgba(255, 255, 255, 0.4)" stroke-width="1.6" />
      <g fill="#5d9a45" stroke="rgba(20,60,20,0.35)" stroke-width="0.8">
        <circle cx="965" cy="1150" r="7" />
        <circle cx="976" cy="1160" r="5" />
        <circle cx="1048" cy="1118" r="6" />
      </g>
      <ellipse cx="978" cy="1118" rx="22" ry="7" fill="rgba(255,255,255,0.28)" transform="rotate(-14 978 1118)" />
    </g>`

export function buildSceneryMarkup(): string {
  const defs = `
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
        <g fill="currentColor" stroke="rgba(22, 48, 20, 0.4)" stroke-width="0.8">${fronds(0, -13, 4.6, 14)}</g>
        <g fill="rgba(255, 255, 255, 0.2)">${fronds(-1, -15, 1.4, 8)}</g>
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
          ${roofSeams}
        </g>
        <rect x="12" y="-18" width="7" height="7" rx="1" fill="#efe6d4" stroke="rgba(0,0,0,0.3)" stroke-width="0.8" />
        <rect x="-5" y="18" width="10" height="16" rx="2" fill="#e5d6b3" />
      </symbol>
      <radialGradient id="sr-meadow">
        <stop offset="0" stop-color="#b3c68a" stop-opacity="0.85" />
        <stop offset="0.7" stop-color="#b3c68a" stop-opacity="0.45" />
        <stop offset="1" stop-color="#b3c68a" stop-opacity="0" />
      </radialGradient>
      <radialGradient id="sr-field">
        <stop offset="0" stop-color="#d6dcab" stop-opacity="0.9" />
        <stop offset="0.7" stop-color="#d6dcab" stop-opacity="0.5" />
        <stop offset="1" stop-color="#d6dcab" stop-opacity="0" />
      </radialGradient>

      <!-- Potongan kecil dari gambar denah agar sambungannya senada -->
      <pattern id="sr-asphalt" width="28" height="28" patternUnits="userSpaceOnUse">
        <image href="${asphaltTile}" width="28" height="28" />
      </pattern>

      <!-- Rumpun: beberapa tajuk sekaligus, cukup satu elemen per rumpun -->
      <symbol id="sr-grove" viewBox="-60 -50 120 100" overflow="visible">
        <g fill="rgba(30, 52, 26, 0.2)">
          <ellipse cx="-20" cy="-4" rx="22" ry="18" />
          <ellipse cx="22" cy="-8" rx="20" ry="17" />
          <ellipse cx="6" cy="22" rx="24" ry="19" />
        </g>
        <g fill="currentColor" stroke="rgba(22, 52, 24, 0.34)" stroke-width="1">
          <circle cx="-26" cy="-12" r="19" />
          <circle cx="16" cy="-17" r="17" />
          <circle cx="-1" cy="12" r="21" />
          <circle cx="32" cy="12" r="12" />
          <circle cx="-33" cy="21" r="10" />
        </g>
        <g fill="rgba(255, 255, 255, 0.17)">
          <circle cx="-31" cy="-18" r="9" />
          <circle cx="12" cy="-23" r="8" />
          <circle cx="-7" cy="4" r="10" />
          <circle cx="30" cy="8" r="5" />
        </g>
      </symbol>
`

  const ground = patches
    .map((p) => `<ellipse cx="${p.x}" cy="${p.y}" rx="${p.rx}" ry="${p.ry}" fill="${p.fill}" transform="rotate(${p.r} ${p.x} ${p.y})"/>`)
    .join('')

  const rivers =
    `<g fill="none"><path d="${WEST_RIVER.d}" stroke="#3a86ae" stroke-width="16.5"/>` +
    `<path d="${SOUTH_RIVER.d}" stroke="#12709a" stroke-width="17"/>` +
    [WEST_RIVER.d, SOUTH_RIVER.d]
      .map((d) => `<path d="${d}" stroke="rgba(255,255,255,0.2)" stroke-width="1.6" stroke-dasharray="14 22"/>`)
      .join('') +
    '</g>'

  /* Digambar di atas sungai. */
  const roads =
    '<g fill="none">' +
    ['#252525', 'url(#sr-asphalt)']
      .map(
        (paint) =>
          `<path d="${WEST_ROAD.d}" stroke="${paint}" stroke-width="28.5"/>` +
          `<path d="${SOUTH_ROAD.d}" stroke="${paint}" stroke-width="27.6"/>`
      )
      .join('') +
    '</g>'

  const wild =
    HOUSES.map(house).join('') +
    vegetation
      .map((v) => use(v.href, v.w, v.h, `translate(${v.x} ${v.y}) rotate(${v.r}) scale(${v.s})`, `color:${v.c}`))
      .join('') +
    fence
      .map((p) => `<image href="${fencePalm}" x="-20" y="-20" width="40" height="40" transform="translate(${p.x} ${p.y}) rotate(${p.r})"/>`)
      .join('')

  const path = 'M906 906 C960 928 1020 936 1082 984'
  const garden =
    `<path d="${path}" fill="none" stroke="#d8c9a2" stroke-width="9" stroke-linecap="round"/>` +
    `<path d="${path}" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="2" stroke-dasharray="1 9" stroke-linecap="round"/>` +
    POND +
    houses.map(house).join('') +
    bushes
      .map((b) => use('#sc-bush', 28, 28, `translate(${b.x} ${b.y}) scale(${b.s})`, `color:${b.c}`))
      .join('') +
    trees
      .map((t) => use(t.palm ? '#sc-palm' : '#sc-tree', 60, 60, `translate(${t.x} ${t.y}) rotate(${t.r}) scale(${t.s})`, `color:${t.c}`))
      .join('')

  /* Tepi lanskap memudar ke warna dasar peta, tanpa garis potong. */
  const { x, y, size } = SCENERY_BOX
  const horizon =
    `<radialGradient id="sc-horizon" cx="626" cy="628" r="${RADIUS}" gradientUnits="userSpaceOnUse">` +
    '<stop offset="0.6" stop-color="#C5D2A5" stop-opacity="0"/>' +
    '<stop offset="0.96" stop-color="#C5D2A5" stop-opacity="1"/></radialGradient>' +
    `<rect x="${x}" y="${y}" width="${size}" height="${size}" fill="url(#sc-horizon)"/>`

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="${x} ${y} ${size} ${size}">` +
    `<defs>${defs}</defs>${ground}${rivers}${roads}${wild}${garden}${horizon}</svg>`
  )
}
