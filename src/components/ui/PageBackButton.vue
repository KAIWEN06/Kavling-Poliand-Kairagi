<template>
  <button type="button" class="page-back" :aria-label="`Kembali${label ? ': ' + label : ''}`" @click="goBack">
    <ion-icon :icon="arrowBackOutline" aria-hidden="true" />
    <span>{{ label || 'Kembali' }}</span>
  </button>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { arrowBackOutline } from 'ionicons/icons'

import { useSmartBack } from '@/composables/useSmartBack'

/**
 * Tombol kembali standar. Diletakkan di area KONTEN halaman
 * (lewat PageHeader), tidak pernah di dalam GlobalMobileHeader.
 * `fallback` dipakai hanya bila tidak ada riwayat navigasi.
 */
const props = defineProps<{
  fallback?: string
  label?: string
  /** Untuk "kembali" yang hanya menutup tampilan di dalam halaman (bukan pindah rute). */
  handler?: () => void
}>()
const { goBack: routerBack } = useSmartBack(() => props.fallback)

function goBack() {
  if (props.handler) props.handler()
  else routerBack()
}
</script>

<style scoped>
.page-back {
  display: inline-flex;
  min-width: 44px;
  min-height: 44px;
  align-items: center;
  gap: 6px;
  margin: 0 0 0 -6px;
  padding: 0 10px 0 6px;
  border: 0;
  border-radius: 12px;
  color: var(--text-primary, #252525);
  background: transparent;
  font: inherit;
  font-size: 14px;
  font-weight: 600;
  cursor: pointer;
}

.page-back ion-icon {
  font-size: 22px;
}

.page-back:active {
  background: var(--surface-muted, #f5f3ee);
}

.page-back:focus-visible {
  outline: 2px solid var(--poliland-green, #355a2c);
  outline-offset: 0;
}
</style>
