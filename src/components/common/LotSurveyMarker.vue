<template>
  <div :class="['survey-marker', info.status]" role="status">
    <ion-icon :icon="calendarOutline" aria-hidden="true" />
    <div class="survey-marker__text">
      <strong>{{ info.when }}</strong>
      <span>Survei · {{ info.statusText }}</span>
    </div>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { calendarOutline } from 'ionicons/icons'
import type { LotSurveyInfo } from '@/services/surveyService'

defineProps<{ info: LotSurveyInfo }>()
</script>

<style scoped>
.survey-marker {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
  padding: 10px 12px;
  border-radius: var(--radius-control);
}

.survey-marker ion-icon {
  flex-shrink: 0;
  font-size: 22px;
}

.survey-marker__text {
  display: flex;
  flex-direction: column;
  gap: 1px;
  min-width: 0;
}

.survey-marker__text strong {
  color: var(--text-primary);
  font-size: 13.5px;
  font-weight: var(--font-weight-bold, 700);
  line-height: 1.3;
}

.survey-marker__text span {
  font-size: 12px;
  font-weight: var(--font-weight-semibold, 600);
}

.survey-marker.pending {
  background: color-mix(in srgb, var(--poliland-gold) 20%, white);
  color: var(--poliland-gold-text-soft);
}

.survey-marker.confirmed {
  background: var(--status-success-bg);
  color: var(--poliland-green);
}
</style>
