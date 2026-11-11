<template>
  <ion-page class="admin-buyer-detail-page">
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />
    <ion-content :fullscreen="true">
      <main class="buyer-detail-content">
        <nav class="buyer-detail-breadcrumb" aria-label="Navigasi halaman">
          <button type="button" class="breadcrumb-back" @click="router.back()" aria-label="Kembali">
            <ion-icon :icon="arrowBackOutline" />
          </button>
          <span>Daftar Calon Pembeli & Pembeli</span>
        </nav>
        <div v-if="loading" class="buyer-detail-state" role="status"><ion-spinner name="crescent" /><p>Memuat detail customer...</p></div>
        <div v-else-if="errorMessage" class="buyer-detail-state buyer-detail-error" role="alert">
          <img src="/src/assets/mascot/WorriedMascotwithFailedDetails.png" alt="Mascot PoliLand khawatir detail gagal dimuat" class="buyer-detail-error-mascot" />
          <strong>Detail gagal dimuat</strong>
          <p>{{ errorMessage }}</p>
          <AppButton size="small" @click="loadCustomer">Coba lagi</AppButton>
        </div>
        <template v-else-if="customer">
          <section class="detail-hero">
            <div :class="['detail-avatar', customer.tone]">{{ initials(customer.full_name) }}</div>
            <div class="detail-hero-copy"><h1>{{ customer.full_name }}</h1><p>{{ customer.phone || 'Nomor belum tercatat' }}</p><p>{{ customer.email || 'Email belum tercatat' }}</p><p>{{ customer.address || 'Alamat belum tercatat' }}</p></div>
            <span class="detail-status">{{ customer.statusLabel }}</span>
          </section>

          <div class="detail-actions">
            <a :href="customer.phone ? `tel:${customer.phone}` : undefined" class="detail-action"><ion-icon :icon="callOutline" /><span>Telepon</span></a>
            <a :href="whatsappPhone ? `https://wa.me/${whatsappPhone.replace(/\D/g, '')}` : undefined" class="detail-action"><ion-icon :icon="logoWhatsapp" /><span>WhatsApp</span></a>
            <button type="button" class="detail-action" @click="editCustomer"><ion-icon :icon="createOutline" /><span>Edit</span></button>
          </div>

          <div class="detail-tabs" role="tablist" aria-label="Detail customer">
            <button type="button" :class="{ active: activeTab === 'summary' }" @click="activeTab = 'summary'">Informasi</button>
            <button type="button" :class="{ active: activeTab === 'lots' }" @click="activeTab = 'lots'">Kavling ({{ customer.interests.length + customer.transactions.length }})</button>
            <button type="button" :class="{ active: activeTab === 'notes' }" @click="activeTab = 'notes'">Catatan</button>
          </div>

          <section v-if="activeTab === 'summary'" class="detail-card personal-card" aria-labelledby="personal-title">
            <div class="card-head">
              <div>
                <h2 id="personal-title">Informasi pribadi</h2>
                <p class="head-sub">Informasi kontak dan data customer</p>
              </div>
            </div>
            <dl class="personal-info-list">
              <div class="personal-info-item"><dt>Nomor telepon</dt><dd>{{ customer.phone || 'Belum tercatat' }}</dd></div>
              <div class="personal-info-item"><dt>WhatsApp</dt><dd>{{ customer.whatsapp_phone || customer.phone || 'Belum tercatat' }}</dd></div>
              <div class="personal-info-item"><dt>Email</dt><dd>{{ customer.email || 'Belum tercatat' }}</dd></div>
              <div class="personal-info-item"><dt>Alamat</dt><dd>{{ customer.address || 'Belum tercatat' }}</dd></div>
              <div v-if="customer.marketingName" class="personal-info-item"><dt>Marketing</dt><dd>{{ customer.marketingName }}</dd></div>
            </dl>
          </section>

          <template v-else-if="activeTab === 'lots'">
            <!-- Section Kavling Diminati -->
            <section class="detail-card" aria-labelledby="interest-title">
              <div class="card-head">
                <div>
                  <h2 id="interest-title">Kavling yang Diminati</h2>
                  <p class="head-sub">Daftar minat awal customer</p>
                </div>
                <AppButton size="small" variant="primary" @click="openInterestForm">
                  + Tambah
                </AppButton>
              </div>

              <div v-if="!customer.interests.length" class="empty-box">
                <img
                  src="/src/assets/mascot/Worried_BeeHouseMascotwithClipboard-Map.png"
                  alt="Mascot PoliLand sedang memeriksa peta kavling"
                  class="empty-mascot"
                />
                <p class="muted">Belum ada kavling yang diminati. Admin dapat menambahkannya.</p>
              </div>

              <div v-else class="lot-cards-list">
                <article v-for="interest in customer.interests" :key="interest.id" class="lot-card-item">
                  <div class="lot-card-heading">
                    <div class="lot-card-identity">
                      <span class="lot-badge-num">{{ interest.lotNumber }}</span>
                      <span class="lot-badge-type">{{ interest.paymentType }}</span>
                    </div>
                    <span :class="['lot-status-chip', lotStatusClass(interest.status)]">
                      {{ transactionStatusLabel(interest.status) }}
                    </span>
                  </div>

                  <div class="lot-card-details">
                    <div class="lot-detail-cell">
                      <span class="lot-detail-label">Blok</span>
                      <strong>{{ interest.block || 'Belum ditentukan' }}</strong>
                    </div>
                    <div v-if="interest.area" class="lot-detail-cell">
                      <span class="lot-detail-label">Luas tanah</span>
                      <strong>{{ interest.area }} m²</strong>
                    </div>
                    <div v-if="interest.dimension" class="lot-detail-cell">
                      <span class="lot-detail-label">Dimensi</span>
                      <strong>{{ interest.dimension }}</strong>
                    </div>
                    <div v-if="interest.price !== null" class="lot-detail-cell">
                      <span class="lot-detail-label">Harga kavling</span>
                      <strong class="lot-card-price">
                        {{ formatCurrency(interest.price) }}
                      </strong>
                    </div>
                  </div>

                  <div class="lot-card-footer">
                    <div class="lot-price-group">
                      <span
                        v-if="interest.promoPrice != null && interest.cashPrice != null && interest.promoPrice < interest.cashPrice"
                        class="lot-card-price-note"
                      >Harga promo</span>
                    </div>

                    <div class="lot-card-actions">
                      <button
                        v-if="interest.lotId"
                        type="button"
                        class="btn-nav-lot"
                        @click="router.push({ name: 'AdminKavlingDetail', params: { id: interest.lotId } })"
                      >
                        Lihat Kavling
                        <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
                      </button>
                      <button
                        type="button"
                        class="btn-remove-lot"
                        aria-label="Hapus kavling dari minat"
                        @click="removeCustomerInterest(interest.id)"
                      >
                        <ion-icon :icon="trashOutline" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              </div>

              <!-- Form Tambah Minat Kavling -->
              <form v-if="interestFormOpen" class="interest-form" @submit.prevent="addCustomerInterest">
                <div class="lot-picker-head">
                  <label for="interest-lot-search">Cari kavling tersedia</label>
                  <input
                    id="interest-lot-search"
                    v-model="interestSearch"
                    type="search"
                    placeholder="Ketik nomor kavling atau blok..."
                    autocomplete="off"
                  />
                </div>

                <div v-if="interestLotsLoading" class="lot-picker-state" role="status">
                  <ion-spinner name="crescent" />
                  <span>Memuat kavling tersedia...</span>
                </div>

                <div v-else-if="interestLotsError" class="lot-picker-state lot-picker-error" role="alert">
                  <strong>Kavling tersedia gagal dimuat</strong>
                  <span>{{ interestLotsError }}</span>
                  <button type="button" @click="openInterestForm">Coba lagi</button>
                </div>

                <div v-else-if="!availableLots.length" class="lot-picker-state">
                  <strong>Belum ada kavling tersedia</strong>
                  <span>Semua kavling sedang dipesan atau sudah terjual.</span>
                </div>

                <div v-else-if="!filteredAvailableLots.length" class="lot-picker-state">
                  <strong>Kavling tidak ditemukan</strong>
                  <span>Coba kata kunci nomor kavling atau blok lain.</span>
                </div>

                <fieldset v-else class="lot-picker-list">
                  <legend>Pilih satu atau beberapa kavling ({{ interestForm.lot_ids.length }} dipilih)</legend>
                  <label
                    v-for="lot in filteredAvailableLots"
                    :key="lot.id"
                    :class="['lot-picker-option', { selected: interestForm.lot_ids.includes(lot.id) }]"
                  >
                    <input v-model="interestForm.lot_ids" type="checkbox" name="interest-lots" :value="lot.id" />
                    <span class="lot-picker-copy">
                      <strong>Kavling {{ lot.lot_number }}</strong>
                      <span>{{ blockLabel(lot.blocks) }} · {{ lot.dimension || 'Dimensi belum tercatat' }}</span>
                    </span>
                    <span class="lot-picker-price">{{ formatLotPrice(lot) }}</span>
                  </label>
                </fieldset>

                <label for="interest-payment" class="field-label-custom">
                  Jenis pembayaran
                  <select id="interest-payment" v-model="interestForm.payment_type">
                    <option value="Cash">Tunai</option>
                    <option value="Installment">Cicilan</option>
                  </select>
                </label>

                <p v-if="interestError" class="edit-error" role="alert">{{ interestError }}</p>

                <div class="interest-form-actions">
                  <button type="button" class="btn-cancel" @click="closeInterestForm">Batal</button>
                  <button
                    type="submit"
                    class="btn-submit"
                    :disabled="interestSaving || !interestForm.lot_ids.length"
                  >
                    {{ interestSaving ? 'Menyimpan...' : `Simpan (${interestForm.lot_ids.length})` }}
                  </button>
                </div>
              </form>
            </section>

            <!-- Section Transaksi & Pembayaran Kavling -->
            <section class="detail-card" aria-labelledby="transaction-title">
              <div class="card-head">
                <div>
                  <h2 id="transaction-title">Transaksi & Pembayaran</h2>
                  <p class="head-sub">Kavling yang sudah di-booking atau dibeli</p>
                </div>
              </div>

              <div v-if="!customer.transactions.length" class="empty-box">
                <img
                  src="/src/assets/mascot/SadBeeHouseMascotwithShoppingReceipt.png"
                  alt="Mascot PoliLand sedih belum ada transaksi"
                  class="empty-mascot"
                />
                <p class="muted">Belum ada transaksi transaksi kavling tercatat.</p>
              </div>

              <div v-else class="payment-list">
                <article v-for="transaction in customer.transactions" :key="transaction.id" class="tx-card">
                  <header class="tx-card-head">
                    <div class="tx-card-title">
                      <strong>{{ transaction.lotNumber }}</strong>
                      <span class="tx-card-block">{{ transaction.block }}</span>
                    </div>

                    <div class="tx-card-badges">
                      <span :class="['transaction-status', lotStatusClass(transaction.status)]">
                        {{ transaction.statusLabel }}
                      </span>
                      <button
                        v-if="transaction.lotId"
                        type="button"
                        class="btn-nav-lot-sm"
                        title="Buka Halaman Detail Kavling"
                        @click="router.push({ name: 'AdminKavlingDetail', params: { id: transaction.lotId } })"
                      >
                        Detail Kavling
                        <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
                      </button>
                    </div>
                  </header>

                  <div class="tx-card-body">
                    <div class="tx-grid">
                      <div class="tx-grid-item">
                        <span class="tx-label">Skema Bayar</span>
                        <strong class="tx-value">{{ transaction.paymentType }}</strong>
                      </div>
                      <div class="tx-grid-item">
                        <span class="tx-label">Harga Final</span>
                        <strong class="tx-value">{{ formatCurrency(transaction.finalPrice) }}</strong>
                      </div>
                      <div class="tx-grid-item">
                        <span class="tx-label">Total Terbayar</span>
                        <strong class="tx-value text-success">{{ formatCurrency(transaction.paidAmount) }}</strong>
                      </div>
                      <div class="tx-grid-item">
                        <span class="tx-label">Sisa Pembayaran</span>
                        <strong :class="['tx-value', { 'text-success': transaction.remainingAmount === 0 }]">
                          {{ formatCurrency(transaction.remainingAmount) }}
                        </strong>
                      </div>
                    </div>

                    <!-- Breakdown Detail accordion-style or clean list -->
                    <details class="tx-details">
                      <summary class="tx-details-summary">Rincian Pembayaran Lanjutan</summary>
                      <dl class="tx-dl">
                        <div><dt>Biaya Booking</dt><dd>{{ formatCurrency(transaction.bookingFee) }}</dd></div>
                        <div><dt>Booking Terbayar</dt><dd class="paid">{{ formatCurrency(transaction.bookingPaid) }}</dd></div>
                        <div><dt>Sisa Booking</dt><dd>{{ formatCurrency(transaction.bookingRemaining) }}</dd></div>
                        <div><dt>DP Disepakati</dt><dd>{{ formatCurrency(transaction.downPayment) }}</dd></div>
                        <template v-if="transaction.paymentType === 'Cicilan'">
                          <div><dt>DP Dibayar</dt><dd class="paid">{{ formatCurrency(transaction.paidDownPayment) }}</dd></div>
                          <div><dt>Sisa DP</dt><dd>{{ formatCurrency(transaction.dpRemaining) }}</dd></div>
                          <div><dt>Sisa Pokok</dt><dd>{{ formatCurrency(transaction.principalAmount) }}</dd></div>
                          <div><dt>Margin ({{ transaction.marginPercent }}%)</dt><dd>{{ formatCurrency(transaction.marginAmount) }}</dd></div>
                          <div><dt>Total Cicilan</dt><dd>{{ formatCurrency(transaction.installmentTotal) }}</dd></div>
                          <div>
                            <dt>Tenor & Angsuran</dt>
                            <dd>
                              {{ transaction.months ? `${transaction.months} bln` : 'Belum diatur' }}
                              {{ transaction.monthlyPayment ? `(${formatCurrency(transaction.monthlyPayment)}/bln)` : '' }}
                            </dd>
                          </div>
                        </template>
                      </dl>
                    </details>
                  </div>
                </article>
              </div>
            </section>
          </template>
          <CustomerNotes v-else :customer-id="customer.id" />
        </template>
        <div v-else class="buyer-detail-state"><ion-icon :icon="peopleOutline" /><strong>Customer tidak ditemukan</strong><p>Data customer mungkin sudah dihapus atau tidak dapat diakses.</p></div>
        <AppModal
          v-model="editing"
          title="Edit data customer"
          variant="bottom-sheet"
          :loading="saving"
          confirm-text="Simpan"
          cancel-text="Batal"
          @confirm="saveCustomer"
          @cancel="closeEditor"
          @close="closeEditor"
        >
          <form class="edit-modal-form" @submit.prevent="saveCustomer">
            <label for="edit-full-name">Nama lengkap<input id="edit-full-name" v-model.trim="editForm.full_name" type="text" autocomplete="name" required /></label>
            <label for="edit-phone">Nomor telepon<input id="edit-phone" v-model.trim="editForm.phone" type="tel" inputmode="tel" autocomplete="tel" /></label>
            <label for="edit-whatsapp">Nomor WhatsApp<input id="edit-whatsapp" v-model.trim="editForm.whatsapp_phone" type="tel" inputmode="tel" autocomplete="tel" /></label>
            <label for="edit-email">Email<input id="edit-email" v-model.trim="editForm.email" type="email" inputmode="email" autocomplete="email" /></label>
            <label for="edit-address">Alamat<textarea id="edit-address" v-model.trim="editForm.address" rows="2" autocomplete="street-address" /></label>
            <p v-if="editError" class="edit-error" role="alert">{{ editError }}</p>
          </form>
        </AppModal>
      </main>
    </ion-content>
    <MobileTabBar variant="admin" />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/vue'
