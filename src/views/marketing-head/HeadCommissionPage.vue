<template>
  <MarketingPageLayout title="Komisi Tim" tab-variant="head" show-back back-route="/kepala-marketing/lainnya" @refresh="view?.reload()">
    <Reveal :order="1">
      <section class="mk-intro">
        <p>Komisi Marketing</p>
        <h1>Komisi seluruh anggota tim</h1>
        <span>Ditampilkan dari data komisi yang dicatat Admin. Aturan perhitungan tidak diubah oleh halaman ini.</span>
      </section>
    </Reveal>
    <Reveal :order="2">
      <CommissionView ref="view" role="head" />
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
