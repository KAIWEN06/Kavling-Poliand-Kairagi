<script setup lang="ts">
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import AppNotice from '@/components/ui/AppNotice.vue'
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  IonContent,
  IonIcon,
  IonPage,
  onIonViewWillEnter,
} from '@ionic/vue'
import {
  checkmarkOutline,
  chevronForward,
  copyOutline,
  logOutOutline,
} from 'ionicons/icons'

import { authService } from '@/services/auth/authService'
import SurveyAgendaCard from '@/components/common/SurveyAgendaCard.vue'
import { getClientSpks, type ClientSpkRecord } from '@/services/clientSpkService'
import { bankAccountService, type BankAccountRecord } from '@/services/Finance/bankAccountService'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import ReviewInvite from '@/components/reviews/ReviewInvite.vue'
import RecommendedLots from '@/components/client/RecommendedLots.vue'
import PurchaseJourney from '@/components/client/PurchaseJourney.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Reveal from '@/components/ui/Reveal.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import StatusBadge, { type BadgeTone } from '@/components/ui/StatusBadge.vue'
import { useClientPurchaseOverview } from '@/composables/useClientPurchaseOverview'
import PurchasePicker from '@/components/client/PurchasePicker.vue'
import { buildPurchaseEntries, isOverdue, isPaidOff, overdueSince } from '@/utils/purchaseSelection'
import { useToast } from '@/composables/useToast'
import { formatInstallmentRange, formatRupiah as formatRupiahId } from '@/utils/installmentFormat'

const router = useRouter()
const clientName = ref('Pembeli')
const clientSpks = ref<ClientSpkRecord[]>([])
const documentsLoaded = ref(false)
const documentsFailed = ref(false)

async function loadClientDocuments({ silent = false }: LoadOptions = {}) {
  try {
    clientSpks.value = await getClientSpks()
    documentsFailed.value = false
  } catch (error) {
    console.error('[Beranda Klien] Gagal memuat pengajuan SPK:', error)
    if (!silent) {
      clientSpks.value = []
      documentsFailed.value = true
    }
  } finally {
    documentsLoaded.value = true
  }
}

const toast = useToast()
const bankAccounts = ref<BankAccountRecord[]>([])
const banksState = ref<'loading' | 'ready' | 'error'>('loading')
const copiedAccountId = ref<string | null>(null)
let copiedTimer: number | undefined

async function loadBankAccounts({ silent = false }: LoadOptions = {}) {
  if (!silent && !bankAccounts.value.length) banksState.value = 'loading'
  try {
    bankAccounts.value = await bankAccountService.getActiveBankAccounts()
    banksState.value = 'ready'
  } catch (error) {
    console.error('[Beranda Klien] Gagal memuat rekening tujuan:', error)
    if (!silent && !bankAccounts.value.length) banksState.value = 'error'
  }
}

function formatAccountNumber(value: string) {
  return value.replace(/\s+/g, '').replace(/(.{4})/g, '$1 ').trim()
}

async function copyAccountNumber(account: BankAccountRecord) {
  try {
    await navigator.clipboard.writeText(account.account_number.replace(/\s+/g, ''))
    copiedAccountId.value = account.id
    window.clearTimeout(copiedTimer)
    copiedTimer = window.setTimeout(() => (copiedAccountId.value = null), 1800)
  } catch {
    toast.error('Nomor rekening belum dapat disalin. Salin manual dari angka yang tertera.')
  }
}

async function loadClientName() {
  try {
    const user = await authService.getCurrentUser()
    const metadata = user?.user_metadata ?? {}
    const registeredName = metadata.full_name ?? metadata.name
    const emailName = user?.email?.split('@')[0]

    clientName.value =
      typeof registeredName === 'string' && registeredName.trim()
        ? registeredName.trim()
        : emailName || 'Pembeli'
  } catch (error) {
    console.error('[Beranda Klien] Gagal memuat nama akun:', error)
    clientName.value = 'Pembeli'
  }
}

const {
  loading: purchaseLoading,
  error: purchaseError,
  purchases,
  load: loadPurchase,
} = useClientPurchaseOverview()