import { alertCircleOutline, arrowBackOutline, callOutline, chevronForwardOutline, createOutline, logoWhatsapp, peopleOutline, trashOutline } from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import CustomerNotes from '@/components/Admin/CustomerNotes.vue'
import { customerService } from '@/services/marketing/customerService'

const route = useRoute()
const router = useRouter()
const customer = ref<any>(null)
const loading = ref(true)
const errorMessage = ref('')
const activeTab = ref<'summary' | 'lots' | 'notes'>('summary')
const whatsappPhone = computed(() => customer.value?.whatsapp_phone || customer.value?.phone || '')
const editing = ref(false)
const saving = ref(false)
const editError = ref('')
const editForm = reactive({ full_name: '', phone: '', whatsapp_phone: '', email: '', address: '', notes: '' })
const availableLots = ref<any[]>([])
const filteredAvailableLots = computed(() => {
  const term = interestSearch.value.trim().toLowerCase()
  if (!term) return availableLots.value
  return availableLots.value.filter((lot) => `${lot.lot_number ?? ''} ${lot.blocks?.name ?? ''} ${lot.blocks?.code ?? ''}`.toLowerCase().includes(term))
})
const interestFormOpen = ref(false)
const interestSaving = ref(false)
const interestError = ref('')
const interestLotsLoading = ref(false)
const interestLotsError = ref('')
const interestSearch = ref('')
const interestForm = reactive({ lot_ids: [] as number[], payment_type: 'Cash' as 'Cash' | 'Installment' })

