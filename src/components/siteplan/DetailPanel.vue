<template>
  <div
    v-if="lot"
    class="detail-backdrop"
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
        <button
          type="button"
          class="nav-button nav-button--back"
          :aria-label="blockName ? `Kembali ke ${blockName}` : 'Kembali ke Denah'"
          @click="close"
        >
          <ion-icon :icon="chevronBackOutline" aria-hidden="true"></ion-icon>
          <span>{{ blockName || 'Denah' }}</span>
        </button>

        <h2>
          <small>Kaveling</small>
          {{ lot.lot_number || lot.polygon_id || '-' }}
        </h2>

        <button
          v-if="blockName"
          type="button"
          class="nav-button nav-button--home"
          aria-label="Kembali ke Denah"
          @click="goHome"
        >
          <ion-icon :icon="mapOutline" aria-hidden="true"></ion-icon>
          <span>Denah</span>
        </button>
      </header>

      <!-- BODY -->
      <div class="detail-body">
        <!-- PANORAMA -->
        <div v-if="!showLotInfo" class="sold-scene">
          <div class="sold-stage">
            <img
              :src="soldMascot"
              class="sold-mascot"
              alt="Maskot PoliLand cemas di samping kalender bertanda terjual"
            />
            <svg
              class="sold-sparkles"
              viewBox="0 0 320 215"
              aria-hidden="true"
              focusable="false"
            >
              <path class="sold-star sold-star--a" d="M40 40 L45 55 L60 60 L45 65 L40 80 L35 65 L20 60 L35 55 Z" />
              <path class="sold-star sold-star--b" d="M278 150 L282 161 L293 165 L282 169 L278 180 L274 169 L263 165 L274 161 Z" />
              <path class="sold-star sold-star--c" d="M286 34 L289 42 L297 45 L289 48 L286 56 L283 48 L275 45 L283 42 Z" />
              <circle class="sold-dot sold-dot--a" cx="22" cy="150" r="3" />
              <circle class="sold-dot sold-dot--b" cx="300" cy="96" r="2.5" />
            </svg>
          </div>
          <h3 class="sold-title">Sudah ada pemiliknya</h3>
          <p class="sold-text">Lihat kavling lain yang masih tersedia di denah.</p>
        </div>

        <div v-else-if="lot.panorama_url" class="media-preview">
          <img
            :src="lot.panorama_thumb || lot.panorama_url || defaultThumb"
            class="panorama-preview-image"
            loading="lazy"
            decoding="async"
            alt="Panorama kaveling"
          />

          <div class="panorama-overlay-content">
            <button
              type="button"
              class="view-360-button"
              @click="open360"
            >
              <ion-icon :icon="compassOutline" aria-hidden="true"></ion-icon>
              Panorama 360°
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
        </div>

        <LegalAssurance v-if="showLotInfo" class="detail-legal" />

        <!-- SPESIFIKASI -->
        <section v-if="showLotInfo" class="detail-section">
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

            <div class="spec-card" :class="{ 'spec-card--wide': !hasPromo }">
              <small>Harga tunai</small>
              <strong>
                {{ formatCurrency(lot.cash_price) }}
              </strong>
            </div>

            <div v-if="hasPromo" class="spec-card">
              <small>Harga Promo</small>
              <strong>
                {{ formatCurrency(lot.promo_price) }}
              </strong>
            </div>
          </div>
        </section>

        <!-- PEMBAYARAN -->
        <section v-if="showLotInfo && deal" class="detail-section">
          <h3>Pembayaran</h3>

          <div class="deal-box">
            <div class="price-row">
              <span>Metode</span>
              <strong>{{ dealMethodLabel }}</strong>
            </div>
            <div class="price-row">
              <span>Harga disepakati</span>
              <strong class="deal-price">{{ formatCurrency(deal.final_price) }}</strong>
            </div>
            <div v-if="dealHasInstallment" class="price-row">
              <span>Uang muka</span>
              <strong>{{ formatCurrency(deal.down_payment) }}</strong>
            </div>
            <div v-if="dealHasInstallment" class="price-row">
              <span>Cicilan per bulan</span>
              <strong>{{ formatCurrency(deal.monthly_payment) }}</strong>
            </div>
            <div v-if="Number(deal.booking_fee) > 0" class="price-row">
              <span>Biaya tanda jadi</span>
              <strong>{{ formatCurrency(deal.booking_fee) }}</strong>
            </div>
          </div>
        </section>

        <section v-else-if="showLotInfo" class="detail-section">
          <h3>Pembayaran</h3>

          <PaymentSimulation :key="lot.id" :lot-id="lot.id" :price="effectivePrice" />
        </section>

        <!-- INFORMASI -->
        <section
          v-if="showBuyerInfo || (showLotInfo && lotDescription)"
          class="detail-section"
        >
          <h3>{{ showBuyerInfo ? 'Pembeli' : 'Informasi' }}</h3>

          <div v-if="showBuyerInfo" class="spec-grid">
            <div
              v-if="lot.customers?.full_name || lot.customer_id"
              class="spec-card"
            >
              <small>Pembeli</small>
              <strong>{{ lot.customers?.full_name || lot.customer_id }}</strong>
            </div>

            <div
              v-if="transactionDate"
              class="spec-card"
            >
              <small>{{ isSold ? 'Tanggal terjual' : 'Tanggal pesan' }}</small>
              <strong>
                {{ formatDate(transactionDate) }}
              </strong>
            </div>

            <div
              v-if="lot.payment_type"
              class="spec-card"
            >
              <small>Metode Pembayaran</small>
              <strong>
                {{ paymentTypeLabel }}
              </strong>
            </div>
          </div>

          <div
            v-if="showLotInfo && lotDescription"
            class="detail-description"
          >
            {{ lotDescription }}
          </div>
        </section>
      </div>

      <!-- FOOTER ACTION -->
      <footer v-if="props.variant !== 'admin' && !isSold && !isMarketingStaff" class="detail-footer">
        <div class="action-grid">
          <!-- SURVEI -->
          <AppButton
            class="survey-button"
            type="button"
            expand="block"
            @click="goToSurveyRequest"
          >
            Survei Lokasi
          </AppButton>

          <!-- BELI -->
          <AppButton
            class="buy-button"
            type="button"
            expand="block"
            :disabled="!clientLotAvailable"
            @click="openPurchaseModal"
          >
            {{ buyLabel }}
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

      <footer v-else-if="props.variant === 'admin'" class="detail-footer detail-footer--admin">
        <AppButton
          type="button"
          variant="primary"
          expand="block"
          @click="openAdminDetail"
        >
          Kelola Kaveling
        </AppButton>
      </footer>
    </aside>

    <ion-modal :enter-animation="modalEnterAnimation" :leave-animation="modalLeaveAnimation"
  v-if="props.variant !== 'admin'"
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
        <span class="purchase-rule" aria-hidden="true"></span>

        <ul class="purchase-reasons">
          <li>
            <span class="purchase-reason-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/></svg>
            </span>
            <span>Notaris memerlukan data diri Anda untuk administrasi pemesanan.</span>
          </li>
          <li>
            <span class="purchase-reason-icon" aria-hidden="true">
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l8 3v6c0 4.5-3.2 8-8 9-4.8-1-8-4.5-8-9V6z"/><path d="M9 12l2 2 4-4"/></svg>
            </span>
            <span>Dengan data itu, Anda bisa memantau pembayaran dan status transaksi.</span>
          </li>
        </ul>

        <p class="purchase-note">
          {{ props.clientMode
            ? 'Lanjutkan ke formulir untuk mengajukan pemesanan.'
            : 'Masuk atau daftar untuk melanjutkan.' }}
        </p>
      </div>

      <div class="purchase-actions">
        <AppButton
          expand="block"
          class="continue-purchase-button"
          @click="continuePurchase"
        >
          {{ props.clientMode ? 'Lanjut ke SPK' : 'Masuk untuk lanjut' }}
        </AppButton>

        <AppButton
          expand="block"
          class="cancel-purchase-button"
          variant="neutral"
          fill="clear"
          @click="closePurchaseModal"
        >
          Batal
        </AppButton>
      </div>
    </div>
  </ion-content>
