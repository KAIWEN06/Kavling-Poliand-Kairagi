<template>
  <div class="picker">
    <form class="search" role="search" @submit.prevent="runSearch">
      <ion-icon :icon="searchOutline" aria-hidden="true" />
      <input
        v-model="query"
        type="search"
        enterkeyhint="search"
        autocomplete="off"
        placeholder="Cari tempat atau alamat, mis. Politeknik Manado"
        aria-label="Cari lokasi"
        @input="onType"
      >
      <button type="submit" class="search-btn" :disabled="searching || query.trim().length < 3">{{ searching ? 'Mencari…' : 'Cari' }}</button>
    </form>

    <ul v-if="results.length" class="results" role="listbox" aria-label="Hasil pencarian">
      <li v-for="item in results" :key="item.place_id">
        <button type="button" role="option" class="result" @click="choose(item)">
          <ion-icon :icon="locationOutline" aria-hidden="true" />
          <span>{{ item.display_name }}</span>
        </button>
      </li>
    </ul>
    <p v-else-if="searchMessage" class="msg" role="status">{{ searchMessage }}</p>

    <div class="map-wrap">
      <div ref="mapEl" class="map" aria-label="Peta untuk menandai lokasi"></div>
      <div class="map-tools">
        <button type="button" class="tool" :aria-pressed="satellite" @click="toggleBase">{{ satellite ? 'Peta' : 'Satelit' }}</button>
        <button type="button" class="tool" :disabled="locating" @click="useMyLocation">{{ locating ? 'Mencari…' : 'Lokasi saya' }}</button>
      </div>
    </div>

    <p class="hint">Ketuk peta atau geser pin merah untuk menandai titik kavling.</p>
    <p v-if="addressLabel" class="selected"><ion-icon :icon="pinOutline" aria-hidden="true" /> {{ addressLabel }}</p>
  </div>
</template>

