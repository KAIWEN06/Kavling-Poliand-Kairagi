import { describe, expect, it } from 'vitest'
import { openBeforePpjb } from '@/utils/installmentFormat'

const schedules = (official: boolean) => [1, 2, 3].map((n) => ({
  installment_number: n,
  amount: 1_000_000,
  status: 'Pending',
  due_date_official: official,
}))
const numbers = (list: Array<{ installment_number: number }>) => list.map((s) => s.installment_number)

describe('cicilan yang terbuka sebelum PPJB', () => {
  it('menutup semua cicilan bila ada uang muka', () => {
    const list = schedules(false)
    expect(openBeforePpjb(list, list, true)).toEqual([])
  })

  it('hanya membuka cicilan pertama bila tanpa uang muka', () => {
    const list = schedules(false)
    expect(numbers(openBeforePpjb(list, list, false))).toEqual([1])
  })

  it('tidak membuka cicilan berikutnya setelah cicilan pertama lunas', () => {
    const list = schedules(false)
    expect(openBeforePpjb(list.slice(1), list, false)).toEqual([])
  })

  it('membuka semua cicilan setelah PPJB', () => {
    const list = schedules(true)
    expect(numbers(openBeforePpjb(list, list, true))).toEqual([1, 2, 3])
    expect(numbers(openBeforePpjb(list, list, false))).toEqual([1, 2, 3])
  })
})
