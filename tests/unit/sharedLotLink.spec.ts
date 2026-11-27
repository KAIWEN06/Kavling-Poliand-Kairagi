import { afterEach, describe, expect, it, vi } from 'vitest'
import { lotShareContent, lotShareUrl, shareAsPlainText, sharedLotPath } from '@/utils/shareLot'

describe('tautan kavling', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('ikut dalam teks yang dibagikan dan disalin', () => {
    vi.stubEnv('VITE_PUBLIC_WEB_URL', 'https://contoh.test/')
    const content = lotShareContent({ id: 2, name: 'Kaveling 002', block: 'Blok A', status: 'Terjual' })
    expect(shareAsPlainText(content)).toBe(
      'Kaveling 002, Blok A di PoliLand Kairagi\nStatus: Terjual\nhttps://contoh.test/siteplan?kavling=2',
    )
  })

  it('dibaca kembali menjadi rute denah', () => {
    vi.stubEnv('VITE_PUBLIC_WEB_URL', 'https://contoh.test')
    expect(sharedLotPath(lotShareUrl(2))).toBe('/siteplan?kavling=2')
  })

  it('menolak alamat lain', () => {
    vi.stubEnv('VITE_PUBLIC_WEB_URL', 'https://contoh.test')
    expect(sharedLotPath('https://jahat.test/siteplan?kavling=2')).toBeNull()
    expect(sharedLotPath('http://contoh.test/siteplan?kavling=2')).toBeNull()
    expect(sharedLotPath('https://contoh.test/admin/spk?kavling=2')).toBeNull()
    expect(sharedLotPath('https://contoh.test/siteplan?kavling=2x')).toBeNull()
    expect(sharedLotPath('com.poliland.kairagi://auth/callback?code=abc')).toBeNull()
  })
})
