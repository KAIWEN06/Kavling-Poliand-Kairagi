<template>
  <!-- Pembungkus kompatibilitas: tampilan kini dikelola StatusIllustration. -->
  <StatusIllustration
    variant="empty-data"
    :title="title"
    :description="description || undefined"
    :size="compact ? 'sm' : 'md'"
  >
    <slot />
  </StatusIllustration>
</template>

<script setup lang="ts">
import StatusIllustration from '@/components/ui/StatusIllustration.vue'

export type EmptyKind =
  | 'clients'
  | 'transactions'
  | 'payments'
  | 'spk'
  | 'lots'
  | 'documents'
  | 'notifications'
  | 'generic'

/** @deprecated `kind` tidak lagi memengaruhi tampilan. Pakai <StatusIllustration> untuk kode baru. */
withDefaults(
  defineProps<{
    kind?: EmptyKind
    title: string
    description?: string
    compact?: boolean
  }>(),
  { kind: 'generic', description: '', compact: false },
)
</script>
