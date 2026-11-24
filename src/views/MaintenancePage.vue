<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <PublicStateScreen
        title="Sedang dirapikan"
        description="Kami sedang memperbarui layanan. Coba lagi beberapa saat lagi."
        action-label="Kembali ke Beranda"
        @action="goToHome"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue'
import { useRouter } from 'vue-router'
import PublicStateScreen from '@/components/ui/PublicStateScreen.vue'

const router = useRouter()
const goToHome = () => router.push('/home')
</script>
