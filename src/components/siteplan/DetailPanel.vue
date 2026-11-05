<template>
  <div
    v-if="lot"
    class="detail-backdrop"
    :class="{ open: visible }"
    @click.self="close"
  >
    <aside
      class="detail-panel"
      @touchstart.stop
      @touchmove.stop
      @touchend.stop
      @touchcancel.stop
    >
      <!-- HEADER -->
      <header class="detail-header">
        <div>
          <div class="detail-label">Detail Kavling</div>
          <h2>{{ lot.lot_number || lot.polygon_id || '-' }}</h2>
        </div>

        <ion-button
          class="close-button"
          type="button"
          fill="clear"
          aria-label="Tutup detail kavling"
          @click="close"
        >
          <ion-icon :icon="closeOutline" aria-hidden="true"></ion-icon>
        </ion-button>
      </header>

      <!-- BODY -->
      <div class="detail-body">
        <!-- PANORAMA -->
        <div v-if="lot.panorama_url" class="media-preview">
          <img
            :src="lot.panorama_thumb || lot.panorama_url || defaultThumb"
            class="panorama-preview-image"
            alt="Panorama kavling"
          />

          <div class="panorama-overlay-content">
            <button
              type="button"
              class="view-360-button"
              @click="open360"
            >
              Lihat Panorama 360°
            </button>
          </div>
        </div>

        <div v-else class="no-panorama">
          <img
            :src="missingPanoramaMascot"
            class="no-panorama-mascot"
            alt="Maskot kebingungan karena panorama 360° belum tersedia"
          />
          <strong>Panorama tidak tersedia</strong>
        </div>

        <!-- STATUS -->
        <div class="status-box">
          <div>
            <span>Status</span>

            <strong :class="statusClass(lot.status)">
              {{ getStatusLabel(lot.status) }}
            </strong>
          </div>

          <div>
            <span>Blok</span>
            <strong>{{ getBlockCode(lot) }}</strong>
          </div>
        </div>

        <!-- SPESIFIKASI -->
        <section class="detail-section">
          <h3>Spesifikasi</h3>

          <div class="spec-grid">
            <div class="spec-card">
              <small>Dimensi</small>
              <strong>{{ lot.dimension || '-' }}</strong>
            </div>

            <div class="spec-card">
              <small>Luas</small>
              <strong>
                {{ lot.area ? `${lot.area} m²` : '-' }}
              </strong>
            </div>

            <div class="spec-card">
              <small>Harga Cash</small>
              <strong>
                {{ formatCurrency(lot.cash_price) }}
              </strong>
            </div>

            <div class="spec-card">
              <small>Harga Promo</small>
              <strong>
                {{ formatCurrency(lot.promo_price || lot.cash_price) }}
              </strong>
            </div>
          </div>
        </section>

        <!-- PEMBAYARAN -->
        <section class="detail-section">
          <h3>Pembayaran</h3>

          <div class="payment-tabs">
            <button
              :class="{ active: activeTab === 'cash' }"
              type="button"
              @click="activeTab = 'cash'"
            >
              Cash
            </button>

            <button
              :class="{ active: activeTab === 'installment' }"
              type="button"
              @click="activeTab = 'installment'"
            >
              Cicilan
            </button>
          </div>

          <!-- CASH -->
          <div
            v-if="activeTab === 'cash'"
            class="cash-box"
          >
            <div class="price-row">
              <span>Harga Cash</span>

              <strong>
                {{ formatCurrency(lot.cash_price) }}
              </strong>
            </div>

            <div class="normal-price">
              <span>Harga Promo</span>

              <del>
                {{ formatCurrency(lot.cash_price) }}
              </del>

              <strong>
                {{ formatCurrency(lot.promo_price || lot.cash_price) }}
              </strong>
            </div>
          </div>

          <!-- CICILAN -->
          <div
            v-else
            class="installment-list"
          >
            <div
              v-if="loadingInstallments"
              class="payment-note"
            >
              Memuat skema cicilan...
            </div>

            <template
              v-else-if="installments.length"
            >
              <div
                v-for="item in installments"
                :key="item.id"
                class="installment-item"
              >
                <span>
                  {{ item.payment_plans?.plan_name || 'Cicilan' }}
                </span>

                <strong>
                  {{ formatCurrency(item.monthly_payment) }}
                </strong>

                <small>
                  {{ item.payment_plans?.months || '-' }} bulan
                </small>
              </div>
            </template>

            <div
              v-else
              class="payment-note"
            >
              Belum tersedia skema cicilan.
            </div>
          </div>
        </section>

        <!-- INFORMASI -->
        <section
          v-if="
            lot.customer_id ||
            lot.transaction_date ||
            lot.description
          "
          class="detail-section"
        >
          <h3>Informasi</h3>

          <div class="spec-grid">
            <div
              v-if="lot.customer_id"
              class="spec-card"
            >
              <small>Customer</small>
              <strong>{{ lot.customer_id }}</strong>
            </div>

            <div
              v-if="lot.transaction_date"
              class="spec-card"
            >
              <small>Tanggal</small>
              <strong>
                {{ formatDate(lot.transaction_date) }}
              </strong>
            </div>

            <div
              v-if="lot.payment_type"
              class="spec-card"
            >
              <small>Tipe Pembayaran</small>
              <strong>
                {{ lot.payment_type }}
              </strong>
            </div>
          </div>

          <div
            v-if="lot.description"
            class="detail-description"
          >
            {{ lot.description }}
          </div>
        </section>
      </div>

      <!-- FOOTER ACTION -->
      <footer class="detail-footer">
        <div class="action-grid">
          <!-- SURVEI -->
          <AppButton
            class="survey-button"
            type="button"
            expand="block"
            @click="openSurveyModal"
          >
            Survei Lokasi
          </AppButton>

          <!-- BELI -->
          <AppButton
            class="buy-button"
            type="button"
            expand="block"
            @click="openPurchaseModal"
          >
            Beli
          </AppButton>
        </div>

        <!-- TANYA -->
        <AppButton
          type="button"
          class="ask-button"
          @click="askMoreAboutLot"
        >
          Tanya lebih lanjut
        </AppButton>
      </footer>
    </aside>

    <!-- ================================================= -->
    <!-- MODAL SURVEI LOKASI -->
    <!-- ================================================= -->

    <ion-modal
      :is-open="showSurveyModal"
      class="survey-modal"
      @didDismiss="closeSurveyModal"
    >
      <ion-header>
        <ion-toolbar>
          <ion-title>Jadwalkan Survei</ion-title>

          <ion-buttons slot="end">
            <ion-button
              type="button"
              @click="closeSurveyModal"
            >
              Tutup
            </ion-button>
          </ion-buttons>
        </ion-toolbar>
      </ion-header>

      <ion-content class="ion-padding">
        <div class="survey-content">
          <!-- KAVLING -->
          <div class="survey-lot-info">
            <span>Kavling yang dipilih</span>

            <strong>
              {{
                lot?.lot_number ||
                lot?.polygon_id ||
                lot?.id ||
                '-'
              }}
            </strong>
          </div>

          <!-- TANGGAL -->
          <div class="survey-field">
            <label>Pilih Tanggal Survei</label>

            <ion-datetime
              v-model="surveyDate"
              presentation="date"
              :min="minimumSurveyDate"
            ></ion-datetime>
          </div>

          <!-- JAM -->
          <div class="survey-field">
            <label>Pilih Jam Survei</label>

            <ion-datetime
              v-model="surveyTime"
              presentation="time"
              hour-cycle="h23"
            ></ion-datetime>
          </div>

          <!-- CONFIRM -->
          <ion-button
            expand="block"
            class="confirm-survey-button"
            :disabled="!surveyDate || !surveyTime"
            @click="confirmSurvey"
          >
            Konfirmasi Survei
          </ion-button>
        </div>
      </ion-content>
    </ion-modal>

    <ion-modal
  :is-open="showPurchaseModal"
  class="purchase-modal"
  @didDismiss="closePurchaseModal"
