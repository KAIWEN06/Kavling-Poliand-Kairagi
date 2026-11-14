<template>
  <ion-page class="team-page">
    <AppHeader
      variant="admin"
      title="PoliLand Kairagi"
      :show-back="false"
    />

    <ion-content :fullscreen="true">
      <main class="team-shell">
        <router-link
          v-if="!selectedMarketing && currentRole === 'admin'"
          to="/admin/lainnya"
          class="back-button page-back-button"
        >
          <ion-icon :icon="arrowBackOutline" />
          <span>Kembali</span>
        </router-link>

        <template v-if="selectedMarketing">
          <div class="detail-topbar">
            <button class="back-button" type="button" @click="closeMarketingDetail">
              <ion-icon :icon="arrowBackOutline" />
              <span>Kembali ke Akses Tim</span>
            </button>
          </div>

          <section class="detail-heading">
            <div class="avatar avatar--large">
              <img v-if="selectedMarketing.photo_url" :src="selectedMarketing.photo_url" alt="" />
              <span v-else>{{ initials(selectedMarketing) }}</span>
            </div>
            <div class="detail-heading__copy">
              <p class="eyebrow">Detail anggota Marketing</p>
              <h1>{{ selectedMarketing.full_name || 'Tanpa nama' }}</h1>
              <p>{{ selectedMarketing.email || 'Email tidak tersedia' }}</p>
              <span :class="['status-pill', selectedMarketing.is_active ? 'is-active' : 'is-inactive']">
                {{ selectedMarketing.is_active ? 'Aktif' : 'Nonaktif' }}
              </span>
            </div>
          </section>

          <section class="profile-information">
            <div><span>Nomor telepon</span><strong>{{ selectedMarketing.phone || 'Belum diisi' }}</strong></div>
            <div><span>Nomor WhatsApp</span><strong>{{ selectedMarketing.whatsapp_phone || 'Belum diisi' }}</strong></div>
            <div><span>Alamat</span><strong>{{ selectedMarketing.address || 'Belum diisi' }}</strong></div>
            <div><span>Tanggal bergabung</span><strong>{{ formatDate(selectedMarketing.join_date) }}</strong></div>
          </section>

          <section class="section-block">
            <div class="section-heading section-heading--filter">
              <div>
                <p class="eyebrow">Ringkasan kinerja</p>
                <h2>Performa Marketing</h2>
              </div>
              <select v-model="detailPeriod" aria-label="Periode performa" @change="loadMarketingDetail">
                <option value="30d">30 hari</option>
                <option value="90d">3 bulan</option>
                <option value="180d">6 bulan</option>
                <option value="all">Semua waktu</option>
              </select>
            </div>

            <p v-if="detailLoading" class="state-card">Memuat data performa...</p>
            <p v-else-if="detailError" class="state-card state-card--error" role="alert">{{ detailError }}</p>
            <template v-else-if="marketingDetail">
              <div class="metric-grid">
                <article class="metric-card"><span>Total client</span><strong>{{ number(marketingDetail.metrics.total_clients) }}</strong><small>Seluruh client terdaftar</small></article>
                <article class="metric-card"><span>Client baru</span><strong>{{ number(marketingDetail.metrics.new_clients) }}</strong><small>Sesuai periode</small></article>
                <article class="metric-card"><span>Client terjual</span><strong>{{ number(marketingDetail.metrics.sold_clients) }}</strong><small>Client unik dengan transaksi Sold</small></article>
                <article class="metric-card"><span>Kavling terjual</span><strong>{{ number(marketingDetail.metrics.sold_lots) }}</strong><small>Lot unik berstatus Sold</small></article>
                <article class="metric-card metric-card--wide"><span>Nilai penjualan</span><strong>{{ currency(marketingDetail.metrics.sales_value) }}</strong><small>Akumulasi final_price transaksi Sold</small></article>
              </div>

              <div class="conversion-card">
                <div class="conversion-card__heading"><span>Konversi client</span><strong>{{ marketingDetail.metrics.conversion_rate }}%</strong></div>
                <div class="progress-track"><span :style="{ width: `${Math.min(100, marketingDetail.metrics.conversion_rate)}%` }"></span></div>
                <small>Client unik bertransaksi Sold dibandingkan seluruh client yang dibawa Marketing ini.</small>
              </div>

              <div class="transaction-summary">
                <div><span>Transaksi Booking</span><strong>{{ number(marketingDetail.metrics.booking_transactions) }}</strong></div>
                <div><span>Transaksi Batal</span><strong>{{ number(marketingDetail.metrics.cancelled_transactions) }}</strong></div>
              </div>

              <div class="commission-section">
                <div class="section-heading"><div><p class="eyebrow">Ringkasan komisi</p><h2>Komisi Marketing</h2></div></div>
                <div class="commission-total"><span>Total komisi periode ini</span><strong>{{ currency(marketingDetail.metrics.total_commission) }}</strong></div>
                <div class="commission-breakdown">
                  <div><span>Belum dibayarkan</span><strong>{{ currency(marketingDetail.metrics.pending_commission) }}</strong></div>
                  <div><span>Sudah dibayarkan</span><strong>{{ currency(marketingDetail.metrics.paid_commission) }}</strong></div>
                </div>
                <p class="helper-text">Komisi dihitung dari tabel marketing_commissions. Status Cancelled tidak dimasukkan ke total.</p>
              </div>
            </template>
          </section>

          <section class="section-block">
            <div class="section-heading"><div><p class="eyebrow">Portofolio</p><h2>Client yang ditangani</h2></div><span class="count-pill">{{ marketingDetail?.clients.length || 0 }} client</span></div>
            <p v-if="detailLoading" class="state-card">Memuat daftar client...</p>
            <p v-else-if="!marketingDetail?.clients.length" class="state-card">Belum ada client yang terhubung dengan Marketing ini.</p>
            <div v-else class="client-list">
              <article v-for="client in marketingDetail.clients" :key="client.id" class="client-card">
                <div class="client-card__top">
                  <div class="client-avatar">{{ initials({ full_name: client.full_name, email: client.email }) }}</div>
                  <div class="client-card__identity"><strong>{{ client.full_name }}</strong><span>{{ client.phone || client.email || 'Kontak belum tersedia' }}</span><small>Terdaftar {{ formatDate(client.created_at) }}</small></div>
                </div>
                <div v-if="client.transactions.length" class="client-transactions">
                  <div v-for="transaction in client.transactions" :key="transaction.id" class="transaction-row">
                    <div><strong>{{ transaction.lot_number || `Kavling #${transaction.lot_id}` }}</strong><small>{{ transaction.payment_type === 'Installment' ? 'Cicilan' : 'Cash' }} · {{ currency(transaction.final_price) }}</small></div>
                    <span :class="['transaction-status', transaction.status.toLowerCase()]">{{ transactionStatus(transaction.status) }}</span>
                  </div>
                </div>
                <p v-else class="no-transaction">Belum memiliki transaksi.</p>
              </article>
            </div>
          </section>

          <section class="section-block">
            <div class="section-heading"><div><p class="eyebrow">Riwayat pembayaran komisi</p><h2>Daftar komisi</h2></div></div>
            <p v-if="!marketingDetail?.commissions.length" class="state-card">Belum ada catatan komisi.</p>
            <div v-else class="commission-list">
              <article v-for="commission in marketingDetail.commissions" :key="commission.id" class="commission-row">
                <div><strong>{{ commission.commission_type === 'Sales' ? 'Komisi Penjualan' : 'Komisi Booking Fee' }}</strong><small>{{ commission.customer_name || 'Client tidak tersedia' }} · {{ commission.lot_number || 'Kavling tidak tersedia' }}</small><small>{{ formatDate(commission.created_at) }}</small></div>
                <div class="commission-row__amount"><strong>{{ currency(commission.commission_amount) }}</strong><span :class="['commission-status', commission.status.toLowerCase()]">{{ commissionStatus(commission.status) }}</span></div>
              </article>
            </div>
          </section>
        </template>

        <template v-else>
          <header class="page-heading">
            <div>
              <h1>Kelola Anggota</h1>
            </div>
            <AppButton v-if="canCreate" variant="primary" size="medium" @click="openCreate">
              <ion-icon :icon="addOutline" slot="start" />Tambah Anggota
            </AppButton>
          </header>

          <section class="team-stats" aria-label="Ringkasan anggota">
            <article><span>Total anggota</span><strong>{{ number(members.length) }}</strong></article>
            <article><span>Aktif</span><strong>{{ number(activeCount) }}</strong></article>
            <article><span>Nonaktif</span><strong>{{ number(inactiveCount) }}</strong></article>
          </section>

          <div class="team-tabs" role="tablist" aria-label="Jenis anggota">
            <button type="button" role="tab" :aria-selected="activeTab === 'owner'" :class="{ selected: activeTab === 'owner' }" @click="activeTab = 'owner'">
              Owner <span>{{ ownerMembers.length }}</span>
            </button>
            <button type="button" role="tab" :aria-selected="activeTab === 'marketing'" :class="{ selected: activeTab === 'marketing' }" @click="activeTab = 'marketing'">
              Marketing <span>{{ marketingMembers.length }}</span>
            </button>
          </div>

          <section class="filters" aria-label="Pencarian dan filter anggota">
            <label class="search-field"><span>Pencarian</span><div><ion-icon :icon="searchOutline" /><input v-model="query" type="search" placeholder="Cari nama atau email..." /></div></label>
            <label><span>Status</span><select v-model="statusFilter"><option value="all">Semua status</option><option value="active">Aktif</option><option value="inactive">Nonaktif</option></select></label>
            <label v-if="activeTab === 'marketing'"><span>Performa</span><select v-model="overviewPeriod" @change="loadOverview"><option value="30d">30 hari</option><option value="90d">3 bulan</option><option value="180d">6 bulan</option><option value="all">Semua waktu</option></select></label>
          </section>

          <p v-if="loading" class="state-card">Memuat anggota tim...</p>
          <div v-else-if="pageError" class="state-card state-card--error" role="alert"><p>{{ pageError }}</p><button type="button" @click="load">Coba lagi</button></div>
          <template v-else>
            <section v-if="activeTab === 'owner'" class="member-section">
              <div class="section-heading"><div><p class="eyebrow">Akses tingkat tertinggi</p><h2>Daftar Owner</h2></div></div>
              <p v-if="visibleOwners.length === 0" class="state-card">Belum ada akun Owner yang sesuai dengan filter.</p>
              <div v-else class="member-list">
                <article v-for="member in visibleOwners" :key="member.id" class="member-card">
                  <div class="avatar"><img v-if="member.photo_url" :src="member.photo_url" alt="" /><span v-else>{{ initials(member) }}</span></div>
                  <div class="member-main"><strong>{{ member.full_name || 'Tanpa nama' }}</strong><span>{{ member.email || 'Email tidak tersedia' }}</span><small>{{ member.phone || 'Nomor telepon belum diisi' }}</small></div>
                  <div class="member-meta"><span class="role-pill role-pill--owner">Owner</span><span :class="['status-pill', member.is_active ? 'is-active' : 'is-inactive']">{{ member.is_active ? 'Aktif' : 'Nonaktif' }}</span></div>
                </article>
              </div>

              <template v-if="currentRole === 'owner'">
                <div class="section-heading admin-subheading"><div><p class="eyebrow">Akun operasional</p><h2>Daftar Admin</h2></div><span class="count-pill">{{ adminMembers.length }}</span></div>
                <p v-if="visibleAdmins.length === 0" class="state-card">Belum ada akun Admin yang sesuai dengan filter.</p>
                <div v-else class="member-list">
                  <article v-for="member in visibleAdmins" :key="member.id" class="member-card">
                    <div class="avatar"><span>{{ initials(member) }}</span></div>
                    <div class="member-main"><strong>{{ member.full_name || 'Tanpa nama' }}</strong><span>{{ member.email || 'Email tidak tersedia' }}</span><small>Admin PoliLand</small></div>
                    <div class="member-meta"><span class="role-pill">Admin</span><span :class="['status-pill', member.is_active ? 'is-active' : 'is-inactive']">{{ member.is_active ? 'Aktif' : 'Nonaktif' }}</span><button v-if="canManage(member)" class="text-action" type="button" :disabled="processingId === member.id" @click="toggleActive(member)">{{ member.is_active ? 'Nonaktifkan' : 'Aktifkan' }}</button></div>
                  </article>
                </div>
              </template>
            </section>

            <section v-else class="member-section">
              <div class="section-heading"><div><p class="eyebrow">Tim pemasaran</p><h2>Performa Marketing</h2><p class="section-description">Pilih anggota untuk melihat client, transaksi, dan komisinya.</p></div></div>
              <p v-if="overviewLoading" class="state-card">Menghitung performa Marketing...</p>
              <p v-else-if="visibleMarketing.length === 0" class="state-card">Belum ada Marketing yang sesuai dengan filter.</p>
              <div v-else class="member-list">
                <article v-for="member in visibleMarketing" :key="member.id" class="marketing-card">
                  <div class="marketing-card__identity">
                    <div class="avatar"><img v-if="member.photo_url" :src="member.photo_url" alt="" /><span v-else>{{ initials(member) }}</span></div>
                    <div class="member-main"><strong>{{ member.full_name || 'Tanpa nama' }}</strong><span>{{ member.email || 'Email tidak tersedia' }}</span><small>{{ member.whatsapp_phone ? `WhatsApp: ${member.whatsapp_phone}` : (member.phone || 'Kontak belum diisi') }}</small></div>
                    <span :class="['status-pill', member.is_active ? 'is-active' : 'is-inactive']">{{ member.is_active ? 'Aktif' : 'Nonaktif' }}</span>
                  </div>
                  <div class="marketing-metrics">
                    <div><strong>{{ number(summaryFor(member.id).total_clients) }}</strong><span>Client</span></div>
                    <div><strong>{{ number(summaryFor(member.id).sold_lots) }}</strong><span>Kavling terjual</span></div>
                    <div><strong>{{ currencyCompact(summaryFor(member.id).sales_value) }}</strong><span>Nilai penjualan</span></div>
                  </div>
                  <div class="marketing-card__footer">
                    <span>Konversi {{ conversionRate(summaryFor(member.id)) }}%</span>
                    <div class="marketing-card__actions">
                      <button v-if="canManage(member)" class="text-action" type="button" @click="openEditMarketing(member)">Edit</button>
                      <button v-if="canManage(member)" class="text-action" type="button" :disabled="processingId === member.id" @click="toggleActive(member)">{{ member.is_active ? 'Nonaktifkan' : 'Aktifkan' }}</button>
                      <button class="detail-action" type="button" @click="openMarketingDetail(member)">Lihat Detail <ion-icon :icon="chevronForwardOutline" /></button>
                    </div>
                  </div>
                </article>
              </div>
            </section>
          </template>

          <p v-if="notice" class="notice" role="status">{{ notice }}</p>
        </template>
      </main>
    </ion-content>

    <MobileTabBar v-if="currentRole === 'admin'" variant="admin" />

    <AppModal
      v-model="createOpen"
      :title="`Tambah ${roleLabel(form.role)}`"
      :confirm-text="`Buat akun ${roleLabel(form.role)}`"
      :loading="saving"
      @confirm="createMember"
    >
      <form class="create-form" @submit.prevent>
        <label class="form-label">Jenis akun
          <select v-model="form.role" :disabled="saving"><option v-for="role in availableCreateRoles" :key="role" :value="role">{{ roleLabel(role) }}</option></select>
        </label>
        <div v-if="form.role === 'owner'" class="security-note"><strong>Perhatian: akun Owner</strong><p>Owner memiliki hak akses tertinggi. Akun Owner yang sudah ada tidak dapat diubah atau dinonaktifkan melalui halaman ini.</p></div>
        <div v-if="form.role === 'admin'" class="security-note"><strong>Perhatian: akun Admin</strong><p>Admin dapat membuat Owner dan mengelola Marketing, tetapi tidak dapat mengelola akun Admin atau Owner yang sudah ada.</p></div>
        <AppInput v-model="form.fullName" label="Nama lengkap" required />
        <AppInput v-model="form.email" label="Email" type="email" required />
        <template v-if="form.role === 'marketing'">
          <AppInput v-model="form.phone" label="Nomor telepon" type="tel" />
          <AppInput v-model="form.whatsappPhone" label="Nomor WhatsApp" type="tel" />
          <AppInput v-model="form.address" label="Alamat" />
          <label class="form-label date-field">
            Tanggal bergabung
            <input v-model="form.joinDate" type="date" :disabled="saving" />
          </label>
        </template>
        <AppInput v-model="form.password" label="Password awal" type="password" required />
        <AppInput v-model="form.confirmPassword" label="Konfirmasi password" type="password" required />
        <p v-if="formError" class="form-error" role="alert">{{ formError }}</p>
      </form>
    </AppModal>

    <AppModal
      v-model="editOpen"
      title="Edit Data Marketing"
      confirm-text="Simpan Perubahan"
      :loading="editSaving"
      @confirm="saveMarketing"
    >
      <form class="create-form" @submit.prevent>
        <p class="edit-description">Perbarui informasi anggota Marketing. Perubahan akan disimpan ke profil dan data Marketing.</p>
        <AppInput v-model="editForm.fullName" label="Nama lengkap" required />
        <AppInput v-model="editForm.phone" label="Nomor telepon" type="tel" />
        <AppInput v-model="editForm.whatsappPhone" label="Nomor WhatsApp" type="tel" />
        <AppInput v-model="editForm.address" label="Alamat" />
        <label class="form-label date-field">
          Tanggal bergabung
          <input v-model="editForm.joinDate" type="date" :disabled="editSaving" />
        </label>
        <p v-if="editError" class="form-error" role="alert">{{ editError }}</p>
      </form>
    </AppModal>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { IonContent, IonIcon, IonPage } from '@ionic/vue'
