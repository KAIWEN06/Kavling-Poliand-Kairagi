<template>
  <component
    :is="clickable ? 'button' : 'article'"
    :type="clickable ? 'button' : undefined"
    class="ui-stat"
    :class="{ 'ui-stat--accent': accent, 'ui-stat--clickable': clickable }"
    @click="clickable && emit('open')"
  >
    <span class="ui-stat__label">{{ label }}</span>
    <strong class="ui-stat__value t-figure">{{ value }}</strong>
    <span v-if="hint" class="ui-stat__hint">{{ hint }}</span>
  </component>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string
    value: string | number
    hint?: string
    /** Panel hijau gelap untuk satu angka terpenting per halaman */
    accent?: boolean
    clickable?: boolean
  }>(),
  { hint: '', accent: false, clickable: false },
)
const emit = defineEmits<{ open: [] }>()
</script>

<style scoped>
.ui-stat {
  position: relative;
  display: grid;
  align-content: space-between;
  gap: var(--space-2);
  min-width: 0;
  min-height: 104px;
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--surface-primary);
  color: var(--text-primary);
  font: inherit;
  text-align: left;
  transition:
    border-color var(--dur-fast) var(--ease-out),
    transform var(--dur-fast) var(--ease-out),
    box-shadow var(--dur-fast) var(--ease-out);
}
.ui-stat__label {
  color: var(--text-secondary);
  font-size: var(--text-xs);
  font-weight: 500;
  line-height: 1.35;
}
.ui-stat__value {
  font-size: clamp(1.375rem, 1.1rem + 1.2vw, 1.75rem);
  line-height: var(--leading-tight);
  overflow-wrap: anywhere;
}
.ui-stat__hint {
  color: var(--text-secondary);
  font-size: var(--text-xs);
}
.ui-stat--clickable { cursor: pointer; }
@media (hover: hover) {
  .ui-stat--clickable:hover {
    border-color: var(--gold-500);
    box-shadow: var(--shadow-md);
    transform: translateY(-2px);
  }
}
.ui-stat--clickable:active { transform: scale(0.985); }

.ui-stat--accent {
  background: var(--surface-forest);
  border-color: var(--surface-forest);
  color: var(--on-forest);
}
.ui-stat--accent .ui-stat__label,
.ui-stat--accent .ui-stat__hint { color: var(--on-forest-muted); }
.ui-stat--accent .ui-stat__value { color: var(--gold-100); }
</style>
