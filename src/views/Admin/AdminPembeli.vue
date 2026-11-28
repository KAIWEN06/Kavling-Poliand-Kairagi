<template>
  <ion-page class="admin-buyers-page">
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />

    <AppPullRefresh scoped :refresh-handler="refreshCustomers" />

    <ion-content :fullscreen="true">
      <main class="buyers-content">
        <div class="buyers-filters" role="group" aria-label="Filter klien">
          <button
            v-for="filter in filters"
            :key="filter.value"
            type="button"
            :class="['buyers-filter', { active: selectedFilter === filter.value }]"
            @click="selectedFilter = filter.value"
          >
            {{ filter.label }} <span>{{ filterCount(filter.value) }}</span>
          </button>
        </div>

        <div class="buyers-search">
          <ion-icon :icon="searchOutline" aria-hidden="true" />
          <input v-model="query" type="search" placeholder="Cari nama, nomor HP, atau kaveling..." />
          <button v-if="query" type="button" aria-label="Hapus pencarian" @click="query = ''">
            <ion-icon :icon="closeOutline" aria-hidden="true" />
          </button>
        </div>

        <SkeletonCardList v-if="loading || refreshing" :count="5" :lines="3" label="Memuat klien" />

        <div v-else-if="errorMessage" class="buyers-state" role="alert">
          <ion-icon :icon="alertCircleOutline" aria-hidden="true" />
          <strong>Data klien gagal dimuat</strong>
          <p>{{ errorMessage }}</p>
          <AppButton size="small" @click="loadCustomers()">Coba lagi</AppButton>
        </div>

        <template v-else>
          <div class="buyers-list-head">
            <h2>Daftar klien</h2>
            <span>{{ filteredCustomers.length }}</span>
          </div>

          <section v-if="filteredCustomers.length" id="buyers-list-top" class="buyers-list" aria-label="Daftar klien">
            <article v-for="customer in pager.items" :key="customer.id" class="buyer-card" tabindex="0" @click="openCustomer(customer.id)" @keydown.enter.self="openCustomer(customer.id)">
              <div :class="['buyer-avatar', customer.tone]">{{ initials(customer.full_name) }}</div>
              <div class="buyer-details">
                <h3>{{ customer.full_name }}</h3>
                <p>Telepon: {{ customer.phone || '—' }}</p><p>WhatsApp: {{ customer.whatsapp_phone || '—' }}</p>
                <small>{{ customer.statusLabel }} · {{ formatDate(customer.created_at) }}</small>
                <small v-if="customer.registrationSource" class="buyer-source">
                  <ion-icon :icon="personOutline" aria-hidden="true" /> Asal data: {{ customer.registrationSource }}
                </small>
                <small v-if="customer.source" class="buyer-source">Pemasar: {{ customer.source }}</small>
              </div>
              <span :class="['buyer-status', customer.tone]">{{ customer.statusLabel }}</span>
              <ion-icon class="buyer-chevron" :icon="chevronForwardOutline" aria-hidden="true" />
            </article>
          </section>

          <div v-else-if="!filteredCustomers.length" class="buyers-state">
            <ion-icon :icon="peopleOutline" aria-hidden="true" />
            <strong>Klien tidak ditemukan</strong>
            <p>Coba ubah kata kunci atau filter yang dipilih.</p>
          </div>

          <AppPagination v-model:page="pager.page" :total-pages="pager.totalPages" :total="pager.total" :page-size="pager.pageSize" scroll-to="#buyers-list-top" label="Halaman daftar klien" />

          <button
            type="button"
            class="buyers-add buyers-add-floating"
            aria-label="Tambah klien"
            title="Tambah klien"
            @click="openAddCustomer"
          >
            <ion-icon :icon="addOutline" aria-hidden="true" />
          </button>
        </template>
      </main>
    </ion-content>

    <MobileTabBar variant="admin" />

    <AppModal
      v-model="deleteModalOpen"
      title="Hapus data pembeli"
      variant="dialog"
      :loading="deleteChecking || deleteSaving"
      :confirm-disabled="!deleteChecked || deleteUsages.length > 0 || deleteChecking || deleteSaving || Boolean(deleteError)"
      confirm-text="Hapus data"
      confirm-variant="danger"
      slide-confirm
      slide-label="Geser untuk menghapus"
      cancel-text="Batal"
      @confirm="confirmDeleteCustomer"
      @cancel="closeDeleteConfirmation"
      @close="closeDeleteConfirmation"
    >
      <div class="customer-delete-check">
        <p v-if="deleteChecking" role="status" aria-live="polite">
          Memeriksa...
        </p>
        <AppNotice v-else-if="deleteError" tone="error">
          <p>Data belum dihapus. Pemeriksaan atau penghapusan gagal: {{ deleteError }}</p>
          <AppButton size="small" @click="checkDeleteEligibility">Periksa lagi</AppButton>
        </AppNotice>
        <div v-else-if="deleteUsages.length" role="alert">
          <div class="customer-delete-usage-alert">
            <img :src="worriedMascot" alt="Maskot khawatir karena data pembeli masih terhubung" />
            <div>
              <strong>Data pembeli masih memiliki relasi atau riwayat sehingga tidak dapat dihapus.</strong>
              <ul>
                <li v-for="usage in deleteUsages" :key="usage.label">
                  {{ usage.label }} ({{ usage.count }})
                </li>
              </ul>
              <p>Minat kaveling, catatan, tindak lanjut, transaksi, pembayaran, riwayat catatan, dan hubungan kaveling harus tetap dipertahankan.</p>
            </div>
          </div>
        </div>
        <div v-else-if="deleteChecked" class="customer-delete-ready">
          <img :src="panickedMascot" alt="Maskot memperingatkan penghapusan data pembeli" />
          <p>Penghapusan data ini tidak dapat dibatalkan.</p>
        </div>
      </div>
    </AppModal>

    <AppModal
      guard-unsaved
      v-model="addModalOpen"
      title="Tambah klien"
      variant="bottom-sheet"
      :loading="addSaving"
      confirm-text="Simpan klien"
      cancel-text="Batal"
      :max-height="'92dvh'"
      @confirm="saveNewCustomer"
      @cancel="closeAddCustomer"
      @close="closeAddCustomer"
    >
      <form @submit.prevent="saveNewCustomer">
        <ClientForm
          v-model="addForm"
          :assignee="addRules.assignee"
          :interest="addRules.interest"
          :members="marketingOptions"
          :members-error="marketingError"
          :lots="addAvailableLots"
          :lots-loading="addLotsLoading"
          :lots-error="addLotsError"
          :plans="addPlans"
          :plans-loading="addPlansLoading"
          :error="addError"
          @retry-lots="loadAddAvailableLots"
        />
      </form>
    </AppModal>
  </ion-page>
