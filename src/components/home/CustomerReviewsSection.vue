<template>
  <section id="ulasan-client" class="reviews-band" aria-label="Ulasan klien">
    <div class="container">
      <SectionHeader title="Ulasan klien" />
      <p class="subheading">Pengalaman dan cerita mereka bersama PoliLand Kairagi.</p>

      <div class="summary-wrap">
        <ReviewSummaryCard :stats="stats" :loading="statsLoading" @write="openForm()" @rate="openForm" />
      </div>

      <!-- Kontrol daftar -->
      <div class="controls">
        <p class="showing" aria-live="polite">
          <template v-if="!loading || total > 0">
            Menampilkan <span class="strong">{{ formatNumber(total) }}</span> ulasan klien
          </template>
        </p>
        <div class="selects">
          <label class="sr-only" for="review-filter">Saring berdasarkan bintang</label>
          <select id="review-filter" v-model="ratingFilter">
            <option :value="null">Semua bintang</option>
            <option v-for="n in [5, 4, 3, 2, 1]" :key="n" :value="n">{{ n }} bintang</option>
          </select>
          <label class="sr-only" for="review-sort">Urutkan</label>
          <select id="review-sort" v-model="sort">
            <option value="newest">Terbaru</option>
            <option value="oldest">Terlama</option>
            <option value="highest">Bintang terbanyak</option>
            <option value="lowest">Bintang tersedikit</option>
          </select>
        </div>
      </div>

      <!-- Daftar -->
      <div class="list" :aria-busy="loading">
        <template v-if="loading && !reviews.length">
          <div v-for="n in 3" :key="n" class="skeleton-card" aria-hidden="true" />
        </template>

        <p v-else-if="loadError" class="state state--error" role="alert">
          {{ loadError }}
          <button type="button" class="link" @click="loadReviews">Coba lagi</button>
        </p>

        <div v-else-if="!reviews.length" class="state">
          <template v-if="ratingFilter !== null">
            Belum ada ulasan dengan {{ ratingFilter }} bintang.
          </template>
          <template v-else>
            <strong>Belum ada ulasan yang dipublikasikan.</strong>
            Jadilah klien pertama yang membagikan pengalaman bersama PoliLand Kairagi.
            <button type="button" class="link" @click="openForm()">Tulis ulasan</button>
          </template>
        </div>

        <ReviewCard
          v-for="review in reviews"
          v-else
          :key="review.id"
          :review="review"
          :busy="votingId === review.id"
          @helpful="toggleHelpful"
          @report="startReport"
        />
      </div>

      <!-- Pager -->
      <nav v-if="totalPages > 0" class="pager" aria-label="Halaman ulasan">
        <p class="pager-info">
          Halaman <span class="strong">{{ page }}</span> dari <span class="strong">{{ totalPages }}</span>
        </p>
        <div class="pager-controls">
          <button type="button" class="pg pg--start" aria-label="Halaman sebelumnya" :disabled="page <= 1 || loading" @click="goTo(page - 1)">
            <ion-icon :icon="chevronBackOutline" aria-hidden="true" />
          </button>
          <span class="pg pg--label">{{ page }} dari {{ totalPages }}</span>
          <button type="button" class="pg pg--end" aria-label="Halaman berikutnya" :disabled="page >= totalPages || loading" @click="goTo(page + 1)">
            <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
          </button>
        </div>
      </nav>

      <!-- Form -->
      <div v-if="formOpen" id="review-form-anchor" ref="formRef" class="add">
        <h3 class="add-title">Bagikan Pengalaman Anda</h3>
        <p class="add-desc">
          Ceritakan pengalaman Anda bersama PoliLand Kairagi untuk membantu calon pembeli lainnya.
        </p>

        <p v-if="writer.checking" class="state">Memeriksa akun…</p>

        <div v-else-if="!writer.loggedIn" class="gate" role="status">
          <p>Anda perlu masuk terlebih dahulu untuk memberikan ulasan.</p>
          <div class="gate-actions">
            <button type="button" class="btn btn--primary" @click="goLogin">Masuk untuk ulas</button>
            <button type="button" class="btn btn--neutral" @click="formOpen = false">Tutup</button>
          </div>
        </div>

        <div v-else-if="!writer.isClient" class="gate" role="status">
          <p>Ulasan hanya dapat dikirim menggunakan akun Klien.</p>
          <button type="button" class="btn btn--neutral" @click="formOpen = false">Tutup</button>
        </div>

        <template v-else>
          <!-- Ulasan milik sendiri yang sedang menunggu pemeriksaan -->
          <div v-if="myReview?.status === 'pending' && !editing" class="gate" role="status">
            <p>
              Ulasan Anda “{{ myReview.title }}” sedang menunggu pemeriksaan Admin dan akan ditampilkan setelah disetujui.
              Anda masih dapat mengubah atau menghapusnya.
            </p>
            <div class="gate-actions">
              <button type="button" class="btn btn--primary" @click="editing = true">Ubah ulasan</button>
              <button type="button" class="btn btn--neutral" @click="deleteOpen = true">Hapus ulasan</button>
              <button type="button" class="btn btn--neutral" @click="formOpen = false">Tutup</button>
            </div>
          </div>

          <template v-else>
            <!-- Ulasan sebelumnya ditolak: tampilkan alasan -->
            <div v-if="myReview?.status === 'rejected' && !editing" class="gate gate--notice" role="status">
              <p>
                Ulasan Anda “{{ myReview.title }}” belum dapat ditampilkan.
                <template v-if="myReview.rejection_reason">Alasan: {{ myReview.rejection_reason }}</template>
                Anda dapat menulis ulasan baru di bawah.
              </p>
              <div class="gate-actions">
                <button type="button" class="btn btn--neutral" @click="deleteOpen = true">Hapus ulasan lama</button>
              </div>
            </div>

            <ReviewForm
              :key="formKey"
              :initial-rating="presetRating"
              :review="editing ? (myReview ?? undefined) : undefined"
              @submitted="onSubmitted"
              @close="closeForm"
            />
          </template>
        </template>
      </div>
    </div>
  </section>

  <ReviewReportDialog v-model="reportOpen" :review-id="reportId" />

  <AppModal
    v-model="deleteOpen"
    title="Hapus ulasan?"
    variant="dialog"
    confirm-text="Hapus"
    confirm-variant="danger"
    :loading="deleting"
    @confirm="deleteMyReview"
  >
    <p class="delete-copy">Ulasan beserta foto yang Anda unggah akan dihapus permanen. Tindakan ini tidak dapat dibatalkan.</p>
  </AppModal>
