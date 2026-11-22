<template>
  <MarketingPageLayout title="Status SPK Client" show-back back-route="/marketing/more" @refresh="view?.reload()">
    <section class="mk-intro">
      <p>Pengajuan SPK</p>
      <h1>Status SPK client saya</h1>
      <span>Jika SPK ditolak, alasan penolakan ditampilkan agar Anda dapat membantu client memperbaiki pengajuan.</span>
    </section>
    <SpkListView ref="view" role="marketing" @open-client="(id) => router.push(`/marketing/clients/${id}`)" />
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
