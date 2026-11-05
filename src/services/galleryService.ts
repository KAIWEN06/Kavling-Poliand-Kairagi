import { supabase } from '@/services/config/supabase'

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
    const { error } = await supabase
      .from('gallery')
      .delete()
      .eq('id', id)

    if (error) throw error

    if (imageUrl) {
      await this.deleteImage(imageUrl)
    }

    return true
  },

  async uploadImage(file: File) {
    const fileExt = file.name.split('.').pop()
    const randomString = Math.random()
      .toString(36)
      .substring(2, 9)

    const fileName =
      `${Date.now()}_${randomString}.${fileExt}`

    const filePath = fileName

    const { error: uploadError } =
      await supabase.storage
        .from('galleries')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

    if (uploadError) {
      throw uploadError
    }

    const { data } =
      supabase.storage
        .from('galleries')
        .getPublicUrl(filePath)

    return {
      path: filePath,
      url: data.publicUrl
    }
  },

  async deleteImage(imageUrl: string) {
    try {
      const urlObj = new URL(imageUrl)
      const pathParts =
        urlObj.pathname.split('/galleries/')

      if (pathParts.length < 2) return

      const filePath =
        decodeURIComponent(pathParts[1])

      await supabase.storage
        .from('galleries')
        .remove([filePath])
    } catch (err) {
      console.error(
        'Gagal menghapus file gambar dari storage:',
        err
      )
    }
  }
}