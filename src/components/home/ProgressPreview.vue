<template>
  <div class="progress-page">
    <div class="progress-container">
      
      <!-- Tombol Tambah Progress (Hanya Admin) -->
      <div v-if="isAdmin" class="ion-text-right ion-margin-bottom">
        <ion-button class="btn-primary-custom" @click="handleOpenAddModal">
          <ion-icon slot="start" :icon="addOutline"></ion-icon>
          Tambah Progress
        </ion-button>
      </div>

      <!-- Judul Bagian -->
      <div class="section-header ion-text-center">
        <h2>Progress Pembangunan</h2>
        <p>Laporan transparan perkembangan pembangunan perumahan kami secara berkala.</p>
      </div>

      <!-- Loading State -->
      <div v-if="loading" class="ion-text-center ion-padding">
        <ion-spinner name="crescent" color="primary"></ion-spinner>
      </div>

      <!-- Grid Kartu Progress -->
      <ion-grid v-else class="ion-no-padding">
        <ion-row>
          <ion-col size="12" size-md="6" size-lg="4" v-for="item in progressItems" :key="item.id">
            <ion-card class="progress-card">
              
              <!-- Tombol Aksi Admin (Edit & Hapus) -->
              <div v-if="isAdmin" class="admin-actions">
                <ion-button fill="solid" color="light" size="small" class="action-btn edit-btn" @click="handleOpenEditModal(item)">
                  <ion-icon :icon="createOutline"></ion-icon>
                </ion-button>
                <ion-button fill="solid" color="light" size="small" class="action-btn delete-btn" @click="handleDelete(item)">
                  <ion-icon :icon="trashOutline"></ion-icon>
                </ion-button>
              </div>

              <!-- Gambar Progress -->
              <div class="image-wrapper">
                <img v-if="item.image_url" :src="item.image_url" :alt="item.title" />
                <div v-else class="placeholder-image">
                  <ion-icon :icon="imageOutline" size="large"></ion-icon>
                </div>
              </div>

              <ion-card-content class="card-body">
                <!-- Tanggal & Status -->
                <div class="meta-info">
                  <span class="date-text">
                    <ion-icon :icon="calendarOutline"></ion-icon> {{ item.progress_date }}
                  </span>
                  <span :class="['custom-badge', item.status === 'completed' ? 'badge-completed' : 'badge-ongoing']">
                    {{ item.status === 'completed' ? 'Selesai' : item.status === 'ongoing' ? 'Sedang Berjalan' : 'Direncanakan' }}
                  </span>
                </div>

                <!-- Judul & Deskripsi -->
                <div class="text-content">
                  <h3>{{ item.title }}</h3>
                  <p>{{ item.description }}</p>
                </div>

                <!-- Progress Bar -->
                <div class="progress-wrapper">
                  <div class="progress-label">
                    <span>Pencapaian</span>
                    <span>{{ item.percentage }}%</span>
                  </div>
                  <div class="progress-bar-track">
                    <div class="progress-bar-fill" :style="{ width: `${item.percentage ?? 0}%` }"></div>
                  </div>
                </div>
              </ion-card-content>
            </ion-card>
          </ion-col>
        </ion-row>
      </ion-grid>

      <!-- Modal Form Tambah/Ubah Progress -->
      <ion-modal :is-open="isModalOpen" @didDismiss="isModalOpen = false">
        <ion-header>
          <ion-toolbar class="modal-toolbar">
            <ion-title class="modal-title-custom">{{ editingId ? 'Ubah Progress Pembangunan' : 'Tambah Progress Baru' }}</ion-title>
            <ion-buttons slot="end">
              <ion-button @click="isModalOpen = false" color="medium">
                <ion-icon :icon="closeOutline" size="large"></ion-icon>
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>

        <ion-content class="ion-padding modal-content-custom">
          <div v-if="message.text" :class="['alert-box', message.type]">
            {{ message.text }}
          </div>

          <form @submit.prevent="handleSubmit" class="modal-form">
            <div class="form-group">
              <label class="form-label">Judul Progress</label>
              <ion-input required v-model="formData.title" class="custom-input"></ion-input>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label class="form-label">Tanggal</label>
                <ion-input type="date" required v-model="formData.progress_date" class="custom-input"></ion-input>
              </div>
              <div class="form-group">
                <label class="form-label">Status</label>
                <ion-select v-model="formData.status" interface="popover" class="custom-select">
                  <ion-select-option value="planned">Direncanakan</ion-select-option>
                  <ion-select-option value="ongoing">Sedang Berjalan</ion-select-option>
                  <ion-select-option value="completed">Selesai</ion-select-option>
                </ion-select>
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Persentase ({{ formData.percentage }}%)</label>
              <ion-range :min="0" :max="100" v-model.number="formData.percentage" color="primary"></ion-range>
            </div>

            <div class="form-group">
              <label class="form-label">Foto Progress (Maks 5 MB)</label>
              <div class="upload-box" @click="triggerFileInput">
                <ion-icon :icon="cloudUploadOutline" class="upload-icon"></ion-icon>
                <span>{{ selectedFile ? selectedFile.name : 'Pilih Foto dari Perangkat' }}</span>
                <input type="file" ref="fileInputRef" accept="image/*" @change="handleFileChange" style="display: none;" />
              </div>
              <div v-if="previewUrl" class="preview-container">
                <img :src="previewUrl" alt="Pratinjau" />
              </div>
            </div>

            <div class="form-group">
              <label class="form-label">Deskripsi</label>
              <ion-textarea :rows="3" v-model="formData.description" class="custom-input"></ion-textarea>
            </div>

            <div class="modal-actions">
              <ion-button type="button" fill="clear" color="medium" @click="isModalOpen = false">
                Batal
              </ion-button>
              <ion-button type="submit" class="btn-primary-custom" :disabled="saving">
                <ion-spinner v-if="saving" name="crescent"></ion-spinner>
                <span v-else>Simpan</span>
              </ion-button>
            </div>
          </form>
        </ion-content>
      </ion-modal>

    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted } from 'vue'
