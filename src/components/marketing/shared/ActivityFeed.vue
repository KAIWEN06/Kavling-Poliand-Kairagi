<template>
  <div class="mk-card mk-feed">
    <div v-if="loading" class="mk-feed__skel" role="status" aria-label="Memuat aktivitas">
      <Skeleton v-for="n in 3" :key="n" height="56px" border-radius="14px" />
    </div>
    <p v-else-if="error" class="mk-danger-text" role="alert">{{ error }}</p>
    <EmptyState
      v-else-if="!items.length"
      kind="clients"
      compact
      title="Belum ada aktivitas"
      description="Perubahan status, tindak lanjut, dan SPK dari tim akan tercatat di sini."
    />
    <ul v-else>
      <li v-for="(item, index) in items" :key="index">
        <button type="button" :disabled="!item.customer_id" @click="item.customer_id && emit('open-client', item.customer_id)">
          <span class="mk-feed__kind" :data-kind="item.kind" aria-hidden="true">{{ kindLabel[item.kind] }}</span>
          <span class="mk-feed__body">
            <strong>{{ item.customer_name || 'Client' }}</strong>
            <span>{{ item.title }}</span>
            <small>{{ item.actor_name }} · {{ formatRelative(item.occurred_at) }}</small>
          </span>
        </button>
      </li>
    </ul>
  </div>
</template>

<script setup lang="ts">
import EmptyState from '@/components/ui/EmptyState.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import type { ActivityItem } from '@/services/marketing/marketingCrmService'
import { formatRelative } from '@/utils/marketingStatus'

withDefaults(defineProps<{ items: ActivityItem[]; loading?: boolean; error?: string }>(), { loading: false, error: '' })
const emit = defineEmits<{ 'open-client': [id: number] }>()

const kindLabel: Record<string, string> = { crm: 'ST', followup: 'FU', note: 'CT', spk: 'SPK' }
</script>

<style scoped>
.mk-feed { padding: var(--space-1) var(--space-4); }
.mk-feed p { margin: var(--space-3) 0; font-size: var(--text-sm); }
.mk-feed__skel { display: grid; gap: var(--space-3); padding: var(--space-3) 0; }
.mk-feed ul { list-style: none; margin: 0; padding: 0; }
.mk-feed li + li { border-top: 1px solid var(--border-default); }
.mk-feed button { width: 100%; display: flex; gap: var(--space-3); align-items: flex-start; padding: var(--space-3) 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.mk-feed button:disabled { cursor: default; }
@media (hover: hover) and (pointer: fine) {
  .mk-feed button:not(:disabled):hover .mk-feed__body strong { text-decoration: underline; }
}
.mk-feed button:focus-visible { box-shadow: var(--ring-focus); border-radius: var(--radius-xs); outline: none; }
.mk-feed__kind { flex: 0 0 40px; height: 40px; display: grid; place-items: center; border-radius: var(--radius-sm); background: var(--surface-muted); color: var(--text-secondary); font-size: var(--text-2xs); font-weight: 700; }
.mk-feed__kind[data-kind='spk'] { background: var(--green-100); color: var(--green-700); }
.mk-feed__kind[data-kind='crm'] { background: var(--gold-50); color: var(--gold-800); }
.mk-feed__kind[data-kind='followup'] { background: var(--warning-bg); color: var(--warning-text); }
.mk-feed__body { min-width: 0; display: grid; gap: 2px; }
.mk-feed__body strong { font-size: var(--text-md); font-weight: 600; }
.mk-feed__body span { font-size: var(--text-sm); overflow-wrap: anywhere; }
.mk-feed__body small { color: var(--text-secondary); font-size: var(--text-xs); }
</style>
