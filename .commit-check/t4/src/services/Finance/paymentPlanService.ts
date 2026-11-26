import { supabase } from '@/services/config/supabase'

export type PaymentPlanRecord = {
  id: number
  plan_name: string
  months: number
  margin_percent: number | null
  usage?: {
    lotInstallments: number
    lotTransactions: number
    customerInterests: number
  }
}

export type PaymentPlanPayload = {
  plan_name: string
  months: number
  margin_percent: number
}

const TABLE = 'payment_plans'

export type PaymentPlanDependencies = {
  lotInstallments: number
  lotTransactions: number
  customerInterests: number
}

function toCount(value: number | null): number {
  return Math.max(0, Number(value ?? 0))
}

async function getCount(table: string, planId: number): Promise<number> {
  const { count, error } = await supabase
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('plan_id', planId)

  if (error) throw error
  return toCount(count)
}

async function getDependencies(planId: number): Promise<PaymentPlanDependencies> {
  const [lotInstallments, lotTransactions, customerInterests] = await Promise.all([
    getCount('lot_installments', planId),
    getCount('lot_transactions', planId),
    getCount('customer_interests', planId),
  ])

  return { lotInstallments, lotTransactions, customerInterests }
}

export const paymentPlanService = {
  async getAll(): Promise<PaymentPlanRecord[]> {
    const { data, error } = await supabase
      .from(TABLE)
      .select('id, plan_name, months, margin_percent')
      .order('months', { ascending: true })
      .order('id', { ascending: true })

    if (error) throw error
    const plans = (data ?? []) as PaymentPlanRecord[]
    const usage = await Promise.all(plans.map(async (plan) => [plan.id, await getDependencies(plan.id)] as const))
    const usageByPlanId = new Map(usage)
    return plans.map((plan) => ({ ...plan, usage: usageByPlanId.get(plan.id) }))
  },

  async create(payload: PaymentPlanPayload): Promise<PaymentPlanRecord> {
    const { data, error } = await supabase
      .from(TABLE)
      .insert(payload)
      .select('id, plan_name, months, margin_percent')
      .single()

    if (error) throw error
    return data as PaymentPlanRecord
  },

  async update(
    id: number,
    payload: PaymentPlanPayload,
    previousMarginPercent: number,
  ): Promise<PaymentPlanRecord> {
    // Only include margin_percent when its value actually changes.
    // This avoids firing trg_sync_on_margin_change for edits to tenor/name only.
    const updatePayload: Partial<PaymentPlanPayload> = {
      plan_name: payload.plan_name,
      months: payload.months,
    }

    if (Number(previousMarginPercent) !== Number(payload.margin_percent)) {
      updatePayload.margin_percent = payload.margin_percent
    }

    const { data, error } = await supabase
      .from(TABLE)
      .update(updatePayload)
      .eq('id', id)
      .select('id, plan_name, months, margin_percent')
      .single()

    if (error) throw error
    return data as PaymentPlanRecord
  },

  async remove(id: number): Promise<void> {
    const dependencies = await getDependencies(id)
    if (dependencies.lotTransactions > 0) {
      const error = new Error('Skema cicilan masih digunakan oleh transaksi.')
      error.name = 'PaymentPlanInUseError'
      throw error
    }

    const { data, error } = await supabase
      .from(TABLE)
      .delete()
      .eq('id', id)
      .select('id')
      .maybeSingle()

    if (error) throw error
    if (!data) {
      const error = new Error('Skema tidak terhapus. Periksa izin DELETE dan pastikan skema masih tersedia.')
      error.name = 'PaymentPlanDeleteNotAppliedError'
      throw error
    }
  },

  async getDependencies(id: number): Promise<PaymentPlanDependencies> {
    return getDependencies(id)
  },
}
