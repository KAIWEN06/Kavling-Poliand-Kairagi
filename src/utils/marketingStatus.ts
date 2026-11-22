/**
 * Label & status bersama untuk modul Marketing dan Kepala Bagian Marketing.
 * Nilai status mengikuti constraint database; label hanya untuk tampilan.
 */

export const CRM_STATUSES = [
  'Baru',
  'Belum Dihubungi',
  'Sudah Dihubungi',
  'Follow-up',
  'Berminat',
  'Survey Lokasi',
  'Negosiasi',
  'Pengajuan',
  'Berhasil',
  'Tidak Lanjut',
] as const

export type CrmStatus = (typeof CRM_STATUSES)[number]

export type BadgeTone = 'neutral' | 'info' | 'warning' | 'success' | 'danger' | 'gold'

export const CRM_TONE: Record<CrmStatus, BadgeTone> = {
  Baru: 'info',
  'Belum Dihubungi': 'neutral',
  'Sudah Dihubungi': 'info',
  'Follow-up': 'gold',
  Berminat: 'gold',
  'Survey Lokasi': 'gold',
  Negosiasi: 'warning',
  Pengajuan: 'warning',
  Berhasil: 'success',
  'Tidak Lanjut': 'danger',
}

/** Status SPK database -> tiga status bisnis (Menunggu, Ditolak, Terkonfirmasi). */
export function spkLabel(status?: string | null): string {
  switch (status) {
    case 'Submitted':
    case 'Under Review':
      return 'Menunggu'
    case 'Approved':
      return 'Terkonfirmasi'
    case 'Rejected':
      return 'Ditolak'
    case 'Cancelled':
      return 'Dibatalkan'
    default:
      return 'Belum ada SPK'
  }
}

export function spkTone(status?: string | null): BadgeTone {
  if (status === 'Approved') return 'success'
  if (status === 'Rejected') return 'danger'
  if (status === 'Submitted' || status === 'Under Review') return 'warning'
  return 'neutral'
}

export function paymentStatusLabel(status?: string | null): string {
  switch (status) {
    case 'Pending':
      return 'Menunggu verifikasi'
    case 'Confirmed':
      return 'Terkonfirmasi'
    case 'Rejected':
      return 'Ditolak'
    case 'Needs Reupload':
      return 'Perlu unggah ulang'
    default:
      return '-'
  }
}

export function paymentStatusTone(status?: string | null): BadgeTone {
  if (status === 'Confirmed') return 'success'
  if (status === 'Rejected' || status === 'Needs Reupload') return 'danger'
  if (status === 'Pending') return 'warning'
  return 'neutral'
}

export function paymentCategoryLabel(category?: string | null): string {
  switch (category) {
    case 'Booking':
      return 'SPK (Booking Fee)'
    case 'Down Payment':
      return 'Uang Muka'
    case 'Installment':
      return 'Cicilan'
    case 'Cash Purchase':
      return 'Pelunasan Tunai'
    case 'Other':
      return 'Lainnya'
    default:
      return 'Belum diklasifikasi'
  }
}

export function scheduleStatusLabel(status: string | null | undefined, dueDate?: string | null): string {
  if (status === 'Paid') return 'Lunas'
  if (status === 'Overdue' || (status === 'Pending' && dueDate && dueDate < todayIso())) return 'Terlambat'
  return 'Belum dibayar'
}

export function scheduleStatusTone(status: string | null | undefined, dueDate?: string | null): BadgeTone {
  const label = scheduleStatusLabel(status, dueDate)
  if (label === 'Lunas') return 'success'
  if (label === 'Terlambat') return 'danger'
  return 'neutral'
}

export function transactionStatusLabel(status?: string | null): string {
  if (status === 'Booking') return 'Dipesan'
  if (status === 'Sold') return 'Terjual (lunas)'
  if (status === 'Cancelled') return 'Dibatalkan'
  return '-'
}

export function commissionStatusLabel(status?: string | null): string {
  switch (status) {
    case 'Pending':
      return 'Menunggu'
    case 'Eligible':
      return 'Disetujui'
    case 'Processing':
      return 'Diproses'
    case 'Paid':
      return 'Dibayarkan'
    case 'Cancelled':
      return 'Dibatalkan'
    default:
      return '-'
  }
}

export function commissionStatusTone(status?: string | null): BadgeTone {
  if (status === 'Paid') return 'success'
  if (status === 'Eligible' || status === 'Processing') return 'gold'
  if (status === 'Cancelled') return 'danger'
  return 'warning'
}

export function lotStatusLabel(status?: string | null): string {
  if (status === 'Available') return 'Tersedia'
  if (status === 'Booking') return 'Dipesan'
  if (status === 'Sold') return 'Terjual'
  return '-'
}

