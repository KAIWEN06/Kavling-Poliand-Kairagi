<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonContent,
  IonIcon,
  IonPage,
  IonSpinner,
} from '@ionic/vue'
import {
  checkmarkCircleOutline,
  documentTextOutline,
  gridOutline,
  peopleOutline,
  refreshOutline,
  settingsOutline,
  walletOutline,
  timeOutline,
  mapOutline,
  logOutOutline,
  arrowForwardOutline,
} from 'ionicons/icons'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import { getLots, type SiteplanLot } from '@/services/siteplanService'
import { normalizeLotStatus } from '@/utils/siteplan'
import { authService } from '@/services/auth/authService'

type LoadState = 'loading' | 'success' | 'empty' | 'error'
type InventoryStatus = {
  key: 'available' | 'booking' | 'sold'
  label: string
  value: number
  percentage: number
}

type QuickAction = {
  label: string
  description: string
  icon: string
  tone: 'green' | 'gold' | 'neutral'
  routeName?: string
}

const router = useRouter()
const lots = ref<SiteplanLot[]>([])
const loadState = ref<LoadState>('loading')
const loadError = ref('')
const loggingOut = ref(false)
const refreshing = ref(false)
let requestSequence = 0
let isUnmounted = false

const today = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date())

const totalUnits = computed(() => lots.value.length)

const inventory = computed<InventoryStatus[]>(() => {
  const counts = lots.value.reduce(
    (result, lot) => {
      const status = normalizeLotStatus(lot.status)
      if (status === 'available' || status === 'booking' || status === 'sold') {
        result[status] += 1
      }
      return result
    },
    { available: 0, booking: 0, sold: 0 },
  )

  const items: InventoryStatus[] = [
    { key: 'available', label: 'Tersedia', value: counts.available, percentage: 0 },
    { key: 'booking', label: 'Dipesan', value: counts.booking, percentage: 0 },
    { key: 'sold', label: 'Terjual', value: counts.sold, percentage: 0 },
  ]

  if (totalUnits.value === 0) return items

  return items.map((item) => ({
    ...item,
    percentage: Number(((item.value / totalUnits.value) * 100).toFixed(1)),
  }))
})

const quickActions: QuickAction[] = [
  {
    label: 'Siteplan 2D',
    description: 'Lihat dan kelola kavling',
    icon: mapOutline,
    tone: 'green',
    routeName: 'AdminKavling',
  },
  {
    label: 'Tambah client',
    description: 'Daftarkan calon pembeli',
    icon: peopleOutline,
    tone: 'neutral',
    routeName: 'AdminPembeli',
  },
  {
    label: 'Pembayaran',
    description: 'Periksa transaksi masuk',
    icon: walletOutline,
    tone: 'gold',
    routeName: 'AdminKeuangan',
  },
  {
    label: 'Kelola konten',
    description: 'Perbarui informasi website',
    icon: gridOutline,
    tone: 'neutral',
    routeName: 'AdminLainnya',
  },
  {
    label: 'Akses tim',
    description: 'Kelola akun dan peran',
    icon: settingsOutline,
    tone: 'green',
    routeName: 'AdminLainnya',
  },
  {
    label: 'SPK',
    description: 'Kelola surat pemesanan',
    icon: documentTextOutline,
    tone: 'gold',
    routeName: 'AdminSPK',
  },
]

const availableQuickActions = computed(() =>
  quickActions.map((action) => ({
    ...action,
    available: action.routeName
      ? router.getRoutes().some((route) => route.name === action.routeName)
      : false,
  })),
)

const inventoryDescription = computed(() => {
  const [available, booking, sold] = inventory.value
  return `Total ${totalUnits.value} unit: ${available.value} tersedia, ${booking.value} dipesan, dan ${sold.value} terjual.`
})

