<template>
  <MarketingPageLayout title="Status SPK" subtitle="Pengajuan SPK klien tim." tab-variant="head" show-back back-route="/kepala-marketing/lainnya" @refresh="view?.reload()">
    <Reveal :order="1">
      <SpkListView ref="view" role="head" :focus-id="Number(query.spkId) || undefined" :focus-stamp="String(query.nt ?? '')" @open-client="(id) => router.push(`/kepala-marketing/clients/${id}`)" />
    </Reveal>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import Reveal from '@/components/ui/Reveal.vue'
import { ref } from 'vue'
import { useIonRouter } from '@ionic/vue'
import { useOwnRouteQuery } from '@/composables/useOwnRouteQuery'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import SpkListView from '@/components/marketing/shared/SpkListView.vue'

const router = useIonRouter()
const query = useOwnRouteQuery()
const view = ref<InstanceType<typeof SpkListView> | null>(null)
</script>
