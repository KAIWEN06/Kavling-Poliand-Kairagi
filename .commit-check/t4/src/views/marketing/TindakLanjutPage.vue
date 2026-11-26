<template>
  <MarketingPageLayout title="Tindak lanjut" @refresh="refresh">
    <AppNotice v-if="loadError" tone="error">
      {{ loadError }}
    </AppNotice>

    <SkeletonCardList v-if="loadingCustomers" :count="1" :lines="4" label="Memuat daftar klien" />

    <section v-else-if="!customers.length && !loadError" class="mk-card">
      <EmptyState kind="clients" compact title="Belum ada klien" description="Tambahkan klien untuk mulai mencatat tindak lanjut.">
        <AppButton size="small" @click="ionRouter.push('/marketing/clients/new')">Tambah klien</AppButton>
      </EmptyState>
    </section>

    <form v-else-if="customers.length" class="mk-card followup-form" novalidate @submit.prevent="saveFollowup">
      <h2>Catat tindak lanjut</h2>

      <label class="mk-field">
        <span>Klien</span>
        <select v-model.number="selectedCustomerId" class="mk-input" @change="formError = ''">
          <option :value="null" disabled>Pilih klien</option>
          <option v-for="customer in customers" :key="customer.id" :value="customer.id">
            {{ customer.full_name }}{{ customer.phone ? ` · ${customer.phone}` : '' }}
          </option>
        </select>
        <small v-if="interestSummary">{{ interestSummary }}</small>
      </label>

      <button v-if="selectedCustomer" type="button" class="mk-link followup-open" @click="openClient(selectedCustomer.id)">
        Buka detail klien
      </button>

      <div class="mk-filters">
        <label class="mk-field">
          <span>Tanggal</span>
          <input v-model="form.followup_date" class="mk-input" type="date" />
        </label>
        <label class="mk-field">
          <span>Metode</span>
          <select v-model="form.method" class="mk-input">
            <option v-for="method in FOLLOWUP_METHODS" :key="method" :value="method">{{ followupLabel(method) }}</option>
          </select>
        </label>
        <label class="mk-field">
          <span>Hasil</span>
          <select v-model="form.status" class="mk-input">
            <option v-for="status in FOLLOWUP_STATUSES" :key="status" :value="status">{{ followupLabel(status) }}</option>
          </select>
        </label>
      </div>

      <label class="mk-field">
        <span>Catatan (opsional)</span>
        <textarea v-model="form.notes" class="mk-input" maxlength="500" placeholder="Misalnya klien minta jadwal survei" />
        <small>{{ form.notes.length }}/500</small>
      </label>

      <AppNotice v-if="formError" tone="error">
        {{ formError }}
      </AppNotice>

      <button type="submit" class="mk-btn mk-btn--primary" :disabled="saving || !selectedCustomer">
        {{ saving ? 'Menyimpan…' : 'Simpan' }}
      </button>
    </form>

    <section class="mk-section" aria-labelledby="history-title">
      <div class="mk-section-head">
        <h2 id="history-title">Riwayat</h2>
      </div>

      <SkeletonCardList v-if="loadingHistory" :count="3" :lines="2" label="Memuat riwayat" />

      <section v-else-if="!followups.length" class="mk-card">
        <EmptyState kind="clients" compact title="Belum ada riwayat" description="Tindak lanjut tersimpan muncul di sini." />
      </section>

      <ul v-else class="followup-list">
        <li v-for="item in followups" :key="item.id" class="mk-card followup-item">
          <div class="followup-item__top">
            <strong>{{ item.customers?.full_name || 'Klien' }}</strong>
            <StatusBadge size="sm" :label="followupLabel(item.status)" :tone="statusTone(item.status)" />
          </div>
          <span class="mk-muted">{{ formatDate(item.followup_date) }} · {{ followupLabel(item.method) }}</span>
          <p v-if="item.notes">{{ item.notes }}</p>
        </li>
      </ul>
    </section>
  </MarketingPageLayout>
</template>

