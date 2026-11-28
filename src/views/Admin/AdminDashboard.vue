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
  useIonRouter,
} from '@ionic/vue'
import {
  checkmarkCircleOutline,
  documentTextOutline,
  peopleOutline,
  walletOutline,
  timeOutline,
  logOutOutline,
  chevronForwardOutline,
} from 'ionicons/icons'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import SurveyAgendaCard from '@/components/common/SurveyAgendaCard.vue'
import HomeMenu from '@/components/home/HomeMenu.vue'
import type { MenuIllustrationName } from '@/components/home/MenuIllustration.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SceneBackdrop from '@/components/ui/SceneBackdrop.vue'
import ScrollReveal from '@/components/ui/ScrollReveal.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { getLots, type SiteplanLot } from '@/services/siteplanService'
import { getLotStatusColor, normalizeLotStatus } from '@/utils/siteplan'
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
  id: MenuIllustrationName
  label: string
  gold?: boolean
  routeName: string
  /** Query untuk membuka tab atau formulir tertentu di halaman tujuan. */
  query?: Record<string, string>
}

const router = useRouter()
const ionRouter = useIonRouter()
const lots = ref<SiteplanLot[]>([])
const loadState = ref<LoadState>('loading')
const loadError = ref('')
const loggingOut = ref(false)
const buyerDataLoading = ref(true)
const buyerDataError = ref('')
const dashboardCustomers = ref<any[]>([])
const pendingSpks = ref<AdminSPKRequest[]>([])
const spkError = ref('')
const installmentInfo = ref(new Map<number, PaymentInstallmentInfo>())
const menuPlay = ref(false)
let menuFrame = 0
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

/** Warna status sama dengan denah. Warna saja tidak cukup, jadi label selalu ikut tampil. */
const statusColor = (status: InventoryStatus['key']) => getLotStatusColor({ status })

const quickActions: QuickAction[] = [
  { id: 'denah', label: 'Denah', routeName: 'AdminSiteplan' },
  { id: 'klien', label: 'Tambah klien', gold: true, routeName: 'AdminPembeli', query: { action: 'tambah' } },
  { id: 'pembayaran', label: 'Pembayaran', routeName: 'AdminKeuangan', query: { tab: 'verification', status: 'pending' } },
  { id: 'spk', label: 'SPK', gold: true, routeName: 'AdminSPK' },
  { id: 'survei', label: 'Survei', gold: true, routeName: 'AdminSurvei' },
  { id: 'konten', label: 'Konten', routeName: 'AdminKonten' },
  { id: 'ulasan', label: 'Ulasan', gold: true, routeName: 'AdminUlasan' },
  { id: 'tim', label: 'Akses tim', routeName: 'AdminAksesTim' },
]

const menuItems = computed(() => {
  const routeNames = new Set(router.getRoutes().map((route) => route.name))
  return quickActions.map(({ id, label, gold, routeName }) => ({
    id,
    label,
    gold,
    disabled: !routeNames.has(routeName),
  }))
})

const inventoryDescription = computed(() => {
  const [available, booking, sold] = inventory.value
  return `Total ${totalUnits.value} unit: ${available.value} tersedia, ${booking.value} dipesan, dan ${sold.value} terjual.`
})

const buyerStats = computed(() => ({
  prospects: dashboardCustomers.value.filter((customer) => !customer.lot_transactions?.some((transaction: any) => transaction.status === 'Sold') && !(customer.customer_notes?.length ?? 0) && !(customer.customer_interests?.length ?? 0)).length,
  buyers: dashboardCustomers.value.filter((customer) => customer.lot_transactions?.some((transaction: any) => transaction.status === 'Sold')).length,
  followUps: dashboardCustomers.value.filter((customer) => !customer.lot_transactions?.some((transaction: any) => transaction.status === 'Sold') && ((customer.customer_notes?.length ?? 0) > 0 || (customer.customer_interests?.length ?? 0) > 0)).length,
}))

