<template>
  <section v-if="loading || items.length || isAdmin" class="progress-section">
    <SectionHeader title="Kemajuan pembangunan">
      <div class="heading-actions">
        <AdminEditButton v-if="isAdmin" label="Tambah kabar" :icon="addOutline" @click="openAdd" />
        <button v-if="items.length" class="see-all" type="button" @click="router.push('/progress')">
          Lihat semua <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
        </button>
      </div>
    </SectionHeader>

    <div v-if="loading" class="loading-box"><ion-spinner name="crescent" color="primary" /></div>

    <p v-else-if="!items.length" class="empty-hint">Belum ada kabar kemajuan. Tekan “Tambah kabar” untuk menampilkan perkembangan pertama.</p>

    <ul v-else class="progress-list">
      <li v-for="item in items" :key="item.id" class="progress-card">
        <button type="button" class="card-open" :aria-label="`Lihat detail ${item.title}`" @click="router.push(`/progress/${item.id}`)">
          <span class="thumb">
            <img v-if="item.image_url" :src="item.image_url" :alt="item.title" loading="lazy" decoding="async" />
            <ion-icon v-else :icon="constructOutline" aria-hidden="true" />
          </span>
          <span class="body">
            <span class="meta">
              <span class="badge" :class="`badge-${item.status || 'ongoing'}`">{{ STATUS_LABEL[item.status || 'ongoing'] }}</span>
              <span v-if="item.progress_date" class="date"><ion-icon :icon="calendarOutline" aria-hidden="true" /> {{ formatDate(item.progress_date) }}</span>
            </span>
            <strong class="title">{{ item.title }}</strong>
            <span v-if="item.description" class="desc">{{ item.description }}</span>
            <span class="bar-row">
              <span class="track"><span class="fill" :style="{ width: `${pct(item)}%` }"></span></span>
              <span class="pct">{{ pct(item) }}%</span>
            </span>
          </span>
        </button>
        <div v-if="isAdmin" class="card-admin">
          <button type="button" class="mini" aria-label="Ubah kabar" @click="openEdit(item)"><ion-icon :icon="createOutline" /></button>
          <button type="button" class="mini danger" aria-label="Hapus kabar" @click="askDelete(item)"><ion-icon :icon="trashOutline" /></button>
        </div>
      </li>
    </ul>

    <CmsItemFormModal v-model="formOpen" type="progress" :item="editingItem" :count="items.length" @saved="onSaved" />

    <AppModal
      v-model="deleteOpen"
      variant="dialog"
      title="Hapus kabar ini?"
      confirm-text="Hapus"
      confirm-variant="danger"
      :loading="deleting"
      @confirm="confirmDelete"
    >
      <p class="confirm-text">“{{ deleteTarget?.title }}” akan dihapus dari situs web dan tidak bisa dikembalikan.</p>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { useRealtimeRefresh } from '@/composables/useRealtimeRefresh'
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonIcon, IonSpinner } from '@ionic/vue'
import { addOutline, calendarOutline, chevronForwardOutline, constructOutline, createOutline, trashOutline } from 'ionicons/icons'
import AppModal from '@/components/ui/AppModal.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import AdminEditButton from '@/components/Admin/AdminEditButton.vue'
import CmsItemFormModal from '@/components/Admin/CmsItemFormModal.vue'
import { progressService, type ProgressItem } from '@/services/progressService'
import { useCmsAdmin } from '@/composables/useCmsAdmin'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const toast = useToast()
const { isAdmin } = useCmsAdmin()

const STATUS_LABEL: Record<string, string> = { completed: 'Selesai', ongoing: 'Sedang berjalan', planned: 'Direncanakan' }

const items = ref<ProgressItem[]>([])
const loading = ref(true)
const formOpen = ref(false)
const editingItem = ref<ProgressItem | null>(null)
const deleteOpen = ref(false)
const deleteTarget = ref<ProgressItem | null>(null)
const deleting = ref(false)

const pct = (item: ProgressItem) => Math.min(100, Math.max(0, Math.round(Number(item.percentage) || 0)))
function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

/** Data kemajuan sepenuhnya dari database; Beranda hanya menampilkan 3 update terbaru. */
async function load() {
  try {
    const rows = await progressService.getProgress(false)
    items.value = [...rows].sort((a, b) => String(b.progress_date ?? '').localeCompare(String(a.progress_date ?? ''))).slice(0, 3)
  } catch (error) {
    console.error('Gagal memuat kemajuan:', error)
  } finally {
    loading.value = false
  }
}

const handleRefresh = async () => {
  await load()
  window.dispatchEvent(new CustomEvent('poliland:refresh-item-complete', { detail: { source: 'progress' } }))
}

