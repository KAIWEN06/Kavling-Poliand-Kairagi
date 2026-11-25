<template>
  <ion-page>
    <div class="splash-container">
      <img
        :src="currentFrame"
        class="splash-frame"
        alt=""
        draggable="false"
      />
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { IonPage } from '@ionic/vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { warmWelcomeMascot } from '@/utils/welcomeMascot'

const router = useRouter()

/* ================================
   FRAME ANIMATION
================================ */

const FRAME_COUNT = 100

const frames = Array.from(
  { length: FRAME_COUNT },
  (_, index) => {
    const number = String(index + 1).padStart(4, '0')

    return `/mascot-frames/poliland-splash/frame-${number}.webp`
  }
)

const currentFrameIndex = ref(0)

const currentFrame = computed(() => {
  return frames[currentFrameIndex.value]
})

/*
 * 100ms = 10 FPS
 *
 * Kalau animasinya terlalu lambat:
 * 80ms = 12.5 FPS
 * 60ms = 16.6 FPS
 * 50ms = 20 FPS
 */
const FRAME_DURATION = 40

let animationTimer: number | null = null

/* ================================
   PRELOAD
================================ */

// Frame yang wajib siap sebelum mulai; sisanya menyusul selagi animasi berjalan.
const START_BUFFER = 15

const frameReady: boolean[] = []

const preloadFrames = () =>
  frames.map(
    (src, index) =>
      new Promise<void>((resolve) => {
        const image = new Image()

        const done = () => {
          frameReady[index] = true
          resolve()
        }

        image.onload = done

        image.onerror = () => {
          console.warn('Frame gagal dimuat:', src)
          done()
        }

        image.src = src
      }),
  )

/* ================================
   ANIMATION
================================ */

const startAnimation = () => {
  if (frames.length === 0) {
    router.replace('/welcome')
    return
  }

  animationTimer = window.setInterval(() => {
    if (currentFrameIndex.value >= frames.length - 1) {
      finishSplash()
    } else if (frameReady[currentFrameIndex.value + 1]) {
      // Frame berikutnya belum tiba: tahan frame sekarang agar tidak berkedip.
      currentFrameIndex.value++
    }
  }, FRAME_DURATION)
}

/* ================================
   FINISH
================================ */

const finishSplash = () => {
  if (animationTimer !== null) {
    window.clearInterval(animationTimer)
    animationTimer = null
  }

  // Tap notifikasi bisa sudah membawa pengguna ke tujuan selagi splash berjalan.
  if (router.currentRoute.value.name !== 'Splash') return
  router.replace('/welcome')
}

/* ================================
   LIFECYCLE
================================ */

let disposed = false

onMounted(async () => {
  const loads = preloadFrames()
  // Setelah frame splash lengkap, siapkan maskot Welcome agar tampil tanpa jeda.
  void Promise.all(loads).then(warmWelcomeMascot)
  await Promise.all(loads.slice(0, START_BUFFER))
  if (!disposed) startAnimation()
})

onUnmounted(() => {
  disposed = true

  if (animationTimer !== null) {
    window.clearInterval(animationTimer)
    animationTimer = null
  }
})
</script>

<style scoped>
.splash-container {
  position: fixed;
  inset: 0;

  width: 100%;
  height: 100%;

  overflow: hidden;

  background: #f4e3b2;

  display: flex;
  align-items: center;
  justify-content: center;

  user-select: none;
  -webkit-user-select: none;

  -webkit-tap-highlight-color: transparent;
}

.splash-frame {
  width: 100%;
  height: 100%;

  display: block;

  object-fit: cover;

  pointer-events: none;

  user-select: none;
  -webkit-user-select: none;
}
</style>