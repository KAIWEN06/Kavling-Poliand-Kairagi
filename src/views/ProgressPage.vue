<template>
  <ion-page>
    <div class="progress-wrapper">
      <ion-content :fullscreen="true" class="progress-content">
        <main class="progress-page">
          <header class="page-header">
            <div v-if="isLoading" class="skeleton-page-header">
              <Skeleton width="92px" height="8px" border-radius="4px" />
              <Skeleton width="210px" height="25px" border-radius="6px" />
              <Skeleton width="275px" height="10px" border-radius="5px" />
            </div>

            <div v-else>
              <h1>Progress Pembangunan</h1>
              <p>Pantau perkembangan pembangunan kawasan secara berkala.</p>
            </div>
          </header>

          <section class="filter-section">
            <div v-if="isLoading" class="skeleton-filter-label">
              <Skeleton width="85px" height="8px" border-radius="4px" />
            </div>

            <div v-else class="filter-label">Filter kategori</div>

            <div v-if="isLoading" class="filter-scroll skeleton-filter-scroll">
              <Skeleton
                v-for="i in 5"
                :key="`filter-skeleton-${i}`"
                :width="i === 1 ? '55px' : i === 2 ? '48px' : i === 3 ? '68px' : i === 4 ? '75px' : '55px'"
                height="34px"
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
                @click="selectedCategory = category.value"
              >
                {{ category.label }}
              </button>
            </div>
          </section>

          <!-- Featured project -->
          <section class="featured-section">
            <div class="section-heading">
              <div v-if="isLoading" class="skeleton-section-heading">
                <Skeleton width="105px" height="8px" border-radius="4px" />
                <Skeleton width="155px" height="19px" border-radius="6px" />
              </div>

              <div v-else>
                <span class="section-eyebrow">PROGRESS TERBARU</span>
                <h2>Perkembangan Terkini</h2>
              </div>

              <Skeleton
                v-if="isLoading"
                width="25px"
                height="25px"
                border-radius="50%"
              />
              <span v-else class="section-count">{{ filteredProjects.length }}</span>
            </div>

            <article v-if="isLoading" class="featured-card featured-card-skeleton">
              <div class="featured-image">
                <Skeleton
                  width="100%"
                  height="100%"
                  border-radius="0"
                />

                <div class="featured-image-info">
                  <Skeleton width="62px" height="22px" border-radius="7px" />
                  <Skeleton width="48px" height="22px" border-radius="7px" />
                </div>
              </div>

              <div class="featured-content">
                <div class="featured-title-row">
                  <div class="skeleton-featured-copy">
                    <Skeleton width="145px" height="17px" border-radius="5px" />
                    <Skeleton width="235px" height="9px" border-radius="4px" />
                  </div>

                  <Skeleton width="43px" height="21px" border-radius="5px" />
                </div>

                <div class="progress-track">
                  <Skeleton width="72%" height="100%" border-radius="999px" />
                </div>

                <div class="featured-footer">
                  <Skeleton width="95px" height="9px" border-radius="4px" />
                  <Skeleton width="72px" height="9px" border-radius="4px" />
                </div>
              </div>
            </article>

            <article
              v-else-if="featuredProject"
              class="featured-card"
              @click="openProject(featuredProject)"
            >
              <div class="featured-image">
                <img :src="featuredProject.cover" :alt="featuredProject.name" />
                <div class="featured-image-overlay"></div>
                <div class="featured-image-info">
                  <span class="category-label">{{ featuredProject.category }}</span>
                  <span class="photo-count">
                    <ion-icon :icon="imagesOutline" />
                    {{ featuredProject.photoCount }}
                  </span>
                </div>
              </div>

              <div class="featured-content">
                <div class="featured-title-row">
                  <div>
                    <h3>{{ featuredProject.name }}</h3>
                    <p>{{ featuredProject.shortDescription }}</p>
                  </div>
                  <span class="featured-percentage">{{ featuredProject.progress }}%</span>
                </div>

                <div class="progress-track">
                  <div
                    class="progress-fill"
                    :style="{ width: `${featuredProject.progress}%` }"
                  ></div>
                </div>

                <div class="featured-footer">
                  <span class="status-text">
                    <span class="status-dot"></span>
                    {{ featuredProject.statusLabel }}
                  </span>
                  <span class="last-update">{{ featuredProject.lastUpdate }}</span>
                </div>
              </div>
            </article>
          </section>

          <!-- Project list -->
          <section class="projects-section">
            <div class="section-heading">
              <div v-if="isLoading" class="skeleton-section-heading">
                <Skeleton width="92px" height="8px" border-radius="4px" />
                <Skeleton width="105px" height="19px" border-radius="6px" />
              </div>

              <div v-else>
                <span class="section-eyebrow">DAFTAR PROYEK</span>
                <h2>Pembangunan</h2>
              </div>

              <Skeleton
                v-if="isLoading"
                width="25px"
                height="25px"
                border-radius="50%"
              />
              <span v-else class="section-count">{{ filteredProjects.length }}</span>
            </div>

            <div v-if="isLoading" class="project-list">
              <article
                v-for="i in 4"
                :key="`project-skeleton-${i}`"
                class="project-card project-card-skeleton"
              >
                <div class="project-thumbnail">
                  <Skeleton width="100%" height="100%" border-radius="11px" />
                </div>

                <div class="project-body">
                  <div class="project-top">
                    <Skeleton
                      :width="i % 2 === 0 ? '62px' : '72px'"
                      height="8px"
                      border-radius="4px"
                    />

                    <Skeleton width="30px" height="15px" border-radius="4px" />
                  </div>

                  <Skeleton
                    :width="i % 2 === 0 ? '105px' : '125px'"
                    height="14px"
                    border-radius="5px"
                  />

                  <div class="skeleton-project-description">
                    <Skeleton width="100%" height="8px" border-radius="4px" />
                    <Skeleton width="82%" height="8px" border-radius="4px" />
                  </div>

                  <div class="project-progress-track">
                    <Skeleton
                      :width="`${30 + i * 10}%`"
                      height="100%"
                      border-radius="999px"
                    />
                  </div>

                  <div class="project-meta">
                    <Skeleton width="82px" height="8px" border-radius="4px" />
                    <Skeleton width="48px" height="8px" border-radius="4px" />
                  </div>
                </div>

                <Skeleton
                  width="15px"
                  height="15px"
                  border-radius="50%"
                />
              </article>
            </div>

            <div v-else-if="filteredProjects.length" class="project-list">
              <article
                v-for="project in filteredProjects"
                :key="project.id"
                class="project-card"
                @click="openProject(project)"
              >
                <div class="project-thumbnail">
                  <img :src="project.cover" :alt="project.name" />
                  <div class="thumbnail-overlay"></div>
                  <span class="thumbnail-status">{{ project.statusLabel }}</span>
                </div>

                <div class="project-body">
                  <div class="project-top">
                    <span class="project-category">{{ project.category }}</span>
                    <span class="project-progress">{{ project.progress }}%</span>
                  </div>

                  <h3>{{ project.name }}</h3>
                  <p>{{ project.description }}</p>

                  <div class="project-progress-track">
                    <div
                      class="project-progress-fill"
                      :style="{ width: `${project.progress}%` }"
                    ></div>
                  </div>

                  <div class="project-meta">
                    <span>
                      <ion-icon :icon="calendarOutline" />
                      {{ project.lastUpdate }}
                    </span>
                    <span>{{ project.updateCount }} update</span>
                  </div>
                </div>

                <ion-icon class="project-arrow" :icon="chevronForwardOutline" />
              </article>
            </div>

            <div v-else class="empty-state">
              <div class="empty-icon">
                <ion-icon :icon="constructOutline" />
              </div>
              <h3>Tidak ada proyek</h3>
              <p>Belum ada pembangunan untuk kategori yang dipilih.</p>
            </div>
          </section>

          <!-- Information -->
          <section class="information-section">
            <template v-if="isLoading">
              <Skeleton
                width="28px"
                height="28px"
                border-radius="9px"
              />

              <div class="skeleton-information-copy">
                <Skeleton width="105px" height="10px" border-radius="4px" />
                <Skeleton width="100%" height="8px" border-radius="4px" />
                <Skeleton width="86%" height="8px" border-radius="4px" />
              </div>
            </template>

            <template v-else>
              <div class="information-icon">
                <ion-icon :icon="informationCircleOutline" />
              </div>

              <div>
                <strong>Tentang Progress</strong>
                <p>
                  Informasi progress diperbarui secara berkala. Persentase menunjukkan
                  perkembangan pekerjaan pada masing-masing proyek.
                </p>
              </div>
            </template>
          </section>

          <div class="last-updated">
            <template v-if="isLoading">
              <Skeleton width="11px" height="11px" border-radius="50%" />
              <Skeleton width="175px" height="8px" border-radius="4px" />
            </template>
          </div>

          <div class="bottom-space"></div>
        </main>
      </ion-content>

    </div>
  </ion-page>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { IonContent, IonIcon, IonPage } from '@ionic/vue'
