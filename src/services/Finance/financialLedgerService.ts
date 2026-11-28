import { supabase } from '@/services/config/supabase'
import { loadPaymentInstallmentInfo } from '@/services/Finance/paymentInstallmentInfo'

export type FinancialLedgerEntry = {
  id: number
  flow_direction: 'inflow' | 'outflow'
  category: string
  amount: number
  currency: 'IDR'
  source_table: string
  source_id: number
  status: 'posted' | 'reversed'
  bank_reference: string | null
  occurred_on: string
  posted_at: string
  /** Nomor cicilan yang dilunasi pembayaran ini (hanya sumber payments). */
  installment_numbers?: number[]
  /** Total tenor transaksi, untuk penanda "dari N". */
  installment_total?: number | null
  journal: {
    date: string
    description: string
    lines: Array<{ accountCode: string; accountName: string; debit: number; credit: number }>
  } | null
}

/** Baris buku kas milik satu pembayaran. */
async function findPaymentLedgerId(paymentId: number): Promise<number | null> {
  const { data, error } = await supabase
    .from('financial_transactions')
    .select('id')
    .eq('source_table', 'payments')
    .eq('source_id', paymentId)
    .maybeSingle()
  if (error) throw new Error(`Catatan buku kas tidak dapat dibaca. ${error.message}`)
  return data ? Number(data.id) : null
}

export const financialLedgerService = {
  /** Reversal buku kas; database ikut menandai pembayarannya sebagai dibatalkan. */
  async reversePayment(paymentId: number, reason: string): Promise<void> {
    const trimmed = reason.trim()
    if (!trimmed) throw new Error('Alasan pembatalan wajib diisi.')
    const ledgerId = await findPaymentLedgerId(paymentId)
    if (ledgerId == null) throw new Error('Pembayaran ini belum tercatat di buku kas, jadi belum bisa dibatalkan.')
    const { error } = await supabase.rpc('reverse_financial_transaction', {
      p_transaction_id: ledgerId,
      p_reason: trimmed,
    })
    if (error) throw new Error(error.message)
  },

  /** Alasan tersimpan di keterangan jurnal reversal: "Reversal transaksi #N: alasan". */
  async getReversalReason(paymentId: number): Promise<string | null> {
    const ledgerId = await findPaymentLedgerId(paymentId)
    if (ledgerId == null) return null
    const { data, error } = await supabase
      .from('financial_transactions')
      .select('financial_journals(description)')
      .eq('reversal_of', ledgerId)
      .maybeSingle()
    if (error || !data) return null
    const journal = ([] as Array<{ description: string }>).concat((data as any).financial_journals ?? [])[0]
    return journal?.description.replace(/^Reversal transaksi #\d+: /, '') ?? null
  },

  async listRecent(limit = 200): Promise<FinancialLedgerEntry[]> {
    return fetchLedger((query) => query
      .order('occurred_on', { ascending: false })
      .order('id', { ascending: false })
      .limit(limit))
  },

  async listBetween(startDate: string, endDate: string): Promise<FinancialLedgerEntry[]> {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(startDate) || !/^\d{4}-\d{2}-\d{2}$/.test(endDate) || startDate > endDate) {
      throw new Error('Periode laporan tidak valid.')
    }
    // PostgREST membatasi 1000 baris per permintaan; ambil per halaman agar laporan tahunan tidak terpotong.
    const pageSize = 1000
    const all: FinancialLedgerEntry[] = []
    for (let from = 0; ; from += pageSize) {
      const page = await fetchLedger((query) => query
        .gte('occurred_on', startDate)
        .lte('occurred_on', endDate)
        .order('occurred_on', { ascending: false })
        .order('id', { ascending: false })
        .range(from, from + pageSize - 1))
      all.push(...page)
      if (page.length < pageSize) return all
    }
  },
}

async function fetchLedger(
  constrain: (query: any) => any,
): Promise<FinancialLedgerEntry[]> {
  const entries = await fetchLedgerRows(constrain)
  const paymentIds = [...new Set(entries.filter((entry) => entry.source_table === 'payments').map((entry) => entry.source_id))]
  if (!paymentIds.length) return entries
  const info = await loadPaymentInstallmentInfo(paymentIds)
  return entries.map((entry) => {
    const found = entry.source_table === 'payments' ? info.get(entry.source_id) : undefined
    return found ? { ...entry, installment_numbers: found.numbers, installment_total: found.total } : entry
  })
}

async function fetchLedgerRows(
  constrain: (query: any) => any,
): Promise<FinancialLedgerEntry[]> {
    const { data, error } = await constrain(supabase
      .from('financial_transactions')
      .select(`
        id, flow_direction, category, amount, currency, source_table, status,
        source_id, bank_reference, occurred_on, posted_at,
        financial_journals (
          journal_date, description,
          financial_journal_lines (
            debit, credit, account_code,
            financial_accounts (name)
          )
        )
      `)
      .eq('status', 'posted'))

    if (error) throw new Error(`Buku kas gagal dimuat. Jalankan migrasi SQL lalu coba lagi. ${error.message}`)

    return (data ?? []).map((row: any) => {
      const journal = Array.isArray(row.financial_journals)
        ? row.financial_journals[0]
        : row.financial_journals

      return {
        id: Number(row.id),
        flow_direction: row.flow_direction,
        category: row.category,
        amount: Number(row.amount),
        currency: row.currency,
        source_table: row.source_table,
        source_id: Number(row.source_id),
        status: row.status,
        bank_reference: row.bank_reference,
        occurred_on: row.occurred_on,
        posted_at: row.posted_at,
        journal: journal ? {
          date: journal.journal_date,
          description: journal.description,
          lines: (journal.financial_journal_lines ?? []).map((line: any) => ({
            accountCode: line.account_code,
            accountName: line.financial_accounts?.name ?? line.account_code,
            debit: Number(line.debit),
            credit: Number(line.credit),
          })),
        } : null,
      }
    })
}
