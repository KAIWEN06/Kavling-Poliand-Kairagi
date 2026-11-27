<script setup lang="ts">
import AppNotice from '@/components/ui/AppNotice.vue'
import { formatRupiah } from '@/utils/installmentFormat'
import type { CancellationQuote } from '@/services/Finance/purchaseCancellationService'
import './cancellation.css'

defineProps<{ quote: CancellationQuote }>()
</script>

<template>
  <div class="pc-stack">
    <dl class="pc-sum">
      <div>
        <dt>Uang muka terverifikasi</dt>
        <dd>{{ formatRupiah(quote.confirmed_down_payment) }}</dd>
      </div>
      <div>
        <dt>Cicilan terverifikasi</dt>
        <dd>{{ formatRupiah(quote.confirmed_installments) }}</dd>
      </div>
      <div class="pc-sum__main">
        <dt>Dikembalikan {{ quote.refund_percent }}%</dt>
        <dd>{{ formatRupiah(quote.refund_amount) }}</dd>
      </div>
      <div>
        <dt>Tidak dikembalikan</dt>
        <dd>{{ formatRupiah(quote.withheld_amount) }}</dd>
      </div>
    </dl>
    <p class="pc-muted">
      Tanda jadi{{ quote.booking_fee_paid ? ` ${formatRupiah(quote.booking_fee_paid)}` : '' }} tidak dikembalikan.
      Denda yang belum dibayar tidak memotong pengembalian. Transfer paling lambat 14 hari setelah pembatalan.
    </p>
    <AppNotice v-for="blocker in quote.blockers" :key="blocker" tone="warning" :message="blocker" />
  </div>
</template>
