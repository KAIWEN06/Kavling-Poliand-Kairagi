<template>
  <section class="hero-section" :class="{ 'hero-section--plain': !hero.image_url }">
    <motion.img
      v-if="hero.image_url"
      :src="hero.image_url"
      alt="PoliLand Kairagi"
      class="hero-image"
      :initial="reduced ? false : { scale: 1.14 }"
      :animate="{ scale: 1 }"
      :transition="{ duration: 2.6, ease: MOTION_EASE_OUT }"
    />
    <div class="hero-overlay"></div>
    <!-- Bukit terdepan berwarna sama dengan halaman: foto mengalir ke permukaan krem. -->
    <SceneBackdrop class="hero-scene" height="120px" :sun="false" :lines="false" solid-front="#F9F5EC" />

    <div v-if="isAdmin" class="hero-admin">
      <AdminEditButton label="Ubah sampul" @click="editOpen = true" />
    </div>

    <div class="hero-content">
      <template v-if="loading">
        <Skeleton width="78%" height="34px" border-radius="8px" />
        <Skeleton width="92%" height="14px" border-radius="6px" class="hero-skel" />
        <Skeleton width="70%" height="14px" border-radius="6px" class="hero-skel" />
      </template>
      <template v-else-if="hero.title">
        <h1 :aria-label="hero.title">
          <span v-for="(word, i) in titleWords" :key="i" class="hero-word" aria-hidden="true">
            <motion.span
              class="hero-word-inner"
              :initial="reduced ? false : { y: '110%' }"
              :animate="{ y: '0%' }"
              :transition="{ duration: 0.7, delay: 0.25 + i * 0.07, ease: MOTION_EASE_OUT }"
            >{{ word }}</motion.span>
          </span>
        </h1>
        <motion.p
          v-if="hero.subtitle"
          class="hero-subtitle"
          :initial="reduced ? false : { opacity: 0, y: 10 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.6, delay: 0.6, ease: MOTION_EASE_OUT }"
        >{{ hero.subtitle }}</motion.p>
        <motion.p
          v-if="hero.description"
          :initial="reduced ? false : { opacity: 0, y: 10 }"
          :animate="{ opacity: 1, y: 0 }"
          :transition="{ duration: 0.6, delay: 0.72, ease: MOTION_EASE_OUT }"
        >{{ hero.description }}</motion.p>
      </template>
      <h1 v-else class="hero-empty">PoliLand Kairagi</h1>
      <p v-if="!loading && !hero.title && isAdmin" class="hero-hint">Sampul belum diisi. Tekan “Ubah sampul” untuk menambahkan judul dan gambar.</p>

      <motion.div
        class="hero-actions"
        :initial="reduced ? false : { opacity: 0, y: 22 }"
        :animate="{ opacity: 1, y: 0 }"
        :transition="reduced ? { duration: 0 } : { type: 'spring', stiffness: 260, damping: 22, delay: 0.9 }"
      >
        <ion-button class="primary-button" @click="$emit('goToSiteplan')">
          Lihat Denah
          <ion-icon slot="end" :icon="arrowForwardOutline" />
        </ion-button>

        <!-- LOADING -->
        <div v-if="loading" class="contact-skeleton">
          <Skeleton width="105px" height="44px" border-radius="10px" />
        </div>

        <!-- DATA SELESAI -->
        <ion-button v-else-if="showCta" class="outline-button" fill="outline" :disabled="ctaDisabled" @click="handleCta">
          {{ hero.cta_text || 'Hubungi Kami' }}
        </ion-button>
      </motion.div>
    </div>

    <CmsPanelModal v-model="editOpen" title="Ubah sampul" panel="home" section="hero" @saved="loadHeroData()" />
  </section>
</template>

