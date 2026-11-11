<script setup lang="ts">
import { computed, ref } from 'vue'
import {
  IonAlert,
  IonButton,
  IonContent,
  IonIcon,
  IonPage,
} from '@ionic/vue'
import {
  calendarOutline,
  checkmarkCircle,
  closeOutline,
  informationCircleOutline,
  pricetagOutline,
  shareSocialOutline,
  walletOutline,
} from 'ionicons/icons'
import { useRouter } from 'vue-router'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'

const router = useRouter()

const paymentType = ref<'cash' | 'installment'>('installment')
const selectedTenor = ref(12)
const showApplicationAlert = ref(false)

const installmentOptions = [
  { tenor: 3, label: 'Tenor 3 Bulan (3x)', amount: 10_750_000 },
  { tenor: 6, label: 'Tenor 6 Bulan (6x)', amount: 5_750_000 },
  { tenor: 9, label: 'Tenor 9 Bulan (9x)', amount: 4_083_333 },
  { tenor: 12, label: 'Tenor 12 Bulan (12x)', amount: 3_250_000, popular: true },
  { tenor: 15, label: 'Tenor 15 Bulan (15x)', amount: 2_750_000 },
]

const selectedOption = computed(
  () => installmentOptions.find((option) => option.tenor === selectedTenor.value),
)

const formattedInstallment = computed(() =>
  formatCurrency(selectedOption.value?.amount ?? 0),
)

function formatCurrency(amount: number) {
  return `Rp ${amount.toLocaleString('id-ID')}`
}

function goBack() {
  router.back()
}

function submitApplication() {
  showApplicationAlert.value = true
}
</script>

