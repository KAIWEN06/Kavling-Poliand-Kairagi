import { Capacitor, type PluginListenerHandle } from '@capacitor/core'
import { CustomNotification, type NotificationClickEvent } from '@/plugins/customNotification'
import { authService, type UserRole } from '@/services/auth/authService'
import { ROLE_LABEL } from '@/services/profile/profileService'
import {
  notificationService,
  resolveNotificationRoute,
  withTapStamp,
  type AppNotification,
  type NotificationCategory,
} from '@/services/notification/notificationService'
import { useToast } from '@/composables/useToast'
import { supabase } from '@/services/config/supabase'

/**
 * Jembatan notifikasi native per role.
 *
 * - Hanya ada satu konteks aktif (user + role). Notifikasi untuk user/role lain ditolak
 *   di sini dan sekali lagi di native (CustomNotificationPlugin.kt).
 * - Login / ganti role / logout memanggil activate() / deactivate(); keduanya mengganti
 *   konteks lama, mengosongkan daftar "sudah tampil", dan membersihkan tray native.
 * - Listener klik dipasang SEKALI (init) dan selalu membaca konteks terbaru, sehingga
 *   tidak ada listener ganda atau state role lama yang tertinggal.
 */

interface ActiveContext {
  userId: string
  role: UserRole
}

const PENDING_KEY = 'poliland_pending_notification_click'
const PENDING_TTL_MS = 15 * 60 * 1000
const MAX_SHOWN = 200
const SEEN_KEY_PREFIX = 'poliland_notif_seen_'
const CATCH_UP_WINDOW_MS = 24 * 60 * 60 * 1000
const CATCH_UP_MAX = 5

const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  spk: 'SPK',
  payment: 'Pembayaran',
  client: 'Klien',
  transaction: 'Transaksi',
  commission: 'Komisi',
  reminder: 'Pengingat',
  survey: 'Survei',
  system: 'Info',
}

const PATTERN_NORMAL = [0, 250, 150, 250, 150, 400]
const PATTERN_HIGH = [0, 400, 150, 400, 150, 400, 150, 600]

let ctx: ActiveContext | null = null
let initialized = false
let clickHandle: PluginListenerHandle | null = null
let tokenHandle: PluginListenerHandle | null = null
let registeredToken: string | null = null
let permissionAsked = false
const shown = new Set<string>()

function isNative() {
  return Capacitor.isNativePlatform()
}

// ------------------------------------------------------------------ pending

interface PendingClick {
  event: NotificationClickEvent
  savedAt: number
}

function savePending(event: NotificationClickEvent) {
  try {
    localStorage.setItem(PENDING_KEY, JSON.stringify({ event, savedAt: Date.now() } satisfies PendingClick))
  } catch {
    // Penyimpanan tidak tersedia; klik hanya berlaku saat sesi aktif.
  }
}

