<template>
  <section class="cms-panel" aria-labelledby="home-title">
    <header class="panel-head">
      <div>
        <h2 id="home-title">Beranda</h2>
        <p>Tiga bagian di halaman utama yang bisa Anda ubah: hero, keunggulan, dan ajakan di bagian bawah.</p>
      </div>
      <button class="btn btn-primary" type="button" :disabled="saving || loading" @click="save">
        {{ saving ? 'Menyimpan…' : 'Simpan perubahan' }}
      </button>
    </header>

    <p v-if="loading" class="state" role="status">Memuat konten beranda…</p>
    <template v-else>
      <section class="block" aria-labelledby="hero-title">
        <div class="block-head">
          <h3 id="hero-title">Hero</h3>
          <label class="switch">
            <input v-model="hero.is_active" type="checkbox">
            <span>{{ hero.is_active ? 'Memakai konten ini' : 'Memakai teks bawaan' }}</span>
          </label>
        </div>
        <div class="fields">
          <label class="field wide">Judul utama
            <input v-model="hero.title" maxlength="90" placeholder="Investasi Tanah Masa Depan Anda">
          </label>
          <label class="field wide">Subjudul
            <input v-model="hero.subtitle" maxlength="120" placeholder="Boleh dikosongkan">
          </label>
          <label class="field wide">Deskripsi
            <textarea v-model="hero.description" rows="3" maxlength="240" placeholder="Satu atau dua kalimat yang menjelaskan kawasan."></textarea>
            <span class="hint">{{ hero.description.length }}/240 karakter</span>
          </label>
          <label class="field">Teks tombol
            <input v-model="hero.cta_text" maxlength="28" placeholder="Hubungi Kami">
          </label>
          <label class="field">Tombol membuka
            <select v-model="ctaPreset">
              <option v-for="option in CTA_PRESETS" :key="option.value" :value="option.value">{{ option.label }}</option>
            </select>
          </label>
          <label v-if="ctaPreset === 'custom'" class="field wide">Alamat tujuan
            <input v-model="customCtaUrl" type="text" inputmode="url" placeholder="https://… atau /nama-halaman">
          </label>
        </div>

        <div class="image-field">
          <div class="image-frame">
            <img v-if="previewSrc" :src="previewSrc" alt="Pratinjau gambar hero" width="640" height="360">
            <p v-else>Memakai gambar bawaan aplikasi</p>
          </div>
          <div class="image-actions">
            <label class="btn btn-secondary file-btn">
              {{ previewSrc ? 'Ganti gambar' : 'Pilih gambar' }}
              <input type="file" accept="image/jpeg,image/png,image/webp" @change="selectImage">
            </label>
            <button v-if="previewSrc" class="btn btn-ghost" type="button" @click="clearImage">Pakai gambar bawaan</button>
            <span class="hint">JPG, PNG, atau WEBP. Maksimal 5 MB. Rasio lebar disarankan.</span>
          </div>
        </div>
      </section>

      <section class="block" aria-labelledby="feat-title">
        <div class="block-head">
          <h3 id="feat-title">Keunggulan</h3>
          <button class="btn btn-secondary" type="button" @click="addFeature">Tambah keunggulan</button>
        </div>
        <p v-if="!features.length" class="empty">Belum ada keunggulan. Beranda menampilkan tiga keunggulan bawaan sampai Anda menambahkan sendiri.</p>
        <ul class="feature-list">
          <li v-for="(feature, index) in features" :key="feature.id || `new-${index}`" class="feature-item" :class="{ off: !feature.is_active }">
            <span class="feature-icon" aria-hidden="true"><ion-icon :icon="resolveCmsIcon(feature.icon)" /></span>
            <div class="feature-fields">
              <label class="field">Judul
                <input v-model="feature.title" maxlength="40" placeholder="Judul keunggulan">
              </label>
              <label class="field">Ikon
                <select v-model="feature.icon">
                  <option v-for="icon in CMS_ICON_OPTIONS" :key="icon.key" :value="icon.key">{{ icon.label }}</option>
                </select>
              </label>
              <label class="field wide">Deskripsi
                <input v-model="feature.description" maxlength="120" placeholder="Satu kalimat singkat">
              </label>
            </div>
            <div class="feature-controls">
              <button class="icon-btn" type="button" :disabled="index === 0" aria-label="Naikkan urutan" @click="moveFeature(index, -1)">↑</button>
              <button class="icon-btn" type="button" :disabled="index === features.length - 1" aria-label="Turunkan urutan" @click="moveFeature(index, 1)">↓</button>
              <label class="switch compact">
                <input v-model="feature.is_active" type="checkbox">
                <span>{{ feature.is_active ? 'Tampil' : 'Disembunyikan' }}</span>
              </label>
              <button class="btn btn-danger" type="button" @click="removeFeature(feature, index)">Hapus</button>
            </div>
          </li>
        </ul>
      </section>

      <section class="block" aria-labelledby="cta-title">
        <div class="block-head"><h3 id="cta-title">Ajakan di bagian bawah</h3></div>
        <div class="fields">
          <label class="field wide">Judul
            <input v-model="cta.title" maxlength="60" :placeholder="CTA_DEFAULTS.title">
          </label>
          <label class="field wide">Teks pendukung
            <input v-model="cta.text" maxlength="120" :placeholder="CTA_DEFAULTS.text">
          </label>
        </div>
        <p class="hint">Tombol WhatsApp di bagian ini memakai nomor dari tab Kontak.</p>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { IonIcon } from '@ionic/vue'
