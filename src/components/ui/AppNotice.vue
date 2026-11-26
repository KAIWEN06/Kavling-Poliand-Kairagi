<template>
  <div class="nt" :class="[`nt-tone--${tone}`, { 'nt--floating': floating }]" :role="tone === 'error' ? 'alert' : 'status'">
    <NotifyIcon :tone="tone" />
    <div class="nt__body">
      <strong v-if="title" class="nt__title">{{ title }}</strong>
      <div class="nt__msg"><slot>{{ message }}</slot></div>
      <div v-if="actionLabel || $slots.actions" class="nt__actions">
        <slot name="actions">
          <button type="button" class="nt__action" @click="emit('action')">
            {{ actionLabel }}
            <svg v-if="floating" viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M7.5 4.5l5.5 5.5-5.5 5.5" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" /></svg>
          </button>
        </slot>
      </div>
    </div>
    <button v-if="dismissible" type="button" class="nt__close" aria-label="Tutup pesan" @click="emit('dismiss')">
      <svg viewBox="0 0 20 20" fill="none" aria-hidden="true"><path d="M5.5 5.5l9 9M14.5 5.5l-9 9" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" /></svg>
    </button>
    <slot name="extra" />
  </div>
</template>

<script setup lang="ts">
/**
 * Satu-satunya kartu pesan di aplikasi. Pesan yang menetap di halaman memakai komponen ini
 * langsung; pesan sementara lewat useToast() (ToastHost memakai komponen ini juga);
 * pertanyaan ya/tidak lewat useConfirm(). Warna dan ukuran ada di theme/notify.css.
 */
import NotifyIcon from '@/components/ui/NotifyIcon.vue'
import type { ToastTone } from '@/composables/useToast'

withDefaults(defineProps<{
  tone?: ToastTone
  title?: string
  message?: string
  actionLabel?: string
  dismissible?: boolean
  /** Tampilan melayang (toast): ikon lebih besar dan berbayang. */
  floating?: boolean
}>(), {
  tone: 'info',
  title: '',
  message: '',
  actionLabel: '',
  dismissible: false,
  floating: false,
})

const emit = defineEmits<{ dismiss: []; action: [] }>()
</script>

<style scoped>
.nt {
  --nt-icon-size: var(--nt-icon-inline);
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: var(--nt-gap);
  box-sizing: border-box;
  width: 100%;
  min-width: 0;
  margin: var(--nt-space) 0;
  padding: var(--nt-pad);
  overflow: hidden;
  border: 1px solid color-mix(in srgb, var(--nt-solid) 30%, transparent);
  border-radius: var(--nt-radius-inline);
  background: var(--nt-bg);
  color: var(--nt-text);
  font-family: var(--font-ui);
  font-size: var(--nt-font);
  line-height: 1.45;
  text-align: left;
  animation: nt-in var(--dur-base) var(--ease-spring) both;
}
.nt--floating {
  --nt-icon-size: var(--nt-icon);
  margin: 0;
  border-radius: var(--nt-radius);
  box-shadow: var(--nt-shadow);
  animation: none; /* gerak masuk diatur ToastHost */
}
.nt__body {
  flex: 1;
  min-width: 0;
  align-self: center;
  display: grid;
  gap: 2px;
}
.nt__title {
  color: var(--nt-title);
  font-size: var(--text-md);
  font-weight: 700;
  line-height: 1.3;
}
.nt__msg { min-width: 0; overflow-wrap: anywhere; white-space: pre-line; }
.nt__msg :deep(p) { margin: 0; color: inherit; font-size: inherit; line-height: inherit; }
.nt__msg :deep(strong) { color: var(--nt-title); }
/* Tombol coba lagi dan aksi lain yang dititipkan lewat slot. */
.nt__msg :deep(ion-button),
.nt__msg :deep(button),
.nt__msg :deep(.gate-actions) { margin-top: 8px; }
.nt__msg :deep(.gate-actions button) { margin-top: 0; }
.nt__actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 4px; }
.nt__action {
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid color-mix(in srgb, var(--nt-title) 40%, transparent);
  border-radius: var(--radius-sm);
  background: #FFFFFF;
  color: var(--nt-title);
  font: inherit;
  font-weight: 700;
  cursor: pointer;
}
.nt--floating .nt__action {
  display: inline-flex;
  align-items: center;
  gap: 4px;
}
.nt__action svg { width: 14px; height: 14px; }
.nt__close {
  display: grid;
  place-items: center;
  flex: none;
  width: 44px;
  height: 44px;
  margin: -8px -8px -8px -4px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--nt-title);
  cursor: pointer;
}
.nt--floating .nt__close { align-self: center; }
.nt__close svg { width: 16px; height: 16px; }

.nt__action, .nt__close {
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-fast) var(--ease-spring), background-color var(--dur-fast) var(--ease-out);
}
.nt__action:active, .nt__close:active { transform: scale(0.94); }
.nt__close:active { background: color-mix(in srgb, var(--nt-solid) 16%, transparent); }
.nt__action:focus-visible, .nt__close:focus-visible { outline: 2px solid var(--nt-title); outline-offset: -2px; }
@media (hover: hover) and (pointer: fine) {
  .nt__close:hover { background: color-mix(in srgb, var(--nt-solid) 12%, transparent); }
  .nt__action:hover { background: var(--nt-bg); }
}

@keyframes nt-in { from { opacity: 0; transform: translateY(6px) scale(0.97); } to { opacity: 1; transform: none; } }

@media (prefers-reduced-motion: reduce) {
  .nt { animation: none; }
  .nt__action, .nt__close { transition: none; }
}
</style>
