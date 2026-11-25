<template>
  <ion-page class="mk-page">
    <AppHeader variant="marketing" />
    <AppPullRefresh v-if="refreshable" scoped :refresh-handler="onRefresh" />
    <ion-content class="mk-content" :fullscreen="false">
      <main class="mk-shell">
        <PageHeader :title="title" :subtitle="subtitle" :show-back="showBack" :back-fallback="backRoute" />
        <slot />
      </main>
      <!-- Elemen tetap (mis. FAB) di atas konten; beri atribut slot="fixed" pada elemennya. -->
      <slot name="fixed" />
    </ion-content>
    <MobileTabBar :variant="tabVariant" />
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonPage } from '@ionic/vue'
import AppPullRefresh from '@/components/common/AppPullRefresh.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'

const props = withDefaults(
  defineProps<{ title: string; subtitle?: string; showBack?: boolean; backRoute?: string; tabVariant?: 'marketing' | 'head'; refreshable?: boolean }>(),
  { subtitle: undefined, showBack: false, backRoute: undefined, tabVariant: 'marketing', refreshable: true },
)
const emit = defineEmits<{ refresh: [] }>()

function onRefresh() {
  // Halaman memuat ulang datanya sendiri; loader tetap tampil minimal MIN_REFRESH_MS.
  emit('refresh')
}

void props
</script>
