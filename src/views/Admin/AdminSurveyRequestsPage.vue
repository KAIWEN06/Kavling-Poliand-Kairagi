<template>
  <ion-page class="survey-page">
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />
    <ion-content :fullscreen="true">
      <main class="survey-shell">
        <Reveal :order="1">
          <header class="survey-intro">
            <h1>Permintaan survei</h1>
            <p>Konfirmasi atau tolak permintaan survei lokasi dari klien. Jam yang bisa dipilih klien diatur di Kelola konten, tab Jam Operasional.</p>
          </header>
        </Reveal>
        <p v-if="notice" class="notice" :class="noticeType" :role="noticeType === 'error' ? 'alert' : 'status'">{{ notice }}</p>
    <section id="survey-list-top" class="panel survey-admin-panel">
      <div v-if="!surveysLoading && !surveysError && surveyRequests.length" class="survey-filters" role="tablist" aria-label="Filter status survei">
        <button v-for="f in surveyFilters" :key="f.key" type="button" role="tab" class="survey-filter" :class="{ active: surveyFilter === f.key }" :aria-selected="surveyFilter === f.key" @click="surveyFilter = f.key">
          {{ f.label }}<span class="survey-filter-count">{{ f.count }}</span>
        </button>
      </div>
      <div v-if="surveysLoading" class="survey-empty" role="status" aria-live="polite">Memuat permintaan survei…</div>
      <div v-else-if="surveysError" class="survey-empty survey-error" role="alert">
        <strong>Permintaan survei gagal dimuat</strong>
        <p>{{ surveysError }}</p>
        <button class="secondary" type="button" @click="loadSurveyRequests">Coba lagi</button>
      </div>
      <div v-else-if="pagedSurveyRequests.length" class="survey-request-list">
        <article v-for="request in pagedSurveyRequests" :key="request.id" class="survey-request-row" :class="request.status">
          <div class="survey-request-main">
            <div class="survey-request-top">
              <strong>{{ requestLotNumber(request) }}</strong>
              <span class="request-status" :class="request.status">{{ surveyStatusLabel(request.status) }}</span>
            </div>
            <span class="survey-request-when">{{ formatSurveyDate(request.scheduled_at) }}</span>
            <p v-if="request.note" class="survey-request-note">{{ request.note }}</p>
            <small>Diajukan {{ formatSurveyDate(request.created_at) }}</small>
          </div>
          <div class="survey-request-actions">
            <template v-if="request.status === 'pending'">
              <button class="primary" type="button" :disabled="updatingSurveyId === request.id" @click="changeSurveyStatus(request, 'confirmed')">Konfirmasi</button>
              <button class="danger" type="button" :disabled="updatingSurveyId === request.id" @click="openRejectSurvey(request)">Tolak</button>
            </template>
            <template v-else-if="request.status === 'confirmed'">
              <button class="primary" type="button" :disabled="updatingSurveyId === request.id" @click="changeSurveyStatus(request, 'completed')">Tandai Selesai</button>
              <button class="danger" type="button" :disabled="updatingSurveyId === request.id" @click="changeSurveyStatus(request, 'cancelled')">Batalkan</button>
            </template>
            <p v-if="request.status === 'rejected' && request.rejection_reason" class="survey-rejection-reason"><strong>Alasan:</strong> {{ request.rejection_reason }}</p>
          </div>
        </article>
      </div>
      <div v-else class="survey-empty">{{ surveyRequests.length ? 'Tidak ada permintaan dengan status ini.' : 'Belum ada permintaan survei.' }}</div>
      <nav v-if="filteredSurveyRequests.length > 0 && totalSurveyPages > 1" class="survey-pager" aria-label="Halaman permintaan survei">
        <div class="survey-pager-controls">
          <button type="button" class="survey-pager-btn" aria-label="Halaman sebelumnya" :disabled="surveyCurrentPage === 1" @click="goToSurveyPage(surveyCurrentPage - 1)">‹</button>
          <button v-for="(page, pageIndex) in visibleSurveyPages" :key="page ?? `ellipsis-${pageIndex}`" type="button" class="survey-pager-number" :class="{ active: page === surveyCurrentPage }" :disabled="page === null" :aria-current="page === surveyCurrentPage ? 'page' : undefined" :aria-label="page === null ? undefined : `Halaman ${page}`" @click="page !== null && goToSurveyPage(page)">{{ page ?? '…' }}</button>
          <button type="button" class="survey-pager-btn" aria-label="Halaman berikutnya" :disabled="surveyCurrentPage === totalSurveyPages" @click="goToSurveyPage(surveyCurrentPage + 1)">›</button>
        </div>
        <span class="survey-pager-position">Halaman {{ surveyCurrentPage }} dari {{ totalSurveyPages }}</span>
      </nav>
    </section>
      </main>
    </ion-content>
    <MobileTabBar variant="admin" />
    <AppModal
      v-model="rejectSurveyOpen"
      title="Tolak permintaan survei"
      variant="dialog"
      confirm-text="Tolak permintaan"
      confirm-variant="danger"
      :confirm-disabled="!rejectionReason.trim()"
      :loading="updatingSurveyId !== null"
      @confirm="confirmRejectSurvey"
    >
      <label class="survey-rejection-field">Alasan penolakan *
        <textarea v-model="rejectionReason" rows="4" maxlength="500" placeholder="Tuliskan alasan penolakan agar jelas bagi Klien." />
      </label>
      <small class="survey-rejection-count">{{ rejectionReason.length }}/500 karakter</small>
    </AppModal>
  </ion-page>
