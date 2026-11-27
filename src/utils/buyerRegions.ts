/**
 * Peringkat asal pembeli dari kolom alamat customers, sampai tingkat desa.
 * Nama desa dan kecamatan bisa kembar di daerah lain, jadi pengelompokan memakai jalur lengkapnya.
 */
export interface BuyerAddress {
  province_name?: string | null
  city_name?: string | null
  district_name?: string | null
  village_name?: string | null
}

export const REGION_LEVELS = [
  { value: 'city', field: 'city_name', label: 'Kota/Kab.', noun: 'kota/kabupaten' },
  { value: 'district', field: 'district_name', label: 'Kecamatan', noun: 'kecamatan' },
  { value: 'village', field: 'village_name', label: 'Desa/Kel.', noun: 'desa/kelurahan' },
] as const

export type RegionLevel = (typeof REGION_LEVELS)[number]['value']

export interface RegionRow {
  /** Jalur kunci dari kota sampai tingkat yang ditampilkan. */
  path: string[]
  /** Nama untuk jalur yang sama, urut dari kota. */
  names: string[]
  name: string
  /** Wilayah di atasnya, agar nama kembar bisa dibedakan. */
  context: string
  count: number
  /** Persen dari semua pembeli dalam cakupan, termasuk yang alamatnya belum lengkap. */
  share: number
  /** Peringkat kompetisi: jumlah yang sama berbagi nomor. */
  rank: number
}

export interface RegionRanking {
  rows: RegionRow[]
  total: number
  /** Pembeli yang belum mengisi alamat pada tingkat ini. */
  unfilled: number
}

const clean = (value: string | null | undefined) => (value ?? '').trim().replace(/\s+/g, ' ')
const keyOf = (value: string | null | undefined) => clean(value).toLocaleLowerCase('id-ID')

const districtLabel = (name: string) => (/^(kec\.|kecamatan)\s/i.test(name) ? name : `Kec. ${name}`)

function contextOf(address: BuyerAddress, level: RegionLevel): string {
  const city = clean(address.city_name)
  const district = clean(address.district_name)
  if (level === 'city') return clean(address.province_name)
  if (level === 'district') return city
  return [district && districtLabel(district), city].filter(Boolean).join(', ')
}

/**
 * @param scope jalur kunci wilayah induk yang sedang dibuka, misalnya [kota, kecamatan].
 */
export function rankRegions(buyers: BuyerAddress[], level: RegionLevel, scope: string[] = []): RegionRanking {
  const depth = REGION_LEVELS.findIndex((item) => item.value === level)
  const fields = REGION_LEVELS.slice(0, depth + 1).map((item) => item.field)
  const inScope = buyers.filter((buyer) => scope.every((key, index) => keyOf(buyer[REGION_LEVELS[index].field]) === key))

  const groups = new Map<string, Omit<RegionRow, 'share' | 'rank'>>()
  let unfilled = 0
  inScope.forEach((buyer) => {
    const names = fields.map((field) => clean(buyer[field]))
    if (!names[depth]) {
      unfilled += 1
      return
    }
    const path = fields.map((field) => keyOf(buyer[field]))
    const id = JSON.stringify(path)
    const group = groups.get(id)
    if (group) group.count += 1
    else groups.set(id, { path, names, name: names[depth], context: contextOf(buyer, level), count: 1 })
  })

  const sorted = [...groups.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, 'id-ID'))
  let rank = 0
  const rows = sorted.map((group, index) => {
    if (!index || group.count < sorted[index - 1].count) rank = index + 1
    return { ...group, rank, share: Math.round((group.count / inScope.length) * 100) }
  })

  return { rows, total: inScope.length, unfilled }
}
