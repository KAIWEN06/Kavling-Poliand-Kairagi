<template>
  <MarketingPageLayout title="Komisi" show-back back-route="/marketing/more" @refresh="view?.reload()">
    <Reveal :order="1">
      <CommissionView ref="view" role="marketing" :focus-id="Number(query.commissionId) || undefined" :focus-stamp="String(query.nt ?? '')" />
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
