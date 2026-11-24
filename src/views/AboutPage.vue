<template>
  <ion-page>
    <ion-content class="about-content">
      <div class="about-page pl-surface">
        <!-- HERO: adegan Welcome; bukit terdepan berwarna krem agar mengalir ke isi -->
        <section class="about-hero">
          <SceneBackdrop class="hero-scene" height="54%" breathe sparkle solid-front="#F9F5EC" />

          <motion.button
            class="back-btn"
            type="button"
            aria-label="Kembali"
            :initial="reduced ? false : { opacity: 0, x: -8 }"
            :animate="{ opacity: 1, x: 0 }"
            :transition="{ duration: 0.5, delay: 0.1, ease: MOTION_EASE_OUT }"
            @click="goBack"
          >
            <ion-icon :icon="arrowBackOutline" aria-hidden="true" />
            Kembali
          </motion.button>

          <div class="hero-copy">
            <h1 aria-label="Membangun masa depan, satu kavling demi kavling.">
              <span v-for="(line, i) in heroLines" :key="line" class="hero-line" aria-hidden="true">
                <motion.span
                  class="hero-line-inner"
                  :initial="reduced ? false : { y: '110%' }"
                  :animate="{ y: '0%' }"
                  :transition="{ duration: 0.75, delay: 0.3 + i * 0.12, ease: MOTION_EASE_OUT }"
                >{{ line }}</motion.span>
              </span>
            </h1>
          </div>
        </section>

        <div v-if="isAdmin" class="admin-row">
          <AdminEditButton label="Edit teks" @click="editTextOpen = true" />
          <AdminEditButton label="Edit sorotan" @click="editHighlightsOpen = true" />
        </div>

        <!-- PROFIL -->
        <section v-if="aboutText || points.length" class="block">
          <SectionHeader title="Profil Kami" />

          <ScrollReveal v-if="leadParagraph">
            <p class="lead">{{ leadParagraph }}</p>
          </ScrollReveal>
          <ScrollReveal v-for="(para, i) in restParagraphs" :key="`para-${i}`" :delay="60">
            <p class="body-text">{{ para }}</p>
          </ScrollReveal>

          <ul v-if="points.length" class="points">
            <li v-for="(point, i) in points" :key="point" class="point-item">
              <ScrollReveal :delay="Math.min(i, 5) * 70">
                <div class="point">
                  <span class="point-icon"><ion-icon :icon="checkmarkCircleOutline" aria-hidden="true" /></span>
                  <span class="point-text">{{ point }}</span>
                </div>
              </ScrollReveal>
            </li>
          </ul>
        </section>
        <p v-else-if="!loading && isAdmin" class="empty-hint">Profil belum diisi. Tekan “Edit teks”.</p>
        <p v-else-if="!loading" class="empty-hint soft">Informasi tentang PoliLand akan segera hadir.</p>

        <!-- ANGKA: panel hijau dengan angka yang naik dari 0 -->
        <ScrollReveal v-if="highlights.length" variant="scale">
          <section class="stats" aria-label="Sorotan">
            <SceneBackdrop class="stats-scene" height="60%" :sun="false" />
            <div class="stats-grid">
              <div v-for="stat in highlights" :key="stat.label" class="stat">
                <strong><CountUp :value="String(stat.value)" /></strong>
                <span>{{ stat.label }}</span>
              </div>
            </div>
          </section>
        </ScrollReveal>

        <!-- VIDEO -->
        <section v-if="video?.video_url" class="block">
          <SectionHeader :title="video.title || 'Video Profil'" />
          <ScrollReveal variant="scale">
            <div class="video-box">
              <iframe
                v-if="isYouTubeUrl(video.video_url)"
                :src="(getYouTubeEmbedUrl(video.video_url) || '').replace('autoplay=1&', '')"
                :title="video.title"
                referrerpolicy="strict-origin-when-cross-origin"
                allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowfullscreen
              />
              <video
                v-else
                :src="video.video_url"
                :poster="video.thumbnail_url || undefined"
                controls
                playsinline
                preload="metadata"
              />
            </div>
          </ScrollReveal>
        </section>

        <!-- CTA -->
        <ScrollReveal v-if="hasWhatsapp" variant="scale">
          <section class="cta">
            <SceneBackdrop class="cta-scene" height="58%" />
            <div class="cta-body">
              <h2>Ingin tahu lebih lanjut?</h2>
              <p>Tim kami menjawab pertanyaan dan mengantar Anda melihat kawasan.</p>
              <button class="cta-btn" type="button" @click="contactWhatsapp">
                <ion-icon :icon="logoWhatsapp" aria-hidden="true" />
                Hubungi via WhatsApp
              </button>
            </div>
          </section>
        </ScrollReveal>

        <div class="bottom-space" aria-hidden="true"></div>
      </div>

      <CmsPanelModal v-model="editTextOpen" title="Edit Tentang Kami" panel="home" section="about" @saved="load" />
      <CmsPanelModal v-model="editHighlightsOpen" title="Edit sorotan" panel="home" section="highlights" @saved="load" />
      <CmsBackBar />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { IonContent, IonIcon, IonPage } from '@ionic/vue'
