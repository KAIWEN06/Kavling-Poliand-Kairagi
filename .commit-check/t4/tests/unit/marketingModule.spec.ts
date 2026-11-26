import { describe, expect, test, vi } from 'vitest'

// filterClients berada di service yang meng-import klien Supabase; cukup di-mock.
vi.mock('@/services/config/supabase', () => ({ supabase: {} }))

import {
  buildWhatsappLink,
  normalizeWhatsappNumber,
  paymentStatusLabel,
  periodRange,
  scheduleStatusLabel,
  spkLabel,
} from '@/utils/marketingStatus'
import { filterClients, type ClientListItem } from '@/services/marketing/marketingCrmService'

describe('normalisasi nomor WhatsApp', () => {
  test('mengubah format lokal ke internasional', () => {
    expect(normalizeWhatsappNumber('0812-3456-7890')).toBe('6281234567890')
    expect(normalizeWhatsappNumber('+62 812 3456 7890')).toBe('6281234567890')
    expect(normalizeWhatsappNumber('81234567890')).toBe('6281234567890')
  })

  test('menolak nomor kosong atau terlalu pendek', () => {
    expect(normalizeWhatsappNumber('')).toBeNull()
    expect(normalizeWhatsappNumber(null)).toBeNull()
    expect(normalizeWhatsappNumber('0812')).toBeNull()
  })

  test('membuat link wa.me valid dengan pesan ter-encode', () => {
    expect(buildWhatsappLink('081234567890', 'Halo Bapak & Ibu')).toBe('https://wa.me/6281234567890?text=Halo%20Bapak%20%26%20Ibu')
    expect(buildWhatsappLink('', 'x')).toBeNull()
  })
})

describe('pemetaan status mengikuti sistem transaksi', () => {
  test('status SPK database dipetakan ke Menunggu/Ditolak/Terkonfirmasi', () => {
    expect(spkLabel('Submitted')).toBe('Menunggu')
    expect(spkLabel('Under Review')).toBe('Menunggu')
    expect(spkLabel('Approved')).toBe('Terkonfirmasi')
    expect(spkLabel('Rejected')).toBe('Ditolak')
    expect(spkLabel(null)).toBe('Belum ada SPK')
  })

  test('pembayaran menunggu bukan terkonfirmasi', () => {
    expect(paymentStatusLabel('Pending')).toBe('Menunggu verifikasi')
    expect(paymentStatusLabel('Confirmed')).toBe('Terkonfirmasi')
  })

  test('jadwal Pending yang lewat jatuh tempo ditampilkan terlambat', () => {
    expect(scheduleStatusLabel('Pending', '2000-01-01')).toBe('Terlambat')
    expect(scheduleStatusLabel('Paid', '2000-01-01')).toBe('Lunas')
    expect(scheduleStatusLabel('Pending', '2999-01-01')).toBe('Belum dibayar')
  })
})

describe('periode laporan', () => {
  test('rentang kustom terbalik ditukar', () => {
    expect(periodRange('custom', '2026-11-30', '2026-11-01')).toEqual({ from: '2026-11-01', to: '2026-11-30' })
  })

  test('bulan ini dimulai tanggal 1', () => {
    expect(periodRange('month').from.endsWith('-01')).toBe(true)
  })
})

describe('filterClients', () => {
  const base: ClientListItem = {
    id: 1, full_name: 'Budi Santoso', phone: '081234567890', whatsapp_phone: null, email: 'budi@mail.com',
    address: 'Jl. A', province_name: 'Sulawesi Utara', city_name: 'Kota Manado', marketing_id: 'm1',
    marketing_name: 'Asep', crm_status: 'Follow-up', last_contacted_at: null, created_at: '2026-11-10T02:00:00Z',
    interests: [{ lot_number: 'A-01', block: 'A', payment_type: 'Cash', plan_name: null, months: null }],
    latest_spk_status: 'Submitted', latest_spk_number: 'SPK-1', latest_payment_status: 'Pending', has_transaction: false,
  }
  const rows: ClientListItem[] = [
    base,
    { ...base, id: 2, full_name: 'Rina', phone: '082200000000', marketing_id: 'm2', crm_status: 'Berhasil', latest_spk_status: 'Approved', latest_payment_status: 'Confirmed', created_at: '2026-10-01T00:00:00Z', interests: [] },
  ]

  test('mencari berdasarkan nama, wilayah, kavling, dan digit nomor', () => {
    expect(filterClients(rows, { search: 'manado' }).length).toBe(2)
    expect(filterClients(rows, { search: 'a-01' }).map((r) => r.id)).toEqual([1])
    expect(filterClients(rows, { search: '0822' }).map((r) => r.id)).toEqual([2])
  })

  test('filter Marketing, status CRM, SPK, pembayaran, dan tanggal', () => {
    expect(filterClients(rows, { marketingId: 'm2' }).map((r) => r.id)).toEqual([2])
    expect(filterClients(rows, { crmStatus: 'Follow-up' }).map((r) => r.id)).toEqual([1])
    expect(filterClients(rows, { spkStatus: 'pending' }).map((r) => r.id)).toEqual([1])
    expect(filterClients(rows, { spkStatus: 'approved' }).map((r) => r.id)).toEqual([2])
    expect(filterClients(rows, { paymentStatus: 'Confirmed' }).map((r) => r.id)).toEqual([2])
    expect(filterClients(rows, { from: '2026-11-01', to: '2026-11-30' }).map((r) => r.id)).toEqual([1])
  })
})