import { cmsService, type CmsFeature, type CmsHero } from '@/services/cmsService'
import { contactsService } from '@/services/contactService'
import { CMS_ICON_OPTIONS, resolveCmsIcon } from '@/utils/cmsIcons'

const emit = defineEmits<{ notify: [message: string, type?: 'success' | 'error'] }>()

const CTA_DEFAULTS = { title: 'Siap memiliki kaveling impian?', text: 'Hubungi tim kami sekarang dan dapatkan informasi lengkap.' }
const CTA_PRESETS = [
  { value: 'whatsapp', label: 'WhatsApp admin' },
  { value: '/contact', label: 'Halaman Kontak' },
  { value: '/siteplan', label: 'Denah kavling' },
  { value: '/gallery', label: 'Galeri' },
  { value: 'custom', label: 'Tautan lain…' },
]
const PRESET_VALUES = new Set(CTA_PRESETS.map((option) => option.value))

const loading = ref(true)
const saving = ref(false)
const hero = reactive<CmsHero>({ title: '', subtitle: '', description: '', image_url: null, cta_text: 'Hubungi Kami', cta_url: 'whatsapp', is_active: true })
const features = ref<CmsFeature[]>([])
const cta = reactive({ title: '', text: '' })
const ctaPreset = ref('whatsapp')
const customCtaUrl = ref('')
const selectedImage = ref<File | null>(null)
const localPreview = ref('')

const previewSrc = computed(() => localPreview.value || hero.image_url || '')

watch(ctaPreset, (value) => { if (value !== 'custom') hero.cta_url = value })
watch(customCtaUrl, (value) => { if (ctaPreset.value === 'custom') hero.cta_url = value.trim() })

function notify(message: string, type: 'success' | 'error' = 'success') { emit('notify', message, type) }

async function load() {
  try {
    const [savedHero, savedFeatures, contacts] = await Promise.all([cmsService.getHero(true), cmsService.getFeatures(), contactsService.getAll()])
    if (savedHero) Object.assign(hero, { ...savedHero, subtitle: savedHero.subtitle ?? '', description: savedHero.description ?? '' })
    const url = (hero.cta_url || 'whatsapp').trim()
    if (PRESET_VALUES.has(url)) ctaPreset.value = url
    else { ctaPreset.value = 'custom'; customCtaUrl.value = url }
    features.value = savedFeatures
    const valueOf = (key: string) => contacts.find((row) => row.key === key)?.value ?? ''
    cta.title = valueOf('cta_title')
    cta.text = valueOf('cta_text')
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Konten beranda gagal dimuat.', 'error')
  } finally {
    loading.value = false
  }
}

function selectImage(event: Event) {
  const file = (event.target as HTMLInputElement).files?.[0]
  if (!file) return
  if (localPreview.value) URL.revokeObjectURL(localPreview.value)
  selectedImage.value = file
  localPreview.value = URL.createObjectURL(file)
}

function clearImage() {
  if (localPreview.value) URL.revokeObjectURL(localPreview.value)
  localPreview.value = ''
  selectedImage.value = null
  hero.image_url = null
}

