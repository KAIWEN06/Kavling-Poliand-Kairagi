<template>
  <ion-page>
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />

    <ion-content :fullscreen="true">
      <div class="detail-page client-detail-page">
        <PageBackButton fallback="/admin/kavling" label="Daftar kavling" />

        <div v-if="loading" class="state-card" role="status">
          <img :src="loadingMascot" alt="" class="loading-mascot" />
          <strong>Memuat detail kavling...</strong>
        </div>

        <div v-else-if="loadError" class="state-card" role="alert">
          <ion-icon :icon="alertCircleOutline" />
          <strong>Detail kavling gagal dimuat</strong>
          <p>{{ errorMessage }}</p>
          <AppButton variant="primary" @click="loadDetail">
            <span>Coba Lagi</span>
          </AppButton>
        </div>

        <template v-else-if="lot">
          <!-- Jadwal survei ditempatkan di bagian atas dengan gaya kartu booking editorial -->
          <section class="survey-card panel" aria-labelledby="survey-heading">
            <div class="survey-header">
              <div class="survey-heading">
                <div class="survey-icon" aria-hidden="true">
                  <ion-icon :icon="calendarOutline" />
                </div>
                <div>
                  <span class="eyebrow">KUNJUNGAN LOKASI</span>
                  <h2 id="survey-heading">Jadwalkan Survei Kavling</h2>
                  <p>Pilih hari dan jam yang kamu inginkan. Setelah dikirim, pengajuan berstatus Menunggu Konfirmasi dan perkembangannya dapat dipantau di halaman ini.</p>
                </div>
              </div>

              <div v-if="canRequestSurvey && selectedDate" class="date-badge" aria-hidden="true">
                <span class="date-badge-month">{{ shortMonthLabel }}</span>
                <strong class="date-badge-day">{{ selectedDate.getDate() }}</strong>
              </div>
            </div>

            <section v-if="clientSurveyRequests.length" class="client-survey-history" aria-label="Status pengajuan survei">
              <div class="client-survey-history-heading">
                <strong>Status pengajuan survei</strong>
                <button type="button" class="refresh-survey-status" :disabled="clientSurveyStatusLoading" @click="refreshClientSurveyStatus">
                  {{ clientSurveyStatusLoading ? 'Memuat…' : 'Perbarui status' }}
                </button>
              </div>

              <article
                v-for="request in clientSurveyRequests"
                :key="request.id"
                class="client-request-status"
                :class="request.status"
                role="status"
              >
                <div class="client-request-status-heading">
                  <div>
                    <strong>{{ clientSurveyStatusLabel(request.status) }}</strong>
                    <span>{{ formatSurveyRequestDate(request.scheduled_at) }}</span>
                  </div>
                </div>
                <p v-if="request.status === 'rejected'">
                  <b>Alasan penolakan:</b>
                  {{ request.rejection_reason || 'Admin belum mencantumkan alasan. Silakan hubungi Admin untuk informasi lebih lanjut.' }}
                </p>
                <p v-else-if="request.status === 'pending'">
                  Pengajuanmu sudah diterima dan sedang menunggu konfirmasi Admin. Slot ini dikunci sementara agar tidak diambil client lain.
                </p>
                <p v-else-if="request.status === 'confirmed'">
                  Jadwal survei sudah dikonfirmasi Admin. Silakan datang sesuai tanggal dan jam yang tertera.
                </p>
                <p v-else-if="request.status === 'cancelled'">
                  Pengajuan survei ini dibatalkan dan slotnya tersedia kembali.
                </p>
              </article>
            </section>

            <div v-if="hasActiveSurveyRequest" class="survey-active-request-hint">
              Kamu masih memiliki pengajuan survei yang {{ surveyRequestStatus?.status === 'pending' ? 'menunggu konfirmasi' : 'sudah dikonfirmasi' }}. Tunggu hingga pengajuan ini selesai sebelum membuat pengajuan baru untuk kavling ini.
            </div>

            <div v-if="canRequestSurvey" class="survey-form">

              <!-- Baris pilihan tanggal & navigasi hari -->
              <div class="calendar-block">
                <div class="calendar-topline">
                  <span class="step-label">01 · Tanggal Kunjungan</span>
                  <div class="day-switcher">
                    <button
                      type="button"
                      class="day-arrow"
                      aria-label="Hari sebelumnya"
                      @click="moveSurveyDay(-1)"
                    >
                      <ion-icon :icon="chevronBackOutline" />
                    </button>
                    <button
                      type="button"
                      class="day-arrow"
                      aria-label="Hari berikutnya"
                      @click="moveSurveyDay(1)"
                    >
                      <ion-icon :icon="chevronForwardOutline" />
                    </button>
                  </div>
                </div>

                <!-- Pilihan cepat beberapa hari ke depan (melewati hari libur operasional) -->
                <div class="quick-date-strip" role="group" aria-label="Pilihan tanggal cepat">
                  <button
                    v-for="chip in quickDateChips"
                    :key="chip.iso"
                    type="button"
                    class="quick-date-chip"
                    :class="{ active: selectedSurveyDate === chip.iso }"
                    :aria-pressed="selectedSurveyDate === chip.iso"
                    @click="selectQuickDate(chip.iso)"
                  >
                    <span class="quick-date-sub">{{ chip.tag }}</span>
                    <strong class="quick-date-main">{{ chip.label }}</strong>
                  </button>
                </div>

                <div class="date-picker-row">
                  <input
                    v-model="selectedSurveyDate"
                    class="survey-date-input"
                    type="date"
                    :min="todayISO"
                    aria-label="Tanggal survei"
                    @change="handleDateChange"
                  />
                  <span class="selected-date-label">{{ selectedDateLabel }}</span>
                </div>

                <div class="operating-hours-hint">
                  <ion-icon :icon="timeOutline" aria-hidden="true" />
                  <span>Jam operasional: <strong>{{ selectedHoursLabel }}</strong></span>
                </div>
              </div>

              <p v-if="isSelectedDayClosed" class="survey-note warning-note" role="status">
                Hari ini tidak memiliki jam operasional survei. Silakan pilih hari lain.
              </p>

              <!-- Grid slot waktu fleksibel sesuai jam buka-tutup pada contacts.operating_hours -->
              <div v-else class="time-slot-section">
                <div class="slot-heading">
                  <span class="step-label">02 · Pilih Jam ({{ timezoneSuffix }})</span>
                  <span class="slot-count">
                    {{ surveySlots.length }} tersedia<span v-if="bookedSurveySlots.length"> · {{ bookedSurveySlots.length }} terisi</span>
                  </span>
                </div>

                <div class="time-slots">
                  <button
                    v-for="time in allSurveySlots"
                    :key="time"
                    type="button"
                    class="time-slot"
                    :class="{
                      selected: selectedSurveyTime === time,
                      occupied: occupiedSurveySlots.includes(time),
                    }"
                    :aria-pressed="selectedSurveyTime === time"
                    :disabled="occupiedSurveySlots.includes(time) || availabilityLoading"
                    @click="selectedSurveyTime = time"
                  >
                    <ion-icon :icon="timeOutline" aria-hidden="true" />
                    <span class="slot-text">
                      {{ time }} {{ timezoneSuffix }}<small v-if="occupiedSurveySlots.includes(time)"> (Penuh)</small>
                    </span>
                  </button>
                </div>

                <p v-if="allSurveySlots.length === 0" class="survey-note warning-note" role="status">
                  Tidak ada jam survei tersedia pada tanggal ini. Silakan pilih tanggal lain.
                </p>
              </div>

              <div class="note-block">
                <label class="survey-label" for="survey-note">Catatan untuk Admin (opsional)</label>
                <textarea
                  id="survey-note"
                  v-model="surveyNote"
                  class="form-control survey-textarea"
                  rows="2"
                  maxlength="300"
                  placeholder="Contoh: Saya ingin melihat akses jalan dan posisi kavling."
                />
              </div>

              <!-- Ringkasan jadwal sebelum dikirim -->
              <div v-if="selectedSurveyTime && !isSelectedDayClosed" class="booking-summary-strip">
                <span>Jadwal dipilih:</span>
                <strong>{{ selectedDateLabel }} · {{ selectedSurveyTime }} {{ timezoneSuffix }}</strong>
              </div>

              <AppButton
                class="survey-submit"
                variant="primary"
                expand="block"
                :disabled="!selectedSurveyTime || isSelectedDayClosed || availabilityLoading || surveyRequestSaving"
                @click="sendSurveyRequest"
              >
                <ion-icon :icon="calendarOutline" slot="start" />
                <span>{{ surveyRequestSaving ? 'Menyimpan...' : 'Minta Survei' }}</span>
              </AppButton>

              <p class="survey-note">
                Jadwal yang dipilih merupakan permintaan. Waktu survei baru dianggap terkonfirmasi setelah mendapat persetujuan Admin.
              </p>
            </div>

            <div v-else class="survey-unavailable">
              <ion-icon :icon="informationCircleOutline" aria-hidden="true" />
              <span>
                Permintaan survei online hanya tersedia untuk kavling berstatus Tersedia.
                Silakan hubungi Admin untuk informasi lebih lanjut.
              </span>
            </div>
          </section>

          <!-- Kartu Utama Kavling -->
          <section class="hero-card">
            <div class="hero-image-wrap">
              <img
                v-if="lot.panorama_url"
                :src="lot.panorama_url"
                :alt="`Foto kavling ${lot.lot_number}`"
                class="hero-image"
                @click="openPanorama"
              />
              <div v-else class="image-placeholder">
                <img :src="missingPanoramaMascot" alt="" class="image-placeholder-mascot" />
                <span>Panorama 360° belum tersedia</span>
              </div>
              <AppButton
                v-if="lot.panorama_url"
                class="image-expand"
                variant="neutral"
                size="small"
                aria-label="Buka panorama"
                @click="openPanorama"
              >
                <ion-icon :icon="expandOutline" aria-hidden="true" />
              </AppButton>
            </div>

            <div class="client-lot-title">
              <div>
                <span class="eyebrow">INFORMASI KAVELING</span>
                <h1>{{ lot.lot_number }}</h1>
                <p>{{ blockLabel }}</p>
              </div>
              <strong :class="['status-pill', statusClass]">{{ statusLabel }}</strong>
            </div>

            <div class="spec-strip">
              <div>
                <span>Luas Tanah</span>
                <strong>{{ formatArea(lot.area) }}</strong>
              </div>
              <div>
                <span>Dimensi</span>
                <strong>{{ lot.dimension || 'Belum diatur' }}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong :class="['status-pill', statusClass]">{{ statusLabel }}</strong>
              </div>
            </div>

            <div v-if="!isSold" class="price-summary client-price-summary">
              <div>
                <span>Harga Normal</span>
                <s v-if="lot.cash_price">{{ rupiah(lot.cash_price) }}</s>
                <strong v-else>Belum diatur</strong>
              </div>
              <div class="promo-price">
                <span v-if="hasPromo" class="promo-label">PROMO KHUSUS</span>
                <strong>{{ rupiah(lot.promo_price || lot.cash_price) }}</strong>
              </div>
            </div>
            <div v-else class="sold-price-notice">
              <ion-icon :icon="lockClosedOutline" aria-hidden="true" />
              Informasi harga tidak ditampilkan untuk kavling yang sudah terjual.
            </div>

            <div class="client-contact-actions">
              <AppButton class="single-line-btn" variant="primary" expand="block" @click="contactAdmin">
                <ion-icon :icon="callOutline" slot="start" />
                <span>Hubungi Admin</span>
              </AppButton>
              <AppButton class="single-line-btn" variant="secondary" expand="block" @click="openOrderForm">
                <span>PESAN</span>
              </AppButton>
            </div>
            <p class="contact-caption">
              Butuh informasi harga, pembayaran, atau kondisi lokasi? Hubungi Admin PoliLand.
            </p>
          </section>

          <!-- Tab Detail -->
          <nav class="detail-tabs" aria-label="Detail kavling">
            <button
              v-for="item in tabs"
              :key="item.key"
              type="button"
              :class="{ active: activeTab === item.key }"
              :aria-current="activeTab === item.key ? 'page' : undefined"
              @click="activeTab = item.key"
            >
              {{ item.label }}
            </button>
          </nav>

          <section v-if="activeTab === 'info'" class="tab-content">
            <article class="panel">
              <h2>Informasi Kavling</h2>
              <dl class="info-list">
                <div><dt>Nomor Kavling</dt><dd>{{ lot.lot_number }}</dd></div>
                <div><dt>Blok</dt><dd>{{ blockLabel }}</dd></div>
                <div><dt>Luas Tanah</dt><dd>{{ formatArea(lot.area) }}</dd></div>
                <div><dt>Dimensi</dt><dd>{{ lot.dimension || '-' }}</dd></div>
                <div>
                  <dt>Status Kavling</dt>
                  <dd><span :class="['status-pill', statusClass]">{{ statusLabel }}</span></dd>
                </div>
                <div><dt>Keterangan</dt><dd>{{ lot.description || '-' }}</dd></div>
              </dl>
            </article>

            <article class="panel contact-panel">
              <div class="contact-panel-icon" aria-hidden="true">
                <ion-icon :icon="chatbubbleEllipsesOutline" />
              </div>
              <div>
                <h2>Perlu informasi lebih lanjut?</h2>
                <p>Admin siap membantu menjelaskan detail kavling dan proses pembelian.</p>
                <AppButton class="single-line-btn" variant="primary" size="small" @click="contactAdmin">
                  <ion-icon :icon="callOutline" slot="start" />
                  <span>Hubungi Admin</span>
                </AppButton>
              </div>
            </article>
          </section>

          <section v-else class="tab-content">
            <article class="panel panorama-panel">
              <div v-if="lot.panorama_url" class="panorama-preview" @click="openPanorama">
                <img :src="lot.panorama_url" :alt="`Panorama kavling ${lot.lot_number}`" />
                <AppButton
                  class="preview-expand"
                  variant="neutral"
                  size="small"
                  aria-label="Lihat panorama"
                  @click.stop="openPanorama"
                >
                  <ion-icon :icon="expandOutline" aria-hidden="true" />
                </AppButton>
              </div>
              <div v-else class="panorama-empty">
                <img :src="missingPanoramaMascot" alt="" class="panorama-empty-mascot" />
                <strong>Panorama 360° belum tersedia</strong>
              </div>
              <AppButton v-if="lot.panorama_url" class="single-line-btn" variant="primary" expand="block" @click="openPanorama">
                <ion-icon :icon="expandOutline" slot="start" />
                <span>Lihat Panorama</span>
              </AppButton>
            </article>
          </section>
        </template>
      </div>
    </ion-content>

    <MobileTabBar variant="client" />
    <ion-toast
      :is-open="toast.open"
      :message="toast.message"
      :color="toast.color"
      :duration="3500"
      @didDismiss="toast.open = false"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IonPage, IonContent, IonIcon, IonToast, onIonViewWillEnter,
} from '@ionic/vue'
import {
  alertCircleOutline, arrowBackOutline, calendarOutline, callOutline,
  chatbubbleEllipsesOutline, chevronBackOutline, chevronForwardOutline,
  expandOutline, informationCircleOutline, lockClosedOutline, timeOutline,
} from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import PageBackButton from '@/components/ui/PageBackButton.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import loadingMascot from '@/assets/mascot/Mascot Examining Transaction History.png'
import missingPanoramaMascot from '@/assets/mascot/Confused_Mascot_and_Missing Panorama.png'
import { lotService, type LotRecord } from '@/services/lotService'
import { contactsService, type OperatingHoursConfig, type DayKey } from '@/services/contactService'
import { surveyService, isSurveySlotConflict, type ClientSurveyRequest } from '@/services/surveyService'