</template>

<script setup lang="ts">
import { useRealtimeRefresh } from '@/composables/useRealtimeRefresh'
import AppNotice from '@/components/ui/AppNotice.vue'
import SkeletonCardList from '@/components/ui/skeletons/SkeletonCardList.vue'
import { withRefreshSkeleton } from '@/utils/refreshSkeleton'
import { computed, onMounted, ref, watch } from 'vue'
import { useOwnRouteQuery } from '@/composables/useOwnRouteQuery'
import AppPagination from '@/components/ui/AppPagination.vue'
import { usePagination } from '@/composables/usePagination'
import { useIonRouter, IonContent, IonIcon, IonPage } from '@ionic/vue'
import {
  addOutline,
  alertCircleOutline,
  chevronForwardOutline,
  closeOutline,
  peopleOutline,
  personOutline,
  searchOutline,
} from 'ionicons/icons'
import AppPullRefresh from '@/components/common/AppPullRefresh.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { customerService } from '@/services/marketing/customerService'
import ClientForm from '@/components/client-form/ClientForm.vue'
import { useToast } from '@/composables/useToast'
import {
  clientDraftColumns,
  clientDraftInterests,
  emptyClientDraft,
  validateClientDraft,
  type ClientDraftRules,
} from '@/utils/clientDraft'
import worriedMascot from '@/assets/mascot/Worried Mascot and Locked Property Link.webp'
import panickedMascot from '@/assets/mascot/Panicked Mascot and Trash Can Mishap.webp'

