<template>
  <section class="cms-panel" :aria-labelledby="`crud-${type}`">
    <header class="panel-head">
      <div>
        <h2 :id="`crud-${type}`">{{ meta.title }}</h2>
        <p>{{ meta.description }}</p>
      </div>
      <button class="btn btn-primary" type="button" @click="openNew">{{ meta.addLabel }}</button>
    </header>

    <StatusIllustration v-if="loading" variant="processing" size="sm" title="Memuat data" description="Mohon tunggu sebentar." />
    <StatusIllustration v-else-if="loadError" :variant="resolveErrorVariant(loadError)" size="sm" :on-action="load" />
    <StatusIllustration v-else-if="!items.length" variant="empty-data" size="sm" :title="`${meta.title} masih kosong`" :description="meta.empty" />

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
          <button class="btn btn-danger" type="button" @click="askRemove(item)">Hapus</button>
        </div>
      </li>
    </ul>

    <CmsItemFormModal v-model="open" :type="type" :item="editing" :count="items.length" @saved="onSaved" />

    <AppModal
      v-model="confirmOpen"
      variant="dialog"
      title="Hapus data ini?"
      confirm-text="Hapus"
      confirm-variant="danger"
      :loading="removing"
      @confirm="remove"
    >
      <p class="confirm-text">“{{ target ? itemTitle(target) : '' }}” akan dihapus dari website dan tidak bisa dikembalikan.</p>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import { computed, onMounted, ref } from 'vue'
import AppModal from '@/components/ui/AppModal.vue'
import CmsItemFormModal, { type CmsItemType } from '@/components/Admin/CmsItemFormModal.vue'
import { galleryService } from '@/services/galleryService'
import { progressService } from '@/services/progressService'
import { faqService } from '@/services/faqService'

const props = defineProps<{ type: CmsItemType }>()
const emit = defineEmits<{ notify: [message: string, type?: 'success' | 'error'] }>()

const META: Record<CmsItemType, { title: string; description: string; addLabel: string; empty: string }> = {
  gallery: { title: 'Galeri', description: 'Foto yang tampil di Galeri dan pratinjau galeri Beranda.', addLabel: 'Tambah foto', empty: 'Belum ada foto. Tambahkan foto pertama agar Galeri tidak kosong.' },
  progress: { title: 'Kemajuan pembangunan', description: 'Catatan perkembangan yang tampil di halaman Kemajuan dan Beranda.', addLabel: 'Tambah update', empty: 'Belum ada update. Tambahkan update pertama untuk menunjukkan perkembangan kawasan.' },
  faq: { title: 'FAQ', description: 'Pertanyaan umum di bagian FAQ pada Beranda.', addLabel: 'Tambah pertanyaan', empty: 'Belum ada FAQ. Tambahkan pertanyaan yang sering diajukan calon pembeli.' },
}
const meta = computed(() => META[props.type])

const items = ref<any[]>([])
const loading = ref(true)
const loadError = ref('')
const open = ref(false)
const editing = ref<any>(null)
const confirmOpen = ref(false)
const target = ref<any>(null)
const removing = ref(false)

const itemTitle = (item: any) => item.title || item.question || 'Tanpa judul'
function itemSummary(item: any) {
  if (props.type === 'faq') return item.answer || ''
  if (props.type === 'progress') return `${Math.round(Number(item.percentage) || 0)}% selesai${item.progress_date ? ` · ${item.progress_date}` : ''}`
  return [item.category, item.description].filter(Boolean).join(' · ')
}

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

function openNew() { editing.value = null; open.value = true }
function edit(item: any) { editing.value = item; open.value = true }
async function onSaved(message: string) { emit('notify', message, 'success'); await load() }

function askRemove(item: any) { target.value = item; confirmOpen.value = true }
async function remove() {
  const item = target.value
  if (!item) return
  removing.value = true
  try {
    if (props.type === 'gallery') await galleryService.deleteGallery(item.id, item.image_url)
    else if (props.type === 'progress') await progressService.deleteProgress(item.id, item.image_url)
    else await faqService.deleteFaq(item.id)
    confirmOpen.value = false
    emit('notify', 'Data dihapus.', 'success')
    await load()
  } catch (error) {
    confirmOpen.value = false
    emit('notify', error instanceof Error ? error.message : 'Data gagal dihapus.', 'error')
  } finally {
    removing.value = false
  }
}

onMounted(load)
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
.item-body p { margin: 0; color: var(--text-secondary); font-size: 12px; line-height: 1.5; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.badge { padding: 2px 9px; border-radius: 99px; font-size: 11px; font-weight: 700; }
.badge-on { background: var(--status-success-bg); color: var(--poliland-green); }
.badge-off { background: var(--surface-muted); color: var(--text-secondary); border: 1px solid var(--border-default); }
.item-actions { display: flex; gap: 8px; }
.confirm-text { margin: 0; color: var(--text-secondary); font-size: 14px; line-height: 1.6; }
@media (max-width: 720px) {
  .item { flex-wrap: wrap; }
  .item-actions { inline-size: 100%; }
  .item-actions .btn { flex: 1; }
}
</style>
