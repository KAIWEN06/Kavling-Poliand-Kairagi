<template>
  <div
    ref="mapRoot"
    :class="['siteplan-map', { 'detail-open': !!selectedLot, 'search-active': isSearchActive, focused: !!activeBlock }]"
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
        ref="world"
        :class="['map-world', { 'is-moving': isFlying || isDragging }]"
      >
        <img
          :src="background"
          class="map-background"
          draggable="false"
        />

        <SiteplanScenery />

        <SiteplanTraffic
          :width="mapWidth"
          :height="mapHeight"
          :paused="isFlying || isDragging || !!dragState"
        />

        <div
          ref="lineLayer"
          class="map-svg"
          v-html="svgRaw"
        />

        <!-- Peredup di luar blok aktif, lalu di sekitar kavling terpilih -->
        <FocusSpotlight
          :container="mapRoot"
          :ids="activeBlock?.lotIds ?? null"
          :view-box="mapViewBox"
          :strength="0.42"
        />
        <FocusSpotlight
          :container="mapRoot"
          :ids="selectedLotIds"
          :view-box="mapViewBox"
          :strength="0.22"
        />

        <PolygonLayer
          :container="mapRoot ?? null"
          :lots="lots"
          :selected-lot="selectedLot"
          :hovered-lot="hoveredLot"
          :focus-ids="activeBlock?.lotIds ?? null"
          :rotation="currentRotation"
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

      <BlockMarkers
        :markers="blockMarkers"
        @select="$emit('select-block', $event)"
      />

      <!-- SEARCH (Kiri/Atas) -->
      <div class="control-search">
        <SearchBox
          :lots="lots"
          @select="$emit('search-select', $event)"
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
      <Transition name="level-swap" mode="out-in">
      <div v-if="activeBlock" key="level" class="control-level">
        <SiteplanLevelBar
          :block="activeBlock"
          @back="$emit('overview')"
        />
      </div>
      <div v-else key="minimap" class="control-minimap">
        <MiniMap
          :lots="lots"
          :background="background"
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
      </Transition>

    </div>
  </div>
</template>
<script setup lang="ts">
import {
  computed,
  ref,
  watch,
  onMounted,
  onBeforeUnmount,
  type PropType
} from 'vue'

import BlockMarkers from './BlockMarkers.vue'
import FocusSpotlight from './FocusSpotlight.vue'
import SiteplanLevelBar from './SiteplanLevelBar.vue'
import {
  advanceClock,
  createFlight,
  frameRect,
  reachesBlockZoom,
  worldToScreen,
  zoomAround,
  type Camera,
  type Rect
} from '../../utils/siteplanCamera'
import { getLotId } from '../../utils/siteplan'
import { findBlockOfLot, pickViewedBlockKey, type SiteplanBlock } from '../../utils/siteplanBlocks'