import { addOutline, arrowBackOutline, chevronForwardOutline, searchOutline } from 'ionicons/icons'

import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import AppModal from '@/components/ui/AppModal.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import { authService, type UserRole } from '@/services/auth/authService'
import {
  teamManagementService,
  type CreateTeamMemberInput,
  type MarketingDetail,
  type MarketingPeriod,
  type MarketingSummary,
  type TeamMember,
  type TeamRole,
} from '@/services/teamManagementService'

const members = ref<TeamMember[]>([])
const summaries = ref<MarketingSummary[]>([])
const marketingDetail = ref<MarketingDetail | null>(null)
const selectedMarketing = ref<TeamMember | null>(null)
const currentRole = ref<UserRole | null>(null)
const activeTab = ref<'owner' | 'marketing'>('owner')
const overviewPeriod = ref<MarketingPeriod>('all')
const detailPeriod = ref<MarketingPeriod>('all')
const query = ref('')
const statusFilter = ref<'all' | 'active' | 'inactive'>('all')
const loading = ref(true)
const overviewLoading = ref(false)
const detailLoading = ref(false)
const saving = ref(false)
const createOpen = ref(false)
const editOpen = ref(false)
const editSaving = ref(false)
const editError = ref('')
const editingMarketing = ref<TeamMember | null>(null)
const pageError = ref('')
const detailError = ref('')
const formError = ref('')
const notice = ref('')
const processingId = ref<string | null>(null)

