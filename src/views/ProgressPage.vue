<template>
  <ion-page>
    <ion-content :fullscreen="true" class="progress-content">
      <main class="progress-page pl-surface">
        <!-- HERO: adegan Welcome, bukit terdepan krem agar mengalir ke isi -->
        <header class="progress-hero">
          <SceneBackdrop class="hero-scene" height="54%" breathe sparkle solid-front="#F9F5EC" />

          <div class="hero-copy">
            <h1 aria-label="Kemajuan pembangunan">
              <span v-for="(line, i) in heroLines" :key="line" class="hero-line" aria-hidden="true">
                <motion.span
                  class="hero-line-inner"
                  :initial="reduced ? false : { y: '110%' }"
                  :animate="{ y: '0%' }"
                  :transition="{ duration: 0.75, delay: 0.25 + i * 0.12, ease: MOTION_EASE_OUT }"
                >{{ line }}</motion.span>
              </span>
            </h1>
            <motion.p
              class="hero-sub"
              :initial="reduced ? false : { opacity: 0, y: 10 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.6, delay: 0.55, ease: MOTION_EASE_OUT }"
            >Pantau pekerjaan tiap proyek. Data diperbarui berkala.</motion.p>
            <motion.div
              v-if="isAdmin"
              class="hero-admin"
              :initial="reduced ? false : { opacity: 0, y: 10 }"
              :animate="{ opacity: 1, y: 0 }"
              :transition="{ duration: 0.5, delay: 0.7, ease: MOTION_EASE_OUT }"
            >
              <AdminEditButton label="Tambah update" :icon="addOutline" @click="openAdd" />
            </motion.div>
          </div>
        </header>

        <!-- RINGKASAN: panel hijau dengan angka yang naik dari 0 -->

        <!-- FILTER -->
        <section class="filter-section" aria-label="Filter status">
          <div v-if="isLoading" class="filter-scroll" aria-hidden="true">
            <Skeleton
              v-for="i in 4"
              :key="`filter-skeleton-${i}`"
              :width="i === 1 ? '70px' : i === 2 ? '130px' : i === 3 ? '88px' : '112px'"
              height="44px"
              border-radius="999px"
            />
          </div>
          <div v-else class="filter-scroll">
            <button
              v-for="category in categories"
              :key="category.value"
              type="button"
              class="filter-chip"
              :class="{ active: selectedCategory === category.value }"
              :aria-pressed="selectedCategory === category.value"
              @click="selectedCategory = category.value"
            >
              {{ category.label }}
            </button>
          </div>
        </section>

        <!-- TERKINI -->
        <section v-if="isLoading || featuredProject" class="block">
          <SectionHeader title="Terkini" />

          <article v-if="isLoading" class="featured-card is-skeleton" aria-hidden="true">
            <div class="featured-image"><Skeleton width="100%" height="100%" border-radius="0" /></div>
            <div class="featured-content">
              <Skeleton width="60%" height="22px" border-radius="6px" />
              <Skeleton width="90%" height="12px" border-radius="5px" />
              <Skeleton width="100%" height="8px" border-radius="999px" />
            </div>
          </article>

          <ScrollReveal v-else-if="featuredProject">
            <article
              class="featured-card"
              role="link"
              tabindex="0"
              @click="openProject(featuredProject)"
              @keydown.enter="openProject(featuredProject)"
            >
              <div class="featured-image">
                <img v-if="featuredProject.cover" :src="featuredProject.cover" :alt="featuredProject.name" />
                <div v-else class="cover-empty" aria-hidden="true"><ion-icon :icon="constructOutline" /></div>
                <div class="featured-image-overlay"></div>
                <span class="category-label">{{ featuredProject.category }}</span>
              </div>

              <div class="featured-content">
                <div class="featured-title-row">
                  <div class="featured-text">
                    <h3>{{ featuredProject.name }}</h3>
                    <p v-if="featuredProject.shortDescription">{{ featuredProject.shortDescription }}</p>
                  </div>
                  <span class="featured-percentage" :aria-label="`${featuredProject.progress} persen`">{{ displayPct }}%</span>
                </div>

                <div class="progress-track">
                  <div class="progress-fill" :style="{ width: `${featuredProject.progress}%` }"></div>
                </div>

                <div v-if="featuredProject.lastUpdate" class="featured-footer">
                  <ion-icon :icon="calendarOutline" aria-hidden="true" />
                  {{ featuredProject.lastUpdate }}
                </div>
              </div>
            </article>
          </ScrollReveal>
        </section>

        <!-- SEMUA PROYEK -->
        <section class="block">
          <SectionHeader title="Semua proyek">
            <span v-if="!isLoading" class="section-count">{{ filteredProjects.length }}</span>
          </SectionHeader>

          <div v-if="isLoading" class="project-list" aria-hidden="true">
            <article v-for="i in 3" :key="`project-skeleton-${i}`" class="project-card is-skeleton">
              <div class="project-thumbnail"><Skeleton width="100%" height="100%" border-radius="12px" /></div>
              <div class="project-body">
                <Skeleton width="70px" height="10px" border-radius="5px" />
                <Skeleton width="85%" height="16px" border-radius="6px" />
                <Skeleton width="100%" height="6px" border-radius="999px" />
              </div>
            </article>
          </div>

          <ul v-else-if="filteredProjects.length" class="project-list">
            <li v-for="(project, index) in filteredProjects" :key="project.id">
              <article
                class="project-card"
                :style="{ '--i': Math.min(index, 8) }"
                role="link"
                tabindex="0"
                @click="openProject(project)"
                @keydown.enter="openProject(project)"
              >
                <div class="project-thumbnail">
                  <img v-if="project.cover" :src="project.cover" :alt="project.name" loading="lazy" />
                  <div v-else class="cover-empty" aria-hidden="true"><ion-icon :icon="constructOutline" /></div>
                  <div class="thumbnail-overlay"></div>
                  <span class="thumbnail-status">{{ project.statusLabel }}</span>
                </div>

                <div class="project-body">
                  <div class="project-top">
                    <h3>{{ project.name }}</h3>
                    <span class="project-progress">{{ project.progress }}%</span>
                  </div>
                  <p v-if="project.description">{{ project.description }}</p>
                  <div class="project-progress-track">
                    <div class="project-progress-fill" :style="{ width: `${project.progress}%` }"></div>
                  </div>
                  <span v-if="project.lastUpdate" class="project-meta">
                    <ion-icon :icon="calendarOutline" aria-hidden="true" />
                    {{ project.lastUpdate }}
                  </span>
                </div>

                <ion-icon class="project-arrow" :icon="chevronForwardOutline" aria-hidden="true" />
              </article>
            </li>
          </ul>

          <StatusIllustration
            v-else
            :variant="projects.length ? 'no-result' : 'empty-data'"
            :title="projects.length ? 'Proyek tidak ditemukan' : 'Belum ada update'"
            :description="projects.length ? 'Belum ada pembangunan untuk kategori yang dipilih.' : (isAdmin ? 'Tekan “Tambah update” untuk menampilkan perkembangan pertama.' : 'Update pembangunan akan segera ditambahkan.')"
          />
        </section>

        <div class="bottom-space" aria-hidden="true"></div>
      </main>

      <CmsItemFormModal v-model="formOpen" type="progress" :count="projects.length" @saved="onSaved" />
      <CmsBackBar />
    </ion-content>
  </ion-page>
