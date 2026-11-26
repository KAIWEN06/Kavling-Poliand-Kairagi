/**
 * Geometri jalan, sungai, dan rute mobil pada denah. Murni (tanpa DOM).
 *
 * Koordinat memakai ruang gambar Siteplan.webp (1252 x 1257). Titik di dalam
 * gambar diukur dari piksel aspal; bila gambar denah diganti, ukur ulang.
 */
export type Pt = [number, number]

type Cubic = [Pt, Pt, Pt]

interface Curve {
  start: Pt
  segments: Cubic[]
}

/* =========================================================
   Sambungan ke luar gambar. Titik awal menumpuk sedikit di dalam
   tepi gambar agar tidak ada celah; ujungnya melewati area pudar.
   ========================================================= */

function extension(curve: Curve) {
  const d =
    `M${curve.start.join(' ')}` +
    curve.segments.map((s) => ` C${s.map((p) => p.join(' ')).join(' ')}`).join('')
  return { d, points: sampleCurve(curve) }
}

function sampleCurve({ start, segments }: Curve, steps = 24): Pt[] {
  const out: Pt[] = [start]
  let from = start
  for (const [c1, c2, to] of segments) {
    for (let i = 1; i <= steps; i++) {
      const t = i / steps
      const u = 1 - t
      const at = (k: 0 | 1) =>
        u * u * u * from[k] + 3 * u * u * t * c1[k] + 3 * u * t * t * c2[k] + t * t * t * to[k]
      out.push([at(0), at(1)])
    }
    from = to
  }
  return out
}

export const WEST_ROAD = extension({
  start: [13, 617.6],
  segments: [
    [[-11, 601], [-38, 583], [-60, 568]],
    [[-250, 439], [-520, 400], [-820, 392]],
    [[-1180, 382], [-1520, 262], [-2000, 214]]
  ]
})

export const SOUTH_ROAD = extension({
  start: [440, 1236.5],
  segments: [
    [[454, 1254], [468, 1272], [478, 1285]],
    [[566, 1400], [606, 1510], [594, 1690]],
    [[580, 1900], [668, 2300], [640, 3060]]
  ]
})

export const WEST_RIVER = extension({
  start: [11, 833],
  segments: [
    [[-1, 819.5], [-13, 806], [-24, 793]],
    [[-100, 708], [-230, 696], [-390, 722]],
    [[-640, 762], [-860, 836], [-1150, 770]],
    [[-1480, 696], [-1720, 780], [-2000, 760]]
  ]
})

export const SOUTH_RIVER = extension({
  start: [649.5, 1238.5],
  segments: [
    [[664, 1256.5], [678, 1275], [690, 1290]],
    [[772, 1392], [900, 1432], [938, 1566]],
    [[978, 1708], [880, 1920], [960, 2220]],
    [[1030, 2480], [980, 2780], [1000, 3060]]
  ]
})

/* =========================================================
   Garis tengah jalan di dalam gambar
   ========================================================= */

/* Pintu barat menuju simpang selatan. */
const WEST_TO_HUB: Pt[] = [
  [7, 614], [100, 677], [150, 711], [196, 740], [226, 751], [270, 761],
  [234, 877], [265, 924], [330, 944], [398, 958]
]

/* Simpang selatan menuju tepi bawah gambar. */
const HUB_TO_SOUTH: Pt[] = [
  [398, 958], [392, 986], [384, 1018], [375, 1050], [372, 1086], [376, 1120],
  [388, 1150], [401, 1176], [415, 1200], [435, 1230], [446.5, 1245]
]

/* Simpang selatan, naik jalan utama, lalu ke ujung timur laut. */
const HUB_TO_NORTH: Pt[] = [
  [398, 958], [414, 929], [466, 783], [518, 636], [556, 523], [566, 497],
  [592, 470], [700, 415], [861, 337], [992, 273]
]

const reversed = (points: Pt[]): Pt[] => [...points].reverse()

