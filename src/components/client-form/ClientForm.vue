<script setup lang="ts">
import { computed, nextTick, ref, useId, watch } from 'vue'
import { IonIcon } from '@ionic/vue'
import { checkmarkOutline, chevronDownOutline, closeOutline } from 'ionicons/icons'
import AppNotice from '@/components/ui/AppNotice.vue'
import AddressFields from '@/components/marketing/shared/AddressFields.vue'
import { formatPaymentPlanName } from '@/utils/paymentPlan'
import type { AssigneeMode, ClientDraft, ClientDraftRules } from '@/utils/clientDraft'

export interface ClientFormLot {
  id: number
  lot_number: string
  polygon_id?: string | null
  dimension?: string | null
  area?: number | string | null
  cash_price?: number | string | null
  promo_price?: number | string | null
  blocks?: any
}

export interface ClientFormPlan {
  id: number
  plan_name: string
  months: number
}

const props = withDefaults(defineProps<{
  modelValue: ClientDraft
  assignee: AssigneeMode
  interest: ClientDraftRules['interest']
  members?: Array<{ id: string; full_name: string | null }>
  membersError?: string
  lots?: ClientFormLot[]
  lotsLoading?: boolean
  lotsError?: string
  plans?: ClientFormPlan[]
  plansLoading?: boolean
  /** Pesan gagal simpan atau validasi; digulirkan ke layar saat muncul. */
  error?: string
}>(), {
  members: () => [],
  membersError: '',
  lots: () => [],
  lotsLoading: false,
  lotsError: '',
  plans: () => [],
  plansLoading: false,
  error: '',
})

const emit = defineEmits<{
  'update:modelValue': [value: ClientDraft]
  retryLots: []
}>()

const uid = useId()
const lotPickerOpen = ref(false)
const lotSearch = ref('')
const errorBox = ref<HTMLElement | null>(null)

function patch(changes: Partial<ClientDraft>) {
  emit('update:modelValue', { ...props.modelValue, ...changes })
}

const text = (event: Event) => (event.target as HTMLInputElement).value

const selectedLots = computed(() => props.lots.filter((lot) => props.modelValue.lot_ids.includes(lot.id)))

const filteredLots = computed(() => {
  const keyword = lotSearch.value.trim().toLowerCase()
  if (!keyword) return props.lots
  return props.lots.filter((lot) =>
    [lot.lot_number, lot.polygon_id, lot.dimension, lot.blocks?.code, lot.blocks?.name]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(keyword)),
  )
})

function lotMeta(lot: ClientFormLot) {
  const block = lot.blocks?.code || lot.blocks?.name
  const price = lot.promo_price ?? lot.cash_price
  return [
    block ? `Blok ${block}` : null,
    lot.area ? `${Number(lot.area)} m²` : lot.dimension,
    price != null ? `Rp ${Number(price).toLocaleString('id-ID')}` : null,
  ].filter(Boolean).join(' · ') || 'Detail belum tercatat'
}

function toggleLot(id: number) {
  const ids = props.modelValue.lot_ids
  patch({ lot_ids: ids.includes(id) ? ids.filter((item) => item !== id) : [...ids, id] })
}

function selectPayment(type: ClientDraft['payment_type']) {
  patch({ payment_type: type, plan_id: type === 'Cash' ? null : props.modelValue.plan_id })
}

watch(() => props.error, async (message) => {
  if (!message) return
  await nextTick()
  errorBox.value?.scrollIntoView({ block: 'nearest', behavior: 'smooth' })
})
</script>