</template>

<script setup lang="ts">
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { IonContent, IonIcon, IonPage } from '@ionic/vue'
import { motion } from 'motion-v'
import CountUp from '@/components/ui/CountUp.vue'
import SceneBackdrop from '@/components/ui/SceneBackdrop.vue'
import ScrollReveal from '@/components/ui/ScrollReveal.vue'
import SectionHeader from '@/components/ui/SectionHeader.vue'
import { useReducedMotion } from '@/composables/useReducedMotion'
import { MOTION_EASE_OUT } from '@/utils/motionTokens'
import { addOutline, calendarOutline, chevronForwardOutline, constructOutline } from 'ionicons/icons'
import { useRouter } from 'vue-router'
import Skeleton from '@/components/ui/Skeleton.vue'
import AdminEditButton from '@/components/Admin/AdminEditButton.vue'
import CmsBackBar from '@/components/Admin/CmsBackBar.vue'
import CmsItemFormModal from '@/components/Admin/CmsItemFormModal.vue'
import { progressService, type ProgressItem } from '@/services/progressService'
import { useCmsAdmin } from '@/composables/useCmsAdmin'
import { useToast } from '@/composables/useToast'

const router = useRouter()
const toast = useToast()
const { isAdmin } = useCmsAdmin()

const isLoading = ref(true)
const isRefreshing = ref(false)
const formOpen = ref(false)