import { arrowBackOutline, checkmarkCircleOutline, logoWhatsapp } from 'ionicons/icons'
import { useRouter } from 'vue-router'
import { motion } from 'motion-v'
import AdminEditButton from '@/components/Admin/AdminEditButton.vue'
import CmsBackBar from '@/components/Admin/CmsBackBar.vue'
import CmsPanelModal from '@/components/Admin/CmsPanelModal.vue'
import CountUp from '@/components/ui/CountUp.vue'
import SceneBackdrop from '@/components/ui/SceneBackdrop.vue'
import ScrollReveal from '@/components/ui/ScrollReveal.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import { contactsService } from '@/services/contactService'
import { featureService, getYouTubeEmbedUrl, isYouTubeUrl, type VideoItem } from '@/services/featureService'
import { HOME_KEYS, parseHighlights, parsePoints, toWaNumber, type HomeHighlight } from '@/utils/homeContent'
import { useCmsAdmin } from '@/composables/useCmsAdmin'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { MOTION_EASE_OUT } from '@/utils/motionTokens'

const router = useRouter()
const { isAdmin } = useCmsAdmin()
const reduced = useReducedMotion()
const heroLines = ['Membangun masa depan,', 'satu kavling demi kavling.']

/** Seluruh isi halaman berasal dari database dan diatur Admin. Tidak ada teks, angka, video, atau nomor contoh di kode. */
const loading = ref(true)
const description = ref('')
const points = ref<string[]>([])
const highlights = ref<HomeHighlight[]>([])
const whatsapp = ref('')
const video = ref<VideoItem | null>(null)
const editTextOpen = ref(false)
const editHighlightsOpen = ref(false)

const aboutText = computed(() => description.value || video.value?.description || '')
const hasWhatsapp = computed(() => !!toWaNumber(whatsapp.value))

/** Paragraf pertama tampil besar (serif) sebagai pembuka; sisanya teks biasa. */
const paragraphs = computed(() => aboutText.value.split(/\n+/).map((p) => p.trim()).filter(Boolean))
const leadParagraph = computed(() => paragraphs.value[0] ?? '')
const restParagraphs = computed(() => paragraphs.value.slice(1))

async function load() {
  try {
    const [rows, savedVideo] = await Promise.all([contactsService.getAll(), featureService.getVideo().catch(() => null)])
    const valueOf = (key: string) => rows.find((row) => row.key === key)?.value ?? ''
    description.value = valueOf(HOME_KEYS.aboutDescription).trim()
    points.value = parsePoints(valueOf(HOME_KEYS.aboutPoints))
    highlights.value = parseHighlights(valueOf(HOME_KEYS.highlights))
    whatsapp.value = valueOf('whatsapp')
    video.value = savedVideo
  } catch (error) {
    console.error('Gagal memuat halaman Tentang Kami:', error)
  } finally {
    loading.value = false
  }
}

const goBack = () => {
  if (window.history.length > 1) router.back()
  else router.push('/home')
}

const contactWhatsapp = () => {
  const number = toWaNumber(whatsapp.value)
  if (number) window.open(`https://wa.me/${number}`, '_blank')
}

onMounted(load)
</script>

