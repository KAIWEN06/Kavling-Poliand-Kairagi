/**
 * Geometri maket 3D Beranda. Murni (tanpa DOM) agar bisa diuji.
 *
 * Bentuk petak dibaca dari LOTS_WITH_ID.svg tanpa mengubahnya, lalu diproyeksikan
 * miring (ortografis). Proyeksinya afin, jadi gambar Siteplan.webp yang memakai
 * ruang koordinat sama bisa dimiringkan dengan matriks yang identik.
 */
import { mix } from '@/utils/maketMotion'

export type Point = [number, number]

export interface LotShape {
  /** ID path di SVG; kunci pencocokan dengan data kavling. */
  id: string
  /** Titik sudut searah jarum jam di layar (sumbu y ke bawah). */
  points: Point[]
}

/** Potongan Siteplan.webp yang menjadi permukaan maket. Seluruh petak ada di dalamnya. */
export const GROUND = { x: 40, y: 60, width: 1140, height: 1100 }
export const SLAB_DEPTH = 46

const CENTER: Point = [GROUND.x + GROUND.width / 2, GROUND.y + GROUND.height / 2]
const CURVE_STEPS = 6

/** Hanya perintah yang dipakai file denah: M, L, H, V, C, Z (huruf besar, koordinat absolut). */
export const parsePathPoints = (d: string): Point[] => {
  const tokens = d.match(/[A-Za-z]|-?\d*\.?\d+(?:e-?\d+)?/g) ?? []
  const points: Point[] = []
  let command = ''
  let x = 0
  let y = 0
  let i = 0
  const next = () => Number(tokens[i++])

  const push = () => {
    const last = points[points.length - 1]
    if (!last || Math.hypot(last[0] - x, last[1] - y) > 0.6) points.push([x, y])
  }

  while (i < tokens.length) {
    if (/[A-Za-z]/.test(tokens[i])) command = tokens[i++]
    if (command === 'Z') continue
    if (command === 'M' || command === 'L') {
      x = next()
      y = next()
      push()
    } else if (command === 'H') {
      x = next()
      push()
    } else if (command === 'V') {
      y = next()
      push()
    } else if (command === 'C') {
      const [x1, y1, x2, y2, x3, y3] = [next(), next(), next(), next(), next(), next()]
      const [x0, y0] = [x, y]
      for (let step = 1; step <= CURVE_STEPS; step++) {
        const t = step / CURVE_STEPS
        const u = 1 - t
        x = u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3
        y = u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3
        push()
      }
    } else {
      throw new Error(`Perintah path tidak didukung: ${command}`)
    }
  }

  const first = points[0]
  const last = points[points.length - 1]
  if (points.length > 1 && Math.hypot(first[0] - last[0], first[1] - last[1]) <= 0.6) points.pop()
  return points
}

const signedArea = (points: Point[]) =>
  points.reduce((sum, [x, y], i) => {
    const [nx, ny] = points[(i + 1) % points.length]
    return sum + x * ny - nx * y
  }, 0) / 2

const clockwise = (points: Point[]) => (signedArea(points) >= 0 ? points : [...points].reverse())

export const parseLotShapes = (svg: string): LotShape[] =>
  [...svg.matchAll(/<path\s+id="([^"]+)"\s+d="([^"]+)"/g)].map(([, id, d]) => ({
    id,
    points: clockwise(parsePathPoints(d)),
  }))

export interface View {
  /** Putaran bidang tanah, derajat. */
  angle: number
  /** Kemiringan pandang, derajat. 0 = tegak lurus dari atas. */
  tilt: number
  scale: number
}

export const FLAT_VIEW: View = { angle: 0, tilt: 0, scale: 0.8 }
export const TILTED_VIEW: View = { angle: -16, tilt: 50, scale: 1 }

export const mixView = (t: number): View => ({
  angle: mix(FLAT_VIEW.angle, TILTED_VIEW.angle, t),
  tilt: mix(FLAT_VIEW.tilt, TILTED_VIEW.tilt, t),
  scale: mix(FLAT_VIEW.scale, TILTED_VIEW.scale, t),
})