type TabKey = 'info' | 'panorama'
const route = useRoute()
const router = useRouter()
const lotId = computed(() => Number(route.params.id))
const lot = ref<LotRecord | null>(null)
const loading = ref(true)
const loadError = ref(false)
const errorMessage = ref('')
const activeTab = ref<TabKey>('info')
const selectedSurveyDate = ref(toISODate(getDateInTimeZone('Asia/Makassar')))
const selectedSurveyTime = ref('')
const surveyNote = ref('')
const occupiedSurveySlots = ref<string[]>([])
const availabilityLoading = ref(false)
const surveyRequestSaving = ref(false)
const surveyRequestStatus = ref<ClientSurveyRequest | null>(null)
const clientSurveyRequests = ref<ClientSurveyRequest[]>([])
const clientSurveyStatusLoading = ref(false)
let availabilityRequestVersion = 0
const toast = reactive<{ open: boolean; message: string; color: 'success' | 'danger' | 'warning' }>({
  open: false, message: '', color: 'success',
})

const DEFAULT_OPERATING_HOURS: OperatingHoursConfig = {
  timezone: 'Asia/Makassar',
  days: {
    monday: { open: '09:00', close: '17:00', closed: false },
    tuesday: { open: '09:00', close: '17:00', closed: false },
    wednesday: { open: '09:00', close: '17:00', closed: false },
    thursday: { open: '09:00', close: '17:00', closed: false },
    friday: { open: '09:00', close: '17:00', closed: false },
    saturday: { open: '09:00', close: '17:00', closed: true },
    sunday: { open: '09:00', close: '17:00', closed: true },
  },
}

