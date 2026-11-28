<template>
  <ion-page class="pl-marketing marketing-page">
    <AppHeader variant="marketing" title="PoliLand Kairagi" :show-back="false" />

    <ion-content :fullscreen="false" class="marketing-content">
      <main class="dash">
        <!-- 1. Banner -->
        <section class="banner" aria-labelledby="banner-title">
          <p class="banner__date">{{ today }}</p>
          <h1 id="banner-title" class="banner__title">Halo, {{ marketingName }}</h1>
          <button type="button" class="banner__cta" @click="goTo('/marketing/siteplan')">Lihat denah</button>
        </section>

        <!-- 2. Bar komisi -->
        <button type="button" class="commission" aria-label="Lihat detail komisi" @click="goToCommission">
          <span class="commission__total">
            <strong>{{ formattedCommission }}</strong>
            <small>Komisi bulan ini</small>
          </span>
          <span class="commission__split">
            <span>
              <b>{{ formatRupiahShort(s.commission_pending) }}</b>
              <small>Menunggu</small>
            </span>
            <span>
              <b>{{ formatRupiahShort(s.commission_paid) }}</b>
              <small>Dibayarkan</small>
            </span>
          </span>
        </button>

        <!-- 3. Menu -->
        <HomeMenu class="dash__menu" :play="menuPlay" :items="menuItems" label="Menu Marketing" @select="openMenu" />

        <SurveyAgendaCard variant="marketing" />

        <!-- 4. Tenggat pembayaran -->
        <Reveal v-if="dueNotices.length" :order="1">
          <section class="block" aria-label="Tenggat pembayaran">
            <SectionHeader title="Tenggat pembayaran">
              <button type="button" class="link" @click="goTo('/marketing/pembayaran?tab=schedules')">Lihat jadwal</button>
            </SectionHeader>
            <ul class="rows">
              <li v-for="(n, index) in dueNotices" :key="index" class="due">
                <div class="due__top">
                  <strong>{{ n.title }} · {{ n.customer_name || 'Klien' }}</strong>
                  <StatusBadge size="sm" :tone="severityTone(n.severity)" :label="severityLabel(n.severity)" />
                </div>
                <span class="due__body">{{ n.body }}</span>
              </li>
            </ul>
          </section>
        </Reveal>

        <!-- 5. Klien -->
        <Reveal :order="2">
          <section class="block" aria-label="Klien">
            <SectionHeader title="Klien">
              <button type="button" class="link" @click="goTo('/marketing/clients')">Lihat semua</button>
            </SectionHeader>

            <AppNotice v-if="reportError" tone="error">
              {{ reportError }}
            </AppNotice>

            <div v-if="reportLoading && !report" role="status" aria-label="Memuat ringkasan klien">
              <Skeleton height="148px" border-radius="12px" />
            </div>

            <template v-else>
              <div class="funnel" role="img" :aria-label="funnelDescription">
                <span
                  v-for="stage in pipelineStages"
                  v-show="stage.value > 0"
                  :key="stage.key"
                  class="funnel__seg"
                  :class="`funnel__seg--${stage.key}`"
                  :style="{ flexGrow: stage.value }"
                ></span>
              </div>

              <div class="stat-grid">
                <button v-for="item in clientStats" :key="item.label" type="button" class="stat" @click="goTo(item.path)">
                  <strong>{{ item.value }}</strong>
                  <span>{{ item.label }}</span>
                </button>
              </div>
            </template>
          </section>
        </Reveal>

        <!-- 6. Aktivitas -->
        <Reveal :order="3">
          <section class="block" aria-label="Aktivitas terbaru">
            <SectionHeader title="Aktivitas terbaru">
              <button type="button" class="link" @click="goTo('/marketing/tindak-lanjut')">Lihat semua</button>
            </SectionHeader>

            <div v-if="!activitiesLoaded" class="skel-list" role="status" aria-label="Memuat aktivitas">
              <Skeleton v-for="n in 3" :key="n" height="64px" border-radius="12px" />
            </div>

            <ul v-else-if="activities.length" class="rows">
              <li v-for="activity in activities" :key="activity.id" class="activity">
                <span class="activity__avatar" aria-hidden="true">{{ activity.initials }}</span>
                <span class="activity__copy">
                  <strong>{{ activity.name }}</strong>
                  <small>{{ activity.description }}</small>
                </span>
                <span class="activity__meta">
                  <StatusBadge size="sm" :tone="activityTone(activity.statusType)" :label="activity.status" />
                  <time class="t-num">{{ activity.time }}</time>
                </span>
              </li>
            </ul>

            <EmptyState
              v-else
              kind="clients"
              compact
              title="Belum ada aktivitas"
              description="Klien baru dan tindak lanjut muncul di sini."
            >
              <AppButton size="small" @click="goTo('/marketing/clients/new')">Tambah klien</AppButton>
            </EmptyState>
          </section>
        </Reveal>
      </main>

      <!-- Penutup: bukit dan matahari seperti beranda -->
      <div class="dash-footer" aria-hidden="true">
        <SceneBackdrop class="dash-footer__scene" height="100%" :sway="false" />
      </div>
    </ion-content>

    <MobileTabBar variant="marketing" />
  </ion-page>