<template>
  <ion-page class="simulation-page">
    <AppHeader
      variant="client"
      title="Simulasi Kavling Lot A03"
      :show-back="true"
    />

    <ion-content class="simulation-content" :fullscreen="false">
      <main class="simulation-shell">
        <header class="lot-context">
          <div class="context-topline">
            <span class="availability-badge">TERSEDIA</span>
            <span>Blok A • No. A03</span>
            <span class="lot-area">105 m²</span>
          </div>

          <div class="siteplan-preview" aria-label="Pratinjau siteplan kavling">
            <div class="siteplan-grid" aria-hidden="true">
              <span v-for="item in 24" :key="item" class="siteplan-lot" />
            </div>
          </div>
        </header>

        <section class="simulation-sheet" aria-labelledby="simulation-title">
          <div class="sheet-handle" aria-hidden="true" />

          <div class="sheet-heading">
            <div>
              <div class="eyebrow-row">
                <p class="eyebrow">SIMULASI CICILAN</p>
                <span class="lot-code">LOT_003</span>
              </div>
              <h1 id="simulation-title">Kavling Blok A — No. A03</h1>
            </div>

            <button
              class="close-button"
              type="button"
              aria-label="Kembali"
              @click="goBack"
            >
              <ion-icon :icon="closeOutline" />
            </button>
          </div>

          <div class="price-grid">
            <article class="price-card">
              <h2>
                <ion-icon :icon="walletOutline" />
                Harga Cash
              </h2>
              <strong>{{ formatCurrency(30_000_000) }}</strong>
              <p>Sertifikat SHM Lengkap</p>
            </article>

            <article class="price-card promo-card">
              <h2>
                <ion-icon :icon="pricetagOutline" />
                Harga Promo
              </h2>
              <strong>{{ formatCurrency(30_000_000) }}</strong>
              <p>Spesial launching PoliLand</p>
            </article>
          </div>

          <div class="payment-switch" role="group" aria-label="Pilih metode pembayaran">
            <button
              type="button"
              :class="{ selected: paymentType === 'cash' }"
              :aria-pressed="paymentType === 'cash'"
              @click="paymentType = 'cash'"
            >
              <ion-icon :icon="walletOutline" />
              Cash / Tunai
            </button>

            <button
              type="button"
              :class="{ selected: paymentType === 'installment' }"
              :aria-pressed="paymentType === 'installment'"
              @click="paymentType = 'installment'"
            >
              <ion-icon :icon="calendarOutline" />
              Cicilan Bertahap
            </button>
          </div>

          <div v-if="paymentType === 'installment'" class="info-banner">
            <ion-icon :icon="informationCircleOutline" />
            <p>
              <strong>Simulasi Cicilan Bertahap Pengembang:</strong>
              Cicilan bertahap pengembang tanpa BI Checking dan tanpa denda
              keterlambatan.
            </p>
          </div>

          <div v-if="paymentType === 'installment'" class="tenor-list">
            <button
              v-for="option in installmentOptions"
              :key="option.tenor"
              type="button"
              class="tenor-option"
              :class="{ 'tenor-option-selected': selectedTenor === option.tenor }"
              :aria-pressed="selectedTenor === option.tenor"
              @click="selectedTenor = option.tenor"
            >
              <span class="tenor-circle">
                <strong>{{ option.tenor }}x</strong>
                <small>BULAN</small>
              </span>

              <span class="tenor-copy">
                <span class="tenor-title">
                  {{ option.label }}
                  <span v-if="option.popular" class="popular-badge">
                    Pilihan Populer
                  </span>
                </span>
                <strong>
                  {{ formatCurrency(option.amount) }}
                  <small>/ bln</small>
                </strong>
              </span>

              <span
                class="radio-indicator"
                :class="{ checked: selectedTenor === option.tenor }"
                aria-hidden="true"
              />
            </button>
          </div>

          <div v-else class="cash-info">
            <span class="cash-info-icon">
              <ion-icon :icon="checkmarkCircle" />
            </span>
            <div>
              <strong>Pembayaran Cash / Tunai</strong>
              <p>Total pembayaran: {{ formatCurrency(30_000_000) }}</p>
            </div>
          </div>

          <section
            v-if="paymentType === 'installment' && selectedOption"
            class="selected-summary"
            aria-live="polite"
          >
            <div>
              <span>Pilihan Dipilih</span>
              <strong>Cicilan {{ selectedOption.tenor }} Bulan ({{ selectedOption.tenor }}x)</strong>
            </div>
            <div class="summary-amount">
              <span>Angsuran / bln</span>
              <strong>{{ formattedInstallment }}</strong>
            </div>
          </section>

          <section v-else class="selected-summary cash-summary">
            <div>
              <span>Pilihan Dipilih</span>
              <strong>Cash / Tunai</strong>
            </div>
            <div class="summary-amount">
              <span>Total Pembayaran</span>
              <strong>{{ formatCurrency(30_000_000) }}</strong>
            </div>
          </section>

          <div class="action-row">
            <ion-button
              class="survey-button"
              fill="outline"
              @click="goBack"
            >
              <ion-icon slot="start" :icon="calendarOutline" />
              Survei Lokasi
            </ion-button>

            <ion-button
              class="apply-button"
              @click="submitApplication"
            >
              Ajukan Pemesanan
            </ion-button>
          </div>

          <button class="whatsapp-button" type="button">
            <ion-icon :icon="shareSocialOutline" />
            Tanya Lebih Lanjut via WhatsApp Marketing
          </button>
        </section>
      </main>

      <ion-alert
        :is-open="showApplicationAlert"
        header="Pengajuan Pemesanan"
        :message="paymentType === 'cash'
          ? 'Pilihan pembayaran Cash / Tunai telah dipilih.'
          : `Pilihan cicilan ${selectedTenor} bulan dengan angsuran ${formattedInstallment} per bulan telah dipilih.`"
        :buttons="['Tutup']"
        @did-dismiss="showApplicationAlert = false"
      />
    </ion-content>

    <MobileTabBar variant="client" />
  </ion-page>
</template>