const clientColumns = computed(() => [
  { label: 'Prospek aktif', hint: 'Belum membeli', value: buyerStats.value.prospects },
  { label: 'Pembeli', hint: 'Transaksi terjual', value: buyerStats.value.buyers },
  { label: 'Tindak lanjut', hint: 'Ada catatan atau minat', value: buyerStats.value.followUps },
])

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

  // Pembaruan otomatis atau paksa: tampilan lama tetap ada sampai data baru tiba.
  if (!((silent || forceRefresh) && hasExistingData)) {
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
  }
}

function openQuickAction(id: MenuIllustrationName) {
  const action = quickActions.find((item) => item.id === id)
  if (!action || !router.getRoutes().some((route) => route.name === action.routeName)) return

  // nt: lihat openTask. Tanpa ini ketukan kedua tidak membuka ulang tab atau formulirnya.
  void router.push({
    name: action.routeName,
    query: action.query && { ...action.query, nt: String(Date.now()) },
  })
}

async function logout() {
  if (loggingOut.value) return

  loggingOut.value = true
  try {
    await authService.logout()
    ionRouter.replace('/login')
  } finally {
    loggingOut.value = false
  }
}

onMounted(() => {
  // Satu frame setelah tampil, agar menu punya keadaan awal untuk dianimasikan.
  menuFrame = requestAnimationFrame(() => {
    menuFrame = requestAnimationFrame(() => { menuPlay.value = true })
  })
  void loadInventory()
  void loadBuyerData()
})

