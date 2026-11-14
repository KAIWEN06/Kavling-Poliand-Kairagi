<template>
  <ion-page class="admin-spk-page">
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />
    <ion-content :fullscreen="true">
      <main class="spk-shell">
        <section class="spk-stats" aria-label="Ringkasan pengajuan SPK">
          <button v-for="item in statCards" :key="item.key" type="button"
            :class="['spk-stat', { 'spk-stat-active': selectedStatus === item.filter }]"
            @click="selectedStatus = item.filter">
            <span>{{ item.label }}</span><strong>{{ stats[item.key] }}</strong>
          </button>
        </section>

        <section class="spk-toolbar">
          <label class="spk-search">
            <ion-icon :icon="searchOutline" />
            <input v-model="searchQuery" type="search" placeholder="Cari nomor SPK, pembeli, marketing, kavling..." />
            <button v-if="searchQuery" type="button" aria-label="Hapus pencarian" @click="searchQuery = ''"><ion-icon :icon="closeOutline" /></button>
          </label>
          <div class="spk-source-filters" aria-label="Filter sumber SPK">
            <span>Sumber:</span>
            <button v-for="source in sourceFilters" :key="source.value" type="button"
              :class="{ active: selectedSource === source.value }"
              @click="selectedSource = source.value">{{ source.label }}</button>
          </div>
          <div class="spk-filters" aria-label="Filter status SPK">
            <button v-for="filter in statusFilters" :key="filter.value" type="button"
              :class="{ active: selectedStatus === filter.value }" @click="selectedStatus = filter.value">
              {{ filter.label }}
            </button>
          </div>
        </section>

        <div v-if="loading" class="spk-state"><ion-spinner name="crescent" /><p>Memuat pengajuan SPK...</p></div>
        <div v-else-if="errorMessage" class="spk-state spk-error" role="alert">
          <ion-icon :icon="alertCircleOutline" /><strong>Data SPK gagal dimuat</strong><p>{{ errorMessage }}</p>
          <AppButton size="small" @click="loadRequests">Coba lagi</AppButton>
        </div>

        <template v-else>
          <div class="spk-list-head"><h2>Daftar Pengajuan</h2><span>{{ filteredRequests.length }} pengajuan</span></div>
          <section v-if="filteredRequests.length" class="spk-list">
            <article v-for="request in filteredRequests" :key="request.id" class="spk-card">
              <div class="spk-card-top">
                <div><span class="spk-number">{{ request.spk_number }}</span><time>{{ formatDate(request.created_at) }}</time></div>
                <span :class="['spk-status', `status-${request.status.toLowerCase().replaceAll(' ', '-')}`]">{{ statusLabel(request.status) }}</span>
              </div>
              <div class="spk-person">
                <div class="spk-avatar">{{ initials(request.customer_full_name) }}</div>
                <div class="spk-person-info"><strong>{{ request.customer_full_name }}</strong><span>{{ request.customer_phone }}</span><small>Sumber: {{ sourceLabel(request.submission_source) }}<template v-if="request.marketing_name"> · {{ request.marketing_name }}</template></small></div>
              </div>
              <div class="spk-card-meta">
                <div><span>Kavling</span><strong>{{ request.lot_number }}</strong><small>{{ request.block_name }}</small></div>
                <div><span>Metode pembayaran</span><strong>{{ request.payment_method === 'Cash' ? 'Tunai' : 'Cicilan' }}</strong><small>{{ request.months ? `${request.months} bulan` : 'Sekali bayar' }}</small></div>
                <div><span>Harga pengajuan</span><strong>{{ formatCurrency(request.lot_price_snapshot) }}</strong><small>{{ request.documents.length }} dokumen</small></div>
              </div>
              <p v-if="request.status === 'Rejected' && request.rejection_reason" class="spk-rejection-preview">
                <strong>Alasan penolakan:</strong> {{ request.rejection_reason }}
              </p>
              <div class="spk-card-actions">
                <button class="spk-detail-btn" type="button" @click="openDetail(request)">Lihat detail <ion-icon :icon="chevronForwardOutline" /></button>
                <template v-if="isPending(request)">
                  <button class="spk-reject-btn" type="button" @click="openReject(request)">Tolak</button>
                  <button class="spk-approve-btn" type="button" @click="openApprove(request)">Setujui</button>
                </template>
              </div>
            </article>
          </section>
          <div v-else class="spk-state spk-empty-state"><img class="spk-empty-mascot" :src="mascotImage" alt="Maskot memeriksa berkas pengajuan" /><strong>Tidak ada pengajuan SPK</strong><p>Belum ada data yang sesuai dengan pencarian atau filter ini.</p></div>
        </template>
      </main>
      <button class="spk-create-btn spk-create-fab" type="button" aria-label="Buat SPK" title="Buat SPK" @click="openCreateForm">
        <ion-icon :icon="addOutline" />
      </button>
    </ion-content>
    <MobileTabBar variant="admin" />

    <AppModal v-model="detailOpen" title="Detail pengajuan SPK" variant="bottom-sheet" cancel-text="Tutup" :show-confirm="false" :max-height="'92dvh'">
      <div v-if="selectedRequest" class="spk-detail">
        <div class="spk-detail-banner"><div><span>Nomor SPK</span><strong>{{ selectedRequest.spk_number }}</strong></div><span :class="['spk-status', `status-${selectedRequest.status.toLowerCase().replaceAll(' ', '-')}`]">{{ statusLabel(selectedRequest.status) }}</span></div>
        <section class="spk-detail-section"><h3>Informasi pembeli</h3>
          <dl><div><dt>Nama lengkap</dt><dd>{{ selectedRequest.customer_full_name }}</dd></div><div><dt>Nomor telepon</dt><dd>{{ selectedRequest.customer_phone }}</dd></div><div><dt>Email</dt><dd>{{ selectedRequest.customer_email || '-' }}</dd></div><div><dt>Alamat</dt><dd>{{ selectedRequest.customer_address || '-' }}</dd></div><div><dt>Marketing</dt><dd>{{ selectedRequest.marketing_name }}</dd></div></dl>
        </section>
        <section class="spk-detail-section"><h3>Informasi kavling & pembayaran</h3>
          <dl><div><dt>Nomor kavling</dt><dd>{{ selectedRequest.lot_number }} · {{ selectedRequest.block_name }}</dd></div><div><dt>Harga snapshot</dt><dd>{{ formatCurrency(selectedRequest.lot_price_snapshot) }}</dd></div><div><dt>Metode pembayaran</dt><dd>{{ selectedRequest.payment_method === 'Cash' ? 'Tunai' : 'Cicilan' }}</dd></div><div v-if="selectedRequest.months"><dt>Tenor</dt><dd>{{ selectedRequest.months }} bulan</dd></div><div v-if="selectedRequest.monthly_payment"><dt>Cicilan per bulan</dt><dd>{{ formatCurrency(selectedRequest.monthly_payment) }}</dd></div><div><dt>Catatan marketing</dt><dd>{{ selectedRequest.notes || '-' }}</dd></div></dl>
        </section>
        <section class="spk-detail-section"><h3>Dokumen persyaratan</h3>
          <div v-if="!selectedRequest.documents.length" class="spk-no-docs">Belum ada dokumen terlampir.</div>
          <div v-for="doc in selectedRequest.documents" :key="doc.id" class="spk-document">
            <div class="spk-doc-icon"><ion-icon :icon="doc.document_type === 'Payment Proof' ? cardOutline : documentTextOutline" /></div>
            <div class="spk-doc-info"><strong>{{ documentLabel(doc.document_type) }}</strong><span>{{ doc.file_name }}</span></div>
            <button type="button" :disabled="openingDocumentId === doc.id" @click="openDocument(doc)"><ion-spinner v-if="openingDocumentId === doc.id" name="crescent" /><template v-else><ion-icon :icon="eyeOutline" /> Lihat</template></button>
          </div>
        </section>
        <div v-if="selectedRequest.status === 'Rejected' && selectedRequest.rejection_reason" class="spk-rejection-full"><strong>Alasan penolakan</strong><p>{{ selectedRequest.rejection_reason }}</p></div>
        <div v-if="isPending(selectedRequest)" class="spk-detail-actions">
          <AppButton color="danger" @click="openReject(selectedRequest)">Tolak SPK</AppButton>
          <AppButton @click="openApprove(selectedRequest)">Setujui SPK</AppButton>
        </div>
      </div>
    </AppModal>

    <AppModal v-model="approveOpen" title="Setujui pengajuan SPK?" variant="dialog"
      :loading="saving" confirm-text="Ya, setujui" cancel-text="Batal" @confirm="confirmApprove">
      <div class="spk-confirm-copy"><p>SPK <strong>{{ actionRequest?.spk_number }}</strong> akan disetujui.</p><p>Status kavling <strong>{{ actionRequest?.lot_number }}</strong> akan berubah menjadi <strong>Booking</strong>.</p><p>Pastikan data dan dokumen telah diperiksa. Persetujuan tidak dapat dilakukan jika kavling sudah tidak tersedia.</p></div>
    </AppModal>

    <AppModal v-model="rejectOpen" title="Tolak pengajuan SPK" variant="dialog"
      :loading="saving" :confirm-disabled="!rejectionReason.trim()" confirm-text="Tolak SPK" confirm-variant="danger"
      cancel-text="Batal" @confirm="confirmReject">
      <div class="spk-reject-form"><p>Berikan alasan yang jelas agar Marketing mengetahui bagian yang perlu diperbaiki.</p>
        <label>Alasan penolakan <b>*</b><textarea v-model="rejectionReason" rows="4" maxlength="1000" placeholder="Tuliskan alasan penolakan..." /></label>
        <small>{{ rejectionReason.length }}/1000 karakter</small>
      </div>
    </AppModal>

    <AppModal
      v-model="createOpen"
      title="Buat SPK untuk Client"
      variant="bottom-sheet"
      :loading="creating"
      :confirm-disabled="!canSubmitCreate"
      confirm-text="Simpan Pengajuan"
      cancel-text="Batal"
      max-height="92dvh"
      @confirm="submitAdminSPK"
      @cancel="closeCreateForm"
    >
      <form class="spk-create-form" @submit.prevent="submitAdminSPK">
        <p class="spk-create-intro">Admin membantu client membuat pengajuan SPK.</p>
          <section class="spk-form-section">
            <h3>1. Informasi Client</h3>
            <label>Nama lengkap <b>*</b><input v-model.trim="createForm.customer_full_name" required maxlength="150" placeholder="Nama sesuai KTP" /></label>
            <label>Nomor WhatsApp <b>*</b><input v-model.trim="createForm.customer_phone" required inputmode="tel" maxlength="30" placeholder="08xxxxxxxxxx" /></label>
            <label>Email <span>(opsional)</span><input v-model.trim="createForm.customer_email" type="email" placeholder="email@contoh.com" /></label>
            <label>Alamat <b>*</b><textarea v-model.trim="createForm.customer_address" required rows="2" placeholder="Alamat lengkap client" /></label>
          </section>

          <section class="spk-form-section">
            <h3>2. Pilih Kavling</h3>
            <label class="spk-lot-search">Cari kavling
              <input v-model.trim="lotSearchQuery" type="search" placeholder="Cari nomor kavling atau blok" />
            </label>
            <div class="spk-lot-list" role="group" aria-label="Pilih satu atau beberapa kavling">
              <button
                v-for="lot in filteredAvailableLots"
                :key="lot.id"
                type="button"
                class="spk-lot-option"
                :class="{ selected: selectedLotIds.includes(lot.id) }"
                :aria-pressed="selectedLotIds.includes(lot.id)"
                @click="toggleLotSelection(lot.id)"
              >
                <span class="spk-lot-check" aria-hidden="true">{{ selectedLotIds.includes(lot.id) ? '✓' : '' }}</span>
                <span><strong>{{ lot.lot_number }}</strong><small>{{ lot.block_id ? `Blok ID ${lot.block_id}` : 'Tanpa blok' }}</small></span>
                <b>{{ formatCurrency(lotPrice(lot)) }}</b>
              </button>
              <p v-if="!filteredAvailableLots.length" class="spk-lot-empty">Kavling tersedia tidak ditemukan.</p>
            </div>
            <p v-if="selectedCreateLots.length" class="spk-selected-lot">{{ selectedCreateLots.length }} kavling dipilih · Total harga <strong>{{ formatCurrency(createLotPrice) }}</strong></p>
            <!-- Legacy single-lot markup retained temporarily below until removed. -->
            <!--
                <option value="">Pilih kavling</option>
                <option v-for="lot in availableLots" :key="lot.id" :value="String(lot.id)">
                  {{ lot.lot_number }} · {{ lot.block_id ? `Blok ID ${lot.block_id}` : 'Tanpa blok' }} · {{ formatCurrency(Number(lot.promo_price || lot.cash_price || 0)) }}
                </option>
              </select>
            </label>
            <p v-if="selectedCreateLot" class="spk-selected-lot">Harga yang disimpan: <strong>{{ formatCurrency(createLotPrice) }}</strong></p>-->
          </section>

          <section class="spk-form-section">
            <h3>3. Metode Pembayaran</h3>
            <div class="spk-payment-options">
              <label :class="{ chosen: createForm.payment_method === 'Cash' }"><input v-model="createForm.payment_method" type="radio" value="Cash" /> Tunai</label>
              <label :class="{ chosen: createForm.payment_method === 'Installment' }"><input v-model="createForm.payment_method" type="radio" value="Installment" /> Cicilan</label>
            </div>
            <template v-if="createForm.payment_method === 'Installment'">
              <label>Pilih tenor <b>*</b>
                <select v-model="createForm.payment_plan_id" required>
                  <option value="">Pilih paket cicilan</option>
                  <option v-for="plan in createPaymentPlans" :key="plan.id" :value="String(plan.id)">{{ plan.plan_name }} · {{ plan.months }} bulan</option>
                </select>
              </label>
              <label>Nominal cicilan per bulan <b>*</b><input v-model.number="createForm.monthly_payment" type="number" min="1" required placeholder="Masukkan nominal cicilan" /></label>
            </template>
          </section>

          <section class="spk-form-section">
            <h3>4. Dokumen Wajib</h3>
            <p class="spk-required-note">Ketiga dokumen berikut wajib disertakan sebelum SPK dapat disimpan.</p>
            <label class="spk-upload-field">KTP <b>*</b><input type="file" accept="image/*,.pdf" required @change="onCreateFileChange('KTP', $event)" /><small>{{ createFiles.KTP?.name || 'Belum ada file dipilih' }}</small></label>
            <label class="spk-upload-field">Kartu Keluarga (KK) <b>*</b><input type="file" accept="image/*,.pdf" required @change="onCreateFileChange('KK', $event)" /><small>{{ createFiles.KK?.name || 'Belum ada file dipilih' }}</small></label>
            <label class="spk-upload-field">Bukti Pembayaran <b>*</b><input type="file" accept="image/*,.pdf" required @change="onCreateFileChange('Payment Proof', $event)" /><small>{{ createFiles['Payment Proof']?.name || 'Belum ada file dipilih' }}</small></label>
            <label class="spk-upload-field">NPWP <span>(opsional)</span><input type="file" accept="image/*,.pdf" @change="onCreateFileChange('NPWP', $event)" /><small>{{ createFiles.NPWP?.name || 'Belum ada file dipilih' }}</small></label>
          </section>

          <section class="spk-form-section">
            <h3>5. Catatan</h3>
            <textarea v-model.trim="createForm.notes" rows="3" placeholder="Catatan tambahan (opsional)" />
          </section>

          <p v-if="createError" class="spk-create-error" role="alert">{{ createError }}</p>
      </form>
    </AppModal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/vue'
