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
import type { LoadOptions } from './useRealtimeRefresh'

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
    forceRefresh = false,
    { silent = false }: LoadOptions = {}
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

    if (!silent) {
      loading.value = true
      error.value = null
    }

    try {
      const result = forceRefresh
        ? await refreshLots()
        : await getLots()

      lots.value = result || []
      error.value = null
      syncSelectedLot()
    } catch (err) {
      console.error(
        'Gagal memuat denah:',
        err
      )

      if (!silent || lots.value.length === 0) error.value = err
    } finally {
      loading.value = false
    }
  }

  /* Panel detail memakai objek terpilih, jadi arahkan ke data terbaru. */
  function syncSelectedLot(): void {
    const current = selectedLot.value
    if (!current) return

    const key = (lot: SiteplanLot) => String(lot.polygon_id || lot.id || '')
    const latest = lots.value.find((lot) => key(lot) === key(current))

    if (latest) selectedLot.value = latest
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

  async function reload(options: LoadOptions = {}): Promise<void> {
    await loadLots(true, options)
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