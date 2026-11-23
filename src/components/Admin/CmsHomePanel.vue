<template>
  <section class="cms-panel" :class="{ embedded }" aria-labelledby="home-title">
    <header v-if="!embedded" class="panel-head">
      <div>
        <h2 id="home-title">Beranda</h2>
        <p>Bagian-bagian di halaman utama yang bisa Anda ubah. Perubahan tampil setelah disimpan.</p>
      </div>
      <button class="btn btn-primary" type="button" :disabled="saving || loading" @click="save">
        {{ saving ? 'Menyimpan…' : 'Simpan perubahan' }}
      </button>
    </header>

    <p v-if="loading" class="state" role="status">Memuat konten beranda…</p>
    <template v-else>
      <section v-if="shows('hero')" class="block" aria-labelledby="hero-title">
        <div class="block-head">
          <h3 id="hero-title">Hero (bagian paling atas)</h3>
          <label class="switch">
            <input v-model="hero.is_active" type="checkbox">
            <span>{{ hero.is_active ? 'Ditampilkan' : 'Disembunyikan' }}</span>
          </label>
        </div>
        <div class="fields">
          <label class="field wide">Judul utama *
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
            <p v-else>Belum ada gambar. Hero tampil dengan latar hijau polos.</p>
          </div>
          <div class="image-actions">
            <label class="btn btn-secondary file-btn">
              {{ previewSrc ? 'Ganti gambar' : 'Pilih gambar' }}
              <input type="file" accept="image/jpeg,image/png,image/webp" @change="selectImage">
            </label>
            <button v-if="previewSrc" class="btn btn-ghost" type="button" @click="clearImage">Hapus gambar</button>
            <span class="hint">JPG, PNG, atau WEBP. Maksimal 5 MB. Rasio lebar disarankan.</span>
          </div>
        </div>
      </section>

      <section v-if="shows('highlights')" class="block" aria-labelledby="hl-title">
        <div class="block-head">
          <h3 id="hl-title">Angka & sorotan</h3>
          <button class="btn btn-secondary" type="button" :disabled="highlights.length >= 4" @click="addHighlight">Tambah sorotan</button>
        </div>
        <p class="hint lead">Total kaveling dan jumlah terjual dihitung otomatis dari data kavling. Sorotan di bawah ini tampil di sebelahnya.</p>
        <p v-if="!highlights.length" class="empty">Belum ada sorotan.</p>
        <ul class="rows">
          <li v-for="(item, index) in highlights" :key="index" class="row-item">
            <div class="row-fields three">
              <label class="field">Isi
                <input v-model="item.value" maxlength="12" placeholder="SHM">
              </label>
              <label class="field">Keterangan
                <input v-model="item.label" maxlength="24" placeholder="Legalitas">
              </label>
              <label class="field">Ikon
                <select v-model="item.icon">
                  <option v-for="icon in CMS_ICON_OPTIONS" :key="icon.key" :value="icon.key">{{ icon.label }}</option>
                </select>
              </label>
            </div>
            <button class="btn btn-danger" type="button" :aria-label="`Hapus sorotan ${item.label || index + 1}`" @click="highlights.splice(index, 1)">Hapus</button>
          </li>
        </ul>
      </section>

      <section v-if="shows('features')" class="block" aria-labelledby="feat-title">
        <div class="block-head">
          <h3 id="feat-title">Keunggulan</h3>
          <button class="btn btn-secondary" type="button" @click="addFeature">Tambah keunggulan</button>
        </div>
        <p v-if="!features.length" class="empty">Belum ada keunggulan. Bagian ini tidak tampil di Beranda sampai Anda menambahkan.</p>
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
        <p v-if="removedFeatureIds.length" class="hint">{{ removedFeatureIds.length }} keunggulan akan dihapus saat Anda menyimpan.</p>
      </section>

      <section v-if="shows('about')" class="block" aria-labelledby="about-title">
        <div class="block-head">
          <h3 id="about-title">Tentang Kami</h3>
          <button class="btn btn-secondary" type="button" :disabled="aboutPoints.length >= 6" @click="aboutPoints.push('')">Tambah poin</button>
        </div>
        <div class="fields">
          <label class="field wide">Deskripsi singkat
            <textarea v-model="aboutDescription" rows="4" maxlength="500" placeholder="Ceritakan singkat tentang PoliLand Kairagi."></textarea>
            <span class="hint">{{ aboutDescription.length }}/500 karakter. Video profil diatur lewat tombol Ubah Video di bagian ini pada Beranda.</span>
          </label>
        </div>
        <ul class="rows">
          <li v-for="(_, index) in aboutPoints" :key="index" class="row-item">
            <label class="field grow">Poin {{ index + 1 }}
              <input v-model="aboutPoints[index]" maxlength="80" placeholder="Contoh: Kawasan berkembang dan potensial">
            </label>
            <button class="btn btn-danger" type="button" :aria-label="`Hapus poin ${index + 1}`" @click="aboutPoints.splice(index, 1)">Hapus</button>
          </li>
        </ul>
      </section>

      <section v-if="shows('cta')" class="block" aria-labelledby="cta-title">
        <div class="block-head"><h3 id="cta-title">Ajakan di bagian bawah</h3></div>
        <div class="fields">
          <label class="field wide">Judul
            <input v-model="cta.title" maxlength="60" placeholder="Siap memiliki kaveling impian?">
          </label>
          <label class="field wide">Teks pendukung
            <input v-model="cta.text" maxlength="120" placeholder="Hubungi tim kami sekarang dan dapatkan informasi lengkap.">
          </label>
        </div>
        <p class="hint lead">Tombol WhatsApp di bagian ini memakai nomor dari bagian Kontak.</p>
      </section>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { IonIcon } from '@ionic/vue'
