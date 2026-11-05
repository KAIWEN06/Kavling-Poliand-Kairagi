<template>
  <ion-page>

    <ion-content class="gallery-content">
      <div class="gallery-page">
        <section class="gallery-hero">
          <template v-if="isLoading">
            <div class="hero-copy gallery-hero-skeleton-copy">
              <Skeleton width="82px" height="22px" border-radius="999px" />
              <Skeleton width="255px" height="34px" border-radius="7px" />
              <Skeleton width="215px" height="34px" border-radius="7px" />
              <Skeleton width="92%" height="10px" border-radius="5px" />
              <Skeleton width="76%" height="10px" border-radius="5px" />
            </div>
          </template>
          <template v-else>
            <div class="hero-copy">
              <h1>Temukan lingkungan<br />investasi Anda.</h1>
              <p>
                Lihat suasana kawasan, fasilitas, akses, dan perkembangan
                PoliLand Kairagi melalui koleksi foto kami.
              </p>
            </div>
          </template>

          <div class="hero-decoration">
            <template v-if="isLoading">
              <Skeleton width="82px" height="82px" border-radius="50%" />
            </template>
            <template v-else>
              <div class="hero-ring hero-ring-one"></div>
              <div class="hero-ring hero-ring-two"></div>
              <ion-icon :icon="imageOutline" />
            </template>
          </div>
        </section>

        <section class="category-section">
          <div class="section-heading">
            <template v-if="isLoading">
              <div class="gallery-section-heading-skeleton">
                <Skeleton width="65px" height="8px" border-radius="4px" />
                <Skeleton width="118px" height="20px" border-radius="5px" />
              </div>
              <Skeleton width="50px" height="9px" border-radius="4px" />
            </template>
            <template v-else>
              <div>
                <span class="section-label">JELAJAHI</span>
                <h2>Kategori Foto</h2>
              </div>
              <span class="photo-count">{{ filteredPhotos.length }} foto</span>
            </template>
          </div>

          <div class="category-scroll">
            <template v-if="isLoading">
              <Skeleton v-for="i in 5" :key="`category-skeleton-${i}`"
                :width="i === 1 ? '67px' : i === 2 ? '78px' : i === 3 ? '92px' : i === 4 ? '100px' : '78px'"
                height="42px" border-radius="999px" />
            </template>
            <template v-else>
              <button
                v-for="category in categories"
                :key="category.id"
                class="category-chip"
                :class="{ active: selectedCategory === category.id }"
                @click="selectedCategory = category.id"
              >
                <ion-icon :icon="category.icon" />
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
              @click="openPhoto(photo)"
            >
              <div class="photo-image">
                <img :src="photo.image" :alt="photo.title" loading="lazy" />
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

          <div v-if="!isLoading && filteredPhotos.length === 0" class="empty-state">
            <div class="empty-icon"><ion-icon :icon="imagesOutline" /></div>
            <h3>Belum ada foto</h3>
            <p>Foto untuk kategori ini belum tersedia.</p>
          </div>
        </section>

        <section class="gallery-cta">
          <template v-if="isLoading">
            <Skeleton width="48px" height="48px" border-radius="50%" />
            <div class="cta-copy gallery-cta-skeleton">
              <Skeleton width="82px" height="8px" border-radius="4px" />
              <Skeleton width="205px" height="20px" border-radius="5px" />
              <Skeleton width="100%" height="8px" border-radius="4px" />
              <Skeleton width="82%" height="8px" border-radius="4px" />
            </div>
            <Skeleton width="108px" height="40px" border-radius="9px" />
          </template>
          <template v-else>
            <div class="cta-icon"><ion-icon :icon="locationOutline" /></div>
            <div class="cta-copy">
              <span class="section-label">LIHAT LANGSUNG</span>
              <h2>Tertarik dengan lokasinya?</h2>
              <p>Datang dan lihat langsung lingkungan PoliLand Kairagi bersama tim kami.</p>
            </div>
            <AppButton class="cta-button" fill="solid" router-link="/contact">
              Hubungi Kami
              <ion-icon slot="end" :icon="arrowForwardOutline" />
            </AppButton>
          </template>
        </section>
      </div>

      <ion-modal
        :is-open="!!selectedPhoto"
        class="gallery-modal"
        @didDismiss="closePhoto"
      >
        <div v-if="selectedPhoto" class="lightbox">
          <button class="lightbox-close" @click="closePhoto" aria-label="Tutup">
            <ion-icon :icon="closeOutline" />
          </button>
          <img
            :src="selectedPhoto.image"
            :alt="selectedPhoto.title"
            class="lightbox-image"
          />
          <div class="lightbox-info">
            <span class="photo-category">{{ selectedPhoto.categoryLabel }}</span>
            <h2>{{ selectedPhoto.title }}</h2>
            <p>{{ selectedPhoto.location }}</p>
          </div>
        </div>
      </ion-modal>
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import {
  IonContent,
  IonIcon,
  IonModal,
  IonPage,
} from '@ionic/vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import AppButton from '@/components/ui/AppButton.vue'
import {
  arrowForwardOutline,
  businessOutline,
  closeOutline,
  expandOutline,
  gridOutline,
  imageOutline,
  imagesOutline,
  leafOutline,
  locationOutline,
  mapOutline,
  trailSignOutline,
} from 'ionicons/icons'

