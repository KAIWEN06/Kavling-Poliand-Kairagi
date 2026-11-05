<template>
  <div class="panorama-viewer">

    <!-- =====================================================
         PHOTO SPHERE VIEWER
    ====================================================== -->

    <div
      ref="viewerContainer"
      class="viewer-container"
    ></div>


    <!-- =====================================================
         TOP BAR
    ====================================================== -->

    <div
      class="top-overlay"
      :class="deviceOrientation"
    >

      <!-- LEFT : BACK + LOT INFO -->

      <div class="lot-info-wrapper">

        <!-- BACK BUTTON -->

        <button
          class="back-button"
          type="button"
          aria-label="Kembali"
          @click="handleBack"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M15 18L9 12L15 6"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
            />
          </svg>
        </button>


        <!-- LOT INFORMATION -->

        <div class="lot-info">

          <div class="lot-number">
            KAVLING {{ lotNumber }}
          </div>

          <div class="lot-status">

            <span
              class="status-dot"
              :style="{
                backgroundColor: statusColor
              }"
            ></span>

            <span>
              Status:
            </span>

            <span
              class="status-value"
              :style="{
                color: statusColor
              }"
            >
              {{ status }}
            </span>

          </div>

        </div>

      </div>


      <!-- RIGHT : GYRO -->

      <button
        class="gyro-button"
        :class="{
          active: gyroEnabled
        }"
        type="button"
        @click="toggleGyro"
      >

        <!-- GYRO ICON -->

        <svg
          viewBox="0 0 24 24"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          <circle
            cx="12"
            cy="12"
            r="7"
            stroke="currentColor"
            stroke-width="1.8"
          />

          <path
            d="M12 5V2"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />

          <path
            d="M12 22V19"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />

          <path
            d="M5 12H2"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />

          <path
            d="M22 12H19"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
          />

          <circle
            cx="12"
            cy="12"
            r="2"
            fill="currentColor"
          />
        </svg>

        <span>
          {{
            gyroEnabled
              ? 'Giroskop Aktif'
              : 'Giroskop Nonaktif'
          }}
        </span>

      </button>

    </div>


    <!-- =====================================================
         LOADING
    ====================================================== -->

    <div
      v-if="isLoading"
      class="viewer-loading"
    >

      <div class="viewer-loader"></div>

      <span>
        Memuat panorama...
      </span>

    </div>


    <!-- =====================================================
         ERROR
    ====================================================== -->

    <div
      v-if="hasError"
      class="viewer-error"
    >

      <div class="viewer-error-icon">
        !
      </div>

      <span>
        Gagal memuat panorama
      </span>

    </div>

  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  onMounted,
  onBeforeUnmount
} from 'vue'

import {
  Viewer
} from '@photo-sphere-viewer/core'

import {
  GyroscopePlugin
} from '@photo-sphere-viewer/gyroscope-plugin'

import '@photo-sphere-viewer/core/index.css'

/*
 * =========================================================
 * PROPS
 * =========================================================
 */

interface Props {
  panoramaUrl: string
  lotNumber: string
  status: string
  statusColor: string
}

const props = defineProps<Props>()


/*
 * =========================================================
 * EVENTS
 * =========================================================
 */

const emit = defineEmits<{
  back: []
  gyroChange: [enabled: boolean]
}>()


/*
 * =========================================================
 * REFS
 * =========================================================
 */

const viewerContainer =
  ref<HTMLElement | null>(null)

const viewer =
  ref<Viewer | null>(null)

const gyroEnabled =
  ref(false)

const isLoading =
  ref(true)

const hasError =
  ref(false)

const deviceAngle = ref(0)

const deviceOrientation = computed(() => {
  return Math.abs(deviceAngle.value) === 90
    ? 'landscape'
    : 'portrait'
})

function updateDeviceOrientation() {
  const screenAngle =
    typeof window !== 'undefined' && window.screen?.orientation
      ? Number(window.screen.orientation.angle || 0)
      : window.innerWidth > window.innerHeight
        ? 90
        : 0

  deviceAngle.value = [0, 90, 180, 270].includes(screenAngle)
    ? screenAngle
    : 0
}


/*
 * =========================================================
 * CREATE VIEWER
 * =========================================================
 */

function createViewer() {

  if (!viewerContainer.value) {
    return
  }

  if (!props.panoramaUrl) {
    hasError.value = true
    isLoading.value = false
    return
  }

  try {

    isLoading.value = true
    hasError.value = false

    /*
     * ================================================
     * PHOTO SPHERE VIEWER
     * ================================================
     */

    const instance = new Viewer({

      container:
        viewerContainer.value,

      panorama:
        props.panoramaUrl,

      navbar: [
        'zoom',
        'move',
        'fullscreen'
      ],

      defaultZoomLvl: 0,

      loadingImg: undefined,

      plugins: [
        [
          GyroscopePlugin,
          {}
        ]
      ]

    })

    viewer.value = instance


    /*
     * ================================================
     * READY
     * ================================================
     */

    instance.addEventListener(
      'ready',
      () => {

        isLoading.value = false

        console.log(
          '[PanoramaViewer] Ready'
        )

      }
    )


    /*
     * ================================================
     * PANORAMA LOADED
     * ================================================
     */

    instance.addEventListener(
      'panorama-loaded',
      () => {

        isLoading.value = false

      }
    )


    /*
     * ================================================
     * ERROR
     * ================================================
     */

    instance.addEventListener(
      'panorama-error',
      (event: any) => {

        console.error(
          '[PanoramaViewer] Panorama error:',
          event
        )

        isLoading.value = false
        hasError.value = true

      }
    )

  } catch (error) {

    console.error(
      '[PanoramaViewer] Failed:',
      error
    )

    isLoading.value = false
    hasError.value = true

  }
}


