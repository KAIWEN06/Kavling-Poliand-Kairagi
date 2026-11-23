<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonButton,
  IonContent,
  IonIcon,
  IonInput,
  IonItem,
  IonLabel,
  IonPage,
  IonSkeletonText,
  IonSpinner,
  IonTextarea,
  IonSelect,
  IonSelectOption,
} from '@ionic/vue'
import {
  alertCircleOutline,
  cameraOutline,
  checkmarkCircleOutline,
  logOutOutline,
  personCircleOutline,
  saveOutline,
} from 'ionicons/icons'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import { authService } from '@/services/auth/authService'
import { supabase } from '@/services/config/supabase'
import { profileService } from '@/services/profile/profileService'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { getRegions, getRegionByCode } from '@/services/address/addressService'
import type { Region } from '@/types/address'

const router = useRouter()

const isLoading = ref(true)
const isSaving = ref(false)
const isLoggingOut = ref(false)
const showLogoutConfirm = ref(false)
const profileError = ref('')
const logoutError = ref('')
const successMessage = ref('')
const userId = ref('')
const customerId = ref<number | null>(null)
const authEmail = ref('')
const avatarUrl = ref('')
const sharedUser = useCurrentUser()
const avatarInput = ref<HTMLInputElement | null>(null)
const isUploadingAvatar = ref(false)

const form = reactive({
  full_name: '',
  phone: '',
  whatsapp_phone: '',
  email: '',

  country_code: 'ID',
  country_name: 'Indonesia',

  province_code: '',
  province_name: '',

  city_code: '',
  city_name: '',

  district_code: '',
  district_name: '',

  village_code: '',
  village_name: '',

  street_address: '',
})

const provinces = ref<Region[]>([])
const cities = ref<Region[]>([])
const districts = ref<Region[]>([])
const villages = ref<Region[]>([])
const regionsLoading = ref(false)

