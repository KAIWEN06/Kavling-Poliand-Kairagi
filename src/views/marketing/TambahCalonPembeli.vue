<template>
  <MarketingPageLayout title="Tambah Klien" show-back :back-route="listPath" :tab-variant="tabVariant" :refreshable="false">
  <div class="prospect-page">
    <main class="page-content">
      <!-- DATA KLIEN -->
      <section class="form-card">
        <div class="section-title">
          <div class="section-icon">
            <svg viewBox="0 0 24 24">
              <circle cx="12" cy="7" r="4" />
              <path d="M4 21a8 8 0 0 1 16 0" />
            </svg>
          </div>
          <h2>Data diri</h2>
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
                v-model="form.full_name" data-input="name"
                type="text"
                autocomplete="name"
                placeholder="Sesuai KTP"
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
                placeholder="Contoh: 0812 3456 7890"
                maxlength="20"
              />
            </div>
          </label>

          <label class="field">
            <span>WhatsApp <em>(jika berbeda)</em></span>
            <div class="input-wrap">
              <svg viewBox="0 0 24 24">
                <path d="M4 20l1.3-3.9A8 8 0 1 1 8 19.1L4 20Z" />
              </svg>
              <input
                v-model="form.whatsapp_phone"
                type="tel"
                inputmode="tel"
                placeholder="Kosongkan jika sama"
                maxlength="20"
              />
            </div>
          </label>

          <label class="field">
            <span>Email <em>(opsional)</em></span>
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

          <AddressFields v-model="address" />

          <label v-if="isHead" class="field">
            <span>Pemasar penanggung jawab <b>*</b></span>
            <select v-model="form.marketing_id" class="mk-input">
              <option value="">Pilih anggota tim</option>
              <option v-for="m in teamMembers" :key="m.id" :value="m.id">{{ m.full_name }}</option>
            </select>
          </label>
          <p v-else class="owner-note">Tercatat atas nama Anda.</p>
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
          <h2>Minat kaveling</h2>
        </div>

        <div class="fields">
          <!-- LOT SELECTOR -->
          <div class="field">
            <span>Kaveling <b>*</b></span>

            <button
              type="button"
              class="select-control"
              :class="{ invalid: submitted && !selectedLots.length }"
              :aria-expanded="lotPickerOpen"
              @click="lotPickerOpen = !lotPickerOpen"
            >
              <svg viewBox="0 0 24 24">
                <rect x="4" y="5" width="16" height="14" rx="2" />
                <path d="M9 5v14M15 5v14M4 10h5M15 10h5M4 15h5M15 15h5" />
              </svg>

              <span v-if="!selectedLots.length" class="placeholder">
                Pilih kaveling
              </span>

              <span v-else class="selected-summary">
                {{ selectedLots.length }} kaveling dipilih
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
                  placeholder="Cari nomor kaveling"
                  aria-label="Cari nomor kaveling"
                />
              </div>

              <div v-if="loadingLots" class="picker-message">
                Memuat kaveling...
              </div>

              <div
                v-else-if="!filteredLots.length"
                class="picker-message"
              >
                Tidak ada kaveling yang cocok.
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
                :aria-label="`Hapus kaveling ${lot.lot_number}`"
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
            <span>Metode pembayaran <b>*</b></span>

            <div class="payment-grid">
              <button
                type="button"
                class="payment-card"
                :class="{ active: form.payment_type === 'Cash' }"
                :aria-pressed="form.payment_type === 'Cash'"
                @click="selectPayment('Cash')"
              >
                <span class="radio">
                  <span></span>
                </span>

                <span>
                  <strong>Tunai</strong>
                  <small>Sekali bayar</small>
                </span>
              </button>

              <button
                type="button"
                class="payment-card"
                :class="{ active: form.payment_type === 'Installment' }"
                :aria-pressed="form.payment_type === 'Installment'"
                @click="selectPayment('Installment')"
              >
                <span class="radio">
                  <span></span>
                </span>

                <span>
                  <strong>Cicilan</strong>
                  <small>Bayar bertahap</small>
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
              <span>Rencana tenor <em>(opsional)</em></span>
            </div>

            <div v-if="loadingPlans" class="plans-loading">
              Memuat pilihan tenor...
            </div>

            <div
              v-else-if="!paymentPlans.length"
              class="plans-empty"
            >
              Belum ada pilihan tenor.
            </div>

            <div v-else class="plan-grid">
              <button
                v-for="plan in paymentPlans"
                :key="plan.id"
                type="button"
                class="plan-card"
                :class="{ active: form.plan_id === plan.id }"
                :aria-pressed="form.plan_id === plan.id"
                @click="form.plan_id = form.plan_id === plan.id ? null : plan.id"
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
              Hanya rencana awal. Admin menetapkan transaksi final.
            </p>
          </div>
        </div>
      </section>

      <!-- CATATAN -->
      <section class="form-card">
        <div class="section-title">
          <div class="section-icon">
            <svg viewBox="0 0 24 24">
              <path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2h-8l-4 3v-3H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
              <path d="M8 9h8M8 13h5" />
            </svg>
          </div>
          <h2>Catatan</h2>
        </div>

        <label class="field">
          <span>Catatan <em>(opsional)</em></span>

          <div class="textarea-wrap notes-wrap">
            <textarea
              v-model="form.notes"
              maxlength="500"
              placeholder="Misalnya waktu yang nyaman untuk dihubungi"
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
        <div class="error-body">
          <span>{{ errorMessage }}</span>
          <button
            v-if="conflictCustomerId !== null"
            type="button"
            class="error-action"
            @click="openConflictCustomer"
          >
            Buka data klien
          </button>
        </div>
      </div>

      <!-- AKSI -->
      <div class="form-actions">
        <button type="button" class="cancel-button" :disabled="saving" @click="cancel">
          Batal
        </button>
        <button type="button" class="save-button" :disabled="saving" @click="submit">
          <span v-if="saving" class="spinner"></span>
          {{ saving ? 'Menyimpan…' : 'Simpan klien' }}
        </button>
      </div>
    </main>

  </div>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import { useRealtimeRefresh } from '@/composables/useRealtimeRefresh'