const form = reactive({
  role: 'marketing' as TeamRole,
  fullName: '',
  email: '',
  phone: '',
  whatsappPhone: '',
  address: '',
  employeeCode: '',
  joinDate: '',
  password: '',
  confirmPassword: '',
})

const editForm = reactive({
  fullName: '',
  phone: '',
  whatsappPhone: '',
  address: '',
  joinDate: '',
})

const canCreate = computed(() => currentRole.value === 'owner' || currentRole.value === 'admin')
const availableCreateRoles = computed<TeamRole[]>(() => currentRole.value === 'owner' ? ['owner', 'admin', 'marketing'] : currentRole.value === 'admin' ? ['owner', 'marketing'] : [])
const ownerMembers = computed(() => members.value.filter((member) => member.role === 'owner'))
const adminMembers = computed(() => members.value.filter((member) => member.role === 'admin'))
const marketingMembers = computed(() => members.value.filter((member) => member.role === 'marketing'))
const activeCount = computed(() => members.value.filter((member) => member.is_active).length)
const inactiveCount = computed(() => members.value.length - activeCount.value)

function matches(member: TeamMember) {
  const keyword = query.value.trim().toLowerCase()
  const haystack = [member.full_name, member.email, member.phone, member.whatsapp_phone].filter(Boolean).join(' ').toLowerCase()
  return haystack.includes(keyword) && (statusFilter.value === 'all' || (statusFilter.value === 'active' ? member.is_active : !member.is_active))
}
const visibleOwners = computed(() => ownerMembers.value.filter(matches))
const visibleAdmins = computed(() => adminMembers.value.filter(matches))
const visibleMarketing = computed(() => marketingMembers.value.filter(matches))

