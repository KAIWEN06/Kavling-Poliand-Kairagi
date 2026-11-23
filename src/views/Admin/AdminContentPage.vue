<template>
  <ion-page class="cms-page"><AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />
    <ion-content :fullscreen="true"><main class="cms-shell">
      
      <p v-if="notice" class="notice" :class="noticeType" role="status">{{ notice }}</p>
      <section v-if="loading" class="state">Memuat data konten…</section>
      <template v-else>
        <section v-if="current === 'home'" class="panel"><div class="panel-heading"><div><h2>Beranda</h2><p>Hero dan keunggulan yang tampil di halaman utama.</p></div><button class="primary" type="button" :disabled="saving" @click="saveHome">{{ saving ? 'Menyimpan…' : 'Simpan perubahan' }}</button></div>
          <div class="form-grid"><label>Judul utama<input v-model="hero.title" required></label><label>Subjudul<input v-model="hero.subtitle"></label><label class="wide">Deskripsi<textarea v-model="hero.description" rows="3"></textarea></label><label>Teks tombol<input v-model="hero.cta_text"></label><label>Tujuan tombol<input v-model="hero.cta_url" type="url"></label><label class="wide">Gambar utama<input type="file" accept="image/jpeg,image/png,image/webp" @change="selectHeroImage"><img v-if="heroPreview || hero.image_url" :src="heroPreview || hero.image_url || ''" alt="Pratinjau hero" class="hero-preview"></label></div>
          <div class="subheading"><h3>Keunggulan</h3><button class="secondary" type="button" @click="addFeature">Tambah keunggulan</button></div><div v-for="(feature, index) in features" :key="feature.id || index" class="feature-row"><input v-model="feature.icon" aria-label="Icon"><input v-model="feature.title" aria-label="Judul keunggulan" placeholder="Judul"><input v-model="feature.description" aria-label="Deskripsi keunggulan" placeholder="Deskripsi"><input v-model.number="feature.sort_order" aria-label="Urutan" type="number" min="0"><button class="danger" type="button" @click="removeFeature(feature, index)">Hapus</button></div>
        </section>
        <section v-else-if="current === 'surveys'" id="survey-list-top" class="panel survey-admin-panel">
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
              <button
                v-for="page in visibleSurveyPages"
                :key="page ?? `ellipsis-${surveyCurrentPage}`"
                type="button"
                class="survey-pager-number"
                :class="{ active: page === surveyCurrentPage }"
                :disabled="page === null"
                :aria-current="page === surveyCurrentPage ? 'page' : undefined"
                :aria-label="page === null ? undefined : `Halaman ${page}`"
                @click="page !== null && goToSurveyPage(page)"
              >{{ page ?? '…' }}</button>
              <button type="button" class="survey-pager-btn" aria-label="Halaman berikutnya" :disabled="surveyCurrentPage === totalSurveyPages" @click="goToSurveyPage(surveyCurrentPage + 1)">›</button>
            </div>
            <span class="survey-pager-position">Halaman {{ surveyCurrentPage }} dari {{ totalSurveyPages }}</span>
          </nav>
        </section>
        <section v-else-if="current === 'hours'" class="panel hours-panel">
          <div class="panel-heading"><div><h2>Jam Operasional</h2><p>Atur hari dan rentang waktu yang dapat dipilih Client untuk meminta survei lokasi. Zona waktu menggunakan WITA (Asia/Makassar).</p></div><button class="primary" type="button" :disabled="hoursSaving" @click="saveHours">{{ hoursSaving ? 'Menyimpan…' : 'Simpan jam operasional' }}</button></div>
          <div class="hours-list">
            <article v-for="day in DAY_OPTIONS" :key="day.key" class="hours-row">
              <div class="hours-day"><strong>{{ day.label }}</strong><span>{{ operatingHours.days[day.key].closed ? 'Libur' : 'Buka' }}</span></div>
              <label class="closed-toggle"><input v-model="operatingHours.days[day.key].closed" type="checkbox"> Tutup</label>
              <div class="hours-time-fields">
                <label>Mulai<input v-model="operatingHours.days[day.key].open" type="time" :disabled="operatingHours.days[day.key].closed"></label>
                <span class="time-separator">sampai</span>
                <label>Selesai<input v-model="operatingHours.days[day.key].close" type="time" :disabled="operatingHours.days[day.key].closed"></label>
              </div>
            </article>
          </div>
          <p class="hours-help">Aktifkan hari yang menerima kunjungan dan atur jam buka/tutup terlebih dahulu. Client hanya akan melihat slot pada hari yang dibuka. Slot dibuat setiap 1 jam dan tetap perlu dikonfirmasi Admin.</p>
        </section>
        <CmsCrudPanel v-else :type="current" @notify="showNotice" />
      </template>
    </main></ion-content><MobileTabBar variant="admin" />
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
        <textarea v-model="rejectionReason" rows="4" maxlength="500" placeholder="Tuliskan alasan penolakan agar jelas bagi Client." />
      </label>
      <small class="survey-rejection-count">{{ rejectionReason.length }}/500 karakter</small>
    </AppModal>
  </ion-page>
