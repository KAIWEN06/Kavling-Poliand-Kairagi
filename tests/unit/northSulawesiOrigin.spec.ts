import { describe, expect, test } from 'vitest'
import { getNorthSulawesiOrigin } from '@/utils/northSulawesiOrigin'

describe('getNorthSulawesiOrigin', () => {
  test('normalizes known abbreviations and a one-character typo', () => {
    expect(getNorthSulawesiOrigin('dndengan dlm, Manado')).toBe('Dendengan Dalam')
  })

  test('keeps distinct localities separate', () => {
    expect(getNorthSulawesiOrigin('Dendengan Dalam, Paal Dua')).toBe('Dendengan Dalam')
    expect(getNorthSulawesiOrigin('Dendengan Luar, Paal Dua')).toBe('Dendengan Luar')
  })

  test('recognizes official administrative areas in North Sulawesi', () => {
    expect(getNorthSulawesiOrigin('Kota Manado')).toBe('Manado')
    expect(getNorthSulawesiOrigin('Kabupaten Minahasa Utara')).toBe('Minahasa Utara')
  })

  test('ignores text that does not match a known locality', () => {
    expect(getNorthSulawesiOrigin('32234')).toBeNull()
    expect(getNorthSulawesiOrigin('Alamat asal-asalan')).toBeNull()
  })
})
