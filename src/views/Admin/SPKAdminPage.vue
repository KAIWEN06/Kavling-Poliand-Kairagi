<template>
  <ion-page class="admin-spk-page">
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />
    <ion-content :fullscreen="true">
      <main class="spk-shell">
        <Reveal :order="1">
          <section class="spk-stats" aria-label="Ringkasan pengajuan SPK">
            <button v-for="item in statCards" :key="item.key" type="button"
              :class="['spk-stat', { 'spk-stat-active': selectedStatus === item.filter }]"
              @click="selectedStatus = item.filter">
              <span>{{ item.label }}</span><strong>{{ stats[item.key] }}</strong>
            </button>
          </section>
        </Reveal>

        <Reveal :order="2">
          <section class="spk-toolbar">
            <label class="spk-search">
              <ion-icon :icon="searchOutline" />
              <input v-model="searchQuery" type="search" placeholder="Cari nomor SPK, pembeli, pemasar, kaveling..." />
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
        </Reveal>

        <SkeletonCardList v-if="loading" :count="3" :lines="3" label="Memuat pengajuan SPK" />
        <div v-else-if="errorMessage" class="spk-state spk-error" role="alert">
          <ion-icon :icon="alertCircleOutline" /><strong>Data SPK gagal dimuat</strong><p>{{ errorMessage }}</p>
          <AppButton size="small" @click="loadRequests()">Coba lagi</AppButton>
        </div>

        <template v-else>
          <div id="spk-list-top" class="spk-list-head"><h2>Daftar Pengajuan</h2><span>{{ filteredRequests.length }} pengajuan</span></div>
          <section v-if="filteredRequests.length" class="spk-list">
            <article v-for="request in pager.items" :key="request.id" class="spk-card">
              <div class="spk-card-top">
                <div><span class="spk-number">{{ request.spk_number }}</span><time>{{ formatDate(request.created_at) }}</time></div>
                <span :class="['spk-status', `status-${request.status.toLowerCase().replaceAll(' ', '-')}`]">{{ statusLabel(request.status) }}</span>
              </div>
              <div class="spk-person">
                <div class="spk-avatar">{{ initials(request.customer_full_name) }}</div>
                <div class="spk-person-info"><strong>{{ request.customer_full_name }}</strong><span>{{ request.customer_phone }}</span><small>Sumber: {{ sourceLabel(request.submission_source) }}<template v-if="request.marketing_name"> · {{ request.marketing_name }}</template></small></div>
              </div>
              <div class="spk-card-meta">
                <div><span>Kaveling</span><strong>{{ request.lot_number }}</strong><small>{{ request.block_name }}</small></div>
                <div><span>Metode pembayaran</span><strong>{{ request.payment_method === 'Cash' ? 'Tunai' : 'Cicilan' }}</strong><small>{{ request.months ? `${request.months} bulan` : 'Sekali bayar' }}</small></div>
                <div><span>Harga pengajuan</span><strong>{{ formatCurrency(request.lot_price_snapshot) }}</strong><small>{{ request.documents.length }} dokumen</small></div>
              </div>
              <p v-if="request.status === 'Rejected' && request.rejection_reason" class="spk-rejection-preview">
                <strong>Alasan penolakan:</strong> {{ request.rejection_reason }}
              </p>
              <div class="spk-card-actions">
                <button v-if="request.status === 'Approved'" class="spk-detail-btn spk-review-btn" type="button" @click="goToReview(request)">Proses SPK <ion-icon :icon="chevronForwardOutline" /></button>
                <button class="spk-detail-btn" type="button" @click="openDetail(request)">Lihat detail <ion-icon :icon="chevronForwardOutline" /></button>
                <template v-if="isPending(request)">
                  <button class="spk-reject-btn" type="button" @click="openReject(request)">Tolak</button>
                  <button class="spk-approve-btn" type="button" :disabled="!canApproveSPK(request)" :title="approvalBlockReason(request)" @click="openApprove(request)">Setujui</button>
                </template>
              </div>
            </article>
          </section>
          <AppPagination v-model:page="pager.page" :total-pages="pager.totalPages" :total="pager.total" :page-size="pager.pageSize" scroll-to="#spk-list-top" label="Halaman daftar pengajuan SPK" />
          <StatusIllustration
            v-if="!filteredRequests.length"
            variant="no-result"
            title="Pengajuan SPK tidak ditemukan"
            description="Belum ada data yang sesuai dengan pencarian atau filter ini."
          />
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
          <dl><div><dt>Nama lengkap</dt><dd>{{ selectedRequest.customer_full_name }}</dd></div><div><dt>Nomor telepon</dt><dd>{{ selectedRequest.customer_phone }}</dd></div><div><dt>Email</dt><dd>{{ selectedRequest.customer_email || '-' }}</dd></div><div><dt>Alamat</dt><dd>{{ selectedRequest.customer_address || '-' }}</dd></div><div><dt>Pemasar</dt><dd>{{ selectedRequest.marketing_name }}</dd></div></dl>
          <IdentityInfo :customer-id="selectedRequest.customer_id" editable />
        </section>
        <section class="spk-detail-section"><h3>Informasi kaveling & pembayaran</h3>
          <dl><div><dt>Nomor kaveling</dt><dd>{{ selectedRequest.lot_number }} · {{ selectedRequest.block_name }}</dd></div><div><dt>Harga tercatat</dt><dd>{{ formatCurrency(selectedRequest.lot_price_snapshot) }}</dd></div><div><dt>Metode pembayaran</dt><dd>{{ selectedRequest.payment_method === 'Cash' ? 'Tunai' : 'Cicilan' }}</dd></div><div v-if="selectedRequest.months"><dt>Tenor</dt><dd>{{ selectedRequest.months }} bulan</dd></div><div v-if="selectedRequest.monthly_payment"><dt>Cicilan per bulan</dt><dd>{{ formatCurrency(selectedRequest.monthly_payment) }}</dd></div><div><dt>Catatan pemasar</dt><dd>{{ selectedRequest.notes || '-' }}</dd></div></dl>
        </section>
        <section class="spk-detail-section"><h3>Tanda jadi</h3>
          <div class="spk-booking-summary">
            <div><span>Status</span><strong>{{ bookingPaymentStatusLabel(selectedRequest) }}</strong></div>
            <div><span>Terverifikasi</span><strong>{{ formatCurrency(selectedRequest.booking_payment.confirmedAmount) }} / {{ formatCurrency(selectedRequest.booking_payment.requiredAmount) }}</strong></div>
            <p v-if="!canApproveSPK(selectedRequest)" class="spk-approval-hint">{{ approvalBlockReason(selectedRequest) }}</p>
            <p v-else class="spk-approval-ready">Tanda jadi sudah memenuhi syarat persetujuan.</p>
            <button
              v-if="!selectedRequest.booking_payment.isSatisfied"
              type="button"
              class="spk-booking-action"
              @click="goToBookingPayment(selectedRequest)"
            >
              <ion-icon :icon="cardOutline" aria-hidden="true" />
              {{ bookingPaymentActionLabel(selectedRequest) }}
              <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
            </button>
          </div>
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
        <section
          v-if="selectedRequest.status === 'Rejected' && selectedRequest.booking_payment.payments.length"
          class="spk-detail-section spk-refund-section"
        >
          <div class="spk-refund-heading">
            <div class="spk-refund-heading-icon"><ion-icon :icon="cardOutline" /></div>
            <div>
              <span class="spk-refund-eyebrow">PENYELESAIAN DANA</span>
              <h3>Pengembalian tanda jadi</h3>
              <p>Informasi dan bukti pengembalian dana kepada klien.</p>
            </div>
          </div>

          <div class="spk-refund-amount-card">
            <div>
              <span>Tanda jadi terkonfirmasi</span>
              <strong>{{ formatCurrency(selectedRequest.booking_payment.confirmedAmount) }}</strong>
            </div>
            <span
              :class="[
                'spk-refund-status',
                selectedRequest.booking_fee_refund?.status === 'Refunded' ? 'is-refunded' : 'is-pending'
              ]"
            >
              <ion-icon :icon="selectedRequest.booking_fee_refund?.status === 'Refunded' ? cardOutline : alertCircleOutline" />
              {{ selectedRequest.booking_fee_refund?.status === 'Refunded' ? 'Sudah dikembalikan' : 'Belum dicatat' }}
            </span>
          </div>

          <template v-if="selectedRequest.booking_fee_refund?.status === 'Refunded'">
            <div class="spk-refund-success">
              <div class="spk-refund-success-mark">✓</div>
              <div>
                <strong>Pengembalian berhasil dicatat</strong>
                <p>Dana sebesar {{ formatCurrency(selectedRequest.booking_fee_refund.amount) }} telah ditandai sebagai sudah dikembalikan.</p>
              </div>
            </div>

            <div class="spk-refund-info">
              <div v-if="selectedRequest.booking_fee_refund.refundedAt">
                <span>Waktu transfer (WITA)</span>
                <strong>{{ formatMakassarDateTime(selectedRequest.booking_fee_refund.refundedAt) }}</strong>
              </div>
              <div><span>Referensi bank</span><strong>{{ selectedRequest.booking_fee_refund.bankReference || 'Belum dicatat; perlu rekonsiliasi bank' }}</strong></div>
              <div v-if="selectedRequest.booking_fee_refund.refundMethod">
                <span>Metode pengembalian</span>
                <strong>{{ selectedRequest.booking_fee_refund.refundMethod }}</strong>
              </div>
              <div v-if="selectedRequest.booking_fee_refund.refundNote" class="spk-refund-note-row">
                <span>Catatan / nomor referensi</span>
                <p>{{ selectedRequest.booking_fee_refund.refundNote }}</p>
              </div>
            </div>

            <button
              v-if="selectedRequest.booking_fee_refund.proofPath"
              type="button"
              class="spk-refund-proof-button"
              @click="openRefundProof(selectedRequest)"
            >
              <ion-icon :icon="eyeOutline" />
              Lihat bukti
              <ion-icon :icon="chevronForwardOutline" />
            </button>
          </template>

          <template v-else>
            <div class="spk-refund-guidance">
              <ion-icon :icon="alertCircleOutline" />
              <p>Pastikan dana sudah benar-benar dikembalikan kepada klien sebelum menyimpan catatan ini. Bukti pengembalian wajib dilampirkan.</p>
            </div>

            <div class="spk-refund-form">
              <label>
                <span>Metode pengembalian <b>*</b></span>
                <input
                  v-model.trim="refundMethod"
                  type="text"
                  placeholder="Contoh: Transfer Bank BCA"
                  autocomplete="off"
                />
              </label>

              <label>
                <span>Waktu transfer (WITA) <b>*</b></span>
                <input v-model="refundTransferAt" type="datetime-local" required />
              </label>

              <label>
                <span>Referensi bank <small>(opsional, untuk rekonsiliasi)</small></span>
                <input v-model.trim="refundBankReference" type="text" placeholder="Nomor referensi transfer" autocomplete="off" />
              </label>

              <label>
                <span>Catatan / nomor referensi <small>(opsional)</small></span>
                <textarea
                  v-model.trim="refundNote"
                  rows="3"
                  placeholder="Masukkan nomor referensi transaksi atau keterangan tambahan"
                />
              </label>

              <label class="spk-refund-upload">
                <span>Bukti pengembalian <b>*</b></span>
                <span class="spk-refund-file-picker">
                  <span class="spk-refund-upload-icon"><ion-icon :icon="downloadOutline" /></span>
                  <span class="spk-refund-file-copy">
                    <strong>{{ refundFile?.name || 'Pilih file bukti pengembalian' }}</strong>
                    <small>{{ refundFile ? 'File siap diunggah' : 'JPG, PNG, WEBP, atau PDF · Maksimal 5 MB' }}</small>
                  </span>
                  <span class="spk-refund-choose">{{ refundFile ? 'Ganti' : 'Pilih file' }}</span>
                </span>
                <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" @change="onRefundFileChange" />
              </label>
            </div>

            <AppNotice v-if="refundError" tone="error">
              {{ refundError }}
            </AppNotice>

            <AppButton
              :disabled="refundSubmitting || !refundFile || !refundMethod.trim() || !refundTransferAt"
              @click="submitRefundProof(selectedRequest)"
            >
              {{ refundSubmitting ? 'Menyimpan...' : 'Simpan' }}
            </AppButton>
            <p class="spk-refund-footnote">Dengan menyimpan, Admin menyatakan pengembalian tanda jadi telah dilakukan dan bukti yang dilampirkan sesuai.</p>
          </template>
        </section>
        <div v-if="isPending(selectedRequest)" class="spk-detail-actions">
          <AppButton color="danger" @click="openReject(selectedRequest)">Tolak SPK</AppButton>
          <AppButton :disabled="!canApproveSPK(selectedRequest)" @click="openApprove(selectedRequest)">Setujui SPK</AppButton>
        </div>
      </div>
    </AppModal>

    <AppModal v-model="approveOpen" title="Setujui pengajuan SPK?" variant="dialog"
      :loading="saving" :confirm-disabled="!actionRequest || !canApproveSPK(actionRequest)" confirm-text="Ya, setujui" cancel-text="Batal" slide-confirm slide-label="Geser untuk menyetujui" confirm-variant="success" @confirm="confirmApprove">
      <div class="spk-confirm-copy"><p>SPK <strong>{{ actionRequest?.spk_number }}</strong> akan disetujui.</p><p>Status kaveling <strong>{{ actionRequest?.lot_number }}</strong> akan berubah menjadi <strong>Dipesan</strong>.</p><p>Pastikan data dan dokumen telah diperiksa. Persetujuan tidak dapat dilakukan jika kaveling sudah tidak tersedia.</p></div>
    </AppModal>

    <AppModal v-model="rejectOpen" title="Tolak pengajuan SPK" variant="dialog"
      :loading="saving" :confirm-disabled="!rejectionReason.trim()" confirm-text="Tolak SPK" confirm-variant="danger" slide-confirm slide-label="Geser untuk menolak SPK"
      cancel-text="Batal" @confirm="confirmReject">
      <div class="spk-reject-form"><p>Pilih kategori yang sesuai. Tanda jadi hanya dapat digunakan ulang jika penolakan terjadi karena kesalahan administratif.</p>
        <label>Kategori penolakan <b>*</b>
          <select v-model="rejectionCategory">
            <option value="Administrative Error">Kesalahan administratif / salah kaveling</option>
            <option value="Buyer Cancellation">Pembatalan oleh pembeli</option>
            <option value="Other">Alasan lainnya</option>
          </select>
        </label>
        <p v-if="rejectionCategory === 'Administrative Error'" class="spk-reuse-warning">Jika tanda jadi sudah dikonfirmasi bagian Keuangan, pembayaran akan tersedia untuk digunakan pada pengajuan SPK pengganti.</p>
        <label>Alasan penolakan <b>*</b><textarea v-model="rejectionReason" rows="4" maxlength="1000" placeholder="Tuliskan alasan penolakan..." /></label>
        <small>{{ rejectionReason.length }}/1000 karakter</small>
      </div>
    </AppModal>

    <AppModal
      v-model="createOpen"
      title="Buat SPK untuk Klien"
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
          <section class="spk-form-section">
            <h3>1. Pilih Klien</h3>
            <template v-if="selectedCustomer">
              <div class="spk-selected-customer">
                <strong>{{ selectedCustomer.full_name }}</strong>
                <span>Telepon: {{ selectedCustomer.phone || 'Tidak tersedia' }}</span>
                <span>WhatsApp: {{ selectedCustomer.whatsapp_phone || 'Tidak tersedia' }}</span>
                <span>Email: {{ selectedCustomer.email || 'Tidak tersedia' }}</span>
                <span>Alamat: {{ selectedCustomer.address || 'Tidak tersedia' }}</span>
              </div>
              <IdentityInfo :customer-id="selectedCustomer.id" editable @ready="identityReady = $event" />
              <button type="button" class="spk-cancel-customer" @click="clearSelectedCustomer">Batal pilih</button>
            </template>
            <template v-else>
              <div class="spk-customer-sources" aria-label="Sumber data klien">
                <button v-for="source in customerSourceOptions" :key="source.value" type="button"
                  :class="{ active: selectedCustomerSource === source.value }"
                  @click="changeCustomerSource(source.value)">{{ source.label }}</button>
              </div>
              <label class="spk-lot-search">Cari klien berdasarkan nama
                <input v-model.trim="customerSearchQuery" type="search" placeholder="Ketik nama klien..." />
              </label>
              <p v-if="customersLoading" class="spk-customer-state">Memuat daftar klien {{ selectedCustomerSource }}...</p>
              <div v-else class="spk-customer-picker">
                <button v-for="customer in filteredCustomers" :key="customer.id" type="button"
                  class="spk-customer-option" @click="selectCustomer(customer)">
                  <strong>{{ customer.full_name }}</strong>
                  <small>Telepon: {{ customer.phone || 'Tidak tersedia' }} · WhatsApp: {{ customer.whatsapp_phone || 'Tidak tersedia' }}</small>
                </button>
                <p v-if="!filteredCustomers.length" class="spk-customer-state">Klien dari sumber ini tidak ditemukan.</p>
              </div>
              <template v-if="selectedCustomerSource === 'Admin'">
                <button type="button" class="spk-add-customer-toggle" @click="showNewCustomerForm = !showNewCustomerForm">
                  {{ showNewCustomerForm ? 'Tutup form' : 'Klien baru' }}
                </button>
                <div v-if="showNewCustomerForm" class="spk-new-customer-form">
                <label>Nama lengkap <b>*</b><input v-model.trim="newCustomer.full_name" data-input="name" required placeholder="Nama sesuai KTP" /></label>
                <label>Nomor telepon biasa<input v-model.trim="newCustomer.phone" inputmode="tel" placeholder="Nomor telepon utama" /></label>
                <label>Nomor WhatsApp<input v-model.trim="newCustomer.whatsapp_phone" inputmode="tel" placeholder="Nomor WhatsApp" /></label>
                <label>Email<input v-model.trim="newCustomer.email" type="email" placeholder="email@contoh.com" /></label>
                <label>Negara
                  <select v-model="newCustomer.country_code" @change="onNewCustomerCountry">
                    <option v-for="country in addressCountries" :key="country.code" :value="country.code">{{ country.name }}</option>
                  </select>
                </label>
                <template v-if="newCustomerIsIndonesia">
                  <label>Provinsi
                    <select :value="newCustomer.province_code" :disabled="newCustomerRegionsLoading" @change="onNewCustomerProvince(($event.target as HTMLSelectElement).value)">
                      <option value="">Pilih provinsi</option>
                      <option v-for="region in newCustomerProvinces" :key="region.code" :value="region.code">{{ region.name }}</option>
                    </select>
                  </label>
                  <label>Kabupaten/Kota
                    <select :value="newCustomer.city_code" :disabled="!newCustomer.province_code || newCustomerRegionsLoading" @change="onNewCustomerCity(($event.target as HTMLSelectElement).value)">
                      <option value="">Pilih kabupaten/kota</option>
                      <option v-for="region in newCustomerCities" :key="region.code" :value="region.code">{{ region.name }}</option>
                    </select>
                  </label>
                  <label>Kecamatan
                    <select :value="newCustomer.district_code" :disabled="!newCustomer.city_code || newCustomerRegionsLoading" @change="onNewCustomerDistrict(($event.target as HTMLSelectElement).value)">
                      <option value="">Pilih kecamatan</option>
                      <option v-for="region in newCustomerDistricts" :key="region.code" :value="region.code">{{ region.name }}</option>
                    </select>
                  </label>
                  <label>Desa/Kelurahan
                    <select :value="newCustomer.village_code" :disabled="!newCustomer.district_code || newCustomerRegionsLoading" @change="onNewCustomerVillage(($event.target as HTMLSelectElement).value)">
                      <option value="">Pilih desa/kelurahan</option>
                      <option v-for="region in newCustomerVillages" :key="region.code" :value="region.code">{{ region.name }}</option>
                    </select>
                  </label>
                </template>
                <template v-else>
                  <label>Province/State<input v-model.trim="newCustomer.province_name" placeholder="Province / State" /></label>
                  <label>City<input v-model.trim="newCustomer.city_name" placeholder="City" /></label>
                  <label>District/Area<input v-model.trim="newCustomer.district_name" placeholder="District / Area" /></label>
                </template>
                <small v-if="newCustomerRegionsLoading" role="status">Memuat data wilayah...</small>
                <label>Detail alamat<textarea v-model.trim="newCustomer.street_address" rows="2" placeholder="Nama jalan, nomor rumah, gedung, dan detail lainnya" /></label>
                  <button type="button" class="spk-add-customer-save" :disabled="!newCustomer.full_name.trim() || (!newCustomer.phone.trim() && !newCustomer.whatsapp_phone.trim())" @click="saveNewCustomerForSPK">Simpan & pilih</button>
                </div>
              </template>
            </template>
          </section>

          <section class="spk-form-section">
            <h3>2. Minat Kaveling</h3>
            <label class="spk-lot-search">Cari kaveling
              <input v-model.trim="lotSearchQuery" type="search" placeholder="Cari nomor kaveling atau blok" />
            </label>
            <div class="spk-lot-list" role="group" aria-label="Pilih beberapa kaveling">
              <button v-for="lot in filteredAvailableLots" :key="lot.id" type="button"
                class="spk-lot-option" :class="{ selected: selectedLotIds.includes(lot.id) }"
                :aria-pressed="selectedLotIds.includes(lot.id)" @click="toggleLot(lot.id)">
                <span class="spk-lot-check" aria-hidden="true">{{ selectedLotIds.includes(lot.id) ? '✓' : '' }}</span>
                <span>
                  <strong>{{ lot.lot_number }} <em v-if="isInterestedLot(lot.id)" class="spk-interest-badge">Minat klien</em></strong>
                  <small>{{ lot.block_name || lot.block_code || (lot.block_id ? `Blok ID ${lot.block_id}` : 'Tanpa blok') }}</small>
                </span>
                <b>{{ formatCurrency(lotPrice(lot)) }}</b>
              </button>
              <p v-if="!filteredAvailableLots.length" class="spk-lot-empty">Kaveling tersedia tidak ditemukan.</p>
            </div>
            <p v-if="selectedCreateLots.length" class="spk-selected-lot">{{ selectedCreateLots.length }} kaveling dipilih. Setiap kaveling akan dibuatkan satu SPK terpisah.</p>
          </section>

          <section class="spk-form-section">
            <h3>3. Konfirmasi Pembayaran</h3>
            <div class="spk-payment-options">
              <label :class="{ chosen: createForm.payment_method === 'Cash' }"><input v-model="createForm.payment_method" type="radio" value="Cash" /> Tunai</label>
              <label :class="{ chosen: createForm.payment_method === 'Installment' }"><input v-model="createForm.payment_method" type="radio" value="Installment" /> Cicilan</label>
            </div>
            <p class="spk-required-note">Perhitungan dilakukan terpisah untuk setiap kaveling.</p>
            <div v-for="lot in selectedCreateLots" :key="lot.id" class="spk-lot-payment-card">
              <strong>{{ lot.lot_number }} · {{ formatCurrency(lotPrice(lot)) }}</strong>
              <template v-if="createForm.payment_method === 'Installment'">
                <InstallmentDpChoice :name="`admin-dp-${lot.id}`" :model-value="Boolean(lotUseDp[lot.id])"
                  @update:model-value="setLotUseDp(lot.id, $event)" />
                <template v-if="lotUseDp[lot.id]">
                  <label>Nominal uang muka
                    <input :value="dpInputs[lot.id] || ''" inputmode="numeric" placeholder="Contoh: 8.000.000"
                      @input="updateLotDp(lot.id, ($event.target as HTMLInputElement).value)" />
                  </label>
                  <div class="spk-dp-shortcuts">
                    <button v-for="p in [10,20,30]" :key="p" type="button" @click="setLotDp(lot.id,p)">{{ p }}%</button>
                  </div>
                  <p v-if="lotDpInvalid(lot)" class="spk-dp-warning" role="alert">
                    {{ dpAmounts[lot.id] ? 'Uang muka harus lebih kecil dari harga kaveling.' : 'Isi nominal uang muka, atau pilih Langsung cicil.' }}
                  </p>
                </template>
                <label>Tenor cicilan
                  <select v-model="lotPlanIds[lot.id]" :disabled="loadingLotPlanIds.includes(lot.id)">
                    <option value="">{{ loadingLotPlanIds.includes(lot.id) ? 'Memuat skema...' : 'Pilih tenor' }}</option>
                    <option v-for="plan in lotPlans[lot.id] || []" :key="plan.id" :value="String(plan.plan_id)">{{ plan.plan_name }} · {{ plan.months }} bulan</option>
                  </select>
                </label>
                <div v-if="lotPaymentSummary(lot.id)" class="spk-payment-result">
                  <div><span>Uang muka</span><strong>{{ lotDp(lot.id) ? formatCurrency(lotDp(lot.id)) : 'Tanpa uang muka' }}</strong></div>
                  <div><span>Cicilan per bulan</span><strong>{{ formatCurrency(lotPaymentSummary(lot.id)!.monthly) }}</strong></div>
                  <div><span>Total cicilan</span><strong>{{ formatCurrency(lotPaymentSummary(lot.id)!.installments) }}</strong></div>
                  <div class="spk-total-row"><span>Total pembayaran SPK</span><strong>{{ formatCurrency(lotPaymentSummary(lot.id)!.total) }}</strong></div>
                </div>
              </template>
              <div v-else class="spk-payment-result"><div class="spk-total-row"><span>Total pembayaran tunai</span><strong>{{ formatCurrency(lotPrice(lot)) }}</strong></div></div>
            </div>
            <p v-if="!selectedCreateLots.length" class="spk-payment-hint">Pilih kaveling yang diminati terlebih dahulu.</p>
          </section>

          <section class="spk-form-section">
            <h3>4. Dokumen Wajib</h3>
            <p class="spk-required-note">KTP, KK, dan bukti tanda jadi wajib disertakan. Uang muka, bila dipakai, dibayar terpisah dari tanda jadi.</p>
            <label class="spk-upload-field">KTP <b>*</b><input type="file" accept="image/*,.pdf" required @change="onCreateFileChange('KTP', $event)" /><small>{{ createFiles.KTP?.name || 'Belum ada file dipilih' }}</small></label>
            <label class="spk-upload-field">Kartu Keluarga (KK) <b>*</b><input type="file" accept="image/*,.pdf" required @change="onCreateFileChange('KK', $event)" /><small>{{ createFiles.KK?.name || 'Belum ada file dipilih' }}</small></label>
            <label class="spk-upload-field">Bukti Pembayaran <b>*</b><input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" required @change="onCreateFileChange('Payment Proof', $event)" /><small>{{ createFiles['Payment Proof']?.name || 'Belum ada file dipilih' }}</small></label>
            <label class="spk-upload-field">NPWP <span>(opsional)</span><input type="file" accept="image/*,.pdf" @change="onCreateFileChange('NPWP', $event)" /><small>{{ createFiles.NPWP?.name || 'Belum ada file dipilih' }}</small></label>
          </section>

          <section class="spk-form-section">
            <h3>5. Catatan</h3>
            <textarea v-model.trim="createForm.notes" rows="3" placeholder="Catatan tambahan (opsional)" />
          </section>

          <AppNotice v-if="createError" tone="error">
            {{ createError }}
          </AppNotice>
          <p v-else-if="createBlocker" class="spk-create-blocker" role="status">{{ createBlocker }}</p>
      </form>
    </AppModal>

    <!-- Preview dokumen tetap di dalam aplikasi -->
    <DocumentViewerModal
      :open="documentPreviewOpen"
      :url="previewUrl"
      :file-name="previewDocument?.file_name || 'Pratinjau dokumen'"
      :mime-type="previewDocument?.mime_type"
      :subtitle="previewDocument ? documentLabel(previewDocument.document_type) : ''"
      :loading="previewLoading"
      :error="previewError"
      @close="closeDocumentPreview"
    />
  </ion-page>