// Tugas yang sudah diselesaikan di halaman lain hilang saat admin kembali ke sini.
onIonViewWillEnter(() => {
  if (!buyerDataLoading.value) void loadBuyerData(true)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(menuFrame)
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
  <ion-page class="pl-admin">
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />

    <ion-content class="dashboard-content" :fullscreen="false">
      <main class="dash">
        <!-- 1. Banner -->
        <section class="banner" aria-labelledby="banner-title">
          <div class="banner__top">
            <p class="banner__date">{{ today }}</p>
            <button
              type="button"
              class="banner__logout"
              :disabled="loggingOut"
              :aria-label="loggingOut ? 'Sedang keluar' : 'Keluar dari akun'"
              @click="logout"
            >
              <IonIcon :icon="logOutOutline" aria-hidden="true" />
            </button>
          </div>
          <h1 id="banner-title" class="banner__title">Selamat datang, Admin</h1>
          <button type="button" class="banner__cta" @click="openQuickAction('denah')">Lihat denah</button>
        </section>

        <!-- 2. Bar status kaveling -->
        <section class="inventory" aria-labelledby="inventory-title">
          <h2 id="inventory-title" class="sr-only">Inventaris kaveling</h2>

          <div v-if="loadState === 'loading'" role="status" aria-label="Memuat inventaris">
            <Skeleton height="98px" border-radius="12px" />
          </div>

          <template v-else-if="loadState === 'success'">
            <div class="bar">
              <dl class="bar__cols">
                <div v-for="item in inventory" :key="item.key" class="bar__col">
                  <dt>
                    <span class="bar__dot" :style="{ background: statusColor(item.key) }" aria-hidden="true"></span>
                    {{ item.label }}
                  </dt>
                  <dd class="bar__value">{{ item.value.toLocaleString('id-ID') }}</dd>
                  <dd class="bar__note">{{ item.percentage.toLocaleString('id-ID') }}%</dd>
                </div>
              </dl>
              <div class="bar__meter" role="img" :aria-label="inventoryDescription">
                <span
                  v-for="item in inventory"
                  v-show="item.percentage > 0"
                  :key="item.key"
                  :style="{ width: `${item.percentage}%`, background: statusColor(item.key) }"
                ></span>
              </div>
            </div>
            <p v-if="loadError" class="inventory__warn" role="status">
              Data terakhir tetap ditampilkan. Pembaruan terbaru gagal dimuat.
            </p>
          </template>

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
        </section>

        <!-- 3. Menu pintas -->
        <HomeMenu :play="menuPlay" :items="menuItems" label="Menu admin" @select="openQuickAction" />

        <!-- Tidak tampil sama sekali bila tidak ada jadwal. -->
        <div class="agenda-slot">
          <SurveyAgendaCard variant="admin" />
        </div>

        <!-- 4. Isi -->
        <div class="dash__sections">
          <ScrollReveal class="area-tasks">
            <section class="block">
              <SectionHeader title="Perlu ditindaklanjuti">
                <span v-if="!buyerDataLoading && actionTasks.length" class="block__meta">{{ actionTasks.length }} tugas</span>
              </SectionHeader>

              <div v-if="buyerDataLoading" class="skel-list" role="status" aria-label="Memuat tugas operasional">
                <Skeleton v-for="n in 3" :key="n" height="72px" border-radius="12px" />
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
                        <span class="row__copy">
                          <strong>{{ task.title }}</strong>
                          <small>{{ task.detail }}</small>
                          <small>{{ task.customerName }}</small>
                          <StatusBadge v-if="task.isLate" class="row__badge" size="sm" tone="danger" label="Lewat 30 hari" />
                        </span>
                        <IonIcon class="row__chev" :icon="chevronForwardOutline" aria-hidden="true" />
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
          </ScrollReveal>

          <ScrollReveal class="area-clients">
            <section class="block">
              <SectionHeader title="Klien">
                <button type="button" class="see-all" @click="router.push({ name: 'AdminPembeli' })">Lihat semua</button>
              </SectionHeader>

              <div v-if="buyerDataLoading" role="status" aria-label="Memuat statistik pembeli">
                <Skeleton height="96px" border-radius="12px" />
              </div>
              <AppNotice v-else-if="buyerDataError" tone="error" title="Statistik belum dapat dimuat">
                <p>{{ buyerDataError }}</p>
                <AppButton size="small" @click="loadBuyerData()">Coba lagi</AppButton>
              </AppNotice>
              <template v-else>
                <div class="bar">
                  <dl class="bar__cols">
                    <div v-for="column in clientColumns" :key="column.label" class="bar__col">
                      <dt>{{ column.label }}</dt>
                      <dd class="bar__value">{{ column.value.toLocaleString('id-ID') }}</dd>
                      <dd class="bar__note">{{ column.hint }}</dd>
                    </div>
                  </dl>
                </div>
                <p class="block__foot">{{ dashboardCustomers.length.toLocaleString('id-ID') }} klien terdaftar</p>
              </template>
            </section>
          </ScrollReveal>

          <ScrollReveal class="area-activity">
            <section class="block">
              <SectionHeader title="Aktivitas terkini" />

              <div class="date-filter">
                <label class="date-filter__field">
                  <span class="sr-only">Pilih tanggal aktivitas</span>
                  <input v-model="selectedActivityDate" type="date" />
                </label>
                <button v-if="selectedActivityDate" type="button" class="see-all" @click="selectedActivityDate = ''">
                  Hapus filter
                </button>
              </div>

              <div v-if="buyerDataLoading" class="skel-list" role="status" aria-label="Memuat aktivitas">
                <Skeleton v-for="n in 4" :key="n" height="72px" border-radius="12px" />
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
                        <time :datetime="activity.date">{{ formatActivityDate(activity.date) }}</time>
                      </span>
                      <IonIcon class="row__chev" :icon="chevronForwardOutline" aria-hidden="true" />
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
          </ScrollReveal>
        </div>
      </main>

      <!-- Penutup: bukit dan matahari yang sama dengan Beranda publik. -->
      <footer class="dash-footer" aria-hidden="true">
        <SceneBackdrop class="dash-footer__scene" height="100%" :sway="false" />
      </footer>
    </ion-content>
    <MobileTabBar variant="admin" />
  </ion-page>
</template>

<style scoped>
/* Satu lembar putih menyambung; jarak antar-section cukup dari ruang kosong. */
.dashboard-content {
  --background: var(--surface-primary);
  --padding-bottom: 0px;
}

.dash {
  width: min(100%, var(--container-max));
  margin-inline: auto;
  color: var(--text-primary);
  font-family: var(--font-ui);
}

.sr-only {
  position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px;
  overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;
}

button {
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}
/* Isi baris tugas dan aktivitas adalah data, jadi tetap bisa disalin di desktop. */
.row { user-select: text; -webkit-user-select: text; }
button:focus-visible,
input:focus-visible {
  outline: 3px solid var(--poliland-green);
  outline-offset: 2px;
}

/* ---------- banner ---------- */
.banner {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin: 12px 12px 0;
  padding: var(--space-3) var(--space-5) var(--space-5);
  border-radius: var(--radius-card);
  background:
    radial-gradient(120% 90% at 100% 0%, rgba(203, 160, 68, 0.3), rgba(203, 160, 68, 0) 62%),
    var(--surface-forest);
  color: var(--on-forest);
}
.banner__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  width: 100%;
}
.banner__date { margin: 0; color: var(--poliland-gold-soft); font-size: var(--text-sm); }
.banner__logout {
  display: grid;
  flex-shrink: 0;
  place-items: center;
  width: 44px;
  height: 44px;
  margin-right: calc(-1 * var(--space-2));
  border: 1px solid rgba(244, 241, 232, 0.3);
  border-radius: var(--radius-control);
  background: transparent;
  color: var(--on-forest);
  font-size: 20px;
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}
.banner__logout:active:not(:disabled) { transform: scale(0.94); background: rgba(244, 241, 232, 0.12); }
.banner__logout:disabled { opacity: 0.5; cursor: not-allowed; }
.banner__title {
  margin: var(--space-2) 0 0;
  font-family: var(--font-display);
  font-size: clamp(27px, 7.6vw, 38px);
  font-weight: 650;
  line-height: 1.12;
  letter-spacing: -0.02em;
  text-wrap: balance;
}
.banner__cta {
  min-height: 44px;
  margin-top: var(--space-4);
  padding: 0 var(--space-5);
  border: 0;
  border-radius: var(--radius-control);
  background: var(--poliland-gold);
  color: var(--ink);
  font: 700 14px/1 var(--font-ui);
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out);
}
.banner__cta:active { transform: scale(0.96); }
.banner button:focus-visible { outline-color: var(--poliland-gold-soft); }

