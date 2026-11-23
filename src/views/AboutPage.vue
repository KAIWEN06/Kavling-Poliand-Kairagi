<template>
  <ion-page>
    <ion-content class="about-content">
      <div class="about-page">
        <!-- HERO -->
        <section class="about-hero">
          <button class="back-btn" type="button" aria-label="Kembali" @click="goBack">
            <ion-icon :icon="arrowBackOutline" />
            Kembali
          </button>
          <span class="eyebrow">TENTANG POLILAND</span>
          <h1>Membangun masa depan,<br />satu kavling demi kavling.</h1>
        </section>

        <div v-if="isAdmin" class="admin-row">
          <AdminEditButton label="Edit teks" @click="editTextOpen = true" />
          <AdminEditButton label="Edit sorotan" @click="editHighlightsOpen = true" />
        </div>

        <!-- PROFIL -->
        <section v-if="aboutText || points.length" class="block">
          <h2>Profil Kami</h2>
          <span class="heading-line"></span>
          <p v-if="aboutText">{{ aboutText }}</p>
          <div v-if="points.length" class="card">
            <ul>
              <li v-for="point in points" :key="point">
                <ion-icon :icon="checkmarkCircleOutline" />
                <span>{{ point }}</span>
              </li>
            </ul>
          </div>
        </section>
        <p v-else-if="!loading && isAdmin" class="empty-hint">Profil belum diisi. Tekan “Edit teks”.</p>

        <!-- ANGKA -->
        <section v-if="highlights.length" class="stats">
          <div v-for="stat in highlights" :key="stat.label" class="stat">
            <strong>{{ stat.value }}</strong>
            <span>{{ stat.label }}</span>
          </div>
        </section>

        <!-- VIDEO -->
        <section v-if="video?.video_url" class="block">
          <h2>{{ video.title || 'Video Profil' }}</h2>
          <span class="heading-line"></span>
          <div class="video-box">
            <iframe
              v-if="isYouTubeUrl(video.video_url)"
              :src="getYouTubeEmbedUrl(video.video_url) || ''"
              :title="video.title"
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
        </section>

        <!-- CTA -->
        <section v-if="hasWhatsapp" class="cta">
          <h2>Ingin tahu lebih lanjut?</h2>
          <p>Tim kami siap menjawab pertanyaan Anda dan mengantar melihat kawasan secara langsung.</p>
          <ion-button class="cta-btn" @click="contactWhatsapp">
            <ion-icon slot="start" :icon="logoWhatsapp" />
            Hubungi via WhatsApp
          </ion-button>
        </section>

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
import { IonButton, IonContent, IonIcon, IonPage } from '@ionic/vue'
import { arrowBackOutline, checkmarkCircleOutline, logoWhatsapp } from 'ionicons/icons'
import { useRouter } from 'vue-router'
import AdminEditButton from '@/components/Admin/AdminEditButton.vue'
import CmsBackBar from '@/components/Admin/CmsBackBar.vue'
import CmsPanelModal from '@/components/Admin/CmsPanelModal.vue'
import { contactsService } from '@/services/contactService'
import { featureService, getYouTubeEmbedUrl, isYouTubeUrl, type VideoItem } from '@/services/featureService'
import { HOME_KEYS, parseHighlights, parsePoints, toWaNumber, type HomeHighlight } from '@/utils/homeContent'
import { useCmsAdmin } from '@/composables/useCmsAdmin'

const router = useRouter()
const { isAdmin } = useCmsAdmin()

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
.about-content { --background: #FAFAF7; }
.about-page { padding-bottom: calc(110px + env(safe-area-inset-bottom)); }

.about-hero { padding: 20px 16px 28px; background: linear-gradient(160deg, #556B2F, #3f5022); color: #fff; }
.back-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 0; margin-bottom: 14px; border: 0; background: transparent; color: #fff; font-size: 12px; font-weight: 700; cursor: pointer; }
.eyebrow { display: block; margin-bottom: 8px; font-size: 10px; font-weight: 800; letter-spacing: 1px; opacity: 0.85; }
.about-hero h1 { margin: 0 0 10px; font-size: 24px; line-height: 1.25; font-weight: 800; letter-spacing: -0.4px; }
.about-hero p { margin: 0; font-size: 13px; line-height: 1.65; opacity: 0.92; }

.block { padding: 26px 16px 0; }
.block h2 { margin: 0; color: #1A1A1A; font-size: 20px; font-weight: 800; letter-spacing: -0.3px; }
.heading-line { display: block; width: 34px; height: 3px; margin: 7px 0 14px; background: #556B2F; border-radius: 999px; }
.block > p { margin: 0 0 10px; color: #475569; font-size: 13px; line-height: 1.7; }

.stats { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; margin: 22px 16px 0; padding: 14px 8px; background: #fff; border-radius: 14px; box-shadow: 0 4px 14px rgba(15, 23, 42, 0.07); }
.stat { display: flex; flex-direction: column; align-items: center; gap: 2px; text-align: center; }
.stat strong { color: #556B2F; font-size: 18px; font-weight: 800; }
.stat span { color: #64748b; font-size: 11px; font-weight: 600; }

.video-box { aspect-ratio: 16 / 9; overflow: hidden; border-radius: 14px; background: #000; box-shadow: 0 8px 22px rgba(15, 23, 42, 0.12); }
.video-box video { width: 100%; height: 100%; object-fit: cover; }

.card { padding: 14px; margin-bottom: 10px; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; }
.card h3 { margin: 0 0 6px; color: #556B2F; font-size: 14px; font-weight: 800; }
.card p { margin: 0; color: #475569; font-size: 13px; line-height: 1.65; }
.card ul { display: flex; flex-direction: column; gap: 10px; margin: 0; padding: 0; list-style: none; }
.card li { display: flex; align-items: flex-start; gap: 8px; color: #334155; font-size: 13px; line-height: 1.55; }
.card li ion-icon { flex: 0 0 auto; margin-top: 2px; color: #556B2F; font-size: 16px; }

.values { display: flex; flex-direction: column; gap: 10px; }
.value { display: flex; gap: 12px; padding: 14px; background: #fff; border: 1px solid #e2e8f0; border-radius: 14px; }
.value-icon { display: flex; flex: 0 0 40px; align-items: center; justify-content: center; width: 40px; height: 40px; background: #f4f7f0; color: #556B2F; border-radius: 12px; font-size: 20px; }
.value h3 { margin: 0 0 3px; color: #1A1A1A; font-size: 14px; font-weight: 800; }
.value p { margin: 0; color: #64748b; font-size: 12px; line-height: 1.55; }

.cta { margin: 28px 16px 0; padding: 22px 18px; text-align: center; background: #556B2F; color: #fff; border-radius: 18px; }
.cta h2 { margin: 0 0 6px; font-size: 18px; font-weight: 800; }
.cta p { margin: 0 0 14px; font-size: 12px; line-height: 1.6; opacity: 0.92; }
.cta-btn { --background: #25D366; --color: #fff; --border-radius: 10px; font-weight: 700; }

.bottom-space { height: 20px; }

@media (min-width: 768px) {
  .about-page { max-width: 720px; margin: 0 auto; }
}
.admin-row { display: flex; flex-wrap: wrap; gap: 8px; margin: 14px 0 0; }
.empty-hint { margin: 16px 0 0; padding: 14px; border: 1px dashed #d5d0c4; border-radius: 12px; color: #6b6b6b; font-size: 13px; }
.video-box iframe { display: block; width: 100%; height: 100%; border: 0; }
</style>
