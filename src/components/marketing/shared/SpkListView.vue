<template>
  <section class="mk-section">
    <div class="mk-chips" role="group" aria-label="Filter status SPK">
      <button v-for="opt in statusOptions" :key="opt.value" type="button" class="mk-chip" :aria-pressed="status === opt.value" @click="status = opt.value">
        {{ opt.label }} ({{ count(opt.value) }})
      </button>
    </div>
    <div class="mk-filters">
      <label class="mk-field"><span>Cari</span><input v-model.trim="search" class="mk-input" type="search" placeholder="Klien, nomor SPK, kaveling" /></label>
      <label v-if="isHead" class="mk-field">
        <span>Pemasar</span>
        <select v-model="marketingId" class="mk-input">
          <option value="">Semua</option>
          <option v-for="m in members" :key="m.id" :value="m.id">{{ m.full_name }}</option>
        </select>
      </label>
    </div>

    <SkeletonRowList v-if="loading" :rows="5" :fields="3" :badges="[3]" label="Memuat pengajuan SPK" />
    <StatusIllustration
      v-else-if="error"
      :variant="resolveErrorVariant(error)"
      title="Pengajuan SPK belum dapat dimuat"
      :on-action="() => load()"
    />
    <StatusIllustration
      v-else-if="!filtered.length"
      variant="empty-data"
      :title="rows.length ? 'Tidak ada yang cocok' : 'Belum ada pengajuan'"
      :description="rows.length ? 'Ubah pencarian atau filter status.' : isHead ? 'Pengajuan SPK klien muncul di sini.' : 'Mulai dari kaveling yang tersedia untuk klien Anda.'"
    />

    <div v-else class="mk-table-wrap">
      <table class="mk-table mk-table--stack">
        <thead>
          <tr>
            <th>Klien</th><th v-if="isHead">Pemasar</th><th>Kaveling</th><th>Diajukan</th>
            <th class="num">Nominal SPK</th><th>Status SPK</th><th>Tahapan proses</th><th>Pembayaran SPK</th><th>Catatan Admin</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="row in filtered" :id="`notif-spk-${row.id}`" :key="row.id" :class="{ 'mk-row-link': row.customer_id, 'notif-target': focusedId === row.id }" @click="row.customer_id && emit('open-client', row.customer_id)">
            <td class="mk-cell-main">
              <button v-if="row.customer_id" type="button" class="mk-cell-link" @click.stop="emit('open-client', row.customer_id)">{{ row.customer_name }}</button>
              <template v-else>{{ row.customer_name }}</template>
              <span class="mk-muted mk-block">{{ row.spk_number }} · {{ row.submission_source }}</span>
            </td>
            <td v-if="isHead" data-label="Pemasar">{{ memberName(row.owner_id) }}</td>
            <td data-label="Kaveling">{{ row.lot?.lot_number || '-' }}</td>
            <td data-label="Diajukan">{{ formatDate(row.submitted_at) }}</td>
            <td data-label="Nominal SPK" class="num">{{ formatRupiah(row.booking_fee_snapshot) }}</td>
            <td data-label="Status SPK"><StatusBadge :label="spkLabel(row.status)" :tone="spkTone(row.status)" /></td>
            <td data-label="Tahapan proses">
              <StatusBadge v-if="spkStage(row.status, row.notary_status)" :label="SPK_STAGE_LABEL[spkStage(row.status, row.notary_status)!]" :tone="SPK_STAGE_TONE[spkStage(row.status, row.notary_status)!]" />
              <span v-else class="mk-muted">-</span>
            </td>
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
    <p class="mk-muted">SPK dikonfirmasi atau ditolak oleh Admin.</p>
  </section>
</template>

<script setup lang="ts">
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import SkeletonRowList from '@/components/ui/skeletons/SkeletonRowList.vue'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import { computed, onMounted, ref, watch } from 'vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { useRowFocus } from '@/composables/useRowFocus'
import { getTeamMembers, listSpkRequests, type TeamMember } from '@/services/marketing/marketingCrmService'
import { formatDate, formatRupiah, paymentStatusLabel, paymentStatusTone, spkLabel, spkTone } from '@/utils/marketingStatus'
import { sortByRunningStage, spkStage, SPK_STAGE_LABEL } from '@/utils/spkStage'

const props = defineProps<{ role: 'marketing' | 'head'; focusId?: number; focusStamp?: string }>()
const { focusedId, focusRow } = useRowFocus()
const emit = defineEmits<{ 'open-client': [id: number] }>()
const isHead = computed(() => props.role === 'head')

const rows = ref<any[]>([])
const members = ref<TeamMember[]>([])
const loading = ref(true)
const loaded = ref(false)
const error = ref('')
const status = ref<'all' | 'pending' | 'approved' | 'rejected'>('all')
const search = ref('')
const marketingId = ref('')

const SPK_STAGE_TONE = { running: 'gold', 'not-started': 'neutral', done: 'success' } as const

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
const filtered = computed(() => {
  const matches = base.value.filter((row) => matchStatus(row, status.value))
  return status.value === 'all' ? sortByRunningStage(matches, (row) => [row.status, row.notary_status]) : matches
})
function count(value: typeof status.value) {
  return base.value.filter((row) => matchStatus(row, value)).length
}
function memberName(id: string | null) {
  return members.value.find((m) => m.id === id)?.full_name ?? '-'
}

async function load({ silent = false }: LoadOptions = {}) {
  if (!loaded.value) loading.value = true
  error.value = ''
  try {
    const [spks, team] = await Promise.all([listSpkRequests(), getTeamMembers()])
    // Hanya SPK yang dapat diatribusikan ke tim Marketing (RLS sudah membatasi baris).
    rows.value = spks.filter((row) => row.owner_id && team.some((m) => m.id === row.owner_id))
    members.value = team
    loaded.value = true
  } catch (cause) {
    if (!silent || !loaded.value) error.value = cause instanceof Error ? cause.message : 'Periksa koneksi, lalu coba lagi.'
  } finally {
    loading.value = false
  }
}
async function applyFocus() {
  const id = props.focusId
  if (!id || !rows.value.some((row) => row.id === id)) return
  status.value = 'all'
  search.value = ''
  marketingId.value = ''
  await focusRow(id, `notif-spk-${id}`)
}
onMounted(() => load().then(applyFocus))
watch(() => props.focusStamp, () => void load().then(applyFocus))
defineExpose({ reload: load })

useRealtimeRefresh(
  ['spk_requests', 'spk_process_steps', 'customers', 'profiles'],
  () => load({ silent: true }),
)

</script>

<style scoped>
.mk-block { display: block; margin-top: 2px; }
</style>
