<template>
  <MarketingPageLayout title="Kaveling" tab-variant="owner" @refresh="load()">
    <div v-if="loading && !loaded" class="mk-section" role="status" aria-label="Memuat kaveling">
      <Skeleton v-for="n in 5" :key="n" height="76px" border-radius="14px" />
    </div>
    <StatusIllustration v-else-if="error && !loaded" :variant="resolveErrorVariant(error)" title="Kaveling belum dapat dimuat" :on-action="() => load()" />

    <template v-else>
      <Reveal :order="1">
        <section class="mk-section" aria-label="Stok per blok">
          <div class="mk-section-head">
            <div><h2>Per blok</h2><p>Ketuk nama blok untuk menyaring daftar.</p></div>
            <button type="button" class="mk-link" @click="router.push('/owner/siteplan')">Buka denah</button>
          </div>
          <div class="mk-table-wrap">
            <table class="mk-table ow-blocks">
              <thead>
                <tr>
                  <th scope="col">Blok</th>
                  <th v-for="column in COLUMNS" :key="column.status" scope="col" class="num">
                    <span class="ow-key" :class="`is-${column.status}`" aria-hidden="true" />{{ column.label }}
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr v-if="!blocks.length"><td colspan="4" class="mk-muted">Belum ada data kaveling.</td></tr>
                <tr v-for="item in blocks" :key="item.block" :class="{ 'is-picked': block === item.block }">
                  <th scope="row">
                    <button type="button" :aria-pressed="block === item.block" @click="block = block === item.block ? '' : item.block">
                      <span>{{ item.block }} <small>{{ item.total }} unit</small></span>
                      <span class="ow-stack" aria-hidden="true">
                        <span v-for="column in BAR_ORDER" v-show="item[column]" :key="column" :class="`is-${column}`" :style="{ flexGrow: item[column] }" />
                      </span>
                    </button>
                  </th>
                  <td v-for="column in COLUMNS" :key="column.status" class="num">{{ item[column.status] }}</td>
                </tr>
              </tbody>
              <tfoot v-if="blocks.length > 1">
                <tr>
                  <th scope="row">Semua blok</th>
                  <td v-for="column in COLUMNS" :key="column.status" class="num">{{ inventory[column.status] }}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      </Reveal>

      <Reveal :order="2">
        <section class="mk-section" aria-label="Daftar kaveling">
          <div class="mk-section-head"><div><h2>Daftar kaveling</h2></div></div>
          <label class="mk-field">
            <span>Cari</span>
            <input v-model="search" class="mk-input" type="search" enterkeyhint="search" placeholder="Nomor, blok, atau nama pembeli" />
          </label>
          <div class="mk-chips ow-status-chips" role="group" aria-label="Status kaveling">
            <button v-for="filter in filters" :key="filter.value" type="button" class="mk-chip" :aria-pressed="status === filter.value" @click="status = filter.value">
              {{ filter.label }}
            </button>
          </div>
          <button v-if="block" type="button" class="mk-btn mk-btn--ghost" @click="block = ''">Hanya {{ block }}. Tampilkan semua blok</button>

          <p v-if="!rows.length" class="mk-state">Tidak ada kaveling yang cocok. Ganti pencarian atau saringan.</p>
          <template v-else>
            <ul class="mk-card ow-lots">
              <li v-for="row in pager.items" :key="row.id">
                <button type="button" @click="router.push(`/owner/siteplan?kavling=${row.id}`)">
                  <span>
                    <strong>{{ row.lotNumber }}</strong>
                    <small>{{ row.meta }}</small>
                    <small v-if="row.buyer">Pembeli: {{ row.buyer }}</small>
                  </span>
                  <StatusBadge :tone="row.tone" :label="row.statusLabel" />
                </button>
              </li>
            </ul>
            <AppPagination :page="pager.page" :total-pages="pager.totalPages" :total="pager.total" :page-size="pager.pageSize" label="Halaman kaveling" @update:page="pager.setPage" />
          </template>
        </section>
      </Reveal>
    </template>
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
import { blockInventory } from '@/utils/ownerReport'
import { getStatusLabel, normalizeLotStatus } from '@/utils/siteplan'

const router = useIonRouter()
const query = useOwnRouteQuery()
const { lots, sales, inventory, loading, loaded, error, load } = useOwnerData()

const COLUMNS = [
  { status: 'available', label: 'Tersedia' },
  { status: 'booking', label: 'Dipesan' },
  { status: 'sold', label: 'Terjual' },
] as const
const BAR_ORDER = ['sold', 'booking', 'available'] as const

const STATUSES = ['all', 'available', 'booking', 'sold']
const statusFromQuery = () => (STATUSES.includes(String(query.value.status)) ? String(query.value.status) : 'all')
const status = ref(statusFromQuery())
watch(query, () => (status.value = statusFromQuery()))
const search = ref('')
const block = ref('')