</template>


<script setup lang="ts">
import { useRealtimeRefresh } from '@/composables/useRealtimeRefresh'
import AppNotice from '@/components/ui/AppNotice.vue'
import {
  IonPage,
  IonContent,
  useIonRouter,
} from '@ionic/vue'

import { computed, onMounted, ref } from 'vue'
import SurveyAgendaCard from '@/components/common/SurveyAgendaCard.vue'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import SceneBackdrop from '@/components/ui/SceneBackdrop.vue'
import HomeMenu from '@/components/home/HomeMenu.vue'
import type { MenuIllustrationName } from '@/components/home/MenuIllustration.vue'
import Reveal from '@/components/ui/Reveal.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import StatusBadge, { type BadgeTone } from '@/components/ui/StatusBadge.vue'

import { supabase } from '@/services/config/supabase'
import { useMarketingReport } from '@/composables/useMarketingReport'
import {
  getMarketingActivity,
  getMarketingNotifications,
  type MarketingNotification,
} from '@/services/marketing/marketingCrmService'
import {
  formatRelative,
  formatRupiahShort,
  initials,
  periodRange,
} from '@/utils/marketingStatus'


/* =====================================================
   ROUTER
   ===================================================== */

const ionRouter = useIonRouter()

const today = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
}).format(new Date())


/* =====================================================
   USER
   ===================================================== */

const marketingName = ref('Pemasar')

async function loadMarketingName() {
  try {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser()

    if (userError) {
      throw userError
    }

    if (!user) {
      throw new Error('Pengguna pemasar tidak ditemukan.')
    }

    const {
      data: profile,
      error: profileError,
    } = await supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle()

    if (profileError) {
      throw profileError
    }

    const fullName = profile?.full_name?.trim()
    if (fullName) {
      marketingName.value = fullName
    }
  } catch (error) {
    console.error(
      '[Beranda pemasar] Gagal memuat nama profil:',
      error,
    )
  }
}


/* =====================================================
   COMMISSION
   ===================================================== */

// Data dari RPC get_marketing_report / get_marketing_activity yang dibatasi ke Marketing login.
const { load: loadReport, report, loading: reportLoading, s, crm, error: reportError } = useMarketingReport()
const totalCommission = computed(() => Number(s.value.commission_total ?? 0))

const formattedCommission = computed(() =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(totalCommission.value),
)


/* =====================================================
   PIPELINE (turunan tampilan dari data laporan)
   ===================================================== */

const pipelineStages = computed(() => [
  { key: 'new', label: 'Belum dihubungi', value: crm('Baru') + crm('Belum Dihubungi') },
  { key: 'followup', label: 'Ditindaklanjuti', value: crm('Sudah Dihubungi') + crm('Follow-up') },
  { key: 'interest', label: 'Berminat', value: crm('Berminat') + crm('Survey Lokasi') + crm('Negosiasi') },
  { key: 'submit', label: 'Pengajuan', value: crm('Pengajuan') },
  { key: 'won', label: 'Berhasil', value: crm('Berhasil') },
  { key: 'lost', label: 'Tidak berlanjut', value: crm('Tidak Lanjut') },
])