<script setup lang="ts">
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import { computed, ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { IonButton, IonIcon } from '@ionic/vue'
import { motion } from 'motion-v'
import SceneBackdrop from '@/components/ui/SceneBackdrop.vue'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { MOTION_EASE_OUT } from '@/utils/motionTokens'
import { arrowForwardOutline } from 'ionicons/icons'
import Skeleton from '@/components/ui/Skeleton.vue'
import { contactsService } from '@/services/contactService'
import { cmsService, type CmsHero } from '@/services/cmsService'
import AdminEditButton from '@/components/Admin/AdminEditButton.vue'
import CmsPanelModal from '@/components/Admin/CmsPanelModal.vue'
import { useCmsAdmin } from '@/composables/useCmsAdmin'
import { waLink } from '@/utils/homeContent'

defineEmits(['goToSiteplan'])

const reduced = useReducedMotion()
const loading = ref(true)
const whatsappNumber = ref('')
const editOpen = ref(false)
const { isAdmin } = useCmsAdmin()
const hero = ref<CmsHero>({ title: '', subtitle: '', description: '', image_url: null, cta_text: 'Hubungi Kami', cta_url: 'whatsapp', is_active: true })

const titleWords = computed(() => (hero.value.title || '').split(/\s+/).filter(Boolean))

const router = useRouter()
const ctaTarget = computed(() => (hero.value.cta_url || '').trim())
const ctaIsWhatsapp = computed(() => !ctaTarget.value || ctaTarget.value === 'whatsapp')
const ctaDisabled = computed(() => ctaIsWhatsapp.value && !whatsappNumber.value)
/** Tombol WhatsApp disembunyikan dari pengunjung bila nomor belum diisi; Admin tetap melihatnya (nonaktif) sebagai pengingat. */
const showCta = computed(() => !ctaDisabled.value || isAdmin.value)

/** Tombol ajakan mengikuti pilihan Admin: WhatsApp, halaman dalam aplikasi, atau tautan luar. */
const handleCta = () => {
  const target = ctaTarget.value
  if (ctaIsWhatsapp.value) return contactWhatsapp()
  if (target.startsWith('/')) return void router.push(target)
  if (/^https?:\/\//i.test(target)) window.open(target, '_blank', 'noopener')
}

const contactWhatsapp = () => {
  const url = waLink(whatsappNumber.value)
  if (!url) {
    console.warn('Nomor WhatsApp tidak tersedia')
    return
  }
  window.open(url, '_system')
}

const loadHeroData = async ({ silent = false }: LoadOptions = {}) => {
  try {
    if (!silent) loading.value = true
    const [savedHero, contacts] = await Promise.all([cmsService.getHero(), contactsService.getAll()])
    hero.value = savedHero ?? { title: '', subtitle: '', description: '', image_url: null, cta_text: 'Hubungi Kami', cta_url: 'whatsapp', is_active: true }
    const whatsapp = contacts?.find((item: { key: string; value?: string }) => item.key === 'whatsapp')
    whatsappNumber.value = whatsapp?.value || ''
  } catch (error) {
    console.error('Gagal mengambil data Hero:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadHeroData()
})

useRealtimeRefresh(['home_hero', 'contacts'], () => loadHeroData({ silent: true }))

</script>

<style scoped>
.hero-section {
  position: relative;
  min-height: 460px;
  overflow: hidden;
}

.hero-scene { z-index: 1; }

/* BACKGROUND */
.hero-image {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero-section--plain { background: linear-gradient(160deg, #2b4824 0%, #1f3519 100%); }
.hero-admin { position: absolute; z-index: 3; top: 14px; right: 14px; }
.hero-skel { margin-top: 14px; }
.hero-empty { opacity: .9; }
.hero-content p.hero-hint { margin-top: 12px; color: #f4d69a; font-size: 12px; }

.hero-overlay {
  position: absolute;
  inset: 0;
  background:
    radial-gradient(120% 60% at 100% 0%, rgba(244,214,154,.28) 0%, rgba(244,214,154,0) 60%),
    linear-gradient(180deg, rgba(27,53,25,.72) 0%, rgba(31,53,25,.55) 48%, rgba(27,40,22,.88) 100%);
}

/* HERO CONTENT */
.hero-content {
  position: relative;
  z-index: 2;
  padding: 96px 24px 112px;
  color: #fff;
}

.hero-label {
  display: block;
  margin-bottom: 16px;
  color: #8CA072;
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 2px;
}

.hero-content h1 {
  margin: 0;
  color: #fff;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: clamp(34px, 10vw, 44px);
  line-height: 1.08;
  font-weight: 650;
  letter-spacing: -0.02em;
}

/* Tiap kata naik dari garis bawahnya, sama seperti judul Welcome. */
.hero-word {
  display: inline-block;
  overflow: hidden;
  padding-bottom: 0.1em;
  margin-right: 0.26em;
  vertical-align: top;
}
.hero-word-inner { display: inline-block; will-change: transform; }

.hero-content p {
  margin: 16px 0 0;
  max-width: 34ch;
  color: #F4F1E8;
  font-size: 15px;
  line-height: 1.6;
}

.hero-content p.hero-subtitle {
  margin: 12px 0 0;
  color: var(--poliland-gold-soft, #F4D69A);
  font-size: 15px;
  font-weight: 700;
  line-height: 1.4;
}

/* BUTTONS */
.hero-actions {
  display: flex;
  gap: 10px;
  margin-top: 26px;
  align-items: center;
}

.hero-actions ion-button {
  margin: 0;
  min-height: 48px;
  --border-radius: 14px;
  font-size: 14px;
  font-weight: 800;
  text-transform: none;
  letter-spacing: 0;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-base) var(--ease-spring);
}

.hero-actions ion-button:active { transform: scale(0.97); }

/* Emas = penanda aksi utama di atas foto gelap. */
.primary-button {
  --background: var(--poliland-gold, #cba044);
  --background-hover: #b68e3d;
  --background-activated: #b68e3d;
  --color: var(--ink, #1b1f1a);
  --box-shadow: 0 10px 24px -10px rgba(203, 160, 68, 0.8);
}

.outline-button {
  --border-color: rgba(249,245,236,.7);
  --border-width: 1.5px;
  --color: #fff;
}

/* SKELETON */
.contact-skeleton {
  width: 105px;
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* SMALL SCREEN */
@media (max-width: 360px) {
  .hero-content {
    padding-left: 20px;
    padding-right: 20px;
  }

  .hero-content p {
    font-size: 14px;
  }

  .hero-actions ion-button {
    font-size: 13px;
  }

  .contact-skeleton {
    width: 100px;
  }
}
</style>