>
  <ion-content>
    <div class="purchase-modal-content">
      <div class="purchase-mascot-wrapper">
        <img
          :src="verifiedMascot"
          class="purchase-mascot"
          alt="Maskot PoliLand Kairagi"
        />
      </div>
      <div class="purchase-text">
        <h2>Informasi Pembelian</h2>

        <p>
          Untuk melakukan pembelian kavling, kami membutuhkan
          data diri Anda untuk keperluan administrasi dengan Notaris.
        </p>

        <p>
          Data tersebut juga diperlukan agar Anda dapat
          memantau perkembangan proses pembelian kavling,
          termasuk informasi pembayaran dan status transaksi Anda.
        </p>

        <p class="purchase-note">
          Silakan masuk atau daftar akun untuk melanjutkan
          proses pembelian.
        </p>
      </div>

      <div class="purchase-actions">
        <AppButton
          expand="block"
          class="cancel-purchase-button"
          variant="secondary"
          @click="closePurchaseModal"
        >
          Batal
        </AppButton>

        <AppButton
          expand="block"
          class="continue-purchase-button"
          @click="goToLogin"
        >
          Lanjutkan ke Login
        </AppButton>
      </div>
    </div>
  </ion-content>
</ion-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import AppButton from '../ui/AppButton.vue'

