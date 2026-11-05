<template>
  <div
    ref="mapRoot"
    :class="['siteplan-map', { 'detail-open': !!selectedLot, 'search-active': isSearchActive }]"
    @pointerdown="onPointerDown"
    @pointermove="onPointerMove"
    @pointerup="onPointerUp"
    @pointercancel="onPointerCancel"
    @lostpointercapture="onLostPointerCapture"
    @wheel="handleWheel"
    @touchstart.stop
    @touchmove.stop
    @touchend.stop
    @touchcancel.stop
  >

    <!-- MAP -->
    <div
      ref="viewport"
      class="map-viewport"
    >
      <div
        class="map-world"
        :style="worldStyle"
      >
        <img
          :src="background"
          class="map-background"
          draggable="false"
        />

        <div
          class="map-svg"
          v-html="svgRaw"
        />

        <PolygonLayer
          :container="mapRoot ?? null"
          :lots="lots"
          :selected-lot="selectedLot"
          :pending-lot="pendingLot"
          :hovered-lot="hoveredLot"
          :rotation="currentRotation"
          :device-tilt="deviceTilt"
          @select="$emit('select', $event)"
          @hover="$emit('hover', $event)"
          @leave="$emit('leave')"
        />
      </div>
    </div>

<!-- =================================================
         MAP CONTROLS
         ================================================= -->
    <div class="siteplan-controls">

      <!-- SEARCH (Kiri/Atas) -->
      <div class="control-search">
        <SearchBox
          :lots="lots"
          @select="$emit('select', $event)"
        />
      </div>

      <!-- STACK KONTROL KANAN (Compass, Legend, Zoom) -->
      <div class="right-controls-stack">
        <!-- COMPASS -->
        <Compass
          :rotation="currentRotation"
          @rotate="rotate"
        />

        <!-- LEGEND -->
        <SiteplanLegend
          :is-open="isLegendOpen"
          @toggle="isLegendOpen = !isLegendOpen"
        />

        <!-- ZOOM -->
        <ZoomControl
          :is-max-scale="isMaxScale"
          :is-min-scale="isMinScale"
          @zoom-in="zoomIn"
          @zoom-out="zoomOut"
          @fit="fitToView"
          @reset="resetView"
          @fullscreen="
            emit('map-click', {
              action: 'fullscreen'
            })
          "
        />
      </div>

      <!-- MINI MAP (Kiri Bawah) -->
      <div class="control-minimap">
        <MiniMap
          :lots="lots"
          :selected-lot="selectedLot"
          :rotation="currentRotation"
          :scale="currentScale"
          :pan="pan"
          :viewport-width="mapWidth"
          :viewport-height="mapHeight"
          :view-box="mapViewBox"
          @map-click="handleMiniMapClick"
        />
      </div>

    </div>
  </div>
</template>
<script setup lang="ts">
import {
  computed,
  ref,
  watch,
  onMounted,
  onBeforeUnmount
} from 'vue'

import SiteplanLegend from './SiteplanLegend.vue'
import PolygonLayer from './PolygonLayer.vue'
import Compass from './Compass.vue'
import ZoomControl from './ZoomControl.vue'
import MiniMap from './MiniMap.vue'
import SearchBox from './SearchBox.vue'


const props = defineProps({
  container: {
    type: [Object, null],
    default: null
  },

  lots: {
    type: Array,
    default: () => []
  },

  selectedLot: {
    type: Object,
    default: null
  },

  pendingLot: {
    type: Object,
    default: null
  },

  hoveredLot: {
    type: Object,
    default: null
  },

  background: {
    type: String,
    default: ''
  },

  svgRaw: {
    type: String,
    default: ''
  },

  rotation: {
    type: Number,
    default: 0
  },

  scale: {
    type: Number,
    default: 1
  },

  minScale: {
    type: Number,
    default: 0.6
  },

  maxScale: {
    type: Number,
    default: 8
  }
})


const emit = defineEmits([
  'select',
  'hover',
  'leave',
  'rotate',
  'map-click'
])