</template>

<script setup lang="ts">
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import AppNotice from '@/components/ui/AppNotice.vue'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import SkeletonCardList from '@/components/ui/skeletons/SkeletonCardList.vue'
import Reveal from '@/components/ui/Reveal.vue'
import { modalEnterAnimation, modalLeaveAnimation } from '@/utils/modalAnimation'
import { computed, nextTick, onMounted, reactive, ref, watch } from 'vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import { usePagination } from '@/composables/usePagination'
import { IonContent, IonIcon, IonModal, IonPage, IonSpinner } from '@ionic/vue'
import { useRoute, useRouter } from 'vue-router'
import {
  addOutline, alertCircleOutline, cardOutline, chevronForwardOutline,
  closeOutline, documentTextOutline, downloadOutline, eyeOutline, searchOutline,
} from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import { getRegions } from '@/services/address/addressService'
import type { Region } from '@/types/address'
import AppButton from '@/components/ui/AppButton.vue'
import AppModal from '@/components/ui/AppModal.vue'
import IdentityInfo from '@/components/identity/IdentityInfo.vue'
import DocumentViewerModal from '@/components/ui/DocumentViewerModal.vue'
import InstallmentDpChoice from '@/components/spk/InstallmentDpChoice.vue'
import { currentMakassarDateTimeLocal, makassarDateTimeLocalToIso } from '@/utils/financialCashflow'
import { compareLotNumber } from '@/utils/lotNumber'
import {
  approveSPKRequest, getAdminSPKRequests, getAdminSPKStats,
  getSPKDocumentUrl, rejectSPKRequest,
  createAdminSPKRequest, getAvailableLotsForAdmin, getLotInstallmentOptionsForAdmin,
  getCustomersForAdminSPK, createCustomerForAdminSPK,
  uploadBookingFeeRefundProof, recordBookingFeeRefund,
  type AdminLotInstallmentOption, type AdminSPKRequest, type SPKDocument, type SPKStatus, type CreateAdminSPKInput, type CustomerSource, type SPKDocumentType,
} from '@/services/Admin/spkAdminService'
type AdminAvailableLot = Awaited<ReturnType<typeof getAvailableLotsForAdmin>>[number]
type AdminSPKCustomer = Awaited<ReturnType<typeof getCustomersForAdminSPK>>[number]
const requests = ref<AdminSPKRequest[]>([])
const router = useRouter()
const route = useRoute()
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
const rejectionCategory = ref<'Administrative Error' | 'Buyer Cancellation' | 'Other'>('Other')
const openingDocumentId = ref<number | null>(null)
const documentPreviewOpen = ref(false)
const previewDocument = ref<SPKDocument | null>(null)
const previewUrl = ref('')
const previewLoading = ref(false)
const previewError = ref('')
const refundFile = ref<File | null>(null)
const refundMethod = ref('')
const refundNote = ref('')
const refundBankReference = ref('')
const refundTransferAt = ref(currentMakassarDateTimeLocal())
const refundSubmitting = ref(false)
const refundError = ref('')
const selectedSource = ref<'All' | 'Marketing' | 'Client' | 'Admin'>('All')
const createOpen = ref(false)
const creating = ref(false)
const createError = ref('')
const availableLots = ref<AdminAvailableLot[]>([])
const createFiles = reactive<Record<SPKDocumentType, File | null>>({
  KTP: null, KK: null, NPWP: null, 'Payment Proof': null,
})
const customers = ref<AdminSPKCustomer[]>([])
const customersLoading = ref(false)
const customerSearchQuery = ref('')
const selectedCustomerSource = ref<CustomerSource>('Admin')
const selectedCustomerId = ref<number | null>(null)
const showNewCustomerForm = ref(false)
const emptyNewCustomer = () => ({
  full_name: '', phone: '', whatsapp_phone: '', email: '',
  country_code: 'ID', country_name: 'Indonesia',
  province_code: '', province_name: '',
  city_code: '', city_name: '',
  district_code: '', district_name: '',
  village_code: '', village_name: '',
  street_address: '',
})
const newCustomer = reactive(emptyNewCustomer())
const addressCountries = [
  { code: 'ID', name: 'Indonesia' },
  { code: 'MY', name: 'Malaysia' },
  { code: 'SG', name: 'Singapore' },
  { code: 'AU', name: 'Australia' },
  { code: 'US', name: 'United States' },
  { code: 'JP', name: 'Japan' },
]
const newCustomerProvinces = ref<Region[]>([])
const newCustomerCities = ref<Region[]>([])
const newCustomerDistricts = ref<Region[]>([])
const newCustomerVillages = ref<Region[]>([])
const newCustomerRegionsLoading = ref(false)
const newCustomerIsIndonesia = computed(() => newCustomer.country_code === 'ID')

