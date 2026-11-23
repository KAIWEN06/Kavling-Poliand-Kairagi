<template>
  <MarketingPageLayout title="Data Klien" tab-variant="head" @refresh="list?.reload()">
    <ClientListView
      ref="list"
      role="head"
      :sender-name="profileName"
      :initial-filters="initialFilters"
      @open="(id) => router.push(`/kepala-marketing/clients/${id}`)"
      @add="router.push('/kepala-marketing/clients/new')"
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

const q = (key: string) => (typeof route.query[key] === 'string' ? (route.query[key] as string) : null)
const initialFilters = computed(() => ({
  crmStatus: q('crm'),
  marketingId: q('marketing'),
  from: q('from'),
  to: q('to'),
}))

onMounted(async () => {
  try { profileName.value = (await getStaffProfile()).full_name } catch { /* nama pengirim WA opsional */ }
})
</script>
