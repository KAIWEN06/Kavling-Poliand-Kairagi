import { supabase } from '@/services/config/supabase'
import { compressImage } from '@/utils/imageCompress'
import { GALLERY_BUCKET, removePublicFile } from '@/utils/storageFiles'

export interface GalleryPayload {
  title: string
  category?: string
  description?: string
  image_url: string
  sort_order?: number
  is_active?: boolean
}

export const galleryService = {
  async getGallery(onlyActive = true) {
    let query = supabase
      .from('gallery')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (onlyActive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return data || []
  },

  async refreshGallery(onlyActive = true) {
    return this.getGallery(onlyActive)
  },

  async createGallery(payload: GalleryPayload) {
    const { data, error } = await supabase
      .from('gallery')
      .insert([payload])
      .select()
      .single()

    if (error) throw error

    return data
  },

  async updateGallery(
    id: string,
    payload: Partial<GalleryPayload>
  ) {
    const { data, error } = await supabase
      .from('gallery')
      .update(payload)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return data
  },

  async deleteGallery(
    id: string,
    imageUrl?: string
  ) {
    const { data, error } = await supabase
      .from('gallery')
      .delete()
      .eq('id', id)
      .select('id')

    if (error) throw error
    // RLS yang menolak tidak memunculkan error; tanpa cek ini hapus terlihat berhasil.
    if (!data?.length) throw new Error('Foto tidak terhapus. Muat ulang halaman lalu coba lagi.')

    if (imageUrl) {
      await this.deleteImage(imageUrl)
    }

    return true
  },

  async uploadImage(source: File) {
    const file = await compressImage(source)
    const fileExt = file.name.split('.').pop()
    const randomString = Math.random()
      .toString(36)
      .substring(2, 9)

    const fileName =
      `${Date.now()}_${randomString}.${fileExt}`

    const filePath = fileName

    const { error: uploadError } =
      await supabase.storage
        .from(GALLERY_BUCKET)
        .upload(filePath, file, {
          cacheControl: '31536000',
          upsert: false
        })

    if (uploadError) {
      throw uploadError
    }

    const { data } =
      supabase.storage
        .from(GALLERY_BUCKET)
        .getPublicUrl(filePath)

    return {
      path: filePath,
      url: data.publicUrl
    }
  },

  async deleteImage(imageUrl: string) {
    await removePublicFile(GALLERY_BUCKET, imageUrl)
  }
}
