<script setup lang="ts">
import { useRouter } from 'vue-router'
import { IonPage, IonContent, IonButton } from '@ionic/vue'
import { authService } from '@/services/auth/authService'
const router = useRouter()
async function logout() { await authService.logout(); await router.replace('/login') }
</script>
<template>
  <ion-page><ion-content class="role-content" :fullscreen="true"><main class="role-shell"><p class="eyebrow">POLILAND KAIRAGI · ADMIN</p><h1>Beranda Admin</h1><p>Route dan perlindungan role sudah disiapkan. Dashboard admin dan fitur pengelolaan belum dibuat.</p><ion-button @click="logout">Keluar</ion-button></main></ion-content></ion-page>
</template>
<style scoped>
.role-content { --background: var(--ion-background-color, #f5f6f2); }.role-shell { max-width: 760px; margin: 0 auto; padding: 48px 24px; }.eyebrow { color: var(--ion-color-primary); font-size: 12px; font-weight: 800; letter-spacing: .12em; }h1 { font-size: 32px; }p { line-height: 1.6; color: var(--ion-color-medium-shade); }
</style>
