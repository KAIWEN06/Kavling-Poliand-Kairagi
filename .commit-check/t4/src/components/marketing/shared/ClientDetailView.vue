<template>
  <!--
    Susunan mengikuti detail klien admin (AdminPembeliDetail.vue): hero, empat ubin aksi,
    tab bergaris bawah, kartu kaveling dan transaksi. Batasan peran Marketing/Kepala Bagian:
    tidak ada hapus data klien, tidak ada tambah/hapus minat kaveling. Marketing dapat mengajukan
    SPK (dikonfirmasi Admin); pembayaran, jadwal, dan refund hanya dapat dilihat.
  -->
  <SkeletonDetailHeader v-if="loading" :sections="3" :rows="4" label="Memuat detail klien" />
  <StatusIllustration v-else-if="error" :variant="resolveErrorVariant(error)" title="Detail klien gagal dimuat" :on-action="() => load()" />

  <template v-else-if="detail">
    <section class="cd-hero">
      <div class="cd-avatar" aria-hidden="true">{{ initials(c.full_name) }}</div>
      <div class="cd-hero-copy">
        <h2>{{ c.full_name }}</h2>
        <p>Ditambahkan {{ formatDate(c.created_at) }}</p>
        <StatusBadge class="cd-hero-spk" :label="`SPK: ${spkLabel(detail.spks[0]?.status)}`" :tone="spkTone(detail.spks[0]?.status)" />
      </div>
      <StatusBadge class="cd-hero-status" :label="crmStatusLabel(c.crm_status)" :tone="CRM_TONE[c.crm_status as CrmStatus] || 'neutral'" />
    </section>

    <div class="cd-actions">
      <a
        :href="callNumber ? `tel:${callNumber}` : undefined"
        :class="['cd-action', { 'is-disabled': !callNumber }]"
        :aria-disabled="!callNumber"
        :aria-label="callNumber ? `Telepon ${c.full_name}` : 'Nomor telepon belum tersedia'"
      >
        <ion-icon :icon="callOutline" aria-hidden="true" /><span>Telepon</span>
      </a>
      <WhatsAppButton tile :phone="c.whatsapp_phone" :fallback-phone="c.phone" :client-name="c.full_name" :sender-name="viewerName" />
      <button type="button" class="cd-action" @click="openStatus">
        <ion-icon :icon="flagOutline" aria-hidden="true" /><span>Status</span>
      </button>
      <button type="button" class="cd-action" @click="openFollowup">
        <ion-icon :icon="chatbubblesOutline" aria-hidden="true" /><span>Tindak lanjut</span>
      </button>
    </div>

    <div class="cd-tabs" role="tablist" aria-label="Bagian detail klien">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        type="button"
        role="tab"
        :class="{ active: activeTab === tab.id }"
        :aria-selected="activeTab === tab.id"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
      </button>
    </div>

    <div :key="activeTab" class="cd-panel" role="tabpanel">
      <!-- Informasi -->
      <section v-if="activeTab === 'info'" class="cd-card">
        <div class="cd-card-head">
          <h3>Kontak dan alamat</h3>
          <button type="button" class="cd-btn-soft" @click="openEdit">
            <ion-icon :icon="createOutline" aria-hidden="true" /> Ubah
          </button>
        </div>
        <dl class="cd-info">
          <div><dt>Nomor telepon</dt><dd>{{ c.phone || 'Belum tercatat' }}</dd></div>
          <div><dt>WhatsApp</dt><dd>{{ c.whatsapp_phone || c.phone || 'Belum tercatat' }}</dd></div>
          <div><dt>Email</dt><dd>{{ c.email || 'Belum tercatat' }}</dd></div>
          <div><dt>Alamat</dt><dd>{{ c.address || c.street_address || 'Belum tercatat' }}</dd></div>
          <div><dt>Wilayah</dt><dd>{{ [c.city_name, c.province_name].filter(Boolean).join(', ') || 'Belum tercatat' }}</dd></div>
          <div><dt>Pemasar</dt><dd>{{ detail.marketing?.full_name || 'Klien mandiri (Admin)' }}</dd></div>
          <div><dt>Asal data klien</dt><dd>{{ c.registration_source || 'Belum tercatat' }}</dd></div>
          <div><dt>Terakhir dihubungi</dt><dd>{{ c.last_contacted_at ? formatDate(c.last_contacted_at) : 'Belum pernah' }}</dd></div>
          <div v-if="c.notes"><dt>Catatan awal</dt><dd>{{ c.notes }}</dd></div>
        </dl>
        <!-- Kepala pemasaran tidak punya akses ke identitas pembeli. -->
        <IdentityInfo v-if="role !== 'head'" :customer-id="Number(customerId)" editable />
      </section>

      <!-- Kaveling: minat, transaksi, pembayaran, jadwal -->
      <template v-else-if="activeTab === 'lot'">
        <section class="cd-card" aria-labelledby="cd-interest-title">
          <div class="cd-card-head"><h3 id="cd-interest-title">Kaveling yang diminati</h3></div>
          <StatusIllustration v-if="!detail.interests.length" variant="empty-data" size="sm" title="Belum ada minat kaveling" description="Minat yang dicatat saat klien ditambahkan muncul di sini." />
          <div v-else class="cd-stack">
            <article v-for="interest in detail.interests" :key="interest.id" class="cd-lot">
              <div class="cd-lot-head">
                <div class="cd-lot-id">
                  <strong>{{ interest.lot?.lot_number || '-' }}</strong>
                  <span class="cd-pill">{{ interest.payment_type === 'Cash' ? 'Tunai' : 'Cicilan' }}</span>
                </div>
                <span :class="['cd-chip', lotStatusClass(interest.lot?.status)]">{{ lotStatusLabel(interest.lot?.status) }}</span>
              </div>
              <div class="cd-grid">
                <div><span>Blok</span><strong>{{ blockName(interest.lot) }}</strong></div>
                <div v-if="interest.lot?.area"><span>Luas tanah</span><strong>{{ Number(interest.lot.area) }} m²</strong></div>
                <div v-if="interest.lot?.dimension"><span>Dimensi</span><strong>{{ interest.lot.dimension }}</strong></div>
                <div><span>{{ isPromo(interest.lot) ? 'Harga promo' : 'Harga kaveling' }}</span><strong>{{ formatRupiah(lotPrice(interest.lot)) }}</strong></div>
                <div v-if="interest.payment_type === 'Installment'"><span>Rencana tenor</span><strong>{{ interest.plan ? formatPaymentPlanName(interest.plan.plan_name, interest.plan.months) : 'Belum dipilih' }}</strong></div>
              </div>
              <button v-if="interest.lot?.panorama_url" type="button" class="cd-btn-soft cd-btn-end" @click="router.push(`/panorama/${interest.lot.id}`)">
                Panorama 360° <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
              </button>
            </article>
            <p class="cd-foot">Rencana awal, belum jadwal resmi.</p>
          </div>
        </section>

        <section class="cd-card" aria-labelledby="cd-tx-title">
          <div class="cd-card-head"><h3 id="cd-tx-title">Transaksi dan pembayaran</h3></div>
          <StatusIllustration v-if="!detail.transactions.length" variant="empty-data" size="sm" title="Belum ada transaksi" description="Muncul setelah Admin mengonfirmasi SPK klien." />
          <div v-else class="cd-stack">
            <article v-for="tx in detail.transactions" :key="tx.id" class="cd-lot">
              <div class="cd-lot-head cd-lot-head--line">
                <div class="cd-tx-title">
                  <strong>{{ tx.lot?.lot_number || '-' }}</strong>
                  <span>{{ blockName(tx.lot) }}</span>
                </div>
                <span :class="['cd-chip', lotStatusClass(tx.status)]">{{ txStatusLabel(tx) }}</span>
              </div>
              <div class="cd-grid">
                <div><span>Skema bayar</span><strong>{{ tx.payment_type === 'Installment' ? 'Cicilan' : 'Tunai' }}</strong></div>
                <div><span>Nilai kontrak</span><strong>{{ formatRupiah(tx.final_price) }}</strong></div>
                <div><span>Terbayar</span><strong class="cd-ok">{{ formatRupiah(tx.balance.principalPaid) }}</strong></div>
                <div><span>Sisa tagihan</span><strong :class="{ 'cd-ok': tx.balance.remaining <= 0 }">{{ formatRupiah(tx.balance.remaining) }}</strong></div>
              </div>
              <details class="cd-more">
                <summary>Rincian pembayaran</summary>
                <dl class="cd-dl">
                  <div><dt>Tanda jadi dibayar</dt><dd class="cd-ok">{{ formatRupiah(tx.balance.bookingFeePaid) }}</dd></div>
                  <div><dt>Uang muka</dt><dd>{{ formatRupiah(tx.down_payment) }}</dd></div>
                  <div><dt>Progres</dt><dd>{{ tx.balance.progress.toFixed(1) }}%</dd></div>
                  <template v-if="tx.payment_type === 'Installment'">
                    <div><dt>Tenor dan angsuran</dt><dd>{{ tx.months ? `${tx.months} bln` : 'Belum diatur' }}{{ tx.monthly_payment ? ` (${formatRupiah(tx.monthly_payment)}/bln)` : '' }}</dd></div>
                    <template v-if="tx.schedules.length">
                      <div><dt>Cicilan lunas</dt><dd>{{ paidCount(tx) }} dari {{ tx.schedules.length }}</dd></div>
                      <div><dt>Sisa cicilan</dt><dd>{{ formatRupiah(unpaidTotal(tx)) }}</dd></div>
                      <div><dt>Denda tercatat</dt><dd>{{ formatRupiah(penaltyTotal(tx)) }}</dd></div>
                    </template>
                  </template>
                </dl>
              </details>
              <details v-if="tx.schedules.length" class="cd-more">
                <summary>Jadwal cicilan ({{ tx.schedules.length }})</summary>
                <ul class="cd-rows">
                  <li v-for="s in tx.schedules" :key="s.id">
                    <div>
                      <strong>Ke-{{ s.installment_number }}</strong>
                      <span>Jatuh tempo {{ formatDate(s.due_date) }}<template v-if="penaltyOf(s)"> · denda {{ formatRupiah(penaltyOf(s)) }}</template></span>
                    </div>
                    <div class="cd-row-end">
                      <strong>{{ formatRupiah(s.amount) }}</strong>
                      <StatusBadge :label="scheduleStatusLabel(s.status, s.due_date)" :tone="scheduleStatusTone(s.status, s.due_date)" />
                    </div>
                  </li>
                </ul>
                <p class="cd-foot">Denda Rp20.000 per hari, maksimal Rp1.800.000 per cicilan. Dihitung Admin saat verifikasi.</p>
              </details>
            </article>
          </div>
        </section>

        <section v-if="detail.payments.length" class="cd-card" aria-labelledby="cd-pay-title">
          <div class="cd-card-head"><h3 id="cd-pay-title">Riwayat pembayaran</h3></div>
          <ul class="cd-rows">
            <li v-for="p in detail.payments" :key="p.id">
              <div>
                <strong>{{ p.installment_label || paymentCategoryLabel(p.payment_category) }}</strong>
                <span>Transfer {{ formatDate(p.transfer_date || p.payment_date || p.submitted_at) }}</span>
                <span v-if="p.review_note" class="cd-note">{{ p.review_note }}</span>
              </div>
              <div class="cd-row-end">
                <strong>{{ formatRupiah(p.amount) }}</strong>
                <StatusBadge :label="paymentStatusLabel(p.status)" :tone="paymentStatusTone(p.status)" />
              </div>
            </li>
          </ul>
          <p class="cd-foot">Hanya pembayaran terkonfirmasi yang dihitung.</p>
        </section>
      </template>

      <!-- SPK -->
      <template v-else-if="activeTab === 'spk'">
        <!-- Marketing mengajukan SPK dari sini; klien dan kaveling langsung terisi di form. -->
        <section v-if="role === 'marketing'" class="cd-card" aria-labelledby="cd-apply-title">
          <div class="cd-apply-head">
            <h3 id="cd-apply-title">Ajukan SPK</h3>
            <p v-if="!detail.spks.length">Klien ini belum punya SPK.</p>
          </div>
          <ul v-if="applyLots.length" class="cd-apply-list" aria-label="Kaveling yang diminati dan tersedia">
            <li v-for="item in applyLots" :key="item.id">
              <div class="cd-apply-lot">
                <strong>{{ item.lotNumber }}</strong>
                <span>{{ item.block }} · {{ item.payment }} · {{ formatRupiah(item.price) }}</span>
                <span v-if="item.holdNote" class="cd-apply-hold">{{ item.holdNote }}</span>
              </div>
              <button v-if="!item.holdNote" type="button" class="cd-btn-soft" :aria-label="`Ajukan SPK kaveling ${item.lotNumber}`" @click="openSpkForm(item.id)">
                Ajukan
              </button>
            </li>
          </ul>
          <button type="button" :class="applyLots.length ? 'cd-apply-more' : 'cd-apply-main'" @click="pickLot">
            {{ applyLots.length ? 'Pilih kaveling lain' : 'Pilih kaveling' }}
            <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
          </button>
        </section>
        <StatusIllustration v-else-if="!detail.spks.length" variant="empty-data" size="sm" title="Belum ada SPK" description="Pengajuan klien muncul di sini." />
        <article v-for="spk in detail.spks" :key="spk.id" class="cd-card">
          <div class="cd-lot-head cd-lot-head--line">
            <div class="cd-tx-title">
              <strong>{{ spk.spk_number }}</strong>
              <span>Kaveling {{ spk.lot?.lot_number || '-' }} · diajukan {{ formatDate(spk.submitted_at) }} ({{ spk.submission_source }})</span>
            </div>
            <StatusBadge :label="spkLabel(spk.status)" :tone="spkTone(spk.status)" />
          </div>
          <div class="cd-grid">
            <div><span>Nominal SPK</span><strong>{{ formatRupiah(spk.booking_fee_snapshot) }}</strong></div>
            <div><span>Harga kaveling</span><strong>{{ formatRupiah(spk.lot_price_snapshot) }}</strong></div>
            <div><span>Metode</span><strong>{{ spk.payment_method === 'Cash' ? 'Tunai' : `Cicilan ${spk.months || ''}x` }}</strong></div>
            <div v-if="spk.admin_note"><span>Catatan Admin</span><strong>{{ spk.admin_note }}</strong></div>
          </div>
          <AppNotice v-if="spk.status === 'Rejected'" tone="error" title="Alasan penolakan">
            <p>{{ spk.rejection_reason || 'Tidak dicantumkan' }}</p>
            <p>Bantu klien memperbaiki data, lalu ajukan ulang.</p>
          </AppNotice>
          <div v-if="spk.status === 'Approved'" class="cd-sub">
            <h4>Tahapan proses</h4>
            <SpkProcessTimeline :spk-id="spk.id" mode="view" />
          </div>
          <details class="cd-more">
            <summary>Riwayat pemeriksaan ({{ spk.history.length }})</summary>
            <ol class="mk-timeline cd-sub">
              <li v-for="h in spk.history" :key="h.id">
                <strong>{{ h.old_status ? `${spkLabel(h.old_status)} → ${spkLabel(h.new_status)}` : spkLabel(h.new_status) }}</strong>
                <span class="mk-muted">{{ formatDate(h.created_at, true) }} · {{ actorName(h.changed_by) }}</span>
                <p v-if="h.note">{{ h.note }}</p>
              </li>
            </ol>
          </details>
        </article>
      </template>

      <!-- Progres -->
      <section v-else-if="activeTab === 'crm'" class="cd-card">
        <div class="cd-card-head"><h3>Riwayat progres</h3></div>
        <ol v-if="crmTimeline.length" class="mk-timeline">
          <li v-for="item in crmTimeline" :key="item.key">
            <strong>{{ item.title }}</strong>
            <span class="mk-muted">{{ formatDate(item.at, true) }} · {{ actorName(item.actor) }}</span>
            <p v-if="item.body">{{ item.body }}</p>
          </li>
        </ol>
        <p v-else class="cd-foot">Belum ada riwayat.</p>
      </section>

      <!-- Catatan -->
      <template v-else-if="activeTab === 'notes'">
        <section class="cd-card">
          <div class="cd-card-head">
            <h3>Catatan dan arahan</h3>
            <button type="button" class="cd-btn-soft" @click="openNote">
              <ion-icon :icon="addOutline" aria-hidden="true" /> {{ role === 'head' ? 'Arahan' : 'Catatan' }}
            </button>
          </div>
          <StatusIllustration v-if="!detail.notes.length" variant="empty-data" size="sm" title="Belum ada catatan" description="Tambahkan catatan pertama." />
          <div v-else class="cd-stack">
            <article v-for="note in detail.notes" :key="note.id" :class="['cd-lot', 'cd-note-card', { 'is-head': actorRole(note.created_by) === 'marketing_head' }]">
              <div class="cd-lot-head">
                <strong>{{ note.title || followupLabel(note.category) }}</strong>
                <StatusBadge :label="actorRole(note.created_by) === 'marketing_head' ? 'Kepala Bagian' : actorRole(note.created_by) === 'admin' ? 'Admin' : 'Pemasar'" :tone="actorRole(note.created_by) === 'marketing_head' ? 'gold' : 'neutral'" />
              </div>
              <p>{{ note.content || note.note }}</p>
              <span class="cd-meta">{{ followupLabel(note.category) }} · {{ actorName(note.created_by) }} · {{ formatDate(note.created_at, true) }}</span>
            </article>
          </div>
        </section>
        <section class="cd-card">
          <div class="cd-card-head"><h3>Riwayat tindak lanjut</h3></div>
          <p v-if="!detail.followups.length" class="cd-foot">Belum ada tindak lanjut.</p>
          <ol v-else class="mk-timeline">
            <li v-for="f in detail.followups" :key="f.id">
              <strong>{{ followupLabel(f.method) }} · {{ followupLabel(f.status) }}</strong>
              <span class="mk-muted">{{ formatDate(f.followup_date) }} · {{ actorName(f.user_id) }}<template v-if="f.next_followup_date"> · jadwal berikut {{ formatDate(f.next_followup_date) }}</template></span>
              <p v-if="f.notes">{{ f.notes }}</p>
            </li>
          </ol>
        </section>
      </template>

      <!-- Komisi -->
      <template v-else-if="activeTab === 'commission'">
        <StatusIllustration v-if="!detail.commissions.length" variant="empty-data" size="sm" title="Belum ada komisi" description="Muncul setelah SPK klien disetujui Admin." />
        <article v-for="cm in detail.commissions" :key="cm.id" class="cd-card">
          <div class="cd-lot-head cd-lot-head--line">
            <div class="cd-tx-title">
              <strong>{{ formatRupiah(cm.commission_amount) }}</strong>
              <span>{{ actorName(cm.marketing_id) }}</span>
            </div>
            <StatusBadge :label="commissionStatusLabel(cm.status)" :tone="commissionStatusTone(cm.status)" />
          </div>
          <div class="cd-grid">
            <div><span>Jenis</span><strong>{{ cm.commission_type }}<template v-if="cm.commission_rate != null"> ({{ Number(cm.commission_rate) }}%)</template></strong></div>
            <div><span>Dasar perhitungan</span><strong>{{ formatRupiah(cm.base_amount) }}</strong></div>
            <div><span>Dibayarkan</span><strong>{{ cm.paid_at ? formatDate(cm.paid_at) : 'Belum' }}</strong></div>
          </div>
        </article>
      </template>
    </div>

    <p class="cd-readonly">Admin mengonfirmasi SPK serta mengurus pembayaran, jadwal, dan pengembalian dana.</p>

    <!-- Modal: status perkembangan -->
    <AppModal v-model="statusModal" title="Ubah status klien" confirm-text="Simpan status" :loading="saving" @confirm="saveStatus">
      <div class="mk-form">
        <label class="mk-field">
          <span>Status</span>
          <select v-model="statusForm.status" class="mk-input">
            <option v-for="s in CRM_STATUSES" :key="s" :value="s">{{ crmStatusLabel(s) }}</option>
          </select>
          <small>Tidak mengubah status SPK atau pembayaran.</small>
        </label>
        <label class="mk-field">
          <span>Catatan (opsional)</span>
          <textarea v-model="statusForm.note" class="mk-input" maxlength="2000" placeholder="Contoh: Klien setuju survei lokasi Sabtu depan." />
        </label>
        <AppNotice v-if="formError" tone="error">
          {{ formError }}
        </AppNotice>
      </div>
    </AppModal>

    <!-- Modal: follow-up -->
    <AppModal v-model="followupModal" title="Catat tindak lanjut" confirm-text="Simpan" :loading="saving" @confirm="saveFollowup">
      <div class="mk-form">
        <div class="mk-filters">
          <label class="mk-field"><span>Tanggal</span><input v-model="followupForm.followup_date" type="date" class="mk-input" /></label>
          <label class="mk-field">
            <span>Metode</span>
            <select v-model="followupForm.method" class="mk-input"><option v-for="m in FOLLOWUP_METHODS" :key="m" :value="m">{{ followupLabel(m) }}</option></select>
          </label>
          <label class="mk-field">
            <span>Hasil</span>
            <select v-model="followupForm.status" class="mk-input"><option v-for="r in FOLLOWUP_RESULTS" :key="r" :value="r">{{ followupLabel(r) }}</option></select>
          </label>
          <label class="mk-field"><span>Tindak lanjut berikutnya</span><input v-model="followupForm.next_followup_date" type="date" class="mk-input" /></label>
        </div>
        <label class="mk-field">
          <span>Catatan</span>
          <textarea v-model="followupForm.notes" class="mk-input" maxlength="2000" />
        </label>
        <AppNotice v-if="formError" tone="error">
          {{ formError }}
        </AppNotice>
      </div>
    </AppModal>

    <!-- Modal: catatan -->
    <AppModal v-model="noteModal" :title="role === 'head' ? 'Beri arahan ke pemasar' : 'Tambah catatan'" confirm-text="Simpan catatan" :loading="saving" @confirm="saveNote">
      <div class="mk-form">
        <label class="mk-field"><span>Judul</span><input v-model="noteForm.title" class="mk-input" maxlength="120" /></label>
        <label class="mk-field">
          <span>Kategori</span>
          <select v-model="noteForm.category" class="mk-input"><option v-for="cat in NOTE_CATEGORIES" :key="cat" :value="cat">{{ followupLabel(cat) }}</option></select>
        </label>
        <label class="mk-field"><span>Isi</span><textarea v-model="noteForm.content" class="mk-input" maxlength="4000" /></label>
        <AppNotice v-if="formError" tone="error">
          {{ formError }}
        </AppNotice>
      </div>
    </AppModal>

    <!-- Modal: edit informasi -->
    <AppModal v-model="editModal" title="Ubah data klien" confirm-text="Simpan perubahan" :loading="saving" @confirm="saveEdit">
      <div class="mk-form">
        <label class="mk-field"><span>Nama lengkap</span><input v-model="editForm.full_name" data-input="name" class="mk-input" /></label>
        <div class="mk-filters">
          <label class="mk-field"><span>Nomor telepon</span><input v-model="editForm.phone" class="mk-input" inputmode="tel" /></label>
          <label class="mk-field"><span>WhatsApp</span><input v-model="editForm.whatsapp_phone" class="mk-input" inputmode="tel" /></label>
        </div>
        <label class="mk-field"><span>Email</span><input v-model="editForm.email" class="mk-input" type="email" /></label>
        <AddressFields v-model="editAddress" />
        <p class="mk-muted">Hanya Admin yang bisa memindahkan pemasar.</p>
        <AppNotice v-if="formError" tone="error">
          {{ formError }}
        </AppNotice>
      </div>
    </AppModal>
  </template>
