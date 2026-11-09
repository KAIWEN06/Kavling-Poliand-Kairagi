<template>
  <ion-page class="detail-page">
    <!-- =====================================================
         CONTENT
    ====================================================== -->

    <ion-content class="detail-content">

      <main class="content-wrapper">

        <p
          v-if="!prospect"
          class="not-found-message"
        >
          Data calon pembeli tidak ditemukan.
        </p>

        <template v-else>

        <!-- =================================================
             PROFILE
        ================================================== -->

        <section class="profile-card">

          <div class="profile-main">

            <div class="avatar">
              {{ initials }}
            </div>

            <div class="profile-info">

              <h2>
                {{ customer.name }}
              </h2>

              <span class="phone">
                {{ customer.phone }}
              </span>

              <span class="last-contact">
                Terakhir dihubungi: {{ customer.lastContact }}
              </span>

            </div>

          </div>


          <span
            class="profile-status"
            :class="statusClass"
          >
            {{ currentStatus }}
          </span>

        </section>


        <!-- =================================================
             ACTION BUTTONS
        ================================================== -->

        <section class="action-grid">

          <button
            class="action-button"
            type="button"
            @click="openWhatsApp"
          >

            <ion-icon :icon="logoWhatsapp" />

            <span>
              Whatsapp
            </span>

          </button>


          <button
            class="action-button"
            type="button"
            @click="sendEmail"
          >

            <ion-icon :icon="mailOutline" />

            <span>
              Email
            </span>

          </button>


          <button
            class="action-button"
            type="button"
            @click="openDocument"
          >

            <ion-icon :icon="documentTextOutline" />

            <span>
              Lihat SPK
            </span>

          </button>


          <!--
            Arsipkan dan Hapus hanya tersedia
            sebelum proses SPK.
          -->

          <button
            v-if="canManageLead"
            class="action-button"
            type="button"
            @click="archiveProspect"
          >

            <ion-icon :icon="archiveOutline" />

            <span>
              Arsipkan
            </span>

          </button>


          <button
            v-if="canManageLead"
            class="action-button delete-action"
            type="button"
            @click="deleteProspect"
          >

            <ion-icon :icon="trashOutline" />

            <span>
              Hapus
            </span>

          </button>

        </section>


        <!-- =================================================
             RINGKASAN
        ================================================== -->

        <section class="section-block">

          <div class="section-heading">

            <h2>
              Ringkasan
            </h2>

            <button
              v-if="canEditData"
              type="button"
              class="gold-button"
              @click="editSummary"
            >

              <ion-icon :icon="pencil" />

              <span>
                Ubah Data
              </span>

            </button>

          </div>


          <div class="summary-card">

            <div class="data-row">

              <span class="data-label">
                Nama Lengkap
              </span>

              <span class="data-separator">
                :
              </span>

              <span class="data-value">
                {{ customer.name }}
              </span>

            </div>


            <div class="data-row">

              <span class="data-label">
                Nomor WhatsApp
              </span>

              <span class="data-separator">
                :
              </span>

              <span class="data-value">
                {{ customer.phone }}
              </span>

            </div>


            <div class="data-row">

              <span class="data-label">
                Email
              </span>

              <span class="data-separator">
                :
              </span>

              <span class="data-value">
                {{ customer.email }}
              </span>

            </div>


            <div class="data-row">

              <span class="data-label">
                Alamat
              </span>

              <span class="data-separator">
                :
              </span>

              <span class="data-value">
                {{ customer.address }}
              </span>

            </div>


            <div class="data-row">

              <span class="data-label">
                Sumber Informasi
              </span>

              <span class="data-separator">
                :
              </span>

              <span class="data-value">
                {{ customer.source }}
              </span>

            </div>


            <div class="data-row">

              <span class="data-label">
                Tanggal Daftar
              </span>

              <span class="data-separator">
                :
              </span>

              <span class="data-value">
                {{ customer.registeredAt }}
              </span>

            </div>

          </div>

        </section>


        <!-- =================================================
             MINAT KAVLING
        ================================================== -->

        <section class="section-block">

          <div class="section-heading">

            <div class="heading-with-lock">

              <h2>
                Minat Kavling
              </h2>

              <!--
                Menunjukkan bahwa kavling terkunci
                ketika sudah SPK/Dipesan/Terjual.
              -->

              <ion-icon
                v-if="!canEditLot"
                class="lock-icon"
                :icon="lockClosedOutline"
              />

            </div>


            <button
              v-if="canEditLot"
              type="button"
              class="gold-button small"
              @click="editLot"
            >

              <ion-icon :icon="pencil" />

              <span>
                Ubah
              </span>

            </button>

          </div>


          <!-- INFO LOCK -->

          <div
            v-if="!canEditLot"
            class="locked-info"
          >

            <ion-icon :icon="lockClosedOutline" />

            <span>
              Data kavling tidak dapat diubah karena proses transaksi
              sudah masuk tahap {{ currentStatus }}.
            </span>

          </div>


          <div class="lot-card">

            <div class="lot-main">

              <!-- FOTO / PANORAMA -->

              <button
                class="lot-image"
                type="button"
                @click="openPanorama"
              >

                <img
                  v-if="lot.panoramaUrl"
                  :src="lot.panoramaUrl"
                  alt="Panorama kavling"
                />

                <div
                  v-else
                  class="lot-image-placeholder"
                >

                  <ion-icon :icon="scanOutline" />

                  <span>
                    Panorama 360°
                  </span>

                </div>

              </button>


              <!-- INFORMASI KAVLING -->

              <div class="lot-info">

                <h3>
                  {{ formatLotNumber(lot.lotNumber) }}
                </h3>

                <span>
                  {{ lot.block }}
                </span>

                <span>
                  Luas {{ lot.area }}
                </span>

                <span>
                  {{ lot.dimension }}
                </span>

              </div>


              <button
                type="button"
                class="lot-detail-button"
                :disabled="!prospect.lotNumber"
                @click="openLotDetail"
              >

                <span>
                  Lihat Detail
                </span>

                <ion-icon
                  :icon="chevronForwardOutline"
                />

              </button>

            </div>


            <div class="lot-divider"></div>


            <div class="lot-data">

              <div class="data-row">

                <span class="data-label">
                  Metode Pembayaran
                </span>

                <span class="data-separator">
                  :
                </span>

                <span class="data-value">
                  {{ lot.paymentType }}
                </span>

              </div>


              <div class="data-row">

                <span class="data-label">
                  Rencana Tenor
                </span>

                <span class="data-separator">
                  :
                </span>

                <span class="data-value">
                  {{ lot.tenor }}
                </span>

              </div>


              <div class="data-row">

                <span class="data-label">
                  Harga
                </span>

                <span class="data-separator">
                  :
                </span>

                <span class="data-value">
                  {{
                    lot.price === null
                      ? 'Belum ditentukan'
                      : formatRupiah(lot.price)
                  }}
                </span>

              </div>


              <div class="data-row">

                <span class="data-label">
                  Catatan
                </span>

                <span class="data-separator">
                  :
                </span>

                <span class="data-value">
                  {{ lot.note }}
                </span>

              </div>

            </div>

          </div>

        </section>


        <!-- =================================================
             STATUS & PROSES
        ================================================== -->

        <section class="section-block process-section">

          <div class="section-heading">

            <h2>
              Status &amp; Proses
            </h2>

          </div>


          <div class="process-card">

            <!-- =================================================
                 TIMELINE
            ================================================== -->

            <div class="process-timeline">

              <template
                v-for="(step, index) in processSteps"
                :key="step.key"
              >

                <div
                  class="process-step"
                  :class="{
                    active: index === currentStepIndex,
                    completed: index < currentStepIndex
                  }"
                >

                  <div class="process-icon">

                    <ion-icon
                      :icon="step.icon"
                    />

                  </div>

                  <span>
                    {{ step.label }}
                  </span>

                </div>


                <div
                  v-if="index < processSteps.length - 1"
                  class="process-line"
                  :class="{
                    completed:
                      index < currentStepIndex
                  }"
                ></div>

              </template>

            </div>


            <!-- =================================================
                 STATUS DESCRIPTION
            ================================================== -->

            <div
              class="status-information"
              :class="statusInfoClass"
            >

              <div class="status-info-icon">

                <ion-icon
                  :icon="currentStatusIcon"
                />

              </div>


              <div class="status-info-text">

                <strong>
                  {{ statusInformation.title }}
                </strong>

                <span>
                  {{ statusInformation.description }}
                </span>

              </div>

            </div>


            <!-- =================================================
                 OPTIONS BERDASARKAN STATUS
            ================================================== -->

            <p
              v-if="spkNavigationError"
              class="spk-navigation-error"
              role="alert"
            >
              {{ spkNavigationError }}
            </p>

            <div
              class="process-actions"
              :class="{
                'follow-up-actions':
                  currentStatus === 'Tindak Lanjut'
              }"
            >


              <!-- =============================================
                   PROSPEK / TINDAK LANJUT
              ============================================== -->

              <template v-if="currentStatus === 'Prospek'">

                <button
                  type="button"
                  class="process-action primary"
                  @click="addFollowUp"
                >

                  <ion-icon
                    :icon="chatbubbleEllipsesOutline"
                  />

                  <span>
                    Catat Tindak Lanjut
                  </span>

                </button>

              </template>

              <template v-else-if="currentStatus === 'Tindak Lanjut'">

                <button
                  type="button"
                  class="process-action primary"
                  @click="addFollowUp"
                >

                  <ion-icon
                    :icon="chatbubbleEllipsesOutline"
                  />

                  <span>
                    Catat Tindak Lanjut
                  </span>

                </button>


                <button
                  type="button"
                  class="process-action primary"
                  @click="createSpk"
                >

                  <ion-icon :icon="documentOutline" />

                  <span>
                    Buat SPK
                  </span>

                </button>

              </template>


              <!-- =============================================
                   SPK
              ============================================== -->

              <template v-else-if="currentStatus === 'SPK'">

                <button
                  type="button"
                  class="process-action primary"
                  @click="addFollowUp"
                >

                  <ion-icon
                    :icon="chatbubbleEllipsesOutline"
                  />

                  <span>
                    Catat Tindak Lanjut
                  </span>

                </button>


                <button
                  type="button"
                  class="process-action danger"
                  @click="openCancelSpkModal"
                >

                  <ion-icon :icon="closeCircleOutline" />

                  <span>
                    Batalkan SPK
                  </span>

                </button>


                <div class="action-note warning">

                  <ion-icon :icon="informationCircleOutline" />

                  <span>
                    Menunggu validasi dari Admin.
                  </span>

                </div>

              </template>


              <!-- =============================================
                   DIPESAN
              ============================================== -->

              <template v-else-if="currentStatus === 'Dipesan'">

                <button
                  type="button"
                  class="process-action primary"
                  @click="addFollowUp"
                >

                  <ion-icon
                    :icon="chatbubbleEllipsesOutline"
                  />

                  <span>
                    Catat Tindak Lanjut
                  </span>

                </button>


              </template>


              <!-- =============================================
                   TERJUAL
              ============================================== -->

              <template v-else-if="currentStatus === 'Terjual'">

                <button
                  type="button"
                  class="process-action primary"
                  @click="addFollowUp"
                >

                  <ion-icon
                    :icon="chatbubbleEllipsesOutline"
                  />

                  <span>
                    Catat Tindak Lanjut
                  </span>

                </button>


                <button
                  type="button"
                  class="process-action secondary"
                  @click="openPaymentHistory"
                >

                  <ion-icon
                    :icon="cardOutline"
                  />

                  <span>
                    Riwayat Pembayaran
                  </span>

                </button>

              </template>

            </div>

          </div>


          <button
            v-if="
              currentStatus === 'Prospek'
              || currentStatus === 'Tindak Lanjut'
            "
            type="button"
            class="process-action status-change"
            @click="
              currentStatus === 'Prospek'
                ? changeStatusToFollowUp()
                : changeStatusToProspect()
            "
          >

            <ion-icon :icon="syncOutline" />

            <span>{{ currentStatus === 'Prospek'
              ? 'Ubah Status Calon Pembeli'
              : 'Kembalikan ke Status Prospek'
            }}</span>

          </button>

        </section>

        </template>

      </main>

    </ion-content>


    <AppModal
      v-model="showEditSummaryModal"
      title="Ubah Data Calon Pembeli"
      variant="bottom-sheet"
    >
      <form
        id="edit-summary-form"
        class="edit-data-content"
        @submit.prevent="saveSummary"
      >
        <label>
          Nama Lengkap
          <input v-model.trim="summaryForm.name" type="text" autocomplete="name" required />
        </label>
        <label>
          Nomor WhatsApp
          <input v-model.trim="summaryForm.phone" type="tel" autocomplete="tel" required />
        </label>
        <label>
          Email
          <input v-model.trim="summaryForm.email" type="email" autocomplete="email" />
        </label>
        <label>
          Alamat
          <textarea v-model.trim="summaryForm.address" rows="3" />
        </label>
        <label>
          Sumber Informasi
          <input v-model.trim="summaryForm.source" />
        </label>
      </form>

      <template #footer>
        <button
          type="button"
          class="modal-button cancel"
          @click="showEditSummaryModal = false"
        >
          Batal
        </button>
        <button
          type="submit"
          form="edit-summary-form"
          class="modal-button confirm-edit"
        >
          Simpan
        </button>
      </template>
    </AppModal>

    <AppModal
      v-model="showEditLotModal"
      title="Ubah Minat Kavling"
      variant="bottom-sheet"
    >
      <form
        id="edit-lot-form"
        class="edit-data-content"
        @submit.prevent="saveLotSelection"
      >
        <p class="edit-data-description">
          Pilih kavling tersedia dari database.
        </p>
        <p v-if="lotOptionsLoading" class="edit-data-message">
          Memuat data kavling...
        </p>
        <p
          v-else-if="lotOptionsError"
          class="edit-data-message error"
          role="alert"
        >
          {{ lotOptionsError }}
        </p>
        <label v-else>
          Kavling
          <select v-model="selectedLotId" required>
            <option value="" disabled>Pilih kavling</option>
            <option
              v-for="option in lotOptions"
              :key="option.id"
              :value="String(option.id)"
            >
              {{ option.lot_number }} · {{ option.area ?? '—' }} m² ·
              {{ option.status }}
            </option>
          </select>
        </label>
      </form>

      <template #footer>
        <button
          type="button"
          class="modal-button cancel"
          @click="showEditLotModal = false"
        >
          Batal
        </button>
        <button
          type="submit"
          form="edit-lot-form"
          class="modal-button confirm-edit"
          :disabled="lotOptionsLoading || Boolean(lotOptionsError) || !selectedLotId"
        >
          Simpan
        </button>
      </template>
    </AppModal>

    <!-- =====================================================
         MODAL BATALKAN SPK
    ====================================================== -->

    <AppModal
      v-model="showCancelSpkModal"
      title="Batalkan SPK?"
      variant="dialog"
      max-width="350px"
    >
      <div class="modal-wrapper">
        <div class="modal-icon danger">
          <ion-icon :icon="alertCircleOutline" />
        </div>

        <p class="modal-description">
          Apakah Anda yakin ingin membatalkan SPK
          calon pembeli ini?
        </p>

        <div class="refund-warning">
          <ion-icon :icon="warningOutline" />
          <div>
            <strong>Perhatian</strong>
            <p>
              Uang yang sudah dibayarkan
              <b>tidak dapat dikembalikan</b>.
            </p>
          </div>
        </div>
      </div>

      <template #footer>
        <button
          type="button"
          class="modal-button cancel"
          @click="closeCancelSpkModal"
        >
          Tidak
        </button>
        <button
          type="button"
          class="modal-button confirm-danger"
          @click="confirmCancelSpk"
        >
          Ya, Batalkan SPK
        </button>
      </template>
    </AppModal>

  </ion-page>