async function loadInventory(forceRefresh = false) {
  const requestId = ++requestSequence
  const hasExistingData = lots.value.length > 0
  loadError.value = ''

  if (forceRefresh && hasExistingData) {
    refreshing.value = true
  } else {
    loadState.value = 'loading'
  }

  try {
    const records = await getLots({ forceRefresh })
    if (isUnmounted || requestId !== requestSequence) return

    lots.value = records
    loadState.value = records.length === 0 ? 'empty' : 'success'
  } catch (error) {
    if (isUnmounted || requestId !== requestSequence) return

    if (hasExistingData) {
      loadError.value =
        error instanceof Error ? error.message : 'Data inventaris gagal diperbarui.'
      loadState.value = 'success'
    } else {
      loadState.value = 'error'
      loadError.value =
        error instanceof Error ? error.message : 'Data inventaris tidak dapat dimuat.'
    }
  } finally {
    if (!isUnmounted && requestId === requestSequence) {
      refreshing.value = false
    }
  }
}

function openQuickAction(action: QuickAction) {
  if (!action.routeName) return

  const target = router.getRoutes().find((route) => route.name === action.routeName)
  if (!target) return

  void router.push({ name: action.routeName })
}

async function logout() {
  if (loggingOut.value) return

  loggingOut.value = true
  try {
    await authService.logout()
    await router.replace('/login')
  } finally {
    loggingOut.value = false
  }
}

onMounted(() => {
  void loadInventory()
})

onBeforeUnmount(() => {
  isUnmounted = true
  requestSequence += 1
})
</script>