const entries = computed(() => buildPurchaseEntries(purchases.value, clientSpks.value))
/* null: ikuti pilihan otomatis sampai pembeli memilih sendiri. */
const pickedKey = ref<string | null>(null)
const selected = computed(
  () => entries.value.find((entry) => entry.key === pickedKey.value) ?? entries.value[0] ?? null,
)

/* Pilihan awal bergantung pada kedua sumber, jadi tunggu keduanya agar kartu tidak berganti sendiri. */
const initialLoading = computed(
  () => !documentsLoaded.value || (purchaseLoading.value && !purchases.value.length),
)

const overview = computed(() => selected.value?.purchase ?? null)
const spkOnly = computed(
  () => !initialLoading.value && !purchaseError.value && Boolean(selected.value && !selected.value.purchase),
)
const remaining = computed(() =>
  overview.value ? Math.max(0, overview.value.finalPrice - overview.value.paidTotal) : 0,
)
const progressPercent = computed(() => {
  const o = overview.value
  if (!o || o.finalPrice <= 0) return 0
  return Math.min(100, Math.round((o.paidTotal / o.finalPrice) * 100))
})
const paidInstallments = computed(
  () => overview.value?.schedules.filter((s) => s.status === 'Paid').length ?? 0,
)
const nextSchedule = computed(
  () => overview.value?.schedules.find((s) => s.status !== 'Paid') ?? null,
)
const hasLateSchedule = computed(() => Boolean(selected.value && overdueSince(selected.value) !== null))

const lateElsewhere = computed(() =>
  entries.value
    .filter((entry) => entry.key !== selected.value?.key)
    .map((entry) => ({ entry, since: overdueSince(entry) }))
    .filter((item) => item.since !== null),
)

/* Halaman Pembayaran membaca query ini (jalur yang sama dengan notifikasi). */
function openPayments(paymentId?: number) {
  if (!overview.value) {
    goTo('/client/pembayaran')
    return
  }
  void router.push({
    path: '/client/pembayaran',
    query: {
      transactionId: String(overview.value.transactionId),
      ...(paymentId ? { paymentId: String(paymentId) } : {}),
      nt: String(Date.now()),
    },
  })
}

function formatRupiah(value: number) {
  return formatRupiahId(value)
}

function formatDay(value: string | null) {
  if (!value) return 'Belum dijadwalkan'
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

const transactionBadge = computed<{ tone: BadgeTone; label: string }>(() => {
  const status = overview.value?.transactionStatus
  if (status === 'Sold') return { tone: 'success', label: 'Terjual' }
  if (status === 'Booking') return { tone: 'gold', label: 'Dipesan' }
  return { tone: 'neutral', label: status || 'Dalam proses' }
})

const paymentStateBadge = computed<{ tone: BadgeTone; label: string }>(() => {
  const o = overview.value
  if (!o) return { tone: 'neutral', label: '-' }
  if (isPaidOff(o)) return { tone: 'success', label: 'Lunas' }
  if (hasLateSchedule.value) return { tone: 'danger', label: 'Ada cicilan terlambat' }
  if (o.pendingCount > 0) return { tone: 'warning', label: 'Menunggu verifikasi' }
  return { tone: 'info', label: 'Sesuai jadwal' }
})

function paymentTone(status: string): BadgeTone {
  if (status === 'Confirmed') return 'success'
  if (status === 'Pending') return 'warning'
  return 'danger'
}

function paymentLabel(status: string) {
  if (status === 'Confirmed') return 'Dikonfirmasi'
  if (status === 'Pending') return 'Menunggu'
  if (status === 'Needs Reupload') return 'Unggah ulang'
  if (status === 'Rejected') return 'Ditolak'
  return status
}

const schemeLabel = computed(() => {
  const o = overview.value
  if (!o) return ''
  return o.paymentType === 'Installment' && o.months ? `Cicilan ${o.months} bulan` : 'Tunai'
})

const recentPayments = computed(() => overview.value?.payments.slice(0, 5) ?? [])

const today = new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())

onMounted(() => {
  void loadClientName()
})

const recommendations = ref<InstanceType<typeof RecommendedLots> | null>(null)

onIonViewWillEnter(() => {
  void recommendations.value?.refresh()
  // Data yang sudah tampil diperbarui senyap agar skeleton dan animasi masuk tidak terulang.
  void loadClientDocuments({ silent: documentsLoaded.value && !documentsFailed.value })
  void loadPurchase({ silent: !initialLoading.value && !purchaseError.value })
  void loadBankAccounts({ silent: banksState.value === 'ready' })
})