import { calendarOutline, chevronForwardOutline, constructOutline, imagesOutline, informationCircleOutline, refreshOutline } from 'ionicons/icons'
import { useRouter } from 'vue-router'
import Skeleton from '@/components/ui/Skeleton.vue'

const router = useRouter()
const isLoading = ref(true)
const isRefreshing = ref(false)
let refreshTimer: ReturnType<typeof setTimeout> | null = null

const REFRESH_DURATION = 1800

const selectedCategory = ref('all')

const categories = [
  { label: 'Semua', value: 'all' },
  { label: 'Jalan', value: 'jalan' },
  { label: 'Drainase', value: 'drainase' },
  { label: 'Penerangan', value: 'penerangan' },
  { label: 'Fasilitas', value: 'fasilitas' },
  { label: 'Taman', value: 'taman' },
]

const projects = [
  { id: 1, name: 'Jalan Utama', category: 'Jalan', categoryValue: 'jalan', description: 'Pembangunan akses utama menuju kawasan PoliLand Kairagi.', shortDescription: 'Pengerjaan struktur dan lapisan jalan utama kawasan.', progress: 72, status: 'ongoing', statusLabel: 'Sedang dikerjakan', lastUpdate: '14 Okt 2026', updateCount: 6, photoCount: 12, cover: 'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1000&q=80' },
  { id: 2, name: 'Sistem Drainase', category: 'Drainase', categoryValue: 'drainase', description: 'Pembangunan sistem drainase untuk mendukung kawasan.', shortDescription: 'Pengerjaan saluran drainase pada area blok pembangunan.', progress: 48, status: 'ongoing', statusLabel: 'Sedang dikerjakan', lastUpdate: '12 Okt 2026', updateCount: 4, photoCount: 9, cover: 'https://images.unsplash.com/photo-1581094794329-c8112a89af12?auto=format&fit=crop&w=1000&q=80' },
  { id: 3, name: 'Gerbang Kawasan', category: 'Fasilitas', categoryValue: 'fasilitas', description: 'Pembangunan gerbang utama sebagai identitas kawasan.', shortDescription: 'Pengerjaan struktur dan finishing gerbang kawasan.', progress: 100, status: 'completed', statusLabel: 'Selesai', lastUpdate: '05 Okt 2026', updateCount: 5, photoCount: 15, cover: 'https://images.unsplash.com/photo-1590725140246-20acddd6c9c3?auto=format&fit=crop&w=1000&q=80' },
  { id: 4, name: 'Penerangan Jalan', category: 'Penerangan', categoryValue: 'penerangan', description: 'Pemasangan penerangan untuk meningkatkan kenyamanan kawasan.', shortDescription: 'Persiapan titik dan pemasangan lampu penerangan jalan.', progress: 38, status: 'ongoing', statusLabel: 'Sedang dikerjakan', lastUpdate: '10 Okt 2026', updateCount: 3, photoCount: 7, cover: 'https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1000&q=80' },
  { id: 5, name: 'Taman Kawasan', category: 'Taman', categoryValue: 'taman', description: 'Penataan ruang hijau dan area taman kawasan.', shortDescription: 'Persiapan area hijau dan penataan taman kawasan.', progress: 18, status: 'ongoing', statusLabel: 'Tahap awal', lastUpdate: '08 Okt 2026', updateCount: 2, photoCount: 5, cover: 'https://images.unsplash.com/photo-1558904541-efa843a96f01?auto=format&fit=crop&w=1000&q=80' },
]

