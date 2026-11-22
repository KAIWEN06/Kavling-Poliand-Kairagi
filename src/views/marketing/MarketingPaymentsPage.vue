<template>
  <MarketingPageLayout title="Pembayaran Client" show-back back-route="/marketing/more" @refresh="view?.reload()">
    <section class="mk-intro">
      <p>Pembayaran & jadwal</p>
      <h1>Pembayaran client saya</h1>
      <span>Status verifikasi dan jadwal cicilan resmi, sama dengan yang dilihat Admin dan Client.</span>
    </section>
    <PaymentMonitorView ref="view" role="marketing" :initial-tab="initialTab" @open-client="(id) => router.push(`/marketing/clients/${id}`)" />
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useIonRouter } from '@ionic/vue'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import PaymentMonitorView from '@/components/marketing/shared/PaymentMonitorView.vue'

const route = useRoute()
const router = useIonRouter()
const view = ref<InstanceType<typeof PaymentMonitorView> | null>(null)
const initialTab = computed(() => (route.query.tab === 'schedules' ? 'schedules' : 'payments'))
</script>