import SiteplanLegend from './SiteplanLegend.vue'
import PolygonLayer from './PolygonLayer.vue'
import Compass from './Compass.vue'
import ZoomControl from './ZoomControl.vue'
import MiniMap from './MiniMap.vue'
import SearchBox from './SearchBox.vue'
import SiteplanScenery from './SiteplanScenery.vue'
import SiteplanTraffic from './SiteplanTraffic.vue'


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

  blocks: {
    type: Array as PropType<SiteplanBlock[]>,
    default: () => []
  },

  activeBlock: {
    type: Object as PropType<SiteplanBlock | null>,
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
  'map-click',
  'select-block',
  'view-block',
  'overview',
  'zoomed-out',
  'search-select'
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
   SCALE
   ========================================================= */

const isMaxScale = computed(() => {
  return currentScale.value >= props.maxScale
})

const isMinScale = computed(() => {
  return currentScale.value <= props.minScale
})


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


/* =========================================================
   CAMERA
   ========================================================= */

const world = ref<HTMLElement | null>(null)
const isFlying = ref(false)
const mapReady = ref(false)

let flightFrame = 0
let flightCamera: Camera | null = null

/* Tujuan animasi yang sedang berjalan, agar ketukan zoom beruntun menumpuk. */
let flightTarget: Camera | null = null

function toTransform(camera: Camera) {
  return `translate(${camera.panX}px, ${camera.panY}px) scale(${camera.scale}) rotate(${camera.rotation}deg)`
}

const camera = computed<Camera>(() => ({
  panX: pan.value.x,
  panY: pan.value.y,
  scale: currentScale.value,
  rotation: currentRotation.value
}))

const selectedLotIds = computed(() => {
  const id = props.selectedLot ? getLotId(props.selectedLot as any) : ''
  return id ? [id] : null
})

const lineLayer = ref<HTMLElement | null>(null)

/*
 * Satu-satunya penulis transform peta. Sengaja tanpa :style di template: render
 * ulang Vue di tengah animasi akan menimpa posisi dengan posisi awal.
 */
function renderTransform(next: Camera) {
  if (world.value) world.value.style.transform = toTransform(next)
}

/* Dipakai tebal garis agar tidak ikut membesar saat di-zoom. Mahal: jangan per frame. */
function renderLineScale(scale: number) {
  lineLayer.value?.style.setProperty('--cam-scale', String(scale))
}

function renderCamera(next: Camera) {
  renderTransform(next)
  renderLineScale(next.scale)
}

/* Untuk gestur dan perubahan langsung; selama penerbangan, loop animasi yang menulis. */
watch(
  camera,
  (next) => {
    if (!flightFrame) renderCamera(next)
  },
  { flush: 'post' }
)

function commitCamera(next: Camera) {
  pan.value = { x: next.panX, y: next.panY }
  currentScale.value = next.scale
  currentRotation.value = next.rotation
}

/** Menghentikan animasi dan menetapkan posisi yang sedang terlihat. */
function stopFlight() {
  if (!flightFrame) return
  cancelAnimationFrame(flightFrame)
  flightFrame = 0
  if (flightCamera) commitCamera(flightCamera)
  flightCamera = null
  flightTarget = null
  isFlying.value = false
}

/**
 * Selama animasi, transform ditulis langsung ke DOM (tanpa render ulang Vue
 * tiap frame). State reaktif baru diperbarui setelah selesai.
 */
function flyTo(target: Camera, maxDuration = Infinity) {
  stopFlight()

  const reduceMotion =
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

  if (reduceMotion || !world.value) {
    commitCamera(target)
    renderCamera(target)
    return
  }

  const flight = createFlight(camera.value, target, {
    width: mapWidth.value,
    height: mapHeight.value
  })
  const duration = Math.min(flight.duration, maxDuration)

  isFlying.value = true
  flightTarget = target

  /*
   * Tebal garis ditetapkan sekali di awal memakai skala terbesar, sehingga
   * garis tidak pernah menebal berlipat lalu menyusut mendadak saat berhenti.
   */
  renderLineScale(Math.max(camera.value.scale, target.scale))

  let elapsed = 0
  let previous = 0

  const step = (now: number) => {
    if (previous) elapsed = advanceClock(elapsed, now - previous)
    previous = now
    const progress = Math.min(1, elapsed / duration)
    flightCamera = flight.at(progress)
    renderTransform(flightCamera)

    if (progress < 1) {
      flightFrame = requestAnimationFrame(step)
      return
    }

    flightFrame = 0
    flightCamera = null
    flightTarget = null
    commitCamera(target)
    renderCamera(target)
    isFlying.value = false
  }

  flightFrame = requestAnimationFrame(step)
}

/* Kotak pembatas gabungan bentuk SVG, dalam koordinat viewBox. */
function boundsOf(ids: string[]): Rect | null {
  const svg = mapRoot.value?.querySelector<SVGSVGElement>('.map-svg svg')
  if (!svg) return null

  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity

  for (const id of ids) {
    const shape = svg.querySelector<SVGGraphicsElement>(`#${CSS.escape(id)}`)
    if (!shape?.getBBox) continue
    const box = shape.getBBox()
    if (!box.width) continue
    minX = Math.min(minX, box.x)
    minY = Math.min(minY, box.y)
    maxX = Math.max(maxX, box.x + box.width)
    maxY = Math.max(maxY, box.y + box.height)
  }

  return Number.isFinite(minX)
    ? { x: minX, y: minY, width: maxX - minX, height: maxY - minY }
    : null
}

/* Harus sama dengan media query panel samping di DetailPanel.vue. */
const SIDE_PANEL_QUERY =
  '(min-width: 900px), (orientation: landscape) and (max-height: 520px)'

/* Area peta yang tidak tertutup pencarian, bilah level, atau panel detail. */
function focusInsets(hasLot: boolean) {
  const width = mapWidth.value
  const height = mapHeight.value
  const short = height < 520

  if (!hasLot) {
    return {
      top: short ? 80 : 96,
      right: short ? 72 : 20,
      bottom: short ? 92 : 190,
      left: 20
    }
  }

  if (window.matchMedia?.(SIDE_PANEL_QUERY).matches) {
    return {
      top: 24,
      right: Math.min(420, width * 0.52),
      bottom: 24,
      left: 24
    }
  }

  /* Sheet menempel di dasar layar, sedangkan peta mulai di bawah header aplikasi. */
  const screenHeight = window.innerHeight
  const sheetTop = screenHeight - Math.min(screenHeight * 0.66, 640)
  const mapBottom = viewport.value?.getBoundingClientRect().bottom ?? screenHeight

  return {
    top: 16,
    right: 24,
    bottom: Math.max(0, Math.min(mapBottom - sheetTop, height - 120)),
    left: 24
  }
}

function focusCamera(rotation = currentRotation.value): Camera | null {
  const lotId = props.selectedLot ? getLotId(props.selectedLot as any) : ''
  const ids = lotId ? [lotId] : props.activeBlock?.lotIds ?? []
  if (!ids.length) return null

  const bounds = boundsOf(ids)
  return bounds ? frameBounds(bounds, !!lotId, rotation) : null
}

function frameBounds(bounds: Rect, isLot: boolean, rotation: number): Camera {
  /* Kavling tunggal diberi ruang agar tetangganya tetap terlihat. */
  const grow = isLot ? 0.45 : 0.04

  return frameRect(
    {
      x: bounds.x - bounds.width * grow,
      y: bounds.y - bounds.height * grow,
      width: bounds.width * (1 + grow * 2),
      height: bounds.height * (1 + grow * 2)
    },
    {
      size: { width: mapWidth.value, height: mapHeight.value },
      viewBox: mapViewBox.value,
      rotation,
      insets: focusInsets(isLot),
      minScale: props.minScale,
      maxScale: props.maxScale
    }
  )
}

/* Pengguna sudah melihat blok ini sedekat tampilan blok, entah lewat cubit, roda, atau tombol zoom. */
function isZoomedIntoBlock(bounds: Rect) {
  return reachesBlockZoom(
    currentScale.value,
    frameBounds(bounds, false, currentRotation.value).scale,
    props.scale
  )
}

function selectTappedLot(lot: any) {
  const block = findBlockOfLot(props.blocks, lot)
  const bounds = block ? boundsOf(block.lotIds) : null
  emit('select', lot, !!bounds && isZoomedIntoBlock(bounds))
}

function homeCamera(): Camera {
  return {
    panX: 0,
    panY: 0,
    scale: props.scale,
    rotation: currentRotation.value
  }
}

/* Skala saat blok dibingkai; zoom keluar jauh di bawahnya berarti keluar dari blok. */
let blockScale = 0

/* Dipakai saat pengguna sendiri yang zoom keluar: posisinya tidak ditimpa animasi. */
let keepCameraOnce = false

watch(
  () => [
    props.activeBlock?.key ?? '',
    props.selectedLot ? getLotId(props.selectedLot as any) : ''
  ].join('|'),
  () => {
    if (keepCameraOnce) {
      keepCameraOnce = false
      return
    }

    const target = focusCamera()
    if (!target) blockScale = 0
    else if (!props.selectedLot) blockScale = target.scale
    flyTo(target ?? homeCamera())
  },
  { flush: 'post' }
)

function hasZoomedOutOfBlock() {
  if (!props.activeBlock || blockScale <= 0) return false

  /* Kembali ke zoom awal juga berarti keluar, termasuk untuk blok yang lebar. */
  const backHome =
    currentScale.value <= props.scale && blockScale > props.scale * 1.2

  return backHome || currentScale.value < blockScale * 0.55
}

/* Blok di tengah area peta yang tidak tertutup pencarian dan bilah level. */
function blockAtCenter(): SiteplanBlock | null {
  const size = { width: mapWidth.value, height: mapHeight.value }
  const insets = focusInsets(false)
  const centerX = (insets.left + size.width - insets.right) / 2
  const centerY = (insets.top + size.height - insets.bottom) / 2

  const distances = props.blocks.flatMap((block) =>
    block.lotIds.flatMap((id) => {
      const bounds = boundsOf([id])
      if (!bounds) return []

      const point = worldToScreen(
        bounds.x + bounds.width / 2,
        bounds.y + bounds.height / 2,
        camera.value,
        size,
        mapViewBox.value
      )

      return [{ key: block.key, distance: Math.hypot(point.x - centerX, point.y - centerY) }]
    })
  )

  const key = pickViewedBlockKey(
    distances,
    props.activeBlock?.key ?? null,
    Math.min(size.width, size.height) / 2
  )

  return props.blocks.find((block) => block.key === key) ?? null
}

/*
 * Setelah pengguna sendiri menggeser atau zoom, keterangan blok mengikuti yang
 * terlihat. Kamera tidak ikut digerakkan.
 */
function syncViewedBlock() {
  if (props.selectedLot) return

  if (hasZoomedOutOfBlock()) {
    blockScale = 0
    keepCameraOnce = true
    emit('zoomed-out')
    return
  }

  const block = blockAtCenter()
  if (!block || block.key === props.activeBlock?.key) return

  const bounds = boundsOf(block.lotIds)
  if (!bounds) return

  /* Dari tampilan keseluruhan, blok baru disebut setelah zoom setingkat blok. */
  if (!props.activeBlock && !isZoomedIntoBlock(bounds)) return

  blockScale = Math.min(
    frameBounds(bounds, false, currentRotation.value).scale,
    currentScale.value
  )
  keepCameraOnce = true
  emit('view-block', block.key)
}

/* Penanda blok hanya ada di level keseluruhan dan saat peta diam. */
const blockMarkers = computed(() => {
  if (
    !mapReady.value ||
    props.activeBlock ||
    props.selectedLot ||
    isFlying.value ||
    isDragging.value ||
    isSearchActive.value
  ) {
    return []
  }

  const size = { width: mapWidth.value, height: mapHeight.value }

  return props.blocks.flatMap((block) => {
    const bounds = boundsOf(block.lotIds)
    /* Sedekat tampilan blok, penanda hanya menutupi kavling dan menarik kamera mundur. */
    if (!bounds || isZoomedIntoBlock(bounds)) return []

    const point = worldToScreen(
      bounds.x + bounds.width / 2,
      bounds.y + bounds.height / 2,
      camera.value,
      size,
      mapViewBox.value
    )

    return [{ ...block, ...point }]
  })
})


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
    renderCamera(camera.value)
    mapReady.value = true

    mapResizeObserver =
      new ResizeObserver(() => {
        /* Halaman tersembunyi (tab lain, panorama) berukuran 0: abaikan. */
        if ((viewport.value?.clientWidth ?? 0) < 2) return

        const width = mapWidth.value
        const height = mapHeight.value
        updateMapSize()
        if (width === mapWidth.value && height === mapHeight.value) return

        /* Rotasi layar: bingkai ulang fokus. */
        const target = focusCamera()
        if (!target) return

        /* Ukuran berubah di tengah penerbangan: belokkan, jangan loncat. */
        if (flightFrame) flyTo(target)
        else commitCamera(target)
      })

    mapResizeObserver.observe(
      viewport.value
    )
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

  } catch {
    // The pointer capture may already have been released.
  }
}


