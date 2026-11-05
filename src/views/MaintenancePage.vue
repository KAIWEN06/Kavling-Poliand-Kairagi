<template>

  <ion-page>

    <ion-content
      class="maintenance-content"
      :fullscreen="true"
    >

      <div class="maintenance-container">


        <!-- =================================================
             VIDEO
             ================================================= -->

        <div class="video-container">

          <AppVideo
            class="maintenance-video"
            :src="maintenanceVideo"
            :loop="true"
            aria-label="Ilustrasi Sedang Dalam Pengembangan"
          />

        </div>


        <!-- =================================================
             TEXT
             ================================================= -->

        <div class="text-wrapper">

          <h1>
            Sedang Dalam Pengembangan
          </h1>

          <p>
            Halaman ini sedang kami siapkan
            agar dapat memberikan pengalaman
            terbaik untuk kamu.
          </p>

        </div>


        <!-- =================================================
             ACTION
             ================================================= -->

        <div class="action-wrapper">

          <ion-button
            expand="block"
            class="back-button"
            @click="goToHome"
          >
            Kembali ke Beranda
          </ion-button>

        </div>


      </div>

    </ion-content>

  </ion-page>

</template>


<script setup lang="ts">

import {
  IonPage,
  IonContent,
  IonButton
} from '@ionic/vue'

import {
  useRouter
} from 'vue-router'


/* =========================================================
   COMPONENTS
   ========================================================= */

import AppVideo
  from '@/components/common/AppVideo.vue'


/* =========================================================
   LOCAL VIDEO
   ========================================================= */

import maintenanceVideo
  from '@/assets/illustrations/perbaikan.mp4'


/* =========================================================
   ROUTER
   ========================================================= */

const router =
  useRouter()


/* =========================================================
   HOME
   ========================================================= */

function goToHome(): void {

  router.push('/home')

}

</script>


<style scoped>

/* =========================================================
   CONTENT
   ========================================================= */

.maintenance-content {

  --background: #ffffff;

  --padding-top: 0;
  --padding-bottom: 0;

  overflow-y: auto;

}


/* =========================================================
   CONTAINER
   ========================================================= */

.maintenance-container {

  box-sizing: border-box;

  width: 100%;

  min-height: 100%;

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  text-align: center;

  padding:
    24px
    20px
    calc(
      32px +
      env(safe-area-inset-bottom)
    );

  max-width: 600px;

  margin: 0 auto;

  background: #ffffff;

}


/* =========================================================
   VIDEO CONTAINER
   ========================================================= */

.video-container {

  position: relative;

  z-index: 1;

  flex-shrink: 0;

  width: min(
    100%,
    380px
  );

  height: 220px;

  overflow: hidden;

  background: #ffffff;

}


/* =========================================================
   VIDEO
   ========================================================= */

.maintenance-video {

  position: absolute;

  top: 50%;
  left: 50%;

  width: 100%;
  height: 100%;

  transform:
    translate(-50%, -50%)
    scaleX(1.42);

  display: block;

  object-fit: fill;

  background: transparent;

  pointer-events: none;

  user-select: none;

}


/* =========================================================
   TEXT
   ========================================================= */

.text-wrapper {

  position: relative;

  z-index: 5;

  flex-shrink: 0;

  width: 100%;

  margin-top: 16px;

  margin-bottom: 20px;

  display: block;

  visibility: visible;

  opacity: 1;

}


.text-wrapper h1 {

  margin: 0;

  color: #1a1a1a;

  font-size: 22px;

  font-weight: 800;

  line-height: 1.3;

}


.text-wrapper p {

  max-width: 420px;

  margin: 10px auto 0;

  color: #777777;

  font-size: 14px;

  line-height: 1.6;

}


/* =========================================================
   ACTION
   ========================================================= */

.action-wrapper {

  position: relative;

  z-index: 20;

  flex-shrink: 0;

  width: 100%;

  max-width: 280px;

  display: block;

  visibility: visible;

  opacity: 1;

}


/* =========================================================
   BUTTON
   ========================================================= */

.back-button {

  --background: #D4AF37;

  --background-hover: #333333;

  --background-activated: #000000;

  --color: #ffffff;

  --border-radius: 12px;

  width: 100%;

  min-height: 48px;

  margin: 0;

  font-size: 14px;

  font-weight: 700;

  text-transform: none;

}


/* =========================================================
   MOBILE
   ========================================================= */

@media (max-width: 480px) {

  .maintenance-container {

    min-height: 100%;

    justify-content: center;

    padding:
      20px
      16px
      calc(
        28px +
        env(safe-area-inset-bottom)
      );

  }


  .video-container {

    width: 100%;

    max-width: 340px;

    height: 190px;

  }


  .text-wrapper {

    margin-top: 12px;

    margin-bottom: 18px;

  }


  .text-wrapper h1 {

    font-size: 20px;

  }


  .text-wrapper p {

    font-size: 13px;

    line-height: 1.5;

  }


  .action-wrapper {

    width: 100%;

    max-width: 280px;

  }

}


/* =========================================================
   SMALL SCREEN
   ========================================================= */

@media (max-width: 360px) {

  .maintenance-container {

    padding-top: 16px;

    padding-bottom:
      calc(
        24px +
        env(safe-area-inset-bottom)
      );

  }


  .video-container {

    height: 160px;

  }


  .text-wrapper {

    margin-top: 10px;

    margin-bottom: 16px;

  }


  .text-wrapper h1 {

    font-size: 19px;

  }


  .text-wrapper p {

    font-size: 12px;

  }


  .back-button {

    min-height: 46px;

    font-size: 13px;

  }

}


/* =========================================================
   SHORT SCREEN
   ========================================================= */

@media (max-height: 520px) {

  .maintenance-container {

    justify-content: flex-start;

    padding-top: 12px;

    padding-bottom:
      calc(
        20px +
        env(safe-area-inset-bottom)
      );

  }


  .video-container {

    height: 140px;

  }


  .text-wrapper {

    margin-top: 8px;

    margin-bottom: 12px;

  }


  .text-wrapper h1 {

    font-size: 18px;

  }


  .text-wrapper p {

    margin-top: 6px;

    font-size: 12px;

  }


  .back-button {

    min-height: 44px;

  }

}

</style>