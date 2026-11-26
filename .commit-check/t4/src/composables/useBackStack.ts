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
