/**
 * Matematika kamera denah. Murni (tanpa DOM) agar bisa diuji.
 *
 * Peta adalah elemen seukuran viewport yang diberi
 *   translate(panX, panY) scale(scale) rotate(rotation)
 * dengan titik asal di tengah. SVG di dalamnya dipaskan (meet) ke elemen itu.
 */
export interface Camera {
  panX: number
  panY: number
  scale: number
  rotation: number
}

export interface Rect {
  x: number
  y: number
  width: number
  height: number
}

export interface Size {
  width: number
  height: number
}

export interface Insets {
  top: number
  right: number
  bottom: number
  left: number
}

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v))

function rotate(x: number, y: number, degrees: number): [number, number] {
  const a = (degrees * Math.PI) / 180
  const cos = Math.cos(a)
  const sin = Math.sin(a)
  return [x * cos - y * sin, x * sin + y * cos]
}

export function fitScaleOf(size: Size, viewBox: Rect): number {
  return Math.min(size.width / viewBox.width, size.height / viewBox.height)
}

/** Titik koordinat SVG menjadi posisi layar relatif sudut kiri atas viewport. */
export function worldToScreen(
  x: number,
  y: number,
  camera: Camera,
  size: Size,
  viewBox: Rect,
): { x: number; y: number } {
  const fit = fitScaleOf(size, viewBox)
  const [rx, ry] = rotate(
    (x - viewBox.x - viewBox.width / 2) * fit,
    (y - viewBox.y - viewBox.height / 2) * fit,
    camera.rotation,
  )
  return {
    x: size.width / 2 + camera.panX + rx * camera.scale,
    y: size.height / 2 + camera.panY + ry * camera.scale,
  }
}

/** Kamera yang membingkai `rect` di tengah area yang tidak tertutup UI. */
export function frameRect(
  rect: Rect,
  options: {
    size: Size
    viewBox: Rect
    rotation: number
    insets: Insets
    minScale: number
    maxScale: number
  },
): Camera {
  const { size, viewBox, rotation, insets, minScale, maxScale } = options
  const fit = fitScaleOf(size, viewBox)
  const availableWidth = Math.max(80, size.width - insets.left - insets.right)
  const availableHeight = Math.max(80, size.height - insets.top - insets.bottom)

  const a = (rotation * Math.PI) / 180
  const cos = Math.abs(Math.cos(a))
  const sin = Math.abs(Math.sin(a))
  const boxWidth = (rect.width * cos + rect.height * sin) * fit
  const boxHeight = (rect.width * sin + rect.height * cos) * fit

  const scale = clamp(
    Math.min(availableWidth / boxWidth, availableHeight / boxHeight),
    minScale,
    maxScale,
  )

  const [cx, cy] = rotate(
    (rect.x + rect.width / 2 - viewBox.x - viewBox.width / 2) * fit,
    (rect.y + rect.height / 2 - viewBox.y - viewBox.height / 2) * fit,
    rotation,
  )

  return {
    panX: (insets.left - insets.right) / 2 - cx * scale,
    panY: (insets.top - insets.bottom) / 2 - cy * scale,
    scale,
    rotation,
  }
}

/** Zoom berpusat pada titik layar (relatif terhadap tengah viewport). */
export function zoomAround(camera: Camera, nextScale: number, pointX: number, pointY: number): Camera {
  const ratio = nextScale / camera.scale
  return {
    ...camera,
    scale: nextScale,
    panX: pointX - (pointX - camera.panX) * ratio,
    panY: pointY - (pointY - camera.panY) * ratio,
  }
}

const RHO = 1.42

/* Tujuan sejauh ini (dalam lebar pandang) masih "terlihat": tak perlu mundur dulu. */
const DIRECT_REACH = 0.9

/** Lama penerbangan kamera, dalam milidetik. */
export const FLIGHT_MIN_MS = 840
export const FLIGHT_MAX_MS = 1100

/* Jeda terlama yang dihitung per frame: dua frame di layar 60 Hz. */
const MAX_FRAME_MS = 34

/**
 * Jam animasi berbasis selisih waktu. Pada 60 Hz maupun 120 Hz lajunya sama;
 * setelah frame tersendat, kamera melanjutkan dari posisinya, tidak meloncat.
 */
