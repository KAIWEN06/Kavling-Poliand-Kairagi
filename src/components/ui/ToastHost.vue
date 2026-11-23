<template>
  <div class="ui-toasts" aria-live="polite" aria-atomic="false">
    <TransitionGroup name="ui-toast" tag="div" class="ui-toasts__stack">
      <div
        v-for="t in items"
        :key="t.id"
        class="ui-toast"
        :class="`ui-toast--${t.tone}`"
        :role="t.tone === 'error' ? 'alert' : 'status'"
      >
        <svg class="ui-toast__icon" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <circle cx="10" cy="10" r="8.5" stroke="currentColor" stroke-width="1.6" />
          <path v-if="t.tone === 'success'" d="M6 10.5l2.8 2.8L14 7.8" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
          <path v-else-if="t.tone === 'error'" d="M7 7l6 6M13 7l-6 6" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
          <path v-else d="M10 6v5M10 13.6v.1" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" />
        </svg>
        <span class="ui-toast__msg">{{ t.message }}</span>
        <button class="ui-toast__close" type="button" aria-label="Tutup pesan" @click="dismiss(t.id)">
          <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" /></svg>
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { useToast } from '@/composables/useToast'

const { items, dismiss } = useToast()
</script>

<style scoped>
.ui-toasts {
  position: fixed;
  inset: auto 0 0 0;
  z-index: var(--z-toast);
  display: flex;
  justify-content: center;
  padding: var(--space-4);
  padding-bottom: calc(var(--space-4) + var(--bottom-nav-h) + var(--safe-bottom));
  pointer-events: none;
}
.ui-toasts__stack {
  display: grid;
  gap: var(--space-2);
  width: min(420px, 100%);
}
.ui-toast {
  --t-accent: var(--green-500);
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-3) var(--space-3) var(--space-4);
  border-radius: var(--radius-md);
  border-left: 4px solid var(--t-accent);
  background: var(--surface-forest);
  color: var(--on-forest);
  box-shadow: var(--shadow-md);
  font-size: var(--text-md);
  line-height: 1.4;
  pointer-events: auto;
}
.ui-toast--error { --t-accent: var(--status-danger); }
.ui-toast--warning { --t-accent: var(--gold-500); }
.ui-toast--info { --t-accent: #7FA6F0; }
.ui-toast__icon { width: 20px; height: 20px; flex: none; margin-top: 1px; color: var(--t-accent); }
.ui-toast__msg { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.ui-toast__close {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  margin: -6px -4px -6px 0;
  border: 0;
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--on-forest-muted);
  cursor: pointer;
}
.ui-toast__close svg { width: 16px; height: 16px; }

.ui-toast-enter-active { transition: opacity var(--dur-base) var(--ease-out), transform var(--dur-base) var(--ease-spring); }
.ui-toast-leave-active { transition: opacity var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-out); position: absolute; width: 100%; }
.ui-toast-enter-from { opacity: 0; transform: translateY(16px) scale(0.97); }
.ui-toast-leave-to { opacity: 0; transform: translateY(6px); }
.ui-toast-move { transition: transform var(--dur-base) var(--ease-out); }
</style>
