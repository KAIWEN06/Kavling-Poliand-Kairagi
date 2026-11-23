<template>
  <section class="cms-panel" :aria-labelledby="`crud-${type}`">
    <header class="panel-head">
      <div>
        <h2 :id="`crud-${type}`">{{ meta.title }}</h2>
        <p>{{ meta.description }}</p>
      </div>
      <button class="btn btn-primary" type="button" @click="openNew">{{ meta.addLabel }}</button>
    </header>

    <p v-if="loading" class="state" role="status">Memuat data…</p>
    <p v-else-if="loadError" class="state" role="alert">
      {{ loadError }} <button class="btn btn-ghost" type="button" @click="load">Coba lagi</button>
    </p>
    <p v-else-if="!items.length" class="empty">{{ meta.empty }}</p>

    <ul v-else class="item-list">
      <li v-for="item in items" :key="item.id" class="item" :class="{ off: item.is_active === false }">
        <img v-if="item.image_url" :src="item.image_url" :alt="`Foto ${itemTitle(item)}`" class="thumb" width="72" height="72" loading="lazy">
        <div v-else-if="type !== 'faq'" class="thumb thumb-empty" aria-hidden="true">Tanpa foto</div>
        <div class="item-body">
          <strong>{{ itemTitle(item) }}</strong>
          <p>{{ itemSummary(item) }}</p>
          <span class="badge" :class="item.is_active === false ? 'badge-off' : 'badge-on'">{{ item.is_active === false ? 'Disembunyikan' : 'Tampil di website' }}</span>
        </div>
        <div class="item-actions">
          <button class="btn btn-secondary" type="button" @click="edit(item)">Edit</button>
          <button class="btn btn-danger" type="button" :disabled="removingId === item.id" @click="remove(item)">{{ removingId === item.id ? 'Menghapus…' : 'Hapus' }}</button>
        </div>
      </li>
    </ul>

    <AppModal v-model="open" :title="(editing ? 'Edit ' : 'Tambah ') + meta.noun" :loading="saving" :confirm-disabled="saving" @confirm="save">
      <div class="fields">
        <label class="field wide">{{ type === 'faq' ? 'Pertanyaan' : 'Judul' }} *
          <input v-model="form.title" maxlength="140">
        </label>
        <label v-if="type === 'gallery'" class="field">Kategori
          <input v-model="form.category" maxlength="40" placeholder="Umum">
        </label>
        <template v-if="type === 'progress'">
          <label class="field">Tanggal update *
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
          <span>Tampilkan di website</span>
        </label>
      </div>
      <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import { galleryService } from '@/services/galleryService'
import { progressService } from '@/services/progressService'
import { faqService } from '@/services/faqService'

type CrudType = 'gallery' | 'progress' | 'faq'
const props = defineProps<{ type: CrudType }>()
const emit = defineEmits<{ notify: [message: string, type?: 'success' | 'error'] }>()

const META: Record<CrudType, { title: string; description: string; addLabel: string; noun: string; empty: string }> = {
  gallery: { title: 'Galeri', description: 'Foto yang tampil di Galeri dan pratinjau galeri Beranda.', addLabel: 'Tambah foto', noun: 'foto galeri', empty: 'Belum ada foto. Tambahkan foto pertama agar Galeri tidak kosong.' },
  progress: { title: 'Kemajuan pembangunan', description: 'Catatan perkembangan yang tampil di halaman Kemajuan dan Beranda.', addLabel: 'Tambah update', noun: 'update kemajuan', empty: 'Belum ada update. Tambahkan update pertama untuk menunjukkan perkembangan kawasan.' },
  faq: { title: 'FAQ', description: 'Pertanyaan umum di bagian FAQ pada Beranda.', addLabel: 'Tambah pertanyaan', noun: 'pertanyaan', empty: 'Belum ada FAQ. Tambahkan pertanyaan yang sering diajukan calon pembeli.' },
}
const meta = computed(() => META[props.type])

const MAX_IMAGE_BYTES = 5 * 1024 * 1024
const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp']
const today = () => new Date().toISOString().slice(0, 10)
const blankForm = () => ({ title: '', description: '', category: 'Umum', image_url: '', progress_date: today(), percentage: 0, sort_order: 0, is_active: true })

const items = ref<any[]>([])
const loading = ref(true)
const loadError = ref('')
const saving = ref(false)
const removingId = ref<string | null>(null)
const open = ref(false)
const editing = ref<any>(null)
const file = ref<File | null>(null)
const localPreview = ref('')
const formError = ref('')
const form = reactive(blankForm())

const previewSrc = computed(() => localPreview.value || form.image_url || '')

