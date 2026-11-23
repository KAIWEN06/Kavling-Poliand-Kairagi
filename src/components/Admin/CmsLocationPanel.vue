<template>
  <section class="cms-panel" aria-labelledby="location-title">
    <header class="panel-head">
      <div>
        <h2 id="location-title">Lokasi</h2>
        <p>Titik peta dan daftar tempat terdekat pada bagian Lokasi & Denah Kavling di Beranda.</p>
      </div>
      <button class="btn btn-primary" type="button" :disabled="saving || loading" @click="save">
        {{ saving ? 'Menyimpan…' : 'Simpan lokasi' }}
      </button>
    </header>

    <p v-if="loading" class="state" role="status">Memuat pengaturan lokasi…</p>
    <template v-else>
      <div class="map-block">
        <div class="fields coords">
          <label class="field">Lintang (latitude)
            <input v-model="latText" inputmode="decimal" placeholder="1.5107731">
          </label>
          <label class="field">Bujur (longitude)
            <input v-model="lngText" inputmode="decimal" placeholder="124.8848806">
          </label>
          <label class="field">Zoom peta (10–20)
            <input v-model.number="settings.zoom" type="number" min="10" max="20" inputmode="numeric">
          </label>
        </div>
        <p class="hint">Cara mengambil koordinat: buka Google Maps, tekan lama titik kavling, lalu salin dua angka yang muncul (lintang, bujur).</p>
        <p v-if="coordError" class="hint error" role="alert">{{ coordError }}</p>
        <div v-else class="map-frame">
          <iframe :src="previewUrl" title="Pratinjau peta lokasi kavling" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>
      </div>

      <div class="block-head">
        <h3>Tempat terdekat</h3>
        <button class="btn btn-secondary" type="button" :disabled="settings.places.length >= 10" @click="addPlace">Tambah tempat</button>
      </div>
      <p v-if="!settings.places.length" class="empty">Belum ada tempat terdekat. Bagian ini akan tampil tanpa daftar.</p>
      <ul class="place-list">
        <li v-for="(place, index) in settings.places" :key="index" class="place-item">
          <span class="place-icon" aria-hidden="true"><ion-icon :icon="resolvePlaceIcon(place.icon)" /></span>
          <div class="place-fields">
            <label class="field">Nama tempat
              <input v-model="place.name" maxlength="70" placeholder="Nama tempat atau akses">
            </label>
            <label class="field">Jarak / waktu tempuh
              <input v-model="place.time" maxlength="20" placeholder="± 5 menit">
            </label>
            <label class="field">Ikon
              <select v-model="place.icon">
                <option v-for="icon in PLACE_ICON_OPTIONS" :key="icon.key" :value="icon.key">{{ icon.label }}</option>
              </select>
            </label>
          </div>
          <div class="place-controls">
            <button class="icon-btn" type="button" :disabled="index === 0" aria-label="Naikkan urutan" @click="move(index, -1)">↑</button>
            <button class="icon-btn" type="button" :disabled="index === settings.places.length - 1" aria-label="Turunkan urutan" @click="move(index, 1)">↓</button>
            <button class="btn btn-danger" type="button" @click="removePlace(index)">Hapus</button>
          </div>
        </li>
      </ul>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { IonIcon } from '@ionic/vue'
import { contactsService } from '@/services/contactService'
import { PLACE_ICON_OPTIONS, resolvePlaceIcon } from '@/utils/cmsIcons'
import { DEFAULT_LOCATION_SETTINGS, mapEmbedUrl, type LocationSettings } from '@/utils/locationSettings'

const emit = defineEmits<{ notify: [message: string, type?: 'success' | 'error'] }>()

const loading = ref(true)
const saving = ref(false)
const settings = reactive<LocationSettings>(structuredClone(DEFAULT_LOCATION_SETTINGS))
const latText = ref(String(DEFAULT_LOCATION_SETTINGS.lat))
const lngText = ref(String(DEFAULT_LOCATION_SETTINGS.lng))

