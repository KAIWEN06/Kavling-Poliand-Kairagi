<template>
  <form class="form" novalidate @submit.prevent="submit">
    <!-- Rating -->
    <div class="field">
      <div class="rating-row">
        <StarRating v-model="rating" :size="24" label="Penilaian ulasan" />
        <span class="rating-label" aria-live="polite">
          {{ rating ? `${rating.toFixed(1)} dari 5` : 'Pilih penilaian' }}
        </span>
      </div>
      <p v-if="errors.rating" class="error" role="alert">{{ errors.rating }}</p>
    </div>

    <!-- Judul -->
    <div class="field">
      <label for="review-title">Judul ulasan</label>
      <input
        id="review-title"
        v-model="title"
        type="text"
        :maxlength="REVIEW_LIMITS.titleMax"
        placeholder="Ringkas pengalaman Anda"
        autocomplete="off"
        :aria-invalid="!!errors.title"
      />
      <p v-if="errors.title" class="error" role="alert">{{ errors.title }}</p>
    </div>

    <!-- Detail -->
    <div class="field">
      <label for="review-content">Detail</label>
      <textarea
        id="review-content"
        v-model="content"
        rows="6"
        :maxlength="REVIEW_LIMITS.contentMax"
        placeholder="Ceritakan proses, pelayanan, dan hal yang paling berkesan"
        :aria-invalid="!!errors.content"
      />
      <p class="hint">{{ content.length }}/{{ REVIEW_LIMITS.contentMax }}</p>
      <p v-if="errors.content" class="error" role="alert">{{ errors.content }}</p>
    </div>

    <!-- Foto -->
    <p v-if="review" class="hint">
      Foto tidak dapat diubah pada ulasan yang sudah dikirim. Hapus ulasan lalu kirim ulang jika ingin mengganti foto.
    </p>
    <div v-else class="field">
      <span class="label">Foto pendukung (opsional)</span>
      <label
        class="dropzone"
        :class="{ 'dropzone--over': dragging }"
        for="review-photos-input"
        @dragover.prevent="dragging = true"
        @dragleave.prevent="dragging = false"
        @drop.prevent="onDrop"
      >
        <ion-icon :icon="cloudUploadOutline" aria-hidden="true" />
        <span class="drop-title"><strong>Klik untuk unggah</strong> atau seret dan lepas</span>
        <span class="hint">JPG, PNG, atau WebP. Maksimal {{ REVIEW_LIMITS.maxPhotos }} foto, 3 MB per foto.</span>
        <input
          id="review-photos-input"
          class="sr-only"
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          @change="onPick"
        />
      </label>
      <p v-if="errors.photos" class="error" role="alert">{{ errors.photos }}</p>
      <ul v-if="previews.length" class="previews">
        <li v-for="(p, i) in previews" :key="p.url">
          <img :src="p.url" :alt="`Pratinjau foto ${i + 1}`" />
          <button type="button" class="remove" :aria-label="`Hapus foto ${i + 1}`" @click="removePhoto(i)">
            <ion-icon :icon="closeOutline" aria-hidden="true" />
          </button>
        </li>
      </ul>
    </div>

    <!-- Rekomendasi -->
    <fieldset class="field fieldset">
      <legend>Apakah Anda merekomendasikan PoliLand Kairagi?</legend>
      <div class="radios">
        <label class="radio"><input v-model="recommend" type="radio" name="review-recommend" :value="true" /> Ya</label>
        <label class="radio"><input v-model="recommend" type="radio" name="review-recommend" :value="false" /> Tidak</label>
      </div>
      <p v-if="errors.recommend" class="error" role="alert">{{ errors.recommend }}</p>
    </fieldset>

    <!-- Persetujuan -->
    <div class="field">
      <label class="check">
        <input v-model="agreed" type="checkbox" />
        <span>
          Saya menyetujui <strong class="terms">ketentuan pengiriman ulasan</strong>: ulasan diperiksa Admin
          sebelum ditampilkan, ditulis sesuai pengalaman nyata, dan tidak memuat data pribadi atau tautan promosi.
        </span>
      </label>
      <p v-if="errors.agreed" class="error" role="alert">{{ errors.agreed }}</p>
    </div>

    <AppNotice v-if="submitError" tone="error">
      {{ submitError }}
    </AppNotice>

    <div class="actions">
      <button type="submit" class="btn btn--primary" :disabled="submitting">
        {{ submitting ? (review ? 'Menyimpan…' : 'Mengirim…') : (review ? 'Simpan Perubahan' : 'Kirim Ulasan') }}
      </button>
      <button type="button" class="btn btn--neutral" :disabled="submitting" @click="$emit('close')">Tutup</button>
    </div>
  </form>