const itemTitle = (item: any) => item.title || item.question || 'Tanpa judul'
function itemSummary(item: any) {
  if (props.type === 'faq') return item.answer || ''
  if (props.type === 'progress') return `${Math.round(Number(item.percentage) || 0)}% selesai${item.progress_date ? ` · ${item.progress_date}` : ''}`
  return [item.category, item.description].filter(Boolean).join(' · ')
}

function notify(message: string, type: 'success' | 'error' = 'success') { emit('notify', message, type) }

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    items.value = props.type === 'gallery' ? await galleryService.getGallery(false)
      : props.type === 'progress' ? await progressService.getProgress(true)
      : await faqService.getFaqs(false)
  } catch (error) {
    loadError.value = error instanceof Error ? error.message : 'Data gagal dimuat.'
  } finally {
    loading.value = false
  }
}

function resetPreview() {
  if (localPreview.value) URL.revokeObjectURL(localPreview.value)
  localPreview.value = ''
  file.value = null
}

function openNew() {
  editing.value = null
  resetPreview()
  Object.assign(form, blankForm(), { sort_order: items.value.length })
  formError.value = ''
  open.value = true
}

function edit(item: any) {
  editing.value = item
  resetPreview()
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
  formError.value = ''
  open.value = true
}

function selectFile(event: Event) {
  const picked = (event.target as HTMLInputElement).files?.[0]
  if (!picked) return
  if (!IMAGE_TYPES.includes(picked.type)) { formError.value = 'Format foto harus JPG, PNG, atau WEBP.'; return }
  if (picked.size > MAX_IMAGE_BYTES) { formError.value = 'Ukuran foto maksimal 5 MB.'; return }
  formError.value = ''
  resetPreview()
  file.value = picked
  localPreview.value = URL.createObjectURL(picked)
}

function validate(): string {
  if (!form.title.trim()) return props.type === 'faq' ? 'Pertanyaan wajib diisi.' : 'Judul wajib diisi.'
  if (props.type === 'faq' && !form.description.trim()) return 'Jawaban wajib diisi.'
  if (props.type === 'gallery' && !file.value && !form.image_url) return 'Pilih foto untuk galeri.'
  if (props.type === 'progress' && !form.progress_date) return 'Tanggal update wajib diisi.'
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
    const id = editing.value?.id
    if (props.type === 'gallery') id ? await galleryService.updateGallery(id, payload as any) : await galleryService.createGallery(payload as any)
    else if (props.type === 'progress') id ? await progressService.updateProgress(id, payload as any) : await progressService.createProgress(payload as any)
    else id ? await faqService.updateFaq(id, payload as any) : await faqService.createFaq(payload as any)
    open.value = false
    resetPreview()
    notify('Tersimpan dan langsung tampil di website.')
    await load()
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Data gagal disimpan.'
  } finally {
    saving.value = false
  }
}

async function remove(item: any) {
  if (!confirm(`Hapus "${itemTitle(item)}"? Tindakan ini tidak bisa dibatalkan.`)) return
  removingId.value = item.id
  try {
    if (props.type === 'gallery') await galleryService.deleteGallery(item.id, item.image_url)
    else if (props.type === 'progress') await progressService.deleteProgress(item.id, item.image_url)
    else await faqService.deleteFaq(item.id)
    notify('Data dihapus.')
    await load()
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Data gagal dihapus.', 'error')
  } finally {
    removingId.value = null
  }
}

onMounted(load)
onBeforeUnmount(resetPreview)
</script>

<style scoped src="./cmsPanel.css"></style>
<style scoped>
.item-list { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.item { display: flex; align-items: center; gap: 14px; padding: 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); }
.item.off { background: var(--surface-muted); }
.thumb { flex: none; inline-size: 72px; block-size: 72px; border-radius: 10px; object-fit: cover; background: var(--surface-muted); }
.thumb-empty { display: grid; place-items: center; color: var(--text-secondary); font-size: 10px; text-align: center; }
.item-body { flex: 1; min-width: 0; display: grid; gap: 4px; justify-items: start; }
.item-body strong { font-size: 14px; }
.item-body p { margin: 0; color: var(--text-secondary); font-size: 12px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.badge { padding: 2px 9px; border-radius: 99px; font-size: 11px; font-weight: 700; }
.badge-on { background: var(--status-success-bg); color: var(--poliland-green); }
.badge-off { background: var(--surface-muted); color: var(--text-secondary); border: 1px solid var(--border-default); }
.item-actions { display: flex; gap: 8px; }
.preview { inline-size: 100%; max-block-size: 200px; object-fit: cover; border-radius: var(--radius-control); }
.form-error { margin: 14px 0 0; padding: 10px 12px; border-radius: var(--radius-control); background: #fff0ef; color: var(--status-danger); font-size: 13px; }
@media (max-width: 720px) {
  .item { flex-wrap: wrap; }
  .item-actions { inline-size: 100%; }
  .item-actions .btn { flex: 1; }
}
</style>