/* ---------- bar angka ---------- */
.inventory { padding: 10px 12px 0; }
.inventory__warn { margin: var(--space-2) 0 0; color: var(--poliland-gold-text); font-size: var(--text-sm); }

.bar {
  padding: 12px 0;
  border: 1px solid var(--border-default);
  border-radius: 12px;
  background: var(--surface-primary);
  box-shadow: var(--shadow-sm);
}
.bar__cols { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); margin: 0; }
.bar__col { display: flex; flex-direction: column; align-items: center; gap: 3px; padding: 0 6px; text-align: center; }
.bar__col + .bar__col { border-left: 1px solid var(--border-default); }
.bar__col dt { color: var(--text-secondary); font-size: var(--text-xs); line-height: 1.3; }
.bar__col dd { margin: 0; }
/* Angka tampil di atas labelnya, urutan baca tetap label lalu nilai. */
.bar__col .bar__value {
  order: -1;
  color: var(--poliland-green);
  font-family: var(--font-display);
  font-size: 22px;
  font-weight: 650;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
}
.bar__note { color: var(--text-secondary); font-size: var(--text-2xs); line-height: 1.3; font-variant-numeric: tabular-nums; text-wrap: balance; }
.bar__dot { display: inline-block; width: 8px; height: 8px; margin-right: 3px; border-radius: 3px; }
.bar__meter {
  display: flex;
  gap: 2px;
  height: 6px;
  margin: 10px 12px 0;
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--surface-muted);
}
.bar__meter span { min-width: 4px; }

.agenda-slot { padding: 0 20px; }
.agenda-slot > :deep(.agenda) { margin: var(--space-3) 0 0; }