function roleLabel(role: TeamRole) { return ({ owner: 'Owner', admin: 'Admin', marketing: 'Marketing' })[role] }
function initials(member: { full_name?: string | null; email?: string | null }) {
  return (member.full_name || member.email || '?').trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0)).join('').toUpperCase()
}
function number(value: number) { return new Intl.NumberFormat('id-ID').format(value || 0) }
function currency(value: number) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(value || 0) }
function currencyCompact(value: number) {
  const amount = value || 0
  if (amount >= 1_000_000_000) return `Rp${(amount / 1_000_000_000).toFixed(1).replace('.', ',')} M`
  if (amount >= 1_000_000) return `Rp${(amount / 1_000_000).toFixed(1).replace('.', ',')} jt`
  return currency(amount)
}
function formatDate(value: string | null | undefined) {
  if (!value) return 'Belum diisi'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Belum diisi'
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(date)
}
function transactionStatus(status: string) {
  return ({ Booking: 'Booking', Sold: 'Terjual', Cancelled: 'Dibatalkan' } as Record<string, string>)[status] || status
}
function commissionStatus(status: string) {
  return ({ Pending: 'Menunggu', Eligible: 'Memenuhi syarat', Processing: 'Diproses', Paid: 'Dibayarkan', Cancelled: 'Dibatalkan' } as Record<string, string>)[status] || status
}
function summaryFor(id: string): MarketingSummary {
  return summaries.value.find((item) => item.marketing_id === id) || {
    marketing_id: id, total_clients: 0, sold_clients: 0, sold_lots: 0, sales_value: 0,
    booking_transactions: 0, pending_commission: 0, paid_commission: 0,
  }
}
function conversionRate(summary: MarketingSummary) {
  return summary.total_clients ? Math.round((summary.sold_clients / summary.total_clients) * 100) : 0
}
function canManage(member: TeamMember) {
  if (member.role === 'owner') return false
  if (currentRole.value === 'owner') return member.role === 'admin' || member.role === 'marketing'
  return currentRole.value === 'admin' && member.role === 'marketing'
}

