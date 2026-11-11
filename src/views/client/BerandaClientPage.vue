<script setup lang="ts">
import { useRouter } from 'vue-router'
import { IonButton, IonContent, IonIcon, IonPage } from '@ionic/vue'
import {
  calendarOutline,
  cardOutline,
  cashOutline,
  checkmarkCircle,
  chevronForward,
  documentTextOutline,
  linkOutline,
  listOutline,
  logOutOutline,
  mapOutline,
  timeOutline,
} from 'ionicons/icons'

import { authService } from '@/services/auth/authService'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'

const router = useRouter()

async function logout() {
  await authService.logout()
  await router.replace('/login')
}

function goTo(path: string) {
  void router.push(path)
}
</script>

<template>
  <ion-page>
    <app-header
      variant="client"
      title="PoliLand Kairagi"
      :show-back="false"
    />

    <ion-content class="client-content" :fullscreen="true">
      <main class="dashboard">
        <!-- Sambutan -->
        <section class="welcome-card" aria-labelledby="welcome-title">
          <div class="welcome-heading">
            <div class="welcome-copy">
              <p class="welcome-eyebrow">SELAMAT DATANG,</p>
              <h1 id="welcome-title">Kevin Sondakh</h1>
            </div>
            <ion-button
              class="logout-icon-button"
              fill="solid"
              aria-label="Keluar dari akun"
              @click="logout"
            >
              <ion-icon :icon="logOutOutline" />
            </ion-button>
          </div>
          <p class="welcome-description">
            Pantau proses pembelian kavling Anda di PoliLand Kairagi.
          </p>

          <ion-button
            class="gold-button welcome-button"
            @click="goTo('/client/kavling')"
          >
            <ion-icon slot="start" :icon="mapOutline" />
            Lihat Kavling
            <ion-icon slot="end" :icon="chevronForward" />
          </ion-button>
        </section>

        <!-- Status pembelian -->
        <section class="dashboard-card purchase-card" aria-labelledby="purchase-title">
          <div class="section-heading">
            <div class="heading-title">
              <span class="heading-icon gold-icon">
                <ion-icon :icon="documentTextOutline" />
              </span>
              <h2 id="purchase-title">Status Pembelian Saya</h2>
            </div>
            <span class="booking-badge">Booking</span>
          </div>

          <div class="lot-summary">
            <span class="lot-icon">
              <ion-icon :icon="mapOutline" />
            </span>

            <div class="lot-info">
              <h3>Blok A - No. A03</h3>
              <p>Luas 120 m²</p>
            </div>

            <button
              class="icon-link"
              type="button"
              aria-label="Lihat detail kavling"
              @click="goTo('/client/kavling')"
            >
              <ion-icon :icon="chevronForward" />
            </button>
          </div>

          <div class="purchase-details">
            <div class="detail-row">
              <span class="detail-label">
                <ion-icon :icon="calendarOutline" />
                Tanggal Booking
              </span>
              <span class="detail-value">12 Okt 2026</span>
            </div>

            <div class="detail-row">
              <span class="detail-label">
                <ion-icon :icon="cardOutline" />
                Skema Pembayaran
              </span>
              <span class="detail-value">Cicilan 12 Bulan</span>
            </div>

            <div class="detail-row">
              <span class="detail-label">
                <ion-icon :icon="timeOutline" />
                Status Pembayaran
              </span>
              <span class="status-badge status-danger">Belum Jatuh Tempo</span>
            </div>
          </div>
        </section>

        <!-- Progress pembayaran -->
        <section class="dashboard-card progress-card" aria-labelledby="progress-title">
          <div class="section-heading progress-heading">
            <div class="heading-title">
              <span class="heading-icon gold-icon">
                <ion-icon :icon="linkOutline" />
              </span>
              <div>
                <h2 id="progress-title">Progress Pembayaran</h2>
                <p class="section-subtitle">Cicilan 12 Bulan</p>
              </div>
            </div>

            <ion-button
              class="gold-button detail-button"
              @click="goTo('/client/pembayaran')"
            >
              Lihat Detail
              <ion-icon slot="end" :icon="chevronForward" />
            </ion-button>
          </div>

          <div class="progress-line-row">
            <div
              class="progress-track"
              role="progressbar"
              aria-label="Progress cicilan"
              aria-valuemin="0"
              aria-valuemax="12"
              aria-valuenow="3"
            >
              <span class="progress-fill"></span>
            </div>

            <div class="progress-count">
              <strong>3 <span>/ 12</span></strong>
              <small>Cicilan</small>
            </div>
          </div>

          <div class="payment-totals">
            <div class="total-box">
              <div class="total-label">
                <span class="small-icon success-icon">
                  <ion-icon :icon="cashOutline" />
                </span>
                <span>Total Dibayar</span>
              </div>
              <strong>Rp 50.000.000</strong>
            </div>

            <div class="total-box">
              <div class="total-label">
                <span class="small-icon gold-icon">
                  <ion-icon :icon="documentTextOutline" />
                </span>
                <span>Sisa Pembayaran</span>
              </div>
              <strong>Rp 20.000.000</strong>
            </div>
          </div>
        </section>

        <!-- Jadwal dan dokumen -->
        <div class="quick-cards">
          <button
            class="dashboard-card quick-card"
            type="button"
            @click="goTo('/client/pembayaran')"
          >
            <span class="heading-icon gold-icon quick-card-icon">
              <ion-icon :icon="calendarOutline" />
            </span>

            <div class="quick-card-content">
              <h2>Jadwal Pembayaran Berikutnya</h2>
              <div class="next-payment">
                <strong>12 Okt 2026</strong>
                <div class="installment-caption">
                  <span>Cicilan ke-4</span>
                  <span class="status-badge status-danger">Belum Dibayar</span>
                </div>
              </div>
            </div>

            <ion-icon class="quick-chevron" :icon="chevronForward" />
          </button>

          <button
            class="dashboard-card quick-card document-card"
            type="button"
            @click="goTo('/client/dokumen')"
          >
            <span class="heading-icon gold-icon quick-card-icon">
              <ion-icon :icon="documentTextOutline" />
            </span>

            <div class="quick-card-content">
              <h2>Dokumen Saya</h2>
              <p class="document-description">
                KTP, KK, NPWP, SPK, Bukti Pembayaran
              </p>
              <span class="document-status">
                <ion-icon :icon="checkmarkCircle" />
                <span>3 dari 4 dokumen diunggah</span>
              </span>
            </div>

            <ion-icon class="quick-chevron" :icon="chevronForward" />
          </button>
        </div>

        <!-- Riwayat pembayaran -->
        <section class="dashboard-card history-card" aria-labelledby="history-title">
          <div class="section-heading history-heading">
            <div class="heading-title">
              <span class="heading-icon gold-icon">
                <ion-icon :icon="listOutline" />
              </span>
              <h2 id="history-title">Riwayat Pembayaran</h2>
            </div>

            <ion-button
              class="gold-button detail-button"
              @click="goTo('/client/pembayaran')"
            >
              Lihat Semua
              <ion-icon slot="end" :icon="chevronForward" />
            </ion-button>
          </div>

          <div class="table-scroll">
            <table class="payment-table">
              <thead>
                <tr>
                  <th scope="col">Tanggal</th>
                  <th scope="col">Cicilan</th>
                  <th scope="col">Jumlah</th>
                  <th scope="col">Metode</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>12 Okt 2026</td>
                  <td>Ke-1</td>
                  <td class="amount">Rp 10.000.000</td>
                  <td>Transfer Bank</td>
                </tr>
                <tr>
                  <td>12 Nov 2026</td>
                  <td>Ke-2</td>
                  <td class="amount">Rp 10.000.000</td>
                  <td>Transfer Bank</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </ion-content>

    <mobile-tab-bar variant="client" />
  </ion-page>
