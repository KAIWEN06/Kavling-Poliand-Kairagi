
<script setup lang="ts">
import { computed, ref } from 'vue'
import { IonIcon, IonInput } from '@ionic/vue'
import type { AutocompleteTypes, TextFieldTypes } from '@ionic/core'
import { eyeOutline, eyeOffOutline } from 'ionicons/icons'

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
})

const emit = defineEmits<{
  'update:modelValue': [value: string]
  focus: []
  blur: []
  'visibility-change': [visible: boolean]
}>()

const passwordVisible = ref(false)

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
  <div class="app-field">
    <label
      v-if="label"
      class="app-field__label"
      :for="inputId"
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
        :id="inputId"
        :model-value="modelValue"
        :type="effectiveType"
        :placeholder="placeholder"
        :autocomplete="autocomplete"
        :required="required"
        :disabled="disabled"
        class="app-field__input"
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
  color: #292a26;
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
  border: 1px solid #d5d5d0;
  border-radius: 10px;
  background: #fff;
  transition: border-color 0.2s ease;
}

.app-field__control:focus-within {
  border-color: #c3a052;
}

.app-field__icon {
  flex: 0 0 20px;
  width: 20px;
  height: 20px;
  color: #898b85;
}

.app-field__input {
  flex: 1;
  min-width: 0;
  width: 100%;
  min-height: 44px;
  --background: transparent;
  --color: #41443e;
  --placeholder-color: #999;
  --placeholder-opacity: 1;
  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;
  font-size: 14px;
}

.app-field__input::part(native) {
  padding: 0;
  min-height: 44px;
}

.app-field__eye {
  display: flex;
  flex: 0 0 34px;
  align-items: center;
  justify-content: center;
  width: 34px;
  height: 34px;
  padding: 0;
  border: 1px solid #dedbd3;
  border-radius: 9px;
  background: #f3f2ee;
  color: #777b74;
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
</style>
