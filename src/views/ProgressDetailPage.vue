<template>
  <ion-page>
    <ion-content class="detail-content">
      <main class="detail-page pl-surface" :class="{ 'has-hero': hasHero }">
        <header class="detail-header">
          <button type="button" class="icon-button" aria-label="Kembali" @click="goBack">
            <ion-icon :icon="arrowBackOutline" aria-hidden="true" />
          </button>
          <div class="header-title">
            <span>KEMAJUAN</span>
            <strong v-if="!hasHero">{{ item?.title || 'Detail kemajuan' }}</strong>
          </div>
        </header>

        <ProgressDetailSkeleton v-if="isLoading" />

        <StatusIllustration
          v-else-if="loadError"
          :variant="resolveErrorVariant()"
          title="Data gagal dimuat"
          fill
          :on-action="() => load()"
        />

        <StatusIllustration
          v-else-if="!item"
          variant="not-found-404"
          title="Kabar tidak ditemukan"
          description="Kabar ini mungkin sudah dihapus atau tidak lagi ditampilkan."
          fill
          action-label="Kembali ke Kemajuan"
          :on-action="goBack"
        />

        <template v-else>
          <!-- Foto penuh lebar; bukit terdepan berwarna krem agar foto mengalir ke isi halaman -->
          <figure class="hero-photo">
            <motion.img
              v-if="item.image_url"
              :src="item.image_url"
              :alt="item.title"
              :initial="reduced ? false : { scale: 1.14 }"
              :animate="{ scale: 1 }"
              :transition="{ duration: 2.6, ease: MOTION_EASE_OUT }"
            />
            <div v-else class="hero-empty" aria-hidden="true"><ion-icon :icon="constructOutline" /></div>
            <div class="hero-shade"></div>
            <SceneBackdrop class="hero-scene" height="96px" :sun="!item.image_url" :lines="false" solid-front="#F9F5EC" />
          </figure>

          <section class="summary">
            <Reveal :order="4" :step="0.09">
              <div class="meta">
                <span class="status-chip" :class="`status-${status}`">{{ statusLabel }}</span>
                <span v-if="dateLabel" class="date"><ion-icon :icon="calendarOutline" aria-hidden="true" /> {{ dateLabel }}</span>
              </div>
            </Reveal>

            <h1 class="title-mask">
              <motion.span
                class="title-inner"
                :initial="reduced ? false : { y: '110%' }"
                :animate="{ y: '0%' }"
                :transition="{ duration: 0.7, delay: 0.45, ease: MOTION_EASE_OUT }"
              >{{ item.title }}</motion.span>
            </h1>

            <Reveal :order="6" :step="0.09">
              <div class="progress-block" role="group" aria-label="Pencapaian">
                <div class="progress-top">
                  <span>Pencapaian</span>
                  <strong :aria-label="`${percentage} persen`">{{ displayPct }}%</strong>
                </div>
                <div class="track" role="progressbar" :aria-valuenow="percentage" aria-valuemin="0" aria-valuemax="100">
                  <div class="fill" :style="{ width: `${percentage}%` }"></div>
                </div>
              </div>
            </Reveal>

            <Reveal :order="7" :step="0.09">
              <p v-if="item.description" class="description">{{ item.description }}</p>
              <p v-else class="description muted">Belum ada keterangan untuk kabar ini.</p>
            </Reveal>
          </section>

          <Reveal v-if="isAdmin" :order="8" :step="0.09">
            <section class="admin-bar" aria-label="Pengelolaan konten">
              <AppButton type="button" variant="neutral" fill="outline" @click="formOpen = true">Ubah kabar</AppButton>
              <AppButton type="button" variant="danger" fill="outline" @click="deleteOpen = true">Hapus</AppButton>
            </section>
          </Reveal>
        </template>
      </main>

      <CmsItemFormModal v-model="formOpen" type="progress" :item="item" @saved="onSaved" />

      <AppModal
        v-model="deleteOpen"
        variant="dialog"
        title="Hapus kabar ini?"
        confirm-text="Hapus"
        confirm-variant="danger"
        :loading="deleting"
        @confirm="confirmDelete"
      >
        <p class="confirm-text">“{{ item?.title }}” akan dihapus dari situs web dan tidak bisa dikembalikan.</p>
      </AppModal>

      <CmsBackBar />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { IonContent, IonIcon, IonPage } from '@ionic/vue'
import { motion } from 'motion-v'
import Reveal from '@/components/ui/Reveal.vue'
import SceneBackdrop from '@/components/ui/SceneBackdrop.vue'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { MOTION_EASE_OUT } from '@/utils/motionTokens'
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

const reduced = useReducedMotion()
const hasHero = computed(() => !isLoading.value && !loadError.value && !!item.value)

/** Persentase naik dari 0 (ease-out kubik, 1 detik) setelah foto dan judul masuk. */
const displayPct = ref(0)
let countRaf = 0
function countTo(target: number) {
  cancelAnimationFrame(countRaf)
  if (reduced.value || target <= 0) {
    displayPct.value = target
    return
  }
  const begin = performance.now() + 600
  const tick = (now: number) => {
    const p = Math.min(1, Math.max(0, (now - begin) / 1000))
    displayPct.value = Math.round(target * (1 - Math.pow(1 - p, 3)))
    if (p < 1) countRaf = requestAnimationFrame(tick)
  }
  countRaf = requestAnimationFrame(tick)
}
watch(
  () => [hasHero.value, percentage.value] as const,
  ([ready, pct]) => {
    if (ready) countTo(pct)
  },
  { immediate: true },
)
onBeforeUnmount(() => cancelAnimationFrame(countRaf))

