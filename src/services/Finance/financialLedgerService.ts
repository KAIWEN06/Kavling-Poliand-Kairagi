import { supabase } from '@/services/config/supabase'

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
  journal: {
    date: string
    description: string
    lines: Array<{ accountCode: string; accountName: string; debit: number; credit: number }>
  } | null
}

export const financialLedgerService = {
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
