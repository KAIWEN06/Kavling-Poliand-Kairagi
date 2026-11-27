import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { supabase } from '@/services/config/supabase'

/** Peran yang boleh mengubah konten website dari halaman publik. */
const EDITOR_ROLES = new Set(['admin', 'superadmin'])

/**
 * Status Admin untuk halaman publik: tombol Edit hanya muncul bagi Admin yang sedang login,
 * dan `fromCms` aktif saat halaman dibuka lewat "Lihat di website" dari Kelola Konten.
 */
export function useCmsAdmin() {
  const route = useRoute()
  const router = useRouter()
  const isAdmin = ref(false)

  const fromCms = computed(() => route.query.from === 'cms')
  const cmsTab = computed(() => (typeof route.query.tab === 'string' ? route.query.tab : ''))

  async function checkAdmin() {
    try {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) { isAdmin.value = false; return }
      const { data: profile } = await supabase.from('profiles').select('role').eq('id', session.user.id).maybeSingle()
      isAdmin.value = EDITOR_ROLES.has(String(profile?.role ?? ''))
    } catch {
      isAdmin.value = false
    }
  }

  /** Kembali ke Kelola Konten, langsung ke bagian yang tadi dibuka. */
  function backToCms() {
    void router.push({ path: '/admin/konten', query: cmsTab.value ? { tab: cmsTab.value } : {} })
  }

  onMounted(checkAdmin)

  return { isAdmin, fromCms, cmsTab, backToCms, checkAdmin }
}
