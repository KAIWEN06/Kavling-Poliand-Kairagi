<template>
  <ion-page class="settings-page">
    <AppHeader variant="admin" />

    <ion-content :fullscreen="true">
      <main class="st-shell">
        <PageHeader title="Pengaturan" subtitle="Keamanan akun dan informasi aplikasi." show-back />

        <section class="st-card" aria-labelledby="st-account">
          <h2 id="st-account">Akun</h2>
          <button type="button" class="st-row" @click="ionRouter.push('/akun')">
            <span>
              <strong>Profil Saya</strong>
              <small>Nama, foto, dan informasi kontak</small>
            </span>
            <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
          </button>
          <button type="button" class="st-row" :disabled="sendingReset || !profile?.email" @click="sendReset">
            <span>
              <strong>Ubah kata sandi</strong>
              <small>{{ sendingReset ? 'Mengirim tautan...' : 'Kirim tautan penggantian ke email Anda' }}</small>
            </span>
            <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
          </button>
        </section>

        <section class="st-card" aria-labelledby="st-app">
          <h2 id="st-app">Aplikasi</h2>
          <div class="st-row st-row--static">
            <span>
              <strong>PoliLand Kairagi</strong>
              <small>Versi {{ version }}</small>
            </span>
          </div>
        </section>

        <AppButton variant="danger" fill="outline" expand="block" :loading="loggingOut" @click="confirmLogout">
          <ion-icon :icon="logOutOutline" slot="start" aria-hidden="true" />
          <span>Keluar</span>
        </AppButton>
      </main>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IonContent, IonIcon, IonPage, alertController, useIonRouter } from '@ionic/vue'
import { chevronForwardOutline, logOutOutline } from 'ionicons/icons'

import AppHeader from '@/components/common/AppHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useToast } from '@/composables/useToast'
import { authService } from '@/services/auth/authService'

const ionRouter = useIonRouter()
const toast = useToast()
const { profile } = useCurrentUser()

const version = import.meta.env.VITE_APP_VERSION || '1.0.0'
const sendingReset = ref(false)
const loggingOut = ref(false)

async function sendReset() {
  if (!profile.value?.email) return
  sendingReset.value = true
  try {
    await authService.sendPasswordReset(profile.value.email)
    toast.success('Tautan penggantian kata sandi dikirim ke email Anda.')
  } catch (error) {
    toast.error(error instanceof Error ? error.message : 'Tautan gagal dikirim. Coba lagi.')
  } finally {
    sendingReset.value = false
  }
}

async function confirmLogout() {
  const alert = await alertController.create({
    header: 'Keluar dari akun?',
    message: 'Anda perlu masuk kembali untuk mengakses aplikasi.',
    buttons: [
      { text: 'Batal', role: 'cancel' },
      { text: 'Keluar', role: 'confirm' },
    ],
  })
  await alert.present()
  const { role } = await alert.onDidDismiss()
  if (role !== 'confirm') return
  loggingOut.value = true
  try {
    await authService.logout()
  } catch (error) {
    console.error('[Logout] Gagal keluar di server:', error)
  } finally {
    loggingOut.value = false
    ionRouter.replace('/login')
  }
}
</script>

<style scoped>
.st-shell {
  display: grid;
  gap: 16px;
  max-width: 640px;
  margin: 0 auto;
  padding: 16px 16px calc(32px + env(safe-area-inset-bottom, 0px));
}

.st-card {
  display: grid;
  overflow: hidden;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: 18px;
  background: var(--surface-primary, #fff);
}

.st-card h2 {
  margin: 0;
  padding: 14px 18px 6px;
  color: var(--text-secondary, #717178);
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.st-row {
  display: flex;
  min-height: 58px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 18px;
  border: 0;
  border-top: 1px solid var(--border-default, #eae7e0);
  color: var(--text-primary, #252525);
  background: transparent;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.st-row:disabled {
  opacity: 0.5;
  cursor: default;
}

.st-row--static {
  cursor: default;
}

.st-row span {
  display: grid;
  gap: 2px;
}

.st-row strong {
  font-size: 15px;
}

.st-row small {
  color: var(--text-secondary, #717178);
  font-size: 12px;
}

.st-row ion-icon {
  color: var(--text-secondary, #717178);
  font-size: 18px;
}
</style>
