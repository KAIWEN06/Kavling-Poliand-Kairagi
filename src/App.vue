<template>
  <ion-app>
    <ion-router-outlet />
  </ion-app>
</template>

<script setup lang="ts">
import {
  IonApp,
  IonRouterOutlet,
  useIonRouter
} from '@ionic/vue'

import {
  nextTick,
  onMounted,
  onUnmounted
} from 'vue'

import router from './router'
import { App as CapacitorApp } from '@capacitor/app'
const ionRouter = useIonRouter()

import {
  preloadLots
} from '@/services/siteplanService'

import siteplanImage
  from '@/assets/siteplan/Siteplan.png'

import siteplanSvg
  from '@/assets/siteplan/LOTS_WITH_ID.svg'

import iconsImage
  from '@/assets/icons/icons.png'


/* =========================================================
   WAIT
   ========================================================= */

function wait(
  milliseconds: number
): Promise<void> {

  return new Promise(
    (resolve) => {
      setTimeout(
        resolve,
        milliseconds
      )
    }
  )
}


/* =========================================================
   PRELOAD IMAGE
   ========================================================= */

function preloadImage(
  src: string
): Promise<void> {

  return new Promise(
    (resolve) => {

      const image =
        new Image()

      image.onload = () => {
        resolve()
      }

      image.onerror = () => {

        console.warn(
          '[App Bootstrap] Gagal preload image:',
          src
        )

        resolve()
      }

      image.src = src
    }
  )
}


/* =========================================================
   PRELOAD SVG
   ========================================================= */

async function preloadSvg(
  src: string
): Promise<void> {

  try {

    await fetch(
      src,
      {
        cache: 'force-cache'
      }
    )

  } catch (error) {

    console.warn(
      '[App Bootstrap] Gagal preload SVG:',
      error
    )
  }
}


/* =========================================================
   PREPARE ROUTER
   ========================================================= */

async function prepareRouter(): Promise<void> {

  try {

    await router.isReady()

  } catch (error) {

    console.error(
      '[App Bootstrap] Router gagal disiapkan:',
      error
    )
  }
}


/* =========================================================
   PRELOAD CRITICAL ASSETS
   ========================================================= */

async function preloadCriticalAssets(): Promise<void> {

  await Promise.all([

    preloadImage(
      siteplanImage
    ),

    preloadImage(
      iconsImage
    ),

    preloadSvg(
      siteplanSvg
    )

  ])
}


/* =========================================================
   PRELOAD APPLICATION DATA
   ========================================================= */

async function preloadApplicationData(): Promise<void> {

  try {

    await preloadLots()

    console.log(
      '[App Bootstrap] Data kavling berhasil dipersiapkan.'
    )

  } catch (error) {

    console.error(
      '[App Bootstrap] Gagal preload data kavling:',
      error
    )
  }
}


/* =========================================================
   BOOTSTRAP APP
   ========================================================= */

async function bootstrapApp(): Promise<void> {

  try {

    await prepareRouter()

    await preloadCriticalAssets()

    await preloadApplicationData()

    console.log(
      '[App Bootstrap] Aplikasi siap.'
    )

  } catch (error) {

    console.error(
      '[App Bootstrap] Bootstrap aplikasi gagal:',
      error
    )
  }
}

/* =========================================================
   ANDROID BACK BUTTON
   ========================================================= */

let backButtonListener: Awaited<
  ReturnType<typeof CapacitorApp.addListener>
> | null = null

async function handleAndroidBackButton(): Promise<void> {

  /*
   * Jika masih ada halaman sebelumnya,
   * kembali ke halaman tersebut.
   */
  if (ionRouter.canGoBack()) {

    ionRouter.back()

    return
  }

  /*
   * Tidak ada halaman sebelumnya.
   * Tutup aplikasi Android.
   */
  await CapacitorApp.exitApp()
}


/* =========================================================
   START
   ========================================================= */

onMounted(
  async () => {

    await nextTick()

    await wait(100)

    /*
     * Tangani tombol Back fisik / gesture Android.
     */
    backButtonListener =
      await CapacitorApp.addListener(
        'backButton',
        handleAndroidBackButton
      )

    /*
     * Bootstrap berjalan di background.
     *
     * SplashVideoPage tetap menjadi
     * halaman pertama yang terlihat.
     */

    void bootstrapApp()

  }
)

/* =========================================================
   CLEANUP
   ========================================================= */

onUnmounted(
  () => {

    backButtonListener?.remove()

    backButtonListener = null

  }
)
</script>