import {
  addOutline, alertCircleOutline, cardOutline, chevronForwardOutline,
  closeOutline, documentTextOutline, eyeOutline, fileTrayOutline, refreshOutline, searchOutline,
} from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import mascotImage from '@/assets/mascot/Curious Mascot Investigates Handshake Files.png'
import {
  approveSPKRequest, getAdminSPKRequests, getAdminSPKStats,
  getSPKDocumentUrl, rejectSPKRequest,
  createAdminSPKRequest, getAvailableLotsForAdmin, getPaymentPlansForAdmin,
  type AdminAvailableLot, type AdminPaymentPlan, type AdminSPKRequest, type SPKDocument, type SPKStatus, type CreateAdminSPKInput,
} from '@/services/Admin/spkAdminService'
import type { SPKDocumentType } from '@/services/marketing/spkService' 
const requests = ref<AdminSPKRequest[]>([])
const loading = ref(false)
const saving = ref(false)
const errorMessage = ref('')
const searchQuery = ref('')
const selectedStatus = ref<'All' | SPKStatus>('All')
const detailOpen = ref(false)
const approveOpen = ref(false)
const rejectOpen = ref(false)
const selectedRequest = ref<AdminSPKRequest | null>(null)
const actionRequest = ref<AdminSPKRequest | null>(null)
const rejectionReason = ref('')
const openingDocumentId = ref<number | null>(null)
const selectedSource = ref<'All' | 'Marketing' | 'Client' | 'Admin'>('All')
const createOpen = ref(false)
const creating = ref(false)
const createError = ref('')
const availableLots = ref<AdminAvailableLot[]>([])
const createPaymentPlans = ref<AdminPaymentPlan[]>([])
const createFiles = reactive<Record<SPKDocumentType, File | null>>({
  KTP: null, KK: null, NPWP: null, 'Payment Proof': null,
})
const createForm = reactive({
  customer_full_name: '',
  customer_phone: '',
  customer_email: '',
  customer_address: '',
  payment_method: 'Cash' as 'Cash' | 'Installment',
  payment_plan_id: '',
  monthly_payment: null as number | null,
  notes: '',
})
const lotSearchQuery = ref('')
const selectedLotIds = ref<number[]>([])
const sourceFilters = [
  { label: 'Semua', value: 'All' as const },
  { label: 'Marketing', value: 'Marketing' as const },
  { label: 'Client', value: 'Client' as const },
  { label: 'Admin', value: 'Admin' as const },
]
const filteredAvailableLots = computed(() => {
  const query = lotSearchQuery.value.trim().toLocaleLowerCase('id-ID')
  if (!query) return availableLots.value
  return availableLots.value.filter((lot) => `${lot.lot_number} ${lot.block_id ?? ''}`.toLocaleLowerCase('id-ID').includes(query))
})
const selectedCreateLots = computed(() => availableLots.value.filter(lot => selectedLotIds.value.includes(lot.id)))
const createLotPrice = computed(() => selectedCreateLots.value.reduce((total, lot) => total + Number(lot.promo_price || lot.cash_price || 0), 0))
const canSubmitCreate = computed(() => Boolean(
  createForm.customer_full_name && createForm.customer_phone && createForm.customer_address &&
  selectedLotIds.value.length > 0 && createFiles.KTP && createFiles.KK && createFiles['Payment Proof'] &&
  (createForm.payment_method === 'Cash' || (createForm.payment_plan_id && Number(createForm.monthly_payment) > 0))
))
watch(() => createForm.payment_method, value => {
  if (value === 'Cash') { createForm.payment_plan_id = ''; createForm.monthly_payment = null }
})