type FilterValue = 'all' | 'prospect' | 'follow-up' | 'reviewed' | 'buyer'
type Customer = {
  id: number
  full_name: string
  phone: string | null
  whatsapp_phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string | null
  statusLabel: 'Prospek' | 'Tindak Lanjut' | 'Ditinjau' | 'Pembeli'
  source: string | null
  registrationSource: string | null
  tone: 'mint' | 'gold' | 'rose' | 'blue'
  interests: Interest[]
  transactions: Transaction[]
}
type Interest = { id: number; lotNumber: string; block: string; paymentType: string }
type Transaction = { id: number; lotNumber: string; block: string; status: string; paymentType: string; finalPrice: number | null }

const router = useIonRouter()
const routeQuery = useOwnRouteQuery()
const customers = ref<Customer[]>([])
const query = ref('')
const selectedFilter = ref<FilterValue>('all')
const loading = ref(true)
const refreshing = ref(false)
const errorMessage = ref('')
const deleteTarget = ref<Customer | null>(null)
const deleteModalOpen = ref(false)
const deleteChecking = ref(false)
const deleteSaving = ref(false)
const deleteChecked = ref(false)
const deleteError = ref('')
const deleteUsages = ref<Array<{ label: string; count: number }>>([])
let deleteCheckSequence = 0
const filters: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'prospect', label: 'Calon Pembeli' },
  { value: 'follow-up', label: 'Tindak Lanjut' },
  { value: 'reviewed', label: 'Ditinjau' },
  { value: 'buyer', label: 'Pembeli' },
]

const filteredCustomers = computed(() => {
  const term = query.value.trim().toLowerCase()
  return customers.value.filter((customer) => {
    const matchesFilter = selectedFilter.value === 'all' ||
      (selectedFilter.value === 'prospect' && customer.statusLabel === 'Prospek') ||
      (selectedFilter.value === 'follow-up' && customer.statusLabel === 'Tindak Lanjut') ||
      (selectedFilter.value === 'reviewed' && customer.statusLabel === 'Ditinjau') ||
      (selectedFilter.value === 'buyer' && customer.statusLabel === 'Pembeli')
    const matchesQuery = !term || [customer.full_name, customer.phone, customer.email, customer.registrationSource, customer.source].filter(Boolean).join(' ').toLowerCase().includes(term)
    return matchesFilter && matchesQuery
  })
})

const pager = usePagination(filteredCustomers, {
  pageSize: 10,
  resetOn: [query, selectedFilter],
})

function filterCount(filter: FilterValue) {
  if (filter === 'all') return customers.value.length
  const labels: Record<Exclude<FilterValue, 'all'>, Customer['statusLabel']> = {
    prospect: 'Prospek',
    'follow-up': 'Tindak Lanjut',
    reviewed: 'Ditinjau',
    buyer: 'Pembeli',
  }
  return customers.value.filter((customer) => customer.statusLabel === labels[filter as Exclude<FilterValue, 'all'>]).length
}

function initials(name: string) {
  return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase()
}

function formatDate(value: string | null) {
  if (!value) return 'Tanggal belum tercatat'
  return new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
}

function hasTransactionAndPayment(row: any) {
  const transactions = row.lot_transactions ?? []
  const payments = row.payments ?? []
  return transactions.some((transaction: any) =>
    payments.some((payment: any) =>
      Number(payment.transaction_id) === Number(transaction.id)
    )
  )
}

