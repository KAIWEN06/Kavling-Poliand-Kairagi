<template>
  <!--
    Primitif Skeleton (pola shadcn/ui):
      <div data-slot="skeleton" class="animate-pulse rounded-md bg-muted" />
    - dekoratif → aria-hidden; status "memuat" diumumkan oleh pembungkusnya (role="status")
    - ukuran SELALU lewat prop width/height agar sama dengan elemen asli (cegah layout shift)
  -->
  <div
    data-slot="skeleton"
    class="skeleton"
    :class="[`skeleton-${variant}`, { 'skeleton-shimmer': shimmer }]"
    :style="{ width, height, borderRadius }"
    aria-hidden="true"
  />
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    width?: string
    height?: string
    borderRadius?: string
    variant?: 'default' | 'circle' | 'text'
    /** Shimmer = sapuan cahaya. Default: pulse seperti shadcn/ui. */
    shimmer?: boolean
  }>(),
  {
    width: '100%',
    height: '20px',
    borderRadius: '8px',
    variant: 'default',
    shimmer: false,
  },
)
</script>

<style scoped>
.skeleton {
  position: relative;
  overflow: hidden;
  flex-shrink: 0;
  max-width: 100%;
  background: var(--skeleton-bg, #e9e6dc);
}

/* Pulse (default shadcn: animate-pulse) */
.skeleton:not(.skeleton-shimmer) {
  animation: skeleton-pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}

.skeleton-shimmer::after {
  content: '';
  position: absolute;
  inset: 0;
  transform: translateX(-100%);
  background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.55), transparent);
  animation: skeleton-shimmer 1.5s infinite;
}

.skeleton-circle { border-radius: 50% !important; }
.skeleton-text { height: 14px; border-radius: 6px; }

@keyframes skeleton-shimmer { 100% { transform: translateX(100%); } }
@keyframes skeleton-pulse { 50% { opacity: 0.5; } }

@media (prefers-reduced-motion: reduce) {
  .skeleton,
  .skeleton::after { animation: none !important; }
}
</style>