</template>

<script setup lang="ts">
import Reveal from '@/components/ui/Reveal.vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { surveyService, type AdminSurveyRequest } from '@/services/surveyService'

const route = useRoute()

const notice = ref('')
const noticeType = ref<'success' | 'error'>('success')
let noticeTimer: number | undefined
function showNotice(message: string, type: 'success' | 'error' = 'success') {
  notice.value = message
  noticeType.value = type
  window.clearTimeout(noticeTimer)
  noticeTimer = window.setTimeout(() => { notice.value = '' }, type === 'error' ? 6000 : 3500)
}
onBeforeUnmount(() => window.clearTimeout(noticeTimer))

const surveyRequests = ref<AdminSurveyRequest[]>([])
const surveysLoading = ref(false)
const surveysError = ref('')
const updatingSurveyId = ref<string | null>(null)
const rejectSurveyOpen = ref(false)
const rejectSurveyTarget = ref<AdminSurveyRequest | null>(null)
const rejectionReason = ref('')

function requestLotNumber(request: AdminSurveyRequest) {
  const raw = request.lots
  const lot = Array.isArray(raw) ? raw[0] : raw
  return lot?.lot_number || `Kavling #${request.lot_id}`
}
function formatSurveyDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(new Date(value)) + ' WITA'
}
function surveyStatusLabel(status: AdminSurveyRequest['status']) {
  return ({ pending: 'Menunggu', confirmed: 'Dikonfirmasi', rejected: 'Ditolak', cancelled: 'Dibatalkan', completed: 'Selesai' })[status]
}

const SURVEY_PAGE_SIZE = 10
const surveyCurrentPage = ref(1)
const surveyFilter = ref<'all' | AdminSurveyRequest['status']>('all')
const surveyFilters = computed(() => {
  const count = (status: AdminSurveyRequest['status']) => surveyRequests.value.filter((request) => request.status === status).length
  return [
    { key: 'all' as const, label: 'Semua', count: surveyRequests.value.length },
    { key: 'pending' as const, label: 'Menunggu', count: count('pending') },
    { key: 'confirmed' as const, label: 'Dikonfirmasi', count: count('confirmed') },
    { key: 'completed' as const, label: 'Selesai', count: count('completed') },
    { key: 'rejected' as const, label: 'Ditolak', count: count('rejected') },
    { key: 'cancelled' as const, label: 'Dibatalkan', count: count('cancelled') },
  ]
})
const filteredSurveyRequests = computed(() => surveyFilter.value === 'all' ? surveyRequests.value : surveyRequests.value.filter((request) => request.status === surveyFilter.value))
watch(surveyFilter, () => { surveyCurrentPage.value = 1 })
const totalSurveyPages = computed(() => Math.max(1, Math.ceil(filteredSurveyRequests.value.length / SURVEY_PAGE_SIZE)))
const pagedSurveyRequests = computed(() => {
  const start = (surveyCurrentPage.value - 1) * SURVEY_PAGE_SIZE
  return filteredSurveyRequests.value.slice(start, start + SURVEY_PAGE_SIZE)
})
const visibleSurveyPages = computed<(number | null)[]>(() => {
  const total = totalSurveyPages.value
  const page = surveyCurrentPage.value
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1)
  const pages: (number | null)[] = [1]
  const start = Math.max(2, page - 1)
  const end = Math.min(total - 1, page + 1)
  if (start > 2) pages.push(null)
  for (let p = start; p <= end; p += 1) pages.push(p)
  if (end < total - 1) pages.push(null)
  pages.push(total)
  return pages
})
watch([filteredSurveyRequests, totalSurveyPages], () => {
  if (surveyCurrentPage.value > totalSurveyPages.value) surveyCurrentPage.value = totalSurveyPages.value
  if (surveyCurrentPage.value < 1) surveyCurrentPage.value = 1
})

