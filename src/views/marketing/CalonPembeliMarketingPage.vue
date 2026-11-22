<template>
  <!--
    Sebelumnya halaman ini menampilkan data dummy dari marketingProspectService.
    Sekarang membaca tabel customers (dibatasi RLS ke client milik Marketing login).
  -->
  <MarketingPageLayout title="Calon Pembeli" @refresh="list?.reload()">
    <ClientListView
      ref="list"
      role="marketing"
      :sender-name="profileName"
      :initial-filters="initialFilters"
      @open="(id) => router.push(`/marketing/clients/${id}`)"
      @add="router.push('/marketing/clients/new')"
    />
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import { useIonRouter } from '@ionic/vue'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import ClientListView from '@/components/marketing/shared/ClientListView.vue'
import { getStaffProfile } from '@/services/marketing/marketingCrmService'

const route = useRoute()
const router = useIonRouter()
const list = ref<InstanceType<typeof ClientListView> | null>(null)
const profileName = ref('')
const initialFilters = computed(() => ({ crmStatus: typeof route.query.crm === 'string' ? route.query.crm : null }))

onMounted(async () => {
  try { profileName.value = (await getStaffProfile()).full_name } catch { /* opsional */ }
})
</script>