const adminWhatsapp = ref('')
const operatingHours = ref<OperatingHoursConfig>(DEFAULT_OPERATING_HOURS)
const todayISO = computed(() => toISODate(getDateInTimeZone(operatingHours.value.timezone || 'Asia/Makassar')))
const selectedDate = computed(() => parseISODate(selectedSurveyDate.value))
const selectedDateLabel = computed(() => selectedDate.value
  ? new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(selectedDate.value)
  : 'Pilih tanggal')
const shortMonthLabel = computed(() => selectedDate.value
  ? new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(selectedDate.value).toUpperCase()
  : 'BLN')
const dayKeyByIndex: DayKey[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
const selectedDayKey = computed<DayKey | null>(() => selectedDate.value ? dayKeyByIndex[selectedDate.value.getDay()] : null)
const selectedDayHours = computed(() => {
  if (!selectedDayKey.value) return null
  return operatingHours.value.days[selectedDayKey.value] ?? null
})
const timezoneSuffix = computed(() => {
  const tz = String(operatingHours.value.timezone || 'Asia/Makassar')
  if (tz === 'Asia/Jakarta') return 'WIB'
  if (tz === 'Asia/Jayapura') return 'WIT'
  return 'WITA'
})
const isSelectedDayClosed = computed(() => !selectedDayHours.value || Boolean(selectedDayHours.value.closed))
const selectedHoursLabel = computed(() => {
  if (!selectedDayHours.value || selectedDayHours.value.closed) return 'Tutup / Tidak ada jadwal survei'
  return `${selectedDayHours.value.open}–${selectedDayHours.value.close} ${timezoneSuffix.value}`
})
const quickDateChips = computed(() => {
  const chips: { iso: string; tag: string; label: string }[] = []
  const cursor = new Date()
  let offset = 0

  while (chips.length < 4 && offset < 45) {
    const candidate = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + offset)
    const iso = toISODate(candidate)
    const dayKey = dayKeyByIndex[candidate.getDay()]
    const hours = operatingHours.value.days[dayKey]
    offset += 1
    if (!hours || hours.closed) continue

    const tag = offset - 1 === 0
      ? 'Hari Ini'
      : offset - 1 === 1
        ? 'Besok'
        : new Intl.DateTimeFormat('id-ID', { weekday: 'short' }).format(candidate)
    const label = new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short' }).format(candidate)
    chips.push({ iso, tag, label })
  }

  return chips
})
const isSold = computed(() => ['sold', 'terjual'].includes(String(lot.value?.status || '').toLowerCase()))
const hasActiveSurveyRequest = computed(() => clientSurveyRequests.value.some((request) => ['pending', 'confirmed'].includes(request.status)))
const canRequestSurvey = computed(() => !isSold.value
  && !hasActiveSurveyRequest.value
  && ['available', 'tersedia', ''].includes(String(lot.value?.status || 'available').toLowerCase()))

