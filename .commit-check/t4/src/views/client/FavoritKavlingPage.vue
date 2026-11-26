<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import FavoriteButton from '@/components/client/FavoriteButton.vue'
import AppButton from '@/components/ui/AppButton.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Reveal from '@/components/ui/Reveal.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { useFavorites } from '@/composables/useFavorites'
import { useRealtimeRefresh } from '@/composables/useRealtimeRefresh'
import { useToast } from '@/composables/useToast'
import { askNotificationPermission } from '@/composables/useNotificationPrompt'
import { favoriteService, type FavoriteLot } from '@/services/favoriteService'
import { formatCurrency, getStatusLabel, normalizeLotStatus } from '@/utils/siteplan'

const MAX_COMPARE = 3

const router = useRouter()
const toast = useToast()
const { ids, status, load } = useFavorites()

const lots = ref<FavoriteLot[]>([])
const lotsLoaded = ref(false)
const lotsFailed = ref(false)
const compareIds = ref<number[]>([])
let requestVersion = 0

async function loadLots() {
  const version = ++requestVersion
  try {
    const rows = await favoriteService.getLots([...ids.value])
    if (version !== requestVersion) return
    lots.value = rows
    lotsFailed.value = false
    lotsLoaded.value = true
  } catch (error) {
    console.error('[Favorit] Gagal memuat data kavling:', error)
    if (version === requestVersion) lotsFailed.value = true
  }
}

/* null: fiturnya belum ada atau statusnya belum terbaca, sakelar disembunyikan. */
const alertsEnabled = ref<boolean | null>(null)
const alertsSaving = ref(false)

async function loadAlerts() {
  try {
    alertsEnabled.value = await favoriteService.getAlertsEnabled()
  } catch (error) {
    console.error('[Favorit] Gagal membaca pengaturan notifikasi:', error)
  }
}

async function toggleAlerts(event: Event) {
  const input = event.target as HTMLInputElement
  const next = input.checked
  alertsSaving.value = true
  try {
    await favoriteService.setAlertsEnabled(next)
    alertsEnabled.value = next
    if (next) {
      void askNotificationPermission('Supaya kabar kavling favorit sampai ke HP Anda.', { requested: true })
    }
  } catch (error) {
    console.error('[Favorit] Gagal menyimpan pengaturan notifikasi:', error)
    input.checked = !next
    toast.error('Pengaturan notifikasi belum tersimpan. Coba lagi.')
  } finally {
    alertsSaving.value = false
  }
}

async function refresh() {
  await load()
  if (status.value === 'ready') await Promise.all([loadLots(), loadAlerts()])
}

onIonViewWillEnter(() => void refresh())
useRealtimeRefresh(['lots'], () => (status.value === 'ready' ? loadLots() : Promise.resolve()))

/* Yang dihapus langsung hilang; data diambil lagi hanya bila ada ID baru. */
watch(ids, (list) => {
  compareIds.value = compareIds.value.filter((id) => list.includes(id))
  if (status.value === 'ready' && list.some((id) => !lots.value.some((lot) => lot.id === id))) void loadLots()
})

const visibleLots = computed(() => lots.value.filter((lot) => ids.value.includes(lot.id)))
const compared = computed(() =>
  compareIds.value.flatMap((id) => visibleLots.value.find((lot) => lot.id === id) ?? []),
)

const isLoading = computed(() =>
  status.value === 'idle' || status.value === 'loading' || (status.value === 'ready' && !lotsLoaded.value && !lotsFailed.value),
)

/* Sama dengan halaman detail: info kavling terjual tidak ditampilkan. */
function isSold(lot: FavoriteLot) {
  return normalizeLotStatus(lot.status) === 'sold'
}
function priceText(lot: FavoriteLot) {
  return !isSold(lot) && lot.price ? formatCurrency(lot.price) : '-'
}
function areaText(lot: FavoriteLot) {
  return !isSold(lot) && lot.area ? `${lot.area.toLocaleString('id-ID')} m²` : '-'
}

const compareRows: Array<{ label: string; value: (lot: FavoriteLot) => string }> = [
  { label: 'Status', value: (lot) => getStatusLabel(lot.status) },
  { label: 'Harga', value: priceText },
  { label: 'Luas tanah', value: areaText },
  { label: 'Dimensi', value: (lot) => (!isSold(lot) && lot.dimension ? lot.dimension : '-') },
  {
    label: 'Harga per m²',
    value: (lot) => (!isSold(lot) && lot.price && lot.area ? formatCurrency(Math.round(lot.price / lot.area)) : '-'),
  },
]

