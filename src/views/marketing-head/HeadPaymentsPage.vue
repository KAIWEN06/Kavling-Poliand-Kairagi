<template>
  <MarketingPageLayout title="Pembayaran" subtitle="Verifikasi dilakukan Admin." tab-variant="head" show-back back-route="/kepala-marketing/lainnya" @refresh="view?.reload()">
    <Reveal :order="1">
      <PaymentMonitorView ref="view" role="head" :focus-id="Number(query.paymentId) || undefined" :focus-stamp="String(query.nt ?? '')" :initial-tab="initialTab" @open-client="(id) => router.push(`/kepala-marketing/clients/${id}`)" />
    </Reveal>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import Reveal from '@/components/ui/Reveal.vue'
import { computed, ref } from 'vue'
import { useOwnRouteQuery } from '@/composables/useOwnRouteQuery'
import { useIonRouter } from '@ionic/vue'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import PaymentMonitorView from '@/components/marketing/shared/PaymentMonitorView.vue'

const query = useOwnRouteQuery()
const router = useIonRouter()
const view = ref<InstanceType<typeof PaymentMonitorView> | null>(null)
const initialTab = computed(() => (query.value.tab === 'schedules' ? 'schedules' : 'payments'))
</script>
