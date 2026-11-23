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
            <ion-icon :icon="locationOutline" class="map-btn-icon" /> Buka Maps
          </a>
        </div>
      </div>
    </div>

    <!-- Daftar Tempat Terdekat Sesuai Referensi -->
    <div class="location-info">
      <div v-for="(item, idx) in nearbyPlaces" :key="idx">
        <ion-icon :icon="item.icon" />
        <span>{{ item.name }}</span>
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
    map = L.map(mapEl.value, { center, zoom: s.zoom, scrollWheelZoom: false, dragging: !L.Browser.mobile, touchZoom: true })
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
  background: #FFFFFF;
  border: 1px solid #E5E5E5;
  border-radius: 20px;
  overflow: hidden;
  box-shadow: 0 4px 20px rgba(26, 26, 26, 0.06);
}
.location-admin { display: flex; justify-content: flex-end; padding: 10px 12px 0; }
.location-empty { margin: 0; padding: 18px 16px; color: #6b6b6b; font-size: 11px; line-height: 1.5; }
.location-map {
  height: 240px; 
  padding: 12px;
  background: #FFFFFF;
}
.map-canvas { width: 100%; height: 100%; background: #F5F3EE; }
.map-actions { position: absolute; z-index: 500; top: 10px; left: 10px; display: flex; gap: 6px; }
.map-container {
  width: 100%;
  height: 100%;
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  border: 1px solid #E5E5E5;
}

/* Styling Tombol Melayang agar menyatu dengan nuansa kartu */
.map-float-btn {
  min-height: 36px;
  font-family: inherit;
  cursor: pointer;
  background: rgba(255, 255, 255, 0.95);
  color: #1A1A1A;
  font-size: 11px;
  font-weight: 600;
  padding: 6px 10px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
  display: flex;
  align-items: center;
  gap: 6px;
  text-decoration: none;
  backdrop-filter: blur(4px);
  border: 1px solid #E5E5E5;
  transition: background-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}

@media (hover: hover) and (pointer: fine) {
  .map-float-btn:hover {
    background: #FFFFFF;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
  }
}

.map-btn-icon {
  color: #556B2F;
  font-size: 14px;
}

.location-info {
  padding: 8px 16px 16px 16px;
}
.location-info > div {
  display: flex;
  align-items: center;
  min-height: 42px;
  gap: 10px;
  border-bottom: 1px solid #FAFAF7;
}
.location-info > div:last-child {
  border-bottom: 0;
}
.location-info ion-icon {
  color: #8CA072;
  font-size: 16px;
  min-width: 16px;
}
.location-info span {
  flex: 1;
  color: #2D2D2D;
  font-size: 11px;
  font-weight: 600;
}
.location-info small {
  color: #A7A7A7;
  font-size: 10px;
  font-weight: 500;
}
</style>