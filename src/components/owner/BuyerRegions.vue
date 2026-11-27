<template>
  <section class="regions" aria-labelledby="regions-title">
    <header class="regions__head">
      <h2 id="regions-title">Asal pembeli</h2>
      <p>{{ buyers.length }} pembeli, semua tahun</p>
    </header>

    <div class="regions__levels" role="group" aria-label="Rincian wilayah">
      <button v-for="(item, index) in REGION_LEVELS" :key="item.value" type="button" :aria-pressed="level === item.value" @click="showLevel(index)">
        {{ item.label }}
      </button>
    </div>

    <div v-if="trail.length" class="regions__scope">
      <p>Di <strong>{{ trailLabel }}</strong></p>
      <button type="button" class="mk-link" @click="reset">Semua daerah</button>
    </div>

    <p v-if="!ranking.rows.length" class="regions__empty">
      {{ ranking.total ? `Belum ada pembeli yang mengisi ${current.noun}.` : 'Belum ada pembeli.' }}
    </p>

    <template v-else>
      <p v-if="tiedAtTop > 1" class="regions__note" aria-live="polite">
        {{ tiedAtTop }} {{ current.noun }} sama-sama terbanyak.
      </p>

      <ol :key="`${level}|${trail.length}|${trailLabel}`" class="regions__list">
        <li v-for="(row, index) in visibleRows" :key="row.path.join('|')" :style="{ '--i': Math.min(index, 8) }">
          <component
            :is="nextLevel ? 'button' : 'div'"
            :type="nextLevel ? 'button' : undefined"
            class="region"
            :class="{ 'region--lead': isLeader(row), 'region--open': nextLevel }"
            @click="openRow(row)"
          >
            <span class="region__rank"><span class="sr-only">Peringkat </span>{{ row.rank }}</span>
            <span class="region__place">
              <span v-if="isLeader(row)" class="region__flag">Paling banyak</span>
              <span class="region__name">{{ row.name }}</span>
              <span v-if="row.context" class="region__context">{{ row.context }}</span>
            </span>
            <span class="region__count">
              <strong>{{ row.count }}<span class="sr-only"> pembeli</span></strong>
              <span>{{ row.share }}%</span>
            </span>
            <IonIcon v-if="nextLevel" class="region__chevron" :icon="chevronForwardOutline" aria-hidden="true" />
            <span class="region__track" aria-hidden="true"><span class="region__bar" :style="{ transform: `scaleX(${row.share / 100})` }" /></span>
            <span v-if="nextLevel" class="sr-only">Buka {{ nextLevel.noun }} di {{ row.name }}</span>
          </component>
        </li>
      </ol>

      <button v-if="ranking.rows.length > LIMIT" type="button" class="mk-btn mk-btn--ghost" :aria-expanded="expanded" @click="expanded = !expanded">
        {{ expanded ? `Ringkas ke ${LIMIT} teratas` : `Lihat semua ${ranking.rows.length} daerah` }}
      </button>
    </template>

    <p v-if="ranking.unfilled && ranking.rows.length" class="regions__note">
      {{ ranking.unfilled }} pembeli belum mengisi {{ current.noun }}.
    </p>
  </section>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { IonIcon } from '@ionic/vue'
import { chevronForwardOutline } from 'ionicons/icons'
import { rankRegions, REGION_LEVELS, type BuyerAddress, type RegionLevel, type RegionRow } from '@/utils/buyerRegions'

const props = defineProps<{ buyers: BuyerAddress[] }>()

const LIMIT = 5
const level = ref<RegionLevel>('city')
/* Wilayah induk yang sedang dibuka. Kunci untuk menyaring, nama untuk ditampilkan. */
const trail = ref<Array<{ key: string; name: string }>>([])
const expanded = ref(false)

const depth = computed(() => REGION_LEVELS.findIndex((item) => item.value === level.value))
const current = computed(() => REGION_LEVELS[depth.value])
const nextLevel = computed(() => REGION_LEVELS[depth.value + 1])
const ranking = computed(() => rankRegions(props.buyers, level.value, trail.value.map((item) => item.key)))
const visibleRows = computed(() => (expanded.value ? ranking.value.rows : ranking.value.rows.slice(0, LIMIT)))
const tiedAtTop = computed(() => ranking.value.rows.filter((row) => row.rank === 1).length)
const trailLabel = computed(() => trail.value.map((item) => item.name).filter(Boolean).reverse().join(', '))

/* Sorotan hanya untuk satu pemenang; kalau seri, tidak ada daerah yang ditonjolkan. */
const isLeader = (row: RegionRow) => row.rank === 1 && tiedAtTop.value === 1

function showLevel(index: number) {
  level.value = REGION_LEVELS[index].value
  trail.value = trail.value.slice(0, index)
  expanded.value = false
}

function openRow(row: RegionRow) {
  if (!nextLevel.value) return
  // Tingkat yang kosong tetap masuk jalur (kuncinya '') agar posisinya tidak bergeser.
  trail.value = row.path.map((key, index) => ({ key, name: row.names[index] }))
  level.value = nextLevel.value.value
  expanded.value = false
}

