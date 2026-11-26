<template>
  <div class="spt" :aria-busy="loading">
    <div v-if="loading" class="spt-state" role="status">Memuat tahapan proses...</div>

    <div v-else-if="error" class="spt-state spt-state--error" role="alert">
      <strong>Tahapan proses belum bisa dimuat</strong>
      <p>{{ error }}</p>
      <button type="button" class="spt-link" @click="load()">Coba lagi</button>
    </div>

    <div v-else-if="!steps.length" class="spt-state">
      <strong>Tahapan belum dimulai</strong>
      <p>Tahapan muncul setelah SPK disetujui dan tanda jadi terverifikasi.</p>
    </div>

    <template v-else>
      <header class="spt-summary" :class="{ 'spt-summary--done': allDone }">
        <div>
          <span class="spt-summary-label">{{ allDone ? 'Proses selesai' : 'Sekarang' }}</span>
          <strong>{{ allDone ? 'Sertifikat sudah diserahkan' : SPK_STEP_INFO[current!.key].title }}</strong>
        </div>
        <span class="spt-count">{{ doneCount }} dari {{ steps.length }} selesai</span>
      </header>

      <p class="spt-lot-state">
        Status kavling:
        <strong>{{ allDone ? 'Terjual' : 'Dipesan' }}</strong>
        <template v-if="!allDone"> · berubah menjadi Terjual setelah sertifikat diserahkan.</template>
      </p>

      <ol class="spt-list">
        <li
          v-for="(step, index) in steps"
          :key="step.id"
          class="spt-step"
          :class="[`spt-step--${step.status}`, { 'spt-step--current': current?.id === step.id }]"
          :style="{ '--i': Math.min(index, 8) }"
        >
          <span class="spt-marker" aria-hidden="true">
            <ion-icon v-if="step.status === 'done'" :icon="checkmark" />
            <template v-else>{{ index + 1 }}</template>
          </span>

          <div class="spt-body">
            <div class="spt-head">
              <h3>{{ SPK_STEP_INFO[step.key].title }}</h3>
              <span class="spt-pill" :class="`spt-pill--${step.status}`">{{ SPK_STEP_STATUS_LABEL[step.status] }}</span>
            </div>

            <p class="spt-summary-text">{{ SPK_STEP_INFO[step.key].summary }}</p>

            <p v-if="step.status === 'done' && step.completedAt" class="spt-date">
              Selesai pada {{ formatDateTime(step.completedAt) }}
            </p>
            <p v-else-if="step.estimatedDate" class="spt-date">
              Perkiraan: <strong>{{ formatDay(step.estimatedDate) }}</strong>
            </p>
            <p v-else-if="step.key !== 'cicilan'" class="spt-date spt-date--muted">
              Admin belum menentukan tanggal.
            </p>

            <p v-if="step.estimateNote && step.status !== 'done'" class="spt-note">{{ step.estimateNote }}</p>
            <p v-if="step.note" class="spt-note">{{ step.note }}</p>

            <div v-if="step.proofPath" class="spt-proof">
              <div class="spt-proof-info">
                <strong>Bukti serah terima</strong>
                <span>{{ step.proofName || 'Berkas bukti' }}</span>
              </div>
              <button type="button" class="spt-btn" :disabled="proofOpening === step.id" @click="openProof(step)">
                {{ proofOpening === step.id ? 'Membuka...' : 'Lihat bukti' }}
              </button>
            </div>
            <AppNotice v-if="proofError && proofErrorStep === step.id" tone="error">
              {{ proofError }}
            </AppNotice>

            <p v-if="SPK_STEP_INFO[step.key].requirement && step.status !== 'done'" class="spt-require">
              {{ SPK_STEP_INFO[step.key].requirement }}
            </p>

            <p v-if="step.status === 'ready' && mode === 'view'" class="spt-ready">
              Sudah bisa diproses. Admin akan menghubungi Anda untuk waktunya.
            </p>

            <div v-if="mode === 'admin' && step.status !== 'done'" class="spt-actions">
              <button type="button" class="spt-btn" @click="open('schedule', step)">
                {{ step.estimatedDate ? 'Ubah tanggal' : 'Atur tanggal' }}
              </button>
              <template v-if="current?.id === step.id && step.key !== 'cicilan'">
                <button v-if="step.status !== 'ready'" type="button" class="spt-btn" @click="open('ready', step)">
                  Beri tahu klien: siap
                </button>
                <button type="button" class="spt-btn spt-btn--primary" @click="open('complete', step)">
                  Tandai selesai
                </button>
              </template>
            </div>
          </div>
        </li>
      </ol>
    </template>

    <AppModal
      guard-unsaved
      v-model="modalOpen"
      :title="modalTitle"
      variant="bottom-sheet"
      :loading="saving"
      :confirm-disabled="needsProof && !proofFile && !target?.proofPath"
      :confirm-text="modalConfirm"
      :confirm-variant="action === 'complete' ? 'success' : 'primary'"
      :slide-confirm="action === 'complete'"
      slide-label="Geser untuk menandai selesai"
      cancel-text="Batal"
      @confirm="submit"
    >
      <p class="spt-modal-intro">{{ modalIntro }}</p>
      <div v-if="action === 'schedule'" class="spt-field">
        <span id="spt-date-label">Tanggal perkiraan</span>
        <div class="spt-date-row">
          <strong class="spt-date-value" :class="{ 'spt-date-value--empty': !dateValue }" aria-labelledby="spt-date-label">
            {{ dateValue ? formatDay(dateValue) : 'Belum dipilih' }}
          </strong>
          <button type="button" class="spt-btn spt-date-toggle" :aria-expanded="calendarOpen" @click="calendarOpen = !calendarOpen">
            {{ calendarOpen ? 'Tutup kalender' : 'Pilih tanggal' }}
          </button>
        </div>
        <div v-if="calendarOpen" class="spt-calendar">
          <div class="spt-cal-head">
            <button type="button" class="spt-cal-nav" aria-label="Bulan sebelumnya" :disabled="!canGoPrev" @click="shiftMonth(-1)">
              <ion-icon :icon="chevronBack" />
            </button>
            <span class="spt-cal-month">{{ monthLabel }}</span>
            <button type="button" class="spt-cal-nav" aria-label="Bulan berikutnya" @click="shiftMonth(1)">
              <ion-icon :icon="chevronForward" />
            </button>
          </div>
          <div class="spt-cal-grid spt-cal-weekdays" aria-hidden="true">
            <span v-for="d in weekDays" :key="d">{{ d }}</span>
          </div>
          <div class="spt-cal-grid">
            <span v-for="b in monthOffset" :key="`b${b}`" />
            <button
              v-for="day in monthDays"
              :key="day"
              type="button"
              class="spt-cal-day"
              :class="{ 'is-selected': isoOf(day) === dateValue, 'is-today': isoOf(day) === today }"
              :disabled="isoOf(day) < today"
              :aria-pressed="isoOf(day) === dateValue"
              data-discard-change @click="pickDay(day)"
            >{{ day }}</button>
          </div>
        </div>
      </div>
      <label v-if="needsProof" class="spt-field spt-upload">
        <span>Bukti serah terima{{ target?.proofPath ? ' (boleh diganti)' : '' }}</span>
        <input type="file" :accept="PROOF_ACCEPT" :disabled="saving" @change="onProofSelected" />
        <small>{{ proofFile?.name || (target?.proofName ? `Tersimpan: ${target.proofName}` : 'JPG, PNG, WEBP, atau PDF. Maksimal 5 MB.') }}</small>
      </label>
      <label class="spt-field">
        Catatan untuk klien (boleh dikosongkan)
        <textarea v-model="noteValue" rows="3" maxlength="300" placeholder="Contoh: bawa KTP asli dan materai" />
      </label>
      <AppNotice v-if="actionError" tone="error">
        {{ actionError }}
      </AppNotice>
    </AppModal>
    <DocumentViewerModal
      :open="proofViewerOpen"
      :url="proofViewerUrl"
      :file-name="proofViewerName"
      subtitle="Bukti serah terima"
      @close="proofViewerOpen = false; proofViewerUrl = ''"
    />
  </div>