import { cmsService, type CmsFeature, type CmsHero } from '@/services/cmsService'
import { contactsService } from '@/services/contactService'
import { CMS_ICON_OPTIONS, resolveCmsIcon } from '@/utils/cmsIcons'
import { HOME_KEYS, parseHighlights, parsePoints, type HomeHighlight } from '@/utils/homeContent'

type Section = 'hero' | 'highlights' | 'features' | 'about' | 'cta'

/**
 * `only` menampilkan satu bagian saja (dipakai tombol Edit di halaman publik).
 * `embedded` menyembunyikan judul panel karena sudah ada di modal; simpan dipicu dari luar lewat `save()`.
 */
const props = defineProps<{ only?: Section; embedded?: boolean }>()
const emit = defineEmits<{ notify: [message: string, type?: 'success' | 'error']; saved: [] }>()

const shows = (section: Section) => !props.only || props.only === section

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
const removedFeatureIds = ref<string[]>([])
const highlights = ref<HomeHighlight[]>([])
const aboutDescription = ref('')
const aboutPoints = ref<string[]>([])
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
    cta.title = valueOf(HOME_KEYS.ctaTitle)
    cta.text = valueOf(HOME_KEYS.ctaText)
    highlights.value = parseHighlights(valueOf(HOME_KEYS.highlights))
    aboutDescription.value = valueOf(HOME_KEYS.aboutDescription)
    aboutPoints.value = parsePoints(valueOf(HOME_KEYS.aboutPoints))
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Konten beranda gagal dimuat.', 'error')
  } finally {
    loading.value = false
  }
}

function resetLocalPreview() {
  if (localPreview.value) URL.revokeObjectURL(localPreview.value)
  localPreview.value = ''
  selectedImage.value = null
}

function selectImage(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) { notify('Format gambar harus JPG, PNG, atau WEBP.', 'error'); input.value = ''; return }
  if (file.size > 5 * 1024 * 1024) { notify('Ukuran gambar maksimal 5 MB.', 'error'); input.value = ''; return }
  resetLocalPreview()
  selectedImage.value = file
  localPreview.value = URL.createObjectURL(file)
}

function clearImage() {
  resetLocalPreview()
  hero.image_url = null
}

function addFeature() {
  features.value.push({ icon: 'leaf', title: '', description: '', sort_order: features.value.length, is_active: true })
}

function addHighlight() {
  highlights.value.push({ icon: 'shield', value: '', label: '' })
}

function moveFeature(index: number, step: -1 | 1) {
  const target = index + step
  if (target < 0 || target >= features.value.length) return
  const list = features.value
  ;[list[index], list[target]] = [list[target], list[index]]
}

/** Dihapus dari daftar dulu; baru benar-benar terhapus di database saat Simpan ditekan. */
function removeFeature(feature: CmsFeature, index: number) {
  if (feature.id) removedFeatureIds.value.push(feature.id)
  features.value.splice(index, 1)
}

