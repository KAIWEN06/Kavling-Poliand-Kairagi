<template>
  <MarketingPageLayout title="Pengajuan Client" tab-variant="head" show-back back-route="/kepala-marketing/lainnya" @refresh="view?.reload()">
    <section class="mk-intro">
      <p>Pengajuan SPK tim</p>
      <h1>Status SPK seluruh Marketing</h1>
      <span>Status mengikuti sistem transaksi Admin: Menunggu, Ditolak, Terkonfirmasi.</span>
    </section>
    <SpkListView ref="view" role="head" @open-client="(id) => router.push(`/kepala-marketing/clients/${id}`)" />
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useIonRouter } from '@ionic/vue'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import SpkListView from '@/components/marketing/shared/SpkListView.vue'

const router = useIonRouter()
const view = ref<InstanceType<typeof SpkListView> | null>(null)
</script>
