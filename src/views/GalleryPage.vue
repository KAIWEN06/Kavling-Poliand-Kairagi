<template>
  <ion-page>
    <ion-content class="gallery-content">
      <div class="gallery-page pl-surface">
        <!-- HERO: adegan Welcome, bukit terdepan krem agar mengalir ke galeri -->
        <section class="gallery-hero">
          <SceneBackdrop class="hero-scene" height="54%" breathe sparkle solid-front="#F9F5EC" />

          <div class="hero-copy">
            <h1 aria-label="Temukan lingkungan investasi Anda.">
              <span v-for="(line, i) in heroLines" :key="line" class="hero-line" aria-hidden="true">
                <motion.span
                  class="hero-line-inner"
                  :initial="reduced ? false : { y: '110%' }"
                  :animate="{ y: '0%' }"
                  :transition="{ duration: 0.75, delay: 0.25 + i * 0.12, ease: MOTION_EASE_OUT }"
                >{{ line }}</motion.span>
              </span>
            </h1>
            <motion.p
              class="hero-sub"
              :initial="reduced ? false : { opacity: 0, y: 10 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.6, delay: 0.55, ease: MOTION_EASE_OUT }"
            >Foto kawasan, fasilitas, dan akses.</motion.p>
            <motion.div
              v-if="isAdmin"
              class="hero-admin"
              :initial="reduced ? false : { opacity: 0, y: 10 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.7, ease: MOTION_EASE_OUT }"
            >
              <AdminEditButton label="Tambah foto" :icon="addOutline" @click="openAdd" />
            </motion.div>
          </div>
        </section>

        <!-- KATEGORI -->
        <section class="category-section">
          <SectionHeader title="Kategori foto">
            <span v-if="!isLoading" class="photo-count">{{ filteredPhotos.length }} foto</span>
          </SectionHeader>

          <div class="category-scroll">
            <template v-if="isLoading">
              <Skeleton v-for="i in 5" :key="`category-skeleton-${i}`"
                :width="i === 1 ? '67px' : i === 2 ? '78px' : i === 3 ? '92px' : i === 4 ? '100px' : '78px'"
                height="44px" border-radius="999px" />
            </template>
            <template v-else>
              <button
                v-for="category in categories"
                :key="category.id"
                class="category-chip"
                :class="{ active: selectedCategory === category.id }"
                type="button"
                @click="selectedCategory = category.id"
              >
                <ion-icon :icon="category.icon" aria-hidden="true" />
                <span>{{ category.label }}</span>
              </button>
            </template>
          </div>
        </section>

        <section class="photos-section">
          <div v-if="isLoading" class="photo-grid gallery-skeleton-grid" :class="{ compact: compactView }">
            <div v-for="i in 8" :key="`photo-skeleton-${i}`" class="photo-card photo-card-skeleton">
              <div class="photo-image">
                <Skeleton width="100%" height="100%" border-radius="19px" />
                <div class="photo-overlay gallery-skeleton-overlay">
                  <div class="photo-top">
                    <Skeleton :width="i % 2 === 0 ? '58px' : '72px'" height="18px" border-radius="999px" />
                    <Skeleton width="30px" height="30px" border-radius="50%" />
                  </div>
                  <div class="photo-bottom">
                    <Skeleton width="78px" height="8px" border-radius="4px" />
                    <Skeleton :width="i % 2 === 0 ? '105px' : '135px'" height="11px" border-radius="4px" />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div v-else class="photo-grid" :class="{ compact: compactView }">
            <button
              v-for="(photo, index) in filteredPhotos"
              :key="photo.id"
              class="photo-card"
              :class="{ featured: index === 0 && selectedCategory === 'all' }"
              :style="{ '--i': Math.min(index, 8) }"
              @click="openPhoto(photo)"
            >
              <div class="photo-image">
                <img :src="photo.image" :alt="photo.title" loading="lazy" decoding="async" />
                <div class="photo-overlay">
                  <div class="photo-top">
                    <span class="photo-category">{{ photo.categoryLabel }}</span>
                    <span class="zoom-button"><ion-icon :icon="expandOutline" /></span>
                  </div>
                  <div class="photo-bottom">
                    <span>{{ photo.location }}</span>
                    <strong>{{ photo.title }}</strong>
                  </div>
                </div>
              </div>
            </button>
          </div>

          <StatusIllustration
            v-if="!isLoading && filteredPhotos.length === 0"
            :variant="photos.length ? 'no-result' : 'empty-data'"
            :title="photos.length ? 'Foto tidak ditemukan' : 'Belum ada foto'"
            :description="photos.length ? 'Foto untuk kategori ini belum tersedia.' : (isAdmin ? 'Galeri masih kosong. Tekan “Tambah foto” untuk mengisinya.' : 'Foto akan segera ditambahkan.')"
          />
        </section>

        <!-- CTA: panel hijau seperti halaman Tentang -->
        <ScrollReveal v-if="!isLoading" variant="scale">
          <section class="gallery-cta">
            <SceneBackdrop class="cta-scene" height="58%" />
            <div class="cta-body">
              <h2>Tertarik dengan lokasinya?</h2>
              <p>Kunjungi kawasan bersama tim kami.</p>
              <router-link class="cta-btn" to="/contact">
                Hubungi kami
                <ion-icon :icon="arrowForwardOutline" aria-hidden="true" />
              </router-link>
            </div>
          </section>
        </ScrollReveal>
      </div>

      <AppModal
        :model-value="!!selectedPhoto"
        :title="selectedPhoto?.title || 'Foto'"
        variant="dialog"
        max-width="640px"
        :show-confirm="false"
        :show-cancel="false"
        :show-footer="isAdmin"
        @update:model-value="closePhoto"
      >
        <template v-if="selectedPhoto">
          <img :src="selectedPhoto.image" :alt="selectedPhoto.title" class="lightbox-image" />
          <div class="lightbox-info">
            <span class="photo-category">{{ selectedPhoto.categoryLabel }}</span>
            <p>{{ selectedPhoto.location || 'Tidak ada deskripsi.' }}</p>
          </div>
        </template>
        <template #footer>
          <AppButton type="button" variant="neutral" fill="outline" @click="openEdit">Ubah</AppButton>
          <AppButton type="button" variant="danger" fill="outline" @click="askDelete">Hapus</AppButton>
        </template>
      </AppModal>

      <CmsItemFormModal v-model="formOpen" type="gallery" :item="editingItem" :count="photos.length" @saved="onSaved" />

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

      <CmsBackBar />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import {
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/vue'
import { motion } from 'motion-v'
import Skeleton from '@/components/ui/Skeleton.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import SceneBackdrop from '@/components/ui/SceneBackdrop.vue'
import ScrollReveal from '@/components/ui/ScrollReveal.vue'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { MOTION_EASE_OUT } from '@/utils/motionTokens'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AdminEditButton from '@/components/Admin/AdminEditButton.vue'
import CmsBackBar from '@/components/Admin/CmsBackBar.vue'
import CmsItemFormModal from '@/components/Admin/CmsItemFormModal.vue'
import { galleryService } from '@/services/galleryService'
import { useCmsAdmin } from '@/composables/useCmsAdmin'
import { useToast } from '@/composables/useToast'
import {
  addOutline,
  arrowForwardOutline,
  expandOutline,
  gridOutline,
  imagesOutline,
  locationOutline,
} from 'ionicons/icons'

interface GalleryRow {
  id: string
  title: string
  category: string | null
  description?: string | null
  image_url: string
}

interface GalleryPhoto {
  id: string
  title: string
  location: string
  category: string
  categoryLabel: string
  image: string
  row: GalleryRow
}

const toast = useToast()
const { isAdmin } = useCmsAdmin()
const reduced = useReducedMotion()
const heroLines = ['Temukan lingkungan', 'investasi Anda.']

/** Foto dan kategori sepenuhnya berasal dari database (diatur Admin). */
const rows = ref<GalleryRow[]>([])
const photos = computed<GalleryPhoto[]>(() => rows.value.map((row) => ({
  id: row.id,
  title: row.title,
  location: row.description || '',
  category: row.category || 'Umum',
  categoryLabel: row.category || 'Umum',
  image: row.image_url,
  row,
})))

const categories = computed(() => [
  { id: 'all', label: 'Semua', icon: gridOutline },
  ...Array.from(new Set(photos.value.map((photo) => photo.category))).map((name) => ({ id: name, label: name, icon: imagesOutline })),
])

const selectedCategory = ref('all')
const selectedPhoto = ref<GalleryPhoto | null>(null)
const compactView = ref(false)
const isLoading = ref(true)

const formOpen = ref(false)
const editingItem = ref<GalleryRow | null>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<GalleryPhoto | null>(null)
const deleting = ref(false)

async function loadPhotos() {
  try {
    rows.value = (await galleryService.getGallery(true)) as GalleryRow[]
    if (!categories.value.some((category) => category.id === selectedCategory.value)) selectedCategory.value = 'all'
  } catch (error) {
    console.error('Gagal memuat galeri:', error)
    toast.error('Galeri gagal dimuat. Tarik layar ke bawah untuk mencoba lagi.')
  } finally {
    isLoading.value = false
  }
}

const handleRefresh = async () => {
  isLoading.value = true
  await loadPhotos()
  window.dispatchEvent(new CustomEvent('poliland:refresh-complete'))
}

const filteredPhotos = computed(() =>
  selectedCategory.value === 'all'
    ? photos.value
    : photos.value.filter((photo) => photo.category === selectedCategory.value),
)

function openPhoto(photo: GalleryPhoto) { selectedPhoto.value = photo }
function closePhoto() { selectedPhoto.value = null }

function openAdd() { editingItem.value = null; formOpen.value = true }
function openEdit() {
  editingItem.value = selectedPhoto.value?.row ?? null
  closePhoto()
  formOpen.value = true
}
async function onSaved(message: string) { toast.success(message); await loadPhotos() }

function askDelete() {
  deleteTarget.value = selectedPhoto.value
  closePhoto()
  deleteOpen.value = true
}
async function confirmDelete() {
  const photo = deleteTarget.value
  if (!photo) return
  deleting.value = true
  try {
    await galleryService.deleteGallery(photo.id, photo.image)
    deleteOpen.value = false
    toast.success('Foto dihapus.')
    await loadPhotos()
  } catch (error) {
    deleteOpen.value = false
    toast.error(error instanceof Error ? error.message : 'Foto gagal dihapus.')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  void loadPhotos()
  window.addEventListener('poliland:refresh', handleRefresh)
})

onBeforeUnmount(() => {
  window.removeEventListener('poliland:refresh', handleRefresh)
})
</script>

<style scoped>
:global(:root) {
  --gallery-charcoal: #1a1a1a;
  --gallery-slate: #2d2d2d;
  --gallery-gray: #6b6b6b;
  --gallery-silver: #e5e5e5;
  --gallery-background: var(--pl-paper, #f9f5ec);
  --gallery-surface: #ffffff;
  --gallery-olive: #556b2f;
  --gallery-sage: #8ca072;
  --gallery-sand: #ede6d6;
  --gallery-stone: #d9d3c4;
  --gallery-gold: #b8860b;
  --gallery-gold-light: #f4e3b2;
}

.gallery-content {
  --background: var(--pl-paper, #f9f5ec);
  --padding-bottom: calc(110px + env(safe-area-inset-bottom));
}

.gallery-page { padding-bottom: 28px; }

/* ---------- Hero ---------- */
.gallery-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: clamp(420px, 66dvh, 540px);
  padding: calc(env(safe-area-inset-top, 0px) + 24px) 24px 0;
  overflow: hidden;
  background:
    radial-gradient(110% 60% at 100% 0%, rgba(244, 214, 154, 0.26) 0%, rgba(244, 214, 154, 0) 62%),
    linear-gradient(165deg, var(--green-700, #355a2c) 0%, var(--green-900, #1f3519) 100%);
  color: #fff;
}
.hero-scene { z-index: 1; }
.hero-copy { position: relative; z-index: 3; padding-bottom: 150px; }

.eyebrow {
  display: block;
  margin-bottom: 14px;
  color: var(--poliland-gold-soft, #f4d69a);
  font: 800 11px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.gallery-hero h1 {
  margin: 0;
  color: #fff;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: clamp(38px, 10.8vw, 54px);
  line-height: 1.05;
  font-weight: 650;
  letter-spacing: -0.02em;
}
.hero-line { display: block; overflow: hidden; padding-bottom: 0.08em; }
.hero-line-inner { display: block; will-change: transform; }
.hero-sub {
  max-width: 30ch;
  margin: 14px 0 0;
  color: rgba(244, 241, 232, 0.92);
  font-size: 16px;
  line-height: 1.55;
}
.hero-admin { margin-top: 16px; }

/* ---------- Kategori ---------- */
.category-section { padding: 8px 20px 4px; }
.photo-count { color: var(--text-secondary, #5f5f66); font-size: 13px; font-weight: 700; white-space: nowrap; }

.category-scroll {
  display: flex;
  gap: 9px;
  margin: 0 -20px;
  padding: 2px 20px 10px;
  overflow-x: auto;
  scrollbar-width: none;
  scroll-snap-type: x proximity;
}
.category-scroll::-webkit-scrollbar { display: none; }

.category-chip {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 16px;
  border: 1px solid var(--border-strong, #d5d0c4);
  border-radius: 999px;
  background: var(--surface-primary, #fff);
  color: var(--text-primary, #252525);
  font: 700 14px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  scroll-snap-align: start;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background-color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out), transform var(--dur-base) var(--ease-spring);
}
.category-chip ion-icon { font-size: 18px; }
.category-chip:active { transform: scale(0.96); }
.category-chip:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 2px; }
.category-chip.active {
  border-color: var(--poliland-green, #355a2c);
  background: var(--poliland-green, #355a2c);
  color: #fff;
  box-shadow: 0 8px 18px -8px rgba(53, 90, 44, 0.6);
}

/* ---------- Foto ---------- */
.photos-section { padding: 14px 16px 0; }

.photo-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.photo-card {
  min-width: 0;
  padding: 0;
  border: 0;
  overflow: hidden;
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
  box-shadow: var(--shadow-md);
  text-align: left;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  /* Kartu masuk berurutan; --i dibatasi 8 agar kartu di bawah layar tidak menunda. */
  animation: photo-in 560ms var(--ease-spring) backwards;
  animation-delay: calc(var(--i, 0) * 60ms);
  transition: transform var(--dur-base) var(--ease-spring);
}
.photo-card:active { transform: scale(0.97); }
.photo-card:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 3px; }
.photo-card-skeleton { pointer-events: none; animation: none; }

@keyframes photo-in {
  from { opacity: 0; translate: 0 22px; scale: 0.97; }
}

.photo-image {
  position: relative;
  aspect-ratio: 1 / 1.12;
  overflow: hidden;
  background: var(--gallery-sand, #ede6d6);
}
.photo-card.featured { grid-column: span 2; }
.photo-card.featured .photo-image { aspect-ratio: 16 / 9; }

.photo-image img {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform var(--dur-slow) var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .photo-card:hover .photo-image img { transform: scale(1.045); }
}

.photo-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px;
  background: linear-gradient(to bottom, rgba(27, 40, 22, 0.5), transparent 35%, rgba(27, 40, 22, 0.86));
}
.photo-top,
.photo-bottom { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.photo-bottom { flex-direction: column; align-items: flex-start; justify-content: flex-end; }

.photo-category {
  display: inline-flex;
  width: fit-content;
  padding: 5px 9px;
  border-radius: 8px;
  background: rgba(27, 40, 22, 0.72);
  -webkit-backdrop-filter: blur(7px);
  backdrop-filter: blur(7px);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
  letter-spacing: 0.04em;
}
.zoom-button {
  display: grid;
  place-items: center;
  width: 32px;
  height: 32px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  background: rgba(27, 40, 22, 0.5);
  -webkit-backdrop-filter: blur(7px);
  backdrop-filter: blur(7px);
  color: #fff;
}
.zoom-button ion-icon { font-size: 16px; }

.photo-bottom span { color: rgba(255, 255, 255, 0.9); font-size: 12px; font-weight: 600; line-height: 1.3; }
.photo-bottom strong { margin-top: 3px; color: #fff; font-size: 14px; line-height: 1.25; }

.photo-grid.compact { grid-template-columns: repeat(3, minmax(0, 1fr)); }
.photo-grid.compact .photo-card.featured { grid-column: span 3; }
.photo-grid.compact .photo-card.featured .photo-image { aspect-ratio: 16 / 7; }

.gallery-skeleton-overlay { opacity: 1; background: linear-gradient(180deg, transparent 40%, rgba(27, 40, 22, 0.42) 100%); }
.gallery-skeleton-overlay .photo-top,
.gallery-skeleton-overlay .photo-bottom { opacity: 1; }
.gallery-skeleton-overlay .photo-bottom { display: flex; flex-direction: column; align-items: flex-start; gap: 6px; }

/* ---------- CTA ---------- */
.gallery-cta {
  position: relative;
  margin: 32px 16px 0;
  overflow: hidden;
  border-radius: 24px;
  background:
    radial-gradient(90% 80% at 100% 0%, rgba(244, 214, 154, 0.26) 0%, rgba(244, 214, 154, 0) 60%),
    linear-gradient(155deg, var(--green-700, #355a2c) 0%, var(--green-900, #1f3519) 100%);
  box-shadow: var(--shadow-md);
  color: #fff;
}
.cta-scene { z-index: 0; }
.cta-body { position: relative; z-index: 2; padding: 36px 24px 96px; }
.gallery-cta h2 {
  margin: 0;
  color: #fff;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: clamp(28px, 7.6vw, 34px);
  line-height: 1.1;
  font-weight: 650;
  letter-spacing: -0.02em;
}
.gallery-cta p {
  max-width: 34ch;
  margin: 12px 0 22px;
  color: rgba(244, 241, 232, 0.92);
  font-size: 15px;
  line-height: 1.6;
}
.cta-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  min-height: 52px;
  padding: 0 24px;
  border-radius: 14px;
  background: var(--poliland-gold, #cba044);
  color: var(--ink, #1b1f1a);
  font: 800 15px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  text-decoration: none;
  box-shadow: 0 12px 26px -10px rgba(203, 160, 68, 0.85);
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-base) var(--ease-spring);
}
.cta-btn ion-icon { font-size: 20px; }
.cta-btn:active { transform: scale(0.97); }
.cta-btn:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }

/* ---------- Lightbox ---------- */
.lightbox-image { display: block; width: 100%; max-height: 52dvh; object-fit: contain; border-radius: 12px; background: #000; }
.lightbox-info { margin-top: 12px; }
.lightbox-info .photo-category { display: inline-block; margin-bottom: 8px; padding: 3px 10px; border-radius: 999px; background: var(--poliland-green, #355a2c); color: #fff; font-size: 11px; font-weight: 800; }
.lightbox-info p { margin: 0; color: var(--text-secondary, #5f5f66); font-size: 14px; line-height: 1.6; }
.confirm-text { margin: 0; color: var(--text-secondary, #5f5f66); font-size: 14px; line-height: 1.6; }

@media (min-width: 700px) {
  .gallery-page { max-width: 1100px; margin: 0 auto; }
  .photo-grid { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
  .photo-card.featured { grid-column: span 2; }
  .photo-image { aspect-ratio: 1 / 1; }
}
@media (min-width: 1024px) {
  .photo-grid,
  .photo-grid.compact { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .photo-card.featured,
  .photo-grid.compact .photo-card.featured { grid-column: span 2; grid-row: span 2; }
  .photo-card.featured .photo-image { aspect-ratio: auto; height: 100%; min-height: 460px; }
}

@media (prefers-reduced-motion: reduce) {
  .photo-card { animation: none; }
  .photo-card:active,
  .category-chip:active,
  .cta-btn:active { transform: none; }
}
</style>