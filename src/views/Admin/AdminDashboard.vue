<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
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
import { customerService } from '@/services/marketing/customerService'

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
const buyerDataLoading = ref(true)
const buyerDataError = ref('')
const dashboardCustomers = ref<any[]>([])
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

const buyerStats = computed(() => ({
  prospects: dashboardCustomers.value.filter((customer) => !customer.lot_transactions?.some((transaction: any) => transaction.status === 'Sold') && !(customer.customer_notes?.length ?? 0) && !(customer.customer_interests?.length ?? 0)).length,
  buyers: dashboardCustomers.value.filter((customer) => customer.lot_transactions?.some((transaction: any) => transaction.status === 'Sold')).length,
  followUps: dashboardCustomers.value.filter((customer) => !customer.lot_transactions?.some((transaction: any) => transaction.status === 'Sold') && ((customer.customer_notes?.length ?? 0) > 0 || (customer.customer_interests?.length ?? 0) > 0)).length,
}))

const pendingFinanceTasks = computed(() => dashboardCustomers.value.flatMap((customer) =>
  (customer.payments ?? [])
    .map((payment: any) => {
      const transaction = (customer.lot_transactions ?? []).find((item: any) => item.lot_id === payment.lot_id)
      return {
        id: payment.id,
        customerName: customer.full_name,
        lotCode: transaction?.lots?.lot_number ?? `Lot #${payment.lot_id}`,
        amount: Number(payment.amount ?? 0),
        isOverdue: new Date(payment.payment_date ?? payment.created_at).getTime() < Date.now() - 1000 * 60 * 60 * 24 * 30,
        isSold: transaction?.status === 'Sold',
      }
    })
    .filter((task: any) => !task.isSold),
))

const actionTasks = computed(() => [
  ...pendingFinanceTasks.value.map((task) => ({ ...task, type: 'payment' as const })),
  { id: 'spk-placeholder', customerName: 'Konfirmasi SPK Konsumen', lotCode: '2 berkas pemesanan unit kavling baru', amount: 0, isOverdue: false, isSold: false, type: 'spk' as const },
])

const activityPage = ref(1)
const ACTIVITY_PAGE_SIZE = 4
const selectedActivityDate = ref('')

