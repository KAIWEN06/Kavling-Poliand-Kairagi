<template>
  <section v-if="showSection" class="section about-section">
    <div v-if="loading" class="skeleton-heading skeleton-head-gap">
      <Skeleton width="125px" height="24px" border-radius="6px" />
      <Skeleton width="34px" height="3px" border-radius="999px" />
    </div>
    <SectionHeader v-else title="Tentang kami">
      <AdminEditButton v-if="isAdmin" label="Ubah teks" @click="editTextOpen = true" />
    </SectionHeader>

    <div class="about-content">
      <!-- ==========================================
           ABOUT TEXT
      =========================================== -->
      <div class="about-text">

        <!-- SKELETON -->
        <template v-if="loading">
          <div class="skeleton-text-group">
            <Skeleton
              width="100%"
              height="12px"
              border-radius="6px"
            />

            <Skeleton
              width="96%"
              height="12px"
              border-radius="6px"
            />

            <Skeleton
              width="88%"
              height="12px"
              border-radius="6px"
            />

            <Skeleton
              width="72%"
              height="12px"
              border-radius="6px"
            />
          </div>

          <div class="skeleton-check-list">
            <div class="skeleton-check-item">
              <Skeleton
                width="15px"
                height="15px"
                variant="circle"
              />

              <Skeleton
                width="82%"
                height="10px"
                border-radius="5px"
              />
            </div>

            <div class="skeleton-check-item">
              <Skeleton
                width="15px"
                height="15px"
                variant="circle"
              />

              <Skeleton
                width="75%"
                height="10px"
                border-radius="5px"
              />
            </div>

            <div class="skeleton-check-item">
              <Skeleton
                width="15px"
                height="15px"
                variant="circle"
              />

              <Skeleton
                width="85%"
                height="10px"
                border-radius="5px"
              />
            </div>
          </div>

          <Skeleton
            width="145px"
            height="32px"
            border-radius="8px"
          />
        </template>

        <!-- DATA ASLI -->
        <template v-else>
          <p v-if="aboutText" class="about-lead">{{ aboutText }}</p>
          <p v-else-if="isAdmin" class="empty-hint">Deskripsi belum diisi. Tekan “Ubah teks”.</p>

          <div v-if="aboutPoints.length" class="check-list">
            <div v-for="(point, index) in aboutPoints" :key="index">
              <ion-icon :icon="checkmarkCircleOutline" aria-hidden="true" />
              <span>{{ point }}</span>
            </div>
          </div>

          <button class="text-btn" type="button" @click="handleSeeAll">
            Selengkapnya
            <ion-icon :icon="arrowForwardOutline" aria-hidden="true" />
          </button>
        </template>
      </div>

      <!-- ==========================================
           VIDEO / IMAGE PREVIEW
      =========================================== -->
      <div class="about-image-wrapper">

        <!-- ADMIN ACTION BUTTON -->
        <div
          v-if="isAdmin"
          class="admin-action-bar"
        >
          <button
            @click="handleOpenModal"
            class="admin-edit-btn"
          >
            <ion-icon :icon="settingsOutline" />

            {{ videoData ? 'Ubah Video' : 'Tambah Video' }}
          </button>
        </div>

        <div class="about-image">

          <!-- VIDEO SKELETON -->
          <div
            v-if="loading"
            class="video-skeleton"
          >
            <Skeleton
              width="100%"
              height="100%"
              border-radius="15px"
            />

            <div class="video-skeleton-play">
              <Skeleton
                width="48px"
                height="48px"
                variant="circle"
              />
            </div>
          </div>

          <!-- VIDEO THUMBNAIL -->
          <template v-else-if="thumbnail">
            <img
              :src="thumbnail"
              alt="Gambar mini video profil"
            />

            <button
              class="play-button"
              type="button"
              aria-label="Putar video profil"
              @click="handlePlayVideo"
            >
              <ion-icon :icon="play" aria-hidden="true" />
            </button>
          </template>

          <!-- EMPTY -->
          <div
            v-else
            class="video-empty-box"
            :role="isAdmin ? 'button' : undefined"
            :tabindex="isAdmin ? 0 : undefined"
            @click="isAdmin ? handleOpenModal() : null"
            @keydown.enter="isAdmin ? handleOpenModal() : null"
          >
            <ion-icon
              :icon="videocamOffOutline"
              class="empty-icon"
            />

            <p>{{ isAdmin ? 'Video belum diatur. Tekan untuk menambahkan.' : 'Video belum tersedia' }}</p>
          </div>

        </div>
      </div>
    </div>

    <!-- VIDEO PLAYER -->
    <AppModal
      v-model="isVideoOpen"
      :title="videoData?.title || 'Video profil'"
      variant="dialog"
      max-width="720px"
      :show-footer="false"
    >
      <div v-if="videoData?.video_url" class="player-container">
        <iframe
          v-if="isYouTubeUrl(videoData.video_url)"
          :src="getYouTubeEmbedUrl(videoData.video_url) || ''"
          :title="videoData.title"
          class="video-iframe"
          referrerpolicy="strict-origin-when-cross-origin"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        />
        <video v-else :src="videoData.video_url" controls autoplay class="video-native" />
      </div>
    </AppModal>

    <!-- ADMIN: VIDEO PROFIL -->
    <AppModal
      v-model="isModalOpen"
      title="Kelola Video Profil"
      :loading="saving"
      confirm-text="Simpan"
      @confirm="handleSubmit"
    >
        <AppNotice v-if="message.text" tone="error" :message="message.text" style="margin-bottom: 14px" />

        <form class="admin-form" @submit.prevent="handleSubmit">

          <!-- JUDUL -->
          <div class="form-group">
            <label>Judul Video</label>

            <input
              type="text"
              required
              v-model="formData.title"
              placeholder="Contoh: Profil Perumahan PoliLand"
            />
          </div>

          <!-- DESKRIPSI -->
          <div class="form-group">
            <label>Deskripsi</label>

            <textarea
              rows="3"
              v-model="formData.description"
              placeholder="Deskripsi video..."
            ></textarea>
          </div>

          <!-- SUMBER VIDEO -->
          <div class="form-group">
            <label>Sumber Video</label>

            <div class="source-grid">

              <button
                type="button"
                @click="handleChangeVideoSource('youtube')"
                :class="[
                  'source-tab',
                  videoSource === 'youtube'
                    ? 'active-youtube'
                    : ''
                ]"
              >
                <ion-icon :icon="play" />
                YouTube
              </button>

              <button
                type="button"
                @click="handleChangeVideoSource('upload')"
                :class="[
                  'source-tab',
                  videoSource === 'upload'
                    ? 'active-upload'
                    : ''
                ]"
              >
                <ion-icon :icon="cloudUploadOutline" />
                Unggah
              </button>

            </div>
          </div>

          <!-- YOUTUBE -->
          <div
            v-if="videoSource === 'youtube'"
            class="form-group"
          >
            <label>Tautan YouTube</label>

            <input
              type="url"
              v-model="formData.video_url"
              @input="handleYouTubeUrlChange"
              placeholder="https://www.youtube.com/watch?v=..."
            />

            <span
              v-if="
                formData.video_url &&
                getYouTubeVideoId(formData.video_url)
              "
              class="helper-success"
            >
              URL YouTube valid
            </span>
          </div>

          <!-- UPLOAD VIDEO -->
          <div
            v-if="videoSource === 'upload'"
            class="form-group"
          >
            <label>File Video</label>

            <label
              for="mobile-about-video"
              class="upload-dropzone"
            >
              <ion-icon
                :icon="videocamOutline"
                class="drop-icon"
              />

              <span class="drop-text">
                {{
                  selectedVideoFile
                    ? selectedVideoFile.name
                    : 'Klik untuk memilih video'
                }}
              </span>

              <span class="drop-hint">
                MP4, WEBM, OGG, MOV • Maks. 50 MB
              </span>

              <input
                id="mobile-about-video"
                type="file"
                accept="video/mp4,video/webm,video/ogg,video/quicktime"
                @change="handleVideoFileChange"
                style="display: none;"
              />
            </label>
          </div>

          <!-- THUMBNAIL -->
          <div class="form-group">
            <label>Gambar mini</label>

            <label
              for="mobile-about-thumbnail"
              class="upload-dropzone"
            >
              <ion-icon
                :icon="imageOutline"
                class="drop-icon"
              />

              <span class="drop-text">
                {{
                  selectedThumbnailFile
                    ? selectedThumbnailFile.name
                    : 'Unggah gambar mini (opsional)'
                }}
              </span>

              <span class="drop-hint">
                JPG, PNG, WEBP • Maks. 5 MB
              </span>

              <input
                id="mobile-about-thumbnail"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/webp"
                @change="handleThumbnailFileChange"
                style="display: none;"
              />
            </label>

            <div
              v-if="thumbnailPreviewUrl"
              class="thumbnail-preview"
            >
              <img
                :src="thumbnailPreviewUrl"
                alt="Pratinjau Gambar Mini"
              />
            </div>
          </div>

        </form>
    </AppModal>

    <CmsPanelModal v-model="editTextOpen" title="Ubah Tentang Kami" panel="home" section="about" @saved="loadAboutText" />
  </section>