function toggleCompare(id: number) {
  if (compareIds.value.includes(id)) compareIds.value = compareIds.value.filter((item) => item !== id)
  else if (compareIds.value.length < MAX_COMPARE) compareIds.value = [...compareIds.value, id]
}

function openLot(id: number) {
  void router.push(`/client/kavling/${id}`)
}
</script>

<template>
  <ion-page>
    <AppHeader variant="client" title="PoliLand Kairagi" :show-back="false" />

    <ion-content :fullscreen="true">
      <main class="favp">
        <Reveal :order="0">
          <PageHeader
            title="Kavling Impian"
            subtitle="Pilih 2 atau 3 kavling untuk dibandingkan."
            show-back
            back-fallback="/client/kavling"
            back-label="Daftar kaveling"
          />
        </Reveal>

        <label v-if="status === 'ready' && alertsEnabled !== null" class="favp__alerts">
          <span>
            <strong>Kabari perubahan status</strong>
            <small>Paling banyak sekali sehari.</small>
          </span>
          <input type="checkbox" role="switch" :checked="alertsEnabled" :disabled="alertsSaving" @change="toggleAlerts" />
        </label>

        <div v-if="isLoading" class="favp__list" role="status" aria-label="Memuat favorit">
          <Skeleton v-for="n in 3" :key="n" height="150px" border-radius="16px" />
        </div>

        <StatusIllustration
          v-else-if="status === 'unavailable'"
          variant="empty-data"
          title="Favorit belum aktif"
          description="Fitur ini sedang disiapkan. Silakan coba lagi nanti."
        />

        <StatusIllustration
          v-else-if="status === 'error' || (lotsFailed && !lotsLoaded)"
          variant="empty-data"
          title="Favorit belum bisa dimuat"
          description="Periksa koneksi internet, lalu coba lagi."
          action-label="Coba lagi"
          :on-action="refresh"
        />

        <StatusIllustration
          v-else-if="!ids.length"
          variant="empty-data"
          title="Belum ada kavling tersimpan"
          description="Tekan Simpan di halaman kavling yang Anda suka."
          action-label="Lihat kavling"
          :on-action="() => router.push('/client/kavling')"
        />

        <template v-else>
          <ul class="favp__list">
            <li v-for="(lot, index) in visibleLots" :key="lot.id">
              <Reveal :order="Math.min(index + 1, 8)" :step="0.06">
                <article class="favp__card">
                  <div class="favp__head">
                    <div>
                      <h2>{{ lot.lotNumber }}</h2>
                      <p>{{ [lot.blockName, areaText(lot) === '-' ? '' : areaText(lot)].filter(Boolean).join(' · ') }}</p>
                    </div>
                    <FavoriteButton :lot-id="lot.id" :lot-label="lot.lotNumber" />
                  </div>

                  <div class="favp__price">
                    <strong v-if="priceText(lot) !== '-'">{{ priceText(lot) }}</strong>
                    <span :class="['favp__status', `is-${normalizeLotStatus(lot.status)}`]">
                      {{ getStatusLabel(lot.status) }}
                    </span>
                  </div>

                  <div class="favp__actions">
                    <label
                      class="favp__compare"
                      :class="{ 'is-disabled': compareIds.length >= MAX_COMPARE && !compareIds.includes(lot.id) }"
                    >
                      <input
                        type="checkbox"
                        :checked="compareIds.includes(lot.id)"
                        :disabled="compareIds.length >= MAX_COMPARE && !compareIds.includes(lot.id)"
                        @change="toggleCompare(lot.id)"
                      />
                      <span>Bandingkan</span>
                    </label>
                    <AppButton size="small" @click="openLot(lot.id)">Lihat detail</AppButton>
                  </div>
                </article>
              </Reveal>
            </li>
          </ul>

          <p v-if="compareIds.length === 1" class="favp__hint" role="status">Pilih satu kavling lagi.</p>

          <section v-if="compared.length >= 2" class="favp__table-card" aria-labelledby="compare-title">
            <h2 id="compare-title">Perbandingan</h2>
            <table :style="{ '--cols': compared.length }">
              <thead>
                <tr>
                  <th v-for="lot in compared" :key="lot.id" scope="col">{{ lot.lotNumber }}</th>
                </tr>
              </thead>
              <!-- Label di barisnya sendiri agar 3 kolom tetap muat di layar 360px. -->
              <tbody v-for="row in compareRows" :key="row.label">
                <tr>
                  <th class="favp__row-label" :colspan="compared.length" scope="rowgroup">{{ row.label }}</th>
                </tr>
                <tr>
                  <td v-for="lot in compared" :key="lot.id">{{ row.value(lot) }}</td>
                </tr>
              </tbody>
            </table>
          </section>
        </template>
      </main>
    </ion-content>

    <MobileTabBar variant="client" />
  </ion-page>
