<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppNotice from '@/components/ui/AppNotice.vue'
import {
  getAvailableLotsForAdmin,
  getLotInstallmentOptionsForAdmin,
  type AdminAvailableLot,
  type AdminLotInstallmentOption,
} from '@/services/Admin/spkAdminService'
import { spkRevisionService, type RevisionQuote, type RevisionTerms } from '@/services/spkRevisionService'
import { useToast } from '@/composables/useToast'
import { formatRupiah } from '@/utils/installmentFormat'

export interface RevisableSpk {
  id: number
  spk_number: string
  lot_id: number
  lot_number?: string
  payment_method: string
  payment_plan_id: number | null
  down_payment_snapshot: number
}

const props = defineProps<{ open: boolean; spk: RevisableSpk | null }>()
const emit = defineEmits<{ close: []; revised: [spkId: number] }>()
const toast = useToast()

const lots = ref<AdminAvailableLot[]>([])
const plans = ref<AdminLotInstallmentOption[]>([])
const lotId = ref(0)
const method = ref<'Cash' | 'Installment'>('Cash')
const planId = ref<number | null>(null)
const dpText = ref('')
const reason = ref('')
const quote = ref<RevisionQuote | null>(null)
const quoteError = ref('')
const quoting = ref(false)
const saving = ref(false)

const downPayment = computed(() => Number(dpText.value.replace(/\D/g, '')) || 0)
const terms = computed<RevisionTerms | null>(() => {
  if (!props.open || !props.spk || !lotId.value) return null
  if (method.value === 'Installment' && !planId.value) return null
  return {
    spkRequestId: props.spk.id,
    lotId: lotId.value,
    paymentMethod: method.value,
    planId: planId.value,
    downPayment: downPayment.value,
  }
})
const canSave = computed(() =>
  Boolean(quote.value) && !quote.value?.blockers.length && !quoting.value && reason.value.trim().length >= 5)

function onDpInput(event: Event) {
  const digits = (event.target as HTMLInputElement).value.replace(/\D/g, '')
  dpText.value = digits ? Number(digits).toLocaleString('id-ID') : ''
}

watch(() => props.open, async (open) => {
  if (!open || !props.spk) return
  lotId.value = props.spk.lot_id
  method.value = props.spk.payment_method === 'Installment' ? 'Installment' : 'Cash'
  planId.value = props.spk.payment_plan_id
  const dp = Number(props.spk.down_payment_snapshot || 0)
  dpText.value = dp ? dp.toLocaleString('id-ID') : ''
  reason.value = ''
  quote.value = null
  quoteError.value = ''
  try {
    lots.value = await getAvailableLotsForAdmin()
  } catch (cause) {
    quoteError.value = cause instanceof Error ? cause.message : 'Daftar kaveling gagal dimuat.'
  }
})

watch(() => [props.open, lotId.value] as const, async ([open, id]) => {
  plans.value = []
  if (!open || !id) return
  try {
    const options = await getLotInstallmentOptionsForAdmin(id)
    if (lotId.value !== id) return
    plans.value = options.sort((a, b) => a.months - b.months)
    if (!plans.value.some((p) => p.plan_id === planId.value)) planId.value = null
  } catch (cause) {
    quoteError.value = cause instanceof Error ? cause.message : 'Pilihan tenor gagal dimuat.'
  }
})

let quoteTimer: ReturnType<typeof setTimeout> | undefined
let quoteSequence = 0
watch(() => JSON.stringify(terms.value), () => {
  clearTimeout(quoteTimer)
  const sequence = ++quoteSequence
  quote.value = null
  quoteError.value = ''
  const current = terms.value
  quoting.value = Boolean(current)
  if (!current) return
  quoteTimer = setTimeout(async () => {
    try {
      const result = await spkRevisionService.quote(current)
      if (sequence === quoteSequence) quote.value = result
    } catch (cause) {
      if (sequence === quoteSequence) quoteError.value = cause instanceof Error ? cause.message : 'Rincian gagal dihitung.'
    } finally {
      if (sequence === quoteSequence) quoting.value = false
    }
  }, 350)
})

async function save() {
  if (!terms.value || !quote.value || !canSave.value || saving.value) return
  saving.value = true
  try {
    const newId = await spkRevisionService.apply(terms.value, reason.value, quote.value.total_due)
    toast.show('success', 'Pesanan direvisi. Minta pembeli menandatangani ulang SPK dan tanda jadi.')
    emit('revised', newId)
  } catch (cause) {
    toast.show('error', cause instanceof Error ? cause.message : 'Revisi gagal disimpan.')
  } finally {
    saving.value = false
  }
}
</script>

