<template>
  <div class="minimap">
    <div
      ref="container"
      class="minimap-inner"
      @click="handleClick"
    >
      <!-- MAP WORLD -->
      <div
        class="minimap-world"
        :style="worldStyle"
      >
        <!-- Background -->
        <img
          :src="background"
          alt="Minimap"
          class="minimap-background"
          draggable="false"
        />

        <!-- SVG -->
        <div
          class="minimap-svg"
          v-html="svgRaw"
        />
      </div>

      <div
        v-if="viewportBoxStyle"
        class="minimap-viewport-box"
        :style="viewportBoxStyle"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  ref,
  computed,
  nextTick,
  watch,
} from 'vue'

import background from '../../assets/siteplan/background.webp'
import svgRaw from '../../assets/siteplan/LOTS_WITH_ID.svg?raw'

import {
  getLotId,
  getLotStatusColor,
} from '../../utils/siteplan'

const props = defineProps({
  lots: {
    type: Array,
    default: () => [],
  },

  selectedLot: {
    type: Object,
    default: null,
  },

  rotation: {
    type: Number,
    default: 0,
  },

  scale: {
    type: Number,
    default: 1,
  },

  pan: {
    type: Object,
    default: () => ({
      x: 0,
      y: 0,
    }),
  },

  viewportWidth: {
    type: Number,
    default: 1,
  },

  viewportHeight: {
    type: Number,
    default: 1,
  },

  viewBox: {
    type: Object,
    default: () => ({
      x: 0,
      y: 0,
      width: 1252,
      height: 1257,
    }),
  },
})

const emit = defineEmits([
  'map-click',
])

const container =
  ref<HTMLElement | null>(null)

/*
|--------------------------------------------------------------------------
| WORLD TRANSFORM
|--------------------------------------------------------------------------
*/

const worldStyle = computed(() => ({
  transform: `rotate(${props.rotation}deg)`,
}))

const viewportBoxStyle = computed(() => {
  const scale = Math.max(Number(props.scale) || 1, 0.1)
  const panX = Number(props.pan?.x) || 0
  const panY = Number(props.pan?.y) || 0

  const viewportWidth = Math.max(Number(props.viewportWidth) || 1, 1)
  const viewportHeight = Math.max(Number(props.viewportHeight) || 1, 1)
  const viewBoxX = Number(props.viewBox?.x) || 0
  const viewBoxY = Number(props.viewBox?.y) || 0
  const viewBoxWidth = Math.max(Number(props.viewBox?.width) || 1, 1)
  const viewBoxHeight = Math.max(Number(props.viewBox?.height) || 1, 1)
  const fitScale = Math.min(
    viewportWidth / viewBoxWidth,
    viewportHeight / viewBoxHeight,
  )
  const angle = Number(props.rotation) * Math.PI / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const centerX =
    viewBoxX +
    viewBoxWidth / 2 +
    (cos * -panX + sin * -panY) / (fitScale * scale)
  const centerY =
    viewBoxY +
    viewBoxHeight / 2 +
    (-sin * -panX + cos * -panY) / (fitScale * scale)
  const boxWidth = 100 * viewportWidth / (fitScale * scale * viewBoxWidth)
  const boxHeight = 100 * viewportHeight / (fitScale * scale * viewBoxHeight)

  return {
    width: `${boxWidth}%`,
    height: `${boxHeight}%`,
    left: `${((centerX - viewBoxX) / viewBoxWidth) * 100}%`,
    top: `${((centerY - viewBoxY) / viewBoxHeight) * 100}%`,
    transform: `translate(-50%, -50%) rotate(${-Number(props.rotation)}deg)`,
  }
})

/*
|--------------------------------------------------------------------------
| UPDATE COLORS
|--------------------------------------------------------------------------
*/

