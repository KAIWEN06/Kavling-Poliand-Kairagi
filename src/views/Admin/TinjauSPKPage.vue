<template>
  <ion-page class="review-page">
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />
    <ion-content :fullscreen="true">
      <main class="review-shell">
        <nav class="review-navigation" aria-label="Navigasi halaman">
          <button type="button" class="review-back-button" @click="router.back()">
            <ion-icon :icon="arrowBackOutline" aria-hidden="true" />
            <span>Kembali</span>
          </button>
        </nav>
        <div v-if="loading" class="review-state"><ion-spinner name="crescent" /><p>Memuat data SPK...</p></div>
        <div v-else-if="errorMessage" class="review-state review-error" role="alert"><strong>Data tidak dapat dimuat</strong><p>{{ errorMessage }}</p><AppButton size="small" @click="load">Coba lagi</AppButton></div>
        <template v-else-if="data">
          <header class="review-heading"><div> <h1>{{ data.request.spk_number }}</h1><span class="status-chip">Approved</span></div><span class="review-id">SPK #{{ data.request.id }} · Transaksi #{{ data.transaction.id }}</span></header>
          <section class="review-panel"><div class="section-head"><div><h2>Progress SPK</h2></div><AppButton size="small" @click="progressOpen = true">Perbarui status</AppButton></div><div class="timeline"><div v-for="(item, index) in timeline" :key="item.id || index" class="timeline-item" :class="{ current: index === 0 }"><span class="timeline-dot" aria-hidden="true" /><div><strong>{{ item.new_status || item.status }}</strong><small>{{ date(item.created_at) }} · {{ item.profiles?.full_name || 'Admin' }}</small><p v-if="item.note">{{ item.note }}</p></div></div></div></section>
          <section class="review-panel"><h2>Informasi SPK</h2><dl class="info-grid">
            <div><dt>Customer</dt><dd>{{ data.request.customer_full_name }}</dd></div><div><dt>Nomor telepon</dt><dd>{{ data.request.customer_phone }}</dd></div><div><dt>Kavling</dt><dd>{{ data.request.lots?.lot_number || data.request.lot_id }}</dd></div><div><dt>Harga transaksi</dt><dd>{{ money(data.request.lot_price_snapshot) }}</dd></div><div><dt>Metode pembayaran</dt><dd>{{ data.request.payment_method === 'Cash' ? 'Tunai' : 'Cicilan' }}</dd></div><div><dt>Booking Fee</dt><dd>{{ money(data.request.booking_fee_snapshot) }}</dd></div><div><dt>Tanggal persetujuan</dt><dd>{{ date(data.request.approved_at) }}</dd></div><div><dt>Marketing</dt><dd>{{ data.request.profiles?.full_name || 'Tidak ada' }}</dd></div><div><dt>Sumber pengajuan</dt><dd>{{ data.request.submission_source }}</dd></div>
          </dl></section>
          <section v-if="data.request.payment_method === 'Installment'" class="review-panel">
            <div class="section-head">
              <div>
                <h2>Tanggal pembayaran bulanan</h2>
              </div>
            </div>
            <div v-if="data.schedules.length" class="monthly-date-card">
              <div class="monthly-date-meta">
                <span>{{ data.schedules.length }} jadwal cicilan</span>
                <span>{{ paidScheduleCount }} sudah dibayar · {{ editableScheduleCount }} dapat diperbarui</span>
              </div>
              <p class="date-picker-hint">
                Pilih tanggal jatuh tempo untuk setiap cicilan. Bulan dan tahun mengikuti jadwal yang sudah dibuat otomatis. Admin dapat mengubah tanggal satu cicilan tanpa mengubah cicilan lainnya.
              </p>
              <div class="schedule-preview">
                <div v-for="item in sortedSchedules" :key="item.id" class="schedule-preview-item" :class="{ 'is-paid': item.status === 'Paid' }">
                  <div class="schedule-editor-info">
                    <strong>Cicilan #{{ item.installment_number }}</strong>
                    <span>{{ money(item.amount) }}</span>
                    <small>{{ monthYear(item.due_date) }}</small>
                  </div>
                  <div class="schedule-date-action">
                    <span v-if="item.status === 'Paid'" class="schedule-preview-date paid-label">Lunas</span>
                    <template v-else>
                      <strong class="schedule-preview-date">{{ formatScheduleDate(generatedScheduleDates[item.id]) }}</strong>
                      <button type="button" class="choose-date-button"
                        :disabled="savingSchedule"
                        :aria-expanded="activeCalendarId === Number(item.id)"
                        @click="toggleCalendar(Number(item.id))">
                        {{ activeCalendarId === Number(item.id) ? 'Tutup kalender' : 'Pilih tanggal' }}
                      </button>
                    </template>
                  </div>
                  <div v-if="activeCalendarId === Number(item.id)" class="inline-calendar">
                    <div class="calendar-heading">
                      <span class="calendar-month">{{ monthYear(item.due_date) }}</span>
                      <span class="calendar-auto-label">Bulan & tahun otomatis</span>
                    </div>
                    <div class="calendar-weekdays">
                      <span v-for="day in weekDays" :key="day">{{ day }}</span>
                    </div>
                    <div class="calendar-days">
                      <span v-for="blank in calendarOffset(item.due_date)" :key="`blank-${item.id}-${blank}`" class="calendar-blank" />
                      <button v-for="day in daysInScheduleMonth(item.due_date)" :key="`${item.id}-${day}`"
                        type="button" class="calendar-day"
                        :class="{ selected: selectedDay(item) === day }"
                        @click="selectScheduleDay(item, day)">
                        {{ day }}
                      </button>
                    </div>
                    <p class="calendar-note">Pilih angka tanggal saja. Bulan dan tahun tidak dapat diubah dari sini.</p>
                  </div>
                </div>
              </div>
              <AppButton size="medium" :loading="savingSchedule"
                :disabled="savingSchedule"
                @click="saveIndividualSchedules">
                Simpan perubahan jadwal
              </AppButton>
              <p v-if="scheduleSaveMessage" class="schedule-save-message" role="status">{{ scheduleSaveMessage }}</p>
              <p v-if="scheduleError" class="schedule-save-error" role="alert">{{ scheduleError }}</p>
            </div>