</template>


<script setup lang="ts">

import {
  computed,
  onMounted,
  reactive,
  ref,
} from 'vue'

import {
  useRoute,
} from 'vue-router'

import {
  IonPage,
  IonContent,
  IonIcon,
  useIonRouter,
} from '@ionic/vue'

import {
  logoWhatsapp,
  mailOutline,
  documentTextOutline,
  archiveOutline,
  trashOutline,
  pencil,
  chevronForwardOutline,
  locationOutline,
  chatbubbleOutline,
  documentOutline,
  calendarOutline,
  checkmarkOutline,
  alertCircleOutline,
  chatbubbleEllipsesOutline,
  lockClosedOutline,
  scanOutline,
  informationCircleOutline,
  closeCircleOutline,
  cardOutline,
  checkmarkCircleOutline,
  warningOutline,
  syncOutline,
} from 'ionicons/icons'

import {
  marketingProspects,
} from '@/services/marketingProspectService'

import type {
  Prospect,
} from '@/services/marketingProspectService'

import {
  formatLotNumber,
  getAvailableLots,
  getLotById,
  getLotByNumber,
  type Lot,
} from '@/services/marketing/spkService'
import AppModal from '@/components/ui/AppModal.vue'


const router = useIonRouter()
const route = useRoute()


/* =========================================================
   SELECTED PROSPECT
========================================================= */

