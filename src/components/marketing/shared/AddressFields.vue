<template>
  <div class="address-fields">
    <label class="mk-field">
      <span>Negara <b aria-hidden="true">*</b></span>
      <select class="mk-input" :value="modelValue.country_code" @change="onCountry(inputValue($event))">
        <option v-for="country in countryOptions" :key="country.code" :value="country.code">{{ country.name }}</option>
      </select>
    </label>

    <div v-if="isIndonesia" class="address-grid">
      <label class="mk-field">
        <span>Provinsi <b aria-hidden="true">*</b></span>
        <select class="mk-input" :value="modelValue.province_code" @change="onRegion(1, inputValue($event))">
          <option value="">Pilih provinsi</option>
          <option v-for="r in provinces" :key="r.code" :value="r.code">{{ r.name }}</option>
        </select>
      </label>
      <label class="mk-field">
        <span>Kabupaten/Kota <b aria-hidden="true">*</b></span>
        <select class="mk-input" :value="modelValue.city_code" :disabled="!modelValue.province_code || loading" @change="onRegion(2, inputValue($event))">
          <option value="">Pilih kabupaten/kota</option>
          <option v-for="r in cities" :key="r.code" :value="r.code">{{ r.name }}</option>
        </select>
      </label>
      <label class="mk-field">
        <span>Kecamatan <em>(opsional)</em></span>
        <select class="mk-input" :value="modelValue.district_code" :disabled="!modelValue.city_code || loading" @change="onRegion(3, inputValue($event))">
          <option value="">Pilih kecamatan</option>
          <option v-for="r in districts" :key="r.code" :value="r.code">{{ r.name }}</option>
        </select>
      </label>
      <label class="mk-field">
        <span>Desa/Kelurahan <em>(opsional)</em></span>
        <select class="mk-input" :value="modelValue.village_code" :disabled="!modelValue.district_code || loading" @change="onRegion(4, inputValue($event))">
          <option value="">Pilih desa/kelurahan</option>
          <option v-for="r in villages" :key="r.code" :value="r.code">{{ r.name }}</option>
        </select>
      </label>
    </div>

    <div v-else class="address-grid">
      <label class="mk-field">
        <span>Province/State <b aria-hidden="true">*</b></span>
        <input class="mk-input" :value="modelValue.province_name" placeholder="Province / State" @input="patch({ province_name: inputValue($event) })" />
      </label>
      <label class="mk-field">
        <span>City <b aria-hidden="true">*</b></span>
        <input class="mk-input" :value="modelValue.city_name" placeholder="City" @input="patch({ city_name: inputValue($event) })" />
      </label>
      <label class="mk-field">
        <span>District/Area <em>(opsional)</em></span>
        <input class="mk-input" :value="modelValue.district_name" placeholder="District / Area" @input="patch({ district_name: inputValue($event) })" />
      </label>
    </div>

    <p v-if="loading" class="mk-muted" role="status">Memuat data wilayah…</p>
    <AppNotice v-if="error" tone="error">
      {{ error }}
      <button type="button" class="mk-link" @click="sync">Coba lagi</button>
    </AppNotice>

    <label class="mk-field">
      <span>Detail alamat <em>(opsional)</em></span>
      <textarea
        class="mk-input"
        rows="3"
        autocomplete="street-address"
        :value="modelValue.street_address"
        placeholder="Nama jalan, nomor rumah, gedung, dan detail lainnya"
        @input="patch({ street_address: inputValue($event) })"
      />
    </label>
  </div>
</template>

<script setup lang="ts">
import AppNotice from '@/components/ui/AppNotice.vue'
import { computed, ref, watch } from 'vue'
import { getRegions } from '@/services/address/addressService'
import type { Region } from '@/types/address'
import { COUNTRIES, type AddressValue } from '@/utils/address'

const props = defineProps<{ modelValue: AddressValue }>()
const emit = defineEmits<{ 'update:modelValue': [value: AddressValue] }>()

