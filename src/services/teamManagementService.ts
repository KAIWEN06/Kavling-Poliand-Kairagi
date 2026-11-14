import { supabase } from '@/services/config/supabase'

export type TeamRole = 'owner' | 'admin' | 'marketing'
export type MarketingPeriod = '30d' | '90d' | '180d' | 'all'

export interface TeamMember {
  id: string
  full_name: string | null
  email: string | null
  role: TeamRole
  phone: string | null
  whatsapp_phone: string | null
  address: string | null
  employee_code: string | null
  photo_url: string | null
  join_date: string | null
  is_active: boolean
  created_at: string
  auth_status?: 'available' | 'unavailable'
}

export interface CreateTeamMemberInput {
  role: TeamRole
  fullName: string
  email: string
  phone?: string
  whatsappPhone?: string
  address?: string
  employeeCode?: string
  joinDate?: string
  password: string
}

export interface MarketingSummary {
  marketing_id: string
  total_clients: number
  sold_clients: number
  sold_lots: number
  sales_value: number
  booking_transactions: number
  pending_commission: number
  paid_commission: number
}

export interface MarketingClient {
  id: number
  full_name: string
  phone: string | null
  email: string | null
  address: string | null
  created_at: string
  transactions: Array<{
    id: number
    lot_id: number
    lot_number: string | null
    status: string
    payment_type: string
    final_price: number
    booking_date: string | null
    sold_date: string | null
  }>
}

export interface MarketingCommission {
  id: number
  transaction_id: number
  commission_type: 'Booking Fee' | 'Sales'
  base_amount: number
  commission_rate: number | null
  commission_amount: number
  status: 'Pending' | 'Eligible' | 'Processing' | 'Paid' | 'Cancelled'
  paid_at: string | null
  created_at: string
  customer_name: string | null
  lot_number: string | null
}

export interface MarketingDetail {
  member: TeamMember
  period: MarketingPeriod
  metrics: {
    total_clients: number
    new_clients: number
    sold_clients: number
    sold_lots: number
    sales_value: number
    booking_transactions: number
    cancelled_transactions: number
    conversion_rate: number
    total_commission: number
    pending_commission: number
    paid_commission: number
  }
  clients: MarketingClient[]
  commissions: MarketingCommission[]
}

async function invoke<T>(
  action: string,
  payload: Record<string, unknown> = {},
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('manage-team-user', {
    body: { action, ...payload },
  })

  if (error) {
    // Supabase FunctionsHttpError may carry the useful JSON response in its context.
    const context = (error as { context?: Response }).context
    if (context && typeof context.json === 'function') {
      try {
        const body = await context.json() as { error?: string }
        if (body?.error) throw new Error(body.error)
      } catch (cause) {
        if (cause instanceof Error && cause.message !== 'Unexpected end of JSON input') {
          throw cause
        }
      }
    }
    throw new Error(error.message || 'Gagal menghubungi server.')
  }

  if (!data) throw new Error('Server tidak memberikan respons.')
  if (data.error) throw new Error(String(data.error))
  return data as T
}

export const teamManagementService = {
  async list(): Promise<TeamMember[]> {
    const response = await invoke<{ members: TeamMember[] }>('list')
    return response.members || []
  },

  async create(input: CreateTeamMemberInput) {
    return invoke<{ member: TeamMember }>('create', {
      role: input.role,
      full_name: input.fullName,
      email: input.email,
      phone: input.phone,
      whatsapp_phone: input.whatsappPhone,
      address: input.address,
      employee_code: input.employeeCode,
      join_date: input.joinDate,
      password: input.password,
    })
  },

  async update(id: string, payload: {
    full_name: string
    phone: string | null
    whatsapp_phone: string | null
    address: string | null
    join_date: string | null
  }) {
    return invoke<{ member: TeamMember }>('update', { id, ...payload })
  },

  async setActive(id: string, active: boolean) {
    return invoke<{ member: TeamMember }>(active ? 'reactivate' : 'deactivate', { id })
  },

  async getMarketingOverview(period: MarketingPeriod = 'all') {
    const response = await invoke<{ summaries: MarketingSummary[] }>(
      'marketing_overview',
      { period },
    )
    return response.summaries || []
  },

  async getMarketingDetail(id: string, period: MarketingPeriod = 'all') {
    return invoke<MarketingDetail>('marketing_detail', { id, period })
  },
}