function initials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() }
function formatDate(value: string | null) { return value ? new Date(value).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }) : 'Tanggal belum tercatat' }
function formatCurrency(value: number) { return `Rp ${value.toLocaleString('id-ID')}` }
function blockLabel(block: any) { return block?.name || block?.code || 'Blok belum tercatat' }
function formatLotPrice(lot: any) {
  const price = lot.promo_price ?? lot.cash_price
  return price ? formatCurrency(Number(price)) : 'Harga belum diatur'
}
function transactionStatusLabel(status: string) {
  if (status === 'Sold') return 'Terjual'
  if (status === 'Booking') return 'Dipesan'
  if (status === 'Cancelled') return 'Dibatalkan'
  if (status === 'Available') return 'Tersedia'
  return status || 'Belum ditentukan'
}
function lotStatusClass(status: string | null) {
  if (status === 'Sold') return 'is-sold'
  if (status === 'Booking') return 'is-booking'
  if (status === 'Available') return 'is-available'
  if (status === 'Cancelled') return 'is-cancelled'
  return 'is-unknown'
}
function editCustomer() {
  if (!customer.value) return
  Object.assign(editForm, { full_name: customer.value.full_name || '', phone: customer.value.phone || '', whatsapp_phone: customer.value.whatsapp_phone || customer.value.phone || '', email: customer.value.email || '', address: customer.value.address || '', notes: customer.value.notes || '' })
  editError.value = ''
  editing.value = true
}

