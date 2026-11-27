import { describe, expect, it, vi } from 'vitest'
import { spkPaymentPlan, spkStepInfo, type SpkStepKey } from '@/services/spkProcessService'

vi.mock('@/services/config/supabase', () => ({ supabase: {} }))

const steps = (...keys: SpkStepKey[]) => keys.map((key) => ({ key }))

describe('skema pembayaran tahapan SPK', () => {
  it('membedakan tunai, uang muka, dan tanpa uang muka', () => {
    expect(spkPaymentPlan(steps('ttd_spk', 'ajb'), 0)).toBe('cash')
    expect(spkPaymentPlan(steps('ttd_spk', 'ppjb'), 5_000_000)).toBe('down_payment')
    expect(spkPaymentPlan(steps('ttd_spk', 'ppjb'), 0)).toBe('no_down_payment')
    expect(spkPaymentPlan(steps('ttd_spk', 'ppjb'), null)).toBe('no_down_payment')
  })

  it('meminta tanda tangan SPK selesai sebelum langkah notaris pertama', () => {
    expect(spkStepInfo('ttd_spk', 'cash').summary).toContain('sebelum AJB')
    expect(spkStepInfo('ttd_spk', 'down_payment').summary).toContain('sebelum PPJB')
    expect(spkStepInfo('ttd_spk', 'no_down_payment').summary).toContain('sebelum PPJB')
  })

  it('menetapkan yang dibayar sampai PPJB sesuai ada tidaknya uang muka', () => {
    expect(spkStepInfo('ppjb', 'down_payment').requirement).toContain('Cukup bayar uang muka')
    expect(spkStepInfo('ppjb', 'no_down_payment').requirement).toContain('cicilan pertama harus lunas')
    expect(spkStepInfo('cicilan', 'down_payment').summary).toContain('Cicilan pertama dibayar di bulan setelah PPJB')
    expect(spkStepInfo('cicilan', 'no_down_payment').summary).toContain('Cicilan kedua dibayar di bulan setelah PPJB')
  })
})
