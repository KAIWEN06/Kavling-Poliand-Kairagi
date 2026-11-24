<template>
  <div
    class="map-tools"
    @pointerdown.stop
    @pointermove.stop
    @pointerup.stop
    @pointercancel.stop
    @lostpointercapture.stop
    @click.stop
  >
    <button class="map-tool" :disabled="isMaxScale" @click="$emit('zoom-in')">+</button>
    <button class="map-tool" :disabled="isMinScale" @click="$emit('zoom-out')">−</button>
    <button class="map-tool" @click="$emit('fit')">⌗</button>
  </div>
</template>

<script setup lang="ts">
defineProps({
  isMaxScale: Boolean,
  isMinScale: Boolean
})
</script>

<style scoped>
.map-tools {
  display: flex;
  flex-direction: column;
  gap: var(--zoom-gap, 8px);
  padding: var(--zoom-padding, 8px);
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow: var(--shadow-md);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  pointer-events: auto;
  touch-action: manipulation;
}

.map-tool {
  width: var(--zoom-button-size, 44px);
  height: var(--zoom-button-size, 44px);
  border: 0;
  border-radius: 12px;
  background: var(--green-100, #e8eee4);
  color: var(--poliland-green, #355a2c);
  font-size: 22px;
  font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-base, 200ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1)), background-color var(--dur-fast, 120ms) var(--ease-out, ease);
}
.map-tool:active:not(:disabled) { transform: scale(0.92); background: var(--green-200, #d4e0cc); }
.map-tool:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 2px; }
.map-tool:disabled { opacity: 0.45; cursor: not-allowed; }

@media (prefers-reduced-motion: reduce) {
  .map-tool:active:not(:disabled) { transform: none; }
}
</style>
