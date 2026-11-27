import { onBeforeUnmount, onMounted, watch, type Ref } from 'vue'
import { onIonViewDidLeave } from '@ionic/vue'
import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import { authCallbackBusy } from '@/services/authDeepLink'

// Jeda agar deep link sempat tiba: tab Google juga "selesai" saat login berhasil.
const CALLBACK_GRACE_MS = 800

/** Mengakhiri spinner tombol Google saat login selesai, gagal, atau dibatalkan. */
export function useGoogleAuthSpinner(googleLoading: Ref<boolean>) {
  let timer: number | undefined
  let handle: PluginListenerHandle | undefined
  let unmounted = false

  watch(authCallbackBusy, (busy) => {
    googleLoading.value = busy
  })

  // Ionic menyimpan halaman, jadi spinner lama bisa muncul lagi setelah logout.
  onIonViewDidLeave(() => {
    googleLoading.value = false
  })

  // Web: tombol Kembali dari Google memulihkan halaman dari bfcache.
  function handlePageShow(event: PageTransitionEvent) {
    if (event.persisted) googleLoading.value = false
  }

  onMounted(async () => {
    window.addEventListener('pageshow', handlePageShow)
    if (!Capacitor.isNativePlatform()) return

    const listener = await Browser.addListener('browserFinished', () => {
      window.clearTimeout(timer)
      timer = window.setTimeout(() => {
        if (!authCallbackBusy.value) googleLoading.value = false
      }, CALLBACK_GRACE_MS)
    })
    if (unmounted) void listener.remove()
    else handle = listener
  })

  onBeforeUnmount(() => {
    unmounted = true
    window.clearTimeout(timer)
    window.removeEventListener('pageshow', handlePageShow)
    void handle?.remove()
  })
}
