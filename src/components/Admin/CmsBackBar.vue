<template>
  <Transition name="cms-back">
    <div v-if="visible" class="cms-back" role="region" aria-label="Mode pratinjau Admin">
      <button class="cms-back__btn" type="button" @click="backToCms">
        <ion-icon :icon="arrowBackOutline" aria-hidden="true" />
        <span>Kembali ke Kelola Konten</span>
      </button>
    </div>
  </Transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { IonIcon } from '@ionic/vue'
import { arrowBackOutline } from 'ionicons/icons'
import { useCmsAdmin } from '@/composables/useCmsAdmin'

/** Muncul di halaman publik hanya saat Admin membukanya lewat "Lihat di website". */
const { isAdmin, fromCms, backToCms } = useCmsAdmin()
const visible = computed(() => fromCms.value && isAdmin.value)
</script>

<style scoped>
.cms-back {
  position: fixed;
  z-index: 10500; /* di atas tab bar (10000), di bawah modal (11000) */
  left: 12px;
  right: 12px;
  bottom: calc(86px + env(safe-area-inset-bottom));
  display: flex;
  justify-content: center;
  pointer-events: none;
}

.cms-back__btn {
  pointer-events: auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 18px 0 14px;
  border: 1px solid rgb(255 255 255 / 18%);
  border-radius: 999px;
  background: var(--surface-forest, #243d1e);
  color: var(--on-forest, #f4f1e8);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  box-shadow: 0 8px 24px rgb(37 37 37 / 28%);
  cursor: pointer;
}

.cms-back__btn ion-icon { font-size: 18px; }
.cms-back__btn:active { transform: scale(.97); }
.cms-back__btn:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 2px; }

.cms-back-enter-active, .cms-back-leave-active { transition: opacity 200ms ease, transform 200ms ease; }
.cms-back-enter-from, .cms-back-leave-to { opacity: 0; transform: translateY(12px); }

@media (min-width: 1024px) {
  .cms-back { left: calc(var(--sidebar-w, 0px) + 16px); right: auto; bottom: 24px; }
}

@media (prefers-reduced-motion: reduce) {
  .cms-back-enter-active, .cms-back-leave-active { transition: none; }
  .cms-back__btn:active { transform: none; }
}
</style>