const prospect = computed<Prospect | undefined>(() => {

  const routeId = Array.isArray(route.params.id)
    ? route.params.id[0]
    : route.params.id

  const id = Number(routeId)

  if (!Number.isInteger(id)) {
    return undefined
  }

  return marketingProspects.find(
    item => item.id === id,
  )

})


const showEditSummaryModal = ref(false)
const showEditLotModal = ref(false)
const spkNavigationError = ref('')
const lotOptionsLoading = ref(false)
const lotOptionsError = ref('')
const lotOptions = ref<Lot[]>([])
const selectedLotId = ref('')

const summaryForm = reactive({
  name: '',
  phone: '',
  email: '',
  address: '',
  source: '',
})


function applyLotData(selectedLot: Lot) {
  if (!prospect.value) {
    return
  }

  prospect.value.lotId = selectedLot.id
  prospect.value.lotNumber = selectedLot.lot_number
  prospect.value.area = selectedLot.area
  prospect.value.block = selectedLot.block_id
    ? `Blok ${selectedLot.block_id}`
    : '—'
  prospect.value.paymentMethod =
    selectedLot.payment_type ?? '—'
}


async function loadCurrentLot() {
  const selected = prospect.value

  if (!selected?.lotNumber) {
    return
  }

  try {
    const data = selected.lotId
      ? await getLotById(selected.lotId)
      : await getLotByNumber(selected.lotNumber)

    if (data) {
      applyLotData(data)
    }
  } catch (error) {
    console.error('[Detail Calon Pembeli] Gagal memuat kavling:', error)
  }
}


onMounted(loadCurrentLot)


/* =========================================================
   CUSTOMER
========================================================= */

const customer = computed(() => {

  const selected = prospect.value

  return {
    name: selected?.name ?? '—',
    phone: selected?.phone ?? '—',
    email: selected?.email || '—',
    address: selected?.address || '—',
    source: selected?.source || '—',
    registeredAt: selected
      ? formatRegisteredDate(selected.createdAt)
      : '—',
    lastContact: selected
      ? formatRelativeTime(selected.createdAt)
      : '—',
  }

})


/* =========================================================
   LOT
========================================================= */

const lot = computed(() => {

  const selected = prospect.value

  return {
    lotNumber: selected?.lotNumber || 'Belum dipilih',
    block: selected?.block || '—',
    area: selected?.area != null
      ? `${selected.area} m²`
      : '—',
    dimension: '—',
    paymentType: selected?.paymentMethod || '—',
    tenor: selected?.tenor || '—',
    price: null as number | null,
    note: selected?.notes || '—',
    panoramaUrl: '',
  }

})


/* =========================================================
   STATUS
=========================================================

========================================================= */

type DetailStatus =
  'Prospek'
  | 'Tindak Lanjut'
  | 'SPK'
  | 'Dipesan'
  | 'Terjual'

