<template>
  <div class="prospect-page">
    <main class="page-content">
      <!-- INFORMASI CALON PEMBELI -->
      <section class="form-card">
        <div class="section-title">
          <div class="section-icon">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="7" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
          </div>
          <h2>Informasi Calon Pembeli</h2>
        </div>

        <div class="fields">
          <label class="field">
            <span>Nama Lengkap <b>*</b></span>
            <div class="input-wrap">
              <svg viewBox="0 0 24 24">
                <circle cx="12" cy="8" r="4" />
                <path d="M4 21a8 8 0 0 1 16 0" />
              </svg>
              <input
                v-model="form.full_name"
                type="text"
                autocomplete="name"
                placeholder="Masukan nama lengkap"
                maxlength="100"
              />
            </div>
          </label>

          <label class="field">
            <span>Nomor Kontak <b>*</b></span>
            <div class="input-wrap">
              <svg viewBox="0 0 24 24">
                <path d="M21 16.5v3a2 2 0 0 1-2.2 2A18.4 18.4 0 0 1 3 5.2 2 2 0 0 1 5 3h3a2 2 0 0 1 2 1.7 12 12 0 0 0 .7 2.8 2 2 0 0 1-.5 2.1L9 10.9a16 16 0 0 0 4.1 4.1l1.3-1.2a2 2 0 0 1 2.1-.5 12 12 0 0 0 2.8.7A2 2 0 0 1 21 16.5Z" />
              </svg>
              <input
                v-model="form.phone"
                type="tel"
                inputmode="tel"
                autocomplete="tel"
                placeholder="Contoh: 0823 4735 8236"
                maxlength="20"
              />
            </div>
          </label>

          <label class="field">
            <span>Email <em>(Opsional)</em></span>
            <div class="input-wrap">
              <svg viewBox="0 0 24 24">
                <rect x="3" y="5" width="18" height="14" rx="2" />
                <path d="m3 7 9 6 9-6" />
              </svg>
              <input
                v-model="form.email"
                type="email"
                autocomplete="email"
                placeholder="contoh@email.com"
                maxlength="120"
              />
            </div>
          </label>

          <label class="field">
            <span>Alamat Lengkap <b>*</b></span>
            <div class="textarea-wrap address-wrap">
              <svg viewBox="0 0 24 24">
                <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
                <circle cx="12" cy="10" r="2.5" />
              </svg>
              <textarea
                v-model="form.address"
                maxlength="200"
                placeholder="Masukan alamat lengkap"
              ></textarea>
              <small>{{ form.address.length }}/200</small>
            </div>
          </label>
        </div>
      </section>

      <!-- INFORMASI MINAT KAVLING -->
      <section class="form-card">
        <div class="section-title">
          <div class="section-icon">
            <svg viewBox="0 0 24 24">
              <rect x="4" y="4" width="16" height="16" rx="2" />
              <path d="M9 4v16M15 4v16M4 9h16M4 15h16" />
            </svg>
          </div>
          <h2>Informasi Minat Kavling</h2>
        </div>

        <div class="fields">
          <!-- LOT SELECTOR -->
          <div class="field">
            <span>Kavling yang diminati <b>*</b></span>

            <button
              type="button"
              class="select-control"
              :class="{ invalid: submitted && !selectedLots.length }"
              @click="lotPickerOpen = !lotPickerOpen"
            >
              <svg viewBox="0 0 24 24">
                <rect x="4" y="5" width="16" height="14" rx="2" />
                <path d="M9 5v14M15 5v14M4 10h5M15 10h5M4 15h5M15 15h5" />
              </svg>

              <span v-if="!selectedLots.length" class="placeholder">
                Pilih Kavling
              </span>

              <span v-else class="selected-summary">
                {{ selectedLots.length }} kavling dipilih
              </span>

              <svg class="select-arrow" viewBox="0 0 24 24">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>

            <div
              v-if="lotPickerOpen"
              class="picker-panel"
            >
              <div class="picker-search">
                <svg viewBox="0 0 24 24">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-4-4" />
                </svg>
                <input
                  v-model="lotSearch"
                  type="search"
                  placeholder="Cari nomor kavling..."
                />
              </div>

              <div v-if="loadingLots" class="picker-message">
                Memuat kavling...
              </div>

              <div
                v-else-if="!filteredLots.length"
                class="picker-message"
              >
                Kavling tersedia tidak ditemukan.
              </div>

              <div v-else class="lot-options">
                <button
                  v-for="lot in filteredLots"
                  :key="lot.id"
                  type="button"
                  class="lot-option"
                  :class="{ checked: isLotSelected(lot.id) }"
                  @click.stop="toggleLot(lot)"
                >
                  <span class="check-box">
                    <svg
                      v-if="isLotSelected(lot.id)"
                      viewBox="0 0 24 24"
                    >
                      <path d="m5 12 4 4L19 6" />
                    </svg>
                  </span>

                  <span class="lot-option-main">
                    <strong>{{ lot.lot_number }}</strong>
                    <small>
                      {{ getLotMeta(lot) }}
                    </small>
                  </span>
                </button>
              </div>

              <div class="picker-footer">
                <span>
                  {{ selectedLots.length }} dipilih
                </span>
                <button
                  type="button"
                  @click="lotPickerOpen = false"
                >
                  Selesai
                </button>
              </div>
            </div>

            <div v-if="selectedLots.length" class="selected-lots">
              <button
                v-for="lot in selectedLots"
                :key="lot.id"
                type="button"
                class="lot-chip"
                @click="removeLot(lot.id)"
              >
                <span>{{ lot.lot_number }}</span>
                <svg viewBox="0 0 24 24">
                  <path d="M6 6l12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
          </div>

          <!-- PAYMENT -->
          <div class="field">
            <span>Metode Pembayaran <b>*</b></span>

            <div class="payment-grid">
              <button
                type="button"
                class="payment-card"
                :class="{ active: form.payment_type === 'Cash' }"
                @click="selectPayment('Cash')"
              >
                <span class="radio">
                  <span></span>
                </span>

                <span>
                  <strong>Cash</strong>
                  <small>Pembayaran tunai</small>
                </span>
              </button>

              <button
                type="button"
                class="payment-card"
                :class="{ active: form.payment_type === 'Installment' }"
                @click="selectPayment('Installment')"
              >
                <span class="radio">
                  <span></span>
                </span>

                <span>
                  <strong>Cicil</strong>
                  <small>Pembayaran bertahap</small>
                </span>
              </button>
            </div>
          </div>

          <!-- TENOR -->
          <div
            v-if="form.payment_type === 'Installment'"
            class="field"
          >
            <div class="field-label-row">
              <span>Rencana Tenor <em>(Opsional)</em></span>
              <span class="plan-hint">Sesuai data Admin</span>
            </div>

            <div v-if="loadingPlans" class="plans-loading">
              Memuat pilihan tenor...
            </div>

            <div
              v-else-if="!paymentPlans.length"
              class="plans-empty"
            >
              Belum ada rencana tenor.
            </div>

            <div v-else class="plan-grid">
              <button
                v-for="plan in paymentPlans"
                :key="plan.id"
                type="button"
                class="plan-card"
                :class="{ active: form.plan_id === plan.id }"
                @click="form.plan_id = plan.id"
              >
                <span class="radio">
                  <span></span>
                </span>
                <span class="plan-text">
                  <strong>{{ plan.months }} Bulan</strong>
                  <small>{{ formatPaymentPlanName(plan.plan_name, plan.months) }}</small>
                </span>
              </button>
            </div>

            <p class="helper-text">
              Tenor hanya merupakan rencana awal dari calon pembeli.
              Keputusan transaksi final ditentukan Admin.
            </p>
          </div>
        </div>
      </section>

      <!-- INFORMASI TAMBAHAN -->
      <section class="form-card">
        <div class="section-title">
          <div class="section-icon">
            <svg viewBox="0 0 24 24">
              <path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8l-4 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
              <path d="M8 9h8M8 13h5" />
            </svg>
          </div>
          <h2>Informasi Tambahan</h2>
        </div>

        <label class="field">
          <span>Catatan</span>

          <div class="textarea-wrap notes-wrap">
            <textarea
              v-model="form.notes"
              maxlength="500"
              placeholder="Tambahkan catatan mengenai calon pembeli"
            ></textarea>
            <small>{{ form.notes.length }}/500</small>
          </div>
        </label>
      </section>

      <!-- ERROR -->
      <div
        v-if="errorMessage"
        class="error-message"
        role="alert"
      >
        <svg viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="9" />
          <path d="M12 8v4M12 16h.01" />
        </svg>
        <span>{{ errorMessage }}</span>
      </div>

      <!-- SAVE -->
      <button
        type="button"
        class="save-button"
        :disabled="saving"
        @click="submit"
      >
        <span v-if="saving" class="spinner"></span>
        {{ saving ? 'Menyimpan...' : 'Simpan Calon Pembeli' }}
      </button>

      <p class="privacy-note">
        Data calon pembeli akan dikirim ke Admin untuk diproses.
      </p>
    </main>

  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue'
