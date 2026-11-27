<template>
  <MarketingPageLayout title="Penjualan" tab-variant="owner" @refresh="refresh">
    <nav class="mk-tabs" role="tablist" aria-label="Jenis laporan">
      <button v-for="item in TABS" :key="item.value" type="button" role="tab" :aria-selected="tab === item.value" @click="tab = item.value">{{ item.label }}</button>
    </nav>

    <Reveal :order="1">
      <div class="mk-section">
        <div class="mk-chips" role="group" aria-label="Tahun">
          <button v-for="option in years" :key="option" type="button" class="mk-chip" :aria-pressed="year === option" @click="year = option">{{ option }}</button>
        </div>
        <label class="mk-field">
          <span>Bulan</span>
          <select v-model.number="month" class="mk-input">
            <option :value="0">Semua bulan</option>
            <option v-for="(name, index) in MONTH_NAMES" :key="name" :value="index + 1">{{ name }}</option>
          </select>
        </label>
      </div>
    </Reveal>

    <div v-if="loading && !loaded" class="mk-section" role="status" aria-label="Memuat penjualan">
      <Skeleton v-for="n in 4" :key="n" height="104px" border-radius="14px" />
    </div>
    <StatusIllustration v-else-if="error && !loaded" :variant="resolveErrorVariant(error)" title="Data penjualan belum dapat dimuat" :on-action="() => load()" />

    <template v-else>
      <section class="mk-section" :aria-label="`Ringkasan ${periodLabel}`">
        <div v-if="tab === 'sales'" class="mk-grid">
          <StatCard class="mk-wide" label="Nilai kontrak" :value="formatRupiahShort(summary.contractValue)" :hint="growth" accent />
          <StatCard label="Transaksi" :value="summary.units" :hint="`${summary.booked} dipesan · ${summary.paidOff} lunas`" />
          <StatCard label="Sisa tagihan" :value="formatRupiahShort(summary.remaining)" hint="dari transaksi ini" />
        </div>
        <div v-else class="mk-grid">
          <StatCard class="mk-wide" label="Uang masuk" :value="cash ? formatRupiahShort(cash.grossIncome) : '–'" :hint="cashError || 'tercatat di buku kas'" accent />
          <StatCard label="Uang muka diterima" :value="formatRupiahShort(confirmedOf('Down Payment'))" />
          <StatCard label="Cicilan diterima" :value="formatRupiahShort(confirmedOf('Installment'))" />
          <StatCard label="Pengeluaran" :value="cash ? formatRupiahShort(cash.totalExpenses) : '–'" :hint="cash ? `${formatRupiahShort(cash.refundExpenses)} pengembalian dana` : ''" />
          <StatCard label="Menunggu verifikasi" :value="formatRupiahShort(pendingAmount)" :hint="`${pending.length} pembayaran, semua tahun`" />
          <StatCard class="mk-wide" label="Sisa tagihan" :value="formatRupiahShort(summarizeSales(sales).remaining)" hint="semua transaksi aktif" />
        </div>
      </section>

      <section v-if="tab === 'sales'" class="mk-section" aria-label="Grafik penjualan">
        <div class="mk-chips" role="group" aria-label="Isi grafik">
          <button type="button" class="mk-chip" :aria-pressed="metric === 'units'" @click="metric = 'units'">Jumlah transaksi</button>
          <button type="button" class="mk-chip" :aria-pressed="metric === 'value'" @click="metric = 'value'">Nilai rupiah</button>
        </div>
        <BarChart v-if="metric === 'units'" :title="`Per bulan, ${year}`" orientation="vertical" :items="monthlySeries(sales, year)" label-header="Bulan" value-header="Transaksi" show-values />
        <BarChart v-else :title="`Per bulan, ${year}`" :items="monthlySeries(sales, year, (sale) => sale.contractValue)" :formatter="formatRupiahShort" label-header="Bulan" value-header="Nilai kontrak" />
      </section>

      <section class="mk-section" :aria-label="listTitle">
        <div class="mk-section-head"><div><h2>{{ listTitle }}</h2><p>{{ periodLabel }}</p></div></div>
        <label class="mk-field">
          <span>Cari</span>
          <input v-model="search" class="mk-input" type="search" enterkeyhint="search" placeholder="Nama pembeli atau nomor kaveling" />
        </label>

        <OwnerSalesTable v-if="tab === 'sales'" :rows="salesPager.items" :empty-text="emptyText('transaksi')" />
        <div v-else class="mk-table-wrap">
          <table class="mk-table mk-table--duo">
            <thead><tr><th scope="col">Pembeli</th><th scope="col" class="num">Nominal</th></tr></thead>
            <tbody>
              <tr v-if="!paymentPager.items.length"><td colspan="2" class="mk-muted">{{ emptyText('pembayaran') }}</td></tr>
              <tr v-for="payment in paymentPager.items" :key="payment.id">
                <td>
                  <strong>{{ payment.customerName }}</strong>
                  <small>{{ paymentCategoryLabel(payment.category) }} · Kaveling {{ payment.lotNumber }}</small>
                  <small>{{ formatDate(payment.date) }}</small>
                  <StatusBadge size="sm" :tone="paymentTone(payment.status)" :label="paymentStatusLabel(payment.status)" />
                </td>
                <td class="num"><strong>{{ formatRupiah(payment.amount) }}</strong></td>
              </tr>
            </tbody>
          </table>
        </div>
        <AppPagination :page="activePager.page" :total-pages="activePager.totalPages" :total="activePager.total" :page-size="activePager.pageSize" label="Halaman daftar" @update:page="activePager.setPage" />
        <button type="button" class="mk-btn mk-btn--ghost" :disabled="!activePager.total || exporting" @click="exportPdf">{{ exporting ? 'Menyiapkan…' : 'Unduh PDF' }}</button>
      </section>

      <BuyerRegions v-if="tab === 'sales'" :buyers="buyerAddresses" />
    </template>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import BarChart from '@/components/marketing/shared/BarChart.vue'
