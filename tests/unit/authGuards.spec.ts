// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'
import { AuthRetryableFetchError } from '@supabase/supabase-js'

const auth = vi.hoisted(() => ({ getSession: vi.fn(), getUserRole: vi.fn() }))

vi.mock('@/services/auth/authService', () => ({
  authService: {
    ...auth,
    getRoleHomePath: (role: string | null) => (role ? `/beranda-${role}` : null),
  },
}))

import { setupAuthGuards } from '@/router/guards'
import { forgetIdentity, rememberIdentity } from '@/services/auth/lastIdentity'
import { clearPostLoginRedirect, peekPostLoginRedirect } from '@/services/auth/postLoginRedirect'

const page = { template: '<div />' }

function makeRouter() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: '/welcome', name: 'Welcome', component: page, meta: { publicOnly: true } },
      { path: '/login', name: 'Login', component: page, meta: { publicOnly: true } },
      { path: '/register', name: 'Register', component: page, meta: { publicOnly: true } },
      { path: '/home', component: page, meta: { guestSite: true } },
      { path: '/gallery', component: page, meta: { guestSite: true } },
      { path: '/siteplan', component: page, meta: { guestSite: true } },
      { path: '/client/dokumen', component: page, meta: { requiresAuth: true, role: 'client' } },
      { path: '/client/kavling/:id', component: page, meta: { requiresAuth: true, role: 'client' } },
      { path: '/marketing/siteplan', component: page, meta: { requiresAuth: true, role: 'marketing' } },
      { path: '/beranda-client', component: page },
      { path: '/beranda-admin', component: page, meta: { requiresAuth: true, role: 'admin' } },
      { path: '/beranda-marketing', component: page, meta: { requiresAuth: true, role: 'marketing' } },
      { path: '/admin/konten', component: page, meta: { requiresAuth: true, role: 'admin' } },
      { path: '/panorama/:lotId', component: page },
    ],
  })
  setupAuthGuards(router)
  return router
}

async function visit(path: string) {
  const router = makeRouter()
  await router.push(path)
  return router
}

function signedInAs(role: string | null) {
  auth.getSession.mockResolvedValue({ user: { id: 'u1' } })
  auth.getUserRole.mockResolvedValue(role)
}

describe('auth guards', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    forgetIdentity()
    clearPostLoginRedirect()
  })

  it('tamu yang membuka halaman client diminta masuk dan tujuannya disimpan', async () => {
    auth.getSession.mockResolvedValue(null)
    const router = await visit('/client/dokumen?spk_id=7')
    expect(router.currentRoute.value.name).toBe('Login')
    expect(peekPostLoginRedirect()).toBe('/client/dokumen?spk_id=7')
  })

  it('role lain tidak bisa membuka halaman client', async () => {
    signedInAs('marketing')
    const router = await visit('/client/dokumen')
    expect(router.currentRoute.value.path).toBe('/beranda-marketing')
  })

  it.each([
    ['client', '/client/kavling/5'],
    ['marketing', '/marketing/siteplan?kavling=5'],
  ])('tautan bagikan kavling membawa %s ke kavlingnya', async (role, expected) => {
    signedInAs(role)
    const router = await visit('/siteplan?kavling=5')
    expect(router.currentRoute.value.fullPath).toBe(expected)
  })

  it('tamu tetap membuka tautan bagikan di denah publik', async () => {
    auth.getSession.mockResolvedValue(null)
    const router = await visit('/siteplan?kavling=5')
    expect(router.currentRoute.value.fullPath).toBe('/siteplan?kavling=5')
  })

  it.each(['/home', '/gallery', '/welcome', '/login', '/register'])(
    'pengguna login yang membuka %s kembali ke beranda role',
    async (path) => {
      signedInAs('marketing')
      const router = await visit(path)
      expect(router.currentRoute.value.path).toBe('/beranda-marketing')
    },
  )

  it('pengunjung tanpa akun tetap melihat situs publik', async () => {
    auth.getSession.mockResolvedValue(null)
    const router = await visit('/home')
    expect(router.currentRoute.value.path).toBe('/home')
  })

  it('akun tanpa role tetap boleh melihat situs publik', async () => {
    signedInAs(null)
    const router = await visit('/home')
    expect(router.currentRoute.value.path).toBe('/home')
  })

  it('panorama tetap terbuka untuk pengguna login', async () => {
    signedInAs('client')
    const router = await visit('/panorama/7')
    expect(router.currentRoute.value.path).toBe('/panorama/7')
  })

  it('pratinjau CMS Admin bertahan saat pindah menu publik', async () => {
    signedInAs('admin')
    const router = await visit('/home?from=cms&tab=home')
    await router.push('/gallery')
    expect(router.currentRoute.value.path).toBe('/gallery')
    expect(router.currentRoute.value.query).toEqual({ from: 'cms', tab: 'home' })
  })

  it('parameter pratinjau CMS tidak berlaku untuk role lain', async () => {
    signedInAs('marketing')
    const router = await visit('/home?from=cms')
    expect(router.currentRoute.value.path).toBe('/beranda-marketing')
  })

  describe('saat jaringan putus dan token tidak bisa diperbarui', () => {
    beforeEach(() => {
      auth.getSession.mockRejectedValue(new AuthRetryableFetchError('offline', 0))
    })

    it('halaman role tetap terbuka dengan role terakhir', async () => {
      rememberIdentity({ userId: 'u1', role: 'marketing' })
      const router = await visit('/beranda-marketing')
      expect(router.currentRoute.value.path).toBe('/beranda-marketing')
    })

    it('layar pembuka tidak menjadi tujuan pengguna login', async () => {
      rememberIdentity({ userId: 'u1', role: 'marketing' })
      const router = await visit('/welcome')
      expect(router.currentRoute.value.path).toBe('/beranda-marketing')
    })

    it('tanpa identitas tersimpan, halaman role tetap tertutup', async () => {
      const router = await visit('/beranda-marketing')
      expect(router.currentRoute.value.name).toBe('Login')
    })
  })
})
