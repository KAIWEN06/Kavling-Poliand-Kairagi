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
              <h2>Informasi Kavling</h2>
              <dl class="info-list">
                <div><dt>Nomor Kavling</dt><dd>{{ lot.lot_number }}</dd></div>
                <div><dt>Blok</dt><dd>{{ blockLabel }}</dd></div>
                <div><dt>Luas Tanah</dt><dd>{{ formatArea(lot.area) }}</dd></div>
                <div><dt>Dimensi</dt><dd>{{ lot.dimension || '-' }}</dd></div>
                <div><dt>Jenis Pembayaran</dt><dd>{{ paymentTypeLabel }}</dd></div>
                <div v-if="bookingCustomer"><dt>Nama Pemesan</dt><dd><RouterLink class="info-customer-link" :to="{ name: 'AdminPembeliDetail', params: { id: bookingCustomer.id } }">{{ bookingCustomer.name }}</RouterLink></dd></div>
                <div v-if="buyerCustomer"><dt>Nama Pembeli</dt><dd><RouterLink class="info-customer-link" :to="{ name: 'AdminPembeliDetail', params: { id: buyerCustomer.id } }">{{ buyerCustomer.name }}</RouterLink></dd></div>
                <div><dt>Tanggal Dipesan</dt><dd>{{ formatDate(lot.booking_date) }}</dd></div>
                <div><dt>Tanggal Terjual</dt><dd>{{ formatDate(lot.sold_date) }}</dd></div>
                <div><dt>Keterangan</dt><dd>{{ lot.description || '-' }}</dd></div>
              </dl>
            </article>
          </section>

          <section v-else-if="activeTab === 'price'" class="tab-content">
            <article class="panel">
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
                 <AppButton variant="primary" @click="panoramaModalOpen = true"><ion-icon :icon="createOutline" slot="start" />{{ lot.panorama_url ? 'Ubah' : 'Tambahkan' }}</AppButton>
                 <AppButton v-if="lot.panorama_url" variant="danger" fill="outline" @click="removePanorama"><ion-icon :icon="trashOutline" slot="start" />Hapus</AppButton>
              </div>
            </article>
          </section>

          <section v-else class="tab-content">
            <article class="panel">
              <div class="section-heading audit-heading">
                <div>
                  <h2>Riwayat Perubahan</h2>
                  <p class="audit-subtitle">Catatan perubahan informasi kavling oleh Admin.</p>
                </div>
              </div>

              <div v-if="historyLoading" class="inline-state" role="status">
                <ion-spinner name="crescent" /> Memuat riwayat perubahan...
              </div>

              <div v-else-if="historyError" class="empty-inline" role="alert">
                <ion-icon :icon="alertCircleOutline" />
                <span>{{ historyError }}</span>
                <AppButton variant="neutral" fill="outline" size="small" @click="loadActivityLogs">
                  Coba Lagi
                </AppButton>
              </div>

              <div v-else-if="!activityLogs.length" class="empty-inline history-empty">
                <img :src="emptyReceiptMascot" alt="Belum ada catatan perubahan" />
                <strong>Belum ada riwayat perubahan</strong>
                <span>Perubahan informasi kavling akan tercatat di sini secara otomatis.</span>
              </div>

              <div v-else class="timeline audit-timeline">
                <div
                  v-for="log in activityLogs"
                  :key="log.id"
                  class="timeline-item audit-item"
                >
                  <span :class="['timeline-dot', `audit-${log.action.toLowerCase()}`]"></span>
                  <div class="audit-content">
                    <div class="audit-title-row">
                      <strong>{{ auditTitle(log) }}</strong>
                      <span class="audit-action">{{ auditActionLabel(log.action, log) }}</span>
                    </div>
                    <span class="audit-actor">{{ log.actor_name || 'Admin tidak diketahui' }}</span>

                    <div v-if="log.action === 'UPDATE'" class="audit-change">
                      <span class="audit-field">{{ auditFieldLabel(log.field_name) }}</span>
                      <div class="audit-values">
                        <span class="audit-old">{{ formatAuditValue(log.field_name, log.old_value) }}</span>
                        <ion-icon :icon="arrowBackOutline" aria-hidden="true" />
                        <strong class="audit-new">{{ formatAuditValue(log.field_name, log.new_value) }}</strong>
                      </div>
                    </div>

                    <div v-else-if="log.action === 'INSERT'" class="audit-detail">
                      Kavling baru ditambahkan ke sistem.
                    </div>

                    <div v-else-if="log.action === 'DELETE'" class="audit-detail">
                      Data kavling dihapus. Snapshot data sebelum penghapusan tersimpan pada log audit.
                    </div>

                    <span class="audit-date">{{ formatAuditDateTime(log.created_at) }}</span>
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
        type="text"
        inputmode="numeric"
        autocomplete="off"
        placeholder="Contoh: 425000000"
        @input="sanitizePriceInput"
      />
      <p class="helper-note">Nominal diformat otomatis dengan pemisah ribuan, misalnya 425.000.000.</p>
    </AppModal>

    <AppModal
      v-model="planModalOpen"
      title="Tambah Skema Cicilan"
      variant="bottom-sheet"
      :loading="saving"
      :confirm-disabled="!planDraft.plan_id"
      confirm-text="Tambahkan"
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
      confirm-text="Simpan"
      @confirm="savePanorama"
    >
      <label class="field-label" for="panorama-file">File Panorama 360°</label>
      <input
        id="panorama-file"
        ref="panoramaFileInput"
        class="form-control"
        type="file"
        accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp"
        @change="handlePanoramaFile"
      />
      <p class="helper-note">
        Pilih gambar panorama equirectangular dengan rasio 2:1.
        File akan diunggah ke Supabase Storage bucket lot-media dan URL-nya disimpan otomatis.
      </p>
      <div v-if="panoramaSelectedFile" class="selected-file">
        <ion-icon :icon="imageOutline" aria-hidden="true" />
        <span>{{ panoramaSelectedFile.name }}</span>
        <small>{{ formatFileSize(panoramaSelectedFile.size) }}</small>
      </div>
      <p v-if="lot?.panorama_url" class="helper-note">
        Panorama saat ini sudah tersimpan. Memilih file baru akan menggantinya.
      </p>
    </AppModal>

    <ion-toast :is-open="toast.open" :message="toast.message" :color="toast.color" :duration="3000" @didDismiss="toast.open = false" />
  </ion-page>