const parse = (text: string) => Number(text.trim().replace(',', '.'))
const coordError = computed(() => {
  const lat = parse(latText.value)
  const lng = parse(lngText.value)
  if (!latText.value.trim() || !lngText.value.trim() || !Number.isFinite(lat) || !Number.isFinite(lng)) return 'Isi lintang dan bujur dengan angka, contoh 1.5107731 dan 124.8848806.'
  if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return 'Koordinat di luar jangkauan. Lintang maksimal 90, bujur maksimal 180.'
  return ''
})
const zoomValue = computed(() => Math.min(20, Math.max(10, Math.round(Number(settings.zoom) || 17))))
const previewUrl = computed(() => coordError.value ? '' : mapEmbedUrl({ ...settings, lat: parse(latText.value), lng: parse(lngText.value), zoom: zoomValue.value }))

async function load() {
  try {
    Object.assign(settings, await contactsService.getLocationSettings())
    latText.value = String(settings.lat)
    lngText.value = String(settings.lng)
  } catch (error) {
    emit('notify', error instanceof Error ? error.message : 'Pengaturan lokasi gagal dimuat.', 'error')
  } finally {
    loading.value = false
  }
}

function addPlace() { settings.places.push({ icon: 'city', name: '', time: '' }) }
function removePlace(index: number) { settings.places.splice(index, 1) }
function move(index: number, step: -1 | 1) {
  const target = index + step
  if (target < 0 || target >= settings.places.length) return
  ;[settings.places[index], settings.places[target]] = [settings.places[target], settings.places[index]]
}

async function save() {
  if (coordError.value) return emit('notify', coordError.value, 'error')
  const places = settings.places.map((place) => ({ ...place, name: place.name.trim(), time: place.time.trim() }))
  const incomplete = places.findIndex((place) => (place.name && !place.time) || (!place.name && place.time))
  if (incomplete !== -1) return emit('notify', `Tempat nomor ${incomplete + 1} belum lengkap. Isi nama dan jarak, atau hapus.`, 'error')
  saving.value = true
  try {
    const payload: LocationSettings = { lat: parse(latText.value), lng: parse(lngText.value), zoom: zoomValue.value, places: places.filter((place) => place.name) }
    await contactsService.saveLocationSettings(payload)
    Object.assign(settings, payload)
    emit('notify', 'Lokasi tersimpan dan langsung tampil di Beranda.', 'success')
  } catch (error) {
    emit('notify', error instanceof Error ? error.message : 'Lokasi gagal disimpan.', 'error')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped src="./cmsPanel.css"></style>
<style scoped>
.coords { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.map-block { display: grid; gap: 10px; margin-bottom: 8px; }
.map-frame { aspect-ratio: 16 / 9; max-block-size: 320px; overflow: hidden; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-muted); }
.map-frame iframe { inline-size: 100%; block-size: 100%; border: 0; }
.hint.error { color: var(--status-danger); font-weight: 700; }
.block-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin: 22px 0 14px; padding-top: 20px; border-top: 1px solid var(--border-default); }
.block-head h3 { margin: 0; font-size: 16px; font-weight: 800; }
.place-list { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
.place-item { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; gap: 14px; align-items: start; padding: 14px; border: 1px solid var(--border-default); border-radius: var(--radius-control); }
.place-icon { display: grid; place-items: center; inline-size: 40px; block-size: 40px; border-radius: 10px; background: var(--status-success-bg); color: var(--poliland-green); font-size: 20px; }
.place-fields { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 10px; min-width: 0; }
.place-controls { display: flex; flex-direction: column; gap: 8px; }
.place-controls .icon-btn { align-self: flex-start; }
@media (max-width: 720px) {
  .coords { grid-template-columns: 1fr 1fr; }
  .place-item { grid-template-columns: 40px minmax(0, 1fr); }
  .place-fields { grid-template-columns: 1fr; }
  .place-controls { grid-column: 1 / -1; flex-direction: row; flex-wrap: wrap; align-items: center; }
}
</style>
