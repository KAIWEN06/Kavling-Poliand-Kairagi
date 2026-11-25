<template>
  <MarketingPageLayout :title="`Halo, ${profile?.full_name || 'Kepala Bagian'}`" subtitle="Ringkasan tim pemasaran." tab-variant="head" @refresh="refresh">
    <Reveal :order="1">
      <PeriodFilter :members="members" @change="onRange" />
    </Reveal>

    <div v-if="loading && !report" class="mk-section" role="status" aria-label="Memuat ringkasan tim">
      <div class="mk-grid">
        <Skeleton v-for="n in 8" :key="n" height="104px" border-radius="14px" />
      </div>
      <div class="mk-grid">
        <Skeleton v-for="n in 4" :key="n" height="104px" border-radius="14px" />
      </div>
    </div>
    <StatusIllustration v-else-if="error" :variant="resolveErrorVariant(error)" title="Ringkasan belum dapat dimuat" :on-action="() => load()" />

    <template v-else-if="report">
      <Reveal :order="2">
        <section class="mk-section" aria-label="Penjualan dan keuangan">
          <div class="mk-section-head"><div><h2>Penjualan dan kas</h2><p>{{ formatDate(report.period.from) }} – {{ formatDate(report.period.to) }}</p></div></div>
          <div class="mk-grid">
            <StatCard class="mk-span-2" label="Kas masuk" :value="formatRupiahShort(s.cash_in)" hint="sudah dikonfirmasi Admin" accent clickable @open="go('/kepala-marketing/pembayaran')" />
            <StatCard label="SPK terkonfirmasi" :value="s.spk_approved" :hint="`${s.spk_pending} menunggu`" clickable @open="go('/kepala-marketing/spk')" />
            <StatCard label="Kaveling terjual" :value="s.units_sold" :hint="`${s.units_booked} dipesan · ${s.units_paid_off} lunas`" clickable @open="go('/kepala-marketing/laporan')" />
            <StatCard label="Nilai kontrak" :value="formatRupiahShort(s.contract_value)" hint="belum tentu sudah dibayar" clickable @open="go('/kepala-marketing/laporan')" />
            <StatCard label="Menunggu verifikasi" :value="formatRupiahShort(s.payments_pending_amount)" :hint="`${s.payments_pending_count} pembayaran`" clickable @open="go('/kepala-marketing/pembayaran')" />
            <StatCard label="Cicilan terlambat" :value="s.installments_overdue" :hint="formatRupiahShort(s.installments_overdue_amount)" clickable @open="go('/kepala-marketing/pembayaran', { tab: 'schedules' })" />
            <StatCard label="Komisi" :value="formatRupiahShort(s.commission_total)" :hint="`${formatRupiahShort(s.commission_paid)} dibayarkan`" clickable @open="go('/kepala-marketing/komisi')" />
            <StatCard label="Jatuh tempo ≤ 7 hari" :value="s.installments_due_soon" clickable @open="go('/kepala-marketing/pembayaran', { tab: 'schedules' })" />
          </div>
        </section>
      </Reveal>

      <Reveal :order="3">
        <section class="mk-section" aria-label="Perkembangan klien">
          <div class="mk-section-head"><div><h2>Klien</h2></div></div>
          <div class="mk-grid">
            <StatCard label="Total klien" :value="s.total_clients" clickable @open="go('/kepala-marketing/clients')" />
            <StatCard label="Klien baru" :value="s.new_clients" clickable @open="go('/kepala-marketing/clients', { from: report.period.from, to: report.period.to })" />
            <StatCard label="Belum dihubungi" :value="crm('Baru') + crm('Belum Dihubungi')" clickable @open="go('/kepala-marketing/clients', { crm: 'group:uncontacted' })" />
            <StatCard label="Ditindaklanjuti" :value="crm('Sudah Dihubungi') + crm('Follow-up')" clickable @open="go('/kepala-marketing/clients', { crm: 'group:followup' })" />
            <StatCard label="Berminat" :value="crm('Berminat') + crm('Survey Lokasi') + crm('Negosiasi')" hint="termasuk survei dan negosiasi" clickable @open="go('/kepala-marketing/clients', { crm: 'group:interested' })" />
            <StatCard label="Dalam pengajuan" :value="crm('Pengajuan')" clickable @open="go('/kepala-marketing/clients', { crm: 'Pengajuan' })" />
            <StatCard label="Tidak dihubungi 7 hari" :value="s.no_followup_7d" clickable @open="go('/kepala-marketing/perkembangan')" />
            <StatCard label="Anggota pemasaran" :value="s.team_size" clickable @open="go('/kepala-marketing/laporan', { tab: 'performance' })" />
          </div>
        </section>
      </Reveal>

      <Reveal :order="4">
        <section class="mk-charts">
          <BarChart title="Perkembangan klien" subtitle="Jumlah klien per status saat ini" :items="crmItems" label-header="Status" value-header="Klien" />
          <BarChart title="Penjualan per periode" subtitle="Nilai kontrak kaveling terjual" orientation="vertical" :items="trendItems('contract_value')" :formatter="formatRupiahShort" label-header="Periode" value-header="Nilai kontrak" />
          <BarChart title="Jumlah SPK terkonfirmasi" subtitle="Per periode" orientation="vertical" :items="trendItems('spk_approved')" label-header="Periode" value-header="SPK" />
          <BarChart title="Kinerja pemasar" subtitle="SPK terkonfirmasi pada periode" :items="teamItems('spk_approved')" label-header="Pemasar" value-header="SPK" />
          <BarChart title="Perbandingan hasil penjualan" subtitle="Nilai kontrak per pemasar" :items="teamItems('contract_value')" :formatter="formatRupiahShort" label-header="Pemasar" value-header="Nilai kontrak" />
        </section>
      </Reveal>

      <Reveal :order="5">
        <section class="mk-section">
          <div class="mk-section-head">
            <div><h2>Aktivitas terbaru</h2></div>
            <button type="button" class="mk-link" @click="go('/kepala-marketing/perkembangan')">Lihat semua</button>
          </div>
          <ActivityFeed :items="activity" :loading="activityLoading" :error="activityError" @open-client="(id) => go(`/kepala-marketing/clients/${id}`)" />
        </section>
      </Reveal>
    </template>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import { computed, onMounted, ref } from 'vue'
