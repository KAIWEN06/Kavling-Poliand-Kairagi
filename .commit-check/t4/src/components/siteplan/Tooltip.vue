<template>
  <div
    v-if="lot && !isTouchDevice"
    class="siteplan-tooltip"
    :style="{ left: `${position.x + 15}px`, top: `${position.y + 15}px` }"
  >
    <div class="tooltip-header">
      <strong>{{ lot.lot_number || lot.polygon_id }}</strong>
      <span>Blok {{ lot.block_id || '-' }}</span>
    </div>

    <div class="tooltip-row">
      <span>Luas:</span>
      <strong>{{ lot.area ? `${lot.area} m²` : '-' }}</strong>
    </div>

    <div class="tooltip-row">
      <span>Status:</span>
      <strong :class="getStatusClass(lot.status)">
        {{ getStatusLabel(lot.status) }}
      </strong>
    </div>

    <div class="tooltip-price">
      <span>Promo:</span>
      <strong>{{ formatCurrency(lot.promo_price || lot.cash_price) }}</strong>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { formatCurrency, getStatusLabel } from '../../utils/siteplan'

const props = defineProps({
  lot: {
    type: Object,
    default: null
  },
  position: {
    type: Object,
    default: () => ({ x: 0, y: 0 })
  }
})

const isTouchDevice = ref(false)

onMounted(() => {
  isTouchDevice.value = window.matchMedia('(pointer: coarse)').matches
})

function getStatusClass(status: string) {
  const value = status?.trim().toLowerCase()

  if (['available', 'tersedia'].includes(value)) return 'status-available'
  if (['booking', 'dibooking', 'booked', 'reserved', 'dipesan'].includes(value)) return 'status-booking'
  if (['sold', 'terjual'].includes(value)) return 'status-sold'

  return ''
}
</script>

<style scoped>
.siteplan-tooltip {
  position: fixed;
  z-index: 60;
  min-width: 180px;
  background: rgba(17, 24, 39, 0.92);
  color: #fff;
  border-radius: 12px;
  padding: 12px 14px;
  box-shadow: 0 20px 40px rgba(15, 23, 42, 0.25);
  pointer-events: none;
}

.tooltip-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  font-size: 12px;
}

.tooltip-header strong {
  font-size: 14px;
  font-weight: 700;
}

.tooltip-row,
.tooltip-price {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin-top: 4px;
  font-size: 12px;
}

.tooltip-row span,
.tooltip-price span {
  color: rgba(255, 255, 255, 0.7);
}

.tooltip-price strong {
  font-size: 12px;
}

.status-available {
  color: #4ade80;
}

.status-booking {
  color: #facc15;
}

.status-sold {
  color: #f87171;
}
</style>