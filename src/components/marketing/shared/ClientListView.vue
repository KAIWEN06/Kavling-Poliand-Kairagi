<template>
  <!--
    Tata letak mengikuti halaman Klien admin (AdminPembeli.vue): chip status, pencarian,
    kartu klien, paginasi, dan tombol tambah mengambang. Batasan peran tetap berlaku:
    data dibatasi RLS ke klien milik Marketing (atau tim untuk Kepala Bagian), tidak ada
    hapus data, dan klien baru otomatis tercatat atas nama Marketing yang menambahkan.
  -->
  <section class="cl">
    <div class="cl-chips" role="group" aria-label="Filter perkembangan klien">
      <button
        v-for="chip in chips"
        :key="chip.key"
        type="button"
        :class="['cl-chip', { active: filters.crmStatus === chip.value }]"
        :aria-pressed="filters.crmStatus === chip.value"
        @click="filters.crmStatus = chip.value"
      >
        {{ chip.label }} <span>{{ chipCount(chip.value) }}</span>
      </button>
    </div>

    <div class="cl-search-row">
      <label class="cl-search">
        <span class="sr-only">Cari klien</span>
        <ion-icon :icon="searchOutline" aria-hidden="true" />
        <input
          v-model.trim="filters.search"
          type="search"
          enterkeyhint="search"
          placeholder="Cari nama, nomor HP, atau kaveling..."
        />
        <button v-if="filters.search" type="button" aria-label="Hapus pencarian" @click="filters.search = ''">
          <ion-icon :icon="closeOutline" aria-hidden="true" />
        </button>
      </label>
      <button
        type="button"
        :class="['cl-filter-toggle', { active: filtersOpen || extraFilterCount }]"
        :aria-expanded="filtersOpen"
        aria-controls="client-filters"
        :aria-label="extraFilterCount ? `Filter lain, ${extraFilterCount} aktif` : 'Filter lain'"
        @click="filtersOpen = !filtersOpen"
      >
        <ion-icon :icon="optionsOutline" aria-hidden="true" />
        <span v-if="extraFilterCount" class="cl-filter-dot">{{ extraFilterCount }}</span>
      </button>
    </div>

    <div v-show="filtersOpen" id="client-filters" class="cl-filters">
      <label v-if="isHead" class="mk-field">
        <span>Pemasar</span>
        <select v-model="filters.marketingId" class="mk-input">
          <option :value="null">Semua</option>
          <option v-for="m in members" :key="m.id" :value="m.id">{{ m.full_name }}</option>
        </select>
      </label>
      <label class="mk-field">
        <span>Status SPK</span>
        <select v-model="filters.spkStatus" class="mk-input">
          <option :value="null">Semua</option>
          <option value="none">Belum ada SPK</option>
          <option value="pending">Menunggu</option>
          <option value="approved">Terkonfirmasi</option>
          <option value="rejected">Ditolak</option>
        </select>
      </label>
      <label class="mk-field">
        <span>Pembayaran</span>
        <select v-model="filters.paymentStatus" class="mk-input">
          <option :value="null">Semua</option>
          <option value="none">Belum ada</option>
          <option value="Pending">Menunggu verifikasi</option>
          <option value="Confirmed">Terkonfirmasi</option>
          <option value="Rejected">Ditolak</option>
        </select>
      </label>
      <label class="mk-field">
        <span>Ditambahkan dari</span>
        <input v-model="filters.from" class="mk-input" type="date" />
      </label>
      <label class="mk-field">
        <span>Sampai</span>
        <input v-model="filters.to" class="mk-input" type="date" />
      </label>
      <button v-if="hasFilter" type="button" class="mk-link cl-reset" @click="resetFilters">Hapus semua filter</button>
    </div>

    <SkeletonCardList v-if="loading" :count="5" :lines="3" label="Memuat klien" />
    <StatusIllustration
      v-else-if="error"
      :variant="resolveErrorVariant(error)"
      title="Data klien gagal dimuat"
      :on-action="() => load()"
    />
    <StatusIllustration
      v-else-if="!rows.length"
      variant="empty-data"
      title="Belum ada klien"
      :description="isHead ? 'Klien dari tim pemasaran akan muncul di sini.' : 'Tekan tombol + untuk mulai.'"
    />
    <StatusIllustration
      v-else-if="!filtered.length"
      variant="no-result"
      title="Klien tidak ditemukan"
      description="Ubah kata kunci atau filter."
      :on-action="resetFilters"
    />

    <template v-else>
      <div class="cl-list-head">
        <h2>{{ isHead ? 'Klien tim' : 'Klien saya' }}</h2>
        <span aria-live="polite">{{ filtered.length }}</span>
      </div>

      <div id="client-list-top" class="cl-list" role="list" aria-label="Daftar klien">
        <article
          v-for="(row, index) in pager.items"
          :key="row.id"
          class="cl-card"
          role="listitem"
          tabindex="0"
          :style="{ '--i': Math.min(index, 8) }"
          @click="emit('open', row.id)"
          @keydown.enter.self="emit('open', row.id)"
        >
          <div :class="['cl-avatar', avatarTone(row)]" aria-hidden="true">{{ initials(row.full_name) }}</div>
          <div class="cl-details">
            <h3>{{ row.full_name }}</h3>
            <p>{{ row.whatsapp_phone || row.phone || 'Nomor belum diisi' }}</p>
            <small v-if="row.interests.length">Kaveling {{ row.interests.map((i) => i.lot_number).join(', ') }} · {{ interestPlan(row) }}</small>
            <small>SPK: {{ spkLabel(row.latest_spk_status) }}<template v-if="row.latest_payment_status"> · Bayar: {{ paymentStatusLabel(row.latest_payment_status) }}</template></small>
            <small>{{ row.last_contacted_at ? `Dihubungi ${formatDate(row.last_contacted_at)}` : 'Belum pernah dihubungi' }}</small>
            <small v-if="isHead" class="cl-owner">Pemasar: {{ row.marketing_name || 'Mandiri (Admin)' }}</small>
          </div>
          <div class="cl-side" @click.stop @keydown.enter.stop>
            <StatusBadge :label="crmStatusLabel(row.crm_status)" :tone="CRM_TONE[row.crm_status] || 'neutral'" />
            <WhatsAppButton compact :phone="row.whatsapp_phone" :fallback-phone="row.phone" :client-name="row.full_name" :sender-name="senderName" />
          </div>
          <ion-icon class="cl-chevron" :icon="chevronForwardOutline" aria-hidden="true" />
        </article>
      </div>

      <AppPagination
        v-model:page="pager.page"
        :total-pages="pager.totalPages"
        :total="pager.total"
        :page-size="pager.pageSize"
        scroll-to="#client-list-top"
        label="Halaman daftar klien"
      />
    </template>

    <button type="button" class="cl-fab" aria-label="Tambah klien" title="Tambah klien" @click="emit('add')">
      <ion-icon :icon="addOutline" aria-hidden="true" />
    </button>
  </section>
