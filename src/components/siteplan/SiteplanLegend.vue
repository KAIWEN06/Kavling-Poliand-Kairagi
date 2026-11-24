<template>
  <div
    class="siteplan-legend"
    @pointerdown.stop
    @pointermove.stop
    @pointerup.stop
    @click.stop
  >
    <!-- Legend Toggle -->
    <button
      class="legend-toggle"
      type="button"
      :aria-label="
        isOpen
          ? 'Sembunyikan legenda'
          : 'Tampilkan legenda'
      "
      :title="
        isOpen
          ? 'Sembunyikan legenda'
          : 'Tampilkan legenda'
      "
      @click="$emit('toggle')"
    >
      <ion-icon
        :icon="layersOutline"
        aria-hidden="true"
      />
    </button>

    <!-- Legend Panel -->
    <section
      class="legend"
      :class="{ open: isOpen }"
      :aria-hidden="!isOpen"
      aria-labelledby="siteplan-legend-title"
    >
      <!-- Header -->
      <div class="legend-header">
        <div class="legend-heading">
          <span class="legend-heading-icon">
            <ion-icon
              :icon="layersOutline"
              aria-hidden="true"
            />
          </span>

          <div>
            <div
              id="siteplan-legend-title"
              class="legend-title"
            >
              Keterangan denah
            </div>

            <div class="legend-subtitle">
              Status kaveling dan area
            </div>
          </div>
        </div>

        <button
          class="legend-close"
          type="button"
          aria-label="Sembunyikan legenda"
          title="Sembunyikan legenda"
          @click="$emit('toggle')"
        >
          <ion-icon
            :icon="closeOutline"
            aria-hidden="true"
          />
        </button>
      </div>

      <!-- Status Kavling -->
      <div class="legend-section">
        <div class="section-label">
          Status kaveling
        </div>

        <div class="legend-list">
          <div class="legend-item">
            <span
              class="legend-indicator status-available"
              aria-hidden="true"
            ></span>

            <div class="legend-item-content">
              <span class="legend-item-title">
                Tersedia
              </span>

              <span class="legend-item-description">
                Kaveling tersedia
              </span>
            </div>
          </div>

          <div class="legend-item">
            <span
              class="legend-indicator status-booked"
              aria-hidden="true"
            ></span>

            <div class="legend-item-content">
              <span class="legend-item-title">
                Dipesan
              </span>

              <span class="legend-item-description">
                Sedang dalam proses pemesanan
              </span>
            </div>
          </div>

          <div class="legend-item">
            <span
              class="legend-indicator status-sold"
              aria-hidden="true"
            ></span>

            <div class="legend-item-content">
              <span class="legend-item-title">
                Terjual
              </span>

              <span class="legend-item-description">
                Kaveling telah terjual
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Divider -->
      <div class="legend-divider"></div>

      <!-- Area Siteplan -->
      <div class="legend-section">
        <div class="section-label">
          Area denah
        </div>

        <div class="legend-list compact">
          <div class="legend-item compact-item">
            <span
              class="legend-line road"
              aria-hidden="true"
            ></span>

            <span class="legend-item-title">
              Jalan Utama
            </span>
          </div>

          <div class="legend-item compact-item">
            <span
              class="legend-line drainage"
              aria-hidden="true"
            ></span>

            <span class="legend-item-title">
              Sungai / Drainase
            </span>
          </div>

          <div class="legend-item compact-item">
            <span
              class="legend-line green-area"
              aria-hidden="true"
            ></span>

            <span class="legend-item-title">
              RTH / Taman
            </span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'

import {
  closeOutline,
  layersOutline
} from 'ionicons/icons'

defineProps<{
  isOpen: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>

<style scoped>
/* Wadah tombol legenda */
.siteplan-legend {
  position: relative;
  left: auto;
  top: auto;
  width: 44px;
  height: 44px;
  z-index: 100;
  pointer-events: auto;
}

/* Tombol buka */
.legend-toggle {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 44px;
  height: 44px;
  padding: 0;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: 14px;
  background: rgba(255, 255, 255, 0.96);
  color: var(--poliland-green, #355a2c);
  box-shadow: var(--shadow-md);
  -webkit-backdrop-filter: blur(12px);
  backdrop-filter: blur(12px);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-base, 200ms) var(--ease-spring, cubic-bezier(0.34, 1.56, 0.64, 1));
}
.legend-toggle ion-icon { font-size: 22px; }
.legend-toggle:active { transform: scale(0.94); }
.legend-toggle:focus-visible,
.legend-close:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 2px; }