import { useIonRouter } from '@ionic/vue'
import {
  createProspectiveCustomer,
  getAvailableLots,
  getCurrentMarketingProfile,
  getPaymentPlans,
} from '@/services/marketing/customerService'
import { formatPaymentPlanName } from '@/utils/paymentPlan'

const ionRouter = useIonRouter()

const loadingLots = ref(true)
const loadingPlans = ref(true)
const saving = ref(false)
const submitted = ref(false)

const lotPickerOpen = ref(false)
const lotSearch = ref('')
const errorMessage = ref('')

const currentUser = ref(null)
const currentProfile = ref(null)

const lots = ref([])
const paymentPlans = ref([])
const selectedLots = ref([])

const form = reactive({
  full_name: '',
  phone: '',
  email: '',
  address: '',
  payment_type: 'Cash',
  plan_id: null,
  notes: '',
})

const filteredLots = computed(() => {
  const keyword = lotSearch.value.trim().toLowerCase()

  if (!keyword) return lots.value

  return lots.value.filter((lot) => {
    const block = lot.blocks?.code || lot.blocks?.name || ''

    return [
      lot.lot_number,
      lot.polygon_id,
      lot.dimension,
      block,
    ]
      .filter(Boolean)
      .some((value) =>
        String(value).toLowerCase().includes(keyword),
      )
  })
})

