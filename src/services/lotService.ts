import { supabase } from "./config/supabase";

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
  }
};
