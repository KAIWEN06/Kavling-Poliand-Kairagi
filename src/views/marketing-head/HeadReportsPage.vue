<template>
  <MarketingPageLayout title="Laporan" tab-variant="head" @refresh="load()">
    <nav class="mk-tabs" role="tablist" aria-label="Jenis laporan">
      <button type="button" role="tab" :aria-selected="tab === 'sales'" @click="tab = 'sales'">Penjualan</button>
      <button type="button" role="tab" :aria-selected="tab === 'regions'" @click="tab = 'regions'">Asal konsumen</button>
      <button type="button" role="tab" :aria-selected="tab === 'performance'" @click="tab = 'performance'">Performa</button>
    </nav>

    <Reveal :order="1">
      <!-- Asal konsumen punya filter sendiri: mencakup seluruh perusahaan dan rentang panjang. -->
      <PeriodFilter
        :key="tab === 'regions' ? 'origin' : 'report'"
        :members="tab === 'performance' ? [] : members"
        :initial="tab === 'regions' ? 'all' : 'month'"
        :with-all="tab === 'regions'"
        :all-label="tab === 'regions' ? 'Semua konsumen' : 'Semua pemasar'"
        @change="onFilter"
      />
    </Reveal>

    <StatusIllustration v-if="loading && !report" variant="processing" title="Memuat laporan" />
    <StatusIllustration v-else-if="error" :variant="resolveErrorVariant(error)" title="Laporan belum dapat dimuat" :on-action="() => load()" />

    <template v-else-if="report">
      <!-- STATISTIK PENJUALAN -->
      <template v-if="tab === 'sales'">
        <section class="mk-section">
          <div class="mk-section-head"><div><h2>Prospek & SPK</h2></div></div>
          <div class="mk-grid">
            <StatCard label="Total prospek" :value="s.total_clients" hint="klien tim pemasaran" />
            <StatCard label="Prospek baru" :value="s.new_clients" hint="pada periode" />
            <StatCard label="SPK diajukan" :value="s.spk_submitted" />
            <StatCard label="SPK terkonfirmasi" :value="s.spk_approved" accent />
          </div>
        </section>

        <section class="mk-section">
          <div class="mk-section-head"><div><h2>Nilai kontrak</h2><p>Belum tentu sudah dibayar</p></div></div>
          <div class="mk-grid">
            <StatCard label="Kaveling terjual" :value="s.units_sold" :hint="`${s.units_booked} dipesan · ${s.units_paid_off} lunas`" />
            <StatCard label="Total nilai penjualan" :value="formatRupiahShort(s.contract_value)" accent />
            <StatCard label="Penjualan tunai" :value="formatRupiahShort(s.cash_contract_value)" :hint="`${s.cash_units} kaveling`" />
            <StatCard label="Penjualan cicilan" :value="formatRupiahShort(s.installment_contract_value)" :hint="`${s.installment_units} kaveling`" />
          </div>
        </section>

        <section class="mk-section">
          <div class="mk-section-head"><div><h2>Kas masuk</h2><p>Sudah dikonfirmasi Admin</p></div></div>
          <div class="mk-grid">
            <StatCard label="Pembayaran terkonfirmasi" :value="formatRupiahShort(s.cash_in)" accent />
            <StatCard label="SPK (tanda jadi)" :value="formatRupiahShort(cat('Booking'))" />
            <StatCard label="Uang muka" :value="formatRupiahShort(cat('Down Payment'))" />
            <StatCard label="Cicilan & pelunasan" :value="formatRupiahShort(cat('Installment') + cat('Cash Purchase'))" />
          </div>
          <p class="mk-muted">Belum dihitung: {{ formatRupiah(s.payments_pending_amount) }} dari {{ s.payments_pending_count }} pembayaran yang menunggu verifikasi.</p>
        </section>

        <section class="mk-section">
          <div class="mk-section-head"><div><h2>Komisi</h2></div></div>
          <div class="mk-grid mk-grid--3">
            <StatCard label="Total komisi" :value="formatRupiahShort(s.commission_total)" />
            <StatCard label="Belum dibayarkan" :value="formatRupiahShort(s.commission_pending)" />
            <StatCard label="Dibayarkan" :value="formatRupiahShort(s.commission_paid)" />
          </div>
        </section>

        <section class="mk-charts">
          <BarChart title="Nilai penjualan per periode" orientation="vertical" :items="trend('contract_value')" :formatter="formatRupiahShort" label-header="Periode" value-header="Nilai kontrak" />
          <BarChart title="Penerimaan kas per periode" orientation="vertical" :items="trend('cash_in')" :formatter="formatRupiahShort" label-header="Periode" value-header="Kas terkonfirmasi" />
          <BarChart title="Kaveling terjual per periode" orientation="vertical" :items="trend('units_sold')" label-header="Periode" value-header="Kaveling" />
          <BarChart title="SPK terkonfirmasi per periode" orientation="vertical" :items="trend('spk_approved')" label-header="Periode" value-header="SPK" />
          <BarChart title="Penjualan per pemasar" :items="teamBars('contract_value')" :formatter="formatRupiahShort" label-header="Pemasar" value-header="Nilai kontrak" />
        </section>
      </template>

      <!-- ASAL KONSUMEN -->
      <ConsumerOrigin
        v-else-if="tab === 'regions'"
        :regions="report.regions"
        :sources="report.region_sources"
        :member-name="selectedMemberName"
      />

      <!-- PERFORMA MARKETING -->
      <HeadTeamRanking v-else :members="ranked" />
    </template>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import { useRealtimeRefresh } from '@/composables/useRealtimeRefresh'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import Reveal from '@/components/ui/Reveal.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { useOwnRouteQuery } from '@/composables/useOwnRouteQuery'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import PeriodFilter from '@/components/marketing/shared/PeriodFilter.vue'