</template>

<script setup lang="ts">
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import AppNotice from '@/components/ui/AppNotice.vue'
import { computed, onMounted, ref, watch } from 'vue'
import { IonIcon } from '@ionic/vue'
import { checkmark, chevronBack, chevronForward } from 'ionicons/icons'
import AppModal from '@/components/ui/AppModal.vue'
import DocumentViewerModal from '@/components/ui/DocumentViewerModal.vue'
import { useCelebration } from '@/composables/useCelebration'
import {
  SPK_STEP_INFO,
  SPK_STEP_STATUS_LABEL,
  adminCompleteStep,
  adminMarkStepReady,
  adminSetStepSchedule,
  adminUploadHandoverProof,
  currentStep,
  getHandoverProofUrl,
  getSpkProcessSteps,
  PROOF_ACCEPT,
  validateProofFile,
  type SpkProcessStep,
} from '@/services/spkProcessService'

const props = withDefaults(defineProps<{ spkId: number; mode?: 'view' | 'admin' }>(), { mode: 'view' })
const emit = defineEmits<{ loaded: [steps: SpkProcessStep[]]; changed: [] }>()

const { celebrate } = useCelebration()
const steps = ref<SpkProcessStep[]>([])
const loading = ref(true)
const error = ref('')

const current = computed(() => currentStep(steps.value))
const doneCount = computed(() => steps.value.filter((s) => s.status === 'done').length)
const allDone = computed(() => steps.value.length > 0 && !current.value)

