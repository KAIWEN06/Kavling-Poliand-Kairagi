<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { IonIcon } from '@ionic/vue'
import { chevronForwardOutline } from 'ionicons/icons'
import Reveal from '@/components/ui/Reveal.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import { useRealtimeRefresh } from '@/composables/useRealtimeRefresh'
import { favoriteService, type FavoriteLot } from '@/services/favoriteService'
import { isRecommendationUnavailable, matchReason, recommendationService } from '@/services/recommendationService'
import { formatCurrency } from '@/utils/siteplan'

/**
 * Tanpa lotId: rekomendasi untuk pembeli. Dengan lotId: kavling serupa
 * (pasang :key id kavling). Tidak tampil bila belum ada yang cocok.
 * Hook Ionic tidak jalan di komponen anak, jadi halaman memanggil refresh().
 */
const props = defineProps<{ lotId?: number }>()

const router = useRouter()
const items = ref<Array<{ lot: FavoriteLot; reason: string }>>([])
let requestVersion = 0

async function refresh() {
  const version = ++requestVersion
  try {
    const matches = props.lotId
      ? await recommendationService.similarTo(props.lotId)
      : await recommendationService.forMe()
    const lots = await favoriteService.getLots(matches.map((match) => match.lotId))
    if (version !== requestVersion) return
    const byId = new Map(lots.map((lot) => [lot.id, lot]))
    items.value = matches.flatMap((match) => {
      const lot = byId.get(match.lotId)
      return lot ? [{ lot, reason: matchReason(match) }] : []
    })
  } catch (error) {
    // Bagian tambahan: bila gagal, hasil terakhir dipertahankan atau bagian ini tetap tersembunyi.
    if (!isRecommendationUnavailable(error)) console.warn('[Rekomendasi] Gagal memuat:', error)
  }
}

/* Sama dengan daftar kaveling: nomor polos diberi awalan. */
const lotName = (lot: FavoriteLot) => (/^\d+[A-Z]?$/i.test(lot.lotNumber) ? `Kaveling ${lot.lotNumber}` : lot.lotNumber)

const detailText =(lot: FavoriteLot) =>
  [lot.blockName, lot.area ? `${lot.area.toLocaleString('id-ID')} m²` : '', lot.dimension].filter(Boolean).join(' · ')

onMounted(() => void refresh())
useRealtimeRefresh(['lots', 'spk_requests'], refresh)
defineExpose({ refresh })
</script>

<template>
  <section v-if="items.length" class="reco" :aria-label="lotId ? 'Kavling serupa' : 'Cocok untuk Anda'">
    <SectionHeader :title="lotId ? 'Kavling serupa' : 'Cocok untuk Anda'">
      <button v-if="!lotId" type="button" class="reco__manage" @click="router.push('/client/favorit')">Atur</button>
    </SectionHeader>

    <ul class="reco__track">
      <li v-for="(item, index) in items" :key="item.lot.id">
        <Reveal :order="Math.min(index, 8)" :step="0.06">
          <button type="button" class="reco__card" @click="router.push(`/client/kavling/${item.lot.id}`)">
            <span class="reco__name">{{ lotName(item.lot) }}</span>
            <span class="reco__meta">{{ detailText(item.lot) }}</span>
            <strong v-if="item.lot.price" class="reco__price">{{ formatCurrency(item.lot.price) }}</strong>
            <span class="reco__reason">
              <span>{{ item.reason }}</span>
              <ion-icon :icon="chevronForwardOutline" aria-hidden="true" />
            </span>
          </button>
        </Reveal>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.reco {
  min-width: 0;
  color: var(--text-primary, #252525);
  font-family: var(--font-primary, 'Plus Jakarta Sans', sans-serif);
}

.reco__manage {
  min-width: 44px;
  min-height: 44px;
  padding: 0 8px;
  border: 0;
  background: none;
  color: var(--poliland-green, #355a2c);
  font: inherit;
  font-size: 13px;
  font-weight: 700;
  cursor: pointer;
}

.reco__track {
  display: grid;
  grid-auto-flow: column;
  grid-auto-columns: min(76%, 250px);
  gap: 12px;
  margin: 0;
  padding: 2px 2px 8px;
  overflow-x: auto;
  overscroll-behavior-x: contain;
  scroll-snap-type: x mandatory;
  scroll-padding-inline: 2px;
  scrollbar-width: none;
  list-style: none;
}

.reco__track::-webkit-scrollbar {
  display: none;
}

.reco__track li {
  display: grid;
  scroll-snap-align: start;
}

.reco__track li > :deep(.ui-reveal) {
  display: grid;
}

.reco__card {
  display: grid;
  grid-template-rows: auto auto auto 1fr;
  gap: 4px;
  width: 100%;
  padding: 14px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #fff);
  box-shadow: 0 2px 8px rgba(37, 37, 37, 0.04);
  color: inherit;
  font: inherit;
  text-align: left;
  cursor: pointer;
  transition: transform var(--dur-fast, 150ms) var(--ease-spring, ease-out);
}

.reco__name {
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: 19px;
  font-weight: 700;
  line-height: 1.25;
  overflow-wrap: anywhere;
}

.reco__meta {
  color: var(--text-secondary, #5f5f66);
  font-size: 12.5px;
}

.reco__price {
  color: var(--poliland-green, #355a2c);
  font-size: 17px;
  font-variant-numeric: tabular-nums;
}

.reco__reason {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 8px;
  margin-top: 6px;
  padding-top: 8px;
  border-top: 1px solid var(--border-default, #eae7e0);
  color: var(--text-secondary, #5f5f66);
  font-size: 12px;
  line-height: 1.4;
}

.reco__reason ion-icon {
  flex-shrink: 0;
  color: var(--poliland-green, #355a2c);
  font-size: 16px;
}

.reco__manage,
.reco__card {
  touch-action: manipulation;
  user-select: none;
  -webkit-user-select: none;
  -webkit-tap-highlight-color: transparent;
}

.reco__card:active {
  transform: scale(0.97);
}

.reco__manage:active {
  opacity: 0.6;
}

.reco__manage:focus-visible,
.reco__card:focus-visible {
  outline: 3px solid var(--poliland-green, #355a2c);
  outline-offset: -1px;
}

@media (prefers-reduced-motion: reduce) {
  .reco__card { transition: none; }
  .reco__card:active { transform: none; }
}
</style>
