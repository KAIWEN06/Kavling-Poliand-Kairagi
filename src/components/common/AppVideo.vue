<template>
  <video
    ref="videoEl"
    class="app-video"
    :src="src"
    :loop="loop"
    muted
    autoplay
    playsinline
    webkit-playsinline
    preload="auto"
    disablepictureinpicture
    disableremoteplayback
    controls="false"
    controlslist="nodownload nofullscreen noplaybackrate noremoteplayback"
    :poster="TRANSPARENT_POSTER"
    :aria-label="ariaLabel || undefined"
    :aria-hidden="ariaLabel ? undefined : 'true'"
  />
</template>


<script setup lang="ts">

import {
  onBeforeUnmount,
  onMounted,
  ref
} from 'vue'


/* =========================================================
   PROPS
   ========================================================= */

interface Props {

  src: string

  loop?: boolean

  ariaLabel?: string

}

withDefaults(
  defineProps<Props>(),
  {
    loop: true,
    ariaLabel: ''
  }
)


/* =========================================================
   TRANSPARENT POSTER
   ========================================================= */

const TRANSPARENT_POSTER =
  'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7'


/* =========================================================
   VIDEO ELEMENT
   ========================================================= */

const videoEl =
  ref<HTMLVideoElement | null>(null)


/* =========================================================
   TRY PLAY
   ========================================================= */

async function tryPlay(): Promise<void> {

  const video =
    videoEl.value

  if (!video) {
    return
  }

  video.muted = true
  video.defaultMuted = true
  video.autoplay = true
  video.playsInline = true
  video.controls = false

  video.setAttribute('muted', '')
  video.setAttribute('autoplay', '')
  video.setAttribute('playsinline', '')
  video.setAttribute('webkit-playsinline', '')
  video.setAttribute('disablepictureinpicture', '')
  video.setAttribute('disableremoteplayback', '')
  video.setAttribute('controlslist', 'nodownload nofullscreen noplaybackrate noremoteplayback')

  try {

    if (video.readyState === 0) {
      video.load()
    }

    await video.play()

  } catch (error) {

    console.warn(
      '[AppVideo] Video belum dapat dimainkan:',
      error
    )

  }

}


/* =========================================================
   VISIBILITY CHANGE
   ========================================================= */

function handleVisibilityChange(): void {

  if (
    document.visibilityState ===
    'visible'
  ) {

    void tryPlay()

  }

}


/* =========================================================
   MOUNTED
   ========================================================= */

onMounted(() => {

  requestAnimationFrame(() => {

    const video = videoEl.value

    if (video) {
      /*
       * TRICK ANDROID: 
       * Memaksa browser/WebView melakukan reflow (repaint layout) 
       * agar teks dan elemen di sekitarnya langsung muncul 
       * tanpa harus menunggu interaksi navigasi fisik HP.
       */
      void video.offsetHeight
    }

    void tryPlay()

  })

  document.addEventListener(
    'visibilitychange',
    handleVisibilityChange
  )

})


/* =========================================================
   CLEANUP
   ========================================================= */

onBeforeUnmount(() => {

  document.removeEventListener(
    'visibilitychange',
    handleVisibilityChange
  )

  const video =
    videoEl.value

  if (!video) {
    return
  }

  video.pause()
  video.removeAttribute('src')

})

</script>


<style scoped>

.app-video {

  display: block;

  width: 100%;

  height: 100%;

  object-fit: contain;

  background: transparent;

  pointer-events: none;

  user-select: none;

  -webkit-user-select: none;

  /* Memastikan elemen tampil secara langsung */
  opacity: 1;

  visibility: visible;

  transform: translateZ(0); /* Memicu hardware acceleration Android */

}

</style>


<style>

video::-webkit-media-controls,
video::-webkit-media-controls-panel,
video::-webkit-media-controls-play-button,
video::-webkit-media-controls-start-playback-button,
video::-webkit-media-controls-overlay-play-button,
video::-webkit-media-controls-enclosure {

  display: none !important;

  opacity: 0 !important;

  -webkit-appearance: none;

  appearance: none;

}

video {

  -webkit-appearance: none;

  appearance: none;

}

</style>