import {
  IonButton,
  IonIcon,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
  IonDatetime,
} from '@ionic/vue'

import { cartOutline, closeOutline } from 'ionicons/icons'

import missingPanoramaMascot from '@/assets/mascot/Confused_Mascot_and_Missing Panorama.png'
import verifiedMascot from '@/assets/mascot/Verified_Mascot.png'

import { getLotInstallments } from '../../services/siteplanService'

import {
  formatCurrency,
  formatDate,
  getStatusLabel,
} from '../../utils/siteplan'

/* ===================================================== */
/* DEFAULT THUMBNAIL */
/* ===================================================== */

const defaultThumb =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(`
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="800"
      height="400"
      viewBox="0 0 800 400"
    >
      <rect
        width="800"
        height="400"
        fill="#E5E5E5"
      />

      <rect
        x="60"
        y="80"
        width="680"
        height="240"
        rx="24"
        fill="#EDE6D6"
      />

      <circle
        cx="180"
        cy="175"
        r="45"
        fill="#8CA072"
      />

      <rect
        x="250"
        y="140"
        width="330"
        height="24"
        rx="12"
        fill="#8CA072"
      />

      <rect
        x="250"
        y="185"
        width="250"
        height="20"
        rx="10"
        fill="#6B6B6B"
      />

      <rect
        x="250"
        y="220"
        width="290"
        height="20"
        rx="10"
        fill="#6B6B6B"
      />
    </svg>
  `)

/* ===================================================== */
/* PROPS */
/* ===================================================== */

const props = defineProps({
  lot: {
    type: Object,
    default: null,
  },
})

/* ===================================================== */
/* EMITS */
/* ===================================================== */

const emit = defineEmits(['close'])

/* ===================================================== */
/* ROUTER */
/* ===================================================== */

const router = useRouter()

/* ===================================================== */
/* STATE */
/* ===================================================== */

const visible = ref(false)

const activeTab = ref<'cash' | 'installment'>('cash')

const installments = ref<any[]>([])

const loadingInstallments = ref(false)

/* ===================================================== */
/* WHATSAPP */
/* ===================================================== */

/*
 * GANTI NOMOR INI DENGAN NOMOR WHATSAPP POLILAND
 *
 * Contoh:
 * 081234567890
 *
 * menjadi:
 * 6281234567890
 */

const WHATSAPP_NUMBER = '6281356960253'

/* ===================================================== */
/* SURVEY STATE */
/* ===================================================== */

const showSurveyModal = ref(false)

const surveyDate = ref<string | undefined>(undefined)

const surveyTime = ref<string | undefined>(undefined)

/*
 * User hanya dapat memilih tanggal hari ini
 * atau tanggal setelah hari ini.
 */

const minimumSurveyDate =
  new Date().toISOString().split('T')[0]

/* ===================================================== */
/* WATCH LOT */
/* ===================================================== */

watch(
  () => props.lot,

  async (lot) => {
    if (!lot) {
      visible.value = false
      return
    }

    visible.value = true

    await loadInstallments(lot.id)
  },

  {
    immediate: true,
  }
)

/* ===================================================== */
/* LOAD INSTALLMENTS */
/* ===================================================== */

async function loadInstallments(
  lotId: string | number
) {
  if (!lotId) return

  loadingInstallments.value = true

  try {
    installments.value =
      await getLotInstallments(lotId)
  } catch (error) {
    console.error(
      'Gagal memuat cicilan:',
      error
    )

    installments.value = []
  } finally {
    loadingInstallments.value = false
  }
}

/* ===================================================== */
/* CLOSE DETAIL */
/* ===================================================== */

function close() {
  visible.value = false

  emit('close')
}

/* ===================================================== */
/* OPEN PANORAMA 360 */
/* ===================================================== */

