/**
 * Registry terpusat untuk ilustrasi maskot situasional.
 *
 * - Ganti aset gambar: ubah SATU baris `image` di bawah ini.
 * - Ganti teks default: ubah `title` / `description` / `actionLabel`.
 * - Halaman cukup memakai <StatusIllustration variant="..." />.
 */
import emptyDataImg from '@/assets/mascot/Mascot_No_Data_Scene.png'
import noResultImg from '@/assets/mascot/MascotInvestigatingSearch Filters.png'
import creatingImg from '@/assets/mascot/MascotWritingaNewNote.png'
// TODO: belum ada aset khusus offline. Ganti ke ilustrasi baru jika sudah ada.
import offlineImg from '@/assets/mascot/Worried Mascot and Locked Property Link.png'
import maintenanceImg from '@/assets/illustrations/perbaikan.png'
import notFoundImg from '@/assets/illustrations/NotFound.webp'
import fetchErrorImg from '@/assets/mascot/Worried_Bee_Mascot_Facing_Loading Error.png'
import successImg from '@/assets/mascot/Verified_Mascot.png'

export type StatusVariant =
  | 'empty-data'
  | 'no-result'
  | 'creating-data'
  | 'offline-error'
  | 'maintenance'
  | 'not-found-404'
  | 'fetch-error'
  | 'success'

/** Alias agar penamaan lain tetap diterima. */
export type StatusVariantAlias =
  | StatusVariant
  | 'no-search-result'
  | 'processing'
  | 'server-error'

export interface StatusDefinition {
  image: string
  title: string
  description: string
  /** Label tombol utama bila halaman memberi `onAction` tanpa `actionLabel`. */
  actionLabel: string
  /** `alert` untuk kondisi gagal agar dibacakan pembaca layar. */
  role: 'status' | 'alert'
  /** Tampilkan indikator berputar (sedang memproses). */
  busy?: boolean
}

export const STATUS_REGISTRY: Record<StatusVariant, StatusDefinition> = {
  'empty-data': {
    image: emptyDataImg,
    title: 'Belum ada data',
    description: 'Data akan muncul di sini setelah ditambahkan.',
    actionLabel: 'Tambah Data',
    role: 'status',
  },
  'no-result': {
    image: noResultImg,
    title: 'Hasil tidak ditemukan',
    description: 'Coba ubah kata kunci atau atur ulang filter.',
    actionLabel: 'Reset Filter',
    role: 'status',
  },
  'creating-data': {
    image: creatingImg,
    title: 'Sedang memproses',
    description: 'Mohon tunggu sebentar dan jangan tutup halaman ini.',
    actionLabel: 'Batalkan',
    role: 'status',
    busy: true,
  },
  'offline-error': {
    image: offlineImg,
    title: 'Koneksi terputus',
    description: 'Periksa koneksi internet Anda, lalu coba lagi.',
    actionLabel: 'Coba Lagi',
    role: 'alert',
  },
  maintenance: {
    image: maintenanceImg,
    title: 'Sedang dalam perbaikan',
    description: 'Bagian ini sedang kami rapikan. Silakan kembali beberapa saat lagi.',
    actionLabel: 'Kembali ke Beranda',
    role: 'status',
  },
  'not-found-404': {
    image: notFoundImg,
    title: 'Halaman tidak ditemukan',
    description: 'Halaman yang Anda cari tidak ada atau sudah dipindahkan.',
    actionLabel: 'Kembali ke Beranda',
    role: 'status',
  },
  'fetch-error': {
    image: fetchErrorImg,
    title: 'Data gagal dimuat',
    description: 'Ada kendala saat mengambil data. Coba muat ulang sebentar lagi.',
    actionLabel: 'Muat Ulang',
    role: 'alert',
  },
  success: {
    image: successImg,
    title: 'Berhasil',
    description: 'Perubahan Anda sudah tersimpan.',
    actionLabel: 'Selesai',
    role: 'status',
  },
}

const ALIASES: Record<string, StatusVariant> = {
  'no-search-result': 'no-result',
  processing: 'creating-data',
  'server-error': 'fetch-error',
}

export function resolveVariant(variant: StatusVariantAlias): StatusVariant {
  return ALIASES[variant] ?? (variant as StatusVariant)
}

/**
 * Pilih varian error yang sesuai: offline / timeout -> `offline-error`,
 * selain itu `fetch-error`.
 */
export function resolveErrorVariant(error?: unknown): 'offline-error' | 'fetch-error' {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) return 'offline-error'
  const message = error instanceof Error ? error.message : typeof error === 'string' ? error : ''
  if (/failed to fetch|network ?error|networkerror|timeout|timed out|load failed/i.test(message)) {
    return 'offline-error'
  }
  return 'fetch-error'
}
