<template>
  <div class="polygon-layer"></div>
</template>

<script setup lang="ts">
import { nextTick, watch, onBeforeUnmount } from 'vue'
import { getLotId, getLotStatusColor } from '../../utils/siteplan'

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

  rotation: {
    type: Number,
    default: 0
  },

  deviceTilt: {
    type: Object,
    default: () => ({
      x: 0,
      y: 0,
      rotation: 0
    })
  }
})

const emit = defineEmits([
  'select',
  'hover',
  'leave'
])

let cleanupFunctions: Array<() => void> = []

/**
 * Jarak maksimum perpindahan jari
 * agar sebuah gesture masih dianggap TAP.
 *
 * Jika user bergerak lebih dari 10px,
 * maka dianggap PAN dan tidak select kavling.
 */
const TAP_THRESHOLD = 10

type PointerState = {
  startX: number
  startY: number
  target: Element | null
}

const pointerStates = new Map<number, PointerState>()
let multiPointerGesture = false

function normalizeAngle(angle: number) {
  let result = angle % 360

  if (result > 180) result -= 360
  if (result < -180) result += 360

  return result
}

function getSvg() {
  return props.container?.querySelector('.map-svg svg') || null
}

function getPolygon(
  svg: SVGSVGElement | null,
  lot: any
) {
  if (!svg || !lot) return null

  const id = getLotId(lot)

  if (!id) return null

  return (
    svg.querySelector(`#${CSS.escape(id)}`) ||
    svg.getElementById?.(id) ||
    null
  )
}

/**
 * Apply warna/status ke polygon kavling.
 */
function applyStyles() {
  const svg = getSvg()

  if (!svg) return

  props.lots.forEach((lot: any) => {
    const polygon = getPolygon(
      svg,
      lot
    ) as SVGElement | null

    if (!polygon) return

    polygon.setAttribute(
      'data-siteplan-lot',
      'true'
    )

    polygon.setAttribute(
      'data-siteplan-lot-id',
      getLotId(lot)
    )

    polygon.style.setProperty(
      'fill',
      getLotStatusColor(lot),
      'important'
    )

    // Disesuaikan dengan warna Gray (#6B6B6B) dari palette
    polygon.style.stroke = '#6B6B6B'
    polygon.style.strokeWidth = '1.2'
    polygon.style.strokeLinejoin = 'round'
    polygon.style.strokeLinecap = 'round'
    polygon.style.vectorEffect = 'non-scaling-stroke'

    /**
     * Penting:
     * polygon harus bisa menerima pointer event.
     */
    polygon.style.pointerEvents = 'all'

    polygon.style.cursor = 'pointer'

    const hovered =
      props.hoveredLot &&
      getLotId(props.hoveredLot) ===
        getLotId(lot)

    polygon.style.filter = hovered
      ? 'brightness(1.05)'
      : 'none'
  })

  renderLotLabels()
  renderSelectionLayer()
  renderPendingLayer()
  renderHoverLayer()
}

function renderLotLabels() {
  const svg = getSvg()

  if (!svg) return

  let layer = svg.querySelector(
    '#lot-label-layer'
  )

  if (!layer) {
    layer = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    )

    layer.setAttribute(
      'id',
      'lot-label-layer'
    )

    svg.appendChild(layer)
  }

  // Hapus label lama
  while (layer.firstChild) {
    layer.removeChild(
      layer.firstChild
    )
  }

  props.lots.forEach((lot: any) => {
    const polygon = getPolygon(
      svg,
      lot
    ) as SVGGraphicsElement | null

    if (!polygon) return

    const lotNumber =
      lot?.lot_number

    if (!lotNumber) return

    let bbox

    try {
      bbox = polygon.getBBox()
    } catch {
      return
    }

    const centerX =
      bbox.x + bbox.width / 2

    const centerY =
      bbox.y + bbox.height / 2

    /*
     * LOT_001 → 001
     * LOT_002 → 002
     */
    const labelText =
      String(lotNumber)
        .replace(
          /^LOT[_-]?/i,
          ''
        )

    const text =
      document.createElementNS(
        'http://www.w3.org/2000/svg',
        'text'
      )

    text.setAttribute(
      'x',
      String(centerX)
    )

    text.setAttribute(
      'y',
      String(centerY)
    )

    const tiltRotation =
      Number.isFinite(props.deviceTilt?.rotation)
        ? Number(props.deviceTilt.rotation)
        : 0

    const labelRotation =
      normalizeAngle(-props.rotation + tiltRotation)

    text.setAttribute(
      'transform',
      `rotate(${labelRotation} ${centerX} ${centerY})`
    )

    text.setAttribute(
      'text-anchor',
      'middle'
    )

    text.setAttribute(
      'dominant-baseline',
      'middle'
    )

    text.setAttribute(
      'font-size',
      '12'
    )

    text.setAttribute(
      'font-weight',
      '600'
    )

    // Disesuaikan dengan warna Charcoal (#1A1A1A) dari palette
    text.setAttribute(
      'fill',
      '#1A1A1A'
    )

    /*
     * Tidak menangkap pointer.
     * Event tetap masuk ke polygon.
     */
    text.setAttribute(
      'pointer-events',
      'none'
    )

    text.setAttribute(
      'user-select',
      'none'
    )

    text.textContent =
      labelText

    layer.appendChild(text)
  })
}