async function loadOverview() {
  if (!marketingMembers.value.length) { summaries.value = []; return }
  overviewLoading.value = true
  try {
    summaries.value = await teamManagementService.getMarketingOverview(overviewPeriod.value)
  } catch (cause) {
    pageError.value = cause instanceof Error ? cause.message : 'Ringkasan Marketing gagal dimuat.'
  } finally {
    overviewLoading.value = false
  }
}

async function load() {
  loading.value = true
  pageError.value = ''
  notice.value = ''
  try {
    const user = await authService.getCurrentUser()
    if (!user) throw new Error('Sesi login tidak ditemukan. Silakan login kembali.')
    currentRole.value = await authService.getUserRole(user.id)
    if (currentRole.value !== 'owner' && currentRole.value !== 'admin') throw new Error('Anda tidak memiliki akses ke halaman ini.')
    members.value = await teamManagementService.list()
    await loadOverview()
  } catch (cause) {
    pageError.value = cause instanceof Error ? cause.message : 'Data anggota gagal dimuat.'
  } finally {
    loading.value = false
  }
}

async function openMarketingDetail(member: TeamMember) {
  selectedMarketing.value = member
  marketingDetail.value = null
  detailError.value = ''
  detailPeriod.value = overviewPeriod.value
  await loadMarketingDetail()
}
function closeMarketingDetail() {
  selectedMarketing.value = null
  marketingDetail.value = null
  detailError.value = ''
}
async function loadMarketingDetail() {
  if (!selectedMarketing.value) return
  detailLoading.value = true
  detailError.value = ''
  try {
    marketingDetail.value = await teamManagementService.getMarketingDetail(selectedMarketing.value.id, detailPeriod.value)
    selectedMarketing.value = marketingDetail.value.member
  } catch (cause) {
    detailError.value = cause instanceof Error ? cause.message : 'Detail Marketing gagal dimuat.'
  } finally {
    detailLoading.value = false
  }
}

function openEditMarketing(member: TeamMember) {
  if (!canManage(member) || member.role !== 'marketing') return

  editingMarketing.value = member
  editError.value = ''
  Object.assign(editForm, {
    fullName: member.full_name || '',
    phone: member.phone || '',
    whatsappPhone: member.whatsapp_phone || '',
    address: member.address || '',
    joinDate: member.join_date || '',
  })
  editOpen.value = true
}

async function saveMarketing() {
  const member = editingMarketing.value
  if (!member || editSaving.value) return

  if (!editForm.fullName.trim()) {
    editError.value = 'Nama lengkap wajib diisi.'
    return
  }

  const phone = editForm.phone.trim()
  const whatsappPhone = editForm.whatsappPhone.trim()
  const isValidIndonesianMobile = (value: string) => {
    if (!value) return true
    const normalized = value.replace(/[\s().-]/g, '')
    return /^(?:\+?62|0)8\d{7,11}$/.test(normalized)
  }

  if (!isValidIndonesianMobile(phone)) {
    editError.value = 'Nomor telepon harus menggunakan format Indonesia, contoh 081234567890 atau 6281234567890.'
    return
  }

  if (!isValidIndonesianMobile(whatsappPhone)) {
    editError.value = 'Nomor WhatsApp harus menggunakan format Indonesia, contoh 081234567890 atau 6281234567890.'
    return
  }

  editSaving.value = true
  editError.value = ''

  try {
    await teamManagementService.update(member.id, {
      full_name: editForm.fullName.trim(),
      phone: phone || null,
      whatsapp_phone: whatsappPhone || null,
      address: editForm.address.trim() || null,
      join_date: editForm.joinDate || null,
    })

    editOpen.value = false
    notice.value = `Data Marketing ${editForm.fullName.trim()} berhasil diperbarui.`
    await load()

    if (selectedMarketing.value?.id === member.id) {
      const updatedMember = members.value.find((item) => item.id === member.id)
      if (updatedMember) selectedMarketing.value = updatedMember
      await loadMarketingDetail()
    }
  } catch (cause) {
    editError.value = cause instanceof Error ? cause.message : 'Data Marketing gagal diperbarui.'
  } finally {
    editSaving.value = false
  }
}

