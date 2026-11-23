<template>
  <section class="mk-section">
    <div class="mk-section-head">
      <div>
        <h2>{{ isHead ? 'Client tim Marketing' : 'Client saya' }}</h2>
        <p>{{ filtered.length }} dari {{ rows.length }} klien</p>
      </div>
      <button type="button" class="mk-btn mk-btn--primary" @click="emit('add')">+ Tambah klien</button>
    </div>

    <div class="mk-card mk-filter-card">
      <label class="mk-field">
        <span>Cari klien</span>
        <input v-model.trim="filters.search" class="mk-input" type="search" placeholder="Nama, nomor, email, wilayah, kaveling" />
      </label>
      <div class="mk-filters">
        <label v-if="isHead" class="mk-field">
          <span>Marketing</span>
          <select v-model="filters.marketingId" class="mk-input">
            <option :value="null">Semua</option>
            <option v-for="m in members" :key="m.id" :value="m.id">{{ m.full_name }}</option>
          </select>
        </label>
        <label class="mk-field">
          <span>Perkembangan</span>
          <select v-model="filters.crmStatus" class="mk-input">
            <option :value="null">Semua</option>
            <option v-for="s in CRM_STATUSES" :key="s" :value="s">{{ s }}</option>
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
      </div>
      <button v-if="hasFilter" type="button" class="mk-link" @click="resetFilters">Hapus semua filter</button>
    </div>

    <div v-if="loading" class="mk-state" role="status">Memuat data klien…</div>
    <div v-else-if="error" class="mk-state mk-state--error" role="alert">
      <strong>Data klien belum dapat dimuat</strong>
      <span>{{ error }}</span>
      <button type="button" class="mk-btn mk-btn--primary" @click="load">Coba lagi</button>
    </div>
    <div v-else-if="!rows.length" class="mk-state">
      <strong>Belum ada klien</strong>
      <span>{{ isHead ? 'Client yang ditambahkan tim Marketing akan tampil di sini.' : 'Tambahkan calon pembeli pertama Anda untuk mulai melakukan follow-up.' }}</span>
    </div>
    <div v-else-if="!filtered.length" class="mk-state">
      <strong>Tidak ada klien yang cocok</strong>
      <span>Ubah kata kunci atau hapus filter.</span>
    </div>

    <template v-else>
      <div class="mk-table-wrap">
        <table class="mk-table mk-table--stack">
          <thead>
            <tr>
              <th>Klien</th>
              <th v-if="isHead">Marketing</th>
              <th>Wilayah asal</th>
              <th>Minat kaveling</th>
              <th>Perkembangan</th>
              <th>SPK</th>
              <th>Pembayaran</th>
              <th>Terakhir dihubungi</th>
              <th><span class="sr-only">Aksi</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in pageRows" :key="row.id" class="mk-row-link" @click="emit('open', row.id)">
              <td class="mk-cell-main">
                <span class="mk-strong">{{ row.full_name }}</span>
                <span class="mk-muted mk-block">{{ row.whatsapp_phone || row.phone || 'Nomor belum diisi' }}<template v-if="row.email"> · {{ row.email }}</template></span>
              </td>
              <td v-if="isHead" data-label="Marketing">{{ row.marketing_name || 'Mandiri (Admin)' }}</td>
              <td data-label="Wilayah asal">{{ [row.city_name, row.province_name].filter(Boolean).join(', ') || 'Belum diisi' }}</td>
              <td data-label="Minat kavling">
                <template v-if="row.interests.length">
                  {{ row.interests.map((i) => i.lot_number).join(', ') }}
                  <span class="mk-muted mk-block">{{ interestPlan(row) }}</span>
                </template>
                <template v-else>-</template>
              </td>
              <td data-label="Perkembangan"><StatusBadge :label="row.crm_status" :tone="CRM_TONE[row.crm_status] || 'neutral'" /></td>
              <td data-label="SPK"><StatusBadge :label="spkLabel(row.latest_spk_status)" :tone="spkTone(row.latest_spk_status)" /></td>
              <td data-label="Pembayaran">
                <StatusBadge v-if="row.latest_payment_status" :label="paymentStatusLabel(row.latest_payment_status)" :tone="paymentStatusTone(row.latest_payment_status)" />
                <span v-else class="mk-muted">-</span>
              </td>
              <td data-label="Terakhir dihubungi">{{ row.last_contacted_at ? formatDate(row.last_contacted_at) : 'Belum pernah' }}</td>
              <td data-label="Hubungi" @click.stop>
                <WhatsAppButton compact :phone="row.whatsapp_phone" :fallback-phone="row.phone" :client-name="row.full_name" :sender-name="senderName" />
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <nav class="mk-pager" aria-label="Halaman daftar klien">
        <button type="button" class="mk-btn mk-btn--ghost" :disabled="page <= 1" @click="page--">Sebelumnya</button>
        <span>Halaman {{ page }} dari {{ pageCount }}</span>
        <button type="button" class="mk-btn mk-btn--ghost" :disabled="page >= pageCount" @click="page++">Berikutnya</button>
      </nav>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
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
  CRM_STATUSES,
  CRM_TONE,
  formatDate,
  paymentStatusLabel,
  paymentStatusTone,
  spkLabel,
  spkTone,
} from '@/utils/marketingStatus'
import { formatPaymentPlanName } from '@/utils/paymentPlan'

const props = withDefaults(
  defineProps<{ role: 'marketing' | 'head'; senderName?: string; initialFilters?: Partial<ClientListFilters> }>(),
  { senderName: '', initialFilters: () => ({}) },
)
const emit = defineEmits<{ open: [id: number]; add: [] }>()

const isHead = computed(() => props.role === 'head')
const PAGE_SIZE = 15

const rows = ref<ClientListItem[]>([])
const members = ref<TeamMember[]>([])
const loading = ref(true)
const error = ref('')
const page = ref(1)

const emptyFilters = (): ClientListFilters => ({
  search: '', marketingId: null, crmStatus: null, spkStatus: null, paymentStatus: null, from: null, to: null,
})
const filters = reactive<ClientListFilters>({ ...emptyFilters(), ...props.initialFilters })

const filtered = computed(() => filterClients(rows.value, filters))
const pageCount = computed(() => Math.max(1, Math.ceil(filtered.value.length / PAGE_SIZE)))
const pageRows = computed(() => filtered.value.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE))
const hasFilter = computed(() => Object.entries(filters).some(([, v]) => v !== null && v !== ''))

watch(filters, () => (page.value = 1), { deep: true })
watch(() => props.initialFilters, (value) => Object.assign(filters, emptyFilters(), value), { deep: true })

function resetFilters() {
  Object.assign(filters, emptyFilters())
}

function interestPlan(row: ClientListItem) {
  const first = row.interests[0]
  if (!first) return ''
  if (first.payment_type === 'Cash') return 'Tunai'
  return `Rencana cicilan · ${formatPaymentPlanName(first.plan_name, first.months)}`
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [clients, team] = await Promise.all([listClients(), isHead.value ? getTeamMembers() : Promise.resolve([])])
    rows.value = clients
    members.value = team
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Periksa koneksi, lalu coba lagi.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
defineExpose({ reload: load })
</script>

<style scoped>
.mk-filter-card { display: grid; gap: 12px; }
.mk-block { display: block; margin-top: 2px; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); }
</style>