import StatCard from '@/components/ui/StatCard.vue'
import BarChart from '@/components/marketing/shared/BarChart.vue'
import HeadTeamRanking from '@/components/marketing/head/HeadTeamRanking.vue'
import ConsumerOrigin from '@/components/marketing/head/ConsumerOrigin.vue'
import { bucketLabel, useMarketingReport } from '@/composables/useMarketingReport'
import { getTeamMembers, type TeamMember } from '@/services/marketing/marketingCrmService'
import { formatRupiah, formatRupiahShort } from '@/utils/marketingStatus'

const query = useOwnRouteQuery()
const tabFromQuery = () =>
  query.value.tab === 'performance' ? 'performance' : query.value.tab === 'regions' ? 'regions' : 'sales'
const tab = ref<'sales' | 'regions' | 'performance'>(tabFromQuery())
watch(query, () => (tab.value = tabFromQuery()))
const { report, loading, error, load, s } = useMarketingReport()
const members = ref<TeamMember[]>([])

const selectedMemberId = ref<string | null>(null)
const selectedMemberName = computed(() => members.value.find((m) => m.id === selectedMemberId.value)?.full_name ?? '')
function onFilter(next: { from: string; to: string; marketingId: string | null }) {
  selectedMemberId.value = next.marketingId
  load(next)
}

const cat = (key: string) => Number(s.value.cash_in_by_category?.[key] ?? 0)
function trend(key: 'contract_value' | 'cash_in' | 'units_sold' | 'spk_approved') {
  const r = report.value
  return r ? r.trend.map((t) => ({ label: bucketLabel(t.bucket, r.period.bucket), value: Number(t[key]) })) : []
}
const ranked = computed(() => (report.value?.team ?? []).filter((m) => m.role === 'marketing'))
function teamBars(key: 'contract_value') {
  return ranked.value.map((m) => ({ label: m.full_name, value: Number(m[key]) })).sort((a, b) => b.value - a.value)
}
onMounted(async () => {
  try {
    members.value = (await getTeamMembers()).filter((m) => m.role === 'marketing')
  } catch { /* filter Marketing opsional */ }
})

useRealtimeRefresh(
  ['customers', 'customer_followups', 'customer_crm_status_history', 'lot_transactions', 'spk_requests', 'payments', 'installment_schedules', 'marketing_commissions', 'survey_requests'],
  () => load(undefined, { silent: true }),
)

</script>

<style scoped>
.mk-charts { display: grid; gap: 12px; }
@media (min-width: 720px) { .mk-charts { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
