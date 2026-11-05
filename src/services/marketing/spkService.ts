import { supabase } from '@/services/config/supabase'

export interface PaymentPlan {
  id: number
  plan_name: string
  months: number
  margin_percent: number | null
}

export interface LotInstallment {
  id: number
  lot_id: number
  plan_id: number
  monthly_payment: number | null
  is_custom: boolean
}

export interface Lot {
  id: number
  polygon_id: string
  lot_number: string
  block_id: number | null
  dimension: string | null
  area: number | null
  cash_price: number | null
  promo_price: number | null
  status: 'Available' | 'Booking' | 'Sold' | null
  payment_type: 'Cash' | 'Installment' | null
  customer_id: number | null
  booking_date: string | null
  sold_date: string | null
  color: string | null
  description: string | null
  created_at: string | null
  updated_at: string | null
  panorama_url: string | null
  panorama_boundary: unknown
}

export function formatLotNumber(lotNumber: string): string {
  return lotNumber.replace(/-/g, '_')
}


/**
 * Mengambil semua rencana pembayaran aktif dari
 * public.payment_plans.
 *
 * Tenor selalu berasal dari kolom `months`.
 * Tidak ada daftar tenor hard-coded di halaman.
 */
export async function getPaymentPlans(): Promise<PaymentPlan[]> {
  const { data, error } = await supabase
    .from('payment_plans')
    .select(
      'id, plan_name, months, margin_percent',
    )
    .order('months', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  return (data ?? []) as PaymentPlan[]
}


/**
 * Ambil kavling berdasarkan primary key.
 */
export async function getLotById(
  id: number,
): Promise<Lot | null> {
  const { data, error } = await supabase
    .from('lots')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as Lot | null
}


/**
 * Ambil kavling berdasarkan nomor kavling.
 */
export async function getLotByNumber(
  lotNumber: string,
): Promise<Lot | null> {
  const { data, error } = await supabase
    .from('lots')
    .select('*')
    .eq('lot_number', lotNumber)
    .maybeSingle()

  if (error) {
    throw error
  }

  return data as Lot | null
}


/**
 * Mengambil kavling yang tersedia untuk dipilih calon pembeli.
 */
export async function getAvailableLots(): Promise<Lot[]> {
  const { data, error } = await supabase
    .from('lots')
    .select('*')
    .eq('status', 'Available')
    .order('lot_number', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  return (data ?? []) as Lot[]
}


/**
 * Mengambil seluruh skema cicilan untuk satu kavling.
 * Nilai cicilan bulanan berasal dari public.lot_installments.
 */
export async function getLotInstallments(
  lotId: number,
): Promise<LotInstallment[]> {
  const { data, error } = await supabase
    .from('lot_installments')
    .select('id, lot_id, plan_id, monthly_payment, is_custom')
    .eq('lot_id', lotId)
    .order('plan_id', {
      ascending: true,
    })

  if (error) {
    throw error
  }

  return (data ?? []) as LotInstallment[]
}
