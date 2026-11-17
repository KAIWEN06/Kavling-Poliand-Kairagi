
import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import { IonicVue } from '@ionic/vue'
import { initializeAuthDeepLinks } from '@/services/authDeepLink'

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

// Tailwind CSS
import './styles/main.css'

// Global Theme
import './theme/variables.css'

// Create application
const app = createApp(App)

app
  .use(IonicVue)
  .use(router)

// Initialize application
async function bootstrap() {
  try {
    // Daftarkan listener callback Google OAuth
    await initializeAuthDeepLinks()

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
