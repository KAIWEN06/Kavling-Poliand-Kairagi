// @vitest-environment jsdom
import { describe, expect, it, vi } from 'vitest'
import { defineComponent, nextTick, ref } from 'vue'
import { mount } from '@vue/test-utils'
import { createMemoryHistory, createRouter } from 'vue-router'
import { runBackHandlers, useBackToClose } from '@/composables/useBackStack'

const page = { template: '<div />' }

async function setup() {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [{ path: '/a', component: page }, { path: '/b', component: page }],
  })
  await router.push('/a')
  const first = ref(false)
  const second = ref(false)
  const closed = vi.fn()
  const wrapper = mount(
    defineComponent({
      setup() {
        useBackToClose(() => first.value, () => { closed('first'); first.value = false })
        useBackToClose(() => second.value, () => { closed('second'); second.value = false })
        return () => null
      },
    }),
    { global: { plugins: [router] } },
  )
  return { router, first, second, closed, wrapper }
}

describe('useBackToClose', () => {
  it('menutup overlay yang terbuka belakangan lebih dulu, lalu melepas Back', async () => {
    const { first, second, closed, wrapper } = await setup()
    expect(runBackHandlers()).toBe(false)

    second.value = true
    await nextTick()
    first.value = true
    await nextTick()

    expect(runBackHandlers()).toBe(true)
    await nextTick()
    expect(runBackHandlers()).toBe(true)
    await nextTick()
    expect(closed.mock.calls).toEqual([['first'], ['second']])
    expect(runBackHandlers()).toBe(false)
    wrapper.unmount()
  })

  it('tidak menahan Back di rute lain atau setelah komponen dilepas', async () => {
    const { router, first, closed, wrapper } = await setup()
    first.value = true
    await nextTick()

    await router.push('/b')
    expect(runBackHandlers()).toBe(false)

    await router.push('/a')
    wrapper.unmount()
    expect(runBackHandlers()).toBe(false)
    expect(closed).not.toHaveBeenCalled()
  })
})
