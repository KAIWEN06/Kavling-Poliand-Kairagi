<template>
  <SkeletonDetailHeader v-if="loading" :sections="3" :rows="4" label="Memuat detail klien" />
  <StatusIllustration v-else-if="error" :variant="resolveErrorVariant(error)" title="Detail klien belum dapat dimuat" :on-action="load" />

  <template v-else-if="detail">
    <!-- Ringkasan -->
    <section class="mk-card mk-hero">
      <div class="mk-hero__top">
        <div class="mk-hero__mark" aria-hidden="true">{{ initials(c.full_name) }}</div>
        <div class="mk-hero__copy">
          <h1>{{ c.full_name }}</h1>
          <p class="mk-muted">
            Ditangani {{ detail.marketing?.full_name || 'Klien mandiri (Admin)' }} · Ditambahkan {{ formatDate(c.created_at) }}
          </p>
          <div class="mk-hero__badges">
            <StatusBadge :label="c.crm_status" :tone="CRM_TONE[c.crm_status as CrmStatus] || 'neutral'" />
            <StatusBadge :label="`SPK: ${spkLabel(detail.spks[0]?.status)}`" :tone="spkTone(detail.spks[0]?.status)" />
          </div>
        </div>
      </div>
      <div class="mk-hero__actions">
        <WhatsAppButton :phone="c.whatsapp_phone" :fallback-phone="c.phone" :client-name="c.full_name" :sender-name="viewerName" />
        <button type="button" class="mk-btn mk-btn--primary" @click="openStatus">Ubah perkembangan</button>
        <button type="button" class="mk-btn mk-btn--ghost" @click="openFollowup">Catat tindak lanjut</button>
        <button type="button" class="mk-btn mk-btn--ghost" @click="openNote">{{ role === 'head' ? 'Beri arahan' : 'Tambah catatan' }}</button>
      </div>
      <p v-if="actionMessage" class="mk-muted" role="status">{{ actionMessage }}</p>
    </section>

    <nav class="mk-tabs" role="tablist" aria-label="Bagian detail klien">
      <button v-for="tab in tabs" :key="tab.id" type="button" role="tab" :aria-selected="activeTab === tab.id" @click="activeTab = tab.id">
        {{ tab.label }}
      </button>
    </nav>

    <!-- A. Informasi client -->
    <section v-if="activeTab === 'info'" class="mk-card mk-section" role="tabpanel">
      <div class="mk-section-head">
        <h2>Informasi klien</h2>
        <button type="button" class="mk-link" @click="openEdit">Ubah informasi</button>
      </div>
      <dl class="mk-dl">
        <div><dt>Nama lengkap</dt><dd>{{ c.full_name }}</dd></div>
        <div><dt>Nomor telepon</dt><dd>{{ c.phone || '-' }}</dd></div>
        <div><dt>WhatsApp</dt><dd>{{ c.whatsapp_phone || '-' }}</dd></div>
        <div><dt>Email</dt><dd>{{ c.email || '-' }}</dd></div>
        <div><dt>Alamat</dt><dd>{{ c.address || c.street_address || '-' }}</dd></div>
        <div><dt>Wilayah asal</dt><dd>{{ [c.city_name, c.province_name].filter(Boolean).join(', ') || 'Belum diisi' }}</dd></div>
        <div><dt>Marketing penanggung jawab</dt><dd>{{ detail.marketing?.full_name || 'Klien mandiri (Admin)' }}</dd></div>
        <div><dt>Sumber pendaftaran</dt><dd>{{ c.registration_source }}</dd></div>
        <div><dt>Terakhir dihubungi</dt><dd>{{ c.last_contacted_at ? formatDate(c.last_contacted_at) : 'Belum pernah' }}</dd></div>
        <div v-if="c.notes"><dt>Catatan awal</dt><dd>{{ c.notes }}</dd></div>
      </dl>
    </section>

    <!-- B. Minat kavling -->
    <section v-if="activeTab === 'lot'" class="mk-section" role="tabpanel">
      <StatusIllustration v-if="!detail.interests.length" variant="empty-data" size="sm" title="Belum ada minat" description="Belum ada minat kaveling yang dicatat." />
      <article v-for="interest in detail.interests" :key="interest.id" class="mk-card">
        <div class="mk-section-head">
          <h2>Kaveling {{ interest.lot?.lot_number || '-' }}</h2>
          <StatusBadge :label="lotStatusLabel(interest.lot?.status)" :tone="interest.lot?.status === 'Available' ? 'success' : 'warning'" />
        </div>
        <dl class="mk-dl">
          <div><dt>Blok</dt><dd>{{ blockName(interest.lot) }}</dd></div>
          <div><dt>Luas</dt><dd>{{ interest.lot?.area ? `${Number(interest.lot.area)} m²` : '-' }}</dd></div>
          <div><dt>Dimensi</dt><dd>{{ interest.lot?.dimension || '-' }}</dd></div>
          <div><dt>Harga tunai</dt><dd>{{ formatRupiah(interest.lot?.cash_price) }}</dd></div>
          <div v-if="interest.lot?.promo_price"><dt>Harga promo</dt><dd>{{ formatRupiah(interest.lot.promo_price) }}</dd></div>
          <div><dt>Rencana metode bayar</dt><dd>{{ interest.payment_type === 'Cash' ? 'Tunai' : 'Cicilan' }}</dd></div>
          <div v-if="interest.payment_type === 'Installment'"><dt>Rencana tenor</dt><dd>{{ interest.plan ? formatPaymentPlanName(interest.plan.plan_name, interest.plan.months) : '-' }}</dd></div>
        </dl>
        <p class="mk-muted">Rencana tenor adalah preferensi awal, bukan jadwal pembayaran resmi.</p>
        <button v-if="interest.lot?.panorama_url" type="button" class="mk-link" @click="router.push(`/panorama/${interest.lot.id}`)">Lihat panorama 360°</button>
      </article>
    </section>

    <!-- C. Perkembangan -->
    <section v-if="activeTab === 'crm'" class="mk-card mk-section" role="tabpanel">
      <div class="mk-section-head">
        <div><h2>Perkembangan klien</h2><p>Status terkini: {{ c.crm_status }}</p></div>
        <button type="button" class="mk-link" @click="openStatus">Ubah status</button>
      </div>
      <ol v-if="crmTimeline.length" class="mk-timeline">
        <li v-for="item in crmTimeline" :key="item.key">
          <strong>{{ item.title }}</strong>
          <span class="mk-muted">{{ formatDate(item.at, true) }} · {{ actorName(item.actor) }}</span>
          <p v-if="item.body">{{ item.body }}</p>
        </li>
      </ol>
      <p v-else class="mk-muted">Belum ada riwayat perkembangan.</p>
    </section>

    <!-- D. SPK -->
    <section v-if="activeTab === 'spk'" class="mk-section" role="tabpanel">
      <StatusIllustration v-if="!detail.spks.length" variant="empty-data" size="sm" title="Belum ada pengajuan SPK" description="Klien ini belum memiliki pengajuan SPK." />
      <article v-for="spk in detail.spks" :key="spk.id" class="mk-card mk-section">
        <div class="mk-section-head">
          <div><h2>{{ spk.spk_number }}</h2><p>Kaveling {{ spk.lot?.lot_number || '-' }} · diajukan {{ formatDate(spk.submitted_at) }} ({{ spk.submission_source }})</p></div>
          <StatusBadge :label="spkLabel(spk.status)" :tone="spkTone(spk.status)" />
        </div>
        <dl class="mk-dl">
          <div><dt>Nominal SPK</dt><dd>{{ formatRupiah(spk.booking_fee_snapshot) }}</dd></div>
          <div><dt>Harga kaveling</dt><dd>{{ formatRupiah(spk.lot_price_snapshot) }}</dd></div>
          <div><dt>Metode</dt><dd>{{ spk.payment_method === 'Cash' ? 'Tunai' : `Cicilan ${spk.months || ''}x` }}</dd></div>
          <div v-if="spk.admin_note"><dt>Catatan Admin</dt><dd>{{ spk.admin_note }}</dd></div>
        </dl>
        <div v-if="spk.status === 'Rejected'" class="mk-alert" role="note">
          <strong>Alasan penolakan</strong>
          <p>{{ spk.rejection_reason || 'Tidak dicantumkan' }}</p>
          <span class="mk-muted">Bantu klien memperbaiki data, lalu klien/Admin dapat mengajukan ulang.</span>
        </div>
        <details>
          <summary class="mk-link">Riwayat pemeriksaan ({{ spk.history.length }})</summary>
          <ol class="mk-timeline mk-mt">
            <li v-for="h in spk.history" :key="h.id">
              <strong>{{ h.old_status ? `${spkLabel(h.old_status)} → ${spkLabel(h.new_status)}` : spkLabel(h.new_status) }}</strong>
              <span class="mk-muted">{{ formatDate(h.created_at, true) }} · {{ actorName(h.changed_by) }}</span>
              <p v-if="h.note">{{ h.note }}</p>
            </li>
          </ol>
        </details>
      </article>
    </section>

    <!-- E. Pembayaran -->
    <section v-if="activeTab === 'payment'" class="mk-section" role="tabpanel">
      <article v-for="tx in detail.transactions" :key="tx.id" class="mk-card">
        <div class="mk-section-head">
          <h2>Transaksi {{ tx.lot?.lot_number || '-' }}</h2>
          <StatusBadge :label="transactionStatusLabel(tx.status)" :tone="tx.status === 'Cancelled' ? 'danger' : 'success'" />
        </div>
        <dl class="mk-dl">
          <div><dt>Harga transaksi (nilai kontrak)</dt><dd>{{ formatRupiah(tx.final_price) }}</dd></div>
          <div><dt>Uang muka</dt><dd>{{ formatRupiah(tx.down_payment) }}</dd></div>
          <div><dt>SPK (Booking Fee)</dt><dd>{{ formatRupiah(tx.balance.bookingFeePaid) }} terkonfirmasi</dd></div>
          <div><dt>Pembayaran terkonfirmasi (di luar SPK)</dt><dd>{{ formatRupiah(tx.balance.principalPaid) }}</dd></div>
          <div><dt>Sisa kewajiban</dt><dd class="mk-strong">{{ formatRupiah(tx.balance.remaining) }}</dd></div>
          <div><dt>Progres</dt><dd>{{ tx.balance.progress.toFixed(1) }}%</dd></div>
        </dl>
      </article>
      <div class="mk-table-wrap">
        <table class="mk-table mk-table--stack">
          <thead><tr><th>Jenis</th><th>Tanggal transfer</th><th class="num">Nominal</th><th>Status verifikasi</th><th>Catatan</th></tr></thead>
          <tbody>
            <tr v-if="!detail.payments.length"><td colspan="5" class="mk-muted">Belum ada pembayaran.</td></tr>
            <tr v-for="p in detail.payments" :key="p.id">
              <td class="mk-cell-main">{{ paymentCategoryLabel(p.payment_category) }}</td>
              <td data-label="Tanggal transfer">{{ formatDate(p.transfer_date || p.payment_date || p.submitted_at) }}</td>
              <td data-label="Nominal" class="num">{{ formatRupiah(p.amount) }}</td>
              <td data-label="Status"><StatusBadge :label="paymentStatusLabel(p.status)" :tone="paymentStatusTone(p.status)" /></td>
              <td data-label="Catatan">{{ p.review_note || '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p class="mk-muted">Hanya pembayaran berstatus Terkonfirmasi yang dihitung sebagai penerimaan. Verifikasi dilakukan Admin.</p>
    </section>

    <!-- F. Jadwal pembayaran -->
    <section v-if="activeTab === 'schedule'" class="mk-section" role="tabpanel">
      <StatusIllustration v-if="!scheduleTx.length" variant="empty-data" size="sm" title="Belum ada jadwal cicilan" description="Jadwal dibuat sistem setelah SPK cicilan terkonfirmasi Admin." />
      <article v-for="tx in scheduleTx" :key="tx.id" class="mk-section">
        <div class="mk-card">
          <dl class="mk-dl">
            <div><dt>Kaveling</dt><dd>{{ tx.lot?.lot_number || '-' }}</dd></div>
            <div><dt>Tenor</dt><dd>{{ tx.months }} bulan</dd></div>
            <div><dt>Nominal cicilan</dt><dd>{{ formatRupiah(tx.monthly_payment) }}</dd></div>
            <div><dt>Cicilan lunas</dt><dd>{{ tx.schedules.filter((s: any) => s.status === 'Paid').length }} / {{ tx.schedules.length }}</dd></div>
            <div><dt>Sisa cicilan</dt><dd>{{ formatRupiah(tx.schedules.filter((s: any) => s.status !== 'Paid').reduce((a: number, s: any) => a + Number(s.amount), 0)) }}</dd></div>
            <div><dt>Total denda tercatat</dt><dd>{{ formatRupiah(tx.schedules.reduce((a: number, s: any) => a + penaltyOf(s), 0)) }}</dd></div>
          </dl>
        </div>
        <div class="mk-table-wrap">
          <table class="mk-table mk-table--stack">
            <thead><tr><th>Ke-</th><th>Jatuh tempo</th><th class="num">Nominal</th><th>Status</th><th class="num">Denda</th></tr></thead>
            <tbody>
              <tr v-for="s in tx.schedules" :key="s.id">
                <td class="mk-cell-main">Cicilan ke-{{ s.installment_number }}</td>
                <td data-label="Jatuh tempo">{{ formatDate(s.due_date) }}</td>
                <td data-label="Nominal" class="num">{{ formatRupiah(s.amount) }}</td>
                <td data-label="Status"><StatusBadge :label="scheduleStatusLabel(s.status, s.due_date)" :tone="scheduleStatusTone(s.status, s.due_date)" /></td>
                <td data-label="Denda" class="num">{{ penaltyOf(s) ? formatRupiah(penaltyOf(s)) : '-' }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </article>
      <p class="mk-muted">Denda dihitung Admin saat verifikasi: Rp20.000/hari per cicilan, maksimal Rp1.800.000 per cicilan.</p>
    </section>

    <!-- G. Catatan -->
    <section v-if="activeTab === 'notes'" class="mk-section" role="tabpanel">
      <div class="mk-section-head">
        <h2>Catatan & arahan</h2>
        <button type="button" class="mk-link" @click="openNote">{{ role === 'head' ? 'Beri arahan' : 'Tambah catatan' }}</button>
      </div>
      <StatusIllustration v-if="!detail.notes.length" variant="empty-data" size="sm" title="Belum ada catatan" description="Catatan tentang klien ini akan tampil di sini." />
      <article v-for="note in detail.notes" :key="note.id" class="mk-card mk-note" :class="{ 'mk-note--head': actorRole(note.created_by) === 'marketing_head' }">
        <div class="mk-section-head">
          <strong>{{ note.title || note.category }}</strong>
          <StatusBadge :label="actorRole(note.created_by) === 'marketing_head' ? 'Kepala Bagian' : actorRole(note.created_by) === 'admin' ? 'Admin' : 'Marketing'" :tone="actorRole(note.created_by) === 'marketing_head' ? 'gold' : 'neutral'" />
        </div>
        <p>{{ note.content || note.note }}</p>
        <span class="mk-muted">{{ note.category }} · {{ actorName(note.created_by) }} · {{ formatDate(note.created_at, true) }}</span>
      </article>
      <h3 class="mk-subhead">Riwayat tindak lanjut</h3>
      <div v-if="!detail.followups.length" class="mk-muted">Belum ada tindak lanjut.</div>
      <ol v-else class="mk-timeline">
        <li v-for="f in detail.followups" :key="f.id">
          <strong>{{ f.method }} · {{ f.status }}</strong>
          <span class="mk-muted">{{ formatDate(f.followup_date) }} · {{ actorName(f.user_id) }}<template v-if="f.next_followup_date"> · berikutnya {{ formatDate(f.next_followup_date) }}</template></span>
          <p v-if="f.notes">{{ f.notes }}</p>
        </li>
      </ol>
    </section>

    <!-- H. Komisi -->
    <section v-if="activeTab === 'commission'" class="mk-section" role="tabpanel">
      <StatusIllustration v-if="!detail.commissions.length" variant="empty-data" size="sm" title="Belum ada data komisi" description="Komisi dicatat Admin sesuai kebijakan perusahaan. Aplikasi tidak menghitung komisi sendiri." />
      <div v-else class="mk-table-wrap">
        <table class="mk-table mk-table--stack">
          <thead><tr><th>Marketing</th><th>Jenis</th><th class="num">Dasar</th><th class="num">Komisi</th><th>Status</th><th>Dibayarkan</th></tr></thead>
          <tbody>
            <tr v-for="cm in detail.commissions" :key="cm.id">
              <td class="mk-cell-main">{{ actorName(cm.marketing_id) }}</td>
              <td data-label="Jenis">{{ cm.commission_type }}<template v-if="cm.commission_rate != null"> ({{ Number(cm.commission_rate) }}%)</template></td>
              <td data-label="Dasar" class="num">{{ formatRupiah(cm.base_amount) }}</td>
              <td data-label="Komisi" class="num">{{ formatRupiah(cm.commission_amount) }}</td>
              <td data-label="Status"><StatusBadge :label="commissionStatusLabel(cm.status)" :tone="commissionStatusTone(cm.status)" /></td>
              <td data-label="Dibayarkan">{{ cm.paid_at ? formatDate(cm.paid_at) : '-' }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <p class="mk-muted mk-readonly-note">
      Konfirmasi SPK, verifikasi pembayaran, perubahan nominal, jadwal resmi, dan refund hanya dapat dilakukan Admin.
    </p>

    <!-- Modal: status perkembangan -->
    <AppModal v-model="statusModal" title="Ubah perkembangan klien" confirm-text="Simpan status" :loading="saving" @confirm="saveStatus">
      <div class="mk-form">
        <label class="mk-field">
          <span>Status perkembangan</span>
          <select v-model="statusForm.status" class="mk-input">
            <option v-for="s in CRM_STATUSES" :key="s" :value="s">{{ s }}</option>
          </select>
          <small>Status ini terpisah dari status SPK dan pembayaran.</small>
        </label>
        <label class="mk-field">
          <span>Catatan perubahan (opsional)</span>
          <textarea v-model="statusForm.note" class="mk-input" maxlength="2000" placeholder="Contoh: Klien setuju survey lokasi Sabtu depan." />
        </label>
        <p v-if="formError" class="mk-danger-text" role="alert">{{ formError }}</p>
      </div>
    </AppModal>

    <!-- Modal: follow-up -->
    <AppModal v-model="followupModal" title="Catat tindak lanjut" confirm-text="Simpan tindak lanjut" :loading="saving" @confirm="saveFollowup">
      <div class="mk-form">
        <div class="mk-filters">
          <label class="mk-field"><span>Tanggal</span><input v-model="followupForm.followup_date" type="date" class="mk-input" /></label>
          <label class="mk-field">
            <span>Metode</span>
            <select v-model="followupForm.method" class="mk-input"><option v-for="m in FOLLOWUP_METHODS" :key="m">{{ m }}</option></select>
          </label>
          <label class="mk-field">
            <span>Hasil komunikasi</span>
            <select v-model="followupForm.status" class="mk-input"><option v-for="r in FOLLOWUP_RESULTS" :key="r">{{ r }}</option></select>
          </label>
          <label class="mk-field"><span>Tindak lanjut berikutnya</span><input v-model="followupForm.next_followup_date" type="date" class="mk-input" /></label>
        </div>
        <label class="mk-field">
          <span>Informasi hasil komunikasi</span>
          <textarea v-model="followupForm.notes" class="mk-input" maxlength="2000" />
        </label>
        <p v-if="formError" class="mk-danger-text" role="alert">{{ formError }}</p>
      </div>
    </AppModal>

    <!-- Modal: catatan -->
    <AppModal v-model="noteModal" :title="role === 'head' ? 'Beri arahan ke Marketing' : 'Tambah catatan'" confirm-text="Simpan catatan" :loading="saving" @confirm="saveNote">
      <div class="mk-form">
        <label class="mk-field"><span>Judul</span><input v-model="noteForm.title" class="mk-input" maxlength="120" /></label>
        <label class="mk-field">
          <span>Kategori</span>
          <select v-model="noteForm.category" class="mk-input"><option v-for="cat in NOTE_CATEGORIES" :key="cat">{{ cat }}</option></select>
        </label>
        <label class="mk-field"><span>Isi</span><textarea v-model="noteForm.content" class="mk-input" maxlength="4000" /></label>
        <p v-if="formError" class="mk-danger-text" role="alert">{{ formError }}</p>
      </div>
    </AppModal>

    <!-- Modal: edit informasi -->
    <AppModal v-model="editModal" title="Ubah informasi klien" confirm-text="Simpan perubahan" :loading="saving" @confirm="saveEdit">
      <div class="mk-form">
        <label class="mk-field"><span>Nama lengkap</span><input v-model="editForm.full_name" data-input="name" class="mk-input" /></label>
        <div class="mk-filters">
          <label class="mk-field"><span>Nomor telepon</span><input v-model="editForm.phone" class="mk-input" inputmode="tel" /></label>
          <label class="mk-field"><span>WhatsApp</span><input v-model="editForm.whatsapp_phone" class="mk-input" inputmode="tel" /></label>
        </div>
        <label class="mk-field"><span>Email</span><input v-model="editForm.email" class="mk-input" type="email" /></label>
        <label class="mk-field"><span>Alamat</span><textarea v-model="editForm.address" class="mk-input" /></label>
        <RegionSelect v-model="editRegion" />
        <p class="mk-muted">Marketing penanggung jawab hanya dapat dipindahkan oleh Admin.</p>
        <p v-if="formError" class="mk-danger-text" role="alert">{{ formError }}</p>
      </div>
    </AppModal>
  </template>
</template>

<script setup lang="ts">
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import SkeletonDetailHeader from '@/components/ui/skeletons/SkeletonDetailHeader.vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { useIonRouter } from '@ionic/vue'
import AppModal from '@/components/ui/AppModal.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import WhatsAppButton from './WhatsAppButton.vue'
import RegionSelect, { type RegionValue } from './RegionSelect.vue'
import {
  FOLLOWUP_METHODS,
  FOLLOWUP_RESULTS,
  NOTE_CATEGORIES,
  addFollowup,
  addNote,
  contactAlreadyRegistered,
  getClientDetail,
  updateClientInfo,
  updateCrmStatus,
  type ClientDetail,
} from '@/services/marketing/marketingCrmService'
import {
  CRM_STATUSES,
  CRM_TONE,
  commissionStatusLabel,
  commissionStatusTone,
  formatDate,
  formatRupiah,
  initials,
  lotStatusLabel,
  paymentCategoryLabel,
  paymentStatusLabel,
  paymentStatusTone,
  scheduleStatusLabel,
  scheduleStatusTone,
  spkLabel,
  spkTone,
  todayIso,
  transactionStatusLabel,
  type CrmStatus,
} from '@/utils/marketingStatus'
import { formatPaymentPlanName } from '@/utils/paymentPlan'

const props = withDefaults(defineProps<{ customerId: number; role: 'marketing' | 'head'; viewerName?: string }>(), { viewerName: '' })
const router = useIonRouter()

const tabs = [
  { id: 'info', label: 'Informasi' },
  { id: 'lot', label: 'Minat kaveling' },
  { id: 'crm', label: 'Perkembangan' },
  { id: 'spk', label: 'SPK' },
  { id: 'payment', label: 'Pembayaran' },
  { id: 'schedule', label: 'Jadwal' },
  { id: 'notes', label: 'Catatan' },
  { id: 'commission', label: 'Komisi' },
] as const
const activeTab = ref<(typeof tabs)[number]['id']>('info')

const detail = ref<ClientDetail | null>(null)
const loading = ref(true)
const loaded = ref(false)
const error = ref('')
const saving = ref(false)
const formError = ref('')
const actionMessage = ref('')

const c = computed(() => detail.value?.customer ?? {})
const scheduleTx = computed(() => (detail.value?.transactions ?? []).filter((tx) => tx.payment_type === 'Installment' && tx.schedules.length))

const crmTimeline = computed(() => {
  if (!detail.value) return []
  const crm = detail.value.crmHistory.map((h: any) => ({
    key: `crm-${h.id}`,
    at: h.created_at,
    actor: h.changed_by,
    title: !h.old_status ? `Client ditambahkan (${h.new_status})` : h.old_status === h.new_status ? `Catatan perkembangan (${h.new_status})` : `${h.old_status} → ${h.new_status}`,
    body: h.note,
  }))
  const fu = detail.value.followups.map((f: any) => ({
    key: `fu-${f.id}`,
    at: f.created_at,
    actor: f.user_id,
    title: `Tindak lanjut ${f.method}: ${f.status}`,
    body: f.notes,
  }))
  return [...crm, ...fu].sort((a, b) => String(b.at).localeCompare(String(a.at)))
})

function actorName(id?: string | null) {
  if (!id) return 'Sistem'
  return detail.value?.actors[id]?.full_name ?? 'Pengguna'
}
function actorRole(id?: string | null) {
  return id ? detail.value?.actors[id]?.role ?? '' : ''
}
function blockName(lot: any) {
  const block = Array.isArray(lot?.blocks) ? lot.blocks[0] : lot?.blocks
  return block?.name || block?.code || '-'
}
function penaltyOf(schedule: any) {
  const penalty = Array.isArray(schedule.installment_penalties) ? schedule.installment_penalties[0] : schedule.installment_penalties
  return penalty && penalty.status !== 'Waived' ? Number(penalty.amount || 0) : 0
}

async function load() {
  if (!loaded.value) loading.value = true
  error.value = ''
  try {
    detail.value = await getClientDetail(props.customerId)
    loaded.value = true
  } catch (cause) {
    error.value = cause instanceof Error ? cause.message : 'Periksa koneksi, lalu coba lagi.'
  } finally {
    loading.value = false
  }
}

function describe(cause: unknown) {
  return cause instanceof Error ? cause.message : 'Perubahan gagal disimpan. Coba lagi.'
}

// --- status
const statusModal = ref(false)
const statusForm = reactive({ status: 'Baru' as CrmStatus, note: '' })
function openStatus() {
  formError.value = ''
  statusForm.status = (c.value.crm_status as CrmStatus) || 'Baru'
  statusForm.note = ''
  statusModal.value = true
}
async function saveStatus() {
  saving.value = true
  formError.value = ''
  try {
    await updateCrmStatus(props.customerId, statusForm.status, statusForm.note)
    statusModal.value = false
    actionMessage.value = 'Status perkembangan tersimpan.'
    await load()
  } catch (cause) {
    formError.value = describe(cause)
  } finally {
    saving.value = false
  }
}

// --- follow-up
const followupModal = ref(false)
const followupForm = reactive({
  followup_date: todayIso(),
  method: 'WhatsApp' as (typeof FOLLOWUP_METHODS)[number],
  status: 'Follow Up' as (typeof FOLLOWUP_RESULTS)[number],
  notes: '',
  next_followup_date: '',
})
function openFollowup() {
  formError.value = ''
  Object.assign(followupForm, { followup_date: todayIso(), method: 'WhatsApp', status: 'Follow Up', notes: '', next_followup_date: '' })
  followupModal.value = true
}
async function saveFollowup() {
  if (!followupForm.followup_date) {
    formError.value = 'Tanggal tindak lanjut wajib diisi.'
    return
  }
  if (followupForm.next_followup_date && followupForm.next_followup_date < followupForm.followup_date) {
    formError.value = 'Tanggal tindak lanjut berikutnya tidak boleh sebelum tanggal tindak lanjut.'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    await addFollowup({
      customer_id: props.customerId,
      followup_date: followupForm.followup_date,
      method: followupForm.method,
      status: followupForm.status,
      notes: followupForm.notes.trim() || null,
      next_followup_date: followupForm.next_followup_date || null,
    })
    followupModal.value = false
    actionMessage.value = 'Tindak lanjut tersimpan.'
    await load()
  } catch (cause) {
    formError.value = describe(cause)
  } finally {
    saving.value = false
  }
}

// --- catatan
const noteModal = ref(false)
const noteForm = reactive({ title: '', content: '', category: 'Lainnya' })
function openNote() {
  formError.value = ''
  Object.assign(noteForm, { title: '', content: '', category: props.role === 'head' ? 'Arahan Kepala Bagian' : 'Follow Up' })
  noteModal.value = true
}
async function saveNote() {
  if (!noteForm.title.trim() || !noteForm.content.trim()) {
    formError.value = 'Judul dan isi catatan wajib diisi.'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    await addNote(props.customerId, noteForm)
    noteModal.value = false
    actionMessage.value = 'Catatan tersimpan.'
    await load()
  } catch (cause) {
    formError.value = describe(cause)
  } finally {
    saving.value = false
  }
}

// --- edit
const editModal = ref(false)
const editForm = reactive({ full_name: '', phone: '', whatsapp_phone: '', email: '', address: '' })
const editRegion = ref<RegionValue>({ province_code: null, province_name: null, city_code: null, city_name: null })
function openEdit() {
  formError.value = ''
  Object.assign(editForm, {
    full_name: c.value.full_name || '',
    phone: c.value.phone || '',
    whatsapp_phone: c.value.whatsapp_phone || '',
    email: c.value.email || '',
    address: c.value.address || '',
  })
  editRegion.value = {
    province_code: c.value.province_code ?? null,
    province_name: c.value.province_name ?? null,
    city_code: c.value.city_code ?? null,
    city_name: c.value.city_name ?? null,
  }
  editModal.value = true
}
async function saveEdit() {
  formError.value = ''
  if (editForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
    formError.value = 'Format email tidak valid.'
    return
  }
  saving.value = true
  try {
    const contactChanged = editForm.phone !== (c.value.phone || '') || editForm.whatsapp_phone !== (c.value.whatsapp_phone || '')
    if (contactChanged && (await contactAlreadyRegistered(editForm.phone, editForm.whatsapp_phone, props.customerId))) {
      formError.value = 'Nomor kontak sudah terdaftar pada klien lain. Periksa kembali agar tidak terjadi duplikasi.'
      return
    }
    await updateClientInfo(props.customerId, {
      full_name: editForm.full_name.trim(),
      phone: editForm.phone.trim() || null,
      whatsapp_phone: editForm.whatsapp_phone.trim() || null,
      email: editForm.email.trim() || null,
      address: editForm.address.trim() || null,
      notes: c.value.notes ?? null,
      ...editRegion.value,
    })
    editModal.value = false
    actionMessage.value = 'Informasi klien tersimpan.'
    await load()
  } catch (cause) {
    formError.value = describe(cause)
  } finally {
    saving.value = false
  }
}

watch(() => props.customerId, () => {
  loaded.value = false // klien berbeda → tampilkan skeleton, bukan data klien sebelumnya
  detail.value = null
  return load()
})
onMounted(load)
defineExpose({ reload: load })
</script>

<style scoped>
.mk-hero { display: grid; gap: 14px; }
.mk-hero__top { display: flex; gap: 12px; align-items: flex-start; }
.mk-hero__mark { width: 48px; height: 48px; flex: 0 0 48px; display: grid; place-items: center; border-radius: 14px; background: var(--poliland-gold-soft); color: var(--poliland-gold-text-soft); font-weight: 700; }
.mk-hero__copy { min-width: 0; }
.mk-hero h1 { margin: 0; font-size: 20px; overflow-wrap: anywhere; }
.mk-hero p { margin: 4px 0 0; }
.mk-hero__badges { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 8px; }
.mk-hero__actions { display: flex; flex-wrap: wrap; gap: 8px; }
.mk-form { display: grid; gap: 12px; }
.mk-alert { padding: 12px; border-radius: var(--radius-control); background: #fbe7e6; }
.mk-alert strong { color: #a8322d; font-size: 13px; }
.mk-alert p { margin: 4px 0; font-size: 13px; }
.mk-note p { margin: 8px 0; font-size: 14px; white-space: pre-wrap; }
.mk-note--head { border-color: var(--poliland-gold); background: #fffaf0; }
.mk-subhead { margin: 8px 0 0; font-size: 15px; }
.mk-mt { margin-top: 10px; }
.mk-readonly-note { text-align: center; }
details summary { cursor: pointer; list-style: none; }
</style>
