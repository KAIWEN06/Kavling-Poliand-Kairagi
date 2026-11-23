<template>
  <MarketingPageLayout title="Status SPK Klien" show-back back-route="/marketing/more" @refresh="view?.reload()">
    <Reveal :order="1">
      <section class="mk-intro">
        <p>Pengajuan SPK</p>
        <h1>Status SPK klien saya</h1>
        <span>Jika SPK ditolak, alasan penolakan ditampilkan agar Anda dapat membantu klien memperbaiki pengajuan.</span>
      </section>
    </Reveal>
    <Reveal :order="2">
      <SpkListView ref="view" role="marketing" @open-client="(id) => router.push(`/marketing/clients/${id}`)" />
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
