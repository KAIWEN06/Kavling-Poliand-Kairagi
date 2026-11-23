/**
 * Kurva gerak untuk kode JS (Ionic createAnimation, motion-v).
 * Nilainya HARUS sama dengan token CSS di src/theme/variables.css
 * (--ease-out, --ease-drawer). Ubah di kedua tempat sekaligus.
 */
export const MOTION_EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]
export const MOTION_EASE_DRAWER: [number, number, number, number] = [0.32, 0.72, 0, 1]

const toCss = (c: readonly number[]) => `cubic-bezier(${c.join(', ')})`

export const MOTION_EASE_OUT_CSS = toCss(MOTION_EASE_OUT)
export const MOTION_EASE_DRAWER_CSS = toCss(MOTION_EASE_DRAWER)