</template>

<style scoped>
.client-content {
  --background: var(--app-background, #faf9f6);
}

.dashboard {
  display: grid;
  gap: 20px;
  width: min(100%, 760px);
  margin: 0 auto;
  padding: 16px 16px 28px;
  color: var(--text-primary, #252525);
  font-family: var(--font-primary, var(--ion-font-family, sans-serif));
}

.welcome-card {
  padding: 30px 28px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 2px 4px rgb(37 37 37 / 6%);
}

.welcome-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.welcome-copy {
  min-width: 0;
}

.welcome-eyebrow {
  margin: 0 0 8px;
  color: var(--text-secondary, #717178);
  font-size: 14px;
  font-weight: var(--font-weight-semibold, 600);
  letter-spacing: 0.04em;
}

.welcome-card h1 {
  margin: 0;
  color: var(--text-primary, #252525);
  font-size: clamp(22px, 6vw, 24px);
  font-weight: var(--font-weight-bold, 700);
  line-height: 1.2;
}

.welcome-description {
  max-width: 420px;
  margin: 12px 0 24px;
  color: var(--text-secondary, #717178);
  font-size: 14px;
  line-height: 1.6;
}

.gold-button {
  --background: var(--poliland-gold-soft, #f4d69a);
  --background-hover: var(--poliland-gold-soft, #f4d69a);
  --background-activated: var(--poliland-gold, #cba044);
  --color: var(--poliland-gold-text-soft, #805708);
  --border-radius: var(--radius-control, 12px);
  --box-shadow: none;
  min-height: 44px;
  margin: 0;
  font-weight: var(--font-weight-semibold, 600);
  text-transform: none;
}

.welcome-button {
  min-width: 190px;
}

.dashboard-card {
  min-width: 0;
  padding: 22px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 2px 4px rgb(37 37 37 / 5%);
}

.section-heading,
.heading-title {
  display: flex;
  align-items: center;
}

.section-heading {
  justify-content: space-between;
  gap: 12px;
}

.heading-title {
  min-width: 0;
  gap: 12px;
}

.heading-title h2,
.quick-card h2 {
  margin: 0;
  color: var(--text-primary, #252525);
  font-size: 16px;
  font-weight: var(--font-weight-semibold, 600);
  line-height: 1.4;
}

.heading-icon,
.small-icon {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  color: var(--poliland-gold-text-soft, #805708);
  background: var(--poliland-gold-soft, #f4d69a);
}

.heading-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-control, 12px);
  font-size: 20px;
}

.gold-icon {
  color: var(--poliland-gold-text-soft, #805708);
  background: var(--poliland-gold-soft, #f4d69a);
}

.booking-badge,
.status-badge {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 9px;
  font-size: 12px;
  font-weight: var(--font-weight-medium, 500);
  line-height: 1.3;
}

.booking-badge {
  padding: 8px 12px;
  color: var(--poliland-gold-text, #966a12);
  background: var(--surface-muted, #f5f3ee);
}

.lot-summary {
  display: flex;
  align-items: center;
  gap: 16px;
  margin-top: 18px;
  padding: 18px 0;
  border-top: 1px solid var(--border-default, #eae7e0);
}

.lot-icon {
  display: inline-flex;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border-radius: var(--radius-control, 12px);
  color: var(--poliland-gold-text-soft, #805708);
  background: var(--poliland-gold-soft, #f4d69a);
  font-size: 20px;
}

.lot-info {
  flex: 1;
  min-width: 0;
}

.lot-info h3 {
  margin: 0 0 4px;
  font-size: 16px;
  font-weight: var(--font-weight-semibold, 600);
}

.lot-info p,
.section-subtitle {
  margin: 0;
  color: var(--text-secondary, #717178);
  font-size: 14px;
}

.icon-link {
  display: inline-flex;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  border: 0;
  border-radius: var(--radius-control, 12px);
  color: var(--text-secondary, #717178);
  background: transparent;
  font-size: 20px;
  cursor: pointer;
}

.purchase-details {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--app-background, #faf9f6);
}

.detail-row,
.detail-label {
  display: flex;
  align-items: center;
}

.detail-row {
  justify-content: space-between;
  gap: 12px;
  min-height: 24px;
}

.detail-label {
  gap: 9px;
  color: var(--text-secondary, #717178);
  font-size: 14px;
}

.detail-label ion-icon {
  color: var(--text-secondary, #717178);
  font-size: 18px;
}

.detail-value {
  color: var(--text-primary, #252525);
  font-size: 14px;
  font-weight: var(--font-weight-medium, 500);
  text-align: right;
}

.status-badge {
  padding: 6px 10px;
  white-space: nowrap;
}

.status-danger {
  color: var(--status-danger, #d94b45);
  background: #fff0f0;
}

.section-subtitle {
  margin-top: 3px;
}

.detail-button {
  flex: 0 0 auto;
  min-height: 40px;
  font-size: 14px;
  white-space: nowrap;
  --padding-start: 10px;
  --padding-end: 10px;
}

.detail-button::part(native) {
  white-space: nowrap;
}

.progress-line-row {
  display: flex;
  align-items: center;
  gap: 16px;
  margin: 22px 0;
}

.progress-track {
  height: 13px;
  flex: 1;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surface-muted, #f5f3ee);
}

.progress-fill {
  display: block;
  width: 25%;
  height: 100%;
  border-radius: inherit;
  background: var(--poliland-gold-text, #966a12);
}

.progress-count {
  display: grid;
  min-width: 48px;
  color: var(--text-primary, #252525);
  text-align: center;
}

.progress-count strong {
  font-size: 16px;
  line-height: 1.2;
}

.progress-count strong span,
.progress-count small {
  color: var(--text-secondary, #717178);
  font-weight: var(--font-weight-regular, 400);
}

.progress-count small {
  margin-top: 3px;
  font-size: 12px;
}

.payment-totals {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.total-box {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--app-background, #faf9f6);
}

.total-label {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary, #717178);
  font-size: 14px;
}

.small-icon {
  width: 34px;
  height: 34px;
  border-radius: 10px;
  font-size: 18px;
}

.success-icon {
  color: var(--poliland-gold-text-soft, #805708);
  background: var(--poliland-gold-soft, #f4d69a);
}

.total-box > strong {
  overflow-wrap: anywhere;
  font-size: 16px;
  font-weight: var(--font-weight-semibold, 600);
}

.quick-cards {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 12px;
}

.quick-card {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 24px;
  align-items: center;
  gap: 12px;
  min-height: 0;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.quick-card-icon {
  grid-column: 1;
  grid-row: 1;
}

.quick-card-content {
  grid-column: 2;
  grid-row: 1;
  min-width: 0;
}

.quick-card-content h2 {
  font-size: 16px;
}

.quick-chevron {
  grid-column: 3;
  grid-row: 1;
  justify-self: end;
  color: var(--text-secondary, #717178);
  font-size: 22px;
}

.next-payment {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 12px;
  margin-top: 6px;
}

.next-payment > strong {
  font-size: 14px;
}

.installment-caption {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary, #717178);
  font-size: 14px;
}

.document-description {
  margin: 4px 0 8px;
  color: var(--text-secondary, #717178);
  font-size: 14px;
  line-height: 1.45;
}

.document-status {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  max-width: 100%;
  padding: 8px 10px;
  border-radius: var(--radius-control, 12px);
  color: var(--poliland-green, #355a2c);
  background: var(--status-success-bg, #eaf7ef);
  font-size: 14px;
  font-weight: var(--font-weight-medium, 500);
  line-height: 1.35;
}

.document-status ion-icon {
  flex: 0 0 auto;
  font-size: 18px;
}

.document-status > span {
  min-width: 0;
}

.history-heading {
  margin-bottom: 18px;
}

.table-scroll {
  overflow-x: auto;
}

.payment-table {
  width: 100%;
  border-collapse: collapse;
  color: var(--text-secondary, #717178);
  font-size: 14px;
  white-space: nowrap;
}

.payment-table th,
.payment-table td {
  padding: 14px 12px;
  text-align: left;
}

.payment-table thead {
  color: var(--text-primary, #252525);
  background: var(--app-background, #faf9f6);
}

.payment-table th {
  font-weight: var(--font-weight-semibold, 600);
}

.payment-table tbody tr + tr {
  border-top: 1px solid var(--border-default, #eae7e0);
}

.payment-table .amount {
  color: var(--text-primary, #252525);
  font-weight: var(--font-weight-semibold, 600);
}

.logout-icon-button {
  flex: 0 0 64px;
  width: 64px;
  height: 64px;
  --color: var(--text-primary, #252525);
  --background: var(--surface-primary, #fff);
  --background-hover: var(--surface-muted, #f5f3ee);
  --background-activated: var(--surface-muted, #f5f3ee);
  --border-radius: 50%;
  --border-width: 1px;
  --border-color: var(--border-default, #eae7e0);
  --box-shadow: none;
  --padding-start: 0;
  --padding-end: 0;
  min-height: 44px;
  margin: 0;
  font-size: 22px;
}

.dashboard button:focus-visible,
.dashboard ion-button:focus-visible {
  outline: 3px solid var(--poliland-green, #355a2c);
  outline-offset: 3px;
}

@media (max-width: 420px) {
  .dashboard {
    gap: 14px;
    padding: 12px 12px 24px;
  }

  .welcome-card {
    padding: 24px 20px;
  }

  .dashboard-card {
    padding: 18px;
  }

  .heading-title {
    gap: 9px;
  }

  .heading-title h2 {
    font-size: 16px;
  }

  .heading-icon {
    width: 40px;
    height: 40px;
    font-size: 18px;
  }

  .quick-card {
    grid-template-columns: 40px minmax(0, 1fr) 20px;
    gap: 10px;
  }

  .quick-card-content h2 {
    font-size: 14px;
  }

  .document-status {
    font-size: 12px;
  }
  .detail-row {
    align-items: flex-start;
  }

  .detail-label,
  .detail-value {
    font-size: 13px;
  }

  .status-badge {
    font-size: 12px;
    white-space: normal;
    text-align: center;
  }

  .total-box {
    padding: 12px;
  }

  .total-label {
    gap: 7px;
    font-size: 12px;
  }

  .total-box > strong {
    font-size: 14px;
  }

  .section-heading {
    gap: 8px;
  }

  .section-heading .heading-title {
    flex: 1 1 0;
    gap: 8px;
  }

  .section-heading .heading-title > div,
  .section-heading .heading-title h2 {
    min-width: 0;
  }

  .section-heading .heading-title h2 {
    font-size: 14px;
  }

  .detail-button {
    flex: 0 0 auto;
    font-size: 12px;
    --padding-start: 7px;
    --padding-end: 7px;
  }
}

@media (prefers-reduced-motion: no-preference) {
  .quick-card,
  .icon-link,
  .gold-button {
    transition: background-color 160ms ease, box-shadow 160ms ease;
  }

  .quick-card:hover {
    box-shadow: 0 4px 12px rgb(37 37 37 / 8%);
  }
}
</style>