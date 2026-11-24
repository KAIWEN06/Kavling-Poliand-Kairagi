<template>
  <ion-page class="merge-page">
    <AppHeader variant="admin" />

    <ion-content :fullscreen="true">
      <main class="shell pl-surface">
        <Reveal :order="1">
          <header class="intro">
            <PageBackButton fallback="/admin/lainnya" label="Lainnya" />
            <h1>Data client ganda</h1>
            <p>Pasangan data yang mungkin milik orang yang sama. Periksa, lalu gabungkan.</p>
          </header>
        </Reveal>

        <p v-if="loadError" class="state state--error" role="alert">
          {{ loadError }} <button type="button" class="link" @click="load">Coba lagi</button>
        </p>
        <SkeletonCardList v-else-if="loading" :count="4" :lines="3" label="Memuat data ganda" />

        <section v-else-if="!candidates.length" class="empty" aria-label="Tidak ada data ganda">
          <ion-icon :icon="checkmarkCircleOutline" aria-hidden="true" />
          <strong>Tidak ada data ganda</strong>
          <p>Daftar ini terisi saat nomor, email, atau nama dua client bertepatan.</p>
        </section>

        <template v-else>
          <p class="count" role="status">{{ candidates.length }} pasangan</p>
          <ul class="list" aria-label="Pasangan data ganda">
            <li v-for="pair in visibleCandidates" :key="`${pair.id_a}-${pair.id_b}`" class="card">
              <ul class="chips" aria-label="Alasan kecocokan">
                <li v-for="reason in reasonList(pair.reasons)" :key="reason">
                  <StatusBadge :tone="reasonTone(reason)" :label="capitalize(reason)" size="sm" />
                </li>
              </ul>

              <div class="pair">
                <div class="side">
                  <strong>{{ pair.name_a }}</strong>
                  <small>{{ sourceLabel(pair.source_a) }}</small>
                </div>
                <ion-icon class="pair-link" :icon="swapHorizontalOutline" aria-hidden="true" />
                <div class="side">
                  <strong>{{ pair.name_b }}</strong>
                  <small>{{ sourceLabel(pair.source_b) }}</small>
                </div>
              </div>

              <AppButton size="small" variant="primary" fill="outline" expand="block" @click="openMerge(pair)">
                Tinjau dan gabung
              </AppButton>
            </li>
          </ul>

          <AppButton
            v-if="visibleCount < candidates.length"
            class="more"
            size="small"
            variant="neutral"
            fill="outline"
            @click="visibleCount += PAGE_SIZE"
          >
            Tampilkan lagi
          </AppButton>
        </template>
      </main>
    </ion-content>

    <AppModal
      v-model="mergeOpen"
      title="Gabungkan data"
      confirm-text="Gabungkan"
      confirm-variant="danger"
      slide-confirm
      slide-label="Geser untuk menggabungkan"
      :loading="merging"
      :confirm-disabled="!canMerge"
      @confirm="confirmMerge"
    >
      <p v-if="detailsLoading" class="state" role="status">Memuat rincian...</p>
      <p v-else-if="detailsError" class="state state--error" role="alert">{{ detailsError }}</p>

      <div v-else-if="summaries.length === 2" class="merge-body">
        <div class="choices" role="radiogroup" aria-labelledby="keep-label">
          <p id="keep-label" class="group-label">Data yang dipertahankan</p>
          <button
            v-for="row in summaries"
            :key="row.id"
            type="button"
            role="radio"
            :aria-checked="keepId === row.id"
            :class="['choice', { 'choice--on': keepId === row.id }]"
            @click="keepId = row.id"
          >
            <span class="choice-head">
              <strong>{{ row.full_name }}</strong>
              <StatusBadge v-if="row.user_id" tone="success" label="Punya akun" size="sm" />
            </span>
            <span class="choice-line">{{ row.phone || 'Tanpa nomor HP' }} · {{ row.whatsapp_phone || 'Tanpa WhatsApp' }}</span>
            <span v-if="row.email" class="choice-line">{{ row.email }}</span>
            <span v-if="row.address" class="choice-line choice-line--clamp">{{ row.address }}</span>
            <span class="choice-meta">
              {{ sourceLabel(row.registration_source) }}<template v-if="row.marketing_name"> · Marketing {{ row.marketing_name }}</template>
            </span>
            <span class="choice-meta">{{ row.spk_count }} SPK · {{ row.payment_count }} pembayaran</span>
          </button>
        </div>

        <p class="note">
          Data lainnya dihapus. SPK, pembayaran, dan catatannya pindah ke data yang dipertahankan, dan kolom yang kosong diisi dari data yang dihapus.
        </p>

        <label class="reason">
          Alasan penggabungan (wajib)
          <textarea v-model="reason" rows="3" maxlength="300" placeholder="Contoh: orang yang sama, memakai nomor lama" />
        </label>

        <p v-if="mergeError" class="state state--error" role="alert">{{ mergeError }}</p>
      </div>
    </AppModal>

    <MobileTabBar variant="admin" />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { IonContent, IonIcon, IonPage } from '@ionic/vue'
