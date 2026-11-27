<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { copyOutline, shareSocialOutline } from 'ionicons/icons'
import { useShareLot } from '@/composables/useShareLot'
import type { ShareContent } from '@/utils/shareLot'

defineProps<{ content: ShareContent }>()
// Slot bawaan: tombol lain yang sebaris, misalnya Simpan, diletakkan di depan.

const { share, copy } = useShareLot()
</script>

<template>
  <div class="lot-actions">
    <div class="lot-actions__row">
      <slot />
      <button type="button" class="share-action" @click="share(content)">
        <ion-icon :icon="shareSocialOutline" aria-hidden="true" />
        <span>Bagikan</span>
      </button>
      <button type="button" class="share-action" @click="copy(content)">
        <ion-icon :icon="copyOutline" aria-hidden="true" />
        <span>Salin</span>
      </button>
    </div>
  </div>
</template>

<style scoped>
/* Susunan mengikuti lebar kartu tempat baris ini berada, bukan lebar layar. */
.lot-actions {
  container-type: inline-size;
  min-width: 0;
}

.lot-actions__row {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: minmax(0, 1fr);
  gap: 8px;
}

.lot-actions__row :deep(button) {
  min-width: 0;
  padding: 0 4px;
}

.share-action {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1.5px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-pill, 999px);
  background: var(--surface-primary, #fff);
  color: var(--text-primary, #252525);
  font: 700 13px/1.2 var(--font-primary, 'Plus Jakarta Sans', sans-serif);
  white-space: nowrap;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-fast, 150ms) var(--ease-spring, ease-out),
    border-color var(--dur-fast, 150ms);
}

.share-action ion-icon {
  flex: none;
  color: var(--poliland-green, #355a2c);
  font-size: 18px;
}

@media (hover: hover) and (pointer: fine) {
  .share-action:hover {
    border-color: var(--poliland-green, #355a2c);
  }
}

.share-action:active {
  transform: scale(0.97);
}

.share-action:focus-visible {
  outline: 3px solid var(--poliland-green, #355a2c);
  outline-offset: 2px;
}

/* Tiga tombol di ruang sempit: ikon pindah ke atas teks agar labelnya tidak bertabrakan. */
@container (max-width: 327px) {
  .lot-actions__row:has(> :nth-child(3)) :deep(button) {
    flex-direction: column;
    min-height: 56px;
    gap: 4px;
    border-radius: 16px;
    font-size: 12px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .share-action { transition: none; }
  .share-action:active { transform: none; }
}
</style>