</template>

<style scoped>
.favp {
  display: grid;
  align-content: start;
  gap: var(--space-4, 16px);
  width: min(100%, 720px);
  margin-inline: auto;
  padding: 16px 16px calc(112px + env(safe-area-inset-bottom, 0px));
  color: var(--text-primary, #252525);
  font-family: var(--font-primary, 'Plus Jakarta Sans', sans-serif);
}

.favp__alerts {
  display: flex;
  min-height: 56px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 16px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #fff);
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.favp__alerts > span {
  display: grid;
  gap: 2px;
  font-size: 14px;
}

.favp__alerts small {
  color: var(--text-secondary, #5f5f66);
  font-size: 12px;
}

.favp__alerts input {
  position: relative;
  flex: 0 0 auto;
  width: 48px;
  height: 28px;
  margin: 0;
  appearance: none;
  border-radius: var(--radius-pill, 999px);
  background: #8a8a90;
  cursor: pointer;
}

.favp__alerts input::after {
  content: '';
  position: absolute;
  top: 3px;
  left: 3px;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  background: #fff;
  transition: transform 160ms var(--ease-out, ease-out);
}

.favp__alerts input:checked {
  background: var(--poliland-green, #355a2c);
}

.favp__alerts input:checked::after {
  transform: translateX(20px);
}

.favp__alerts input:focus-visible {
  outline: 3px solid var(--poliland-green, #355a2c);
  outline-offset: 2px;
}

@media (prefers-reduced-motion: reduce) {
  .favp__alerts input::after { transition: none; }
}

.favp__list {
  display: grid;
  gap: 12px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.favp__card,
.favp__table-card {
  padding: 16px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 2px 8px rgba(37, 37, 37, 0.04);
}

.favp__card {
  display: grid;
  gap: 12px;
}

.favp__head,
.favp__price,
.favp__actions {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.favp__price {
  flex-wrap: wrap;
}

.favp h2 {
  margin: 0;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: 20px;
  font-weight: 700;
  line-height: 1.25;
}

.favp__head p {
  margin: 2px 0 0;
  color: var(--text-secondary, #5f5f66);
  font-size: 13px;
}

.favp__price strong {
  color: var(--poliland-green, #355a2c);
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.favp__status {
  padding: 5px 10px;
  border-radius: var(--radius-pill, 999px);
  background: var(--surface-muted, #f5f3ee);
  color: var(--text-primary, #252525);
  font-size: 12px;
  font-weight: 700;
}

.favp__status.is-available {
  background: var(--status-success-bg, #eef5ec);
  color: var(--poliland-green, #355a2c);
}

.favp__compare {
  display: inline-flex;
  min-height: 44px;
  align-items: center;
  gap: 8px;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.favp__compare input {
  width: 22px;
  height: 22px;
  margin: 0;
  accent-color: var(--poliland-green, #355a2c);
}

.favp__compare.is-disabled {
  color: var(--text-secondary, #5f5f66);
  opacity: 0.6;
  cursor: not-allowed;
}

.favp__hint {
  margin: 0;
  color: var(--text-secondary, #5f5f66);
  font-size: 13px;
  text-align: center;
}

.favp__table-card table {
  width: 100%;
  margin-top: 12px;
  border-collapse: collapse;
  table-layout: fixed;
  text-align: center;
  font-variant-numeric: tabular-nums;
}

.favp__table-card th,
.favp__table-card td {
  padding: 6px 4px;
  overflow-wrap: anywhere;
}

.favp__table-card thead th {
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: 16px;
}

.favp__table-card .favp__row-label {
  padding-top: 10px;
  border-top: 1px solid var(--border-default, #eae7e0);
  color: var(--text-secondary, #5f5f66);
  font-size: 12px;
  font-weight: 700;
}

.favp__table-card td {
  padding-bottom: 10px;
  font-size: 13px;
  font-weight: 700;
}
</style>
