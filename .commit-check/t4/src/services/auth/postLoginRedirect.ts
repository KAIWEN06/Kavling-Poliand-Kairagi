/**
 * Tujuan setelah login untuk pengunjung yang belum punya sesi, misalnya
 * tombol "Survei Lokasi" di denah publik. Disimpan di localStorage agar tetap
 * ada setelah login Google (halaman dimuat ulang) atau konfirmasi email.
 */
const KEY = 'poliland_post_login_redirect'
const MAX_AGE_MS = 60 * 60 * 1000

// Hanya rute Client yang boleh jadi tujuan, supaya tidak bisa dipakai membuka alamat lain.
function isAllowedPath(path: unknown): path is string {
  return typeof path === 'string' && /^\/client\/[A-Za-z0-9/_\-?=&]*$/.test(path)
}

export function setPostLoginRedirect(path: string): void {
  if (!isAllowedPath(path)) return
  try {
    localStorage.setItem(KEY, JSON.stringify({ path, at: Date.now() }))
  } catch {
    // Penyimpanan tidak tersedia; login tetap berjalan ke beranda.
  }
}

export function clearPostLoginRedirect(): void {
  try {
    localStorage.removeItem(KEY)
  } catch {
    // diabaikan
  }
}

/** Ambil dan hapus tujuan tersimpan. Hanya berlaku untuk role client. */
export function consumePostLoginRedirect(role: string | null | undefined): string | null {
  let raw: string | null = null
  try {
    raw = localStorage.getItem(KEY)
  } catch {
    return null
  }
  if (!raw) return null

  // Role lain tidak memakainya, tetapi tujuan dibiarkan sampai kedaluwarsa.
  if (String(role ?? '').toLowerCase() !== 'client') return null

  clearPostLoginRedirect()
  try {
    const parsed = JSON.parse(raw) as { path?: unknown; at?: unknown }
    if (typeof parsed.at !== 'number' || Date.now() - parsed.at > MAX_AGE_MS) return null
    return isAllowedPath(parsed.path) ? parsed.path : null
  } catch {
    return null
  }
}