<style scoped>
.simulation-page {
  --background: var(--app-background, #faf9f6);
  color: var(--text-primary, #252525);
  font-family: var(--font-primary, var(--ion-font-family, sans-serif));
}

.simulation-content {
  --background: var(--app-background, #faf9f6);
}

.simulation-shell {
  width: min(100%, 640px);
  margin: 0 auto;
  padding: 16px 16px calc(108px + env(safe-area-inset-bottom, 0px));
}

.lot-context {
  padding: 4px 4px 18px;
}

.context-topline {
  display: flex;
  align-items: center;
  gap: 10px;
  color: var(--text-secondary, #717178);
  font-size: 13px;
}

.availability-badge {
  padding: 6px 10px;
  border-radius: 999px;
  color: var(--poliland-green, #355a2c);
  background: var(--status-success-bg, #eaf7ef);
  font-size: 11px;
  font-weight: var(--font-weight-semibold, 600);
}

.lot-area {
  margin-left: auto;
}

.siteplan-preview {
  height: 140px;
  margin-top: 14px;
  overflow: hidden;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  background:
    radial-gradient(ellipse at 20% 25%, #d9e2ce 0 13%, transparent 14%),
    radial-gradient(ellipse at 72% 70%, #d9e2ce 0 16%, transparent 17%),
    linear-gradient(135deg, #e6e9d8, #d7decb 48%, #ece8dd);
  filter: blur(1px);
}

.siteplan-grid {
  display: grid;
  width: 78%;
  height: 90px;
  margin: 25px auto;
  grid-template-columns: repeat(6, 1fr);
  gap: 5px;
  transform: rotate(-2deg);
}

.siteplan-lot {
  border: 2px solid #d1cbbd;
  border-radius: 5px;
  background: rgb(248 246 239 / 78%);
}

.simulation-sheet {
  display: grid;
  gap: 16px;
  margin: 0 -16px;
  padding: 16px 20px 24px;
  border: 1px solid var(--border-default, #eae7e0);
  border-bottom: 0;
  border-radius: var(--radius-panel, 20px) var(--radius-panel, 20px) 0 0;
  background: var(--surface-primary, #fff);
  box-shadow: 0 -8px 24px rgb(37 37 37 / 8%);
}

.sheet-handle {
  width: 56px;
  height: 7px;
  margin: 0 auto 2px;
  border-radius: 99px;
  background: var(--border-default, #eae7e0);
}

.sheet-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.eyebrow-row {
  display: flex;
  align-items: center;
  gap: 9px;
}

.eyebrow {
  margin: 0;
  color: var(--poliland-gold-text, #966a12);
  font-size: 13px;
  font-weight: var(--font-weight-bold, 700);
  letter-spacing: 0.06em;
}

.lot-code,
.popular-badge {
  border-radius: 999px;
  color: #fff;
  background: var(--poliland-gold, #cba044);
  font-size: 11px;
  font-weight: var(--font-weight-semibold, 600);
}

.lot-code {
  padding: 5px 10px;
}

.sheet-heading h1 {
  margin: 7px 0 0;
  color: var(--text-primary, #252525);
  font-size: 22px;
  font-weight: var(--font-weight-bold, 700);
  line-height: 1.25;
}

.close-button {
  display: grid;
  width: 44px;
  height: 44px;
  flex: 0 0 auto;
  place-items: center;
  border: 0;
  border-radius: 50%;
  color: var(--text-secondary, #717178);
  background: var(--surface-muted, #f5f3ee);
  font-size: 22px;
  cursor: pointer;
}

.price-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.price-card {
  min-width: 0;
  padding: 16px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 3px 10px rgb(37 37 37 / 5%);
}

.price-card h2 {
  display: flex;
  align-items: center;
  gap: 7px;
  margin: 0 0 10px;
  color: var(--text-secondary, #717178);
  font-size: 13px;
  font-weight: var(--font-weight-semibold, 600);
  text-transform: uppercase;
}

.price-card h2 ion-icon {
  color: var(--poliland-gold-text, #966a12);
  font-size: 17px;
}

.price-card > strong {
  display: block;
  color: var(--text-primary, #252525);
  font-size: 19px;
  font-weight: var(--font-weight-bold, 700);
}

.promo-card > strong {
  color: var(--poliland-gold-text, #966a12);
}

.price-card p {
  margin: 8px 0 0;
  color: var(--text-secondary, #717178);
  font-size: 11px;
  line-height: 1.4;
}

.payment-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  border-radius: 999px;
  background: var(--surface-muted, #f5f3ee);
}

.payment-switch button {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px;
  border: 0;
  border-radius: 999px;
  color: var(--text-secondary, #717178);
  background: transparent;
  font: inherit;
  font-size: 13px;
  font-weight: var(--font-weight-semibold, 600);
  cursor: pointer;
}

.payment-switch button.selected {
  color: #fff;
  background: var(--poliland-gold, #cba044);
}

.payment-switch ion-icon {
  font-size: 18px;
}

.info-banner {
  display: flex;
  align-items: flex-start;
  gap: 10px;
  padding: 14px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  color: var(--text-primary, #252525);
  background: var(--surface-muted, #f5f3ee);
}

.info-banner > ion-icon {
  flex: 0 0 auto;
  margin-top: 1px;
  color: var(--poliland-gold-text, #966a12);
  font-size: 21px;
}

.info-banner p {
  margin: 0;
  color: var(--text-secondary, #717178);
  font-size: 13px;
  line-height: 1.6;
}

.info-banner strong {
  color: var(--text-primary, #252525);
}

.tenor-list {
  display: grid;
  gap: 10px;
}

.tenor-option {
  display: grid;
  min-height: 88px;
  grid-template-columns: 54px minmax(0, 1fr) 28px;
  align-items: center;
  gap: 12px;
  padding: 12px 14px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  color: var(--text-primary, #252525);
  background: var(--surface-primary, #fff);
  text-align: left;
  cursor: pointer;
}

.tenor-option-selected {
  border: 2px solid var(--poliland-gold, #cba044);
  background: var(--surface-muted, #f5f3ee);
}

.tenor-circle {
  display: flex;
  width: 54px;
  height: 54px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  color: var(--text-primary, #252525);
  background: var(--surface-muted, #f5f3ee);
}

.tenor-option-selected .tenor-circle {
  color: #fff;
  background: var(--poliland-gold, #cba044);
}

.tenor-circle strong {
  font-size: 16px;
  line-height: 1.1;
}

.tenor-circle small {
  margin-top: 2px;
  font-size: 9px;
}

.tenor-copy {
  display: grid;
  min-width: 0;
  gap: 4px;
}

.tenor-title {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
  color: var(--text-secondary, #717178);
  font-size: 12px;
}

.tenor-copy > strong {
  color: var(--text-primary, #252525);
  font-size: 18px;
  font-weight: var(--font-weight-bold, 700);
}

.tenor-option-selected .tenor-copy > strong {
  color: var(--poliland-gold-text, #966a12);
}

.tenor-copy > strong small {
  color: var(--text-secondary, #717178);
  font-size: 12px;
  font-weight: var(--font-weight-regular, 400);
}

.popular-badge {
  padding: 4px 7px;
  font-size: 9px;
}

.radio-indicator {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
  border: 2px solid var(--border-default, #eae7e0);
  border-radius: 50%;
}

.radio-indicator.checked {
  border-color: var(--poliland-gold, #cba044);
  background: var(--poliland-gold, #cba044);
}

.radio-indicator.checked::after {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: #fff;
  content: '';
}

.cash-info,
.selected-summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 14px;
  padding: 16px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
}

.cash-info {
  justify-content: flex-start;
}

.cash-info-icon {
  display: grid;
  width: 42px;
  height: 42px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  color: var(--poliland-green, #355a2c);
  background: var(--status-success-bg, #eaf7ef);
  font-size: 22px;
}

.cash-info strong,
.selected-summary strong {
  display: block;
  color: var(--text-primary, #252525);
  font-size: 14px;
  font-weight: var(--font-weight-semibold, 600);
}

.cash-info p {
  margin: 4px 0 0;
  color: var(--text-secondary, #717178);
  font-size: 13px;
}

.selected-summary > div {
  display: grid;
  gap: 7px;
}

.selected-summary span {
  color: var(--text-secondary, #717178);
  font-size: 11px;
  font-weight: var(--font-weight-semibold, 600);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.selected-summary .summary-amount {
  text-align: right;
}

.selected-summary .summary-amount strong {
  color: var(--poliland-gold-text, #966a12);
  font-size: 18px;
}

.action-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

.action-row ion-button {
  min-height: 48px;
  margin: 0;
  font-size: 13px;
  font-weight: var(--font-weight-semibold, 600);
  text-transform: none;
  --border-radius: 999px;
}

.survey-button {
  --border-color: var(--border-default, #eae7e0);
  --color: var(--text-secondary, #717178);
}

.apply-button {
  --background: var(--poliland-gold, #cba044);
  --color: #fff;
  --box-shadow: none;
}

.whatsapp-button {
  display: flex;
  min-height: 44px;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 8px 12px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: 999px;
  color: var(--text-primary, #252525);
  background: var(--surface-primary, #fff);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.whatsapp-button ion-icon {
  color: var(--poliland-gold-text, #966a12);
  font-size: 18px;
}

.simulation-page button:focus-visible,
.simulation-page ion-button:focus-visible {
  outline: 3px solid var(--poliland-green, #355a2c);
  outline-offset: 3px;
}

@media (min-width: 700px) {
  .simulation-shell {
    padding-top: 24px;
  }

  .simulation-sheet {
    margin-inline: 0;
    border-bottom: 1px solid var(--border-default, #eae7e0);
    border-radius: var(--radius-panel, 20px);
  }
}

@media (max-width: 360px) {
  .simulation-shell {
    padding-inline: 12px;
  }

  .simulation-sheet {
    margin-inline: -12px;
    padding-inline: 14px;
  }

  .price-card {
    padding: 13px 11px;
  }

  .price-card > strong {
    font-size: 16px;
  }

  .tenor-option {
    grid-template-columns: 48px minmax(0, 1fr) 24px;
    gap: 9px;
    padding-inline: 10px;
  }

  .tenor-circle {
    width: 48px;
    height: 48px;
  }

  .tenor-copy > strong {
    font-size: 16px;
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