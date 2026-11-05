import { supabase } from "@/services/config/supabase";

export interface ProgressItem {
  id?: string;
  title: string;
  description?: string;
  progress_date?: string | null;
  percentage?: number;
  status?: 'planned' | 'ongoing' | 'completed';
  image_url?: string;
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
}

export const progressService = {
  async getProgress(includeInactive: boolean = false): Promise<ProgressItem[]> {
    let query = supabase
      .from("progress")
      .select("*")
      .order("progress_date", { ascending: true });
    
    if (!includeInactive) {
      query = query.eq("is_active", true);
    }
    
    const { data, error } = await query;
    if (error) throw error;
    return (data || []) as ProgressItem[];
  },

  async uploadImage(file: File): Promise<string> {
    const fileExt = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("progress")
      .upload(filePath, file);
    
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("progress").getPublicUrl(filePath);
    return data.publicUrl;
  },

  async deleteImageFile(imageUrl?: string): Promise<void> {
    if (!imageUrl) return;
    try {
      const urlParts = imageUrl.split("/progress/");
      if (urlParts.length > 1) {
        const filePath = urlParts[1];
        await supabase.storage.from("progress").remove([filePath]);
      }
    } catch (err) {
      console.error("Gagal menghapus file lama dari storage:", err);
    }
  },

  async createProgress(item: ProgressItem): Promise<ProgressItem> {
    const { data, error } = await supabase
      .from("progress")
      .insert([item])
      .select()
      .single();
    
    if (error) throw error;
    return data as ProgressItem;
  },

  async updateProgress(id: string, item: Partial<ProgressItem>): Promise<ProgressItem> {
    const { data, error } = await supabase
      .from("progress")
      .update({ ...item, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    
    if (error) throw error;
    return data as ProgressItem;
  },

  async deleteProgress(id: string, imageUrl?: string): Promise<boolean> {
    if (imageUrl) {
      await this.deleteImageFile(imageUrl);
    }
    const { error } = await supabase.from("progress").delete().eq("id", id);
    if (error) throw error;
    return true;
  }
};