</template>


<script setup lang="ts">
import { useRealtimeRefresh } from '@/composables/useRealtimeRefresh'
import AppNotice from '@/components/ui/AppNotice.vue'
import { useToast } from '@/composables/useToast'

import {
  ref,
  computed,
  onMounted,
  onUnmounted
} from 'vue'

import {
  IonButton,
  IonIcon
} from '@ionic/vue'

import { useRouter } from 'vue-router'
import Skeleton from '@/components/ui/Skeleton.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AdminEditButton from '@/components/Admin/AdminEditButton.vue'
import CmsPanelModal from '@/components/Admin/CmsPanelModal.vue'
import { useCmsAdmin } from '@/composables/useCmsAdmin'
import { contactsService } from '@/services/contactService'
import { HOME_KEYS, parsePoints } from '@/utils/homeContent'

import {
  checkmarkCircleOutline,
  arrowForwardOutline,
  play,
  settingsOutline,
  videocamOffOutline,
  cloudUploadOutline,
  videocamOutline,
  imageOutline
} from 'ionicons/icons'

import {
  featureService,
  getYouTubeVideoId,
  getYouTubeThumbnail,
  getYouTubeEmbedUrl,
  isYouTubeUrl,
  VideoItem
} from '@/services/featureService'


// ==========================================
// STATE
// ==========================================

