import { describe, expect, test } from 'vitest'

import { calculateFinanceBalance } from '@/composables/useFinanceCalculations'
import { estimateInstallment, calculateLatePenalty } from '@/services/payment/paymentCalculator'

describe('calculateLatePenalty', () => {
  test('tidak mengenakan denda pada tanggal jatuh tempo atau sebelumnya', () => {
    expect(calculateLatePenalty('2026-11-10', '2026-11-10')).toMatchObject({ lateDays: 0, amount: 0 })
    expect(calculateLatePenalty('2026-11-10', '2026-11-09')).toMatchObject({ lateDays: 0, amount: 0 })
  })

  test('menghitung hari kalender H+1 dari tanggal transfer tervalidasi', () => {
    expect(calculateLatePenalty('2026-11-10', '2026-11-15')).toMatchObject({ lateDays: 5, amount: 100_000 })
  })

  test('membatasi denda maksimal Rp1.800.000', () => {
    expect(calculateLatePenalty('2026-11-10', '2027-02-08')).toMatchObject({ lateDays: 90, amount: 1_800_000, defaultReviewRequired: true })
    expect(calculateLatePenalty('2026-11-10', '2027-02-09').amount).toBe(1_800_000)
  })

  test('memicu pemeriksaan wanprestasi mulai 90 hari dan tidak sebelumnya', () => {
    expect(calculateLatePenalty('2026-11-10', '2027-02-07').defaultReviewRequired).toBe(false)
    expect(calculateLatePenalty('2026-11-10', '2027-02-08').defaultReviewRequired).toBe(true)
  })

  test('menolak tanggal kalender tidak valid', () => {
    expect(() => calculateLatePenalty('2026-02-30', '2026-03-01')).toThrow('Tanggal jatuh tempo tidak valid.')
    expect(() => calculateLatePenalty('2026-02-28', '01-03-2026')).toThrow('Tanggal transfer harus berformat YYYY-MM-DD.')
  })
})

describe('calculateFinanceBalance', () => {
  test('menjumlahkan DP dan cicilan tanpa menggandakan booking fee', () => {
    const balance = calculateFinanceBalance(
      {
        id: 1,
        lot_id: 1,
        status: 'Sold',
        payment_type: 'Installment',
        price_at_booking: 450_000_000,
        final_price: 450_000_000,
        down_payment: 45_000_000,
        booking_fee: 1_000_000,
        principal_amount: 405_000_000,
        margin_amount: 0,
        installment_total: 405_000_000,
        monthly_payment: 33_750_000,
        months: 12,
        installment_start_date: null,
        booking_date: null,
      },
      [
        { amount: 1_000_000, status: 'Confirmed', payment_category: 'Booking' },
        { amount: 45_000_000, status: 'Confirmed', payment_category: 'Down Payment' },
        { amount: 67_500_000, status: 'Confirmed', payment_category: 'Installment' },
        { amount: 33_750_000, status: 'Pending', payment_category: 'Installment' },
      ],
    )

    expect(balance.bookingFeePaid).toBe(1_000_000)
    expect(balance.principalPaid).toBe(112_500_000)
    expect(balance.totalPaid).toBe(113_500_000)
    expect(balance.obligation).toBe(450_000_000)
    expect(balance.remaining).toBe(337_500_000)
    expect(balance.progress).toBe(25)
  })

  test('mengabaikan pembayaran Pending dari total penerimaan', () => {
    const balance = calculateFinanceBalance(
      {
        id: 2,
        lot_id: 2,
        status: 'Sold',
        payment_type: 'Cash',
        price_at_booking: 300_000_000,
        final_price: 300_000_000,
        down_payment: 0,
        booking_fee: 1_000_000,
        principal_amount: 300_000_000,
        margin_amount: 0,
        installment_total: null,
        monthly_payment: null,
        months: null,
        installment_start_date: null,
        booking_date: null,
      },
      [
        { amount: 300_000_000, status: 'Confirmed', payment_category: 'Cash Purchase' },
        { amount: 300_000_000, status: 'Pending', payment_category: 'Cash Purchase' },
      ],
    )

    expect(balance.principalPaid).toBe(300_000_000)
    expect(balance.remaining).toBe(0)
    expect(balance.progress).toBe(100)
  })
})

describe('estimateInstallment (sama dengan RPC create_client_spk_request)', () => {
  test('membulatkan margin lalu membulatkan cicilan ke bawah', () => {
    expect(estimateInstallment(100_000_001, 10_000_000, 12, 10)).toEqual({
      principal: 90_000_001,
      margin: 9_000_000,
      total: 99_000_001,
      monthly: 8_250_000,
    })
  })

  test('tanpa uang muka mencicil seluruh harga', () => {
    expect(estimateInstallment(150_000_000, 0, 24, 20).monthly).toBe(7_500_000)
  })
})
