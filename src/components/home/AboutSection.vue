<template>
  <section class="section about-section">
    <div class="section-heading simple-heading">
      <div v-if="loading" class="skeleton-heading">
        <Skeleton
          width="78px"
          height="10px"
          border-radius="5px"
        />

        <Skeleton
          width="125px"
          height="24px"
          border-radius="6px"
        />

        <Skeleton
          width="34px"
          height="3px"
          border-radius="999px"
        />
      </div>

      <div v-else>
        <span class="eyebrow">TENTANG POLILAND</span>
        <h2>Tentang Kami</h2>
        <span class="heading-line"></span>
      </div>
    </div>

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
          <p>
            {{
              videoData?.description ||
              'PoliLand Kairagi hadir untuk memberikan solusi investasi tanah yang aman, nyaman, dan menguntungkan. Kami berkomitmen untuk menghadirkan kawasan hunian dan investasi terbaik di Manado.'
            }}
          </p>

          <div class="check-list">
            <div>
              <ion-icon :icon="checkmarkCircleOutline" />
              <span>Kawasan berkembang dan potensial</span>
            </div>

            <div>
              <ion-icon :icon="checkmarkCircleOutline" />
              <span>Infrastruktur lengkap dan akses mudah</span>
            </div>

            <div>
              <ion-icon :icon="checkmarkCircleOutline" />
              <span>Dikelola secara profesional dan terpercaya</span>
            </div>
          </div>

          <ion-button
            class="text-button"
            fill="clear"
            @click="handleSeeAll"
          >
            Selengkapnya Tentang Kami

            <ion-icon
              slot="end"
              :icon="arrowForwardOutline"
            />
          </ion-button>
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
              alt="Thumbnail Video Profil"
            />

            <button
              class="play-button"
              @click="handlePlayVideo"
            >
              <ion-icon :icon="play" />
            </button>
          </template>

          <!-- EMPTY -->
          <div
            v-else
            class="video-empty-box"
            @click="isAdmin ? handleOpenModal() : null"
          >
            <ion-icon
              :icon="videocamOffOutline"
              class="empty-icon"
            />

            <p>Video Belum Diatur</p>
          </div>

        </div>
      </div>
    </div>

    <!-- ==========================================
         VIDEO PLAYER MODAL
    =========================================== -->
    <div
      v-if="isVideoOpen && videoData?.video_url"
      class="modal-backdrop"
    >
      <div class="modal-content-wrapper">

        <button
          class="modal-close-btn"
          @click="handleCloseVideo"
        >
          <ion-icon :icon="closeOutline" />
        </button>

        <div class="player-container">

          <iframe
            v-if="isYouTubeUrl(videoData.video_url)"
            :src="getYouTubeEmbedUrl(videoData.video_url) || ''"
            :title="videoData.title"
            class="video-iframe"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            allowfullscreen
          />

          <video
            v-else
            :src="videoData.video_url"
            controls
            autoplay
            class="video-native"
          />

        </div>
      </div>
    </div>

    <!-- ==========================================
         ADMIN MODAL FORM
    =========================================== -->
    <div
      v-if="isModalOpen"
      class="modal-backdrop"
    >
      <div class="admin-modal-card">

        <div class="admin-modal-header">
          <h3>Kelola Video Profil Utama</h3>

          <button
            @click="isModalOpen = false"
            :disabled="saving"
            class="close-icon-btn"
          >
            <ion-icon :icon="closeOutline" />
          </button>
        </div>

        <div
          v-if="message.text"
          :class="['alert-box', message.type]"
        >
          {{ message.text }}
        </div>

        <form
          @submit.prevent="handleSubmit"
          class="admin-form"
        >

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
                Upload
              </button>

            </div>
          </div>

          <!-- YOUTUBE -->
          <div
            v-if="videoSource === 'youtube'"
            class="form-group"
          >
            <label>Link YouTube</label>

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
            <label>Thumbnail</label>

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
                    : 'Upload thumbnail opsional'
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
                alt="Preview Thumbnail"
              />
            </div>
          </div>

          <!-- FORM ACTION -->
          <div class="form-actions">

            <button
              type="button"
              @click="isModalOpen = false"
              :disabled="saving"
              class="btn-cancel"
            >
              Batal
            </button>

            <button
              type="submit"
              :disabled="saving"
              class="btn-save"
            >
              <ion-spinner
                v-if="saving"
                name="crescent"
                style="
                  width: 16px;
                  height: 16px;
                  margin-right: 6px;
                "
              />

              <span>
                {{ saving ? 'Menyimpan...' : 'Simpan' }}
              </span>
            </button>

          </div>

        </form>
      </div>
    </div>
  </section>
</template>


<script setup lang="ts">

import {
  ref,
  computed,
  onMounted,
  onUnmounted
} from 'vue'

