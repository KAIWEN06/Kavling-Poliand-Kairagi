<template>
  <span class="ui-badge" :class="[`ui-badge--${tone}`, { 'ui-badge--sm': size === 'sm' }]">
    <span v-if="dot" class="ui-badge__dot" aria-hidden="true" />
    <slot>{{ label }}</slot>
  </span>
</template>

<script setup lang="ts">
export type BadgeTone = 'neutral' | 'info' | 'warning' | 'gold' | 'success' | 'danger'

withDefaults(
  defineProps<{
    label?: string
    tone?: BadgeTone
    /** Titik penanda: status tidak hanya mengandalkan warna */
    dot?: boolean
    size?: 'sm' | 'md'
  }>(),
  { label: '', tone: 'neutral', dot: true, size: 'md' },
)
</script>

<style scoped>
.ui-badge {
  --b-bg: var(--surface-muted);
  --b-fg: var(--text-secondary);
  --b-dot: var(--text-tertiary);
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 0 var(--space-2);
  border-radius: var(--radius-xs);
  background: var(--b-bg);
  color: var(--b-fg);
  font-size: var(--text-xs);
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}
.ui-badge--sm {
  min-height: 20px;
  padding: 0 6px;
  font-size: var(--text-2xs);
}
.ui-badge__dot {
  width: 6px;
  height: 6px;
  border-radius: var(--radius-pill);
  background: var(--b-dot);
  flex: none;
}
.ui-badge--info { --b-bg: var(--info-bg); --b-fg: var(--info); --b-dot: var(--info); }
.ui-badge--warning { --b-bg: var(--warning-bg); --b-fg: var(--warning-text); --b-dot: var(--gold-500); }
.ui-badge--gold { --b-bg: var(--gold-50); --b-fg: var(--gold-800); --b-dot: var(--gold-500); }
.ui-badge--success { --b-bg: var(--green-100); --b-fg: var(--green-700); --b-dot: var(--green-500); }
.ui-badge--danger { --b-bg: var(--danger-bg); --b-fg: var(--danger-text); --b-dot: var(--status-danger); }
</style>