import BuyerRegions from '@/components/owner/BuyerRegions.vue'
import OwnerSalesTable from '@/components/owner/OwnerSalesTable.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import Reveal from '@/components/ui/Reveal.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import StatCard from '@/components/ui/StatCard.vue'
import StatusBadge, { type BadgeTone } from '@/components/ui/StatusBadge.vue'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import { useOwnerData } from '@/composables/useOwnerData'
import { useOwnRouteQuery } from '@/composables/useOwnRouteQuery'
import { usePagination } from '@/composables/usePagination'
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import { useToast } from '@/composables/useToast'
import { financialLedgerService } from '@/services/Finance/financialLedgerService'
import { currentMakassarDay, summarizeCashflow, type CashflowTotals } from '@/utils/financialCashflow'
import { saveBlobAsFile } from '@/utils/fileDownload'
import { buildReportPdf, formatPdfRupiah, type PdfReportInput } from '@/utils/financialPdf'
import { formatDate, formatRupiah, formatRupiahShort, paymentCategoryLabel, paymentStatusLabel, transactionStatusLabel } from '@/utils/marketingStatus'
import { availableYears, inRange,monthlySeries, periodOfYear, summarizeSales } from '@/utils/ownerReport'

type Tab = 'sales' | 'payments'
const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'sales', label: 'Penjualan' },
  { value: 'payments', label: 'Pembayaran' },
]
const MONTH_NAMES = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember']

const query = useOwnRouteQuery()
const tabFromQuery = (): Tab => (query.value.tab === 'payments' ? 'payments' : 'sales')
const tab = ref<Tab>(tabFromQuery())
watch(query, () => (tab.value = tabFromQuery()))

const toast = useToast()
const { clients, sales, payments, loading, loaded, error, load } = useOwnerData()

const currentYear = Number(currentMakassarDay().slice(0, 4))
const year = ref(currentYear)
const month = ref(0)
const metric = ref<'units' | 'value'>('units')
const search = ref('')
const years = computed(() => availableYears([...sales.value, ...payments.value], currentYear))
const range = computed(() => periodOfYear(year.value, month.value))
const periodLabel = computed(() => (month.value ? `${MONTH_NAMES[month.value - 1]} ${year.value}` : `Tahun ${year.value}`))
const listTitle = computed(() => (tab.value === 'sales' ? 'Daftar transaksi' : 'Riwayat pembayaran'))

const cash = ref<CashflowTotals | null>(null)
const cashError = ref('')
async function loadCash({ silent = false }: LoadOptions = {}) {
  const requested = range.value
  if (!silent) {
    cash.value = null
    cashError.value = ''
  }
  try {
    const entries = await financialLedgerService.listBetween(requested.from, requested.to)
    if (requested !== range.value) return
    cash.value = summarizeCashflow(entries)
    cashError.value = ''
  } catch (cause) {
    console.error('[Penjualan Owner] Buku kas gagal dimuat:', cause)
    if (!silent && requested === range.value) cashError.value = 'Belum dapat dimuat. Tarik layar untuk mencoba lagi.'
  }
}
watch(range, () => void loadCash(), { immediate: true })

function refresh() {
  void load()
  void loadCash()
}

const matches = (text: string) => text.toLocaleLowerCase('id-ID').includes(search.value.trim().toLocaleLowerCase('id-ID'))
const periodSales = computed(() => sales.value.filter((sale) => inRange(sale.date, range.value)))
const periodPayments = computed(() => payments.value.filter((payment) => inRange(payment.date, range.value)))
const summary = computed(() => summarizeSales(periodSales.value))

