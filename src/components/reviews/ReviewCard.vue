<template>
  <article class="review">
    <header class="head">
      <ReviewAvatar :src="review.author_avatar_url" :name="review.author_name" />
      <div class="who">
        <p class="name">{{ review.author_name }}</p>
        <p class="meta">
          <span :class="review.recommend ? 'rec rec--yes' : 'rec rec--no'">
            <ion-icon :icon="review.recommend ? checkmarkCircle : closeCircle" aria-hidden="true" />
            {{ review.recommend ? 'Merekomendasikan' : 'Tidak merekomendasikan' }}
          </span>
        </p>
      </div>
    </header>

    <div class="rating-row">
      <StarRating :model-value="review.rating" readonly :size="18" />
      <time class="date" :datetime="review.created_at">{{ formattedDate }}</time>
    </div>

    <h3 class="title">{{ review.title }}</h3>

    <p v-for="(paragraph, i) in paragraphs" :key="i" class="body">{{ paragraph }}</p>

    <ul v-if="review.photo_urls.length" class="photos" aria-label="Foto pendukung">
      <li v-for="(path, i) in review.photo_urls" :key="path">
        <a v-if="photoUrls[path]" :href="photoUrls[path]" target="_blank" rel="noopener noreferrer">
          <img :src="photoUrls[path]" :alt="`Foto pendukung ${i + 1} dari ulasan ${review.author_name}`" loading="lazy" decoding="async" />
        </a>
        <span v-else class="photo-placeholder" aria-hidden="true" />
      </li>
    </ul>

    <footer class="foot">
      <button
        type="button"
        class="helpful"
        :class="{ 'helpful--on': review.viewer_voted }"
        :aria-pressed="review.viewer_voted"
        :disabled="busy"
        @click="$emit('helpful', review)"
      >
        <ion-icon :icon="review.viewer_voted ? thumbsUp : thumbsUpOutline" aria-hidden="true" />
        Membantu
        <span class="count">{{ review.helpful_count }}</span>
      </button>
      <button type="button" class="report" @click="$emit('report', review)">
        <ion-icon :icon="flagOutline" aria-hidden="true" />
        Laporkan
      </button>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { IonIcon } from '@ionic/vue'
import { checkmarkCircle, closeCircle, flagOutline, thumbsUp, thumbsUpOutline } from 'ionicons/icons'
import ReviewAvatar from '@/components/reviews/ReviewAvatar.vue'
import StarRating from '@/components/reviews/StarRating.vue'
import { resolveReviewPhotoUrls } from '@/services/reviewService'
import type { PublicReview } from '@/types/review'

const props = defineProps<{ review: PublicReview; busy?: boolean }>()
defineEmits<{ helpful: [review: PublicReview]; report: [review: PublicReview] }>()

const photoUrls = ref<Record<string, string>>({})
watch(
  () => props.review.photo_urls,
  async (paths) => {
    if (!paths.length) return
    try {
      photoUrls.value = await resolveReviewPhotoUrls(paths)
    } catch (error) {
      console.error('Foto ulasan gagal dimuat.', error)
    }
  },
  { immediate: true },
)

const paragraphs = computed(() =>
  props.review.content.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean),
)

const formattedDate = computed(() =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(
    new Date(props.review.created_at),
  ),
)
</script>

<style scoped>
.review {
  padding: 20px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
  box-shadow: var(--shadow-sm);
}

.head { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.who { min-width: 0; }
.name {
  margin: 0;
  color: var(--text-primary, #252525);
  font-size: 16px;
  font-weight: 800;
  line-height: 1.3;
  overflow-wrap: anywhere;
}
.meta { margin: 4px 0 0; }
.rec {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  padding: 3px 10px 3px 6px;
  border-radius: 999px;
  font-size: 12px;
  font-weight: 700;
  line-height: 1.3;
}
.rec ion-icon { font-size: 15px; }
.rec--yes { background: var(--green-100, #e8eee4); color: var(--poliland-green, #355a2c); }
.rec--no { background: var(--surface-sunken, #f0ede5); color: var(--text-secondary, #5f5f66); }

.rating-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
.date { color: var(--text-secondary, #5f5f66); font-size: 13px; }

.title {
  margin: 0 0 8px;
  color: var(--text-primary, #252525);
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: 21px;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: -0.01em;
  overflow-wrap: anywhere;
}

.body {
  margin: 0 0 10px;
  color: var(--text-secondary, #5f5f66);
  font-size: 15px;
  line-height: 1.7;
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.photos { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0; padding: 0; list-style: none; }
.photos img {
  display: block;
  width: 96px;
  height: 96px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: 12px;
  object-fit: cover;
}
.photo-placeholder { display: block; width: 96px; height: 96px; border-radius: 12px; background: var(--surface-sunken, #f0ede5); }

.foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-top: 16px;
  padding-top: 14px;
  border-top: 1px solid var(--border-default, #eae7e0);
}

.helpful {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--border-strong, #d5d0c4);
  border-radius: 999px;
  background: var(--surface-primary, #fff);
  color: var(--text-primary, #252525);
  font: 700 14px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), transform var(--dur-base) var(--ease-spring);
}
.helpful ion-icon { font-size: 18px; }
.helpful .count { min-width: 1ch; font-variant-numeric: tabular-nums; }
.helpful:active:not(:disabled) { transform: scale(0.96); }
.helpful--on { border-color: var(--poliland-green, #355a2c); background: var(--green-100, #e8eee4); color: var(--poliland-green, #355a2c); }
.helpful:disabled { opacity: 0.6; cursor: default; }

.report {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 8px;
  border: 0;
  background: none;
  color: var(--text-secondary, #5f5f66);
  font: 700 14px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.report ion-icon { font-size: 17px; }
.report:active { color: var(--danger-text, #b3261e); }

@media (hover: hover) and (pointer: fine) {
  .helpful:hover:not(:disabled) { background: var(--surface-sunken, #f0ede5); }
  .report:hover { color: var(--danger-text, #b3261e); }
}

.helpful:focus-visible,
.report:focus-visible,
.photos a:focus-visible {
  outline: 3px solid var(--poliland-gold, #cba044);
  outline-offset: 2px;
  border-radius: 12px;
}

@media (prefers-reduced-motion: reduce) {
  .helpful:active:not(:disabled) { transform: none; }
}
</style>