</section>
          <section v-if="data.commission" class="review-panel"><h2>Komisi Marketing</h2><dl class="info-grid"><div><dt>Nama marketing</dt><dd>{{ data.commission.profiles?.full_name || data.request.profiles?.full_name }}</dd></div><div><dt>Nomor SPK</dt><dd>{{ data.request.spk_number }}</dd></div><div><dt>Nilai transaksi</dt><dd>{{ money(data.commission.base_amount) }}</dd></div><div><dt>Jenis komisi</dt><dd>{{ data.commission.commission_type }}</dd></div><div><dt>Persentase / nominal</dt><dd>{{ data.commission.commission_rate != null ? `${data.commission.commission_rate}%` : money(data.commission.commission_amount) }}</dd></div><div><dt>Total komisi</dt><dd>{{ money(data.commission.commission_amount) }}</dd></div><div><dt>Status pencairan</dt><dd>{{ data.commission.status }}</dd></div></dl></section>
        </template>
      </main>
    </ion-content>
    <AppModal v-model="progressOpen" title="Perbarui progres SPK" variant="bottom-sheet" :loading="saving" @confirm="saveProgress"><label class="modal-field">Status baru<select v-model="progressStatus"><option v-for="status in statuses" :key="status" :value="status">{{ status }}</option></select></label><label class="modal-field">Catatan<textarea v-model="progressNote" rows="3" placeholder="Catatan perubahan (opsional)" /></label></AppModal>
  </ion-page>
</template>
<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/vue'
import { arrowBackOutline } from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import {
  getSPKReview,
  updateInstallmentSchedule,
  updateNotaryProgress,
  type NotaryStatus,
} from '@/services/Admin/spkReviewService'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const saving = ref(false)
const savingSchedule = ref(false)
const errorMessage = ref('')
const scheduleError = ref('')
const scheduleSaveMessage = ref('')
const data = ref<any>(null)
const progressOpen = ref(false)
const progressNote = ref('')
const activeCalendarId = ref<number | null>(null)
const scheduleDayOverrides = ref<Record<number, number>>({})
const weekDays = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

const statuses: NotaryStatus[] = [
  'Menunggu Diproses',
  'Diproses',
  'Proses Notaris',
  'Penandatanganan Notaris',
  'Selesai',
]
const progressStatus = ref<NotaryStatus>('Menunggu Diproses')

