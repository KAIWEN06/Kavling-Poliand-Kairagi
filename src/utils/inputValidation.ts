/**
 * Aturan input terpusat.
 *
 * - `sanitize*`  : membersihkan nilai saat mengetik (dipakai oleh inputGuard).
 * - `validate*`  : memeriksa nilai final saat submit; mengembalikan pesan error
 *                  (string) atau `null` bila valid.
 */

export type InputKind = 'name' | 'phone' | 'email' | 'nik' | 'digits' | 'decimal' | 'free'

export const INPUT_LIMITS = {
  name: 100,
  email: 254,
  phoneDigitsMax: 15,
  phoneDigitsMin: 9,
  nik: 16,
  digits: 20,
} as const

const EMAIL_PATTERN = /^[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)*\.[A-Za-z]{2,}$/
// Huruf (semua bahasa), spasi, apostrof, titik, tanda hubung.
const NAME_DISALLOWED = /[^\p{L}\p{M}\s'’.\-]/gu
const NAME_PATTERN = /^[\p{L}\p{M}]+(?:[\p{L}\p{M}\s'’.\-]*[\p{L}\p{M}.])?$/u

export function sanitizeName(value: string): string {
  return value
    .replace(NAME_DISALLOWED, '')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s'’.\-]+/, '')
    .slice(0, INPUT_LIMITS.name)
}

export function sanitizePhone(value: string): string {
  const hasPlus = value.trimStart().startsWith('+')
  const digits = value.replace(/\D/g, '').slice(0, INPUT_LIMITS.phoneDigitsMax)
  return hasPlus ? `+${digits}` : digits
}

export function sanitizeEmail(value: string): string {
  return value.replace(/\s/g, '').slice(0, INPUT_LIMITS.email)
}

export function sanitizeDigits(value: string, maxLength: number = INPUT_LIMITS.digits): string {
  return value.replace(/\D/g, '').slice(0, maxLength)
}

export function sanitizeDecimal(value: string): string {
  const cleaned = value.replace(',', '.').replace(/[^\d.]/g, '')
  const [intPart, ...rest] = cleaned.split('.')
  return rest.length ? `${intPart}.${rest.join('')}` : intPart
}

export function sanitizeByKind(kind: InputKind, value: string, maxLength?: number): string {
  switch (kind) {
    case 'name': return sanitizeName(value)
    case 'phone': return sanitizePhone(value)
    case 'email': return sanitizeEmail(value)
    case 'nik': return sanitizeDigits(value, INPUT_LIMITS.nik)
    case 'digits': return sanitizeDigits(value, maxLength && maxLength > 0 ? maxLength : INPUT_LIMITS.digits)
    case 'decimal': return sanitizeDecimal(value)
    default: return value
  }
}

/* ---------- Validasi saat submit ---------- */

export function validateName(value: string, label = 'Nama', required = true): string | null {
  const v = value.trim()
  if (!v) return required ? `${label} wajib diisi.` : null
  if (v.length < 2) return `${label} minimal 2 karakter.`
  if (!NAME_PATTERN.test(v)) return `${label} hanya boleh berisi huruf.`
  return null
}

export function validateEmail(value: string, required = true): string | null {
  const v = value.trim()
  if (!v) return required ? 'Email wajib diisi.' : null
  if (v.length > INPUT_LIMITS.email || !EMAIL_PATTERN.test(v)) return 'Format email tidak valid.'
  return null
}

export function validatePhone(value: string, label = 'Nomor telepon', required = true): string | null {
  const v = value.trim()
  if (!v) return required ? `${label} wajib diisi.` : null
  if (!/^\+?\d+$/.test(v.replace(/[\s().-]/g, ''))) return `${label} hanya boleh berisi angka.`
  const digits = v.replace(/\D/g, '')
  if (digits.length < INPUT_LIMITS.phoneDigitsMin || digits.length > INPUT_LIMITS.phoneDigitsMax) {
    return `${label} harus ${INPUT_LIMITS.phoneDigitsMin}-${INPUT_LIMITS.phoneDigitsMax} digit.`
  }
  return null
}

export function validateNik(value: string, required = false): string | null {
  const v = value.trim()
  if (!v) return required ? 'NIK wajib diisi.' : null
  if (!/^\d{16}$/.test(v)) return 'NIK harus 16 digit angka.'
  return null
}

export function validatePositiveNumber(value: number | string, label = 'Nominal', required = true): string | null {
  if (value === '' || value === null || value === undefined) return required ? `${label} wajib diisi.` : null
  const n = Number(value)
  if (!Number.isFinite(n)) return `${label} harus berupa angka.`
  if (n <= 0) return `${label} harus lebih dari 0.`
  return null
}

/** Validasi data kontak pelanggan; melempar Error berisi pesan pertama yang gagal. */
export function assertCustomerFields(fields: {
  full_name: string
  phone?: string | null
  whatsapp_phone?: string | null
  email?: string | null
  nik?: string | null
}): void {
  const problem =
    validateName(fields.full_name, 'Nama lengkap')
    ?? validatePhone(fields.phone ?? '', 'Nomor telepon', false)
    ?? validatePhone(fields.whatsapp_phone ?? '', 'Nomor WhatsApp', false)
    ?? validateEmail(fields.email ?? '', false)
    ?? validateNik(fields.nik ?? '', false)
  if (problem) throw new Error(problem)
}
