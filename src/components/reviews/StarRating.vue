<template>
  <div
    v-if="readonly"
    class="stars"
    role="img"
    :aria-label="`${modelValue} dari 5 bintang`"
    :style="{ '--star-size': `${size}px` }"
  >
    <ion-icon
      v-for="n in 5"
      :key="n"
      :icon="n <= Math.round(modelValue) ? star : starOutline"
      :class="['star', n <= Math.round(modelValue) ? 'star--on' : 'star--off']"
      aria-hidden="true"
    />
  </div>

  <div
    v-else
    class="stars stars--interactive"
    role="radiogroup"
    :aria-label="label"
    :style="{ '--star-size': `${size}px` }"
    @mouseleave="hover = 0"
  >
    <button
      v-for="n in 5"
      :key="n"
      type="button"
      role="radio"
      class="star-btn"
      :aria-checked="modelValue === n"
      :aria-label="`${n} bintang`"
      :tabindex="n === (modelValue || 1) ? 0 : -1"
      @click="$emit('update:modelValue', n)"
      @mouseenter="hover = n"
      @keydown.right.prevent="step(1)"
      @keydown.up.prevent="step(1)"
      @keydown.left.prevent="step(-1)"
      @keydown.down.prevent="step(-1)"
    >
      <ion-icon
        :icon="n <= (hover || modelValue) ? star : starOutline"
        :class="['star', n <= (hover || modelValue) ? 'star--on' : 'star--off']"
        aria-hidden="true"
      />
    </button>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IonIcon } from '@ionic/vue'
import { star, starOutline } from 'ionicons/icons'

const props = withDefaults(
  defineProps<{
    modelValue: number
    readonly?: boolean
    size?: number
    label?: string
  }>(),
  { readonly: false, size: 16, label: 'Beri rating' },
)

const emit = defineEmits<{ 'update:modelValue': [value: number] }>()
const hover = ref(0)

function step(delta: number) {
  const next = Math.min(5, Math.max(1, (props.modelValue || 0) + delta))
  emit('update:modelValue', next)
  requestAnimationFrame(() => {
    document
      .querySelector<HTMLButtonElement>('.stars--interactive .star-btn[tabindex="0"]')
      ?.focus()
  })
}
</script>

<style scoped>
.stars {
  display: inline-flex;
  align-items: center;
  gap: 2px;
}

.star {
  width: var(--star-size);
  height: var(--star-size);
  flex: none;
}

.star--on {
  color: var(--poliland-gold);
}

.star--off {
  color: var(--text-tertiary);
}

.star-btn {
  display: inline-grid;
  place-items: center;
  padding: 2px;
  border: 0;
  border-radius: var(--radius-xs);
  background: transparent;
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .star-btn:hover {
    transform: scale(1.12);
  }
}

.star-btn:focus-visible {
  outline: none;
  box-shadow: var(--ring-focus);
}

@media (prefers-reduced-motion: reduce) {
  .star-btn {
    transition: none;
  }

  @media (hover: hover) and (pointer: fine) {
  .star-btn:hover {
      transform: none;
    }
}
}
</style>
