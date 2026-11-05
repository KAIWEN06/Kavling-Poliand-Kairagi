import { createApp } from 'vue'
import App from './App.vue'
import router from './router'

import { IonicVue } from '@ionic/vue'

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

// Dark mode
// Aktifkan hanya jika aplikasi memang menggunakan dark mode system.
// import '@ionic/vue/css/palettes/dark.system.css'

// Theme
import './theme/variables.css'

// Create application
const app = createApp(App)

app
  .use(IonicVue)
  .use(router)

// Tunggu router siap sebelum mounting
router.isReady().then(() => {
  app.mount('#app')
})