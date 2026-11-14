import { supabase } from '@/services/config/supabase'

export type BankAccountRecord = {
  id: string
  bank_name: string
  account_number: string
  account_holder: string
  description: string | null
  is_active: boolean
  is_primary: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export type BankAccountPayload = Pick<
  BankAccountRecord,
  'bank_name' | 'account_number' | 'account_holder' | 'description' | 'is_active' | 'is_primary'
>

const TABLE = 'bank_accounts'

export const bankAccountService = {
  async getAdminBankAccounts(): Promise<BankAccountRecord[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .order('is_primary', { ascending: false })
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw error
    return (data ?? []) as BankAccountRecord[]
  },

  async getActiveBankAccounts(): Promise<BankAccountRecord[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, bank_name, account_number, account_holder, description, is_primary, sort_order')
      .eq('is_active', true)
      .order('is_primary', { ascending: false })
      .order('sort_order', { ascending: true })

    if (error) throw error
    return (data ?? []) as BankAccountRecord[]
  },

  async createBankAccount(payload: BankAccountPayload) {
    if (payload.is_primary) {
      const { error: clearError } = await supabase
        .from(TABLE)
        .update({ is_primary: false })
        .eq('is_primary', true)
      if (clearError) throw clearError
    }

    const { data, error } = await supabase
      .from(TABLE)
      .insert({
        ...payload,
        sort_order: 0,
        updated_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      })
      .select('*')
      .single()

    if (error) throw error
    return data as BankAccountRecord
  },

  async updateBankAccount(id: string, payload: BankAccountPayload) {
    if (payload.is_primary) {
      const { error: clearError } = await supabase
        .from(TABLE)
        .update({ is_primary: false })
        .eq('is_primary', true)
        .neq('id', id)
      if (clearError) throw clearError
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update({
        ...payload,
        updated_by: (await supabase.auth.getUser()).data.user?.id ?? null,
      })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw error
    return data as BankAccountRecord
  },

  async deleteBankAccount(id: string) {
    const { error } = await supabase.from(TABLE).delete().eq('id', id)
    if (error) throw error
  },
}
