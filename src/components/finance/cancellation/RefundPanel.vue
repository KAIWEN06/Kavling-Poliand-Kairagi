<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppNotice from '@/components/ui/AppNotice.vue'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import DocumentViewerModal from '@/components/ui/DocumentViewerModal.vue'
import SkeletonRowList from '@/components/ui/skeletons/SkeletonRowList.vue'
import { useToast } from '@/composables/useToast'
import { paymentService } from '@/services/Finance/paymentService'
import { currentMakassarDay } from '@/utils/financialCashflow'
import { formatRupiah } from '@/utils/installmentFormat'
import { purchaseCancellationService, type PurchaseRefundRow } from '@/services/Finance/purchaseCancellationService'
import './cancellation.css'

const toast = useToast()
const refunds = ref<PurchaseRefundRow[]>([])
const loading = ref(true)
const loadError = ref('')

const formatDate = (value: string) =>
  new Date(`${value.slice(0, 10)}T00:00:00`).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
const isLate = (item: PurchaseRefundRow) => item.status === 'Pending Transfer' && item.due_date < currentMakassarDay()

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    refunds.value = await purchaseCancellationService.listRefunds()
  } catch (cause: any) {
    loadError.value = cause?.message || 'Daftar pengembalian belum dapat dimuat.'
  } finally {
    loading.value = false
  }
}
onMounted(load)

const target = ref<PurchaseRefundRow | null>(null)
const transferDate = ref('')
const reference = ref('')
const proof = ref<File | null>(null)
const saving = ref(false)
const formError = ref('')
const ready = computed(() => Boolean(transferDate.value && reference.value.trim() && proof.value))

function openRecord(item: PurchaseRefundRow) {
  transferDate.value = currentMakassarDay()
  reference.value = ''
  proof.value = null
  formError.value = ''
  target.value = item
}

async function save() {
  if (!target.value || !ready.value || !proof.value || saving.value) return
  saving.value = true
  formError.value = ''
  try {
    await purchaseCancellationService.recordRefundPayment(target.value.id, transferDate.value, reference.value.trim(), proof.value)
    target.value = null
    toast.success('Transfer pengembalian tercatat di buku kas.')
    await load()
  } catch (cause: any) {
    formError.value = cause?.message || 'Transfer belum tercatat.'
  } finally {
    saving.value = false
  }
}

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
    viewError.value = 'Bukti belum dapat dibuka. Periksa koneksi lalu coba lagi.'
  } finally {
    viewLoading.value = false
  }
}
</script>

<template>
  <div class="pc-stack">
    <SkeletonRowList v-if="loading" :rows="2" :fields="3" :badges="[3]" label="Memuat pengembalian" />
    <template v-else-if="loadError">
      <AppNotice tone="error" :message="loadError" />
      <button type="button" class="pc-btn" @click="load">Coba lagi</button>
    </template>
    <StatusIllustration v-else-if="!refunds.length" variant="empty-data" size="sm" title="Belum ada pengembalian dana" />

    <ul v-else class="pc-list">
      <li v-for="item in refunds" :key="item.id" class="pc-card">
        <div class="pc-card__top">
          <div>
            <h3>{{ item.customer_name }}</h3>
            <p class="pc-muted">Kavling {{ item.lot_number }}</p>
          </div>
          <span class="pc-strong">{{ formatRupiah(item.amount) }}</span>
        </div>
        <p v-if="item.recipient_account_number">{{ item.recipient_bank }} {{ item.recipient_account_number }}, a.n. {{ item.recipient_account_name }}</p>
        <p v-else>Rekening tujuan belum diisi. Minta ke pembeli sebelum transfer.</p>
        <p v-if="item.status === 'Paid'" class="pc-muted">Ditransfer {{ formatDate(item.transfer_date ?? item.due_date) }}, referensi {{ item.bank_reference }}.</p>
        <p v-else :class="isLate(item) ? 'pc-late' : 'pc-muted'">{{ isLate(item) ? 'Lewat batas' : 'Batas transfer' }} {{ formatDate(item.due_date) }}</p>
        <div class="pc-actions">
          <button v-if="item.status === 'Pending Transfer'" type="button" class="pc-btn pc-btn--primary" @click="openRecord(item)">Catat transfer</button>
          <button v-else-if="item.proof_path" type="button" class="pc-btn" @click="openProof(item)">Lihat bukti transfer</button>
        </div>
      </li>
    </ul>

    <AppModal
      :model-value="target !== null"
      guard-unsaved
      title="Catat transfer pengembalian"
      confirm-text="Simpan transfer"
      slide-confirm
      slide-label="Geser untuk mencatat transfer"
      :loading="saving"
      :confirm-disabled="!ready"
      @update:model-value="!$event && (target = null)"
      @confirm="save"
    >
      <div v-if="target" class="pc-stack">
        <p><span class="pc-strong">{{ formatRupiah(target.amount) }}</span> untuk {{ target.customer_name }}. Catatan buku kas tidak bisa diubah.</p>
        <label class="pc-field">Tanggal transfer<input v-model="transferDate" type="date" :max="currentMakassarDay()" /></label>
        <label class="pc-field">Nomor referensi bank<input v-model="reference" type="text" maxlength="100" autocomplete="off" /></label>
        <label class="pc-field">
          Bukti transfer
          <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" :disabled="saving" @change="proof = ($event.target as HTMLInputElement).files?.[0] ?? null" />
          <small>Maksimal 5 MB.</small>
        </label>
        <AppNotice v-if="formError" tone="error" :message="formError" />
      </div>
    </AppModal>

    <DocumentViewerModal
      :open="viewing !== null"
      :url="viewUrl"
      :file-name="viewing ? `Pengembalian-${viewing.id}.${viewing.proof_path?.split('.').pop() ?? 'jpg'}` : ''"
      :subtitle="viewing ? `${viewing.customer_name}, ${formatRupiah(viewing.amount)}` : ''"
      :loading="viewLoading"
      :error="viewError"
      can-retry
      @close="viewing = null"
      @retry="viewing && openProof(viewing)"
    />
  </div>
</template>