import {
  IonGrid, IonRow, IonCol, IonCard, IonCardContent,
  IonButton, IonIcon, IonSpinner, IonModal, IonHeader, IonToolbar,
  IonTitle, IonButtons, IonInput, IonSelect, IonSelectOption,
  IonRange, IonTextarea, IonContent
} from '@ionic/vue'
import {
  addOutline, createOutline, trashOutline, calendarOutline,
  imageOutline, closeOutline, cloudUploadOutline
} from 'ionicons/icons'
import { supabase } from '@/services/config/supabase'
import { progressService, ProgressItem } from '@/services/progressService'

const progressItems = ref<ProgressItem[]>([])
const loading = ref(true)
const isAdmin = ref(false)
const isRefreshing = ref(false)

const isModalOpen = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const message = reactive({ text: '', type: '' })

const formData = reactive<ProgressItem>({
  title: '',
  description: '',
  progress_date: '',
  percentage: 0,
  status: 'ongoing',
  image_url: ''
})

const selectedFile = ref<File | null>(null)
const previewUrl = ref('')
const oldImageUrl = ref('')
const fileInputRef = ref<HTMLInputElement | null>(null)

async function checkAdminRole() {
  try {
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile && (profile.role === 'admin' || profile.role === 'superadmin')) {
      isAdmin.value = true
    }
  } catch (err) {
    console.error('Gagal memeriksa peran admin:', err)
  }
}

async function fetchProgress(forceRefresh = false) {
  loading.value = true

  try {
    const data = await progressService.getProgress(forceRefresh)
    progressItems.value = data || []
    return data || []
  } catch (err) {
    console.error('Gagal memuat progress:', err)
    throw err
  } finally {
    loading.value = false
  }
}

const handleRefreshProgress = async () => {
  if (isRefreshing.value) return

  isRefreshing.value = true

  try {
    await fetchProgress(true)
  } catch (error) {
    console.error('Gagal refresh progress:', error)
  } finally {
    isRefreshing.value = false
    window.dispatchEvent(new CustomEvent('poliland:refresh-item-complete', {
      detail: { source: 'progress' }
    }))
  }
}

onMounted(async () => {
  await checkAdminRole()
  await fetchProgress(false)
  window.addEventListener('poliland:refresh-progress', handleRefreshProgress)
})