/** Menggabungkan potongan rute tanpa titik ganda di sambungan. */
function chain(...parts: Pt[][]): Pt[] {
  const out: Pt[] = []
  for (const part of parts) {
    for (const p of part) {
      const last = out[out.length - 1]
      if (last && Math.hypot(p[0] - last[0], p[1] - last[1]) < 1) continue
      out.push(p)
    }
  }
  return out
}

/** Menggeser garis ke lajur kiri arah laju (lalu lintas Indonesia). */
export function toLeftLane(points: Pt[], offset: number): Pt[] {
  const normal = (a: Pt, b: Pt): Pt => {
    const length = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1
    return [(b[1] - a[1]) / length, -(b[0] - a[0]) / length]
  }
  return points.map((p, i) => {
    const before = i > 0 ? normal(points[i - 1], p) : null
    const after = i < points.length - 1 ? normal(p, points[i + 1]) : null
    const a = before ?? after!
    const b = after ?? before!
    const sum: Pt = [a[0] + b[0], a[1] + b[1]]
    /* Sambungan miter, dibatasi agar tikungan tajam tidak menjulur keluar aspal. */
    const stretch = offset / Math.max(1, 1 + a[0] * b[0] + a[1] * b[1])
    return [p[0] + sum[0] * stretch, p[1] + sum[1] * stretch] as Pt
  })
}

/** Membulatkan sudut rute, agar mobil berbelok, bukan berputar di tempat. */
export function roundCorners(points: Pt[], radius = 16): Pt[] {
  const toward = (from: Pt, to: Pt, distance: number): Pt => {
    const length = Math.hypot(to[0] - from[0], to[1] - from[1]) || 1
    const k = Math.min(distance, length / 2) / length
    return [from[0] + (to[0] - from[0]) * k, from[1] + (to[1] - from[1]) * k]
  }

  const out: Pt[] = [points[0]]
  for (let i = 1; i < points.length - 1; i++) {
    const p = points[i]
    const a = toward(p, points[i - 1], radius)
    const b = toward(p, points[i + 1], radius)
    for (let step = 0; step <= 4; step++) {
      const t = step / 4
      const u = 1 - t
      const at = (k: 0 | 1) => u * u * a[k] + 2 * u * t * p[k] + t * t * b[k]
      out.push([at(0), at(1)])
    }
  }
  out.push(points[points.length - 1])
  return out
}

export function lengthOf(points: Pt[]): number {
  return points.reduce(
    (sum, p, i) => (i ? sum + Math.hypot(p[0] - points[i - 1][0], p[1] - points[i - 1][1]) : 0),
    0
  )
}

/*
 * Setiap rute mulai dan berakhir jauh di luar area pudar, jadi mobil tidak
 * pernah muncul atau hilang di depan mata.
 */
const westIn = reversed(WEST_ROAD.points)
const southIn = reversed(SOUTH_ROAD.points)
const LANE = 6.5

const westToSouth = toLeftLane(
  chain(westIn, WEST_TO_HUB, HUB_TO_SOUTH, SOUTH_ROAD.points),
  LANE
)

const southToWest = toLeftLane(
  chain(southIn, reversed(HUB_TO_SOUTH), reversed(WEST_TO_HUB), WEST_ROAD.points),
  LANE
)

/* Keliling kavling utara: pergi di satu lajur, pulang di lajur seberang. */
const northVisit = chain(southIn, reversed(HUB_TO_SOUTH), HUB_TO_NORTH)
const northTour = chain(
  toLeftLane(northVisit, LANE),
  toLeftLane(reversed(northVisit), LANE)
)

export const CAR_ROUTES = {
  westToSouth,
  southToWest,
  northTour
} satisfies Record<string, Pt[]>

/* Satuan gambar per detik. */
export const CAR_SPEED = 62

/* Satu putaran bersama; rute pendek menunggu di ujungnya (di luar pandangan). */
export const CAR_CYCLE = Math.ceil(
  Math.max(...Object.values(CAR_ROUTES).map(lengthOf)) / CAR_SPEED
)
