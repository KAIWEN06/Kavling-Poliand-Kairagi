<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
  IonSpinner,
} from '@ionic/vue'
import { logOut } from 'ionicons/icons'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import { authService } from '@/services/auth/authService'

const router = useRouter()
const isLoggingOut = ref(false)
const logoutError = ref('')

async function logout() {
  if (isLoggingOut.value) return

  isLoggingOut.value = true
  logoutError.value = ''

  try {
    await authService.logout()
    await router.replace('/login')
  } catch (error) {
    console.error('Gagal keluar dari akun client.', error)
    logoutError.value = 'Tidak dapat keluar. Silakan coba lagi.'
  } finally {
    isLoggingOut.value = false
  }
}
</script>

<template>
  <ion-page>
    <app-header
      variant="client"
      title="PoliLand Kairagi"
      :show-back="false"
    />

    <ion-content class="account-content" :fullscreen="true">
      <main class="account-page">
        <section class="account-panel" aria-labelledby="account-title">
          <h1 id="account-title">Akun Saya</h1>
          <p>Keluarlah kau</p>

          <ion-button
            class="logout-button"
            color="danger"
            fill="outline"
            expand="block"
            :disabled="isLoggingOut"
            @click="logout"
          >
            <ion-spinner
              v-if="isLoggingOut"
              slot="start"
              name="crescent"
            />
            <ion-icon
              v-else
              slot="start"
              :icon="logOut"
            />
            {{ isLoggingOut ? 'Sedang keluar...' : 'Keluar' }}
          </ion-button>

          <p v-if="logoutError" class="logout-error" role="alert">
            {{ logoutError }}
          </p>
        </section>
      </main>
    </ion-content>

    <mobile-tab-bar variant="client" />
  </ion-page>
</template>

<style scoped>
.account-content {
  --background: var(--app-background, #faf9f6);
}

.account-page {
  width: min(100%, 760px);
  margin: 0 auto;
  padding: 16px 16px 28px;
  color: var(--text-primary, #252525);
  font-family: var(--font-primary, var(--ion-font-family, sans-serif));
}

.account-panel {
  padding: 24px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 2px 4px rgb(37 37 37 / 5%);
}

.account-panel h1 {
  margin: 0;
  font-size: 22px;
  font-weight: var(--font-weight-bold, 700);
}

.account-panel > p:not(.logout-error) {
  margin: 8px 0 20px;
  color: var(--text-secondary, #717178);
  font-size: 14px;
  line-height: 1.5;
}

.logout-button {
  --border-radius: var(--radius-control, 12px);
  --border-width: 1px;
  min-height: 44px;
  margin: 0;
  font-weight: var(--font-weight-semibold, 600);
  text-transform: none;
}

.logout-error {
  margin: 12px 0 0;
  color: var(--status-danger, #d94b45);
  font-size: 14px;
}
</style>