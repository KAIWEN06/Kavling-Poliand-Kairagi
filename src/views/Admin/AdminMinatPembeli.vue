<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { IonContent, IonIcon, IonPage, onIonViewWillEnter } from '@ionic/vue'
import { trashOutline } from 'ionicons/icons'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppNotice from '@/components/ui/AppNotice.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Reveal from '@/components/ui/Reveal.vue'
import { useConfirm } from '@/composables/useConfirm'
import { useToast } from '@/composables/useToast'
import { FUNNEL_STAGES, getFunnelSummary } from '@/services/funnelService'
import { formatDistance, isHighlightsUnavailable, lotHighlightService, type LotHighlight } from '@/services/lotHighlightService'
import { lotService } from '@/services/lotService'

const toast = useToast()
const { confirm } = useConfirm()

/* ---------- ringkasan tahap pembelian ---------- */

const PERIODS = [7, 30, 90]
const days = ref(30)
const counts = ref<Record<string, number>>({})
const funnelState = ref<'loading' | 'ready' | 'unavailable' | 'error'>('loading')
let funnelRequest = 0

async function loadFunnel() {
  const request = ++funnelRequest
  if (funnelState.value !== 'ready') funnelState.value = 'loading'
  try {
    const result = await getFunnelSummary(days.value)
    if (request !== funnelRequest) return
    counts.value = result
    funnelState.value = 'ready'
  } catch (error) {
    console.error('[Minat] Gagal memuat ringkasan:', error)
    if (request !== funnelRequest) return
    funnelState.value = (error as { code?: string })?.code === 'PGRST202' ? 'unavailable' : 'error'
  }
}

watch(days, loadFunnel)

const maxCount = computed(() => Math.max(1, ...FUNNEL_STAGES.map((s) => counts.value[s.key] ?? 0)))
const hasEvents = computed(() => FUNNEL_STAGES.some((s) => counts.value[s.key]))

/* ---------- fasilitas terdekat ---------- */

const lots = ref<Array<{ id: number; label: string }>>([])
const highlights = ref<LotHighlight[]>([])
const highlightState = ref<'loading' | 'ready' | 'unavailable' | 'error'>('loading')
const form = ref({ lotId: null as number | null, facility: '', distance: '' })
const saving = ref(false)
const formError = ref('')

async function loadHighlights() {
  try {
    const [rows, lotRows] = await Promise.all([lotHighlightService.list(), lotService.getClientLots()])
    highlights.value = rows
    lots.value = lotRows
      .map((lot: any) => ({
        id: Number(lot.id),
        label: [lot.block?.name ?? lot.blocks?.name, lot.lot_number].filter(Boolean).join(' · ') || `Kavling ${lot.id}`,
      }))
      .sort((a, b) => a.label.localeCompare(b.label, 'id', { numeric: true }))
    highlightState.value = 'ready'
  } catch (error) {
    console.error('[Minat] Gagal memuat fasilitas:', error)
    if (isHighlightsUnavailable(error)) highlightState.value = 'unavailable'
    else if (highlightState.value !== 'ready') highlightState.value = 'error'
  }
}

onIonViewWillEnter(() => {
  void loadFunnel()
  void loadHighlights()
})

const lotLabel = (id: number) => lots.value.find((lot) => lot.id === id)?.label ?? `Kavling ${id}`
const facilityNames = computed(() => [...new Set(highlights.value.map((item) => item.facility))].sort())
const sortedHighlights = computed(() =>
  [...highlights.value].sort((a, b) =>
    lotLabel(a.lotId).localeCompare(lotLabel(b.lotId), 'id', { numeric: true }) || a.distanceM - b.distanceM),
)

async function addHighlight() {
  const distanceM = Number(form.value.distance.replace(/\D/g, ''))
  const facility = form.value.facility.trim()
  if (!form.value.lotId || facility.length < 2 || distanceM < 1 || distanceM > 50000) {
    formError.value = 'Pilih kavling, isi nama fasilitas, dan jarak antara 1 sampai 50.000 meter.'
    return
  }
  saving.value = true
  formError.value = ''
  try {
    await lotHighlightService.add({ lotId: form.value.lotId, facility, distanceM })
    form.value.distance = ''
    await loadHighlights()
    toast.success('Fasilitas tersimpan.')
  } catch (error) {
    console.error('[Minat] Gagal menyimpan fasilitas:', error)
    formError.value = (error as { code?: string })?.code === '23505'
      ? 'Fasilitas ini sudah tercatat untuk kavling tersebut. Hapus dulu bila jaraknya perlu diganti.'
      : 'Fasilitas belum tersimpan. Coba lagi.'
  } finally {
    saving.value = false
  }
}

