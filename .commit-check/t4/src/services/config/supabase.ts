
import { createClient } from '@supabase/supabase-js'
import { Capacitor } from '@capacitor/core'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Konfigurasi Supabase belum lengkap. Periksa VITE_SUPABASE_URL dan VITE_SUPABASE_ANON_KEY di file .env.',
  )
}

const isNative = Capacitor.isNativePlatform()

export const supabase = createClient(
  supabaseUrl,
  supabaseAnonKey,
  {
    auth: {
      // Simpan session agar pengguna tidak perlu login setiap membuka aplikasi.
      persistSession: true,

      // Perbarui access token secara otomatis.
      autoRefreshToken: true,

      // Callback URL ditangani manual oleh Capacitor pada Android/iOS.
      detectSessionInUrl: !isNative,

      // PKCE digunakan untuk pertukaran authorization code.
      flowType: 'pkce',
    },
  },
)