function openAdd() { editingItem.value = null; formOpen.value = true }
function openEdit(item: ProgressItem) { editingItem.value = item; formOpen.value = true }
async function onSaved(message: string) { toast.success(message); await load() }
function askDelete(item: ProgressItem) { deleteTarget.value = item; deleteOpen.value = true }
async function confirmDelete() {
  const item = deleteTarget.value
  if (!item?.id) return
  deleting.value = true
  try {
    await progressService.deleteProgress(item.id, item.image_url)
    deleteOpen.value = false
    toast.success('Kabar dihapus.')
    await load()
  } catch (error) {
    deleteOpen.value = false
    toast.error(error instanceof Error ? error.message : 'Kabar gagal dihapus.')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  void load()
  window.addEventListener('poliland:refresh-progress', handleRefresh)
})
onUnmounted(() => window.removeEventListener('poliland:refresh-progress', handleRefresh))

useRealtimeRefresh(['progress'], load)

</script>

<style scoped>
.progress-section { width: 100%; padding: 36px 20px 0; box-sizing: border-box; }
.heading-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 6px; }
.see-all { display: inline-flex; align-items: center; gap: 3px; min-height: 44px; padding: 0 4px; border: 0; background: transparent; color: var(--poliland-green, #355a2c); font: 700 14px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif); white-space: nowrap; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.see-all ion-icon { font-size: 16px; transition: transform var(--dur-base) var(--ease-spring); }
.see-all:active ion-icon { transform: translateX(3px); }
.see-all:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 2px; }

.loading-box { display: flex; justify-content: center; padding: 28px 0; }
.empty-hint { margin: 0; padding: 16px; border: 1px dashed var(--border-strong, #d5d0c4); border-radius: var(--radius-card, 16px); color: var(--text-secondary, #5f5f66); font-size: 14px; line-height: 1.55; }

.progress-list { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
.progress-card { position: relative; border: 1px solid var(--border-default, #eae7e0); border-radius: var(--radius-card, 16px); background: var(--surface-primary, #fff); box-shadow: var(--shadow-sm); transition: transform var(--dur-base) var(--ease-spring); }
.progress-card:has(.card-open:active) { transform: scale(0.97); }
.card-open { display: flex; align-items: stretch; gap: 14px; width: 100%; padding: 10px; border: 0; border-radius: var(--radius-card, 16px); background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.card-open:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 2px; }
.thumb { flex: none; display: grid; place-items: center; width: 104px; min-height: 104px; overflow: hidden; border-radius: 12px; background: var(--green-100, #e8eee4); color: var(--poliland-green, #355a2c); font-size: 30px; }
.thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
.body { flex: 1; min-width: 0; display: grid; align-content: center; gap: 6px; }
.meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.badge { padding: 3px 10px; border-radius: 999px; font-size: 12px; font-weight: 800; background: var(--green-100, #e8eee4); color: var(--poliland-green, #355a2c); }
.badge-ongoing { background: var(--gold-50, #fbf0d8); color: var(--poliland-gold-text, #805708); }
.badge-planned { background: var(--surface-sunken, #f0ede5); color: var(--text-secondary, #5f5f66); }
.date { display: inline-flex; align-items: center; gap: 4px; color: var(--text-secondary, #5f5f66); font-size: 12px; }
.title { color: var(--text-primary, #252525); font-size: 16px; font-weight: 800; line-height: 1.3; }
.desc { display: -webkit-box; overflow: hidden; color: var(--text-secondary, #5f5f66); font-size: 13px; line-height: 1.45; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; }
.bar-row { display: flex; align-items: center; gap: 10px; }
.track { flex: 1; height: 7px; overflow: hidden; border-radius: 999px; background: var(--surface-sunken, #f0ede5); }
.fill { display: block; height: 100%; border-radius: inherit; background: linear-gradient(90deg, var(--green-600, #3e6a31), var(--poliland-green, #355a2c)); }
.pct { color: var(--poliland-green, #355a2c); font-size: 14px; font-weight: 800; font-variant-numeric: tabular-nums; }

.card-admin { position: absolute; top: 8px; right: 8px; display: flex; gap: 6px; }
.mini { display: grid; place-items: center; width: 44px; height: 44px; border: 0; border-radius: 12px; background: #fff; color: var(--poliland-gold-text, #805708); font-size: 18px; box-shadow: var(--shadow-sm); cursor: pointer; touch-action: manipulation; }
.mini.danger { color: var(--status-danger, #b3261e); }
.mini:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 2px; }
.confirm-text { margin: 0; color: var(--text-secondary, #5f5f66); font-size: 14px; line-height: 1.6; }

@media (prefers-reduced-motion: reduce) {
  .progress-card:has(.card-open:active) { transform: none; }
}
</style>
