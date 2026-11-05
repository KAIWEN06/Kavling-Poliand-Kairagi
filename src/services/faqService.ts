import { supabase } from "@/services/config/supabase";

export interface FaqItem {
  id?: string;
  question: string;
  answer: string;
  created_at?: string;
}

export const faqService = {
  async getFaqs(): Promise<FaqItem[]> {
    const { data, error } = await supabase
      .from("faqs")
      .select("*")
      .order("created_at", { ascending: true });
    if (error) throw error;
    return data || [];
  },

  async createFaq(faqData: Omit<FaqItem, 'id' | 'created_at'>): Promise<FaqItem> {
    const { data, error } = await supabase
      .from("faqs")
      .insert([faqData])
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async updateFaq(id: string, faqData: Partial<FaqItem>): Promise<FaqItem> {
    const { data, error } = await supabase
      .from("faqs")
      .update(faqData)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async deleteFaq(id: string): Promise<boolean> {
    const { error } = await supabase.from("faqs").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
};