async function logout() {
  await authService.logout()
  await router.replace('/login')
}

function goTo(path: string) {
  void router.push(path)
}

useRealtimeRefresh(
  ['spk_requests', 'lot_transactions', 'payments', 'installment_schedules', 'lots', 'bank_accounts'],
  () => Promise.all([
    loadClientDocuments({ silent: true }),
    loadPurchase({ silent: true }),
    loadBankAccounts({ silent: true }),
  ]),
)

</script>

<template>
  <ion-page>
    <app-header variant="client" title="PoliLand Kairagi" :show-back="false" />

    <ion-content class="client-content" :fullscreen="true">
      <main class="dash">
        <Reveal :order="0">
          <PageHeader :title="`Halo, ${clientName}`" :subtitle="`Pantau proses pembelian kavling Anda di PoliLand Kairagi. ${today}.`">
            <template #actions>
              <AppButton size="small" fill="outline" @click="goTo('/client/kavling')">Lihat kaveling</AppButton>
              <button type="button" class="icon-btn" aria-label="Keluar dari akun" @click="logout">
                <ion-icon :icon="logOutOutline" aria-hidden="true" />
              </button>
            </template>
          </PageHeader>
        </Reveal>

        <Reveal v-if="!initialLoading && !purchaseError && entries.length > 1" :order="1" class="dash__block">
          <PurchasePicker :entries="entries" :selected-key="selected?.key ?? ''" @select="pickedKey = $event" />
        </Reveal>

        <AppNotice
          v-if="!initialLoading && lateElsewhere.length"
          tone="warning"
          title="Cicilan terlambat di kavling lain"
          class="dash__block"
        >
          <template #actions>
            <button
              v-for="item in lateElsewhere"
              :key="item.entry.key"
              type="button"
              class="late-link"
              @click="pickedKey = item.entry.key"
            >
              {{ item.entry.lotLabel }}, jatuh tempo {{ formatDay(item.since) }}
              <ion-icon :icon="chevronForward" aria-hidden="true" />
            </button>
          </template>
        </AppNotice>

        <AppNotice v-if="documentsFailed" tone="warning" class="dash__block">
          <p>Pengajuan SPK belum bisa dimuat.</p>
          <AppButton size="small" fill="outline" @click="loadClientDocuments()">Coba lagi</AppButton>
        </AppNotice>

        <Reveal
          v-if="!initialLoading && !documentsFailed && !purchaseError"
          :order="1"
          class="dash__journey"
        >
          <PurchaseJourney :spk="selected?.spk ?? null" :has-purchase="entries.length > 0" :show-lot="spkOnly" />
        </Reveal>

        <div v-if="initialLoading" class="dash__grid" role="status" aria-label="Memuat data pembelian">
          <div class="card skel area-hero">
            <Skeleton width="45%" height="36px" border-radius="8px" />
            <Skeleton height="12px" border-radius="6px" />
            <div class="skel__row"><Skeleton height="56px" /><Skeleton height="56px" /></div>
          </div>
          <div class="rail"><Skeleton height="120px" border-radius="14px" /></div>
          <div class="card skel area-history">
            <Skeleton v-for="n in 3" :key="n" height="60px" border-radius="14px" />
          </div>
        </div>

        <div v-else class="dash__grid" :class="{ 'dash__grid--plain': spkOnly }">
          <!-- PROPERTI + PROGRES PEMBAYARAN -->
          <Reveal v-if="!spkOnly" :order="2" class="area-hero">
            <section aria-labelledby="purchase-title">
              <AppNotice v-if="purchaseError" tone="error" title="Data pembelian belum dapat dimuat">
                <p>{{ purchaseError }}</p>
