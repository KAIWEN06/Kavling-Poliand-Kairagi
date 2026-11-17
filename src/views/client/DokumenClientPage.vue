<script setup lang="ts">
import { ref } from 'vue'
import {
  IonAlert,
  IonContent,
  IonIcon,
  IonPage,
  onIonViewWillEnter,
  useIonRouter,
} from '@ionic/vue'
import {
  callOutline,
  documentTextOutline,
  headsetOutline,
  mapOutline,
  peopleOutline,
  trashOutline,
} from 'ionicons/icons'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import {
  deleteClientSpk,
  getClientSpkErrorMessage,
  getClientSpks,
  type ClientSpkDocumentKey,
  type ClientSpkRecord,
} from '@/services/clientSpkService'

const ionRouter = useIonRouter()
const spkRecords = ref<ClientSpkRecord[]>([])
const storageError = ref('')
const operationError = ref('')
const loading = ref(true)
const deletingSpkId = ref<number | null>(null)
const deleteTarget = ref<ClientSpkRecord | null>(null)
const showDeleteAlert = ref(false)

const documentFields: Array<{ key: ClientSpkDocumentKey; label: string }> = [
  { key: 'ktp', label: 'KTP' },
  { key: 'kk', label: 'Kartu Keluarga (KK)' },
  { key: 'npwp', label: 'NPWP' },
  { key: 'paymentProof', label: 'Bukti Pembayaran' },
]

const deleteAlertButtons = [
  { text: 'Batal', role: 'cancel' },
  {
    text: 'Ya, hapus SPK',
    role: 'destructive',
    handler: () => {
      if (deleteTarget.value) void deleteSpk(deleteTarget.value.id)
    },
  },
]

async function loadSpkRecords() {
  loading.value = true
  storageError.value = ''

  try {
    spkRecords.value = await getClientSpks()
  } catch (error) {
    console.error('[Dokumen Client] Gagal memuat data SPK dari Supabase:', error)
    storageError.value = getClientSpkErrorMessage(
      error,
      'Data SPK gagal dimuat dari Supabase.',
    )
  } finally {
    loading.value = false
  }
}

function formatCurrency(value: number | null) {
  if (value === null || !Number.isFinite(value) || value <= 0) {
    return 'Harga belum tersedia'
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value)
}

function formatArea(value: number | string | null) {
  if (value === null || value === '') return 'Luas belum tersedia'

  const area = Number(value)
  return Number.isFinite(area) && area > 0
    ? `${area.toLocaleString('id-ID')} m²`
    : 'Luas belum tersedia'
}

function formatDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Tanggal tidak tersedia'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getStatusLabel(status: ClientSpkRecord['status']) {
  switch (status) {
    case 'Under Review':
      return 'Sedang Ditinjau'
    case 'Approved':
      return 'Disetujui'
    case 'Rejected':
      return 'Ditolak'
    case 'Cancelled':
      return 'Dibatalkan'
    default:
      return 'Menunggu Verifikasi'
  }
}

function canDelete(record: ClientSpkRecord) {
  return record.status !== 'Under Review' && record.status !== 'Approved'
}

function goToLots() {
  void ionRouter.push('/client/kavling')
}

function requestDelete(record: ClientSpkRecord) {
  operationError.value = ''
  deleteTarget.value = record
  showDeleteAlert.value = true
}

function closeDeleteAlert() {
  showDeleteAlert.value = false
  deleteTarget.value = null
}

async function deleteSpk(id: number) {
  deletingSpkId.value = id
  operationError.value = ''
  try {
    await deleteClientSpk(id)
    spkRecords.value = spkRecords.value.filter((record) => record.id !== id)
  } catch (error) {
    console.error('[Dokumen Client] Gagal menghapus SPK di Supabase:', error)
    operationError.value = getClientSpkErrorMessage(
      error,
      'SPK gagal dihapus dari Supabase.',
    )
  } finally {
    deletingSpkId.value = null
  }
}

onIonViewWillEnter(loadSpkRecords)
</script>

