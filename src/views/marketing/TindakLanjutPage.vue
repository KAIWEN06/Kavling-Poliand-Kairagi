<template>
  <div class="followup-page">
    <main class="page-content">
      <section class="customer-section">
        <div class="section-heading">
          <div>
            <span class="eyebrow">CLIENT</span>
            <h2>Calon Pembeli</h2>
          </div>

          <button
            v-if="customers.length"
            type="button"
            class="customer-count"
            @click="refresh"
          >
            {{ customers.length }}
          </button>
        </div>

        <div v-if="loadingCustomers" class="loading-box">
          Memuat data calon pembeli...
        </div>

        <div v-else-if="!customers.length" class="empty-box">
          <div class="empty-icon">
            <svg viewBox="0 0 24 24">
              <path d="M20 21a8 8 0 0 0-16 0" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <strong>Belum ada calon pembeli</strong>
          <span>Tambahkan calon pembeli terlebih dahulu.</span>
        </div>

        <div v-else class="customer-list">
          <button
            v-for="customer in customers"
            :key="customer.id"
            type="button"
            class="customer-card"
            :class="{ selected: selectedCustomerId === customer.id }"
            @click="selectCustomer(customer.id)"
          >
            <div class="customer-top">
              <div class="avatar">
                {{ getInitials(customer.full_name) }}
              </div>

              <div class="customer-main">
                <strong>{{ customer.full_name }}</strong>
                <span>{{ customer.phone || 'Nomor belum tersedia' }}</span>
              </div>

              <svg class="chevron" viewBox="0 0 24 24">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>

            <div
              v-if="customerLots[customer.id]?.length"
              class="interest-row"
            >
              <span class="location-icon">
                <svg viewBox="0 0 24 24">
                  <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                  <circle cx="12" cy="10" r="2.5" />
                </svg>
              </span>

              <div class="interest-content">
                <strong>
                  {{ customerLots[customer.id][0].lots?.lot_number || '—' }}
                </strong>
                <span>
                  {{ formatLotDescription(customerLots[customer.id][0]) }}
                </span>
              </div>

              <span
                v-if="customerLots[customer.id].length > 1"
                class="interest-more"
              >
                +{{ customerLots[customer.id].length - 1 }}
              </span>
            </div>
          </button>
        </div>
      </section>

      <section class="form-card">
        <div class="form-heading">
          <div class="form-heading-icon">
            <svg viewBox="0 0 24 24">
              <path d="M12 5v14M5 12h14" />
            </svg>
          </div>

          <div>
            <span class="eyebrow">AKTIVITAS</span>
            <h2>Tambah Tindak Lanjut</h2>
          </div>
        </div>

        <div v-if="selectedCustomer" class="selected-client">
          <span>Calon pembeli</span>
          <strong>{{ selectedCustomer.full_name }}</strong>
        </div>

        <div class="form-grid">
          <label class="field">
            <span>Tanggal Tindak Lanjut</span>
            <div class="input-wrap">
              <svg viewBox="0 0 24 24">
                <rect x="3" y="4" width="18" height="17" rx="2" />
                <path d="M16 2v4M8 2v4M3 10h18" />
              </svg>

              <input
                v-model="form.followup_date"
                type="date"
              />
            </div>
          </label>

          <label class="field">
            <span>Jenis Komunikasi</span>
            <div class="input-wrap">
              <svg viewBox="0 0 24 24">
                <path d="M21 16.5v3a2 2 0 0 1-2.2 2A18.4 18.4 0 0 1 3 5.2 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.7 12 12 0 0 0 .7 2.8 2 2 0 0 1-.5 2.1L9 10.9a16 16 0 0 0 4.1 4.1l1.3-1.2a2 2 0 0 1 2.1-.5 12 12 0 0 0 2.8.7A2 2 0 0 1 21 16.5Z" />
              </svg>

              <select v-model="form.method">
                <option
                  v-for="method in FOLLOWUP_METHODS"
                  :key="method"
                  :value="method"
                >
                  {{ method }}
                </option>
              </select>
            </div>
          </label>

          <label class="field">
            <span>Hasil Komunikasi</span>
            <div class="input-wrap">
              <svg viewBox="0 0 24 24">
                <path d="M20 12a8 8 0 1 1-3-6.2" />
                <path d="M20 5v6h-6" />
              </svg>

              <select v-model="form.status">
                <option
                  v-for="status in FOLLOWUP_STATUSES"
                  :key="status"
                  :value="status"
                >
                  {{ status }}
                </option>
              </select>
            </div>
          </label>

          <label class="field field-full">
            <span>Catatan Tindak Lanjut</span>
            <div class="textarea-wrap">
              <textarea
                v-model="form.notes"
                maxlength="500"
                placeholder="Catatan..."
              ></textarea>

              <small>{{ form.notes.length }}/500</small>
            </div>
          </label>
        </div>

        <div
          v-if="formError"
          class="form-error"
          role="alert"
        >
          <svg viewBox="0 0 24 24">
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          <span>{{ formError }}</span>
        </div>

        <button
          type="button"
          class="submit-button"
          :disabled="saving || !selectedCustomer"
          @click="saveFollowup"
        >
          <span v-if="saving" class="button-spinner"></span>
          {{ saving ? 'Menyimpan...' : 'Simpan Tindak Lanjut' }}
        </button>
      </section>

      <section class="history-section">
        <div class="history-heading">
          <div>
            <span class="eyebrow">AKTIVITAS</span>
            <h2>Riwayat Tindak Lanjut</h2>
          </div>

          <button
            type="button"
            class="refresh-button"
            aria-label="Refresh riwayat"
            @click="refresh"
          >
            <svg viewBox="0 0 24 24">
              <path d="M20 11a8.1 8.1 0 0 0-14.9-4L3 10" />
              <path d="M3 4v6h6" />
              <path d="M4 13a8.1 8.1 0 0 0 14.9 4L21 14" />
              <path d="M21 20v-6h-6" />
            </svg>
          </button>
        </div>

        <div v-if="loadingHistory" class="loading-box">
          Memuat riwayat...
        </div>

        <div v-else-if="!followups.length" class="empty-box history-empty">
          <strong>Belum ada riwayat</strong>
          <span>Tindak lanjut yang disimpan akan muncul di sini.</span>
        </div>

        <div v-else class="history-list">
          <article
            v-for="item in followups"
            :key="item.id"
            class="history-card"
          >
            <div class="history-icon" :class="getMethodClass(item.method)">
              <svg v-if="item.method === 'WhatsApp'" viewBox="0 0 24 24">
                <path d="M20 11.5a8 8 0 0 1-11.7 7.1L4 20l1.4-4.1A8 8 0 1 1 20 11.5Z" />
                <path d="M8.5 9.5c.7 2 2 3.3 4 4" />
              </svg>

              <svg v-else viewBox="0 0 24 24">
                <path d="M21 16.5v3a2 2 0 0 1-2.2 2A18.4 18.4 0 0 1 3 5.2 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.7 12 12 0 0 0 .7 2.8 2 2 0 0 1-.5 2.1L9 10.9a16 16 0 0 0 4.1 4.1l1.3-1.2a2 2 0 0 1 2.1-.5 12 12 0 0 0 2.8.7A2 2 0 0 1 21 16.5Z" />
              </svg>
            </div>

            <div class="history-body">
              <div class="history-meta">
                <strong>
                  {{ formatDate(item.followup_date) }}
                </strong>
                <span>{{ formatTime(item.created_at) }}</span>
              </div>

              <strong class="history-customer">
                {{ item.customers?.full_name || 'Calon Pembeli' }}
              </strong>

              <span class="history-method">
                {{ item.method }}
              </span>

              <p>
                {{ item.notes || 'Tidak ada catatan.' }}
              </p>
            </div>

            <div class="history-side">
              <span
                class="status-badge"
                :class="getStatusClass(item.status)"
              >
                {{ item.status }}
              </span>

              <button
                type="button"
                class="more-button"
                aria-label="Opsi riwayat"
              >
                <span></span>
                <span></span>
                <span></span>
              </button>
            </div>
          </article>
        </div>
      </section>
    </main>

  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'
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

