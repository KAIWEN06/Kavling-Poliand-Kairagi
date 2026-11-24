<template>
  <ion-page class="profile-page">
    <AppHeader variant="admin" />

    <ion-content class="account-content" :fullscreen="true">
      <main class="account-page">
        <section v-if="loading && !profile" class="account-card" aria-label="Memuat profil akun">
          <div class="skeleton-profile">
            <ion-skeleton-text :animated="true" class="skeleton-avatar" />
            <div class="skeleton-meta">
              <ion-skeleton-text :animated="true" style="width: 55%; height: 18px" />
              <ion-skeleton-text :animated="true" style="width: 75%; height: 14px" />
            </div>
          </div>
          <ion-skeleton-text :animated="true" class="skeleton-input" />
        </section>

        <p v-else-if="!profile" class="feedback-alert feedback-alert--error" role="alert">
          <ion-icon :icon="alertCircleOutline" aria-hidden="true" />
          <span>Profil tidak dapat dimuat. Silakan masuk kembali.</span>
        </p>

        <template v-else>
          <!-- Kartu Identitas & Foto Profil -->
          <section class="account-card profile-hero" aria-label="Identitas akun">
            <div class="avatar-row">
              <div class="avatar-wrap">
                <button
                  type="button"
                  class="avatar-picker"
                  :disabled="uploading"
                  :aria-label="profile.avatarUrl ? 'Lihat foto profil' : 'Unggah foto profil'"
                  @click="onAvatarTap"
                >
                  <img v-if="profile.avatarUrl" :src="profile.avatarUrl" alt="Foto profil" class="avatar-image" />
                  <ion-icon v-else :icon="personCircleOutline" class="avatar-placeholder" />
                </button>
                <button type="button" class="avatar-camera" aria-label="Ganti foto profil" :disabled="uploading" @click="pickFile">
                  <ion-spinner v-if="uploading" name="crescent" class="camera-spinner" />
                  <ion-icon v-else :icon="cameraOutline" aria-hidden="true" />
                </button>
              </div>

              <div class="avatar-copy">
                <strong class="profile-name">{{ displayName }}</strong>
                <span v-if="profile.email" class="profile-email">{{ profile.email }}</span>
                <span v-if="roleLabel" class="role-chip">{{ roleLabel }}</span>
                <span class="avatar-hint">
                  {{ uploading ? 'Mengunggah foto...' : profile.avatarUrl ? 'Ketuk foto untuk melihatnya' : 'JPG, PNG, atau WEBP' }}
                </span>
                <button type="button" class="avatar-change-btn" :disabled="uploading" @click="pickFile">
                  {{ profile.avatarUrl ? 'Ganti foto profil' : 'Unggah foto profil' }}
                </button>
              </div>

              <input
                ref="fileInput"
                class="visually-hidden"
                type="file"
                accept="image/jpeg,image/png,image/webp"
                aria-label="Pilih foto profil"
                @change="onFilePicked"
              />
            </div>

            <AvatarCropModal :file="cropFile" @cancel="cropFile = null" @confirm="saveAvatar" />
            <AvatarViewer :open="viewerOpen" :url="profile.avatarUrl" @close="viewerOpen = false" />

            <div v-if="avatarError" class="feedback-alert feedback-alert--error" role="alert">
              <ion-icon :icon="alertCircleOutline" aria-hidden="true" />
              <span>{{ avatarError }}</span>
            </div>
          </section>

          <!-- Kartu Formulir -->
          <section class="account-card" aria-label="Formulir informasi pribadi">
            <h2 class="card-section-title">Informasi Pribadi</h2>

            <form class="profile-form" @submit.prevent="saveInfo">
              <div class="form-field">
                <ion-label for="pf-full-name" class="field-label">
                  Nama lengkap <span class="req-mark" aria-hidden="true">*</span>
                </ion-label>
                <ion-item lines="none" class="input-item">
                  <ion-input
                    id="pf-full-name"
                    v-model="form.fullName" data-input="name"
                    :maxlength="100"
                    placeholder="Masukkan nama lengkap"
                    autocomplete="name"
                    required
                  />
                </ion-item>
              </div>

              <div class="form-field">
                <ion-label class="field-label">Email</ion-label>
                <ion-item lines="none" class="input-item input-item--readonly">
                  <ion-input :value="profile.email || '-'" readonly aria-label="Email" />
                </ion-item>
              </div>

              <div class="form-grid">
                <div class="form-field">
                  <ion-label class="field-label">Role</ion-label>
                  <ion-item lines="none" class="input-item input-item--readonly">
                    <ion-input :value="roleLabel || '-'" readonly aria-label="Role" />
                  </ion-item>
                </div>
                <div v-if="memberSince" class="form-field">
                  <ion-label class="field-label">Bergabung sejak</ion-label>
                  <ion-item lines="none" class="input-item input-item--readonly">
                    <ion-input :value="memberSince" readonly aria-label="Bergabung sejak" />
                  </ion-item>
                </div>
              </div>

              <div v-if="infoError" class="feedback-alert feedback-alert--error" role="alert">
                <ion-icon :icon="alertCircleOutline" aria-hidden="true" />
                <span>{{ infoError }}</span>
              </div>

              <ion-button class="save-button" type="submit" expand="block" :disabled="!dirty || saving">
                <ion-spinner v-if="saving" slot="start" name="crescent" />
                <ion-icon v-else slot="start" :icon="saveOutline" />
                {{ saving ? 'Menyimpan...' : 'Simpan Perubahan' }}
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
                :disabled="loggingOut"
                @click="showLogoutConfirm = true"
              >
                <ion-icon slot="start" :icon="logOutOutline" />
                Keluar
              </ion-button>
            </div>

            <div v-else class="logout-confirm-box" role="region" aria-label="Konfirmasi keluar akun">
              <p class="logout-confirm-text">Yakin ingin keluar dari akun ini sekarang?</p>
              <div class="logout-confirm-actions">
                <ion-button class="confirm-cancel-btn" fill="outline" color="medium" :disabled="loggingOut" @click="showLogoutConfirm = false">
                  Batal
                </ion-button>
                <ion-button class="confirm-proceed-btn" color="danger" :disabled="loggingOut" @click="logout">
                  <ion-spinner v-if="loggingOut" slot="start" name="crescent" />
                  <ion-icon v-else slot="start" :icon="logOutOutline" />
                  {{ loggingOut ? 'Keluar...' : 'Ya, keluar' }}
                </ion-button>
              </div>
            </div>
          </section>
        </template>
      </main>
    </ion-content>

    <MobileTabBar :variant="tabVariant" />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
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
  useIonRouter,
} from '@ionic/vue'
import {
  alertCircleOutline,
  cameraOutline,
  logOutOutline,
  personCircleOutline,
  saveOutline,
} from 'ionicons/icons'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AvatarCropModal from '@/components/account/AvatarCropModal.vue'
import AvatarViewer from '@/components/account/AvatarViewer.vue'
import { authService } from '@/services/auth/authService'
import { useCurrentUser } from '@/composables/useCurrentUser'
import { useToast } from '@/composables/useToast'
import { profileService } from '@/services/profile/profileService'