/* =========================================================
   POINTER DOWN
   ========================================================= */

function onPointerDown(
  event: PointerEvent
) {

  if (isFromControls(event.target)) {
    return
  }

  stopFlight()

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

  } catch {
    // Pointer capture may fail if the pointer is no longer active.
  }


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


    const ratio =
      distance /
      pinchState.value.distance

    const nextScale =
      Number.isFinite(ratio) && ratio > 0
        ? clamp(
            currentScale.value * ratio,
            props.minScale,
            props.maxScale
          )
        : currentScale.value

    const point = toViewportPoint(center.x, center.y)

    commitCamera(
      zoomAround(
        {
          ...camera.value,
          panX: pan.value.x + (center.x - pinchState.value.centerX),
          panY: pan.value.y + (center.y - pinchState.value.centerY)
        },
        nextScale,
        point.x,
        point.y
      )
    )


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
        selectTappedLot(lot)
      }

    }, 0)
  }


  if (
    activePointers.size === 0
  ) {

    resetGestureState()
    if (!wasSingleTap) syncViewedBlock()

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

  stopFlight()

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


  syncViewedBlock()

  emit(
    'map-click',
    payload
  )
}


/* =========================================================
   ZOOM
   ========================================================= */

const BUTTON_ZOOM_MS = 260
const BUTTON_ZOOM_FACTOR = 1.35

