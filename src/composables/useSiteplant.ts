import {
  ref,
  onMounted
} from 'vue'

import {
  getLots,
  refreshLots,
  getCachedLots,
  type SiteplanLot
} from '../services/siteplanService'

export function useSiteplan() {
  const lots = ref<SiteplanLot[]>(
    getCachedLots() || []
  )

  const loading = ref(
    lots.value.length === 0
  )

  const error = ref<unknown>(null)

  const selectedLot =
    ref<SiteplanLot | null>(null)

  const hoveredLot =
    ref<SiteplanLot | null>(null)

  async function loadLots(
    forceRefresh = false
  ): Promise<void> {
    if (!forceRefresh) {
      const cachedLots = getCachedLots()

      if (cachedLots !== null) {
        lots.value = cachedLots
        loading.value = false
        error.value = null
        return
      }
    }

    loading.value = true
    error.value = null

    try {
      const result = forceRefresh
        ? await refreshLots()
        : await getLots()

      lots.value = result || []
    } catch (err) {
      console.error(
        'Gagal memuat siteplan:',
        err
      )

      error.value = err
    } finally {
      loading.value = false
    }
  }

  function selectLot(
    lot: SiteplanLot | null
  ): void {
    if (!lot) {
      selectedLot.value = null
      return
    }

    const currentId = String(
      selectedLot.value?.polygon_id ||
      selectedLot.value?.id ||
      ''
    )

    const newId = String(
      lot.polygon_id ||
      lot.id ||
      ''
    )

    if (
      currentId &&
      currentId === newId
    ) {
      selectedLot.value = null
      return
    }

    selectedLot.value = lot
  }

  function hoverLot(
    lot: SiteplanLot | null
  ): void {
    hoveredLot.value = lot
  }

  function clearHover(): void {
    hoveredLot.value = null
  }

  async function reload(): Promise<void> {
    await loadLots(true)
  }

  onMounted(() => {
    if (lots.value.length > 0) {
      loading.value = false
      return
    }

    loadLots(false)
  })

  return {
    lots,
    loading,
    error,
    selectedLot,
    hoveredLot,
    loadLots,
    reload,
    selectLot,
    hoverLot,
    clearHover
  }
}