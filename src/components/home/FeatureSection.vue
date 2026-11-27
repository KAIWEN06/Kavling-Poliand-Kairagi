<template>
  <section v-if="features.length || isAdmin" class="section">
    <SectionHeader title="Kenapa memilih PoliLand?">
      <AdminEditButton v-if="isAdmin" label="Ubah keunggulan" @click="editOpen = true" />
    </SectionHeader>

    <p v-if="!features.length" class="empty-hint">Belum ada keunggulan. Tekan “Ubah keunggulan” untuk menambahkan.</p>
    <ul v-else class="feature-scroll">
      <li v-for="(feature, i) in features" :key="feature.id || feature.title" class="feature-item">
        <article class="feature-card" :style="{ '--i': Math.min(i, 8) }">
          <span class="feature-icon">
            <ion-icon :icon="resolveCmsIcon(feature.icon)" aria-hidden="true" />
          </span>
          <h3>{{ feature.title }}</h3>
          <p>{{ feature.description }}</p>
        </article>
      </li>
    </ul>

    <CmsPanelModal v-model="editOpen" title="Ubah keunggulan" panel="home" section="features" @saved="load" />
  </section>
</template>

<script setup lang="ts">
import { useRealtimeRefresh } from '@/composables/useRealtimeRefresh'
import { onMounted, ref } from 'vue'
import { IonIcon } from '@ionic/vue'
import { cmsService, type CmsFeature } from '@/services/cmsService'
import { resolveCmsIcon } from '@/utils/cmsIcons'
import { useCmsAdmin } from '@/composables/useCmsAdmin'
import AdminEditButton from '@/components/Admin/AdminEditButton.vue'
import CmsPanelModal from '@/components/Admin/CmsPanelModal.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'

const features = ref<CmsFeature[]>([])
const editOpen = ref(false)
const { isAdmin } = useCmsAdmin()

async function load() {
  try { features.value = await cmsService.getFeatures(false) } catch (error) { console.error('Gagal mengambil keunggulan:', error) }
}
onMounted(load)

useRealtimeRefresh(['home_features'], load)

</script>

<style scoped>
.section { padding: 36px 20px 0; }
.empty-hint { margin: 0; padding: 16px; border: 1px dashed var(--border-strong, #d5d0c4); border-radius: var(--radius-card, 16px); color: var(--text-secondary, #5f5f66); font-size: 14px; line-height: 1.55; }

.feature-scroll {
  display: flex;
  gap: 12px;
  margin: 0 -20px;
  padding: 2px 20px 12px;
  list-style: none;
  overflow-x: auto;
  scrollbar-width: none;
  scroll-snap-type: x proximity;
}
.feature-scroll::-webkit-scrollbar { display: none; }
.feature-item { flex: 0 0 min(250px, 72vw); scroll-snap-align: start; }

.feature-card {
  height: 100%;
  min-height: 190px;
  padding: 20px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
  box-shadow: var(--shadow-sm);
  animation: feature-in 560ms var(--ease-spring) backwards;
  animation-delay: calc(var(--i, 0) * 70ms);
}
.feature-icon {
  display: grid;
  place-items: center;
  width: 48px;
  height: 48px;
  margin-bottom: 16px;
  border-radius: 15px;
  background: var(--green-100, #e8eee4);
  color: var(--poliland-green, #355a2c);
  font-size: 24px;
}
.feature-card h3 {
  margin: 0 0 8px;
  color: var(--text-primary, #252525);
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: 20px;
  line-height: 1.2;
  font-weight: 650;
  letter-spacing: -0.01em;
}
.feature-card p { margin: 0; color: var(--text-secondary, #5f5f66); font-size: 14px; line-height: 1.6; }

/* Ditahan sampai ScrollReveal menampilkan blok; tanpa ini animasinya selesai saat belum terlihat. */
:global(.scroll-reveal:not(.is-shown) .feature-card) { animation-play-state: paused; }

@keyframes feature-in { from { opacity: 0; translate: 18px 0; scale: 0.97; } }

@media (prefers-reduced-motion: reduce) {
  .feature-card { animation: none; }
}
</style>