/**
 * Menghasilkan pilihan jam secara fleksibel berdasarkan jam buka (`open`)
 * dan jam tutup (`close`) pada konfigurasi `operating_hours` hari terkait.
 */
const allSurveySlots = computed(() => {
  const hours = selectedDayHours.value
  if (!hours || hours.closed || !isValidTimeRange(hours.open, hours.close)) return []

  const slots: string[] = []
  const [openHour, openMinute] = hours.open.split(':').map(Number)
  const [closeHour, closeMinute] = hours.close.split(':').map(Number)
  const opening = openHour * 60 + openMinute
  const closing = closeHour * 60 + closeMinute
  const stepMinutes = 60
  const timezone = operatingHours.value.timezone || 'Asia/Makassar'
  const isToday = selectedSurveyDate.value === todayISO.value
  const nowParts = getTimePartsInTimeZone(timezone)
  const currentMinutes = nowParts.hour * 60 + nowParts.minute

  for (let minute = opening; minute + stepMinutes <= closing; minute += stepMinutes) {
    if (isToday && minute <= currentMinutes) continue
    slots.push(`${String(Math.floor(minute / 60)).padStart(2, '0')}:${String(minute % 60).padStart(2, '0')}`)
  }

  return slots
})

const bookedSurveySlots = computed(() =>
  allSurveySlots.value.filter((slot) => occupiedSurveySlots.value.includes(slot))
)
const surveySlots = computed(() =>
  allSurveySlots.value.filter((slot) => !occupiedSurveySlots.value.includes(slot))
)
const statusLabel = computed(() => {
  const value = String(lot.value?.status || 'Available').toLowerCase()
  if (['booking', 'booked', 'dipesan'].includes(value)) return 'Dipesan'
  if (['sold', 'terjual'].includes(value)) return 'Terjual'
  return 'Tersedia'
})
const statusClass = computed(() => {
  const value = String(lot.value?.status || 'Available').toLowerCase()
  return ['booking', 'booked', 'dipesan'].includes(value)
    ? 'booking'
    : ['sold', 'terjual'].includes(value) ? 'sold' : 'available'
})
const hasPromo = computed(() => {
  const promo = Number(lot.value?.promo_price || 0)
  const cash = Number(lot.value?.cash_price || 0)
  return promo > 0 && cash > 0 && promo < cash
})
const blockLabel = computed(() => {
  const raw = lot.value?.block as Record<string, unknown> | Record<string, unknown>[] | null
  const block = Array.isArray(raw) ? raw[0] : raw
  const name = block && (block.name || block.code || block.title || block.label)
  return name ? (String(name).toLowerCase().startsWith('blok') ? String(name) : `Blok ${name}`) : lot.value?.block_id ? `Blok ${lot.value.block_id}` : 'Blok belum ditentukan'
})

function isValidTimeRange(open: string, close: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(open)
    && /^([01]\d|2[0-3]):[0-5]\d$/.test(close)
    && open < close
}

function getTimePartsInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(new Date())
  return {
    hour: Number(parts.find((part) => part.type === 'hour')?.value || 0),
    minute: Number(parts.find((part) => part.type === 'minute')?.value || 0),
  }
}