const loadingCustomers = ref(true)
const loadingHistory = ref(true)
const saving = ref(false)
const formError = ref('')

const currentUser = ref(null)
const currentProfile = ref(null)

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
      ? `Calon pembeli "${requestedName}" tidak ditemukan.`
      : 'Calon pembeli yang dipilih tidak ditemukan.'
  }
}

function getToday() {
  const date = new Date()
  const offset = date.getTimezoneOffset()
  const local = new Date(date.getTime() - offset * 60 * 1000)
  return local.toISOString().slice(0, 10)
}

function getInitials(name = '') {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || '?'
}

function formatDate(value) {
  if (!value) return '—'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(`${value}T00:00:00`))
}

function formatTime(value) {
  if (!value) return ''

  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(value))
}

function formatLotDescription(interest) {
  const lot = interest?.lots
  if (!lot) return 'Informasi kavling tidak tersedia'

  const area = lot.area ? `${Number(lot.area)} m²` : null
  const dimension = lot.dimension || null
  const block = lot.blocks?.name || lot.blocks?.code || null

  return [area, dimension, block ? `Blok ${block}` : null]
    .filter(Boolean)
    .join(' · ') || 'Detail kavling tersedia'
}

function getMethodClass(method) {
  if (method === 'WhatsApp') return 'whatsapp'
  if (method === 'Telepon') return 'phone'
  return 'other'
}

