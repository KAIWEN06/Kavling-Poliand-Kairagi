<template>
  <ion-page class="admin-finance-page">
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />

    <ion-content :fullscreen="true">
      <main class="finance-shell">
        <nav v-if="paymentPage === 'none'" class="finance-shortcuts" aria-label="Menu keuangan">
          <button
            type="button"
            class="shortcut-card"
            :class="{ 'shortcut-card--active': activeView === 'verification' }"
            :aria-current="activeView === 'verification' ? 'page' : undefined"
            @click="activeView = 'verification'"
          >
            <span class="shortcut-icon"><ion-icon :icon="documentTextOutline" aria-hidden="true" /></span>
            <strong>Verifikasi<br />Pembayaran</strong>
            <span v-if="statusCounts.pending" class="shortcut-count">{{ statusCounts.pending }}</span>
          </button>
          <button
            type="button"
            class="shortcut-card"
            :class="{ 'shortcut-card--active': activeView === 'instructions' }"
            :aria-current="activeView === 'instructions' ? 'page' : undefined"
            @click="activeView = 'instructions'"
          >
            <span class="shortcut-icon"><ion-icon :icon="businessOutline" aria-hidden="true" /></span>
            <strong>Instruksi<br />Pembayaran</strong>
          </button>
          <button
            type="button"
            class="shortcut-card"
            :class="{ 'shortcut-card--active': activeView === 'reports' }"
            :aria-current="activeView === 'reports' ? 'page' : undefined"
            @click="activeView = 'reports'"
          >
            <span class="shortcut-icon"><ion-icon :icon="pieChartOutline" aria-hidden="true" /></span>
            <strong>Laporan<br />Keuangan</strong>
          </button>
          <button
            type="button"
            class="shortcut-card"
            :class="{ 'shortcut-card--active': activeView === 'plans' }"
            :aria-current="activeView === 'plans' ? 'page' : undefined"
            @click="activeView = 'plans'"
          >
            <span class="shortcut-icon"><ion-icon :icon="calendarOutline" aria-hidden="true" /></span>
            <strong>Skema<br />Cicilan</strong>
          </button>
        </nav>

        <template v-if="paymentPage === 'proof'">
          <section class="payment-flow-page">
            <button type="button" class="report-back-link" @click="closePaymentPage">
              <ion-icon :icon="chevronBackOutline" aria-hidden="true" /> Kembali
            </button>
            <div v-if="proofLoading" class="finance-state" role="status"><ion-spinner name="crescent" /><p>Memuat bukti pembayaran...</p></div>
            <div v-else-if="proofError" class="finance-state" role="alert">
              <ion-icon :icon="alertCircleOutline" /><strong>Bukti pembayaran tidak dapat dimuat</strong><p>{{ proofError }}</p>
              <AppButton size="small" @click="() => loadSelectedPaymentProof()">Coba lagi</AppButton>
            </div>
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
                  <div><span>Kavling Terdaftar</span><strong>{{ selectedProofPayment.lot?.lot_number || 'Tidak tersedia' }}</strong><small>{{ selectedProofPayment.lot?.blocks?.name || 'Blok belum tersedia' }} · {{ selectedProofPayment.lot?.area ?? '-' }} m²</small></div>
                  <div><span>Metode & Bank</span><strong>{{ selectedProofPayment.payment.payment_method || 'Tidak tersedia' }}</strong><small>Ref: {{ selectedProofPayment.payment.reference_number || 'Tidak dicantumkan' }}</small></div>
                  <div><span>Waktu Transaksi</span><strong>{{ formatShortDate(selectedProofPayment.payment.payment_date || selectedProofPayment.payment.created_at) }}</strong><small>{{ formatTime(selectedProofPayment.payment.created_at) }} WITA</small></div>
                </div>
              </section>
              <section class="proof-total-card">
                <span class="proof-eyebrow">TOTAL DITERIMA</span>
                <strong>{{ formatCurrency(Number(selectedProofPayment.payment.amount || 0)) }}</strong>
                <p>{{ selectedProofPayment.allocations.length ? `Dialokasikan untuk ${selectedProofPayment.allocations.length} bulan cicilan` : selectedProofPayment.payment.payment_category }}</p>
                <div v-if="selectedProofPayment.allocations.length" class="proof-allocation-list">
                  <div v-for="allocation in selectedProofPayment.allocations" :key="allocation.schedule?.id">
                    <span>Cicilan ke-{{ allocation.schedule?.installment_number }} ({{ allocation.schedule ? formatMonthYear(allocation.schedule.due_date) : '-' }})</span>
                    <strong>{{ formatCurrency(allocation.allocated_amount) }}</strong>
                  </div>
                </div>
              </section>
              <section class="proof-file-card">
                <h2><ion-icon :icon="imageOutline" /> Bukti Transfer Fisik</h2>
                <button v-if="proofSignedUrl" type="button" class="proof-preview" @click="proofZoomOpen = true">
                  <img v-if="isImageProof(selectedProofPayment.payment.proof_path)" :src="proofSignedUrl" alt="Bukti transfer pembayaran" />
                  <span v-else class="proof-pdf-preview"><ion-icon :icon="documentTextOutline" /> Dokumen PDF</span>
                  <small><ion-icon :icon="searchOutline" /> Ketuk untuk memperbesar tampilan</small>
                </button>
                <div v-else class="proof-no-file">Bukti transfer tidak dilampirkan pada transaksi ini.</div>
                <a v-if="proofSignedUrl" class="proof-download" :href="proofSignedUrl" target="_blank" rel="noopener noreferrer" :download="`bukti-${paymentReference(selectedProofPayment.payment)}`"><ion-icon :icon="downloadOutline" /> Unduh File</a>
              </section>
              <div v-if="selectedProofPayment.payment.status === 'Pending'" class="proof-review-actions">
                <button type="button" class="proof-verify-button" :disabled="reviewSaving || !selectedProofPayment.payment.proof_path" @click="reviewPayment('Confirmed')">
                  <ion-spinner v-if="reviewSaving && reviewTargetStatus === 'Confirmed'" name="crescent" /><ion-icon v-else :icon="shieldCheckmarkOutline" /> Verifikasi
                </button>
                <div class="proof-review-secondary">
                  <button type="button" class="proof-reject-button" :disabled="reviewSaving" @click="openReviewDialog('Rejected')"><ion-icon :icon="closeCircleOutline" /> Tolak Transaksi</button>
                  <button type="button" class="proof-reupload-button" :disabled="reviewSaving" @click="openReviewDialog('Needs Reupload')"><ion-icon :icon="refreshOutline" /> Minta Upload Ulang</button>
                </div>
              </div>
              <div v-else-if="selectedProofPayment.payment.review_note || selectedProofPayment.payment.note" class="proof-review-note"><strong>Catatan Admin</strong><p>{{ selectedProofPayment.payment.review_note || selectedProofPayment.payment.note }}</p></div>
              <button type="button" class="proof-back-button" @click="closePaymentPage"><ion-icon :icon="chevronBackOutline" /> Kembali</button>
            </template>
          </section>
        </template>

        <template v-else-if="paymentPage === 'add'">
          <section class="payment-flow-page payment-create-page">
            <button type="button" class="report-back-link" @click="closePaymentPage"><ion-icon :icon="chevronBackOutline" /> Kembali ke Detail Keuangan</button>
            <div v-if="!selectedReportLot" class="finance-state" role="alert"><strong>Transaksi tidak ditemukan.</strong><p>Kembali ke laporan dan pilih transaksi yang benar.</p></div>
            <template v-else>
              <section class="payment-step-card">
                <header><span>1</span><div><strong>Identitas Klien & Kavling</strong></div></header>
                <div class="payment-step-body">
                  <label>Nama Pembeli (Calon Pemilik)</label>
                  <div class="payment-identity-row"><span class="payment-identity-icon"><ion-icon :icon="peopleOutline" /></span><div><strong>{{ selectedReportLot.customerName }}</strong><small>{{ selectedReportLot.customerPhone || 'Nomor telepon belum tersedia' }}</small></div></div>
                  <label>Kavling Properti Terkait</label>
                  <div class="payment-identity-row"><span class="payment-identity-icon payment-identity-icon--lot"><ion-icon :icon="businessOutline" /></span><div><strong>{{ selectedReportLot.lotCode }} {{ selectedReportLot.blockName }}</strong><small>{{ selectedReportLot.area ?? '-' }} m²</small></div></div>
                  <div class="payment-price-summary"><span>Total Harga Unit <strong>{{ formatCurrency(selectedReportLot.finalPrice) }}</strong></span><span>Sisa Tagihan <strong>{{ formatCurrency(selectedReportLot.remaining) }}</strong></span><span v-if="selectedReportLot.pendingAmount > 0">Menunggu Verifikasi <strong>{{ formatCurrency(selectedReportLot.pendingAmount) }}</strong></span></div>
                </div>
              </section>
              <section class="payment-step-card">
                <header><span>2</span><div><strong>{{ selectedReportLot.paymentType === 'Installment' ? 'Pilih Bulan Cicilan' : 'Nominal Pembayaran' }}</strong><small>{{ selectedReportLot.paymentType === 'Installment' ? 'Centang bulan tagihan' : 'Masukkan nominal pembayaran yang diterima' }}</small></div></header>
                <div class="payment-step-body">
                  <div v-if="selectedReportLot.paymentType === 'Installment' && schedulesLoading" class="finance-state"><ion-spinner name="crescent" /><p>Memuat jadwal cicilan...</p></div>
                  <div v-else-if="selectedReportLot.paymentType === 'Installment' && schedulesError" class="finance-state" role="alert"><p>{{ schedulesError }}</p><AppButton size="small" @click="loadSchedulesForSelectedLot">Coba lagi</AppButton></div>
                  <template v-else-if="selectedReportLot.paymentType === 'Installment'">
                    <label v-for="schedule in selectableSchedules" :key="schedule.id" class="payment-schedule-option">
                      <input v-model="selectedScheduleIds" type="checkbox" :value="schedule.id" />
                      <span class="payment-schedule-check"></span>
                      <span class="payment-schedule-copy"><strong>Cicilan ke-{{ schedule.installment_number }}</strong><small>{{ formatShortDate(schedule.due_date) }}</small></span>
                      <span class="payment-schedule-status" :class="`payment-schedule-status--${schedule.status.toLowerCase()}`">{{ schedule.pending_payment ? 'Menunggu Verifikasi' : schedule.due_date < todayDate ? 'Jatuh Tempo' : 'Mendatang' }}</span>
                      <strong class="payment-schedule-amount">{{ formatCurrency(schedule.amount) }}</strong>
                    </label>
                    <div v-if="!selectableSchedules.length" class="proof-no-file">Tidak ada cicilan yang dapat dipilih.</div>
                  </template>
                  <div v-else class="instruction-field"><label for="cash-payment-amount">Nominal Pembayaran</label><input id="cash-payment-amount" v-model.number="manualPaymentAmount" type="number" min="1" :max="Math.max(0, selectedReportLot.remaining - selectedReportLot.pendingAmount)" inputmode="numeric" placeholder="Masukkan nominal rupiah" /></div>
                  <div class="payment-total-summary">
                    <span>Jumlah Bulan Dipilih</span>
                    <strong v-if="selectedReportLot.paymentType === 'Installment'">{{ selectedScheduleIds.length }} Bulan{{ selectedScheduleIds.length ? ` (Cicilan ke-${selectedSchedulesLabel})` : '' }}</strong>
                    <strong v-else>Pembayaran tunai</strong>
                    <div><span>Total Pembayaran</span><strong>{{ formatCurrency(newPaymentTotal) }}</strong></div>
                  </div>
                </div>
              </section>
              <section class="payment-step-card">
                <header><span>3</span><div><strong>Unggah Bukti Pembayaran</strong><small>JPG, PNG, WEBP, atau PDF · Maksimal 5 MB</small></div></header>
                <div class="payment-step-body">
                  <div class="instruction-field"><label for="new-payment-method">Metode & Bank</label><select id="new-payment-method" v-model="newPaymentMethod"><option value="">Pilih metode pembayaran</option><option v-for="bank in bankAccounts.filter((item) => item.is_active)" :key="bank.id" :value="`Transfer ${bank.bank_name}`">Transfer {{ bank.bank_name }}</option><option value="Transfer Bank Lain">Transfer Bank Lain</option><option value="Tunai">Tunai</option></select></div>
                  <div class="instruction-field"><label for="new-payment-date">Tanggal Pembayaran</label><input id="new-payment-date" v-model="newPaymentDate" type="date" :max="todayDate" /></div>
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
                  <div class="instruction-field"><label for="new-payment-note">Catatan <span>(Opsional)</span></label><textarea id="new-payment-note" v-model.trim="newPaymentNote" rows="2" maxlength="500" placeholder="Tambahkan catatan pembayaran bila diperlukan." /></div>
                  <p v-if="paymentCreateError" class="bank-form-error" role="alert">{{ paymentCreateError }}</p>
                </div>
              </section>
              <button type="button" class="payment-save-button" :disabled="paymentSaving || !canCreatePayment" @click="saveNewPayment">
                <ion-spinner v-if="paymentSaving" name="crescent" /><ion-icon v-else :icon="saveOutline" /> {{ paymentSaving ? 'Menyimpan...' : 'Simpan Transaksi Pembayaran' }}
              </button>
              <button type="button" class="payment-cancel-button" :disabled="paymentSaving" @click="closePaymentPage">Batal</button>
            </template>
          </section>
        </template>

        <template v-else-if="activeView === 'instructions'">
          <nav class="instruction-tabs" role="tablist" aria-label="Pengaturan instruksi pembayaran">
            <button
              id="bank-accounts-tab"
              type="button"
              role="tab"
              :aria-selected="activeInstructionTab === 'banks'"
              aria-controls="bank-accounts-panel"
              :class="{ 'instruction-tab--active': activeInstructionTab === 'banks' }"
              @click="activeInstructionTab = 'banks'"
            >
              Rekening Bank
            </button>
            <button
              id="payment-instruction-tab"
              type="button"
              role="tab"
              :aria-selected="activeInstructionTab === 'instruction'"
              aria-controls="payment-instruction-panel"
              :class="{ 'instruction-tab--active': activeInstructionTab === 'instruction' }"
              @click="activeInstructionTab = 'instruction'"
            >
              Pengaturan Instruksi
            </button>
          </nav>

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
                <p>Hanya rekening aktif yang ditampilkan pada instruksi pembayaran dan invoice digital client.</p>
              </div>
            </div>

            <div v-if="bankLoading" class="finance-state" role="status">
              <ion-spinner name="crescent" />
              <p>Memuat rekening bank...</p>
            </div>

            <div v-else-if="bankError" class="finance-state" role="alert">
              <ion-icon :icon="alertCircleOutline" aria-hidden="true" />
              <strong>Rekening bank gagal dimuat</strong>
              <p>{{ bankError }}</p>
              <AppButton size="small" @click="loadBankAccounts">Coba lagi</AppButton>
            </div>

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
                      <button type="button" class="bank-icon-action" :aria-label="`Edit rekening ${account.bank_name}`" @click="openBankEditor(account)">
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

              <section v-else class="bank-empty-state">
                <div class="bank-empty-icon"><ion-icon :icon="businessOutline" aria-hidden="true" /></div>
                <strong>Belum ada rekening bank</strong>
                <p>Tambahkan rekening resmi PoliLand Kairagi agar pembeli dapat memilih tujuan transfer.</p>
              </section>

              <button type="button" class="bank-add-button" @click="openBankEditor()">
                <ion-icon :icon="addOutline" aria-hidden="true" />
                Tambah Rekening Bank
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
            <div v-if="instructionLoading" class="finance-state" role="status">
              <ion-spinner name="crescent" />
              <p>Memuat instruksi pembayaran...</p>
            </div>

            <div v-else-if="instructionError" class="finance-state" role="alert">
              <ion-icon :icon="alertCircleOutline" aria-hidden="true" />
              <strong>Instruksi gagal dimuat</strong>
              <p>{{ instructionError }}</p>
              <AppButton size="small" @click="loadPaymentInstruction">Coba lagi</AppButton>
            </div>

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
                  Tambah Butir Langkah
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
                    {{ instructionSaving ? 'Menyimpan...' : 'Simpan Perubahan Instruksi' }}
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
                  <span>Marketing</span>
                  <strong>{{ selectedMarketingName || selectedReportLot.marketingName || 'Belum ditetapkan' }}</strong>
                  <small>Marketing yang menangani transaksi</small>
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
                <div><span>Progress pembayaran</span><strong>{{ selectedReportLot.progress.toFixed(1) }}%</strong></div>
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
                <span>Tenor</span><strong>{{ selectedReportLot.months }} kali cicilan</strong>
                <span>Angsuran per bulan</span><strong>{{ selectedReportLot.monthlyPayment ? formatCurrency(selectedReportLot.monthlyPayment) : 'Belum ditentukan' }}</strong>
                <span>Mulai cicilan</span><strong>{{ selectedReportLot.installmentStartDate ? formatShortDate(selectedReportLot.installmentStartDate) : 'Belum ditentukan' }}</strong>
              </div>
            </section>

            <section v-if="selectedReportLot.paymentType === 'Installment'" class="report-detail-history">
              <div class="report-detail-section-title"><h2>Jadwal Cicilan</h2><span>{{ installmentSchedules.length }} jadwal</span></div>
              <div v-if="schedulesLoading" class="finance-state"><ion-spinner name="crescent" /><p>Memuat jadwal cicilan...</p></div>
              <div v-else-if="schedulesError" class="finance-state" role="alert"><p>{{ schedulesError }}</p><AppButton size="small" @click="loadSchedulesForSelectedLot">Coba lagi</AppButton></div>
              <article v-for="schedule in installmentSchedules" :key="schedule.id" class="installment-detail-row">
                <span class="installment-detail-number">{{ schedule.installment_number }}</span>
                <div><strong>Cicilan {{ schedule.installment_number }}</strong><small>{{ formatShortDate(schedule.due_date) }}</small></div>
                <div class="installment-detail-amount"><strong>{{ formatCurrency(schedule.amount) }}</strong><span :class="`installment-status installment-status--${schedule.status.toLowerCase()}`">{{ schedule.status === 'Paid' ? 'Lunas' : schedule.pending_payment ? 'Menunggu Verifikasi' : schedule.due_date < todayDate ? 'Jatuh Tempo' : 'Mendatang' }}</span></div>
              </article>
              <div v-if="!schedulesLoading && !schedulesError && !installmentSchedules.length" class="report-empty-inline">Jadwal cicilan belum tersedia. Jalankan migrasi database untuk membuat jadwal transaksi.</div>
            </section>

            <section class="report-detail-history">
              <div class="report-detail-section-title">
                <h2>Riwayat Transaksi</h2>
                <span>{{ selectedReportLot.payments.length }} transaksi</span>
              </div>
              <article v-for="payment in selectedReportLot.payments" :key="payment.id" class="report-payment-history-card">
                <div class="report-payment-history-top">
                  <div><strong>{{ payment.reference }}</strong><small>{{ formatDate(payment.date) }}</small></div>
                  <span class="report-payment-status" :class="`report-payment-status--${payment.statusTone}`">{{ payment.statusLabel }}</span>
                </div>
                <div class="report-payment-history-amount">{{ formatCurrency(payment.amount) }}</div>
                <div class="report-payment-history-meta">
                  <span>{{ payment.categoryLabel }}</span>
                  <span>{{ payment.method }}</span>
                </div>
                <p v-if="payment.note">{{ payment.note }}</p>
                <button type="button" class="report-proof-link" @click="openPaymentProof(Number(payment.id))"><ion-icon :icon="imageOutline" /> Lihat Bukti Pembayaran</button>
              </article>
              <div v-if="!selectedReportLot.payments.length" class="report-empty-inline">Belum ada riwayat pembayaran untuk kavling ini.</div>
            </section>
            <button type="button" class="report-add-payment-button" :disabled="selectedReportLot.remaining <= 0" @click="openAddPayment">
              <ion-icon :icon="addCircleOutline" /> Tambah Pembayaran
            </button>
          </template>

          <template v-else>
            <nav class="report-tabs" role="tablist" aria-label="Kategori laporan keuangan">
              <button
                v-for="tab in reportTabs"
                :key="tab.value"
                type="button"
                role="tab"
                :aria-selected="activeReportTab === tab.value"
                :class="{ 'report-tab--active': activeReportTab === tab.value }"
                @click="activeReportTab = tab.value"
              >
                <ion-icon :icon="tab.icon" aria-hidden="true" />
                {{ tab.label }}
              </button>
            </nav>

            <div class="report-toolbar">
              <label v-if="activeReportTab === 'summary'" class="report-month-picker">
                <ion-icon :icon="calendarOutline" aria-hidden="true" />
                <span class="visually-hidden">Pilih bulan laporan</span>
                <input v-model="reportMonth" type="month" />
              </label>
              <button type="button" class="export-button" :disabled="!reportExportRows.length" @click="exportReport">
                <ion-icon :icon="downloadOutline" aria-hidden="true" />
                Ekspor CSV
              </button>
            </div>

            <div v-if="loading" class="finance-state" role="status">
              <ion-spinner name="crescent" />
              <p>Memuat laporan keuangan...</p>
            </div>
            <div v-else-if="errorMessage" class="finance-state" role="alert">
              <ion-icon :icon="alertCircleOutline" aria-hidden="true" />
              <strong>Laporan keuangan gagal dimuat</strong>
              <p>{{ errorMessage }}</p>
              <AppButton size="small" @click="loadTransactions">Coba lagi</AppButton>
            </div>

            <template v-else>
              <template v-if="activeReportTab === 'summary'">
                <section class="report-total-card report-total-card--monthly">
                  <div class="report-total-top">
                    <span><ion-icon :icon="walletOutline" aria-hidden="true" /> TOTAL PEMASUKAN ({{ selectedMonthLabel.toUpperCase() }})</span>
                    <span v-if="monthComparison !== null" class="report-growth" :class="{ 'report-growth--down': monthComparison < 0 }">
                      {{ monthComparison >= 0 ? '↑' : '↓' }} {{ Math.abs(monthComparison).toFixed(1) }}% vs bulan lalu
                    </span>
                  </div>
                  <strong>{{ formatCurrency(monthlyIncome) }}</strong>
                  <div class="report-income-sources">
                    <div>
                      <span><i class="report-dot report-dot--gold" /> Booking Fee</span>
                      <strong>{{ formatCurrency(monthlyBookingIncome) }}</strong>
                      <small>{{ monthlyBookingCount }} transaksi</small>
                    </div>
                    <div>
                      <span><i class="report-dot report-dot--green" /> Pembayaran Lain</span>
                      <strong>{{ formatCurrency(monthlyOtherIncome) }}</strong>
                      <small>{{ monthlyOtherCount }} transaksi terkonfirmasi</small>
                    </div>
                  </div>
                </section>

                <section class="report-panel report-trend-panel">
                  <div class="panel-heading">
                    <div><h2>Tren Pendapatan</h2><p>Realisasi pembayaran 6 bulan terakhir</p></div>
                    <span class="panel-period">Puncak: {{ peakMonthLabel }}</span>
                  </div>
                  <div class="monthly-chart monthly-chart--six" role="img" :aria-label="monthlyChartDescription">
                    <div v-for="month in monthlyReport" :key="month.key" class="chart-column">
                      <strong class="chart-value">{{ formatCompactCurrency(month.total) }}</strong>
                      <div class="chart-track"><span class="chart-bar" :class="{ 'chart-bar--peak': month.key === peakMonthKey }" :style="{ height: `${Math.max((month.total / monthlyMax) * 100, month.total > 0 ? 5 : 0)}%` }" /></div>
                      <span class="chart-label">{{ month.label }}</span>
                    </div>
                  </div>
                </section>

                <section class="report-recent-section">
                  <div class="report-section-heading"><h2>Transaksi Terkini</h2><span>{{ recentReportPayments.length }} transaksi</span></div>
                  <article v-for="payment in recentReportPayments" :key="payment.id" class="report-recent-card">
                    <div class="report-recent-icon" :class="payment.statusTone === 'confirmed' ? 'is-confirmed' : 'is-pending'">
                      <ion-icon :icon="payment.statusTone === 'confirmed' ? checkmarkCircleOutline : timeOutline" aria-hidden="true" />
                    </div>
                    <div class="report-recent-main">
                      <strong>{{ payment.customerName }}</strong>
                      <p>{{ payment.lotCode }} · {{ payment.categoryLabel }} · {{ payment.method }}</p>
                      <small>{{ formatShortDate(payment.date) }}</small>
                    </div>
                    <div class="report-recent-amount">
                      <strong>+{{ formatCompactCurrency(payment.amount) }}</strong>
                      <small :class="`report-text-${payment.statusTone}`">{{ payment.statusLabel }}</small>
                    </div>
                  </article>
                  <div v-if="!recentReportPayments.length" class="report-empty-inline">Belum ada transaksi pada bulan ini.</div>
                </section>
              </template>

              <template v-else-if="activeReportTab === 'lots'">
                <section class="report-list-intro">
                  <div><h1>Laporan Per Kavling</h1><p>Pantau harga transaksi, pembayaran diterima, dan sisa tagihan setiap kavling.</p></div>
                  <span>{{ filteredReportLots.length }} kavling</span>
                </section>
                <label class="report-search report-search--full">
                  <ion-icon :icon="searchOutline" aria-hidden="true" />
                  <span class="visually-hidden">Cari kavling</span>
                  <input v-model="reportQuery" type="search" placeholder="Cari nomor kavling, blok, atau nama pembeli..." />
                  <button v-if="reportQuery" type="button" aria-label="Hapus pencarian" @click="reportQuery = ''"><ion-icon :icon="closeOutline" aria-hidden="true" /></button>
                </label>
                <div v-if="filteredReportLots.length" class="report-lot-list">
                  <article v-for="lot in filteredReportLots" :key="lot.key" class="report-lot-card">
                    <div class="report-lot-card-heading">
                      <div><h2>{{ lot.lotCode }} {{ lot.blockName }}</h2><p>Pemilik: <strong>{{ lot.customerName }}</strong></p></div>
                      <span class="report-lot-status" :class="`report-lot-status--${lot.statusTone}`">{{ lot.statusLabel }}</span>
                    </div>
                    <div class="report-lot-metrics">
                      <div><span>Harga Kavling</span><strong>{{ formatCompactCurrency(lot.finalPrice) }}</strong></div>
                      <div><span>Dibayar</span><strong>{{ formatCompactCurrency(lot.paid) }}</strong></div>
                      <div><span>Tersisa</span><strong :class="{ 'report-text-danger': lot.remaining > 0 && lot.isPastDue }">{{ formatCompactCurrency(lot.remaining) }}</strong></div>
                    </div>
                    <div class="report-lot-progress-label"><span>Progres Pembayaran</span><strong>{{ lot.progress.toFixed(1) }}% <small>({{ lot.paidPaymentCount }} pembayaran terkonfirmasi)</small></strong></div>
                    <div class="report-progress-track"><span :style="{ width: `${lot.progress}%` }" /></div>
                    <button type="button" class="report-detail-button" @click="openReportLot(lot)">Lihat Detail Keuangan <ion-icon :icon="chevronForwardOutline" aria-hidden="true" /></button>
                  </article>
                </div>
                <div v-else class="report-empty-inline">{{ reportQuery ? 'Tidak ada kavling yang cocok dengan pencarian.' : 'Belum ada data transaksi kavling.' }}</div>
              </template>

              <template v-else>
                <section class="report-list-intro">
                  <div><h1>Laporan Per Pembeli</h1><p>Ringkasan pembayaran dan sisa tagihan berdasarkan masing-masing pembeli.</p></div>
                  <span>{{ filteredReportBuyers.length }} pembeli</span>
                </section>
                <label class="report-search report-search--full">
                  <ion-icon :icon="searchOutline" aria-hidden="true" />
                  <span class="visually-hidden">Cari pembeli</span>
                  <input v-model="reportQuery" type="search" placeholder="Cari nama atau nomor telepon pembeli..." />
                  <button v-if="reportQuery" type="button" aria-label="Hapus pencarian" @click="reportQuery = ''"><ion-icon :icon="closeOutline" aria-hidden="true" /></button>
                </label>
                <div v-if="filteredReportBuyers.length" class="report-buyer-list">
                  <article v-for="buyer in filteredReportBuyers" :key="buyer.id" class="report-buyer-card">
                    <div class="report-buyer-heading">
                      <div class="report-buyer-avatar">{{ initials(buyer.name) }}</div>
                      <div class="report-buyer-identity"><h2>{{ buyer.name }}</h2><p>{{ buyer.phone || 'Nomor telepon belum tersedia' }}</p></div>
                      <span class="report-buyer-count">{{ buyer.lotCount }} Kavling</span>
                    </div>
                    <div class="report-buyer-balance">
                      <div><span>Total Terbayar</span><strong>{{ formatCurrency(buyer.paid) }}</strong></div>
                      <div><span>Tersisa</span><strong :class="{ 'report-text-danger': buyer.remaining > 0 }">{{ formatCurrency(buyer.remaining) }}</strong></div>
                    </div>
                    <div class="report-buyer-lots">
                      <span v-for="lot in buyer.lots.slice(0, 3)" :key="lot.key"><ion-icon :icon="businessOutline" aria-hidden="true" /> {{ lot.lotCode }} {{ lot.blockName }}</span>
                      <small v-if="buyer.lotCount > 3">+{{ buyer.lotCount - 3 }} kavling lainnya</small>
                    </div>
                  </article>
                </div>
                <div v-else class="report-empty-inline">{{ reportQuery ? 'Tidak ada pembeli yang cocok dengan pencarian.' : 'Belum ada data pembeli.' }}</div>
              </template>
            </template>
          </template>
        </template>

        <template v-else-if="activeView === 'plans'">
          <section class="payment-plans-page" aria-labelledby="payment-plans-heading">
            <div class="payment-plans-heading">
              <div>
                <h1 id="payment-plans-heading">Daftar Skema Cicilan</h1>
                <p class="payment-plans-description">Atur pilihan tenor dan margin cicilan yang digunakan saat membuat transaksi pembelian kavling.</p>
              </div>
              <span class="payment-plans-count">{{ paymentPlans.length }} skema</span>
            </div>

            <div v-if="planLoading" class="finance-state" role="status">
              <ion-spinner name="crescent" />
              <p>Memuat skema cicilan...</p>
            </div>

            <div v-else-if="planError" class="finance-state" role="alert">
              <ion-icon :icon="alertCircleOutline" aria-hidden="true" />
              <strong>Skema cicilan gagal dimuat</strong>
              <p>{{ planError }}</p>
              <AppButton size="small" @click="loadPaymentPlans">Coba lagi</AppButton>
            </div>

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
                    <span class="payment-plan-usage">{{ plan.usage?.lotInstallments ?? 0 }} kavling</span>
                    <div class="payment-plan-actions">
                      <AppButton class="payment-plan-action" variant="neutral" fill="solid" size="small" :aria-label="`Edit skema ${formatPaymentPlanName(plan.plan_name, plan.months)}`" @click="openPlanEditor(plan)">
                        <ion-icon :icon="createOutline" aria-hidden="true" />
                      </AppButton>
                      <AppButton class="payment-plan-action payment-plan-action--delete" variant="danger" fill="outline" size="small" :aria-label="`Hapus skema ${formatPaymentPlanName(plan.plan_name, plan.months)}`" @click="openPlanDeleteConfirmation(plan)">
                        <ion-icon :icon="trashOutline" aria-hidden="true" />
                      </AppButton>
                    </div>
                  </div>
                </article>
              </div>

              <section v-else class="payment-plan-empty">
                <div class="payment-plan-empty-icon"><ion-icon :icon="calendarOutline" aria-hidden="true" /></div>
                <strong>Belum ada skema cicilan</strong>
                <p>Tambahkan skema tenor dan margin agar tersedia saat Admin membuat transaksi cicilan.</p>
              </section>

              <AppButton class="payment-plan-add-button" variant="secondary" expand="block" @click="openPlanEditor()">
                <ion-icon :icon="addOutline" aria-hidden="true" />
                Tambah Skema Cicilan
              </AppButton>
              <AppButton class="payment-plan-back-button" variant="neutral" expand="block" @click="activeView = 'verification'">
                <ion-icon :icon="chevronBackOutline" aria-hidden="true" />
                Kembali
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
            <input v-model="query" type="search" placeholder="Cari nama, kode kavling, atau metode pembayaran" />
            <button v-if="query" type="button" aria-label="Hapus pencarian" @click="query = ''"><ion-icon :icon="closeOutline" aria-hidden="true" /></button>
          </label>

          <div v-if="loading" class="finance-state" role="status"><ion-spinner name="crescent" /><p>Memuat transaksi...</p></div>
          <div v-else-if="errorMessage" class="finance-state" role="alert"><ion-icon :icon="alertCircleOutline" aria-hidden="true" /><strong>Data keuangan gagal dimuat</strong><p>{{ errorMessage }}</p><AppButton size="small" @click="loadTransactions">Coba lagi</AppButton></div>
          <template v-else>
            <section v-if="filteredTransactions.length" class="transaction-list" aria-label="Daftar transaksi pembayaran">
              <article v-for="transaction in pagedTransactions" :key="transaction.id" class="transaction-card">
                <div class="transaction-head">
                  <div class="customer-mark" :class="`customer-mark--${transaction.status}`">{{ initials(transaction.customerName) }}</div>
                  <div class="transaction-customer"><h2>{{ transaction.customerName }}</h2><p>{{ transaction.lotCode }} · {{ transaction.paymentType }}</p></div>
                  <span class="status-badge" :class="`status-badge--${transaction.status}`">{{ transaction.reviewStatus === 'Needs Reupload' ? 'Perlu Upload Ulang' : transaction.reviewStatus === 'Rejected' ? 'Ditolak' : statusLabel(transaction.status) }}</span>
                </div>
                <div class="transaction-details"><div><span>Nominal pembayaran</span><strong>{{ formatCurrency(transaction.amount) }}</strong></div><div><span>{{ transaction.method }}</span><time :datetime="transaction.date">{{ formatDate(transaction.date) }}</time></div></div>
                <div class="transaction-actions"><button type="button" class="primary-action" @click="openPaymentProof(Number(transaction.id))"><ion-icon :icon="transaction.status === 'pending' ? checkmarkCircleOutline : documentTextOutline" aria-hidden="true" /> {{ transaction.reviewStatus === 'Needs Reupload' ? 'Lihat Bukti' : transaction.status === 'pending' ? 'Verifikasi' : 'Lihat Bukti' }}</button><button type="button" class="quiet-action" @click="openReportForTransaction(transaction.id)">Detail Keuangan</button></div>
              </article>
            </section>
            <nav v-if="filteredTransactions.length > 0 && totalPages > 1" class="finance-pager" aria-label="Halaman transaksi pembayaran">
              <div class="finance-pager-controls">
                <button type="button" class="finance-pager-btn" aria-label="Halaman sebelumnya" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)"><ion-icon :icon="chevronBackOutline" aria-hidden="true" /></button>
                <button v-for="page in visiblePages" :key="page ?? `ellipsis-${currentPage}`" type="button" class="finance-pager-number" :class="{ active: page === currentPage }" :disabled="page === null" :aria-current="page === currentPage ? 'page' : undefined" :aria-label="page === null ? undefined : `Halaman ${page}`" @click="page !== null && goToPage(page)">{{ page ?? '…' }}</button>
                <button type="button" class="finance-pager-btn" aria-label="Halaman berikutnya" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)"><ion-icon :icon="chevronForwardOutline" aria-hidden="true" /></button>
              </div>
              <span class="finance-pager-position">Halaman {{ currentPage }} dari {{ totalPages }}</span>
            </nav>
            <section v-if="!filteredTransactions.length" class="finance-state empty-state">
              <img class="empty-mascot" src="@/assets/mascot/MascotwithEmptyReceiptandCoins.png" alt="Mascot PoliLand membawa bukti pembayaran kosong" />
              <strong>Tidak ada transaksi</strong>
              <p>{{ query ? 'Coba ubah kata kunci pencarian.' : 'Belum ada transaksi pada kategori ini.' }}</p>
            </section>
          </template>
        </template>
        <AppModal v-model="proofZoomOpen" title="Bukti Transfer" variant="fullscreen" :show-footer="false">
          <div class="proof-zoom-content">
            <img v-if="proofSignedUrl && selectedProofPayment && isImageProof(selectedProofPayment.payment.proof_path)" :src="proofSignedUrl" alt="Bukti transfer diperbesar" />
            <iframe v-else-if="proofSignedUrl" :src="proofSignedUrl" title="Dokumen bukti pembayaran" />
          </div>
        </AppModal>

        <AppModal
          v-model="reviewDialogOpen"
          :title="reviewTargetStatus === 'Rejected' ? 'Tolak Transaksi' : 'Minta Upload Ulang'"
          variant="dialog"
          :loading="reviewSaving"
          :confirm-disabled="!reviewReason.trim()"
          :confirm-text="reviewTargetStatus === 'Rejected' ? 'Tolak Pembayaran' : 'Kirim Permintaan'"
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
          :title="editingBankId ? 'Edit Rekening Bank' : 'Tambah Rekening Bank'"
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
            <p v-if="bankFormError" class="bank-form-error" role="alert">{{ bankFormError }}</p>
          </div>
        </AppModal>

        <AppModal
          v-model="planModalOpen"
          :title="editingPlanId ? 'Edit Skema Cicilan' : 'Tambah Skema Cicilan'"
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
            <p v-if="planFormError" class="bank-form-error" role="alert">{{ planFormError }}</p>
          </div>
        </AppModal>


        <AppModal
          v-model="planDeleteModalOpen"
          title="Hapus Skema Cicilan"
          variant="dialog"
          :loading="planDeleting"
          confirm-text="Hapus Skema"
          @confirm="deletePaymentPlan"
        >
          <div class="payment-plan-delete-content">
            <div class="payment-plan-delete-icon"><ion-icon :icon="trashOutline" aria-hidden="true" /></div>
            <p v-if="planToDelete">Yakin ingin menghapus skema <strong>{{ formatPaymentPlanName(planToDelete.plan_name, planToDelete.months) }}</strong>?</p>
            <small v-if="planToDelete?.usage">
              Digunakan {{ planToDelete.usage.lotInstallments }} kavling, {{ planToDelete.usage.lotTransactions }} transaksi, dan {{ planToDelete.usage.customerInterests }} minat pembeli.
              Skema yang sudah dipakai transaksi tidak dapat dihapus.
            </small>
            <p v-if="planDeleteError" class="bank-form-error" role="alert">{{ planDeleteError }}</p>
          </div>
        </AppModal>

        <p v-if="actionMessage" class="action-message" role="status">{{ actionMessage }}</p>
      </main>
    </ion-content>
    <MobileTabBar variant="admin" />
  </ion-page>
