<script setup lang="ts">
import { onMounted, ref, watch } from 'vue'
import AppNotice from '@/components/ui/AppNotice.vue'
import DocumentViewerModal from '@/components/ui/DocumentViewerModal.vue'
import { paymentService } from '@/services/Finance/paymentService'
import { formatRupiah } from '@/utils/installmentFormat'
import { purchaseCancellationService, type BookingFeeRefundRow, type PurchaseRefundRow } from '@/services/Finance/purchaseCancellationService'
import './cancellation.css'

/** Berubah setiap kali data halaman dimuat ulang. */
const props = defineProps<{ refreshKey: number }>()

/** Pengembalian pembelian dan Booking Fee dalam satu daftar. */
interface RefundCard {
  key: string
  title: string
  amount: number
  statusText: string
  account: string
  proofPath: string | null
}

const refunds = ref<RefundCard[]>([])
const loadError = ref('')

const formatDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
const formatMoment = (value: string) =>
  new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Makassar' })

const fromPurchase = (item: PurchaseRefundRow): RefundCard => ({
  key: `purchase-${item.id}`,
  title: item.lot_number === '-' ? `Pengembalian #${item.id}` : `Kaveling ${item.lot_number}`,
  amount: item.amount,
  statusText: item.status === 'Paid'
    ? `Sudah ditransfer ${formatDate(item.transfer_date ?? item.due_date)}.`
    : `Menunggu transfer, paling lambat ${formatDate(item.due_date)}.`,
  account: item.recipient_account_number
    ? `${item.recipient_bank} ${item.recipient_account_number}, a.n. ${item.recipient_account_name}`
    : '',
  proofPath: item.proof_path,
})

const fromBookingFee = (item: BookingFeeRefundRow): RefundCard => ({
  key: `booking-${item.id}`,
  title: 'Booking Fee',
  amount: item.amount,
  statusText: item.status !== 'Refunded'
    ? 'Menunggu transfer pengembalian.'
    : item.refunded_at ? `Sudah ditransfer ${formatMoment(item.refunded_at)}.` : 'Sudah ditransfer.',
  account: '',
  proofPath: item.proof_path,
})

// RLS hanya mengembalikan pengembalian milik akun ini.
async function load() {
  try {
    const [purchases, bookingFees] = await Promise.all([
      purchaseCancellationService.listRefunds(),
      purchaseCancellationService.listBookingFeeRefunds(),
    ])
    refunds.value = [...purchases.map(fromPurchase), ...bookingFees.map(fromBookingFee)]
    loadError.value = ''
  } catch (cause) {
    console.warn('[Pengembalian Klien] Belum dapat dimuat:', cause)
    loadError.value = 'Status pengembalian dana belum dapat dimuat. Tarik halaman atau buka lagi nanti.'
  }
}
onMounted(load)
watch(() => props.refreshKey, load)

const viewing = ref<RefundCard | null>(null)
const viewUrl = ref('')
const viewLoading = ref(false)
const viewError = ref('')
async function openProof(item: RefundCard) {
  viewing.value = item
  viewUrl.value = ''
  viewError.value = ''
  viewLoading.value = true
  try {
    viewUrl.value = await paymentService.getProofUrl(item.proofPath ?? '', null, 'payment-proofs')
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
      <li v-for="item in refunds" :key="item.key" class="pc-card">
        <div class="pc-card__top">
          <h3>{{ item.title }}</h3>
          <span class="pc-strong">{{ formatRupiah(item.amount) }}</span>
        </div>
        <p>{{ item.statusText }}</p>
        <p v-if="item.account" class="pc-muted">{{ item.account }}</p>
        <button v-if="item.proofPath" type="button" class="pc-btn" @click="openProof(item)">Lihat bukti transfer</button>
      </li>
    </ul>
    <DocumentViewerModal
      :open="viewing !== null"
      :url="viewUrl"
      :file-name="viewing ? `Pengembalian-${viewing.key}.${viewing.proofPath?.split('.').pop() ?? 'jpg'}` : ''"
      :subtitle="viewing ? formatRupiah(viewing.amount) : ''"
      :loading="viewLoading"
      :error="viewError"
      can-retry
      @close="viewing = null"
      @retry="viewing && openProof(viewing)"
    />
  </section>
</template>
