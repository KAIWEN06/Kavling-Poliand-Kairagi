import { supabase } from '@/services/config/supabase'
import { authService } from '@/services/auth/authService'
import type {
  OwnReview,
  PublicReviewPage,
  ReviewInput,
  ReviewReportReason,
  ReviewSort,
  ReviewStats,
} from '@/types/review'

export const REVIEW_BUCKET = 'review-photos'
export const REVIEW_LIMITS = {
  titleMin: 3,
  titleMax: 100,
  contentMin: 10,
  contentMax: 2000,
  maxPhotos: 3,
  maxPhotoBytes: 3 * 1024 * 1024,
  photoTypes: ['image/jpeg', 'image/png', 'image/webp'] as const,
}

const PHOTO_EXT: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

const DEVICE_KEY_STORAGE = 'poliland_review_device_key'

/** Kunci anonim per perangkat untuk membatasi vote/laporan ganda pengunjung. */
function getDeviceKey(): string {
  try {
    let key = localStorage.getItem(DEVICE_KEY_STORAGE)
    if (!key || key.length < 16) {
      key = crypto.randomUUID()
      localStorage.setItem(DEVICE_KEY_STORAGE, key)
    }
    return key
  } catch {
    return crypto.randomUUID()
  }
}

const ERROR_MESSAGES: Record<string, string> = {
  REVIEW_ALREADY_PENDING: 'Ulasan Anda sebelumnya masih menunggu pemeriksaan Admin. Mohon tunggu hingga selesai diperiksa.',
  REVIEW_RATE_LIMIT: 'Terlalu banyak permintaan dalam waktu singkat. Silakan coba lagi nanti.',
  REVIEW_DUPLICATE: 'Isi ulasan ini sudah pernah Anda kirim.',
  REVIEW_INVALID_PHOTO: 'Foto tidak valid. Silakan unggah ulang.',
  REVIEW_LOGIN_REQUIRED: 'Silakan masuk terlebih dahulu untuk memberi penilaian Helpful.',
  REVIEW_NOT_EDITABLE: 'Ulasan ini sudah diperiksa Admin sehingga tidak dapat diubah lagi.',
  REVIEW_NOT_FOUND: 'Ulasan tidak ditemukan atau sudah tidak ditampilkan.',
  ADMIN_ROLE_REQUIRED: 'Anda tidak memiliki akses untuk tindakan ini.',
}

/** Terjemahkan error Supabase/RPC menjadi pesan yang dapat dipahami pengguna. */
export function reviewErrorMessage(error: unknown, fallback: string): string {
  const raw = String((error as { message?: string } | null)?.message ?? '')
  for (const [code, message] of Object.entries(ERROR_MESSAGES)) {
    if (raw.includes(code)) return message
  }
  if (/row-level security|permission denied/i.test(raw)) {
    return 'Hanya akun Klien yang sedang login yang dapat mengirim ulasan.'
  }
  return fallback
}

const PHOTO_URL_TTL = 3600
const photoCache = new Map<string, { url: string; expiresAt: number }>()

/**
 * Bucket foto bersifat privat. URL dibuat per foto (signed URL) dan di-cache;
 * hasilnya hanya ada untuk foto yang boleh dibaca pemanggil (ulasan approved,
 * milik sendiri, atau Admin).
 */
export async function resolveReviewPhotoUrls(paths: string[]): Promise<Record<string, string>> {
  const now = Date.now()
  const need = [...new Set(paths)].filter((p) => {
    const hit = photoCache.get(p)
    return !hit || hit.expiresAt - now < 60_000
  })

  if (need.length) {
    const { data, error } = await supabase.storage
      .from(REVIEW_BUCKET)
      .createSignedUrls(need, PHOTO_URL_TTL)
    if (error) throw error
    for (const item of data ?? []) {
      if (item.path && item.signedUrl) {
        photoCache.set(item.path, {
          url: item.signedUrl,
          expiresAt: now + PHOTO_URL_TTL * 1000,
        })
      }
    }
  }

  const result: Record<string, string> = {}
  for (const p of paths) {
    const hit = photoCache.get(p)
    if (hit) result[p] = hit.url
  }
  return result
}

/** Validasi tipe dan ukuran foto; mengembalikan pesan error atau null. */
export function validateReviewPhoto(file: File): string | null {
  if (!(REVIEW_LIMITS.photoTypes as readonly string[]).includes(file.type)) {
    return 'Format foto harus JPG, PNG, atau WebP.'
  }
  if (file.size > REVIEW_LIMITS.maxPhotoBytes) {
    return 'Ukuran foto maksimal 3 MB.'
  }
  return null
}

