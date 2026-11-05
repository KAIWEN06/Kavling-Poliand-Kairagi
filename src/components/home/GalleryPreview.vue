<template>
  <section class="section gallery-section">
    <!-- HEADER -->
    <div class="section-heading">
      <div>
        <span class="eyebrow">DOKUMENTASI KAWASAN</span>
        <h2>Galeri & Fasilitas</h2>
        <span class="heading-line"></span>
      </div>
      <button class="see-all" @click="handleOpenSeeAll">
        <span>{{ showAll ? 'Tutup' : 'Lihat Semua' }}</span>
        <ion-icon :icon="showAll ? chevronUpOutline : chevronForwardOutline" />
      </button>
    </div>

    <!-- ADMIN ADD BUTTON -->
    <div v-if="isAdmin" class="admin-top-bar">
      <button @click="handleOpenAddModal" class="admin-add-btn">
        <ion-icon :icon="addOutline" />
        Tambah Galeri
      </button>
    </div>

    <!-- CATEGORY FILTER -->
    <div class="category-scroll" v-if="categories.length > 1">
      <button
        v-for="(cat, idx) in categories"
        :key="idx"
        @click="selectedCategory = cat"
        :class="['category-chip', selectedCategory === cat ? 'active' : '']"
      >
        {{ cat }}
      </button>
    </div>

    <!-- LOADING STATE -->
    <div v-if="loading" class="loading-container">
      <ion-spinner name="crescent" color="primary"></ion-spinner>
    </div>

    <!-- GALLERY LIST / GRID -->
    <template v-else-if="filteredItems.length > 0">
      <div :class="showAll ? 'gallery-grid' : 'gallery-scroll'">
        <div v-for="item in filteredItems" :key="item.id" class="gallery-item">
          <!-- ADMIN ACTION BUTTONS -->
          <div v-if="isAdmin" class="admin-item-actions">
            <button @click="handleOpenEditModal(item)" class="action-btn edit-btn" title="Edit">
              <ion-icon :icon="createOutline" />
            </button>
            <button @click="handleDelete(item)" class="action-btn delete-btn" title="Hapus">
              <ion-icon :icon="trashOutline" />
            </button>
          </div>

          <img :src="item.image_url" :alt="item.title" @click="handleViewDetail(item)" />
          
          <span class="category-badge">{{ item.category }}</span>

          <div class="gallery-overlay" @click="handleViewDetail(item)">
            <h4>{{ item.title }}</h4>
            <p v-if="item.description">{{ item.description }}</p>
          </div>
        </div>
      </div>
    </template>

    <!-- EMPTY STATE -->
    <div v-else class="empty-state">
      <ion-icon :icon="imageOutline" class="empty-icon" />
      <p>Belum ada dokumentasi foto pada kategori ini.</p>
    </div>

    <!-- MODAL DETAIL / LIGHTBOX -->
    <div v-if="selectedItem" class="modal-backdrop" @click="selectedItem = null">
      <div class="modal-detail-card" @click.stop>
        <button class="modal-close-btn" @click="selectedItem = null">
          <ion-icon :icon="closeOutline" />
        </button>
        <div class="modal-image-wrapper">
          <img :src="selectedItem.image_url" :alt="selectedItem.title" />
        </div>
        <div class="modal-info">
          <span class="modal-category">{{ selectedItem.category }}</span>
          <h3>{{ selectedItem.title }}</h3>
          <p>{{ selectedItem.description || 'Tidak ada deskripsi.' }}</p>
        </div>
      </div>
    </div>

    <!-- MODAL ADD / EDIT ADMIN -->
    <div v-if="isModalOpen" class="modal-backdrop">
      <div class="admin-modal-card">
        <div class="admin-modal-header">
          <h3>{{ editingId ? 'Edit Galeri' : 'Tambah Galeri Baru' }}</h3>
          <button @click="handleCloseModal" :disabled="saving" class="close-icon-btn">
            <ion-icon :icon="closeOutline" />
          </button>
        </div>

        <div v-if="message.text" :class="['alert-box', message.type]">
          {{ message.text }}
        </div>

        <form @submit.prevent="handleSubmit" class="admin-form">
          <div class="form-group">
            <label class="form-label">Judul</label>
            <input
              type="text"
              required
              v-model="formData.title"
              placeholder="Contoh: Area Taman Utama"
              class="custom-input-field"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Kategori</label>
            <input
              type="text"
              required
              v-model="formData.category"
              placeholder="Contoh: Fasilitas, Unit, Lingkungan"
              class="custom-input-field"
            />
          </div>

          <div class="form-group">
            <label class="form-label">Foto (Maks. 5 MB)</label>
            <label for="mobile-gallery-file" class="upload-dropzone">
              <ion-icon :icon="cloudUploadOutline" class="drop-icon" />
              <span class="drop-text">{{ selectedFile ? selectedFile.name : 'Pilih Foto dari Perangkat' }}</span>
              <span class="drop-hint">JPG, PNG, WEBP</span>
              <input
                id="mobile-gallery-file"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                @change="handleFileChange"
                style="display: none;"
              />
            </label>

            <div v-if="previewUrl" class="image-preview">
              <img :src="previewUrl" alt="Preview" />
            </div>
          </div>

          <div class="form-group">
            <label class="form-label">Deskripsi (Opsional)</label>
            <textarea
              rows="3"
              v-model="formData.description"
              placeholder="Tulis deskripsi foto..."
              class="custom-textarea-field"
            ></textarea>
          </div>

          <div class="form-actions">
            <button type="button" @click="handleCloseModal" :disabled="saving" class="btn-cancel">
              Batal
            </button>
            <button type="submit" :disabled="saving" class="btn-save">
              <ion-spinner v-if="saving" name="crescent" style="width: 16px; height: 16px; margin-right: 6px;"></ion-spinner>
              <span>{{ saving ? 'Menyimpan...' : 'Simpan' }}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { IonIcon, IonSpinner } from '@ionic/vue'
