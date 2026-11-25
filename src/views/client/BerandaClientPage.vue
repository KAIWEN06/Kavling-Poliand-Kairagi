<script setup lang="ts">
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
  checkmarkCircle,
  chevronForward,
  documentTextOutline,
  logOutOutline,
} from 'ionicons/icons'

import { authService } from '@/services/auth/authService'
import SurveyAgendaCard from '@/components/common/SurveyAgendaCard.vue'
import {
  getClientSpks,
  type ClientSpkDocumentKey,
  type ClientSpkRecord,
} from '@/services/clientSpkService'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Reveal from '@/components/ui/Reveal.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import StatusBadge, { type BadgeTone } from '@/components/ui/StatusBadge.vue'
import { useClientPurchaseOverview } from '@/composables/useClientPurchaseOverview'
import { formatInstallmentRange, formatRupiah as formatRupiahId } from '@/utils/installmentFormat'

const router = useRouter()
const clientName = ref('Pembeli')
const clientSpks = ref<ClientSpkRecord[]>([])
const documentsLoaded = ref(false)

const documentFields: Array<{ key: ClientSpkDocumentKey; label: string }> = [
  { key: 'ktp', label: 'KTP' },
  { key: 'kk', label: 'KK' },
  { key: 'npwp', label: 'NPWP' },
  { key: 'paymentProof', label: 'Bukti Pembayaran' },
]

const uploadedDocumentLabels = computed(() => {
  const uploadedKeys = new Set<ClientSpkDocumentKey>()

  for (const spk of clientSpks.value) {
    for (const { key } of documentFields) {
      if (spk.documents[key]) uploadedKeys.add(key)
    }
  }

  return documentFields
    .filter(({ key }) => uploadedKeys.has(key))
    .map(({ label }) => label)
})

const uploadedDocumentCount = computed(() => uploadedDocumentLabels.value.length)