function toViewportPoint(clientX: number, clientY: number) {
  const box = viewport.value?.getBoundingClientRect()
  return box
    ? {
        x: clientX - box.left - box.width / 2,
        y: clientY - box.top - box.height / 2
      }
    : { x: 0, y: 0 }
}

let exitTimer = 0

function zoomBy(factor: number) {
  const base = flightTarget ?? camera.value
  const next = clamp(base.scale * factor, props.minScale, props.maxScale)
  flyTo(zoomAround(base, next, 0, 0), BUTTON_ZOOM_MS)
  window.clearTimeout(exitTimer)
  exitTimer = window.setTimeout(syncViewedBlock, BUTTON_ZOOM_MS + 60)
}

function zoomIn() {
  zoomBy(BUTTON_ZOOM_FACTOR)
}

function zoomOut() {
  zoomBy(1 / BUTTON_ZOOM_FACTOR)
}

/* "Pas layar" dan "reset" juga mengembalikan level ke siteplan keseluruhan. */
function showWholeMap(target: Camera) {
  if (props.activeBlock) {
    blockScale = 0
    keepCameraOnce = true
    emit('overview')
  }

  flyTo(target)
}

function fitToView() {
  showWholeMap({ ...homeCamera(), scale: 1 })
}

function resetView() {
  showWholeMap({ ...homeCamera(), rotation: props.rotation })
}


