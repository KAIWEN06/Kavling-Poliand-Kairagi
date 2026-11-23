<template>
  <ion-page>
    <ion-content class="detail-content">
      <main class="detail-page">
        <header class="detail-header">
          <button type="button" class="icon-button" aria-label="Kembali" @click="goBack">
            <ion-icon :icon="arrowBackOutline" aria-hidden="true" />
          </button>
          <div class="header-title">
            <span>KEMAJUAN</span>
            <strong>{{ item?.title || 'Detail kemajuan' }}</strong>
          </div>
        </header>

        <ProgressDetailSkeleton v-if="isLoading" />

        <StatusIllustration
          v-else-if="loadError"
          :variant="resolveErrorVariant()"
          title="Data gagal dimuat"
          fill
          :on-action="load"
        />

        <StatusIllustration
          v-else-if="!item"
          variant="not-found-404"
          title="Update tidak ditemukan"
          description="Update ini mungkin sudah dihapus atau tidak lagi ditampilkan."
          fill
          action-label="Kembali ke Kemajuan"
          :on-action="goBack"
        />

        <template v-else>
          <figure class="hero-photo">
            <img v-if="item.image_url" :src="item.image_url" :alt="item.title" />
            <div v-else class="hero-empty" aria-hidden="true"><ion-icon :icon="constructOutline" /></div>
          </figure>

          <section class="summary">
            <div class="meta">
              <span class="status-chip" :class="`status-${status}`">{{ statusLabel }}</span>
              <span v-if="dateLabel" class="date"><ion-icon :icon="calendarOutline" aria-hidden="true" /> {{ dateLabel }}</span>
            </div>
            <h1>{{ item.title }}</h1>

            <div class="progress-block" role="group" aria-label="Pencapaian">
              <div class="progress-top">
                <span>Pencapaian</span>
                <strong>{{ percentage }}%</strong>
              </div>
              <div class="track" role="progressbar" :aria-valuenow="percentage" aria-valuemin="0" aria-valuemax="100">
                <div class="fill" :style="{ width: `${percentage}%` }"></div>
              </div>
            </div>

            <p v-if="item.description" class="description">{{ item.description }}</p>
            <p v-else class="description muted">Belum ada keterangan untuk update ini.</p>
          </section>

          <section v-if="isAdmin" class="admin-bar" aria-label="Pengelolaan konten">
            <AppButton type="button" variant="neutral" fill="outline" @click="formOpen = true">Edit update</AppButton>
            <AppButton type="button" variant="danger" fill="outline" @click="deleteOpen = true">Hapus</AppButton>
          </section>
        </template>
      </main>

      <CmsItemFormModal v-model="formOpen" type="progress" :item="item" @saved="onSaved" />

      <AppModal
        v-model="deleteOpen"
        variant="dialog"
        title="Hapus update ini?"
        confirm-text="Hapus"
        confirm-variant="danger"
        :loading="deleting"
        @confirm="confirmDelete"
      >
        <p class="confirm-text">“{{ item?.title }}” akan dihapus dari website dan tidak bisa dikembalikan.</p>
      </AppModal>

      <CmsBackBar />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import { computed, onMounted, ref, watch } from 'vue'
import { IonContent, IonIcon, IonPage } from '@ionic/vue'
import { arrowBackOutline, calendarOutline, constructOutline } from 'ionicons/icons'
import { useRoute } from 'vue-router'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import ProgressDetailSkeleton from '@/components/ui/skeletons/ProgressDetailSkeleton.vue'
import CmsBackBar from '@/components/Admin/CmsBackBar.vue'
import CmsItemFormModal from '@/components/Admin/CmsItemFormModal.vue'
import { progressService, type ProgressItem } from '@/services/progressService'
import { useCmsAdmin } from '@/composables/useCmsAdmin'
import { useSmartBack } from '@/composables/useSmartBack'
import { useToast } from '@/composables/useToast'

const route = useRoute()
const toast = useToast()
const { isAdmin } = useCmsAdmin()
const { goBack } = useSmartBack(() => '/progress')

const STATUS_LABEL: Record<string, string> = { completed: 'Selesai', ongoing: 'Sedang berjalan', planned: 'Direncanakan' }

const item = ref<ProgressItem | null>(null)
const isLoading = ref(true)
const loadError = ref(false)
const formOpen = ref(false)
const deleteOpen = ref(false)
const deleting = ref(false)

const status = computed(() => item.value?.status || 'ongoing')
const statusLabel = computed(() => STATUS_LABEL[status.value] ?? '')
const percentage = computed(() => Math.min(100, Math.max(0, Math.round(Number(item.value?.percentage) || 0))))
const dateLabel = computed(() => {
  const value = item.value?.progress_date
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })
})

