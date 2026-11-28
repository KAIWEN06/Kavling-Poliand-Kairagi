<script setup lang="ts">
import { ref, watch } from 'vue'
import AppNotice from '@/components/ui/AppNotice.vue'
import { spkRevisionService, type OrderRevision } from '@/services/spkRevisionService'

const props = defineProps<{ transactionId: number; refreshKey?: number }>()
const revision = ref<OrderRevision | null>(null)

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' })

watch(
  () => [props.transactionId, props.refreshKey] as const,
  async ([transactionId]) => {
    try {
      const latest = await spkRevisionService.getLatest(transactionId)
      if (props.transactionId === transactionId) revision.value = latest
    } catch (cause) {
      console.warn('[Revisi Pesanan] Belum dapat dimuat:', cause)
      revision.value = null
    }
  },
  { immediate: true },
)
</script>

<template>
  <AppNotice
    v-if="revision"
    :tone="revision.awaitingSignature ? 'warning' : 'info'"
    :title="`Pesanan direvisi ${formatDate(revision.createdAt)}`"
  >
    <p>{{ revision.reason }}</p>
    <p v-if="revision.awaitingSignature">Tanda tangani ulang dokumen fisik SPK dan tanda jadi bersama Admin.</p>
  </AppNotice>
</template>
