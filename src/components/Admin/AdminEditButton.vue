<template>
  <button class="admin-edit" type="button" :aria-label="label" @click="$emit('click')">
    <ion-icon :icon="icon" aria-hidden="true" />
    <span>{{ label }}</span>
  </button>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { createOutline } from 'ionicons/icons'

withDefaults(defineProps<{ label?: string; icon?: string }>(), { label: 'Edit', icon: createOutline })
defineEmits<{ click: [] }>()
</script>

<style scoped>
.admin-edit {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px dashed color-mix(in srgb, var(--poliland-green, #355a2c) 55%, transparent);
  border-radius: 999px;
  background: color-mix(in srgb, var(--surface-primary, #fff) 92%, transparent);
  color: var(--poliland-green, #355a2c);
  font: inherit;
  font-size: 12px;
  font-weight: 800;
  white-space: nowrap;
  cursor: pointer;
  backdrop-filter: blur(6px);
}
.admin-edit ion-icon { font-size: 16px; }
.admin-edit:active { background: var(--status-success-bg, #e8eee4); }
.admin-edit:focus-visible { outline: 3px solid var(--poliland-green, #355a2c); outline-offset: 2px; }
</style>
