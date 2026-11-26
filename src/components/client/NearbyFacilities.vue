<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { IonIcon } from '@ionic/vue'
import { locationOutline } from 'ionicons/icons'
import { formatDistance, isHighlightsUnavailable, lotHighlightService, type LotHighlight } from '@/services/lotHighlightService'

/** Pasang dengan :key id kavling. Tidak tampil bila Admin belum mengisi datanya. */
const props = defineProps<{ lotId: number }>()

const items = ref<LotHighlight[]>([])

onMounted(async () => {
  try {
    items.value = await lotHighlightService.list(props.lotId)
  } catch (error) {
    // Info tambahan: bila gagal, bagian ini disembunyikan saja.
    if (!isHighlightsUnavailable(error)) console.warn('[Fasilitas] Gagal memuat:', error)
  }
})
</script>

<template>
  <section v-if="items.length" class="near" aria-label="Fasilitas terdekat">
    <h3>Dekat fasilitas</h3>
    <ul>
      <li v-for="item in items" :key="item.id">
        <ion-icon :icon="locationOutline" aria-hidden="true" />
        <span>{{ item.facility }}</span>
        <strong>{{ formatDistance(item.distanceM) }}</strong>
      </li>
    </ul>
  </section>
</template>

<style scoped>
.near {
  padding: 12px 14px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-control, 12px);
  background: var(--surface-primary, #fff);
  color: var(--text-primary, #252525);
  text-align: left;
}

.near h3 {
  margin: 0 0 6px;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: 16px;
  font-weight: 700;
}

.near ul {
  display: grid;
  margin: 0;
  padding: 0;
  list-style: none;
}

.near li {
  display: grid;
  grid-template-columns: 18px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  min-height: 32px;
  font-size: 13px;
}

.near ion-icon {
  color: var(--poliland-green, #355a2c);
  font-size: 18px;
}

.near strong {
  font-variant-numeric: tabular-nums;
}
</style>
