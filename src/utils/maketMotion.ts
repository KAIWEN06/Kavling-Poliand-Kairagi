/**
 * Hitungan gerak maket kavling di Beranda. Murni (tanpa DOM) agar bisa diuji.
 */

export const clamp01 = (value: number) => Math.min(1, Math.max(0, value))

/** Bagian [start, end] dari progres total, dipetakan ke 0..1 dengan awal dan akhir yang halus. */
export const segment = (progress: number, start: number, end: number) => {
  const t = clamp01((progress - start) / (end - start))
  return t * t * (3 - 2 * t)
}

export const mix = (from: number, to: number, t: number) => from + (to - from) * t

/**
 * Progres dari posisi maket di layar: 0 saat puncaknya di 92% tinggi layar,
 * 1 saat sudah naik sampai 34%.
 */
export const maketProgress = (top: number, viewportHeight: number) => {
  if (viewportHeight <= 0) return 0
  return clamp01((viewportHeight * 0.92 - top) / (viewportHeight * 0.58))
}

/** Jarak yang dianggap sudah sampai; di bawah ini rAF dihentikan. */
export const SETTLE_EPSILON = 0.001

/**
 * Satu langkah interpolasi menuju target. Memakai selisih waktu, jadi terasa
 * sama di layar 60Hz maupun 120Hz.
 */
export const followTarget = (current: number, target: number, elapsedMs: number, timeConstantMs = 90) => {
  const next = current + (target - current) * (1 - Math.exp(-Math.max(0, elapsedMs) / timeConstantMs))
  return Math.abs(target - next) < SETTLE_EPSILON ? target : next
}
