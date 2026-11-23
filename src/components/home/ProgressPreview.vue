<template>
  <section v-if="loading || items.length || isAdmin" class="progress-section">
    <div class="section-heading">
      <div>
        <h2>Kemajuan Pembangunan</h2>
        <span class="heading-line"></span>
      </div>
      <div class="heading-actions">
        <AdminEditButton v-if="isAdmin" label="Tambah update" :icon="addOutline" @click="openAdd" />
        <button v-if="items.length" class="see-all" type="button" @click="router.push('/progress')">
          Lihat Semua <ion-icon :icon="chevronForwardOutline" />
        </button>
      </div>
    </div>

    <div v-if="loading" class="loading-box"><ion-spinner name="crescent" color="primary" /></div>

    <p v-else-if="!items.length" class="empty-hint">Belum ada update kemajuan. Tekan “Tambah update” untuk menampilkan perkembangan pertama.</p>

    <ul v-else class="progress-list">
      <li v-for="item in items" :key="item.id" class="progress-card">
        <button type="button" class="card-open" :aria-label="`Lihat detail ${item.title}`" @click="router.push(`/progress/${item.id}`)">
          <span class="thumb">
            <img v-if="item.image_url" :src="item.image_url" :alt="item.title" loading="lazy" />
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
          <button type="button" class="mini" aria-label="Edit update" @click="openEdit(item)"><ion-icon :icon="createOutline" /></button>
          <button type="button" class="mini danger" aria-label="Hapus update" @click="askDelete(item)"><ion-icon :icon="trashOutline" /></button>
        </div>
      </li>
    </ul>

    <CmsItemFormModal v-model="formOpen" type="progress" :item="editingItem" :count="items.length" @saved="onSaved" />

    <AppModal
      v-model="deleteOpen"
      variant="dialog"
      title="Hapus update ini?"
      confirm-text="Hapus"
      confirm-variant="danger"
      :loading="deleting"
      @confirm="confirmDelete"
    >
      <p class="confirm-text">“{{ deleteTarget?.title }}” akan dihapus dari website dan tidak bisa dikembalikan.</p>
    </AppModal>
  </section>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonIcon, IonSpinner } from '@ionic/vue'
import { addOutline, calendarOutline, chevronForwardOutline, constructOutline, createOutline, trashOutline } from 'ionicons/icons'
import AppModal from '@/components/ui/AppModal.vue'
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
    toast.success('Update dihapus.')
    await load()
  } catch (error) {
    deleteOpen.value = false
    toast.error(error instanceof Error ? error.message : 'Update gagal dihapus.')
  } finally {
    deleting.value = false
  }
}

onMounted(() => {
  void load()
  window.addEventListener('poliland:refresh-progress', handleRefresh)
})
onUnmounted(() => window.removeEventListener('poliland:refresh-progress', handleRefresh))
</script>

<style scoped>
.progress-section { width: 100%; padding: 28px 16px 0; box-sizing: border-box; }
.section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.section-heading h2 { margin: 0; color: #1a1a1a; font-size: 20px; line-height: 1.2; font-weight: 800; letter-spacing: -0.3px; }
.heading-line { display: block; width: 34px; height: 3px; margin-top: 7px; background: #556b2f; border-radius: 999px; }
.heading-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 6px; }
.see-all { display: flex; align-items: center; gap: 3px; min-height: 44px; padding: 0 4px; border: 0; background: transparent; color: #556b2f; font-size: 11px; font-weight: 700; white-space: nowrap; cursor: pointer; }
.see-all ion-icon { font-size: 14px; }

.loading-box { display: flex; justify-content: center; padding: 28px 0; }
.empty-hint { margin: 0; padding: 16px; border: 1px dashed #d5d0c4; border-radius: 12px; color: #6b6b6b; font-size: 12px; line-height: 1.5; }

.progress-list { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.progress-card { position: relative; border: 1px solid #e5e5e5; border-radius: 16px; background: #fff; box-shadow: 0 3px 10px rgba(15, 23, 42, .04); }
.card-open { display: flex; align-items: stretch; gap: 12px; width: 100%; padding: 10px; border: 0; border-radius: 16px; background: transparent; color: inherit; font: inherit; text-align: left; cursor: pointer; }
.card-open:focus-visible { outline: 3px solid #556b2f; outline-offset: 2px; }
.thumb { flex: none; display: grid; place-items: center; width: 92px; min-height: 92px; overflow: hidden; border-radius: 12px; background: #ede6d6; color: #556b2f; font-size: 28px; }
.thumb img { display: block; width: 100%; height: 100%; object-fit: cover; }
.body { flex: 1; min-width: 0; display: grid; align-content: center; gap: 5px; }
.meta { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.badge { padding: 2px 9px; border-radius: 999px; font-size: 10px; font-weight: 800; background: #e8eee4; color: #355a2c; }
.badge-ongoing { background: #fbf0d8; color: #805708; }
.badge-planned { background: #f5f3ee; color: #717178; }
.date { display: inline-flex; align-items: center; gap: 4px; color: #717178; font-size: 11px; }
.title { color: #1a1a1a; font-size: 14px; font-weight: 800; line-height: 1.3; }
.desc { display: -webkit-box; overflow: hidden; color: #6b6b6b; font-size: 12px; line-height: 1.45; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; }
.bar-row { display: flex; align-items: center; gap: 8px; }
.track { flex: 1; height: 6px; overflow: hidden; border-radius: 999px; background: #ede6d6; }
.fill { display: block; height: 100%; border-radius: inherit; background: #556b2f; }
.pct { color: #355a2c; font-size: 12px; font-weight: 800; }

.card-admin { position: absolute; top: 8px; right: 8px; display: flex; gap: 6px; }
.mini { display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 10px; background: #fff; color: #966a12; font-size: 16px; box-shadow: 0 2px 6px rgba(0, 0, 0, .2); cursor: pointer; }
.mini.danger { color: #d94b45; }
.mini:focus-visible { outline: 3px solid #556b2f; outline-offset: 2px; }
.confirm-text { margin: 0; color: #717178; font-size: 14px; line-height: 1.6; }
</style>