const filters = [{ value: 'all', label: 'Semua' }, ...COLUMNS.map((column) => ({ value: column.status, label: column.label }))]

const TONES: Record<string, BadgeTone> = { available: 'success', booking: 'gold', sold: 'danger' }

const allRows = computed(() => {
  const buyerByLot = new Map(sales.value.map((sale) => [sale.lotNumber, sale.customerName]))
  return lots.value.map((lot) => {
    const key = normalizeLotStatus(lot.status)
    const lotNumber = lot.lot_number || `#${lot.id}`
    const blockName = lot.blocks?.name || lot.blocks?.code || 'Tanpa blok'
    const price = Number(lot.promo_price) || Number(lot.cash_price) || 0
    return {
      id: lot.id,
      lotNumber,
      block: blockName,
      status: key as string,
      statusLabel: getStatusLabel(lot.status),
      tone: TONES[key] ?? ('neutral' as BadgeTone),
      buyer: key === 'available' ? '' : buyerByLot.get(lotNumber) ?? '',
      meta: [blockName === 'Tanpa blok' ? blockName : `Blok ${blockName}`, lot.area ? `${lot.area} m²` : '', price ? formatRupiah(price) : ''].filter(Boolean).join(' · '),
    }
  })
})

const blocks = computed(() => blockInventory(allRows.value))

const rows = computed(() => {
  const needle = search.value.trim().toLocaleLowerCase('id-ID')
  return allRows.value
    .filter((row) => status.value === 'all' || row.status === status.value)
    .filter((row) => !block.value || row.block === block.value)
    .filter((row) => !needle || `${row.lotNumber} ${row.block} ${row.buyer}`.toLocaleLowerCase('id-ID').includes(needle))
    .sort((a, b) => compareLotNumber(a.lotNumber, b.lotNumber))
})
const pager = usePagination(rows, { pageSize: 10, resetOn: [status, search, block] })
</script>

<style scoped>
.ow-blocks th, .ow-blocks td { padding-inline: var(--space-2); }
.ow-blocks th:first-child { padding-left: var(--space-3); }
.ow-blocks th:last-child, .ow-blocks td:last-child { padding-right: var(--space-3); }
.mk-section-head .mk-link { white-space: nowrap; }
.ow-status-chips { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: var(--space-1); }
.ow-status-chips .mk-chip { min-width: 0; padding-inline: 2px; }
.ow-blocks thead th.num { text-align: right; }
.ow-blocks tbody th, .ow-blocks tfoot th { background: none; border-top: 1px solid var(--border-default); color: var(--text-primary); font-size: var(--text-sm); white-space: normal; }
.ow-blocks tbody td { vertical-align: middle; font-size: var(--text-md); font-weight: 600; }
.ow-blocks tbody th { padding-block: 0; width: 34%; }
.ow-blocks tfoot th, .ow-blocks tfoot td { background: var(--surface-muted); font-weight: 700; }
.ow-blocks tr.is-picked > * { background: var(--green-50); }
.ow-blocks tbody button {
  width: 100%;
  min-height: 56px;
  display: grid;
  align-content: center;
  gap: 6px;
  padding: var(--space-2) 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}
.ow-blocks tbody button small { display: block; white-space: nowrap; color: var(--text-secondary); font-size: var(--text-xs); font-weight: 500; }
.ow-blocks tbody button:active { opacity: 0.7; }
.ow-blocks tbody button:focus-visible { outline: 3px solid var(--green-700); outline-offset: -1px; border-radius: var(--radius-xs); }
.ow-stack { display: flex; gap: 1px; height: 6px; overflow: hidden; border-radius: var(--radius-pill); background: var(--surface-sunken); }
.ow-stack span { flex-basis: 0; min-width: 3px; }
.ow-key { display: inline-block; width: 8px; height: 8px; margin-right: 4px; border-radius: 50%; }
.is-sold { --ow-color: var(--danger-text); }
.is-booking { --ow-color: var(--gold-700); }
.is-available { --ow-color: var(--green-500); }
.ow-stack span, .ow-key { background: var(--ow-color); }

.ow-lots { padding: 0; margin: 0; overflow: hidden; list-style: none; }
.ow-lots li + li { border-top: 1px solid var(--border-default); }
.ow-lots button { width: 100%; min-height: 64px; display: flex; justify-content: space-between; align-items: center; gap: var(--space-3); padding: var(--space-3) var(--space-4); border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; touch-action: manipulation; }
.ow-lots button:active { background: var(--surface-muted); }
.ow-lots button:focus-visible { outline: 3px solid var(--green-700); outline-offset: -3px; }
.ow-lots button > span:first-child { display: grid; gap: 2px; min-width: 0; }
.ow-lots strong { font-size: var(--text-md); }
.ow-lots small { color: var(--text-secondary); font-size: var(--text-xs); overflow-wrap: anywhere; }
</style>