/* =========================================================
   MAP REFERENCES
   ========================================================= */

const mapRoot = ref<HTMLElement | null>(null)

const viewport = ref<HTMLElement | null>(null)

const mapWidth = ref(1)

const mapHeight = ref(1)

const mapViewBox = ref({
  x: 0,
  y: 0,
  width: 1252,
  height: 1257
})

let mapResizeObserver:
  ResizeObserver | null = null


/* =========================================================
   MAP STATE
   ========================================================= */

const currentScale = ref(props.scale)

const currentRotation =
  ref(props.rotation)

const isLegendOpen = ref(false)
const isSearchActive = ref(false)

const pan = ref({
  x: 0,
  y: 0
})

const mousePosition = ref({
  x: 0,
  y: 0
})


/* =========================================================
   SEARCH MODE
   ========================================================= */

function handleSearchMode(event: Event) {
  const customEvent = event as CustomEvent<{ active?: boolean }>
  isSearchActive.value = customEvent.detail?.active === true
}

/* =========================================================
   DEVICE TILT
   ========================================================= */

const deviceTilt = ref({
  x: 0,
  y: 0,
  rotation: 0
})

const orientationPermissionRequired =
  ref(false)

let orientationListening = false


/* =========================================================
   SCALE
   ========================================================= */

const isMaxScale = computed(() => {
  return currentScale.value >= props.maxScale
})

const isMinScale = computed(() => {
  return currentScale.value <= props.minScale
})


/* =========================================================
   ROTATION
   ========================================================= */

function snapRotation(
  value: number,
  step = 30
) {
  const normalized =
    normalizeAngle(value)

  const snapped =
    Math.round(normalized / step) * step

  return normalizeAngle(snapped)
}


/* =========================================================
   WORLD STYLE
   ========================================================= */

const worldStyle = computed(() => ({
  transform: `
    translate(
      ${pan.value.x}px,
      ${pan.value.y}px
    )
    scale(${currentScale.value})
    rotate(${currentRotation.value}deg)
  `,

  transformOrigin:
    'center center',

  transition: dragState.value
    ? 'none'
    : 'transform 0.15s ease'
}))


/* =========================================================
   WATCH PROPS
   ========================================================= */

watch(
  () => props.rotation,
  (value) => {
    currentRotation.value = value
  },
  {
    immediate: true
  }
)

watch(
  () => props.scale,
  (value) => {
    currentScale.value = value
  },
  {
    immediate: true
  }
)


/* =========================================================
   HELPERS
   ========================================================= */

function clamp(
  value: number,
  min: number,
  max: number
) {
  return Math.min(
    max,
    Math.max(min, value)
  )
}


function normalizeAngle(
  angle: number
) {
  let result = angle % 360

  if (result > 180) {
    result -= 360
  }

  if (result < -180) {
    result += 360
  }

  return result
}


/* =========================================================
   DEVICE ORIENTATION
   ========================================================= */

function handleDeviceOrientation(
  event: DeviceOrientationEvent
) {
  const beta =
    Number.isFinite(event.beta)
      ? Number(event.beta)
      : 0

  const gamma =
    Number.isFinite(event.gamma)
      ? Number(event.gamma)
      : 0

  const screenAngle =
    typeof window !== 'undefined' &&
    window.screen?.orientation
      ? Number(
          window.screen.orientation.angle || 0
        )
      : 0

  let rotation = gamma

  if (
    Math.abs(screenAngle) === 90
  ) {
    rotation = beta
  }

  const snappedRotation =
    snapRotation(rotation, 30)

  deviceTilt.value = {
    x: beta,
    y: gamma,
    rotation: snappedRotation
  }
}