function closeEditor() {
  editing.value = false
}

async function openInterestForm() {
  interestError.value = ''
  interestLotsError.value = ''
  interestSearch.value = ''
  interestLotsLoading.value = true
  try {
    availableLots.value = await customerService.getAvailableLots()
    const selectedIds = new Set((customer.value?.interests ?? []).map((interest: any) => interest.lotId))
    availableLots.value = availableLots.value.filter((lot) => !selectedIds.has(lot.id))
    interestForm.lot_ids = []
    interestForm.payment_type = 'Cash'
    interestFormOpen.value = true
  } catch (error) {
    interestLotsError.value = error instanceof Error ? error.message : 'Daftar kavling tersedia gagal dimuat.'
    interestFormOpen.value = true
  } finally {
    interestLotsLoading.value = false
  }
}

function closeInterestForm() {
  interestFormOpen.value = false
  interestError.value = ''
}

async function addCustomerInterest() {
  if (!customer.value || !interestForm.lot_ids.length) return

  interestSaving.value = true
  interestError.value = ''
  const selectedLotIds = [...new Set(interestForm.lot_ids)]
  const savedLotIds: number[] = []

  try {
    // Simpan satu per satu agar hasil yang berhasil diketahui jika terjadi kegagalan parsial.
    for (const lotId of selectedLotIds) {
      await customerService.addInterest({
        customer_id: customer.value.id,
        lot_id: lotId,
        payment_type: interestForm.payment_type,
        plan_id: null,
        notes: null,
      })
      savedLotIds.push(lotId)
    }

    await loadCustomer()
    closeInterestForm()
  } catch (error) {
    // Muat ulang daftar minat agar kavling yang sudah tersimpan tidak bisa terkirim ulang.
    await loadCustomer()
    const savedIds = new Set(savedLotIds)
    const alreadyAddedIds = new Set((customer.value?.interests ?? []).map((interest: any) => interest.lotId))
    availableLots.value = availableLots.value.filter((lot) => !alreadyAddedIds.has(lot.id))
    interestForm.lot_ids = selectedLotIds.filter((lotId) => !savedIds.has(lotId) && !alreadyAddedIds.has(lotId))
    interestError.value = `Sebagian kavling berhasil disimpan (${savedLotIds.length}/${selectedLotIds.length}). ${error instanceof Error ? error.message : 'Kavling lainnya gagal ditambahkan.'}`
  } finally {
    interestSaving.value = false
  }
}

async function removeCustomerInterest(id: number) {
  if (!window.confirm('Hapus kavling ini dari daftar minat customer?')) return
  try {
    await customerService.removeInterest(id)
    await loadCustomer()
  } catch (error) {
    interestError.value = error instanceof Error ? error.message : 'Kavling gagal dihapus.'
  }
}

