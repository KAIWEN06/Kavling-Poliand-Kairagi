<template>
  <span ref="el" class="count-up">{{ text }}</span>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useReducedMotion } from '@/composables/useReducedMotion'

/**
 * Angka yang naik dari 0 saat masuk layar. Menerima teks bebas dari CMS
 * ("120+", "1.200", "4,5 Ha", "24/7"): bagian angka dianimasikan, awalan dan
 * akhiran dipertahankan. Teks tanpa angka tunggal ditampilkan apa adanya.
 */
const props = withDefaults(defineProps<{ value: string; duration?: number }>(), { duration: 1400 })

const el = ref<HTMLElement | null>(null)
const reduced = useReducedMotion()

const parsed = computed(() => {
  const m = props.value.trim().match(/^(\D*?)(\d+(?:[.,]\d+)*)(\D*)$/)
  if (!m) return null
  const [, prefix, numStr, suffix] = m
  const separators = numStr.match(/[.,]/g)?.length ?? 0
  const decimal = separators === 1 && /[.,]\d{1,2}$/.test(numStr)
  const decimals = decimal ? numStr.split(/[.,]/)[1].length : 0
  const target = decimal ? parseFloat(numStr.replace(',', '.')) : parseInt(numStr.replace(/[.,]/g, ''), 10)
  return { prefix, suffix, decimal, decimals, grouped: separators > 0 && !decimal, target }
})

const current = ref(-1) // -1 = tampilkan teks asli
let raf = 0
let io: IntersectionObserver | null = null

const format = (n: number) => {
  const p = parsed.value
  if (!p) return props.value
  if (p.decimal) return n.toFixed(p.decimals).replace('.', ',')
  return p.grouped ? Math.round(n).toLocaleString('id-ID') : String(Math.round(n))
}

const text = computed(() => {
  const p = parsed.value
  if (!p || current.value < 0) return props.value
  return `${p.prefix}${format(current.value)}${p.suffix}`
})

function run() {
  const p = parsed.value
  if (!p || reduced.value || p.target <= 0) return
  const begin = performance.now()
  const tick = (now: number) => {
    const t = Math.min(1, (now - begin) / props.duration)
    current.value = p.target * (1 - Math.pow(1 - t, 3))
    if (t < 1) raf = requestAnimationFrame(tick)
    else current.value = -1 // kembali ke teks asli agar format akhir persis dari CMS
  }
  current.value = 0
  raf = requestAnimationFrame(tick)
}

onMounted(() => {
  if (!parsed.value || !el.value || typeof IntersectionObserver === 'undefined') return
  io = new IntersectionObserver(
    (entries) => {
      if (entries.some((e) => e.isIntersecting)) {
        io?.disconnect()
        run()
      }
    },
    { threshold: 0.4 },
  )
  io.observe(el.value)
})

onBeforeUnmount(() => {
  io?.disconnect()
  cancelAnimationFrame(raf)
})
</script>

<style scoped>
.count-up { font-variant-numeric: tabular-nums; }
</style>
