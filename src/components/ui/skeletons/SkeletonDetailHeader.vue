<template>
  <!-- Header detail: avatar + nama/kontak + badge, lalu kartu info berbaris label/nilai -->
  <div class="sk-detail" role="status" aria-busy="true" :aria-label="label">
    <div class="sk-head">
      <Skeleton variant="circle" width="56px" height="56px" />
      <div class="sk-head-text">
        <Skeleton width="58%" height="20px" border-radius="5px" />
        <Skeleton width="42%" height="13px" border-radius="4px" />
      </div>
      <Skeleton width="78px" height="24px" border-radius="999px" />
    </div>
    <div v-for="s in sections" :key="s" class="sk-card">
      <Skeleton width="36%" height="16px" border-radius="5px" />
      <div v-for="r in rows" :key="r" class="sk-line">
        <Skeleton width="30%" height="13px" border-radius="4px" />
        <Skeleton :width="r % 2 ? '38%' : '26%'" height="13px" border-radius="4px" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from '@/components/ui/Skeleton.vue'

withDefaults(defineProps<{ sections?: number; rows?: number; label?: string }>(), {
  sections: 2,
  rows: 4,
  label: 'Memuat detail',
})
</script>

<style scoped>
.sk-detail { display: grid; gap: var(--space-4, 16px); }
.sk-head { display: flex; align-items: center; gap: var(--space-3, 12px); }
.sk-head-text { flex: 1; min-width: 0; display: grid; gap: 8px; }
.sk-card {
  display: grid;
  gap: var(--space-3, 12px);
  padding: var(--space-4, 16px);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md, 14px);
  background: var(--surface-primary, #fff);
}
.sk-line { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3, 12px); }
</style>
