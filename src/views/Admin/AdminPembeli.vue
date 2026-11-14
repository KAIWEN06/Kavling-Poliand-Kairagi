<template>
  <ion-page class="admin-buyers-page">
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />

    <ion-content :fullscreen="true">
      <main class="buyers-content">
        <div class="buyers-filters" role="group" aria-label="Filter calon pembeli">
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
          <input v-model="query" type="search" placeholder="Cari nama, nomor HP, atau kavling..." />
          <button v-if="query" type="button" aria-label="Hapus pencarian" @click="query = ''">
            <ion-icon :icon="closeOutline" aria-hidden="true" />
          </button>
        </div>

        <div v-if="loading" class="buyers-state" role="status" aria-live="polite">
          <ion-spinner name="crescent" />
          <p>Memuat calon pembeli...</p>
        </div>

        <div v-else-if="errorMessage" class="buyers-state" role="alert">
          <ion-icon :icon="alertCircleOutline" aria-hidden="true" />
          <strong>Data calon pembeli gagal dimuat</strong>
          <p>{{ errorMessage }}</p>
          <AppButton size="small" @click="loadCustomers">Coba lagi</AppButton>
        </div>

        <template v-else>
          <div class="buyers-list-head">
            <h2>Daftar Calon Pembeli & Pembeli</h2>
            <span>{{ filteredCustomers.length }}</span>
          </div>

          <section v-if="filteredCustomers.length" id="buyers-list-top" class="buyers-list" aria-label="Daftar calon pembeli">
            <article v-for="customer in pagedCustomers" :key="customer.id" class="buyer-card" tabindex="0" @click="openCustomer(customer.id)" @keydown.enter.self="openCustomer(customer.id)">
              <div :class="['buyer-avatar', customer.tone]">{{ initials(customer.full_name) }}</div>
              <div class="buyer-details">
                <h3>{{ customer.full_name }}</h3>
                <p>{{ customer.phone || 'Nomor belum tercatat' }}</p>
                <small>{{ customer.statusLabel }} · {{ formatDate(customer.created_at) }}</small>
                <small v-if="customer.source" class="buyer-source">
                  <ion-icon :icon="personOutline" aria-hidden="true" /> {{ customer.source }}
                </small>
              </div>
              <span :class="['buyer-status', customer.tone]">{{ customer.statusLabel }}</span>
              <ion-icon class="buyer-chevron" :icon="chevronForwardOutline" aria-hidden="true" />
            </article>
          </section>

          <div v-else-if="!filteredCustomers.length" class="buyers-state">
            <ion-icon :icon="peopleOutline" aria-hidden="true" />
            <strong>Calon pembeli tidak ditemukan</strong>
            <p>Coba ubah kata kunci atau filter yang dipilih.</p>
          </div>

          <nav v-if="filteredCustomers.length > 0 && totalPages > 1" class="buyers-pager" aria-label="Halaman daftar pembeli">
            <div class="buyers-pager-controls">
              <button type="button" class="buyers-pager-btn" aria-label="Halaman sebelumnya" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">
                <ion-icon :icon="chevronBackOutline" aria-hidden="true" />
              </button>
              <button
                v-for="page in visiblePages"
                :key="page ?? `ellipsis-${currentPage}`"
                type="button"
                class="buyers-pager-number"
                :class="{ active: page === currentPage }"
                :disabled="page === null"
                :aria-current="page === currentPage ? 'page' : undefined"
                :aria-label="page === null ? undefined : `Halaman ${page}`"
                @click="page !== null && goToPage(page)"
              >{{ page ?? '…' }}</button>
              <button type="button" class="buyers-pager-btn" aria-label="Halaman berikutnya" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">
                <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
              </button>
            </div>
            <span class="buyers-pager-position">Halaman {{ currentPage }} dari {{ totalPages }}</span>
          </nav>

          <button
            type="button"
            class="buyers-add buyers-add-floating"
            aria-label="Tambah calon pembeli"
            title="Tambah calon pembeli"
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
      cancel-text="Batal"
      @confirm="confirmDeleteCustomer"
      @cancel="closeDeleteConfirmation"
      @close="closeDeleteConfirmation"
    >
      <div class="customer-delete-check">
        <p v-if="deleteChecking" role="status" aria-live="polite">
          Memeriksa...
        </p>
        <div v-else-if="deleteError" class="customer-delete-error" role="alert">
          <p>Data belum dihapus. Pemeriksaan atau penghapusan gagal: {{ deleteError }}</p>
          <AppButton size="small" @click="checkDeleteEligibility">Periksa lagi</AppButton>
        </div>
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
              <p>Minat kavling, catatan, tindak lanjut, transaksi, pembayaran, riwayat catatan, dan hubungan kavling harus tetap dipertahankan.</p>
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
      v-model="addModalOpen"
      title="Tambah pembeli"
      variant="bottom-sheet"
      :loading="addSaving"
      :confirm-disabled="!addForm.full_name.trim() || !addForm.phone.trim()"
      confirm-text="Simpan pembeli"
      cancel-text="Batal"
      :max-height="'92dvh'"
      @confirm="saveNewCustomer"
      @cancel="closeAddCustomer"
      @close="closeAddCustomer"
    >
      <form class="add-customer-form" @submit.prevent="saveNewCustomer">
        <section class="add-form-section" aria-labelledby="add-customer-info-title">
          <div class="add-form-section-head">
            <h3 id="add-customer-info-title">Informasi pembeli</h3>
            <p>Masukkan informasi kontak calon pembeli.</p>
          </div>

          <label class="add-field">
            <span>Nama lengkap <b>*</b></span>
            <input v-model.trim="addForm.full_name" type="text" autocomplete="name" placeholder="Masukkan nama lengkap" required />
          </label>

          <div class="add-field-grid">
            <label class="add-field">
              <span>Nomor telepon <b>*</b></span>
              <input v-model.trim="addForm.phone" type="tel" inputmode="tel" autocomplete="tel" placeholder="08xxxxxxxxxx" required />
            </label>
            <label class="add-field">
              <span>NIK</span>
              <input v-model.trim="addForm.nik" type="text" inputmode="numeric" maxlength="16" placeholder="16 digit NIK" />
            </label>
          </div>

          <label class="add-field">
            <span>Email</span>
            <input v-model.trim="addForm.email" type="email" autocomplete="email" placeholder="nama@email.com" />
          </label>

          <label class="add-field">
            <span>Alamat</span>
            <textarea v-model.trim="addForm.address" rows="2" autocomplete="street-address" placeholder="Masukkan alamat pembeli"></textarea>
          </label>
        </section>

        <section class="add-form-section" aria-labelledby="add-customer-source-title">
          <div class="add-form-section-head">
            <h3 id="add-customer-source-title">Sumber pembeli</h3>
            <p>Pilih Marketing yang membawa calon pembeli ini. Kosongkan jika pembeli datang langsung.</p>
          </div>

          <label class="add-field">
            <span>Marketing</span>
            <select v-model="addForm.marketing_id" :disabled="marketingLoading">
              <option value="">Pembeli langsung / tanpa Marketing</option>
              <option
                v-for="marketing in marketingOptions"
                :key="marketing.id"
                :value="marketing.id"
              >
                {{ marketing.full_name || 'Marketing tanpa nama' }}
              </option>
            </select>
          </label>
          <p v-if="marketingError" class="add-form-error" role="alert">{{ marketingError }}</p>
        </section>

        <section class="add-form-section" aria-labelledby="add-customer-interest-title">
          <div class="add-form-section-head">
            <h3 id="add-customer-interest-title">Kavling yang diminati</h3>
            <p>Pilih satu atau beberapa kavling yang tersedia. Bagian ini opsional.</p>
          </div>

          <div class="lot-picker-head">
            <label for="add-lot-search">Cari kavling tersedia</label>
            <input
              id="add-lot-search"
              v-model="addLotSearch"
              type="search"
              placeholder="Ketik nomor kavling atau blok..."
              autocomplete="off"
            />
          </div>

          <div v-if="addLotsLoading" class="lot-picker-state" role="status">
            <ion-spinner name="crescent" />
            <span>Memuat kavling tersedia...</span>
          </div>

          <div v-else-if="addLotsError" class="lot-picker-state lot-picker-error" role="alert">
            <strong>Kavling tersedia gagal dimuat</strong>
            <span>{{ addLotsError }}</span>
            <button type="button" @click="loadAddAvailableLots">Coba muat ulang</button>
          </div>

          <div v-else-if="!addAvailableLots.length" class="lot-picker-state">
            <strong>Belum ada kavling tersedia</strong>
            <span>Semua kavling sedang dipesan atau sudah terjual.</span>
          </div>

          <div v-else-if="!filteredAddLots.length" class="lot-picker-state">
            <strong>Kavling tidak ditemukan</strong>
            <span>Coba kata kunci nomor kavling atau blok lain.</span>
          </div>

          <fieldset v-else class="lot-picker-list">
            <legend>Pilih kavling ({{ addForm.lot_ids.length }} dipilih)</legend>
            <label
              v-for="lot in filteredAddLots"
              :key="lot.id"
              :class="['lot-picker-option', { selected: addForm.lot_ids.includes(Number(lot.id)) }]"
            >
              <input v-model="addForm.lot_ids" type="checkbox" name="add-customer-lots" :value="Number(lot.id)" />
              <span class="lot-picker-copy">
                <strong>Kavling {{ lot.lot_number }}</strong>
                <span>{{ lot.blocks?.name || lot.blocks?.code || 'Blok belum tercatat' }} · {{ lot.dimension || 'Dimensi belum tercatat' }}</span>
              </span>
              <span class="lot-picker-price">{{ formatLotPrice(lot) }}</span>
            </label>
          </fieldset>

          <label class="add-field">
            <span>Jenis pembayaran</span>
            <select v-model="addForm.payment_type">
              <option value="Cash">Tunai</option>
              <option value="Installment">Cicilan</option>
            </select>
          </label>
        </section>

        <p v-if="addError" class="add-form-error" role="alert">{{ addError }}</p>
      </form>
    </AppModal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import { useIonRouter, IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/vue'
import {
  addOutline,
  alertCircleOutline,
  chevronForwardOutline,
  chevronBackOutline,
  closeOutline,
  peopleOutline,
  personOutline,
  searchOutline,
} from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { customerService } from '@/services/marketing/customerService'
import worriedMascot from '@/assets/mascot/Worried Mascot and Locked Property Link.png'
import panickedMascot from '@/assets/mascot/Panicked Mascot and Trash Can Mishap.png'

type FilterValue = 'all' | 'prospect' | 'follow-up' | 'buyer'
type Customer = {
  id: number
  full_name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string | null
  statusLabel: 'Prospek' | 'Tindak Lanjut' | 'Pembeli'
  source: string | null
  tone: 'mint' | 'gold' | 'rose' | 'blue'
  interests: Interest[]
  transactions: Transaction[]
}
type Interest = { id: number; lotNumber: string; block: string; paymentType: string }
type Transaction = { id: number; lotNumber: string; block: string; status: string; paymentType: string; finalPrice: number | null }

const router = useIonRouter()
const customers = ref<Customer[]>([])
const query = ref('')
const selectedFilter = ref<FilterValue>('all')
const loading = ref(true)
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
  { value: 'buyer', label: 'Pembeli' },
]

