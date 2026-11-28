<template>
  <ion-page class="pl-admin admin-buyers-page">
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />

    <AppPullRefresh scoped :refresh-handler="refreshCustomers" />

    <ion-content :fullscreen="true">
      <div class="page-wrap">
      <main class="buyers-content">
        <div class="buyers-search">
          <ion-icon :icon="searchOutline" aria-hidden="true" />
          <input v-model="query" type="search" placeholder="Cari nama, nomor HP, atau kaveling..." />
          <button v-if="query" type="button" aria-label="Hapus pencarian" @click="query = ''">
            <ion-icon :icon="closeOutline" aria-hidden="true" />
          </button>
        </div>

        <div class="buyers-filters" role="group" aria-label="Filter klien">
          <button
            v-for="filter in filters"
            :key="filter.value"
            type="button"
            :class="['buyers-filter', { active: selectedFilter === filter.value }]"
            :aria-pressed="selectedFilter === filter.value"
            @click="selectedFilter = filter.value"
          >
            {{ filter.label }} <span>{{ filterCount(filter.value) }}</span>
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
          <SectionHeader title="Daftar klien">
            <span class="buyers-count">{{ filteredCustomers.length }} klien</span>
          </SectionHeader>

          <section v-if="filteredCustomers.length" id="buyers-list-top" class="buyers-list" aria-label="Daftar klien">
            <article v-for="customer in pager.items" :key="customer.id" class="buyer-card" tabindex="0" @click="openCustomer(customer.id)" @keydown.enter.self="openCustomer(customer.id)">
              <div :class="['buyer-avatar', customer.tone]">{{ initials(customer.full_name) }}</div>
              <div class="buyer-details">
                <h3>{{ customer.full_name }}</h3>
                <p>Telepon: {{ customer.phone || '—' }}</p><p>WhatsApp: {{ customer.whatsapp_phone || '—' }}</p>
                <small>Terdaftar: {{ formatDate(customer.created_at) }}</small>
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
            <img class="buyers-empty-mascot" :src="noResultsMascot" alt="Maskot pencarian tanpa hasil" />
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
        <div v-if="!loading && !refreshing && !errorMessage" class="page-footer" aria-hidden="true">
          <SceneBackdrop class="page-footer__scene" height="100%" :sway="false" />
        </div>
      </div>
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
import SectionHeader from '@/components/ui/SectionHeader.vue'
import SceneBackdrop from '@/components/ui/SceneBackdrop.vue'
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
import noResultsMascot from '@/assets/mascot/3D Mascot Search_ No Results.png'

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
ion-content { --padding-bottom: 0px; }
.admin-buyers-page { font-family: var(--font-ui, var(--font-primary)); color: var(--text-primary); }
.page-wrap { display: flex; flex-direction: column; min-height: 100%; }
.page-footer { position: relative; flex: 0 0 auto; margin-top: auto; height: calc(200px + var(--safe-bottom)); overflow: hidden; background: linear-gradient(180deg, var(--surface-primary, #fff) 0%, var(--pl-paper, #f9f5ec) 55%); }
.page-footer__scene :deep(.sun) { top: 0; right: -90px; width: 260px; height: 200px; background: radial-gradient(closest-side, rgba(244, 214, 154, 0.7), rgba(244, 214, 154, 0)); }
.buyers-content { flex: 1 0 auto; padding: 16px 20px 24px; background: var(--surface-primary); }

.buyers-search { display: flex; align-items: center; gap: 9px; min-height: 52px; padding: 0 4px 0 14px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); }
.buyers-search:focus-within { border-color: var(--poliland-green); outline: 2px solid var(--poliland-green); outline-offset: 1px; }
.buyers-search > ion-icon { flex-shrink: 0; color: var(--text-secondary); font-size: 20px; }
.buyers-search input { min-width: 0; width: 100%; flex: 1; border: 0; outline: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 16px; }
.buyers-search button { display: inline-flex; flex-shrink: 0; align-items: center; justify-content: center; width: 44px; height: 44px; border: 0; background: transparent; color: var(--text-secondary); font-size: 20px; }

/* Bar angka seperti beranda: nilai di atas label, bisa digeser. */
.buyers-filters { display: flex; margin: 14px 0 28px; padding: 4px; overflow-x: auto; scrollbar-width: none; border: 1px solid var(--border-default); border-radius: 12px; background: var(--surface-primary); box-shadow: var(--shadow-sm); }
.buyers-filters::-webkit-scrollbar { display: none; }
.buyers-filter { display: flex; flex: 1 0 76px; flex-direction: column-reverse; align-items: center; justify-content: flex-end; gap: 2px; min-height: 58px; padding: 8px 4px; border: 0; border-radius: 9px; background: transparent; color: var(--text-secondary); font: inherit; font-size: 12px; line-height: 1.3; cursor: pointer; }
.buyers-filter + .buyers-filter { box-shadow: -1px 0 0 var(--border-default); }
.buyers-filter span { color: var(--poliland-green); font-family: var(--font-display, 'Fraunces Variable', Georgia, serif); font-size: 20px; font-weight: 650; line-height: 1.1; font-variant-numeric: tabular-nums; }
.buyers-filter.active { background: var(--green-50, #eef3ea); color: var(--poliland-green); font-weight: var(--font-weight-bold); box-shadow: inset 0 -3px 0 var(--poliland-green); }
.buyers-filter:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: -3px; }

.buyers-count { color: var(--text-secondary); font-size: 13px; font-weight: 600; white-space: nowrap; font-variant-numeric: tabular-nums; }

.buyers-list { display: grid; gap: 12px; }
.buyer-card { display: grid; grid-template-columns: 44px minmax(0, 1fr) 18px; align-items: center; column-gap: 12px; row-gap: 8px; padding: 14px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); box-shadow: var(--shadow-sm); cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; }
.buyer-card:active { transform: scale(0.98); }
.buyer-card:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.buyer-avatar { grid-column: 1; grid-row: 1; align-self: start; display: grid; place-items: center; width: 44px; height: 44px; border-radius: 14px; font-size: 14px; font-weight: var(--font-weight-bold); }
.buyer-avatar.mint, .buyer-status.mint, .buyer-avatar.blue, .buyer-status.blue { background: var(--green-50, #eef3ea); color: var(--poliland-green); }
.buyer-avatar.gold, .buyer-status.gold { background: var(--gold-50, #fbf5e6); color: var(--poliland-gold-text); }
.buyer-avatar.rose, .buyer-status.rose { background: color-mix(in srgb, var(--status-danger) 11%, white); color: color-mix(in srgb, var(--status-danger) 70%, black); }
.buyer-details { grid-column: 2; grid-row: 1; min-width: 0; overflow-wrap: anywhere; }
.buyer-details h3 { margin: 0 0 3px; font-size: 15px; font-weight: var(--font-weight-bold); }
.buyer-details p, .buyer-details small { display: block; margin: 0; color: var(--text-secondary); font-size: 12px; line-height: 1.55; }
.buyer-source { color: var(--poliland-gold-text) !important; }
.buyer-source ion-icon { vertical-align: -2px; }
.buyer-status { grid-column: 2; grid-row: 2; justify-self: start; padding: 4px 10px; border-radius: 999px; font-size: 12px; font-weight: var(--font-weight-bold); white-space: nowrap; }
.buyer-chevron { grid-column: 3; grid-row: 1 / span 2; color: var(--text-secondary); font-size: 18px; }

.buyers-add-floating { position: fixed; right: 16px; bottom: calc(92px + var(--safe-bottom)); z-index: 9000; display: grid; place-items: center; width: 52px; height: 52px; margin: 0; padding: 0; border: 0; border-radius: 50%; appearance: none; background: var(--poliland-green); color: #fff; cursor: pointer; box-shadow: var(--shadow-md); }
.buyers-add-floating ion-icon { font-size: 24px; }
.buyers-add-floating:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 3px; }
.buyers-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 38px 8px; text-align: center; }
.buyers-state ion-icon { font-size: 28px; color: var(--poliland-green); }
.buyers-empty-mascot { display: block; width: min(180px, 70%); height: 140px; object-fit: contain; }
.buyers-state p { margin: 0; color: var(--text-secondary); font-size: 13px; }

.customer-delete-check { display: grid; gap: 10px; color: var(--text-primary); font-size: 13px; line-height: 1.55; }
.customer-delete-check p { margin: 0; }
.customer-delete-check ul { display: grid; gap: 4px; margin: 0; padding-left: 20px; }
.customer-delete-usage-alert { display: grid; grid-template-columns: 84px minmax(0, 1fr); align-items: center; gap: 12px; }
.customer-delete-usage-alert img { display: block; width: 84px; height: 84px; object-fit: contain; }
.customer-delete-usage-alert > div { display: grid; gap: 8px; min-width: 0; }
.customer-delete-usage-alert ul { margin: 0; }
.customer-delete-ready { display: grid; justify-items: center; gap: 8px; text-align: center; }
.customer-delete-ready img { display: block; width: 100px; height: 100px; object-fit: contain; }

@media (prefers-reduced-motion: reduce) { .buyer-card:active { transform: none; } }
</style>
