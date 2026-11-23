<template>
  <MarketingPageLayout title="Pembayaran & Cicilan" tab-variant="head" show-back back-route="/kepala-marketing/lainnya" @refresh="view?.reload()">
    <Reveal :order="1">
      <section class="mk-intro">
        <p>Pemantauan pembayaran</p>
        <h1>Pembayaran dan jadwal cicilan klien tim</h1>
        <span>Data sama dengan halaman Admin dan Klien. Verifikasi tetap menjadi kewenangan Admin.</span>
      </section>
    </Reveal>
    <Reveal :order="2">
      <PaymentMonitorView ref="view" role="head" :initial-tab="initialTab" @open-client="(id) => router.push(`/kepala-marketing/clients/${id}`)" />
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