</template>

<script setup lang="ts">
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import { IonIcon } from '@ionic/vue'
import { addOutline, chevronForwardOutline, closeOutline, optionsOutline, searchOutline } from 'ionicons/icons'
import SkeletonCardList from '@/components/ui/skeletons/SkeletonCardList.vue'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import { usePagination } from '@/composables/usePagination'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import WhatsAppButton from './WhatsAppButton.vue'
import {
  filterClients,
  getTeamMembers,
  listClients,
  type ClientListFilters,
  type ClientListItem,
  type TeamMember,
} from '@/services/marketing/marketingCrmService'
import {
  CRM_GROUPS,
  CRM_TONE,
  crmStatusLabel,
  formatDate,
  paymentStatusLabel,
  spkLabel,
} from '@/utils/marketingStatus'
import { formatPaymentPlanName } from '@/utils/paymentPlan'

const props = withDefaults(
  defineProps<{ role: 'marketing' | 'head'; senderName?: string; initialFilters?: Partial<ClientListFilters> }>(),
  { senderName: '', initialFilters: () => ({}) },
)
const emit = defineEmits<{ open: [id: number]; add: [] }>()

const isHead = computed(() => props.role === 'head')
const PAGE_SIZE = 10

const rows = ref<ClientListItem[]>([])
const members = ref<TeamMember[]>([])
const loading = ref(true)
const loaded = ref(false)
const error = ref('')