async function load({ silent = false }: LoadOptions = {}) {
  if (!silent) loading.value = true
  error.value = ''
  try {
    steps.value = await getSpkProcessSteps(props.spkId)
    emit('loaded', steps.value)
  } catch (e) {
    if (!silent) error.value = e instanceof Error ? e.message : 'Terjadi kesalahan.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.spkId, () => load())
defineExpose({ reload: load })

const dayFmt = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const timeFmt = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })

function formatDay(value: string) {
  const [y, m, d] = value.slice(0, 10).split('-').map(Number)
  return dayFmt.format(new Date(Date.UTC(y, m - 1, d)))
}
function formatDateTime(value: string) {
  return timeFmt.format(new Date(value))
}

// ---- Aksi admin ----
type Action = 'schedule' | 'ready' | 'complete'
const modalOpen = ref(false)
const saving = ref(false)
const action = ref<Action>('schedule')
const target = ref<SpkProcessStep | null>(null)
const dateValue = ref('')
const noteValue = ref('')
const actionError = ref('')

const today = new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10)

const modalTitle = computed(() =>
  action.value === 'schedule' ? 'Atur tanggal perkiraan'
    : action.value === 'ready' ? 'Beri tahu client'
      : 'Tandai langkah selesai',
)
const modalConfirm = computed(() =>
  action.value === 'schedule' ? 'Simpan tanggal'
    : action.value === 'ready' ? 'Kirim'
      : 'Sudah selesai',
)
const needsProof = computed(() => action.value === 'complete' && target.value?.key === 'serah_terima')
const proofFile = ref<File | null>(null)
const proofOpening = ref<number | null>(null)
const proofError = ref('')
const proofErrorStep = ref<number | null>(null)
const proofViewerOpen = ref(false)
const proofViewerUrl = ref('')
const proofViewerName = ref('')

function onProofSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  actionError.value = ''
  if (!file) { proofFile.value = null; return }
  const invalid = validateProofFile(file)
  if (invalid) {
    proofFile.value = null
    input.value = ''
    actionError.value = invalid
    return
  }
  proofFile.value = file
}

async function openProof(step: SpkProcessStep) {
  if (!step.proofPath || proofOpening.value) return
  proofOpening.value = step.id
  proofError.value = ''
  proofErrorStep.value = step.id
  try {
    proofViewerUrl.value = await getHandoverProofUrl(step.proofPath)
    proofViewerName.value = step.proofName || step.proofPath.split('/').pop() || 'Bukti serah terima'
    proofViewerOpen.value = true
  } catch (e) {
    proofError.value = e instanceof Error ? e.message : 'Bukti tidak bisa dibuka.'
  } finally {
    proofOpening.value = null
  }
}

