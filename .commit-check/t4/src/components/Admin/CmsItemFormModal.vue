<template>
  <AppModal
    :model-value="modelValue"
    :title="(item ? 'Ubah ' : 'Tambah ') + noun"
    :loading="saving"
    :confirm-disabled="saving"
    @update:model-value="$emit('update:modelValue', $event)"
    @confirm="save"
  >
    <div class="fields">
      <label class="field wide">{{ type === 'faq' ? 'Pertanyaan' : 'Judul' }} *
        <input v-model="form.title" maxlength="140">
      </label>
      <label v-if="type === 'gallery'" class="field">Kategori
        <input v-model="form.category" maxlength="40" placeholder="Umum">
      </label>
      <template v-if="type === 'progress'">
        <label class="field">Tanggal kabar *
          <input v-model="form.progress_date" type="date">
        </label>
        <label class="field">Persentase selesai (0–100)
          <input v-model.number="form.percentage" type="number" min="0" max="100" inputmode="numeric">
        </label>
      </template>
      <label class="field wide">{{ type === 'faq' ? 'Jawaban *' : 'Deskripsi' }}
        <textarea v-model="form.description" rows="4" maxlength="800"></textarea>
      </label>
      <div v-if="type !== 'faq'" class="field wide">
        <span>Foto{{ type === 'gallery' ? ' *' : '' }}</span>
        <img v-if="previewSrc" :src="previewSrc" alt="Pratinjau foto" class="preview" width="480" height="270">
        <input type="file" accept="image/jpeg,image/png,image/webp" aria-label="Pilih foto" @change="selectFile">
        <span class="hint">JPG, PNG, atau WEBP. Maksimal 5 MB.</span>
      </div>
      <label class="field">Urutan tampil
        <input v-model.number="form.sort_order" type="number" min="0" inputmode="numeric">
      </label>
      <label class="switch">
        <input v-model="form.is_active" type="checkbox">
        <span>Tampilkan di situs web</span>
      </label>
    </div>
    <AppNotice v-if="formError" tone="error">
      {{ formError }}
    </AppNotice>
  </AppModal>
</template>

<script setup lang="ts">
import AppNotice from '@/components/ui/AppNotice.vue'
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import { galleryService } from '@/services/galleryService'
import { progressService } from '@/services/progressService'
import { faqService } from '@/services/faqService'

export type CmsItemType = 'gallery' | 'progress' | 'faq'

const props = defineProps<{
  modelValue: boolean
  type: CmsItemType
  /** Data yang diedit. `null` berarti menambah data baru. */
  item?: any | null
  /** Jumlah data saat ini, dipakai sebagai urutan tampil awal data baru. */
  count?: number
}>()
const emit = defineEmits<{ 'update:modelValue': [value: boolean]; saved: [message: string] }>()

const NOUN: Record<CmsItemType, string> = { gallery: 'foto galeri', progress: 'kabar kemajuan', faq: 'pertanyaan' }
const noun = computed(() => NOUN[props.type])

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const today = () => new Date().toISOString().slice(0, 10)
const blankForm = () => ({ title: '', description: '', category: 'Umum', image_url: '', progress_date: today(), percentage: 0, sort_order: 0, is_active: true })

const saving = ref(false)
const file = ref<File | null>(null)
const localPreview = ref('')
const formError = ref('')
const form = reactive(blankForm())
const previewSrc = computed(() => localPreview.value || form.image_url || '')

function resetPreview() {
  if (localPreview.value) URL.revokeObjectURL(localPreview.value)
  localPreview.value = ''
  file.value = null
}

function fill() {
  resetPreview()
  formError.value = ''
  const item = props.item
  if (!item) {
    Object.assign(form, blankForm(), { sort_order: props.count ?? 0 })
    return
  }
  Object.assign(form, blankForm(), {
    title: item.title || item.question || '',
    description: item.description || item.answer || '',
    category: item.category || 'Umum',
    image_url: item.image_url || '',
    progress_date: item.progress_date || today(),
    percentage: Number(item.percentage) || 0,
    sort_order: item.sort_order ?? 0,
    is_active: item.is_active !== false,
  })
}

watch(() => props.modelValue, (open) => { if (open) fill() }, { immediate: true })

function selectFile(event: Event) {
  const input = event.target as HTMLInputElement
  const picked = input.files?.[0]
  if (!picked) return
  if (!IMAGE_TYPES.includes(picked.type)) { formError.value = 'Format foto harus JPG, PNG, atau WEBP.'; input.value = ''; return }
  if (picked.size > MAX_IMAGE_BYTES) { formError.value = 'Ukuran foto maksimal 5 MB.'; input.value = ''; return }
  formError.value = ''
  resetPreview()
  file.value = picked
  localPreview.value = URL.createObjectURL(picked)
}

function validate(): string {
  if (!form.title.trim()) return props.type === 'faq' ? 'Pertanyaan wajib diisi.' : 'Judul wajib diisi.'
  if (props.type === 'faq' && !form.description.trim()) return 'Jawaban wajib diisi.'
  if (props.type === 'gallery' && !file.value && !form.image_url) return 'Pilih foto untuk galeri.'
  if (props.type === 'progress' && !form.progress_date) return 'Tanggal kabar wajib diisi.'
  if (props.type === 'progress' && (form.percentage < 0 || form.percentage > 100)) return 'Persentase harus antara 0 dan 100.'
  return ''
}

/** Hanya kirim kolom yang benar-benar ada di tabel masing-masing. */
async function buildPayload(): Promise<Record<string, unknown>> {
  const base = { sort_order: Number(form.sort_order) || 0, is_active: form.is_active }
  if (props.type === 'faq') return { question: form.title.trim(), answer: form.description.trim(), ...base }
  if (props.type === 'gallery') {
    const imageUrl = file.value ? (await galleryService.uploadImage(file.value)).url : form.image_url
    return { title: form.title.trim(), description: form.description.trim(), category: form.category.trim() || 'Umum', image_url: imageUrl, ...base }
  }
  const imageUrl = file.value ? await progressService.uploadImage(file.value) : form.image_url
  const percentage = Math.min(100, Math.max(0, Number(form.percentage) || 0))
  const status = percentage >= 100 ? 'completed' : percentage <= 0 ? 'planned' : 'ongoing'
  return { title: form.title.trim(), description: form.description.trim(), progress_date: form.progress_date, percentage, status, image_url: imageUrl || null, ...base }
}

async function save() {
  formError.value = validate()
  if (formError.value) return
  saving.value = true
  try {
    const payload = await buildPayload()
    const id = props.item?.id
    if (props.type === 'gallery') id ? await galleryService.updateGallery(id, payload as any) : await galleryService.createGallery(payload as any)
    else if (props.type === 'progress') id ? await progressService.updateProgress(id, payload as any) : await progressService.createProgress(payload as any)
    else id ? await faqService.updateFaq(id, payload as any) : await faqService.createFaq(payload as any)
    resetPreview()
    emit('update:modelValue', false)
    emit('saved', 'Tersimpan dan langsung tampil di situs web.')
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Data gagal disimpan.'
  } finally {
    saving.value = false
  }
}

onBeforeUnmount(resetPreview)
</script>

<style scoped src="./cmsPanel.css"></style>
<style scoped>
.preview { inline-size: 100%; max-block-size: 200px; object-fit: cover; border-radius: var(--radius-control); }

</style>
