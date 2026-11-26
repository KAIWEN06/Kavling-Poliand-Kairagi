<script setup lang="ts">
import { computed, onMounted, ref, useId } from 'vue'
import { getLotInstallments } from '@/services/siteplanService'
import { trackFunnel } from '@/services/funnelService'
import { DEFAULT_SPK_BOOKING_FEE } from '@/services/Finance/paymentService'
import { NOTARY_FEE, estimateInstallment } from '@/services/payment/paymentCalculator'
import { formatCurrency } from '@/utils/siteplan'

/** Pasang dengan :key id kavling agar pilihan simulasi kembali ke awal saat kavling berganti. */
const props = defineProps<{
  lotId: string | number
  /** Harga yang berlaku (promo bila ada). */
  price: number
}>()

type Scheme = 'cash' | 'installment'
type Plan = { id: number; months: number; margin: number }

const inputId = useId()
const scheme = ref<Scheme>('cash')
const downPayment = ref(0)
const plans = ref<Plan[]>([])
const selectedPlanId = ref<number | null>(null)
const plansState = ref<'loading' | 'ready' | 'error'>('loading')

async function loadPlans() {
  plansState.value = 'loading'
  try {
    const rows = await getLotInstallments(props.lotId)
    plans.value = rows.flatMap((row: any) => {
      const plan = Array.isArray(row.payment_plans) ? row.payment_plans[0] : row.payment_plans
      return plan?.months > 0
        ? [{ id: Number(plan.id), months: Number(plan.months), margin: Number(plan.margin_percent) || 0 }]
        : []
    })
    selectedPlanId.value = plans.value[0]?.id ?? null
    plansState.value = 'ready'
  } catch (error) {
    console.error('Gagal memuat skema cicilan:', error)
    plansState.value = 'error'
  }
}

onMounted(loadPlans)

const selectedPlan = computed(() => plans.value.find((plan) => plan.id === selectedPlanId.value) ?? null)
const downPaymentTooHigh = computed(() => downPayment.value >= props.price)
const estimate = computed(() => {
  const plan = selectedPlan.value
  if (!plan || downPaymentTooHigh.value) return null
  return estimateInstallment(props.price, downPayment.value, plan.months, plan.margin)
})

const costRows = computed(() => {
  const rows = [{ label: 'Harga kavling', value: props.price }]
  if (scheme.value === 'installment') {
    if (!estimate.value || !selectedPlan.value) return []
    rows.push({
      label: `Margin cicilan ${selectedPlan.value.margin.toLocaleString('id-ID')}%`,
      value: estimate.value.margin,
    })
  }
  rows.push(
    { label: 'Tanda jadi, di luar harga', value: DEFAULT_SPK_BOOKING_FEE },
    { label: 'Biaya notaris', value: NOTARY_FEE },
  )
  return rows
})
const costTotal = computed(() => costRows.value.reduce((sum, row) => sum + row.value, 0))

const downPaymentText = computed(() => (downPayment.value ? downPayment.value.toLocaleString('id-ID') : ''))

function updateDownPayment(event: Event) {
  const target = event.target as HTMLInputElement
  downPayment.value = Math.min(props.price, Number(target.value.replace(/\D/g, '')) || 0)
  target.value = downPaymentText.value
}

function quickValue(percent: number) {
  return Math.round((props.price * percent) / 100)
}
</script>

<template>
  <!-- Server hanya menghitung akun pembeli; sentuhan pertama saja yang dikirim. -->
  <div class="sim" @click.once="trackFunnel('simulation_used', lotId)">
    <div class="sim__tabs" role="group" aria-label="Cara bayar">
      <button type="button" :aria-pressed="scheme === 'cash'" @click="scheme = 'cash'">Tunai</button>
      <button type="button" :aria-pressed="scheme === 'installment'" @click="scheme = 'installment'">Cicilan</button>
    </div>

    <div :key="scheme" class="sim__body">
      <div v-if="scheme === 'cash'" class="sim__result">
        <span>Pelunasan setelah SPK disetujui</span>
        <strong>{{ formatCurrency(price) }}</strong>
      </div>

      <p v-else-if="plansState === 'loading'" class="sim__note" role="status">Memuat skema cicilan...</p>

      <div v-else-if="plansState === 'error'" class="sim__note" role="alert">
        Skema cicilan belum bisa dimuat.
        <button type="button" class="sim__retry" @click="loadPlans">Coba lagi</button>
      </div>

      <p v-else-if="!plans.length" class="sim__note">Belum ada skema cicilan.</p>

      <template v-else>
        <div class="sim__field">
          <label :for="inputId">Uang muka (opsional)</label>
          <input
            :id="inputId"
            type="text"
            inputmode="numeric"
            data-input="free"
            autocomplete="off"
            enterkeyhint="done"
            placeholder="0"
            :value="downPaymentText"
            :aria-invalid="downPaymentTooHigh"
            @input="updateDownPayment"
          />
          <div class="sim__chips" role="group" aria-label="Pilihan uang muka">
            <button
              v-for="percent in [0, 10, 20, 30]"
              :key="percent"
              type="button"
              :aria-pressed="downPayment === quickValue(percent)"
              @click="downPayment = quickValue(percent)"
            >
              {{ percent ? `${percent}%` : 'Tanpa' }}
            </button>
          </div>
        </div>

        <div class="sim__field">
          <span :id="`${inputId}-tenor`">Lama cicilan (bulan)</span>
          <div class="sim__chips" role="group" :aria-labelledby="`${inputId}-tenor`">
            <button
              v-for="plan in plans"
              :key="plan.id"
              type="button"
              :aria-pressed="selectedPlanId === plan.id"
              :aria-label="`${plan.months} bulan`"
              @click="selectedPlanId = plan.id"
            >
              {{ plan.months }}
            </button>
          </div>
        </div>

        <p v-if="downPaymentTooHigh" class="sim__error" role="alert">
          Uang muka harus lebih kecil dari harga kavling.
        </p>
        <div v-else-if="estimate && selectedPlan" class="sim__result" aria-live="polite">
          <span>Per bulan, selama {{ selectedPlan.months }} bulan</span>
          <strong>{{ formatCurrency(estimate.monthly) }}</strong>
        </div>
      </template>
    </div>

    <details v-if="costRows.length" class="sim__details">
      <summary>Rincian biaya</summary>
      <dl>
        <div v-for="row in costRows" :key="row.label">
          <dt>{{ row.label }}</dt>
          <dd>{{ formatCurrency(row.value) }}</dd>
        </div>
        <div class="sim__total">
          <dt>Perkiraan total</dt>
          <dd>{{ formatCurrency(costTotal) }}</dd>
        </div>
      </dl>
      <p>Nilai akhir mengikuti SPK.</p>
    </details>
  </div>