const isIndonesia = computed(() => form.country_code === 'ID')
const countries = [
  { code: 'ID', name: 'Indonesia' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AU', name: 'Australia' },
  { code: 'US', name: 'United States' },
  { code: 'JP', name: 'Japan' },
]

const missingFields = computed(() => {
  const missing: string[] = []
  if (!form.full_name.trim()) missing.push('Nama lengkap')
  if (!form.phone.trim()) missing.push('Nomor HP')
  if (!form.whatsapp_phone.trim()) missing.push('Nomor WhatsApp')
  if (!form.street_address.trim()) missing.push('Detail alamat')
  if (isIndonesia.value) {
    if (!form.province_code) missing.push('Provinsi')
    if (!form.city_code) missing.push('Kabupaten/Kota')
    if (!form.district_code) missing.push('Kecamatan')
    if (!form.village_code) missing.push('Desa/Kelurahan')
  } else {
    if (!form.province_name.trim()) missing.push('Province/State')
    if (!form.city_name.trim()) missing.push('City')
  }
  return missing
})

const isProfileComplete = computed(() => missingFields.value.length === 0)
const canSubmit = computed(() => missingFields.value.length === 0 && !isSaving.value)

function normalizePhone(value: string): string {
  return value.trim().replace(/[^\d+]/g, '')
}

async function loadRegions(level: 1 | 2 | 3 | 4, parentId?: number | null) {
  regionsLoading.value = true
  try {
    return await getRegions(level, parentId)
  } finally {
    regionsLoading.value = false
  }
}

function resetAddressFields() {
  form.province_code = ''
  form.province_name = ''
  form.city_code = ''
  form.city_name = ''
  form.district_code = ''
  form.district_name = ''
  form.village_code = ''
  form.village_name = ''

  cities.value = []
  districts.value = []
  villages.value = []
}

async function selectProvince(code: string) {
  const region = provinces.value.find((item) => item.code === code)
  resetAddressFields()
  form.province_code = region?.code ?? ''
  form.province_name = region?.name ?? ''
  if (!region) return

  try {
    cities.value = await loadRegions(2, region.id)
  } catch (error: any) {
    console.error('Gagal memuat kabupaten/kota:', error)
    profileError.value = error?.message || 'Gagal memuat kabupaten/kota.'
  }
}

async function selectCity(code: string) {
  const region = cities.value.find((item) => item.code === code)
  form.city_code = region?.code ?? ''
  form.city_name = region?.name ?? ''
  form.district_code = ''
  form.district_name = ''
  form.village_code = ''
  form.village_name = ''
  districts.value = []
  villages.value = []
  if (!region) return

  try {
    districts.value = await loadRegions(3, region.id)
  } catch (error: any) {
    console.error('Gagal memuat kecamatan:', error)
    profileError.value = error?.message || 'Gagal memuat kecamatan.'
  }
}

async function selectDistrict(code: string) {
  const region = districts.value.find((item) => item.code === code)
  form.district_code = region?.code ?? ''
  form.district_name = region?.name ?? ''
  form.village_code = ''
  form.village_name = ''
  villages.value = []
  if (!region) return

  try {
    villages.value = await loadRegions(4, region.id)
  } catch (error: any) {
    console.error('Gagal memuat desa/kelurahan:', error)
    profileError.value = error?.message || 'Gagal memuat desa/kelurahan.'
  }
}

function selectVillage(code: string) {
  const region = villages.value.find((item) => item.code === code)
  form.village_code = region?.code ?? ''
  form.village_name = region?.name ?? ''
}

async function selectCountry(code: string) {
  const selectedCountry = countries.find((country) => country.code === code)
  form.country_code = code
  form.country_name = selectedCountry?.name ?? ''
  resetAddressFields()
  provinces.value = []
  profileError.value = ''

  if (code === 'ID') {
    try {
      provinces.value = await loadRegions(1)
    } catch (error: any) {
      console.error('Gagal memuat provinsi:', error)
      profileError.value = error?.message || 'Gagal memuat daftar provinsi.'
    }
  }
}

async function loadCustomerProfile() {
  isLoading.value = true
  profileError.value = ''

  try {
    const { data: authData, error: authError } = await supabase.auth.getUser()
    if (authError) throw authError
    const user = authData.user
    if (!user) {
      await router.replace('/login')
      return
    }

    userId.value = user.id
    authEmail.value = user.email ?? ''
    form.email = user.email ?? ''
    form.full_name = String(
      user.user_metadata?.full_name ??
      user.user_metadata?.name ??
      user.user_metadata?.full_name ??
      '',
    )

    // Prioritaskan relasi user_id. Untuk data Client lama yang dibuat Admin/import
    // dan user_id masih NULL, cocokkan berdasarkan email akun yang sedang login.
    const customerColumns = 'id, full_name, phone, whatsapp_phone, email, address, country_code, country_name, province_code, province_name, city_code, city_name, district_code, district_name, village_code, village_name, street_address, user_id'
    const { data: linkedCustomer, error: linkedError } = await supabase
      .from('customers')
      .select(customerColumns)
      .eq('user_id', user.id)
      .maybeSingle()

    if (linkedError) throw linkedError

    let customer = linkedCustomer

    if (!customer && user.email) {
      const { data: emailCustomer, error: emailError } = await supabase
        .from('customers')
        .select(customerColumns)
        .eq('email', user.email)
        .eq('registration_source', 'Client')
        .is('user_id', null)
        .maybeSingle()

      if (emailError) throw emailError
      customer = emailCustomer
    }

    if (customer) {
      customerId.value = Number(customer.id)
      form.full_name = customer.full_name ?? form.full_name
      form.phone = customer.phone ?? ''
      form.whatsapp_phone = customer.whatsapp_phone ?? customer.phone ?? ''
      form.email = customer.email ?? user.email ?? ''
      form.country_code = customer.country_code ?? 'ID'
      form.country_name = customer.country_name ?? (countries.find((country) => country.code === form.country_code)?.name ?? '')
      form.province_code = customer.province_code ?? ''
      form.province_name = customer.province_name ?? ''
      form.city_code = customer.city_code ?? ''
      form.city_name = customer.city_name ?? ''
      form.district_code = customer.district_code ?? ''
      form.district_name = customer.district_name ?? ''
      form.village_code = customer.village_code ?? ''
      form.village_name = customer.village_name ?? ''
      form.street_address = customer.street_address ?? customer.address ?? ''

      if (form.country_code === 'ID') {
        provinces.value = await loadRegions(1)
        const province = form.province_code ? await getRegionByCode(form.province_code) : null
        if (province) cities.value = await loadRegions(2, province.id)
        const city = form.city_code ? await getRegionByCode(form.city_code) : null
        if (city) districts.value = await loadRegions(3, city.id)
        const district = form.district_code ? await getRegionByCode(form.district_code) : null
        if (district) villages.value = await loadRegions(4, district.id)
      }
    } else {
      customerId.value = null
    }

    const { data: profileData, error: profileErrorResult } = await supabase
      .from('profiles')
      .select('avatar_url')
      .eq('id', user.id)
      .maybeSingle()
    if (profileErrorResult) throw profileErrorResult
    avatarUrl.value = profileData?.avatar_url ?? ''

    if (form.country_code === 'ID' && provinces.value.length === 0) {
      provinces.value = await loadRegions(1)
    }
  } catch (error: any) {
    console.error('Gagal memuat data customer.', error)
    profileError.value = error?.message || 'Data diri gagal dimuat. Periksa koneksi lalu coba lagi.'
  } finally {
    isLoading.value = false
  }
}

async function saveCustomerProfile() {
  if (!canSubmit.value || !userId.value) return

  isSaving.value = true
  profileError.value = ''
  successMessage.value = ''

  try {
    const addressParts = [
      form.street_address.trim(), form.village_name, form.district_name,
      form.city_name, form.province_name, form.country_name,
    ].filter(Boolean)
    const fullAddress = addressParts.join(', ')
    const payload = {
      user_id: userId.value,
      full_name: form.full_name.trim(),
      phone: normalizePhone(form.phone),
      whatsapp_phone: normalizePhone(form.whatsapp_phone),
      email: form.email.trim() || authEmail.value || null,
      country_code: form.country_code,
      country_name: form.country_name,
      province_code: form.province_code || null,
      province_name: form.province_name.trim() || null,
      city_code: form.city_code || null,
      city_name: form.city_name.trim() || null,
      district_code: form.district_code || null,
      district_name: form.district_name.trim() || null,
      village_code: form.village_code || null,
      village_name: form.village_name.trim() || null,
      street_address: form.street_address.trim(),
      address: fullAddress,
    }

    // Update baris customer yang sudah ada (termasuk ID lama seperti 36),
    // jangan membuat baris duplikat hanya karena user_id sebelumnya NULL.
    if (customerId.value !== null) {
      const { data, error } = await supabase
        .from('customers')
        .update(payload)
        .eq('id', customerId.value)
        .select('id')
        .single()

      if (error) throw error
      customerId.value = Number(data.id)
    } else {
      const { data, error } = await supabase
        .from('customers')
        .insert({ ...payload, registration_source: 'Client' })
        .select('id')
        .single()

      if (error) throw error
      customerId.value = Number(data.id)
    }

    successMessage.value = 'Data diri berhasil disimpan.'
  } catch (error: any) {
    console.error('Gagal menyimpan data customer.', error)
    profileError.value = error?.message || 'Data diri gagal disimpan. Silakan coba lagi.'
  } finally {
    isSaving.value = false
  }
}

function openAvatarPicker() {
  avatarInput.value?.click()
}

async function uploadAvatar(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file || !userId.value) return

  const invalid = profileService.validateAvatar(file)
  if (invalid) {
    profileError.value = invalid
    input.value = ''
    return
  }

  isUploadingAvatar.value = true
  profileError.value = ''
  try {
    const nextAvatarUrl = await profileService.uploadAvatar(userId.value, file, avatarUrl.value)
    avatarUrl.value = nextAvatarUrl
    // Perbarui state global agar avatar di header langsung berubah.
    sharedUser.patch({ avatarUrl: nextAvatarUrl })
    successMessage.value = 'Foto profil berhasil diperbarui.'
  } catch (error: any) {
    console.error('Gagal mengunggah foto profil.', error)
    profileError.value = error?.message || 'Foto profil gagal diunggah.'
  } finally {
    isUploadingAvatar.value = false
    input.value = ''
  }
}