import {
  chevronForwardOutline,
  chevronUpOutline,
  addOutline,
  createOutline,
  trashOutline,
  imageOutline,
  closeOutline,
  cloudUploadOutline
} from 'ionicons/icons'
import { supabase } from '@/services/config/supabase'
import { galleryService } from '@/services/galleryService'

interface GalleryItem {
  id: string
  title: string
  category: string
  description?: string
  image_url: string
  sort_order?: number
  is_active?: boolean
}

const galleryItems = ref<GalleryItem[]>([])
const loading = ref(true)
const isAdmin = ref(false)
const showAll = ref(false)
const selectedCategory = ref('Semua')
const selectedItem = ref<GalleryItem | null>(null)

const isModalOpen = ref(false)
const editingId = ref<string | null>(null)
const saving = ref(false)
const message = ref({ text: '', type: '' })

const formData = ref({
  title: '',
  category: '',
  description: '',
  image_url: ''
})

const selectedFile = ref<File | null>(null)
const previewUrl = ref('')

let refreshing = false

const fetchGallery = async (forceRefresh = false) => {
  try {
    loading.value = true

    const data = await galleryService.getGallery(true)

    if (data) {
      galleryItems.value = data
    }

    return true
  } catch (error) {
    console.error('Gagal mengambil data galeri:', error)
    return false
  } finally {
    loading.value = false
  }
}

const handleRefreshData = async () => {
  if (refreshing) return

  refreshing = true

  try {
    await fetchGallery(true)

    window.dispatchEvent(
      new CustomEvent('poliland:refresh-item-complete', {
        detail: { source: 'gallery' }
      })
    )
  } catch (error) {
    console.error('Gagal refresh gallery:', error)

    window.dispatchEvent(
      new CustomEvent('poliland:refresh-item-complete', {
        detail: { source: 'gallery', error: true }
      })
    )
  } finally {
    refreshing = false
  }
}

const checkAdminRole = async () => {
  try {
    const { data: sessionData } = await supabase.auth.getSession()
    const session = sessionData?.session

    if (!session) return

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', session.user.id)
      .single()

    if (profile && (profile.role === 'admin' || profile.role === 'superadmin')) {
      isAdmin.value = true
    }
  } catch (error) {
    console.error('Gagal mengecek admin:', error)
  }
}

