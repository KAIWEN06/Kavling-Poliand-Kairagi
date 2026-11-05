import { supabase } from '@/services/config/supabase'
import type { ID } from '@/types/common'

export type UserRole = 'admin' | 'marketing' | 'client'

const ROLE_HOME: Record<UserRole, string> = {
  admin: '/beranda-admin',
  marketing: '/beranda-marketing',
  client: '/beranda-client',
}

function normalizeRole(value: unknown): UserRole | null {
  if (typeof value !== 'string') return null

  const role = value.trim().toLowerCase()

  if (
    role === 'admin' ||
    role === 'marketing' ||
    role === 'client'
  ) {
    return role
  }

  return null
}

export const authService = {
  /**
   * Mendapatkan user yang sedang login
   */
  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser()

    if (error) throw error

    return data.user
  },

  /**
   * Mendapatkan session user
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession()

    if (error) throw error

    return data.session
  },

  /**
   * Login menggunakan email dan password
   */
  async login(email: string, password: string) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    })

    if (error) throw error

    return data
  },

  /**
   * Login menggunakan Google
   */
  async signInWithGoogle() {
    const redirectTo = `${window.location.origin}/auth/callback`

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
      },
    })

    if (error) throw error

    return data
  },

  /**
   * Mengirim email reset password
   */
  async sendPasswordReset(email: string) {
    const redirectTo = `${window.location.origin}/reset-password`

    const { data, error } =
      await supabase.auth.resetPasswordForEmail(email.trim(), {
        redirectTo,
      })

    if (error) throw error

    return data
  },

  /**
   * Mengubah password user
   */
  async updatePassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({
      password,
    })

    if (error) throw error

    return data
  },

  /**
   * Logout
   */
  async logout() {
    const { error } = await supabase.auth.signOut()

    if (error) throw error
  },

  /**
   * Mendapatkan role user dari tabel public.profiles
   */
  async getUserRole(userId: ID): Promise<UserRole | null> {
    const { data, error } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', String(userId))
      .maybeSingle()

    if (error) throw error

    return normalizeRole(data?.role)
  },

  /**
   * Mendapatkan halaman berdasarkan role
   */
  getRoleHomePath(
    role: UserRole | null | string
  ): string | null {
    if (
      role === 'admin' ||
      role === 'marketing' ||
      role === 'client'
    ) {
      return ROLE_HOME[role]
    }

    return null
  },
}