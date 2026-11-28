import { ref, readonly } from 'vue'
import { supabase } from '@/services/config/supabase'
import { getCustomerIdentity } from '@/services/customerIdentityService'
import { spkAddressGaps } from '@/utils/address'

/**
 * Status kelengkapan data diri Client (singleton). Hanya untuk pengingat;
 * kelengkapannya baru diwajibkan di formulir SPK.
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

      const columns = 'id, full_name, phone, address, country_code, country_name, province_code, province_name, city_code, city_name, district_code, district_name, village_code, village_name, street_address'
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
        !spkAddressGaps(customer).length
      )

      if (!needsCompletion.value && customer) {
        const result = await getCustomerIdentity(Number(customer.id))
        needsCompletion.value = result.available && !result.identity
      }
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