</template>

<script setup lang="ts">
import SectionHeader from '@/components/ui/SectionHeader.vue'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { IonIcon } from '@ionic/vue'
import { chevronBackOutline, chevronForwardOutline } from 'ionicons/icons'
import ReviewSummaryCard from '@/components/reviews/ReviewSummaryCard.vue'
import ReviewCard from '@/components/reviews/ReviewCard.vue'
import ReviewForm from '@/components/reviews/ReviewForm.vue'
import ReviewReportDialog from '@/components/reviews/ReviewReportDialog.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { reviewErrorMessage, reviewService } from '@/services/reviewService'
import { useToast } from '@/composables/useToast'
import type { OwnReview, PublicReview, ReviewSort, ReviewStats } from '@/types/review'

const PAGE_SIZE = 5

const router = useRouter()
const toast = useToast()

const stats = ref<ReviewStats | null>(null)
const statsLoading = ref(true)
const reviews = ref<PublicReview[]>([])
const total = ref(0)
const loading = ref(true)
const loadError = ref('')
const page = ref(1)
const ratingFilter = ref<number | null>(null)
const sort = ref<ReviewSort>('newest')
const votingId = ref<string | null>(null)

const formOpen = ref(false)
const formKey = ref(0)
const formRef = ref<HTMLElement | null>(null)
const presetRating = ref(0)
const writer = reactive({ checking: false, loggedIn: false, isClient: false, userId: '' })
const myReview = ref<OwnReview | null>(null)
const editing = ref(false)
const deleteOpen = ref(false)
const deleting = ref(false)

const reportOpen = ref(false)
const reportId = ref<string | null>(null)

const totalPages = computed(() => Math.ceil(total.value / PAGE_SIZE))
const formatNumber = (n: number) => new Intl.NumberFormat('id-ID').format(n)

let loadToken = 0

async function loadStats() {
  statsLoading.value = true
  try {
    stats.value = await reviewService.getStats()
  } catch (error) {
    console.error('Gagal memuat statistik ulasan.', error)
    stats.value = null
  } finally {
    statsLoading.value = false
  }
}