function getStatusClass(status) {
  const normalized = status?.toLowerCase()

  if (normalized === 'terjual' || normalized === 'selesai') {
    return 'sold'
  }

  if (normalized === 'tertarik') {
    return 'interested'
  }

  if (normalized === 'negosiasi') {
    return 'negotiation'
  }

  if (normalized === 'tidak tertarik') {
    return 'danger'
  }

  return 'prospect'
}

async function loadCustomerLots(customerList) {
  await Promise.all(
    customerList.map(async (customer) => {
      try {
        customerLots[customer.id] =
          await getCustomerInterestedLots(customer.id)
      } catch (error) {
        console.error(
          `Gagal mengambil minat kavling customer ${customer.id}`,
          error,
        )
        customerLots[customer.id] = []
      }
    }),
  )
}

async function loadCustomers() {
  loadingCustomers.value = true

  try {
    customers.value = await getMarketingCustomers()

    await loadCustomerLots(customers.value)
    selectCustomerFromRoute(customers.value)
  } finally {
    loadingCustomers.value = false
  }
}

async function loadHistory() {
  loadingHistory.value = true

  try {
    followups.value = await getMarketingFollowups(
      currentUser.value.id,
    )
  } finally {
    loadingHistory.value = false
  }
}

async function refresh() {
  formError.value = ''

  try {
    await Promise.all([
      loadCustomers(),
      loadHistory(),
    ])
  } catch (error) {
    console.error(error)
    formError.value =
      'Gagal memuat data. Silakan coba lagi.'
  }
}

function selectCustomer(customerId) {
  selectedCustomerId.value = customerId
  formError.value = ''
}

