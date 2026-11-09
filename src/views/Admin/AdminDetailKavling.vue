<template>
  <ion-page>
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />

    <ion-content :fullscreen="true">
      <div class="detail-page">
        <nav class="detail-back-nav" aria-label="Navigasi halaman">
          <AppButton class="back-action" variant="neutral" fill="clear" size="small" @click="backToLots">
            <ion-icon :icon="arrowBackOutline" slot="start" aria-hidden="true" />
            Kembali ke daftar kavling
          </AppButton>
        </nav>

        <div v-if="loading" class="state-card" role="status">
          <img
            :src="loadingMascot"
            alt=""
            class="loading-mascot"
          />
          <strong>Memuat detail kavling...</strong>
        </div>

        <div v-else-if="loadError" class="state-card" role="alert">
          <ion-icon :icon="alertCircleOutline" />
          <strong>Detail kavling gagal dimuat</strong>
          <p>{{ errorMessage }}</p>
          <AppButton variant="primary" @click="loadDetail">Coba Lagi</AppButton>
        </div>

        <template v-else-if="lot">
          <section class="hero-card">
            <div class="hero-image-wrap">
              <img
                v-if="lot.panorama_url"
                :src="lot.panorama_url"
                :alt="`Foto kavling ${lot.lot_number}`"
                class="hero-image"
              />
              <div v-else class="image-placeholder">
                <img
                  :src="missingPanoramaMascot"
                  alt="Maskot kebingungan karena foto kavling belum tersedia"
                  class="image-placeholder-mascot"
                />
                <span>Panorama 360° belum tersedia</span>
              </div>
              <AppButton class="image-expand" variant="neutral" size="small" aria-label="Buka panorama 360 derajat" @click="openPanorama">
                <ion-icon :icon="expandOutline" aria-hidden="true" />
              </AppButton>
            </div>

            <div class="spec-strip">
              <div>
                <span>Luas Tanah</span>
                <strong>{{ formatArea(lot.area) }}</strong>
              </div>
              <div>
                <span>Dimensi</span>
                <strong>{{ lot.dimension || 'Belum diatur' }}</strong>
              </div>
              <div>
                <span>Status</span>
                <strong :class="['status-pill', statusClass]">{{ statusLabel }}</strong>
              </div>
            </div>

            <div class="price-summary">
              <div>
                <span>Harga Normal</span>
                <s v-if="lot.cash_price">{{ rupiah(lot.cash_price) }}</s>
                <strong v-else>Belum diatur</strong>
              </div>
              <div class="promo-price">
                <span v-if="hasPromo" class="promo-label">PROMO KHUSUS</span>
                <strong>{{ rupiah(lot.promo_price || lot.cash_price) }}</strong>
              </div>
            </div>

            <div class="hero-actions">
              <AppButton variant="primary" expand="block" @click="statusModalOpen = true">
                <ion-icon :icon="syncOutline" slot="start" />
                Ubah Status
              </AppButton>
              <AppButton variant="neutral" fill="outline" expand="block" @click="editModalOpen = true">
                <ion-icon :icon="createOutline" slot="start" />
                Edit Informasi
              </AppButton>
            </div>
          </section>

          <nav class="detail-tabs" aria-label="Detail kavling">
            <button
              v-for="item in tabs"
              :key="item.key"
              type="button"
              :class="{ active: activeTab === item.key }"
              :aria-current="activeTab === item.key ? 'page' : undefined"
              @click="activeTab = item.key"
            >
              {{ item.label }}
            </button>
          </nav>

          <section v-if="activeTab === 'info'" class="tab-content">
            <article class="panel">
              <p class="eyebrow">SPESIFIKASI KAVLING</p>
              <h2>Informasi Kavling</h2>
              <dl class="info-list">
                <div><dt>Nomor Kavling</dt><dd>{{ lot.lot_number }}</dd></div>
                <div><dt>Blok</dt><dd>{{ blockLabel }}</dd></div>
                <div><dt>Luas Tanah</dt><dd>{{ formatArea(lot.area) }}</dd></div>
                <div><dt>Dimensi</dt><dd>{{ lot.dimension || '-' }}</dd></div>
                <div><dt>Kode Polygon</dt><dd>{{ lot.polygon_id }}</dd></div>
                <div><dt>Jenis Pembayaran</dt><dd>{{ paymentTypeLabel }}</dd></div>
                <div><dt>Tanggal Dipesan</dt><dd>{{ formatDate(lot.booking_date) }}</dd></div>
                <div><dt>Tanggal Terjual</dt><dd>{{ formatDate(lot.sold_date) }}</dd></div>
                <div><dt>Keterangan</dt><dd>{{ lot.description || '-' }}</dd></div>
              </dl>
            </article>
          </section>

          <section v-else-if="activeTab === 'price'" class="tab-content">
            <article class="panel">
              <p class="eyebrow">HARGA KAVLING</p>
              <h2>Harga Kavling</h2>
              <div class="price-edit-row">
                <div><span>HARGA NORMAL</span><strong>{{ rupiah(lot.cash_price) }}</strong></div>
                <AppButton class="icon-action" variant="neutral" fill="outline" size="small" aria-label="Ubah harga normal" @click="openPriceEditor('cash')"><ion-icon :icon="createOutline" aria-hidden="true" /></AppButton>
              </div>
              <div class="price-edit-row">
                <div><span>HARGA PROMO</span><strong>{{ rupiah(lot.promo_price) }}</strong></div>
                <AppButton class="icon-action" variant="neutral" fill="outline" size="small" aria-label="Ubah harga promo" @click="openPriceEditor('promo')"><ion-icon :icon="createOutline" aria-hidden="true" /></AppButton>
                <AppButton class="icon-action" variant="danger" fill="outline" size="small" aria-label="Hapus harga promo" :disabled="!lot.promo_price" @click="clearPromoPrice"><ion-icon :icon="trashOutline" aria-hidden="true" /></AppButton>
              </div>
              <AppButton class="add-action" variant="primary" fill="outline" expand="block" @click="openPriceEditor('promo')">
                <ion-icon :icon="addOutline" slot="start" aria-hidden="true" /> Atur Harga Promo
              </AppButton>
            </article>

            <div class="section-heading">
              <h2>Skema Cicilan</h2>
              <AppButton class="manage-action" variant="neutral" fill="clear" size="small" @click="planModalOpen = true"><ion-icon :icon="settingsOutline" slot="start" aria-hidden="true" /> Kelola Skema</AppButton>
            </div>

            <article class="panel table-panel">
              <div v-if="installmentsLoading" class="inline-state"><ion-spinner name="crescent" /> Memuat skema...</div>
              <div v-else-if="!installments.length" class="empty-inline">Belum ada skema cicilan untuk kavling ini.</div>
              <div v-else class="installment-list">
                <div v-for="item in installments" :key="item.id" class="installment-row">
                  <div class="installment-main">
                    <strong>{{ item.plan_name }}</strong>
                    <span>{{ item.months }} bulan · Margin {{ item.margin_percent }}%</span>
                  </div>
                  <strong class="monthly-value">{{ rupiah(item.monthly_payment) }}<small>/bulan</small></strong>
                  <AppButton class="icon-action" variant="danger" fill="outline" size="small" aria-label="Hapus skema cicilan" @click="removeInstallment(item.id)"><ion-icon :icon="trashOutline" aria-hidden="true" /></AppButton>
                </div>
              </div>
              <AppButton class="add-action" variant="primary" fill="outline" expand="block" @click="planModalOpen = true">
                <ion-icon :icon="addOutline" slot="start" aria-hidden="true" /> Tambah Skema Cicilan
              </AppButton>
            </article>
          </section>

          <section v-else-if="activeTab === 'panorama'" class="tab-content">
            <article class="panel panorama-panel">
              <div v-if="lot.panorama_url" class="panorama-preview">
                <img :src="lot.panorama_url" :alt="`Panorama kavling ${lot.lot_number}`" />
                <AppButton class="preview-expand" variant="neutral" size="small" aria-label="Lihat panorama" @click="openPanorama"><ion-icon :icon="expandOutline" aria-hidden="true" /></AppButton>
              </div>
                <div v-else class="panorama-empty">
                  <img
                    :src="missingPanoramaMascot"
                    alt="Maskot kebingungan karena panorama belum tersedia"
                    class="panorama-empty-mascot"
                  />
                  <strong>Panorama 360° belum tersedia</strong>
                </div>
              <div class="panorama-actions">
                <AppButton v-if="lot.panorama_url" variant="neutral" fill="outline" @click="openPanorama">Lihat</AppButton>
                <AppButton variant="primary" @click="panoramaModalOpen = true"><ion-icon :icon="createOutline" slot="start" />{{ lot.panorama_url ? 'Ubah' : 'Tambahkan Panorama' }}</AppButton>
                <AppButton v-if="lot.panorama_url" variant="danger" fill="outline" @click="removePanorama"><ion-icon :icon="trashOutline" slot="start" />Hapus</AppButton>
              </div>
            </article>
          </section>

          <section v-else class="tab-content">
            <article class="panel">
              <p class="eyebrow">AKTIVITAS KAVLING</p>
              <div v-if="historyLoading" class="inline-state"><ion-spinner name="crescent" /> Memuat riwayat...</div>
              <div v-else-if="!transactions.length && !payments.length" class="empty-inline history-empty">
                <img :src="emptyReceiptMascot" alt="Ilustrasi kuitansi dan koin kosong" />
                <span>Belum ada riwayat transaksi atau pembayaran.</span>
              </div>
              <div v-else class="timeline">
                <div v-for="transaction in transactions" :key="`t-${transaction.id}`" class="timeline-item">
                  <span class="timeline-dot"></span>
                  <div>
                    <strong>Transaksi {{ transaction.status }}</strong>
                    <span>{{ formatDate(transaction.booking_date) }} · {{ transaction.customer_name || 'Customer' }}</span>
                    <b>{{ rupiah(transaction.final_price) }}</b>
                    <small>{{ transaction.payment_type === 'Installment' ? 'Cicilan' : 'Tunai' }}</small>
                  </div>
                </div>
                <div v-for="payment in payments" :key="`p-${payment.id}`" class="timeline-item">
                  <span class="timeline-dot payment"></span>
                  <div>
                    <strong>Pembayaran diterima</strong>
                    <span>{{ formatDate(payment.payment_date) }} · {{ payment.payment_method || 'Metode tidak dicatat' }}</span>
                    <b>{{ rupiah(payment.amount) }}</b>
                    <small>{{ payment.note || 'Tidak ada catatan' }}</small>
                  </div>
                </div>
              </div>
            </article>
          </section>
        </template>
      </div>
    </ion-content>

    <MobileTabBar variant="admin" />

    <!-- Modal Bottom Sheet: seluruh modal menggunakan AppModal bersama -->
    <AppModal
      v-model="statusModalOpen"
      title="Ubah Status Kavling"
      variant="bottom-sheet"
      :loading="saving"
      confirm-text="Simpan Status"
      @confirm="saveStatus"
    >
      <label class="field-label" for="lot-status">Status</label>
      <select id="lot-status" v-model="statusDraft" class="form-control">
        <option value="Available">Tersedia</option>
        <option value="Booking">Dipesan</option>
        <option value="Sold">Terjual</option>
      </select>
      <p class="helper-note">Perubahan status langsung memperbarui data kavling.</p>
    </AppModal>

    <AppModal
      v-model="editModalOpen"
      title="Edit Informasi Kavling"
      variant="bottom-sheet"
      :loading="saving"
      confirm-text="Simpan"
      @confirm="saveInfo"
    >
      <label class="field-label" for="edit-lot-number">Nomor Kavling</label>
      <input
        id="edit-lot-number"
        v-model="editDraft.lot_number"
        class="form-control"
        type="text"
        inputmode="text"
        @focus="showAndroidKeyboard"
      />
      <label class="field-label" for="edit-lot-dimension">Dimensi</label>
      <input
        id="edit-lot-dimension"
        v-model="editDraft.dimension"
        class="form-control"
        type="text"
        inputmode="text"
        placeholder="10 x 12 m"
        @focus="showAndroidKeyboard"
      />
      <label class="field-label" for="edit-lot-area">Luas Tanah (m²)</label>
      <input id="edit-lot-area" v-model="editDraft.area" class="form-control" type="number" min="0" />
      <label class="field-label" for="edit-lot-description">Keterangan</label>
      <textarea id="edit-lot-description" v-model="editDraft.description" class="form-control" rows="3"></textarea>
    </AppModal>

    <AppModal
      v-model="priceModalOpen"
      :title="priceDraft.type === 'cash' ? 'Ubah Harga Normal' : 'Atur Harga Promo'"
      variant="bottom-sheet"
      :loading="saving"
      confirm-text="Simpan Harga"
      @confirm="savePrice"
    >
      <label class="field-label" for="lot-price-value">Nominal (Rupiah)</label>
      <input
        id="lot-price-value"
        v-model="priceDraft.value"
        class="form-control"
        type="number"
        min="0"
        inputmode="numeric"
        placeholder="Contoh: 425000000"
      />
    </AppModal>

    <AppModal
      v-model="planModalOpen"
      title="Tambah Skema Cicilan"
      variant="bottom-sheet"
      :loading="saving"
      :confirm-disabled="!planDraft.plan_id"
      confirm-text="Tambahkan Skema"
      @confirm="addInstallment"
    >
      <label class="field-label" for="installment-plan">Pilih skema</label>
      <select id="installment-plan" v-model="planDraft.plan_id" class="form-control">
        <option value="">Pilih tenor</option>
        <option
          v-for="plan in availablePlans"
          :key="plan.id"
          :value="String(plan.id)"
        >
          {{ plan.plan_name }} · {{ plan.months }} bulan · Margin {{ plan.margin_percent }}%
        </option>
      </select>
      <label class="field-label" for="installment-monthly">Cicilan per bulan (opsional)</label>
      <input
        id="installment-monthly"
        v-model="planDraft.monthly_payment"
        class="form-control"
        type="number"
        min="0"
        placeholder="Kosongkan untuk hitung otomatis"
      />
      <p class="helper-note">
        Perhitungan otomatis menggunakan harga promo jika tersedia, jika tidak menggunakan harga normal.
        Rumus: harga × (1 + margin) ÷ tenor.
      </p>
    </AppModal>

    <AppModal
      v-model="panoramaModalOpen"
      title="Panorama 360°"
      variant="bottom-sheet"
      :loading="saving"
      confirm-text="Simpan Panorama"
      @confirm="savePanorama"
    >
      <label class="field-label" for="panorama-url">URL Panorama</label>
      <input
        id="panorama-url"
        v-model="panoramaDraft"
        class="form-control"
        type="url"
        placeholder="https://..."
      />
      <p class="helper-note">
        Masukkan URL publik file panorama equirectangular (rasio 2:1).
        Pastikan file dapat diakses oleh aplikasi.
      </p>
    </AppModal>

    <ion-toast :is-open="toast.open" :message="toast.message" :color="toast.color" :duration="3000" @didDismiss="toast.open = false" />
  </ion-page>
