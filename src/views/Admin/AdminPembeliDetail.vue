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
            <button type="button" :class="{ active: activeTab === 'summary' }" @click="activeTab = 'summary'">Ringkasan</button>
            <button type="button" :class="{ active: activeTab === 'lots' }" @click="activeTab = 'lots'">Kavling ({{ customer.interests.length + customer.transactions.length }})</button>
            <button type="button" :class="{ active: activeTab === 'notes' }" @click="activeTab = 'notes'">Catatan</button>
          </div>

          <section v-if="activeTab === 'summary'" class="detail-card" aria-labelledby="personal-title">
            <h2 id="personal-title">Informasi pribadi</h2>
            <dl><div><dt>Nomor telepon</dt><dd>{{ customer.phone || 'Belum tercatat' }}</dd></div><div><dt>WhatsApp</dt><dd>{{ customer.whatsapp_phone || customer.phone || 'Belum tercatat' }}</dd></div><div><dt>Email</dt><dd>{{ customer.email || 'Belum tercatat' }}</dd></div><div><dt>Alamat</dt><dd>{{ customer.address || 'Belum tercatat' }}</dd></div><div><dt>Catatan</dt><dd>{{ customer.notes || 'Belum ada catatan' }}</dd></div></dl>
          </section>

          <template v-else-if="activeTab === 'lots'">
            <section class="detail-card" aria-labelledby="interest-title">
              <div class="interest-section-head"><h2 id="interest-title">Kavling yang diminati</h2><button type="button" class="add-interest-button" @click="openInterestForm">+ Tambah</button></div>
              <div v-if="!customer.interests.length" class="interest-empty">
                <img
                  src="/src/assets/mascot/Worried_BeeHouseMascotwithClipboard-Map.png"
                  alt="Mascot PoliLand sedang memeriksa peta kavling"
                  style="width: 76px; height: 76px; flex: 0 0 76px; object-fit: contain; object-position: center;"
                />
                <p class="muted" style="margin: 0; line-height: 1.5;">Belum ada kavling yang diminati. Admin dapat menambahkannya.</p>
              </div>
              <ul v-else class="interest-list"><li v-for="interest in customer.interests" :key="interest.id"><div><strong>{{ interest.lotNumber }}</strong><span>{{ interest.block }} · {{ interest.paymentType }}</span></div><button type="button" class="remove-interest-button" aria-label="Hapus kavling dari minat" @click="removeCustomerInterest(interest.id)">Hapus</button></li></ul>
              <form v-if="interestFormOpen" class="interest-form" @submit.prevent="addCustomerInterest">
                <div class="lot-picker-head">
                  <label for="interest-lot-search">Cari kavling</label>
                  <input id="interest-lot-search" v-model="interestSearch" type="search" placeholder="Nomor kavling atau blok" autocomplete="off" />
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
                  <label v-for="lot in filteredAvailableLots" :key="lot.id" :class="['lot-picker-option', { selected: interestForm.lot_ids.includes(lot.id) }]">
                    <input v-model="interestForm.lot_ids" type="checkbox" name="interest-lots" :value="lot.id" />
                    <span class="lot-picker-copy">
                      <strong>Kavling {{ lot.lot_number }}</strong>
                      <span>{{ blockLabel(lot.blocks) }} · {{ lot.dimension || 'Dimensi belum tercatat' }}</span>
                    </span>
                    <span class="lot-picker-price">{{ formatLotPrice(lot) }}</span>
                  </label>
                </fieldset>
                <label for="interest-payment">Jenis pembayaran<select id="interest-payment" v-model="interestForm.payment_type"><option value="Cash">Tunai</option><option value="Installment">Cicilan</option></select></label>
                <p v-if="interestError" class="edit-error" role="alert">{{ interestError }}</p>
                <div class="interest-form-actions"><button type="button" @click="closeInterestForm">Batal</button><button type="submit" :disabled="interestSaving || !interestForm.lot_ids.length">{{ interestSaving ? 'Menyimpan...' : `Simpan ${interestForm.lot_ids.length || ''} kavling` }}</button></div>
              </form>
            </section>
            <section class="detail-card" aria-labelledby="transaction-title"><h2 id="transaction-title">Ringkasan pembayaran</h2><div v-if="!customer.transactions.length" style="display: flex; align-items: center; gap: 14px; min-height: 92px; padding: 8px 10px; border-radius: var(--radius-control); background: var(--app-background);"><img src="/src/assets/mascot/SadBeeHouseMascotwithShoppingReceipt.png" alt="Mascot PoliLand sedih belum ada transaksi" style="width: 76px; height: 76px; flex: 0 0 76px; object-fit: contain; object-position: center;" /><p class="muted" style="margin: 0; line-height: 1.5;">Belum ada transaksi.</p></div><div v-else class="payment-list"><article v-for="transaction in customer.transactions" :key="transaction.id" class="payment-item"><div class="payment-item-head"><strong>{{ transaction.lotNumber }}</strong><span :class="['transaction-status', transaction.status.toLowerCase()]">{{ transaction.statusLabel }}</span></div><dl><div><dt>Metode</dt><dd>{{ transaction.paymentType }}</dd></div><div><dt>Harga final</dt><dd>{{ formatCurrency(transaction.finalPrice) }}</dd></div><div><dt>Sudah dibayar</dt><dd class="paid">{{ formatCurrency(transaction.paidAmount) }}</dd></div><div><dt>Sisa pembayaran</dt><dd :class="{ settled: transaction.remainingAmount === 0 }">{{ transaction.remainingAmount === 0 ? 'Lunas' : formatCurrency(transaction.remainingAmount) }}</dd></div><div v-if="transaction.paymentType === 'Cicilan'"><dt>Rencana cicilan</dt><dd>{{ transaction.months ? `${transaction.months} bulan` : 'Belum diatur' }}{{ transaction.monthlyPayment ? ` · ${formatCurrency(transaction.monthlyPayment)}/bulan` : '' }}</dd></div></dl></article></div><button type="button" class="finance-link" disabled>Detail keuangan akan tersedia di Laporan Keuangan</button></section>
          </template>
          <CustomerNotes v-else :customer-id="customer.id" />
        </template>
        <div v-else class="buyer-detail-state"><ion-icon :icon="peopleOutline" /><strong>Customer tidak ditemukan</strong><p>Data customer mungkin sudah dihapus atau tidak dapat diakses.</p></div>
        <div v-if="editing && customer" class="edit-panel" role="dialog" aria-modal="true" aria-labelledby="edit-title">
          <form @submit.prevent="saveCustomer">
            <div class="edit-panel-head"><h2 id="edit-title">Edit data customer</h2><button type="button" aria-label="Tutup edit" @click="closeEditor"><ion-icon :icon="closeOutline" /></button></div>
            <label for="edit-full-name">Nama lengkap<input id="edit-full-name" v-model.trim="editForm.full_name" type="text" autocomplete="name" required /></label>
            <label for="edit-phone">Nomor telepon<input id="edit-phone" v-model.trim="editForm.phone" type="tel" inputmode="tel" autocomplete="tel" /></label>
            <label for="edit-whatsapp">Nomor WhatsApp<input id="edit-whatsapp" v-model.trim="editForm.whatsapp_phone" type="tel" inputmode="tel" autocomplete="tel" /></label>
            <label for="edit-email">Email<input id="edit-email" v-model.trim="editForm.email" type="email" inputmode="email" autocomplete="email" /></label>
            <label for="edit-address">Alamat<textarea id="edit-address" v-model.trim="editForm.address" rows="2" autocomplete="street-address" /></label>
            <label for="edit-notes">Catatan<textarea id="edit-notes" v-model.trim="editForm.notes" rows="3" /></label>
            <p v-if="editError" class="edit-error" role="alert">{{ editError }}</p>
            <div class="edit-panel-actions">
              <AppButton type="button" variant="neutral" fill="outline" :disabled="saving" @click="closeEditor">
                Batal
              </AppButton>
              <AppButton class="save-customer-button" type="submit" variant="primary" :loading="saving" :disabled="saving">
                Simpan
              </AppButton>
            </div>
          </form>
        </div>
      </main>
    </ion-content>
    <MobileTabBar variant="admin" />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/vue'
