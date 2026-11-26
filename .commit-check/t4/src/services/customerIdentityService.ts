import { supabase } from '@/services/config/supabase'
import { validateNik } from '@/utils/inputValidation'

/** Identitas sesuai KTP, dipakai untuk mengisi data pembeli di dokumen SPK. */
export interface CustomerIdentity {
  nik: string
  birthPlace: string
  /** Format YYYY-MM-DD. */
  birthDate: string
}

export interface IdentityResult {
  /** false bila migrasi tabel identitas belum dijalankan; fiturnya disembunyikan. */
  available: boolean
  identity: CustomerIdentity | null
}

const TABLE = 'customer_identities'

export const emptyIdentity = (): CustomerIdentity => ({ nik: '', birthPlace: '', birthDate: '' })

const isMissingTable = (error: { code?: string }) =>
  error.code === '42P01' || error.code === 'PGRST205'

/** Tanggal hari ini menurut jam perangkat, format YYYY-MM-DD. */
export function todayIsoDate(): string {
  const now = new Date()
  const pad = (value: number) => String(value).padStart(2, '0')
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`
}

/** Pesan galat pertama, atau null bila ketiga isian sudah valid. */
export function validateIdentity(value: CustomerIdentity): string | null {
  const nikProblem = validateNik(value.nik, true)
  if (nikProblem) return nikProblem
  const place = value.birthPlace.trim()
  if (!place) return 'Tempat lahir wajib diisi.'
  if (place.length < 2 || place.length > 100) return 'Tempat lahir harus 2-100 karakter.'
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value.birthDate)) return 'Tanggal lahir wajib diisi.'
  if (value.birthDate < '1900-01-01' || value.birthDate > todayIsoDate()) return 'Tanggal lahir tidak valid.'
  return null
}

export function formatBirthDate(value: string): string {
  if (!value) return ''
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    .format(new Date(`${value}T00:00:00Z`))
}

export async function getCustomerIdentity(customerId: number): Promise<IdentityResult> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('nik, birth_place, birth_date')
    .eq('customer_id', customerId)
    .maybeSingle()
  if (error) {
    if (isMissingTable(error)) return { available: false, identity: null }
    throw new Error(error.message)
  }
  return {
    available: true,
    identity: data ? { nik: data.nik, birthPlace: data.birth_place, birthDate: data.birth_date } : null,
  }
}

/** Baris pembeli yang tertaut ke akun yang sedang masuk. */
export async function getMyCustomerId(): Promise<number | null> {
  const { data: sessionData } = await supabase.auth.getSession()
  const userId = sessionData.session?.user.id
  if (!userId) return null
  const { data, error } = await supabase.from('customers').select('id').eq('user_id', userId).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? Number(data.id) : null
}

export async function getMyIdentity(): Promise<IdentityResult> {
  const customerId = await getMyCustomerId()
  // Tanpa baris pembeli, -1 tetap memastikan tabelnya sudah ada.
  return getCustomerIdentity(customerId ?? -1)
}

export async function saveCustomerIdentity(customerId: number, value: CustomerIdentity): Promise<void> {
  const problem = validateIdentity(value)
  if (problem) throw new Error(problem)
  const { error } = await supabase.from(TABLE).upsert(
    {
      customer_id: customerId,
      nik: value.nik.trim(),
      birth_place: value.birthPlace.trim(),
      birth_date: value.birthDate,
    },
    { onConflict: 'customer_id' },
  )
  if (error) throw new Error(`Data identitas gagal disimpan: ${error.message}`)
}

/** Dipakai formulir klien: simpan identitas milik akun yang sedang masuk. */
export async function saveMyIdentity(value: CustomerIdentity): Promise<void> {
  const customerId = await getMyCustomerId()
  if (customerId === null) {
    throw new Error('Lengkapi dan simpan data diri di halaman Akun terlebih dahulu.')
  }
  await saveCustomerIdentity(customerId, value)
}