</template>

<script setup lang="ts">
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import AppNotice from '@/components/ui/AppNotice.vue'
import { useToast } from '@/composables/useToast'
import SpkProcessTimeline from '@/components/spk/SpkProcessTimeline.vue'
import IdentityInfo from '@/components/identity/IdentityInfo.vue'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import SkeletonDetailHeader from '@/components/ui/skeletons/SkeletonDetailHeader.vue'
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { IonIcon, useIonRouter } from '@ionic/vue'
import { addOutline, callOutline, chatbubblesOutline, chevronForwardOutline, createOutline, flagOutline } from 'ionicons/icons'
import AppModal from '@/components/ui/AppModal.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import WhatsAppButton from './WhatsAppButton.vue'
import AddressFields from './AddressFields.vue'
import { addressColumns, addressFromRecord, emptyAddress, missingAddressFields } from '@/utils/address'
import {
  FOLLOWUP_METHODS,
  FOLLOWUP_RESULTS,
  NOTE_CATEGORIES,
  addFollowup,
  addNote,
  findContactConflict,
  getClientDetail,
  updateClientInfo,
  updateCrmStatus,
  type ClientDetail,
} from '@/services/marketing/marketingCrmService'
import {
  CRM_STATUSES,
  CRM_TONE,
  crmStatusLabel,
  followupLabel,
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
import { getLotsHeldBySpkSafe, lotHoldNote, type HeldLots } from '@/services/lotHoldService'

const props = withDefaults(defineProps<{ customerId: number; role: 'marketing' | 'head'; viewerName?: string }>(), { viewerName: '' })
const router = useIonRouter()

type TabId = 'info' | 'lot' | 'spk' | 'crm' | 'notes' | 'commission'
/* Urutan dan nama tab mengikuti detail klien admin; SPK, progres, dan komisi khusus tim Marketing. */
const tabs = computed<Array<{ id: TabId; label: string }>>(() => [
  { id: 'info', label: 'Informasi' },
  { id: 'lot', label: `Kaveling (${(detail.value?.interests.length ?? 0) + (detail.value?.transactions.length ?? 0)})` },
  { id: 'spk', label: 'SPK' },
  { id: 'crm', label: 'Progres' },
  { id: 'notes', label: 'Catatan' },
  { id: 'commission', label: 'Komisi' },
])
const activeTab = ref<TabId>('info')

const detail = ref<ClientDetail | null>(null)
const loading = ref(true)
const loaded = ref(false)
const error = ref('')
const saving = ref(false)
const formError = ref('')
const toast = useToast()

const c = computed(() => detail.value?.customer ?? {})
const callNumber = computed(() => String(c.value.phone || c.value.whatsapp_phone || '').replace(/[^\d+]/g, ''))

const crmTimeline = computed(() => {
  if (!detail.value) return []
  const crm = detail.value.crmHistory.map((h: any) => ({
    key: `crm-${h.id}`,
    at: h.created_at,
    actor: h.changed_by,
    title: !h.old_status ? `Klien ditambahkan (${crmStatusLabel(h.new_status)})` : h.old_status === h.new_status ? `Catatan progres (${crmStatusLabel(h.new_status)})` : `${crmStatusLabel(h.old_status)} → ${crmStatusLabel(h.new_status)}`,
    body: h.note,
  }))
  const fu = detail.value.followups.map((f: any) => ({
    key: `fu-${f.id}`,
    at: f.created_at,
    actor: f.user_id,
    title: `Tindak lanjut ${followupLabel(f.method)}: ${followupLabel(f.status)}`,
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
function lotStatusClass(status?: string | null) {
  if (status === 'Available') return 'is-available'
  if (status === 'Booking' || status === 'Booked') return 'is-booking'
  if (status === 'Sold') return 'is-sold'
  if (status === 'Cancelled') return 'is-cancelled'
  return 'is-unknown'
}
function isPromo(lot: any) {
  return lot?.promo_price != null && lot?.cash_price != null && Number(lot.promo_price) < Number(lot.cash_price)
}
function lotPrice(lot: any) {
  return isPromo(lot) ? lot.promo_price : lot?.cash_price ?? lot?.promo_price ?? null
}
/* Label status transaksi sama dengan admin: terjual tapi masih ada sisa = "Terjual · Belum Lunas". */
function txStatusLabel(tx: any) {
  const remaining = Number(tx.balance?.remaining ?? 0)
  if (tx.status === 'Sold' && remaining > 0) return 'Terjual · Belum Lunas'
  if (remaining <= 0 && Number(tx.final_price) > 0 && tx.status !== 'Cancelled') return 'Lunas'
  return transactionStatusLabel(tx.status)
}
function paidCount(tx: any) {
  return tx.schedules.filter((s: any) => s.status === 'Paid').length
}
function unpaidTotal(tx: any) {
  return tx.schedules.filter((s: any) => s.status !== 'Paid').reduce((a: number, s: any) => a + Number(s.amount), 0)
}
function penaltyTotal(tx: any) {
  return tx.schedules.reduce((a: number, s: any) => a + penaltyOf(s), 0)
}
function penaltyOf(schedule: any) {
  const penalty = Array.isArray(schedule.installment_penalties) ? schedule.installment_penalties[0] : schedule.installment_penalties
  return penalty && penalty.status !== 'Waived' ? Number(penalty.amount || 0) : 0
}

/* Pengajuan SPK oleh Marketing: kaveling diminati yang masih tersedia, ditandai bila sedang ditahan SPK lain. */
const heldLots = ref<HeldLots>(new Map())
const applyLots = computed(() => {
  const seen = new Set<number>()
  return (detail.value?.interests ?? [])
    .filter((interest: any) => interest.lot?.id && interest.lot.status === 'Available')
    .filter((interest: any) => !seen.has(interest.lot.id) && Boolean(seen.add(interest.lot.id)))
    .map((interest: any) => ({
      id: Number(interest.lot.id),
      lotNumber: interest.lot.lot_number || '-',
      block: blockName(interest.lot),
      payment: interest.payment_type === 'Installment' ? 'Cicilan' : 'Tunai',
      price: lotPrice(interest.lot),
      holdNote: lotHoldNote(heldLots.value, Number(interest.lot.id)),
    }))
})
function openSpkForm(lotId: number) {
  router.push(`/marketing/spk?lot_id=${lotId}&customer_id=${props.customerId}`)
}
function pickLot() {
  router.push(`/kavling?customer_id=${props.customerId}`)
}

async function load({ silent = false }: LoadOptions = {}) {
  if (!loaded.value) loading.value = true
  error.value = ''
  try {
    const [result, held] = await Promise.all([
      getClientDetail(props.customerId),
      props.role === 'marketing' ? getLotsHeldBySpkSafe() : Promise.resolve<HeldLots>(new Map()),
    ])
    detail.value = result
    heldLots.value = held
    loaded.value = true
  } catch (cause) {
    if (!silent || !loaded.value) error.value = cause instanceof Error ? cause.message : 'Periksa koneksi, lalu coba lagi.'
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
  if (statusForm.status === c.value.crm_status && !statusForm.note.trim()) {
    statusModal.value = false
    toast.info('Tidak ada perubahan.')
    return
  }
  saving.value = true
  formError.value = ''
  try {
    await updateCrmStatus(props.customerId, statusForm.status, statusForm.note)
    statusModal.value = false
    toast.success('Status tersimpan.')
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
    formError.value = 'Tanggal wajib diisi.'
    return
  }
  if (followupForm.next_followup_date && followupForm.next_followup_date < followupForm.followup_date) {
    formError.value = 'Tindak lanjut berikutnya tidak boleh sebelum tanggal ini.'
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
    toast.success('Tindak lanjut tersimpan.')
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
    toast.success('Catatan tersimpan.')
    await load()
  } catch (cause) {
    formError.value = describe(cause)
  } finally {
    saving.value = false
  }
}

// --- edit
const editModal = ref(false)
const editForm = reactive({ full_name: '', phone: '', whatsapp_phone: '', email: '' })
const editAddress = ref(emptyAddress())
let originalAddress = ''
function openEdit() {
  formError.value = ''
  Object.assign(editForm, {
    full_name: c.value.full_name || '',
    phone: c.value.phone || '',
    whatsapp_phone: c.value.whatsapp_phone || '',
    email: c.value.email || '',
  })
  editAddress.value = addressFromRecord(c.value)
  originalAddress = JSON.stringify(editAddress.value)
  editModal.value = true
}
async function saveEdit() {
  formError.value = ''
  if (editForm.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(editForm.email.trim())) {
    formError.value = 'Format email tidak valid.'
    return
  }
  /* Data lama boleh belum lengkap. Alamat divalidasi dan ditulis ulang hanya bila diubah. */
  const addressChanged = JSON.stringify(editAddress.value) !== originalAddress
  if (addressChanged) {
    const missing = missingAddressFields(editAddress.value)
    if (missing.length) {
      formError.value = `Lengkapi alamat: ${missing.join(', ')}.`
      return
    }
  }
  const infoChanged =
    editForm.full_name.trim() !== (c.value.full_name || '') ||
    editForm.phone.trim() !== (c.value.phone || '') ||
    editForm.whatsapp_phone.trim() !== (c.value.whatsapp_phone || '') ||
    editForm.email.trim() !== (c.value.email || '')
  if (!infoChanged && !addressChanged) {
    editModal.value = false
    toast.info('Tidak ada perubahan.')
    return
  }
  saving.value = true
  try {
    const contactChanged = editForm.phone !== (c.value.phone || '') || editForm.whatsapp_phone !== (c.value.whatsapp_phone || '')
    if (contactChanged) {
      const conflict = await findContactConflict(editForm.phone, editForm.whatsapp_phone, props.customerId)
      if (conflict) {
        formError.value = conflict.message
        return
      }
    }
    await updateClientInfo(props.customerId, {
      full_name: editForm.full_name.trim(),
      phone: editForm.phone.trim() || null,
      whatsapp_phone: editForm.whatsapp_phone.trim() || null,
      email: editForm.email.trim() || null,
      notes: c.value.notes ?? null,
      ...(addressChanged ? addressColumns(editAddress.value) : {}),
    })
    editModal.value = false
    toast.success('Data klien tersimpan.')
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

useRealtimeRefresh(
  ['customers', 'customer_followups', 'customer_notes', 'customer_interests', 'customer_crm_status_history', 'customer_identities', 'lot_transactions', 'spk_requests', 'payments', 'installment_schedules', 'survey_requests', 'lots'],
  () => load({ silent: true }), { pauseWhen: () => saving.value || statusModal.value || followupModal.value || noteModal.value || editModal.value },
)

</script>

<style scoped>
/* Hero dan ubin aksi: pola yang sama dengan detail klien admin. */
.cd-hero { display: flex; align-items: center; gap: 14px; margin-bottom: 16px; }
.cd-avatar { display: grid; place-items: center; flex: 0 0 58px; width: 58px; height: 58px; border-radius: 50%; background: var(--poliland-gold-soft); color: var(--poliland-gold-text); font-weight: var(--font-weight-bold); }
.cd-hero-copy { display: grid; justify-items: start; gap: 3px; min-width: 0; flex: 1; }
.cd-hero-copy h2 { margin: 0; font-size: 18px; font-weight: var(--font-weight-extrabold); overflow-wrap: anywhere; }
.cd-hero-copy p { margin: 0; color: var(--text-secondary); font-size: 12px; }
.cd-hero-spk { margin-top: 3px; }
.cd-hero-status { align-self: flex-start; flex: none; }

.cd-actions { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 9px; margin-bottom: 12px; }
.cd-action {
  display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;
  min-height: 58px; padding: 0 4px;
  border: 1px solid var(--border-default); border-radius: var(--radius-control);
  background: var(--surface-primary); color: var(--text-primary);
  font: inherit; font-size: 11px; text-decoration: none; cursor: pointer;
  touch-action: manipulation; user-select: none; -webkit-user-select: none; -webkit-touch-callout: none;
  transition: transform var(--dur-instant) var(--ease-out);
}
.cd-action ion-icon { color: var(--poliland-green); font-size: 20px; }
.cd-action:active { transform: scale(0.97); transition-timing-function: var(--ease-spring); }
.cd-action:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.cd-action.is-disabled { opacity: 0.55; pointer-events: none; }

/* Tab bergaris bawah; bisa digeser karena jumlahnya enam. */
.cd-tabs {
  display: flex; overflow-x: auto; scrollbar-width: none;
  margin: 0 calc(var(--page-gutter, 16px) * -1); padding: 0 var(--page-gutter, 16px);
  border-bottom: 1px solid var(--border-default);
  touch-action: pan-x pan-y;
}
.cd-tabs::-webkit-scrollbar { display: none; }
.cd-tabs button {
  flex: 1 0 auto; min-height: 44px; padding: 0 12px;
  border: 0; border-bottom: 2px solid transparent; background: transparent;
  color: var(--text-secondary); font: inherit; font-size: 12px; font-weight: var(--font-weight-semibold); white-space: nowrap;
  touch-action: manipulation; user-select: none; -webkit-user-select: none;
  transition: color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out);
}
.cd-tabs button.active { border-bottom-color: var(--poliland-gold); color: var(--poliland-gold-text); }
.cd-tabs button:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: -3px; }

.cd-panel { animation: cd-panel-in var(--dur-base) var(--ease-out) backwards; }
@keyframes cd-panel-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }

/* Kartu isi */
.cd-card { display: grid; gap: 12px; margin-top: 14px; padding: 16px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.cd-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.cd-card-head h3 { margin: 0; font-size: 16px; font-weight: var(--font-weight-extrabold); }
.cd-btn-soft {
  display: inline-flex; align-items: center; gap: 5px; min-height: 44px; padding: 0 12px;
  border: 1px solid var(--poliland-green); border-radius: var(--radius-control);
  background: var(--status-success-bg); color: var(--poliland-green);
  font: inherit; font-size: 12px; font-weight: var(--font-weight-bold); cursor: pointer;
  touch-action: manipulation; user-select: none; -webkit-user-select: none;
  transition: transform var(--dur-instant) var(--ease-out);
}
.cd-btn-soft ion-icon { font-size: 15px; }
.cd-btn-soft:active { transform: scale(0.97); transition-timing-function: var(--ease-spring); }
.cd-btn-soft:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.cd-btn-end { justify-self: end; }

/* Ajukan SPK (Marketing) */
.cd-apply-head { display: grid; gap: 2px; }
.cd-apply-head h3 { margin: 0; font-size: 16px; font-weight: var(--font-weight-extrabold); }
.cd-apply-head p { margin: 0; color: var(--text-secondary); font-size: 13px; }
.cd-apply-list { display: grid; margin: 0; padding: 0; list-style: none; border-top: 1px solid var(--border-default); }
.cd-apply-list li { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-default); }
.cd-apply-lot { display: grid; gap: 2px; min-width: 0; }
.cd-apply-lot strong { font-size: 15px; }
.cd-apply-lot span { color: var(--text-secondary); font-size: 12px; }
.cd-apply-lot .cd-apply-hold { color: var(--poliland-gold-text); font-weight: var(--font-weight-bold); }
.cd-apply-main,
.cd-apply-more {
  display: inline-flex; align-items: center; justify-content: center; gap: 6px; min-height: 48px;
  border-radius: var(--radius-control); font: inherit; font-size: 14px; font-weight: var(--font-weight-bold);
  cursor: pointer; touch-action: manipulation; user-select: none; -webkit-user-select: none;
  transition: transform var(--dur-instant) var(--ease-out);
}
/* Putih di atas --poliland-green: 8,3:1. */
.cd-apply-main { width: 100%; border: 0; background: var(--poliland-green); color: #fff; }
.cd-apply-more { justify-self: start; min-height: 44px; padding: 0 4px; border: 0; background: none; color: var(--poliland-green); }
.cd-apply-main ion-icon,
.cd-apply-more ion-icon { font-size: 16px; }
.cd-apply-main:active,
.cd-apply-more:active { transform: scale(0.97); transition-timing-function: var(--ease-spring); }
.cd-apply-main:focus-visible,
.cd-apply-more:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }

.cd-info { display: grid; margin: 0; overflow: hidden; border: 1px solid var(--border-default); border-radius: var(--radius-control); }
.cd-info > div { display: grid; gap: 5px; min-width: 0; padding: 12px 13px; border-bottom: 1px solid var(--border-default); }
.cd-info > div:last-child { border-bottom: 0; }
.cd-info dt { color: var(--text-secondary); font-size: 11px; font-weight: var(--font-weight-medium); }
.cd-info dd { margin: 0; color: var(--text-primary); font-size: 13px; font-weight: var(--font-weight-semibold); line-height: 1.55; overflow-wrap: anywhere; }

.cd-stack { display: grid; gap: 10px; }
.cd-lot { display: grid; gap: 12px; min-width: 0; padding: 14px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-muted); }
.cd-lot-head { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.cd-lot-head--line { padding-bottom: 11px; border-bottom: 1px solid var(--border-default); }
.cd-lot-id { display: flex; align-items: center; gap: 8px; min-width: 0; }
.cd-lot-id strong { font-size: 15px; font-weight: var(--font-weight-extrabold); }
.cd-pill { padding: 3px 9px; border: 1px solid var(--border-default); border-radius: 7px; background: var(--surface-primary); color: var(--poliland-green); font-size: 11px; font-weight: var(--font-weight-bold); }
.cd-tx-title { display: grid; gap: 2px; min-width: 0; }
.cd-tx-title strong { font-size: 15px; font-weight: var(--font-weight-extrabold); overflow-wrap: anywhere; }
.cd-tx-title span { color: var(--text-secondary); font-size: 12px; overflow-wrap: anywhere; }

.cd-chip { display: inline-flex; align-items: center; min-height: 25px; padding: 3px 9px; border: 1px solid var(--border-default); border-radius: 8px; background: var(--surface-primary); color: var(--text-secondary); font-size: 10px; font-weight: var(--font-weight-bold); white-space: nowrap; }
.cd-chip.is-available { border-color: color-mix(in srgb, var(--status-success) 35%, var(--border-default)); background: var(--status-success-bg); color: var(--status-success); }
.cd-chip.is-booking { border-color: color-mix(in srgb, var(--status-warning) 45%, var(--border-default)); background: #fbf4e5; color: var(--poliland-gold-text); }
/* #a8322d di atas #fdf0ef = 5,97:1 (DESIGN.md §14). */
.cd-chip.is-sold { border-color: color-mix(in srgb, var(--status-danger) 30%, var(--border-default)); background: #fdf0ef; color: #a8322d; }
.cd-chip.is-cancelled, .cd-chip.is-unknown { background: var(--surface-muted); }

.cd-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 10px; padding: 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); }
.cd-grid > div { display: grid; gap: 3px; min-width: 0; }
.cd-grid span { color: var(--text-secondary); font-size: 11px; }
.cd-grid strong { color: var(--text-primary); font-size: 13px; font-weight: var(--font-weight-bold); overflow-wrap: anywhere; }
.cd-ok { color: var(--poliland-green) !important; }

.cd-more summary {
  display: flex; align-items: center; width: fit-content; min-height: 44px;
  color: var(--poliland-green); font-size: 12px; font-weight: var(--font-weight-bold);
  cursor: pointer; list-style: none; touch-action: manipulation;
}
.cd-more summary::-webkit-details-marker { display: none; }
.cd-more summary::after { content: ''; width: 7px; height: 7px; margin-left: 8px; border-right: 2px solid currentColor; border-bottom: 2px solid currentColor; transform: rotate(45deg) translateY(-2px); transition: transform var(--dur-fast) var(--ease-out); }
.cd-more[open] summary::after { transform: rotate(225deg) translateY(-2px); }
.cd-more summary:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; border-radius: 4px; }
.cd-dl { display: grid; gap: 6px; margin: 0; padding: 10px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); }
.cd-dl div { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; }
.cd-dl dt { color: var(--text-secondary); }
.cd-dl dd { margin: 0; font-weight: var(--font-weight-semibold); text-align: right; }

.cd-rows { display: grid; margin: 0; padding: 0; list-style: none; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); overflow: hidden; }
.cd-rows li { display: flex; justify-content: space-between; gap: 10px; padding: 11px 12px; border-bottom: 1px solid var(--border-default); }
.cd-rows li:last-child { border-bottom: 0; }
.cd-rows li > div { display: grid; gap: 2px; min-width: 0; }
.cd-rows strong { font-size: 13px; overflow-wrap: anywhere; }
.cd-rows span { color: var(--text-secondary); font-size: 11px; overflow-wrap: anywhere; }
.cd-rows .cd-note { color: var(--text-primary); }
.cd-row-end { justify-items: end; text-align: right; flex: none; }

.cd-foot { margin: 0; color: var(--text-secondary); font-size: 12px; }

.cd-sub { margin-top: 4px; }
.cd-sub h4 { margin: 0 0 10px; font-size: 14px; }
.cd-note-card p { margin: 0; font-size: 14px; white-space: pre-wrap; }
.cd-note-card.is-head { border-color: var(--poliland-gold); background: #fffaf0; }
.cd-meta { color: var(--text-secondary); font-size: 11px; }
.cd-readonly { margin: 18px 0 0; color: var(--text-secondary); font-size: 12px; text-align: center; }
.mk-form { display: grid; gap: 12px; }

@media (max-width: 360px) {
  .cd-actions { gap: 6px; }
  .cd-grid { grid-template-columns: 1fr; }
  .cd-hero { flex-wrap: wrap; }
}

@media (prefers-reduced-motion: reduce) {
  .cd-panel { animation: cd-fade var(--dur-fast) linear backwards; }
  .cd-action:active, .cd-btn-soft:active { transform: none; }
}
@keyframes cd-fade { from { opacity: 0; } to { opacity: 1; } }
</style>
