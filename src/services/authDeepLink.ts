
import { App } from '@capacitor/app'
import { Browser } from '@capacitor/browser'
import { Capacitor } from '@capacitor/core'
import { supabase } from '@/services/config/supabase'
import { AUTH_CALLBACK_URL } from '@/services/auth/authService'

let initialized = false
const processedUrls = new Set<string>()

async function handleAuthCallback(url: string) {
  if (!url.startsWith(AUTH_CALLBACK_URL)) {
    return
  }

  // Hindari callback yang sama diproses dua kali.
  if (processedUrls.has(url)) return
  processedUrls.add(url)

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

    const { error } = await supabase.auth.exchangeCodeForSession(code)

    if (error) throw error

    await Browser.close()
  } catch (error) {
    // Izinkan callback yang gagal dicoba kembali jika diperlukan.
    processedUrls.delete(url)

    console.error('Google OAuth callback error:', error)

    await Browser.close().catch(() => undefined)
  }
}

/**
 * Inisialisasi listener deep link Capacitor.
 * Panggil sekali ketika aplikasi mulai berjalan.
 */
export async function initializeAuthDeepLinks() {
  if (!Capacitor.isNativePlatform() || initialized) return

  initialized = true

  // Listener untuk aplikasi yang sedang berjalan.
  await App.addListener('appUrlOpen', async ({ url }) => {
    await handleAuthCallback(url)
  })

  // Menangani kondisi aplikasi dibuka dari keadaan tertutup.
  const launchUrl = await App.getLaunchUrl()

  if (launchUrl?.url) {
    await handleAuthCallback(launchUrl.url)
  }
}
