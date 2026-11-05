<template>
  <div
    class="skeleton"
    :class="[
      `skeleton-${variant}`,
      { 'skeleton-shimmer': shimmer }
    ]"
    :style="{
      width,
      height,
      borderRadius
    }"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: string
    height?: string
    borderRadius?: string
    variant?: 'default' | 'circle' | 'text'
    shimmer?: boolean
  }>(),
  {
    width: '100%',
    height: '20px',
    borderRadius: '8px',
    variant: 'default',
    shimmer: true
  }
)
</script>

<style scoped>
.skeleton {
  position: relative;
  overflow: hidden;

  background: #e5e7eb;

  flex-shrink: 0;
}

/* Pulse */
.skeleton:not(.skeleton-shimmer) {
  animation: skeleton-pulse 1.5s ease-in-out infinite;
}

/* Shimmer */
.skeleton-shimmer::after {
  content: '';

  position: absolute;

  inset: 0;

  transform: translateX(-100%);

  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.55),
    transparent
  );

  animation: skeleton-shimmer 1.5s infinite;
}

/* Circle */
.skeleton-circle {
  border-radius: 50% !important;
}

/* Text */
.skeleton-text {
  height: 14px;
  border-radius: 6px;
}

@keyframes skeleton-shimmer {
  100% {
    transform: translateX(100%);
  }
}

@keyframes skeleton-pulse {
  0%,
  100% {
    opacity: 1;
  }

  50% {
    opacity: 0.55;
  }
}
</style>