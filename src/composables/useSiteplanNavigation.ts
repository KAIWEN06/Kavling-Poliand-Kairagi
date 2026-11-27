import { computed, onBeforeUnmount, onMounted, ref, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { registerBackHandler } from '@/composables/useBackStack'
import type { SiteplanLot } from '@/services/siteplanService'
import { buildSiteplanBlocks, findBlockOfLot } from '@/utils/siteplanBlocks'

export type SiteplanLevel = 'overview' | 'block' | 'lot'

/** Level denah: keseluruhan -> blok -> kavling. */
export function useSiteplanNavigation(
  lots: Ref<SiteplanLot[]>,
  selectedLot: Ref<SiteplanLot | null>,
) {
  const blocks = computed(() => buildSiteplanBlocks(lots.value))
  const activeBlockKey = ref<string | null>(null)

  const activeBlock = computed(
    () => blocks.value.find((block) => block.key === activeBlockKey.value) ?? null,
  )

  const level = computed<SiteplanLevel>(() =>
    selectedLot.value ? 'lot' : activeBlock.value ? 'block' : 'overview',
  )

  function openBlock(key: string): void {
    selectedLot.value = null
    activeBlockKey.value = key
  }

  function openLot(lot: SiteplanLot): void {
    activeBlockKey.value = findBlockOfLot(blocks.value, lot)?.key ?? null
    selectedLot.value = lot
  }

  /**
   * Ketukan pada bentuk kavling: ke bloknya dulu, baru ke kavlingnya.
   * Bila pengguna sudah zoom sedekat tampilan blok, langsung ke kavlingnya.
   */
  function tapLot(lot: SiteplanLot, zoomedIntoBlock = false): void {
    const block = findBlockOfLot(blocks.value, lot)
    if (!zoomedIntoBlock && block && block.key !== activeBlockKey.value) openBlock(block.key)
    else openLot(lot)
  }

  function showOverview(): void {
    selectedLot.value = null
    activeBlockKey.value = null
  }

  function back(): boolean {
    if (level.value === 'overview') return false
    if (selectedLot.value) selectedLot.value = null
    else activeBlockKey.value = null
    return true
  }

  /* Back Android dan Escape hanya berlaku saat halaman denah ini yang tampil. */
  const router = useRouter()
  const ownPath = useRoute().path
  const isVisible = () => router.currentRoute.value.path === ownPath

  function onKeydown(event: KeyboardEvent): void {
    if (event.key === 'Escape' && !event.defaultPrevented && isVisible()) back()
  }

  let unregister: (() => void) | undefined

  onMounted(() => {
    unregister = registerBackHandler(() => isVisible() && back())
    window.addEventListener('keydown', onKeydown)
  })

  onBeforeUnmount(() => {
    unregister?.()
    window.removeEventListener('keydown', onKeydown)
  })

  return { blocks, activeBlock, level, openBlock, openLot, tapLot, showOverview, back }
}