async function goToSurveyPage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), totalSurveyPages.value)
  if (nextPage === surveyCurrentPage.value) return
  surveyCurrentPage.value = nextPage
  await nextTick()
  document.querySelector('#survey-list-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

async function loadSurveyRequests() {
  surveysLoading.value = true
  surveysError.value = ''
  try {
    surveyRequests.value = await surveyService.getAdminRequests()
  } catch (error) {
    surveysError.value = error instanceof Error ? error.message : 'Gagal memuat permintaan survei.'
  } finally {
    surveysLoading.value = false
  }
}

async function changeSurveyStatus(request: AdminSurveyRequest, status: AdminSurveyRequest['status'], reason: string | null = null) {
  updatingSurveyId.value = request.id
  try {
    await surveyService.updateAdminRequestStatus(request.id, status, reason)
    request.status = status
    request.rejection_reason = status === 'rejected' ? reason : null
    showNotice(
      status === 'confirmed' ? 'Jadwal survei berhasil dikonfirmasi.'
        : status === 'completed' ? 'Survei berhasil ditandai selesai.'
        : status === 'rejected' ? 'Permintaan survei ditolak. Slot kembali tersedia.'
        : 'Jadwal survei dibatalkan. Slot kembali tersedia.',
    )
  } catch (error) {
    const err = error as { message?: string; details?: string; hint?: string }
    const detail = [err.message, err.details, err.hint].filter(Boolean).join(' — ')
    showNotice(detail || 'Gagal memperbarui status survei. Periksa izin Admin dan fungsi RPC database.', 'error')
  } finally {
    updatingSurveyId.value = null
  }
}

function openRejectSurvey(request: AdminSurveyRequest) {
  rejectSurveyTarget.value = request
  rejectionReason.value = ''
  rejectSurveyOpen.value = true
}

async function confirmRejectSurvey() {
  if (!rejectSurveyTarget.value || !rejectionReason.value.trim()) return
  rejectSurveyOpen.value = false
  await changeSurveyStatus(rejectSurveyTarget.value, 'rejected', rejectionReason.value)
  rejectSurveyTarget.value = null
  rejectionReason.value = ''
}

/** Terapkan ?status=pending|confirmed|... agar halaman langsung membuka filter yang dituju. */
const SURVEY_FILTER_KEYS = ['pending', 'confirmed', 'completed', 'rejected', 'cancelled'] as const
function applyRouteQuery() {
  const status = route.query.status
  surveyFilter.value = (SURVEY_FILTER_KEYS as readonly unknown[]).includes(status) ? (status as AdminSurveyRequest['status']) : 'all'
}
watch(() => route.query.status, applyRouteQuery)
onIonViewWillEnter(() => { applyRouteQuery(); void loadSurveyRequests() })
onMounted(() => { applyRouteQuery(); void loadSurveyRequests() })
</script>

<style scoped>
.survey-page { color: var(--text-primary); }
.survey-shell { min-height: 100%; max-width: 1100px; margin: auto; padding: 20px 16px calc(112px + env(safe-area-inset-bottom)); background: var(--app-background); }
.survey-intro { margin-bottom: 16px; }
.survey-intro h1 { margin: 0; font-size: clamp(22px, 5.5vw, 30px); font-weight: 800; letter-spacing: -.01em; }
.survey-intro p { margin: 6px 0 0; max-width: 62ch; color: var(--text-secondary); font-size: 13px; line-height: 1.55; }
.notice { position: sticky; top: 8px; z-index: 5; margin: 0 0 14px; padding: 12px 14px; border-radius: var(--radius-control); font-size: 13px; line-height: 1.5; box-shadow: 0 2px 10px rgba(37, 37, 37, .08); }
.notice.success { background: var(--status-success-bg); color: var(--poliland-green); }
.notice.error { background: #fff0ef; color: var(--status-danger); }
.panel { padding: 18px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.panel-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.panel h2 { margin: 0; font-size: 20px; }
.panel p { margin: 5px 0 18px; color: var(--text-secondary); font-size: 13px; }
.primary, .secondary, .danger { min-height: 44px; padding: 0 14px; border: 1px solid var(--border-default); border-radius: var(--radius-control); font: inherit; font-size: 12px; font-weight: 700; white-space: nowrap; cursor: pointer; }
.primary { background: var(--poliland-green); border-color: var(--poliland-green); color: #fff; }
.secondary { background: var(--surface-muted); color: var(--text-primary); }
.danger { background: transparent; color: var(--status-danger); border-color: color-mix(in srgb, var(--status-danger) 35%, var(--border-default)); }
.primary:disabled, .danger:disabled { cursor: not-allowed; opacity: .55; }
input, textarea { inline-size: 100%; box-sizing: border-box; padding: 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 13px; }
input:focus-visible, textarea:focus-visible { outline: 3px solid color-mix(in srgb, var(--poliland-green) 25%, transparent); border-color: var(--poliland-green); }
.survey-filters { display: flex; gap: 8px; overflow-x: auto; margin: 0 0 14px; padding-bottom: 4px; scrollbar-width: thin; }
.survey-filter { display: inline-flex; align-items: center; gap: 7px; min-height: 44px; padding: 0 12px; border: 1px solid var(--border-default); border-radius: 99px; background: var(--surface-primary); color: var(--text-secondary); font: inherit; font-size: 12px; font-weight: 700; white-space: nowrap; cursor: pointer; }
.survey-filter.active { border-color: var(--poliland-green); background: var(--poliland-green); color: #fff; }
.survey-filter-count { min-inline-size: 20px; padding: 1px 6px; border-radius: 99px; background: var(--surface-muted); color: var(--text-secondary); font-size: 11px; text-align: center; }
.survey-filter.active .survey-filter-count { background: rgba(255, 255, 255, .22); color: #fff; }
.survey-filter:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.survey-request-list { display: grid; gap: 10px; }
.survey-request-row { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding: 14px 16px; border: 1px solid var(--border-default); border-left: 4px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); }
.survey-request-row.pending { border-left-color: #a16207; }
.survey-request-row.confirmed, .survey-request-row.completed { border-left-color: var(--poliland-green); }
.survey-request-row.rejected { border-left-color: var(--status-danger); }
.survey-request-main { display: grid; gap: 5px; min-width: 0; flex: 1; }
.survey-request-top { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
.survey-request-main strong { font-size: 15px; }
.survey-request-when { font-size: 13px !important; font-weight: 700; color: var(--text-primary) !important; font-variant-numeric: tabular-nums; }
.survey-request-main small { font-size: 11px; color: var(--text-secondary); }
.survey-request-main p.survey-request-note { margin: 2px 0; padding: 7px 10px; border-radius: 8px; background: var(--surface-muted); font-size: 12px; line-height: 1.45; color: var(--text-secondary); }
.survey-request-actions { display: flex; flex-wrap: wrap; align-items: center; justify-content: flex-end; gap: 8px; }
.request-status { padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 800; background: var(--surface-muted); white-space: nowrap; }
.request-status.pending { color: #a16207; background: #fbf4df; }
.request-status.confirmed { color: var(--poliland-green); }
.request-status.rejected, .request-status.cancelled { color: var(--text-secondary); }
.request-status.completed { color: var(--poliland-green); background: var(--status-success-bg); }
.survey-rejection-reason { flex-basis: 100%; margin: 4px 0 0 !important; color: var(--status-danger) !important; font-size: 11px !important; }
.survey-rejection-field { display: grid !important; gap: 6px; color: var(--text-primary); font-size: 12px; font-weight: 700; }
.survey-rejection-field textarea { resize: vertical; }
.survey-rejection-count { display: block; margin-top: 6px; color: var(--text-secondary); font-size: 11px; }
.survey-empty { padding: 30px 12px; text-align: center; color: var(--text-secondary); font-size: 13px; }
.survey-empty strong { display: block; margin-bottom: 6px; color: var(--text-primary); }
.survey-empty p { margin: 0 0 12px !important; }
.survey-error { border: 1px solid color-mix(in srgb, var(--status-danger) 25%, var(--border-default)); border-radius: var(--radius-control); background: #fff7f6; }
.survey-pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 14px; }
.survey-pager-controls { display: flex; align-items: center; gap: 6px; }
.survey-pager-btn, .survey-pager-number { min-inline-size: 44px; min-block-size: 44px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; font-weight: 700; cursor: pointer; }
.survey-pager-number.active { border-color: var(--poliland-green); background: var(--poliland-green); color: #fff; }
.survey-pager-btn:disabled, .survey-pager-number:disabled { cursor: not-allowed; opacity: .45; }
.survey-pager-btn:focus-visible, .survey-pager-number:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.survey-pager-position { color: var(--text-secondary); font-size: 12px; }
@media (max-width: 680px) {
  .panel { padding: 14px; }
  .survey-request-row { flex-direction: column; align-items: stretch; }
  .survey-request-actions { justify-content: stretch; }
  .survey-request-actions button { flex: 1; }
  .survey-pager { align-items: flex-start; flex-direction: column; }
  .survey-pager-controls { inline-size: 100%; justify-content: center; }
  .survey-pager-position { inline-size: 100%; text-align: center; }
}
</style>