function renderPendingLayer() {
  const svg = getSvg()

  if (!svg) return

  let layer = svg.querySelector('#pending-layer')

  if (!layer) {
    layer = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    )

    layer.setAttribute('id', 'pending-layer')
    layer.setAttribute('pointer-events', 'none')
    svg.appendChild(layer)
  }

  while (layer.firstChild) {
    layer.removeChild(layer.firstChild)
  }

  if (!props.pendingLot) return

  const original = getPolygon(
    svg,
    props.pendingLot
  ) as SVGElement | null

  if (!original) return

  const clone = original.cloneNode(true) as SVGElement
  clone.removeAttribute('id')
  clone.removeAttribute('style')
  clone.setAttribute('class', 'siteplan-pending-lot')
  clone.setAttribute('fill', '#2F6FEB')
  clone.setAttribute('fill-opacity', '0.38')
  clone.setAttribute('stroke', '#2F6FEB')
  clone.setAttribute('stroke-width', '3')
  clone.setAttribute('stroke-dasharray', '6 4')
  clone.setAttribute('vector-effect', 'non-scaling-stroke')
  clone.setAttribute('pointer-events', 'none')

  layer.appendChild(clone)
}

/**
 * Layer untuk kavling yang sedang dipilih.
 */
function renderSelectionLayer() {
  renderOverlay(
    'selection-layer',
    props.selectedLot,
    '#8CA072', // Disesuaikan dengan warna Sage (#8CA072) dari palette
    '3',
    true
  )
}

/**
 * Layer untuk hover desktop.
 */
function renderHoverLayer() {
  renderOverlay(
    'hover-layer',
    props.hoveredLot,
    '#2D2D2D', // Disesuaikan dengan warna Slate (#2D2D2D) dari palette
    '2.5',
    false
  )
}

/**
 * Membuat overlay stroke di atas polygon.
 */
function renderOverlay(
  layerId: string,
  lot: any,
  stroke: string,
  strokeWidth: string,
  glow: boolean
) {
  const svg = getSvg()

  if (!svg) return

  let layer = svg.querySelector(
    `#${layerId}`
  )

  if (!layer) {
    layer = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'g'
    )

    layer.setAttribute(
      'id',
      layerId
    )

    svg.appendChild(layer)
  }

  while (layer.firstChild) {
    layer.removeChild(
      layer.firstChild
    )
  }

  if (!lot) return

  const original = getPolygon(
    svg,
    lot
  ) as SVGElement | null

  if (!original) return

  const clone =
    original.cloneNode(true) as SVGElement

  clone.removeAttribute('id')

  clone.setAttribute(
    'fill',
    'none'
  )

  clone.setAttribute(
    'stroke',
    stroke
  )

  clone.setAttribute(
    'stroke-width',
    strokeWidth
  )

  clone.setAttribute(
    'vector-effect',
    'non-scaling-stroke'
  )

  clone.setAttribute(
    'pointer-events',
    'none'
  )

  clone.setAttribute(
    'paint-order',
    'stroke'
  )

  if (glow) {
    clone.style.filter =
      'drop-shadow(0 0 6px rgba(140,160,114,.6))' // Disesuaikan dengan Sage glow
  }

  layer.appendChild(clone)
}

/**
 * Bind semua event ke polygon.
 *
 * Desktop:
 *   mouseenter / mouseleave
 *
 * Mobile:
 *   pointerdown / pointerup
 *
 * Kita sengaja tidak mengandalkan click,
 * karena click di Android WebView bisa
 * bentrok dengan gesture pan/zoom.
 */
function bindEvents() {
  cleanupFunctions.forEach(
    (fn) => fn()
  )

  cleanupFunctions = []

  const svg = getSvg()

  if (!svg) return

  const elements = props.lots
    .map((lot: any) => ({
      lot,
      element: getPolygon(svg, lot)
    }))
    .filter(
      (item) => item.element
    )

  /**
   * ============================
   * HOVER DESKTOP
   * ============================
   */
  elements.forEach(
    ({ lot, element }) => {
      if (!element) return

      const enter = () => {
        emit('hover', lot)
      }

      const leave = () => {
        emit('leave')
      }

      element.addEventListener(
        'mouseenter',
        enter
      )

      element.addEventListener(
        'mouseleave',
        leave
      )

      cleanupFunctions.push(() => {
        element.removeEventListener(
          'mouseenter',
          enter
        )

        element.removeEventListener(
          'mouseleave',
          leave
        )
      })
    }
  )

}

/**
 * Refresh SVG + events.
 */
async function refresh() {
  await nextTick()

  applyStyles()
  bindEvents()
}

watch(
  () => [
    props.container,
    props.lots,
    props.selectedLot,
    props.pendingLot,
    props.hoveredLot,
    props.rotation
  ],

  refresh,

  {
    deep: true,
    immediate: true
  }
)

onBeforeUnmount(() => {
  cleanupFunctions.forEach(
    (fn) => fn()
  )

  cleanupFunctions = []

})
</script>

<style scoped>
:deep(.siteplan-pending-lot) {
  animation: pending-lot-pulse 0.65s ease-in-out infinite alternate;
}

@keyframes pending-lot-pulse {
  from {
    fill-opacity: 0.18;
    stroke-dashoffset: 0;
  }

  to {
    fill-opacity: 0.62;
    stroke-dashoffset: 10;
  }
}

.polygon-layer {
  position: absolute;
  inset: 0;

  /**
   * Container layer tidak menangkap event.
   * Polygon SVG yang menangkap event.
   */
  pointer-events: none;

  z-index: 10;
}
</style>