</template>

<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import { computed, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import {
  IonPage, IonContent, IonIcon, IonSpinner, IonToast, onIonViewWillEnter,
} from '@ionic/vue'
import {
  alertCircleOutline, arrowBackOutline, imageOutline, expandOutline, syncOutline, createOutline,
  trashOutline, addOutline, settingsOutline, imagesOutline,
} from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import loadingMascot from '@/assets/mascot/Mascot Examining Transaction History.png'
import missingPanoramaMascot from '@/assets/mascot/Confused_Mascot_and_Missing Panorama.png'
import emptyReceiptMascot from '@/assets/mascot/MascotwithEmptyReceiptandCoins.png'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import { supabase } from '@/services/config/supabase'
import { lotService, type LotRecord } from '@/services/lotService'

type TabKey = 'info' | 'price' | 'panorama' | 'history'
interface InstallmentRow {
  id: number
  plan_id: number
  monthly_payment: number | null
  is_custom: boolean
  plan_name: string
  months: number
  margin_percent: number
}
interface PlanRow { id: number; plan_name: string; months: number; margin_percent: number }
interface TransactionRow {
  id: number; status: string; payment_type: string; final_price: number
  booking_date: string | null; customer_name: string | null
}
interface PaymentRow {
  id: number; payment_date: string | null; amount: number | null
  payment_method: string | null; note: string | null
}
const route = useRoute()
const router = useRouter()
const lotId = computed(() => Number(route.params.id))
const lot = ref<LotRecord | null>(null)
const loading = ref(true)
const loadError = ref(false)
const errorMessage = ref('')
const saving = ref(false)
const activeTab = ref<TabKey>('info')
const tabs: { key: TabKey; label: string }[] = [
  { key: 'info', label: 'Informasi' },
  { key: 'price', label: 'Harga' },
  { key: 'panorama', label: '360°' },
  { key: 'history', label: 'Riwayat' },
]
const statusModalOpen = ref(false)
const editModalOpen = ref(false)
const priceModalOpen = ref(false)
const planModalOpen = ref(false)
const panoramaModalOpen = ref(false)
const statusDraft = ref('Available')
const editDraft = reactive({ lot_number: '', dimension: '', area: '', description: '' })
const priceDraft = reactive<{ type: 'cash' | 'promo'; value: string }>({ type: 'cash', value: '' })
const planDraft = reactive({ plan_id: '', monthly_payment: '' })
const panoramaDraft = ref('')
const installments = ref<InstallmentRow[]>([])
const availablePlans = ref<PlanRow[]>([])
const transactions = ref<TransactionRow[]>([])
const payments = ref<PaymentRow[]>([])
const installmentsLoading = ref(false)
const historyLoading = ref(false)
const toast = reactive<{ open: boolean; message: string; color: 'success' | 'danger' | 'warning' }>({
  open: false, message: '', color: 'success',
})
const statusLabel = computed(() => {
  const value = (lot.value?.status || '').toLowerCase()
  if (['booking', 'booked'].includes(value)) return 'Dipesan'
  if (['sold', 'terjual'].includes(value)) return 'Terjual'
  return 'Tersedia'
})
const statusClass = computed(() => {
  const value = (lot.value?.status || '').toLowerCase()
  return ['booking', 'booked'].includes(value) ? 'booking' : ['sold', 'terjual'].includes(value) ? 'sold' : 'available'
})
const blockLabel = computed(() => {
  const block = lot.value?.block as Record<string, unknown> | null
  if (!block) return lot.value?.block_id ? `Blok ${lot.value.block_id}` : '-'
  return String(block.name || block.code || block.title || block.label || lot.value?.block_id || '-')
})
const hasPromo = computed(() => Number(lot.value?.promo_price || 0) > 0 && Number(lot.value?.promo_price) < Number(lot.value?.cash_price || 0))
const paymentTypeLabel = computed(() => lot.value?.payment_type === 'Installment' ? 'Cicilan' : lot.value?.payment_type === 'Cash' ? 'Tunai' : '-')
const availablePrice = computed(() => Number(lot.value?.promo_price || lot.value?.cash_price || 0))

function notify(message: string, color: 'success' | 'danger' | 'warning' = 'success') {
  toast.message = message; toast.color = color; toast.open = true
}
function showAndroidKeyboard() {
  if (Capacitor.getPlatform() !== 'android') return

  void Keyboard.show().catch((error: unknown) => {
    console.error('[AdminKavlingDetail] Gagal membuka keyboard:', error)
  })
}
function rupiah(value: number | string | null | undefined) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? `Rp ${n.toLocaleString('id-ID')}` : 'Belum diatur'
}
function formatArea(value: number | string | null | undefined) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? `${n.toLocaleString('id-ID')} m²` : 'Belum diatur'
}
function formatDate(value: string | null | undefined) {
  if (!value) return '-'
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}
function errorText(error: unknown) {
  if (error && typeof error === 'object' && 'message' in error) return String((error as { message: unknown }).message)
  return 'Terjadi kesalahan. Periksa koneksi dan izin database.'
}
async function loadDetail() {
  if (!Number.isInteger(lotId.value) || lotId.value <= 0) {
    loadError.value = true; errorMessage.value = 'ID kavling tidak valid.'; loading.value = false; return
  }
  loading.value = true; loadError.value = false; errorMessage.value = ''
  try {
    lot.value = await lotService.getLotById(lotId.value)
    statusDraft.value = lot.value.status || 'Available'
    editDraft.lot_number = lot.value.lot_number || ''
    editDraft.dimension = lot.value.dimension || ''
    editDraft.area = lot.value.area == null ? '' : String(lot.value.area)
    editDraft.description = lot.value.description || ''
    panoramaDraft.value = lot.value.panorama_url || ''
    await Promise.all([loadInstallments(), loadHistory()])
  } catch (error) {
    console.error('[AdminKavlingDetail] Gagal memuat:', error)
    errorMessage.value = errorText(error); loadError.value = true
  } finally { loading.value = false }
}
async function loadInstallments() {
  if (!lot.value) return
  installmentsLoading.value = true
  try {
    const [rows, plans] = await Promise.all([lotService.getLotInstallments(lot.value.id), lotService.getPaymentPlans()])
    installments.value = rows; availablePlans.value = plans.map(plan => ({ ...plan, margin_percent: Number(plan.margin_percent ?? 0) }))
  } catch (error) { console.error('Gagal memuat skema cicilan:', error) }
  finally { installmentsLoading.value = false }
}
async function loadHistory() {
  if (!lot.value) return
  historyLoading.value = true
  try {
    const [tx, pay] = await Promise.all([lotService.getLotTransactions(lot.value.id), lotService.getLotPayments(lot.value.id)])
    transactions.value = tx
    payments.value = pay.map(payment => {
      const amount = payment.amount == null ? null : Number(payment.amount)
      return { ...payment, amount: amount != null && Number.isFinite(amount) ? amount : null }
    })
  } catch (error) { console.error('Gagal memuat riwayat:', error) }
  finally { historyLoading.value = false }
}
async function runSave(task: () => Promise<void>, success: string) {
  saving.value = true
  try { await task(); notify(success); await loadDetail() }
  catch (error) { console.error(error); notify(errorText(error), 'danger') }
  finally { saving.value = false }
}
async function saveStatus() {
  if (!lot.value) return
  await runSave(async () => {
    const { error } = await supabase.from('lots').update({ status: statusDraft.value, updated_at: new Date().toISOString() }).eq('id', lot.value!.id)
    if (error) throw error
    statusModalOpen.value = false
  }, 'Status kavling berhasil diperbarui.')
}
async function saveInfo() {
  if (!lot.value) return
  if (!editDraft.lot_number.trim()) { notify('Nomor kavling wajib diisi.', 'warning'); return }
  await runSave(async () => {
    const { error } = await supabase.from('lots').update({
      lot_number: editDraft.lot_number.trim(),
      dimension: editDraft.dimension.trim() || null,
      area: editDraft.area === '' ? null : Number(editDraft.area),
      description: editDraft.description.trim() || null,
      updated_at: new Date().toISOString(),
    }).eq('id', lot.value!.id)
    if (error) throw error
    editModalOpen.value = false
  }, 'Informasi kavling berhasil diperbarui.')
}
function openPriceEditor(type: 'cash' | 'promo') {
  priceDraft.type = type
  priceDraft.value = String(type === 'cash' ? lot.value?.cash_price ?? '' : lot.value?.promo_price ?? '')
  priceModalOpen.value = true
}
async function savePrice() {
  if (!lot.value) return
  const amount = priceDraft.value.trim() === '' ? null : Number(priceDraft.value)
  if (amount !== null && (!Number.isFinite(amount) || amount < 0)) { notify('Nominal harga tidak valid.', 'warning'); return }
  await runSave(async () => {
    const column = priceDraft.type === 'cash' ? 'cash_price' : 'promo_price'
    const { error } = await supabase.from('lots').update({ [column]: amount, updated_at: new Date().toISOString() }).eq('id', lot.value!.id)
    if (error) throw error
    priceModalOpen.value = false
  }, 'Harga kavling berhasil diperbarui.')
}
async function clearPromoPrice() {
  if (!lot.value || !window.confirm('Hapus harga promo kavling ini?')) return
  await runSave(async () => {
    const { error } = await supabase.from('lots').update({ promo_price: null, updated_at: new Date().toISOString() }).eq('id', lot.value!.id)
    if (error) throw error
  }, 'Harga promo berhasil dihapus.')
}
async function addInstallment() {
  if (!lot.value) return
  const plan = availablePlans.value.find((item) => item.id === Number(planDraft.plan_id))
  if (!plan) { notify('Pilih skema cicilan yang valid.', 'warning'); return }
  const customValue = planDraft.monthly_payment.trim() ? Number(planDraft.monthly_payment) : null
  if (customValue !== null && (!Number.isFinite(customValue) || customValue < 0)) { notify('Nominal cicilan tidak valid.', 'warning'); return }
  const monthly = customValue ?? Math.ceil((availablePrice.value * (1 + Number(plan.margin_percent || 0) / 100)) / plan.months)
  await runSave(async () => {
    const { error } = await supabase.from('lot_installments').insert({
      lot_id: lot.value!.id, plan_id: plan.id, monthly_payment: monthly, is_custom: customValue !== null,
    })
    if (error) throw error
    planModalOpen.value = false; planDraft.plan_id = ''; planDraft.monthly_payment = ''
  }, 'Skema cicilan berhasil ditambahkan.')
}
async function removeInstallment(id: number) {
  if (!window.confirm('Hapus skema cicilan ini dari kavling?')) return
  await runSave(async () => {
    const { error } = await supabase.from('lot_installments').delete().eq('id', id)
    if (error) throw error
  }, 'Skema cicilan berhasil dihapus.')
}
async function savePanorama() {
  if (!lot.value) return
  const url = panoramaDraft.value.trim()
  if (url && !/^https?:\/\/\S+$/i.test(url)) { notify('Masukkan URL panorama HTTP atau HTTPS yang valid.', 'warning'); return }
  await runSave(async () => {
    const { error } = await supabase.from('lots').update({ panorama_url: url || null, updated_at: new Date().toISOString() }).eq('id', lot.value!.id)
    if (error) throw error
    panoramaModalOpen.value = false
  }, 'URL panorama berhasil disimpan.')
}
async function removePanorama() {
  if (!lot.value || !window.confirm('Hapus URL panorama dari kavling ini?')) return
  panoramaDraft.value = ''
  await runSave(async () => {
    const { error } = await supabase.from('lots').update({ panorama_url: null, updated_at: new Date().toISOString() }).eq('id', lot.value!.id)
    if (error) throw error
  }, 'Panorama berhasil dilepas dari kavling.')
}
function openPanorama() {
  if (!lot.value?.panorama_url) { notify('Panorama belum tersedia.', 'warning'); return }
  router.push({ name: 'Panorama', params: { lotId: lot.value.id } })
}
function backToLots() {
  void router.replace({ name: 'AdminKavling' })
}
onIonViewWillEnter(() => { void loadDetail() })
</script>

