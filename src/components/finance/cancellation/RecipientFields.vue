<script setup lang="ts">
import type { RefundRecipient } from '@/services/Finance/purchaseCancellationService'
import './cancellation.css'

const props = defineProps<{ modelValue: RefundRecipient }>()
const emit = defineEmits<{ 'update:modelValue': [value: RefundRecipient] }>()

function update(key: keyof RefundRecipient, event: Event) {
  emit('update:modelValue', { ...props.modelValue, [key]: (event.target as HTMLInputElement).value })
}
</script>

<template>
  <fieldset class="pc-group">
    <legend>Rekening tujuan pengembalian</legend>
    <label class="pc-field">
      Nama bank
      <input :value="modelValue.bank" type="text" maxlength="100" autocomplete="off" @input="update('bank', $event)" />
    </label>
    <label class="pc-field">
      Nomor rekening
      <input :value="modelValue.accountNumber" type="text" inputmode="numeric" maxlength="40" autocomplete="off" @input="update('accountNumber', $event)" />
    </label>
    <label class="pc-field">
      Nama pemilik rekening
      <input :value="modelValue.accountName" type="text" maxlength="150" autocomplete="off" @input="update('accountName', $event)" />
      <small>Bila berbeda dari nama pembeli, lampirkan surat kuasa kepada Admin.</small>
    </label>
  </fieldset>
</template>