/* ---------- section ---------- */
.dash__sections { display: grid; grid-template-columns: minmax(0, 1fr); }
.dash__sections > * { min-width: 0; }
.block { padding: 24px 20px 0; }
.block__meta { color: var(--text-secondary); font-size: var(--text-xs); font-weight: 600; white-space: nowrap; }
.block__foot { margin: var(--space-2) 0 0; color: var(--text-secondary); font-size: var(--text-sm); }

.see-all {
  flex-shrink: 0;
  min-height: 44px;
  padding: 0 4px;
  border: 0;
  background: transparent;
  color: var(--poliland-green);
  font: 800 13px/1 var(--font-ui);
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out);
}
.see-all:active { transform: scale(0.95); }

.skel-list { display: grid; gap: var(--space-2); }

@media (min-width: 1024px) {
  .dash__sections {
    grid-template-columns: minmax(0, 1fr) minmax(0, 380px);
    grid-template-areas: 'tasks clients' 'activity clients';
    align-content: start;
    align-items: start;
  }
  .area-tasks { grid-area: tasks; }
  .area-clients { grid-area: clients; }
  .area-activity { grid-area: activity; }
}

/* ---------- baris tugas dan aktivitas ---------- */
.rows { margin: 0; padding: 0; list-style: none; }
.rows li + li { border-top: 1px solid var(--border-default); }
.row {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 64px;
  padding: var(--space-3) 0;
  border: 0;
  border-radius: var(--radius-control);
  background: transparent;
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform var(--dur-fast) var(--ease-out), background-color var(--dur-fast) var(--ease-out);
}
.row:active { transform: scale(0.97); background: var(--green-50); }
.row:focus-visible { outline-offset: -3px; }
@media (hover: hover) and (pointer: fine) {
  .row:hover { background: var(--green-50); }
}
.row__icon {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--green-50);
  color: var(--green-700);
  font-size: 20px;
}
.row__icon--gold { background: var(--gold-50); color: var(--gold-800); }
.row__icon--danger { background: var(--danger-bg); color: var(--danger-text); }
.row__copy { display: grid; min-width: 0; gap: 2px; overflow-wrap: anywhere; }
.row__copy strong { font-size: 14px; font-weight: 700; line-height: 1.35; }
.row__copy small { color: var(--text-secondary); font-size: var(--text-sm); line-height: 1.4; }
.row__copy time { color: var(--text-secondary); font-size: var(--text-xs); font-variant-numeric: tabular-nums; }
.row__badge { justify-self: start; margin-top: 2px; }
.row__chev { color: var(--text-secondary); font-size: 16px; }

/* ---------- filter tanggal ---------- */
.date-filter { display: flex; align-items: center; gap: var(--space-3); margin-bottom: var(--space-2); }
.date-filter__field { flex: 1; min-width: 0; max-width: 240px; }
.date-filter input {
  width: 100%;
  min-height: 44px;
  box-sizing: border-box;
  padding: 0 var(--space-3);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-primary);
  color: var(--text-primary);
  font: inherit;
  /* Di bawah 16px, iOS memperbesar halaman saat input difokuskan. */
  font-size: 16px;
}

/* ---------- footer ---------- */
.dash-footer {
  position: relative;
  height: calc(210px + var(--safe-bottom));
  overflow: hidden;
  /* Putih memudar ke krem agar footer menyambung tanpa garis batas. */
  background: linear-gradient(180deg, var(--surface-primary) 0%, var(--pl-paper) 55%);
}
.dash-footer__scene :deep(.sun) {
  top: 0;
  right: -90px;
  width: 260px;
  height: 200px;
  background: radial-gradient(closest-side, rgba(244, 214, 154, 0.7), rgba(244, 214, 154, 0));
}

@media (prefers-reduced-motion: reduce) {
  .banner__logout:active:not(:disabled),
  .banner__cta:active,
  .see-all:active,
  .row:active { transform: none; }
}
</style>
