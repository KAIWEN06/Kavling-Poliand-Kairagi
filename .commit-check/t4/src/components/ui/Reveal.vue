<template>
  <component
    :is="tag"
    v-if="reduced"
    class="ui-reveal"
  >
    <slot />
  </component>
  <motion.div
    v-else
    class="ui-reveal"
    :initial="{ opacity: 0, y: distance }"
    :animate="{ opacity: 1, y: 0 }"
    :transition="{ duration: 0.38, delay: order * step, ease: MOTION_EASE_OUT }"
  >
    <slot />
  </motion.div>
</template>

<script setup lang="ts">
import { motion } from 'motion-v'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { MOTION_EASE_OUT } from '@/utils/motionTokens'

/**
 * Entrance bertahap. Beri `order` 0,1,2... pada blok utama halaman:
 * header (0) → statistik (1) → grafik (2) → tabel (3).
 * Hanya animasi opacity dan transform agar ringan di perangkat mobile.
 */
withDefaults(
  defineProps<{
    order?: number
    step?: number
    distance?: number
    tag?: string
  }>(),
  { order: 0, step: 0.07, distance: 10, tag: 'div' },
)

const reduced = useReducedMotion()
</script>

<style scoped>
.ui-reveal { min-width: 0; }
</style>