export const reviewService = {
  async getStats(): Promise<ReviewStats> {
    const { data, error } = await supabase.rpc('get_public_review_stats')
    if (error) throw error
    return data as ReviewStats
  },

  async getReviews(params: {
    rating: number | null
    sort: ReviewSort
    page: number
    pageSize: number
  }): Promise<PublicReviewPage> {
    const { data, error } = await supabase.rpc('get_public_reviews', {
      p_rating: params.rating,
      p_sort: params.sort,
      p_limit: params.pageSize,
      p_offset: (params.page - 1) * params.pageSize,
      p_device_key: getDeviceKey(),
    })
    if (error) throw error
    return data as PublicReviewPage
  },

  async toggleHelpful(reviewId: string): Promise<{ helpful_count: number; voted: boolean }> {
    const { data, error } = await supabase.rpc('toggle_review_helpful', {
      p_review_id: reviewId,
    })
    if (error) throw error
    return data as { helpful_count: number; voted: boolean }
  },

  async report(reviewId: string, reason: ReviewReportReason, details: string): Promise<void> {
    const { error } = await supabase.rpc('report_review', {
      p_review_id: reviewId,
      p_reason: reason,
      p_details: details.trim() || null,
      p_device_key: getDeviceKey(),
    })
    if (error) throw error
  },

  /** Apakah pengguna yang sedang login adalah Client (satu-satunya role yang boleh menulis ulasan). */
  async getWriterState(): Promise<{ loggedIn: boolean; isClient: boolean; userId: string | null }> {
    try {
      const session = await authService.getSession()
      if (!session) return { loggedIn: false, isClient: false, userId: null }
      const role = await authService.getUserRole(session.user.id)
      return { loggedIn: true, isClient: role === 'client', userId: session.user.id }
    } catch {
      return { loggedIn: false, isClient: false, userId: null }
    }
  },

  async getMyLatestReview(userId: string): Promise<OwnReview | null> {
    const { data, error } = await supabase
      .from('customer_reviews')
      .select('id, rating, title, content, recommend, photo_urls, status, rejection_reason, created_at')
      .eq('client_id', userId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (error) throw error
    return (data as OwnReview | null) ?? null
  },

  /** Ubah ulasan sendiri. Hanya berhasil selama status masih `pending` (ditegakkan RLS). */
  async updateOwn(
    id: string,
    input: { rating: number; title: string; content: string; recommend: boolean },
  ): Promise<void> {
    const { data, error } = await supabase
      .from('customer_reviews')
      .update({
        rating: input.rating,
        title: input.title.trim(),
        content: input.content.trim(),
        recommend: input.recommend,
      })
      .eq('id', id)
      .select('id')
    if (error) throw error
    if (!data?.length) throw new Error('REVIEW_NOT_EDITABLE')
  },

  /** Hapus ulasan sendiri (hanya pending/rejected, ditegakkan RLS) beserta fotonya. */
  async deleteOwn(review: Pick<OwnReview, 'id' | 'photo_urls'>): Promise<void> {
    const { data, error } = await supabase
      .from('customer_reviews')
      .delete()
      .eq('id', review.id)
      .select('id')
    if (error) throw error
    if (!data?.length) throw new Error('REVIEW_NOT_EDITABLE')
    if (review.photo_urls.length) {
      await supabase.storage.from(REVIEW_BUCKET).remove(review.photo_urls).catch(() => undefined)
    }
  },

  /**
   * Kirim ulasan. client_id selalu berasal dari sesi login, status tidak
   * dikirim sama sekali (default `pending` ditegakkan database).
   */
  async submit(input: ReviewInput): Promise<void> {
    const session = await authService.getSession()
    if (!session) throw new Error('LOGIN_REQUIRED')
    const userId = session.user.id

    const uploaded: string[] = []
    try {
      for (const file of input.photos) {
        const invalid = validateReviewPhoto(file)
        if (invalid) throw new Error(invalid)
        const path = `${userId}/${crypto.randomUUID()}.${PHOTO_EXT[file.type]}`
        const { error } = await supabase.storage
          .from(REVIEW_BUCKET)
          .upload(path, file, { contentType: file.type, upsert: false })
        if (error) throw error
        uploaded.push(path)
      }

      const { error } = await supabase.from('customer_reviews').insert({
        client_id: userId,
        rating: input.rating,
        title: input.title.trim(),
        content: input.content.trim(),
        photo_urls: uploaded,
        recommend: input.recommend,
      })
      if (error) throw error
    } catch (error) {
      if (uploaded.length) {
        await supabase.storage.from(REVIEW_BUCKET).remove(uploaded).catch(() => undefined)
      }
      throw error
    }
  },
}