import { checkmarkCircleOutline, swapHorizontalOutline } from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import PageBackButton from '@/components/ui/PageBackButton.vue'
import Reveal from '@/components/ui/Reveal.vue'
import StatusBadge, { type BadgeTone } from '@/components/ui/StatusBadge.vue'
import SkeletonCardList from '@/components/ui/skeletons/SkeletonCardList.vue'
import { useToast } from '@/composables/useToast'
import { useCelebration } from '@/composables/useCelebration'
import {
  customerMergeService,
  type CustomerSummary,
  type DuplicateCandidate,
} from '@/services/Admin/customerMergeService'

const PAGE_SIZE = 20
const toast = useToast()
const { celebrate } = useCelebration()

const loading = ref(true)
const loadError = ref('')
const candidates = ref<DuplicateCandidate[]>([])
const visibleCount = ref(PAGE_SIZE)
const visibleCandidates = computed(() => candidates.value.slice(0, visibleCount.value))

const mergeOpen = ref(false)
const detailsLoading = ref(false)
const detailsError = ref('')
const summaries = ref<CustomerSummary[]>([])
const keepId = ref<number | null>(null)
const reason = ref('')
const merging = ref(false)
const mergeError = ref('')

const canMerge = computed(() => summaries.value.length === 2 && keepId.value !== null && reason.value.trim().length > 0)

const SOURCE_LABEL: Record<string, string> = { Marketing: 'Dari Marketing', Client: 'Daftar sendiri', Admin: 'Dari Admin' }
const sourceLabel = (source: string) => SOURCE_LABEL[source] ?? source
const reasonList = (reasons: string) => reasons.split(',').map((item) => item.trim()).filter(Boolean)
const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1)

function reasonTone(reason: string): BadgeTone {
  if (reason.startsWith('nomor')) return 'danger'
  if (reason.startsWith('email')) return 'warning'
  return 'neutral'
}

async function load() {
  loading.value = true
  loadError.value = ''
  try {
    candidates.value = await customerMergeService.listCandidates()
    visibleCount.value = PAGE_SIZE
  } catch (error: any) {
    console.error('Gagal memuat kandidat data ganda.', error)
    loadError.value = error?.message || 'Daftar data ganda gagal dimuat. Periksa koneksi lalu coba lagi.'
  } finally {
    loading.value = false
  }
}

// Data yang dipertahankan: yang sudah punya akun, lalu yang paling banyak transaksinya, lalu yang lebih lama.
function pickDefaultKeep(rows: CustomerSummary[]): number {
  const [a, b] = rows
  if (!!a.user_id !== !!b.user_id) return (a.user_id ? a : b).id
  const activityA = a.spk_count + a.payment_count
  const activityB = b.spk_count + b.payment_count
  if (activityA !== activityB) return (activityA > activityB ? a : b).id
  return (a.created_at ?? '') <= (b.created_at ?? '') ? a.id : b.id
}

async function openMerge(pair: DuplicateCandidate) {
  mergeOpen.value = true
  detailsLoading.value = true
  detailsError.value = ''
  mergeError.value = ''
  summaries.value = []
  keepId.value = null
  reason.value = ''
  try {
    const rows = await customerMergeService.getSummaries([pair.id_a, pair.id_b])
    if (rows.length !== 2) throw new Error('Salah satu data sudah tidak ada. Muat ulang daftar.')
    summaries.value = rows
    keepId.value = pickDefaultKeep(rows)
  } catch (error: any) {
    console.error('Gagal memuat rincian data.', error)
    detailsError.value = error?.message || 'Rincian data gagal dimuat. Tutup lalu coba lagi.'
  } finally {
    detailsLoading.value = false
  }
}

