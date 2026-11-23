<template>
  <section v-if="loading || galleryItems.length || isAdmin" class="section gallery-section">
    <!-- HEADER -->
    <div class="section-heading">
      <div>
        <span class="eyebrow">DOKUMENTASI KAWASAN</span>
        <h2>Galeri & Fasilitas</h2>
        <span class="heading-line"></span>
      </div>
      <button v-if="galleryItems.length > 2" class="see-all" type="button" @click="handleOpenSeeAll">
        <span>{{ showAll ? 'Tutup' : 'Lihat Semua' }}</span>
        <ion-icon :icon="showAll ? chevronUpOutline : chevronForwardOutline" />
      </button>
    </div>

    <!-- ADMIN ADD BUTTON -->
    <div v-if="isAdmin" class="admin-top-bar">
      <AdminEditButton label="Tambah foto" :icon="addOutline" @click="openAdd" />
    </div>

    <!-- CATEGORY FILTER -->
    <div class="category-scroll" v-if="categories.length > 2">
      <button
        v-for="cat in categories"
        :key="cat"
        type="button"
        :class="['category-chip', selectedCategory === cat ? 'active' : '']"
        :aria-pressed="selectedCategory === cat"
        @click="selectedCategory = cat"
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
            <button type="button" class="action-btn edit-btn" aria-label="Edit foto" @click="openEdit(item)">
              <ion-icon :icon="createOutline" />
            </button>
            <button type="button" class="action-btn delete-btn" aria-label="Hapus foto" @click="askDelete(item)">
              <ion-icon :icon="trashOutline" />
            </button>
          </div>

          <button type="button" class="item-open" :aria-label="`Lihat foto ${item.title}`" @click="selectedItem = item">
            <img :src="item.image_url" :alt="item.title" loading="lazy" />
            <span class="category-badge">{{ item.category }}</span>
            <span class="gallery-overlay">
              <h4>{{ item.title }}</h4>
              <p v-if="item.description">{{ item.description }}</p>
            </span>
          </button>
        </div>
      </div>
    </template>

    <!-- EMPTY STATE -->
    <StatusIllustration
      v-else
      :variant="galleryItems.length ? 'no-result' : 'empty-data'"
      :title="galleryItems.length ? 'Foto tidak ditemukan' : 'Galeri masih kosong'"
      :description="galleryItems.length ? 'Belum ada foto pada kategori ini.' : 'Tekan “Tambah foto” untuk mengisinya.'"
      size="sm"
    />

    <!-- LIGHTBOX -->
    <AppModal
      :model-value="!!selectedItem"
      :title="selectedItem?.title || 'Foto'"
      variant="dialog"
      max-width="560px"
      :show-footer="false"
      @update:model-value="selectedItem = null"
    >
      <template v-if="selectedItem">
        <div class="modal-image-wrapper">
          <img :src="selectedItem.image_url" :alt="selectedItem.title" />
        </div>
        <div class="modal-info">
          <span class="modal-category">{{ selectedItem.category }}</span>
          <p>{{ selectedItem.description || 'Tidak ada deskripsi.' }}</p>
        </div>
      </template>
    </AppModal>

    <!-- ADMIN: TAMBAH / EDIT -->
    <CmsItemFormModal v-model="formOpen" type="gallery" :item="editingItem" :count="galleryItems.length" @saved="onSaved" />

    <!-- ADMIN: KONFIRMASI HAPUS -->
    <AppModal
      v-model="deleteOpen"
      variant="dialog"
      title="Hapus foto ini?"
      confirm-text="Hapus"
      confirm-variant="danger"
      :loading="deleting"
      @confirm="confirmDelete"
    >
      <p class="confirm-text">“{{ deleteTarget?.title }}” akan dihapus dari galeri dan tidak bisa dikembalikan.</p>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { IonIcon, IonSpinner } from '@ionic/vue'