async function enableDeviceOrientation() {
  if (
    typeof window === 'undefined' ||
    typeof DeviceOrientationEvent === 'undefined'
  ) {
    orientationPermissionRequired.value =
      false

    return
  }

  try {
    const DeviceOrientationConstructor =
      DeviceOrientationEvent as
        typeof DeviceOrientationEvent & {
          requestPermission?: () =>
            Promise<
              'granted' | 'denied'
            >
        }

    if (
      typeof DeviceOrientationConstructor
        .requestPermission === 'function'
    ) {
      const permission =
        await DeviceOrientationConstructor
          .requestPermission()

      if (permission !== 'granted') {
        orientationPermissionRequired.value =
          true

        return
      }
    }

    if (!orientationListening) {
      window.addEventListener(
        'deviceorientation',
        handleDeviceOrientation,
        true
      )

      window.addEventListener(
        'deviceorientationabsolute',
        handleDeviceOrientation,
        true
      )

      orientationListening = true
    }

    orientationPermissionRequired.value =
      false

  } catch (error) {
    console.warn(
      'Device orientation permission failed:',
      error
    )

    orientationPermissionRequired.value =
      true
  }
}


function disableDeviceOrientation() {
  if (
    typeof window === 'undefined' ||
    !orientationListening
  ) {
    return
  }

  window.removeEventListener(
    'deviceorientation',
    handleDeviceOrientation,
    true
  )

  window.removeEventListener(
    'deviceorientationabsolute',
    handleDeviceOrientation,
    true
  )

  orientationListening = false
}


/* =========================================================
   MOUNT
   ========================================================= */

onMounted(() => {
  window.addEventListener(
    'poliland-search-mode',
    handleSearchMode
  )


  if (viewport.value) {

    const updateMapSize = () => {
      mapWidth.value =
        viewport.value?.clientWidth || 1

      mapHeight.value =
        viewport.value?.clientHeight || 1

      const svg =
        mapRoot.value?.querySelector<SVGSVGElement>(
          '.map-svg svg'
        )

      const viewBox =
        svg?.viewBox.baseVal

      if (
        viewBox &&
        viewBox.width > 0 &&
        viewBox.height > 0
      ) {
        mapViewBox.value = {
          x: viewBox.x,
          y: viewBox.y,
          width: viewBox.width,
          height: viewBox.height
        }
      }
    }

    updateMapSize()

    mapResizeObserver =
      new ResizeObserver(
        updateMapSize
      )

    mapResizeObserver.observe(
      viewport.value
    )
  }


  if (
    typeof DeviceOrientationEvent !==
    'undefined'
  ) {

    const DeviceOrientationConstructor =
      DeviceOrientationEvent as
        typeof DeviceOrientationEvent & {
          requestPermission?: () =>
            Promise<
              'granted' | 'denied'
            >
        }

    if (
      typeof DeviceOrientationConstructor
        .requestPermission === 'function'
    ) {

      orientationPermissionRequired.value =
        true

    } else {

      enableDeviceOrientation()
    }
  }
})


/* =========================================================
   POINTER / GESTURE
   ========================================================= */

type PointerPoint = {
  x: number
  y: number
}


type TapCandidate = {
  pointerId: number
  x: number
  y: number
  target: EventTarget | null
}


const activePointers =
  new Map<number, PointerPoint>()

let tapCandidate:
  TapCandidate | null = null

let gestureMoved = false

let multiTouch = false

const TAP_THRESHOLD = 8

const isDragging = ref(false)


const dragState = ref<{
  startX: number
  startY: number
  startPanX: number
  startPanY: number
} | null>(null)


const pinchState = ref<{
  distance: number
  centerX: number
  centerY: number
} | null>(null)


function getDistance(
  a: PointerPoint,
  b: PointerPoint
) {
  return Math.hypot(
    a.x - b.x,
    a.y - b.y
  )
}


function getCenter(
  a: PointerPoint,
  b: PointerPoint
) {
  return {
    x: (a.x + b.x) / 2,
    y: (a.y + b.y) / 2
  }
}


function isLotTarget(
  target: EventTarget | null
): Element | null {

  if (
    !(target instanceof Element)
  ) {
    return null
  }

  const lot =
    target.closest(
      '[data-siteplan-lot="true"]'
    )

  if (!lot) return null

  if (
    !mapRoot.value?.contains(lot)
  ) {
    return null
  }

  return lot
}


