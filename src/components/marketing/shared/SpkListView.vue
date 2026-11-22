<template>
  <section class="mk-section">
    <div class="mk-chips" role="group" aria-label="Filter status SPK">
      <button v-for="opt in statusOptions" :key="opt.value" type="button" class="mk-chip" :aria-pressed="status === opt.value" @click="status = opt.value">
        {{ opt.label }} ({{ count(opt.value) }})
      </button>
    </div>
    <div class="mk-filters">
      <label class="mk-field"><span>Cari</span><input v-model.trim="search" class="mk-input" type="search" placeholder="Nama client, nomor SPK, kavling" /></label>
      <label v-if="isHead" class="mk-field">
        <span>Marketing</span>
        <select v-model="marketingId" class="mk-input">
          <option value="">Semua</option>
          <option v-for="m in members" :key="m.id" :value="m.id">{{ m.full_name }}</option>
        </select>
      </label>
    </div>

    <div v-if="loading" class="mk-state" role="status">Memuat pengajuan SPK…</div>
    <div v-else-if="error" class="mk-state mk-state--error" role="alert"><strong>Pengajuan SPK belum dapat dimuat</strong><span>{{ error }}</span></div>
    <div v-else-if="!filtered.length" class="mk-state"><strong>Belum ada pengajuan</strong><span>Pengajuan SPK client akan tampil di sini setelah diajukan.</span></div>

    <div v-else class="mk-table-wrap">
      <table class="mk-table mk-table--stack">
        <thead>
          <tr>
            <th>Client</th><th v-if="isHead">Marketing</th><th>Kavling</th><th>Tanggal pengajuan</th>
            <th class="num">Nominal SPK</th><th>Status SPK</th><th>Pembayaran SPK</th><th>Catatan Admin</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filtered" :key="row.id" :class="{ 'mk-row-link': row.customer_id }" @click="row.customer_id && emit('open-client', row.customer_id)">
            <td class="mk-cell-main">
              {{ row.customer_name }}
              <span class="mk-muted mk-block">{{ row.spk_number }} · {{ row.submission_source }}</span>
            </td>
            <td v-if="isHead" data-label="Marketing">{{ memberName(row.owner_id) }}</td>
            <td data-label="Kavling">{{ row.lot?.lot_number || '-' }}</td>
            <td data-label="Diajukan">{{ formatDate(row.submitted_at) }}</td>
            <td data-label="Nominal SPK" class="num">{{ formatRupiah(row.booking_fee_snapshot) }}</td>
            <td data-label="Status SPK"><StatusBadge :label="spkLabel(row.status)" :tone="spkTone(row.status)" /></td>
            <td data-label="Pembayaran SPK">
              <StatusBadge v-if="row.booking_payment_status" :label="paymentStatusLabel(row.booking_payment_status)" :tone="paymentStatusTone(row.booking_payment_status)" />
              <span v-else class="mk-muted">Belum ada</span>
            </td>
            <td data-label="Catatan Admin">
              <template v-if="row.status === 'Rejected'"><span class="mk-danger-text">{{ row.rejection_reason || 'Ditolak tanpa alasan' }}</span></template>
              <template v-else>{{ row.admin_note || '-' }}</template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p class="mk-muted">Konfirmasi dan penolakan SPK dilakukan oleh Admin. Halaman ini hanya untuk pemantauan.</p>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import StatusBadge from './StatusBadge.vue'
import { getTeamMembers, listSpkRequests, type TeamMember } from '@/services/marketing/marketingCrmService'
import { formatDate, formatRupiah, paymentStatusLabel, paymentStatusTone, spkLabel, spkTone } from '@/utils/marketingStatus'

const props = defineProps<{ role: 'marketing' | 'head' }>()
const emit = defineEmits<{ 'open-client': [id: number] }>()
const isHead = computed(() => props.role === 'head')

const rows = ref<any[]>([])
const members = ref<TeamMember[]>([])
const loading = ref(true)
const error = ref('')
const status = ref<'all' | 'pending' | 'approved' | 'rejected'>('all')
const search = ref('')
const marketingId = ref('')

const statusOptions = [
  { value: 'all' as const, label: 'Semua' },
  { value: 'pending' as const, label: 'Menunggu' },
  { value: 'approved' as const, label: 'Terkonfirmasi' },
  { value: 'rejected' as const, label: 'Ditolak' },
]

function matchStatus(row: any, value: typeof status.value) {
  if (value === 'all') return true
  if (value === 'pending') return row.status === 'Submitted' || row.status === 'Under Review'
  if (value === 'approved') return row.status === 'Approved'
  return row.status === 'Rejected'
}
const base = computed(() => rows.value.filter((row) => {
  if (marketingId.value && row.owner_id !== marketingId.value) return false
  const q = search.value.toLowerCase()
  if (q && ![row.customer_name, row.spk_number, row.lot?.lot_number].filter(Boolean).join(' ').toLowerCase().includes(q)) return false
  return true
}))
const filtered = computed(() => base.value.filter((row) => matchStatus(row, status.value)))
function count(value: typeof status.value) {
  return base.value.filter((row) => matchStatus(row, value)).length
}
function memberName(id: string | null) {
  return members.value.find((m) => m.id === id)?.full_name ?? '-'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [spks, team] = await Promise.all([listSpkRequests(), getTeamMembers()])
    // Hanya SPK yang dapat diatribusikan ke tim Marketing (RLS sudah membatasi baris).
    rows.value = spks.filter((row) => row.owner_id && team.some((m) => m.id === row.owner_id))
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
.mk-block { display: block; margin-top: 2px; }
</style>
