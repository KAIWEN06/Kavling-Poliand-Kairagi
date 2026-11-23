import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Mengikuti preferensi sistem `prefers-reduced-motion`.
 * Dipakai komponen animasi JS (motion-v) yang tidak tercakup aturan CSS global.
 */
export function useReducedMotion() {
  const reduced = ref(false)
  let query: MediaQueryList | null = null

  const sync = () => {
    reduced.value = query?.matches === true
  }

  onMounted(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    query = window.matchMedia('(prefers-reduced-motion: reduce)')
    sync()
    query.addEventListener('change', sync)
  })

  onBeforeUnmount(() => query?.removeEventListener('change', sync))

  return reduced
}