async function logout() {
  if (isLoggingOut.value) return

  isLoggingOut.value = true
  logoutError.value = ''

  try {
    await authService.logout()
    await router.replace('/login')
  } catch (error) {
    console.error('Gagal keluar dari akun client.', error)
    logoutError.value = 'Tidak dapat keluar. Silakan coba lagi.'
  } finally {
    isLoggingOut.value = false
  }
}

onMounted(loadCustomerProfile)
</script>

<template>
  <ion-page>
    <app-header variant="client" title="PoliLand Kairagi" :show-back="false" />

    <ion-content class="account-content" :fullscreen="true">
      <main class="account-page">
        <!-- Skeleton State saat memuat data -->
        <section v-if="isLoading" class="account-card" aria-label="Memuat profil akun">
          <div class="skeleton-profile">
            <ion-skeleton-text :animated="true" class="skeleton-avatar" />
            <div class="skeleton-meta">
              <ion-skeleton-text :animated="true" style="width: 55%; height: 18px" />
              <ion-skeleton-text :animated="true" style="width: 75%; height: 14px" />
              <ion-skeleton-text :animated="true" style="width: 35%; height: 14px" />
            </div>
          </div>
          <ion-skeleton-text :animated="true" class="skeleton-banner" />
          <div class="skeleton-fields">
            <ion-skeleton-text :animated="true" class="skeleton-input" />
            <div class="form-grid">
              <ion-skeleton-text :animated="true" class="skeleton-input" />
              <ion-skeleton-text :animated="true" class="skeleton-input" />
            </div>
            <ion-skeleton-text :animated="true" class="skeleton-input" />
            <ion-skeleton-text :animated="true" class="skeleton-textarea" />
          </div>
        </section>

        <template v-else>
          <!-- Kartu Identitas & Foto Profil -->
          <section class="account-card profile-hero" aria-labelledby="account-title">
            <div class="avatar-row">
              <button
                type="button"
                class="avatar-picker"
                :disabled="isUploadingAvatar"
                :aria-label="avatarUrl ? 'Ganti foto profil' : 'Unggah foto profil'"
                @click="openAvatarPicker"
              >
                <img v-if="avatarUrl" :src="avatarUrl" alt="Foto profil" class="avatar-image" />
                <ion-icon v-else :icon="personCircleOutline" class="avatar-placeholder" />
                <span class="avatar-camera" aria-hidden="true">
                  <ion-spinner v-if="isUploadingAvatar" name="crescent" class="camera-spinner" />
                  <ion-icon v-else :icon="cameraOutline" />
                </span>
              </button>

              <div class="avatar-copy">
                <strong class="profile-name">
                  {{ form.full_name.trim() || 'Akun Pelanggan' }}
                </strong>
                <span v-if="authEmail" class="profile-email">{{ authEmail }}</span>
                <span class="avatar-hint">
                  {{ isUploadingAvatar ? 'Mengunggah foto...' : 'JPG, PNG, atau WEBP · Maks. 3 MB' }}
                </span>
                <button
                  type="button"
                  class="avatar-change-btn"
                  :disabled="isUploadingAvatar"
                  @click="openAvatarPicker"
                >
                  {{ isUploadingAvatar ? 'Mengunggah...' : avatarUrl ? 'Ganti foto profil' : 'Unggah foto profil' }}
                </button>
              </div>

              <input
                ref="avatarInput"
                class="visually-hidden"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                @change="uploadAvatar"
              />
            </div>

            <!-- Status Kelengkapan Profil -->
            <div v-if="!isProfileComplete" class="status-banner status-banner--warning" role="status">
              <ion-icon :icon="alertCircleOutline" class="status-icon" aria-hidden="true" />
              <div class="status-body">
                <strong>Lengkapi data diri terlebih dahulu</strong>
                <p>
                  Beberapa informasi akun belum tersedia. Silakan lengkapi kolom wajib (<span class="req-mark">*</span>) sebelum melanjutkan pengajuan SPK.
                </p>
              </div>
            </div>

            <div v-else class="status-banner status-banner--success" role="status">
              <ion-icon :icon="checkmarkCircleOutline" class="status-icon" aria-hidden="true" />
              <div class="status-body">
                <strong>Data diri sudah lengkap</strong>
                <p>Pastikan nomor kontak dan alamat Anda tetap yang terbaru.</p>
              </div>
            </div>
          </section>

          <!-- Kartu Formulir Data Diri -->
          <section class="account-card" aria-label="Formulir data diri">
            <h2 class="card-section-title">Informasi Pribadi &amp; Kontak</h2>

            <form class="profile-form" @submit.prevent="saveCustomerProfile">
              <div class="form-field">
                <ion-label for="client-full-name" class="field-label">
                  Nama lengkap <span class="req-mark" aria-hidden="true">*</span>
                </ion-label>
                <ion-item lines="none" class="input-item">
                  <ion-input
                    id="client-full-name"
                    v-model="form.full_name"
                    placeholder="Masukkan nama sesuai KTP/identitas"
                    autocomplete="name"
                    required
                  />
                </ion-item>
              </div>

              <div class="form-grid">
                <div class="form-field">
                  <ion-label for="client-phone" class="field-label">
                    Nomor HP <span class="req-mark" aria-hidden="true">*</span>
                  </ion-label>
                  <ion-item lines="none" class="input-item">
                    <ion-input
                      id="client-phone"
                      v-model="form.phone"
                      type="tel"
                      inputmode="tel"
                      placeholder="08xxxxxxxxxx"
                      autocomplete="tel"
                      required
                    />
                  </ion-item>
                </div>

                <div class="form-field">
                  <ion-label for="client-whatsapp" class="field-label">
                    Nomor WhatsApp <span class="req-mark" aria-hidden="true">*</span>
                  </ion-label>
                  <ion-item lines="none" class="input-item">
                    <ion-input
                      id="client-whatsapp"
                      v-model="form.whatsapp_phone"
                      type="tel"
                      inputmode="tel"
                      placeholder="08xxxxxxxxxx"
                      required
                    />
                  </ion-item>
                </div>
              </div>

              <div class="form-field">
                <ion-label for="client-email" class="field-label">Email</ion-label>
                <ion-item lines="none" class="input-item">
                  <ion-input
                    id="client-email"
                    v-model="form.email"
                    type="email"
                    placeholder="nama@email.com"
                    autocomplete="email"
                  />
                </ion-item>
                <small v-if="authEmail" class="field-hint">
                  Terhubung dengan akun Google: {{ authEmail }}
                </small>
              </div>

              <div class="form-field">
                <ion-label for="client-country" class="field-label">Negara <span class="req-mark" aria-hidden="true">*</span></ion-label>
                <ion-item lines="none" class="input-item">
                  <ion-select id="client-country" v-model="form.country_code" interface="action-sheet" aria-label="Negara" @ion-change="selectCountry($event.detail.value)">
                    <ion-select-option v-for="country in countries" :key="country.code" :value="country.code">{{ country.name }}</ion-select-option>
                  </ion-select>
                </ion-item>
              </div>

              <div v-if="isIndonesia" class="form-grid address-region-grid">
                <div class="form-field"><ion-label class="field-label">Provinsi <span class="req-mark">*</span></ion-label><ion-item lines="none" class="input-item"><ion-select v-model="form.province_code" placeholder="Pilih provinsi" @ion-change="selectProvince($event.detail.value)"><ion-select-option v-for="region in provinces" :key="region.code" :value="region.code">{{ region.name }}</ion-select-option></ion-select></ion-item></div>
                <div class="form-field"><ion-label class="field-label">Kabupaten/Kota <span class="req-mark">*</span></ion-label><ion-item lines="none" class="input-item"><ion-select v-model="form.city_code" placeholder="Pilih kabupaten/kota" :disabled="!form.province_code || regionsLoading" @ion-change="selectCity($event.detail.value)"><ion-select-option v-for="region in cities" :key="region.code" :value="region.code">{{ region.name }}</ion-select-option></ion-select></ion-item></div>
                <div class="form-field"><ion-label class="field-label">Kecamatan <span class="req-mark">*</span></ion-label><ion-item lines="none" class="input-item"><ion-select v-model="form.district_code" placeholder="Pilih kecamatan" :disabled="!form.city_code || regionsLoading" @ion-change="selectDistrict($event.detail.value)"><ion-select-option v-for="region in districts" :key="region.code" :value="region.code">{{ region.name }}</ion-select-option></ion-select></ion-item></div>
                <div class="form-field"><ion-label class="field-label">Desa/Kelurahan <span class="req-mark">*</span></ion-label><ion-item lines="none" class="input-item"><ion-select v-model="form.village_code" placeholder="Pilih desa/kelurahan" :disabled="!form.district_code || regionsLoading" @ion-change="selectVillage($event.detail.value)"><ion-select-option v-for="region in villages" :key="region.code" :value="region.code">{{ region.name }}</ion-select-option></ion-select></ion-item></div>
              </div>

              <div v-else class="form-grid">
                <div class="form-field"><ion-label class="field-label">Province/State <span class="req-mark">*</span></ion-label><ion-item lines="none" class="input-item"><ion-input v-model="form.province_name" placeholder="Province / State" /></ion-item></div>
                <div class="form-field"><ion-label class="field-label">City <span class="req-mark">*</span></ion-label><ion-item lines="none" class="input-item"><ion-input v-model="form.city_name" placeholder="City" /></ion-item></div>
                <div class="form-field"><ion-label class="field-label">District/Area</ion-label><ion-item lines="none" class="input-item"><ion-input v-model="form.district_name" placeholder="District / Area" /></ion-item></div>
              </div>
              <small v-if="regionsLoading" class="field-hint" role="status">
                Memuat data wilayah...
              </small>

              <div class="form-field">
                <ion-label for="client-address" class="field-label">Detail alamat <span class="req-mark" aria-hidden="true">*</span></ion-label>
                <ion-item lines="none" class="input-item textarea-item"><ion-textarea id="client-address" v-model="form.street_address" placeholder="Nama jalan, nomor rumah, gedung, dan detail lainnya" :auto-grow="true" :rows="3" required /></ion-item>
              </div>

              <div v-if="profileError" class="feedback-alert feedback-alert--error" role="alert">
                <ion-icon :icon="alertCircleOutline" aria-hidden="true" />
                <span>{{ profileError }}</span>
              </div>

              <div v-if="successMessage" class="feedback-alert feedback-alert--success" role="status">
                <ion-icon :icon="checkmarkCircleOutline" aria-hidden="true" />
                <span>{{ successMessage }}</span>
              </div>

              <ion-button
                class="save-button"
                type="submit"
                expand="block"
                :disabled="!canSubmit"
              >
                <ion-spinner v-if="isSaving" slot="start" name="crescent" />
                <ion-icon v-else slot="start" :icon="saveOutline" />
                {{ isSaving ? 'Menyimpan...' : 'Simpan Data Diri' }}
              </ion-button>
            </form>
          </section>

          <!-- Kartu Sesi & Keluar Akun -->
          <section class="account-card account-session-card" aria-label="Pengaturan sesi akun">
            <div class="session-copy">
              <h2 class="card-section-title">Sesi Akun</h2>
              <p class="session-desc">
                Keluar dari akun jika Anda menggunakan perangkat bersama atau ingin berganti akun.
              </p>
            </div>

            <div v-if="!showLogoutConfirm">
              <ion-button
                class="logout-button"
                color="danger"
                fill="outline"
                expand="block"
                :disabled="isLoggingOut"
                @click="showLogoutConfirm = true"
              >
                <ion-icon slot="start" :icon="logOutOutline" />
                Keluar dari Akun
              </ion-button>
            </div>

            <div v-else class="logout-confirm-box" role="region" aria-label="Konfirmasi keluar akun">
              <p class="logout-confirm-text">Yakin ingin keluar dari akun ini sekarang?</p>
              <div class="logout-confirm-actions">
                <ion-button
                  class="confirm-cancel-btn"
                  fill="outline"
                  color="medium"
                  :disabled="isLoggingOut"
                  @click="showLogoutConfirm = false"
                >
                  Batal
                </ion-button>
                <ion-button
                  class="confirm-proceed-btn"
                  color="danger"
                  :disabled="isLoggingOut"
                  @click="logout"
                >
                  <ion-spinner v-if="isLoggingOut" slot="start" name="crescent" />
                  <ion-icon v-else slot="start" :icon="logOutOutline" />
                  {{ isLoggingOut ? 'Sedang keluar...' : 'Ya, Keluar' }}
                </ion-button>
              </div>
            </div>

            <div v-if="logoutError" class="feedback-alert feedback-alert--error" role="alert">
              <ion-icon :icon="alertCircleOutline" aria-hidden="true" />
              <span>{{ logoutError }}</span>
            </div>
          </section>
        </template>
      </main>
    </ion-content>

    <mobile-tab-bar variant="client" />
  </ion-page>