function resetForm() {
  Object.assign(form, {
    role: availableCreateRoles.value.includes('marketing') ? 'marketing' : availableCreateRoles.value[0] || 'marketing',
    fullName: '', email: '', phone: '', whatsappPhone: '', address: '', employeeCode: '', joinDate: '', password: '', confirmPassword: '',
  })
}
function openCreate() {
  formError.value = ''
  resetForm()
  createOpen.value = true
}
function validateForm() {
  if (!form.fullName.trim()) return 'Nama lengkap wajib diisi.'
  if (!form.email.trim()) return 'Email wajib diisi.'
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Format email tidak valid.'
  if (form.password.length < 8 || form.password.length > 128) return 'Password harus berisi 8 sampai 128 karakter.'
  if (form.password !== form.confirmPassword) return 'Password dan konfirmasi password tidak sama.'
  if (!availableCreateRoles.value.includes(form.role)) return 'Anda tidak memiliki izin membuat role tersebut.'
  return ''
}
async function createMember() {
  if (saving.value) return
  formError.value = validateForm()
  if (formError.value) return
  if (form.role === 'owner' && !window.confirm('Anda akan membuat akun Owner dengan hak akses tertinggi. Pastikan identitas dan email benar. Lanjutkan?')) return
  if (form.role === 'admin' && !window.confirm('Anda akan membuat akun Admin baru. Lanjutkan?')) return
  saving.value = true
  try {
    const payload: CreateTeamMemberInput = {
      role: form.role,
      fullName: form.fullName.trim(),
      email: form.email.trim(),
      password: form.password,
      ...(form.role === 'marketing' ? {
        phone: form.phone.trim() || undefined,
        whatsappPhone: form.whatsappPhone.trim() || undefined,
        address: form.address.trim() || undefined,
        employeeCode: form.employeeCode.trim() || undefined,
        joinDate: form.joinDate || undefined,
      } : {}),
    }
    await teamManagementService.create(payload)
    createOpen.value = false
    notice.value = `Akun ${roleLabel(form.role)} berhasil dibuat.`
    await load()
  } catch (cause) {
    formError.value = cause instanceof Error ? cause.message : 'Akun gagal dibuat.'
  } finally {
    saving.value = false
  }
}
async function toggleActive(member: TeamMember) {
  if (processingId.value || !canManage(member)) return
  const action = member.is_active ? 'menonaktifkan' : 'mengaktifkan'
  if (!window.confirm(`Yakin ingin ${action} akun ${member.full_name || member.email}?`)) return
  processingId.value = member.id
  pageError.value = ''
  notice.value = ''
  try {
    await teamManagementService.setActive(member.id, !member.is_active)
    notice.value = `Akun ${member.full_name || 'anggota'} berhasil ${member.is_active ? 'dinonaktifkan' : 'diaktifkan'}.`
    await load()
  } catch (cause) {
    pageError.value = cause instanceof Error ? cause.message : 'Status akun gagal diperbarui.'
  } finally {
    processingId.value = null
  }
}

onMounted(load)
</script>

