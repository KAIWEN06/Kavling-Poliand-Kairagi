<template>
  <div class="mk-card mk-feed">
    <p v-if="loading" class="mk-muted" role="status">Memuat aktivitas…</p>
    <p v-else-if="error" class="mk-danger-text" role="alert">{{ error }}</p>
    <p v-else-if="!items.length" class="mk-muted">Belum ada aktivitas.</p>
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
import type { ActivityItem } from '@/services/marketing/marketingCrmService'
import { formatRelative } from '@/utils/marketingStatus'

withDefaults(defineProps<{ items: ActivityItem[]; loading?: boolean; error?: string }>(), { loading: false, error: '' })
const emit = defineEmits<{ 'open-client': [id: number] }>()

const kindLabel: Record<string, string> = { crm: 'ST', followup: 'FU', note: 'CT', spk: 'SPK' }
</script>

<style scoped>
.mk-feed { padding: 4px 14px; }
.mk-feed p { margin: 12px 0; font-size: 13px; }
.mk-feed ul { list-style: none; margin: 0; padding: 0; }
.mk-feed li + li { border-top: 1px solid var(--border-default); }
.mk-feed button { width: 100%; display: flex; gap: 10px; align-items: flex-start; padding: 12px 0; border: 0; background: none; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.mk-feed button:disabled { cursor: default; }
.mk-feed button:focus-visible { outline: 3px solid var(--poliland-gold); outline-offset: 2px; border-radius: 6px; }
.mk-feed__kind { flex: 0 0 36px; height: 36px; display: grid; place-items: center; border-radius: 10px; background: var(--surface-muted); color: var(--text-secondary); font-size: 10px; font-weight: 700; }
.mk-feed__kind[data-kind='spk'] { background: var(--status-success-bg); color: var(--poliland-green); }
.mk-feed__kind[data-kind='crm'] { background: var(--poliland-gold-soft); color: var(--poliland-gold-text-soft); }
.mk-feed__body { min-width: 0; display: grid; gap: 2px; }
.mk-feed__body strong { font-size: 14px; }
.mk-feed__body span { font-size: 13px; overflow-wrap: anywhere; }
.mk-feed__body small { color: var(--text-secondary); font-size: 12px; }
</style>