function getDateInTimeZone(timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  return new Date(
    Number(parts.find((part) => part.type === 'year')?.value || 0),
    Number(parts.find((part) => part.type === 'month')?.value || 1) - 1,
    Number(parts.find((part) => part.type === 'day')?.value || 1),
  )
}
function toISODate(date: Date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
function parseISODate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const [year, month, day] = value.split('-').map(Number)
  const date = new Date(year, month - 1, day)
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null
}
function notify(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
  toast.message = message
  toast.color = color
  toast.open = true
}
function clientSurveyStatusLabel(status: ClientSurveyRequest['status']) {
  return {
    pending: 'Menunggu konfirmasi Admin',
    confirmed: 'Permintaan dikonfirmasi',
    completed: 'Survei selesai',
    rejected: 'Permintaan ditolak',
    cancelled: 'Permintaan dibatalkan',
  }[status]
}
function formatSurveyRequestDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Makassar',
  }).format(new Date(value)) + ' WITA'
}
function rupiah(value: number | string | null | undefined) {
  const amount = Number(value)
  return Number.isFinite(amount) && amount > 0 ? `Rp ${amount.toLocaleString('id-ID')}` : 'Belum diatur'
}
function formatArea(value: number | string | null | undefined) {
  const area = Number(value)
  return Number.isFinite(area) && area > 0 ? `${area.toLocaleString('id-ID')} m²` : 'Belum diatur'
}
function formatWhatsAppMessage(includeSchedule: boolean) {
  const lotNumber = lot.value?.lot_number || `ID ${lotId.value}`
  const lines = [
    'Halo Admin PoliLand Kairagi, saya ingin bertanya mengenai kavling.',
    `Nomor kavling: ${lotNumber}`,
  ]
  if (includeSchedule) {
    lines.push(
      `Permintaan survei: ${selectedDateLabel.value}`,
      `Jam pilihan: ${selectedSurveyTime.value} ${timezoneSuffix.value}`,
    )
    if (surveyNote.value.trim()) lines.push(`Catatan: ${surveyNote.value.trim()}`)
  }
  lines.push('Mohon konfirmasi ketersediaan jadwal. Terima kasih.')
  return lines.join('\n')
}
function openWhatsApp(message: string) {
  if (!adminWhatsapp.value) {
    notify('Nomor WhatsApp Admin belum diatur pada menu Kontak di Kelola Konten.', 'warning')
    return
  }
  const url = `https://wa.me/${adminWhatsapp.value}?text=${encodeURIComponent(message)}`
  window.open(url, '_blank', 'noopener,noreferrer')
}
function contactAdmin() {
  openWhatsApp(formatWhatsAppMessage(false))
}
function openOrderForm() {
  if (!lot.value) return
  router.push({
    name: 'DokumenClient',
    query: { create: '1', lot_id: String(lot.value.id) },
  })
}
async function refreshSurveyAvailability() {
  const dateToCheck = selectedSurveyDate.value
  const requestVersion = ++availabilityRequestVersion

  if (!dateToCheck || isSelectedDayClosed.value) {
    occupiedSurveySlots.value = []
    availabilityLoading.value = false
    return
  }

  availabilityLoading.value = true
  try {
    const booked = await surveyService.getBookedSlots(dateToCheck)
    if (requestVersion === availabilityRequestVersion && dateToCheck === selectedSurveyDate.value) {
      occupiedSurveySlots.value = booked
    }
  } catch (error) {
    console.error('[ClientKavlingDetail] Gagal memuat slot survei:', error)
    if (requestVersion === availabilityRequestVersion && dateToCheck === selectedSurveyDate.value) {
      occupiedSurveySlots.value = allSurveySlots.value.slice()
      notify('Ketersediaan jadwal gagal diperiksa. Slot dinonaktifkan sementara demi mencegah bentrok.', 'warning')
    }
  } finally {
    if (requestVersion === availabilityRequestVersion) availabilityLoading.value = false
  }
}

watch(selectedSurveyDate, async () => {
  selectedSurveyTime.value = ''
  await refreshSurveyAvailability()
})

async function refreshClientSurveyStatus() {
  if (clientSurveyStatusLoading.value) return
  clientSurveyStatusLoading.value = true
  try {
    const latestRequests = await surveyService.getClientRequests(lotId.value)
    clientSurveyRequests.value = latestRequests
    surveyRequestStatus.value = latestRequests[0] ?? null
  } catch (error) {
    console.error('[ClientKavlingDetail] Gagal memperbarui status survei:', error)
    notify('Status survei belum berhasil diperbarui. Coba beberapa saat lagi.', 'warning')
  } finally {
    clientSurveyStatusLoading.value = false
  }
}

async function sendSurveyRequest() {
  if (surveyRequestSaving.value) return

  if (!canRequestSurvey.value) {
    notify('Survei online hanya dapat diminta untuk kavling yang tersedia.', 'warning')
    return
  }

  if (!selectedSurveyDate.value || !selectedSurveyTime.value || isSelectedDayClosed.value) {
    notify('Pilih tanggal dan jam survei terlebih dahulu.', 'warning')
    return
  }

  if (occupiedSurveySlots.value.includes(selectedSurveyTime.value)) {
    notify('Jam tersebut baru saja dipesan client lain. Pilih jam yang masih tersedia.', 'warning')
    await refreshSurveyAvailability()
    return
  }

  const localDateTime = `${selectedSurveyDate.value}T${selectedSurveyTime.value}:00+08:00`
  const scheduledAt = new Date(localDateTime)
  if (Number.isNaN(scheduledAt.getTime())) {
    notify('Tanggal atau jam survei tidak valid.', 'warning')
    return
  }

  surveyRequestSaving.value = true
  try {
    await surveyService.requestSurvey({
      lotId: lotId.value,
      scheduledAt: scheduledAt.toISOString(),
      note: surveyNote.value,
    })

    notify('Permintaan survei berhasil dicatat. Jadwal menunggu konfirmasi Admin.')
    selectedSurveyTime.value = ''
    surveyNote.value = ''
    // Pengajuan sudah tersimpan sebagai pending. Kegagalan refresh status
    // tidak boleh membuat UI menganggap pengajuan gagal.
    await refreshClientSurveyStatus()
    await refreshSurveyAvailability()
  } catch (error) {
    console.error('[ClientKavlingDetail] Gagal membuat permintaan survei:', error)

    if (isSurveySlotConflict(error)) {
      notify('Maaf, jam ini baru saja berhasil diambil client lain. Silakan pilih jam berbeda.', 'warning')
      await refreshSurveyAvailability()
    } else {
      const message = error instanceof Error ? error.message : 'Gagal menyimpan permintaan survei.'
      notify(message.includes('SURVEY_DAY_CLOSED')
        ? 'Hari tersebut sudah tidak menerima survei.'
        : message.includes('SURVEY_OUTSIDE_OPERATING_HOURS')
          ? 'Jam yang dipilih berada di luar jam operasional.'
          : message.includes('LOT_NOT_AVAILABLE_FOR_SURVEY')
            ? 'Status kavling sudah berubah dan tidak dapat diajukan untuk survei.'
            : 'Permintaan survei gagal disimpan. Silakan coba lagi.', 'danger')
    }
  } finally {
    surveyRequestSaving.value = false
  }
}
function selectQuickDate(iso: string) {
  selectedSurveyDate.value = iso
  selectedSurveyTime.value = ''
}
function moveSurveyDay(direction: number) {
  const current = selectedDate.value || new Date()
  const next = new Date(current)
  next.setDate(next.getDate() + direction)

  if (toISODate(next) < todayISO.value) {
    notify('Tidak dapat memilih tanggal yang sudah lewat.', 'warning')
    return
  }

  selectedSurveyDate.value = toISODate(next)
  selectedSurveyTime.value = ''
}
function handleDateChange() {
  selectedSurveyTime.value = ''
  if (selectedSurveyDate.value < todayISO.value) {
    selectedSurveyDate.value = todayISO.value
    notify('Tanggal survei tidak dapat dipilih pada hari yang sudah lewat.', 'warning')
  }
}
function openPanorama() {
  if (!lot.value?.panorama_url) return
  router.push({ name: 'Panorama', params: { lotId: String(lot.value.id) } })
}
async function loadDetail() {
  if (!Number.isInteger(lotId.value) || lotId.value <= 0) {
    loadError.value = true
    errorMessage.value = 'ID kavling tidak valid.'
    loading.value = false
    return
  }
  loading.value = true
  loadError.value = false
  errorMessage.value = ''
  try {
    const [rows, contactSettings, latestRequests] = await Promise.all([
      lotService.getClientLots(),
      contactsService.getClientContactSettings(),
      surveyService.getClientRequests(lotId.value),
    ])
    lot.value = rows.find((row) => Number(row.id) === lotId.value) ?? null
    clientSurveyRequests.value = latestRequests
    surveyRequestStatus.value = latestRequests[0] ?? null
    adminWhatsapp.value = contactSettings.whatsapp
    if (contactSettings.operatingHours) {
      operatingHours.value = contactSettings.operatingHours
    }
    if (!lot.value) throw new Error('Data kavling tidak ditemukan atau tidak dapat diakses.')
    await refreshSurveyAvailability()
  } catch (error) {
    console.error('[ClientKavlingDetail] Gagal memuat detail:', error)
    errorMessage.value = error instanceof Error ? error.message : 'Terjadi kesalahan saat memuat detail kavling.'
    loadError.value = true
  } finally {
    loading.value = false
  }
}
onIonViewWillEnter(loadDetail)

