<template>
  <MarketingPageLayout :title="`Halo, ${ownerName}`" tab-variant="owner" @refresh="refresh">
    <div v-if="loading && !loaded" class="mk-section" role="status" aria-label="Memuat ringkasan">
      <Skeleton height="240px" border-radius="24px" />
      <div class="mk-grid">
        <Skeleton v-for="n in 2" :key="n" height="104px" border-radius="14px" />
      </div>
    </div>
    <StatusIllustration v-else-if="error && !loaded" :variant="resolveErrorVariant(error)" title="Ringkasan belum dapat dimuat" :on-action="() => load()" />

    <template v-else>
      <Reveal :order="1">
        <section class="ow-hero" aria-labelledby="ow-hero-title">
          <SceneBackdrop :sun="false" :sway="false" height="42%" />
          <div class="ow-hero__body">
            <h2 id="ow-hero-title">Kaveling terjual</h2>
            <p v-if="!inventory.total" class="ow-hero__share">Belum ada data kaveling.</p>
            <template v-else>
              <p class="ow-hero__figure">
                <strong><CountUp :value="String(inventory.sold)" :duration="900" /></strong>
                <span>dari {{ inventory.total }} unit</span>
              </p>
              <p class="ow-hero__share">{{ share(inventory.sold) }} dari seluruh kaveling</p>

              <div class="ow-hero__bar" aria-hidden="true">
                <span v-for="part in parts" v-show="part.count" :key="part.status" :class="`is-${part.status}`" :style="{ flexGrow: part.count }" />
              </div>

              <ul class="ow-hero__legend">
                <li v-for="part in parts" :key="part.status">
                  <button type="button" :aria-label="`${part.label}: ${part.count} unit. Lihat daftarnya`" @click="go('/owner/kavling', { status: part.status })">
                    <span class="ow-hero__dot" :class="`is-${part.status}`" aria-hidden="true" />
                    <span>{{ part.label }}</span>
                    <strong>{{ part.count }}</strong>
                  </button>
                </li>
              </ul>
            </template>
          </div>
        </section>
      </Reveal>

      <Reveal :order="2">
        <section class="mk-section" aria-label="Keuangan">
          <div class="mk-section-head"><div><h2>Keuangan {{ year }}</h2></div></div>
          <div class="mk-grid">
            <StatCard class="mk-wide" label="Uang masuk" :value="cashIn === null ? '–' : formatRupiahShort(cashIn)" :hint="cashError || 'tercatat di buku kas'" clickable @open="go('/owner/penjualan', { tab: 'payments' })" />
            <StatCard label="Nilai kontrak" :value="formatRupiahShort(yearSummary.contractValue)" hint="belum tentu sudah dibayar" clickable @open="go('/owner/penjualan')" />
            <StatCard label="Sisa tagihan" :value="formatRupiahShort(outstanding)" hint="dari semua tahun" clickable @open="go('/owner/penjualan', { tab: 'payments' })" />
          </div>
        </section>
      </Reveal>

      <Reveal :order="3">
        <BarChart title="Penjualan per bulan" :subtitle="`${yearSummary.units} transaksi di ${year}`" orientation="vertical" :items="monthlySales" label-header="Bulan" value-header="Transaksi" show-values />
      </Reveal>

      <Reveal :order="4">
        <section class="mk-section" aria-label="Penjualan terbaru">
          <div class="mk-section-head">
            <div><h2>Penjualan terbaru</h2></div>
            <button type="button" class="mk-link" @click="go('/owner/penjualan')">Lihat semua</button>
          </div>
          <OwnerSalesTable :rows="latestSales" empty-text="Belum ada penjualan. Transaksi baru akan muncul di sini." />
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
import OwnerSalesTable from '@/components/owner/OwnerSalesTable.vue'
import CountUp from '@/components/ui/CountUp.vue'
import Reveal from '@/components/ui/Reveal.vue'
import SceneBackdrop from '@/components/ui/SceneBackdrop.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import StatCard from '@/components/ui/StatCard.vue'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useOwnerData } from '@/composables/useOwnerData'
import { useRealtimeRefresh } from '@/composables/useRealtimeRefresh'
import { financialLedgerService } from '@/services/Finance/financialLedgerService'
import { currentMakassarDay, summarizeCashflow } from '@/utils/financialCashflow'
import { formatRupiahShort } from '@/utils/marketingStatus'
import { inRange, monthlySeries, periodOfYear, summarizeSales } from '@/utils/ownerReport'

const router = useIonRouter()
const { firstName } = useCurrentUser()
const ownerName = computed(() => firstName.value || 'Pemilik')
const { sales, inventory, loading, loaded, error, load } = useOwnerData()