/* =========================================================
   ROTATE
   ========================================================= */

function rotate() {
  const base = flightTarget ?? camera.value
  const rotation = (base.rotation + 90) % 360

  /* Putar di sekitar tengah layar; saat terfokus, bingkai ulang fokusnya. */
  const turned: Camera = {
    ...base,
    rotation,
    panX: -base.panY,
    panY: base.panX
  }

  flyTo(focusCamera(rotation) ?? turned, 480)

  emit('rotate', rotation)
}


/* =========================================================
   WHEEL
   ========================================================= */

function handleWheel(event: WheelEvent) {
  if (isFromControls(event.target)) return

  event.preventDefault()
  stopFlight()

  const next = clamp(
    currentScale.value * (event.deltaY > 0 ? 0.88 : 1.14),
    props.minScale,
    props.maxScale
  )

  const point = toViewportPoint(event.clientX, event.clientY)
  commitCamera(zoomAround(camera.value, next, point.x, point.y))
  syncViewedBlock()
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

  cancelAnimationFrame(flightFrame)
  window.clearTimeout(exitTimer)

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
}

/* Hanya selama bergerak; setelah diam, browser merender ulang agar peta tajam. */
.map-world.is-moving {
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

.map-svg :deep([data-siteplan-lot]:focus) {
  outline: none;
}

.map-svg :deep([data-siteplan-lot]:focus-visible) {
  stroke: #1f3519 !important;
  stroke-width: calc(4px / var(--cam-scale, 1)) !important;
  stroke-dasharray: calc(6px / var(--cam-scale, 1));
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
  transition: opacity var(--dur-fast) var(--ease-out), visibility var(--dur-fast) var(--ease-out);
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
  top: calc(var(--safe-top) + 12px);
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
  bottom: calc(var(--tabbar-height) + var(--safe-bottom) + 8px);
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
  bottom: calc(var(--tabbar-height) + var(--safe-bottom) + 12px);
  max-width: calc(100vw - 2 * var(--map-edge));
  z-index: 10;
  pointer-events: auto;
}


/* Bilah level menggantikan minimap saat sebuah blok dibuka. */
.control-level {
  position: absolute;
  left: var(--map-edge);
  right: calc(var(--map-edge) + 60px);
  bottom: calc(var(--tabbar-height) + var(--safe-bottom) + 8px);
  z-index: 110;
  pointer-events: auto;
}

.siteplan-map.search-active .control-level {
  display: none;
}

/* Bilah level menyusul setelah kamera mulai bergerak. */
.level-swap-enter-active {
  transition:
    opacity var(--dur-base) var(--ease-out) 200ms,
    translate var(--dur-slow) var(--ease-out) 200ms;
}

.level-swap-leave-active {
  transition: opacity var(--dur-instant) linear;
}

.level-swap-enter-from,
.level-swap-leave-to {
  opacity: 0;
}

.level-swap-enter-from {
  translate: 0 12px;
}

@media (prefers-reduced-motion: reduce) {
  .level-swap-enter-from {
    translate: 0 0;
  }
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
    bottom: calc(var(--tabbar-height) + var(--safe-bottom) + 8px);
  }
}

/* In landscape and short windows, keep controls in a compact bottom row. */
@media (max-height: 520px) and (orientation: landscape) {
  .siteplan-map {
    --tabbar-height: clamp(40px, 10vh, 56px);
  }

  /* Layar pendek: bilah level pindah ke atas, di samping tombol cari. */
  .control-level {
    top: calc(var(--safe-top) + 8px);
    right: auto;
    bottom: auto;
    left: calc(var(--map-edge) + 60px);
    width: min(340px, 60vw);
  }

  .right-controls-stack {
    top: auto;
    right: var(--map-edge);
    bottom: calc(var(--tabbar-height) + var(--safe-bottom) + 8px);
    flex-direction: row;
    gap: clamp(4px, 1vw, 8px);
  }

  .control-minimap {
    bottom: calc(var(--tabbar-height) + var(--safe-bottom) + 8px);
  }

  .control-search {
    top: calc(var(--safe-top) + 8px);
  }
}

@media (max-width: 360px) {
  .right-controls-stack {
    right: max(var(--map-edge), var(--safe-right));
  }

  .control-search {
    left: max(var(--map-edge), var(--safe-left));
    right: max(var(--map-edge), var(--safe-right));
  }
}
</style>
