<script setup lang="ts">
import { useId } from 'vue'
import { IonIcon } from '@ionic/vue'
import { informationCircleOutline } from 'ionicons/icons'
import { todayIsoDate, type CustomerIdentity } from '@/services/customerIdentityService'

const props = withDefaults(defineProps<{
  modelValue: CustomerIdentity
  audience?: 'client' | 'staff'
  /** true: boleh dikosongkan, jadi tanpa tanda bintang. */
  optional?: boolean
}>(), {
  audience: 'client',
  optional: false,
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
    <label class="mk-field idf-field">
      <span>NIK <b v-if="!optional" aria-hidden="true">*</b></span>
      <input
        class="mk-input"
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
    <label class="mk-field idf-field">
      <span>Tempat lahir <b v-if="!optional" aria-hidden="true">*</b></span>
      <input
        class="mk-input"
        :value="modelValue.birthPlace"
        data-input="name"
        autocomplete="off"
        maxlength="100"
        placeholder="Kota atau kabupaten"
        @input="update('birthPlace', $event)"
      />
    </label>
    <label class="mk-field idf-field">
      <span>Tanggal lahir <b v-if="!optional" aria-hidden="true">*</b></span>
      <input
        class="mk-input"
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

.idf-field { text-align: left; }
.idf-field b { color: var(--status-danger-text, #b13d36); }
/* Tanpa ini kolom tanggal kosong di iOS menyusut. */
.idf-field input[type='date'] { -webkit-appearance: none; appearance: none; }
</style>