import { useIonRouter } from '@ionic/vue'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import PeriodFilter from '@/components/marketing/shared/PeriodFilter.vue'
import StatCard from '@/components/ui/StatCard.vue'
import Reveal from '@/components/ui/Reveal.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import BarChart from '@/components/marketing/shared/BarChart.vue'
import ActivityFeed from '@/components/marketing/shared/ActivityFeed.vue'
import { bucketLabel, useMarketingReport } from '@/composables/useMarketingReport'
import {
  getMarketingActivity,
  getStaffProfile,
  getTeamMembers,
  type ActivityItem,
  type StaffProfile,
  type TeamMember,
} from '@/services/marketing/marketingCrmService'
import { CRM_STATUSES, crmStatusLabel, formatDate, formatRupiahShort } from '@/utils/marketingStatus'

const router = useIonRouter()
const { report, loading, error, load, s, crm, range } = useMarketingReport()
const profile = ref<StaffProfile | null>(null)
const members = ref<TeamMember[]>([])
const activity = ref<ActivityItem[]>([])
const activityLoading = ref(false)
const activityError = ref('')

const crmItems = computed(() => CRM_STATUSES.map((status) => ({ label: crmStatusLabel(status), value: crm(status) })))
function trendItems(key: 'contract_value' | 'spk_approved') {
  const r = report.value
  if (!r) return []
  return r.trend.map((t) => ({ label: bucketLabel(t.bucket, r.period.bucket), value: Number(t[key]) }))
}
function teamItems(key: 'spk_approved' | 'contract_value') {
  return (report.value?.team ?? [])
    .filter((m) => m.role === 'marketing')
    .map((m) => ({ label: m.full_name, value: Number(m[key]), note: `${m.units_sold} kaveling · konversi ${m.conversion_rate}%` }))
    .sort((a, b) => b.value - a.value)
}

function go(path: string, query?: Record<string, string>) {
  const qs = query ? `?${new URLSearchParams(query).toString()}` : ''
  router.push(`${path}${qs}`)
}

async function loadActivity() {
  activityLoading.value = true
  activityError.value = ''
  try {
    activity.value = await getMarketingActivity(range.value.marketingId, 10)
  } catch (cause) {
    activityError.value = cause instanceof Error ? cause.message : 'Aktivitas gagal dimuat.'
  } finally {
    activityLoading.value = false
  }
}

function onRange(value: { from: string; to: string; marketingId: string | null }) {
  void load(value)
  void loadActivity()
}

function refresh() {
  void load()
  void loadActivity()
}

onMounted(async () => {
  try {
    ;[profile.value, members.value] = await Promise.all([getStaffProfile(), getTeamMembers()])
    members.value = members.value.filter((m) => m.role === 'marketing')
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Profil tidak dapat dimuat.'
  }
})
</script>

<style scoped>
.mk-charts { display: grid; gap: var(--space-4); }
@media (min-width: 720px) { .mk-charts { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
