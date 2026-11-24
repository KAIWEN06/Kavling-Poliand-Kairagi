<template>
  <Teleport to="body">
    <Transition name="viewer-fade">
      <div
        v-if="open && url"
        class="viewer-backdrop"
        role="dialog"
        aria-modal="true"
        aria-label="Foto profil"
        @click.self="emit('close')"
        @keydown.esc="emit('close')"
      >
        <button type="button" class="viewer-close" aria-label="Tutup" @click="emit('close')">
          <ion-icon :icon="closeOutline" aria-hidden="true" />
        </button>
        <img :src="url" alt="Foto profil" class="viewer-img" draggable="false" @click.stop />
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { IonIcon } from '@ionic/vue'
import { closeOutline } from 'ionicons/icons'

const props = defineProps<{ open: boolean; url: string }>()
const emit = defineEmits<{ (e: 'close'): void }>()

watch(
  () => props.open,
  (open) => {
    document.documentElement.style.overflow = open ? 'hidden' : ''
  },
)

onBeforeUnmount(() => {
  document.documentElement.style.overflow = ''
})
</script>

<style scoped>
.viewer-backdrop {
  position: fixed;
  inset: 0;
  z-index: 30000;
  display: grid;
  place-items: center;
  padding: env(safe-area-inset-top, 0px) 16px env(safe-area-inset-bottom, 0px);
  background: rgba(16, 26, 14, 0.92);
  overscroll-behavior: contain;
}

.viewer-img {
  width: min(92vw, 520px);
  max-height: 80dvh;
  aspect-ratio: 1;
  border-radius: 50%;
  object-fit: cover;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.45);
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
}

.viewer-close {
  position: absolute;
  top: calc(12px + env(safe-area-inset-top, 0px));
  right: 12px;
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: rgba(244, 241, 232, 0.14);
  color: var(--on-forest, #f4f1e8);
  font-size: 24px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-fast, 160ms) var(--ease-spring, ease-out);
}

.viewer-close:active {
  transform: scale(0.94);
}

.viewer-close:focus-visible {
  outline: 3px solid var(--poliland-gold-soft, #f4d69a);
  outline-offset: 2px;
}

.viewer-fade-enter-active,
.viewer-fade-leave-active {
  transition: opacity var(--dur-base, 240ms) var(--ease-out, ease-out);
}

.viewer-fade-enter-active .viewer-img {
  transition: transform var(--dur-slow, 380ms) var(--ease-spring, ease-out);
}

.viewer-fade-enter-from,
.viewer-fade-leave-to {
  opacity: 0;
}

.viewer-fade-enter-from .viewer-img {
  transform: scale(0.92);
}

@media (prefers-reduced-motion: reduce) {
  .viewer-fade-enter-active .viewer-img,
  .viewer-close {
    transition: none;
  }

  .viewer-fade-enter-from .viewer-img {
    transform: none;
  }
}
</style>