function open360() {
  const identifier =
    props.lot?.lot_number ||
    props.lot?.polygon_id ||
    props.lot?.id

  router.push(
    `/panorama/${identifier}`
  )
}

/* ===================================================== */
/* SURVEY */
/* ===================================================== */

function openSurveyModal() {
  /*
   * Reset pilihan setiap kali modal dibuka.
   */

  surveyDate.value = undefined

  surveyTime.value = undefined

  showSurveyModal.value = true
}

function closeSurveyModal() {
  showSurveyModal.value = false
}

/* ===================================================== */
/* BUY */
/* ===================================================== */

const showPurchaseModal = ref(false)

function openPurchaseModal() {
  showPurchaseModal.value = true
}

function closePurchaseModal() {
  showPurchaseModal.value = false
}

function goToLogin() {
  showPurchaseModal.value = false
  router.push('/login')
}

/* ===================================================== */
/* GET LOT NAME */
/* ===================================================== */

function getLotName() {
  return (
    props.lot?.lot_number ||
    props.lot?.polygon_id ||
    props.lot?.id ||
    '-'
  )
}

/* ===================================================== */
/* WHATSAPP */
/* ===================================================== */

function openWhatsApp(
  message: string
) {
  const url =
    `https://wa.me/${WHATSAPP_NUMBER}` +
    `?text=${encodeURIComponent(message)}`

  window.open(
    url,
    '_blank'
  )
}

/* ===================================================== */
/* FORMAT SURVEY DATE */
/* ===================================================== */

function formatSurveyDate(
  date: string
) {
  const parsedDate =
    new Date(date)

  return new Intl.DateTimeFormat(
    'id-ID',
    {
      day: '2-digit',
      month: 'long',
      year: 'numeric',
    }
  ).format(parsedDate)
}

/* ===================================================== */
/* FORMAT SURVEY TIME */
/* ===================================================== */

function formatSurveyTime(
  time: string
) {
  const parsedDate =
    new Date(time)

  return new Intl.DateTimeFormat(
    'id-ID',
    {
      hour: '2-digit',
      minute: '2-digit',
      hourCycle: 'h23',
    }
  ).format(parsedDate)
}

/* ===================================================== */
/* CONFIRM SURVEY */
/* ===================================================== */

function confirmSurvey() {
  if (
    !surveyDate.value ||
    !surveyTime.value
  ) {
    return
  }

  const lotName =
    getLotName()

  const blockName =
    getBlockCode(props.lot)

  const blockText =
    blockName !== '-' ? ` blok ${blockName}` : ''

  const date =
    formatSurveyDate(
      surveyDate.value
    )

  const time =
    formatSurveyTime(
      surveyTime.value
    )

  const message =
    `Halo, saya tertarik untuk melakukan survei lokasi ` +
    `kavling ${lotName}${blockText}. ` +
    `Saya ingin melakukan survei pada tanggal ` +
    `${date} pukul ${time}. ` +
    `Mohon konfirmasi ketersediaan jadwal survei. ` +
    `Terima kasih.`

  openWhatsApp(message)

  closeSurveyModal()
}

/* ===================================================== */
/* ASK MORE ABOUT LOT */
/* ===================================================== */

function askMoreAboutLot() {
  const lotName =
    getLotName()

  const blockName =
    getBlockCode(props.lot)

  const blockText =
    blockName !== '-' ? ` blok ${blockName}` : ''

  const message =
    `Halo, saya ingin bertanya lebih lanjut ` +
    `mengenai kavling ${lotName}${blockText}. ` +
    `Mohon informasinya mengenai kavling tersebut. ` +
    `Terima kasih.`

  openWhatsApp(message)
}

/* ===================================================== */
/* STATUS */
/* ===================================================== */

function statusClass(
  status: string
) {
  const value =
    status?.trim().toLowerCase()

  if (
    [
      'available',
      'tersedia',
    ].includes(value)
  ) {
    return 'available'
  }

  if (
    [
      'booking',
      'dibooking',
      'booked',
      'reserved',
      'dipesan',
    ].includes(value)
  ) {
    return 'booking'
  }

  if (
    [
      'sold',
      'terjual',
    ].includes(value)
  ) {
    return 'sold'
  }

  return 'default'
}

/* ===================================================== */
/* BLOCK */
/* ===================================================== */

