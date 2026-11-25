<template>
  <section v-if="loading || galleryItems.length || isAdmin" class="section gallery-section">
    <SectionHeader title="Galeri & fasilitas">
      <button v-if="galleryItems.length > 2" class="see-all" type="button" @click="handleOpenSeeAll">
        <span>Lihat semua</span>
        <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
      </button>
    </SectionHeader>

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
      <div class="gallery-scroll">
        <div v-for="item in filteredItems" :key="item.id" class="gallery-item">
          <!-- ADMIN ACTION BUTTONS -->
          <div v-if="isAdmin" class="admin-item-actions">
            <button type="button" class="action-btn edit-btn" aria-label="Ubah foto" @click="openEdit(item)">
              <ion-icon :icon="createOutline" />
            </button>
            <button type="button" class="action-btn delete-btn" aria-label="Hapus foto" @click="askDelete(item)">
              <ion-icon :icon="trashOutline" />
            </button>
          </div>

          <button type="button" class="item-open" :aria-label="`Lihat foto ${item.title}`" @click="selectedItem = item">
            <img :src="item.image_url" :alt="item.title" loading="lazy" decoding="async" />
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
import SectionHeader from '@/components/ui/SectionHeader.vue'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useRouter } from 'vue-router'
import { IonIcon, IonSpinner } from '@ionic/vue'
import {
  chevronForwardOutline,
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
const router = useRouter()
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

const handleOpenSeeAll = () => { router.push('/gallery') }

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
.section { padding: 36px 20px 0; }
.see-all { display: inline-flex; align-items: center; gap: 3px; min-height: 44px; padding: 0 4px; border: 0; background: transparent; color: var(--poliland-green, #355a2c); font: 700 14px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif); white-space: nowrap; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.see-all ion-icon { font-size: 16px; transition: transform var(--dur-base) var(--ease-spring); }
.see-all:active ion-icon { transform: translateX(3px); }
.see-all:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 2px; }

.admin-top-bar { display: flex; justify-content: flex-end; margin-bottom: 8px; }

/* Filter kategori */
.category-scroll { display: flex; gap: 8px; margin: 0 -20px; padding: 0 20px 12px; overflow-x: auto; scrollbar-width: none; }
.category-scroll::-webkit-scrollbar { display: none; }
.category-chip { flex: 0 0 auto; min-height: 44px; padding: 0 16px; border: 1px solid var(--border-strong, #d5d0c4); border-radius: 999px; background: var(--surface-primary, #fff); color: var(--text-primary, #252525); font: 700 14px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif); cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; transition: background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), transform var(--dur-base) var(--ease-spring); }
.category-chip:active { transform: scale(0.96); }
.category-chip:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 2px; }
.category-chip.active { border-color: var(--poliland-green, #355a2c); background: var(--poliland-green, #355a2c); color: #fff; box-shadow: 0 8px 18px -8px rgba(53, 90, 44, 0.6); }

.loading-container { display: flex; justify-content: center; padding: 30px 0; }

/* Daftar foto */
.gallery-scroll { display: flex; gap: 12px; margin: 0 -20px; padding: 2px 20px 12px; overflow-x: auto; scrollbar-width: none; scroll-snap-type: x proximity; }
.gallery-scroll::-webkit-scrollbar { display: none; }
.gallery-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding-bottom: 10px; }

.gallery-item { position: relative; flex: 0 0 min(240px, 68vw); height: 180px; overflow: hidden; border-radius: var(--radius-panel, 20px); background: var(--green-100, #e8eee4); box-shadow: var(--shadow-md); scroll-snap-align: start; transition: transform var(--dur-base) var(--ease-spring); }
.gallery-item:active { transform: scale(0.97); }
.gallery-grid .gallery-item { flex: unset; width: 100%; height: 150px; }
.item-open { position: absolute; inset: 0; display: block; width: 100%; height: 100%; padding: 0; border: 0; background: transparent; cursor: pointer; text-align: left; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.item-open:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: -3px; }
.gallery-item img { width: 100%; height: 100%; object-fit: cover; transition: transform var(--dur-slow, 400ms) var(--ease-out); }
@media (hover: hover) and (pointer: fine) {
  .gallery-item:hover img { transform: scale(1.05); }
}

.category-badge { position: absolute; top: 10px; left: 10px; padding: 4px 10px; border-radius: 999px; background: rgba(27, 40, 22, 0.72); -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); color: #fff; font-size: 11px; font-weight: 700; }

.gallery-overlay { position: absolute; inset: 0; display: flex; flex-direction: column; justify-content: flex-end; padding: 12px; background: linear-gradient(to top, rgba(27, 40, 22, 0.86) 0%, rgba(27, 40, 22, 0.2) 55%, transparent 100%); color: #fff; pointer-events: none; }
.gallery-overlay h4 { margin: 0; font-size: 15px; font-weight: 800; line-height: 1.25; }
.gallery-overlay p { display: -webkit-box; margin: 3px 0 0; overflow: hidden; font-size: 12px; opacity: 0.92; -webkit-line-clamp: 1; line-clamp: 1; -webkit-box-orient: vertical; }

/* Aksi admin */
.admin-item-actions { position: absolute; top: 6px; right: 6px; z-index: 10; display: flex; gap: 6px; }
.action-btn { display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 12px; background: #fff; font-size: 18px; box-shadow: var(--shadow-sm); cursor: pointer; touch-action: manipulation; }
.action-btn:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 2px; }
.edit-btn { color: var(--poliland-gold-text, #805708); }
.delete-btn { color: var(--status-danger, #b3261e); }

.empty-state { padding: 30px 16px; border: 1px dashed var(--border-strong, #d5d0c4); border-radius: var(--radius-card, 16px); color: var(--text-secondary, #5f5f66); text-align: center; }
.empty-icon { margin-bottom: 6px; font-size: 28px; }
.empty-state p { margin: 0; color: var(--text-secondary, #5f5f66); font-size: 14px; font-weight: 600; line-height: 1.5; }

/* Lightbox (dalam AppModal) */
.modal-image-wrapper { width: 100%; max-height: 52dvh; overflow: hidden; border-radius: 12px; background: #000; }
.modal-image-wrapper img { display: block; width: 100%; max-height: 52dvh; object-fit: contain; }
.modal-info { padding-top: 12px; }
.modal-category { display: inline-block; margin-bottom: 8px; padding: 3px 10px; border-radius: 999px; background: var(--green-100, #e8eee4); color: var(--poliland-green, #355a2c); font-size: 12px; font-weight: 800; }
.modal-info p { margin: 0; color: var(--text-secondary, #5f5f66); font-size: 14px; line-height: 1.6; }
.confirm-text { margin: 0; color: var(--text-secondary, #5f5f66); font-size: 14px; line-height: 1.6; }

@media (prefers-reduced-motion: reduce) {
  .gallery-item:active,
  .category-chip:active { transform: none; }
}
</style>
