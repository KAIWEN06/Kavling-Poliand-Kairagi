<template>
  <MarketingPageLayout title="Pembayaran Klien" show-back back-route="/marketing/more" @refresh="view?.reload()">
    <Reveal :order="1">
      <section class="mk-intro">
        <p>Pembayaran & jadwal</p>
        <h1>Pembayaran klien saya</h1>
        <span>Status verifikasi dan jadwal cicilan resmi, sama dengan yang dilihat Admin dan Klien.</span>
      </section>
    </Reveal>
    <Reveal :order="2">
      <PaymentMonitorView ref="view" role="marketing" :initial-tab="initialTab" @open-client="(id) => router.push(`/marketing/clients/${id}`)" />
    </Reveal>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import Reveal from '@/components/ui/Reveal.vue'
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