</ion-modal>
  </div>
</template>

<script setup lang="ts">
import { modalEnterAnimation, modalLeaveAnimation } from '@/utils/modalAnimation'
import {
  computed,
  onBeforeUnmount,
  onMounted,
  ref,
} from 'vue'
import { useRouter } from 'vue-router'
import { panoramaTransition } from '@/utils/panoramaTransition'
import { setPostLoginRedirect } from '@/services/auth/postLoginRedirect'
import AppButton from '../ui/AppButton.vue'
import { useCurrentUser } from '@/composables/useCurrentUser'

import {
  useIonRouter,
  IonIcon,
  IonModal,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonContent,
} from '@ionic/vue'

import { chevronBackOutline, compassOutline, mapOutline } from 'ionicons/icons'

import missingPanoramaMascot from '@/assets/mascot/Confused_Mascot_and_Missing Panorama.webp'
import verifiedMascot from '@/assets/mascot/Verified_Mascot.webp'
import soldMascot from '@/assets/mascot/Sold_Lot_Mascot.webp'
import LegalAssurance from '@/components/payment/LegalAssurance.vue'
import PaymentSimulation from '@/components/payment/PaymentSimulation.vue'

import {
  formatCurrency,
  formatDate,
  getStatusLabel,
  normalizeLotStatus,
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
  blockName: {
    type: String,
    default: '',
  },
  clientMode: {
    type: Boolean,
    default: false,
  },
  variant: {
    type: String,
    default: 'public',
  },
})

