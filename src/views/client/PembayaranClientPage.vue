<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonAlert,
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/vue'
import {
  checkmarkCircleOutline,
  chevronForward,
  documentTextOutline,
  hourglassOutline,
  searchOutline,
} from 'ionicons/icons'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'

type PaymentStatus = 'verified' | 'pending' | 'rejected'

type PaymentTransaction = {
  id: string
  date: string
  installment: number
  amount: number
  lot: string
  method: string
  status: PaymentStatus
}

const router = useRouter()

const searchQuery = ref('')
const selectedFilter = ref<'all' | PaymentStatus>('all')
const selectedTransaction = ref<PaymentTransaction | null>(null)
const showDetailAlert = ref(false)

const filters: Array<{ label: string; value: 'all' | PaymentStatus }> = [
  { label: 'Semua', value: 'all' },
  { label: 'Terverifikasi', value: 'verified' },
  { label: 'Menunggu Verifikasi', value: 'pending' },
  { label: 'Ditolak', value: 'rejected' },
]

const transactions = ref<PaymentTransaction[]>([
  {
    id: 'PAY-004',
    date: '2026-11-22',
    installment: 3,
    amount: 5_000_000,
    lot: 'Blok A - No. A03',
    method: 'Transfer Bank',
    status: 'rejected',
  },
  {
    id: 'PAY-003',
    date: '2026-11-20',
    installment: 3,
    amount: 5_000_000,
    lot: 'Blok A - No. A03',
    method: 'Transfer Bank',
    status: 'pending',
  },
  {
    id: 'PAY-002',
    date: '2026-11-12',
    installment: 2,
    amount: 5_000_000,
    lot: 'Blok A - No. A03',
    method: 'Transfer Bank',
    status: 'verified',
  },
  {
    id: 'PAY-001',
    date: '2026-10-12',
    installment: 1,
    amount: 5_000_000,
    lot: 'Blok A - No. A03',
    method: 'Transfer Bank',
    status: 'verified',
  },
])

const verifiedTotal = computed(() =>
  transactions.value
    .filter((transaction) => transaction.status === 'verified')
    .reduce((total, transaction) => total + transaction.amount, 0),
)

const pendingTotal = computed(() =>
  transactions.value
    .filter((transaction) => transaction.status === 'pending')
    .reduce((total, transaction) => total + transaction.amount, 0),
)

const filteredTransactions = computed(() => {
  const query = searchQuery.value.trim().toLocaleLowerCase('id-ID')

  return transactions.value.filter((transaction) => {
    const matchesFilter =
      selectedFilter.value === 'all' ||
      transaction.status === selectedFilter.value

    const searchableText = [
      transaction.id,
      transaction.lot,
      transaction.method,
      `pembayaran ke-${transaction.installment}`,
      getStatusLabel(transaction.status),
    ]
      .join(' ')
      .toLocaleLowerCase('id-ID')

    return matchesFilter && (!query || searchableText.includes(query))
  })
})

const detailMessage = computed(() => {
  if (!selectedTransaction.value) return ''

  const transaction = selectedTransaction.value

  return [
    `Nomor transaksi: ${transaction.id}`,
    `Kavling: ${transaction.lot}`,
    `Pembayaran ke-${transaction.installment}`,
    `Jumlah: ${formatCurrency(transaction.amount)}`,
    `Metode: ${transaction.method}`,
    `Status: ${getStatusLabel(transaction.status)}`,
  ].join('<br>')
})

function goBack() {
  void router.push('/beranda-client')
}

function formatCurrency(amount: number) {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

function formatDateParts(value: string) {
  const date = new Date(`${value}T00:00:00`)

  return {
    day: new Intl.DateTimeFormat('id-ID', { day: '2-digit' }).format(date),
    month: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date),
    year: new Intl.DateTimeFormat('id-ID', { year: 'numeric' }).format(date),
  }
}

function getStatusLabel(status: PaymentStatus) {
  const labels: Record<PaymentStatus, string> = {
    verified: 'Terverifikasi',
    pending: 'Menunggu Verifikasi',
    rejected: 'Ditolak',
  }

  return labels[status]
}

