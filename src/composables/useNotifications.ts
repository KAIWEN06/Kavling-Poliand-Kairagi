import { computed, readonly, ref } from 'vue'
import { notificationService, type AppNotification } from '@/services/notification/notificationService'
import { onProfileCleared, onProfileLoaded } from '@/composables/useCurrentUser'
import { roleNotificationService } from '@/services/notification/roleNotificationService'
import type { UserRole } from '@/services/auth/authService'

/**
 * State notifikasi global (singleton) berbasis tabel public.notifications
 * + Supabase Realtime. RLS memastikan hanya baris milik pengguna yang
 * sampai ke klien, baik lewat query maupun realtime.
 */
const items = ref<AppNotification[]>([])
const unread = ref(0)
const loading = ref(false)
const error = ref('')

let activeUserId: string | null = null
let activeRole: string | null = null
let unsubscribe: (() => void) | null = null
let wired = false

async function load() {
  loading.value = true
  error.value = ''
  try {
    const [list, count] = await Promise.all([notificationService.list(50), notificationService.unreadCount()])
    items.value = list
    unread.value = count
  } catch (e) {
    console.error('[Notifikasi] Gagal memuat:', e)
    error.value = 'Notifikasi belum dapat dimuat.'
  } finally {
    loading.value = false
  }
}

function upsertLocal(n: AppNotification) {
  const index = items.value.findIndex((x) => x.id === n.id)
  if (index >= 0) items.value.splice(index, 1, n)
  else items.value = [n, ...items.value].slice(0, 100)
}

function start(userId: string, role: string | null) {
  // Role berubah pada user yang sama juga harus memulai ulang langganan & konteks native.
  if (activeUserId === userId && activeRole === role) return
  stop()
  activeUserId = userId
  activeRole = role
  if (role) void roleNotificationService.activate(userId, role as UserRole)
  unsubscribe = notificationService.subscribe(userId, {
    onInsert: (n) => {
      if (items.value.some((x) => x.id === n.id)) return
      upsertLocal(n)
      if (!n.read_at) {
        unread.value += 1
        void roleNotificationService.notify(n)
      }
    },
    onUpdate: (n) => {
      const previous = items.value.find((x) => x.id === n.id)
      upsertLocal(n)
      if (previous && !previous.read_at && n.read_at) unread.value = Math.max(0, unread.value - 1)
    },
  })

  const prepare = Promise.all([
    role === 'client' ? notificationService.syncPaymentReminders().catch(() => undefined) : undefined,
    role === 'client' || role === 'admin' || role === 'marketing'
      ? notificationService.syncSurveyReminders().catch(() => undefined)
      : undefined,
  ])
  void prepare.then(load)
}

function stop() {
  unsubscribe?.()
  unsubscribe = null
  activeUserId = null
  activeRole = null
  void roleNotificationService.deactivate()
  items.value = []
  unread.value = 0
  error.value = ''
}

async function markRead(id: string) {
  const target = items.value.find((n) => n.id === id)
  if (!target || target.read_at) return
  const stamp = new Date().toISOString()
  target.read_at = stamp
  unread.value = Math.max(0, unread.value - 1)
  try {
    await notificationService.markRead(id)
  } catch (e) {
    console.error('[Notifikasi] Gagal menandai dibaca:', e)
    target.read_at = null
    unread.value += 1
  }
}

async function markAllRead() {
  if (!unread.value) return
  const snapshot = items.value.map((n) => n.read_at)
  const previousUnread = unread.value
  const stamp = new Date().toISOString()
  items.value = items.value.map((n) => ({ ...n, read_at: n.read_at ?? stamp }))
  unread.value = 0
  try {
    await notificationService.markAllRead()
  } catch (e) {
    console.error('[Notifikasi] Gagal menandai semua dibaca:', e)
    items.value = items.value.map((n, i) => ({ ...n, read_at: snapshot[i] ?? null }))
    unread.value = previousUnread
  }
}

function wire() {
  if (wired) return
  wired = true
  onProfileLoaded((p) => start(p.id, p.role))
  onProfileCleared(stop)
  // Segarkan saat aplikasi kembali aktif (menutup celah koneksi realtime yang putus).
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && activeUserId) void load()
  })
}

export function useNotifications() {
  wire()
  const badgeLabel = computed(() => (unread.value > 99 ? '99+' : String(unread.value)))
  return {
    items: readonly(items),
    unread: readonly(unread),
    loading: readonly(loading),
    error: readonly(error),
    badgeLabel,
    reload: load,
    markRead,
    markAllRead,
  }
}