import {
  chevronForwardOutline,
  chevronUpOutline,
  addOutline,
  createOutline,
  trashOutline,
} from 'ionicons/icons'
import AppModal from '@/components/ui/AppModal.vue'
import AdminEditButton from '@/components/Admin/AdminEditButton.vue'
import CmsItemFormModal from '@/components/Admin/CmsItemFormModal.vue'
import { galleryService } from '@/services/galleryService'
import { useCmsAdmin } from '@/composables/useCmsAdmin'
import { useToast } from '@/composables/useToast'

interface GalleryItem {
  id: string
  title: string
  category: string
  description?: string
  image_url: string
  sort_order?: number
  is_active?: boolean
}

const toast = useToast()
const { isAdmin } = useCmsAdmin()

const galleryItems = ref<GalleryItem[]>([])
const loading = ref(true)
const showAll = ref(false)
const selectedCategory = ref('Semua')
const selectedItem = ref<GalleryItem | null>(null)

const formOpen = ref(false)
const editingItem = ref<GalleryItem | null>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<GalleryItem | null>(null)
const deleting = ref(false)

let refreshing = false

/** Semua foto berasal dari database dan diatur Admin. Tidak ada foto contoh di kode. */
const fetchGallery = async () => {
  try {
    galleryItems.value = (await galleryService.getGallery(true)) || []
    if (!categories.value.includes(selectedCategory.value)) selectedCategory.value = 'Semua'
  } catch (error) {
    console.error('Gagal mengambil data galeri:', error)
  } finally {
    loading.value = false
  }
}

const handleRefreshData = async () => {
  if (refreshing) return
  refreshing = true
  try {
    await fetchGallery()
  } finally {
    refreshing = false
    window.dispatchEvent(new CustomEvent('poliland:refresh-item-complete', { detail: { source: 'gallery' } }))
  }
}

onMounted(() => {
  fetchGallery()
  window.addEventListener('poliland:refresh-data', handleRefreshData)
})

onUnmounted(() => {
  window.removeEventListener('poliland:refresh-data', handleRefreshData)
})

const categories = computed(() => {
  const cats = galleryItems.value.map((item) => item.category).filter(Boolean)
  return ['Semua', ...Array.from(new Set(cats))]
})

const filteredItems = computed(() => {
  if (selectedCategory.value === 'Semua') return galleryItems.value
  return galleryItems.value.filter((item) => item.category === selectedCategory.value)
})

const handleOpenSeeAll = () => { showAll.value = !showAll.value }

function openAdd() { editingItem.value = null; formOpen.value = true }
function openEdit(item: GalleryItem) { editingItem.value = item; formOpen.value = true }
async function onSaved(message: string) { toast.success(message); await fetchGallery() }

function askDelete(item: GalleryItem) { deleteTarget.value = item; deleteOpen.value = true }
async function confirmDelete() {
  const item = deleteTarget.value
  if (!item) return
  deleting.value = true
  try {
    await galleryService.deleteGallery(item.id, item.image_url)
    deleteOpen.value = false
    toast.success('Foto dihapus.')
    await fetchGallery()
  } catch (error) {
    deleteOpen.value = false
    toast.error(error instanceof Error ? error.message : 'Foto gagal dihapus.')
  } finally {
    deleting.value = false
  }
}
</script>

