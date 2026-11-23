<template>
  <div class="summary" aria-label="Ringkasan ulasan">
    <!-- Rating rata-rata -->
    <div class="block">
      <template v-if="loading">
        <span class="skeleton skeleton--lg" />
        <span class="skeleton skeleton--md" />
      </template>
      <template v-else-if="hasReviews">
        <p class="big">{{ formatAverage(stats!.average!) }}<span class="big-unit">/5</span></p>
        <p class="muted">Rating rata-rata</p>
        <div class="avg-row">
          <StarRating :model-value="stats!.average!" readonly :size="20" />
          <span class="count">({{ formatNumber(stats!.total) }} ulasan)</span>
        </div>
      </template>
      <template v-else>
        <p class="big big--empty">Belum ada rating</p>
        <p class="muted">Belum ada ulasan yang dipublikasikan.</p>
      </template>
    </div>

    <div class="divider" aria-hidden="true" />

    <!-- Rekomendasi dan sebaran rating (data nyata dari database) -->
    <div class="block block--dist">
      <template v-if="hasReviews">
        <p class="big">{{ recommendPercent }}%</p>
        <p class="muted">Merekomendasikan PoliLand Kairagi</p>
        <ul class="dist" aria-label="Sebaran rating">
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
        <button type="button" class="note-link" @click="$emit('write')">Beri nilai</button>
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
.summary {
  display: flex;
  flex-wrap: wrap;
  align-items: stretch;
  gap: var(--space-4) var(--space-8);
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--surface-primary);
  box-shadow: var(--shadow-sm);
}

.block {
  display: flex;
  min-width: 200px;
  flex: 1 1 200px;
  flex-direction: column;
  justify-content: center;
  gap: 4px;
}

.big {
  margin: 0;
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: 30px;
  font-weight: var(--font-weight-bold);
  line-height: 1.1;
}

.big-unit {
  color: var(--text-secondary);
  font-size: var(--font-size-xl);
}

.big--empty {
  font-size: var(--font-size-xl);
}

.muted {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--font-size-base);
}

.avg-row {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-1);
}

.count {
  color: var(--text-secondary);
  font-size: var(--font-size-sm);
}

.divider {
  display: none;
  width: 1px;
  background: var(--border-default);
}

.dist {
  display: grid;
  gap: 4px;
  margin: var(--space-2) 0 0;
  padding: 0;
  list-style: none;
}

.dist li {
  display: grid;
  grid-template-columns: 12px 1fr 28px;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--font-size-xs);
  color: var(--text-secondary);
}

.dist-track {
  height: 6px;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--surface-sunken);
}

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

.prompt {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
  line-height: 1.3;
}

.rate-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-top: var(--space-1);
}

.note-link {
  padding: 0;
  border: 0;
  background: none;
  color: var(--text-primary);
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  text-decoration: underline;
  text-underline-offset: 3px;
  cursor: pointer;
}

.note-link:hover {
  color: var(--poliland-green);
}

.write-btn {
  align-self: flex-start;
  margin-top: var(--space-2);
  padding: 8px 20px;
  border: 0;
  border-radius: var(--radius-sm);
  background: var(--poliland-green);
  color: #fff;
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
}

.write-btn:hover {
  background: var(--green-800);
}

.write-btn:focus-visible,
.note-link:focus-visible {
  outline: none;
  box-shadow: var(--ring-focus);
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