export function advanceClock(elapsed: number, delta: number): number {
  return elapsed + clamp(delta, 0, MAX_FRAME_MS)
}

/** Padanan cubic-bezier() CSS: waktu 0..1 menjadi kemajuan 0..1. */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  const axis = (a: number, b: number, u: number) =>
    ((1 - 3 * b + 3 * a) * u * u + (3 * b - 6 * a) * u + 3 * a) * u
  return (t: number): number => {
    if (t <= 0) return 0
    if (t >= 1) return 1
    let low = 0
    let high = 1
    for (let i = 0; i < 24; i++) {
      const mid = (low + high) / 2
      if (axis(x1, x2, mid) < t) low = mid
      else high = mid
    }
    return axis(y1, y2, (low + high) / 2)
  }
}

/*
 * Mulai lembut (kecepatan awal ~1,1x rata-rata), melambat panjang di akhir.
 * cubic-bezier(0.22, 1, 0.36, 1) mulai di ~4,5x rata-rata sehingga frame
 * pertama kamera terasa meloncat.
 */
export const cameraEase = cubicBezier(0.32, 0.36, 0.16, 1)

export interface Flight {
  duration: number
  /** progress 0..1 (waktu linear); easing sudah termasuk. */
  at: (progress: number) => Camera
}

/**
 * Lintasan kamera. Tujuan yang dekat: zoom dan geser dalam satu gerak, sehingga
 * titik tujuan bergerak lurus di layar. Tujuan yang jauh memakai lintasan
 * van Wijk & Nuij (2003): mundur sedikit dulu, lalu menukik.
 */
export function createFlight(from: Camera, to: Camera, size: Size): Flight {
  // Pusat pandang dalam koordinat peta yang belum diputar.
  const centerOf = (c: Camera) => rotate(-c.panX / c.scale, -c.panY / c.scale, -c.rotation)
  const [x0, y0] = centerOf(from)
  const [x1, y1] = centerOf(to)
  const w0 = size.width / from.scale
  const w1 = size.width / to.scale
  const dx = x1 - x0
  const dy = y1 - y0
  const distance = Math.hypot(dx, dy)
  const turn = ((((to.rotation - from.rotation) % 360) + 540) % 360) - 180

  let length: number
  let sample: (s: number) => { travel: number; width: number }

  if (distance <= Math.max(w0, w1) * DIRECT_REACH) {
    length = Math.abs(Math.log(w1 / w0)) / RHO + distance / Math.max(w0, w1)
    sample = (s) => {
      const part = length ? s / length : 1
      /* Zoom geometris: terasa sama cepat di skala kecil maupun besar. */
      const width = w0 * (w1 / w0) ** part
      const travel = Math.abs(w1 - w0) < 1e-6 ? part : (width - w0) / (w1 - w0)
      return { travel, width }
    }
  } else {
    const rho2 = RHO * RHO
    const b0 = (w1 * w1 - w0 * w0 + rho2 * rho2 * distance * distance) / (2 * w0 * rho2 * distance)
    const b1 = (w1 * w1 - w0 * w0 - rho2 * rho2 * distance * distance) / (2 * w1 * rho2 * distance)
    const r0 = -Math.asinh(b0)
    const r1 = -Math.asinh(b1)
    length = (r1 - r0) / RHO
    sample = (s) => ({
      travel: (w0 / (rho2 * distance)) * (Math.cosh(r0) * Math.tanh(RHO * s + r0) - Math.sinh(r0)),
      width: (w0 * Math.cosh(r0)) / Math.cosh(RHO * s + r0),
    })
  }

  return {
    duration: Math.round(
      clamp(FLIGHT_MIN_MS + length * 130 + Math.abs(turn), FLIGHT_MIN_MS, FLIGHT_MAX_MS),
    ),
    at(progress) {
      if (progress >= 1) return { ...to }
      const t = cameraEase(progress)
      const { travel, width } = sample(t * length)
      const scale = size.width / width
      const rotation = from.rotation + turn * t
      const [px, py] = rotate(x0 + dx * travel, y0 + dy * travel, rotation)
      return { panX: -px * scale, panY: -py * scale, scale, rotation }
    },
  }
}