async function loadReviews() {
  const token = ++loadToken
  loading.value = true
  loadError.value = ''
  try {
    const result = await reviewService.getReviews({
      rating: ratingFilter.value,
      sort: sort.value,
      page: page.value,
      pageSize: PAGE_SIZE,
    })
    if (token !== loadToken) return
    reviews.value = result.items
    total.value = result.total
    // Halaman melebihi data (mis. ulasan disembunyikan): kembali ke halaman terakhir.
    if (!result.items.length && result.total > 0 && page.value > 1) {
      page.value = Math.ceil(result.total / PAGE_SIZE)
    }
  } catch (error) {
    if (token !== loadToken) return
    console.error('Gagal memuat ulasan.', error)
    loadError.value = 'Ulasan belum dapat dimuat. Periksa koneksi Anda.'
    reviews.value = []
  } finally {
    if (token === loadToken) loading.value = false
  }
}

function goTo(next: number) {
  page.value = Math.min(Math.max(1, next), Math.max(1, totalPages.value))
}

watch([ratingFilter, sort], () => {
  if (page.value !== 1) page.value = 1
  else loadReviews()
})
watch(page, loadReviews)

async function toggleHelpful(review: PublicReview) {
  if (votingId.value) return
  // Helpful dihitung per akun agar tidak bisa dimanipulasi.
  const { loggedIn } = await reviewService.getWriterState()
  if (!loggedIn) {
    toast.info('Masuk terlebih dahulu untuk menandai ulasan ini membantu.')
    return
  }
  votingId.value = review.id
  try {
    const result = await reviewService.toggleHelpful(review.id)
    review.helpful_count = result.helpful_count
    review.viewer_voted = result.voted
  } catch (error) {
    toast.error(reviewErrorMessage(error, 'Penilaian belum tersimpan. Silakan coba lagi.'))
  } finally {
    votingId.value = null
  }
}

function startReport(review: PublicReview) {
  reportId.value = review.id
  reportOpen.value = true
}

async function openForm(rating = 0) {
  presetRating.value = rating
  formOpen.value = true
  writer.checking = true
  await nextTick()
  formRef.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })

  const state = await reviewService.getWriterState()
  writer.loggedIn = state.loggedIn
  writer.isClient = state.isClient
  writer.userId = state.userId ?? ''
  editing.value = false
  await loadMyReview()
  writer.checking = false
}

async function loadMyReview() {
  myReview.value = null
  if (!writer.isClient || !writer.userId) return
  try {
    myReview.value = await reviewService.getMyLatestReview(writer.userId)
  } catch (error) {
    console.error('Gagal memeriksa ulasan sebelumnya.', error)
  }
}

function closeForm() {
  if (editing.value) editing.value = false
  else formOpen.value = false
}

async function deleteMyReview() {
  if (!myReview.value || deleting.value) return
  deleting.value = true
  try {
    await reviewService.deleteOwn(myReview.value)
    toast.success('Ulasan Anda telah dihapus.')
    deleteOpen.value = false
    editing.value = false
    await loadMyReview()
    formKey.value += 1
  } catch (error) {
    toast.error(reviewErrorMessage(error, 'Ulasan gagal dihapus. Silakan coba lagi.'))
  } finally {
    deleting.value = false
  }
}

function goLogin() {
  router.push({ name: 'Login', query: { redirect: '/home' } })
}

async function onSubmitted(mode: 'create' | 'edit') {
  toast.success(
    mode === 'edit'
      ? 'Perubahan ulasan tersimpan. Ulasan Anda tetap menunggu pemeriksaan Admin.'
      : 'Terima kasih telah memberikan ulasan! Ulasan Anda sedang menunggu pemeriksaan Admin dan akan ditampilkan setelah disetujui.',
  )
  editing.value = false
  formOpen.value = false
  formKey.value += 1
  await loadMyReview()
}

onMounted(() => {
  loadStats()
  loadReviews()
})
</script>

<style scoped>
.reviews-band { width: 100%; padding: 36px 0 8px; background: transparent; color: var(--text-primary); font-family: var(--font-primary); }

.container { max-width: 1024px; margin: 0 auto; padding: 0 20px; }

