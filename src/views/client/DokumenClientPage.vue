<script setup lang="ts">
import { ref } from 'vue'
import {
  IonAlert,
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/vue'
import {
  callOutline,
  cardOutline,
  checkmarkCircleOutline,
  documentTextOutline,
  downloadOutline,
  eyeOutline,
  folderOpenOutline,
  headsetOutline,
  mapOutline,
  peopleOutline,
  ribbonOutline,
} from 'ionicons/icons'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'

type ClientDocument = {
  id: string
  name: string
  detail: string
  status: string
  icon: typeof documentTextOutline
}

const documents: ClientDocument[] = [
  {
    id: 'spk',
    name: 'Surat Pembelian Kavling (SPK)',
    detail: 'Format PDF • 2.4 MB',
    status: 'Disetujui',
    icon: documentTextOutline,
  },
  {
    id: 'ktp',
    name: 'KTP Pembeli',
    detail: 'Foto terverifikasi • 1.1 MB',
    status: 'Terverifikasi',
    icon: cardOutline,
  },
  {
    id: 'kk',
    name: 'Kartu Keluarga (KK)',
    detail: 'Dokumen sah • 1.8 MB',
    status: 'Terverifikasi',
    icon: peopleOutline,
  },
  {
    id: 'npwp',
    name: 'Nomor Pokok Wajib Pajak (NPWP)',
    detail: 'Dokumen sah • 950 KB',
    status: 'Terverifikasi',
    icon: cardOutline,
  },
]

const showDocumentAlert = ref(false)
const documentAlertHeader = ref('')
const documentAlertMessage = ref('')

function showDocumentAction(document: ClientDocument, action: 'Lihat' | 'Unduh') {
  documentAlertHeader.value = `${action} dokumen`
  documentAlertMessage.value =
    `File ${document.name} belum tersedia. Silakan hubungi Admin Officer untuk mendapatkan salinannya.`
  showDocumentAlert.value = true
}
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
        <section class="approval-card" aria-labelledby="approval-title">
          <div class="approval-icon">
            <ion-icon :icon="ribbonOutline" />
          </div>

          <div class="approval-copy">
            <div class="approval-meta">
              <span class="verified-badge">
                <ion-icon :icon="checkmarkCircleOutline" />
                Terverifikasi
              </span>
              <time datetime="2026-10-12">12 Okt 2026</time>
            </div>
            <h1 id="approval-title">Surat Pembelian Kavling Terverifikasi</h1>
            <p>
              Pengajuan SPK Anda telah disetujui oleh admin PoliLand Kairagi.
              Dokumen legalitas dan data pembelian Anda kini aktif.
            </p>
            <div class="registration">
              <span>Nomor Registrasi</span>
              <strong>SPK-202610-A03</strong>
            </div>
          </div>
        </section>

        <section class="content-card lot-card" aria-labelledby="lot-title">
          <div class="section-heading">
            <div class="section-title">
              <span class="section-icon">
                <ion-icon :icon="mapOutline" />
              </span>
              <h2 id="lot-title">Informasi Kavling</h2>
            </div>
            <span class="verified-badge">
              <ion-icon :icon="checkmarkCircleOutline" />
              Terverifikasi
            </span>
          </div>

          <div class="lot-summary">
            <div class="lot-thumbnail" aria-label="Kavling A03">
              <span>Kav. A03</span>
            </div>
            <div class="lot-details">
              <span class="field-label">Nomor Kavling</span>
              <strong>Blok A - No. A03</strong>
              <div class="lot-attributes">
                <div>
                  <span class="field-label">Luas Tanah</span>
                  <strong>120 m²</strong>
                </div>
                <div>
                  <span class="field-label">Area Lokasi</span>
                  <strong>Kairagi, Manado</strong>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section class="content-card buyer-card" aria-labelledby="buyer-title">
          <div class="section-heading">
            <div class="section-title">
              <span class="section-icon buyer-icon">
                <ion-icon :icon="peopleOutline" />
              </span>
              <h2 id="buyer-title">Data Pembeli Terdaftar</h2>
            </div>
          </div>

          <dl class="buyer-details">
            <div class="data-row">
              <dt>Nama Lengkap</dt>
              <dd>Kevin Sondakh</dd>
            </div>
            <div class="data-row">
              <dt>Nomor Identitas (NIK)</dt>
              <dd>7171********0002</dd>
            </div>
            <div class="data-row">
              <dt>Kontak WhatsApp</dt>
              <dd>0823 4735 8236</dd>
            </div>
            <div class="data-row payment-row">
              <dt>Skema Pembelian</dt>
              <dd>
                <strong>Cicilan 12 Bulan</strong>
                <span>Rp 5.000.000 / bln</span>
              </dd>
            </div>
          </dl>
        </section>

        <section class="content-card files-card" aria-labelledby="files-title">
          <div class="section-heading">
            <div class="section-title">
              <span class="section-icon files-icon">
                <ion-icon :icon="folderOpenOutline" />
              </span>
              <h2 id="files-title">Dokumen &amp; Berkas Terlampir</h2>
            </div>
            <span class="file-count">4 Berkas Sah</span>
          </div>

          <div class="document-list">
            <article
              v-for="document in documents"
              :key="document.id"
              class="document-card"
            >
              <div class="document-heading">
                <span class="document-icon">
                  <span
                    class="document-icon-surface"
                    :class="`document-icon-${document.id}`"
                    aria-hidden="true"
                  >
                    <ion-icon :icon="document.icon" />
                  </span>
                </span>
                <div class="document-copy">
                  <h3>{{ document.name }}</h3>
                  <p>{{ document.detail }}</p>
                </div>
                <span class="document-status">{{ document.status }}</span>
              </div>

              <div class="document-actions">
                <button
                  type="button"
                  class="document-action view-action"
                  @click="showDocumentAction(document, 'Lihat')"
                >
                  <ion-icon :icon="eyeOutline" />
                  Lihat
                </button>
                <button
                  type="button"
                  class="document-action download-action"
                  @click="showDocumentAction(document, 'Unduh')"
                >
                  <ion-icon :icon="downloadOutline" />
                  Unduh
                </button>
              </div>
            </article>
          </div>
        </section>

        <aside class="support-card">
          <span class="support-icon">
            <ion-icon :icon="headsetOutline" />
          </span>
          <div>
            <h2>Butuh revisi atau cetak fisik?</h2>
            <p>
              Hubungi Admin Officer PoliLand Kairagi untuk salinan bermaterai resmi.
            </p>
          </div>
          <ion-icon class="support-contact-icon" :icon="callOutline" aria-hidden="true" />
        </aside>
      </main>

      <ion-alert
        :is-open="showDocumentAlert"
        :header="documentAlertHeader"
        :message="documentAlertMessage"
        :buttons="['Tutup']"
        @did-dismiss="showDocumentAlert = false"
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
  grid-template-columns: 48px minmax(0, 1fr);
  align-items: start;
  gap: 12px;
  padding: 16px;
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
.verified-badge,
.registration,
.lot-summary,
.lot-attributes,
.document-heading,
.document-actions,
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

.verified-badge,
.document-status {
  gap: 5px;
  border-radius: 999px;
  color: var(--poliland-gold-text-soft, #805708);
  background: var(--poliland-gold-soft, #f4d69a);
  font-size: 12px;
  font-weight: var(--font-weight-medium, 500);
  white-space: nowrap;
}

.verified-badge {
  min-height: 28px;
  padding: 4px 9px;
}

.verified-badge ion-icon {
  font-size: 14px;
}

.approval-copy h1 {
  margin: 0 0 6px;
  color: var(--text-primary, #252525);
  font-size: 16px;
  font-weight: var(--font-weight-semibold, 600);
  line-height: 1.35;
}

.approval-copy > p {
  margin: 0;
  color: var(--text-secondary, #717178);
  font-size: 13px;
  line-height: 1.55;
}

.registration {
  justify-content: space-between;
  gap: 10px;
  margin-top: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border-default, #eae7e0);
  color: var(--text-secondary, #717178);
  font-size: 12px;
}

.registration strong {
  padding: 5px 8px;
  border-radius: 8px;
  color: var(--poliland-gold-text-soft, #805708);
  background: var(--poliland-gold-soft, #f4d69a);
  font-size: 12px;
  font-weight: var(--font-weight-medium, 500);
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
  margin: 0;
  color: var(--text-primary, #252525);
  font-weight: var(--font-weight-regular, 400);
  text-align: right;
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

.document-icon-surface {
  display: grid;
  width: 100%;
  height: 100%;
  place-items: center;
  border-radius: inherit;
}

.document-icon-spk {
  color: #a85a13;
  background: #fff3e5;
}

.document-icon-ktp {
  color: var(--pl-info, #2f6feb);
  background: #eef4ff;
}

.document-icon-kk {
  color: var(--poliland-green, #355a2c);
  background: var(--status-success-bg, #eaf7ef);
}

.document-icon-npwp {
  color: var(--status-danger, #d94b45);
  background: #fcebea;
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

.document-actions {
  gap: 8px;
  margin-top: 9px;
  padding-top: 8px;
  border-top: 1px solid var(--border-default, #eae7e0);
}

.document-action {
  display: inline-flex;
  min-width: 0;
  min-height: 40px;
  flex: 1;
  align-items: center;
  justify-content: center;
  gap: 6px;
  border: 1px solid transparent;
  border-radius: 9px;
  font: inherit;
  font-size: 12px;
  font-weight: var(--font-weight-medium, 500);
  cursor: pointer;
}

.document-action ion-icon {
  font-size: 15px;
}

.view-action {
  border-color: var(--border-default, #eae7e0);
  color: var(--text-primary, #252525);
  background: #e6e7ea;
}

.download-action {
  border-color: var(--poliland-gold-soft, #f4d69a);
  color: var(--poliland-gold-text-soft, #805708);
  background: var(--surface-primary, #fff);
}

.document-action:focus-visible {
  outline: 3px solid var(--poliland-green, #355a2c);
  outline-offset: 2px;
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
    grid-template-columns: 42px minmax(0, 1fr);
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