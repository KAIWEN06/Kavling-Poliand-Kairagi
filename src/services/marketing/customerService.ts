import { supabase } from '@/services/config/supabase'

export interface Customer {
  id?: number
  full_name: string
  phone?: string | null
  whatsapp_phone?: string | null
  email?: string | null
  nik?: string | null
  address?: string | null
  notes?: string | null
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

export const customerService = {
  async getAdminCustomers() {
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
    return data ?? []
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

  async createCustomer(payload: CreateCustomerPayload) {
    const { data: customer, error: customerError } = await supabase
      .from('customers')
      .insert({
        full_name: payload.customer.full_name,
        phone: payload.customer.phone ?? null,
        email: payload.customer.email ?? null,
        nik: payload.customer.nik ?? null,
        address: payload.customer.address ?? null,
        notes: payload.customer.notes ?? null,
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

  async deleteCustomer(id: number) {
    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)

    if (error) throw error
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