async function saveFollowup() {
  formError.value = ''

  if (!selectedCustomer.value) {
    formError.value =
      'Pilih calon pembeli terlebih dahulu.'
    return
  }

  if (!form.followup_date) {
    formError.value =
      'Tanggal tindak lanjut wajib diisi.'
    return
  }

  if (!form.method) {
    formError.value =
      'Jenis komunikasi wajib dipilih.'
    return
  }

  if (!form.status) {
    formError.value =
      'Hasil komunikasi wajib dipilih.'
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

onMounted(async () => {
  try {
    const session = await getCurrentMarketingUser()

    currentUser.value = session.user
    currentProfile.value = session.profile

    if (session.profile.role !== 'marketing') {
      formError.value =
        'Halaman ini hanya dapat digunakan oleh akun Marketing.'
      return
    }

    await refresh()
  } catch (error) {
    console.error(error)
    formError.value =
      'Sesi login tidak ditemukan atau data profil tidak dapat diakses.'
  }
})

watch(
  () => [route.query.customer_id, route.query.customer_name],
  () => {
    if (customers.value.length) {
      selectCustomerFromRoute(customers.value)
    }
  },
)
</script>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(body) {
  margin: 0;
  background: #f4f4f2;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
  color: #242424;
}

button,
input,
select,
textarea {
  font: inherit;
}

button {
  -webkit-tap-highlight-color: transparent;
}

.followup-page {
  --gold: #caa653;
  --gold-dark: #ad8a3f;
  --gold-soft: #f7efd9;
  --cream: #faf7f0;
  --text: #262626;
  --muted: #777777;
  --line: #e5e1d9;
  --card: #ffffff;

  min-height: 100dvh;
  background:
    linear-gradient(
      180deg,
      #f4f4f2 0%,
      #f7f7f5 78%,
      #e9eadf 100%
    );
  padding-bottom: calc(82px + env(safe-area-inset-bottom));
}

.page-content {
  width: min(100% - 24px, 720px);
  margin: 0 auto;
  padding: 14px 0 24px;
}

.customer-section,
.history-section {
  margin-bottom: 16px;
}

.section-heading,
.history-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  margin-bottom: 10px;
  padding: 0 2px;
}

.section-heading h2,
.history-heading h2,
.form-heading h2 {
  margin: 2px 0 0;
  font-size: clamp(17px, 4.5vw, 21px);
  line-height: 1.15;
  font-weight: 850;
}

.eyebrow {
  display: block;
  color: #9e8b63;
  font-size: 9px;
  font-weight: 800;
  letter-spacing: 0.12em;
}

.customer-count {
  min-width: 30px;
  height: 30px;
  padding: 0 9px;
  border: 0;
  border-radius: 15px;
  background: var(--gold-soft);
  color: var(--gold-dark);
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
}

.customer-list {
  display: grid;
  gap: 8px;
}

.customer-card {
  width: 100%;
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid transparent;
  border-radius: 9px;
  background: var(--card);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.12);
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    transform 0.12s ease,
    box-shadow 0.16s ease;
}

.customer-card:active {
  transform: scale(0.99);
}

.customer-card.selected {
  border-color: #d9be79;
  box-shadow:
    0 2px 6px rgba(0, 0, 0, 0.1),
    inset 0 0 0 1px rgba(202, 166, 83, 0.15);
}