async function load({ silent = false }: LoadOptions = {}) {
  const id = String(route.params.id || '')
  if (!id) { item.value = null; isLoading.value = false; return }
  if (!silent) {
    isLoading.value = true
    loadError.value = false
  }
  try {
    item.value = await progressService.getProgressById(id)
    loadError.value = false
  } catch (error) {
    console.error('Gagal memuat detail kemajuan:', error)
    if (!silent) loadError.value = true
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
    toast.success('Kabar dihapus.')
    goBack()
  } catch (error) {
    deleteOpen.value = false
    toast.error(error instanceof Error ? error.message : 'Kabar gagal dihapus.')
  } finally {
    deleting.value = false
  }
}

watch(() => route.params.id, (id) => { if (id && route.path.startsWith('/progress/')) void load() })
onMounted(() => load())

useRealtimeRefresh(['progress'], () => load({ silent: true }))

</script>

<style scoped>
.detail-content { --background: var(--app-background, #faf9f6); --padding-bottom: calc(110px + var(--safe-bottom)); }
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

/* =====================================================================
   Rasa Welcome (poliland-design): foto penuh lebar, bukit krem, judul serif
   ===================================================================== */
.detail-content { --background: var(--pl-paper, #f9f5ec); }
.detail-page { position: relative; }
.icon-button { touch-action: manipulation; -webkit-tap-highlight-color: transparent; transition: transform var(--dur-base) var(--ease-spring), background-color var(--dur-fast) var(--ease-out); }
.icon-button:active { transform: scale(0.94); }
.header-title span { color: var(--poliland-gold-text, #966a12); font-size: 11px; letter-spacing: .14em; }

/* Header melayang di atas foto saat data sudah ada */
.detail-page.has-hero { padding-top: 0; }
.detail-page.has-hero .detail-header { position: absolute; z-index: 4; top: 0; left: 0; right: 0; margin: 0; padding: calc(var(--safe-top) + 14px) 16px 0; }
.detail-page.has-hero .icon-button { border-color: rgba(255, 255, 255, .28); background: rgba(27, 40, 22, .42); color: #fff; backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); }
.detail-page.has-hero .icon-button:focus-visible { outline-color: var(--poliland-gold, #cba044); }
.detail-page.has-hero .header-title span { color: var(--poliland-gold-soft, #f4d69a); }
.detail-page.has-hero .header-title strong { color: #fff; text-shadow: 0 1px 8px rgba(27, 40, 22, .5); }

.hero-photo { position: relative; margin: 0 -16px; height: clamp(300px, 48dvh, 400px); aspect-ratio: auto; border-radius: 0; background: var(--green-900, #1f3519); }
.hero-shade { position: absolute; inset: 0; background: linear-gradient(to bottom, rgba(27, 40, 22, .62) 0%, rgba(27, 40, 22, 0) 38%, rgba(27, 40, 22, .35) 100%); pointer-events: none; }
.hero-scene { z-index: 2; }
.hero-empty { background: radial-gradient(90% 70% at 100% 0%, rgba(244, 214, 154, .22) 0%, rgba(244, 214, 154, 0) 60%), linear-gradient(150deg, var(--green-800, #2b4824), var(--green-900, #1f3519)); color: var(--poliland-gold-soft, #f4d69a); font-size: 56px; }

.summary { position: relative; z-index: 3; margin-top: -6px; }
.status-chip { font-size: 12px; }
.title-mask { overflow: hidden; margin: 14px 0 0; padding-bottom: .1em; }
.title-inner { display: block; will-change: transform; }
.summary h1 { color: var(--text-primary, #252525); font-family: var(--font-display, 'Fraunces Variable', Georgia, serif); font-size: clamp(30px, 8.4vw, 38px); line-height: 1.1; font-weight: 650; letter-spacing: -.02em; }

/* Pencapaian: panel hijau hutan dengan angka emas */
.progress-block {
  margin-top: 22px;
  padding: 22px 20px;
  border: 0;
  border-radius: 24px;
  background:
    radial-gradient(90% 80% at 100% 0%, rgba(244, 214, 154, .24) 0%, rgba(244, 214, 154, 0) 60%),
    linear-gradient(155deg, var(--green-700, #355a2c) 0%, var(--green-900, #1f3519) 100%);
  box-shadow: var(--shadow-md);
}
.progress-top { color: var(--on-forest, #f4f1e8); font-size: 14px; }
.progress-top strong { color: var(--poliland-gold-soft, #f4d69a); font-family: var(--font-display, 'Fraunces Variable', Georgia, serif); font-size: 52px; line-height: 1; font-weight: 650; letter-spacing: -.02em; font-variant-numeric: tabular-nums; }
.track { height: 12px; margin-top: 16px; background: rgba(255, 255, 255, .16); }
.fill { background: linear-gradient(90deg, var(--poliland-gold, #cba044), var(--poliland-gold-soft, #f4d69a)); transform-origin: left; animation: bar-grow 900ms var(--ease-out) 650ms backwards; }
.description { margin-top: 22px; color: var(--text-primary, #252525); font-family: var(--font-display, 'Fraunces Variable', Georgia, serif); font-size: clamp(18px, 5vw, 20px); line-height: 1.6; font-weight: 450; }
.description.muted { font-family: var(--font-ui, 'Plus Jakarta Sans', sans-serif); font-size: 15px; }

@keyframes bar-grow { from { transform: scaleX(0); } }

@media (prefers-reduced-motion: reduce) {
  .fill { animation: none; }
  .icon-button:active { transform: none; }
}
</style>