const router = useRouter()

const videoData = ref<VideoItem | null>(null)

const { isAdmin } = useCmsAdmin()

const aboutDescription = ref('')
const aboutPoints = ref<string[]>([])
const editTextOpen = ref(false)

const aboutText = computed(() => aboutDescription.value || videoData.value?.description || '')
const showSection = computed(() => loading.value || isAdmin.value || !!aboutText.value || aboutPoints.value.length > 0 || !!videoData.value)

const loading = ref(true)

const isModalOpen = ref(false)

const saving = ref(false)

const videoSource = ref<'youtube' | 'upload'>('youtube')


// ==========================================
// FORM
// ==========================================

const formData = ref({
  title: '',
  description: '',
  video_url: '',
  thumbnail_url: '',
})

const selectedVideoFile = ref<File | null>(null)

const selectedThumbnailFile = ref<File | null>(null)

const videoPreviewUrl = ref('')

const thumbnailPreviewUrl = ref('')

const message = ref({
  text: '',
  type: '',
})


// ==========================================
// VIDEO MODAL
// ==========================================

const isVideoOpen = ref(false)


// ==========================================
// FETCH DATA
// ==========================================

const fetchData = async () => {

  try {

    loading.value = true

    const data = await featureService.getVideo()

    if (data) {

      videoData.value = data

      formData.value = {
        title: data.title || '',
        description: data.description || '',
        video_url: data.video_url || '',
        thumbnail_url: data.thumbnail_url || '',
      }

    }

  } catch (error) {

    console.error(
      'Gagal mengambil data video:',
      error
    )

  } finally {

    loading.value = false

  }

}

