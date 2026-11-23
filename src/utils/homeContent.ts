/**
 * Pengaturan teks Beranda yang disimpan sebagai baris di tabel `contacts` (kunci unik, nilai teks/JSON).
 * Tidak ada nilai bawaan di sini: kalau datanya kosong, halaman publik menyembunyikan bagian tersebut.
 */
export const HOME_KEYS = {
  highlights: 'home_highlights',
  aboutPoints: 'about_points',
  aboutDescription: 'about_description',
  ctaTitle: 'cta_title',
  ctaText: 'cta_text',
} as const

export interface HomeHighlight { icon: string; value: string; label: string }

function parseJson(raw: unknown): unknown {
  if (typeof raw !== 'string') return raw
  try { return JSON.parse(raw) } catch { return null }
}

export function parseHighlights(raw: unknown): HomeHighlight[] {
  const data = parseJson(raw)
  if (!Array.isArray(data)) return []
  return data
    .map((item: any) => ({
      icon: String(item?.icon ?? 'shield'),
      value: String(item?.value ?? '').trim(),
      label: String(item?.label ?? '').trim(),
    }))
    .filter((item) => item.value && item.label)
}

export function parsePoints(raw: unknown): string[] {
  const data = parseJson(raw)
  if (!Array.isArray(data)) return []
  return data.map((item) => String(item ?? '').trim()).filter(Boolean)
}

/** Ubah nomor WhatsApp/telepon bebas format menjadi digit berawalan 62. Kosong jika tidak ada angka. */
export function toWaNumber(value: string | null | undefined): string {
  const digits = String(value ?? '').replace(/\D/g, '')
  if (!digits) return ''
  return digits.startsWith('0') ? `62${digits.slice(1)}` : digits
}
