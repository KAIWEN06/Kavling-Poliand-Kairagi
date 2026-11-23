
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import { IonicVue } from '@ionic/vue'
import { initializeAuthDeepLinks } from '@/services/authDeepLink'
import { authService } from '@/services/auth/authService'
import { consumeOAuthUrlError } from '@/services/auth/authUrlError'
import { poliPageTransition } from '@/utils/pageTransition'

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

      if (destination) {
        await router.replace(destination)
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