function getLotMeta(lot) {
  const block = lot.blocks?.code || lot.blocks?.name
  const area = lot.area ? `${Number(lot.area)} m²` : null
  const dimension = lot.dimension

  return [block ? `Blok ${block}` : null, area, dimension]
    .filter(Boolean)
    .join(' · ') || 'Detail kavling tersedia'
}

function isLotSelected(lotId) {
  return selectedLots.value.some((lot) => lot.id === lotId)
}

function toggleLot(lot) {
  const exists = isLotSelected(lot.id)

  if (exists) {
    selectedLots.value = selectedLots.value.filter(
      (item) => item.id !== lot.id,
    )
    return
  }

  selectedLots.value.push(lot)
}

function removeLot(lotId) {
  selectedLots.value = selectedLots.value.filter(
    (lot) => lot.id !== lotId,
  )
}

function selectPayment(type) {
  form.payment_type = type

  if (type === 'Cash') {
    form.plan_id = null
  }
}

function validate() {
  submitted.value = true
  errorMessage.value = ''

  if (!form.full_name.trim()) {
    errorMessage.value = 'Nama lengkap wajib diisi.'
    return false
  }

  if (!form.phone.trim()) {
    errorMessage.value = 'Nomor kontak wajib diisi.'
    return false
  }

  if (!form.address.trim()) {
    errorMessage.value = 'Alamat lengkap wajib diisi.'
    return false
  }

  if (!selectedLots.value.length) {
    errorMessage.value =
      'Pilih minimal satu kavling yang diminati.'
    return false
  }

  if (!form.payment_type) {
    errorMessage.value =
      'Metode pembayaran wajib dipilih.'
    return false
  }

  if (
    form.payment_type === 'Installment' &&
    !form.plan_id
  ) {
    errorMessage.value =
      'Pilih rencana tenor untuk metode cicil.'
    return false
  }

  if (
    form.email.trim() &&
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      form.email.trim(),
    )
  ) {
    errorMessage.value =
      'Format email tidak valid.'
    return false
  }

  return true
}

