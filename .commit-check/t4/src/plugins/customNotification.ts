import { Capacitor, registerPlugin, WebPlugin, type PluginListenerHandle } from '@capacitor/core'

/** Opsi notifikasi kustom. `targetRole` & `recipientId` divalidasi di native dan di sisi web. */
export interface CustomNotificationOptions {
  /** ID unik (dipakai untuk menggantikan notifikasi yang sama). */
  id: string | number
  title: string
  message: string
  /** Label kategori/role pada layout kustom, mis. "Pembayaran". */
  badge?: string
  /** Nama file di res/raw tanpa ekstensi. Bawaan: "notif_alert". */
  soundName?: string
  /** Pola getar ms: [jeda, getar, jeda, getar, ...]. Bawaan native: [0,250,150,250,150,400]. */
  vibrationPattern?: number[]
  targetRole?: string
  recipientId?: string
  /** Rute tujuan di aplikasi saat notifikasi di-tap. */
  route?: string
  payload?: Record<string, unknown>
}

export interface NotificationClickEvent {
  id: string
  targetRole: string
  recipientId: string
  route: string
  payload: Record<string, unknown>
  clickedAt: number
}

export interface NotificationPermissionResult {
  granted: boolean
  status: 'granted' | 'denied'
}

export interface ActiveContextOptions {
  role: string
  userId: string
}

export interface CustomNotificationPlugin {
  checkAndRequestPermissions(): Promise<NotificationPermissionResult>
  /** Bawaan Capacitor: hanya membaca status izin. */
  checkPermissions(): Promise<{ notifications: 'granted' | 'denied' | 'prompt' | 'prompt-with-rationale' }>
  showCustomNotification(options: CustomNotificationOptions): Promise<{ id: string; channelId: string }>
  setActiveContext(options: ActiveContextOptions): Promise<void>
  clearActiveContext(): Promise<void>
  /** Token FCM perangkat. Reject (`push_unavailable`) bila Firebase belum dikonfigurasi. */
  getPushToken(): Promise<{ token: string }>
  deletePushToken(): Promise<void>
  addListener(
    eventName: 'pushTokenRefreshed',
    listener: (event: { token: string }) => void,
  ): Promise<PluginListenerHandle>
  addListener(
    eventName: 'notificationClicked',
    listener: (event: NotificationClickEvent) => void,
  ): Promise<PluginListenerHandle>
}

/** Fallback browser: memakai Web Notification API bila tersedia, selain itu no-op aman. */
class CustomNotificationWeb extends WebPlugin implements Omit<CustomNotificationPlugin, 'addListener'> {
  private role: string | null = null
  private userId: string | null = null

  async checkAndRequestPermissions(): Promise<NotificationPermissionResult> {
    if (typeof Notification === 'undefined') return { granted: false, status: 'denied' }
    const result = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission
    return { granted: result === 'granted', status: result === 'granted' ? 'granted' : 'denied' }
  }

  async checkPermissions() {
    // Browser tanpa Notification API tidak perlu ditanya; yang sudah ditolak juga tidak.
    const state = typeof Notification === 'undefined' ? 'unsupported' : Notification.permission
    return { notifications: state === 'default' ? ('prompt' as const) : ('granted' as const) }
  }

  async showCustomNotification(options: CustomNotificationOptions) {
    const id = String(options.id)
    if (!this.role || !this.userId) throw this.unavailable('Tidak ada user aktif.')
    if (options.targetRole && options.targetRole !== this.role) throw this.unavailable('Peran tidak sesuai.')
    if (options.recipientId && options.recipientId !== this.userId) throw this.unavailable('Penerima tidak sesuai.')
    if (typeof Notification !== 'undefined' && Notification.permission === 'granted') {
      new Notification(options.title, { body: options.message, tag: id })
    }
    return { id, channelId: 'web' }
  }

  async setActiveContext(options: ActiveContextOptions) {
    this.role = options.role
    this.userId = options.userId
  }

  async clearActiveContext() {
    this.role = null
    this.userId = null
  }

  async getPushToken(): Promise<{ token: string }> {
    throw this.unavailable('Push native hanya tersedia di aplikasi Android.')
  }

  async deletePushToken() {
    // Tidak ada token di web.
  }
}

export const CustomNotification = registerPlugin<CustomNotificationPlugin>('CustomNotification', {
  web: () => Promise.resolve(new CustomNotificationWeb() as unknown as CustomNotificationPlugin),
})

export const isNativeNotificationAvailable = () =>
  Capacitor.isNativePlatform() && Capacitor.isPluginAvailable('CustomNotification')
