/**
 * Mengubah error masuk/daftar/kata sandi menjadi pesan yang dipahami pengguna.
 *
 * Teks asli error (berbahasa Inggris dan teknis) tidak pernah dikembalikan:
 * error yang tidak dikenali memakai `fallback` dari pemanggil.
 */

export const AUTH_MESSAGES = {
  wrongCredentials: 'Email atau kata sandi salah. Periksa lagi, atau tekan "Lupa kata sandi?".',
  emailNotConfirmed:
    'Email Anda belum dikonfirmasi. Buka tautan yang dikirim ke email, periksa juga folder spam.',
  tooManyAttempts: 'Terlalu banyak percobaan. Tunggu beberapa menit, lalu coba lagi.',
  offline: 'Tidak bisa terhubung. Periksa koneksi internet Anda, lalu coba lagi.',
  serverDown: 'Layanan sedang bermasalah. Coba lagi beberapa saat lagi.',
  accountDisabled: 'Akun ini dinonaktifkan. Hubungi admin PoliLand.',
  alreadyRegistered: 'Email ini sudah terdaftar. Silakan masuk.',
  weakPassword: 'Kata sandi terlalu mudah ditebak. Gabungkan huruf, angka, dan simbol.',
  samePassword: 'Kata sandi baru harus berbeda dari kata sandi lama.',
  invalidEmail: 'Penulisan email belum benar. Contoh: nama@email.com.',
  signupClosed: 'Pendaftaran akun baru sedang ditutup. Hubungi admin PoliLand.',
  emailNotSent: 'Email belum bisa dikirim. Coba lagi nanti atau hubungi admin PoliLand.',
  expired: 'Tautan atau waktu masuk sudah habis. Silakan ulangi dari awal.',
} as const

// Dicocokkan dengan `code` atau teks error; urutan menentukan prioritas.
const RULES: ReadonlyArray<readonly [RegExp, string]> = [
  [/invalid_credentials|invalid login credentials/, AUTH_MESSAGES.wrongCredentials],
  [/email_not_confirmed|email not confirmed/, AUTH_MESSAGES.emailNotConfirmed],
  [/rate_limit|rate limit|too many requests|for security purposes/, AUTH_MESSAGES.tooManyAttempts],
  [/user_banned|user is banned/, AUTH_MESSAGES.accountDisabled],
  [/user_already_exists|email_exists|already registered/, AUTH_MESSAGES.alreadyRegistered],
  [/same_password|should be different from the old password/, AUTH_MESSAGES.samePassword],
  [/weak_password|password should/, AUTH_MESSAGES.weakPassword],
  [/email_address_invalid|unable to validate email|invalid email|email address .* is invalid/, AUTH_MESSAGES.invalidEmail],
  [/signup_disabled|signups not allowed/, AUTH_MESSAGES.signupClosed],
  [/email_address_not_authorized|error sending .*email/, AUTH_MESSAGES.emailNotSent],
  [/otp_expired|session_not_found|session_expired|session missing|flow_state|bad_code_verifier|code verifier|link is invalid or has expired/, AUTH_MESSAGES.expired],
  [/failed to fetch|network ?error|network request failed|load failed|fetch failed/, AUTH_MESSAGES.offline],
]

export function authErrorMessage(error: unknown, fallback: string): string {
  const { code, message, status, name } = (error ?? {}) as {
    code?: unknown
    message?: unknown
    status?: unknown
    name?: unknown
  }
  const text = `${String(code ?? '')} ${String(message ?? '')}`.toLowerCase()

  const match = RULES.find(([pattern]) => pattern.test(text))
  if (match) return match[1]

  if (status === 429) return AUTH_MESSAGES.tooManyAttempts
  if (typeof status === 'number' && status >= 500) return AUTH_MESSAGES.serverDown
  // Supabase memakai nama ini saat permintaan tidak sampai ke server.
  if (name === 'AuthRetryableFetchError') return AUTH_MESSAGES.offline

  return fallback
}

/**
 * Pemeriksaan email pengganti validasi bawaan browser, yang pesannya
 * mengikuti bahasa perangkat. Mengembalikan '' bila email sudah benar.
 */
export function emailInputError(value: string): string {
  const email = value.trim()
  if (!email) return 'Isi email Anda terlebih dahulu.'
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? '' : AUTH_MESSAGES.invalidEmail
}
