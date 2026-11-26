<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { IonContent, IonPage, onIonViewWillEnter } from '@ionic/vue'
import AppHeader from '@/components/common/AppHeader.vue'
import MobileTabBar from '@/components/common/MobileTabBar.vue'
import AppButton from '@/components/ui/AppButton.vue'
import AppNotice from '@/components/ui/AppNotice.vue'
import PageHeader from '@/components/ui/PageHeader.vue'
import Reveal from '@/components/ui/Reveal.vue'
import { FUNNEL_STAGES, getFunnelSummary } from '@/services/funnelService'

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

onIonViewWillEnter(() => void loadFunnel())
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
  padding: 16px 16px calc(112px + var(--safe-bottom));
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

.mnt__funnel {
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

@media (prefers-reduced-motion: reduce) {
  .mnt__bar span { transition: none; }
}
</style>