const timeline = computed(() => data.value?.history || [])
const sortedSchedules = computed(() =>
  [...(data.value?.schedules || [])].sort(
    (a: any, b: any) => Number(a.installment_number) - Number(b.installment_number),
  ),
)
const paidScheduleCount = computed(() =>
  sortedSchedules.value.filter((item: any) => item.status === 'Paid').length,
)
const editableScheduleCount = computed(() =>
  sortedSchedules.value.filter((item: any) => item.status !== 'Paid').length,
)
const generatedScheduleDates = computed<Record<number, string>>(() => {
  const dates: Record<number, string> = {}
  for (const item of sortedSchedules.value) {
    if (item.status === 'Paid') continue
    const originalDate = dateOnly(item.due_date)
    if (!originalDate) continue
    const [year, month] = originalDate.split('-').map(Number)
    const day = scheduleDayOverrides.value[Number(item.id)] ?? Number(originalDate.slice(8, 10))
    const lastDay = new Date(year, month, 0).getDate()
    const safeDay = Math.min(Math.max(day, 1), lastDay)
    dates[Number(item.id)] = `${year}-${String(month).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`
  }
  return dates
})
const hasScheduleChanges = computed(() =>
  sortedSchedules.value.some((item: any) =>
    item.status !== 'Paid' &&
    generatedScheduleDates.value[Number(item.id)] !== dateOnly(item.due_date),
  ),
)

function dateOnly(value: string | null | undefined): string {
  return value ? String(value).slice(0, 10) : ''
}

function monthYear(value: string | null | undefined): string {
  if (!value) return '-'
  const [year, month] = dateOnly(value).split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', {
    month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 1)))
}

function daysInScheduleMonth(value: string | null | undefined): number {
  if (!value) return 0
  const [year, month] = dateOnly(value).split('-').map(Number)
  return new Date(year, month, 0).getDate()
}

function calendarOffset(value: string | null | undefined): number {
  if (!value) return 0
  const [year, month] = dateOnly(value).split('-').map(Number)
  return new Date(year, month - 1, 1).getDay()
}

function selectedDay(item: any): number {
  const generated = generatedScheduleDates.value[Number(item.id)]
  return generated ? Number(generated.slice(8, 10)) : Number(dateOnly(item.due_date).slice(8, 10))
}

function toggleCalendar(id: number) {
  activeCalendarId.value = activeCalendarId.value === id ? null : id
}

function selectScheduleDay(item: any, day: number) {
  scheduleDayOverrides.value = {
    ...scheduleDayOverrides.value,
    [Number(item.id)]: day,
  }
  activeCalendarId.value = null
}

function formatScheduleDate(value: string | undefined): string {
  if (!value) return 'Tanggal belum tersedia'
  const [year, month, day] = value.split('-').map(Number)
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, day)))
}

const money = (n: number | null) =>
  n == null
    ? '-'
    : new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: 'IDR',
        maximumFractionDigits: 0,
      }).format(Number(n))

const date = (v: string | null) =>
  v
    ? new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'medium',
        timeStyle: 'short',
      }).format(new Date(v))
    : '-'

async function load() {
  loading.value = true
  errorMessage.value = ''
  scheduleError.value = ''
  scheduleSaveMessage.value = ''

  try {
    const spkId = Number(route.params.spkId)
    const transactionId = Number(route.query.transactionId)

    if (!Number.isInteger(spkId) || spkId <= 0 ||
        !Number.isInteger(transactionId) || transactionId <= 0) {
      throw new Error('ID SPK atau transaksi tidak valid.')
    }

    data.value = await getSPKReview(spkId, transactionId)
    progressStatus.value = data.value.request.notary_status || 'Menunggu Diproses'

    scheduleDayOverrides.value = Object.fromEntries(
      (data.value.schedules || [])
        .filter((item: any) => item.status !== 'Paid' && item.due_date)
        .map((item: any) => [Number(item.id), Number(dateOnly(item.due_date).slice(8, 10))]),
    )
    activeCalendarId.value = null
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Terjadi kesalahan.'
  } finally {
    loading.value = false
  }
}

async function saveIndividualSchedules() {
  if (!data.value?.schedules?.length) return
  savingSchedule.value = true
  scheduleError.value = ''
  scheduleSaveMessage.value = ''

  try {
    const editable = sortedSchedules.value.filter((item: any) => item.status !== 'Paid')
    const changed = editable.filter(
      (item: any) =>
        generatedScheduleDates.value[Number(item.id)] !== dateOnly(item.due_date),
    )

    for (const item of changed) {
      await updateInstallmentSchedule(
        Number(item.id),
        generatedScheduleDates.value[Number(item.id)],
      )
    }

    if (changed.length > 0) {
      await load()
      scheduleSaveMessage.value = `${changed.length} jadwal cicilan berhasil diperbarui.`
    } else {
      // Tanggal default sudah berasal dari database; tombol tetap dapat
      // diklik untuk mengonfirmasi bahwa jadwal tersebut akan digunakan.
      scheduleSaveMessage.value = 'Jadwal siap digunakan.'
    }
  } catch (error) {
    scheduleError.value =
      error instanceof Error ? error.message : 'Tanggal pembayaran gagal disimpan.'
    await load()
  } finally {
    savingSchedule.value = false
  }
}

