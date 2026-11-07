
<script setup lang="ts">
import { computed, ref, useAttrs, useId } from 'vue'
import { IonIcon, IonInput } from '@ionic/vue'
import type { AutocompleteTypes, TextFieldTypes } from '@ionic/core'
import { eyeOutline, eyeOffOutline } from 'ionicons/icons'

defineOptions({
  inheritAttrs: false,
})

interface Props {
  modelValue: string
  label: string
  placeholder?: string
  type?: TextFieldTypes
  autocomplete?: AutocompleteTypes
  icon?: string
  inputId?: string
  required?: boolean
  disabled?: boolean
  showPasswordToggle?: boolean
  errorMessage?: string
  readonly?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  placeholder: '',
  type: 'text',
  autocomplete: 'off',
  icon: undefined,
  inputId: undefined,
  required: false,
  disabled: false,
  showPasswordToggle: true,
  errorMessage: '',
  readonly: false,
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: []
  blur: []
  'visibility-change': [visible: boolean]
}>()

const passwordVisible = ref(false)
const attrs = useAttrs()
const generatedInputId = `app-input-${useId()}`

const resolvedInputId = computed(() => props.inputId || generatedInputId)
const errorId = computed(() => `${resolvedInputId.value}-error`)
const hasError = computed(() =>
  typeof props.errorMessage === 'string' && props.errorMessage.trim().length > 0
)

const describedBy = computed(() => {
  const callerDescription = typeof attrs['aria-describedby'] === 'string'
    ? attrs['aria-describedby'].trim()
    : ''

  return [callerDescription, hasError.value ? errorId.value : '']
    .filter(Boolean)
    .join(' ')
})

const inputAttrs = computed(() => {
  const forwarded = { ...attrs } as Record<string, unknown>

  delete forwarded.class
  delete forwarded.style
  delete forwarded.id
  delete forwarded.readonly
  delete forwarded['aria-describedby']

  return forwarded
})

const effectiveType = computed<TextFieldTypes>(() => {
  if (props.type === 'password' && props.showPasswordToggle) {
    return passwordVisible.value ? 'text' : 'password'
  }

  return props.type
})

function togglePassword() {
  passwordVisible.value = !passwordVisible.value
  emit('visibility-change', passwordVisible.value)
}
</script>

<template>
  <div
    class="app-field"
    :class="attrs.class"
    :style="attrs.style"
  >
    <label
      v-if="label"
      class="app-field__label"
      :for="resolvedInputId"
    >
      {{ label }}
    </label>

    <div class="app-field__control">
      <IonIcon
        v-if="icon"
        :icon="icon"
        class="app-field__icon"
        aria-hidden="true"
      />

      <IonInput
        v-bind="inputAttrs"
        :id="resolvedInputId"
        :model-value="modelValue"
        :type="effectiveType"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :required="required"
        :disabled="disabled"
        :readonly="readonly"
        :aria-invalid="hasError ? 'true' : undefined"
        :aria-describedby="describedBy || undefined"
        class="app-field__input"
        :class="{ 'app-field__input--error': hasError }"
        @ionInput="emit(
          'update:modelValue',
          String($event.detail.value ?? '')
        )"
        @ionFocus="emit('focus')"
        @ionBlur="emit('blur')"
      />

      <button
        v-if="type === 'password' && showPasswordToggle"
        class="app-field__eye"
        type="button"
        :disabled="disabled"
        :aria-label="
          passwordVisible
            ? 'Sembunyikan password'
            : 'Tampilkan password'
        "
        :aria-pressed="passwordVisible"
        @pointerdown.prevent
        @click.stop="togglePassword"
      >
        <IonIcon
          :icon="passwordVisible ? eyeOutline : eyeOffOutline"
          aria-hidden="true"
        />
      </button>

      <slot name="suffix" v-else />
    </div>

    <p
      v-if="hasError"
      :id="errorId"
      class="app-field__error"
      role="alert"
    >
      {{ errorMessage }}
    </p>
  </div>
</template>

<style scoped>
.app-field {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: 100%;
  min-width: 0;
}

.app-field__label {
  margin: 0;
  padding: 0;
  color: var(--text-primary);
  font-size: 14px;
  line-height: 1.4;
  font-weight: 600;
}

.app-field__control {
  display: flex;
  flex-direction: row;
  align-items: center;
  gap: 10px;
  width: 100%;
  min-width: 0;
  min-height: 46px;
  box-sizing: border-box;
  padding: 0 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-primary);
  transition: border-color 0.2s ease, box-shadow 0.2s ease, opacity 0.2s ease;
}

.app-field__control:hover:not(:has(.app-field__input[disabled])) {
  border-color: var(--text-secondary);
}

.app-field__control:focus-within {
  border-color: var(--poliland-green);
}

.app-field__control:has(.app-field__input:focus-visible) {
  border-color: var(--poliland-green);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--poliland-green) 24%, transparent);
}

.app-field__control:has(.app-field__input--error) {
  border-color: var(--status-danger);
}

.app-field__control:has(.app-field__input[disabled]) {
  background: var(--surface-muted);
  opacity: 0.65;
}

.app-field__control:has(.app-field__input[readonly]) {
  background: var(--surface-muted);
}

.app-field__icon {
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  color: var(--text-secondary);
}

.app-field__input {
  flex: 1;
  min-width: 0;
  width: 100%;
  min-height: 44px;
  --background: transparent;
  --color: var(--text-primary);
  --placeholder-color: var(--text-secondary);
  --placeholder-opacity: 1;
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
  font-size: 14px;
  font-family: var(--font-primary);
}

.app-field__input::part(native) {
  padding: 0;
  min-height: 44px;
}

.app-field__eye {
  display: flex;
  flex: 0 0 44px;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-muted);
  color: var(--text-secondary);
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
}

.app-field__eye ion-icon {
  width: 19px;
  height: 19px;
  pointer-events: none;
}

.app-field__eye:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.app-field__error {
  margin: 0;
  color: var(--status-danger);
  font-family: var(--font-primary);
  font-size: var(--font-size-xs);
  line-height: 1.4;
  font-weight: var(--font-weight-medium);
}
</style>