const funnelDescription = computed(() =>
  `Sebaran klien: ${pipelineStages.value.map((stage) => `${stage.label} ${stage.value}`).join(', ')}.`,
)

const monthRange = periodRange('month')
const newClientsPath = `/marketing/clients?from=${monthRange.from}&to=${monthRange.to}`

const clientStats = computed(() => [
  { label: 'Total', value: s.value.total_clients ?? '–', path: '/marketing/clients' },
  { label: 'Baru bulan ini', value: s.value.new_clients ?? '–', path: newClientsPath },
  { label: 'Belum dihubungi', value: crm('Baru') + crm('Belum Dihubungi'), path: '/marketing/clients?crm=group:uncontacted' },
  { label: 'Ditindak\u00adlanjuti', value: crm('Sudah Dihubungi') + crm('Follow-up'), path: '/marketing/clients?crm=group:followup' },
  { label: 'Berminat', value: crm('Berminat') + crm('Survey Lokasi') + crm('Negosiasi'), path: '/marketing/clients?crm=group:interested' },
  { label: 'Pengajuan', value: crm('Pengajuan'), path: '/marketing/clients?crm=Pengajuan' },
  { label: 'Berhasil', value: crm('Berhasil'), path: '/marketing/clients?crm=Berhasil' },
  { label: 'Tidak lanjut', value: crm('Tidak Lanjut'), path: '/marketing/clients?crm=Tidak%20Lanjut' },
])

/* ---------- menu ikon ---------- */
const menuItems: { id: MenuIllustrationName; label: string; gold?: boolean }[] = [
  { id: 'denah', label: 'Denah' },
  { id: 'lokasi', label: 'Kaveling', gold: true },
  { id: 'tim', label: 'Klien' },
  { id: 'klien', label: 'Tambah klien', gold: true },
  { id: 'spk', label: 'Status SPK', gold: true },
  { id: 'pembayaran', label: 'Pembayaran' },
  { id: 'minat', label: 'Komisi', gold: true },
  { id: 'ulasan', label: 'Tindak lanjut' },
]
const menuRoutes: Partial<Record<MenuIllustrationName, string>> = {
  denah: '/marketing/siteplan',
  lokasi: '/kavling',
  tim: '/marketing/clients',
  klien: '/marketing/clients/new',
  spk: '/marketing/pengajuan',
  pembayaran: '/marketing/pembayaran',
  minat: '/marketing/komisi',
  ulasan: '/marketing/tindak-lanjut',
}
const menuPlay = ref(false)

function openMenu(id: MenuIllustrationName) {
  const path = menuRoutes[id]
  if (path) goTo(path)
}


/* =====================================================
   RECENT ACTIVITY
   ===================================================== */

const activities = ref<Array<{
  id: number
  initials: string
  name: string
  description: string
  status: string
  statusType: string
  time: string
}>>([])
const activitiesLoaded = ref(false)

const KIND_LABEL: Record<string, { status: string; type: string }> = {
  crm: { status: 'Progres', type: 'prospect' },
  followup: { status: 'Follow-up', type: 'followup' },
  note: { status: 'Catatan', type: 'prospect' },
  spk: { status: 'SPK', type: 'booking' },
}

function activityTone(type: string): BadgeTone {
  if (type === 'followup') return 'warning'
  if (type === 'booking') return 'gold'
  return 'info'
}

async function loadActivities() {
  try {
    const items = await getMarketingActivity(null, 5)
    activities.value = items.map((item, index) => ({
      id: index + 1,
      initials: initials(item.customer_name),
      name: item.customer_name || 'Klien',
      description: item.title,
      status: KIND_LABEL[item.kind]?.status ?? 'Aktivitas',
      statusType: KIND_LABEL[item.kind]?.type ?? 'prospect',
      time: formatRelative(item.occurred_at),
    }))
  } catch (error) {
    console.error('[Beranda Marketing] Gagal memuat aktivitas:', error)
  } finally {
    activitiesLoaded.value = true
  }
}

const dueNotices = ref<MarketingNotification[]>([])

function severityTone(severity: MarketingNotification['severity']): BadgeTone {
  if (severity === 'danger') return 'danger'
  if (severity === 'warning') return 'warning'
  if (severity === 'success') return 'success'
  return 'info'
}