/*
 * =========================================================
 * BACK
 * =========================================================
 */

function handleBack() {

  /*
   * Matikan gyro terlebih dahulu
   * jika sedang aktif.
   */

  if (gyroEnabled.value) {

    try {

      const gyro =
        viewer.value?.getPlugin<GyroscopePlugin>(
          GyroscopePlugin
        )

      gyro?.stop()

    } catch (error) {

      console.warn(
        '[PanoramaViewer] Failed stopping gyro:',
        error
      )

    }

    gyroEnabled.value = false
  }

  emit('back')
}


/*
 * =========================================================
 * TOGGLE GYROSCOPE
 * =========================================================
 */

async function toggleGyro() {

  if (!viewer.value) {
    return
  }

  try {

    const gyro =
      viewer.value.getPlugin<GyroscopePlugin>(
        GyroscopePlugin
      )

    /*
     * ================================================
     * TURN OFF
     * ================================================
     */

    if (gyroEnabled.value) {

      gyro.stop()

      gyroEnabled.value = false

      emit(
        'gyroChange',
        false
      )

      return
    }


    /*
     * ================================================
     * TURN ON
     * ================================================
     */

    if (!gyro.isSupported()) {

      alert(
        'Giroskop tidak didukung pada perangkat ini.'
      )

      return
    }

    await gyro.start()

    gyroEnabled.value = true

    emit(
      'gyroChange',
      true
    )

  } catch (error) {

    console.error(
      '[PanoramaViewer] Gyroscope error:',
      error
    )

    gyroEnabled.value = false

    alert(
      'Giroskop tidak dapat digunakan. Pastikan izin sensor telah diberikan oleh perangkat.'
    )

  }
}


/*
 * =========================================================
 * MOUNT
 * =========================================================
 */

onMounted(() => {

  updateDeviceOrientation()

  window.addEventListener(
    'resize',
    updateDeviceOrientation
  )

  window.screen?.orientation?.addEventListener(
    'change',
    updateDeviceOrientation
  )

  createViewer()

})


/*
 * =========================================================
 * CLEANUP
 * =========================================================
 */

onBeforeUnmount(() => {

  window.removeEventListener(
    'resize',
    updateDeviceOrientation
  )

  window.screen?.orientation?.removeEventListener(
    'change',
    updateDeviceOrientation
  )

  if (gyroEnabled.value) {

    try {

      const gyro =
        viewer.value?.getPlugin<GyroscopePlugin>(
          GyroscopePlugin
        )

      gyro?.stop()

    } catch (error) {

      console.warn(
        '[PanoramaViewer] Gyro cleanup error:',
        error
      )

    }

  }

  if (viewer.value) {

    try {

      viewer.value.destroy()

    } catch (error) {

      console.warn(
        '[PanoramaViewer] Destroy error:',
        error
      )

    }

    viewer.value = null
  }

})
</script>


<style scoped>

/* =========================================================
   ROOT
========================================================= */

.panorama-viewer {

  position: relative;

  width: 100%;
  height: 100%;

  overflow: hidden;

  background: #020617;
}


/* =========================================================
   VIEWER
========================================================= */

.viewer-container {

  position: absolute;

  inset: 0;

  width: 100%;
  height: 100%;
}


/* =========================================================
   TOP OVERLAY
========================================================= */

.top-overlay {

  position: absolute;

  top: max(14px, env(safe-area-inset-top));
  left: 14px;
  right: 14px;

  z-index: 100;

  display: flex;

  align-items: flex-start;

  justify-content: space-between;

  pointer-events: none;
}

.top-overlay.landscape {
  align-items: center;
  gap: 16px;
}

.top-overlay.landscape .lot-info-wrapper {
  max-width: calc(100% - 190px);
}

.top-overlay.landscape .lot-info {
  min-width: 0;
}


/* =========================================================
   LEFT GROUP
========================================================= */

.lot-info-wrapper {

  display: flex;

  align-items: stretch;

  gap: 0;

  pointer-events: auto;

  filter:
    drop-shadow(
      0 6px 14px
      rgba(15, 23, 42, .25)
    );
}


/* =========================================================
   BACK BUTTON
========================================================= */