const currentStatus = computed<DetailStatus>(() => {

  if (prospect.value?.status === 'Booking') {
    return 'Dipesan'
  }

  return prospect.value?.status ?? 'Prospek'

})


/* =========================================================
   PROCESS STEPS
========================================================= */

const processSteps = [

  {
    key: 'prospek',
    label: 'Prospek',
    icon: locationOutline,
  },

  {
    key: 'tindak_lanjut',
    label: 'Tindak Lanjut',
    icon: chatbubbleOutline,
  },

  {
    key: 'spk',
    label: 'SPK',
    icon: documentOutline,
  },

  {
    key: 'dipesan',
    label: 'Dipesan',
    icon: calendarOutline,
  },

  {
    key: 'terjual',
    label: 'Terjual',
    icon: checkmarkOutline,
  },

]


/* =========================================================
   STATUS INDEX
========================================================= */

const currentStepIndex = computed(() => {

  const index =
    processSteps.findIndex(
      step =>
        step.label === currentStatus.value
    )

  return index >= 0 ? index : 0

})


/* =========================================================
   STATUS PERMISSIONS
========================================================= */

/*
 * Prospek dan Tindak Lanjut:
 * data masih dapat diubah.
 *
 * SPK, Dipesan, Terjual:
 * data kavling dikunci.
 */

const canEditLot = computed(() => {

  return (
    currentStatus.value === 'Prospek'
    ||
    currentStatus.value === 'Tindak Lanjut'
  )

})


const canEditData = computed(() => {

  return (
    currentStatus.value === 'Prospek'
    ||
    currentStatus.value === 'Tindak Lanjut'
  )

})


const canManageLead = computed(() => {

  return (
    currentStatus.value === 'Prospek'
    ||
    currentStatus.value === 'Tindak Lanjut'
  )

})


/* =========================================================
   INITIALS
========================================================= */

const initials = computed(() => {

  return customer.value.name
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(
      name =>
        name.charAt(0).toUpperCase()
    )
    .join('')

})


/* =========================================================
   STATUS CLASS
========================================================= */

const statusClass = computed(() => {

  return {

    prospect:
      currentStatus.value === 'Prospek',

    followup:
      currentStatus.value === 'Tindak Lanjut',

    spk:
      currentStatus.value === 'SPK',

    booked:
      currentStatus.value === 'Dipesan',

    sold:
      currentStatus.value === 'Terjual',

  }

})


/* =========================================================
   STATUS INFORMATION
========================================================= */

const statusInformation =
  computed(() => {

    switch (currentStatus.value) {

      case 'Prospek':

        return {

          title:
            'Sedang dalam tahap Prospek',

          description:
            'Lakukan komunikasi dengan calon pembeli dan catat setiap perkembangan.',

        }


      case 'Tindak Lanjut':

        return {

          title:
            'Sedang dalam tahap Tindak Lanjut',

          description:
            'Lakukan tindak lanjut secara berkala dan catat hasil komunikasi dengan calon pembeli.',

        }


      case 'SPK':

        return {

          title:
            'SPK sedang menunggu validasi Admin',

          description:
            'Marketing dapat mencatat tindak lanjut atau mengajukan pembatalan SPK.',

        }


      case 'Dipesan':

        return {

          title:
            'Kavling sudah dipesan',

          description:
            "Lakukan proses AJB atau Booking Fee dengan notaris dan lakukan pembayaran pertama paling lambat 1 minggu setelah SPK dikonfirmasi oleh Admin."

        }


      case 'Terjual':

        return {

          title:
            'Kavling sudah terjual',


          description:
            'Transaksi telah dikonfirmasi. Riwayat pembayaran dapat dilihat dari halaman ini. Data pembelian dan pembayaran dikelola berdasarkan transaksi yang telah dikonfirmasi oleh Admin.',


        }


      default:

        return {

          title: '',

          description: '',

        }

    }

  })


/* =========================================================
   STATUS ICON
========================================================= */

const currentStatusIcon =
  computed(() => {

    switch (currentStatus.value) {

      case 'Prospek':
        return locationOutline

      case 'Tindak Lanjut':
        return chatbubbleOutline

      case 'SPK':
        return documentOutline

      case 'Dipesan':
        return calendarOutline

      case 'Terjual':
        return checkmarkCircleOutline

      default:
        return informationCircleOutline

    }

  })


/* =========================================================
   STATUS INFORMATION COLOR
========================================================= */

const statusInfoClass =
  computed(() => {

    return {

      prospect:
        currentStatus.value === 'Prospek',

      followup:
        currentStatus.value === 'Tindak Lanjut',

      spk:
        currentStatus.value === 'SPK',

      booked:
        currentStatus.value === 'Dipesan',

      sold:
        currentStatus.value === 'Terjual',

    }

  })


/* =========================================================
   NAVIGATION
========================================================= */

/* =========================================================
   WHATSAPP
========================================================= */

function openWhatsApp() {

  const phone =
    customer.value.phone
      .replace(/\D/g, '')

  const normalizedPhone =
    phone.startsWith('0')
      ? `62${phone.slice(1)}`
      : phone

  window.open(
    `https://wa.me/${normalizedPhone}`,
    '_blank'
  )

}


/* =========================================================
   EMAIL
========================================================= */

function sendEmail() {

  window.location.href =
    `mailto:${customer.value.email}`

}


/* =========================================================
   DOCUMENT
========================================================= */

function openDocument() {

  console.log(
    'Membuka dokumen calon pembeli'
  )

}


/* =========================================================
   ARCHIVE
========================================================= */

function archiveProspect() {

  if (!canManageLead.value) {

    return

  }

  console.log(
    'Arsipkan calon pembeli'
  )

}


/* =========================================================
   DELETE
========================================================= */

function deleteProspect() {

  if (!canManageLead.value) {

    return

  }

  console.log(
    'Hapus calon pembeli'
  )

}


/* =========================================================
   EDIT SUMMARY
========================================================= */

function editSummary() {

  if (!canEditData.value) {
    return
  }

  if (!prospect.value) {
    return
  }

  Object.assign(summaryForm, {
    name: prospect.value.name,
    phone: prospect.value.phone,
    email: prospect.value.email ?? '',
    address: prospect.value.address ?? '',
    source: prospect.value.source ?? '',
  })

  showEditSummaryModal.value = true

}


function saveSummary() {

  if (!canEditData.value || !prospect.value) {
    return
  }

  prospect.value.name = summaryForm.name
  prospect.value.phone = summaryForm.phone
  prospect.value.email = summaryForm.email || null
  prospect.value.address = summaryForm.address || null
  prospect.value.source = summaryForm.source || null
  showEditSummaryModal.value = false

}


/* =========================================================
   EDIT LOT
========================================================= */