const toast = useToast()
const { profile, loading, displayName, roleLabel, refresh, patch } = useCurrentUser()

const ionRouter = useIonRouter()
const loggingOut = ref(false)

const tabVariant = computed(() => {
  switch (profile.value?.role) {
    case 'owner':
    case 'admin':
      return 'admin'
    case 'marketing_head':
      return 'head'
    case 'marketing':
      return 'marketing'
    default:
      return 'public'
  }
})

const showLogoutConfirm = ref(false)

async function logout() {
  if (loggingOut.value) return
  loggingOut.value = true
  try {
    await authService.logout()
  } catch (error) {
    // Sesi lokal tetap dibersihkan walau jaringan gagal.
    console.error('[Logout] Gagal keluar di server:', error)
  } finally {
    loggingOut.value = false
    ionRouter.replace('/login')
  }
}

const form = reactive({ fullName: '', phone: '' })
const saving = ref(false)
const infoError = ref('')

const fileInput = ref<HTMLInputElement | null>(null)
const cropFile = ref<File | null>(null)
const viewerOpen = ref(false)
const uploading = ref(false)
const avatarError = ref('')

watch(
  profile,
  (p) => {
    if (!p) return
    form.fullName = p.fullName
    form.phone = p.phone
  },
  { immediate: true },
)

