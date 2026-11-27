/**
 * Format dan aturan cicilan bersama.
 *
 * Satu sumber untuk penandaan nomor cicilan, ringkasan progres, dan
 * validasi urutan pilihan, supaya semua halaman menampilkan hal yang sama.
 */

export type ScheduleLike = {
  id?: number
  installment_number?: number
  installmentNumber?: number
  amount: number | string
  status: string
  pending_payment?: boolean
  pendingPayment?: boolean
}

const rupiahFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

export function formatRupiah(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0)
  return rupiahFormatter.format(Number.isFinite(amount) ? amount : 0).replace(/ /g, ' ')
}

/** Urutkan, buang duplikat, dan buang nilai yang bukan bilangan bulat positif. */
export function normalizeInstallmentNumbers(numbers: Array<number | null | undefined>): number[] {
  return [...new Set(numbers.map(Number).filter((n) => Number.isInteger(n) && n > 0))].sort((a, b) => a - b)
}

/** Pecah daftar nomor menjadi rentang berurutan, mis. [1,2,3,5] menjadi [[1,3],[5,5]]. */
function toRuns(numbers: number[]): Array<[number, number]> {
  const runs: Array<[number, number]> = []
  for (const n of numbers) {
    const last = runs[runs.length - 1]
    if (last && n === last[1] + 1) last[1] = n
    else runs.push([n, n])
  }
  return runs
}

/**
 * Penanda nomor cicilan yang ringkas.
 *  [2]       => "Cicilan ke-2 dari 12"
 *  [2,3]     => "Cicilan ke-2 s.d. ke-3 dari 12"
 *  [1,2,4]   => "Cicilan ke-1 s.d. ke-2, ke-4 dari 12"
 * Tanpa total tenor, bagian " dari N" dihilangkan.
 */
export function formatInstallmentRange(
  numbers: Array<number | null | undefined>,
  total?: number | null,
): string {
  const list = normalizeInstallmentNumbers(numbers)
  if (!list.length) return ''
  const parts = toRuns(list).map(([from, to]) =>
    from === to ? `ke-${from}` : `ke-${from} s.d. ke-${to}`,
  )
  const suffix = total && total > 0 ? ` dari ${total}` : ''
  return `Cicilan ${parts.join(', ')}${suffix}`
}

export type InstallmentProgress = {
  total: number
  paid: number
  pending: number
  remaining: number
  nextNumber: number | null
  paidAmount: number
  remainingAmount: number
  isComplete: boolean
}

function numberOf(schedule: ScheduleLike): number {
  return Number(schedule.installment_number ?? schedule.installmentNumber ?? 0)
}

function isPending(schedule: ScheduleLike): boolean {
  return Boolean(schedule.pending_payment ?? schedule.pendingPayment)
}

export function summarizeInstallmentProgress(schedules: ScheduleLike[]): InstallmentProgress {
  const sorted = [...schedules].sort((a, b) => numberOf(a) - numberOf(b))
  const paidList = sorted.filter((item) => item.status === 'Paid')
  const openList = sorted.filter((item) => item.status !== 'Paid')
  const pendingList = openList.filter(isPending)
  const next = openList.find((item) => !isPending(item))
  const sum = (items: ScheduleLike[]) => items.reduce((total, item) => total + Number(item.amount || 0), 0)

  return {
    total: sorted.length,
    paid: paidList.length,
    pending: pendingList.length,
    remaining: openList.length,
    nextNumber: next ? numberOf(next) : null,
    paidAmount: sum(paidList),
    remainingAmount: sum(openList),
    isComplete: sorted.length > 0 && openList.length === 0,
  }
}

/** "3 dari 12 lunas · sisa 9" */
export function formatProgressLine(progress: InstallmentProgress): string {
  if (!progress.total) return ''
  return `${progress.paid} dari ${progress.total} lunas · sisa ${progress.remaining}`
}

/**
 * Cicilan yang boleh dipilih harus berurutan dari cicilan aktif berikutnya.
 * Mengembalikan id yang berada di awal urutan aktif, tanpa lompatan.
 */
export function selectableSequence<T extends ScheduleLike & { id: number }>(
  schedules: T[],
): T[] {
  return [...schedules]
    .filter((item) => item.status !== 'Paid' && !isPending(item))
    .sort((a, b) => numberOf(a) - numberOf(b))
}

/**
 * Selama PPJB belum selesai (tanggal jadwal belum resmi): pembelian ber-uang
 * muka belum menerima cicilan, dan tanpa uang muka hanya cicilan pertama.
 * Harus sama dengan create_admin_payment_with_allocations di database.
 */
export function openBeforePpjb<T extends ScheduleLike>(
  sequence: T[],
  schedules: Array<{ due_date_official?: boolean }>,
  hasDownPayment: boolean,
): T[] {
  if (!schedules.some((item) => item.due_date_official === false)) return sequence
  return hasDownPayment ? [] : sequence.filter((item) => numberOf(item) === 1)
}

/**
 * Terapkan pilihan baru pada urutan cicilan.
 * Memilih cicilan ke-N otomatis memilih semua cicilan aktif sebelumnya;
 * melepas cicilan ke-N juga melepas semua cicilan setelahnya.
 */
export function nextSelection(
  sequence: Array<{ id: number }>,
  current: number[],
  toggledId: number,
): number[] {
  const index = sequence.findIndex((item) => item.id === toggledId)
  if (index < 0) return current
  const isSelected = current.includes(toggledId)
  const keepUntil = isSelected ? index : index + 1
  return sequence.slice(0, keepUntil).map((item) => item.id)
}

/** Pesan galat bila pilihan melompati urutan, atau null bila sah. */
export function validateSelectionOrder(
  sequence: Array<{ id: number }>,
  selectedIds: number[],
): string | null {
  if (!selectedIds.length) return null
  const picked = new Set(selectedIds)
  const lastIndex = Math.max(...sequence.map((item, i) => (picked.has(item.id) ? i : -1)))
  const skipped = sequence.slice(0, lastIndex + 1).some((item) => !picked.has(item.id))
  const unknown = selectedIds.some((id) => !sequence.some((item) => item.id === id))
  if (unknown) return 'Ada cicilan terpilih yang sudah lunas atau sedang diverifikasi.'
  if (skipped) return 'Cicilan harus dibayar berurutan, mulai dari cicilan aktif berikutnya.'
  return null
}
