<template>
  <ion-page class="admin-finance-page">
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />

    <ion-content :fullscreen="true">
      <main class="finance-shell">
        <nav class="finance-shortcuts" aria-label="Pintasan keuangan">
          <button type="button" class="shortcut-card shortcut-card--active" @click="activeFilter = 'pending'">
            <span class="shortcut-icon"><ion-icon :icon="documentTextOutline" aria-hidden="true" /></span>
            <strong>Verifikasi<br />Pembayaran</strong>
            <span v-if="statusCounts.pending" class="shortcut-count">{{ statusCounts.pending }}</span>
          </button>
          <button type="button" class="shortcut-card" @click="showMessage('Instruksi pembayaran akan tersedia pada tahap berikutnya.')">
            <span class="shortcut-icon"><ion-icon :icon="businessOutline" aria-hidden="true" /></span>
            <strong>Instruksi<br />Pembayaran</strong>
          </button>
          <button type="button" class="shortcut-card" @click="activeFilter = 'verified'">
            <span class="shortcut-icon"><ion-icon :icon="pieChartOutline" aria-hidden="true" /></span>
            <strong>Laporan<br />Keuangan</strong>
          </button>
          <button type="button" class="shortcut-card" @click="showMessage('Skema cicilan dikelola melalui data pembayaran customer.')">
            <span class="shortcut-icon"><ion-icon :icon="calculatorOutline" aria-hidden="true" /></span>
            <strong>Skema<br />Cicilan</strong>
          </button>
        </nav>

        <section class="finance-overview" aria-label="Ringkasan keuangan">
          <article class="overview-card overview-card--gold"><span>Menunggu</span><strong>{{ statusCounts.pending }}</strong><small>Perlu diperiksa</small></article>
          <article class="overview-card overview-card--green"><span>Terverifikasi</span><strong>{{ statusCounts.verified }}</strong><small>Pembayaran masuk</small></article>
          <article class="overview-card overview-card--danger"><span>Terlambat</span><strong>{{ statusCounts.overdue }}</strong><small>Perlu ditindaklanjuti</small></article>
        </section>

        <div class="finance-tabs" role="tablist" aria-label="Filter transaksi">
          <button v-for="filter in filters" :key="filter.value" type="button" :class="{ active: activeFilter === filter.value }" :aria-selected="activeFilter === filter.value" role="tab" @click="activeFilter = filter.value">{{ filter.label }} <span>{{ statusCounts[filter.value] }}</span></button>
        </div>

        <label class="finance-search">
          <ion-icon :icon="searchOutline" aria-hidden="true" />
          <span class="visually-hidden">Cari transaksi</span>
          <input v-model="query" type="search" placeholder="Cari nama, kode kavling, atau metode pembayaran" />
          <button v-if="query" type="button" aria-label="Hapus pencarian" @click="query = ''"><ion-icon :icon="closeOutline" aria-hidden="true" /></button>
        </label>

        <div v-if="loading" class="finance-state" role="status"><ion-spinner name="crescent" /><p>Memuat transaksi...</p></div>
        <div v-else-if="errorMessage" class="finance-state" role="alert"><ion-icon :icon="alertCircleOutline" aria-hidden="true" /><strong>Data keuangan gagal dimuat</strong><p>{{ errorMessage }}</p><AppButton size="small" @click="loadTransactions">Coba lagi</AppButton></div>
        <template v-else>
          <section v-if="filteredTransactions.length" class="transaction-list" aria-label="Daftar transaksi pembayaran">
            <article v-for="transaction in pagedTransactions" :key="transaction.id" class="transaction-card">
              <div class="transaction-head">
                <div class="customer-mark" :class="`customer-mark--${transaction.status}`">{{ initials(transaction.customerName) }}</div>
                <div class="transaction-customer"><h2>{{ transaction.customerName }}</h2><p>{{ transaction.lotCode }} · {{ transaction.paymentType }}</p></div>
                <span class="status-badge" :class="`status-badge--${transaction.status}`">{{ statusLabel(transaction.status) }}</span>
              </div>
              <div class="transaction-details"><div><span>Nominal pembayaran</span><strong>{{ formatCurrency(transaction.amount) }}</strong></div><div><span>{{ transaction.method }}</span><time :datetime="transaction.date">{{ formatDate(transaction.date) }}</time></div></div>
              <div class="transaction-actions"><button v-if="transaction.status === 'pending'" type="button" class="primary-action" @click="markVerified(transaction)"><ion-icon :icon="checkmarkCircleOutline" aria-hidden="true" /> Verifikasi</button><button v-else type="button" class="secondary-action" @click="showMessage('Detail transaksi akan tersedia pada tahap berikutnya.')"><ion-icon :icon="documentTextOutline" aria-hidden="true" /> Lihat laporan</button><button type="button" class="quiet-action" @click="showMessage('Fitur tindak lanjut transaksi sedang disiapkan.')">{{ transaction.status === 'overdue' ? 'Hubungi customer' : 'Lihat detail' }}</button></div>
            </article>
          </section>
          <nav v-if="filteredTransactions.length > 0 && totalPages > 1" class="finance-pager" aria-label="Halaman transaksi pembayaran">
            <div class="finance-pager-controls">
              <button type="button" class="finance-pager-btn" aria-label="Halaman sebelumnya" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)"><ion-icon :icon="chevronBackOutline" aria-hidden="true" /></button>
              <button v-for="page in visiblePages" :key="page ?? `ellipsis-${currentPage}`" type="button" class="finance-pager-number" :class="{ active: page === currentPage }" :disabled="page === null" :aria-current="page === currentPage ? 'page' : undefined" :aria-label="page === null ? undefined : `Halaman ${page}`" @click="page !== null && goToPage(page)">{{ page ?? '…' }}</button>
              <button type="button" class="finance-pager-btn" aria-label="Halaman berikutnya" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)"><ion-icon :icon="chevronForwardOutline" aria-hidden="true" /></button>
            </div>
            <span class="finance-pager-position">Halaman {{ currentPage }} dari {{ totalPages }}</span>
          </nav>
          <section v-if="!filteredTransactions.length" class="finance-state empty-state">
            <img class="empty-mascot" src="@/assets/mascot/MascotwithEmptyReceiptandCoins.png" alt="Mascot PoliLand membawa bukti pembayaran kosong" />
            <strong>Tidak ada transaksi</strong>
            <p>{{ query ? 'Coba ubah kata kunci pencarian.' : 'Belum ada transaksi pada kategori ini.' }}</p>
          </section>
        </template>
        <p v-if="actionMessage" class="action-message" role="status">{{ actionMessage }}</p>
      </main>
    </ion-content>
    <MobileTabBar variant="admin" />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/vue'