function addFeature() {
  features.value.push({ icon: 'leaf', title: '', description: '', sort_order: features.value.length, is_active: true })
}

function moveFeature(index: number, step: -1 | 1) {
  const target = index + step
  if (target < 0 || target >= features.value.length) return
  const list = features.value
  ;[list[index], list[target]] = [list[target], list[index]]
}

async function removeFeature(feature: CmsFeature, index: number) {
  if (!confirm(`Hapus keunggulan "${feature.title || 'tanpa judul'}"? Tindakan ini tidak bisa dibatalkan.`)) return
  try {
    if (feature.id) await cmsService.deleteFeature(feature.id)
    features.value.splice(index, 1)
    notify('Keunggulan dihapus.')
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Keunggulan gagal dihapus.', 'error')
  }
}

function validate(): string | null {
  if (!hero.title.trim()) return 'Judul utama hero wajib diisi.'
  if (ctaPreset.value === 'custom' && !/^(https?:\/\/|\/)/i.test(hero.cta_url)) return 'Alamat tujuan tombol harus diawali https:// atau /.'
  const incomplete = features.value.findIndex((feature) => !feature.title.trim() || !feature.description.trim())
  if (incomplete !== -1) return `Keunggulan nomor ${incomplete + 1} belum lengkap. Isi judul dan deskripsi, atau hapus.`
  return null
}

async function save() {
  const problem = validate()
  if (problem) return notify(problem, 'error')
  saving.value = true
  try {
    if (selectedImage.value) hero.image_url = await cmsService.uploadImage(selectedImage.value)
    const savedHero = await cmsService.saveHero({ ...hero })
    hero.id = savedHero.id
    const ordered = features.value.map((feature, index) => ({ ...feature, sort_order: index }))
    features.value = await Promise.all(ordered.map((feature) => cmsService.saveFeature(feature)))
    await contactsService.saveMany([
      { key: 'cta_title', label: 'Judul ajakan beranda', value: cta.title },
      { key: 'cta_text', label: 'Teks ajakan beranda', value: cta.text },
    ])
    if (localPreview.value) URL.revokeObjectURL(localPreview.value)
    localPreview.value = ''
    selectedImage.value = null
    notify('Konten beranda tersimpan dan langsung tampil di website.')
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Konten beranda gagal disimpan.', 'error')
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>

<style scoped src="./cmsPanel.css"></style>
<style scoped>
.block { padding: 20px 0; border-top: 1px solid var(--border-default); }
.block-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.block-head h3 { margin: 0; font-size: 16px; font-weight: 800; }
.image-field { display: grid; grid-template-columns: minmax(0, 260px) 1fr; gap: 16px; margin-top: 18px; align-items: start; }
.image-frame { aspect-ratio: 16 / 9; overflow: hidden; border: 1px dashed var(--border-default); border-radius: var(--radius-control); background: var(--surface-muted); display: grid; place-items: center; }
.image-frame img { width: 100%; height: 100%; object-fit: cover; }
.image-frame p { margin: 0; padding: 12px; color: var(--text-secondary); font-size: 12px; text-align: center; }
.image-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.image-actions .hint { flex-basis: 100%; }
.file-btn { cursor: pointer; }
.file-btn input { position: absolute; inline-size: 1px; block-size: 1px; opacity: 0; pointer-events: none; }
.file-btn:focus-within { outline: 3px solid color-mix(in srgb, var(--poliland-green) 35%, transparent); outline-offset: 2px; }
.feature-list { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
.feature-item { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; gap: 14px; align-items: start; padding: 14px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); }
.feature-item.off { background: var(--surface-muted); }
.feature-item.off .feature-fields { opacity: .65; }
.feature-icon { display: grid; place-items: center; inline-size: 40px; block-size: 40px; border-radius: 10px; background: var(--status-success-bg); color: var(--poliland-green); font-size: 20px; }
.feature-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; min-width: 0; }
.feature-controls { display: flex; flex-direction: column; align-items: stretch; gap: 8px; }
.feature-controls .icon-btn { align-self: flex-start; }
@media (max-width: 720px) {
  .image-field { grid-template-columns: 1fr; }
  .feature-item { grid-template-columns: 40px minmax(0, 1fr); }
  .feature-controls { grid-column: 1 / -1; flex-direction: row; flex-wrap: wrap; align-items: center; }
  .feature-fields { grid-template-columns: 1fr; }
}
</style>