</template>

<style scoped>
.sim {
  display: grid;
  gap: 12px;
  color: var(--text-primary, #252525);
  text-align: left;
}

.sim button {
  min-height: 44px;
  border: 0;
  font: 700 14px/1 var(--font-primary, 'Plus Jakarta Sans', sans-serif);
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-fast, 150ms) var(--ease-spring, ease-out);
}

.sim button:active {
  transform: scale(0.97);
}

.sim button:focus-visible,
.sim summary:focus-visible {
  outline: 3px solid var(--poliland-green, #355a2c);
  outline-offset: 2px;
}

.sim__tabs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  border-radius: 14px;
  background: #ebe7dc;
}

.sim__tabs button {
  border-radius: 11px;
  background: transparent;
  color: #4a4a50;
}

.sim__tabs button[aria-pressed='true'] {
  background: var(--poliland-green, #355a2c);
  color: #fff;
}

.sim__body {
  display: grid;
  gap: 12px;
  animation: sim-enter 160ms var(--ease-out, ease-out);
}

@keyframes sim-enter {
  from { opacity: 0; }
}

.sim__field {
  display: grid;
  gap: 8px;
}

.sim__field > label,
.sim__field > span {
  color: var(--text-secondary, #5f5f66);
  font-size: 13px;
  font-weight: 700;
}

.sim__field input {
  width: 100%;
  min-height: 48px;
  padding: 0 14px;
  border: 1.5px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-primary, #fff);
  color: var(--text-primary, #252525);
  font-family: inherit;
  font-size: 16px;
  font-variant-numeric: tabular-nums;
}

.sim__field input:focus {
  border-color: var(--poliland-green, #355a2c);
  outline: 2px solid var(--poliland-green, #355a2c);
  outline-offset: 1px;
}

.sim__chips {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
}

.sim__chips button {
  border: 1.5px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-primary, #fff);
  color: var(--text-primary, #252525);
}

.sim__chips button[aria-pressed='true'] {
  border-color: var(--poliland-green, #355a2c);
  background: var(--status-success-bg, #eef5ec);
  color: var(--poliland-green, #355a2c);
}

.sim__result {
  display: grid;
  gap: 4px;
  padding: 14px;
  border-radius: var(--radius-control, 12px);
  background: var(--status-success-bg, #eef5ec);
}

.sim__result span {
  color: var(--text-secondary, #5f5f66);
  font-size: 13px;
}

.sim__result strong {
  color: var(--poliland-green, #355a2c);
  font-size: 22px;
  font-variant-numeric: tabular-nums;
  overflow-wrap: anywhere;
}

.sim__note,
.sim__error {
  margin: 0;
  color: var(--text-secondary, #5f5f66);
  font-size: 13px;
  line-height: 1.5;
}

.sim__error {
  color: var(--status-danger-text, #a32d2d);
  font-weight: 700;
}

.sim__retry {
  margin-left: 8px;
  padding: 0 12px;
  border-radius: var(--radius-control, 12px);
  background: var(--status-success-bg, #eef5ec);
  color: var(--poliland-green, #355a2c);
}

.sim__details {
  border-top: 1px solid var(--border-default, #eae7e0);
}

.sim__details summary {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: space-between;
  color: var(--poliland-green, #355a2c);
  font-size: 14px;
  font-weight: 700;
  list-style: none;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.sim__details summary::-webkit-details-marker {
  display: none;
}

.sim__details summary::after {
  content: '+';
  font-size: 20px;
  font-weight: 600;
}

.sim__details[open] summary::after {
  content: '−';
}

.sim__details dl {
  display: grid;
  margin: 0;
}

.sim__details dl > div {
  display: flex;
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 4px 12px;
  padding: 9px 0;
  border-top: 1px solid var(--border-default, #eae7e0);
  font-size: 13px;
}

.sim__details dt {
  color: var(--text-secondary, #5f5f66);
}

.sim__details dd {
  margin: 0 0 0 auto;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}

.sim__total dt,
.sim__total dd {
  color: var(--text-primary, #252525);
  font-weight: 800;
}

.sim__details p {
  margin: 4px 0 0;
  color: var(--text-secondary, #5f5f66);
  font-size: 12px;
}

@media (prefers-reduced-motion: reduce) {
  .sim button { transition: none; }
  .sim button:active { transform: none; }
}
</style>
