<template>
  <ion-page class="reviews-admin">
    <AppHeader variant="admin" />

    <ion-content :fullscreen="true">
      <main class="shell">
        <PageBackButton fallback="/admin/lainnya" />
        <header class="intro">
          <h1>Ulasan Pelanggan</h1>
          <p>Periksa ulasan klien sebelum ditampilkan di halaman Beranda.</p>
          <AppButton class="terms-open" size="small" variant="neutral" fill="outline" @click="openTerms">Kelola kata terlarang</AppButton>
        </header>

        <nav class="tabs" aria-label="Status ulasan">
          <button
            v-for="t in TABS"
            :key="t.key"
            type="button"
            :class="{ active: tab === t.key }"
            :aria-pressed="tab === t.key"
            @click="setTab(t.key)"
          >
            {{ t.label }}
            <span v-if="counts" class="tab-count">{{ counts[t.key] }}</span>
          </button>
        </nav>

        <p v-if="loadError" class="state state--error" role="alert">
          {{ loadError }} <button type="button" class="link" @click="load">Coba lagi</button>
        </p>
        <SkeletonCardList v-else-if="loading && !items.length" :count="4" :lines="3" label="Memuat ulasan" />
        <p v-else-if="!items.length" class="state">Tidak ada ulasan pada tab ini.</p>

        <ul v-else class="list">
          <li v-for="r in items" :key="r.id" class="card" :class="{ 'card--flag': r.needs_attention }">
            <header class="card-head">
              <ReviewAvatar :src="r.client_avatar_url" :name="r.client_name" />
              <div class="who">
                <p class="name">{{ r.client_name }}</p>
                <time class="meta" :datetime="r.created_at">{{ formatDate(r.created_at) }}</time>
              </div>
              <StatusBadge :tone="STATUS_TONE[r.status]" :label="STATUS_LABEL[r.status]" size="sm" />
            </header>

            <div class="rating-row">
              <StarRating :model-value="r.rating" readonly :size="16" />
              <span class="meta">{{ r.recommend ? 'Merekomendasikan' : 'Tidak merekomendasikan' }}</span>
            </div>
            <h2 class="title">{{ r.title }}</h2>
            <p class="content">{{ r.content }}</p>

            <ul v-if="r.photo_urls.length" class="photos" aria-label="Foto pendukung">
              <li v-for="(p, i) in r.photo_urls" :key="p">
                <a v-if="photoUrls[p]" :href="photoUrls[p]" target="_blank" rel="noopener noreferrer">
                  <img :src="photoUrls[p]" :alt="`Foto pendukung ${i + 1}`" loading="lazy" />
                </a>
              </li>
            </ul>

            <div v-if="r.needs_attention" class="alert" role="note">
              <strong>Perlu pemeriksaan:</strong>
              {{ r.flag_reasons.map((f) => FLAG_LABEL[f] ?? f).join(', ') }}
            </div>
            <p v-if="r.status === 'rejected' && r.rejection_reason" class="reason">
              <strong>Alasan penolakan:</strong> {{ r.rejection_reason }}
            </p>
            <p v-if="r.report_count > 0" class="reports-chip">{{ r.report_count }} laporan terbuka</p>

            <div class="actions">
              <AppButton v-if="r.status === 'pending' || r.status === 'rejected'" size="small" variant="success" :loading="busyId === r.id" @click="moderate(r, 'approve')">Setujui</AppButton>
              <AppButton v-if="r.status !== 'rejected'" size="small" variant="danger" fill="outline" :disabled="busyId === r.id" @click="askNote(r, 'reject')">Tolak</AppButton>
              <AppButton v-if="r.status === 'approved'" size="small" variant="neutral" fill="outline" :disabled="busyId === r.id" @click="askNote(r, 'hide')">Sembunyikan</AppButton>
              <AppButton v-if="r.status === 'hidden'" size="small" variant="neutral" fill="outline" :disabled="busyId === r.id" @click="moderate(r, 'restore')">Tampilkan lagi</AppButton>
              <AppButton v-if="r.report_count > 0" size="small" variant="neutral" fill="outline" :disabled="busyId === r.id" @click="moderate(r, 'dismiss_reports')">Abaikan laporan</AppButton>
              <AppButton size="small" variant="danger" fill="clear" :disabled="busyId === r.id" @click="askNote(r, 'delete')">Hapus</AppButton>
              <AppButton size="small" variant="neutral" fill="clear" @click="toggleDetail(r.id)">
                {{ expanded.has(r.id) ? 'Tutup detail' : 'Lihat detail' }}
              </AppButton>
            </div>

            <section v-if="expanded.has(r.id)" class="detail">
              <dl class="facts">
                <div><dt>Helpful</dt><dd>{{ r.helpful_count }}</dd></div>
                <div v-if="r.approved_at"><dt>Disetujui</dt><dd>{{ formatDate(r.approved_at) }}<template v-if="r.approved_by_name"> oleh {{ r.approved_by_name }}</template></dd></div>
              </dl>

              <h3>Laporan pengguna</h3>
              <ul v-if="r.reports.length" class="mini">
                <li v-for="rp in r.reports" :key="rp.id">
                  <strong>{{ REPORT_LABEL[rp.reason] ?? rp.reason }}</strong>
                  <span class="meta"> · {{ rp.reporter_name }} · {{ formatDate(rp.created_at) }} · {{ REPORT_STATUS[rp.status] }}</span>
                  <p v-if="rp.details">{{ rp.details }}</p>
                </li>
              </ul>
              <p v-else class="meta">Belum ada laporan.</p>

              <h3>Riwayat moderasi</h3>
              <ul v-if="r.history.length" class="mini">
                <li v-for="(h, i) in r.history" :key="i">
                  <strong>{{ ACTION_LABEL[h.action] ?? h.action }}</strong>
                  <span class="meta"> · {{ h.admin_name }} · {{ formatDate(h.created_at) }}</span>
                  <p v-if="h.note">{{ h.note }}</p>
                </li>
              </ul>
              <p v-else class="meta">Belum ada tindakan.</p>
            </section>
          </li>
        </ul>

        <nav v-if="totalPages > 1" class="pager" aria-label="Halaman ulasan">
          <AppButton size="small" variant="neutral" fill="outline" :disabled="page <= 1 || loading" @click="goTo(page - 1)">Sebelumnya</AppButton>
          <span class="meta">Halaman {{ page }} dari {{ totalPages }}</span>
          <AppButton size="small" variant="neutral" fill="outline" :disabled="page >= totalPages || loading" @click="goTo(page + 1)">Berikutnya</AppButton>
        </nav>
      </main>
    </ion-content>

    <AppModal
      v-model="termsOpen"
      title="Kata terlarang"
      cancel-text="Tutup"
      :show-confirm="false"
    >
      <div class="terms">
        <p class="terms-note">
          Kata yang cocok hanya menandai ulasan sebagai "perlu pemeriksaan". Ulasan tidak pernah ditolak atau
          dipublikasikan otomatis, karena konteks kata bisa berbeda.
        </p>

        <form class="terms-add" @submit.prevent="addTerm">
          <AppInput v-model="newTerm" label="Kata atau frasa" placeholder="Contoh: kata kasar" />
          <label class="form-label">
            Kategori
            <select v-model="newCategory">
              <option v-for="(label, key) in CATEGORY_LABEL" :key="key" :value="key">{{ label }}</option>
            </select>
          </label>
          <AppButton class="terms-submit" type="submit" :loading="termsBusy" :disabled="!newTerm.trim() || termsBusy">Tambah kata</AppButton>
        </form>

        <p v-if="termsError" class="state state--error terms-msg" role="alert">{{ termsError }}</p>

        <div class="terms-head">
          <h3>Daftar kata</h3>
          <span v-if="!termsLoading" class="meta">{{ activeTermCount }} aktif dari {{ terms.length }}</span>
        </div>

        <p v-if="termsLoading" class="state terms-msg">Memuat…</p>
        <p v-else-if="!terms.length" class="state terms-msg">Belum ada kata terlarang. Tambahkan kata pertama di atas.</p>
        <ul v-else class="terms-list">
          <li v-for="t in terms" :key="t.id" class="term" :class="{ 'term--off': !t.is_active }">
            <div class="term-main">
              <span class="term-text">{{ t.term }}</span>
              <span class="term-cat">{{ CATEGORY_LABEL[t.category] }}</span>
            </div>
            <div class="term-actions">
              <button
                type="button"
                class="switch"
                role="switch"
                :aria-checked="t.is_active"
                :aria-label="`${t.is_active ? 'Nonaktifkan' : 'Aktifkan'} kata ${t.term}`"
                :disabled="termsBusy"
                @click="toggleTerm(t)"
              >
                <span class="switch-thumb" />
              </button>
              <button type="button" class="term-delete" :aria-label="`Hapus kata ${t.term}`" :disabled="termsBusy" @click="deleteTerm(t)">Hapus</button>
            </div>
          </li>
        </ul>
      </div>
    </AppModal>

    <AppModal
      v-model="noteOpen"
      :title="noteTitle"
      variant="dialog"
      :confirm-text="noteConfirm"
      confirm-variant="danger"
      :loading="noteSubmitting"
      :confirm-disabled="noteRequired && !note.trim()"
      @confirm="confirmNote"
    >
      <label class="note-field">
        {{ noteRequired ? 'Alasan (wajib, ditampilkan kepada tim)' : 'Catatan (opsional)' }}
        <textarea v-model="note" rows="4" maxlength="500" />
      </label>
    </AppModal>

    <MobileTabBar variant="admin" />
  </ion-page>
