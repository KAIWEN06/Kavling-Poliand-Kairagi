<template>
  <article class="review">
    <header class="head">
      <ReviewAvatar :src="review.author_avatar_url" :name="review.author_name" />
      <div class="who">
        <p class="name">{{ review.author_name }}</p>
        <p class="meta">
          <span :class="review.recommend ? 'rec rec--yes' : 'rec rec--no'">
            {{ review.recommend ? 'Merekomendasikan PoliLand Kairagi' : 'Tidak merekomendasikan' }}
          </span>
        </p>
      </div>
    </header>

    <h3 class="title">{{ review.title }}</h3>

    <div class="rating-row">
      <StarRating :model-value="review.rating" readonly :size="16" />
      <time class="date" :datetime="review.created_at">{{ formattedDate }}</time>
    </div>

    <p v-for="(paragraph, i) in paragraphs" :key="i" class="body">{{ paragraph }}</p>

    <ul v-if="review.photo_urls.length" class="photos" aria-label="Foto pendukung">
      <li v-for="(path, i) in review.photo_urls" :key="path">
        <a v-if="photoUrls[path]" :href="photoUrls[path]" target="_blank" rel="noopener noreferrer">
          <img :src="photoUrls[path]" :alt="`Foto pendukung ${i + 1} dari ulasan ${review.author_name}`" loading="lazy" />
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
        Helpful ({{ review.helpful_count }})
      </button>
      <button type="button" class="report" @click="$emit('report', review)">
        <ion-icon :icon="flagOutline" aria-hidden="true" />
        Report
      </button>
    </footer>
  </article>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { IonIcon } from '@ionic/vue'
import { flagOutline } from 'ionicons/icons'
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
  padding: var(--space-6) 0;
}

.head {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
}

.who { min-width: 0; }

.name {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  overflow-wrap: anywhere;
}

.meta { margin: 0; font-size: var(--font-size-sm); color: var(--text-secondary); }
.rec--yes { color: var(--poliland-green); }

.title {
  margin: 0 0 var(--space-2);
  color: var(--text-primary);
  font-size: var(--font-size-lg);
  font-weight: var(--font-weight-semibold);
  overflow-wrap: anywhere;
}

.rating-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.date { color: var(--text-secondary); font-size: var(--font-size-sm); }

.body {
  margin: 0 0 var(--space-3);
  color: var(--text-secondary);
  font-size: var(--font-size-base);
  line-height: var(--leading-body);
  white-space: pre-line;
  overflow-wrap: anywhere;
}

.photos {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin: var(--space-3) 0;
  padding: 0;
  list-style: none;
}

.photos img {
  display: block;
  width: 96px;
  height: 96px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  object-fit: cover;
}

.photo-placeholder {
  display: block;
  width: 96px;
  height: 96px;
  border-radius: var(--radius-sm);
  background: var(--surface-sunken);
}

.foot {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  margin-top: var(--space-4);
}

.helpful {
  padding: 6px 8px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-xs);
  background: var(--surface-muted);
  color: var(--text-primary);
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}

.helpful:hover:not(:disabled) { background: var(--surface-sunken); }
.helpful--on { border-color: var(--poliland-green); background: var(--green-50); color: var(--poliland-green); }
.helpful:disabled { opacity: 0.6; cursor: default; }

.report {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0;
  border: 0;
  background: none;
  color: var(--text-primary);
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}

.report:hover { color: var(--danger-text); }

.helpful:focus-visible,
.report:focus-visible,
.photos a:focus-visible {
  outline: none;
  box-shadow: var(--ring-focus);
  border-radius: var(--radius-xs);
}
</style>
