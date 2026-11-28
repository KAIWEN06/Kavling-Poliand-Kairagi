<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonContent, IonSpinner, IonText } from '@ionic/vue'
import { authService } from '@/services/auth/authService'
import { authErrorMessage } from '@/services/auth/authErrorMessage'
import { consumePostLoginRedirect } from '@/services/auth/postLoginRedirect'

const router = useRouter()
const message = ref('Menyelesaikan proses masuk...')

onMounted(async () => {
  try {
    const session = await authService.getSession()
    if (!session) {
      // Tidak ada sesi: jangan menahan pengguna di halaman callback.
      await router.replace({ name: 'Login', query: { error: 'oauth_failed' } })
      return
    }

    const role = await authService.getUserRole(session.user.id)
    const destination = authService.getRoleHomePath(role)
    if (!destination) {
      message.value = 'Akun Anda belum punya hak akses. Hubungi admin PoliLand.'
      return
    }

    await router.replace(consumePostLoginRedirect(role) ?? destination)
  } catch (error) {
    message.value = authErrorMessage(error, 'Belum berhasil masuk dengan Google. Silakan coba lagi.')
  }
})
</script>

<template>
  <ion-page>
    <ion-content class="callback-content" :fullscreen="true">
      <main class="callback-shell">
        <ion-spinner v-if="message.includes('Menyelesaikan')" name="crescent" />
        <h1>Masuk dengan Google</h1>
        <ion-text color="medium"><p>{{ message }}</p></ion-text>
        <RouterLink v-if="!message.includes('Menyelesaikan')" to="/login">Kembali ke halaman masuk</RouterLink>
      </main>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.callback-content { --background: var(--ion-background-color, #f5f6f2); }
.callback-shell { min-height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 14px; padding: 24px; text-align: center; }
h1 { font-size: 24px; }
p { max-width: 420px; line-height: 1.5; }
a { color: var(--ion-color-primary); text-decoration: none; }
</style>
