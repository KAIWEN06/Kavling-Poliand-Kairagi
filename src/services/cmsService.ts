import { supabase } from '@/services/config/supabase'

export type CmsHero = { id?: string; title: string; subtitle: string; description: string; image_url?: string | null; cta_text: string; cta_url: string; is_active: boolean }
export type CmsFeature = { id?: string; icon: string; title: string; description: string; sort_order: number; is_active: boolean }

export const cmsService = {
  async getHero(includeInactive = false) { let q = supabase.from('home_hero').select('*').order('updated_at', { ascending: false }).limit(1); if (!includeInactive) q = q.eq('is_active', true); const { data, error } = await q.maybeSingle(); if (error) throw error; return data as CmsHero | null },
  async saveHero(hero: CmsHero) { const { data, error } = await supabase.from('home_hero').upsert({ ...hero, updated_at: new Date().toISOString() }).select().single(); if (error) throw error; return data as CmsHero },
  async getFeatures(includeInactive = true) { let q = supabase.from('home_features').select('*').order('sort_order').order('created_at'); if (!includeInactive) q = q.eq('is_active', true); const { data, error } = await q; if (error) throw error; return (data || []) as CmsFeature[] },
  async saveFeature(feature: CmsFeature) { const { data, error } = await supabase.from('home_features').upsert({ ...feature, updated_at: new Date().toISOString() }).select().single(); if (error) throw error; return data as CmsFeature },
  async deleteFeature(id: string) { const { error } = await supabase.from('home_features').delete().eq('id', id); if (error) throw error },
  async uploadImage(file: File) { if (!['image/jpeg','image/png','image/webp'].includes(file.type)) throw new Error('Format gambar harus JPG, PNG, atau WEBP.'); if (file.size > 5 * 1024 * 1024) throw new Error('Ukuran gambar maksimal 5 MB.'); const path = `hero/${crypto.randomUUID()}.${file.name.split('.').pop()}`; const { error } = await supabase.storage.from('galleries').upload(path, file, { upsert: false, contentType: file.type }); if (error) throw error; return supabase.storage.from('galleries').getPublicUrl(path).data.publicUrl }
}