const year = Number(currentMakassarDay().slice(0, 4))
const yearRange = periodOfYear(year)
const yearSummary = computed(() => summarizeSales(sales.value.filter((sale) => inRange(sale.date, yearRange))))
const monthlySales = computed(() => monthlySeries(sales.value, year))
const outstanding = computed(() => summarizeSales(sales.value).remaining)
const latestSales = computed(() => sales.value.slice(0, 5))

const parts = computed(() => [
  { status: 'sold', label: 'Terjual', count: inventory.value.sold },
  { status: 'booking', label: 'Dipesan', count: inventory.value.booking },
  { status: 'available', label: 'Tersedia', count: inventory.value.available },
])

function share(count: number) {
  const percent = (count / inventory.value.total) * 100
  return `${percent.toLocaleString('id-ID', { maximumFractionDigits: percent < 10 ? 1 : 0 })}%`
}

const cashIn = ref<number | null>(null)
const cashError = ref('')
async function loadCash() {
  try {
    const entries = await financialLedgerService.listBetween(yearRange.from, yearRange.to)
    cashIn.value = summarizeCashflow(entries).grossIncome
    cashError.value = ''
  } catch (cause) {
    console.error('[Beranda Owner] Buku kas gagal dimuat:', cause)
    if (cashIn.value === null) cashError.value = 'Belum dapat dimuat. Tarik layar untuk mencoba lagi.'
  }
}

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
.ow-hero {
  position: relative;
  overflow: hidden;
  border-radius: 24px;
  padding: var(--space-5);
  background:
    radial-gradient(circle at 100% 0%, rgba(244, 214, 154, 0.22), transparent 55%),
    linear-gradient(160deg, var(--green-800), var(--green-900));
  color: var(--on-forest);
  box-shadow: var(--shadow-md);
}
.ow-hero__body { position: relative; }
.ow-hero h2 { margin: 0; font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600; }
.ow-hero__figure { display: flex; flex-wrap: wrap; align-items: baseline; gap: 0 var(--space-3); margin: var(--space-2) 0 0; }
.ow-hero__figure strong {
  font-family: var(--font-display);
  font-size: clamp(3.25rem, 2rem + 7vw, 5rem);
  font-weight: 600;
  line-height: 1;
  color: var(--poliland-gold-soft);
  font-variant-numeric: lining-nums tabular-nums;
}
.ow-hero__figure > span { font-size: var(--text-lg); font-weight: 600; }
.ow-hero__share { margin: var(--space-1) 0 0; font-size: var(--text-sm); }

.ow-hero__bar {
  display: flex;
  gap: 2px;
  height: 16px;
  margin-top: var(--space-5);
  overflow: hidden;
  border-radius: var(--radius-pill);
  transform-origin: left;
  animation: ow-bar-in 900ms var(--ease-out) 200ms both;
}
.ow-hero__bar span { flex-basis: 0; min-width: 4px; }
.ow-hero .is-sold { background: #E8837C; }
.ow-hero .is-booking { background: var(--poliland-gold-soft); }
.ow-hero .is-available { background: #8FAF82; }

.ow-hero__legend { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: var(--space-2); margin: var(--space-3) 0 0; padding: 0; list-style: none; }
.ow-hero__legend button {
  width: 100%;
  min-height: 64px;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-content: center;
  align-items: center;
  gap: 2px 6px;
  padding: var(--space-2) var(--space-3);
  border: 1px solid rgba(244, 241, 232, 0.28);
  border-radius: var(--radius-control);
  background: rgba(31, 53, 25, 0.78);
  color: var(--on-forest);
  font: inherit;
  font-size: var(--text-xs);
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-base) var(--ease-spring), border-color var(--dur-fast) var(--ease-out);
}
.ow-hero__legend button strong { grid-column: 1 / -1; font-size: var(--text-xl); line-height: 1.2; font-variant-numeric: lining-nums tabular-nums; }
.ow-hero__legend button:active { transform: scale(0.97); transition-duration: var(--dur-fast); transition-timing-function: var(--ease-out); }
.ow-hero__legend button:focus-visible { outline: 3px solid var(--poliland-gold-soft); outline-offset: 2px; }
@media (hover: hover) and (pointer: fine) {
  .ow-hero__legend button:hover { border-color: var(--poliland-gold-soft); }
}
.ow-hero__dot { width: 10px; height: 10px; border-radius: 50%; }

@keyframes ow-bar-in { from { transform: scaleX(0); } }
@media (prefers-reduced-motion: reduce) {
  .ow-hero__bar { animation: none; }
}
</style>