function takePending(): NotificationClickEvent | null {
  try {
    const raw = localStorage.getItem(PENDING_KEY)
    localStorage.removeItem(PENDING_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as PendingClick
    if (!parsed?.event || Date.now() - parsed.savedAt > PENDING_TTL_MS) return null
    return parsed.event
  } catch {
    return null
  }
}

// -------------------------------------------------------------------- rute

/** Rute dari notifikasi hanya dipakai jika ada, bukan 404, dan boleh diakses role aktif. */
async function safeRouteFor(role: UserRole, requested: string | undefined | null) {
  const home = authService.getRoleHomePath(role)
  if (!requested) return home
  const { default: router } = await import('@/router')
  const resolved = router.resolve(requested)
  if (!resolved.matched.length || resolved.name === 'NotFound') return home
  const required = resolved.matched
    .map((record) => record.meta.role)
    .find((value): value is string => typeof value === 'string')
  const allowed = !required || required === role || (required === 'admin' && role === 'owner')
  return allowed ? requested : home
}

/** Layar pembuka tidak boleh tertinggal di bawah tujuan: tombol Back harus kembali ke beranda. */
const ENTRY_ROUTES = new Set(['Splash', 'Welcome', 'Login'])

async function goTo(path: string | null, home?: string | null) {
  if (!path) return
  const { default: router } = await import('@/router')
  await router.isReady()
  if (home && ENTRY_ROUTES.has(String(router.currentRoute.value.name))) {
    await router.replace(home)
    if (path === home) return
  }
  await router.push(withTapStamp(path))
}

// -------------------------------------------------------------------- klik

async function consumeClick(event: NotificationClickEvent) {
  const current = ctx
  if (!current) return
  const wrongUser = event.recipientId && event.recipientId !== current.userId
  const wrongRole = event.targetRole && event.targetRole !== current.role
  if (wrongUser || wrongRole) {
    const label = ROLE_LABEL[event.targetRole as UserRole] ?? 'akun lain'
    useToast().info(`Notifikasi tersebut ditujukan untuk ${label}. Masuk dengan akun yang sesuai untuk membukanya.`)
    return
  }
  // Tap dari luar aplikasi sama dengan membuka notifikasi di dalam aplikasi: tandai dibaca.
  const notificationId = String(event.payload?.notificationId ?? event.id)
  void notificationService.markRead(notificationId).catch(() => undefined)
  const target = await safeRouteFor(current.role, event.route || routeFromPayload(current.role, event))
  await goTo(target, authService.getRoleHomePath(current.role))
}

/** Push dari server tidak membawa rute; hitung dari kategori & data sesuai role aktif. */
function routeFromPayload(role: UserRole, event: NotificationClickEvent): string | null {
  const p = event.payload ?? {}
  const category = typeof p.category === 'string' ? (p.category as NotificationCategory) : null
  if (!category) return null
  return resolveNotificationRoute(role, {
    id: String(p.notificationId ?? event.id),
    recipient_id: event.recipientId,
    category,
    type: String(p.type ?? ''),
    priority: 'normal',
    title: '',
    body: null,
    data: p,
    created_at: new Date().toISOString(),
    read_at: null,
  })
}

async function registerPushToken(token: string) {
  if (!ctx || registeredToken === token) return
  const { error } = await supabase.rpc('register_device_token', { p_token: token, p_platform: 'android' })
  if (error) throw error
  registeredToken = token
}

async function handleClick(event: NotificationClickEvent) {
  if (ctx) {
    await consumeClick(event)
    return
  }
  // Aplikasi baru dibuka / belum login: simpan, lalu proses setelah profil termuat.
  savePending(event)
  try {
    const session = await authService.getSession()
    if (!session) await goTo('/login')
  } catch {
    await goTo('/login')
  }
}

// ----------------------------------------------------------------- publik

export const roleNotificationService = {
  /** Pasang listener klik native satu kali. Aman dipanggil berulang. */
  async init() {
    if (initialized) return
    initialized = true
    try {
      clickHandle = await CustomNotification.addListener('notificationClicked', (event) => {
        void handleClick(event)
      })
      tokenHandle = await CustomNotification.addListener('pushTokenRefreshed', ({ token }) => {
        registerPushToken(token).catch((e) => console.warn('[Push] Gagal mendaftarkan token baru:', e))
      })
    } catch (error) {
      initialized = false
      console.error('[Notifikasi native] Gagal memasang listener klik:', error)
    }
  },

  /**
   * Daftarkan token FCM ke server agar notifikasi tetap tiba saat aplikasi ditutup.
   * Gagal senyap bila Firebase belum dikonfigurasi (google-services.json belum ada).
   */
  async registerPush() {
    if (!isNative() || !ctx) return
    try {
      const { token } = await CustomNotification.getPushToken()
      await registerPushToken(token)
    } catch (error) {
      console.warn('[Push] Tidak aktif:', error)
    }
  },

  /** Dipanggil SEBELUM signOut (butuh sesi) agar perangkat berhenti menerima push akun ini. */
  async unregisterPush() {
    if (!isNative()) return
    try {
      const { token } = await CustomNotification.getPushToken()
      await supabase.rpc('unregister_device_token', { p_token: token })
    } catch (error) {
      console.warn('[Push] Gagal membatalkan token:', error)
    }
    registeredToken = null
    await CustomNotification.deletePushToken().catch(() => undefined)
  },

  /** Lepas listener (dipakai pengujian / pembersihan penuh). */
  async dispose() {
    await clickHandle?.remove()
    await tokenHandle?.remove()
    clickHandle = null
    tokenHandle = null
    initialized = false
  },

  /** Meminta izin POST_NOTIFICATIONS (Android 13+). */
  async requestPermission() {
    try {
      return (await CustomNotification.checkAndRequestPermissions()).granted
    } catch (error) {
      console.error('[Notifikasi native] Gagal memeriksa izin:', error)
      return false
    }
  },

  /** Login atau pergantian role/user: menimpa konteks lama sepenuhnya. */
  async activate(userId: string, role: UserRole) {
    await this.init()
    shown.clear()
    ctx = { userId, role }
    try {
      await CustomNotification.setActiveContext({ userId, role })
    } catch (error) {
      console.error('[Notifikasi native] Gagal menetapkan konteks:', error)
    }
    if (!permissionAsked) {
      permissionAsked = true
      // Izin dulu, baru token push (tanpa izin Android 13+ push tidak bisa ditampilkan).
      void this.requestPermission().then(() => this.registerPush())
    } else {
      void this.registerPush()
    }
    const pending = takePending()
    // Beri waktu halaman login/splash selesai mengarahkan ke beranda sebelum pindah rute.
    if (pending) setTimeout(() => void consumeClick(pending), 400)
  },

  /** Logout / profil dibersihkan: tidak ada konteks, tray native dikosongkan. */
  async deactivate() {
    ctx = null
    registeredToken = null
    shown.clear()
    try {
      await CustomNotification.clearActiveContext()
    } catch (error) {
      console.error('[Notifikasi native] Gagal membersihkan konteks:', error)
    }
  },

  /** Tampilkan notifikasi dari baris tabel notifications bila milik user & role aktif. */
  async notify(n: AppNotification) {
    const current = ctx
    if (!current || n.recipient_id !== current.userId || n.read_at || shown.has(n.id)) return false
    shown.add(n.id)
    // Yang sudah dibunyikan tidak diputar ulang oleh catchUp setelah proses aplikasi dimulai ulang.
    try {
      const key = `${SEEN_KEY_PREFIX}${current.userId}`
      const stamp = new Date(n.created_at).getTime() || 0
      if (stamp > Number(localStorage.getItem(key) ?? 0)) localStorage.setItem(key, String(stamp))
    } catch {
      // Penyimpanan tidak tersedia.
    }
    if (shown.size > MAX_SHOWN) shown.delete(shown.values().next().value as string)

    const route = resolveNotificationRoute(current.role, n) ?? authService.getRoleHomePath(current.role) ?? ''
    return this.show({
      id: n.id,
      title: n.title,
      message: n.body ?? '',
      badge: `${CATEGORY_LABEL[n.category] ?? 'Info'} • ${ROLE_LABEL[current.role]}`,
      high: n.priority === 'high',
      route,
      payload: { notificationId: n.id, category: n.category, type: n.type, ...(n.data ?? {}) },
    })
  },

  /**
   * Menampilkan notifikasi yang masuk saat aplikasi di background / tertutup dan tidak sempat
   * dibunyikan Realtime. Hanya dipakai bila push FCM tidak aktif di perangkat ini (bila aktif,
   * push yang membunyikannya; menampilkan ulang akan memunculkan notifikasi yang sudah dibuang
   * pengguna). Pembatas: hanya yang lebih baru dari penanda terakhir, maksimal 24 jam, 5 teratas.
   */
  async catchUp(list: AppNotification[]) {
    const current = ctx
    if (!current || !isNative()) return
    const markerKey = `${SEEN_KEY_PREFIX}${current.userId}`
    let marker = 0
    try {
      marker = Number(localStorage.getItem(markerKey) ?? 0) || 0
    } catch {
      marker = 0
    }
    const newest = list.reduce((max, n) => Math.max(max, new Date(n.created_at).getTime() || 0), 0)
    // Pemakaian pertama diberi penanda "sekarang"; selanjutnya hanya maju sampai notifikasi terbaru.
    const advance = marker ? Math.max(marker, newest) : Math.max(newest, Date.now())
    try {
      localStorage.setItem(markerKey, String(advance))
    } catch {
      // Penanda tidak tersimpan: replay berikutnya dibatasi 24 jam & 5 item.
    }
    // Pemakaian pertama: tidak memutar ulang riwayat lama.
    if (!marker || registeredToken) return

    const floor = Math.max(marker, Date.now() - CATCH_UP_WINDOW_MS)
    const missed = list
      .filter((n) => !n.read_at && new Date(n.created_at).getTime() > floor)
      .sort((a, b) => a.created_at.localeCompare(b.created_at))
      .slice(-CATCH_UP_MAX)
    for (const n of missed) await this.notify(n)
  },

  /** Tampilkan notifikasi untuk role aktif saat ini (mis. tombol uji coba). */
  async show(input: {
    id: string
    title: string
    message: string
    badge?: string
    high?: boolean
    route?: string
    payload?: Record<string, unknown>
  }) {
    const current = ctx
    if (!current) return false
    try {
      await CustomNotification.showCustomNotification({
        id: input.id,
        title: input.title,
        message: input.message,
        badge: input.badge ?? ROLE_LABEL[current.role],
        soundName: 'notif_alert',
        vibrationPattern: input.high ? PATTERN_HIGH : PATTERN_NORMAL,
        targetRole: current.role,
        recipientId: current.userId,
        route: input.route,
        payload: input.payload,
      })
      return true
    } catch (error) {
      // Ditolak native (role_mismatch, permission_denied, dst.) bukan kesalahan fatal.
      console.warn('[Notifikasi native] Tidak ditampilkan:', error)
      return false
    }
  },

  /** True bila berjalan di Android/iOS native (bukan browser). */
  get isNative() {
    return isNative()
  },
}
