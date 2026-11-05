import { supabase } from "@/services/config/supabase";

export interface ContactItem {
  id?: string;
  key: string;
  label?: string;
  value: string;
  updated_at?: string;
}

export const contactService = {
  async getContacts(): Promise<ContactItem[]> {
    const { data, error } = await supabase.from("contacts").select("*");
    if (error) throw error;
    return data || [];
  },

  async updateContact(id: string, value: string): Promise<ContactItem> {
    const { data, error } = await supabase
      .from("contacts")
      .update({ value, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    return data;
  },

  async upsertContact(contactData: ContactItem): Promise<ContactItem> {
    const { data, error } = await supabase
      .from("contacts")
      .upsert(
        { ...contactData, updated_at: new Date().toISOString() },
        { onConflict: "key" }
      )
      .select()
      .single();
    if (error) throw error;
    return data;
  }
};