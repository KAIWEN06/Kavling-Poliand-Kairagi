import type { Router } from 'vue-router'
import { authService } from '@/services/auth/authService'

export function setupAuthGuards(router: Router) {
  router.beforeEach(async (to) => {
    const requiresAuth = to.matched.some((record) => record.meta.requiresAuth)
    const requiredRole = to.matched
      .map((record) => record.meta.role)
      .find((role): role is string => typeof role === 'string')
    const isPublicOnly = to.matched.some((record) => record.meta.publicOnly)

    let session
    try {
      session = await authService.getSession()
    } catch {
      // If session lookup fails, do not grant access to protected routes.
      if (requiresAuth) return { name: 'Login', query: { redirect: to.fullPath } }
      return true
    }

    if (requiresAuth && !session) {
      return { name: 'Login', query: { redirect: to.fullPath } }
    }

   
    if (!session) return true

    // Halaman pendaftaran selalu dapat dibuka tanpa pemeriksaan role.
    // Ini mencegah pengguna diarahkan kembali ke login saat membuka register.
    if (to.name === 'Register') {
      return true
    }

    // Login and forgot-password pages should not trap an already authenticated user.
    // Reset-password and OAuth callback are intentionally not marked publicOnly.
    if (isPublicOnly) {
      try {
        const role = await authService.getUserRole(session.user.id)
        const home = authService.getRoleHomePath(role)
        if (home) return home
        // An authenticated user without a role must be able to see the login error.
        if (to.name !== 'Login') return { name: 'Login', query: { error: 'role_missing' } }
      } catch {
        if (to.name !== 'Login') return { name: 'Login', query: { error: 'role_lookup_failed' } }
      }
      return true
    }

    if (requiredRole) {
      try {
        const role = await authService.getUserRole(session.user.id)
        if (!role) return { name: 'Login', query: { error: 'role_missing' } }
        if (role !== requiredRole) {
          return authService.getRoleHomePath(role) ?? { name: 'Login' }
        }
      } catch {
        return { name: 'Login', query: { error: 'role_lookup_failed' } }
      }
    }

    return true
  })
}
