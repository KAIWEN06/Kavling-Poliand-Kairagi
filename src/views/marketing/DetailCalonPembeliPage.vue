<template>
  <!--
    Sebelumnya halaman ini membaca prospek dummy (marketingProspects). Sekarang
    memakai ClientDetailView yang membaca customers, SPK, pembayaran, jadwal
    cicilan, dan komisi dari tabel yang sama dengan Admin/Client.
  -->
  <MarketingPageLayout class="mk-client-detail" title="Detail klien" footer show-back :refreshable="false" :back-route="backRoute" @refresh="detail?.reload()">
    <ClientDetailView v-if="customerId" ref="detail" :customer-id="customerId" role="marketing" :viewer-name="profileName" />
    <StatusIllustration v-else variant="not-found-404" size="sm" title="Klien tidak ditemukan" description="Pilih ulang klien dari daftar." />
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import ClientDetailView from '@/components/marketing/shared/ClientDetailView.vue'
import { getStaffProfile } from '@/services/marketing/marketingCrmService'

const route = useRoute()
const detail = ref<InstanceType<typeof ClientDetailView> | null>(null)
const profileName = ref('')
const backRoute = route.path.startsWith('/admin/') ? '/admin/pembeli' : '/marketing/clients'
/* Dibaca sekali: Ionic membuat halaman baru per ID, sedangkan route.params ikut berubah saat pindah halaman. */
const rawId = Number(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id)
const customerId = Number.isInteger(rawId) && rawId > 0 ? rawId : 0

onMounted(async () => {
  try { profileName.value = (await getStaffProfile()).full_name } catch { /* opsional */ }
})
</script>

<style scoped>
/* Seperti detail klien admin: hanya tombol kembali; judul tetap ada untuk pembaca layar. */
.mk-client-detail :deep(.ui-page-header__row) { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.mk-client-detail :deep(.ui-page-header) { margin-bottom: 8px; }
/* Jarak antarbagian diatur oleh isi halaman, bukan celah grid. */
.mk-client-detail :deep(.mk-shell) { gap: 0; padding: 12px 20px 24px; }
</style>