</template>

<script setup lang="ts">
import SkeletonCardList from '@/components/ui/skeletons/SkeletonCardList.vue'
import { computed, onMounted, ref } from 'vue'
import { IonContent, IonPage } from '@ionic/vue'
import AppHeader from '@/components/common/AppHeader.vue'
import PageBackButton from '@/components/ui/PageBackButton.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppInput from '@/components/ui/AppInput.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import type { BadgeTone } from '@/components/ui/StatusBadge.vue'
import ReviewAvatar from '@/components/reviews/ReviewAvatar.vue'
import StarRating from '@/components/reviews/StarRating.vue'
import { reviewModerationService } from '@/services/Admin/reviewModerationService'
import { reviewErrorMessage, resolveReviewPhotoUrls } from '@/services/reviewService'
import { useToast } from '@/composables/useToast'
import type {
  AdminReview,
  BlockedTerm,
  BlockedTermCategory,
  AdminReviewTab,
  ModerationAction,
  ReviewStatus,
} from '@/types/review'

const PAGE_SIZE = 20
const TABS: { key: AdminReviewTab; label: string }[] = [
  { key: 'all', label: 'Semua Ulasan' },
  { key: 'pending', label: 'Menunggu Persetujuan' },
  { key: 'published', label: 'Dipublikasikan' },
  { key: 'rejected', label: 'Ditolak' },
  { key: 'reported', label: 'Dilaporkan' },
]