function blockLabel(block: any) {
  return block?.name || block?.code || 'Blok belum tercatat'
}

function refreshCustomers() {
  return withRefreshSkeleton(refreshing, () => loadCustomers(true))
}

async function loadCustomers(silent = false, background = false) {
  if (!silent) loading.value = true
  if (!background) errorMessage.value = ''
  try {
    const rows = await customerService.getAdminCustomers()
    errorMessage.value = ''
    customers.value = (rows ?? []).map((row: any) => ({
      id: row.id,
      full_name: row.full_name,
      phone: row.phone ?? null,
      whatsapp_phone: row.whatsapp_phone ?? null,
      email: row.email ?? null,
      address: row.address ?? null,
      notes: row.notes ?? null,
      created_at: row.created_at ?? null,
      statusLabel: row.lot_transactions?.some((transaction: any) => transaction.status === 'Sold')
        ? 'Pembeli'
        : hasTransactionAndPayment(row)
          ? 'Ditinjau'
          : row.customer_notes?.length || row.customer_interests?.length
            ? 'Tindak Lanjut'
            : 'Prospek',
      source: row.marketing?.full_name || null,
      registrationSource: row.registration_source === 'Marketing'
        ? 'Pemasar'
        : row.registration_source === 'Admin'
          ? 'Admin'
          : row.registration_source === 'Client'
            ? 'Klien'
            : 'Tidak tercatat',
      tone: row.lot_transactions?.some((transaction: any) => transaction.status === 'Sold')
        ? 'mint'
        : hasTransactionAndPayment(row)
          ? 'blue'
          : 'gold',
      interests: (row.customer_interests ?? []).map((interest: any) => ({
        id: interest.id,
        lotNumber: interest.lots?.lot_number || `Kavling #${interest.lot_id}`,
        block: blockLabel(interest.lots?.blocks),
        paymentType: interest.payment_type === 'Installment' ? 'Cicilan' : 'Cash',
      })),
      transactions: (row.lot_transactions ?? []).map((transaction: any) => ({
        id: transaction.id,
        lotNumber: transaction.lots?.lot_number || `Kavling #${transaction.lot_id}`,
        block: blockLabel(transaction.lots?.blocks),
        status: transaction.status,
        paymentType: transaction.payment_type === 'Installment' ? 'Cicilan' : 'Cash',
        finalPrice: transaction.final_price ?? null,
      })),
    }))
  } catch (error) {
    if (!background || !customers.value.length) errorMessage.value = error instanceof Error ? error.message : 'Periksa koneksi internet, lalu coba lagi.'
  } finally {
    loading.value = false
  }
}

function openDeleteConfirmation(customer: Customer) {
  deleteTarget.value = customer
  deleteModalOpen.value = true
  void checkDeleteEligibility()
}

async function checkDeleteEligibility() {
  const target = deleteTarget.value
  if (!target) return

  const sequence = ++deleteCheckSequence
  deleteChecking.value = true
  deleteChecked.value = false
  deleteError.value = ''
  deleteUsages.value = []

  try {
    const usages = await customerService.getCustomerUsage(target.id)
    if (sequence !== deleteCheckSequence || deleteTarget.value?.id !== target.id) return
    deleteUsages.value = usages
    deleteChecked.value = true
  } catch (error) {
    if (sequence !== deleteCheckSequence || deleteTarget.value?.id !== target.id) return
    deleteError.value = error instanceof Error ? error.message : 'Periksa koneksi dan coba lagi.'
  } finally {
    if (sequence === deleteCheckSequence) deleteChecking.value = false
  }
}

function closeDeleteConfirmation() {
  deleteCheckSequence += 1
  deleteTarget.value = null
  deleteChecking.value = false
  deleteChecked.value = false
  deleteError.value = ''
  deleteUsages.value = []
}