</template>

<script setup lang="ts">
import { computed, nextTick, onMounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import { IonContent, IonIcon, IonPage, IonSpinner } from '@ionic/vue'
import { addCircleOutline, addOutline, alertCircleOutline, businessOutline, calendarOutline, chatbubbleEllipsesOutline, checkmarkCircleOutline, chevronBackOutline, chevronForwardOutline, closeCircleOutline, closeOutline, copyOutline, createOutline, documentTextOutline, downloadOutline, imageOutline, informationCircleOutline, peopleOutline, pieChartOutline, refreshOutline, saveOutline, searchOutline, shieldCheckmarkOutline, starOutline, timeOutline, trashOutline, walletOutline } from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppInput from '@/components/ui/AppInput.vue'
import { customerService } from '@/services/marketing/customerService'
import { paymentInstructionService } from '@/services/Finance/paymentInstructionService'
import { bankAccountService, type BankAccountRecord } from '@/services/Finance/bankAccountService'
import { paymentPlanService, type PaymentPlanRecord } from '@/services/Finance/paymentPlanService'
import { paymentService, type InstallmentScheduleRecord, type PaymentDetail } from '@/services/Finance/paymentService'
import AppModal from '@/components/ui/AppModal.vue'
import { calculateFinanceBalance } from '@/composables/useFinanceCalculations'
import type { FinanceCustomerRecord, FinancePaymentRecord, FinanceTransactionRecord } from '@/types/finance'
import FinanceAmountBreakdown from '@/components/Admin/finance/FinanceAmountBreakdown.vue'
import { formatPaymentPlanName } from '@/utils/paymentPlan'

type FinanceStatus = 'pending' | 'verified' | 'overdue'
type FinanceTransaction = { id: string; customerName: string; lotCode: string; paymentType: string; amount: number; method: string; date: string; status: FinanceStatus; reviewStatus: string }

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
    { key: 'step-1', text: 'Periksa detail tagihan, nama pembeli, nomor kavling, dan nominal pembayaran.' },
    { key: 'step-2', text: 'Pilih salah satu rekening resmi PoliLand Kairagi yang berstatus aktif.' },
    { key: 'step-3', text: 'Lakukan transfer sesuai nominal yang tertera pada tagihan.' },
    { key: 'step-4', text: 'Cantumkan nomor kavling atau nomor transaksi pada berita transfer jika tersedia.' },
    { key: 'step-5', text: 'Simpan bukti transfer yang menampilkan nominal, tanggal, dan status berhasil.' },
    { key: 'step-6', text: 'Unggah bukti pembayaran melalui formulir pada akun pembeli.' },
    { key: 'step-7', text: 'Tunggu proses pemeriksaan dan verifikasi pembayaran oleh Admin.' },
  ],
  important_notes_text: [
    'Pastikan pembayaran hanya dikirim ke rekening resmi PoliLand Kairagi.',
    'Jangan melakukan transfer ke rekening pribadi marketing atau pihak lain.',
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
const errorMessage = ref('')
const actionMessage = ref('')
const route = useRoute()
const PAGE_SIZE = 10
const currentPage = ref(1)
const activeView = ref<'verification' | 'instructions' | 'reports' | 'plans'>('verification')
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
  statusTone: 'confirmed' | 'pending' | 'rejected'
  note: string
  proofPath: string | null
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
const reportMonth = ref(`${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`)
const reportQuery = ref('')
const rawCustomers = ref<FinanceCustomerRecord[]>([])
const selectedReportLot = ref<ReportLot | null>(null)
type PaymentPage = 'none' | 'proof' | 'add'
const paymentPage = ref<PaymentPage>('none')
const selectedProofPayment = ref<PaymentDetail | null>(null)
const proofSignedUrl = ref('')
const proofLoading = ref(false)
const proofError = ref('')
const proofZoomOpen = ref(false)
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
const selectableSchedules = computed(() => installmentSchedules.value.filter((item) => item.status !== 'Paid' && !item.pending_payment))
const selectedSchedules = computed(() => selectableSchedules.value.filter((item) => selectedScheduleIds.value.includes(item.id)))
const selectedSchedulesLabel = computed(() => selectedSchedules.value.map((item) => item.installment_number).join(' & '))
const newPaymentTotal = computed(() => selectedReportLot.value?.paymentType === 'Installment'
  ? selectedSchedules.value.reduce((sum, item) => sum + Number(item.amount), 0)
  : Math.max(0, Number(manualPaymentAmount.value || 0)))
const canCreatePayment = computed(() => Boolean(
  selectedReportLot.value &&
  selectedReportLot.value.remaining > 0 &&
  newPaymentTotal.value > 0 &&
  newPaymentTotal.value <= selectedReportLot.value.remaining &&
  newPaymentMethod.value.trim() &&
  newPaymentDate.value &&
  paymentProofFile.value &&
  (selectedReportLot.value.paymentType !== 'Installment' || selectedScheduleIds.value.length > 0) &&
  !paymentSaving.value
))
const reportTabs = [
  { value: 'summary' as const, label: 'Ringkasan', icon: walletOutline },
  { value: 'lots' as const, label: 'Kavling', icon: businessOutline },
  { value: 'buyers' as const, label: 'Pembeli', icon: peopleOutline },
]

function normalizeReportPayment(payment: FinancePaymentRecord, customer: FinanceCustomerRecord, lot: FinanceTransactionRecord['lots'], transaction: FinanceTransactionRecord | undefined): ReportPayment {
  const status = String(payment.status || 'Pending')
  const statusTone = status === 'Confirmed' ? 'confirmed' : status === 'Rejected' ? 'rejected' : 'pending'
  const category = String(payment.payment_category || 'Unclassified')
  const categoryLabels: Record<string, string> = {
    Booking: 'Booking Fee',
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
    categoryLabel: categoryLabels[category] || category,
    status,
    statusLabel: status === 'Confirmed' ? 'Terverifikasi' : status === 'Rejected' ? 'Ditolak' : status === 'Needs Reupload' ? 'Perlu Upload Ulang' : 'Menunggu',
    statusTone,
    note: payment.note || '',
    proofPath: payment.proof_path || null,
  }
}

const allReportPayments = computed<ReportPayment[]>(() => {
  return rawCustomers.value.flatMap((customer) => {
    const payments = Array.isArray(customer.payments) ? customer.payments : []
    return payments.map((payment) => {
      const transaction = (customer.lot_transactions || []).find((item) =>
        String(item.id) === String(payment.transaction_id) ||
        (String(item.lot_id) === String(payment.lot_id) && String(item.customer_id) === String(customer.id))
      )
      const lot = transaction?.lots || (customer.lots || []).find((item) => String(item.id) === String(payment.lot_id))
      return normalizeReportPayment(payment, customer, lot, transaction)
    })
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
            (!payment.transactionId && payment.lotId === String(transaction.lot_id) && payment.customerId === String(customer.id)))
        )
        const balance = calculateFinanceBalance(transaction, lotPayments)
        const finalPrice = balance.obligation
        const remaining = balance.remaining
        const progress = balance.progress
        const statusLabel = remaining <= 0 && finalPrice > 0 ? 'Lunas' : transaction.status === 'Sold' ? 'Terjual · Belum Lunas' : 'Cicilan Berjalan'
        const statusTone = remaining <= 0 && finalPrice > 0 ? 'paid' : 'ongoing'
        const lotId = String(transaction.lot_id)
        const transactionPayments = allReportPayments.value
          .filter((payment) => payment.transactionId === String(transaction.id) || (!payment.transactionId && payment.lotId === lotId && payment.customerId === String(customer.id)))
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

const selectedMonthPayments = computed(() => allReportPayments.value.filter((payment) => {
  const date = new Date(payment.date)
  return Number.isFinite(date.getTime()) &&
    `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}` === reportMonth.value
}))
const confirmedMonthPayments = computed(() => selectedMonthPayments.value.filter((payment) => payment.statusTone === 'confirmed'))
const monthlyIncome = computed(() => confirmedMonthPayments.value.reduce((sum, payment) => sum + payment.amount, 0))
const monthlyBookingPayments = computed(() => confirmedMonthPayments.value.filter((payment) => payment.category === 'Booking'))
const monthlyOtherPayments = computed(() => confirmedMonthPayments.value.filter((payment) => payment.category !== 'Booking'))
const monthlyBookingIncome = computed(() => monthlyBookingPayments.value.reduce((sum, payment) => sum + payment.amount, 0))
const monthlyOtherIncome = computed(() => monthlyOtherPayments.value.reduce((sum, payment) => sum + payment.amount, 0))
const monthlyBookingCount = computed(() => monthlyBookingPayments.value.length)
const monthlyOtherCount = computed(() => monthlyOtherPayments.value.length)
const selectedMonthLabel = computed(() => {
  if (!reportMonth.value) return 'Periode'
  return new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date(`${reportMonth.value}-01T00:00:00`))
})
const previousMonthKey = computed(() => {
  if (!reportMonth.value) return ''
  const [year, month] = reportMonth.value.split('-').map(Number)
  const date = new Date(year, month - 2, 1)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
})
const previousMonthIncome = computed(() => allReportPayments.value
  .filter((payment) => payment.statusTone === 'confirmed' && payment.date.slice(0, 7) === previousMonthKey.value)
  .reduce((sum, payment) => sum + payment.amount, 0))
const monthComparison = computed<number | null>(() => {
  if (previousMonthIncome.value === 0) return null
  return ((monthlyIncome.value - previousMonthIncome.value) / previousMonthIncome.value) * 100
})
const monthlyReport = computed(() => {
  const [year, month] = (reportMonth.value || `${new Date().getFullYear()}-${new Date().getMonth() + 1}`).split('-').map(Number)
  const start = new Date(year, month - 6, 1)
  return Array.from({ length: 6 }, (_, index) => {
    const date = new Date(start.getFullYear(), start.getMonth() + index, 1)
    const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
    const total = allReportPayments.value
      .filter((payment) => payment.statusTone === 'confirmed' && payment.date.slice(0, 7) === key)
      .reduce((sum, payment) => sum + payment.amount, 0)
    return { key, label: new Intl.DateTimeFormat('id-ID', { month: 'short' }).format(date), total }
  })
})
const monthlyMax = computed(() => Math.max(...monthlyReport.value.map((month) => month.total), 1))
const peakMonth = computed(() => monthlyReport.value.reduce((peak, month) => month.total > peak.total ? month : peak, monthlyReport.value[0] || { key: '', label: '-', total: 0 }))
const peakMonthKey = computed(() => peakMonth.value.key)
const peakMonthLabel = computed(() => peakMonth.value.label)
const monthlyChartDescription = computed(() => monthlyReport.value.map((month) => `${month.label}: ${formatCurrency(month.total)}`).join(', '))
const recentReportPayments = computed(() => selectedMonthPayments.value.slice(0, 5))
const filteredReportLots = computed(() => {
  const term = reportQuery.value.trim().toLowerCase()
  return reportLots.value.filter((lot) => !term || `${lot.lotCode} ${lot.blockName} ${lot.customerName}`.toLowerCase().includes(term))
})
const filteredReportBuyers = computed(() => {
  const term = reportQuery.value.trim().toLowerCase()
  return reportBuyers.value.filter((buyer) => !term || `${buyer.name} ${buyer.phone} ${buyer.lots.map((lot) => lot.lotCode).join(' ')}`.toLowerCase().includes(term))
})
const reportExportRows = computed(() => {
  if (activeReportTab.value === 'lots') {
    return filteredReportLots.value.map((lot) => [lot.lotCode, lot.blockName, lot.customerName, String(lot.finalPrice), String(lot.paid), String(lot.remaining), lot.statusLabel])
  }
  if (activeReportTab.value === 'buyers') {
    return filteredReportBuyers.value.map((buyer) => [buyer.name, buyer.phone, String(buyer.lotCount), String(buyer.paid), String(buyer.remaining)])
  }
  return selectedMonthPayments.value.map((payment) => [formatShortDate(payment.date), payment.customerName, payment.lotCode, payment.categoryLabel, payment.method, String(payment.amount), payment.statusLabel])
})

watch(activeReportTab, () => { reportQuery.value = '' })
watch(activeView, (view: typeof activeView.value) => {
  if (view !== 'reports') selectedReportLot.value = null
  if (view !== 'reports') paymentPage.value = 'none'
})

const statusCounts = computed(() => ({ pending: transactions.value.filter((item) => item.status === 'pending').length, verified: transactions.value.filter((item) => item.status === 'verified').length, overdue: transactions.value.filter((item) => item.status === 'overdue').length }))
const filteredTransactions = computed(() => {
  const term = query.value.trim().toLowerCase()
  return transactions.value.filter((item) => item.status === activeFilter.value && (!term || `${item.customerName} ${item.lotCode} ${item.method}`.toLowerCase().includes(term)))
})
const totalPages = computed(() => Math.max(1, Math.ceil(filteredTransactions.value.length / PAGE_SIZE)))
const pagedTransactions = computed(() => filteredTransactions.value.slice((currentPage.value - 1) * PAGE_SIZE, currentPage.value * PAGE_SIZE))
const visiblePages = computed<(number | null)[]>(() => {
  const total = totalPages.value
  const current = currentPage.value
  if (total <= 5) return Array.from({ length: total }, (_, index) => index + 1)
  const pages: (number | null)[] = [1]
  const start = Math.max(2, current - 1)
  const end = Math.min(total - 1, current + 1)
  if (start > 2) pages.push(null)
  for (let page = start; page <= end; page += 1) pages.push(page)
  if (end < total - 1) pages.push(null)
  pages.push(total)
  return pages
})

watch([filteredTransactions, totalPages], () => {
  if (currentPage.value > totalPages.value) currentPage.value = totalPages.value
  if (currentPage.value < 1) currentPage.value = 1
})
watch([query, activeFilter], () => { currentPage.value = 1 })

async function goToPage(page: number) {
  const nextPage = Math.min(Math.max(page, 1), totalPages.value)
  if (nextPage === currentPage.value) return
  currentPage.value = nextPage
  await nextTick()
  document.querySelector('.transaction-list')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function formatCurrency(value: number) { return `Rp ${value.toLocaleString('id-ID')}` }
function formatDate(value: string) { return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(value)) }
function formatCompactCurrency(value: number) {
  if (value >= 1_000_000_000) return `Rp ${(value / 1_000_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} M`
  if (value >= 1_000_000) return `Rp ${(value / 1_000_000).toLocaleString('id-ID', { maximumFractionDigits: 1 })} jt`
  if (value >= 1_000) return `Rp ${(value / 1_000).toLocaleString('id-ID', { maximumFractionDigits: 0 })} rb`
  return formatCurrency(value)
}
function formatShortDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value))
}
function exportReport() {
  const headers = activeReportTab.value === 'lots'
    ? ['Kode Kavling', 'Blok', 'Pembeli', 'Harga Transaksi', 'Total Dibayar', 'Sisa Tagihan', 'Status']
    : activeReportTab.value === 'buyers'
      ? ['Nama Pembeli', 'Telepon', 'Jumlah Kavling', 'Total Terbayar', 'Sisa Tagihan']
      : ['Tanggal', 'Nama Pembeli', 'Kode Kavling', 'Kategori', 'Metode Pembayaran', 'Nominal', 'Status']
  const rows = [headers, ...reportExportRows.value]
  const csv = rows.map((row) => row.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(';')).join('\r\n')
  const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `laporan-${activeReportTab.value}-poliland-${reportMonth.value || 'semua-periode'}.csv`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}


