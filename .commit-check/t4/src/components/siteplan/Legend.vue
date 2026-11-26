<template>

  <div class="legend-control">

    <!-- LEGEND BUTTON -->
    <button
      class="mobile-legend-button"
      type="button"
      aria-label="Buka keterangan peta"
      :aria-expanded="isOpen"
      @click="toggleLegend"
    >
      <ion-icon
        :icon="informationCircleOutline"
      />
    </button>


    <!-- LEGEND PANEL -->
    <div
      v-if="isOpen"
      class="legend"
    >

      <div class="legend-title">
        Keterangan Peta
      </div>


      <div class="legend-row">

        <span
          class="legend-dot available"
        />

        <span>
          Tersedia
        </span>

      </div>


      <div class="legend-row">

        <span
          class="legend-dot booked"
        />

        <span>
          Dipesan
        </span>

      </div>


      <div class="legend-row">

        <span
          class="legend-dot sold"
        />

        <span>
          Terjual
        </span>

      </div>


      <div class="legend-divider" />


      <div class="legend-row">

        <span
          class="legend-bar road"
        />

        <span>
          Jalan Utama
        </span>

      </div>


      <div class="legend-row">

        <span
          class="legend-bar river"
        />

        <span>
          Sungai / Drainase
        </span>

      </div>


      <div class="legend-row">

        <span
          class="legend-bar green"
        />

        <span>
          RTH (Taman)
        </span>

      </div>

    </div>

  </div>

</template>


<script setup lang="ts">

import {
  IonIcon
} from '@ionic/vue'

import {
  informationCircleOutline
} from 'ionicons/icons'


/* =====================================================
   PROPS
   ===================================================== */

const props =
  defineProps<{
    isOpen: boolean
  }>()


/* =====================================================
   EMITS
   ===================================================== */

const emit =
  defineEmits<{
    (
      event: 'toggle'
    ): void
  }>()


/* =====================================================
   TOGGLE
   ===================================================== */

function toggleLegend() {

  emit('toggle')

}

</script>


<style scoped>
.legend-control {
  position: relative;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.mobile-legend-button {
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  margin: 0;
  background: rgba(255, 255, 255, 0.97);
  border: 1px solid #E5E5E5;
  border-radius: 12px;
  color: #1A1A1A;
  font-size: 21px;
  box-shadow: 0 8px 18px rgba(26, 26, 26, 0.14);
  cursor: pointer;
}

.mobile-legend-button:active {
  transform: scale(0.96);
}

/* =====================================================
   LEGEND PANEL POPUP
   ===================================================== */
.legend {
  position: absolute;
  right: calc(100% + 12px); /* Muncul di sebelah kiri tombol */
  bottom: 0; /* Sejajar dengan bagian bawah tombol Legend */
  width: 200px;
  max-width: calc(100vw - 80px);
  padding: 12px;
  background: rgba(255, 255, 255, 0.98);
  border: 1px solid #E5E5E5;
  border-radius: 14px;
  box-shadow: 0 12px 28px rgba(0, 0, 0, 0.18);
  backdrop-filter: blur(8px);
  -webkit-backdrop-filter: blur(8px);
  z-index: 999;
}

.legend-title {
  font-size: 11px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 8px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
}

.legend-row {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 4px 0;
  font-size: 12px;
  color: #4A4A4A;
}

.legend-dot,
.legend-bar {
  display: inline-block;
  flex: 0 0 auto;
}

.legend-dot {
  width: 10px;
  height: 10px;
  border-radius: 50%;
}

.legend-dot.available { background: #2E7D32; }
.legend-dot.booked { background: #F2A900; }
.legend-dot.sold { background: #D32F2F; }

.legend-bar {
  width: 16px;
  height: 4px;
  border-radius: 999px;
}

.legend-bar.road { background: #2D2D2D; }
.legend-bar.river { background: #2F6FEB; }
.legend-bar.green { background: #556B2F; }

.legend-divider {
  height: 1px;
  background: #E5E5E5;
  margin: 6px 0;
}
</style>