import { computed, onMounted, reactive, ref } from 'vue'
import { useIonRouter } from '@ionic/vue'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import {
  createProspectiveCustomer,
  getAvailableLots,
  getCurrentMarketingProfile,
  getPaymentPlans,
} from '@/services/marketing/customerService'
import { formatPaymentPlanName } from '@/utils/paymentPlan'
import AddressFields from '@/components/marketing/shared/AddressFields.vue'
import { addressColumns, emptyAddress, missingAddressFields } from '@/utils/address'
import {
  findContactConflict,
  getTeamMembers,
  type TeamMember,
} from '@/services/marketing/marketingCrmService'
import { useSmartBack } from '@/composables/useSmartBack'
import { useToast } from '@/composables/useToast'

type AvailableLot = Awaited<ReturnType<typeof getAvailableLots>>[number] & { blocks?: any }
type PlanOption = Awaited<ReturnType<typeof getPaymentPlans>>[number]

const ionRouter = useIonRouter()

const address = ref(emptyAddress())
const teamMembers = ref<TeamMember[]>([])
const isHead = computed(() => currentProfile.value?.role === 'marketing_head')
const listPath = computed(() => (isHead.value ? '/kepala-marketing/clients' : '/marketing/clients'))
const tabVariant = computed(() => (isHead.value ? 'head' : 'marketing'))

const loadingLots = ref(true)
const loadingPlans = ref(true)
const saving = ref(false)
const submitted = ref(false)

const lotPickerOpen = ref(false)
const lotSearch = ref('')
const errorMessage = ref('')
// Client yang sudah memakai nomor ini dan boleh dibuka pemanggil (null bila bukan miliknya).
const conflictCustomerId = ref<number | null>(null)

const currentProfile = ref<{ id: string; role: string } | null>(null)

const lots = ref<AvailableLot[]>([])
const paymentPlans = ref<PlanOption[]>([])
const selectedLots = ref<AvailableLot[]>([])

const { goBack: cancel } = useSmartBack(() => listPath.value)

