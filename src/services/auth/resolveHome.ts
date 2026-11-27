import type { RouteLocationRaw } from 'vue-router'
import { authService } from '@/services/auth/authService'
import { consumePostLoginRedirect } from '@/services/auth/postLoginRedirect'

/** Tujuan setelah sesi terbentuk: beranda sesuai role, atau halaman Masuk dengan alasan gagalnya. */
export async function resolveHome(userId: string): Promise<RouteLocationRaw> {
  try {
    const role = await authService.getUserRole(userId)
    const home = authService.getRoleHomePath(role)
    if (!home) return { name: 'Login', query: { error: 'role_missing' } }
    return consumePostLoginRedirect(role) ?? home
  } catch {
    return { name: 'Login', query: { error: 'role_lookup_failed' } }
  }
}
