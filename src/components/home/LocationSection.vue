<template>
  <div v-if="settings || isAdmin" class="location-card">
    <div v-if="isAdmin" class="location-admin">
      <AdminEditButton label="Edit lokasi" @click="editOpen = true" />
    </div>
    <p v-if="!settings" class="location-empty">Lokasi belum diatur. Tekan “Edit lokasi” untuk menambahkan titik peta.</p>
    <template v-else>
    <!-- Peta Satelit Interaktif (Bisa di-zoom, digeser, & tombol Buka Maps) -->
    <div class="location-map">
      <div class="map-container">
        <div ref="mapEl" class="map-canvas" role="img" aria-label="Peta lokasi kavling PoliLand Kairagi"></div>
        <div class="map-actions">
          <button type="button" class="map-float-btn" :aria-pressed="satellite" @click="toggleBase">{{ satellite ? 'Peta' : 'Satelit' }}</button>
          <a :href="openUrl" target="_blank" rel="noopener noreferrer" class="map-float-btn">
            <ion-icon :icon="locationOutline" class="map-btn-icon" aria-hidden="true" /> Buka Maps
          </a>
        </div>
      </div>
    </div>

    <!-- Daftar Tempat Terdekat Sesuai Referensi -->
    <div class="location-info">
      <div v-for="(item, idx) in nearbyPlaces" :key="idx">
        <span class="place-icon"><ion-icon :icon="item.icon" aria-hidden="true" /></span>
        <span class="place-name">{{ item.name }}</span>
        <small>{{ item.time }}</small>
      </div>
    </div>
    </template>

    <CmsPanelModal v-model="editOpen" title="Edit lokasi" panel="location" @saved="load" />
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { IonIcon } from '@ionic/vue'
import { locationOutline } from 'ionicons/icons'
import { contactsService } from '@/services/contactService'
import { resolvePlaceIcon } from '@/utils/cmsIcons'
import { mapOpenUrl, type LocationSettings } from '@/utils/locationSettings'
import { L, baseLayers, pinIcon } from '@/utils/leafletMap'
import { useCmsAdmin } from '@/composables/useCmsAdmin'
import AdminEditButton from '@/components/Admin/AdminEditButton.vue'
import CmsPanelModal from '@/components/Admin/CmsPanelModal.vue'

/** Koordinat peta dan daftar tempat terdekat dikelola Admin (tab Lokasi). Kosong sampai Admin mengisinya. */
const settings = ref<LocationSettings | null>(null)
const editOpen = ref(false)
const { isAdmin } = useCmsAdmin()
const mapEl = ref<HTMLElement | null>(null)
const satellite = ref(true)
let map: L.Map | null = null
let marker: L.Marker | null = null
let layers: L.TileLayer[] = []
const openUrl = computed(() => (settings.value ? mapOpenUrl(settings.value) : '#'))
const nearbyPlaces = computed(() => (settings.value?.places ?? []).map((place) => ({ ...place, icon: resolvePlaceIcon(place.icon) })))

async function load() {
  try { settings.value = await contactsService.getLocationSettings() } catch (error) { console.error('Gagal mengambil lokasi:', error) }
}
onMounted(load)

function applyBase() {
  if (!map) return
  layers.forEach((layer) => layer.remove())
  layers = baseLayers(satellite.value)
  layers.forEach((layer) => layer.addTo(map!))
}
function toggleBase() { satellite.value = !satellite.value; applyBase() }

/** Peta hanya dibuat saat ada data lokasi; di layar sentuh, peta tidak menahan gulir halaman (geser dengan dua jari). */
async function renderMap() {
  const s = settings.value
  await nextTick()
  if (!s || !mapEl.value) return
  const center: L.LatLngExpression = [s.lat, s.lng]
  if (!map) {
    map = L.map(mapEl.value, { center, zoom: s.zoom, scrollWheelZoom: false, dragging: !L.Browser.mobile, touchZoom: true, zoomControl: false })
    /* Zoom di kanan bawah agar tidak menumpuk dengan tombol Peta/Satelit dan Buka Maps di kiri atas. */
    L.control.zoom({ position: 'bottomright', zoomInTitle: 'Perbesar', zoomOutTitle: 'Perkecil' }).addTo(map)
    applyBase()
    marker = L.marker(center, { icon: pinIcon, interactive: false }).addTo(map)
    window.setTimeout(() => map?.invalidateSize(), 300)
  } else {
    map.setView(center, s.zoom)
    marker?.setLatLng(center)
  }
}
watch(settings, renderMap)
onBeforeUnmount(() => { map?.remove(); map = null })
</script>

<style scoped>
.location-card {
  overflow: hidden;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
  box-shadow: var(--shadow-sm);
}
.location-admin { display: flex; justify-content: flex-end; padding: 10px 12px 0; }
.location-empty { margin: 0; padding: 18px 16px; color: var(--text-secondary, #5f5f66); font-size: 14px; line-height: 1.55; }
.location-map { height: 260px; padding: 12px; }
.map-canvas { width: 100%; height: 100%; background: var(--surface-sunken, #f0ede5); }
.map-actions { position: absolute; z-index: 500; top: 10px; left: 10px; display: flex; gap: 8px; }
.map-container { position: relative; width: 100%; height: 100%; overflow: hidden; border: 1px solid var(--border-default, #eae7e0); border-radius: 16px; }

.map-float-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 14px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.96);
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
  box-shadow: var(--shadow-sm);
  color: var(--text-primary, #252525);
  font: 700 13px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  text-decoration: none;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-base) var(--ease-spring);
}
.map-float-btn:active { transform: scale(0.96); }
.map-float-btn:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 2px; }
.map-btn-icon { color: var(--poliland-green, #355a2c); font-size: 16px; }

/* Kontrol zoom Leaflet: tombol 44px bernuansa PoliLand */
.map-canvas :deep(.leaflet-bottom.leaflet-right) { margin: 0 10px 10px 0; }
.map-canvas :deep(.leaflet-control-zoom) {
  overflow: hidden;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: 12px;
  box-shadow: var(--shadow-sm);
}
.map-canvas :deep(.leaflet-control-zoom a) {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  line-height: 1;
  background: rgba(255, 255, 255, 0.96);
  color: var(--poliland-green, #355a2c);
  font-size: 22px;
  font-weight: 700;
  touch-action: manipulation;
}
.map-canvas :deep(.leaflet-control-zoom a + a) { border-top: 1px solid var(--border-default, #eae7e0); }
.map-canvas :deep(.leaflet-control-zoom a:active) { background: var(--green-100, #e8eee4); }
.map-canvas :deep(.leaflet-control-zoom a:focus-visible) { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: -3px; }

.location-info { padding: 4px 16px 14px; }
.location-info > div { display: flex; align-items: center; gap: 12px; min-height: 52px; border-bottom: 1px solid var(--border-default, #eae7e0); }
.location-info > div:last-child { border-bottom: 0; }
.place-icon { display: grid; place-items: center; flex: 0 0 36px; width: 36px; height: 36px; border-radius: 11px; background: var(--green-100, #e8eee4); color: var(--poliland-green, #355a2c); font-size: 18px; }
.place-name { flex: 1; color: var(--text-primary, #252525); font-size: 15px; font-weight: 600; line-height: 1.35; }
.location-info small { color: var(--text-secondary, #5f5f66); font-size: 13px; font-weight: 600; white-space: nowrap; }

@media (prefers-reduced-motion: reduce) {
  .map-float-btn:active { transform: none; }
}
</style>
