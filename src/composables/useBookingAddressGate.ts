import { ref } from 'vue'
import { supabase } from '@/services/config/supabase'
import { spkAddressGaps } from '@/utils/address'

/**
 * Syarat alamat saat Client memesan kaveling. Yang diperiksa data tersimpan, karena
 * create_client_spk_request menyalin alamat dari baris customers, bukan dari isian form SPK.
 */
export function useBookingAddressGate() {
  const gaps = ref<string[]>([])
  const savedAddress = ref('')

  async function refresh(): Promise<void> {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const userId = sessionData.session?.user.id
      if (!userId) return
      const { data, error } = await supabase
        .from('customers')
        .select('address, country_code, country_name, province_code, province_name, city_code, city_name, district_code, district_name, village_code, village_name, street_address')
        .eq('user_id', userId)
        .maybeSingle()
      if (error) throw error
      // Tanpa baris pembeli, penyimpanan SPK sudah menolak sendiri dan mengarahkan ke Akun.
      gaps.value = data ? spkAddressGaps(data) : []
      savedAddress.value = data?.address ?? ''
    } catch (error) {
      // Gagal cek tidak boleh memblokir pengguna.
      console.error('[SPK Klien] Gagal memeriksa kelengkapan alamat:', error)
      gaps.value = []
    }
  }

  return { gaps, savedAddress, refresh }
}
