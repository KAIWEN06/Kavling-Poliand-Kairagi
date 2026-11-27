<template>
  <MarketingPageLayout title="Laporan" tab-variant="owner" @refresh="refresh">
    <nav class="mk-tabs" role="tablist" aria-label="Jenis laporan">
      <button v-for="item in TABS" :key="item.value" type="button" role="tab" :aria-selected="tab === item.value" @click="tab = item.value">{{ item.label }}</button>
    </nav>

    <Reveal :order="1">
      <PeriodFilter initial="year" @change="onRange" />
    </Reveal>

    <div v-if="loading && !loaded" class="mk-section" role="status" aria-label="Memuat laporan">
      <Skeleton v-for="n in 4" :key="n" height="104px" border-radius="14px" />
    </div>
    <StatusIllustration v-else-if="error && !loaded" :variant="resolveErrorVariant(error)" title="Laporan belum dapat dimuat" :on-action="() => load()" />

    <section v-else-if="tab === 'marketing'" class="mk-section" aria-label="Kinerja pemasar">
      <p class="mk-muted">Hanya klien yang ditangani tim pemasaran. Klien tanpa pemasar tidak dihitung di sini.</p>
      <StatusIllustration v-if="reportLoading && !report" variant="processing" title="Memuat laporan" />
      <StatusIllustration v-else-if="reportError" :variant="resolveErrorVariant(reportError)" title="Laporan pemasaran belum dapat dimuat" :on-action="() => loadReport()" />
      <template v-else-if="report">
        <div class="mk-grid">
          <StatCard class="mk-span-2" label="Nilai kontrak tim" :value="formatRupiahShort(teamSummary.contract_value)" accent />
          <StatCard label="Klien baru" :value="teamSummary.new_clients" />
          <StatCard label="SPK terkonfirmasi" :value="teamSummary.spk_approved" />
        </div>
        <div class="mk-table-wrap">
          <table class="mk-table mk-table--stack">
            <thead><tr><th>Pemasar</th><th class="num">Klien</th><th class="num">Tindak lanjut</th><th class="num">Transaksi</th><th class="num">Nilai kontrak</th><th class="num">Konversi</th></tr></thead>
            <tbody>
              <tr v-if="!report.team.length"><td colspan="6" class="mk-muted">Belum ada anggota tim pemasaran.</td></tr>
              <tr v-for="member in report.team" :key="member.id">
                <td class="mk-cell-main">{{ member.full_name }}</td>
                <td data-label="Klien" class="num">{{ member.total_clients }}</td>
                <td data-label="Tindak lanjut" class="num">{{ member.followup }}</td>
                <td data-label="Transaksi" class="num">{{ member.units_sold }}</td>
                <td data-label="Nilai kontrak" class="num">{{ formatRupiah(member.contract_value) }}</td>
                <td data-label="Konversi" class="num">{{ member.conversion_rate }}%</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </section>

    <template v-else>
      <section class="mk-section" aria-label="Ringkasan periode">
        <div v-if="tab === 'sales'" class="mk-grid">
          <StatCard class="mk-span-2" label="Nilai kontrak" :value="formatRupiahShort(summary.contractValue)" hint="belum tentu sudah dibayar" accent />
          <StatCard label="Transaksi" :value="summary.units" :hint="`${summary.booked} dipesan · ${summary.paidOff} lunas`" />
          <StatCard label="Belum dibayar" :value="formatRupiahShort(summary.remaining)" hint="sisa dari transaksi ini" />
        </div>
        <div v-else class="mk-grid">
          <StatCard class="mk-span-2" label="Kas masuk" :value="cash ? formatRupiahShort(cash.grossIncome) : '–'" :hint="cashError || 'dari buku kas'" accent />
          <StatCard label="Pengeluaran" :value="cash ? formatRupiahShort(cash.totalExpenses) : '–'" :hint="cash ? `${formatRupiahShort(cash.refundExpenses)} pengembalian dana` : ''" />
          <StatCard label="Menunggu verifikasi" :value="formatRupiahShort(pendingAmount)" :hint="`${pending.length} pembayaran, semua periode`" />
          <StatCard label="Uang muka diterima" :value="formatRupiahShort(confirmedOf('Down Payment'))" />
          <StatCard label="Cicilan diterima" :value="formatRupiahShort(confirmedOf('Installment'))" />
          <StatCard class="mk-span-2" label="Sisa tagihan" :value="formatRupiahShort(summarizeSales(sales).remaining)" hint="semua transaksi aktif" />
        </div>
      </section>

      <section class="mk-section" :aria-label="tab === 'sales' ? 'Daftar transaksi' : 'Riwayat pembayaran'">
        <div class="mk-section-head"><div><h2>{{ tab === 'sales' ? 'Daftar transaksi' : 'Riwayat pembayaran' }}</h2></div></div>
        <label class="mk-field">
          <span>Cari</span>
          <input v-model="search" class="mk-input" type="search" enterkeyhint="search" placeholder="Nama pembeli atau nomor kaveling" />
        </label>

        <div class="mk-table-wrap">
          <table v-if="tab === 'sales'" class="mk-table mk-table--stack">
            <thead><tr><th>Pembeli</th><th>Tanggal</th><th>Kaveling</th><th>Pemasar</th><th>Status</th><th class="num">Nilai kontrak</th><th class="num">Sisa</th></tr></thead>
            <tbody>
              <tr v-if="!salesPager.items.length"><td colspan="7" class="mk-muted">Tidak ada transaksi pada periode ini.</td></tr>
              <tr v-for="sale in salesPager.items" :key="sale.id">
                <td class="mk-cell-main">{{ sale.customerName }}</td>
                <td data-label="Tanggal">{{ formatDate(sale.date) }}</td>
                <td data-label="Kaveling">{{ sale.lotNumber }}</td>
                <td data-label="Pemasar">{{ sale.marketingName }}</td>
                <td data-label="Status">{{ transactionStatusLabel(sale.status) }}</td>
                <td data-label="Nilai kontrak" class="num">{{ formatRupiah(sale.contractValue) }}</td>
                <td data-label="Sisa" class="num">{{ formatRupiah(sale.remaining) }}</td>
              </tr>
            </tbody>
          </table>
          <table v-else class="mk-table mk-table--stack">
            <thead><tr><th>Pembeli</th><th>Tanggal</th><th>Kaveling</th><th>Jenis</th><th>Status</th><th class="num">Nominal</th></tr></thead>
            <tbody>
              <tr v-if="!paymentPager.items.length"><td colspan="6" class="mk-muted">Tidak ada pembayaran pada periode ini.</td></tr>
              <tr v-for="payment in paymentPager.items" :key="payment.id">
                <td class="mk-cell-main">{{ payment.customerName }}</td>
                <td data-label="Tanggal">{{ formatDate(payment.date) }}</td>
                <td data-label="Kaveling">{{ payment.lotNumber }}</td>
                <td data-label="Jenis">{{ paymentCategoryLabel(payment.category) }}</td>
                <td data-label="Status">{{ paymentStatusLabel(payment.status) }}</td>
                <td data-label="Nominal" class="num">{{ formatRupiah(payment.amount) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <AppPagination :page="activePager.page" :total-pages="activePager.totalPages" :total="activePager.total" :page-size="activePager.pageSize" label="Halaman laporan" @update:page="activePager.setPage" />
        <button type="button" class="mk-btn mk-btn--ghost" :disabled="!activePager.total || exporting" @click="exportCsv">{{ exporting ? 'Menyiapkan…' : 'Unduh CSV' }}</button>
      </section>
    </template>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import PeriodFilter from '@/components/marketing/shared/PeriodFilter.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import Reveal from '@/components/ui/Reveal.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import StatCard from '@/components/ui/StatCard.vue'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import { useMarketingReport } from '@/composables/useMarketingReport'
import { useOwnerData } from '@/composables/useOwnerData'
import { useOwnRouteQuery } from '@/composables/useOwnRouteQuery'
import { usePagination } from '@/composables/usePagination'
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import { useToast } from '@/composables/useToast'
import { financialLedgerService } from '@/services/Finance/financialLedgerService'
import { summarizeCashflow, type CashflowTotals } from '@/utils/financialCashflow'
import { saveBlobAsFile } from '@/utils/fileDownload'
import { formatDate, formatRupiah, formatRupiahShort, paymentCategoryLabel, paymentStatusLabel, periodRange, transactionStatusLabel } from '@/utils/marketingStatus'
import { inRange, summarizeSales, toCsv, type DateRange } from '@/utils/ownerReport'

type Tab = 'sales' | 'payments' | 'marketing'
const TABS: Array<{ value: Tab; label: string }> = [
  { value: 'sales', label: 'Penjualan' },
  { value: 'payments', label: 'Pembayaran' },
  { value: 'marketing', label: 'Pemasaran' },
]

const query = useOwnRouteQuery()
const tabFromQuery = (): Tab => TABS.find((item) => item.value === query.value.tab)?.value ?? 'sales'
const tab = ref<Tab>(tabFromQuery())
watch(query, () => (tab.value = tabFromQuery()))

const toast = useToast()
const { sales, payments, loading, loaded, error, load } = useOwnerData()
const { report, loading: reportLoading, error: reportError, load: loadReport, s: teamSummary } = useMarketingReport()

const range = ref<DateRange>(periodRange('year'))
const search = ref('')

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
    console.error('[Laporan Owner] Buku kas gagal dimuat:', cause)
    if (!silent && requested === range.value) cashError.value = 'Buku kas belum dapat dimuat'
  }
}

