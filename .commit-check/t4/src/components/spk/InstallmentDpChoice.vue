<script setup lang="ts">
/**
 * Pilihan skema cicilan pada pengajuan SPK: langsung cicil (tanpa DP)
 * atau bayar DP dulu lalu sisanya dicicil. Dipakai oleh semua role
 * (Admin, Marketing, Klien) supaya pilihan dan katanya sama.
 */
const props = defineProps<{
  /** true = pakai DP, false = langsung cicil */
  modelValue: boolean
  /** Nama unik grup radio, wajib berbeda bila ada beberapa kaveling di satu form. */
  name: string
}>()

const emit = defineEmits<{ 'update:modelValue': [value: boolean] }>()

const options = [
  { value: false, title: 'Langsung cicil', detail: 'Tanpa uang muka, seluruh harga dibagi per bulan' },
  { value: true, title: 'Pakai uang muka', detail: 'Bayar uang muka dulu, sisanya dicicil' },
] as const

function choose(value: boolean) {
  if (value !== props.modelValue) emit('update:modelValue', value)
}
</script>

<template>
  <div class="dp-choice" role="radiogroup" aria-label="Skema cicilan">
    <label
      v-for="option in options"
      :key="String(option.value)"
      class="dp-choice__option"
      :class="{ 'is-chosen': modelValue === option.value }"
    >
      <input
        type="radio"
        :name="name"
        :checked="modelValue === option.value"
        @change="choose(option.value)"
      />
      <span class="dp-choice__dot" aria-hidden="true"></span>
      <span class="dp-choice__copy">
        <strong>{{ option.title }}</strong>
        <small>{{ option.detail }}</small>
      </span>
    </label>
  </div>
</template>

<style scoped>
.dp-choice {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.dp-choice__option {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 9px;
  min-height: 44px;
  padding: 11px 12px;
  border: 1px solid var(--border-default, #EAE7E0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-primary, #FFFFFF);
  color: var(--text-primary, #252525);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
  transition:
    transform var(--dur-instant, 90ms) var(--ease-out, ease-out),
    border-color var(--dur-fast, 160ms) var(--ease-out, ease-out),
    background-color var(--dur-fast, 160ms) var(--ease-out, ease-out);
}

.dp-choice__option:active {
  transform: scale(0.97);
  transition-timing-function: var(--ease-spring, ease-out);
}

/* Radio asli tetap ada untuk keyboard dan pembaca layar. */
.dp-choice__option input {
  position: absolute;
  inset: 0;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.dp-choice__option:has(input:focus-visible) {
  outline: 2px solid var(--poliland-green, #355A2C);
  outline-offset: 2px;
}

.dp-choice__dot {
  flex: 0 0 auto;
  width: 16px;
  height: 16px;
  margin-top: 1px;
  border: 2px solid var(--text-secondary, #5F5F66);
  border-radius: 50%;
  background: var(--surface-primary, #FFFFFF);
  transition: border-color var(--dur-fast, 160ms) var(--ease-out, ease-out);
}

.dp-choice__copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.dp-choice__copy strong {
  font-size: 13px;
  font-weight: 800;
  line-height: 1.3;
}

/* #5F5F66 di atas putih 6,3:1, di atas #E8EEE4 5,4:1 */
.dp-choice__copy small {
  color: var(--text-secondary, #5F5F66);
  font-size: 11px;
  line-height: 1.4;
}

/* #355A2C di atas #E8EEE4 6,7:1 */
.dp-choice__option.is-chosen {
  border-color: var(--poliland-green, #355A2C);
  background: var(--status-success-bg, #E8EEE4);
}

.dp-choice__option.is-chosen strong {
  color: var(--poliland-green, #355A2C);
}

.dp-choice__option.is-chosen .dp-choice__dot {
  border-color: var(--poliland-green, #355A2C);
  border-width: 5px;
}

@media (hover: hover) and (pointer: fine) {
  .dp-choice__option:hover:not(.is-chosen) {
    border-color: var(--poliland-green, #355A2C);
  }
}

@media (max-width: 340px) {
  .dp-choice { grid-template-columns: 1fr; }
}

@media (prefers-reduced-motion: reduce) {
  .dp-choice__option,
  .dp-choice__dot { transition: none; }
  .dp-choice__option:active { transform: none; }
}
</style>
