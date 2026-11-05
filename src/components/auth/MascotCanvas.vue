<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, nextTick } from 'vue'
import { useMascotAnimation } from '@/composables/useMascotAnimation'

const canvasRef = ref<HTMLCanvasElement | null>(null)
const mascot = useMascotAnimation()

function setEmailFocus(active: boolean) {
  return mascot.setEmailFocus(active)
}
function setPasswordFocus(active: boolean, visible: boolean) {
  return mascot.setPasswordFocus(active, visible)
}
function setPasswordVisible(visible: boolean) {
  return mascot.setPasswordVisible(visible)
}
function playError() {
  return mascot.playError()
}
function stopIntro() {
  mascot.stopIntro()
}

defineExpose({
  setEmailFocus, setPasswordFocus, setPasswordVisible, playError, stopIntro,
})

onMounted(async () => {
  await nextTick()
  mascot.attachCanvas(canvasRef.value)
})

onBeforeUnmount(() => mascot.dispose())
</script>

<template>
  <div class="mascot-canvas" aria-label="Maskot PoliLand">
    <canvas ref="canvasRef" aria-label="Animasi maskot PoliLand" />
  </div>
</template>

<style scoped>
.mascot-canvas {
  width: 100%;
  max-width: 440px;
  height: 100%;
  min-height: 0;
  margin-inline: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: visible;
  background: transparent;
}
canvas {
  display: block;
  width: 100%;
  height: auto;
  max-height: 100%;
  object-fit: contain;
  background: transparent;
}
</style>