import { alertCircleOutline, businessOutline, calculatorOutline, checkmarkCircleOutline, chevronBackOutline, chevronForwardOutline, closeOutline, documentTextOutline, pieChartOutline, searchOutline, walletOutline } from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { customerService } from '@/services/marketing/customerService'

type FinanceStatus = 'pending' | 'verified' | 'overdue'
type FinanceTransaction = { id: string; customerName: string; lotCode: string; paymentType: string; amount: number; method: string; date: string; status: FinanceStatus }
const filters: Array<{ value: FinanceStatus; label: string }> = [{ value: 'pending', label: 'Menunggu' }, { value: 'verified', label: 'Terverifikasi' }, { value: 'overdue', label: 'Terlambat' }]
const transactions = ref<FinanceTransaction[]>([])
const activeFilter = ref<FinanceStatus>('pending')
const query = ref('')
const loading = ref(true)
const errorMessage = ref('')
const actionMessage = ref('')
const route = useRoute()
const PAGE_SIZE = 10
const currentPage = ref(1)

const statusCounts = computed(() => ({ pending: transactions.value.filter((item) => item.status === 'pending').length, verified: transactions.value.filter((item) => item.status === 'verified').length, overdue: transactions.value.filter((item) => item.status === 'overdue').length }))
const filteredTransactions = computed(() => {
  const term = query.value.trim().toLowerCase()
  return transactions.value.filter((item) => item.status === activeFilter.value && (!term || `${item.customerName} ${item.lotCode} ${item.method}`.toLowerCase().includes(term)))
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredTransactions.value.length / PAGE_SIZE)))
const pagedTransactions = computed(() => filteredTransactions.value.slice((currentPage.value - 1) * PAGE_SIZE, currentPage.value * PAGE_SIZE))
const visiblePages = computed<(number | null)[]>(() => {
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1)
  const pages: (number | null)[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) pages.push(null)
  for (let page = start; page <= end; page += 1) pages.push(page)
  if (end < total - 1) pages.push(null)
  pages.push(total)
  return pages
})

