import { supabase } from "./config/supabase";

/**
 * Satu baris tabel `public.lots` beserta relasi `blocks` dan `customers`.
 * Dipakai oleh halaman Kelola Kavling (admin).
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
  block: Record<string, unknown> | null;
  customer: Record<string, unknown> | null;
}

export const lotService = {
  // Fungsi untuk mengambil jumlah kavling yang statusnya 'Sold'
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

  // Fungsi opsional jika ingin mengambil total keseluruhan kavling juga
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

  // Daftar lengkap kavling + blok + pelanggan (halaman Kelola Kavling admin).
  // select('*') pada relasi agar tidak gagal bila nama kolom blocks/customers berbeda.
  async getLots(): Promise<LotRecord[]> {
    const { data, error } = await supabase
      .from("lots")
      .select("*, block:blocks(*), customer:customers(*)")
      .order("lot_number", { ascending: true });

    if (error) {
      throw error;
    }
    return (data ?? []) as unknown as LotRecord[];
  },
};