.subheading { margin: -6px 0 0; color: var(--text-secondary, #5f5f66); font-size: 15px; line-height: 1.55; }

.summary-wrap { margin-top: 20px; }

.controls { display: flex; flex-direction: column; gap: 12px; margin-top: 24px; padding-bottom: 16px; }

.showing { margin: 0; color: var(--text-secondary, #5f5f66); font-size: 14px; }
.strong { font-weight: var(--font-weight-semibold); }

.selects { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }

select { width: 100%; min-height: 48px; padding: 0 40px 0 16px; border: 1px solid var(--border-strong, #d5d0c4); border-radius: 14px; background-color: var(--surface-primary, #fff); background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='9' viewBox='0 0 14 9' fill='none'%3E%3Cpath d='M1 1.5l6 6 6-6' stroke='%23355a2c' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E"); background-repeat: no-repeat; background-position: right 16px center; background-size: 14px 9px; color: var(--text-primary); font: inherit; font-size: 16px; font-weight: 600; text-overflow: ellipsis; -webkit-appearance: none; appearance: none; touch-action: manipulation; }

select:focus { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 2px; border-color: var(--poliland-green); box-shadow: none; }

.list { display: grid; gap: 14px; }

.state { display: grid; gap: var(--space-2); justify-items: start; margin: 0; padding: 22px 18px; border: 1px dashed var(--border-strong, #d5d0c4); border-radius: var(--radius-card, 16px); background: var(--surface-primary, #fff); color: var(--text-secondary, #5f5f66); font-size: 15px; line-height: var(--leading-body); }
.state strong { color: var(--text-primary); }
.state--error { color: var(--danger-text); }

.skeleton-card {
  height: 168px;
  margin: var(--space-6) 0;
  border-radius: var(--radius-md);
  background: var(--surface-sunken);
}

.link { min-height: 44px; padding: 0; border: 0; background: none; color: var(--poliland-green); font: inherit; font-size: 15px; font-weight: 700; text-decoration: underline; text-underline-offset: 3px; cursor: pointer; touch-action: manipulation; }

.pager { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-top: 18px; padding: 10px 10px 10px 18px; border: 1px solid var(--border-default, #eae7e0); border-radius: 16px; background: var(--surface-primary, #fff); box-shadow: var(--shadow-sm); }

.pager-info { margin: 0; color: var(--text-secondary, #5f5f66); font-size: 14px; }
.pager .strong { color: var(--text-primary); }

.pager-controls { display: inline-flex; }

.pg { display: inline-grid; place-items: center; min-width: 44px; min-height: 44px; padding: 0 14px; border: 1px solid var(--border-strong, #d5d0c4); background: var(--surface-primary, #fff); color: var(--text-primary); font: inherit; font-size: 14px; font-weight: 700; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }

button.pg { cursor: pointer; transition: background var(--dur-fast) var(--ease-out); }
@media (hover: hover) and (pointer: fine) {
  button.pg:hover:not(:disabled) { background: var(--surface-muted); }
}
button.pg:disabled { color: var(--text-secondary, #5f5f66); opacity: 0.6; cursor: default; }
button.pg:active:not(:disabled) { background: var(--surface-sunken, #f0ede5); }
button.pg:focus-visible { outline: none; box-shadow: var(--ring-focus); position: relative; z-index: 1; }
.pg--start { border-radius: 12px 0 0 12px; }
.pg--end { border-radius: 0 12px 12px 0; }
.pg--label { margin: 0 -1px; }

.add { margin-top: var(--space-8); scroll-margin-top: var(--space-6); }
.add-title {
  margin: 0;
  color: var(--text-primary);
  font-family: var(--font-display);
  font-size: var(--font-size-xl);
  font-weight: var(--font-weight-semibold);
}
.add-desc { margin: 4px 0 var(--space-4); color: var(--text-secondary); font-size: var(--font-size-sm); }

.gate {
  display: grid;
  gap: var(--space-3);
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--surface-muted);
}
.gate p { margin: 0; color: var(--text-primary); font-size: var(--font-size-sm); line-height: var(--leading-body); }
.gate--notice { margin-bottom: var(--space-4); border-color: var(--gold-500); background: var(--gold-50); }
.delete-copy { margin: 0; color: var(--text-secondary); font-size: var(--font-size-sm); line-height: var(--leading-body); }
.gate-actions { display: flex; flex-wrap: wrap; gap: var(--space-3); }

.btn { min-height: 44px; padding: 0 22px; border-radius: 12px; font: inherit; font-size: 15px; font-weight: 700; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.btn:focus-visible { outline: none; box-shadow: var(--ring-focus); }
.btn--primary { border: 1px solid var(--poliland-green); background: var(--poliland-green); color: #fff; }
@media (hover: hover) and (pointer: fine) {
  .btn--primary:hover { background: var(--green-800); }
}
.btn--neutral { border: 1px solid var(--border-default); background: var(--surface-primary); color: var(--text-primary); }
@media (hover: hover) and (pointer: fine) {
  .btn--neutral:hover { background: var(--surface-muted); }
}

.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; }

@media (min-width: 640px) {
  .controls { flex-direction: row; align-items: center; justify-content: space-between; }
}

@media (min-width: 768px) {
  .reviews-band { padding: var(--space-16) 0; }
}

@media (min-width: 1536px) {
  .container { padding: 0; }
}
</style>
