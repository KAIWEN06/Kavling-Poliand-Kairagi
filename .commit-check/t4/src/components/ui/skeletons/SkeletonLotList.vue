<template>
  <!-- Meniru kartu kaveling (.kv-card.kv-lot): kode+meta, badge status, harga, tombol aksi -->
  <ul class="sk-lots" role="status" aria-busy="true" aria-label="Memuat data kaveling">
    <li v-for="n in count" :key="n" class="sk-lot">
      <div class="sk-lot-top">
        <div class="sk-lot-info">
          <Skeleton width="38%" height="19px" border-radius="5px" />
          <Skeleton width="72%" height="14px" border-radius="4px" />
        </div>
        <Skeleton width="86px" height="26px" border-radius="999px" />
      </div>
      <div class="sk-lot-bottom">
        <div class="sk-money">
          <Skeleton width="54px" height="12px" border-radius="4px" />
          <Skeleton width="44%" height="20px" border-radius="5px" />
        </div>
        <Skeleton v-if="action" height="44px" border-radius="10px" />
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import Skeleton from '@/components/ui/Skeleton.vue'

withDefaults(defineProps<{ count?: number; action?: boolean }>(), { count: 4, action: true })
</script>

<style scoped>
.sk-lots { display: flex; flex-direction: column; gap: 12px; margin: 0; padding: 0; list-style: none; }
.sk-lot {
  padding: 14px;
  background: var(--surface-primary);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card, 16px);
}
.sk-lot-top { display: flex; align-items: center; gap: 12px; }
.sk-lot-info { flex: 1; min-width: 0; display: grid; gap: 6px; }
.sk-lot-bottom {
  display: flex;
  flex-direction: column;
  gap: 10px;
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid var(--border-default);
}
.sk-money { display: grid; gap: 4px; }
</style>
