<script setup lang="ts">
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import AppNotice from '@/components/ui/AppNotice.vue'
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import { usePagination } from '@/composables/usePagination'
import { useRouter } from 'vue-router'
import {
  IonContent,
  IonIcon,
  IonPage,
  onIonViewWillEnter,
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
import SurveyAgendaCard from '@/components/common/SurveyAgendaCard.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Reveal from '@/components/ui/Reveal.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import StatCard from '@/components/ui/StatCard.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { getLots, type SiteplanLot } from '@/services/siteplanService'
import { normalizeLotStatus } from '@/utils/siteplan'
import { authService } from '@/services/auth/authService'
import { customerService } from '@/services/marketing/customerService'
import { getAdminSPKRequests, type AdminSPKRequest } from '@/services/Admin/spkAdminService'
import { loadPaymentInstallmentInfo, type PaymentInstallmentInfo } from '@/services/Finance/paymentInstallmentInfo'
import { formatInstallmentRange } from '@/utils/installmentFormat'

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
const pendingSpks = ref<AdminSPKRequest[]>([])
const spkError = ref('')
const installmentInfo = ref(new Map<number, PaymentInstallmentInfo>())
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
    label: 'Denah 2D',
    description: 'Lihat dan kelola kaveling',
    icon: mapOutline,
    tone: 'green',
    routeName: 'AdminKavling',
  },
  {
    label: 'Tambah klien',
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
    description: 'Perbarui informasi situs web',
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

type ActionTask = {
  id: string
  type: 'payment' | 'spk'
  title: string
  detail: string
  customerName: string
  isLate: boolean
  targetId: number
}

const LATE_AFTER_MS = 1000 * 60 * 60 * 24 * 30

const pendingPayments = computed(() => dashboardCustomers.value.flatMap((customer) =>
  (customer.payments ?? [])
    .filter((payment: any) => payment.status === 'Pending')
    .map((payment: any) => ({ customer, payment })),
))

function paymentTaskTitle(payment: any) {
  switch (payment.payment_category) {
    case 'Booking':
      return 'Verifikasi tanda jadi SPK'
    case 'Down Payment':
      return 'Verifikasi uang muka'
    case 'Installment': {
      const info = installmentInfo.value.get(Number(payment.id))
      const range = info ? formatInstallmentRange(info.numbers, info.total) : ''
      return range ? `Verifikasi ${range.charAt(0).toLowerCase()}${range.slice(1)}` : 'Verifikasi cicilan'
    }
    case 'Cash Purchase':
      return 'Verifikasi pelunasan tunai'
    default:
      return 'Verifikasi pembayaran lainnya'
  }
}

function lotLabel(customer: any, payment: any) {
  const lot = Array.isArray(payment.lots) ? payment.lots[0] : payment.lots
  const transaction = (customer.lot_transactions ?? []).find((item: any) => item.lot_id === payment.lot_id)
  const number = lot?.lot_number ?? transaction?.lots?.lot_number
  return number ? `Kaveling ${number}` : 'Kaveling belum tercatat'
}

const actionTasks = computed<ActionTask[]>(() => [
  ...pendingPayments.value.map(({ customer, payment }) => ({
    id: `payment-${payment.id}`,
    type: 'payment' as const,
    title: paymentTaskTitle(payment),
    detail: `${formatCurrency(Number(payment.amount ?? 0))} · ${lotLabel(customer, payment)}`,
    customerName: customer.full_name,
    isLate: new Date(payment.created_at ?? payment.payment_date).getTime() < Date.now() - LATE_AFTER_MS,
    targetId: Number(payment.id),
  })),
  ...pendingSpks.value.map((spk) => ({
    id: `spk-${spk.id}`,
    type: 'spk' as const,
    title: 'Proses pengajuan SPK',
    detail: `Kaveling ${spk.lot_number} · ${spk.spk_number}`,
    customerName: spk.customer_full_name,
    isLate: false,
    targetId: spk.id,
  })),
])
const taskPager = usePagination(actionTasks, { pageSize: 5 })

const selectedActivityDate = ref('')

const recentActivities = computed(() => {
  const activities = dashboardCustomers.value.flatMap((customer) => {
    const customerActivities = [{
      id: `customer-${customer.id}`,
      label: 'Pelanggan baru ditambahkan',
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
      label: transaction.status === 'Sold' ? 'Kaveling terjual' : 'Status kaveling diperbarui',
      detail: `${customer.full_name} · ${transaction.lots?.lot_number ?? `Kavling #${transaction.lot_id}`}`,
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
const activityPager = usePagination(filteredActivities, { pageSize: 4, resetOn: selectedActivityDate })

function openActivity(activity: { route: string }) {
  void router.push(activity.route)
}

function openTask(task: ActionTask) {
  // nt memicu halaman tujuan yang masih tersimpan di tumpukan Ionic untuk membuka ulang targetnya.
  const nt = String(Date.now())
  if (task.type === 'spk') {
    void router.push({ path: '/admin/spk', query: { spkId: String(task.targetId), nt } })
    return
  }
  void router.push({ path: '/admin/keuangan', query: { tab: 'verification', status: 'pending', paymentId: String(task.targetId), nt } })
}

function formatCurrency(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}

function formatActivityDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
}

async function loadBuyerData(silent = false) {
  if (!silent) buyerDataLoading.value = true
  if (!silent) {
    buyerDataError.value = ''
    spkError.value = ''
  }
  try {
    const [customers] = await Promise.all([
      customerService.getAdminCustomers(),
      loadPendingSpks(),
    ])
    dashboardCustomers.value = customers
    buyerDataError.value = ''
    installmentInfo.value = await loadPaymentInstallmentInfo(
      pendingPayments.value
        .filter(({ payment }) => payment.payment_category === 'Installment')
        .map(({ payment }) => Number(payment.id)),
    )
  } catch (error) {
    if (!silent) buyerDataError.value = error instanceof Error ? error.message : 'Data pembeli belum dapat dimuat.'
  } finally {
    buyerDataLoading.value = false
  }
}

async function loadPendingSpks() {
  try {
    const requests = await getAdminSPKRequests()
    pendingSpks.value = requests.filter((spk) => spk.status === 'Submitted' || spk.status === 'Under Review')
    spkError.value = ''
  } catch (error) {
    spkError.value = error instanceof Error ? error.message : 'Pengajuan SPK belum dapat dimuat.'
  }
}

async function loadInventory(forceRefresh = false, { silent = false }: LoadOptions = {}) {
  const requestId = ++requestSequence
  const hasExistingData = lots.value.length > 0
  if (!silent) loadError.value = ''

  if (silent && hasExistingData) {
    // Pembaruan otomatis: tampilan lama tetap ada sampai data baru tiba.
  } else if (forceRefresh && hasExistingData) {
    refreshing.value = true
  } else {
    loadState.value = 'loading'
  }

  try {
    const records = await getLots({ forceRefresh })
    if (isUnmounted || requestId !== requestSequence) return

    lots.value = records
    loadError.value = ''
    loadState.value = records.length === 0 ? 'empty' : 'success'
  } catch (error) {
    if (isUnmounted || requestId !== requestSequence) return

    if (silent && hasExistingData) return

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

// Tugas yang sudah diselesaikan di halaman lain hilang saat admin kembali ke sini.
onIonViewWillEnter(() => {
  if (!buyerDataLoading.value) void loadBuyerData(true)
})

onBeforeUnmount(() => {
  isUnmounted = true
  requestSequence += 1
})

useRealtimeRefresh(
  [
    'lots', 'blocks', 'lot_transactions', 'spk_requests', 'customers', 'payments',
    'installment_schedules', 'survey_requests', 'purchase_cancellation_requests',
  ],
  () => Promise.all([loadInventory(true, { silent: true }), loadBuyerData(true)]),
)

</script>

<template>
  <ion-page>
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />

    <ion-content class="dashboard-content" :fullscreen="false">
      <main class="dash">
        <Reveal :order="0">
          <PageHeader title="Selamat datang, Admin" :subtitle="today">
            <template #actions>
              <button
                type="button"
                class="icon-btn"
                :disabled="loggingOut"
                :aria-label="loggingOut ? 'Sedang keluar' : 'Keluar dari akun'"
                @click="logout"
              >
                <IonIcon :icon="logOutOutline" aria-hidden="true" />
              </button>
            </template>
          </PageHeader>
        </Reveal>

        <SurveyAgendaCard variant="admin" />

        <div class="dash__grid">
          <!-- INVENTARIS -->
          <Reveal :order="1" class="area-inv">
            <section aria-labelledby="inventory-title">
              <template v-if="loadState === 'success'">
                <div class="inv">
                  <div class="inv__head">
                    <h2 id="inventory-title" class="inv__title">Inventaris kaveling</h2>
                  </div>

                  <div class="inv__body">
                    <div class="inv__total">
                      <strong class="inv__number t-figure">{{ totalUnits.toLocaleString('id-ID') }}</strong>
                      <span class="inv__caption">unit kaveling terdaftar</span>
                    </div>

                    <ul class="inv__list">
                      <li v-for="item in inventory" :key="item.key" class="inv__row" :class="`inv__row--${item.key}`">
                        <span class="inv__dot" aria-hidden="true"></span>
                        <span class="inv__label">{{ item.label }}</span>
                        <strong class="inv__value t-num">{{ item.value.toLocaleString('id-ID') }}</strong>
                        <span class="inv__pct t-num">{{ item.percentage.toLocaleString('id-ID') }}%</span>
                      </li>
                    </ul>
                  </div>

                  <div class="inv__bar" role="img" :aria-label="inventoryDescription">
                    <span
                      v-for="item in inventory"
                      :key="item.key"
                      v-show="item.percentage > 0"
                      :class="`inv__seg inv__seg--${item.key}`"
                      :style="{ width: `${item.percentage}%` }"
                    ></span>
                  </div>

                  <p v-if="loadError" class="inv__warn" role="status">
                    Data terakhir tetap ditampilkan. Pembaruan terbaru gagal dimuat.
                  </p>
                </div>
              </template>

              <div v-else class="card">
                <h2 id="inventory-title" class="card__title">Inventaris kaveling</h2>

                <div v-if="loadState === 'loading'" class="skel-inv" role="status" aria-live="polite" aria-label="Memuat inventaris">
                  <Skeleton width="38%" height="44px" border-radius="8px" />
                  <Skeleton height="12px" border-radius="6px" />
                  <div class="skel-row">
                    <Skeleton height="52px" /><Skeleton height="52px" /><Skeleton height="52px" />
                  </div>
                </div>

                <AppNotice v-else-if="loadState === 'error'" tone="error" title="Inventaris belum dapat dimuat">
                  <p>{{ loadError }}</p>
<AppButton size="small" @click="loadInventory(true)">Coba lagi</AppButton>
                </AppNotice>

                <EmptyState
                  v-else
                  kind="lots"
                  compact
                  title="Belum ada kaveling terdaftar"
                  description="Data inventaris akan muncul setelah kaveling ditambahkan."
                />
              </div>
            </section>
          </Reveal>

          <!-- STATISTIK CALON PEMBELI -->
          <Reveal :order="2" class="area-buyers">
            <section class="card" aria-labelledby="buyers-title">
              <div class="card__head">
                <h2 id="buyers-title" class="card__title">Calon pembeli</h2>
                <span class="card__meta t-num">{{ dashboardCustomers.length }} pembeli</span>
              </div>

              <div v-if="buyerDataLoading" class="stat-grid" role="status" aria-label="Memuat statistik pembeli">
                <Skeleton height="96px" border-radius="14px" />
                <Skeleton height="96px" border-radius="14px" />
                <Skeleton height="96px" border-radius="14px" />
              </div>
              <AppNotice v-else-if="buyerDataError" tone="error" title="Statistik belum dapat dimuat">
                <p>{{ buyerDataError }}</p>
<AppButton size="small" @click="loadBuyerData()">Coba lagi</AppButton>
              </AppNotice>
              <div v-else class="stat-grid">
                <StatCard label="Prospek aktif" :value="buyerStats.prospects" hint="Belum melakukan pembelian" />
                <StatCard label="Pembeli" :value="buyerStats.buyers" hint="Transaksi terjual" />
                <StatCard label="Tindak lanjut" :value="buyerStats.followUps" hint="Memiliki catatan" />
              </div>
            </section>
          </Reveal>

          <!-- PERLU DITINDAKLANJUTI -->
          <Reveal :order="3" class="area-tasks">
            <section class="card" aria-labelledby="tasks-title">
              <div class="card__head">
                <h2 id="tasks-title" class="card__title">Perlu ditindaklanjuti</h2>
                <span v-if="!buyerDataLoading && actionTasks.length" class="card__meta t-num">{{ actionTasks.length }} tugas</span>
              </div>

              <div v-if="buyerDataLoading" class="skel-list" role="status" aria-label="Memuat tugas operasional">
                <Skeleton v-for="n in 3" :key="n" height="60px" border-radius="14px" />
              </div>

              <template v-else>
                <AppNotice v-if="buyerDataError || spkError" tone="error" title="Daftar tugas belum lengkap">
                  <p>{{ buyerDataError || spkError }}</p>
                  <AppButton size="small" @click="loadBuyerData()">Coba lagi</AppButton>
                </AppNotice>

                <div v-if="actionTasks.length" class="task-list">
                  <ul class="rows">
                    <li v-for="task in taskPager.items" :key="task.id">
                      <button type="button" class="row" @click="openTask(task)">
                        <span class="row__icon" :class="{ 'row__icon--danger': task.isLate, 'row__icon--gold': task.type === 'spk' }">
                          <IonIcon :icon="task.type === 'spk' ? documentTextOutline : (task.isLate ? timeOutline : walletOutline)" aria-hidden="true" />
                        </span>
                        <span class="row__copy row__copy--wrap">
                          <strong>{{ task.title }}</strong>
                          <small>{{ task.detail }}</small>
                          <small>{{ task.customerName }}</small>
                        </span>
                        <StatusBadge v-if="task.isLate" size="sm" tone="danger" label="Lewat 30 hari" />
                        <IonIcon class="row__chev" :icon="arrowForwardOutline" aria-hidden="true" />
                      </button>
                    </li>
                  </ul>
                  <AppPagination v-model:page="taskPager.page" :total-pages="taskPager.totalPages" :total="taskPager.total" :page-size="taskPager.pageSize" scroll-to=".task-list" label="Halaman tugas" />
                </div>

                <EmptyState
                  v-else-if="!buyerDataError && !spkError"
                  kind="transactions"
                  compact
                  title="Tidak ada tugas saat ini"
                  description="Tugas baru muncul ketika ada pembayaran atau pengajuan SPK yang menunggu."
                />
              </template>
            </section>
          </Reveal>

          <!-- AKSI CEPAT -->
          <Reveal :order="4" class="area-quick">
            <section class="card" aria-labelledby="quick-title">
              <h2 id="quick-title" class="card__title">Aksi cepat</h2>
              <div class="quick">
                <button
                  v-for="action in availableQuickActions"
                  :key="action.label"
                  type="button"
                  class="quick__item"
                  :class="`quick__item--${action.tone}`"
                  :disabled="!action.available"
                  :title="action.available ? action.description : 'Rute halaman belum tersedia di router'"
                  @click="openQuickAction(action)"
                >
                  <span class="quick__icon"><IonIcon :icon="action.icon" aria-hidden="true" /></span>
                  <span class="quick__copy">
                    <strong>{{ action.label }}</strong>
                    <small>{{ action.available ? action.description : 'Belum tersedia' }}</small>
                  </span>
                </button>
              </div>
            </section>
          </Reveal>

          <!-- AKTIVITAS -->
          <Reveal :order="5" class="area-activity">
            <section class="card" aria-labelledby="activity-title">
              <div class="card__head">
                <h2 id="activity-title" class="card__title">Aktivitas terkini</h2>
                <div class="date-filter">
                  <label>
                    <span class="sr-only">Pilih tanggal aktivitas</span>
                    <input v-model="selectedActivityDate" type="date" aria-label="Pilih tanggal aktivitas" />
                  </label>
                  <button v-if="selectedActivityDate" type="button" class="date-filter__clear" @click="selectedActivityDate = ''">
                    Hapus filter
                  </button>
                </div>
              </div>

              <div v-if="buyerDataLoading" class="skel-list" role="status" aria-label="Memuat aktivitas">
                <Skeleton v-for="n in 4" :key="n" height="56px" border-radius="14px" />
              </div>
              <AppNotice v-else-if="buyerDataError" tone="error" title="Aktivitas belum dapat dimuat">
                <p>{{ buyerDataError }}</p>
<AppButton size="small" @click="loadBuyerData()">Coba lagi</AppButton>
              </AppNotice>
              <div v-else-if="filteredActivities.length" class="activity-list">
                <ul class="rows">
                  <li v-for="activity in activityPager.items" :key="activity.id">
                    <button type="button" class="row" @click="openActivity(activity)">
                      <span class="row__icon" :class="`row__icon--${activity.tone}`">
                        <IonIcon :icon="activity.icon" aria-hidden="true" />
                      </span>
                      <span class="row__copy">
                        <strong>{{ activity.label }}</strong>
                        <small>{{ activity.detail }}</small>
                      </span>
                      <time class="row__time t-num" :datetime="activity.date">{{ formatActivityDate(activity.date) }}</time>
                    </button>
                  </li>
                </ul>
                <AppPagination v-model:page="activityPager.page" :total-pages="activityPager.totalPages" :total="activityPager.total" :page-size="activityPager.pageSize" scroll-to=".activity-list" label="Halaman aktivitas terkini" />
              </div>
              <EmptyState
                v-else
                kind="notifications"
                compact
                :title="selectedActivityDate ? 'Tidak ada aktivitas pada tanggal ini' : 'Belum ada aktivitas'"
                :description="selectedActivityDate ? 'Pilih tanggal lain untuk melihat aktivitas.' : 'Aktivitas pembeli dan pembayaran akan muncul di sini.'"
              />
            </section>
          </Reveal>
        </div>
      </main>
    </ion-content>
    <MobileTabBar variant="admin" />
  </ion-page>
</template>

<style scoped>
.dashboard-content {
  --background: var(--app-background);
}

.dash {
  width: min(100%, var(--container-max));
  margin-inline: auto;
  padding: var(--space-4) var(--page-gutter) calc(var(--bottom-nav-h) + var(--space-12) + var(--safe-bottom));
  color: var(--text-primary);
  font-family: var(--font-ui);
}

.dash__grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: 'inv' 'tasks' 'quick' 'buyers' 'activity';
}
.area-inv { grid-area: inv; }
.area-buyers { grid-area: buyers; }
.area-tasks { grid-area: tasks; }
.area-quick { grid-area: quick; }
.area-activity { grid-area: activity; }

@media (min-width: 1024px) {
  .dash { padding: var(--space-6) var(--space-8) var(--space-12); }
  .dash__grid {
    gap: var(--space-5);
    grid-template-columns: minmax(0, 1fr) 340px;
    grid-template-areas:
      'inv buyers'
      'tasks quick'
      'activity quick';
  }
}

/* ---------- header action ---------- */
.icon-btn {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--surface-primary);
  color: var(--text-secondary);
  font-size: 20px;
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), transform var(--dur-instant) var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .icon-btn:hover { color: var(--danger-text); border-color: var(--status-danger); }
}
.icon-btn:active { transform: scale(0.94); }
.icon-btn:disabled { opacity: 0.5; cursor: not-allowed; }

/* ---------- generic card ---------- */
.card {
  min-width: 0;
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--surface-primary);
}
.card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2) var(--space-4);
  margin-bottom: var(--space-3);
}
.card__title {
  margin: 0 0 var(--space-3);
  font-size: var(--text-lg);
  font-weight: 700;
  line-height: var(--leading-snug);
}
.card__head .card__title { margin: 0; }
.card__meta { color: var(--text-secondary); font-size: var(--text-xs); font-weight: 600; }

.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}

/* ---------- inventory (panel penekanan) ---------- */
.inv {
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--surface-forest);
  color: var(--on-forest);
}
.inv__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.inv__title { margin: 0; font-size: var(--text-md); font-weight: 600; color: var(--on-forest-muted); }
.inv__refresh {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 44px;
  padding: 0 var(--space-3);
  border: 1px solid rgba(244, 241, 232, 0.22);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--on-forest);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .inv__refresh:hover { background: rgba(244, 241, 232, 0.1); }
}
.inv__refresh:disabled { opacity: 0.6; cursor: progress; }
.is-spinning { animation: spin 0.9s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

.inv__body {
  display: grid;
  gap: var(--space-5);
  margin-top: var(--space-4);
}
.inv__total { display: grid; gap: var(--space-1); }
.inv__number {
  font-size: clamp(2.75rem, 2rem + 3.6vw, 4.25rem);
  line-height: 1;
  color: var(--gold-100);
}
.inv__caption { color: var(--on-forest-muted); font-size: var(--text-sm); }

.inv__list { display: grid; gap: var(--space-2); margin: 0; padding: 0; list-style: none; }
.inv__row {
  display: grid;
  grid-template-columns: 10px 1fr auto 52px;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) 0;
  border-bottom: 1px solid rgba(244, 241, 232, 0.12);
  font-size: var(--text-md);
}
.inv__row:last-child { border-bottom: 0; }
.inv__dot { width: 10px; height: 10px; border-radius: 3px; }
.inv__row--available .inv__dot, .inv__seg--available { background: #7DB36B; }
.inv__row--booking .inv__dot, .inv__seg--booking { background: var(--gold-500); }
.inv__row--sold .inv__dot, .inv__seg--sold { background: #E58B84; }
.inv__value { font-size: var(--text-lg); }
.inv__pct { text-align: right; color: var(--on-forest-muted); font-size: var(--text-sm); }

.inv__bar {
  display: flex;
  gap: 3px;
  height: 10px;
  margin-top: var(--space-5);
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: rgba(244, 241, 232, 0.1);
}
.inv__seg { min-width: 4px; border-radius: var(--radius-pill); transition: width var(--dur-slow) var(--ease-out); }
.inv__warn { margin: var(--space-3) 0 0; color: var(--gold-100); font-size: var(--text-sm); }

@media (min-width: 640px) {
  .inv__body { grid-template-columns: minmax(0, 1fr) minmax(0, 1.1fr); align-items: end; }
}

/* ---------- skeleton / alert ---------- */
.skel-inv, .skel-list { display: grid; gap: var(--space-3); }
.skel-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: var(--space-3); }

/* ---------- stats ---------- */
.stat-grid { display: grid; gap: var(--space-3); grid-template-columns: repeat(3, minmax(0, 1fr)); }
@media (max-width: 479px) { .stat-grid { grid-template-columns: 1fr; } }
@media (min-width: 1024px) { .stat-grid { grid-template-columns: 1fr; } }

/* ---------- rows (tugas, aktivitas) ---------- */
.rows { display: grid; gap: var(--space-2); margin: 0; padding: 0; list-style: none; }
.row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto auto;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 60px;
  padding: var(--space-2) var(--space-3);
  border: 1px solid transparent;
  border-radius: var(--radius-md);
  background: var(--surface-muted);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), transform var(--dur-instant) var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .row:hover { background: var(--surface-sunken); border-color: var(--border-strong); }
}
.row:active { transform: scale(0.99); }
.row__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background: var(--green-100);
  color: var(--green-700);
  font-size: 19px;
}
.row__icon--gold { background: var(--gold-50); color: var(--gold-800); }
.row__icon--danger { background: var(--danger-bg); color: var(--danger-text); }
.row__copy { display: grid; min-width: 0; gap: 2px; }
.row__copy strong { font-size: var(--text-md); font-weight: 600; }
.row__copy small {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: var(--text-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.row__copy--wrap small { white-space: normal; overflow-wrap: anywhere; }
.row__time { color: var(--text-secondary); font-size: var(--text-xs); white-space: nowrap; }
.row__chev { color: var(--text-tertiary); font-size: 16px; transition: transform var(--dur-fast) var(--ease-out); }
@media (hover: hover) and (pointer: fine) {
  .row:hover .row__chev { transform: translateX(3px); }
}

@media (max-width: 479px) {
  .row { grid-template-columns: 40px minmax(0, 1fr) auto; }
  .row__chev { display: none; }
  .row > :nth-child(3) { align-self: start; }
}

/* ---------- aktivitas: filter, pager ---------- */
.date-filter { display: flex; align-items: center; gap: var(--space-2); }
.date-filter input {
  min-height: 44px;
  padding: 0 var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--surface-primary);
  color: var(--text-primary);
  font: inherit;
  font-size: var(--text-sm);
}
.date-filter__clear {
  min-height: 44px;
  padding: 0 var(--space-2);
  border: 0;
  background: transparent;
  color: var(--green-700);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
}

/* ---------- aksi cepat ---------- */
.quick { display: grid; gap: var(--space-2); grid-template-columns: repeat(2, minmax(0, 1fr)); }
@media (min-width: 1024px) { .quick { grid-template-columns: 1fr; } }
.quick__item {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr);
  align-items: center;
  gap: var(--space-3);
  min-height: 60px;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--surface-primary);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out), transform var(--dur-instant) var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .quick__item:hover:not(:disabled) { border-color: var(--green-500); box-shadow: var(--shadow-sm); }
}
.quick__item:active:not(:disabled) { transform: scale(0.985); }
.quick__item:disabled { opacity: 0.55; cursor: not-allowed; }
.quick__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background: var(--surface-muted);
  color: var(--text-secondary);
  font-size: 19px;
}
.quick__item--green .quick__icon { background: var(--green-100); color: var(--green-700); }
.quick__item--gold .quick__icon { background: var(--gold-50); color: var(--gold-800); }
.quick__copy { display: grid; min-width: 0; gap: 2px; }
.quick__copy strong { font-size: var(--text-md); font-weight: 600; }
.quick__copy small { color: var(--text-secondary); font-size: var(--text-xs); line-height: 1.3; }
/* Ubin dua kolom di ponsel terlalu sempit untuk ikon di samping teks, jadi ikon di atas. */
@media (max-width: 639px) {
  .quick__item {
    grid-template-columns: minmax(0, 1fr);
    align-content: start;
    justify-items: start;
    gap: var(--space-2);
    padding: var(--space-3);
  }
}
</style>