import { alertCircleOutline, arrowBackOutline, callOutline, closeOutline, createOutline, logoWhatsapp, peopleOutline } from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppButton from '@/components/ui/AppButton.vue'
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
function editCustomer() {
  if (!customer.value) return
  Object.assign(editForm, { full_name: customer.value.full_name || '', phone: customer.value.phone || '', whatsapp_phone: customer.value.whatsapp_phone || customer.value.phone || '', email: customer.value.email || '', address: customer.value.address || '', notes: customer.value.notes || '' })
  editError.value = ''
  editing.value = true
  window.dispatchEvent(new CustomEvent('poliland-modal-mode', { detail: { active: true } }))
}

function closeEditor() {
  editing.value = false
  window.dispatchEvent(new CustomEvent('poliland-modal-mode', { detail: { active: false } }))
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
    customer.value = {
      ...row,
      statusLabel: row.lot_transactions?.some((transaction: any) => transaction.status === 'Sold')
        ? 'Pembeli'
        : row.customer_notes?.length || row.customer_interests?.length
          ? 'Tindak Lanjut'
          : 'Prospek',
      tone: 'mint',
      interests: (row.customer_interests ?? []).map((interest: any) => ({ id: interest.id, lotId: interest.lot_id, lotNumber: interest.lots?.lot_number || `Lot #${interest.lot_id}`, block: blockLabel(interest.lots?.blocks), paymentType: interest.payment_type === 'Installment' ? 'Cicilan' : 'Cash' })),
      transactions: (row.lot_transactions ?? []).map((transaction: any) => {
        const paidAmount = (row.payments ?? []).filter((payment: any) => payment.lot_id === transaction.lot_id).reduce((total: number, payment: any) => total + Number(payment.amount || 0), 0)
        const finalPrice = Number(transaction.final_price || 0)
        return { id: transaction.id, lotNumber: transaction.lots?.lot_number || `Lot #${transaction.lot_id}`, block: blockLabel(transaction.lots?.blocks), status: transaction.status, statusLabel: transactionStatusLabel(transaction.status), paymentType: transaction.payment_type === 'Installment' ? 'Cicilan' : 'Cash', finalPrice, paidAmount, remainingAmount: Math.max(finalPrice - paidAmount, 0), months: transaction.months ?? null, monthlyPayment: transaction.monthly_payment ?? null }
      }),
    }
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Periksa koneksi internet, lalu coba lagi.' }
  finally { loading.value = false }
}

