<template>
  <!-- Lapisan terpisah: hanya opacity yang beranimasi, SVG peta tidak digambar ulang. -->
  <svg
    :class="['focus-spotlight', { 'is-on': !!ids?.length }]"
    :style="{ '--strength': strength }"
    :viewBox="`${viewBox.x} ${viewBox.y} ${viewBox.width} ${viewBox.height}`"
    preserveAspectRatio="xMidYMid meet"
    aria-hidden="true"
    focusable="false"
  >
    <!-- Satu path berlubang; <mask> terukur membuat banyak frame tersendat. -->
    <path class="focus-spotlight__shade" :d="shade" fill-rule="evenodd" />
  </svg>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { Rect } from '@/utils/siteplanCamera'

const props = defineProps<{
  container: HTMLElement | null
  /** Bentuk SVG yang tetap terang (tidak saling tumpang). null atau kosong = peredup hilang. */
  ids: string[] | null
  viewBox: Rect
  /** Kepekatan peredup, 0..1. */
  strength: number
}>()

const holes = ref('')

/* Satu viewBox ke setiap arah, agar tepi layar ikut redup di rotasi dan zoom blok. */
const shade = computed(() => {
  const { x, y, width, height } = props.viewBox
  return `M${x - width} ${y - height}h${width * 3}v${height * 3}h${-width * 3}Z${holes.value}`
})

watch(
  () => [props.container, props.ids?.join('|') ?? ''] as const,
  () => {
    /* Saat memudar keluar, lubang terakhir dipertahankan. */
    if (!props.ids?.length) return
    const svg = props.container?.querySelector('.map-svg svg')
    holes.value = props.ids
      .map((id) => svg?.querySelector(`#${CSS.escape(id)}`)?.getAttribute('d') ?? '')
      .join('')
  },
  { immediate: true, flush: 'post' },
)
</script>

<style scoped>
.focus-spotlight {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
  opacity: 0;
  visibility: hidden;
  transition:
    opacity 480ms var(--ease-out),
    visibility 0s linear 480ms;
}

/* Meredup selama kamera terbang, selesai sebelum gerakannya berhenti. */
.focus-spotlight.is-on {
  opacity: var(--strength);
  visibility: visible;
  will-change: opacity;
  transition:
    opacity 800ms cubic-bezier(0.33, 0, 0.2, 1),
    visibility 0s;
}

.focus-spotlight__shade {
  fill: #14220f;
}

@media (prefers-reduced-motion: reduce) {
  .focus-spotlight {
    transition: opacity 140ms linear, visibility 0s linear 140ms;
  }

  .focus-spotlight.is-on {
    transition: opacity 140ms linear, visibility 0s;
  }
}
</style>
