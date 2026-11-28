import { describe, expect, it } from 'vitest'
import { clientDraftColumns, emptyClientDraft, validateClientDraft, type ClientDraftRules } from '@/utils/clientDraft'
import { addressFromRecord, composeFullAddress, emptyAddress, keepSavedAddress, spkAddressGaps } from '@/utils/address'

const rules: ClientDraftRules = { assignee: 'self', interest: 'optional' }
const city = { province_code: '71', province_name: 'Sulawesi Utara', city_code: '71.71', city_name: 'Kota Manado' }

function firstContact() {
  const draft = emptyClientDraft()
  draft.full_name = 'Budi'
  draft.phone = '081234567890'
  draft.address = { ...emptyAddress(), ...city }
  return draft
}

describe('tambah klien pada kontak pertama', () => {
  it('cukup nama, nomor HP, dan kabupaten/kota', () => {
    expect(validateClientDraft(firstContact(), rules)).toBeNull()
  })

  it('tetap meminta kabupaten/kota', () => {
    const draft = firstContact()
    draft.address = { ...draft.address, city_code: '', city_name: '' }
    expect(validateClientDraft(draft, rules)).toBe('Lengkapi alamat: Kabupaten/Kota.')
  })

  it('tidak menyalin gabungan wilayah ke detail alamat', () => {
    const columns = clientDraftColumns(firstContact())
    expect(columns.address).toBe('Kota Manado, Sulawesi Utara, Indonesia')
    expect(columns.street_address).toBeNull()
    expect(addressFromRecord(columns).street_address).toBe('')
  })

  it('tidak menganggap negara bawaan sebagai alamat', () => {
    expect(composeFullAddress(emptyAddress())).toBe('')
  })
})

describe('alamat sebelum SPK', () => {
  it('menahan alamat yang baru sampai kabupaten/kota', () => {
    expect(spkAddressGaps(clientDraftColumns(firstContact()))).toEqual(['Kecamatan', 'Desa/Kelurahan', 'Detail alamat'])
  })

  it('menerima data lama berupa teks bebas', () => {
    expect(spkAddressGaps({ address: 'Jl. Kairagi 1, Manado', province_code: null, street_address: null })).toEqual([])
  })

  it('menahan alamat kosong', () => {
    expect(spkAddressGaps({ address: null, province_code: null, street_address: null })).toEqual(['Alamat'])
  })
})

describe('menautkan data yang dicatat Marketing', () => {
  const saved = clientDraftColumns(firstContact())

  it('tidak menghapus wilayah lama saat Client mengosongkan alamat', () => {
    expect(keepSavedAddress(emptyAddress(), saved)).toMatchObject(city)
  })

  it('menambahkan detail yang diketik Client ke wilayah lama', () => {
    const typed = { ...emptyAddress(), street_address: 'Jl. Kairagi 1' }
    expect(keepSavedAddress(typed, saved)).toMatchObject({ ...city, street_address: 'Jl. Kairagi 1' })
  })

  it('mengikuti Client yang memilih wilayah lain', () => {
    const typed = { ...emptyAddress(), province_code: '31', province_name: 'DKI Jakarta' }
    expect(keepSavedAddress(typed, saved)).toBe(typed)
  })
})
