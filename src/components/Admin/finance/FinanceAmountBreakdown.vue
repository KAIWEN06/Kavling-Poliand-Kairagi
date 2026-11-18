<script setup lang="ts">
defineProps<{
  bookingFee: number
  bookingFeePaid: number
  principalAmount: number
  downPayment: number
  marginAmount: number
  installmentTotal: number
  formatCurrency: (value: number) => string
}>()
</script>

<template>
  <div class="finance-amount-breakdown" aria-label="Rincian biaya transaksi">
    <div><span>Booking Fee</span><strong>{{ formatCurrency(bookingFee) }}</strong><small>Terpisah dari pokok · dibayar {{ formatCurrency(bookingFeePaid) }}</small></div>
    <div><span>Biaya Pokok</span><strong>{{ formatCurrency(principalAmount) }}</strong><small>Uang muka {{ formatCurrency(downPayment) }}</small></div>
    <div v-if="marginAmount > 0"><span>Margin Cicilan</span><strong>{{ formatCurrency(marginAmount) }}</strong></div>
    <div v-if="installmentTotal > 0"><span>Total Kewajiban Cicilan</span><strong>{{ formatCurrency(installmentTotal) }}</strong></div>
  </div>
</template>

<style scoped>
.finance-amount-breakdown { display: grid; gap: 8px; margin-top: 12px; padding: 12px; border-radius: var(--radius-control); background: var(--surface-muted); }
.finance-amount-breakdown div { display: grid; grid-template-columns: 1fr auto; gap: 2px 10px; font-size: 11px; }
.finance-amount-breakdown span, .finance-amount-breakdown small { color: var(--text-secondary); }
.finance-amount-breakdown strong { color: var(--text-primary); text-align: right; }
.finance-amount-breakdown small { grid-column: 1 / -1; font-size: 9px; }
</style>