function reset() {
  trail.value = []
  showLevel(0)
}
</script>

<style scoped>
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.regions {
  display: grid;
  gap: var(--space-3);
  min-width: 0;
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--surface-primary);
}
.regions__head h2 { margin: 0; font-family: var(--font-display); font-size: var(--text-lg); font-weight: 600; }
.regions__head p,
.regions__note { margin: 2px 0 0; color: var(--text-secondary); font-size: var(--text-xs); }
.regions__empty { margin: 0; padding: var(--space-5) 0; color: var(--text-secondary); font-size: var(--text-sm); text-align: center; }

.regions__levels {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 4px;
  padding: 4px;
  border-radius: var(--radius-pill);
  background: var(--surface-muted);
}
.regions__levels button {
  min-height: 44px;
  padding: 0 var(--space-1);
  border: 0;
  border-radius: var(--radius-pill);
  background: transparent;
  color: var(--text-secondary);
  font: inherit;
  font-size: var(--text-xs);
  font-weight: 600;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  transition: transform var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}
.regions__levels button[aria-pressed='true'] { background: var(--green-700); color: #fff; }
.regions__levels button:active { transform: scale(0.97); }

.regions__scope { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); }
.regions__scope p { margin: 0; min-width: 0; color: var(--text-secondary); font-size: var(--text-sm); overflow-wrap: anywhere; }
.regions__scope strong { color: var(--text-primary); }
.regions__scope .mk-link { flex: 0 0 auto; }

.regions__list { display: grid; gap: var(--space-2); margin: 0; padding: 0; list-style: none; }
.regions__list li { animation: region-in var(--dur-slow) var(--ease-spring) both; animation-delay: calc(var(--i) * 60ms); }

.region {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr) auto auto;
  align-items: center;
  column-gap: var(--space-2);
  row-gap: var(--space-2);
  width: 100%;
  min-height: 56px;
  padding: var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--surface-primary);
  color: var(--text-primary);
  font: inherit;
  text-align: left;
}
.region--open {
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  transition: transform var(--dur-fast) var(--ease-spring), border-color var(--dur-fast) var(--ease-out);
}
.region--open:active { transform: scale(0.98); }
@media (hover: hover) and (pointer: fine) {
  .region--open:hover { border-color: var(--green-700); }
}
.region:focus-visible,
.regions__levels button:focus-visible { outline: 2px solid var(--green-700); outline-offset: 2px; }

.region__rank { grid-column: 1; align-self: start; color: var(--text-secondary); font-family: var(--font-display); font-size: var(--text-md); font-weight: 600; font-variant-numeric: lining-nums tabular-nums; }
.region__place { grid-column: 2; display: grid; gap: 2px; min-width: 0; }
.region__name { font-size: var(--text-sm); font-weight: 700; overflow-wrap: anywhere; }
.region__context { color: var(--text-secondary); font-size: var(--text-xs); overflow-wrap: anywhere; }
.region__count { grid-column: 3; display: grid; justify-items: end; font-variant-numeric: lining-nums tabular-nums; }
.region__count strong { font-size: var(--text-md); }
.region__count span { color: var(--text-secondary); font-size: var(--text-xs); }
.region__chevron { grid-column: 4; color: var(--text-secondary); font-size: 16px; }
.region__track { grid-column: 2 / -1; height: 6px; overflow: hidden; border-radius: var(--radius-pill); background: var(--surface-muted); }
.region__bar { display: block; width: 100%; height: 100%; background: var(--green-700); transform-origin: left; }
.region__bar { animation: region-bar var(--dur-slow) var(--ease-out) both; animation-delay: calc(var(--i) * 60ms); }

/* Daerah teratas: panel hijau hutan dengan cahaya emas, seperti angka utama halaman. */
.region--lead {
  padding: var(--space-4) var(--space-3);
  border-color: var(--surface-forest);
  background:
    radial-gradient(120% 90% at 100% 0%, rgba(203, 160, 68, 0.22), transparent 60%),
    var(--surface-forest);
  color: #fff;
  box-shadow: var(--shadow-md);
}
.region--lead .region__rank,
.region--lead .region__flag { color: var(--poliland-gold-soft); }
.region__flag { font-size: var(--text-xs); font-weight: 600; }
.region--lead .region__name { font-family: var(--font-display); font-size: var(--text-xl); font-weight: 600; line-height: 1.2; }
.region--lead .region__context,
.region--lead .region__count span,
.region--lead .region__chevron { color: var(--on-forest); }
.region--lead .region__count strong { font-family: var(--font-display); font-size: var(--text-2xl); }
.region--lead .region__track { background: rgba(255, 255, 255, 0.18); }
.region--lead .region__bar { background: var(--poliland-gold); }

/* scale terpisah dari transform, jadi panjang batang tetap sesuai persentasenya. */
@keyframes region-bar { from { scale: 0 1; } }
@keyframes region-in { from { opacity: 0; translate: 0 8px; } }
@keyframes region-fade { from { opacity: 0; } }

@media (prefers-reduced-motion: reduce) {
  .regions__list li { animation: region-fade var(--dur-fast) linear both; }
  .region__bar { animation: none; }
}
</style>
