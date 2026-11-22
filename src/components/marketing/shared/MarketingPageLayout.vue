<template>
  <ion-page class="mk-page">
    <AppHeader variant="marketing" :title="title" :show-back="showBack" :back-route="backRoute" />
    <ion-content class="mk-content" :fullscreen="false">
      <ion-refresher slot="fixed" @ionRefresh="onRefresh">
        <ion-refresher-content />
      </ion-refresher>
      <main class="mk-shell">
        <slot />
      </main>
    </ion-content>
    <MobileTabBar :variant="tabVariant" />
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'

const props = withDefaults(
  defineProps<{ title: string; showBack?: boolean; backRoute?: string; tabVariant?: 'marketing' | 'head' }>(),
  { showBack: false, backRoute: undefined, tabVariant: 'marketing' },
)
const emit = defineEmits<{ refresh: [] }>()

async function onRefresh(event: CustomEvent) {
  emit('refresh')
  // Halaman memuat ulang datanya sendiri; tutup indikator tarik-segarkan.
  window.setTimeout(() => (event.target as HTMLIonRefresherElement | null)?.complete(), 600)
}

void props
</script>