const STATUS_LABEL: Record<ReviewStatus, string> = {
  pending: 'Menunggu',
  approved: 'Dipublikasikan',
  rejected: 'Ditolak',
  hidden: 'Disembunyikan',
}
const STATUS_TONE: Record<ReviewStatus, BadgeTone> = {
  pending: 'warning',
  approved: 'success',
  rejected: 'danger',
  hidden: 'neutral',
}
const FLAG_LABEL: Record<string, string> = {
  tautan: 'memuat tautan',
  nomor_telepon: 'memuat nomor telepon',
  email: 'memuat email',
  karakter_berulang: 'karakter berulang (indikasi spam)',
  huruf_kapital_berlebihan: 'huruf kapital berlebihan',
  kata_profanity: 'kata kasar',
  kata_hate: 'indikasi ujaran kebencian',
  kata_spam: 'indikasi spam atau promosi',
  kata_scam: 'indikasi penipuan',
}
const REPORT_LABEL: Record<string, string> = {
  abusive: 'Kata kasar atau penghinaan',
  hate: 'Ujaran kebencian',
  spam: 'Spam atau promosi',
  personal_info: 'Informasi pribadi',
  irrelevant: 'Tidak berhubungan',
  scam: 'Penipuan atau tautan mencurigakan',
  other: 'Lainnya',
}
const REPORT_STATUS: Record<string, string> = { open: 'terbuka', dismissed: 'diabaikan', actioned: 'ditindaklanjuti' }
const ACTION_LABEL: Record<string, string> = {
  approve: 'Disetujui',
  reject: 'Ditolak',
  hide: 'Disembunyikan',
  restore: 'Ditampilkan kembali',
  delete: 'Dihapus',
  dismiss_reports: 'Laporan diabaikan',
}

const CATEGORY_LABEL: Record<BlockedTermCategory, string> = {
  profanity: 'Kata kasar',
  hate: 'Ujaran kebencian',
  spam: 'Spam / promosi',
  scam: 'Penipuan',
}

