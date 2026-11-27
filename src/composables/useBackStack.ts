import { onBeforeUnmount, watch } from 'vue'
import { useRouter } from 'vue-router'

/**
 * Penangan "kembali" di dalam halaman (mis. level denah). Dipanggil tombol Back
 * Android SEBELUM pindah halaman. Handler mengembalikan true bila Back sudah dipakai.
 */
type BackHandler = () => boolean

const handlers: BackHandler[] = []

export function registerBackHandler(handler: BackHandler): () => void {
  handlers.push(handler)
  return () => {
    const index = handlers.indexOf(handler)
    if (index >= 0) handlers.splice(index, 1)
  }
}

export function runBackHandlers(): boolean {
  return [...handlers].reverse().some((handler) => handler())
}

/**
 * Overlay buatan sendiri (bukan overlay controller Ionic) yang sedang terbuka ditutup
 * lebih dulu oleh tombol Back. Overlay yang terbuka belakangan ditutup duluan.
 * Halaman Ionic tetap tersimpan di belakang, jadi overlay hanya dilayani di rute tempat ia dibuka.
 */
export function useBackToClose(isOpen: () => boolean, close: () => void): void {
  const router = useRouter()
  let release: (() => void) | undefined

  function stop(): void {
    release?.()
    release = undefined
  }

  watch(
    isOpen,
    (open) => {
      stop()
      if (!open) return
      const openedOn = router?.currentRoute.value.path
      release = registerBackHandler(() => {
        if (router?.currentRoute.value.path !== openedOn) return false
        close()
        return true
      })
    },
    { immediate: true },
  )

  onBeforeUnmount(stop)
}
