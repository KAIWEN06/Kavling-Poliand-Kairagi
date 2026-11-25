<template>
  <ion-app>
    <ion-router-outlet />
    <ToastHost />
    <CelebrationHost />
    <ConfirmHost />
  </ion-app>
</template>

<script setup lang="ts">
import {
  IonApp,
  IonRouterOutlet,
  actionSheetController,
  alertController,
  modalController,
  popoverController,
  useIonRouter
} from '@ionic/vue'

import {
  nextTick,
  onMounted,
  onUnmounted
} from 'vue'

import router from './router'
import ToastHost from '@/components/ui/ToastHost.vue'
import CelebrationHost from '@/components/ui/CelebrationHost.vue'
import ConfirmHost from '@/components/ui/ConfirmHost.vue'
import { useConfirm } from '@/composables/useConfirm'
import { App as CapacitorApp } from '@capacitor/app'
const ionRouter = useIonRouter()

import {
  preloadLots
} from '@/services/siteplanService'

import siteplanImage
  from '@/assets/siteplan/Siteplan.webp'

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
      '[App Bootstrap] Data kaveling berhasil dipersiapkan.'
    )

  } catch (error) {

    console.error(
      '[App Bootstrap] Gagal preload data kaveling:',
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

/** Halaman beranda tiap role: tombol Back di sini menutup aplikasi. */
const ROOT_PATHS = new Set([
  '/home',
  '/welcome',
  '/login',
  '/beranda-admin',
  '/beranda-owner',
  '/beranda-marketing',
  '/beranda-kepala-marketing',
  '/beranda-client',
])

/** Menutup overlay teratas (menu pengguna, notifikasi, dialog) bila ada. */
async function dismissTopOverlay(): Promise<boolean> {
  const confirmDialog = useConfirm()
  if (confirmDialog.open.value) {
    confirmDialog.settle(false)
    return true
  }

  for (const controller of [
    alertController,
    actionSheetController,
    popoverController,
    modalController,
  ]) {
    const top = await controller.getTop()
    if (top) {
      await top.dismiss()
      return true
    }
  }
  return false
}

async function handleAndroidBackButton(): Promise<void> {
  // 1. Overlay terbuka: tutup dulu, jangan pindah halaman.
  if (await dismissTopOverlay()) return

  // 2. Halaman beranda / root: keluar aplikasi.
  if (ROOT_PATHS.has(router.currentRoute.value.path)) {
    await CapacitorApp.exitApp()
    return
  }

  // 3. Halaman turunan: kembali ke halaman sebelumnya.
  if (ionRouter.canGoBack()) {
    ionRouter.back()
    return
  }

  // 4. Tanpa riwayat: ke beranda bila tahu role-nya, selain itu tutup aplikasi.
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

    // Ditunda sampai idle agar splash dan layar pertama tidak bersaing
    // dengan unduhan siteplan (~1 MB) dan query kaveling.
    const idle = (
      window as unknown as {
        requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number
      }
    ).requestIdleCallback

    if (idle) {
      idle(() => void bootstrapApp(), { timeout: 4000 })
    } else {
      setTimeout(() => void bootstrapApp(), 1500)
    }

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