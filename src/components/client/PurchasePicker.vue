<script setup lang="ts">
import { nextDueDate, overdueSince, isPaidOff, type PurchaseEntry } from '@/utils/purchaseSelection'

defineProps<{
  entries: PurchaseEntry[]
  selectedKey: string
}>()

const emit = defineEmits<{ select: [key: string] }>()

const shortDate = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' })

function state(entry: PurchaseEntry): { text: string; late: boolean } {
  if (!entry.purchase) {
    return { text: entry.spk?.status === 'Approved' ? 'SPK disetujui' : 'SPK diperiksa', late: false }
  }
  if (overdueSince(entry) !== null) return { text: 'Terlambat', late: true }
  if (isPaidOff(entry.purchase)) return { text: 'Lunas', late: false }
  const due = nextDueDate(entry)
  return {
    text: due ? `Tempo ${shortDate.format(new Date(`${due.slice(0, 10)}T00:00:00`))}` : 'Belum lunas',
    late: false,
  }
}
</script>

<template>
  <section class="picker" aria-labelledby="picker-title">
    <h2 id="picker-title">Kavling Anda</h2>
    <ul>
      <li v-for="entry in entries" :key="entry.key">
        <button
          type="button"
          :class="{ 'is-selected': entry.key === selectedKey, 'is-late': state(entry).late }"
          :aria-pressed="entry.key === selectedKey"
          @click="emit('select', entry.key)"
        >
          <strong>{{ entry.lotLabel }}</strong>
          <small>{{ state(entry).text }}</small>
        </button>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.picker {
  display: grid;
  gap: var(--space-2);
}

.picker h2 {
  margin: 0;
  color: var(--text-primary);
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: var(--text-lg);
  font-weight: 700;
}

/* Semua pesanan terlihat sekaligus; tidak ada yang tersembunyi di luar layar. */
.picker ul {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 148px), 1fr));
  gap: var(--space-2);
  margin: 0;
  padding: 0;
  list-style: none;
}

.picker li {
  display: grid;
}

.picker button {
  display: grid;
  align-content: center;
  gap: 2px;
  min-width: 0;
  min-height: 56px;
  padding: var(--space-2) var(--space-3);
  border: 1.5px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--surface-primary);
  color: var(--text-primary);
  font-family: var(--font-ui);
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
  transition:
    background-color var(--dur-fast) var(--ease-out),
    border-color var(--dur-fast) var(--ease-out),
    transform var(--dur-base) var(--ease-spring);
}

.picker button:active {
  transform: scale(0.97);
  transition-duration: var(--dur-fast);
}

.picker button:focus-visible {
  outline: 2px solid var(--green-700);
  outline-offset: 2px;
}

@media (hover: hover) and (pointer: fine) {
  .picker button:not(.is-selected):hover {
    border-color: var(--green-700);
  }
}

.picker strong {
  font-size: var(--text-md);
  font-weight: 700;
  overflow-wrap: anywhere;
}

.picker small {
  color: var(--text-secondary);
  font-size: var(--text-sm);
}

.picker .is-late small {
  color: var(--danger-text);
  font-weight: 700;
}

.picker .is-selected {
  border-color: var(--surface-forest);
  background: var(--surface-forest);
  color: var(--on-forest);
}

.picker .is-selected small {
  color: var(--gold-100);
}

@media (prefers-reduced-motion: reduce) {
  .picker button {
    transition: none;
  }

  .picker button:active {
    transform: none;
  }
}
</style>
