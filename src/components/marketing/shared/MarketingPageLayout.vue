<template>
  <ion-page :class="['mk-page', { 'pl-marketing': tabVariant === 'marketing' }]">
    <AppHeader variant="marketing" />
    <AppPullRefresh v-if="refreshable" scoped :refresh-handler="onRefresh" />
    <ion-content class="mk-content" :fullscreen="false">
      <div :class="{ 'mk-wrap': footer }">
        <main class="mk-shell">
          <PageHeader :title="title" :subtitle="subtitle" :show-back="showBack" :back-fallback="backRoute" />
          <slot />
        </main>
        <!-- Penutup bukit dan matahari, sama seperti halaman Admin. -->
        <div v-if="footer" class="mk-footer" aria-hidden="true">
          <SceneBackdrop class="mk-footer__scene" height="100%" :sway="false" />
        </div>
      </div>
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
import SceneBackdrop from '@/components/ui/SceneBackdrop.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'

const props = withDefaults(
  defineProps<{ title: string; subtitle?: string; showBack?: boolean; backRoute?: string; tabVariant?: 'marketing' | 'head' | 'owner'; refreshable?: boolean; footer?: boolean }>(),
  { subtitle: undefined, showBack: false, backRoute: undefined, tabVariant: 'marketing', refreshable: true, footer: false },
)
const emit = defineEmits<{ refresh: [] }>()

function onRefresh() {
  // Halaman memuat ulang datanya sendiri; loader tetap tampil minimal MIN_REFRESH_MS.
  emit('refresh')
}

void props
</script>

<style scoped>
.mk-wrap { display: flex; min-height: 100%; flex-direction: column; }
.mk-wrap .mk-shell { flex: 1 0 auto; align-content: start; padding: 16px 20px 24px; }
.mk-footer { position: relative; flex: 0 0 auto; height: calc(200px + var(--safe-bottom)); overflow: hidden; background: linear-gradient(180deg, var(--surface-primary) 0%, var(--pl-paper) 55%); }
.mk-footer__scene :deep(.sun) { top: 0; right: -90px; width: 260px; height: 200px; background: radial-gradient(closest-side, rgba(244, 214, 154, 0.7), rgba(244, 214, 154, 0)); }
</style>
