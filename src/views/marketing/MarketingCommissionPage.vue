<template>
  <MarketingPageLayout title="Komisi Saya" show-back back-route="/marketing/more" @refresh="view?.reload()">
    <Reveal :order="1">
      <section class="mk-intro">
        <p>Komisi</p>
        <h1>Komisi saya</h1>
        <span>Nilai dan status komisi dicatat Admin sesuai kebijakan perusahaan.</span>
      </section>
    </Reveal>
    <Reveal :order="2">
      <CommissionView ref="view" role="marketing" />
    </Reveal>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import Reveal from '@/components/ui/Reveal.vue'
import { ref } from 'vue'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import CommissionView from '@/components/marketing/shared/CommissionView.vue'

const view = ref<InstanceType<typeof CommissionView> | null>(null)
</script>
