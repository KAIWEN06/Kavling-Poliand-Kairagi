<template>
  <ion-button
    v-bind="$attrs"
    :class="[
      'app-button',
      `app-button--${effectiveVariant ?? 'legacy'}`,
      `app-button--fill-${effectiveFill}`,
      `app-button--${size}`,
    ]"
    :color="legacyColor"
    :fill="effectiveFill"
    :expand="expand"
    :type="type"
    :disabled="isUnavailable"
    :aria-busy="loading ? 'true' : undefined"
    :aria-disabled="isUnavailable ? 'true' : undefined"
    @click="handleClick"
  >
    <ion-spinner
      v-if="loading"
      class="app-button__spinner"
      name="crescent"
      aria-hidden="true"
    />
    <span class="app-button__content">
      <slot />
    </span>
    <span v-if="loading" class="sr-only">Memproses</span>
  </ion-button>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IonButton, IonSpinner } from '@ionic/vue'

defineOptions({
  inheritAttrs: false,
})

type ButtonVariant = 'primary' | 'secondary' | 'success' | 'danger' | 'neutral'
type ButtonFill = 'solid' | 'outline' | 'clear'
type ButtonSize = 'small' | 'medium' | 'large'
type ButtonType = 'button' | 'submit' | 'reset'

const props = withDefaults(defineProps<{
  variant?: ButtonVariant
  color?: string
  fill?: ButtonFill | 'default'
  size?: ButtonSize
  expand?: 'block' | 'full'
  loading?: boolean
  disabled?: boolean
  type?: ButtonType
}>(), {
  fill: 'solid',
  size: 'medium',
  loading: false,
  disabled: false,
  type: 'button',
})

const emit = defineEmits<{
  click: [event: MouseEvent]
}>()

const effectiveVariant = computed<ButtonVariant | undefined>(() =>
  props.variant ?? (props.color ? undefined : 'primary')
)

const legacyColor = computed(() => effectiveVariant.value ? undefined : props.color)

const effectiveFill = computed<ButtonFill>(() =>
  props.fill === 'default' ? 'solid' : props.fill
)

const isUnavailable = computed(() => props.loading || props.disabled)

function handleClick(event: MouseEvent) {
  if (isUnavailable.value) {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  emit('click', event)
}
</script>

<style scoped>
.app-button {
  --font-family: var(--font-primary);
  --border-radius: var(--radius-control);
  font-family: var(--font-primary);
  font-weight: var(--font-weight-semibold);
}

.app-button--small {
  min-height: 44px;
  font-size: var(--font-size-xs);
}

.app-button--medium {
  min-height: 44px;
  font-size: var(--font-size-sm);
}

.app-button--large {
  min-height: 48px;
  font-size: var(--font-size-base);
}

.app-button--primary.app-button--fill-solid {
  --background: var(--poliland-green);
  --background-hover: #2E4D26;
  --background-activated: #263F20;
  --color: #FFFFFF;
}

.app-button--secondary.app-button--fill-solid {
  --background: var(--poliland-gold);
  --background-hover: #B68E3D;
  --background-activated: #A27C35;
  --color: var(--text-primary);
}

.app-button--success.app-button--fill-solid {
  --background: var(--status-success);
  --background-hover: #2E4D26;
  --background-activated: #263F20;
  --color: #FFFFFF;
}

.app-button--danger.app-button--fill-solid {
  --background: var(--status-danger);
  --background-hover: #BF423D;
  --background-activated: #A93834;
  --color: #FFFFFF;
}

.app-button--neutral.app-button--fill-solid {
  --background: var(--surface-muted);
  --background-hover: var(--border-default);
  --background-activated: #DDD9CF;
  --color: var(--text-primary);
}

.app-button--primary.app-button--fill-outline {
  --background: transparent;
  --background-hover: var(--status-success-bg);
  --background-activated: #DCE6D8;
  --border-color: var(--poliland-green);
  --border-style: solid;
  --border-width: 1px;
  --color: var(--poliland-green);
}

.app-button--secondary.app-button--fill-outline {
  --background: transparent;
  --background-hover: var(--poliland-gold-soft);
  --background-activated: #E9CA82;
  --border-color: var(--poliland-gold-text);
  --border-style: solid;
  --border-width: 1px;
  --color: var(--poliland-gold-text-soft);
}

.app-button--success.app-button--fill-outline {
  --background: transparent;
  --background-hover: var(--status-success-bg);
  --background-activated: #DCE6D8;
  --border-color: var(--status-success);
  --border-style: solid;
  --border-width: 1px;
  --color: var(--status-success);
}

.app-button--danger.app-button--fill-outline {
  --background: transparent;
  --background-hover: #FBEAEA;
  --background-activated: #F3D0CE;
  --border-color: var(--status-danger);
  --border-style: solid;
  --border-width: 1px;
  --color: var(--status-danger);
}

.app-button--neutral.app-button--fill-outline {
  --background: transparent;
  --background-hover: var(--surface-muted);
  --background-activated: var(--border-default);
  --border-color: var(--border-default);
  --border-style: solid;
  --border-width: 1px;
  --color: var(--text-primary);
}

.app-button--primary.app-button--fill-clear {
  --background: transparent;
  --background-hover: var(--status-success-bg);
  --background-activated: #DCE6D8;
  --color: var(--poliland-green);
}

.app-button--secondary.app-button--fill-clear {
  --background: transparent;
  --background-hover: var(--poliland-gold-soft);
  --background-activated: #E9CA82;
  --color: var(--poliland-gold-text-soft);
}

.app-button--success.app-button--fill-clear {
  --background: transparent;
  --background-hover: var(--status-success-bg);
  --background-activated: #DCE6D8;
  --color: var(--status-success);
}

.app-button--danger.app-button--fill-clear {
  --background: transparent;
  --background-hover: #FBEAEA;
  --background-activated: #F3D0CE;
  --color: var(--status-danger);
}

.app-button--neutral.app-button--fill-clear {
  --background: transparent;
  --background-hover: var(--surface-muted);
  --background-activated: var(--border-default);
  --color: var(--text-primary);
}

.app-button__content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.app-button__spinner {
  width: 16px;
  height: 16px;
  margin-inline-end: 6px;
  vertical-align: middle;
}

.app-button:focus-visible {
  outline: 3px solid var(--status-warning);
  outline-offset: 2px;
}

.app-button[aria-disabled='true'] {
  cursor: not-allowed;
  opacity: 0.55;
}

.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

@media (hover: hover) {
  .app-button:not([aria-disabled='true']) {
    cursor: pointer;
  }
}
</style>