/*
 * Event dari kontrol (search, zoom, compass, dll.)
 * tidak boleh ditangkap oleh gesture map. Pointer
 * capture di root map membuat click tidak sampai
 * ke tombol di dalam kontrol.
 */
function isFromControls(
  target: EventTarget | null
) {

  return (
    target instanceof Element &&
    !!target.closest('.siteplan-controls')
  )
}


function resetGestureState() {

  activePointers.clear()

  tapCandidate = null

  gestureMoved = false

  multiTouch = false

  dragState.value = null

  pinchState.value = null

  isDragging.value = false
}


function continueWithRemainingPointer() {

  const remaining =
    [...activePointers.values()][0]

  if (!remaining) {
    resetGestureState()
    return
  }

  dragState.value = {
    startX: remaining.x,
    startY: remaining.y,
    startPanX: pan.value.x,
    startPanY: pan.value.y
  }

  multiTouch = false

  tapCandidate = null

  pinchState.value = null

  gestureMoved = false

  isDragging.value = false
}


function continueWithMultiPointerGesture() {

  const points =
    [...activePointers.values()]

  const a = points[0]

  const b = points[1]

  if (!a || !b) {
    continueWithRemainingPointer()
    return
  }

  const center =
    getCenter(a, b)

  pinchState.value = {
    distance:
      Math.max(
        getDistance(a, b),
        1
      ),

    centerX: center.x,

    centerY: center.y
  }

  multiTouch = true

  tapCandidate = null

  dragState.value = null

  gestureMoved = true

  isDragging.value = false
}


function releasePointer(
  pointerId: number
) {

  try {

    if (
      mapRoot.value?.hasPointerCapture(
        pointerId
      )
    ) {
      mapRoot.value.releasePointerCapture(
        pointerId
      )
    }

  } catch {}
}


/* =========================================================
   POINTER DOWN
   ========================================================= */

function onPointerDown(
  event: PointerEvent
) {

  if (props.pendingLot) {
    return
  }

  if (isFromControls(event.target)) {
    return
  }

  activePointers.set(
    event.pointerId,
    {
      x: event.clientX,
      y: event.clientY
    }
  )

  try {

    mapRoot.value?.setPointerCapture(
      event.pointerId
    )

  } catch {}


  if (activePointers.size === 1) {

    tapCandidate = {
      pointerId: event.pointerId,
      x: event.clientX,
      y: event.clientY,
      target: event.target
    }

    gestureMoved = false

    multiTouch = false

    dragState.value = {
      startX: event.clientX,
      startY: event.clientY,
      startPanX: pan.value.x,
      startPanY: pan.value.y
    }

    pinchState.value = null

    isDragging.value = false

    return
  }


  multiTouch = true

  tapCandidate = null

  gestureMoved = false

  dragState.value = null

  isDragging.value = false


  const points =
    [...activePointers.values()]

  const a = points[0]

  const b = points[1]

  if (a && b) {

    const center =
      getCenter(a, b)

    pinchState.value = {
      distance:
        Math.max(
          getDistance(a, b),
          1
        ),

      centerX: center.x,

      centerY: center.y
    }
  }
}


/* =========================================================
   POINTER MOVE
   ========================================================= */