async function confirmMerge() {
  if (!canMerge.value || merging.value || keepId.value === null) return
  const dropId = summaries.value.find((row) => row.id !== keepId.value)?.id
  if (dropId === undefined) return
  merging.value = true
  mergeError.value = ''
  try {
    await customerMergeService.merge(keepId.value, dropId, reason.value)
    mergeOpen.value = false
    celebrate({ title: 'Data tergabung', message: 'Dua data klien kini menjadi satu.' })
    await load()
  } catch (error: any) {
    console.error('Gagal menggabungkan data.', error)
    mergeError.value = error?.message || 'Data gagal digabung. Tidak ada yang berubah, silakan coba lagi.'
  } finally {
    merging.value = false
  }
}

onMounted(load)
</script>

<style scoped>
.merge-page { color: var(--text-primary); font-family: var(--font-primary); }
.shell { min-height: 100%; padding: 22px 16px calc(112px + env(safe-area-inset-bottom)); background: var(--app-background); }
.intro { display: grid; gap: 6px; margin-bottom: 18px; }
.intro h1 { margin: 0; font-family: var(--font-display); font-size: var(--text-2xl); line-height: 1.2; }
.intro p { margin: 0; color: var(--text-secondary); font-size: var(--font-size-sm); line-height: 1.5; }

.count { margin: 0 0 10px; color: var(--text-secondary); font-size: var(--font-size-xs); font-variant-numeric: tabular-nums; }

.state { margin: 24px 0; color: var(--text-secondary); font-size: var(--font-size-sm); text-align: center; }
.state--error { color: var(--danger-text); }
.link { min-height: 44px; padding: 0 4px; border: 0; background: none; color: var(--poliland-green); font: inherit; text-decoration: underline; cursor: pointer; touch-action: manipulation; }

.empty { display: grid; justify-items: center; gap: 6px; padding: 40px 16px; text-align: center; }
.empty ion-icon { color: var(--poliland-green); font-size: 40px; }
.empty strong { font-size: var(--font-size-base); }
.empty p { max-width: 30ch; margin: 0; color: var(--text-secondary); font-size: var(--font-size-sm); line-height: 1.5; }

.list { display: grid; gap: 12px; margin: 0; padding: 0; list-style: none; }
.card { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); box-shadow: var(--shadow-sm); }
.chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 0; padding: 0; list-style: none; }

.pair { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr); align-items: center; gap: 10px; }
.side { display: grid; gap: 2px; min-width: 0; }
.side strong { font-size: var(--font-size-sm); line-height: 1.35; overflow-wrap: anywhere; }
.side small { color: var(--text-secondary); font-size: var(--font-size-xs); }
.pair-link { color: var(--text-secondary); font-size: 18px; }

.more { display: block; margin: 16px auto 0; }

.merge-body { display: grid; gap: 14px; min-width: 0; }
.choices { display: grid; gap: 10px; }
.group-label { margin: 0; font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); }
.choice {
  display: grid; gap: 4px; min-height: 44px; padding: 12px 14px; border: 2px solid var(--border-default);
  border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary);
  font: inherit; text-align: left; cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent;
  transition: border-color var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out), transform var(--dur-fast) var(--ease-spring);
}
.choice:active { transform: scale(0.98); }
.choice:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.choice--on { border-color: var(--poliland-green); background: var(--status-success-bg); }
@media (hover: hover) and (pointer: fine) {
  .choice:hover:not(.choice--on) { border-color: var(--poliland-green); }
}
.choice-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.choice-head strong { font-size: var(--font-size-sm); overflow-wrap: anywhere; }
.choice-line { color: var(--text-primary); font-size: var(--font-size-xs); overflow-wrap: anywhere; }
.choice-line--clamp { display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.choice-meta { color: var(--text-secondary); font-size: var(--font-size-xs); }

.note { margin: 0; color: var(--text-secondary); font-size: var(--font-size-xs); line-height: 1.55; }
.reason { display: grid; gap: 6px; color: var(--text-primary); font-size: var(--font-size-sm); font-weight: var(--font-weight-semibold); }
.reason textarea {
  width: 100%; box-sizing: border-box; padding: 10px 12px; border: 1px solid var(--border-default);
  border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary);
  font: inherit; font-size: 16px; font-weight: 400; line-height: 1.45; resize: vertical;
}
.reason textarea:focus { outline: none; border-color: var(--poliland-green); box-shadow: var(--ring-focus); }

@media (max-width: 380px) {
  .pair { grid-template-columns: 1fr; }
  .pair-link { justify-self: start; transform: rotate(90deg); }
}

@media (prefers-reduced-motion: reduce) {
  .choice { transition: none; }
}
</style>
