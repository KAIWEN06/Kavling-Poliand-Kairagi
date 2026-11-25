<template>
  <div class="spt" :aria-busy="loading">
    <div v-if="loading" class="spt-state" role="status">Memuat tahapan proses...</div>

    <div v-else-if="error" class="spt-state spt-state--error" role="alert">
      <strong>Tahapan proses belum bisa dimuat</strong>
      <p>{{ error }}</p>
      <button type="button" class="spt-link" @click="load">Coba lagi</button>
    </div>

    <div v-else-if="!steps.length" class="spt-state">
      <strong>Tahapan belum dimulai</strong>
      <p>Tahapan muncul setelah SPK disetujui dan Booking Fee terverifikasi.</p>
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
        <strong>{{ allDone ? 'Terjual' : 'Dipesan (booking)' }}</strong>
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
                  Beri tahu client: siap
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
      v-model="modalOpen"
      :title="modalTitle"
      variant="bottom-sheet"
      :loading="saving"
      :confirm-text="modalConfirm"
      cancel-text="Batal"
      @confirm="submit"
    >
      <p class="spt-modal-intro">{{ modalIntro }}</p>
      <label v-if="action === 'schedule'" class="spt-field">
        Tanggal perkiraan
        <input v-model="dateValue" type="date" :min="today" />
      </label>
      <label class="spt-field">
        Catatan untuk client (boleh dikosongkan)
        <textarea v-model="noteValue" rows="3" maxlength="300" placeholder="Contoh: bawa KTP asli dan materai" />
      </label>
      <p v-if="actionError" class="spt-error" role="alert">{{ actionError }}</p>
    </AppModal>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { IonIcon } from '@ionic/vue'
import { checkmark } from 'ionicons/icons'
import AppModal from '@/components/ui/AppModal.vue'
import {
  SPK_STEP_INFO,
  SPK_STEP_STATUS_LABEL,
  adminCompleteStep,
  adminMarkStepReady,
  adminSetStepSchedule,
  currentStep,
  getSpkProcessSteps,
  type SpkProcessStep,
} from '@/services/spkProcessService'

const props = withDefaults(defineProps<{ spkId: number; mode?: 'view' | 'admin' }>(), { mode: 'view' })
const emit = defineEmits<{ loaded: [steps: SpkProcessStep[]]; changed: [] }>()

const steps = ref<SpkProcessStep[]>([])
const loading = ref(true)
const error = ref('')

const current = computed(() => currentStep(steps.value))
const doneCount = computed(() => steps.value.filter((s) => s.status === 'done').length)
const allDone = computed(() => steps.value.length > 0 && !current.value)

async function load() {
  loading.value = true
  error.value = ''
  try {
    steps.value = await getSpkProcessSteps(props.spkId)
    emit('loaded', steps.value)
  } catch (e) {
    error.value = e instanceof Error ? e.message : 'Terjadi kesalahan.'
  } finally {
    loading.value = false
  }
}

onMounted(load)
watch(() => props.spkId, load)
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
    : action.value === 'ready' ? 'Kirim pemberitahuan'
      : 'Ya, sudah selesai',
)
const modalIntro = computed(() => {
  const title = target.value ? SPK_STEP_INFO[target.value.key].title : ''
  if (action.value === 'schedule') return `${title}. Client dan marketing akan menerima pemberitahuan tanggal ini.`
  if (action.value === 'ready') return `${title} sudah bisa diproses. Client dan marketing akan menerima pemberitahuan.`
  return `${title} benar-benar sudah dilakukan? Langkah berikutnya akan menjadi giliran berikutnya.`
})

function open(a: Action, step: SpkProcessStep) {
  action.value = a
  target.value = step
  dateValue.value = step.estimatedDate?.slice(0, 10) || ''
  noteValue.value = a === 'schedule' ? step.estimateNote || '' : ''
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
    else await adminCompleteStep(target.value.id, noteValue.value)
    modalOpen.value = false
    await load()
    emit('changed')
  } catch (e) {
    actionError.value = e instanceof Error ? e.message : 'Perubahan gagal disimpan.'
  } finally {
    saving.value = false
  }
}
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
.spt-error { margin: 0; color: var(--status-danger); font-size: 13px; }

@keyframes spt-in { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
@media (prefers-reduced-motion: reduce) { .spt-step { animation: none; } .spt-btn { transition: none; } }
</style>