async function editLot() {

  if (!canEditLot.value) {
    return
  }

  showEditLotModal.value = true
  lotOptionsLoading.value = true
  lotOptionsError.value = ''

  try {
    const availableLots = await getAvailableLots()
    const currentLot = prospect.value?.lotId
      ? await getLotById(prospect.value.lotId)
      : prospect.value?.lotNumber
        ? await getLotByNumber(prospect.value.lotNumber)
        : null

    lotOptions.value = currentLot
      && !availableLots.some(item => item.id === currentLot.id)
      ? [...availableLots, currentLot]
      : availableLots

    selectedLotId.value =
      currentLot?.id.toString()
      ?? prospect.value?.lotId?.toString()
      ?? ''
  } catch (error) {
    console.error('[Detail Calon Pembeli] Gagal memuat pilihan kavling:', error)
    lotOptionsError.value =
      'Data kavling gagal dimuat. Silakan coba lagi.'
  } finally {
    lotOptionsLoading.value = false
  }

}


function saveLotSelection() {

  if (!canEditLot.value) {
    return
  }

  const selected = lotOptions.value.find(
    item => item.id.toString() === selectedLotId.value,
  )

  if (!selected) {
    lotOptionsError.value = 'Pilih kavling yang tersedia.'
    return
  }

  applyLotData(selected)
  showEditLotModal.value = false

}


/* =========================================================
   PANORAMA
========================================================= */

function openPanorama() {

  if (!prospect.value?.lotNumber) {
    return
  }

  /*
   * PanoramaPage.vue yang sudah kamu buat.
   *
   * Gunakan ID kavling untuk membuka panorama.
   */

  router.push({
    path: `/panorama/${encodeURIComponent(formatLotNumber(lot.value.lotNumber))}`,
  })

}


/* =========================================================
   LOT DETAIL
========================================================= */

function openLotDetail() {

  if (!prospect.value?.lotNumber) {
    return
  }

  router.push({
    path: '/kavling',
    query: {
      lot_number: formatLotNumber(lot.value.lotNumber),
    },
  })

}


/* =========================================================
   FOLLOW UP
========================================================= */

function addFollowUp() {
  if (!prospect.value) {
    return
  }

  router.push({
    path: '/marketing/tindak-lanjut',
    query: {
      customer_id: String(prospect.value.id),
      customer_name: prospect.value.name,
    },
  })
}


function changeStatusToFollowUp() {

  if (
    currentStatus.value !== 'Prospek'
    || !prospect.value
  ) {
    return
  }

  prospect.value.status = 'Tindak Lanjut'

}


function changeStatusToProspect() {

  if (
    currentStatus.value !== 'Tindak Lanjut'
    || !prospect.value
  ) {
    return
  }

  prospect.value.status = 'Prospek'

}


async function createSpk() {

  if (
    currentStatus.value !== 'Tindak Lanjut'
    || !prospect.value
  ) {
    return
  }

  spkNavigationError.value = ''

  try {
    const selectedLot = prospect.value.lotId
      ? await getLotById(prospect.value.lotId)
      : prospect.value.lotNumber
        ? await getLotByNumber(prospect.value.lotNumber)
        : null

    if (!selectedLot) {
      spkNavigationError.value =
        'Data kavling belum terhubung. Tekan Ubah pada bagian Minat Kavling, lalu pilih kavling dari database.'
      return
    }

    applyLotData(selectedLot)

    await router.push({
      path: '/marketing/spk',
      query: {
        lot_id: selectedLot.id.toString(),
        lot_number: selectedLot.lot_number,
        name: prospect.value.name,
        phone: prospect.value.phone,
        email: prospect.value.email ?? '',
        address: prospect.value.address ?? '',
      },
    })
  } catch (error) {
    console.error('[Detail Calon Pembeli] Gagal menyiapkan SPK:', error)
    spkNavigationError.value =
      'Data kavling gagal dimuat. Periksa koneksi lalu coba lagi.'
  }

}


/* =========================================================
   PAYMENT HISTORY
========================================================= */

function openPaymentHistory() {

  router.push({
    path:
      '/marketing/riwayat-pembayaran',
    query: {
      customer:
        customer.value.name,
      lot:
        lot.value.lotNumber,
    },
  })

}


/* =========================================================
   CANCEL SPK MODAL
========================================================= */

const showCancelSpkModal =
  ref(false)


function openCancelSpkModal() {

  /*
   * Hanya bisa dilakukan ketika
   * status masih SPK.
   */

  if (
    currentStatus.value !== 'SPK'
  ) {

    return

  }

  showCancelSpkModal.value = true

}


function closeCancelSpkModal() {

  showCancelSpkModal.value = false

}


/* =========================================================
   CONFIRM CANCEL SPK
========================================================= */

function confirmCancelSpk() {

  /*
   * Jangan langsung mengubah status
   * menjadi Prospek di sini ketika sudah
   * terhubung ke Supabase.
   *
   * Seharusnya:
   *
   * Marketing -> request pembatalan
   * Admin -> validasi
   *
   * Untuk prototype UI kita tampilkan
   * perubahan sementara.
   */

  console.log(
    'Pengajuan pembatalan SPK'
  )

  showCancelSpkModal.value = false

}


/* =========================================================
   FORMAT DATE
========================================================= */

function formatRegisteredDate(
  dateString: string,
) {

  const date = new Date(dateString)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat(
    'id-ID',
    {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    },
  ).format(date)

}


function formatRelativeTime(
  dateString: string,
) {

  const date = new Date(dateString)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  const minutes = Math.max(
    0,
    Math.floor(
      (Date.now() - date.getTime()) / 60000,
    ),
  )

  if (minutes < 1) {
    return 'Baru saja'
  }

  if (minutes < 60) {
    return `${minutes} menit lalu`
  }

  const hours = Math.floor(minutes / 60)

  if (hours < 24) {
    return `${hours} jam lalu`
  }

  const days = Math.floor(hours / 24)

  return `${days} hari lalu`

}


/* =========================================================
   FORMAT RUPIAH
========================================================= */

function formatRupiah(
  value: number
) {

  return new Intl.NumberFormat(
    'id-ID',
    {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }
  ).format(value)

}

</script>


<style scoped>

/* =========================================================
   ROOT
========================================================= */

.detail-page {

  --gold:
    #c5a55a;

  --cream:
    #f4e8d4;

  --background:
    #f9f8f7;

  --text:
    #1f1f1f;

  --muted:
    #777777;

  background:
    var(--background);

}


.not-found-message {

  padding: 32px 16px;

  color: var(--muted);

  text-align: center;

}


/* =========================================================
   CONTENT
========================================================= */

.detail-content {

  --background:
    var(--background);

}


.content-wrapper {

  position: relative;

  z-index: 5;

  width:
    min(
      calc(100% - 24px),
      350px
    );

  margin:
    8px auto 0;

  padding-bottom:
    120px;

  box-sizing: border-box;

}


