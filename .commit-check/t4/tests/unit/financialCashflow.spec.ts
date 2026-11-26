import { describe, expect, test } from 'vitest'

import {
  cashflowCsvRows,
  currentMakassarDateTimeLocal,
  isoToMakassarDateTimeLocal,
  makassarDateTimeLocalToIso,
  monthlyCashflowTrend,
  monthlyTrendRange,
  postedCashflowForMonth,
  summarizeCashflow,
  type CashflowEntry,
} from '@/utils/financialCashflow'

const entry = (overrides: Partial<CashflowEntry> & Pick<CashflowEntry, 'id' | 'flow_direction' | 'source_table' | 'source_id' | 'occurred_on' | 'amount'>): CashflowEntry => ({
  category: 'Booking',
  bank_reference: null,
  status: 'posted',
  ...overrides,
})

describe('financial cashflow reports', () => {
  test('mempertahankan pemasukan bruto dan mengurangi refund penuh pada arus kas bersih', () => {
    const totals = summarizeCashflow([
      entry({ id: 1, flow_direction: 'inflow', source_table: 'payments', source_id: 1, occurred_on: '2026-11-19', amount: 1_000_000 }),
      entry({ id: 2, flow_direction: 'outflow', category: 'Booking Fee Refund', source_table: 'booking_fee_refunds', source_id: 1, occurred_on: '2026-11-19', amount: 1_000_000 }),
    ])

    expect(totals).toEqual({ grossIncome: 1_000_000, refundExpenses: 1_000_000, totalExpenses: 1_000_000, netCashFlow: 0 })
  })

  test('tidak menghitung refund pending karena belum menjadi transaksi kas posted', () => {
    const posted = [entry({ id: 1, flow_direction: 'inflow', source_table: 'payments', source_id: 1, occurred_on: '2026-11-19', amount: 1_000_000 })]
    expect(summarizeCashflow(posted).totalExpenses).toBe(0)
    expect(postedCashflowForMonth(posted, '2026-11')).toHaveLength(1)
  })

  test('mengabaikan transaksi ledger yang sudah reversed', () => {
    expect(summarizeCashflow([
      entry({ id: 1, flow_direction: 'outflow', source_table: 'booking_fee_refunds', source_id: 7, occurred_on: '2026-11-19', amount: 1_000_000, status: 'reversed' }),
    ])).toEqual({ grossIncome: 0, refundExpenses: 0, totalExpenses: 0, netCashFlow: 0 })
  })

  test('menolak sumber ledger ganda agar tidak menampilkan hitungan kas ganda', () => {
    const original = entry({ id: 1, flow_direction: 'inflow', source_table: 'payments', source_id: 1, occurred_on: '2026-11-19', amount: 1_000_000 })
    expect(() => summarizeCashflow([original, { ...original, id: 2 }])).toThrow('Sumber transaksi kas ganda')
  })

  test('menggunakan tanggal transaksi kas untuk filter bulanan dan tren', () => {
    const entries = [
      entry({ id: 1, flow_direction: 'inflow', source_table: 'payments', source_id: 1, occurred_on: '2026-10-31', amount: 1_000_000 }),
      entry({ id: 2, flow_direction: 'outflow', source_table: 'booking_fee_refunds', source_id: 1, occurred_on: '2026-11-01', amount: 1_000_000 }),
    ]
    expect(postedCashflowForMonth(entries, '2026-10').map((item) => item.id)).toEqual([1])
    expect(monthlyCashflowTrend(entries, '2026-11', 2).map(({ key, netCashFlow }) => [key, netCashFlow])).toEqual([
      ['2026-10', 1_000_000],
      ['2026-11', -1_000_000],
    ])
  })

  test('memfilter dan menyimpan waktu transfer refund dalam zona WITA', () => {
    const now = new Date('2026-11-21T00:00:00.000Z')
    const local = currentMakassarDateTimeLocal(now)
    expect(local).toBe('2026-11-21T08:00')
    expect(makassarDateTimeLocalToIso(local)).toBe(now.toISOString())
    expect(isoToMakassarDateTimeLocal('2026-11-20T16:00:00.000Z')).toBe('2026-11-21T00:00')
    expect(() => makassarDateTimeLocalToIso('2026-02-30T09:00')).toThrow('Tanggal dan waktu transfer tidak valid.')
    expect(monthlyTrendRange('2026-11', 7)).toEqual({ startDate: '2026-05-01', endDate: '2026-11-30' })
  })

  test('ekspor CSV mengikuti periode dan metrik cashflow yang sama', () => {
    const rows = cashflowCsvRows([
      entry({ id: 1, flow_direction: 'inflow', source_table: 'payments', source_id: 1, occurred_on: '2026-11-19', amount: 1_000_000 }),
      entry({ id: 2, flow_direction: 'outflow', category: 'Booking Fee Refund', source_table: 'booking_fee_refunds', source_id: 1, occurred_on: '2026-11-20', amount: 1_000_000 }),
      entry({ id: 3, flow_direction: 'inflow', source_table: 'payments', source_id: 2, occurred_on: '2026-12-01', amount: 500_000 }),
    ], '2026-11')
    expect(rows.slice(0, 5)).toEqual([
      ['Ringkasan', 'Nominal'],
      ['Pemasukan bruto', '1000000'],
      ['Pengeluaran refund', '1000000'],
      ['Total pengeluaran', '1000000'],
      ['Arus kas bersih', '0'],
    ])
    expect(rows.slice(7).map((row) => row[4])).toEqual(['1', '1'])
  })
})