async function removeHighlight(item: LotHighlight) {
  const ok = await confirm({
    title: 'Hapus fasilitas ini?',
    message: `${item.facility} pada ${lotLabel(item.lotId)} tidak akan tampil lagi ke pembeli.`,
    confirmText: 'Hapus',
    tone: 'error',
  })
  if (!ok) return
  try {
    await lotHighlightService.remove(item.id)
    highlights.value = highlights.value.filter((row) => row.id !== item.id)
  } catch (error) {
    console.error('[Minat] Gagal menghapus fasilitas:', error)
    toast.error('Fasilitas belum terhapus. Coba lagi.')
  }
}
</script>

<template>
  <ion-page>
    <AppHeader variant="admin" title="PoliLand Kairagi" :show-back="false" />

    <ion-content :fullscreen="true">
      <main class="mnt">
        <Reveal :order="0">
          <PageHeader title="Minat pembeli" show-back back-fallback="/admin/lainnya" back-label="Lainnya" />
        </Reveal>

        <Reveal :order="1">
          <section class="mnt__card" aria-labelledby="funnel-title">
            <h2 id="funnel-title">Tahap pembelian</h2>
            <p class="mnt__help">Jumlah sesi aplikasi pembeli yang sampai di tiap tahap. Tidak menyimpan nama atau akun.</p>

            <div class="mnt__periods" role="group" aria-label="Rentang waktu">
              <button v-for="period in PERIODS" :key="period" type="button" :aria-pressed="days === period" @click="days = period">
                {{ period }} hari
              </button>
            </div>

            <p v-if="funnelState === 'loading'" class="mnt__help" role="status">Memuat ringkasan...</p>
            <AppNotice v-else-if="funnelState === 'unavailable'" tone="info">
              Jalankan migrasi 202611300016 untuk mulai mencatat.
            </AppNotice>
            <div v-else-if="funnelState === 'error'">
              <AppNotice tone="error">Ringkasan belum bisa dimuat.</AppNotice>
              <AppButton size="small" @click="loadFunnel">Coba lagi</AppButton>
            </div>
            <p v-else-if="!hasEvents" class="mnt__help">Belum ada catatan pada rentang ini.</p>
            <ol v-else class="mnt__funnel">
              <li v-for="stage in FUNNEL_STAGES" :key="stage.key">
                <div>
                  <span>{{ stage.label }}</span>
                  <strong>{{ (counts[stage.key] ?? 0).toLocaleString('id-ID') }}</strong>
                </div>
                <span class="mnt__bar" aria-hidden="true">
                  <span :style="{ transform: `scaleX(${(counts[stage.key] ?? 0) / maxCount})` }"></span>
                </span>
              </li>
            </ol>
          </section>
        </Reveal>

        <Reveal :order="2">
          <section class="mnt__card" aria-labelledby="near-title">
            <h2 id="near-title">Fasilitas terdekat</h2>
            <p class="mnt__help">Isi dengan jarak hasil pengukuran. Pembeli melihatnya di halaman kavling.</p>

            <p v-if="highlightState === 'loading'" class="mnt__help" role="status">Memuat data...</p>
            <AppNotice v-else-if="highlightState === 'unavailable'" tone="info">
              Jalankan migrasi 202611300014 untuk mengisi fasilitas.
            </AppNotice>
            <div v-else-if="highlightState === 'error'">
              <AppNotice tone="error">Data fasilitas belum bisa dimuat.</AppNotice>
              <AppButton size="small" @click="loadHighlights">Coba lagi</AppButton>
            </div>

            <template v-else>
              <form class="mnt__form" novalidate @submit.prevent="addHighlight">
                <label>
                  <span>Kavling</span>
                  <select v-model="form.lotId">
                    <option :value="null">Pilih kavling</option>
                    <option v-for="lot in lots" :key="lot.id" :value="lot.id">{{ lot.label }}</option>
                  </select>
                </label>
                <label>
                  <span>Nama fasilitas</span>
                  <input v-model="form.facility" type="text" maxlength="60" list="facility-names" autocomplete="off" enterkeyhint="next" />
                  <datalist id="facility-names">
                    <option v-for="name in facilityNames" :key="name" :value="name" />
                  </datalist>
                </label>
                <label>
                  <span>Jarak (meter)</span>
                  <input v-model="form.distance" type="text" inputmode="numeric" data-input="free" autocomplete="off" enterkeyhint="done" />
                </label>
                <p v-if="formError" class="mnt__error" role="alert">{{ formError }}</p>
                <AppButton type="submit" expand="block" :disabled="saving">{{ saving ? 'Menyimpan...' : 'Tambah fasilitas' }}</AppButton>
              </form>

              <p v-if="!highlights.length" class="mnt__help">Belum ada fasilitas yang diisi.</p>
              <ul v-else class="mnt__list">
                <li v-for="item in sortedHighlights" :key="item.id">
                  <div>
                    <strong>{{ lotLabel(item.lotId) }}</strong>
                    <span>{{ item.facility }} · {{ formatDistance(item.distanceM) }}</span>
                  </div>
                  <button type="button" :aria-label="`Hapus ${item.facility} dari ${lotLabel(item.lotId)}`" @click="removeHighlight(item)">
                    <ion-icon :icon="trashOutline" aria-hidden="true" />
                  </button>
                </li>
              </ul>
            </template>
          </section>
        </Reveal>
      </main>
    </ion-content>

    <MobileTabBar variant="admin" />
  </ion-page>
