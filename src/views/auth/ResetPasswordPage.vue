<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonContent, IonCard, IonCardHeader, IonCardTitle, IonCardContent, IonInput, IonButton, IonText, IonSpinner } from '@ionic/vue'
import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { supabase } from '@/services/config/supabase'
import { authService } from '@/services/auth/authService'

const router = useRouter()
const password = ref('')
const confirmPassword = ref('')
const loading = ref(false)
const checking = ref(true)
const recoveryAuthorized = ref(false)
const success = ref(false)
const errorMessage = ref('')
let authSubscription: { unsubscribe: () => void } | undefined

onMounted(async () => {
  const { data } = supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    if (event === 'PASSWORD_RECOVERY' && session) recoveryAuthorized.value = true
  })
  authSubscription = data.subscription

  try {
    const session = await authService.getSession()
    const recoveryMarker = window.location.hash.includes('type=recovery') || new URLSearchParams(window.location.search).get('type') === 'recovery'
    if (session && recoveryMarker) recoveryAuthorized.value = true
  } catch {
    errorMessage.value = 'Sesi pemulihan tidak dapat diverifikasi. Minta tautan reset yang baru.'
  } finally {
    checking.value = false
  }
})

onBeforeUnmount(() => authSubscription?.unsubscribe())

async function savePassword() {
  errorMessage.value = ''
  if (password.value.length < 8) {
    errorMessage.value = 'Password minimal 8 karakter.'
    return
  }
  if (password.value !== confirmPassword.value) {
    errorMessage.value = 'Konfirmasi password tidak cocok.'
    return
  }
  if (!recoveryAuthorized.value) {
    errorMessage.value = 'Sesi reset tidak valid atau sudah kedaluwarsa. Minta tautan reset yang baru.'
    return
  }

  loading.value = true
  try {
    await authService.updatePassword(password.value)
    success.value = true
    // Password is already updated; logout failure should not misreport the update as failed.
    try { await authService.logout() } catch { /* User can sign out manually if needed. */ }
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Password belum berhasil diperbarui.'
  } finally {
    loading.value = false
  }
}
</script>

<template>
  <ion-page>
    <ion-content class="auth-content" :fullscreen="true">
      <main class="auth-shell">
        <ion-card class="auth-card">
          <ion-card-header>
            <p class="eyebrow">KEAMANAN AKUN</p>
            <ion-card-title>Buat password baru</ion-card-title>
            <p class="subtitle">Gunakan password baru yang kuat dan tidak digunakan di akun lain.</p>
          </ion-card-header>
          <ion-card-content>
            <ion-text v-if="checking" color="medium"><p class="message">Memeriksa tautan pemulihan...</p></ion-text>
            <ion-text v-else-if="success" color="success"><p class="message">Password berhasil diperbarui. Silakan login menggunakan password baru.</p></ion-text>
            <template v-else-if="recoveryAuthorized">
              <ion-text v-if="errorMessage" color="danger"><p class="message">{{ errorMessage }}</p></ion-text>
              <form class="auth-form" @submit.prevent="savePassword">
                <ion-input v-model="password" type="password" label="Password baru" label-placement="stacked" autocomplete="new-password" required />
                <ion-input v-model="confirmPassword" type="password" label="Konfirmasi password baru" label-placement="stacked" autocomplete="new-password" required />
                <p class="hint">Minimal 8 karakter.</p>
                <ion-button type="submit" expand="block" :disabled="loading">
                  <ion-spinner v-if="loading" name="crescent" />
                  <span v-else>Simpan password baru</span>
                </ion-button>
              </form>
            </template>
            <ion-text v-else color="danger"><p class="message">{{ errorMessage || 'Tautan reset tidak valid atau sudah kedaluwarsa. Silakan minta tautan baru.' }}</p></ion-text>
            <RouterLink v-if="success" class="back-link" to="/login">Masuk ke akun</RouterLink>
            <RouterLink v-else-if="!checking && !recoveryAuthorized" class="back-link" to="/forgot-password">Minta tautan reset baru</RouterLink>
          </ion-card-content>
        </ion-card>
      </main>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.auth-content { --background: var(--ion-background-color, #f5f6f2); }
.auth-shell { min-height: 100%; display: flex; justify-content: center; align-items: center; padding: 28px 16px; }
.auth-card { width: min(100%, 440px); margin: 0; border-radius: 20px; box-shadow: 0 18px 60px rgb(0 0 0 / 8%); }
ion-card-header { padding: 28px 24px 12px; }
ion-card-content { padding: 12px 24px 28px; }
.eyebrow { margin: 0 0 10px; color: var(--ion-color-primary); font-size: 12px; font-weight: 800; letter-spacing: .14em; }
ion-card-title { font-size: 26px; font-weight: 750; }
.subtitle, .hint { color: var(--ion-color-medium); font-size: 14px; line-height: 1.5; }
.auth-form { display: grid; gap: 18px; margin-top: 16px; }
ion-input { --background: var(--ion-item-background, #fff); --padding-start: 12px; border: 1px solid var(--ion-color-step-150, #dfe3dd); border-radius: 10px; }
ion-button { min-height: 46px; }
.message { font-size: 13px; line-height: 1.5; }
.back-link { display: block; margin-top: 18px; text-align: center; color: var(--ion-color-primary); text-decoration: none; font-size: 14px; }
</style>
