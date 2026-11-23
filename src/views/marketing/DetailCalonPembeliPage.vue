<template>
  <!--
    Sebelumnya halaman ini membaca prospek dummy (marketingProspects). Sekarang
    memakai ClientDetailView yang membaca customers, SPK, pembayaran, jadwal
    cicilan, dan komisi dari tabel yang sama dengan Admin/Client.
  -->
  <MarketingPageLayout title="Detail Calon Pembeli" show-back :refreshable="false" :back-route="backRoute" @refresh="detail?.reload()">
    <ClientDetailView v-if="customerId" ref="detail" :customer-id="customerId" role="marketing" :viewer-name="profileName" />
    <StatusIllustration v-else variant="not-found-404" size="sm" title="Klien tidak ditemukan" description="ID klien tidak valid. Kembali ke daftar klien lalu pilih ulang." />
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import ClientDetailView from '@/components/marketing/shared/ClientDetailView.vue'
import { getStaffProfile } from '@/services/marketing/marketingCrmService'

const route = useRoute()
const detail = ref<InstanceType<typeof ClientDetailView> | null>(null)
const profileName = ref('')
const backRoute = computed(() => (route.path.startsWith('/admin/') ? '/admin/pembeli' : '/marketing/clients'))
const customerId = computed(() => {
  const id = Number(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id)
  return Number.isInteger(id) && id > 0 ? id : 0
})

onMounted(async () => {
  try { profileName.value = (await getStaffProfile()).full_name } catch { /* opsional */ }
})
</script>