const form = reactive({
  full_name: '',
  phone: '',
  whatsapp_phone: '',
  marketing_id: '',
  email: '',
  payment_type: 'Cash' as 'Cash' | 'Installment',
  plan_id: null as number | null,
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

function getLotMeta(lot: AvailableLot) {
  const block = lot.blocks?.code || lot.blocks?.name
  const area = lot.area ? `${Number(lot.area)} m²` : null
  const dimension = lot.dimension

  return [block ? `Blok ${block}` : null, area, dimension]
    .filter(Boolean)
    .join(' · ') || 'Detail kaveling tersedia'
}

function isLotSelected(lotId: number) {
  return selectedLots.value.some((lot) => lot.id === lotId)
}

function toggleLot(lot: AvailableLot) {
  const exists = isLotSelected(lot.id)

  if (exists) {
    selectedLots.value = selectedLots.value.filter(
      (item) => item.id !== lot.id,
    )
    return
  }

  selectedLots.value.push(lot)
}

function removeLot(lotId: number) {
  selectedLots.value = selectedLots.value.filter(
    (lot) => lot.id !== lotId,
  )
}

function selectPayment(type: 'Cash' | 'Installment') {
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

  const digits = form.phone.replace(/\D/g, '')
  if (digits.length < 9 || digits.length > 15) {
    errorMessage.value = 'Nomor kontak harus 9 sampai 15 angka.'
    return false
  }

  const missingAddress = missingAddressFields(address.value)
  if (missingAddress.length) {
    errorMessage.value = `Lengkapi alamat: ${missingAddress.join(', ')}.`
    return false
  }

  if (isHead.value && !form.marketing_id) {
    errorMessage.value = 'Pilih Marketing penanggung jawab.'
    return false
  }

  if (!selectedLots.value.length) {
    errorMessage.value =
      'Pilih minimal satu kaveling.'
    return false
  }

  if (!form.payment_type) {
    errorMessage.value =
      'Metode pembayaran wajib dipilih.'
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
  conflictCustomerId.value = null

  try {
    // Validasi awal duplikasi; database tetap memvalidasi ulang saat INSERT.
    const conflict = await findContactConflict(form.phone, form.whatsapp_phone || null)
    if (conflict) {
      errorMessage.value = conflict.message
      conflictCustomerId.value = conflict.customerId
      return
    }

    const customer = await createProspectiveCustomer({
      customer: {
        full_name: form.full_name,
        phone: form.phone,
        whatsapp_phone: form.whatsapp_phone || form.phone,
        email: form.email,
        notes: form.notes,
        marketing_id: isHead.value ? form.marketing_id : null,
        ...addressColumns(address.value),
      },

      interests: selectedLots.value.map((lot) => ({
        lot_id: lot.id,
        payment_type: form.payment_type,
        plan_id: form.plan_id,
        notes: form.notes,
      })),
    })

    useToast().success('Klien tersimpan.', {
      to: `${listPath.value}/${customer.id}`,
      actionLabel: 'Lihat klien',
    })
    // Formulir diganti (bukan ditumpuk) agar tombol kembali tidak membukanya lagi.
    ionRouter.navigate(listPath.value, 'back', 'replace')
  } catch (cause) {
    const error = cause as { message?: string; hint?: string }
    console.error('Gagal menyimpan klien:', error)

    errorMessage.value =
      error?.message ||
      'Klien gagal disimpan. Coba lagi.'

    // Nomor baru terdaftar di antara pengecekan dan penyimpanan: jelaskan siapa pemegangnya.
    if (error?.hint === 'phone_exists') {
      try {
        const conflict = await findContactConflict(form.phone, form.whatsapp_phone || null)
        if (conflict) {
          errorMessage.value = conflict.message
          conflictCustomerId.value = conflict.customerId
        }
      } catch {
        // Pesan dari database tetap ditampilkan.
      }
    }
  } finally {
    saving.value = false
  }
}

function openConflictCustomer() {
  if (conflictCustomerId.value === null) return
  void ionRouter.push(`${listPath.value}/${conflictCustomerId.value}`)
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
      'Daftar kaveling atau tenor gagal dimuat.'
  } finally {
    loadingLots.value = false
    loadingPlans.value = false
  }
}

onMounted(async () => {
  try {
    const session = await getCurrentMarketingProfile()

    currentProfile.value = session.profile

    if (session.profile.role === 'marketing_head') {
      teamMembers.value = (await getTeamMembers()).filter((m) => m.role === 'marketing')
    }

    await loadData()
  } catch (error) {
    console.error(error)
    loadingLots.value = false
    loadingPlans.value = false
    errorMessage.value =
      'Akun belum bisa dipakai di sini. Masuk ulang dengan akun pemasar.'
  }
})

/* Hanya daftar pilihan yang diperbarui; isian formulir tidak disentuh. */
async function refreshOptions() {
  const [availableLots, plans] = await Promise.all([getAvailableLots(), getPaymentPlans()])
  lots.value = availableLots
  paymentPlans.value = plans
}

useRealtimeRefresh(['lots', 'payment_plans'], refreshOptions, {
  pauseWhen: () => loadingLots.value || saving.value,
})

</script>

<style scoped>
.prospect-page {
  font-family: var(--font-primary);
  color: var(--text-primary);
}

.prospect-page input,
.prospect-page textarea,
.prospect-page select,
.prospect-page button {
  font: inherit;
}

.prospect-page button {
  -webkit-tap-highlight-color: transparent;
}

.page-content {
  width: 100%;
  display: grid;
  gap: 16px;
}

/* ---------- kartu bagian ---------- */
.form-card {
  padding: 16px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  background: var(--surface-primary);
}

.section-title {
  display: flex;
  align-items: center;
  gap: 12px;
  margin: 0 0 14px;
}

.section-icon {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  background: var(--status-success-bg);
  color: var(--poliland-green);
}

.section-icon svg {
  width: 20px;
  height: 20px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.7;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.section-title h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: 15px;
  font-weight: var(--font-weight-bold);
}

.fields {
  display: grid;
  gap: 14px;
}

.owner-note {
  margin: 0;
  color: var(--text-secondary);
  font-size: 13px;
}

.field {
  position: relative;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.field > span,
.field-label-row > span:first-child {
  color: var(--text-primary);
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
}

.field b {
  color: var(--status-danger);
}

.field em {
  color: var(--text-secondary);
  font-style: normal;
  font-weight: var(--font-weight-medium);
}

/* ---------- input ---------- */
.input-wrap,
.textarea-wrap,
.select-control {
  width: 100%;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-primary);
}

.input-wrap:focus-within,
.textarea-wrap:focus-within,
.select-control:focus-visible {
  border-color: var(--poliland-green);
  outline: 2px solid var(--poliland-green);
  outline-offset: 1px;
}

.input-wrap {
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
}

.input-wrap svg,
.select-control > svg:first-child {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  fill: none;
  stroke: var(--text-secondary);
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.input-wrap input {
  width: 100%;
  min-width: 0;
  height: 44px;
  border: 0;
  outline: 0;
  color: var(--text-primary);
  background: transparent;
  font-size: 16px;
}

.input-wrap input::placeholder,
.textarea-wrap textarea::placeholder {
  color: var(--text-secondary);
}

.textarea-wrap {
  position: relative;
  min-height: 96px;
  padding: 12px 12px 26px;
}

.textarea-wrap textarea {
  width: 100%;
  min-height: 60px;
  resize: vertical;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font-size: 16px;
  line-height: 1.45;
}

.textarea-wrap small {
  position: absolute;
  right: 12px;
  bottom: 8px;
  color: var(--text-secondary);
  font-size: 12px;
}

/* ---------- pemilih kavling ---------- */
.select-control {
  min-height: 48px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 12px;
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
}

.select-control .placeholder {
  color: var(--text-secondary);
  font-size: 15px;
}

.selected-summary {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  color: var(--text-primary);
  font-size: 14px;
  font-weight: var(--font-weight-semibold);
  white-space: nowrap;
  text-overflow: ellipsis;
}

.select-arrow {
  margin-left: auto;
  width: 20px !important;
  height: 20px !important;
  stroke: var(--text-secondary) !important;
  stroke-width: 2 !important;
}

.select-control.invalid {
  border-color: var(--status-danger);
}

.picker-panel {
  position: absolute;
  top: calc(100% + 6px);
  right: 0;
  left: 0;
  z-index: 40;
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  background: var(--surface-primary);
  box-shadow: var(--shadow-md);
}

.picker-search {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px;
  border-bottom: 1px solid var(--border-default);
}

.picker-search svg {
  width: 18px;
  height: 18px;
  fill: none;
  stroke: var(--text-secondary);
  stroke-width: 1.7;
  stroke-linecap: round;
}

.picker-search input {
  width: 100%;
  min-width: 0;
  height: 44px;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--text-primary);
  font-size: 16px;
}

.lot-options {
  max-height: 240px;
  overflow-y: auto;
}

.lot-option {
  width: 100%;
  min-height: 52px;
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 10px 12px;
  border: 0;
  border-bottom: 1px solid var(--border-default);
  background: var(--surface-primary);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
}

.lot-option.checked {
  background: var(--status-success-bg);
}

@media (hover: hover) and (pointer: fine) {
  .lot-option:hover {
    background: var(--status-success-bg);
  }
}

.check-box {
  width: 22px;
  height: 22px;
  flex: 0 0 22px;
  display: grid;
  place-items: center;
  border: 1.5px solid var(--border-strong);
  border-radius: var(--radius-xs);
  background: var(--surface-primary);
}

.lot-option.checked .check-box {
  border-color: var(--poliland-green);
  background: var(--poliland-green);
  color: #fff;
}

.check-box svg {
  width: 14px;
  height: 14px;
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
  font-size: 14px;
  font-weight: var(--font-weight-bold);
}

.lot-option-main small {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.picker-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 10px 12px;
  background: var(--surface-muted);
}

.picker-footer span {
  color: var(--text-secondary);
  font-size: 13px;
}

.picker-footer button {
  min-height: 44px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--poliland-green);
  color: #fff;
  font-size: 14px;
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}

.picker-message {
  padding: 20px 12px;
  color: var(--text-secondary);
  font-size: 13px;
  text-align: center;
}

.selected-lots {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 8px;
}

.lot-chip {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  max-width: 100%;
  min-height: 36px;
  padding: 0 12px;
  border: 1px solid var(--poliland-green);
  border-radius: var(--radius-pill);
  background: var(--status-success-bg);
  color: var(--poliland-green);
  font-size: 13px;
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}

.lot-chip svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-width: 2;
  stroke-linecap: round;
}