const filteredProjects = computed(() => selectedCategory.value === 'all' ? projects : projects.filter(project => project.categoryValue === selectedCategory.value))
const featuredProject = computed(() => {
  const ongoing = filteredProjects.value.filter(project => project.status === 'ongoing').sort((a, b) => b.progress - a.progress)
  return ongoing[0] ?? filteredProjects.value[0]
})

function openProject(project: typeof projects[number]) {
  router.push(`/progress/${project.id}`)
}

const handleRefresh = () => {
  if (isRefreshing.value) return

  isRefreshing.value = true
  isLoading.value = true

  if (refreshTimer) {
    clearTimeout(refreshTimer)
  }

  refreshTimer = setTimeout(() => {
    isLoading.value = false
    isRefreshing.value = false

    window.dispatchEvent(
      new CustomEvent('poliland:refresh-complete')
    )
  }, REFRESH_DURATION)
}

const handleInitialLoad = () => {
  setTimeout(() => {
    isLoading.value = false
  }, 800)
}

onMounted(() => {
  window.addEventListener(
    'poliland:refresh',
    handleRefresh
  )

  handleInitialLoad()
})

onUnmounted(() => {
  window.removeEventListener(
    'poliland:refresh',
    handleRefresh
  )

  if (refreshTimer) {
    clearTimeout(refreshTimer)
    refreshTimer = null
  }
})
</script>