function onPointerMove(
  event: PointerEvent
) {

  if (
    !activePointers.has(
      event.pointerId
    )
  ) {
    return
  }

  activePointers.set(
    event.pointerId,
    {
      x: event.clientX,
      y: event.clientY
    }
  )

  mousePosition.value = {
    x: event.clientX,
    y: event.clientY
  }


  if (
    activePointers.size === 1 &&
    dragState.value &&
    !multiTouch
  ) {

    const dx =
      event.clientX -
      dragState.value.startX

    const dy =
      event.clientY -
      dragState.value.startY

    const distance =
      Math.hypot(dx, dy)

    if (
      distance <= TAP_THRESHOLD
    ) {
      return
    }

    gestureMoved = true

    isDragging.value = true

    pan.value = {
      x:
        dragState.value.startPanX +
        dx,

      y:
        dragState.value.startPanY +
        dy
    }

    return
  }


  if (
    activePointers.size >= 2 &&
    pinchState.value
  ) {

    const points =
      [...activePointers.values()]

    const a = points[0]

    const b = points[1]

    if (!a || !b) return

    const center =
      getCenter(a, b)

    const distance =
      Math.max(
        getDistance(a, b),
        1
      )


    pan.value = {
      x:
        pan.value.x +
        (
          center.x -
          pinchState.value.centerX
        ),

      y:
        pan.value.y +
        (
          center.y -
          pinchState.value.centerY
        )
    }


    const ratio =
      distance /
      pinchState.value.distance


    if (
      Number.isFinite(ratio) &&
      ratio > 0
    ) {

      currentScale.value =
        clamp(
          currentScale.value * ratio,
          props.minScale,
          props.maxScale
        )
    }


    pinchState.value = {
      distance,

      centerX: center.x,

      centerY: center.y
    }


    gestureMoved = true

    isDragging.value = true
  }
}


/* =========================================================
   POINTER UP
   ========================================================= */

function onPointerUp(
  event: PointerEvent
) {

  if (
    isFromControls(event.target) &&
    !activePointers.has(event.pointerId)
  ) {
    return
  }

  const wasSingleTap =
    activePointers.size === 1 &&
    !multiTouch &&
    !gestureMoved &&
    tapCandidate?.pointerId ===
      event.pointerId


  const tap = tapCandidate

  activePointers.delete(
    event.pointerId
  )

  releasePointer(
    event.pointerId
  )


  if (
    wasSingleTap &&
    tap
  ) {

    window.setTimeout(() => {

      const lotElement =
        isLotTarget(tap.target)

      if (!lotElement) return


      const polygonId =
        lotElement.getAttribute(
          'data-siteplan-lot-id'
        ) ||
        lotElement.id


      const lot =
        props.lots.find(
          (item: any) => {

            const id =
              item?.polygon_id ??
              item?.polygonId ??
              item?.id

            return (
              String(id) ===
              String(polygonId)
            )
          }
        )


      if (lot) {
        emit('select', lot)
      }

    }, 0)
  }


  if (
    activePointers.size === 0
  ) {

    resetGestureState()

    return
  }


  if (
    activePointers.size === 1
  ) {

    continueWithRemainingPointer()

  } else if (
    activePointers.size >= 2
  ) {

    continueWithMultiPointerGesture()
  }
}


/* =========================================================
   POINTER CANCEL
   ========================================================= */

function onPointerCancel(
  event: PointerEvent
) {

  activePointers.delete(
    event.pointerId
  )

  releasePointer(
    event.pointerId
  )


  if (
    activePointers.size === 0
  ) {

    resetGestureState()

    return
  }


  if (
    activePointers.size === 1
  ) {

    continueWithRemainingPointer()

  } else if (
    activePointers.size >= 2
  ) {

    continueWithMultiPointerGesture()
  }
}


/* =========================================================
   LOST POINTER CAPTURE
   ========================================================= */

function onLostPointerCapture(
  event: PointerEvent
) {

  if (
    !activePointers.has(
      event.pointerId
    )
  ) {
    return
  }

  activePointers.delete(
    event.pointerId
  )


  if (
    activePointers.size === 0
  ) {

    resetGestureState()

    return
  }


  if (
    activePointers.size === 1
  ) {

    continueWithRemainingPointer()

  } else if (
    activePointers.size >= 2
  ) {

    continueWithMultiPointerGesture()
  }
}


/* =========================================================
   MINI MAP
   ========================================================= */

