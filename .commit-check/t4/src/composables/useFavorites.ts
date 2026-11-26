import { readonly, ref, shallowRef } from 'vue'
import { supabase } from '@/services/config/supabase'
import { favoriteService, isFavoritesUnavailable } from '@/services/favoriteService'
import { useToast } from '@/composables/useToast'

export type FavoritesStatus = 'idle' | 'loading' | 'ready' | 'unavailable' | 'error'

// State bersama: tombol hati di panel denah dan halaman detail harus selalu sama.
const ids = shallowRef<number[]>([])
const status = ref<FavoritesStatus>('idle')
const pending = new Set<number>()
let ownerId: string | null = null
let inFlight: Promise<void> | null = null
let watchingAuth = false

function reset(nextOwner: string | null) {
  ownerId = nextOwner
  ids.value = []
  status.value = 'idle'
  inFlight = null
  pending.clear()
}

function watchAuth() {
  if (watchingAuth) return
  watchingAuth = true
  // Favorit akun sebelumnya tidak boleh terlihat setelah ganti akun.
  supabase.auth.onAuthStateChange((_event, session) => {
    const nextOwner = session?.user.id ?? null
    if (nextOwner !== ownerId) reset(nextOwner)
  })
}

async function fetchIds() {
  const { data } = await supabase.auth.getSession()
  const userId = data.session?.user.id ?? null
  if (userId !== ownerId) reset(userId)
  if (!userId) {
    status.value = 'unavailable'
    return
  }
  if (status.value !== 'ready') status.value = 'loading'
  try {
    const list = await favoriteService.listIds()
    if (ownerId !== userId) return
    ids.value = list
    status.value = 'ready'
  } catch (error) {
    console.error('[Favorit] Gagal memuat:', error)
    if (isFavoritesUnavailable(error)) status.value = 'unavailable'
    else if (status.value !== 'ready') status.value = 'error'
  }
}

/** Beberapa komponen yang memuat bersamaan berbagi satu permintaan. */
function load(): Promise<void> {
  watchAuth()
  inFlight ??= fetchIds().finally(() => { inFlight = null })
  return inFlight
}

export function useFavorites() {
  const toast = useToast()

  async function toggle(lotId: number) {
    if (status.value !== 'ready' || pending.has(lotId)) return
    pending.add(lotId)
    const saved = ids.value.includes(lotId)
    ids.value = saved ? ids.value.filter((id) => id !== lotId) : [lotId, ...ids.value]
    try {
      await (saved ? favoriteService.remove(lotId) : favoriteService.add(lotId))
    } catch (error) {
      console.error('[Favorit] Gagal menyimpan perubahan:', error)
      ids.value = saved ? [lotId, ...ids.value] : ids.value.filter((id) => id !== lotId)
      toast.error('Favorit belum tersimpan. Coba lagi.')
    } finally {
      pending.delete(lotId)
    }
  }

  return {
    ids: readonly(ids),
    status: readonly(status),
    load,
    toggle,
    isFavorite: (lotId: number) => ids.value.includes(lotId),
  }
}