function openTransaction(transaction: PaymentTransaction) {
  selectedTransaction.value = transaction
  showDetailAlert.value = true
}
</script>

<template>
  <ion-page class="payment-page">
    <AppHeader
      variant="client"
      title="PoliLand Kairagi"
      :show-back="false"
    />

    <ion-content class="payment-content" :fullscreen="true">
      <main class="payment-shell">
        <div class="page-heading">
          <button
            class="back-button"
            type="button"
            aria-label="Kembali ke Beranda"
            @click="goBack"
          >
            <ion-icon :icon="chevronForward" />
          </button>
          <h1>Pembayaran</h1>
        </div>

        <!-- Informasi kavling -->
        <section class="lot-card" aria-labelledby="lot-title">
          <div class="section-title">
            <span class="title-icon title-icon-gold">
              <ion-icon :icon="documentTextOutline" />
            </span>
            <h2 id="lot-title">Informasi Kavling</h2>
          </div>

          <button
            class="lot-summary"
            type="button"
            aria-label="Detail Blok A Nomor A03"
          >
            <span class="lot-thumbnail" aria-hidden="true">
              <span>A03</span>
            </span>

            <span class="lot-copy">
              <strong>Blok A - No. A03</strong>
              <span>⌗ 120 m²</span>
              <span class="lot-location">◎ Kairagi, Manado</span>
              <span class="spk-status">
                <ion-icon :icon="documentTextOutline" />
                Status: Dalam Proses SPK
              </span>
            </span>

            <ion-icon class="lot-chevron" :icon="chevronForward" />
          </button>
        </section>

        <!-- Ringkasan transaksi -->
        <section class="summary-grid" aria-label="Ringkasan pembayaran">
          <article class="summary-card">
            <span class="summary-icon summary-icon-gold">
              <ion-icon :icon="documentTextOutline" />
            </span>
            <span class="summary-label">Total Transaksi</span>
            <strong>{{ transactions.length }} kali</strong>
          </article>

          <article class="summary-card">
            <span class="summary-icon summary-icon-green">
              <ion-icon :icon="checkmarkCircleOutline" />
            </span>
            <span class="summary-label">Terverifikasi</span>
            <strong class="amount-green">{{ formatCurrency(verifiedTotal) }}</strong>
          </article>

          <article class="summary-card">
            <span class="summary-icon summary-icon-orange">
              <ion-icon :icon="hourglassOutline" />
            </span>
            <span class="summary-label">Menunggu Verifikasi</span>
            <strong class="amount-orange">{{ formatCurrency(pendingTotal) }}</strong>
          </article>
        </section>

        <!-- Pencarian -->
        <label class="search-box">
          <ion-icon :icon="searchOutline" aria-hidden="true" />
          <span class="visually-hidden">Cari transaksi atau nomor kavling</span>
          <input
            v-model="searchQuery"
            type="search"
            placeholder="Cari transaksi atau nomor kavling..."
          />
        </label>

        <!-- Filter -->
        <div class="filter-list" aria-label="Filter transaksi">
          <button
            v-for="filter in filters"
            :key="filter.value"
            type="button"
            class="filter-chip"
            :class="{ 'filter-chip-active': selectedFilter === filter.value }"
            :aria-pressed="selectedFilter === filter.value"
            @click="selectedFilter = filter.value"
          >
            {{ filter.label }}
          </button>
        </div>

        <!-- Daftar transaksi -->
        <section class="transaction-list" aria-label="Daftar transaksi pembayaran">
          <button
            v-for="transaction in filteredTransactions"
            :key="transaction.id"
            class="transaction-card"
            type="button"
            @click="openTransaction(transaction)"
          >
            <span class="transaction-date">
              <strong>{{ formatDateParts(transaction.date).day }}</strong>
              <span>{{ formatDateParts(transaction.date).month }}</span>
              <small>{{ formatDateParts(transaction.date).year }}</small>
            </span>

            <span class="transaction-info">
              <strong>Pembayaran ke-{{ transaction.installment }}</strong>
              <span>{{ transaction.lot }}</span>
            </span>

            <span class="transaction-payment">
              <strong>{{ formatCurrency(transaction.amount) }}</strong>
              <span class="payment-meta">
                <span>{{ transaction.method }}</span>
                <span
                  class="status-badge"
                  :class="`status-${transaction.status}`"
                >
                  {{ getStatusLabel(transaction.status) }}
                </span>
              </span>
            </span>

            <ion-icon
              class="transaction-chevron"
              :icon="chevronForward"
              aria-hidden="true"
            />
          </button>

          <div
            v-if="filteredTransactions.length === 0"
            class="empty-state"
            role="status"
          >
            <ion-icon :icon="searchOutline" />
            <strong>Transaksi tidak ditemukan</strong>
            <span>Coba ubah kata pencarian atau filter status.</span>
          </div>
        </section>
      </main>

      <ion-alert
        :is-open="showDetailAlert"
        header="Detail Pembayaran"
        :message="detailMessage"
        :buttons="['Tutup']"
        @did-dismiss="showDetailAlert = false"
      />
    </ion-content>

    <MobileTabBar variant="client" />
  </ion-page>
