import { supabase } from '@/services/config/supabase'

export const FOLLOWUP_METHODS = [
  'WhatsApp',
  'Telepon',
  'Email',
  'Kunjungan',
]

export const FOLLOWUP_STATUSES = [
  'Tertarik',
  'Negosiasi',
  'Tidak Tertarik',
  'Terjual',
]

export async function getCurrentMarketingUser() {
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError) {
    throw userError
  }

  if (!user) {
    throw new Error('Sesi login tidak ditemukan.')
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, role')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    throw profileError
  }

  if (!profile || profile.role !== 'marketing') {
    throw new Error('Akun tidak memiliki akses Marketing.')
  }

  return {
    user,
    profile,
  }
}

export async function getMarketingCustomers() {
  const { data, error } = await supabase
    .from('customers')
    .select('id, full_name, phone')
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function getCustomerInterestedLots(
  customerId: number,
) {
  const { data, error } = await supabase
    .from('customer_interests')
    .select(`
      id,
      lot_id,
      payment_type,
      lots (
        lot_number,
        area,
        dimension
      )
    `)
    .eq('customer_id', customerId)

  if (error) {
    throw error
  }

  return data ?? []
}

export async function getMarketingFollowups(userId: string) {
  const { data, error } = await supabase
    .from('customer_followups')
    .select(`
      id,
      followup_date,
      created_at,
      method,
      status,
      notes,
      customers (
        full_name
      )
    `)
    .eq('user_id', userId)
    .order('created_at', {
      ascending: false,
    })

  if (error) {
    throw error
  }

  return data ?? []
}

export async function createCustomerFollowup(
  followup: {
    customer_id: number
    user_id: string
    followup_date: string
    method: string
    status: string
    notes: string | null
    next_followup_date: string | null
  },
) {
  const { error } = await supabase
    .from('customer_followups')
    .insert(followup)

  if (error) {
    throw error
  }
}