/* Panel di tengah layar */
.legend {
  position: fixed;
  left: 50%;
  top: 50%;
  transform: translate(-50%, -50%) scale(0.97);
  width: min(300px, calc(100vw - 32px));
  box-sizing: border-box;
  max-height: calc(100dvh - 32px);
  overflow-y: auto;
  overscroll-behavior: contain;
  padding: 18px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: rgba(255, 255, 255, 0.98);
  box-shadow: var(--shadow-lg);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  z-index: 99999;
  opacity: 0;
  visibility: hidden;
  transform-origin: center center;
  transition: opacity 200ms var(--ease-out, ease), transform 200ms var(--ease-out, ease), visibility 200ms;
  pointer-events: none;
}
.legend.open {
  opacity: 1;
  visibility: visible;
  transform: translate(-50%, -50%) scale(1);
  pointer-events: auto;
}

/* Kepala */
.legend-header { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.legend-heading { display: flex; align-items: center; gap: 12px; min-width: 0; }
.legend-heading-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: var(--green-100, #e8eee4);
  color: var(--poliland-green, #355a2c);
}
.legend-heading-icon ion-icon { font-size: 21px; }
.legend-title {
  color: var(--text-primary, #252525);
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: 19px;
  font-weight: 650;
  line-height: 1.2;
  letter-spacing: -0.01em;
}
.legend-subtitle { margin-top: 2px; color: var(--text-secondary, #5f5f66); font-size: 13px; line-height: 1.35; }

.legend-close {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 44px;
  height: 44px;
  margin: -6px -8px 0 0;
  padding: 0;
  border: 0;
  border-radius: 12px;
  background: transparent;
  color: var(--text-secondary, #5f5f66);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background 160ms ease;
}
.legend-close ion-icon { font-size: 22px; }
.legend-close:active { background: var(--surface-sunken, #f0ede5); }

/* Bagian */
.legend-section { width: 100%; }
.section-label {
  margin-bottom: 8px;
  color: var(--poliland-gold-text, #805708);
  font: 800 12px/1.2 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
.legend-list { display: flex; flex-direction: column; gap: 2px; }
.legend-item { display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 6px 8px; border-radius: 12px; }
.legend-indicator { width: 14px; height: 14px; flex-shrink: 0; border-radius: 50%; box-shadow: 0 0 0 4px rgba(53, 90, 44, 0.08); }
.status-available { background: #2e7d32; }
.status-booked { background: #f2a900; }
.status-sold { background: #d32f2f; }

.legend-item-content { display: flex; flex-direction: column; gap: 1px; min-width: 0; }
.legend-item-title { color: var(--text-primary, #252525); font-size: 15px; font-weight: 700; line-height: 1.3; }
.legend-item-description { color: var(--text-secondary, #5f5f66); font-size: 13px; line-height: 1.35; }

.legend-divider { width: 100%; height: 1px; margin: 12px 0; background: var(--border-default, #eae7e0); }

.legend-list.compact { gap: 0; }
.compact-item { min-height: 44px; }
.legend-line { display: block; flex-shrink: 0; width: 24px; height: 5px; border-radius: 999px; }
.road { background: #2b2b2b; }
.drainage { background: #0ea5e9; }
.green-area { background: #15803d; }

@media (max-width: 480px) {
  .legend {
    width: min(300px, calc(100vw - 48px));
    max-height: calc(100dvh - var(--tabbar-space) - 24px);
    right: calc(var(--map-edge) + 52px);
  }
}
@media (min-width: 768px) {
  .legend { max-height: calc(100dvh - 100px); }
}
@media (prefers-reduced-motion: reduce) {
  .legend,
  .legend-toggle,
  .legend-close { transition: none; }
  .legend-toggle:active { transform: none; }
}
</style>
