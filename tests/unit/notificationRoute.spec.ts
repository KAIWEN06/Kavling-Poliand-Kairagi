import { describe, expect, it, vi } from 'vitest'

vi.mock('@/services/config/supabase', () => ({ supabase: {} }))

import {
  resolveNotificationRoute,
  withTapStamp,
  type NotificationCategory,
} from '@/services/notification/notificationService'
import type { UserRole } from '@/services/auth/authService'

function route(role: UserRole, category: NotificationCategory, type: string, data: Record<string, unknown>) {
  return resolveNotificationRoute(role, {
    id: 'n', recipient_id: 'u', category, type, priority: 'normal', title: '', body: null, data,
    created_at: '2026-11-26T00:00:00Z', read_at: null,
  })
}

describe('rute notifikasi membawa data terkait', () => {
  it.each<[UserRole, NotificationCategory, string, Record<string, unknown>, string]>([
    ['admin', 'spk', 'spk_submitted', { spk_id: 7 }, '/admin/spk?spkId=7'],
    ['admin', 'payment', 'payment_submitted', { payment_id: 3, spk_id: 7 }, '/admin/keuangan?paymentId=3'],
    ['admin', 'payment', 'booking_fee_refund_pending', { spk_id: 7, payment_id: 3 }, '/admin/spk?spkId=7&refund=1'],
    ['admin', 'payment', 'purchase_refund_pending', { customer_id: 5, transaction_id: 2 }, '/admin/pembeli/5'],
    ['admin', 'transaction', 'cancellation_requested', { customer_id: 5 }, '/admin/keuangan?tab=cancellations'],
    ['admin', 'transaction', 'lot_released', { lot_id: 9, customer_id: 5 }, '/admin/kavling/9'],
    ['admin', 'survey', 'survey_requested', { survey_id: 'abc' }, '/admin/survei?surveyId=abc'],
    ['client', 'system', 'favorite_unavailable', { lot_id: 9 }, '/client/kavling/9'],
    ['client', 'system', 'favorite_available', {}, '/client/favorit'],
    ['client', 'system', 'match_price_drop', { lot_id: 9 }, '/client/kavling/9'],
    ['marketing', 'spk', 'spk_approved', { spk_id: 7 }, '/marketing/pengajuan?spkId=7'],
    ['marketing', 'payment', 'payment_confirmed', { payment_id: 3 }, '/marketing/pembayaran?paymentId=3'],
    ['marketing', 'payment', 'booking_fee_reminder_client', { spk_id: 7 }, '/marketing/pengajuan?spkId=7'],
    ['marketing', 'commission', 'commission_paid', { commission_id: 4 }, '/marketing/komisi?commissionId=4'],
    ['marketing', 'reminder', 'installment_overdue_client', { customer_id: 5 }, '/marketing/clients/5'],
    ['marketing_head', 'spk', 'spk_submitted', { spk_id: 7 }, '/kepala-marketing/spk?spkId=7'],
    ['marketing_head', 'payment', 'payment_confirmed', { payment_id: 3 }, '/kepala-marketing/pembayaran?paymentId=3'],
    ['client', 'spk', 'spk_step_ready', { spk_id: 7 }, '/client/dokumen?spk_id=7'],
    ['client', 'payment', 'booking_fee_reminder', { spk_id: 7 }, '/client/dokumen?spk_id=7'],
    ['client', 'payment', 'payment_rejected', { payment_id: 3, spk_id: 7 }, '/client/pembayaran?paymentId=3&spkId=7'],
    ['client', 'reminder', 'installment_due_today', { transaction_id: 2 }, '/client/pembayaran?transactionId=2'],
    ['client', 'survey', 'survey_rescheduled', { lot_id: 9 }, '/client/kavling/9?survei=1'],
    ['client', 'transaction', 'cancellation_approved', { transaction_id: 2 }, '/client/pembayaran?transactionId=2&bagian=pembatalan'],
  ])('%s %s/%s', (role, category, type, data, expected) => {
    expect(route(role, category, type, data)).toBe(expected)
  })

  it('menambahkan penanda tap tanpa merusak query', () => {
    expect(withTapStamp('/a')).toMatch(/^\/a\?nt=\d+$/)
    expect(withTapStamp('/a?x=1')).toMatch(/^\/a\?x=1&nt=\d+$/)
  })
})