/* =========================================================
   PROFILE
========================================================= */

.profile-card {

  width: 100%;

  min-height: 67px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 8px;

  padding: 8px 10px;

  box-sizing: border-box;

  background:
    #ffffff;

  border-radius: 7px;

  box-shadow:
    0 2px 6px
    rgba(0, 0, 0, .10);

}


.profile-main {

  min-width: 0;

  display: flex;

  align-items: center;

  gap: 12px;

}


.avatar {

  flex:
    0 0
    clamp(42px, 13vw, 48px);

  width:
    clamp(42px, 13vw, 48px);

  height:
    clamp(42px, 13vw, 48px);

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 50%;

  background:
    #f4ead6;

  color:
    #111111;

  font-size:
    clamp(13px, 4vw, 15px);

  font-weight: 800;

}


.profile-info {

  min-width: 0;

  display: flex;

  flex-direction: column;

}


.profile-info h2 {

  margin: 0;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  color:
    #111111;

  font-size:
    clamp(11px, 3.5vw, 13px);

  line-height: 1.25;

  font-weight: 800;

}


.phone {

  margin-top: 2px;

  color:
    #777777;

  font-size:
    clamp(8px, 2.7vw, 10px);

}


.last-contact {

  margin-top: 2px;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  color:
    #8c8c8c;

  font-size:
    clamp(7px, 2.3vw, 8px);

}


.profile-status {

  flex:
    0 0
    clamp(63px, 22vw, 85px);

  min-width:
    clamp(63px, 22vw, 85px);

  min-height: 23px;

  display: flex;

  align-items: center;

  justify-content: center;

  padding: 4px 6px;

  box-sizing: border-box;

  border-radius: 5px;

  font-size:
    clamp(7px, 2.4vw, 9px);

  font-weight: 600;

  white-space: nowrap;

  box-shadow:
    0 2px 3px
    rgba(0, 0, 0, .12);

}


/* STATUS COLORS */

.profile-status.prospect {

  background:
    #fdd8d2;

  color:
    #3b3b3b;

}


.profile-status.followup {

  background:
    #fff0c9;

  color:
    #66521e;

}


.profile-status.spk {

  background:
    #e7defa;

  color:
    #59417f;

}


.profile-status.booked {

  background:
    #dcecff;

  color:
    #355b82;

}


.profile-status.sold {

  background:
    #dcefdc;

  color:
    #35613b;

}


/* =========================================================
   ACTION GRID
========================================================= */

.action-grid {

  width: 100%;

  display: grid;

  grid-template-columns:
    repeat(5, minmax(0, 1fr));

  gap:
    clamp(5px, 2vw, 7px);

  margin-top: 8px;

}


.action-button {

  min-width: 0;

  height:
    clamp(44px, 13vw, 48px);

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  gap: 4px;

  padding: 3px;

  border:
    1px solid #e8e8e8;

  border-radius: 7px;

  background:
    #ffffff;

  color:
    #3d3d3d;

  box-shadow:
    0 2px 5px
    rgba(0, 0, 0, .08);

}


.action-button ion-icon {

  flex-shrink: 0;

  font-size:
    clamp(16px, 5vw, 19px);

}


.action-button span {

  width: 100%;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  text-align: center;

  font-size:
    clamp(6px, 2vw, 8px);

  line-height: 1;

}


.delete-action {

  color:
    #5c5c5c;

}


/* =========================================================
   SECTION
========================================================= */

.section-block {

  width: 100%;

  margin-top: 13px;

}


.section-heading {

  width: 100%;

  min-height: 24px;

  display: flex;

  align-items: center;

  justify-content: space-between;

  gap: 8px;

  margin-bottom: 5px;

}


.section-heading h2 {

  margin: 0;

  color:
    #151515;

  font-size:
    clamp(13px, 4vw, 15px);

  font-weight: 800;

}


.heading-with-lock {

  min-width: 0;

  display: flex;

  align-items: center;

  gap: 5px;

}


.lock-icon {

  flex-shrink: 0;

  color:
    #8d8d8d;

  font-size:
    14px;

}


/* =========================================================
   GOLD BUTTON
========================================================= */

.gold-button {

  flex:
    0 0 auto;

  min-height: 27px;

  display: inline-flex;

  align-items: center;

  justify-content: center;

  gap: 5px;

  padding: 0 11px;

  border: 0;

  border-radius: 7px;

  background:
    var(--gold);

  color:
    #ffffff;

  font-family: inherit;

  font-size:
    clamp(7px, 2.3vw, 9px);

  font-weight: 600;

  box-shadow:
    0 2px 4px
    rgba(0, 0, 0, .15);

}


.gold-button ion-icon {

  font-size:
    clamp(11px, 3.5vw, 13px);

}


/* =========================================================
   SUMMARY
========================================================= */

.summary-card {

  width: 100%;

  padding: 8px 12px;

  box-sizing: border-box;

  border-radius: 7px;

  background:
    #ffffff;

  box-shadow:
    0 2px 5px
    rgba(0, 0, 0, .10);

}


.data-row {

  display: grid;

  grid-template-columns:
    minmax(105px, 1.1fr)
    10px
    minmax(0, 2fr);

  column-gap: 4px;

  align-items: start;

  margin-bottom: 4px;

}


.data-row:last-child {

  margin-bottom: 0;

}


.data-label,
.data-separator,
.data-value {

  font-size:
    clamp(7px, 2.5vw, 9px);

  line-height: 1.35;

}


.data-label {

  color:
    #777777;

}


.data-separator {

  color:
    #777777;

  text-align: center;

}


.data-value {

  min-width: 0;

  color:
    #737373;

  overflow-wrap: anywhere;

}


/* =========================================================
   LOCK INFO
========================================================= */

.locked-info {

  width: 100%;

  display: flex;

  align-items: flex-start;

  gap: 6px;

  margin-bottom: 6px;

  padding: 7px 9px;

  box-sizing: border-box;

  border-radius: 6px;

  background:
    #f0eee9;

  color:
    #777777;

  font-size:
    clamp(7px, 2.3vw, 8px);

  line-height: 1.35;

}


.locked-info ion-icon {

  flex-shrink: 0;

  margin-top: 1px;

  font-size: 13px;

}


/* =========================================================
   LOT
========================================================= */

.lot-card {

  width: 100%;

  padding: 8px 9px;

  box-sizing: border-box;

  border-radius: 7px;

  background:
    #ffffff;

  box-shadow:
    0 2px 5px
    rgba(0, 0, 0, .10);

}


.lot-main {

  min-width: 0;

  display: grid;

  grid-template-columns:
    clamp(74px, 24vw, 82px)
    minmax(0, 1fr)
    auto;

  align-items: center;

  gap:
    clamp(8px, 2.5vw, 10px);

}


