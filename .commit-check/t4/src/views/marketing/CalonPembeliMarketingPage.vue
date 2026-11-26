<template>
  <!--
    Sebelumnya halaman ini menampilkan data dummy dari marketingProspectService.
    Sekarang membaca tabel customers (dibatasi RLS ke client milik Marketing login).
  -->
  <MarketingPageLayout title="Klien" @refresh="list?.reload()">
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
import { onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { useOwnRouteQuery } from '@/composables/useOwnRouteQuery'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import ClientListView from '@/components/marketing/shared/ClientListView.vue'
import { getStaffProfile } from '@/services/marketing/marketingCrmService'

const query = useOwnRouteQuery()
const router = useIonRouter()
const list = ref<InstanceType<typeof ClientListView> | null>(null)
const profileName = ref('')
const q = (key: string) => {
  const value = query.value[key]
  return typeof value === 'string' ? value : null
}
const initialFilters = computed(() => ({ crmStatus: q('crm'), from: q('from'), to: q('to') }))

/* Halaman tersimpan di tumpukan Ionic: muat ulang saat kembali, mis. setelah menambah klien. */
let entered = false
onIonViewWillEnter(() => {
  if (entered) void list.value?.reload()
  entered = true
})

onMounted(async () => {
  try { profileName.value = (await getStaffProfile()).full_name } catch { /* opsional */ }
})
</script>
