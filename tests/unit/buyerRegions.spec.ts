import { describe, expect, it } from 'vitest'
import { rankRegions } from '@/utils/buyerRegions'

const manado = { province_name: 'Sulawesi Utara', city_name: 'Kota Manado' }
const buyers = [
  { ...manado, district_name: 'Mapanget', village_name: 'Kairagi Dua' },
  { ...manado, district_name: 'Mapanget', village_name: ' kairagi  dua ' },
  { ...manado, district_name: 'Mapanget', village_name: 'Paniki Bawah' },
  { ...manado, district_name: 'Tikala', village_name: null },
  { city_name: 'Kota Bitung', district_name: 'Maesa', village_name: 'Kairagi Dua' },
  { city_name: null },
]

describe('rankRegions', () => {
  it('menghitung per kota dan memisahkan alamat yang kosong', () => {
    const result = rankRegions(buyers, 'city')
    expect(result.rows.map((row) => [row.name, row.count, row.rank])).toEqual([['Kota Manado', 4, 1], ['Kota Bitung', 1, 2]])
    expect(result.rows[0].context).toBe('Sulawesi Utara')
    expect(result.rows[0].share).toBe(67)
    expect(result).toMatchObject({ total: 6, unfilled: 1 })
  })

  it('menyatukan beda huruf dan spasi, tetapi memisahkan nama desa kembar di kota lain', () => {
    const result = rankRegions(buyers, 'village')
    expect(result.rows.map((row) => [row.name, row.context, row.count, row.rank])).toEqual([
      ['Kairagi Dua', 'Kec. Mapanget, Kota Manado', 2, 1],
      ['Kairagi Dua', 'Kec. Maesa, Kota Bitung', 1, 2],
      ['Paniki Bawah', 'Kec. Mapanget, Kota Manado', 1, 2],
    ])
    expect(result.unfilled).toBe(2)
  })

  it('membatasi hitungan pada wilayah induk yang dibuka', () => {
    const [city] = rankRegions(buyers, 'city').rows
    const districts = rankRegions(buyers, 'district', city.path)
    expect(districts.total).toBe(4)
    expect(districts.rows.map((row) => [row.name, row.share])).toEqual([['Mapanget', 75], ['Tikala', 25]])
    expect(rankRegions(buyers, 'village', districts.rows[0].path).rows.map((row) => row.name)).toEqual(['Kairagi Dua', 'Paniki Bawah'])
  })
})
