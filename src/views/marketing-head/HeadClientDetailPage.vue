<template>
  <MarketingPageLayout title="Detail Client" tab-variant="head" :refreshable="false" show-back back-route="/kepala-marketing/clients" @refresh="detail?.reload()">
    <ClientDetailView v-if="customerId" ref="detail" :customer-id="customerId" role="head" :viewer-name="profileName" />
    <div v-else class="mk-state mk-state--error"><strong>ID client tidak valid</strong></div>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import ClientDetailView from '@/components/marketing/shared/ClientDetailView.vue'
import { getStaffProfile } from '@/services/marketing/marketingCrmService'

const route = useRoute()
const detail = ref<InstanceType<typeof ClientDetailView> | null>(null)
const profileName = ref('')
const customerId = computed(() => {
  const id = Number(Array.isArray(route.params.id) ? route.params.id[0] : route.params.id)
  return Number.isInteger(id) && id > 0 ? id : 0
})

onMounted(async () => {
  try { profileName.value = (await getStaffProfile()).full_name } catch { /* opsional */ }
})
</script>
