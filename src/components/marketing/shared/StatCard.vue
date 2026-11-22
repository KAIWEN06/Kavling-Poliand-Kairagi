<template>
  <component
    :is="clickable ? 'button' : 'article'"
    :type="clickable ? 'button' : undefined"
    class="mk-stat"
    :class="{ 'mk-stat--accent': accent, 'mk-stat--clickable': clickable }"
    @click="clickable && emit('open')"
  >
    <span class="mk-stat__label">{{ label }}</span>
    <strong class="mk-stat__value">{{ value }}</strong>
    <span v-if="hint" class="mk-stat__hint">{{ hint }}</span>
  </component>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{ label: string; value: string | number; hint?: string; accent?: boolean; clickable?: boolean }>(),
  { hint: '', accent: false, clickable: false },
)
const emit = defineEmits<{ open: [] }>()
</script>

<style scoped>
.mk-stat {
  min-height: 96px;
  padding: 13px 14px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  background: var(--surface-primary);
  color: var(--text-primary);
  display: grid;
  align-content: space-between;
  gap: 6px;
  text-align: left;
  font: inherit;
  min-width: 0;
}
.mk-stat--clickable { cursor: pointer; }
.mk-stat--clickable:hover { border-color: var(--poliland-gold); }
.mk-stat--clickable:focus-visible { outline: 3px solid var(--poliland-gold); outline-offset: 2px; }
.mk-stat__label { color: var(--text-secondary); font-size: 12px; line-height: 1.35; }
.mk-stat__value { font-size: clamp(20px, 5vw, 26px); line-height: 1.1; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.mk-stat__hint { color: var(--text-secondary); font-size: 11px; }
.mk-stat--accent { background: var(--poliland-green); border-color: var(--poliland-green); color: #fff; }
.mk-stat--accent .mk-stat__label,
.mk-stat--accent .mk-stat__hint { color: #e7efe3; }
</style>
