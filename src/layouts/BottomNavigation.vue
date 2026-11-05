<template>
  <ion-tab-bar slot="bottom">
    <ion-tab-button tab="home" @click="go('/home')">
      <ion-icon :icon="homeOutline" />
      <ion-label>Home</ion-label>
    </ion-tab-button>

    <ion-tab-button tab="siteplan" @click="go('/siteplan')">
      <ion-icon :icon="mapOutline" />
      <ion-label>Siteplan</ion-label>
    </ion-tab-button>

    <ion-tab-button tab="progress" @click="go('/progress')">
      <ion-icon :icon="barChartOutline" />
      <ion-label>Progress</ion-label>
    </ion-tab-button>

    <ion-tab-button tab="gallery" @click="go('/gallery')">
      <ion-icon :icon="imagesOutline" />
      <ion-label>Gallery</ion-label>
    </ion-tab-button>

    <ion-tab-button tab="contact" @click="go('/contact')">
      <ion-icon :icon="callOutline" />
      <ion-label>Contact</ion-label>
    </ion-tab-button>
  </ion-tab-bar>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import {
  IonTabBar,
  IonTabButton,
  IonIcon,
  IonLabel
} from '@ionic/vue'
import {
  homeOutline,
  mapOutline,
  barChartOutline,
  imagesOutline,
  callOutline
} from 'ionicons/icons'

const router = useRouter()

function go(path: string) {
  router.push(path)
}
</script>

<style scoped>
ion-tab-bar {
  --background: #ffffff;
  --color: #6b7280;
  --color-selected: #2563eb;
  border-top: 1px solid #e5e7eb;
}
</style>