import { supabase } from '@/services/config/supabase'
import type { UserRole } from '@/services/auth/authService'

export type NotificationCategory = 'spk' | 'payment' | 'client' | 'transaction' | 'commission' | 'reminder' | 'survey' | 'system'
export type NotificationPriority = 'low' | 'normal' | 'high'

export interface AppNotification {
  id: string
  recipient_id: string
  category: NotificationCategory
  type: string
  priority: NotificationPriority
  title: string
  body: string | null
  data: Record<string, unknown>
  created_at: string
  read_at: string | null
}

const COLUMNS = 'id, recipient_id, category, type, priority, title, body, data, created_at, read_at'

export const notificationService = {
  async list(limit = 50): Promise<AppNotification[]> {
    const { data, error } = await supabase
      .from('notifications')
      .select(COLUMNS)
      .order('created_at', { ascending: false })
      .limit(limit)
    if (error) throw error
    return (data ?? []) as AppNotification[]
  },

  async unreadCount(): Promise<number> {
    const { count, error } = await supabase
      .from('notifications')
      .select('id', { count: 'exact', head: true })
      .is('read_at', null)
    if (error) throw error
    return count ?? 0
  },

  async markRead(id: string): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', id)
      .is('read_at', null)
    if (error) throw error
  },

  async markAllRead(): Promise<void> {
    const { error } = await supabase
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .is('read_at', null)
    if (error) throw error
  },

  /** Membuat pengingat cicilan untuk akun Client yang sedang login (idempoten). */
  async syncPaymentReminders(): Promise<void> {
    const { error } = await supabase.rpc('sync_my_payment_reminders')
    if (error) throw error
  },

  /** Pengingat survei H-1 dan hari-H untuk akun yang sedang login (idempoten, sesuai role). */
  async syncSurveyReminders(): Promise<void> {
    const { error } = await supabase.rpc('sync_my_survey_reminders')
    if (error) throw error
  },

  subscribe(
    userId: string,
    handlers: { onInsert: (n: AppNotification) => void; onUpdate: (n: AppNotification) => void },
  ) {
    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        (payload) => handlers.onInsert(payload.new as AppNotification),
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'notifications', filter: `recipient_id=eq.${userId}` },
        (payload) => handlers.onUpdate(payload.new as AppNotification),
      )
      .subscribe()
    return () => {
      void supabase.removeChannel(channel)
    }
  },
}

/**
 * Tujuan navigasi per role. Owner sengaja tidak punya rute: aturan Owner
 * ditentukan oleh branch Owner dan ditambahkan saat digabungkan.
 */
export function resolveNotificationRoute(role: UserRole | null, n: AppNotification): string | null {
  const d = n.data ?? {}
  const customerId = d.customer_id != null ? String(d.customer_id) : ''
  const spkId = d.spk_id != null ? String(d.spk_id) : ''
  const lotId = d.lot_id != null ? String(d.lot_id) : ''
  const surveyId = d.survey_id != null ? String(d.survey_id) : ''
  const paymentId = d.payment_id != null ? String(d.payment_id) : ''
  const transactionId = d.transaction_id != null ? String(d.transaction_id) : ''
  const commissionId = d.commission_id != null ? String(d.commission_id) : ''

  switch (role) {
    case 'admin':
      if (n.category === 'survey') {
        // Daftar survei menampilkan kavling dan jam; baris yang dimaksud disorot.
        return withQuery('/admin/survei', { surveyId })
      }
      // Halaman /tinjau mewajibkan transactionId, jadi notifikasi membuka detail di daftar SPK.
      if (n.category === 'spk') return withQuery('/admin/spk', { spkId })
      if (n.category === 'payment') {
        if (n.type === 'booking_fee_refund_pending' && spkId) return withQuery('/admin/spk', { spkId, refund: '1' })
        if (paymentId) return withQuery('/admin/keuangan', { paymentId })
        if (spkId) return withQuery('/admin/keuangan', { spkRequestId: spkId })
        return customerId ? `/admin/pembeli/${customerId}` : '/admin/keuangan'
      }
      if (n.type === 'cancellation_requested') return '/admin/keuangan?tab=cancellations'
      if (n.type === 'lot_released' && lotId) return `/admin/kavling/${lotId}`
      if (n.category === 'reminder' || n.category === 'client' || n.category === 'transaction') {
        return customerId ? `/admin/pembeli/${customerId}` : '/admin/pembeli'
      }
      return null
    case 'marketing':
    case 'marketing_head': {
      const base = role === 'marketing' ? '/marketing' : '/kepala-marketing'
      const spkList = role === 'marketing' ? `${base}/pengajuan` : `${base}/spk`
      if (n.category === 'spk') return withQuery(spkList, { spkId })
      if (n.category === 'payment') {
        // Pengingat tanda jadi belum punya baris pembayaran: yang terkait adalah SPK-nya.
        if (!paymentId && spkId) return withQuery(spkList, { spkId })
        return withQuery(`${base}/pembayaran`, { paymentId })
      }
      if (n.category === 'commission') return withQuery(`${base}/komisi`, { commissionId })
      return customerId ? `${base}/clients/${customerId}` : `${base}/clients`
    }
    case 'client':
      if (n.category === 'survey') return lotId ? `/client/kavling/${lotId}?survei=1` : '/client/kavling'
      // Tanda jadi diunggah dan dipantau dari detail SPK, bukan halaman pembayaran.
      if (n.category === 'spk' || (!paymentId && spkId && n.type.startsWith('booking_fee'))) {
        return withQuery('/client/dokumen', { spk_id: spkId })
      }
      return withQuery('/client/pembayaran', { paymentId, transactionId, spkId })
    default:
      return null
  }
}

function withQuery(path: string, params: Record<string, string>) {
  const query = new URLSearchParams(Object.entries(params).filter(([, value]) => value)).toString()
  return query ? `${path}?${query}` : path
}

/**
 * Penanda tiap tap. Ionic menyimpan halaman di tumpukan, jadi tanpa nilai yang berubah
 * tap kedua ke data yang sama tidak memicu halaman untuk memuat ulang dan menyorotnya.
 */
export function withTapStamp(path: string) {
  return `${path}${path.includes('?') ? '&' : '?'}nt=${Date.now()}`
}

export function formatRelativeTime(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime())
  const minute = 60_000
  if (diff < minute) return 'Baru saja'
  if (diff < 60 * minute) return `${Math.floor(diff / minute)} menit lalu`
  if (diff < 24 * 60 * minute) return `${Math.floor(diff / (60 * minute))} jam lalu`
  if (diff < 7 * 24 * 60 * minute) return `${Math.floor(diff / (24 * 60 * minute))} hari lalu`
  return new Date(iso).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}
