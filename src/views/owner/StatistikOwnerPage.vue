<template>
  <MarketingPageLayout title="Statistik" tab-variant="owner" @refresh="load()">
    <div v-if="loading && !loaded" class="mk-section" role="status" aria-label="Memuat statistik">
      <Skeleton v-for="n in 4" :key="n" height="180px" border-radius="14px" />
    </div>
    <StatusIllustration v-else-if="error && !loaded" :variant="resolveErrorVariant(error)" title="Statistik belum dapat dimuat" :on-action="() => load()" />

    <template v-else>
      <Reveal :order="1">
        <section class="mk-section" aria-label="Penjualan per tahun">
          <div class="mk-chips" role="group" aria-label="Tahun penjualan">
            <button v-for="option in years" :key="option" type="button" class="mk-chip" :aria-pressed="year === option" @click="year = option">{{ option }}</button>
          </div>
          <div class="mk-grid">
            <StatCard class="mk-span-2" label="Nilai kontrak" :value="formatRupiahShort(summary.contractValue)" :hint="growth" accent />
            <StatCard label="Dipesan" :value="summary.booked" />
            <StatCard label="Lunas" :value="summary.paidOff" />
          </div>
          <div class="ow-charts">
            <BarChart title="Transaksi per bulan" orientation="vertical" :items="monthlySeries(sales, year)" label-header="Bulan" value-header="Transaksi" />
            <BarChart title="Nilai kontrak per bulan" orientation="vertical" :items="monthlySeries(sales, year, (sale) => sale.contractValue)" :formatter="formatRupiahShort" label-header="Bulan" value-header="Nilai kontrak" />
            <BarChart title="Transaksi per blok" :items="countBy(yearSales, (sale) => sale.block)" label-header="Blok" value-header="Transaksi" />
          </div>
        </section>
      </Reveal>

      <Reveal :order="2">
        <section class="mk-section" aria-label="Kondisi saat ini">
          <div class="mk-section-head"><div><h2>Kondisi saat ini</h2></div></div>
          <div class="ow-charts">
            <BarChart title="Status kaveling" :items="statusItems" label-header="Status" value-header="Kaveling" />
            <BarChart title="Perkembangan klien" :items="pipeline" label-header="Status" value-header="Klien" />
            <BarChart title="Asal konsumen" subtitle="Per kabupaten/kota" :items="countBy(clients, (client) => client.city_name || 'Belum diisi').slice(0, 10)" label-header="Wilayah" value-header="Klien" />
          </div>
        </section>
      </Reveal>
    </template>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import BarChart from '@/components/marketing/shared/BarChart.vue'
import Reveal from '@/components/ui/Reveal.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import StatCard from '@/components/ui/StatCard.vue'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import { useOwnerData } from '@/composables/useOwnerData'
import { currentMakassarDay } from '@/utils/financialCashflow'
import { CRM_STATUSES, crmStatusLabel, formatRupiahShort } from '@/utils/marketingStatus'
import { availableYears, countBy, monthlySeries, summarizeSales } from '@/utils/ownerReport'

const { clients, sales, inventory, loading, loaded, error, load } = useOwnerData()

const currentYear = Number(currentMakassarDay().slice(0, 4))
const year = ref(currentYear)
const years = computed(() => availableYears(sales.value, currentYear))
const salesIn = (target: number) => sales.value.filter((sale) => sale.date.startsWith(`${target}-`))
const yearSales = computed(() => salesIn(year.value))
const summary = computed(() => summarizeSales(yearSales.value))

const growth = computed(() => {
  const previous = summarizeSales(salesIn(year.value - 1)).contractValue
  if (!previous) return `Belum ada pembanding dari ${year.value - 1}`
  const percent = Math.round(((summary.value.contractValue - previous) / previous) * 100)
  return `${percent >= 0 ? 'Naik' : 'Turun'} ${Math.abs(percent)}% dari ${year.value - 1}`
})

const statusItems = computed(() => [
  { label: 'Tersedia', value: inventory.value.available },
  { label: 'Dipesan', value: inventory.value.booking },
  { label: 'Terjual', value: inventory.value.sold },
])
const pipeline = computed(() =>
  CRM_STATUSES.map((status) => ({ label: crmStatusLabel(status), value: clients.value.filter((client) => client.crm_status === status).length })),
)
</script>

<style scoped>
.ow-charts { display: grid; gap: var(--space-4); }
@media (min-width: 720px) { .ow-charts { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
