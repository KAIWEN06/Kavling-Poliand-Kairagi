<template>
  <MarketingPageLayout title="Status SPK" footer show-back back-route="/marketing/more" @refresh="view?.reload()">
    <Reveal :order="1">
      <SpkListView ref="view" role="marketing" :focus-id="Number(query.spkId) || undefined" :focus-stamp="String(query.nt ?? '')" @open-client="(id) => router.push(`/marketing/clients/${id}`)" />
    </Reveal>
    <template #fixed>
      <!-- Form SPK Marketing selalu terikat ke satu kaveling, jadi mulai dari daftar kaveling. -->
      <button slot="fixed" type="button" class="spk-apply-fab" @click="router.push('/kavling')">
        <ion-icon :icon="addOutline" aria-hidden="true" />
        Ajukan SPK
      </button>
    </template>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import Reveal from '@/components/ui/Reveal.vue'
import { ref } from 'vue'
import { IonIcon, useIonRouter } from '@ionic/vue'
import { addOutline } from 'ionicons/icons'
import { useOwnRouteQuery } from '@/composables/useOwnRouteQuery'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import SpkListView from '@/components/marketing/shared/SpkListView.vue'

const router = useIonRouter()
const query = useOwnRouteQuery()
const view = ref<InstanceType<typeof SpkListView> | null>(null)
</script>

<style scoped>
/* Putih di atas --poliland-green (#355A2C): 8,3:1. */
.spk-apply-fab {
  position: fixed;
  z-index: 20;
  right: calc(16px + var(--safe-right));
  bottom: calc(88px + var(--safe-bottom));
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 52px;
  padding: 0 20px 0 16px;
  border: 0;
  border-radius: 999px;
  background: var(--poliland-green);
  color: #fff;
  font-size: 14px;
  font-weight: 800;
  box-shadow: var(--shadow-md);
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-fast) var(--ease-spring);
}
.spk-apply-fab ion-icon { font-size: 22px; }
.spk-apply-fab:active { transform: scale(0.97); }
.spk-apply-fab:focus-visible { outline: 3px solid #78936d; outline-offset: 3px; }
@media (prefers-reduced-motion: reduce) {
  .spk-apply-fab { transition: none; }
}
</style>