<style scoped>
.section { padding: 30px 16px 0; }
.section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 12px; }
.section-heading h2 { margin: 0; color: #1e293b; font-size: 20px; line-height: 1.2; font-weight: 800; letter-spacing: -0.3px; }
.heading-line { display: block; width: 34px; height: 3px; margin-top: 7px; background: #556B2F; border-radius: 999px; }
.eyebrow { display: block; margin-bottom: 4px; color: #556B2F; font-size: 10px; font-weight: 800; letter-spacing: 1px; }
.see-all { display: flex; align-items: center; gap: 3px; min-height: 44px; padding: 0 4px; border: 0; background: transparent; color: #556B2F; font-size: 11px; font-weight: 700; white-space: nowrap; cursor: pointer; }
.see-all ion-icon { font-size: 14px; }

.admin-top-bar { display: flex; justify-content: flex-end; margin-bottom: 8px; }

/* Category Filter Chips */
.category-scroll { display: flex; gap: 6px; overflow-x: auto; padding-bottom: 10px; margin-right: -16px; padding-right: 16px; scrollbar-width: none; }
.category-scroll::-webkit-scrollbar { display: none; }
.category-chip { flex: 0 0 auto; min-height: 36px; padding: 0 14px; border-radius: 20px; font-size: 11px; font-weight: 700; border: 1px solid #e2e8f0; background: #f8fafc; color: #64748b; cursor: pointer; transition: background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out); }
.category-chip.active { background: #556B2F; color: #ffffff; border-color: #556B2F; box-shadow: 0 2px 8px rgba(85, 107, 47, 0.25); }

.loading-container { display: flex; justify-content: center; padding: 30px 0; }

/* Scroll or Grid view */
.gallery-scroll { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; margin-right: -16px; padding-right: 16px; scrollbar-width: none; }
.gallery-scroll::-webkit-scrollbar { display: none; }
.gallery-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding-bottom: 10px; }

.gallery-item { position: relative; flex: 0 0 170px; height: 125px; overflow: hidden; border-radius: 12px; background: #e2e8f0; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.08); }
.gallery-grid .gallery-item { flex: unset; width: 100%; height: 135px; }
.item-open { position: absolute; inset: 0; display: block; width: 100%; height: 100%; padding: 0; border: 0; background: transparent; cursor: pointer; text-align: left; }
.item-open:focus-visible { outline: 3px solid #556B2F; outline-offset: -3px; }
.gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform var(--dur-base) var(--ease-out); }
@media (hover: hover) and (pointer: fine) {
  .gallery-item:hover img { transform: scale(1.05); }
}

.category-badge { position: absolute; top: 8px; left: 8px; background: rgba(0, 0, 0, 0.6); backdrop-filter: blur(4px); color: #ffffff; font-size: 9px; font-weight: 700; padding: 2px 8px; border-radius: 999px; }

.gallery-overlay { position: absolute; inset: 0; background: linear-gradient(to top, rgba(0,0,0,0.75) 0%, rgba(0,0,0,0.2) 60%, transparent 100%); display: flex; flex-direction: column; justify-content: flex-end; padding: 9px; color: #ffffff; pointer-events: none; }
.gallery-overlay h4 { margin: 0; font-size: 11px; font-weight: 700; line-height: 1.3; }
.gallery-overlay p {
  margin: 2px 0 0;
  font-size: 9px;
  opacity: 0.85;
  display: -webkit-box;
  line-clamp: 1;
  -webkit-line-clamp: 1;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* Admin Item Actions */
.admin-item-actions { position: absolute; top: 6px; right: 6px; z-index: 10; display: flex; gap: 6px; }
.action-btn { display: grid; place-items: center; width: 36px; height: 36px; border-radius: 10px; border: none; font-size: 16px; cursor: pointer; box-shadow: 0 2px 6px rgba(0,0,0,0.25); background: #ffffff; }
.action-btn:focus-visible { outline: 3px solid #556B2F; outline-offset: 2px; }
.edit-btn { color: #966a12; }
.delete-btn { color: #d94b45; }

.empty-state { text-align: center; padding: 30px 16px; color: #94a3b8; border: 1px dashed #d5d0c4; border-radius: 12px; }
.empty-icon { font-size: 28px; margin-bottom: 6px; }
.empty-state p { margin: 0; font-size: 12px; font-weight: 600; color: #64748b; line-height: 1.5; }

/* Lightbox (dalam AppModal) */
.modal-image-wrapper { width: 100%; max-height: 52dvh; overflow: hidden; border-radius: 12px; background: #000; }
.modal-image-wrapper img { display: block; width: 100%; max-height: 52dvh; object-fit: contain; }
.modal-info { padding-top: 12px; }
.modal-category { display: inline-block; margin-bottom: 8px; padding: 2px 10px; border-radius: 999px; background: #e8eee4; color: #355a2c; font-size: 11px; font-weight: 800; }
.modal-info p { margin: 0; color: #475569; font-size: 14px; line-height: 1.6; }
.confirm-text { margin: 0; color: #717178; font-size: 14px; line-height: 1.6; }
</style>
