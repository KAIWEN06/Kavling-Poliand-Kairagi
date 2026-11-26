import { ref } from 'vue'
import type { Viewer } from '@photo-sphere-viewer/core'
import { GyroscopePlugin } from '@photo-sphere-viewer/gyroscope-plugin'

type PermissionedOrientation = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<'granted' | 'denied'>
}

const SENSOR_TIMEOUT_MS = 1500
const DRAG_PAUSE_PX = 12

/* Izin iOS berlaku selama aplikasi terbuka, jadi kartu penjelasan cukup sekali. */
let permissionGranted = false

function orientationApi(): PermissionedOrientation | null {
  return typeof window !== 'undefined' && 'DeviceOrientationEvent' in window
    ? (window.DeviceOrientationEvent as PermissionedOrientation)
    : null
}

/** Banyak perangkat punya API-nya tanpa sensornya: tunggu data nyata. */
function hasSensorData(): Promise<boolean> {
  return new Promise((resolve) => {
    const finish = (result: boolean) => {
      window.removeEventListener('deviceorientation', listener)
      window.clearTimeout(timer)
      resolve(result)
    }
    const listener = (event: DeviceOrientationEvent) => {
      if (event.alpha !== null) finish(true)
    }
    const timer = window.setTimeout(() => finish(false), SENSOR_TIMEOUT_MS)
    window.addEventListener('deviceorientation', listener)
  })
}

export function useGyroscope(
  getViewer: () => Viewer | null,
  notify: (message: string, ms?: number) => void,
) {
  const enabled = ref(false)
  const busy = ref(false)
  /** Kartu penjelasan sebelum dialog izin sistem (hanya iOS). */
  const askingPermission = ref(false)

  const plugin = () => getViewer()?.getPlugin<GyroscopePlugin>(GyroscopePlugin) ?? null

  function stop(): void {
    try { plugin()?.stop() } catch { /* sudah berhenti */ }
  }

  /** Dipanggil sekali setelah viewer dibuat. Plugin adalah sumber kebenaran status. */
  function bind(): void {
    plugin()?.addEventListener('gyroscope-updated', (event) => {
      enabled.value = event.gyroscopeEnabled
    })
  }

  async function start(message = 'Gerakkan HP untuk melihat sekeliling'): Promise<void> {
    const gyro = plugin()
    if (!gyro || busy.value) return

    const api = orientationApi()
    if (!api) {
      notify('Perangkat ini tanpa sensor gerak. Geser layar untuk melihat sekeliling')
      return
    }

    busy.value = true
    try {
      // Dipanggil sebelum await lain: iOS hanya mengizinkannya langsung dari ketukan.
      if (api.requestPermission && (await api.requestPermission()) !== 'granted') {
        notify('Sensor gerak tidak diizinkan. Geser layar, atau buka ulang aplikasi untuk mencoba lagi', 6000)
        return
      }
      permissionGranted = true

      if (!(await hasSensorData())) {
        notify('Sensor gerak tidak terdeteksi. Geser layar untuk melihat sekeliling', 4500)
        return
      }

      await gyro.start('smooth')
      notify(message, 3500)
    } catch (error) {
      console.error('[Gyroscope]', error)
      notify('Giroskop belum bisa dipakai. Geser layar untuk melihat sekeliling', 4500)
    } finally {
      busy.value = false
    }
  }

  function toggle(): void {
    if (enabled.value) {
      stop()
      notify('Giroskop mati. Geser layar untuk melihat sekeliling', 2500)
      return
    }

    if (orientationApi()?.requestPermission && !permissionGranted) {
      askingPermission.value = true
      return
    }

    void start()
  }

  function allow(): void {
    askingPermission.value = false
    void start()
  }

  /** Kembali ke arah awal. Saat giroskop aktif, arah HP sekarang menjadi titik nol. */
  async function recenter(): Promise<void> {
    const viewer = getViewer()
    if (!viewer || busy.value) return

    const resume = enabled.value
    stop()
    await viewer.animate({ yaw: 0, pitch: 0, zoom: 0, speed: 500 })

    if (resume) await start('Arah pandang dikalibrasi ulang')
    else notify('Kembali ke arah awal', 1800)
  }

  /**
   * Menggeser layar saat giroskop aktif menjedanya, lalu geser bebas.
   * (Mode touchmove bawaan plugin 5.15.1 menghitung offset yang salah.)
   */
  function pauseOnDrag(element: HTMLElement): () => void {
    const pointers = new Map<number, { x: number; y: number }>()

    const down = (e: PointerEvent) => pointers.set(e.pointerId, { x: e.clientX, y: e.clientY })
    const up = (e: PointerEvent) => pointers.delete(e.pointerId)
    const move = (e: PointerEvent) => {
      const from = pointers.get(e.pointerId)
      // Dua jari berarti mencubit untuk zoom; giroskop tetap jalan.
      if (!from || pointers.size !== 1 || !enabled.value) return
      if (Math.hypot(e.clientX - from.x, e.clientY - from.y) < DRAG_PAUSE_PX) return
      stop()
      notify('Giroskop dijeda. Ketuk Giroskop untuk lanjut', 3000)
    }

    element.addEventListener('pointerdown', down, true)
    element.addEventListener('pointermove', move, true)
    window.addEventListener('pointerup', up, true)
    window.addEventListener('pointercancel', up, true)

    return () => {
      element.removeEventListener('pointerdown', down, true)
      element.removeEventListener('pointermove', move, true)
      window.removeEventListener('pointerup', up, true)
      window.removeEventListener('pointercancel', up, true)
    }
  }

  return { enabled, busy, askingPermission, bind, toggle, allow, stop, recenter, pauseOnDrag }
}
