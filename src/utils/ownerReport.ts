/**
 * Perhitungan panel Owner: seluruh perusahaan, termasuk klien tanpa pemasar.
 * RPC get_marketing_report hanya menghitung klien milik tim pemasaran, jadi angka perusahaan
 * dihitung di sini dengan definisi yang sama:
 * - penjualan = transaksi yang tidak dibatalkan, menurut booking_date;
 * - dipesan = status Booking, lunas = status Sold;
 * - sisa tagihan = calculateFinanceBalance, sama dengan Keuangan Admin.
 */
import { calculateFinanceBalance } from '@/composables/useFinanceCalculations'
import type { FinanceCustomerRecord, FinancePaymentRecord, FinanceTransactionRecord } from '@/types/finance'

export interface OwnerSale {
  id: number
  customerId: number
  customerName: string
  marketingName: string
  lotNumber: string
  block: string
  status: string
  paymentType: string
  /** YYYY-MM-DD */
  date: string
  contractValue: number
  paid: number
  remaining: number
}

export interface OwnerPaymentRow {
  id: number
  customerId: number
  customerName: string
  lotNumber: string
  category: string
  status: string
  amount: number
  /** YYYY-MM-DD */
  date: string
  /** Waktu lengkap untuk urutan aktivitas. */
  occurredAt: string
}

export interface DateRange {
  from: string
  to: string
}

const one = <T>(value: T | T[] | null | undefined): T | null =>
  Array.isArray(value) ? value[0] ?? null : value ?? null

export function inRange(day: string, range: DateRange): boolean {
  return Boolean(day) && day >= range.from && day <= range.to
}

/** Pembayaran milik satu transaksi, dengan aturan pencocokan yang sama seperti Keuangan Admin. */
function paymentsOf(customer: FinanceCustomerRecord, transaction: FinanceTransactionRecord): FinancePaymentRecord[] {
  return (customer.payments ?? []).filter((payment) =>
    payment.transaction_id
      ? String(payment.transaction_id) === String(transaction.id)
      : !payment.spk_request_id && String(payment.lot_id) === String(transaction.lot_id),
  )
}

export function buildSales(customers: FinanceCustomerRecord[]): OwnerSale[] {
  return customers
    .flatMap((customer) =>
      (customer.lot_transactions ?? [])
        .filter((transaction) => transaction.status !== 'Cancelled')
        .map((transaction) => {
          const lot = one(transaction.lots) as { lot_number?: string; blocks?: unknown } | null
          const block = one(lot?.blocks as { name?: string; code?: string } | null)
          const balance = calculateFinanceBalance(transaction, paymentsOf(customer, transaction))
          return {
            id: Number(transaction.id),
            customerId: Number(customer.id),
            customerName: customer.full_name || 'Tanpa nama',
            marketingName: one(customer.marketing)?.full_name || 'Tanpa pemasar',
            lotNumber: lot?.lot_number || `#${transaction.lot_id}`,
            block: block?.name || block?.code || 'Tanpa blok',
            status: transaction.status,
            paymentType: transaction.payment_type,
            date: (transaction.booking_date || '').slice(0, 10),
            contractValue: balance.obligation,
            paid: balance.principalPaid,
            remaining: balance.remaining,
          }
        }),
    )
    .sort((a, b) => b.date.localeCompare(a.date))
}

/** Tanggal di zona Makassar, sama dengan pengelompokan di database. */
export function makassarDay(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Makassar', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

export function buildPayments(customers: FinanceCustomerRecord[]): OwnerPaymentRow[] {
  return customers
    .flatMap((customer) =>
      (customer.payments ?? []).map((payment) => {
        const lot = one((payment as { lots?: { lot_number?: string } | null }).lots)
        const verifiedAt = (payment as { verified_at?: string | null }).verified_at
        const occurredAt = (payment.status === 'Confirmed' && verifiedAt) || payment.created_at
        return {
          id: Number(payment.id),
          customerId: Number(customer.id),
          customerName: customer.full_name || 'Tanpa nama',
          lotNumber: lot?.lot_number || '-',
          category: payment.payment_category || 'Other',
          status: payment.status,
          amount: Number(payment.amount ?? 0),
          date: makassarDay(occurredAt),
          occurredAt,
        }
      }),
    )
    .sort((a, b) => b.occurredAt.localeCompare(a.occurredAt))
}

export function summarizeSales(sales: OwnerSale[]) {
  const sum = (pick: (sale: OwnerSale) => number) => sales.reduce((total, sale) => total + pick(sale), 0)
  return {
    units: sales.length,
    booked: sales.filter((sale) => sale.status === 'Booking').length,
    paidOff: sales.filter((sale) => sale.status === 'Sold').length,
    contractValue: sum((sale) => sale.contractValue),
    remaining: sum((sale) => sale.remaining),
  }
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

/** Dua belas bulan untuk satu tahun. */
export function monthlySeries<T extends { date: string }>(rows: T[], year: number, pick: (row: T) => number = () => 1) {
  return MONTHS.map((label, index) => {
    const key = `${year}-${String(index + 1).padStart(2, '0')}`
    return {
      label,
      value: rows.filter((row) => row.date.startsWith(key)).reduce((total, row) => total + pick(row), 0),
    }
  })
}

/** Tahun yang punya data, terbaru dulu; tahun berjalan selalu ada. */
export function availableYears(rows: Array<{ date: string }>, currentYear: number): number[] {
  const years = new Set<number>([currentYear])
  rows.forEach((row) => {
    const year = Number(row.date.slice(0, 4))
    if (year > 0) years.add(year)
  })
  return [...years].sort((a, b) => b - a)
}

export function countBy<T>(rows: T[], key: (row: T) => string): Array<{ label: string; value: number }> {
  const counts = new Map<string, number>()
  rows.forEach((row) => counts.set(key(row), (counts.get(key(row)) ?? 0) + 1))
  return [...counts]
    .map(([label, value]) => ({ label, value }))
    .sort((a, b) => b.value - a.value || a.label.localeCompare(b.label, 'id-ID'))
}

/** CSV aman untuk spreadsheet: semua sel dikutip dan awalan rumus dinetralkan. */
export function toCsv(rows: Array<Array<string | number>>): string {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          const text = String(cell ?? '')
          const safe = typeof cell === 'string' && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text
          return `"${safe.replace(/"/g, '""')}"`
        })
        .join(','),
    )
    .join('\r\n')
}
