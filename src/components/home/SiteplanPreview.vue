<template>
  <div class="siteplan-preview-card">
    <div class="siteplan-header">
      <h3>Temukan kaveling Anda</h3>
      <span class="header-icon"><ion-icon :icon="mapOutline" aria-hidden="true" /></span>
    </div>

    <div class="mini-siteplan">
      <img
        :src="siteplanImage"
        alt="Denah kavling PoliLand Kairagi"
        class="siteplan-image"
      />
      <div
        ref="previewSvgContainer"
        class="siteplan-layer"
        v-html="svgRaw"
      />
    </div>

    <ul class="siteplan-legend" aria-label="Status kaveling">
      <li><i class="available"></i> Tersedia</li>
      <li><i class="booking"></i> Dipesan</li>
      <li><i class="sold"></i> Terjual</li>
    </ul>

    <button class="primary-btn" type="button" @click="$emit('goToSiteplan')">
      Lihat denah kaveling
      <ion-icon :icon="arrowForwardOutline" aria-hidden="true" />
    </button>
  </div>
</template>

<script setup lang="ts">
import { IonIcon } from '@ionic/vue'
import { mapOutline, arrowForwardOutline } from 'ionicons/icons'
import siteplanImage from '@/assets/siteplan/Siteplan.webp'
import { nextTick, ref, watch } from 'vue'
import svgRaw from '@/assets/siteplan/LOTS_WITH_ID.svg?raw'
import { getLotId, getLotStatusColor } from '@/utils/siteplan'

const props = defineProps<{
  lots?: any[]
}>()

defineEmits(['goToSiteplan'])

const previewSvgContainer = ref<HTMLElement | null>(null)

function renderPreviewLayers() {
  const svg = previewSvgContainer.value?.querySelector('svg')

  if (!svg) return

  props.lots?.forEach((lot) => {
    const id = getLotId(lot)
    const polygon = svg.querySelector(`#${CSS.escape(id)}`) as SVGElement | null

    if (!polygon) return

    polygon.style.setProperty('fill', getLotStatusColor(lot), 'important')
    polygon.style.setProperty('stroke', '#A7A7A7', 'important')
    polygon.style.setProperty('stroke-width', '1.2', 'important')
  })

  const oldLabels = svg.querySelector('#home-lot-label-layer')
  oldLabels?.remove()

  const labelLayer = document.createElementNS(
    'http://www.w3.org/2000/svg',
    'g'
  )

  labelLayer.setAttribute('id', 'home-lot-label-layer')

  props.lots?.forEach((lot) => {
    const id = getLotId(lot)
    const polygon = svg.querySelector(`#${CSS.escape(id)}`) as SVGGraphicsElement | null
    const lotNumber = lot?.lot_number

    if (!polygon || !lotNumber) return

    const box = polygon.getBBox()
    const label = document.createElementNS(
      'http://www.w3.org/2000/svg',
      'text'
    )

    label.setAttribute('x', String(box.x + box.width / 2))
    label.setAttribute('y', String(box.y + box.height / 2))
    label.setAttribute('text-anchor', 'middle')
    label.setAttribute('dominant-baseline', 'middle')
    label.setAttribute('font-size', '12')
    label.setAttribute('font-weight', '700')
    label.setAttribute('fill', '#1A1A1A')
    label.setAttribute('pointer-events', 'none')
    label.textContent = String(lotNumber).replace(/^LOT[_-]?/i, '')

    labelLayer.appendChild(label)
  })

  svg.appendChild(labelLayer)
}

watch(
  () => props.lots,
  async () => {
    await nextTick()
    renderPreviewLayers()
  },
  { deep: true, immediate: true }
)
</script>

<style scoped>
.siteplan-preview-card { margin-top: 14px; padding: 18px; overflow: hidden; border: 1px solid var(--border-default, #eae7e0); border-radius: var(--radius-panel, 20px); background: var(--surface-primary, #fff); box-shadow: var(--shadow-sm); }
.siteplan-header { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 16px; }
.siteplan-header h3 { margin: 0; color: var(--text-primary, #252525); font-family: var(--font-display, 'Fraunces Variable', Georgia, serif); font-size: 22px; line-height: 1.15; font-weight: 650; letter-spacing: -0.01em; }
.header-icon { display: grid; place-items: center; flex: 0 0 44px; width: 44px; height: 44px; border-radius: 14px; background: var(--green-100, #e8eee4); color: var(--poliland-green, #355a2c); font-size: 22px; }
.mini-siteplan { position: relative; display: flex; align-items: center; justify-content: center; width: 100%; aspect-ratio: 1252 / 1257; padding: 10px; overflow: hidden; border-radius: 14px; background: var(--pl-paper, #f9f5ec); }
.siteplan-image, .siteplan-layer { position: absolute; inset: 10px; width: calc(100% - 20px); height: calc(100% - 20px); border-radius: 8px; }
.siteplan-image { display: block; object-fit: contain; }
.siteplan-layer { pointer-events: none; }
.siteplan-layer :deep(svg) { display: block; width: 100%; height: 100%; overflow: visible; }
.siteplan-layer :deep(path) { vector-effect: non-scaling-stroke; }
.siteplan-legend { display: flex; flex-wrap: wrap; gap: 8px 18px; margin: 14px 0 0; padding: 0; list-style: none; }
.siteplan-legend li { display: flex; align-items: center; gap: 7px; color: var(--text-secondary, #5f5f66); font-size: 13px; font-weight: 600; }
.siteplan-legend i { width: 10px; height: 10px; border-radius: 50%; }
.siteplan-legend .available { background: #2e7d32; }
.siteplan-legend .booking { background: #f2a900; }
.siteplan-legend .sold { background: #d32f2f; }

.primary-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  width: 100%;
  min-height: 52px;
  margin-top: 16px;
  border: 0;
  border-radius: 14px;
  background: var(--poliland-gold, #cba044);
  color: var(--ink, #1b1f1a);
  font: 800 15px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  box-shadow: 0 12px 26px -10px rgba(203, 160, 68, 0.85);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-base) var(--ease-spring);
}
.primary-btn ion-icon { font-size: 20px; }
.primary-btn:active { transform: scale(0.97); }
.primary-btn:focus-visible { outline: 3px solid var(--poliland-green, #355a2c); outline-offset: 3px; }

@media (prefers-reduced-motion: reduce) {
  .primary-btn:active { transform: none; }
}
</style>
