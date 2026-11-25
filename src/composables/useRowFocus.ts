import { nextTick, onBeforeUnmount, ref } from 'vue'

const HIGHLIGHT_MS = 4000

/** Menggulir ke data yang dituju notifikasi lalu menyorotnya sebentar (kelas `.notif-target`). */
export function useRowFocus() {
  const focusedId = ref<number | null>(null)
  let timer: number | undefined

  async function focusRow(id: number, elementId: string) {
    focusedId.value = id
    await nextTick()
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    document.getElementById(elementId)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'center' })
    window.clearTimeout(timer)
    timer = window.setTimeout(() => { focusedId.value = null }, HIGHLIGHT_MS)
  }

  onBeforeUnmount(() => window.clearTimeout(timer))

  return { focusedId, focusRow }
}
