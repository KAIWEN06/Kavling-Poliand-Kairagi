import { onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { supabase } from '@/services/config/supabase'
import { useClientProfileGate } from '@/composables/useClientProfileGate'
import { useToast } from '@/composables/useToast'

/** Layar pembuka: toast yang muncul di sini akan hilang sebelum sempat dibaca. */
const ENTRY_ROUTES = new Set(['Splash', 'Welcome', 'Login'])

/**
 * Toast satu kali setiap Client masuk (login atau membuka aplikasi dengan sesi aktif)
 * selama data dirinya belum lengkap. Dipasang di App.vue agar berlaku di semua halaman.
 */
export function useClientProfileReminder(): void {
  const route = useRoute()
  const toast = useToast()
  const { needsCompletion, check } = useClientProfileGate()
  const userId = ref<string | null>(null)
  let checkedFor: string | null = null

  async function remind(): Promise<void> {
    const id = userId.value
    if (!id || id === checkedFor) return
    // Halaman /auth/* hanya perantara menuju tujuan setelah login.
    if (!route.name || ENTRY_ROUTES.has(String(route.name)) || route.path.startsWith('/auth')) return
    checkedFor = id
    await check()
    // Halaman Akun sudah menampilkan peringatan yang sama di dalam halaman.
    if (userId.value !== id || !needsCompletion.value || route.path === '/akun') return
    toast.warning('Bisa dilengkapi nanti. Wajib saat memesan kaveling.', {
      title: 'Data diri belum lengkap',
      duration: 8000,
      to: '/akun?lengkapi=1',
      actionLabel: 'Lengkapi',
    })
  }

  watch([() => route.name, userId], () => void remind())

  let unsubscribe: (() => void) | undefined
  onMounted(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      userId.value = session?.user.id ?? null
      if (!session) checkedFor = null
    })
    unsubscribe = () => data.subscription.unsubscribe()
  })
  onUnmounted(() => unsubscribe?.())
}
