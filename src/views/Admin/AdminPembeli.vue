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
          <span class="buyers-filter-mark" aria-hidden="true"><ion-icon :icon="optionsOutline" /></span>
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

          <section v-if="filteredCustomers.length" class="buyers-list" aria-label="Daftar calon pembeli">
            <article v-for="customer in filteredCustomers" :key="customer.id" class="buyer-card" tabindex="0" @click="openCustomer(customer.id)" @keydown.enter="openCustomer(customer.id)">
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

          <AppButton class="buyers-add" variant="primary" expand="block" @click="openAddCustomer">
            <ion-icon :icon="addOutline" aria-hidden="true" />
            Tambah Calon Pembeli
          </AppButton>
        </template>
      </main>
    </ion-content>

    <MobileTabBar variant="admin" />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useIonRouter, IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/vue'
import {
  addOutline,
  alertCircleOutline,
  chevronForwardOutline,
  closeOutline,
  optionsOutline,
  peopleOutline,
  personOutline,
  searchOutline,
} from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import { customerService } from '@/services/marketing/customerService'

type FilterValue = 'all' | 'prospect' | 'buyer'
type Customer = {
  id: number
  full_name: string
  phone: string | null
  email: string | null
  address: string | null
  notes: string | null
  created_at: string | null
  statusLabel: 'Prospek' | 'Pembeli'
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
const filters: { value: FilterValue; label: string }[] = [
  { value: 'all', label: 'Semua' },
  { value: 'prospect', label: 'Calon Pembeli' },
  { value: 'buyer', label: 'Pembeli' },
]

const filteredCustomers = computed(() => {
  const term = query.value.trim().toLowerCase()
  return customers.value.filter((customer) => {
    const matchesFilter = selectedFilter.value === 'all' ||
      (selectedFilter.value === 'prospect' && customer.statusLabel === 'Prospek') ||
      (selectedFilter.value === 'buyer' && customer.statusLabel === 'Pembeli')
    const matchesQuery = !term || [customer.full_name, customer.phone, customer.email].filter(Boolean).join(' ').toLowerCase().includes(term)
    return matchesFilter && matchesQuery
  })
})

function filterCount(filter: FilterValue) {
  if (filter === 'all') return customers.value.length
  return customers.value.filter((customer) => customer.statusLabel === (filter === 'buyer' ? 'Pembeli' : 'Prospek')).length
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
    customers.value = (rows ?? []).map((row: any, index: number) => ({
      id: row.id,
      full_name: row.full_name,
      phone: row.phone ?? null,
      email: row.email ?? null,
      address: row.address ?? null,
      notes: row.notes ?? null,
      created_at: row.created_at ?? null,
      statusLabel: row.lot_transactions?.some((transaction: any) => transaction.status === 'Sold') ? 'Pembeli' : 'Prospek',
      source: row.marketing?.full_name || null,
      tone: (['mint', 'gold', 'rose', 'blue'] as const)[index % 4],
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

function openAddCustomer() {
  router.push('/marketing/clients/new')
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
.buyers-search button, .buyers-filter-mark { display: inline-flex; align-items: center; justify-content: center; width: 32px; height: 32px; border: 0; background: transparent; color: var(--text-secondary); }
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
.buyers-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 38px 18px; text-align: center; border: 1px dashed var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.buyers-state ion-icon { font-size: 28px; color: var(--poliland-green); }
.buyers-state p { margin: 0; color: var(--text-secondary); font-size: 13px; }
@media (max-width: 360px) { .buyer-card { grid-template-columns: 40px minmax(0, 1fr) 12px; } .buyer-status { grid-column: 2; justify-self: start; grid-row: 2; } }
</style>