.lot-image {

  width: 100%;

  aspect-ratio:
    1.25 / 1;

  display: flex;

  align-items: center;

  justify-content: center;

  overflow: hidden;

  padding: 0;

  border: 0;

  border-radius: 6px;

  background:
    #a7a7a7;

}


.lot-image img {

  width: 100%;

  height: 100%;

  object-fit: cover;

}


.lot-image-placeholder {

  display: flex;

  flex-direction: column;

  align-items: center;

  justify-content: center;

  gap: 3px;

  color:
    #ffffff;

}


.lot-image-placeholder ion-icon {

  font-size: 20px;

}


.lot-image-placeholder span {

  font-size:
    clamp(6px, 2vw, 8px);

}


.lot-info {

  min-width: 0;

  display: flex;

  flex-direction: column;

  gap: 2px;

}


.lot-info h3 {

  margin: 0;

  color:
    #111111;

  font-size:
    clamp(11px, 3.5vw, 13px);

  font-weight: 800;

}


.lot-info span {

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  color:
    #777777;

  font-size:
    clamp(7px, 2.5vw, 9px);

}


.lot-detail-button {

  min-width:
    clamp(72px, 22vw, 84px);

  height:
    clamp(27px, 8vw, 31px);

  display: flex;

  align-items: center;

  justify-content: center;

  gap: 2px;

  padding: 0 4px;

  border:
    1px solid #eee4d1;

  border-radius: 6px;

  background:
    #ffffff;

  color:
    #c5a55a;

  box-shadow:
    0 2px 3px
    rgba(0, 0, 0, .10);

}


.lot-detail-button span {

  font-size:
    clamp(7px, 2.2vw, 8px);

  white-space: nowrap;

}


.lot-detail-button ion-icon {

  font-size: 13px;

}


.lot-divider {

  width: 100%;

  height: 1px;

  margin: 6px 0;

  background:
    #d3d3d3;

}


/* =========================================================
   PROCESS
========================================================= */

.process-card {

  width: 100%;

  padding:
    10px;

  box-sizing: border-box;

  border-radius: 7px;

  background:
    #ffffff;

  box-shadow:
    0 2px 5px
    rgba(0, 0, 0, .08);

}


.process-timeline {

  width: 100%;

  display: grid;

  grid-template-columns:
    auto
    minmax(5px, 1fr)
    auto
    minmax(5px, 1fr)
    auto
    minmax(5px, 1fr)
    auto
    minmax(5px, 1fr)
    auto;

  align-items: center;

}


.process-step {

  min-width: 0;

  display: flex;

  flex-direction: column;

  align-items: center;

  gap: 4px;

}


.process-icon {

  width:
    clamp(30px, 9vw, 36px);

  height:
    clamp(30px, 9vw, 36px);

  display: flex;

  align-items: center;

  justify-content: center;

  border:
    1px solid #cccccc;

  border-radius: 50%;

  background:
    #f7f7f7;

  color:
    #c8c8c8;

}


.process-icon ion-icon {

  font-size:
    clamp(14px, 4.5vw, 17px);

}


.process-step span {

  max-width: 60px;

  overflow: hidden;

  text-overflow: ellipsis;

  white-space: nowrap;

  color:
    #777777;

  font-size:
    clamp(6px, 2vw, 8px);

  text-align: center;

}


/* COMPLETED */

.process-step.completed
.process-icon {

  border-color:
    var(--gold);

  background:
    var(--gold);

  color:
    #ffffff;

}


.process-line.completed {

  background:
    var(--gold);

}


/* ACTIVE */

.process-step.active
.process-icon {

  border-color:
    var(--gold);

  background:
    var(--gold);

  color:
    #ffffff;

}


.process-step.active span {

  color:
    var(--gold);

  font-weight: 700;

}


.process-line {

  height: 2px;

  margin:
    0 3px;

  background:
    #d1d1d1;

}


/* =========================================================
   STATUS INFORMATION
========================================================= */

.status-information {

  width: 100%;

  display: flex;

  align-items: center;

  gap: 8px;

  margin-top: 11px;

  padding:
    9px;

  box-sizing: border-box;

  border-radius: 7px;

  background:
    #fde6e3;

  box-shadow:
    0 3px 4px
    rgba(110, 40, 35, .20);

}


.status-info-icon {

  flex:
    0 0 28px;

  width: 28px;

  height: 28px;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 50%;

  background:
    rgba(255,255,255,.65);

}


.status-info-icon ion-icon {

  color:
    #d71920;

  font-size: 16px;

}


.status-info-text {

  min-width: 0;

  display: flex;

  flex-direction: column;

  gap: 2px;

}


.status-info-text strong {

  color:
    #d71920;

  font-size:
    clamp(8px, 2.6vw, 10px);

  line-height: 1.2;

}


.status-info-text span {

  color:
    #777777;

  font-size:
    clamp(6.5px, 2.2vw, 8px);

  line-height: 1.35;

}


/* =========================================================
   PROCESS ACTIONS
========================================================= */

.process-actions {

  width: 100%;

  display: flex;

  flex-direction: column;

  gap: 7px;

  margin-top: 9px;

}


.process-actions.follow-up-actions {

  display: grid;

  grid-template-columns:
    repeat(2, minmax(0, 1fr));

}


.process-action {

  width: 100%;

  min-height: 43px;

  display: flex;

  align-items: center;

  justify-content: center;

  gap: 7px;

  padding:
    8px 12px;

  box-sizing: border-box;

  border-radius: 7px;

  font-family: inherit;

  font-size:
    clamp(8px, 2.6vw, 10px);

  font-weight: 700;

}


.process-action.status-change {

  margin-top: 10px;

  border: 0;

  background:
    #f85f63;

  color:
    #ffffff;

}


.process-action ion-icon {

  flex-shrink: 0;

  font-size:
    17px;

}


/* PRIMARY */

.process-action.primary {

  border: 0;

  background:
    var(--cream);

  color:
    var(--gold);

}


/* SECONDARY */

.process-action.secondary {

  border:
    1px solid #e5d7ba;

  background:
    #ffffff;

  color:
    var(--gold);

}


/* DANGER */

.process-action.danger {

  border:
    1px solid #efc7c7;

  background:
    #fff4f4;

  color:
    #c94343;

}


/* =========================================================
   ACTION NOTE
========================================================= */

.action-note {

  width: 100%;

  display: flex;

  align-items: flex-start;

  gap: 5px;

  padding:
    2px 4px;

  box-sizing: border-box;

  color:
    #888888;

  font-size:
    clamp(6.5px, 2.2vw, 8px);

  line-height: 1.35;

}


.action-note ion-icon {

  flex-shrink: 0;

  font-size: 13px;

}


.action-note.warning {

  color:
    #8b7650;

}


