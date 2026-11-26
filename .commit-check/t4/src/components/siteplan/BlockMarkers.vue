<template>
  <TransitionGroup name="marker" tag="div" class="block-markers" appear>
    <button
      v-for="(marker, index) in markers"
      :key="marker.key"
      type="button"
      class="marker"
      :style="{ transform: `translate3d(${marker.x}px, ${marker.y}px, 0)`, '--order': Math.min(index, 8) }"
      :aria-label="`${marker.name}, ${marker.available} dari ${marker.total} kavling tersedia. Perbesar`"
      @click="$emit('select', marker.key)"
    >
      <span class="marker-face">{{ marker.shortLabel }}</span>
    </button>
  </TransitionGroup>
</template>

<script setup lang="ts">
import type { SiteplanBlock } from '@/utils/siteplanBlocks'

defineProps<{ markers: Array<SiteplanBlock & { x: number; y: number }> }>()
defineEmits<{ select: [key: string] }>()
</script>

<style scoped>
.block-markers {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

/* Tombol 44px sebagai area sentuh; posisinya mengikuti kamera. */
.marker {
  position: absolute;
  top: -22px;
  left: -22px;
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
  pointer-events: auto;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
}

.marker-face {
  display: grid;
  place-items: center;
  min-width: 34px;
  height: 34px;
  padding: 0 8px;
  border: 2px solid #fff;
  border-radius: 999px;
  background: var(--poliland-green, #355a2c);
  color: #fff;
  font: 700 15px/1 var(--font-display, 'Fraunces Variable', Georgia, serif);
  box-shadow: 0 8px 18px -6px rgba(27, 40, 22, 0.6);
  transition: scale var(--dur-base) var(--ease-spring);
}

.marker:active .marker-face {
  scale: 0.92;
}

.marker:focus-visible {
  outline: none;
}

.marker:focus-visible .marker-face {
  outline: 3px solid var(--poliland-gold, #cba044);
  outline-offset: 2px;
}

@media (hover: hover) and (pointer: fine) {
  .marker:hover .marker-face {
    scale: 1.12;
  }
}

.marker-enter-active .marker-face {
  transition: opacity var(--dur-base) var(--ease-out), scale var(--dur-slow) var(--ease-spring);
  transition-delay: calc(var(--order) * 40ms);
}

.marker-leave-active {
  transition: opacity var(--dur-instant) linear;
  pointer-events: none;
}

.marker-enter-from .marker-face {
  opacity: 0;
  scale: 0.7;
}

.marker-leave-to {
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .marker-enter-active .marker-face {
    transition: opacity 120ms linear;
  }

  .marker-enter-from .marker-face {
    scale: 1;
  }
}
</style>
