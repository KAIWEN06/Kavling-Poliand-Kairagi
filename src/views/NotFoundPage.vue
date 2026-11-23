<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <StatusIllustration
        variant="not-found-404"
        size="lg"
        fill
        eager
        style="--status-state-min-height: 100%"
        action-label="Kembali ke Beranda"
        :on-action="goToHome"
      />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage, IonContent } from '@ionic/vue'
import { useRouter } from 'vue-router'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'

const router = useRouter()
const goToHome = () => router.push('/')
</script>
