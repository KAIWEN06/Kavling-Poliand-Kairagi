import { describe, expect, it } from 'vitest'
import { availableYears, blockInventory, buildPayments, buildSales, countBy, monthlySeries, periodOfYear, summarizeSales } from '@/utils/ownerReport'
import type { FinanceCustomerRecord } from '@/types/finance'

const customer = {
  id: 1,
  full_name: 'Budi',
  phone: null,
  whatsapp_phone: null,
  created_at: '2026-01-01T00:00:00Z',
  marketing: null,
  lot_transactions: [
    { id: 10, lot_id: 5, status: 'Booking', payment_type: 'Installment', final_price: 100, booking_date: '2026-02-03' },
    { id: 11, lot_id: 6, status: 'Cancelled', payment_type: 'Cash', final_price: 999, booking_date: '2026-02-04' },
  ],
  payments: [
    { id: 1, transaction_id: 10, spk_request_id: null, lot_id: 5, amount: 10, status: 'Confirmed', payment_category: 'Booking', created_at: '2026-02-03T00:00:00Z' },
    { id: 2, transaction_id: 10, spk_request_id: null, lot_id: 5, amount: 30, status: 'Confirmed', payment_category: 'Down Payment', created_at: '2026-02-05T00:00:00Z' },
    { id: 3, transaction_id: 10, spk_request_id: null, lot_id: 5, amount: 20, status: 'Pending', payment_category: 'Installment', created_at: '2026-12-31T20:00:00Z' },
  ],
} as unknown as FinanceCustomerRecord

describe('ownerReport', () => {
  it('menghitung penjualan tanpa pemasar dan mengabaikan yang dibatalkan', () => {
    const sales = buildSales([customer])
    expect(sales).toHaveLength(1)
    // Booking fee dan pembayaran yang belum dikonfirmasi tidak mengurangi pokok.
    expect(summarizeSales(sales)).toEqual({ units: 1, booked: 1, paidOff: 0, contractValue: 100, remaining: 70 })
  })

  it('mengelompokkan tanggal pembayaran menurut zona Makassar', () => {
    expect(buildPayments([customer]).find((payment) => payment.id === 3)?.date).toBe('2027-01-01')
  })

  it('menyusun deret bulanan, tahun, dan hitungan per kelompok', () => {
    const sales = buildSales([customer])
    expect(monthlySeries(sales, 2026)[1]).toEqual({ label: 'Feb', value: 1 })
    expect(availableYears(sales, 2027)).toEqual([2027, 2026])
    expect(countBy(['b', 'a', 'b'], (value) => value)).toEqual([{ label: 'b', value: 2 }, { label: 'a', value: 1 }])
  })

  it('menghitung stok per blok dan mengurutkan nama blok secara alami', () => {
    const rows = [
      { block: 'B10', status: 'sold' },
      { block: 'B2', status: 'available' },
      { block: 'B2', status: 'booking' },
      { block: 'B2', status: 'lainnya' },
    ]
    expect(blockInventory(rows)).toEqual([
      { block: 'B2', available: 1, booking: 1, sold: 0, total: 3 },
      { block: 'B10', available: 0, booking: 0, sold: 1, total: 1 },
    ])
  })

  it('membuat rentang tahun dan bulan dengan tanggal akhir yang sah', () => {
    expect(periodOfYear(2026)).toEqual({ from: '2026-01-01', to: '2026-12-31' })
    expect(periodOfYear(2028, 2)).toEqual({ from: '2028-02-01', to: '2028-02-29' })
    expect(periodOfYear(2026, 4).to).toBe('2026-04-30')
  })
})