</template>

<style scoped>
.mnt {
  display: grid;
  align-content: start;
  gap: var(--space-4, 16px);
  width: min(100%, 720px);
  margin-inline: auto;
  padding: 16px 16px calc(112px + env(safe-area-inset-bottom, 0px));
  color: var(--text-primary, #252525);
  font-family: var(--font-primary, 'Plus Jakarta Sans', sans-serif);
}

.mnt__card {
  display: grid;
  gap: 12px;
  padding: 16px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #fff);
}

.mnt h2 {
  margin: 0;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: 18px;
  font-weight: 700;
}

.mnt__help {
  margin: 0;
  color: var(--text-secondary, #5f5f66);
  font-size: 13px;
  line-height: 1.55;
}

.mnt button {
  cursor: pointer;
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.mnt button:focus-visible {
  outline: 3px solid var(--poliland-green, #355a2c);
  outline-offset: 2px;
}

.mnt__periods {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 8px;
}

.mnt__periods button {
  min-height: 44px;
  border: 1.5px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-primary, #fff);
  color: var(--text-primary, #252525);
  font: 700 13px/1 inherit;
}

.mnt__periods button[aria-pressed='true'] {
  border-color: var(--poliland-green, #355a2c);
  background: var(--status-success-bg, #eef5ec);
  color: var(--poliland-green, #355a2c);
}

.mnt__funnel,
.mnt__list {
  display: grid;
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.mnt__funnel li {
  display: grid;
  gap: 6px;
}

.mnt__funnel li > div {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  font-size: 13px;
}

.mnt__funnel strong {
  font-variant-numeric: tabular-nums;
}

.mnt__bar {
  display: block;
  height: 8px;
  overflow: hidden;
  border-radius: var(--radius-pill, 999px);
  background: var(--surface-muted, #f5f3ee);
}

.mnt__bar span {
  display: block;
  height: 100%;
  background: var(--poliland-green, #355a2c);
  transform-origin: left;
  transition: transform 240ms var(--ease-out, ease-out);
}

.mnt__form {
  display: grid;
  gap: 12px;
}

.mnt__form label {
  display: grid;
  gap: 6px;
  color: var(--text-secondary, #5f5f66);
  font-size: 13px;
  font-weight: 700;
}

.mnt__form input,
.mnt__form select {
  width: 100%;
  min-height: 48px;
  padding: 0 12px;
  border: 1.5px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-primary, #fff);
  color: var(--text-primary, #252525);
  font-family: inherit;
  font-size: 16px;
}

.mnt__form input:focus,
.mnt__form select:focus {
  outline: 2px solid var(--poliland-green, #355a2c);
  outline-offset: 1px;
}

.mnt__error {
  margin: 0;
  color: var(--status-danger-text, #a32d2d);
  font-size: 13px;
  font-weight: 700;
}

.mnt__list li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-top: 10px;
  border-top: 1px solid var(--border-default, #eae7e0);
}

.mnt__list li > div {
  display: grid;
  gap: 2px;
  min-width: 0;
  font-size: 13px;
}

.mnt__list span {
  color: var(--text-secondary, #5f5f66);
  overflow-wrap: anywhere;
}

.mnt__list button {
  display: grid;
  flex: 0 0 auto;
  place-items: center;
  width: 44px;
  height: 44px;
  border: 0;
  border-radius: var(--radius-control, 12px);
  background: var(--surface-muted, #f5f3ee);
  color: var(--status-danger-text, #a32d2d);
  font-size: 18px;
}

@media (prefers-reduced-motion: reduce) {
  .mnt__bar span { transition: none; }
}
</style>