function getBlockCode(
  lot: any
) {
  const block =
    Array.isArray(lot?.blocks)
      ? lot.blocks[0]
      : lot?.blocks

  return (
    block?.code ||
    lot?.block_code ||
    lot?.block_id ||
    '-'
  )
}
</script>

<style scoped>
/* ===================================================== */
/* BACKDROP */
/* ===================================================== */

.detail-backdrop {
  position: fixed;
  inset: 0;
  z-index: 9999;

  display: flex;
  align-items: flex-end;
  justify-content: center;

  background: rgba(26, 26, 26, 0.45);

  opacity: 0;
  visibility: hidden;

  transition: all 0.25s ease;
}

.detail-backdrop.open {
  opacity: 1;
  visibility: visible;
}

/* ===================================================== */
/* DETAIL PANEL */
/* ===================================================== */

.detail-panel {
  position: relative;

  width: 100%;
  max-width: 500px;

  height: min(88dvh, 720px);

  background: #ffffff;

  border-radius: 22px 22px 0 0;

  overflow: hidden;

  display: flex;
  flex-direction: column;

  transform: translateY(100%);

  transition:
    transform 0.25s ease;
}

.detail-backdrop.open
.detail-panel {
  transform: translateY(0);
}

/* ===================================================== */
/* HEADER */
/* ===================================================== */

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;

  gap: 12px;

  padding: 18px 18px 10px;

  border-bottom:
    1px solid #e5e5e5;
}

.detail-label {
  font-size: 10px;
  font-weight: 700;

  letter-spacing: 0.08em;

  text-transform: uppercase;

  color: #6b6b6b;
}

.detail-header h2 {
  margin: 4px 0 0;

  font-size: 24px;
  font-weight: 800;

  color: #1a1a1a;
}

/* ===================================================== */
/* CLOSE BUTTON */
/* ===================================================== */

.close-button {
  --background: #fafaf7;
  --background-hover: #f1f0ea;

  --color: #556b2f;

  --border-radius: 50%;

  --padding-start: 0;
  --padding-end: 0;
  --padding-top: 0;
  --padding-bottom: 0;

  width: 36px;
  height: 36px;

  margin: -4px 0 0;

  flex: 0 0 36px;
}

/* ===================================================== */
/* BODY */
/* ===================================================== */

.detail-body {
  flex: 1 1 auto;

  min-height: 0;

  height: auto;

  overflow-y: auto;

  /* DetailPanel memiliki scroll container sendiri.
     Jangan teruskan overscroll ke halaman di belakangnya. */
  overscroll-behavior-y: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-y;

  padding: 16px 18px 0;

  background: #ffffff;
}

/* ===================================================== */
/* MEDIA */
/* ===================================================== */

.media-preview {
  position: relative;

  width: 100%;
  height: 150px;

  overflow: hidden;

  border-radius: 16px;

  background: #fafaf7;
}

.panorama-preview-image {
  width: 100%;
  height: 100%;

  object-fit: cover;

  filter: saturate(0.95);
}

.panorama-overlay-content {
  position: absolute;

  inset: 0;

  display: flex;

  align-items: end;
  justify-content: center;

  padding-bottom: 12px;
}

.view-360-button {
  border: none;

  border-radius: 999px;

  background:
    rgba(26, 26, 26, 0.85);

  color: white;

  padding: 10px 16px;

  font-weight: 700;

  cursor: pointer;
}

.no-panorama {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;

  min-height: 220px;
  gap: 8px;
  padding: 12px;

  border-radius: 16px;

  background: #fafaf7;

  color: #6b6b6b;
}

.no-panorama-mascot {
  display: block;
  width: 100%;
  max-width: 280px;
  height: 160px;
  object-fit: contain;
}

/* ===================================================== */
/* STATUS */
/* ===================================================== */

.status-box {
  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 12px;

  margin-top: 16px;

  padding: 12px 14px;

  background: #fafaf7;

  border:
    1px solid #e5e5e5;

  border-radius: 14px;
}

.status-box > div {
  display: flex;

  flex-direction: column;

  gap: 4px;
}

.status-box span {
  font-size: 11px;

  text-transform: uppercase;

  letter-spacing: 0.08em;

  color: #6b6b6b;
}

.status-box strong {
  font-size: 14px;

  font-weight: 700;

  color: #1a1a1a;
}

.status-box strong.available {
  color: #2e7d32;
}

