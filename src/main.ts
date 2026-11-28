
import { createApp } from 'vue'
import { Capacitor } from '@capacitor/core'
import App from './App.vue'
import router from './router'

import { IonicVue } from '@ionic/vue'
import { initializeAuthDeepLinks } from '@/services/authDeepLink'
import { authService } from '@/services/auth/authService'
import { consumePostLoginRedirect } from '@/services/auth/postLoginRedirect'
import { consumeOAuthUrlError } from '@/services/auth/authUrlError'
import { roleNotificationService } from '@/services/notification/roleNotificationService'
import { useNotifications } from '@/composables/useNotifications'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { poliPageTransition } from '@/utils/pageTransition'
import { installInputGuard } from '@/utils/inputGuard'
import { alertEnterAnimation, alertLeaveAnimation } from '@/utils/modalAnimation'

// Ionic Core
import '@ionic/vue/css/core.css'

// Ionic Base
import '@ionic/vue/css/normalize.css'
import '@ionic/vue/css/structure.css'
import '@ionic/vue/css/typography.css'

// Ionic Utilities
import '@ionic/vue/css/padding.css'
import '@ionic/vue/css/float-elements.css'
import '@ionic/vue/css/text-alignment.css'
import '@ionic/vue/css/text-transformation.css'
import '@ionic/vue/css/flex-utils.css'
import '@ionic/vue/css/display.css'

// Local application font
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/plus-jakarta-sans/600.css'
import '@fontsource/plus-jakarta-sans/700.css'
import '@fontsource/plus-jakarta-sans/800.css'
// Font display (judul dan angka besar)
import '@fontsource-variable/fraunces'

// Tailwind CSS
import './styles/main.css'
import './styles/marketing-module.css'

// Global Theme
import './theme/variables.css'
import './theme/poliland-look.css'
import './theme/notify.css'
import './theme/admin-look.css'

// Di aplikasi Android, MainActivity sudah memberi inset: safe area CSS harus 0 (variables.css).
if (Capacitor.getPlatform() === 'android') {
  document.documentElement.classList.add('native-insets')
}

// Filter input global (angka/huruf/email sesuai jenis field)
installInputGuard()

// Create application
const app = createApp(App)

app
  .use(IonicVue, {
    // Tombol Back Android hanya ditangani App.vue. Bila true, Ionic ikut mundur satu
    // halaman pada tekanan yang sama (dobel mundur).
    hardwareBackButton: false,
    navAnimation: poliPageTransition,
    alertEnter: alertEnterAnimation,
    alertLeave: alertLeaveAnimation,
    // MainActivity sudah mengecilkan WebView saat keyboard terbuka. Padding bawaan Ionic di
    // ion-content (aktif karena Keyboard.resize = 'none') akan menghitung keyboard dua kali.
    ...(Capacitor.getPlatform() === 'android' ? { scrollPadding: false } : {}),
  })
  .use(router)

// Initialize application
async function bootstrap() {
  try {
    // Daftarkan listener callback Google OAuth
    await initializeAuthDeepLinks(router)

    // Callback OAuth yang sudah terpakai: bersihkan URL lalu arahkan ke login.
    const oauthError = consumeOAuthUrlError()
    if (oauthError) {
      // Router harus siap dulu agar replace tidak bentrok dengan navigasi awal.
      await router.isReady()

      // Callback ganda: login pertama biasanya sudah berhasil. Jika sesi ada,
      // langsung masuk ke beranda sesuai role, bukan menampilkan error.
      let destination: string | null = null
      try {
        const session = await authService.getSession()
        if (session) {
          const role = await authService.getUserRole(session.user.id)
          destination = consumePostLoginRedirect(role) ?? authService.getRoleHomePath(role) ?? null
        }
      } catch {
        // Lanjut ke halaman login.
      }

      const RETRY_KEY = 'poliland_oauth_auto_retry'
      let retried = false
      try {
        retried = sessionStorage.getItem(RETRY_KEY) === '1'
        if (destination || retried) sessionStorage.removeItem(RETRY_KEY)
      } catch {
        // sessionStorage tidak tersedia; anggap sudah pernah dicoba.
        retried = true
      }

      if (destination) {
        await router.replace(destination)
      } else if (oauthError === 'oauth_state_used' && !retried) {
        // State OAuth terpakai/kedaluwarsa: mulai ulang login Google sekali
        // dengan state baru. Sesi Google masih aktif sehingga berjalan mulus.
        try {
          sessionStorage.setItem(RETRY_KEY, '1')
          await authService.signInWithGoogle()
          return // browser sedang dialihkan ke Google
        } catch {
          sessionStorage.removeItem(RETRY_KEY)
          await router.replace({ name: 'Login', query: { error: oauthError } })
        }
      } else {
        await router.replace({ name: 'Login', query: { error: oauthError } })
      }
    }

    // Tunggu router siap sebelum mounting
    await router.isReady()

    // Mount application
    app.mount('#app')

    // Siapkan jalur notifikasi sejak awal: tap yang membuka aplikasi dari keadaan tertutup
    // tidak boleh menunggu halaman ber-header tampil. Urutan penting: pendengar profil dulu.
    void roleNotificationService.init()
    useNotifications()
    useCurrentUser()
  } catch (error) {
    console.error('Application initialization error:', error)

    // Tetap mount aplikasi agar tidak blank screen
    await router.isReady()
    app.mount('#app')
  }
}

bootstrap()