<script setup>
import { useRealtimeRefresh } from '@/composables/useRealtimeRefresh'
import AppNotice from '@/components/ui/AppNotice.vue'
import SkeletonCardList from '@/components/ui/skeletons/SkeletonCardList.vue'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import { useToast } from '@/composables/useToast'
import { followupLabel, formatDate } from '@/utils/marketingStatus'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { onIonViewWillEnter, useIonRouter } from '@ionic/vue'
import { useRoute } from 'vue-router'
import {
  FOLLOWUP_METHODS,
  FOLLOWUP_STATUSES,
  createCustomerFollowup,
  getCustomerInterestedLots,
  getCurrentMarketingUser,
  getMarketingCustomers,
  getMarketingFollowups,
} from '@/services/marketing/customerFollowupService'

const route = useRoute()
const ionRouter = useIonRouter()
const loadError = ref('')

const loadingCustomers = ref(true)
const loadingHistory = ref(true)
const saving = ref(false)
const formError = ref('')

const currentUser = ref(null)

const customers = ref([])
const followups = ref([])
const customerLots = reactive({})
const selectedCustomerId = ref(null)

const form = reactive({
  followup_date: getToday(),
  method: 'WhatsApp',
  status: 'Tertarik',
  notes: '',
})

const selectedCustomer = computed(() =>
  customers.value.find(
    (customer) => customer.id === selectedCustomerId.value,
  ) || null,
)

function getQueryString(value) {
  return (Array.isArray(value) ? value[0] : value || '').trim()
}

function selectCustomerFromRoute(customerList) {
  const requestedId = getQueryString(route.query.customer_id)
  const requestedName = getQueryString(route.query.customer_name)

  if (!requestedId && !requestedName) {
    if (!customerList.some((customer) => customer.id === selectedCustomerId.value)) {
      selectedCustomerId.value = customerList[0]?.id ?? null
    }
    return
  }

  const requestedNumericId = Number(requestedId)
  const customerById = Number.isInteger(requestedNumericId)
    ? customerList.find((customer) => customer.id === requestedNumericId)
    : null
  const normalizedName = requestedName.toLocaleLowerCase()
  const matchingCustomerById =
    customerById &&
    (!normalizedName ||
      customerById.full_name.trim().toLocaleLowerCase() === normalizedName)
      ? customerById
      : null
  const matchingCustomerByName = normalizedName
    ? customerList.find(
        (customer) =>
          customer.full_name.trim().toLocaleLowerCase() === normalizedName,
      )
    : null
  const customer = matchingCustomerById || matchingCustomerByName

  selectedCustomerId.value = customer?.id ?? null

  if (!customer) {
    formError.value = requestedName
      ? `Klien "${requestedName}" tidak ditemukan.`
      : 'Klien tidak ditemukan.'
  }
}

