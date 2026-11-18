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
              <div class="date-picker-wrap">
                <ion-icon :icon="calendarOutline" aria-hidden="true" />
                <input id="monthly-due-date" v-model="monthlyDueDate" type="date" :disabled="savingSchedule || !hasEditableSchedules" />
              </div>
              <div class="monthly-date-meta">
                <span>{{ data.schedules.length }} jadwal cicilan</span>
                <span>{{ paidScheduleCount }} sudah dibayar · {{ editableScheduleCount }} dapat diperbarui</span>
              </div>
              <AppButton size="medium" :loading="savingSchedule" :disabled="!monthlyDueDate || !hasEditableSchedules || !scheduleDateChanged" @click="saveMonthlySchedule">
                Simpan tanggal pembayaran
              </AppButton>
              <p v-if="scheduleSaveMessage" class="schedule-save-message" role="status">{{ scheduleSaveMessage }}</p>
              <p v-if="scheduleError" class="schedule-save-error" role="alert">{{ scheduleError }}</p>
            </div>
            <p v-else class="schedule-empty">Jadwal cicilan belum tersedia untuk transaksi ini.</p>
          </section>
          <section v-if="data.commission" class="review-panel"><h2>Komisi Marketing</h2><dl class="info-grid"><div><dt>Nama marketing</dt><dd>{{ data.commission.profiles?.full_name || data.request.profiles?.full_name }}</dd></div><div><dt>Nomor SPK</dt><dd>{{ data.request.spk_number }}</dd></div><div><dt>Nilai transaksi</dt><dd>{{ money(data.commission.base_amount) }}</dd></div><div><dt>Jenis komisi</dt><dd>{{ data.commission.commission_type }}</dd></div><div><dt>Persentase / nominal</dt><dd>{{ data.commission.commission_rate != null ? `${data.commission.commission_rate}%` : money(data.commission.commission_amount) }}</dd></div><div><dt>Total komisi</dt><dd>{{ money(data.commission.commission_amount) }}</dd></div><div><dt>Status pencairan</dt><dd>{{ data.commission.status }}</dd></div></dl></section>
          <section class="review-panel"><div class="section-head"><div><h2>Monitoring pengurusan SPK</h2></div><AppButton size="small" @click="progressOpen = true">Perbarui status</AppButton></div><div class="timeline"><div v-for="(item, index) in timeline" :key="item.id || index" class="timeline-item" :class="{ current: index === 0 }"><span class="timeline-dot" aria-hidden="true" /><div><strong>{{ item.new_status || item.status }}</strong><small>{{ date(item.created_at) }} · {{ item.profiles?.full_name || 'Admin' }}</small><p v-if="item.note">{{ item.note }}</p></div></div></div></section>
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
import { arrowBackOutline, calendarOutline } from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'; import AppButton from '@/components/ui/AppButton.vue'; import AppModal from '@/components/ui/AppModal.vue'
import { getSPKReview, updateInstallmentSchedule, updateNotaryProgress, type NotaryStatus } from '@/services/Admin/spkReviewService'
const route = useRoute(); const router = useRouter(); const loading = ref(true); const saving = ref(false); const savingSchedule = ref(false); const errorMessage = ref(''); const scheduleError = ref(''); const scheduleSaveMessage = ref(''); const monthlyDueDate = ref(''); const initialMonthlyDueDate = ref(''); const data = ref<any>(null); const progressOpen = ref(false); const progressNote = ref(''); const statuses: NotaryStatus[] = ['Diproses', 'Proses Notaris', 'Penandatanganan Notaris', 'Selesai']; const progressStatus = ref<NotaryStatus>('Diproses')
const timeline = computed(() => data.value?.history || [])
const paidScheduleCount = computed(() => (data.value?.schedules || []).filter((item: any) => item.status === 'Paid').length)
const editableScheduleCount = computed(() => (data.value?.schedules || []).filter((item: any) => item.status !== 'Paid').length)
const hasEditableSchedules = computed(() => editableScheduleCount.value > 0)
const scheduleDateChanged = computed(() => monthlyDueDate.value !== initialMonthlyDueDate.value)
function dateOnly(value: string | null | undefined): string {
  if (!value) return ''
  return String(value).slice(0, 10)
}
function addMonthsKeepingDay(dateValue: string, monthOffset: number): string {
  const [year, month, day] = dateValue.split('-').map(Number)
  const targetMonthIndex = month - 1 + monthOffset
  const targetYear = year + Math.floor(targetMonthIndex / 12)
  const normalizedMonth = ((targetMonthIndex % 12) + 12) % 12
  const lastDay = new Date(targetYear, normalizedMonth + 1, 0).getDate()
  const safeDay = Math.min(day, lastDay)
  return `${targetYear}-${String(normalizedMonth + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`
}
const money = (n: number | null) => n == null ? '-' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(n))
const date = (v: string | null) => v ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(v)) : '-'
async function load() {
  loading.value = true
  errorMessage.value = ''
  scheduleError.value = ''
  try {
    data.value = await getSPKReview(Number(route.params.spkId), Number(route.query.transactionId))
    progressStatus.value = data.value.request.notary_status || 'Diproses'
    const editableFirstSchedule = [...(data.value.schedules || [])].sort((a: any, b: any) => a.installment_number - b.installment_number).find((item: any) => item.status !== 'Paid')
    monthlyDueDate.value = dateOnly(editableFirstSchedule?.due_date)
    initialMonthlyDueDate.value = monthlyDueDate.value
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Terjadi kesalahan.'
  } finally {
    loading.value = false
  }
}
async function saveMonthlySchedule() {
  if (!monthlyDueDate.value || !data.value?.schedules?.length || !hasEditableSchedules.value) return
  savingSchedule.value = true
  scheduleError.value = ''
  scheduleSaveMessage.value = ''
  try {
    const schedules = [...data.value.schedules].sort((a: any, b: any) => a.installment_number - b.installment_number)
    const firstEditableSchedule = schedules.find((item: any) => item.status !== 'Paid')
    if (!firstEditableSchedule) return
    const firstInstallmentNumber = Number(firstEditableSchedule.installment_number)
    for (const item of schedules) {
      if (item.status === 'Paid') continue
      const offset = Number(item.installment_number) - firstInstallmentNumber
      const dueDate = addMonthsKeepingDay(monthlyDueDate.value, offset)
      await updateInstallmentSchedule(Number(item.id), dueDate)
      item.due_date = dueDate
    }
    initialMonthlyDueDate.value = monthlyDueDate.value
    scheduleSaveMessage.value = `${editableScheduleCount.value} jadwal cicilan berhasil diperbarui.`
  } catch (error) {
    scheduleError.value = error instanceof Error ? error.message : 'Tanggal pembayaran gagal disimpan.'
    await load()
  } finally {
    savingSchedule.value = false
  }
}
async function saveProgress() { saving.value = true; try { await updateNotaryProgress(Number(route.params.spkId), progressStatus.value, progressNote.value); progressOpen.value = false; progressNote.value = ''; await load() } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Status gagal diperbarui.' } finally { saving.value = false } }
onMounted(load)
</script>
<style scoped>
.review-page { --review-gap: 16px; font-family: var(--font-primary); } .review-shell { max-width: 1100px; margin: 0 auto; padding: 24px 16px calc(96px + env(safe-area-inset-bottom)); color: var(--text-primary); } .review-navigation { margin-bottom: 16px; } .review-back-button { display:inline-flex; align-items:center; gap:8px; min-height:44px; padding:8px 12px; border:1px solid var(--border-default); border-radius:var(--radius-control); background:var(--surface-primary); color:var(--text-primary); font:inherit; font-weight:600; cursor:pointer; transition:background-color .2s ease, border-color .2s ease; } .review-back-button:hover { background:var(--surface-muted); border-color:var(--poliland-green); } .review-back-button:active { transform:translateY(1px); } .review-back-button ion-icon { font-size:18px; } .review-heading,.section-head { display:flex; justify-content:space-between; gap:16px; align-items:flex-start; } .eyebrow { margin:0 0 4px; color:var(--poliland-gold-text); font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:.08em; } h1 { margin:0; font-size:clamp(24px,5vw,36px); } h2 { margin:0 0 16px; font-size:18px; } .review-id { color:var(--text-secondary); font-size:13px; } .status-chip,.payment-status { display:inline-flex; padding:6px 10px; border-radius:var(--radius-control); background:var(--status-success-bg); color:var(--poliland-green); font-weight:700; font-size:12px; } .review-panel { margin-top:var(--review-gap); padding:20px; background:var(--surface-primary); border:1px solid var(--border-default); border-radius:var(--radius-panel); } .info-grid { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:16px; margin:0; } dt { color:var(--text-secondary); font-size:12px; } dd { margin:4px 0 0; font-weight:600; overflow-wrap:anywhere; } .monthly-date-card { display:grid; gap:12px; max-width:560px; } .monthly-date-card > label { font-size:13px; font-weight:700; color:var(--text-primary); } .date-picker-wrap { display:flex; align-items:center; gap:10px; min-height:54px; padding:4px 12px; border:1px solid var(--border-default); border-radius:var(--radius-control); background:var(--surface-primary); color:var(--poliland-green); } .date-picker-wrap ion-icon { font-size:21px; flex:none; } .date-picker-wrap input { flex:1; width:100%; border:0; outline:0; padding:8px 0; min-width:0; } .date-picker-wrap input:focus-visible { outline:0; } .date-picker-hint,.schedule-empty { margin:0; color:var(--text-secondary); font-size:12px; line-height:1.6; } .monthly-date-meta { display:flex; flex-wrap:wrap; gap:8px 16px; color:var(--text-secondary); font-size:12px; } .schedule-save-message { margin:0; color:var(--status-success); font-size:13px; font-weight:600; } .schedule-save-error { margin:0; color:var(--status-danger); font-size:13px; } input,select,textarea { min-height:44px; border:1px solid var(--border-default); border-radius:var(--radius-control); padding:10px; color:var(--text-primary); background:var(--surface-primary); font:inherit; } .timeline { display:grid; gap:18px; } .timeline-item { display:grid; grid-template-columns:16px 1fr; gap:12px; position:relative; } .timeline-item:not(:last-child)::after { content:''; position:absolute; left:7px; top:18px; bottom:-20px; width:2px; background:var(--border-default); } .timeline-dot { width:14px; height:14px; border-radius:50%; background:var(--border-default); margin-top:3px; } .timeline-item.current .timeline-dot { background:var(--poliland-green); } .timeline-item small { display:block; color:var(--text-secondary); margin-top:4px; } .timeline-item p { margin:6px 0 0; } .review-state { display:grid; place-items:center; gap:8px; min-height:40vh; text-align:center; } .review-error { color:var(--status-danger); } .modal-field { display:grid; gap:6px; margin-bottom:16px; } .modal-field select,.modal-field textarea { width:100%; } button:focus-visible,input:focus-visible,select:focus-visible,textarea:focus-visible { outline:3px solid color-mix(in srgb,var(--poliland-green) 45%, transparent); outline-offset:2px; }
@media (max-width: 760px) { .review-shell { padding-top:16px; } .review-heading { display:block; } .review-id { display:block; margin-top:8px; } .info-grid { grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px 12px; } .monthly-date-card { max-width:none; } .monthly-date-meta { display:grid; gap:4px; } }
@media (max-width: 480px) { .info-grid { grid-template-columns:1fr; } .review-panel { padding:16px; border-radius:var(--radius-card); } }
</style>