</template>

<script setup lang="ts">
import AppNotice from '@/components/ui/AppNotice.vue'
import { onBeforeUnmount, reactive, ref, watch } from 'vue'
import { IonIcon } from '@ionic/vue'
import { closeOutline, cloudUploadOutline } from 'ionicons/icons'
import StarRating from '@/components/reviews/StarRating.vue'
import type { OwnReview } from '@/types/review'
import {
  REVIEW_LIMITS,
  reviewErrorMessage,
  reviewService,
  validateReviewPhoto,
} from '@/services/reviewService'

const props = defineProps<{ initialRating?: number; review?: OwnReview }>()
const emit = defineEmits<{ submitted: [mode: 'create' | 'edit']; close: [] }>()

const rating = ref(props.review?.rating ?? props.initialRating ?? 0)
const title = ref(props.review?.title ?? '')
const content = ref(props.review?.content ?? '')
const recommend = ref<boolean | null>(props.review?.recommend ?? null)
// Pada mode ubah, persetujuan sudah diberikan saat ulasan pertama dikirim.
const agreed = ref(!!props.review)
const photos = ref<File[]>([])
const previews = ref<{ url: string }[]>([])
const dragging = ref(false)
const submitting = ref(false)
const submitError = ref('')
const errors = reactive<Record<string, string>>({})

watch(() => props.initialRating, (v) => { if (v) rating.value = v })

function addFiles(files: FileList | File[]) {
  errors.photos = ''
  for (const file of Array.from(files)) {
    if (photos.value.length >= REVIEW_LIMITS.maxPhotos) {
      errors.photos = `Maksimal ${REVIEW_LIMITS.maxPhotos} foto.`
      break
    }
    const invalid = validateReviewPhoto(file)
    if (invalid) {
      errors.photos = invalid
      continue
    }
    photos.value.push(file)
    previews.value.push({ url: URL.createObjectURL(file) })
  }
}

function onPick(e: Event) {
  const input = e.target as HTMLInputElement
  if (input.files) addFiles(input.files)
  input.value = ''
}

function onDrop(e: DragEvent) {
  dragging.value = false
  if (e.dataTransfer?.files) addFiles(e.dataTransfer.files)
}

function removePhoto(index: number) {
  URL.revokeObjectURL(previews.value[index].url)
  photos.value.splice(index, 1)
  previews.value.splice(index, 1)
  errors.photos = ''
}

function validate(): boolean {
  Object.keys(errors).forEach((k) => delete errors[k])
  const t = title.value.trim()
  const c = content.value.trim()
  if (!rating.value) errors.rating = 'Rating wajib dipilih.'
  if (!t) errors.title = 'Judul wajib diisi.'
  else if (t.length < REVIEW_LIMITS.titleMin) errors.title = `Judul minimal ${REVIEW_LIMITS.titleMin} karakter.`
  if (!c) errors.content = 'Isi ulasan wajib diisi.'
  else if (c.length < REVIEW_LIMITS.contentMin) errors.content = `Isi ulasan minimal ${REVIEW_LIMITS.contentMin} karakter.`
  if (recommend.value === null) errors.recommend = 'Pilih Ya atau Tidak.'
  if (!agreed.value) errors.agreed = 'Anda harus menyetujui ketentuan pengiriman ulasan.'
  return Object.keys(errors).length === 0
}

async function submit() {
  if (submitting.value) return
  submitError.value = ''
  if (!validate()) return

  submitting.value = true
  try {
    if (props.review) {
      await reviewService.updateOwn(props.review.id, {
        rating: rating.value,
        title: title.value,
        content: content.value,
        recommend: recommend.value as boolean,
      })
    } else {
      await reviewService.submit({
        rating: rating.value,
        title: title.value,
        content: content.value,
        recommend: recommend.value as boolean,
        photos: photos.value,
      })
    }
    previews.value.forEach((p) => URL.revokeObjectURL(p.url))
    emit('submitted', props.review ? 'edit' : 'create')
  } catch (error) {
    submitError.value = reviewErrorMessage(error, props.review ? 'Perubahan gagal disimpan. Silakan coba lagi.' : 'Ulasan gagal dikirim. Periksa koneksi Anda lalu coba lagi.')
  } finally {
    submitting.value = false
  }
}

