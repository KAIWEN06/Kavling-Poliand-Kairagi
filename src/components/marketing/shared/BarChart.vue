<template>
  <figure class="mk-chart">
    <figcaption class="mk-chart__head">
      <div>
        <strong>{{ title }}</strong>
        <span v-if="subtitle">{{ subtitle }}</span>
      </div>
      <button type="button" class="mk-link" :aria-pressed="showTable" @click="showTable = !showTable">
        {{ showTable ? 'Lihat grafik' : 'Lihat tabel' }}
      </button>
    </figcaption>

    <p v-if="!items.length || max === 0" class="mk-chart__empty">Belum ada data pada periode ini.</p>

    <!-- Kolom vertikal (perubahan waktu) -->
    <div v-else-if="!showTable && orientation === 'vertical'" class="mk-cols" role="list">
      <div
        v-for="(item, index) in items"
        :key="item.label + index"
        class="mk-col"
        role="listitem"
        tabindex="0"
        :aria-label="`${item.label}: ${format(item.value)}`"
        @mouseenter="hover = index"
        @mouseleave="hover = null"
        @focus="hover = index"
        @blur="hover = null"
      >
        <span v-if="hover === index" class="mk-tip" role="tooltip">
          <b>{{ item.label }}</b>{{ format(item.value) }}
        </span>
        <span class="mk-col__track">
          <span class="mk-col__bar" :style="{ height: pct(item.value) }" />
        </span>
        <span class="mk-col__label" :class="{ 'mk-col__label--hidden': !showTick(index) }">{{ item.short ?? item.label }}</span>
      </div>
    </div>

    <!-- Batang horizontal (perbandingan) -->
    <ul v-else-if="!showTable" class="mk-rows">
      <li
        v-for="(item, index) in items"
        :key="item.label + index"
        tabindex="0"
        :aria-label="`${item.label}: ${format(item.value)}`"
        @mouseenter="hover = index"
        @mouseleave="hover = null"
        @focus="hover = index"
        @blur="hover = null"
      >
        <span class="mk-rows__label">{{ item.label }}</span>
        <span class="mk-rows__track">
          <span class="mk-rows__bar" :style="{ width: pct(item.value) }" />
        </span>
        <span class="mk-rows__value">{{ format(item.value) }}</span>
        <span v-if="item.note && hover === index" class="mk-rows__note">{{ item.note }}</span>
      </li>
    </ul>

    <table v-else class="mk-table">
      <thead><tr><th>{{ labelHeader }}</th><th class="num">{{ valueHeader }}</th></tr></thead>
      <tbody>
        <tr v-for="(item, index) in items" :key="item.label + index">
          <td>{{ item.label }}</td>
          <td class="num">{{ format(item.value) }}</td>
        </tr>
      </tbody>
    </table>
  </figure>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

export interface BarItem { label: string; value: number; short?: string; note?: string }

const props = withDefaults(
  defineProps<{
    title: string
    subtitle?: string
    items: BarItem[]
    orientation?: 'vertical' | 'horizontal'
    formatter?: (value: number) => string
    labelHeader?: string
    valueHeader?: string
  }>(),
  { subtitle: '', orientation: 'horizontal', formatter: undefined, labelHeader: 'Kategori', valueHeader: 'Nilai' },
)

const showTable = ref(false)
const hover = ref<number | null>(null)
const max = computed(() => Math.max(0, ...props.items.map((i) => Number(i.value) || 0)))

function pct(value: number) {
  if (!max.value) return '0%'
  const v = Math.max(0, Number(value) || 0)
  return v === 0 ? '0%' : `${Math.max(2, (v / max.value) * 100)}%`
}

function format(value: number) {
  return props.formatter ? props.formatter(Number(value) || 0) : (Number(value) || 0).toLocaleString('id-ID')
}

// Hindari label sumbu bertumpuk: tampilkan maks. ~8 label.
function showTick(index: number) {
  const step = Math.ceil(props.items.length / 8)
  return index % step === 0 || index === props.items.length - 1
}
</script>

<style scoped>
.mk-chart {
  margin: 0;
  padding: 14px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  background: var(--surface-primary);
  display: grid;
  gap: 14px;
  min-width: 0;
}
.mk-chart__head { display: flex; justify-content: space-between; align-items: flex-start; gap: 12px; }
.mk-chart__head strong { display: block; font-size: 14px; }
.mk-chart__head span { display: block; margin-top: 2px; color: var(--text-secondary); font-size: 12px; }
.mk-chart__empty { margin: 0; padding: 24px 0; text-align: center; color: var(--text-secondary); font-size: 13px; }

.mk-cols { display: flex; align-items: flex-end; gap: 2px; height: 180px; padding-top: 28px; position: relative; }
.mk-col { flex: 1 1 0; min-width: 0; height: 100%; display: grid; grid-template-rows: 1fr auto; gap: 6px; position: relative; outline: none; }
.mk-col__track { display: flex; align-items: flex-end; border-bottom: 1px solid var(--border-default); }
.mk-col__bar { width: 100%; max-width: 28px; margin: 0 auto; background: var(--poliland-green); border-radius: 4px 4px 0 0; min-height: 0; }
.mk-col:hover .mk-col__bar,
.mk-col:focus-visible .mk-col__bar { background: var(--poliland-gold-text); }
.mk-col__label { font-size: 10px; color: var(--text-secondary); text-align: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.mk-col__label--hidden { visibility: hidden; }
.mk-tip {
  position: absolute; bottom: calc(100% - 24px); left: 50%; transform: translateX(-50%);
  z-index: 2; padding: 6px 8px; border-radius: 8px; background: var(--text-primary); color: #fff;
  font-size: 11px; white-space: nowrap; pointer-events: none; display: grid; gap: 2px;
}

.mk-rows { list-style: none; margin: 0; padding: 0; display: grid; gap: 10px; }
.mk-rows li { display: grid; grid-template-columns: minmax(90px, 32%) 1fr auto; align-items: center; gap: 10px; outline: none; border-radius: 6px; }
.mk-rows li:focus-visible { outline: 3px solid var(--poliland-gold); outline-offset: 2px; }
.mk-rows__label { font-size: 13px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.mk-rows__track { height: 10px; background: var(--surface-muted); border-radius: 4px; overflow: hidden; }
.mk-rows__bar { display: block; height: 100%; background: var(--poliland-green); border-radius: 0 4px 4px 0; }
.mk-rows li:hover .mk-rows__bar,
.mk-rows li:focus-visible .mk-rows__bar { background: var(--poliland-gold-text); }
.mk-rows__value { font-size: 13px; font-weight: 600; font-variant-numeric: tabular-nums; white-space: nowrap; }
.mk-rows__note { grid-column: 1 / -1; color: var(--text-secondary); font-size: 12px; }
</style>