function paymentStatusLabel(status: string) {
  return status === 'Confirmed' ? 'Terverifikasi'
    : status === 'Rejected' ? 'Ditolak'
      : status === 'Needs Reupload' ? 'Perlu Upload Ulang'
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
  return Boolean(path && /\\.(jpe?g|png|webp)$/i.test(path))
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
  selectedProofPayment.value = null
  paymentCreateError.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}
async function openPaymentProof(paymentId: number) {
  paymentPage.value = 'proof'
  proofLoading.value = true
  proofError.value = ''
  selectedProofPayment.value = null
  proofSignedUrl.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
  await loadSelectedPaymentProof(paymentId)
}
async function loadSelectedPaymentProof(paymentId?: number) {
  const id = paymentId ?? selectedProofPayment.value?.payment.id
  if (!id) return
  proofLoading.value = true
  proofError.value = ''
  try {
    const detail = await paymentService.getPaymentDetail(id)
    selectedProofPayment.value = detail
    proofSignedUrl.value = detail.payment.proof_path
      ? await paymentService.getProofUrl(detail.payment.proof_path)
      : ''
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
    showMessage('Tidak dapat menyalin nomor transaksi dari browser ini.')
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
    await loadSelectedPaymentProof()
    await loadTransactions()
    if (selectedReportLot.value) await loadSchedulesForSelectedLot()
  } catch (error) {
    showMessage(error instanceof Error ? error.message : 'Verifikasi pembayaran gagal.')
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
    showMessage(reviewTargetStatus.value === 'Rejected' ? 'Pembayaran berhasil ditolak.' : 'Permintaan upload ulang berhasil dikirim.')
    await loadSelectedPaymentProof()
    await loadTransactions()
  } catch (error) {
    showMessage(error instanceof Error ? error.message : 'Tindakan review gagal.')
  } finally {
    reviewSaving.value = false
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
function openReportForTransaction(paymentId: string) {
  const payment = allReportPayments.value.find((item: ReportPayment) => item.id === paymentId)
  if (!payment) {
    showMessage('Data transaksi belum tersedia pada laporan.')
    return
  }
  const lot = reportLots.value.find((item: ReportLot) => item.transactionId === payment.transactionId)
  if (lot) {
    activeView.value = 'reports'
    activeReportTab.value = 'lots'
    void openReportLot(lot)
  } else {
    void openPaymentProof(Number(paymentId))
  }
}
function openAddPayment() {
  if (!selectedReportLot.value || selectedReportLot.value.remaining <= 0) return
  paymentPage.value = 'add'
  selectedScheduleIds.value = []
  manualPaymentAmount.value = null
  newPaymentMethod.value = ''
  newPaymentDate.value = getLocalDateInput()
  newPaymentReference.value = ''
  newPaymentNote.value = ''
  clearPaymentProof()
  paymentCreateError.value = ''
  if (selectedReportLot.value.paymentType === 'Installment' && !installmentSchedules.value.length) void loadSchedulesForSelectedLot()
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
  if (!selectedReportLot.value || !paymentProofFile.value || !canCreatePayment.value || paymentSaving.value) return
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
    showMessage('Transaksi pembayaran berhasil disimpan dan menunggu verifikasi.')
    await loadTransactions()
    const updatedLot = reportLots.value.find((item) => item.transactionId === lot.transactionId)
    if (updatedLot) {
      selectedReportLot.value = updatedLot
      if (updatedLot.paymentType === 'Installment') await loadSchedulesForSelectedLot()
    }
    window.scrollTo({ top: 0, behavior: 'smooth' })
  } catch (error) {
    paymentCreateError.value = error instanceof Error ? error.message : 'Transaksi pembayaran gagal disimpan.'
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
    showMessage(instructionError.value)
  } finally {
    instructionSaving.value = false
  }
}

async function deletePaymentInstruction() {
  const confirmed = window.confirm('Hapus instruksi pembayaran? Pembeli tidak akan melihat panduan sampai instruksi dibuat kembali.')
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
    showMessage(instructionError.value)
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
  const confirmed = window.confirm(`Hapus rekening ${account.bank_name} dengan nomor ${formatBankAccountNumber(account.account_number)}?`)
  if (!confirmed) return
  try {
    await bankAccountService.deleteBankAccount(account.id)
    showMessage('Rekening bank berhasil dihapus.')
    await loadBankAccounts()
  } catch (error) {
    showMessage(error instanceof Error ? error.message : 'Rekening bank gagal dihapus.')
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
function showMessage(message: string) { actionMessage.value = message; window.setTimeout(() => { actionMessage.value = '' }, 2800) }

async function loadTransactions() {
  loading.value = true
  errorMessage.value = ''
  try {
    const customers = await customerService.getAdminCustomers()
    rawCustomers.value = customers ?? []
    transactions.value = customers.flatMap((customer) => (customer.payments ?? []).map((payment) => {
      const related = (customer.lot_transactions ?? []).find((item) =>
        String(item.id) === String(payment.transaction_id) ||
        String(item.lot_id) === String(payment.lot_id)
      )
      const date = payment.payment_date || payment.created_at || customer.created_at || new Date().toISOString()
      const status: FinanceStatus = payment.status === 'Confirmed' ? 'verified' : payment.status === 'Rejected' ? 'overdue' : 'pending'
      return { id: String(payment.id), customerName: customer.full_name || 'Pembeli', lotCode: related?.lots?.lot_number || `Lot #${payment.lot_id ?? related?.lot_id ?? '-'}`, paymentType: payment.payment_category || (related?.payment_type === 'Installment' ? 'Cicilan' : 'Pembayaran'), amount: Number(payment.amount || 0), method: payment.payment_method || 'Metode belum tercatat', date, status, reviewStatus: String(payment.status || 'Pending') } as FinanceTransaction
    }))
  } catch (error) { errorMessage.value = error instanceof Error ? error.message : 'Periksa koneksi internet, lalu coba lagi.' } finally { loading.value = false }
}

onMounted(() => {
  const requestedStatus = route.query.status
  const requestedTab = route.query.tab
  if (requestedTab === 'plans') activeView.value = 'plans'
  if (requestedStatus === 'pending' || requestedStatus === 'verified' || requestedStatus === 'overdue') {
    activeFilter.value = requestedStatus
  }
  void loadTransactions()
  void loadPaymentInstruction()
  void loadBankAccounts()
  void loadPaymentPlans()
})
</script>

<style scoped>
.admin-finance-page { color: var(--text-primary); font-family: var(--font-primary); }
.finance-shell { max-width: 1120px; margin: 0 auto; padding: 22px 16px calc(112px + env(safe-area-inset-bottom)); }

.report-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; margin: 24px 0 18px; }
.report-eyebrow { margin: 0 0 6px; color: var(--poliland-gold-text); font-size: 10px; font-weight: var(--font-weight-bold); letter-spacing: .08em; }
.report-heading h1 { margin: 0; color: var(--text-primary); font-size: clamp(21px, 5vw, 28px); font-weight: var(--font-weight-bold); letter-spacing: -.035em; }
.report-description { margin: 6px 0 0; color: var(--text-secondary); font-size: 12px; line-height: 1.5; }
.export-button { display: inline-flex; flex: 0 0 auto; align-items: center; justify-content: center; gap: 7px; min-height: 44px; padding: 0 13px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-primary); font: inherit; font-size: 12px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.export-button ion-icon { color: var(--poliland-green); font-size: 17px; }
.export-button:disabled { cursor: not-allowed; opacity: .5; }
.report-filter { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 14px; padding: 12px 14px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.report-filter label { color: var(--text-secondary); font-size: 12px; font-weight: var(--font-weight-semibold); }
.report-filter select { width: auto; max-width: 58%; min-height: 40px; padding: 0 30px 0 10px; border: 1px solid var(--border-default); border-radius: 10px; background: var(--surface-muted); color: var(--text-primary); font: inherit; font-size: 12px; }
.report-summary { display: grid; grid-template-columns: minmax(0, 1.5fr) repeat(2, minmax(0, 1fr)); gap: 10px; }
.report-total-card, .report-metric-card { min-width: 0; padding: 15px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.report-total-card { border-color: color-mix(in srgb, var(--poliland-gold) 58%, var(--border-default)); background: color-mix(in srgb, var(--poliland-gold-soft) 24%, var(--surface-primary)); }
.report-total-top { display: flex; align-items: center; justify-content: space-between; gap: 8px; color: var(--text-secondary); font-size: 11px; }
.report-icon { display: grid; flex: 0 0 34px; width: 34px; height: 34px; place-items: center; border: 1px solid color-mix(in srgb, var(--poliland-gold) 50%, transparent); border-radius: 11px; color: var(--poliland-gold-text); font-size: 18px; }
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
.chart-column { display: grid; grid-template-rows: 20px minmax(86px, 1fr) 20px; justify-items: center; gap: 7px; min-width: 0; }
.chart-value { max-width: 100%; overflow: hidden; color: var(--text-secondary); font-size: 10px; font-weight: var(--font-weight-semibold); text-overflow: ellipsis; white-space: nowrap; }
.chart-track { display: flex; width: min(100%, 48px); height: 100%; align-items: flex-end; overflow: hidden; border-radius: 8px 8px 3px 3px; background: var(--surface-muted); }
.chart-bar { display: block; width: 100%; min-height: 0; border-radius: 7px 7px 2px 2px; background: var(--poliland-green); transition: height .25s ease; }
.chart-label { color: var(--text-secondary); font-size: 10px; text-transform: capitalize; }
.report-empty-inline { padding: 22px 10px; color: var(--text-secondary); font-size: 12px; text-align: center; }
.method-list { display: grid; gap: 16px; margin-top: 18px; }
.method-row { min-width: 0; }
.method-info { display: flex; align-items: center; justify-content: space-between; gap: 12px; margin-bottom: 7px; font-size: 12px; }
.method-info span { min-width: 0; color: var(--text-primary); overflow-wrap: anywhere; }
.method-info strong { flex: 0 0 auto; color: var(--text-primary); font-size: 12px; }
.method-track { height: 7px; overflow: hidden; border-radius: 99px; background: var(--surface-muted); }
.method-track span { display: block; height: 100%; border-radius: inherit; background: var(--poliland-gold); }
.method-row small { display: block; margin-top: 5px; color: var(--text-secondary); font-size: 10px; }
.report-list-heading { align-items: flex-end; margin-bottom: 14px; }
.report-search { display: flex; flex: 0 1 220px; align-items: center; gap: 7px; min-width: 130px; min-height: 40px; padding: 0 10px; border: 1px solid var(--border-default); border-radius: 10px; color: var(--text-secondary); }
.report-search ion-icon { flex: 0 0 auto; font-size: 16px; }
.report-search input { width: 100%; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 11px; }
.report-table-wrap { width: 100%; overflow-x: auto; }
.report-table { width: 100%; border-collapse: collapse; text-align: left; font-size: 11px; }
.report-table th { padding: 10px 9px; border-bottom: 1px solid var(--border-default); color: var(--text-secondary); font-size: 10px; font-weight: var(--font-weight-semibold); white-space: nowrap; }
.report-table td { padding: 12px 9px; border-bottom: 1px solid var(--border-default); color: var(--text-primary); vertical-align: middle; }
.report-table tbody tr:last-child td { border-bottom: 0; }
.report-table td strong, .report-table td small { display: block; }
.report-table td strong { font-size: 11px; }
.report-table td small { margin-top: 3px; color: var(--text-secondary); font-size: 10px; }
.amount-cell { text-align: right; white-space: nowrap; font-weight: var(--font-weight-semibold); }
.report-status { display: inline-flex; padding: 5px 7px; border-radius: 7px; font-size: 10px; font-weight: var(--font-weight-semibold); white-space: nowrap; }
.report-status--pending { background: var(--poliland-gold-soft); color: var(--poliland-gold-text-soft); }
.report-status--verified { background: var(--status-success-bg); color: var(--poliland-green); }
.report-status--overdue { background: color-mix(in srgb, var(--status-danger) 10%, white); color: var(--status-danger); }


.instruction-tabs { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); margin: 10px -16px 16px; padding: 0 16px; border-bottom: 1px solid var(--border-default); background: var(--surface-muted); }
.instruction-tabs button { position: relative; min-width: 0; min-height: 52px; padding: 0 10px; border: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 12px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.instruction-tabs button::after { position: absolute; right: 0; bottom: -1px; left: 0; height: 2px; background: transparent; content: ''; }
.instruction-tabs button.instruction-tab--active { color: var(--poliland-gold-text-soft); }
.instruction-tabs button.instruction-tab--active::after { background: var(--poliland-gold); }
.instruction-tabs button:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: -3px; }
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
.bank-icon-action:hover { background: var(--surface-muted); }
.bank-account-footer { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px; margin-top: 12px; color: var(--text-secondary); font-size: 10px; line-height: 1.4; }
.bank-primary-label { display: inline-flex; align-items: center; gap: 4px; color: var(--poliland-gold-text-soft); font-weight: var(--font-weight-semibold); }
.bank-primary-label ion-icon { font-size: 13px; }
.bank-inactive-label { color: var(--status-danger); }
.bank-add-button { display: flex; width: 100%; min-height: 48px; align-items: center; justify-content: center; gap: 8px; margin-top: 18px; border: 1px solid var(--poliland-gold); border-radius: var(--radius-control); background: var(--poliland-gold); color: #fff; font: inherit; font-size: 13px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.bank-add-button ion-icon { font-size: 19px; }
.bank-add-button:focus-visible, .bank-icon-action:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.bank-empty-state { display: grid; justify-items: center; gap: 8px; padding: 32px 18px; border: 1px dashed var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); text-align: center; }
.bank-empty-icon { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 14px; background: var(--surface-muted); color: var(--poliland-gold-text); font-size: 23px; }
.bank-empty-state strong { color: var(--text-primary); font-size: 13px; }
.bank-empty-state p { max-width: 280px; margin: 0; color: var(--text-secondary); font-size: 11px; line-height: 1.5; }
.bank-form { display: grid; gap: 16px; padding: 2px 0 8px; }
.bank-form-error { margin: 0; color: var(--status-danger); font-size: 12px; }
.bank-form .instruction-publish-toggle { margin-top: -5px; }
.instruction-heading { margin: 18px 0 16px; }
.instruction-panel .instruction-editor { margin-top: 12px; }
@media (min-width: 700px) {
  .instruction-tabs { margin-right: -24px; margin-left: -24px; padding-right: 24px; padding-left: 24px; }
  .bank-account-list { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}
.instruction-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 14px; margin: 24px 0 18px; }
.instruction-heading h1 { margin: 0; color: var(--text-primary); font-size: clamp(21px, 5vw, 28px); font-weight: var(--font-weight-bold); letter-spacing: -.035em; }
.instruction-status { flex: 0 0 auto; padding: 7px 10px; border: 1px solid var(--border-default); border-radius: 999px; background: var(--surface-muted); color: var(--text-secondary); font-size: 10px; font-weight: var(--font-weight-semibold); }
.instruction-status--active { border-color: color-mix(in srgb, var(--status-success) 30%, var(--border-default)); background: var(--status-success-bg); color: var(--poliland-green); }
.instruction-notice { display: flex; align-items: flex-start; gap: 11px; margin-bottom: 14px; padding: 14px; border: 1px solid color-mix(in srgb, var(--poliland-gold) 35%, var(--border-default)); border-radius: var(--radius-card); background: color-mix(in srgb, var(--poliland-gold-soft) 18%, var(--surface-primary)); }
.instruction-notice > ion-icon { flex: 0 0 auto; margin-top: 1px; color: var(--poliland-gold-text); font-size: 19px; }
.instruction-notice strong { display: block; color: var(--text-primary); font-size: 12px; }
.instruction-notice p { margin: 4px 0 0; color: var(--text-secondary); font-size: 11px; line-height: 1.5; }
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
  .instruction-heading { align-items: flex-start; flex-direction: column; }
  .instruction-editor { padding: 14px; gap: 16px; }
}
.finance-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 18px; }
.finance-kicker { margin: 0 0 4px; color: var(--poliland-gold-text); font-size: 11px; font-weight: var(--font-weight-bold); letter-spacing: .06em; text-transform: uppercase; }
.finance-header h1 { margin: 0; font-size: clamp(22px, 6vw, 32px); letter-spacing: -.03em; }
.finance-subtitle { max-width: 560px; margin: 7px 0 0; color: var(--text-secondary); font-size: 12px; line-height: 1.5; }
.overview-card span, .overview-card small, .transaction-details span { display: block; color: var(--text-secondary); font-size: 11px; }
.finance-shortcuts { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; margin-top: 18px; }
.shortcut-card { position: relative; display: flex; min-width: 0; min-height: 104px; flex-direction: column; align-items: flex-start; justify-content: space-between; gap: 9px; padding: 13px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); color: var(--text-primary); font: inherit; text-align: left; cursor: pointer; }
.shortcut-card--active { border-color: var(--poliland-gold); background: color-mix(in srgb, var(--poliland-gold-soft) 28%, var(--surface-primary)); }
.shortcut-icon { display: grid; width: 36px; height: 36px; place-items: center; border: 1px solid var(--poliland-gold-soft); border-radius: var(--radius-control); color: var(--poliland-gold-text); font-size: 19px; }
.shortcut-card strong { font-size: 12px; line-height: 1.25; }.shortcut-count { position: absolute; top: 12px; right: 12px; display: grid; width: 22px; height: 22px; place-items: center; border-radius: 50%; background: var(--poliland-gold); color: var(--text-primary); font-size: 10px; font-weight: var(--font-weight-bold); }
.shortcut-card:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
.finance-overview { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 18px; }
.overview-card { min-width: 0; padding: 14px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.overview-card strong { display: block; margin: 7px 0 2px; font-size: 24px; }
.overview-card--gold strong { color: var(--poliland-gold-text); }.overview-card--green strong { color: var(--poliland-green); }.overview-card--danger strong { color: var(--status-danger); }
.finance-tabs { display: flex; gap: 8px; margin-top: 18px; overflow-x: auto; scrollbar-width: none; }.finance-tabs::-webkit-scrollbar { display: none; }
.finance-tabs button { min-height: 42px; padding: 0 13px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); color: var(--text-secondary); font: inherit; font-size: 12px; font-weight: var(--font-weight-semibold); white-space: nowrap; cursor: pointer; }.finance-tabs button span { margin-left: 4px; }.finance-tabs button.active { border-color: var(--poliland-gold); background: var(--poliland-gold-soft); color: var(--text-primary); }
.finance-search { display: flex; align-items: center; gap: 9px; min-height: 46px; margin-top: 12px; padding: 0 12px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); }.finance-search > ion-icon { color: var(--text-secondary); font-size: 18px; }.finance-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--text-primary); font: inherit; font-size: 13px; }.finance-search button { display: grid; width: 32px; height: 32px; place-items: center; border: 0; background: transparent; color: var(--text-secondary); }
.transaction-list { display: grid; gap: 12px; margin-top: 16px; }.transaction-card { min-width: 0; padding: 15px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }.transaction-head { display: flex; align-items: center; gap: 10px; }.customer-mark { display: grid; flex: 0 0 42px; width: 42px; height: 42px; place-items: center; border-radius: 12px; font-size: 12px; font-weight: var(--font-weight-bold); }.customer-mark--pending { background: var(--poliland-gold-soft); color: var(--poliland-gold-text-soft); }.customer-mark--verified { background: var(--status-success-bg); color: var(--poliland-green); }.customer-mark--overdue { background: color-mix(in srgb, var(--status-danger) 11%, white); color: var(--status-danger); }.transaction-customer { min-width: 0; flex: 1; }.transaction-customer h2 { margin: 0; font-size: 14px; }.transaction-customer p { margin: 3px 0 0; color: var(--text-secondary); font-size: 11px; overflow-wrap: anywhere; }.status-badge { flex: 0 0 auto; padding: 5px 8px; border: 1px solid currentColor; border-radius: 999px; font-size: 10px; font-weight: var(--font-weight-semibold); }.status-badge--pending { color: var(--poliland-gold-text); background: var(--poliland-gold-soft); }.status-badge--verified { color: var(--poliland-green); background: var(--status-success-bg); }.status-badge--overdue { color: var(--status-danger); background: color-mix(in srgb, var(--status-danger) 10%, white); }
.finance-pager { display: grid; grid-template-columns: minmax(0, 1fr) auto minmax(90px, 1fr); align-items: center; gap: 14px; margin-top: 18px; padding: 16px 0 4px; border-top: 1px solid var(--border-default); }.finance-pager-controls { grid-column: 2; display: flex; align-items: center; gap: 6px; max-width: 100%; overflow-x: auto; scrollbar-width: none; padding: 3px; border: 1px solid var(--border-default); border-radius: var(--radius-panel); background: var(--surface-muted); }.finance-pager-controls::-webkit-scrollbar { display: none; }.finance-pager-btn, .finance-pager-number { min-width: 44px; height: 44px; padding: 0 10px; border: 1px solid var(--border-default); border-radius: 10px; background: var(--surface-primary); color: var(--text-primary); font: inherit; font-weight: var(--font-weight-bold); cursor: pointer; }.finance-pager-btn { display: inline-flex; align-items: center; justify-content: center; font-size: 20px; }.finance-pager-number.active { border-color: var(--poliland-green); background: var(--poliland-green); color: #fff; }.finance-pager-btn:disabled, .finance-pager-number:disabled { cursor: default; border-color: transparent; background: transparent; opacity: 1; }.finance-pager-position { grid-column: 3; color: var(--text-secondary); font-size: 12px; text-align: center; white-space: nowrap; }
.transaction-details { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-top: 14px; padding: 12px; border-radius: var(--radius-control); background: var(--surface-muted); }.transaction-details strong { display: block; margin-top: 4px; font-size: 18px; }.transaction-details time { display: block; margin-top: 4px; color: var(--text-secondary); font-size: 10px; text-align: right; }.transaction-actions { display: flex; gap: 8px; margin-top: 12px; }.transaction-actions button { min-height: 44px; padding: 0 12px; border-radius: var(--radius-control); font: inherit; font-size: 11px; font-weight: var(--font-weight-semibold); cursor: pointer; }.primary-action { display: inline-flex; flex: 1; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--poliland-green); background: var(--poliland-green); color: #fff; }.secondary-action { display: inline-flex; flex: 1; align-items: center; justify-content: center; gap: 6px; border: 1px solid var(--border-default); background: var(--surface-primary); color: var(--text-primary); }.quiet-action { border: 1px solid var(--border-default); background: var(--surface-primary); color: var(--text-secondary); }.action-message { position: fixed; right: 16px; bottom: calc(94px + env(safe-area-inset-bottom)); left: 16px; z-index: 9000; margin: 0 auto; max-width: 520px; padding: 12px 14px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-primary); box-shadow: 0 8px 24px rgb(37 37 37 / 15%); color: var(--text-primary); font-size: 12px; text-align: center; }.finance-state { display: flex; flex-direction: column; align-items: center; gap: 9px; margin-top: 16px; padding: 34px 18px; border: 1px dashed var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); text-align: center; }.finance-state ion-icon, .finance-state ion-spinner { color: var(--poliland-green); font-size: 28px; }.finance-state strong { font-size: 14px; }.finance-state p { max-width: 390px; margin: 0; color: var(--text-secondary); font-size: 12px; line-height: 1.5; }.visually-hidden { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; clip-path: inset(50%); }
button:focus-visible, input:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
@media (max-width: 600px) { .finance-header { align-items: stretch; flex-direction: column; gap: 12px; }.finance-shortcuts { grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin-inline: 0; padding: 0; }.shortcut-card { min-height: 96px; padding: 11px 9px; }.finance-overview { grid-template-columns: repeat(3, minmax(0, 1fr)); }.overview-card { padding: 11px; }.overview-card strong { font-size: 20px; }.transaction-actions { flex-wrap: wrap; }.primary-action, .secondary-action { flex: 1 1 100%; }.quiet-action { flex: 1 1 100%; }.finance-pager { grid-template-columns: 1fr; gap: 8px; }.finance-pager-controls { grid-column: 1; justify-self: center; }.finance-pager-position { grid-column: 1; } }
@media (max-width: 600px) {
  .report-heading { align-items: flex-start; flex-direction: column; gap: 12px; margin-top: 20px; }
  .export-button { width: 100%; }
  .report-summary { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .report-total-card { grid-column: 1 / -1; }
  .report-metric-card { min-height: 104px; }
  .report-panel { padding: 14px; }
  .report-list-heading { align-items: stretch; flex-direction: column; }
  .report-search { flex: 1 1 auto; width: 100%; }
  .report-table { min-width: 540px; }
}
@media (max-width: 360px) {
  .report-summary { gap: 7px; }
  .report-metric-card { padding: 11px; }
  .report-metric-card > strong { font-size: 16px; }
  .report-total-card { padding: 13px; }
  .report-total-card > strong { font-size: 19px; }
  .report-filter { align-items: flex-start; flex-direction: column; }
  .report-filter select { width: 100%; max-width: none; }
  .monthly-chart { gap: 6px; }
  .chart-value { font-size: 9px; }
}
@media (max-width: 360px) { .finance-overview { gap: 6px; }.overview-card { padding: 9px; }.overview-card span, .overview-card small { font-size: 10px; }.overview-card strong { font-size: 18px; }.transaction-details { align-items: flex-start; flex-direction: column; }.transaction-details time { text-align: left; } }

/* Laporan keuangan: tab Ringkasan, Kavling, Pembeli */
.report-tabs { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 8px; margin: 16px 0 12px; }
.report-tabs button { display: inline-flex; min-width: 0; min-height: 42px; align-items: center; justify-content: center; gap: 6px; padding: 0 8px; border: 1px solid transparent; border-radius: 999px; background: var(--surface-muted); color: var(--text-primary); font: inherit; font-size: 12px; font-weight: var(--font-weight-semibold); white-space: nowrap; cursor: pointer; }
.report-tabs button ion-icon { font-size: 15px; }
.report-tabs button.report-tab--active { background: var(--poliland-gold); color: #fff; }
.report-toolbar { display: flex; align-items: center; justify-content: flex-end; gap: 8px; margin: 10px 0 16px; }
.report-month-picker { display: inline-flex; min-height: 42px; align-items: center; gap: 7px; padding: 0 10px; border: 1px solid var(--border-default); border-radius: var(--radius-control); background: var(--surface-muted); color: var(--text-primary); }
.report-month-picker ion-icon { color: var(--poliland-gold-text); font-size: 17px; }
.report-month-picker input { width: 142px; border: 0; outline: 0; background: transparent; color: inherit; font: inherit; font-size: 12px; }
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
.monthly-chart--six { grid-template-columns: repeat(6, minmax(0, 1fr)); }
.chart-bar--peak { background: var(--poliland-gold); }
.report-panel .panel-period { padding: 5px 8px; border-radius: 999px; background: var(--surface-muted); color: var(--text-primary); font-size: 10px; }
.report-recent-section { display: grid; gap: 10px; margin-top: 24px; }
.report-section-heading { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
.report-section-heading h2 { margin: 0; font-size: 15px; }
.report-section-heading > span { color: var(--text-secondary); font-size: 10px; }
.report-recent-card { display: flex; min-width: 0; align-items: center; gap: 10px; padding: 12px; border: 1px solid var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); }
.report-recent-icon { display: grid; flex: 0 0 38px; width: 38px; height: 38px; place-items: center; border-radius: 50%; background: var(--surface-muted); color: var(--text-secondary); font-size: 19px; }
.report-recent-icon.is-confirmed { background: var(--status-success-bg); color: var(--poliland-green); }
.report-recent-icon.is-pending { background: var(--poliland-gold-soft); color: var(--poliland-gold-text-soft); }
.report-recent-main { flex: 1; min-width: 0; }
.report-recent-main strong { display: block; font-size: 12px; }
.report-recent-main p { margin: 3px 0; color: var(--text-secondary); font-size: 10px; overflow-wrap: anywhere; }
.report-recent-main small, .report-recent-amount small { color: var(--text-secondary); font-size: 9px; }
.report-recent-amount { flex: 0 0 auto; text-align: right; }
.report-recent-amount strong { display: block; font-size: 12px; white-space: nowrap; }
.report-text-confirmed { color: var(--poliland-green) !important; }
.report-text-pending { color: var(--poliland-gold-text) !important; }
.report-text-rejected, .report-text-danger { color: var(--status-danger) !important; }
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
.report-payment-history-top strong, .report-payment-history-top small { display: block; }
.report-payment-history-top strong { color: var(--poliland-gold-text); font-size: 10px; }
.report-payment-history-top small { margin-top: 3px; color: var(--text-secondary); font-size: 9px; }
.report-payment-status { flex: 0 0 auto; padding: 5px 7px; border-radius: 999px; background: var(--surface-muted); font-size: 9px; }
.report-payment-status--confirmed { background: var(--status-success-bg); color: var(--poliland-green); }
.report-payment-status--pending { background: var(--poliland-gold-soft); color: var(--poliland-gold-text-soft); }
.report-payment-status--rejected { background: color-mix(in srgb, var(--status-danger) 10%, white); color: var(--status-danger); }
.report-payment-history-amount { margin: 10px 0 6px; font-size: 20px; font-weight: var(--font-weight-bold); }
.report-payment-history-meta { display: flex; justify-content: space-between; gap: 8px; padding-bottom: 9px; border-bottom: 1px solid var(--border-default); color: var(--text-secondary); font-size: 10px; }
.report-payment-history-card p { margin: 9px 0 0; color: var(--text-secondary); font-size: 10px; }
.report-detail-back button:focus-visible, .report-tabs button:focus-visible, .report-detail-button:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }
@media (max-width: 600px) {
  .report-toolbar { justify-content: space-between; }
  .report-month-picker { flex: 1; }
  .report-month-picker input { width: 100%; min-width: 0; }
  .report-toolbar .export-button { width: auto; }
  .report-lot-metrics strong { font-size: 10px; }
  .report-recent-card { align-items: flex-start; }
  .report-recent-amount strong { font-size: 10px; }
}
@media (max-width: 360px) {
  .report-tabs { gap: 5px; }
  .report-tabs button { gap: 4px; padding: 0 5px; font-size: 10px; }
  .report-income-sources { gap: 6px; }
  .report-income-sources > div { padding: 9px; }
  .report-income-sources strong { font-size: 12px; }
  .report-lot-metrics { padding-inline: 5px; }
}


/* Menu keuangan empat modul: mobile horizontal scroll, desktop four columns. */
.finance-shortcuts { grid-template-columns: repeat(4, minmax(0, 1fr)); }
.payment-plans-page { padding-top: 30px; }
.payment-plans-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin: 14px 2px 14px; }
.payment-plans-eyebrow { margin: 0 0 6px; color: var(--poliland-gold-text); font-size: 9px; font-weight: var(--font-weight-bold); letter-spacing: .08em; }
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
.payment-plan-add-button, .payment-plan-back-button { width: 100%; min-height: 48px; margin-top: 14px; }
.payment-plan-add-button ion-icon { font-size: 19px; }
.payment-plan-back-button { min-height: 44px; margin-top: 9px; }
.payment-plan-empty { display: grid; justify-items: center; gap: 7px; padding: 32px 18px; border: 1px dashed var(--border-default); border-radius: var(--radius-card); background: var(--surface-primary); text-align: center; }
.payment-plan-empty-icon { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 50%; background: var(--surface-muted); color: var(--poliland-gold-text); font-size: 22px; }
.payment-plan-empty strong { font-size: 13px; }
.payment-plan-empty p { max-width: 260px; margin: 0; color: var(--text-secondary); font-size: 11px; line-height: 1.5; }
.payment-plan-form { display: grid; gap: 16px; }
.payment-plan-form .instruction-field { margin: 0; }
.payment-plan-delete-content { display: grid; justify-items: center; gap: 10px; padding: 6px 0 10px; text-align: center; }
.payment-plan-delete-icon { display: grid; width: 48px; height: 48px; place-items: center; border-radius: 50%; background: color-mix(in srgb, var(--status-danger) 9%, white); color: var(--status-danger); font-size: 22px; }
.payment-plan-delete-content p { margin: 0; color: var(--text-primary); font-size: 13px; line-height: 1.5; }
.payment-plan-delete-content small { color: var(--text-secondary); font-size: 10px; line-height: 1.5; }
@media (max-width: 600px) {
  .finance-shortcuts { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(108px, 1fr); grid-template-columns: none; overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x mandatory; scrollbar-width: none; padding: 0 0 4px; }
  .finance-shortcuts::-webkit-scrollbar { display: none; }
  .finance-shortcuts .shortcut-card { scroll-snap-align: start; }
  .payment-plans-page { padding-top: 28px; }
  .payment-plans-heading { align-items: flex-start; }
  .payment-plan-card { min-height: 106px; }
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
.proof-download { display: flex; min-height: 44px; align-items: center; justify-content: center; gap: 8px; border-radius: var(--radius-control); background: var(--status-success-bg); color: var(--poliland-green); font-size: 12px; font-weight: var(--font-weight-semibold); text-decoration: none; }
.proof-review-actions { display: grid; gap: 8px; }
.proof-verify-button, .proof-reject-button, .proof-reupload-button, .proof-back-button, .payment-save-button, .payment-cancel-button, .report-add-payment-button { display: flex; min-height: 46px; align-items: center; justify-content: center; gap: 8px; border: 0; border-radius: var(--radius-control); font: inherit; font-size: 12px; font-weight: var(--font-weight-semibold); cursor: pointer; }
.proof-verify-button, .payment-save-button, .report-add-payment-button { background: var(--poliland-gold); color: #fff; }
.proof-review-secondary { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
.proof-reject-button { border: 1px solid color-mix(in srgb, var(--status-danger) 25%, white); background: color-mix(in srgb, var(--status-danger) 7%, white); color: var(--status-danger); }
.proof-reupload-button { border: 1px solid var(--border-default); background: var(--surface-primary); color: var(--text-secondary); }
.proof-back-button, .payment-cancel-button { background: var(--surface-muted); color: var(--text-primary); }
.proof-review-note { padding: 13px; border-radius: var(--radius-control); background: var(--surface-muted); font-size: 12px; }
.proof-review-note p { margin: 5px 0 0; color: var(--text-secondary); line-height: 1.5; }
.proof-zoom-content { display: grid; min-height: 65dvh; place-items: center; }
.proof-zoom-content img { max-width: 100%; max-height: 75dvh; object-fit: contain; }
.proof-zoom-content iframe { width: 100%; height: 75dvh; border: 0; }
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
.payment-schedule-option input:checked + .payment-schedule-check::after { width: 8px; height: 5px; border-bottom: 2px solid white; border-left: 2px solid white; content: ""; transform: rotate(-45deg) translateY(-1px); }
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
.report-no-proof { display: block; margin-top: 9px; color: var(--text-secondary); font-size: 9px; }
.report-add-payment-button { width: min(100%, 280px); min-height: 48px; margin: 24px auto 8px; border-radius: 999px; box-shadow: 0 4px 10px rgb(35 35 35 / 10%); }
@media (max-width: 360px) {
  .proof-info-grid { gap: 13px 8px; }
  .proof-card-heading { align-items: flex-start; flex-direction: column; }
  .proof-reference { max-width: 100%; }
  .payment-schedule-option { grid-template-columns: 18px minmax(0, 1fr) auto; gap: 6px; padding: 8px; }
  .payment-schedule-amount { font-size: 10px; }
}

</style>
