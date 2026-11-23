import { supabase } from '@/services/config/supabase'

export type CmsHero = { id?: string; title: string; subtitle: string; description: string; image_url?: string | null; cta_text: string; cta_url: string; is_active: boolean }
export type CmsFeature = { id?: string; icon: string; title: string; description: string; sort_order: number; is_active: boolean }

const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const MAX_IMAGE_BYTES = 5 * 1024 * 1024

export const cmsService = {
  async getHero(includeInactive = false) {
    let query = supabase.from('home_hero').select('*').order('updated_at', { ascending: false }).limit(1)
    if (!includeInactive) query = query.eq('is_active', true)
    const { data, error } = await query.maybeSingle()
    if (error) throw error
    return data as CmsHero | null
  },

  /** Simpan hero. `id` yang dikembalikan harus dipakai lagi agar simpan berikutnya memperbarui baris yang sama. */
  async saveHero(hero: CmsHero) {
    const payload = { ...hero, updated_at: new Date().toISOString() }
    if (!payload.id) delete payload.id
    const { data, error } = await supabase.from('home_hero').upsert(payload).select().single()
    if (error) throw error
    return data as CmsHero
  },

  async getFeatures(includeInactive = true) {
    let query = supabase.from('home_features').select('*').order('sort_order').order('created_at')
    if (!includeInactive) query = query.eq('is_active', true)
    const { data, error } = await query
    if (error) throw error
    return (data || []) as CmsFeature[]
  },

  async saveFeature(feature: CmsFeature) {
    const payload = { ...feature, updated_at: new Date().toISOString() }
    if (!payload.id) delete payload.id
    const { data, error } = await supabase.from('home_features').upsert(payload).select().single()
    if (error) throw error
    return data as CmsFeature
  },

  async deleteFeature(id: string) {
    const { error } = await supabase.from('home_features').delete().eq('id', id)
    if (error) throw error
  },

  /** Jumlah data per bagian untuk ringkasan di Kelola Konten. `null` bila gagal dimuat. */
  async getCounts() {
    const count = async (table: string) => {
      const { count: total, error } = await supabase.from(table).select('id', { count: 'exact', head: true })
      return error ? null : total ?? 0
    }
    const [gallery, progress, faq, features] = await Promise.all([count('gallery'), count('progress'), count('faqs'), count('home_features')])
    return { gallery, progress, faq, features }
  },

  async uploadImage(file: File) {
    if (!ALLOWED_IMAGE_TYPES.includes(file.type)) throw new Error('Format gambar harus JPG, PNG, atau WEBP.')
    if (file.size > MAX_IMAGE_BYTES) throw new Error('Ukuran gambar maksimal 5 MB.')
    const path = `hero/${crypto.randomUUID()}.${file.name.split('.').pop()}`
    const { error } = await supabase.storage.from('galleries').upload(path, file, { upsert: false, contentType: file.type })
    if (error) throw error
    return supabase.storage.from('galleries').getPublicUrl(path).data.publicUrl
  },
}
