<template>
  <p v-if="!total" class="mk-card origin-empty">Belum ada konsumen pada periode ini. Coba periode yang lebih panjang.</p>

  <template v-else>
    <section class="origin-hero" aria-label="Ringkasan asal konsumen">
      <SceneBackdrop :sun="false" :lines="false" height="38%" />
      <div class="origin-hero__body">
        <p class="origin-hero__total">
          <strong><CountUp :value="String(total)" :duration="900" /></strong>
          <span>{{ memberName ? `konsumen ${memberName}` : 'konsumen' }}, {{ buyers }} sudah membeli</span>
        </p>
        <p v-if="leader" class="origin-hero__lead">Paling banyak dari {{ leader.city }}: {{ leader.clients }} orang.</p>

        <template v-if="channels.length">
          <div class="origin-split" aria-hidden="true">
            <span
              v-for="item in channels.filter((c) => c.clients)"
              :key="item.source"
              :class="`is-${item.source.toLowerCase()}`"
              :style="{ flexGrow: item.clients }"
            />
          </div>
          <ul class="origin-legend">
            <li v-for="item in channels" :key="item.source">
              <i :class="`is-${item.source.toLowerCase()}`" aria-hidden="true" />
              <span class="origin-legend__name">{{ item.label }}</span>
              <span class="origin-legend__buyers">{{ item.buyers }} pembeli</span>
              <strong>{{ item.clients }}<small>{{ share(item.clients) }}%</small></strong>
            </li>
          </ul>
        </template>
      </div>
    </section>

    <section class="mk-section">
      <SectionHeader title="Per wilayah" />
      <div v-if="rows.length > 1" class="mk-chips" role="group" aria-label="Urutkan wilayah">
        <button type="button" class="mk-chip" :aria-pressed="sortBy === 'clients'" @click="sortBy = 'clients'">Konsumen terbanyak</button>
        <button type="button" class="mk-chip" :aria-pressed="sortBy === 'buyers'" @click="sortBy = 'buyers'">Pembeli terbanyak</button>
      </div>

      <ol class="origin-list">
        <li v-for="(row, index) in visibleRows" :key="row.province + row.city">
          <ScrollReveal :delay="Math.min(index, 8) * 60">
            <article class="origin-region">
              <header>
                <h3>
                  {{ row.city === UNKNOWN ? 'Wilayah belum diisi' : row.city }}
                  <span v-if="row.province !== UNKNOWN">{{ row.province }}</span>
                </h3>
                <p><strong>{{ row.clients }}</strong> konsumen</p>
              </header>
              <div class="origin-bar" aria-hidden="true">
                <div class="origin-bar__fill" :style="{ width: `${(row.clients / largest) * 100}%` }">
                  <span
                    v-for="part in parts(row)"
                    :key="part.source"
                    :class="`is-${part.source.toLowerCase()}`"
                    :style="{ flexGrow: part.clients }"
                  />
                </div>
              </div>
              <p v-if="parts(row).length" class="origin-region__parts">
                <span v-for="part in parts(row)" :key="part.source">
                  <i :class="`is-${part.source.toLowerCase()}`" aria-hidden="true" />{{ part.clients }} {{ part.short }}
                </span>
              </p>
              <p class="origin-region__buyers">
                {{ row.buyers ? `${row.buyers} sudah membeli (${row.conversion_rate ?? 0}%)` : 'Belum ada yang membeli' }}
              </p>
              <p v-if="row.city === UNKNOWN" class="origin-region__buyers">Lengkapi lewat Ubah informasi di detail klien.</p>
            </article>
          </ScrollReveal>
        </li>
      </ol>

      <button v-if="rows.length > LIMIT" type="button" class="mk-chip origin-more" :aria-expanded="showAll" @click="showAll = !showAll">
        {{ showAll ? 'Ringkas daftar' : `Tampilkan ${rows.length - LIMIT} wilayah lainnya` }}
      </button>
    </section>
  </template>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import CountUp from '@/components/ui/CountUp.vue'
