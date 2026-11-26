<template>
  <ion-page class="survey-page">
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />
    <ion-content :fullscreen="true">
      <main class="survey-shell">
        <div v-if="!surveysLoading && !surveysError && surveyRequests.length" class="survey-filters" role="group" aria-label="Filter status survei">
          <button v-for="f in surveyFilters" :key="f.key" type="button" class="survey-filter" :class="{ active: surveyFilter === f.key }" :aria-pressed="surveyFilter === f.key" @click="surveyFilter = f.key">
            {{ f.label }} <span>{{ f.count }}</span>
          </button>
        </div>
        <div v-if="!surveysError" class="survey-search">
          <ion-icon :icon="searchOutline" aria-hidden="true" />
          <input v-model="query" type="search" inputmode="search" enterkeyhint="search" autocomplete="off" aria-label="Cari pembeli atau kavling" placeholder="Cari nama pembeli atau kavling..." />
          <button v-if="query" type="button" aria-label="Hapus pencarian" @click="query = ''">
            <ion-icon :icon="closeOutline" aria-hidden="true" />
          </button>
        </div>
        <section id="survey-list-top" class="survey-list-wrap" aria-label="Daftar permintaan survei">
          <SkeletonRowList v-if="surveysLoading" :rows="3" :fields="2" :badges="[]" label="Memuat permintaan survei" />
          <div v-else-if="surveysError" class="survey-empty survey-error" role="alert">
            <strong>Permintaan survei gagal dimuat</strong>
            <p>{{ surveysError }}</p>
            <button class="secondary" type="button" @click="loadSurveyRequests()">Coba lagi</button>
          </div>
          <div v-else-if="surveyPager.items.length" class="survey-request-list">
            <article v-for="request in surveyPager.items" :id="`survey-row-${request.id}`" :key="request.id" class="survey-request-row" :class="[request.status, { 'is-target': request.id === targetSurveyId }]">
              <div class="survey-request-top">
                <strong class="survey-lot">{{ requestLotNumber(request) }}</strong>
                <span class="request-status" :class="request.status">{{ surveyStatusLabel(request.status) }}</span>
              </div>
              <button v-if="request.requester?.customerId" type="button" class="survey-buyer" :aria-label="`Lihat data lengkap ${requesterName(request)}`" @click="openBuyer(request.requester.customerId)">
                <span class="survey-buyer-avatar" aria-hidden="true">{{ initials(requesterName(request)) }}</span>
                <span class="survey-buyer-text">
                  <span class="survey-buyer-name">{{ requesterName(request) }}</span>
                  <span v-if="request.requester.phone" class="survey-buyer-phone">{{ request.requester.phone }}</span>
                </span>
                <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
              </button>
              <div v-else class="survey-buyer survey-buyer--static">
                <span class="survey-buyer-avatar" aria-hidden="true">{{ initials(requesterName(request)) }}</span>
                <span class="survey-buyer-text">
                  <span class="survey-buyer-name">{{ requesterName(request) }}</span>
                  <span v-if="request.requester?.phone" class="survey-buyer-phone">{{ request.requester.phone }}</span>
                </span>
              </div>
              <div class="survey-when">
                <ion-icon :icon="calendarOutline" aria-hidden="true" />
                <span><strong>{{ formatSurveyDay(request.scheduled_at) }}</strong> pukul {{ formatSurveyTime(request.scheduled_at) }}</span>
              </div>
              <p v-if="request.note" class="survey-request-note">{{ request.note }}</p>
              <p v-if="request.status === 'rejected' && request.rejection_reason" class="survey-rejection-reason"><strong>Alasan:</strong> {{ request.rejection_reason }}</p>
              <small class="survey-submitted">Diajukan {{ formatSurveyDate(request.created_at) }}</small>
              <div v-if="request.status === 'pending' || request.status === 'confirmed'" class="survey-request-actions">
                <template v-if="request.status === 'pending'">
                  <button class="primary" type="button" :disabled="updatingSurveyId === request.id" @click="changeSurveyStatus(request, 'confirmed')">Konfirmasi</button>
                  <button class="danger" type="button" :disabled="updatingSurveyId === request.id" @click="openRejectSurvey(request)">Tolak</button>
                </template>
                <template v-else>
                  <button class="primary" type="button" :disabled="updatingSurveyId === request.id" @click="changeSurveyStatus(request, 'completed')">Tandai selesai</button>
                  <button class="danger" type="button" :disabled="updatingSurveyId === request.id" @click="changeSurveyStatus(request, 'cancelled')">Batalkan</button>
                </template>
              </div>
            </article>
          </div>
          <div v-else class="survey-empty">
            <ion-icon :icon="searchOutline" aria-hidden="true" />
            <strong>{{ surveyRequests.length ? 'Tidak ada hasil' : 'Belum ada permintaan survei' }}</strong>
            <p v-if="surveyRequests.length">Ubah kata kunci atau pilih status lain.</p>
          </div>
          <AppPagination v-if="!surveysLoading && !surveysError" v-model:page="surveyPager.page" :total-pages="surveyPager.totalPages" :total="surveyPager.total" :page-size="surveyPager.pageSize" scroll-to="#survey-list-top" label="Halaman permintaan survei" />
        </section>
      </main>
    </ion-content>
    <MobileTabBar variant="admin" />
    <AppModal
      guard-unsaved
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
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import { useToast } from '@/composables/useToast'
import SkeletonRowList from '@/components/ui/skeletons/SkeletonRowList.vue'
import Reveal from '@/components/ui/Reveal.vue'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import { usePagination } from '@/composables/usePagination'
import { IonContent, IonIcon, IonPage, onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { calendarOutline, chevronForwardOutline, closeOutline, searchOutline } from 'ionicons/icons'
import { useRoute } from 'vue-router'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { surveyService, type AdminSurveyRequest } from '@/services/surveyService'

const route = useRoute()
const ionRouter = useIonRouter()

const toast = useToast()
function showNotice(message: string, type: 'success' | 'error' = 'success') {
  toast.show(type, message)
}

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
function requesterName(request: AdminSurveyRequest) {
  return request.requester?.name || 'Pembeli belum terdata'
}
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join('') || '?'
}
function openBuyer(customerId: number) {
  ionRouter.push(`/admin/pembeli/${customerId}`)
}
function formatSurveyDay(value: string) {
  return new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Makassar' }).format(new Date(value))
}
function formatSurveyTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Makassar' }).format(new Date(value)).replace('.', ':') + ' WITA'
}
function formatSurveyDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(new Date(value)) + ' WITA'
}
function surveyStatusLabel(status: AdminSurveyRequest['status']) {
  return ({ pending: 'Menunggu', confirmed: 'Dikonfirmasi', rejected: 'Ditolak', cancelled: 'Dibatalkan', completed: 'Selesai' })[status]
}

