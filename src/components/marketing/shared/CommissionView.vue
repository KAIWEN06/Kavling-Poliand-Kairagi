<template>
  <section class="mk-section">
    <div v-if="loading" class="mk-state" role="status">Memuat komisi…</div>
    <div v-else-if="error" class="mk-state mk-state--error" role="alert"><strong>Komisi belum dapat dimuat</strong><span>{{ error }}</span></div>

    <template v-else>
      <div class="mk-grid">
        <StatCard label="Total komisi" :value="formatRupiahShort(total(rows))" :hint="`${rows.length} transaksi`" accent />
        <StatCard label="Menunggu" :value="formatRupiahShort(total(rows.filter((r) => r.status === 'Pending')))" />
        <StatCard label="Disetujui / diproses" :value="formatRupiahShort(total(rows.filter((r) => r.status === 'Eligible' || r.status === 'Processing')))" />
        <StatCard label="Dibayarkan" :value="formatRupiahShort(total(rows.filter((r) => r.status === 'Paid')))" />
      </div>

      <!-- Ringkasan per Marketing (Kepala Bagian) -->
      <div v-if="isHead" class="mk-table-wrap">
        <table class="mk-table mk-table--stack">
          <thead><tr><th>Marketing</th><th class="num">Transaksi</th><th class="num">Total</th><th class="num">Menunggu</th><th class="num">Disetujui</th><th class="num">Dibayarkan</th></tr></thead>
          <tbody>
            <tr v-for="m in perMember" :key="m.id">
              <td class="mk-cell-main">{{ m.full_name }}</td>
              <td data-label="Transaksi" class="num">{{ m.count }}</td>
              <td data-label="Total" class="num">{{ formatRupiah(m.total) }}</td>
              <td data-label="Menunggu" class="num">{{ formatRupiah(m.pending) }}</td>
              <td data-label="Disetujui" class="num">{{ formatRupiah(m.approved) }}</td>
              <td data-label="Dibayarkan" class="num">{{ formatRupiah(m.paid) }}</td>
            </tr>
          </tbody>
        </table>
      </div>

      <h2 class="mk-subhead">Riwayat komisi</h2>
      <div v-if="!rows.length" class="mk-state">
        <strong>Belum ada data komisi</strong>
        <span>Komisi dicatat oleh Admin di tabel komisi sesuai kebijakan perusahaan. Aplikasi tidak menghitung persentase atau nominal komisi sendiri.</span>
      </div>
      <div v-else class="mk-table-wrap">
        <table class="mk-table mk-table--stack">
          <thead><tr><th>Client / kavling</th><th v-if="isHead">Marketing</th><th>Jenis</th><th class="num">Nilai transaksi</th><th class="num">Tarif</th><th class="num">Komisi</th><th>Status</th><th>Tanggal pencairan</th></tr></thead>
          <tbody>
            <tr v-for="r in rows" :key="r.id">
              <td class="mk-cell-main">{{ r.customer_name }}<span class="mk-muted mk-block">{{ r.lot?.lot_number || '-' }}</span></td>
              <td v-if="isHead" data-label="Marketing">{{ memberName(r.marketing_id) }}</td>
              <td data-label="Jenis">{{ r.commission_type === 'Booking Fee' ? 'Komisi SPK' : 'Komisi penjualan' }}</td>
              <td data-label="Nilai transaksi" class="num">{{ formatRupiah(r.base_amount) }}</td>
              <td data-label="Tarif" class="num">{{ r.commission_rate != null ? `${Number(r.commission_rate)}%` : 'Nominal tetap' }}</td>
              <td data-label="Komisi" class="num">{{ formatRupiah(r.commission_amount) }}</td>
              <td data-label="Status"><StatusBadge :label="commissionStatusLabel(r.status)" :tone="commissionStatusTone(r.status)" /></td>
              <td data-label="Pencairan">{{ r.paid_at ? formatDate(r.paid_at) : '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mk-muted">{{ isHead ? 'Menampilkan komisi seluruh anggota tim Marketing.' : 'Anda hanya dapat melihat komisi milik Anda sendiri.' }}</p>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import StatCard from './StatCard.vue'
import StatusBadge from './StatusBadge.vue'
import { getTeamMembers, listCommissions, type TeamMember } from '@/services/marketing/marketingCrmService'
import { commissionStatusLabel, commissionStatusTone, formatDate, formatRupiah, formatRupiahShort } from '@/utils/marketingStatus'

const props = defineProps<{ role: 'marketing' | 'head' }>()
const isHead = computed(() => props.role === 'head')

const all = ref<any[]>([])
const members = ref<TeamMember[]>([])
const loading = ref(true)
const error = ref('')

const rows = computed(() => all.value.filter((r) => r.status !== 'Cancelled'))
const total = (list: any[]) => list.reduce((a, r) => a + Number(r.commission_amount || 0), 0)
const perMember = computed(() => members.value.map((m) => {
  const mine = rows.value.filter((r) => r.marketing_id === m.id)
  return {
    id: m.id,
    full_name: m.full_name,
    count: new Set(mine.map((r) => r.transaction_id)).size,
    total: total(mine),
    pending: total(mine.filter((r) => r.status === 'Pending')),
    approved: total(mine.filter((r) => r.status === 'Eligible' || r.status === 'Processing')),
    paid: total(mine.filter((r) => r.status === 'Paid')),
  }
}).sort((a, b) => b.total - a.total))

function memberName(id: string) {
  return members.value.find((m) => m.id === id)?.full_name ?? '-'
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [comm, team] = await Promise.all([listCommissions(), getTeamMembers()])
    all.value = comm
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
.mk-subhead { margin: 4px 0 0; font-size: 16px; }
</style>
