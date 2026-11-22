<template>
  <div class="mk-period">
    <div class="mk-chips" role="group" aria-label="Periode laporan">
      <button
        v-for="option in PERIOD_OPTIONS"
        :key="option.value"
        type="button"
        class="mk-chip"
        :aria-pressed="preset === option.value"
        @click="setPreset(option.value)"
      >
        {{ option.label }}
      </button>
    </div>

    <div class="mk-filters">
      <template v-if="preset === 'custom'">
        <label class="mk-field">
          <span>Dari</span>
          <input v-model="customFrom" class="mk-input" type="date" @change="emitRange" />
        </label>
        <label class="mk-field">
          <span>Sampai</span>
          <input v-model="customTo" class="mk-input" type="date" @change="emitRange" />
        </label>
      </template>
      <label v-if="members.length" class="mk-field">
        <span>Marketing</span>
        <select v-model="marketing" class="mk-input" @change="emitRange">
          <option value="">Semua Marketing</option>
          <option v-for="member in members" :key="member.id" :value="member.id">{{ member.full_name }}</option>
        </select>
      </label>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { PERIOD_OPTIONS, periodRange, todayIso, type PeriodPreset } from '@/utils/marketingStatus'

const props = withDefaults(
  defineProps<{ members?: Array<{ id: string; full_name: string }>; initial?: PeriodPreset }>(),
  { members: () => [], initial: 'month' },
)
const emit = defineEmits<{ change: [value: { from: string; to: string; marketingId: string | null; preset: PeriodPreset }] }>()

const preset = ref<PeriodPreset>(props.initial)
const customFrom = ref(todayIso().slice(0, 8) + '01')
const customTo = ref(todayIso())
const marketing = ref('')

function emitRange() {
  const range = periodRange(preset.value, customFrom.value, customTo.value)
  emit('change', { ...range, marketingId: marketing.value || null, preset: preset.value })
}

function setPreset(value: PeriodPreset) {
  preset.value = value
  emitRange()
}

onMounted(emitRange)
</script>

<style scoped>
.mk-period { display: grid; gap: 10px; }
</style>
