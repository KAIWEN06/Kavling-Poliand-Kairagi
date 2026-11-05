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
          <span>Total Kavling</span>
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

      <!-- Legalitas -->
      <div class="stat-item">
        <div class="stat-icon info-bg">
          <ion-icon :icon="shieldCheckmarkOutline" />
        </div>

        <div>
          <strong>SHM</strong>
          <span>Legalitas</span>
        </div>
      </div>

      <!-- Akses Jalan -->
      <div class="stat-item">
        <div class="stat-icon sage-bg">
          <ion-icon :icon="navigateOutline" />
        </div>

        <div>
          <strong>100%</strong>
          <span>Akses Jalan</span>
        </div>
      </div>

    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { IonIcon } from '@ionic/vue'
import {
  homeOutline,
  ribbonOutline,
  shieldCheckmarkOutline,
  navigateOutline
} from 'ionicons/icons'

import { lotService } from '@/services/lotService'

const totalLots = ref(0)
const soldCount = ref(0)
const loading = ref(true)

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
    console.error('Gagal mengambil statistik kavling:', error)
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  loadStats()
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