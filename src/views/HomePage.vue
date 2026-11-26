<template>
  <ion-page>
    <div class="home-wrapper pl-surface">
      <ion-content :fullscreen="false" class="home-content" :scroll-events="true">
        <!-- 1. Perkenalan -->
        <HeroSection @goToSiteplan="goToSiteplan" @contactWhatsapp="contactWhatsapp" />
        <ScrollReveal :enabled="!isLoading" variant="scale"><StatsSection /></ScrollReveal>
        <ScrollReveal :enabled="!isLoading"><AboutSection /></ScrollReveal>
        <ScrollReveal :enabled="!isLoading"><FeaturesSection /></ScrollReveal>

        <!-- 2. Bukti & produk -->
        <ScrollReveal :enabled="!isLoading"><GalleryPreview /></ScrollReveal>
        <ScrollReveal :enabled="!isLoading">
          <section class="siteplan-section">
            <SectionHeader title="Lokasi & denah kavling">
              <button class="see-all" type="button" @click="goToSiteplan">Denah <ion-icon :icon="chevronForwardOutline" aria-hidden="true" /></button>
            </SectionHeader>
            <LocationSection />
            <SiteplanPreview :lots="lots" @goToSiteplan="goToSiteplan" />
          </section>
        </ScrollReveal>
        <ScrollReveal :enabled="!isLoading"><ProgressPreview /></ScrollReveal>

        <!-- 3. Kepercayaan & tindakan -->
        <ScrollReveal :enabled="!isLoading"><CustomerReviewsSection /></ScrollReveal>
        <ScrollReveal :enabled="!isLoading"><FAQSection /></ScrollReveal>
        <ScrollReveal :enabled="!isLoading" variant="scale"><CTASection @contactWhatsapp="contactWhatsapp" /></ScrollReveal>
        <ScrollReveal :enabled="!isLoading"><ContactSection /></ScrollReveal>

        <!-- Penutup: bukit dan matahari yang sama dengan layar Welcome -->
      </ion-content>

      <Transition name="refresh-fade">
        <div v-if="isLoading" class="refresh-overlay">
          <HomeSkeleton />
        </div>
      </Transition>
    </div>

    <CmsBackBar />
  </ion-page>
</template>

<script setup lang="ts">
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
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
import CustomerReviewsSection from '@/components/home/CustomerReviewsSection.vue'
import FAQSection from '@/components/home/FAQSection.vue'
import CTASection from '@/components/home/CTASection.vue'
import ContactSection from '@/components/home/ContactSection.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import SceneBackdrop from '@/components/ui/SceneBackdrop.vue'
import ScrollReveal from '@/components/ui/ScrollReveal.vue'
import HomeSkeleton from '@/components/ui/skeletons/HomeSkeleton.vue'
import CmsBackBar from '@/components/Admin/CmsBackBar.vue'
import { useToast } from '@/composables/useToast'
import { toWaNumber } from '@/utils/homeContent'
import { useSiteplan } from '../composables/useSiteplant'
import { contactsService } from '@/services/contactService'

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

    // Beri tahu AppPullRefresh bahwa refresh selesai.
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

const toast = useToast()
const contactSettings = ref({ whatsapp: '', phone: '' })

/** Nomor WhatsApp & telepon diambil dari data Kontak yang dikelola Admin. Tidak ada nomor cadangan di kode. */
const loadContactSettings = async ({ silent = false }: LoadOptions = {}) => {
  try {
    const rows = await contactsService.getAll()
    const valueOf = (...keys: string[]) => rows.find((row) => keys.includes(row.key.toLowerCase()))?.value?.trim() || ''
    contactSettings.value = { whatsapp: valueOf('whatsapp'), phone: valueOf('phone', 'telepon') }
  } catch {
    if (!silent) contactSettings.value = { whatsapp: '', phone: '' }
  }
}
onMounted(() => loadContactSettings())

const contactWhatsapp = () => {
  const number = toWaNumber(contactSettings.value.whatsapp)
  if (!number) return toast.info('Nomor WhatsApp belum tersedia. Silakan coba lagi nanti.')
  window.open(`https://wa.me/${number}`, '_blank')
}

useRealtimeRefresh(['contacts'], () => loadContactSettings({ silent: true }))

</script>

<style scoped>
.home-wrapper {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--pl-paper, #F9F5EC);
}

.home-content {
  --background: var(--pl-paper, #F9F5EC);

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

.see-all {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  min-height: 44px;
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: var(--poliland-green, #355a2c);
  font: 700 14px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  white-space: nowrap;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.see-all ion-icon {
  font-size: 16px;
  transition: transform var(--dur-base) var(--ease-spring);
}

.see-all:active ion-icon {
  transform: translateX(3px);
}

.see-all:focus-visible {
  outline: 3px solid var(--poliland-gold, #cba044);
  outline-offset: 2px;
}

/* Jarak antar-bagian diatur masing-masing komponen; jangan menimpa elemen akar anak di sini. */
.siteplan-section {
  width: 100%;
  padding: 40px 20px 0;
  box-sizing: border-box;
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
  background: var(--pl-paper, #F9F5EC);
}

.home-footer {
  position: relative;
  height: 190px;
  margin-top: 24px;
  overflow: hidden;
}

.home-footer__line {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 28px;
  margin: 0;
  text-align: center;
  color: var(--green-800, #2b4824);
  font: 700 12px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  letter-spacing: 0.08em;
}

.refresh-overlay {
  position: absolute;
  inset: 0;
  z-index: 9999;
  overflow-y: auto;
  background: var(--pl-paper, #F9F5EC);
}

.refresh-fade-enter-active,
.refresh-fade-leave-active {
  transition: opacity var(--dur-base) var(--ease-out);
}

.refresh-fade-enter-from,
.refresh-fade-leave-to {
  opacity: 0;
}

</style>