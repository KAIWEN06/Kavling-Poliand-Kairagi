<script setup lang="ts">
import { useRouter } from 'vue-router'
import { IonButton, IonContent, IonPage } from '@ionic/vue'
import { authService } from '@/services/auth/authService'


const router = useRouter()

async function logout() {
  await authService.logout()
  await router.replace('/login')
}
</script>

<template>
  <ion-page>
    <ion-content class="role-content" :fullscreen="true">
      <main class="role-shell">
        <p class="eyebrow">POLILAND KAIRAGI · CLIENT</p>
        <h1>Beranda Client</h1>
        <p>
          Route dan perlindungan role sudah disiapkan. Beranda client dan fitur
          khusus pembeli belum dibuat.
        </p>
        <ion-button @click="logout">Keluar</ion-button>
      </main>
    </ion-content>
  </ion-page>
</template>

<style scoped>
.role-content {
  --background: var(--app-background, #faf9f6);
}

.role-shell {
  max-width: 760px;
  margin: 0 auto;
  padding: 48px 24px;
  color: var(--text-primary, #252525);
}

.eyebrow {
  color: var(--poliland-green, #355a2c);
  font-size: var(--font-size-xs, 12px);
  font-weight: var(--font-weight-extrabold, 800);
  letter-spacing: 0.12em;
}

h1 {
  font-size: var(--font-size-4xl, 32px);
  font-weight: var(--font-weight-bold, 700);
}

p {
  color: var(--text-secondary, #717178);
  line-height: 1.6;
}
</style>
