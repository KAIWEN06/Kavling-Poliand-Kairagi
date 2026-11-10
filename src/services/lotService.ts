import { supabase } from "./config/supabase";

/** Biaya booking tetap PoliLand untuk setiap transaksi. */
export const BOOKING_FEE_FIXED = 1_000_000;
import {
  calculateInstallment,
  summarizeTransactionPayments,
  type InstallmentCalculation,
  type PaymentCategory,
} from "./payment/paymentCalculator";

/**
 * Tipe data untuk tabel lots.
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
  payment_type: "Cash" | "Installment" | string;
  price_at_booking: number | string;
  discount_amount: number | string | null;
  final_price: number | string;
  down_payment: number | string | null;
  booking_fee: number | string | null;
  principal_amount: number | string | null;
  margin_amount: number | string | null;
  installment_total: number | string | null;
  installment_start_date: string | null;
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
  transaction_id: number;
  customer_id: number | null;
  lot_id: number | null;
  payment_date: string | null;
  amount: number | string | null;
  payment_method: string | null;
  note: string | null;
  payment_category: PaymentCategory;
  status: "Pending" | "Confirmed" | "Rejected" | string;
  created_at: string;
}

export interface LotTransactionSummary {
  id: number;
  customer_id: number;
  status: string;
  payment_type: string;
  final_price: number;
  down_payment: number;
  booking_fee: number;
  principal_amount: number;
  margin_percent: number;
  margin_amount: number;
  installment_total: number;
  months: number | null;
  monthly_payment: number;
  installment_start_date: string | null;
  booking_date: string | null;
  customer_name: string | null;
}

function toNumber(value: number | string | null | undefined): number {
  const result = Number(value ?? 0);
  return Number.isFinite(result) ? result : 0;
}

export const lotService = {
  async getSoldCount(): Promise<number> {
    const { count, error } = await supabase
      .from("lots")
      .select("*", { count: "exact", head: true })
      .in("status", ["Sold", "sold", "Terjual", "terjual"]);

    if (error) {
      console.error("Gagal mengambil jumlah kavling terjual:", error);
      return 0;
    }

    return count ?? 0;
  },

  async getTotalLotsCount(): Promise<number> {
    const { count, error } = await supabase
      .from("lots")
      .select("*", { count: "exact", head: true });

    if (error) {
      console.error("Gagal mengambil total kavling:", error);
      return 0;
    }

    return count ?? 0;
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

  /**
   * Kalkulasi cicilan memakai satu rumus terpusat.
   * Booking fee tidak mengurangi harga pokok.
   */
  calculateInstallment(input: {
    finalPrice: number;
    bookingFee?: number;
    downPayment?: number;
    months: number;
  }): InstallmentCalculation {
    return calculateInstallment(input);
  },

  async getLotInstallments(
    lotId: number,
  ): Promise<
    Array<{
      id: number;
      plan_id: number;
      monthly_payment: number | null;
      is_custom: boolean;
      plan_name: string;
      months: number;
      margin_percent: number;
    }>
  > {
    const { data, error } = await supabase
      .from("lot_installments")
      .select(
        "id, lot_id, plan_id, monthly_payment, is_custom, plan:payment_plans(id, plan_name, months, margin_percent)",
      )
      .eq("lot_id", lotId)
      .order("id", { ascending: true });

    if (error) throw error;

    return ((data ?? []) as unknown as LotInstallmentRecord[]).map((row) => {
      const plan = Array.isArray(row.plan) ? row.plan[0] : row.plan;

      return {
        id: row.id,
        plan_id: row.plan_id,
        monthly_payment:
          row.monthly_payment == null ? null : toNumber(row.monthly_payment),
        is_custom: row.is_custom,
        plan_name: plan?.plan_name ?? `Skema #${row.plan_id}`,
        months: Number(plan?.months ?? 0),
        margin_percent: toNumber(plan?.margin_percent),
      };
    });
  },

  async getLotTransactions(lotId: number): Promise<LotTransactionSummary[]> {
    const { data, error } = await supabase
      .from("lot_transactions")
      .select(
        `
          id,
          customer_id,
          status,
          payment_type,
          final_price,
          down_payment,
          booking_fee,
          principal_amount,
          margin_percent,
          margin_amount,
          installment_total,
          months,
          monthly_payment,
          installment_start_date,
          booking_date,
          created_at,
          customer:customers(full_name)
        `,
      )
      .eq("lot_id", lotId)
      .order("created_at", { ascending: false });

    if (error) throw error;

    type TransactionRow = {
      id: number;
      customer_id: number;
      status: string;
      payment_type: string;
      final_price: number | string;
      down_payment: number | string | null;
      booking_fee: number | string | null;
      principal_amount: number | string | null;
      margin_percent: number | string | null;
      margin_amount: number | string | null;
      installment_total: number | string | null;
      months: number | null;
      monthly_payment: number | string | null;
      installment_start_date: string | null;
      booking_date: string | null;
      customer: Record<string, unknown> | Record<string, unknown>[] | null;
    };

    return ((data ?? []) as unknown as TransactionRow[]).map((row) => {
      const customer = Array.isArray(row.customer) ? row.customer[0] : row.customer;
      const finalPrice = toNumber(row.final_price);
      const downPayment = toNumber(row.down_payment);

      return {
        id: row.id,
        customer_id: row.customer_id,
        status: row.status,
        payment_type: row.payment_type,
        final_price: finalPrice,
        down_payment: downPayment,
        booking_fee: BOOKING_FEE_FIXED,
        principal_amount:
          row.principal_amount == null
            ? Math.max(finalPrice - downPayment, 0)
            : toNumber(row.principal_amount),
        margin_percent: toNumber(row.margin_percent),
        margin_amount: toNumber(row.margin_amount),
        installment_total: toNumber(row.installment_total),
        months: row.months,
        monthly_payment: toNumber(row.monthly_payment),
        installment_start_date: row.installment_start_date,
        booking_date: row.booking_date,
        customer_name:
          typeof customer?.full_name === "string" ? customer.full_name : null,
      };
    });
  },

  async getLotPayments(transactionId: number): Promise<LotPaymentRecord[]> {
    if (!Number.isInteger(transactionId) || transactionId <= 0) {
      throw new Error("ID transaksi tidak valid untuk mengambil pembayaran.");
    }

    const { data, error } = await supabase
      .from("payments")
      .select(
        `
          id,
          transaction_id,
          customer_id,
          lot_id,
          payment_date,
          amount,
          payment_method,
          payment_category,
          note,
          status,
          created_at
        `,
      )
      .eq("transaction_id", transactionId)
      .order("payment_date", { ascending: false });

    if (error) throw error;
    return (data ?? []) as LotPaymentRecord[];
  },


  /**
   * Membuat pembayaran Pending. Kategori menentukan pos pembayaran:
   * Booking tidak mengurangi harga kavling; DP dan cicilan hanya untuk Installment.
   */
  async createPayment(input: {
    transactionId: number;
    amount: number;
    paymentCategory: PaymentCategory;
    paymentMethod: string;
    paymentDate?: string;
    note?: string | null;
  }): Promise<LotPaymentRecord> {
    const { transactionId, amount, paymentCategory, paymentMethod, paymentDate, note } = input;

    if (!Number.isInteger(transactionId) || transactionId <= 0) {
      throw new Error("ID transaksi tidak valid.");
    }
    if (!Number.isSafeInteger(amount) || amount <= 0) {
      throw new Error("Nominal pembayaran harus berupa bilangan rupiah bulat lebih dari 0.");
    }

    const { data: transaction, error: transactionError } = await supabase
      .from("lot_transactions")
      .select("id, lot_id, customer_id, payment_type, down_payment, booking_fee")
      .eq("id", transactionId)
      .single();

    if (transactionError) throw transactionError;

    if (paymentCategory === "Installment" || paymentCategory === "Down Payment") {
      if (transaction.payment_type !== "Installment") {
        throw new Error("DP dan cicilan hanya berlaku untuk transaksi cicilan.");
      }
    }

    if (paymentCategory === "Cash Purchase" && transaction.payment_type !== "Cash") {
      throw new Error("Pembayaran Cash Purchase hanya berlaku untuk transaksi tunai.");
    }

    // Booking fee wajib Rp1.000.000 untuk semua transaksi dan harus
    // lunas + Confirmed sebelum pembayaran pembelian (Cash/DP/Cicilan).
    const existingPayments = await this.getLotPayments(transactionId);
    const confirmedBookingPaid = existingPayments
      .filter((payment) => payment.payment_category === "Booking" && payment.status === "Confirmed")
      .reduce((sum, payment) => sum + toNumber(payment.amount), 0);
    const activeBookingReserved = existingPayments
      .filter((payment) => payment.payment_category === "Booking" && payment.status !== "Rejected")
      .reduce((sum, payment) => sum + toNumber(payment.amount), 0);

    if (paymentCategory === "Booking") {
      const bookingRemaining = Math.max(BOOKING_FEE_FIXED - activeBookingReserved, 0);
      if (amount > bookingRemaining) {
        throw new Error(
          `Nominal booking melebihi sisa biaya booking. Sisa: Rp ${bookingRemaining.toLocaleString("id-ID")}.`,
        );
      }
    }

    if (["Cash Purchase", "Down Payment", "Installment"].includes(paymentCategory)
        && confirmedBookingPaid < BOOKING_FEE_FIXED) {
      throw new Error(
        `Booking fee wajib lunas dan dikonfirmasi admin terlebih dahulu. Kekurangan: Rp ${(BOOKING_FEE_FIXED - confirmedBookingPaid).toLocaleString("id-ID")}.`,
      );
    }

    if (paymentCategory === "Installment") {
      const summary = await this.getTransactionPaymentSummary(transactionId);
      if (!summary.dpSettled) {
        throw new Error(
          `DP harus lunas dan dikonfirmasi admin sebelum cicilan pertama dibuat. Sisa DP: Rp ${summary.dpRemaining.toLocaleString("id-ID")}.`,
        );
      }
    }

    const { data, error } = await supabase
      .from("payments")
      .insert({
        transaction_id: transactionId,
        lot_id: transaction.lot_id,
        customer_id: transaction.customer_id,
        amount,
        payment_category: paymentCategory,
        payment_method: paymentMethod,
        payment_date: paymentDate ?? new Date().toISOString().slice(0, 10),
        note: note ?? null,
        status: "Pending",
      })
      .select(`
        id, transaction_id, customer_id, lot_id, payment_date,
        amount, payment_method, payment_category, note, status, created_at
      `)
      .single();

    if (error) throw error;
    return data as LotPaymentRecord;
  },

  /**
   * Admin mengonfirmasi pembayaran.
   * Trigger database akan memvalidasi syarat DP dan menyinkronkan status kavling.
   */
  async confirmPayment(paymentId: number): Promise<LotPaymentRecord> {
    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      throw new Error("ID pembayaran tidak valid.");
    }

    const { data, error } = await supabase
      .from("payments")
      .update({ status: "Confirmed" })
      .eq("id", paymentId)
      .eq("status", "Pending")
      .select(`
        id, transaction_id, customer_id, lot_id, payment_date,
        amount, payment_method, payment_category, note, status, created_at
      `)
      .single();

    if (error) throw error;
    return data as LotPaymentRecord;
  },

  async rejectPayment(paymentId: number, note?: string): Promise<LotPaymentRecord> {
    if (!Number.isInteger(paymentId) || paymentId <= 0) {
      throw new Error("ID pembayaran tidak valid.");
    }

    const { data, error } = await supabase
      .from("payments")
      .update({
        status: "Rejected",
        ...(note ? { note } : {}),
      })
      .eq("id", paymentId)
      .eq("status", "Pending")
      .select(`
        id, transaction_id, customer_id, lot_id, payment_date,
        amount, payment_method, payment_category, note, status, created_at
      `)
      .single();

    if (error) throw error;
    return data as LotPaymentRecord;
  },

  /**
   * Ringkasan ini mengecualikan pembayaran Booking dari tagihan pembelian.
   * Hanya pembayaran Confirmed yang dihitung.
   */
  async getTransactionPaymentSummary(transactionId: number) {
    if (!Number.isInteger(transactionId) || transactionId <= 0) {
      throw new Error("ID transaksi tidak valid.");
    }

    const [payments, transactionResult] = await Promise.all([
      this.getLotPayments(transactionId),
      supabase
        .from("lot_transactions")
        .select("payment_type, final_price, down_payment, installment_total")
        .eq("id", transactionId)
        .single(),
    ]);

    if (transactionResult.error) throw transactionResult.error;

    const transaction = transactionResult.data;

    return summarizeTransactionPayments({
      paymentType: transaction.payment_type as "Cash" | "Installment",
      finalPrice: toNumber(transaction.final_price),
      downPayment: toNumber(transaction.down_payment),
      installmentTotal: toNumber(transaction.installment_total),
      payments,
    });
  },
};
