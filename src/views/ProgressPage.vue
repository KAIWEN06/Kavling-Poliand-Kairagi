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
              <h1>Kemajuan Pembangunan</h1>
              <p>Pantau perkembangan pembangunan kawasan secara berkala.</p>
              <div v-if="isAdmin" class="page-admin">
                <AdminEditButton label="Tambah update" :icon="addOutline" @click="openAdd" />
              </div>
            </div>
          </header>

          <section class="filter-section">
            <div v-if="isLoading" class="skeleton-filter-label">
              <Skeleton width="85px" height="8px" border-radius="4px" />
            </div>

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
              role="link"
              tabindex="0"
              @click="openProject(featuredProject)"
              @keydown.enter="openProject(featuredProject)"
            >
              <div class="featured-image">
                <img v-if="featuredProject.cover" :src="featuredProject.cover" :alt="featuredProject.name" />
                <div v-else class="cover-empty" aria-hidden="true"><ion-icon :icon="constructOutline" /></div>
                <div class="featured-image-overlay"></div>
                <div class="featured-image-info">
                  <span class="category-label">{{ featuredProject.category }}</span>
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
                  </div>
                </div>

                <ion-icon class="project-arrow" :icon="chevronForwardOutline" />
              </article>
            </div>

            <StatusIllustration
              v-else
              :variant="projects.length ? 'no-result' : 'empty-data'"
              :title="projects.length ? 'Proyek tidak ditemukan' : 'Belum ada update'"
              :description="projects.length ? 'Belum ada pembangunan untuk kategori yang dipilih.' : (isAdmin ? 'Tekan “Tambah update” untuk menampilkan perkembangan pertama.' : 'Update pembangunan akan segera ditambahkan.')"
            />
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
                <strong>Tentang Kemajuan</strong>
                <p>
                  Informasi kemajuan diperbarui secara berkala. Persentase menunjukkan
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

      <CmsItemFormModal v-model="formOpen" type="progress" :count="projects.length" @saved="onSaved" />
      <CmsBackBar />
    </div>
  </ion-page>
</template>

<script setup lang="ts">
import StatusIllustration from '@/components/ui/StatusIllustration.vue'
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { IonContent, IonIcon, IonPage } from '@ionic/vue'
import { addOutline, calendarOutline, chevronForwardOutline, constructOutline, informationCircleOutline } from 'ionicons/icons'
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

const filteredProjects = computed(() => selectedCategory.value === 'all' ? projects.value : projects.value.filter(project => project.categoryValue === selectedCategory.value))
const featuredProject = computed(() => {
  const ongoing = filteredProjects.value.filter(project => project.status === 'ongoing').sort((a, b) => b.progress - a.progress)
  return ongoing[0] ?? filteredProjects.value[0]
})

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
  window.removeEventListener('poliland:refresh', handleRefresh)
})
</script>

