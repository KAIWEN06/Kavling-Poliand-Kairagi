<template>
  <ion-page>
    <ion-content :fullscreen="true">
      <StatusIllustration
        variant="maintenance"
        size="lg"
        fill
        eager
        style="--status-state-min-height: 100%"
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
const goToHome = () => router.push('/home')
</script>