function severityLabel(severity: MarketingNotification['severity']) {
  if (severity === 'danger') return 'Terlambat'
  if (severity === 'warning') return 'Segera'
  if (severity === 'success') return 'Lunas'
  return 'Info'
}

async function loadDueNotices() {
  try {
    const notifications = await getMarketingNotifications(40)
    dueNotices.value = notifications
      .filter((n) => n.kind === 'installment_overdue' || n.kind === 'installment_due_soon')
      .slice(0, 4)
  } catch (error) {
    console.error('[Beranda Marketing] Gagal memuat tenggat:', error)
  }
}

onMounted(() => {
  // Dua frame agar menu punya keadaan awal untuk dianimasikan.
  requestAnimationFrame(() => requestAnimationFrame(() => { menuPlay.value = true }))
  loadMarketingName()
  void loadReport({ ...monthRange, marketingId: null })
  void loadActivities()
  void loadDueNotices()
})


/* =====================================================
   NAVIGATION
   ===================================================== */

function goTo(path: string) {
  ionRouter.push(path)
}

function goToCommission() {
  ionRouter.push('/marketing/komisi')
}

useRealtimeRefresh(
  ['customers', 'customer_followups', 'customer_crm_status_history', 'lot_transactions', 'spk_requests', 'payments', 'installment_schedules', 'marketing_commissions', 'survey_requests', 'lots'],
  () => Promise.all([loadReport(undefined, { silent: true }), loadActivities(), loadDueNotices()]),
)

</script>


<style scoped>
.marketing-content { --background: var(--surface-primary); --padding-bottom: 0px; }
.marketing-content::part(scroll) { overflow-x: hidden; }

.dash {
  width: min(100%, 720px);
  margin-inline: auto;
  padding: 0 20px 8px;
  color: var(--text-primary);
  font-family: var(--font-ui);
}

button { touch-action: manipulation; -webkit-tap-highlight-color: transparent; user-select: none; -webkit-user-select: none; }
button:focus-visible { outline: 3px solid var(--poliland-green); outline-offset: 2px; }

/* ---------- banner (sama dengan Beranda Admin) ---------- */
.banner {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  margin: 12px -8px 0;
  padding: 16px 20px 20px;
  border-radius: var(--radius-card);
  background:
    radial-gradient(120% 90% at 100% 0%, rgba(203, 160, 68, 0.3), rgba(203, 160, 68, 0) 62%),
    var(--surface-forest);
  color: var(--on-forest);
}
.banner__date { margin: 0; color: var(--poliland-gold-soft); font-size: var(--text-sm); }
.banner__title { margin: 8px 0 0; font-family: var(--font-display); font-size: clamp(27px, 7.6vw, 38px); font-weight: 650; line-height: 1.12; letter-spacing: -0.02em; overflow-wrap: anywhere; }
.banner__cta { min-height: 44px; margin-top: 16px; padding: 0 20px; border: 0; border-radius: var(--radius-control); background: var(--poliland-gold); color: var(--ink); font: 700 14px/1 var(--font-ui); cursor: pointer; }
.banner__cta:focus-visible { outline-color: #fff; }

/* ---------- bar komisi: nilai di atas label ---------- */
.commission {
  display: block;
  width: calc(100% + 16px);
  margin: 10px -8px 0;
  padding: 0;
  border: 1px solid var(--border-default);
  border-radius: 12px;
  background: var(--surface-primary);
  box-shadow: var(--shadow-sm);
  color: var(--text-secondary);
  font: inherit;
  text-align: center;
  cursor: pointer;
}
.commission span { display: block; min-width: 0; }
.commission small { display: block; font-size: 12px; }
.commission strong,
.commission b { display: block; color: var(--poliland-green); font-family: var(--font-display); font-weight: 650; font-variant-numeric: tabular-nums; overflow-wrap: anywhere; }
.commission .commission__total { padding: 12px 8px; }
.commission strong { font-size: 26px; line-height: 1.15; }
.commission .commission__split { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); border-top: 1px solid var(--border-default); }
.commission__split > span { padding: 10px 6px; }
.commission__split > span + span { border-left: 1px solid var(--border-default); }
.commission b { font-size: 18px; }
.commission:active { transform: scale(0.99); }