import SceneBackdrop from '@/components/ui/SceneBackdrop.vue'
import ScrollReveal from '@/components/ui/ScrollReveal.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import type { MarketingReport } from '@/services/marketing/marketingCrmService'

type Region = MarketingReport['regions'][number]

const props = withDefaults(
  defineProps<{
    regions: Region[]
    sources?: MarketingReport['region_sources']
    /** Terisi saat laporan disaring ke satu pemasar. */
    memberName?: string
  }>(),
  { sources: undefined, memberName: '' },
)

const UNKNOWN = 'Belum diisi'
const LIMIT = 8
const CHANNELS = [
  { source: 'Marketing', label: 'Lewat pemasar', short: 'lewat pemasar', key: 'via_marketing' },
  { source: 'Admin', label: 'Lewat Admin', short: 'lewat Admin', key: 'via_admin' },
  { source: 'Client', label: 'Daftar sendiri', short: 'daftar sendiri', key: 'via_client' },
] as const

const sortBy = ref<'clients' | 'buyers'>('clients')
const showAll = ref(false)

const total = computed(() => props.regions.reduce((sum, r) => sum + Number(r.clients), 0))
const buyers = computed(() => props.regions.reduce((sum, r) => sum + Number(r.buyers), 0))
const share = (value: number) => Math.round((value / total.value) * 100)

/** Ketiga jalur selalu tampil, termasuk yang nol, agar terlihat bahwa Admin ikut dihitung. */
const channels = computed(() =>
  props.sources
    ? CHANNELS.map((channel) => {
        const row = props.sources?.find((s) => s.source === channel.source)
        return { ...channel, clients: Number(row?.clients ?? 0), buyers: Number(row?.buyers ?? 0) }
      })
    : [],
)

const parts = (row: Region) =>
  CHANNELS.map((channel) => ({ ...channel, clients: Number(row[channel.key] ?? 0) })).filter((p) => p.clients > 0)

/** "Belum diisi" selalu di bawah supaya tidak terbaca sebagai wilayah. */
const rows = computed(() =>
  [...props.regions].sort(
    (a, b) =>
      Number(a.city === UNKNOWN) - Number(b.city === UNKNOWN) ||
      Number(b[sortBy.value]) - Number(a[sortBy.value]) ||
      Number(b.clients) - Number(a.clients) ||
      a.city.localeCompare(b.city),
  ),
)
const visibleRows = computed(() => (showAll.value ? rows.value : rows.value.slice(0, LIMIT)))
const largest = computed(() => Math.max(1, ...props.regions.map((r) => Number(r.clients))))

/** Hanya disebut bila ada satu wilayah yang unggul sendirian. */
const leader = computed(() => {
  const known = props.regions
    .filter((r) => r.city !== UNKNOWN)
    .sort((a, b) => Number(b.clients) - Number(a.clients))
  if (!known.length || (known[1] && Number(known[1].clients) === Number(known[0].clients))) return null
  return known[0]
})
</script>

<style scoped>
.origin-empty { margin: 0; color: var(--text-secondary); font-size: var(--text-sm); }

