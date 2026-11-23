<template>
  <div v-if="total > 0" class="survey-banner" role="status">
    <ion-icon :icon="calendarOutline" aria-hidden="true" />
    <span>
      <strong>{{ total }} kaveling</strong> punya jadwal survei<template v-if="pending > 0"> · {{ pending }} menunggu konfirmasi</template>.
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IonIcon } from '@ionic/vue'
import { calendarOutline } from 'ionicons/icons'
import type { LotSurveyInfo } from '@/services/surveyService'

const props = defineProps<{ surveys: Map<number, LotSurveyInfo> }>()

const total = computed(() => props.surveys.size)
const pending = computed(() => [...props.surveys.values()].filter((s) => s.status === 'pending').length)
</script>

<style scoped>
.survey-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  margin: 0 0 12px;
  padding: 12px 14px;
  border: 1px solid color-mix(in srgb, var(--poliland-gold) 55%, white);
  border-radius: var(--radius-control);
  background: color-mix(in srgb, var(--poliland-gold) 14%, white);
  color: var(--text-primary);
  font-size: 13px;
  line-height: 1.45;
}

.survey-banner ion-icon {
  flex-shrink: 0;
  margin-top: 1px;
  font-size: 20px;
  color: var(--poliland-gold-text-soft);
}
</style>
