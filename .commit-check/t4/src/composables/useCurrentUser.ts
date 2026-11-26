import { computed, readonly, ref } from 'vue'
import { supabase } from '@/services/config/supabase'
import { profileService, ROLE_LABEL, type MyProfile } from '@/services/profile/profileService'

/**
 * State pengguna global (singleton). Header, menu, halaman profil, dan
 * halaman lain membaca sumber yang sama sehingga avatar/nama langsung
 * diperbarui di seluruh aplikasi tanpa login ulang.
 */
const profile = ref<MyProfile | null>(null)
const loading = ref(false)
let initialized = false
let inflight: Promise<void> | null = null
const clearListeners = new Set<() => void>()
const loadListeners = new Set<(p: MyProfile) => void>()

async function refresh(): Promise<void> {
  if (inflight) return inflight
  loading.value = true
  inflight = (async () => {
    try {
      profile.value = await profileService.getMyProfile()
      if (profile.value) loadListeners.forEach((fn) => fn(profile.value as MyProfile))
    } catch (error) {
      console.error('[Profil] Gagal memuat profil:', error)
    } finally {
      loading.value = false
      inflight = null
    }
  })()
  return inflight
}

function clear() {
  profile.value = null
  clearListeners.forEach((fn) => fn())
}

function init() {
  if (initialized) return
  initialized = true
  supabase.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_OUT' || !session) {
      clear()
    } else if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
      // Ditunda agar tidak memanggil Supabase di dalam callback auth.
      setTimeout(() => void refresh(), 0)
    }
  })
  void refresh()
}

export function onProfileCleared(fn: () => void) {
  clearListeners.add(fn)
}
export function onProfileLoaded(fn: (p: MyProfile) => void) {
  loadListeners.add(fn)
}

export function useCurrentUser() {
  init()
  const displayName = computed(() => profile.value?.fullName || 'Pengguna')
  const firstName = computed(() => displayName.value.split(/\s+/)[0] ?? 'Pengguna')
  const roleLabel = computed(() => (profile.value?.role ? ROLE_LABEL[profile.value.role] : ''))

  function patch(partial: Partial<MyProfile>) {
    if (profile.value) profile.value = { ...profile.value, ...partial }
  }

  return {
    profile: readonly(profile),
    loading: readonly(loading),
    displayName,
    firstName,
    roleLabel,
    refresh,
    patch,
  }
}