/* ---------- pembayaran ---------- */
.payment-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 10px;
}

.payment-card,
.plan-card {
  min-width: 0;
  min-height: 56px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-primary);
  color: var(--text-primary);
  text-align: left;
  cursor: pointer;
}

.payment-card.active,
.plan-card.active {
  border-color: var(--poliland-green);
  background: var(--status-success-bg);
  box-shadow: inset 0 0 0 1px var(--poliland-green);
}

.payment-card > span:last-child {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.payment-card strong {
  font-size: 14px;
  font-weight: var(--font-weight-bold);
}

.payment-card small {
  color: var(--text-secondary);
  font-size: 12px;
}

.radio {
  width: 20px;
  height: 20px;
  flex: 0 0 20px;
  display: grid;
  place-items: center;
  border: 1.5px solid var(--border-strong);
  border-radius: 50%;
}

.radio > span {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: transparent;
}

.active .radio {
  border-color: var(--poliland-green);
}

.active .radio > span {
  background: var(--poliland-green);
}

/* ---------- rencana cicilan ---------- */
.field-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.plan-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 10px;
}

.plan-text {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.plan-text strong {
  font-size: 14px;
  font-weight: var(--font-weight-bold);
}

.plan-text small {
  overflow: hidden;
  color: var(--text-secondary);
  font-size: 12px;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.helper-text {
  margin: 8px 0 0;
  color: var(--text-secondary);
  font-size: 12px;
  line-height: 1.4;
}

.plans-loading,
.plans-empty {
  padding: 14px;
  border: 1px dashed var(--border-strong);
  border-radius: var(--radius-control);
  color: var(--text-secondary);
  font-size: 13px;
  text-align: center;
}

/* ---------- error + simpan ---------- */
.form-actions {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 2fr);
  gap: 10px;
}

.cancel-button {
  min-height: 52px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-primary);
  color: var(--text-primary);
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  cursor: pointer;
  touch-action: manipulation;
}