/* ===================================================== */
/* EMITS */
/* ===================================================== */

const emit = defineEmits<{
  close: []
  home: []
  purchase: [lotId: number]
}>()

/* ===================================================== */
/* ROUTER */
/* ===================================================== */

const router = useRouter()
const ionRouter = useIonRouter()

/* ===================================================== */
/* STATE */
/* ===================================================== */

/* Harga promo dianggap diatur hanya jika terisi dan lebih murah dari harga cash. */
const hasPromo = computed(() => {
  const promo = Number(props.lot?.promo_price || 0)
  const cash = Number(props.lot?.cash_price || 0)
  return promo > 0 && (!cash || promo < cash)
})

/* Harga yang berlaku: promo bila ada, selain itu harga tunai. */
const effectivePrice = computed(() => {
  return Number(
    (hasPromo.value ? props.lot?.promo_price : props.lot?.cash_price) ||
    0
  )
})

const { profile } = useCurrentUser()

const isAdminView = computed(() => props.variant === 'admin')

/* Survei dan pembelian adalah alur pengunjung/Client. Bagi staf Marketing tombolnya
   berakhir di /login lalu dipantulkan ke beranda, jadi tidak ditampilkan. */
const isMarketingStaff = computed(() =>
  profile.value?.role === 'marketing' || profile.value?.role === 'marketing_head',
)

const isSold = computed(() =>
  normalizeLotStatus(props.lot?.status) === 'sold',
)

/* Client hanya dianggap pemilik bila akunnya terhubung ke customer pada kavling ini. */
const isOwnLot = computed(() => {
  const ownerUserId = props.lot?.customers?.user_id
  return Boolean(
    ownerUserId &&
    profile.value?.id &&
    profile.value.role === 'client' &&
    ownerUserId === profile.value.id,
  )
})

/* Kavling terjual disembunyikan dari denah publik; admin dan pemilik tetap melihat. */
const showLotInfo = computed(() =>
  !isSold.value || isAdminView.value || isOwnLot.value || hasPrivateData.value,
)

/*
 * Status pada kolom lots adalah sumber kebenaran. Deskripsi bebas yang menyebut status
 * lain (misalnya "Sudah terjual" pada kavling berstatus Dipesan) disembunyikan agar
 * informasi di panel tidak saling bertentangan.
 */
const STATUS_WORDS: Record<string, RegExp> = {
  available: /(tersedia|available|ready)/i,
  booking: /(dipesan|dibooking|booking|booked|reserved)/i,
  sold: /(terjual|sold)/i,
}

const lotDescription = computed(() => {
  const text = String(props.lot?.description || '').trim()
  if (!text) return ''
  const current = normalizeLotStatus(props.lot?.status)
  const conflicts = Object.entries(STATUS_WORDS).some(
    ([status, pattern]) => status !== current && pattern.test(text),
  )
  return conflicts ? '' : text
})

const transactionDate = computed(() =>
  (isSold.value ? props.lot?.sold_date : props.lot?.booking_date) ||
  props.lot?.sold_date ||
  props.lot?.booking_date ||
  '',
)

/*
 * Server hanya mengirim data pembeli dan kesepakatan kepada admin, pemilik kavling,
 * dan marketing yang terhubung dengan pembelinya. Adanya data ini menandai pihak berhak.
 */
const hasPrivateData = computed(() =>
  Boolean(props.lot?.deal || props.lot?.customer_id || props.lot?.customers),
)

/* Kesepakatan pembayaran dari SPK/transaksi menggantikan simulasi Cash/Cicilan. */
const deal = computed(() => (isSold.value || isBooked.value ? props.lot?.deal ?? null : null))