const emptyFilters = (): ClientListFilters => ({
  search: '', marketingId: null, crmStatus: null, spkStatus: null, paymentStatus: null, from: null, to: null,
})
const filters = reactive<ClientListFilters>({ ...emptyFilters(), ...props.initialFilters })

/* Chip mencakup seluruh status CRM dalam tahapan berurutan, seperti chip status di halaman admin. */
const BASE_CHIPS: Array<{ value: string | null; label: string }> = [
  { value: null, label: 'Semua' },
  { value: 'group:uncontacted', label: 'Belum dihubungi' },
  { value: 'group:followup', label: 'Tindak lanjut' },
  { value: 'group:interested', label: 'Berminat' },
  { value: 'Pengajuan', label: 'Pengajuan' },
  { value: 'Berhasil', label: 'Berhasil' },
  { value: 'Tidak Lanjut', label: 'Tidak berlanjut' },
]

/* Tautan dari Beranda bisa membawa satu status tunggal (mis. "Baru"); tampilkan sebagai chip aktif. */
const chips = computed(() => {
  const current = filters.crmStatus ?? null
  const list = BASE_CHIPS.map((c) => ({ ...c, key: c.value ?? 'all' }))
  if (current && !BASE_CHIPS.some((c) => c.value === current)) {
    list.splice(1, 0, { value: current, label: CRM_GROUPS[current]?.label ?? crmStatusLabel(current), key: current })
  }
  return list
})

const filtered = computed(() => filterClients(rows.value, filters))
/* Hitungan chip mengikuti filter lain (pencarian, SPK, dst.) agar angka sesuai isi daftar. */
const chipBase = computed(() => filterClients(rows.value, { ...filters, crmStatus: null }))
function chipCount(value: string | null) {
  return value ? filterClients(chipBase.value, { crmStatus: value }).length : chipBase.value.length
}

const pager = usePagination(filtered, { pageSize: PAGE_SIZE, resetOn: () => JSON.stringify(filters) })
const hasFilter = computed(() => Object.entries(filters).some(([, v]) => v !== null && v !== ''))
const extraFilterCount = computed(() =>
  Object.entries(filters).filter(([k, v]) => k !== 'search' && k !== 'crmStatus' && v !== null && v !== '').length,
)
/* Filter dari tautan (kartu ringkasan) langsung terlihat agar jelas mengapa daftar tersaring. */
const filtersOpen = ref(extraFilterCount.value > 0)

watch(() => props.initialFilters, (value) => {
  Object.assign(filters, emptyFilters(), value)
  filtersOpen.value = extraFilterCount.value > 0
})

