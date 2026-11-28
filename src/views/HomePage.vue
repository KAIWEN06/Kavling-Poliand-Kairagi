<template>
  <ion-page>
    <div class="home-wrapper pl-surface">
      <ion-content ref="contentRef" :fullscreen="false" class="home-content" :scroll-events="true" @ionScroll="syncMaket">
        <!-- 1. Etalase: banner, angka kavling, menu -->
        <div class="home-top">
          <HeroSection @goToSiteplan="goToSiteplan" @contactWhatsapp="contactWhatsapp" />
          <StatsSection :lots="lots" />
          <HomeMenu :play="!isLoading" @select="openMenu" />
        </div>

        <!-- 2. Denah. Tanpa ScrollReveal: transform pembungkus menggeser posisi yang diukur maket. -->
        <div class="home-block">
          <section class="siteplan-section">
            <SectionHeader title="Denah" />
            <div class="siteplan-stack">
              <KavlingMaket ref="maketRef" :lots="lots" @goToSiteplan="goToSiteplan" />
              <div ref="locationEl"><LocationSection /></div>
            </div>
          </section>
        </div>

        <!-- 3. Bukti: foto dan pembangunan -->
        <ScrollReveal class="home-block" :enabled="!isLoading"><GalleryPreview /></ScrollReveal>
        <ScrollReveal class="home-block" :enabled="!isLoading"><ProgressPreview /></ScrollReveal>

        <!-- 4. Siapa pengelolanya -->
        <ScrollReveal class="home-block" :enabled="!isLoading"><AboutSection /></ScrollReveal>
        <ScrollReveal class="home-block" :enabled="!isLoading"><FeaturesSection /></ScrollReveal>

        <!-- 5. Kepercayaan & tindakan -->
        <div ref="reviewsEl" class="home-block">
          <ScrollReveal :enabled="!isLoading"><CustomerReviewsSection /></ScrollReveal>
        </div>
        <ScrollReveal class="home-block" :enabled="!isLoading"><FAQSection /></ScrollReveal>
        <ScrollReveal class="home-block" :enabled="!isLoading" variant="scale"><CTASection @contactWhatsapp="contactWhatsapp" /></ScrollReveal>
        <ScrollReveal class="home-block" :enabled="!isLoading"><ContactSection /></ScrollReveal>

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
import { IonContent, IonPage } from '@ionic/vue'
import { useRouter } from 'vue-router'
import { nextTick, ref, onMounted, onUnmounted } from 'vue'
import KavlingMaket from '@/components/home/KavlingMaket.vue'
import HomeMenu from '@/components/home/HomeMenu.vue'
import type { MenuIllustrationName } from '@/components/home/MenuIllustration.vue'
import { useReducedMotion } from '@/composables/useReducedMotion'
import HeroSection from '@/components/home/HeroSection.vue'
import StatsSection from '@/components/home/StatsSection.vue'
import FeaturesSection from '@/components/home/FeatureSection.vue'
import AboutSection from '@/components/home/AboutSection.vue'
import GalleryPreview from '@/components/home/GalleryPreview.vue'
import LocationSection from '@/components/home/LocationSection.vue'
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

/* ---------- Menu ikon ---------- */
const reducedMotion = useReducedMotion()
const contentRef = ref<InstanceType<typeof IonContent> | null>(null)
const locationEl = ref<HTMLElement | null>(null)
const reviewsEl = ref<HTMLElement | null>(null)

/** Hanya wadah gulir ion-content yang digeser; scrollIntoView bisa ikut menggeser pembungkus overflow hidden. */
const scrollToSection = async (target: HTMLElement | null) => {
  const content = contentRef.value?.$el as HTMLIonContentElement | undefined
  if (!content || !target) return
  const scroller = await content.getScrollElement()
  const top = target.getBoundingClientRect().top - scroller.getBoundingClientRect().top + scroller.scrollTop
  scroller.scrollTo({ top, behavior: reducedMotion.value ? 'auto' : 'smooth' })
}

const menuRoutes: Partial<Record<MenuIllustrationName, string>> = {
  denah: '/siteplan',
  progres: '/progress',
  galeri: '/gallery',
  tentang: '/about',
  kontak: '/contact',
}

const openMenu = (id: MenuIllustrationName) => {
  const path = menuRoutes[id]
  if (path) return void router.push(path)
  if (id === 'whatsapp') return void contactWhatsapp()
  void scrollToSection(id === 'lokasi' ? locationEl.value : reviewsEl.value)
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
  --background: var(--surface-primary, #fff);
  --padding-bottom: 0px;

  width: 100%;
  height: 100%;
}

/* Satu lembar putih menyambung; jarak antar-section cukup dari ruang kosong. */
.home-block { padding-bottom: 20px; }
/* Section yang tidak punya data tidak meninggalkan blok kosong. */
.home-block:empty,
.home-block:has(> .scroll-reveal:empty) { display: none; }

.home-wrapper .home-block > :deep(section),
.home-wrapper .home-block > :deep(.scroll-reveal > section) { padding-top: 20px; }
.home-wrapper .home-block > :deep(.faq-section) { padding-bottom: 0; }

.siteplan-section {
  width: 100%;
  padding: 20px 20px 0;
  box-sizing: border-box;
}

.siteplan-stack { display: flex; flex-direction: column; gap: 14px; }

/* Bukit memanjang sampai ke belakang tab bar, jadi ruang bawahnya ada di dalam footer. */
.home-footer {
  position: relative;
  height: calc(220px + var(--safe-bottom));
  overflow: hidden;
  /* Putih memudar ke krem agar footer menyambung tanpa garis batas. */
  background: linear-gradient(180deg, var(--surface-primary, #fff) 0%, var(--pl-paper, #F9F5EC) 55%);
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
  bottom: calc(86px + var(--safe-bottom));
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