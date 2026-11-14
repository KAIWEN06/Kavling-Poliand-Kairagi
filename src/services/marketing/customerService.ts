import { supabase } from '@/services/config/supabase'
import type { FinanceCustomerRecord } from '@/types/finance'

export interface Customer {
  id?: number
  full_name: string
  phone?: string | null
  whatsapp_phone?: string | null
  email?: string | null
  nik?: string | null
  address?: string | null
  notes?: string | null
  marketing_id?: string | null
  created_at?: string
  updated_at?: string
}

export interface CustomerInterest {
  id?: number
  customer_id: number
  lot_id: number
  payment_type: 'Cash' | 'Installment'
  plan_id?: number | null
  notes?: string | null
  created_at?: string
}

export interface CreateCustomerPayload {
  customer: Customer
  interests: Array<{
    lot_id: number
    payment_type: 'Cash' | 'Installment'
    plan_id?: number | null
    notes?: string | null
  }>
}

export interface CustomerUsage {
  label: string
  count: number
}

/**
 * Semua relasi dan riwayat menjadi penghalang penghapusan pembeli.
 * Data terkait tidak dihapus otomatis agar histori tetap utuh.
 */
async function getCustomerUsage(customerId: number): Promise<CustomerUsage[]> {
  const [
    { count: interestCount, error: interestsError },
    { count: transactionCount, error: transactionsError },
    { count: paymentCount, error: paymentsError },
    { count: noteCount, error: notesError },
    { count: followupCount, error: followupsError },
    { count: lotCount, error: lotsError },
    { count: noteHistoryCount, error: noteHistoriesError },
  ] = await Promise.all([
    supabase.from('customer_interests').select('id', { count: 'exact', head: true }).eq('customer_id', customerId),
    supabase.from('lot_transactions').select('id', { count: 'exact', head: true }).eq('customer_id', customerId),
    supabase.from('payments').select('id', { count: 'exact', head: true }).eq('customer_id', customerId),
    supabase.from('customer_notes').select('id', { count: 'exact', head: true }).eq('customer_id', customerId),
    supabase.from('customer_followups').select('id', { count: 'exact', head: true }).eq('customer_id', customerId),
    supabase.from('lots').select('id', { count: 'exact', head: true }).eq('customer_id', customerId),
    supabase.from('customer_note_histories').select('id', { count: 'exact', head: true }).eq('customer_id', customerId),
  ])

  const error = [
    interestsError,
    transactionsError,
    paymentsError,
    notesError,
    followupsError,
    lotsError,
    noteHistoriesError,
  ].find(Boolean)
  if (error) throw error

  return [
    { label: 'Minat kavling', count: interestCount ?? 0 },
    { label: 'Transaksi', count: transactionCount ?? 0 },
    { label: 'Pembayaran', count: paymentCount ?? 0 },
    { label: 'Catatan', count: noteCount ?? 0 },
    { label: 'Riwayat catatan', count: noteHistoryCount ?? 0 },
    { label: 'Riwayat tindak lanjut', count: followupCount ?? 0 },
    { label: 'Kavling yang terhubung', count: lotCount ?? 0 },
  ].filter((usage) => usage.count > 0)
}