watch([filteredTransactions, totalPages], () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
  if (currentPage.value < 1) currentPage.value = 1
})
watch([query, activeFilter], () => { currentPage.value = 1 })

async function goToPage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), totalPages.value)
  if (nextPage === currentPage.value) return
  currentPage.value = nextPage
  await nextTick()
  document.querySelector('.transaction-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function formatCurrency(value: number) { return `Rp ${value.toLocaleString('id-ID')}` }
function formatDate(value: string) { return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }
function initials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() }
function statusLabel(status: FinanceStatus) { return status === 'pending' ? 'Menunggu' : status === 'verified' ? 'Terverifikasi' : 'Terlambat' }
function showMessage(message: string) { actionMessage.value = message; window.setTimeout(() => { actionMessage.value = '' }, 2800) }
function markVerified(transaction: FinanceTransaction) { transaction.status = 'verified'; showMessage('Pembayaran berhasil ditandai terverifikasi.') }

async function loadTransactions() {
  loading.value = true
  errorMessage.value = ''
  try {
    const customers = await customerService.getAdminCustomers()
    transactions.value = (customers ?? []).flatMap((customer: any) => (customer.payments ?? []).map((payment: any) => {
      const related = (customer.lot_transactions ?? []).find((item: any) => item.lot_id === payment.lot_id)
      const date = payment.payment_date || payment.created_at || customer.created_at || new Date().toISOString()
      const isLate = related?.status === 'Cancelled' || (new Date(date).getTime() < Date.now() - 1000 * 60 * 60 * 24 * 30 && related?.status !== 'Sold')
      return { id: String(payment.id), customerName: customer.full_name, lotCode: related?.lots?.lot_number || `Lot #${payment.lot_id}`, paymentType: related?.payment_type === 'Installment' ? 'Cicilan' : 'Pembayaran', amount: Number(payment.amount || 0), method: payment.payment_method || 'Metode belum tercatat', date, status: isLate ? 'overdue' : related?.status === 'Sold' ? 'verified' : 'pending' } as FinanceTransaction
    }))
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Periksa koneksi internet, lalu coba lagi.' } finally { loading.value = false }
}

onMounted(() => {
  const requestedStatus = route.query.status
  if (requestedStatus === 'pending' || requestedStatus === 'verified' || requestedStatus === 'overdue') {
    activeFilter.value = requestedStatus
  }
  void loadTransactions()
})
</script>

<style scoped>
.admin-finance-page { color: var(--text-primary); font-family: var(--font-primary); }
.finance-shell { max-width: 1120px; margin: 0 auto; padding: 22px 16px calc(112px + env(safe-area-inset-bottom)); }
.finance-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; }
.finance-kicker { margin: 0 0 4px; color: var(--poliland-gold-text); font-size: 11px; font-weight: var(--font-weight-bold); letter-spacing: .06em; text-transform: uppercase; }
.finance-header h1 { margin: 0; font-size: clamp(22px, 6vw, 32px); letter-spacing: -.03em; }
.finance-subtitle { max-width: 560px; margin: 7px 0 0; color: var(--text-secondary); font-size: 12px; line-height: 1.5; }
.overview-card span, .overview-card small, .transaction-details span { display: block; color: var(--text-secondary); font-size: 11px; }
.finance-shortcuts { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }
.shortcut-card { position: relative; display: flex; min-width: 0; min-height: 104px; flex-direction: column; align-items: flex-start; justify-content: space-between; gap: 9px; padding: 13px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); color: var(--text-primary); font: inherit; text-align: left; cursor: pointer; }
.shortcut-card--active { border-color: var(--poliland-gold); background: color-mix(in srgb, var(--poliland-gold-soft) 28%, var(--surface-primary)); }
.shortcut-icon { display: grid; width: 36px; height: 36px; place-items: center; border: 1px solid var(--poliland-gold-soft); border-radius: var(--radius-control); color: var(--poliland-gold-text); font-size: 19px; }
.shortcut-card strong { font-size: 12px; line-height: 1.25; }.shortcut-count { position: absolute; top: 12px; right: 12px; display: grid; width: 22px; height: 22px; place-items: center; border-radius: 50%; background: var(--poliland-gold); color: var(--text-primary); font-size: 10px; font-weight: var(--font-weight-bold); }
.shortcut-card:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.finance-overview { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 18px; }
.overview-card { min-width: 0; padding: 14px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.overview-card strong { display: block; margin: 7px 0 2px; font-size: 24px; }
.overview-card--gold strong { color: var(--poliland-gold-text); }.overview-card--green strong { color: var(--poliland-green); }.overview-card--danger strong { color: var(--status-danger); }
.finance-tabs { display: flex; gap: 8px; margin-top: 18px; overflow-x: auto; scrollbar-width: none; }.finance-tabs::-webkit-scrollbar { display: none; }
.finance-tabs button { min-height: 42px; padding: 0 13px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-secondary); font: inherit; font-size: 12px; font-weight: var(--font-weight-semibold); white-space: nowrap; cursor: pointer; }.finance-tabs button span { margin-left: 4px; }.finance-tabs button.active { border-color: var(--poliland-gold); background: var(--poliland-gold-soft); color: var(--text-primary); }
.finance-search { display: flex; align-items: center; gap: 9px; min-height: 46px; margin-top: 12px; padding: 0 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); }.finance-search > ion-icon { color: var(--text-secondary); font-size: 18px; }.finance-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 13px; }.finance-search button { display: grid; width: 32px; height: 32px; place-items: center; border: 0; background: transparent; color: var(--text-secondary); }
.transaction-list { display: grid; gap: 12px; margin-top: 16px; }.transaction-card { min-width: 0; padding: 15px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }.transaction-head { display: flex; align-items: center; gap: 10px; }.customer-mark { display: grid; flex: 0 0 42px; width: 42px; height: 42px; place-items: center; border-radius: 12px; font-size: 12px; font-weight: var(--font-weight-bold); }.customer-mark--pending { background: var(--poliland-gold-soft); color: var(--poliland-gold-text-soft); }.customer-mark--verified { background: var(--status-success-bg); color: var(--poliland-green); }.customer-mark--overdue { background: color-mix(in srgb, var(--status-danger) 11%, white); color: var(--status-danger); }.transaction-customer { min-width: 0; flex: 1; }.transaction-customer h2 { margin: 0; font-size: 14px; }.transaction-customer p { margin: 3px 0 0; color: var(--text-secondary); font-size: 11px; overflow-wrap: anywhere; }.status-badge { flex: 0 0 auto; padding: 5px 8px; border: 1px solid currentColor; border-radius: 999px; font-size: 10px; font-weight: var(--font-weight-semibold); }.status-badge--pending { color: var(--poliland-gold-text); background: var(--poliland-gold-soft); }.status-badge--verified { color: var(--poliland-green); background: var(--status-success-bg); }.status-badge--overdue { color: var(--status-danger); background: color-mix(in srgb, var(--status-danger) 10%, white); }
.finance-pager { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(90px, 1fr); align-items: center; gap: 14px; margin-top: 18px; padding: 16px 0 4px; border-top: 1px solid var(--border-default); }.finance-pager-controls { grid-column: 2; display: flex; align-items: center; gap: 6px; max-width: 100%; overflow-x: auto; scrollbar-width: none; padding: 3px; border: 1px solid var(--border-default); border-radius: var(--radius-panel); background: var(--surface-muted); }.finance-pager-controls::-webkit-scrollbar { display: none; }.finance-pager-btn, .finance-pager-number { min-width: 44px; height: 44px; padding: 0 10px; border: 1px solid var(--border-default); border-radius: 10px; background: var(--surface-primary); color: var(--text-primary); font: inherit; font-weight: var(--font-weight-bold); cursor: pointer; }.finance-pager-btn { display: inline-flex; align-items: center; justify-content: center; font-size: 20px; }.finance-pager-number.active { border-color: var(--poliland-green); background: var(--poliland-green); color: #fff; }.finance-pager-btn:disabled, .finance-pager-number:disabled { cursor: default; border-color: transparent; background: transparent; opacity: 1; }.finance-pager-position { grid-column: 3; color: var(--text-secondary); font-size: 12px; text-align: center; white-space: nowrap; }
.transaction-details { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-top: 14px; padding: 12px; border-radius: var(--radius-control); background: var(--surface-muted); }.transaction-details strong { display: block; margin-top: 4px; font-size: 18px; }.transaction-details time { display: block; margin-top: 4px; color: var(--text-secondary); font-size: 10px; text-align: right; }.transaction-actions { display: flex; gap: 8px; margin-top: 12px; }.transaction-actions button { min-height: 44px; padding: 0 12px; border-radius: var(--radius-control); font: inherit; font-size: 11px; font-weight: var(--font-weight-semibold); cursor: pointer; }.primary-action { display: inline-flex; flex: 1; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--poliland-green); background: var(--poliland-green); color: #fff; }.secondary-action { display: inline-flex; flex: 1; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--border-default); background: var(--surface-primary); color: var(--text-primary); }.quiet-action { border: 1px solid var(--border-default); background: var(--surface-primary); color: var(--text-secondary); }.action-message { position: fixed; right: 16px; bottom: calc(94px + env(safe-area-inset-bottom)); left: 16px; z-index: 9000; margin: 0 auto; max-width: 520px; padding: 12px 14px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); box-shadow: 0 8px 24px rgb(37 37 37 / 15%); color: var(--text-primary); font-size: 12px; text-align: center; }.finance-state { display: flex; flex-direction: column; align-items: center; gap: 9px; margin-top: 16px; padding: 34px 18px; border: 1px dashed var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); text-align: center; }.finance-state ion-icon, .finance-state ion-spinner { color: var(--poliland-green); font-size: 28px; }.finance-state strong { font-size: 14px; }.finance-state p { max-width: 390px; margin: 0; color: var(--text-secondary); font-size: 12px; line-height: 1.5; }.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; clip-path: inset(50%); }
button:focus-visible, input:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
@media (max-width: 600px) { .finance-header { align-items: stretch; flex-direction: column; gap: 12px; }.finance-shortcuts { display: flex; gap: 8px; overflow-x: auto; margin-inline: -16px; padding: 0 16px 3px; scrollbar-width: none; }.finance-shortcuts::-webkit-scrollbar { display: none; }.shortcut-card { flex: 0 0 132px; }.finance-overview { grid-template-columns: repeat(3, minmax(0, 1fr)); }.overview-card { padding: 11px; }.overview-card strong { font-size: 20px; }.transaction-actions { flex-wrap: wrap; }.primary-action, .secondary-action { flex: 1 1 100%; }.quiet-action { flex: 1 1 100%; }.finance-pager { grid-template-columns: 1fr; gap: 8px; }.finance-pager-controls { grid-column: 1; justify-self: center; }.finance-pager-position { grid-column: 1; } }
@media (max-width: 360px) { .finance-overview { gap: 6px; }.overview-card { padding: 9px; }.overview-card span, .overview-card small { font-size: 10px; }.overview-card strong { font-size: 18px; }.transaction-details { align-items: flex-start; flex-direction: column; }.transaction-details time { text-align: left; } }
</style>