/** Deskripsi dan poin "Tentang Kami" diatur Admin lewat Kelola Konten atau tombol Edit teks. */
const loadAboutText = async () => {
  try {
    const rows = await contactsService.getAll()
    const valueOf = (key: string) => rows.find((row) => row.key === key)?.value ?? ''
    aboutDescription.value = valueOf(HOME_KEYS.aboutDescription).trim()
    aboutPoints.value = parsePoints(valueOf(HOME_KEYS.aboutPoints))
  } catch (error) {
    console.error('Gagal mengambil teks Tentang Kami:', error)
  }
}


// ==========================================
// LIFECYCLE
// ==========================================

onMounted(() => {
  fetchData()
  loadAboutText()
})


onUnmounted(() => {

  if (
    videoPreviewUrl.value &&
    videoPreviewUrl.value.startsWith('blob:')
  ) {

    URL.revokeObjectURL(
      videoPreviewUrl.value
    )

  }

  if (
    thumbnailPreviewUrl.value &&
    thumbnailPreviewUrl.value.startsWith('blob:')
  ) {

    URL.revokeObjectURL(
      thumbnailPreviewUrl.value
    )

  }

})


// ==========================================
// THUMBNAIL
// ==========================================

const thumbnail = computed(() => {

  return (
    videoData.value?.thumbnail_url?.replace('/maxresdefault.jpg', '/hqdefault.jpg') ||

    (
      isYouTubeUrl(
        videoData.value?.video_url
      )
        ? getYouTubeThumbnail(
            videoData.value?.video_url
          )
        : null
    )
  )

})


// ==========================================
// ACTIONS
// ==========================================

const handleSeeAll = () => {
  router.push('/about')
}


const handleOpenModal = () => {

  message.value = {
    text: '',
    type: ''
  }

  selectedVideoFile.value = null

  selectedThumbnailFile.value = null


  if (videoData.value) {

    formData.value = {

      title:
        videoData.value.title || '',

      description:
        videoData.value.description || '',

      video_url:
        videoData.value.video_url || '',

      thumbnail_url:
        videoData.value.thumbnail_url || '',

    }


    videoSource.value =
      isYouTubeUrl(
        videoData.value.video_url
      )
        ? 'youtube'
        : 'upload'


    videoPreviewUrl.value =
      videoData.value.video_url || ''

    thumbnailPreviewUrl.value =
      videoData.value.thumbnail_url || ''

  } else {

    formData.value = {
      title: '',
      description: '',
      video_url: '',
      thumbnail_url: ''
    }

    videoSource.value = 'youtube'

    videoPreviewUrl.value = ''

    thumbnailPreviewUrl.value = ''

  }


  isModalOpen.value = true

}


const handleChangeVideoSource = (
  source: 'youtube' | 'upload'
) => {

  videoSource.value = source

  message.value = {
    text: '',
    type: ''
  }

  if (source === 'youtube') {

    selectedVideoFile.value = null

  }

  if (source === 'upload') {

    formData.value.video_url =
      isYouTubeUrl(
        formData.value.video_url
      )
        ? ''
        : formData.value.video_url

  }

}


const handleYouTubeUrlChange = (
  e: Event
) => {

  const target =
    e.target as HTMLInputElement

  const url = target.value

  formData.value.video_url = url

  const thumb =
    getYouTubeThumbnail(url)

  if (thumb) {

    thumbnailPreviewUrl.value = thumb

    formData.value.thumbnail_url = thumb

  } else {

    thumbnailPreviewUrl.value = ''

  }

}


// ==========================================
// VIDEO FILE
// ==========================================

const handleVideoFileChange = (
  e: Event
) => {

  const target =
    e.target as HTMLInputElement

  const file =
    target.files?.[0]

  if (!file) return


  const allowedTypes = [
    'video/mp4',
    'video/webm',
    'video/ogg',
    'video/quicktime'
  ]


  if (!allowedTypes.includes(file.type)) {

    message.value = {
      text:
        'Format video harus MP4, WEBM, OGG, atau MOV.',
      type: 'error'
    }

    target.value = ''

    return

  }


  if (
    file.size >
    50 * 1024 * 1024
  ) {

    message.value = {
      text:
        'Ukuran video maksimal 50 MB.',
      type: 'error'
    }

    target.value = ''

    return

  }


  selectedVideoFile.value = file


  if (
    videoPreviewUrl.value?.startsWith(
      'blob:'
    )
  ) {

    URL.revokeObjectURL(
      videoPreviewUrl.value
    )

  }


  videoPreviewUrl.value =
    URL.createObjectURL(file)


  message.value = {
    text: '',
    type: ''
  }

}


