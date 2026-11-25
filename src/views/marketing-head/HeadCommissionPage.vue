<template>
  <MarketingPageLayout title="Komisi tim" tab-variant="head" show-back back-route="/kepala-marketing/lainnya" @refresh="view?.reload()">
    <Reveal :order="1">
      <CommissionView ref="view" role="head" :focus-id="Number(query.commissionId) || undefined" :focus-stamp="String(query.nt ?? '')" />
    </Reveal>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import Reveal from '@/components/ui/Reveal.vue'
import { ref } from 'vue'
import { useOwnRouteQuery } from '@/composables/useOwnRouteQuery'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import CommissionView from '@/components/marketing/shared/CommissionView.vue'

const query = useOwnRouteQuery()
const view = ref<InstanceType<typeof CommissionView> | null>(null)
</script>