<style scoped>
.image-placeholder-mascot {
  width: min(180px, 60%);
  max-height: 120px;
  object-fit: contain;
}
.panorama-empty-mascot{width:min(180px,60%);max-height:140px;object-fit:contain}
.loading-mascot{width:min(180px,60%);height:auto;object-fit:contain}
.detail-page{padding:12px 16px calc(112px + env(safe-area-inset-bottom));background:var(--app-background);color:var(--text-primary);font-family:var(--font-primary)}
.detail-back-nav{display:flex;align-items:center;margin-bottom:12px}.back-action{margin:0}
.hero-card,.panel{background:var(--surface-primary);border:1px solid var(--border-default);border-radius:var(--radius-card);padding:14px;margin-bottom:14px}
.hero-image-wrap{position:relative;overflow:hidden;border-radius:var(--radius-control);aspect-ratio:16/9;background:var(--surface-muted)}
.hero-image{width:100%;height:100%;object-fit:cover;display:block}
.image-placeholder,.panorama-empty{height:100%;min-height:150px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;color:var(--text-secondary);background:var(--surface-muted)}
.image-placeholder ion-icon,.panorama-empty ion-icon{font-size:32px}
.image-expand,.preview-expand{position:absolute;right:10px;bottom:10px;width:44px;height:44px;min-height:44px;margin:0;--padding-start:0;--padding-end:0}
.spec-strip{display:grid;grid-template-columns:repeat(3,1fr);margin-top:12px;padding:12px 4px;border:1px solid var(--border-default);border-radius:var(--radius-control);background:var(--surface-muted)}
.spec-strip>div{display:flex;align-items:center;flex-direction:column;gap:5px;text-align:center;padding:0 4px}
.spec-strip>div+div{border-left:1px solid var(--border-default)}
.spec-strip span,.price-summary span{font-size:11px;color:var(--text-secondary)}
.spec-strip strong{font-size:14px}
.status-pill{padding:5px 10px;border-radius:99px;background:var(--status-success-bg);color:var(--poliland-green);font-size:11px!important}
.status-pill.booking{background:var(--poliland-gold-soft);color:var(--poliland-gold-text-soft)}
.status-pill.sold{background:color-mix(in srgb,var(--status-danger) 12%,white);color:var(--status-danger)}
.price-summary{display:flex;align-items:end;justify-content:space-between;gap:12px;border-top:1px solid var(--border-default);margin-top:12px;padding:14px 0}
.price-summary>div{display:flex;flex-direction:column;gap:5px}
.price-summary s{font-size:13px;color:var(--text-secondary)}
.promo-price{text-align:right}
.promo-price strong{font-size:20px;color:var(--poliland-gold-text)}
.promo-label{align-self:flex-end;background:var(--poliland-gold-soft);color:var(--poliland-gold-text-soft);padding:4px 7px;border-radius:5px;font-size:10px;font-weight:700}
.hero-actions{display:grid;gap:8px}
.detail-tabs{position:sticky;top:0;z-index:5;display:grid;grid-template-columns:repeat(4,minmax(0,1fr));background:var(--surface-primary);border-bottom:1px solid var(--border-default);margin:0 -16px 14px;padding:0 8px}
.detail-tabs button{min-height:48px;border:0;border-bottom:2px solid transparent;background:transparent;color:var(--text-secondary);font:inherit;font-size:12px;font-weight:600;padding:0 3px}
.detail-tabs button.active{color:var(--poliland-green);border-bottom-color:var(--poliland-green)}
.detail-tabs button:focus-visible{outline:3px solid var(--poliland-green);outline-offset:2px}
.tab-content{min-height:220px}
.eyebrow{margin:0 0 8px;color:var(--text-secondary);font-size:11px;font-weight:700;letter-spacing:.05em}
.panel h2,.section-heading h2{margin:0 0 14px;font-size:17px;font-weight:700}
.info-list{margin:0}
.info-list>div{display:flex;justify-content:space-between;gap:12px;padding:11px 0;border-bottom:1px solid var(--border-default);font-size:13px}
.info-list>div:last-child{border:0}
.info-list dt{color:var(--text-secondary)}
.info-list dd{margin:0;text-align:right;font-weight:600;max-width:58%;overflow-wrap:anywhere}
.helper-note{font-size:11px;line-height:1.5;color:var(--text-secondary);margin:12px 0 0}
.price-edit-row{display:flex;align-items:center;gap:8px;border:1px solid var(--border-default);border-radius:var(--radius-control);padding:12px;margin:10px 0}
.price-edit-row>div{display:flex;flex:1;flex-direction:column;gap:5px;min-width:0}
.price-edit-row span{font-size:11px;color:var(--text-secondary)}
.price-edit-row strong{font-size:16px}
.icon-action{flex:0 0 44px;width:44px;height:44px;min-height:44px;margin:0;--padding-start:0;--padding-end:0}
.add-action{margin-top:12px}
.manage-action{min-height:44px;margin:0}
.modal-close{flex:0 0 44px;width:44px;height:44px;min-height:44px;margin:0;--padding-start:0;--padding-end:0}
.section-heading{display:flex;justify-content:space-between;align-items:center;gap:8px;margin:22px 0 10px}
.section-heading h2{margin:0}
.table-panel{padding:10px}
.installment-row{display:flex;align-items:center;gap:8px;padding:12px 2px;border-bottom:1px solid var(--border-default)}
.installment-main{display:flex;flex:1;flex-direction:column;gap:4px;min-width:0}
.installment-main strong{font-size:13px}
.installment-main span,.monthly-value small{font-size:11px;color:var(--text-secondary);font-weight:400}
.monthly-value{font-size:12px;text-align:right;white-space:nowrap}
.monthly-value small{display:block}
.panorama-panel{padding:14px}
.panorama-preview{position:relative;aspect-ratio:16/9;overflow:hidden;border-radius:12px;background:var(--surface-muted)}
.panorama-preview img{width:100%;height:100%;object-fit:cover}
.file-info{display:flex;align-items:center;gap:10px;border:1px solid var(--border-default);border-radius:12px;padding:10px;margin-top:14px}
.file-icon{display:grid;place-items:center;width:42px;height:42px;border-radius:10px;background:var(--surface-muted);font-size:21px;color:var(--poliland-green)}
.file-copy{display:flex;flex:1;flex-direction:column;gap:4px;min-width:0}
.file-copy strong{font-size:12px}
.file-copy span{font-size:10px;color:var(--text-secondary);overflow-wrap:anywhere}
.panorama-actions{display:flex;flex-wrap:wrap;gap:7px;margin-top:12px}
.panorama-actions>*{flex:1}
.panorama-empty{min-height:180px;border-radius:var(--radius-control);text-align:center;padding:20px}
.panorama-empty strong{font-size:14px}
.panorama-empty span{font-size:11px}
.timeline{padding-left:5px}
.timeline-item{display:flex;gap:12px;position:relative;padding:0 0 20px 2px}
.timeline-item:not(:last-child):before{content:"";position:absolute;left:5px;top:12px;bottom:-2px;width:1px;background:var(--border-default)}
.timeline-dot{position:relative;z-index:1;flex:0 0 10px;height:10px;margin-top:4px;border-radius:50%;background:var(--poliland-green)}
.timeline-dot.payment{background:var(--poliland-gold)}
.timeline-item>div{display:flex;flex-direction:column;gap:5px}
.timeline-item strong{font-size:13px}
.timeline-item span,.timeline-item small{font-size:11px;color:var(--text-secondary)}
.timeline-item b{font-size:13px}
.state-card,.inline-state,.empty-inline{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;text-align:center;padding:32px 16px;color:var(--text-secondary)}
.history-empty img{width:min(180px,60%);height:auto;object-fit:contain}
.state-card ion-icon{font-size:30px}
.state-card strong{color:var(--text-primary)}
.field-label{display:block;margin:14px 0 7px;font-size:12px;font-weight:600;color:var(--text-primary)}
.form-control{display:block;width:100%;min-height:46px;border:1px solid var(--border-default);border-radius:12px;padding:10px 12px;background:var(--surface-primary);color:var(--text-primary);font:inherit;font-size:13px;outline:none}
.form-control:focus{border-color:var(--poliland-green);box-shadow:0 0 0 3px color-mix(in srgb,var(--poliland-green) 13%,transparent)}
textarea.form-control{min-height:88px;resize:vertical}
.helper-note{font-size:11px;line-height:1.5;color:var(--text-secondary);margin:10px 0 0}

@media(min-width:700px){.detail-page{max-width:760px;margin:0 auto;padding-top:20px}.hero-actions{grid-template-columns:1fr 1fr}.detail-tabs{margin-left:0;margin-right:0;border:1px solid var(--border-default);border-radius:12px}.tab-content{max-width:760px}}
</style>
