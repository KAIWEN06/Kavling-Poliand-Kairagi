<template>
  <component
    :is="actionHint ? 'button' : 'div'"
    :type="actionHint ? 'button' : undefined"
    :class="['survey-marker', info.status, { 'survey-marker--action': !!actionHint }]"
    :role="actionHint ? undefined : 'status'"
    :aria-label="actionHint ? `${info.when}. Survei ${info.statusText}. ${actionHint}` : undefined"
    @click="actionHint && emit('open')"
  >
    <ion-icon :icon="calendarOutline" aria-hidden="true" />
    <div class="survey-marker__text">
      <strong>{{ info.when }}</strong>
      <span>Survei · {{ info.statusText }}</span>
      <em v-if="actionHint">{{ actionHint }}</em>
    </div>
    <ion-icon v-if="actionHint" :icon="chevronForwardOutline" class="survey-marker__go" aria-hidden="true" />
  </component>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { calendarOutline, chevronForwardOutline } from 'ionicons/icons'
import type { LotSurveyInfo } from '@/services/surveyService'

/** Bila actionHint diisi, penanda menjadi tombol yang memicu event "open". */
defineProps<{ info: LotSurveyInfo; actionHint?: string }>()
const emit = defineEmits<{ open: [] }>()
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
  flex: 1;
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

.survey-marker--action {
  width: 100%;
  min-height: 44px;
  border: 0;
  font: inherit;
  text-align: left;
  cursor: pointer;
}

.survey-marker--action:active {
  filter: brightness(0.96);
}

.survey-marker--action:focus-visible {
  outline: 3px solid var(--poliland-green);
  outline-offset: 2px;
}

.survey-marker__text em {
  margin-top: 2px;
  font-size: 12px;
  font-style: normal;
  font-weight: var(--font-weight-bold, 700);
  text-decoration: underline;
  text-underline-offset: 2px;
}

.survey-marker__go {
  margin-left: auto;
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
