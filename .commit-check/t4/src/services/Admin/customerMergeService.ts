import { supabase } from '@/services/config/supabase'

export interface DuplicateCandidate {
  id_a: number
  id_b: number
  name_a: string
  name_b: string
  source_a: string
  source_b: string
  /** Alasan kecocokan dipisah koma, mis. "nomor sama, nama sama". */
  reasons: string
}

export interface CustomerSummary {
  id: number
  full_name: string
  phone: string | null
  whatsapp_phone: string | null
  email: string | null
  address: string | null
  registration_source: string
  user_id: string | null
  marketing_id: string | null
  marketing_name: string | null
  crm_status: string | null
  created_at: string | null
  spk_count: number
  payment_count: number
}

async function countRows(table: 'spk_requests' | 'payments', customerId: number): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('customer_id', customerId)
  if (error) throw error
  return count ?? 0
}

export const customerMergeService = {
  async listCandidates(): Promise<DuplicateCandidate[]> {
    const { data, error } = await supabase.rpc('list_duplicate_customer_candidates')
    if (error) throw error
    return (data ?? []) as DuplicateCandidate[]
  },

  /** Rincian dua data untuk dibandingkan sebelum digabung. */
  async getSummaries(ids: [number, number]): Promise<CustomerSummary[]> {
    const { data, error } = await supabase
      .from('customers')
      .select('id, full_name, phone, whatsapp_phone, email, address, registration_source, user_id, marketing_id, crm_status, created_at')
      .in('id', ids)
    if (error) throw error
    const rows = (data ?? []) as Omit<CustomerSummary, 'marketing_name' | 'spk_count' | 'payment_count'>[]

    const marketingIds = [...new Set(rows.map((row) => row.marketing_id).filter((id): id is string => !!id))]
    const names = new Map<string, string>()
    if (marketingIds.length) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', marketingIds)
      if (profileError) throw profileError
      for (const profile of profiles ?? []) names.set(profile.id as string, (profile.full_name as string) ?? '')
    }

    return Promise.all(
      rows.map(async (row) => ({
        ...row,
        marketing_name: row.marketing_id ? names.get(row.marketing_id) || null : null,
        spk_count: await countRows('spk_requests', row.id),
        payment_count: await countRows('payments', row.id),
      })),
    )
  },

  async merge(keepId: number, dropId: number, reason: string): Promise<void> {
    const { error } = await supabase.rpc('admin_merge_customers', {
      p_keep: keepId,
      p_drop: dropId,
      p_reason: reason.trim(),
    })
    if (error) throw error
  },
}
