import { validateName } from '@/utils/inputValidation'
import { supabase } from '@/services/config/supabase'
import type { UserRole } from '@/services/auth/authService'

export const AVATAR_BUCKET = 'client-avatars'
export const AVATAR_MAX_BYTES = 2 * 1024 * 1024
export const AVATAR_SOURCE_MAX_BYTES = 10 * 1024 * 1024
export const AVATAR_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
}

export interface MyProfile {
  id: string
  email: string
  fullName: string
  avatarUrl: string
  role: UserRole | null
  /** Hanya tersedia untuk Client (tabel customers). */
  phone: string
  createdAt: string | null
}

const ROLES: UserRole[] = ['owner', 'admin', 'marketing_head', 'marketing', 'client']

export const ROLE_LABEL: Record<UserRole, string> = {
  owner: 'Owner',
  admin: 'Admin',
  marketing_head: 'Kepala Marketing',
  marketing: 'Marketing',
  client: 'Client',
}

function toRole(value: unknown): UserRole | null {
  const role = typeof value === 'string' ? value.trim().toLowerCase() : ''
  return (ROLES as string[]).includes(role) ? (role as UserRole) : null
}

export function getInitials(name: string, fallback = '?'): string {
  const words = name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return fallback
  const first = words[0]?.[0] ?? ''
  const last = words.length > 1 ? (words[words.length - 1]?.[0] ?? '') : ''
  return (first + last).toUpperCase() || fallback
}

/** Nama aman: full_name, lalu metadata auth, lalu bagian lokal email. */
function resolveName(fullName: unknown, metaName: unknown, email: string): string {
  for (const candidate of [fullName, metaName]) {
    if (typeof candidate === 'string' && candidate.trim()) return candidate.trim()
  }
  return email ? (email.split('@')[0] ?? '') : ''
}

export const profileService = {
  async getMyProfile(): Promise<MyProfile | null> {
    const { data: sessionData } = await supabase.auth.getSession()
    const user = sessionData.session?.user
    if (!user) return null

    const { data: profile, error } = await supabase
      .from('profiles')
      .select('full_name, avatar_url, role, created_at')
      .eq('id', user.id)
      .maybeSingle()
    if (error) throw error

    const role = toRole(profile?.role)
    const email = user.email ?? ''
    let phone = ''

    if (role === 'client') {
      const { data: customer } = await supabase
        .from('customers')
        .select('phone')
        .eq('user_id', user.id)
        .maybeSingle()
      phone = customer?.phone ?? ''
    }

    return {
      id: user.id,
      email,
      fullName: resolveName(profile?.full_name, user.user_metadata?.full_name ?? user.user_metadata?.name, email),
      avatarUrl: profile?.avatar_url ?? '',
      role,
      phone,
      createdAt: profile?.created_at ?? null,
    }
  },

  async updateName(userId: string, fullName: string): Promise<void> {
    const name = fullName.trim()
    const nameProblem = validateName(name, 'Nama lengkap')
    if (nameProblem) throw new Error(nameProblem)
    if (name.length > 100) throw new Error('Nama lengkap maksimal 100 karakter.')
    // Hanya full_name yang dikirim; role dilindungi trigger di database.
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: name, updated_at: new Date().toISOString() })
      .eq('id', userId)
    if (error) throw error
  },

  async updateClientPhone(userId: string, phone: string): Promise<void> {
    const value = phone.trim()
    if (value && !/^[0-9+\-\s()]{8,20}$/.test(value)) throw new Error('Format nomor telepon tidak valid.')
    const { error } = await supabase.from('customers').update({ phone: value || null }).eq('user_id', userId)
    if (error) throw error
  },

  /** Foto asli sebelum dipotong: batas lebih longgar, hasil potongan yang divalidasi ketat. */
  validateAvatarSource(file: File): string | null {
    if (!AVATAR_TYPES[file.type]) return 'Format foto harus JPG, JPEG, PNG, atau WEBP.'
    if (file.size > AVATAR_SOURCE_MAX_BYTES) return 'Ukuran foto maksimal 10 MB.'
    if (file.size === 0) return 'File foto kosong.'
    return null
  },

  validateAvatar(file: File): string | null {
    if (!AVATAR_TYPES[file.type]) return 'Format foto harus JPG, JPEG, PNG, atau WEBP.'
    if (file.size > AVATAR_MAX_BYTES) return 'Ukuran foto maksimal 2 MB.'
    if (file.size === 0) return 'File foto kosong.'
    return null
  },

  /** Unggah ke folder `<uid>/`, simpan URL ke profiles.avatar_url, hapus file lama. */
  async uploadAvatar(userId: string, file: File, previousUrl = ''): Promise<string> {
    const invalid = this.validateAvatar(file)
    if (invalid) throw new Error(invalid)

    const ext = AVATAR_TYPES[file.type]
    const path = `${userId}/avatar-${Date.now()}.${ext}`
    const { error: uploadError } = await supabase.storage
      .from(AVATAR_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false, cacheControl: '3600' })
    if (uploadError) throw uploadError

    const { data } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path)
    const { error: updateError } = await supabase
      .from('profiles')
      .update({ avatar_url: data.publicUrl, updated_at: new Date().toISOString() })
      .eq('id', userId)
    if (updateError) {
      await supabase.storage.from(AVATAR_BUCKET).remove([path])
      throw updateError
    }

    const marker = `/${AVATAR_BUCKET}/`
    const oldIndex = previousUrl.indexOf(marker)
    if (oldIndex >= 0) {
      const oldPath = decodeURIComponent(previousUrl.slice(oldIndex + marker.length).split('?')[0] ?? '')
      if (oldPath.startsWith(`${userId}/`) && oldPath !== path) {
        void supabase.storage.from(AVATAR_BUCKET).remove([oldPath])
      }
    }
    return data.publicUrl
  },
}
