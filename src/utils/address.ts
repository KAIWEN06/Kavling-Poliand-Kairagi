/**
 * Format alamat bersama untuk Client dan Marketing: urutan isian, kolom wajib,
 * dan cara menyusun alamat lengkap yang disimpan di customers.address.
 *
 * Dua tingkat kelengkapan: pencatatan klien cukup sampai kabupaten/kota,
 * sedangkan SPK (booking) membutuhkan alamat lengkap.
 */

export interface AddressValue {
  country_code: string
  country_name: string
  province_code: string
  province_name: string
  city_code: string
  city_name: string
  district_code: string
  district_name: string
  village_code: string
  village_name: string
  street_address: string
}

export const COUNTRIES = [
  { code: 'ID', name: 'Indonesia' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AU', name: 'Australia' },
  { code: 'US', name: 'United States' },
  { code: 'JP', name: 'Japan' },
]

const FIELDS: Array<keyof AddressValue> = [
  'country_code', 'country_name', 'province_code', 'province_name', 'city_code', 'city_name',
  'district_code', 'district_name', 'village_code', 'village_name', 'street_address',
]

export function emptyAddress(): AddressValue {
  return {
    country_code: 'ID', country_name: 'Indonesia', province_code: '', province_name: '', city_code: '', city_name: '',
    district_code: '', district_name: '', village_code: '', village_name: '', street_address: '',
  }
}

/** Baris customers -> isian formulir. Data lama tanpa street_address memakai kolom address. */
export function addressFromRecord(record: Record<string, unknown>): AddressValue {
  const value = emptyAddress()
  for (const field of FIELDS) {
    if (typeof record[field] === 'string') value[field] = record[field] as string
  }
  /* Hanya data lama tanpa wilayah: pada data bertahap, kolom address berisi gabungan wilayah. */
  const hasRegion = Boolean(value.province_code || value.province_name)
  if (!hasRegion && typeof record.street_address !== 'string' && typeof record.address === 'string') {
    value.street_address = record.address
  }
  return value
}

/** Detail alamat, desa, kecamatan, kota, provinsi, negara. */
export function composeFullAddress(value: AddressValue): string {
  /* Negara saja (bawaan formulir) belum bisa disebut alamat. */
  if (![value.street_address, value.province_name, value.city_name].some((part) => part.trim())) return ''
  return [
    value.street_address.trim(), value.village_name, value.district_name,
    value.city_name, value.province_name, value.country_name,
  ].filter(Boolean).join(', ')
}

/** Kolom yang wajib saat klien dicatat: sampai kabupaten/kota. */
export function missingBasicAddressFields(value: AddressValue): string[] {
  const indonesia = value.country_code === 'ID'
  const missing: string[] = []
  if (!(indonesia ? value.province_code : value.province_name.trim())) {
    missing.push(indonesia ? 'Provinsi' : 'Province/State')
  }
  if (!(indonesia ? value.city_code : value.city_name.trim())) {
    missing.push(indonesia ? 'Kabupaten/Kota' : 'City')
  }
  return missing
}

/**
 * Kekurangan alamat pada baris customers sebelum SPK dibuat. Data lama yang hanya
 * punya kolom address (tanpa wilayah) dianggap lengkap.
 */
export function spkAddressGaps(record: object): string[] {
  const row = record as Record<string, unknown>
  const value = addressFromRecord(row)
  if (!value.province_code && !value.province_name) {
    return String(row.address ?? '').trim() || value.street_address.trim() ? [] : ['Alamat']
  }
  return missingAddressFields(value)
}

/**
 * Saat akun ditautkan ke data lama: wilayah tersimpan dipertahankan bila isian Client
 * belum sampai kabupaten/kota dan tidak bertentangan dengannya.
 */
export function keepSavedAddress(typed: AddressValue, record: object): AddressValue {
  const saved = addressFromRecord(record as Record<string, unknown>)
  const cityTyped = Boolean(typed.city_code || typed.city_name.trim())
  const otherProvince =
    (typed.province_code !== '' && typed.province_code !== saved.province_code) ||
    (typed.province_name.trim() !== '' && typed.province_name.trim() !== saved.province_name)
  if (cityTyped || otherProvince) return typed
  return { ...saved, street_address: typed.street_address.trim() || saved.street_address }
}

/** Label kolom alamat lengkap (syarat SPK) yang masih kosong. */
export function missingAddressFields(value: AddressValue): string[] {
  const missing: string[] = []
  if (value.country_code === 'ID') {
    if (!value.province_code) missing.push('Provinsi')
    if (!value.city_code) missing.push('Kabupaten/Kota')
    if (!value.district_code) missing.push('Kecamatan')
    if (!value.village_code) missing.push('Desa/Kelurahan')
  } else {
    if (!value.province_name.trim()) missing.push('Province/State')
    if (!value.city_name.trim()) missing.push('City')
  }
  if (!value.street_address.trim()) missing.push('Detail alamat')
  return missing
}

/** Isian formulir -> kolom tabel customers. */
export function addressColumns(value: AddressValue) {
  return {
    country_code: value.country_code,
    country_name: value.country_name,
    province_code: value.province_code || null,
    province_name: value.province_name.trim() || null,
    city_code: value.city_code || null,
    city_name: value.city_name.trim() || null,
    district_code: value.district_code || null,
    district_name: value.district_name.trim() || null,
    village_code: value.village_code || null,
    village_name: value.village_name.trim() || null,
    street_address: value.street_address.trim() || null,
    address: composeFullAddress(value) || null,
  }
}
