<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { IonIcon } from '@ionic/vue'
import { heart, heartOutline } from 'ionicons/icons'
import { useFavorites } from '@/composables/useFavorites'

/** `compact`: hati saja, seukuran tombol ikon di kartu daftar. */
const props = defineProps<{ lotId: number; lotLabel?: string; compact?: boolean }>()

const { status, load, toggle, isFavorite } = useFavorites()
const saved = computed(() => isFavorite(props.lotId))
// Gerak hanya setelah ditekan, bukan saat kavling yang sudah tersimpan dibuka.
const justSaved = ref(false)

onMounted(load)

function onClick() {
  justSaved.value = !saved.value
  void toggle(props.lotId)
}
</script>

<template>
  <button
    v-if="status === 'ready'"
    type="button"
    class="fav"
    :class="{ 'is-saved': saved, 'is-popping': justSaved && saved, 'fav--compact': compact }"
    :aria-pressed="saved"
    :aria-label="lotLabel ? `Favorit kavling ${lotLabel}` : 'Favorit'"
    @click="onClick"
  >
    <ion-icon :icon="saved ? heart : heartOutline" aria-hidden="true" />
    <span v-if="!compact">{{ saved ? 'Tersimpan' : 'Simpan' }}</span>
  </button>
</template>

<style scoped>
.fav {
  display: inline-flex;
  flex: 0 0 auto;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 14px;
  border: 1.5px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-pill, 999px);
  background: var(--surface-primary, #fff);
  color: var(--text-primary, #252525);
  font: 700 13px/1 var(--font-primary, 'Plus Jakarta Sans', sans-serif);
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-fast, 150ms) var(--ease-spring, ease-out),
    border-color var(--dur-fast, 150ms);
}

.fav ion-icon {
  color: #b13a3a;
  font-size: 18px;
}

.fav.is-saved {
  border-color: #b13a3a;
}

.fav--compact {
  width: 44px;
  height: 44px;
  padding: 0;
  border-width: 1px;
  border-radius: var(--radius-control, 12px);
}

.fav--compact ion-icon {
  font-size: 22px;
}

.fav:active {
  transform: scale(0.97);
}

.fav:focus-visible {
  outline: 3px solid var(--poliland-green, #355a2c);
  outline-offset: 2px;
}

.fav.is-popping ion-icon {
  animation: fav-pop 160ms var(--ease-out, ease-out);
}

@keyframes fav-pop {
  from { transform: scale(0.9); }
}

@media (prefers-reduced-motion: reduce) {
  .fav { transition: none; }
  .fav:active { transform: none; }
  .fav.is-popping ion-icon { animation: none; }
}
</style>
