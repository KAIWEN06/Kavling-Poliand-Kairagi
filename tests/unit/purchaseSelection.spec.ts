import { describe, expect, test } from 'vitest'
import type { PurchaseOverview } from '@/composables/useClientPurchaseOverview'
import type { ClientSpkRecord } from '@/services/clientSpkService'
import { buildPurchaseEntries, overdueSince } from '@/utils/purchaseSelection'

const NOW = new Date('2026-11-26T12:00:00').getTime()

function purchase(id: number, over: Partial<PurchaseOverview> = {}): PurchaseOverview {
  return {
    transactionId: id,
    lotId: id,
    lotLabel: `Kavling ${id}`,
    area: null,
    bookingDate: null,
    createdAt: `2026-01-${String(id).padStart(2, '0')}T00:00:00Z`,
    transactionStatus: 'Booking',
    paymentType: 'Installment',
    months: 12,
    finalPrice: 100,
    paidTotal: 0,
    pendingCount: 0,
    schedules: [],
    payments: [],
    ...over,
  }
}

function due(date: string, status = 'Unpaid') {
  return [{ id: 1, installmentNumber: 1, dueDate: date, amount: 10, status }]
}

function spk(id: number, lotId: number, transactionId: number | null, status = 'Approved') {
  return {
    id,
    transactionId,
    status,
    createdAt: '2026-02-01T00:00:00Z',
    lot: { id: lotId, name: `Blok ${lotId}` },
  } as ClientSpkRecord
}

const keys = (purchases: PurchaseOverview[], spks: ClientSpkRecord[] = []) =>
  buildPurchaseEntries(purchases, spks, NOW).map((entry) => entry.key)

describe('urutan pesanan di Beranda Pembeli', () => {
  test('terlambat, jatuh tempo terdekat, belum lunas, lalu lunas', () => {
    expect(keys([
      purchase(9, { paidTotal: 100 }),
      purchase(4, { paymentType: 'Cash' }),
      purchase(3, { schedules: due('2027-02-01') }),
      purchase(2, { schedules: due('2026-12-01') }),
      purchase(1, { schedules: due('2026-11-01') }),
    ])).toEqual(['tx-1', 'tx-2', 'tx-3', 'tx-4', 'tx-9'])
  })

  test('yang sama-sama lunas diurutkan dari yang terbaru', () => {
    expect(keys([purchase(1, { paidTotal: 100 }), purchase(2, { paidTotal: 100 })]))
      .toEqual(['tx-2', 'tx-1'])
  })

  test('pesanan lunas tidak dianggap terlambat', () => {
    const [entry] = buildPurchaseEntries(
      [purchase(1, { paidTotal: 100, schedules: due('2026-01-01') })], [], NOW,
    )
    expect(overdueSince(entry, NOW)).toBeNull()
  })

  test('cicilan jatuh tempo hari ini belum terlambat', () => {
    const [entry] = buildPurchaseEntries([purchase(1, { schedules: due('2026-11-26') })], [], NOW)
    expect(overdueSince(entry, NOW)).toBeNull()
  })

  test('SPK dipasangkan ke transaksinya sendiri', () => {
    const entries = buildPurchaseEntries([purchase(1), purchase(2)], [spk(7, 1, 1)], NOW)
    expect(entries.find((e) => e.key === 'tx-1')?.spk?.id).toBe(7)
    expect(entries.find((e) => e.key === 'tx-2')?.spk).toBeNull()
  })

  test('pengajuan tanpa transaksi tetap muncul, di atas pesanan lunas', () => {
    expect(keys([purchase(1, { paidTotal: 100 })], [spk(7, 22, null, 'Submitted')]))
      .toEqual(['spk-7', 'tx-1'])
  })

  test('SPK ditolak atau transaksinya dibatalkan tidak muncul', () => {
    expect(keys([], [spk(7, 1, null, 'Rejected'), spk(8, 2, 99)])).toEqual([])
  })
})