function getToday() {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

function formatLotDescription(interest) {
  const lot = interest?.lots
  if (!lot) return ''
  return [lot.lot_number, lot.area ? `${Number(lot.area)} m²` : null].filter(Boolean).join(' · ')
}

const interestSummary = computed(() => {
  const lots = customerLots[selectedCustomerId.value] ?? []
  const names = lots.map(formatLotDescription).filter(Boolean)
  return names.length ? `Minat: ${names.join(', ')}` : ''
})

function statusTone(status) {
  if (status === 'Selesai') return 'success'
  if (status === 'Tidak Tertarik') return 'danger'
  if (status === 'Tertarik') return 'gold'
  if (status === 'Negosiasi' || status === 'Menunggu') return 'warning'
  return 'info'
}

function openClient(id) {
  ionRouter.push(`/marketing/clients/${id}`)
}

async function loadCustomerLots(customerId) {
  if (!customerId) return
  try {
    customerLots[customerId] = await getCustomerInterestedLots(customerId)
  } catch (error) {
    console.error(`Gagal mengambil minat kaveling klien ${customerId}`, error)
  }
}

watch(selectedCustomerId, loadCustomerLots)

async function loadCustomers({ silent = false } = {}) {
  // Skeleton hanya saat belum ada data; refresh mempertahankan daftar lama.
  if (!customers.value.length) loadingCustomers.value = true

  try {
    customers.value = await getMarketingCustomers()

    // Muat ulang otomatis tidak boleh mengganti klien yang sedang dipilih.
    const keepSelection = silent && customers.value.some((item) => item.id === selectedCustomerId.value)
    if (!keepSelection) selectCustomerFromRoute(customers.value)
  } finally {
    loadingCustomers.value = false
  }
}

async function loadHistory() {
  if (!followups.value.length) loadingHistory.value = true

  try {
    followups.value = await getMarketingFollowups(
      currentUser.value.id,
    )
  } finally {
    loadingHistory.value = false
  }
}

async function refresh({ silent = false } = {}) {
  if (!currentUser.value) return
  if (!silent) loadError.value = ''

  try {
    await Promise.all([
      loadCustomers({ silent }),
      loadHistory(),
    ])
    await loadCustomerLots(selectedCustomerId.value)
  } catch (error) {
    console.error(error)
    if (!silent) loadError.value = 'Data gagal dimuat. Tarik ke bawah untuk mencoba lagi.'
  }
}

async function saveFollowup() {
  formError.value = ''

  if (!selectedCustomer.value) {
    formError.value =
      'Pilih klien dulu.'
    return
  }

  if (!form.followup_date) {
    formError.value =
      'Tanggal wajib diisi.'
    return
  }

  if (!form.method) {
    formError.value =
      'Pilih metode.'
    return
  }

  if (!form.status) {
    formError.value =
      'Pilih hasil.'
    return
  }

  saving.value = true

  try {
    await createCustomerFollowup({
      customer_id: selectedCustomer.value.id,
      user_id: currentUser.value.id,
      followup_date: form.followup_date,
      method: form.method,
      status: form.status,
      notes: form.notes.trim() || null,
      next_followup_date: null,
    })

    form.notes = ''
    form.status = 'Tertarik'
    form.method = 'WhatsApp'

    useToast().success('Tindak lanjut tersimpan.')
    await loadHistory()
  } catch (error) {
    console.error(error)
    formError.value =
      error?.message ||
      'Tindak lanjut gagal disimpan.'
  } finally {
    saving.value = false
  }
}

let ready = false

onMounted(async () => {
  try {
    const session = await getCurrentMarketingUser()

    currentUser.value = session.user

    if (session.profile.role !== 'marketing') {
      loadError.value = 'Halaman ini khusus akun pemasar.'
      loadingCustomers.value = false
      loadingHistory.value = false
      return
    }

    await refresh()
    ready = true
  } catch (error) {
    console.error(error)
    loadingCustomers.value = false
    loadingHistory.value = false
    loadError.value = 'Akun tidak dapat diverifikasi. Masuk ulang.'
  }
})

/* Muat ulang saat kembali, mis. setelah menambah klien. */
onIonViewWillEnter(() => {
  if (ready) void refresh()
})

watch(
  () => [route.query.customer_id, route.query.customer_name],
  () => {
    if (customers.value.length) {
      selectCustomerFromRoute(customers.value)
    }
  },
)

useRealtimeRefresh(
  ['customers', 'customer_followups', 'customer_interests'],
  () => (ready ? refresh({ silent: true }) : undefined),
  { pauseWhen: () => saving.value },
)

</script>

<style scoped>
.followup-form { display: grid; gap: var(--space-3); }
.followup-form h2 { margin: 0; font-size: var(--text-lg); }
.followup-open { justify-self: start; padding: 0; }

.followup-list { display: grid; gap: var(--space-3); margin: 0; padding: 0; list-style: none; }
.followup-item { display: grid; gap: 4px; }
.followup-item__top { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); }
.followup-item__top strong { min-width: 0; overflow-wrap: anywhere; font-size: var(--text-md); }
.followup-item p { margin: 4px 0 0; overflow-wrap: anywhere; white-space: pre-wrap; font-size: var(--text-sm); line-height: 1.5; }
</style>