onUnmounted(() => {
  window.removeEventListener('poliland:refresh-progress', handleRefreshProgress)
})

const handleOpenAddModal = () => {
  editingId.value = null
  formData.title = ''
  formData.description = ''
  formData.progress_date = new Date().toISOString().split('T')[0]
  formData.percentage = 0
  formData.status = 'ongoing'
  formData.image_url = ''
  selectedFile.value = null
  previewUrl.value = ''
  oldImageUrl.value = ''
  isModalOpen.value = true
  message.text = ''
}

const handleOpenEditModal = (item: ProgressItem) => {
  editingId.value = item.id || null
  formData.title = item.title || ''
  formData.description = item.description || ''
  formData.progress_date = item.progress_date || ''
  formData.percentage = item.percentage || 0
  formData.status = item.status || 'ongoing'
  formData.image_url = item.image_url || ''
  selectedFile.value = null
  previewUrl.value = item.image_url || ''
  oldImageUrl.value = item.image_url || ''
  isModalOpen.value = true
  message.text = ''
}

const triggerFileInput = () => {
  fileInputRef.value?.click()
}

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement

  if (target.files && target.files[0]) {
    const file = target.files[0]

    if (file.size > 5 * 1024 * 1024) {
      message.text = 'Ukuran file terlalu besar (maksimal 5 MB)'
      message.type = 'error'
      return
    }

    selectedFile.value = file
    previewUrl.value = URL.createObjectURL(file)
    message.text = ''
  }
}

const handleSubmit = async () => {
  saving.value = true
  message.text = ''

  try {
    let finalImageUrl = formData.image_url

    if (selectedFile.value) {
      finalImageUrl = await progressService.uploadImage(selectedFile.value)
    }

    const payload: ProgressItem = {
      title: formData.title,
      description: formData.description,
      progress_date: formData.progress_date ? formData.progress_date : null,
      percentage: formData.percentage,
      status: formData.status as 'planned' | 'ongoing' | 'completed',
      image_url: finalImageUrl
    }

    if (editingId.value) {
      await progressService.updateProgress(editingId.value, payload)

      if (selectedFile.value && oldImageUrl.value && oldImageUrl.value !== finalImageUrl) {
        await progressService.deleteImageFile(oldImageUrl.value)
      }

      message.text = 'Progress berhasil diperbarui!'
      message.type = 'success'
    } else {
      await progressService.createProgress(payload)
      message.text = 'Progress baru berhasil ditambahkan!'
      message.type = 'success'
    }

    await fetchProgress(false)

    setTimeout(() => {
      isModalOpen.value = false
    }, 1000)
  } catch (err: any) {
    console.error(err)
    message.text = 'Gagal menyimpan: ' + err.message
    message.type = 'error'
  } finally {
    saving.value = false
  }
}

const handleDelete = async (item: ProgressItem) => {
  if (!window.confirm('Apakah Anda yakin ingin menghapus laporan progress ini?')) return

  try {
    if (item.id) {
      await progressService.deleteProgress(item.id, item.image_url)
      await fetchProgress(false)
    }
  } catch (err: any) {
    console.error(err)
    alert('Gagal menghapus: ' + err.message)
  }
}
</script>

<style scoped>
.progress-page {
  background: transparent;
  width: 100%;
}

.progress-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 12px 16px;
}

.section-header {
  margin-bottom: 20px;
}