async function saveCustomer() {
  if (!customer.value) return
  saving.value = true
  editError.value = ''
  try {
    const updated = await customerService.updateCustomer(customer.value.id, editForm)
    customer.value = { ...customer.value, ...updated }
    closeEditor()
  } catch (error) {
    editError.value = error instanceof Error
      ? `Data belum berhasil disimpan: ${error.message}`
      : 'Data belum berhasil disimpan. Periksa policy UPDATE Supabase.'
  } finally {
    saving.value = false
  }
}

async function loadCustomer() {
  loading.value = true
  errorMessage.value = ''
  try {
    const rows = await customerService.getAdminCustomers()
    const row = rows.find((item: any) => String(item.id) === String(route.params.id)) as any
    if (!row) { customer.value = null; return }
    const marketingRelation = Array.isArray(row.marketing)
      ? row.marketing[0]
      : row.marketing
    const marketerRelation = Array.isArray(row.marketer)
      ? row.marketer[0]
      : row.marketer
    const marketingProfile = Array.isArray(row.marketing_profile)
      ? row.marketing_profile[0]
      : row.marketing_profile

    customer.value = {
      ...row,
      marketingName: marketingRelation?.full_name
        || marketerRelation?.full_name
        || marketingProfile?.full_name
        || row.marketing_name
        || null,
      statusLabel: row.lot_transactions?.some((transaction: any) => transaction.status === 'Sold')
        ? 'Pembeli'
        : row.customer_notes?.length || row.customer_interests?.length
          ? 'Tindak Lanjut'
          : 'Prospek',
      tone: 'mint',
      interests: (row.customer_interests ?? []).map((interest: any) => {
        const lot = interest.lots ?? {}
        return {
          id: interest.id,
          lotId: Number(interest.lot_id ?? 0),
          lotNumber: lot.lot_number || `Lot #${interest.lot_id}`,
          block: blockLabel(lot.blocks),
          dimension: lot.dimension || null,
          area: lot.area != null ? Number(lot.area) : null,
          status: lot.status || null,
          cashPrice: lot.cash_price != null ? Number(lot.cash_price) : null,
          promoPrice: lot.promo_price != null ? Number(lot.promo_price) : null,
          price: lot.promo_price != null
            ? Number(lot.promo_price)
            : lot.cash_price != null
              ? Number(lot.cash_price)
              : null,
          paymentType: interest.payment_type === 'Installment' ? 'Cicilan' : 'Cash',
        }
      }),
      transactions: (row.lot_transactions ?? []).map((transaction: any) => {
        const transactionPayments = (row.payments ?? []).filter(
          (payment: any) => Number(payment.transaction_id) === Number(transaction.id)
        )
        const confirmed = transactionPayments.filter((payment: any) => payment.status === 'Confirmed')
        const sumCategory = (category: string) => confirmed
          .filter((payment: any) => payment.payment_category === category)
          .reduce((sum: number, payment: any) => {
            const amount = Number(payment.amount ?? 0)
            return sum + (Number.isFinite(amount) && amount > 0 ? amount : 0)
          }, 0)

        const bookingPaid = sumCategory('Booking')
        const downPayment = Math.max(Number(transaction.down_payment ?? 0), 0)
        const paidDownPayment = sumCategory('Down Payment')
        const paidInstallment = sumCategory('Installment')
        const paidCash = sumCategory('Cash Purchase')
        const principalAmount = Math.max(
          Number(transaction.principal_amount ?? (Number(transaction.final_price ?? 0) - downPayment)), 0
        )
        const installmentTotal = Math.max(Number(transaction.installment_total ?? principalAmount), 0)
        const finalPrice = Math.max(Number(transaction.final_price ?? 0), 0)
        // Booking fee berdiri sendiri dan tidak mengurangi kewajiban pembelian.
        // Untuk cicilan, kewajiban = DP + total cicilan setelah DP.
        // Untuk cash, kewajiban = harga final.
        const totalDue = transaction.payment_type === 'Installment'
          ? downPayment + installmentTotal
          : finalPrice
        const paidAmount = transaction.payment_type === 'Installment'
          ? paidDownPayment + paidInstallment
          : paidCash
        const remainingAmount = Math.max(totalDue - paidAmount, 0)
        const bookingFee = 1_000_000
        const bookingRemaining = Math.max(bookingFee - bookingPaid, 0)
        const dpRemaining = Math.max(downPayment - paidDownPayment, 0)
        const dpSettled = downPayment === 0 || dpRemaining === 0
        const firstInstallmentConfirmed = paidInstallment > 0
        const bookingSettled = bookingPaid >= bookingFee
        const eligibleForSold = bookingSettled && (
          transaction.payment_type === 'Cash'
            ? paidCash >= finalPrice && finalPrice > 0
            : dpSettled && firstInstallmentConfirmed
        )
        const pendingCount = transactionPayments.filter((payment: any) => payment.status === 'Pending').length
        const rejectedCount = transactionPayments.filter((payment: any) => payment.status === 'Rejected').length

        return {
          id: transaction.id,
          lotId: Number(transaction.lot_id ?? 0),
          lotNumber: transaction.lots?.lot_number || `Lot #${transaction.lot_id}`,
          block: blockLabel(transaction.lots?.blocks),
          status: transaction.status,
          statusLabel: transactionStatusLabel(transaction.status),
          paymentType: transaction.payment_type === 'Installment' ? 'Cicilan' : 'Cash',
          finalPrice,
          bookingFee,
          bookingPaid,
          bookingRemaining,
          downPayment,
          paidDownPayment,
          dpRemaining,
          dpSettled,
          firstInstallmentConfirmed,
          eligibleForSold,
          principalAmount,
          marginPercent: Number(transaction.margin_percent ?? 0),
          marginAmount: Number(transaction.margin_amount ?? 0),
          installmentTotal,
          totalDue,
          paidAmount,
          remainingAmount,
          pendingCount,
          rejectedCount,
          months: transaction.months ?? null,
          monthlyPayment: transaction.monthly_payment ?? null,
        }
      }),
    }
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Periksa koneksi internet, lalu coba lagi.' }
  finally { loading.value = false }
}

onMounted(loadCustomer)
</script>

<style scoped>
.admin-buyer-detail-page { font-family: var(--font-primary); color: var(--text-primary); }
.buyer-detail-content { min-height: 100%; padding: 22px 16px calc(112px + env(safe-area-inset-bottom)); background: var(--app-background); }
.buyer-detail-breadcrumb { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; color: var(--text-primary); font-size: 15px; font-weight: var(--font-weight-bold); }
.breadcrumb-back { display: grid; place-items: center; width: 32px; height: 32px; padding: 0; border: 1px solid var(--border-default); border-radius: 50%; background: var(--surface-primary); color: var(--text-primary); }
.breadcrumb-back ion-icon { font-size: 18px; }
.detail-hero { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
.detail-avatar { display: grid; place-items: center; width: 58px; height: 58px; border-radius: 50%; font-weight: var(--font-weight-bold); }
.detail-avatar.mint { background: var(--poliland-gold-soft); color: var(--poliland-gold-text); }
.detail-hero-copy { min-width: 0; flex: 1; }
.detail-hero h1 { margin: 0 0 3px; font-size: 18px; font-weight: var(--font-weight-extrabold); }
.detail-hero p, .muted { margin: 1px 0 0; color: var(--text-secondary); font-size: 12px; }
.detail-status { align-self: flex-start; padding: 5px 9px; border: 1px solid var(--poliland-green); border-radius: 999px; color: var(--poliland-green); font-size: 11px; font-weight: var(--font-weight-bold); white-space: nowrap; }
.detail-actions { display: grid; grid-template-columns: repeat(3, 1fr); gap: 9px; margin-bottom: 16px; }
.detail-action { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px; min-height: 58px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 11px; text-decoration: none; }
.detail-action ion-icon { color: var(--poliland-green); font-size: 20px; }
.detail-tabs { display: grid; grid-template-columns: repeat(3, 1fr); margin: 0 -16px; border-bottom: 1px solid var(--border-default); }
.detail-tabs button { min-height: 44px; border: 0; border-bottom: 2px solid transparent; background: transparent; color: var(--text-secondary); font: inherit; font-size: 12px; font-weight: var(--font-weight-semibold); }
.detail-tabs button.active { border-bottom-color: var(--poliland-gold); color: var(--poliland-gold-text); }
.detail-card { margin-top: 14px; padding: 16px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
.card-head h2 { margin: 0; font-size: 16px; font-weight: var(--font-weight-extrabold); }
.head-sub { margin: 2px 0 0; color: var(--text-secondary); font-size: 12px; }

.empty-box { display: flex; align-items: center; gap: 14px; padding: 12px 14px; border-radius: var(--radius-control); background: var(--surface-muted); }
.empty-mascot { width: 64px; height: 64px; flex: 0 0 64px; object-fit: contain; }

.lot-cards-list { display: grid; gap: 10px; }
.lot-card-item {
  display: grid;
  gap: 12px;
  min-width: 0;
  padding: 14px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-card);
  background: var(--surface-muted);
}
.lot-card-heading,
.lot-card-identity,
.lot-card-footer,
.lot-card-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.lot-card-identity { justify-content: flex-start; min-width: 0; }
.lot-badge-num { color: var(--text-primary); font-size: 15px; font-weight: var(--font-weight-extrabold); }
.lot-badge-type {
  padding: 3px 9px;
  border: 1px solid var(--border-default);
  border-radius: 7px;
  background: var(--surface-primary);
  color: var(--poliland-green);
  font-size: 11px;
  font-weight: var(--font-weight-bold);
}
.lot-card-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 9px;
  padding: 10px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-primary);
}
.lot-detail-cell { display: grid; gap: 3px; min-width: 0; }
.lot-detail-label { color: var(--text-secondary); font-size: 10px; font-weight: var(--font-weight-medium); }
.lot-detail-cell strong { color: var(--text-primary); font-size: 12px; font-weight: var(--font-weight-semibold); overflow-wrap: anywhere; }
.lot-card-footer { align-items: flex-end; flex-wrap: wrap; }
.lot-price-group { display: grid; gap: 3px; min-width: 0; }
.lot-card-price { color: var(--text-primary); font-size: 14px; font-weight: var(--font-weight-extrabold); overflow-wrap: anywhere; }
.lot-card-price-note { color: var(--poliland-gold-text); font-size: 10px; font-weight: var(--font-weight-semibold); }
.lot-card-actions { flex-shrink: 0; }
.btn-nav-lot { display: inline-flex; align-items: center; gap: 4px; min-height: 38px; padding: 0 12px; border: 1px solid var(--poliland-green); border-radius: var(--radius-control); background: var(--status-success-bg); color: var(--poliland-green); font: inherit; font-size: 12px; font-weight: var(--font-weight-bold); cursor: pointer; text-decoration: none; }
.btn-nav-lot ion-icon { font-size: 14px; }
.btn-nav-lot:hover, .btn-nav-lot:focus-visible { background: var(--poliland-green); color: #fff; }
.btn-remove-lot { display: inline-flex; align-items: center; justify-content: center; width: 38px; height: 38px; min-height: 38px; padding: 0; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--status-danger); font-size: 16px; cursor: pointer; }
.btn-remove-lot:hover, .btn-remove-lot:focus-visible { border-color: var(--status-danger); background: #fdf2f2; }

.field-label-custom { display: grid; gap: 6px; color: var(--text-primary); font-size: 12px; font-weight: var(--font-weight-semibold); margin-top: 12px; }
.field-label-custom select { min-height: 44px; padding: 0 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 13px; }

.btn-cancel, .btn-submit { min-height: 44px; padding: 0 14px; border: 1px solid var(--border-default); border-radius: var(--radius-control); font: inherit; font-size: 12px; font-weight: var(--font-weight-bold); cursor: pointer; }
.btn-cancel { background: var(--surface-primary); color: var(--text-primary); }
.btn-submit { border-color: var(--poliland-green); background: var(--poliland-green); color: #fff; }

.tx-card { padding: 14px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-muted); display: grid; gap: 12px; }
.tx-card-head { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; flex-wrap: wrap; }
.tx-card-title { display: grid; gap: 2px; }
.tx-card-title strong { font-size: 16px; font-weight: var(--font-weight-extrabold); }
.tx-card-block { font-size: 12px; color: var(--text-secondary); }
.tx-card-badges { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }

.btn-nav-lot-sm { display: inline-flex; align-items: center; gap: 3px; min-height: 32px; padding: 0 10px; border: 1px solid var(--poliland-green); border-radius: 20px; background: var(--surface-primary); color: var(--poliland-green); font: inherit; font-size: 11px; font-weight: var(--font-weight-bold); cursor: pointer; }
.btn-nav-lot-sm ion-icon { font-size: 13px; }
.btn-nav-lot-sm:hover, .btn-nav-lot-sm:focus-visible { background: var(--poliland-green); color: #fff; }

.tx-body { display: grid; gap: 10px; }
.tx-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; padding: 10px; border-radius: var(--radius-control); background: var(--surface-primary); border: 1px solid var(--border-default); }
.tx-grid-item { display: grid; gap: 2px; }
.tx-label { font-size: 11px; color: var(--text-secondary); }
.tx-value { font-size: 13px; font-weight: var(--font-weight-bold); }
.text-success { color: var(--poliland-green); }

.tx-details { margin-top: 2px; }
.tx-details-summary { font-size: 12px; font-weight: var(--font-weight-bold); color: var(--poliland-green); cursor: pointer; padding: 4px 0; outline: none; }
.tx-dl { display: grid; gap: 6px; margin-top: 8px; padding: 10px; border-radius: var(--radius-control); background: var(--surface-primary); border: 1px solid var(--border-default); }
.tx-dl div { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; }
.tx-dl dt { color: var(--text-secondary); }
.tx-dl dd { margin: 0; font-weight: var(--font-weight-semibold); text-align: right; }
.tx-dl dd.paid { color: var(--poliland-green); }
.buyer-detail-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 42px 18px; text-align: center; border: 1px dashed var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); } .buyer-detail-state ion-icon { font-size: 30px; color: var(--poliland-green); } .buyer-detail-state p { margin: 0; color: var(--text-secondary); font-size: 13px; }
.note-copy { margin: 0; color: var(--text-secondary); font-size: 13px; line-height: 1.6; }
.edit-modal-form label { display: grid; gap: 7px; margin-top: 14px; color: var(--text-primary); font-size: 12px; font-weight: var(--font-weight-semibold); }
.edit-modal-form label:first-child { margin-top: 0; }
.edit-modal-form input, .edit-modal-form textarea { width: 100%; min-height: 44px; padding: 11px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 13px; }
.edit-modal-form textarea { resize: vertical; }
.edit-error { margin: 12px 0 0; color: var(--status-danger); font-size: 12px; }
.interest-section-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }.interest-section-head h2 { margin: 0; }.add-interest-button, .remove-interest-button { min-height: 36px; padding: 0 10px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--poliland-green); font: inherit; font-size: 11px; font-weight: var(--font-weight-semibold); cursor: pointer; }.interest-empty { display: flex; align-items: center; gap: 14px; min-height: 92px; padding: 8px 10px; border-radius: var(--radius-control); background: var(--app-background); }.interest-list { display: grid; gap: 8px; margin-top: 12px; padding: 0; list-style: none; }.interest-list li { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 10px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-muted); }.interest-list li span { color: var(--text-secondary); font-size: 11px; }.remove-interest-button { color: var(--status-danger); }.interest-form { display: grid; gap: 10px; margin-top: 12px; padding: 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-muted); }.interest-form label { display: grid; gap: 6px; color: var(--text-primary); font-size: 11px; font-weight: var(--font-weight-semibold); }.interest-form select { min-height: 44px; padding: 0 10px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 12px; }.interest-form-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }.interest-form-actions button { min-height: 44px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 11px; font-weight: var(--font-weight-semibold); }.interest-form-actions button[type='submit'] { border-color: var(--poliland-green); background: var(--poliland-green); color: #fff; }.add-interest-button:focus-visible, .remove-interest-button:focus-visible, .interest-form button:focus-visible, .interest-form select:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.lot-picker-head { display: grid; gap: 6px; }
.lot-picker-head label { color: var(--text-primary); font-size: 11px; font-weight: var(--font-weight-semibold); }
.lot-picker-head input { width: 100%; min-height: 44px; box-sizing: border-box; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 13px; }
.lot-picker-state { display: grid; justify-items: center; gap: 6px; min-height: 92px; padding: 14px; box-sizing: border-box; border: 1px dashed var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-secondary); text-align: center; font-size: 12px; }
.lot-picker-state strong { color: var(--text-primary); }
.lot-picker-error { color: var(--status-danger); }
.lot-picker-error button { min-height: 44px; padding: 0 14px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; }
.lot-picker-list { display: grid; gap: 8px; max-height: 280px; overflow-y: auto; margin: 0; padding: 0; border: 0; }
.lot-picker-list legend { margin-bottom: 8px; color: var(--text-primary); font-size: 11px; font-weight: var(--font-weight-semibold); }
.lot-picker-option { display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; align-items: center; gap: 10px; min-height: 58px; padding: 10px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); cursor: pointer; }
.lot-picker-option.selected { border-color: var(--poliland-green); background: var(--status-success-bg); }
.lot-picker-option input { width: 18px; height: 18px; margin: 0; accent-color: var(--poliland-green); cursor: pointer; }
.lot-picker-copy { display: grid; gap: 3px; min-width: 0; }
.lot-picker-copy strong { overflow-wrap: anywhere; color: var(--text-primary); font-size: 13px; }
.lot-picker-copy span { overflow-wrap: anywhere; color: var(--text-secondary); font-size: 11px; }
.lot-picker-price { max-width: 112px; color: var(--poliland-green); font-size: 11px; font-weight: var(--font-weight-bold); text-align: right; overflow-wrap: anywhere; }
.lot-picker-head input:focus-visible, .lot-picker-option input:focus-visible, .lot-picker-option:has(input:focus-visible) { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.interest-form-actions button:disabled { cursor: not-allowed; opacity: 0.55; }
/* Ringkasan: pisahkan setiap informasi agar mudah dipindai di layar kecil. */
.personal-card .card-head { margin-bottom: 4px; }
.personal-info-list {
  display: grid;
  margin: 0;
  overflow: hidden;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-primary);
}
.personal-info-item {
  display: grid;
  gap: 5px;
  min-width: 0;
  padding: 12px 13px;
  border-bottom: 1px solid var(--border-default);
}
.personal-info-item:last-child { border-bottom: 0; }
.personal-info-item dt {
  color: var(--text-secondary);
  font-size: 11px;
  font-weight: var(--font-weight-medium);
}
.personal-info-item dd {
  margin: 0;
  color: var(--text-primary);
  font-size: 13px;
  font-weight: var(--font-weight-semibold);
  line-height: 1.55;
  overflow-wrap: anywhere;
}
.personal-info-note { background: var(--surface-muted); }

