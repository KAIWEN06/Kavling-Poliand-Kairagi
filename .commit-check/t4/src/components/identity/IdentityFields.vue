<script setup lang="ts">
import { useId } from 'vue'
import { IonIcon } from '@ionic/vue'
import { informationCircleOutline } from 'ionicons/icons'
import { todayIsoDate, type CustomerIdentity } from '@/services/customerIdentityService'

const props = withDefaults(defineProps<{ modelValue: CustomerIdentity; audience?: 'client' | 'staff' }>(), {
  audience: 'client',
})
const emit = defineEmits<{ 'update:modelValue': [value: CustomerIdentity] }>()

const noteId = useId()
const today = todayIsoDate()

function update(key: keyof CustomerIdentity, event: Event) {
  emit('update:modelValue', { ...props.modelValue, [key]: (event.target as HTMLInputElement).value })
}
</script>

<template>
  <div class="idf">
    <p :id="noteId" class="idf-note">
      <IonIcon :icon="informationCircleOutline" aria-hidden="true" />
      <span>
        Untuk keperluan administrasi: mengisi data pembeli di dokumen SPK yang ditandatangani.
        <template v-if="audience === 'client'">Samakan dengan KTP Anda.</template>
        <template v-else>Samakan dengan KTP pembeli.</template>
      </span>
    </p>

    <label class="idf-field">
      <span>NIK <b aria-hidden="true">*</b></span>
      <input
        :value="modelValue.nik"
        data-input="nik"
        inputmode="numeric"
        autocomplete="off"
        maxlength="16"
        placeholder="16 digit sesuai KTP"
        :aria-describedby="noteId"
        @input="update('nik', $event)"
      />
    </label>
    <label class="idf-field">
      <span>Tempat lahir <b aria-hidden="true">*</b></span>
      <input
        :value="modelValue.birthPlace"
        data-input="name"
        autocomplete="off"
        maxlength="100"
        placeholder="Kota atau kabupaten"
        @input="update('birthPlace', $event)"
      />
    </label>
    <label class="idf-field">
      <span>Tanggal lahir <b aria-hidden="true">*</b></span>
      <input
        :value="modelValue.birthDate"
        type="date"
        min="1900-01-01"
        :max="today"
        @input="update('birthDate', $event)"
      />
    </label>
  </div>
</template>

<style scoped>
.idf { display: grid; gap: 12px; }

.idf-note {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  padding: 10px 12px;
  border-left: 3px solid var(--poliland-gold, #cba044);
  border-radius: var(--radius-sm, 10px);
  background: var(--surface-muted, #fbf8f2);
  color: var(--text-primary, #252525);
  font-size: 12.5px;
  font-weight: 500;
  line-height: 1.55;
}

.idf-note ion-icon { flex: 0 0 auto; margin-top: 1px; color: var(--poliland-green, #355a2c); font-size: 18px; }

.idf-field { display: grid; gap: 6px; color: var(--text-primary, #252525); font-size: 12.5px; font-weight: 700; text-align: left; }
.idf-field b { color: var(--status-danger-text, #b13d36); }

.idf-field input {
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  min-height: 48px;
  padding: 11px 12px;
  border: 1px solid var(--border-default, #dfe5dc);
  border-radius: var(--radius-sm, 10px);
  background: var(--surface-primary, #fff);
  color: var(--text-primary, #252525);
  font: inherit;
  font-size: 16px;
  font-weight: 400;
  outline: none;
  touch-action: manipulation;
}

.idf-field input[type='date'] { -webkit-appearance: none; appearance: none; }

.idf-field input:focus-visible {
  border-color: var(--poliland-green, #355a2c);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--poliland-green, #355a2c) 22%, transparent);
}
</style>
