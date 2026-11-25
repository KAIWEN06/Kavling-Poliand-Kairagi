import { supabase } from '@/services/config/supabase'

export type PaymentInstallmentInfo = {
  /** Nomor cicilan yang dilunasi pembayaran ini, urut naik. */
  numbers: number[]
  /** Total tenor transaksi, untuk penanda "dari N". */
  total: number | null
}

const CHUNK_SIZE = 150

/**
 * Ambil nomor cicilan per pembayaran. Dipakai semua halaman riwayat
 * (laporan keuangan, buku kas, monitor marketing) supaya penandaannya sama.
 * Penanda cicilan hanya pelengkap: bila gagal dimuat, daftar tetap tampil.
 */
export async function loadPaymentInstallmentInfo(
  paymentIds: number[],
): Promise<Map<number, PaymentInstallmentInfo>> {
  const result = new Map<number, PaymentInstallmentInfo>()
  const ids = [...new Set(paymentIds.filter((id) => Number.isInteger(id) && id > 0))]
  const transactionByPayment = new Map<number, number>()

  for (let from = 0; from < ids.length; from += CHUNK_SIZE) {
    const { data, error } = await supabase
      .from('payments')
      .select('id, transaction_id, payment_allocations(installment_schedules(installment_number))')
      .in('id', ids.slice(from, from + CHUNK_SIZE))
    if (error) {
      console.warn('[Cicilan] Nomor cicilan pembayaran gagal dimuat:', error.message)
      return result
    }
    for (const row of (data ?? []) as any[]) {
      const numbers = (row.payment_allocations ?? [])
        .map((item: any) => {
          const schedule = Array.isArray(item.installment_schedules) ? item.installment_schedules[0] : item.installment_schedules
          return Number(schedule?.installment_number)
        })
        .filter((n: number) => Number.isInteger(n) && n > 0)
        .sort((a: number, b: number) => a - b)
      if (!numbers.length) continue
      result.set(Number(row.id), { numbers, total: null })
      if (row.transaction_id != null) transactionByPayment.set(Number(row.id), Number(row.transaction_id))
    }
  }

  const transactionIds = [...new Set(transactionByPayment.values())]
  const monthsByTransaction = new Map<number, number>()
  for (let from = 0; from < transactionIds.length; from += CHUNK_SIZE) {
    const { data, error } = await supabase
      .from('lot_transactions')
      .select('id, months')
      .in('id', transactionIds.slice(from, from + CHUNK_SIZE))
    if (error) break
    for (const row of (data ?? []) as any[]) {
      if (row.months != null) monthsByTransaction.set(Number(row.id), Number(row.months))
    }
  }

  for (const [paymentId, transactionId] of transactionByPayment) {
    const info = result.get(paymentId)
    if (info) info.total = monthsByTransaction.get(transactionId) ?? null
  }
  return result
}
