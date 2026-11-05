<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { useMascotAnimation } from '@/composables/useMascotAnimation'

const canvas = ref<HTMLCanvasElement | null>(null)

const {
  isUnavailable,
  attachCanvas,
  setEmailFocus,
  setPasswordFocus,
  setPasswordVisible,
  playError,
  stopIntro,
  dispose,
} = useMascotAnimation()

onMounted(() => {
  attachCanvas(canvas.value)
})

onBeforeUnmount(() => {
  dispose()
})

defineExpose({
  setEmailFocus,
  setPasswordFocus,
  setPasswordVisible,
  playError,
  stopIntro,
})
</script>

<template>
  <div class="login-mascot" aria-hidden="true">
    <canvas
      ref="canvas"
      class="login-mascot__canvas"
      width="1920"
      height="1080"
    />
    <div v-if="isUnavailable" class="login-mascot__fallback" />
  </div>
</template>


<style scoped>
.login-mascot {
  position: relative;
  box-sizing: border-box;
  width: 100%;
  max-width: 520px;
  min-height: 130px;
  aspect-ratio: 16 / 9;
  margin: 0 auto;
  /* Canvas berada di tengah dan mengikuti rasio frame animasi. */
  display: grid;
  place-items: center;
  overflow: visible;
  pointer-events: none;
  background: transparent;
}

.login-mascot__canvas {
  grid-area: 1 / 1;
  display: block;
  width: 100%;
  height: auto;
  max-height: clamp(160px, 32vh, 330px);
  object-fit: contain;
  background: transparent;
  border: 0;
  outline: 0;
  pointer-events: none;
  -webkit-appearance: none;
  appearance: none;
  opacity: 1;
  z-index: 1;
}

.login-mascot__fallback {
  display: none;
}

@media (max-height: 720px) {
  .login-mascot {
    min-height: 120px;
  }

  .login-mascot__canvas {
    max-height: 210px;
  }
}

@media (min-width: 768px) {
  .login-mascot__canvas {
    max-height: 320px;
  }
}
</style>