<template>
  <ion-page>
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />

    <ion-content class="dashboard-content" :fullscreen="false">
      <main class="dashboard-shell">
        <section class="welcome-row" aria-labelledby="dashboard-title">
          <div class="welcome-copy">
            <p class="eyebrow">BERANDA ADMIN</p>
            <h1 id="dashboard-title">Selamat datang, Admin</h1>
            <p>{{ today }}</p>
          </div>

          <button
            type="button"
            class="icon-action logout-action"
            :disabled="loggingOut"
            :aria-label="loggingOut ? 'Sedang keluar' : 'Keluar dari akun'"
            @click="logout"
          >
            <IonIcon :icon="logOutOutline" aria-hidden="true" />
          </button>
        </section>

        <section class="inventory-section" aria-labelledby="inventory-title">
          <div class="section-heading inventory-heading">
            <div class="heading-title">
              <span class="heading-icon green-icon">
                <IonIcon :icon="gridOutline" aria-hidden="true" />
              </span>
              <div>
                <h2 id="inventory-title">Inventaris Kavling</h2>
                <p>Ringkasan status seluruh unit</p>
              </div>
            </div>

            <button
              v-if="loadState === 'success' || loadState === 'empty'"
              type="button"
              class="text-action"
              :disabled="refreshing"
              @click="loadInventory(true)"
            >
              <IonIcon :icon="refreshOutline" aria-hidden="true" />
              <span>{{ refreshing ? 'Memuat' : 'Perbarui' }}</span>
            </button>
          </div>

          <div v-if="loadState === 'loading'" class="state-panel" role="status" aria-live="polite">
            <IonSpinner name="crescent" />
            <div>
              <strong>Memuat inventaris</strong>
              <p>Data kavling sedang diambil dari database.</p>
            </div>
          </div>

          <div v-else-if="loadState === 'error'" class="state-panel state-error" role="alert">
            <div>
              <strong>Inventaris belum dapat dimuat</strong>
              <p>{{ loadError }}</p>
            </div>
            <button class="button-primary" type="button" @click="loadInventory(true)">
              Coba lagi
            </button>
          </div>

          <div v-else-if="loadState === 'empty'" class="state-panel">
            <div>
              <strong>Belum ada kavling terdaftar</strong>
              <p>Data akan muncul setelah kavling ditambahkan.</p>
            </div>
          </div>

          <template v-else>
            <div class="inventory-overview">
              <div class="total-block">
                <span>Total unit</span>
                <strong>{{ totalUnits.toLocaleString('id-ID') }}</strong>
                <small>Kavling terdaftar</small>
              </div>

              <div class="status-breakdown">
                <div
                  v-for="item in inventory"
                  :key="item.key"
                  class="status-item"
                  :class="`status-${item.key}`"
                >
                  <div class="status-label">
                    <span class="status-dot" aria-hidden="true"></span>
                    <span>{{ item.label }}</span>
                  </div>
                  <strong>{{ item.value.toLocaleString('id-ID') }}</strong>
                  <small>{{ item.percentage.toLocaleString('id-ID') }}%</small>
                </div>
              </div>
            </div>

            <div class="inventory-bar" role="img" :aria-label="inventoryDescription">
              <span
                v-for="item in inventory"
                :key="item.key"
                v-show="item.percentage > 0"
                :class="`bar-${item.key}`"
                :style="{ width: `${item.percentage}%` }"
              ></span>
            </div>
          </template>

          <p v-if="loadError && loadState === 'success'" class="inline-warning" role="status">
            Data terakhir tetap ditampilkan. Pembaruan terbaru gagal dimuat.
          </p>
        </section>

        <section class="tasks-section" aria-labelledby="tasks-title">
          <div class="section-heading">
            <div class="heading-title">
              <span class="heading-icon gold-icon">
                <IonIcon :icon="timeOutline" aria-hidden="true" />
              </span>
              <div>
                <h2 id="tasks-title">Perlu Ditindaklanjuti</h2>
                <p>Tugas operasional admin</p>
              </div>
            </div>
          </div>

          <div class="empty-inline">
            <span class="empty-symbol"><IonIcon :icon="checkmarkCircleOutline" /></span>
            <div>
              <strong>Belum ada daftar tugas</strong>
              <p>Tugas verifikasi pembayaran dan SPK akan tampil setelah sumber datanya dihubungkan.</p>
            </div>
          </div>
        </section>

        <section class="quick-section" aria-labelledby="quick-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">NAVIGASI</p>
              <h2 id="quick-title">Aksi Cepat</h2>
            </div>
          </div>

          <div class="quick-grid">
            <button
              v-for="action in availableQuickActions"
              :key="action.label"
              type="button"
              class="quick-action"
              :class="[`quick-${action.tone}`, { 'quick-unavailable': !action.available }]"
              :disabled="!action.available"
              :title="action.available ? action.description : 'Rute halaman belum tersedia di router'"
              @click="openQuickAction(action)"
            >
              <span class="quick-icon">
                <IonIcon :icon="action.icon" aria-hidden="true" />
              </span>
              <span class="quick-label">{{ action.label }}</span>
              <small v-if="!action.available">Belum tersedia</small>
            </button>
          </div>
        </section>

        <section class="buyers-section" aria-labelledby="buyers-title">
          <div class="section-heading">
            <div class="heading-title">
              <span class="heading-icon green-icon">
                <IonIcon :icon="peopleOutline" aria-hidden="true" />
              </span>
              <div>
                <h2 id="buyers-title">Statistik Calon Pembeli</h2>
                <p>Ringkasan aktivitas marketing</p>
              </div>
            </div>
            <span class="section-meta">Data belum terhubung</span>
          </div>

          <div class="unavailable-panel">
            <strong>Statistik belum tersedia</strong>
            <p>
              Prospek aktif, tindak lanjut, dan closing akan ditampilkan setelah data calon
              pembeli terhubung ke dashboard.
            </p>
          </div>
        </section>

        <section class="activity-section" aria-labelledby="activity-title">
          <div class="section-heading">
            <div class="heading-title">
              <span class="heading-icon gold-icon">
                <IonIcon :icon="timeOutline" aria-hidden="true" />
              </span>
              <div>
                <h2 id="activity-title">Aktivitas Terkini</h2>
                <p>Riwayat perubahan dan transaksi</p>
              </div>
            </div>
            <span class="section-meta">Belum terhubung</span>
          </div>

          <div class="unavailable-panel activity-empty">
            <strong>Belum ada aktivitas untuk ditampilkan</strong>
            <p>Aktivitas akan muncul setelah audit log atau sumber riwayat diintegrasikan.</p>
          </div>
        </section>
      </main>
    </ion-content>

    <MobileTabBar variant="admin" />
  </ion-page>
</template>

<style scoped>
.dashboard-content {
  --background: var(--app-background);
}

.dashboard-shell {
  width: min(100%, 1120px);
  min-height: 100%;
  margin-inline: auto;
  padding: 22px 18px calc(112px + env(safe-area-inset-bottom));
  color: var(--text-primary);
  font-family: var(--font-primary);
}

.welcome-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 24px;
}

.welcome-copy {
  min-width: 0;
}

.eyebrow {
  margin: 0 0 6px;
  color: var(--poliland-green);
  font-size: 10px;
  font-weight: var(--font-weight-extrabold);
  letter-spacing: 0.12em;
  line-height: 1.4;
}

