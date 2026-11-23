/**
 * Penanganan error OAuth yang dikembalikan Supabase lewat URL,
 * mis. `?error=invalid_request&error_code=flow_state_already_used`.
 *
 * Error ini muncul ketika callback OAuth dipakai ulang (refresh, tombol back,
 * tab lama, atau verifier PKCE sisa dari percobaan login sebelumnya).
 */

export type OAuthUrlError = 'oauth_state_used' | 'oauth_failed'

/** Hapus code-verifier PKCE sisa agar login berikutnya selalu memulai flow baru. */
export function clearStalePkceVerifier() {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sb-') && key.endsWith('-code-verifier')) keys.push(key)
    }
    keys.forEach((key) => localStorage.removeItem(key))
  } catch {
    // localStorage tidak tersedia; abaikan.
  }
}

/**
 * Membaca error OAuth dari query/hash URL saat ini. Jika ada, URL dibersihkan
 * dan verifier lama dihapus. Mengembalikan kode error untuk ditampilkan di login.
 */
export function consumeOAuthUrlError(): OAuthUrlError | null {
  const url = new URL(window.location.href)
  const hash = new URLSearchParams(url.hash.replace(/^#/, ''))
  const get = (name: string) => url.searchParams.get(name) ?? hash.get(name)

  const error = get('error')
  const errorCode = get('error_code')
  if (!error && !errorCode) return null

  // Verifier sengaja tidak dihapus di sini: callback pertama yang sama bisa
  // saja masih menukar code-nya dan membutuhkan verifier tersebut.
  return errorCode === 'flow_state_already_used' || errorCode === 'flow_state_not_found'
    ? 'oauth_state_used'
    : 'oauth_failed'
}