const STATUS_LABEL: Record<string, string> = { completed: 'Selesai', ongoing: 'Sedang berjalan', planned: 'Direncanakan' }

const selectedCategory = ref('all')
const categories = [
  { label: 'Semua', value: 'all' },
  { label: 'Sedang berjalan', value: 'ongoing' },
  { label: 'Selesai', value: 'completed' },
  { label: 'Direncanakan', value: 'planned' },
]

/** Semua data kemajuan berasal dari database (diatur Admin lewat Kelola Konten atau tombol Tambah update). */
const rows = ref<ProgressItem[]>([])

function formatDate(value?: string | null) {
  if (!value) return ''
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' })
}

const projects = computed(() => rows.value.map((row) => {
  const status = row.status || 'ongoing'
  return {
    id: row.id as string,
    name: row.title,
    category: STATUS_LABEL[status] ?? 'Sedang berjalan',
    categoryValue: status,
    description: row.description || '',
    shortDescription: row.description || '',
    progress: Math.round(Number(row.percentage) || 0),
    status,
    statusLabel: STATUS_LABEL[status] ?? '',
    lastUpdate: formatDate(row.progress_date),
    cover: row.image_url || '',
  }
}))

const averageProgress = computed(() => {
  if (!projects.value.length) return 0
  const total = projects.value.reduce((sum, project) => sum + project.progress, 0)
  return Math.round(total / projects.value.length)
})

const filteredProjects = computed(() => selectedCategory.value === 'all' ? projects.value : projects.value.filter(project => project.categoryValue === selectedCategory.value))
const featuredProject = computed(() => {
  const ongoing = filteredProjects.value.filter(project => project.status === 'ongoing').sort((a, b) => b.progress - a.progress)
  return ongoing[0] ?? filteredProjects.value[0]
})

const reduced = useReducedMotion()
const heroLines = ['Kemajuan', 'pembangunan']

/** Persentase proyek unggulan naik dari 0 (ease-out kubik, 1 detik) setelah data siap. */
const displayPct = ref(0)
let countRaf = 0
function countTo(target: number) {
  cancelAnimationFrame(countRaf)
  if (reduced.value || target <= 0) {
    displayPct.value = target
    return
  }
  const begin = performance.now() + 350
  const tick = (now: number) => {
    const p = Math.min(1, Math.max(0, (now - begin) / 1000))
    displayPct.value = Math.round(target * (1 - Math.pow(1 - p, 3)))
    if (p < 1) countRaf = requestAnimationFrame(tick)
  }
  countRaf = requestAnimationFrame(tick)
}
watch(
  () => [isLoading.value, featuredProject.value?.progress] as const,
  ([loading, pct]) => {
    if (!loading && typeof pct === 'number') countTo(pct)
  },
  { immediate: true },
)

function openProject(project: { id: string }) {
  router.push(`/progress/${project.id}`)
}