const modalIntro = computed(() => {
  const title = target.value ? SPK_STEP_INFO[target.value.key].title : ''
  if (action.value === 'schedule') return `${title}. Klien dan pemasar akan menerima pemberitahuan tanggal ini.`
  if (action.value === 'ready') return `${title} sudah bisa diproses. Klien dan pemasar akan menerima pemberitahuan.`
  if (needsProof.value) return `${title} sudah dilakukan? Lampirkan bukti tanda terima. Klien dan pemasar bisa melihatnya.`
  return `${title} benar-benar sudah dilakukan? Langkah berikutnya akan menjadi giliran berikutnya.`
})

// ---- Kalender tanggal perkiraan ----
const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']
const monthFmt = new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric', timeZone: 'UTC' })
const calendarOpen = ref(false)
const viewYear = ref(Number(today.slice(0, 4)))
const viewMonth = ref(Number(today.slice(5, 7)) - 1)

const monthLabel = computed(() => monthFmt.format(new Date(Date.UTC(viewYear.value, viewMonth.value, 1))))
const monthDays = computed(() => new Date(Date.UTC(viewYear.value, viewMonth.value + 1, 0)).getUTCDate())
const monthOffset = computed(() => new Date(Date.UTC(viewYear.value, viewMonth.value, 1)).getUTCDay())
const canGoPrev = computed(() => viewYear.value * 12 + viewMonth.value > Number(today.slice(0, 4)) * 12 + Number(today.slice(5, 7)) - 1)