async function submit() {
  if (!validate()) return

  saving.value = true
  errorMessage.value = ''

  try {
    await createProspectiveCustomer({
      customer: {
        full_name: form.full_name,
        phone: form.phone,
        email: form.email,
        address: form.address,
        notes: form.notes,
      },

      interests: selectedLots.value.map((lot) => ({
        lot_id: lot.id,
        payment_type: form.payment_type,
        plan_id: form.plan_id,
        notes: form.notes,
      })),
    })

    /*
     * Setelah berhasil, kembali ke halaman daftar calon pembeli.
     * Ubah route jika route project kamu berbeda.
     */
    await ionRouter.push('/marketing/clients')
  } catch (error) {
    console.error('Gagal menyimpan calon pembeli:', error)

    errorMessage.value =
      error?.message ||
      'Data calon pembeli gagal disimpan. Silakan coba lagi.'
  } finally {
    saving.value = false
  }
}

async function loadData() {
  loadingLots.value = true
  loadingPlans.value = true
  errorMessage.value = ''

  try {
    const [availableLots, plans] = await Promise.all([
      getAvailableLots(),
      getPaymentPlans(),
    ])

    lots.value = availableLots
    paymentPlans.value = plans
  } catch (error) {
    console.error(error)
    errorMessage.value =
      'Data kavling atau rencana tenor gagal dimuat.'
  } finally {
    loadingLots.value = false
    loadingPlans.value = false
  }
}

onMounted(async () => {
  try {
    const session = await getCurrentMarketingProfile()

    currentUser.value = session.user
    currentProfile.value = session.profile

    await loadData()
  } catch (error) {
    console.error(error)
    errorMessage.value =
      'Sesi login tidak ditemukan atau akun tidak memiliki akses Marketing.'
  }
})
</script>

<style scoped>
:global(*) {
  box-sizing: border-box;
}

:global(html) {
  background: #f1f1ef;
}

:global(body) {
  margin: 0;
  background: #f1f1ef;
  color: #292929;
  font-family:
    Inter,
    ui-sans-serif,
    system-ui,
    -apple-system,
    BlinkMacSystemFont,
    "Segoe UI",
    sans-serif;
}

button,
input,
textarea,
select {
  font: inherit;
}

button {
  -webkit-tap-highlight-color: transparent;
}

.prospect-page {
  --gold: #caa653;
  --gold-dark: #a9853e;
  --gold-light: #f7edd6;
  --cream: #fbf8f1;
  --text: #292929;
  --muted: #77736b;
  --border: #e3dfd7;

  min-height: 100dvh;
  padding-bottom: calc(80px + env(safe-area-inset-bottom));
  background:
    linear-gradient(
      180deg,
      #f4f4f2 0%,
      #f7f7f5 75%,
      #e9e9df 100%
    );
}

/* CONTENT */
.page-content {
  width: min(calc(100% - 24px), 720px);
  margin: 0 auto;
  padding: 6px 0 24px;
}

.form-card {
  margin-bottom: 7px;
  padding: 0 14px 13px;
  border: 1px solid #e4e1db;
  border-radius: 9px;
  background: var(--cream);
  box-shadow: 0 2px 5px rgba(0, 0, 0, 0.12);
}

.section-title {
  min-height: 45px;
  display: flex;
  align-items: center;
  gap: 11px;
  margin: 0 -14px 9px;
  padding: 7px 13px;
  border-bottom: 1px solid #e4dfd6;
  border-radius: 9px 9px 8px 8px;
  background: #fcf9f3;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.09);
}

.section-icon {
  width: 30px;
  height: 30px;
  flex: 0 0 30px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--gold-light);
  color: var(--gold-dark);
}

.section-icon svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.65;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.section-title h2 {
  margin: 0;
  color: #9a7838;
  font-size: 13px;
  font-weight: 850;
}

.fields {
  display: grid;
  gap: 7px;
}

