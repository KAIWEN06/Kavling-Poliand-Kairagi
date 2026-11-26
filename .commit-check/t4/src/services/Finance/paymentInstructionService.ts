import { supabase } from '@/services/config/supabase'

export type PaymentInstructionRecord = {
  id: string
  scope: 'global'
  title: string
  intro: string
  steps: unknown[]
  important_notes: string[]
  is_active: boolean
  updated_by: string | null
  created_at: string
  updated_at: string
}

export type PaymentInstructionPayload = {
  title: string
  intro: string
  steps: string[]
  important_notes: string[]
  is_active: boolean
}

const TABLE = 'payment_instructions'
const GLOBAL_SCOPE = 'global'

export const paymentInstructionService = {
  async getAdminInstruction(): Promise<PaymentInstructionRecord | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('scope', GLOBAL_SCOPE)
      .maybeSingle()

    if (error) throw error
    return (data ?? null) as PaymentInstructionRecord | null
  },

  async getActiveInstruction(): Promise<PaymentInstructionRecord | null> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('scope', GLOBAL_SCOPE)
      .eq('is_active', true)
      .maybeSingle()

    if (error) throw error
    return (data ?? null) as PaymentInstructionRecord | null
  },

  async saveAdminInstruction(payload: PaymentInstructionPayload): Promise<PaymentInstructionRecord> {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError

    const { data, error } = await supabase
      .from(TABLE)
      .upsert(
        {
          scope: GLOBAL_SCOPE,
          ...payload,
          updated_by: authData.user?.id ?? null,
        },
        { onConflict: 'scope' },
      )
      .select('*')
      .single()

    if (error) throw error
    return data as PaymentInstructionRecord
  },

  async deleteAdminInstruction(): Promise<void> {
    const { error } = await supabase
      .from(TABLE)
      .delete()
      .eq('scope', GLOBAL_SCOPE)

    if (error) throw error
  },
}