/* Panel hijau: teks hanya putih, --on-forest, atau emas lembut. */
.origin-hero {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  border-radius: var(--radius-lg);
  background:
    radial-gradient(circle at 100% 0%, rgba(203, 160, 68, 0.28) 0%, rgba(203, 160, 68, 0) 62%),
    var(--surface-forest);
  color: var(--on-forest);
  box-shadow: var(--shadow-md);
}
.origin-hero__body { position: relative; z-index: 1; display: grid; gap: var(--space-4); padding: var(--space-6) var(--space-4); }
.origin-hero p { margin: 0; }
.origin-hero__total { display: grid; gap: 2px; }
.origin-hero__total strong {
  color: var(--gold-100);
  font-family: var(--font-display);
  font-size: clamp(3rem, 15vw, 4.25rem);
  font-weight: 650;
  line-height: 1;
}
.origin-hero__total > span { font-size: var(--text-sm); }
.origin-hero__lead { font-family: var(--font-display); font-size: var(--text-lg); line-height: 1.3; color: #fff; }

.origin-split { display: flex; gap: 3px; height: 14px; border-radius: var(--radius-pill); overflow: hidden; transform-origin: left; animation: origin-grow 700ms var(--ease-out) 150ms both; }
.origin-split span { flex-basis: 0; min-width: 6px; }

.origin-legend { list-style: none; margin: 0; padding: 0; }
.origin-legend li {
  display: grid;
  grid-template-columns: 12px minmax(0, 1fr) auto;
  grid-template-areas: 'dot name count' '. buyers count';
  align-items: center;
  column-gap: var(--space-3);
  padding: var(--space-3) 0;
  border-top: 1px solid rgba(244, 241, 232, 0.18);
}
.origin-legend li:last-child { padding-bottom: 0; }
.origin-legend i { grid-area: dot; width: 12px; height: 12px; border-radius: 4px; }
.origin-legend__name { grid-area: name; font-size: var(--text-sm); font-weight: 700; }
.origin-legend__buyers { grid-area: buyers; font-size: var(--text-xs); }
.origin-legend strong { grid-area: count; display: flex; align-items: baseline; gap: var(--space-2); color: #fff; font-size: 1.5rem; font-variant-numeric: lining-nums tabular-nums; }
.origin-legend small { min-width: 4ch; text-align: right; color: var(--gold-100); font-size: var(--text-xs); font-weight: 600; }

/* Warna jalur: versi terang di panel hijau, versi pekat di kartu putih. */
.origin-hero .is-marketing { background: var(--gold-100); }
.origin-hero .is-admin { background: #fff; }
.origin-hero .is-client { background: #8FC17E; }
.origin-region .is-marketing { background: var(--gold-700); }
.origin-region .is-admin { background: var(--surface-forest); }
.origin-region .is-client { background: #5C8D4E; }

.origin-list { list-style: none; margin: 0; padding: 0; display: grid; gap: var(--space-3); }
@media (min-width: 720px) { .origin-list { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
.origin-list li { min-width: 0; }
.origin-list li > * { height: 100%; }

.origin-region {
  display: grid;
  align-content: start;
  gap: var(--space-2);
  height: 100%;
  box-sizing: border-box;
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--surface-primary);
  box-shadow: var(--shadow-sm);
}
.origin-region header { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); }
.origin-region h3 { margin: 0; min-width: 0; font-family: var(--font-display); font-size: var(--text-lg); font-weight: 650; line-height: 1.25; overflow-wrap: anywhere; }
.origin-region h3 span { display: block; margin-top: 2px; color: var(--text-secondary); font-family: var(--font-ui); font-size: var(--text-xs); font-weight: 500; }
.origin-region p { margin: 0; }
.origin-region header p { flex: 0 0 auto; color: var(--text-secondary); font-size: var(--text-xs); }
.origin-region header p strong { color: var(--text-primary); font-size: 1.375rem; font-variant-numeric: lining-nums tabular-nums; }

.origin-bar { height: 10px; border-radius: var(--radius-pill); background: var(--surface-muted); overflow: hidden; }
.origin-bar__fill { display: flex; gap: 2px; height: 100%; min-width: 6px; border-radius: var(--radius-pill); overflow: hidden; transform-origin: left; animation: origin-grow var(--dur-slow) var(--ease-out) both; }
.origin-bar__fill span { flex-basis: 0; }

.origin-region__parts { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-3); font-size: var(--text-sm); font-weight: 600; }
.origin-region__parts span { display: inline-flex; align-items: center; gap: 6px; }
.origin-region__parts i { width: 10px; height: 10px; border-radius: 3px; }
.origin-region__buyers { color: var(--text-secondary); font-size: var(--text-xs); }

.origin-more { justify-self: center; }

@keyframes origin-grow { from { transform: scaleX(0); } }

@media (prefers-reduced-motion: reduce) {
  .origin-split,
  .origin-bar__fill { animation: none; }
}
</style>
