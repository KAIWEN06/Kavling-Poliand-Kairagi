<template>
  <MarketingPageLayout :title="`Halo, ${ownerName}`" subtitle="Kondisi proyek hari ini." tab-variant="owner" @refresh="refresh">
    <div v-if="loading && !loaded" class="mk-section" role="status" aria-label="Memuat ringkasan perusahaan">
      <div class="mk-grid">
        <Skeleton v-for="n in 8" :key="n" height="104px" border-radius="14px" />
      </div>
    </div>
    <StatusIllustration v-else-if="error && !loaded" :variant="resolveErrorVariant(error)" title="Ringkasan belum dapat dimuat" :on-action="() => load()" />

    <template v-else>
      <Reveal :order="1">
        <section class="mk-section" aria-label="Penjualan dan kas tahun ini">
          <div class="mk-section-head">
            <div><h2>Tahun {{ year }}</h2></div>
            <button type="button" class="mk-link" @click="go('/owner/statistik')">Statistik</button>
          </div>
          <div class="mk-grid">
            <StatCard class="mk-span-2" label="Kas masuk" :value="cashIn === null ? '–' : formatRupiahShort(cashIn)" :hint="cashError || 'dari buku kas'" accent clickable @open="go('/owner/laporan', { tab: 'payments' })" />
            <StatCard label="Nilai kontrak" :value="formatRupiahShort(yearSummary.contractValue)" hint="belum tentu sudah dibayar" clickable @open="go('/owner/laporan')" />
            <StatCard label="Transaksi" :value="yearSummary.units" :hint="`${yearSummary.booked} dipesan · ${yearSummary.paidOff} lunas`" clickable @open="go('/owner/laporan')" />
          </div>
        </section>
      </Reveal>

      <Reveal :order="2">
        <section class="mk-section" aria-label="Status kaveling">
          <div class="mk-section-head">
            <div><h2>Kaveling</h2><p>{{ inventory.total }} unit</p></div>
            <button type="button" class="mk-link" @click="go('/owner/siteplan')">Buka denah</button>
          </div>
          <div class="mk-grid ow-inventory">
            <StatCard label="Tersedia" :value="inventory.available" clickable @open="go('/owner/kavling', { status: 'available' })" />
            <StatCard label="Dipesan" :value="inventory.booking" clickable @open="go('/owner/kavling', { status: 'booking' })" />
            <StatCard label="Terjual" :value="inventory.sold" clickable @open="go('/owner/kavling', { status: 'sold' })" />
          </div>
        </section>
      </Reveal>

      <Reveal :order="3">
        <section class="ow-charts">
          <BarChart title="Transaksi per bulan" orientation="vertical" :items="monthlySales" label-header="Bulan" value-header="Transaksi" />
          <BarChart title="Asal konsumen" subtitle="Lima kabupaten/kota terbanyak" :items="topRegions" label-header="Wilayah" value-header="Klien" />
        </section>
      </Reveal>

      <Reveal :order="4">
        <section class="mk-section" aria-label="Aktivitas terbaru">
          <div class="mk-section-head"><div><h2>Aktivitas terbaru</h2></div></div>
          <div class="mk-card">
            <p v-if="!activities.length" class="mk-muted">Belum ada aktivitas.</p>
            <ol v-else class="mk-timeline">
              <li v-for="item in activityPager.items" :key="item.id">
                <strong>{{ item.title }}</strong>
                <p>{{ item.detail }}</p>
                <span class="mk-muted">{{ item.dayOnly ? formatDate(item.at) : formatRelative(item.at) }}</span>
              </li>
            </ol>
            <AppPagination :page="activityPager.page" :total-pages="activityPager.totalPages" label="Halaman aktivitas" @update:page="activityPager.setPage" />
          </div>
        </section>
      </Reveal>
    </template>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useIonRouter } from '@ionic/vue'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import BarChart from '@/components/marketing/shared/BarChart.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import Reveal from '@/components/ui/Reveal.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import StatCard from '@/components/ui/StatCard.vue'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useOwnerData } from '@/composables/useOwnerData'
import { usePagination } from '@/composables/usePagination'
import { useRealtimeRefresh } from '@/composables/useRealtimeRefresh'
import { financialLedgerService } from '@/services/Finance/financialLedgerService'
import { currentMakassarDay, summarizeCashflow } from '@/utils/financialCashflow'
import { formatDate, formatRelative, formatRupiah, formatRupiahShort, paymentCategoryLabel } from '@/utils/marketingStatus'
import { countBy, inRange, monthlySeries, summarizeSales } from '@/utils/ownerReport'

const router = useIonRouter()
const { firstName } = useCurrentUser()
const ownerName = computed(() => firstName.value || 'Pemilik')
const { clients, sales, payments, inventory, loading, loaded, error, load } = useOwnerData()

const year = Number(currentMakassarDay().slice(0, 4))
const yearRange = { from: `${year}-01-01`, to: `${year}-12-31` }
const yearSummary = computed(() => summarizeSales(sales.value.filter((sale) => inRange(sale.date, yearRange))))
const monthlySales = computed(() => monthlySeries(sales.value, year))
const topRegions = computed(() => countBy(clients.value, (client) => client.city_name || 'Belum diisi').slice(0, 5))

const cashIn = ref<number | null>(null)
const cashError = ref('')
async function loadCash() {
  try {
    const entries = await financialLedgerService.listBetween(yearRange.from, yearRange.to)
    cashIn.value = summarizeCashflow(entries).grossIncome
    cashError.value = ''
  } catch (cause) {
    console.error('[Beranda Owner] Buku kas gagal dimuat:', cause)
    if (cashIn.value === null) cashError.value = 'Buku kas belum dapat dimuat'
  }
}

const activities = computed(() =>
  [
    ...clients.value.map((client) => ({ id: `client-${client.id}`, title: 'Klien baru', detail: client.full_name, at: client.created_at, dayOnly: false })),
    // booking_date hanya tanggal, jadi tidak ditampilkan sebagai "x jam lalu".
    ...sales.value.filter((sale) => sale.date).map((sale) => ({
      id: `sale-${sale.id}`,
      title: sale.status === 'Sold' ? 'Kaveling lunas' : 'Kaveling dipesan',
      detail: `${sale.lotNumber} · ${sale.customerName}`,
      at: sale.date,
      dayOnly: true,
    })),
    ...payments.value.filter((payment) => payment.status === 'Confirmed').map((payment) => ({
      id: `payment-${payment.id}`,
      title: `${paymentCategoryLabel(payment.category)} diterima`,
      detail: `${formatRupiah(payment.amount)} · ${payment.customerName}`,
      at: payment.occurredAt,
      dayOnly: false,
    })),
  ]
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .slice(0, 30),
)
const activityPager = usePagination(activities, { pageSize: 6 })

function go(path: string, query?: Record<string, string>) {
  router.push(query ? `${path}?${new URLSearchParams(query).toString()}` : path)
}

function refresh() {
  void load()
  void loadCash()
}

onMounted(loadCash)
useRealtimeRefresh(['payments', 'lot_transactions'], loadCash)
</script>

<style scoped>
.ow-charts { display: grid; gap: var(--space-4); }
@media (min-width: 720px) { .ow-charts { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.mk-grid.ow-inventory { grid-template-columns: repeat(3, minmax(0, 1fr)); }
</style>
