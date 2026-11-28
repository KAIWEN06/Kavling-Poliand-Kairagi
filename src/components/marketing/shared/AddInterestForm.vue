<template>
  <form class="ai" aria-label="Tambah minat kaveling" @submit.prevent="save">
    <label class="mk-field">
      <span>Cari kaveling</span>
      <input v-model.trim="search" class="mk-input" type="search" enterkeyhint="search" placeholder="Nomor kaveling atau blok" autocomplete="off" />
    </label>

    <p v-if="loading" class="ai-state" role="status">Memuat kaveling...</p>
    <div v-else-if="loadError" class="ai-state" role="alert">
      <span>{{ loadError }}</span>
      <button type="button" class="mk-link" @click="load">Coba lagi</button>
    </div>
    <p v-else-if="!filtered.length" class="ai-state">
      {{ options.length ? 'Tidak ada yang cocok.' : 'Tidak ada kaveling tersedia untuk ditambahkan.' }}
    </p>
    <fieldset v-else class="ai-lots">
      <legend class="ai-sr">Pilih kaveling</legend>
      <label v-for="lot in filtered" :key="lot.id" :class="['ai-lot', { selected: lotIds.includes(lot.id) }]">
        <input v-model="lotIds" type="checkbox" :value="lot.id" />
        <span class="ai-lot-copy">
          <strong>{{ lot.lot_number }}</strong>
          <small>{{ lotMeta(lot) }}</small>
        </span>
      </label>
    </fieldset>

    <label class="mk-field">
      <span>Pembayaran</span>
      <select v-model="paymentType" class="mk-input">
        <option value="Cash">Tunai</option>
        <option value="Installment">Cicilan</option>
      </select>
    </label>

    <label v-if="paymentType === 'Installment' && plans.length" class="mk-field">
      <span>Tenor (opsional)</span>
      <select v-model="planId" class="mk-input">
        <option :value="null">Belum dipilih</option>
        <option v-for="plan in plans" :key="plan.id" :value="plan.id">{{ formatPaymentPlanName(plan.plan_name, plan.months) }}</option>
      </select>
    </label>

    <AppNotice v-if="saveError" tone="error">{{ saveError }}</AppNotice>

    <div class="ai-actions">
      <button type="button" class="mk-btn mk-btn--ghost" :disabled="saving" @click="emit('cancel')">Batal</button>
      <button type="submit" class="mk-btn mk-btn--primary" :disabled="saving || !lotIds.length">
        {{ saving ? 'Menyimpan…' : lotIds.length ? `Simpan (${lotIds.length})` : 'Simpan' }}
      </button>
    </div>
  </form>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import AppNotice from '@/components/ui/AppNotice.vue'
import { customerService } from '@/services/marketing/customerService'
import { formatRupiah } from '@/utils/marketingStatus'
import { formatPaymentPlanName } from '@/utils/paymentPlan'

const props = defineProps<{ customerId: number; excludedLotIds: number[] }>()
const emit = defineEmits<{ saved: []; cancel: [] }>()

const lots = ref<any[]>([])
const plans = ref<any[]>([])
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const saveError = ref('')
const search = ref('')
const lotIds = ref<number[]>([])
const paymentType = ref<'Cash' | 'Installment'>('Cash')
const planId = ref<number | null>(null)

/* Kaveling yang sudah tercatat sebagai minat tidak ditawarkan lagi. */
const options = computed(() => lots.value.filter((lot) => !props.excludedLotIds.includes(Number(lot.id))))
const filtered = computed(() => {
  const term = search.value.toLowerCase()
  if (!term) return options.value
  return options.value.filter((lot) => `${lot.lot_number} ${blockName(lot)}`.toLowerCase().includes(term))
})

function blockName(lot: any) {
  const block = Array.isArray(lot.blocks) ? lot.blocks[0] : lot.blocks
  return block?.name || block?.code || ''
}
function lotMeta(lot: any) {
  const price = lot.promo_price ?? lot.cash_price
  return [blockName(lot), lot.area ? `${Number(lot.area)} m²` : '', price ? formatRupiah(Number(price)) : 'Harga belum diatur']
    .filter(Boolean)
    .join(' · ')
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const [availableLots, paymentPlans] = await Promise.all([customerService.getAvailableLots(), customerService.getPaymentPlans()])
    lots.value = availableLots
    plans.value = paymentPlans ?? []
  } catch (cause) {
    console.error('Gagal memuat pilihan minat:', cause)
    loadError.value = 'Daftar kaveling gagal dimuat.'
  } finally {
    loading.value = false
  }
}

async function save() {
  /* Minat bisa bertambah dari tempat lain saat formulir terbuka: saring lagi sebelum menyimpan. */
  const selected = lotIds.value.filter((id) => !props.excludedLotIds.includes(id))
  if (saving.value || !selected.length) return
  saving.value = true
  saveError.value = ''
  try {
    await customerService.addInterests(
      selected.map((lotId) => ({
        customer_id: props.customerId,
        lot_id: lotId,
        payment_type: paymentType.value,
        plan_id: paymentType.value === 'Installment' ? planId.value : null,
        notes: null,
      })),
    )
    emit('saved')
  } catch (cause) {
    console.error('Gagal menyimpan minat:', cause)
    saveError.value = 'Minat gagal disimpan. Coba lagi.'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.ai { display: grid; gap: var(--space-3); min-width: 0; padding: 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--pl-paper); }
.ai-state { display: grid; justify-items: center; gap: 4px; margin: 0; padding: var(--space-3); color: var(--text-secondary); font-size: 13px; text-align: center; }
.ai-lots { display: grid; gap: 8px; max-height: 280px; margin: 0; padding: 0; overflow-y: auto; overscroll-behavior: contain; border: 0; }
.ai-lot { display: flex; align-items: center; gap: 12px; min-height: 56px; padding: 8px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.ai-lot:active { transform: scale(0.97); }
.ai-lot.selected { border-color: var(--poliland-green); background: var(--green-50); }
.ai-lot input { flex: none; width: 20px; height: 20px; margin: 0; accent-color: var(--poliland-green); }
.ai-lot:has(input:focus-visible) { outline: 3px solid var(--poliland-green); outline-offset: -3px; }
.ai-lot-copy { display: grid; gap: 2px; min-width: 0; }
.ai-lot-copy strong { font-size: 14px; }
.ai-lot-copy small { color: var(--text-secondary); font-size: 12px; overflow-wrap: anywhere; }
.ai-actions { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 2fr); gap: 8px; }
.ai-sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
@media (prefers-reduced-motion: reduce) { .ai-lot:active { transform: none; } }
</style>
