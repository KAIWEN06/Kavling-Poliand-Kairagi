<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/vue'
import {
  arrowDownOutline,
  arrowForwardOutline,
  barChartOutline,
  calendarOutline,
  checkmarkCircleOutline,
  chevronDownOutline,
  chevronForwardOutline,
  layersOutline,
  logOutOutline,
  personOutline,
  walletOutline,
} from 'ionicons/icons'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import { authService } from '@/services/auth/authService'
import { supabase } from '@/services/config/supabase'
import { getLots, type SiteplanLot } from '@/services/siteplanService'
import { getNorthSulawesiOrigin } from '@/utils/northSulawesiOrigin'
import { normalizeLotStatus } from '@/utils/siteplan'

type OwnerCustomer = {
  id: number
  full_name: string | null
  address: string | null
  created_at: string | null
}

type OwnerTransaction = {
  id: number
  lot_id: number
  customer_id: number
  status: string
  payment_type: string | null
  final_price: number | string | null
  created_at: string | null
  booking_date: string | null
  sold_date: string | null
}

type OwnerPayment = {
  id: number
  lot_id: number | null
  customer_id: number | null
  amount: number | string | null
  status: string
  payment_category: string | null
  created_at: string | null
  payment_date: string | null
}

type DashboardActivity = {
  id: string
  title: string
  subtitle: string
  date: string
  type: 'sold' | 'booking' | 'customer' | 'payment'
}

const route = useRoute()
const router = useRouter()
const ownerName = ref('Owner')
const lots = ref<SiteplanLot[]>([])
const customers = ref<OwnerCustomer[]>([])
const transactions = ref<OwnerTransaction[]>([])
const payments = ref<OwnerPayment[]>([])
const loading = ref(true)
const loadError = ref('')
const logoutError = ref('')
const isLoggingOut = ref(false)
const selectedYear = ref(new Date().getFullYear())
const selectedMonth = ref<number | null>(null)

const years = computed(() => {
  const values = new Set<number>([new Date().getFullYear()])
  transactions.value.forEach((transaction) => {
    const date = transaction.sold_date || transaction.created_at
    if (date) values.add(new Date(date).getFullYear())
  })
  return [...values].sort((left, right) => right - left)
})

const inventory = computed(() => {
  const counts = { available: 0, booking: 0, sold: 0 }
  for (const lot of lots.value) {
    const status = normalizeLotStatus(lot.status)
    if (status === 'available') counts.available += 1
    if (status === 'booking') counts.booking += 1
    if (status === 'sold') counts.sold += 1
  }
  return counts
})

const monthlySales = computed(() => {
  const counts = Array.from({ length: 12 }, () => 0)
  transactions.value.forEach((transaction) => {
    if (!isSold(transaction.status)) return
    const date = transaction.sold_date || transaction.created_at
    if (!date) return
    const soldAt = new Date(date)
    if (soldAt.getFullYear() === selectedYear.value) counts[soldAt.getMonth()] += 1
  })
  return counts
})

const monthlySalesMax = computed(() => Math.max(1, ...monthlySales.value))
const yearSales = computed(() => monthlySales.value.reduce((sum, count) => sum + count, 0))
const previousYearSales = computed(() => transactions.value.filter((transaction) => {
  if (!isSold(transaction.status)) return false
  const date = transaction.sold_date || transaction.created_at
  return date ? new Date(date).getFullYear() === selectedYear.value - 1 : false
}).length)
const salesGrowth = computed(() => {
  if (previousYearSales.value === 0) return yearSales.value ? 100 : 0
  return Math.round(((yearSales.value - previousYearSales.value) / previousYearSales.value) * 100)
})

const validCustomerOrigins = computed(() => customers.value
  .map((customer) => getNorthSulawesiOrigin(customer.address))
  .filter((origin): origin is string => origin !== null))