async function loadProjects() {
  try {
    rows.value = await progressService.getProgress(false)
  } catch (error) {
    console.error('Gagal memuat kemajuan:', error)
    toast.error('Kemajuan gagal dimuat. Tarik layar ke bawah untuk mencoba lagi.')
  } finally {
    isLoading.value = false
  }
}

function openAdd() { formOpen.value = true }
async function onSaved(message: string) { toast.success(message); await loadProjects() }

const handleRefresh = async () => {
  if (isRefreshing.value) return
  isRefreshing.value = true
  isLoading.value = true
  await loadProjects()
  isRefreshing.value = false
  window.dispatchEvent(new CustomEvent('poliland:refresh-complete'))
}

onMounted(() => {
  window.addEventListener('poliland:refresh', handleRefresh)
  void loadProjects()
})

onUnmounted(() => {
  cancelAnimationFrame(countRaf)
  window.removeEventListener('poliland:refresh', handleRefresh)
})
</script>

<style scoped>
.progress-content { --background: var(--pl-paper, #f9f5ec); }
.progress-page { padding-bottom: calc(110px + env(safe-area-inset-bottom)); }

/* ---------- Hero ---------- */
.progress-hero {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  min-height: clamp(420px, 66dvh, 540px);
  padding: calc(env(safe-area-inset-top, 0px) + 24px) 24px 0;
  overflow: hidden;
  background:
    radial-gradient(110% 60% at 100% 0%, rgba(244, 214, 154, 0.26) 0%, rgba(244, 214, 154, 0) 62%),
    linear-gradient(165deg, var(--green-700, #355a2c) 0%, var(--green-900, #1f3519) 100%);
  color: #fff;
}
.hero-scene { z-index: 1; }
.hero-copy { position: relative; z-index: 3; padding-bottom: 150px; }

.eyebrow {
  display: block;
  margin-bottom: 14px;
  color: var(--poliland-gold-soft, #f4d69a);
  font: 800 11px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
.progress-hero h1 {
  margin: 0;
  color: #fff;
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: clamp(40px, 11.5vw, 58px);
  line-height: 1.04;
  font-weight: 650;
  letter-spacing: -0.02em;
}
.hero-line { display: block; overflow: hidden; padding-bottom: 0.08em; }
.hero-line-inner { display: block; will-change: transform; }
.hero-sub {
  max-width: 30ch;
  margin: 14px 0 0;
  color: rgba(244, 241, 232, 0.92);
  font-size: 16px;
  line-height: 1.55;
}
.hero-admin { margin-top: 16px; }

/* ---------- Ringkasan ---------- */
.stats {
  position: relative;
  margin: 8px 16px 0;
  padding: 22px 14px;
  overflow: hidden;
  border-radius: 24px;
  background:
    radial-gradient(90% 80% at 100% 0%, rgba(244, 214, 154, 0.22) 0%, rgba(244, 214, 154, 0) 60%),
    linear-gradient(155deg, var(--green-800, #2b4824) 0%, var(--green-900, #1f3519) 100%);
  box-shadow: var(--shadow-md);
}
.stats-scene { z-index: 0; }
.stats-grid { position: relative; z-index: 1; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 10px; }
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 6px;
  padding: 18px 8px;
  border: 1px solid rgba(244, 214, 154, 0.2);
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.07);
  text-align: center;
}
.stat strong {
  color: var(--poliland-gold-soft, #f4d69a);
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: clamp(32px, 9vw, 40px);
  line-height: 1;
  font-weight: 650;
  letter-spacing: -0.02em;
  font-variant-numeric: tabular-nums;
}
.stat span { color: var(--on-forest, #f4f1e8); font-size: 12px; line-height: 1.35; font-weight: 600; }

/* ---------- Filter ---------- */
.filter-section { padding: 22px 0 0; }
.filter-scroll {
  display: flex;
  gap: 9px;
  padding: 2px 20px 8px;
  overflow-x: auto;
  scrollbar-width: none;
  scroll-snap-type: x proximity;
}
.filter-scroll::-webkit-scrollbar { display: none; }
.filter-chip {
  flex: 0 0 auto;
  min-height: 44px;
  padding: 0 18px;
  border: 1px solid var(--border-strong, #d5d0c4);
  border-radius: 999px;
  background: var(--surface-primary, #fff);
  color: var(--text-primary, #252525);
  font: 700 14px/1 var(--font-ui, 'Plus Jakarta Sans', sans-serif);
  scroll-snap-align: start;
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: background-color var(--dur-fast) var(--ease-out), color var(--dur-fast) var(--ease-out), border-color var(--dur-fast) var(--ease-out), transform var(--dur-base) var(--ease-spring);
}
.filter-chip:active { transform: scale(0.96); }
.filter-chip:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 2px; }
.filter-chip.active {
  border-color: var(--poliland-green, #355a2c);
  background: var(--poliland-green, #355a2c);
  color: #fff;
  box-shadow: 0 8px 18px -8px rgba(53, 90, 44, 0.6);
}

/* ---------- Blok ---------- */
.block { padding: 18px 20px 0; }
.block + .block { margin-top: 12px; }
.section-count {
  display: grid;
  place-items: center;
  min-width: 32px;
  height: 32px;
  padding: 0 8px;
  border-radius: 999px;
  background: var(--green-100, #e8eee4);
  color: var(--poliland-green, #355a2c);
  font-size: 13px;
  font-weight: 800;
}

.cover-empty { display: grid; place-items: center; width: 100%; height: 100%; background: var(--green-100, #e8eee4); color: var(--poliland-green, #355a2c); font-size: 34px; }

/* Kartu terkini */
.featured-card {
  overflow: hidden;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-panel, 20px);
  background: var(--surface-primary, #fff);
  box-shadow: var(--shadow-md);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  transition: transform var(--dur-base) var(--ease-spring);
}
.featured-card.is-skeleton { pointer-events: none; }
.featured-card:active { transform: scale(0.98); }
.featured-card:focus-visible,
.project-card:focus-visible { outline: 3px solid var(--poliland-gold, #cba044); outline-offset: 3px; }
.featured-image { position: relative; width: 100%; height: 210px; overflow: hidden; background: var(--green-100, #e8eee4); }
.featured-image img { display: block; width: 100%; height: 100%; object-fit: cover; }
.featured-image-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 40%, rgba(27, 40, 22, 0.62)); }
.category-label {
  position: absolute;
  left: 14px;
  bottom: 14px;
  padding: 6px 11px;
  border-radius: 8px;
  background: rgba(27, 40, 22, 0.72);
  -webkit-backdrop-filter: blur(6px);
  backdrop-filter: blur(6px);
  color: #fff;
  font-size: 12px;
  font-weight: 700;
}
.featured-content { display: flex; flex-direction: column; gap: 12px; padding: 18px; }
.featured-title-row { display: flex; align-items: flex-start; justify-content: space-between; gap: 14px; }
.featured-text { min-width: 0; }
.featured-title-row h3 {
  margin: 0;
  color: var(--text-primary, #252525);
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: 24px;
  line-height: 1.15;
  font-weight: 650;
  letter-spacing: -0.02em;
}
.featured-title-row p {
  display: -webkit-box;
  margin: 6px 0 0;
  overflow: hidden;
  color: var(--text-secondary, #5f5f66);
  font-size: 14px;
  line-height: 1.55;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}
.featured-percentage {
  flex: 0 0 auto;
  color: var(--poliland-green, #355a2c);
  font-family: var(--font-display, 'Fraunces Variable', Georgia, serif);
  font-size: 34px;
  line-height: 1;
  font-weight: 650;
  font-variant-numeric: tabular-nums;
}
.progress-track { width: 100%; height: 9px; overflow: hidden; border-radius: 999px; background: var(--surface-sunken, #f0ede5); }
.progress-fill,
.project-progress-fill {
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--green-600, #3e6a31), var(--poliland-green, #355a2c));
  transform-origin: left;
  animation: bar-grow 900ms var(--ease-out) 350ms backwards;
}
.featured-footer { display: flex; align-items: center; gap: 6px; color: var(--text-secondary, #5f5f66); font-size: 13px; }
.featured-footer ion-icon { font-size: 15px; }

/* Daftar proyek */
.project-list { display: flex; flex-direction: column; gap: 12px; margin: 0; padding: 0; list-style: none; }
.project-card {
  display: grid;
  grid-template-columns: 112px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 14px;
  padding: 10px 12px 10px 10px;
  border: 1px solid var(--border-default, #eae7e0);
  border-radius: var(--radius-card, 16px);
  background: var(--surface-primary, #fff);
  box-shadow: var(--shadow-sm);
  cursor: pointer;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
  animation: card-in 560ms var(--ease-spring) backwards;
  animation-delay: calc(var(--i, 0) * 60ms);
  transition: transform var(--dur-base) var(--ease-spring);
}
.project-card.is-skeleton { pointer-events: none; animation: none; }
.project-card:active { transform: scale(0.97); }
.project-card .project-progress-fill { animation-delay: calc(350ms + var(--i, 0) * 60ms); }
.project-thumbnail { position: relative; width: 112px; height: 116px; overflow: hidden; border-radius: 12px; background: var(--green-100, #e8eee4); }
.project-thumbnail img { display: block; width: 100%; height: 100%; object-fit: cover; }
.thumbnail-overlay { position: absolute; inset: 0; background: linear-gradient(to bottom, transparent 45%, rgba(27, 40, 22, 0.5)); }
.thumbnail-status {
  position: absolute;
  left: 7px;
  bottom: 7px;
  padding: 4px 8px;
  border-radius: 6px;
  background: rgba(27, 40, 22, 0.72);
  color: #fff;
  font-size: 11px;
  font-weight: 800;
}
.project-body { display: flex; flex-direction: column; gap: 6px; min-width: 0; }
.project-top { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; }
.project-body h3 {
  min-width: 0;
  margin: 0;
  color: var(--text-primary, #252525);
  font-size: 16px;
  line-height: 1.25;
  font-weight: 800;
}
.project-progress {
  flex: 0 0 auto;
  color: var(--poliland-green, #355a2c);
  font-size: 18px;
  line-height: 1;
  font-weight: 800;
  font-variant-numeric: tabular-nums;
}
.project-body p {
  display: -webkit-box;
  margin: 0;
  overflow: hidden;
  color: var(--text-secondary, #5f5f66);
  font-size: 13px;
  line-height: 1.45;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
}
.project-progress-track { width: 100%; height: 6px; overflow: hidden; border-radius: 999px; background: var(--surface-sunken, #f0ede5); }
.project-meta { display: inline-flex; align-items: center; gap: 4px; color: var(--text-secondary, #5f5f66); font-size: 12px; }
.project-meta ion-icon { font-size: 13px; }
.project-arrow { color: var(--text-secondary, #5f5f66); font-size: 18px; }

.bottom-space { height: 20px; }

@keyframes bar-grow { from { transform: scaleX(0); } }
@keyframes card-in { from { opacity: 0; translate: 0 22px; scale: 0.97; } }

@media (min-width: 768px) {
  .progress-page { max-width: 720px; margin: 0 auto; }
}

@media (max-width: 380px) {
  .project-card { grid-template-columns: 96px minmax(0, 1fr) 18px; gap: 10px; }
  .project-thumbnail { width: 96px; height: 108px; }
  .project-body h3 { font-size: 15px; }
}

@media (prefers-reduced-motion: reduce) {
  .progress-fill,
  .project-progress-fill,
  .project-card { animation: none; }
  .featured-card:active,
  .project-card:active,
  .filter-chip:active { transform: none; }
}
</style>
