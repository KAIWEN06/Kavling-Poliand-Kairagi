<template>
  <ion-page class="panorama-page">

    <!-- Satu layar muat saja: data kavling lalu gambar panorama, tanpa pergantian spinner. -->
    <PanoramaViewer
      v-if="panoramaUrl && !errorMessage"
      :panorama-url="panoramaUrl"
      :lot-number="lotNumber"
      :status="lotStatus"
      :status-color="statusColor"
      @ready="viewerReady = true"
      @back="goBack"
    />

    <PublicStateScreen
      v-if="errorMessage"
      class="panorama-cover"
      title="Panorama belum bisa dibuka"
      :description="errorMessage"
      action-label="Coba lagi"
      secondary-label="Kembali"
      @action="loadPanorama"
      @secondary="goBack"
    />

    <Transition name="cover">
      <PublicStateScreen
        v-if="!errorMessage && (loading || !viewerReady)"
        class="panorama-cover"
        busy
        title="Memuat panorama"
      />
    </Transition>

  </ion-page>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { IonPage } from '@ionic/vue'

import PanoramaViewer from '@/components/siteplan/PanoramaViewer.vue'
import PublicStateScreen from '@/components/ui/PublicStateScreen.vue'
import { supabase } from '@/services/config/supabase'
import { getLotStatusColor, getStatusLabel } from '@/utils/siteplan'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const viewerReady = ref(false)
const errorMessage = ref('')

const panoramaUrl = ref('')
const lotNumber = ref('')
const lotStatus = ref('Tersedia')
const statusColor = ref('#22c55e')

async function loadPanorama() {
  loading.value = true
  viewerReady.value = false
  errorMessage.value = ''
  panoramaUrl.value = ''

  try {
    const lotId = String(
      route.params.lotId || ''
    ).trim()

    if (!lotId) {
      throw new Error(
        'ID kaveling tidak ditemukan.'
      )
    }

    console.log(
      '[Panorama] Mencari lot:',
      lotId
    )

    const selectFields = `
      id,
      lot_number,
      polygon_id,
      panorama_url,
      status,
      color
    `

    /* Prioritaskan ID internal karena detail admin/client mengirim ID ini. */
    let data: any = null
    let error: any = null
    // Angka berawalan nol ("002") adalah nomor kavling, bukan ID.
    if (/^[1-9]\d*$/.test(lotId)) {
      const result = await supabase
        .from('lots')
        .select(selectFields)
        .eq('id', Number(lotId))
        .maybeSingle()
      data = result.data
      error = result.error
    }

    if (error) {
      throw error
    }

    /*
     * =====================================================
     * Jika bukan ID internal, coba lot_number lalu polygon_id.
     * =====================================================
     */

    if (!data) {
      const result = await supabase
        .from('lots')
        .select(selectFields)
        .eq('lot_number', lotId)
        .maybeSingle()

      if (result.error) {
        throw result.error
      }

      data = result.data
    }

    if (!data) {
      const result = await supabase
        .from('lots')
        .select(selectFields)
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
        `Kaveling ${lotId} tidak ditemukan.`
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
        `Kaveling ${lotNumber.value} belum memiliki foto panorama.`
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
  background: #101510;
}

.panorama-cover {
  position: absolute;
  inset: 0;
  z-index: 50;
}

.cover-leave-active {
  transition: opacity 320ms var(--ease-out, ease-out);
}
.cover-leave-to {
  opacity: 0;
}

</style>