const consumerOrigins = computed(() => {
  const originCounts = new Map<string, number>()
  for (const origin of validCustomerOrigins.value) {
    originCounts.set(origin, (originCounts.get(origin) ?? 0) + 1)
  }
  const palette = ['var(--poliland-gold, #cba044)', 'var(--poliland-green, #355a2c)', '#c51f24', '#ffad76', '#8f7965']
  return [...originCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([name, count], index) => ({
      name,
      count,
      percent: validCustomerOrigins.value.length
        ? Math.round(count / validCustomerOrigins.value.length * 100)
        : 0,
      color: palette[index] ?? '#8f7965',
    }))
})

const originDonutStyle = computed(() => {
  const total = validCustomerOrigins.value.length
  if (!total) {
    return { background: 'conic-gradient(#e7e4dd 0deg 360deg)' }
  }
  let start = 0
  const slices = consumerOrigins.value.map((origin) => {
    const end = start + origin.count / total * 360
    const slice = `${origin.color} ${start}deg ${end}deg`
    start = end
    return slice
  })
  if (start < 360) slices.push(`#8f7965 ${start}deg 360deg`)
  return { background: `conic-gradient(${slices.join(', ')})` }
})

const activities = computed<DashboardActivity[]>(() => {
  const customerById = new Map(customers.value.map((customer) => [customer.id, customer]))
  const lotById = new Map(lots.value.map((lot) => [Number(lot.id), lot]))
  const rows: DashboardActivity[] = []

  for (const transaction of transactions.value) {
    const lot = lotById.get(transaction.lot_id)
    const customer = customerById.get(transaction.customer_id)
    const status = transaction.status.toLocaleLowerCase('id-ID')
    const isBooking = status.includes('book') || status.includes('reserv') || status.includes('booking')
    const isTransactionSold = isSold(transaction.status)
    if (!isBooking && !isTransactionSold) continue
    const date = (isTransactionSold ? transaction.sold_date : transaction.booking_date)
      || transaction.created_at
    if (!date) continue
    rows.push({
      id: `transaction-${transaction.id}`,
      title: isTransactionSold ? 'Kavling berhasil terjual' : 'Kavling dibooking',
      subtitle: [lot?.lot_number ? `Kavling ${lot.lot_number}` : `Kavling #${transaction.lot_id}`, customer?.full_name].filter(Boolean).join(' · '),
      date,
      type: isTransactionSold ? 'sold' : 'booking',
    })
  }

  for (const customer of customers.value) {
    if (!customer.created_at) continue
    rows.push({
      id: `customer-${customer.id}`,
      title: 'Calon pembeli baru',
      subtitle: customer.full_name || 'Nama belum diisi',
      date: customer.created_at,
      type: 'customer',
    })
  }

  for (const payment of payments.value) {
    if (payment.status !== 'Confirmed') continue
    const customer = payment.customer_id ? customerById.get(payment.customer_id) : null
    const lot = payment.lot_id ? lotById.get(payment.lot_id) : null
    const date = payment.payment_date || payment.created_at
    if (!date) continue
    rows.push({
      id: `payment-${payment.id}`,
      title: 'Pembayaran diterima',
      subtitle: [lot?.lot_number ? `Kavling ${lot.lot_number}` : 'Pembayaran kavling', customer?.full_name].filter(Boolean).join(' · '),
      date,
      type: 'payment',
    })
  }

  return rows.sort((left, right) => new Date(right.date).getTime() - new Date(left.date).getTime()).slice(0, 6)
})

const selectedMonthLabel = computed(() => selectedMonth.value === null
  ? 'Jumlah Penjualan'
  : `Penjualan ${monthNames[selectedMonth.value]}`)
const selectedMonthSales = computed(() => selectedMonth.value === null
  ? yearSales.value
  : monthlySales.value[selectedMonth.value])

const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des']

