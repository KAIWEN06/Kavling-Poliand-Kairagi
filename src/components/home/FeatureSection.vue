<template>
  <section v-if="features.length || isAdmin" class="section">
    <div class="section-heading">
      <div>
        <h2>Kenapa Memilih PoliLand?</h2>
        <span class="heading-line"></span>
      </div>
      <AdminEditButton v-if="isAdmin" label="Edit keunggulan" @click="editOpen = true" />
    </div>

    <p v-if="!features.length" class="empty-hint">Belum ada keunggulan. Tekan “Edit keunggulan” untuk menambahkan.</p>
    <div v-else class="horizontal-scroll">
      <article v-for="feature in features" :key="feature.id || feature.title" class="feature-card">
        <div class="feature-icon green">
          <ion-icon :icon="resolveCmsIcon(feature.icon)" />
        </div>
        <h3>{{ feature.title }}</h3>
        <p>{{ feature.description }}</p>
      </article>
    </div>

    <CmsPanelModal v-model="editOpen" title="Edit keunggulan" panel="home" section="features" @saved="load" />
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { IonIcon } from '@ionic/vue'
import { cmsService, type CmsFeature } from '@/services/cmsService'
import { resolveCmsIcon } from '@/utils/cmsIcons'
import { useCmsAdmin } from '@/composables/useCmsAdmin'
import AdminEditButton from '@/components/Admin/AdminEditButton.vue'
import CmsPanelModal from '@/components/Admin/CmsPanelModal.vue'

const features = ref<CmsFeature[]>([])
const editOpen = ref(false)
const { isAdmin } = useCmsAdmin()

async function load() {
  try { features.value = await cmsService.getFeatures(false) } catch (error) { console.error('Gagal mengambil keunggulan:', error) }
}
onMounted(load)
</script>

<style scoped>
.section { padding: 30px 16px 0; }
.section-heading { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 17px; }
.section-heading h2 { margin: 0; color: #2D2D2D; font-size: 20px; line-height: 1.2; font-weight: 800; letter-spacing: -0.3px; }
.heading-line { display: block; width: 34px; height: 3px; margin-top: 7px; background: #556B2F; border-radius: 999px; }
.empty-hint { margin: 0; padding: 14px; border: 1px dashed #d5d0c4; border-radius: 12px; color: #6b6b6b; font-size: 11px; line-height: 1.5; }
.horizontal-scroll { display: flex; gap: 12px; overflow-x: auto; padding-bottom: 8px; margin-right: -16px; padding-right: 16px; scrollbar-width: none; }
.horizontal-scroll::-webkit-scrollbar { display: none; }
.feature-card { flex: 0 0 190px; min-height: 165px; padding: 16px; background: #FFFFFF; border: 1px solid #EDE0D6; border-radius: 13px; box-shadow: 0 4px 14px rgba(45, 45, 45, 0.035); }
.feature-icon { width: 38px; height: 38px; margin-bottom: 12px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 19px; }

/* Warna kelas ikon disesuaikan dengan palet Poliland Kairagi (Olive, Forest, Gold/Warning) */
.feature-icon.green { color: #556B2F; background: #E6ECDF; }
.feature-icon.blue { color: #4A7C59; background: #E8EFE9; }
.feature-icon.yellow { color: #B38F27; background: #FDF8EC; }

.feature-card h3 { margin: 0 0 7px; color: #2D2D2D; font-size: 13px; font-weight: 800; }
.feature-card p { margin: 0; color: #686868; font-size: 10px; line-height: 1.55; }
</style>