<style scoped>
.about-content { --background: var(--pl-paper, #f9f5ec); }
.about-page { padding-bottom: calc(110px + env(safe-area-inset-bottom)); }

/* ---------- Hero ---------- */
.about-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: clamp(440px, 70dvh, 580px);
  padding: calc(env(safe-area-inset-top, 0px) + 12px) 24px 0;
  overflow: hidden;
  background:
    radial-gradient(110% 60% at 100% 0%, rgba(244, 214, 154, 0.26) 0%, rgba(244, 214, 154, 0) 62%),
    linear-gradient(165deg, var(--green-700, #355a2c) 0%, var(--green-900, #1f3519) 100%);
  color: #fff;
}

.hero-scene { z-index: 1; }

.back-btn {
  position: relative;
  z-index: 3;
  align-self: flex-start;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 16px 0 12px;
  border: 1px solid rgba(255, 255, 255, 0.28);
  border-radius: 999px;
  background: rgba(27, 40, 22, 0.35);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  color: #fff;
  font: 700 13px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-base) var(--ease-spring);
}
.back-btn:active { transform: scale(0.96); }
.back-btn:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 3px; }
.back-btn ion-icon { font-size: 18px; }

.hero-copy {
  position: relative;
  z-index: 3;
  margin-top: auto;
  padding-bottom: 150px; /* ruang untuk bukit */
}

.eyebrow {
  display: block;
  margin-bottom: 14px;
  color: var(--poliland-gold-soft, #f4d69a);
  font: 800 11px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.about-hero h1 {
  margin: 0;
  color: #fff;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: clamp(36px, 10.4vw, 52px);
  line-height: 1.06;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.hero-line { display: block; overflow: hidden; padding-bottom: 0.08em; }
.hero-line-inner { display: block; will-change: transform; }

/* ---------- Profil ---------- */
.block { padding: 8px 20px 0; }

.lead {
  margin: 0 0 16px;
  color: var(--text-primary, #252525);
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: clamp(20px, 5.6vw, 24px);
  line-height: 1.45;
  font-weight: 450;
  letter-spacing: -0.01em;
}

.body-text {
  margin: 0 0 14px;
  color: var(--text-secondary, #717178);
  font-size: 16px;
  line-height: 1.75;
}

.points { display: grid; gap: 10px; margin: 22px 0 0; padding: 0; list-style: none; }

.point {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #fff);
  box-shadow: var(--shadow-sm);
}

.point-icon {
  display: grid;
  place-items: center;
  flex: 0 0 36px;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--green-100, #e8eee4);
  color: var(--poliland-green, #355a2c);
  font-size: 20px;
}

.point-text {
  align-self: center;
  color: var(--text-primary, #252525);
  font-size: 15px;
  line-height: 1.5;
  font-weight: 600;
}

/* ---------- Angka ---------- */
.stats {
  position: relative;
  margin: 32px 16px 0;
  padding: 28px 14px;
  overflow: hidden;
  border-radius: 24px;
  background:
    radial-gradient(90% 80% at 100% 0%, rgba(244, 214, 154, 0.22) 0%, rgba(244, 214, 154, 0) 60%),
    linear-gradient(155deg, var(--green-800, #2b4824) 0%, var(--green-900, #1f3519) 100%);
  box-shadow: var(--shadow-md);
}

.stats-scene { z-index: 0; }

.stats-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(96px, 1fr));
  gap: 10px;
}

.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 18px 8px;
  border: 1px solid rgba(244, 214, 154, 0.2);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.07);
  text-align: center;
}

.stat strong {
  color: var(--poliland-gold-soft, #f4d69a);
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: clamp(30px, 8.6vw, 38px);
  line-height: 1;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.stat span {
  color: var(--on-forest, #f4f1e8);
  font-size: 12px;
  line-height: 1.35;
  font-weight: 600;
}

/* ---------- Video ---------- */
.video-box {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-panel, 20px);
  background: var(--green-900, #1f3519);
  box-shadow: var(--shadow-lg);
  outline: 1px solid rgba(203, 160, 68, 0.35);
  outline-offset: 5px;
}
.video-box video { width: 100%; height: 100%; object-fit: cover; }
.video-box iframe { display: block; width: 100%; height: 100%; border: 0; }

/* ---------- CTA ---------- */
.cta {
  position: relative;
  margin: 36px 16px 0;
  overflow: hidden;
  border-radius: 24px;
  background:
    radial-gradient(90% 80% at 100% 0%, rgba(244, 214, 154, 0.26) 0%, rgba(244, 214, 154, 0) 60%),
    linear-gradient(155deg, var(--green-700, #355a2c) 0%, var(--green-900, #1f3519) 100%);
  box-shadow: var(--shadow-md);
  color: #fff;
}

.cta-scene { z-index: 0; }

.cta-body {
  position: relative;
  z-index: 2;
  padding: 36px 24px 96px; /* ruang bawah untuk bukit */
}

.cta h2 {
  margin: 0;
  color: #fff;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: clamp(28px, 7.6vw, 34px);
  line-height: 1.1;
  font-weight: 650;
  letter-spacing: -0.02em;
}

.cta p {
  max-width: 34ch;
  margin: 12px 0 22px;
  color: rgba(244, 241, 232, 0.9);
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
  border: 0;
  border-radius: 14px;
  background: var(--poliland-gold, #cba044);
  color: var(--ink, #1b1f1a);
  font: 800 15px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  box-shadow: 0 12px 26px -10px rgba(203, 160, 68, 0.85);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-base) var(--ease-spring);
}
.cta-btn ion-icon { font-size: 22px; }
.cta-btn:active { transform: scale(0.97); }
.cta-btn:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }

.bottom-space { height: 20px; }

.admin-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 16px 20px 0; }

.empty-hint { margin: 20px 20px 0; padding: 14px; border: 1px dashed var(--border-strong, #d5d0c4); border-radius: 12px; color: var(--text-secondary, #717178); font-size: 14px; }
.empty-hint.soft { text-align: center; border-style: solid; border-color: var(--border-default, #eae7e0); background: var(--surface-primary, #fff); }

@media (min-width: 768px) {
  .about-page { max-width: 720px; margin: 0 auto; }
}

@media (prefers-reduced-motion: reduce) {
  .back-btn:active,
  .cta-btn:active { transform: none; }
}
</style>