const stats = computed(() => getAdminSPKStats(requests.value))
const statCards = computed(() => [
  { key: 'total' as const, label: 'Semua SPK', filter: 'All' as const },
  { key: 'submitted' as const, label: 'Menunggu', filter: 'Submitted' as const },
  { key: 'approved' as const, label: 'Disetujui', filter: 'Approved' as const },
  { key: 'rejected' as const, label: 'Ditolak', filter: 'Rejected' as const },
])
const statusFilters: { label: string; value: 'All' | SPKStatus }[] = [
  { label: 'Semua', value: 'All' },
  { label: 'Menunggu', value: 'Submitted' },
  { label: 'Ditinjau', value: 'Under Review' },
  { label: 'Disetujui', value: 'Approved' },
  { label: 'Ditolak', value: 'Rejected' },
  { label: 'Dibatalkan', value: 'Cancelled' },
]
const filteredRequests = computed(() => {
  const q = searchQuery.value.trim().toLocaleLowerCase('id-ID')
  return requests.value.filter(row => {
    const matchesStatus = selectedStatus.value === 'All' || row.status === selectedStatus.value
    const matchesSource = selectedSource.value === 'All' || row.submission_source === selectedSource.value
    const haystack = [row.spk_number, row.customer_full_name, row.customer_phone, row.marketing_name, row.lot_number]
      .filter(Boolean).join(' ').toLocaleLowerCase('id-ID')
    return matchesStatus && matchesSource && (!q || haystack.includes(q))
  })
})

