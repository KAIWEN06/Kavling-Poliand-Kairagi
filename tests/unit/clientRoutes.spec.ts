// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'

// Hanya tabel rute asli yang diperiksa; halaman dan Supabase tidak perlu dimuat.
vi.mock('@ionic/vue-router', async () => await vi.importActual('vue-router'))
vi.mock('@/views/WelcomePage.vue', () => ({ default: {} }))
vi.mock('@/components/common/SplashVideoPage.vue', () => ({ default: {} }))
vi.mock('@/router/guards', () => ({ setupAuthGuards: () => undefined }))

import router from '@/router'

describe('rute client', () => {
  // Halaman client baru yang lupa dikunci akan menggagalkan tes ini.
  const clientRoutes = router
    .getRoutes()
    .filter((route) => /^\/(client\/|beranda-client|pembayaran-client)/.test(route.path) && !route.redirect)

  it('menemukan halaman client', () => {
    expect(clientRoutes.length).toBeGreaterThanOrEqual(9)
  })

  it.each(clientRoutes.map((route) => [route.path, route.meta]))('%s wajib login sebagai client', (_path, meta) => {
    expect(meta).toMatchObject({ requiresAuth: true, role: 'client' })
  })
})
