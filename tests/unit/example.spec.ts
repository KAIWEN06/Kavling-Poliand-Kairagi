// @vitest-environment jsdom
import { flushPromises, shallowMount } from '@vue/test-utils'
import { beforeEach, describe, expect, test, vi } from 'vitest'

const push = vi.fn()
const getContacts = vi.fn()
vi.mock('vue-router', () => ({ useRouter: () => ({ push }), useRoute: () => ({ path: '/home', query: {} }) }))
vi.mock('@/services/config/supabase', () => ({ supabase: {} }))
vi.mock('@/services/contactService', () => ({ contactsService: { getAll: () => getContacts() } }))
vi.mock('@/composables/useSiteplant', () => ({ useSiteplan: () => ({ lots: [], reload: vi.fn() }) }))
vi.mock('@/composables/useRealtimeRefresh', () => ({ useRealtimeRefresh: vi.fn() }))

import HomePage from '@/views/HomePage.vue'

/* Bagian beranda diganti stub; yang diuji hanya perilaku milik halaman ini. */
const mountHome = () => shallowMount(HomePage, { global: { renderStubDefaultSlot: true } })

describe('HomePage.vue', () => {
  beforeEach(() => {
    push.mockClear()
    getContacts.mockResolvedValue([])
  })

  test('tombol Denah membuka siteplan', async () => {
    const wrapper = mountHome()
    await wrapper.find('.see-all').trigger('click')
    expect(push).toHaveBeenCalledWith('/siteplan')
    wrapper.unmount()
  })

  test('WhatsApp memakai nomor dari data Kontak', async () => {
    getContacts.mockResolvedValue([{ key: 'whatsapp', value: '081234567890' }])
    const open = vi.spyOn(window, 'open').mockReturnValue(null)
    const wrapper = mountHome()
    await flushPromises()
    wrapper.findComponent({ name: 'CTASection' }).vm.$emit('contactWhatsapp')
    expect(open).toHaveBeenCalledWith(expect.stringContaining('6281234567890'), '_blank')
    open.mockRestore()
    wrapper.unmount()
  })
})