const recentActivities = computed(() => {
  const activities = dashboardCustomers.value.flatMap((customer) => {
    const customerActivities = [{
      id: `customer-${customer.id}`,
      label: 'Customer baru ditambahkan',
      detail: customer.full_name,
      date: customer.created_at,
      icon: peopleOutline,
      tone: 'green',
      route: `/admin/pembeli/${customer.id}`,
    }]

    const paymentActivities = (customer.payments ?? []).map((payment: any) => ({
      id: `payment-${payment.id}`,
      label: 'Pembayaran diterima',
      detail: `${customer.full_name} · ${formatCurrency(Number(payment.amount ?? 0))}`,
      date: payment.payment_date ?? payment.created_at,
      icon: walletOutline,
      tone: 'gold',
      route: '/admin/keuangan',
    }))

    const transactionActivities = (customer.lot_transactions ?? []).map((transaction: any) => ({
      id: `transaction-${transaction.id}`,
      label: transaction.status === 'Sold' ? 'Kavling terjual' : 'Status kavling diperbarui',
      detail: `${customer.full_name} · ${transaction.lots?.lot_number ?? `Lot #${transaction.lot_id}`}`,
      date: transaction.sold_date ?? transaction.created_at,
      icon: checkmarkCircleOutline,
      tone: transaction.status === 'Sold' ? 'green' : 'gold',
      route: '/admin/keuangan',
    }))

    return [...customerActivities, ...paymentActivities, ...transactionActivities]
  })

  return activities
    .filter((activity) => activity.date)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const filteredActivities = computed(() => {
  if (!selectedActivityDate.value) return recentActivities.value
  return recentActivities.value.filter((activity) => activity.date.slice(0, 10) === selectedActivityDate.value)
})
const filteredActivityTotalPages = computed(() => Math.max(1, Math.ceil(filteredActivities.value.length / ACTIVITY_PAGE_SIZE)))
const pagedActivities = computed(() => filteredActivities.value.slice((activityPage.value - 1) * ACTIVITY_PAGE_SIZE, activityPage.value * ACTIVITY_PAGE_SIZE))

function openActivity(activity: { route: string }) {
  void router.push(activity.route)
}

function resetActivityPage() {
  activityPage.value = 1
}

function openTask(task: any) {
  if (task.type === 'spk') {
    buyerDataError.value = ''
    window.dispatchEvent(new CustomEvent('poliland-dashboard-message', { detail: { message: 'Halaman SPK belum tersedia.' } }))
    return
  }
  void router.push({ path: '/admin/keuangan', query: { status: task.isOverdue ? 'overdue' : 'pending', payment: String(task.id) } })
}

async function goToActivityPage(page: number) {
  activityPage.value = Math.min(Math.max(page, 1), filteredActivityTotalPages.value)
  await nextTick()
  document.querySelector('.activity-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function formatCurrency(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}

function formatActivityDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
}

async function loadBuyerData() {
  buyerDataLoading.value = true
  buyerDataError.value = ''
  try {
    dashboardCustomers.value = await customerService.getAdminCustomers()
  } catch (error) {
    buyerDataError.value = error instanceof Error ? error.message : 'Data customer belum dapat dimuat.'
  } finally {
    buyerDataLoading.value = false
  }
}

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
  void loadBuyerData()
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

          <div v-if="buyerDataLoading" class="dashboard-data-state" role="status">
            <IonSpinner name="crescent" />
            <span>Memuat tugas operasional...</span>
          </div>
          <div v-else-if="actionTasks.length" class="task-list">
            <button v-for="task in actionTasks.slice(0, 5)" :key="task.id" type="button" class="task-item" @click="openTask(task)">
              <span class="empty-symbol"><IonIcon :icon="task.type === 'spk' ? documentTextOutline : (task.isOverdue ? timeOutline : walletOutline)" aria-hidden="true" /></span>
              <span class="task-copy"><strong>{{ task.type === 'spk' ? 'Konfirmasi SPK Konsumen' : (task.isOverdue ? 'Pembayaran terlambat' : 'Verifikasi pembayaran') }}</strong><small>{{ task.type === 'spk' ? task.lotCode : `${task.customerName} · ${task.lotCode} · ${formatCurrency(task.amount)}` }}</small></span>
              <IonIcon :icon="arrowForwardOutline" aria-hidden="true" />
            </button>
            <p v-if="actionTasks.length > 5" class="task-more">+{{ actionTasks.length - 5 }} tugas lainnya</p>
          </div>
          <div v-else class="empty-inline">
            <span class="empty-symbol"><IonIcon :icon="checkmarkCircleOutline" aria-hidden="true" /></span>
            <div><strong>Belum ada daftar tugas</strong><p>Tugas baru akan muncul ketika ada pembayaran atau aktivitas yang perlu ditindaklanjuti.</p></div>
          </div>
        </section>

        <section class="quick-section" aria-labelledby="quick-title">
          <div class="section-heading">
            <div>
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
            <span class="section-meta">{{ dashboardCustomers.length }} customer</span>
          </div>

          <div v-if="buyerDataLoading" class="dashboard-data-state" role="status">
            <IonSpinner name="crescent" />
            <span>Memuat statistik customer...</span>
          </div>
          <div v-else-if="buyerDataError" class="dashboard-data-state dashboard-data-error" role="alert">
            <strong>Statistik belum dapat dimuat</strong>
            <p>{{ buyerDataError }}</p>
          </div>
          <div v-else class="buyer-stat-grid">
            <div class="buyer-stat-card buyer-stat-card--gold"><span>Prospek aktif</span><strong>{{ buyerStats.prospects }}</strong><small>Belum melakukan pembelian</small></div>
            <div class="buyer-stat-card buyer-stat-card--green"><span>Pembeli</span><strong>{{ buyerStats.buyers }}</strong><small>Transaksi terjual</small></div>
            <div class="buyer-stat-card buyer-stat-card--neutral"><span>Tindak lanjut</span><strong>{{ buyerStats.followUps }}</strong><small>Memiliki catatan</small></div>
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
          </div>
          <div class="activity-toolbar">
            <label class="activity-date-filter">
              <span>Pilih tanggal</span>
              <input v-model="selectedActivityDate" type="date" aria-label="Pilih tanggal aktivitas" @change="resetActivityPage" />
            </label>
            <button v-if="selectedActivityDate" type="button" class="activity-clear-date" aria-label="Hapus filter tanggal" @click="selectedActivityDate = ''; resetActivityPage()"><span class="activity-clear-label">Hapus filter tanggal</span><span class="activity-clear-icon" aria-hidden="true">×</span></button>
          </div>

          <div v-if="buyerDataLoading" class="dashboard-data-state" role="status">
            <IonSpinner name="crescent" />
            <span>Memuat aktivitas...</span>
          </div>
          <div v-else-if="buyerDataError" class="dashboard-data-state dashboard-data-error" role="alert">
            <strong>Aktivitas belum dapat dimuat</strong>
            <p>{{ buyerDataError }}</p>
          </div>
          <div v-else-if="filteredActivities.length" class="activity-list">
            <button v-for="activity in pagedActivities" :key="activity.id" type="button" class="activity-item" @click="openActivity(activity)">
              <span class="activity-icon" :class="`activity-icon--${activity.tone}`"><IonIcon :icon="activity.icon" aria-hidden="true" /></span>
              <div class="activity-copy"><strong>{{ activity.label }}</strong><p>{{ activity.detail }}</p></div>
              <time :datetime="activity.date">{{ formatActivityDate(activity.date) }}</time>
            </button>
            <nav v-if="filteredActivityTotalPages > 1" class="activity-pager" aria-label="Halaman aktivitas terkini">
              <button type="button" aria-label="Aktivitas sebelumnya" :disabled="activityPage === 1" @click="goToActivityPage(activityPage - 1)">‹</button>
              <span>Halaman {{ activityPage }} dari {{ filteredActivityTotalPages }}</span>
              <button type="button" aria-label="Aktivitas berikutnya" :disabled="activityPage === filteredActivityTotalPages" @click="goToActivityPage(activityPage + 1)">›</button>
            </nav>
          </div>
          <div v-else class="dashboard-data-state">
            <img
              class="activity-empty-mascot"
              src="@/assets/mascot/Cheerful House Mascot Desk Scene.png"
              alt="Mascot rumah sedang duduk di meja"
            />
            <strong>{{ selectedActivityDate ? 'Tidak ada aktivitas pada tanggal ini' : 'Belum ada aktivitas' }}</strong>
            <p>{{ selectedActivityDate ? 'Pilih tanggal lain untuk melihat aktivitas.' : 'Aktivitas customer dan pembayaran akan muncul di sini.' }}</p>
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

.task-list { display: grid; gap: 8px; }
.task-item { display: grid; grid-template-columns: 34px minmax(0, 1fr) 18px; align-items: center; gap: 10px; width: 100%; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; text-align: left; cursor: pointer; }
.task-item:hover { border-color: var(--poliland-green); background: var(--surface-muted); }
.task-item:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.task-item > ion-icon { color: var(--text-secondary); }
.task-copy { min-width: 0; }.task-copy strong, .task-copy small { display: block; }.task-copy strong { font-size: 12px; }.task-copy small { margin-top: 3px; overflow: hidden; color: var(--text-secondary); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.task-more { margin: 2px 0 0; color: var(--text-secondary); font-size: 11px; text-align: center; }

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

.dashboard-data-state {
  display: flex;
  min-height: 92px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  padding: 16px;
  border-radius: var(--radius-control);
  background: var(--surface-muted);
  color: var(--text-secondary);
  font-size: 12px;
  text-align: center;
}

.dashboard-data-state ion-spinner { color: var(--poliland-green); }
.dashboard-data-state strong { color: var(--text-primary); font-size: 13px; }
.dashboard-data-state p { margin: 0; color: var(--text-secondary); font-size: 11px; line-height: 1.45; }
.dashboard-data-error strong { color: var(--status-danger); }

.buyer-stat-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; }
.buyer-stat-card { min-width: 0; padding: 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-muted); }
.buyer-stat-card span, .buyer-stat-card small { display: block; color: var(--text-secondary); font-size: 10px; line-height: 1.35; }
.buyer-stat-card strong { display: block; margin: 7px 0 3px; color: var(--text-primary); font-size: 25px; line-height: 1; }
.buyer-stat-card--gold strong { color: var(--poliland-gold-text); }.buyer-stat-card--green strong { color: var(--poliland-green); }.buyer-stat-card--neutral strong { color: var(--text-primary); }

.activity-list { display: grid; gap: 0; }
.activity-item { display: grid; grid-template-columns: 34px minmax(0, 1fr) auto; align-items: center; gap: 10px; padding: 11px 2px; border-bottom: 1px solid var(--border-default); }
.activity-item:last-child { border-bottom: 0; }
.activity-icon { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 10px; background: var(--surface-muted); color: var(--text-secondary); }.activity-icon ion-icon { width: 17px; height: 17px; }.activity-icon--green { background: var(--status-success-bg); color: var(--poliland-green); }.activity-icon--gold { background: var(--poliland-gold-soft); color: var(--poliland-gold-text); }
.activity-copy { min-width: 0; }.activity-copy strong { display: block; color: var(--text-primary); font-size: 12px; }.activity-copy p { margin: 3px 0 0; overflow: hidden; color: var(--text-secondary); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.activity-item time { color: var(--text-secondary); font-size: 10px; white-space: nowrap; }
.activity-item { border-inline: 0; border-top: 0; border-right: 0; border-left: 0; cursor: pointer; font: inherit; text-align: left; }.activity-item:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }.activity-toolbar { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin: 0 0 10px; padding: 10px 0; border-top: 1px solid var(--border-default); border-bottom: 1px solid var(--border-default); }.activity-date-filter { display: flex; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 11px; font-weight: var(--font-weight-semibold); }.activity-date-filter input { min-height: 36px; padding: 0 9px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 11px; }.activity-date-filter input:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }.activity-clear-date { min-height: 36px; padding: 0 9px; border: 0; border-radius: var(--radius-control); background: var(--surface-muted); color: var(--poliland-green); font: inherit; font-size: 11px; font-weight: var(--font-weight-semibold); cursor: pointer; }.activity-clear-date:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; clip-path: inset(50%); }
.activity-pager { display: flex; align-items: center; justify-content: center; gap: 10px; margin-top: 10px; padding-top: 10px; border-top: 1px solid var(--border-default); color: var(--text-secondary); font-size: 11px; }.activity-pager button { display: grid; width: 32px; height: 32px; place-items: center; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font-size: 20px; cursor: pointer; }.activity-pager button:disabled { opacity: .45; cursor: default; }.activity-pager button:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }

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

  .buyer-stat-card { padding: 9px 7px; }
  .buyer-stat-card strong { font-size: 21px; }
  .buyer-stat-card span, .buyer-stat-card small { font-size: 9px; }
  .activity-item { grid-template-columns: 30px minmax(0, 1fr); }
  .activity-item time { grid-column: 2; }
  .activity-toolbar { align-items: stretch; flex-direction: column; gap: 8px; }
  .activity-date-filter { justify-content: space-between; }
  .activity-date-filter input { flex: 1; min-width: 0; }
  .activity-clear-date { display: inline-grid; width: 38px; min-width: 38px; height: 36px; padding: 0; place-items: center; }
  .activity-clear-label { display: none; }
  .activity-clear-icon { display: block; font-size: 20px; line-height: 1; }
}

@media (max-width: 520px) {
  .activity-clear-date { display: inline-grid; width: 38px; min-width: 38px; height: 36px; padding: 0; place-items: center; }
  .activity-clear-label { display: none; }
  .activity-clear-icon { display: block; font-size: 20px; line-height: 1; }
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
