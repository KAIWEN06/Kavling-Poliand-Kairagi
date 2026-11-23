<template>
  <section class="mk-section">
    <nav class="mk-tabs" role="tablist" aria-label="Pembayaran dan jadwal">
      <button type="button" role="tab" :aria-selected="tab === 'payments'" @click="tab = 'payments'">Pembayaran</button>
      <button type="button" role="tab" :aria-selected="tab === 'schedules'" @click="tab = 'schedules'">Jadwal cicilan</button>
    </nav>

    <label v-if="isHead" class="mk-field mk-narrow">
      <span>Marketing</span>
      <select v-model="marketingId" class="mk-input">
        <option value="">Semua</option>
        <option v-for="m in members" :key="m.id" :value="m.id">{{ m.full_name }}</option>
      </select>
    </label>

    <div v-if="loading" class="mk-state" role="status">Memuat data pembayaran…</div>
    <div v-else-if="error" class="mk-state mk-state--error" role="alert"><strong>Data belum dapat dimuat</strong><span>{{ error }}</span></div>

    <!-- Pembayaran -->
    <template v-else-if="tab === 'payments'">
      <div class="mk-grid">
        <StatCard label="Menunggu verifikasi" :value="sumLabel(paymentsBy('Pending'))" :hint="`${paymentsBy('Pending').length} pembayaran · belum penerimaan kas`" clickable @open="payStatus = 'Pending'" />
        <StatCard label="Terkonfirmasi" :value="sumLabel(paymentsBy('Confirmed'))" :hint="`${paymentsBy('Confirmed').length} pembayaran · penerimaan kas`" accent clickable @open="payStatus = 'Confirmed'" />
        <StatCard label="Ditolak / unggah ulang" :value="String(paymentsBy('Rejected').length)" hint="pembayaran" clickable @open="payStatus = 'Rejected'" />
        <StatCard label="Semua pembayaran" :value="String(scopedPayments.length)" hint="tampilkan semua" clickable @open="payStatus = ''" />
      </div>
      <div v-if="!visiblePayments.length" class="mk-state">Belum ada pembayaran pada filter ini.</div>
      <div v-else class="mk-table-wrap">
        <table class="mk-table mk-table--stack">
          <thead><tr><th>Client</th><th v-if="isHead">Marketing</th><th>Jenis</th><th>Kavling</th><th>Tanggal transfer</th><th class="num">Nominal</th><th>Status verifikasi</th></tr></thead>
          <tbody>
            <tr v-for="p in visiblePayments" :key="p.id" :class="{ 'mk-row-link': p.customer_id }" @click="p.customer_id && emit('open-client', p.customer_id)">
              <td class="mk-cell-main">{{ p.customer_name }}<span v-if="p.review_note" class="mk-muted mk-block">{{ p.review_note }}</span></td>
              <td v-if="isHead" data-label="Marketing">{{ memberName(p.owner_id) }}</td>
              <td data-label="Jenis">{{ paymentCategoryLabel(p.payment_category) }}</td>
              <td data-label="Kavling">{{ p.lot?.lot_number || '-' }}</td>
              <td data-label="Tanggal transfer">{{ formatDate(p.transfer_date || p.submitted_at) }}</td>
              <td data-label="Nominal" class="num">{{ formatRupiah(p.amount) }}</td>
              <td data-label="Status"><StatusBadge :label="paymentStatusLabel(p.status)" :tone="paymentStatusTone(p.status)" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mk-muted">Verifikasi pembayaran hanya dilakukan Admin. Pembayaran menunggu verifikasi bukan penerimaan kas.</p>
    </template>

    <!-- Jadwal -->
    <template v-else>
      <div class="mk-grid">
        <StatCard label="Jatuh tempo ≤ 7 hari" :value="String(dueSoon.length)" clickable @open="schedFilter = 'soon'" />
        <StatCard label="Terlambat" :value="String(overdue.length)" :hint="formatRupiah(overdue.reduce((a, s) => a + Number(s.amount), 0))" clickable @open="schedFilter = 'overdue'" />
        <StatCard label="Belum jatuh tempo" :value="String(scopedSchedules.filter((s) => s.status !== 'Paid' && !isLate(s)).length)" clickable @open="schedFilter = 'open'" />
        <StatCard label="Lunas" :value="String(scopedSchedules.filter((s) => s.status === 'Paid').length)" clickable @open="schedFilter = 'paid'" />
      </div>
      <div class="mk-chips" role="group" aria-label="Filter jadwal">
        <button v-for="opt in schedOptions" :key="opt.value" type="button" class="mk-chip" :aria-pressed="schedFilter === opt.value" @click="schedFilter = opt.value">{{ opt.label }}</button>
      </div>
      <div v-if="!visibleSchedules.length" class="mk-state">Tidak ada jadwal cicilan pada filter ini.</div>
      <div v-else class="mk-table-wrap">
        <table class="mk-table mk-table--stack">
          <thead><tr><th>Client</th><th v-if="isHead">Marketing</th><th>Kavling</th><th>Cicilan</th><th>Jatuh tempo</th><th class="num">Nominal</th><th>Status</th><th class="num">Denda</th></tr></thead>
          <tbody>
            <tr v-for="s in visibleSchedules" :key="s.id" :class="{ 'mk-row-link': s.customer_id }" @click="s.customer_id && emit('open-client', s.customer_id)">
              <td class="mk-cell-main">{{ s.customer_name }}</td>
              <td v-if="isHead" data-label="Marketing">{{ memberName(s.owner_id) }}</td>
              <td data-label="Kavling">{{ s.lot?.lot_number || '-' }}</td>
              <td data-label="Cicilan">{{ s.installment_number }} / {{ s.transaction?.months || '-' }}</td>
              <td data-label="Jatuh tempo">{{ formatDate(s.due_date) }}<span v-if="isLate(s)" class="mk-danger-text mk-block">{{ daysLate(s) }} hari terlambat</span></td>
              <td data-label="Nominal" class="num">{{ formatRupiah(s.amount) }}</td>
              <td data-label="Status"><StatusBadge :label="scheduleStatusLabel(s.status, s.due_date)" :tone="scheduleStatusTone(s.status, s.due_date)" /></td>
              <td data-label="Denda" class="num">{{ s.penalty && s.penalty.status !== 'Waived' ? formatRupiah(s.penalty.amount) : '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mk-muted">Jadwal berasal dari data resmi yang dibuat saat Admin mengonfirmasi SPK — sama dengan halaman Client dan Admin.</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import StatCard from '@/components/ui/StatCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { getTeamMembers, listInstallmentSchedules, listPayments, type TeamMember } from '@/services/marketing/marketingCrmService'
import {
  formatDate,
  formatRupiah,
  formatRupiahShort,
  paymentCategoryLabel,
  paymentStatusLabel,
  paymentStatusTone,
  scheduleStatusLabel,
  scheduleStatusTone,
  todayIso,
} from '@/utils/marketingStatus'

const props = withDefaults(defineProps<{ role: 'marketing' | 'head'; initialTab?: 'payments' | 'schedules' }>(), { initialTab: 'payments' })
const emit = defineEmits<{ 'open-client': [id: number] }>()
const isHead = computed(() => props.role === 'head')

const tab = ref(props.initialTab)
const payments = ref<any[]>([])
const schedules = ref<any[]>([])
const members = ref<TeamMember[]>([])
const loading = ref(true)
const error = ref('')
const marketingId = ref('')
const payStatus = ref('')
const schedFilter = ref<'all' | 'soon' | 'overdue' | 'open' | 'paid'>('all')
const today = todayIso()

const schedOptions = [
  { value: 'all' as const, label: 'Semua' },
  { value: 'soon' as const, label: 'Mendekati jatuh tempo' },
  { value: 'overdue' as const, label: 'Terlambat' },
  { value: 'open' as const, label: 'Belum jatuh tempo' },
  { value: 'paid' as const, label: 'Lunas' },
]

const teamIds = computed(() => new Set(members.value.map((m) => m.id)))
const scopedPayments = computed(() => payments.value.filter((p) => p.owner_id && teamIds.value.has(p.owner_id) && (!marketingId.value || p.owner_id === marketingId.value)))
const scopedSchedules = computed(() => schedules.value.filter((s) => s.owner_id && teamIds.value.has(s.owner_id) && (!marketingId.value || s.owner_id === marketingId.value)))

function paymentsBy(status: string) {
  return scopedPayments.value.filter((p) => (status === 'Rejected' ? p.status === 'Rejected' || p.status === 'Needs Reupload' : p.status === status))
}
const visiblePayments = computed(() => (payStatus.value ? paymentsBy(payStatus.value) : scopedPayments.value))

function isLate(s: any) {
  return s.status === 'Overdue' || (s.status === 'Pending' && s.due_date < today)
}
function daysLate(s: any) {
  return Math.max(0, Math.round((new Date(today).getTime() - new Date(s.due_date).getTime()) / 86400000))
}
const soonLimit = (() => {
  const d = new Date(today)
  d.setDate(d.getDate() + 7)
  return d.toISOString().slice(0, 10)
})()
const dueSoon = computed(() => scopedSchedules.value.filter((s) => s.status === 'Pending' && s.due_date >= today && s.due_date <= soonLimit))
const overdue = computed(() => scopedSchedules.value.filter(isLate))
const visibleSchedules = computed(() => {
  switch (schedFilter.value) {
    case 'soon': return dueSoon.value
    case 'overdue': return overdue.value
    case 'open': return scopedSchedules.value.filter((s) => s.status !== 'Paid' && !isLate(s))
    case 'paid': return scopedSchedules.value.filter((s) => s.status === 'Paid')
    default: return scopedSchedules.value
  }
})

function sumLabel(list: any[]) {
  return formatRupiahShort(list.reduce((a, p) => a + Number(p.amount || 0), 0))
}
function memberName(id: string | null) {
  return members.value.find((m) => m.id === id)?.full_name ?? '-'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [p, s, team] = await Promise.all([listPayments(), listInstallmentSchedules(), getTeamMembers()])
    payments.value = p
    schedules.value = s
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
.mk-narrow { max-width: 320px; }
</style>
