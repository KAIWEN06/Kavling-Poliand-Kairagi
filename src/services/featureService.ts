import { supabase } from './config/supabase'

const BUCKET_NAME = 'videos'

export interface VideoItem {
  id?: number | string
  title: string
  description?: string | null
  video_url: string
  thumbnail_url?: string | null
  sort_order?: number
  is_active?: boolean
  created_at?: string
  updated_at?: string
  [key: string]: any
}

export const featureService = {
  // =====================================================
  // GET VIDEO UTAMA
  // =====================================================
  async getVideo(): Promise<VideoItem | null> {
    const { data, error } = await supabase
      .from('videos')
      .select('*')
      .eq('is_active', true)
      .order('sort_order', { ascending: true })
      .limit(1)
      .maybeSingle()

    if (error) {
      throw error
    }

    return data
  },

  // =====================================================
  // GET SEMUA VIDEO
  // =====================================================
  async getVideos(includeInactive = false): Promise<VideoItem[]> {
    let query = supabase
      .from('videos')
      .select('*')
      .order('sort_order', { ascending: true })
      .order('created_at', { ascending: false })

    if (!includeInactive) {
      query = query.eq('is_active', true)
    }

    const { data, error } = await query

    if (error) {
      throw error
    }

    return data || []
  },

  // =====================================================
  // UPLOAD VIDEO KE SUPABASE STORAGE
  // =====================================================
  async uploadVideo(file: File): Promise<{ url: string; path: string }> {
    if (!file) {
      throw new Error('File video belum dipilih.')
    }

    const allowedTypes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
    ]

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Format video harus MP4, WEBM, OGG, atau MOV.')
    }

    // Maksimal 50 MB
    const maxSize = 50 * 1024 * 1024

    if (file.size > maxSize) {
      throw new Error('Ukuran video maksimal 50 MB.')
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'mp4'
    const fileName = `${crypto.randomUUID()}.${fileExt}`
    const filePath = `feature/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      throw uploadError
    }

    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    if (!data?.publicUrl) {
      throw new Error('Gagal mendapatkan URL video.')
    }

    return {
      url: data.publicUrl,
      path: filePath,
    }
  },

  // =====================================================
  // DELETE VIDEO DARI STORAGE
  // =====================================================
  async deleteVideoFile(videoUrl: string): Promise<void> {
    if (!videoUrl) return

    if (!videoUrl.includes('/storage/v1/object/public/')) {
      return
    }

    try {
      const marker = `/storage/v1/object/public/${BUCKET_NAME}/`
      const index = videoUrl.indexOf(marker)

      if (index === -1) {
        return
      }

      const filePath = decodeURIComponent(
        videoUrl.substring(index + marker.length)
      )

      if (!filePath) {
        return
      }

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath])

      if (error) {
        console.error('Gagal menghapus video Storage:', error)
      }
    } catch (error) {
      console.error('Error deleteVideoFile:', error)
    }
  },

  // =====================================================
  // UPLOAD THUMBNAIL
  // =====================================================
  async uploadThumbnail(file: File): Promise<{ url: string; path: string }> {
    if (!file) {
      throw new Error('File thumbnail belum dipilih.')
    }

    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/webp',
    ]

    if (!allowedTypes.includes(file.type)) {
      throw new Error('Thumbnail harus JPG, JPEG, PNG, atau WEBP.')
    }

    // Maksimal 5 MB
    const maxSize = 5 * 1024 * 1024

    if (file.size > maxSize) {
      throw new Error('Ukuran thumbnail maksimal 5 MB.')
    }

    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const fileName = `${crypto.randomUUID()}.${fileExt}`
    const filePath = `thumbnails/${fileName}`

    const { error: uploadError } = await supabase.storage
      .from(BUCKET_NAME)
      .upload(filePath, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type,
      })

    if (uploadError) {
      throw uploadError
    }

    const { data } = supabase.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath)

    if (!data?.publicUrl) {
      throw new Error('Gagal mendapatkan URL thumbnail.')
    }

    return {
      url: data.publicUrl,
      path: filePath,
    }
  },

  // =====================================================
  // DELETE THUMBNAIL DARI STORAGE
  // =====================================================
  async deleteThumbnailFile(thumbnailUrl: string): Promise<void> {
    if (!thumbnailUrl) return

    if (!thumbnailUrl.includes('/storage/v1/object/public/')) {
      return
    }

    try {
      const marker = `/storage/v1/object/public/${BUCKET_NAME}/`
      const index = thumbnailUrl.indexOf(marker)

      if (index === -1) {
        return
      }

      const filePath = decodeURIComponent(
        thumbnailUrl.substring(index + marker.length)
      )

      if (!filePath) {
        return
      }

      const { error } = await supabase.storage
        .from(BUCKET_NAME)
        .remove([filePath])

      if (error) {
        console.error('Gagal menghapus thumbnail:', error)
      }
    } catch (error) {
      console.error('Error deleteThumbnailFile:', error)
    }
  },

  // =====================================================
  // CREATE VIDEO
  // =====================================================
  async createVideo(item: VideoItem): Promise<VideoItem> {
    const { data, error } = await supabase
      .from('videos')
      .insert([
        {
          title: item.title,
          description: item.description || null,
          video_url: item.video_url,
          thumbnail_url: item.thumbnail_url || null,
          sort_order: item.sort_order ?? 0,
          is_active: item.is_active ?? true,
        },
      ])
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  },

  // =====================================================
  // UPDATE VIDEO
  // =====================================================
  async updateVideo(id: number | string, item: VideoItem): Promise<VideoItem> {
    const { data, error } = await supabase
      .from('videos')
      .update({
        title: item.title,
        description: item.description || null,
        video_url: item.video_url,
        thumbnail_url: item.thumbnail_url || null,
        sort_order: item.sort_order ?? 0,
        is_active: item.is_active ?? true,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      throw error
    }

    return data
  },

  // =====================================================
  // DELETE VIDEO DATABASE + STORAGE
  // =====================================================
  async deleteVideo(
    id: number | string,
    videoUrl?: string,
    thumbnailUrl?: string
  ): Promise<boolean> {
    const { error } = await supabase
      .from('videos')
      .delete()
      .eq('id', id)

    if (error) {
      throw error
    }

    if (videoUrl) {
      await this.deleteVideoFile(videoUrl)
    }

    if (thumbnailUrl) {
      await this.deleteThumbnailFile(thumbnailUrl)
    }

    return true
  },
}

// =====================================================
// YOUTUBE HELPER
// =====================================================

export function getYouTubeVideoId(url: string | null | undefined): string | null {
  if (!url) return null

  try {
    const parsedUrl = new URL(url)

    if (
      parsedUrl.hostname.includes('youtube.com') &&
      parsedUrl.searchParams.get('v')
    ) {
      return parsedUrl.searchParams.get('v')
    }

    if (parsedUrl.hostname === 'youtu.be') {
      return parsedUrl.pathname.replace('/', '').split('?')[0]
    }

    if (
      parsedUrl.hostname.includes('youtube.com') &&
      parsedUrl.pathname.startsWith('/embed/')
    ) {
      return parsedUrl.pathname.split('/embed/')[1].split('/')[0]
    }

    if (
      parsedUrl.hostname.includes('youtube.com') &&
      parsedUrl.pathname.startsWith('/shorts/')
    ) {
      return parsedUrl.pathname.split('/shorts/')[1].split('/')[0]
    }

    return null
  } catch {
    return null
  }
}

export function getYouTubeEmbedUrl(url: string | null | undefined): string | null {
  const videoId = getYouTubeVideoId(url)
  if (!videoId) {
    return null
  }
  return `https://www.youtube.com/embed/${videoId}`
}

export function getYouTubeThumbnail(url: string | null | undefined): string | null {
  const videoId = getYouTubeVideoId(url)
  if (!videoId) {
    return null
  }
  return `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
}

export function isYouTubeUrl(url: string | null | undefined): boolean {
  return Boolean(getYouTubeVideoId(url))
}

export function isSupabaseVideoUrl(url: string | null | undefined): boolean {
  if (!url) return false
  return (
    url.includes('/storage/v1/object/public/videos/') ||
    url.includes('/storage/v1/object/sign/videos/')
  )
}