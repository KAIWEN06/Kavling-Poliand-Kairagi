<template>
  <div class="summary" aria-label="Ringkasan ulasan">
    <!-- Penilaian rata-rata -->
    <div class="block">
      <template v-if="loading">
        <span class="skeleton skeleton--lg" />
        <span class="skeleton skeleton--md" />
      </template>
      <template v-else-if="hasReviews">
        <p class="big">{{ formatAverage(stats!.average!) }}<span class="big-unit">/5</span></p>
        <p class="muted">Penilaian rata-rata</p>
        <div class="avg-row">
          <StarRating :model-value="stats!.average!" readonly :size="20" />
          <span class="count">({{ formatNumber(stats!.total) }} ulasan)</span>
        </div>
      </template>
      <template v-else>
        <p class="big big--empty">Belum ada penilaian</p>
        <p class="muted">Belum ada ulasan yang dipublikasikan.</p>
      </template>
    </div>

    <div class="divider" aria-hidden="true" />

    <!-- Rekomendasi dan sebaran rating (data nyata dari database) -->
    <div class="block block--dist">
      <template v-if="hasReviews">
        <p class="big">{{ recommendPercent }}%</p>
        <p class="muted">Merekomendasikan PoliLand Kairagi</p>
        <ul class="dist" aria-label="Sebaran penilaian">
          <li v-for="n in [5, 4, 3, 2, 1]" :key="n">
            <span class="dist-label">{{ n }}</span>
            <span class="dist-track" aria-hidden="true">
              <span class="dist-fill" :style="{ width: `${share(n)}%` }" />
            </span>
            <span class="dist-count">{{ stats!.distribution[String(n) as '1'] }}</span>
          </li>
        </ul>
      </template>
      <template v-else-if="!loading">
        <p class="big big--empty">Mulai dari Anda</p>
        <p class="muted">
          Pengalaman Anda membantu calon pembeli lain mengambil keputusan.
        </p>
      </template>
    </div>

    <div class="divider" aria-hidden="true" />

    <!-- Ajakan memberi ulasan -->
    <div class="block block--cta">
      <p class="prompt">
        {{ hasReviews || loading ? 'Bagikan penilaian Anda tentang PoliLand Kairagi' : 'Jadilah pemberi ulasan pertama' }}
      </p>
      <div class="rate-row">
        <StarRating
          :model-value="0"
          :size="24"
          label="Beri nilai cepat"
          @update:model-value="(n) => $emit('rate', n)"
        />
      </div>
      <button type="button" class="write-btn" @click="$emit('write')">Tulis ulasan</button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import StarRating from '@/components/reviews/StarRating.vue'
import type { ReviewStats } from '@/types/review'

const props = defineProps<{ stats: ReviewStats | null; loading: boolean }>()
defineEmits<{ write: []; rate: [rating: number] }>()

const hasReviews = computed(() => !!props.stats && props.stats.total > 0 && props.stats.average != null)
const recommendPercent = computed(() =>
  props.stats && props.stats.total > 0
    ? Math.round((props.stats.recommend_yes / props.stats.total) * 100)
    : 0,
)

function share(n: number) {
  if (!props.stats || props.stats.total === 0) return 0
  return (props.stats.distribution[String(n) as '1'] / props.stats.total) * 100
}

const formatNumber = (n: number) => new Intl.NumberFormat('id-ID').format(n)
const formatAverage = (n: number) => n.toLocaleString('id-ID', { minimumFractionDigits: 1, maximumFractionDigits: 1 })
</script>

<style scoped>
.summary { display: flex; flex-wrap: wrap; align-items: stretch; gap: 20px 32px; padding: 22px 20px; border: 1px solid var(--border-default, #eae7e0); border-radius: var(--radius-panel, 20px); background: var(--surface-primary, #fff); box-shadow: var(--shadow-md); }

.block { display: flex; min-width: 200px; flex: 1 1 200px; flex-direction: column; justify-content: center; gap: 6px; }

.big { margin: 0; color: var(--poliland-green, #355a2c); font-family: var(--font-display); font-size: 44px; font-weight: 650; line-height: 1; letter-spacing: -0.02em; font-variant-numeric: tabular-nums; }

.big-unit { color: var(--text-secondary, #5f5f66); font-size: 22px; font-weight: 500; }

.big--empty { color: var(--text-primary, #252525); font-size: 24px; line-height: 1.2; }

.muted { margin: 0; color: var(--text-secondary, #5f5f66); font-size: 15px; line-height: 1.5; }

.avg-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.count { color: var(--text-secondary, #5f5f66); font-size: 14px; }

.divider {
  display: none;
  width: 1px;
  background: var(--border-default);
}

.dist { display: grid; gap: 6px; margin: 8px 0 0; padding: 0; list-style: none; }

.dist li { display: grid; grid-template-columns: 14px 1fr 32px; align-items: center; gap: 10px; font-size: 13px; font-weight: 600; color: var(--text-secondary, #5f5f66); }

.dist-track { height: 8px; overflow: hidden; border-radius: 999px; background: var(--surface-sunken, #f0ede5); }

.dist-fill {
  display: block;
  height: 100%;
  border-radius: inherit;
  background: var(--poliland-gold);
}

.dist-count {
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.prompt { margin: 0; color: var(--text-primary, #252525); font-family: var(--font-display); font-size: 22px; font-weight: 650; line-height: 1.25; letter-spacing: -0.01em; }

.rate-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-1);
}

.write-btn:active { transform: scale(0.97); }
.write-btn { align-self: flex-start; min-height: 52px; margin-top: 10px; padding: 0 26px; border: 0; border-radius: 14px; background: var(--poliland-gold, #cba044); color: var(--ink, #1b1f1a); font: 800 15px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif); box-shadow: 0 12px 26px -10px rgba(203, 160, 68, 0.85); cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; transition: transform var(--dur-base) var(--ease-spring); }

.write-btn:focus-visible {
  outline: 3px solid var(--poliland-gold, #cba044);
  outline-offset: 3px;
}

@media (prefers-reduced-motion: reduce) {
  .write-btn:active { transform: none; }
}

.skeleton {
  display: block;
  border-radius: var(--radius-xs);
  background: var(--surface-sunken);
}

.skeleton--lg { width: 90px; height: 32px; }
.skeleton--md { width: 140px; height: 18px; }

@media (min-width: 640px) {
  .summary { padding: var(--space-8); }
}

@media (min-width: 1024px) {
  .divider { display: block; }
}

@media (max-width: 480px) {
  .block { min-width: 100%; }
}
</style>