const isBooked = computed(() => normalizeLotStatus(props.lot?.status) === 'booking')

const dealHasInstallment = computed(() =>
  String(deal.value?.payment_type || '').toLowerCase() !== 'cash' &&
  Number(deal.value?.months) > 0,
)

const dealMethodLabel = computed(() => {
  if (!deal.value) return ''
  return dealHasInstallment.value
    ? `Cicilan ${deal.value.months} bulan`
    : 'Tunai'
})

/*
 * Data pembeli dan metode pembayaran hanya untuk pihak berhak, dan hanya pada kavling
 * yang dipesan atau terjual: lots.payment_type berisi 'Cash' bawaan walau belum ada pembeli.
 */
const showBuyerInfo = computed(() =>
  (isSold.value || isBooked.value) &&
  (isAdminView.value || hasPrivateData.value) &&
  Boolean(
    props.lot?.customers?.full_name ||
    props.lot?.customer_id ||
    props.lot?.payment_type,
  ),
)

const paymentTypeLabel = computed(() => {
  const value = String(props.lot?.payment_type || '').trim().toLowerCase()
  if (value === 'cash') return 'Cash'
  if (['installment', 'cicilan', 'kredit'].includes(value)) return 'Cicilan'
  return props.lot?.payment_type || '-'
})

const clientLotAvailable = computed(() =>
  normalizeLotStatus(props.lot?.status) === 'available',
)

/* Hanya kavling berstatus tersedia yang bisa dibeli; yang sudah dipesan tertutup untuk semua. */
const buyLabel = computed(() => {
  if (!clientLotAvailable.value) {
    return normalizeLotStatus(props.lot?.status) === 'booking' ? 'Sudah Dipesan' : 'Tidak Tersedia'
  }
  return props.clientMode ? 'Beli Kavling' : 'Beli'
})

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
/* WATCH LOT */
/* ===================================================== */

function setDetailMode(active: boolean) {
  window.dispatchEvent(
    new CustomEvent('poliland-detail-mode', {
      detail: { active },
    })
  )
}

onMounted(() => {
  setDetailMode(true)

  // Kode layar 360° diunduh lebih awal agar transisinya tidak tertahan.
  if (props.lot?.panorama_url) {
    void import('@/views/PanoramaPage.vue')
  }
})

onBeforeUnmount(() => setDetailMode(false))

/* ===================================================== */
/* CLOSE DETAIL */
/* ===================================================== */

/* Tab bar muncul lagi saat panel selesai keluar (onBeforeUnmount). */
function close() {
  emit('close')
}

function goHome() {
  emit('home')
}

function openAdminDetail() {
  const lotId = props.lot?.id
  if (lotId !== null && lotId !== undefined) {
    router.push({
      name: 'AdminKavlingDetail',
      params: { id: String(lotId) },
    })
  }
}

/* ===================================================== */
/* OPEN PANORAMA 360 */
/* ===================================================== */

function open360() {
  // ID didahulukan: nomor kavling berupa angka ("002") bisa terbaca sebagai ID lain.
  const identifier =
    props.lot?.id ||
    props.lot?.polygon_id

  ionRouter.push(
    `/panorama/${identifier}`,
    panoramaTransition
  )
}

/* ===================================================== */
/* SURVEY */
/* ===================================================== */

function goToSurveyRequest() {
  const lotId = Number(props.lot?.id)
  if (!Number.isSafeInteger(lotId) || lotId <= 0) return

  const target = `/client/kavling/${lotId}?survei=1`

  if (props.clientMode) {
    router.push(target)
    return
  }

  // Belum login: simpan tujuan, lalu login. Akun baru melengkapi data diri
  // dulu, kemudian otomatis sampai ke halaman request survei.
  setPostLoginRedirect(target)
  router.push('/login')
}

/* ===================================================== */
/* BUY */
/* ===================================================== */

const showPurchaseModal = ref(false)

function openPurchaseModal() {
  if (!clientLotAvailable.value) return
  showPurchaseModal.value = true
}

function closePurchaseModal() {
  showPurchaseModal.value = false
}

function goToLogin() {
  showPurchaseModal.value = false
  router.push('/login')
}

function continuePurchase() {
  if (!clientLotAvailable.value) return

  if (!props.clientMode) {
    goToLogin()
    return
  }

  const lotId = Number(props.lot?.id)
  if (!Number.isSafeInteger(lotId) || lotId <= 0) return

  showPurchaseModal.value = false
  emit('purchase', lotId)
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
    `mengenai kaveling ${lotName}${blockText}. ` +
    `Mohon informasinya mengenai kaveling tersebut. ` +
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
}