</template>
<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'; import { IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue'; import { useRoute } from 'vue-router'; import AppHeader from '@/components/common/AppHeader.vue'; import MobileTabBar from '@/components/common/MobileTabBar.vue'; import CmsCrudPanel from '@/components/Admin/CmsCrudPanel.vue'; import { cmsService, type CmsFeature, type CmsHero } from '@/services/cmsService'; import { contactsService, DAY_OPTIONS, createDefaultOperatingHours, type OperatingHoursConfig } from '@/services/contactService'; import { surveyService, type AdminSurveyRequest } from '@/services/surveyService'
import AppModal from '@/components/ui/AppModal.vue'
const route = useRoute()
const tabs = [{ key: 'home', label: 'Beranda' }, { key: 'gallery', label: 'Gallery' }, { key: 'progress', label: 'Progress' }, { key: 'faq', label: 'FAQ' }, { key: 'contact', label: 'Kontak' }, { key: 'hours', label: 'Jam Operasional' }] as const
type CmsTab = typeof tabs[number]['key'] | 'surveys'
const current = ref<CmsTab>('home'); const loading = ref(true); const saving = ref(false); const notice = ref(''); const noticeType = ref('success'); const hero = reactive<CmsHero>({ title: '', subtitle: '', description: '', cta_text: 'Hubungi Kami', cta_url: '/contact', is_active: true }); const features = ref<CmsFeature[]>([]); const heroPreview = ref(''); const selectedImage = ref<File | null>(null); const hoursSaving = ref(false); const operatingHours = ref<OperatingHoursConfig>(createDefaultOperatingHours()); const surveyRequests = ref<AdminSurveyRequest[]>([]); const surveysLoading = ref(false); const surveysError = ref(''); const updatingSurveyId = ref<string | null>(null)
const rejectSurveyOpen = ref(false)
const rejectSurveyTarget = ref<AdminSurveyRequest | null>(null)
const rejectionReason = ref('')
function showNotice(message: string, type = 'success') { notice.value = message; noticeType.value = type; window.setTimeout(() => notice.value = '', 3500) }
async function load() { try { const [savedHero, savedFeatures, savedHours] = await Promise.all([cmsService.getHero(true), cmsService.getFeatures(), contactsService.getOperatingHours()]); if (savedHero) Object.assign(hero, savedHero); features.value = savedFeatures; operatingHours.value = savedHours } catch (e) { showNotice(e instanceof Error ? e.message : 'Gagal memuat konten.', 'error') } finally { loading.value = false } }
watch(current, (tab) => { if (tab === 'surveys') loadSurveyRequests() })
const SURVEY_FILTER_KEYS = ['pending', 'confirmed', 'completed', 'rejected', 'cancelled'] as const
/** Terapkan ?tab=surveys&status=pending|confirmed|... agar halaman langsung membuka tab/filter yang dituju. */
function applyRouteQuery() {
  const { tab, status } = route.query
  current.value = tab === 'surveys' ? 'surveys' : 'home'
  if (tab === 'surveys') {
    surveyFilter.value = (SURVEY_FILTER_KEYS as readonly unknown[]).includes(status) ? (status as AdminSurveyRequest['status']) : 'all'
  }
}
watch(() => [route.query.tab, route.query.status], applyRouteQuery)
onIonViewWillEnter(applyRouteQuery)
function requestLotNumber(request: AdminSurveyRequest) { const raw = request.lots; const lot = Array.isArray(raw) ? raw[0] : raw; return lot?.lot_number || `Kavling #${request.lot_id}` }
function formatSurveyDate(value: string) { return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(new Date(value)) + ' WITA' }
function surveyStatusLabel(status: AdminSurveyRequest['status']) { return ({ pending: 'Menunggu', confirmed: 'Dikonfirmasi', rejected: 'Ditolak', cancelled: 'Dibatalkan', completed: 'Selesai' })[status] }
const SURVEY_PAGE_SIZE = 10
const surveyCurrentPage = ref(1)
const surveyFilter = ref<'all' | AdminSurveyRequest['status']>('all')
const surveyFilters = computed(() => {
  const count = (st: AdminSurveyRequest['status']) => surveyRequests.value.filter((q) => q.status === st).length
  return [
    { key: 'all' as const, label: 'Semua', count: surveyRequests.value.length },
    { key: 'pending' as const, label: 'Menunggu', count: count('pending') },
    { key: 'confirmed' as const, label: 'Dikonfirmasi', count: count('confirmed') },
    { key: 'completed' as const, label: 'Selesai', count: count('completed') },
    { key: 'rejected' as const, label: 'Ditolak', count: count('rejected') },
    { key: 'cancelled' as const, label: 'Dibatalkan', count: count('cancelled') },
  ]
})
const filteredSurveyRequests = computed(() => surveyFilter.value === 'all' ? surveyRequests.value : surveyRequests.value.filter((q) => q.status === surveyFilter.value))
watch(surveyFilter, () => { surveyCurrentPage.value = 1 })
const totalSurveyPages = computed(() => Math.max(1, Math.ceil(filteredSurveyRequests.value.length / SURVEY_PAGE_SIZE)))
const pagedSurveyRequests = computed(() => {
  const start = (surveyCurrentPage.value - 1) * SURVEY_PAGE_SIZE
  return filteredSurveyRequests.value.slice(start, start + SURVEY_PAGE_SIZE)
})
const visibleSurveyPages = computed<(number | null)[]>(() => {
  const total = totalSurveyPages.value
  const currentPage = surveyCurrentPage.value
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1)
  const pages: (number | null)[] = [1]
  const start = Math.max(2, currentPage - 1)
  const end = Math.min(total - 1, currentPage + 1)
  if (start > 2) pages.push(null)
  for (let page = start; page <= end; page += 1) pages.push(page)
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
  } catch (e) {
    surveysError.value = e instanceof Error ? e.message : 'Gagal memuat permintaan survei.'
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
      status === 'confirmed'
        ? 'Jadwal survei berhasil dikonfirmasi.'
        : status === 'completed'
          ? 'Survei berhasil ditandai selesai.'
          : status === 'rejected'
            ? 'Permintaan survei ditolak. Slot kembali tersedia.'
            : 'Jadwal survei dibatalkan. Slot kembali tersedia.'
    )
  } catch (e) {
    const err = e as { message?: string; details?: string; hint?: string; code?: string }
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
function addFeature() { features.value.push({ icon: 'leaf', title: '', description: '', sort_order: features.value.length, is_active: true }) }
async function removeFeature(feature: CmsFeature, index: number) { if (!confirm('Hapus keunggulan ini?')) return; try { if (feature.id) await cmsService.deleteFeature(feature.id); features.value.splice(index, 1); showNotice('Keunggulan dihapus.') } catch (e) { showNotice(e instanceof Error ? e.message : 'Gagal menghapus.', 'error') } }
function selectHeroImage(event: Event) { const file = (event.target as HTMLInputElement).files?.[0]; if (!file) return; selectedImage.value = file; heroPreview.value = URL.createObjectURL(file) }
async function saveHours() { for (const day of DAY_OPTIONS) { const item = operatingHours.value.days[day.key]; if (!item.closed && (!item.open || !item.close || item.open >= item.close)) return showNotice(`Jam operasional ${day.label} tidak valid.`, 'error') } hoursSaving.value = true; try { await contactsService.saveOperatingHours(operatingHours.value); showNotice('Jam operasional berhasil disimpan.') } catch (e) { showNotice(e instanceof Error ? e.message : 'Gagal menyimpan jam operasional.', 'error') } finally { hoursSaving.value = false } }
async function saveHome() { if (!hero.title.trim()) return showNotice('Judul utama wajib diisi.', 'error'); saving.value = true; try { if (selectedImage.value) hero.image_url = await cmsService.uploadImage(selectedImage.value); await cmsService.saveHero(hero); await Promise.all(features.value.map((feature) => cmsService.saveFeature(feature))); showNotice('Konten beranda berhasil disimpan.') } catch (e) { showNotice(e instanceof Error ? e.message : 'Gagal menyimpan konten.', 'error') } finally { saving.value = false } }
onMounted(() => {
  load()
  applyRouteQuery()
})
</script>
<style scoped>
.cms-page{color:var(--text-primary)}.cms-shell{min-height:100%;padding:24px 16px calc(112px + env(safe-area-inset-bottom));background:var(--app-background);max-width:1100px;margin:auto}.cms-intro{margin-bottom:20px}.eyebrow{margin:0 0 5px;color:var(--poliland-green);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.1em}.cms-intro h1{margin:0;font-size:clamp(24px,6vw,34px)}.cms-intro p:last-child{color:var(--text-secondary);font-size:13px}.tabs{display:flex;gap:8px;overflow:auto;margin-bottom:16px;padding-bottom:4px}.tabs button,.secondary,.primary,.danger{min-height:44px;border:1px solid var(--border-default);border-radius:var(--radius-control);padding:0 14px;font:inherit;font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap}.tabs button{background:var(--surface-primary);color:var(--text-secondary)}.tabs button.active,.primary{background:var(--poliland-green);color:white;border-color:var(--poliland-green)}.panel{padding:18px;border:1px solid var(--border-default);border-radius:var(--radius-card);background:var(--surface-primary)}.panel-heading,.subheading{display:flex;align-items:center;justify-content:space-between;gap:12px}.panel h2{margin:0;font-size:20px}.panel p{margin:5px 0 18px;color:var(--text-secondary);font-size:13px}.form-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px}.form-grid label{display:grid;gap:6px;color:var(--text-secondary);font-size:12px;font-weight:700}.form-grid .wide{grid-column:1/-1}input,textarea{width:100%;border:1px solid var(--border-default);border-radius:var(--radius-control);padding:12px;background:var(--surface-primary);color:var(--text-primary);font:inherit;font-size:13px}input:focus,textarea:focus{outline:3px solid color-mix(in srgb,var(--poliland-green) 25%,transparent);border-color:var(--poliland-green)}.hero-preview{width:100%;max-height:220px;object-fit:cover;border-radius:var(--radius-control);margin-top:6px}.subheading{margin:28px 0 12px}.subheading h3{margin:0;font-size:16px}.secondary{background:var(--surface-muted);color:var(--text-primary)}.feature-row{display:grid;grid-template-columns:80px 1fr 2fr 70px auto;gap:8px;margin-bottom:8px}.danger{background:transparent;color:var(--status-danger);border-color:color-mix(in srgb,var(--status-danger) 35%,var(--border-default))}.notice{padding:12px 14px;border-radius:var(--radius-control);font-size:13px}.notice.success{background:var(--status-success-bg);color:var(--poliland-green)}.notice.error{background:#fff0ef;color:var(--status-danger)}.state{padding:48px 16px;text-align:center;color:var(--text-secondary)}.survey-filters{display:flex;gap:8px;overflow-x:auto;margin:0 0 14px;padding-bottom:4px;scrollbar-width:thin}.survey-filter{display:inline-flex;align-items:center;gap:7px;min-height:44px;padding:0 12px;border:1px solid var(--border-default);border-radius:99px;background:var(--surface-primary);color:var(--text-secondary);font:inherit;font-size:12px;font-weight:700;white-space:nowrap;cursor:pointer}.survey-filter.active{border-color:var(--poliland-green);background:var(--poliland-green);color:#fff}.survey-filter-count{min-width:20px;padding:1px 6px;border-radius:99px;background:var(--surface-muted);color:var(--text-secondary);font-size:11px;text-align:center}.survey-filter.active .survey-filter-count{background:rgba(255,255,255,.22);color:#fff}.survey-filter:focus-visible{outline:3px solid var(--poliland-green);outline-offset:2px}
.survey-request-list{display:grid;gap:10px}.survey-request-row{display:flex;justify-content:space-between;align-items:center;gap:16px;padding:14px 16px;border:1px solid var(--border-default);border-left:4px solid var(--border-default);border-radius:var(--radius-control);background:var(--surface-primary);box-shadow:0 1px 3px rgba(37,37,37,.04)}.survey-request-row.pending{border-left-color:#a16207}.survey-request-row.confirmed,.survey-request-row.completed{border-left-color:var(--poliland-green)}.survey-request-row.rejected{border-left-color:var(--status-danger)}.survey-request-main{display:grid;gap:5px;min-width:0;flex:1}.survey-request-top{display:flex;align-items:center;gap:10px;flex-wrap:wrap}.survey-request-main strong{font-size:15px}.survey-request-when{font-size:13px!important;font-weight:700;color:var(--text-primary)!important;font-variant-numeric:tabular-nums}.survey-request-main small{font-size:11px;color:var(--text-secondary)}.survey-request-main p.survey-request-note{margin:2px 0;padding:7px 10px;border-radius:8px;background:var(--surface-muted);font-size:12px;line-height:1.45;color:var(--text-secondary)}.survey-request-actions{display:flex;flex-wrap:wrap;align-items:center;justify-content:flex-end;gap:8px}.survey-request-actions button{min-height:44px;padding:0 14px;font-size:12px}.request-status{padding:3px 10px;border-radius:99px;font-size:11px;font-weight:800;background:var(--surface-muted);white-space:nowrap}.request-status.pending{color:#a16207;background:#fbf4df}.request-status.confirmed{color:var(--poliland-green)}.request-status.rejected,.request-status.cancelled{color:var(--text-secondary)}.request-status.completed{color:var(--poliland-green);background:var(--status-success-bg)}.survey-rejection-reason{flex-basis:100%;margin:4px 0 0!important;color:var(--status-danger)!important;font-size:11px!important}.survey-rejection-field{display:grid!important;gap:6px;color:var(--text-primary);font-size:12px;font-weight:700}.survey-rejection-field textarea{resize:vertical}.survey-rejection-count{display:block;margin-top:6px;color:var(--text-secondary);font-size:11px}.survey-empty{padding:30px 12px;text-align:center;color:var(--text-secondary);font-size:13px}.hours-list{display:grid;gap:10px}.hours-row{display:grid;grid-template-columns:120px 90px minmax(0,1fr);align-items:center;gap:14px;padding:13px;border:1px solid var(--border-default);border-radius:var(--radius-control);background:var(--surface-secondary)}.hours-day{display:grid;gap:3px}.hours-day strong{font-size:13px;color:var(--text-primary)}.hours-day span{font-size:11px;color:var(--text-secondary)}.closed-toggle{display:flex;align-items:center;gap:6px;font-size:12px;color:var(--text-secondary)}.closed-toggle input{width:16px;height:16px;accent-color:var(--poliland-green)}.hours-time-fields{display:flex;align-items:end;gap:10px}.hours-time-fields label{display:grid;gap:5px;flex:1;font-size:11px;font-weight:700;color:var(--text-secondary)}.hours-time-fields input{min-width:0}.hours-time-fields input:disabled{opacity:.45}.time-separator{padding-bottom:12px;font-size:11px;color:var(--text-secondary)}.hours-help{margin:14px 0 0!important;font-size:11px!important;line-height:1.6}@media(max-width:680px){.survey-request-row{flex-direction:column;align-items:stretch}.survey-request-actions{justify-content:stretch}.survey-request-actions button{flex:1}.hours-row{grid-template-columns:1fr auto;gap:10px}.hours-time-fields{grid-column:1/-1}.hours-day{grid-column:1}.closed-toggle{grid-column:2;grid-row:1}}.survey-empty strong{display:block;margin-bottom:6px;color:var(--text-primary)}.survey-empty p{margin:0 0 12px!important}.survey-error{border:1px solid color-mix(in srgb,var(--status-danger) 25%,var(--border-default));border-radius:var(--radius-control);background:#fff7f6}.survey-pager{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:14px}.survey-pager-controls{display:flex;align-items:center;gap:6px}.survey-pager-btn,.survey-pager-number{min-width:44px;min-height:44px;border:1px solid var(--border-default);border-radius:var(--radius-control);background:var(--surface-primary);color:var(--text-primary);font:inherit;font-weight:700;cursor:pointer}.survey-pager-number.active{border-color:var(--poliland-green);background:var(--poliland-green);color:white}.survey-pager-btn:disabled,.survey-pager-number:disabled{cursor:not-allowed;opacity:.45}.survey-pager-position{color:var(--text-secondary);font-size:12px}
.survey-pager-btn:focus-visible,.survey-pager-number:focus-visible{outline:3px solid var(--poliland-green);outline-offset:2px}
@media(max-width:680px){.panel-heading,.subheading{align-items:stretch;flex-direction:column}.form-grid{grid-template-columns:1fr}.form-grid .wide{grid-column:auto}.feature-row{grid-template-columns:1fr 1fr}.feature-row input:nth-child(3){grid-column:1/-1}.feature-row .danger{grid-column:2}.panel{padding:14px}.survey-pager{align-items:flex-start;flex-direction:column}.survey-pager-controls{width:100%;justify-content:center}.survey-pager-position{width:100%;text-align:center}}
</style>