</template>

<script setup lang="ts">
import { Capacitor } from '@capacitor/core'
import { Keyboard } from '@capacitor/keyboard'
import { computed, reactive, ref } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
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
import { lotService, BOOKING_FEE_FIXED, type LotRecord } from '@/services/lotService'

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
  id: number
  customer_id: number
  status: string
  payment_type: string
  final_price: number
  booking_fee: number
  booking_date: string | null
  customer_name: string | null
}
interface PaymentRow {
  id: number
  transaction_id: number
  customer_id: number | null
  lot_id: number | null
  payment_date: string | null
  amount: number | null
  payment_method: string | null
  payment_category: string
  note: string | null
  status: 'Pending' | 'Confirmed' | 'Rejected' | string
  created_at: string
}

interface ActivityLogRow {
  id: number
  lot_id: number | null
  user_id: string | null
  action: 'INSERT' | 'UPDATE' | 'DELETE' | string
  field_name: string | null
  old_value: unknown
  new_value: unknown
  description: string | null
  metadata: Record<string, unknown> | null
  created_at: string
  actor_name?: string | null
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
const panoramaFileInput = ref<HTMLInputElement | null>(null)
const panoramaSelectedFile = ref<File | null>(null)
const installments = ref<InstallmentRow[]>([])
const availablePlans = ref<PlanRow[]>([])
const transactions = ref<TransactionRow[]>([])
const payments = ref<PaymentRow[]>([])
const activityLogs = ref<ActivityLogRow[]>([])
const historyError = ref('')
const installmentsLoading = ref(false)
const historyLoading = ref(false)
const toast = reactive<{ open: boolean; message: string; color: 'success' | 'danger' | 'warning' }>({
  open: false, message: '', color: 'success',
})
const effectiveStatus = computed(() => {
  return lot.value?.status || 'Available'
})
const statusLabel = computed(() => {
  const value = effectiveStatus.value.toLowerCase()
  if (['booking', 'booked'].includes(value)) return 'Dipesan'
  if (['sold', 'terjual'].includes(value)) return 'Terjual'
  return 'Tersedia'
})
const statusClass = computed(() => {
  const value = effectiveStatus.value.toLowerCase()
  return ['booking', 'booked'].includes(value) ? 'booking' : ['sold', 'terjual'].includes(value) ? 'sold' : 'available'
})
const blockLabel = computed(() => {
  const block = lot.value?.block as Record<string, unknown> | null
  if (!block) return lot.value?.block_id ? `Blok ${lot.value.block_id}` : '-'
  return String(block.name || block.code || block.title || block.label || lot.value?.block_id || '-')
})
const hasPromo = computed(() => Number(lot.value?.promo_price || 0) > 0 && Number(lot.value?.promo_price) < Number(lot.value?.cash_price || 0))
const paymentTypeLabel = computed(() => {
  const status = effectiveStatus.value.toLowerCase()

  // Jenis pembayaran hanya relevan setelah kavling memiliki transaksi aktif.
  // Jangan membaca lots.payment_type karena nilainya bisa merupakan data lama/default.
  if (!['booking', 'booked', 'sold', 'terjual'].includes(status)) return '-'

  const transactionStatus = ['booking', 'booked'].includes(status) ? 'Booking' : 'Sold'
  const activeTransaction = transactions.value.find(
    (transaction) => transaction.status === transactionStatus,
  )

  if (activeTransaction?.payment_type === 'Installment') return 'Cicilan'
  if (activeTransaction?.payment_type === 'Cash') return 'Tunai'
  return '-'
})
const availablePrice = computed(() => Number(lot.value?.promo_price || lot.value?.cash_price || 0))
const lotCustomer = computed(() => {
  const customer = Array.isArray(lot.value?.customer) ? lot.value.customer[0] : lot.value?.customer
  const id = lot.value?.customer_id
  const name = customer?.full_name
  if (!id || id <= 0 || typeof name !== 'string' || !name.trim()) return null
  return { id, name: name.trim() }
})
function transactionCustomer(status: 'Booking' | 'Sold') {
  const transaction = transactions.value.find((item) =>
    item.status === status
    && typeof item.customer_id === 'number'
    && item.customer_id > 0
    && typeof item.customer_name === 'string'
    && item.customer_name.trim(),
  )
  if (!transaction || !transaction.customer_id || !transaction.customer_name) return null
  return { id: transaction.customer_id, name: transaction.customer_name.trim() }
}
const bookingCustomer = computed(() => {
  const status = effectiveStatus.value.toLowerCase()
  return transactionCustomer('Booking')
    ?? (['booking', 'booked'].includes(status) ? lotCustomer.value : null)
})
const buyerCustomer = computed(() => {
  const status = effectiveStatus.value.toLowerCase()
  return transactionCustomer('Sold')
    ?? (['sold', 'terjual'].includes(status) ? lotCustomer.value : null)
})

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
    statusDraft.value = effectiveStatus.value || 'Available'
    editDraft.lot_number = lot.value.lot_number || ''
    editDraft.dimension = lot.value.dimension || ''
    editDraft.area = lot.value.area == null ? '' : String(lot.value.area)
    editDraft.description = lot.value.description || ''
    panoramaSelectedFile.value = null
    if (panoramaFileInput.value) panoramaFileInput.value.value = ''
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
function getBookingPaid(transactionId: number): number {
  return payments.value
    .filter((payment) =>
      Number(payment.transaction_id) === Number(transactionId) &&
      payment.payment_category === 'Booking' &&
      payment.status === 'Confirmed'
    )
    .reduce((total, payment) => total + Number(payment.amount ?? 0), 0)
}

async function loadHistory() {
  if (!lot.value) return

  // Riwayat transaksi tetap dimuat untuk kebutuhan informasi transaksi,
  // tetapi tidak ditampilkan pada tab Riwayat Perubahan.
  try {
    const tx = await lotService.getLotTransactions(lot.value.id)
    transactions.value = tx

    const paymentGroups = await Promise.all(
      tx.map((transaction) => lotService.getLotPayments(transaction.id))
    )

    payments.value = paymentGroups
      .flat()
      .map((payment) => {
        const amount = payment.amount == null ? null : Number(payment.amount)
        return {
          ...payment,
          amount: amount != null && Number.isFinite(amount) ? amount : null,
        }
      })
      .sort((a, b) => {
        const dateA = a.payment_date ? new Date(a.payment_date).getTime() : 0
        const dateB = b.payment_date ? new Date(b.payment_date).getTime() : 0
        return dateB - dateA
      })
  } catch (error) {
    console.error('[AdminKavlingDetail] Gagal memuat data transaksi:', error)
    transactions.value = []
    payments.value = []
  }

  await loadActivityLogs()
}

async function loadActivityLogs() {
  if (!lot.value) return

  historyLoading.value = true
  historyError.value = ''

  try {
    const { data, error } = await supabase
      .from('lot_activity_logs')
      .select('id, lot_id, user_id, action, field_name, old_value, new_value, description, metadata, created_at')
      .eq('lot_id', lot.value.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    const rows = (data ?? []) as ActivityLogRow[]
    const userIds = [...new Set(rows.map((row) => row.user_id).filter((id): id is string => Boolean(id)))]

    let profileMap = new Map<string, string>()

    if (userIds.length) {
      const { data: profiles, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name')
        .in('id', userIds)

      if (profileError) {
        // Riwayat tetap dapat dibaca meskipun nama profil tidak dapat dimuat.
        console.warn('[AdminKavlingDetail] Nama Admin tidak dapat dimuat:', profileError)
      } else {
        profileMap = new Map<string, string>(
          (profiles ?? []).map((profile) => [profile.id, profile.full_name || 'Admin'] as [string, string])
        )
      }
    }

    activityLogs.value = rows.map((row) => ({
      ...row,
      actor_name: row.user_id ? profileMap.get(row.user_id) ?? null : null,
    }))
  } catch (error) {
    console.error('[AdminKavlingDetail] Gagal memuat riwayat perubahan:', error)
    activityLogs.value = []
    historyError.value = errorText(error)
  } finally {
    historyLoading.value = false
  }
}

function auditActionLabel(action: string, log?: ActivityLogRow) {
  if (log?.field_name === 'installment_scheme') {
    const operation = String(log.metadata?.source_operation || '').toUpperCase()
    if (operation === 'INSERT') return 'Ditambahkan'
    if (operation === 'DELETE') return 'Dihapus'
    return 'Diubah'
  }

  const labels: Record<string, string> = {
    INSERT: 'Dibuat',
    UPDATE: 'Diubah',
    DELETE: 'Dihapus',
  }
  return labels[action] || action
}

function auditTitle(log: ActivityLogRow) {
  if (log.field_name === 'installment_scheme') {
    const operation = String(log.metadata?.source_operation || '').toUpperCase()
    if (operation === 'INSERT') return 'Skema cicilan ditambahkan'
    if (operation === 'DELETE') return 'Skema cicilan dihapus'
    return 'Skema cicilan diubah'
  }

  if (log.action === 'INSERT') return 'Kavling ditambahkan'
  if (log.action === 'DELETE') {
    const lotNumber = log.metadata?.lot_number
    return `Kavling ${typeof lotNumber === 'string' ? lotNumber : ''} dihapus`.trim()
  }
  return 'Informasi kavling diperbarui'
}

function auditFieldLabel(field: string | null) {
  const labels: Record<string, string> = {
    lot_number: 'Nomor kavling',
    polygon_id: 'ID polygon',
    block_id: 'Blok',
    dimension: 'Dimensi',
    area: 'Luas tanah',
    cash_price: 'Harga normal',
    promo_price: 'Harga promo',
    status: 'Status',
    payment_type: 'Jenis pembayaran',
    customer_id: 'Customer',
    booking_date: 'Tanggal booking',
    sold_date: 'Tanggal terjual',
    color: 'Warna kavling',
    description: 'Keterangan',
    panorama_url: 'Panorama 360°',
    panorama_boundary: 'Batas panorama',
    installment_scheme: 'Skema cicilan',
  }
  return field ? labels[field] || field : 'Informasi'
}

function formatAuditValue(field: string | null, value: unknown) {
  if (value === null || value === undefined || value === '') {
    if (field === 'promo_price') return 'Tidak ada harga promo'
    if (field === 'panorama_url') return 'Panorama tidak tersedia'
    return 'Kosong'
  }

  let normalized = value
  if (typeof value === 'string') {
    try {
      normalized = JSON.parse(value)
    } catch {
      normalized = value
    }
  }

  if (field === 'cash_price' || field === 'promo_price') {
    const amount = Number(normalized)
    return Number.isFinite(amount) ? rupiah(amount) : String(normalized)
  }

  if (field === 'installment_scheme') {
    if (typeof normalized === 'object' && normalized !== null) {
      const scheme = normalized as Record<string, unknown>
      const name = typeof scheme.plan_name === 'string' ? scheme.plan_name : `Skema #${scheme.plan_id ?? '-'}`
      const months = Number(scheme.months ?? 0)
      const monthly = scheme.monthly_payment == null ? null : Number(scheme.monthly_payment)
      const margin = scheme.margin_percent == null ? null : Number(scheme.margin_percent)
      const parts = [name]
      if (months > 0) parts.push(`${months} bulan`)
      if (monthly !== null && Number.isFinite(monthly)) parts.push(`${rupiah(monthly)} / bulan`)
      if (margin !== null && Number.isFinite(margin)) parts.push(`Margin ${margin}%`)
      if (scheme.is_custom === true) parts.push('Nominal manual')
      return parts.join(' · ')
    }
    return String(normalized)
  }

  if (field === 'area') return formatArea(normalized as number | string)
  if (field === 'status') {
    const labels: Record<string, string> = {
      Available: 'Tersedia',
      Booking: 'Dipesan',
      Sold: 'Terjual',
    }
    return labels[String(normalized)] || String(normalized)
  }

  if (field === 'panorama_url') {
    return normalized ? 'Panorama tersedia' : 'Panorama tidak tersedia'
  }

  if (field === 'panorama_boundary') {
    return 'Batas panorama diperbarui'
  }

  if (field === 'customer_id') return `ID Customer: ${String(normalized)}`
  if (field === 'block_id') return `Blok ${String(normalized)}`
  if (typeof normalized === 'object') return 'Data diperbarui'

  return String(normalized)
}

function formatAuditDateTime(value: string) {
  if (!value) return '-'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date)
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
    throw new Error(
      'Status kavling tidak dapat diubah manual. Status Available, Booking, dan Sold harus mengikuti konfirmasi pembayaran melalui alur transaksi.'
    )
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
  const currentValue = type === 'cash' ? lot.value?.cash_price : lot.value?.promo_price
  priceDraft.value = currentValue == null ? '' : Number(currentValue).toLocaleString('id-ID')
  priceModalOpen.value = true
}

function sanitizePriceInput(event: Event) {
  const input = event.target as HTMLInputElement
  const digits = input.value.replace(/\D/g, '')
  const formatted = digits ? Number(digits).toLocaleString('id-ID') : ''
  priceDraft.value = formatted
  input.value = formatted
}

async function savePrice() {
  if (!lot.value) return

  // Tampilan memakai titik pemisah ribuan; database menerima integer Rupiah.
  const rawValue = priceDraft.value.replace(/\D/g, '')
  if (priceDraft.type === 'cash' && !rawValue) {
    notify('Harga normal wajib diisi.', 'warning')
    return
  }

  const amount = rawValue === '' ? null : Number(rawValue)
  if (amount !== null && (!Number.isSafeInteger(amount) || amount <= 0)) {
    notify('Nominal harga harus berupa bilangan Rupiah bulat lebih dari 0.', 'warning')
    return
  }

  if (priceDraft.type === 'promo' && amount !== null) {
    const cashPrice = Number(lot.value.cash_price ?? 0)
    if (cashPrice > 0 && amount >= cashPrice) {
      notify('Harga promo harus lebih rendah daripada harga normal.', 'warning')
      return
    }
  }

  await runSave(async () => {
    const column = priceDraft.type === 'cash' ? 'cash_price' : 'promo_price'
    const { data, error } = await supabase
      .from('lots')
      .update({ [column]: amount, updated_at: new Date().toISOString() })
      .eq('id', lot.value!.id)
      .select('id, cash_price, promo_price')
      .single()

    if (error) throw error
    if (!data) throw new Error('Data kavling tidak ditemukan atau tidak memiliki izin untuk diperbarui.')
    priceModalOpen.value = false
  }, 'Harga kavling berhasil diperbarui.')
}

async function clearPromoPrice() {
  if (!lot.value || !window.confirm('Hapus harga promo kavling ini?')) return
  await runSave(async () => {
    const { data, error } = await supabase
      .from('lots')
      .update({ promo_price: null, updated_at: new Date().toISOString() })
      .eq('id', lot.value!.id)
      .select('id, promo_price')
      .single()

    if (error) throw error
    if (!data) throw new Error('Harga promo tidak berhasil dihapus.')
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
function handlePanoramaFile(event: Event) {
  const input = event.target as HTMLInputElement
  panoramaSelectedFile.value = input.files?.[0] ?? null
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`
}

async function validatePanoramaFile(file: File) {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowedTypes.includes(file.type)) throw new Error('Format panorama harus JPG, PNG, atau WebP.')
  if (file.size > 30 * 1024 * 1024) throw new Error('Ukuran file panorama maksimal 30 MB.')

  const objectUrl = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = objectUrl
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('File gambar tidak dapat dibaca.'))
    })
    const ratio = image.naturalWidth / image.naturalHeight
    if (Math.abs(ratio - 2) > 0.02) {
      throw new Error(`Rasio panorama harus 2:1. File ini memiliki rasio ${image.naturalWidth}:${image.naturalHeight}.`)
    }
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

async function savePanorama() {
  if (!lot.value) return
  const file = panoramaSelectedFile.value
  if (!file) {
    notify('Pilih file panorama terlebih dahulu.', 'warning')
    return
  }

  await runSave(async () => {
    await validatePanoramaFile(file)

    const extensionByType: Record<string, string> = {
      'image/jpeg': 'jpg',
      'image/png': 'png',
      'image/webp': 'webp',
    }
    const safeName = file.name.normalize('NFKD').replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-')
    const storagePath = `lots/${lot.value!.id}/panorama-${Date.now()}-${safeName || `panorama.${extensionByType[file.type]}`}`

    const { error: uploadError } = await supabase.storage
      .from('lot-media')
      .upload(storagePath, file, {
        cacheControl: '3600',
        contentType: file.type,
        upsert: false,
      })
    if (uploadError) throw uploadError

    const { data: publicUrlData } = supabase.storage.from('lot-media').getPublicUrl(storagePath)
    const publicUrl = publicUrlData.publicUrl
    if (!publicUrl) {
      await supabase.storage.from('lot-media').remove([storagePath])
      throw new Error('URL publik gagal dibuat. Periksa konfigurasi bucket lot-media.')
    }

    const { data, error: updateError } = await supabase
      .from('lots')
      .update({ panorama_url: publicUrl, updated_at: new Date().toISOString() })
      .eq('id', lot.value!.id)
      .select('id, panorama_url')
      .single()

    if (updateError || !data) {
      await supabase.storage.from('lot-media').remove([storagePath])
      if (updateError) throw updateError
      throw new Error('URL panorama gagal disimpan ke data kavling.')
    }

    panoramaModalOpen.value = false
    panoramaSelectedFile.value = null
    if (panoramaFileInput.value) panoramaFileInput.value.value = ''
  }, 'Panorama berhasil diunggah dan disimpan.')
}

async function removePanorama() {
  if (!lot.value || !window.confirm('Hapus panorama dari kavling ini?')) return
  await runSave(async () => {
    const { data, error } = await supabase
      .from('lots')
      .update({ panorama_url: null, updated_at: new Date().toISOString() })
      .eq('id', lot.value!.id)
      .select('id')
      .single()
    if (error) throw error
    if (!data) throw new Error('Panorama tidak berhasil dilepas dari kavling.')
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
.info-customer-link{color:inherit;text-decoration:underline;text-decoration-color:var(--poliland-green);text-underline-offset:2px;cursor:pointer}
.info-customer-link:hover{text-decoration-thickness:2px}
.info-customer-link:active{opacity:.75}
.info-customer-link:focus-visible{outline:3px solid var(--text-primary);outline-offset:3px;border-radius:2px}
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
.selected-file{display:flex;align-items:center;gap:8px;margin-top:10px;padding:10px 12px;border:1px solid var(--border-default);border-radius:var(--radius-control);color:var(--text-primary);font-size:12px}.selected-file span{min-width:0;overflow-wrap:anywhere}.selected-file small{margin-left:auto;white-space:nowrap;color:var(--text-secondary)}\n.panorama-actions{display:flex;flex-wrap:wrap;justify-content:center;align-items:center;gap:8px;margin-top:12px}
.panorama-actions>*{flex:0 1 auto;min-width:104px}
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

.audit-heading{align-items:flex-start;margin:0 0 18px}
.audit-heading h2{margin:0 0 5px}
.audit-subtitle{margin:0;color:var(--text-secondary);font-size:11px;line-height:1.5}
.audit-timeline{padding-left:2px}
.audit-item{padding-bottom:22px}
.audit-content{width:100%;min-width:0}
.audit-title-row{display:flex;align-items:center;justify-content:space-between;gap:8px}
.audit-title-row strong{font-size:13px}
.audit-action{flex:0 0 auto;padding:3px 7px;border-radius:6px;background:var(--surface-muted);color:var(--text-secondary)!important;font-size:10px!important;font-weight:700}
.audit-actor{font-size:11px;color:var(--text-secondary)}
.audit-change{margin-top:5px;padding:9px 10px;border:1px solid var(--border-default);border-radius:10px;background:var(--surface-muted)}
.audit-field{display:block;margin-bottom:5px;font-size:10px;color:var(--text-secondary)}
.audit-values{display:flex;align-items:center;gap:7px;flex-wrap:wrap;font-size:12px}
.audit-values ion-icon{font-size:13px;color:var(--text-secondary);transform:rotate(180deg)}
.audit-old{color:var(--text-secondary);text-decoration:line-through}
.audit-new{color:var(--text-primary);overflow-wrap:anywhere}
.audit-detail{margin-top:5px;font-size:12px;color:var(--text-secondary)}
.audit-date{display:block;margin-top:7px;font-size:10px;color:var(--text-secondary)}
.timeline-dot.audit-insert{background:var(--status-success)}
.timeline-dot.audit-update{background:var(--poliland-gold)}
.timeline-dot.audit-delete{background:var(--status-danger)}
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
