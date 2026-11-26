<template>
  <!-- Meniru .mk-grid + StatCard: min-height 104px, label (xs) / nilai (~22-28px) / hint (xs) -->
  <div class="sk-stat-grid" role="status" aria-busy="true" :aria-label="label">
    <div v-for="n in count" :key="n" class="sk-stat">
      <Skeleton width="55%" height="12px" border-radius="4px" />
      <Skeleton width="70%" height="26px" border-radius="6px" />
      <Skeleton v-if="hint" width="40%" height="12px" border-radius="4px" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from '@/components/ui/Skeleton.vue'

withDefaults(defineProps<{ count?: number; hint?: boolean; label?: string }>(), {
  count: 4,
  hint: true,
  label: 'Memuat ringkasan',
})
</script>

<style scoped>
.sk-stat-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3, 12px);
}
.sk-stat {
  display: grid;
  align-content: space-between;
  gap: var(--space-2, 8px);
  min-width: 0;
  min-height: 104px;
  padding: var(--space-4, 16px);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md, 14px);
  background: var(--surface-primary, #fff);
}
@media (min-width: 720px) {
  .sk-stat-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}
</style>
