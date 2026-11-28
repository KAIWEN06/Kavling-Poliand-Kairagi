<template>
  <!-- Nama pengguna sudah ada di header aplikasi, jadi tidak diulang di judul. -->
  <MarketingPageLayout title="Ringkasan tim" tab-variant="head" @refresh="refresh">
    <Reveal :order="1">
      <PeriodFilter :members="members" @change="onRange" />
    </Reveal>

    <div v-if="loading && !report" class="mk-section" role="status" aria-label="Memuat ringkasan tim">
      <Skeleton height="220px" border-radius="20px" />
      <Skeleton v-for="n in 3" :key="n" height="64px" border-radius="14px" />
    </div>
    <StatusIllustration v-else-if="error" :variant="resolveErrorVariant(error)" title="Ringkasan belum dapat dimuat" :on-action="() => load()" />

    <template v-else-if="report">
      <Reveal :order="2">
        <section class="hd-hero" aria-label="Penjualan pada periode">
          <SceneBackdrop :sun="false" :lines="false" height="34%" />
          <div class="hd-hero__body">
            <button type="button" class="hd-hero__cash" @click="go('/kepala-marketing/pembayaran')">
              <span>Kas masuk</span>
              <strong><CountUp :value="formatRupiahShort(s.cash_in)" :duration="900" /></strong>
              <small>Dikonfirmasi Admin, {{ formatDate(report.period.from) }} sampai {{ formatDate(report.period.to) }}</small>
            </button>
            <div class="hd-hero__stats">
              <button type="button" @click="go('/kepala-marketing/spk')">
                <strong>{{ s.spk_approved }}</strong><span>SPK terkonfirmasi</span>
              </button>
              <button type="button" @click="go('/kepala-marketing/laporan')">
                <strong>{{ s.units_sold }}</strong><span>Kaveling terjual</span>
              </button>
              <button type="button" @click="go('/kepala-marketing/komisi')">
                <strong>{{ formatRupiahShort(s.commission_total) }}</strong><span>Komisi tim</span>
              </button>
            </div>
          </div>
        </section>
      </Reveal>

      <Reveal :order="3">
        <section class="mk-section">
          <SectionHeader title="Perlu perhatian" />
          <p v-if="!alerts.length" class="mk-card hd-calm">
            <ion-icon :icon="checkmarkCircleOutline" aria-hidden="true" /> Tidak ada yang tertunda saat ini.
          </p>
          <ul v-else class="hd-list">
            <li v-for="item in alerts" :key="item.label">
              <button type="button" class="hd-row" @click="go(item.path, item.query)">
                <strong :class="['hd-count', { 'is-urgent': item.urgent }]">{{ item.count }}</strong>
                <span><b>{{ item.label }}</b><small>{{ item.hint }}</small></span>
                <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
              </button>
            </li>
          </ul>
        </section>
      </Reveal>

      <ScrollReveal>
        <section class="mk-section">
          <SectionHeader title="Perjalanan klien">
            <button type="button" class="mk-link" @click="go('/kepala-marketing/clients')">Semua klien</button>
          </SectionHeader>
          <p class="mk-muted">{{ s.total_clients }} klien tim pemasaran, {{ s.new_clients }} baru pada periode ini.</p>
          <ul class="hd-list">
            <li v-for="stage in stages" :key="stage.label">
              <button type="button" class="hd-stage" @click="go('/kepala-marketing/clients', { crm: stage.filter })">
                <span>{{ stage.label }}</span>
                <strong>{{ stage.count }}</strong>
                <span class="hd-track" aria-hidden="true">
                  <span :style="{ transform: `scaleX(${stage.count / largestStage})` }" />
                </span>
              </button>
            </li>
          </ul>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section class="mk-section">
          <BarChart title="Nilai kontrak per periode" subtitle="Belum tentu sudah dibayar" orientation="vertical" :items="salesTrend" :formatter="formatRupiahShort" label-header="Periode" value-header="Nilai kontrak" />
          <button type="button" class="mk-btn mk-btn--ghost" @click="go('/kepala-marketing/laporan', { tab: 'performance' })">
            Lihat peringkat {{ s.team_size }} pemasar
          </button>
        </section>
      </ScrollReveal>

      <ScrollReveal>
        <section class="mk-section">
          <SectionHeader title="Aktivitas terbaru">
            <button type="button" class="mk-link" @click="go('/kepala-marketing/perkembangan')">Lihat semua</button>
          </SectionHeader>
          <ActivityFeed :items="activity" :loading="activityLoading" :error="activityError" @open-client="(id) => go(`/kepala-marketing/clients/${id}`)" />
        </section>
      </ScrollReveal>
    </template>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import { computed, onMounted, ref } from 'vue'
