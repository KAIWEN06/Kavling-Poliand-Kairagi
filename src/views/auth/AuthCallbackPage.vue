<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonPage, IonContent, IonSpinner, IonText } from '@ionic/vue'
import { authService } from '@/services/auth/authService'

const router = useRouter()
const message = ref('Menyelesaikan login Google...')

onMounted(async () => {
  try {
    const session = await authService.getSession()
    if (!session) {
      message.value = 'Sesi Google tidak ditemukan. Silakan coba login kembali.'
      return
    }

    const role = await authService.getUserRole(session.user.id)
    const destination = authService.getRoleHomePath(role)
    if (!destination) {
      message.value = 'Akun Google berhasil diverifikasi, tetapi role belum diberikan. Hubungi administrator PoliLand.'
      return
    }

    await router.replace(destination)
  } catch (error) {
    message.value = error instanceof Error ? error.message : 'Login Google gagal diselesaikan.'
  }
})
</script>

<template>
  <ion-page>
    <ion-content class="callback-content" :fullscreen="true">
      <main class="callback-shell">
        <ion-spinner v-if="message.includes('Menyelesaikan')" name="crescent" />
        <h1>Autentikasi PoliLand</h1>
        <ion-text color="medium"><p>{{ message }}</p></ion-text>
        <RouterLink v-if="!message.includes('Menyelesaikan')" to="/login">Kembali ke login</RouterLink>
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