async function loadDashboard() {
  loading.value = true
  loadError.value = ''
  try {
    const user = await authService.getCurrentUser()
    if (user) {
      const metadataName = [user.user_metadata?.full_name, user.user_metadata?.name]
        .find((value) => typeof value === 'string' && value.trim())
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .maybeSingle()
      if (profileError) throw profileError
      ownerName.value = profile?.full_name?.trim() || metadataName?.trim() || 'Owner'
    }

    const [lotRows, transactionResult, customerResult, paymentResult] = await Promise.all([
      getLots({ forceRefresh: true }),
      supabase.from('lot_transactions')
        .select('id, lot_id, customer_id, status, payment_type, final_price, created_at, booking_date, sold_date')
        .order('created_at', { ascending: false })
        .limit(300),
      supabase.from('customers')
        .select('id, full_name, address, created_at')
        .order('created_at', { ascending: false })
        .limit(500),
      supabase.from('payments')
        .select('id, lot_id, customer_id, amount, status, payment_category, created_at, payment_date')
        .order('created_at', { ascending: false })
        .limit(300),
    ])

    if (transactionResult.error) throw transactionResult.error
    if (customerResult.error) throw customerResult.error
    if (paymentResult.error) throw paymentResult.error

    lots.value = lotRows
    transactions.value = (transactionResult.data ?? []) as OwnerTransaction[]
    customers.value = (customerResult.data ?? []) as OwnerCustomer[]
    payments.value = (paymentResult.data ?? []) as OwnerPayment[]
  } catch (error) {
    console.error('[Beranda Owner] Gagal memuat dashboard:', error)
    loadError.value = error instanceof Error
      ? error.message
      : 'Data dashboard belum dapat dimuat. Coba muat ulang.'
  } finally {
    loading.value = false
  }
}

async function logout() {
  if (isLoggingOut.value) return

  isLoggingOut.value = true
  logoutError.value = ''
  try {
    await authService.logout()
    await router.replace('/login')
  } catch (error) {
    console.error('[Beranda Owner] Gagal keluar dari akun:', error)
    logoutError.value = error instanceof Error
      ? error.message
      : 'Tidak dapat keluar. Silakan coba lagi.'
  } finally {
    isLoggingOut.value = false
  }
}

function isSold(status: string | null | undefined) {
  const normalized = (status ?? '').trim().toLocaleLowerCase('id-ID')
  return normalized === 'sold' || normalized === 'terjual'
}

function relativeTime(value: string) {
  const elapsed = Math.max(0, Date.now() - new Date(value).getTime())
  const hours = Math.floor(elapsed / 3_600_000)
  if (hours < 1) return 'Baru saja'
  if (hours < 24) return `${hours} jam lalu`
  const days = Math.floor(hours / 24)
  return `${days} hari lalu`
}

function setChartMonth(index: number) {
  selectedMonth.value = selectedMonth.value === index ? null : index
}