/* Pembanding hanya untuk setahun penuh agar yang dibandingkan setara. */
const growth = computed(() => {
  if (month.value) return 'belum tentu sudah dibayar'
  const previousRange = periodOfYear(year.value - 1)
  const previous = summarizeSales(sales.value.filter((sale) => inRange(sale.date, previousRange))).contractValue
  if (!previous) return 'belum tentu sudah dibayar'
  const percent = Math.round(((summary.value.contractValue - previous) / previous) * 100)
  return `${percent >= 0 ? 'Naik' : 'Turun'} ${Math.abs(percent)}% dari ${year.value - 1}`
})

const pending = computed(() => payments.value.filter((payment) => payment.status === 'Pending'))
const pendingAmount = computed(() => pending.value.reduce((total, payment) => total + payment.amount, 0))
const confirmedOf = (category: string) =>
  periodPayments.value
    .filter((payment) => payment.status === 'Confirmed' && payment.category === category)
    .reduce((total, payment) => total + payment.amount, 0)
const paymentTone = (status: string): BadgeTone => (status === 'Confirmed' ? 'success' : status === 'Pending' ? 'gold' : 'danger')

const buyerAddresses = computed(() => {
  const buyers = new Set(sales.value.map((sale) => sale.customerId))
  return clients.value.filter((client) => buyers.has(Number(client.id)))
})

const salesRows = computed(() => periodSales.value.filter((sale) => matches(`${sale.customerName} ${sale.lotNumber}`)))
const paymentRows = computed(() => periodPayments.value.filter((payment) => matches(`${payment.customerName} ${payment.lotNumber}`)))
const salesPager = usePagination(salesRows, { pageSize: 8, resetOn: [search, range] })
const paymentPager = usePagination(paymentRows, { pageSize: 8, resetOn: [search, range] })
const activePager = computed(() => (tab.value === 'payments' ? paymentPager : salesPager))
const emptyText = (noun: string) =>
  search.value.trim() ? `Tidak ada ${noun} yang cocok. Coba kata lain.` : `Belum ada ${noun} pada periode ini. Pilih bulan atau tahun lain.`

const exporting = ref(false)
/** Isi PDF mengikuti daftar di layar: tab, periode, dan kata pencarian. */
function pdfInput(isPayments: boolean): PdfReportInput {
  const keyword = search.value.trim()
  const printedAt = new Intl.DateTimeFormat('id-ID', { dateStyle: 'long', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(new Date())
  const subtitle = [`Periode: ${periodLabel.value}`, keyword && `Pencarian: "${keyword}"`, `Dicetak: ${printedAt} WITA`].filter(Boolean).join('  |  ')
  if (isPayments) {
    const rows = paymentRows.value
    const verified = rows.filter((p) => p.status === 'Confirmed').reduce((total, p) => total + p.amount, 0)
    return {
      title: 'Laporan Pembayaran',
      subtitle,
      summary: [
        ['Jumlah pembayaran', String(rows.length)],
        ['Total terverifikasi', formatPdfRupiah(verified)],
      ],
      sections: [{
        title: 'Riwayat pembayaran',
        head: ['Tanggal', 'Pembeli', 'Kaveling', 'Jenis', 'Status', 'Nominal'],
        body: rows.map((p) => [formatDate(p.date), p.customerName, p.lotNumber, paymentCategoryLabel(p.category), paymentStatusLabel(p.status), formatPdfRupiah(p.amount)]),
        rightAlign: [5],
      }],
    }
  }
  const rows = salesRows.value
  const total = summarizeSales(rows)
  return {
    title: 'Laporan Penjualan',
    subtitle,
    summary: [
      ['Jumlah transaksi', String(rows.length)],
      ['Nilai kontrak', formatPdfRupiah(total.contractValue)],
      ['Sisa tagihan', formatPdfRupiah(total.remaining)],
    ],
    sections: [{
      title: 'Daftar transaksi',
      head: ['Tanggal', 'Pembeli', 'Kaveling', 'Status', 'Nilai kontrak', 'Sisa'],
      body: rows.map((s) => [formatDate(s.date), s.customerName, s.lotNumber, transactionStatusLabel(s.status), formatPdfRupiah(s.contractValue), formatPdfRupiah(s.remaining)]),
      rightAlign: [4, 5],
    }],
  }
}

async function exportPdf() {
  const isPayments = tab.value === 'payments'
  const filename = `laporan-${isPayments ? 'pembayaran' : 'penjualan'}-${range.value.from}-${range.value.to}.pdf`
  exporting.value = true
  try {
    const blob = await buildReportPdf(pdfInput(isPayments))
    toast.success(await saveBlobAsFile(blob, filename))
  } catch (cause) {
    console.error('[Penjualan Owner] Unduhan gagal:', cause)
    toast.error('Laporan belum dapat diunduh. Coba lagi.')
  } finally {
    exporting.value = false
  }
}

useRealtimeRefresh(['payments', 'lot_transactions'], () => loadCash({ silent: true }))
</script>