const tabs: { key: TabKey; label: string }[] = [
  { key: 'info', label: 'Informasi' },
  { key: 'panorama', label: 'Panorama 360°' },
]
</script>

<style scoped>
.detail-page {
  padding: 12px 16px calc(112px + env(safe-area-inset-bottom));
  background: var(--app-background, #faf9f6);
  color: var(--text-primary, #252525);
  font-family: var(--font-primary, var(--ion-font-family, 'Plus Jakarta Sans', sans-serif));
}

.detail-back-nav {
  display: flex;
  align-items: center;
  margin-bottom: 12px;
}

.back-action {
  margin: 0;
}

.panel,
.hero-card {
  background: var(--surface-primary, #ffffff);
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  box-shadow: 0 2px 8px rgba(37, 37, 37, 0.04);
}

.panel {
  padding: 16px;
  margin-bottom: 16px;
}

.hero-card {
  overflow: hidden;
  padding: 14px;
  margin-bottom: 16px;
}

/* Pastikan label tombol selalu 1 baris rapi */
.single-line-btn {
  white-space: nowrap;
}

.single-line-btn::part(native) {
  white-space: nowrap;
}

/* --- Jadwal Survei: Gaya Booking Card Pinterest --- */
.survey-card {
  padding: 18px;
}

.client-request-status {
  margin-bottom: 16px;
  padding: 12px 14px;
  border: 1px solid var(--border-default, #eae7e0);
  border-left: 4px solid var(--status-warning, #966a12);
  border-radius: var(--radius-control, 12px);
  background: var(--status-warning-bg, #fbf4df);
  color: var(--text-primary, #252525);
}

.client-request-status > div {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 10px;
}

.client-request-status strong {
  color: var(--status-warning, #966a12);
  font-size: 13px;
}

.client-request-status span,
.client-survey-history {
  display: grid;
  gap: 10px;
  margin: 0 0 16px;
}
.client-survey-history-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  color: var(--text-primary, #252525);
  font-size: 13px;
}
.client-request-status-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.refresh-survey-status {
  min-height: 36px;
  border: 1px solid var(--border-default, #ddd);
  border-radius: 9px;
  background: var(--surface-primary, #fff);
  color: var(--text-primary, #252525);
  padding: 7px 10px;
  font: inherit;
  font-size: 11px;
  font-weight: 700;
}
.refresh-survey-status:disabled { opacity: .55; }
.survey-active-request-hint {
  margin: 0 0 14px;
  padding: 11px 13px;
  border-radius: 10px;
  background: var(--surface-muted, #f4f4f1);
  color: var(--text-secondary, #63636a);
  font-size: 12px;
  line-height: 1.55;
}

.client-request-status p {
  font-size: 11px;
  line-height: 1.5;
}

.client-request-status p {
  margin: 7px 0 0;
  color: var(--text-secondary, #63636a);
}

.client-request-status.confirmed {
  border-left-color: var(--poliland-green, #355a2c);
  background: var(--status-success-bg, #edf4ea);
}

.client-request-status.confirmed strong {
  color: var(--poliland-green, #355a2c);
}

.client-request-status.rejected {
  border-left-color: var(--status-danger, #d94b45);
  background: var(--status-danger-bg, #fff1f0);
}

.client-request-status.rejected strong {
  color: var(--status-danger, #d94b45);
}

.survey-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 14px;
  margin-bottom: 16px;
  border-bottom: 1px dashed var(--border-default, #eae7e0);
}

.survey-heading {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  min-width: 0;
}

.survey-icon,
.contact-panel-icon {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 44px;
  place-items: center;
  border-radius: 13px;
  background: color-mix(in srgb, var(--poliland-green, #355a2c) 12%, transparent);
  color: var(--poliland-green, #355a2c);
  font-size: 21px;
}

.eyebrow,
.client-lot-title .eyebrow {
  display: block;
  margin-bottom: 4px;
  color: var(--poliland-gold-text, #966a12);
  font-size: 10px;
  font-weight: 800;
  letter-spacing: 0.09em;
}

.survey-heading h2 {
  margin: 0 0 4px;
  color: var(--text-primary, #252525);
  font-size: 18px;
  font-weight: 800;
  line-height: 1.3;
}

.survey-heading p,
.contact-panel p {
  margin: 0;
  color: var(--text-secondary, #63636a);
  font-size: 12.5px;
  line-height: 1.5;
}

.date-badge {
  display: flex;
  width: 50px;
  flex: 0 0 50px;
  flex-direction: column;
  align-items: center;
  overflow: hidden;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: 12px;
  background: var(--surface-muted, #f5f3ee);
}

.date-badge-month {
  width: 100%;
  padding: 3px 0;
  background: var(--poliland-green, #355a2c);
  color: #ffffff;
  font-size: 9.5px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-align: center;
}

.date-badge-day {
  padding: 5px 0 6px;
  color: var(--text-primary, #252525);
  font-size: 17px;
  font-weight: 800;
  line-height: 1;
}

.calendar-block {
  margin-bottom: 14px;
}

.calendar-topline,
.slot-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.step-label {
  color: var(--text-primary, #252525);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.02em;
}

.day-switcher {
  display: flex;
  gap: 8px;
}

.day-arrow {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-muted, #f5f3ee);
  color: var(--text-primary, #252525);
  font-size: 18px;
  cursor: pointer;
  transition: background-color 150ms ease-out, border-color 150ms ease-out;
}

.day-arrow:hover {
  border-color: var(--poliland-green, #355a2c);
  background: var(--surface-primary, #ffffff);
}

.day-arrow:focus-visible,
.quick-date-chip:focus-visible,
.time-slot:focus-visible,
.detail-tabs button:focus-visible {
  outline: 3px solid var(--poliland-green, #355a2c);
  outline-offset: 2px;
}

.quick-date-strip {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 8px;
  margin-top: 10px;
}

.quick-date-chip {
  display: flex;
  min-height: 50px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 6px 4px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-muted, #f5f3ee);
  color: var(--text-primary, #252525);
  font-family: inherit;
  cursor: pointer;
  transition: all 150ms ease-out;
}

.quick-date-chip:hover {
  border-color: color-mix(in srgb, var(--poliland-green, #355a2c) 45%, var(--border-default, #eae7e0));
}

.quick-date-chip.active {
  border-color: var(--poliland-green, #355a2c);
  background: color-mix(in srgb, var(--poliland-green, #355a2c) 10%, var(--surface-primary, #ffffff));
  color: var(--poliland-green, #355a2c);
  box-shadow: inset 0 0 0 1px var(--poliland-green, #355a2c);
}

.quick-date-sub {
  font-size: 10px;
  font-weight: 600;
  color: var(--text-secondary, #63636a);
  white-space: nowrap;
}

.quick-date-chip.active .quick-date-sub {
  color: var(--poliland-green, #355a2c);
}

.quick-date-main {
  font-size: 12px;
  font-weight: 700;
  white-space: nowrap;
}

.date-picker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-top: 10px;
  padding: 8px 10px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-muted, #f5f3ee);
  flex-wrap: wrap;
}

.survey-date-input {
  min-height: 44px;
  padding: 6px 10px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: 10px;
  background: var(--surface-primary, #ffffff);
  color: var(--text-primary, #252525);
  font: inherit;
  font-size: 12px;
  font-weight: 600;
}

.selected-date-label {
  flex: 1;
  min-width: 140px;
  color: var(--text-primary, #252525);
  font-size: 12px;
  font-weight: 700;
  text-align: right;
}

.operating-hours-hint {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-top: 9px;
  padding: 9px 11px;
  border-radius: 10px;
  background: var(--surface-muted, #f5f3ee);
  color: var(--text-secondary, #63636a);
  font-size: 11.5px;
}

.operating-hours-hint ion-icon {
  flex: 0 0 16px;
  font-size: 16px;
  color: var(--poliland-green, #355a2c);
}

.operating-hours-hint strong {
  color: var(--text-primary, #252525);
}

.time-slot-section {
  margin-top: 14px;
}

.slot-heading {
  margin-bottom: 10px;
}

.slot-count {
  padding: 3px 8px;
  border-radius: 99px;
  background: var(--surface-muted, #f5f3ee);
  color: var(--text-secondary, #63636a);
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}

.time-slots {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.time-slot {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-muted, #f5f3ee);
  color: var(--text-primary, #252525);
  font-family: inherit;
  font-size: 12.5px;
  font-weight: 700;
  white-space: nowrap;
  cursor: pointer;
  transition: all 150ms ease-out;
}

.time-slot:hover {
  border-color: var(--poliland-green, #355a2c);
  background: var(--surface-primary, #ffffff);
}

.time-slot.selected {
  border-color: var(--poliland-green, #355a2c);
  background: var(--poliland-green, #355a2c);
  color: #ffffff;
}

.time-slot.occupied {
  opacity: 0.48;
  cursor: not-allowed;
  text-decoration: line-through;
  background: var(--surface-muted, #f5f3ee);
  border-style: dashed;
}

.time-slot small {
  font-size: 10px;
  font-weight: 600;
  text-decoration: none;
}

.time-slot:disabled {
  pointer-events: none;
}

.note-block {
  margin-top: 14px;
}

.survey-label {
  display: block;
  margin-bottom: 6px;
  color: var(--text-primary, #252525);
  font-size: 12px;
  font-weight: 700;
}

.form-control {
  display: block;
  width: 100%;
  box-sizing: border-box;
  min-height: 46px;
  padding: 10px 12px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-muted, #f5f3ee);
  color: var(--text-primary, #252525);
  font: inherit;
  font-size: 13px;
  outline: none;
}

.form-control:focus {
  border-color: var(--poliland-green, #355a2c);
  background: var(--surface-primary, #ffffff);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--poliland-green, #355a2c) 13%, transparent);
}

textarea.form-control {
  min-height: 76px;
  resize: vertical;
}

.booking-summary-strip {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  flex-wrap: wrap;
  margin-top: 12px;
  padding: 10px 12px;
  border: 1px solid color-mix(in srgb, var(--poliland-green, #355a2c) 28%, transparent);
  border-radius: var(--radius-control, 12px);
  background: var(--status-success-bg, #eef5ec);
  color: var(--poliland-green, #355a2c);
  font-size: 12px;
}

.booking-summary-strip strong {
  font-weight: 700;
}

.survey-submit {
  margin-top: 14px;
}

.survey-submit:disabled {
  opacity: 0.55;
}

.survey-note {
  margin: 10px 0 0;
  color: var(--text-secondary, #63636a);
  font-size: 11px;
  line-height: 1.5;
}

.warning-note {
  color: var(--poliland-gold-text, #966a12);
  font-weight: 700;
}

.survey-unavailable {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 12px 14px;
  border-radius: var(--radius-control, 12px);
  background: var(--surface-muted, #f5f3ee);
  color: var(--text-secondary, #63636a);
  font-size: 12px;
  line-height: 1.5;
}

.survey-unavailable ion-icon {
  flex: 0 0 18px;
  margin-top: 1px;
  font-size: 18px;
}

/* --- Kartu Kavling & Detail --- */
.hero-image-wrap {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-control, 12px);
  aspect-ratio: 16 / 9;
  background: var(--surface-muted, #f5f3ee);
}

.hero-image {
  display: block;
  width: 100%;
  height: 100%;
  object-fit: cover;
  cursor: pointer;
}

.image-placeholder,
.panorama-empty {
  display: flex;
  height: 100%;
  min-height: 160px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 20px;
  border-radius: var(--radius-control, 12px);
  background: var(--surface-muted, #f5f3ee);
  color: var(--text-secondary, #63636a);
  text-align: center;
}

.image-placeholder-mascot,
.panorama-empty-mascot {
  width: min(170px, 60%);
  max-height: 128px;
  object-fit: contain;
}

.panorama-empty strong {
  font-size: 14px;
  color: var(--text-primary, #252525);
}

.loading-mascot {
  width: min(180px, 60%);
  height: auto;
  object-fit: contain;
}

.image-expand,
.preview-expand {
  position: absolute;
  right: 10px;
  bottom: 10px;
  width: 44px;
  height: 44px;
  min-height: 44px;
  margin: 0;
  --padding-start: 0;
  --padding-end: 0;
}

.client-lot-title {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 16px 4px 4px;
}

.client-lot-title h1 {
  margin: 0 0 3px;
  font-size: 22px;
  font-weight: 800;
  line-height: 1.25;
}

.client-lot-title p {
  margin: 0;
  color: var(--text-secondary, #63636a);
  font-size: 12.5px;
}

.spec-strip {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 12px;
  padding: 12px 4px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-muted, #f5f3ee);
}

.spec-strip > div {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  padding: 0 4px;
  text-align: center;
}

.spec-strip > div + div {
  border-left: 1px solid var(--border-default, #eae7e0);
}

.spec-strip span,
.price-summary span {
  color: var(--text-secondary, #63636a);
  font-size: 11px;
}

.spec-strip strong {
  font-size: 13.5px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  padding: 5px 10px;
  border-radius: 99px;
  background: var(--status-success-bg, #eef5ec);
  color: var(--poliland-green, #355a2c);
  font-size: 11px !important;
  font-weight: 700;
  white-space: nowrap;
}

.status-pill.booking {
  background: var(--poliland-gold-soft, #f4d69a);
  color: var(--poliland-gold-text-soft, #805708);
}

.status-pill.sold {
  background: color-mix(in srgb, var(--status-danger, #d94b45) 12%, #ffffff);
  color: var(--status-danger, #d94b45);
}

.price-summary {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 12px;
  margin-top: 12px;
  padding: 14px 4px;
  border-top: 1px solid var(--border-default, #eae7e0);
}

.client-price-summary {
  margin-top: 12px;
}

.price-summary > div {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.price-summary s {
  color: var(--text-secondary, #63636a);
  font-size: 13px;
}

.promo-price {
  text-align: right;
}

.promo-price strong {
  color: var(--poliland-gold-text, #966a12);
  font-size: 20px;
  font-weight: 800;
}

.promo-label {
  align-self: flex-end;
  padding: 4px 7px;
  border-radius: 5px;
  background: var(--poliland-gold-soft, #f4d69a);
  color: var(--poliland-gold-text-soft, #805708);
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
}

.sold-price-notice {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 12px 0 14px;
  padding: 11px 12px;
  border-radius: var(--radius-control, 12px);
  background: var(--surface-muted, #f5f3ee);
  color: var(--text-secondary, #63636a);
  font-size: 11.5px;
  line-height: 1.45;
}

.sold-price-notice ion-icon {
  flex: 0 0 17px;
  font-size: 17px;
}

.client-contact-actions {
  display: grid;
  grid-template-columns: 1.25fr 0.75fr;
  gap: 10px;
  padding: 4px 0 10px;
}

.contact-caption {
  margin: 0;
  padding: 0 8px 4px;
  color: var(--text-secondary, #63636a);
  font-size: 11px;
  line-height: 1.5;
  text-align: center;
}

/* Tab Detail */
.detail-tabs {
  position: sticky;
  top: 0;
  z-index: 5;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  margin: 0 0 14px;
  padding: 4px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-primary, #ffffff);
}

.detail-tabs button {
  min-height: 44px;
  padding: 0 8px;
  border: 0;
  border-radius: 9px;
  background: transparent;
  color: var(--text-secondary, #63636a);
  font: inherit;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  cursor: pointer;
  transition: background-color 150ms ease-out, color 150ms ease-out;
}

.detail-tabs button.active {
  background: color-mix(in srgb, var(--poliland-green, #355a2c) 11%, transparent);
  color: var(--poliland-green, #355a2c);
  font-weight: 700;
}

.tab-content {
  min-height: 200px;
}

.panel h2 {
  margin: 0 0 14px;
  font-size: 17px;
  font-weight: 700;
}

.info-list {
  margin: 0;
}

.info-list > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 11px 0;
  border-bottom: 1px solid var(--border-default, #eae7e0);
  font-size: 13px;
}

.info-list > div:last-child {
  border-bottom: 0;
}

.info-list dt {
  color: var(--text-secondary, #63636a);
}

.info-list dd {
  margin: 0;
  max-width: 58%;
  font-weight: 600;
  text-align: right;
  overflow-wrap: anywhere;
}

.contact-panel {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

.contact-panel h2 {
  margin: 0 0 5px;
  font-size: 15px;
}

.contact-panel p {
  margin-bottom: 12px;
}

.panorama-panel {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panorama-preview {
  position: relative;
  overflow: hidden;
  border-radius: var(--radius-control, 12px);
  aspect-ratio: 16 / 9;
  background: var(--surface-muted, #f5f3ee);
  cursor: pointer;
}

.panorama-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.state-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 36px 18px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #ffffff);
  color: var(--text-secondary, #63636a);
  text-align: center;
}

.state-card ion-icon {
  font-size: 32px;
}

.state-card strong {
  color: var(--text-primary, #252525);
}

@media (max-width: 380px) {
  .quick-date-strip {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .time-slots {
    grid-template-columns: 1fr;
  }

  .selected-date-label {
    text-align: left;
  }
}

@media (min-width: 700px) {
  .detail-page {
    max-width: 760px;
    margin: 0 auto;
    padding-top: 20px;
  }
}
</style>
