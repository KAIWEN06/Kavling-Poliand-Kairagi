<template>
  <header ref="root" class="sec-head">
    <div class="sec-head__text">
      <span v-if="eyebrow" class="sec-head__eyebrow" :class="{ 'is-in': shown }">{{ eyebrow }}</span>
      <h2 class="sec-head__title">
        <span class="sec-head__mask"><span class="sec-head__inner" :class="{ 'is-in': shown }">{{ title }}</span></span>
      </h2>
      <span class="sec-head__rule" :class="{ 'is-in': shown }"></span>
    </div>
    <slot />
  </header>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

/**
 * Kepala section standar PoliLand: label kecil, judul serif yang naik dari
 * garis bawahnya, lalu garis emas memanjang. Dipakai di setiap section.
 * Slot default = aksi di kanan (mis. tombol "Lihat Semua").
 */
defineProps<{ title: string; eyebrow?: string }>()

const root = ref<HTMLElement | null>(null)
const shown = ref(false)
let io: IntersectionObserver | null = null

onMounted(() => {
  if (!root.value || typeof IntersectionObserver === 'undefined') {
    shown.value = true
    return
  }
  io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        shown.value = true
        io?.disconnect()
      }
    },
    { rootMargin: '0px 0px -8% 0px' },
  )
  io.observe(root.value)
})

onBeforeUnmount(() => io?.disconnect())
</script>

<style scoped>
.sec-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--space-3, 12px);
  margin-bottom: var(--space-4, 16px);
}

.sec-head__eyebrow {
  display: block;
  margin-bottom: 6px;
  color: var(--poliland-gold-text, #966a12);
  font: 800 11px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  letter-spacing: 0.14em;
  text-transform: uppercase;
  opacity: 0;
  transition: opacity 400ms var(--ease-out);
}
.sec-head__eyebrow.is-in { opacity: 1; }

.sec-head__title {
  margin: 0;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: clamp(24px, 6.8vw, 30px);
  line-height: 1.12;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--text-primary, #252525);
}

/* Pembungkus memotong teks agar judul naik dari garis bawahnya. */
.sec-head__mask {
  display: block;
  overflow: hidden;
  padding-bottom: 0.08em;
}

.sec-head__inner {
  display: block;
  transform: translateY(110%);
  transition: transform 700ms var(--ease-out);
}
.sec-head__inner.is-in { transform: none; }

.sec-head__rule {
  display: block;
  width: 40px;
  height: 3px;
  margin-top: 8px;
  border-radius: 999px;
  background: var(--poliland-gold, #cba044);
  transform: scaleX(0);
  transform-origin: left;
  transition: transform 600ms var(--ease-out) 250ms;
}
.sec-head__rule.is-in { transform: scaleX(1); }

@media (prefers-reduced-motion: reduce) {
  .sec-head__eyebrow,
  .sec-head__inner,
  .sec-head__rule {
    transform: none;
    transition: none;
    opacity: 1;
  }
}
</style>