onMounted(() => {
  fetchGallery()
  checkAdminRole()

  window.addEventListener('poliland:refresh-data', handleRefreshData)
})

onUnmounted(() => {
  window.removeEventListener('poliland:refresh-data', handleRefreshData)

  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }
})

const categories = computed(() => {
  const cats = galleryItems.value
    .map((item) => item.category)
    .filter(Boolean)

  return ['Semua', ...Array.from(new Set(cats))]
})

const filteredItems = computed(() => {
  if (selectedCategory.value === 'Semua') {
    return galleryItems.value
  }

  return galleryItems.value.filter(
    (item) => item.category === selectedCategory.value
  )
})

const handleOpenSeeAll = () => {
  showAll.value = !showAll.value
}

const handleViewDetail = (item: GalleryItem) => {
  selectedItem.value = item
}

const handleOpenAddModal = () => {
  editingId.value = null

  formData.value = {
    title: '',
    category: '',
    description: '',
    image_url: ''
  }

  selectedFile.value = null
  previewUrl.value = ''
  message.value = {
    text: '',
    type: ''
  }

  isModalOpen.value = true
}

const handleOpenEditModal = (item: GalleryItem) => {
  editingId.value = item.id

  formData.value = {
    title: item.title || '',
    category: item.category || '',
    description: item.description || '',
    image_url: item.image_url || ''
  }

  selectedFile.value = null
  previewUrl.value = item.image_url || ''

  message.value = {
    text: '',
    type: ''
  }

  isModalOpen.value = true
}

const handleFileChange = (e: Event) => {
  const target = e.target as HTMLInputElement
  const file = target.files?.[0]

  if (!file) return

  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]

  if (!allowedTypes.includes(file.type)) {
    message.value = {
      text: 'Format file tidak didukung.',
      type: 'error'
    }
    return
  }

  if (file.size > 5 * 1024 * 1024) {
    message.value = {
      text: 'Ukuran file maksimal 5 MB.',
      type: 'error'
    }
    return
  }

  selectedFile.value = file

  if (previewUrl.value && previewUrl.value.startsWith('blob:')) {
    URL.revokeObjectURL(previewUrl.value)
  }

  previewUrl.value = URL.createObjectURL(file)
}

const handleCloseModal = () => {
  if (saving.value) return

  isModalOpen.value = false
}

const handleSubmit = async () => {
  try {
    saving.value = true

    let imageUrl = formData.value.image_url

    if (selectedFile.value) {
      const uploaded = await galleryService.uploadImage(selectedFile.value)
      imageUrl = uploaded.url
    }

    const payload = {
      title: formData.value.title,
      category: formData.value.category,
      description: formData.value.description,
      image_url: imageUrl,
      is_active: true
    }

    if (editingId.value) {
      await galleryService.updateGallery(editingId.value, payload)
    } else {
      await galleryService.createGallery(payload)
    }

    await fetchGallery(true)

    isModalOpen.value = false
  } catch (error) {
    console.error('Gagal menyimpan gallery:', error)

    message.value = {
      text: 'Gagal menyimpan data.',
      type: 'error'
    }
  } finally {
    saving.value = false
  }
}

const handleDelete = async (item: GalleryItem) => {
  const confirmed = window.confirm(
    `Hapus foto "${item.title}"?`
  )

  if (!confirmed) return

  try {
    await galleryService.deleteGallery(
      item.id,
      item.image_url
    )

    await fetchGallery(true)
  } catch (error) {
    console.error('Gagal menghapus gallery:', error)
  }
}
</script>

