import { supabase } from "@/services/config/supabase";
import { compressImage } from "@/utils/imageCompress";
import { removePublicFile } from "@/utils/storageFiles";

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

  async getProgressById(id: string): Promise<ProgressItem | null> {
    const { data, error } = await supabase.from("progress").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return (data as ProgressItem | null) ?? null;
  },

  async uploadImage(file: File): Promise<string> {
    const photo = await compressImage(file);
    const fileExt = photo.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${fileExt}`;
    const filePath = `${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("progress")
      .upload(filePath, photo, { cacheControl: "31536000" });
    
    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("progress").getPublicUrl(filePath);
    return data.publicUrl;
  },

  async deleteImageFile(imageUrl?: string): Promise<void> {
    await removePublicFile("progress", imageUrl);
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
    const { data, error } = await supabase.from("progress").delete().eq("id", id).select("id");
    if (error) throw error;
    if (!data?.length) throw new Error("Kabar tidak terhapus. Muat ulang halaman lalu coba lagi.");
    // File dihapus setelah datanya hilang, agar kabar yang gagal dihapus tidak kehilangan foto.
    await this.deleteImageFile(imageUrl);
    return true;
  }
};