async function confirmDeleteCustomer() {
  const target = deleteTarget.value
  if (!target || !deleteChecked.value || deleteUsages.value.length || deleteError.value || deleteSaving.value) return

  deleteSaving.value = true
  deleteError.value = ''

  try {
    await customerService.deleteCustomer(target.id)
    customers.value = customers.value.filter((customer) => customer.id !== target.id)
    deleteModalOpen.value = false
    deleteTarget.value = null
    deleteChecked.value = false
    deleteUsages.value = []
  } catch (error) {
    deleteError.value = error instanceof Error ? error.message : 'Data pembeli gagal dihapus. Periksa koneksi dan coba lagi.'
  } finally {
    deleteSaving.value = false
  }
}

const addModalOpen = ref(false)
const addSaving = ref(false)
const addError = ref('')
const addLotsLoading = ref(false)
const addLotsError = ref('')
const addAvailableLots = ref<any[]>([])
const addPlans = ref<any[]>([])
const addPlansLoading = ref(false)
const marketingOptions = ref<Array<{ id: string; full_name: string | null }>>([])
const marketingError = ref('')
const addRules: ClientDraftRules = { assignee: 'optional', interest: 'optional' }
const addForm = ref(emptyClientDraft())

function resetAddForm() {
  addForm.value = emptyClientDraft()
  addError.value = ''
  addLotsError.value = ''
}

async function loadAddAvailableLots() {
  addLotsLoading.value = true
  addLotsError.value = ''

  try {
    addAvailableLots.value = await customerService.getAvailableLots()
  } catch (error) {
    addLotsError.value = error instanceof Error
      ? error.message
      : 'Daftar kaveling tersedia gagal dimuat.'
  } finally {
    addLotsLoading.value = false
  }
}

async function loadAddPlans() {
  addPlansLoading.value = true
  try {
    addPlans.value = (await customerService.getPaymentPlans()) ?? []
  } catch (error) {
    addPlans.value = []
    addError.value = error instanceof Error ? `Pilihan tenor gagal dimuat: ${error.message}` : 'Pilihan tenor gagal dimuat.'
  } finally {
    addPlansLoading.value = false
  }
}

async function loadMarketingOptions() {
  marketingError.value = ''

  try {
    marketingOptions.value = await customerService.getMarketingOptions()
  } catch (error) {
    marketingOptions.value = []
    marketingError.value = error instanceof Error
      ? `Daftar pemasar gagal dimuat: ${error.message}`
      : 'Daftar pemasar gagal dimuat.'
  }
}

async function openAddCustomer() {
  resetAddForm()
  addModalOpen.value = true
  await Promise.all([loadAddAvailableLots(), loadAddPlans(), loadMarketingOptions()])
}

function closeAddCustomer() {
  if (addSaving.value) return
  addModalOpen.value = false
  resetAddForm()
}

async function saveNewCustomer() {
  if (addSaving.value) return

  const draft = addForm.value
  addError.value = validateClientDraft(draft, addRules) ?? ''
  if (addError.value) return

  if (draft.lot_ids.some((id) => !addAvailableLots.value.some((lot) => Number(lot.id) === id))) {
    addError.value = 'Ada kaveling yang sudah tidak tersedia. Muat ulang daftar kaveling.'
    return
  }

  addSaving.value = true

  try {
    const customer = await customerService.createCustomer({
      customer: { ...clientDraftColumns(draft), marketing_id: draft.marketing_id || null },
      interests: clientDraftInterests(draft),
    })

    useToast().success('Klien tersimpan.', { to: `/admin/pembeli/${customer.id}`, actionLabel: 'Lihat klien' })

    addModalOpen.value = false
    resetAddForm()
    await loadCustomers()
  } catch (error) {
    const message = (error as { message?: string })?.message
    addError.value = message
      ? `Klien belum berhasil ditambahkan: ${message}`
      : 'Klien belum berhasil ditambahkan. Periksa koneksi lalu coba lagi.'
  } finally {
    addSaving.value = false
  }
}

