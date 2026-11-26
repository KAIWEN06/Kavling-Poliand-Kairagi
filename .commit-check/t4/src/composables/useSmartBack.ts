import { useIonRouter } from '@ionic/vue'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { authService } from '@/services/auth/authService'

/**
 * Satu-satunya mekanisme "kembali" di aplikasi.
 *  1. Ada riwayat navigasi  -> kembali ke halaman sebelumnya (bukan paksa ke Dashboard).
 *  2. Tidak ada riwayat     -> fallback aman (halaman induk yang diberikan,
 *                              atau beranda sesuai role), memakai replace
 *                              agar tidak membuat loop riwayat.
 */
export function useSmartBack(fallback?: () => string | undefined) {
  const ionRouter = useIonRouter()
  const { profile } = useCurrentUser()

  function resolveFallback(): string {
    return fallback?.() || authService.getRoleHomePath(profile.value?.role ?? null) || '/home'
  }

  function goBack() {
    if (ionRouter.canGoBack()) {
      ionRouter.back()
      return
    }
    ionRouter.replace(resolveFallback())
  }

  return { goBack }
}