const SURVEY_PAGE_SIZE = 5
const query = ref('')
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
/** Yang perlu aksi di atas: menunggu, lalu dikonfirmasi (jadwal terdekat dulu); sisanya terbaru dulu. */
const STATUS_RANK: Record<AdminSurveyRequest['status'], number> = { pending: 0, confirmed: 1, completed: 2, rejected: 2, cancelled: 2 }
const sortedSurveyRequests = computed(() => [...surveyRequests.value].sort((a, b) => {
  const rankDiff = STATUS_RANK[a.status] - STATUS_RANK[b.status]
  if (rankDiff !== 0) return rankDiff
  const diff = Date.parse(a.scheduled_at) - Date.parse(b.scheduled_at)
  return STATUS_RANK[a.status] < 2 ? diff : -diff
}))
const filteredSurveyRequests = computed(() => {
  const term = query.value.trim().toLocaleLowerCase('id-ID')
  return sortedSurveyRequests.value.filter((request) => {
    if (surveyFilter.value !== 'all' && request.status !== surveyFilter.value) return false
    if (!term) return true
    return `${requesterName(request)} ${request.requester?.phone ?? ''} ${requestLotNumber(request)}`.toLocaleLowerCase('id-ID').includes(term)
  })
})
const surveyPager = usePagination(filteredSurveyRequests, { pageSize: SURVEY_PAGE_SIZE, resetOn: [surveyFilter, query] })