async function loadClientDocuments() {
  try {
    clientSpks.value = await getClientSpks()
  } catch (error) {
    console.error('[Beranda Klien] Gagal memuat dokumen dari Supabase:', error)
    clientSpks.value = []
  } finally {
    documentsLoaded.value = true
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
  overview,
  otherLotCount,
  remaining,
  progressPercent,
  paidInstallments,
  nextSchedule,
  load: loadPurchase,
} = useClientPurchaseOverview()

function formatRupiah(value: number) {
  return formatRupiahId(value)
}

function formatDay(value: string | null) {
  if (!value) return 'Belum dijadwalkan'
  const date = new Date(`${value.slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) return '-'
  return new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function isOverdue(schedule: { dueDate: string | null; status: string } | null) {
  if (!schedule) return false
  if (schedule.status === 'Overdue') return true
  if (!schedule.dueDate) return false
  return new Date(`${schedule.dueDate.slice(0, 10)}T23:59:59`).getTime() < Date.now()
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
  if (o.finalPrice > 0 && remaining.value === 0) return { tone: 'success', label: 'Lunas' }
  if (isOverdue(nextSchedule.value)) return { tone: 'danger', label: 'Ada cicilan terlambat' }
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

onIonViewWillEnter(() => {
  void loadClientDocuments()
  void loadPurchase()
})

async function logout() {
  await authService.logout()
  await router.replace('/login')
}

function goTo(path: string) {
  void router.push(path)
}
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

        <div class="dash__grid">
          <!-- PROPERTI + PROGRES PEMBAYARAN -->
          <Reveal :order="1" class="area-hero">
            <section aria-labelledby="purchase-title">
              <div v-if="purchaseLoading && !overview" class="card" role="status" aria-label="Memuat data pembelian">
                <div class="skel">
                  <Skeleton width="45%" height="36px" border-radius="8px" />
                  <Skeleton height="12px" border-radius="6px" />
                  <div class="skel__row"><Skeleton height="56px" /><Skeleton height="56px" /></div>
                </div>
              </div>

              <AppNotice v-else-if="purchaseError" tone="error" title="Data pembelian belum dapat dimuat">
                <p>{{ purchaseError }}</p>
<AppButton size="small" @click="loadPurchase">Coba lagi</AppButton>
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
                  <span class="hero__fill" :style="{ width: `${progressPercent}%` }"></span>
                </div>

                <div class="hero__foot">
                  <span class="t-num">{{ progressPercent }}% dari {{ formatRupiah(overview.finalPrice) }}</span>
                  <span v-if="overview.schedules.length" class="t-num">{{ paidInstallments }} dari {{ overview.schedules.length }} lunas</span>
                </div>

                <div class="hero__actions">
                  <StatusBadge :tone="paymentStateBadge.tone" :label="paymentStateBadge.label" />
                  <span v-if="overview.pendingCount" class="hero__note">{{ overview.pendingCount }} pembayaran menunggu verifikasi Admin</span>
                  <button type="button" class="hero__link" @click="goTo('/client/pembayaran')">
                    Lihat pembayaran <ion-icon :icon="chevronForward" aria-hidden="true" />
                  </button>
                </div>

                <button v-if="otherLotCount" type="button" class="hero__more" @click="goTo('/client/kavling')">
                  +{{ otherLotCount }} kaveling lainnya
                </button>
              </div>
            </section>
          </Reveal>

          <!-- RAIL: berikutnya, survei, dokumen -->
          <div class="rail">
            <Reveal :order="2">
              <button
                v-if="overview && nextSchedule"
                type="button"
                class="card next"
                :class="{ 'next--late': isOverdue(nextSchedule) }"
                @click="goTo('/client/pembayaran')"
              >
                <span class="next__label">Pembayaran berikutnya</span>
                <strong class="next__date t-figure">{{ formatDay(nextSchedule.dueDate) }}</strong>
                <span class="next__row">
                  <span class="t-num">{{ formatInstallmentRange([nextSchedule.installmentNumber], overview?.schedules.length) }} · {{ formatRupiah(nextSchedule.amount) }}</span>
                  <StatusBadge size="sm" :tone="isOverdue(nextSchedule) ? 'danger' : 'warning'" :label="isOverdue(nextSchedule) ? 'Terlambat' : 'Belum dibayar'" />
                </span>
              </button>
              <div v-else-if="overview && overview.schedules.length" class="card next next--done">
                <span class="next__label">Pembayaran berikutnya</span>
                <strong class="next__date t-figure">Semua cicilan lunas</strong>
              </div>
            </Reveal>

            <Reveal :order="3">
              <SurveyAgendaCard variant="client" />
            </Reveal>

            <Reveal :order="4">
              <button type="button" class="card docs" @click="goTo('/client/dokumen')">
                <span class="row__icon"><ion-icon :icon="documentTextOutline" aria-hidden="true" /></span>
                <span class="docs__copy">
                  <strong>Dokumen saya</strong>
                  <small v-if="!documentsLoaded">Memuat dokumen…</small>
                  <small v-else-if="uploadedDocumentCount > 0">{{ uploadedDocumentLabels.join(', ') }}</small>
                  <small v-else>Belum ada dokumen diunggah</small>
                  <span v-if="documentsLoaded && uploadedDocumentCount > 0" class="docs__ok">
                    <ion-icon :icon="checkmarkCircle" aria-hidden="true" />
                    {{ uploadedDocumentCount }} jenis dokumen diunggah
                  </span>
                </span>
                <ion-icon class="docs__chev" :icon="chevronForward" aria-hidden="true" />
              </button>
            </Reveal>
          </div>

          <!-- RIWAYAT PEMBAYARAN -->
          <Reveal :order="5" class="area-history">
            <section class="card" aria-labelledby="history-title">
              <div class="card__head">
                <h2 id="history-title" class="card__title">Riwayat pembayaran</h2>
                <button type="button" class="link" @click="goTo('/client/pembayaran')">Lihat semua</button>
              </div>

              <div v-if="purchaseLoading && !overview" class="skel" role="status" aria-label="Memuat riwayat pembayaran">
                <Skeleton v-for="n in 3" :key="n" height="60px" border-radius="14px" />
              </div>

              <ul v-else-if="recentPayments.length" class="list">
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
                <AppButton size="small" @click="goTo('/client/pembayaran')">Buka halaman pembayaran</AppButton>
              </EmptyState>
            </section>
          </Reveal>
        </div>
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

.dash__grid {
  display: grid;
  gap: var(--space-4);
  grid-template-columns: minmax(0, 1fr);
  grid-template-areas: 'hero' 'rail' 'history';
}
.area-hero { grid-area: hero; }
.rail { grid-area: rail; display: grid; gap: var(--space-4); align-content: start; }
.area-history { grid-area: history; }

@media (min-width: 1024px) {
  .dash { padding: var(--space-6) var(--space-8) var(--space-12); }
  .dash__grid {
    gap: var(--space-5);
    grid-template-columns: minmax(0, 1fr) 340px;
    grid-template-areas: 'hero rail' 'history rail';
  }
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

.hero__money { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: var(--space-4); }
.hero__money div { display: grid; gap: var(--space-1); }
.hero__money small { color: var(--on-forest-muted); font-size: var(--text-xs); }
.hero__money strong { font-size: clamp(1.375rem, 1.1rem + 1.3vw, 1.875rem); line-height: 1.1; color: var(--gold-100); overflow-wrap: anywhere; }
.hero__money .hero__remaining { color: var(--on-forest); }

.hero__bar { height: 10px; overflow: hidden; border-radius: var(--radius-pill); background: rgba(244, 241, 232, 0.12); }
.hero__fill { display: block; height: 100%; border-radius: var(--radius-pill); background: var(--gold-500); transition: width var(--dur-slow) var(--ease-out); }
.hero__foot { display: flex; flex-wrap: wrap; justify-content: space-between; gap: var(--space-2); margin-top: calc(var(--space-2) * -1); color: var(--on-forest-muted); font-size: var(--text-sm); }

.hero__actions { display: flex; flex-wrap: wrap; align-items: center; gap: var(--space-2) var(--space-3); padding-top: var(--space-3); border-top: 1px solid rgba(244, 241, 232, 0.14); }
.hero__note { color: var(--gold-100); font-size: var(--text-sm); }
.hero__link { display: inline-flex; align-items: center; gap: 4px; min-height: 44px; margin-left: auto; padding: 0 var(--space-2); border: 0; background: none; color: var(--gold-100); font: inherit; font-size: var(--text-sm); font-weight: 600; cursor: pointer; }
@media (hover: hover) and (pointer: fine) {
  .hero__link:hover { text-decoration: underline; }
}
.hero__more { justify-self: start; min-height: 44px; border: 0; background: none; color: var(--on-forest-muted); font: inherit; font-size: var(--text-sm); text-decoration: underline; cursor: pointer; }

/* ---------- pembayaran berikutnya ---------- */
.next { display: grid; gap: var(--space-2); cursor: pointer; border-left: 4px solid var(--gold-500); transition: box-shadow var(--dur-fast) var(--ease-out), transform var(--dur-instant) var(--ease-out); }
.next--done { cursor: default; border-left-color: var(--green-500); }
.next--late { border-left-color: var(--status-danger); }
@media (hover: hover) { .next:not(.next--done):hover { box-shadow: var(--shadow-md); } }
.next:not(.next--done):active { transform: scale(0.99); }
.next__label { color: var(--text-secondary); font-size: var(--text-xs); font-weight: 500; }
.next__date { font-size: var(--text-2xl); line-height: var(--leading-tight); }
.next__row { display: flex; flex-wrap: wrap; align-items: center; justify-content: space-between; gap: var(--space-2); color: var(--text-secondary); font-size: var(--text-sm); }

/* ---------- list rows ---------- */
.list { display: grid; gap: var(--space-2); margin: 0; padding: 0; list-style: none; }
.row {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  min-height: 60px;
  padding: var(--space-2) var(--space-3);
  border: 0;
  border-radius: var(--radius-md);
  background: var(--surface-muted);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: background var(--dur-fast) var(--ease-out), transform var(--dur-instant) var(--ease-out);
}
@media (hover: hover) and (pointer: fine) {
  .row:hover { background: var(--surface-sunken); }
}
.row:active { transform: scale(0.99); }
.row__icon { display: grid; place-items: center; flex: none; width: 40px; height: 40px; border-radius: var(--radius-sm); background: var(--green-100); color: var(--green-700); font-size: 19px; }
.row__copy { display: grid; min-width: 0; gap: 2px; }
.row__copy strong { font-size: var(--text-md); font-weight: 600; }
.row__copy small { color: var(--text-secondary); font-size: var(--text-sm); }

/* ---------- dokumen ---------- */
.docs { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; align-items: center; gap: var(--space-3); cursor: pointer; transition: border-color var(--dur-fast) var(--ease-out), transform var(--dur-instant) var(--ease-out); }
@media (hover: hover) and (pointer: fine) {
  .docs:hover { border-color: var(--green-500); }
}
.docs:active { transform: scale(0.99); }
.docs__copy { display: grid; gap: 2px; min-width: 0; }
.docs__copy strong { font-size: var(--text-md); font-weight: 600; }
.docs__copy small { color: var(--text-secondary); font-size: var(--text-sm); overflow-wrap: anywhere; }
.docs__ok { display: inline-flex; align-items: center; gap: 4px; color: var(--green-700); font-size: var(--text-xs); font-weight: 600; }
.docs__chev { color: var(--text-tertiary); }

/* ---------- riwayat ---------- */
.pay { display: flex; align-items: center; justify-content: space-between; gap: var(--space-3); min-height: 60px; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md); background: var(--surface-muted); }
.pay__copy { display: grid; min-width: 0; gap: 2px; }
.pay__copy strong { font-size: var(--text-md); font-weight: 600; overflow-wrap: anywhere; }
.pay__copy small { color: var(--text-secondary); font-size: var(--text-sm); }
.pay__side { display: grid; justify-items: end; gap: var(--space-1); flex: none; }
.pay__side strong { font-size: var(--text-md); font-weight: 700; }
</style>