async function loadNewCustomerRegions(level: 1 | 2 | 3 | 4, parentId?: number | null) {
  newCustomerRegionsLoading.value = true
  try { return await getRegions(level, parentId) }
  catch (error) {
    createError.value = error instanceof Error ? error.message : 'Data wilayah gagal dimuat.'
    return []
  }
  finally { newCustomerRegionsLoading.value = false }
}
function resetNewCustomerRegions(from: 1 | 2 | 3 | 4) {
  if (from <= 1) { newCustomer.province_code = ''; newCustomer.province_name = '' }
  if (from <= 2) { newCustomer.city_code = ''; newCustomer.city_name = ''; newCustomerCities.value = [] }
  if (from <= 3) { newCustomer.district_code = ''; newCustomer.district_name = ''; newCustomerDistricts.value = [] }
  if (from <= 4) { newCustomer.village_code = ''; newCustomer.village_name = ''; newCustomerVillages.value = [] }
}
async function ensureNewCustomerProvinces() {
  if (newCustomerIsIndonesia.value && !newCustomerProvinces.value.length) {
    newCustomerProvinces.value = await loadNewCustomerRegions(1)
  }
}
async function onNewCustomerCountry() {
  newCustomer.country_name = addressCountries.find(c => c.code === newCustomer.country_code)?.name ?? ''
  resetNewCustomerRegions(1)
  await ensureNewCustomerProvinces()
}
async function onNewCustomerProvince(code: string) {
  const region = newCustomerProvinces.value.find(r => r.code === code)
  resetNewCustomerRegions(2)
  newCustomer.province_code = region?.code ?? ''
  newCustomer.province_name = region?.name ?? ''
  if (region) newCustomerCities.value = await loadNewCustomerRegions(2, region.id)
}
async function onNewCustomerCity(code: string) {
  const region = newCustomerCities.value.find(r => r.code === code)
  resetNewCustomerRegions(3)
  newCustomer.city_code = region?.code ?? ''
  newCustomer.city_name = region?.name ?? ''
  if (region) newCustomerDistricts.value = await loadNewCustomerRegions(3, region.id)
}
async function onNewCustomerDistrict(code: string) {
  const region = newCustomerDistricts.value.find(r => r.code === code)
  resetNewCustomerRegions(4)
  newCustomer.district_code = region?.code ?? ''
  newCustomer.district_name = region?.name ?? ''
  if (region) newCustomerVillages.value = await loadNewCustomerRegions(4, region.id)
}
function onNewCustomerVillage(code: string) {
  const region = newCustomerVillages.value.find(r => r.code === code)
  newCustomer.village_code = region?.code ?? ''
  newCustomer.village_name = region?.name ?? ''
}
function resetNewCustomerForm() {
  Object.assign(newCustomer, emptyNewCustomer())
  newCustomerCities.value = []
  newCustomerDistricts.value = []
  newCustomerVillages.value = []
}
watch(showNewCustomerForm, open => { if (open) void ensureNewCustomerProvinces() })
const selectedLotIds = ref<number[]>([])
const lotPlans = reactive<Record<number, AdminLotInstallmentOption[]>>({})
const lotPlanIds = reactive<Record<number, string>>({})
const dpInputs = reactive<Record<number, string>>({})
const dpAmounts = reactive<Record<number, number>>({})
/** true = pakai DP; default langsung cicil supaya SPK tidak tertahan karena DP kosong. */
const lotUseDp = reactive<Record<number, boolean>>({})
const loadingLotPlanIds = ref<number[]>([])
const createForm = reactive({
  customer_full_name: '',
  customer_phone: '',
  customer_email: '',
  customer_address: '',
  payment_method: 'Cash' as 'Cash' | 'Installment',
  payment_plan_id: '',
  down_payment: 0,
  monthly_payment: null as number | null,
  notes: '',
})
const lotSearchQuery = ref('')
const selectedCustomer = computed(() => customers.value.find(c => c.id === selectedCustomerId.value) || null)
const filteredCustomers = computed(() => {
  const q = customerSearchQuery.value.trim().toLocaleLowerCase('id-ID')
  return customers.value.filter(c => !q || c.full_name.toLocaleLowerCase('id-ID').includes(q))
})
const selectedCreateLots = computed(() => availableLots.value.filter(lot => selectedLotIds.value.includes(lot.id)))
const sourceFilters = [
  { label: 'Semua', value: 'All' as const },
  { label: 'Pemasar', value: 'Marketing' as const },
  { label: 'Klien', value: 'Client' as const },
  { label: 'Admin', value: 'Admin' as const },
]
const customerSourceOptions: Array<{ label: string; value: CustomerSource }> = [
  { label: 'Admin', value: 'Admin' },
  { label: 'Pemasar', value: 'Marketing' },
  { label: 'Klien', value: 'Client' },
]
const filteredAvailableLots = computed(() => {
  const query = lotSearchQuery.value.trim().toLocaleLowerCase('id-ID')
  const interestedIds = new Set((selectedCustomer.value?.interests ?? []).map(interest => interest.lot_id))
  const matchingLots = query
    ? availableLots.value.filter((lot) => `${lot.lot_number} ${lot.block_name || ''} ${lot.block_code || ''} ${lot.block_id ?? ''}`.toLocaleLowerCase('id-ID').includes(query))
    : availableLots.value

  return [...matchingLots].sort((a, b) => {
    const aInterested = interestedIds.has(a.id)
    const bInterested = interestedIds.has(b.id)
    if (aInterested !== bInterested) return aInterested ? -1 : 1
    return compareLotNumber(a.lot_number, b.lot_number)
  })
})
const identityReady = ref(false)
const canSubmitCreate = computed(() => Boolean(
  selectedCustomerId.value && identityReady.value && selectedLotIds.value.length > 0 &&
  createFiles.KTP && createFiles.KK &&
  createFiles['Payment Proof'] &&
  (createForm.payment_method === 'Cash' || selectedCreateLots.value.every(lot =>
    Boolean(lotPlanIds[lot.id] && !lotDpInvalid(lot) && lotPaymentSummary(lot.id))
  ))
))
// Alasan tombol simpan belum aktif, ditampilkan di bawah form.
const createBlocker = computed(() => {
  if (canSubmitCreate.value) return ''
  if (!selectedCustomerId.value) return 'Pilih klien terlebih dahulu.'
  if (!identityReady.value) return 'Lengkapi NIK, tempat lahir, dan tanggal lahir klien.'
  if (!selectedLotIds.value.length) return 'Pilih minimal satu kaveling.'
  if (createForm.payment_method === 'Installment') {
    const lot = selectedCreateLots.value.find(item => lotDpInvalid(item))
    if (lot) return `Lengkapi uang muka ${lot.lot_number}, atau pilih Langsung cicil.`
    const noPlan = selectedCreateLots.value.find(item => !lotPlanIds[item.id])
    if (noPlan) return `Pilih tenor cicilan untuk ${noPlan.lot_number}.`
  }
  const missing = [
    !createFiles.KTP && 'KTP',
    !createFiles.KK && 'KK',
    !createFiles['Payment Proof'] && 'bukti tanda jadi',
  ].filter(Boolean)
  return missing.length ? `Unggah ${missing.join(', ')}.` : ''
})
watch(() => createForm.payment_method, async value => {
  if (value === 'Installment') {
    for (const lot of selectedCreateLots.value) await loadPlansForLot(lot.id)
  }
})
watch(selectedLotIds, async ids => {
  if (createForm.payment_method === 'Installment') {
    for (const id of ids) await loadPlansForLot(id)
  }
}, { deep: true })

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
const pager = usePagination(filteredRequests, {
  pageSize: 10,
  resetOn: [selectedStatus, selectedSource, searchQuery],
})

