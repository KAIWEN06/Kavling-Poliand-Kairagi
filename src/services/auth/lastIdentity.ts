/**
 * Role terakhir yang berhasil dibaca, agar sinyal putus tidak melempar pengguna
 * yang masih login ke halaman publik. Hanya untuk menentukan halaman;
 * akses data tetap dijaga RLS di database.
 */
import type { UserRole } from '@/services/auth/authService'

const KEY = 'poliland_last_identity'

export interface LastIdentity {
  userId: string
  role: UserRole
}

export function readIdentity(): LastIdentity | null {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) ?? 'null') as LastIdentity | null
    return parsed?.userId && parsed.role ? parsed : null
  } catch {
    return null
  }
}

export function rememberIdentity(identity: LastIdentity): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(identity))
  } catch {
    // Tanpa penyimpanan, role selalu dibaca dari jaringan.
  }
}

export function forgetIdentity(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // diabaikan
  }
}
