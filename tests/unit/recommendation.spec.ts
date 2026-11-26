import { describe, expect, it, vi } from 'vitest'

vi.mock('@/services/config/supabase', () => ({ supabase: {} }))

import { matchReason, type LotMatch } from '@/services/recommendationService'

const match = (over: Partial<LotMatch>): LotMatch => ({
  lotId: 2, seedLotNumber: '12', seedKind: 'favorite', traits: ['price'], ...over,
})

describe('alasan rekomendasi', () => {
  it.each<[Partial<LotMatch>, string]>([
    [{ traits: ['price', 'area', 'block'] }, 'Harga dan luas mirip kavling 12 yang Anda simpan'],
    [{ traits: ['area'], seedKind: 'viewed' }, 'Luas mirip kavling 12 yang Anda lihat'],
    [{ traits: ['price'], seedKind: 'owned' }, 'Harga mirip kavling 12 pilihan Anda'],
    [{ traits: ['facility', 'block'] }, 'Fasilitas dekatnya sama dengan kavling 12 yang Anda simpan'],
    [{ traits: ['block'], seedKind: 'viewed' }, 'Satu blok dengan kavling 12 yang Anda lihat'],
    [{ traits: ['price', 'area'], seedKind: 'similar' }, 'Harga dan luas mirip'],
    [{ traits: ['block'], seedKind: 'similar' }, 'Satu blok'],
  ])('%o', (over, expected) => {
    expect(matchReason(match(over))).toBe(expected)
  })
})
