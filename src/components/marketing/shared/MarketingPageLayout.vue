<template>
  <ion-page class="mk-page">
    <AppHeader variant="marketing" />
    <ion-content class="mk-content" :fullscreen="false">
      <ion-refresher slot="fixed" @ionRefresh="onRefresh">
        <ion-refresher-content />
      </ion-refresher>
      <main class="mk-shell">
        <PageHeader :title="title" :show-back="showBack" :back-fallback="backRoute" />
        <slot />
      </main>
    </ion-content>
    <MobileTabBar :variant="tabVariant" />
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonPage, IonRefresher, IonRefresherContent } from '@ionic/vue'
import AppHeader from '@/components/common/AppHeader.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
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
