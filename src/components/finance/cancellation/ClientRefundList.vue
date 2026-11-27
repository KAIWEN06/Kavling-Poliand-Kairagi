<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import AppNotice from '@/components/ui/AppNotice.vue'
import DocumentViewerModal from '@/components/ui/DocumentViewerModal.vue'
import { paymentService } from '@/services/Finance/paymentService'
import { formatRupiah } from '@/utils/installmentFormat'
import { purchaseCancellationService, type PurchaseRefundRow } from '@/services/Finance/purchaseCancellationService'
import './cancellation.css'

/** Berubah setiap kali data halaman dimuat ulang. */
const props = defineProps<{ refreshKey: number }>()
const refunds = ref<PurchaseRefundRow[]>([])
const loadError = ref('')

const formatDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

// RLS hanya mengembalikan pengembalian milik akun ini.
async function load() {
  try {
    refunds.value = await purchaseCancellationService.listRefunds()
    loadError.value = ''
  } catch (cause) {
    console.warn('[Pengembalian Klien] Belum dapat dimuat:', cause)
    loadError.value = 'Status pengembalian dana belum dapat dimuat. Tarik halaman atau buka lagi nanti.'
  }
}
onMounted(load)
watch(() => props.refreshKey, load)

const viewing = ref<PurchaseRefundRow | null>(null)
const viewUrl = ref('')
const viewLoading = ref(false)
const viewError = ref('')
async function openProof(item: PurchaseRefundRow) {
  viewing.value = item
  viewUrl.value = ''
  viewError.value = ''
  viewLoading.value = true
  try {
    viewUrl.value = await paymentService.getProofUrl(item.proof_path ?? '', null, 'payment-proofs')
  } catch {
    viewError.value = 'Periksa koneksi lalu coba lagi. Bila tetap gagal, hubungi Admin.'
  } finally {
    viewLoading.value = false
  }
}
</script>

<template>
  <AppNotice v-if="loadError" tone="warning" :message="loadError" />
  <section v-else-if="refunds.length" class="pc-stack" aria-labelledby="client-refund-title">
    <h2 id="client-refund-title" class="pc-strong">Pengembalian dana</h2>
    <ul class="pc-list">
      <li v-for="item in refunds" :key="item.id" class="pc-card">
        <div class="pc-card__top">
          <h3>{{ item.lot_number === '-' ? `Pengembalian #${item.id}` : `Kaveling ${item.lot_number}` }}</h3>
          <span class="pc-strong">{{ formatRupiah(item.amount) }}</span>
        </div>
        <p v-if="item.status === 'Paid'">Sudah ditransfer {{ formatDate(item.transfer_date ?? item.due_date) }}.</p>
        <p v-else>Menunggu transfer, paling lambat {{ formatDate(item.due_date) }}.</p>
        <p v-if="item.recipient_account_number" class="pc-muted">{{ item.recipient_bank }} {{ item.recipient_account_number }}, a.n. {{ item.recipient_account_name }}</p>
        <button v-if="item.proof_path" type="button" class="pc-btn" @click="openProof(item)">Lihat bukti transfer</button>
      </li>
    </ul>
    <DocumentViewerModal
      :open="viewing !== null"
      :url="viewUrl"
      :file-name="viewing ? `Pengembalian-${viewing.id}.${viewing.proof_path?.split('.').pop() ?? 'jpg'}` : ''"
      :subtitle="viewing ? formatRupiah(viewing.amount) : ''"
      :loading="viewLoading"
      :error="viewError"
      can-retry
      @close="viewing = null"
      @retry="viewing && openProof(viewing)"
    />
  </section>
</template>
