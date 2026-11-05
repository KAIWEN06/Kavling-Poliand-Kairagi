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

const preloadFrames = async () => {
  const promises = frames.map((src) => {
    return new Promise<void>((resolve) => {
      const image = new Image()

      image.onload = () => {
        resolve()
      }

      image.onerror = () => {
        console.warn('Frame gagal dimuat:', src)
        resolve()
      }

      image.src = src
    })
  })

  await Promise.all(promises)
}

/* ================================
   ANIMATION
================================ */

const startAnimation = () => {
  if (frames.length === 0) {
    router.replace('/home')
    return
  }

  animationTimer = window.setInterval(() => {
    if (currentFrameIndex.value < frames.length - 1) {
      currentFrameIndex.value++
    } else {
      finishSplash()
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

  router.replace('/home')
}

/* ================================
   LIFECYCLE
================================ */

onMounted(async () => {
  await preloadFrames()
  startAnimation()
})

onUnmounted(() => {
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