function resetFilters() {
  Object.assign(filters, emptyFilters())
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function avatarTone(row: ClientListItem) {
  const tone = CRM_TONE[row.crm_status]
  if (tone === 'success') return 'mint'
  if (tone === 'danger') return 'rose'
  if (tone === 'gold' || tone === 'warning') return 'gold'
  return 'blue'
}

function interestPlan(row: ClientListItem) {
  const first = row.interests[0]
  if (!first) return ''
  if (first.payment_type === 'Cash') return 'Tunai'
  const plan = formatPaymentPlanName(first.plan_name, first.months)
  return /cicilan/i.test(plan) ? plan : `Cicilan ${plan}`
}

async function load({ silent = false }: LoadOptions = {}) {
  // Skeleton hanya pada muat awal; saat refresh data lama tetap tampil.
  if (!loaded.value) loading.value = true
  error.value = ''
  try {
    const [clients, team] = await Promise.all([listClients(), isHead.value ? getTeamMembers() : Promise.resolve([])])
    rows.value = clients
    members.value = team
    loaded.value = true
  } catch (cause) {
    if (!silent || !loaded.value) error.value = cause instanceof Error ? cause.message : 'Periksa koneksi, lalu coba lagi.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
defineExpose({ reload: load })

useRealtimeRefresh(
  ['customers', 'customer_followups', 'customer_interests', 'lot_transactions', 'spk_requests', 'profiles'],
  () => load({ silent: true }),
)

</script>

<style scoped>
.cl { display: grid; gap: 0; }

.cl-chips { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; margin: 0 calc(var(--page-gutter, 16px) * -1) 14px; padding: 0 var(--page-gutter, 16px) 2px; }
.cl-chips::-webkit-scrollbar { display: none; }
.cl-chip {
  flex: none; min-height: 40px; padding: 0 13px;
  border: 1px solid var(--border-default); border-radius: var(--radius-control);
  background: var(--surface-primary); color: var(--text-primary);
  font: inherit; font-size: 12px; white-space: nowrap;
  touch-action: manipulation; user-select: none; -webkit-user-select: none;
  transition: transform var(--dur-instant) var(--ease-out), background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}
.cl-chip span { margin-left: 4px; color: var(--text-secondary); }
.cl-chip.active { border-color: var(--poliland-gold); background: var(--poliland-gold-soft); color: var(--text-primary); }
.cl-chip.active span { color: var(--poliland-gold-text-soft); }
.cl-chip:active { transform: scale(0.97); }
.cl-chip:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }

.cl-search-row { display: grid; grid-template-columns: minmax(0, 1fr) 46px; gap: 8px; }
.cl-search {
  display: flex; align-items: center; gap: 9px; min-height: 46px; padding: 0 6px 0 13px;
  border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary);
}
.cl-search:focus-within { border-color: var(--poliland-green); }
.cl-search > ion-icon { flex: none; color: var(--text-secondary); font-size: 18px; }
/* 16px: iOS tidak memperbesar halaman saat kolom difokuskan. */
.cl-search input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 16px; }
.cl-search button { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border: 0; background: transparent; color: var(--text-secondary); touch-action: manipulation; }
.cl-filter-toggle {
  position: relative; display: grid; place-items: center; width: 46px; height: 46px;
  border: 1px solid var(--border-default); border-radius: var(--radius-control);
  background: var(--surface-primary); color: var(--text-primary); font-size: 20px;
  touch-action: manipulation;
  transition: transform var(--dur-instant) var(--ease-out);
}
.cl-filter-toggle.active { border-color: var(--poliland-green); color: var(--poliland-green); }
.cl-filter-toggle:active { transform: scale(0.97); }
.cl-filter-toggle:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.cl-filter-dot {
  position: absolute; top: -6px; right: -6px; display: grid; place-items: center;
  min-width: 20px; height: 20px; padding: 0 5px; border-radius: 999px;
  background: var(--poliland-green); color: #fff; font-size: 11px; font-weight: var(--font-weight-bold);
}

.cl-filters {
  display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px;
  margin-top: 10px; padding: 14px; border: 1px solid var(--border-default);
  border-radius: var(--radius-card); background: var(--surface-primary);
}
.cl-filters .mk-input { font-size: 16px; }
.cl-reset { grid-column: 1 / -1; justify-self: start; }

.cl-list-head { display: flex; align-items: center; justify-content: space-between; margin: 22px 0 10px; }
.cl-list-head h2 { margin: 0; font-size: 16px; font-weight: var(--font-weight-bold); }
.cl-list-head span { color: var(--text-secondary); font-size: 12px; font-weight: var(--font-weight-bold); }