.field {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.field > span,
.field-label-row > span:first-child {
  padding-left: 1px;
  color: #303030;
  font-size: 9px;
  font-weight: 750;
}

.field b {
  color: #df3939;
}

.field em {
  color: #777;
  font-style: normal;
  font-weight: 500;
}

/* INPUT */
.input-wrap,
.textarea-wrap,
.select-control {
  width: 100%;
  border: 1px solid #dedbd5;
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 2px 2px rgba(0, 0, 0, 0.16);
}

.input-wrap {
  min-height: 32px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 9px;
}

.input-wrap svg,
.textarea-wrap > svg,
.select-control > svg:first-child {
  width: 17px;
  height: 17px;
  flex: 0 0 17px;
  fill: none;
  stroke: var(--gold);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.input-wrap input {
  width: 100%;
  min-width: 0;
  height: 30px;
  border: 0;
  outline: 0;
  color: #333;
  background: transparent;
  font-size: 10px;
}

.input-wrap input::placeholder,
.textarea-wrap textarea::placeholder {
  color: #9b9b9b;
}

/* TEXTAREA */
.textarea-wrap {
  position: relative;
  min-height: 68px;
  padding: 8px 9px 19px 9px;
}

.textarea-wrap textarea {
  width: 100%;
  min-height: 48px;
  resize: vertical;
  border: 0;
  outline: 0;
  background: transparent;
  color: #333;
  font-size: 10px;
  line-height: 1.45;
}

.textarea-wrap > svg {
  float: left;
  margin: 1px 9px 0 0;
}

.textarea-wrap small {
  position: absolute;
  right: 8px;
  bottom: 5px;
  color: #6e6e6e;
  font-size: 7px;
}

/* LOT PICKER */
.select-control {
  min-height: 33px;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 0 9px;
  color: #4c4c4c;
  text-align: left;
  cursor: pointer;
}

.select-control .placeholder {
  color: #9a9a9a;
  font-size: 10px;
}

.selected-summary {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: #5d5139;
  font-size: 10px;
  font-weight: 700;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.select-arrow {
  margin-left: auto;
  width: 18px !important;
  height: 18px !important;
  color: #222;
  stroke: currentColor !important;
  stroke-width: 2 !important;
}

.select-control.invalid {
  border-color: #d66b61;
}

.picker-panel {
  position: absolute;
  top: calc(100% + 5px);
  right: 0;
  left: 0;
  z-index: 40;
  overflow: hidden;
  border: 1px solid #ddd8cf;
  border-radius: 9px;
  background: #fff;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.16);
}

.picker-search {
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px;
  border-bottom: 1px solid #ece8e1;
}

.picker-search svg {
  width: 15px;
  height: 15px;
  fill: none;
  stroke: #8b8b8b;
  stroke-width: 1.7;
  stroke-linecap: round;
}

.picker-search input {
  width: 100%;
  min-width: 0;
  height: 27px;
  border: 0;
  outline: 0;
  font-size: 10px;
}

.lot-options {
  max-height: 210px;
  overflow-y: auto;
}

.lot-option {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 9px;
  padding: 9px;
  border: 0;
  border-bottom: 1px solid #f0eee9;
  background: #fff;
  color: #292929;
  text-align: left;
  cursor: pointer;
}

.lot-option:hover,
.lot-option.checked {
  background: #fffaf0;
}

.check-box {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  display: grid;
  place-items: center;
  border: 1.5px solid #c8c5bd;
  border-radius: 5px;
}

.lot-option.checked .check-box {
  border-color: var(--gold);
  background: var(--gold);
  color: #fff;
}

.check-box svg {
  width: 12px;
  height: 12px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2.5;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.lot-option-main {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.lot-option-main strong {
  font-size: 10px;
  font-weight: 850;
}

.lot-option-main small {
  overflow: hidden;
  color: #777;
  font-size: 8px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.picker-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 9px;
  background: #faf8f3;
}

.picker-footer span {
  color: #777;
  font-size: 9px;
}

.picker-footer button {
  padding: 5px 10px;
  border: 0;
  border-radius: 6px;
  background: var(--gold);
  color: #fff;
  font-size: 9px;
  font-weight: 800;
  cursor: pointer;
}

.picker-message {
  padding: 18px 10px;
  color: #888;
  font-size: 9px;
  text-align: center;
}

.selected-lots {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
  margin-top: 6px;
}

.lot-chip {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  max-width: 100%;
  padding: 4px 7px;
  border: 1px solid #e1cf9f;
  border-radius: 12px;
  background: #fbf2df;
  color: #81652f;
  font-size: 8px;
  font-weight: 800;
  cursor: pointer;
}

.lot-chip svg {
  width: 11px;
  height: 11px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

/* PAYMENT */
.payment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 7px;
}

.payment-card {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  padding: 8px;
  border: 1px solid #ddd9d1;
  border-radius: 8px;
  background: #fff;
  color: #333;
  text-align: left;
  cursor: pointer;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
}

.payment-card.active {
  border-color: #d1ae61;
  background: #fffaf0;
}

.payment-card > span:last-child {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.payment-card strong {
  font-size: 10px;
  font-weight: 850;
}

.payment-card small {
  color: #888;
  font-size: 7px;
}

.radio {
  width: 15px;
  height: 15px;
  flex: 0 0 15px;
  display: grid;
  place-items: center;
  border: 1.5px solid #aaa;
  border-radius: 50%;
}

.radio > span {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: transparent;
}

.active .radio {
  border-color: var(--gold);
}

.active .radio > span {
  background: var(--gold);
}

/* PLAN */
.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.plan-hint {
  color: #a18550 !important;
  font-size: 7px !important;
  font-weight: 600 !important;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(88px, 1fr));
  gap: 6px;
}

.plan-card {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px;
  border: 1px solid #ddd9d1;
  border-radius: 8px;
  background: #fff;
  text-align: left;
  cursor: pointer;
}

.plan-card.active {
  border-color: #d0aa59;
  background: #fff9ed;
  box-shadow: 0 1px 3px rgba(170, 133, 52, 0.18);
}

.plan-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.plan-text strong {
  font-size: 9px;
  font-weight: 850;
}

.plan-text small {
  overflow: hidden;
  color: #777;
  font-size: 7px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.helper-text {
  margin: 5px 1px 0;
  color: #888;
  font-size: 7px;
  line-height: 1.35;
}

.plans-loading,
.plans-empty {
  padding: 10px;
  border: 1px dashed #ddd6c9;
  border-radius: 7px;
  color: #888;
  font-size: 8px;
  text-align: center;
}

/* ERROR + SAVE */
.error-message {
  display: flex;
  align-items: flex-start;
  gap: 7px;
  margin: 9px 0;
  padding: 9px 10px;
  border: 1px solid #f0c7c3;
  border-radius: 8px;
  background: #fff0ef;
  color: #a64640;
  font-size: 9px;
  line-height: 1.4;
}

.error-message svg {
  width: 15px;
  height: 15px;
  flex: 0 0 15px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.save-button {
  width: 100%;
  min-height: 40px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  margin-top: 4px;
  padding: 8px 14px;
  border: 0;
  border-radius: 8px;
  background: var(--gold);
  color: #fff;
  font-size: 11px;
  font-weight: 850;
  box-shadow: 0 2px 5px rgba(163, 127, 49, 0.22);
  cursor: pointer;
}

.save-button:hover:not(:disabled) {
  background: #bc994d;
}

.save-button:disabled {
  opacity: 0.58;
  cursor: not-allowed;
}

.spinner {
  width: 13px;
  height: 13px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

.privacy-note {
  margin: 7px 0 0;
  color: #999;
  font-size: 7px;
  line-height: 1.35;
  text-align: center;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* RESPONSIVE */
@media (max-width: 390px) {
  .page-content {
    width: calc(100% - 12px);
    padding-top: 5px;
  }

  .form-card {
    padding: 0 10px 11px;
    margin-bottom: 6px;
  }

  .section-title {
    min-height: 43px;
    margin-left: -10px;
    margin-right: -10px;
    padding-left: 10px;
    padding-right: 10px;
  }

  .section-title h2 {
    font-size: 12px;
  }

  .fields {
    gap: 6px;
  }

  .payment-grid {
    gap: 5px;
  }

  .payment-card {
    padding: 7px 6px;
  }

  .payment-card small {
    font-size: 6.5px;
  }
}

@media (min-width: 721px) {
  .prospect-page {
    padding-bottom: 24px;
  }
}
</style>
