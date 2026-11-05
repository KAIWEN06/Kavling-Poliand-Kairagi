<template>
  <ion-page class="panorama-page">

    <!-- Loading -->
    <div
      v-if="loading"
      class="panorama-state"
    >
      <div class="loader"></div>
      <p>Memuat panorama...</p>
    </div>

    <!-- Error -->
    <div
      v-else-if="errorMessage"
      class="panorama-state"
    >
      <div class="error-icon">
        !
      </div>

      <h2>Gagal Memuat Panorama</h2>

      <p>
        {{ errorMessage }}
      </p>

      <button
        class="retry-button"
        @click="loadPanorama"
      >
        Coba Lagi
      </button>
    </div>

    <!-- Panorama -->
    <PanoramaViewer
      v-else-if="panoramaUrl"
      :panorama-url="panoramaUrl"
      :lot-number="lotNumber"
      :status="lotStatus"
      :status-color="statusColor"
      @back="goBack"
    />

  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonPage } from '@ionic/vue'

import PanoramaViewer from '@/components/siteplan/PanoramaViewer.vue'
import { supabase } from '@/services/config/supabase'
import { getLotStatusColor, getStatusLabel } from '@/utils/siteplan'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const errorMessage = ref('')

const panoramaUrl = ref('')
const lotNumber = ref('')
const lotStatus = ref('Tersedia')
const statusColor = ref('#22c55e')

async function loadPanorama() {
  loading.value = true
  errorMessage.value = ''
  panoramaUrl.value = ''

  try {
    const lotId = String(
      route.params.lotId || ''
    ).trim()

    if (!lotId) {
      throw new Error(
        'ID kavling tidak ditemukan.'
      )
    }

    console.log(
      '[Panorama] Mencari lot:',
      lotId
    )

    /*
     * =====================================================
     * 1. Coba cari berdasarkan lot_number
     * =====================================================
     */

    let { data, error } = await supabase
      .from('lots')
      .select(`
        id,
        lot_number,
        polygon_id,
        panorama_url,
        status,
        color
      `)
      .eq('lot_number', lotId)
      .maybeSingle()

    if (error) {
      throw error
    }

    /*
     * =====================================================
     * 2. Jika tidak ditemukan,
     *    coba polygon_id
     * =====================================================
     */

    if (!data) {
      const result = await supabase
        .from('lots')
        .select(`
          id,
          lot_number,
          polygon_id,
          panorama_url,
          status,
          color
        `)
        .eq('polygon_id', lotId)
        .maybeSingle()

      if (result.error) {
        throw result.error
      }

      data = result.data
    }

    console.log(
      '[Panorama] Data lot:',
      data
    )

    if (!data) {
      throw new Error(
        `Kavling ${lotId} tidak ditemukan.`
      )
    }

    /*
     * =====================================================
     * DATA KAVLING
     * =====================================================
     */

    lotNumber.value =
      data.lot_number || lotId

    lotStatus.value =
      getStatusLabel(data.status || 'tersedia')

    statusColor.value =
      data.color ||
      getLotStatusColor({ status: data.status || 'tersedia' })

    /*
     * =====================================================
     * PANORAMA URL
     * =====================================================
     */

    if (!data.panorama_url) {
      throw new Error(
        `Kavling ${lotNumber.value} belum memiliki foto panorama.`
      )
    }

    panoramaUrl.value =
      data.panorama_url

    console.log(
      '[Panorama] URL:',
      panoramaUrl.value
    )

  } catch (error: any) {
    console.error(
      '[Panorama] Error:',
      error
    )

    errorMessage.value =
      error?.message ||
      'Panorama gagal dimuat.'
  } finally {
    loading.value = false
  }
}

/*
 * =========================================================
 * BACK
 * =========================================================
 */

function goBack() {
  router.back()
}

onMounted(() => {
  loadPanorama()
})
</script>

<style scoped>
.panorama-page {
  width: 100%;
  height: 100%;
  background: #020617;
}

/* =========================================================
   LOADING / ERROR
========================================================= */

.panorama-state {
  width: 100%;
  height: 100%;

  display: flex;
  flex-direction: column;

  align-items: center;
  justify-content: center;

  background: #020617;

  color: #ffffff;

  text-align: center;

  padding: 24px;
}

.panorama-state h2 {
  margin: 14px 0 6px;

  font-size: 18px;
  font-weight: 600;
}

.panorama-state p {
  margin: 0;

  max-width: 300px;

  color: #94a3b8;

  font-size: 14px;
}

.loader {
  width: 32px;
  height: 32px;

  border: 3px solid rgba(255, 255, 255, 0.15);

  border-top-color: #ffffff;

  border-radius: 50%;

  animation: spin 0.8s linear infinite;
}

.error-icon {
  width: 40px;
  height: 40px;

  display: flex;
  align-items: center;
  justify-content: center;

  border-radius: 50%;

  background: rgba(239, 68, 68, 0.15);

  color: #ef4444;

  font-size: 20px;
  font-weight: 700;
}

.retry-button {
  margin-top: 18px;

  border: none;

  border-radius: 9px;

  padding: 10px 18px;

  background: #2563eb;

  color: white;

  font-size: 14px;
  font-weight: 600;

  cursor: pointer;
}

.retry-button:active {
  transform: scale(0.97);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>