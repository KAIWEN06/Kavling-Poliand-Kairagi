/**
 * Format alamat bersama untuk Client dan Marketing: urutan isian, kolom wajib,
 * dan cara menyusun alamat lengkap yang disimpan di customers.address.
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
  if (typeof record.street_address !== 'string' && typeof record.address === 'string') {
    value.street_address = record.address
  }
  return value
}

/** Detail alamat, desa, kecamatan, kota, provinsi, negara. */
export function composeFullAddress(value: AddressValue): string {
  return [
    value.street_address.trim(), value.village_name, value.district_name,
    value.city_name, value.province_name, value.country_name,
  ].filter(Boolean).join(', ')
}

/** Label kolom alamat wajib yang masih kosong. */
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