async function jumpToSection(hash: string) {
  await router.replace({ path: '/beranda-owner', hash: `#${hash}` })
  await nextTick()
  document.getElementById(hash)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

watch(() => route.hash, async (hash) => {
  if (!hash) return
  await nextTick()
  document.getElementById(hash.slice(1))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
})

onMounted(() => void loadDashboard())
</script>

<template>
  <ion-page class="owner-page">
    <AppHeader variant="owner" title="PoliLand Kairagi" :show-back="false" />

    <ion-content class="owner-content" :fullscreen="false">
      <main class="owner-shell">
        <section class="welcome-section">
          <div class="welcome-copy">
            <p>Selamat datang,</p>
            <h1>{{ ownerName }}</h1>
            <span>Pantau perkembangan penjualan dan kelola investasi PoliLand Kairagi secara langsung melalui dashboard ini.</span>
          </div>
          <button
            type="button"
            class="logout-button"
            :disabled="isLoggingOut"
            :aria-label="isLoggingOut ? 'Sedang keluar' : 'Keluar dari akun Owner'"
            @click="logout"
          >
            <ion-spinner v-if="isLoggingOut" name="crescent" aria-hidden="true" />
            <ion-icon v-else :icon="logOutOutline" aria-hidden="true" />
            <span>{{ isLoggingOut ? 'Keluar...' : 'Keluar' }}</span>
          </button>
        </section>
        <p v-if="logoutError" class="logout-error" role="alert">{{ logoutError }}</p>

        <section id="inventory" class="inventory-grid" aria-label="Ringkasan kavling">
          <article class="inventory-card total-card">
            <span class="inventory-icon"><ion-icon :icon="layersOutline" /></span>
            <strong>{{ lots.length }}</strong><small>Total Kavling</small>
          </article>
          <article class="inventory-card available-card">
            <span class="inventory-icon"><ion-icon :icon="checkmarkCircleOutline" /></span>
            <strong>{{ inventory.available }}</strong><small>Tersedia</small>
          </article>
          <article class="inventory-card booking-card">
            <span class="inventory-icon"><ion-icon :icon="calendarOutline" /></span>
            <strong>{{ inventory.booking }}</strong><small>Booking</small>
          </article>
          <article class="inventory-card sold-card">
            <span class="inventory-icon"><ion-icon :icon="checkmarkCircleOutline" /></span>
            <strong>{{ inventory.sold }}</strong><small>Terjual</small>
          </article>
        </section>

        <p v-if="loading" class="owner-state" role="status">Memuat data dashboard...</p>
        <section v-else-if="loadError" class="owner-error" role="alert">
          <strong>Data dashboard belum dapat dimuat</strong>
          <p>{{ loadError }}</p>
          <button type="button" @click="loadDashboard">Coba lagi</button>
        </section>

        <section id="statistics" class="dashboard-card sales-card">
          <div class="card-heading">
            <h2>Statistik Penjualan</h2>
            <label class="year-picker">
              <span class="sr-only">Pilih tahun statistik</span>
              <select v-model.number="selectedYear">
                <option v-for="year in years" :key="year" :value="year">Tahun {{ year }}</option>
              </select>
              <ion-icon :icon="chevronDownOutline" aria-hidden="true" />
            </label>
          </div>

          <div class="sales-highlight">
            <span class="highlight-icon"><ion-icon :icon="barChartOutline" /></span>
            <div class="highlight-copy">
              <span>{{ selectedMonthLabel }}</span>
              <strong>{{ selectedMonthSales }} Kavling</strong>
            </div>
            <div class="growth-chip" :class="{ negative: salesGrowth < 0 }">
              <span><ion-icon :icon="salesGrowth < 0 ? arrowDownOutline : arrowForwardOutline" /> {{ Math.abs(salesGrowth) }}%</span>
              <small>dari periode lalu</small>
            </div>
          </div>

          <p class="chart-hint">Sentuh batang untuk melihat detail</p>
          <div class="sales-chart" role="img" :aria-label="`Grafik penjualan tahun ${selectedYear}`">
            <button
              v-for="(count, index) in monthlySales"
              :key="monthNames[index]"
              type="button"
              class="chart-column"
              :class="{ selected: selectedMonth === index, 'current-month': selectedYear === new Date().getFullYear() && index === new Date().getMonth() }"
              :aria-label="`${monthNames[index]}: ${count} kavling terjual`"
              @click="setChartMonth(index)"
            >
              <span class="bar-value" v-if="selectedMonth === index || count === monthlySalesMax">{{ count }}</span>
              <span class="bar-track"><i :style="{ height: `${Math.max(count ? 16 : 4, count / monthlySalesMax * 100)}%` }"></i></span>
              <small>{{ monthNames[index] }}</small>
            </button>
          </div>
        </section>

        <section id="reports" class="dashboard-card origin-card">
          <div class="card-heading">
            <h2>Asal Konsumen</h2>
            <button type="button" class="text-action" @click="jumpToSection('activity')">
              Lihat Semua <ion-icon :icon="chevronForwardOutline" />
            </button>
          </div>
          <div class="origin-content">
            <div class="origin-donut" :style="originDonutStyle">
              <div><small>Total</small><strong>{{ validCustomerOrigins.length }}</strong><small>Konsumen</small></div>
            </div>
            <div v-if="consumerOrigins.length" class="origin-legend">
              <div v-for="origin in consumerOrigins" :key="origin.name" class="origin-row">
                <i :style="{ background: origin.color }"></i>
                <span>{{ origin.name }}</span>
                <strong>{{ origin.count }}</strong>
                <small>{{ origin.percent }}%</small>
              </div>
            </div>
            <p v-else class="origin-empty">Belum ada alamat yang cocok dengan wilayah Sulawesi Utara.</p>
          </div>
        </section>

        <section id="activity" class="dashboard-card activity-card">
          <div class="card-heading">
            <h2>Aktivitas Terbaru</h2>
            <button type="button" class="text-action" @click="loadDashboard">
              Muat Ulang <ion-icon :icon="chevronForwardOutline" />
            </button>
          </div>
          <div v-if="activities.length" class="activity-list">
            <article v-for="activity in activities" :key="activity.id" class="activity-row">
              <span class="activity-icon" :class="`tone-${activity.type}`">
                <ion-icon :icon="activity.type === 'sold' ? checkmarkCircleOutline : activity.type === 'booking' ? calendarOutline : activity.type === 'customer' ? personOutline : walletOutline" />
              </span>
              <div class="activity-copy"><strong>{{ activity.title }}</strong><span>{{ activity.subtitle }}</span></div>
              <time><span>{{ relativeTime(activity.date) }}</span><ion-icon :icon="chevronForwardOutline" /></time>
            </article>
          </div>
          <p v-else class="activity-empty">Belum ada aktivitas pada data transaksi.</p>
        </section>
      </main>
    </ion-content>

    <MobileTabBar variant="owner" />
  </ion-page>
</template>

<style scoped>
.owner-page,
.owner-content {
  --background: var(--app-background, #faf9f6);
  color: var(--text-primary, #252525);
  font-family: var(--font-primary, var(--ion-font-family, sans-serif));
}

.owner-shell {
  display: grid;
  gap: 16px;
  width: min(100%, 760px);
  margin: 0 auto;
  padding: 18px 16px calc(104px + env(safe-area-inset-bottom, 0px));
}

.welcome-section {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 1px 2px;
}

.welcome-copy { min-width: 0; }
.welcome-copy p { margin: 0 0 3px; color: #6e5547; font-size: 13px; }
.welcome-copy h1 { margin: 0 0 6px; color: var(--text-primary, #252525); font-size: 26px; font-weight: 800; letter-spacing: -.5px; }
.welcome-copy > span { display: block; max-width: 480px; color: #625c59; font-size: 12px; line-height: 1.55; }

.logout-button {
  display: inline-flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: center;
  gap: 5px;
  min-height: 36px;
  padding: 0 11px;
  border: 1px solid #efc7c7;
  border-radius: 999px;
  color: #b43a36;
  background: #fff0ed;
  font: inherit;
  font-size: 10px;
  font-weight: 700;
  cursor: pointer;
}
.logout-button ion-icon,.logout-button ion-spinner { font-size: 15px; }
.logout-button:disabled { cursor: wait; opacity: .65; }
.logout-button:focus-visible { outline: 2px solid #b43a36; outline-offset: 2px; }
.logout-error { margin: -8px 0 0; color: #b43a36; font-size: 11px; }

.inventory-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 8px; scroll-margin-top: 16px; }
.inventory-card { display: grid; min-width: 0; gap: 3px; padding: 10px; border-radius: 15px; background: #fff; box-shadow: 0 5px 16px rgb(33 49 74 / 4%); }
.inventory-icon { display: grid; width: 27px; height: 27px; place-items: center; margin-bottom: 3px; border-radius: 9px; color: var(--poliland-gold-text, #966a12); background: var(--poliland-gold-soft, #f4d69a); font-size: 16px; }
.inventory-card strong { font-size: 20px; line-height: 1; font-weight: 800; }
.inventory-card small { color: #5d5c61; font-size: 10px; }
.available-card { color: var(--poliland-green, #355a2c); background: var(--status-success-bg, #e8eee4); }
.available-card .inventory-icon { color: var(--poliland-green, #355a2c); background: #c7eddd; }
.booking-card { color: #ba8a20; background: #fff4d9; }
.booking-card .inventory-icon { color: #a56a1e; background: #ffe3bc; }
.sold-card { color: #c5232c; background: #fcebed; }
.sold-card .inventory-icon { color: #c5232c; background: #ffdcde; }

.dashboard-card { min-width: 0; padding: 16px; border-radius: 19px; background: #fff; box-shadow: 0 7px 22px rgb(33 49 74 / 4%); scroll-margin-top: 12px; }
.card-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.card-heading h2 { margin: 0; color: var(--text-primary, #252525); font-size: 15px; font-weight: 750; }
.year-picker { position: relative; display: inline-flex; align-items: center; padding: 0 8px; border-radius: 9px; color: var(--poliland-gold-text, #966a12); background: var(--surface-muted, #f5f3ee); }
.year-picker select { max-width: 100px; min-height: 28px; appearance: none; padding-right: 18px; border: 0; outline: 0; color: inherit; background: transparent; font: inherit; font-size: 10px; }
.year-picker ion-icon { position: absolute; right: 5px; font-size: 12px; pointer-events: none; }

.sales-highlight { display: flex; align-items: center; gap: 10px; padding: 11px; border-radius: 13px; background: var(--surface-muted, #f5f3ee); }
.highlight-icon { display: grid; width: 38px; height: 38px; flex: 0 0 auto; place-items: center; border-radius: 11px; color: #b1843b; background: #ffdfc5; font-size: 21px; }
.highlight-copy { display: grid; min-width: 0; gap: 2px; }
.highlight-copy span { color: #655b56; font-size: 10px; }
.highlight-copy strong { color: var(--text-primary, #252525); font-size: 17px; line-height: 1.1; }
.growth-chip { display: grid; gap: 2px; justify-items: end; margin-left: auto; text-align: right; }
.growth-chip span { display: inline-flex; align-items: center; gap: 2px; padding: 3px 6px; border-radius: 999px; color: var(--poliland-green, #355a2c); background: var(--status-success-bg, #e8eee4); font-size: 10px; font-weight: 700; }
.growth-chip span ion-icon { font-size: 11px; }
.growth-chip small { color: #5c6575; font-size: 8px; }
.growth-chip.negative span { color: #be3440; background: #ffe1e3; }
.chart-hint { margin: 16px 0 7px; color: var(--poliland-gold, #cba044); font-size: 10px; font-weight: 600; text-align: center; }
.sales-chart { display: grid; height: 130px; grid-template-columns: repeat(12, minmax(0, 1fr)); align-items: end; gap: 4px; }
.chart-column { position: relative; display: flex; min-width: 0; height: 100%; flex-direction: column; align-items: center; justify-content: end; gap: 5px; padding: 0; border: 0; color: #34415d; background: transparent; cursor: pointer; }
.bar-track { display: flex; width: 100%; height: 92px; align-items: end; }
.bar-track i { display: block; width: 100%; min-height: 4px; border-radius: 5px 5px 0 0; background: #ffc18f; transition: height 180ms ease, background 180ms ease; }
.chart-column.current-month .bar-track i, .chart-column.selected .bar-track i { background: #ff5b57; }
.chart-column small { font-size: 9px; }
.chart-column.current-month small { color: #f04444; }
.bar-value { position: absolute; bottom: 104px; color: #e63d42; font-size: 9px; font-weight: 700; }

.origin-content { display: grid; grid-template-columns: minmax(120px, 1fr) minmax(0, 1.55fr); align-items: center; gap: 12px; min-height: 130px; }
.origin-donut { display: grid; width: 116px; height: 116px; place-items: center; justify-self: center; border-radius: 50%; }
.origin-donut > div { display: grid; width: 76px; height: 76px; align-content: center; justify-items: center; border-radius: 50%; background: #fff; }
.origin-donut small { color: #52617a; font-size: 9px; }
.origin-donut strong { color: var(--text-primary, #252525); font-size: 21px; line-height: 1.1; }
.origin-legend { display: grid; gap: 7px; }
.origin-row { display: grid; grid-template-columns: 8px minmax(0, 1fr) 22px 30px; align-items: center; gap: 6px; color: #28374f; font-size: 10px; }
.origin-row i { width: 8px; height: 8px; border-radius: 50%; }
.origin-row span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.origin-row strong { font-size: 10px; text-align: right; }
.origin-row small { color: #53617a; font-size: 10px; text-align: right; }
.origin-empty, .activity-empty { grid-column: 1 / -1; margin: 0; color: #777; font-size: 12px; text-align: center; }
.text-action { display: inline-flex; align-items: center; gap: 2px; padding: 3px 0; border: 0; color: #bd9135; background: transparent; font: inherit; font-size: 10px; cursor: pointer; }
.text-action ion-icon { font-size: 13px; }

.activity-list { display: grid; gap: 8px; }
.activity-row { display: flex; min-width: 0; align-items: center; gap: 9px; padding: 9px; border-radius: 12px; background: var(--surface-muted, #f5f3ee); }
.activity-icon { display: grid; width: 36px; height: 36px; flex: 0 0 auto; place-items: center; border-radius: 11px; font-size: 18px; }
.tone-sold { color: var(--poliland-green, #355a2c); background: #c8f5df; }
.tone-booking { color: #bb8420; background: #ffead1; }
.tone-customer { color: #c5232c; background: #ffe2e4; }
.tone-payment { color: #53658e; background: var(--poliland-gold-soft, #f4d69a); }
.activity-copy { display: grid; min-width: 0; flex: 1; gap: 2px; }
.activity-copy strong { overflow: hidden; color: var(--text-primary, #252525); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }
.activity-copy span { overflow: hidden; color: #706761; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.activity-row time { display: inline-flex; flex: 0 0 auto; align-items: center; gap: 2px; color: #55617a; font-size: 8px; white-space: nowrap; }
.activity-row time ion-icon { font-size: 12px; }
.owner-state, .owner-error { margin: 0; padding: 13px; border-radius: 12px; background: #fff; color: #697286; font-size: 12px; text-align: center; }
.owner-error { color: #b73636; text-align: left; }
.owner-error p { margin: 4px 0 10px; overflow-wrap: anywhere; }
.owner-error button { padding: 7px 12px; border: 0; border-radius: 9px; color: #fff; background: #355a2c; font: inherit; }
.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

@media (min-width: 600px) {
  .owner-shell { gap: 20px; padding: 24px 24px 120px; }
  .inventory-grid { gap: 12px; }
  .inventory-card { padding: 14px; }
  .dashboard-card { padding: 20px; }
  .sales-chart { height: 180px; }
  .bar-track { height: 140px; }
  .bar-value { bottom: 152px; }
  .card-heading h2 { font-size: 17px; }
}

@media (max-width: 360px) {
  .owner-shell { padding-right: 12px; padding-left: 12px; }
  .logout-button { gap: 4px; padding: 0 8px; font-size: 9px; }
  .welcome-copy h1 { font-size: 23px; }
  .inventory-card { padding: 8px; }
  .inventory-card strong { font-size: 18px; }
  .sales-chart { gap: 2px; }
}
</style>