onMounted(loadCustomer)
onUnmounted(() => {
  window.dispatchEvent(new CustomEvent('poliland-modal-mode', { detail: { active: false } }))
})
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
.detail-card { margin-top: 12px; padding: 16px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.detail-card h2 { margin: 0 0 12px; font-size: 15px; }
dl { display: grid; gap: 10px; margin: 0; } dt { color: var(--text-secondary); font-size: 11px; } dd { margin: 2px 0 0; font-size: 13px; }
ul { display: grid; gap: 9px; margin: 0; padding-left: 18px; color: var(--text-secondary); font-size: 12px; } li strong { color: var(--text-primary); } li span, li small { display: block; margin-top: 2px; }
.payment-list { display: grid; gap: 10px; }
.payment-item { padding: 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-muted); }
.payment-item-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 10px; }
.transaction-status { padding: 4px 7px; border-radius: 999px; font-size: 10px; font-weight: var(--font-weight-bold); }
.transaction-status.sold { background: var(--status-success-bg); color: var(--poliland-green); }
.transaction-status.booking { background: var(--poliland-gold-soft); color: var(--poliland-gold-text-soft); }
.transaction-status.cancelled { background: color-mix(in srgb, var(--status-danger) 11%, white); color: var(--status-danger); }
.payment-item dl { display: grid; gap: 7px; }
.payment-item dd { font-weight: var(--font-weight-semibold); }
.payment-item dd.paid, .payment-item dd.settled { color: var(--poliland-green); }
.finance-link { width: 100%; min-height: 40px; margin-top: 12px; border: 1px dashed var(--border-default); border-radius: var(--radius-control); background: transparent; color: var(--text-secondary); font: inherit; font-size: 11px; }
.buyer-detail-state { display: flex; flex-direction: column; align-items: center; gap: 8px; padding: 42px 18px; text-align: center; border: 1px dashed var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); } .buyer-detail-state ion-icon { font-size: 30px; color: var(--poliland-green); } .buyer-detail-state p { margin: 0; color: var(--text-secondary); font-size: 13px; }
.note-copy { margin: 0; color: var(--text-secondary); font-size: 13px; line-height: 1.6; }
.edit-panel { position: fixed; inset: 0; z-index: 11000; display: flex; align-items: flex-end; background: rgb(37 37 37 / 42%); }
.edit-panel form { width: 100%; max-height: min(calc(100dvh - 24px), 760px); overflow-y: auto; padding: 20px 16px calc(24px + env(safe-area-inset-bottom)); border: 1px solid var(--border-default); border-radius: var(--radius-panel) var(--radius-panel) 0 0; background: var(--surface-primary); }
.edit-panel-head { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid var(--border-default); }
.edit-panel-head h2 { margin: 0; color: var(--text-primary); font-size: 19px; font-weight: var(--font-weight-bold); }
.edit-panel-head button { display: grid; place-items: center; width: 44px; height: 44px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-muted); color: var(--text-primary); }
.edit-panel label { display: grid; gap: 7px; margin-top: 14px; color: var(--text-primary); font-size: 12px; font-weight: var(--font-weight-semibold); }
.edit-panel input, .edit-panel textarea { width: 100%; min-height: 44px; padding: 11px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 13px; }
.edit-panel textarea { resize: vertical; }
.edit-panel-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-top: 18px; }
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
@media (max-width: 360px) {
  .lot-picker-option { grid-template-columns: 20px minmax(0, 1fr); }
  .lot-picker-price { grid-column: 2; max-width: none; text-align: left; }
}
.edit-panel-actions :deep(.save-customer-button) { --color: #fff; }
.edit-panel input:focus-visible, .edit-panel textarea:focus-visible, .edit-panel button:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
</style>
