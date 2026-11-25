<template>
  <ion-page class="admin-finance-page">
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />

    <AppPullRefresh scoped :refresh-handler="refreshTransactions" />

    <ion-content :fullscreen="true">
      <main class="finance-shell">
        <div v-if="paymentPage === 'none'" class="finance-nav">
          <nav class="finance-areas" role="tablist" aria-label="Area keuangan">
            <button
              v-for="area in areaTabs"
              :key="area.value"
              type="button"
              role="tab"
              class="finance-area"
              :class="{ 'finance-area--active': activeArea === area.value }"
              :aria-selected="activeArea === area.value"
              @click="openArea(area.value)"
            >
              <ion-icon :icon="area.icon" aria-hidden="true" />
              <span>{{ area.label }}</span>
              <b v-if="area.badge" class="finance-area__badge" :aria-label="`${area.badge} menunggu`">{{ area.badge }}</b>
            </button>
          </nav>
          <nav v-if="!selectedReportLot" class="finance-subnav" role="tablist" :aria-label="`Bagian ${activeAreaLabel}`">
            <button
              v-for="item in subTabs"
              :key="item.key"
              type="button"
              role="tab"
              :class="{ 'is-active': item.active }"
              :aria-selected="item.active"
              @click="item.run()"
            >{{ item.label }}</button>
          </nav>
          <p v-if="activeArea === 'action'" class="finance-attention" :class="{ 'finance-attention--clear': !attentionTotal }" role="status">{{ attentionSummary }}</p>
        </div>

        <template v-if="paymentPage === 'proof'">
          <section class="payment-flow-page">
            <button type="button" class="report-back-link" @click="closePaymentPage">
              <ion-icon :icon="chevronBackOutline" aria-hidden="true" /> Kembali
            </button>
            <SkeletonRowList v-if="proofLoading" :rows="2" :fields="3" :subtitle="false" label="Memuat bukti pembayaran" />
            <StatusIllustration
              v-else-if="proofError"
              :variant="resolveErrorVariant(proofError)"
              size="sm"
              title="Bukti pembayaran tidak dapat dimuat"
              :on-action="() => loadSelectedPaymentProof()"
            />
            <template v-else-if="selectedProofPayment">
              <div class="proof-status-banner" :class="`proof-status-banner--${selectedProofPayment.payment.status.toLowerCase().replaceAll(' ', '-')}`">
                <span class="proof-status-icon"><ion-icon :icon="selectedProofPayment.payment.status === 'Confirmed' ? shieldCheckmarkOutline : timeOutline" /></span>
                <strong>{{ paymentStatusLabel(selectedProofPayment.payment.status) }}</strong>
                <time>{{ formatShortDate(selectedProofPayment.payment.payment_date || selectedProofPayment.payment.created_at) }}</time>
              </div>
              <section class="proof-info-card">
                <div class="proof-card-heading">
                  <h1><ion-icon :icon="documentTextOutline" /> Informasi Transaksi</h1>
                  <button type="button" class="proof-reference" @click="copyPaymentReference">{{ paymentReference(selectedProofPayment.payment) }} <ion-icon :icon="copyOutline" /></button>
                </div>
                <div class="proof-info-grid">
                  <div><span>Klien / Pembeli</span><strong>{{ selectedProofPayment.customer?.full_name || 'Tidak tersedia' }}</strong><small>{{ selectedProofPayment.customer?.whatsapp_phone || selectedProofPayment.customer?.phone || 'Kontak belum tersedia' }}</small></div>
                  <div><span>Nomor SPK</span><strong>{{ selectedProofPayment.spk?.spk_number || 'Belum terkait SPK' }}</strong><small>{{ selectedProofPayment.spk ? `Status SPK: ${selectedProofPayment.spk.status}` : 'Pembayaran transaksi' }}</small></div>
                  <div><span>Kaveling Terdaftar</span><strong>{{ selectedProofPayment.lot?.lot_number || 'Tidak tersedia' }}</strong><small>{{ selectedProofPayment.lot?.blocks?.name || 'Blok belum tersedia' }} · {{ selectedProofPayment.lot?.area ?? '-' }} m²</small></div>
                  <div><span>Metode & Bank</span><strong>{{ selectedProofPayment.payment.payment_method || 'Tidak tersedia' }}</strong><small>Ref: {{ selectedProofPayment.payment.reference_number || 'Tidak dicantumkan' }}</small></div>
                  <div><span>Waktu Transaksi</span><strong>{{ formatShortDate(selectedProofPayment.payment.payment_date || selectedProofPayment.payment.created_at) }}</strong><small>{{ formatTime(selectedProofPayment.payment.created_at) }} WITA</small></div>
                </div>
              </section>
              <section class="proof-total-card">
                <span class="proof-eyebrow">TOTAL DITERIMA</span>
                <strong>{{ formatCurrency(Number(selectedProofPayment.payment.amount || 0)) }}</strong>
                <p>{{ selectedProofPayment.allocations.length ? proofInstallmentLabel : paymentCategoryLabel(selectedProofPayment.payment.payment_category) }}</p>
                <div v-if="selectedProofPayment.allocations.length > 1" class="proof-allocation-list">
                  <div v-for="allocation in selectedProofPayment.allocations" :key="allocation.schedule?.id">
                    <span>Ke-{{ allocation.schedule?.installment_number }} · {{ allocation.schedule ? formatMonthYear(allocation.schedule.due_date) : '-' }}</span>
                    <strong>{{ formatCurrency(allocation.allocated_amount) }}</strong>
                  </div>
                </div>
              </section>
              <section class="proof-file-card">
                <h2><ion-icon :icon="imageOutline" /> Bukti Transfer Fisik</h2>
                <button v-if="proofSignedUrl" type="button" class="proof-preview" @click="openProofViewer('proof')">
                  <img v-if="isImageProof(proofFilePath)" :src="proofSignedUrl" alt="Bukti transfer pembayaran" />
                  <span v-else class="proof-pdf-preview"><ion-icon :icon="documentTextOutline" /> Dokumen PDF</span>
                  <small><ion-icon :icon="searchOutline" /> Ketuk untuk memperbesar tampilan</small>
                </button>
                <div v-else class="proof-no-file">Bukti transfer tidak dilampirkan pada transaksi ini.</div>
                <button v-if="proofSignedUrl" type="button" class="proof-download" @click="openProofViewer('proof')"><ion-icon :icon="downloadOutline" /> Lihat &amp; Unduh</button>
              </section>
              <section
                v-if="selectedProofPayment.payment.status === 'Rejected'
                  && selectedProofPayment.payment.payment_category === 'Booking'"
                id="booking-refund-proof"
                class="proof-refund-section"
              >
                <div class="proof-refund-heading">
                  <div>
                    <span>Pengembalian tanda jadi</span>
                    <strong>{{ refundStatus === 'Refunded' ? 'Sudah dikembalikan' : 'Menunggu pengembalian' }}</strong>
                  </div>
                  <span :class="['refund-status-badge', refundStatus === 'Refunded' ? 'refund-status-badge--done' : '']">
                    {{ refundStatus === 'Refunded' ? 'Dikembalikan' : 'Proses' }}
                  </span>
                </div>

                <template v-if="refundStatus === 'Refunded'">
                  <dl class="proof-refund-details">
                    <div><dt>Nominal</dt><dd>{{ formatCurrency(refundAmount || Number(selectedProofPayment.payment.amount || 0)) }}</dd></div>
                    <div v-if="refundTransferAt"><dt>Waktu transfer (WITA)</dt><dd>{{ formatMakassarDateTime(refundTransferAt) }}</dd></div>
                    <div v-if="refundMethod"><dt>Metode</dt><dd>{{ refundMethod }}</dd></div>
                    <div><dt>Referensi bank</dt><dd>{{ refundBankReference || 'Belum dicatat; perlu rekonsiliasi bank' }}</dd></div>
                    <div v-if="refundNote"><dt>Catatan</dt><dd>{{ refundNote }}</dd></div>
                  </dl>
                  <button v-if="refundProofSignedUrl" type="button" class="proof-download" @click="openProofViewer('refund')">
                    <ion-icon :icon="imageOutline" /> Lihat bukti pengembalian
                  </button>
                  <AppNotice v-if="refundProofError" tone="error">
                    {{ refundProofError }}
                  </AppNotice>
                  <button v-if="refundProofError" type="button" class="quiet-action" @click="loadSelectedPaymentProof()">Muat ulang</button>
                </template>

                <template v-else>
                  <label class="refund-field">
                    Metode pengembalian
                    <input v-model.trim="refundMethod" type="text" placeholder="Contoh: Transfer Bank BCA" />
                  </label>
                  <label class="refund-field">
                    Waktu transfer (WITA)
                    <input v-model="refundTransferAt" type="datetime-local" required />
                  </label>
                  <label class="refund-field">
                    Referensi bank <span>(opsional, untuk rekonsiliasi)</span>
                    <input v-model.trim="refundBankReference" type="text" placeholder="Nomor referensi transfer" />
                  </label>
                  <label class="refund-field">
                    Catatan
                    <textarea v-model.trim="refundNote" rows="3" placeholder="Catatan tambahan pengembalian" />
                  </label>
                  <label class="refund-upload">
                    Bukti pengembalian
                    <input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" :disabled="refundSubmitting" @change="onRefundProofSelected" />
                    <span>{{ refundFile?.name || 'JPG, PNG, WEBP, atau PDF. Maksimal 5 MB.' }}</span>
                  </label>
                  <AppNotice v-if="refundError" tone="error">
                    {{ refundError }}
                  </AppNotice>
                  <button type="button" class="proof-refund-submit" :disabled="refundSubmitting || !refundFile" @click="submitRefundProof">
                    <ion-spinner v-if="refundSubmitting" name="crescent" />
                    {{ refundSubmitting ? 'Menyimpan...' : 'Simpan bukti' }}
                  </button>
                </template>
              </section>
              <div v-if="selectedProofPayment.payment.status === 'Pending'" class="proof-review-actions">
                <SlideToConfirm
                  variant="success"
                  label="Geser untuk verifikasi pembayaran"
                  :disabled="reviewSaving || !proofSignedUrl"
                  :loading="reviewSaving && reviewTargetStatus === 'Confirmed'"
                  @confirm="reviewPayment('Confirmed')"
                />
                <div class="proof-review-secondary">
                  <button type="button" class="proof-reject-button" :disabled="reviewSaving" @click="openReviewDialog('Rejected')"><ion-icon :icon="closeCircleOutline" /> Tolak Transaksi</button>
                  <button type="button" class="proof-reupload-button" :disabled="reviewSaving" @click="openReviewDialog('Needs Reupload')"><ion-icon :icon="refreshOutline" /> Minta unggah ulang</button>
                </div>
              </div>
              <div v-else-if="selectedProofPayment.payment.review_note || selectedProofPayment.payment.note" class="proof-review-note"><strong>Catatan Admin</strong><p>{{ selectedProofPayment.payment.review_note || selectedProofPayment.payment.note }}</p></div>
              <section v-if="canApproveRelatedSpk" class="proof-spk-cta" aria-label="Persetujuan SPK">
                <span class="proof-spk-cta-icon"><ion-icon :icon="checkmarkCircleOutline" aria-hidden="true" /></span>
                <div class="proof-spk-cta-text">
                  <strong>SPK {{ selectedProofPayment.spk?.spk_number }} menunggu persetujuan</strong>
                  <p>Pembayaran sudah terverifikasi. Lanjutkan tanpa membuka daftar SPK.</p>
                </div>
                <button type="button" class="proof-spk-cta-button" @click="approveRelatedSpk">
                  Setujui SPK
                  <ion-icon :icon="arrowForwardOutline" aria-hidden="true" />
                </button>
              </section>
            </template>
          </section>
        </template>

        <template v-else-if="paymentPage === 'add'">
          <section class="payment-flow-page payment-create-page">
            <button type="button" class="report-back-link" @click="closePaymentPage"><ion-icon :icon="chevronBackOutline" /> Kembali</button>
            <StatusIllustration v-if="!selectedReportLot" variant="not-found-404" size="sm" title="Transaksi tidak ditemukan" description="Kembali ke laporan dan pilih transaksi yang benar." />
            <template v-else>
              <section class="payment-step-card">
                <header><span>1</span><div><strong>Identitas Klien & Kaveling</strong></div></header>
                <div class="payment-step-body">
                  <label>Nama Pembeli (Calon Pemilik)</label>
                  <div class="payment-identity-row"><span class="payment-identity-icon"><ion-icon :icon="peopleOutline" /></span><div><strong>{{ selectedReportLot.customerName }}</strong><small>{{ selectedReportLot.customerPhone || 'Nomor telepon belum tersedia' }}</small></div></div>
                  <label>Kaveling Properti Terkait</label>
                  <div class="payment-identity-row"><span class="payment-identity-icon payment-identity-icon--lot"><ion-icon :icon="businessOutline" /></span><div><strong>{{ selectedReportLot.lotCode }} {{ selectedReportLot.blockName }}</strong><small>{{ selectedReportLot.area ?? '-' }} m²</small></div></div>
                  <div class="payment-price-summary"><span>Total Harga Unit <strong>{{ formatCurrency(selectedReportLot.finalPrice) }}</strong></span><span>Sisa Tagihan <strong>{{ formatCurrency(selectedReportLot.remaining) }}</strong></span><span v-if="selectedReportLot.pendingAmount > 0">Menunggu Verifikasi <strong>{{ formatCurrency(selectedReportLot.pendingAmount) }}</strong></span></div>
                </div>
              </section>
              <section class="payment-step-card">
                <header><span>2</span><div><strong>{{ selectedReportLot.paymentType === 'Installment' ? 'Pilih Cicilan' : 'Nominal Pembayaran' }}</strong><small>{{ selectedReportLot.paymentType === 'Installment' ? (installmentProgressLine || 'Pilih cicilan yang dibayar') : 'Masukkan nominal pembayaran yang diterima' }}</small></div></header>
                <div class="payment-step-body">
                  <SkeletonRowList v-if="selectedReportLot.paymentType === 'Installment' && schedulesLoading" :rows="3" :fields="1" :badges="[1]" label="Memuat jadwal cicilan" />
                  <StatusIllustration v-else-if="selectedReportLot.paymentType === 'Installment' && schedulesError" :variant="resolveErrorVariant(schedulesError)" size="sm" title="Jadwal cicilan gagal dimuat" :on-action="loadSchedulesForSelectedLot" />
                  <template v-else-if="selectedReportLot.paymentType === 'Installment'">
                    <label v-for="schedule in selectableSchedules" :key="schedule.id" class="payment-schedule-option" :class="{ 'payment-schedule-option--locked': !isScheduleSelectable(schedule.id) }">
                      <input type="checkbox" :checked="selectedScheduleIds.includes(schedule.id)" :disabled="!isScheduleSelectable(schedule.id)" @change="toggleSchedule(schedule.id)" />
                      <span class="payment-schedule-check"></span>
                      <span class="payment-schedule-copy"><strong>Ke-{{ schedule.installment_number }}</strong><small>{{ formatShortDate(schedule.due_date) }}</small></span>
                      <span class="payment-schedule-status" :class="`payment-schedule-status--${schedule.status.toLowerCase()}`">{{ schedule.due_date < todayDate ? 'Jatuh Tempo' : 'Mendatang' }}</span>
                      <strong class="payment-schedule-amount">{{ formatCurrency(schedule.amount) }}</strong>
                    </label>
                    <div v-if="!selectableSchedules.length" class="proof-no-file">Tidak ada cicilan yang dapat dipilih.</div>
                    <small v-if="fieldError('schedules')" class="field-error" role="alert" data-field-error>{{ fieldError('schedules') }}</small>
                  </template>
                  <div v-else class="instruction-field" :class="{ 'instruction-field--error': fieldError('amount') }"><label for="cash-payment-amount">Nominal Pembayaran (Rp)</label><input id="cash-payment-amount" v-model.number="manualPaymentAmount" type="number" min="1" :max="availableToPay" inputmode="numeric" placeholder="Contoh: 1500000" :aria-invalid="Boolean(fieldError('amount'))" aria-describedby="cash-payment-amount-hint" /><small id="cash-payment-amount-hint" class="field-hint" :class="{ 'field-error': fieldError('amount') }" :role="fieldError('amount') ? 'alert' : undefined" :data-field-error="fieldError('amount') ? '' : undefined">{{ fieldError('amount') || `Maksimal ${formatCurrency(availableToPay)}` }}</small></div>
                  <div class="payment-total-summary">
                    <span>{{ selectedReportLot.paymentType === 'Installment' ? 'Dibayar' : 'Jenis' }}</span>
                    <strong v-if="selectedReportLot.paymentType === 'Installment'">{{ selectedSchedulesLabel || 'Belum ada cicilan dipilih' }}</strong>
                    <strong v-else>Pembayaran tunai</strong>
                    <div><span>Total Pembayaran</span><strong>{{ formatCurrency(newPaymentTotal) }}</strong></div>
                  </div>
                </div>
              </section>
              <section class="payment-step-card">
                <header><span>3</span><div><strong>Bukti dan Rincian Pembayaran</strong><small>JPG, PNG, WEBP, atau PDF · Maksimal 5 MB</small></div></header>
                <div class="payment-step-body">
                  <div class="instruction-field" :class="{ 'instruction-field--error': fieldError('method') }"><label for="new-payment-method">Metode dan Bank</label><select id="new-payment-method" v-model="newPaymentMethod" :aria-invalid="Boolean(fieldError('method'))"><option value="">Pilih metode pembayaran</option><option v-for="bank in bankAccounts.filter((item) => item.is_active)" :key="bank.id" :value="`Transfer ${bank.bank_name}`">Transfer {{ bank.bank_name }}</option><option value="Tunai">Tunai</option></select><div v-if="selectedPaymentBank" class="payment-bank-target" role="status"><span>Rekening tujuan</span><strong>{{ selectedPaymentBank.account_number }}</strong><small>a.n. {{ selectedPaymentBank.account_holder }}</small></div><small v-if="fieldError('method')" class="field-error" role="alert" data-field-error>{{ fieldError('method') }}</small></div>
                  <div class="instruction-field" :class="{ 'instruction-field--error': fieldError('date') }"><label for="new-payment-date">Tanggal Pembayaran</label><input id="new-payment-date" v-model="newPaymentDate" type="date" :max="todayDate" :aria-invalid="Boolean(fieldError('date'))" /><small v-if="fieldError('date')" class="field-error" role="alert" data-field-error>{{ fieldError('date') }}</small></div>
                  <div class="instruction-field"><label for="new-payment-reference">Nomor Referensi Transfer <span>(Opsional)</span></label><input id="new-payment-reference" v-model.trim="newPaymentReference" maxlength="100" placeholder="Masukkan nomor referensi bank" /></div>
                  <div class="payment-proof-field">
                    <label class="payment-proof-upload" for="new-payment-proof">
                      <input id="new-payment-proof" type="file" accept="image/jpeg,image/png,image/webp,application/pdf" @change="onPaymentProofSelected" />
                      <img v-if="paymentProofPreview" :src="paymentProofPreview" alt="Pratinjau bukti pembayaran" />
                      <span v-else class="payment-upload-icon"><ion-icon :icon="downloadOutline" /></span>
                      <span><strong>{{ paymentProofFile?.name || 'Pilih bukti pembayaran' }}</strong><small>{{ paymentProofFile ? formatFileSize(paymentProofFile.size) : 'Ketuk untuk memilih file' }}</small></span>
                    </label>
                    <button v-if="paymentProofFile" type="button" class="payment-proof-remove" aria-label="Hapus bukti pembayaran" @click="clearPaymentProof"><ion-icon :icon="closeOutline" /></button>
                  </div>
                  <small v-if="fieldError('proof')" class="field-error" role="alert" data-field-error>{{ fieldError('proof') }}</small>
                  <div class="instruction-field"><label for="new-payment-note">Catatan <span>(Opsional)</span></label><textarea id="new-payment-note" v-model.trim="newPaymentNote" rows="2" maxlength="500" placeholder="Tambahkan catatan pembayaran bila diperlukan." /></div>
                  <AppNotice v-if="paymentCreateError" tone="error">
                    {{ paymentCreateError }}
                  </AppNotice>
                </div>
              </section>
              <button type="button" class="payment-save-button" :disabled="paymentSaving" :aria-busy="paymentSaving" @click="saveNewPayment">
                <ion-spinner v-if="paymentSaving" name="crescent" /><ion-icon v-else :icon="saveOutline" /> {{ paymentSaving ? 'Menyimpan...' : 'Simpan pembayaran' }}
              </button>
              <button type="button" class="payment-cancel-button" :disabled="paymentSaving" @click="closePaymentPage">Batal</button>
            </template>
          </section>
        </template>

        <template v-else-if="activeView === 'instructions'">
          <section
            v-if="activeInstructionTab === 'banks'"
            id="bank-accounts-panel"
            role="tabpanel"
            aria-labelledby="bank-accounts-tab"
            class="bank-panel"
          >
            <div class="bank-guidance">
              <ion-icon :icon="shieldCheckmarkOutline" aria-hidden="true" />
              <div>
                <strong>Rekening Transaksi</strong>
                <p>Hanya rekening aktif yang ditampilkan pada instruksi pembayaran dan invoice digital klien.</p>
              </div>
            </div>

            <SkeletonRowList v-if="bankLoading" :rows="2" :fields="2" label="Memuat rekening bank" />

            <StatusIllustration
              v-else-if="bankError"
              :variant="resolveErrorVariant(bankError)"
              size="sm"
              title="Rekening bank gagal dimuat"
              :on-action="loadBankAccounts"
            />

            <template v-else>
              <div v-if="bankAccounts.length" class="bank-account-list">
                <article v-for="account in bankAccounts" :key="account.id" class="bank-account-card">
                  <div class="bank-card-top">
                    <div class="bank-brand-mark" :class="`bank-brand-mark--${bankBrandClass(account.bank_name)}`">
                      {{ bankInitials(account.bank_name) }}
                    </div>
                    <div class="bank-account-identity">
                      <div class="bank-name-line">
                        <h2>{{ account.bank_name }}</h2>
                        <span class="bank-status" :class="{ 'bank-status--inactive': !account.is_active }">
                          <span aria-hidden="true"></span>{{ account.is_active ? 'Aktif' : 'Nonaktif' }}
                        </span>
                      </div>
                      <strong class="bank-account-number">{{ formatBankAccountNumber(account.account_number) }}</strong>
                      <p>{{ account.account_holder }}</p>
                    </div>
                    <div class="bank-card-actions">
                      <button type="button" class="bank-icon-action" :aria-label="`Ubah rekening ${account.bank_name}`" @click="openBankEditor(account)">
                        <ion-icon :icon="createOutline" aria-hidden="true" />
                      </button>
                      <button type="button" class="bank-icon-action bank-icon-action--danger" :aria-label="`Hapus rekening ${account.bank_name}`" @click="confirmDeleteBank(account)">
                        <ion-icon :icon="trashOutline" aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                  <div class="bank-account-footer">
                    <span v-if="account.description">{{ account.description }}</span>
                    <span v-else>Rekening pembayaran resmi PoliLand Kairagi</span>
                    <span v-if="account.is_primary" class="bank-primary-label">
                      <ion-icon :icon="starOutline" aria-hidden="true" /> Prioritas Utama
                    </span>
                    <span v-else-if="!account.is_active" class="bank-inactive-label">Tidak ditampilkan ke pembeli</span>
                  </div>
                </article>
              </div>

              <StatusIllustration
                v-else
                variant="empty-data"
                size="sm"
                title="Belum ada rekening bank"
                description="Tambahkan rekening resmi PoliLand Kairagi agar pembeli dapat memilih tujuan transfer."
              />

              <button type="button" class="bank-add-button" @click="openBankEditor()">
                <ion-icon :icon="addOutline" aria-hidden="true" />
                Tambah rekening
              </button>
            </template>
          </section>

          <section
            v-else
            id="payment-instruction-panel"
            role="tabpanel"
            aria-labelledby="payment-instruction-tab"
            class="instruction-panel"
          >
            <SkeletonRowList v-if="instructionLoading" :rows="2" :fields="2" label="Memuat instruksi pembayaran" />

            <StatusIllustration
              v-else-if="instructionError"
              :variant="resolveErrorVariant(instructionError)"
              size="sm"
              title="Instruksi gagal dimuat"
              :on-action="loadPaymentInstruction"
            />

            <template v-else>
              <section class="instruction-editor" aria-label="Formulir instruksi pembayaran">
                <div class="instruction-field">
                  <label for="instruction-title-input">Judul Instruksi</label>
                  <input id="instruction-title-input" v-model.trim="instructionDraft.title" maxlength="120" placeholder="Petunjuk Pembayaran PoliLand Kairagi" />
                </div>

                <div class="instruction-field">
                  <label for="instruction-intro-input">Deskripsi Pembuka</label>
                  <textarea id="instruction-intro-input" v-model.trim="instructionDraft.intro" rows="4" maxlength="1200" placeholder="Jelaskan hal yang perlu diketahui pembeli sebelum melakukan pembayaran." />
                  <small>{{ instructionDraft.intro.length }}/1200 karakter</small>
                </div>

                <div class="instruction-section-heading">
                  <div>
                    <h2>Daftar Langkah Petunjuk</h2>
                    <p>Urutkan langkah sesuai alur pembayaran pembeli.</p>
                  </div>
                  <span>{{ instructionDraft.steps.length }} langkah</span>
                </div>

                <div class="instruction-steps">
                  <div v-for="(step, index) in instructionDraft.steps" :key="step.key" class="instruction-step">
                    <span class="instruction-step-number">{{ index + 1 }}</span>
                    <label class="visually-hidden" :for="`instruction-step-${step.key}`">Langkah {{ index + 1 }}</label>
                    <input :id="`instruction-step-${step.key}`" v-model.trim="step.text" :placeholder="`Tulis langkah ke-${index + 1}`" maxlength="240" />
                    <button type="button" class="instruction-remove" :aria-label="`Hapus langkah ${index + 1}`" :disabled="instructionDraft.steps.length <= 1" @click="removeInstructionStep(index)">
                      <ion-icon :icon="closeOutline" aria-hidden="true" />
                    </button>
                  </div>
                </div>

                <button type="button" class="instruction-add" @click="addInstructionStep">
                  <ion-icon :icon="addOutline" aria-hidden="true" />
                  Tambah langkah
                </button>

                <div class="instruction-field instruction-notes-field">
                  <label for="instruction-notes-input">Informasi Penting</label>
                  <textarea id="instruction-notes-input" v-model="instructionDraft.important_notes_text" rows="4" maxlength="1200" placeholder="Tuliskan catatan penting. Pisahkan setiap poin dengan baris baru." />
                  <small>Satu baris akan ditampilkan sebagai satu poin perhatian.</small>
                </div>

                <label class="instruction-publish-toggle">
                  <input v-model="instructionDraft.is_active" type="checkbox" />
                  <span>
                    <strong>Tampilkan instruksi kepada pembeli</strong>
                    <small>Matikan jika instruksi sedang diperbarui dan belum siap ditampilkan.</small>
                  </span>
                </label>

                <div class="instruction-actions">
                  <button type="button" class="instruction-save" :disabled="instructionSaving || !canSaveInstruction" @click="savePaymentInstruction">
                    <ion-spinner v-if="instructionSaving" name="crescent" />
                    <ion-icon v-else :icon="saveOutline" aria-hidden="true" />
                    {{ instructionSaving ? 'Menyimpan...' : 'Simpan instruksi' }}
                  </button>
                  <button v-if="instructionExists" type="button" class="instruction-delete" :disabled="instructionSaving" @click="deletePaymentInstruction">
                    <ion-icon :icon="trashOutline" aria-hidden="true" />
                    Hapus Instruksi
                  </button>
                </div>
              </section>
            </template>
          </section>
        </template>

        <template v-else-if="activeView === 'reports'">
          <template v-if="selectedReportLot">
            <div class="report-detail-back">
              <button type="button" @click="selectedReportLot = null">
                <ion-icon :icon="chevronBackOutline" aria-hidden="true" />
                Kembali
              </button>
            </div>

            <section class="report-detail-heading">
              <div>
                <h1>Detail Keuangan</h1>
                <p>{{ selectedReportLot.lotCode }}</p>
              </div>
              <span class="report-lot-status" :class="`report-lot-status--${selectedReportLot.statusTone}`">
                {{ selectedReportLot.statusLabel }}
              </span>
            </section>

            <section class="report-detail-card">
              <div class="report-lot-identity">
                <div class="report-lot-placeholder"><ion-icon :icon="businessOutline" aria-hidden="true" /></div>
                <div>
                  <h2>{{ selectedReportLot.lotCode }}</h2>
                  <p>{{ selectedReportLot.blockName || 'Blok belum tersedia' }} <span v-if="selectedReportLot.area">· Luas {{ selectedReportLot.area }} m²</span></p>
                </div>
              </div>
              <div class="report-contact-row">
                <div>
                  <span>Pembeli</span>
                  <strong>{{ selectedReportLot.customerName }}</strong>
                  <small>{{ selectedReportLot.customerPhone || 'Nomor telepon belum tersedia' }}</small>
                </div>
                <a v-if="selectedReportLot.customerPhone" :href="whatsappUrl(selectedReportLot.customerPhone)" target="_blank" rel="noopener noreferrer" class="report-contact-action"><ion-icon :icon="chatbubbleEllipsesOutline" /> WhatsApp</a>
              </div>
              <div class="report-contact-row">
                <div>
                  <span>Pemasar</span>
                  <strong>{{ selectedMarketingName || selectedReportLot.marketingName || 'Belum ditetapkan' }}</strong>
                  <small>Pemasar yang menangani transaksi</small>
                </div>
              </div>
            </section>

            <section class="report-detail-card">
              <div class="report-detail-section-title">
                <h2>Ringkasan Keuangan</h2>
                <span>{{ selectedReportLot.paymentTypeLabel }}</span>
              </div>
              <div class="report-balance-box">
                <div class="report-balance-top">
                  <span>Sisa tagihan</span>
                  <span>{{ selectedReportLot.remaining > 0 ? `${selectedReportLot.progress.toFixed(1)}% terbayar` : 'Lunas' }}</span>
                </div>
                <strong>{{ formatCurrency(selectedReportLot.remaining) }}</strong>
                <div class="report-balance-meta">
                  <span>Harga transaksi</span><b>{{ formatCurrency(selectedReportLot.finalPrice) }}</b>
                </div>
              </div>
              <div class="report-detail-stats">
                <div><span>Total dibayar</span><strong>{{ formatCurrency(selectedReportLot.paid) }}</strong></div>
                <div><span>Kemajuan pembayaran</span><strong>{{ selectedReportLot.progress.toFixed(1) }}%</strong></div>
              </div>
              <FinanceAmountBreakdown
                :booking-fee="selectedReportLot.bookingFee"
                :booking-fee-paid="selectedReportLot.bookingFeePaid"
                :principal-amount="selectedReportLot.principalAmount"
                :down-payment="selectedReportLot.downPayment"
                :margin-amount="selectedReportLot.marginAmount"
                :installment-total="selectedReportLot.installmentTotal"
                :format-currency="formatCurrency"
              />
              <div class="report-progress-track"><span :style="{ width: `${selectedReportLot.progress}%` }" /></div>
              <div v-if="selectedReportLot.months" class="report-installment-info">
                <span>Tenor</span><strong>{{ selectedReportLot.months }} bulan</strong>
                <span>Angsuran per bulan</span><strong>{{ selectedReportLot.monthlyPayment ? formatCurrency(selectedReportLot.monthlyPayment) : 'Belum ditentukan' }}</strong>
                <span>Mulai cicilan</span><strong>{{ selectedReportLot.installmentStartDate ? formatShortDate(selectedReportLot.installmentStartDate) : 'Belum ditentukan' }}</strong>
              </div>
            </section>

            <section v-if="selectedReportLot.paymentType === 'Installment'" class="report-detail-history">
              <div class="report-detail-section-title"><h2>Jadwal Cicilan</h2><span>{{ installmentProgressLine }}</span></div>
              <SkeletonRowList v-if="schedulesLoading" :rows="3" :fields="1" :badges="[1]" label="Memuat jadwal cicilan" />
              <StatusIllustration v-else-if="schedulesError" :variant="resolveErrorVariant(schedulesError)" size="sm" title="Jadwal cicilan gagal dimuat" :on-action="loadSchedulesForSelectedLot" />
              <article v-for="schedule in installmentSchedules" :key="schedule.id" class="installment-detail-row">
                <span class="installment-detail-number">{{ schedule.installment_number }}</span>
                <div><strong>{{ formatShortDate(schedule.due_date) }}</strong><small>Ke-{{ schedule.installment_number }} dari {{ installmentSchedules.length }}</small></div>
                <div class="installment-detail-amount"><strong>{{ formatCurrency(schedule.amount) }}</strong><span :class="`installment-status installment-status--${schedule.status.toLowerCase()}`">{{ schedule.status === 'Paid' ? 'Lunas' : schedule.pending_payment ? 'Menunggu Verifikasi' : schedule.due_date < todayDate ? 'Jatuh Tempo' : 'Mendatang' }}</span></div>
              </article>
              <StatusIllustration v-if="!schedulesLoading && !schedulesError && !installmentSchedules.length" variant="empty-data" size="sm" title="Jadwal cicilan belum tersedia" description="Jadwal akan dibuat setelah transaksi cicilan terkonfirmasi." />
            </section>

            <section class="report-detail-history">
              <div class="report-detail-section-title">
                <h2>Riwayat Transaksi</h2>
                <span>{{ selectedReportLot.payments.length }} transaksi</span>
              </div>
              <article v-for="payment in lotPaymentsPager.items" :key="payment.id" class="report-payment-history-card">
                <div class="report-payment-history-top">
                  <div><strong>{{ payment.reference }}</strong><small>{{ formatDate(payment.date) }}</small></div>
                <div class="report-payment-status-group">
                  <span class="report-payment-status" :class="`report-payment-status--${payment.statusTone}`">{{ payment.statusLabel }}</span>
                  <span v-if="payment.refundStatus === 'Refunded'" class="report-payment-status report-payment-status--refunded">Sudah dikembalikan</span>
                </div>
                </div>
                <div class="report-payment-history-amount">{{ formatCurrency(payment.amount) }}</div>
                <div class="report-payment-history-meta">
                  <span>{{ payment.categoryLabel }}</span>
                  <span>{{ payment.method }}</span>
                </div>
                <p v-if="payment.note">{{ payment.note }}</p>
                <button type="button" class="report-proof-link" @click="openPaymentProof(Number(payment.id))"><ion-icon :icon="imageOutline" /> {{ payment.refundStatus === 'Refunded' ? 'Bukti pengembalian' : 'Bukti bayar' }}</button>
              </article>
              <AppPagination v-model:page="lotPaymentsPager.page" :total-pages="lotPaymentsPager.totalPages" :total="lotPaymentsPager.total" :page-size="lotPaymentsPager.pageSize" label="Halaman riwayat transaksi" />
              <StatusIllustration v-if="!selectedReportLot.payments.length" variant="empty-data" size="sm" title="Belum ada riwayat pembayaran" description="Pembayaran untuk kaveling ini akan tercatat di sini." />
            </section>
            <button v-if="availableToPay > 0" type="button" class="report-add-payment-button" @click="openAddPayment">
              <ion-icon :icon="addCircleOutline" aria-hidden="true" /> Catat Pembayaran
            </button>
            <p v-else class="report-paid-note" role="status">{{ selectedReportLot.remaining <= 0 ? 'Kaveling ini sudah lunas.' : 'Pembayaran yang menunggu verifikasi sudah menutup sisa tagihan.' }}</p>
          </template>

          <template v-else-if="selectedBuyer">
            <div class="report-detail-back">
              <button type="button" @click="selectedReportBuyer = null">
                <ion-icon :icon="chevronBackOutline" aria-hidden="true" />
                Kembali
              </button>
            </div>

            <section class="report-detail-card">
              <div class="report-buyer-heading">
                <div class="report-buyer-avatar">{{ initials(selectedBuyer.name) }}</div>
                <div class="report-buyer-identity"><h1>{{ selectedBuyer.name }}</h1><p>{{ selectedBuyer.phone || 'Nomor telepon belum tersedia' }}</p></div>
                <span class="report-buyer-count">{{ selectedBuyer.lotCount }} kaveling</span>
              </div>
              <div class="buyer-detail-actions">
                <a v-if="selectedBuyer.phone" :href="whatsappUrl(selectedBuyer.phone)" target="_blank" rel="noopener noreferrer" class="report-contact-action"><ion-icon :icon="chatbubbleEllipsesOutline" aria-hidden="true" /> WhatsApp</a>
                <button type="button" class="report-contact-action" @click="openBuyerProfile(selectedBuyer.id)"><ion-icon :icon="peopleOutline" aria-hidden="true" /> Profil lengkap</button>
              </div>
            </section>

            <section class="report-detail-card" aria-labelledby="buyer-obligation-heading">
              <div class="report-detail-section-title"><h2 id="buyer-obligation-heading">Ringkasan kewajiban</h2></div>
              <dl class="finance-figures">
                <div><dt>Total kewajiban</dt><dd>{{ formatCurrency(buyerTotals.obligation) }}</dd></div>
                <div><dt>Sudah dibayar</dt><dd class="amount--in">{{ formatCurrency(buyerTotals.paid) }}</dd></div>
                <div v-if="buyerTotals.pending > 0"><dt>Menunggu verifikasi</dt><dd>{{ formatCurrency(buyerTotals.pending) }}</dd></div>
                <div class="finance-figures__total"><dt>Sisa tagihan</dt><dd :class="{ 'amount--out': buyerTotals.remaining > 0 }">{{ formatCurrency(buyerTotals.remaining) }}</dd></div>
              </dl>
            </section>

            <section class="report-detail-history" aria-labelledby="buyer-lots-heading">
              <div class="report-detail-section-title"><h2 id="buyer-lots-heading">Kaveling</h2><span>{{ selectedBuyer.lotCount }} kaveling</span></div>
              <button v-for="lot in selectedBuyer.lots" :key="lot.key" type="button" class="buyer-lot-row" @click="openReportLot(lot)">
                <span class="buyer-lot-row__name"><strong>{{ lot.lotCode }} {{ lot.blockName }}</strong><small>{{ lot.statusLabel }}</small></span>
                <span class="buyer-lot-row__money"><small>Sisa tagihan</small><strong :class="{ 'amount--out': lot.remaining > 0 }">{{ formatCurrency(lot.remaining) }}</strong></span>
                <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
              </button>
            </section>

            <section class="report-detail-history" aria-labelledby="buyer-history-heading">
              <div class="report-detail-section-title"><h2 id="buyer-history-heading">Riwayat pembayaran</h2><span>{{ buyerPayments.length }} transaksi</span></div>
              <article v-for="payment in buyerPaymentsPager.items" :key="payment.id" class="report-payment-history-card">
                <div class="report-payment-history-top">
                  <div><strong>{{ payment.reference }}</strong><small>{{ formatDate(payment.date) }} · {{ payment.lotCode }}</small></div>
                  <div class="report-payment-status-group">
                    <span class="report-payment-status" :class="`report-payment-status--${payment.statusTone}`">{{ payment.statusLabel }}</span>
                  </div>
                </div>
                <div class="report-payment-history-amount">{{ formatCurrency(payment.amount) }}</div>
                <div class="report-payment-history-meta"><span>{{ payment.categoryLabel }}</span><span>{{ payment.method }}</span></div>
                <button type="button" class="report-proof-link" @click="openPaymentProof(Number(payment.id))"><ion-icon :icon="imageOutline" aria-hidden="true" /> Bukti pembayaran</button>
              </article>
              <AppPagination v-model:page="buyerPaymentsPager.page" :total-pages="buyerPaymentsPager.totalPages" :total="buyerPaymentsPager.total" :page-size="buyerPaymentsPager.pageSize" label="Halaman riwayat pembayaran" />
              <StatusIllustration v-if="!buyerPayments.length" variant="empty-data" size="sm" title="Belum ada pembayaran" description="Pembayaran pembeli ini akan tercatat di sini." />
            </section>
          </template>

          <template v-else>
            <div class="report-toolbar" :class="{ 'report-toolbar--period': activeReportTab === 'summary' }">
              <div v-if="activeReportTab === 'summary'" class="report-period" role="group" aria-label="Filter periode laporan">
                <div class="report-granularity" role="tablist" aria-label="Rentang periode">
                  <button
                    v-for="option in granularityOptions"
                    :key="option.value"
                    type="button"
                    role="tab"
                    :aria-selected="reportGranularity === option.value"
                    :class="{ 'is-active': reportGranularity === option.value }"
                    @click="setReportGranularity(option.value)"
                  >{{ option.label }}</button>
                </div>
                <div class="report-stepper">
                  <button type="button" aria-label="Periode sebelumnya" @click="stepReportPeriod(-1)"><ion-icon :icon="chevronBackOutline" aria-hidden="true" /></button>
                  <button type="button" class="report-stepper__label" :disabled="isCurrentPeriod" :title="isCurrentPeriod ? 'Periode saat ini' : 'Kembali ke periode saat ini'" @click="resetReportPeriod">
                    <ion-icon :icon="calendarOutline" aria-hidden="true" />
                    <span>{{ selectedMonthLabel }}</span>
                  </button>
                  <button type="button" aria-label="Periode berikutnya" :disabled="isCurrentPeriod" @click="stepReportPeriod(1)"><ion-icon :icon="chevronForwardOutline" aria-hidden="true" /></button>
                </div>
              </div>
              <button type="button" class="export-button" :disabled="pdfExporting" @click="exportReport">
                <ion-spinner v-if="pdfExporting" name="crescent" />
                <ion-icon v-else :icon="downloadOutline" aria-hidden="true" />
                {{ pdfExporting ? 'Menyiapkan...' : 'Unduh PDF' }}
              </button>
            </div>
            <AppNotice v-if="pdfError" tone="error">
              {{ pdfError }}
            </AppNotice>

            <div v-if="loading || (activeReportTab === 'summary' && reportLedgerLoading)" class="finance-skeleton">
              <SkeletonStatGrid :count="4" :label="reportLedgerLoading ? 'Memuat arus kas' : 'Memuat laporan keuangan'" />
              <SkeletonRowList :rows="4" :fields="2" :badges="[]" />
            </div>
            <StatusIllustration
              v-else-if="errorMessage || (activeReportTab === 'summary' && reportLedgerError)"
              :variant="resolveErrorVariant(reportLedgerError || errorMessage)"
              size="sm"
              title="Laporan keuangan gagal dimuat"
              :on-action="retryFinanceReport"
            />

            <template v-else>
              <template v-if="activeReportTab === 'summary'">
                <section class="report-total-card report-total-card--monthly">
                  <div class="report-total-top">
                    <span><ion-icon :icon="walletOutline" aria-hidden="true" /> PEMASUKAN BRUTO ({{ selectedMonthLabel.toUpperCase() }})</span>
                    <span v-if="monthComparison !== null" class="report-growth" :class="{ 'report-growth--down': monthComparison < 0 }">
                      {{ monthComparison >= 0 ? '↑' : '↓' }} {{ Math.abs(monthComparison).toFixed(1) }}% vs {{ previousPeriodNounLabel }}
                    </span>
                  </div>
                  <strong>{{ formatCurrency(monthlyIncome) }}</strong>
                  <p>Belum dikurangi pengembalian dana.</p>
                  <div class="report-income-sources">
                    <div>
                      <span><i class="report-dot report-dot--gold" /> Tanda jadi masuk</span>
                      <strong>{{ formatCurrency(monthlyBookingIncome) }}</strong>
                      <small>{{ monthlyBookingCount }} transaksi</small>
                    </div>
                    <div>
                      <span><i class="report-dot report-dot--green" /> Pembayaran Lain</span>
                      <strong>{{ formatCurrency(monthlyOtherIncome) }}</strong>
                      <small>{{ monthlyOtherCount }} transaksi kas masuk</small>
                    </div>
                  </div>
                </section>

                <section class="report-summary report-cashflow-metrics" aria-label="Metrik arus kas">
                  <article class="report-metric-card"><span>Pengeluaran</span><strong>{{ formatCurrency(monthlyTotalExpenses) }}</strong></article>
                  <article class="report-metric-card"><span>Pengembalian dana</span><strong>{{ formatCurrency(monthlyRefundExpenses) }}</strong></article>
                  <article class="report-metric-card"><span>Arus kas bersih</span><strong>{{ formatCurrency(monthlyNetCashFlow) }}</strong><small>Bukan laba</small></article>
                </section>

                <section class="report-panel report-trend-panel">
                  <div class="panel-heading">
                    <div><h2>{{ trendTitle }}</h2><p>{{ trendSubtitle }}</p></div>
                    <span class="panel-period">Pemasukan bruto tertinggi: {{ peakMonthLabel }}</span>
                  </div>
                  <div class="monthly-chart monthly-chart--trend" :class="{ 'monthly-chart--dense': monthlyReport.length > 6 }" :style="{ gridTemplateColumns: `repeat(${monthlyReport.length}, minmax(0, 1fr))` }" role="img" :aria-label="monthlyChartDescription">
                    <div v-for="month in monthlyReport" :key="month.key" class="chart-column">
                      <strong class="chart-value">Masuk {{ formatCompactCurrency(month.grossIncome) }}</strong>
                      <div class="chart-track"><span class="chart-bar chart-bar--income" :class="{ 'chart-bar--peak': month.key === peakMonthKey }" :style="{ height: `${Math.max((month.grossIncome / monthlyMax) * 100, month.grossIncome > 0 ? 5 : 0)}%` }" /><span class="chart-bar chart-bar--expense" :style="{ height: `${Math.max((month.totalExpenses / monthlyMax) * 100, month.totalExpenses > 0 ? 5 : 0)}%` }" /></div>
                      <span class="chart-label">{{ month.label }}</span>
                    </div>
                  </div>
                  <details class="report-breakdown">
                    <summary>Lihat rincian per periode</summary>
                    <ul>
                      <li v-for="month in monthlyReport" :key="month.key">
                        <strong>{{ month.label }}</strong>
                        <span>Masuk {{ formatCompactCurrency(month.grossIncome) }}</span>
                        <span>Keluar {{ formatCompactCurrency(month.totalExpenses) }}</span>
                        <span>Pengembalian dana {{ formatCompactCurrency(month.refundExpenses) }}</span>
                        <span>Bersih {{ formatCompactCurrency(month.netCashFlow) }}</span>
                      </li>
                    </ul>
                  </details>
                </section>

                <section class="report-recent-section">
                  <div class="report-section-heading"><h2>Transaksi kas</h2><span>{{ recentReportPayments.length }} transaksi</span></div>
                  <article v-for="payment in recentPager.items" :key="payment.id" class="report-recent-card">
                    <div class="report-recent-icon" :class="payment.flowDirection === 'inflow' ? 'is-confirmed' : 'is-outflow'">
                      <ion-icon :icon="payment.flowDirection === 'inflow' ? checkmarkCircleOutline : closeCircleOutline" aria-hidden="true" />
                    </div>
                    <div class="report-recent-main">
                      <strong>{{ payment.customerName }}</strong>
                      <p>{{ payment.lotCode }} · {{ payment.method }}</p>
                      <small>{{ formatShortDate(payment.date) }}</small>
                    </div>
                    <div class="report-recent-amount">
                      <strong :class="payment.flowDirection === 'inflow' ? 'amount--in' : 'amount--out'">{{ payment.flowDirection === 'inflow' ? '+' : '-' }}{{ formatCurrency(payment.amount) }}</strong>
                      <small :class="`report-text-${payment.statusTone}`">{{ payment.statusLabel }}</small>
                    </div>
                  </article>
                  <AppPagination v-model:page="recentPager.page" :total-pages="recentPager.totalPages" :total="recentPager.total" :page-size="recentPager.pageSize" label="Halaman transaksi kas" />
                  <StatusIllustration v-if="!recentReportPayments.length" variant="empty-data" size="sm" title="Belum ada transaksi" description="Belum ada transaksi pada periode ini." />
                </section>
              </template>

              <template v-else-if="activeReportTab === 'lots'">
                <section class="report-list-intro">
                  <h1 class="visually-hidden">Laporan per kaveling</h1>
                  <span>{{ filteredReportLots.length }} kaveling</span>
                </section>
                <label class="report-search report-search--full">
                  <ion-icon :icon="searchOutline" aria-hidden="true" />
                  <span class="visually-hidden">Cari kaveling</span>
                  <input v-model="reportQuery" type="search" placeholder="Cari nomor kaveling, blok, atau nama pembeli..." />
                  <button v-if="reportQuery" type="button" aria-label="Hapus pencarian" @click="reportQuery = ''"><ion-icon :icon="closeOutline" aria-hidden="true" /></button>
                </label>
                <div v-if="filteredReportLots.length" class="report-lot-list">
                  <article v-for="lot in lotsPager.items" :key="lot.key" class="report-lot-card">
                    <div class="report-lot-card-heading">
                      <div><h2>{{ lot.lotCode }} {{ lot.blockName }}</h2><p>Pemilik: <strong>{{ lot.customerName }}</strong></p></div>
                      <span class="report-lot-status" :class="`report-lot-status--${lot.statusTone}`">{{ lot.statusLabel }}</span>
                    </div>
                    <div class="report-lot-metrics">
                      <div><span>Harga kaveling</span><strong>{{ formatCurrency(lot.finalPrice) }}</strong></div>
                      <div><span>Sudah dibayar</span><strong class="amount--in">{{ formatCurrency(lot.paid) }}</strong></div>
                      <div><span>Sisa tagihan</span><strong :class="{ 'amount--out': lot.remaining > 0 }">{{ formatCurrency(lot.remaining) }}</strong></div>
                    </div>
                    <div class="report-lot-progress-label"><span>Progres Pembayaran</span><strong>{{ lot.progress.toFixed(1) }}% <small>({{ lot.paidPaymentCount }} pembayaran terkonfirmasi)</small></strong></div>
                    <div class="report-progress-track"><span :style="{ width: `${lot.progress}%` }" /></div>
                    <button type="button" class="report-detail-button" @click="openReportLot(lot)">Lihat rincian <ion-icon :icon="chevronForwardOutline" aria-hidden="true" /></button>
                  </article>
                  <AppPagination v-model:page="lotsPager.page" :total-pages="lotsPager.totalPages" :total="lotsPager.total" :page-size="lotsPager.pageSize" label="Halaman daftar kaveling" />
                </div>
                <StatusIllustration v-else :variant="reportQuery ? 'no-result' : 'empty-data'" size="sm" :title="reportQuery ? 'Kavling tidak ditemukan' : 'Belum ada transaksi kavling'" :description="reportQuery ? 'Tidak ada kavling yang cocok dengan pencarian.' : 'Data akan tampil setelah ada transaksi.'" />
              </template>

              <template v-else>
                <section class="report-list-intro">
                  <h1 class="visually-hidden">Laporan per pembeli</h1>
                  <span>{{ filteredReportBuyers.length }} pembeli</span>
                </section>
                <label class="report-search report-search--full">
                  <ion-icon :icon="searchOutline" aria-hidden="true" />
                  <span class="visually-hidden">Cari pembeli</span>
                  <input v-model="reportQuery" type="search" placeholder="Cari nama atau nomor telepon pembeli..." />
                  <button v-if="reportQuery" type="button" aria-label="Hapus pencarian" @click="reportQuery = ''"><ion-icon :icon="closeOutline" aria-hidden="true" /></button>
                </label>
                <div v-if="filteredReportBuyers.length" class="report-buyer-list">
                  <article v-for="buyer in buyersPager.items" :key="buyer.id" class="report-buyer-card">
                    <div class="report-buyer-heading">
                      <div class="report-buyer-avatar">{{ initials(buyer.name) }}</div>
                      <div class="report-buyer-identity"><h2>{{ buyer.name }}</h2><p>{{ buyer.phone || 'Nomor telepon belum tersedia' }}</p></div>
                      <span class="report-buyer-count">{{ buyer.lotCount }} kaveling</span>
                    </div>
                    <div class="report-buyer-balance">
                      <div><span>Sudah dibayar</span><strong class="amount--in">{{ formatCurrency(buyer.paid) }}</strong></div>
                      <div><span>Sisa tagihan</span><strong :class="{ 'amount--out': buyer.remaining > 0 }">{{ formatCurrency(buyer.remaining) }}</strong></div>
                    </div>
                    <div class="report-buyer-lots">
                      <span v-for="lot in buyer.lots.slice(0, 3)" :key="lot.key"><ion-icon :icon="businessOutline" aria-hidden="true" /> {{ lot.lotCode }} {{ lot.blockName }}</span>
                      <small v-if="buyer.lotCount > 3">+{{ buyer.lotCount - 3 }} kaveling lainnya</small>
                    </div>
                    <button type="button" class="report-detail-button report-buyer-open" :aria-label="`Lihat rincian ${buyer.name}`" @click="openBuyer(buyer)">Lihat rincian <ion-icon :icon="chevronForwardOutline" aria-hidden="true" /></button>
                  </article>
                  <AppPagination v-model:page="buyersPager.page" :total-pages="buyersPager.totalPages" :total="buyersPager.total" :page-size="buyersPager.pageSize" label="Halaman daftar pembeli" />
                </div>
                <StatusIllustration v-else :variant="reportQuery ? 'no-result' : 'empty-data'" size="sm" :title="reportQuery ? 'Pembeli tidak ditemukan' : 'Belum ada data pembeli'" :description="reportQuery ? 'Tidak ada pembeli yang cocok dengan pencarian.' : 'Data pembeli akan tampil setelah ada transaksi.'" />
              </template>
            </template>
          </template>
        </template>

        <template v-else-if="activeView === 'cancellations'">
          <section class="cancellation-review-page" aria-labelledby="cancellation-review-heading">
            <div class="ledger-heading">
              <div><h1 id="cancellation-review-heading">Pengajuan Pembatalan</h1><p>Persetujuan melepaskan kaveling dan menyiapkan pengembalian 50% dari uang muka serta cicilan terkonfirmasi.</p></div>
            </div>
            <div class="ledger-policy-note" role="note">Tanda jadi dan denda tidak termasuk dasar pengembalian. Transfer pengembalian dana harus dicatat terpisah dengan referensi bank dan bukti transfer.</div>
            <SkeletonRowList v-if="cancellationLoading" :rows="2" :fields="3" :badges="[3]" label="Memuat pengajuan" />
            <StatusIllustration
              v-else-if="cancellationError"
              :variant="resolveErrorVariant(cancellationError)"
              size="sm"
              title="Pengajuan tidak dapat dimuat"
              :on-action="loadCancellationRequests"
            />
            <StatusIllustration v-else-if="!cancellationRequests.length" variant="empty-data" size="sm" title="Tidak ada pengajuan menunggu" description="Pengajuan pembatalan baru akan muncul di sini." />
            <div v-else class="cancellation-request-list">
              <article v-for="request in cancellationPager.items" :key="request.id" class="cancellation-review-card">
                <div class="cancellation-review-card__top"><div><span>Pengajuan #{{ request.id }} · {{ formatShortDate(request.created_at) }}</span><h2>{{ request.customer_name }}</h2><small>{{ request.customer_phone || 'Nomor kontak tidak tersedia' }}</small></div><strong>{{ request.lot_number }}<small>{{ request.block_name || 'Blok belum tersedia' }}</small></strong></div>
                <p class="cancellation-review-reason">{{ request.reason }}</p>
                <div class="cancellation-review-actions">
                  <button type="button" class="proof-reject-button" @click="openCancellationDecision(request, 'Rejected')">Tolak Pengajuan</button>
                  <button type="button" class="proof-verify-button" @click="openCancellationDecision(request, 'Approved')">Setujui Pembatalan</button>
                </div>
              </article>
              <AppPagination v-model:page="cancellationPager.page" :total-pages="cancellationPager.totalPages" :total="cancellationPager.total" :page-size="cancellationPager.pageSize" label="Halaman pengajuan pembatalan" />
            </div>
          </section>
        </template>

        <template v-else-if="activeView === 'ledger'">
          <section class="ledger-page" aria-labelledby="ledger-heading">
            <h1 id="ledger-heading" class="visually-hidden">Buku kas dan jurnal</h1>
            <div class="ledger-policy-note" role="note">
              Jurnal sementara mengkredit akun penerimaan yang belum diklasifikasikan. Admin atau akuntan perlu memetakan akun sesuai kebijakan perusahaan.
            </div>

            <div v-if="ledgerLoading" class="finance-skeleton">
              <SkeletonStatGrid :count="4" label="Memuat buku kas" />
              <SkeletonRowList :rows="4" :fields="2" />
            </div>
            <StatusIllustration
              v-else-if="ledgerError"
              :variant="resolveErrorVariant(ledgerError)"
              size="sm"
              title="Buku kas belum tersedia"
              :on-action="loadFinancialLedger"
            />
            <template v-else>
              <dl class="ledger-totals" aria-label="Ringkasan arus kas pada daftar">
                <div><dt>Pemasukan</dt><dd class="amount--in">{{ formatCurrency(ledgerInflow) }}</dd></div>
                <div><dt>Pengeluaran</dt><dd class="amount--out">{{ formatCurrency(ledgerOutflow) }}</dd></div>
                <div class="ledger-totals__net"><dt>Arus kas bersih</dt><dd>{{ formatCurrency(ledgerInflow - ledgerOutflow) }}</dd></div>
              </dl>
              <p class="ledger-count">{{ ledgerEntries.length }} pembukuan terbaru (maksimal 200 entri)</p>

              <ul v-if="ledgerEntries.length" class="ledger-list">
                <li v-for="entry in ledgerPager.items" :key="entry.id" class="ledger-item">
                  <div class="ledger-item__top">
                    <div class="ledger-item__title">
                      <strong>{{ ledgerEntryTitle(entry) }}</strong>
                      <small>{{ ledgerSourceLabel(entry) }} · {{ formatShortDate(entry.occurred_on) }}</small>
                    </div>
                    <strong class="ledger-item__amount" :class="entry.flow_direction === 'inflow' ? 'amount--in' : 'amount--out'">{{ entry.flow_direction === 'inflow' ? '+' : '-' }}{{ formatCurrency(entry.amount) }}</strong>
                  </div>
                  <p class="ledger-item__ref"><span>Referensi bank</span>{{ entry.bank_reference || 'Belum dicantumkan' }}</p>
                  <details v-if="entry.journal?.lines?.length" class="ledger-journal">
                    <summary>Lihat jurnal</summary>
                    <ul>
                      <li v-for="line in entry.journal.lines" :key="`${entry.id}-${line.accountCode}`">
                        <strong>{{ line.accountCode }} · {{ line.accountName }}</strong>
                        <span>Debit {{ formatCurrency(line.debit) }}</span>
                        <span>Kredit {{ formatCurrency(line.credit) }}</span>
                      </li>
                    </ul>
                  </details>
                </li>
              </ul>
              <AppPagination v-model:page="ledgerPager.page" :total-pages="ledgerPager.totalPages" :total="ledgerPager.total" :page-size="ledgerPager.pageSize" label="Halaman buku kas" />
              <StatusIllustration v-if="!ledgerEntries.length" variant="empty-data" size="sm" title="Belum ada pembukuan" description="Pembayaran baru akan muncul setelah Admin mengonfirmasinya." />
            </template>
          </section>
        </template>

        <template v-else-if="activeView === 'plans'">
          <section class="payment-plans-page" aria-labelledby="payment-plans-heading">
            <div class="payment-plans-heading">
              <div>
                <h1 id="payment-plans-heading">Daftar Skema Cicilan</h1>
                <p class="payment-plans-description">Atur pilihan tenor dan margin cicilan yang digunakan saat membuat transaksi pembelian kaveling.</p>
              </div>
              <span class="payment-plans-count">{{ paymentPlans.length }} skema</span>
            </div>

            <SkeletonRowList v-if="planLoading" :rows="3" :fields="2" label="Memuat skema cicilan" />

            <StatusIllustration
              v-else-if="planError"
              :variant="resolveErrorVariant(planError)"
              size="sm"
              title="Skema cicilan gagal dimuat"
              :on-action="loadPaymentPlans"
            />

            <template v-else>
              <div v-if="paymentPlans.length" class="payment-plan-list">
                <article v-for="plan in paymentPlans" :key="plan.id" class="payment-plan-card">
                  <div class="payment-plan-card-heading">
                    <div class="payment-plan-tenor">
                      <span class="payment-plan-calendar"><ion-icon :icon="calendarOutline" aria-hidden="true" /></span>
                      <h2>{{ formatPaymentPlanName(plan.plan_name, plan.months) }}</h2>
                    </div>
                      <span class="payment-plan-months">{{ plan.months }} Bulan</span>
                  </div>

                  <div class="payment-plan-card-bottom">
                    <div class="payment-plan-margin" :aria-label="`Margin ${formatPlanMargin(plan.margin_percent)} persen`">
                      {{ formatPlanMargin(plan.margin_percent) }}%
                    </div>
                    <span class="payment-plan-usage">{{ plan.usage?.lotInstallments ?? 0 }} kaveling</span>
                    <div class="payment-plan-actions">
                      <AppButton class="payment-plan-action" variant="neutral" fill="solid" size="small" :aria-label="`Ubah skema ${formatPaymentPlanName(plan.plan_name, plan.months)}`" @click="openPlanEditor(plan)">
                        <ion-icon :icon="createOutline" aria-hidden="true" />
                      </AppButton>
                      <AppButton class="payment-plan-action payment-plan-action--delete" variant="danger" fill="outline" size="small" :aria-label="`Hapus skema ${formatPaymentPlanName(plan.plan_name, plan.months)}`" @click="openPlanDeleteConfirmation(plan)">
                        <ion-icon :icon="trashOutline" aria-hidden="true" />
                      </AppButton>
                    </div>
                  </div>
                </article>
              </div>

              <StatusIllustration
                v-else
                variant="empty-data"
                size="sm"
                title="Belum ada skema cicilan"
                description="Tambahkan skema tenor dan margin agar tersedia saat Admin membuat transaksi cicilan."
              />

              <AppButton class="payment-plan-add-button" variant="secondary" expand="block" @click="openPlanEditor()">
                <ion-icon :icon="addOutline" aria-hidden="true" />
                Tambah skema
              </AppButton>
            </template>
          </section>
        </template>

        <template v-else>
          <div class="finance-tabs" role="tablist" aria-label="Filter transaksi">
            <button v-for="filter in filters" :key="filter.value" type="button" :class="{ active: activeFilter === filter.value }" :aria-selected="activeFilter === filter.value" role="tab" @click="activeFilter = filter.value">{{ filter.label }} <span>{{ statusCounts[filter.value] }}</span></button>
          </div>

          <label class="finance-search">
            <ion-icon :icon="searchOutline" aria-hidden="true" />
            <span class="visually-hidden">Cari transaksi</span>
            <input v-model="query" type="search" placeholder="Cari nama, kode kaveling, atau metode pembayaran" />
            <button v-if="query" type="button" aria-label="Hapus pencarian" @click="query = ''"><ion-icon :icon="closeOutline" aria-hidden="true" /></button>
          </label>

          <SkeletonRowList v-if="loading || refreshing" :rows="4" :fields="3" :badges="[3]" label="Memuat transaksi" />
          <StatusIllustration
              v-else-if="errorMessage"
              :variant="resolveErrorVariant(errorMessage)"
              size="sm"
              title="Data keuangan gagal dimuat"
              :on-action="() => loadTransactions()"
            />
          <template v-else>
            <section v-if="filteredTransactions.length" class="transaction-list" aria-label="Daftar transaksi pembayaran">
              <article v-for="transaction in transactionPager.items" :key="transaction.id" class="transaction-card" :class="{ 'transaction-card--target': isTargetTransaction(transaction) }">
                <div class="transaction-head">
                  <div class="customer-mark" :class="`customer-mark--${transaction.status}`">{{ initials(transaction.customerName) }}</div>
                  <div class="transaction-customer"><h2>{{ transaction.customerName }}</h2><p>{{ transaction.lotCode }} · {{ transaction.paymentType }}</p></div>
                  <span class="status-badge" :class="`status-badge--${transaction.status}`">
                    {{ transaction.refundStatus === 'Refunded'
                      ? 'Sudah dikembalikan'
                      : transaction.refundStatus === 'Pending Refund'
                        ? 'Menunggu Pengembalian'
                        : transaction.reviewStatus === 'Needs Reupload'
                          ? 'Perlu unggah ulang'
                          : transaction.reviewStatus === 'Rejected'
                            ? 'Ditolak'
                            : statusLabel(transaction.status) }}
                  </span>
                </div>
                <div class="transaction-details"><div><span>Nominal pembayaran</span><strong>{{ formatCurrency(transaction.amount) }}</strong></div><div><span>{{ transaction.method }}</span><time :datetime="transaction.date">{{ formatDate(transaction.date) }}</time></div></div>
                <div class="transaction-actions">
                  <button type="button" class="primary-action" @click="handleFinanceTransactionAction(transaction)">
                    <ion-icon :icon="eyeOutline" aria-hidden="true" />
                    {{ transaction.status === 'pending' ? 'Periksa bukti' : 'Lihat' }}
                  </button>
                  <button v-if="transaction.spkRequestId" type="button" class="quiet-action spk-link-action" @click="openRelatedSpk(transaction)">
                    <ion-icon :icon="documentTextOutline" aria-hidden="true" />
                    Buka SPK
                  </button>
                </div>
              </article>
            </section>
            <AppPagination v-model:page="transactionPager.page" :total-pages="transactionPager.totalPages" :total="transactionPager.total" :page-size="transactionPager.pageSize" scroll-to=".transaction-list" label="Halaman transaksi pembayaran" />
            <StatusIllustration
              v-if="!filteredTransactions.length"
              :variant="query ? 'no-result' : 'empty-data'"
              :title="query ? 'Transaksi tidak ditemukan' : 'Tidak ada transaksi'"
              :description="query ? 'Coba ubah kata kunci pencarian.' : 'Belum ada transaksi pada kategori ini.'"
            />
          </template>
        </template>
        <button
          v-if="paymentPage === 'none' && !selectedReportLot && !selectedReportBuyer && (activeView === 'verification' || activeView === 'reports')"
          type="button"
          class="finance-fab"
          @click="openPaymentPicker"
        >
          <ion-icon :icon="addCircleOutline" aria-hidden="true" />
          Catat Pembayaran
        </button>

        <AppModal v-model="paymentPickerOpen" title="Pilih Kaveling" variant="bottom-sheet" :show-footer="false">
          <div class="payment-picker">
            <label class="report-search report-search--full">
              <ion-icon :icon="searchOutline" aria-hidden="true" />
              <span class="visually-hidden">Cari kaveling atau pembeli</span>
              <input v-model="paymentPickerQuery" type="search" placeholder="Cari kaveling atau nama pembeli" />
              <button v-if="paymentPickerQuery" type="button" aria-label="Hapus pencarian" @click="paymentPickerQuery = ''"><ion-icon :icon="closeOutline" aria-hidden="true" /></button>
            </label>
            <ul v-if="pickableLots.length" class="payment-picker__list">
              <li v-for="lot in pickerPager.items" :key="lot.key">
                <button type="button" @click="startManualPayment(lot)">
                  <span class="payment-picker__name"><strong>{{ lot.lotCode }} {{ lot.blockName }}</strong><small>{{ lot.customerName }}</small></span>
                  <span class="payment-picker__due"><small>Sisa tagihan</small><strong>{{ formatCurrency(lot.remaining) }}</strong></span>
                </button>
              </li>
            </ul>
            <p v-else class="payment-picker__empty">{{ paymentPickerQuery ? 'Tidak ada kaveling yang cocok dengan pencarian.' : 'Semua kaveling sudah lunas atau menunggu verifikasi.' }}</p>
            <AppPagination v-model:page="pickerPager.page" :total-pages="pickerPager.totalPages" :total="pickerPager.total" :page-size="pickerPager.pageSize" label="Halaman pilihan kaveling" />
          </div>
        </AppModal>

        <DocumentViewerModal
          :open="proofZoomOpen"
          :url="proofViewerUrl"
          :file-name="proofViewerName"
          :subtitle="proofViewerSubtitle"
          @close="proofZoomOpen = false"
        />

        <AppModal
          v-model="reviewDialogOpen"
          :title="reviewTargetStatus === 'Rejected' ? 'Tolak Transaksi' : 'Minta unggah ulang'"
          variant="dialog"
          :loading="reviewSaving"
          :confirm-disabled="!reviewReason.trim()"
          :confirm-text="reviewTargetStatus === 'Rejected' ? 'Tolak Pembayaran' : 'Kirim Permintaan'"
          :confirm-variant="reviewTargetStatus === 'Rejected' ? 'danger' : 'primary'"
          slide-confirm
          :slide-label="reviewTargetStatus === 'Rejected' ? 'Geser untuk menolak' : 'Geser untuk mengirim'"
          @confirm="submitPaymentReview"
        >
          <div class="payment-review-dialog">
            <p>{{ reviewTargetStatus === 'Rejected' ? 'Berikan alasan penolakan agar riwayat pembayaran jelas.' : 'Jelaskan bagian bukti yang perlu diperbaiki oleh pembeli.' }}</p>
            <label for="payment-review-reason">Catatan untuk pembeli</label>
            <textarea id="payment-review-reason" v-model.trim="reviewReason" rows="3" maxlength="500" placeholder="Tuliskan alasan secara jelas..." />
          </div>
        </AppModal>

        <AppModal
          v-model="bankModalOpen"
          :title="editingBankId ? 'Ubah rekening' : 'Tambah rekening'"
          variant="bottom-sheet"
          :loading="bankSaving"
          :confirm-disabled="!canSaveBank"
          confirm-text="Simpan Rekening"
          @confirm="saveBankAccount"
        >
          <div class="bank-form">
            <div class="instruction-field">
              <label for="bank-name">Nama Bank</label>
              <input id="bank-name" v-model.trim="bankDraft.bank_name" maxlength="80" placeholder="Contoh: BCA" />
            </div>
            <div class="instruction-field">
              <label for="bank-account-number">Nomor Rekening</label>
              <input id="bank-account-number" v-model.trim="bankDraft.account_number" inputmode="numeric" maxlength="40" placeholder="Masukkan nomor rekening" />
            </div>
            <div class="instruction-field">
              <label for="bank-account-holder">Nama Pemilik Rekening</label>
              <input id="bank-account-holder" v-model.trim="bankDraft.account_holder" maxlength="120" placeholder="Nama sesuai buku rekening" />
            </div>
            <div class="instruction-field">
              <label for="bank-description">Keterangan <span>(Opsional)</span></label>
              <input id="bank-description" v-model.trim="bankDraft.description" maxlength="180" placeholder="Contoh: Cabang Manado Kairagi" />
            </div>
            <label class="instruction-publish-toggle">
              <input v-model="bankDraft.is_active" type="checkbox" />
              <span><strong>Rekening aktif</strong><small>Rekening aktif akan ditampilkan kepada pembeli.</small></span>
            </label>
            <label class="instruction-publish-toggle">
              <input v-model="bankDraft.is_primary" type="checkbox" />
              <span><strong>Jadikan prioritas utama</strong><small>Rekening ini akan ditandai sebagai pilihan utama pada halaman pembayaran.</small></span>
            </label>
            <AppNotice v-if="bankFormError" tone="error">
              {{ bankFormError }}
            </AppNotice>
          </div>
        </AppModal>

        <AppModal
          v-model="planModalOpen"
          :title="editingPlanId ? 'Ubah skema' : 'Tambah skema'"
          variant="bottom-sheet"
          :loading="planSaving"
          :confirm-disabled="!canSavePlan"
          :confirm-text="editingPlanId ? 'Simpan Perubahan' : 'Tambah Skema'"
          @confirm="savePaymentPlan"
        >
          <div class="payment-plan-form">
            <div class="instruction-field">
              <AppInput
                input-id="payment-plan-months"
                :model-value="String(planDraft.months)"
                label="Lama Cicilan (Bulan)"
                type="number"
                min="1"
                max="1200"
                step="1"
                inputmode="numeric"
                placeholder="Contoh: 6"
                @update:model-value="planDraft.months = Number($event)"
              />
              <small>Masukkan durasi dalam bilangan bulan, misalnya 24 Bulan.</small>
            </div>
            <AppInput
              input-id="payment-plan-name"
              v-model="planDraft.plan_name"
              label="Nama Skema Cicilan"
              placeholder="Contoh: Cicilan Reguler"
              required
            />
            <div class="instruction-field">
              <AppInput
                input-id="payment-plan-margin"
                label="Margin (%)"
                :model-value="String(planDraft.margin_percent)"
                type="number"
                min="0"
                max="999.99"
                step="0.01"
                inputmode="decimal"
                placeholder="Contoh: 5"
                @update:model-value="planDraft.margin_percent = Number($event)"
              />
              <small class="payment-plan-input-note">Masukkan persentase, contoh 5 untuk margin 5%.</small>
              <small>Gunakan nilai persentase, bukan nominal rupiah. Perubahan margin akan memicu trigger sinkronisasi cicilan yang sudah terhubung.</small>
            </div>
            <AppNotice v-if="planFormError" tone="error">
              {{ planFormError }}
            </AppNotice>
          </div>
        </AppModal>


        <AppModal
          v-model="planDeleteModalOpen"
          title="Hapus Skema Cicilan"
          variant="dialog"
          :loading="planDeleting"
          confirm-text="Hapus Skema"
          confirm-variant="danger"
          slide-confirm
          slide-label="Geser untuk menghapus"
          @confirm="deletePaymentPlan"
        >
          <div class="payment-plan-delete-content">
            <div class="payment-plan-delete-icon"><ion-icon :icon="trashOutline" aria-hidden="true" /></div>
            <p v-if="planToDelete">Yakin ingin menghapus skema <strong>{{ formatPaymentPlanName(planToDelete.plan_name, planToDelete.months) }}</strong>?</p>
            <small v-if="planToDelete?.usage">
              Digunakan {{ planToDelete.usage.lotInstallments }} kaveling, {{ planToDelete.usage.lotTransactions }} transaksi, dan {{ planToDelete.usage.customerInterests }} minat pembeli.
              Skema yang sudah dipakai transaksi tidak dapat dihapus.
            </small>
            <AppNotice v-if="planDeleteError" tone="error">
              {{ planDeleteError }}
            </AppNotice>
          </div>
        </AppModal>

      </main>
    </ion-content>
    <MobileTabBar variant="admin" />
    <AppModal
      v-model="cancellationDecisionOpen"
      :title="cancellationDecision === 'Approved' ? 'Setujui Pembatalan' : 'Tolak Pengajuan Pembatalan'"
      :confirm-text="cancellationDecision === 'Approved' ? 'Setujui dan Lepaskan Kavling' : 'Tolak Pengajuan'"
      :confirm-variant="cancellationDecision === 'Approved' ? 'danger' : 'neutral'"
      slide-confirm
      :slide-label="cancellationDecision === 'Approved' ? 'Geser untuk melepas kavling' : 'Geser untuk menolak'"
      :loading="cancellationDecisionSaving"
      :confirm-disabled="cancellationDecisionNote.trim().length < 3"
      @confirm="saveCancellationDecision"
    >
      <div class="cancellation-decision-form">
        <p v-if="cancellationDecision === 'Approved'">Kaveling akan dilepaskan. Hak pengembalian dana dihitung dari uang muka dan cicilan yang sudah terkonfirmasi, tanpa tanda jadi dan denda.</p>
        <p v-else>Pengajuan ditolak dan transaksi serta kaveling tetap berjalan seperti semula.</p>
        <label for="cancellation-decision-note">Catatan keputusan Admin</label>
        <textarea id="cancellation-decision-note" v-model="cancellationDecisionNote" rows="3" maxlength="1000" placeholder="Tulis alasan dan tindak lanjut (minimal 3 karakter)." />
        <AppNotice v-if="cancellationDecisionError" tone="error">
          {{ cancellationDecisionError }}
        </AppNotice>
      </div>
    </AppModal>
  </ion-page>