<template>
  <AppModal
    :model-value="open"
    title="Revisi pesanan"
    variant="bottom-sheet"
    max-height="92dvh"
    guard-unsaved
    :unsaved="Boolean(reason.trim())"
    :loading="saving"
    :confirm-disabled="!canSave"
    confirm-text="Simpan Revisi"
    slide-confirm
    slide-label="Geser untuk menyimpan revisi"
    @update:model-value="(value: boolean) => { if (!value) emit('close') }"
    @confirm="save"
  >
    <div v-if="spk" class="rev">
      <label class="rev__field">
        Kaveling
        <select v-model.number="lotId">
          <option :value="spk.lot_id">{{ spk.lot_number || `Kavling #${spk.lot_id}` }} (saat ini)</option>
          <option v-for="lot in lots" :key="lot.id" :value="lot.id">
            {{ [lot.block_name, lot.lot_number].filter(Boolean).join(' - ') }}
          </option>
        </select>
      </label>

      <label class="rev__field">
        Metode pembayaran
        <select v-model="method">
          <option value="Cash">Tunai</option>
          <option value="Installment">Cicilan</option>
        </select>
      </label>

      <template v-if="method === 'Installment'">
        <label class="rev__field">
          Tenor
          <select v-model.number="planId">
            <option :value="null" disabled>Pilih tenor</option>
            <option v-for="plan in plans" :key="plan.plan_id" :value="plan.plan_id">
              {{ plan.months }} bulan, margin {{ plan.margin_percent }}%
            </option>
          </select>
        </label>
        <label class="rev__field">
          Uang muka (kosongkan bila tanpa DP)
          <input :value="dpText" inputmode="numeric" autocomplete="off" placeholder="Rp0" @input="onDpInput" />
        </label>
      </template>

      <div aria-live="polite" class="rev__result">
        <p v-if="quoting" class="rev__muted">Menghitung tagihan...</p>
        <AppNotice v-else-if="quoteError" tone="error" :message="quoteError" />
        <template v-else-if="quote">
          <AppNotice v-for="blocker in quote.blockers" :key="blocker" tone="warning" :message="blocker" />
          <dl class="rev__summary">
            <div><dt>Harga kaveling</dt><dd>{{ formatRupiah(quote.price) }}</dd></div>
            <div v-if="quote.months"><dt>Cicilan per bulan</dt><dd>{{ formatRupiah(quote.monthly_payment ?? 0) }} × {{ quote.months }}</dd></div>
            <div><dt>Total tagihan</dt><dd>{{ formatRupiah(quote.total_due) }}</dd></div>
            <div><dt>Sudah dibayar, ikut dipindahkan</dt><dd>{{ formatRupiah(quote.carried_amount) }}</dd></div>
            <div v-if="quote.credit_to_installments > 0"><dt>Mengurangi cicilan awal</dt><dd>{{ formatRupiah(quote.credit_to_installments) }}</dd></div>
            <div class="rev__strong"><dt>Sisa tagihan</dt><dd>{{ formatRupiah(quote.remaining) }}</dd></div>
            <div><dt>Booking Fee dipindahkan</dt><dd>{{ formatRupiah(quote.booking_fee_paid) }}</dd></div>
          </dl>
        </template>
      </div>

      <label class="rev__field">
        Alasan revisi (wajib, terlihat oleh pembeli)
        <textarea v-model="reason" rows="3" maxlength="2000" placeholder="Contoh: pembeli salah memilih tenor" />
      </label>

      <AppNotice tone="info" message="Setelah disimpan, SPK baru dibuat. Pembeli menandatangani ulang dokumen fisik SPK dan tanda jadi sebelum proses berlanjut." />
    </div>
  </AppModal>
</template>

<style scoped>
.rev { display: grid; gap: 14px; }
.rev__field { display: grid; gap: 6px; color: var(--text-primary); font-size: 13px; font-weight: var(--font-weight-semibold); }
.rev__field :is(select, input, textarea) {
  width: 100%;
  min-height: 46px;
  padding: 11px 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-primary);
  color: var(--text-primary);
  font: inherit;
  /* 16px: iOS tidak memperbesar halaman saat isian disentuh. */
  font-size: 16px;
  font-weight: 400;
  touch-action: manipulation;
}
.rev__field textarea { resize: vertical; }
.rev__result { display: grid; gap: 8px; }
.rev__muted { margin: 0; color: var(--text-secondary); font-size: 13px; }
.rev__summary { display: grid; margin: 0; padding: 4px 14px; border-radius: var(--radius-control); background: var(--surface-muted); }
.rev__summary div { display: flex; justify-content: space-between; gap: 12px; padding: 9px 0; font-size: 13px; }
.rev__summary div + div { border-top: 1px solid var(--border-default); }
.rev__summary dt { color: var(--text-secondary); }
.rev__summary dd { margin: 0; color: var(--text-primary); text-align: right; font-variant-numeric: tabular-nums; }
.rev__strong dd { font-weight: var(--font-weight-semibold); font-size: 15px; }
</style>