type CategoryId =
  | 'all'
  | 'kavling'
  | 'fasilitas'
  | 'lingkungan'
  | 'akses'
  | 'progress'

interface GalleryPhoto {
  id: number
  title: string
  location: string
  category: CategoryId
  categoryLabel: string
  image: string
}

const categories = [
  { id: 'all' as CategoryId, label: 'Semua', icon: gridOutline },
  { id: 'kavling' as CategoryId, label: 'Kavling', icon: businessOutline },
  { id: 'fasilitas' as CategoryId, label: 'Fasilitas', icon: leafOutline },
  { id: 'lingkungan' as CategoryId, label: 'Lingkungan', icon: imagesOutline },
  { id: 'akses' as CategoryId, label: 'Akses & Jalan', icon: trailSignOutline },
  { id: 'progress' as CategoryId, label: 'Progress', icon: mapOutline },
]

const photos: GalleryPhoto[] = [
  { id: 1, title: 'Suasana Kawasan PoliLand', location: 'PoliLand Kairagi', category: 'lingkungan', categoryLabel: 'Lingkungan', image: 'https://images.unsplash.com/photo-1500382017468-9049fed747ef?auto=format&fit=crop&w=1200&q=85' },
  { id: 2, title: 'Area Kavling Blok A', location: 'Blok A', category: 'kavling', categoryLabel: 'Kavling', image: 'https://images.unsplash.com/photo-1628744448840-55bdb2497bd4?auto=format&fit=crop&w=1000&q=85' },
  { id: 3, title: 'Akses Jalan Kawasan', location: 'Jalan Utama', category: 'akses', categoryLabel: 'Akses & Jalan', image: 'https://images.unsplash.com/photo-1544986581-efac024faf62?auto=format&fit=crop&w=1000&q=85' },
  { id: 4, title: 'Ruang Hijau', location: 'Area Kawasan', category: 'fasilitas', categoryLabel: 'Fasilitas', image: 'https://images.unsplash.com/photo-1497435334941-8c899ee9e8e9?auto=format&fit=crop&w=1000&q=85' },
  { id: 5, title: 'Pemandangan Area Perbukitan', location: 'Sekitar Kawasan', category: 'lingkungan', categoryLabel: 'Lingkungan', image: 'https://images.unsplash.com/photo-1500534623283-312aade485b7?auto=format&fit=crop&w=1000&q=85' },
  { id: 6, title: 'Perkembangan Pembangunan', location: 'PoliLand Kairagi', category: 'progress', categoryLabel: 'Progress', image: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=85' },
  { id: 7, title: 'Jalan Menuju Kawasan', location: 'Akses Utama', category: 'akses', categoryLabel: 'Akses & Jalan', image: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1000&q=85' },
  { id: 8, title: 'Area Kavling', location: 'Blok B', category: 'kavling', categoryLabel: 'Kavling', image: 'https://images.unsplash.com/photo-1560518883-ce09059eeffa?auto=format&fit=crop&w=1000&q=85' },
]

const selectedCategory = ref<CategoryId>('all')
const selectedPhoto = ref<GalleryPhoto | null>(null)
const compactView = ref(false)
const isLoading = ref(true)

const refreshGallery = () => {
  isLoading.value = true
  window.setTimeout(() => {
    isLoading.value = false
  }, 450)
}

const handleRefresh = () => {
  refreshGallery()
}

const filteredPhotos = computed(() =>
  selectedCategory.value === 'all'
    ? photos
    : photos.filter((photo) => photo.category === selectedCategory.value),
)

function openPhoto(photo: GalleryPhoto) {
  selectedPhoto.value = photo
}

function closePhoto() {
  selectedPhoto.value = null
}

function toggleView() {
  compactView.value = !compactView.value
}

window.addEventListener('poliland:refresh', handleRefresh)

window.setTimeout(() => {
  isLoading.value = false
}, 450)

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
  --gallery-background: #fafaf7;
  --gallery-surface: #ffffff;
  --gallery-olive: #556b2f;
  --gallery-sage: #8ca072;
  --gallery-sand: #ede6d6;
  --gallery-stone: #d9d3c4;
  --gallery-gold: #b8860b;
  --gallery-gold-light: #f4e3b2;
}

.gallery-content {
  --background: var(--gallery-background);
  /* Diberi padding-bottom yang mencukupi tinggi tabbar (74px) + margin/safe area (~20px) + ekstra spasi agar lega */
  --padding-bottom: calc(110px + env(safe-area-inset-bottom));
}

.gallery-header {
  --background: rgba(250, 250, 247, 0.94);
  backdrop-filter: blur(14px);
}

.gallery-header ion-toolbar {
  --background: transparent;
  --color: var(--gallery-charcoal);
  --border-width: 0;
  min-height: 62px;
}

.gallery-header ion-title {
  font-size: 18px;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.gallery-header ion-back-button,
.header-icon-button {
  --color: var(--gallery-charcoal);
}

.header-icon-button ion-icon {
  font-size: 21px;
}

.gallery-page {
  width: min(100%, 1180px);
  margin: 0 auto;
  padding: 18px 18px 28px;
}

.gallery-hero {
  position: relative;
  min-height: 270px;
  overflow: hidden;
  display: flex;
  align-items: center;
  padding: 34px;
  border-radius: 28px;
  background: linear-gradient(110deg, rgba(26,26,26,.98), rgba(45,45,45,.96) 55%, rgba(85,107,47,.94));
  box-shadow: 0 18px 45px rgba(26,26,26,.13);
}

.hero-copy {
  position: relative;
  z-index: 2;
  max-width: 620px;
}

.eyebrow {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 11px;
  margin-bottom: 15px;
  border: 1px solid rgba(244,227,178,.32);
  border-radius: 999px;
  color: var(--gallery-gold-light);
  background: rgba(255,255,255,.06);
  font-size: 11px;
  font-weight: 800;
  letter-spacing: .08em;
  text-transform: uppercase;
}

.eyebrow ion-icon { font-size: 15px; }

.gallery-hero h1 {
  margin: 0;
  color: #fff;
  font-size: clamp(30px, 6vw, 48px);
  line-height: 1.06;
  font-weight: 850;
  letter-spacing: -.045em;
}

.gallery-hero p {
  max-width: 560px;
  margin: 15px 0 0;
  color: rgba(255,255,255,.72);
  font-size: 14px;
  line-height: 1.7;
}

.hero-decoration {
  position: absolute;
  right: -35px;
  bottom: -55px;
  width: 300px;
  height: 300px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: rgba(244,227,178,.22);
}

.hero-decoration > ion-icon {
  position: relative;
  z-index: 2;
  font-size: 96px;
}

.hero-ring {
  position: absolute;
  border: 1px solid rgba(244,227,178,.18);
  border-radius: 50%;
}

.hero-ring-one { width: 230px; height: 230px; }
.hero-ring-two { width: 310px; height: 310px; }

.category-section {
  padding: 28px 2px 18px;
}

.section-heading {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 15px;
}

.section-label {
  display: block;
  color: var(--gallery-gold);
  font-size: 10px;
  font-weight: 850;
  letter-spacing: .14em;
}

.section-heading h2 {
  margin: 4px 0 0;
  color: var(--gallery-charcoal);
  font-size: 22px;
  line-height: 1.15;
  font-weight: 850;
}

.photo-count {
  color: var(--gallery-gray);
  font-size: 12px;
  font-weight: 700;
}

.category-scroll {
  display: flex;
  gap: 9px;
  overflow-x: auto;
  padding: 2px 1px 7px;
  scrollbar-width: none;
}

.category-scroll::-webkit-scrollbar { display: none; }

.category-chip {
  flex: 0 0 auto;
  min-height: 42px;
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 0 15px;
  border: 1px solid var(--gallery-stone);
  border-radius: 999px;
  color: var(--gallery-slate);
  background: var(--gallery-surface);
  font: inherit;
  font-size: 12px;
  font-weight: 750;
  cursor: pointer;
  transition: .2s ease;
}

.category-chip ion-icon { font-size: 17px; }

.category-chip.active {
  border-color: var(--gallery-olive);
  color: #fff;
  background: var(--gallery-olive);
  box-shadow: 0 7px 18px rgba(85,107,47,.2);
}

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
  border-radius: 19px;
  background: var(--gallery-surface);
  box-shadow: 0 5px 20px rgba(26,26,26,.07);
  text-align: left;
  cursor: pointer;
}

.photo-image {
  position: relative;
  aspect-ratio: 1 / 1.12;
  overflow: hidden;
  background: var(--gallery-sand);
}

.photo-card.featured { grid-column: span 2; }
.photo-card.featured .photo-image { aspect-ratio: 16 / 8.5; }

.photo-image img {
  width: 100%;
  height: 100%;
  display: block;
  object-fit: cover;
  transition: transform .45s ease;
}

.photo-card:hover .photo-image img { transform: scale(1.045); }

.photo-overlay {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 12px;
  background: linear-gradient(to bottom, rgba(0,0,0,.48), transparent 35%, rgba(0,0,0,.78));
}

.photo-top,
.photo-bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.photo-bottom {
  flex-direction: column;
  align-items: flex-start;
  justify-content: flex-end;
}

.photo-category {
  display: inline-flex;
  width: fit-content;
  padding: 5px 8px;
  border-radius: 7px;
  color: #fff;
  background: rgba(26,26,26,.66);
  backdrop-filter: blur(7px);
  font-size: 9px;
  font-weight: 800;
  letter-spacing: .04em;
}

.zoom-button {
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,.3);
  border-radius: 50%;
  color: #fff;
  background: rgba(26,26,26,.45);
  backdrop-filter: blur(7px);
}