</template>

<script setup lang="ts">
import AppNotice from '@/components/ui/AppNotice.vue'
import { useConfirm } from '@/composables/useConfirm'
import { useToast, type ToastTone } from '@/composables/useToast'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import SkeletonStatGrid from '@/components/ui/skeletons/SkeletonStatGrid.vue'
import SkeletonRowList from '@/components/ui/skeletons/SkeletonRowList.vue'
import { withRefreshSkeleton } from '@/utils/refreshSkeleton'
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRouter, type LocationQuery } from 'vue-router'
import { useOwnRouteQuery } from '@/composables/useOwnRouteQuery'
import { IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/vue'
import { addCircleOutline, addOutline, arrowForwardOutline, businessOutline, calendarOutline, chatbubbleEllipsesOutline, checkmarkCircleOutline, eyeOutline, chevronBackOutline, chevronForwardOutline, closeCircleOutline, closeOutline, copyOutline, createOutline, documentTextOutline, downloadOutline, imageOutline, informationCircleOutline, peopleOutline, pieChartOutline, refreshOutline, saveOutline, searchOutline, shieldCheckmarkOutline, starOutline, timeOutline, trashOutline, walletOutline } from 'ionicons/icons'
import AppPullRefresh from '@/components/common/AppPullRefresh.vue'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { customerService } from '@/services/marketing/customerService'
import { paymentInstructionService } from '@/services/Finance/paymentInstructionService'
import { bankAccountService, type BankAccountRecord } from '@/services/Finance/bankAccountService'
import { paymentPlanService, type PaymentPlanRecord } from '@/services/Finance/paymentPlanService'
import { financialLedgerService, type FinancialLedgerEntry } from '@/services/Finance/financialLedgerService'
import { cashflowTrendForPeriod, currentMakassarDateTimeLocal, currentMakassarDay, isoToMakassarDateTimeLocal, makassarDateTimeLocalToIso, postedCashflowForRange, previousPeriodNoun, reportLoadRange, reportPeriod, shiftReportAnchor, summarizeCashflow, type ReportGranularity } from '@/utils/financialCashflow'
import { buildCashflowPdfInput, buildReportPdf, formatPdfRupiah, type PdfReportInput } from '@/utils/financialPdf'
import { saveBlobAsFile } from '@/utils/fileDownload'
import { purchaseCancellationService, type PurchaseCancellationRequest } from '@/services/Finance/purchaseCancellationService'
import { paymentService, type InstallmentScheduleRecord, type PaymentDetail } from '@/services/Finance/paymentService'
import { supabase } from '@/services/config/supabase'
import {
  formatInstallmentRange,
  formatProgressLine,
  formatRupiah,
  nextSelection,
  selectableSequence,
  summarizeInstallmentProgress,
  validateSelectionOrder,
} from '@/utils/installmentFormat'
import AppModal from '@/components/ui/AppModal.vue'
import DocumentViewerModal from '@/components/ui/DocumentViewerModal.vue'
import SlideToConfirm from '@/components/ui/SlideToConfirm.vue'
import { useCelebration } from '@/composables/useCelebration'
import { calculateFinanceBalance } from '@/composables/useFinanceCalculations'
import type { FinanceAdminPaymentRecord, FinanceCustomerRecord, FinancePaymentRecord, FinanceTransactionRecord } from '@/types/finance'
import FinanceAmountBreakdown from '@/components/Admin/finance/FinanceAmountBreakdown.vue'
import AppPagination from '@/components/ui/AppPagination.vue'
import { usePagination } from '@/composables/usePagination'
import { formatPaymentPlanName } from '@/utils/paymentPlan'

const { confirm } = useConfirm()

const { celebrate } = useCelebration()

type FinanceStatus = 'pending' | 'verified' | 'overdue'
type FinanceTransaction = {
  id: string
  customerName: string
  lotCode: string
  paymentType: string
  amount: number
  method: string
  date: string
  status: FinanceStatus
  reviewStatus: string
  spkNumber: string
  spkRequestId: string
  refundStatus: 'Pending Refund' | 'Refunded' | null
  refundProofPath: string | null
}

type InstructionStepDraft = { key: string; text: string }
type PaymentInstructionDraft = {
  title: string
  intro: string
  steps: InstructionStepDraft[]
  important_notes_text: string
  is_active: boolean
}
const defaultInstructionDraft = (): PaymentInstructionDraft => ({
  title: 'Petunjuk Pembayaran PoliLand Kairagi',
  intro: 'Terima kasih telah memilih PoliLand Kairagi. Silakan lakukan pembayaran sesuai nominal tagihan dan metode pembayaran yang telah disepakati. Pastikan transfer dilakukan hanya ke rekening resmi PoliLand Kairagi yang tertera pada halaman ini. Setelah pembayaran berhasil, unggah bukti transfer untuk proses verifikasi oleh Admin.',
  steps: [
    { key: 'step-1', text: 'Periksa detail tagihan, nama pembeli, nomor kaveling, dan nominal pembayaran.' },
    { key: 'step-2', text: 'Pilih salah satu rekening resmi PoliLand Kairagi yang berstatus aktif.' },
    { key: 'step-3', text: 'Lakukan transfer sesuai nominal yang tertera pada tagihan.' },
    { key: 'step-4', text: 'Cantumkan nomor kaveling atau nomor transaksi pada berita transfer jika tersedia.' },
    { key: 'step-5', text: 'Simpan bukti transfer yang menampilkan nominal, tanggal, dan status berhasil.' },
    { key: 'step-6', text: 'Unggah bukti pembayaran melalui formulir pada akun pembeli.' },
    { key: 'step-7', text: 'Tunggu proses pemeriksaan dan verifikasi pembayaran oleh Admin.' },
  ],
  important_notes_text: [
    'Pastikan pembayaran hanya dikirim ke rekening resmi PoliLand Kairagi.',
    'Jangan melakukan transfer ke rekening pribadi pemasar atau pihak lain.',
    'Pembayaran dinyatakan terkonfirmasi setelah diverifikasi oleh Admin.',
  ].join('\n'),
  is_active: true,
})
const instructionDraft = ref<PaymentInstructionDraft>(defaultInstructionDraft())
const instructionLoading = ref(false)
const instructionSaving = ref(false)
const instructionError = ref('')
const instructionExists = ref(false)

const activeInstructionTab = ref<'banks' | 'instruction'>('banks')

type PaymentPlanDraft = { plan_name: string; months: number; margin_percent: number }
const emptyPaymentPlanDraft = (): PaymentPlanDraft => ({ plan_name: '', months: 6, margin_percent: 0 })
const paymentPlans = ref<PaymentPlanRecord[]>([])
const planLoading = ref(false)
const planSaving = ref(false)
const planDeleting = ref(false)
const planError = ref('')
const planFormError = ref('')
const planDeleteError = ref('')
const planModalOpen = ref(false)
const planDeleteModalOpen = ref(false)
const editingPlanId = ref<number | null>(null)
const planToDelete = ref<PaymentPlanRecord | null>(null)
const planDraft = ref<PaymentPlanDraft>(emptyPaymentPlanDraft())
const canSavePlan = computed(() =>
  planDraft.value.plan_name.trim().length > 0 &&
  Number.isInteger(Number(planDraft.value.months)) &&
  Number(planDraft.value.months) > 0 &&
  Number(planDraft.value.months) <= 1200 &&
  Number.isFinite(Number(planDraft.value.margin_percent)) &&
  Number(planDraft.value.margin_percent) >= 0 &&
  Number(planDraft.value.margin_percent) <= 999.99
)

type BankDraft = {
  bank_name: string
  account_number: string
  account_holder: string
  description: string
  is_active: boolean
  is_primary: boolean
}
const emptyBankDraft = (): BankDraft => ({
  bank_name: '',
  account_number: '',
  account_holder: '',
  description: '',
  is_active: true,
  is_primary: false,
})
const bankAccounts = ref<BankAccountRecord[]>([])
const bankLoading = ref(false)
const bankSaving = ref(false)
const bankError = ref('')
const bankFormError = ref('')
const bankModalOpen = ref(false)
const editingBankId = ref<string | null>(null)
const bankDraft = ref<BankDraft>(emptyBankDraft())
const canSaveBank = computed(() =>
  bankDraft.value.bank_name.trim().length > 0 &&
  bankDraft.value.account_number.replace(/\s/g, '').length >= 5 &&
  bankDraft.value.account_holder.trim().length > 0
)
const canSaveInstruction = computed(() =>
  instructionDraft.value.title.trim().length > 0 &&
  instructionDraft.value.intro.trim().length > 0 &&
  instructionDraft.value.steps.length > 0 &&
  instructionDraft.value.steps.every((step) => step.text.trim().length > 0)
)
const filters: Array<{ value: FinanceStatus; label: string }> = [{ value: 'pending', label: 'Menunggu' }, { value: 'verified', label: 'Terverifikasi' }, { value: 'overdue', label: 'Ditolak / Terlambat' }]
const transactions = ref<FinanceTransaction[]>([])
const activeFilter = ref<FinanceStatus>('pending')
const query = ref('')
const loading = ref(true)
const refreshing = ref(false)
const errorMessage = ref('')
const toast = useToast()
const routeQuery = useOwnRouteQuery()
const router = useRouter()
const targetPaymentId = ref('')
const targetSpkRequestId = ref('')
const activeView = ref<'verification' | 'instructions' | 'reports' | 'ledger' | 'cancellations' | 'plans'>('verification')
const ledgerEntries = ref<FinancialLedgerEntry[]>([])
const ledgerLoading = ref(false)
const ledgerError = ref('')
const reportLedgerEntries = ref<FinancialLedgerEntry[]>([])
const reportLedgerLoading = ref(false)
const reportLedgerError = ref('')
let reportLedgerRequestId = 0
const ledgerInflow = computed(() => ledgerEntries.value.filter(item => item.flow_direction === 'inflow').reduce((sum, item) => sum + item.amount, 0))
const ledgerOutflow = computed(() => ledgerEntries.value.filter(item => item.flow_direction === 'outflow').reduce((sum, item) => sum + item.amount, 0))
const cancellationRequests = ref<PurchaseCancellationRequest[]>([])
const cancellationLoading = ref(false)
const cancellationError = ref('')
const cancellationDecisionOpen = ref(false)
const cancellationDecisionSaving = ref(false)
const cancellationDecisionError = ref('')
const cancellationDecisionNote = ref('')
const cancellationDecision = ref<'Approved' | 'Rejected'>('Approved')
const cancellationDecisionTarget = ref<PurchaseCancellationRequest | null>(null)
const pendingCancellationCount = computed(() => cancellationRequests.value.length)
type ReportTab = 'summary' | 'lots' | 'buyers'
type ReportPayment = {
  id: string
  reference: string
  customerId: string
  customerName: string
  customerPhone: string
  lotId: string
  lotCode: string
  transactionId: string
  date: string
  amount: number
  method: string
  category: string
  categoryLabel: string
  status: string
  statusLabel: string
  statusTone: 'confirmed' | 'pending' | 'rejected' | 'reupload'
  refundStatus: 'Pending Refund' | 'Refunded' | null
  note: string
  proofPath: string | null
  spkRequestId: string
}
type ReportLot = {
  key: string
  transactionId: string
  lotId: string
  lotCode: string
  blockName: string
  area: number | null
  customerId: string
  customerName: string
  customerPhone: string
  paymentType: string
  paymentTypeLabel: string
  finalPrice: number
  bookingFee: number
  principalAmount: number
  downPayment: number
  marginAmount: number
  installmentTotal: number
  bookingFeePaid: number
  paid: number
  pendingAmount: number
  remaining: number
  progress: number
  paidPaymentCount: number
  statusLabel: string
  statusTone: 'paid' | 'ongoing' | 'cancelled'
  isPastDue: boolean
  months: number | null
  monthlyPayment: number
  installmentStartDate: string
  marketingName: string
  payments: ReportPayment[]
}
type ReportBuyer = {
  id: string
  name: string
  phone: string
  paid: number
  remaining: number
  lotCount: number
  lots: ReportLot[]
}
const activeReportTab = ref<ReportTab>('summary')
const reportGranularity = ref<ReportGranularity>('month')
const reportAnchor = ref(currentMakassarDay())
const granularityOptions: Array<{ value: ReportGranularity; label: string }> = [
  { value: 'week', label: 'Minggu' },
  { value: 'month', label: 'Bulan' },
  { value: 'year', label: 'Tahun' },
]
const pdfExporting = ref(false)
const pdfError = ref('')
const reportQuery = ref('')
const rawCustomers = ref<FinanceCustomerRecord[]>([])
const directPaymentRecords = ref<FinanceAdminPaymentRecord[]>([])
const selectedReportLot = ref<ReportLot | null>(null)
type PaymentPage = 'none' | 'proof' | 'add'
const paymentPage = ref<PaymentPage>('none')
const selectedProofPayment = ref<PaymentDetail | null>(null)
const proofSignedUrl = ref('')
const proofFilePath = ref('')
const proofLoading = ref(false)
const proofError = ref('')
const proofZoomOpen = ref(false)
const proofViewerUrl = ref('')
const proofViewerName = ref('')
const proofViewerSubtitle = ref('')

function openProofViewer(kind: 'proof' | 'refund') {
  const isRefund = kind === 'refund'
  const path = isRefund ? refundProofPath.value : proofFilePath.value
  proofViewerUrl.value = isRefund ? refundProofSignedUrl.value : proofSignedUrl.value
  proofViewerName.value = path.split('/').pop() || (isRefund ? 'Bukti pengembalian' : 'Bukti transfer')
  proofViewerSubtitle.value = isRefund ? 'Bukti pengembalian' : 'Bukti transfer'
  proofZoomOpen.value = true
}
const installmentSchedules = ref<InstallmentScheduleRecord[]>([])
const selectedMarketingName = ref('')
const schedulesLoading = ref(false)
const schedulesError = ref('')
const selectedScheduleIds = ref<number[]>([])
const manualPaymentAmount = ref<number | null>(null)
const newPaymentMethod = ref('')
function getLocalDateInput() {
  const now = new Date()
  const offset = now.getTimezoneOffset()
  return new Date(now.getTime() - offset * 60_000).toISOString().slice(0, 10)
}
const todayDate = getLocalDateInput()
const newPaymentDate = ref(todayDate)
const newPaymentReference = ref('')
const newPaymentNote = ref('')
const paymentProofFile = ref<File | null>(null)
const paymentProofPreview = ref('')
const paymentSaving = ref(false)
const paymentCreateError = ref('')
const reviewDialogOpen = ref(false)
const reviewSaving = ref(false)
const reviewReason = ref('')
const reviewTargetStatus = ref<'Confirmed' | 'Rejected' | 'Needs Reupload'>('Confirmed')
const refundFile = ref<File | null>(null)
const refundMethod = ref('')
const refundNote = ref('')
const refundBankReference = ref('')
const refundTransferAt = ref(currentMakassarDateTimeLocal())
const refundSubmitting = ref(false)
const refundError = ref('')
const refundStatus = ref<'Pending Refund' | 'Refunded' | null>(null)
const refundProofPath = ref('')
const refundProofSignedUrl = ref('')
const refundProofError = ref('')
const refundAmount = ref(0)
const selectableSchedules = computed(() => selectableSequence(installmentSchedules.value))
const selectedSchedules = computed(() => selectableSchedules.value.filter((item) => selectedScheduleIds.value.includes(item.id)))
const selectedPaymentBank = computed(() => bankAccounts.value.find((bank) => bank.is_active && `Transfer ${bank.bank_name}` === newPaymentMethod.value) ?? null)
const installmentProgress = computed(() => summarizeInstallmentProgress(installmentSchedules.value))
const installmentProgressLine = computed(() => formatProgressLine(installmentProgress.value))
const selectedSchedulesLabel = computed(() => formatInstallmentRange(
  selectedSchedules.value.map((item) => item.installment_number),
  installmentSchedules.value.length,
))
const proofInstallmentLabel = computed(() => {
  const payment = selectedProofPayment.value
  if (!payment) return ''
  return formatInstallmentRange(
    payment.allocations.map((item) => item.schedule?.installment_number),
    payment.transaction?.months ?? undefined,
  )
})
/** Cicilan hanya bisa dicentang bila berada tepat setelah pilihan terakhir. */
function isScheduleSelectable(id: number) {
  const sequence = selectableSchedules.value
  const index = sequence.findIndex((item) => item.id === id)
  if (index < 0) return false
  return index <= selectedScheduleIds.value.length
}
function toggleSchedule(id: number) {
  if (!isScheduleSelectable(id)) return
  selectedScheduleIds.value = nextSelection(selectableSchedules.value, selectedScheduleIds.value, id)
}
const newPaymentTotal = computed(() => selectedReportLot.value?.paymentType === 'Installment'
  ? selectedSchedules.value.reduce((sum, item) => sum + Number(item.amount), 0)
  : Math.max(0, Number(manualPaymentAmount.value || 0)))
const reportTabs = [
  { value: 'summary' as const, label: 'Ringkasan', icon: walletOutline },
  { value: 'lots' as const, label: 'Per Kavling', icon: businessOutline },
  { value: 'buyers' as const, label: 'Per Pembeli', icon: peopleOutline },
]

type FinanceArea = 'action' | 'reports' | 'settings'
const activeArea = computed<FinanceArea>(() => {
  if (activeView.value === 'verification' || activeView.value === 'cancellations') return 'action'
  if (activeView.value === 'reports' || activeView.value === 'ledger') return 'reports'
  return 'settings'
})
const attentionTotal = computed(() => statusCounts.value.pending + pendingCancellationCount.value)
const areaTabs = computed(() => [
  { value: 'action' as const, label: 'Perlu Tindakan', icon: documentTextOutline, badge: attentionTotal.value },
  { value: 'reports' as const, label: 'Laporan', icon: pieChartOutline, badge: 0 },
  { value: 'settings' as const, label: 'Pengaturan', icon: businessOutline, badge: 0 },
])
const activeAreaLabel = computed(() => areaTabs.value.find((area) => area.value === activeArea.value)?.label ?? '')
const attentionSummary = computed(() => {
  const parts: string[] = []
  if (statusCounts.value.pending) parts.push(`${statusCounts.value.pending} pembayaran menunggu verifikasi`)
  if (pendingCancellationCount.value) parts.push(`${pendingCancellationCount.value} pembatalan menunggu keputusan`)
  return parts.length ? parts.join(', ') : 'Tidak ada yang menunggu keputusan Anda.'
})
const subTabs = computed(() => {
  if (activeArea.value === 'action') {
    return [
      { key: 'verification', label: 'Pembayaran', active: activeView.value === 'verification', run: () => { activeView.value = 'verification' } },
      { key: 'cancellations', label: 'Pembatalan', active: activeView.value === 'cancellations', run: openCancellationReview },
    ]
  }
  if (activeArea.value === 'reports') {
    return [
      ...reportTabs.map((tab) => ({
        key: tab.value,
        label: tab.label,
        active: activeView.value === 'reports' && activeReportTab.value === tab.value,
        run: () => { selectedReportBuyer.value = null; selectedReportLot.value = null; activeReportTab.value = tab.value; activeView.value = 'reports' },
      })),
      { key: 'ledger', label: 'Buku Kas', active: activeView.value === 'ledger', run: () => { selectedReportBuyer.value = null; openFinancialLedger() } },
    ]
  }
  return [
    { key: 'banks', label: 'Rekening Bank', active: activeView.value === 'instructions' && activeInstructionTab.value === 'banks', run: () => { activeInstructionTab.value = 'banks'; activeView.value = 'instructions' } },
    { key: 'instruction', label: 'Petunjuk Pembayaran', active: activeView.value === 'instructions' && activeInstructionTab.value === 'instruction', run: () => { activeInstructionTab.value = 'instruction'; activeView.value = 'instructions' } },
    { key: 'plans', label: 'Skema Cicilan', active: activeView.value === 'plans', run: () => { activeView.value = 'plans' } },
  ]
})
function openArea(area: FinanceArea) {
  if (area === activeArea.value) return
  selectedReportBuyer.value = null
  if (area === 'action') activeView.value = 'verification'
  else if (area === 'reports') activeView.value = 'reports'
  else { activeInstructionTab.value = 'banks'; activeView.value = 'instructions' }
}

function normalizeReportPayment(payment: FinancePaymentRecord, customer: FinanceCustomerRecord, lot: FinanceTransactionRecord['lots'], transaction: FinanceTransactionRecord | undefined): ReportPayment {
  const status = String(payment.status || 'Pending')
  const statusTone = status === 'Confirmed' ? 'confirmed' : status === 'Rejected' ? 'rejected' : status === 'Needs Reupload' ? 'reupload' : 'pending'
  const category = String(payment.payment_category || 'Unclassified')
  const categoryLabels: Record<string, string> = {
    Booking: 'Tanda Jadi',
    'Down Payment': 'Uang Muka',
    Installment: 'Cicilan',
    'Cash Purchase': 'Pembelian Tunai',
    Other: 'Lainnya',
    Unclassified: 'Belum Dikategorikan',
  }
  const date = payment.payment_date || payment.created_at || transaction?.booking_date || customer.created_at || new Date().toISOString()
  return {
    id: String(payment.id),
    reference: `TRX-${String(payment.id).padStart(6, '0')}`,
    customerId: String(customer.id),
    customerName: customer.full_name || 'Pembeli',
    customerPhone: customer.whatsapp_phone || customer.phone || '',
    lotId: String(payment.lot_id ?? transaction?.lot_id ?? lot?.id ?? ''),
    lotCode: lot?.lot_number || `Kavling #${payment.lot_id ?? transaction?.lot_id ?? '-'}`,
    transactionId: String(payment.transaction_id ?? transaction?.id ?? ''),
    date,
    amount: Math.max(0, Number(payment.amount || 0)),
    method: payment.payment_method || 'Metode belum tercatat',
    category,
    categoryLabel: payment.installment_numbers?.length ? paymentRecordLabel(payment) : (categoryLabels[category] || category),
    status,
    statusLabel: status === 'Confirmed' ? 'Terverifikasi' : status === 'Rejected' ? 'Ditolak' : status === 'Needs Reupload' ? 'Perlu Unggah Ulang' : 'Menunggu',
    statusTone,
    refundStatus: null,
    note: payment.note || '',
    proofPath: payment.proof_path || null,
    spkRequestId: String(payment.spk_request_id ?? ''),
  }
}

const allReportPayments = computed<ReportPayment[]>(() => {
  return directPaymentRecords.value.map(({ payment, customer, lot }) => {
    const fallbackCustomer = rawCustomers.value.find((item) => String(item.id) === String(payment.customer_id))
    const reportCustomer = (customer || fallbackCustomer || {
      id: payment.customer_id ?? 0,
      full_name: 'Pelanggan tidak tersedia',
      phone: null,
      whatsapp_phone: null,
      created_at: payment.created_at,
      payments: [],
      lot_transactions: [],
    }) as FinanceCustomerRecord
    const transaction = payment.transaction_id
      ? (reportCustomer.lot_transactions || []).find((item) => String(item.id) === String(payment.transaction_id))
      : undefined
    const normalized = normalizeReportPayment(payment, reportCustomer, lot || transaction?.lots || null, transaction)
    const verificationRow = transactions.value.find((item) => item.id === normalized.id)
    return { ...normalized, refundStatus: verificationRow?.refundStatus ?? null }
  }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
})

const reportLots = computed<ReportLot[]>(() => {
  return rawCustomers.value.flatMap((customer) => {
    const relations = Array.isArray(customer.lot_transactions) ? customer.lot_transactions : []
    return relations
      .filter((transaction) => transaction.status !== 'Cancelled')
      .map((transaction) => {
        const lot = transaction.lots || (customer.lots || []).find((item) => String(item.id) === String(transaction.lot_id))
        const lotPayments = allReportPayments.value.filter((payment) =>
          payment.status === 'Confirmed' &&
          ((payment.transactionId && payment.transactionId === String(transaction.id)) ||
            (!payment.transactionId && !payment.spkRequestId &&
              payment.lotId === String(transaction.lot_id) && payment.customerId === String(customer.id)))
        )
        const balance = calculateFinanceBalance(transaction, lotPayments)
        const finalPrice = balance.obligation
        const remaining = balance.remaining
        const progress = balance.progress
        const statusLabel = remaining <= 0 && finalPrice > 0 ? 'Lunas' : transaction.status === 'Sold' ? 'Terjual · Belum Lunas' : 'Cicilan Berjalan'
        const statusTone = remaining <= 0 && finalPrice > 0 ? 'paid' : 'ongoing'
        const lotId = String(transaction.lot_id)
        const transactionPayments = allReportPayments.value
          .filter((payment) => payment.transactionId === String(transaction.id) ||
            (!payment.transactionId && !payment.spkRequestId &&
              payment.lotId === lotId && payment.customerId === String(customer.id)))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        return {
          key: `${customer.id}-${transaction.id}`,
          transactionId: String(transaction.id),
          lotId,
          lotCode: lot?.lot_number || `Kavling #${transaction.lot_id}`,
          blockName: lot?.blocks?.name ? `${lot.blocks.name}` : '',
          area: lot?.area != null ? Number(lot.area) : null,
          customerId: String(customer.id),
          customerName: customer.full_name || 'Pembeli',
          customerPhone: customer.whatsapp_phone || customer.phone || '',
          paymentType: transaction.payment_type || lot?.payment_type || 'Cash',
          paymentTypeLabel: (transaction.payment_type || lot?.payment_type) === 'Installment' ? 'Cicilan Berjalan' : 'Pembelian Tunai',
          finalPrice,
          paid: balance.principalPaid,
          bookingFee: Number(transaction.booking_fee ?? 0),
          principalAmount: Number(transaction.principal_amount ?? 0),
          downPayment: Number(transaction.down_payment ?? 0),
          marginAmount: Number(transaction.margin_amount ?? 0),
          installmentTotal: Number(transaction.installment_total ?? 0),
          bookingFeePaid: balance.bookingFeePaid,
          pendingAmount: transactionPayments.reduce((sum, payment) => sum + (payment.status === 'Pending' || payment.status === 'Needs Reupload' ? payment.amount : 0), 0),
          remaining,
          progress,
          paidPaymentCount: lotPayments.length,
          statusLabel,
          statusTone,
          isPastDue: false,
          months: transaction.months ? Number(transaction.months) : null,
          monthlyPayment: Number(transaction.monthly_payment || 0),
          installmentStartDate: transaction.installment_start_date || '',
          marketingName: customer.marketing?.full_name || customer.marketing_profile?.full_name || '',
          payments: transactionPayments,
        } satisfies ReportLot
      })
  })
})

const reportBuyers = computed<ReportBuyer[]>(() => {
  return rawCustomers.value.map((customer) => {
    const lots = reportLots.value.filter((lot) => lot.customerId === String(customer.id))
    return {
      id: String(customer.id),
      name: customer.full_name || 'Pembeli',
      phone: customer.whatsapp_phone || customer.phone || '',
      paid: lots.reduce((sum, lot) => sum + lot.paid, 0),
      remaining: lots.reduce((sum, lot) => sum + lot.remaining, 0),
      lotCount: lots.length,
      lots,
    }
  }).filter((buyer) => buyer.lotCount > 0)
    .sort((a, b) => b.remaining - a.remaining)
})

const reportRange = computed(() => reportPeriod(reportGranularity.value, reportAnchor.value))
const previousRange = computed(() => reportPeriod(reportGranularity.value, shiftReportAnchor(reportGranularity.value, reportAnchor.value, -1)))
const isCurrentPeriod = computed(() => reportRange.value.end >= currentMakassarDay())
const selectedMonthCashflowEntries = computed(() => postedCashflowForRange(reportLedgerEntries.value, reportRange.value.start, reportRange.value.end))
const monthlyCashflowTotals = computed(() => summarizeCashflow(selectedMonthCashflowEntries.value))
const monthlyIncome = computed(() => monthlyCashflowTotals.value.grossIncome)
const monthlyTotalExpenses = computed(() => monthlyCashflowTotals.value.totalExpenses)
const monthlyRefundExpenses = computed(() => monthlyCashflowTotals.value.refundExpenses)
const monthlyNetCashFlow = computed(() => monthlyCashflowTotals.value.netCashFlow)
const monthlyBookingPayments = computed(() => selectedMonthCashflowEntries.value.filter((entry) => entry.flow_direction === 'inflow' && entry.category === 'Booking'))
const monthlyOtherPayments = computed(() => selectedMonthCashflowEntries.value.filter((entry) => entry.flow_direction === 'inflow' && entry.category !== 'Booking'))
const monthlyBookingIncome = computed(() => monthlyBookingPayments.value.reduce((sum, entry) => sum + entry.amount, 0))
const monthlyOtherIncome = computed(() => monthlyOtherPayments.value.reduce((sum, entry) => sum + entry.amount, 0))
const monthlyBookingCount = computed(() => monthlyBookingPayments.value.length)
const monthlyOtherCount = computed(() => monthlyOtherPayments.value.length)
const selectedMonthLabel = computed(() => reportRange.value.label)
const previousPeriodNounLabel = computed(() => previousPeriodNoun(reportGranularity.value))
const previousMonthIncome = computed(() => summarizeCashflow(postedCashflowForRange(reportLedgerEntries.value, previousRange.value.start, previousRange.value.end)).grossIncome)
const monthComparison = computed<number | null>(() => {
  if (previousMonthIncome.value === 0) return null
  return ((monthlyIncome.value - previousMonthIncome.value) / previousMonthIncome.value) * 100
})
const monthlyReport = computed(() => cashflowTrendForPeriod(reportLedgerEntries.value, reportRange.value, reportAnchor.value))
const trendTitle = computed(() => reportGranularity.value === 'week' ? 'Arus kas harian' : 'Tren arus kas')
const trendSubtitle = computed(() => reportGranularity.value === 'week'
  ? 'Pemasukan bruto dan pengeluaran per hari pada minggu ini'
  : reportGranularity.value === 'year'
    ? 'Pemasukan bruto dan pengeluaran per bulan pada tahun ini'
    : 'Pemasukan bruto dan pengeluaran 6 bulan terakhir')
const monthlyMax = computed(() => Math.max(...monthlyReport.value.flatMap((month) => [month.grossIncome, month.totalExpenses]), 1))
const peakMonth = computed(() => monthlyReport.value.reduce((peak, month) => month.grossIncome > peak.grossIncome ? month : peak, monthlyReport.value[0] || { key: '', label: '-', grossIncome: 0, totalExpenses: 0, refundExpenses: 0, netCashFlow: 0 }))
const peakMonthKey = computed(() => peakMonth.value.grossIncome > 0 ? peakMonth.value.key : '')
const peakMonthLabel = computed(() => peakMonth.value.grossIncome > 0 ? peakMonth.value.label : '-')
const monthlyChartDescription = computed(() => monthlyReport.value.map((month) => `${month.label}: pemasukan bruto ${formatCurrency(month.grossIncome)}, pengeluaran ${formatCurrency(month.totalExpenses)}, pengembalian dana ${formatCurrency(month.refundExpenses)}, arus kas bersih ${formatCurrency(month.netCashFlow)}`).join('. '))
const recentReportPayments = computed(() => selectedMonthCashflowEntries.value.map((entry) => ({
  id: String(entry.id),
  customerName: entry.source_table === 'booking_fee_refunds' ? 'Refund Booking Fee' : ledgerEntryTitle(entry),
  lotCode: `${ledgerSourceLabel(entry)} · #${entry.source_id}`,
  categoryLabel: entry.category,
  method: entry.bank_reference || 'Referensi bank belum dicantumkan',
  date: entry.occurred_on,
  amount: entry.amount,
  statusTone: entry.flow_direction === 'inflow' ? 'confirmed' : 'rejected',
  statusLabel: entry.flow_direction === 'inflow' ? 'Pemasukan bruto' : entry.source_table === 'booking_fee_refunds' ? 'Pengeluaran refund' : 'Pengeluaran',
  flowDirection: entry.flow_direction,
})))
const filteredReportLots = computed(() => {
  const term = reportQuery.value.trim().toLowerCase()
  return reportLots.value.filter((lot) => !term || `${lot.lotCode} ${lot.blockName} ${lot.customerName}`.toLowerCase().includes(term))
})
const filteredReportBuyers = computed(() => {
  const term = reportQuery.value.trim().toLowerCase()
  return reportBuyers.value.filter((buyer) => !term || `${buyer.name} ${buyer.phone} ${buyer.lots.map((lot) => lot.lotCode).join(' ')}`.toLowerCase().includes(term))
})
watch(activeReportTab, () => { reportQuery.value = '' })

const selectedReportBuyer = ref<ReportBuyer | null>(null)
const selectedBuyer = computed(() => selectedReportBuyer.value
  ? reportBuyers.value.find((buyer) => buyer.id === selectedReportBuyer.value?.id) ?? null
  : null)
const buyerTotals = computed(() => {
  const lots = selectedBuyer.value?.lots ?? []
  return {
    obligation: lots.reduce((sum, lot) => sum + lot.finalPrice, 0),
    paid: lots.reduce((sum, lot) => sum + lot.paid, 0),
    pending: lots.reduce((sum, lot) => sum + lot.pendingAmount, 0),
    remaining: lots.reduce((sum, lot) => sum + lot.remaining, 0),
  }
})
const buyerPayments = computed(() => (selectedBuyer.value?.lots ?? [])
  .flatMap((lot) => lot.payments)
  .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()))
const selectedLotPayments = computed(() => selectedReportLot.value?.payments ?? [])

const lotsPager = usePagination(filteredReportLots, { pageSize: 8, resetOn: reportQuery })
const buyersPager = usePagination(filteredReportBuyers, { pageSize: 8, resetOn: reportQuery })
const recentPager = usePagination(recentReportPayments, { pageSize: 8, resetOn: [reportGranularity, reportAnchor] })
const ledgerPager = usePagination(ledgerEntries, { pageSize: 10 })
const cancellationPager = usePagination(cancellationRequests, { pageSize: 6 })
const buyerPaymentsPager = usePagination(buyerPayments, { pageSize: 6, resetOn: () => selectedBuyer.value?.id })
const lotPaymentsPager = usePagination(selectedLotPayments, { pageSize: 6, resetOn: () => selectedReportLot.value?.key })

function scrollFinanceTop() {
  const content = document.querySelector('.admin-finance-page ion-content') as (HTMLElement & { scrollToTop?: (ms?: number) => void }) | null
  content?.scrollToTop?.(200)
}
function openBuyer(buyer: ReportBuyer) {
  selectedReportLot.value = null
  selectedReportBuyer.value = buyer
  scrollFinanceTop()
}
function openBuyerProfile(buyerId: string) {
  void router.push(`/admin/pembeli/${buyerId}`)
}

// ----- Pembayaran manual -----
const paymentPickerOpen = ref(false)
const paymentPickerQuery = ref('')
const paymentSubmitAttempted = ref(false)
const availableToPay = computed(() => selectedReportLot.value
  ? Math.max(0, selectedReportLot.value.remaining - selectedReportLot.value.pendingAmount)
  : 0)
const pickableLots = computed(() => {
  const term = paymentPickerQuery.value.trim().toLowerCase()
  return reportLots.value.filter((lot) =>
    lot.statusTone !== 'cancelled' &&
    lot.remaining - lot.pendingAmount > 0 &&
    (!term || `${lot.lotCode} ${lot.blockName} ${lot.customerName}`.toLowerCase().includes(term)))
})
const pickerPager = usePagination(pickableLots, { pageSize: 6, resetOn: paymentPickerQuery })
type PaymentFieldKey = 'amount' | 'schedules' | 'method' | 'date' | 'proof'
const paymentErrors = computed(() => {
  const errors: Partial<Record<PaymentFieldKey, string>> = {}
  const lot = selectedReportLot.value
  if (!lot) return errors
  if (lot.paymentType === 'Installment') {
    const orderError = validateSelectionOrder(selectableSchedules.value, selectedScheduleIds.value)
    if (!selectedScheduleIds.value.length) errors.schedules = 'Pilih minimal satu cicilan yang dibayar.'
    else if (orderError) errors.schedules = orderError
    else if (newPaymentTotal.value > availableToPay.value) errors.schedules = `Total cicilan melebihi sisa tagihan yang dapat dibayar (${formatCurrency(availableToPay.value)}).`
  } else {
    const amount = manualPaymentAmount.value
    if (amount === null || amount === undefined || Number.isNaN(Number(amount))) errors.amount = 'Nominal pembayaran wajib diisi.'
    else if (Number(amount) <= 0) errors.amount = 'Nominal pembayaran harus lebih dari nol.'
    else if (Number(amount) > availableToPay.value) errors.amount = `Nominal melebihi sisa tagihan yang dapat dibayar (${formatCurrency(availableToPay.value)}).`
  }
  if (!newPaymentMethod.value.trim()) errors.method = 'Pilih metode pembayaran.'
  if (!newPaymentDate.value) errors.date = 'Tanggal pembayaran wajib diisi.'
  else if (newPaymentDate.value > todayDate) errors.date = 'Tanggal pembayaran tidak boleh melewati hari ini.'
  if (!paymentProofFile.value) errors.proof = 'Unggah bukti pembayaran berupa foto atau PDF.'
  return errors
})
function fieldError(key: PaymentFieldKey) {
  return paymentSubmitAttempted.value ? paymentErrors.value[key] : undefined
}
function openPaymentPicker() {
  paymentPickerQuery.value = ''
  pickerPager.reset()
  paymentPickerOpen.value = true
}
async function startManualPayment(lot: ReportLot) {
  paymentPickerOpen.value = false
  selectedReportBuyer.value = null
  activeView.value = 'reports'
  await openReportLot(lot)
  openAddPayment()
}
watch(activeView, (view: typeof activeView.value) => {
  if (view !== 'reports') { selectedReportLot.value = null; selectedReportBuyer.value = null }
  if (view !== 'reports') paymentPage.value = 'none'
  if (view === 'reports') void loadReportLedger()
})
watch([reportGranularity, reportAnchor], () => {
  if (activeView.value === 'reports') void loadReportLedger()
})

function setReportGranularity(value: ReportGranularity) {
  if (value === reportGranularity.value) return
  reportGranularity.value = value
  // Pastikan periode baru tidak melewati hari ini.
  const today = currentMakassarDay()
  if (reportAnchor.value > today) reportAnchor.value = today
}
function stepReportPeriod(delta: -1 | 1) {
  if (delta === 1 && isCurrentPeriod.value) return
  const next = shiftReportAnchor(reportGranularity.value, reportAnchor.value, delta)
  const today = currentMakassarDay()
  reportAnchor.value = next > today ? today : next
}
function resetReportPeriod() { reportAnchor.value = currentMakassarDay() }

async function loadReportLedger() {
  const requestId = ++reportLedgerRequestId
  reportLedgerLoading.value = true
  reportLedgerError.value = ''
  try {
    const range = reportLoadRange(reportRange.value, reportAnchor.value)
    const entries = await financialLedgerService.listBetween(range.startDate, range.endDate)
    if (requestId === reportLedgerRequestId) reportLedgerEntries.value = entries
  } catch (error: any) {
    if (requestId === reportLedgerRequestId) {
      reportLedgerError.value = error?.message || 'Data arus kas gagal dimuat. Periksa koneksi lalu coba lagi.'
    }
  } finally {
    if (requestId === reportLedgerRequestId) reportLedgerLoading.value = false
  }
}

function retryFinanceReport() {
  void Promise.all([loadTransactions(), loadReportLedger()])
}

async function loadFinancialLedger() {
  if (ledgerLoading.value) return
  ledgerLoading.value = true
  ledgerError.value = ''
  try {
    ledgerEntries.value = await financialLedgerService.listRecent()
  } catch (error: any) {
    ledgerError.value = error?.message || 'Buku kas tidak dapat dimuat. Periksa koneksi atau jalankan migrasi SQL.'
  } finally {
    ledgerLoading.value = false
  }
}

function openFinancialLedger() {
  activeView.value = 'ledger'
  void loadFinancialLedger()
}

async function loadCancellationRequests() {
  if (cancellationLoading.value) return
  cancellationLoading.value = true
  cancellationError.value = ''
  try {
    cancellationRequests.value = await purchaseCancellationService.listPending()
  } catch (error: any) {
    cancellationError.value = error?.message || 'Daftar pengajuan pembatalan tidak dapat dimuat.'
  } finally {
    cancellationLoading.value = false
  }
}

function openCancellationReview() {
  activeView.value = 'cancellations'
  void loadCancellationRequests()
}

function openCancellationDecision(request: PurchaseCancellationRequest, decision: 'Approved' | 'Rejected') {
  cancellationDecisionTarget.value = request
  cancellationDecision.value = decision
  cancellationDecisionNote.value = ''
  cancellationDecisionError.value = ''
  cancellationDecisionOpen.value = true
}

async function saveCancellationDecision() {
  const target = cancellationDecisionTarget.value
  const note = cancellationDecisionNote.value.trim()
  if (!target || note.length < 3 || cancellationDecisionSaving.value) return
  cancellationDecisionSaving.value = true
  cancellationDecisionError.value = ''
  try {
    const refundId = await purchaseCancellationService.review(target.id, cancellationDecision.value, note)
    cancellationDecisionOpen.value = false
    showMessage(cancellationDecision.value === 'Approved'
      ? `Pembatalan disetujui. ${refundId ? `Pengajuan pengembalian dana #${refundId} dibuat.` : 'Pengembalian dana tidak diperlukan.'}`
      : 'Pengajuan pembatalan ditolak.')
    await loadCancellationRequests()
  } catch (error: any) {
    cancellationDecisionError.value = error?.message || 'Keputusan pembatalan gagal disimpan.'
  } finally {
    cancellationDecisionSaving.value = false
  }
}

const statusCounts = computed(() => ({ pending: transactions.value.filter((item) => item.status === 'pending').length, verified: transactions.value.filter((item) => item.status === 'verified').length, overdue: transactions.value.filter((item) => item.status === 'overdue').length }))
function isTargetTransaction(item: FinanceTransaction) {
  return Boolean(
    (targetPaymentId.value && item.id === targetPaymentId.value) ||
    (targetSpkRequestId.value && item.spkRequestId === targetSpkRequestId.value),
  )
}
const filteredTransactions = computed(() => {
  const term = query.value.trim().toLowerCase()
  return transactions.value.filter((item) => {
    const isTarget = isTargetTransaction(item)
    const matchesStatus = item.status === activeFilter.value || isTarget
    return matchesStatus && (!term || `${item.customerName} ${item.lotCode} ${item.method} ${item.spkNumber} ${item.spkRequestId}`.toLowerCase().includes(term))
  })
})
const transactionPager = usePagination(filteredTransactions, { pageSize: 10, resetOn: [query, activeFilter] })

function formatCurrency(value: number) {
  return formatRupiah(value)
}
/** Judul pembayaran: rentang cicilan bila ada, jika tidak nama kategorinya. */
function paymentRecordLabel(payment: Pick<FinancePaymentRecord, 'payment_category' | 'installment_numbers' | 'installment_total'>) {
  return payment.installment_numbers?.length
    ? formatInstallmentRange(payment.installment_numbers, payment.installment_total)
    : paymentCategoryLabel(payment.payment_category || 'Unclassified')
}
function paymentCategoryLabel(category: string) {
  const labels: Record<string, string> = {
    Booking: 'SPK / Tanda Jadi',
    'Booking Fee Refund': 'Pengembalian tanda jadi',
    'Down Payment': 'Uang Muka',
    Installment: 'Cicilan',
    'Cash Purchase': 'Pembelian Tunai',
    Other: 'Lainnya',
    Unclassified: 'Belum Diklasifikasikan',
  }
  return labels[category] ?? category
}
function ledgerEntryTitle(entry: Pick<FinancialLedgerEntry, 'category' | 'installment_numbers' | 'installment_total'>) {
  return entry.installment_numbers?.length
    ? formatInstallmentRange(entry.installment_numbers, entry.installment_total)
    : paymentCategoryLabel(entry.category)
}
function ledgerSourceLabel(entry: Pick<FinancialLedgerEntry, 'source_table' | 'source_id'>) {
  if (entry.source_table === 'payments') return `Pembayaran #${entry.source_id}`
  if (entry.source_table === 'booking_fee_refunds') return `Refund Booking Fee #${entry.source_id}`
  if (entry.source_table === 'purchase_refunds') return `Refund pembelian #${entry.source_id}`
  if (entry.source_table === 'financial_reversal') return `Reversal #${entry.source_id}`
  return `${entry.source_table} #${entry.source_id}`
}
function formatDate(value: string) { return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Makassar' }).format(new Date(value)) }
function formatMakassarDateTime(value: string) {
  const date = new Date(value)
  return Number.isFinite(date.getTime())
    ? new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Makassar' }).format(date)
    : value
}
function formatCompactCurrency(value: number) {
  if (value >= 1_000_000_000) return `Rp${(value / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`
  if (value >= 1_000_000) return `Rp${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
  if (value >= 1_000) return `Rp${(value / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`
  return formatCurrency(value)
}
function formatShortDate(value: string) {
  const date = /^\d{4}-\d{2}-\d{2}$/.test(value) ? new Date(`${value}T00:00:00+08:00`) : new Date(value)
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Makassar' }).format(date)
}
function buildPdfInput(): PdfReportInput {
  const generatedAt = formatMakassarDateTime(new Date().toISOString())
  if (activeReportTab.value === 'summary') {
    return buildCashflowPdfInput(selectedMonthCashflowEntries.value, monthlyCashflowTotals.value, reportRange.value, generatedAt)
  }
  if (activeReportTab.value === 'lots') {
    const lots = filteredReportLots.value
    return {
      title: 'Laporan Keuangan - Per Kaveling',
      subtitle: `Posisi pembayaran terkini (bukan per periode)  |  Dicetak: ${generatedAt}`,
      summary: [
        ['Jumlah kaveling', String(lots.length)],
        ['Total harga transaksi', formatPdfRupiah(lots.reduce((sum, lot) => sum + lot.finalPrice, 0))],
        ['Total dibayar', formatPdfRupiah(lots.reduce((sum, lot) => sum + lot.paid, 0))],
        ['Total sisa tagihan', formatPdfRupiah(lots.reduce((sum, lot) => sum + lot.remaining, 0))],
      ],
      sections: [{
        title: `Daftar kaveling (${lots.length})`,
        head: ['Kaveling', 'Blok', 'Pembeli', 'Harga', 'Dibayar', 'Sisa', 'Status'],
        body: lots.map((lot) => [lot.lotCode, lot.blockName || '-', lot.customerName, formatPdfRupiah(lot.finalPrice), formatPdfRupiah(lot.paid), formatPdfRupiah(lot.remaining), lot.statusLabel]),
        rightAlign: [3, 4, 5],
      }],
    }
  }
  const buyers = filteredReportBuyers.value
  return {
    title: 'Laporan Keuangan - Per Pembeli',
    subtitle: `Posisi pembayaran terkini (bukan per periode)  |  Dicetak: ${generatedAt}`,
    summary: [
      ['Jumlah pembeli', String(buyers.length)],
      ['Total terbayar', formatPdfRupiah(buyers.reduce((sum, buyer) => sum + buyer.paid, 0))],
      ['Total sisa tagihan', formatPdfRupiah(buyers.reduce((sum, buyer) => sum + buyer.remaining, 0))],
    ],
    sections: [{
      title: `Daftar pembeli (${buyers.length})`,
      head: ['Pembeli', 'Telepon', 'Kaveling', 'Terbayar', 'Sisa'],
      body: buyers.map((buyer) => [buyer.name, buyer.phone || '-', buyer.lots.map((lot) => lot.lotCode).join(', ') || '-', formatPdfRupiah(buyer.paid), formatPdfRupiah(buyer.remaining)]),
      rightAlign: [3, 4],
    }],
  }
}
async function exportReport() {
  if (pdfExporting.value) return
  pdfExporting.value = true
  pdfError.value = ''
  try {
    const blob = await buildReportPdf(buildPdfInput())
    const suffix = activeReportTab.value === 'summary' ? `${reportGranularity.value}-${reportRange.value.start}_${reportRange.value.end}` : currentMakassarDay()
    await saveBlobAsFile(blob, `laporan-${activeReportTab.value}-poliland-${suffix}.pdf`)
  } catch (error: any) {
    if (!/cancel|dismiss/i.test(String(error?.message ?? ''))) pdfError.value = error?.message || 'PDF gagal dibuat. Coba lagi.'
  } finally {
    pdfExporting.value = false
  }
}


function paymentStatusLabel(status: string) {
  return status === 'Confirmed' ? 'Terverifikasi'
    : status === 'Rejected' ? 'Ditolak'
      : status === 'Needs Reupload' ? 'Perlu Unggah Ulang'
        : 'Menunggu Verifikasi'
}
function paymentReference(payment: PaymentDetail['payment']) {
  return payment.reference_number?.trim() || `TRX-${String(payment.id).padStart(6, '0')}`
}
function formatTime(value: string) {
  return new Intl.DateTimeFormat('id-ID', { hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date(value))
}
function formatMonthYear(value: string) {
  return new Intl.DateTimeFormat('id-ID', { month: 'short', year: 'numeric' }).format(new Date(`${value}T00:00:00`))
}
function isImageProof(path: string | null | undefined) {
  return Boolean(path && /\.(jpe?g|png|webp)$/i.test(path))
}
function whatsappUrl(phone: string) {
  const digits = phone.replace(/\\D/g, '').replace(/^0/, '62')
  return `https://wa.me/${digits}`
}
function formatFileSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
function closePaymentPage() {
  paymentPage.value = 'none'
  clearPaymentProof()
  proofZoomOpen.value = false
  reviewDialogOpen.value = false
  proofSignedUrl.value = ''
  proofFilePath.value = ''
  selectedProofPayment.value = null
  paymentCreateError.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
async function openPaymentProof(paymentId: number, focusRefund = false) {
  paymentPage.value = 'proof'
  proofLoading.value = true
  proofError.value = ''
  selectedProofPayment.value = null
  proofSignedUrl.value = ''
  proofFilePath.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
  await loadSelectedPaymentProof(paymentId)
  if (focusRefund) {
    await nextTick()
    document.querySelector('.proof-refund-section')?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    })
  }
}
function openRelatedSpk(transaction: FinanceTransaction) {
  if (!transaction.spkRequestId) return
  void router.push({ name: 'AdminSPK', query: { spkId: transaction.spkRequestId } })
}
const canApproveRelatedSpk = computed(() => {
  const detail = selectedProofPayment.value
  // Hanya Booking Fee SPK (tanpa transaction_id), sama dengan label di daftar transaksi.
  if (!detail || detail.payment.status !== 'Confirmed' || !detail.payment.spk_request_id || detail.payment.transaction_id) return false
  const status = String(detail.spk?.status ?? '')
  return status === 'Submitted' || status === 'Under Review'
})
function approveRelatedSpk() {
  const spkId = selectedProofPayment.value?.payment.spk_request_id
  if (!spkId) return
  void router.push({ name: 'AdminSPK', query: { spkId: String(spkId), approve: '1' } })
}
function handleFinanceTransactionAction(transaction: FinanceTransaction) {
  if (
    transaction.refundStatus
    && transaction.spkRequestId
  ) {
    void router.push({
      name: 'AdminSPK',
      query: {
        spkId: transaction.spkRequestId,
        refund: '1',
      },
    })
    return
  }

  void openPaymentProof(Number(transaction.id))
}
async function loadSelectedPaymentProof(paymentId?: number) {
  const id = paymentId ?? selectedProofPayment.value?.payment.id
  if (!id) return
  proofLoading.value = true
  proofError.value = ''
  try {
    const detail = await paymentService.getPaymentDetail(id)
    selectedProofPayment.value = detail
    refundStatus.value = null
    refundProofPath.value = ''
    refundProofSignedUrl.value = ''
    refundProofError.value = ''
    refundAmount.value = Number(detail.payment.amount || 0)
    refundFile.value = null
    refundMethod.value = ''
    refundNote.value = ''
    refundBankReference.value = ''
    refundTransferAt.value = currentMakassarDateTimeLocal()
    refundError.value = ''

    if (
      detail.payment.payment_category === 'Booking'
      && detail.payment.spk_request_id
    ) {
      const { data: refund, error: refundQueryError } = await supabase
        .from('booking_fee_refunds')
        .select('status,proof_path,refund_method,refund_note,bank_reference,refunded_at,amount')
        .eq('payment_id', detail.payment.id)
        .maybeSingle()

      if (refundQueryError) throw refundQueryError
      if (refund) {
        refundStatus.value = refund.status
        refundAmount.value = Number(refund.amount || detail.payment.amount || 0)
        refundProofPath.value = refund.proof_path ?? ''
        refundMethod.value = refund.refund_method ?? ''
        refundNote.value = refund.refund_note ?? ''
        refundBankReference.value = refund.bank_reference ?? ''
        refundTransferAt.value = refund.refunded_at
          ? isoToMakassarDateTimeLocal(refund.refunded_at)
          : currentMakassarDateTimeLocal()

        if (refund.proof_path) {
          const { data: refundUrl, error: refundUrlError } =
            await supabase.storage
              .from('payment-proofs')
              .createSignedUrl(refund.proof_path, 300)

          if (refundUrlError) refundProofError.value = 'Bukti pengembalian dana tercatat, tetapi gagal dimuat. Periksa koneksi lalu coba lagi.'
          else refundProofSignedUrl.value = refundUrl?.signedUrl ?? ''
        }
      }
    }

    // Bukti dari form pembayaran Client disimpan langsung ke bucket
    // `payment-proofs`, termasuk pembayaran DP yang juga memiliki spk_request_id.
    // Jangan menentukan bucket dari keberadaan spk_request_id karena RPC
    // submit_client_payment mengisi kolom tersebut untuk mengaitkan pembayaran ke SPK.
    let proofPath = detail.payment.proof_path?.trim() || ''
    let proofBucket = proofPath ? 'payment-proofs' : ''

    // Fallback hanya untuk data SPK lama yang belum memiliki payments.proof_path.
    // Dokumen lama tersebut disimpan di bucket privat khusus dokumen SPK.
    if (!proofPath && detail.payment.spk_request_id) {
      const { data: proofDocument, error: documentError } = await supabase
        .from('spk_request_documents')
        .select('file_path')
        .eq('spk_request_id', detail.payment.spk_request_id)
        .eq('document_type', 'Payment Proof')
        .maybeSingle()

      if (documentError) throw documentError
      proofPath = proofDocument?.file_path?.trim() || ''
      if (proofPath) proofBucket = 'spk-client-private-documents'
    }

    proofFilePath.value = proofPath

    if (!proofPath) {
      proofSignedUrl.value = ''
      throw new Error('Path bukti pembayaran tidak ditemukan pada data pembayaran maupun dokumen SPK.')
    }

    // Buat signed URL dari bucket yang sesuai dengan lokasi upload file.
    // Jika data lama memakai bucket SPK, coba bucket legacy terlebih dahulu.
    try {
      proofSignedUrl.value = await paymentService.getProofUrl(
        proofPath,
        detail.payment.spk_request_id,
        proofBucket,
      )
    } catch (primaryError) {
      if (proofBucket !== 'payment-proofs' || !detail.payment.spk_request_id) {
        throw primaryError
      }

      // Kompatibilitas untuk data lama yang proof_path-nya mungkin tersimpan
      // di bucket dokumen SPK, bukan bucket pembayaran baru.
      try {
        proofSignedUrl.value = await paymentService.getProofUrl(
          proofPath,
          detail.payment.spk_request_id,
          'spk-client-private-documents',
        )
      } catch {
        throw primaryError
      }
    }

    if (!proofSignedUrl.value) {
      throw new Error(`Bukti pembayaran ditemukan (${proofBucket}), tetapi URL akses tidak berhasil dibuat. Periksa Storage policy Admin.`)
    }
  } catch (error) {
    proofError.value = error instanceof Error ? error.message : 'Gagal mengambil data bukti pembayaran.'
  } finally {
    proofLoading.value = false
  }
}
async function copyPaymentReference() {
  if (!selectedProofPayment.value) return
  try {
    await navigator.clipboard.writeText(paymentReference(selectedProofPayment.value.payment))
    showMessage('Nomor transaksi berhasil disalin.')
  } catch {
    showMessage('Tidak dapat menyalin nomor transaksi dari browser ini.', 'error')
  }
}
async function reviewPayment(status: 'Confirmed' | 'Rejected' | 'Needs Reupload') {
  if (!selectedProofPayment.value || reviewSaving.value) return
  if (status !== 'Confirmed') {
    openReviewDialog(status)
    return
  }
  reviewSaving.value = true
  reviewTargetStatus.value = status
  try {
    await paymentService.reviewPayment(selectedProofPayment.value.payment.id, status, null)
    showMessage('Pembayaran berhasil diverifikasi.')
    celebrate({ title: 'Pembayaran terverifikasi', message: 'Status transaksi sudah diperbarui.' })
    await loadSelectedPaymentProof()
    await loadTransactions()
    if (selectedReportLot.value) await loadSchedulesForSelectedLot()
  } catch (error) {
    showMessage(error instanceof Error ? error.message : 'Verifikasi pembayaran gagal.', 'error')
  } finally {
    reviewSaving.value = false
  }
}
function openReviewDialog(status: 'Rejected' | 'Needs Reupload') {
  reviewTargetStatus.value = status
  reviewReason.value = ''
  reviewDialogOpen.value = true
}
async function submitPaymentReview() {
  if (!selectedProofPayment.value || !reviewReason.value.trim() || reviewSaving.value) return
  reviewSaving.value = true
  try {
    await paymentService.reviewPayment(selectedProofPayment.value.payment.id, reviewTargetStatus.value, reviewReason.value.trim())
    reviewDialogOpen.value = false
    showMessage(reviewTargetStatus.value === 'Rejected' ? 'Pembayaran berhasil ditolak.' : 'Permintaan unggah ulang berhasil dikirim.')
    celebrate(reviewTargetStatus.value === 'Rejected'
      ? { title: 'Pembayaran ditolak', message: 'Alasan penolakan sudah dikirim ke klien.', tone: 'rejected' }
      : { title: 'Permintaan terkirim', message: 'Klien diminta mengunggah ulang bukti.' })
    await loadSelectedPaymentProof()
    await loadTransactions()
  } catch (error) {
    showMessage(error instanceof Error ? error.message : 'Tindakan review gagal.', 'error')
  } finally {
    reviewSaving.value = false
  }
}
function onRefundProofSelected(event: Event) {
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

async function submitRefundProof() {
  if (
    !selectedProofPayment.value
    || !refundFile.value
    || refundSubmitting.value
  ) return

  const payment = selectedProofPayment.value.payment
  if (
    payment.payment_category !== 'Booking'
    || !payment.spk_request_id
  ) {
    refundError.value = 'Pengembalian hanya tersedia untuk pembayaran tanda jadi SPK.'
    return
  }

  refundSubmitting.value = true
  refundError.value = ''
  let uploadedPath = ''

  try {
    const extension = refundFile.value.name.split('.').pop()?.toLowerCase() || 'jpg'
    const safeExtension = /^[a-z0-9]{2,5}$/.test(extension) ? extension : 'jpg'
    uploadedPath = `refund/${payment.spk_request_id}/${Date.now()}-${crypto.randomUUID()}.${safeExtension}`

    let uploadError: { message: string; statusCode?: string; status?: number } | null = null

    for (let attempt = 1; attempt <= 3; attempt += 1) {
      const { error } = await supabase.storage
        .from('payment-proofs')
        .upload(uploadedPath, refundFile.value, {
          cacheControl: '3600',
          upsert: attempt > 1,
          contentType: refundFile.value.type,
        })

      if (!error) {
        uploadError = null
        break
      }

      uploadError = error as { message: string; statusCode?: string; status?: number }
      const retryable =
        String(uploadError.statusCode || '').includes('520')
        || uploadError.status === 520
        || /520|timeout|timed out|network/i.test(uploadError.message)

      if (!retryable || attempt === 3) break
      await new Promise((resolve) => window.setTimeout(resolve, attempt * 700))
    }

    if (uploadError) {
      if (/520|timeout|timed out|network/i.test(uploadError.message)) {
        throw new Error(
          'Server Storage tidak merespons (HTTP 520). Bukti belum disimpan. Tunggu beberapa saat lalu coba lagi.',
        )
      }
      throw uploadError
    }

    const { error: rpcError } = await supabase.rpc('record_booking_fee_refund', {
      p_payment_id: payment.id,
      p_proof_path: uploadedPath,
      p_refund_method: refundMethod.value,
      p_refund_note: refundNote.value,
      p_bank_reference: refundBankReference.value.trim() || null,
      p_refunded_at: makassarDateTimeLocalToIso(refundTransferAt.value),
    })

    if (rpcError) {
      await supabase.storage.from('payment-proofs').remove([uploadedPath])
      throw rpcError
    }

    refundStatus.value = 'Refunded'
    refundProofPath.value = uploadedPath
    refundFile.value = null
    showMessage('Bukti pengembalian berhasil dicatat.')
    await loadSelectedPaymentProof(payment.id)
    await loadTransactions()
  } catch (error) {
    refundError.value = error instanceof Error
      ? error.message
      : 'Bukti pengembalian gagal disimpan.'
  } finally {
    refundSubmitting.value = false
  }
}
async function loadSchedulesForSelectedLot() {
  if (!selectedReportLot.value || selectedReportLot.value.paymentType !== 'Installment') return
  schedulesLoading.value = true
  schedulesError.value = ''
  try {
    installmentSchedules.value = await paymentService.getInstallmentSchedules(Number(selectedReportLot.value.transactionId))
  } catch (error) {
    schedulesError.value = error instanceof Error ? error.message : 'Jadwal cicilan gagal dimuat.'
  } finally {
    schedulesLoading.value = false
  }
  preselectNextInstallment()
}
/** Form tambah pembayaran langsung menandai cicilan aktif berikutnya. */
function preselectNextInstallment() {
  if (paymentPage.value !== 'add' || selectedScheduleIds.value.length) return
  const next = selectableSchedules.value[0]
  if (next) selectedScheduleIds.value = [next.id]
}
async function openReportLot(lot: ReportLot) {
  selectedReportLot.value = lot
  paymentPage.value = 'none'
  selectedScheduleIds.value = []
  selectedMarketingName.value = ''
  try {
    selectedMarketingName.value = await paymentService.getMarketingName(Number(lot.customerId))
  } catch {
    selectedMarketingName.value = lot.marketingName || ''
  }
  if (lot.paymentType === 'Installment') await loadSchedulesForSelectedLot()
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function openAddPayment() {
  if (!selectedReportLot.value) return
  if (availableToPay.value <= 0) {
    showMessage('Tidak ada sisa tagihan yang dapat dibayar. Pembayaran yang menunggu verifikasi sudah menutup sisa tagihan.', 'warning')
    return
  }
  paymentSubmitAttempted.value = false
  paymentPage.value = 'add'
  selectedScheduleIds.value = []
  manualPaymentAmount.value = null
  newPaymentMethod.value = ''
  newPaymentDate.value = getLocalDateInput()
  newPaymentReference.value = ''
  newPaymentNote.value = ''
  clearPaymentProof()
  paymentCreateError.value = ''
  if (selectedReportLot.value.paymentType === 'Installment') {
    if (installmentSchedules.value.length) preselectNextInstallment()
    else void loadSchedulesForSelectedLot()
  }
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
function onPaymentProofSelected(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0] ?? null
  paymentCreateError.value = ''
  if (!file) return
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
  if (!allowed.includes(file.type)) {
    paymentCreateError.value = 'Format file harus JPG, PNG, WEBP, atau PDF.'
    input.value = ''
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    paymentCreateError.value = 'Ukuran file tidak boleh melebihi 5 MB.'
    input.value = ''
    return
  }
  clearPaymentProof()
  paymentProofFile.value = file
  paymentProofPreview.value = file.type.startsWith('image/') ? URL.createObjectURL(file) : ''
}
function clearPaymentProof() {
  if (paymentProofPreview.value) URL.revokeObjectURL(paymentProofPreview.value)
  paymentProofPreview.value = ''
  paymentProofFile.value = null
  const input = document.getElementById('new-payment-proof') as HTMLInputElement | null
  if (input) input.value = ''
}
async function saveNewPayment() {
  if (paymentSaving.value || !selectedReportLot.value) return
  paymentSubmitAttempted.value = true
  if (Object.keys(paymentErrors.value).length || !paymentProofFile.value) {
    paymentCreateError.value = ''
    await nextTick()
    document.querySelector('.payment-create-page [data-field-error]')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
    return
  }
  paymentSaving.value = true
  paymentCreateError.value = ''
  let uploadedPath = ''
  try {
    const lot = selectedReportLot.value
    uploadedPath = await paymentService.uploadProof(paymentProofFile.value, Number(lot.transactionId))
    const allocations = lot.paymentType === 'Installment'
      ? selectedSchedules.value.map((schedule) => ({
          installment_schedule_id: schedule.id,
          allocated_amount: Number(schedule.amount),
        }))
      : []
    await paymentService.createPayment({
      customer_id: Number(lot.customerId),
      lot_id: Number(lot.lotId),
      transaction_id: Number(lot.transactionId),
      payment_date: newPaymentDate.value,
      amount: newPaymentTotal.value,
      payment_method: newPaymentMethod.value,
      payment_category: lot.paymentType === 'Installment' ? 'Installment' : 'Cash Purchase',
      reference_number: newPaymentReference.value.trim() || null,
      proof_path: uploadedPath,
      note: newPaymentNote.value.trim() || null,
      allocations,
    })
    clearPaymentProof()
    paymentPage.value = 'none'
    showMessage('Pembayaran berhasil dicatat dan menunggu verifikasi.')
    await loadTransactions()
    const updatedLot = reportLots.value.find((item) => item.transactionId === lot.transactionId)
    if (updatedLot) {
      selectedReportLot.value = updatedLot
      if (updatedLot.paymentType === 'Installment') await loadSchedulesForSelectedLot()
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    paymentCreateError.value = error instanceof Error ? error.message : 'Pembayaran gagal disimpan. Periksa koneksi internet, lalu coba lagi.'
  } finally {
    paymentSaving.value = false
  }
}

function createInstructionStepKey() {
  return `step-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function addInstructionStep() {
  instructionDraft.value.steps.push({ key: createInstructionStepKey(), text: '' })
}

function removeInstructionStep(index: number) {
  if (instructionDraft.value.steps.length <= 1) return
  instructionDraft.value.steps.splice(index, 1)
}

async function loadPaymentInstruction() {
  instructionLoading.value = true
  instructionError.value = ''
  try {
    const record = await paymentInstructionService.getAdminInstruction()
    if (!record) {
      instructionExists.value = false
      instructionDraft.value = defaultInstructionDraft()
      return
    }
    instructionExists.value = true
    instructionDraft.value = {
      title: record.title ?? '',
      intro: record.intro ?? '',
      steps: (Array.isArray(record.steps) ? record.steps : []).map((step: unknown, index: number) => ({
        key: `step-${index}-${Date.now()}`,
        text: typeof step === 'string' ? step : String((step as { text?: unknown })?.text ?? ''),
      })),
      important_notes_text: Array.isArray(record.important_notes) ? record.important_notes.join('\n') : '',
      is_active: Boolean(record.is_active),
    }
    if (!instructionDraft.value.steps.length) {
      instructionDraft.value.steps = [{ key: createInstructionStepKey(), text: '' }]
    }
  } catch (error) {
    instructionError.value = error instanceof Error ? error.message : 'Periksa koneksi dan izin akses database.'
  } finally {
    instructionLoading.value = false
  }
}

async function savePaymentInstruction() {
  if (!canSaveInstruction.value || instructionSaving.value) return
  instructionSaving.value = true
  instructionError.value = ''
  try {
    const payload = {
      title: instructionDraft.value.title.trim(),
      intro: instructionDraft.value.intro.trim(),
      steps: instructionDraft.value.steps.map((step) => step.text.trim()),
      important_notes: instructionDraft.value.important_notes_text
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
      is_active: instructionDraft.value.is_active,
    }
    await paymentInstructionService.saveAdminInstruction(payload)
    instructionExists.value = true
    showMessage('Instruksi pembayaran berhasil disimpan.')
  } catch (error) {
    instructionError.value = error instanceof Error ? error.message : 'Instruksi gagal disimpan.'
    showMessage(instructionError.value, 'error')
  } finally {
    instructionSaving.value = false
  }
}

async function deletePaymentInstruction() {
  const confirmed = await confirm({ title: 'Hapus instruksi pembayaran?', message: 'Pembeli tidak akan melihat panduan sampai instruksi dibuat kembali.', confirmText: 'Hapus', tone: 'error' })
  if (!confirmed || instructionSaving.value) return
  instructionSaving.value = true
  instructionError.value = ''
  try {
    await paymentInstructionService.deleteAdminInstruction()
    instructionExists.value = false
    instructionDraft.value = defaultInstructionDraft()
    showMessage('Instruksi pembayaran berhasil dihapus.')
  } catch (error) {
    instructionError.value = error instanceof Error ? error.message : 'Instruksi gagal dihapus.'
    showMessage(instructionError.value, 'error')
  } finally {
    instructionSaving.value = false
  }
}


function bankInitials(bankName: string) {
  const words = bankName.trim().split(/\s+/).filter(Boolean)
  return words.length > 1 ? words.slice(0, 2).map((word) => word[0]).join('').toUpperCase() : (words[0] || 'BANK').slice(0, 4).toUpperCase()
}

function bankBrandClass(bankName: string) {
  const normalized = bankName.toLowerCase()
  if (normalized.includes('bca')) return 'bca'
  if (normalized.includes('bri')) return 'bri'
  if (normalized.includes('mandiri')) return 'mandiri'
  if (normalized.includes('bni')) return 'bni'
  return 'default'
}

function formatBankAccountNumber(value: string) {
  return value.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()
}

async function loadBankAccounts() {
  bankLoading.value = true
  bankError.value = ''
  try {
    bankAccounts.value = await bankAccountService.getAdminBankAccounts()
  } catch (error) {
    bankError.value = error instanceof Error ? error.message : 'Periksa koneksi dan izin akses database.'
  } finally {
    bankLoading.value = false
  }
}

function openBankEditor(account?: BankAccountRecord) {
  editingBankId.value = account?.id ?? null
  bankDraft.value = account
    ? {
        bank_name: account.bank_name,
        account_number: account.account_number,
        account_holder: account.account_holder,
        description: account.description ?? '',
        is_active: account.is_active,
        is_primary: account.is_primary,
      }
    : emptyBankDraft()
  bankFormError.value = ''
  bankModalOpen.value = true
}

async function saveBankAccount() {
  if (!canSaveBank.value || bankSaving.value) return
  bankSaving.value = true
  bankFormError.value = ''
  try {
    const payload = {
      bank_name: bankDraft.value.bank_name.trim(),
      account_number: bankDraft.value.account_number.replace(/\s+/g, ''),
      account_holder: bankDraft.value.account_holder.trim(),
      description: bankDraft.value.description.trim() || null,
      is_active: bankDraft.value.is_active,
      is_primary: bankDraft.value.is_active && bankDraft.value.is_primary,
    }
    if (editingBankId.value) {
      await bankAccountService.updateBankAccount(editingBankId.value, payload)
    } else {
      await bankAccountService.createBankAccount(payload)
    }
    bankModalOpen.value = false
    showMessage(editingBankId.value ? 'Rekening bank berhasil diperbarui.' : 'Rekening bank berhasil ditambahkan.')
    await loadBankAccounts()
  } catch (error) {
    bankFormError.value = error instanceof Error ? error.message : 'Rekening gagal disimpan.'
  } finally {
    bankSaving.value = false
  }
}

async function confirmDeleteBank(account: BankAccountRecord) {
  const confirmed = await confirm({ title: 'Hapus rekening?', message: `${account.bank_name} ${formatBankAccountNumber(account.account_number)}`, confirmText: 'Hapus', tone: 'error' })
  if (!confirmed) return
  try {
    await bankAccountService.deleteBankAccount(account.id)
    showMessage('Rekening bank berhasil dihapus.')
    await loadBankAccounts()
  } catch (error) {
    showMessage(error instanceof Error ? error.message : 'Rekening bank gagal dihapus.', 'error')
  }
}

async function loadPaymentPlans() {
  planLoading.value = true
  planError.value = ''
  try {
    paymentPlans.value = await paymentPlanService.getAll()
  } catch (error) {
    planError.value = error instanceof Error ? error.message : 'Periksa koneksi dan izin akses tabel payment_plans.'
  } finally {
    planLoading.value = false
  }
}

function formatPlanMargin(value: number | string | null) {
  const number = Number(value ?? 0)
  return new Intl.NumberFormat('id-ID', { maximumFractionDigits: 2 }).format(Number.isFinite(number) ? number : 0)
}

function openPlanEditor(plan?: PaymentPlanRecord) {
  editingPlanId.value = plan?.id ?? null
  planDraft.value = plan
    ? { plan_name: plan.plan_name, months: Number(plan.months), margin_percent: Number(plan.margin_percent ?? 0) }
    : emptyPaymentPlanDraft()
  planFormError.value = ''
  planModalOpen.value = true
}

async function savePaymentPlan() {
  if (!canSavePlan.value || planSaving.value) return
  planSaving.value = true
  planFormError.value = ''
  try {
    const months = Number(planDraft.value.months)
    const marginPercent = Number(Number(planDraft.value.margin_percent).toFixed(2))
    const planName = planDraft.value.plan_name.trim()
    const payload = {
      plan_name: planName,
      months,
      margin_percent: marginPercent,
    }

    const latestPlans = await paymentPlanService.getAll()
    paymentPlans.value = latestPlans

    const duplicatePlan = paymentPlans.value.find((plan) =>
      plan.id !== editingPlanId.value &&
      Number(plan.months) === months &&
      Number(plan.margin_percent ?? 0) === marginPercent,
    )
    if (duplicatePlan) {
      planFormError.value = `Kombinasi ${months} Bulan dan margin ${formatPlanMargin(marginPercent)}% sudah digunakan.`
      return
    }

    if (editingPlanId.value !== null) {
      const existing = paymentPlans.value.find((item: PaymentPlanRecord) => item.id === editingPlanId.value)
      await paymentPlanService.update(editingPlanId.value, payload, Number(existing?.margin_percent ?? 0))
    } else {
      await paymentPlanService.create(payload)
    }

    planModalOpen.value = false
    showMessage(editingPlanId.value !== null ? 'Skema cicilan berhasil diperbarui.' : 'Skema cicilan berhasil ditambahkan.')
    await loadPaymentPlans()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Skema cicilan gagal disimpan.'
    planFormError.value = message.includes('payment_plans_plan_name_key') || message.includes('duplicate key')
      ? `Kombinasi tenor dan margin tersebut sudah digunakan oleh skema lain.`
      : message.includes('row-level security') || message.includes('permission denied')
        ? 'Akun ini tidak memiliki izin untuk menambah skema cicilan. Periksa policy INSERT pada tabel payment_plans.'
        : message
  } finally {
    planSaving.value = false
  }
}

function openPlanDeleteConfirmation(plan: PaymentPlanRecord) {
  planToDelete.value = plan
  planDeleteError.value = ''
  planDeleteModalOpen.value = true
}

async function deletePaymentPlan() {
  if (!planToDelete.value || planDeleting.value) return
  planDeleting.value = true
  planDeleteError.value = ''
  try {
    await paymentPlanService.remove(planToDelete.value.id)
    planDeleteModalOpen.value = false
    showMessage(`Skema ${formatPaymentPlanName(planToDelete.value.plan_name, planToDelete.value.months)} berhasil dihapus.`)
    planToDelete.value = null
    await loadPaymentPlans()
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Skema cicilan gagal dihapus.'
    planDeleteError.value = message.includes('foreign key') || message.includes('violates')
      ? 'Skema ini masih digunakan oleh transaksi. Ubah atau lepaskan referensi transaksi terlebih dahulu.'
      : error instanceof Error && error.name === 'PaymentPlanDeleteNotAppliedError'
        ? 'Skema tidak terhapus. Pastikan policy DELETE payment_plans mengizinkan Admin dan skema masih ada di database.'
      : message
  } finally {
    planDeleting.value = false
  }
}

function initials(name: string) { return name.split(' ').filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase() }
function statusLabel(status: FinanceStatus) { return status === 'pending' ? 'Menunggu' : status === 'verified' ? 'Terverifikasi' : 'Ditolak / Terlambat' }
function showMessage(message: string, tone: ToastTone = 'success') { toast.show(tone, message) }

function refreshTransactions() {
  return withRefreshSkeleton(refreshing, () => loadTransactions(true))
}

async function loadTransactions(silent = false) {
  if (!silent) loading.value = true
  errorMessage.value = ''
  try {
    const customers = await customerService.getAdminCustomers()
    const directPayments = await customerService.getAdminPaymentVerificationRecords()
    rawCustomers.value = customers ?? []
    directPaymentRecords.value = directPayments

    const paymentIds = [
      ...new Set(directPayments.map(({ payment }) => Number(payment.id)).filter(Number.isInteger)),
    ]
    const refundResult = paymentIds.length
      ? await supabase
          .from('booking_fee_refunds')
          .select('payment_id,status,proof_path')
          .in('payment_id', paymentIds)
      : { data: [] as any[], error: null }
    if (refundResult.error) throw refundResult.error
    const refundMap = new Map<number, { status: 'Pending Refund' | 'Refunded'; proofPath: string | null }>()
    for (const refund of refundResult.data ?? []) {
      refundMap.set(Number(refund.payment_id), {
        status: refund.status,
        proofPath: refund.proof_path ?? null,
      })
    }

    transactions.value = directPayments.map(({ payment, customer, lot, spk }) => {
      const date = payment.payment_date || payment.created_at || customer?.created_at || new Date().toISOString()
      const status: FinanceStatus = payment.status === 'Confirmed' ? 'verified' : payment.status === 'Rejected' ? 'overdue' : 'pending'
      const lotCode = lot?.lot_number || `Kavling #${payment.lot_id ?? '-'}`
      const paymentType = payment.spk_request_id && !payment.transaction_id
        ? `Booking Fee SPK${spk?.spk_number ? ` · ${spk.spk_number}` : ''}`
        : paymentRecordLabel(payment)
      return {
        id: String(payment.id),
        customerName: customer?.full_name || 'Pelanggan tidak tersedia',
        lotCode,
        paymentType,
        amount: Number(payment.amount || 0),
        method: payment.payment_method || 'Metode belum tercatat',
        date,
        status,
        reviewStatus: String(payment.status || 'Pending'),
        spkNumber: spk?.spk_number || '',
        spkRequestId: String(payment.spk_request_id ?? spk?.id ?? ''),
        refundStatus: payment.payment_category === 'Booking'
          ? refundMap.get(Number(payment.id))?.status ?? null
          : null,
        refundProofPath: payment.payment_category === 'Booking'
          ? refundMap.get(Number(payment.id))?.proofPath ?? null
          : null,
      } as FinanceTransaction
    })
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Periksa koneksi internet, lalu coba lagi.' } finally { loading.value = false }
}

async function applyRouteIntent(params: LocationQuery) {
  const requestedStatus = params.status
  const requestedTab = params.tab
  const requestedPaymentId = Array.isArray(params.paymentId) ? params.paymentId[0] : params.paymentId
  const requestedSpkRequestId = Array.isArray(params.spkRequestId) ? params.spkRequestId[0] : params.spkRequestId
  targetPaymentId.value = typeof requestedPaymentId === 'string' ? requestedPaymentId : ''
  targetSpkRequestId.value = typeof requestedSpkRequestId === 'string' ? requestedSpkRequestId : ''
  if (requestedTab === 'plans') activeView.value = 'plans'
  if (requestedTab === 'verification') activeView.value = 'verification'
  if (requestedStatus === 'pending' || requestedStatus === 'verified' || requestedStatus === 'overdue') {
    activeFilter.value = requestedStatus
  }
  await loadTransactions()
  const paymentId = Number(targetPaymentId.value)
  if (Number.isInteger(paymentId) && paymentId > 0) {
    await openPaymentProof(paymentId)
  } else if (targetSpkRequestId.value) {
    const targetPayment = directPaymentRecords.value.find(({ payment }) => String(payment.spk_request_id ?? '') === targetSpkRequestId.value)
    if (targetPayment) {
      targetPaymentId.value = String(targetPayment.payment.id)
      await openPaymentProof(targetPayment.payment.id)
    }
  }
  if (requestedTab === 'cancellations') openCancellationReview()
}

// Tap notifikasi saat halaman ini masih tersimpan di tumpukan Ionic.
watch(() => routeQuery.value.nt, (stamp) => {
  if (!stamp) return
  closePaymentPage()
  query.value = ''
  activeView.value = 'verification'
  void applyRouteIntent(routeQuery.value)
})

onMounted(async () => {
  await applyRouteIntent(routeQuery.value)
  void loadCancellationRequests()
  void loadPaymentInstruction()
  void loadBankAccounts()
  void loadPaymentPlans()
})
</script>

<style scoped>
.admin-finance-page { color: var(--text-primary); font-family: var(--font-primary); }
.finance-shell { max-width: 1120px; margin: 0 auto; padding: 22px 16px calc(112px + env(safe-area-inset-bottom)); }
.ledger-page { display: grid; gap: 16px; }
.ledger-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.ledger-heading h1 { margin: 0; color: var(--text-primary); font-size: 21px; }
.ledger-heading p { margin: 6px 0 0; color: var(--text-secondary); font-size: 12px; line-height: 1.5; }
.ledger-policy-note { padding: 12px; border-left: 3px solid var(--poliland-gold-text); border-radius: 4px var(--radius-control) var(--radius-control) 4px; background: var(--poliland-gold-soft); color: var(--text-primary); font-size: 11px; line-height: 1.55; }
.ledger-totals { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
.ledger-totals article { display: grid; gap: 7px; min-width: 0; padding: 14px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.ledger-count { grid-column: 1 / -1; margin: 0; color: var(--text-secondary); font-size: 11px; }
.ledger-totals span { color: var(--text-secondary); font-size: 10px; line-height: 1.4; }
.ledger-totals strong { color: var(--text-primary); font-size: 16px; overflow-wrap: anywhere; }
.cancellation-review-page { display: grid; gap: 16px; }
.cancellation-request-list { display: grid; gap: 12px; }
.cancellation-review-card { display: grid; gap: 14px; padding: 16px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.cancellation-review-card__top { display: flex; justify-content: space-between; gap: 14px; }
.cancellation-review-card__top div, .cancellation-review-card__top > strong { display: grid; gap: 4px; }
.cancellation-review-card__top span, .cancellation-review-card__top small { color: var(--text-secondary); font-size: 11px; }
.cancellation-review-card__top h2 { margin: 2px 0 0; color: var(--text-primary); font-size: 16px; }
.cancellation-review-card__top > strong { flex: 0 0 auto; text-align: right; font-size: 14px; }
.cancellation-review-reason { margin: 0; padding: 12px; border-radius: var(--radius-control); background: var(--surface-muted); color: var(--text-primary); font-size: 12px; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
.cancellation-review-actions { display: flex; justify-content: flex-end; gap: 8px; }
.cancellation-review-actions button { min-height: 42px; }
.cancellation-decision-form { display: grid; gap: 12px; color: var(--text-primary); font-size: 12px; line-height: 1.55; }
.cancellation-decision-form p { margin: 0; }
.cancellation-decision-form label { font-weight: var(--font-weight-semibold); }
.cancellation-decision-form textarea { width: 100%; min-height: 92px; padding: 11px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-muted); color: var(--text-primary); font: inherit; resize: vertical; }
.cancellation-decision-form textarea:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
@media (max-width: 600px) {
  .ledger-heading { flex-direction: column; }
  .ledger-totals { grid-template-columns: 1fr; }
  .ledger-totals article { grid-template-columns: 1fr auto; align-items: center; }
  .ledger-totals strong { text-align: right; font-size: 14px; }
  .cancellation-review-card__top { flex-direction: column; }
  .cancellation-review-card__top > strong { text-align: left; }
  .cancellation-review-actions { flex-direction: column-reverse; }
  .cancellation-review-actions button { width: 100%; }
}
.transaction-card--target { border-color: var(--poliland-gold); box-shadow: 0 0 0 3px color-mix(in srgb, var(--poliland-gold) 22%, transparent); }
.export-button { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; gap: 7px; min-height: 44px; padding: 0 13px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 12px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.export-button ion-icon { color: var(--poliland-green); font-size: 17px; }
.export-button:disabled { cursor: not-allowed; opacity: .5; }
.report-summary { display: grid; grid-template-columns: minmax(0, 1.5fr) repeat(2, minmax(0, 1fr)); gap: 10px; }
.report-total-card, .report-metric-card { min-width: 0; padding: 15px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.report-total-card { border-color: color-mix(in srgb, var(--poliland-gold) 58%, var(--border-default)); background: color-mix(in srgb, var(--poliland-gold-soft) 24%, var(--surface-primary)); }
.report-total-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--text-secondary); font-size: 11px; }
.report-total-card > strong { display: block; margin-top: 13px; overflow-wrap: anywhere; color: var(--text-primary); font-size: clamp(19px, 4vw, 26px); letter-spacing: -.035em; }
.report-total-card p { margin: 5px 0 0; color: var(--text-secondary); font-size: 11px; }
.report-metric-card { display: flex; flex-direction: column; justify-content: center; gap: 8px; }
.report-metric-card > span, .report-metric-card small { color: var(--text-secondary); font-size: 11px; }
.report-metric-card > strong { overflow-wrap: anywhere; color: var(--text-primary); font-size: clamp(17px, 3vw, 22px); letter-spacing: -.025em; }
.report-panel { margin-top: 14px; padding: 17px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.panel-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.panel-heading h2 { margin: 0; color: var(--text-primary); font-size: 14px; font-weight: var(--font-weight-bold); }
.panel-heading p { margin: 5px 0 0; color: var(--text-secondary); font-size: 11px; line-height: 1.45; }
.panel-period { flex: 0 0 auto; padding: 5px 8px; border-radius: 8px; background: var(--surface-muted); color: var(--text-secondary); font-size: 10px; font-weight: var(--font-weight-semibold); }
.monthly-chart { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; min-height: 176px; margin-top: 18px; padding-top: 8px; }
.chart-column { display: grid; grid-template-rows: 20px minmax(70px, 1fr) 16px auto; justify-items: center; gap: 6px; min-width: 0; }
.chart-value { max-width: 100%; overflow: hidden; color: var(--text-secondary); font-size: 10px; font-weight: var(--font-weight-semibold); text-overflow: ellipsis; white-space: nowrap; }
.chart-track { display: flex; width: min(100%, 48px); height: 100%; align-items: flex-end; gap: 2px; overflow: hidden; border-radius: 8px 8px 3px 3px; background: var(--surface-muted); }
.chart-bar { display: block; width: 100%; min-height: 0; border-radius: 7px 7px 2px 2px; background: var(--poliland-green); transition: height var(--dur-base) var(--ease-out); }
.chart-bar--income, .chart-bar--expense { width: calc(50% - 1px); flex: 0 0 calc(50% - 1px); }
.chart-bar--expense { background: var(--status-danger); }
.chart-label { color: var(--text-secondary); font-size: 10px; text-transform: capitalize; }
.report-search { display: flex; flex: 0 1 220px; align-items: center; gap: 7px; min-width: 130px; min-height: 40px; padding: 0 10px; border: 1px solid var(--border-default); border-radius: 10px; color: var(--text-secondary); }
.report-search ion-icon { flex: 0 0 auto; font-size: 16px; }
.report-search input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 11px; }
.bank-panel, .instruction-panel { min-width: 0; }
.bank-guidance { display: flex; align-items: flex-start; gap: 9px; margin: 14px 0; padding: 13px 12px; border-radius: var(--radius-card); background: var(--surface-muted); }
.bank-guidance > ion-icon { flex: 0 0 auto; margin-top: 1px; color: var(--poliland-green); font-size: 19px; }
.bank-guidance strong { display: block; color: var(--text-primary); font-size: 13px; font-weight: var(--font-weight-semibold); }
.bank-guidance p { margin: 3px 0 0; color: var(--text-secondary); font-size: 11px; line-height: 1.45; }
.bank-account-list { display: grid; gap: 10px; }
.bank-account-card { min-width: 0; padding: 13px 12px 11px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.bank-card-top { display: grid; grid-template-columns: 48px minmax(0, 1fr) 34px; align-items: start; gap: 11px; }
.bank-brand-mark { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 10px; background: var(--surface-muted); color: var(--poliland-green); font-size: 16px; font-weight: var(--font-weight-bold); letter-spacing: -.04em; }
.bank-brand-mark--bca, .bank-brand-mark--bri, .bank-brand-mark--bni { color: #075B9A; }
.bank-brand-mark--mandiri { color: #173E79; }
.bank-account-identity { min-width: 0; }
.bank-name-line { display: flex; align-items: center; flex-wrap: wrap; gap: 7px; }
.bank-name-line h2 { margin: 0; color: var(--text-primary); font-size: 15px; font-weight: var(--font-weight-semibold); }
.bank-status { display: inline-flex; align-items: center; gap: 5px; padding: 3px 8px; border-radius: 99px; background: var(--status-success-bg); color: var(--poliland-green); font-size: 10px; }
.bank-status > span { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
.bank-status--inactive { background: var(--surface-muted); color: var(--text-secondary); }
.bank-account-number { display: block; margin-top: 4px; color: var(--text-primary); font-size: 14px; font-weight: var(--font-weight-semibold); letter-spacing: .015em; overflow-wrap: anywhere; }
.bank-account-identity p { margin: 2px 0 0; color: var(--text-secondary); font-size: 11px; }
.bank-card-actions { display: grid; gap: 3px; }
.bank-icon-action { display: grid; width: 34px; height: 34px; place-items: center; border: 0; border-radius: 9px; background: transparent; color: var(--text-secondary); font-size: 17px; cursor: pointer; }
.bank-icon-action--danger { color: var(--status-danger); }
@media (hover: hover) and (pointer: fine) {
  .bank-icon-action:hover { background: var(--surface-muted); }
}
.bank-account-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-top: 12px; color: var(--text-secondary); font-size: 10px; line-height: 1.4; }
.bank-primary-label { display: inline-flex; align-items: center; gap: 4px; color: var(--poliland-gold-text-soft); font-weight: var(--font-weight-semibold); }
.bank-primary-label ion-icon { font-size: 13px; }
.bank-inactive-label { color: var(--status-danger); }
.bank-add-button { display: flex; width: 100%; min-height: 48px; align-items: center; justify-content: center; gap: 8px; margin-top: 18px; border: 1px solid var(--poliland-gold); border-radius: var(--radius-control); background: var(--poliland-gold); color: #fff; font: inherit; font-size: 13px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.bank-add-button ion-icon { font-size: 19px; }
.bank-add-button:focus-visible, .bank-icon-action:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.bank-form { display: grid; gap: 16px; padding: 2px 0 8px; }

.bank-form .instruction-publish-toggle { margin-top: -5px; }
.instruction-panel .instruction-editor { margin-top: 12px; }
@media (min-width: 700px) {
  .bank-account-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.instruction-editor { display: grid; gap: 18px; padding: 17px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.instruction-field { display: grid; gap: 7px; min-width: 0; }
.instruction-field label, .instruction-section-heading h2 { color: var(--text-primary); font-size: 12px; font-weight: var(--font-weight-semibold); }
.instruction-field input, .instruction-field textarea, .instruction-step input { width: 100%; min-width: 0; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 12px; }
.instruction-field input { min-height: 44px; padding: 0 12px; }
.instruction-field textarea { min-height: 104px; padding: 11px 12px; line-height: 1.6; resize: vertical; }
.instruction-field small { color: var(--text-secondary); font-size: 10px; }
.instruction-section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; }
.instruction-section-heading h2 { margin: 0; font-size: 13px; }
.instruction-section-heading p { margin: 4px 0 0; color: var(--text-secondary); font-size: 11px; }
.instruction-section-heading > span { flex: 0 0 auto; color: var(--text-secondary); font-size: 10px; }
.instruction-steps { display: grid; gap: 8px; }
.instruction-step { display: grid; grid-template-columns: 28px minmax(0, 1fr) 36px; align-items: center; gap: 8px; min-width: 0; padding: 7px 8px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); }
.instruction-step-number { display: grid; width: 26px; height: 26px; place-items: center; border-radius: 50%; background: var(--status-success-bg); color: var(--poliland-green); font-size: 11px; font-weight: var(--font-weight-bold); }
.instruction-step input { min-height: 38px; padding: 0 8px; border-color: transparent; background: transparent; }
.instruction-step input:focus { border-color: var(--poliland-green); outline: none; }
.instruction-remove { display: grid; width: 36px; height: 36px; place-items: center; border: 0; border-radius: 9px; background: transparent; color: var(--text-secondary); font-size: 17px; cursor: pointer; }
.instruction-remove:disabled { opacity: .35; cursor: not-allowed; }
.instruction-add { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 44px; border: 1px dashed var(--border-default); border-radius: var(--radius-control); background: var(--surface-muted); color: var(--text-primary); font: inherit; font-size: 12px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.instruction-add ion-icon { color: var(--poliland-green); font-size: 17px; }
.instruction-publish-toggle { display: flex; align-items: flex-start; gap: 10px; padding: 13px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-muted); cursor: pointer; }
.instruction-publish-toggle input { flex: 0 0 auto; width: 18px; height: 18px; margin: 1px 0 0; accent-color: var(--poliland-green); }
.instruction-publish-toggle strong, .instruction-publish-toggle small { display: block; }
.instruction-publish-toggle strong { color: var(--text-primary); font-size: 11px; }
.instruction-publish-toggle small { margin-top: 4px; color: var(--text-secondary); font-size: 10px; line-height: 1.45; }
.instruction-actions { display: grid; gap: 9px; }
.instruction-save { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 48px; padding: 0 16px; border: 1px solid var(--poliland-gold); border-radius: var(--radius-control); background: var(--poliland-gold); color: #252525; font: inherit; font-size: 12px; font-weight: var(--font-weight-bold); cursor: pointer; }
.instruction-save ion-icon { font-size: 17px; }
.instruction-save:disabled { cursor: not-allowed; opacity: .55; }
.instruction-delete { display: inline-flex; align-items: center; justify-content: center; gap: 7px; min-height: 44px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--status-danger); font: inherit; font-size: 11px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.instruction-delete:disabled { opacity: .5; cursor: not-allowed; }
.instruction-field input:focus-visible, .instruction-field textarea:focus-visible, .instruction-step input:focus-visible, .instruction-add:focus-visible, .instruction-remove:focus-visible, .instruction-save:focus-visible, .instruction-delete:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
@media (max-width: 600px) {
  .instruction-editor { padding: 14px; gap: 16px; }
}
 .transaction-details span { display: block; color: var(--text-secondary); font-size: 11px; }
.finance-tabs { display: flex; gap: 8px; margin-top: 18px; overflow-x: auto; scrollbar-width: none; }.finance-tabs::-webkit-scrollbar { display: none; }
.finance-tabs button { min-height: 42px; padding: 0 13px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-secondary); font: inherit; font-size: 12px; font-weight: var(--font-weight-semibold); white-space: nowrap; cursor: pointer; }.finance-tabs button span { margin-left: 4px; }.finance-tabs button.active { border-color: var(--poliland-gold); background: var(--poliland-gold-soft); color: var(--text-primary); }
.finance-search { display: flex; align-items: center; gap: 9px; min-height: 46px; margin-top: 12px; padding: 0 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); }.finance-search > ion-icon { color: var(--text-secondary); font-size: 18px; }.finance-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 13px; }.finance-search button { display: grid; width: 32px; height: 32px; place-items: center; border: 0; background: transparent; color: var(--text-secondary); }
.transaction-list { display: grid; gap: 12px; margin-top: 16px; }.transaction-card { min-width: 0; padding: 15px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }.transaction-head { display: flex; align-items: center; gap: 10px; }.customer-mark { display: grid; flex: 0 0 42px; width: 42px; height: 42px; place-items: center; border-radius: 12px; font-size: 12px; font-weight: var(--font-weight-bold); }.customer-mark--pending { background: var(--poliland-gold-soft); color: var(--poliland-gold-text-soft); }.customer-mark--verified { background: var(--status-success-bg); color: var(--poliland-green); }.customer-mark--overdue { background: color-mix(in srgb, var(--status-danger) 11%, white); color: var(--status-danger); }.transaction-customer { min-width: 0; flex: 1; }.transaction-customer h2 { margin: 0; font-size: 14px; }.transaction-customer p { margin: 3px 0 0; overflow: hidden; color: var(--text-secondary); font-size: 11px; text-overflow: ellipsis; white-space: nowrap; }.status-badge { flex: 0 0 auto; padding: 5px 8px; border: 1px solid currentColor; border-radius: 999px; font-size: 10px; font-weight: var(--font-weight-semibold); }.status-badge--pending { color: var(--poliland-gold-text); background: var(--poliland-gold-soft); }.status-badge--verified { color: var(--poliland-green); background: var(--status-success-bg); }.status-badge--overdue { color: var(--status-danger); background: color-mix(in srgb, var(--status-danger) 10%, white); }
.transaction-details { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-top: 14px; padding: 12px; border-radius: var(--radius-control); background: var(--surface-muted); }.transaction-details strong { display: block; margin-top: 4px; font-size: 18px; }.transaction-details time { display: block; margin-top: 4px; color: var(--text-secondary); font-size: 10px; text-align: right; }.transaction-actions { display: flex; gap: 8px; margin-top: 12px; }.transaction-actions button { min-height: 44px; padding: 0 12px; border-radius: var(--radius-control); font: inherit; font-size: 11px; font-weight: var(--font-weight-semibold); cursor: pointer; }.spk-link-action { display: inline-flex; flex: 1; align-items: center; justify-content: center; gap: 6px; color: var(--poliland-green); border-color: var(--poliland-green); }
.spk-link-action:active { transform: scale(0.97); }
.primary-action { display: inline-flex; flex: 1; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--poliland-green); background: var(--poliland-green); color: #fff; }.quiet-action { border: 1px solid var(--border-default); background: var(--surface-primary); color: var(--text-secondary); }.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; clip-path: inset(50%); }
button:focus-visible, input:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
@media (max-width: 600px) {.transaction-actions { flex-wrap: wrap; }.primary-action{ flex: 1 1 100%; }.quiet-action { flex: 1 1 100%; } }
.transaction-actions .primary-action, .transaction-actions .spk-link-action { flex: 1 1 0; min-width: 0; white-space: nowrap; }
@media (max-width: 600px) {
  .export-button { width: 100%; }
  .report-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .report-total-card { grid-column: 1 / -1; }
  .report-metric-card { min-height: 104px; }
  .report-panel { padding: 14px; }
  .report-search { flex: 1 1 auto; width: 100%; }
}
@media (max-width: 360px) {
  .report-summary { gap: 7px; }
  .report-metric-card { padding: 11px; }
  .report-metric-card > strong { font-size: 16px; }
  .report-total-card { padding: 13px; }
  .report-total-card > strong { font-size: 19px; }
  .monthly-chart { gap: 6px; }
  .chart-value { font-size: 9px; }
}
@media (max-width: 360px) {.transaction-details { align-items: flex-start; flex-direction: column; }.transaction-details time { text-align: left; } }
.report-toolbar { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin: 10px 0 16px; }
.report-toolbar .export-button { min-height: 42px; padding: 0 11px; }
.report-total-card--monthly { display: grid; gap: 14px; padding: 16px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.report-total-card--monthly .report-total-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--text-secondary); font-size: 11px; font-weight: var(--font-weight-semibold); }
.report-total-card--monthly .report-total-top > span:first-child { display: inline-flex; align-items: center; gap: 7px; }
.report-total-card--monthly .report-total-top ion-icon { padding: 7px; border-radius: 9px; background: var(--surface-muted); color: var(--poliland-gold-text); font-size: 17px; }
.report-total-card--monthly > strong { color: var(--text-primary); font-size: clamp(23px, 6vw, 29px); letter-spacing: -.04em; }
.report-growth { flex: 0 0 auto; padding: 5px 7px; border-radius: 7px; background: var(--status-success-bg); color: var(--poliland-green); font-size: 10px; }
.report-growth--down { background: color-mix(in srgb, var(--status-danger) 10%, white); color: var(--status-danger); }
.report-income-sources { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 9px; }
.report-income-sources > div { min-width: 0; padding: 11px; border-radius: var(--radius-control); background: var(--surface-muted); }
.report-income-sources span, .report-income-sources small { display: block; color: var(--text-secondary); font-size: 10px; }
.report-income-sources span { display: flex; align-items: center; gap: 5px; }
.report-income-sources strong { display: block; margin: 6px 0 3px; color: var(--text-primary); font-size: 14px; overflow-wrap: anywhere; }
.report-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; }
.report-dot--gold { background: var(--poliland-gold); }
.report-dot--green { background: var(--poliland-green); }
.report-trend-panel { margin-top: 14px; padding: 16px; }
.report-trend-panel .monthly-chart { min-height: 190px; }
.monthly-chart--dense { gap: 4px; }
.monthly-chart--dense .chart-value{ display: none; }
.monthly-chart--dense .chart-column { grid-template-rows: minmax(70px, 1fr) 16px; }
.monthly-chart--dense .chart-track { width: min(100%, 22px); }
.monthly-chart--dense .chart-label { font-size: 9px; }
.report-toolbar--period { flex-direction: column; align-items: stretch; }
.report-period { display: grid; gap: 8px; }
.report-granularity { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: 999px; background: var(--surface-muted); }
.report-granularity button { min-height: 36px; border: 0; border-radius: 999px; background: transparent; color: var(--text-secondary); font: inherit; font-size: 12px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.report-granularity button.is-active { background: var(--surface-primary); color: var(--text-primary); box-shadow: 0 1px 4px rgb(37 37 37 / 12%); }
.report-stepper { display: grid; grid-template-columns: 44px minmax(0, 1fr) 44px; gap: 6px; }
.report-stepper button { display: inline-flex; min-height: 44px; align-items: center; justify-content: center; gap: 7px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 12px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.report-stepper button:disabled { opacity: .45; cursor: default; }
.report-stepper__label { min-width: 0; padding: 0 10px; }
.report-stepper__label ion-icon { flex: 0 0 auto; color: var(--poliland-gold-text); font-size: 16px; }
.report-stepper__label span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.report-toolbar--period .export-button { width: 100%; }

.export-button ion-spinner { width: 16px; height: 16px; }
.chart-bar--peak { background: var(--poliland-gold); }
.report-panel .panel-period { padding: 5px 8px; border-radius: 999px; background: var(--surface-muted); color: var(--text-primary); font-size: 10px; }
.report-recent-section { display: grid; gap: 10px; margin-top: 24px; }
.report-section-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.report-section-heading h2 { margin: 0; font-size: 15px; }
.report-section-heading > span { color: var(--text-secondary); font-size: 10px; }
.report-recent-card { display: flex; min-width: 0; align-items: center; gap: 10px; padding: 12px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.report-recent-icon { display: grid; flex: 0 0 38px; width: 38px; height: 38px; place-items: center; border-radius: 50%; background: var(--surface-muted); color: var(--text-secondary); font-size: 19px; }
.report-recent-icon.is-confirmed { background: var(--status-success-bg); color: var(--poliland-green); }
.report-recent-icon.is-outflow { background: color-mix(in srgb, var(--status-danger) 12%, var(--surface-primary)); color: var(--status-danger); }
.report-recent-main { flex: 1; min-width: 0; }
.report-recent-main strong { display: block; font-size: 12px; }
.report-recent-main p { margin: 3px 0; color: var(--text-secondary); font-size: 10px; overflow-wrap: anywhere; }
.report-recent-main small, .report-recent-amount small { color: var(--text-secondary); font-size: 9px; }
.report-recent-amount { flex: 0 0 auto; text-align: right; }
.report-recent-amount strong { display: block; font-size: 12px; white-space: nowrap; }
.report-text-confirmed { color: var(--poliland-green) !important; }
.report-text-pending { color: var(--poliland-gold-text) !important; }
.report-text-rejected{ color: var(--status-danger) !important; }
.report-list-intro { display: flex; align-items: flex-end; justify-content: space-between; gap: 10px; margin: 18px 0 12px; }
.report-list-intro h1 { margin: 0; font-size: 18px; letter-spacing: -.02em; }
.report-list-intro p { max-width: 270px; margin: 4px 0 0; color: var(--text-secondary); font-size: 11px; line-height: 1.45; }
.report-list-intro > span { flex: 0 0 auto; padding: 5px 8px; border-radius: 999px; background: var(--surface-muted); color: var(--text-secondary); font-size: 10px; }
.report-search--full { width: 100%; min-height: 44px; margin: 0 0 14px; }
.report-search--full input { min-width: 0; }
.report-search--full button { display: grid; flex: 0 0 32px; width: 32px; height: 32px; place-items: center; border: 0; border-radius: 8px; background: transparent; color: var(--text-secondary); }
.report-lot-list, .report-buyer-list { display: grid; gap: 12px; }
.report-lot-card, .report-buyer-card { min-width: 0; padding: 14px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); box-shadow: 0 3px 12px rgb(37 37 37 / 4%); }
.report-lot-card-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.report-lot-card-heading h2 { margin: 0; font-size: 13px; }
.report-lot-card-heading p { margin: 4px 0 0; color: var(--text-secondary); font-size: 10px; }
.report-lot-card-heading p strong { color: var(--text-primary); font-weight: var(--font-weight-medium); }
.report-lot-status { flex: 0 0 auto; padding: 5px 8px; border-radius: 999px; background: var(--surface-muted); color: var(--text-secondary); font-size: 9px; font-weight: var(--font-weight-semibold); }
.report-lot-status--paid { background: var(--status-success-bg); color: var(--poliland-green); }
.report-lot-status--ongoing { background: var(--surface-muted); color: var(--text-secondary); }
.report-lot-status--cancelled { background: color-mix(in srgb, var(--status-danger) 10%, white); color: var(--status-danger); }
.report-lot-metrics { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 6px; margin: 13px 0; padding: 12px 8px; border-radius: var(--radius-control); background: var(--surface-muted); }
.report-lot-metrics > div { min-width: 0; text-align: center; }
.report-lot-metrics span { display: block; color: var(--text-secondary); font-size: 9px; }
.report-lot-metrics strong { display: block; margin-top: 4px; color: var(--text-primary); font-size: 11px; overflow-wrap: anywhere; }
.report-lot-progress-label { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; color: var(--text-secondary); font-size: 10px; }
.report-lot-progress-label > strong { color: var(--text-primary); font-size: 10px; text-align: right; }
.report-lot-progress-label small { color: var(--text-secondary); font-weight: var(--font-weight-regular); }
.report-progress-track { height: 7px; overflow: hidden; margin-top: 7px; border-radius: 999px; background: var(--border-default); }
.report-progress-track > span { display: block; height: 100%; border-radius: inherit; background: var(--poliland-gold); }
.report-lot-status--paid ~ .report-progress-track > span { background: var(--poliland-green); }
.report-detail-button { display: flex; width: 100%; min-height: 42px; align-items: center; justify-content: center; gap: 6px; margin-top: 12px; border: 0; border-radius: var(--radius-control); background: var(--surface-muted); color: var(--text-primary); font: inherit; font-size: 11px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.report-detail-button ion-icon { font-size: 15px; }
.report-buyer-heading { display: flex; align-items: center; gap: 10px; }
.report-buyer-avatar { display: grid; flex: 0 0 40px; width: 40px; height: 40px; place-items: center; border-radius: 50%; background: var(--surface-muted); color: var(--poliland-gold-text-soft); font-size: 12px; font-weight: var(--font-weight-bold); }
.report-buyer-identity { flex: 1; min-width: 0; }
.report-buyer-identity h2 { margin: 0; font-size: 13px; }
.report-buyer-identity p { margin: 3px 0 0; color: var(--text-secondary); font-size: 10px; }
.report-buyer-count { flex: 0 0 auto; padding: 5px 8px; border-radius: 999px; background: var(--status-success-bg); color: var(--poliland-green); font-size: 9px; }
.report-buyer-balance { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; margin-top: 12px; padding: 12px; border-radius: var(--radius-control); background: var(--surface-muted); }
.report-buyer-balance span { display: block; color: var(--text-secondary); font-size: 9px; }
.report-buyer-balance strong { display: block; margin-top: 4px; font-size: 11px; overflow-wrap: anywhere; }
.report-buyer-lots { display: grid; gap: 7px; margin-top: 11px; }
.report-buyer-lots span { display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 10px; }
.report-buyer-lots ion-icon { font-size: 13px; }
.report-buyer-lots small { color: var(--text-secondary); font-size: 9px; }
.report-detail-back { margin: 16px 0; }
.report-detail-back button { display: inline-flex; min-height: 40px; align-items: center; gap: 5px; border: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 12px; cursor: pointer; }
.report-detail-heading { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin: 4px 0 16px; }
.report-detail-heading h1 { margin: 0; font-size: 20px; }
.report-detail-heading p { margin: 3px 0 0; color: var(--text-secondary); font-size: 13px; }
.report-detail-card { display: grid; gap: 13px; margin-bottom: 14px; padding: 15px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.report-lot-identity { display: flex; align-items: center; gap: 12px; }
.report-lot-placeholder { display: grid; flex: 0 0 64px; width: 64px; height: 64px; place-items: center; border-radius: var(--radius-control); background: var(--surface-muted); color: var(--poliland-gold-text); font-size: 27px; }
.report-lot-identity h2 { margin: 0; font-size: 15px; }
.report-lot-identity p { margin: 4px 0 0; color: var(--text-secondary); font-size: 11px; }
.report-contact-row { padding: 11px; border-radius: var(--radius-control); background: var(--surface-muted); }
.report-contact-row span, .report-contact-row small { display: block; color: var(--text-secondary); font-size: 10px; }
.report-contact-row strong { display: block; margin: 3px 0; font-size: 13px; }
.report-detail-section-title { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.report-detail-section-title h2 { margin: 0; font-size: 14px; }
.report-detail-section-title > span { color: var(--text-secondary); font-size: 10px; }
.report-balance-box { padding: 12px; border-radius: var(--radius-control); background: var(--surface-muted); }
.report-balance-top, .report-balance-meta { display: flex; justify-content: space-between; gap: 8px; color: var(--text-secondary); font-size: 10px; }
.report-balance-top span:last-child { color: var(--poliland-green); }
.report-balance-box > strong { display: block; margin: 7px 0 10px; font-size: 22px; letter-spacing: -.03em; }
.report-balance-meta b { color: var(--text-primary); font-weight: var(--font-weight-semibold); }
.report-detail-stats { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 8px; }
.report-detail-stats span { display: block; color: var(--text-secondary); font-size: 10px; }
.report-detail-stats strong { display: block; margin-top: 4px; font-size: 12px; }
.report-installment-info { display: grid; grid-template-columns: 1fr auto; gap: 9px; padding: 12px; border-radius: var(--radius-control); background: var(--surface-muted); color: var(--text-secondary); font-size: 10px; }
.report-installment-info strong { color: var(--text-primary); font-size: 10px; text-align: right; }
.report-detail-history { display: grid; gap: 10px; margin: 20px 0; }
.report-payment-history-card { padding: 13px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.report-payment-history-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.report-payment-status-group { display: grid; justify-items: end; gap: 4px; }
.report-payment-history-top strong, .report-payment-history-top small { display: block; }
.report-payment-history-top strong { color: var(--poliland-gold-text); font-size: 10px; }
.report-payment-history-top small { margin-top: 3px; color: var(--text-secondary); font-size: 9px; }
.report-payment-status { flex: 0 0 auto; padding: 5px 7px; border-radius: 999px; background: var(--surface-muted); font-size: 9px; }
.report-payment-status--confirmed { background: var(--status-success-bg); color: var(--poliland-green); }
.report-payment-status--pending { background: var(--poliland-gold-soft); color: var(--poliland-gold-text-soft); }
.report-payment-status--rejected { background: color-mix(in srgb, var(--status-danger) 10%, white); color: var(--status-danger); }
.report-payment-status--refunded { background: color-mix(in srgb, var(--poliland-gold) 16%, var(--surface-primary)); color: var(--poliland-gold-text); }
.report-payment-history-amount { margin: 10px 0 6px; font-size: 20px; font-weight: var(--font-weight-bold); }
.report-payment-history-meta span:first-child { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.report-payment-history-meta span:last-child { flex: 0 0 auto; }
.report-payment-history-meta { display: flex; justify-content: space-between; gap: 8px; padding-bottom: 9px; border-bottom: 1px solid var(--border-default); color: var(--text-secondary); font-size: 10px; }
.report-payment-history-card p { margin: 9px 0 0; color: var(--text-secondary); font-size: 10px; }
.report-detail-back button:focus-visible, .report-detail-button:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
@media (max-width: 600px) {
  .report-toolbar { justify-content: space-between; }
  .report-toolbar .export-button { width: auto; }
  .report-lot-metrics strong { font-size: 10px; }
  .report-recent-card { align-items: flex-start; }
  .report-recent-amount strong { font-size: 10px; }
}
@media (max-width: 360px) {
  .report-income-sources { gap: 6px; }
  .report-income-sources > div { padding: 9px; }
  .report-income-sources strong { font-size: 12px; }
  .report-lot-metrics { padding-inline: 5px; }
}
.payment-plans-page { padding-top: 30px; }
.payment-plans-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin: 14px 2px 14px; }
.payment-plans-heading h1 { margin: 0; color: var(--text-primary); font-size: 18px; font-weight: var(--font-weight-bold); letter-spacing: -.02em; }
.payment-plans-description { max-width: 460px; margin: 5px 0 0; color: var(--text-secondary); font-size: 11px; line-height: 1.45; }
.payment-plans-count { flex: 0 0 auto; padding: 5px 8px; border-radius: 999px; background: var(--surface-muted); color: var(--text-secondary); font-size: 10px; }
.payment-plan-list { display: grid; gap: 9px; }
.payment-plan-card { display: grid; gap: 15px; padding: 14px 12px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); box-shadow: 0 2px 8px rgb(35 35 35 / 3%); }
.payment-plan-card-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.payment-plan-tenor { display: flex; align-items: center; gap: 8px; min-width: 0; }
.payment-plan-calendar { display: none; }
.payment-plan-tenor h2 { margin: 0; color: var(--text-primary); font-size: 14px; font-weight: var(--font-weight-semibold); }
.payment-plan-months { color: var(--text-secondary); font-size: 10px; }
.payment-plan-card-bottom { display: grid; grid-template-columns: minmax(0, 1fr) auto auto; align-items: center; gap: 10px; }
.payment-plan-margin { display: flex; min-height: 30px; align-items: center; justify-content: center; padding: 4px 12px; border-radius: var(--radius-control); background: var(--poliland-gold-soft); color: var(--poliland-gold-text); font-size: 14px; font-weight: var(--font-weight-bold); }
.payment-plan-actions { display: flex; align-items: center; gap: 6px; }
.payment-plan-usage { color: var(--text-secondary); font-size: var(--font-size-xs); white-space: nowrap; }
.payment-plan-action { --padding-start: 0; --padding-end: 0; --padding-top: 0; --padding-bottom: 0; --border-radius: var(--radius-control); display: grid; width: 44px; height: 44px; min-height: 44px; place-items: center; margin: 0; font-size: 19px; }
.payment-plan-add-button{ width: 100%; min-height: 48px; margin-top: 14px; }
.payment-plan-add-button ion-icon { font-size: 19px; }
.payment-plan-form { display: grid; gap: 16px; }
.payment-plan-form .instruction-field { margin: 0; }
.payment-plan-delete-content { display: grid; justify-items: center; gap: 10px; padding: 6px 0 10px; text-align: center; }
.payment-plan-delete-icon { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 50%; background: color-mix(in srgb, var(--status-danger) 9%, white); color: var(--status-danger); font-size: 22px; }
.payment-plan-delete-content p { margin: 0; color: var(--text-primary); font-size: 13px; line-height: 1.5; }
.payment-plan-delete-content small { color: var(--text-secondary); font-size: 10px; line-height: 1.5; }
@media (max-width: 600px) {
  .payment-plans-page { padding-top: 28px; }
  .payment-plans-heading { align-items: flex-start; }
  .payment-plan-card { min-height: 106px; }
  .proof-refund-details { grid-template-columns: 1fr; }
}
@media (min-width: 601px) {
  .payment-plan-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

/* Detail transaksi, review bukti, dan input pembayaran. */
.payment-flow-page { display: grid; gap: 14px; padding: 8px 0 28px; }
.report-back-link { display: inline-flex; width: fit-content; min-height: 40px; align-items: center; gap: 5px; padding: 0; border: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 12px; cursor: pointer; }
.report-back-link ion-icon { font-size: 17px; }
.proof-status-banner { display: flex; align-items: center; gap: 10px; min-height: 58px; padding: 12px; border-radius: var(--radius-card); background: var(--status-success-bg); color: var(--poliland-green); }
.proof-status-banner--pending, .proof-status-banner--needs-reupload { background: var(--poliland-gold-soft); color: var(--poliland-gold-text); }
.proof-status-banner--rejected { background: color-mix(in srgb, var(--status-danger) 10%, white); color: var(--status-danger); }
.proof-status-icon { display: grid; flex: 0 0 36px; width: 36px; height: 36px; place-items: center; border-radius: 50%; background: color-mix(in srgb, currentColor 14%, white); font-size: 20px; }
.proof-status-banner strong { flex: 1; font-size: 13px; }
.proof-status-banner time { padding: 6px 9px; border-radius: 999px; background: var(--surface-primary); color: var(--text-secondary); font-size: 10px; white-space: nowrap; }
.proof-info-card, .proof-total-card, .proof-file-card, .payment-step-card { overflow: hidden; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); box-shadow: 0 2px 8px rgb(35 35 35 / 3%); }
.proof-info-card { padding: 15px; }
.proof-card-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 16px; }
.proof-card-heading h1, .proof-file-card h2 { display: flex; align-items: center; gap: 7px; margin: 0; font-size: 14px; }
.proof-card-heading h1 ion-icon, .proof-file-card h2 ion-icon { color: var(--poliland-gold-text); font-size: 19px; }
.proof-reference { display: inline-flex; max-width: 58%; align-items: center; gap: 5px; padding: 6px 8px; overflow: hidden; border: 0; border-radius: 999px; background: var(--surface-muted); color: var(--text-secondary); font: inherit; font-size: 10px; text-overflow: ellipsis; white-space: nowrap; cursor: pointer; }
.proof-info-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 17px 12px; }
.proof-info-grid > div { min-width: 0; }
.proof-info-grid span, .proof-info-grid small { display: block; color: var(--text-secondary); font-size: 10px; }
.proof-info-grid strong { display: block; margin: 3px 0; color: var(--text-primary); font-size: 13px; overflow-wrap: anywhere; }
.proof-total-card { display: grid; gap: 7px; padding: 16px; }
.proof-eyebrow { color: var(--text-secondary); font-size: 10px; letter-spacing: .03em; }
.proof-total-card > strong { color: var(--poliland-gold-text); font-size: clamp(24px, 7vw, 30px); letter-spacing: -.04em; }
.proof-total-card > p { margin: 0 0 5px; color: var(--text-secondary); font-size: 11px; }
.proof-allocation-list { display: grid; gap: 0; padding: 7px 10px; border-radius: var(--radius-control); background: var(--surface-muted); }
.proof-allocation-list > div { display: flex; justify-content: space-between; gap: 10px; padding: 7px 0; color: var(--text-secondary); font-size: 11px; }
.proof-allocation-list strong { color: var(--text-primary); white-space: nowrap; }
.proof-file-card { display: grid; gap: 13px; padding: 15px; }
.proof-preview { display: grid; min-height: 190px; justify-items: center; align-content: center; gap: 10px; padding: 12px; border: 0; border-radius: var(--radius-control); background: var(--surface-muted); cursor: zoom-in; }
.proof-preview img { display: block; max-width: 100%; max-height: 280px; object-fit: contain; border-radius: 5px; }
.proof-preview small { display: flex; align-items: center; gap: 5px; color: var(--text-secondary); font-size: 10px; }
.proof-pdf-preview { display: grid; justify-items: center; gap: 8px; color: var(--poliland-gold-text); font-size: 14px; }
.proof-pdf-preview ion-icon { font-size: 46px; }
.proof-no-file { padding: 14px; border-radius: var(--radius-control); background: var(--surface-muted); color: var(--text-secondary); font-size: 11px; text-align: center; }
.proof-download { display: flex; width: 100%; border: 0; font-family: inherit; cursor: pointer; min-height: 44px; align-items: center; justify-content: center; gap: 8px; border-radius: var(--radius-control); background: var(--status-success-bg); color: var(--poliland-green); font-size: 12px; font-weight: var(--font-weight-semibold); text-decoration: none; }
.proof-review-actions { display: grid; gap: 8px; }
.proof-verify-button, .proof-reject-button, .proof-reupload-button, .payment-save-button, .payment-cancel-button, .report-add-payment-button { display: flex; min-height: 46px; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: var(--radius-control); font: inherit; font-size: 12px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.proof-verify-button, .payment-save-button, .report-add-payment-button { background: var(--poliland-gold); color: var(--text-primary); }
.proof-spk-cta { display: grid; grid-template-columns: auto minmax(0, 1fr); gap: 12px; align-items: center; padding: 14px; border: 1px solid color-mix(in srgb, var(--poliland-green) 22%, white); border-radius: var(--radius-card); background: var(--status-success-bg); }
.proof-spk-cta-icon { display: grid; width: 40px; height: 40px; place-items: center; border-radius: 12px; background: var(--poliland-green); color: #fff; font-size: 22px; }
.proof-spk-cta-text { min-width: 0; }
.proof-spk-cta-text strong { display: block; font-size: 13px; line-height: 1.35; overflow-wrap: anywhere; }
.proof-spk-cta-text p { margin: 3px 0 0; color: var(--text-secondary); font-size: 12px; line-height: 1.45; }
.proof-spk-cta-button { display: flex; grid-column: 1 / -1; min-height: 48px; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: var(--radius-control); background: var(--poliland-green); color: #fff; font: inherit; font-size: 13px; font-weight: var(--font-weight-semibold); cursor: pointer; touch-action: manipulation; -webkit-tap-highlight-color: transparent; transition: transform var(--dur-fast, 120ms) var(--ease-out, ease-out); }
.proof-spk-cta-button:active { transform: scale(0.97); }
.proof-review-secondary { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.proof-reject-button { border: 1px solid color-mix(in srgb, var(--status-danger) 25%, white); background: color-mix(in srgb, var(--status-danger) 7%, white); color: var(--status-danger); }
.proof-reupload-button { border: 1px solid var(--border-default); background: var(--surface-primary); color: var(--text-secondary); }
 .payment-cancel-button { background: var(--surface-muted); color: var(--text-primary); }
.proof-review-note { padding: 13px; border-radius: var(--radius-control); background: var(--surface-muted); font-size: 12px; }
.proof-review-note p { margin: 5px 0 0; color: var(--text-secondary); line-height: 1.5; }
.proof-refund-section { display: grid; gap: 12px; padding: 16px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.proof-refund-heading { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.proof-refund-heading div { display: grid; gap: 3px; }
.proof-refund-heading span, .proof-refund-details dt { color: var(--text-secondary); font-size: 11px; }
.proof-refund-heading strong { font-size: 14px; }
.refund-status-badge { min-height: 28px; padding: 6px 9px; border-radius: var(--radius-control); background: var(--poliland-gold-soft); color: var(--poliland-gold-text); font-size: 10px; font-weight: var(--font-weight-semibold); }
.refund-status-badge--done { background: var(--status-success-bg); color: var(--poliland-green); }
.proof-refund-details { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 0; }
.proof-refund-details div { display: grid; gap: 3px; padding: 10px; border-radius: var(--radius-control); background: var(--surface-muted); }
.proof-refund-details dd { margin: 0; overflow-wrap: anywhere; font-size: 11px; font-weight: var(--font-weight-semibold); }
.refund-field { display: grid; gap: 6px; color: var(--text-primary); font-size: 11px; font-weight: var(--font-weight-semibold); }
.refund-field input, .refund-field textarea { width: 100%; min-height: 44px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-muted); color: var(--text-primary); font: inherit; padding: 10px 12px; }
.refund-field:focus-within { color: var(--text-primary); }
.refund-field input:focus-visible, .refund-field textarea:focus-visible { outline: 3px solid color-mix(in srgb, var(--poliland-green) 35%, transparent); outline-offset: 2px; }
.refund-field textarea { resize: vertical; }
.refund-upload { display: grid; gap: 6px; min-height: 44px; padding: 10px 12px; border: 1px dashed var(--border-default); border-radius: var(--radius-control); font-size: 11px; }
.refund-upload input { min-height: 44px; font-size: 10px; }
.refund-upload span { color: var(--text-secondary); }

.proof-refund-submit { min-height: 46px; border: 0; border-radius: var(--radius-control); background: var(--poliland-green); color: #fff; font: inherit; font-size: 12px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.proof-refund-submit:disabled { opacity: .55; cursor: not-allowed; }
.payment-review-dialog { display: grid; gap: 9px; }
.payment-review-dialog p { margin: 0 0 5px; color: var(--text-secondary); font-size: 12px; line-height: 1.5; }
.payment-review-dialog label { font-size: 11px; font-weight: var(--font-weight-semibold); }
.payment-review-dialog textarea { width: 100%; min-height: 90px; padding: 11px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 12px; resize: vertical; }
.payment-step-card > header { display: flex; align-items: center; gap: 10px; padding: 12px 14px; background: var(--surface-muted); }
.payment-step-card > header > span { display: grid; flex: 0 0 30px; width: 30px; height: 30px; place-items: center; border-radius: 50%; background: var(--poliland-gold-soft); color: var(--poliland-gold-text); font-size: 12px; font-weight: var(--font-weight-bold); }
.payment-step-card > header strong, .payment-step-card > header small { display: block; }
.payment-step-card > header strong { font-size: 13px; }
.payment-step-card > header small { margin-top: 3px; color: var(--text-secondary); font-size: 10px; }
.payment-step-body { display: grid; gap: 12px; padding: 14px; }
.payment-step-body > label:not(.payment-schedule-option):not(.payment-proof-upload) { color: var(--text-secondary); font-size: 10px; }
.payment-identity-row { display: flex; align-items: center; gap: 10px; padding: 11px; border-radius: var(--radius-control); background: var(--surface-muted); }
.payment-identity-icon { display: grid; flex: 0 0 38px; width: 38px; height: 38px; place-items: center; border-radius: 50%; background: var(--poliland-gold-soft); color: var(--poliland-gold-text); font-size: 18px; }
.payment-identity-icon--lot { background: var(--status-success-bg); color: var(--poliland-green); }
.payment-identity-row > div { min-width: 0; }
.payment-identity-row strong, .payment-identity-row small { display: block; }
.payment-identity-row strong { font-size: 12px; }
.payment-identity-row small { margin-top: 3px; color: var(--text-secondary); font-size: 10px; }
.payment-price-summary { display: grid; gap: 8px; padding: 12px; border-radius: var(--radius-control); background: var(--surface-muted); }
.payment-price-summary span { display: flex; justify-content: space-between; gap: 10px; color: var(--text-secondary); font-size: 11px; }
.payment-price-summary strong { color: var(--text-primary); text-align: right; }
.payment-price-summary span:last-child strong { color: var(--status-danger); }
.payment-schedule-option { display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; align-items: center; gap: 8px; min-height: 62px; padding: 10px; border-radius: var(--radius-control); background: var(--surface-muted); cursor: pointer; }
.payment-schedule-option input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.payment-schedule-check { display: grid; width: 19px; height: 19px; place-items: center; border: 1px solid var(--border-default); border-radius: 4px; background: var(--surface-primary); }
.payment-schedule-option input:checked + .payment-schedule-check { border-color: var(--poliland-gold); background: var(--poliland-gold); }
.payment-bank-target { display: grid; gap: 2px; margin-top: 8px; padding: 10px 12px; border-radius: var(--radius-control); background: var(--surface-muted); }
.payment-bank-target span, .payment-bank-target small { color: var(--text-secondary); font-size: 11px; }
.payment-bank-target strong { color: var(--text-primary); font-size: 16px; letter-spacing: 0.02em; overflow-wrap: anywhere; user-select: all; }
.payment-schedule-option--locked { cursor: not-allowed; opacity: 0.6; }
.payment-schedule-option input:focus-visible + .payment-schedule-check { outline: 2px solid var(--poliland-green); outline-offset: 2px; }
.payment-schedule-option input:checked + .payment-schedule-check::after { width: 8px; height: 5px; border-bottom: 2px solid var(--ink); border-left: 2px solid var(--ink); content: ""; transform: rotate(-45deg) translateY(-1px); }
.payment-schedule-copy { min-width: 0; }
.payment-schedule-copy strong, .payment-schedule-copy small { display: block; }
.payment-schedule-copy strong { font-size: 11px; }
.payment-schedule-copy small { margin-top: 3px; color: var(--text-secondary); font-size: 10px; }
.payment-schedule-status { grid-column: 2; justify-self: start; margin-top: -4px; padding: 3px 6px; border-radius: 6px; background: var(--surface-primary); color: var(--text-secondary); font-size: 9px; }
.payment-schedule-status--overdue { background: color-mix(in srgb, var(--status-danger) 10%, white); color: var(--status-danger); }
.payment-schedule-amount { grid-column: 3; grid-row: 1 / span 2; font-size: 11px; white-space: nowrap; }
.payment-total-summary { display: grid; gap: 7px; margin-top: 5px; padding: 14px; border-radius: var(--radius-card); background: var(--poliland-gold-soft); color: var(--poliland-gold-text); }
.payment-total-summary > span { font-size: 10px; }
.payment-total-summary > strong { font-size: 12px; }
.payment-total-summary > div { display: flex; align-items: center; justify-content: space-between; gap: 10px; margin-top: 5px; }
.payment-total-summary > div span { font-size: 12px; font-weight: var(--font-weight-semibold); }
.payment-total-summary > div strong { font-size: clamp(17px, 5vw, 23px); text-align: right; overflow-wrap: anywhere; }
.payment-proof-field { position: relative; }
.payment-proof-remove { position: absolute; top: 50%; right: 8px; display: grid; width: 34px; height: 34px; place-items: center; transform: translateY(-50%); border: 0; border-radius: 8px; background: var(--surface-primary); color: var(--text-secondary); font-size: 19px; cursor: pointer; }
.payment-proof-upload { display: flex; min-height: 74px; align-items: center; gap: 10px; padding: 10px; border-radius: var(--radius-control); background: var(--surface-muted); cursor: pointer; }
.payment-proof-upload { padding-right: 48px; }
.payment-proof-upload input { position: absolute; width: 1px; height: 1px; opacity: 0; }
.payment-proof-upload > img { width: 48px; height: 48px; flex: 0 0 48px; border-radius: 8px; object-fit: cover; }
.payment-upload-icon { display: grid; width: 42px; height: 42px; flex: 0 0 42px; place-items: center; border-radius: 8px; background: var(--poliland-gold-soft); color: var(--poliland-gold-text); font-size: 20px; }
.payment-proof-upload > span:nth-of-type(2) { flex: 1; min-width: 0; }
.payment-proof-upload strong, .payment-proof-upload small { display: block; overflow-wrap: anywhere; }
.payment-proof-upload strong { font-size: 11px; }
.payment-proof-upload small { margin-top: 3px; color: var(--text-secondary); font-size: 9px; }
.payment-proof-upload button { display: grid; width: 34px; height: 34px; flex: 0 0 34px; place-items: center; border: 0; background: transparent; color: var(--text-secondary); font-size: 19px; cursor: pointer; }
.payment-save-button { width: 100%; min-height: 49px; box-shadow: 0 3px 8px rgb(35 35 35 / 10%); }
.payment-save-button:disabled, .proof-review-actions button:disabled { opacity: .55; cursor: not-allowed; }
.payment-cancel-button { width: 100%; }
.installment-detail-row { display: grid; grid-template-columns: 32px minmax(0, 1fr) auto; align-items: center; gap: 9px; padding: 11px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); }
.installment-detail-number { display: grid; width: 30px; height: 30px; place-items: center; border-radius: 50%; background: var(--status-success-bg); color: var(--poliland-green); font-size: 11px; font-weight: var(--font-weight-semibold); }
.installment-detail-row > div:nth-child(2) strong, .installment-detail-row > div:nth-child(2) small { display: block; }
.installment-detail-row > div:nth-child(2) strong { font-size: 11px; }
.installment-detail-row > div:nth-child(2) small { margin-top: 3px; color: var(--text-secondary); font-size: 10px; }
.installment-detail-amount { display: grid; justify-items: end; gap: 4px; }
.installment-detail-amount > strong { font-size: 11px; white-space: nowrap; }
.installment-status { padding: 3px 6px; border-radius: 999px; background: var(--surface-muted); color: var(--text-secondary); font-size: 9px; }
.installment-status--paid { background: var(--status-success-bg); color: var(--poliland-green); }
.installment-status--overdue { background: color-mix(in srgb, var(--status-danger) 10%, white); color: var(--status-danger); }
.installment-status--pending { background: var(--surface-muted); color: var(--text-secondary); }
.report-contact-row { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.report-contact-action { display: inline-flex; min-height: 36px; align-items: center; gap: 5px; padding: 0 9px; border-radius: 9px; background: var(--surface-primary); color: var(--text-primary); font-size: 10px; text-decoration: none; white-space: nowrap; }
.report-proof-link { display: inline-flex; min-height: 34px; align-items: center; gap: 6px; margin-top: 10px; padding: 0; border: 0; background: transparent; color: var(--poliland-gold-text); font: inherit; font-size: 10px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.report-add-payment-button { width: min(100%, 280px); min-height: 48px; margin: 24px auto 8px; border-radius: 999px; box-shadow: 0 4px 10px rgb(35 35 35 / 10%); }
@media (max-width: 360px) {
  .proof-info-grid { gap: 13px 8px; }
  .proof-card-heading { align-items: flex-start; flex-direction: column; }
  .proof-reference { max-width: 100%; }
  .payment-schedule-option { grid-template-columns: 18px minmax(0, 1fr) auto; gap: 6px; padding: 8px; }
  .payment-schedule-amount { font-size: 10px; }
}

.finance-skeleton { display: grid; gap: 12px; }

/* Navigasi keuangan: 3 area + sub-bagian */
.finance-nav { position: sticky; top: 0; z-index: 5; display: grid; gap: 8px; margin: 0 -16px 14px; padding: 10px 16px; background: color-mix(in srgb, var(--pl-paper, #f9f5ec) 94%, transparent); border-bottom: 1px solid var(--border-default); }
.finance-areas { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 4px; padding: 4px; border-radius: var(--radius-control); background: var(--surface-muted); }
.finance-area { position: relative; display: flex; flex-direction: column; min-width: 0; min-height: 56px; align-items: center; justify-content: center; gap: 2px; padding: 4px 4px; border: 0; border-radius: calc(var(--radius-control) - 2px); background: transparent; color: var(--text-secondary); font: inherit; font-size: 12px; font-weight: var(--font-weight-semibold); touch-action: manipulation; -webkit-tap-highlight-color: transparent; cursor: pointer; transition: transform 120ms var(--ease-spring, ease), background-color 160ms var(--ease-out, ease); }
.finance-area ion-icon { flex: 0 0 auto; font-size: 17px; }
.finance-area span { min-width: 0; font-size: 12px; line-height: 1.2; text-align: center; }
.finance-area:active { transform: scale(0.97); }
.finance-area--active { background: var(--surface-primary); color: var(--text-primary); box-shadow: 0 1px 4px rgb(35 35 35 / 12%); }
.finance-area:focus-visible, .finance-subnav button:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.finance-area__badge { position: absolute; top: 4px; right: 6px; display: grid; min-width: 20px; height: 20px; place-items: center; padding: 0 5px; border-radius: 999px; background: var(--poliland-gold); color: var(--text-primary); font-size: 11px; font-weight: var(--font-weight-bold); }
.finance-subnav { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(0, 1fr); gap: 6px; }
.finance-subnav::-webkit-scrollbar { display: none; }
.finance-subnav button { min-width: 0; min-height: 44px; padding: 4px 6px; line-height: 1.2; text-align: center; border: 1px solid var(--border-default); border-radius: 999px; background: var(--surface-primary); color: var(--text-secondary); font: inherit; font-size: 12px; font-weight: var(--font-weight-semibold); touch-action: manipulation; -webkit-tap-highlight-color: transparent; cursor: pointer; transition: transform 120ms var(--ease-spring, ease); }
.finance-subnav button:active { transform: scale(0.97); }
.finance-subnav button.is-active { border-color: var(--poliland-gold); background: var(--poliland-gold-soft); color: var(--text-primary); }
.finance-attention { margin: 0; color: var(--text-primary); font-size: 12px; line-height: 1.45; }
.finance-attention--clear { color: var(--text-secondary); }
.report-breakdown { margin-top: 12px; border-top: 1px solid var(--border-default); }
.report-breakdown summary { display: flex; min-height: 44px; align-items: center; color: var(--poliland-gold-text); font-size: 12px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.report-breakdown ul { display: grid; gap: 8px; margin: 0; padding: 0 0 4px; list-style: none; }
.report-breakdown li { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 2px 10px; padding: 10px; border-radius: var(--radius-control); background: var(--surface-muted); font-size: 12px; }
.report-breakdown li strong { grid-column: 1 / -1; }
.report-breakdown li span { color: var(--text-secondary); }
.payment-plan-add-button { position: sticky; bottom: calc(76px + env(safe-area-inset-bottom)); z-index: 4; box-shadow: 0 6px 16px rgb(35 35 35 / 14%); }
@media (min-width: 700px) { .finance-nav { margin-inline: 0; padding-inline: 0; } }
@media (prefers-reduced-motion: reduce) { .finance-area, .finance-subnav button { transition: none; } }

/* Angka, pemasukan, pengeluaran, sisa tagihan */
.finance-shell { font-variant-numeric: tabular-nums; }
.amount--in { color: #1B6B3A; }
.amount--out { color: #B42318; }
.report-lot-metrics { grid-template-columns: 1fr; gap: 8px; padding: 12px; }
.report-lot-metrics > div { display: flex; align-items: baseline; justify-content: space-between; gap: 10px; text-align: left; }
.report-lot-metrics span { display: inline; font-size: 12px; }
.report-lot-metrics strong { margin: 0; font-size: 14px; text-align: right; white-space: nowrap; }
.report-buyer-balance strong { white-space: nowrap; }
.report-lot-card, .report-buyer-card { position: relative; }
.report-buyer-open::after { position: absolute; inset: 0; border-radius: inherit; content: ''; }
.report-buyer-open { position: static; }
.report-paid-note { margin: 18px 0 8px; padding: 12px; border-radius: var(--radius-control); background: var(--surface-muted); color: var(--text-primary); font-size: 12px; text-align: center; }
/* Catat pembayaran */
.finance-fab { position: sticky; bottom: calc(76px + env(safe-area-inset-bottom)); z-index: 4; display: flex; width: min(100%, 320px); min-height: 52px; align-items: center; justify-content: center; gap: 8px; margin: 18px auto 0; border: 0; border-radius: 999px; background: var(--poliland-gold); color: var(--text-primary); font: inherit; font-size: 13px; font-weight: var(--font-weight-semibold); box-shadow: 0 6px 16px rgb(35 35 35 / 16%); touch-action: manipulation; -webkit-tap-highlight-color: transparent; cursor: pointer; transition: transform 120ms var(--ease-spring, ease); }
.finance-fab ion-icon { font-size: 20px; }
.finance-fab:active { transform: scale(0.97); }
.finance-fab:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 3px; }
.payment-picker { display: grid; gap: 12px; }
.payment-picker__list { display: grid; gap: 8px; margin: 0; padding: 0; list-style: none; }
.payment-picker__list button { display: flex; width: 100%; min-height: 56px; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; text-align: left; touch-action: manipulation; cursor: pointer; }
.payment-picker__list button:active { background: var(--surface-muted); }
.payment-picker__list button:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.payment-picker__name, .payment-picker__due { display: grid; min-width: 0; gap: 2px; }
.payment-picker__due { text-align: right; }
.payment-picker__name small, .payment-picker__due small { color: var(--text-secondary); font-size: 11px; }
.payment-picker__name strong, .payment-picker__due strong { font-size: 13px; }
.payment-picker__empty { margin: 8px 0; color: var(--text-secondary); font-size: 12px; text-align: center; }
/* Pesan kesalahan formulir */
.field-error { display: block; margin-top: 6px; color: #B42318; font-size: 12px; font-weight: var(--font-weight-semibold); line-height: 1.4; }
.field-hint { display: block; margin-top: 6px; color: var(--text-secondary); font-size: 12px; }
.instruction-field--error input, .instruction-field--error select { border-color: #B42318; }
/* Rincian pembeli */
.buyer-detail-actions { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 12px; }
.buyer-detail-actions .report-contact-action { min-height: 44px; }
.finance-figures { display: grid; gap: 0; margin: 0; }
.finance-figures > div { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-default); }
.finance-figures dt { color: var(--text-secondary); font-size: 12px; }
.finance-figures dd { margin: 0; color: var(--text-primary); font-size: 14px; font-weight: var(--font-weight-semibold); text-align: right; }
.finance-figures__total { border-bottom: 0 !important; }
.finance-figures__total dt { color: var(--text-primary); font-weight: var(--font-weight-semibold); }
.finance-figures__total dd { font-size: 17px; }
.buyer-lot-row { display: flex; width: 100%; min-height: 56px; align-items: center; gap: 12px; margin-top: 8px; padding: 10px 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; text-align: left; touch-action: manipulation; cursor: pointer; }
.buyer-lot-row:active { background: var(--surface-muted); }
.buyer-lot-row:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.buyer-lot-row__name, .buyer-lot-row__money { display: grid; min-width: 0; gap: 2px; }
.buyer-lot-row__name { flex: 1; }
.buyer-lot-row__money { text-align: right; }
.buyer-lot-row small { color: var(--text-secondary); font-size: 11px; }
.buyer-lot-row strong { font-size: 13px; }
/* Buku kas */
.ledger-totals { grid-template-columns: 1fr; gap: 0; margin: 0; padding: 4px 14px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.ledger-totals > div { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; padding: 10px 0; border-bottom: 1px solid var(--border-default); }
.ledger-totals dt { color: var(--text-secondary); font-size: 12px; }
.ledger-totals dd { margin: 0; font-size: 15px; font-weight: var(--font-weight-semibold); text-align: right; }
.ledger-totals__net { border-bottom: 0 !important; }
.ledger-totals__net dt { color: var(--text-primary); font-weight: var(--font-weight-semibold); }
.ledger-count { margin: 0; color: var(--text-secondary); font-size: 12px; }
.ledger-list { display: grid; gap: 10px; margin: 0; padding: 0; list-style: none; }
.ledger-item { min-width: 0; padding: 14px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.ledger-item__top { display: flex; align-items: flex-start; justify-content: space-between; gap: 12px; }
.ledger-item__title { display: grid; min-width: 0; gap: 3px; }
.ledger-item__title strong { font-size: 14px; }
.ledger-item__title small { color: var(--text-secondary); font-size: 12px; }
.ledger-item__amount { flex: 0 0 auto; font-size: 14px; white-space: nowrap; }
.ledger-item__ref { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 4px 10px; margin: 10px 0 0; color: var(--text-primary); font-size: 12px; overflow-wrap: anywhere; }
.ledger-item__ref span { color: var(--text-secondary); }
.ledger-journal { margin-top: 8px; border-top: 1px solid var(--border-default); }
.ledger-journal summary { display: flex; min-height: 44px; align-items: center; color: var(--poliland-gold-text); font-size: 12px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.ledger-journal ul { display: grid; gap: 8px; margin: 0; padding: 0 0 4px; list-style: none; }
.ledger-journal li { display: grid; grid-template-columns: 1fr 1fr; gap: 2px 10px; padding: 10px; border-radius: var(--radius-control); background: var(--surface-muted); font-size: 12px; }
.ledger-journal li strong { grid-column: 1 / -1; overflow-wrap: anywhere; }
.ledger-journal li span { color: var(--text-secondary); }
</style>
