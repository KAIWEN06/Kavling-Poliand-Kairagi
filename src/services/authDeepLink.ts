
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { ref } from 'vue'
import type { RouteLocationRaw, Router } from 'vue-router'
import { supabase } from '@/services/config/supabase'
import { AUTH_CALLBACK_URL, authService } from '@/services/auth/authService'
import { resolveHome } from '@/services/auth/resolveHome'
import { sharedLotPath } from '@/utils/shareLot'

/** True selama callback diproses; halaman Masuk dan Daftar menahan spinner Google selama ini. */
export const authCallbackBusy = ref(false)

let initialized = false
const processedUrls = new Set<string>()

// Menutup browser saja tidak memindahkan halaman: WebView masih di halaman Masuk.
async function goTo(router: Router, target: RouteLocationRaw) {
  // Saat aplikasi dibuka dari deep link, navigasi awal harus selesai dulu.
  await router.isReady()
  await router.replace(target)
}

async function handleAuthCallback(router: Router, url: string) {
  if (!url.startsWith(AUTH_CALLBACK_URL)) {
    return
  }

  // Hindari callback yang sama diproses dua kali.
  if (processedUrls.has(url)) return
  processedUrls.add(url)
  authCallbackBusy.value = true

  try {
    const callbackUrl = new URL(url)

    const errorDescription =
      callbackUrl.searchParams.get('error_description') ||
      callbackUrl.searchParams.get('error')

    if (errorDescription) {
      throw new Error(errorDescription)
    }

    const code = callbackUrl.searchParams.get('code')

    if (!code) {
      throw new Error(
        'Authorization code tidak ditemukan pada callback Google.',
      )
    }

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) throw error

    await Browser.close().catch(() => undefined)

    // Tautan reset kata sandi memakai callback yang sama dengan login Google.
    const isRecovery = 'redirectType' in data && data.redirectType === 'recovery'

    await goTo(router, isRecovery ? '/reset-password' : await resolveHome(data.session.user.id))
  } catch (error) {
    // Izinkan callback yang gagal dicoba kembali jika diperlukan.
    processedUrls.delete(url)

    console.error('Google OAuth callback error:', error)

    await Browser.close().catch(() => undefined)

    // Kode yang sudah terpakai (mis. launch URL dibaca ulang) tidak masalah bila sesi sudah ada.
    // Halaman lain dibiarkan; hanya halaman publik yang dipindahkan.
    await router.isReady()
    const session = await authService.getSession().catch(() => null)
    if (!session) {
      await goTo(router, { name: 'Login', query: { error: 'oauth_failed' } })
    } else if (router.currentRoute.value.meta.publicOnly) {
      await goTo(router, await resolveHome(session.user.id))
    }
  } finally {
    authCallbackBusy.value = false
  }
}

/**
 * Inisialisasi listener deep link Capacitor.
 * Panggil sekali ketika aplikasi mulai berjalan.
 */
export async function initializeAuthDeepLinks(router: Router) {
  if (!Capacitor.isNativePlatform() || initialized) return

  initialized = true

  // Listener untuk aplikasi yang sedang berjalan.
  await App.addListener('appUrlOpen', async ({ url }) => {
    const lotPath = sharedLotPath(url)
    // push: tombol Back kembali ke layar yang sedang dibuka sebelum tautan diketuk.
    if (lotPath) await router.push(lotPath)
    else await handleAuthCallback(router, url)
  })

  // Menangani kondisi aplikasi dibuka dari keadaan tertutup.
  const launchUrl = await App.getLaunchUrl()

  if (launchUrl?.url) {
    const lotPath = sharedLotPath(launchUrl.url)
    // Guard mengarahkan pengguna yang sudah masuk ke halaman kavling sesuai role.
    if (lotPath) await goTo(router, lotPath)
    else await handleAuthCallback(router, launchUrl.url)
  }
}
