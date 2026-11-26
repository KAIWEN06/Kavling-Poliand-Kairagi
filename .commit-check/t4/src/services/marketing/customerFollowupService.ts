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
    throw new Error('Sesi masuk tidak ditemukan.')
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
    throw new Error('Akun tidak memiliki akses pemasar.')
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

export interface FollowupInput {
  customer_id: number
  user_id: string
  followup_date: string
  method: string
  status: string
  notes: string | null
  next_followup_date: string | null
}

export const DUPLICATE_FOLLOWUP_MESSAGE =
  'Tindak lanjut dengan isi yang sama sudah tercatat. Ubah tanggal, metode, hasil, atau catatan bila ingin mencatat yang baru.'

/**
 * Tombol simpan bisa diklik berulang tanpa ada isi yang berubah.
 * Tolak insert bila baris identik untuk klien dan marketing yang sama sudah ada.
 */
export async function assertFollowupNotDuplicate(followup: FollowupInput) {
  let query = supabase
    .from('customer_followups')
    .select('id')
    .eq('customer_id', followup.customer_id)
    .eq('user_id', followup.user_id)
    .eq('followup_date', followup.followup_date)
    .eq('method', followup.method)
    .eq('status', followup.status)

  query = followup.notes === null ? query.is('notes', null) : query.eq('notes', followup.notes)
  query = followup.next_followup_date === null
    ? query.is('next_followup_date', null)
    : query.eq('next_followup_date', followup.next_followup_date)

  const { data, error } = await query.limit(1)
  if (error) throw error
  if (data?.length) throw new Error(DUPLICATE_FOLLOWUP_MESSAGE)
}

/** Unique index customer_followups_no_duplicate_uidx menolak insert kembar dengan kode 23505. */
export function isDuplicateFollowupError(error: unknown) {
  return (error as { code?: string } | null)?.code === '23505'
}

export async function createCustomerFollowup(followup: FollowupInput) {
  await assertFollowupNotDuplicate(followup)

  const { error } = await supabase
    .from('customer_followups')
    .insert(followup)

  if (error) {
    throw isDuplicateFollowupError(error) ? new Error(DUPLICATE_FOLLOWUP_MESSAGE) : error
  }
}