// ==========================================
// THUMBNAIL FILE
// ==========================================

const handleThumbnailFileChange = (
  e: Event
) => {

  const target =
    e.target as HTMLInputElement

  const file =
    target.files?.[0]

  if (!file) return


  const allowedTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/webp'
  ]


  if (!allowedTypes.includes(file.type)) {

    message.value = {
      text:
        'Gambar mini harus JPG, JPEG, PNG, atau WEBP.',
      type: 'error'
    }

    target.value = ''

    return

  }


  if (
    file.size >
    5 * 1024 * 1024
  ) {

    message.value = {
      text:
        'Ukuran gambar mini maksimal 5 MB.',
      type: 'error'
    }

    target.value = ''

    return

  }


  selectedThumbnailFile.value = file


  if (
    thumbnailPreviewUrl.value?.startsWith(
      'blob:'
    )
  ) {

    URL.revokeObjectURL(
      thumbnailPreviewUrl.value
    )

  }


  thumbnailPreviewUrl.value =
    URL.createObjectURL(file)


  message.value = {
    text: '',
    type: ''
  }

}


// ==========================================
// SUBMIT
// ==========================================

const handleSubmit = async () => {

  saving.value = true

  message.value = {
    text: '',
    type: ''
  }


  try {

    if (
      !formData.value.title.trim()
    ) {

      throw new Error(
        'Judul video wajib diisi.'
      )

    }


    let videoUrl =
      formData.value.video_url

    let thumbnailUrl =
      formData.value.thumbnail_url


    // ========================================
    // YOUTUBE
    // ========================================

    if (
      videoSource.value === 'youtube'
    ) {

      if (
        !getYouTubeVideoId(
          formData.value.video_url
        )
      ) {

        throw new Error(
          'Masukkan URL YouTube yang valid.'
        )

      }


      videoUrl =
        formData.value.video_url.trim()


      if (
        !selectedThumbnailFile.value
      ) {

        const ytThumb =
          getYouTubeThumbnail(
            videoUrl
          )

        if (ytThumb) {

          thumbnailUrl = ytThumb

        }

      }

    }


    // ========================================
    // UPLOAD VIDEO
    // ========================================

    if (
      videoSource.value === 'upload'
    ) {

      if (
        !selectedVideoFile.value &&
        !formData.value.video_url
      ) {

        throw new Error(
          'Silakan pilih file video terlebih dahulu.'
        )

      }


      if (
        selectedVideoFile.value
      ) {

        const uploaded =
          await featureService.uploadVideo(
            selectedVideoFile.value
          )

        videoUrl = uploaded.url

      }

    }


    // ========================================
    // UPLOAD THUMBNAIL
    // ========================================

    if (
      selectedThumbnailFile.value
    ) {

      const uploadedThumb =
        await featureService.uploadThumbnail(
          selectedThumbnailFile.value
        )

      thumbnailUrl =
        uploadedThumb.url

    }


    // ========================================
    // UPDATE
    // ========================================

    if (
      videoData.value?.id
    ) {

      const oldVideoUrl =
        videoData.value.video_url

      const oldThumbnailUrl =
        videoData.value.thumbnail_url


      await featureService.updateVideo(
        videoData.value.id,
        {
          title:
            formData.value.title.trim(),

          description:
            formData.value.description.trim(),

          video_url:
            videoUrl,

          thumbnail_url:
            thumbnailUrl,

          sort_order:
            videoData.value.sort_order ?? 0,

          is_active:
            videoData.value.is_active ?? true,
        }
      )


      if (
        selectedVideoFile.value &&
        oldVideoUrl &&
        oldVideoUrl !== videoUrl
      ) {

        await featureService.deleteVideoFile(
          oldVideoUrl
        )

      }


      if (
        selectedThumbnailFile.value &&
        oldThumbnailUrl &&
        oldThumbnailUrl !== thumbnailUrl
      ) {

        await featureService.deleteThumbnailFile(
          oldThumbnailUrl
        )

      }

    }

    // ========================================
    // CREATE
    // ========================================

    else {

      await featureService.createVideo({

        title:
          formData.value.title.trim(),

        description:
          formData.value.description.trim(),

        video_url:
          videoUrl,

        thumbnail_url:
          thumbnailUrl,

        sort_order: 0,

        is_active: true,

      })

    }


    // ========================================
    // SUCCESS
    // ========================================

    useToast().success('Video tersimpan.')


    setTimeout(
      async () => {

        isModalOpen.value = false

        await fetchData()

      },
      1000
    )


  } catch (error: any) {

    message.value = {

      text:
        'Gagal menyimpan: ' +
        (
          error.message ||
          error
        ),

      type: 'error'

    }

  } finally {

    saving.value = false

  }

}


