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
  IonSpinner,
  IonTextarea,
} from '@ionic/vue'
import { cameraOutline, logOut, personCircleOutline, saveOutline } from 'ionicons/icons'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import { authService } from '@/services/auth/authService'
import { supabase } from '@/services/config/supabase'

const router = useRouter()

const isLoading = ref(true)
const isSaving = ref(false)
const isLoggingOut = ref(false)
const profileError = ref('')
const logoutError = ref('')
const successMessage = ref('')
const isProfileComplete = ref(false)
const userId = ref('')
const customerId = ref<number | null>(null)
const authEmail = ref('')
const avatarUrl = ref('')
const avatarInput = ref<HTMLInputElement | null>(null)
const isUploadingAvatar = ref(false)

const form = reactive({
  full_name: '',
  phone: '',
  whatsapp_phone: '',
  email: '',
  address: '',
})

const missingFields = computed(() => {
  const missing: string[] = []
  if (!form.full_name.trim()) missing.push('Nama lengkap')
  if (!form.phone.trim()) missing.push('Nomor HP')
  if (!form.whatsapp_phone.trim()) missing.push('Nomor WhatsApp')
  if (!form.address.trim()) missing.push('Alamat')
  return missing
})

const canSubmit = computed(() => missingFields.value.length === 0 && !isSaving.value)

