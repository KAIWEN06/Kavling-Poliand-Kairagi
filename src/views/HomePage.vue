<template>
  <ion-page>
    <div class="home-wrapper">
      <ion-content :fullscreen="false" class="home-content" :scroll-events="true">
        <HeroSection @goToSiteplan="goToSiteplan" @contactWhatsapp="contactWhatsapp" />
        <StatsSection />
        <FeaturesSection />
        <AboutSection />
        <GalleryPreview />
        <section class="section siteplan-section">
          <div class="section-heading">
            <div><h2>Lokasi & Siteplan</h2><span class="heading-line"></span></div>
            <button class="see-all" type="button" @click="goToSiteplan">Siteplan <ion-icon :icon="chevronForwardOutline" /></button>
          </div>
          <LocationSection />
          <SiteplanPreview :lots="lots" @goToSiteplan="goToSiteplan" />
        </section>
        <ProgressPreview />
        <TestimonialsSection />
        <div class="faq-section"><FAQSection /></div>
        <CTASection @contactWhatsapp="contactWhatsapp" />
        <ContactSection @callUs="callUs" @contactWhatsapp="contactWhatsapp" />
        <div class="bottom-space" aria-hidden="true"></div>
      </ion-content>

      <Transition name="refresh-fade">
        <div v-if="isLoading" class="refresh-overlay">
          <HomeSkeleton />
        </div>
      </Transition>
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { IonContent, IonIcon, IonPage } from '@ionic/vue'
import { chevronForwardOutline } from 'ionicons/icons'
import { useRouter } from 'vue-router'
import { ref, onMounted, onUnmounted } from 'vue'
import HeroSection from '@/components/home/HeroSection.vue'
import StatsSection from '@/components/home/StatsSection.vue'
import FeaturesSection from '@/components/home/FeatureSection.vue'
import AboutSection from '@/components/home/AboutSection.vue'
import GalleryPreview from '@/components/home/GalleryPreview.vue'
import LocationSection from '@/components/home/LocationSection.vue'
import SiteplanPreview from '@/components/home/SiteplanPreview.vue'
import ProgressPreview from '@/components/home/ProgressPreview.vue'
import TestimonialsSection from '@/components/home/TestimonialsSection.vue'
import FAQSection from '@/components/home/FAQSection.vue'
import CTASection from '@/components/home/CTASection.vue'
import ContactSection from '@/components/home/ContactSection.vue'
import HomeSkeleton from '@/components/ui/skeletons/HomeSkeleton.vue'
import { useSiteplan } from '../composables/useSiteplant'

const router = useRouter()
const isLoading = ref(true)
const isRefreshing = ref(false)

const { lots, reload: reloadSiteplan } = useSiteplan()

let refreshTimer: ReturnType<typeof setTimeout> | null = null

// Durasi skeleton/loading saat Pull to Refresh.
// 2000 = 2 detik.
// Silakan ubah menjadi 1500, 2000, 2500, dll.
const REFRESH_DURATION = 1800

const handleRefresh = () => {
  if (isRefreshing.value) return

  isRefreshing.value = true
  isLoading.value = true

  // Refresh data tetap dijalankan,
  // tetapi tidak perlu menunggu data selesai untuk mengatur UI.
  reloadSiteplan().catch(error => {
    console.error('Gagal refresh siteplan:', error)
  })

  // Beri waktu komponen lain untuk melakukan refresh.
  window.dispatchEvent(new CustomEvent('poliland:refresh-gallery'))
  window.dispatchEvent(new CustomEvent('poliland:refresh-progress'))

  // Skeleton selalu berhenti setelah durasi yang ditentukan.
  refreshTimer = setTimeout(() => {
    isLoading.value = false
    isRefreshing.value = false

    // Beri tahu MascotPullRefresh bahwa refresh selesai.
    window.dispatchEvent(
      new CustomEvent('poliland:refresh-complete')
    )
  }, REFRESH_DURATION)
}

const handleInitialLoad = () => {
  // Skeleton hanya digunakan ketika pertama kali masuk Home.
  // Tidak menunggu seluruh komponen.
  setTimeout(() => {
    isLoading.value = false
  }, 800)
}

onMounted(() => {
  window.addEventListener(
    'poliland:refresh',
    handleRefresh
  )

  handleInitialLoad()
})

onUnmounted(() => {
  window.removeEventListener(
    'poliland:refresh',
    handleRefresh
  )

  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
})

const goToSiteplan = () => {
  router.push('/siteplan')
}

const contactWhatsapp = () => {
  window.open(
    'https://wa.me/6281234567890',
    '_blank'
  )
}

const callUs = () => {
  window.location.href =
    'tel:+6281234567890'
}
</script>

<style scoped>
.home-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: #FAFAF7;
}

.home-content {
  --background: var(--home-background, #FAFAF7);

  /*
   * Ruang bawah untuk fixed bottom tab bar.
   * Jangan gunakan padding-bottom kecil seperti 12px karena
   * konten bagian akhir dapat tertutup tab bar.
   */
  --padding-bottom: calc(110px + env(safe-area-inset-bottom));

  width: 100%;
  height: 100%;
}

/*
 * Pastikan konten Ionic benar-benar boleh memanjang.
 * Kita tidak memberi height/fixed overflow pada section-section Home.
 */
.home-content::part(scroll) {
  padding-bottom: calc(110px + env(safe-area-inset-bottom));
  box-sizing: border-box;
}

.section {
  width: 100%;
  padding: 24px 16px 0;
  box-sizing: border-box;
}

.section-heading {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 14px;
}

.section-heading h2 {
  margin: 0;
  color: #1A1A1A;
  font-size: 20px;
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: -0.3px;
}

.heading-line {
  display: block;
  width: 34px;
  height: 3px;
  margin-top: 7px;
  background: #556B2F;
  border-radius: 999px;
}

.see-all {
  display: flex;
  align-items: center;
  gap: 3px;
  padding: 0;
  border: 0;
  background: transparent;
  color: #556B2F;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
}

.see-all ion-icon {
  font-size: 14px;
}

.siteplan-section {
  padding-top: 28px;
}

.faq-section {
  display: block;
  width: 100%;
  margin: 0;
  padding: 28px 0 10px;
  box-sizing: border-box;
  background: #FAFAF7;
  overflow: visible;
}

:deep(.cta-section) {
  position: relative;
  display: block;
  width: 100%;
  height: auto;
  min-height: 0;
  margin: 0;
  box-sizing: border-box;
  overflow: visible;
}

.contact-section {
  display: block;
  width: 100%;
  height: auto;
  min-height: 0;
  margin: 0;
  padding: 0;
  box-sizing: border-box;
  background: #FAFAF7;
  overflow: visible;
}

/*
 * Spacer tambahan hanya sebagai safety net.
 * Nilai utama tetap --padding-bottom pada ion-content.
 */
.bottom-space {
  display: block;
  width: 100%;
  height: 110px;
  min-height: 110px;
  margin: 0;
  padding: 0;
  background: #FAFAF7;
}

.refresh-overlay {
  position: absolute;
  inset: 0;
  z-index: 9999;
  overflow-y: auto;
  background: #FAFAF7;
}

.refresh-fade-enter-active,
.refresh-fade-leave-active {
  transition: opacity 0.25s ease;
}

.refresh-fade-enter-from,
.refresh-fade-leave-to {
  opacity: 0;
}

@media (min-width: 768px) {
  .section {
    padding-left: 24px;
    padding-right: 24px;
  }
}
</style>