import { IonIcon, useIonRouter } from '@ionic/vue'
import { checkmarkCircleOutline, chevronForwardOutline } from 'ionicons/icons'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import PeriodFilter from '@/components/marketing/shared/PeriodFilter.vue'
import Reveal from '@/components/ui/Reveal.vue'
import ScrollReveal from '@/components/ui/ScrollReveal.vue'
import SceneBackdrop from '@/components/ui/SceneBackdrop.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import CountUp from '@/components/ui/CountUp.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import BarChart from '@/components/marketing/shared/BarChart.vue'
import ActivityFeed from '@/components/marketing/shared/ActivityFeed.vue'
import { bucketLabel, useMarketingReport } from '@/composables/useMarketingReport'
import { getMarketingActivity, getTeamMembers, type ActivityItem, type TeamMember } from '@/services/marketing/marketingCrmService'
import { formatDate, formatRupiahShort } from '@/utils/marketingStatus'

const router = useIonRouter()
const { report, loading, error, load, s, crm, range } = useMarketingReport()
const members = ref<TeamMember[]>([])
const activity = ref<ActivityItem[]>([])
const activityLoading = ref(false)
const activityError = ref('')

const salesTrend = computed(() => {
  const r = report.value
  return r ? r.trend.map((t) => ({ label: bucketLabel(t.bucket, r.period.bucket), value: Number(t.contract_value) })) : []
})

/* Hanya yang berjumlah di atas nol, diurutkan dari yang paling mendesak. */
const alerts = computed(() =>
  [
    { count: s.value.installments_overdue, label: 'Cicilan terlambat', hint: formatRupiahShort(s.value.installments_overdue_amount), path: '/kepala-marketing/pembayaran', query: { tab: 'schedules' }, urgent: true },
    { count: s.value.no_followup_7d, label: 'Klien belum dihubungi', hint: 'Lebih dari 7 hari', path: '/kepala-marketing/perkembangan', query: undefined, urgent: true },
    { count: s.value.installments_due_soon, label: 'Cicilan segera jatuh tempo', hint: 'Dalam 7 hari', path: '/kepala-marketing/pembayaran', query: { tab: 'schedules' }, urgent: false },
    { count: s.value.spk_pending, label: 'SPK menunggu Admin', hint: 'Belum diputuskan', path: '/kepala-marketing/spk', query: undefined, urgent: false },
    { count: s.value.payments_pending_count, label: 'Pembayaran menunggu Admin', hint: formatRupiahShort(s.value.payments_pending_amount), path: '/kepala-marketing/pembayaran', query: undefined, urgent: false },
  ].filter((item) => Number(item.count) > 0),
)

/* Pengelompokan mengikuti chip di halaman Klien agar angka dan hasil ketuk sejalan. */
const stages = computed(() => [
  { label: 'Belum dihubungi', filter: 'group:uncontacted', count: crm('Baru') + crm('Belum Dihubungi') },
  { label: 'Tindak lanjut', filter: 'group:followup', count: crm('Sudah Dihubungi') + crm('Follow-up') },
  { label: 'Berminat', filter: 'group:interested', count: crm('Berminat') + crm('Survey Lokasi') + crm('Negosiasi') },
  { label: 'Pengajuan', filter: 'Pengajuan', count: crm('Pengajuan') },
  { label: 'Berhasil', filter: 'Berhasil', count: crm('Berhasil') },
  { label: 'Tidak berlanjut', filter: 'Tidak Lanjut', count: crm('Tidak Lanjut') },
])
const largestStage = computed(() => Math.max(1, ...stages.value.map((stage) => stage.count)))

function go(path: string, query?: Record<string, string>) {
  const qs = query ? `?${new URLSearchParams(query).toString()}` : ''
  router.push(`${path}${qs}`)
}

async function loadActivity({ silent = false }: LoadOptions = {}) {
  if (!silent) {
    activityLoading.value = true
    activityError.value = ''
  }
  try {
    activity.value = await getMarketingActivity(range.value.marketingId, 5)
  } catch (cause) {
    if (!silent) activityError.value = cause instanceof Error ? cause.message : 'Aktivitas gagal dimuat.'
  } finally {
    activityLoading.value = false
  }
}

function onRange(value: { from: string; to: string; marketingId: string | null }) {
  void load(value)
  void loadActivity()
}

function refresh() {
  void load()
  void loadActivity()
}

onMounted(async () => {
  try {
    members.value = (await getTeamMembers()).filter((m) => m.role === 'marketing')
  } catch { /* filter pemasar opsional */ }
})

