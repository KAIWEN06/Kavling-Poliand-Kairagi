
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import { IonicVue } from '@ionic/vue'
import { initializeAuthDeepLinks } from '@/services/authDeepLink'
import { authService } from '@/services/auth/authService'
import { consumeOAuthUrlError } from '@/services/auth/authUrlError'
import { poliPageTransition } from '@/utils/pageTransition'
import { installInputGuard } from '@/utils/inputGuard'

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

// Filter input global (angka/huruf/email sesuai jenis field)
installInputGuard()

// Create application
const app = createApp(App)

app
  .use(IonicVue, { navAnimation: poliPageTransition })
  .use(router)

// Initialize application
async function bootstrap() {
  try {
    // Daftarkan listener callback Google OAuth
    await initializeAuthDeepLinks()

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
          destination = authService.getRoleHomePath(role) ?? null
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
  } catch (error) {
    console.error('Application initialization error:', error)

    // Tetap mount aplikasi agar tidak blank screen
    await router.isReady()
    app.mount('#app')
  }
}

bootstrap()
