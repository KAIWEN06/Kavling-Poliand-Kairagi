import { readonly, ref } from 'vue'

export type ToastTone = 'success' | 'error' | 'info' | 'warning'

export interface ToastOptions {
  title?: string
  /** Lama tampil dalam ms. 0 = menetap sampai ditutup. */
  duration?: number
  /** Rute halaman atau data terkait. Mengetuk toast membukanya. */
  to?: string
  /** Aksi khusus saat diketuk; dipakai bila tujuan perlu diperiksa dulu. */
  onTap?: () => void
  /** Teks tombol tujuan. Bawaan: "Lihat". */
  actionLabel?: string
  /** Identitas pesan; toast berbeda tidak saling mengganti walau teksnya sama. */
  key?: string
}

export interface ToastItem {
  id: number
  tone: ToastTone
  message: string
  title: string
  duration: number
  to?: string
  onTap?: () => void
  /** Kosong bila toast tidak punya tujuan. */
  actionLabel: string
  key: string
}

/** Toast yang bisa diketuk diberi waktu lebih lama agar sempat diraih. */
const MIN_ACTION_DURATION = 7000

const DEFAULT_DURATION: Record<ToastTone, number> = {
  success: 3800,
  info: 4200,
  warning: 5000,
  error: 6000,
}

const items = ref<ToastItem[]>([])
let nextId = 1

// Timer disimpan per toast supaya bisa dijeda saat toast ditahan jari.
const timers = new Map<number, { handle?: number; remaining: number; startedAt: number }>()

function dismiss(id: number) {
  window.clearTimeout(timers.get(id)?.handle)
  timers.delete(id)
  items.value = items.value.filter((t) => t.id !== id)
}

function resume(id: number) {
  const timer = timers.get(id)
  if (!timer || timer.handle !== undefined) return
  timer.startedAt = Date.now()
  timer.handle = window.setTimeout(() => dismiss(id), timer.remaining)
}

function pause(id: number) {
  const timer = timers.get(id)
  if (!timer || timer.handle === undefined) return
  window.clearTimeout(timer.handle)
  timer.handle = undefined
  timer.remaining = Math.max(0, timer.remaining - (Date.now() - timer.startedAt))
}

function push(tone: ToastTone, message: string, options: ToastOptions = {}) {
  const title = options.title ?? ''
  const { to, onTap } = options
  const actionable = Boolean(to || onTap)
  const actionLabel = actionable ? options.actionLabel ?? 'Lihat' : ''
  const duration = options.duration
    ?? (actionable ? Math.max(DEFAULT_DURATION[tone], MIN_ACTION_DURATION) : DEFAULT_DURATION[tone])
  const key = options.key ?? [tone, title, message, to ?? ''].join('|')
  // Pesan yang sama tidak ditumpuk: yang lama diganti dan hitungannya mulai lagi.
  for (const t of items.value) {
    if (t.key === key) dismiss(t.id)
  }
  // Maksimal 3 toast; yang terlama dibuang
  for (const t of items.value.slice(0, -2)) dismiss(t.id)

  const id = nextId++
  items.value = [...items.value, { id, tone, message, title, duration, to, onTap, actionLabel, key }]
  if (duration > 0) {
    timers.set(id, { remaining: duration, startedAt: 0 })
    resume(id)
  }
  return id
}

/** Satu-satunya pintu pesan sementara. Pesan: apa yang terjadi + langkah berikutnya bila gagal. */
export function useToast() {
  return {
    items: readonly(items),
    dismiss,
    pause,
    resume,
    show: push,
    success: (m: string, o?: ToastOptions) => push('success', m, o),
    error: (m: string, o?: ToastOptions) => push('error', m, o),
    info: (m: string, o?: ToastOptions) => push('info', m, o),
    warning: (m: string, o?: ToastOptions) => push('warning', m, o),
  }
}
