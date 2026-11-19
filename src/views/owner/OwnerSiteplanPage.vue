<template>
  <ion-page class="owner-siteplan-page">
    <AppHeader variant="owner" title="PoliLand Kairagi" back-label="Siteplan" back-route="/owner/kavling" />
    <ion-content class="owner-siteplan-content">
      <section class="map-stage" aria-label="Siteplan PoliLand">
        <SiteplanMap
          :lots="lots"
          :selected-lot="selectedLot ?? undefined"
          :hovered-lot="hoveredLot ?? undefined"
          :background="backgroundImage"
          :svg-raw="svgRaw"
          :rotation="0"
          :scale="1.15"
          @select="selectedLot = $event"
          @hover="hoveredLot = $event"
          @leave="hoveredLot = null"
        />
        <div v-if="loading" class="map-state">Memuat siteplan...</div>
        <div v-else-if="error" class="map-state map-error"><span>Siteplan gagal dimuat.</span><button type="button" @click="reload">Coba lagi</button></div>
        <article v-if="selectedLot" class="lot-inspector">
          <button class="inspector-close" type="button" aria-label="Tutup detail" @click="selectedLot = null">×</button>
          <div class="inspector-heading"><div><small>Detail kavling</small><h2>{{ selectedLot.lot_number || 'Kavling' }}</h2></div><span class="status-pill" :class="statusClass(selectedLot.status)">{{ getStatusLabel(selectedLot.status) }}</span></div>
          <div class="inspector-grid"><div><small>Blok</small><strong>{{ selectedLot.blocks?.code || selectedLot.blocks?.name || '—' }}</strong></div><div><small>Luas</small><strong>{{ selectedLot.area ? `${selectedLot.area} m²` : 'Belum diisi' }}</strong></div><div><small>Dimensi</small><strong>{{ selectedLot.dimension || 'Belum diisi' }}</strong></div><div><small>Harga</small><strong>{{ formatCurrency(selectedLot.promo_price || selectedLot.cash_price) }}</strong></div></div>
          <p v-if="normalizeLotStatus(selectedLot.status) === 'booking'" class="booking-note">Dipesan oleh {{ selectedLot.customers?.full_name || 'nama pemesan belum tercatat' }}<span v-if="selectedLot.booking_date"> · {{ dateLabel(selectedLot.booking_date) }}</span></p>
          <p v-else-if="normalizeLotStatus(selectedLot.status) === 'sold'" class="booking-note">Terjual kepada {{ selectedLot.customers?.full_name || 'nama pembeli belum tercatat' }}<span v-if="selectedLot.sold_date"> · {{ dateLabel(selectedLot.sold_date) }}</span></p>
        </article>
      </section>
    </ion-content>
    <MobileTabBar variant="owner" />
  </ion-page>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { IonContent, IonPage } from '@ionic/vue'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import SiteplanMap from '@/components/siteplan/SiteplanMap.vue'
import { useSiteplan } from '@/composables/useSiteplant'
import backgroundImage from '@/assets/siteplan/Siteplan.png'
import svgRaw from '@/assets/siteplan/LOTS_WITH_ID.svg?raw'
import type { SiteplanLot } from '@/services/siteplanService'
import { formatCurrency, getStatusLabel, normalizeLotStatus } from '@/utils/siteplan'

const { lots, loading, error, reload } = useSiteplan()
const selectedLot = ref<SiteplanLot | null>(null)
const hoveredLot = ref<SiteplanLot | null>(null)
function statusClass(status?: string) { return normalizeLotStatus(status) }
function dateLabel(value: string) { return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) }
</script>

<style scoped>
.owner-siteplan-page,.owner-siteplan-content{--background:var(--app-background,#faf9f6);font-family:var(--font-primary,var(--ion-font-family,sans-serif))}.map-stage{position:relative;width:100%;height:100%;min-height:400px;overflow:hidden;background:#d5dfb9}.map-stage :deep(.siteplan-map){width:100%;height:100%}.map-state{position:absolute;top:14px;left:50%;z-index:20;transform:translateX(-50%);padding:8px 12px;border:1px solid var(--border-default);border-radius:12px;color:var(--text-primary);background:#fff;font-size:12px;box-shadow:0 6px 18px rgb(37 37 37 / 12%)}.map-error{display:flex;align-items:center;gap:10px;color:#a83838}.map-error button{border:0;color:var(--poliland-gold-text);background:transparent;font:inherit;font-weight:700}.lot-inspector{position:absolute;right:12px;bottom:12px;left:12px;z-index:25;display:grid;gap:12px;padding:16px;border:1px solid var(--border-default);border-radius:18px;background:#fff;box-shadow:0 10px 32px rgb(37 37 37 / 18%)}.inspector-close{position:absolute;top:9px;right:11px;width:32px;height:32px;border:0;border-radius:50%;color:var(--text-secondary);background:var(--surface-muted);font-size:22px}.inspector-heading{display:flex;align-items:center;justify-content:space-between;gap:10px;padding-right:30px}.inspector-heading small,.inspector-grid small{color:var(--text-secondary);font-size:10px}.inspector-heading h2{margin:2px 0 0;color:var(--text-primary);font-size:19px}.status-pill{flex:0 0 auto;padding:6px 10px;border-radius:99px;color:var(--poliland-green);background:var(--status-success-bg);font-size:11px;font-weight:650}.status-pill.booking{color:var(--poliland-gold-text-soft);background:var(--poliland-gold-soft)}.status-pill.sold{color:#b12c2a;background:#ffe1df}.inspector-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:8px}.inspector-grid>div{display:grid;gap:3px;padding:9px;border-radius:11px;background:var(--surface-muted)}.inspector-grid strong{overflow-wrap:anywhere;color:var(--text-primary);font-size:12px}.booking-note{margin:0;padding-top:9px;border-top:1px solid var(--border-default);color:var(--text-secondary);font-size:11px;line-height:1.45}@media(min-width:650px){.lot-inspector{right:24px;bottom:24px;left:auto;width:min(410px,calc(100% - 48px));padding:20px}}
</style>
