<template>
  <MarketingPageLayout title="Pengajuan Klien" tab-variant="head" show-back back-route="/kepala-marketing/lainnya" @refresh="view?.reload()">
    <Reveal :order="1">
      <section class="mk-intro">
        <p>Pengajuan SPK tim</p>
        <h1>Status SPK seluruh Marketing</h1>
        <span>Status mengikuti sistem transaksi Admin: Menunggu, Ditolak, Terkonfirmasi.</span>
      </section>
    </Reveal>
    <Reveal :order="2">
      <SpkListView ref="view" role="head" @open-client="(id) => router.push(`/kepala-marketing/clients/${id}`)" />
    </Reveal>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import Reveal from '@/components/ui/Reveal.vue'
import { ref } from 'vue'
import { useIonRouter } from '@ionic/vue'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import SpkListView from '@/components/marketing/shared/SpkListView.vue'

const router = useIonRouter()
const view = ref<InstanceType<typeof SpkListView> | null>(null)
</script>