<style scoped>
.progress-wrapper{position:relative;width:100%;height:100%;background:var(--pl-background,#f8f7f2)}.progress-content{--background:var(--pl-background,#f8f7f2)}.progress-page{width:100%;max-width:680px;margin:0 auto;padding:20px 16px calc(90px + env(safe-area-inset-bottom))}.page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;margin-bottom:22px}.page-eyebrow,.section-eyebrow{display:block;color:var(--pl-gray,#8b8b82);font-size:8px;font-weight:800;letter-spacing:.12em}.page-header h1{margin:5px 0 5px;color:var(--pl-charcoal,#24241f);font-size:24px;line-height:1.15;font-weight:850;letter-spacing:-.04em}.page-header p{margin:0;max-width:280px;color:var(--pl-gray,#8b8b82);font-size:10px;line-height:1.5}.update-indicator{display:flex;align-items:center;gap:5px;padding:7px 9px;border:1px solid var(--pl-stone,#dedbd0);border-radius:999px;background:var(--pl-surface,#fff);color:var(--pl-olive,#556b2f);font-size:8px;font-weight:800}.update-indicator ion-icon{font-size:11px}.filter-section{margin-bottom:25px}.filter-label{margin-bottom:9px;color:var(--pl-gray,#8b8b82);font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.filter-scroll{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none}.filter-scroll::-webkit-scrollbar{display:none}.filter-chip{flex:0 0 auto;height:34px;padding:0 13px;border:1px solid var(--pl-stone,#dedbd0);border-radius:999px;background:var(--pl-surface,#fff);color:var(--pl-gray,#8b8b82);font:inherit;font-size:9px;font-weight:750}.filter-chip.active{border-color:var(--ion-color-primary,#556b2f);background:var(--ion-color-primary,#556b2f);color:#fff}.section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:13px}.section-heading h2{margin:5px 0 0;color:var(--pl-charcoal,#24241f);font-size:19px;line-height:1.2;font-weight:850;letter-spacing:-.03em}.section-count{display:grid;place-items:center;width:25px;height:25px;border-radius:50%;background:var(--pl-cream,#eeeadd);color:var(--pl-olive,#556b2f);font-size:8px;font-weight:850}.featured-section{margin-bottom:29px}.featured-card{overflow:hidden;border:1px solid var(--pl-stone,#dedbd0);border-radius:20px;background:var(--pl-surface,#fff);box-shadow:0 8px 25px rgb(45 45 45 / 5%);cursor:pointer}.featured-image{position:relative;width:100%;height:190px;overflow:hidden;background:var(--pl-sand,#e9e4d5)}.featured-image img{width:100%;height:100%;display:block;object-fit:cover}.featured-image-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 45%,rgb(0 0 0 / 48%))}.featured-image-info{position:absolute;left:13px;right:13px;bottom:13px;display:flex;align-items:center;justify-content:space-between}.category-label,.photo-count{display:inline-flex;align-items:center;gap:5px;padding:6px 8px;border-radius:7px;background:rgb(0 0 0 / 48%);color:#fff;font-size:9px;font-weight:750;backdrop-filter:blur(5px)}.photo-count ion-icon{font-size:12px}.featured-content{padding:16px}.featured-title-row{display:flex;justify-content:space-between;gap:15px}.featured-title-row h3{margin:0;color:var(--pl-charcoal,#24241f);font-size:17px;font-weight:800}.featured-title-row p{margin:4px 0 0;color:var(--pl-gray,#8b8b82);font-size:10px;line-height:1.5}.featured-percentage{flex:0 0 auto;color:var(--ion-color-primary,#556b2f);font-size:21px;line-height:1;font-weight:850;letter-spacing:-.04em}.progress-track{width:100%;height:7px;margin-top:15px;overflow:hidden;border-radius:999px;background:var(--pl-sand,#e9e4d5)}.progress-fill{height:100%;border-radius:inherit;background:var(--ion-color-primary,#556b2f)}.featured-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:9px}.status-text{display:inline-flex;align-items:center;gap:5px;color:var(--pl-slate,#64645d);font-size:9px;font-weight:700}.status-dot{width:6px;height:6px;border-radius:50%;background:var(--pl-success,#5f8f46)}.last-update{color:var(--pl-warm-gray,#aaa79d);font-size:9px}.projects-section{margin-bottom:27px}.project-list{display:flex;flex-direction:column;gap:11px}.project-card{position:relative;display:grid;grid-template-columns:105px minmax(0,1fr) 17px;align-items:center;gap:12px;min-height:126px;padding:9px;border:1px solid var(--pl-stone,#dedbd0);border-radius:17px;background:var(--pl-surface,#fff);cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}.project-card:active{transform:scale(.99)}.project-thumbnail{position:relative;width:105px;height:108px;overflow:hidden;border-radius:11px;background:var(--pl-sand,#e9e4d5)}.project-thumbnail img{width:100%;height:100%;display:block;object-fit:cover}.thumbnail-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 45%,rgb(0 0 0 / 35%))}.thumbnail-status{position:absolute;left:7px;bottom:7px;padding:4px 6px;border-radius:5px;background:rgb(0 0 0 / 50%);color:#fff;font-size:7px;font-weight:800}.project-body{min-width:0}.project-top{display:flex;align-items:center;justify-content:space-between;gap:5px}.project-category{color:var(--pl-gray,#8b8b82);font-size:8px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.project-progress{color:var(--ion-color-primary,#556b2f);font-size:15px;line-height:1;font-weight:850}.project-body h3{margin:5px 0 3px;color:var(--pl-charcoal,#24241f);font-size:14px;line-height:1.25;font-weight:800}.project-body p{display:-webkit-box;margin:0;overflow:hidden;color:var(--pl-gray,#8b8b82);font-size:9.5px;line-height:1.4;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical}.project-progress-track{width:100%;height:5px;margin-top:10px;overflow:hidden;border-radius:999px;background:var(--pl-sand,#e9e4d5)}.project-progress-fill{height:100%;border-radius:inherit;background:var(--ion-color-primary,#556b2f)}.project-meta{display:flex;align-items:center;justify-content:space-between;gap:5px;margin-top:7px;color:var(--pl-warm-gray,#aaa79d);font-size:8px;font-weight:650}.project-meta span:first-child{display:flex;align-items:center;gap:3px}.project-meta ion-icon{font-size:11px}.project-arrow{color:var(--pl-warm-gray,#aaa79d);font-size:15px}.empty-state{display:flex;flex-direction:column;align-items:center;padding:35px 20px;border:1px dashed var(--pl-stone,#dedbd0);border-radius:17px;text-align:center}.empty-icon{width:45px;height:45px;display:grid;place-items:center;border-radius:13px;background:var(--pl-cream,#eeeadd);color:var(--pl-olive,#556b2f)}.empty-icon ion-icon{font-size:22px}.empty-state h3{margin:11px 0 4px;color:var(--pl-charcoal,#24241f);font-size:14px}.empty-state p{margin:0;color:var(--pl-gray,#8b8b82);font-size:10px}.information-section{display:flex;align-items:flex-start;gap:10px;padding:14px;border:1px solid var(--pl-stone,#dedbd0);border-radius:15px;background:var(--pl-cream,#eeeadd)}.information-icon{flex:0 0 28px;width:28px;height:28px;display:grid;place-items:center;border-radius:9px;background:var(--pl-surface,#fff);color:var(--pl-olive,#556b2f)}.information-icon ion-icon{font-size:15px}.information-section strong{display:block;color:var(--pl-charcoal,#24241f);font-size:10px;font-weight:800}.information-section p{margin:4px 0 0;color:var(--pl-gray,#8b8b82);font-size:9px;line-height:1.5}.last-updated{display:flex;align-items:center;justify-content:center;gap:5px;margin-top:17px;color:var(--pl-warm-gray,#aaa79d);font-size:8px}.last-updated ion-icon{font-size:11px}.bottom-space{height:60px}.skeleton-page-header{display:flex;flex-direction:column;align-items:flex-start;gap:7px}.skeleton-filter-label{margin-bottom:9px}.skeleton-filter-scroll{align-items:center}.skeleton-section-heading{display:flex;flex-direction:column;align-items:flex-start;gap:5px}.skeleton-featured-copy{display:flex;flex-direction:column;gap:6px;min-width:0}.skeleton-project-description{display:flex;flex-direction:column;gap:4px;margin-top:6px}.skeleton-information-copy{display:flex;flex:1;min-width:0;flex-direction:column;gap:6px}.featured-card-skeleton,.project-card-skeleton{pointer-events:none}@media(max-width:380px){.progress-page{padding-inline:13px}.page-header h1{font-size:22px}.update-indicator{padding-inline:7px}.project-card{grid-template-columns:92px minmax(0,1fr) 15px;gap:9px}.project-thumbnail{width:92px;height:103px}.project-body h3{font-size:13px}.project-body p{font-size:9px}}
</style>