</template>

<style scoped>
.account-content {
  --background: var(--app-background, #faf9f6);
  --padding-bottom: calc(104px + env(safe-area-inset-bottom));
}

.account-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
  width: min(100%, 680px);
  margin: 0 auto;
  padding: 16px 16px calc(120px + env(safe-area-inset-bottom));
  color: var(--text-primary, #252525);
  font-family: var(--font-primary, var(--ion-font-family, 'Plus Jakarta Sans', sans-serif));
}

/* Header Pengantar Halaman */
.page-intro {
  padding: 4px 2px 0;
}

.page-title {
  margin: 0;
  color: var(--text-primary, #252525);
  font-size: 22px;
  font-weight: 700;
  line-height: 1.3;
  letter-spacing: -0.01em;
}

.page-subtitle {
  margin: 4px 0 0;
  color: var(--text-secondary, #63636a);
  font-size: 14px;
  line-height: 1.5;
}

/* Kartu Permukaan Standar */
.account-card {
  padding: 20px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #ffffff);
  box-shadow: 0 2px 8px rgba(37, 37, 37, 0.04);
}

.card-section-title {
  margin: 0 0 16px;
  color: var(--text-primary, #252525);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.4;
}

/* Bagian Foto Profil */
.avatar-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.avatar-picker {
  position: relative;
  display: grid;
  width: 76px;
  height: 76px;
  flex: 0 0 76px;
  place-items: center;
  padding: 0;
  border: 2px solid var(--border-default, #eae7e0);
  border-radius: 50%;
  background: var(--surface-muted, #f5f3ee);
  color: var(--poliland-green, #355a2c);
  cursor: pointer;
  transition: transform 150ms ease-out, border-color 150ms ease-out;
}

.avatar-picker:hover:not(:disabled) {
  border-color: var(--poliland-green, #355a2c);
}

.avatar-picker:active:not(:disabled) {
  transform: scale(0.97);
}

.avatar-picker:focus-visible,
.avatar-change-btn:focus-visible {
  outline: 3px solid var(--poliland-green, #355a2c);
  outline-offset: 2px;
}

.avatar-picker:disabled {
  opacity: 0.65;
  cursor: not-allowed;
}

.avatar-image {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  object-fit: cover;
}

.avatar-placeholder {
  font-size: 48px;
}

.avatar-camera {
  position: absolute;
  right: -2px;
  bottom: -2px;
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 2px solid var(--surface-primary, #ffffff);
  border-radius: 50%;
  background: var(--poliland-green, #355a2c);
  color: #ffffff;
  font-size: 14px;
}

.camera-spinner {
  width: 14px;
  height: 14px;
  color: #ffffff;
}

.avatar-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  align-items: flex-start;
  gap: 2px;
}

.profile-name {
  width: 100%;
  overflow: hidden;
  color: var(--text-primary, #252525);
  font-size: 16px;
  font-weight: 700;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.profile-email {
  width: 100%;
  overflow: hidden;
  color: var(--text-secondary, #63636a);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.avatar-hint {
  margin-top: 2px;
  color: var(--text-secondary, #717178);
  font-size: 12px;
}

.avatar-change-btn {
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  margin-top: 4px;
  padding: 6px 12px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-muted, #f5f3ee);
  color: var(--poliland-green, #355a2c);
  font-family: inherit;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 150ms ease-out;
}

.avatar-change-btn:hover:not(:disabled) {
  background: #ebe7de;
}

.avatar-change-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

/* Banner Status Kelengkapan Data */
.status-banner {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 12px 14px;
  border-radius: var(--radius-control, 12px);
  font-size: 13px;
  line-height: 1.5;
}

.status-banner--warning {
  border: 1px solid var(--poliland-gold-soft, #f4d69a);
  background: #fdf8ec;
  color: var(--poliland-gold-text-soft, #805708);
}

.status-banner--success {
  border: 1px solid rgba(53, 90, 44, 0.2);
  background: var(--status-success-bg, #eef5ec);
  color: var(--poliland-green, #355a2c);
}

.status-icon {
  flex: 0 0 20px;
  margin-top: 2px;
  font-size: 20px;
}

.status-body strong {
  display: block;
  font-size: 13px;
  font-weight: 700;
}

.status-body p {
  margin: 2px 0 0;
  font-size: 12.5px;
}

/* Formulir */
.profile-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.form-field {
  min-width: 0;
}

.field-label {
  display: block;
  margin: 0 0 6px 2px;
  color: var(--text-primary, #252525);
  font-size: 13px;
  font-weight: 600;
}

.req-mark {
  color: var(--status-danger, #d94b45);
  font-weight: 700;
}

.input-item {
  --background: var(--surface-muted, #f5f3ee);
  --border-radius: var(--radius-control, 12px);
  --min-height: 46px;
  --padding-start: 14px;
  --inner-padding-end: 14px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  transition: border-color 150ms ease-out, background-color 150ms ease-out;
}

.input-item:focus-within {
  --background: var(--surface-primary, #ffffff);
  border-color: var(--poliland-green, #355a2c);
  box-shadow: 0 0 0 3px rgba(53, 90, 44, 0.12);
}

.input-item ion-input,
.input-item ion-textarea {
  --color: var(--text-primary, #252525);
  --placeholder-color: var(--text-secondary, #717178);
  --padding-top: 11px;
  --padding-bottom: 11px;
  font-size: 14px;
}

.textarea-item {
  align-items: flex-start;
  --min-height: 92px;
}

.field-hint {
  display: block;
  margin: 6px 2px 0;
  color: var(--text-secondary, #63636a);
  font-size: 12px;
}

/* Umpan Balik Simpan / Error */
.feedback-alert {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 14px;
  border-radius: var(--radius-control, 12px);
  font-size: 13px;
  font-weight: 500;
  line-height: 1.45;
}

.feedback-alert ion-icon {
  flex: 0 0 18px;
  margin-top: 1px;
  font-size: 18px;
}

.feedback-alert--error {
  border: 1px solid rgba(217, 75, 69, 0.25);
  background: #fdf2f2;
  color: var(--status-danger, #d94b45);
}

.feedback-alert--success {
  border: 1px solid rgba(53, 90, 44, 0.25);
  background: var(--status-success-bg, #eef5ec);
  color: var(--poliland-green, #355a2c);
}

/* Tombol Aksi Utama (Brand PoliLand Green, min-height 48px) */
.save-button {
  --background: var(--poliland-green, #355a2c);
  --background-hover: #2b4a24;
  --background-activated: #243e1e;
  --color: #ffffff;
  --border-radius: var(--radius-control, 12px);
  --box-shadow: 0 4px 12px rgba(53, 90, 44, 0.2);
  min-height: 48px;
  margin: 4px 0 0;
  font-size: 15px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

/* Bagian Keluar Akun */
.account-session-card {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.account-session-card .card-section-title {
  margin-bottom: 4px;
}

.session-desc {
  margin: 0;
  color: var(--text-secondary, #63636a);
  font-size: 13px;
  line-height: 1.5;
}

.logout-button {
  --border-radius: var(--radius-control, 12px);
  --border-width: 1.5px;
  min-height: 46px;
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  letter-spacing: 0;
  text-transform: none;
}

.logout-confirm-box {
  padding: 14px;
  border: 1px solid rgba(217, 75, 69, 0.25);
  border-radius: var(--radius-control, 12px);
  background: #fdf2f2;
}

.logout-confirm-text {
  margin: 0 0 12px;
  color: var(--text-primary, #252525);
  font-size: 13px;
  font-weight: 600;
}

.logout-confirm-actions {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.confirm-cancel-btn,
.confirm-proceed-btn {
  --border-radius: var(--radius-control, 12px);
  min-height: 44px;
  margin: 0;
  font-size: 13px;
  font-weight: 600;
  text-transform: none;
}

/* Skeleton Loading */
.skeleton-profile {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
}

.skeleton-avatar {
  width: 76px;
  height: 76px;
  flex: 0 0 76px;
  border-radius: 50%;
}

.skeleton-meta {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 8px;
}

.skeleton-banner {
  width: 100%;
  height: 56px;
  margin-bottom: 20px;
  border-radius: var(--radius-control, 12px);
}

.skeleton-fields {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.skeleton-input {
  width: 100%;
  height: 46px;
  border-radius: var(--radius-control, 12px);
}

.skeleton-textarea {
  width: 100%;
  height: 92px;
  border-radius: var(--radius-control, 12px);
}

@media (max-width: 520px) {
  .account-card {
    padding: 16px;
  }

  .form-grid {
    grid-template-columns: 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .avatar-picker,
  .avatar-change-btn,
  .input-item {
    transition: none;
  }
}
</style>
