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
              Keterangan Siteplan
            </div>

            <div class="legend-subtitle">
              Status dan area siteplan
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
          STATUS KAVLING
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
                Kavling tersedia
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
                Kavling telah terjual
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
          AREA SITEPLAN
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
/* =====================================================
   CONTAINER
===================================================== */

.siteplan-legend {
  position: relative;
  left: auto;
  top: auto;
  width: 42px;
  height: 42px;

  z-index: 100;

  pointer-events: auto;
}


/* =====================================================
   TOGGLE BUTTON
===================================================== */

.legend-toggle {
  position: relative;

  display: flex;
  align-items: center;
  justify-content: center;

  width: 42px;
  height: 42px;

  padding: 0;

  border: 1px solid rgba(148, 163, 184, 0.45);

  border-radius: 12px;

  background:
    rgba(255, 255, 255, 0.94);

  color: #1f2937;

  box-shadow:
    0 8px 20px rgba(15, 23, 42, 0.12);

  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);

  cursor: pointer;

  touch-action: manipulation;

  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    background 160ms ease;
}

.legend-toggle ion-icon {
  font-size: 20px;
}

.legend-toggle:hover {
  background: #ffffff;

  box-shadow:
    0 10px 24px rgba(15, 23, 42, 0.16);

  transform: translateY(-1px);
}

.legend-toggle:active {
  transform: scale(0.94);
}


/* =====================================================
   LEGEND PANEL
===================================================== */

.legend {
  position: fixed;

  /* benar-benar di tengah viewport */
  left: 50%;
  top: 50%;

  /* center horizontal + vertical */
  transform: translate(-50%, -50%) scale(0.97);

  width: min(260px, calc(100vw - 32px));

  box-sizing: border-box;

  /* tetap aman kalau layar pendek */
  max-height: calc(100dvh - 32px);

  overflow-y: auto;
  overscroll-behavior: contain;

  padding: 15px;

  border: 1px solid rgba(148, 163, 184, 0.4);
  border-radius: 16px;

  background: rgba(255, 255, 255, 0.97);

  box-shadow:
    0 20px 45px rgba(15, 23, 42, 0.16),
    0 4px 12px rgba(15, 23, 42, 0.06);

  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);

  z-index: 99999;

  opacity: 0;
  visibility: hidden;

  transform-origin: center center;

  transition:
    opacity 200ms ease,
    transform 200ms ease,
    visibility 200ms ease;

  pointer-events: none;
}

.legend.open {
  opacity: 1;
  visibility: visible;

  transform:
    translate(-50%, -50%)
    scale(1);

  pointer-events: auto;
}

/* =====================================================
   HEADER
===================================================== */

.legend-header {
  display: flex;

  align-items: flex-start;
  justify-content: space-between;

  gap: 12px;

  margin-bottom: 14px;
}

.legend-heading {
  display: flex;

  align-items: center;

  gap: 10px;

  min-width: 0;
}

.legend-heading-icon {
  display: flex;

  align-items: center;
  justify-content: center;

  width: 34px;
  height: 34px;

  flex-shrink: 0;

  border-radius: 10px;

  background: #f3f4f6;

  color: #374151;
}

.legend-heading-icon ion-icon {
  font-size: 18px;
}

.legend-title {
  font-size: 13px;

  font-weight: 700;

  line-height: 1.3;

  color: #111827;
}

.legend-subtitle {
  margin-top: 2px;

  font-size: 10px;

  line-height: 1.3;

  color: #9ca3af;
}


/* =====================================================
   CLOSE BUTTON
===================================================== */

.legend-close {
  display: flex;

  align-items: center;
  justify-content: center;

  width: 28px;
  height: 28px;

  flex-shrink: 0;

  padding: 0;

  border: 0;

  border-radius: 8px;

  background: transparent;

  color: #6b7280;

  cursor: pointer;

  transition:
    background 160ms ease,
    color 160ms ease;
}

.legend-close ion-icon {
  font-size: 17px;
}

.legend-close:hover {
  background: #f3f4f6;

  color: #111827;
}


/* =====================================================
   SECTION
===================================================== */

.legend-section {
  width: 100%;
}

.section-label {
  margin-bottom: 7px;

  font-size: 9px;

  font-weight: 700;

  line-height: 1.2;

  letter-spacing: 0.1em;

  color: #9ca3af;
}


/* =====================================================
   LEGEND LIST
===================================================== */

.legend-list {
  display: flex;

  flex-direction: column;

  gap: 3px;
}

.legend-item {
  display: flex;

  align-items: center;

  gap: 10px;

  padding: 7px 8px;

  border-radius: 9px;

  transition:
    background 150ms ease;
}

.legend-item:hover {
  background: #f8fafc;
}


/* =====================================================
   STATUS INDICATOR
===================================================== */

.legend-indicator {
  width: 11px;
  height: 11px;

  flex-shrink: 0;

  border-radius: 50%;

  box-shadow:
    0 0 0 3px rgba(148, 163, 184, 0.08);
}

.status-available {
  background: #22c55e;
}

.status-booked {
  background: #facc15;
}

.status-sold {
  background: #ef4444;
}


/* =====================================================
   ITEM CONTENT
===================================================== */

.legend-item-content {
  display: flex;

  flex-direction: column;

  gap: 1px;

  min-width: 0;
}

.legend-item-title {
  font-size: 12px;

  font-weight: 600;

  line-height: 1.3;

  color: #374151;
}

.legend-item-description {
  font-size: 10px;

  line-height: 1.3;

  color: #9ca3af;
}


/* =====================================================
   DIVIDER
===================================================== */

.legend-divider {
  width: 100%;

  height: 1px;

  margin: 12px 0;

  background:
    #e5e7eb;
}


/* =====================================================
   SITEPLAN AREA
===================================================== */

.legend-list.compact {
  gap: 1px;
}

.compact-item {
  padding: 6px 8px;
}

.legend-line {
  display: block;

  width: 20px;
  height: 4px;

  flex-shrink: 0;

  border-radius: 999px;
}

.road {
  background: #2b2b2b;
}

.drainage {
  background: #0ea5e9;
}

.green-area {
  background: #15803d;
}


/* =====================================================
   RESPONSIVE
===================================================== */

@media (max-width: 480px) {
  .legend {
    width: min(
      245px,
      calc(100vw - 80px)
    );

    /*
     * Sisakan ruang untuk bottom navigation.
     */
    max-height: calc(
      100dvh - var(--tabbar-space) - 24px
    );

    /*
     * Pastikan panel tidak keluar
     * dari sisi kiri layar.
     */
    right: calc(var(--map-edge) + 52px);
  }

  .legend-toggle {
    width: 42px;
    height: 42px;
  }
}


/* =====================================================
   DESKTOP
===================================================== */

@media (min-width: 768px) {
  .legend {
    max-height: calc(100dvh - 100px);
  }
}

/* =====================================================
   REDUCED MOTION
===================================================== */

@media (prefers-reduced-motion: reduce) {
  .legend,
  .legend-toggle,
  .legend-close,
  .legend-item {
    transition: none;
  }
}
</style>