// ---------------------------------------------------------------------
// Format
// ---------------------------------------------------------------------

const rupiah = new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 })

export function formatRupiah(value: number | string | null | undefined): string {
  const n = Number(value ?? 0)
  return rupiah.format(Number.isFinite(n) ? n : 0)
}

/** Ringkas untuk kartu statistik: Rp1,2 M / Rp350 jt. */
export function formatRupiahShort(value: number | string | null | undefined): string {
  const n = Number(value ?? 0)
  if (!Number.isFinite(n)) return 'Rp0'
  const abs = Math.abs(n)
  const fmt = (v: number, unit: string) =>
    `Rp${v.toLocaleString('id-ID', { maximumFractionDigits: 1 })} ${unit}`
  if (abs >= 1e12) return fmt(n / 1e12, 'T')
  if (abs >= 1e9) return fmt(n / 1e9, 'M')
  if (abs >= 1e6) return fmt(n / 1e6, 'jt')
  return rupiah.format(n)
}

export function formatDate(value?: string | null, withTime = false): string {
  if (!value) return '-'
  const date = value.length <= 10 ? new Date(`${value}T00:00:00`) : new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(withTime ? { hour: '2-digit', minute: '2-digit', hour12: false } : {}),
  }).format(date)
}

export function formatRelative(value?: string | null): string {
  if (!value) return '-'
  const diff = Date.now() - new Date(value).getTime()
  if (!Number.isFinite(diff)) return '-'
  const minutes = Math.round(diff / 60000)
  if (minutes < 1) return 'baru saja'
  if (minutes < 60) return `${minutes} mnt lalu`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.round(hours / 24)
  if (days < 30) return `${days} hari lalu`
  return formatDate(value)
}

export function todayIso(): string {
  const date = new Date()
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export function initials(name?: string | null): string {
  return (name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase() || '?'
}

// ---------------------------------------------------------------------
// WhatsApp
// ---------------------------------------------------------------------

/** Normalisasi nomor Indonesia ke format internasional tanpa '+', mis. 6281234567890. */
export function normalizeWhatsappNumber(raw?: string | null): string | null {
  let digits = String(raw ?? '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith('0')) digits = `62${digits.slice(1)}`
  else if (digits.startsWith('8')) digits = `62${digits}`
  // Nomor seluler Indonesia: 62 + 9-13 digit.
  if (digits.startsWith('62') && (digits.length < 10 || digits.length > 15)) return null
  if (digits.length < 8 || digits.length > 15) return null
  return digits
}

export function buildWhatsappLink(raw: string | null | undefined, message = ''): string | null {
  const number = normalizeWhatsappNumber(raw)
  if (!number) return null
  const text = message.trim() ? `?text=${encodeURIComponent(message.trim())}` : ''
  return `https://wa.me/${number}${text}`
}

export function defaultWhatsappMessage(clientName?: string | null, marketingName?: string | null): string {
  const greet = clientName ? `Halo Bapak/Ibu ${clientName},` : 'Halo Bapak/Ibu,'
  const sender = marketingName ? `saya ${marketingName} dari` : 'kami dari'
  return `${greet} ${sender} PoliLand Kairagi. Kami ingin menindaklanjuti minat Anda terhadap kavling di PoliLand Kairagi. Kapan waktu yang nyaman untuk berdiskusi?`
}

// ---------------------------------------------------------------------
// Periode laporan
// ---------------------------------------------------------------------

export type PeriodPreset = 'today' | 'week' | 'month' | 'year' | 'custom'

export const PERIOD_OPTIONS: Array<{ value: PeriodPreset; label: string }> = [
  { value: 'today', label: 'Hari ini' },
  { value: 'week', label: 'Minggu ini' },
  { value: 'month', label: 'Bulan ini' },
  { value: 'year', label: 'Tahun ini' },
  { value: 'custom', label: 'Rentang tanggal' },
]

function iso(date: Date): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

export function periodRange(preset: PeriodPreset, customFrom?: string, customTo?: string): { from: string; to: string } {
  const now = new Date()
  const today = iso(now)
  if (preset === 'today') return { from: today, to: today }
  if (preset === 'week') {
    const start = new Date(now)
    const day = (start.getDay() + 6) % 7 // Senin = 0
    start.setDate(start.getDate() - day)
    return { from: iso(start), to: today }
  }
  if (preset === 'year') return { from: `${now.getFullYear()}-01-01`, to: today }
  if (preset === 'custom' && customFrom && customTo) {
    return customFrom <= customTo ? { from: customFrom, to: customTo } : { from: customTo, to: customFrom }
  }
  return { from: iso(new Date(now.getFullYear(), now.getMonth(), 1)), to: today }
}