.customer-top {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.avatar {
  width: 40px;
  height: 40px;
  flex: 0 0 40px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: #f6ead0;
  color: #463c2d;
  font-size: 12px;
  font-weight: 850;
}

.customer-main {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.customer-main strong {
  overflow: hidden;
  font-size: 13px;
  font-weight: 850;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.customer-main span {
  overflow: hidden;
  color: #777777;
  font-size: 10px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.chevron {
  width: 17px;
  height: 17px;
  flex: 0 0 17px;
  fill: none;
  stroke: #6f6f6f;
  stroke-width: 2;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.interest-row {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
  margin-top: 8px;
  padding-top: 7px;
  border-top: 1px solid #e7e4df;
}

.location-icon {
  flex: 0 0 auto;
  color: var(--gold-dark);
}

.location-icon svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.interest-content {
  min-width: 0;
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.interest-content strong {
  font-size: 11px;
  font-weight: 850;
}

.interest-content span {
  overflow: hidden;
  color: #777777;
  font-size: 9px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.interest-more {
  flex: 0 0 auto;
  padding: 4px 7px;
  border-radius: 10px;
  background: #f4f0e7;
  color: #887349;
  font-size: 9px;
  font-weight: 800;
}

.form-card {
  padding: 15px;
  border: 1px solid #ece8e0;
  border-radius: 10px;
  background: var(--cream);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.13);
}

.form-heading {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.form-heading-icon {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  display: grid;
  place-items: center;
  border-radius: 10px;
  background: #f1e4c7;
  color: var(--gold-dark);
}

.form-heading-icon svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.selected-client {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  margin-bottom: 12px;
  padding: 9px 11px;
  border: 1px solid #eadfca;
  border-radius: 8px;
  background: #fffaf0;
}

.selected-client span {
  color: #8a806f;
  font-size: 10px;
}

.selected-client strong {
  min-width: 0;
  overflow: hidden;
  color: #715a2c;
  font-size: 11px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 11px;
}

.field {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.field-full {
  grid-column: 1 / -1;
}

.field > span {
  padding-left: 1px;
  color: #3e3e3e;
  font-size: 10px;
  font-weight: 650;
}

.input-wrap,
.textarea-wrap {
  position: relative;
  min-width: 0;
  border: 1px solid #e6e2db;
  border-radius: 8px;
  background: #ffffff;
  transition:
    border-color 0.15s ease,
    box-shadow 0.15s ease;
}

.input-wrap:focus-within,
.textarea-wrap:focus-within {
  border-color: #d1b46b;
  box-shadow: 0 0 0 3px rgba(202, 166, 83, 0.12);
}

.input-wrap {
  min-height: 40px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 10px;
}

.input-wrap svg {
  width: 15px;
  height: 15px;
  flex: 0 0 15px;
  fill: none;
  stroke: #8a8a8a;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.input-wrap input,
.input-wrap select {
  width: 100%;
  min-width: 0;
  height: 38px;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: #3d3d3d;
  font-size: 11px;
}

.input-wrap select {
  appearance: none;
  cursor: pointer;
  padding-right: 18px;
  background:
    linear-gradient(45deg, transparent 50%, #777 50%) right 5px center / 5px 5px no-repeat,
    linear-gradient(135deg, #777 50%, transparent 50%) right 1px center / 5px 5px no-repeat;
}

.textarea-wrap {
  min-height: 86px;
  padding: 10px 11px 20px;
}

.textarea-wrap textarea {
  width: 100%;
  min-height: 60px;
  resize: vertical;
  border: 0;
  outline: 0;
  background: transparent;
  color: #333333;
  font-size: 11px;
  line-height: 1.45;
}

.textarea-wrap textarea::placeholder {
  color: #9a9a9a;
}

.textarea-wrap small {
  position: absolute;
  right: 9px;
  bottom: 6px;
  color: #777777;
  font-size: 8px;
}

.form-error {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin-top: 11px;
  padding: 9px 10px;
  border-radius: 8px;
  background: #fff0ef;
  color: #a63c35;
  font-size: 10px;
  line-height: 1.4;
}

.form-error svg {
  width: 16px;
  height: 16px;
  flex: 0 0 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.submit-button {
  width: 100%;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 11px;
  padding: 9px 14px;
  border: 0;
  border-radius: 7px;
  background: var(--gold);
  color: #ffffff;
  font-size: 12px;
  font-weight: 800;
  cursor: pointer;
  box-shadow: 0 2px 4px rgba(164, 130, 54, 0.18);
}

.submit-button:hover:not(:disabled) {
  background: #be9a4b;
}

.submit-button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.button-spinner {
  width: 13px;
  height: 13px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #ffffff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.history-section {
  padding-bottom: 10px;
}

.refresh-button {
  width: 32px;
  height: 32px;
  display: grid;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: #ffffff;
  color: #7c6a46;
  box-shadow: 0 1px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
}

.refresh-button svg {
  width: 16px;
  height: 16px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.history-list {
  display: grid;
  gap: 8px;
}

.history-card {
  min-width: 0;
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  gap: 10px;
  padding: 10px;
  border: 1px solid #ececec;
  border-radius: 9px;
  background: #ffffff;
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.11);
}

.history-icon {
  width: 40px;
  height: 40px;
  display: grid;
  place-items: center;
  border-radius: 50%;
}

.history-icon.whatsapp {
  background: #d9efd9;
  color: #338b4b;
}

.history-icon.phone {
  background: #ffeab1;
  color: #b58a25;
}

.history-icon.other {
  background: #e7e7e7;
  color: #6d6d6d;
}

.history-icon svg {
  width: 21px;
  height: 21px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.history-body {
  min-width: 0;
}

.history-meta {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}

.history-meta strong {
  color: #333333;
  font-size: 10px;
  font-weight: 850;
}

.history-meta span {
  color: #777777;
  font-size: 9px;
}

.history-customer {
  display: block;
  overflow: hidden;
  margin-top: 2px;
  color: #292929;
  font-size: 10px;
  font-weight: 800;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.history-method {
  display: block;
  margin-top: 2px;
  color: #747474;
  font-size: 8px;
}

.history-body p {
  margin: 4px 0 0;
  overflow-wrap: anywhere;
  color: #666666;
  font-size: 9px;
  line-height: 1.35;
}

.history-side {
  min-width: 54px;
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  justify-content: space-between;
  gap: 6px;
}

.status-badge {
  max-width: 90px;
  padding: 5px 8px;
  border-radius: 6px;
  font-size: 8px;
  font-weight: 800;
  line-height: 1;
  text-align: center;
}

.status-badge.sold {
  background: #d9efd9;
  color: #3d8650;
}

.status-badge.interested {
  background: #fff0c9;
  color: #97732b;
}

.status-badge.negotiation {
  background: #e8e0f6;
  color: #6e5792;
}

.status-badge.prospect {
  background: #fff0df;
  color: #9d713f;
}

.status-badge.danger {
  background: #f8dddd;
  color: #a65050;
}

.more-button {
  width: 24px;
  height: 24px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 2px;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.more-button span {
  width: 3px;
  height: 3px;
  border-radius: 50%;
  background: #222222;
}

.loading-box,
.empty-box {
  min-height: 100px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 4px;
  padding: 20px;
  border: 1px dashed #d9d4ca;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.7);
  color: #777777;
  font-size: 10px;
  text-align: center;
}

.empty-box strong {
  color: #444444;
  font-size: 12px;
}

.empty-box span {
  font-size: 9px;
}

.empty-icon {
  width: 34px;
  height: 34px;
  display: grid;
  place-items: center;
  margin-bottom: 4px;
  border-radius: 50%;
  background: #f4ead4;
  color: var(--gold-dark);
}

.empty-icon svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (min-width: 721px) {
  .followup-page {
    padding-bottom: 24px;
  }
}

@media (max-width: 560px) {
  .page-content {
    width: min(100% - 20px, 720px);
  }

  .form-grid {
    grid-template-columns: 1fr;
  }

  .field-full {
    grid-column: auto;
  }
}

@media (max-width: 390px) {
  .page-content {
    width: calc(100% - 16px);
    padding-top: 10px;
  }

  .form-card {
    padding: 12px;
  }

  .customer-card,
  .history-card {
    padding: 9px;
  }

  .history-card {
    grid-template-columns: 34px minmax(0, 1fr) auto;
    gap: 8px;
  }

  .history-icon {
    width: 34px;
    height: 34px;
  }

  .history-icon svg {
    width: 18px;
    height: 18px;
  }

  .history-side {
    min-width: 48px;
  }

  .status-badge {
    max-width: 74px;
    padding: 4px 6px;
    font-size: 7px;
  }

}
</style>