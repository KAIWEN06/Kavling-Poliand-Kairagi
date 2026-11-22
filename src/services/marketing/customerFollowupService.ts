import { supabase } from '@/services/config/supabase'

// Harus sama dengan CHECK constraint customer_followups.method / .status di database.
// Nilai lama 'Kunjungan' dan 'Terjual' ditolak database sehingga simpan follow-up selalu gagal.
export const FOLLOWUP_METHODS = [
  'WhatsApp',
  'Telepon',
  'Pertemuan',
  'Email',
  'Lainnya',
]

export const FOLLOWUP_STATUSES = [
  'Follow Up',
  'Tertarik',
  'Negosiasi',
  'Menunggu',
  'Tidak Tertarik',
  'Selesai',
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

  if (!profile || (profile.role !== 'marketing' && profile.role !== 'marketing_head')) {
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
    // RLS membatasi baris ke client milik Marketing yang login.
    .select('id, full_name, phone, whatsapp_phone, crm_status')
    .not('marketing_id', 'is', null)
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
