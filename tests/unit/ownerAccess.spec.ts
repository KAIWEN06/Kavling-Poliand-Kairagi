import { describe, expect, it } from 'vitest'
import { canAccessRoute } from '@/router/access'

describe('hak akses Owner', () => {
  it('hanya membuka Akses tim di antara halaman Admin', () => {
    expect(canAccessRoute('owner', 'admin', 'AdminAksesTim')).toBe(true)
    for (const name of ['AdminKavling', 'AdminPembeli', 'AdminKeuangan', 'AdminKonten', 'AdminSiteplan']) {
      expect(canAccessRoute('owner', 'admin', name)).toBe(false)
    }
  })

  it('tidak mengubah akses peran lain', () => {
    expect(canAccessRoute('admin', 'admin', 'AdminKeuangan')).toBe(true)
    expect(canAccessRoute('admin', 'owner', 'BerandaOwner')).toBe(false)
    expect(canAccessRoute('marketing', 'admin', 'AdminAksesTim')).toBe(false)
    expect(canAccessRoute('client', undefined, 'Akun')).toBe(true)
  })
})