function isoOf(day: number) {
  return `${viewYear.value}-${String(viewMonth.value + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
}
function shiftMonth(delta: number) {
  const d = new Date(Date.UTC(viewYear.value, viewMonth.value + delta, 1))
  viewYear.value = d.getUTCFullYear()
  viewMonth.value = d.getUTCMonth()
}
function pickDay(day: number) {
  dateValue.value = isoOf(day)
  calendarOpen.value = false
  actionError.value = ''
}

function open(a: Action, step: SpkProcessStep) {
  action.value = a
  target.value = step
  dateValue.value = step.estimatedDate?.slice(0, 10) || ''
  const base = dateValue.value || today
  viewYear.value = Number(base.slice(0, 4))
  viewMonth.value = Number(base.slice(5, 7)) - 1
  calendarOpen.value = a === 'schedule'
  noteValue.value = a === 'schedule' ? step.estimateNote || '' : ''
  proofFile.value = null
  actionError.value = ''
  modalOpen.value = true
}

async function submit() {
  if (!target.value || saving.value) return
  if (action.value === 'schedule' && !dateValue.value) {
    actionError.value = 'Pilih tanggal terlebih dahulu.'
    return
  }
  saving.value = true
  actionError.value = ''
  try {
    if (action.value === 'schedule') await adminSetStepSchedule(target.value.id, dateValue.value, noteValue.value)
    else if (action.value === 'ready') await adminMarkStepReady(target.value.id, noteValue.value)
    else {
      if (needsProof.value) {
        if (!proofFile.value && !target.value.proofPath) throw new Error('Lampirkan bukti serah terima terlebih dahulu.')
        if (proofFile.value) await adminUploadHandoverProof(target.value, proofFile.value)
      }
      await adminCompleteStep(target.value.id, noteValue.value)
    }
    const finished = action.value === 'complete' ? target.value : null
    modalOpen.value = false
    await load()
    emit('changed')
    if (finished) {
      celebrate(allDone.value
        ? { title: 'Proses selesai', message: 'Sertifikat sudah diserahkan dan kavling resmi terjual.' }
        : { title: 'Langkah selesai', message: SPK_STEP_INFO[finished.key].title })
    }
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Perubahan gagal disimpan.'
  } finally {
    saving.value = false
  }
}

useRealtimeRefresh(['spk_process_steps', 'spk_requests'], () => load({ silent: true }))

</script>

<style scoped>
.spt { font-family: var(--font-primary); color: var(--text-primary); }
.spt-state { display: grid; gap: 6px; padding: 18px; border: 1px dashed var(--border-default); border-radius: var(--radius-card); background: var(--surface-muted); font-size: 14px; color: var(--text-secondary); }
.spt-state strong { color: var(--text-primary); }
.spt-state p { margin: 0; }
.spt-state--error strong { color: var(--status-danger); }
.spt-link { justify-self: start; min-height: 44px; padding: 0 4px; border: 0; background: none; color: var(--poliland-green); font: inherit; font-weight: 700; text-decoration: underline; touch-action: manipulation; }

.spt-summary { display: flex; justify-content: space-between; align-items: center; gap: 12px; padding: 14px 16px; border-radius: var(--radius-card); background: var(--poliland-green); color: var(--on-forest); }
.spt-summary--done { background: var(--poliland-gold); color: var(--ink); }
.spt-summary > div { display: grid; gap: 2px; min-width: 0; }
.spt-summary-label { font-size: 12px; opacity: .9; }
.spt-summary strong { font-size: 16px; line-height: 1.3; }
.spt-count { flex: none; font-size: 12px; font-weight: 700; }
.spt-lot-state { margin: 10px 2px 16px; font-size: 13px; line-height: 1.5; color: var(--text-secondary); }
.spt-lot-state strong { color: var(--text-primary); }

.spt-list { list-style: none; margin: 0; padding: 0; display: grid; gap: 0; }
.spt-step { position: relative; display: grid; grid-template-columns: 34px 1fr; gap: 12px; padding-bottom: 18px; animation: spt-in var(--dur-slow, 380ms) var(--ease-out, ease-out) both; animation-delay: calc(var(--i) * 60ms); }
.spt-step:not(:last-child)::after { content: ''; position: absolute; left: 16px; top: 34px; bottom: 0; width: 2px; background: var(--border-default); }
.spt-step--done:not(:last-child)::after { background: var(--poliland-green); }
.spt-marker { display: grid; place-items: center; width: 34px; height: 34px; border-radius: 50%; border: 2px solid var(--border-default); background: var(--surface-primary); color: var(--text-secondary); font-size: 14px; font-weight: 800; }
.spt-marker ion-icon { font-size: 18px; }
.spt-step--done .spt-marker { background: var(--poliland-green); border-color: var(--poliland-green); color: #fff; }
.spt-step--current .spt-marker { border-color: var(--poliland-gold); background: var(--poliland-gold-soft); color: var(--ink); }
.spt-body { min-width: 0; padding: 12px 14px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.spt-step--current .spt-body { border-color: var(--poliland-gold); box-shadow: 0 2px 10px rgba(128, 87, 8, .1); }
.spt-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; flex-wrap: wrap; }
.spt-head h3 { margin: 0; font-size: 15px; line-height: 1.35; }
.spt-pill { padding: 3px 9px; border-radius: var(--radius-pill); font-size: 11px; font-weight: 700; white-space: nowrap; }
.spt-pill--pending { background: var(--surface-muted); color: var(--text-secondary); }
.spt-pill--scheduled { background: #FBF0D6; color: var(--poliland-gold-text); }
.spt-pill--ready { background: var(--poliland-gold); color: var(--ink); }
.spt-pill--done { background: var(--status-success-bg); color: var(--poliland-green); }
.spt-summary-text { margin: 6px 0 0; font-size: 13px; line-height: 1.55; color: var(--text-secondary); }
.spt-date { margin: 8px 0 0; font-size: 13px; }
.spt-date--muted { color: var(--text-secondary); }
.spt-note { margin: 6px 0 0; padding: 8px 10px; border-radius: var(--radius-control); background: var(--surface-muted); font-size: 13px; line-height: 1.5; }
.spt-require { margin: 8px 0 0; font-size: 12px; line-height: 1.5; color: var(--poliland-gold-text); }
.spt-ready { margin: 8px 0 0; font-size: 13px; font-weight: 600; color: var(--poliland-green); }
.spt-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.spt-btn { min-height: 44px; padding: 0 14px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--poliland-green); font: inherit; font-size: 13px; font-weight: 700; touch-action: manipulation; transition: transform var(--dur-fast, 160ms) var(--ease-spring, ease-out); }
.spt-btn:active { transform: scale(.97); }
.spt-btn--primary { border-color: var(--poliland-green); background: var(--poliland-green); color: #fff; }
.spt-btn:focus-visible, .spt-link:focus-visible { outline: 3px solid color-mix(in srgb, var(--poliland-green) 45%, transparent); outline-offset: 2px; }
@media (hover: hover) and (pointer: fine) { .spt-btn:hover { border-color: var(--poliland-green); } }

.spt-modal-intro { margin: 0 0 14px; font-size: 14px; line-height: 1.55; color: var(--text-secondary); }
.spt-field { display: grid; gap: 6px; margin-bottom: 14px; font-size: 13px; font-weight: 600; }
.spt-field input, .spt-field textarea { width: 100%; min-height: 44px; padding: 10px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 16px; font-weight: 400; }
.spt-date-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; min-height: 48px; padding: 6px 6px 6px 14px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); }
.spt-date-value { min-width: 0; font-size: 15px; font-weight: 700; line-height: 1.35; color: var(--text-primary); }
.spt-date-value--empty { font-weight: 400; color: var(--text-secondary); }
.spt-date-toggle { flex: none; }
.spt-calendar { padding: 14px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); animation: spt-in var(--dur-base, 240ms) var(--ease-out, ease-out) both; }
.spt-cal-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.spt-cal-month { font-size: 15px; font-weight: 700; text-transform: capitalize; color: var(--text-primary); }
.spt-cal-nav { display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--poliland-green); font-size: 18px; touch-action: manipulation; transition: transform var(--dur-fast, 160ms) var(--ease-spring, ease-out); }
.spt-cal-nav:active:not(:disabled) { transform: scale(.94); }
.spt-cal-nav:disabled { opacity: .4; }
.spt-cal-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 4px; text-align: center; }
.spt-cal-weekdays { margin-bottom: 4px; font-size: 11px; font-weight: 700; color: var(--text-secondary); }
.spt-cal-day { display: grid; place-items: center; aspect-ratio: 1; min-height: 40px; border: 0; border-radius: 50%; background: transparent; color: var(--text-primary); font: inherit; font-size: 14px; touch-action: manipulation; transition: transform var(--dur-fast, 160ms) var(--ease-spring, ease-out); }
.spt-cal-day:active:not(:disabled) { transform: scale(.92); }
.spt-cal-day:disabled { color: var(--text-secondary); opacity: .4; }
.spt-cal-day.is-today { box-shadow: inset 0 0 0 2px var(--poliland-gold); }
.spt-cal-day.is-selected { background: var(--poliland-green); color: #fff; font-weight: 700; box-shadow: none; }
.spt-cal-day:focus-visible, .spt-cal-nav:focus-visible { outline: 3px solid color-mix(in srgb, var(--poliland-green) 45%, transparent); outline-offset: 2px; }
@media (hover: hover) and (pointer: fine) { .spt-cal-day:hover:not(:disabled):not(.is-selected) { background: var(--surface-muted); } }
.spt-proof { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 10px; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-muted); }
.spt-proof-info { display: grid; gap: 2px; min-width: 0; font-size: 13px; }
.spt-proof-info span { overflow-wrap: anywhere; font-size: 12px; color: var(--text-secondary); }
.spt-btn:disabled { opacity: .55; }
.spt-upload { padding: 10px 12px; border: 1px dashed var(--border-default); border-radius: var(--radius-control); }
.spt-upload input { padding: 0; min-height: 44px; border: 0; font-size: 12px; }
.spt-upload small { font-weight: 400; color: var(--text-secondary); font-size: 12px; overflow-wrap: anywhere; }

@keyframes spt-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .spt-step { animation: none; } .spt-btn, .spt-cal-nav, .spt-cal-day { transition: none; } .spt-calendar { animation: none; } }
</style>