const dirty = computed(
  () => !!profile.value && (form.fullName.trim() !== profile.value.fullName || form.phone.trim() !== profile.value.phone),
)

const memberSince = computed(() =>
  profile.value?.createdAt
    ? new Date(profile.value.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
    : '',
)

async function saveInfo() {
  const p = profile.value
  if (!p) return
  saving.value = true
  infoError.value = ''
  try {
    if (form.fullName.trim() !== p.fullName) await profileService.updateName(p.id, form.fullName)
    if (p.role === 'client' && form.phone.trim() !== p.phone) await profileService.updateClientPhone(p.id, form.phone)
    patch({ fullName: form.fullName.trim(), phone: form.phone.trim() })
    toast.success('Profil berhasil diperbarui.')
  } catch (error) {
    infoError.value = error instanceof Error ? error.message : 'Profil gagal disimpan. Coba lagi.'
    toast.error(infoError.value)
  } finally {
    saving.value = false
  }
}

function pickFile() {
  fileInput.value?.click()
}

function onAvatarTap() {
  if (profile.value?.avatarUrl) viewerOpen.value = true
  else pickFile()
}

function onFilePicked(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // izinkan memilih file yang sama lagi
  if (!file) return
  avatarError.value = ''
  const invalid = profileService.validateAvatarSource(file)
  if (invalid) {
    avatarError.value = invalid
    toast.error(invalid)
    return
  }
  cropFile.value = file
}

async function saveAvatar(file: File) {
  const p = profile.value
  if (!p) return
  cropFile.value = null
  uploading.value = true
  avatarError.value = ''
  try {
    const url = await profileService.uploadAvatar(p.id, file, p.avatarUrl)
    // State global diperbarui: avatar di header & semua halaman langsung berubah.
    patch({ avatarUrl: url })
    toast.success('Foto profil berhasil diperbarui.')
    void refresh()
  } catch (error) {
    avatarError.value = error instanceof Error ? error.message : 'Foto gagal diunggah. Coba lagi.'
    toast.error(avatarError.value)
  } finally {
    uploading.value = false
  }
}
</script>

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
  place-items: center;
  padding: 0;
  border: 2px solid var(--border-default, #eae7e0);
  border-radius: 50%;
  background: var(--surface-muted, #f5f3ee);
  color: var(--poliland-green, #355a2c);
  cursor: pointer;
  transition: transform 150ms ease-out, border-color 150ms ease-out;
}

@media (hover: hover) and (pointer: fine) {
  .avatar-picker:hover:not(:disabled) {
    border-color: var(--poliland-green, #355a2c);
  }
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

.avatar-wrap {
  position: relative;
  flex: 0 0 76px;
  width: 76px;
  height: 76px;
}

.avatar-picker {
  overflow: hidden;
}

.avatar-camera {
  position: absolute;
  right: -4px;
  bottom: -4px;
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  padding: 0;
  border: 2px solid var(--surface-primary, #ffffff);
  border-radius: 50%;
  background: var(--poliland-green, #355a2c);
  color: #ffffff;
  font-size: 15px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-fast, 160ms) var(--ease-spring, ease-out);
}

/* Perluas area sentuh ke 44px tanpa membesarkan lencana. */
.avatar-camera::before {
  position: absolute;
  inset: -8px;
  content: '';
}

.avatar-camera:active:not(:disabled) {
  transform: scale(0.92);
}

.avatar-camera:focus-visible {
  outline: 3px solid var(--poliland-green, #355a2c);
  outline-offset: 2px;
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

@media (hover: hover) and (pointer: fine) {
  .avatar-change-btn:hover:not(:disabled) {
    background: #ebe7de;
  }
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

.role-chip {
  margin-top: 2px;
  padding: 2px 10px;
  border-radius: 999px;
  color: var(--poliland-green, #355a2c);
  background: color-mix(in srgb, var(--poliland-green, #355a2c) 12%, transparent);
  font-size: 11px;
  font-weight: 700;
}

.avatar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.avatar-change-btn--primary {
  border-color: var(--poliland-green, #355a2c);
  background: var(--poliland-green, #355a2c);
  color: #ffffff;
}

@media (hover: hover) and (pointer: fine) {
  .avatar-change-btn--primary:hover:not(:disabled) {
    background: #2b4a24;
  }
}

.input-item--readonly {
  opacity: 0.8;
}
</style>
