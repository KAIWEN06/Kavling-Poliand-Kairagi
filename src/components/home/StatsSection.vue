<template>
  <section class="stats-section">
    <dl class="stats-bar">
      <div class="stat-item">
        <dt>{{ totalLots === null ? 'Tersedia' : `Tersedia dari ${totalLots}` }}</dt>
        <dd>
          <template v-if="availableCount === null">…</template>
          <CountUp v-else :value="String(availableCount)" />
        </dd>
      </div>

      <div class="stat-item">
        <dt>Terjual</dt>
        <dd>
          <template v-if="soldCount === null">…</template>
          <CountUp v-else :value="String(soldCount)" />
        </dd>
      </div>

      <!-- Sorotan yang diatur Admin (mis. legalitas, akses jalan) -->
      <div v-for="(item, index) in highlights" :key="`hl-${index}`" class="stat-item">
        <dt>{{ item.label }}</dt>
        <dd><CountUp :value="String(item.value)" /></dd>
      </div>
    </dl>

    <div v-if="isAdmin" class="stats-admin">
      <AdminEditButton label="Ubah sorotan" @click="editOpen = true" />
    </div>

    <CmsPanelModal v-model="editOpen" title="Ubah sorotan" panel="home" section="highlights" @saved="loadHighlights" />
  </section>
</template>

<script setup lang="ts">
import { useRealtimeRefresh } from '@/composables/useRealtimeRefresh'
import { computed, ref, onMounted } from 'vue'
import type { SiteplanLot } from '@/services/siteplanService'
import { normalizeLotStatus } from '@/utils/siteplan'
import { contactsService } from '@/services/contactService'
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
const countByStatus = (status: 'available' | 'sold') =>
  props.lots.length ? props.lots.filter((lot) => normalizeLotStatus(lot.status) === status).length : null
const availableCount = computed(() => countByStatus('available'))
const soldCount = computed(() => countByStatus('sold'))
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
.stats-section { padding: 10px 12px 0; }

/* Satu bar ringkas; bila Admin menambah sorotan, bar bisa digeser. */
.stats-bar {
  display: flex;
  margin: 0;
  padding: 12px 0;
  overflow-x: auto;
  scrollbar-width: none;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: 12px;
  background: var(--surface-primary, #fff);
  box-shadow: var(--shadow-sm);
}
.stats-bar::-webkit-scrollbar { display: none; }

.stats-admin { display: flex; justify-content: flex-end; margin-top: 8px; }

/* Angka tampil di atas labelnya, urutan baca tetap label lalu nilai. */
.stat-item {
  display: flex;
  flex: 1 0 25%;
  flex-direction: column-reverse;
  justify-content: flex-end;
  gap: 4px;
  min-width: 0;
  padding: 0 6px;
  box-sizing: border-box;
  text-align: center;
}
.stat-item + .stat-item { border-left: 1px solid var(--border-default, #eae7e0); }

.stat-item dd {
  margin: 0;
  color: var(--poliland-green, #355a2c);
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: 20px;
  line-height: 1.1;
  font-weight: 650;
  letter-spacing: -0.01em;
  font-variant-numeric: tabular-nums;
}
.stat-item dt {
  color: var(--text-secondary, #5f5f66);
  font-size: 12px;
  line-height: 1.3;
  text-wrap: balance;
}
</style>