.status-box strong.booking {
  color: #f2a900;
}

.status-box strong.sold {
  color: #d32f2f;
}

/* ===================================================== */
/* SECTION */
/* ===================================================== */

.detail-section {
  margin-top: 18px;
}

.detail-section h3 {
  margin: 0 0 12px;

  font-size: 15px;

  font-weight: 700;

  color: #1a1a1a;
}

/* ===================================================== */
/* SPECIFICATION */
/* ===================================================== */

.spec-grid {
  display: grid;

  grid-template-columns:
    repeat(2, minmax(0, 1fr));

  gap: 10px;
}

.spec-card {
  display: flex;

  flex-direction: column;

  gap: 4px;

  padding: 12px;

  border-radius: 12px;

  background: #fafaf7;

  border:
    1px solid #e5e5e5;
}

.spec-card small {
  color: #6b6b6b;

  font-size: 11px;

  text-transform: uppercase;

  letter-spacing: 0.08em;
}

.spec-card strong {
  color: #1a1a1a;

  font-size: 13px;

  font-weight: 700;
}

/* ===================================================== */
/* PAYMENT TABS */
/* ===================================================== */

.payment-tabs {
  display: flex;

  gap: 8px;

  margin-bottom: 10px;
}

.payment-tabs button {
  flex: 1;

  border: none;

  border-radius: 10px;

  background: #fafaf7;

  color: #6b6b6b;

  padding: 10px;

  font-weight: 700;

  border:
    1px solid #e5e5e5;

  cursor: pointer;
}

.payment-tabs button.active {
  background: #ede6d6;

  color: #1a1a1a;

  border-color: #8ca072;
}

/* ===================================================== */
/* PAYMENT BOX */
/* ===================================================== */

.cash-box,
.installment-list {
  border-radius: 12px;

  background: #fafaf7;

  border:
    1px solid #e5e5e5;

  padding: 12px;
}

.price-row,
.normal-price {
  display: flex;

  justify-content: space-between;

  align-items: center;

  gap: 10px;

  padding: 6px 0;

  color: #1a1a1a;
}

.price-row span,
.normal-price span {
  color: #6b6b6b;

  font-size: 13px;
}

.price-row strong,
.normal-price strong {
  font-size: 14px;

  font-weight: 700;

  color: #1a1a1a;
}

.normal-price {
  display: grid;

  grid-template-columns:
    1fr auto;

  align-items: center;
}

.normal-price del {
  color: #6b6b6b;

  font-size: 12px;

  opacity: 0.7;
}

.payment-note {
  font-size: 13px;

  color: #6b6b6b;
}

/* ===================================================== */
/* INSTALLMENT */
/* ===================================================== */

.installment-item {
  display: grid;

  grid-template-columns:
    1fr auto;

  gap: 4px 12px;

  padding: 8px 0;

  border-bottom:
    1px solid #e5e5e5;
}

.installment-item:last-child {
  border-bottom: none;
}

.installment-item span {
  color: #6b6b6b;

  font-size: 13px;
}

.installment-item strong {
  color: #1a1a1a;

  font-size: 13px;
}

.installment-item small {
  grid-column: 1 / -1;

  color: #6b6b6b;

  font-size: 11px;
}

/* ===================================================== */
/* DESCRIPTION */
/* ===================================================== */

.detail-description {
  margin-top: 12px;

  color: #6b6b6b;

  font-size: 13px;

  line-height: 1.6;
}

/* ===================================================== */
/* FOOTER */
/* ===================================================== */

.detail-footer {
  padding:
    10px
    16px
    calc(10px + var(--tabbar-space, 88px));

  border-top:
    1px solid #e5e5e5;

  background: #ffffff;
}

/* ===================================================== */
/* ACTION BUTTONS */
/* ===================================================== */

.action-grid {
  display: grid;

  grid-template-columns:
    1fr 1fr;

  gap: 8px;

  margin-bottom: 6px;
}

.survey-button,
.buy-button {
  width: 100%;

  margin: 0;

  --border-radius: 10px;

  --min-height: 36px;

  --padding-top: 0;
  --padding-bottom: 0;

  --padding-start: 10px;
  --padding-end: 10px;

  font-size: 13px;

  font-weight: 700;
}

.survey-button {
  --background: #8ca072;

  --background-hover: #71875a;

  --color: #ffffff;
}