export const createProjector = ({ angle, tilt, scale }: View) => {
  const turn = (angle * Math.PI) / 180
  const lean = (tilt * Math.PI) / 180
  const a = Math.cos(turn) * scale
  const b = Math.sin(turn) * Math.cos(lean) * scale
  const c = -Math.sin(turn) * scale
  const d = Math.cos(turn) * Math.cos(lean) * scale
  const e = CENTER[0] - a * CENTER[0] - c * CENTER[1]
  const f = CENTER[1] - b * CENTER[0] - d * CENTER[1]
  const rise = Math.sin(lean) * scale

  return {
    /** Matriks SVG untuk bidang tanah (tinggi 0). */
    matrix: `matrix(${[a, b, c, d, e, f].map((v) => v.toFixed(5)).join(' ')})`,
    point: ([x, y]: Point, height = 0): Point => [a * x + c * y + e, b * x + d * y + f - height * rise],
    /** Arah hadap sisi p→q. depth > 0 berarti sisinya menghadap penonton. */
    facing: ([px, py]: Point, [qx, qy]: Point) => {
      const nx = qy - py
      const ny = px - qx
      return { side: nx * Math.cos(turn) - ny * Math.sin(turn), depth: nx * Math.sin(turn) + ny * Math.cos(turn) }
    },
  }
}

export type Projector = ReturnType<typeof createProjector>

const fmt = ([x, y]: Point) => `${x.toFixed(1)} ${y.toFixed(1)}`

export const topPath = (points: Point[], projector: Projector, height: number) =>
  `M${points.map((p) => fmt(projector.point(p, height))).join('L')}Z`

/**
 * Sisi tebal yang terlihat, dipisah dua nada: `front` menghadap penonton,
 * `side` lebih menyamping. Sisi yang membelakangi penonton tidak digambar.
 */
export const wallPaths = (points: Point[], projector: Projector, from: number, to: number) => {
  let front = ''
  let side = ''
  points.forEach((p, i) => {
    const q = points[(i + 1) % points.length]
    const facing = projector.facing(p, q)
    if (facing.depth <= 0) return
    const quad = `M${fmt(projector.point(p, to))}L${fmt(projector.point(q, to))}L${fmt(projector.point(q, from))}L${fmt(projector.point(p, from))}Z`
    if (facing.depth >= Math.abs(facing.side)) front += quad
    else side += quad
  })
  return { front, side }
}

export const groundCorners: Point[] = [
  [GROUND.x, GROUND.y],
  [GROUND.x + GROUND.width, GROUND.y],
  [GROUND.x + GROUND.width, GROUND.y + GROUND.height],
  [GROUND.x, GROUND.y + GROUND.height],
]

/** Bingkai tetap mengikuti pandangan miring, sehingga tinggi kartu tidak berubah saat bergerak. */
export const tiltedViewBox = (maxLotHeight: number, margin = 12) => {
  const projector = createProjector(TILTED_VIEW)
  const all = groundCorners.flatMap((p) => [projector.point(p, maxLotHeight), projector.point(p, -SLAB_DEPTH)])
  const xs = all.map((p) => p[0])
  const ys = all.map((p) => p[1])
  const minX = Math.min(...xs) - margin
  const minY = Math.min(...ys) - margin
  return [minX, minY, Math.max(...xs) + margin - minX, Math.max(...ys) + margin - minY].map((v) => Math.round(v)).join(' ')
}

/** Petak terjauh digambar lebih dulu agar petak depan menutupinya dengan benar. */
export const sortByDepth = (shapes: LotShape[]) => {
  const projector = createProjector(TILTED_VIEW)
  const depth = (shape: LotShape) =>
    shape.points.reduce((sum, p) => sum + projector.point(p)[1], 0) / shape.points.length
  return [...shapes].sort((a, b) => depth(a) - depth(b))
}