useRealtimeRefresh(
  ['customers', 'customer_followups', 'customer_crm_status_history', 'lot_transactions', 'spk_requests', 'payments', 'installment_schedules', 'marketing_commissions', 'survey_requests'],
  () => Promise.all([load(undefined, { silent: true }), loadActivity({ silent: true })]),
)
</script>

<style scoped>
button { font: inherit; cursor: pointer; touch-action: manipulation; user-select: none; -webkit-user-select: none; transition: transform var(--dur-instant) var(--ease-out); }
button:active { transform: scale(0.97); }
button:focus-visible { outline: 3px solid var(--poliland-gold); outline-offset: 2px; }
.mk-link { flex: none; min-height: 44px; white-space: nowrap; }

/* Panel hijau: teks hanya putih, --on-forest, atau emas lembut. */
.hd-hero {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  border-radius: var(--radius-lg);
  background:
    radial-gradient(circle at 100% 0%, rgba(203, 160, 68, 0.28) 0%, rgba(203, 160, 68, 0) 62%),
    var(--surface-forest);
  color: var(--on-forest);
  box-shadow: var(--shadow-md);
}
.hd-hero__body { position: relative; z-index: 1; display: grid; gap: var(--space-4); padding: var(--space-6) var(--space-4) var(--space-4); }
.hd-hero button { border: 0; background: none; color: inherit; text-align: left; }
.hd-hero__cash { display: grid; gap: 4px; min-width: 0; padding: 0; }
.hd-hero__cash > span { font-size: var(--text-sm); font-weight: 700; }
.hd-hero__cash strong { color: var(--gold-100); font-family: var(--font-display); font-size: clamp(2.25rem, 11vw, 3.25rem); font-weight: 650; line-height: 1.05; overflow-wrap: anywhere; }
.hd-hero__cash small { font-size: var(--text-xs); line-height: 1.4; }
.hd-hero__stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); border-top: 1px solid rgba(244, 241, 232, 0.2); }
.hd-hero__stats button { display: grid; align-content: start; gap: 2px; min-width: 0; min-height: 64px; padding: var(--space-3) var(--space-2) 0 0; }
.hd-hero__stats strong { color: #fff; font-size: 1.25rem; font-variant-numeric: lining-nums tabular-nums; overflow-wrap: anywhere; }
.hd-hero__stats span { font-size: var(--text-xs); line-height: 1.3; }

.hd-calm { display: flex; align-items: center; gap: var(--space-3); margin: 0; font-size: var(--text-sm); }
.hd-calm ion-icon { flex: none; color: var(--poliland-green); font-size: 24px; }

.hd-list { list-style: none; margin: 0; padding: 0; overflow: hidden; border: 1px solid var(--border-default); border-radius: var(--radius-md); background: var(--surface-primary); box-shadow: var(--shadow-sm); }
.hd-list li + li { border-top: 1px solid var(--border-default); }
.hd-row, .hd-stage { width: 100%; border: 0; background: none; color: var(--text-primary); text-align: left; }
.hd-list button:focus-visible { outline-offset: -3px; }

.hd-row { display: grid; grid-template-columns: 44px minmax(0, 1fr) 18px; align-items: center; gap: var(--space-3); min-height: 68px; padding: var(--space-3) var(--space-4); }
.hd-row > span { display: grid; gap: 2px; min-width: 0; }
.hd-row b { font-size: var(--text-sm); }
.hd-row small { color: var(--text-secondary); font-size: var(--text-xs); }
.hd-row ion-icon { color: var(--text-secondary); font-size: 18px; }
.hd-count { display: grid; place-items: center; min-height: 44px; border-radius: var(--radius-sm); background: var(--surface-muted); font-size: 1.125rem; font-variant-numeric: lining-nums tabular-nums; }
.hd-count.is-urgent { background: var(--gold-100); color: var(--ink); }

.hd-stage { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 8px var(--space-3); min-height: 60px; padding: var(--space-3) var(--space-4); }
.hd-stage > span:first-child { font-size: var(--text-sm); font-weight: 600; }
.hd-stage strong { font-variant-numeric: lining-nums tabular-nums; }
.hd-track { grid-column: 1 / -1; height: 6px; overflow: hidden; border-radius: var(--radius-pill); background: var(--surface-muted); }
.hd-track span { display: block; height: 100%; background: var(--green-700); transform-origin: left; transition: transform var(--dur-slow) var(--ease-out); }

@media (hover: hover) and (pointer: fine) {
  .hd-list button:hover { background: var(--surface-muted); }
}
@media (prefers-reduced-motion: reduce) {
  button:active { transform: none; }
  .hd-track span { transition: none; }
}
</style>