async function loadRequests({ silent = false }: LoadOptions = {}) {
  if (!silent) {
    loading.value = true
    errorMessage.value = ''
  }
  try {
    requests.value = await getAdminSPKRequests()
    errorMessage.value = ''
    const openId = selectedRequest.value?.id
    if (openId != null) selectedRequest.value = requests.value.find((row) => row.id === openId) ?? selectedRequest.value
  }
  catch (error) { if (!silent) errorMessage.value = error instanceof Error ? error.message : 'Terjadi kesalahan.' }
  finally { loading.value = false }
}
function isPending(row: AdminSPKRequest) { return row.status === 'Submitted' || row.status === 'Under Review' }
function bookingPaymentStatusLabel(row: AdminSPKRequest) {
  const payment = row.booking_payment
  if (!payment.payments.length) return 'Belum ada pembayaran tanda jadi'
  if (payment.isSatisfied) return 'Tanda jadi terverifikasi'
  if (payment.payments.some(item => item.status === 'Pending')) return 'Menunggu verifikasi Admin Keuangan'
  if (payment.payments.some(item => item.status === 'Needs Reupload')) return 'Bukti pembayaran perlu diunggah ulang'
  if (payment.payments.some(item => item.status === 'Rejected')) return 'Pembayaran ditolak'
  return 'Tanda jadi belum mencukupi'
}
function approvalBlockReason(row: AdminSPKRequest) {
  if (!isPending(row)) return 'pembayaran sudah selesai.'
  if (row.lot_status !== 'Available') return 'Kaveling sudah tidak tersedia.'
  if (!row.booking_payment.isSatisfied) {
    const status = bookingPaymentStatusLabel(row)
    return `SPK belum dapat disetujui. ${status}.`
  }
  return ''
}
function bookingPaymentActionLabel(row: AdminSPKRequest) {
  return row.booking_payment.payments.length
    ? 'Verifikasi Bukti Pembayaran'
    : 'Buka Verifikasi Pembayaran'
}
async function goToBookingPayment(row: AdminSPKRequest) {
  const paymentId = row.booking_payment.payments[0]?.id
  detailOpen.value = false
  await router.push({
    name: 'AdminKeuangan',
    query: {
      tab: 'verification',
      spkRequestId: String(row.id),
      ...(paymentId ? { paymentId: String(paymentId) } : {}),
    },
  })
}
function canApproveSPK(row: AdminSPKRequest) {
  return isPending(row) && row.lot_status === 'Available' && row.booking_payment.isSatisfied
}
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
function formatMakassarDateTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(new Date(value))
}
function openDetail(row: AdminSPKRequest) { selectedRequest.value = row; detailOpen.value = true }
function goToReview(row: AdminSPKRequest) {
  if (row.status !== 'Approved' || !row.transaction_id) return
  router.push({ name: 'AdminTinjauSPK', params: { spkId: row.id }, query: { transactionId: String(row.transaction_id) } })
}
function openApprove(row: AdminSPKRequest) {
  actionRequest.value = row
  approveOpen.value = true
}
function openReject(row: AdminSPKRequest) {
  actionRequest.value = row
  rejectionReason.value = ''
  rejectionCategory.value = 'Other'
  rejectOpen.value = true
}
async function openDocument(doc: SPKDocument) {
  previewDocument.value = doc
  documentPreviewOpen.value = true
  previewLoading.value = true
  previewError.value = ''
  previewUrl.value = ''
  openingDocumentId.value = doc.id
  try {
    previewUrl.value = await getSPKDocumentUrl(doc.file_path, doc.storage_bucket)
  } catch (error) {
    previewError.value = error instanceof Error ? error.message : 'Dokumen gagal dibuka.'
  } finally {
    previewLoading.value = false
    openingDocumentId.value = null
  }
}
function closeDocumentPreview() {
  documentPreviewOpen.value = false
  previewDocument.value = null
  previewUrl.value = ''
  previewError.value = ''
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
    await rejectSPKRequest(actionRequest.value.id, rejectionReason.value, rejectionCategory.value)
    rejectOpen.value = false
    detailOpen.value = false
    await loadRequests()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : 'SPK gagal ditolak.'
  } finally { saving.value = false }
}

