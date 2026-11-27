import { supabase } from '@/services/config/supabase'

/** Bucket publik untuk foto galeri dan sampul Beranda. */
export const GALLERY_BUCKET = 'gallery'

/** Lokasi objek dari URL publik. `null` bila URL bukan milik bucket tersebut (mis. `/content/…` atau YouTube). */
export function storagePathFromPublicUrl(bucket: string, url?: string | null): string | null {
  if (!url) return null
  const marker = `/storage/v1/object/public/${bucket}/`
  const index = url.indexOf(marker)
  if (index === -1) return null
  const path = url.slice(index + marker.length).split('?')[0]
  return path ? decodeURIComponent(path) : null
}

/** Hapus file lama atau file yang batal dipakai. Kegagalan hanya dicatat: datanya sendiri sudah benar. */
export async function removePublicFile(bucket: string, url?: string | null): Promise<void> {
  const path = storagePathFromPublicUrl(bucket, url)
  if (!path) return
  try {
    const { data, error } = await supabase.storage.from(bucket).remove([path])
    // Tanpa policy hapus/baca, Storage tidak melapor error dan tidak menghapus apa pun.
    if (error || !data?.length) console.warn(`File ${bucket}/${path} tidak terhapus.`, error)
  } catch (error) {
    console.warn(`File ${bucket}/${path} tidak terhapus.`, error)
  }
}

/** Terjemahkan pesan Storage/database yang berbahasa Inggris menjadi petunjuk yang bisa ditindaklanjuti. */
export function uploadErrorMessage(error: unknown, fallback: string): string {
  const message = String((error as { message?: unknown } | null)?.message ?? '')
  if (/bucket not found/i.test(message)) return 'Tempat penyimpanan file belum disiapkan. Hubungi pengelola sistem.'
  if (/mime type/i.test(message)) return 'Format file ini ditolak penyimpanan. Pilih file dengan format lain.'
  if (/exceeded the maximum allowed size|payload too large/i.test(message)) return 'File terlalu besar. Pilih file yang lebih kecil.'
  if (/row-level security|unauthorized|permission denied/i.test(message)) return 'Akun ini tidak punya izin untuk mengubah data tersebut.'
  if (/failed to fetch|network|load failed/i.test(message)) return 'Koneksi terputus. Periksa internet lalu coba lagi.'
  return message || fallback
}
