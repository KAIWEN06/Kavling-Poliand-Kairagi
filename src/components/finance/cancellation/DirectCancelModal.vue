<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppNotice from '@/components/ui/AppNotice.vue'
import CancellationBreakdown from './CancellationBreakdown.vue'
import RecipientFields from './RecipientFields.vue'
import { useToast } from '@/composables/useToast'
import { currentMakassarDay } from '@/utils/financialCashflow'
import {
  purchaseCancellationService,
  type CancellableTransaction,
  type CancellationQuote,
  type RefundRecipient,
} from '@/services/Finance/purchaseCancellationService'
import './cancellation.css'

const props = defineProps<{
  modelValue: boolean
  /** 'Admin': klien menyampaikan di luar aplikasi. 'Default': penetapan wanprestasi. */
  source: 'Admin' | 'Default'
  /** Transaksi sudah ditentukan bila dibuka dari daftar tunggakan. */
  preset?: CancellableTransaction | null
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; done: [] }>()

const toast = useToast()
const emptyRecipient = (): RefundRecipient => ({ bank: '', accountNumber: '', accountName: '' })
const CHANNELS = ['Datang langsung', 'WhatsApp', 'Telepon', 'Surat']

const transactions = ref<CancellableTransaction[]>([])
const transactionId = ref<number | null>(null)
const channel = ref(CHANNELS[0])
const requestDate = ref(currentMakassarDay())
const reason = ref('')
const evidence = ref<File | null>(null)
const recipient = ref(emptyRecipient())
const quote = ref<CancellationQuote | null>(null)
const quoteLoading = ref(false)
const saving = ref(false)
const error = ref('')
/** Jawaban untuk transaksi yang sudah diganti diabaikan. */
let quoteRequest = 0

async function loadQuote() {
  const request = ++quoteRequest
  quote.value = null
  if (!transactionId.value) return
  quoteLoading.value = true
  try {
    const result = await purchaseCancellationService.getQuote(transactionId.value)
    if (request === quoteRequest) quote.value = result
  } catch (cause: any) {
    if (request === quoteRequest) error.value = cause?.message || 'Rincian belum dapat dimuat.'
  } finally {
    if (request === quoteRequest) quoteLoading.value = false
  }
}

watch(() => props.modelValue, async (open) => {
  if (!open) return
  transactionId.value = props.preset?.id ?? null
  channel.value = CHANNELS[0]
  requestDate.value = currentMakassarDay()
  reason.value = ''
  evidence.value = null
  recipient.value = emptyRecipient()
  error.value = ''
  void loadQuote()
  if (props.preset) {
    transactions.value = [props.preset]
    return
  }
  try {
    transactions.value = await purchaseCancellationService.listCancellable()
  } catch (cause: any) {
    error.value = cause?.message || 'Daftar transaksi belum dapat dimuat.'
  }
})

function selectTransaction() {
  error.value = ''
  void loadQuote()
}

const needsRecipient = computed(() => (quote.value?.refund_amount ?? 0) > 0)
const ready = computed(() =>
  Boolean(quote.value && !quote.value.blockers.length)
  && reason.value.trim().length >= 5
  && Boolean(requestDate.value)
  && (props.source === 'Default' || Boolean(evidence.value))
  && (!needsRecipient.value || Object.values(recipient.value).every(value => value.trim())),
)

async function submit() {
  const id = transactionId.value
  if (!ready.value || !id || !quote.value || saving.value) return
  saving.value = true
  error.value = ''
  let uploaded: string | null = null
  try {
    if (evidence.value) uploaded = await purchaseCancellationService.uploadEvidence(id, evidence.value)
    await purchaseCancellationService.cancelDirect({
      transactionId: id,
      source: props.source,
      channel: props.source === 'Default' ? 'Wanprestasi' : channel.value,
      requestDate: requestDate.value,
      reason: reason.value.trim(),
      evidencePath: uploaded,
      recipient: recipient.value,
      expectedRefund: quote.value.refund_amount,
    })
    emit('update:modelValue', false)
    toast.success('Kavling kembali tersedia. Catat transfernya di tab Pengembalian.', {
      title: 'Pembelian dibatalkan',
    })
    emit('done')
  } catch (cause: any) {
    if (uploaded) await purchaseCancellationService.removeUpload(uploaded)
    error.value = cause?.message || 'Pembelian belum dibatalkan.'
    await loadQuote()
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal
    :model-value="modelValue"
    guard-unsaved
    :title="source === 'Default' ? 'Tetapkan wanprestasi' : 'Catat pembatalan pembelian'"
    confirm-text="Batalkan pembelian"
    confirm-variant="danger"
    slide-confirm
    slide-label="Geser untuk batalkan pembelian"
    :loading="saving"
    :confirm-disabled="!ready"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="submit"
  >
    <div class="pc-stack">
      <p>Pembatalan langsung berlaku dan tidak bisa diurungkan. Kavling dilepas dan SPK ditutup.</p>

      <p v-if="preset"><strong>{{ preset.customer_name }}</strong>, kavling {{ preset.lot_number }}</p>
      <label v-else class="pc-field">
        Pembeli dan kavling
        <select v-model="transactionId" :disabled="saving" @change="selectTransaction">
          <option :value="null" disabled>Pilih transaksi</option>
          <option v-for="item in transactions" :key="item.id" :value="item.id">
            {{ item.customer_name }}, {{ item.lot_number }}
          </option>
        </select>
      </label>

      <p v-if="quoteLoading" class="pc-muted" role="status">Menghitung pengembalian...</p>
      <CancellationBreakdown v-if="quote" :quote="quote" />

      <template v-if="source === 'Admin'">
        <label class="pc-field">
          Disampaikan lewat
          <select v-model="channel">
            <option v-for="option in CHANNELS" :key="option">{{ option }}</option>
          </select>
        </label>
        <label class="pc-field">
          Tanggal disampaikan
          <input v-model="requestDate" type="date" :max="currentMakassarDay()" />
        </label>
      </template>

      <label class="pc-field">
        Alasan
        <textarea v-model="reason" rows="3" maxlength="2000" />
        <small>Minimal 5 karakter.</small>
      </label>

      <label class="pc-field">
        {{ source === 'Admin' ? 'Surat pernyataan bertanda tangan' : 'Berkas pendukung (opsional)' }}
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp,application/pdf"
          :disabled="saving"
          @change="evidence = ($event.target as HTMLInputElement).files?.[0] ?? null"
        />
        <small>JPG, PNG, WEBP, atau PDF. Maksimal 5 MB.</small>
      </label>

      <RecipientFields v-if="needsRecipient" v-model="recipient" />
      <AppNotice v-if="error" tone="error" :message="error" />
    </div>
  </AppModal>
</template>