.buy-button {
  --background: #556b2f;

  --background-hover: #71875a;

  --color: #ffffff;
}

/* ===================================================== */
/* ASK BUTTON */
/* ===================================================== */

.ask-button {
  width: 100%;

  min-height: 34px;

  border: 1px solid #e5e9df;

  border-radius: 10px;

  background: #f8f9f6;

  color: #556b2f;

  padding: 6px 10px;

  font-size: 12px;

  font-weight: 700;

  cursor: pointer;
}

.ask-button:active {
  background: #ede6d6;
}

/* ===================================================== */
/* SURVEY MODAL */
/* ===================================================== */

.survey-content {
  display: flex;

  flex-direction: column;

  gap: 20px;
}

.survey-lot-info {
  display: flex;

  flex-direction: column;

  gap: 4px;

  padding: 14px;

  border-radius: 14px;

  background: #fafaf7;

  border:
    1px solid #e5e5e5;
}

.survey-lot-info span {
  font-size: 11px;

  color: #6b6b6b;

  text-transform: uppercase;

  letter-spacing: 0.08em;
}

.survey-lot-info strong {
  font-size: 18px;

  color: #1a1a1a;
}

/* ===================================================== */
/* SURVEY FIELD */
/* ===================================================== */

.survey-field {
  display: flex;

  flex-direction: column;

  gap: 8px;
}

.survey-field label {
  font-size: 14px;

  font-weight: 700;

  color: #1a1a1a;
}

.survey-field ion-datetime {
  width: 100%;

  border-radius: 14px;

  border:
    1px solid #e5e5e5;

  background: #fafaf7;
}

/* ===================================================== */
/* CONFIRM SURVEY */
/* ===================================================== */

.confirm-survey-button {
  margin-top: 4px;

  --background: #556b2f;

  --background-hover: #71875a;

  --color: #ffffff;

  --border-radius: 12px;

  --padding-top: 14px;

  --padding-bottom: 14px;

  font-weight: 700;
}


/* ===================================================== */
/* PURCHASE MODAL */
/* ===================================================== */

.purchase-modal {
  --width: 100%;
  --max-width: 430px;
  --height: auto;
  --border-radius: 24px;
}

.purchase-modal::part(content) {
  border-radius: 24px;
}

.purchase-modal-content {
  padding: 28px 22px 24px;
  background: #ffffff;
}

/* ===================================================== */
/* PURCHASE MASCOT */
/* ===================================================== */

.purchase-mascot-wrapper {
  display: flex;
  align-items: center;
  justify-content: center;

  width: 100%;
  margin: -4px auto 2px;
}

.purchase-mascot {
  display: block;

  width: 145px;
  max-width: 52vw;
  height: auto;

  object-fit: contain;
}

/* ===================================================== */
/* PURCHASE ICON */
/* ===================================================== */

.purchase-icon {
  width: 42px;
  height: 42px;

  margin: 4px auto 16px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 18px;

  background: #ede6d6;

  color: #556b2f;
}

.purchase-icon ion-icon {
  font-size: 21px;
}

.purchase-text {
  text-align: center;
}

.purchase-text h2 {
  margin: 0 0 12px;

  color: #1a1a1a;

  font-size: 20px;
  line-height: 1.3;

  font-weight: 800;
}

.purchase-text p {
  margin: 0 0 12px;

  color: #6b6b6b;

  font-size: 13px;
  line-height: 1.6;
}

.purchase-text .purchase-note {
  margin-top: 16px;
  margin-bottom: 0;

  color: #1a1a1a;

  font-weight: 600;
}

.purchase-actions {
  display: flex;
  flex-direction: column;

  gap: 8px;

  margin-top: 24px;
}

.cancel-purchase-button,
.continue-purchase-button {
  margin: 0;

  --border-radius: 12px;

  --padding-top: 13px;
  --padding-bottom: 13px;

  font-size: 14px;
  font-weight: 700;
}

/* ===================================================== */
/* MOBILE */
/* ===================================================== */

@media (max-width: 380px) {
  .detail-header {
    padding-left: 14px;
    padding-right: 14px;
  }

  .detail-body {
    padding-left: 14px;
    padding-right: 14px;
  }

  .detail-footer {
    padding-left: 14px;
    padding-right: 14px;
  }

  .action-grid {
    gap: 8px;
  }

  .survey-button,
  .buy-button {
    font-size: 13px;
  }
}
</style>