<style scoped>
.section { padding: 30px 16px 0; }
.section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.section-heading h2 { margin: 0; color: #1e293b; font-size: 20px; line-height: 1.2; font-weight: 800; letter-spacing: -0.3px; }
.heading-line { display: block; width: 34px; height: 3px; margin-top: 7px; background: #556B2F; border-radius: 999px; }
.eyebrow { display: block; margin-bottom: 4px; color: #556B2F; font-size: 9px; font-weight: 800; letter-spacing: 1px; }
.see-all { display: flex; align-items: center; gap: 3px; padding: 0; border: 0; background: transparent; color: #556B2F; font-size: 10px; font-weight: 700; white-space: nowrap; cursor: pointer; }
.see-all ion-icon { font-size: 14px; }

.admin-top-bar { display: flex; justify-content: flex-end; margin-bottom: 10px; }
.admin-add-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 12px; background: #556B2F; color: #ffffff; border-radius: 8px; font-size: 10px; font-weight: 700; border: none; box-shadow: 0 4px 10px rgba(85, 107, 47, 0.3); cursor: pointer; }

/* Category Filter Chips */
.category-scroll { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 10px; margin-right: -16px; padding-right: 16px; scrollbar-width: none; }
.category-scroll::-webkit-scrollbar { display: none; }
.category-chip { flex: 0 0 auto; padding: 5px 12px; border-radius: 20px; font-size: 10px; font-weight: 700; border: 1px solid #e2e8f0; background: #f8fafc; color: #64748b; cursor: pointer; transition: all 0.2s; }
.category-chip.active { background: #556B2F; color: #ffffff; border-color: #556B2F; box-shadow: 0 2px 8px rgba(85, 107, 47, 0.25); }

.loading-container { display: flex; justify-content: center; padding: 30px 0; }

/* Scroll or Grid view */
.gallery-scroll { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; margin-right: -16px; padding-right: 16px; scrollbar-width: none; }
.gallery-scroll::-webkit-scrollbar { display: none; }
.gallery-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding-bottom: 10px; }

.gallery-item { position: relative; flex: 0 0 160px; height: 115px; overflow: hidden; border-radius: 12px; background: #e2e8f0; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08); }
.gallery-grid .gallery-item { flex: unset; width: 100%; height: 125px; }
.gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform 0.4s ease; }
.gallery-item:hover img { transform: scale(1.05); }

.category-badge { position: absolute; top: 8px; left: 8px; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); color: #ffffff; font-size: 8px; font-weight: 700; padding: 2px 7px; border-radius: 999px; }

.gallery-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 60%, transparent 100%); display: flex; flex-direction: column; justify-content: flex-end; padding: 8px; color: #ffffff; cursor: pointer; }
.gallery-overlay h4 { margin: 0; font-size: 10px; font-weight: 700; line-height: 1.3; }
.gallery-overlay p { 
  margin: 2px 0 0; 
  font-size: 8px; 
  opacity: 0.85; 
  display: -webkit-box; 
  line-clamp: 1; 
  -webkit-line-clamp: 1; 
  -webkit-box-orient: vertical; 
  overflow: hidden; 
}

/* Admin Item Actions */
.admin-item-actions { position: absolute; top: 8px; right: 8px; z-index: 10; display: flex; gap: 4px; }
.action-btn { width: 24px; height: 24px; border-radius: 6px; border: none; display: flex; align-items: center; justify-content: center; font-size: 11px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.2); }
.edit-btn { background: #ffffff; color: #d97706; }
.delete-btn { background: #ffffff; color: #dc2626; }

.empty-state { text-align: center; padding: 30px 16px; color: #94a3b8; }
.empty-icon { font-size: 28px; margin-bottom: 6px; }
.empty-state p { margin: 0; font-size: 10px; font-weight: 600; color: #64748b; }

/* Modals */
.modal-backdrop { position: fixed; inset: 0; z-index: 1000; background: rgba(0, 0, 0, 0.85); display: flex; align-items: center; justify-content: center; padding: 16px; }
.modal-detail-card { background: #ffffff; border-radius: 16px; width: 100%; max-width: 450px; overflow: hidden; position: relative; box-shadow: 0 20px 25px -5px rgba(0,0,0,0.3); }
.modal-close-btn { position: absolute; top: 10px; right: 10px; z-index: 10; width: 32px; height: 32px; border-radius: 50%; background: rgba(0,0,0,0.5); color: #ffffff; border: none; font-size: 18px; display: flex; align-items: center; justify-content: center; cursor: pointer; }
.modal-image-wrapper { width: 100%; height: 250px; background: #000; }
.modal-image-wrapper img { width: 100%; height: 100%; object-fit: contain; }
.modal-info { padding: 14px; }
.modal-category { display: inline-block; font-size: 9px; font-weight: 800; color: #556B2F; background: #f4f7f0; padding: 2px 8px; border-radius: 6px; margin-bottom: 6px; }
.modal-info h3 { margin: 0 0 6px; font-size: 14px; font-weight: 800; color: #1e293b; }
.modal-info p { margin: 0; font-size: 11px; color: #475569; line-height: 1.5; }

/* Admin Form Modal Styles */
.admin-modal-card { 
  background: #ffffff; 
  border-radius: 16px; 
  width: 100%; 
  max-width: 440px; 
  max-height: 90vh; 
  overflow-y: auto; 
  padding: 20px; 
  box-shadow: 0 20px 25px -5px rgba(0,0,0,0.1); 
}

.admin-modal-header { 
  display: flex; 
  justify-content: space-between; 
  align-items: center; 
  border-bottom: 1px solid #f1f5f9; 
  padding-bottom: 12px; 
  margin-bottom: 16px; 
}

.admin-modal-header h3 { 
  margin: 0; 
  font-size: 15px; 
  font-weight: 700; 
  color: #1e293b; 
}

.close-icon-btn { 
  background: transparent; 
  border: none; 
  font-size: 20px; 
  color: #64748b; 
  cursor: pointer; 
}

.alert-box { 
  padding: 10px 12px; 
  border-radius: 8px; 
  font-size: 12px; 
  font-weight: 600; 
  margin-bottom: 12px; 
}
.alert-box.success { background: #ecfdf5; color: #059669; border: 1px solid #a7f3d0; }
.alert-box.error { background: #fef2f2; color: #dc2626; border: 1px solid #fecaca; }

.admin-form .form-group { margin-bottom: 14px; }
.form-label { display: block; font-size: 12px; font-weight: 600; color: #334155; margin-bottom: 6px; }

.custom-input-field,
.custom-textarea-field { 
  width: 100%; 
  padding: 10px 12px; 
  font-size: 12px; 
  border: 1px solid #e2e8f0; 
  border-radius: 8px; 
  outline: none; 
  background: #f8fafc; 
  color: #1e293b; 
  transition: border-color 0.2s;
}

.custom-input-field:focus,
.custom-textarea-field:focus {
  border-color: #556B2F;
}

.custom-textarea-field { resize: none; }

.upload-dropzone { 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
  justify-content: center; 
  padding: 16px; 
  border: 2px dashed #cbd5e1; 
  border-radius: 12px; 
  background: #f8fafc; 
  cursor: pointer; 
  text-align: center; 
  transition: border-color 0.2s;
}
.upload-dropzone:hover { border-color: #556B2F; }
.drop-icon { font-size: 20px; color: #64748b; margin-bottom: 4px; }
.drop-text { font-size: 12px; font-weight: 500; color: #334155; }
.drop-hint { font-size: 10px; color: #94a3b8; margin-top: 2px; }

.image-preview { margin-top: 8px; border-radius: 8px; overflow: hidden; border: 1px solid #e2e8f0; height: 100px; }
.image-preview img { width: 100%; height: 100%; object-fit: cover; }

.form-actions { 
  display: flex; 
  justify-content: flex-end; 
  gap: 8px; 
  border-top: 1px solid #f1f5f9; 
  padding-top: 16px; 
  margin-top: 16px; 
}

.btn-cancel { 
  padding: 8px 16px; 
  background: transparent; 
  color: #64748b; 
  border-radius: 8px; 
  font-size: 12px; 
  font-weight: 600; 
  border: none; 
  cursor: pointer; 
}

.btn-save { 
  display: inline-flex; 
  align-items: center; 
  justify-content: center; 
  padding: 8px 18px; 
  background: #556B2F; 
  color: #ffffff; 
  border-radius: 8px; 
  font-size: 12px; 
  font-weight: 600; 
  border: none; 
  box-shadow: 0 4px 12px rgba(85, 107, 47, 0.2);
  cursor: pointer; 
}
.btn-save:hover { background: #4a5d28; }
</style>