<template>
  <ion-page class="documents-page">
    <app-header
      variant="client"
      title="PoliLand Kairagi"
      :show-back="false"
    />

    <ion-content class="documents-content" :fullscreen="true">
      <main class="documents-shell">
      <header class="documents-page-heading">
        <div>
          <span class="documents-eyebrow">DATA PEMBELIAN</span>
          <h1>Dokumen &amp; SPK</h1>
          <p>Data ditampilkan dari formulir SPK yang Anda isi.</p>
        </div>
      </header>

      <p v-if="operationError" class="storage-error" role="alert">
        {{ operationError }}
      </p>

      <div v-if="loading" class="spk-loading" role="status">
        Memuat data SPK dari Supabase...
      </div>

      <section v-else-if="storageError" class="storage-error" role="alert">
        <strong>Data SPK tidak dapat dimuat</strong>
        <p>{{ storageError }}</p>
        <button type="button" @click="loadSpkRecords">Coba lagi</button>
      </section>

      <section v-else-if="!spkRecords.length" class="empty-state">
        <span class="empty-state-icon">
          <ion-icon :icon="documentTextOutline" aria-hidden="true" />
        </span>
        <h2>Belum ada data SPK</h2>
        <p>
          Data pembelian dan lampiran akan muncul di sini setelah Anda mengisi
          formulir SPK dari halaman Kavling.
        </p>
        <button type="button" @click="goToLots">Pilih Kavling</button>
      </section>

      <template v-else>
        <article
          v-for="record in spkRecords"
          :key="record.id"
          class="spk-entry"
        >
        <section class="approval-card" :aria-labelledby="`spk-title-${record.id}`">
          <div class="approval-icon">
            <ion-icon :icon="documentTextOutline" aria-hidden="true" />
            </div>

          <div class="approval-copy">
            <div class="approval-meta">
              <span class="spk-status">{{ getStatusLabel(record.status) }}</span>
              <time>{{ formatDate(record.createdAt) }}</time>
            </div>
              <h2 :id="`spk-title-${record.id}`">
                Surat Pembelian Kavling ({{ record.spkNumber }})
              </h2>
            </div>

          <button
            type="button"
            class="delete-spk-button"
            v-if="canDelete(record)"
            :aria-label="`Hapus SPK untuk ${record.lot.name}`"
            :disabled="deletingSpkId === record.id"
            @click="requestDelete(record)"
          >
            <ion-icon :icon="trashOutline" aria-hidden="true" />
            {{ deletingSpkId === record.id ? 'Menghapus...' : 'Hapus SPK' }}
          </button>
        </section>

        <section class="content-card lot-card" :aria-labelledby="`lot-title-${record.id}`">
          <div class="section-heading">
            <div class="section-title">
              <span class="section-icon">
                <ion-icon :icon="mapOutline" aria-hidden="true" />
              </span>
              <h2 :id="`lot-title-${record.id}`">Informasi Kavling</h2>
            </div>
          </div>

          <div class="lot-summary">
            <div class="lot-thumbnail" aria-hidden="true">
              <span>Kavling</span>
            </div>
            <div class="lot-details">
              <span class="field-label">Nomor Kavling</span>
              <strong>{{ record.lot.name }}</strong>
              <div class="lot-attributes">
                <div>
                  <span class="field-label">Luas Tanah</span>
                  <strong>{{ formatArea(record.lot.area) }}</strong>
                </div>
                <div>
                  <span class="field-label">Dimensi</span>
                  <strong>{{ record.lot.dimension || 'Belum tersedia' }}</strong>
                </div>
              </div>
              <div class="lot-attributes">
                <div>
                  <span class="field-label">Harga Kavling</span>
                  <strong>{{ formatCurrency(record.lot.price) }}</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="content-card buyer-card" :aria-labelledby="`buyer-title-${record.id}`">
          <div class="section-heading">
            <div class="section-title">
              <span class="section-icon buyer-icon">
                <ion-icon :icon="peopleOutline" aria-hidden="true" />
              </span>
              <h2 :id="`buyer-title-${record.id}`">Data Pembeli</h2>
            </div>
          </div>

          <dl class="buyer-details">
            <div class="data-row">
              <dt>Nama Lengkap</dt>
              <dd>{{ record.buyer.fullName }}</dd>
            </div>
            <div class="data-row">
              <dt>Nomor Kontak</dt>
              <dd>{{ record.buyer.phone }}</dd>
            </div>
            <div v-if="record.buyer.email" class="data-row">
              <dt>Email</dt>
              <dd>{{ record.buyer.email }}</dd>
            </div>
            <div class="data-row">
              <dt>Alamat</dt>
              <dd>{{ record.buyer.address }}</dd>
            </div>
            <div class="data-row payment-row">
              <dt>Skema Pembelian</dt>
              <dd>
                <strong>
                  {{ record.payment.scheme === 'Cash' ? 'Cash' : 'Cicilan' }}
                </strong>
                <span v-if="record.payment.method">{{ record.payment.method }}</span>
                <span v-if="record.payment.tenorMonths">
                  {{ record.payment.tenorMonths }} bulan
                  <template v-if="record.payment.monthlyPayment">
                    · {{ formatCurrency(record.payment.monthlyPayment) }} / bulan
                  </template>
                </span>
              </dd>
            </div>
          </dl>
        </section>

        <section class="content-card files-card" :aria-labelledby="`files-title-${record.id}`">
          <div class="section-heading">
            <div class="section-title">
              <span class="section-icon files-icon">
                <ion-icon :icon="documentTextOutline" aria-hidden="true" />
              </span>
              <h2 :id="`files-title-${record.id}`">Lampiran SPK</h2>
            </div>
            <span class="file-count">Berkas</span>
          </div>

          <div class="document-list">
            <article
              v-for="document in documentFields"
              :key="document.key"
              class="document-card"
            >
              <div class="document-heading">
                <span class="document-icon">
                  <ion-icon :icon="documentTextOutline" aria-hidden="true" />
                </span>
                <div class="document-copy">
                  <h3>{{ document.label }}</h3>
                  <p>
                    {{ record.documents[document.key]?.file_name || 'Tidak dilampirkan' }}
                  </p>
                </div>
                <span class="document-status">
                  {{ record.documents[document.key] ? 'Tersimpan' : 'Kosong' }}
                </span>
              </div>
            </article>
          </div>
          <p class="attachment-note">
            Berkas anda tersimpan secara private.
          </p>
        </section>
        </article>

      </template>

      <aside class="support-card">
        <span class="support-icon">
          <ion-icon :icon="headsetOutline" />
        </span>
        <div>
          <h2>Butuh bantuan?</h2>
          <p>Hubungi Admin Officer PoliLand Kairagi untuk informasi dokumen SPK.</p>
        </div>
        <ion-icon class="support-contact-icon" :icon="callOutline" aria-hidden="true" />
      </aside>
      </main>

      <ion-alert
      :is-open="showDeleteAlert"
      header="Hapus SPK?"
      :message="deleteTarget
        ? `SPK ${deleteTarget.spkNumber} beserta data dan lampirannya akan dihapus permanen dari Supabase. Tindakan ini tidak dapat dibatalkan.`
        : 'Data SPK dan lampirannya akan dihapus permanen dari Supabase. Tindakan ini tidak dapat dibatalkan.'"
      :buttons="deleteAlertButtons"
      @did-dismiss="closeDeleteAlert"
      />
    </ion-content>

    <mobile-tab-bar variant="client" />
  </ion-page>
