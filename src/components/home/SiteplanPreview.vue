<template>
  <div class="siteplan-preview-card">
    <div class="siteplan-header">
      <div>
        <span class="eyebrow">SITEPLAN INTERAKTIF</span>
        <h3>Temukan Kavling Anda</h3>
      </div>
      <ion-icon :icon="mapOutline" />
    </div>

    <div class="mini-siteplan">
      <img
        :src="siteplanImage"
        alt="Siteplan PoliLand Kairagi"
        class="siteplan-image"
      />
      <div
        ref="previewSvgContainer"
        class="siteplan-layer"
        v-html="svgRaw"
      />
    </div>

    <div class="siteplan-legend">
      <span><i class="available"></i> Tersedia</span>
      <span><i class="booking"></i> Dipesan</span>
      <span><i class="sold"></i> Terjual</span>
    </div>

    <ion-button class="primary-button full-button" @click="$emit('goToSiteplan')">
      Lihat Siteplan
      <ion-icon slot="end" :icon="arrowForwardOutline" />
    </ion-button>
  </div>
</template>

<script setup lang="ts">
import { IonButton, IonIcon } from '@ionic/vue'
import { mapOutline, arrowForwardOutline } from 'ionicons/icons'
import siteplanImage from '@/assets/siteplan/Siteplan.png'
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
.eyebrow { display: block; margin-bottom: 6px; color: #8CA072; font-size: 9px; font-weight: 800; letter-spacing: 1px; }
.siteplan-preview-card { margin-top: 14px; padding: 16px; background: #FFFFFF; border: 1px solid #E5E5E5; border-radius: 15px; overflow: hidden; box-shadow: 0 4px 15px rgba(26, 26, 26, 0.04); }
.siteplan-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 15px; }
.siteplan-header h3 { margin: 2px 0 0; color: #1A1A1A; font-size: 15px; font-weight: 800; }
.siteplan-header > ion-icon { color: #8CA072; font-size: 22px; }
.mini-siteplan { position: relative; display: flex; align-items: center; justify-content: center; width: 100%; aspect-ratio: 1252 / 1257; padding: 10px; border-radius: 10px; background: #FAFAF7; overflow: hidden; }
.siteplan-image, .siteplan-layer { position: absolute; inset: 10px; width: calc(100% - 20px); height: calc(100% - 20px); border-radius: 8px; }
.siteplan-image { display: block; object-fit: contain; }
.siteplan-layer { pointer-events: none; }
.siteplan-layer :deep(svg) { display: block; width: 100%; height: 100%; overflow: visible; }
.siteplan-layer :deep(path) { vector-effect: non-scaling-stroke; }
.siteplan-legend { display: flex; flex-wrap: wrap; gap: 13px; margin-top: 13px; }
.siteplan-legend span { display: flex; align-items: center; gap: 5px; color: #6B6B6B; font-size: 9px; }
.siteplan-legend i { width: 7px; height: 7px; border-radius: 50%; }
.siteplan-legend .available { background: #2E7D32; }
.siteplan-legend .booking { background: #F2A900; }
.siteplan-legend .sold { background: #D32F2F; }
.primary-button { --background: #B8860B; --background-hover: #9e7309; --color: #FFFFFF; --border-radius: 9px; font-weight: 700; }
.full-button { width: 100%; margin: 14px 0 0; min-height: 42px; font-size: 11px; }
</style>