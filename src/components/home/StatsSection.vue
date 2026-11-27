<template>
  <section class="stats-section">
    <div class="stats-card">
      <!-- Total Kavling -->
      <div class="stat-item">
        <span class="stat-icon"><ion-icon :icon="homeOutline" aria-hidden="true" /></span>
        <div class="stat-text">
          <strong>
            <template v-if="totalLots === null">…</template>
            <CountUp v-else :value="String(totalLots)" />
          </strong>
          <span>Total kavling</span>
        </div>
      </div>

      <!-- Terjual -->
      <div class="stat-item">
        <span class="stat-icon"><ion-icon :icon="ribbonOutline" aria-hidden="true" /></span>
        <div class="stat-text">
          <strong>
            <template v-if="soldCount === null">…</template>
            <CountUp v-else :value="String(soldCount)" />
          </strong>
          <span>Terjual</span>
        </div>
      </div>

      <!-- Sorotan yang diatur Admin (mis. legalitas, akses jalan) -->
      <div v-for="(item, index) in highlights" :key="`hl-${index}`" class="stat-item">
        <span class="stat-icon" :class="{ 'is-gold': index % 2 === 0 }">
          <ion-icon :icon="resolveCmsIcon(item.icon)" aria-hidden="true" />
        </span>
        <div class="stat-text">
          <strong><CountUp :value="String(item.value)" /></strong>
          <span>{{ item.label }}</span>
        </div>
      </div>
    </div>

    <div v-if="isAdmin" class="stats-admin">
      <AdminEditButton label="Ubah sorotan" @click="editOpen = true" />
    </div>

    <CmsPanelModal v-model="editOpen" title="Ubah sorotan" panel="home" section="highlights" @saved="loadHighlights" />
  </section>
</template>

<script setup lang="ts">
import { useRealtimeRefresh } from '@/composables/useRealtimeRefresh'
import { computed, ref, onMounted } from 'vue'
import { IonIcon } from '@ionic/vue'
import { homeOutline, ribbonOutline } from 'ionicons/icons'

import type { SiteplanLot } from '@/services/siteplanService'
import { normalizeLotStatus } from '@/utils/siteplan'
import { contactsService } from '@/services/contactService'
import { resolveCmsIcon } from '@/utils/cmsIcons'
import { HOME_KEYS, parseHighlights, type HomeHighlight } from '@/utils/homeContent'
import { useCmsAdmin } from '@/composables/useCmsAdmin'
import AdminEditButton from '@/components/Admin/AdminEditButton.vue'
import CmsPanelModal from '@/components/Admin/CmsPanelModal.vue'
import CountUp from '@/components/ui/CountUp.vue'

/**
 * Data kavling datang dari HomePage (RPC publik yang sama dengan denah);
 * tabel lots tidak bisa dibaca pengunjung. null = belum ada data, jangan tampilkan 0.
 */
const props = withDefaults(defineProps<{ lots?: SiteplanLot[] }>(), { lots: () => [] })
const totalLots = computed(() => (props.lots.length ? props.lots.length : null))
const soldCount = computed(() =>
  props.lots.length ? props.lots.filter((lot) => normalizeLotStatus(lot.status) === 'sold').length : null,
)
const highlights = ref<HomeHighlight[]>([])
const editOpen = ref(false)
const { isAdmin } = useCmsAdmin()

/** Sorotan (mis. legalitas, akses jalan) diatur Admin dan disimpan di database. */
const loadHighlights = async () => {
  try {
    const rows = await contactsService.getAll()
    highlights.value = parseHighlights(rows.find((row) => row.key === HOME_KEYS.highlights)?.value)
  } catch (error) {
    console.error('Gagal mengambil sorotan:', error)
  }
}

onMounted(loadHighlights)

useRealtimeRefresh(['contacts'], loadHighlights)

</script>

<style scoped>
.stats-section { position: relative; z-index: 5; margin-top: -44px; padding: 0 16px; }

.stats-card {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 22px 12px;
  padding: 22px 16px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
  box-shadow: var(--shadow-md);
}

.stats-admin { display: flex; justify-content: flex-end; margin-top: 8px; }

.stat-item { display: flex; align-items: center; gap: 12px; min-width: 0; }
.stat-icon {
  display: grid;
  place-items: center;
  flex: 0 0 44px;
  width: 44px;
  height: 44px;
  border-radius: 14px;
  background: var(--green-100, #e8eee4);
  color: var(--poliland-green, #355a2c);
  font-size: 22px;
}
.stat-icon.is-gold { background: var(--gold-50, #fbf4e4); color: var(--poliland-gold-text, #805708); }

.stat-text { min-width: 0; }
.stat-item strong {
  display: block;
  color: var(--text-primary, #252525);
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: 26px;
  line-height: 1;
  font-weight: 650;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.stat-text > span {
  display: block;
  margin-top: 4px;
  color: var(--text-secondary, #5f5f66);
  font-size: 13px;
  line-height: 1.3;
}
</style>