const toast = useToast()
const photoUrls = ref<Record<string, string>>({})

const termsOpen = ref(false)
const terms = ref<BlockedTerm[]>([])
const termsLoading = ref(false)
const termsBusy = ref(false)
const termsError = ref('')
const newTerm = ref('')
const newCategory = ref<BlockedTermCategory>('profanity')
const tab = ref<AdminReviewTab>('pending')
const page = ref(1)
const items = ref<AdminReview[]>([])
const total = ref(0)
const counts = ref<Record<AdminReviewTab, number> | null>(null)
const loading = ref(false)
const loadError = ref('')
const busyId = ref<string | null>(null)
const expanded = ref(new Set<string>())

const noteOpen = ref(false)
const noteAction = ref<ModerationAction>('reject')
const noteTarget = ref<AdminReview | null>(null)
const note = ref('')
const noteSubmitting = ref(false)

const activeTermCount = computed(() => terms.value.filter((t) => t.is_active).length)
const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE))
const noteRequired = computed(() => noteAction.value === 'reject')
const noteTitle = computed(
  () => ({ reject: 'Tolak ulasan', hide: 'Sembunyikan ulasan', delete: 'Hapus ulasan' } as Record<string, string>)[noteAction.value] ?? 'Konfirmasi',
)
const noteConfirm = computed(
  () => ({ reject: 'Tolak', hide: 'Sembunyikan', delete: 'Hapus' } as Record<string, string>)[noteAction.value] ?? 'Simpan',
)

const formatDate = (iso: string) =>
  new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(iso))

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    const result = await reviewModerationService.list(tab.value, page.value, PAGE_SIZE)
    items.value = result.items
    total.value = result.total
    counts.value = result.counts
    const paths = result.items.flatMap((r) => r.photo_urls)
    if (paths.length) {
      resolveReviewPhotoUrls(paths)
        .then((map) => { photoUrls.value = { ...photoUrls.value, ...map } })
        .catch((e) => console.error('Foto ulasan gagal dimuat.', e))
    }
    if (!result.items.length && result.total > 0 && page.value > 1) {
      page.value = Math.ceil(result.total / PAGE_SIZE)
      await load()
    }
  } catch (error) {
    console.error('Gagal memuat ulasan.', error)
    loadError.value = reviewErrorMessage(error, 'Ulasan gagal dimuat.')
  } finally {
    loading.value = false
  }
}

function setTab(key: AdminReviewTab) {
  tab.value = key
  page.value = 1
  load()
}

function goTo(next: number) {
  page.value = next
  load()
}

function toggleDetail(id: string) {
  const next = new Set(expanded.value)
  if (!next.delete(id)) next.add(id)
  expanded.value = next
}

async function moderate(review: AdminReview, action: ModerationAction, noteText?: string) {
  busyId.value = review.id
  try {
    await reviewModerationService.moderate(review.id, action, noteText)
    toast.success(`Ulasan: ${ACTION_LABEL[action]?.toLowerCase() ?? 'diperbarui'}.`)
    await load()
    return true
  } catch (error) {
    toast.error(reviewErrorMessage(error, 'Tindakan gagal. Silakan coba lagi.'))
    return false
  } finally {
    busyId.value = null
  }
}

function askNote(review: AdminReview, action: ModerationAction) {
  noteTarget.value = review
  noteAction.value = action
  note.value = ''
  noteOpen.value = true
}

async function confirmNote() {
  if (!noteTarget.value || noteSubmitting.value) return
  noteSubmitting.value = true
  const ok = await moderate(noteTarget.value, noteAction.value, note.value)
  noteSubmitting.value = false
  if (ok) noteOpen.value = false
}

async function loadTerms() {
  termsLoading.value = true
  termsError.value = ''
  try {
    terms.value = await reviewModerationService.listTerms()
  } catch (error) {
    console.error('Gagal memuat kata terlarang.', error)
    termsError.value = 'Daftar kata terlarang gagal dimuat.'
  } finally {
    termsLoading.value = false
  }
}

function openTerms() {
  termsOpen.value = true
  loadTerms()
}

async function runTermAction(action: () => Promise<void>, fallback: string) {
  termsBusy.value = true
  termsError.value = ''
  try {
    await action()
    await loadTerms()
  } catch (error) {
    const raw = String((error as { message?: string })?.message ?? '')
    termsError.value = /duplicate|unique/i.test(raw) ? 'Kata tersebut sudah ada dalam daftar.' : fallback
  } finally {
    termsBusy.value = false
  }
}