.cancel-button:active:not(:disabled) {
  background: var(--surface-muted);
}

.cancel-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.cancel-button:focus-visible {
  outline: 3px solid var(--poliland-green);
  outline-offset: 2px;
}

.error-message {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 0;
  padding: 12px;
  border: 1px solid var(--status-danger);
  border-radius: var(--radius-control);
  background: var(--danger-bg);
  color: var(--danger-text);
  font-size: 13px;
  line-height: 1.4;
}

.error-body {
  display: grid;
  min-width: 0;
  flex: 1;
  justify-items: start;
  gap: 4px;
}

.error-action {
  min-height: 44px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-decoration: underline;
  text-underline-offset: 3px;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.error-action:active {
  opacity: 0.7;
}

.error-action:focus-visible {
  outline: 3px solid var(--status-danger);
  outline-offset: 2px;
}

.error-message svg {
  width: 18px;
  height: 18px;
  flex: 0 0 18px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.save-button {
  width: 100%;
  min-height: 52px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 0 16px;
  border: 0;
  border-radius: var(--radius-control);
  background: var(--poliland-green);
  color: #fff;
  font-size: 15px;
  font-weight: var(--font-weight-bold);
  cursor: pointer;
}

.save-button:active:not(:disabled) {
  background: var(--green-800);
}

.save-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.save-button:focus-visible,
.payment-card:focus-visible,
.plan-card:focus-visible,
.lot-chip:focus-visible,
.lot-option:focus-visible,
.picker-footer button:focus-visible {
  outline: 3px solid var(--poliland-green);
  outline-offset: 2px;
}

.spinner {
  width: 18px;
  height: 18px;
  border: 2px solid rgba(255, 255, 255, 0.45);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 360px) {
  .payment-grid {
    grid-template-columns: 1fr;
  }
}
</style>
