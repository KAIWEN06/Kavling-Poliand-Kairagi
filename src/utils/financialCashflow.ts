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
    ['Pengeluaran refund', String(totals.refundExpenses)],
    ['Total pengeluaran', String(totals.totalExpenses)],
    ['Arus kas bersih', String(totals.netCashFlow)],
    [],
    ['Tanggal transaksi', 'Arah kas', 'Kategori', 'Sumber', 'ID sumber', 'Referensi bank', 'Nominal'],
    ...periodEntries.map((entry) => [
      entry.occurred_on,
      entry.flow_direction === 'inflow' ? 'Pemasukan' : 'Pengeluaran',
      entry.category,
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