function onRefundFileChange(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  refundError.value = ''

  if (!file) {
    refundFile.value = null
    return
  }
  if (!['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(file.type)) {
    refundFile.value = null
    input.value = ''
    refundError.value = 'Format bukti harus JPG, PNG, WEBP, atau PDF.'
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    refundFile.value = null
    input.value = ''
    refundError.value = 'Ukuran bukti maksimal 5 MB.'
    return
  }
  refundFile.value = file
}

async function submitRefundProof(row: AdminSPKRequest) {
  if (!refundFile.value || refundSubmitting.value) return
  const payment = row.booking_payment.payments
    .find(item => item.status === 'Confirmed')
    || row.booking_payment.payments[0]

  if (!payment) {
    refundError.value = 'Pembayaran tanda jadi untuk SPK ini tidak ditemukan.'
    return
  }

  refundSubmitting.value = true
  refundError.value = ''

  try {
    const proofPath = await uploadBookingFeeRefundProof(row.id, refundFile.value)
    await recordBookingFeeRefund(
      payment.id,
      proofPath,
      refundMethod.value,
      refundNote.value,
      refundBankReference.value.trim() || null,
      makassarDateTimeLocalToIso(refundTransferAt.value),
    )
    refundFile.value = null
    refundMethod.value = ''
    refundNote.value = ''
    refundBankReference.value = ''
    refundTransferAt.value = currentMakassarDateTimeLocal()
    await loadRequests()
    selectedRequest.value = requests.value.find(item => item.id === row.id) ?? null
  } catch (error) {
    refundError.value = error instanceof Error ? error.message : 'Bukti pengembalian gagal disimpan.'
  } finally {
    refundSubmitting.value = false
  }
}

async function openRefundProof(row: AdminSPKRequest) {
  const proofPath = row.booking_fee_refund?.proofPath
  if (!proofPath) return

  previewDocument.value = {
    id: -1,
    spk_request_id: row.id,
    document_type: 'Payment Proof',
    file_name: proofPath.split('/').pop() || 'Bukti pengembalian',
    file_path: proofPath,
    mime_type: null,
    file_size_bytes: null,
    created_at: row.booking_fee_refund?.refundedAt ?? null,
  }
  documentPreviewOpen.value = true
  previewLoading.value = true
  previewError.value = ''
  previewUrl.value = ''

  try {
    previewUrl.value = await getSPKDocumentUrl(proofPath, 'payment-proofs')
  } catch (error) {
    previewError.value = error instanceof Error ? error.message : 'Bukti pengembalian gagal dibuka.'
  } finally {
    previewLoading.value = false
  }
}
function sourceLabel(source?: string | null) {
  if (source === 'Admin' || source === 'Client' || source === 'Marketing') return source
  return 'Tidak diketahui'
}
async function openCreateForm() {
  createError.value = ''
  createOpen.value = true
  lotSearchQuery.value = ''
  customerSearchQuery.value = ''
  selectedCustomerId.value = null
  selectedCustomerSource.value = 'Admin'
  selectedLotIds.value = []
  showNewCustomerForm.value = false
  customers.value = []
  resetNewCustomerForm()
  Object.keys(createFiles).forEach(key => { createFiles[key as SPKDocumentType] = null })
  Object.keys(lotPlans).forEach(key => delete lotPlans[Number(key)])
  Object.keys(lotPlanIds).forEach(key => delete lotPlanIds[Number(key)])
  Object.keys(dpInputs).forEach(key => delete dpInputs[Number(key)])
  Object.keys(dpAmounts).forEach(key => delete dpAmounts[Number(key)])
  Object.keys(lotUseDp).forEach(key => delete lotUseDp[Number(key)])
  Object.assign(createForm, { payment_method: 'Cash', payment_plan_id: '', down_payment: 0, monthly_payment: null, notes: '' })

  const [lotsResult, customersResult] = await Promise.allSettled([
    getAvailableLotsForAdmin(),
    loadSPKCustomers(),
  ])

  if (lotsResult.status === 'fulfilled') {
    availableLots.value = lotsResult.value
  } else {
    availableLots.value = []
    createError.value = lotsResult.reason instanceof Error ? lotsResult.reason.message : 'Daftar kaveling gagal dimuat.'
  }

  if (customersResult.status === 'rejected') {
    const message = customersResult.reason instanceof Error ? customersResult.reason.message : 'Daftar klien gagal dimuat.'
    createError.value = createError.value ? `${createError.value} ${message}` : message
  }
}
async function loadSPKCustomers() {
  customersLoading.value = true
  try { customers.value = await getCustomersForAdminSPK(selectedCustomerSource.value) }
  finally { customersLoading.value = false }
}
async function changeCustomerSource(source: CustomerSource) {
  if (source === selectedCustomerSource.value) return
  selectedCustomerSource.value = source
  selectedCustomerId.value = null
  selectedLotIds.value = []
  customerSearchQuery.value = ''
  showNewCustomerForm.value = false
  createError.value = ''
  try {
    await loadSPKCustomers()
  } catch (error) {
    createError.value = error instanceof Error ? error.message : 'Daftar klien gagal dimuat.'
  }
}
function clearSelectedCustomer() {
  selectedCustomerId.value = null
  selectedLotIds.value = []
  customerSearchQuery.value = ''
  showNewCustomerForm.value = false
}
function isInterestedLot(lotId: number) {
  return selectedCustomer.value?.interests.some(interest => interest.lot_id === lotId) ?? false
}
function selectCustomer(customer: AdminSPKCustomer) {
  selectedCustomerId.value = customer.id
  customerSearchQuery.value = customer.full_name
  selectedLotIds.value = [...new Set(customer.interests.map(i => i.lot_id)
    .filter(id => availableLots.value.some(lot => lot.id === id)))]
}
async function saveNewCustomerForSPK() {
  if (selectedCustomerSource.value !== 'Admin') {
    createError.value = 'Pelanggan baru dari halaman Admin hanya dapat didaftarkan dengan sumber Admin.'
    return
  }
  if (!newCustomer.full_name.trim() || (!newCustomer.phone.trim() && !newCustomer.whatsapp_phone.trim())) {
    createError.value = 'Nama dan minimal salah satu nomor telepon atau WhatsApp wajib diisi.'
    return
  }
  creating.value = true
  createError.value = ''
  try {
    const street = newCustomer.street_address.trim()
    const fullAddress = [
      street, newCustomer.village_name, newCustomer.district_name,
      newCustomer.city_name, newCustomer.province_name, newCustomer.country_name,
    ].map(part => part.trim()).filter(Boolean).join(', ')
    const id = await createCustomerForAdminSPK({
      full_name: newCustomer.full_name.trim(),
      phone: newCustomer.phone.trim() || null,
      whatsapp_phone: newCustomer.whatsapp_phone.trim() || null,
      email: newCustomer.email.trim() || null,
      address: fullAddress || null,
      country_code: newCustomer.country_code,
      country_name: newCustomer.country_name,
      province_code: newCustomer.province_code || null,
      province_name: newCustomer.province_name.trim() || null,
      city_code: newCustomer.city_code || null,
      city_name: newCustomer.city_name.trim() || null,
      district_code: newCustomer.district_code || null,
      district_name: newCustomer.district_name.trim() || null,
      village_code: newCustomer.village_code || null,
      village_name: newCustomer.village_name.trim() || null,
      street_address: street || null,
    })
    await loadSPKCustomers()
    selectedCustomerId.value = id
    customerSearchQuery.value = newCustomer.full_name.trim()
    resetNewCustomerForm()
    showNewCustomerForm.value = false
  } catch (error) {
    createError.value = error instanceof Error ? error.message : 'Klien gagal disimpan.'
  } finally { creating.value = false }
}
function toggleLot(lotId: number) {
  selectedLotIds.value = selectedLotIds.value.includes(lotId)
    ? selectedLotIds.value.filter(id => id !== lotId)
    : [...selectedLotIds.value, lotId]
}
async function loadPlansForLot(lotId: number) {
  if (lotPlans[lotId] || loadingLotPlanIds.value.includes(lotId)) return
  loadingLotPlanIds.value = [...loadingLotPlanIds.value, lotId]
  try { lotPlans[lotId] = await getLotInstallmentOptionsForAdmin(lotId) }
  catch (error) { createError.value = error instanceof Error ? error.message : 'Skema cicilan gagal dimuat.' }
  finally { loadingLotPlanIds.value = loadingLotPlanIds.value.filter(id => id !== lotId) }
}
function updateLotDp(lotId: number, raw: string) {
  const lot = availableLots.value.find(item => item.id === lotId)
  if (!lot) return
  const amount = Math.min(lotPrice(lot), Math.max(0, Number(raw.replace(/[^0-9]/g, '') || 0)))
  dpAmounts[lotId] = amount
  dpInputs[lotId] = amount ? amount.toLocaleString('id-ID') : ''
}
function setLotUseDp(lotId: number, useDp: boolean) {
  lotUseDp[lotId] = useDp
  if (!useDp) {
    delete dpAmounts[lotId]
    delete dpInputs[lotId]
  }
}
/** DP yang benar-benar dipakai: 0 bila memilih langsung cicil. */
function lotDp(lotId: number) {
  return lotUseDp[lotId] ? dpAmounts[lotId] || 0 : 0
}
function lotDpInvalid(lot: AdminAvailableLot) {
  if (!lotUseDp[lot.id]) return false
  const dp = dpAmounts[lot.id] || 0
  return dp <= 0 || dp >= lotPrice(lot)
}
function setLotDp(lotId: number, percentage: number) {
  const lot = availableLots.value.find(item => item.id === lotId)
  if (!lot) return
  updateLotDp(lotId, String(Math.round(lotPrice(lot) * percentage / 100)))
}
function lotPaymentSummary(lotId: number) {
  const lot = availableLots.value.find(item => item.id === lotId)
  const plan = (lotPlans[lotId] || []).find(item => String(item.plan_id) === lotPlanIds[lotId])
  if (!lot || !plan || plan.months <= 0 || lotDpInvalid(lot)) return null
  const dp = lotDp(lotId)
  const margin = Number(plan.margin_percent ?? 0)
  const calculatedMonthly = Math.ceil((lotPrice(lot) - dp) * (1 + margin / 100) / plan.months)
  const monthly = plan.is_custom && plan.monthly_payment != null
    ? Number(plan.monthly_payment)
    : calculatedMonthly
  const installments = monthly * plan.months
  return { plan, monthly, installments, total: dp + installments }
}

function lotPrice(lot: AdminAvailableLot) {
  const promoPrice = Number(lot.promo_price || 0)
  const selectedPrice = promoPrice > 0 ? promoPrice : lot.cash_price
  return Number(selectedPrice ?? 0)
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
  if (!canSubmitCreate.value || !selectedCustomer.value) {
    createError.value = 'Pilih klien, minimal satu kaveling, lengkapi pembayaran tiap kaveling, serta unggah KTP, KK, dan bukti pembayaran.'
    return
  }
  creating.value = true
  createError.value = ''
  const createdIds: number[] = []
  try {
    const docs = (Object.entries(createFiles) as [SPKDocumentType, File | null][])
      .filter((entry): entry is [SPKDocumentType, File] => Boolean(entry[1]))
      .map(([type, file]) => ({ type, file }))
    for (const lot of selectedCreateLots.value) {
      const summary = createForm.payment_method === 'Installment' ? lotPaymentSummary(lot.id) : null
      const payload: CreateAdminSPKInput = {
        customer_id: selectedCustomer.value.id,
        customer_full_name: selectedCustomer.value.full_name,
        customer_phone: selectedCustomer.value.phone || selectedCustomer.value.whatsapp_phone || '',
        customer_email: selectedCustomer.value.email,
        customer_address: selectedCustomer.value.address || '',
        lot_id: lot.id,
        lot_price_snapshot: lotPrice(lot),
        payment_method: createForm.payment_method,
        payment_plan_id: summary ? summary.plan.plan_id : null,
        months: summary ? summary.plan.months : null,
        monthly_payment: summary ? summary.monthly : null,
        margin_percent_snapshot: summary ? summary.plan.margin_percent : null,
        down_payment_snapshot: summary ? lotDp(lot.id) : 0,
        total_payment_snapshot: summary ? summary.total : lotPrice(lot),
        notes: createForm.notes || null,
      }
      const created = await createAdminSPKRequest(payload, docs)
      createdIds.push(created.id)
    }
    createOpen.value = false
    selectedCustomerId.value = null
    selectedLotIds.value = []
    customerSearchQuery.value = ''
    lotSearchQuery.value = ''
    Object.keys(lotPlans).forEach(key => delete lotPlans[Number(key)])
    Object.keys(lotPlanIds).forEach(key => delete lotPlanIds[Number(key)])
    Object.keys(dpInputs).forEach(key => delete dpInputs[Number(key)])
    Object.keys(dpAmounts).forEach(key => delete dpAmounts[Number(key)])
    Object.keys(lotUseDp).forEach(key => delete lotUseDp[Number(key)])
    Object.keys(createFiles).forEach(key => { createFiles[key as SPKDocumentType] = null })
    Object.assign(createForm, { payment_method: 'Cash', payment_plan_id: '', down_payment: 0, monthly_payment: null, notes: '' })
    await loadRequests()
  } catch (error) {
    createError.value = createdIds.length
      ? `${createdIds.length} SPK berhasil dibuat sebelum proses terhenti. Periksa daftar SPK sebelum mencoba ulang agar tidak membuat duplikat. Detail: ${error instanceof Error ? error.message : 'Kesalahan tidak diketahui'}`
      : error instanceof Error ? error.message : 'Pengajuan SPK gagal disimpan.'
  } finally { creating.value = false }
}
async function openRequestedSPKDetail() {
  await loadRequests()

  const requestedSpkId = Array.isArray(route.query.spkId)
    ? route.query.spkId[0]
    : route.query.spkId
  const spkId = Number(requestedSpkId)

  if (!Number.isInteger(spkId) || spkId <= 0) return

  const requestedRequest = requests.value.find((request) => request.id === spkId)
  if (!requestedRequest) return

  openDetail(requestedRequest)

  if (route.query.approve === '1' && canApproveSPK(requestedRequest)) {
    openApprove(requestedRequest)
  }

  if (route.query.refund === '1') {
    await nextTick()
    document.querySelector('.spk-refund-section')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }
}

onMounted(openRequestedSPKDetail)

watch(
  () => [route.query.spkId, route.query.refund, route.query.nt],
  () => {
    if (route.query.spkId) void openRequestedSPKDetail()
  },
)

useRealtimeRefresh(
  ['spk_requests', 'spk_request_documents', 'spk_corrections', 'payments', 'booking_fee_refunds', 'customers', 'lots'],
  () => loadRequests({ silent: true }),
  {
    pauseWhen: () =>
      approveOpen.value || rejectOpen.value || createOpen.value || saving.value || refundSubmitting.value,
  },
)

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
.spk-approve-btn:disabled { cursor:not-allowed; opacity:.5; }
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
.spk-booking-summary { display:grid; gap:9px; border:1px solid #e7ece3; border-radius:12px; background:#fbfcfa; padding:12px; }
.spk-booking-summary>div { display:flex; justify-content:space-between; align-items:center; gap:12px; }
.spk-booking-summary span { color:#7b8679; font-size:10px; }
.spk-booking-summary strong { color:#2e3b2e; font-size:11px; text-align:right; }
.spk-approval-hint,.spk-approval-ready { margin:0; border-radius:9px; padding:9px; font-size:10px; line-height:1.45; }
.spk-approval-hint { background:#fff4d9; color:#91630d; }
.spk-approval-ready { background:#e8f4e7; color:#2e6b36; }
.spk-booking-action { display:flex; align-items:center; justify-content:center; gap:7px; width:100%; min-height:44px; margin-top:2px; border:1px solid #355a2c; border-radius:10px; background:#355a2c; color:#fff; font:inherit; font-size:11px; font-weight:800; cursor:pointer; }
.spk-booking-action ion-icon:first-child { font-size:16px; }
.spk-booking-action ion-icon:last-child { margin-left:auto; font-size:16px; }
@media (hover: hover) and (pointer: fine) {
  .spk-booking-action:hover { background:#294722; }}
.spk-booking-action:focus-visible { outline:3px solid #78936d; outline-offset:2px; }
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
.spk-reject-form select { width:100%; border:1px solid #dfe5dc; border-radius:10px; padding:11px; color:#263329; background:#fff; font:inherit; }
.spk-reuse-warning { border-radius:9px; padding:9px; background:#edf5e9; color:#355a2c; }
.spk-reject-form label { display:grid; gap:7px; margin-top:13px; color:#354135; font-weight:700; }
.spk-reject-form label b { color:#b13d36; }
.spk-reject-form textarea { width:100%; resize:vertical; border:1px solid #dfe5dc; border-radius:10px; padding:11px; color:#263329; background:#fff; font:inherit; font-weight:400; outline-color:#78936d; }
.spk-reject-form small { display:block; text-align:right; color:#929a91; font-size:10px; }
@media (min-width:700px) { .spk-shell { padding:32px 28px 60px; } .spk-stats { gap:13px; } .spk-stat { padding:17px; } .spk-card { padding:19px; }}
@media (max-width:390px) { .spk-shell { padding-inline:13px; } .spk-stats { gap:6px; } .spk-stat { padding:10px 8px; } .spk-stat strong { font-size:20px; } .spk-card-meta { gap:5px; } .spk-card-meta strong { font-size:9px; }}

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
.spk-lot-option.selected {
  border-color:var(--poliland-green);
  background:var(--status-success-bg);
}

@media (hover: hover) and (pointer: fine) {
  .spk-lot-option:hover {
    border-color:var(--poliland-green);
    background:var(--status-success-bg);
  }}
.spk-lot-option:focus-visible { outline:3px solid var(--poliland-green); outline-offset:2px; }
.spk-lot-option > span:nth-child(2) { display:grid; min-width:0; gap:3px; }
.spk-lot-option small { color:var(--text-secondary); font-size:10px; }
.spk-lot-option > b { color:var(--text-primary); font-size:10px; text-align:right; white-space:nowrap; }
.spk-interest-badge { display:inline-flex; align-items:center; min-height:20px; margin-left:4px; padding:2px 7px; border-radius:999px; background:var(--poliland-gold-soft); color:var(--poliland-gold-text); font-size:9px; font-style:normal; vertical-align:1px; }
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
.spk-required-note { margin:0; color:var(--text-secondary,#5F5F66); font-size:11px; line-height:1.5; }
.spk-dp-warning { margin:0; color:#A12C22; font-size:11px; font-weight:700; line-height:1.4; }
.spk-create-blocker { margin:0; padding:10px 12px; border-radius:var(--radius-sm,10px); background:var(--status-success-bg,#E8EEE4); color:var(--poliland-green,#355A2C); font-size:12px; font-weight:700; line-height:1.45; }
.spk-upload-field { border:1px dashed #cfd8ca; border-radius:11px; padding:11px; }
.spk-upload-field input { width:100%; font-size:10px; }
.spk-upload-field small { color:#8a9488; font-weight:400; }

@media (max-width:390px) { .spk-refresh { justify-content:center; } .spk-create-fab { right:calc(14px + env(safe-area-inset-right)); bottom:calc(84px + env(safe-area-inset-bottom)); }}

.spk-price-summary,.spk-dp-panel,.spk-payment-result { display:grid; gap:10px; border:1px solid #e7ece3; border-radius:12px; background:#fbfcfa; padding:12px; }
.spk-price-summary>div,.spk-summary-row,.spk-payment-result>div { display:flex; justify-content:space-between; align-items:center; gap:12px; }
.spk-price-summary span,.spk-summary-row span,.spk-payment-result span { color:#7b8679; font-size:10px; }
.spk-price-summary strong,.spk-summary-row strong,.spk-payment-result strong { color:#2e3b2e; font-size:11px; text-align:right; }
.spk-dp-panel>label { display:grid; gap:7px; }
.spk-dp-shortcuts { display:flex; gap:7px; }
.spk-dp-shortcuts button { flex:1; border:1px solid #dfe7da; border-radius:9px; background:#fff; color:#355a2c; padding:8px; font-size:10px; font-weight:800; }
.spk-payment-result .spk-monthly-value { color:#355a2c; font-size:14px; }
.spk-payment-result .spk-total-row { border-top:1px solid #e5ebe1; padding-top:10px; }
.spk-payment-result .spk-total-row strong { color:#355a2c; font-size:15px; }
.spk-payment-result small,.spk-payment-hint { color:#879184; font-size:10px; line-height:1.5; }

.spk-customer-picker { display:grid; gap:6px; max-height:190px; overflow:auto; }
.spk-customer-option { display:grid; gap:4px; width:100%; min-height:44px; padding:10px; text-align:left; border:1px solid #e3e9df; border-radius:10px; background:#fff; color:#2e3b2e; cursor:pointer; }
.spk-customer-option.selected { border-color:#55784b; background:#f1f6ee; }
.spk-customer-option small,.spk-customer-state { color:#818a80; font-size:10px; }
.spk-customer-sources { display:flex; align-items:center; flex-wrap:wrap; gap:6px; color:#788276; font-size:10px; }
.spk-customer-sources button { min-height:44px; border:1px solid #dfe7da; border-radius:9px; padding:8px 11px; background:#fff; color:#50604e; font-size:10px; font-weight:800; cursor:pointer; }
.spk-customer-sources button.active { border-color:#355a2c; background:#edf3e9; color:#355a2c; }
.spk-customer-option:focus-visible,.spk-customer-sources button:focus-visible,.spk-add-customer-toggle:focus-visible,.spk-add-customer-save:focus-visible,.spk-cancel-customer:focus-visible { outline:3px solid #78936d; outline-offset:2px; }
.spk-add-customer-toggle,.spk-add-customer-save,.spk-cancel-customer { min-height:44px; border:1px solid #355a2c; border-radius:9px; padding:10px; background:#fff; color:#355a2c; font-size:11px; font-weight:800; cursor:pointer; }
.spk-new-customer-form { display:grid; gap:9px; padding:12px; border:1px solid #e5e9e2; border-radius:12px; background:#fafbf9; }
.spk-new-customer-form label { display:grid; gap:5px; font-size:10px; }
.spk-new-customer-form select { min-height:40px; border:1px solid #d9dfd5; border-radius:9px; padding:8px 10px; background:#fff; color:inherit; font:inherit; }
.spk-new-customer-form select:disabled { opacity:.6; }
.spk-selected-customer { display:grid; gap:5px; padding:11px; border-radius:10px; background:#f1f6ee; color:#50604e; font-size:10px; }
.spk-cancel-customer { width:100%; }
.spk-lot-payment-card { display:grid; gap:9px; padding:12px; border:1px solid #e5e9e2; border-radius:12px; background:#fff; }
.spk-lot-payment-card>strong { font-size:12px; color:#355a2c; }
.spk-lot-payment-card label { display:grid; gap:5px; font-size:10px; }
.spk-lot-payment-card input,.spk-lot-payment-card select { width:100%; min-height:40px; border:1px solid #dfe5dc; border-radius:9px; padding:9px; background:#fff; color:#263329; }

/* Pengembalian Booking Fee — mengikuti design system Modern-Natural */
.spk-refund-section {
  gap: 14px;
  padding: 16px;
  border: 1px solid #eae7e0;
  border-radius: 16px;
  background: #fff;
  box-shadow: 0 2px 8px rgba(37, 37, 37, .04);
}
.spk-refund-heading { display:flex; align-items:center; gap:12px; }
.spk-refund-heading-icon {
  display:grid; place-items:center; flex:0 0 44px; width:44px; height:44px;
  border-radius:14px; background:#f4f3ec; color:#355a2c; font-size:21px;
}
.spk-refund-heading>div:last-child { min-width:0; }
.spk-refund-eyebrow { display:block; margin-bottom:3px; color:#966a12; font-size:9px; font-weight:800; letter-spacing:.09em; }
.spk-refund-heading h3 { color:#252525; font-size:15px; }
.spk-refund-heading p { margin:4px 0 0; color:#717178; font-size:11px; line-height:1.45; }
.spk-refund-amount-card {
  display:flex; align-items:center; justify-content:space-between; flex-wrap:wrap; gap:12px;
  padding:14px; border:1px solid #eae7e0; border-radius:13px; background:#f5f3ee;
}
.spk-refund-amount-card>div { display:grid; gap:5px; }
.spk-refund-amount-card>div span { color:#717178; font-size:10px; }
.spk-refund-amount-card>div strong { color:#252525; font-size:20px; font-weight:800; letter-spacing:-.03em; }
.spk-refund-status { display:inline-flex; align-items:center; gap:5px; min-height:28px; padding:5px 9px; border-radius:999px; font-size:10px; font-weight:750; }
.spk-refund-status.is-refunded { background:#eaf2e7; color:#355a2c; }
.spk-refund-status.is-pending { background:#fbf1d9; color:#966a12; }
.spk-refund-success { display:flex; align-items:flex-start; gap:10px; padding:12px; border:1px solid #dce9d7; border-radius:12px; background:#f2f7ef; }
.spk-refund-success-mark { display:grid; place-items:center; flex:0 0 26px; width:26px; height:26px; border-radius:50%; background:#355a2c; color:#fff; font-size:15px; font-weight:800; }
.spk-refund-success strong { color:#355a2c; font-size:12px; }
.spk-refund-success p { margin:4px 0 0; color:#596b54; font-size:11px; line-height:1.5; }
.spk-refund-info { display:grid; gap:0; padding:0 12px; border:1px solid #eae7e0; border-radius:12px; }
.spk-refund-info>div { display:grid; grid-template-columns:minmax(105px,.8fr) 1.2fr; gap:12px; padding:11px 0; border-bottom:1px solid #eeece6; }
.spk-refund-info>div:last-child { border-bottom:0; }
.spk-refund-info span { color:#717178; font-size:10px; }
.spk-refund-info strong,.spk-refund-info p { margin:0; color:#252525; font-size:11px; font-weight:650; overflow-wrap:anywhere; }
.spk-refund-proof-button {
  display:flex; align-items:center; justify-content:center; gap:8px; width:100%; min-height:46px;
  padding:10px 12px; border:1px solid #355a2c; border-radius:12px; background:#fff; color:#355a2c;
  font:inherit; font-size:12px; font-weight:750; cursor:pointer;
}
.spk-refund-proof-button ion-icon:last-child { margin-left:auto; }
.spk-refund-guidance { display:flex; align-items:flex-start; gap:9px; padding:11px; border:1px solid #eadfbd; border-radius:11px; background:#fbf6e9; color:#805d19; }
.spk-refund-guidance ion-icon { flex:0 0 17px; margin-top:1px; font-size:17px; }
.spk-refund-guidance p { margin:0; font-size:10px; line-height:1.55; }
.spk-refund-form { display:grid; gap:13px; }
.spk-refund-form>label { display:grid; gap:7px; color:#252525; font-size:11px; font-weight:700; }
.spk-refund-form label>span:first-child b { color:#d94b45; }
.spk-refund-form label>span:first-child small { color:#717178; font-weight:400; }
.spk-refund-form input[type="text"],.spk-refund-form input[type="datetime-local"],.spk-refund-form textarea {
  width:100%; min-height:46px; border:1px solid #e0ddd5; border-radius:12px; padding:11px 12px;
  background:#fff; color:#252525; font:inherit; font-size:12px; font-weight:400; outline:none;
}
.spk-refund-form textarea { min-height:82px; resize:vertical; }
.spk-refund-form input:focus,.spk-refund-form textarea:focus { border-color:#355a2c; box-shadow:0 0 0 3px rgba(53,90,44,.12); }
.spk-refund-upload>input[type="file"] { position:absolute; width:1px; height:1px; overflow:hidden; clip:rect(0,0,0,0); white-space:nowrap; }
.spk-refund-file-picker { display:flex; align-items:center; gap:10px; min-height:68px; padding:10px; border:1px dashed #c9d2c2; border-radius:12px; background:#fafbf8; }
.spk-refund-upload-icon { display:grid; place-items:center; flex:0 0 38px; width:38px; height:38px; border-radius:10px; background:#edf3e9; color:#355a2c; font-size:18px; }
.spk-refund-file-copy { display:grid; flex:1; min-width:0; gap:4px; }
.spk-refund-file-copy strong { overflow:hidden; color:#303b31; font-size:10px; text-overflow:ellipsis; white-space:nowrap; }
.spk-refund-file-copy small { color:#717178; font-size:9px; font-weight:400; }
.spk-refund-choose { display:grid; place-items:center; min-height:36px; padding:0 10px; border-radius:9px; background:#355a2c; color:#fff; font-size:10px; font-weight:750; }

.spk-refund-footnote { margin:-5px 0 0; color:#717178; font-size:9px; line-height:1.5; }
.spk-refund-proof-button:focus-visible,.spk-refund-file-picker:focus-within { outline:3px solid rgba(53,90,44,.25); outline-offset:2px; }
@media (max-width:360px) {
  .spk-refund-section { padding:12px; }
  .spk-refund-amount-card>div strong { font-size:18px; }
  .spk-refund-info>div { grid-template-columns:1fr; gap:5px; }}</style>