async function saveProgress() {
  if (
    progressStatus.value === 'Selesai' &&
    data.value?.request?.payment_method === 'Installment'
  ) {
    const missingDate = sortedSchedules.value.find(
      (item: any) =>
        item.status !== 'Paid' &&
          !generatedScheduleDates.value[Number(item.id)],
    )

    if (missingDate) {
      errorMessage.value =
        `Tanggal jatuh tempo Cicilan #${missingDate.installment_number} belum diisi.`
      progressOpen.value = false
      return
    }

    if (hasScheduleChanges.value) {
      errorMessage.value =
        'Simpan perubahan jadwal pembayaran terlebih dahulu sebelum menyelesaikan proses notaris.'
      progressOpen.value = false
      return
    }
  }

  saving.value = true
  errorMessage.value = ''

  try {
    await updateNotaryProgress(
      Number(route.params.spkId),
      progressStatus.value,
      progressNote.value,
    )
    progressOpen.value = false
    progressNote.value = ''
    await load()
  } catch (error) {
    errorMessage.value =
      error instanceof Error ? error.message : 'Status gagal diperbarui.'
  } finally {
    saving.value = false
  }
}

onMounted(load)
</script>
<style scoped>
.review-page { --review-gap: 16px; font-family: var(--font-primary); } .review-shell { max-width: 1100px; margin: 0 auto; padding: 24px 16px calc(96px + env(safe-area-inset-bottom)); color: var(--text-primary); } .review-navigation { margin-bottom: 16px; } .review-back-button { display:inline-flex; align-items:center; gap:8px; min-height:44px; padding:8px 12px; border:1px solid var(--border-default); border-radius:var(--radius-control); background:var(--surface-primary); color:var(--text-primary); font:inherit; font-weight:600; cursor:pointer; transition:background-color .2s ease, border-color .2s ease; } .review-back-button:hover { background:var(--surface-muted); border-color:var(--poliland-green); } .review-back-button:active { transform:translateY(1px); } .review-back-button ion-icon { font-size:18px; } .review-heading,.section-head { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; } .eyebrow { margin:0 0 4px; color:var(--poliland-gold-text); font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; } h1 { margin:0; font-size:clamp(24px,5vw,36px); } h2 { margin:0 0 16px; font-size:18px; } .review-id { color:var(--text-secondary); font-size:13px; } .status-chip,.payment-status { display:inline-flex; padding:6px 10px; border-radius:var(--radius-control); background:var(--status-success-bg); color:var(--poliland-green); font-weight:700; font-size:12px; } .review-panel { margin-top:var(--review-gap); padding:20px; background:var(--surface-primary); border:1px solid var(--border-default); border-radius:var(--radius-panel); } .info-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin:0; } dt { color:var(--text-secondary); font-size:12px; } dd { margin:4px 0 0; font-weight:600; overflow-wrap:anywhere; } .monthly-date-card { display:grid; gap:12px; max-width:560px; } .monthly-date-card > label { font-size:13px; font-weight:700; color:var(--text-primary); } .date-picker-wrap { display:flex; align-items:center; gap:10px; min-height:54px; padding:4px 12px; border:1px solid var(--border-default); border-radius:var(--radius-control); background:var(--surface-primary); color:var(--poliland-green); } .date-picker-wrap ion-icon { font-size:21px; flex:none; } .date-picker-wrap input { flex:1; width:100%; border:0; outline:0; padding:8px 0; min-width:0; } .date-picker-wrap input:focus-visible { outline:0; } .date-picker-hint,.schedule-empty { margin:0; color:var(--text-secondary); font-size:12px; line-height:1.6; } .schedule-preview { display:grid; gap:8px; } .schedule-preview-item { display:flex; justify-content:space-between; align-items:center; gap:12px; padding:10px 12px; border:1px solid var(--border-default); border-radius:var(--radius-control); background:var(--surface-primary); } .schedule-editor-info { display:grid; gap:4px; } .schedule-editor-info strong { font-size:13px; } .schedule-editor-info span,.schedule-editor-info small,.schedule-date-field span,.schedule-preview-date { color:var(--text-secondary); font-size:12px; } .schedule-date-field { display:grid; gap:6px; font-size:12px; font-weight:600; } .schedule-date-field input { width:100%; } .monthly-date-meta { display:flex; flex-wrap:wrap; gap:8px 16px; color:var(--text-secondary); font-size:12px; } .schedule-save-message { margin:0; color:var(--status-success); font-size:13px; font-weight:600; } .schedule-save-error { margin:0; color:var(--status-danger); font-size:13px; } input,select,textarea { min-height:44px; border:1px solid var(--border-default); border-radius:var(--radius-control); padding:10px; color:var(--text-primary); background:var(--surface-primary); font:inherit; } .timeline { display:grid; gap:18px; } .timeline-item { display:grid; grid-template-columns:16px 1fr; gap:12px; position:relative; } .timeline-item:not(:last-child)::after { content:''; position:absolute; left:7px; top:18px; bottom:-20px; width:2px; background:var(--border-default); } .timeline-dot { width:14px; height:14px; border-radius:50%; background:var(--border-default); margin-top:3px; } .timeline-item.current .timeline-dot { background:var(--poliland-green); } .timeline-item small { display:block; color:var(--text-secondary); margin-top:4px; } .timeline-item p { margin:6px 0 0; } .review-state { display:grid; place-items:center; gap:8px; min-height:40vh; text-align:center; } .review-error { color:var(--status-danger); } .modal-field { display:grid; gap:6px; margin-bottom:16px; } .modal-field select,.modal-field textarea { width:100%; } button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible { outline:3px solid color-mix(in srgb,var(--poliland-green) 45%, transparent); outline-offset:2px; }
@media (max-width: 760px) { .review-shell { padding-top:16px; } .review-heading { display:block; } .review-id { display:block; margin-top:8px; } .info-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px 12px; } .monthly-date-card { max-width:none; } .schedule-editor-item { grid-template-columns:1fr; } .monthly-date-meta { display:grid; gap:4px; } }
@media (max-width: 480px) { .info-grid { grid-template-columns:1fr; } .review-panel { padding:16px; border-radius:var(--radius-card); } }