function validate(): string | null {
  if (shows('hero')) {
    if (!hero.title.trim()) return 'Judul utama hero wajib diisi.'
    if (ctaPreset.value === 'custom' && !/^(https?:\/\/|\/)/i.test(hero.cta_url)) return 'Alamat tujuan tombol harus diawali https:// atau /.'
  }
  if (shows('features')) {
    const incomplete = features.value.findIndex((feature) => !feature.title.trim() || !feature.description.trim())
    if (incomplete !== -1) return `Keunggulan nomor ${incomplete + 1} belum lengkap. Isi judul dan deskripsi, atau hapus.`
  }
  if (shows('highlights') && highlights.value.some((item) => !item.value.trim() || !item.label.trim())) return 'Setiap sorotan harus punya isi dan keterangan, atau hapus yang kosong.'
  return null
}

async function save(): Promise<boolean> {
  const problem = validate()
  if (problem) { notify(problem, 'error'); return false }
  saving.value = true
  try {
    if (shows('hero')) {
      if (selectedImage.value) hero.image_url = await cmsService.uploadImage(selectedImage.value)
      const savedHero = await cmsService.saveHero({ ...hero })
      hero.id = savedHero.id
      resetLocalPreview()
    }
    if (shows('features')) {
      for (const id of removedFeatureIds.value) await cmsService.deleteFeature(id)
      removedFeatureIds.value = []
      const ordered = features.value.map((feature, index) => ({ ...feature, sort_order: index }))
      features.value = await Promise.all(ordered.map((feature) => cmsService.saveFeature(feature)))
    }
    const entries: { key: string; label: string; value: string }[] = []
    if (shows('cta')) entries.push({ key: HOME_KEYS.ctaTitle, label: 'Judul ajakan beranda', value: cta.title }, { key: HOME_KEYS.ctaText, label: 'Teks ajakan beranda', value: cta.text })
    if (shows('highlights')) entries.push({ key: HOME_KEYS.highlights, label: 'Sorotan Beranda', value: JSON.stringify(highlights.value.map((item) => ({ icon: item.icon, value: item.value.trim(), label: item.label.trim() }))) })
    if (shows('about')) entries.push(
      { key: HOME_KEYS.aboutDescription, label: 'Deskripsi Tentang Kami', value: aboutDescription.value },
      { key: HOME_KEYS.aboutPoints, label: 'Poin Tentang Kami', value: JSON.stringify(aboutPoints.value.map((point) => point.trim()).filter(Boolean)) },
    )
    if (entries.length) await contactsService.saveMany(entries)
    notify('Tersimpan dan langsung tampil di website.')
    emit('saved')
    return true
  } catch (error) {
    notify(error instanceof Error ? error.message : 'Konten gagal disimpan.', 'error')
    return false
  } finally {
    saving.value = false
  }
}

defineExpose({ save, saving, loading })
onMounted(load)
onBeforeUnmount(resetLocalPreview)
</script>

<style scoped src="./cmsPanel.css"></style>
<style scoped>
.embedded { padding: 0; border: 0; background: transparent; }
.embedded .block:first-child { padding-top: 0; border-top: 0; }
.block { padding: 20px 0; border-top: 1px solid var(--border-default); }
.block-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.block-head h3 { margin: 0; font-size: 16px; font-weight: 800; }
.lead { margin: 0 0 12px; }
.image-field { display: grid; grid-template-columns: minmax(0, 260px) 1fr; gap: 16px; margin-top: 18px; align-items: start; }
.image-frame { aspect-ratio: 16 / 9; overflow: hidden; border: 1px dashed var(--border-default); border-radius: var(--radius-control); background: var(--surface-muted); display: grid; place-items: center; }
.image-frame img { width: 100%; height: 100%; object-fit: cover; }
.image-frame p { margin: 0; padding: 12px; color: var(--text-secondary); font-size: 12px; text-align: center; }
.image-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.image-actions .hint { flex-basis: 100%; }
.file-btn { position: relative; cursor: pointer; }
.file-btn input { position: absolute; inline-size: 1px; block-size: 1px; opacity: 0; pointer-events: none; }
.file-btn:focus-within { outline: 3px solid color-mix(in srgb, var(--poliland-green) 35%, transparent); outline-offset: 2px; }
.rows { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.row-item { display: flex; align-items: end; gap: 10px; padding: 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); }
.row-fields { flex: 1; display: grid; gap: 10px; min-width: 0; }
.row-fields.three { grid-template-columns: 1fr 1.4fr 1.4fr; }
.field.grow { flex: 1; min-width: 0; }
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
  .row-item { flex-direction: column; align-items: stretch; }
  .row-fields.three { grid-template-columns: 1fr; }
  .feature-item { grid-template-columns: 40px minmax(0, 1fr); }
  .feature-controls { grid-column: 1 / -1; flex-direction: row; flex-wrap: wrap; align-items: center; }
  .feature-fields { grid-template-columns: 1fr; }
}
</style>