// ==========================================
// VIDEO PLAYER
// ==========================================

const handlePlayVideo = () => {

  if (
    !videoData.value?.video_url
  ) return

  isVideoOpen.value = true

}

/* Hanya data tampil yang diperbarui; isian formulir video tidak disentuh. */
async function refreshAboutContent() {
  const [video] = await Promise.all([featureService.getVideo(), loadAboutText()])
  if (video) videoData.value = video
}

useRealtimeRefresh(['videos', 'media', 'contacts'], refreshAboutContent)

</script>


<style scoped>

/* ==========================================
   SECTION
========================================== */

.skeleton-heading {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

/* ==========================================
   ABOUT CONTENT
========================================== */

.about-content {
  display: flex;

  flex-direction: column;

  gap: 18px;
}

/* ==========================================
   BAGIAN PUBLIK (rasa Welcome)
========================================== */
.section { padding: 36px 20px 0; }
.about-section { padding-top: 40px; }
.skeleton-head-gap { margin-bottom: 16px; }

.about-lead {
  margin: 0;
  color: var(--text-primary, #252525);
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: clamp(19px, 5.2vw, 22px);
  line-height: 1.5;
  font-weight: 450;
  letter-spacing: -0.01em;
}
.check-list { display: flex; flex-direction: column; gap: 10px; margin-top: 18px; }
.check-list div {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 14px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #fff);
  box-shadow: var(--shadow-sm);
  color: var(--text-primary, #252525);
  font-size: 15px;
  font-weight: 600;
  line-height: 1.5;
}
.check-list ion-icon { flex: 0 0 auto; margin-top: 1px; color: var(--poliland-green, #355a2c); font-size: 22px; }

.text-btn {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  margin-top: 14px;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--poliland-green, #355a2c);
  font: 800 15px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}
.text-btn ion-icon { font-size: 18px; transition: transform var(--dur-base) var(--ease-spring); }
.text-btn:active ion-icon { transform: translateX(4px); }
.text-btn:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 3px; }

.admin-edit-btn {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 16px;
  border: 0;
  border-radius: 999px;
  background: var(--poliland-green, #355a2c);
  color: #fff;
  font: 700 13px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  box-shadow: var(--shadow-sm);
  touch-action: manipulation;
}

.about-image {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: var(--radius-panel, 20px);
  background: var(--green-900, #1f3519);
  box-shadow: var(--shadow-lg);
  outline: 1px solid rgba(203, 160, 68, 0.35);
  outline-offset: 5px;
}
.about-image img { width: 100%; height: 100%; object-fit: cover; }

.play-button {
  position: absolute;
  left: 50%;
  top: 50%;
  display: grid;
  place-items: center;
  width: 64px;
  height: 64px;
  border: 0;
  border-radius: 50%;
  background: var(--poliland-gold, #cba044);
  color: var(--ink, #1b1f1a);
  font-size: 28px;
  box-shadow: 0 12px 26px -8px rgba(0, 0, 0, 0.5);
  transform: translate(-50%, -50%);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: scale var(--dur-base) var(--ease-spring);
}
.play-button:active { scale: 0.94; }
.play-button:focus-visible { outline: 3px solid #fff; outline-offset: 3px; }

.video-empty-box p { margin: 0; color: var(--on-forest, #f4f1e8); font-size: 14px; font-weight: 600; line-height: 1.5; }
.video-empty-box .empty-icon { color: var(--poliland-gold-soft, #f4d69a); }
.empty-hint { padding: 14px; border: 1px dashed var(--border-strong, #d5d0c4); border-radius: var(--radius-card, 16px); color: var(--text-secondary, #5f5f66) !important; font-size: 14px !important; }

@media (prefers-reduced-motion: reduce) {
  .text-btn:active ion-icon,
  .play-button:active { transform: none; scale: 1; }
}

/* ==========================================
   SKELETON TEXT
========================================== */

.skeleton-text-group {
  display: flex;

  flex-direction: column;

  gap: 8px;
}

.skeleton-check-list {
  display: flex;

  flex-direction: column;

  gap: 10px;

  margin-top: 15px;

  margin-bottom: 4px;
}

.skeleton-check-item {
  display: flex;

  align-items: center;

  gap: 7px;
}


/* ==========================================
   IMAGE / VIDEO
========================================== */

.about-image-wrapper {
  position: relative;
}

.admin-action-bar {
  position: absolute;

  top: -10px;

  right: 0;

  z-index: 10;
}

.about-image img {
  width: 100%;

  height: 100%;

  object-fit: cover;
}


/* ==========================================
   VIDEO SKELETON
========================================== */

.video-skeleton {
  position: relative;

  width: 100%;

  height: 100%;
}

.video-skeleton-play {
  position: absolute;

  left: 50%;

  top: 50%;

  transform:
    translate(-50%, -50%);
}


/* ==========================================
   VIDEO PLAY BUTTON
========================================== */

/* ==========================================
   EMPTY VIDEO
========================================== */

.video-empty-box {
  text-align: center;

  padding: 15px;

  cursor: pointer;
}

.empty-icon {
  font-size: 24px;

  color: var(--text-secondary, #5F5F66);

  margin-bottom: 4px;
}

/* ==========================================
   VIDEO PLAYER (dalam AppModal)
========================================== */

.player-container {
  aspect-ratio: 16 / 9;
  width: 100%;
  overflow: hidden;
  border-radius: 12px;
  background: #000000;
}

.video-iframe,
.video-native {
  width: 100%;
  height: 100%;
  border: none;
}

/* ==========================================
   FORM ADMIN (dalam AppModal)
========================================== */

.admin-form {
  display: grid;
  gap: 16px;
}

.admin-form label {
  display: block;
  margin-bottom: 6px;
  color: #717178;
  font-size: 12px;
  font-weight: 700;
}

.admin-form input[type="text"],
.admin-form input[type="url"],
.admin-form textarea {
  width: 100%;
  box-sizing: border-box;
  min-height: 44px;
  padding: 11px 12px;
  border: 1px solid #eae7e0;
  border-radius: 12px;
  background: #ffffff;
  color: #252525;
  font: inherit;
  font-size: 14px;
}

.admin-form textarea {
  resize: vertical;
  line-height: 1.5;
}

.source-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.source-tab {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-height: 44px;
  margin: 0;
  border: 1px solid #eae7e0;
  border-radius: 12px;
  background: #ffffff;
  color: #717178;
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.source-tab.active-youtube {
  border-color: #d94b45;
  background: #fbe7e6;
  color: #a8322d;
}

.source-tab.active-upload {
  border-color: #355a2c;
  background: #e8eee4;
  color: #355a2c;
}

.upload-dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 16px;
  border: 2px dashed #d5d0c4;
  border-radius: 12px;
  background: #faf9f6;
  text-align: center;
  cursor: pointer;
}

.drop-icon {
  margin-bottom: 4px;
  color: #717178;
  font-size: 22px;
}

.drop-text {
  color: #252525;
  font-size: 13px;
  font-weight: 700;
  word-break: break-all;
}

.drop-hint {
  margin-top: 2px;
  color: #8a8a90;
  font-size: 11px;
}

.helper-success {
  display: block;
  margin-top: 4px;
  color: #355a2c;
  font-size: 12px;
  font-weight: 700;
}

.thumbnail-preview {
  height: 120px;
  margin-top: 8px;
  overflow: hidden;
  border: 1px solid #eae7e0;
  border-radius: 12px;
}

.thumbnail-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

</style>