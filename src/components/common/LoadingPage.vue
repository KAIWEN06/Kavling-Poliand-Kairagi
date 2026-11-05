<template>

  <div
    class="loading-page"
    :class="{
      'loading-page--fullscreen': fullscreen
    }"
  >

    <!-- VIDEO -->

    <div class="loading-animation-box">

      <AppVideo
        class="loading-video"
        :src="loadingAnimation"
        :loop="true"
        aria-label="Animasi memuat aplikasi"
      />

    </div>


    <!-- TEXT -->

    <div class="loading-text">

      <h2>
        {{ title }}
      </h2>

      <p>
        {{ subtitle }}
      </p>

    </div>


    <!-- PROGRESS -->

    <div
      v-if="showProgress"
      class="progress-container"
    >

      <div class="progress-track">

        <div
          class="progress-fill"
          :style="{
            width: `${normalizedProgress}%`
          }"
        ></div>

      </div>

      <div class="progress-info">

        <span>
          {{ progressLabel }}
        </span>

        <span>
          {{ normalizedProgress }}%
        </span>

      </div>

    </div>

  </div>

</template>


<script setup lang="ts">

import {
  computed
} from 'vue'

import AppVideo
  from './AppVideo.vue'

import loadingAnimation
  from '@/assets/illustrations/memuat1.mp4'


interface Props {

  title?: string

  subtitle?: string

  progress?: number

  progressLabel?: string

  showProgress?: boolean

  fullscreen?: boolean

}


const props =
  withDefaults(
    defineProps<Props>(),
    {

      title:
        'Sedang Membangun Halaman',

      subtitle:
        'Kami sedang menyiapkan halaman ini agar lebih baik untuk kamu.',

      progress:
        0,

      progressLabel:
        'Memuat halaman...',

      showProgress:
        true,

      fullscreen:
        true

    }
  )


const normalizedProgress =
  computed(() => {

    return Math.min(
      100,
      Math.max(
        0,
        Math.round(
          props.progress
        )
      )
    )

  })

</script>


<style scoped>

.loading-page {

  box-sizing: border-box;

  width: 100%;

  min-height: 100%;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  text-align: center;

  background: #fafaf7;

  padding: 24px;

}


.loading-page--fullscreen {

  position: fixed;

  top: 0;

  left: 0;

  right: 0;

  bottom: 0;

  width: 100%;

  height: 100%;

  min-height: 100%;

  z-index: 999999;

}


/* =================================================
   VIDEO
   ================================================= */

.loading-animation-box {

  width: 260px;

  height: 220px;

  flex-shrink: 0;

  margin-bottom: 20px;

}


.loading-video {

  display: block;

  width: 100%;

  height: 100%;

}


/* =================================================
   TEXT
   ================================================= */

.loading-text {

  display: block;

  width: 100%;

  max-width: 420px;

  flex-shrink: 0;

  margin: 0;

  text-align: center;

}


.loading-text h2 {

  display: block;

  margin: 0;

  padding: 0;

  color: #1a1a1a;

  font-size: 20px;

  font-weight: 800;

  line-height: 1.3;

}


.loading-text p {

  display: block;

  margin: 8px 0 0;

  padding: 0;

  color: #777777;

  font-size: 13px;

  line-height: 1.6;

}


/* =================================================
   PROGRESS
   ================================================= */

.progress-container {

  display: block;

  width: 100%;

  max-width: 300px;

  flex-shrink: 0;

  margin-top: 22px;

}


.progress-track {

  display: block;

  width: 100%;

  height: 7px;

  overflow: hidden;

  border-radius: 999px;

  background: #e5e5e5;

}


.progress-fill {

  display: block;

  height: 100%;

  border-radius: 999px;

  background:
    linear-gradient(
      90deg,
      #b8860b,
      #d4af37,
      #f4e3b2
    );

  transition:
    width 0.3s ease;

}


.progress-info {

  display: flex;

  align-items: center;

  justify-content: space-between;

  width: 100%;

  margin-top: 8px;

  color: #888888;

  font-size: 11px;

}


/* =================================================
   MOBILE
   ================================================= */

@media (max-width: 480px) {

  .loading-page {

    padding: 20px 16px;

  }


  .loading-animation-box {

    width: 250px;

    height: 200px;

    margin-bottom: 18px;

  }


  .loading-text h2 {

    font-size: 19px;

  }


  .loading-text p {

    font-size: 13px;

  }


  .progress-container {

    max-width: 290px;

    margin-top: 20px;

  }

}


/* =================================================
   SHORT SCREEN
   ================================================= */

@media (max-height: 600px) {

  .loading-animation-box {

    width: 210px;

    height: 160px;

    margin-bottom: 14px;

  }


  .loading-text h2 {

    font-size: 17px;

  }


  .loading-text p {

    font-size: 12px;

    margin-top: 6px;

  }


  .progress-container {

    margin-top: 16px;

  }

}

</style>