.section-header h2 {
  font-size: 22px;
  font-weight: 700;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.section-header p {
  font-size: 13px;
  color: #6B6B6B;
  max-width: 500px;
  margin: 0 auto;
}

.btn-primary-custom {
  --background: #556B2F;
  --background-hover: #4A7C59;
  --color: #ffffff;
  --border-radius: 10px;
  font-size: 12px;
  font-weight: 600;
  text-transform: none;
  box-shadow: 0 4px 12px rgba(85, 107, 47, 0.2);
  margin-bottom: 0;
}

.progress-card {
  background: #ffffff;
  border: 1px solid #E5E5E5;
  border-radius: 14px;
  box-shadow: 0 3px 10px rgba(15, 23, 42, 0.03);
  margin-bottom: 14px;
  position: relative;
  transition: box-shadow 0.3s ease;
}

.progress-card:hover {
  box-shadow: 0 5px 16px rgba(15, 23, 42, 0.06);
}

.admin-actions {
  position: absolute;
  top: 10px;
  right: 10px;
  z-index: 10;
  display: flex;
  gap: 4px;
}

.action-btn {
  --padding-start: 4px;
  --padding-end: 4px;
  --padding-top: 4px;
  --padding-bottom: 4px;
  --border-radius: 6px;
  height: 28px;
  width: 28px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.edit-btn {
  --color: #d97706;
  --background: rgba(255, 255, 255, 0.9);
}

.delete-btn {
  --color: #dc2626;
  --background: rgba(255, 255, 255, 0.9);
}

.image-wrapper {
  height: 160px;
  overflow: hidden;
  background: #E5E5E5;
  border-top-left-radius: 14px;
  border-top-right-radius: 14px;
}

.image-wrapper img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.placeholder-image {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6B6B6B;
}

.card-body {
  padding: 12px 14px;
}

.meta-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.date-text {
  display: flex;
  align-items: center;
  gap: 4px;
  color: #6B6B6B;
  font-size: 11px;
  font-weight: 500;
}

.custom-badge {
  padding: 3px 8px;
  border-radius: 999px;
  font-size: 9px;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.badge-completed {
  background: #ecfdf5;
  color: #059669;
}

.badge-ongoing {
  background: #f4f7f0;
  color: #556B2F;
}

.text-content h3 {
  font-size: 15px;
  font-weight: 700;
  color: #1A1A1A;
  margin: 0 0 4px 0;
}

.text-content p {
  font-size: 11px;
  color: #6B6B6B;
  line-height: 1.4;
  margin: 0 0 10px 0;
}

.progress-wrapper {
  border-top: 1px solid #E5E5E5;
  padding-top: 8px;
}

.progress-label {
  display: flex;
  justify-content: space-between;
  font-size: 11px;
  font-weight: 600;
  color: #1A1A1A;
  margin-bottom: 4px;
}

.progress-bar-track {
  width: 100%;
  background: #E5E5E5;
  height: 6px;
  border-radius: 999px;
  overflow: hidden;
}

.progress-bar-fill {
  background: #556B2F;
  height: 100%;
  border-radius: 999px;
  transition: width 0.5s ease;
}

/* Modal Custom Styling */
.modal-toolbar {
  --background: #ffffff;
  --border-color: #E5E5E5;
}

.modal-title-custom {
  font-size: 14px;
  font-weight: 700;
  color: #1A1A1A;
}

.modal-content-custom {
  --background: #ffffff;
}

.modal-form {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 4px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
}

.form-label {
  font-size: 11px;
  font-weight: 600;
  color: #1A1A1A;
}

.custom-input {
  --background: #FAFAF7;
  --border-radius: 8px;
  --padding-start: 10px;
  --padding-end: 10px;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 11px;
}

.custom-select {
  --background: #FAFAF7;
  border: 1px solid #E5E5E5;
  border-radius: 8px;
  font-size: 11px;
  padding-left: 6px;
}

.upload-box {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 10px;
  border: 2px dashed #E5E5E5;
  border-radius: 10px;
  background: #FAFAF7;
  cursor: pointer;
  color: #6B6B6B;
  font-size: 11px;
  font-weight: 500;
  transition: border-color 0.2s;
}

.upload-box:hover {
  border-color: #556B2F;
}

.upload-icon {
  font-size: 16px;
  color: #6B6B6B;
}

.preview-container {
  width: 90px;
  height: 56px;
  border-radius: 6px;
  overflow: hidden;
  border: 1px solid #E5E5E5;
  margin-top: 6px;
}

.preview-container img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.alert-box {
  padding: 8px 10px;
  border-radius: 6px;
  font-size: 11px;
  font-weight: 600;
  margin-bottom: 6px;
}

.alert-box.success {
  background: #ecfdf5;
  color: #059669;
  border: 1px solid #a7f3d0;
}

.alert-box.error {
  background: #fef2f2;
  color: #dc2626;
  border: 1px solid #fecaca;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 12px;
  border-top: 1px solid #E5E5E5;
  padding-top: 12px;
}
</style>