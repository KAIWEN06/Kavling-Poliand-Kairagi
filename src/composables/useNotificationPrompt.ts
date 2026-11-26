import { roleNotificationService } from '@/services/notification/roleNotificationService'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'

const ASKED_KEY = 'poliland:notif-prompt-at'
/** Setelah ditanya, jangan tanya lagi selama seminggu. */
const COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000

function recentlyAsked() {
  try {
    return Date.now() - Number(localStorage.getItem(ASKED_KEY) ?? 0) < COOLDOWN_MS
  } catch {
    return false
  }
}

function markAsked() {
  try {
    localStorage.setItem(ASKED_KEY, String(Date.now()))
  } catch {
    // Penyimpanan tidak tersedia.
  }
}

/**
 * Meminta izin notifikasi tepat setelah pengguna melakukan sesuatu yang hasilnya
 * akan diberitahukan. Penjelasan tampil dulu; dialog sistem hanya muncul bila disetujui.
 * Tidak pernah melempar error, jadi aman dipanggil tanpa await.
 * `requested`: pengguna sendiri baru menyalakan notifikasi, jadi jeda seminggu diabaikan.
 */
export async function askNotificationPermission(reason: string, { requested = false } = {}) {
  try {
    if ((!requested && recentlyAsked()) || !(await roleNotificationService.canAskPermission())) return
    const agreed = await useConfirm().confirm({
      title: 'Aktifkan notifikasi?',
      message: reason,
      confirmText: 'Aktifkan',
      cancelText: 'Nanti saja',
      tone: 'info',
    })
    markAsked()
    if (!agreed) return
    if (await roleNotificationService.requestPermission()) await roleNotificationService.registerPush()
    else useToast().info('Notifikasi bisa diaktifkan lewat pengaturan perangkat.')
  } catch (error) {
    console.warn('[Notifikasi] Gagal meminta izin:', error)
  }
}