<script setup lang="ts">
import { nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { IonIcon } from '@ionic/vue'
import { locationOutline, pinOutline, searchOutline } from 'ionicons/icons'
import { L, baseLayers, pinIcon } from '@/utils/leafletMap'

interface Point { lat: number; lng: number; zoom: number }
interface Place { place_id: number; display_name: string; lat: string; lon: string }

const props = defineProps<{ modelValue: Point }>()
const emit = defineEmits<{ 'update:modelValue': [value: Point] }>()

const NOMINATIM = 'https://nominatim.openstreetmap.org'
const mapEl = ref<HTMLElement | null>(null)
const query = ref('')
const results = ref<Place[]>([])
const searching = ref(false)
const searchMessage = ref('')
const addressLabel = ref('')
const satellite = ref(true)
const locating = ref(false)

let map: L.Map | null = null
let marker: L.Marker | null = null
let typeTimer: number | undefined
let reverseTimer: number | undefined
let ignoreExternal = false

let layers: L.TileLayer[] = []

function applyBase() {
  if (!map) return
  layers.forEach((layer) => layer.remove())
  layers = baseLayers(satellite.value)
  layers.forEach((layer) => layer.addTo(map!))
}

function toggleBase() { satellite.value = !satellite.value; applyBase() }

function publish(lat: number, lng: number) {
  ignoreExternal = true
  emit('update:modelValue', { lat: Number(lat.toFixed(7)), lng: Number(lng.toFixed(7)), zoom: map ? map.getZoom() : props.modelValue.zoom })
  window.clearTimeout(reverseTimer)
  reverseTimer = window.setTimeout(() => void reverse(lat, lng), 500)
}

function place(lat: number, lng: number, move = true) {
  if (!map) return
  if (!marker) {
    marker = L.marker([lat, lng], { icon: pinIcon, draggable: true, keyboard: true, title: 'Pin lokasi kavling' }).addTo(map)
    marker.on('dragend', () => { const p = marker!.getLatLng(); publish(p.lat, p.lng) })
  } else marker.setLatLng([lat, lng])
  if (move) map.panTo([lat, lng])
  publish(lat, lng)
}

async function reverse(lat: number, lng: number) {
  try {
    const res = await fetch(`${NOMINATIM}/reverse?format=jsonv2&accept-language=id&lat=${lat}&lon=${lng}`)
    if (!res.ok) throw new Error()
    const data = await res.json()
    addressLabel.value = data?.display_name ?? ''
  } catch {
    addressLabel.value = ''
  }
}

async function runSearch() {
  const q = query.value.trim()
  if (q.length < 3) return
  searching.value = true
  searchMessage.value = ''
  results.value = []
  try {
    const res = await fetch(`${NOMINATIM}/search?format=jsonv2&limit=6&countrycodes=id&accept-language=id&q=${encodeURIComponent(q)}`)
    if (!res.ok) throw new Error()
    results.value = await res.json()
    if (!results.value.length) searchMessage.value = 'Tempat tidak ditemukan. Coba kata kunci lain atau ketuk langsung di peta.'
  } catch {
    searchMessage.value = 'Pencarian gagal. Periksa koneksi internet, atau ketuk langsung di peta.'
  } finally {
    searching.value = false
  }
}

/** Cari otomatis setelah berhenti mengetik (jeda panjang agar sesuai batas layanan pencarian gratis). */
function onType() {
  window.clearTimeout(typeTimer)
  searchMessage.value = ''
  if (query.value.trim().length < 3) { results.value = []; return }
  typeTimer = window.setTimeout(runSearch, 900)
}

function choose(item: Place) {
  results.value = []
  query.value = item.display_name.split(',').slice(0, 2).join(',')
  const lat = Number(item.lat)
  const lng = Number(item.lon)
  map?.setView([lat, lng], Math.max(map.getZoom(), 17))
  place(lat, lng, false)
}

function useMyLocation() {
  if (!navigator.geolocation) { searchMessage.value = 'Perangkat tidak mendukung penentuan lokasi.'; return }
  locating.value = true
  navigator.geolocation.getCurrentPosition(
    (pos) => { locating.value = false; map?.setView([pos.coords.latitude, pos.coords.longitude], 18); place(pos.coords.latitude, pos.coords.longitude, false) },
    () => { locating.value = false; searchMessage.value = 'Lokasi perangkat tidak bisa dibaca. Izinkan akses lokasi atau cari manual.' },
    { enableHighAccuracy: true, timeout: 10000 },
  )
}

onMounted(async () => {
  await nextTick()
  if (!mapEl.value) return
  map = L.map(mapEl.value, { center: [props.modelValue.lat, props.modelValue.lng], zoom: props.modelValue.zoom, zoomControl: true })
  applyBase()
  place(props.modelValue.lat, props.modelValue.lng, false)
  map.on('click', (event: L.LeafletMouseEvent) => place(event.latlng.lat, event.latlng.lng, false))
  map.on('zoomend', () => { if (marker) publish(marker.getLatLng().lat, marker.getLatLng().lng) })
  // Ukuran wadah bisa berubah saat modal selesai animasi.
  window.setTimeout(() => map?.invalidateSize(), 400)
})

watch(() => [props.modelValue.lat, props.modelValue.lng], ([lat, lng]) => {
  if (ignoreExternal) { ignoreExternal = false; return }
  if (!map) return
  map.setView([lat, lng], props.modelValue.zoom)
  place(lat, lng, false)
})

onBeforeUnmount(() => {
  window.clearTimeout(typeTimer)
  window.clearTimeout(reverseTimer)
  map?.remove()
  map = null
})
</script>

<style scoped>
.picker { display: grid; gap: 10px; }
.search { display: flex; align-items: center; gap: 8px; padding: 4px 4px 4px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); }
.search:focus-within { border-color: var(--poliland-green); outline: 3px solid color-mix(in srgb, var(--poliland-green) 25%, transparent); }
.search ion-icon { flex: none; color: var(--text-secondary); font-size: 18px; }
.search input { flex: 1; min-width: 0; min-height: 40px; border: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 14px; outline: none; }
.search-btn { flex: none; min-height: 40px; padding: 0 14px; border: 0; border-radius: 9px; background: var(--poliland-green); color: #fff; font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
.search-btn:disabled { opacity: .5; cursor: not-allowed; }

.results { display: grid; grid-auto-rows: max-content; margin: 0; padding: 4px; list-style: none; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); max-height: 220px; overflow: auto; }
.result { display: flex; align-items: flex-start; gap: 8px; width: 100%; min-height: 44px; padding: 8px 10px; border: 0; border-radius: 8px; background: transparent; color: var(--text-primary); font: inherit; font-size: 13px; line-height: 1.4; text-align: left; cursor: pointer; }
.result:active, .result:hover { background: var(--status-success-bg); }
.result ion-icon { flex: none; margin-top: 2px; color: var(--poliland-green); }
.msg { margin: 0; color: var(--text-secondary); font-size: 12px; line-height: 1.5; }

.map-wrap { position: relative; isolation: isolate; border: 1px solid var(--border-default); border-radius: var(--radius-control); overflow: hidden; }
.map { height: 320px; background: var(--surface-muted); }
.map-tools { position: absolute; z-index: 500; top: 10px; right: 10px; display: grid; gap: 6px; }
.tool { min-height: 36px; padding: 0 12px; border: 1px solid var(--border-default); border-radius: 9px; background: rgb(255 255 255 / 95%); color: var(--text-primary); font: inherit; font-size: 12px; font-weight: 700; box-shadow: 0 2px 8px rgb(0 0 0 / 18%); cursor: pointer; }
.tool:disabled { opacity: .6; }
.hint { margin: 0; color: var(--text-secondary); font-size: 12px; line-height: 1.5; }
.selected { display: flex; align-items: flex-start; gap: 6px; margin: 0; padding: 10px 12px; border-radius: var(--radius-control); background: var(--status-success-bg); color: var(--poliland-green); font-size: 12px; font-weight: 600; line-height: 1.5; }
.selected ion-icon { flex: none; margin-top: 2px; }
</style>