function onRange(value: { from: string; to: string }) {
  range.value = { from: value.from, to: value.to }
  void loadCash()
  void loadReport({ from: value.from, to: value.to, marketingId: null })
}

function refresh() {
  void load()
  void loadCash()
  void loadReport()
}

const matches = (text: string) => text.toLocaleLowerCase('id-ID').includes(search.value.trim().toLocaleLowerCase('id-ID'))
const periodSales = computed(() => sales.value.filter((sale) => inRange(sale.date, range.value)))
const periodPayments = computed(() => payments.value.filter((payment) => inRange(payment.date, range.value)))
const summary = computed(() => summarizeSales(periodSales.value))
const pending = computed(() => payments.value.filter((payment) => payment.status === 'Pending'))
const pendingAmount = computed(() => pending.value.reduce((total, payment) => total + payment.amount, 0))
const confirmedOf = (category: string) =>
  periodPayments.value
    .filter((payment) => payment.status === 'Confirmed' && payment.category === category)
    .reduce((total, payment) => total + payment.amount, 0)

const salesRows = computed(() => periodSales.value.filter((sale) => matches(`${sale.customerName} ${sale.lotNumber}`)))
const paymentRows = computed(() => periodPayments.value.filter((payment) => matches(`${payment.customerName} ${payment.lotNumber}`)))
const salesPager = usePagination(salesRows, { pageSize: 8, resetOn: [search, range] })
const paymentPager = usePagination(paymentRows, { pageSize: 8, resetOn: [search, range] })
const activePager = computed(() => (tab.value === 'payments' ? paymentPager : salesPager))