onBeforeUnmount(() => previews.value.forEach((p) => URL.revokeObjectURL(p.url)))
</script>

<style scoped>
.form { display: grid; gap: var(--space-4); }
.field { display: grid; gap: 6px; min-width: 0; }

label, .label, legend {
  color: var(--text-primary);
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
}

input[type='text'], textarea {
  width: 100%;
  box-sizing: border-box;
  padding: 10px 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--surface-muted);
  color: var(--text-primary);
  font: inherit;
  font-size: var(--font-size-sm);
}

textarea { resize: vertical; }

input[type='text']:focus, textarea:focus {
  outline: none;
  border-color: var(--poliland-green);
  box-shadow: var(--ring-focus);
}

[aria-invalid='true'] { border-color: var(--status-danger) !important; }

.rating-row { display: flex; align-items: center; gap: var(--space-3); }
.rating-label { color: var(--text-primary); font-size: var(--font-size-lg); font-weight: var(--font-weight-bold); }

.hint { margin: 0; color: var(--text-secondary); font-size: var(--font-size-xs); }
.error { margin: 0; color: var(--danger-text); font-size: var(--font-size-xs); font-weight: var(--font-weight-medium); }

.dropzone {
  display: flex;
  min-height: 208px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: var(--space-4);
  border: 2px dashed var(--border-strong);
  border-radius: var(--radius-sm);
  background: var(--surface-muted);
  color: var(--text-secondary);
  text-align: center;
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease-out), background var(--dur-fast) var(--ease-out);
}

.dropzone ion-icon { font-size: 36px; color: var(--text-tertiary); }
.dropzone--over {
  border-color: var(--poliland-green);
  background: var(--green-50);
}

@media (hover: hover) and (pointer: fine) {
  .dropzone:hover {
    border-color: var(--poliland-green);
    background: var(--green-50);
  }
}
.dropzone:focus-within { box-shadow: var(--ring-focus); }
.drop-title { font-size: var(--font-size-sm); }
.drop-title strong { color: var(--text-primary); }

.previews { display: flex; flex-wrap: wrap; gap: var(--space-2); margin: 0; padding: 0; list-style: none; }
.previews li { position: relative; }
.previews img { display: block; width: 88px; height: 88px; border: 1px solid var(--border-default); border-radius: var(--radius-sm); object-fit: cover; }

.remove {
  position: absolute; top: -8px; right: -8px;
  display: grid; width: 24px; height: 24px; place-items: center;
  border: 1px solid var(--border-default); border-radius: var(--radius-pill);
  background: var(--surface-primary); color: var(--text-primary); cursor: pointer;
}
.remove:focus-visible { outline: none; box-shadow: var(--ring-focus); }

.fieldset { margin: 0; padding: 0; border: 0; }
.radios { display: flex; gap: var(--space-6); }
.radio, .check { display: flex; align-items: flex-start; gap: var(--space-2); font-weight: var(--font-weight-regular); }
.radio { align-items: center; }
.check span { color: var(--text-secondary); font-size: var(--font-size-sm); line-height: 1.5; }
.terms { color: var(--poliland-green); text-decoration: underline; text-underline-offset: 3px; }

input[type='radio'], input[type='checkbox'] { width: 18px; height: 18px; margin: 1px 0 0; accent-color: var(--poliland-green); }

.actions { display: flex; flex-wrap: wrap; gap: var(--space-3); }

.btn {
  padding: 10px 20px;
  border-radius: var(--radius-sm);
  font: inherit;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-medium);
  cursor: pointer;
}
.btn:disabled { opacity: 0.6; cursor: default; }
.btn:focus-visible { outline: none; box-shadow: var(--ring-focus); }
.btn--primary { border: 1px solid var(--poliland-green); background: var(--poliland-green); color: #fff; }
@media (hover: hover) and (pointer: fine) {
  .btn--primary:hover:not(:disabled) { background: var(--green-800); }
}
.btn--neutral { border: 1px solid var(--border-default); background: var(--surface-primary); color: var(--text-primary); }
@media (hover: hover) and (pointer: fine) {
  .btn--neutral:hover:not(:disabled) { background: var(--surface-muted); }
}

.sr-only {
  position: absolute; width: 1px; height: 1px; margin: -1px; padding: 0;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}

@media (prefers-reduced-motion: reduce) { .dropzone { transition: none; } }
</style>
