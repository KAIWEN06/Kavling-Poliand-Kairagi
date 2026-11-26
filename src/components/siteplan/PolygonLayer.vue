<template>
  <div class="polygon-layer"></div>
</template>

<script setup lang="ts">
import { nextTick, watch, onBeforeUnmount, type PropType } from 'vue'
import { getLotId, getLotStatusColor, getStatusLabel } from '../../utils/siteplan'

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

  hoveredLot: {
    type: Object,
    default: null
  },

  rotation: {
    type: Number,
    default: 0
  },

  /** Kavling pada blok aktif; hanya ini yang bisa difokus keyboard. */
  focusIds: {
    type: Array as PropType<string[] | null>,
    default: null
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

/* Ukuran yang tetap sama di layar pada tingkat zoom apa pun (--cam-scale dari SiteplanMap). */
function screenPx(value: number) {
  return `calc(${value}px / var(--cam-scale, 1))`
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
    polygon.style.strokeWidth = screenPx(1.4)
    polygon.style.strokeLinejoin = 'round'
    polygon.style.strokeLinecap = 'round'
    polygon.style.vectorEffect = 'non-scaling-stroke'

    /**
     * Penting:
     * polygon harus bisa menerima pointer event.
     */
    polygon.style.pointerEvents = 'all'

    polygon.style.cursor = 'pointer'

  })

  renderLotLabels()
  applyFocus()
  renderOverlays()
}

function renderOverlays() {
  applyHover()
  renderSelectionLayer()
  renderHoverLayer()
  raiseLabels()
}

/* Nomor kavling selalu di atas lapisan sorotan. */
function raiseLabels() {
  const svg = getSvg()
  const labels = svg?.querySelector('#lot-label-layer')
  if (labels && labels !== svg.lastElementChild) svg.appendChild(labels)
}

let brightened: SVGElement | null = null

function applyHover() {
  if (brightened) brightened.style.filter = 'none'
  brightened = getPolygon(getSvg(), props.hoveredLot) as SVGElement | null
  if (brightened) brightened.style.filter = 'brightness(1.08)'
}

/**
 * Membuat kavling pada blok aktif bisa difokus dan dibuka dengan keyboard.
 * Peredupan ditangani FocusSpotlight, supaya SVG peta tidak digambar ulang.
 */
function applyFocus() {
  const svg = getSvg()

  if (!svg) return

  const focus = props.focusIds ? new Set(props.focusIds as string[]) : null

  props.lots.forEach((lot: any) => {
    const polygon = getPolygon(svg, lot) as SVGElement | null

    if (!polygon) return

    const id = getLotId(lot)
    if (focus?.has(id)) {
      polygon.setAttribute('tabindex', '0')
      polygon.setAttribute('role', 'button')
      polygon.setAttribute(
        'aria-label',
        `Kavling ${lot.lot_number || id}, ${getStatusLabel(lot.status)}`
      )
    } else {
      /* Fokus tidak lepas sendiri saat tabindex dibuang; garis fokusnya tertinggal. */
      if (document.activeElement === polygon) (polygon as SVGElement).blur()
      polygon.removeAttribute('tabindex')
      polygon.removeAttribute('role')
      polygon.removeAttribute('aria-label')
    }
  })
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

    const labelRotation =
      normalizeAngle(-props.rotation)

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

/**
 * Layer untuk kavling yang sedang dipilih.
 */
function renderSelectionLayer() {
  renderOverlay(
    'selection-layer',
    props.selectedLot,
    '#1F3519', // Hijau tua: tegas di atas semua warna status
    4,
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
    2.5,
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
  strokeWidth: number,
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

  // Salinan hanya garis tepi: isi bawaan dan atribut interaksi dibuang.
  for (const name of ['id', 'style', 'tabindex', 'role', 'aria-label', 'data-siteplan-lot', 'data-siteplan-lot-id']) {
    clone.removeAttribute(name)
  }

  clone.setAttribute(
    'fill',
    'none'
  )

  clone.setAttribute(
    'stroke',
    stroke
  )

  clone.style.strokeWidth = screenPx(strokeWidth)

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
      `drop-shadow(0 0 ${screenPx(8)} rgba(203,160,68,.95))`
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

      const keydown = (event: Event) => {
        const key = (event as KeyboardEvent).key
        if (key !== 'Enter' && key !== ' ') return
        event.preventDefault()
        emit('select', lot)
      }

      element.addEventListener('keydown', keydown)
      element.addEventListener('focus', enter)
      element.addEventListener('blur', leave)

      element.addEventListener(
        'mouseenter',
        enter
      )

      element.addEventListener(
        'mouseleave',
        leave
      )

      cleanupFunctions.push(() => {
        element.removeEventListener('keydown', keydown)
        element.removeEventListener('focus', enter)
        element.removeEventListener('blur', leave)

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

/* Gambar penuh hanya saat data atau rotasi berubah; hover dan pilihan cukup lapisan atas. */
watch(
  () => [props.container, props.lots, props.rotation],
  refresh,
  { deep: true, immediate: true }
)

watch(
  () => [props.selectedLot, props.hoveredLot],
  renderOverlays,
  { flush: 'post' }
)

watch(() => props.focusIds, applyFocus, { flush: 'post' })

onBeforeUnmount(() => {
  cleanupFunctions.forEach(
    (fn) => fn()
  )

  cleanupFunctions = []

})
</script>

<style scoped>
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