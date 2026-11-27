<template>
  <div class="mk-table-wrap">
    <table class="mk-table mk-table--duo">
      <thead>
        <tr><th scope="col">Pembeli</th><th scope="col" class="num">Nilai kontrak</th></tr>
      </thead>
      <tbody>
        <tr v-if="!rows.length"><td colspan="2" class="mk-muted">{{ emptyText }}</td></tr>
        <tr v-for="sale in rows" :key="sale.id">
          <td>
            <strong>{{ sale.customerName }}</strong>
            <small>Kaveling {{ sale.lotNumber }}</small>
            <small>{{ formatDate(sale.date) }}</small>
            <StatusBadge size="sm" :tone="sale.status === 'Sold' ? 'danger' : 'gold'" :label="sale.status === 'Sold' ? 'Lunas' : 'Dipesan'" />
          </td>
          <td class="num">
            <strong>{{ formatRupiah(sale.contractValue) }}</strong>
            <small v-if="sale.remaining > 0">Sisa {{ formatRupiah(sale.remaining) }}</small>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup lang="ts">
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { formatDate, formatRupiah } from '@/utils/marketingStatus'
import type { OwnerSale } from '@/utils/ownerReport'

defineProps<{ rows: OwnerSale[]; emptyText: string }>()
</script>
