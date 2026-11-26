export interface AddressData {
  country_code: string
  country_name: string

  province_code: string | null
  province_name: string

  city_code: string | null
  city_name: string

  district_code: string | null
  district_name: string

  village_code: string | null
  village_name: string

  street_address: string
  /** Alamat lengkap untuk kompatibilitas dengan data lama. */
  address?: string | null
}

export interface Region {
  id: number
  code: string
  name: string
  level: 1 | 2 | 3 | 4
  parent_id: number | null
}
