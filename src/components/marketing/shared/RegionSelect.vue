<template>
  <div class="mk-filters">
    <label class="mk-field">
      <span>Provinsi asal</span>
      <select class="mk-input" :value="modelValue.province_code ?? ''" :disabled="loadingProvinces" @change="onProvince(($event.target as HTMLSelectElement).value)">
        <option value="">{{ loadingProvinces ? 'Memuat…' : 'Pilih provinsi' }}</option>
        <option v-for="p in provinces" :key="p.code" :value="p.code">{{ p.name }}</option>
      </select>
    </label>
    <label class="mk-field">
      <span>Kabupaten/Kota asal</span>
      <select class="mk-input" :value="modelValue.city_code ?? ''" :disabled="!modelValue.province_code || loadingCities" @change="onCity(($event.target as HTMLSelectElement).value)">
        <option value="">{{ loadingCities ? 'Memuat…' : 'Pilih kabupaten/kota' }}</option>
        <option v-for="c in cities" :key="c.code" :value="c.code">{{ c.name }}</option>
      </select>
    </label>
    <p v-if="error" class="mk-muted mk-danger-text">{{ error }}</p>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { getRegions } from '@/services/address/addressService'
import type { Region } from '@/types/address'

export interface RegionValue {
  province_code: string | null
  province_name: string | null
  city_code: string | null
  city_name: string | null
}

const props = defineProps<{ modelValue: RegionValue }>()
const emit = defineEmits<{ 'update:modelValue': [value: RegionValue] }>()

const provinces = ref<Region[]>([])
const cities = ref<Region[]>([])
const loadingProvinces = ref(false)
const loadingCities = ref(false)
const error = ref('')

async function loadCities(provinceCode: string | null) {
  cities.value = []
  const province = provinces.value.find((p) => p.code === provinceCode)
  if (!province) return
  loadingCities.value = true
  try {
    cities.value = await getRegions(2, province.id)
  } catch {
    error.value = 'Daftar kabupaten/kota gagal dimuat.'
  } finally {
    loadingCities.value = false
  }
}

async function onProvince(code: string) {
  const province = provinces.value.find((p) => p.code === code)
  emit('update:modelValue', {
    province_code: province?.code ?? null,
    province_name: province?.name ?? null,
    city_code: null,
    city_name: null,
  })
  await loadCities(province?.code ?? null)
}

function onCity(code: string) {
  const city = cities.value.find((c) => c.code === code)
  emit('update:modelValue', { ...props.modelValue, city_code: city?.code ?? null, city_name: city?.name ?? null })
}

onMounted(async () => {
  loadingProvinces.value = true
  try {
    provinces.value = await getRegions(1)
    if (props.modelValue.province_code) await loadCities(props.modelValue.province_code)
  } catch {
    error.value = 'Daftar provinsi gagal dimuat. Periksa koneksi.'
  } finally {
    loadingProvinces.value = false
  }
})
</script>
