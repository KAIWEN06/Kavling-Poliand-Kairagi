<template>
  <ion-page class="marketing-page">
    <AppHeader variant="marketing" title="PoliLand Kairagi" :show-back="false" />

    <ion-content :fullscreen="false" class="marketing-content">
      <main class="dash">
        <Reveal :order="0">
          <PageHeader :title="`Halo, ${marketingName}`" :subtitle="`Marketing · ${today}`" />
        </Reveal>

        <div class="dash__grid">
          <!-- KOMISI -->
          <Reveal :order="1" class="area-commission">
            <button type="button" class="commission" @click="goToCommission">
              <span class="commission__label">Total komisi saya</span>
              <strong class="commission__value t-figure">{{ formattedCommission }}</strong>
              <span class="commission__split">
                <span>
                  <small>Menunggu</small>
                  <b class="t-num">{{ formatRupiahShort(s.commission_pending) }}</b>
                </span>
                <span>
                  <small>Dibayarkan</small>
                  <b class="t-num">{{ formatRupiahShort(s.commission_paid) }}</b>
                </span>
              </span>
              <span class="commission__go">Lihat detail <span aria-hidden="true">›</span></span>
            </button>
          </Reveal>

          <!-- TENGGAT PEMBAYARAN -->
          <Reveal v-if="dueNotices.length" :order="2" class="area-due">
            <section class="card" aria-labelledby="due-title">
              <div class="card__head">
                <h2 id="due-title" class="card__title">Tenggat pembayaran client</h2>
                <button type="button" class="link" @click="goTo('/marketing/pembayaran?tab=schedules')">Lihat jadwal</button>
              </div>
              <ul class="rows">
                <li v-for="(n, index) in dueNotices" :key="index" class="due" :class="`due--${n.severity}`">
                  <div class="due__top">
                    <strong>{{ n.title }} · {{ n.customer_name || 'Client' }}</strong>
                    <StatusBadge size="sm" :tone="severityTone(n.severity)" :label="severityLabel(n.severity)" />
                  </div>
                  <span class="due__body">{{ n.body }}</span>
                </li>
              </ul>
            </section>
          </Reveal>

          <!-- PIPELINE -->
          <Reveal :order="3" class="area-pipeline">
            <section class="card" aria-labelledby="pipeline-title">
              <div class="card__head">
                <h2 id="pipeline-title" class="card__title">Pipeline client bulan ini</h2>
                <button type="button" class="link" @click="goTo('/marketing/clients')">Semua client</button>
              </div>

              <p v-if="reportError" class="alert" role="alert">{{ reportError }}</p>

              <template v-if="reportLoading && !report">
                <div class="skel-grid" role="status" aria-label="Memuat ringkasan client">
                  <Skeleton v-for="n in 8" :key="n" height="104px" border-radius="14px" />
                </div>
              </template>

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
                  <StatCard label="Total client saya" :value="s.total_clients ?? '–'" clickable @open="goTo('/marketing/clients')" />
                  <StatCard label="Client baru (bulan ini)" :value="s.new_clients ?? '–'" clickable @open="goTo('/marketing/clients?crm=Baru')" />
                  <StatCard label="Belum dihubungi" :value="crm('Baru') + crm('Belum Dihubungi')" clickable @open="goTo('/marketing/clients?crm=Belum%20Dihubungi')" />
                  <StatCard label="Follow-up" :value="crm('Sudah Dihubungi') + crm('Follow-up')" clickable @open="goTo('/marketing/clients?crm=Follow-up')" />
                  <StatCard label="Berminat" :value="crm('Berminat') + crm('Survey Lokasi') + crm('Negosiasi')" clickable @open="goTo('/marketing/clients?crm=Berminat')" />
                  <StatCard label="Dalam pengajuan" :value="crm('Pengajuan')" clickable @open="goTo('/marketing/clients?crm=Pengajuan')" />
                  <StatCard label="Berhasil" :value="crm('Berhasil')" clickable @open="goTo('/marketing/clients?crm=Berhasil')" />
                  <StatCard label="Tidak lanjut" :value="crm('Tidak Lanjut')" clickable @open="goTo('/marketing/clients?crm=Tidak%20Lanjut')" />
                </div>
              </template>
            </section>
          </Reveal>

          <!-- PINTASAN -->
          <Reveal :order="4" class="area-shortcuts">
            <section class="card" aria-labelledby="shortcut-title">
              <h2 id="shortcut-title" class="card__title">Pintasan</h2>
              <div class="shortcuts">
                <button v-for="item in shortcuts" :key="item.path" type="button" class="shortcut" @click="goTo(item.path)">
                  <span class="shortcut__icon"><IonIcon :icon="item.icon" aria-hidden="true" /></span>
                  <span class="shortcut__label">{{ item.label }}</span>
                </button>
              </div>
            </section>
          </Reveal>

          <!-- AKTIVITAS -->
          <Reveal :order="5" class="area-activity">
            <section class="card" aria-labelledby="activity-title">
              <div class="card__head">
                <h2 id="activity-title" class="card__title">Aktivitas terbaru</h2>
                <button type="button" class="link" @click="goTo('/marketing/tindak-lanjut')">Lihat semua</button>
              </div>

              <div v-if="!activitiesLoaded" class="skel-list" role="status" aria-label="Memuat aktivitas">
                <Skeleton v-for="n in 3" :key="n" height="64px" border-radius="14px" />
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
                description="Catat client baru atau tindak lanjut, dan riwayatnya muncul di sini."
              >
                <AppButton size="small" @click="goTo('/marketing/clients/new')">Tambah calon pembeli</AppButton>
              </EmptyState>
            </section>
          </Reveal>
        </div>
      </main>
    </ion-content>

    <MobileTabBar variant="marketing" />
  </ion-page>