<style scoped>
.team-page { color: var(--text-primary); font-family: var(--font-primary); }
.team-shell { min-height: 100%; padding: 20px 16px calc(112px + env(safe-area-inset-bottom)); background: var(--app-background); }
.page-heading { display: flex; flex-direction: column; align-items: stretch; gap: 14px; margin-bottom: 18px; }
.page-heading h1, .detail-heading h1 { margin: 0; color: var(--text-primary); font-size: 23px; font-weight: 700; letter-spacing: -0.035em; }
.page-heading p:last-child { margin: 5px 0 0; color: var(--text-secondary); font-size: 12px; line-height: 1.5; }
.eyebrow { margin: 0 0 4px; color: var(--poliland-green); font-size: 10px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; }
.page-heading :deep(ion-button), .page-heading :deep(button) { width: 100%; min-height: 44px; }
.team-stats { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 8px; margin-bottom: 18px; }
.team-stats article { min-width: 0; padding: 12px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.team-stats span, .team-stats strong { display: block; }
.team-stats span { color: var(--text-secondary); font-size: 10px; }
.team-stats strong { margin-top: 7px; font-size: 23px; font-weight: 700; }
.team-tabs { display: grid; grid-template-columns: 1fr 1fr; gap: 5px; padding: 4px; margin-bottom: 16px; border: 1px solid var(--border-default); border-radius: 14px; background: var(--surface-muted); }
.team-tabs button { display: flex; justify-content: center; align-items: center; gap: 7px; min-height: 42px; border: 0; border-radius: 10px; background: transparent; color: var(--text-secondary); font: inherit; font-size: 12px; font-weight: 600; }
.team-tabs button.selected { background: var(--surface-primary); color: var(--poliland-green); box-shadow: 0 1px 3px rgb(0 0 0 / 7%); }
.team-tabs button span, .count-pill { padding: 2px 7px; border-radius: 20px; background: var(--surface-muted); color: var(--text-secondary); font-size: 10px; }
.filters { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px; }
.filters label, .form-label { display: grid; gap: 6px; color: var(--text-secondary); font-size: 10px; font-weight: 600; }
.search-field { grid-column: 1 / -1; }
.search-field > div { display: flex; align-items: center; gap: 8px; min-height: 44px; padding: 0 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-secondary); }
.search-field input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 12px; }
.filters select, .form-label select, .section-heading select { width: 100%; min-height: 44px; padding: 0 10px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 11px; }
.member-section, .section-block { margin-top: 20px; }
.section-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-bottom: 12px; }
.section-heading h2 { margin: 0; color: var(--text-primary); font-size: 16px; font-weight: 700; }
.section-description { margin: 4px 0 0; color: var(--text-secondary); font-size: 11px; line-height: 1.45; }
.admin-subheading { margin-top: 25px; }
.member-list, .client-list, .commission-list { display: grid; gap: 10px; }
.member-card, .marketing-card, .client-card, .commission-row { min-width: 0; padding: 13px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.member-card { display: grid; grid-template-columns: 42px minmax(0,1fr); gap: 10px; align-items: start; }
.avatar, .client-avatar { display: grid; width: 42px; height: 42px; flex: 0 0 auto; place-items: center; overflow: hidden; border-radius: 50%; background: #E8EEE5; color: var(--poliland-green); font-size: 13px; font-weight: 700; }
.avatar img { width: 100%; height: 100%; object-fit: cover; }
.member-main { min-width: 0; display: grid; gap: 3px; }
.member-main strong { overflow: hidden; color: var(--text-primary); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.member-main span, .member-main small { overflow: hidden; color: var(--text-secondary); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.member-meta { grid-column: 1 / -1; display: flex; align-items: center; gap: 7px; flex-wrap: wrap; }
.role-pill, .status-pill { display: inline-flex; align-items: center; min-height: 24px; padding: 3px 8px; border-radius: 20px; background: var(--surface-muted); color: var(--text-secondary); font-size: 10px; font-weight: 600; }
.role-pill--owner { color: var(--poliland-green); background: #E8EEE5; }
.status-pill.is-active { color: var(--poliland-green); background: #E8EEE5; }
.status-pill.is-inactive { color: var(--status-danger); background: color-mix(in srgb, var(--status-danger) 11%, white); }
.text-action { min-height: 36px; padding: 0 9px; border: 1px solid var(--border-default); border-radius: 10px; background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 10px; }
.text-action:disabled { opacity: .5; }
.marketing-card { display: grid; gap: 12px; }
.marketing-card__identity { display: flex; align-items: center; gap: 10px; min-width: 0; }
.marketing-card__identity .member-main { flex: 1; }
.marketing-metrics { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 7px; }
.marketing-metrics > div { min-width: 0; padding: 9px; border-radius: 11px; background: var(--surface-muted); }
.marketing-metrics strong, .marketing-metrics span { display: block; }
.marketing-metrics strong { overflow: hidden; color: var(--text-primary); font-size: 14px; text-overflow: ellipsis; white-space: nowrap; }
.marketing-metrics span { margin-top: 3px; color: var(--text-secondary); font-size: 9px; }
.marketing-card__footer { display: flex; justify-content: space-between; align-items: center; gap: 8px; color: var(--text-secondary); font-size: 10px; }
.marketing-card__actions { display: flex; align-items: center; gap: 8px; }
.detail-action, .back-button { display: inline-flex; align-items: center; justify-content: center; gap: 5px; min-height: 40px; padding: 0 10px; border: 1px solid var(--border-default); border-radius: 10px; background: var(--surface-primary); color: var(--poliland-green); font: inherit; font-size: 10px; font-weight: 700; }
.state-card, .notice { padding: 14px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); color: var(--text-secondary); font-size: 11px; line-height: 1.5; }
.state-card--error { color: var(--status-danger); }
.state-card button { min-height: 36px; padding: 0 10px; border: 1px solid var(--border-default); border-radius: 9px; background: var(--surface-primary); }
.notice { margin-top: 14px; color: var(--poliland-green); }
.detail-topbar { margin-bottom: 15px; }
.back-button { min-height: 38px; padding-left: 0; border: 0; background: transparent; text-decoration: none; }
.page-back-button { margin: 0 0 12px; justify-content: flex-start; }
.detail-heading { display: flex; align-items: center; gap: 13px; padding: 16px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.avatar--large { width: 58px; height: 58px; font-size: 17px; }
.detail-heading__copy { min-width: 0; }
.detail-heading h1 { font-size: 19px; }
.detail-heading__copy > p:not(.eyebrow) { overflow: hidden; margin: 3px 0 7px; color: var(--text-secondary); font-size: 10px; text-overflow: ellipsis; }
.profile-information { display: grid; grid-template-columns: 1fr 1fr; gap: 9px; margin-top: 10px; }
.profile-information div { min-width: 0; padding: 11px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--surface-primary); }
.profile-information span, .profile-information strong { display: block; }
.profile-information span { color: var(--text-secondary); font-size: 9px; }
.profile-information strong { overflow-wrap: anywhere; margin-top: 4px; color: var(--text-primary); font-size: 10px; font-weight: 600; }
.section-heading--filter select { width: 112px; min-height: 38px; }
.metric-grid { display: grid; grid-template-columns: repeat(2,minmax(0,1fr)); gap: 8px; }
.metric-card { min-width: 0; padding: 12px; border: 1px solid var(--border-default); border-radius: 13px; background: var(--surface-primary); }
.metric-card span, .metric-card small { display: block; color: var(--text-secondary); font-size: 9px; }
.metric-card strong { display: block; overflow: hidden; margin: 6px 0 3px; color: var(--text-primary); font-size: 21px; text-overflow: ellipsis; white-space: nowrap; }
.metric-card--wide { grid-column: 1 / -1; }
.metric-card--wide strong { font-size: 20px; }
.conversion-card { margin-top: 9px; padding: 13px; border: 1px solid var(--border-default); border-radius: 13px; background: var(--surface-primary); }
.conversion-card__heading { display: flex; justify-content: space-between; font-size: 11px; font-weight: 600; }
.progress-track { height: 8px; overflow: hidden; margin: 9px 0 7px; border-radius: 10px; background: var(--surface-muted); }
.progress-track span { display: block; height: 100%; border-radius: inherit; background: var(--poliland-green); }
.conversion-card small, .helper-text { color: var(--text-secondary); font-size: 9px; line-height: 1.5; }
.transaction-summary, .commission-breakdown { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 9px; }
.transaction-summary div, .commission-breakdown div { padding: 11px; border-radius: 12px; background: var(--surface-muted); }
.transaction-summary span, .commission-breakdown span, .transaction-summary strong, .commission-breakdown strong { display: block; }
.transaction-summary span, .commission-breakdown span { color: var(--text-secondary); font-size: 9px; }
.transaction-summary strong, .commission-breakdown strong { margin-top: 4px; font-size: 13px; }
.commission-section { margin-top: 18px; }
.commission-total { padding: 14px; border-radius: 13px; background: #E8EEE5; }
.commission-total span, .commission-total strong { display: block; color: var(--poliland-green); }
.commission-total span { font-size: 10px; }
.commission-total strong { margin-top: 5px; font-size: 22px; }
.helper-text { margin: 8px 0 0; }
.client-card { display: grid; gap: 10px; }
.client-card__top { display: flex; align-items: center; gap: 10px; }
.client-card__identity { min-width: 0; display: grid; gap: 3px; }
.client-card__identity strong { font-size: 11px; }
.client-card__identity span, .client-card__identity small { overflow: hidden; color: var(--text-secondary); font-size: 9px; text-overflow: ellipsis; white-space: nowrap; }
.client-transactions { display: grid; gap: 7px; padding-top: 9px; border-top: 1px solid var(--border-default); }
.transaction-row { display: flex; justify-content: space-between; align-items: center; gap: 8px; }
.transaction-row > div { display: grid; gap: 3px; }
.transaction-row strong { font-size: 10px; }
.transaction-row small, .no-transaction { color: var(--text-secondary); font-size: 9px; }
.no-transaction { margin: 0; }
.transaction-status, .commission-status { padding: 4px 7px; border-radius: 20px; background: var(--surface-muted); color: var(--text-secondary); font-size: 9px; white-space: nowrap; }
.transaction-status.sold, .commission-status.paid { background: #E8EEE5; color: var(--poliland-green); }
.transaction-status.cancelled, .commission-status.cancelled { background: color-mix(in srgb, var(--status-danger) 11%, white); color: var(--status-danger); }
.commission-row { display: flex; justify-content: space-between; gap: 10px; }
.commission-row > div:first-child { min-width: 0; display: grid; gap: 4px; }
.commission-row strong { font-size: 10px; }
.commission-row small { color: var(--text-secondary); font-size: 9px; }
.commission-row__amount { display: grid; justify-items: end; align-content: start; gap: 6px; white-space: nowrap; }
.create-form { display: grid; gap: 12px; }
.edit-description { margin: 0; color: var(--text-secondary); font-size: 11px; line-height: 1.5; }
.form-label select { margin-top: 1px; }
.date-field input {
  width: 100%;
  min-height: 44px;
  padding: 0 12px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-control);
  background: var(--surface-primary);
  color: var(--text-primary);
  font: inherit;
  font-size: 12px;
  color-scheme: light;
}
.date-field input:disabled { opacity: .6; }
.security-note { padding: 11px; border: 1px solid var(--border-default); border-radius: 12px; background: var(--surface-muted); }
.security-note strong { display: block; margin-bottom: 4px; font-size: 11px; }
.security-note p { margin: 0; color: var(--text-secondary); font-size: 10px; line-height: 1.5; }
.form-error { margin: 0; color: var(--status-danger); font-size: 11px; }
button:focus-visible, input:focus-visible, select:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
@media (min-width: 700px) {
  .team-shell { max-width: 900px; margin: 0 auto; padding: 28px 26px 120px; }
  .page-heading { flex-direction: row; align-items: center; justify-content: space-between; }
  .page-heading :deep(ion-button), .page-heading :deep(button) { width: auto; min-width: 170px; }
  .filters { grid-template-columns: 2fr 1fr 1fr; }
  .search-field { grid-column: auto; }
  .member-card { grid-template-columns: 42px minmax(0,1fr) auto; align-items: center; }
  .member-meta { grid-column: auto; justify-content: flex-end; }
  .metric-grid { grid-template-columns: repeat(4,minmax(0,1fr)); }
  .metric-card--wide { grid-column: auto; }
}
</style>