async function loadRequests() {
  loading.value = true
  errorMessage.value = ''
  try { requests.value = await getAdminSPKRequests() }
  catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Terjadi kesalahan.' }
  finally { loading.value = false }
}
function isPending(row: AdminSPKRequest) { return row.status === 'Submitted' || row.status === 'Under Review' }
function statusLabel(status: SPKStatus) {
  return ({ Submitted: 'Menunggu', 'Under Review': 'Sedang ditinjau', Approved: 'Disetujui', Rejected: 'Ditolak', Cancelled: 'Dibatalkan' })[status]
}
function documentLabel(type: SPKDocument['document_type']) {
  return type === 'Payment Proof' ? 'Bukti pembayaran' : type
}
function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase()
}
function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0))
}
function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}
function openDetail(row: AdminSPKRequest) { selectedRequest.value = row; detailOpen.value = true }
function openApprove(row: AdminSPKRequest) {
  actionRequest.value = row
  approveOpen.value = true
}
function openReject(row: AdminSPKRequest) {
  actionRequest.value = row
  rejectionReason.value = ''
  rejectOpen.value = true
}
async function openDocument(doc: SPKDocument) {
  openingDocumentId.value = doc.id
  try {
    const url = await getSPKDocumentUrl(doc.file_path)
    window.open(url, '_blank', 'noopener,noreferrer')
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'Dokumen gagal dibuka.'
  } finally { openingDocumentId.value = null }
}
async function confirmApprove() {
  if (!actionRequest.value) return
  saving.value = true
  try {
    await approveSPKRequest(actionRequest.value.id)
    approveOpen.value = false
    detailOpen.value = false
    await loadRequests()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'SPK gagal disetujui.'
  } finally { saving.value = false }
}
async function confirmReject() {
  if (!actionRequest.value || !rejectionReason.value.trim()) return
  saving.value = true
  try {
    await rejectSPKRequest(actionRequest.value.id, rejectionReason.value)
    rejectOpen.value = false
    detailOpen.value = false
    await loadRequests()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'SPK gagal ditolak.'
  } finally { saving.value = false }
}
function sourceLabel(source?: string | null) {
  return source === 'Admin' ? 'Admin' : source === 'Client' ? 'Client' : 'Marketing'
}
async function openCreateForm() {
  createError.value = ''
  createOpen.value = true
  lotSearchQuery.value = ''
  selectedLotIds.value = []
  try {
    const [lots, plans] = await Promise.all([getAvailableLotsForAdmin(), getPaymentPlansForAdmin()])
    availableLots.value = lots
    createPaymentPlans.value = plans
  } catch (error) {
    createError.value = error instanceof Error ? error.message : 'Data kavling atau paket pembayaran gagal dimuat.'
  }
}
function toggleLotSelection(lotId: number) {
  selectedLotIds.value = selectedLotIds.value.includes(lotId)
    ? selectedLotIds.value.filter(id => id !== lotId)
    : [...selectedLotIds.value, lotId]
}
function lotPrice(lot: AdminAvailableLot) {
  return Number(lot.promo_price || lot.cash_price || 0)
}
function closeCreateForm() {
  if (creating.value) return
  createOpen.value = false
  createError.value = ''
}
function onCreateFileChange(type: SPKDocumentType, event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] || null
  if (file && file.size > 5 * 1024 * 1024) {
    createError.value = `Ukuran ${file.name} melebihi batas 5 MB.`
    input.value = ''
    createFiles[type] = null
    return
  }
  createError.value = ''
  createFiles[type] = file
}
async function submitAdminSPK() {
  if (!canSubmitCreate.value || !selectedCreateLots.value.length) {
    createError.value = 'Lengkapi data client, kavling, metode pembayaran, serta KTP, KK, dan bukti pembayaran.'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    const basePayload = {
      customer_full_name: createForm.customer_full_name,
      customer_phone: createForm.customer_phone,
      customer_email: createForm.customer_email || null,
      customer_address: createForm.customer_address,
      payment_method: createForm.payment_method,
      payment_plan_id: createForm.payment_method === 'Installment' ? Number(createForm.payment_plan_id) : null,
      months: createForm.payment_method === 'Installment'
        ? Number(createPaymentPlans.value.find(p => String(p.id) === createForm.payment_plan_id)?.months || 0)
        : null,
      monthly_payment: createForm.payment_method === 'Installment' ? Number(createForm.monthly_payment) : null,
      margin_percent_snapshot: createForm.payment_method === 'Installment'
        ? Number(createPaymentPlans.value.find(p => String(p.id) === createForm.payment_plan_id)?.margin_percent || 0)
        : null,
      notes: createForm.notes || null,
    }
    const docs = (Object.entries(createFiles) as [SPKDocumentType, File | null][])
      .filter((entry): entry is [SPKDocumentType, File] => Boolean(entry[1]))
      .map(([type, file]) => ({ type, file }))
    for (const lot of selectedCreateLots.value) {
      const payload: CreateAdminSPKInput = {
        ...basePayload,
        lot_id: lot.id,
        lot_price_snapshot: lotPrice(lot),
      }
      await createAdminSPKRequest(payload, docs)
    }
    createOpen.value = false
    Object.assign(createForm, {
      customer_full_name: '', customer_phone: '', customer_email: '', customer_address: '',
      payment_method: 'Cash', payment_plan_id: '', monthly_payment: null, notes: '',
    })
    selectedLotIds.value = []
    lotSearchQuery.value = ''
    Object.keys(createFiles).forEach(key => { createFiles[key as SPKDocumentType] = null })
    await loadRequests()
  } catch (error) {
    createError.value = error instanceof Error ? error.message : 'Pengajuan SPK gagal disimpan.'
  } finally {
    creating.value = false
  }
}
onMounted(loadRequests)
</script>