/** Survei yang dituju dari notifikasi (?surveyId=). Disorot lalu digulir ke tampilan. */
const targetSurveyId = ref('')
let targetTimer: number | undefined
onBeforeUnmount(() => window.clearTimeout(targetTimer))

async function focusTargetSurvey() {
  const raw = route.query.surveyId
  const id = typeof raw === 'string' ? raw : Array.isArray(raw) && typeof raw[0] === 'string' ? raw[0] : ''
  if (!id) return
  if (!surveyRequests.value.some((request) => request.id === id)) return
  surveyFilter.value = 'all'
  query.value = ''
  await nextTick()
  const index = filteredSurveyRequests.value.findIndex((request) => request.id === id)
  if (index < 0) return
  surveyPager.setPage(Math.floor(index / SURVEY_PAGE_SIZE) + 1)
  targetSurveyId.value = id
  await nextTick()
  document.getElementById(`survey-row-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  window.clearTimeout(targetTimer)
  targetTimer = window.setTimeout(() => { targetSurveyId.value = '' }, 4000)
}

async function loadSurveyRequests({ silent = false }: LoadOptions = {}) {
  if (!silent) surveysLoading.value = true
  if (!silent) surveysError.value = ''
  try {
    surveyRequests.value = await surveyService.getAdminRequests()
    surveysError.value = ''
  } catch (error) {
    if (!silent) surveysError.value = error instanceof Error ? error.message : 'Gagal memuat permintaan survei.'
  } finally {
    surveysLoading.value = false
  }
  // Muat ulang otomatis tidak boleh menggulir ulang ke survei tujuan.
  if (!silent) await focusTargetSurvey()
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
        : status === 'rejected' ? 'Permintaan survei ditolak. Sesi kembali tersedia.'
        : 'Jadwal survei dibatalkan. Sesi kembali tersedia.',
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
watch(() => route.query.nt, (stamp) => {
  if (stamp && route.query.surveyId) void loadSurveyRequests()
})
onIonViewWillEnter(() => { applyRouteQuery(); void loadSurveyRequests() })
onMounted(() => { applyRouteQuery(); void loadSurveyRequests() })

useRealtimeRefresh(['survey_requests', 'customers', 'lots'], () => loadSurveyRequests({ silent: true }), {
  pauseWhen: () => rejectSurveyOpen.value,
})

</script>

<style scoped>
.survey-page { color: var(--text-primary); }
.survey-shell { min-height: 100%; max-width: 1100px; margin: auto; padding: 20px 16px calc(112px + var(--safe-bottom)); background: var(--app-background); }
.survey-intro { margin-bottom: 16px; }
.survey-intro h1 { margin: 0; font-size: clamp(22px, 5.5vw, 30px); font-weight: 800; letter-spacing: -.01em; }
.survey-intro p { margin: 6px 0 0; max-width: 62ch; color: var(--text-secondary); font-size: 13px; line-height: 1.55; }
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
.survey-filters { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; margin: 0 -16px 12px; padding: 0 16px 2px; }
.survey-filters::-webkit-scrollbar { display: none; }
.survey-filter { min-height: 44px; padding: 0 14px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 12px; white-space: nowrap; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.survey-filter span { margin-left: 4px; color: var(--text-secondary); }
.survey-filter.active { border-color: var(--poliland-gold); background: var(--poliland-gold-soft); }
.survey-filter.active span { color: var(--poliland-gold-text); }
.survey-filter:active { transform: scale(.97); }
.survey-search { display: flex; align-items: center; gap: 9px; min-height: 46px; margin-bottom: 14px; padding: 0 6px 0 13px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); }
.survey-search:focus-within { border-color: var(--poliland-green); }
.survey-search > ion-icon { color: var(--text-secondary); font-size: 18px; flex: 0 0 auto; }
.survey-search input { min-width: 0; flex: 1; padding: 0; border: 0; border-radius: 0; outline: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 16px; }
.survey-search button { display: inline-flex; align-items: center; justify-content: center; flex: 0 0 auto; width: 44px; height: 44px; border: 0; background: transparent; color: var(--text-secondary); font-size: 18px; }
.survey-request-list { display: grid; gap: 12px; }
.survey-request-row { display: grid; gap: 10px; padding: 14px; border: 1px solid var(--border-default); border-left: 4px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.survey-request-row.is-target { box-shadow: 0 0 0 3px color-mix(in srgb, var(--poliland-green) 35%, transparent); background: color-mix(in srgb, var(--poliland-green) 6%, var(--surface-primary)); }
.survey-request-row.pending { border-left-color: var(--poliland-gold-text); }
.survey-request-row.confirmed, .survey-request-row.completed { border-left-color: var(--poliland-green); }
.survey-request-row.rejected { border-left-color: var(--status-danger); }
.survey-request-top { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.survey-lot { font-size: 16px; }
.survey-buyer { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 52px; padding: 6px 10px 6px 8px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-muted); color: var(--text-primary); font: inherit; text-align: left; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
button.survey-buyer { cursor: pointer; }
button.survey-buyer:active { transform: scale(.98); }
button.survey-buyer:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.survey-buyer--static { border-style: dashed; }
.survey-buyer > ion-icon { flex: 0 0 auto; color: var(--text-secondary); font-size: 18px; }
.survey-buyer-avatar { display: grid; flex: 0 0 36px; width: 36px; height: 36px; place-items: center; border-radius: 50%; background: var(--poliland-green); color: #fff; font-size: 12px; font-weight: 800; }
.survey-buyer-text { display: grid; min-width: 0; flex: 1; gap: 1px; }
.survey-buyer-name { overflow: hidden; font-size: 14px; font-weight: 700; text-overflow: ellipsis; white-space: nowrap; }
button.survey-buyer .survey-buyer-name { text-decoration: underline; text-decoration-color: color-mix(in srgb, var(--poliland-green) 45%, transparent); text-underline-offset: 3px; }
.survey-buyer-phone { color: var(--text-secondary); font-size: 12px; font-variant-numeric: tabular-nums; }
.survey-when { display: flex; align-items: flex-start; gap: 8px; color: var(--text-primary); font-size: 13px; line-height: 1.45; font-variant-numeric: tabular-nums; }
.survey-when ion-icon { flex: 0 0 auto; margin-top: 1px; color: var(--poliland-green); font-size: 18px; }
.survey-request-note { margin: 0; padding: 8px 10px; border-radius: 8px; background: var(--surface-muted); color: var(--text-secondary); font-size: 12px; line-height: 1.45; overflow-wrap: anywhere; }
.survey-submitted { color: var(--text-secondary); font-size: 11px; }
.survey-request-actions { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; border-top: 1px solid var(--border-default); }
.survey-request-actions button { margin-top: 10px; touch-action: manipulation; }
.request-status { padding: 3px 10px; border-radius: 99px; font-size: 11px; font-weight: 800; background: var(--surface-muted); white-space: nowrap; }
.request-status.pending { color: #a16207; background: #fbf4df; }
.request-status.confirmed { color: var(--poliland-green); }
.request-status.rejected, .request-status.cancelled { color: var(--text-secondary); }
.request-status.completed { color: var(--poliland-green); background: var(--status-success-bg); }
.survey-rejection-reason { margin: 0; color: var(--status-danger); font-size: 12px; line-height: 1.45; }
.survey-rejection-field { display: grid !important; gap: 6px; color: var(--text-primary); font-size: 12px; font-weight: 700; }
.survey-rejection-field textarea { resize: vertical; }
.survey-rejection-count { display: block; margin-top: 6px; color: var(--text-secondary); font-size: 11px; }
.survey-empty { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 38px 18px; border: 1px dashed var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); text-align: center; color: var(--text-secondary); font-size: 13px; }
.survey-empty > ion-icon { color: var(--poliland-green); font-size: 28px; }
.survey-empty strong { color: var(--text-primary); }
.survey-empty p { margin: 0; }
.survey-error { border: 1px solid color-mix(in srgb, var(--status-danger) 25%, var(--border-default)); border-radius: var(--radius-control); background: #fff7f6; }
@media (min-width: 720px) {
  .survey-request-list { grid-template-columns: repeat(2, minmax(0, 1fr)); align-items: start; }}</style>
