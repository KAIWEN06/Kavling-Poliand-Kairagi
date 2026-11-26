/**
 * Daftar pesanan di Beranda Pembeli dan urutan pilihan awalnya:
 * cicilan terlambat, jatuh tempo terdekat, belum lunas, lalu yang terbaru.
 */
import type { PurchaseOverview } from '@/composables/useClientPurchaseOverview'
import type { ClientSpkRecord } from '@/services/clientSpkService'

const ACTIVE_SPK_STATUSES = ['Submitted', 'Under Review', 'Approved']

export interface PurchaseEntry {
  key: string
  lotId: number
  lotLabel: string
  createdAt: string
  /** null: pengajuan SPK yang belum punya transaksi. */
  purchase: PurchaseOverview | null
  spk: ClientSpkRecord | null
}

export function isOverdue(
  schedule: { dueDate: string | null; status: string } | null,
  now = Date.now(),
) {
  if (!schedule || schedule.status === 'Paid') return false
  if (schedule.status === 'Overdue') return true
  if (!schedule.dueDate) return false
  return new Date(`${schedule.dueDate.slice(0, 10)}T23:59:59`).getTime() < now
}

export function isPaidOff(purchase: PurchaseOverview) {
  return purchase.finalPrice > 0 && purchase.paidTotal >= purchase.finalPrice
}

/** Tanggal jatuh tempo paling awal di antara cicilan yang terlambat. */
export function overdueSince(entry: PurchaseEntry, now = Date.now()) {
  if (!entry.purchase || isPaidOff(entry.purchase)) return null
  const late = entry.purchase.schedules.filter((s) => isOverdue(s, now))
  if (!late.length) return null
  return late.map((s) => s.dueDate ?? '').sort()[0]
}

export function nextDueDate(entry: PurchaseEntry) {
  if (!entry.purchase || isPaidOff(entry.purchase)) return null
  const dates = entry.purchase.schedules
    .filter((s) => s.status !== 'Paid' && s.dueDate)
    .map((s) => s.dueDate as string)
    .sort()
  return dates[0] ?? null
}

function rank(entry: PurchaseEntry, now: number): [number, string] {
  const late = overdueSince(entry, now)
  if (late !== null) return [0, late]
  const due = nextDueDate(entry)
  if (due !== null) return [1, due]
  return [entry.purchase && isPaidOff(entry.purchase) ? 3 : 2, '']
}

export function buildPurchaseEntries(
  purchases: PurchaseOverview[],
  spks: ClientSpkRecord[],
  now = Date.now(),
): PurchaseEntry[] {
  const activeSpks = spks.filter((spk) => ACTIVE_SPK_STATUSES.includes(spk.status))
  const used = new Set<number>()

  const entries: PurchaseEntry[] = purchases.map((purchase) => {
    // Daftar SPK sudah diurutkan dari yang terbaru.
    const spk = activeSpks.find((item) => !used.has(item.id) && (
      item.transactionId === purchase.transactionId
      || (item.transactionId === null && item.lot.id === purchase.lotId)
    )) ?? null
    if (spk) used.add(spk.id)
    return {
      key: `tx-${purchase.transactionId}`,
      lotId: purchase.lotId,
      lotLabel: purchase.lotLabel,
      createdAt: purchase.createdAt,
      purchase,
      spk,
    }
  })

  for (const spk of activeSpks) {
    // SPK yang menunjuk transaksi di luar daftar berarti transaksinya sudah dibatalkan.
    if (used.has(spk.id) || spk.transactionId !== null) continue
    if (entries.some((entry) => entry.lotId === spk.lot.id)) continue
    entries.push({
      key: `spk-${spk.id}`,
      lotId: spk.lot.id,
      lotLabel: spk.lot.name,
      createdAt: spk.createdAt,
      purchase: null,
      spk,
    })
  }

  return entries.sort((a, b) => {
    const [tierA, dateA] = rank(a, now)
    const [tierB, dateB] = rank(b, now)
    return tierA - tierB
      || dateA.localeCompare(dateB)
      || Date.parse(b.createdAt) - Date.parse(a.createdAt)
  })
}