function handleMiniMapClick(
  payload: any
) {
  const x = Number(payload?.x)
  const y = Number(payload?.y)

  if (
    !Number.isFinite(x) ||
    !Number.isFinite(y) ||
    mapWidth.value <= 0 ||
    mapHeight.value <= 0
  ) {
    return
  }

  const fitScale = Math.min(
    mapWidth.value / mapViewBox.value.width,
    mapHeight.value / mapViewBox.value.height
  )

  const angle =
    currentRotation.value * Math.PI / 180
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const scaledX =
    (x - mapViewBox.value.x - mapViewBox.value.width / 2) *
    fitScale *
    currentScale.value
  const scaledY =
    (y - mapViewBox.value.y - mapViewBox.value.height / 2) *
    fitScale *
    currentScale.value

  pan.value = {
    x: -(cos * scaledX - sin * scaledY),
    y: -(sin * scaledX + cos * scaledY)
  }


  emit(
    'map-click',
    payload
  )
}


/* =========================================================
   ZOOM
   ========================================================= */

function zoomIn() {

  currentScale.value =
    clamp(
      Number(
        (
          currentScale.value +
          0.2
        ).toFixed(2)
      ),

      props.minScale,

      props.maxScale
    )
}


function zoomOut() {

  currentScale.value =
    clamp(
      Number(
        (
          currentScale.value -
          0.2
        ).toFixed(2)
      ),

      props.minScale,

      props.maxScale
    )
}


function fitToView() {

  currentScale.value = 1

  pan.value = {
    x: 0,
    y: 0
  }
}


function resetView() {

  currentScale.value =
    props.scale

  pan.value = {
    x: 0,
    y: 0
  }

  currentRotation.value =
    props.rotation
}


/* =========================================================
   ROTATE
   ========================================================= */

function rotate() {

  currentRotation.value =
    (
      currentRotation.value +
      90
    ) % 360

  emit(
    'rotate',
    currentRotation.value
  )
}


/* =========================================================
   WHEEL
   ========================================================= */

function handleWheel(
  event: WheelEvent
) {

  event.preventDefault()

  const delta =
    event.deltaY > 0
      ? -0.15
      : 0.15


  currentScale.value =
    clamp(
      Number(
        (
          currentScale.value +
          delta
        ).toFixed(2)
      ),

      props.minScale,

      props.maxScale
    )
}


/* =========================================================
   CLEANUP
   ========================================================= */

onBeforeUnmount(() => {
  window.removeEventListener(
    'poliland-search-mode',
    handleSearchMode
  )


  mapResizeObserver?.disconnect()

  mapResizeObserver = null

  disableDeviceOrientation()

  for (
    const pointerId
    of activePointers.keys()
  ) {

    releasePointer(pointerId)
  }

  resetGestureState()
})
</script>


<style scoped>
/* =========================================================
   MAIN SITEPLAN
   ========================================================= */

.siteplan-map {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: #C5D2A5;
  touch-action: none;
  overscroll-behavior: none;
  user-select: none;
  -webkit-user-select: none;

  /* Tinggi Tabbar bawah + padding aman */
  --tabbar-height: 85px; 
  --map-edge: 12px;
}


/* =========================================
   MAP VIEWPORT
   ========================================= */

.map-viewport {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  touch-action: none;
  overscroll-behavior: none;
  z-index: 1;
}

.map-world {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  transform-origin: center center;
  touch-action: none;
  overscroll-behavior: none;
  will-change: transform;
}

.map-background {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  pointer-events: none;
  user-select: none;
  -webkit-user-drag: none;
}

.map-svg {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  touch-action: none;
}

.map-svg :deep(svg) {
  display: block;
  width: 100%;
  height: 100%;
}


/* =========================================
   CONTROLS CONTAINER
   ========================================= */

.siteplan-controls {
  position: absolute;
  inset: 0;
  z-index: 1000;
  pointer-events: none;
  transition: opacity 0.2s ease, visibility 0.2s ease;
}