.welcome-copy h1 {
  margin: 0;
  color: var(--text-primary);
  font-size: clamp(21px, 5vw, 28px);
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.04em;
  line-height: 1.2;
}

.welcome-copy > p:last-child {
  margin: 6px 0 0;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  text-transform: capitalize;
}

.icon-action {
  width: 44px;
  height: 44px;
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  border: 1px solid var(--border-default);
  border-radius: 50%;
  background: var(--surface-primary);
  color: var(--text-primary);
  cursor: pointer;
}

.icon-action ion-icon {
  width: 19px;
  height: 19px;
}

.icon-action:focus-visible,
.text-action:focus-visible,
.quick-action:focus-visible,
.button-primary:focus-visible {
  outline: 3px solid var(--poliland-green);
  outline-offset: 3px;
}

.icon-action:disabled {
  cursor: wait;
  opacity: 0.55;
}

.inventory-section,
.buyers-section,
.activity-section {
  margin-bottom: 25px;
}

.inventory-section {
  padding: 18px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  background: var(--surface-primary);
}

.section-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 15px;
}

.heading-title {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.heading-title h2,
.section-heading > div > h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 16px;
  font-weight: var(--font-weight-bold);
  letter-spacing: -0.025em;
  line-height: 1.3;
}

.heading-title p {
  margin: 3px 0 0;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.4;
}

.heading-icon {
  width: 34px;
  height: 34px;
  display: inline-grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  background: var(--surface-muted);
}

.heading-icon ion-icon {
  width: 19px;
  height: 19px;
}

.green-icon {
  color: var(--poliland-green);
}

.gold-icon {
  color: var(--poliland-gold-text);
}

.text-action {
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 0 2px 0 8px;
  border: 0;
  background: transparent;
  color: var(--poliland-green);
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
  cursor: pointer;
}

.text-action ion-icon {
  width: 16px;
  height: 16px;
}

.text-action:disabled {
  opacity: 0.55;
  cursor: wait;
}

.inventory-overview {
  display: grid;
  grid-template-columns: minmax(90px, 0.78fr) minmax(0, 2fr);
  align-items: center;
  gap: 16px;
  padding: 15px 0 14px;
  border-top: 1px solid var(--border-default);
}

.total-block {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding-right: 14px;
  border-right: 1px solid var(--border-default);
}

.total-block span,
.total-block small {
  color: var(--text-secondary);
  font-size: 11px;
}

.total-block strong {
  margin: 3px 0 1px;
  color: var(--text-primary);
  font-size: clamp(42px, 12vw, 58px);
  font-weight: var(--font-weight-bold);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.065em;
  line-height: 0.98;
}

.status-breakdown {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.status-item {
  min-width: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  padding-inline: 5px;
  text-align: center;
}

.status-item + .status-item {
  border-left: 1px solid var(--border-default);
}

.status-label {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 5px;
  color: var(--text-secondary);
  font-size: 10px;
  white-space: nowrap;
}

.status-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 auto;
  border-radius: 50%;
}

.status-available .status-dot,
.bar-available {
  background: var(--status-success);
}

.status-booking .status-dot,
.bar-booking {
  background: var(--poliland-gold);
}

.status-sold .status-dot,
.bar-sold {
  background: var(--status-danger);
}

.status-item strong {
  color: var(--text-primary);
  font-size: clamp(21px, 6vw, 27px);
  font-weight: var(--font-weight-bold);
  font-variant-numeric: tabular-nums;
  letter-spacing: -0.04em;
  line-height: 1.1;
}

.status-item small {
  color: var(--text-secondary);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.inventory-bar {
  height: 9px;
  display: flex;
  gap: 2px;
  overflow: hidden;
  border-radius: 999px;
  background: var(--surface-muted);
}

.inventory-bar span {
  min-width: 2px;
  height: 100%;
  transition: width 180ms ease;
}

.state-panel {
  min-height: 150px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  color: var(--text-primary);
}

.state-panel ion-spinner {
  color: var(--poliland-green);
}

.state-panel strong,
.empty-inline strong,
.unavailable-panel strong {
  display: block;
  font-size: var(--font-size-sm);
  font-weight: var(--font-weight-semibold);
}

.state-panel p,
.empty-inline p,
.unavailable-panel p {
  margin: 4px 0 0;
  color: var(--text-secondary);
  font-size: var(--font-size-xs);
  line-height: 1.55;
}

.state-error {
  flex-wrap: wrap;
  text-align: center;
}

.state-error strong {
  color: var(--status-danger);
}

.button-primary {
  min-height: 42px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--poliland-green);
  color: #fff;
  font: inherit;
  font-size: var(--font-size-xs);
  font-weight: var(--font-weight-semibold);
}

