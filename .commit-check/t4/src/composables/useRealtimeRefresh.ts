import { getCurrentInstance, onMounted, onUnmounted, watch } from 'vue'
import { useRouter } from 'vue-router'
import { subscribeToTables } from '@/services/realtime/realtimeHub'

/** Opsi untuk fungsi pemuat data: `silent` berarti tanpa skeleton dan tanpa mereset tampilan. */
export interface LoadOptions {
  silent?: boolean
}

interface RealtimeRefreshOptions {
  /** Tahan pembaruan selama true, mis. saat form atau modal berisi isian pengguna. */
  pauseWhen?: () => unknown
}

/** Sinyal beruntun (satu aksi menyentuh banyak tabel) digabung menjadi satu muat ulang. */
const DEBOUNCE_MS = 600
/** Acak agar banyak perangkat tidak meminta data pada milidetik yang sama. */
const JITTER_MS = 400
/** Jarak minimal antar muat ulang pada tabel yang sering berubah. */
const MIN_INTERVAL_MS = 3000
/** Waktu tunggu transisi halaman Ionic sebelum memeriksa ulang apakah halaman tampil. */
const PAGE_SETTLE_MS = [450, 1200]

/**
 * Memuat ulang data otomatis saat tabel terkait berubah di database.
 *
 * `reload` wajib senyap: tanpa skeleton, tidak mereset filter, paginasi, atau form,
 * dan tidak mengganti data yang tampil dengan layar galat bila gagal.
 * Pull-to-refresh tetap berjalan terpisah.
 *
 * Halaman yang tersimpan di cache Ionic tidak langsung memuat ulang. Perubahan
 * ditandai dan diambil saat halaman itu tampil lagi.
 */
export function useRealtimeRefresh(
  tables: readonly string[],
  reload: () => unknown,
  options: RealtimeRefreshOptions = {},
) {
  const instance = getCurrentInstance()
  const router = useRouter()

  let dirty = false
  let running = false
  let lastRun = 0
  let timer: number | undefined
  let settleTimers: number[] = []
  let cleanups: Array<() => void> = []

  function isOnScreen() {
    if (document.visibilityState === 'hidden') return false
    const root = instance?.proxy?.$el as Node | undefined
    // Komponen berakar ganda memberi node teks/komentar; pakai elemen induknya.
    const element = root instanceof Element ? root : root?.parentElement
    return !element?.closest('.ion-page-hidden, .ion-page-invisible')
  }

  function canRun() {
    return !running && !options.pauseWhen?.() && isOnScreen()
  }

  function schedule() {
    if (!dirty || timer !== undefined || !canRun()) return
    const wait = Math.max(DEBOUNCE_MS, lastRun + MIN_INTERVAL_MS - Date.now()) + Math.random() * JITTER_MS
    timer = window.setTimeout(run, wait)
  }

  async function run() {
    timer = undefined
    // Keadaan bisa berubah selama menunggu; `dirty` tetap tersimpan untuk kesempatan berikutnya.
    if (!canRun()) return
    dirty = false
    running = true
    try {
      await reload()
    } catch (error) {
      console.warn('[Realtime] Gagal memperbarui data:', error)
    } finally {
      running = false
      lastRun = Date.now()
      schedule()
    }
  }

  function scheduleAfterTransition() {
    if (!dirty) return
    settleTimers.forEach((id) => window.clearTimeout(id))
    settleTimers = PAGE_SETTLE_MS.map((delay) => window.setTimeout(schedule, delay))
  }

  onMounted(() => {
    cleanups = [
      subscribeToTables(tables, () => {
        dirty = true
        schedule()
      }),
      router.afterEach(scheduleAfterTransition),
    ]
    document.addEventListener('visibilitychange', schedule)
    cleanups.push(() => document.removeEventListener('visibilitychange', schedule))
  })

  if (options.pauseWhen) {
    watch(
      () => Boolean(options.pauseWhen?.()),
      (paused) => {
        if (!paused) schedule()
      },
      { flush: 'post' },
    )
  }

  onUnmounted(() => {
    cleanups.forEach((cleanup) => cleanup())
    window.clearTimeout(timer)
    settleTimers.forEach((id) => window.clearTimeout(id))
    dirty = false
  })
}