<template>
  <div class="cf">
    <section class="cf-card" :aria-labelledby="`${uid}-personal`">
      <h3 :id="`${uid}-personal`">Data diri</h3>

      <label class="mk-field">
        <span>Nama <b aria-hidden="true">*</b></span>
        <input
          class="mk-input" :value="modelValue.full_name" data-input="name" autocomplete="off"
          maxlength="100" placeholder="Nama panggilan juga boleh" required @input="patch({ full_name: text($event) })"
        />
      </label>

      <div class="cf-pair">
        <label class="mk-field">
          <span>Nomor HP <b aria-hidden="true">*</b></span>
          <input
            class="mk-input" :value="modelValue.phone" type="tel" inputmode="tel" autocomplete="off"
            maxlength="20" placeholder="08xxxxxxxxxx" required @input="patch({ phone: text($event) })"
          />
        </label>
        <label class="mk-field">
          <span>Nomor WhatsApp <em>(jika berbeda)</em></span>
          <input
            class="mk-input" :value="modelValue.whatsapp_phone" type="tel" inputmode="tel" autocomplete="off"
            maxlength="20" placeholder="Kosongkan jika sama" @input="patch({ whatsapp_phone: text($event) })"
          />
        </label>
      </div>

      <label class="mk-field">
        <span>Email <em>(opsional)</em></span>
        <input
          class="mk-input" :value="modelValue.email" type="email" autocomplete="off" autocapitalize="none"
          maxlength="120" placeholder="nama@email.com" @input="patch({ email: text($event) })"
        />
      </label>
    </section>

    <section class="cf-card" :aria-labelledby="`${uid}-address`">
      <h3 :id="`${uid}-address`">Tempat tinggal</h3>
      <AddressFields :model-value="modelValue.address" @update:model-value="patch({ address: $event })" />
    </section>

    <section v-if="assignee !== 'none'" class="cf-card" :aria-labelledby="`${uid}-assignee`">
      <h3 :id="`${uid}-assignee`">Penanggung jawab</h3>
      <p v-if="assignee === 'self'" class="cf-note">Klien tercatat atas nama Anda.</p>
      <template v-else>
        <label class="mk-field">
          <span>
            Pemasar
            <b v-if="assignee === 'required'" aria-hidden="true">*</b>
            <em v-else>(opsional)</em>
          </span>
          <select class="mk-input" :value="modelValue.marketing_id" @change="patch({ marketing_id: text($event) })">
            <option value="">{{ assignee === 'required' ? 'Pilih anggota tim' : 'Tanpa pemasar (datang langsung)' }}</option>
            <option v-for="member in members" :key="member.id" :value="member.id">{{ member.full_name || 'Tanpa nama' }}</option>
          </select>
        </label>
        <AppNotice v-if="membersError" tone="error">{{ membersError }}</AppNotice>
      </template>
    </section>

    <section v-if="interest !== 'hidden'" class="cf-card" :aria-labelledby="`${uid}-interest`">
      <h3 :id="`${uid}-interest`">Minat kaveling</h3>

      <div class="mk-field">
        <span>
          Kaveling
          <b v-if="interest === 'required'" aria-hidden="true">*</b>
          <em v-else>(opsional)</em>
        </span>
        <button type="button" class="mk-input cf-select" :aria-expanded="lotPickerOpen" @click="lotPickerOpen = !lotPickerOpen">
          <span>{{ modelValue.lot_ids.length ? `${modelValue.lot_ids.length} kaveling dipilih` : 'Pilih kaveling' }}</span>
          <IonIcon :icon="chevronDownOutline" aria-hidden="true" />
        </button>

        <div v-if="lotPickerOpen" class="cf-picker">
          <input
            v-model="lotSearch" data-discard-ignore class="mk-input" type="search" enterkeyhint="search"
            placeholder="Cari nomor kaveling atau blok" aria-label="Cari kaveling"
          />
          <p v-if="lotsLoading" class="cf-state" role="status">Memuat kaveling...</p>
          <div v-else-if="lotsError" class="cf-state" role="alert">
            <span>{{ lotsError }}</span>
            <button type="button" class="mk-link" @click="emit('retryLots')">Coba lagi</button>
          </div>
          <p v-else-if="!filteredLots.length" class="cf-state">
            {{ lots.length ? 'Tidak ada kaveling yang cocok.' : 'Belum ada kaveling tersedia.' }}
          </p>
          <div v-else class="cf-lots" role="group" aria-label="Kaveling tersedia">
            <button
              v-for="lot in filteredLots" :key="lot.id" type="button" class="cf-lot" data-discard-change
              :aria-pressed="modelValue.lot_ids.includes(lot.id)" @click="toggleLot(lot.id)"
            >
              <span class="cf-check" aria-hidden="true">
                <IonIcon v-if="modelValue.lot_ids.includes(lot.id)" :icon="checkmarkOutline" />
              </span>
              <span class="cf-lot-copy">
                <strong>{{ lot.lot_number }}</strong>
                <small>{{ lotMeta(lot) }}</small>
              </span>
            </button>
          </div>
          <button type="button" class="mk-btn mk-btn--primary" @click="lotPickerOpen = false">Selesai</button>
        </div>

        <div v-if="selectedLots.length" class="cf-chips">
          <button
            v-for="lot in selectedLots" :key="lot.id" type="button" class="cf-chip" data-discard-change
            :aria-label="`Hapus kaveling ${lot.lot_number}`" @click="toggleLot(lot.id)"
          >
            <span>{{ lot.lot_number }}</span>
            <IonIcon :icon="closeOutline" aria-hidden="true" />
          </button>
        </div>
      </div>

      <div class="mk-field">
        <span>Metode pembayaran</span>
        <div class="cf-options">
          <button
            type="button" class="cf-option" data-discard-change
            :aria-pressed="modelValue.payment_type === 'Cash'" @click="selectPayment('Cash')"
          >
            <strong>Tunai</strong><small>Sekali bayar</small>
          </button>
          <button
            type="button" class="cf-option" data-discard-change
            :aria-pressed="modelValue.payment_type === 'Installment'" @click="selectPayment('Installment')"
          >
            <strong>Cicilan</strong><small>Bayar bertahap</small>
          </button>
        </div>
      </div>

      <div v-if="modelValue.payment_type === 'Installment'" class="mk-field">
        <span>Rencana tenor <em>(opsional)</em></span>
        <p v-if="plansLoading" class="cf-state" role="status">Memuat pilihan tenor...</p>
        <p v-else-if="!plans.length" class="cf-state">Belum ada pilihan tenor.</p>
        <div v-else class="cf-options cf-options--plans">
          <button
            v-for="plan in plans" :key="plan.id" type="button" class="cf-option" data-discard-change
            :aria-pressed="modelValue.plan_id === plan.id"
            @click="patch({ plan_id: modelValue.plan_id === plan.id ? null : plan.id })"
          >
            <strong>{{ plan.months }} bulan</strong>
            <small>{{ formatPaymentPlanName(plan.plan_name, plan.months) }}</small>
          </button>
        </div>
        <small>Rencana awal. Admin menetapkan transaksi final.</small>
      </div>
    </section>

    <section class="cf-card" :aria-labelledby="`${uid}-notes`">
      <h3 :id="`${uid}-notes`">Catatan</h3>
      <label class="mk-field">
        <span>Catatan <em>(opsional)</em></span>
        <textarea
          class="mk-input" rows="3" maxlength="500" :value="modelValue.notes"
          placeholder="Misalnya waktu yang nyaman untuk dihubungi" @input="patch({ notes: text($event) })"
        />
        <small class="cf-count">{{ modelValue.notes.length }}/500</small>
      </label>
    </section>

    <div v-if="error" ref="errorBox">
      <AppNotice tone="error">
        {{ error }}
        <slot name="error-action" />
      </AppNotice>
    </div>
  </div>
