import { formatInstallmentRange } from '@/utils/installmentFormat'

export interface CashflowEntry {
  id: number
  flow_direction: 'inflow' | 'outflow'
  category: string
  amount: number
  source_table: string
  source_id: number
  occurred_on: string
  bank_reference: string | null
  status: 'posted' | 'reversed'
  installment_numbers?: number[]
  installment_total?: number | null
}

export interface CashflowTotals {
  grossIncome: number
  refundExpenses: number
  totalExpenses: number
  netCashFlow: number
}

export interface MonthlyCashflow extends CashflowTotals {
  key: string
  label: string
}

export function currentMakassarDateTimeLocal(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const value = (type: string) => parts.find((part) => part.type === type)?.value ?? ''
  return `${value('year')}-${value('month')}-${value('day')}T${value('hour')}:${value('minute')}`
}

export function makassarDateTimeLocalToIso(value: string): string {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    throw new Error('Tanggal dan waktu transfer harus diisi dengan format yang valid.')
  }
  const date = new Date(`${value}:00+08:00`)
  if (!Number.isFinite(date.getTime()) || isoToMakassarDateTimeLocal(date.toISOString()) !== value) {
    throw new Error('Tanggal dan waktu transfer tidak valid.')
  }
  return date.toISOString()
}

export function isoToMakassarDateTimeLocal(value: string): string {
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(date)
  const part = (type: string) => parts.find((item) => item.type === type)?.value ?? ''
  return `${part('year')}-${part('month')}-${part('day')}T${part('hour')}:${part('minute')}`
}

export function monthlyTrendRange(selectedMonth: string, monthCount: number): { startDate: string; endDate: string } {
  const [year, month] = selectedMonth.split('-').map(Number)
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(monthCount) || monthCount < 1) {
    throw new Error('Periode laporan tidak valid.')
  }
  const start = new Date(year, month - monthCount, 1)
  const end = new Date(year, month, 0)
  const format = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
  return { startDate: format(start), endDate: format(end) }
}

export function postedCashflowForMonth(entries: CashflowEntry[], month: string): CashflowEntry[] {
  assertUniqueSources(entries)
  return entries.filter((entry) => entry.status === 'posted' && entry.occurred_on.slice(0, 7) === month)
}

export function summarizeCashflow(entries: CashflowEntry[]): CashflowTotals {
  assertUniqueSources(entries)
  const posted = entries.filter((entry) => entry.status === 'posted')
  const grossIncome = posted
    .filter((entry) => entry.flow_direction === 'inflow')
    .reduce((sum, entry) => sum + entry.amount, 0)
  const totalExpenses = posted
    .filter((entry) => entry.flow_direction === 'outflow')
    .reduce((sum, entry) => sum + entry.amount, 0)
  const refundExpenses = posted
    .filter((entry) => entry.flow_direction === 'outflow' && entry.source_table === 'booking_fee_refunds')
    .reduce((sum, entry) => sum + entry.amount, 0)

  return { grossIncome, refundExpenses, totalExpenses, netCashFlow: grossIncome - totalExpenses }
}

export function monthlyCashflowTrend(entries: CashflowEntry[], selectedMonth: string, monthCount = 6): MonthlyCashflow[] {
  const [year, month] = selectedMonth.split('-').map(Number)
  if (!Number.isInteger(year) || !Number.isInteger(month) || month < 1 || month > 12 || !Number.isInteger(monthCount) || monthCount < 1) return []

  const firstMonth = new Date(year, month - monthCount, 1)
  return Array.from({ length: monthCount }, (_, index) => {
    const date = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    return {
      key,
      label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date),
      ...summarizeCashflow(postedCashflowForMonth(entries, key)),
    }
  })
}

export function cashflowCsvRows(entries: CashflowEntry[], month: string): string[][] {
  const periodEntries = postedCashflowForMonth(entries, month)
  const totals = summarizeCashflow(periodEntries)
  return [
    ['Ringkasan', 'Nominal'],
    ['Pemasukan bruto', String(totals.grossIncome)],
    ['Pengembalian dana', String(totals.refundExpenses)],
    ['Total pengeluaran', String(totals.totalExpenses)],
    ['Arus kas bersih', String(totals.netCashFlow)],
    [],
    ['Tanggal transaksi', 'Arah kas', 'Kategori', 'Cicilan', 'Sumber', 'ID sumber', 'Referensi bank', 'Nominal'],
    ...periodEntries.map((entry) => [
      entry.occurred_on,
      entry.flow_direction === 'inflow' ? 'Pemasukan' : 'Pengeluaran',
      entry.category,
      formatInstallmentRange(entry.installment_numbers ?? [], entry.installment_total),
      entry.source_table,
      String(entry.source_id),
      entry.bank_reference ?? '',
      String(entry.amount),
    ]),
  ]
}

function assertUniqueSources(entries: CashflowEntry[]): void {
  const seen = new Set<string>()
  for (const entry of entries) {
    const source = `${entry.source_table}:${entry.source_id}`
    if (seen.has(source)) throw new Error(`Sumber transaksi kas ganda: ${source}`)
    seen.add(source)
  }
}

/* ---------- Filter periode laporan: minggu / bulan / tahun ---------- */

export type ReportGranularity = 'week' | 'month' | 'year'