.dash__menu { margin: 0 -12px 8px; }
.block { padding-top: 24px; }

.link { min-height: 44px; padding: 0 4px; border: 0; background: none; color: var(--poliland-green); font: inherit; font-size: 13px; font-weight: 700; cursor: pointer; }
@media (hover: hover) and (pointer: fine) {
  .link:hover { text-decoration: underline; }
}

/* ---------- baris data dipisah garis tipis ---------- */
.rows { margin: 0; padding: 0; list-style: none; }
.rows > li + li { border-top: 1px solid var(--border-default); }

.due { display: grid; gap: 4px; padding: 12px 0; }
.due__top { display: flex; align-items: flex-start; justify-content: space-between; gap: 8px; }
.due__top strong { min-width: 0; font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
.due__body { color: var(--text-secondary); font-size: 13px; line-height: 1.45; }

/* ---------- klien ---------- */
.funnel { display: flex; gap: 3px; height: 8px; margin-bottom: 12px; overflow: hidden; border-radius: var(--radius-pill); background: var(--surface-muted); }
.funnel__seg { min-width: 6px; border-radius: var(--radius-pill); flex-basis: 0; transition: flex-grow var(--dur-slow) var(--ease-out); }
.funnel__seg--new { background: var(--border-strong); }
.funnel__seg--followup { background: #7FA6F0; }
.funnel__seg--interest { background: var(--gold-500); }
.funnel__seg--submit { background: var(--green-500); }
.funnel__seg--won { background: var(--green-800); }
.funnel__seg--lost { background: #E58B84; }

/* Delapan angka dalam satu kotak 4x2 berpembatas 1px. */
.stat-grid { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 1px; overflow: hidden; border: 1px solid var(--border-default); border-radius: 12px; background: var(--border-default); }
.stat { display: flex; min-width: 0; min-height: 70px; flex-direction: column; align-items: center; gap: 2px; padding: 10px 2px; border: 0; background: var(--surface-primary); color: var(--text-secondary); font: inherit; cursor: pointer; }
.stat strong { color: var(--poliland-green); font-family: var(--font-display); font-size: 20px; font-weight: 650; line-height: 1.15; font-variant-numeric: tabular-nums; }
.stat span { max-width: 100%; font-size: 11px; line-height: 1.3; text-align: center; hyphens: manual; overflow-wrap: break-word; }
.stat:active { background: var(--green-50); }
.stat:focus-visible { outline-offset: -3px; }

.skel-list { display: grid; gap: 12px; }

/* ---------- aktivitas ---------- */
.activity { display: grid; grid-template-columns: 40px minmax(0, 1fr) auto; align-items: center; gap: 12px; min-height: 64px; padding: 10px 0; }
.activity__avatar { display: grid; place-items: center; width: 40px; height: 40px; border-radius: var(--radius-pill); background: var(--green-50); color: var(--poliland-green); font-size: 13px; font-weight: 700; }
.activity__copy { display: grid; min-width: 0; gap: 2px; }
.activity__copy strong { overflow: hidden; font-size: 14px; font-weight: 600; text-overflow: ellipsis; white-space: nowrap; }
.activity__copy small { overflow: hidden; color: var(--text-secondary); font-size: 13px; text-overflow: ellipsis; white-space: nowrap; }
.activity__meta { display: grid; justify-items: end; gap: 4px; }
.activity__meta time { color: var(--text-secondary); font-size: 12px; white-space: nowrap; }

/* ---------- footer: sama dengan beranda ---------- */
.dash-footer { position: relative; height: calc(200px + var(--safe-bottom)); overflow: hidden; background: linear-gradient(180deg, var(--surface-primary) 0%, var(--pl-paper) 55%); }
.dash-footer__scene :deep(.sun) { top: 0; right: -90px; width: 260px; height: 200px; background: radial-gradient(closest-side, rgba(244, 214, 154, 0.7), rgba(244, 214, 154, 0)); }

@media (max-width: 360px) { .dash { padding-inline: 16px; } .banner, .commission { margin-inline: -4px; } .commission { width: calc(100% + 8px); } }

@media (prefers-reduced-motion: reduce) {
  .funnel__seg { transition: none; }
  .commission:active { transform: none; }
}
</style>