<AppButton size="small" @click="loadPurchase()">Coba lagi</AppButton>
              </AppNotice>

              <div v-else-if="!overview" class="card">
                <h2 id="purchase-title" class="sr-only">Status pembelian</h2>
                <EmptyState
                  kind="lots"
                  title="Belum ada pembelian kaveling"
                  description="Setelah Anda memesan kaveling, ringkasan pembelian dan jadwal pembayaran muncul di sini."
                >
                  <AppButton @click="goTo('/client/kavling')">Lihat kaveling</AppButton>
                </EmptyState>
              </div>

              <div v-else class="hero">
                <div class="hero__top">
                  <div class="hero__lot">
                    <h2 id="purchase-title" class="hero__title t-figure">{{ overview.lotLabel }}</h2>
                    <span class="hero__meta">
                      <span v-if="overview.area">{{ overview.area }} m²</span>
                      <span>{{ schemeLabel }}</span>
                      <span>Dipesan {{ formatDay(overview.bookingDate) }}</span>
                    </span>
                  </div>
                  <StatusBadge :tone="transactionBadge.tone" :label="transactionBadge.label" />
                </div>

                <div class="hero__money">
                  <div>
                    <small>Total dibayar</small>
                    <strong class="t-figure">{{ formatRupiah(overview.paidTotal) }}</strong>
                  </div>
                  <div>
                    <small>Sisa pembayaran</small>
                    <strong class="t-figure hero__remaining">{{ formatRupiah(remaining) }}</strong>
                  </div>
                </div>

                <div
                  class="hero__bar"
                  role="progressbar"
                  aria-label="Progres pembayaran"
                  aria-valuemin="0"
                  aria-valuemax="100"
                  :aria-valuenow="progressPercent"
                >
                  <span class="hero__fill" :style="{ transform: `translateX(${progressPercent - 100}%)` }"></span>
                </div>

                <div class="hero__foot">
                  <span v-if="overview.finalPrice > 0 && remaining === 0" class="t-num">100% terbayar</span>
                  <span v-else class="t-num">{{ progressPercent }}% dari {{ formatRupiah(overview.finalPrice) }}</span>
                  <span v-if="overview.schedules.length" class="t-num">{{ paidInstallments }} dari {{ overview.schedules.length }} lunas</span>
                </div>

                <div class="hero__actions">
                  <StatusBadge :tone="paymentStateBadge.tone" :label="paymentStateBadge.label" />
                  <span v-if="overview.pendingCount" class="hero__note">{{ overview.pendingCount }} pembayaran menunggu verifikasi Admin</span>
                  <button type="button" class="hero__link" @click="openPayments()">
                    Lihat pembayaran <ion-icon :icon="chevronForward" aria-hidden="true" />
                  </button>
                </div>
              </div>
            </section>
          </Reveal>

          <!-- RAIL: berikutnya, rekening, survei -->
          <div class="rail">
            <Reveal v-if="overview && overview.schedules.length" :order="3">
              <button
                v-if="nextSchedule"
                type="button"
                class="card next"
                :class="{ 'next--late': isOverdue(nextSchedule) }"
                @click="openPayments()"
              >
                <span class="next__label">Pembayaran berikutnya</span>
                <strong class="next__date t-figure">{{ formatDay(nextSchedule.dueDate) }}</strong>
                <span class="next__row">
                  <span class="t-num">{{ formatInstallmentRange([nextSchedule.installmentNumber], overview?.schedules.length) }} · {{ formatRupiah(nextSchedule.amount) }}</span>
                  <StatusBadge size="sm" :tone="isOverdue(nextSchedule) ? 'danger' : 'warning'" :label="isOverdue(nextSchedule) ? 'Terlambat' : 'Belum dibayar'" />
                </span>
              </button>
              <div v-else class="card next next--done">
                <span class="next__label">Pembayaran berikutnya</span>
                <strong class="next__date t-figure">Semua cicilan lunas</strong>
              </div>
            </Reveal>

            <Reveal v-if="overview && remaining > 0" :order="4">
              <section class="card bank" aria-labelledby="bank-title">
                <h2 id="bank-title" class="card__title">Rekening tujuan transfer</h2>

                <div v-if="banksState === 'loading'" class="skel" role="status" aria-label="Memuat rekening tujuan">
                  <Skeleton height="132px" border-radius="14px" />
                </div>

                <div v-else-if="banksState === 'error'" class="bank__empty" role="alert">
                  <span>Rekening belum dapat dimuat.</span>
                  <AppButton size="small" fill="outline" @click="loadBankAccounts()">Coba lagi</AppButton>
                </div>

                <p v-else-if="!bankAccounts.length" class="bank__empty">
                  Admin belum mencantumkan rekening. Tanyakan dulu sebelum mentransfer.
                </p>

                <ul v-else class="list">
                  <li v-for="account in bankAccounts" :key="account.id" class="bank__item">
                    <span class="bank__name">{{ account.bank_name }}</span>
                    <strong class="bank__number t-figure">{{ formatAccountNumber(account.account_number) }}</strong>
                    <small>a.n. {{ account.account_holder }}</small>
                    <small v-if="account.description">{{ account.description }}</small>
                    <button
                      type="button"
                      class="bank__copy"
                      :class="{ 'is-copied': copiedAccountId === account.id }"
                      :aria-label="`Salin nomor rekening ${account.bank_name}`"
                      @click="copyAccountNumber(account)"
                    >
                      <ion-icon :icon="copiedAccountId === account.id ? checkmarkOutline : copyOutline" aria-hidden="true" />
                      {{ copiedAccountId === account.id ? 'Tersalin' : 'Salin nomor' }}
                    </button>
                  </li>
                </ul>
                <span class="sr-only" aria-live="polite">{{ copiedAccountId ? 'Nomor rekening tersalin' : '' }}</span>
              </section>
            </Reveal>

            <SurveyAgendaCard variant="client" />

            <ReviewInvite />
          </div>

          <!-- RIWAYAT PEMBAYARAN -->
          <Reveal v-if="!spkOnly" :order="5" class="area-history">
            <section class="card" aria-labelledby="history-title">
              <div class="card__head">
                <h2 id="history-title" class="card__title">Riwayat pembayaran</h2>
                <button type="button" class="link" @click="openPayments(recentPayments[0]?.id)">Lihat semua</button>
              </div>

              <ul v-if="recentPayments.length" class="list">
                <li v-for="payment in recentPayments" :key="payment.id" class="pay">
                  <span class="pay__copy">
                    <strong>{{ payment.installmentNumbers.length ? formatInstallmentRange(payment.installmentNumbers, overview?.schedules.length) : payment.category }}</strong>
                    <small class="t-num">{{ formatDay(payment.date) }} · {{ payment.method }}</small>
                  </span>
                  <span class="pay__side">
                    <strong class="t-num">{{ formatRupiah(payment.amount) }}</strong>
                    <StatusBadge size="sm" :tone="paymentTone(payment.status)" :label="paymentLabel(payment.status)" />
                  </span>
                </li>
              </ul>

              <EmptyState
                v-else
                kind="payments"
                compact
                title="Belum ada pembayaran"
                description="Pembayaran yang Anda kirim akan tercatat di sini setelah diverifikasi Admin."
              >
                <AppButton size="small" @click="openPayments()">Buka halaman pembayaran</AppButton>
              </EmptyState>
            </section>
          </Reveal>
        </div>

        <!-- v-show: ref tetap ada, dan bagian ini tidak muncul lebih dulu lalu terdorong ke bawah. -->
        <RecommendedLots v-show="!initialLoading" ref="recommendations" class="dash__reco" />
      </main>
    </ion-content>

    <mobile-tab-bar variant="client" />
  </ion-page>
