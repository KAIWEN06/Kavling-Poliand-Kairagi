<template>
  <svg
    class="scenery"
    viewBox="0 0 1252 1257"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <!-- Satu gambar diam; lihat utils/siteplanScenery.ts. -->
    <image
      v-if="source"
      :href="source"
      :x="SCENERY_BOX.x"
      :y="SCENERY_BOX.y"
      :width="SCENERY_BOX.size"
      :height="SCENERY_BOX.size"
    />
  </svg>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { SCENERY_BOX, buildSceneryMarkup } from '../../utils/siteplanScenery'

const source = ref('')
let frame = 0

/* Dirakit setelah frame pertama, agar denah tampil lebih dulu. */
onMounted(() => {
  frame = requestAnimationFrame(() => {
    frame = requestAnimationFrame(() => {
      source.value = URL.createObjectURL(
        new Blob([buildSceneryMarkup()], { type: 'image/svg+xml' })
      )
    })
  })
})

onBeforeUnmount(() => {
  cancelAnimationFrame(frame)
  if (source.value) URL.revokeObjectURL(source.value)
})
</script>

<style scoped>
.scenery {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: block;
  pointer-events: none;
  /* Lanskap sengaja meluber ke luar kotak gambar; .map-viewport yang memotong. */
  overflow: visible;
}
</style>