.zoom-button ion-icon { font-size: 15px; }

.photo-bottom span {
  color: rgba(255,255,255,.76);
  font-size: 9px;
  font-weight: 600;
}

.photo-bottom strong {
  margin-top: 3px;
  color: #fff;
  font-size: 13px;
  line-height: 1.25;
}

.photo-grid.compact { grid-template-columns: repeat(3, minmax(0,1fr)); }
.photo-grid.compact .photo-card.featured { grid-column: span 3; }
.photo-grid.compact .photo-card.featured .photo-image { aspect-ratio: 16 / 7; }

.empty-state {
  padding: 65px 20px;
  text-align: center;
}

.empty-icon {
  width: 58px;
  height: 58px;
  margin: 0 auto 13px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 17px;
  color: var(--gallery-olive);
  background: var(--gallery-sand);
}

.empty-icon ion-icon { font-size: 27px; }
.empty-state h3 { margin: 0; color: var(--gallery-charcoal); font-size: 18px; }
.empty-state p { margin: 6px 0 0; color: var(--gallery-gray); font-size: 13px; }

.gallery-cta {
  position: relative;
  display: grid;
  grid-template-columns: auto 1fr auto;
  align-items: center;
  gap: 18px;
  margin-top: 28px;
  padding: 22px;
  overflow: hidden;
  border: 1px solid rgba(85,107,47,.16);
  border-radius: 23px;
  background: linear-gradient(135deg, #fff, #f4f0e5);
}

.cta-icon {
  width: 52px;
  height: 52px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 16px;
  color: var(--gallery-olive);
  background: rgba(85,107,47,.1);
}

.cta-icon ion-icon { font-size: 25px; }
.cta-copy { position: relative; z-index: 1; }

.cta-copy h2 {
  margin: 3px 0 4px;
  color: var(--gallery-charcoal);
  font-size: 18px;
  font-weight: 850;
}

.cta-copy p {
  margin: 0;
  color: var(--gallery-gray);
  font-size: 12px;
  line-height: 1.55;
}


.gallery-modal {
  --background: transparent;
  --box-shadow: none;
}

.lightbox {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 24px;
  background: rgba(20,20,18,.98);
}

.lightbox-close {
  position: absolute;
  z-index: 5;
  top: max(18px, env(safe-area-inset-top));
  right: 18px;
  width: 42px;
  height: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid rgba(255,255,255,.18);
  border-radius: 50%;
  color: #fff;
  background: rgba(255,255,255,.08);
}

.lightbox-close ion-icon { font-size: 21px; }

.lightbox-image {
  width: 100%;
  max-height: 72vh;
  object-fit: contain;
  border-radius: 16px;
}

.lightbox-info {
  width: min(100%, 720px);
  margin: 18px auto 0;
}

.lightbox-info .photo-category { background: var(--gallery-olive); }
.lightbox-info h2 { margin: 8px 0 3px; color: #fff; font-size: 21px; }
.lightbox-info p { margin: 0; color: rgba(255,255,255,.58); font-size: 12px; }

@media (min-width: 700px) {
  .gallery-page { padding: 28px 28px 28px; }
  .gallery-hero { min-height: 320px; padding: 46px; }
  .photo-grid { grid-template-columns: repeat(3, minmax(0,1fr)); gap: 16px; }
  .photo-card.featured { grid-column: span 2; }
  .photo-card.featured .photo-image { aspect-ratio: 16 / 10; }
  .photo-image { aspect-ratio: 1 / 1; }
}

@media (min-width: 1024px) {
  .gallery-page { padding-top: 34px; }
  .gallery-hero { min-height: 350px; }
  .photo-grid { grid-template-columns: repeat(4, minmax(0,1fr)); }
  .photo-card.featured { grid-column: span 2; grid-row: span 2; }
  .photo-card.featured .photo-image { aspect-ratio: auto; height: 100%; min-height: 460px; }
  .photo-grid.compact { grid-template-columns: repeat(4, minmax(0,1fr)); }
  .photo-grid.compact .photo-card.featured { grid-column: span 2; grid-row: span 2; }
}

@media (max-width: 560px) {
  .gallery-page { padding-inline: 14px; }
  .gallery-hero { min-height: 290px; padding: 27px 23px; border-radius: 23px; }
  .hero-decoration { right: -95px; bottom: -80px; }
  .gallery-cta { grid-template-columns: auto 1fr; }
  .cta-button { grid-column: 1 / -1; width: 100%; }
}

/* Internal skeleton — follows the same GalleryPage layout */
.gallery-hero-skeleton-copy {
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:8px;
  width:min(100%,560px);
}

.gallery-section-heading-skeleton {
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:5px;
}

.gallery-skeleton-grid { align-items:stretch; }

.photo-card-skeleton {
  position:relative;
  pointer-events:none;
}

.photo-card-skeleton .photo-image {
  position:relative;
  overflow:hidden;
}

.gallery-skeleton-overlay {
  opacity:1;
  background:linear-gradient(180deg,transparent 40%,rgba(26,26,26,.42) 100%);
}

.gallery-skeleton-overlay .photo-top,
.gallery-skeleton-overlay .photo-bottom { opacity:1; }

.gallery-skeleton-overlay .photo-bottom {
  display:flex;
  flex-direction:column;
  align-items:flex-start;
  gap:6px;
}

.gallery-cta-skeleton {
  display:flex;
  flex:1;
  min-width:0;
  flex-direction:column;
  align-items:flex-start;
  gap:7px;
}
</style>