export interface ReportPeriod {
  granularity: ReportGranularity
  /** YYYY-MM-DD, inklusif */
  start: string
  /** YYYY-MM-DD, inklusif */
  end: string
  label: string
}

export interface CashflowBucket extends CashflowTotals {
  key: string
  label: string
}

const ISO_DAY = /^\d{4}-\d{2}-\d{2}$/
const DAY_MS = 86_400_000

// Seluruh perhitungan tanggal memakai UTC pada string YYYY-MM-DD agar tidak bergeser oleh zona waktu perangkat.
function parseDay(value: string): Date {
  if (!ISO_DAY.test(value)) throw new Error('Periode laporan tidak valid.')
  const [y, m, d] = value.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}
function formatDay(date: Date): string {
  return date.toISOString().slice(0, 10)
}
function addDays(value: string, days: number): string {
  return formatDay(new Date(parseDay(value).getTime() + days * DAY_MS))
}
function addMonths(value: string, months: number): string {
  const d = parseDay(value)
  return formatDay(new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + months, 1)))
}

export function currentMakassarDay(now = new Date()): string {
  return currentMakassarDateTimeLocal(now).slice(0, 10)
}

const dayLabel = (value: string, options: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat('id-ID', { timeZone: 'UTC', ...options }).format(parseDay(value))

/** Periode yang memuat tanggal `anchor`. Minggu dimulai hari Senin. */
export function reportPeriod(granularity: ReportGranularity, anchor: string): ReportPeriod {
  const date = parseDay(anchor)
  if (granularity === 'week') {
    const offset = (date.getUTCDay() + 6) % 7
    const start = addDays(anchor, -offset)
    const end = addDays(start, 6)
    const sameYear = start.slice(0, 4) === end.slice(0, 4)
    const from = dayLabel(start, sameYear ? { day: 'numeric', month: 'short' } : { day: 'numeric', month: 'short', year: 'numeric' })
    const to = dayLabel(end, { day: 'numeric', month: 'short', year: 'numeric' })
    return { granularity, start, end, label: `${from} – ${to}` }
  }
  if (granularity === 'month') {
    const start = `${anchor.slice(0, 7)}-01`
    const end = addDays(addMonths(start, 1), -1)
    return { granularity, start, end, label: dayLabel(start, { month: 'long', year: 'numeric' }) }
  }
  const year = anchor.slice(0, 4)
  return { granularity, start: `${year}-01-01`, end: `${year}-12-31`, label: year }
}

export function shiftReportAnchor(granularity: ReportGranularity, anchor: string, delta: number): string {
  if (granularity === 'week') return addDays(anchor, delta * 7)
  if (granularity === 'month') return addMonths(`${anchor.slice(0, 7)}-01`, delta)
  return `${Number(anchor.slice(0, 4)) + delta}-01-01`
}

export function previousPeriodNoun(granularity: ReportGranularity): string {
  return granularity === 'week' ? 'minggu lalu' : granularity === 'month' ? 'bulan lalu' : 'tahun lalu'
}

export function postedCashflowForRange(entries: CashflowEntry[], start: string, end: string): CashflowEntry[] {
  assertUniqueSources(entries)
  return entries.filter((entry) => {
    const day = entry.occurred_on.slice(0, 10)
    return entry.status === 'posted' && day >= start && day <= end
  })
}

/** Rentang data yang perlu dimuat: periode terpilih, periode pembanding, dan seluruh bucket tren. */
export function reportLoadRange(period: ReportPeriod, anchor: string): { startDate: string; endDate: string } {
  const previous = reportPeriod(period.granularity, shiftReportAnchor(period.granularity, anchor, -1))
  const buckets = cashflowTrendBuckets(period, anchor)
  const starts = [previous.start, period.start, ...buckets.map((b) => b.start)]
  return { startDate: starts.sort()[0], endDate: period.end }
}

interface BucketSpec { key: string; label: string; start: string; end: string }

/**
 * Bucket tren per granularitas:
 * minggu → 7 hari pada minggu itu, bulan → 6 bulan terakhir hingga bulan terpilih, tahun → 12 bulan pada tahun itu.
 */
export function cashflowTrendBuckets(period: ReportPeriod, anchor: string): BucketSpec[] {
  if (period.granularity === 'week') {
    return Array.from({ length: 7 }, (_, i) => {
      const day = addDays(period.start, i)
      return { key: day, label: dayLabel(day, { weekday: 'short' }), start: day, end: day }
    })
  }
  const monthCount = period.granularity === 'year' ? 12 : 6
  const lastMonth = period.granularity === 'year' ? `${period.start.slice(0, 4)}-12-01` : `${anchor.slice(0, 7)}-01`
  return Array.from({ length: monthCount }, (_, i) => {
    const start = addMonths(lastMonth, i - (monthCount - 1))
    return { key: start.slice(0, 7), label: dayLabel(start, { month: 'short' }), start, end: addDays(addMonths(start, 1), -1) }
  })
}

export function cashflowTrendForPeriod(entries: CashflowEntry[], period: ReportPeriod, anchor: string): CashflowBucket[] {
  return cashflowTrendBuckets(period, anchor).map((bucket) => ({
    key: bucket.key,
    label: bucket.label,
    ...summarizeCashflow(postedCashflowForRange(entries, bucket.start, bucket.end)),
  }))
}