</template>

<style scoped>
.client-content { --background: var(--app-background); }

.dash {
  width: min(100%, var(--container-max));
  margin-inline: auto;
  padding: var(--space-4) var(--page-gutter) calc(var(--bottom-nav-h) + var(--space-12) + var(--safe-bottom));
  color: var(--text-primary);
  font-family: var(--font-ui);
}

.dash__journey:not(:empty),
.dash__block {
  margin-bottom: var(--space-4);
}

.dash__reco { margin-top: var(--space-6); }

.late-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  min-height: 44px;
  padding: 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-weight: 700;
  text-align: left;
  text-decoration: underline;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-select: none;
  user-select: none;
  transition: transform var(--dur-instant) var(--ease-out);
}
.late-link:active { transform: scale(0.97); }

.dash__grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: 'hero' 'rail' 'history';
}
.dash__grid--plain { grid-template-areas: 'rail'; }
.area-hero { grid-area: hero; }
.rail { grid-area: rail; display: grid; gap: var(--space-4); align-content: start; }
.area-history { grid-area: history; }
/* Jarak antarkartu rail sudah diatur gap. */
.rail > .agenda { margin-bottom: 0; }

@media (min-width: 1024px) {
  .dash { padding: var(--space-6) var(--space-8) var(--space-12); }
  .dash__grid {
    gap: var(--space-5);
    grid-template-columns: minmax(0, 1fr) 340px;
    grid-template-areas: 'hero rail' 'history rail';
  }
  /* Pengajuan tanpa transaksi hanya mengisi rail. */
  .dash__grid--plain { grid-template-columns: minmax(0, 1fr); grid-template-areas: 'rail'; }
}

.sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0; }

.icon-btn {
  display: grid;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 1px solid var(--border-default);
  border-radius: var(--radius-sm);
  background: var(--surface-primary);
  color: var(--text-secondary);
  font-size: 20px;
  cursor: pointer;
  transition: color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), transform var(--dur-instant) var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .icon-btn:hover { color: var(--danger-text); border-color: var(--status-danger); }
}
.icon-btn:active { transform: scale(0.94); }

/* ---------- card ---------- */
.card {
  display: block;
  width: 100%;
  min-width: 0;
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--surface-primary);
  color: inherit;
  font: inherit;
  text-align: left;
}
.card__head { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); margin-bottom: var(--space-3); }
.card__title { margin: 0; font-size: var(--text-lg); font-weight: 700; }
.count { display: grid; place-items: center; min-width: 28px; height: 28px; padding: 0 var(--space-2); border-radius: var(--radius-pill); background: var(--green-100); color: var(--green-700); font-size: var(--text-sm); font-weight: 700; }
.link { min-height: 44px; padding: 0 var(--space-2); border: 0; background: none; color: var(--green-700); font: inherit; font-size: var(--text-sm); font-weight: 600; cursor: pointer; }
@media (hover: hover) and (pointer: fine) {
  .link:hover { text-decoration: underline; }
}
.skel { display: grid; gap: var(--space-3); }
.skel__row { display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-3); }

/* ---------- hero (panel penekanan) ---------- */
.hero {
  container-type: inline-size;
  display: grid;
  gap: var(--space-4);
  padding: var(--space-5);
  border-radius: var(--radius-lg);
  background: var(--surface-forest);
  color: var(--on-forest);
}
.hero__top { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-3); }
.hero__lot { min-width: 0; display: grid; gap: var(--space-1); }
.hero__title { margin: 0; font-size: var(--text-3xl); line-height: var(--leading-tight); color: var(--on-forest); overflow-wrap: anywhere; }
.hero__meta { display: flex; flex-wrap: wrap; gap: var(--space-1) var(--space-4); color: var(--on-forest-muted); font-size: var(--text-sm); }

/* Nominal rupiah tidak boleh patah. Di kartu sempit: total memakai lebar penuh,
   sisa menjadi satu baris di bawahnya. Ukuran huruf mengikuti lebar kartu. */
.hero__money { display: grid; gap: var(--space-3); }
.hero__money div { display: grid; gap: var(--space-1); min-width: 0; }
.hero__money div + div { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: var(--space-1) var(--space-3); }
.hero__money small { color: var(--on-forest-muted); font-size: var(--text-xs); }
.hero__money strong { white-space: nowrap; line-height: 1.15; color: var(--gold-100); font-size: 1.75rem; font-size: clamp(1.375rem, 9cqi, 2rem); }
.hero__money .hero__remaining { color: var(--on-forest); font-size: 1.25rem; font-size: clamp(1.0625rem, 6cqi, 1.375rem); }
@container (min-width: 480px) {
  .hero__money { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: var(--space-4); }
  .hero__money div + div { display: grid; justify-content: stretch; align-content: start; }
  .hero__money strong,
  .hero__money .hero__remaining { font-size: clamp(1.375rem, 5cqi, 1.875rem); }
}

.hero__bar { height: 10px; overflow: hidden; border-radius: var(--radius-pill); background: rgba(244, 241, 232, 0.12); }
.hero__fill { display: block; width: 100%; height: 100%; border-radius: var(--radius-pill); background: var(--gold-500); transition: transform var(--dur-slow) var(--ease-out); }
.hero__foot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-2); margin-top: calc(var(--space-2) * -1); color: var(--on-forest-muted); font-size: var(--text-sm); }

