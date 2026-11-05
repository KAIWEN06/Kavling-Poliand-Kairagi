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

  background: rgba(255, 255, 255, 0.92);

  border: 1px solid rgba(148, 163, 184, 0.35);

  border-radius: clamp(11px, 3vw, 14px);

  padding: var(--zoom-padding, 8px);

  box-shadow:
    0 12px 24px rgba(15, 23, 42, 0.12);

  pointer-events: auto;
  touch-action: manipulation;
}

.map-tool {
  width: var(--zoom-button-size, 40px);
  height: var(--zoom-button-size, 40px);
  border: none;
  border-radius: clamp(8px, 2.5vw, 10px);
  background: #ffffff;
  color: #111827;
  font-size: 20px;
  font-weight: 700;
  cursor: pointer;
}

.map-tool:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}
</style>