/* =========================================================
   PROCESS NOTICE
========================================================= */

.process-notice {

  width: 100%;

  display: flex;

  align-items: flex-start;

  gap: 8px;

  padding:
    9px;

  box-sizing: border-box;

  border-radius: 7px;

}


.booking-notice {

  background:
    #fff5dc;

}


.sold-notice {

  background:
    #e8f4e8;

}


.notice-icon {

  flex:
    0 0 29px;

  width: 29px;

  height: 29px;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 50%;

  background:
    rgba(255,255,255,.75);

}


.notice-icon ion-icon {

  font-size: 16px;

}


.notice-content {

  min-width: 0;

  display: flex;

  flex-direction: column;

  gap: 3px;

}


.notice-content strong {

  color:
    #4c4c4c;

  font-size:
    clamp(8px, 2.6vw, 10px);

  line-height: 1.2;

}


.notice-content span {

  color:
    #777777;

  font-size:
    clamp(6.5px, 2.2vw, 8px);

  line-height: 1.4;

}


/* =========================================================
   MODAL CONTENT
========================================================= */

.edit-data-content {

  display: flex;

  flex-direction: column;

  gap: 12px;

}


.edit-data-content label {

  display: flex;

  flex-direction: column;

  gap: 5px;

  color: #555555;

  font-size: 11px;

  font-weight: 700;

}


.edit-data-content input,
.edit-data-content textarea,
.edit-data-content select {

  width: 100%;

  min-height: 40px;

  box-sizing: border-box;

  padding: 9px 10px;

  border: 1px solid #dddddd;

  border-radius: 7px;

  background: #ffffff;

  color: #222222;

  font: inherit;

  font-weight: 400;

}


.edit-data-content textarea {

  resize: vertical;

}


.edit-data-description,
.edit-data-message {

  margin: 0;

  color: #777777;

  font-size: 11px;

  line-height: 1.45;

}


.edit-data-message.error,
.spk-navigation-error {

  color: #c94343;

}


.modal-button.confirm-edit {

  background: var(--gold);

  color: #ffffff;

}


.modal-button:disabled {

  opacity: .55;

}


.spk-navigation-error {

  margin: 8px 0 0;

  font-size: 10px;

  line-height: 1.4;

}


.modal-wrapper {

  padding: 0;

}


.modal-icon {

  width: 48px;

  height: 48px;

  margin: 0 auto 12px;

  display: flex;

  align-items: center;

  justify-content: center;

  border-radius: 50%;

}


.modal-icon.danger {

  background:
    #fde5e3;

  color:
    #d84444;

}


.modal-icon ion-icon {

  font-size: 25px;

}


.modal-description {

  margin:
    0 0 15px;

  text-align: center;

  color:
    #777777;

  font-size:
    11px;

  line-height: 1.5;

}


.refund-warning {

  display: flex;

  align-items: flex-start;

  gap: 9px;

  padding:
    11px;

  border-radius: 8px;

  background:
    #fff2df;

  color:
    #7d6132;

}


.refund-warning > ion-icon {

  flex-shrink: 0;

  margin-top: 1px;

  font-size: 19px;

}


.refund-warning strong {

  display: block;

  margin-bottom: 3px;

  font-size: 10px;

}


.refund-warning p {

  margin: 0;

  font-size: 9px;

  line-height: 1.45;

}


.modal-button {

  min-height: 44px;

  border-radius: 7px;

  font-family: inherit;

  font-size: 10px;

  font-weight: 700;

}


.modal-button.cancel {

  border:
    1px solid #dddddd;

  background:
    #ffffff;

  color:
    #666666;

}


.modal-button.confirm-danger {

  border: 0;

  background:
    #d64a4a;

  color:
    #ffffff;

}


/* =========================================================
   RESPONSIVE 360PX
========================================================= */

@media (max-width: 360px) {

  .content-wrapper {

    width:
      calc(100% - 18px);

  }


  .profile-main {

    gap: 8px;

  }


  .action-grid {

    gap: 4px;

  }


  .data-row {

    grid-template-columns:
      minmax(88px, 1fr)
      8px
      minmax(0, 2fr);

  }


  .lot-main {

    grid-template-columns:
      70px
      minmax(0, 1fr)
      68px;

    gap: 6px;

  }


  .lot-detail-button {

    min-width: 68px;

  }

}


/* =========================================================
   RESPONSIVE 320PX
========================================================= */

@media (max-width: 320px) {

  .profile-card {

    min-height: 62px;

    padding: 7px;

  }


  .avatar {

    flex-basis: 38px;

    width: 38px;

    height: 38px;

  }


  .profile-main {

    gap: 6px;

  }


  .profile-status {

    flex-basis: 59px;

    min-width: 59px;

    font-size: 6.5px;

  }


  .action-grid {

    gap: 3px;

  }


  .action-button {

    height: 42px;

  }


  .action-button ion-icon {

    font-size: 14px;

  }


  .action-button span {

    font-size: 5.8px;

  }


  .data-row {

    grid-template-columns:
      minmax(78px, 1fr)
      7px
      minmax(0, 2fr);

  }


  .data-label,
  .data-value,
  .data-separator {

    font-size: 6.5px;

  }


  .lot-main {

    grid-template-columns:
      63px
      minmax(0, 1fr)
      60px;

    gap: 5px;

  }


  .lot-detail-button {

    min-width: 60px;

  }


  .process-card {

    padding-left: 6px;

    padding-right: 6px;

  }


  .process-line {

    margin:
      0 1px;

  }


  .process-icon {

    width: 27px;

    height: 27px;

  }


  .process-icon ion-icon {

    font-size: 12px;

  }


  .process-step span {

    font-size: 5.5px;

  }

}


/* =========================================================
   RESPONSIVE 280PX
========================================================= */

@media (max-width: 280px) {

  .content-wrapper {

    width:
      calc(100% - 10px);

  }


  .profile-status {

    flex-basis: 52px;

    min-width: 52px;

    font-size: 5.5px;

  }


  .action-button {

    height: 39px;

  }


  .action-button ion-icon {

    font-size: 12px;

  }


  .action-button span {

    font-size: 5px;

  }


  .data-row {

    grid-template-columns:
      minmax(65px, 1fr)
      5px
      minmax(0, 2fr);

  }


  .data-label,
  .data-value,
  .data-separator {

    font-size: 5.8px;

  }


  .lot-main {

    grid-template-columns:
      55px
      minmax(0, 1fr)
      52px;

  }


  .lot-detail-button {

    min-width: 52px;

  }


  .lot-detail-button span {

    font-size: 5px;

  }


  .process-icon {

    width: 24px;

    height: 24px;

  }


  .process-icon ion-icon {

    font-size: 10px;

  }


  .process-step span {

    font-size: 4.8px;

  }

}

</style>