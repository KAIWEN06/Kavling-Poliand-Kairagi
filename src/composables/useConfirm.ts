import { readonly, shallowRef } from 'vue'
import type { ToastTone } from '@/composables/useToast'

export interface ConfirmOptions {
  title: string
  message?: string
  confirmText?: string
  cancelText?: string
  /** 'error' untuk aksi yang menghapus atau tidak bisa dibatalkan. */
  tone?: ToastTone
  /** Hanya pemberitahuan: tanpa tombol batal. */
  hideCancel?: boolean
}

export interface ConfirmRequest extends ConfirmOptions {
  id: number
}

const current = shallowRef<ConfirmRequest | null>(null)
const open = shallowRef(false)
let resolver: ((ok: boolean) => void) | undefined
let nextId = 1

function settle(ok: boolean) {
  open.value = false
  const done = resolver
  resolver = undefined
  done?.(ok)
}

/** Dialog ya/tidak. Hasilnya true hanya bila tombol konfirmasi ditekan. */
function confirm(options: ConfirmOptions): Promise<boolean> {
  settle(false) // permintaan lama yang belum dijawab dianggap batal
  current.value = { ...options, id: nextId++ }
  open.value = true
  return new Promise((resolve) => { resolver = resolve })
}

/** Pemberitahuan yang harus dibaca, ditutup dengan satu tombol. */
function alert(options: ConfirmOptions): Promise<boolean> {
  return confirm({ confirmText: 'Mengerti', ...options, hideCancel: true })
}

export function useConfirm() {
  return { current: readonly(current), open: readonly(open), confirm, alert, settle }
}
