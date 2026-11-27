/**
 * Satu aturan hak akses rute, dipakai guard dan tautan notifikasi.
 * Owner hanya memantau. Satu-satunya halaman Admin yang ia buka adalah Akses tim,
 * karena hanya Owner yang boleh mengubah atau menonaktifkan akun Admin.
 */
const OWNER_ADMIN_ROUTES = new Set(['AdminAksesTim'])

export function canAccessRoute(role: string, requiredRole: string | undefined, routeName: unknown): boolean {
  if (!requiredRole || role === requiredRole) return true
  return role === 'owner' && requiredRole === 'admin' && OWNER_ADMIN_ROUTES.has(String(routeName))
}