<style scoped>
.admin-spk-page { --background: var(--ion-background-color, #f7f8f5); }
.spk-shell { width: min(100%, 900px); margin: 0 auto; padding: 24px 18px calc(110px + env(safe-area-inset-bottom)); color: var(--ion-text-color, #243126); }
.spk-heading { display:flex; align-items:flex-start; justify-content:space-between; gap:14px; margin-bottom:22px; }
.spk-eyebrow { margin:0 0 6px; color:var(--poliland-gold-text, #966a12); font-size:10px; font-weight:800; letter-spacing:.13em; }
.spk-heading h1 { margin:0; font-size:26px; font-weight:800; letter-spacing:-.04em; }
.spk-subtitle { margin:7px 0 0; color:#788078; font-size:12px; line-height:1.5; }
.spk-refresh { display:flex; align-items:center; gap:6px; border:1px solid #e4e8e1; background:#fff; color:#355a2c; border-radius:12px; padding:10px 12px; font-size:11px; font-weight:700; white-space:nowrap; }
.spk-stats { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:9px; margin-bottom:20px; }
.spk-stat { text-align:left; min-width:0; border:1px solid #e8ebe5; background:#fff; border-radius:15px; padding:13px 12px; color:#69736a; }
.spk-stat span { display:block; font-size:10px; line-height:1.3; }
.spk-stat strong { display:block; margin-top:8px; color:#243126; font-size:23px; font-weight:800; }
.spk-stat-active { border-color:#78936d; box-shadow:0 0 0 2px #355a2c12; }
.spk-toolbar { display:grid; gap:12px; margin-bottom:19px; }
.spk-search { display:flex; align-items:center; gap:9px; min-height:46px; border:1px solid #e5e9e2; border-radius:13px; background:#fff; padding:0 13px; color:#8b948a; }
.spk-search input { flex:1; min-width:0; border:0; outline:0; background:transparent; color:#263329; font:inherit; font-size:12px; }
.spk-search button { border:0; background:transparent; color:#788078; font-size:18px; }
.spk-filters { display:flex; gap:7px; overflow-x:auto; padding-bottom:3px; scrollbar-width:none; }
.spk-filters button { flex:0 0 auto; border:1px solid #e5e9e2; border-radius:999px; background:#fff; color:#6e786e; padding:8px 12px; font-size:10px; font-weight:700; }
.spk-filters button.active { border-color:#355a2c; background:#355a2c; color:#fff; }
.spk-list-head { display:flex; align-items:center; justify-content:space-between; margin:0 2px 11px; }
.spk-list-head h2 { margin:0; font-size:14px; font-weight:800; }
.spk-list-head span { color:#899188; font-size:10px; }
.spk-list { display:grid; gap:11px; }
.spk-card { border:1px solid #e9ece6; border-radius:17px; background:#fff; padding:15px; box-shadow:0 4px 16px #24312608; }
.spk-card-top { display:flex; align-items:flex-start; justify-content:space-between; gap:10px; }
.spk-card-top>div { display:grid; gap:4px; }
.spk-number { color:#355a2c; font-size:12px; font-weight:800; }
.spk-card time { color:#929a91; font-size:10px; }
.spk-status { display:inline-flex; align-items:center; border-radius:999px; padding:6px 9px; font-size:9px; font-weight:800; white-space:nowrap; }
.status-submitted,.status-under-review { background:#fff4d9; color:#91630d; }
.status-approved { background:#e8f4e7; color:#2e6b36; }
.status-rejected { background:#fcebea; color:#a63e38; }
.status-cancelled { background:#eef0ed; color:#687168; }
.spk-person { display:flex; align-items:center; gap:10px; margin:15px 0; }
.spk-avatar { display:grid; place-items:center; width:40px; height:40px; flex:0 0 40px; border-radius:13px; background:#edf3e9; color:#355a2c; font-size:12px; font-weight:800; }
.spk-person-info { display:grid; gap:3px; min-width:0; }
.spk-person-info strong { font-size:13px; }
.spk-person-info span,.spk-person-info small { color:#778176; font-size:10px; }
.spk-card-meta { display:grid; grid-template-columns:repeat(3,minmax(0,1fr)); gap:8px; border-top:1px solid #eff1ed; padding-top:12px; }
.spk-card-meta div { display:grid; gap:4px; min-width:0; }
.spk-card-meta span { color:#929a91; font-size:9px; }
.spk-card-meta strong { overflow-wrap:anywhere; font-size:10px; }
.spk-card-meta small { color:#818a80; font-size:9px; }
.spk-rejection-preview { border-radius:9px; background:#fff4f3; color:#8c3c37; padding:9px; font-size:10px; line-height:1.5; }
.spk-card-actions { display:flex; align-items:center; gap:7px; margin-top:14px; padding-top:11px; border-top:1px solid #eff1ed; }
.spk-card-actions button { display:inline-flex; align-items:center; justify-content:center; gap:5px; border-radius:9px; padding:9px 11px; font-size:10px; font-weight:800; }
.spk-detail-btn { margin-right:auto; border:0; background:transparent; color:#355a2c; padding-left:0!important; }
.spk-reject-btn { border:1px solid #f0d6d4; background:#fff; color:#a63e38; }
.spk-approve-btn { border:1px solid #355a2c; background:#355a2c; color:#fff; }
.spk-state { display:grid; justify-items:center; gap:9px; padding:48px 18px; text-align:center; color:#899188; font-size:12px; }
.spk-state>ion-icon { font-size:27px; }
.spk-state strong { color:#374338; font-size:13px; }
.spk-state p { max-width:320px; margin:0; line-height:1.5; }
.spk-empty-mascot { display:block; width:clamp(180px, 52vw, 260px); height:auto; object-fit:contain; margin:0 auto 4px; }
.spk-error { color:#a63e38; }
.spk-detail { display:grid; gap:17px; padding-bottom:15px; }
.spk-detail-banner { display:flex; justify-content:space-between; align-items:center; gap:10px; border-radius:13px; background:#f3f6f0; padding:13px; }
.spk-detail-banner div { display:grid; gap:4px; }
.spk-detail-banner div span { color:#788276; font-size:10px; }
.spk-detail-banner div strong { color:#355a2c; font-size:14px; }
.spk-detail-section { display:grid; gap:10px; }
.spk-detail-section h3 { margin:0; font-size:13px; font-weight:800; }
.spk-detail-section dl { display:grid; gap:0; margin:0; border:1px solid #edf0eb; border-radius:12px; padding:0 12px; }
.spk-detail-section dl div { display:grid; grid-template-columns: minmax(105px, .8fr) 1.2fr; gap:12px; padding:10px 0; border-bottom:1px solid #f0f2ee; }
.spk-detail-section dl div:last-child { border:0; }
.spk-detail-section dt { color:#899188; font-size:10px; }
.spk-detail-section dd { margin:0; color:#303b31; font-size:11px; font-weight:650; overflow-wrap:anywhere; }
.spk-no-docs { color:#899188; font-size:11px; }
.spk-document { display:flex; align-items:center; gap:10px; border:1px solid #edf0eb; border-radius:12px; padding:10px; }
.spk-doc-icon { display:grid; place-items:center; width:35px; height:35px; border-radius:10px; background:#f1f5ed; color:#355a2c; font-size:18px; }
.spk-doc-info { display:grid; gap:3px; min-width:0; flex:1; }
.spk-doc-info strong { font-size:11px; }
.spk-doc-info span { overflow:hidden; text-overflow:ellipsis; white-space:nowrap; color:#899188; font-size:9px; }
.spk-document button { display:flex; align-items:center; gap:4px; border:0; background:#edf3e9; color:#355a2c; border-radius:8px; padding:8px 10px; font-size:10px; font-weight:800; }
.spk-rejection-full { border-radius:12px; background:#fff3f2; padding:12px; color:#8d3d37; font-size:11px; }
.spk-rejection-full p { margin:6px 0 0; line-height:1.5; }
.spk-detail-actions { display:grid; grid-template-columns:1fr 1fr; gap:9px; padding-top:6px; }
.spk-confirm-copy,.spk-reject-form { color:#626d62; font-size:12px; line-height:1.6; }
.spk-confirm-copy p { margin:0 0 9px; }
.spk-reject-form label { display:grid; gap:7px; margin-top:13px; color:#354135; font-weight:700; }
.spk-reject-form label b { color:#b13d36; }
.spk-reject-form textarea { width:100%; resize:vertical; border:1px solid #dfe5dc; border-radius:10px; padding:11px; color:#263329; background:#fff; font:inherit; font-weight:400; outline-color:#78936d; }
.spk-reject-form small { display:block; text-align:right; color:#929a91; font-size:10px; }
@media (min-width:700px) { .spk-shell { padding:32px 28px 60px; } .spk-stats { gap:13px; } .spk-stat { padding:17px; } .spk-card { padding:19px; } }
@media (max-width:390px) { .spk-shell { padding-inline:13px; } .spk-stats { gap:6px; } .spk-stat { padding:10px 8px; } .spk-stat strong { font-size:20px; } .spk-card-meta { gap:5px; } .spk-card-meta strong { font-size:9px; } }

.spk-heading-actions { display:flex; align-items:center; gap:7px; }
.spk-create-btn { display:flex; align-items:center; gap:6px; border:1px solid #355a2c; background:#355a2c; color:#fff; border-radius:12px; padding:10px 12px; font-size:11px; font-weight:800; white-space:nowrap; }
.spk-create-fab { position:fixed; z-index:20; right:calc(18px + env(safe-area-inset-right)); bottom:calc(88px + env(safe-area-inset-bottom)); display:grid; place-items:center; width:56px; height:56px; padding:0; border:0; border-radius:50%; box-shadow:0 5px 16px #24312640; }
.spk-create-fab ion-icon { font-size:27px; }
.spk-source-filters { display:flex; align-items:center; flex-wrap:wrap; gap:6px; color:#899188; font-size:10px; }
.spk-source-filters button { border:1px solid #e5e9e2; border-radius:999px; background:#fff; color:#6e786e; padding:7px 11px; font-size:10px; font-weight:700; }
.spk-source-filters button.active { border-color:#355a2c; background:#edf3e9; color:#355a2c; }
.spk-create-form { display:grid; gap:17px; }
.spk-create-intro { margin:0; color:var(--text-secondary); font-size:var(--font-size-xs); line-height:1.5; }
.spk-form-section { display:grid; gap:10px; }
.spk-lot-search { display:grid; gap:6px; color:var(--text-primary); font-size:11px; font-weight:700; }
.spk-lot-search input { min-height:44px; border:1px solid var(--border-default); border-radius:var(--radius-control); padding:0 12px; background:var(--surface-primary); color:var(--text-primary); font:inherit; outline:none; }
.spk-lot-search input:focus-visible { border-color:var(--poliland-green); box-shadow:0 0 0 3px color-mix(in srgb,var(--poliland-green) 22%,transparent); }
.spk-lot-list { display:grid; gap:8px; max-height:260px; overflow:auto; padding:2px; }
.spk-lot-option { display:grid; grid-template-columns:24px minmax(0,1fr) auto; align-items:center; gap:9px; width:100%; min-height:58px; border:1px solid var(--border-default); border-radius:var(--radius-control); padding:9px 10px; background:var(--surface-primary); color:var(--text-primary); text-align:left; font:inherit; cursor:pointer; }
.spk-lot-option:hover,.spk-lot-option.selected { border-color:var(--poliland-green); background:var(--status-success-bg); }
.spk-lot-option:focus-visible { outline:3px solid var(--poliland-green); outline-offset:2px; }
.spk-lot-option > span:nth-child(2) { display:grid; min-width:0; gap:3px; }
.spk-lot-option small { color:var(--text-secondary); font-size:10px; }
.spk-lot-option > b { color:var(--text-primary); font-size:10px; text-align:right; white-space:nowrap; }
.spk-lot-check { display:grid; width:24px; height:24px; place-items:center; border:1px solid var(--border-default); border-radius:7px; background:var(--surface-primary); color:var(--poliland-green); font-weight:800; }
.spk-lot-option.selected .spk-lot-check { border-color:var(--poliland-green); background:var(--poliland-green); color:#fff; }
.spk-lot-empty { margin:0; padding:16px; color:var(--text-secondary); font-size:11px; text-align:center; }
.spk-form-section h3 { margin:0; font-size:13px; font-weight:800; color:#2e3b2e; }
.spk-form-section label { display:grid; gap:6px; color:#485448; font-size:11px; font-weight:700; }
.spk-form-section label b { color:#b13d36; }
.spk-form-section label span { color:#929a91; font-weight:400; }
.spk-form-section input:not([type=file]):not([type=radio]),.spk-form-section select,.spk-form-section textarea { width:100%; min-width:0; border:1px solid #dfe5dc; border-radius:10px; padding:11px; background:#fff; color:#263329; font:inherit; font-weight:400; outline-color:#78936d; }
.spk-form-section textarea { resize:vertical; }
.spk-payment-options { display:grid; grid-template-columns:1fr 1fr; gap:8px; }
.spk-payment-options label { display:flex; align-items:center; gap:8px; border:1px solid #e2e8de; border-radius:10px; padding:11px; }
.spk-payment-options label.chosen { border-color:#55784b; background:#f1f6ee; color:#355a2c; }
.spk-selected-lot { margin:0; color:#6d786c; font-size:11px; }
.spk-required-note { margin:0; color:#788276; font-size:10px; line-height:1.5; }
.spk-upload-field { border:1px dashed #cfd8ca; border-radius:11px; padding:11px; }
.spk-upload-field input { width:100%; font-size:10px; }
.spk-upload-field small { color:#8a9488; font-weight:400; }
.spk-create-error { margin:0; border-radius:10px; background:#fff1f0; color:#a63e38; padding:10px; font-size:11px; line-height:1.5; }
@media (max-width:390px) { .spk-refresh { justify-content:center; } .spk-create-fab { right:calc(14px + env(safe-area-inset-right)); bottom:calc(84px + env(safe-area-inset-bottom)); } }
</style>
