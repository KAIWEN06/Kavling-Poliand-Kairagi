<template>
  <!-- Daftar kartu: avatar bulat + 2-3 baris teks + badge (mis. calon pembeli) -->
  <div class="sk-cards" role="status" aria-busy="true" :aria-label="label">
    <div v-for="n in count" :key="n" class="sk-card">
      <Skeleton variant="circle" width="44px" height="44px" />
      <div class="sk-body">
        <Skeleton :width="n % 2 ? '55%' : '45%'" height="16px" border-radius="5px" />
        <Skeleton width="70%" height="12px" border-radius="4px" />
        <Skeleton v-if="lines > 2" width="48%" height="12px" border-radius="4px" />
      </div>
      <Skeleton width="72px" height="22px" border-radius="999px" />
    </div>
  </div>
</template>

<script setup lang="ts">
import Skeleton from '@/components/ui/Skeleton.vue'

withDefaults(defineProps<{ count?: number; lines?: number; label?: string }>(), {
  count: 5,
  lines: 3,
  label: 'Memuat daftar',
})
</script>

<style scoped>
.sk-cards { display: flex; flex-direction: column; gap: 10px; }
.sk-card {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px;
  background: var(--surface-primary, #fff);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card, 16px);
}
.sk-body { flex: 1; min-width: 0; display: grid; gap: 7px; }
</style>