/* Status kavling memakai warna semantik dan label yang eksplisit. */
.lot-card-badge-row { row-gap: 7px; }
.lot-status-chip, .transaction-status {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 25px;
  padding: 3px 9px;
  border: 1px solid var(--border-default);
  border-radius: 8px;
  background: var(--surface-primary);
  color: var(--text-secondary);
  font-size: 10px;
  line-height: 1.2;
  font-weight: var(--font-weight-bold);
  white-space: nowrap;
}
.lot-status-chip.is-available, .transaction-status.is-available {
  border-color: color-mix(in srgb, var(--status-success) 35%, var(--border-default));
  background: var(--status-success-bg);
  color: var(--status-success);
}
.lot-status-chip.is-booking, .transaction-status.is-booking {
  border-color: color-mix(in srgb, var(--status-warning) 45%, var(--border-default));
  background: #fbf4e5;
  color: var(--poliland-gold-text);
}
.lot-status-chip.is-sold, .transaction-status.is-sold {
  border-color: color-mix(in srgb, var(--status-danger) 30%, var(--border-default));
  background: #fdf0ef;
  color: var(--status-danger);
}
.lot-status-chip.is-cancelled, .transaction-status.is-cancelled,
.lot-status-chip.is-unknown, .transaction-status.is-unknown {
  background: var(--surface-muted);
  color: var(--text-secondary);
}
.payment-list { display: grid; gap: 12px; }
.tx-card {
  gap: 13px;
  padding: 14px;
  border-radius: var(--radius-card);
  background: var(--surface-muted);
}
.tx-card-head {
  align-items: center;
  padding-bottom: 11px;
  border-bottom: 1px solid var(--border-default);
}
.tx-card-title strong { font-size: 15px; letter-spacing: 0.01em; }
.tx-card-badges { justify-content: flex-end; }
.tx-grid { gap: 12px 10px; padding: 12px; }
.tx-grid-item { min-width: 0; }
.tx-value { overflow-wrap: anywhere; }
.tx-details { padding-top: 1px; }
.tx-details-summary {
  display: flex;
  align-items: center;
  width: fit-content;
  min-height: 32px;
}
.tx-details[open] .tx-details-summary { margin-bottom: 5px; }

@media (max-width: 360px) {
  .lot-picker-option { grid-template-columns: 20px minmax(0, 1fr); }
  .lot-picker-price { grid-column: 2; max-width: none; text-align: left; }
}
.edit-panel-actions :deep(.save-customer-button) { --color: #fff; }
.edit-panel input:focus-visible, .edit-panel textarea:focus-visible, .edit-panel button:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }

@media (max-width: 380px) {
  .lot-card-item { padding: 12px; gap: 10px; }
  .lot-card-footer { align-items: stretch; }
  .lot-card-actions { width: 100%; }
  .btn-nav-lot { flex: 1; justify-content: center; }
}
</style>