</template>

<style scoped>
.cf { display: grid; gap: var(--space-4); min-width: 0; text-align: left; }

.cf-card {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--surface-primary);
  box-shadow: var(--shadow-sm);
}

.cf-card h3 {
  margin: 0;
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: var(--text-lg);
  font-weight: 600;
}
.cf-card h3::after {
  content: '';
  display: block;
  width: 28px;
  height: 3px;
  margin-top: 6px;
  border-radius: var(--radius-pill);
  background: var(--poliland-gold);
}

.cf :deep(.mk-field > span b) { color: var(--status-danger-text, #b13d36); }
.cf :deep(.mk-field > span em) { color: var(--text-secondary); font-style: normal; font-weight: 500; }
.cf textarea { resize: vertical; }

.cf-pair { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-3); }
@media (min-width: 521px) { .cf-pair { grid-template-columns: repeat(2, minmax(0, 1fr)); } }

.cf-note { margin: 0; color: var(--text-secondary); font-size: var(--text-sm); }
.cf-count { justify-self: end; }

.cf button { touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.cf-select,
.cf-lot,
.cf-option,
.cf-chip { cursor: pointer; user-select: none; -webkit-user-select: none; transition: transform var(--dur-fast) var(--ease-spring); }
.cf-select:active,
.cf-lot:active,
.cf-option:active,
.cf-chip:active { transform: scale(0.97); }
.cf-lot:focus-visible,
.cf-option:focus-visible,
.cf-chip:focus-visible { outline: 2px solid var(--green-700); outline-offset: 2px; }

.cf-select { display: flex; align-items: center; justify-content: space-between; gap: var(--space-2); text-align: left; }

.cf-picker {
  display: grid;
  gap: var(--space-2);
  padding: var(--space-2);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--surface-muted);
}
.cf-state { display: grid; justify-items: center; gap: 4px; margin: 0; padding: var(--space-3); color: var(--text-secondary); font-size: var(--text-sm); text-align: center; }
.cf-lots { display: grid; gap: 6px; max-height: 264px; overflow-y: auto; overscroll-behavior: contain; }

.cf-lot,
.cf-option {
  min-width: 0;
  min-height: 56px;
  padding: 10px var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--surface-primary);
  color: var(--text-primary);
  font: inherit;
  text-align: left;
}
.cf-lot { display: flex; align-items: center; gap: var(--space-3); }
.cf-lot[aria-pressed='true'],
.cf-option[aria-pressed='true'] {
  border-color: var(--green-700);
  background: var(--status-success-bg);
  box-shadow: inset 0 0 0 1px var(--green-700);
}
.cf-check { display: grid; flex: 0 0 22px; width: 22px; height: 22px; place-items: center; border: 1.5px solid var(--border-strong); border-radius: 6px; background: var(--surface-primary); }
.cf-lot[aria-pressed='true'] .cf-check { border-color: var(--green-700); background: var(--green-700); color: #fff; }
.cf-lot-copy,
.cf-option { display: grid; gap: 2px; align-content: center; }
.cf-lot-copy { min-width: 0; }
.cf-lot strong,
.cf-option strong { font-size: var(--text-sm); }
.cf-lot small,
.cf-option small { color: var(--text-secondary); font-size: var(--text-xs); overflow-wrap: anywhere; }

.cf-options { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-2); }
.cf-options--plans { grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); }

.cf-chips { display: flex; flex-wrap: wrap; gap: var(--space-2); }
.cf-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 var(--space-3);
  border: 1px solid var(--green-700);
  border-radius: var(--radius-pill);
  background: var(--status-success-bg);
  color: var(--green-800);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 700;
}

@media (prefers-reduced-motion: reduce) {
  .cf-select, .cf-lot, .cf-option, .cf-chip { transition: none; }
}
</style>