.cl-list { display: grid; gap: 12px; }
.cl-card {
  display: grid; grid-template-columns: 44px minmax(0, 1fr) auto 12px; align-items: center; gap: 10px;
  padding: 14px; border: 1px solid var(--border-default); border-radius: var(--radius-card);
  background: var(--surface-primary); cursor: pointer; touch-action: manipulation;
  /* backwards, bukan both: setelah selesai transform dilepas agar kartu tidak membuat stacking context
     yang mengurung modal WhatsApp di bawah tombol tambah. */
  animation: cl-in var(--dur-slow) var(--ease-spring) backwards;
  animation-delay: calc(var(--i, 0) * 60ms);
  transition: transform var(--dur-instant) var(--ease-out), box-shadow var(--dur-base) var(--ease-out);
}
.cl-card:active { transform: scale(0.97); transition-timing-function: var(--ease-spring); }
.cl-card:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
@media (hover: hover) and (pointer: fine) {
  .cl-card:hover { box-shadow: var(--shadow-md); }
  .cl-chip:hover { border-color: var(--border-strong); }
}
@keyframes cl-in {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: none; }
}

.cl-avatar { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 50%; font-size: 13px; font-weight: var(--font-weight-bold); }
.cl-avatar.mint { background: var(--status-success-bg); color: var(--poliland-green); }
.cl-avatar.gold { background: var(--poliland-gold-soft); color: var(--poliland-gold-text-soft); }
.cl-avatar.rose { background: color-mix(in srgb, var(--status-danger) 11%, white); color: var(--status-danger); }
.cl-avatar.blue { background: color-mix(in srgb, var(--poliland-green) 10%, white); color: var(--poliland-green); }

.cl-details { min-width: 0; }
.cl-details h3 { margin: 0 0 2px; font-size: 14px; font-weight: var(--font-weight-bold); overflow-wrap: anywhere; }
.cl-details p, .cl-details small { display: block; margin: 0; color: var(--text-secondary); font-size: 11px; line-height: 1.5; overflow-wrap: anywhere; }
.cl-owner { color: var(--poliland-gold-text-soft) !important; }

.cl-side { display: grid; justify-items: end; align-self: start; gap: 8px; cursor: default; }
.cl-chevron { color: var(--text-secondary); font-size: 18px; }

.cl-fab {
  position: fixed; right: 16px; bottom: calc(92px + var(--safe-bottom)); z-index: 20; /* di bawah AppModal (11000) dan tab bar */
  display: grid; place-items: center; width: 52px; height: 52px; padding: 0;
  border: 0; border-radius: 50%; appearance: none;
  background: var(--poliland-green); color: #fff; font: inherit; cursor: pointer;
  box-shadow: 0 8px 20px rgb(37 37 37 / 16%);
  touch-action: manipulation; user-select: none; -webkit-user-select: none;
  transition: transform var(--dur-instant) var(--ease-out);
}
.cl-fab ion-icon { font-size: 24px; }
.cl-fab:active { transform: scale(0.97); transition-timing-function: var(--ease-spring); }
.cl-fab:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 3px; }

.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }

@media (max-width: 360px) {
  .cl-card { grid-template-columns: 40px minmax(0, 1fr) 12px; gap: 8px; }
  .cl-side { grid-column: 2; grid-row: 2; justify-items: start; grid-auto-flow: column; align-items: center; }
  .cl-fab { right: 12px; }
  .cl-filters { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .cl-card { animation: cl-fade var(--dur-fast) linear backwards; animation-delay: 0ms; }
  .cl-card:active, .cl-chip:active, .cl-fab:active, .cl-filter-toggle:active { transform: none; }
}
@keyframes cl-fade { from { opacity: 0; } to { opacity: 1; } }
</style>
