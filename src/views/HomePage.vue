<template>
  <ion-page>
    <div class="home-wrapper pl-surface">
      <ion-content :fullscreen="false" class="home-content" :scroll-events="true" @ionScroll="syncMaket">
        <!-- 1. Nilai produk: sampul, angka, ketersediaan, denah, lokasi -->
        <HeroSection @goToSiteplan="goToSiteplan" @contactWhatsapp="contactWhatsapp" />
        <ScrollReveal :enabled="!isLoading" variant="scale"><StatsSection :lots="lots" /></ScrollReveal>
        <!-- Tanpa ScrollReveal: transform pembungkus akan menggeser posisi yang diukur maket. -->
        <KavlingMaket ref="maketRef" :available="availableCount" />
        <ScrollReveal :enabled="!isLoading">
          <section class="siteplan-section">
            <SectionHeader title="Denah & lokasi">
              <button class="see-all" type="button" @click="goToSiteplan">Denah <ion-icon :icon="chevronForwardOutline" aria-hidden="true" /></button>
            </SectionHeader>
            <div class="siteplan-stack">
              <SiteplanPreview :lots="lots" @goToSiteplan="goToSiteplan" />
              <LocationSection />
            </div>
          </section>
        </ScrollReveal>

        <!-- 2. Bukti: foto dan pembangunan -->
        <ScrollReveal :enabled="!isLoading"><GalleryPreview /></ScrollReveal>
        <ScrollReveal :enabled="!isLoading"><ProgressPreview /></ScrollReveal>

        <!-- 3. Siapa pengelolanya -->
        <ScrollReveal :enabled="!isLoading"><AboutSection /></ScrollReveal>
        <ScrollReveal :enabled="!isLoading"><FeaturesSection /></ScrollReveal>

        <!-- 4. Kepercayaan & tindakan -->
        <ScrollReveal :enabled="!isLoading"><CustomerReviewsSection /></ScrollReveal>
        <ScrollReveal :enabled="!isLoading"><FAQSection /></ScrollReveal>
        <ScrollReveal :enabled="!isLoading" variant="scale"><CTASection @contactWhatsapp="contactWhatsapp" /></ScrollReveal>
        <ScrollReveal :enabled="!isLoading"><ContactSection /></ScrollReveal>

        <!-- Penutup: bukit dan matahari yang sama dengan layar Welcome -->
        <footer class="home-footer">
          <SceneBackdrop class="home-footer__scene" height="100%" :sway="false" />
          <p class="home-footer__line">PoliLand Kairagi</p>
        </footer>
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
import { computed, nextTick, ref, onMounted, onUnmounted } from 'vue'
import KavlingMaket from '@/components/home/KavlingMaket.vue'
import { normalizeLotStatus } from '@/utils/siteplan'
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
import { waLink } from '@/utils/homeContent'
import { useSiteplan } from '../composables/useSiteplant'
import { contactsService } from '@/services/contactService'

const router = useRouter()
const isLoading = ref(true)
const isRefreshing = ref(false)

const { lots, reload: reloadSiteplan } = useSiteplan()
const availableCount = computed(() => lots.value.filter((lot) => normalizeLotStatus(lot.status) === 'available').length)

const maketRef = ref<InstanceType<typeof KavlingMaket> | null>(null)
const syncMaket = () => maketRef.value?.sync()

/* Jumlah tersedia dan warna denah ikut berubah saat data kavling berubah. */
useRealtimeRefresh(['lots'], () => reloadSiteplan({ silent: true }))

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
    void nextTick(syncMaket)

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
    void nextTick(syncMaket)
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
  const url = waLink(contactSettings.value.whatsapp)
  if (!url) return toast.info('Nomor WhatsApp belum tersedia. Silakan coba lagi nanti.')
  window.open(url, '_blank')
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
  --padding-bottom: 0px;

  width: 100%;
  height: 100%;
}

/* Jarak antar-bagian diatur masing-masing komponen. */
.siteplan-section {
  width: 100%;
  padding: 36px 20px 0;
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
  transition: transform var(--dur-base) var(--ease-spring);
}
.see-all:active { transform: scale(0.97); }
.see-all ion-icon { font-size: 16px; }
.see-all:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 2px; }

@media (prefers-reduced-motion: reduce) {
  .see-all:active { transform: none; }
}

.siteplan-stack { display: flex; flex-direction: column; gap: 14px; }

/* Bukit memanjang sampai ke belakang tab bar, jadi ruang bawahnya ada di dalam footer. */
.home-footer {
  position: relative;
  height: calc(250px + var(--safe-bottom));
  margin-top: 8px;
  overflow: hidden;
}

/* Matahari utuh di dalam footer agar cahayanya tidak terpotong garis lurus. */
.home-footer__scene :deep(.sun) {
  top: 0;
  right: -90px;
  width: 260px;
  height: 200px;
  background: radial-gradient(closest-side, rgba(244, 214, 154, 0.7), rgba(244, 214, 154, 0));
}

.home-footer__line {
  position: absolute;
  left: 0;
  right: 0;
  bottom: calc(110px + var(--safe-bottom));
  margin: 0;
  text-align: center;
  color: var(--green-800, #2b4824);
  font: 700 13px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
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