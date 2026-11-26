// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount } from '@vue/test-utils'

const push = vi.fn()
vi.mock('@ionic/vue', () => ({ useIonRouter: () => ({ push }), IonIcon: { template: '<i />' } }))
vi.mock('@/services/config/supabase', () => ({ supabase: {} }))

import ToastHost from '@/components/ui/ToastHost.vue'
import { useToast } from '@/composables/useToast'

const toast = useToast()
const host = () => mount(ToastHost, { global: { stubs: { TransitionGroup: false } } })

afterEach(() => {
  for (const t of [...toast.items.value]) toast.dismiss(t.id)
  push.mockClear()
})

describe('toast yang punya tujuan', () => {
  it('membuka tujuan saat kartunya diketuk, lalu menutup toast', async () => {
    const view = host()
    toast.success('Klien tersimpan.', { to: '/marketing/clients/5' })
    await view.vm.$nextTick()
    await view.find('.ui-toast').trigger('click')
    expect(push).toHaveBeenCalledWith(expect.stringMatching(/^\/marketing\/clients\/5\?nt=\d+$/))
    expect(toast.items.value).toHaveLength(0)
  })

  it('tombol tujuan menjalankan aksi satu kali', async () => {
    const view = host()
    const onTap = vi.fn()
    toast.info('Pesan', { onTap, actionLabel: 'Lihat status' })
    await view.vm.$nextTick()
    await view.find('.nt__action').trigger('click')
    expect(onTap).toHaveBeenCalledTimes(1)
  })

  it('tombol tutup tidak pindah halaman', async () => {
    const view = host()
    toast.info('Pesan', { to: '/a' })
    await view.vm.$nextTick()
    await view.find('.nt__close').trigger('click')
    expect(push).not.toHaveBeenCalled()
  })

  it('toast tanpa tujuan tidak punya tombol dan tidak pindah halaman', async () => {
    const view = host()
    toast.success('Tersimpan.')
    await view.vm.$nextTick()
    expect(view.find('.nt__action').exists()).toBe(false)
    await view.find('.ui-toast').trigger('click')
    expect(push).not.toHaveBeenCalled()
    expect(toast.items.value).toHaveLength(1)
  })

  it('dua notifikasi berteks sama tidak saling mengganti', () => {
    toast.success('Sama', { key: 'notif:1' })
    toast.success('Sama', { key: 'notif:2' })
    expect(toast.items.value).toHaveLength(2)
  })
})