.hero__actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); padding-top: var(--space-3); border-top: 1px solid rgba(244, 241, 232, 0.14); }
.hero__note { color: var(--gold-100); font-size: var(--text-sm); }
.hero__link { display: inline-flex; align-items: center; gap: 4px; min-height: 44px; margin-left: auto; padding: 0 var(--space-2); border: 0; background: none; color: var(--gold-100); font: inherit; font-size: var(--text-sm); font-weight: 600; cursor: pointer; }
@media (hover: hover) and (pointer: fine) {
  .hero__link:hover { text-decoration: underline; }
}

/* ---------- pembayaran berikutnya ---------- */
.next { display: grid; gap: var(--space-2); cursor: pointer; border-left: 4px solid var(--gold-500); transition: box-shadow var(--dur-fast) var(--ease-out), transform var(--dur-instant) var(--ease-out); }
.next--done { cursor: default; border-left-color: var(--green-500); }
.next--late { border-left-color: var(--status-danger); }
@media (hover: hover) and (pointer: fine) { .next:not(.next--done):hover { box-shadow: var(--shadow-md); } }
.next:not(.next--done):active { transform: scale(0.99); }
.next__label { color: var(--text-secondary); font-size: var(--text-xs); font-weight: 500; }
.next__date { font-size: var(--text-2xl); line-height: var(--leading-tight); }
.next__row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2); color: var(--text-secondary); font-size: var(--text-sm); }

/* ---------- umpan balik sentuh ---------- */
.icon-btn, .link, .hero__link, .next { touch-action: manipulation; -webkit-tap-highlight-color: transparent; -webkit-user-select: none; user-select: none; }
.link, .hero__link { transition: transform var(--dur-instant) var(--ease-out); }
.link:active, .hero__link:active { transform: scale(0.97); }

@media (prefers-reduced-motion: reduce) {
  .icon-btn, .link, .hero__link, .late-link, .next, .bank__copy, .hero__fill { transition: none; }
  .icon-btn:active, .link:active, .hero__link:active, .late-link:active, .next:not(.next--done):active, .bank__copy:active { transform: none; }
}

/* ---------- list rows ---------- */
.list { display: grid; gap: var(--space-2); margin: 0; padding: 0; list-style: none; }
/* ---------- rekening tujuan ---------- */
.bank { display: grid; gap: var(--space-3); }
.bank__item { display: grid; justify-items: start; gap: 2px; min-width: 0; padding: var(--space-3); border-radius: var(--radius-md); background: var(--surface-muted); }
.bank__name { color: var(--green-700); font-size: var(--text-sm); font-weight: 700; }
.bank__number { max-width: 100%; font-size: var(--text-2xl); line-height: var(--leading-tight); overflow-wrap: anywhere; user-select: all; }
.bank__item small { color: var(--text-secondary); font-size: var(--text-sm); overflow-wrap: anywhere; }
.bank__copy { display: inline-flex; align-items: center; justify-content: center; justify-self: stretch; gap: var(--space-2); min-height: 44px; margin-top: var(--space-2); border: 1px solid var(--green-700); border-radius: var(--radius-sm); background: var(--surface-primary); color: var(--green-700); font: inherit; font-size: var(--text-sm); font-weight: 700; cursor: pointer; touch-action: manipulation; user-select: none; -webkit-user-select: none; -webkit-tap-highlight-color: transparent; transition: background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), transform var(--dur-instant) var(--ease-out); }
.bank__copy.is-copied { background: var(--green-700); color: #fff; }
@media (hover: hover) and (pointer: fine) {
  .bank__copy:not(.is-copied):hover { background: var(--green-100); }
}
.bank__copy:active { transform: scale(0.97); }
.bank__empty { display: grid; justify-items: start; gap: var(--space-2); margin: 0; color: var(--text-secondary); font-size: var(--text-sm); }

/* ---------- riwayat ---------- */
.pay { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); min-height: 60px; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); background: var(--surface-muted); }
.pay__copy { display: grid; min-width: 0; gap: 2px; }
.pay__copy strong { font-size: var(--text-md); font-weight: 600; overflow-wrap: anywhere; }
.pay__copy small { color: var(--text-secondary); font-size: var(--text-sm); }
.pay__side { display: grid; justify-items: end; gap: var(--space-1); flex: none; }
.pay__side strong { font-size: var(--text-md); font-weight: 700; }
</style>
