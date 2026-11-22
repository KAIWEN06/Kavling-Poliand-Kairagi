<template>
  <MarketingPageLayout title="Komisi Saya" show-back back-route="/beranda-marketing" @refresh="view?.reload()">
    <section class="mk-intro">
      <p>Komisi</p>
      <h1>Komisi saya</h1>
      <span>Nilai dan status komisi dicatat Admin sesuai kebijakan perusahaan.</span>
    </section>
    <CommissionView ref="view" role="marketing" />
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import CommissionView from '@/components/marketing/shared/CommissionView.vue'

const view = ref<InstanceType<typeof CommissionView> | null>(null)
</script>