.inline-warning {
  margin: 12px 0 0;
  color: var(--text-secondary);
  font-size: 11px;
  line-height: 1.45;
}

.tasks-section {
  margin-bottom: 26px;
}

.tasks-section > .section-heading {
  margin-bottom: 10px;
}

.empty-inline {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 14px 15px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  background: var(--surface-primary);
}

.empty-symbol {
  width: 34px;
  height: 34px;
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 50%;
  background: var(--surface-muted);
  color: var(--poliland-green);
}

.empty-symbol ion-icon {
  width: 18px;
  height: 18px;
}

.quick-section {
  margin-bottom: 27px;
}

.quick-section .section-heading {
  align-items: flex-end;
  margin-bottom: 12px;
}

.quick-section .eyebrow {
  margin-bottom: 3px;
}

.section-meta {
  flex: 0 0 auto;
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.4;
}

.quick-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 9px;
}

.quick-action {
  min-width: 0;
  min-height: 112px;
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  justify-content: space-between;
  gap: 9px;
  padding: 13px 12px 11px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  background: var(--surface-primary);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
  transition: border-color 150ms ease, background-color 150ms ease;
}

.quick-action:not(:disabled):hover {
  border-color: var(--poliland-green);
  background: var(--surface-muted);
}

.quick-action:disabled {
  cursor: not-allowed;
  opacity: 0.72;
}

.quick-icon {
  width: 36px;
  height: 36px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: var(--surface-muted);
  color: var(--poliland-green);
}

.quick-icon ion-icon {
  width: 21px;
  height: 21px;
}

.quick-gold .quick-icon {
  color: var(--poliland-gold-text);
}

.quick-neutral .quick-icon {
  color: var(--text-secondary);
}

.quick-label {
  font-size: 12px;
  font-weight: var(--font-weight-semibold);
  line-height: 1.3;
}

.quick-action small {
  color: var(--text-secondary);
  font-size: 9px;
  line-height: 1.2;
}

.buyers-section,
.activity-section {
  padding: 16px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  background: var(--surface-primary);
}

.buyers-section .section-heading,
.activity-section .section-heading {
  margin-bottom: 12px;
}

.unavailable-panel {
  padding: 15px;
  border-radius: var(--radius-control);
  background: var(--surface-muted);
}

.activity-empty {
  background: transparent;
  border-top: 1px solid var(--border-default);
  border-radius: 0;
  padding: 17px 2px 3px;
}

.dashboard-footer {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 3px 2px 0;
  color: var(--text-secondary);
  font-size: 10px;
}

@media (min-width: 700px) {
  .dashboard-shell {
    padding: 30px 28px 120px;
  }

  .welcome-row {
    margin-bottom: 32px;
  }

  .inventory-section {
    padding: 22px 24px;
  }

  .quick-grid {
    grid-template-columns: repeat(6, minmax(0, 1fr));
  }

  .quick-action {
    min-height: 126px;
  }

  .buyers-section,
  .activity-section {
    padding: 20px 22px;
  }
}

@media (max-width: 360px) {
  .dashboard-shell {
    padding-inline: 13px;
  }

  .inventory-section {
    padding: 14px 12px;
  }

  .inventory-overview {
    grid-template-columns: minmax(75px, 0.7fr) minmax(0, 2fr);
    gap: 10px;
  }

  .total-block {
    padding-right: 9px;
  }

  .status-label {
    gap: 3px;
    font-size: 9px;
  }

  .status-item {
    padding-inline: 2px;
  }

  .quick-grid {
    gap: 7px;
  }

  .quick-action {
    min-height: 104px;
    padding: 11px 9px;
  }
}

@media (prefers-reduced-motion: reduce) {
  *,
  *::before,
  *::after {
    transition-duration: 0.01ms !important;
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
</style>
