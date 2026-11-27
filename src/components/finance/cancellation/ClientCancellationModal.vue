<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppNotice from '@/components/ui/AppNotice.vue'
import CancellationBreakdown from './CancellationBreakdown.vue'
import RecipientFields from './RecipientFields.vue'
import { useToast } from '@/composables/useToast'
import {
  purchaseCancellationService,
  type CancellationQuote,
  type RefundRecipient,
} from '@/services/Finance/purchaseCancellationService'
import './cancellation.css'

const props = defineProps<{ modelValue: boolean; transactionId: number | null }>()
const emit = defineEmits<{
  'update:modelValue': [value: boolean]
  'update:saving': [value: boolean]
  submitted: [transactionId: number]
}>()

const toast = useToast()
const emptyRecipient = (): RefundRecipient => ({ bank: '', accountNumber: '', accountName: '' })
const quote = ref<CancellationQuote | null>(null)
const recipient = ref(emptyRecipient())
const reason = ref('')
const agreed = ref(false)
const saving = ref(false)
const error = ref('')

watch(() => props.modelValue, async (open) => {
  if (!open || !props.transactionId) return
  quote.value = null
  recipient.value = emptyRecipient()
  reason.value = ''
  agreed.value = false
  error.value = ''
  try {
    quote.value = await purchaseCancellationService.getQuote(props.transactionId)
  } catch (cause: any) {
    error.value = cause?.message || 'Rincian pengembalian belum dapat dimuat.'
  }
})

/** Pembayaran yang belum diverifikasi tidak menghalangi pengajuan, hanya keputusannya. */
const preview = computed(() => quote.value && { ...quote.value, blockers: [] })
const needsRecipient = computed(() => (quote.value?.refund_amount ?? 0) > 0 || Boolean(quote.value?.pending_payments))
const ready = computed(() =>
  Boolean(quote.value) && agreed.value && reason.value.trim().length >= 5
  && (!needsRecipient.value || Object.values(recipient.value).every(value => value.trim())),
)

async function submit() {
  const transactionId = props.transactionId
  if (!transactionId || !ready.value || saving.value) return
  saving.value = true
  emit('update:saving', true)
  error.value = ''
  try {
    const requestId = await purchaseCancellationService.request(transactionId, reason.value.trim(), recipient.value)
    toast.success('Admin akan memeriksa permintaan dan riwayat pembayaran Anda.', {
      title: `Pengajuan pembatalan #${requestId} terkirim`,
      to: `/client/pembayaran?transactionId=${transactionId}&bagian=pembatalan`,
      actionLabel: 'Lihat status',
    })
    emit('update:modelValue', false)
    emit('submitted', transactionId)
  } catch (cause: any) {
    error.value = cause?.message || 'Pengajuan pembatalan belum dapat dikirim.'
  } finally {
    saving.value = false
    emit('update:saving', false)
  }
}
</script>

<template>
  <AppModal
    :model-value="modelValue"
    guard-unsaved
    title="Ajukan pembatalan pembelian"
    confirm-text="Kirim pengajuan"
    confirm-variant="danger"
    slide-confirm
    slide-label="Geser untuk ajukan pembatalan"
    :loading="saving"
    :confirm-disabled="!ready"
    @update:model-value="emit('update:modelValue', $event)"
    @confirm="submit"
  >
    <div class="pc-stack">
      <p>Admin akan memeriksa pengajuan ini. Bila disetujui, kaveling dilepas. Selama diperiksa, pembayaran baru ditahan.</p>
      <p v-if="!quote && !error" class="pc-muted" role="status">Menghitung pengembalian...</p>
      <CancellationBreakdown v-if="preview" :quote="preview" />
      <AppNotice
        v-if="quote?.pending_payments"
        tone="warning"
        message="Ada pembayaran yang belum diverifikasi. Angka di atas bisa berubah dan keputusan menunggu verifikasi."
      />
      <label class="pc-field">
        Alasan pembatalan
        <textarea v-model="reason" rows="3" maxlength="2000" />
        <small>Minimal 5 karakter.</small>
      </label>
      <RecipientFields v-if="needsRecipient" v-model="recipient" />
      <label class="pc-check">
        <input v-model="agreed" type="checkbox" />
        <span>Saya sudah membaca rincian pengembalian di atas.</span>
      </label>
      <AppNotice v-if="error" tone="error" :message="error" />
    </div>
  </AppModal>
</template>
