import { ref, readonly } from 'vue'
import { supabase } from '@/services/config/supabase'

/**
 * Status kelengkapan data diri Client (singleton). Dipakai popup wajib
 * lengkapi data diri agar form SPK dapat terisi otomatis.
 */
const needsCompletion = ref(false)
const checked = ref(false)
let inflight: Promise<void> | null = null

function filled(value: unknown): boolean {
  return typeof value === 'string' && value.trim().length > 0
}

async function check(): Promise<void> {
  if (inflight) return inflight
  inflight = (async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const user = sessionData.session?.user
      if (!user) {
        needsCompletion.value = false
        return
      }

      const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle()
      if (String(profile?.role ?? '').toLowerCase() !== 'client') {
        needsCompletion.value = false
        return
      }

      const columns = 'full_name, phone, whatsapp_phone, address, street_address'
      let { data: customer } = await supabase.from('customers').select(columns).eq('user_id', user.id).maybeSingle()
      if (!customer && user.email) {
        const { data: byEmail } = await supabase
          .from('customers')
          .select(columns)
          .eq('email', user.email)
          .eq('registration_source', 'Client')
          .is('user_id', null)
          .maybeSingle()
        customer = byEmail
      }

      needsCompletion.value = !(
        customer &&
        filled(customer.full_name) &&
        filled(customer.phone) &&
        filled(customer.whatsapp_phone) &&
        (filled(customer.street_address) || filled(customer.address))
      )
    } catch (error) {
      // Gagal cek tidak boleh memblokir pengguna.
      console.error('[Profil] Gagal memeriksa kelengkapan data diri:', error)
      needsCompletion.value = false
    } finally {
      checked.value = true
      inflight = null
    }
  })()
  return inflight
}

function markComplete() {
  needsCompletion.value = false
  checked.value = true
}

export function useClientProfileGate() {
  return { needsCompletion: readonly(needsCompletion), checked: readonly(checked), check, markComplete }
}
