<template>
  <MarketingPageLayout title="Kaveling" tab-variant="owner" @refresh="load()">
    <Reveal :order="1">
      <div class="mk-section">
        <label class="mk-field">
          <span>Cari kaveling</span>
          <input v-model="search" class="mk-input" type="search" enterkeyhint="search" placeholder="Nomor, blok, atau nama pembeli" />
        </label>
        <div class="mk-chips" role="group" aria-label="Status kaveling">
          <button v-for="filter in filters" :key="filter.value" type="button" class="mk-chip" :aria-pressed="status === filter.value" @click="status = filter.value">
            {{ filter.label }} ({{ filter.count }})
          </button>
        </div>
        <button type="button" class="mk-btn mk-btn--primary" @click="router.push('/owner/siteplan')">Lihat di denah</button>
      </div>
    </Reveal>

    <div v-if="loading && !loaded" class="mk-section" role="status" aria-label="Memuat kaveling">
      <Skeleton v-for="n in 5" :key="n" height="76px" border-radius="14px" />
    </div>
    <StatusIllustration v-else-if="error && !loaded" :variant="resolveErrorVariant(error)" title="Kaveling belum dapat dimuat" :on-action="() => load()" />
    <p v-else-if="!rows.length" class="mk-state">Tidak ada kaveling yang cocok.</p>

    <Reveal v-else :order="2">
      <div class="mk-section">
        <ul class="mk-card ow-lots">
          <li v-for="row in pager.items" :key="row.id">
            <button type="button" @click="router.push(`/owner/siteplan?kavling=${row.id}`)">
              <span>
                <strong>{{ row.lotNumber }}</strong>
                <small>{{ row.meta }}</small>
                <small v-if="row.buyer">{{ row.buyer }}</small>
              </span>
              <StatusBadge :tone="row.tone" :label="row.statusLabel" />
            </button>
          </li>
        </ul>
        <AppPagination :page="pager.page" :total-pages="pager.totalPages" :total="pager.total" :page-size="pager.pageSize" label="Halaman kaveling" @update:page="pager.setPage" />
      </div>
    </Reveal>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useIonRouter } from '@ionic/vue'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import Reveal from '@/components/ui/Reveal.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import StatusBadge, { type BadgeTone } from '@/components/ui/StatusBadge.vue'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import { useOwnerData } from '@/composables/useOwnerData'
import { useOwnRouteQuery } from '@/composables/useOwnRouteQuery'
import { usePagination } from '@/composables/usePagination'
import { compareLotNumber } from '@/utils/lotNumber'
import { formatRupiah } from '@/utils/marketingStatus'
import { getStatusLabel, normalizeLotStatus } from '@/utils/siteplan'

const router = useIonRouter()
const query = useOwnRouteQuery()
const { lots, sales, inventory, loading, loaded, error, load } = useOwnerData()

const STATUSES = ['all', 'available', 'booking', 'sold']
const statusFromQuery = () => (STATUSES.includes(String(query.value.status)) ? String(query.value.status) : 'all')
const status = ref(statusFromQuery())
watch(query, () => (status.value = statusFromQuery()))
const search = ref('')

const filters = computed(() => [
  { value: 'all', label: 'Semua', count: inventory.value.total },
  { value: 'available', label: 'Tersedia', count: inventory.value.available },
  { value: 'booking', label: 'Dipesan', count: inventory.value.booking },
  { value: 'sold', label: 'Terjual', count: inventory.value.sold },
])

const TONES: Record<string, BadgeTone> = { available: 'success', booking: 'gold', sold: 'danger' }

const rows = computed(() => {
  const buyerByLot = new Map(sales.value.map((sale) => [sale.lotNumber, sale.customerName]))
  const needle = search.value.trim().toLocaleLowerCase('id-ID')
  return lots.value
    .map((lot) => {
      const key = normalizeLotStatus(lot.status)
      const lotNumber = lot.lot_number || `#${lot.id}`
      const block = lot.blocks?.name || lot.blocks?.code || ''
      const price = Number(lot.promo_price) || Number(lot.cash_price) || 0
      return {
        id: lot.id,
        lotNumber,
        block,
        statusKey: key,
        statusLabel: getStatusLabel(lot.status),
        tone: TONES[key] ?? ('neutral' as BadgeTone),
        buyer: key === 'available' ? '' : buyerByLot.get(lotNumber) ?? '',
        meta: [block && `Blok ${block}`, lot.area ? `${lot.area} m²` : '', price ? formatRupiah(price) : ''].filter(Boolean).join(' · '),
      }
    })
    .filter((row) => status.value === 'all' || row.statusKey === status.value)
    .filter((row) => !needle || `${row.lotNumber} ${row.block} ${row.buyer}`.toLocaleLowerCase('id-ID').includes(needle))
    .sort((a, b) => compareLotNumber(a.lotNumber, b.lotNumber))
})
const pager = usePagination(rows, { pageSize: 10, resetOn: [status, search] })
</script>

<style scoped>
.ow-lots { padding: 0; margin: 0; overflow: hidden; list-style: none; }
.ow-lots li + li { border-top: 1px solid var(--border-default); }
.ow-lots button { width: 100%; min-height: 64px; display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; touch-action: manipulation; }
.ow-lots button:active { background: var(--surface-muted); }
.ow-lots button:focus-visible { outline: 3px solid var(--poliland-gold); outline-offset: -3px; }
.ow-lots button > span:first-child { display: grid; gap: 2px; min-width: 0; }
.ow-lots strong { font-size: var(--text-md); }
.ow-lots small { color: var(--text-secondary); font-size: var(--text-xs); overflow-wrap: anywhere; }
</style>
