<script setup lang="ts">
import { ref } from 'vue'
import ArrearsPanel from './ArrearsPanel.vue'
import DirectCancelModal from './DirectCancelModal.vue'
import RefundPanel from './RefundPanel.vue'
import './cancellation.css'

defineProps<{ pendingCount: number }>()
const emit = defineEmits<{ changed: [] }>()

type Tab = 'requests' | 'arrears' | 'refunds'
const tab = ref<Tab>('requests')
const directOpen = ref(false)
const refundVersion = ref(0)

function onDirectCancel() {
  emit('changed')
  tab.value = 'refunds'
  refundVersion.value += 1
}
</script>

<template>
  <div class="pc-stack">
    <button type="button" class="pc-btn pc-btn--danger" @click="directOpen = true">Catat pembatalan</button>

    <div class="pc-tabs" role="group" aria-label="Bagian pembatalan">
      <button type="button" class="pc-btn" :aria-pressed="tab === 'requests'" @click="tab = 'requests'">
        Pengajuan{{ pendingCount ? ` (${pendingCount})` : '' }}
      </button>
      <button type="button" class="pc-btn" :aria-pressed="tab === 'arrears'" @click="tab = 'arrears'">Tunggakan</button>
      <button type="button" class="pc-btn" :aria-pressed="tab === 'refunds'" @click="tab = 'refunds'">Pengembalian</button>
    </div>

    <slot v-if="tab === 'requests'" />
    <ArrearsPanel v-else-if="tab === 'arrears'" />
    <!-- Dipasang ulang setelah pembatalan agar pengembalian baru ikut terbaca. -->
    <RefundPanel v-else :key="refundVersion" />

    <DirectCancelModal v-model="directOpen" source="Admin" @done="onDirectCancel" />
  </div>
</template>