</template>


<script setup lang="ts">
import {
  IonPage,
  IonContent,
  IonIcon,
  useIonRouter,
} from '@ionic/vue'
import {
  callOutline,
  gitNetworkOutline,
  gridOutline,
  informationCircleOutline,
  personAddOutline,
  personOutline,
} from 'ionicons/icons'

import { computed, onMounted, ref } from 'vue'

import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Reveal from '@/components/ui/Reveal.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import StatCard from '@/components/ui/StatCard.vue'
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

const marketingName = ref('Marketing')

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
      throw new Error('Pengguna marketing tidak ditemukan.')
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
      '[Beranda Marketing] Gagal memuat nama profil:',
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
  { key: 'followup', label: 'Follow-up', value: crm('Sudah Dihubungi') + crm('Follow-up') },
  { key: 'interest', label: 'Berminat', value: crm('Berminat') + crm('Survey Lokasi') + crm('Negosiasi') },
  { key: 'submit', label: 'Pengajuan', value: crm('Pengajuan') },
  { key: 'won', label: 'Berhasil', value: crm('Berhasil') },
  { key: 'lost', label: 'Tidak lanjut', value: crm('Tidak Lanjut') },
])

const funnelDescription = computed(() =>
  `Pipeline client: ${pipelineStages.value.map((stage) => `${stage.label} ${stage.value}`).join(', ')}.`,
)

const shortcuts = [
  { label: 'Kavling', path: '/kavling', icon: gridOutline },
  { label: 'Siteplan', path: '/siteplan', icon: gitNetworkOutline },
  { label: 'Calon pembeli', path: '/marketing/clients', icon: personOutline },
  { label: 'Tindak lanjut', path: '/marketing/tindak-lanjut', icon: personAddOutline },
  { label: 'Informasi proyek', path: '/progress', icon: informationCircleOutline },
  { label: 'Kontak', path: '/contact', icon: callOutline },
]


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
  crm: { status: 'Perkembangan', type: 'prospect' },
  followup: { status: 'Tindak Lanjut', type: 'followup' },
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
      name: item.customer_name || 'Client',
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
  loadMarketingName()
  const range = periodRange('month')
  void loadReport({ ...range, marketingId: null })
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
</script>


<style scoped>
.marketing-content { --background: var(--app-background); }
.marketing-content::part(scroll) { overflow-x: hidden; }

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
  grid-template-areas: 'commission' 'due' 'pipeline' 'shortcuts' 'activity';
}
.area-commission { grid-area: commission; }
.area-due { grid-area: due; }
.area-pipeline { grid-area: pipeline; }
.area-shortcuts { grid-area: shortcuts; }
.area-activity { grid-area: activity; }

@media (min-width: 1024px) {
  .dash { padding: var(--space-6) var(--space-8) var(--space-12); }
  .dash__grid {
    gap: var(--space-5);
    grid-template-columns: minmax(0, 1fr) 340px;
    grid-template-areas:
      'commission due'
      'pipeline shortcuts'
      'activity shortcuts';
  }
}

/* ---------- card ---------- */
.card {
  min-width: 0;
  padding: var(--space-4);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-lg);
  background: var(--surface-primary);
}
.card__head {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-2) var(--space-4);
  margin-bottom: var(--space-3);
}
.card__title { margin: 0; font-size: var(--text-lg); font-weight: 700; line-height: var(--leading-snug); }
.card > .card__title { margin-bottom: var(--space-3); }
.link {
  min-height: 44px;
  padding: 0 var(--space-2);
  border: 0;
  background: none;
  color: var(--green-700);
  font: inherit;
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
}
.link:hover { text-decoration: underline; }
.alert {
  margin: 0 0 var(--space-3);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--danger-bg);
  color: var(--danger-text);
  font-size: var(--text-sm);
}