async function load() {
  const id = String(route.params.id || '')
  if (!id) { item.value = null; isLoading.value = false; return }
  isLoading.value = true
  loadError.value = false
  try {
    item.value = await progressService.getProgressById(id)
  } catch (error) {
    console.error('Gagal memuat detail kemajuan:', error)
    loadError.value = true
  } finally {
    isLoading.value = false
  }
}

async function onSaved(message: string) { toast.success(message); await load() }

async function confirmDelete() {
  if (!item.value?.id) return
  deleting.value = true
  try {
    await progressService.deleteProgress(item.value.id, item.value.image_url)
    deleteOpen.value = false
    toast.success('Update dihapus.')
    goBack()
  } catch (error) {
    deleteOpen.value = false
    toast.error(error instanceof Error ? error.message : 'Update gagal dihapus.')
  } finally {
    deleting.value = false
  }
}

watch(() => route.params.id, (id) => { if (id && route.path.startsWith('/progress/')) void load() })
onMounted(load)
</script>

<style scoped>
.detail-content { --background: var(--app-background, #faf9f6); --padding-bottom: calc(110px + env(safe-area-inset-bottom)); }
.detail-page { width: 100%; max-width: 680px; margin: 0 auto; padding: 14px 16px 24px; }

.detail-header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
.icon-button { display: grid; place-items: center; flex: none; width: 44px; height: 44px; border: 1px solid var(--border-default, #eae7e0); border-radius: 12px; background: var(--surface-primary, #fff); color: var(--text-primary, #252525); font-size: 20px; cursor: pointer; }
.icon-button:focus-visible { outline: 3px solid var(--poliland-green, #355a2c); outline-offset: 2px; }
.header-title { min-width: 0; display: grid; gap: 2px; }
.header-title span { color: var(--text-secondary, #717178); font-size: 10px; font-weight: 800; letter-spacing: .12em; }
.header-title strong { overflow: hidden; color: var(--text-primary, #252525); font-size: 16px; font-weight: 800; text-overflow: ellipsis; white-space: nowrap; }

.hero-photo { margin: 0; aspect-ratio: 16 / 10; overflow: hidden; border-radius: 20px; background: var(--surface-muted, #f5f3ee); }
.hero-photo img { display: block; width: 100%; height: 100%; object-fit: cover; }
.hero-empty { display: grid; place-items: center; width: 100%; height: 100%; color: var(--poliland-green, #355a2c); font-size: 44px; }

.summary { margin-top: 18px; }
.meta { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; }
.status-chip { padding: 4px 12px; border-radius: 999px; font-size: 12px; font-weight: 800; background: var(--status-success-bg, #e8eee4); color: var(--poliland-green, #355a2c); }
.status-planned { background: var(--surface-muted, #f5f3ee); color: var(--text-secondary, #717178); }
.status-ongoing { background: var(--warning-bg, #fbf0d8); color: var(--warning-text, #805708); }
.date { display: inline-flex; align-items: center; gap: 5px; color: var(--text-secondary, #717178); font-size: 13px; }
.summary h1 { margin: 12px 0 0; color: var(--text-primary, #252525); font-size: 24px; line-height: 1.2; font-weight: 850; letter-spacing: -.02em; }

.progress-block { margin-top: 18px; padding: 16px; border: 1px solid var(--border-default, #eae7e0); border-radius: 16px; background: var(--surface-primary, #fff); }
.progress-top { display: flex; align-items: baseline; justify-content: space-between; color: var(--text-secondary, #717178); font-size: 13px; font-weight: 700; }
.progress-top strong { color: var(--poliland-green, #355a2c); font-size: 28px; font-weight: 850; letter-spacing: -.03em; }
.track { height: 8px; margin-top: 10px; overflow: hidden; border-radius: 999px; background: var(--surface-muted, #f5f3ee); }
.fill { height: 100%; border-radius: inherit; background: var(--poliland-green, #355a2c); }

.description { margin: 18px 0 0; color: var(--text-primary, #252525); font-size: 15px; line-height: 1.7; white-space: pre-line; }
.description.muted { color: var(--text-secondary, #717178); }

.admin-bar { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 22px; padding-top: 18px; border-top: 1px dashed var(--border-strong, #d5d0c4); }

.state-card { display: grid; justify-items: center; gap: 8px; padding: 36px 20px; border: 1px dashed var(--border-strong, #d5d0c4); border-radius: 18px; text-align: center; color: var(--text-secondary, #717178); }
.state-card ion-icon { font-size: 36px; color: var(--poliland-green, #355a2c); }
.state-card h2 { margin: 4px 0 0; color: var(--text-primary, #252525); font-size: 17px; }
.state-card p { margin: 0 0 8px; font-size: 14px; line-height: 1.5; }
.confirm-text { margin: 0; color: var(--text-secondary, #717178); font-size: 14px; line-height: 1.6; }
</style>
