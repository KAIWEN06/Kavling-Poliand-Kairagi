<template>
  <button
    class="compass"
    type="button"
    :aria-label="`Putar peta ke ${rotation + 90} derajat`"
    title="Putar peta"
    @pointerdown.stop
    @pointerup.stop
    @pointercancel.stop
    @click="$emit('rotate')"
  >
    <div
      class="compass-inner"
      :style="{
        transform: `rotate(${-rotation}deg)`
      }"
    >
      <span class="compass-ring compass-ring-outer"></span>
      <span class="compass-ring compass-ring-inner"></span>
      <span class="compass-n">N</span>
      <span class="compass-e">E</span>
      <span class="compass-s">S</span>
      <span class="compass-w">W</span>
      <span class="compass-arrow"></span>
    </div>
  </button>
</template>

<script setup lang="ts">
defineProps({
  rotation: {
    type: Number,
    default: 0
  }
})

defineEmits(['rotate'])
</script>

<style scoped>
.compass {
  width: clamp(52px, 16vw, 64px);
  height: clamp(52px, 16vw, 64px);

  padding: 0;

  border: 1px solid #E5E5E5;
  border-radius: 50%;

  background: rgba(255, 255, 255, 0.94);

  color: #1A1A1A;
  cursor: pointer;

  box-shadow:
    0 10px 24px rgba(26, 26, 26, 0.16),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);

  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);

  transition:
    transform 0.18s ease,
    box-shadow 0.18s ease;
}

.compass:hover {
  transform: translateY(-2px);
  box-shadow:
    0 14px 28px rgba(26, 26, 26, 0.2),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
}

.compass:active {
  transform: translateY(0) scale(0.95);
}

.compass:focus-visible {
  outline: 3px solid rgba(47, 111, 235, 0.35); /* Primary Accent */
  outline-offset: 3px;
}

.compass-inner {
  position: relative;

  width: 100%;
  height: 100%;

  display: flex;
  align-items: center;
  justify-content: center;

  transform-origin: center;
}

.compass-ring {
  position: absolute;
  inset: 8px;
  border: 1px solid rgba(229, 229, 229, 0.85); /* Silver variant */
  border-radius: 50%;
  pointer-events: none;
}

.compass-ring-inner {
  inset: 18px;
  border-color: rgba(229, 229, 229, 0.5);
}

.compass-n {
  position: absolute;

  top: 8px;
  left: 50%;

  transform: translateX(-50%);

  font-size: 11px;
  font-weight: 800;

  color: #D32F2F; /* Error / Red */
}

.compass-e,
.compass-s,
.compass-w {
  position: absolute;
  font-size: 8px;
  font-weight: 800;
  color: #6B6B6B; /* Gray */
}

.compass-e {
  right: 9px;
  top: 50%;
  transform: translateY(-50%);
}

.compass-s {
  bottom: 8px;
  left: 50%;
  transform: translateX(-50%);
}

.compass-w {
  left: 9px;
  top: 50%;
  transform: translateY(-50%);
}

.compass-arrow {
  position: relative;

  width: 0;
  height: 0;

  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-bottom: 19px solid #2F6FEB; /* Primary Blue */

  transform: translateY(-4px);
  filter: drop-shadow(0 2px 2px rgba(47, 111, 235, 0.25));
}

.compass-arrow::after {
  content: '';
  position: absolute;
  top: 19px;
  left: -7px;
  width: 0;
  height: 0;
  border-left: 7px solid transparent;
  border-right: 7px solid transparent;
  border-top: 19px solid #6B6B6B; /* Gray */
}
</style>