const isIndonesia = computed(() => props.modelValue.country_code === 'ID')
/* Data dari Admin bisa memakai negara di luar daftar; tetap ditampilkan apa adanya. */
const countryOptions = computed(() =>
  COUNTRIES.some((c) => c.code === props.modelValue.country_code)
    ? COUNTRIES
    : [...COUNTRIES, { code: props.modelValue.country_code, name: props.modelValue.country_name || props.modelValue.country_code }],
)

const provinces = ref<Region[]>([])
const cities = ref<Region[]>([])
const districts = ref<Region[]>([])
const villages = ref<Region[]>([])
const loading = ref(false)
const error = ref('')

const cache = new Map<string, Region[]>()
async function fetchRegions(level: 1 | 2 | 3 | 4, parentId?: number) {
  const key = `${level}:${parentId ?? ''}`
  const hit = cache.get(key)
  if (hit) return hit
  const rows = await getRegions(level, parentId)
  cache.set(key, rows)
  return rows
}

/* Daftar pilihan selalu diturunkan dari kode terpilih, baik saat diisi maupun saat mengubah data lama. */
let run = 0
async function sync() {
  const current = ++run
  error.value = ''
  if (!isIndonesia.value) {
    loading.value = false
    return
  }
  const codes = [props.modelValue.province_code, props.modelValue.city_code, props.modelValue.district_code]
  const lists = [provinces, cities, districts, villages]
  loading.value = true
  try {
    let parent: Region | undefined
    for (let index = 0; index < lists.length; index += 1) {
      if (index > 0) {
        parent = lists[index - 1].value.find((r) => r.code === codes[index - 1])
        if (!parent) {
          lists[index].value = []
          continue
        }
      }
      const rows = await fetchRegions((index + 1) as 1 | 2 | 3 | 4, parent?.id)
      if (current !== run) return
      lists[index].value = rows
    }
  } catch {
    if (current === run) error.value = 'Data wilayah gagal dimuat.'
  } finally {
    if (current === run) loading.value = false
  }
}

watch(
  () => [props.modelValue.country_code, props.modelValue.province_code, props.modelValue.city_code, props.modelValue.district_code].join('|'),
  sync,
  { immediate: true },
)

function inputValue(event: Event) {
  return (event.target as HTMLInputElement).value
}

function patch(changes: Partial<AddressValue>) {
  emit('update:modelValue', { ...props.modelValue, ...changes })
}

const NO_VILLAGE = { village_code: '', village_name: '' }
const NO_DISTRICT = { district_code: '', district_name: '', ...NO_VILLAGE }
const NO_CITY = { city_code: '', city_name: '', ...NO_DISTRICT }

function onCountry(code: string) {
  patch({
    country_code: code,
    country_name: countryOptions.value.find((c) => c.code === code)?.name ?? '',
    province_code: '',
    province_name: '',
    ...NO_CITY,
  })
}

/* Memilih tingkat atas mengosongkan semua tingkat di bawahnya. */
function onRegion(level: 1 | 2 | 3 | 4, code: string) {
  const list = [provinces, cities, districts, villages][level - 1].value
  const region = list.find((r) => r.code === code)
  const picked = { code: region?.code ?? '', name: region?.name ?? '' }
  if (level === 1) patch({ province_code: picked.code, province_name: picked.name, ...NO_CITY })
  else if (level === 2) patch({ city_code: picked.code, city_name: picked.name, ...NO_DISTRICT })
  else if (level === 3) patch({ district_code: picked.code, district_name: picked.name, ...NO_VILLAGE })
  else patch({ village_code: picked.code, village_name: picked.name })
}
</script>

<style scoped>
.address-fields { display: grid; gap: var(--space-3); min-width: 0; }
.address-fields p { margin: 0; }
.address-fields b { color: var(--status-danger); }
.address-fields em { color: var(--text-secondary); font-style: normal; font-weight: 500; }
.address-grid { display: grid; grid-template-columns: minmax(0, 1fr); gap: var(--space-3); }
/* Titik pindah sama dengan halaman akun Client: satu kolom di ponsel. */
@media (min-width: 521px) { .address-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
</style>