/* ---------- komisi (panel penekanan) ---------- */
.commission {
  display: grid;
  gap: var(--space-2);
  width: 100%;
  padding: var(--space-5);
  border: 0;
  border-radius: var(--radius-lg);
  background: var(--surface-forest);
  color: var(--on-forest);
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform var(--dur-instant) var(--ease-out), box-shadow var(--dur-fast) var(--ease-out);
}
@media (hover: hover) { .commission:hover { box-shadow: var(--shadow-md); } }
.commission:active { transform: scale(0.99); }
.commission__label { color: var(--on-forest-muted); font-size: var(--text-md); font-weight: 600; }
.commission__value {
  font-size: clamp(2rem, 1.5rem + 2.6vw, 3.25rem);
  line-height: 1.05;
  color: var(--gold-100);
  overflow-wrap: anywhere;
}
.commission__split {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2) var(--space-8);
  margin-top: var(--space-3);
  padding-top: var(--space-3);
  border-top: 1px solid rgba(244, 241, 232, 0.14);
}
.commission__split span { display: grid; gap: 2px; }
.commission__split small { color: var(--on-forest-muted); font-size: var(--text-xs); }
.commission__split b { font-size: var(--text-lg); font-weight: 600; }
.commission__go { margin-top: var(--space-1); color: var(--gold-100); font-size: var(--text-sm); font-weight: 600; }

/* ---------- list rows ---------- */
.rows { display: grid; gap: var(--space-2); margin: 0; padding: 0; list-style: none; }

.due {
  display: grid;
  gap: var(--space-1);
  padding: var(--space-3);
  border-left: 3px solid var(--text-tertiary);
  border-radius: var(--radius-sm);
  background: var(--surface-muted);
}
.due--danger { border-left-color: var(--status-danger); background: var(--danger-bg); }
.due--warning { border-left-color: var(--gold-500); background: var(--warning-bg); }
.due__top { display: flex; align-items: flex-start; justify-content: space-between; gap: var(--space-2); }
.due__top strong { font-size: var(--text-md); font-weight: 600; min-width: 0; overflow-wrap: anywhere; }
.due__body { color: var(--text-secondary); font-size: var(--text-sm); line-height: 1.4; }

/* ---------- pipeline ---------- */
.funnel {
  display: flex;
  gap: 3px;
  height: 10px;
  margin-bottom: var(--space-4);
  overflow: hidden;
  border-radius: var(--radius-pill);
  background: var(--surface-sunken);
}
.funnel__seg { min-width: 6px; border-radius: var(--radius-pill); flex-basis: 0; transition: flex-grow var(--dur-slow) var(--ease-out); }
.funnel__seg--new { background: var(--border-strong); }
.funnel__seg--followup { background: #7FA6F0; }
.funnel__seg--interest { background: var(--gold-500); }
.funnel__seg--submit { background: var(--green-500); }
.funnel__seg--won { background: var(--green-800); }
.funnel__seg--lost { background: #E58B84; }

.stat-grid, .skel-grid { display: grid; gap: var(--space-3); grid-template-columns: repeat(2, minmax(0, 1fr)); }
@media (min-width: 720px) { .stat-grid, .skel-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); } }
.skel-list { display: grid; gap: var(--space-3); }

/* ---------- pintasan ---------- */
.shortcuts { display: grid; gap: var(--space-2); grid-template-columns: repeat(3, minmax(0, 1fr)); }
@media (min-width: 1024px) { .shortcuts { grid-template-columns: 1fr; } }
.shortcut {
  display: grid;
  justify-items: center;
  align-content: center;
  gap: var(--space-2);
  min-height: 84px;
  padding: var(--space-3) var(--space-2);
  border: 1px solid var(--border-default);
  border-radius: var(--radius-md);
  background: var(--surface-primary);
  color: var(--text-primary);
  font: inherit;
  cursor: pointer;
  transition: border-color var(--dur-fast) var(--ease-out), transform var(--dur-instant) var(--ease-out);
}
.shortcut:hover { border-color: var(--green-500); }
.shortcut:active { transform: scale(0.97); }
.shortcut__icon {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-sm);
  background: var(--green-100);
  color: var(--green-700);
  font-size: 20px;
}
.shortcut__label { font-size: var(--text-sm); font-weight: 600; text-align: center; line-height: 1.25; }
@media (min-width: 1024px) {
  .shortcut { grid-template-columns: 40px 1fr; justify-items: start; min-height: 60px; padding: var(--space-2) var(--space-3); }
  .shortcut__label { text-align: left; font-size: var(--text-md); }
}

/* ---------- aktivitas ---------- */
.activity {
  display: grid;
  grid-template-columns: 40px minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--space-3);
  min-height: 64px;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-md);
  background: var(--surface-muted);
}
.activity__avatar {
  display: grid;
  place-items: center;
  width: 40px;
  height: 40px;
  border-radius: var(--radius-pill);
  background: var(--green-100);
  color: var(--green-700);
  font-size: var(--text-sm);
  font-weight: 700;
}
.activity__copy { display: grid; min-width: 0; gap: 2px; }
.activity__copy strong { font-size: var(--text-md); font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.activity__copy small { color: var(--text-secondary); font-size: var(--text-sm); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.activity__meta { display: grid; justify-items: end; gap: var(--space-1); }
.activity__meta time { color: var(--text-secondary); font-size: var(--text-xs); white-space: nowrap; }
</style>
