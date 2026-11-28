<template>
  <MarketingPageLayout title="Progres klien" tab-variant="head" @refresh="load">
    <Reveal :order="2">
      <label class="mk-field mk-narrow">
        <span>Pemasar</span>
        <select v-model="marketingId" class="mk-input" @change="loadActivity()">
          <option value="">Semua pemasar</option>
          <option v-for="m in members" :key="m.id" :value="m.id">{{ m.full_name }}</option>
        </select>
      </label>
    </Reveal>

    <SkeletonRowList v-if="loading" :rows="5" :fields="3" :badges="[2]" label="Memuat perkembangan klien" />
    <StatusIllustration v-else-if="error" :variant="resolveErrorVariant(error)" title="Data belum dapat dimuat" :on-action="() => load()" />

    <template v-else>
      <section class="mk-section">
        <div class="mk-section-head">
          <div><h2>Perlu tindak lanjut</h2><p>{{ stale.length }} klien aktif belum dihubungi</p></div>
          <select v-model.number="staleDays" class="mk-input mk-small" aria-label="Lama tanpa kontak">
            <option :value="3">3 hari</option><option :value="7">7 hari</option><option :value="14">14 hari</option><option :value="30">30 hari</option>
          </select>
        </div>
        <StatusIllustration v-if="!stale.length" variant="success" size="sm" title="Tidak ada yang tertinggal" :description="`Semua klien aktif dihubungi dalam ${staleDays} hari terakhir.`" />
        <div v-else class="mk-table-wrap">
          <table class="mk-table mk-table--stack">
            <thead><tr><th>Klien</th><th>Pemasar</th><th>Status</th><th>Terakhir dihubungi</th></tr></thead>
            <tbody>
              <tr v-for="c in stale.slice(0, staleLimit)" :key="c.id" class="mk-row-link" @click="openClient(c.id)">
                <td class="mk-cell-main"><button type="button" class="mk-cell-link" @click.stop="openClient(c.id)">{{ c.full_name }}</button></td>
                <td data-label="Pemasar">{{ c.marketing_name || 'Belum ada' }}</td>
                <td data-label="Status"><StatusBadge :label="crmStatusLabel(c.crm_status)" :tone="CRM_TONE[c.crm_status]" /></td>
                <td data-label="Terakhir dihubungi" class="mk-danger-text">{{ c.last_contacted_at ? formatDate(c.last_contacted_at) : `Belum pernah (sejak ${formatDate(c.created_at)})` }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <button v-if="stale.length > staleLimit" type="button" class="mk-btn mk-btn--ghost" @click="staleLimit += 10">Tampilkan lebih banyak</button>
      </section>

      <section class="mk-section">
        <div class="mk-section-head"><div><h2>Klien per status</h2></div></div>
        <div class="mk-chips" role="group" aria-label="Filter status perkembangan">
          <button type="button" class="mk-chip" :aria-pressed="status === ''" @click="status = ''">Semua ({{ scoped.length }})</button>
          <button v-for="st in usedStatuses" :key="st" type="button" class="mk-chip" :aria-pressed="status === st" @click="status = st">
            {{ crmStatusLabel(st) }} ({{ scoped.filter((c) => c.crm_status === st).length }})
          </button>
        </div>
        <StatusIllustration v-if="!byStatus.length" variant="empty-data" size="sm" title="Belum ada klien" description="Tidak ada klien pada status ini." />
        <div v-else class="mk-table-wrap">
          <table class="mk-table mk-table--stack">
            <thead><tr><th>Klien</th><th>Pemasar</th><th>Status</th><th>Terakhir dihubungi</th><th>SPK</th></tr></thead>
            <tbody>
              <tr v-for="c in byStatus.slice(0, limit)" :key="c.id" class="mk-row-link" @click="openClient(c.id)">
                <td class="mk-cell-main"><button type="button" class="mk-cell-link" @click.stop="openClient(c.id)">{{ c.full_name }}</button></td>
                <td data-label="Pemasar">{{ c.marketing_name || 'Belum ada' }}</td>
                <td data-label="Status"><StatusBadge :label="crmStatusLabel(c.crm_status)" :tone="CRM_TONE[c.crm_status]" /></td>
                <td data-label="Terakhir dihubungi">{{ c.last_contacted_at ? formatRelative(c.last_contacted_at) : 'Belum pernah' }}</td>
                <td data-label="SPK"><StatusBadge :label="spkLabel(c.latest_spk_status)" :tone="spkTone(c.latest_spk_status)" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <button v-if="byStatus.length > limit" type="button" class="mk-btn mk-btn--ghost" @click="limit += 20">Tampilkan lebih banyak</button>
      </section>

      <section class="mk-section">
        <div class="mk-section-head"><div><h2>Aktivitas tim</h2></div></div>
        <ActivityFeed :items="activity" :loading="activityLoading" :error="activityError" @open-client="openClient" />
      </section>
    </template>
  </MarketingPageLayout>
</template>

<script setup lang="ts">
import { useRealtimeRefresh, type LoadOptions } from '@/composables/useRealtimeRefresh'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { resolveErrorVariant } from '@/components/ui/state/stateRegistry'
import SkeletonRowList from '@/components/ui/skeletons/SkeletonRowList.vue'
import Reveal from '@/components/ui/Reveal.vue'
import { computed, onMounted, ref } from 'vue'
import { useIonRouter } from '@ionic/vue'
import MarketingPageLayout from '@/components/marketing/shared/MarketingPageLayout.vue'
import StatusBadge from '@/components/ui/StatusBadge.vue'
import ActivityFeed from '@/components/marketing/shared/ActivityFeed.vue'
import {
  getMarketingActivity,
  getTeamMembers,
  listClients,
  type ActivityItem,
  type ClientListItem,
  type TeamMember,
} from '@/services/marketing/marketingCrmService'
import { CRM_STATUSES, CRM_TONE, crmStatusLabel, formatDate, formatRelative, spkLabel, spkTone } from '@/utils/marketingStatus'

const router = useIonRouter()
const clients = ref<ClientListItem[]>([])
const members = ref<TeamMember[]>([])
const activity = ref<ActivityItem[]>([])
const loading = ref(true)
const loaded = ref(false)
const error = ref('')
const activityLoading = ref(false)
const activityError = ref('')
const marketingId = ref('')
const status = ref('')
const staleDays = ref(7)
const limit = ref(20)
const staleLimit = ref(10)

const scoped = computed(() => clients.value.filter((c) => !marketingId.value || c.marketing_id === marketingId.value))
/* Hanya status yang berisi; status yang sedang dipilih tetap tampil walau kosong. */
const usedStatuses = computed(() =>
  CRM_STATUSES.filter((st) => st === status.value || scoped.value.some((c) => c.crm_status === st)),
)
const byStatus = computed(() => scoped.value.filter((c) => !status.value || c.crm_status === status.value))
const stale = computed(() => {
  const cutoff = Date.now() - staleDays.value * 86400000
  return scoped.value
    .filter((c) => c.crm_status !== 'Berhasil' && c.crm_status !== 'Tidak Lanjut')
    .filter((c) => new Date(c.last_contacted_at || c.created_at).getTime() < cutoff)
    .sort((a, b) => String(a.last_contacted_at || a.created_at).localeCompare(String(b.last_contacted_at || b.created_at)))
})

function openClient(id: number) {
  router.push(`/kepala-marketing/clients/${id}`)
}

async function loadActivity({ silent = false }: LoadOptions = {}) {
  if (!silent) {
    activityLoading.value = true
    activityError.value = ''
  }
  try {
    activity.value = await getMarketingActivity(marketingId.value || null, 30)
  } catch (cause) {
    if (!silent) activityError.value = cause instanceof Error ? cause.message : 'Aktivitas gagal dimuat.'
  } finally {
    activityLoading.value = false
  }
}

async function load({ silent = false }: LoadOptions = {}) {
  if (!loaded.value) loading.value = true
  error.value = ''
  try {
    const [rows, team] = await Promise.all([listClients(), getTeamMembers()])
    clients.value = rows
    members.value = team.filter((m) => m.role === 'marketing')
    loaded.value = true
  } catch (cause) {
    if (!silent || !loaded.value) error.value = cause instanceof Error ? cause.message : 'Periksa koneksi, lalu coba lagi.'
  } finally {
    loading.value = false
  }
  await loadActivity({ silent })
}

onMounted(load)

useRealtimeRefresh(
  ['customers', 'customer_followups', 'customer_crm_status_history', 'lot_transactions', 'spk_requests', 'profiles'],
  () => load({ silent: true }),
)

</script>

<style scoped>
.mk-narrow { max-width: 320px; }
.mk-small { width: auto; min-width: 110px; }
</style>