import {
  IonButton,
  IonIcon,
  IonSpinner
} from '@ionic/vue'

import Skeleton from '@/components/ui/Skeleton.vue'

import {
  checkmarkCircleOutline,
  arrowForwardOutline,
  play,
  settingsOutline,
  videocamOffOutline,
  closeOutline,
  cloudUploadOutline,
  videocamOutline,
  imageOutline
} from 'ionicons/icons'

import {
  supabase
} from '@/services/config/supabase'

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

const videoData = ref<VideoItem | null>(null)

const isAdmin = ref(false)

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


    // ========================================
    // CHECK ADMIN
    // ========================================

    const {
      data: sessionData
    } = await supabase.auth.getSession()

    const session = sessionData?.session

    if (session) {

      const {
        data: profile
      } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (
        profile &&
        (
          profile.role === 'admin' ||
          profile.role === 'superadmin'
        )
      ) {

        isAdmin.value = true

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


// ==========================================
// LIFECYCLE
// ==========================================

onMounted(() => {
  fetchData()
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
    videoData.value?.thumbnail_url ||

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

  // Aksi ketika tombol selengkapnya diklik

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
        'Thumbnail harus JPG, JPEG, PNG, atau WEBP.',
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
        'Ukuran thumbnail maksimal 5 MB.',
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

    message.value = {
      text:
        'Video berhasil disimpan!',
      type: 'success'
    }


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


const handleCloseVideo = () => {

  isVideoOpen.value = false

}

</script>


<style scoped>

/* ==========================================
   SECTION
========================================== */

.section {
  padding: 30px 16px 0;
}

.section-heading h2 {
  margin: 0;

  color: #1e293b;

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

.about-section {
  padding-top: 35px;
}

.simple-heading {
  margin-bottom: 15px;
}

.skeleton-heading {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  gap: 6px;
}

.eyebrow {
  display: block;

  margin-bottom: 6px;

  color: #556B2F;

  font-size: 9px;

  font-weight: 800;

  letter-spacing: 1px;
}


/* ==========================================
   ABOUT CONTENT
========================================== */

.about-content {
  display: flex;

  flex-direction: column;

  gap: 18px;
}

.about-text p {
  margin: 0;

  color: #475569;

  font-size: 12px;

  line-height: 1.7;
}

.check-list {
  display: flex;

  flex-direction: column;

  gap: 9px;

  margin-top: 15px;
}

.check-list div {
  display: flex;

  align-items: center;

  gap: 7px;

  color: #334155;

  font-size: 10px;

  font-weight: 600;
}

.check-list ion-icon {
  color: #556B2F;

  font-size: 15px;
}

.text-button {
  margin: 12px 0 0;

  --color: #556B2F;

  --padding-start: 0;

  --padding-end: 0;

  font-size: 10px;

  font-weight: 700;
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

.admin-edit-btn {
  display: inline-flex;

  align-items: center;

  gap: 4px;

  padding: 5px 10px;

  background: #556B2F;

  color: #ffffff;

  border-radius: 8px;

  font-size: 9px;

  font-weight: 700;

  border: none;

  box-shadow:
    0 4px 10px
    rgba(85, 107, 47, 0.3);
}

.about-image {
  position: relative;

  aspect-ratio: 16 / 9;

  overflow: hidden;

  border-radius: 15px;

  box-shadow:
    0 8px 22px
    rgba(15, 23, 42, 0.12);

  background: #f1f5f9;

  display: flex;

  align-items: center;

  justify-content: center;

  border: 1px solid #e2e8f0;
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

.play-button {
  position: absolute;

  left: 50%;

  top: 50%;

  transform:
    translate(-50%, -50%);

  width: 48px;

  height: 48px;

  border: 0;

  border-radius: 50%;

  background:
    rgba(255, 255, 255, 0.94);

  color: #556B2F;

  display: flex;

  align-items: center;

  justify-content: center;

  font-size: 20px;

  cursor: pointer;

  box-shadow:
    0 4px 12px
    rgba(0, 0, 0, 0.2);
}


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

  color: #94a3b8;

  margin-bottom: 4px;
}

.video-empty-box p {
  margin: 0;

  font-size: 10px;

  font-weight: 600;

  color: #64748b;
}


/* ==========================================
   MODAL VIDEO PLAYER
========================================== */

.modal-backdrop {
  position: fixed;

  inset: 0;

  z-index: 1000;

  background:
    rgba(0, 0, 0, 0.8);

  display: flex;

  align-items: center;

  justify-content: center;

  padding: 16px;
}

.modal-content-wrapper {
  position: relative;

  width: 100%;

  max-width: 600px;
}

.modal-close-btn {
  position: absolute;

  top: -36px;

  right: 0;

  background: transparent;

  border: none;

  color: #ffffff;

  font-size: 24px;

  cursor: pointer;
}

.player-container {
  aspect-ratio: 16 / 9;

  background: #000000;

  border-radius: 12px;

  overflow: hidden;

  width: 100%;
}

.video-iframe,
.video-native {
  width: 100%;

  height: 100%;

  border: none;
}


/* ==========================================
   ADMIN MODAL
========================================== */

.admin-modal-card {
  background: #ffffff;

  border-radius: 16px;

  width: 100%;

  max-width: 450px;

  max-height: 90vh;

  overflow-y: auto;

  padding: 18px;

  box-shadow:
    0 20px 25px -5px
    rgba(0, 0, 0, 0.1);
}

.admin-modal-header {
  display: flex;

  justify-content: space-between;

  align-items: center;

  border-bottom:
    1px solid #f1f5f9;

  padding-bottom: 10px;

  margin-bottom: 14px;
}

.admin-modal-header h3 {
  margin: 0;

  font-size: 13px;

  font-weight: 800;

  color: #1e293b;
}

.close-icon-btn {
  background: transparent;

  border: none;

  font-size: 18px;

  color: #64748b;

  cursor: pointer;
}


/* ==========================================
   ALERT
========================================== */

.alert-box {
  padding: 8px 10px;

  border-radius: 8px;

  font-size: 10px;

  font-weight: 600;

  margin-bottom: 12px;
}

.alert-box.success {
  background: #ecfdf5;

  color: #059669;

  border:
    1px solid #a7f3d0;
}

.alert-box.error {
  background: #fef2f2;

  color: #dc2626;

  border:
    1px solid #fecaca;
}


/* ==========================================
   FORM
========================================== */

.admin-form .form-group {
  margin-bottom: 12px;
}

.admin-form label {
  display: block;

  font-size: 10px;

  font-weight: 700;

  color: #334155;

  margin-bottom: 5px;
}

.admin-form input[type="text"],
.admin-form input[type="url"],
.admin-form textarea {
  width: 100%;

  padding: 7px 9px;

  font-size: 11px;

  border:
    1px solid #cbd5e1;

  border-radius: 8px;

  outline: none;

  background: #f8fafc;

  color: #1e293b;
}

.admin-form textarea {
  resize: none;
}


/* ==========================================
   VIDEO SOURCE
========================================== */

.source-grid {
  display: grid;

  grid-template-columns:
    repeat(2, 1fr);

  gap: 8px;
}

.source-tab {
  display: flex;

  align-items: center;

  justify-content: center;

  gap: 6px;

  padding: 8px;

  border-radius: 8px;

  border:
    1px solid #cbd5e1;

  background: #ffffff;

  font-size: 10px;

  font-weight: 700;

  color: #64748b;

  cursor: pointer;
}

.source-tab.active-youtube {
  border-color: #ef4444;

  background: #fef2f2;

  color: #dc2626;
}

.source-tab.active-upload {
  border-color: #556B2F;

  background: #f4f7f0;

  color: #556B2F;
}


/* ==========================================
   UPLOAD
========================================== */

.upload-dropzone {
  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  padding: 14px;

  border:
    2px dashed #cbd5e1;

  border-radius: 10px;

  background: #f8fafc;

  cursor: pointer;

  text-align: center;
}

.drop-icon {
  font-size: 20px;

  color: #64748b;

  margin-bottom: 4px;
}

.drop-text {
  font-size: 10px;

  font-weight: 700;

  color: #334155;
}

.drop-hint {
  font-size: 9px;

  color: #94a3b8;

  margin-top: 2px;
}


/* ==========================================
   THUMBNAIL
========================================== */

.helper-success {
  display: block;

  font-size: 9px;

  font-weight: 700;

  color: #059669;

  margin-top: 4px;
}

.thumbnail-preview {
  margin-top: 6px;

  border-radius: 8px;

  overflow: hidden;

  border:
    1px solid #cbd5e1;

  height: 90px;
}

.thumbnail-preview img {
  width: 100%;

  height: 100%;

  object-fit: cover;
}


/* ==========================================
   FORM ACTIONS
========================================== */

.form-actions {
  display: flex;

  justify-content: flex-end;

  gap: 8px;

  border-top:
    1px solid #f1f5f9;

  padding-top: 12px;

  margin-top: 14px;
}

.btn-cancel {
  padding: 7px 12px;

  background: #f1f5f9;

  color: #64748b;

  border-radius: 8px;

  font-size: 10px;

  font-weight: 700;

  border: none;

  cursor: pointer;
}

.btn-save {
  display: inline-flex;

  align-items: center;

  justify-content: center;

  padding: 7px 14px;

  background: #556B2F;

  color: #ffffff;

  border-radius: 8px;

  font-size: 10px;

  font-weight: 700;

  border: none;

  cursor: pointer;
}

</style>