function updateColors() {
  const svg =
    container.value?.querySelector(
      '.minimap-svg svg',
    ) as SVGSVGElement | null

  if (!svg) return

  const elements =
    svg.querySelectorAll(
      '[data-minimap-styled="true"]',
    )

  elements.forEach((element) => {
    const el =
      element as SVGElement

    el.style.removeProperty('fill')
    el.style.removeProperty('stroke')
    el.style.removeProperty('stroke-width')
    el.style.removeProperty('opacity')

    el.removeAttribute(
      'data-minimap-styled',
    )
  })

  props.lots.forEach((lot: any) => {
    const id = getLotId(lot)

    if (!id) return

    const element =
      svg.querySelector(
        `#${CSS.escape(id)}`,
      ) as SVGElement | null

    if (!element) return

    element.style.setProperty(
      'fill',
      getLotStatusColor(lot),
      'important',
    )

    element.style.setProperty(
      'opacity',
      '0.85',
    )

    element.setAttribute(
      'data-minimap-styled',
      'true',
    )
  })

  if (props.selectedLot) {
    const id =
      getLotId(
        props.selectedLot,
      )

    if (!id) return

    const selected =
      svg.querySelector(
        `#${CSS.escape(id)}`,
      ) as SVGElement | null

    if (!selected) return

    selected.style.setProperty(
      'stroke',
      '#2F6FEB',
      'important',
    )

    selected.style.setProperty(
      'stroke-width',
      '5',
      'important',
    )

    selected.style.setProperty(
      'stroke-linejoin',
      'round',
      'important',
    )

    selected.setAttribute(
      'data-minimap-styled',
      'true',
    )
  }
}

/*
|--------------------------------------------------------------------------
| CLICK
|--------------------------------------------------------------------------
*/

function handleClick(
  event: MouseEvent,
) {
  const target =
    event.currentTarget as HTMLElement

  const svg =
    target.querySelector(
      '.minimap-svg svg',
    ) as SVGSVGElement | null

  if (!svg) return

  const screenMatrix = svg.getScreenCTM()

  if (!screenMatrix) return

  const point = svg.createSVGPoint()
  point.x = event.clientX
  point.y = event.clientY

  const mapPoint = point.matrixTransform(screenMatrix.inverse())

  emit(
    'map-click',
    {
      x: mapPoint.x,
      y: mapPoint.y,
    },
  )
}

/*
|--------------------------------------------------------------------------
| WATCH
|--------------------------------------------------------------------------
*/

watch(
  () => [
    props.lots,
    props.selectedLot,
  ],

  async () => {
    await nextTick()

    updateColors()
  },

  {
    deep: true,
    immediate: true,
  },
)
</script>

<style scoped>
.minimap {
  width: var(--minimap-size, 128px);
  height: var(--minimap-size, 128px);

  border-radius: 14px;
  overflow: hidden;

  background: rgba(255, 255, 255, 0.94);

  border: 1px solid #E5E5E5;

  box-shadow:
    0 12px 24px rgba(26, 26, 26, 0.14);

  touch-action: manipulation;
}

.minimap-inner {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  cursor: pointer;
}

.minimap-world {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  transform-origin: center center;
  transition: transform 0.2s ease;
}

.minimap-background {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: fill;
  display: block;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

.minimap-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.minimap-svg :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
  overflow: visible;
}

.minimap-svg :deep(polygon),
.minimap-svg :deep(path) {
  vector-effect: non-scaling-stroke;
}

.minimap-viewport-box {
  position: absolute;
  z-index: 4;

  transform-origin: center;
  border: 2px solid rgba(47, 111, 235, 0.95); /* Primary Accent */
  border-radius: 10px;

  background: rgba(47, 111, 235, 0.08); /* Primary tint */

  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.5);
  pointer-events: none;
}

.minimap-label {
  position: absolute;
  left: 8px;
  bottom: 6px;
  z-index: 5;

  font-size: 10px;
  line-height: 1;
  font-weight: 700;
  color: #1A1A1A; /* Charcoal */

  background: rgba(255, 255, 255, 0.82);
  border-radius: 999px;
  padding: 3px 7px;
  pointer-events: none;
  backdrop-filter: blur(4px);
}

@media (max-width: 768px) {
  .minimap {
    border-radius: clamp(10px, 3vw, 12px);
  }

  .minimap-label {
    font-size: 9px;
    padding: 3px 6px;
  }
}
</style>