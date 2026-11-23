<template>
  <section class="stats-section">
    <div class="stats-card">

      <!-- Total Kavling -->
      <div class="stat-item">
        <div class="stat-icon sage-bg">
          <ion-icon :icon="homeOutline" />
        </div>

        <div>
          <strong>
            {{ loading ? '...' : `${totalLots}+` }}
          </strong>
          <span>Total Kaveling</span>
        </div>
      </div>

      <!-- Terjual -->
      <div class="stat-item">
        <div class="stat-icon sage-bg">
          <ion-icon :icon="ribbonOutline" />
        </div>

        <div>
          <strong>
            {{ loading ? '...' : `${soldCount}+` }}
          </strong>
          <span>Terjual</span>
        </div>
      </div>

      <!-- Sorotan yang diatur Admin (mis. legalitas, akses jalan) -->
      <div v-for="(item, index) in highlights" :key="`hl-${index}`" class="stat-item">
        <div class="stat-icon" :class="index % 2 ? 'info-bg' : 'sage-bg'">
          <ion-icon :icon="resolveCmsIcon(item.icon)" />
        </div>

        <div>
          <strong>{{ item.value }}</strong>
          <span>{{ item.label }}</span>
        </div>
      </div>

    </div>

    <div v-if="isAdmin" class="stats-admin">
      <AdminEditButton label="Edit sorotan" @click="editOpen = true" />
    </div>

    <CmsPanelModal v-model="editOpen" title="Edit sorotan" panel="home" section="highlights" @saved="loadHighlights" />
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { IonIcon } from '@ionic/vue'
import { homeOutline, ribbonOutline } from 'ionicons/icons'

import { lotService } from '@/services/lotService'
import { contactsService } from '@/services/contactService'
import { resolveCmsIcon } from '@/utils/cmsIcons'
import { HOME_KEYS, parseHighlights, type HomeHighlight } from '@/utils/homeContent'
import { useCmsAdmin } from '@/composables/useCmsAdmin'
import AdminEditButton from '@/components/Admin/AdminEditButton.vue'
import CmsPanelModal from '@/components/Admin/CmsPanelModal.vue'

const totalLots = ref(0)
const soldCount = ref(0)
const loading = ref(true)
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

const loadStats = async () => {
  try {
    loading.value = true

    const [total, sold] = await Promise.all([
      lotService.getTotalLotsCount(),
      lotService.getSoldCount()
    ])

    totalLots.value = total
    soldCount.value = sold

  } catch (error) {
    console.error('Gagal mengambil statistik kaveling:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStats()
  loadHighlights()
})
</script>

<style scoped>
.stats-section {
  position: relative;
  z-index: 5;
  margin-top: -44px;
  padding: 0 14px;
}

.stats-card {
  background: #FFFFFF;
  border: 1px solid #E5E5E5;
  border-radius: 18px;
  padding: 17px 12px;
  box-shadow: 0 12px 30px rgba(26, 26, 26, 0.1);

  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 18px 8px;
}

.stats-admin {
  display: flex;
  justify-content: flex-end;
  margin-top: 8px;
}

.stat-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.stat-icon {
  width: 35px;
  height: 35px;
  flex: 0 0 35px;

  border-radius: 10px;

  display: flex;
  align-items: center;
  justify-content: center;

  font-size: 18px;
}

.stat-icon.sage-bg {
  background: #ECFDF5;
  color: #8CA072;
}

.stat-icon.info-bg {
  background: #F2F6FEB2;
  color: #2F6FEB;
}

.stat-item strong {
  display: block;
  color: #1A1A1A;
  font-size: 15px;
  font-weight: 850;
}

.stat-item span {
  display: block;
  margin-top: 2px;
  color: #6B6B6B;
  font-size: 9px;
}
</style>