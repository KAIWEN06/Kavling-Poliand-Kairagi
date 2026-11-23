import { readonly, ref } from 'vue'

export type ToastTone = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: number
  tone: ToastTone
  message: string
}

const items = ref<ToastItem[]>([])
let nextId = 1

function dismiss(id: number) {
  items.value = items.value.filter((t) => t.id !== id)
}

function push(tone: ToastTone, message: string, duration = 3800) {
  const id = nextId++
  // Maksimal 3 toast; yang terlama dibuang
  items.value = [...items.value.slice(-2), { id, tone, message }]
  if (duration > 0) window.setTimeout(() => dismiss(id), duration)
  return id
}

/** Satu-satunya pintu feedback sementara. Pesan: apa yang terjadi + langkah berikutnya bila gagal. */
export function useToast() {
  return {
    items: readonly(items),
    dismiss,
    success: (m: string) => push('success', m),
    error: (m: string) => push('error', m, 6000),
    info: (m: string) => push('info', m),
    warning: (m: string) => push('warning', m, 5000),
  }
}