.schedule-date-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}
.schedule-date-field small {
  display: block;
  margin-top: 7px;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.5;
}
@media (max-width: 640px) {
  .schedule-date-grid {
    grid-template-columns: 1fr;
  }
}

.schedule-preview-item { position: relative; flex-wrap: wrap; }
.schedule-preview-item.is-paid { background: var(--surface-muted); }
.schedule-date-action { display: grid; justify-items: end; gap: 6px; }
.choose-date-button {
  min-height: 36px; padding: 6px 11px; border: 1px solid var(--border-default);
  border-radius: var(--radius-control); background: var(--surface-primary);
  color: var(--poliland-green); font: inherit; font-size: 12px; font-weight: 700;
}
.choose-date-button:disabled { opacity: .55; cursor: not-allowed; }
.inline-calendar {
  flex: 1 0 100%; max-width: 340px; margin-top: 8px; padding: 14px;
  border: 1px solid var(--border-default); border-radius: var(--radius-card);
  background: var(--surface-primary);
}
.calendar-heading { display:flex; align-items:center; justify-content:space-between; gap:8px; margin-bottom:12px; }
.calendar-month { color:var(--text-primary); font-weight:700; }
.calendar-auto-label { color:var(--text-secondary); font-size:10px; }
.calendar-weekdays,.calendar-days { display:grid; grid-template-columns:repeat(7,minmax(0,1fr)); gap:5px; text-align:center; }
.calendar-weekdays { margin-bottom:6px; color:var(--text-secondary); font-size:11px; font-weight:700; }
.calendar-day,.calendar-blank { display:grid; place-items:center; aspect-ratio:1; min-width:0; }
.calendar-day { border:0; border-radius:50%; background:transparent; color:var(--text-primary); font:inherit; font-size:12px; }
.calendar-day:hover { background:var(--surface-muted); }
.calendar-day.selected { background:var(--poliland-green); color:#fff; font-weight:700; }
.calendar-note { margin:10px 0 0; color:var(--text-secondary); font-size:11px; line-height:1.5; }
.paid-label { color:var(--status-success); font-weight:700; }

</style>