function normalizePhone(value: string): string {
  return value.trim().replace(/[^\d+]/g, '')
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
    const customerColumns = 'id, full_name, phone, whatsapp_phone, email, address, user_id'
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
      form.address = customer.address ?? ''
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

    isProfileComplete.value = Boolean(
      customer &&
      customer.full_name?.trim() &&
      customer.phone?.trim() &&
      customer.whatsapp_phone?.trim() &&
      customer.address?.trim(),
    )
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
    const payload = {
      user_id: userId.value,
      full_name: form.full_name.trim(),
      phone: normalizePhone(form.phone),
      whatsapp_phone: normalizePhone(form.whatsapp_phone),
      email: form.email.trim() || authEmail.value || null,
      address: form.address.trim(),
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

    isProfileComplete.value = true
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

  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    profileError.value = 'Foto profil harus berformat JPG, PNG, atau WEBP.'
    input.value = ''
    return
  }
  if (file.size > 3 * 1024 * 1024) {
    profileError.value = 'Ukuran foto maksimal 3 MB.'
    input.value = ''
    return
  }

  isUploadingAvatar.value = true
  profileError.value = ''
  try {
    const extension = file.name.split('.').pop()?.toLowerCase() || 'jpg'
    const path = `${userId.value}/avatar-${Date.now()}.${extension}`
    const { error: uploadError } = await supabase.storage
      .from('client-avatars')
      .upload(path, file, { upsert: true, contentType: file.type })
    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabase.storage
      .from('client-avatars')
      .getPublicUrl(path)
    const nextAvatarUrl = publicUrlData.publicUrl

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({ id: userId.value, avatar_url: nextAvatarUrl }, { onConflict: 'id' })
    if (updateError) throw updateError

    avatarUrl.value = nextAvatarUrl
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
        <section class="account-panel" aria-labelledby="account-title">
          <div v-if="isLoading" class="loading-state">
            <ion-spinner name="crescent" />
            <span>Memeriksa data akun...</span>
          </div>

          <template v-else>
            <div class="avatar-section">
              <button type="button" class="avatar-picker" :disabled="isUploadingAvatar" @click="openAvatarPicker">
                <img v-if="avatarUrl" :src="avatarUrl" alt="Foto profil" class="avatar-image" />
                <ion-icon v-else :icon="personCircleOutline" class="avatar-placeholder" />
                <span class="avatar-camera"><ion-icon :icon="cameraOutline" /></span>
              </button>
              <div class="avatar-copy">
                <strong>Foto profil</strong>
                <span>{{ isUploadingAvatar ? 'Mengunggah foto...' : 'JPG, PNG, atau WEBP · Maks. 3 MB' }}</span>
                <button type="button" class="avatar-change" :disabled="isUploadingAvatar" @click="openAvatarPicker">
                  {{ isUploadingAvatar ? 'Mengunggah...' : avatarUrl ? 'Ganti foto' : 'Upload foto' }}
                </button>
              </div>
              <input ref="avatarInput" class="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" @change="uploadAvatar" />
            </div>

            <div v-if="!isProfileComplete" class="onboarding-notice" role="status">
              <strong>Lengkapi data diri terlebih dahulu</strong>
              <p>
                Beberapa informasi akun belum tersedia. Silakan lengkapi formulir ini
                sebelum melanjutkan menggunakan fitur pengajuan SPK.
              </p>
              <span class="required-note">* Wajib diisi</span>
            </div>

            <div v-else class="complete-notice">
              <span class="complete-dot"></span>
              Data diri sudah lengkap. Pastikan informasi tetap terbaru.
            </div>

            <form class="profile-form" @submit.prevent="saveCustomerProfile">
              <div class="form-field">
                <ion-label>Nama lengkap <span>*</span></ion-label>
                <ion-item lines="none" class="input-item">
                  <ion-input
                    v-model="form.full_name"
                    placeholder="Masukkan nama sesuai identitas"
                    autocomplete="name"
                    required
                  />
                </ion-item>
              </div>

              <div class="form-grid">
                <div class="form-field">
                  <ion-label>Nomor HP <span>*</span></ion-label>
                  <ion-item lines="none" class="input-item">
                    <ion-input
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
                  <ion-label>Nomor WhatsApp <span>*</span></ion-label>
                  <ion-item lines="none" class="input-item">
                    <ion-input
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
                <ion-label>Email</ion-label>
                <ion-item lines="none" class="input-item">
                  <ion-input
                    v-model="form.email"
                    type="email"
                    placeholder="Alamat email"
                    autocomplete="email"
                  />
                </ion-item>
                <small v-if="authEmail" class="field-hint">
                  Email akun Google: {{ authEmail }}
                </small>
              </div>

              <div class="form-field">
                <ion-label>Alamat lengkap <span>*</span></ion-label>
                <ion-item lines="none" class="input-item textarea-item">
                  <ion-textarea
                    v-model="form.address"
                    placeholder="Masukkan alamat domisili lengkap"
                    :auto-grow="true"
                    :rows="3"
                    required
                  />
                </ion-item>
              </div>

              <p v-if="profileError" class="form-error" role="alert">{{ profileError }}</p>
              <p v-if="successMessage" class="form-success" role="status">{{ successMessage }}</p>

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

            <div class="account-divider"></div>

            <ion-button
              class="logout-button"
              color="danger"
              fill="outline"
              expand="block"
              :disabled="isLoggingOut"
              @click="logout"
            >
              <ion-spinner v-if="isLoggingOut" slot="start" name="crescent" />
              <ion-icon v-else slot="start" :icon="logOut" />
              {{ isLoggingOut ? 'Sedang keluar...' : 'Keluar dari Akun' }}
            </ion-button>

            <p v-if="logoutError" class="form-error" role="alert">{{ logoutError }}</p>
          </template>
        </section>
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
  width: min(100%, 760px);
  margin: 0 auto;
  padding: 16px 16px calc(120px + env(safe-area-inset-bottom));
  color: var(--text-primary, #252525);
  font-family: var(--font-primary, var(--ion-font-family, sans-serif));
}

.account-panel {
  padding: 22px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 2px 4px rgb(37 37 37 / 5%);
}

.section-heading {
  display: flex;
  align-items: center;
  gap: 13px;
  margin-bottom: 22px;
}

.heading-icon {
  display: grid;
  width: 46px;
  height: 46px;
  flex: 0 0 46px;
  place-items: center;
  border-radius: 14px;
  background: #f1eee7;
  color: #806b48;
  font-size: 25px;
}

.section-heading h1 {
  margin: 0;
  font-size: 21px;
  font-weight: 700;
}

.section-heading p {
  margin: 5px 0 0;
  color: var(--text-secondary, #717178);
  font-size: 13px;
  line-height: 1.45;
}

.avatar-section {
  display: flex;
  align-items: center;
  gap: 14px;
  margin: 0 0 22px;
  padding: 14px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: 14px;
  background: #fff;
}

.avatar-picker {
  position: relative;
  display: grid;
  width: 76px;
  height: 76px;
  flex: 0 0 76px;
  place-items: center;
  overflow: visible;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: #f1eee7;
  color: #806b48;
  cursor: pointer;
}
.avatar-picker:disabled { opacity: .65; }
.avatar-image { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; }
.avatar-placeholder { font-size: 48px; }
.avatar-camera {
  position: absolute;
  right: -2px;
  bottom: -2px;
  display: grid;
  width: 27px;
  height: 27px;
  place-items: center;
  border: 2px solid #fff;
  border-radius: 50%;
  background: #806b48;
  color: #fff;
  font-size: 14px;
}
.avatar-copy { display: flex; flex-direction: column; align-items: flex-start; gap: 4px; }
.avatar-copy strong { color: var(--text-primary, #333); font-size: 14px; }
.avatar-copy span { color: var(--text-secondary, #777); font-size: 11px; }
.avatar-change { padding: 2px 0; border: 0; background: transparent; color: #806b48; font-size: 12px; font-weight: 700; }
.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }

.onboarding-notice,
.complete-notice {
  margin-bottom: 20px;
  padding: 14px 15px;
  border-radius: 13px;
  font-size: 13px;
  line-height: 1.5;
}

.onboarding-notice {
  border: 1px solid #ead9b8;
  background: #fff9ed;
  color: #745522;
}

.onboarding-notice strong {
  display: block;
  margin-bottom: 4px;
  font-size: 14px;
}

.onboarding-notice p {
  margin: 0 0 8px;
}

.required-note {
  font-size: 11px;
  font-weight: 600;
}

.complete-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  background: #eff8f1;
  color: #28623b;
}

.complete-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #31965a;
}

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

.form-field > ion-label {
  display: block;
  margin: 0 0 7px 2px;
  color: var(--text-primary, #333);
  font-size: 13px;
  font-weight: 600;
}

.form-field > ion-label span {
  color: #d94b45;
}

.input-item {
  --background: #fff;
  --border-radius: 11px;
  --min-height: 46px;
  --padding-start: 12px;
  --inner-padding-end: 12px;
  border: 1px solid var(--border-default, #e6e3dc);
  border-radius: 11px;
}

.input-item ion-input,
.input-item ion-textarea {
  --padding-top: 11px;
  --padding-bottom: 11px;
  font-size: 14px;
}

.textarea-item {
  align-items: flex-start;
  --min-height: 84px;
}

.field-hint {
  display: block;
  margin: 6px 2px 0;
  color: var(--text-secondary, #777);
  font-size: 11px;
}

.loading-state {
  display: flex;
  min-height: 180px;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--text-secondary, #717178);
  font-size: 14px;
}

.form-error,
.form-success {
  margin: 0;
  font-size: 13px;
  line-height: 1.5;
}

.form-error { color: var(--status-danger, #d94b45); }
.form-success { color: #287a45; }

.save-button {
  --background: #806b48;
  --background-activated: #6c593b;
  --border-radius: 12px;
  min-height: 46px;
  margin: 2px 0 0;
  font-weight: 600;
  text-transform: none;
}

.account-divider {
  height: 1px;
  margin: 22px 0 18px;
  background: var(--border-default, #eae7e0);
}

.logout-button {
  --border-radius: 12px;
  --border-width: 1px;
  min-height: 44px;
  margin: 0;
  font-weight: 600;
  text-transform: none;
}

@media (max-width: 520px) {
  .account-panel { padding: 18px 15px; }
  .form-grid { grid-template-columns: 1fr; }
}
</style>
