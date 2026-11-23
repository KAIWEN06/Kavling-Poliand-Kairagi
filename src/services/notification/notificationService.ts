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

  switch (role) {
    case 'admin':
      if (n.category === 'survey') return lotId ? `/admin/kavling/${lotId}` : '/admin/kavling'
      if (n.category === 'spk') return spkId ? `/admin/spk/${spkId}/tinjau` : '/admin/spk'
      if (n.category === 'payment') return '/admin/keuangan'
      if (n.category === 'client' || n.category === 'transaction') {
        return customerId ? `/admin/pembeli/${customerId}` : '/admin/pembeli'
      }
      return null
    case 'marketing':
      if (n.category === 'spk') return '/marketing/pengajuan'
      if (n.category === 'payment') return '/marketing/pembayaran'
      if (n.category === 'commission') return '/marketing/komisi'
      return customerId ? `/marketing/clients/${customerId}` : '/marketing/clients'
    case 'marketing_head':
      if (n.category === 'spk') return '/kepala-marketing/spk'
      if (n.category === 'payment') return '/kepala-marketing/pembayaran'
      if (n.category === 'commission') return '/kepala-marketing/komisi'
      return customerId ? `/kepala-marketing/clients/${customerId}` : '/kepala-marketing/clients'
    case 'client':
      if (n.category === 'survey') return lotId ? `/client/kavling/${lotId}` : '/client/kavling'
      if (n.category === 'spk') return spkId ? `/client/dokumen?spk_id=${spkId}` : '/client/dokumen'
      return '/client/pembayaran'
    default:
      return null
  }
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
