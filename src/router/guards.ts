import type { Router } from 'vue-router'
import { isAuthRetryableFetchError } from '@supabase/supabase-js'
import { authService, type UserRole } from '@/services/auth/authService'
import { forgetIdentity, readIdentity } from '@/services/auth/lastIdentity'
import { consumePostLoginRedirect, setPostLoginRedirect } from '@/services/auth/postLoginRedirect'
import { canAccessRoute } from '@/router/access'

// Denah milik tiap role, untuk tautan "Bagikan kavling" yang dibuka saat masih login.
const SITEPLAN_BY_ROLE: Record<Exclude<UserRole, 'client'>, string> = {
  owner: '/owner/siteplan',
  admin: '/admin/siteplan',
  marketing_head: '/kepala-marketing/siteplan',
  marketing: '/marketing/siteplan',
}

function sharedLotTarget(role: UserRole, lotId: string) {
  return role === 'client' ? `/client/kavling/${lotId}` : { path: SITEPLAN_BY_ROLE[role], query: { kavling: lotId } }
}

export function setupAuthGuards(router: Router) {
  router.beforeEach(async (to, from) => {
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
    const requiredRole = to.matched
      .map((record) => record.meta.role)
      .find((role): role is string => typeof role === 'string')
    // publicOnly: layar masuk/daftar. guestSite: situs publik untuk pengunjung tanpa akun.
    const isPublicOnly = to.matched.some((record) => record.meta.publicOnly)
    const isGuestSite = to.matched.some((record) => record.meta.guestSite)

    let userId: string | undefined
    let offlineRole: UserRole | undefined
    try {
      const session = await authService.getSession()
      userId = session?.user.id
      if (!session) forgetIdentity()
    } catch (error) {
      // Token gagal diperbarui karena jaringan: sesi masih tersimpan, pengguna belum keluar.
      const known = isAuthRetryableFetchError(error) ? readIdentity() : null
      if (!known) {
        // If session lookup fails, do not grant access to protected routes.
        if (requiresAuth) return { name: 'Login', query: { redirect: to.fullPath } }
        return true
      }
      userId = known.userId
      offlineRole = known.role
    }

    if (requiresAuth && !userId) {
      // Setelah login, Client kembali ke halaman yang tadi dituju (hanya rute /client/ yang diterima).
      setPostLoginRedirect(to.fullPath)
      return { name: 'Login', query: { redirect: to.fullPath } }
    }

    if (!userId) return true

    const id = userId
    const lookupRole = async () => offlineRole ?? (await authService.getUserRole(id))

    // Pengguna yang masih login tidak boleh mendarat di halaman publik.
    // Reset-password and OAuth callback are intentionally not marked publicOnly.
    if (isPublicOnly || isGuestSite) {
      try {
        const role = await lookupRole()
        const home = authService.getRoleHomePath(role)
        if (home) {
          // Pengecualian: Admin yang membuka "Lihat di situs web" dari halaman Konten.
          if (isGuestSite && role === 'admin') {
            if (to.query.from === 'cms') return true
            if (from.query.from === 'cms') {
              // Pindah menu di dalam pratinjau tetap dihitung sebagai pratinjau.
              return { path: to.path, hash: to.hash, query: { ...to.query, from: 'cms', tab: from.query.tab } }
            }
          }
          const lotId = String(to.query.kavling ?? '')
          if (role && to.path === '/siteplan' && /^\d+$/.test(lotId)) return sharedLotTarget(role, lotId)
          return consumePostLoginRedirect(role) ?? home
        }
        // Akun tanpa role tetap boleh melihat situs publik.
        if (isGuestSite) return true
        // An authenticated user without a role must be able to see the login error.
        if (to.name !== 'Login') return { name: 'Login', query: { error: 'role_missing' } }
      } catch {
        if (isGuestSite) return true
        if (to.name !== 'Login') return { name: 'Login', query: { error: 'role_lookup_failed' } }
      }
      return true
    }

    if (requiredRole) {
      try {
        const role = await lookupRole()
        if (!role) return { name: 'Login', query: { error: 'role_missing' } }
        // Owner punya berandanya sendiri; tombol "kembali ke beranda" di halaman Admin diarahkan ke sana.
        if (role === 'owner' && to.name === 'BerandaAdmin') return '/beranda-owner'
        if (!canAccessRoute(role, requiredRole, to.name)) {
          return authService.getRoleHomePath(role) ?? { name: 'Login' }
        }
      } catch {
        return { name: 'Login', query: { error: 'role_lookup_failed' } }
      }
    }

    return true
  })
}