const PAGE_SIZE = 10
const currentPage = ref(1)

const filteredCustomers = computed(() => {
  const term = query.value.trim().toLowerCase()
  return customers.value.filter((customer) => {
    const matchesFilter = selectedFilter.value === 'all' ||
      (selectedFilter.value === 'prospect' && customer.statusLabel === 'Prospek') ||
      (selectedFilter.value === 'follow-up' && customer.statusLabel === 'Tindak Lanjut') ||
      (selectedFilter.value === 'buyer' && customer.statusLabel === 'Pembeli')
    const matchesQuery = !term || [customer.full_name, customer.phone, customer.email].filter(Boolean).join(' ').toLowerCase().includes(term)
    return matchesFilter && matchesQuery
  })
})

const totalPages = computed(() => Math.max(1, Math.ceil(filteredCustomers.value.length / PAGE_SIZE)))
const pagedCustomers = computed(() => {
  const start = (currentPage.value - 1) * PAGE_SIZE
  return filteredCustomers.value.slice(start, start + PAGE_SIZE)
})
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

watch([filteredCustomers, totalPages], () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
  if (currentPage.value < 1) currentPage.value = 1
})

watch([query, selectedFilter], () => {
  currentPage.value = 1
})

async function goToPage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), totalPages.value)
  if (nextPage === currentPage.value) return
  currentPage.value = nextPage
  await nextTick()
  document.querySelector('#buyers-list-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function filterCount(filter: FilterValue) {
  if (filter === 'all') return customers.value.length
  const labels: Record<Exclude<FilterValue, 'all'>, Customer['statusLabel']> = {
    prospect: 'Prospek',
    'follow-up': 'Tindak Lanjut',
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

function blockLabel(block: any) {
  return block?.name || block?.code || 'Blok belum tercatat'
}

async function loadCustomers() {
  loading.value = true
  errorMessage.value = ''
  try {
    const rows = await customerService.getAdminCustomers()
    customers.value = (rows ?? []).map((row: any) => ({
      id: row.id,
      full_name: row.full_name,
      phone: row.phone ?? null,
      email: row.email ?? null,
      address: row.address ?? null,
      notes: row.notes ?? null,
      created_at: row.created_at ?? null,
      statusLabel: row.lot_transactions?.some((transaction: any) => transaction.status === 'Sold')
        ? 'Pembeli'
        : row.customer_notes?.length || row.customer_interests?.length
          ? 'Tindak Lanjut'
          : 'Prospek',
      source: row.marketing?.full_name || null,
      tone: row.lot_transactions?.some((transaction: any) => transaction.status === 'Sold') ? 'mint' : 'gold',
      interests: (row.customer_interests ?? []).map((interest: any) => ({
        id: interest.id,
        lotNumber: interest.lots?.lot_number || `Lot #${interest.lot_id}`,
        block: blockLabel(interest.lots?.blocks),
        paymentType: interest.payment_type === 'Installment' ? 'Cicilan' : 'Cash',
      })),
      transactions: (row.lot_transactions ?? []).map((transaction: any) => ({
        id: transaction.id,
        lotNumber: transaction.lots?.lot_number || `Lot #${transaction.lot_id}`,
        block: blockLabel(transaction.lots?.blocks),
        status: transaction.status,
        paymentType: transaction.payment_type === 'Installment' ? 'Cicilan' : 'Cash',
        finalPrice: transaction.final_price ?? null,
      })),
    }))
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Periksa koneksi internet, lalu coba lagi.'
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
const addLotSearch = ref('')
const addAvailableLots = ref<any[]>([])
const marketingOptions = ref<Array<{ id: string; full_name: string | null }>>([])
const marketingLoading = ref(false)
const marketingError = ref('')
const addForm = reactive({
  full_name: '',
  phone: '',
  email: '',
  nik: '',
  address: '',
  marketing_id: '',
  lot_ids: [] as number[],
  payment_type: 'Cash' as 'Cash' | 'Installment',
})

const filteredAddLots = computed(() => {
  const term = addLotSearch.value.trim().toLowerCase()
  if (!term) return addAvailableLots.value
  return addAvailableLots.value.filter((lot) =>
    `${lot.lot_number ?? ''} ${lot.blocks?.name ?? ''} ${lot.blocks?.code ?? ''}`
      .toLowerCase()
      .includes(term)
  )
})

function formatCurrency(value: number) {
  return `Rp ${value.toLocaleString('id-ID')}`
}

function formatLotPrice(lot: any) {
  const price = lot.promo_price ?? lot.cash_price
  return price != null ? formatCurrency(Number(price)) : 'Harga belum diatur'
}

function resetAddForm() {
  Object.assign(addForm, {
    full_name: '',
    phone: '',
    email: '',
    nik: '',
    address: '',
    marketing_id: '',
    lot_ids: [],
    payment_type: 'Cash',
  })
  addError.value = ''
  addLotsError.value = ''
  addLotSearch.value = ''
}

async function loadAddAvailableLots() {
  addLotsLoading.value = true
  addLotsError.value = ''

  try {
    addAvailableLots.value = await customerService.getAvailableLots()
  } catch (error) {
    addLotsError.value = error instanceof Error
      ? error.message
      : 'Daftar kavling tersedia gagal dimuat.'
  } finally {
    addLotsLoading.value = false
  }
}

async function loadMarketingOptions() {
  marketingLoading.value = true
  marketingError.value = ''

  try {
    marketingOptions.value = await customerService.getMarketingOptions()
  } catch (error) {
    marketingOptions.value = []
    marketingError.value = error instanceof Error
      ? `Daftar Marketing gagal dimuat: ${error.message}`
      : 'Daftar Marketing gagal dimuat.'
  } finally {
    marketingLoading.value = false
  }
}

async function openAddCustomer() {
  resetAddForm()
  addModalOpen.value = true
  await Promise.all([
    loadAddAvailableLots(),
    loadMarketingOptions(),
  ])
}

function closeAddCustomer() {
  if (addSaving.value) return
  addModalOpen.value = false
  resetAddForm()
}

async function saveNewCustomer() {
  if (addSaving.value) return

  const fullName = addForm.full_name.trim()
  const phone = addForm.phone.trim()
  const email = addForm.email.trim()
  const nik = addForm.nik.trim()

  if (!fullName || !phone) {
    addError.value = 'Nama lengkap dan nomor telepon wajib diisi.'
    return
  }

  if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    addError.value = 'Format email tidak valid.'
    return
  }

  if (nik && !/^\d{16}$/.test(nik)) {
    addError.value = 'NIK harus terdiri dari 16 digit angka.'
    return
  }

  const selectedIds = [...new Set(addForm.lot_ids)]
  const selectedLots = addAvailableLots.value.filter((lot) => selectedIds.includes(Number(lot.id)))
  if (selectedLots.length !== selectedIds.length) {
    addError.value = 'Ada kavling yang sudah tidak tersedia. Muat ulang daftar kavling.'
    return
  }

  addSaving.value = true
  addError.value = ''

  try {
    await customerService.createCustomer({
      customer: {
        full_name: fullName,
        phone: phone,
        email: email || null,
        nik: nik || null,
        address: addForm.address.trim() || null,
        marketing_id: addForm.marketing_id || null,
      },
      interests: selectedIds.map((lotId) => ({
        lot_id: lotId,
        payment_type: addForm.payment_type,
        plan_id: null,
        notes: null,
      })),
    })

    addModalOpen.value = false
    resetAddForm()
    await loadCustomers()
  } catch (error) {
    addError.value = error instanceof Error
      ? `Pembeli belum berhasil ditambahkan: ${error.message}`
      : 'Pembeli belum berhasil ditambahkan. Periksa koneksi dan policy Supabase.'
  } finally {
    addSaving.value = false
  }
}

function openCustomer(id: number) {
  router.push(`/admin/pembeli/${id}`)
}

onMounted(loadCustomers)
</script>

<style scoped>
.admin-buyers-page { --buyers-bg: var(--app-background); font-family: var(--font-primary); color: var(--text-primary); }
.buyers-content { min-height: 100%; padding: 22px 16px calc(112px + env(safe-area-inset-bottom)); background: var(--buyers-bg); }
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
.buyers-search input { min-width: 0; flex: 1; border: 0; outline: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 13px; }
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
  bottom: calc(92px + env(safe-area-inset-bottom));
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
.buyers-pager {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(90px, 1fr);
  align-items: center;
  gap: 14px;
  margin-top: 18px;
  padding: 16px 0 4px;
  border-top: 1px solid var(--border-default);
}
.buyers-pager-controls {
  grid-column: 2;
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  max-width: 100%;
  overflow-x: auto;
  scrollbar-width: none;
  padding: 3px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-panel);
  background: var(--surface-muted);
}
.buyers-pager-controls::-webkit-scrollbar { display: none; }
.buyers-pager-btn,
.buyers-pager-number {
  min-width: 44px;
  height: 44px;
  padding: 0 10px;
  border: 1px solid var(--border-default);
  border-radius: 10px;
  background: var(--surface-primary);
  color: var(--text-primary);
  font: inherit;
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}
.buyers-pager-btn { display: inline-flex; align-items: center; justify-content: center; font-size: 20px; }
.buyers-pager-number.active { border-color: var(--poliland-green); background: var(--poliland-green); color: #fff; }
.buyers-pager-btn:disabled,
.buyers-pager-number:disabled { cursor: default; border-color: transparent; background: transparent; opacity: 1; }
.buyers-pager-position { grid-column: 3; color: var(--text-secondary); font-size: 12px; text-align: center; white-space: nowrap; }
.buyers-pager button:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.buyers-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 38px 18px; text-align: center; border: 1px dashed var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.buyers-state ion-icon { font-size: 28px; color: var(--poliland-green); }
.buyers-state p { margin: 0; color: var(--text-secondary); font-size: 13px; }
@media (max-width: 520px) {
  .buyers-pager { grid-template-columns: 1fr; gap: 8px; }
  .buyers-pager-controls { grid-column: 1; justify-self: center; }
  .buyers-pager-position { grid-column: 1; }
}
@media (max-width: 360px) {
  .buyer-card { grid-template-columns: 40px minmax(0, 1fr) 12px; gap: 8px; }
  .buyer-status { grid-column: 2; justify-self: start; grid-row: 2; }
  .buyers-add-floating { right: 12px; }
}

.customer-delete-check { display: grid; gap: 10px; color: var(--text-primary); font-size: 13px; line-height: 1.55; }
.customer-delete-check p { margin: 0; }
.customer-delete-check ul { display: grid; gap: 4px; margin: 0; padding-left: 20px; }
.customer-delete-usage-alert { display: grid; grid-template-columns: 84px minmax(0, 1fr); align-items: center; gap: 12px; }
.customer-delete-usage-alert img { display: block; width: 84px; height: 84px; object-fit: contain; }
.customer-delete-usage-alert > div { display: grid; gap: 8px; min-width: 0; }
.customer-delete-usage-alert ul { margin: 0; }
.customer-delete-error { display: grid; gap: 10px; color: var(--status-danger); }
.customer-delete-ready { display: grid; justify-items: center; gap: 8px; text-align: center; }
.customer-delete-ready img { display: block; width: 100px; height: 100px; object-fit: contain; }

/* Modal tambah pembeli: mengikuti token dan pola form PoliLand. */
.add-customer-form { display: grid; gap: 18px; }
.add-form-section { display: grid; gap: 12px; }
.add-form-section + .add-form-section { padding-top: 16px; border-top: 1px solid var(--border-default); }
.add-form-section-head { display: grid; gap: 4px; }
.add-form-section-head h3 { margin: 0; color: var(--text-primary); font-size: 14px; font-weight: var(--font-weight-bold); }
.add-form-section-head p { margin: 0; color: var(--text-secondary); font-size: 11px; line-height: 1.5; }
.add-field { display: grid; gap: 6px; min-width: 0; color: var(--text-primary); font-size: 12px; font-weight: var(--font-weight-semibold); }
.add-field > span b { color: var(--status-danger); }
.add-field input, .add-field textarea, .add-field select {
  width: 100%; min-height: 44px; box-sizing: border-box; padding: 10px 12px;
  border: 1px solid var(--border-default); border-radius: var(--radius-control);
  background: var(--surface-primary); color: var(--text-primary); font: inherit;
  font-size: 13px; font-weight: var(--font-weight-regular);
}
.add-field textarea { min-height: 72px; resize: vertical; }
.add-field input::placeholder, .add-field textarea::placeholder { color: var(--text-tertiary); }
.add-field-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.add-field input:focus-visible, .add-field textarea:focus-visible, .add-field select:focus-visible {
  outline: 3px solid var(--poliland-green); outline-offset: 2px;
}
.add-form-error { margin: 0; padding: 10px 12px; border: 1px solid var(--status-danger); border-radius: var(--radius-control); color: var(--status-danger); background: var(--surface-muted); font-size: 12px; line-height: 1.5; }
.add-customer-form .lot-picker-head { display: grid; gap: 6px; }
.add-customer-form .lot-picker-head label { color: var(--text-primary); font-size: 11px; font-weight: var(--font-weight-semibold); }
.add-customer-form .lot-picker-head input {
  width: 100%; min-height: 44px; box-sizing: border-box; padding: 10px 12px;
  border: 1px solid var(--border-default); border-radius: var(--radius-control);
  background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 13px;
}
.add-customer-form .lot-picker-state {
  display: grid; justify-items: center; gap: 6px; min-height: 92px; padding: 14px;
  box-sizing: border-box; border: 1px dashed var(--border-default); border-radius: var(--radius-control);
  background: var(--surface-primary); color: var(--text-secondary); text-align: center; font-size: 12px;
}
.add-customer-form .lot-picker-state strong { color: var(--text-primary); }
.add-customer-form .lot-picker-error { color: var(--status-danger); }
.add-customer-form .lot-picker-error button {
  min-height: 44px; padding: 0 14px; border: 1px solid var(--border-default);
  border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit;
}
.add-customer-form .lot-picker-list {
  display: grid; gap: 8px; max-height: 280px; overflow-y: auto; margin: 0; padding: 0; border: 0;
}
.add-customer-form .lot-picker-list legend { margin-bottom: 8px; color: var(--text-primary); font-size: 11px; font-weight: var(--font-weight-semibold); }
.add-customer-form .lot-picker-option {
  display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; align-items: center; gap: 10px;
  min-height: 58px; padding: 10px; border: 1px solid var(--border-default);
  border-radius: var(--radius-control); background: var(--surface-primary); cursor: pointer;
}
.add-customer-form .lot-picker-option.selected { border-color: var(--poliland-green); background: var(--status-success-bg); }
.add-customer-form .lot-picker-option input { width: 18px; height: 18px; margin: 0; accent-color: var(--poliland-green); cursor: pointer; }
.add-customer-form .lot-picker-copy { display: grid; gap: 3px; min-width: 0; }
.add-customer-form .lot-picker-copy strong { overflow-wrap: anywhere; color: var(--text-primary); font-size: 13px; }
.add-customer-form .lot-picker-copy span { overflow-wrap: anywhere; color: var(--text-secondary); font-size: 11px; }
.add-customer-form .lot-picker-price { max-width: 112px; color: var(--poliland-green); font-size: 11px; font-weight: var(--font-weight-bold); text-align: right; overflow-wrap: anywhere; }
.add-customer-form .lot-picker-head input:focus-visible, .add-customer-form .lot-picker-option:has(input:focus-visible) {
  outline: 3px solid var(--poliland-green); outline-offset: 2px;
}
@media (max-width: 380px) {
  .add-field-grid { grid-template-columns: 1fr; }
  .add-customer-form .lot-picker-option { grid-template-columns: 20px minmax(0, 1fr); }
  .add-customer-form .lot-picker-price { grid-column: 2; text-align: left; max-width: none; }
}

</style>
