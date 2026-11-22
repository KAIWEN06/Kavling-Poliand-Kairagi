
import { supabase } from '@/services/config/supabase'
import { Capacitor } from '@capacitor/core'
import { Browser } from '@capacitor/browser'
import type { ID } from '@/types/common'

export type UserRole = 'owner' | 'admin' | 'marketing_head' | 'marketing' | 'client'

const ROLE_HOME: Record<UserRole, string> = {
  owner: '/beranda-owner',
  admin: '/beranda-admin',
  marketing_head: '/beranda-kepala-marketing',
  marketing: '/beranda-marketing',
  client: '/beranda-client',
}

// Harus sama dengan scheme dan host yang didaftarkan di AndroidManifest.xml.
export const AUTH_CALLBACK_URL = 'com.poliland.kairagi://auth/callback'

function normalizeRole(value: unknown): UserRole | null {
  if (typeof value !== 'string') return null

  const role = value.trim().toLowerCase()

  if (
    role === 'owner' ||
    role === 'admin' ||
    role === 'marketing_head' ||
    role === 'marketing' ||
    role === 'client'
  ) {
    return role
  }

  return null
}

export const authService = {
  /**
   * Mendapatkan user yang sedang login.
   */
  async getCurrentUser() {
    const { data, error } = await supabase.auth.getUser()

    if (error) throw error

    return data.user
  },

  /**
   * Mendapatkan session user.
   */
  async getSession() {
    const { data, error } = await supabase.auth.getSession()

    if (error) throw error

    return data.session
  },

  /**
   * Login menggunakan email dan password.
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
   * Login / registrasi menggunakan Google.
   *
   * Pengguna baru akan dibuat oleh Supabase Auth.
   * Pengguna lama akan masuk ke akun yang sudah terdaftar
   * menggunakan identitas Google yang sama.
   */
  async signInWithGoogle() {
    const isNative = Capacitor.isNativePlatform()

    const redirectTo = isNative
      ? AUTH_CALLBACK_URL
      : `${window.location.origin}/auth/callback`

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        scopes: 'openid email profile',

        // Pada native, URL OAuth dibuka menggunakan Capacitor Browser.
        // Pada web, Supabase melakukan redirect browser secara otomatis.
        skipBrowserRedirect: isNative,
      },
    })

    if (error) throw error

    if (isNative) {
      if (!data.url) {
        throw new Error('URL autentikasi Google tidak tersedia.')
      }

      await Browser.open({
        url: data.url,
        presentationStyle: 'popover',
      })
    }

    return data
  },

  /**
   * Mengirim email reset password.
   */
  async sendPasswordReset(email: string) {
    const isNative = Capacitor.isNativePlatform()

    const redirectTo = isNative
      ? AUTH_CALLBACK_URL
      : `${window.location.origin}/reset-password`

    const { data, error } = await supabase.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo },
    )

    if (error) throw error

    return data
  },

  /**
   * Mengubah password user.
   */
  async updatePassword(password: string) {
    const { data, error } = await supabase.auth.updateUser({
      password,
    })

    if (error) throw error

    return data
  },

  /**
   * Logout.
   */
  async logout() {
    const { error } = await supabase.auth.signOut()

    if (error) throw error
  },

  /**
   * Mendapatkan role user dari tabel public.profiles.
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
   * Mendapatkan halaman berdasarkan role.
   */
  getRoleHomePath(
    role: UserRole | null | string,
  ): string | null {
    const normalizedRole = normalizeRole(role)

    if (!normalizedRole) return null

    return ROLE_HOME[normalizedRole]
  },
}