export const customerService = {
  async getAdminCustomers(): Promise<FinanceCustomerRecord[]> {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        id,
        full_name,
        phone,
        whatsapp_phone,
        email,
        address,
        notes,
        created_at,
        marketing_id,
        marketing:profiles!customers_marketing_id_fkey (id, full_name, role),
        payments (
          id,
          transaction_id,
          lot_id,
          customer_id,
          amount,
          payment_date,
          payment_method,
          payment_category,
          status,
          note,
          created_at
        ),
        customer_notes (id, note, created_at),
        customer_interests (
          id,
          lot_id,
          payment_type,
          plan_id,
          notes,
          created_at,
          payment_plans (id, plan_name, months),
          lots (
            id,
            lot_number,
            polygon_id,
            block_id,
            dimension,
            area,
            status,
            cash_price,
            promo_price,
            blocks (id, code, name)
          )
        ),
        lot_transactions (
          id,
          lot_id,
          status,
          payment_type,
          price_at_booking,
          discount_amount,
          final_price,
          down_payment,
          booking_fee,
          principal_amount,
          margin_amount,
          installment_total,
          margin_percent,
          monthly_payment,
          months,
          installment_start_date,
          booking_date,
          sold_date,
          cancelled_date,
          created_at,
          updated_at,
          payment_plans (id, plan_name, months),
          lots (
            id,
            lot_number,
            polygon_id,
            block_id,
            blocks (id, code, name)
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return (data ?? []) as unknown as FinanceCustomerRecord[]
  },

  async getCustomers() {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        customer_interests (
          id,
          lot_id,
          payment_type,
          plan_id,
          notes,
          created_at,
          lots (
            id,
            lot_number,
            polygon_id,
            status,
            dimension,
            area,
            cash_price,
            promo_price,
            block_id
          ),
          payment_plans (
            id,
            plan_name,
            months,
            margin_percent
          )
        )
      `)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async getCustomerById(id: number) {
    const { data, error } = await supabase
      .from('customers')
      .select(`
        *,
        customer_interests (
          id,
          lot_id,
          payment_type,
          plan_id,
          notes,
          created_at,
          lots (
            id,
            lot_number,
            polygon_id,
            status,
            dimension,
            area,
            cash_price,
            promo_price,
            block_id
          ),
          payment_plans (
            id,
            plan_name,
            months,
            margin_percent
          )
        )
      `)
      .eq('id', id)
      .single()

    if (error) throw error
    return data
  },

  async getMarketingOptions() {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'marketing')
      .order('full_name', { ascending: true })

    if (error) throw error
    return data ?? []
  },

  async createCustomer(payload: CreateCustomerPayload) {
    // Tentukan sumber marketing dari akun yang sedang login.
    // Marketing selalu dikaitkan ke profilnya sendiri; Admin boleh memilih marketing.
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) throw userError
    if (!user) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.')

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) throw profileError
    if (!profile) throw new Error('Profil pengguna tidak ditemukan.')

    let marketingId: string | null = null

    if (profile.role === 'marketing') {
      // Jangan izinkan Marketing mengatribusikan pembeli ke akun Marketing lain.
      marketingId = profile.id
    } else if (profile.role === 'admin') {
      marketingId = payload.customer.marketing_id ?? null

      if (marketingId) {
        const { data: selectedMarketing, error: marketingError } = await supabase
          .from('profiles')
          .select('id')
          .eq('id', marketingId)
          .eq('role', 'marketing')
          .maybeSingle()

        if (marketingError) throw marketingError
        if (!selectedMarketing) {
          throw new Error('Marketing yang dipilih tidak ditemukan atau bukan akun Marketing.')
        }
      }
    } else {
      throw new Error('Role akun tidak memiliki izin untuk menambahkan pembeli.')
    }

    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        full_name: payload.customer.full_name,
        phone: payload.customer.phone ?? null,
        email: payload.customer.email ?? null,
        nik: payload.customer.nik ?? null,
        address: payload.customer.address ?? null,
        notes: payload.customer.notes ?? null,
        marketing_id: marketingId,
      })
      .select()
      .single()

    if (customerError) throw customerError

    if (payload.interests.length > 0) {
      const interests = payload.interests.map((interest) => ({
        customer_id: customer.id,
        lot_id: interest.lot_id,
        payment_type: interest.payment_type,
        plan_id: interest.plan_id ?? null,
        notes: interest.notes ?? null,
      }))

      const { error: interestError } = await supabase
        .from('customer_interests')
        .insert(interests)

      if (interestError) {
        await supabase.from('customers').delete().eq('id', customer.id)
        throw interestError
      }
    }

    return customer
  },

  async updateCustomer(id: number, customer: Partial<Customer>) {
    const { data, error } = await supabase
      .from('customers')
      .update({
        full_name: customer.full_name,
        phone: customer.phone ?? null,
        email: customer.email ?? null,
        nik: customer.nik ?? null,
        address: customer.address ?? null,
        notes: customer.notes ?? null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async getCustomerUsage(id: number) {
    return getCustomerUsage(id)
  },

  async deleteCustomer(id: number) {
    // Periksa ulang tepat sebelum DELETE agar tidak hanya bergantung pada modal UI.
    const usage = await getCustomerUsage(id)
    if (usage.length > 0) {
      const usageSummary = usage.map(({ label, count }) => `${label} (${count})`).join(', ')
      throw new Error(
        `Pembeli tidak dapat dihapus karena masih memiliki data atau riwayat terkait: ${usageSummary}. Data tersebut harus tetap dipertahankan.`,
      )
    }

    // Tidak ada relasi yang dibersihkan otomatis. Jika ada relasi yang belum
    // tercakup pemeriksaan ini, foreign key database tetap menjadi perlindungan.
    const { data, error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      throw new Error('Data pembeli tidak terhapus. Periksa izin DELETE dan pastikan data masih tersedia.')
    }
  },

  async getAvailableLots() {
    const { data, error } = await supabase
      .from('lots')
      .select(`
        id,
        lot_number,
        polygon_id,
        status,
        dimension,
        area,
        cash_price,
        promo_price,
        block_id,
        blocks (
          id,
          code,
          name
        )
      `)
      .eq('status', 'Available')
      .order('lot_number', { ascending: true })

    if (error) throw error
    return data
  },

  async getPaymentPlans() {
    const { data, error } = await supabase
      .from('payment_plans')
      .select('id, plan_name, months, margin_percent')
      .order('months', { ascending: true })

    if (error) throw error
    return data
  },

  async getCustomerInterests(customerId: number) {
    const { data, error } = await supabase
      .from('customer_interests')
      .select(`
        *,
        lots (
          id,
          lot_number,
          polygon_id,
          status,
          dimension,
          area,
          cash_price,
          promo_price
        ),
        payment_plans (
          id,
          plan_name,
          months,
          margin_percent
        )
      `)
      .eq('customer_id', customerId)
      .order('created_at', { ascending: false })

    if (error) throw error
    return data
  },

  async addInterest(interest: Omit<CustomerInterest, 'id' | 'created_at'>) {
    const { data, error } = await supabase
      .from('customer_interests')
      .insert(interest)
      .select()
      .single()

    if (error) throw error
    return data
  },

  async removeInterest(id: number) {
    const { data: interest, error: interestError } = await supabase
      .from('customer_interests')
      .select('id, customer_id, lot_id')
      .eq('id', id)
      .maybeSingle()

    if (interestError) throw interestError
    if (!interest) throw new Error('Data minat tidak ditemukan atau sudah dihapus.')

    const [
      { count: transactionCount, error: transactionError },
      { count: paymentCount, error: paymentError },
    ] = await Promise.all([
      supabase
        .from('lot_transactions')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', interest.customer_id)
        .eq('lot_id', interest.lot_id),
      supabase
        .from('payments')
        .select('id', { count: 'exact', head: true })
        .eq('customer_id', interest.customer_id)
        .eq('lot_id', interest.lot_id),
    ])

    if (transactionError) throw transactionError
    if (paymentError) throw paymentError

    if ((transactionCount ?? 0) > 0 || (paymentCount ?? 0) > 0) {
      throw new Error('Minat kavling tidak dapat dihapus karena sudah terhubung dengan transaksi atau pembayaran. Riwayat tersebut harus tetap dipertahankan.')
    }

    const { error } = await supabase
      .from('customer_interests')
      .delete()
      .eq('id', id)

    if (error) throw error
  },
}

export async function createProspectiveCustomer(
  payload: CreateCustomerPayload,
) {
  return customerService.createCustomer(payload)
}

export async function getAvailableLots() {
  return customerService.getAvailableLots()
}

export async function getPaymentPlans() {
  return customerService.getPaymentPlans()
}

export async function getCurrentMarketingProfile() {
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