function openCustomer(id: number) {
  router.push(`/admin/pembeli/${id}`)
}

onMounted(() => loadCustomers())

// Aksi cepat di Beranda membuka formulir lewat ?action=tambah. nt membedakan tiap ketukan.
watch(
  () => routeQuery.value.nt,
  () => {
    if (routeQuery.value.action === 'tambah' && !addModalOpen.value) void openAddCustomer()
  },
  { immediate: true },
)

useRealtimeRefresh(
  ['customers', 'customer_interests', 'customer_notes', 'lot_transactions', 'payments', 'lots'],
  () => loadCustomers(true, true),
  { pauseWhen: () => addSaving.value || deleteSaving.value || deleteModalOpen.value },
)

</script>

<style scoped>
.admin-buyers-page { --buyers-bg: var(--app-background); font-family: var(--font-primary); color: var(--text-primary); }
.buyers-content { min-height: 100%; padding: 22px 16px calc(112px + var(--safe-bottom)); background: var(--buyers-bg); }
.buyers-intro h1 { margin: 0; font-size: 24px; letter-spacing: -0.5px; font-weight: var(--font-weight-extrabold); }
.buyers-intro p { max-width: 340px; margin: 6px 0 18px; color: var(--text-secondary); font-size: 13px; line-height: 1.55; }
.buyers-filters { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; margin: 0 -16px 14px; padding: 0 16px 2px; }
.buyers-filters::-webkit-scrollbar { display: none; }
.buyers-filter { min-height: 40px; padding: 0 13px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 12px; white-space: nowrap; }
.buyers-filter span { margin-left: 4px; color: var(--text-secondary); }
.buyers-filter.active { border-color: var(--poliland-gold); background: var(--poliland-gold-soft); color: var(--text-primary); }
.buyers-filter.active span { color: var(--poliland-gold-text-soft); }
.buyers-search { display: flex; align-items: center; gap: 9px; min-height: 46px; padding: 0 10px 0 13px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); }
.buyers-search > ion-icon { color: var(--text-secondary); font-size: 18px; }
.buyers-search input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 16px; }
.buyers-search button { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 0; background: transparent; color: var(--text-secondary); }
.buyers-list-head { display: flex; align-items: center; justify-content: space-between; margin: 22px 0 10px; }
.buyers-list-head h2 { margin: 0; font-size: 16px; font-weight: var(--font-weight-bold); }
.buyers-list-head span { color: var(--text-secondary); font-size: 12px; font-weight: var(--font-weight-bold); }
.buyers-list { display: grid; gap: 12px; }
.buyer-card { display: grid; grid-template-columns: 44px minmax(0, 1fr) auto 12px; align-items: center; gap: 10px; padding: 14px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.buyer-avatar { display: grid; place-items: center; width: 42px; height: 42px; border-radius: 50%; font-size: 13px; font-weight: var(--font-weight-bold); }
.buyer-avatar.mint, .buyer-status.mint { background: var(--status-success-bg); color: var(--poliland-green); }
.buyer-avatar.gold, .buyer-status.gold { background: var(--poliland-gold-soft); color: var(--poliland-gold-text-soft); }
.buyer-avatar.rose, .buyer-status.rose { background: color-mix(in srgb, var(--status-danger) 11%, white); color: var(--status-danger); }
.buyer-avatar.blue, .buyer-status.blue { background: color-mix(in srgb, var(--poliland-green) 10%, white); color: var(--poliland-green); }
.buyer-details { min-width: 0; }
.buyer-details h3 { margin: 0 0 2px; font-size: 14px; font-weight: var(--font-weight-bold); }
.buyer-details p, .buyer-details small { display: block; margin: 0; color: var(--text-secondary); font-size: 11px; line-height: 1.5; }
.buyer-source { color: var(--poliland-gold-text-soft) !important; }
.buyer-source ion-icon { vertical-align: -2px; }
.buyer-status { align-self: start; padding: 5px 8px; border-radius: 999px; font-size: 10px; font-weight: var(--font-weight-bold); white-space: nowrap; }
.buyer-chevron { color: var(--text-secondary); font-size: 18px; }
.buyer-card:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.buyer-detail { margin-top: 14px; padding: 16px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.buyer-detail-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.buyer-detail-kicker { color: var(--poliland-gold-text); font-size: 10px; font-weight: var(--font-weight-bold); letter-spacing: .4px; text-transform: uppercase; }
.buyer-detail h2 { margin: 4px 0 0; font-size: 18px; }
.buyer-detail-head button { display: grid; place-items: center; width: 36px; height: 36px; border: 0; border-radius: 50%; background: var(--surface-muted); color: var(--text-secondary); }
.buyer-detail-grid { display: grid; gap: 8px; margin-top: 14px; }
.buyer-detail-grid p { margin: 0; color: var(--text-secondary); font-size: 12px; line-height: 1.45; }
.buyer-detail-grid strong { display: block; margin-bottom: 2px; color: var(--text-primary); font-size: 11px; }
.buyer-detail-section { margin-top: 16px; padding-top: 12px; border-top: 1px solid var(--border-default); }
.buyer-detail-section h3 { margin: 0 0 8px; font-size: 13px; }
.buyer-detail-section ul { display: grid; gap: 7px; margin: 0; padding-left: 18px; color: var(--text-secondary); font-size: 12px; }
.buyer-detail-section li small { display: block; margin-top: 2px; color: var(--text-secondary); }
.buyer-detail-muted { margin: 0; color: var(--text-secondary); font-size: 12px; }
.buyers-add { margin-top: 16px; --border-radius: var(--radius-control); }
.buyers-add ion-icon { margin-right: 5px; font-size: 19px; }
.buyers-add-floating {
  position: fixed;
  right: 16px;
  bottom: calc(92px + var(--safe-bottom));
  z-index: 9000;
  display: grid;
  place-items: center;
  width: 52px;
  height: 52px;
  margin: 0;
  min-height: 52px;
  padding: 0;
  border: 0;
  border-radius: 50%;
  appearance: none;
  --border-radius: 50%;
  background: var(--poliland-green);
  color: #fff;
  font: inherit;
  cursor: pointer;
  box-shadow: 0 8px 20px rgb(37 37 37 / 16%);
}
.buyers-add-floating ion-icon { margin: 0; font-size: 24px; }
.buyers-add-floating:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 3px; }
.buyers-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 38px 18px; text-align: center; border: 1px dashed var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.buyers-state ion-icon { font-size: 28px; color: var(--poliland-green); }
.buyers-state p { margin: 0; color: var(--text-secondary); font-size: 13px; }
@media (max-width: 360px) {
  .buyer-card { grid-template-columns: 40px minmax(0, 1fr) 12px; gap: 8px; }
  .buyer-status { grid-column: 2; justify-self: start; grid-row: 2; }
  .buyers-add-floating { right: 12px; }}

.customer-delete-check { display: grid; gap: 10px; color: var(--text-primary); font-size: 13px; line-height: 1.55; }
.customer-delete-check p { margin: 0; }
.customer-delete-check ul { display: grid; gap: 4px; margin: 0; padding-left: 20px; }
.customer-delete-usage-alert { display: grid; grid-template-columns: 84px minmax(0, 1fr); align-items: center; gap: 12px; }
.customer-delete-usage-alert img { display: block; width: 84px; height: 84px; object-fit: contain; }
.customer-delete-usage-alert > div { display: grid; gap: 8px; min-width: 0; }
.customer-delete-usage-alert ul { margin: 0; }

.customer-delete-ready { display: grid; justify-items: center; gap: 8px; text-align: center; }
.customer-delete-ready img { display: block; width: 100px; height: 100px; object-fit: contain; }
</style>