/* ===================================================== */
/* DETAIL PANEL */
/* ===================================================== */

.detail-panel {
  position: relative;

  width: 100%;
  max-width: 500px;

  height: min(88dvh, 720px);

  background: var(--pl-paper, #f9f5ec);

  border-radius: 24px 24px 0 0;

  box-shadow: var(--shadow-lg);

  overflow: hidden;

  display: flex;
  flex-direction: column;

}

/* ===================================================== */
/* HEADER */
/* ===================================================== */

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

  color: var(--text-secondary, #5f5f66);
}

/* Kavling terjual: kartu putih seperti kartu maskot lain, maskot melayang */
.sold-scene {
  position: relative;
  overflow: hidden;
  padding: 20px 16px 22px;
  border-radius: 20px;
  background: #ffffff;
  text-align: center;
  box-shadow: 0 14px 28px -16px rgba(53, 90, 44, 0.45);
  animation: sold-enter 560ms var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) both;
}

.sold-stage {
  position: relative;
  width: 100%;
  max-width: 280px;
  margin: 0 auto;
}

.sold-mascot {
  display: block;
  width: 100%;
  height: auto;
  animation: sold-float 4.2s ease-in-out 600ms infinite;
  will-change: transform;
}

.sold-sparkles {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.sold-star,
.sold-dot {
  fill: var(--poliland-gold, #cba044);
  transform-box: fill-box;
  transform-origin: center;
  animation: sold-twinkle 2.6s ease-in-out infinite;
}

.sold-star--b { animation-delay: 0.7s; }
.sold-star--c { animation-delay: 1.4s; }
.sold-dot--a { animation-delay: 0.4s; }
.sold-dot--b { animation-delay: 1.1s; }

.deal-box {
  display: flex;
  flex-direction: column;
}

.deal-box .price-row + .price-row {
  border-top: 1px solid rgba(53, 90, 44, 0.14);
}

.deal-box .price-row strong {
  min-width: 0;
  text-align: right;
  overflow-wrap: anywhere;
}

.deal-box .deal-price {
  font-size: 22px;
  color: var(--poliland-green, #355a2c);
}

.sold-title {
  margin: 4px 0 0;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: 22px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--text-primary, #252525);
  animation: sold-rise 520ms var(--ease-out, ease-out) 180ms both;
}

.sold-text {
  margin: 8px auto 0;
  max-width: 28ch;
  font-size: 14px;
  line-height: 1.5;
  color: #4a4a50;
  animation: sold-rise 520ms var(--ease-out, ease-out) 280ms both;
}

@keyframes sold-enter {
  from { opacity: 0; transform: translateY(12px) scale(0.97); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}

@keyframes sold-rise {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes sold-float {
  0%, 100% { transform: translateY(0) rotate(-0.6deg); }
  50% { transform: translateY(-6px) rotate(0.6deg); }
}

@keyframes sold-twinkle {
  0%, 100% { opacity: 0.25; transform: scale(0.7); }
  50% { opacity: 1; transform: scale(1.15); }
}

@media (prefers-reduced-motion: reduce) {
  .sold-scene,
  .sold-title,
  .sold-text { animation: none; }

  .sold-mascot { animation: none; }

  .sold-star,
  .sold-dot {
    animation: none;
    opacity: 0.8;
  }
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
  font-size: 13px;

  text-transform: uppercase;

  letter-spacing: 0.08em;

  color: var(--text-secondary, #5f5f66);
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

.detail-legal {
  margin: 12px 16px 0;
}

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
  color: var(--text-secondary, #5f5f66);

  font-size: 13px;

  text-transform: uppercase;

  letter-spacing: 0.08em;
}

.spec-card strong {
  color: #1a1a1a;

  font-size: 13px;

  font-weight: 700;
}

.price-row {
  display: flex;

  justify-content: space-between;

  align-items: center;

  gap: 10px;

  padding: 6px 0;

  color: #1a1a1a;
}

.price-row span {
  color: var(--text-secondary, #5f5f66);

  font-size: 13px;
}

.price-row strong {
  font-size: 14px;

  font-weight: 700;

  color: #1a1a1a;
}

/* ===================================================== */
/* DESCRIPTION */
/* ===================================================== */

.detail-description {
  margin-top: 12px;

  color: var(--text-secondary, #5f5f66);

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
  font-size: 13px;

  color: var(--text-secondary, #5f5f66);

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
  padding: 28px 22px calc(20px + env(safe-area-inset-bottom, 0px));
  background: var(--pl-paper, #F9F5EC);
  animation: purchase-rise 420ms var(--ease-out, cubic-bezier(0.22, 1, 0.36, 1)) both;
}

@keyframes purchase-rise {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (prefers-reduced-motion: reduce) {
  .purchase-modal-content { animation: none; }
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
  margin: 0;

  color: var(--ink, #1b1f1a);
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);

  font-size: 24px;
  line-height: 1.2;

  font-weight: 700;
}

.purchase-rule {
  display: block;
  width: 36px;
  height: 3px;
  margin: 10px auto 18px;
  border-radius: 2px;
  background: var(--poliland-gold, #cba044);
}

.purchase-reasons {
  list-style: none;
  margin: 0;
  padding: 0;

  display: flex;
  flex-direction: column;
  gap: 8px;

  text-align: left;
}

.purchase-reasons li {
  display: flex;
  align-items: center;
  gap: 12px;

  padding: 12px 14px;
  border-radius: 16px;
  background: #ffffff;
  box-shadow: 0 1px 2px rgba(27, 31, 26, 0.06), 0 0 0 1px rgba(27, 31, 26, 0.05);

  color: var(--text-secondary, #5f5f66);
  font-size: 14px;
  line-height: 1.45;
}

.purchase-reason-icon {
  flex: none;
  display: grid;
  place-items: center;
  width: 36px;
  height: 36px;
  border-radius: 12px;
  background: var(--pl-paper-deep, #f1e8d4);
  color: var(--poliland-gold-text, #805708);
}

.purchase-text .purchase-note {
  margin: 18px 0 0;

  color: var(--ink, #1b1f1a);
  font-size: 15px;
  line-height: 1.4;
  font-weight: 700;
}

.purchase-actions {
  display: flex;
  flex-direction: column;

  gap: 4px;

  margin-top: 20px;
}

.cancel-purchase-button,
.continue-purchase-button {
  margin: 0;

  --border-radius: 14px;

  min-height: 48px;
  font-size: 14px;
  font-weight: 700;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
}

.continue-purchase-button {
  --padding-top: 14px;
  --padding-bottom: 14px;
}

.cancel-purchase-button {
  --color: var(--text-secondary, #5f5f66);
  --background: transparent;
  --background-activated: rgba(27, 31, 26, 0.06);
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

/* ===================================================== */
/* Tampilan mengikuti WelcomePage: krem hangat, hijau hutan, emas */
/* ===================================================== */

/* Latar bening: peta yang sudah di-zoom tetap terlihat di atas panel. */
.detail-backdrop {
  background: linear-gradient(180deg, transparent 55%, rgba(31, 53, 25, 0.18));
}

.detail-panel {
  background: var(--surface-muted, #f5f3ee);
  color: var(--text-primary, #252525);
  font-family: var(--font-primary, 'Plus Jakarta Sans', sans-serif);
}

.detail-header {
  flex: none;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 8px;
  padding: 10px 12px;
  border-bottom: 1px solid rgba(53, 90, 44, 0.14);
}

.detail-header h2 {
  grid-column: 2;
  margin: 0;
  text-align: center;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: 24px;
  line-height: 1.1;
  font-weight: 650;
  letter-spacing: -0.02em;
  color: var(--text-primary, #252525);
}

.detail-header h2 small {
  display: block;
  font: 800 11px/1.4 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #805708;
}

.nav-button {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  min-height: 44px;
  padding: 0 12px;
  border: 0;
  border-radius: 12px;
  background: #ffffff;
  color: var(--poliland-green, #355a2c);
  font: 700 13px/1.2 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  box-shadow: 0 0 0 1px rgba(53, 90, 44, 0.2);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
  transition: transform var(--dur-base) var(--ease-spring);
}

.nav-button ion-icon {
  flex: none;
  font-size: 17px;
}

.nav-button span {
  overflow: hidden;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.nav-button--back {
  grid-column: 1;
  grid-row: 1;
  justify-self: start;
  padding-left: 8px;
}

.nav-button--home {
  grid-column: 3;
  grid-row: 1;
  justify-self: end;
}

.nav-button:active {
  transform: scale(0.97);
}

.nav-button:focus-visible {
  outline: 3px solid var(--poliland-gold, #cba044);
  outline-offset: 2px;
}

.detail-body {
  padding: 20px;
  background: transparent;
}

.media-preview,
.no-panorama {
  border-radius: 20px;
  border: 0;
  background: #ffffff;
}

.media-preview {
  height: 240px;
  box-shadow: 0 14px 28px -16px rgba(53, 90, 44, 0.45);
}

.no-panorama {
  min-height: 200px;
  color: #63636a;
}

.view-360-button {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  min-height: 44px;
  padding: 0 18px;
  background: #ffffff;
  color: var(--poliland-green, #355a2c);
  font: 700 14px/1 var(--font-primary, 'Plus Jakarta Sans', sans-serif);
  box-shadow: 0 8px 20px -8px rgba(53, 90, 44, 0.5);
  touch-action: manipulation;
}

.view-360-button:active {
  transform: scale(0.97);
}

.status-box {
  background: #ffffff;
  border: 1px solid rgba(53, 90, 44, 0.12);
  border-radius: 16px;
}

.status-box span,
.spec-card small,
.survey-lot-info span {
  color: #63636a;
}

.status-box strong.available { color: #2e7d32; }
.status-box strong.booking { color: #8a5a00; }
.status-box strong.sold { color: #b3261e; }

.detail-section {
  padding: 18px;
  margin-top: 14px;
  border: 1px solid rgba(53, 90, 44, 0.12);
  border-radius: 20px;
  background: #ffffff;
  box-shadow: 0 10px 24px -18px rgba(53, 90, 44, 0.45);
}

.detail-section h3 {
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: 19px;
  font-weight: 650;
  letter-spacing: -0.01em;
  color: var(--text-primary, #252525);
}

.spec-card {
  min-height: 72px;
  justify-content: center;
  background: #faf8f4;
  border: 1px solid #e5e1d6;
  border-radius: 14px;
}

.spec-card strong {
  font-size: 15px;
  color: var(--text-primary, #252525);
}

.spec-card--wide {
  grid-column: 1 / -1;
}

.view-360-button:focus-visible {
  outline: 3px solid var(--poliland-gold, #cba044);
  outline-offset: 2px;
}

.price-row span {
  color: #4a4a50;
}

.detail-description {
  color: #4a4a50;
}

/* Footer dan tombol aksi */
.detail-footer {
  flex: none;
  padding: 14px 20px calc(14px + env(safe-area-inset-bottom, 0px));
  background: rgba(245, 243, 238, 0.97);
  border-top: 1px solid rgba(53, 90, 44, 0.14);
}

.action-grid {
  gap: 10px;
  margin-bottom: 4px;
}

.detail-footer .survey-button.app-button.app-button,
.detail-footer .buy-button.app-button.app-button {
  --border-radius: 16px;
  --min-height: 52px;
  min-height: 52px;
  font-size: 15px;
  font-weight: 700;
  text-transform: none;
  letter-spacing: 0;
}

/* Survei: tombol ghost seperti "Lihat kavling" */
.detail-footer .survey-button.app-button.app-button {
  --background: rgba(255, 255, 255, 0.7);
  --background-hover: #ffffff;
  --background-activated: #ebe7dc;
  --color: var(--poliland-green, #355a2c);
  --box-shadow: none;
  --border-width: 1.5px;
  --border-style: solid;
  --border-color: rgba(53, 90, 44, 0.45);
}

/* Beli: tombol utama seperti "Masuk" */
.detail-footer .buy-button.app-button.app-button {
  --background: var(--poliland-green, #355a2c);
  --background-hover: #2b4a24;
  --background-activated: #243d1e;
  --color: #ffffff;
  --box-shadow: 0 10px 24px -10px rgba(53, 90, 44, 0.7);
}

.detail-footer .buy-button.app-button.app-button[disabled] {
  --background: #d9d3c4;
  --color: #4a4a50;
  --box-shadow: none;
  opacity: 1;
}

/* Tanya: tombol teks emas seperti "Daftar" */
.detail-footer .ask-button.app-button.app-button {
  --background: transparent;
  --background-hover: rgba(203, 160, 68, 0.14);
  --background-activated: rgba(203, 160, 68, 0.22);
  --color: #805708;
  --box-shadow: none;
  --border-radius: 12px;
  --min-height: 48px;
  width: 100%;
  min-height: 48px;
  margin: 0;
  border: 0;
  background: transparent;
  font-size: 14px;
  font-weight: 800;
  text-transform: none;
  letter-spacing: 0;
}

.detail-footer .ask-button.app-button.app-button:active {
  background: transparent;
}

.confirm-survey-button.confirm-survey-button {
  --background: var(--poliland-green, #355a2c);
  --background-hover: #2b4a24;
  --border-radius: 16px;
  --box-shadow: 0 10px 24px -10px rgba(53, 90, 44, 0.7);
  min-height: 52px;
}

.survey-lot-info {
  background: #faf8f4;
  border-color: #e5e1d6;
}

@media (max-width: 899px) {
  .detail-panel {
    max-width: 560px;
  }

  .detail-body {
    padding: 16px;
  }

  .media-preview {
    height: clamp(190px, 58vw, 280px);
  }

  .status-box {
    margin-top: 12px;
  }

  .detail-section {
    margin-top: 12px;
  }

  .detail-footer {
    position: relative;
    z-index: 2;
  }
}

@media (max-width: 380px) {
  .detail-body {
    padding: 12px;
  }

  .detail-section {
    padding: 14px;
  }

  .spec-grid {
    gap: 8px;
  }
}

/* ===================================================== */
/* UKURAN, PANEL SAMPING, DAN TRANSISI */
/* ===================================================== */

/* Tinggi sheet dicerminkan di focusInsets() pada SiteplanMap.vue. */
.detail-panel {
  height: min(66dvh, 640px);
}

/*
 * Panel menyusul setelah kamera berjalan. Vue hanya mengukur durasi elemen akar,
 * jadi durasi + jeda backdrop tidak boleh lebih pendek daripada panel.
 */
.detail-backdrop.sheet-enter-active {
  transition: opacity 460ms var(--ease-out) 320ms;
}

.sheet-enter-active .detail-panel {
  transition: transform 460ms var(--ease-drawer) 320ms;
}

.detail-backdrop.sheet-leave-active {
  transition: opacity 280ms var(--ease-modal-out);
}

.sheet-leave-active .detail-panel {
  transition: transform 280ms var(--ease-modal-out);
}

.detail-backdrop.sheet-leave-active {
  pointer-events: none;
}

.detail-backdrop.sheet-enter-from,
.detail-backdrop.sheet-leave-to {
  opacity: 0;
}

.sheet-enter-from .detail-panel,
.sheet-leave-to .detail-panel {
  transform: translateY(100%);
}

/* Layar lebar dan HP mendatar: panel di kanan, peta di kiri. */
@media (min-width: 900px), (orientation: landscape) and (max-height: 520px) {
  .detail-backdrop {
    align-items: stretch;
    justify-content: flex-end;
    background: transparent;
  }

  .detail-panel {
    width: min(420px, 52vw);
    max-width: none;
    height: 100%;
    padding-top: env(safe-area-inset-top, 0px);
    padding-right: env(safe-area-inset-right, 0px);
    border-radius: 24px 0 0 24px;
    box-shadow: -18px 0 48px -18px rgba(31, 53, 25, 0.4);
  }

  .sheet-enter-from .detail-panel,
  .sheet-leave-to .detail-panel {
    transform: translateX(100%);
  }
}

/* HP mendatar: header dan footer diringkas agar isi panel tetap terbaca. */
@media (orientation: landscape) and (max-height: 520px) {
  .detail-header {
    padding: 6px 10px;
  }

  .detail-body {
    padding: 10px;
  }

  .media-preview {
    height: 130px;
  }

  .detail-footer {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 10px calc(8px + env(safe-area-inset-bottom, 0px));
  }

  .action-grid {
    flex: 2;
    margin: 0;
    gap: 8px;
  }

  .detail-footer .survey-button.app-button.app-button,
  .detail-footer .buy-button.app-button.app-button {
    --min-height: 44px;
    min-height: 44px;
    font-size: 13px;
  }

  .detail-footer .ask-button.app-button.app-button {
    flex: 1;
    width: auto;
    --min-height: 44px;
    min-height: 44px;
    font-size: 12px;
  }

  .detail-footer--admin {
    display: block;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nav-button {
    transition: none;
  }

  .detail-backdrop.sheet-enter-active,
  .detail-backdrop.sheet-leave-active {
    transition: opacity 140ms linear;
  }

  .sheet-enter-active .detail-panel,
  .sheet-leave-active .detail-panel {
    transition: none;
  }

  .sheet-enter-from .detail-panel,
  .sheet-leave-to .detail-panel {
    transform: none;
  }
}
</style>
