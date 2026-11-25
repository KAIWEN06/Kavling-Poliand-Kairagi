<template>
  <span class="nt-icon" :class="`nt-icon--${tone}`" aria-hidden="true">
    <svg viewBox="0 0 24 24" fill="none">
      <path v-if="tone === 'success'" class="nt-icon__line" d="M5.5 12.5l4.2 4.2L18.5 8" pathLength="1" />
      <path v-else-if="tone === 'error'" class="nt-icon__line" d="M7.5 7.5l9 9M16.5 7.5l-9 9" pathLength="1" />
      <path v-else-if="tone === 'warning'" class="nt-icon__line" d="M12 6v7.5M12 17.8v.2" pathLength="1" />
      <path v-else class="nt-icon__line" d="M12 11v7M12 6.2v.2" pathLength="1" />
    </svg>
  </span>
</template>

<script setup lang="ts">
import type { ToastTone } from '@/composables/useToast'

defineProps<{ tone: ToastTone }>()
</script>

<style scoped>
/* Warna datang dari kelas .nt-tone--* pada induk (theme/notify.css). */
.nt-icon {
  display: grid;
  place-items: center;
  flex: none;
  width: var(--nt-icon-size, var(--nt-icon));
  height: var(--nt-icon-size, var(--nt-icon));
  border-radius: 50%;
  background: var(--nt-solid);
  color: var(--nt-on);
  animation: nt-icon-pop 420ms var(--ease-spring) 60ms both;
}
.nt-icon svg { width: 62%; height: 62%; }
.nt-icon__line {
  stroke: currentColor;
  stroke-width: 2.8;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-dasharray: 1;
  animation: nt-icon-draw 360ms var(--ease-out) 220ms both;
}
/* Gagal: goyang sekali, seperti menggeleng. */
.nt-icon--error { animation: nt-icon-pop 420ms var(--ease-spring) 60ms both, nt-icon-shake 360ms var(--ease-out) 480ms; }

@keyframes nt-icon-pop { from { opacity: 0; transform: scale(0.5) rotate(-18deg); } to { opacity: 1; transform: none; } }
@keyframes nt-icon-draw { from { stroke-dashoffset: 1; opacity: 0; } 1% { opacity: 1; } to { stroke-dashoffset: 0; opacity: 1; } }
@keyframes nt-icon-shake { 25% { translate: -3px 0; } 50% { translate: 3px 0; } 75% { translate: -2px 0; } }

@media (prefers-reduced-motion: reduce) {
  .nt-icon, .nt-icon--error, .nt-icon__line { animation: none; }
}
</style>
