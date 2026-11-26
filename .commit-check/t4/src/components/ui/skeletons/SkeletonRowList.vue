<template>
  <!--
    Meniru .mk-table-wrap > .mk-table--stack (tampilan mobile): setiap baris =
    judul (+ sub-teks opsional) lalu N pasangan "label ... nilai" / badge.
  -->
  <div class="sk-rows" role="status" aria-busy="true" :aria-label="label">
    <div v-for="n in rows" :key="n" class="sk-row">
      <div class="sk-main">
        <Skeleton :width="titleWidths[(n - 1) % titleWidths.length]" height="16px" border-radius="5px" />
        <Skeleton v-if="subtitle" width="55%" height="12px" border-radius="4px" />
      </div>
      <div v-for="m in fields" :key="m" class="sk-field">
        <Skeleton width="28%" height="12px" border-radius="4px" />
        <Skeleton v-if="badges.includes(m)" width="84px" height="22px" border-radius="999px" />
        <Skeleton v-else :width="valueWidths[(n + m) % valueWidths.length]" height="14px" border-radius="4px" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from '@/components/ui/Skeleton.vue'

withDefaults(
  defineProps<{
    rows?: number
    /** jumlah pasangan label/nilai per baris */
    fields?: number
    /** indeks field (1-based) yang berupa badge, mis. [3] */
    badges?: number[]
    subtitle?: boolean
    label?: string
  }>(),
  { rows: 4, fields: 3, badges: () => [], subtitle: true, label: 'Memuat data' },
)

// Lebar bervariasi supaya tidak terlihat seperti kotak copy-paste
const titleWidths = ['52%', '40%', '62%', '46%']
const valueWidths = ['34%', '26%', '42%', '30%']
</script>

<style scoped>
.sk-rows {
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md, 14px);
  background: var(--surface-primary, #fff);
  overflow: hidden;
}
.sk-row {
  display: grid;
  gap: 4px;
  padding: var(--space-3, 12px) var(--space-4, 16px);
  border-top: 1px solid var(--border-default);
}
.sk-row:first-child { border-top: 0; }
.sk-main { display: grid; gap: 6px; padding-bottom: 4px; }
.sk-field {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3, 12px);
  min-height: 22px;
}
</style>
