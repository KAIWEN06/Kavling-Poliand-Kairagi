<template>
  <AppModal
    class="ui-confirm"
    :model-value="open"
    variant="dialog"
    max-width="360px"
    :show-header="false"
    :show-divider="false"
    :show-footer="false"
    :aria-label="current?.title"
    @update:model-value="(value: boolean) => { if (!value) settle(false) }"
  >
    <div v-if="current" :key="current.id" class="ui-confirm__body" :class="`nt-tone--${tone}`">
      <!-- Pertanyaan berbahaya memakai tanda seru: tanda silang terbaca sebagai "sudah gagal". -->
      <span class="ui-confirm__halo"><NotifyIcon :tone="tone === 'error' ? 'warning' : tone" /></span>
      <h2 class="ui-confirm__title">{{ current.title }}</h2>
      <p v-if="current.message" class="ui-confirm__msg" :class="{ 'ui-confirm__msg--list': current.message.includes('\n') }">{{ current.message }}</p>
      <div class="ui-confirm__actions" :class="{ 'ui-confirm__actions--single': current.hideCancel }">
        <!-- Batal lebih dulu di DOM agar menerima fokus awal: aksi berbahaya tidak terpilih sendiri. -->
        <button v-if="!current.hideCancel" type="button" class="ui-confirm__btn ui-confirm__btn--cancel" @click="settle(false)">
          {{ current.cancelText || 'Batal' }}
        </button>
        <button type="button" class="ui-confirm__btn ui-confirm__btn--ok" @click="settle(true)">
          {{ current.confirmText || 'Lanjutkan' }}
        </button>
      </div>
    </div>
  </AppModal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import NotifyIcon from '@/components/ui/NotifyIcon.vue'
import { useConfirm } from '@/composables/useConfirm'

const { current, open, settle } = useConfirm()
const tone = computed(() => current.value?.tone ?? 'warning')
</script>

<style>
/* Tanpa scoped: kelas ini menempel pada akar AppModal. */
.app-modal.ui-confirm { z-index: var(--nt-z-confirm); }
</style>

<style scoped>
.ui-confirm__body {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 12px 4px 2px;
  text-align: center;
  font-family: var(--font-ui);
}
.ui-confirm__halo {
  --nt-icon-size: 56px;
  display: grid;
  place-items: center;
  width: 84px;
  height: 84px;
  border-radius: 50%;
  background: var(--nt-bg);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--nt-solid) 22%, transparent);
}
.ui-confirm__title {
  margin: 4px 0 0;
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: var(--text-2xl);
  font-weight: 600;
  line-height: 1.2;
  text-wrap: balance;
}
.ui-confirm__msg {
  margin: 0;
  color: var(--text-secondary);
  font-size: var(--text-md);
  line-height: 1.5;
  white-space: pre-line;
  overflow-wrap: anywhere;
}
/* Rincian beberapa baris lebih mudah dibaca rata kiri. */
.ui-confirm__msg--list { justify-self: stretch; padding: 12px 14px; border-radius: var(--radius-md); background: var(--surface-muted); color: var(--text-primary); text-align: left; font-size: var(--text-sm); }
.ui-confirm__actions {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
  width: 100%;
  margin-top: 12px;
}
.ui-confirm__actions--single { grid-template-columns: minmax(0, 1fr); }
.ui-confirm__btn {
  min-height: 48px;
  padding: 8px 12px;
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  font: inherit;
  font-size: var(--text-md);
  font-weight: 700;
  line-height: 1.25;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-fast) var(--ease-spring), filter var(--dur-fast) var(--ease-out);
}
.ui-confirm__btn--cancel { border-color: var(--border-strong); background: #FFFFFF; color: var(--text-primary); }
.ui-confirm__btn--ok { background: var(--nt-solid); color: var(--nt-on); }
.ui-confirm__btn:active { transform: scale(0.96); filter: brightness(0.94); }
@media (hover: hover) and (pointer: fine) {
  .ui-confirm__btn:hover { filter: brightness(0.96); }
}
@media (prefers-reduced-motion: reduce) {
  .ui-confirm__btn { transition: none; }
}
</style>
