import { computed, ref } from 'vue'
import {
  emptyIdentity,
  getMyIdentity,
  saveMyIdentity,
  validateIdentity,
  type CustomerIdentity,
} from '@/services/customerIdentityService'

/** Isian identitas milik klien yang sedang masuk, untuk halaman Akun dan formulir SPK. */
export function useMyIdentityForm() {
  const identity = ref<CustomerIdentity>(emptyIdentity())
  const available = ref(true)
  const loading = ref(false)
  const loadError = ref('')
  let requestId = 0

  async function load(): Promise<void> {
    const current = ++requestId
    loading.value = true
    loadError.value = ''
    identity.value = emptyIdentity()
    try {
      const result = await getMyIdentity()
      if (current !== requestId) return
      available.value = result.available
      if (result.identity) identity.value = { ...result.identity }
    } catch (error) {
      if (current !== requestId) return
      console.error('[Identitas] Gagal memuat data identitas:', error)
      loadError.value = 'Data identitas gagal dimuat. Periksa koneksi lalu coba lagi.'
    } finally {
      if (current === requestId) loading.value = false
    }
  }

  /** Alasan formulir belum boleh dikirim; null bila tidak ada halangan. */
  const problem = computed(() => {
    if (!available.value) return null
    if (loading.value) return 'Data identitas masih dimuat.'
    if (loadError.value) return loadError.value
    return validateIdentity(identity.value)
  })

  async function save(): Promise<void> {
    if (available.value) await saveMyIdentity(identity.value)
  }

  return { identity, available, loading, loadError, problem, load, save }
}