</template>

<style scoped>
.payment-page {
  --background: var(--app-background, #faf9f6);
  color: var(--text-primary, #252525);
  font-family: var(--font-primary, var(--ion-font-family, sans-serif));
}

.payment-content {
  --background: var(--app-background, #faf9f6);
}

.payment-shell {
  display: grid;
  gap: 20px;
  width: min(100%, 760px);
  margin: 0 auto;
  padding: 0 16px calc(104px + env(safe-area-inset-bottom, 0px));
}

.page-heading {
  display: flex;
  min-height: 60px;
  align-items: center;
  gap: 8px;
  margin: 0 -16px;
  padding: 0 20px;
  border-bottom: 1px solid var(--border-default, #eae7e0);
  background: var(--surface-primary, #fff);
}

.page-heading h1 {
  margin: 0;
  color: var(--text-primary, #252525);
  font-size: 22px;
  font-weight: var(--font-weight-bold, 700);
}

.back-button {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  place-items: center;
  transform: rotate(180deg);
  border: 0;
  border-radius: var(--radius-control, 12px);
  color: var(--text-primary, #252525);
  background: transparent;
  font-size: 26px;
  cursor: pointer;
}

.lot-card,
.summary-card,
.transaction-card {
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 2px 8px rgb(37 37 37 / 4%);
}

.lot-card {
  padding: 20px;
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
}

.section-title h2 {
  margin: 0;
  color: var(--text-primary, #252525);
  font-size: 18px;
  font-weight: var(--font-weight-semibold, 600);
}

.title-icon,
.summary-icon {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: var(--radius-control, 12px);
}

.title-icon {
  width: 48px;
  height: 48px;
  font-size: 22px;
}

.title-icon-gold,
.summary-icon-gold {
  color: var(--poliland-gold-text, #966a12);
  background: var(--poliland-gold-soft, #f4d69a);
}

.lot-summary {
  display: grid;
  width: 100%;
  grid-template-columns: 120px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 14px;
  padding: 0;
  border: 0;
  color: inherit;
  background: transparent;
  text-align: left;
}

.lot-thumbnail {
  display: grid;
  min-height: 88px;
  place-items: center;
  overflow: hidden;
  border: 3px solid var(--poliland-gold, #cba044);
  border-radius: var(--radius-control, 12px);
  background:
    linear-gradient(180deg, transparent 35%, rgb(37 37 37 / 48%)),
    linear-gradient(135deg, #9db198, #d8c9a8 45%, #637c58);
}

.lot-thumbnail span {
  color: #fff;
  font-size: 22px;
  font-weight: var(--font-weight-bold, 700);
  text-shadow: 0 1px 4px rgb(0 0 0 / 45%);
}

.lot-copy {
  display: grid;
  min-width: 0;
  gap: 5px;
}

.lot-copy > strong {
  color: var(--text-primary, #252525);
  font-size: 17px;
  font-weight: var(--font-weight-semibold, 600);
}

.lot-copy > span:not(.spk-status) {
  color: var(--text-secondary, #717178);
  font-size: 14px;
}

.lot-copy .lot-location {
  color: var(--poliland-gold-text, #966a12);
}

.spk-status {
  display: inline-flex;
  width: fit-content;
  align-items: center;
  gap: 6px;
  margin-top: 3px;
  padding: 6px 9px;
  border: 1px solid var(--poliland-gold-soft, #f4d69a);
  border-radius: var(--radius-control, 12px);
  color: var(--poliland-gold-text, #966a12);
  background: var(--surface-muted, #f5f3ee);
  font-size: 12px;
}

.lot-chevron,
.transaction-chevron {
  color: #aab3c0;
  font-size: 22px;
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.summary-card {
  display: grid;
  min-width: 0;
  min-height: 150px;
  align-content: space-between;
  justify-items: start;
  gap: 10px;
  padding: 16px;
}

.summary-icon {
  width: 48px;
  height: 48px;
  font-size: 22px;
}

.summary-icon-green {
  color: var(--poliland-green, #355a2c);
  background: var(--status-success-bg, #eaf7ef);
}

.summary-icon-orange {
  color: #a85a13;
  background: #fff3e5;
}

.summary-label {
  min-height: 36px;
  color: var(--text-secondary, #717178);
  font-size: 13px;
  line-height: 1.35;
}

.summary-card > strong {
  overflow-wrap: anywhere;
  color: var(--text-primary, #252525);
  font-size: 16px;
  font-weight: var(--font-weight-semibold, 600);
}

.summary-card .amount-green {
  color: var(--poliland-green, #355a2c);
}

.summary-card .amount-orange {
  color: #a85a13;
}

.search-box {
  display: flex;
  min-height: 56px;
  align-items: center;
  gap: 12px;
  padding: 0 16px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 2px 5px rgb(37 37 37 / 4%);
}

.search-box ion-icon {
  flex: 0 0 auto;
  color: var(--text-secondary, #717178);
  font-size: 23px;
}

.search-box input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: var(--text-primary, #252525);
  background: transparent;
  font: inherit;
  font-size: 15px;
}

.search-box input::placeholder {
  color: var(--text-secondary, #717178);
  opacity: 0.8;
}

.search-box:focus-within {
  outline: 3px solid var(--poliland-green, #355a2c);
  outline-offset: 2px;
}

.filter-list {
  display: flex;
  gap: 10px;
  overflow-x: auto;
  padding: 2px 0 6px;
  scrollbar-width: thin;
}

.filter-chip {
  min-height: 44px;
  flex: 0 0 auto;
  padding: 0 18px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  color: var(--text-secondary, #717178);
  background: var(--surface-primary, #fff);
  font: inherit;
  font-size: 14px;
  font-weight: var(--font-weight-medium, 500);
  cursor: pointer;
}

.filter-chip-active {
  border-color: var(--poliland-gold-text, #966a12);
  color: #fff;
  background: var(--poliland-gold-text, #966a12);
}

.transaction-list {
  display: grid;
  gap: 14px;
}

.transaction-card {
  display: grid;
  min-height: 132px;
  grid-template-columns: 64px minmax(0, 1fr) minmax(0, 1.2fr) 18px;
  align-items: center;
  gap: 14px;
  padding: 16px;
  color: inherit;
  text-align: left;
  cursor: pointer;
}

.transaction-date {
  display: grid;
  justify-items: center;
  gap: 2px;
  padding-right: 12px;
  border-right: 1px solid var(--border-default, #eae7e0);
  color: var(--text-secondary, #717178);
}

.transaction-date strong {
  color: var(--text-primary, #252525);
  font-size: 24px;
  font-weight: var(--font-weight-bold, 700);
  line-height: 1.1;
}

.transaction-date span {
  font-size: 14px;
}

.transaction-date small {
  font-size: 12px;
}

.transaction-info,
.transaction-payment,
.payment-meta {
  display: grid;
  min-width: 0;
}

.transaction-info {
  gap: 5px;
}

.transaction-info strong,
.transaction-payment > strong {
  overflow: hidden;
  color: var(--text-primary, #252525);
  font-size: 15px;
  font-weight: var(--font-weight-semibold, 600);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transaction-info > span,
.payment-meta > span:first-child {
  overflow: hidden;
  color: var(--text-secondary, #717178);
  font-size: 13px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.transaction-payment {
  justify-items: end;
  gap: 5px;
}

.payment-meta {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: 6px;
}

.status-badge {
  display: inline-flex;
  min-height: 30px;
  align-items: center;
  justify-content: center;
  padding: 4px 10px;
  border: 1px solid transparent;
  border-radius: 999px;
  font-size: 12px;
  line-height: 1.2;
  white-space: nowrap;
}

.status-verified {
  border-color: #b9f2dc;
  color: var(--poliland-green, #355a2c);
  background: var(--status-success-bg, #eaf7ef);
}

.status-pending {
  border-color: #f4d69a;
  color: #a85a13;
  background: #fff9e9;
}

.status-rejected {
  border-color: #ffd1d1;
  color: var(--status-danger, #d94b45);
  background: #fff1f1;
}

.empty-state {
  display: grid;
  min-height: 180px;
  align-content: center;
  justify-items: center;
  gap: 8px;
  padding: 20px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  color: var(--text-secondary, #717178);
  background: var(--surface-primary, #fff);
  text-align: center;
}

.empty-state ion-icon {
  font-size: 28px;
}

.empty-state strong {
  color: var(--text-primary, #252525);
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  clip-path: inset(50%);
}

.payment-page button:focus-visible {
  outline: 3px solid var(--poliland-green, #355a2c);
  outline-offset: 3px;
}

@media (max-width: 560px) {
  .payment-shell {
    gap: 16px;
    padding-inline: 12px;
  }

  .page-heading {
    margin-inline: -12px;
  }

  .lot-card {
    padding: 16px;
  }

  .lot-summary {
    grid-template-columns: 96px minmax(0, 1fr) 16px;
    gap: 10px;
  }

  .lot-thumbnail {
    min-height: 82px;
  }

  .lot-copy > strong {
    font-size: 15px;
  }

  .lot-copy > span:not(.spk-status) {
    font-size: 12px;
  }

  .spk-status {
    font-size: 10px;
  }

  .summary-grid {
    gap: 8px;
  }

  .summary-card {
    min-height: 142px;
    gap: 8px;
    padding: 12px;
  }

  .summary-icon {
    width: 42px;
    height: 42px;
  }

  .summary-label {
    font-size: 12px;
  }

  .summary-card > strong {
    font-size: 14px;
  }

  .transaction-card {
    grid-template-columns: 52px minmax(0, 1fr) auto 14px;
    gap: 10px;
    padding: 14px 12px;
  }

  .transaction-date {
    padding-right: 8px;
  }

  .transaction-date strong {
    font-size: 22px;
  }

  .transaction-info strong,
  .transaction-payment > strong {
    font-size: 13px;
  }

  .transaction-info > span,
  .payment-meta > span:first-child {
    font-size: 11px;
  }

  .status-badge {
    padding-inline: 8px;
    font-size: 10px;
  }
}

@media (max-width: 380px) {
  .summary-card {
    min-height: 150px;
    padding: 10px;
  }

  .summary-card > strong {
    font-size: 12px;
  }

  .transaction-card {
    grid-template-columns: 46px minmax(0, 1fr) 18px;
  }

  .transaction-payment {
    grid-column: 2;
    justify-items: start;
  }

  .transaction-chevron {
    grid-column: 3;
    grid-row: 1 / span 2;
  }

  .payment-meta {
    justify-content: flex-start;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    scroll-behavior: auto !important;
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>