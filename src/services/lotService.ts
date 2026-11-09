import { supabase } from "./config/supabase";

/**
 * Satu baris tabel public.lots beserta relasi blocks dan customers.
 * Dipakai oleh halaman Kelola Kavling dan Detail Kavling Admin.
 */
export interface LotRecord {
  id: number;
  polygon_id: string;
  lot_number: string;
  block_id: number | null;
  dimension: string | null;
  area: number | string | null;
  cash_price: number | string | null;
  promo_price: number | string | null;
  status: string | null;
  payment_type: string | null;
  customer_id: number | null;
  booking_date: string | null;
  sold_date: string | null;
  color: string | null;
  description: string | null;
  panorama_url: string | null;
  panorama_boundary?: unknown;
  created_at?: string | null;
  updated_at?: string | null;
  block: Record<string, unknown> | null;
  customer: Record<string, unknown> | Record<string, unknown>[] | null;
}

export interface PaymentPlanRecord {
  id: number;
  plan_name: string;
  months: number;
  margin_percent: number | string | null;
}

export interface LotInstallmentRecord {
  id: number;
  lot_id: number;
  plan_id: number;
  monthly_payment: number | string | null;
  is_custom: boolean;
  plan: PaymentPlanRecord | PaymentPlanRecord[] | null;
}

export interface LotTransactionRecord {
  id: number;
  lot_id: number;
  customer_id: number;
  status: string;
  payment_type: string;
  price_at_booking: number | string;
  discount_amount: number | string | null;
  final_price: number | string;
  down_payment: number | string | null;
  plan_id: number | null;
  months: number | null;
  margin_percent: number | string | null;
  monthly_payment: number | string | null;
  booking_date: string | null;
  sold_date: string | null;
  cancelled_date: string | null;
  cancellation_reason: string | null;
  created_at: string;
  customer: Record<string, unknown> | Record<string, unknown>[] | null;
}

export interface LotPaymentRecord {
  id: number;
  customer_id: number | null;
  lot_id: number | null;
  payment_date: string | null;
  amount: number | string | null;
  payment_method: string | null;
  note: string | null;
  created_at: string;
}

function throwIfError<T>(data: T, error: { message: string } | null): T {
  if (error) throw error;
  return data;
}

export const lotService = {
  async getSoldCount() {
    const { count, error } = await supabase
      .from("lots")
      .select("*", { count: "exact", head: true })
      .in("status", ["Sold", "sold", "Terjual", "terjual"]);

    if (error) {
      console.error("Gagal mengambil jumlah kavling terjual:", error);
      return 0;
    }
    return count || 0;
  },

  async getTotalLotsCount() {
    const { count, error } = await supabase
      .from("lots")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Gagal mengambil total kavling:", error);
      return 0;
    }
    return count || 0;
  },

  async getLots(): Promise<LotRecord[]> {
    const { data, error } = await supabase
      .from("lots")
      .select("*, block:blocks(*), customer:customers!lots_customer_id_fkey(*)")
      .order("lot_number", { ascending: true });

    if (error) throw error;
    return (data ?? []) as unknown as LotRecord[];
  },

  async getLotById(id: number): Promise<LotRecord> {
    const { data, error } = await supabase
      .from("lots")
      .select("*, block:blocks(*), customer:customers!lots_customer_id_fkey(*)")
      .eq("id", id)
      .single();

    if (error) throw error;
    return data as unknown as LotRecord;
  },

  async getPaymentPlans(): Promise<PaymentPlanRecord[]> {
    const { data, error } = await supabase
      .from("payment_plans")
      .select("id, plan_name, months, margin_percent")
      .order("months", { ascending: true });

    if (error) throw error;
    return (data ?? []) as PaymentPlanRecord[];
  },

  async getLotInstallments(lotId: number): Promise<Array<{
    id: number;
    plan_id: number;
    monthly_payment: number | null;
    is_custom: boolean;
    plan_name: string;
    months: number;
    margin_percent: number;
  }>> {
    const { data, error } = await supabase
      .from("lot_installments")
      .select("id, lot_id, plan_id, monthly_payment, is_custom, plan:payment_plans(id, plan_name, months, margin_percent)")
      .eq("lot_id", lotId)
      .order("id", { ascending: true });

    if (error) throw error;

    return ((data ?? []) as unknown as LotInstallmentRecord[]).map((row) => {
      const plan = Array.isArray(row.plan) ? row.plan[0] : row.plan;
      return {
        id: row.id,
        plan_id: row.plan_id,
        monthly_payment: row.monthly_payment == null ? null : Number(row.monthly_payment),
        is_custom: row.is_custom,
        plan_name: plan?.plan_name ?? `Skema #${row.plan_id}`,
        months: Number(plan?.months ?? 0),
        margin_percent: Number(plan?.margin_percent ?? 0),
      };
    });
  },

  async getLotTransactions(lotId: number): Promise<Array<{
    id: number;
    status: string;
    payment_type: string;
    final_price: number;
    booking_date: string | null;
    customer_name: string | null;
  }>> {
    const { data, error } = await supabase
      .from("lot_transactions")
      .select("id, status, payment_type, final_price, booking_date, customer:customers(full_name)")
      .eq("lot_id", lotId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    return ((data ?? []) as unknown as Array<{
      id: number;
      status: string;
      payment_type: string;
      final_price: number | string;
      booking_date: string | null;
      customer: Record<string, unknown> | Record<string, unknown>[] | null;
    }>).map((row) => {
      const customer = Array.isArray(row.customer) ? row.customer[0] : row.customer;
      return {
        id: row.id,
        status: row.status,
        payment_type: row.payment_type,
        final_price: Number(row.final_price),
        booking_date: row.booking_date,
        customer_name: typeof customer?.full_name === "string" ? customer.full_name : null,
      };
    });
  },

  async getLotPayments(lotId: number): Promise<LotPaymentRecord[]> {
    const { data, error } = await supabase
      .from("payments")
      .select("id, customer_id, lot_id, payment_date, amount, payment_method, note, created_at")
      .eq("lot_id", lotId)
      .order("payment_date", { ascending: false });

    if (error) throw error;
    return (data ?? []) as LotPaymentRecord[];
  },
};