</template>

<style scoped>
.documents-page,
.documents-content {
  --background: var(--app-background, #faf9f6);
  color: var(--text-primary, #252525);
  font-family: var(--font-primary, var(--ion-font-family, sans-serif));
}

.documents-shell {
  display: grid;
  gap: 14px;
  width: min(100%, 760px);
  margin: 0 auto;
  padding: 14px 16px calc(100px + env(safe-area-inset-bottom, 0px));
}

.documents-page-heading {
  padding: 2px 2px 4px;
}

.documents-eyebrow {
  color: var(--poliland-gold-text-soft, #805708);
  font-size: 11px;
  font-weight: var(--font-weight-semibold, 600);
  letter-spacing: 0.08em;
}

.documents-page-heading h1 {
  margin: 5px 0 6px;
  color: var(--text-primary, #252525);
  font-size: clamp(21px, 3.8vw, 26px);
  font-weight: var(--font-weight-bold, 700);
  line-height: 1.25;
}

.documents-page-heading p {
  margin: 0;
  color: var(--text-secondary, #717178);
  font-size: 13px;
  line-height: 1.5;
}

.spk-entry {
  display: grid;
  min-width: 0;
  gap: 14px;
}

.empty-state,
.storage-error {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 24px 18px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #fff);
  text-align: center;
}

.empty-state-icon {
  display: grid;
  width: 48px;
  height: 48px;
  place-items: center;
  border-radius: var(--radius-control, 12px);
  color: var(--poliland-gold-text-soft, #805708);
  background: var(--poliland-gold-soft, #f4d69a);
  font-size: 23px;
}

.empty-state h2,
.storage-error strong {
  margin: 0;
  color: var(--text-primary, #252525);
  font-size: 16px;
  font-weight: var(--font-weight-semibold, 600);
}

.empty-state p,
.storage-error p {
  max-width: 440px;
  margin: 0;
  color: var(--text-secondary, #717178);
  font-size: 13px;
  line-height: 1.5;
}

.empty-state button,
.storage-error button {
  min-height: 42px;
  margin-top: 2px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--radius-control, 12px);
  color: #fff;
  background: var(--poliland-green, #355a2c);
  font: inherit;
  font-size: 13px;
  font-weight: var(--font-weight-semibold, 600);
  cursor: pointer;
}

.storage-error {
  border-color: #ffd1d1;
}

.storage-error strong {
  color: var(--status-danger, #d94b45);
}

.supabase-storage-note,
.attachment-note {
  margin: 0;
  padding: 11px 12px;
  border: 1px solid var(--poliland-gold-soft, #f4d69a);
  border-radius: var(--radius-control, 12px);
  color: var(--poliland-gold-text-soft, #805708);
  background: var(--surface-muted, #fbf8f2);
  font-size: 12px;
  line-height: 1.5;
}

.attachment-note {
  margin-top: 12px;
  padding: 0;
  border: 0;
  color: var(--text-secondary, #717178);
  background: transparent;
  font-size: 11px;
}

.approval-card,
.content-card,
.support-card {
  min-width: 0;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 2px 6px rgb(37 37 37 / 4%);
}

.approval-card {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: start;
  gap: 12px;
  padding: 16px;
}

.delete-spk-button {
  display: inline-flex;
  min-height: 40px;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 0 10px;
  border: 1px solid #f1c8c6;
  border-radius: var(--radius-control, 12px);
  color: var(--status-danger, #d94b45);
  background: #fff8f7;
  font: inherit;
  font-size: 12px;
  font-weight: var(--font-weight-semibold, 600);
  cursor: pointer;
}

.delete-spk-button ion-icon {
  font-size: 16px;
}

.spk-status {
  display: inline-flex;
  min-height: 28px;
  align-items: center;
  padding: 4px 9px;
  border-radius: 999px;
  color: var(--text-secondary, #717178);
  background: var(--surface-muted, #f5f3ee);
  font-size: 11px;
  font-weight: var(--font-weight-medium, 500);
}

.approval-icon,
.section-icon,
.document-icon,
.support-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  color: var(--poliland-gold-text-soft, #805708);
  background: var(--poliland-gold-soft, #f4d69a);
}

.approval-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-control, 12px);
  font-size: 24px;
}

.approval-copy {
  min-width: 0;
}

.approval-meta,
.section-heading,
.section-title,
.lot-summary,
.lot-attributes,
.document-heading,
.support-card {
  display: flex;
  align-items: center;
}

.approval-meta {
  flex-wrap: wrap;
  justify-content: space-between;
  gap: 8px;
  margin-bottom: 8px;
}

.approval-meta time {
  color: var(--text-secondary, #717178);
  font-size: 12px;
}

.document-status {
  gap: 5px;
  border-radius: 999px;
  color: var(--poliland-gold-text-soft, #805708);
  background: var(--poliland-gold-soft, #f4d69a);
  font-size: 12px;
  font-weight: var(--font-weight-medium, 500);
  white-space: nowrap;
}

.approval-copy h2 {
  margin: 0 0 6px;
  color: var(--text-primary, #252525);
  font-size: 16px;
}

.delete-spk-button:disabled {
  cursor: wait;
  opacity: 0.65;
}

.spk-loading {
  padding: 18px;
  color: var(--text-secondary, #717178);
  font-size: 13px;
  text-align: center;
  font-weight: var(--font-weight-semibold, 600);
  line-height: 1.35;
}

.approval-copy > p {
  margin: 0;
  color: var(--text-secondary, #717178);
  font-size: 13px;
  line-height: 1.55;
}

.content-card {
  padding: 16px;
}

.section-heading {
  justify-content: space-between;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--border-default, #eae7e0);
}

.section-title {
  min-width: 0;
  gap: 9px;
}

.section-icon {
  width: 32px;
  height: 32px;
  border-radius: 10px;
  font-size: 18px;
}

.buyer-icon {
  color: var(--poliland-green, #355a2c);
  background: var(--status-success-bg, #eaf7ef);
}

.section-title h2 {
  margin: 0;
  color: var(--text-primary, #252525);
  font-size: 16px;
  font-weight: var(--font-weight-medium, 500);
  line-height: 1.35;
}

.lot-summary {
  gap: 12px;
  padding-top: 12px;
}

.lot-thumbnail {
  display: flex;
  width: 112px;
  min-height: 96px;
  flex: 0 0 auto;
  align-items: flex-end;
  padding: 8px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-muted, #f5f3ee);
}

.lot-thumbnail span {
  padding: 4px 7px;
  border-radius: 6px;
  color: var(--poliland-gold-text-soft, #805708);
  background: var(--poliland-gold-soft, #f4d69a);
  font-size: 11px;
  font-weight: var(--font-weight-semibold, 600);
}

.lot-details {
  min-width: 0;
  flex: 1;
}

.field-label {
  display: block;
  margin-bottom: 3px;
  color: var(--text-secondary, #717178);
  font-size: 12px;
}

.lot-details > strong,
.lot-attributes strong {
  display: block;
  color: var(--text-primary, #252525);
  font-size: 14px;
  font-weight: var(--font-weight-medium, 500);
}

.lot-attributes {
  justify-content: space-between;
  gap: 12px;
  margin-top: 8px;
  padding-top: 8px;
  border-top: 1px solid var(--border-default, #eae7e0);
}

.lot-attributes > div {
  min-width: 0;
}

.buyer-details {
  margin: 0;
}

.data-row {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px solid var(--border-default, #eae7e0);
  font-size: 13px;
}

.data-row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.data-row dt {
  color: var(--text-secondary, #717178);
}

.data-row dd {
  max-width: 68%;
  margin: 0;
  color: var(--text-primary, #252525);
  font-weight: var(--font-weight-regular, 400);
  text-align: right;
  overflow-wrap: anywhere;
}

.payment-row dd {
  display: grid;
  gap: 3px;
}

.payment-row dd span {
  color: var(--poliland-green, #355a2c);
  font-size: 12px;
  font-weight: var(--font-weight-medium, 500);
}

.file-count {
  flex: 0 0 auto;
  padding: 5px 8px;
  border-radius: 999px;
  color: var(--text-secondary, #717178);
  background: var(--surface-muted, #f5f3ee);
  font-size: 11px;
}

.document-list {
  display: grid;
  gap: 10px;
  padding-top: 12px;
}

.document-card {
  min-width: 0;
  padding: 10px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-muted, #f5f3ee);
}

.document-heading {
  gap: 9px;
  min-width: 0;
}

.document-icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  font-size: 18px;
}

.document-copy {
  min-width: 0;
  flex: 1;
}

.document-copy h3 {
  margin: 0;
  color: var(--text-primary, #252525);
  font-size: 13px;
  font-weight: var(--font-weight-medium, 500);
  line-height: 1.35;
}

.document-copy p {
  margin: 3px 0 0;
  color: var(--text-secondary, #717178);
  font-size: 11px;
}

.document-status {
  flex: 0 0 auto;
  padding: 5px 7px;
  font-size: 10px;
}

.support-card {
  gap: 12px;
  padding: 14px;
}

.support-icon {
  width: 40px;
  height: 40px;
  border: 1px solid var(--poliland-gold-soft, #f4d69a);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-muted, #f5f3ee);
  font-size: 19px;
}

.support-card h2 {
  margin: 0 0 3px;
  color: var(--text-primary, #252525);
  font-size: 14px;
  font-weight: var(--font-weight-medium, 500);
}

.support-card p {
  margin: 0;
  color: var(--text-secondary, #717178);
  font-size: 12px;
  line-height: 1.45;
}

.support-contact-icon {
  flex: 0 0 auto;
  margin-left: auto;
  color: var(--text-secondary, #717178);
  font-size: 18px;
}

.documents-shell button:focus-visible {
  outline: 3px solid var(--poliland-green, #355a2c);
  outline-offset: 2px;
}

.delete-spk-button:focus-visible {
  outline-color: var(--status-danger, #d94b45);
}

@media (max-width: 420px) {
  .documents-shell {
    gap: 12px;
    padding: 12px 12px calc(96px + env(safe-area-inset-bottom, 0px));
  }

  .approval-card,
  .content-card {
    padding: 14px;
  }

  .approval-card {
    grid-template-columns: 42px minmax(0, 1fr) auto;
    gap: 10px;
  }

  .approval-icon {
    width: 42px;
    height: 42px;
    font-size: 21px;
  }

  .section-title {
    gap: 7px;
  }

  .section-title h2 {
    font-size: 14px;
  }

  .delete-spk-button {
    grid-column: 2 / -1;
    justify-self: end;
  }

  .lot-thumbnail {
    width: 96px;
    min-height: 88px;
  }

  .lot-attributes {
    gap: 8px;
  }

  .lot-details > strong,
  .lot-attributes strong {
    font-size: 13px;
  }

  .document-heading {
    flex-wrap: wrap;
  }

  .document-copy {
    flex-basis: calc(100% - 102px);
  }

  .document-status {
    margin-left: auto;
  }
}
</style>