.back-button {

  width: 44px;
  min-width: 44px;

  height: 47px;

  display: flex;

  align-items: center;
  justify-content: center;

  border: none;

  border-radius:
    14px 0 0 14px;

  background:
    rgba(30, 41, 59, .94);

  color: #cbd5e1;

  cursor: pointer;

  -webkit-tap-highlight-color:
    transparent;
}

.back-button svg {

  width: 21px;
  height: 21px;
}

.back-button:active {

  background:
    rgba(51, 65, 85, .98);

  transform: scale(.98);
}


/* =========================================================
   LOT INFO
========================================================= */

.lot-info {

  min-width: 130px;

  height: 47px;

  padding:
    7px 13px 7px 10px;

  display: flex;

  flex-direction: column;

  justify-content: center;

  border-radius:
    0 14px 14px 0;

  background:
    rgba(30, 41, 59, .94);

  color: white;
}


/* =========================================================
   LOT NUMBER
========================================================= */

.lot-number {

  font-size: 12px;

  font-weight: 800;

  letter-spacing: .2px;

  line-height: 15px;

  white-space: nowrap;
}


/* =========================================================
   STATUS
========================================================= */

.lot-status {

  display: flex;

  align-items: center;

  gap: 4px;

  margin-top: 1px;

  font-size: 9px;

  line-height: 11px;

  color: #94a3b8;

  white-space: nowrap;
}

.status-dot {

  width: 5px;
  height: 5px;

  border-radius: 50%;

  flex-shrink: 0;
}

.status-value {

  font-weight: 700;
}


/* =========================================================
   GYRO BUTTON
========================================================= */

.gyro-button {

  min-height: 42px;

  display: flex;

  align-items: center;
  justify-content: center;

  gap: 7px;

  padding:
    0 13px;

  border: none;

  border-radius: 11px;

  background:
    rgba(30, 41, 59, .94);

  color: #e2e8f0;

  box-shadow:
    0 6px 14px
    rgba(15, 23, 42, .25);

  font-size: 11px;

  font-weight: 700;

  cursor: pointer;

  pointer-events: auto;

  -webkit-tap-highlight-color:
    transparent;

  transition:
    background .2s ease,
    color .2s ease,
    transform .15s ease;
}

.gyro-button svg {

  width: 18px;
  height: 18px;

  flex-shrink: 0;
}

.gyro-button:active {

  transform: scale(.96);
}


/* =========================================================
   GYRO ACTIVE
========================================================= */

.gyro-button.active {

  background:
    #16a34a;

  color: white;

  box-shadow:
    0 6px 18px
    rgba(22, 163, 74, .35);
}


/* =========================================================
   LOADING
========================================================= */

.viewer-loading {

  position: absolute;

  inset: 0;

  z-index: 90;

  display: flex;

  flex-direction: column;

  align-items: center;
  justify-content: center;

  gap: 12px;

  background:
    rgba(2, 6, 23, .8);

  color: white;

  font-size: 13px;

  pointer-events: none;
}

.viewer-loader {

  width: 32px;
  height: 32px;

  border:
    3px solid
    rgba(255,255,255,.2);

  border-top-color:
    white;

  border-radius: 50%;

  animation:
    spin .8s linear infinite;
}


/* =========================================================
   ERROR
========================================================= */

.viewer-error {

  position: absolute;

  inset: 0;

  z-index: 95;

  display: flex;

  align-items: center;
  justify-content: center;

  flex-direction: column;

  gap: 10px;

  background:
    rgba(2, 6, 23, .85);

  color: white;

  font-size: 14px;
}

.viewer-error-icon {

  width: 40px;
  height: 40px;

  display: flex;

  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background:
    rgba(239,68,68,.15);

  color:
    #ef4444;

  font-weight: 800;

  font-size: 20px;
}


/* =========================================================
   MOBILE
========================================================= */

@media (max-width: 480px) {

  .top-overlay {

    top: max(12px, env(safe-area-inset-top));

    left: 12px;
    right: 12px;
  }

  .lot-info {

    min-width: 125px;

    height: 44px;

    padding:
      6px 10px;
  }

  .back-button {

    width: 42px;
    min-width: 42px;

    height: 44px;
  }

  .lot-number {

    font-size: 11px;
  }

  .lot-status {

    font-size: 8px;
  }

  .gyro-button {

    height: 40px;

    min-height: 40px;

    padding:
      0 10px;

    font-size: 10px;

    gap: 5px;
  }

  .gyro-button svg {

    width: 16px;
    height: 16px;
  }

}


/* =========================================================
   VERY SMALL SCREEN
========================================================= */

@media (max-width: 360px) {

  .top-overlay {

    left: 8px;
    right: 8px;

    top: 8px;
  }

  .lot-info {

    min-width: 112px;
  }

  .gyro-button span {

    font-size: 9px;
  }

  .top-overlay.landscape {
    gap: 8px;
  }

  .top-overlay.landscape .lot-info-wrapper {
    max-width: calc(100% - 150px);
  }

  .top-overlay.landscape .gyro-button {
    padding: 0 8px;
  }

}

@keyframes spin {

  to {
    transform: rotate(360deg);
  }

}

</style>