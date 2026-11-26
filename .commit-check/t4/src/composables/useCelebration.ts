import { readonly, ref } from 'vue'

export type CelebrationTone = 'success' | 'rejected'

export interface CelebrationState {
  id: number
  tone: CelebrationTone
  title: string
  message: string
}

const current = ref<CelebrationState | null>(null)
let nextId = 1
let timer: number | undefined

function close() {
  window.clearTimeout(timer)
  current.value = null
}

interface CelebrateOptions {
  title: string
  message?: string
  tone?: CelebrationTone
  /** Lama tampil dalam ms sebelum menutup sendiri. */
  duration?: number
}

/**
 * Layar penuh untuk aksi penting yang sudah selesai (kirim SPK, kirim bukti bayar,
 * verifikasi pembayaran). Aksi kecil tetap memakai useToast.
 */
function celebrate({ title, message = '', tone = 'success', duration = 2800 }: CelebrateOptions) {
  window.clearTimeout(timer)
  current.value = { id: nextId++, tone, title, message }
  try { navigator.vibrate?.(tone === 'success' ? [14, 40, 22] : 24) } catch { /* perangkat tanpa getar */ }
  if (duration > 0) timer = window.setTimeout(close, duration)
}

export function useCelebration() {
  return { current: readonly(current), celebrate, close }
}