.siteplan-map.detail-open .siteplan-controls {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

/* Search mode: sembunyikan semua kontrol map selain SearchBox. */
.siteplan-map.search-active .right-controls-stack,
.siteplan-map.search-active .control-minimap {
  display: none !important;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.siteplan-map.search-active .siteplan-controls {
  z-index: 999999;
}

.siteplan-map.search-active .control-search {
  z-index: 1000000;
}

/* =========================================
   SEARCH (Atas)
   ========================================= */

.control-search {
  position: absolute;
  top: calc(env(safe-area-inset-top, 12px) + 12px);
  left: var(--map-edge);
  right: var(--map-edge);
  z-index: 100;
  pointer-events: auto;
}


/* =========================================
   RIGHT CONTROLS STACK (Compass, Legend, Zoom)
   Ditempatkan di sisi kanan dengan batas bawah Tabbar
   ========================================= */
.right-controls-stack {
  position: absolute;
  top: auto;
  bottom: calc(var(--tabbar-height) + env(safe-area-inset-bottom, 0px) + 8px);
  right: var(--map-edge);

  display: flex;
  flex-direction: column;
  align-items: center;
  gap: clamp(6px, 1.2vw, 12px);

  z-index: 100;
  pointer-events: auto;
}

/* Semua kontrol kanan mengikuti stack.
   Jangan gunakan position:absolute pada masing-masing kontrol,
   supaya tidak lagi melayang/menimpa SearchBox. */
.control-compass,
.control-legend,
.control-zoom {
  position: relative;
  top: auto;
  right: auto;
  bottom: auto;
  flex: 0 0 auto;
  pointer-events: auto;
}

.control-compass {
  z-index: 10;
}

.control-legend {
  width: 42px;
  height: 42px;
  z-index: 20;
}

.control-legend :deep(.legend-control) {
  position: relative;
  width: 42px;
  height: 42px;
}

.control-zoom {
  z-index: 30;
}


/* =========================================
   MINI MAP (Kiri Bawah)
   ========================================= */

.control-minimap {
  position: absolute;
  left: var(--map-edge);
  bottom: calc(var(--tabbar-height) + env(safe-area-inset-bottom, 0px) + 12px);
  max-width: calc(100vw - 2 * var(--map-edge));
  z-index: 10;
  pointer-events: auto;
}


/* =========================================
   ORIENTATION
   ========================================= */

.orientation-button {
  position: absolute;
  top: 0;
  left: 50%;
  transform: translateX(-50%);
  z-index: 20;
  padding: 3px 8px;
  border: 0;
  border-radius: 0 0 4px 4px;
  background: rgba(0, 0, 0, 0.55);
  color: white;
  font-size: 11px;
}


/* =========================================================
   RESPONSIVE ADJUSTMENTS (MOBILE & TABLET)
   ========================================================= */

@media (max-width: 480px) {
  .siteplan-map {
    --map-edge: clamp(8px, 2.5vw, 12px);
    --tabbar-height: clamp(64px, 12vh, 75px);
  }

  .right-controls-stack {
    gap: clamp(5px, 1vh, 9px);
  }

  .control-minimap {
    bottom: calc(var(--tabbar-height) + env(safe-area-inset-bottom, 0px) + 8px);
  }
}

/* In landscape and short windows, keep controls in a compact bottom row. */
@media (max-height: 520px) and (orientation: landscape) {
  .siteplan-map {
    --tabbar-height: clamp(40px, 10vh, 56px);
  }

  .right-controls-stack {
    top: auto;
    right: var(--map-edge);
    bottom: calc(var(--tabbar-height) + env(safe-area-inset-bottom, 0px) + 8px);
    flex-direction: row;
    gap: clamp(4px, 1vw, 8px);
  }

  .control-minimap {
    bottom: calc(var(--tabbar-height) + env(safe-area-inset-bottom, 0px) + 8px);
  }

  .control-search {
    top: calc(env(safe-area-inset-top, 0px) + 8px);
  }
}

@media (max-width: 360px) {
  .right-controls-stack {
    right: max(var(--map-edge), env(safe-area-inset-right, 0px));
  }

  .control-search {
    left: max(var(--map-edge), env(safe-area-inset-left, 0px));
    right: max(var(--map-edge), env(safe-area-inset-right, 0px));
  }
}
</style>