const exporting = ref(false)
async function exportCsv() {
  const isPayments = tab.value === 'payments'
  const rows: Array<Array<string | number>> = isPayments
    ? [
        ['Tanggal', 'Pembeli', 'Kaveling', 'Jenis', 'Status', 'Nominal'],
        ...paymentRows.value.map((p) => [p.date, p.customerName, p.lotNumber, paymentCategoryLabel(p.category), paymentStatusLabel(p.status), p.amount]),
      ]
    : [
        ['Tanggal', 'Pembeli', 'Kaveling', 'Pemasar', 'Status', 'Nilai kontrak', 'Sisa'],
        ...salesRows.value.map((s) => [s.date, s.customerName, s.lotNumber, s.marketingName, transactionStatusLabel(s.status), s.contractValue, s.remaining]),
      ]
  exporting.value = true
  try {
    // BOM agar Excel membaca UTF-8 dengan benar.
    const blob = new Blob([`﻿${toCsv(rows)}`], { type: 'text/csv;charset=utf-8' })
    await saveBlobAsFile(blob, `laporan-${isPayments ? 'pembayaran' : 'penjualan'}-${range.value.from}-${range.value.to}.csv`)
  } catch (cause) {
    console.error('[Laporan Owner] Ekspor gagal:', cause)
    toast.error('Laporan belum dapat diunduh. Coba lagi.')
  } finally {
    exporting.value = false
  }
}

useRealtimeRefresh(['payments', 'lot_transactions', 'customers'], () =>
  Promise.all([loadCash({ silent: true }), loadReport(undefined, { silent: true })]),
)
</script>
