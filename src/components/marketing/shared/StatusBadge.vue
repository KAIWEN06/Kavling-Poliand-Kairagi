<template>
  <span class="mk-badge" :class="`mk-badge--${tone}`">{{ label }}</span>
</template>

<script setup lang="ts">
import type { BadgeTone } from '@/utils/marketingStatus'

withDefaults(defineProps<{ label: string; tone?: BadgeTone }>(), { tone: 'neutral' })
</script>

<style scoped>
.mk-badge {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 9px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 600;
  white-space: nowrap;
  border: 1px solid transparent;
}
.mk-badge--neutral { background: var(--surface-muted); color: var(--text-secondary); border-color: var(--border-default); }
.mk-badge--info { background: #e8effc; color: #1d4fb8; }
.mk-badge--warning { background: #fbf0d8; color: var(--poliland-gold-text-soft); }
.mk-badge--gold { background: var(--poliland-gold-soft); color: var(--poliland-gold-text-soft); }
.mk-badge--success { background: var(--status-success-bg); color: var(--poliland-green); }
.mk-badge--danger { background: #fbe7e6; color: #a8322d; }
</style>
