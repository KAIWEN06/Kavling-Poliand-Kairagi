<template>
  <div
    ref="el"
    class="scroll-reveal"
    :class="[`sr-${variant}`, { 'is-shown': shown }]"
    :style="delay ? { transitionDelay: `${delay}ms` } : undefined"
  >
    <slot />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'

/**
 * Muncul halus saat blok masuk layar (sekali saja).
 * Hanya opacity + transform. Setelah tampil, transform dilepas agar tidak
 * membuat containing block bagi elemen fixed/modal di dalamnya.
 * `enabled=false` menahan animasi (mis. saat skeleton masih menutupi halaman).
 */
const props = withDefaults(
  defineProps<{
    variant?: 'up' | 'fade' | 'scale'
    delay?: number
    enabled?: boolean
  }>(),
  { variant: 'up', delay: 0, enabled: true },
)

const el = ref<HTMLElement | null>(null)
const shown = ref(false)
const seen = ref(false)
let observer: IntersectionObserver | null = null

const stop = () => {
  observer?.disconnect()
  observer = null
}

const reveal = () => {
  if (seen.value && props.enabled) {
    shown.value = true
    stop()
  }
}

onMounted(() => {
  if (!el.value || typeof IntersectionObserver === 'undefined') {
    seen.value = true
    reveal()
    return
  }
  observer = new IntersectionObserver(
    (entries) => {
      if (entries.some((entry) => entry.isIntersecting)) {
        seen.value = true
        reveal()
      }
    },
    { threshold: 0, rootMargin: '0px 0px -8% 0px' },
  )
  observer.observe(el.value)
})

watch(() => props.enabled, reveal)
onBeforeUnmount(stop)
</script>

<style scoped>
.scroll-reveal {
  opacity: 0;
  transition:
    opacity 480ms var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)),
    transform 480ms var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1));
}

.sr-up { transform: translate3d(0, 18px, 0); }
/* Membesar dengan sedikit pantulan (spring); opacity tetap ease-out. */
.sr-scale { transform: scale(0.96); transition-timing-function: var(--ease-out), var(--ease-spring); }
.sr-fade { transform: none; }

.scroll-reveal.is-shown {
  opacity: 1;
  transform: none;
}

@media (prefers-reduced-motion: reduce) {
  .scroll-reveal,
  .sr-up,
  .sr-scale {
    transform: none;
    transition: opacity 160ms linear;
  }
}
</style>