<style scoped>
.progress-wrapper{position:relative;width:100%;height:100%;background:var(--pl-background,#f8f7f2)}.progress-content{--background:var(--pl-background,#f8f7f2)}.progress-page{width:100%;max-width:680px;margin:0 auto;padding:20px 16px calc(90px + env(safe-area-inset-bottom))}.page-header{display:flex;align-items:flex-start;justify-content:space-between;gap:15px;margin-bottom:22px}.page-eyebrow,.section-eyebrow{display:block;color:var(--pl-gray,#8b8b82);font-size:8px;font-weight:800;letter-spacing:.12em}.page-header h1{margin:5px 0 5px;color:var(--pl-charcoal,#24241f);font-size:24px;line-height:1.15;font-weight:850;letter-spacing:-.04em}.page-header p{margin:0;max-width:280px;color:var(--pl-gray,#8b8b82);font-size:10px;line-height:1.5}.update-indicator{display:flex;align-items:center;gap:5px;padding:7px 9px;border:1px solid var(--pl-stone,#dedbd0);border-radius:999px;background:var(--pl-surface,#fff);color:var(--pl-olive,#556b2f);font-size:8px;font-weight:800}.update-indicator ion-icon{font-size:11px}.filter-section{margin-bottom:25px}.filter-label{margin-bottom:9px;color:var(--pl-gray,#8b8b82);font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.08em}.filter-scroll{display:flex;gap:7px;overflow-x:auto;scrollbar-width:none}.filter-scroll::-webkit-scrollbar{display:none}.filter-chip{flex:0 0 auto;height:34px;padding:0 13px;border:1px solid var(--pl-stone,#dedbd0);border-radius:999px;background:var(--pl-surface,#fff);color:var(--pl-gray,#8b8b82);font:inherit;font-size:9px;font-weight:750}.filter-chip.active{border-color:var(--ion-color-primary,#556b2f);background:var(--ion-color-primary,#556b2f);color:#fff}.section-heading{display:flex;align-items:flex-end;justify-content:space-between;gap:12px;margin-bottom:13px}.section-heading h2{margin:5px 0 0;color:var(--pl-charcoal,#24241f);font-size:19px;line-height:1.2;font-weight:850;letter-spacing:-.03em}.section-count{display:grid;place-items:center;width:25px;height:25px;border-radius:50%;background:var(--pl-cream,#eeeadd);color:var(--pl-olive,#556b2f);font-size:8px;font-weight:850}.featured-section{margin-bottom:29px}.featured-card{overflow:hidden;border:1px solid var(--pl-stone,#dedbd0);border-radius:20px;background:var(--pl-surface,#fff);box-shadow:0 8px 25px rgb(45 45 45 / 5%);cursor:pointer}.featured-image{position:relative;width:100%;height:190px;overflow:hidden;background:var(--pl-sand,#e9e4d5)}.featured-image img{width:100%;height:100%;display:block;object-fit:cover}.featured-image-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 45%,rgb(0 0 0 / 48%))}.featured-image-info{position:absolute;left:13px;right:13px;bottom:13px;display:flex;align-items:center;justify-content:space-between}.category-label,.photo-count{display:inline-flex;align-items:center;gap:5px;padding:6px 8px;border-radius:7px;background:rgb(0 0 0 / 48%);color:#fff;font-size:9px;font-weight:750;backdrop-filter:blur(5px)}.photo-count ion-icon{font-size:12px}.featured-content{padding:16px}.featured-title-row{display:flex;justify-content:space-between;gap:15px}.featured-title-row h3{margin:0;color:var(--pl-charcoal,#24241f);font-size:17px;font-weight:800}.featured-title-row p{margin:4px 0 0;color:var(--pl-gray,#8b8b82);font-size:10px;line-height:1.5}.featured-percentage{flex:0 0 auto;color:var(--ion-color-primary,#556b2f);font-size:21px;line-height:1;font-weight:850;letter-spacing:-.04em}.progress-track{width:100%;height:7px;margin-top:15px;overflow:hidden;border-radius:999px;background:var(--pl-sand,#e9e4d5)}.progress-fill{height:100%;border-radius:inherit;background:var(--ion-color-primary,#556b2f)}.featured-footer{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:9px}.status-text{display:inline-flex;align-items:center;gap:5px;color:var(--pl-slate,#64645d);font-size:9px;font-weight:700}.status-dot{width:6px;height:6px;border-radius:50%;background:var(--pl-success,#5f8f46)}.last-update{color:var(--pl-warm-gray,#aaa79d);font-size:9px}.projects-section{margin-bottom:27px}.project-list{display:flex;flex-direction:column;gap:11px}.project-card{position:relative;display:grid;grid-template-columns:105px minmax(0,1fr) 17px;align-items:center;gap:12px;min-height:126px;padding:9px;border:1px solid var(--pl-stone,#dedbd0);border-radius:17px;background:var(--pl-surface,#fff);cursor:pointer;transition:transform .18s ease,box-shadow .18s ease}.project-card:active{transform:scale(.99)}.project-thumbnail{position:relative;width:105px;height:108px;overflow:hidden;border-radius:11px;background:var(--pl-sand,#e9e4d5)}.project-thumbnail img{width:100%;height:100%;display:block;object-fit:cover}.thumbnail-overlay{position:absolute;inset:0;background:linear-gradient(to bottom,transparent 45%,rgb(0 0 0 / 35%))}.thumbnail-status{position:absolute;left:7px;bottom:7px;padding:4px 6px;border-radius:5px;background:rgb(0 0 0 / 50%);color:#fff;font-size:7px;font-weight:800}.project-body{min-width:0}.project-top{display:flex;align-items:center;justify-content:space-between;gap:5px}.project-category{color:var(--pl-gray,#8b8b82);font-size:8px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}.project-progress{color:var(--ion-color-primary,#556b2f);font-size:15px;line-height:1;font-weight:850}.project-body h3{margin:5px 0 3px;color:var(--pl-charcoal,#24241f);font-size:14px;line-height:1.25;font-weight:800}.project-body p{display:-webkit-box;margin:0;overflow:hidden;color:var(--pl-gray,#8b8b82);font-size:9.5px;line-height:1.4;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical}.project-progress-track{width:100%;height:5px;margin-top:10px;overflow:hidden;border-radius:999px;background:var(--pl-sand,#e9e4d5)}.project-progress-fill{height:100%;border-radius:inherit;background:var(--ion-color-primary,#556b2f)}.project-meta{display:flex;align-items:center;justify-content:space-between;gap:5px;margin-top:7px;color:var(--pl-warm-gray,#aaa79d);font-size:8px;font-weight:650}.project-meta span:first-child{display:flex;align-items:center;gap:3px}.project-meta ion-icon{font-size:11px}.project-arrow{color:var(--pl-warm-gray,#aaa79d);font-size:15px}.empty-state{display:flex;flex-direction:column;align-items:center;padding:35px 20px;border:1px dashed var(--pl-stone,#dedbd0);border-radius:17px;text-align:center}.empty-icon{width:45px;height:45px;display:grid;place-items:center;border-radius:13px;background:var(--pl-cream,#eeeadd);color:var(--pl-olive,#556b2f)}.empty-icon ion-icon{font-size:22px}.empty-state h3{margin:11px 0 4px;color:var(--pl-charcoal,#24241f);font-size:14px}.empty-state p{margin:0;color:var(--pl-gray,#8b8b82);font-size:10px}.information-section{display:flex;align-items:flex-start;gap:10px;padding:14px;border:1px solid var(--pl-stone,#dedbd0);border-radius:15px;background:var(--pl-cream,#eeeadd)}.information-icon{flex:0 0 28px;width:28px;height:28px;display:grid;place-items:center;border-radius:9px;background:var(--pl-surface,#fff);color:var(--pl-olive,#556b2f)}.information-icon ion-icon{font-size:15px}.information-section strong{display:block;color:var(--pl-charcoal,#24241f);font-size:10px;font-weight:800}.information-section p{margin:4px 0 0;color:var(--pl-gray,#8b8b82);font-size:9px;line-height:1.5}.last-updated{display:flex;align-items:center;justify-content:center;gap:5px;margin-top:17px;color:var(--pl-warm-gray,#aaa79d);font-size:8px}.last-updated ion-icon{font-size:11px}.bottom-space{height:60px}.skeleton-page-header{display:flex;flex-direction:column;align-items:flex-start;gap:7px}.skeleton-filter-label{margin-bottom:9px}.skeleton-filter-scroll{align-items:center}.skeleton-section-heading{display:flex;flex-direction:column;align-items:flex-start;gap:5px}.skeleton-featured-copy{display:flex;flex-direction:column;gap:6px;min-width:0}.skeleton-project-description{display:flex;flex-direction:column;gap:4px;margin-top:6px}.skeleton-information-copy{display:flex;flex:1;min-width:0;flex-direction:column;gap:6px}.featured-card-skeleton,.project-card-skeleton{pointer-events:none}@media(max-width:380px){.progress-page{padding-inline:13px}.page-header h1{font-size:22px}.update-indicator{padding-inline:7px}.project-card{grid-template-columns:92px minmax(0,1fr) 15px;gap:9px}.project-thumbnail{width:92px;height:103px}.project-body h3{font-size:13px}.project-body p{font-size:9px}}
.page-admin{margin-top:12px}.cover-empty{display:grid;place-items:center;width:100%;height:100%;color:var(--pl-olive,#556b2f);font-size:34px;background:var(--pl-sand,#e9e4d5)}.featured-card:focus-visible,.project-card:focus-visible{outline:3px solid var(--pl-olive,#556b2f);outline-offset:2px}
</style>
