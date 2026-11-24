/**
 * Kurva gerak untuk kode JS (Ionic createAnimation, motion-v).
 * Nilainya HARUS sama dengan token CSS di src/theme/variables.css
 * (--ease-out, --ease-drawer). Ubah di kedua tempat sekaligus.
 */
export const MOTION_EASE_OUT: [number, number, number, number] = [0.22, 1, 0.36, 1]
export const MOTION_EASE_DRAWER: [number, number, number, number] = [0.32, 0.72, 0, 1]

/** Modal, sheet, alert: pelan dan lembut (--ease-modal-in / --ease-modal-out). */
export const MOTION_EASE_MODAL_IN: [number, number, number, number] = [0.25, 0.8, 0.25, 1]
export const MOTION_EASE_MODAL_OUT: [number, number, number, number] = [0.4, 0, 0.2, 1]
export const MODAL_ENTER_MS = 520
export const MODAL_LEAVE_MS = 300
export const MODAL_TRAVEL_PX = 40

const toCss = (c: readonly number[]) => `cubic-bezier(${c.join(', ')})`

export const MOTION_EASE_OUT_CSS = toCss(MOTION_EASE_OUT)
export const MOTION_EASE_DRAWER_CSS = toCss(MOTION_EASE_DRAWER)
export const MOTION_EASE_MODAL_IN_CSS = toCss(MOTION_EASE_MODAL_IN)
export const MOTION_EASE_MODAL_OUT_CSS = toCss(MOTION_EASE_MODAL_OUT)