async function addTerm() {
  const term = newTerm.value.trim()
  if (!term) return
  await runTermAction(async () => {
    await reviewModerationService.addTerm(term, newCategory.value)
    newTerm.value = ''
  }, 'Kata gagal ditambahkan.')
}

const toggleTerm = (t: BlockedTerm) =>
  runTermAction(() => reviewModerationService.setTermActive(t.id, !t.is_active), 'Perubahan gagal disimpan.')

const deleteTerm = (t: BlockedTerm) =>
  runTermAction(() => reviewModerationService.removeTerm(t.id), 'Kata gagal dihapus.')

onMounted(load)
</script>

<style scoped>
.reviews-admin { color: var(--text-primary); font-family: var(--font-primary); }
.shell { min-height: 100%; padding: 22px 16px calc(112px + env(safe-area-inset-bottom)); background: var(--app-background); }
.intro { margin-bottom: 16px; }
.eyebrow { margin: 0 0 4px; color: var(--poliland-green); font-size: var(--font-size-xs); font-weight: var(--font-weight-bold); letter-spacing: 0.08em; text-transform: uppercase; }
.intro h1 { margin: 0; font-family: var(--font-display); font-size: var(--text-2xl); }
.intro p:last-child { margin: 6px 0 0; color: var(--text-secondary); font-size: var(--font-size-sm); }

.tabs { display: flex; gap: 8px; margin-bottom: 16px; padding-bottom: 4px; overflow-x: auto; scrollbar-width: none; }
.tabs button {
  display: inline-flex; align-items: center; gap: 6px; flex: none;
  padding: 8px 14px; border: 1px solid var(--border-default); border-radius: var(--radius-pill);
  background: var(--surface-primary); color: var(--text-secondary);
  font: inherit; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); cursor: pointer;
}
.tabs button.active { border-color: var(--poliland-green); background: var(--green-100); color: var(--poliland-green); }
.tabs button:focus-visible { outline: none; box-shadow: var(--ring-focus); }
.tab-count { padding: 0 6px; border-radius: var(--radius-pill); background: var(--surface-sunken); font-size: var(--font-size-xs); font-variant-numeric: tabular-nums; }

.state { margin: 24px 0; color: var(--text-secondary); font-size: var(--font-size-sm); text-align: center; }
.state--error { color: var(--danger-text); }
.link { padding: 0; border: 0; background: none; color: var(--poliland-green); font: inherit; text-decoration: underline; cursor: pointer; }

.list { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
.card { padding: 16px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); box-shadow: var(--shadow-sm); }
.card--flag { border-color: var(--gold-500); }
.card-head { display: flex; align-items: center; gap: 12px; margin-bottom: 12px; }
.who { min-width: 0; flex: 1; }
.name { margin: 0; font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); overflow-wrap: anywhere; }
.meta { color: var(--text-secondary); font-size: var(--font-size-xs); }
.rating-row { display: flex; align-items: center; gap: 10px; margin-bottom: 6px; }
.title { margin: 0 0 4px; font-size: var(--font-size-base); font-weight: var(--font-weight-semibold); overflow-wrap: anywhere; }
.content { margin: 0; color: var(--text-secondary); font-size: var(--font-size-sm); line-height: var(--leading-body); white-space: pre-line; overflow-wrap: anywhere; }

.photos { display: flex; flex-wrap: wrap; gap: 8px; margin: 12px 0 0; padding: 0; list-style: none; }
.photos img { display: block; width: 80px; height: 80px; border: 1px solid var(--border-default); border-radius: var(--radius-sm); object-fit: cover; }

.alert { margin-top: 12px; padding: 10px 12px; border-radius: var(--radius-sm); background: var(--warning-bg); color: var(--warning-text); font-size: var(--font-size-xs); line-height: 1.5; }
.reason { margin: 12px 0 0; color: var(--danger-text); font-size: var(--font-size-xs); }
.reports-chip { display: inline-block; margin: 12px 0 0; padding: 2px 10px; border-radius: var(--radius-pill); background: var(--danger-bg); color: var(--danger-text); font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); }

.actions { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }

.detail { margin-top: 14px; padding-top: 14px; border-top: 1px solid var(--border-default); }
.detail h3 { margin: 14px 0 6px; font-size: var(--font-size-sm); }
.facts { display: flex; flex-wrap: wrap; gap: 16px; margin: 0; }
.facts div { display: grid; gap: 2px; }
.facts dt { color: var(--text-secondary); font-size: var(--font-size-xs); }
.facts dd { margin: 0; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }
.mini { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; font-size: var(--font-size-sm); }
.mini p { margin: 2px 0 0; color: var(--text-secondary); font-size: var(--font-size-xs); overflow-wrap: anywhere; }

.terms-open { margin-top: 12px; }
.terms { display: grid; gap: 12px; min-width: 0; }
.terms-note { margin: 0; color: var(--text-secondary); font-size: 11px; line-height: 1.5; }
.terms-msg { margin: 0; }

.terms-add { display: grid; gap: 12px; }
.form-label { display: grid; gap: 6px; color: var(--text-secondary); font-size: 10px; font-weight: 600; }
.form-label select {
  width: 100%; min-height: 44px; box-sizing: border-box; padding: 0 10px;
  border: 1px solid var(--border-default); border-radius: var(--radius-control);
  background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 11px;
}
.form-label select:focus { outline: none; border-color: var(--poliland-green); box-shadow: var(--ring-focus); }
.terms-submit { width: 100%; }

.terms-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; padding-top: 4px; border-top: 1px solid var(--border-default); }
.terms-head h3 { margin: 12px 0 0; font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); }
.terms-head .meta { margin-top: 12px; font-variant-numeric: tabular-nums; }

.terms-list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; max-height: 42dvh; overflow-y: auto; overscroll-behavior: contain; }
.term { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-sm); background: var(--surface-primary); }
.term-main { display: grid; gap: 2px; min-width: 0; flex: 1; }
.term-text { font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); line-height: 1.35; overflow-wrap: anywhere; }
.term-cat { color: var(--text-secondary); font-size: var(--font-size-xs); line-height: 1.3; }
.term--off { background: var(--surface-sunken); }
.term--off .term-text { color: var(--text-tertiary); text-decoration: line-through; }

.term-actions { display: flex; flex: none; align-items: center; gap: 4px; }
.switch {
  position: relative; flex: none; width: 44px; height: 44px; padding: 0; border: 0; background: none; cursor: pointer;
}
.switch::before {
  content: ''; position: absolute; top: 50%; left: 50%; width: 38px; height: 22px; transform: translate(-50%, -50%);
  border-radius: var(--radius-pill); background: var(--border-strong, var(--border-default)); transition: background-color var(--dur-fast) var(--ease-out);
}
.switch-thumb {
  position: absolute; top: 50%; left: 50%; width: 16px; height: 16px; margin: -8px 0 0 -16px;
  border-radius: 50%; background: #fff; box-shadow: var(--shadow-sm); transition: transform var(--dur-fast) var(--ease-out);
}
.switch[aria-checked='true']::before { background: var(--poliland-green); }
.switch[aria-checked='true'] .switch-thumb { transform: translateX(16px); }
.switch:focus-visible { outline: none; }
.switch:focus-visible::before { box-shadow: var(--ring-focus); }
.switch:disabled { opacity: 0.5; cursor: not-allowed; }
.term-delete {
  min-height: 44px; padding: 0 8px; border: 0; background: none; color: var(--danger-text);
  font: inherit; font-size: var(--font-size-xs); font-weight: var(--font-weight-semibold); cursor: pointer;
}
@media (hover: hover) and (pointer: fine) {
  .term-delete:hover { text-decoration: underline; }
}
.term-delete:focus-visible { outline: none; box-shadow: var(--ring-focus); border-radius: var(--radius-sm); }
.term-delete:disabled { opacity: 0.5; cursor: not-allowed; }

@media (prefers-reduced-motion: reduce) {
  .switch::before, .switch-thumb { transition: none; }
}

.pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 16px; }

.note-field { display: grid; gap: 6px; font-size: var(--font-size-sm); font-weight: var(--font-weight-medium); }
.note-field textarea {
  width: 100%; box-sizing: border-box; padding: 10px 12px;
  border: 1px solid var(--border-default); border-radius: var(--radius-sm);
  background: var(--surface-muted); color: var(--text-primary); font: inherit;
}
.note-field textarea:focus { outline: none; border-color: var(--poliland-green); box-shadow: var(--ring-focus); }

@media (min-width: 768px) {
  .shell { max-width: 880px; margin: 0 auto; }
}
</style>
